'use server';

import { connectToDatabase } from '@/lib/db';
import Event from '@/models/Event';
import Registration from '@/models/Registration';
import Students from '@/models/Students';
import { sendMail } from '@/lib/email';
import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Create Razorpay order
export async function createPaymentOrder(eventId: string, studentId: string) {
  try {
    await connectToDatabase();
    
    const event = await Event.findById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    const student = await Students.findById(studentId);
    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      eventId,
      studentId,
    });

    if (existingRegistration) {
      return { success: false, error: 'You are already registered for this event' };
    }

    // Check capacity
    if (event.capacity) {
      const registrationCount = await Registration.countDocuments({ eventId });
      if (registrationCount >= event.capacity) {
        return { success: false, error: 'Event is full. No more registrations accepted.' };
      }
    }

    // Check deadline
    if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
      return { success: false, error: 'Registration deadline has passed' };
    }

    const amount = event.feeAmount ? Math.round(event.feeAmount * 100) : 0; // Convert to paise

    if (amount === 0) {
      // Free event - register directly
      return await registerForEvent(eventId, studentId, null);
    }

    // Create order via Razorpay API
    // Receipt must be max 40 characters
    const receipt = `evt_${eventId.toString().slice(-8)}_${studentId.toString().slice(-8)}`.slice(0, 40);
    
    // Notes values must be max 40 characters each
    const eventNameShort = event.eventName.length > 40 ? event.eventName.substring(0, 37) + '...' : event.eventName;
    
    const orderData = {
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        eventId: eventId.toString().slice(0, 40),
        studentId: studentId.toString().slice(0, 40),
        eventName: eventNameShort,
      },
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.description || 'Failed to create payment order' };
    }

    const order = await response.json();

    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    };
  } catch (error: any) {
    console.error('Error creating payment order:', error);
    return { success: false, error: error.message || 'Failed to create payment order' };
  }
}

// Verify payment and register
export async function verifyPaymentAndRegister(
  orderId: string,
  paymentId: string,
  signature: string,
  eventId: string,
  studentId: string
) {
  try {
    await connectToDatabase();

    // Verify payment signature
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generatedSignature !== signature) {
      return { success: false, error: 'Invalid payment signature' };
    }

    // Verify payment with Razorpay
    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Payment verification failed' };
    }

    const payment = await response.json();

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return { success: false, error: 'Payment not completed' };
    }

    // Register student for event
    return await registerForEvent(eventId, studentId, paymentId);
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return { success: false, error: error.message || 'Payment verification failed' };
  }
}

// Register student for event
async function registerForEvent(eventId: string, studentId: string, paymentId: string | null) {
  try {
    await connectToDatabase();

    const event = await Event.findById(eventId);
    const student = await Students.findById(studentId);

    if (!event || !student) {
      return { success: false, error: 'Event or student not found' };
    }

    // Ensure eventId and studentId are ObjectIds
    const mongoose = require('mongoose');
    const eventObjectId = mongoose.Types.ObjectId.isValid(eventId) 
      ? new mongoose.Types.ObjectId(eventId) 
      : eventId;
    const studentObjectId = mongoose.Types.ObjectId.isValid(studentId)
      ? new mongoose.Types.ObjectId(studentId)
      : studentId;

    // Create registration
    const registration = new Registration({
      eventId: eventObjectId,
      studentId: studentObjectId,
      studentName: student.name,
      studentEmail: student.email,
      studentMobile: student.phoneNumber,
      paymentStatus: paymentId ? 'paid' : (event.feeAmount ? 'free' : 'free'),
      paymentId: paymentId || undefined,
    });

    await registration.save();
    
    console.log('Registration created:', {
      registrationId: registration._id,
      eventId: registration.eventId,
      studentId: registration.studentId,
      studentName: registration.studentName,
    });

    // Update event's eventRegistrations array
    if (!event.eventRegistrations) {
      event.eventRegistrations = [];
    }
    if (!event.eventRegistrations.includes(registration._id)) {
      event.eventRegistrations.push(registration._id);
      await event.save();
    }

    // Update student's eventName array
    // Handle case where eventName might be a string (from old data) or array
    let eventNames: string[] = [];
    if (Array.isArray(student.eventName)) {
      eventNames = student.eventName;
    } else if (typeof student.eventName === 'string' && student.eventName) {
      // Convert string to array if it exists
      eventNames = [student.eventName];
    }
    
    // Add event name if not already present
    if (!eventNames.includes(event.eventName)) {
      eventNames.push(event.eventName);
      student.eventName = eventNames;
      await student.save();
    }

    // Send confirmation email with WhatsApp link
    const whatsappLink = event.whatsappGroupLink || '';
    const emailHtml = `
      <h2>Registration Confirmed!</h2>
      <p>Dear ${student.name},</p>
      <p>Congratulations! You have successfully registered for <strong>${event.eventName}</strong>.</p>
      <p><strong>Event Details:</strong></p>
      <ul>
        <li>Event: ${event.eventName}</li>
        <li>Date: ${new Date(event.eventDate).toLocaleDateString()}</li>
        <li>Venue: ${event.centerId || 'TBA'}</li>
        ${event.feeAmount ? `<li>Amount Paid: ₹${event.feeAmount}</li>` : '<li>Fee: Free</li>'}
      </ul>
      ${whatsappLink ? `<p><strong>Join WhatsApp Group:</strong> <a href="${whatsappLink}">Click here to join</a></p>` : ''}
      <p>We look forward to seeing you at the event!</p>
      <p>Best regards,<br/>Event Team</p>
    `;

    await sendMail({
      to: student.email,
      subject: `Registration Confirmed: ${event.eventName}`,
      html: emailHtml,
    });

    return { success: true, registration: JSON.parse(JSON.stringify(registration)) };
  } catch (error: any) {
    console.error('Error registering for event:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
}


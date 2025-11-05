'use server';

import { connectToDatabase } from '@/lib/db';
import Registration, { IRegistration } from '@/models/Registration';
import Event from '@/models/Event';
import Students from '@/models/Students';
import { revalidatePath } from 'next/cache';
import { sendMail } from '@/lib/email';
import { cookies } from 'next/headers';

// Helper to get current user from token
async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded !== 'object') return null;
    return decoded;
  } catch {
    return null;
  }
}

// Get registrations for an event
export async function getEventRegistrations(eventId: string) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized.' };
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found.' };
    }

    // Verify event belongs to teacher (if teacher)
    if (currentUser.role === 'teacher') {
      if (event.teacherId.toString() !== currentUser.id) {
        return { success: false, error: 'Unauthorized. Event not found or access denied.' };
      }
    }

    // Find registrations - use both eventId as string and ObjectId
    const mongoose = require('mongoose');
    const eventObjectId = mongoose.Types.ObjectId.isValid(eventId) 
      ? new mongoose.Types.ObjectId(eventId) 
      : eventId;
    
    const registrations = await Registration.find({ 
      eventId: eventObjectId
    })
      .populate('studentId', 'name email rollNumber phoneNumber')
      .sort({ registeredAt: -1 })
      .lean<IRegistration[]>();

    console.log(`Found ${registrations.length} registrations for event ${eventId}`);
    console.log(`Event ObjectId: ${eventObjectId}`);
    
    // Log registration details for debugging
    if (registrations.length > 0) {
      console.log('Sample registration:', JSON.stringify(registrations[0], null, 2));
    } else {
      // Debug: Check if there are any registrations at all
      const allRegistrations = await Registration.find({}).lean();
      console.log(`Total registrations in DB: ${allRegistrations.length}`);
      if (allRegistrations.length > 0) {
        console.log('Sample registration from DB:', JSON.stringify(allRegistrations[0], null, 2));
      }
    }

    return { success: true, registrations: JSON.parse(JSON.stringify(registrations)) };
  } catch (error: any) {
    console.error('Error fetching registrations:', error);
    console.error('Error stack:', error.stack);
    return { success: false, error: `Failed to fetch registrations: ${error.message}` };
  }
}

// Update registration (attendance, payment status, notes)
export async function updateRegistration(registrationId: string, formData: FormData) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized.' };
    }

    const registration = await Registration.findById(registrationId).populate('eventId');
    if (!registration) {
      return { success: false, error: 'Registration not found.' };
    }

    const event = registration.eventId as any;
    
    // Verify event belongs to teacher (if teacher)
    if (currentUser.role === 'teacher' && event.teacherId.toString() !== currentUser.id) {
      return { success: false, error: 'Unauthorized.' };
    }

    const attendance = formData.get('attendance');
    const paymentStatus = formData.get('paymentStatus');
    const notes = formData.get('notes');

    if (attendance !== null) {
      registration.attendance = attendance === 'true';
    }
    if (paymentStatus) {
      registration.paymentStatus = paymentStatus as 'pending' | 'paid' | 'free' | 'cancelled';
    }
    if (notes !== null) {
      registration.notes = notes as string;
    }

    await registration.save();
    revalidatePath('/teacher/dashboard');
    revalidatePath(`/teacher/events/${event._id}`);

    return { success: true, registration: JSON.parse(JSON.stringify(registration)) };
  } catch (error: any) {
    console.error('Error updating registration:', error);
    return { success: false, error: error.message || 'Failed to update registration.' };
  }
}

// Mark attendance for multiple registrations
export async function markMultipleAttendance(registrationIds: string[], eventId: string) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized.' };
    }

    // Verify event belongs to teacher (if teacher)
    if (currentUser.role === 'teacher') {
      const event = await Event.findById(eventId);
      if (!event || event.teacherId.toString() !== currentUser.id) {
        return { success: false, error: 'Unauthorized.' };
      }
    }

    await Registration.updateMany(
      { _id: { $in: registrationIds }, eventId },
      { $set: { attendance: true } }
    );

    revalidatePath('/teacher/dashboard');
    revalidatePath(`/teacher/events/${eventId}`);

    return { success: true, message: `Marked ${registrationIds.length} registrations as attended.` };
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    return { success: false, error: 'Failed to mark attendance.' };
  }
}

// Get registration statistics for an event
export async function getEventRegistrationStats(eventId: string) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized.' };
    }

    // Verify event belongs to teacher (if teacher)
    if (currentUser.role === 'teacher') {
      const event = await Event.findById(eventId);
      if (!event || event.teacherId.toString() !== currentUser.id) {
        return { success: false, error: 'Unauthorized.' };
      }
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found.' };
    }

    // Use ObjectId for consistent querying
    const mongoose = require('mongoose');
    const eventObjectId = mongoose.Types.ObjectId.isValid(eventId) 
      ? new mongoose.Types.ObjectId(eventId) 
      : eventId;

    const totalRegistrations = await Registration.countDocuments({ eventId: eventObjectId });
    const attended = await Registration.countDocuments({ eventId: eventObjectId, attendance: true });
    const paid = await Registration.countDocuments({ eventId: eventObjectId, paymentStatus: 'paid' });
    const pending = await Registration.countDocuments({ eventId: eventObjectId, paymentStatus: 'pending' });

    // Calculate total collected
    const paidRegistrations = await Registration.find({ eventId: eventObjectId, paymentStatus: 'paid' }).lean();
    const totalCollected = event.feeAmount 
      ? paidRegistrations.reduce((sum, reg) => sum + (event.feeAmount || 0), 0)
      : 0;

    return {
      success: true,
      stats: {
        totalRegistrations,
        attended,
        notAttended: totalRegistrations - attended,
        paid,
        pending,
        free: totalRegistrations - paid - pending,
        totalCollected,
        capacity: event.capacity || null,
        capacityUsed: event.capacity ? totalRegistrations : null,
        capacityRemaining: event.capacity ? event.capacity - totalRegistrations : null,
      },
    };
  } catch (error: any) {
    console.error('Error fetching registration stats:', error);
    return { success: false, error: 'Failed to fetch statistics.' };
  }
}


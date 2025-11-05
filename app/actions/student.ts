'use server';

import { connectToDatabase } from '@/lib/db';
import Registration from '@/models/Registration';
import Event from '@/models/Event';
import Students from '@/models/Students';

// Get student registrations with event details
export async function getStudentRegistrations(studentId: string) {
  try {
    await connectToDatabase();
    
    // Convert studentId to ObjectId for consistent querying
    const mongoose = require('mongoose');
    const studentObjectId = mongoose.Types.ObjectId.isValid(studentId) 
      ? new mongoose.Types.ObjectId(studentId) 
      : studentId;
    
    const registrations = await Registration.find({ studentId: studentObjectId })
      .populate('eventId', 'eventName eventDate centerId whatsappGroupLink')
      .sort({ registeredAt: -1 })
      .lean();

    console.log(`Found ${registrations.length} registrations for student ${studentId}`);

    // Safely serialize to avoid circular references
    try {
      const serialized = JSON.parse(JSON.stringify(registrations, (key, value) => {
        // Skip circular references
        if (key === '_id' && typeof value === 'object' && value !== null) {
          return value.toString();
        }
        return value;
      }));
      return {
        success: true,
        registrations: serialized,
      };
    } catch (error) {
      console.error('Error serializing registrations:', error);
      // Fallback: return minimal data
      return {
        success: true,
        registrations: registrations.map((reg: any) => ({
          _id: reg._id?.toString(),
          studentId: reg.studentId?.toString(),
          eventId: reg.eventId ? {
            _id: reg.eventId._id?.toString(),
            eventName: reg.eventId.eventName,
            eventDate: reg.eventId.eventDate,
            centerId: reg.eventId.centerId,
            whatsappGroupLink: reg.eventId.whatsappGroupLink,
          } : null,
          studentName: reg.studentName,
          studentEmail: reg.studentEmail,
          studentMobile: reg.studentMobile,
          paymentStatus: reg.paymentStatus,
          paymentId: reg.paymentId,
          attendance: reg.attendance,
          registeredAt: reg.registeredAt,
        })),
      };
    }
  } catch (error: any) {
    console.error('Error fetching student registrations:', error);
    return { success: false, error: error.message || 'Failed to fetch registrations' };
  }
}

// Get student certificates
export async function getStudentCertificates(studentId: string) {
  try {
    await connectToDatabase();
    
    // Convert studentId to ObjectId for consistent querying
    const mongoose = require('mongoose');
    const studentObjectId = mongoose.Types.ObjectId.isValid(studentId) 
      ? new mongoose.Types.ObjectId(studentId) 
      : studentId;
    
    const student = await Students.findById(studentObjectId).select('certificates').lean() as any;
    
    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    const certificates = (student.certificates || []) as any[];
    console.log(`Found ${certificates.length} certificates for student ${studentId}`);
    
    // Safely serialize certificates
    try {
      const serialized = JSON.parse(JSON.stringify(certificates, (key, value) => {
        // Convert dates to ISO strings
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
      
      return {
        success: true,
        certificates: serialized,
      };
    } catch (error) {
      console.error('Error serializing certificates:', error);
      // Fallback: return minimal data
      return {
        success: true,
        certificates: certificates.map((cert: any) => ({
          eventId: cert.eventId?.toString(),
          eventName: cert.eventName,
          certificateUrl: cert.certificateUrl,
          issuedAt: cert.issuedAt ? new Date(cert.issuedAt).toISOString() : null,
        })),
      };
    }
  } catch (error: any) {
    console.error('Error fetching certificates:', error);
    return { success: false, error: error.message || 'Failed to fetch certificates' };
  }
}

// Get all events available for registration (public events)
export async function getAvailableEvents() {
  try {
    await connectToDatabase();
    
    const now = new Date();
    const events = await Event.find({
      visibility: 'public',
      $or: [
        { registrationDeadline: { $gte: now } },
        { registrationDeadline: { $exists: false } },
      ],
    })
      .select('eventName eventDate motive centerId feeAmount registrationDeadline capacity')
      .sort({ eventDate: 1 })
      .lean();

    return {
      success: true,
      events: JSON.parse(JSON.stringify(events)),
    };
  } catch (error: any) {
    console.error('Error fetching available events:', error);
    return { success: false, error: error.message || 'Failed to fetch events' };
  }
}


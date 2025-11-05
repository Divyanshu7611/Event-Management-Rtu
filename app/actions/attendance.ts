'use server';

import { connectToDatabase } from '@/lib/db';
import Registration from '@/models/Registration';
import Students from '@/models/Students';
import Event from '@/models/Event';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const indiaTimeZone = 'Asia/Kolkata';

// Mark attendance for a specific event via QR code
export async function markEventAttendance(userId: string, eventId: string) {
  try {
    await connectToDatabase();
    
    // Check authorization - teacher or admin
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return { success: false, error: 'Unauthorized access' };
    }

    const decodedToken: any = jwt.decode(token);
    if (decodedToken?.role !== 'teacher' && decodedToken?.role !== 'admin') {
      return { success: false, error: 'Unauthorized access' };
    }

    // Find student by QR code
    const qrCode = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/scan/${userId}`;
    const student = await Students.findOne({ qrCode });

    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Find registration for this event and student
    const registration = await Registration.findOne({
      eventId,
      studentId: student._id,
    });

    if (!registration) {
      return { success: false, error: 'Student is not registered for this event' };
    }

    // Check if already marked attendance for this event
    const todayIST = format(toZonedTime(new Date(), indiaTimeZone), 'yyyy-MM-dd');
    
    // Check in student's attendance array
    const attendanceToday = student.attendance.find((a: any) => {
      const attendanceDateIST = format(
        toZonedTime(new Date(a.date), indiaTimeZone),
        'yyyy-MM-dd'
      );
      return attendanceDateIST === todayIST;
    });

    // Mark attendance in registration
    if (!registration.attendance) {
      registration.attendance = true;
      await registration.save();
    }

    // Also add to student's attendance array if not already present
    if (!attendanceToday) {
      student.attendance.push({
        date: new Date().toISOString(),
        present: true,
      });
      await student.save();
    }

    return {
      success: true,
      message: `Attendance marked for ${student.name} at ${event.eventName}`,
      user: {
        id: student._id.toString(),
        name: student.name,
        rollNumber: student.rollNumber,
      },
      registration: {
        id: registration._id.toString(),
        attendance: registration.attendance,
      },
    };
  } catch (error: any) {
    console.error('Error marking event attendance:', error);
    return { success: false, error: error.message || 'Failed to mark attendance' };
  }
}

// Mark attendance for student dashboard (event-specific)
export async function markAttendanceFromStudentDashboard(userId: string, eventId: string) {
  try {
    await connectToDatabase();

    const student = await Students.findById(userId);
    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Find registration
    const registration = await Registration.findOne({
      eventId,
      studentId: userId,
    });

    if (!registration) {
      return { success: false, error: 'You are not registered for this event' };
    }

    // Check if already marked
    const todayIST = format(toZonedTime(new Date(), indiaTimeZone), 'yyyy-MM-dd');
    const attendanceToday = student.attendance.find((a: any) => {
      const attendanceDateIST = format(
        toZonedTime(new Date(a.date), indiaTimeZone),
        'yyyy-MM-dd'
      );
      return attendanceDateIST === todayIST;
    });

    if (attendanceToday) {
      return {
        success: true,
        message: 'Attendance already marked for today',
        alreadyMarked: true,
      };
    }

    // Mark attendance
    registration.attendance = true;
    await registration.save();

    student.attendance.push({
      date: new Date().toISOString(),
      present: true,
    });
    await student.save();

    return {
      success: true,
      message: `Attendance marked for ${event.eventName}`,
    };
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    return { success: false, error: error.message || 'Failed to mark attendance' };
  }
}


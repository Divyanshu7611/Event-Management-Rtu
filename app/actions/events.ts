'use server';

import { connectToDatabase } from '@/lib/db';
import Event, { IEvent } from "@/models/Event";
import Students from '@/models/Students';
import { revalidatePath } from 'next/cache';
import { sendMail } from '@/lib/email';
import { reminderEmailTemplate } from "@/mail/Remind";
import fs from 'fs/promises';
import path from 'path';

// Helper to get current user from token
async function getCurrentUser() {
  const { cookies } = await import('next/headers');
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

// This action now handles a file upload along with other event data.
export async function createEvent(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { ok: false, error: 'Unauthorized. Please login.' };
    }

    const eventName = formData.get('eventName') as string;
    const eventDate = formData.get('eventDate') as string;
    const startDateTime = formData.get('startDateTime') as string;
    const endDateTime = formData.get('endDateTime') as string;
    const motive = formData.get('motive') as string;
    const description = formData.get('description') as string;
    const registrationFee = formData.get('registrationFee') as string;
    const feeAmount = formData.get('feeAmount') as string;
    const centerId = formData.get('centerId') as string;
    const capacity = formData.get('capacity') as string;
    const registrationDeadline = formData.get('registrationDeadline') as string;
    const whatsappGroupLink = formData.get('whatsappGroupLink') as string;
    const visibility = formData.get('visibility') as string || 'public';
    const certificateFile = formData.get('certificateTemplate') as File;

    if (!eventName || !eventDate || !motive) {
      return { ok: false, error: 'Event Name, Date, and Motive are required.' };
    }

    await connectToDatabase();
    
    // Import mongoose and User model for ObjectId handling
    const mongoose = require('mongoose');
    const User = (await import('@/models/User')).default;
    
    // Determine teacher_id - admin can create events for any teacher, teacher can only create for themselves
    let teacherId: string | undefined = formData.get('teacherId') as string | null || undefined;
    let teacherObjectId;
    
    if (currentUser.role === 'teacher') {
      // For teachers, use their own ID from the token
      // The token contains the teacher's MongoDB _id as a string
      if (!currentUser.id) {
        console.error('Teacher ID not found in currentUser:', currentUser);
        return { ok: false, error: 'Teacher ID not found in session. Please login again.' };
      }
      
      console.log('Teacher creating event, ID from token:', currentUser.id);
      
      // Verify teacher exists in database and get their ObjectId
      if (mongoose.Types.ObjectId.isValid(currentUser.id)) {
        const teacher = await User.findById(currentUser.id);
        if (!teacher) {
          console.error('Teacher not found in database for ID:', currentUser.id);
          return { ok: false, error: 'Teacher account not found. Please contact administrator.' };
        }
        if (teacher.role !== 'teacher') {
          console.error('User is not a teacher:', teacher.role);
          return { ok: false, error: 'Account is not a teacher account. Please contact administrator.' };
        }
        teacherObjectId = teacher._id;
        console.log('Teacher found, using ObjectId:', teacherObjectId);
      } else {
        console.error('Invalid ObjectId format:', currentUser.id);
        return { ok: false, error: 'Invalid teacher ID format. Please contact administrator.' };
      }
    } else if (currentUser.role === 'admin') {
      // Admin can specify a teacher, or use admin if not specified
      if (teacherId && teacherId !== 'admin') {
        // Admin specified a teacher ID
        if (mongoose.Types.ObjectId.isValid(teacherId)) {
          const teacher = await User.findById(teacherId);
          if (!teacher || teacher.role !== 'teacher') {
            return { ok: false, error: 'Specified teacher not found or is not a teacher account.' };
          }
          teacherObjectId = teacher._id;
        } else {
          return { ok: false, error: 'Invalid teacher ID format.' };
        }
      } else {
        // Admin creating event without specifying teacher - use a placeholder
        // Note: In production, you might want to require admin to specify a teacher
        teacherObjectId = new mongoose.Types.ObjectId();
      }
    } else {
      return { ok: false, error: 'Unauthorized. Only teachers and admins can create events.' };
    }

    // Ensure we have a valid teacherObjectId
    if (!teacherObjectId) {
      return { ok: false, error: 'Teacher ID is required.' };
    }

    let certificateFilename: string | undefined = undefined;

    // 1. Check if a certificate file was uploaded.
    if (certificateFile && certificateFile.size > 0) {
      // 2. Convert the file to a Buffer.
      const fileBuffer = Buffer.from(await certificateFile.arrayBuffer());
      // 3. Create a unique filename to prevent overwrites.
      certificateFilename = `${Date.now()}-${certificateFile.name.replace(/\s/g, '_')}`;
      // 4. Define the path to save the file in the public directory.
      const filePath = path.join(process.cwd(), 'public', certificateFilename);
      // 5. Write the file to the server's filesystem.
      await fs.writeFile(filePath, new Uint8Array(fileBuffer));
    }

    const createdByObjectId = currentUser.id && mongoose.Types.ObjectId.isValid(currentUser.id) 
      ? new mongoose.Types.ObjectId(currentUser.id) 
      : undefined;

    const newEvent = new Event({ 
      eventName, 
      eventDate,
      startDateTime: startDateTime ? new Date(startDateTime) : undefined,
      endDateTime: endDateTime ? new Date(endDateTime) : undefined,
      motive, 
      description,
      registrationFee: registrationFee || 'Free',
      feeAmount: feeAmount ? parseFloat(feeAmount) : undefined,
      teacherId: teacherObjectId,
      centerId,
      capacity: capacity ? parseInt(capacity) : undefined,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      whatsappGroupLink,
      visibility: visibility as 'public' | 'private',
      certificateTemplate: certificateFilename,
      createdBy: createdByObjectId,
      posterStatus: 'pending',
    });

    await newEvent.save();
    revalidatePath('/admin/scanner');
    revalidatePath('/teacher/dashboard');

    return { ok: true, event: JSON.parse(JSON.stringify(newEvent)) };
  } catch (error: any) {
    console.error("Error creating event:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    if (error.code === 11000) {
        return { ok: false, error: 'An event with this name already exists.' };
    }
    
    // Provide more specific error messages
    if (error.message) {
      return { ok: false, error: `Failed to create event: ${error.message}` };
    }
    
    return { ok: false, error: 'Failed to create event. Please check all fields and try again.' };
  }
}

// ... (The rest of your functions in this file remain unchanged)

export async function RemainerStudents(id: string) {
  console.log(`[1/4] Starting reminder process for event ID: ${id}`);
  try {
    await connectToDatabase();

    const event = await Event.findById(id).lean<IEvent | null>();
    if (!event) {
      console.error("Reminder failed: Event not found.");
      return { success: false, message: 'Event not found' };
    }
    console.log(`[2/4] Found event: ${event.eventName}`);

    const students = await Students.find({ eventName: event.eventName });
    if (!students || students.length === 0) {
      console.log("[3/4] No students found for this event. No reminders sent.");
      return { success: true, message: 'No students registered for this event yet.' };
    }
    console.log(`[3/4] Found ${students.length} student(s) to remind.`);

    const eventDate = new Date(event.eventDate);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    for (const student of students) {
        console.log(`--> Sending email to ${student.email}...`);
        await sendMail({
            to: student.email,
            subject: `📅 Event Reminder: ${event.eventName}`,
            html: reminderEmailTemplate(
                student.name,
                event.eventName,
                "RTU Campus, Kota",
                `${formattedDate} at 3:00 PM`
            ),
        });
    }

    console.log(`[4/4] Process complete. Reminder emails sent to ${students.length} students.`);
    return {
      success: true,
      message: `Reminder emails sent successfully to ${students.length} students`
    };
  } catch (error) {
    console.error('❌ Error in RemainerStudents:', error);
    return { success: false, message: 'Failed to send reminder emails. Check server logs.' };
  }
}

export async function getEvents() {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    let query: any = {};
    // If teacher, only show their events
    if (currentUser && currentUser.role === 'teacher') {
      const mongoose = require('mongoose');
      query.teacherId = mongoose.Types.ObjectId.isValid(currentUser.id) ? currentUser.id : new mongoose.Types.ObjectId(currentUser.id);
    }
    
    const events = await Event.find(query).sort({ createdAt: -1 }).lean<IEvent[]>();
    return JSON.parse(JSON.stringify(events));
  } catch (error) {
    return [];
  }
}

export async function getEventById(eventId: string) {
  try {
    await connectToDatabase();
    const event = await Event.findById(eventId).lean<IEvent | null>();
    return event ? JSON.parse(JSON.stringify(event)) : null;
  } catch (error) {
    return null;
  }
}

export async function deleteEvent(id: string) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { ok: false, error: 'Unauthorized.' };
    }

    const event = await Event.findById(id);
    if (!event) {
      return { ok: false, error: 'Event not found.' };
    }

    // Teachers can only delete their own events
    if (currentUser.role === 'teacher' && event.teacherId.toString() !== currentUser.id) {
      return { ok: false, error: 'Unauthorized. You can only delete your own events.' };
    }

    await Event.findByIdAndDelete(id);
    revalidatePath('/admin/scanner');
    revalidatePath('/teacher/dashboard');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: 'Failed to delete event' };
  }
}

// Update event
export async function updateEvent(eventId: string, formData: FormData) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { ok: false, error: 'Unauthorized.' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { ok: false, error: 'Event not found.' };
    }

    // Teachers can only update their own events
    if (currentUser.role === 'teacher' && event.teacherId.toString() !== currentUser.id) {
      return { ok: false, error: 'Unauthorized. You can only update your own events.' };
    }

    const eventName = formData.get('eventName') as string;
    const eventDate = formData.get('eventDate') as string;
    const startDateTime = formData.get('startDateTime') as string;
    const endDateTime = formData.get('endDateTime') as string;
    const motive = formData.get('motive') as string;
    const description = formData.get('description') as string;
    const registrationFee = formData.get('registrationFee') as string;
    const feeAmount = formData.get('feeAmount') as string;
    const centerId = formData.get('centerId') as string;
    const capacity = formData.get('capacity') as string;
    const registrationDeadline = formData.get('registrationDeadline') as string;
    const whatsappGroupLink = formData.get('whatsappGroupLink') as string;
    const visibility = formData.get('visibility') as string;

    if (eventName) event.eventName = eventName;
    if (eventDate) event.eventDate = eventDate;
    if (startDateTime) event.startDateTime = new Date(startDateTime);
    if (endDateTime) event.endDateTime = new Date(endDateTime);
    if (motive) event.motive = motive;
    if (description !== null) event.description = description;
    if (registrationFee !== null) event.registrationFee = registrationFee;
    if (feeAmount) event.feeAmount = parseFloat(feeAmount);
    if (centerId !== null) event.centerId = centerId;
    if (capacity) event.capacity = parseInt(capacity);
    if (registrationDeadline) event.registrationDeadline = new Date(registrationDeadline);
    if (whatsappGroupLink !== null) event.whatsappGroupLink = whatsappGroupLink;
    if (visibility) event.visibility = visibility as 'public' | 'private';

    const mongoose = require('mongoose');
    event.updatedBy = currentUser.id ? (mongoose.Types.ObjectId.isValid(currentUser.id) ? currentUser.id : undefined) : undefined;

    await event.save();
    revalidatePath('/admin/scanner');
    revalidatePath('/teacher/dashboard');
    revalidatePath(`/events/${eventId}`);

    return { ok: true, event: JSON.parse(JSON.stringify(event)) };
  } catch (error: any) {
    console.error('Error updating event:', error);
    return { ok: false, error: error.message || 'Failed to update event.' };
  }
}

export async function getEventAttendance(eventId: string) {
  try {
    await connectToDatabase();
    const event = await Event.findById(eventId).lean<IEvent | null>();
    if (!event) return { ok: false, error: 'Event not found' };
    const students = await Students.find({ eventName: event.eventName }).lean();
    const rows = (students || []).map((s: any) => ({
      name: s.name, email: s.email, rollNumber: s.rollNumber,
      universityRollNo: s.universityRollNo, branch: s.branch, year: s.year,
      phoneNumber: s.phoneNumber, attendanceCount: Array.isArray(s.attendance) ? s.attendance.length : 0,
    }));
    return { ok: true, eventName: event.eventName, rows };
  } catch (error) {
    return { ok: false, error: 'Failed to fetch event attendance' };
  }
}
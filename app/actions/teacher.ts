'use server';

import { connectToDatabase } from '@/lib/db';
import User, { IUser } from '@/models/User';
import Event from '@/models/Event';
import Registration from '@/models/Registration';
import { hashPassword, comparePasswords, generateToken } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendMail } from '@/lib/email';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

// Get current user from token
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

// Create a teacher account
export async function createTeacher(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    await connectToDatabase();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const assignedCenters = formData.get('assignedCenters') as string;
    const tempPassword = formData.get('tempPassword') as string;
    const sendInviteLink = formData.get('sendInviteLink') === 'true';

    if (!name || !email) {
      return { success: false, error: 'Name and email are required.' };
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return { success: false, error: 'A user with this email already exists.' };
    }

    // Generate password or use provided one
    let password = tempPassword;
    if (!password) {
      password = randomBytes(8).toString('hex');
    }

    const hashedPassword = await hashPassword(password);

    // Parse assigned centers
    const centers = assignedCenters ? assignedCenters.split(',').map(c => c.trim()).filter(c => c) : [];

    const newTeacher = new User({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: 'teacher',
      assignedCenters: centers,
      isActive: true,
    });

    await newTeacher.save();

    // Send invitation email if requested
    if (sendInviteLink) {
      const inviteToken = generateToken({ id: newTeacher._id.toString(), email: newTeacher.email, role: 'teacher' });
      const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/login?token=${inviteToken}`;
      
      await sendMail({
        to: email,
        subject: 'Teacher Account Created - Event Management System',
        html: `
          <h2>Welcome ${name}!</h2>
          <p>Your teacher account has been created.</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${password}</p>
          <p>Click <a href="${inviteLink}">here</a> to login and set up your account.</p>
          <p>Or visit: ${inviteLink}</p>
        `,
      });
    }

    revalidatePath('/admin/teachers');
    return { success: true, teacher: JSON.parse(JSON.stringify(newTeacher)) };
  } catch (error: any) {
    console.error('Error creating teacher:', error);
    return { success: false, error: error.message || 'Failed to create teacher account.' };
  }
}

// Bulk create teachers from CSV
export async function bulkCreateTeachers(csvData: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    await connectToDatabase();

    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Expected headers: name, email, phone, assignedcenters
    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const phoneIdx = headers.indexOf('phone');
    const centersIdx = headers.indexOf('assignedcenters');

    if (nameIdx === -1 || emailIdx === -1) {
      return { success: false, error: 'CSV must contain "name" and "email" columns.' };
    }

    const created = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const name = values[nameIdx];
      const email = values[emailIdx]?.toLowerCase();
      const phone = values[phoneIdx] || '';
      const centers = values[centersIdx] ? values[centersIdx].split(';').map(c => c.trim()) : [];

      if (!name || !email) {
        errors.push(`Row ${i + 1}: Missing name or email`);
        continue;
      }

      try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          errors.push(`Row ${i + 1}: Email ${email} already exists`);
          continue;
        }

        const password = randomBytes(8).toString('hex');
        const hashedPassword = await hashPassword(password);

        const newTeacher = new User({
          name,
          email,
          phone,
          password: hashedPassword,
          role: 'teacher',
          assignedCenters: centers,
          isActive: true,
        });

        await newTeacher.save();
        created.push({ name, email, password });
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return {
      success: true,
      created: created.length,
      errors: errors.length > 0 ? errors : undefined,
      teachers: created,
    };
  } catch (error: any) {
    console.error('Error bulk creating teachers:', error);
    return { success: false, error: error.message || 'Failed to bulk create teachers.' };
  }
}

// Get all teachers
export async function getAllTeachers() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    await connectToDatabase();
    const teachers = await User.find({ role: 'teacher' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean<IUser[]>();

    return { success: true, teachers: JSON.parse(JSON.stringify(teachers)) };
  } catch (error: any) {
    console.error('Error fetching teachers:', error);
    return { success: false, error: 'Failed to fetch teachers.' };
  }
}

// Update teacher
export async function updateTeacher(teacherId: string, formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    await connectToDatabase();

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return { success: false, error: 'Teacher not found.' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const assignedCenters = formData.get('assignedCenters') as string;

    if (name) teacher.name = name;
    if (email) teacher.email = email.toLowerCase();
    if (phone !== null) teacher.phone = phone;
    
    if (assignedCenters !== null) {
      const centers = assignedCenters ? assignedCenters.split(',').map(c => c.trim()).filter(c => c) : [];
      teacher.assignedCenters = centers;
    }

    await teacher.save();
    revalidatePath('/admin/teachers');

    return { success: true, teacher: JSON.parse(JSON.stringify(teacher)) };
  } catch (error: any) {
    console.error('Error updating teacher:', error);
    return { success: false, error: error.message || 'Failed to update teacher.' };
  }
}

// Deactivate/Reactivate teacher
export async function toggleTeacherStatus(teacherId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    await connectToDatabase();

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return { success: false, error: 'Teacher not found.' };
    }

    teacher.isActive = !teacher.isActive;
    await teacher.save();
    revalidatePath('/admin/teachers');

    return { success: true, teacher: JSON.parse(JSON.stringify(teacher)) };
  } catch (error: any) {
    console.error('Error toggling teacher status:', error);
    return { success: false, error: 'Failed to update teacher status.' };
  }
}

// Reset teacher password
export async function resetTeacherPassword(teacherId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    await connectToDatabase();

    const teacher = await User.findById(teacherId).select('+password');
    if (!teacher || teacher.role !== 'teacher') {
      return { success: false, error: 'Teacher not found.' };
    }

    const newPassword = randomBytes(8).toString('hex');
    teacher.password = await hashPassword(newPassword);
    await teacher.save();

    // Send email with new password
    await sendMail({
      to: teacher.email,
      subject: 'Password Reset - Event Management System',
      html: `
        <h2>Password Reset</h2>
        <p>Your password has been reset.</p>
        <p><strong>New Password:</strong> ${newPassword}</p>
        <p>Please login and change your password.</p>
      `,
    });

    return { success: true, newPassword };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return { success: false, error: 'Failed to reset password.' };
  }
}

// Get teacher activity/audit logs
export async function getTeacherActivity(teacherId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    await connectToDatabase();

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return { success: false, error: 'Teacher not found.' };
    }

    // Get events created by teacher
    const events = await Event.find({ teacherId: teacher._id })
      .select('eventName createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Get registrations from teacher's events
    const eventIds = events.map(e => e._id);
    const registrations = await Registration.find({ eventId: { $in: eventIds } })
      .countDocuments();

    return {
      success: true,
      activity: {
        eventsCreated: events.length,
        lastEventCreated: events[0]?.createdAt || null,
        totalRegistrations: registrations,
        lastLogin: teacher.lastLogin || null,
        accountCreated: teacher.createdAt,
        isActive: teacher.isActive,
      },
    };
  } catch (error: any) {
    console.error('Error fetching teacher activity:', error);
    return { success: false, error: 'Failed to fetch teacher activity.' };
  }
}


'use server';

import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import Students from '@/models/Students';
import Event from '@/models/Event'; // ✨ 1. IMPORT THE EVENT MODEL
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { generateToken } from '@/lib/auth';
import { any } from 'zod';
import jwt from 'jsonwebtoken';
import { sendMail } from '@/lib/email';
import { registrationTemplate } from '@/mail/studentRegistration';
import { toZonedTime, format } from "date-fns-tz";
import { generatePosterBuffer } from './generation'; // ✨ 2. IMPORT THE POSTER GENERATION FUNCTION

const indiaTimeZone = "Asia/Kolkata"; // IST

// ... (registerUser, getUserById, getUserByRollNumber functions are unchanged)
export async function registerUser(userData: { name: string; email: string; rollNumber: string }) {
  // ... no changes here
  try {
    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { rollNumber: userData.rollNumber }
      ]
    });

    if (existingUser) {
      return {
        success: false,
        error: 'A user with this email or roll number already exists'
      };
    }

    // Generate QR code URL (this will be the URL to verify attendance)
    const userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const qrCodeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://student-dashboard-sable.vercel.app'}/scan/${userId}`;

    // Create new user
    const newUser = new User({
      ...userData,
      qrCode: qrCodeUrl
    });

    await newUser.save();

    // Send registration email with QR code
    const html = registrationTemplate(newUser.name, userData.rollNumber, "Core Team Registration");
    const mailResponse = await sendMail({
      to: userData.email,
      subject: 'Registration Confirmation',
      html
    });

    revalidatePath('/dashboard');

    return {
      success: true,
      userId: newUser._id.toString()
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      error: 'Failed to register user'
    };
  }
}
export async function getUserById(userId: string) {
  // ... no changes here
  try {
    await connectToDatabase();
    // const user = await User.findById(userId);
    const user = await User.findById(userId) || await Students.findById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return {
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        qrCode: user.qrCode,
        attendance: Array.isArray(user.attendance)
          ? user.attendance.map((a: any) => ({
            date: new Date(a.date).toISOString(),
            present: !!a.present,
          }))
          : [],
      }
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}
export async function getUserByRollNumber(rollNumber: string) {
  // ... no changes here
  try {
    await connectToDatabase();
    const input = (rollNumber || '').trim();
    const regex = new RegExp(`^${input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, 'i');

    // Try exact (case-insensitive) match on rollNumber, then fallback to universityRollNo
    let user: any = await User.findOne({ $or: [{ rollNumber: regex }, { universityRollNo: regex }] }).lean();
    if (!user) {
      user = await Students.findOne({ $or: [{ rollNumber: regex }, { universityRollNo: regex }] }).lean();
    }
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    const normalized = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      rollNumber: user.rollNumber,
      qrCode: user.qrCode,
      attendance: Array.isArray(user.attendance)
        ? user.attendance.map((a: any) => ({
          date: new Date(a.date).toISOString(),
          present: !!a.present,
        }))
        : [],
    };
    return { success: true, user: normalized };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}
export async function markAttendance(userId: string) {
  // ... no changes here
  try {
    await connectToDatabase();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return { success: false, error: 'Unauthorized access' };
    }

    const decodedToken: any = jwt.decode(token);
    if (decodedToken?.role !== 'admin') {
      return { success: false, error: 'Unauthorized access' };
    }

    let user = await User.findOne({
      qrCode: `${process.env.NEXT_PUBLIC_APP_URL || 'https://student-dashboard-sable.vercel.app'}/scan/${userId}`
    });

    if (!user) {
      user = await Students.findOne({
        qrCode: `${process.env.NEXT_PUBLIC_APP_URL || 'https://student-dashboard-sable.vercel.app'}/scan/${userId}`
      });

    }

    if (!user) {
      return { success: false, error: 'User not found' };

    }

    // ✅ Convert today's date to IST (without time)
    const todayIST = format(toZonedTime(new Date(), indiaTimeZone), 'yyyy-MM-dd');

    // ✅ Check if attendance is already marked for today
    const attendanceToday = user.attendance.find((a: any) => {
      const attendanceDateIST = format(
        toZonedTime(new Date(a.date), indiaTimeZone),
        'yyyy-MM-dd'
      );

      return attendanceDateIST === todayIST; // Compare only the date part
    });

    if (attendanceToday) {
      return {
        success: true,
        message: 'Attendance already marked for today',
        user: {
          id: user._id.toString(),
          name: user.name,
          rollNumber: user.rollNumber
        }
      };
    }

    // ✅ Store attendance date in UTC (safe for database)
    user.attendance.push({
      date: new Date().toISOString(),
      present: true
    });

    await user.save();
    revalidatePath('/admin/scanner');

    return {
      success: true,
      message: 'Attendance marked successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        rollNumber: user.rollNumber
      }
    };
  } catch (error) {
    console.error('Error marking attendance:', error);
    return { success: false, error: 'Failed to mark attendance' };
  }
}
export async function getAllUsers() {
  // ... no changes here
  try {
    await connectToDatabase();
    const coreUsers = await User.find({}).sort({ name: 1 }).lean();
    const students = await Students.find({}).sort({ name: 1 }).lean();

    const normalized = [
      ...(coreUsers || []).map((user: any) => ({
        id: user._id?.toString?.() ?? String(user._id),
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        attendance: Array.isArray(user.attendance)
          ? user.attendance.map((a: any) => ({
            date: new Date(a.date).toISOString(),
            present: !!a.present,
          }))
          : [],
      })),
      ...(students || []).map((user: any) => ({
        id: user._id?.toString?.() ?? String(user._id),
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        attendance: Array.isArray(user.attendance)
          ? user.attendance.map((a: any) => ({
            date: new Date(a.date).toISOString(),
            present: !!a.present,
          }))
          : [],
      })),
    ];

    return { success: true, users: normalized };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}
export async function adminLogin(username: string, password: string) {
  try {
    // Fixed admin credentials (in a real app, these would be in env variables)
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin@rtu';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rtu@superadmin@2025';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Generate JWT token
      const token = generateToken({
        id: 'admin',
        username,
        role: 'admin'
      });

      const cookieStore = await cookies();
      // Set cookie
      cookieStore.set({
        name: 'auth-token',
        value: token,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return { success: true, role: 'admin' };
    }

    // Try teacher login
    await connectToDatabase();
    const { comparePasswords } = await import('@/lib/auth');
    
    const teacher = await User.findOne({ 
      email: username.toLowerCase(),
      role: 'teacher'
    }).select('+password');

    if (teacher && teacher.isActive) {
      const isPasswordValid = await comparePasswords(password, teacher.password || '');
      
      if (isPasswordValid) {
        // Update last login
        teacher.lastLogin = new Date();
        await teacher.save();

        const token = generateToken({
          id: teacher._id.toString(),
          email: teacher.email,
          role: 'teacher',
          name: teacher.name
        });

        const cookieStore = await cookies();
        cookieStore.set({
          name: 'auth-token',
          value: token,
          httpOnly: true,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        return { success: true, role: 'teacher', redirect: '/teacher/dashboard' };
      }
    }

    return { success: false, error: 'Invalid credentials' };
  } catch (error) {
    console.error('Error during login:', error);
    return { success: false, error: 'Login failed' };
  }
}
export async function logout() {
  // ... no changes here
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  return { success: true };
}

// THIS IS THE FULLY UPDATED FUNCTION
export async function registerStudents(studentData: {
  name: string, email: string, rollNumber: string, universityRollNo: string, branch: string, phoneNumber: string,
  cgpa: string
}) {
  try {
    // Ensure a connection to the database is established
    await connectToDatabase();

    // Check for an existing user by email or college roll number
    const existingUser = await Students.findOne({
      $or: [
        { email: studentData.email },
        { rollNumber: studentData.rollNumber },
      ]
    });

    if (existingUser) {
      return {
        success: false,
        error: 'A user with this email or roll number has already registered.'
      };
    }

    // Generate a unique user ID and a QR code URL
    const userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const qrCodeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://student-dashboard-sable.vercel.app'}/scan/${userId}`;

    // Create a new student document
    const newUser = new Students({
      ...studentData,
      qrCode: qrCodeUrl
    });

    // Save the new student to the database
    await newUser.save();

    // Revalidate the dashboard page to show the updated data
    revalidatePath('/dashboard');

    return {
      success: true,
      userId: newUser._id.toString()
    };
  } catch (error) {
    console.error('Error registering student:', error);
    return {
      success: false,
      error: 'Failed to register. An unexpected error occurred.'
    };
  }
}

// ... (getStudentByEmail, getStudentById, getAllRecruitments, review, getstudentdetail functions are unchanged)
export async function getStudentByEmail(email: string) {
  // ... no changes here
  try {
    await connectToDatabase();
    const input = (email || '').trim();
    const regex = new RegExp(`^${input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, 'i');

    let user: any = await Students.findOne({ email: regex });
    if (!user) {
      user = await User.findOne({ email: regex });
    }

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return {
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        branch: user.branch,
        universityRollNo: user.universityRollNo,
        eventName: user.eventName,
        phoneNumber: user.phoneNumber,
        year: user.year,
        rollNumber: user.rollNumber,
        qrCode: user.qrCode,
        attendance: Array.isArray(user.attendance)
          ? user.attendance.map((a: any) => ({
            date: new Date(a.date).toISOString(),
            present: !!a.present,
          }))
          : [],
        cgpa: user.cgpa,
        back: user.back,
        summary: user.summary,
        clubs: user.clubs,
        aim: user.aim,
        believe: user.believe,
        expect: user.expect,
        domain: user.domain,
      }
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}
export async function getStudentById(userId: string) {
  try {
    await connectToDatabase();
    
    // Convert userId to ObjectId for consistent querying
    const mongoose = require('mongoose');
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;
    
    const user = await Students.findById(userObjectId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    console.log(`Student found: ${user.name} (${user._id}), Certificates: ${user.certificates?.length || 0}`);

    return {
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        branch: user.branch,
        universityRollNo: user.universityRollNo,
        year: user.year,
        eventName: user.eventName,
        phoneNumber: user.phoneNumber,
        qrCode: user.qrCode,
        attendance: Array.isArray(user.attendance)
          ? user.attendance.map((a: any) => ({
            date: new Date(a.date).toISOString(),
            present: !!a.present,
          }))
          : [],
        //gagan
        cgpa: user.cgpa,
        back: user.back,
        summary: user.summary,
        clubs: user.clubs,
        aim: user.aim,
        believe: user.believe,
        expect: user.expect,
        domain: user.domain,
      }
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}
export const getAllRecruitments = async () => {
  // ... no changes here
  try {
    await connectToDatabase();
    const students = await Students.find({}).sort({ createdAt: -1 });

    return {
      success: true,
      students: students.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        branch: user.branch,
        universityRollNo: user.universityRollNo,
        year: user.year,
        eventName: user.eventName,
        phoneNumber: user.phoneNumber,
        qrCode: user.qrCode,
        attendance: Array.isArray(user.attendance)
          ? user.attendance.map((a: any) => ({
            date: new Date(a.date).toISOString(),
            present: !!a.present,
          }))
          : [],
        cgpa: user.cgpa,
        back: user.back,
        summary: user.summary,
        clubs: user.clubs,
        aim: user.aim,
        believe: user.believe,
        expect: user.expect,
        domain: user.domain,
        review: user.review ?? null,
        comment: user.comment ?? "",
        roundOneAttendance: user.roundOneAttendance,
        roundTwoAttendance: user.roundTwoAttendance,
        roundOneQualified: user.roundOneQualified,
        roundTwoQualified: user.roundTwoQualified,
      }))
    };
  } catch (error) {
    console.error("Error fetching students:", error);
    return { success: false, error: "Failed to fetch students" };
  }
};
interface ReviewData {
  studentId: string;
  review?: number;
  comment?: string;
  roundOneAttendance?: boolean;
  roundTwoAttendance?: boolean;
  roundOneQualified?: boolean;
  roundTwoQualified?: boolean;
}
export const review = async (data: ReviewData) => {
  // ... no changes here
  try {
    await connectToDatabase();
    const students = await Students.findByIdAndUpdate(data.studentId, {
      review: data.review ?? null,
      comment: data.comment ?? "",

      roundOneAttendance: data.roundOneAttendance,
      roundTwoAttendance: data.roundTwoAttendance,
      roundOneQualified: data.roundOneQualified,
      roundTwoQualified: data.roundTwoQualified,

    },

      { new: true }
    )

    if (!students) {
      return { success: false, error: "student not found" }
    }

    return { success: true, students }
  } catch (error) {
    console.error("Error reviewing student:", error);
    return { success: false, error: "Failed to review student" };
  }
}
export const getstudentdetail = async (data: ReviewData) => {
  // ... no changes here
  try {

  } catch (error) {

  }
}
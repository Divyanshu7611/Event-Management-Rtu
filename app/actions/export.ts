'use server';

import { connectToDatabase } from '@/lib/db';
import Students from '@/models/Students';
import Registration from '@/models/Registration';
import Event from '@/models/Event';
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { cookies } from 'next/headers';

export async function exportStudentsToExcel() {
  try {
    await connectToDatabase();
    const students = await Students.find({}).sort({ name: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    // Define columns
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'University Roll No', key: 'universityRollNo', width: 20 },
      { header: 'Branch', key: 'branch', width: 15 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'CGPA', key: 'cgpa', width: 10 },
      { header: 'Backlogs', key: 'back', width: 10 },
      { header: 'Phone Number', key: 'phoneNumber', width: 20 },
      { header: 'Event Name', key: 'eventName', width: 30 },
      { header: 'Domains', key: 'domain', width: 40 },
      { header: 'Review (0-10)', key: 'review', width: 15 },
      { header: 'Comment', key: 'comment', width: 50 },
      { header: 'Round 1 Attendance', key: 'roundOneAttendance', width: 20 },
      { header: 'Round 2 Attendance', key: 'roundTwoAttendance', width: 20 },
      { header: 'Round 1 Qualified', key: 'roundOneQualified', width: 20 },
      { header: 'Round 2 Qualified', key: 'roundTwoQualified', width: 20 },
      { header: 'Total Attendance', key: 'attendanceCount', width: 20 },
    ];

    // Add rows from the database
    const plainStudents = JSON.parse(JSON.stringify(students));

    plainStudents.forEach((student: any) => {
      worksheet.addRow({
        ...student,
        domain: Array.isArray(student.domain) ? student.domain.join(', ') : student.domain || '',
        attendanceCount: Array.isArray(student.attendance) ? student.attendance.length : 0,
        review: student.review || 'Not Reviewed',
        comment: student.comment || '',
        roundOneAttendance: student.roundOneAttendance ? 'Yes' : 'No',
        roundTwoAttendance: student.roundTwoAttendance ? 'Yes' : 'No',
        roundOneQualified: student.roundOneQualified ? 'Yes' : 'No',
        roundTwoQualified: student.roundTwoQualified ? 'Yes' : 'No',
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Generate the file buffer in memory
    const buffer = await workbook.xlsx.writeBuffer();

    // Convert buffer to a Base64 string to safely send to the client
    const base64 = Buffer.from(buffer).toString('base64');

    return {
      success: true,
      file: base64,
    };
  } catch (error: any) {
    console.error('Error exporting to Excel:', error);
    return { success: false, error: 'Failed to export data.' };
  }
}

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

// Export event registrations to CSV
export async function exportEventRegistrationsCSV(eventId: string) {
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

    const registrations = await Registration.find({ eventId })
      .populate('studentId', 'name email rollNumber phoneNumber')
      .sort({ registeredAt: -1 })
      .lean();

    // Create CSV content
    const headers = ['Name', 'Email', 'Mobile', 'Roll Number', 'Registration Date', 'Payment Status', 'Attendance', 'Notes'];
    const rows = registrations.map((reg: any) => {
      const student = reg.studentId || {};
      return [
        reg.studentName || student.name || '',
        reg.studentEmail || student.email || '',
        reg.studentMobile || student.phoneNumber || '',
        student.rollNumber || '',
        new Date(reg.registeredAt).toLocaleString(),
        reg.paymentStatus || 'pending',
        reg.attendance ? 'Yes' : 'No',
        reg.notes || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const base64 = Buffer.from(csvContent).toString('base64');

    return {
      success: true,
      file: base64,
      filename: `${event.eventName.replace(/[^a-z0-9]/gi, '_')}_registrations.csv`,
    };
  } catch (error: any) {
    console.error('Error exporting registrations to CSV:', error);
    return { success: false, error: 'Failed to export registrations.' };
  }
}

// Export event registrations to PDF
export async function exportEventRegistrationsPDF(eventId: string) {
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

    const registrations = await Registration.find({ eventId })
      .populate('studentId', 'name email rollNumber phoneNumber')
      .sort({ registeredAt: -1 })
      .lean();

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 750;
    const lineHeight = 20;
    const margin = 50;

    // Title
    page.drawText(`Event: ${event.eventName}`, {
      x: margin,
      y,
      size: 16,
      font: boldFont,
    });
    y -= 30;

    page.drawText(`Registrations Report - ${new Date().toLocaleDateString()}`, {
      x: margin,
      y,
      size: 12,
      font,
    });
    y -= 40;

    // Statistics
    const total = registrations.length;
    const attended = registrations.filter((r: any) => r.attendance).length;
    const paid = registrations.filter((r: any) => r.paymentStatus === 'paid').length;

    page.drawText(`Total Registrations: ${total}`, { x: margin, y, size: 10, font });
    y -= lineHeight;
    page.drawText(`Attended: ${attended}`, { x: margin, y, size: 10, font });
    y -= lineHeight;
    page.drawText(`Paid: ${paid}`, { x: margin, y, size: 10, font });
    y -= 30;

    // Table headers
    const headers = ['Name', 'Email', 'Mobile', 'Payment', 'Attendance'];
    const colWidths = [120, 150, 100, 80, 80];
    let x = margin;

    headers.forEach((header, i) => {
      page.drawText(header, {
        x,
        y,
        size: 10,
        font: boldFont,
      });
      x += colWidths[i];
    });
    y -= lineHeight;

    // Draw line
    page.drawLine({
      start: { x: margin, y },
      end: { x: 562, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 10;

    // Table rows
    registrations.forEach((reg: any, index: number) => {
      if (y < 100) {
        // New page
        const newPage = pdfDoc.addPage([612, 792]);
        y = 750;
        page.drawText(`Event: ${event.eventName} (continued)`, {
          x: margin,
          y,
          size: 12,
          font: boldFont,
        });
        y -= 40;
      }

      const student = reg.studentId || {};
      const name = reg.studentName || student.name || 'N/A';
      const email = reg.studentEmail || student.email || 'N/A';
      const mobile = reg.studentMobile || student.phoneNumber || 'N/A';
      const payment = reg.paymentStatus || 'pending';
      const attendance = reg.attendance ? 'Yes' : 'No';

      x = margin;
      [name, email, mobile, payment, attendance].forEach((text, i) => {
        const displayText = String(text).substring(0, 20);
        page.drawText(displayText, {
          x,
          y,
          size: 9,
          font,
        });
        x += colWidths[i];
      });
      y -= lineHeight;
    });

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString('base64');

    return {
      success: true,
      file: base64,
      filename: `${event.eventName.replace(/[^a-z0-9]/gi, '_')}_registrations.pdf`,
    };
  } catch (error: any) {
    console.error('Error exporting registrations to PDF:', error);
    return { success: false, error: 'Failed to export registrations.' };
  }
}

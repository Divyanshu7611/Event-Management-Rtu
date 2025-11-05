'use server';

import { connectToDatabase } from '@/lib/db';
import Event from '@/models/Event';
import Students from '@/models/Students';
import Registration from '@/models/Registration';
import { sendMail } from '@/lib/email';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs/promises';

// Release certificates for selected students
export async function releaseCertificates(eventId: string, studentIds: string[]) {
  try {
    await connectToDatabase();
    
    const event = await Event.findById(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Convert studentIds to ObjectIds
    const mongoose = require('mongoose');
    const studentObjectIds = studentIds.map(id => 
      mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
    );

    const registrations = await Registration.find({
      eventId,
      studentId: { $in: studentObjectIds },
      attendance: true, // Only for students who attended
    }).lean();

    if (registrations.length === 0) {
      return { success: false, error: 'No eligible students found for certificate release' };
    }

    const certificateResults = [];
    
    for (const registration of registrations) {
      const studentId = registration.studentId;
      
      if (!studentId) {
        certificateResults.push({ studentId: 'unknown', success: false, error: 'Student ID not found in registration' });
        continue;
      }

      // Fetch the actual student document (not populated, so we can save it)
      const student = await Students.findById(studentId);
      if (!student) {
        certificateResults.push({ studentId: studentId.toString(), success: false, error: 'Student not found' });
        continue;
      }
      
      try {
        // Generate certificate using existing function
        const certResult = await generateCertificateForStudent(event, student);
        
        if (certResult.success) {
          // Add certificate to student's record
          if (!student.certificates) {
            student.certificates = [];
          }
          
          // Check if certificate already exists for this event
          const existingCert = student.certificates.find(
            (c: any) => c.eventId === event._id.toString()
          );
          
          if (!existingCert) {
            student.certificates.push({
              eventId: event._id.toString(),
              eventName: event.eventName,
              certificateUrl: certResult.certificateUrl,
              issuedAt: new Date(),
            });
            
            await student.save();
            console.log(`Certificate saved for student ${student.name} (${student._id})`);
          } else {
            console.log(`Certificate already exists for student ${student.name} for event ${event.eventName}`);
          }
          
          certificateResults.push({ studentId: student._id.toString(), success: true });
        } else {
          certificateResults.push({ studentId: student._id.toString(), success: false, error: certResult.error });
        }
      } catch (error: any) {
        console.error(`Error generating certificate for ${student.name}:`, error);
        certificateResults.push({ studentId: student._id.toString(), success: false, error: error.message });
      }
    }

    const successCount = certificateResults.filter(r => r.success).length;
    
    return {
      success: true,
      message: `Certificates released for ${successCount} out of ${certificateResults.length} students`,
      results: certificateResults,
    };
  } catch (error: any) {
    console.error('Error releasing certificates:', error);
    return { success: false, error: error.message || 'Failed to release certificates' };
  }
}

// Helper function to convert file to base64 URI
async function toBase64Uri(filePath: string, mimeType: string) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  } catch (error) {
    console.error(`Error reading file for Base64 conversion: ${filePath}`, error);
    throw new Error(`Could not read file: ${filePath}`);
  }
}

// Helper function to generate certificate for a single student
async function generateCertificateForStudent(event: any, student: any) {
  try {
    // Use existing certificate generation logic
    const defaultTemplatePath = path.join(process.cwd(), 'public', 'certificate-template.png');
    let templatePathToUse = defaultTemplatePath;

    if (event.certificateTemplate) {
      const customTemplatePath = path.join(process.cwd(), 'public', event.certificateTemplate);
      try {
        await fs.access(customTemplatePath);
        templatePathToUse = customTemplatePath;
      } catch {
        console.warn(`Custom template not found, using default`);
      }
    }

    const templateBuffer = await fs.readFile(templatePathToUse);
    const fontBoldUri = await toBase64Uri(path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf'), 'font/ttf');
    const fontRegularUri = await toBase64Uri(path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.ttf'), 'font/ttf');

    const certificateTextSvg = `
      <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
        <style>
          @font-face { font-family: 'Inter'; src: url("${fontRegularUri}"); font-weight: normal; }
          @font-face { font-family: 'Inter'; src: url("${fontBoldUri}"); font-weight: bold; }
          .name { fill: #1E293B; font-size: 52px; font-weight: bold; font-family: 'Inter', sans-serif; text-anchor: middle; }
          .event { fill: #475569; font-size: 24px; font-family: 'Inter', sans-serif; text-anchor: middle; }
        </style>
        <text x="600" y="420" class="name">${student.name}</text>
        <text x="600" y="510" class="event">for successfully participating in the event</text>
        <text x="600" y="550" class="event">${event.eventName}</text>
      </svg>
    `;

    const certificateImageBuffer = await sharp(templateBuffer)
      .resize(1200, 800)
      .composite([{ input: Buffer.from(certificateTextSvg) }])
      .png()
      .toBuffer();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([1200, 800]);
    
    const pngImage = await pdfDoc.embedPng(new Uint8Array(certificateImageBuffer));
    page.drawImage(pngImage, { x: 0, y: 0, width: 1200, height: 800 });

    const pdfBytes = await pdfDoc.save();

    // Save certificate to public directory
    const certDir = path.join(process.cwd(), 'public', 'certificates');
    try {
      await fs.mkdir(certDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    const certFilename = `cert_${event._id}_${student._id}_${Date.now()}.pdf`;
    const certPath = path.join(certDir, certFilename);
    await fs.writeFile(certPath, pdfBytes);

    const certificateUrl = `/certificates/${certFilename}`;

    // Send certificate email
    await sendMail({
      to: student.email,
      subject: `Your Certificate for ${event.eventName}`,
      html: `
        <h2>Congratulations!</h2>
        <p>Dear ${student.name},</p>
        <p>Your certificate for <strong>${event.eventName}</strong> has been issued.</p>
        <p>You can download it from your dashboard at: ${process.env.NEXT_PUBLIC_APP_URL}/student-dashboard</p>
        <p>Best regards,<br/>Event Team</p>
      `,
      attachments: [{
        filename: `Certificate_${event.eventName.replace(/ /g, '_')}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: 'application/pdf',
      }],
    });

    return { success: true, certificateUrl };
  } catch (error: any) {
    console.error('Error generating certificate:', error);
    return { success: false, error: error.message };
  }
}

// Get student certificates
export async function getStudentCertificates(studentId: string) {
  try {
    await connectToDatabase();
    const student = await Students.findById(studentId);
    
    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    return {
      success: true,
      certificates: student.certificates || [],
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


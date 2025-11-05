import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  email: string;
  rollNumber: string;
  universityRollNo: string;
  eventName: string[]; // <-- changed to array
  branch: string;
  year: string;
  phoneNumber: string;
  cgpa: string;
  back?: string;
  summary?: string;
  clubs?: string;
  aim?: string;
  believe?: string;
  expect?: string;
  domain?: string[];
  qrCode: string;
  attendance: {
    date: Date;
    present: boolean;
  }[];
  review?: number | null;
  comment: string | "";
  roundOneAttendance?: boolean;
  roundTwoAttendance?: boolean;
  roundOneQualified?: boolean;
  roundTwoQualified?: boolean;
  certificates?: {
    eventId: string;
    eventName: string;
    certificateUrl: string;
    issuedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    rollNumber: { type: String, required: true, trim: true },
    universityRollNo: { type: String, required: true, trim: true },

    // --- Changed from string to array ---
    eventName: {
      type: [String],
      trim: true,
      default: [],
    },

    branch: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    cgpa: { type: String, required: true, trim: true },

    qrCode: { type: String, unique: true, required: true },

    attendance: [
      {
        date: { type: Date, required: true },
        present: { type: Boolean, default: true },
      },
    ],
    review: { type: Number, default: null },
    comment: { type: String, default: "" },
    roundOneAttendance: { type: Boolean, default: false },
    roundTwoAttendance: { type: Boolean, default: false },
    roundOneQualified: { type: Boolean, default: false },
    roundTwoQualified: { type: Boolean, default: false },
    certificates: [
      {
        eventId: { type: String, required: true },
        eventName: { type: String, required: true },
        certificateUrl: { type: String, required: true },
        issuedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// --- Compound index updated for array eventName ---
// When eventName is an array, unique compound indexes become tricky.
// Best approach: Ensure unique student per event manually in logic.
StudentSchema.index({ email: 1 });
StudentSchema.index({ rollNumber: 1 });

export default mongoose.models.Students ||
  mongoose.model<IStudent>('Students', StudentSchema);

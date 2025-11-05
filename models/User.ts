import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  rollNumber?: string;
  qrCode?: string;
  password?: string; // For teacher/admin accounts
  phone?: string;
  role: 'admin' | 'teacher' | 'student';
  assignedCenters?: string[]; // For teachers
  isActive: boolean;
  lastLogin?: Date;
  attendance?: {
    date: Date;
    present: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    rollNumber: {
      type: String,
      trim: true,
      sparse: true, // Allow multiple nulls but unique non-null values
    },
    qrCode: {
      type: String,
      sparse: true,
    },
    password: {
      type: String,
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student'],
      default: 'student',
    },
    assignedCenters: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    attendance: [
      {
        date: {
          type: Date,
          required: true,
        },
        present: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
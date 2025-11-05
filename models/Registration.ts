import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRegistration extends Document {
  eventId: Types.ObjectId; // FK to Event
  studentId?: Types.ObjectId; // FK to Student (if registered user)
  studentName?: string; // For guest registrations
  studentEmail?: string;
  studentMobile?: string;
  paymentStatus: 'pending' | 'paid' | 'free' | 'cancelled';
  paymentId?: string;
  attendance: boolean;
  notes?: string;
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Students',
    },
    studentName: {
      type: String,
      trim: true,
    },
    studentEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    studentMobile: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'free', 'cancelled'],
      default: 'pending',
    },
    paymentId: {
      type: String,
      trim: true,
    },
    attendance: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
RegistrationSchema.index({ eventId: 1 });
RegistrationSchema.index({ studentId: 1 });
RegistrationSchema.index({ studentEmail: 1 });

export default mongoose.models.Registration || mongoose.model<IRegistration>('Registration', RegistrationSchema);


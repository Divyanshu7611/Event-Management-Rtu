import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEvent extends Document {
  eventName: string;
  eventDate: string;
  startDateTime?: Date;
  endDateTime?: Date;
  motive: string;
  description?: string;
  registrationFee?: string;
  feeAmount?: number;
  teacherId: Types.ObjectId; // FK to User (teacher)
  centerId?: string;
  capacity?: number;
  posterUrl?: string;
  posterStatus?: 'pending' | 'ready' | 'failed';
  registrationDeadline?: Date;
  visibility: 'public' | 'private';
  whatsappGroupLink?: string;
  certificateTemplate?: string;
  eventRegistrations: Types.ObjectId[];
  attendance: {
    name: string;
    email: string;
    rollNo: string;
    present: boolean;
  }[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    eventName: {
      type: String,
      required: [true, 'Please provide an event name'],
      trim: true,
    },
    eventDate: {
      type: String,
      required: [true, 'Please provide an event date'],
    },
    startDateTime: {
      type: Date,
    },
    endDateTime: {
      type: Date,
    },
    motive: {
      type: String,
      required: [true, 'Please provide an event motive or description'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    registrationFee: {
      type: String,
      trim: true,
    },
    feeAmount: {
      type: Number,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    centerId: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
    },
    posterUrl: {
      type: String,
    },
    posterStatus: {
      type: String,
      enum: ['pending', 'ready', 'failed'],
      default: 'pending',
    },
    registrationDeadline: {
      type: Date,
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    whatsappGroupLink: {
      type: String,
      trim: true,
    },
    certificateTemplate: {
      type: String,
    },
    eventRegistrations: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Student'
      },
    ],
    attendance: [
      {
        name: { type: String, required: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        rollNo: { type: String, required: true },
        present: { type: Boolean, default: false },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
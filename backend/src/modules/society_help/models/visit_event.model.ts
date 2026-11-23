import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVisitEvent extends Document {
  societyId: Types.ObjectId;
  hostResidentId: Types.ObjectId;
  flatNumber: string;
  eventName: string;
  eventDate: Date;
  eventCode: string; // 6-digit gate code for event guests
  expectedGuests: number;
  admittedCount: number;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}

const VisitEventSchema = new Schema<IVisitEvent>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    hostResidentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    flatNumber: { type: String, required: true },
    eventName: { type: String, required: true },
    eventDate: { type: Date, required: true },
    eventCode: { type: String, required: true, index: true },
    expectedGuests: { type: Number, required: true, default: 10 },
    admittedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['UPCOMING', 'ACTIVE', 'COMPLETED'],
      default: 'UPCOMING',
    },
  },
  { timestamps: true }
);

VisitEventSchema.index({ societyId: 1, eventCode: 1 });

export const VisitEvent = mongoose.model<IVisitEvent>('visit_event', VisitEventSchema);

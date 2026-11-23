import mongoose, { Document, Schema, Types } from 'mongoose';

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'SETTLED';

export interface ISHBooking extends Document {
  bookingId: string; // #SH-1001
  societyId: Types.ObjectId;
  residentId: Types.ObjectId;
  residentName: string;
  flatNumber: string;
  providerId: Types.ObjectId;
  providerName: string;
  serviceCategory: string;
  description: string;
  scheduledDate: string; // 'YYYY-MM-DD'
  timeSlot: string;
  slotId?: Types.ObjectId;
  escrowAmount: number;
  escrowHoldId?: string;
  status: BookingStatus;
  completedAt?: Date;
  rating?: number;
  reviewText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SHBookingSchema = new Schema<ISHBooking>(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    residentName: { type: String, required: true },
    flatNumber: { type: String, required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerName: { type: String, required: true },
    serviceCategory: { type: String, required: true },
    description: { type: String, default: '' },
    scheduledDate: { type: String, required: true },
    timeSlot: { type: String, required: true },
    slotId: { type: Schema.Types.ObjectId, ref: 'sh_slot' },
    escrowAmount: { type: Number, required: true },
    escrowHoldId: { type: String },
    status: {
      type: String,
      enum: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'SETTLED'],
      default: 'REQUESTED',
      index: true,
    },
    completedAt: { type: Date },
    rating: { type: Number, min: 1, max: 5 },
    reviewText: { type: String },
  },
  { timestamps: true }
);

SHBookingSchema.index({ societyId: 1, residentId: 1, createdAt: -1 });
SHBookingSchema.index({ societyId: 1, providerId: 1, createdAt: -1 });

export const SHBooking = mongoose.model<ISHBooking>('sh_booking', SHBookingSchema);

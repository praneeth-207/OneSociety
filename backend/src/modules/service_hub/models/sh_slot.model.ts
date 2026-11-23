import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISHSlot extends Document {
  societyId: Types.ObjectId;
  providerId: Types.ObjectId;
  providerName: string;
  serviceCategory: string; // e.g. 'HOUSEMAID', 'FITNESS', 'TUTOR'
  date: string; // 'YYYY-MM-DD'
  timeSlot: string; // e.g. '07:00 - 08:00', '08:00 - 09:00', '17:00 - 18:00'
  isBooked: boolean;
  bookedByResidentId?: Types.ObjectId;
  bookedFlatNumber?: string;
  bookingId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SHSlotSchema = new Schema<ISHSlot>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerName: { type: String, required: true },
    serviceCategory: { type: String, required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    timeSlot: { type: String, required: true },
    isBooked: { type: Boolean, default: false },
    bookedByResidentId: { type: Schema.Types.ObjectId, ref: 'User' },
    bookedFlatNumber: { type: String },
    bookingId: { type: Schema.Types.ObjectId, ref: 'sh_booking' },
  },
  { timestamps: true }
);

// Prevent double-booking same maid/provider for the same time slot on the same date!
SHSlotSchema.index({ societyId: 1, providerId: 1, date: 1, timeSlot: 1 }, { unique: true });

export const SHSlot = mongoose.model<ISHSlot>('sh_slot', SHSlotSchema);

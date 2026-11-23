import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFlat extends Document {
  societyId: Types.ObjectId;
  block: string;
  flatNumber: string;
  floor: number;
  residentId?: Types.ObjectId;
  ownerName?: string;
  ownerContact?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FlatSchema = new Schema<IFlat>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    block: { type: String, required: true, trim: true },
    flatNumber: { type: String, required: true, trim: true },
    floor: { type: Number, required: true, default: 1 },
    residentId: { type: Schema.Types.ObjectId, ref: 'User' },
    ownerName: { type: String },
    ownerContact: { type: String },
  },
  { timestamps: true }
);

FlatSchema.index({ societyId: 1, block: 1, flatNumber: 1 }, { unique: true });

export const Flat = mongoose.model<IFlat>('Flat', FlatSchema);

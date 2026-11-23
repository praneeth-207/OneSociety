import mongoose, { Document, Schema, Types } from 'mongoose';

export type ItemCategory =
  | 'TOOLS'
  | 'APPLIANCES'
  | 'GAMES_BOOKS'
  | 'CAMPING'
  | 'ELECTRONICS'
  | 'BABY_GEAR'
  | 'OTHER';

export interface ISRItem extends Document {
  societyId: Types.ObjectId;
  ownerId: Types.ObjectId;
  ownerName: string;
  ownerFlatNumber: string;
  title: string;
  category: ItemCategory;
  description: string;
  dailyRate: number;
  securityDeposit: number;
  photos: string[];
  isAvailable: boolean;
  conditionNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

const SRItemSchema = new Schema<ISRItem>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerName: { type: String, required: true },
    ownerFlatNumber: { type: String, required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['TOOLS', 'APPLIANCES', 'GAMES_BOOKS', 'CAMPING', 'ELECTRONICS', 'BABY_GEAR', 'OTHER'],
      default: 'TOOLS',
      index: true,
    },
    description: { type: String, default: '' },
    dailyRate: { type: Number, required: true, default: 50 },
    securityDeposit: { type: Number, required: true, default: 500 },
    photos: [{ type: String }],
    isAvailable: { type: Boolean, default: true, index: true },
    conditionNotes: { type: String, default: 'Good working condition' },
  },
  { timestamps: true }
);

SRItemSchema.index({ societyId: 1, isAvailable: 1 });

export const SRItem = mongoose.model<ISRItem>('sr_item', SRItemSchema);

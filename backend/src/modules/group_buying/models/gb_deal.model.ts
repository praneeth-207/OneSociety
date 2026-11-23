import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDealTier {
  minQty: number;
  maxQty?: number;
  pricePerUnit: number;
}

export type DealStatus =
  | 'OPEN'
  | 'TARGET_REACHED'
  | 'EXPIRED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'SETTLED';

export interface IGBDeal extends Document {
  dealId: string; // #GB-1001
  societyId: Types.ObjectId;
  supplierId: Types.ObjectId;
  supplierName: string;
  title: string;
  category: string;
  description: string;
  unit: string;
  tiers: IDealTier[];
  minTargetQty: number;
  currentTotalQty: number;
  currentPrice: number;
  status: DealStatus;
  deadline: Date;
  deliveryDate: Date;
  manifestQrToken?: string;
  manifestScannedAt?: Date;
  deliveryPartnerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GBDealSchema = new Schema<IGBDeal>(
  {
    dealId: { type: String, required: true, unique: true, index: true },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    supplierName: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    unit: { type: String, default: 'Box' },
    tiers: [
      {
        minQty: { type: Number, required: true },
        maxQty: { type: Number },
        pricePerUnit: { type: Number, required: true },
      },
    ],
    minTargetQty: { type: Number, required: true, default: 20 },
    currentTotalQty: { type: Number, default: 0 },
    currentPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'TARGET_REACHED', 'EXPIRED', 'DISPATCHED', 'DELIVERED', 'SETTLED'],
      default: 'OPEN',
      index: true,
    },
    deadline: { type: Date, required: true },
    deliveryDate: { type: Date, required: true },
    manifestQrToken: { type: String },
    manifestScannedAt: { type: Date },
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

GBDealSchema.index({ societyId: 1, status: 1 });

export const GBDeal = mongoose.model<IGBDeal>('gb_deal', GBDealSchema);

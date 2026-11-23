import mongoose, { Document, Schema, Types } from 'mongoose';

export type OrderStatus = 'PLEDGED' | 'DELIVERED' | 'ISSUE_RAISED' | 'REFUNDED' | 'SETTLED';

export interface IGBOrder extends Document {
  orderId: string; // #GBO-1001
  societyId: Types.ObjectId;
  dealId: Types.ObjectId;
  dealTitle: string;
  residentId: Types.ObjectId;
  residentName: string;
  flatNumber: string;
  quantity: number;
  initialPledgedPrice: number;
  finalEffectivePrice: number;
  totalPledgedAmount: number;
  escrowHoldId: string;
  refundDifference: number;
  status: OrderStatus;
  doorDeliveryToken?: string;
  deliveredAt?: Date;
  issueNotes?: string;
  issueRaisedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GBOrderSchema = new Schema<IGBOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'gb_deal', required: true, index: true },
    dealTitle: { type: String, required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    residentName: { type: String, required: true },
    flatNumber: { type: String, required: true },
    quantity: { type: Number, required: true },
    initialPledgedPrice: { type: Number, required: true },
    finalEffectivePrice: { type: Number, required: true },
    totalPledgedAmount: { type: Number, required: true },
    escrowHoldId: { type: String, required: true },
    refundDifference: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PLEDGED', 'DELIVERED', 'ISSUE_RAISED', 'REFUNDED', 'SETTLED'],
      default: 'PLEDGED',
      index: true,
    },
    doorDeliveryToken: { type: String },
    deliveredAt: { type: Date },
    issueNotes: { type: String },
    issueRaisedAt: { type: Date },
  },
  { timestamps: true }
);

GBOrderSchema.index({ societyId: 1, residentId: 1, createdAt: -1 });

export const GBOrder = mongoose.model<IGBOrder>('gb_order', GBOrderSchema);

import mongoose, { Document, Schema, Types } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'HOLD' | 'RELEASED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED';

export interface IPayment extends Document {
  societyId: Types.ObjectId;
  payerId: Types.ObjectId;
  recipientId?: Types.ObjectId;
  module: 'COMPLAINTS' | 'SOCIETY_HELP' | 'SERVICE_HUB' | 'SHARE_RENT' | 'GROUP_BUYING';
  entityId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  isSimulated: boolean;
  notes?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    payerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
    module: {
      type: String,
      enum: ['COMPLAINTS', 'SOCIETY_HELP', 'SERVICE_HUB', 'SHARE_RENT', 'GROUP_BUYING'],
      required: true,
    },
    entityId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['PENDING', 'HOLD', 'RELEASED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    idempotencyKey: { type: String, required: true, unique: true },
    isSimulated: { type: Boolean, default: true },
    notes: { type: String },
    failureReason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

export interface ILedgerEntry extends Document {
  societyId: Types.ObjectId;
  paymentId: Types.ObjectId;
  entryType: 'HOLD' | 'RELEASE' | 'REFUND' | 'DEDUCTION' | 'MAINTENANCE_PAYMENT';
  amount: number;
  balanceAfter: number;
  description: string;
  isSimulated: boolean;
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    entryType: {
      type: String,
      enum: ['HOLD', 'RELEASE', 'REFUND', 'DEDUCTION', 'MAINTENANCE_PAYMENT'],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    isSimulated: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);

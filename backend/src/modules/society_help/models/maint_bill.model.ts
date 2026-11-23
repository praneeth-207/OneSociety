import mongoose, { Document, Schema, Types } from 'mongoose';

export type BillStatus = 'PENDING' | 'PAID' | 'OVERDUE';
export type MaintPaymentMethod = 'SIMULATED_ONLINE' | 'OFFLINE_CASH' | 'OFFLINE_CHEQUE';

export interface IMaintBill extends Document {
  societyId: Types.ObjectId;
  flatId: Types.ObjectId;
  flatNumber: string;
  residentId?: Types.ObjectId;
  residentName?: string;
  billingMonth: string; // 'YYYY-MM', e.g. '2026-11'
  amount: number;
  dueDate: Date;
  status: BillStatus;
  paymentMethod?: MaintPaymentMethod;
  paidAt?: Date;
  receiptNumber?: string;
  transactionId?: string;
  offlineNotes?: string;
  verifiedByPresidentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaintBillSchema = new Schema<IMaintBill>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true, index: true },
    flatNumber: { type: String, required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'User' },
    residentName: { type: String },
    billingMonth: { type: String, required: true, index: true }, // e.g., '2026-11'
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'OVERDUE'],
      default: 'PENDING',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['SIMULATED_ONLINE', 'OFFLINE_CASH', 'OFFLINE_CHEQUE'],
    },
    paidAt: { type: Date },
    receiptNumber: { type: String },
    transactionId: { type: String },
    offlineNotes: { type: String },
    verifiedByPresidentId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MaintBillSchema.index({ societyId: 1, flatId: 1, billingMonth: 1 }, { unique: true });

export const MaintBill = mongoose.model<IMaintBill>('maint_bill', MaintBillSchema);

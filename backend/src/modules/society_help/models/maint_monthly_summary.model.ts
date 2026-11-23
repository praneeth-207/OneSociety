import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMaintMonthlySummary extends Document {
  societyId: Types.ObjectId;
  billingMonth: string; // 'YYYY-MM'
  openingBalance: number;
  actualCollections: number;
  pendingCollections: number;
  totalExpenses: number;
  closingBalance: number;
  isClosed: boolean;
  closedAt?: Date;
  closedById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaintMonthlySummarySchema = new Schema<IMaintMonthlySummary>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    billingMonth: { type: String, required: true },
    openingBalance: { type: Number, required: true, default: 0 },
    actualCollections: { type: Number, required: true, default: 0 },
    pendingCollections: { type: Number, required: true, default: 0 },
    totalExpenses: { type: Number, required: true, default: 0 },
    closingBalance: { type: Number, required: true, default: 0 },
    isClosed: { type: Boolean, default: false },
    closedAt: { type: Date },
    closedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MaintMonthlySummarySchema.index({ societyId: 1, billingMonth: 1 }, { unique: true });

export const MaintMonthlySummary = mongoose.model<IMaintMonthlySummary>(
  'maint_monthly_summary',
  MaintMonthlySummarySchema
);

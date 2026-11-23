import mongoose, { Document, Schema, Types } from 'mongoose';

export type ExpenseCategory = 'AMC' | 'UTILITIES' | 'STAFF' | 'REPAIR' | 'SECURITY' | 'MISC';

export interface IMaintExpense extends Document {
  societyId: Types.ObjectId;
  billingMonth: string; // 'YYYY-MM'
  title: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: Date;
  receiptUrl?: string;
  vendorName?: string;
  recordedById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaintExpenseSchema = new Schema<IMaintExpense>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    billingMonth: { type: String, required: true, index: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['AMC', 'UTILITIES', 'STAFF', 'REPAIR', 'SECURITY', 'MISC'],
      default: 'MISC',
    },
    amount: { type: Number, required: true },
    expenseDate: { type: Date, required: true, default: Date.now },
    receiptUrl: { type: String },
    vendorName: { type: String },
    recordedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

MaintExpenseSchema.index({ societyId: 1, billingMonth: 1 });

export const MaintExpense = mongoose.model<IMaintExpense>('maint_expense', MaintExpenseSchema);

import mongoose, { Document, Schema, Types } from 'mongoose';

export type RentalStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'CHECKOUT'
  | 'IN_USE'
  | 'RETURNED'
  | 'COMPLETED'
  | 'DISPUTED';

export type ReturnCondition = 'GOOD' | 'MINOR_WEAR' | 'DAMAGED';

export interface ISRRental extends Document {
  rentalId: string; // #SR-1001
  societyId: Types.ObjectId;
  itemId: Types.ObjectId;
  itemTitle: string;
  ownerId: Types.ObjectId;
  ownerName: string;
  ownerFlatNumber: string;
  borrowerId: Types.ObjectId;
  borrowerName: string;
  borrowerFlatNumber: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  rentalDays: number;
  dailyRate: number;
  rentalFee: number;
  securityDeposit: number;
  totalAmount: number;
  escrowHoldId?: string;
  status: RentalStatus;
  handoverToken?: string;
  handoverAt?: Date;
  returnCondition?: ReturnCondition;
  returnNotes?: string;
  returnedAt?: Date;
  disputeReason?: string;
  disputeDeduction?: number;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SRRentalSchema = new Schema<ISRRental>(
  {
    rentalId: { type: String, required: true, unique: true, index: true },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'sr_item', required: true, index: true },
    itemTitle: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerName: { type: String, required: true },
    ownerFlatNumber: { type: String, required: true },
    borrowerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    borrowerName: { type: String, required: true },
    borrowerFlatNumber: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    rentalDays: { type: Number, required: true },
    dailyRate: { type: Number, required: true },
    rentalFee: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    escrowHoldId: { type: String },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'CHECKOUT', 'IN_USE', 'RETURNED', 'COMPLETED', 'DISPUTED'],
      default: 'REQUESTED',
      index: true,
    },
    handoverToken: { type: String },
    handoverAt: { type: Date },
    returnCondition: { type: String, enum: ['GOOD', 'MINOR_WEAR', 'DAMAGED'] },
    returnNotes: { type: String },
    returnedAt: { type: Date },
    disputeReason: { type: String },
    disputeDeduction: { type: Number, default: 0 },
    settledAt: { type: Date },
  },
  { timestamps: true }
);

SRRentalSchema.index({ societyId: 1, borrowerId: 1, createdAt: -1 });
SRRentalSchema.index({ societyId: 1, ownerId: 1, createdAt: -1 });

export const SRRental = mongoose.model<ISRRental>('sr_rental', SRRentalSchema);

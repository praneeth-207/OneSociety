import mongoose, { Document, Schema, Types } from 'mongoose';

export type PassType = 'INDIVIDUAL' | 'GROUP';
export type PassStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

export interface IVisitPass extends Document {
  passToken: string;
  societyId: Types.ObjectId;
  hostResidentId: Types.ObjectId;
  flatId: Types.ObjectId;
  flatNumber: string;
  visitorName: string;
  visitorPhone: string;
  visitorType: 'GUEST' | 'DELIVERY' | 'SERVICE' | 'CAB';
  passType: PassType;
  expectedCount: number;
  admittedCount: number;
  validityHours: number;
  validFrom: Date;
  validUntil: Date;
  status: PassStatus;
  replacedByToken?: string;
  usedAt?: Date;
  verifiedBySecurityId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VisitPassSchema = new Schema<IVisitPass>(
  {
    passToken: { type: String, required: true, unique: true, index: true },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    hostResidentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    flatNumber: { type: String, required: true },
    visitorName: { type: String, required: true },
    visitorPhone: { type: String, required: true },
    visitorType: {
      type: String,
      enum: ['GUEST', 'DELIVERY', 'SERVICE', 'CAB'],
      default: 'GUEST',
    },
    passType: {
      type: String,
      enum: ['INDIVIDUAL', 'GROUP'],
      default: 'INDIVIDUAL',
    },
    expectedCount: { type: Number, default: 1 },
    admittedCount: { type: Number, default: 0 },
    validityHours: { type: Number, enum: [1, 2, 4], default: 2 },
    validFrom: { type: Date, required: true, default: Date.now },
    validUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    replacedByToken: { type: String },
    usedAt: { type: Date },
    verifiedBySecurityId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

VisitPassSchema.index({ societyId: 1, hostResidentId: 1, createdAt: -1 });
VisitPassSchema.index({ societyId: 1, status: 1 });

export const VisitPass = mongoose.model<IVisitPass>('visit_pass', VisitPassSchema);

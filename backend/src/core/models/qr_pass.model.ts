import mongoose, { Document, Schema, Types } from 'mongoose';

export type PassType = 'VISITOR_INDIVIDUAL' | 'VISITOR_GROUP' | 'GATE_DELIVERY' | 'DOOR_DELIVERY';
export type PassStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

export interface IQRPass extends Document {
  token: string;
  passType: PassType;
  societyId: Types.ObjectId;
  flatId?: Types.ObjectId;
  flatNumber?: string;
  generatedBy: Types.ObjectId;
  guestName?: string;
  guestPhone?: string;
  purpose?: string;
  memberCount: number;
  memberDetails?: string;
  orderId?: string;
  checklist?: Array<{ itemName: string; quantity: number }>;
  validFrom: Date;
  expiresAt: Date;
  status: PassStatus;
  usedAt?: Date;
  usedBy?: Types.ObjectId;
  usedByName?: string;
  exitAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const QRPassSchema = new Schema<IQRPass>(
  {
    token: { type: String, required: true, unique: true, index: true },
    passType: {
      type: String,
      enum: ['VISITOR_INDIVIDUAL', 'VISITOR_GROUP', 'GATE_DELIVERY', 'DOOR_DELIVERY'],
      required: true,
      index: true,
    },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat' },
    flatNumber: { type: String },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    guestName: { type: String },
    guestPhone: { type: String },
    purpose: { type: String },
    memberCount: { type: Number, default: 1 },
    memberDetails: { type: String },
    orderId: { type: String },
    checklist: [{ itemName: String, quantity: Number }],
    validFrom: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    usedAt: { type: Date },
    usedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    usedByName: { type: String },
    exitAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const QRPass = mongoose.model<IQRPass>('QRPass', QRPassSchema);

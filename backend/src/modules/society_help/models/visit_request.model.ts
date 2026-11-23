import mongoose, { Document, Schema, Types } from 'mongoose';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'TIMEOUT';

export interface IVisitRequest extends Document {
  societyId: Types.ObjectId;
  flatId: Types.ObjectId;
  flatNumber: string;
  hostResidentId: Types.ObjectId;
  visitorName: string;
  visitorPhone: string;
  purpose: string;
  vehicleNumber?: string;
  status: RequestStatus;
  securityGuardId: Types.ObjectId;
  respondedAt?: Date;
  passToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VisitRequestSchema = new Schema<IVisitRequest>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    flatNumber: { type: String, required: true },
    hostResidentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    visitorName: { type: String, required: true },
    visitorPhone: { type: String, required: true },
    purpose: { type: String, required: true },
    vehicleNumber: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'DENIED', 'TIMEOUT'],
      default: 'PENDING',
      index: true,
    },
    securityGuardId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    respondedAt: { type: Date },
    passToken: { type: String },
  },
  { timestamps: true }
);

VisitRequestSchema.index({ societyId: 1, hostResidentId: 1, status: 1 });

export const VisitRequest = mongoose.model<IVisitRequest>('visit_request', VisitRequestSchema);

import mongoose, { Document, Schema, Types } from 'mongoose';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export type ComplaintPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface IComplaint extends Document {
  complaintId: string; // e.g. #C1024
  societyId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reporterName: string;
  reporterPhone: string;
  reporterFlatNumber: string;
  title: string;
  description: string;
  photos: string[];
  category: string;
  subcategory: string;
  location: {
    block: string;
    commonArea: string;
  };
  priority: ComplaintPriority;
  status: ComplaintStatus;
  scopeFlag: 'IN_SCOPE' | 'OUT_OF_SCOPE';
  isEmergency: boolean;
  workSize?: 'MINOR' | 'MAJOR';
  expenseApproval?: {
    vendorName?: string;
    vendorPhone?: string;
    quotationAmount?: number;
    quotationFileUrl?: string;
    status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    approvedBy?: Types.ObjectId;
    comment?: string;
    updatedAt?: Date;
  };
  assignment?: {
    providerId?: Types.ObjectId;
    providerName?: string;
    providerPhone?: string;
    providerType?: string;
    isExternalVendor: boolean;
    estimatedCost?: number;
    expectedCompletionDate?: Date;
    assignedAt?: Date;
    acceptedAt?: Date;
    declinedAt?: Date;
    declineReason?: string;
  };
  aiAnalysis?: {
    category: string;
    subcategory: string;
    priority: string;
    location: string;
    suggestedProviderType: string;
    confidence: number;
    isEmergency: boolean;
    scopeFlag: string;
    summary: string;
    analyzedAt: Date;
    overrides: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      overriddenBy: Types.ObjectId;
      overriddenAt: Date;
    }>;
  };
  timeline: Array<{
    status: ComplaintStatus;
    actorId?: Types.ObjectId;
    actorName: string;
    actorRole: string;
    note?: string;
    photoUrl?: string;
    timestamp: Date;
  }>;
  duplicateOf?: Types.ObjectId;
  mergedComplaints: Array<{
    complaintId: string;
    reporterId: Types.ObjectId;
    reporterName: string;
    reportedAt: Date;
  }>;
  reopenCount: number;
  reopenReason?: string;
  reopenPhotoUrl?: string;
  rating?: number;
  feedback?: string;
  escalationFlags: {
    overdueAssignmentSent: boolean;
    overdueResolutionSent: boolean;
    emergencyAlertSent: boolean;
    reopenLimitAlertSent: boolean;
  };
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    complaintId: { type: String, required: true, unique: true, index: true },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reporterName: { type: String, required: true },
    reporterPhone: { type: String, required: true },
    reporterFlatNumber: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    photos: { type: [String], default: [] },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, required: true },
    location: {
      block: { type: String, required: true },
      commonArea: { type: String, required: true },
    },
    priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'LOW', index: true },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'SUBMITTED',
      index: true,
    },
    scopeFlag: { type: String, enum: ['IN_SCOPE', 'OUT_OF_SCOPE'], default: 'IN_SCOPE' },
    isEmergency: { type: Boolean, default: false },
    workSize: { type: String, enum: ['MINOR', 'MAJOR'] },
    expenseApproval: {
      vendorName: String,
      vendorPhone: String,
      quotationAmount: Number,
      quotationFileUrl: String,
      status: { type: String, enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] },
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      comment: String,
      updatedAt: Date,
    },
    assignment: {
      providerId: { type: Schema.Types.ObjectId, ref: 'User' },
      providerName: String,
      providerPhone: String,
      providerType: String,
      isExternalVendor: { type: Boolean, default: false },
      estimatedCost: Number,
      expectedCompletionDate: Date,
      assignedAt: Date,
      acceptedAt: Date,
      declinedAt: Date,
      declineReason: String,
    },
    aiAnalysis: {
      category: String,
      subcategory: String,
      priority: String,
      location: String,
      suggestedProviderType: String,
      confidence: Number,
      isEmergency: Boolean,
      scopeFlag: String,
      summary: String,
      analyzedAt: Date,
      overrides: [
        {
          field: String,
          oldValue: Schema.Types.Mixed,
          newValue: Schema.Types.Mixed,
          overriddenBy: { type: Schema.Types.ObjectId, ref: 'User' },
          overriddenAt: Date,
        },
      ],
    },
    timeline: [
      {
        status: { type: String, required: true },
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        actorName: { type: String, required: true },
        actorRole: { type: String, required: true },
        note: String,
        photoUrl: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'complaint_complaints' },
    mergedComplaints: [
      {
        complaintId: String,
        reporterId: { type: Schema.Types.ObjectId, ref: 'User' },
        reporterName: String,
        reportedAt: Date,
      },
    ],
    reopenCount: { type: Number, default: 0 },
    reopenReason: String,
    reopenPhotoUrl: String,
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    escalationFlags: {
      overdueAssignmentSent: { type: Boolean, default: false },
      overdueResolutionSent: { type: Boolean, default: false },
      emergencyAlertSent: { type: Boolean, default: false },
      reopenLimitAlertSent: { type: Boolean, default: false },
    },
    resolvedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

ComplaintSchema.index({ societyId: 1, status: 1, priority: 1, createdAt: -1 });

export const Complaint = mongoose.model<IComplaint>('complaint_complaints', ComplaintSchema);

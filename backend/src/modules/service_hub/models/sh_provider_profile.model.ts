import mongoose, { Document, Schema, Types } from 'mongoose';

export type VerificationStatus = 'PENDING' | 'AI_REVIEWED' | 'APPROVED' | 'REJECTED';

export interface ISHProviderProfile extends Document {
  societyId: Types.ObjectId;
  userId: Types.ObjectId;
  providerName: string;
  phone: string;
  providerType: 'RESIDENT' | 'EXTERNAL';
  skills: string[];
  bio: string;
  ratePerSlot: number;
  verificationStatus: VerificationStatus;
  idProofUrl?: string;
  aiConfidence?: number;
  aiNotes?: string;
  ratingAverage: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

const SHProviderProfileSchema = new Schema<ISHProviderProfile>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerName: { type: String, required: true },
    phone: { type: String, required: true },
    providerType: { type: String, enum: ['RESIDENT', 'EXTERNAL'], default: 'RESIDENT' },
    skills: [{ type: String }],
    bio: { type: String, default: '' },
    ratePerSlot: { type: Number, default: 500 },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'AI_REVIEWED', 'APPROVED', 'REJECTED'],
      default: 'APPROVED', // Residents default approved, external need verification
    },
    idProofUrl: { type: String },
    aiConfidence: { type: Number },
    aiNotes: { type: String },
    ratingAverage: { type: Number, default: 5.0 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SHProviderProfileSchema.index({ societyId: 1, userId: 1 }, { unique: true });
SHProviderProfileSchema.index({ societyId: 1, skills: 1 });

export const SHProviderProfile = mongoose.model<ISHProviderProfile>(
  'sh_provider_profile',
  SHProviderProfileSchema
);

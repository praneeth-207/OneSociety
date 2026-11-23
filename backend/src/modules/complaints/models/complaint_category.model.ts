import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComplaintCategory extends Document {
  societyId: Types.ObjectId;
  name: string;
  subcategories: string[];
  defaultProviderType: string;
  isEmergency: boolean;
  createdAt: Date;
}

const ComplaintCategorySchema = new Schema<IComplaintCategory>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    name: { type: String, required: true },
    subcategories: { type: [String], default: [] },
    defaultProviderType: { type: String, required: true },
    isEmergency: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ComplaintCategorySchema.index({ societyId: 1, name: 1 }, { unique: true });

export const ComplaintCategory = mongoose.model<IComplaintCategory>('complaint_categories', ComplaintCategorySchema);

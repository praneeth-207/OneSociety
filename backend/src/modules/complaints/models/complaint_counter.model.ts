import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComplaintCounter extends Document {
  societyId: Types.ObjectId;
  seq: number;
}

const ComplaintCounterSchema = new Schema<IComplaintCounter>({
  societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, unique: true },
  seq: { type: Number, default: 1000 },
});

export const ComplaintCounter = mongoose.model<IComplaintCounter>('complaint_counters', ComplaintCounterSchema);

export async function getNextComplaintId(societyId: Types.ObjectId | string): Promise<string> {
  const counter = await ComplaintCounter.findOneAndUpdate(
    { societyId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const num = counter.seq < 1000 ? 1000 + counter.seq : counter.seq;
  return `#C${num}`;
}

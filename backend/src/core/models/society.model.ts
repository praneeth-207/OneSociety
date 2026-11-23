import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISociety extends Document {
  name: string;
  code: string;
  address: string;
  city: string;
  blocks: string[];
  commonAreas: string[];
  settings: {
    minorExpenseThreshold: number;
    escalationHoursHigh: number;
    escalationHoursMedium: number;
    escalationHoursLow: number;
    maxReopenLimit: number;
    qrValidityHoursDefault: number;
    groupBuyingIssueWindowHours: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SocietySchema = new Schema<ISociety>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    blocks: { type: [String], default: ['Block A', 'Block B', 'Block C', 'Block D'] },
    commonAreas: {
      type: [String],
      default: [
        'Lift Lobby',
        'Staircase Area',
        'Basement Parking',
        'Ground Floor Entrance',
        'Terrace / Roof',
        'Clubhouse',
        'Swimming Pool Area',
        'Garden / Children Park',
        'Security Gate',
        'Pump Room / Water Tank',
        'Electrical Meter Room',
      ],
    },
    settings: {
      minorExpenseThreshold: { type: Number, default: 5000 },
      escalationHoursHigh: { type: Number, default: 4 },
      escalationHoursMedium: { type: Number, default: 24 },
      escalationHoursLow: { type: Number, default: 72 },
      maxReopenLimit: { type: Number, default: 2 },
      qrValidityHoursDefault: { type: Number, default: 2 },
      groupBuyingIssueWindowHours: { type: Number, default: 24 },
    },
  },
  { timestamps: true }
);

export const Society = mongoose.model<ISociety>('Society', SocietySchema);

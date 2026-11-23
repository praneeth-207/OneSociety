import mongoose, { Document, Schema, Types } from 'mongoose';
import { ALL_ROLES, Roles, UserRole } from '../rbac/roles.js';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  societyId: Types.ObjectId;
  flatId?: Types.ObjectId;
  flatNumber?: string;
  mustChangePassword: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  avatarUrl?: string;
  temporaryPasswordPlain?: string; // Stored only until first login if created by President
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ALL_ROLES, default: Roles.RESIDENT },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat' },
    flatNumber: { type: String },
    mustChangePassword: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'PENDING'], default: 'ACTIVE' },
    avatarUrl: { type: String },
    temporaryPasswordPlain: { type: String },
  },
  { timestamps: true }
);

UserSchema.index({ societyId: 1, email: 1 }, { unique: true });
UserSchema.index({ societyId: 1, role: 1 });
UserSchema.index({ phone: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType = 'INFO' | 'ALERT' | 'ACTION_REQUIRED' | 'SUCCESS';
export type NotificationModule = 'COMPLAINTS' | 'SOCIETY_HELP' | 'SERVICE_HUB' | 'SHARE_RENT' | 'GROUP_BUYING' | 'GENERAL';

export interface INotification extends Document {
  societyId: Types.ObjectId;
  recipientId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  module: NotificationModule;
  linkModule?: string;
  linkId?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['INFO', 'ALERT', 'ACTION_REQUIRED', 'SUCCESS'], default: 'INFO' },
    module: {
      type: String,
      enum: ['COMPLAINTS', 'SOCIETY_HELP', 'SERVICE_HUB', 'SHARE_RENT', 'GROUP_BUYING', 'GENERAL'],
      default: 'GENERAL',
    },
    linkModule: { type: String },
    linkId: { type: String },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

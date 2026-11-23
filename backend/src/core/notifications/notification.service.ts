import { Notification, INotification, NotificationType, NotificationModule } from '../models/notification.model.js';
import { socketService } from '../socket/socket.service.js';
import { Types } from 'mongoose';

export interface SendNotificationParams {
  societyId: string | Types.ObjectId;
  recipientId: string | Types.ObjectId;
  title: string;
  message: string;
  type?: NotificationType;
  module?: NotificationModule;
  linkModule?: string;
  linkId?: string;
}

export interface INotificationAdapter {
  sendSMS?(phone: string, message: string): Promise<void>;
  sendWhatsApp?(phone: string, message: string): Promise<void>;
}

export class PluggableNotificationAdapter implements INotificationAdapter {
  // Off by default with no hardcoded provider as per specification
  public async sendSMS(phone: string, message: string): Promise<void> {
    // Adapter hook
  }
  public async sendWhatsApp(phone: string, message: string): Promise<void> {
    // Adapter hook
  }
}

export class NotificationService {
  private adapter: INotificationAdapter;

  constructor(adapter?: INotificationAdapter) {
    this.adapter = adapter || new PluggableNotificationAdapter();
  }

  public async send(params: SendNotificationParams): Promise<INotification> {
    const notification = new Notification({
      societyId: params.societyId,
      recipientId: params.recipientId,
      title: params.title,
      message: params.message,
      type: params.type || 'INFO',
      module: params.module || 'GENERAL',
      linkModule: params.linkModule,
      linkId: params.linkId,
    });

    await notification.save();

    // Real-time broadcast to user socket
    socketService.emitToUser(params.recipientId.toString(), 'new_notification', notification);

    return notification;
  }
}

export const notificationService = new NotificationService();

import { Router } from 'express';
import { Notification } from '../models/notification.model.js';
import { authenticate } from '../auth/auth.middleware.js';

export const notificationRouter = Router();

notificationRouter.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const notifications = await Notification.find({
      societyId: req.user.societyId,
      recipientId: req.user.userId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      societyId: req.user.societyId,
      recipientId: req.user.userId,
      isRead: false,
    });

    res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

notificationRouter.patch('/:id/read', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notif) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.status(200).json({ success: true, notification: notif });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

notificationRouter.post('/read-all', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    await Notification.updateMany(
      { recipientId: req.user.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

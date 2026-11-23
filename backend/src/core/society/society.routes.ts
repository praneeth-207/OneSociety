import { Router } from 'express';
import { Society } from '../models/society.model.js';
import { Flat } from '../models/flat.model.js';
import { User } from '../models/user.model.js';
import { AuditLog } from '../models/audit_log.model.js';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import { Roles } from '../rbac/roles.js';

export const societyRouter = Router();

societyRouter.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const society = await Society.findById(req.user.societyId);
    if (!society) {
      res.status(404).json({ success: false, message: 'Society not found' });
      return;
    }

    res.status(200).json({ success: true, society });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

societyRouter.get('/flats', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const flats = await Flat.find({ societyId: req.user.societyId }).populate('residentId', 'name email phone');
    res.status(200).json({ success: true, flats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

societyRouter.get('/members', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const query: any = { societyId: req.user.societyId };
    // If not president, can only query approved providers or basic contacts
    if (req.user.role !== Roles.PRESIDENT) {
      if (req.query.role) {
        query.role = req.query.role;
      }
    }

    const users = await User.find(query).select('-passwordHash -temporaryPasswordPlain');
    res.status(200).json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

societyRouter.get('/audit-logs', authenticate, requireRole([Roles.PRESIDENT]), async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const logs = await AuditLog.find({ societyId: req.user.societyId }).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

import { Router } from 'express';
import { Payment, LedgerEntry } from '../models/payment.model.js';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import { Roles } from '../rbac/roles.js';
import { paymentGateway } from './payment.service.js';

export const paymentRouter = Router();

paymentRouter.get('/my-payments', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const payments = await Payment.find({
      societyId: req.user.societyId,
      $or: [{ payerId: req.user.userId }, { recipientId: req.user.userId }],
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, payments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

paymentRouter.get('/ledger', authenticate, requireRole([Roles.PRESIDENT]), async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const entries = await LedgerEntry.find({ societyId: req.user.societyId })
      .populate('paymentId')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({ success: true, entries });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

paymentRouter.post('/simulate-charge', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { amount, module, entityId, idempotencyKey, notes } = req.body;
    if (!amount || !module || !entityId || !idempotencyKey) {
      res.status(400).json({ success: false, message: 'amount, module, entityId and idempotencyKey are required' });
      return;
    }

    const payment = await paymentGateway.executeDirectPayment({
      societyId: req.user.societyId,
      payerId: req.user.userId,
      module,
      entityId,
      amount,
      idempotencyKey,
      notes,
    });

    res.status(201).json({ success: true, payment, simulatedLabel: 'SIMULATED' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

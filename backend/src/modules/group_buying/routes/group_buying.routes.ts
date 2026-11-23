import { Router } from 'express';
import { verifyAuth, requireRole } from '../../../core/auth/auth.middleware.js';
import { Roles } from '../../../core/rbac/roles.js';
import { groupBuyingController } from '../controllers/group_buying.controller.js';

export const groupBuyingRouter = Router();

// Apply auth to all routes
groupBuyingRouter.use(verifyAuth);

// Get all active deals in society
groupBuyingRouter.get('/deals', (req, res) => groupBuyingController.getDeals(req, res));

// Supplier creates deal with tiered pricing
groupBuyingRouter.post(
  '/deals',
  requireRole(Roles.SUPPLIER, Roles.PRESIDENT),
  (req, res) => groupBuyingController.createDeal(req, res)
);

// Resident joins deal (pledges quantity into simulated escrow hold)
groupBuyingRouter.post(
  '/deals/:id/join',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => groupBuyingController.joinDeal(req, res)
);

// Supplier generates gate delivery manifest QR
groupBuyingRouter.post(
  '/deals/:id/manifest',
  requireRole(Roles.SUPPLIER, Roles.PRESIDENT),
  (req, res) => groupBuyingController.generateManifest(req, res)
);

// Security Guard verifies delivery manifest QR at gate
groupBuyingRouter.post(
  '/manifest/verify',
  requireRole(Roles.SECURITY_PERSONNEL, Roles.PRESIDENT),
  (req, res) => groupBuyingController.verifyManifestAtGate(req, res)
);

// Resident or delivery partner confirms door delivery
groupBuyingRouter.post(
  '/orders/:id/confirm-delivery',
  requireRole(Roles.RESIDENT, Roles.DELIVERY_PARTNER, Roles.PRESIDENT),
  (req, res) => groupBuyingController.confirmDelivery(req, res)
);

// Settle deal (release supplier revenue & refund price drops)
groupBuyingRouter.post(
  '/deals/:id/settle',
  requireRole(Roles.SUPPLIER, Roles.PRESIDENT),
  (req, res) => groupBuyingController.settleDeal(req, res)
);

// Get resident's orders
groupBuyingRouter.get('/orders', (req, res) =>
  groupBuyingController.getMyOrders(req, res)
);

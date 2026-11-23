import { Router } from 'express';
import { verifyAuth, requireRole } from '../../../core/auth/auth.middleware.js';
import { Roles } from '../../../core/rbac/roles.js';
import { societyHelpController } from '../controllers/society_help.controller.js';

export const societyHelpRouter = Router();

// Apply authentication to all routes
societyHelpRouter.use(verifyAuth);

// ==================== VISITOR ROUTES ====================

// Resident generates a pre-planned QR pass (1, 2, 4h validity)
societyHelpRouter.post(
  '/visitors/passes',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => societyHelpController.createPass(req, res)
);

// Resident renews a pass (invalidates old pass)
societyHelpRouter.post(
  '/visitors/passes/:id/renew',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => societyHelpController.renewPass(req, res)
);

// Resident fetches their created passes
societyHelpRouter.get(
  '/visitors/passes',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => societyHelpController.getResidentPasses(req, res)
);

// Security Guard verifies and admits visitor via QR scan / token entry
societyHelpRouter.post(
  '/visitors/verify',
  requireRole(Roles.SECURITY_PERSONNEL, Roles.PRESIDENT),
  (req, res) => societyHelpController.verifyPass(req, res)
);

// Security Guard creates unexpected visitor arrival request
societyHelpRouter.post(
  '/visitors/unexpected',
  requireRole(Roles.SECURITY_PERSONNEL, Roles.PRESIDENT),
  (req, res) => societyHelpController.createUnexpectedRequest(req, res)
);

// Resident responds to unexpected visitor request (APPROVE or DENY)
societyHelpRouter.post(
  '/visitors/unexpected/:id/respond',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => societyHelpController.respondToRequest(req, res)
);

// Security Guard logs & active requests dashboard
societyHelpRouter.get(
  '/visitors/gate-logs',
  requireRole(Roles.SECURITY_PERSONNEL, Roles.PRESIDENT),
  (req, res) => societyHelpController.getGateLogs(req, res)
);

// ==================== MAINTENANCE & FINANCE ROUTES ====================
// (Security Personnel strictly excluded)

// Maintenance overview (Resident sees own flat; President sees whole society)
societyHelpRouter.get(
  '/maintenance/overview',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => societyHelpController.getOverview(req, res)
);

// Resident pays maintenance bill via simulated gateway
societyHelpRouter.post(
  '/maintenance/bills/:id/pay',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => societyHelpController.payBillSimulated(req, res)
);

// President generates monthly maintenance bills for all flats
societyHelpRouter.post(
  '/maintenance/bills/generate',
  requireRole(Roles.PRESIDENT),
  (req, res) => societyHelpController.generateBills(req, res)
);

// President records offline cash/cheque payment
societyHelpRouter.post(
  '/maintenance/bills/:id/offline-payment',
  requireRole(Roles.PRESIDENT),
  (req, res) => societyHelpController.recordOfflinePayment(req, res)
);

// President records society expenses
societyHelpRouter.post(
  '/maintenance/expenses',
  requireRole(Roles.PRESIDENT),
  (req, res) => societyHelpController.recordExpense(req, res)
);

// President runs monthly carry-forward math and closes month
societyHelpRouter.post(
  '/maintenance/summary/:month/close',
  requireRole(Roles.PRESIDENT),
  (req, res) => societyHelpController.closeOrSummarizeMonth(req, res)
);

import { Router } from 'express';
import { verifyAuth, requireRole } from '../../../core/auth/auth.middleware.js';
import { Roles } from '../../../core/rbac/roles.js';
import { shareRentController } from '../controllers/share_rent.controller.js';

export const shareRentRouter = Router();

// Apply auth to all routes
shareRentRouter.use(verifyAuth);

// Get available items in society
shareRentRouter.get('/items', (req, res) => shareRentController.getItems(req, res));

// Resident lists an item for rent
shareRentRouter.post(
  '/items',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => shareRentController.createItem(req, res)
);

// Borrower requests rental
shareRentRouter.post(
  '/rentals',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => shareRentController.requestRental(req, res)
);

// Owner approves rental request
shareRentRouter.post(
  '/rentals/:id/approve',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => shareRentController.approveRental(req, res)
);

// Borrower checks out & pays into simulated escrow hold
shareRentRouter.post(
  '/rentals/:id/checkout',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => shareRentController.checkoutRental(req, res)
);

// Owner confirms handover at item pickup
shareRentRouter.post(
  '/rentals/:id/handover',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => shareRentController.confirmHandover(req, res)
);

// Owner inspects returned item
shareRentRouter.post(
  '/rentals/:id/return',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => shareRentController.returnInspection(req, res)
);

// President resolves dispute & settles escrow deduction
shareRentRouter.post(
  '/rentals/:id/resolve-dispute',
  requireRole(Roles.PRESIDENT),
  (req, res) => shareRentController.resolveDispute(req, res)
);

// Get user's rentals (as borrower and owner)
shareRentRouter.get('/rentals', (req, res) =>
  shareRentController.getMyRentals(req, res)
);

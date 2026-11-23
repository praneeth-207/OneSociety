import { Router } from 'express';
import { verifyAuth, requireRole } from '../../../core/auth/auth.middleware.js';
import { Roles } from '../../../core/rbac/roles.js';
import { serviceHubController } from '../controllers/service_hub.controller.js';

export const serviceHubRouter = Router();

// Apply auth to all routes
serviceHubRouter.use(verifyAuth);

// Get available providers by category
serviceHubRouter.get('/providers', (req, res) => serviceHubController.getProviders(req, res));

// Upsert provider profile (Residents can offer services; External providers register skills)
serviceHubRouter.post(
  '/profile',
  requireRole(Roles.RESIDENT, Roles.SERVICE_PROVIDER, Roles.PRESIDENT),
  (req, res) => serviceHubController.upsertProfile(req, res)
);

// Get available slots for provider on date
serviceHubRouter.get('/providers/:providerId/slots', (req, res) =>
  serviceHubController.getSlots(req, res)
);

// Resident books a slot (creates simulated escrow hold)
serviceHubRouter.post(
  '/bookings',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => serviceHubController.bookSlot(req, res)
);

// Provider updates status (ACCEPTED, IN_PROGRESS, COMPLETED)
serviceHubRouter.patch(
  '/bookings/:id/status',
  requireRole(Roles.SERVICE_PROVIDER, Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => serviceHubController.updateStatus(req, res)
);

// Resident settles completed service and rates provider
serviceHubRouter.post(
  '/bookings/:id/settle',
  requireRole(Roles.RESIDENT, Roles.PRESIDENT),
  (req, res) => serviceHubController.settle(req, res)
);

// Get bookings (Resident gets their bookings, Provider gets their tasks)
serviceHubRouter.get('/bookings', (req, res) =>
  serviceHubController.getMyBookings(req, res)
);

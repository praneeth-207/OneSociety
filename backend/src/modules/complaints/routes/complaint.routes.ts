import { Router } from 'express';
import { complaintController } from '../controllers/complaint.controller.js';
import { authenticate, requireRole, enforceSocietyIsolation } from '../../../core/auth/auth.middleware.js';
import { Roles } from '../../../core/rbac/roles.js';

export const complaintRouter = Router();

// Category configuration
complaintRouter.get('/categories', authenticate, (req, res) => complaintController.getCategories(req, res));

// Analytics (President only)
complaintRouter.get('/analytics', authenticate, requireRole([Roles.PRESIDENT]), (req, res) =>
  complaintController.getAnalytics(req, res)
);

// List & Create
complaintRouter.get('/', authenticate, (req, res) => complaintController.list(req, res));
complaintRouter.post('/', authenticate, requireRole([Roles.RESIDENT, Roles.PRESIDENT]), (req, res) =>
  complaintController.create(req, res)
);

// Detail
complaintRouter.get('/:id', authenticate, (req, res) => complaintController.getById(req, res));

// President actions
complaintRouter.patch('/:id/review', authenticate, requireRole([Roles.PRESIDENT]), (req, res) =>
  complaintController.review(req, res)
);
complaintRouter.post('/:id/expense-quote', authenticate, requireRole([Roles.PRESIDENT]), (req, res) =>
  complaintController.submitExpense(req, res)
);
complaintRouter.patch('/:id/assign', authenticate, requireRole([Roles.PRESIDENT]), (req, res) =>
  complaintController.assign(req, res)
);

// Provider actions
complaintRouter.patch('/:id/provider-respond', authenticate, requireRole([Roles.SERVICE_PROVIDER]), (req, res) =>
  complaintController.providerRespond(req, res)
);
complaintRouter.patch('/:id/provider-resolve', authenticate, requireRole([Roles.SERVICE_PROVIDER]), (req, res) =>
  complaintController.providerResolve(req, res)
);

// Resident verification
complaintRouter.patch('/:id/verify', authenticate, requireRole([Roles.RESIDENT]), (req, res) =>
  complaintController.residentVerify(req, res)
);

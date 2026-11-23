import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate, requireRole } from './auth.middleware.js';
import { Roles } from '../rbac/roles.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => authController.login(req, res));
authRouter.post('/refresh', (req, res) => authController.refreshToken(req, res));
authRouter.post('/change-password', authenticate, (req, res) => authController.changePassword(req, res));
authRouter.get('/me', authenticate, (req, res) => authController.getMe(req, res));
authRouter.post('/create-user', authenticate, requireRole([Roles.PRESIDENT]), (req, res) =>
  authController.createUserByPresident(req, res)
);

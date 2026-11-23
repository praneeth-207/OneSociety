import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authRouter } from './core/auth/auth.routes.js';
import { societyRouter } from './core/society/society.routes.js';
import { notificationRouter } from './core/notifications/notification.routes.js';
import { paymentRouter } from './core/payments/payment.routes.js';
import { fileRouter } from './core/storage/file.routes.js';
import { complaintRouter } from './modules/complaints/routes/complaint.routes.js';
import { societyHelpRouter } from './modules/society_help/routes/society_help.routes.js';
import { serviceHubRouter } from './modules/service_hub/routes/service_hub.routes.js';
import { shareRentRouter } from './modules/share_rent/routes/share_rent.routes.js';
import { groupBuyingRouter } from './modules/group_buying/routes/group_buying.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Health check
  app.get('/api/v1/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'OK',
      project: 'OneSociety',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Core Phase 0 Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/society', societyRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use('/api/v1/files', fileRouter);

  // Module 4: Smart Complaint Handling
  app.use('/api/v1/complaints', complaintRouter);

  // Module 5: Society Help (Visitor Management & Maintenance)
  app.use('/api/v1/society-help', societyHelpRouter);

  // Module 3: Service Hub
  app.use('/api/v1/service-hub', serviceHubRouter);

  // Module 2: Share & Rent
  app.use('/api/v1/share-rent', shareRentRouter);

  // Module 1: Group Buying
  app.use('/api/v1/group-buying', groupBuyingRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  });

  return app;
}

import { Request, Response } from 'express';
import { z } from 'zod';
import { visitorService } from '../services/visitor.service.js';
import { maintenanceService } from '../services/maintenance.service.js';

export const createPassSchema = z.object({
  visitorName: z.string().min(2),
  visitorPhone: z.string().min(10),
  visitorType: z.enum(['GUEST', 'DELIVERY', 'SERVICE', 'CAB']),
  passType: z.enum(['INDIVIDUAL', 'GROUP']),
  expectedCount: z.number().int().positive().optional(),
  validityHours: z.union([z.literal(1), z.literal(2), z.literal(4)]),
});

export const verifyPassSchema = z.object({
  token: z.string().min(3),
});

export const unexpectedRequestSchema = z.object({
  flatNumber: z.string().min(1),
  visitorName: z.string().min(2),
  visitorPhone: z.string().min(10),
  purpose: z.string().min(2),
  vehicleNumber: z.string().optional(),
});

export const generateBillsSchema = z.object({
  billingMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
  amount: z.number().positive(),
  dueDate: z.string(),
});

export const offlinePaymentSchema = z.object({
  method: z.enum(['OFFLINE_CASH', 'OFFLINE_CHEQUE']),
  notes: z.string().optional(),
});

export const recordExpenseSchema = z.object({
  billingMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
  title: z.string().min(2),
  category: z.enum(['AMC', 'UTILITIES', 'STAFF', 'REPAIR', 'SECURITY', 'MISC']),
  amount: z.number().positive(),
  vendorName: z.string().optional(),
  receiptUrl: z.string().optional(),
});

export class SocietyHelpController {
  // ==================== VISITOR ENDPOINTS ====================

  /**
   * Resident generates a pre-planned QR pass
   */
  public async createPass(req: Request, res: Response): Promise<void> {
    try {
      const data = createPassSchema.parse(req.body);
      const pass = await visitorService.createPrePlannedPass({
        ...data,
        societyId: req.user!.societyId,
        hostResidentId: req.user!.userId,
      });
      res.status(201).json({ success: true, pass });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Resident renews pass (invalidates old pass)
   */
  public async renewPass(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validityHours = req.body.validityHours ? parseInt(req.body.validityHours, 10) : 2;
      const pass = await visitorService.renewPass(id, req.user!.userId, validityHours as 1 | 2 | 4);
      res.status(200).json({ success: true, pass });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Resident fetches their own passes
   */
  public async getResidentPasses(req: Request, res: Response): Promise<void> {
    try {
      const passes = await visitorService.getResidentPasses(req.user!.societyId, req.user!.userId);
      res.status(200).json({ success: true, passes });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Security Guard verifies and admits visitor via QR scan or token entry
   */
  public async verifyPass(req: Request, res: Response): Promise<void> {
    try {
      const { token } = verifyPassSchema.parse(req.body);
      const result = await visitorService.verifyAndAdmitPass(
        req.user!.societyId,
        token,
        req.user!.userId
      );
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Security Guard submits unexpected visitor request
   */
  public async createUnexpectedRequest(req: Request, res: Response): Promise<void> {
    try {
      const data = unexpectedRequestSchema.parse(req.body);
      const request = await visitorService.createUnexpectedRequest({
        ...data,
        societyId: req.user!.societyId,
        securityGuardId: req.user!.userId,
      });
      res.status(201).json({ success: true, request });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Resident approves or denies unexpected visitor
   */
  public async respondToRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action } = req.body;
      if (action !== 'APPROVE' && action !== 'DENY') {
        res.status(400).json({ success: false, message: 'Action must be APPROVE or DENY' });
        return;
      }
      const request = await visitorService.respondToUnexpectedRequest(id, req.user!.userId, action);
      res.status(200).json({ success: true, request });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Security gate logs
   */
  public async getGateLogs(req: Request, res: Response): Promise<void> {
    try {
      const logs = await visitorService.getSecurityGateLogs(req.user!.societyId);
      res.status(200).json({ success: true, ...logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== MAINTENANCE ENDPOINTS ====================

  /**
   * President generates monthly bills
   */
  public async generateBills(req: Request, res: Response): Promise<void> {
    try {
      const data = generateBillsSchema.parse(req.body);
      const result = await maintenanceService.generateMonthlyBills(
        req.user!.societyId,
        data.billingMonth,
        data.amount,
        new Date(data.dueDate)
      );
      res.status(201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Resident pays bill via Simulated Payment Gateway
   */
  public async payBillSimulated(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await maintenanceService.payBillSimulated(
        req.user!.societyId,
        id,
        req.user!.userId
      );
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * President records offline cash/cheque payment
   */
  public async recordOfflinePayment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = offlinePaymentSchema.parse(req.body);
      const bill = await maintenanceService.recordOfflinePayment(
        req.user!.societyId,
        id,
        req.user!.userId,
        data.method,
        data.notes
      );
      res.status(200).json({ success: true, bill });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * President records society expense
   */
  public async recordExpense(req: Request, res: Response): Promise<void> {
    try {
      const data = recordExpenseSchema.parse(req.body);
      const expense = await maintenanceService.recordExpense(
        req.user!.societyId,
        req.user!.userId,
        data.title,
        data.category,
        data.amount,
        data.billingMonth,
        data.vendorName,
        data.receiptUrl
      );
      res.status(201).json({ success: true, expense });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * President runs carry-forward math and balance summary
   */
  public async closeOrSummarizeMonth(req: Request, res: Response): Promise<void> {
    try {
      const { month } = req.params;
      const close = req.query.close === 'true';
      const summary = await maintenanceService.calculateAndCloseMonth(
        req.user!.societyId,
        month,
        req.user!.userId,
        close
      );
      res.status(200).json({ success: true, summary });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Overview for Resident or President
   */
  public async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      const residentOnly = req.user!.role === 'Resident';
      const data = await maintenanceService.getMaintenanceOverview(
        req.user!.societyId,
        month,
        residentOnly ? req.user!.userId : undefined
      );
      res.status(200).json({ success: true, ...data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const societyHelpController = new SocietyHelpController();

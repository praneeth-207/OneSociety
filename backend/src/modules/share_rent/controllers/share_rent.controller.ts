import { Request, Response } from 'express';
import { z } from 'zod';
import { shareRentService } from '../services/share_rent.service.js';

export const createItemSchema = z.object({
  title: z.string().min(2),
  category: z.enum(['TOOLS', 'APPLIANCES', 'GAMES_BOOKS', 'CAMPING', 'ELECTRONICS', 'BABY_GEAR', 'OTHER']),
  description: z.string().optional(),
  dailyRate: z.number().positive(),
  securityDeposit: z.number().positive(),
  photos: z.array(z.string()).optional(),
});

export const requestRentalSchema = z.object({
  itemId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
});

export const handoverSchema = z.object({
  token: z.string().min(3),
});

export const returnInspectionSchema = z.object({
  condition: z.enum(['GOOD', 'MINOR_WEAR', 'DAMAGED']),
  notes: z.string().optional(),
  disputeReason: z.string().optional(),
});

export const disputeSchema = z.object({
  deductionAmount: z.number().min(0),
});

export class ShareRentController {
  public async getItems(req: Request, res: Response): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const items = await shareRentService.getItems(req.user!.societyId, category);
      res.status(200).json({ success: true, items });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public async createItem(req: Request, res: Response): Promise<void> {
    try {
      const data = createItemSchema.parse(req.body);
      const item = await shareRentService.createItem(
        req.user!.societyId,
        req.user!.userId,
        data.title,
        data.category,
        data.description || '',
        data.dailyRate,
        data.securityDeposit,
        data.photos || []
      );
      res.status(201).json({ success: true, item });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async requestRental(req: Request, res: Response): Promise<void> {
    try {
      const data = requestRentalSchema.parse(req.body);
      const rental = await shareRentService.requestRental(
        req.user!.societyId,
        req.user!.userId,
        data.itemId,
        data.startDate,
        data.endDate
      );
      res.status(201).json({ success: true, rental });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async approveRental(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rental = await shareRentService.approveRental(req.user!.societyId, id, req.user!.userId);
      res.status(200).json({ success: true, rental });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async checkoutRental(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rental = await shareRentService.checkoutRental(req.user!.societyId, id, req.user!.userId);
      res.status(200).json({ success: true, rental });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async confirmHandover(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { token } = handoverSchema.parse(req.body);
      const rental = await shareRentService.confirmHandover(req.user!.societyId, id, req.user!.userId, token);
      res.status(200).json({ success: true, rental });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async returnInspection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = returnInspectionSchema.parse(req.body);
      const rental = await shareRentService.returnInspection(
        req.user!.societyId,
        id,
        req.user!.userId,
        data.condition,
        data.notes,
        data.disputeReason
      );
      res.status(200).json({ success: true, rental });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async resolveDispute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = disputeSchema.parse(req.body);
      const rental = await shareRentService.resolveDispute(req.user!.societyId, id, data.deductionAmount);
      res.status(200).json({ success: true, rental });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async getMyRentals(req: Request, res: Response): Promise<void> {
    try {
      const rentals = await shareRentService.getMyRentals(req.user!.societyId, req.user!.userId);
      res.status(200).json({ success: true, ...rentals });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const shareRentController = new ShareRentController();

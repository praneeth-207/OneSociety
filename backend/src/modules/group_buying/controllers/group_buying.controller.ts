import { Request, Response } from 'express';
import { z } from 'zod';
import { groupBuyingService } from '../services/group_buying.service.js';

export const createDealSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional(),
  unit: z.string().default('Box'),
  tiers: z.array(
    z.object({
      minQty: z.number().int().positive(),
      maxQty: z.number().int().positive().optional(),
      pricePerUnit: z.number().positive(),
    })
  ).min(1),
  minTargetQty: z.number().int().positive(),
  deadline: z.string(),
  deliveryDate: z.string(),
});

export const joinDealSchema = z.object({
  quantity: z.number().int().positive(),
});

export const verifyManifestSchema = z.object({
  manifestToken: z.string().min(3),
});

export const confirmDeliverySchema = z.object({
  token: z.string().min(3),
});

export class GroupBuyingController {
  public async getDeals(req: Request, res: Response): Promise<void> {
    try {
      const deals = await groupBuyingService.getDeals(req.user!.societyId);
      res.status(200).json({ success: true, deals });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public async createDeal(req: Request, res: Response): Promise<void> {
    try {
      const data = createDealSchema.parse(req.body);
      const deal = await groupBuyingService.createDeal(
        req.user!.societyId,
        req.user!.userId,
        data.title,
        data.category,
        data.description || '',
        data.unit,
        data.tiers,
        data.minTargetQty,
        new Date(data.deadline),
        new Date(data.deliveryDate)
      );
      res.status(201).json({ success: true, deal });
    } catch (err: any) {
      console.error('CREATE DEAL ERROR:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async joinDeal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { quantity } = joinDealSchema.parse(req.body);
      const order = await groupBuyingService.joinDeal(
        req.user!.societyId,
        req.user!.userId,
        id,
        quantity
      );
      res.status(201).json({ success: true, order });
    } catch (err: any) {
      console.error('CREATE DEAL ERROR:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async generateManifest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deal = await groupBuyingService.generateManifest(req.user!.societyId, id, req.user!.userId);
      res.status(200).json({ success: true, deal });
    } catch (err: any) {
      console.error('CREATE DEAL ERROR:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async verifyManifestAtGate(req: Request, res: Response): Promise<void> {
    try {
      const { manifestToken } = verifyManifestSchema.parse(req.body);
      const deal = await groupBuyingService.verifyManifestAtGate(req.user!.societyId, manifestToken);
      res.status(200).json({ success: true, deal });
    } catch (err: any) {
      console.error('CREATE DEAL ERROR:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async confirmDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { token } = confirmDeliverySchema.parse(req.body);
      const order = await groupBuyingService.confirmDoorDelivery(req.user!.societyId, id, token);
      res.status(200).json({ success: true, order });
    } catch (err: any) {
      console.error('CREATE DEAL ERROR:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async settleDeal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await groupBuyingService.settleDeal(req.user!.societyId, id);
      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      console.error('CREATE DEAL ERROR:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async getMyOrders(req: Request, res: Response): Promise<void> {
    try {
      const orders = await groupBuyingService.getMyOrders(req.user!.societyId, req.user!.userId);
      res.status(200).json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const groupBuyingController = new GroupBuyingController();

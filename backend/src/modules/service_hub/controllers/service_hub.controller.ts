import { Request, Response } from 'express';
import { z } from 'zod';
import { serviceHubService } from '../services/service_hub.service.js';

export const upsertProfileSchema = z.object({
  skills: z.array(z.string()).min(1),
  bio: z.string().optional(),
  ratePerSlot: z.number().positive(),
  providerType: z.enum(['RESIDENT', 'EXTERNAL']),
  idProofUrl: z.string().optional(),
});

export const bookSlotSchema = z.object({
  slotId: z.string().min(1),
  description: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'IN_PROGRESS', 'COMPLETED']),
});

export const settleSchema = z.object({
  rating: z.number().min(1).max(5),
  reviewText: z.string().optional(),
});

export class ServiceHubController {
  public async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const providers = await serviceHubService.getProviders(req.user!.societyId, category);
      res.status(200).json({ success: true, providers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public async upsertProfile(req: Request, res: Response): Promise<void> {
    try {
      const data = upsertProfileSchema.parse(req.body);
      const profile = await serviceHubService.upsertProfile(
        req.user!.societyId,
        req.user!.userId,
        data.skills,
        data.bio || '',
        data.ratePerSlot,
        data.providerType,
        data.idProofUrl
      );
      res.status(200).json({ success: true, profile });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async getSlots(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const category = (req.query.category as string) || 'HOUSEMAID';

      // Ensure slots exist for date
      await serviceHubService.generateSlotsForDate(req.user!.societyId, providerId, date, category);
      const slots = await serviceHubService.getAvailableSlots(req.user!.societyId, providerId, date);
      res.status(200).json({ success: true, slots });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async bookSlot(req: Request, res: Response): Promise<void> {
    try {
      const data = bookSlotSchema.parse(req.body);
      const booking = await serviceHubService.bookSlot(
        req.user!.societyId,
        req.user!.userId,
        data.slotId,
        data.description || 'Standard Service Appointment'
      );
      res.status(201).json({ success: true, booking });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateStatusSchema.parse(req.body);
      const booking = await serviceHubService.updateBookingStatus(
        req.user!.societyId,
        id,
        req.user!.userId,
        data.status
      );
      res.status(200).json({ success: true, booking });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async settle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = settleSchema.parse(req.body);
      const booking = await serviceHubService.settleAndRate(
        req.user!.societyId,
        id,
        req.user!.userId,
        data.rating,
        data.reviewText
      );
      res.status(200).json({ success: true, booking });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async getMyBookings(req: Request, res: Response): Promise<void> {
    try {
      const isProvider = req.user!.role === 'Service Provider';
      const bookings = await serviceHubService.getBookings(
        req.user!.societyId,
        req.user!.userId,
        isProvider
      );
      res.status(200).json({ success: true, bookings });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const serviceHubController = new ServiceHubController();

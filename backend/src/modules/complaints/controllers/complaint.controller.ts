import { Request, Response } from 'express';
import { z } from 'zod';
import { Complaint } from '../models/complaint.model.js';
import { ComplaintCategory } from '../models/complaint_category.model.js';
import { complaintService } from '../services/complaint.service.js';
import { Roles } from '../../../core/rbac/roles.js';

export const createComplaintSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  photos: z.array(z.string()).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  block: z.string(),
  commonArea: z.string(),
});

export class ComplaintController {
  public async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const data = createComplaintSchema.parse(req.body);

      const complaint = await complaintService.createComplaint({
        societyId: req.user.societyId,
        reporterId: req.user.userId,
        reporterName: req.body.reporterName || 'Resident',
        reporterPhone: req.body.reporterPhone || '9876543210',
        reporterFlatNumber: req.user.flatNumber || 'Common',
        title: data.title,
        description: data.description,
        photos: data.photos,
        category: data.category,
        subcategory: data.subcategory,
        block: data.block,
        commonArea: data.commonArea,
      });

      res.status(201).json({
        success: true,
        message: `Complaint registered with ID ${complaint.complaintId}. AI triage in progress.`,
        complaint,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async list(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const query: any = { societyId: req.user.societyId };

      // Role isolation:
      // - Service Provider sees only their assigned tasks
      // - Resident sees their complaints (or can view public society complaints with ?all=true)
      // - President sees all complaints
      if (req.user.role === Roles.SERVICE_PROVIDER) {
        query['assignment.providerId'] = req.user.userId;
      } else if (req.user.role === Roles.RESIDENT && req.query.filter === 'my') {
        query.reporterId = req.user.userId;
      }

      if (req.query.status) query.status = req.query.status;
      if (req.query.priority) query.priority = req.query.priority;
      if (req.query.category) query.category = req.query.category;
      if (req.query.block) query['location.block'] = req.query.block;
      if (req.query.search) {
        query.$or = [
          { complaintId: new RegExp(req.query.search as string, 'i') },
          { title: new RegExp(req.query.search as string, 'i') },
        ];
      }

      const complaints = await Complaint.find(query).sort({ priority: 1, createdAt: -1 });

      // Sanitization: Only President sees internal AI confidence score and badges
      const sanitized = complaints.map((c) => {
        const obj: any = c.toObject();
        if (req.user?.role !== Roles.PRESIDENT && obj.aiAnalysis) {
          delete obj.aiAnalysis.confidence;
          delete obj.aiAnalysis.overrides;
        }
        return obj;
      });

      res.status(200).json({ success: true, complaints: sanitized });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const complaint = await Complaint.findOne({
        _id: req.params.id,
        societyId: req.user.societyId,
      });

      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found' });
        return;
      }

      const obj: any = complaint.toObject();
      if (req.user.role !== Roles.PRESIDENT && obj.aiAnalysis) {
        delete obj.aiAnalysis.confidence;
        delete obj.aiAnalysis.overrides;
      }

      res.status(200).json({ success: true, complaint: obj });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public async review(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const complaint = await complaintService.presidentReview({
        complaintId: req.params.id,
        presidentId: req.user.userId,
        presidentName: 'President',
        priority: req.body.priority,
        category: req.body.category,
        subcategory: req.body.subcategory,
        workSize: req.body.workSize,
        scopeFlag: req.body.scopeFlag,
        internalNotes: req.body.internalNotes,
      });

      res.status(200).json({ success: true, complaint });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async submitExpense(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { vendorName, vendorPhone, quotationAmount, quotationFileUrl, action, comment } = req.body;
      const complaint = await complaintService.submitAndApproveExpenseQuote({
        complaintId: req.params.id,
        presidentId: req.user.userId,
        vendorName,
        vendorPhone,
        quotationAmount,
        quotationFileUrl,
        action: action || 'APPROVE',
        comment,
      });

      res.status(200).json({ success: true, complaint });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async assign(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { providerId, providerName, providerPhone, providerType, isExternalVendor, estimatedCost, expectedCompletionDate } = req.body;
      const complaint = await complaintService.assignComplaint({
        complaintId: req.params.id,
        presidentId: req.user.userId,
        providerId,
        providerName: providerName || 'Assigned Provider',
        providerPhone: providerPhone || '9876543200',
        providerType: providerType || 'Technician',
        isExternalVendor: isExternalVendor ?? false,
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
        expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
      });

      res.status(200).json({ success: true, complaint });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async providerRespond(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { action, declineReason } = req.body;
      const complaint = await complaintService.providerRespond({
        complaintId: req.params.id,
        providerId: req.user.userId,
        providerName: req.body.providerName || 'Provider',
        action: action === 'DECLINE' ? 'DECLINE' : 'ACCEPT',
        declineReason,
      });

      res.status(200).json({ success: true, complaint });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async providerResolve(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { resolutionNote, photoUrl } = req.body;
      const complaint = await complaintService.providerResolve({
        complaintId: req.params.id,
        providerId: req.user.userId,
        providerName: req.body.providerName || 'Provider',
        resolutionNote: resolutionNote || 'Work completed successfully',
        photoUrl,
      });

      res.status(200).json({ success: true, complaint });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async residentVerify(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { isResolved, rating, feedback, reopenReason, reopenPhotoUrl } = req.body;
      const complaint = await complaintService.residentVerify({
        complaintId: req.params.id,
        residentId: req.user.userId,
        residentName: req.body.residentName || 'Resident',
        isResolved: isResolved === true,
        rating: rating ? Number(rating) : undefined,
        feedback,
        reopenReason,
        reopenPhotoUrl,
      });

      res.status(200).json({ success: true, complaint });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const analytics = await complaintService.getAnalytics(req.user.societyId);
      res.status(200).json({ success: true, analytics });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public async getCategories(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      let categories = await ComplaintCategory.find({ societyId: req.user.societyId });
      if (categories.length === 0) {
        // Seed default categories
        const defaults = [
          { name: 'Electrical', subcategories: ['Common Area Lighting', 'Wiring Issue', 'Meter Room', 'Generator'], defaultProviderType: 'Electrician' },
          { name: 'Lifts & Elevators', subcategories: ['Lift Maintenance', 'Lift Stuck', 'Door Issue'], defaultProviderType: 'Lift Technician' },
          { name: 'Water & Drainage', subcategories: ['Pipe Leakage', 'Drainage Blockage', 'Water Tank', 'Motor'], defaultProviderType: 'Plumber' },
          { name: 'Security & Fire Safety', subcategories: ['Gate Security', 'Fire Extinguisher', 'CCTV', 'Alarm'], defaultProviderType: 'Security Supervisor', isEmergency: true },
          { name: 'Housekeeping', subcategories: ['Lobby Cleaning', 'Garbage & Waste', 'Staircase Sweeping'], defaultProviderType: 'Housekeeping Staff' },
          { name: 'Civil & Painting', subcategories: ['Wall Seepage', 'Plaster Cracks', 'Terrace Leakage'], defaultProviderType: 'Civil Contractor' },
        ];

        for (const d of defaults) {
          await new ComplaintCategory({ societyId: req.user.societyId, ...d }).save();
        }
        categories = await ComplaintCategory.find({ societyId: req.user.societyId });
      }

      res.status(200).json({ success: true, categories });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const complaintController = new ComplaintController();

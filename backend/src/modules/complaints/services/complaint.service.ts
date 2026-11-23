import { Types } from 'mongoose';
import { Complaint, IComplaint, ComplaintPriority } from '../models/complaint.model.js';
import { getNextComplaintId } from '../models/complaint_counter.model.js';
import { aiService } from '../../../core/ai/ai.service.js';
import { notificationService } from '../../../core/notifications/notification.service.js';
import { auditService } from '../../../core/audit/audit.service.js';
import { socketService } from '../../../core/socket/socket.service.js';
import { User } from '../../../core/models/user.model.js';
import { Roles } from '../../../core/rbac/roles.js';

export class ComplaintService {
  public async createComplaint(params: {
    societyId: string | Types.ObjectId;
    reporterId: string | Types.ObjectId;
    reporterName: string;
    reporterPhone: string;
    reporterFlatNumber: string;
    title: string;
    description: string;
    photos?: string[];
    category?: string;
    subcategory?: string;
    block: string;
    commonArea: string;
  }): Promise<IComplaint> {
    const complaintId = await getNextComplaintId(params.societyId);

    const complaint = new Complaint({
      complaintId,
      societyId: params.societyId,
      reporterId: params.reporterId,
      reporterName: params.reporterName,
      reporterPhone: params.reporterPhone,
      reporterFlatNumber: params.reporterFlatNumber,
      title: params.title,
      description: params.description,
      photos: params.photos || [],
      category: params.category || 'General',
      subcategory: params.subcategory || 'General',
      location: {
        block: params.block,
        commonArea: params.commonArea,
      },
      priority: 'LOW',
      status: 'SUBMITTED',
      scopeFlag: 'IN_SCOPE',
      timeline: [
        {
          status: 'SUBMITTED',
          actorId: new Types.ObjectId(params.reporterId.toString()),
          actorName: params.reporterName,
          actorRole: Roles.RESIDENT,
          note: 'Complaint registered by resident',
          timestamp: new Date(),
        },
      ],
    });

    await complaint.save();

    // Notify President of new submission
    const president = await User.findOne({ societyId: params.societyId, role: Roles.PRESIDENT });
    if (president) {
      await notificationService.send({
        societyId: params.societyId,
        recipientId: president._id,
        title: `New Complaint ${complaint.complaintId}`,
        message: `${params.title} reported at ${params.block} (${params.commonArea})`,
        module: 'COMPLAINTS',
        linkModule: 'complaints',
        linkId: complaint._id.toString(),
      });
    }

    // Run AI analysis asynchronously in background
    setImmediate(() => {
      this.runBackgroundAIAnalysis(complaint._id.toString()).catch((err) => {
        console.error(`AI analysis failed for ${complaint.complaintId}:`, err);
      });
    });

    return complaint;
  }

  public async runBackgroundAIAnalysis(complaintDbId: string): Promise<void> {
    const complaint = await Complaint.findById(complaintDbId);
    if (!complaint) return;

    try {
      const aiResult = await aiService.analyzeComplaint({
        description: `${complaint.title}. ${complaint.description}`,
        category: complaint.category,
        subcategory: complaint.subcategory,
        location: `${complaint.location.block} - ${complaint.location.commonArea}`,
      });

      complaint.category = aiResult.category;
      complaint.subcategory = aiResult.subcategory;
      complaint.priority = aiResult.priority as ComplaintPriority;
      complaint.isEmergency = aiResult.isEmergency;
      complaint.scopeFlag = aiResult.scopeFlag;

      complaint.aiAnalysis = {
        category: aiResult.category,
        subcategory: aiResult.subcategory,
        priority: aiResult.priority,
        location: aiResult.location,
        suggestedProviderType: aiResult.suggestedProviderType,
        confidence: aiResult.confidence,
        isEmergency: aiResult.isEmergency,
        scopeFlag: aiResult.scopeFlag,
        summary: aiResult.summary,
        analyzedAt: new Date(),
        overrides: [],
      };

      // Check for duplicate candidates: same society, same category and location, open status
      const duplicateCandidate = await Complaint.findOne({
        _id: { $ne: complaint._id },
        societyId: complaint.societyId,
        category: complaint.category,
        'location.block': complaint.location.block,
        'location.commonArea': complaint.location.commonArea,
        status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS'] },
      });

      if (duplicateCandidate && aiResult.confidence > 0.85) {
        // High confidence duplicate -> Merge into candidate
        complaint.duplicateOf = duplicateCandidate._id as any;
        duplicateCandidate.mergedComplaints.push({
          complaintId: complaint.complaintId,
          reporterId: complaint.reporterId,
          reporterName: complaint.reporterName,
          reportedAt: complaint.createdAt,
        });
        await duplicateCandidate.save();

        complaint.status = 'UNDER_REVIEW';
        complaint.timeline.push({
          status: 'UNDER_REVIEW',
          actorName: 'AI Engine',
          actorRole: 'System',
          note: `AI identified as duplicate of ${duplicateCandidate.complaintId} and linked`,
          timestamp: new Date(),
        });
      } else {
        complaint.status = 'UNDER_REVIEW';
        complaint.timeline.push({
          status: 'UNDER_REVIEW',
          actorName: 'AI Engine',
          actorRole: 'System',
          note: `AI Triage completed (${aiResult.priority} Priority, ${aiResult.suggestedProviderType})`,
          timestamp: new Date(),
        });
      }

      await complaint.save();

      // If emergency, alert President immediately
      if (complaint.isEmergency) {
        const president = await User.findOne({ societyId: complaint.societyId, role: Roles.PRESIDENT });
        if (president) {
          await notificationService.send({
            societyId: complaint.societyId,
            recipientId: president._id,
            title: `EMERGENCY ALERT: ${complaint.complaintId}`,
            message: `URGENT safety/service emergency: ${complaint.title}`,
            type: 'ALERT',
            module: 'COMPLAINTS',
            linkModule: 'complaints',
            linkId: complaint._id.toString(),
          });
        }
      }

      socketService.emitToSociety(complaint.societyId.toString(), 'complaint_updated', complaint);
    } catch (err: any) {
      // Fallback: move to UNDER_REVIEW labeled AI unavailable
      complaint.status = 'UNDER_REVIEW';
      complaint.timeline.push({
        status: 'UNDER_REVIEW',
        actorName: 'System',
        actorRole: 'System',
        note: 'AI analysis unavailable. Manual review required by President.',
        timestamp: new Date(),
      });
      await complaint.save();
    }
  }

  public async presidentReview(params: {
    complaintId: string;
    presidentId: string | Types.ObjectId;
    presidentName: string;
    priority?: ComplaintPriority;
    category?: string;
    subcategory?: string;
    workSize?: 'MINOR' | 'MAJOR';
    scopeFlag?: 'IN_SCOPE' | 'OUT_OF_SCOPE';
    internalNotes?: string;
  }): Promise<IComplaint> {
    const complaint = await Complaint.findById(params.complaintId);
    if (!complaint) throw new Error('Complaint not found');

    if (params.priority && params.priority !== complaint.priority) {
      complaint.aiAnalysis?.overrides.push({
        field: 'priority',
        oldValue: complaint.priority,
        newValue: params.priority,
        overriddenBy: new Types.ObjectId(params.presidentId.toString()),
        overriddenAt: new Date(),
      });
      complaint.priority = params.priority;
    }

    if (params.category && params.category !== complaint.category) {
      complaint.aiAnalysis?.overrides.push({
        field: 'category',
        oldValue: complaint.category,
        newValue: params.category,
        overriddenBy: new Types.ObjectId(params.presidentId.toString()),
        overriddenAt: new Date(),
      });
      complaint.category = params.category;
    }

    if (params.subcategory) complaint.subcategory = params.subcategory;
    if (params.workSize) complaint.workSize = params.workSize;
    if (params.scopeFlag) complaint.scopeFlag = params.scopeFlag;

    complaint.timeline.push({
      status: complaint.status,
      actorId: new Types.ObjectId(params.presidentId.toString()),
      actorName: params.presidentName,
      actorRole: Roles.PRESIDENT,
      note: params.internalNotes || 'President reviewed triage details',
      timestamp: new Date(),
    });

    await complaint.save();
    socketService.emitToSociety(complaint.societyId.toString(), 'complaint_updated', complaint);
    return complaint;
  }

  public async submitAndApproveExpenseQuote(params: {
    complaintId: string;
    presidentId: string | Types.ObjectId;
    vendorName: string;
    vendorPhone: string;
    quotationAmount: number;
    quotationFileUrl?: string;
    action: 'APPROVE' | 'REJECT';
    comment?: string;
  }): Promise<IComplaint> {
    const complaint = await Complaint.findById(params.complaintId);
    if (!complaint) throw new Error('Complaint not found');

    complaint.workSize = 'MAJOR';
    complaint.expenseApproval = {
      vendorName: params.vendorName,
      vendorPhone: params.vendorPhone,
      quotationAmount: params.quotationAmount,
      quotationFileUrl: params.quotationFileUrl,
      status: params.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      approvedBy: new Types.ObjectId(params.presidentId.toString()),
      comment: params.comment,
      updatedAt: new Date(),
    };

    complaint.timeline.push({
      status: complaint.status,
      actorId: new Types.ObjectId(params.presidentId.toString()),
      actorName: 'President',
      actorRole: Roles.PRESIDENT,
      note: `Expense quote of Rs ${params.quotationAmount} from ${params.vendorName} ${params.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'}. Note: ${params.comment || 'N/A'}`,
      timestamp: new Date(),
    });

    await complaint.save();
    return complaint;
  }

  public async assignComplaint(params: {
    complaintId: string;
    presidentId: string | Types.ObjectId;
    providerId?: string | Types.ObjectId;
    providerName: string;
    providerPhone: string;
    providerType: string;
    isExternalVendor: boolean;
    estimatedCost?: number;
    expectedCompletionDate?: Date;
  }): Promise<IComplaint> {
    const complaint = await Complaint.findById(params.complaintId);
    if (!complaint) throw new Error('Complaint not found');

    // Expense Gate: If Major work, quotation must be approved before assigning
    if (complaint.workSize === 'MAJOR' && complaint.expenseApproval?.status !== 'APPROVED') {
      throw new Error('Expense Approval Gate: Major complaints cannot be Assigned until quotation is approved by the President.');
    }

    complaint.status = 'ASSIGNED';
    complaint.assignment = {
      providerId: params.providerId ? new Types.ObjectId(params.providerId.toString()) : undefined,
      providerName: params.providerName,
      providerPhone: params.providerPhone,
      providerType: params.providerType,
      isExternalVendor: params.isExternalVendor,
      estimatedCost: params.estimatedCost,
      expectedCompletionDate: params.expectedCompletionDate,
      assignedAt: new Date(),
    };

    complaint.timeline.push({
      status: 'ASSIGNED',
      actorId: new Types.ObjectId(params.presidentId.toString()),
      actorName: 'President',
      actorRole: Roles.PRESIDENT,
      note: `Assigned to ${params.providerName} (${params.providerType}). Est. Cost: Rs ${params.estimatedCost || 0}`,
      timestamp: new Date(),
    });

    await complaint.save();

    // Notify Resident and Provider
    await notificationService.send({
      societyId: complaint.societyId,
      recipientId: complaint.reporterId,
      title: `Complaint ${complaint.complaintId} Assigned`,
      message: `Assigned to ${params.providerName} (${params.providerType})`,
      module: 'COMPLAINTS',
      linkId: complaint._id.toString(),
    });

    if (params.providerId) {
      await notificationService.send({
        societyId: complaint.societyId,
        recipientId: params.providerId,
        title: `New Task Assigned: ${complaint.complaintId}`,
        message: `${complaint.title} at ${complaint.location.block} - ${complaint.location.commonArea}`,
        module: 'COMPLAINTS',
        linkId: complaint._id.toString(),
      });
    }

    socketService.emitToSociety(complaint.societyId.toString(), 'complaint_updated', complaint);
    return complaint;
  }

  public async providerRespond(params: {
    complaintId: string;
    providerId: string | Types.ObjectId;
    providerName: string;
    action: 'ACCEPT' | 'DECLINE';
    declineReason?: string;
  }): Promise<IComplaint> {
    const complaint = await Complaint.findById(params.complaintId);
    if (!complaint) throw new Error('Complaint not found');
    if (complaint.status !== 'ASSIGNED') throw new Error('Complaint is not in ASSIGNED status');

    if (params.action === 'ACCEPT') {
      complaint.status = 'IN_PROGRESS';
      if (complaint.assignment) {
        complaint.assignment.acceptedAt = new Date();
      }
      complaint.timeline.push({
        status: 'IN_PROGRESS',
        actorId: new Types.ObjectId(params.providerId.toString()),
        actorName: params.providerName,
        actorRole: Roles.SERVICE_PROVIDER,
        note: 'Task accepted and work started',
        timestamp: new Date(),
      });
    } else {
      // Decline returns to UNDER_REVIEW
      complaint.status = 'UNDER_REVIEW';
      if (complaint.assignment) {
        complaint.assignment.declinedAt = new Date();
        complaint.assignment.declineReason = params.declineReason;
      }
      complaint.timeline.push({
        status: 'UNDER_REVIEW',
        actorId: new Types.ObjectId(params.providerId.toString()),
        actorName: params.providerName,
        actorRole: Roles.SERVICE_PROVIDER,
        note: `Provider declined task. Reason: ${params.declineReason || 'Not specified'}`,
        timestamp: new Date(),
      });

      // Alert President
      const president = await User.findOne({ societyId: complaint.societyId, role: Roles.PRESIDENT });
      if (president) {
        await notificationService.send({
          societyId: complaint.societyId,
          recipientId: president._id,
          title: `Provider Declined: ${complaint.complaintId}`,
          message: `${params.providerName} declined ${complaint.complaintId}. Returned to Review queue.`,
          type: 'ALERT',
          module: 'COMPLAINTS',
          linkId: complaint._id.toString(),
        });
      }
    }

    await complaint.save();
    socketService.emitToSociety(complaint.societyId.toString(), 'complaint_updated', complaint);
    return complaint;
  }

  public async providerResolve(params: {
    complaintId: string;
    providerId: string | Types.ObjectId;
    providerName: string;
    resolutionNote: string;
    photoUrl?: string;
  }): Promise<IComplaint> {
    const complaint = await Complaint.findById(params.complaintId);
    if (!complaint) throw new Error('Complaint not found');
    if (complaint.status !== 'IN_PROGRESS') throw new Error('Complaint must be IN_PROGRESS to resolve');

    complaint.status = 'RESOLVED';
    complaint.resolvedAt = new Date();
    complaint.timeline.push({
      status: 'RESOLVED',
      actorId: new Types.ObjectId(params.providerId.toString()),
      actorName: params.providerName,
      actorRole: Roles.SERVICE_PROVIDER,
      note: params.resolutionNote,
      photoUrl: params.photoUrl,
      timestamp: new Date(),
    });

    await complaint.save();

    // Prompt resident to verify
    await notificationService.send({
      societyId: complaint.societyId,
      recipientId: complaint.reporterId,
      title: `Issue Fixed? ${complaint.complaintId}`,
      message: `Provider marked ${complaint.complaintId} as Resolved. Please verify and confirm.`,
      type: 'ACTION_REQUIRED',
      module: 'COMPLAINTS',
      linkId: complaint._id.toString(),
    });

    socketService.emitToSociety(complaint.societyId.toString(), 'complaint_updated', complaint);
    return complaint;
  }

  public async residentVerify(params: {
    complaintId: string;
    residentId: string | Types.ObjectId;
    residentName: string;
    isResolved: boolean;
    rating?: number;
    feedback?: string;
    reopenReason?: string;
    reopenPhotoUrl?: string;
  }): Promise<IComplaint> {
    const complaint = await Complaint.findById(params.complaintId);
    if (!complaint) throw new Error('Complaint not found');
    if (complaint.status !== 'RESOLVED') throw new Error('Only RESOLVED complaints can be verified');

    if (params.isResolved) {
      complaint.status = 'CLOSED';
      complaint.closedAt = new Date();
      complaint.rating = params.rating || 5;
      complaint.feedback = params.feedback;

      complaint.timeline.push({
        status: 'CLOSED',
        actorId: new Types.ObjectId(params.residentId.toString()),
        actorName: params.residentName,
        actorRole: Roles.RESIDENT,
        note: `Resident confirmed fix. Rating: ${complaint.rating}/5. Feedback: ${complaint.feedback || 'None'}`,
        timestamp: new Date(),
      });
    } else {
      // Reopen loop: RESOLVED -> UNDER_REVIEW
      complaint.status = 'UNDER_REVIEW';
      complaint.reopenCount += 1;
      complaint.reopenReason = params.reopenReason;
      complaint.reopenPhotoUrl = params.reopenPhotoUrl;

      complaint.timeline.push({
        status: 'UNDER_REVIEW',
        actorId: new Types.ObjectId(params.residentId.toString()),
        actorName: params.residentName,
        actorRole: Roles.RESIDENT,
        note: `Reopened (Count: ${complaint.reopenCount}). Reason: ${params.reopenReason || 'Not fixed properly'}`,
        photoUrl: params.reopenPhotoUrl,
        timestamp: new Date(),
      });

      // Escalation if reopenCount >= 2
      if (complaint.reopenCount >= 2) {
        complaint.escalationFlags.reopenLimitAlertSent = true;
        const president = await User.findOne({ societyId: complaint.societyId, role: Roles.PRESIDENT });
        if (president) {
          await notificationService.send({
            societyId: complaint.societyId,
            recipientId: president._id,
            title: `REOPEN ESCALATION: ${complaint.complaintId}`,
            message: `Complaint has been reopened ${complaint.reopenCount} times. Urgent review required.`,
            type: 'ALERT',
            module: 'COMPLAINTS',
            linkId: complaint._id.toString(),
          });
        }
      }
    }

    await complaint.save();
    socketService.emitToSociety(complaint.societyId.toString(), 'complaint_updated', complaint);
    return complaint;
  }

  public async presidentAutoClose(params: {
    complaintId: string;
    presidentId: string | Types.ObjectId;
    note: string;
  }): Promise<IComplaint> {
    const complaint = await Complaint.findById(params.complaintId);
    if (!complaint) throw new Error('Complaint not found');
    if (complaint.status !== 'RESOLVED') throw new Error('Only RESOLVED complaints can be auto-closed');

    complaint.status = 'CLOSED';
    complaint.closedAt = new Date();
    complaint.timeline.push({
      status: 'CLOSED',
      actorId: new Types.ObjectId(params.presidentId.toString()),
      actorName: 'President',
      actorRole: Roles.PRESIDENT,
      note: `Closed by President after 7 days grace period without resident response: ${params.note}`,
      timestamp: new Date(),
    });

    await complaint.save();
    socketService.emitToSociety(complaint.societyId.toString(), 'complaint_updated', complaint);
    return complaint;
  }

  public async getAnalytics(societyId: string | Types.ObjectId): Promise<any> {
    const complaints = await Complaint.find({ societyId });

    const total = complaints.length;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byBlock: Record<string, number> = {};
    let resolvedCount = 0;
    let totalAssignTimeHours = 0;
    let totalResolveTimeHours = 0;
    let totalRatings = 0;
    let ratingCount = 0;

    for (const c of complaints) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byBlock[c.location.block] = (byBlock[c.location.block] || 0) + 1;

      if (c.assignment?.assignedAt) {
        const diffHours = (c.assignment.assignedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60);
        totalAssignTimeHours += diffHours;
      }

      if (c.resolvedAt) {
        resolvedCount++;
        const diffHours = (c.resolvedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60);
        totalResolveTimeHours += diffHours;
      }

      if (c.rating) {
        totalRatings += c.rating;
        ratingCount++;
      }
    }

    return {
      total,
      openComplaints: total - (byStatus['CLOSED'] || 0),
      byStatus,
      byPriority,
      byCategory,
      byBlock,
      avgTimeToAssignHours: total > 0 ? (totalAssignTimeHours / total).toFixed(1) : '0',
      avgTimeToResolveHours: resolvedCount > 0 ? (totalResolveTimeHours / resolvedCount).toFixed(1) : '0',
      avgRating: ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : '5.0',
      reopenRate: total > 0 ? ((complaints.filter((c) => c.reopenCount > 0).length / total) * 100).toFixed(1) : '0',
    };
  }
}

export const complaintService = new ComplaintService();

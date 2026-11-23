import crypto from 'crypto';
import { Types } from 'mongoose';
import { VisitPass, IVisitPass, PassType } from '../models/visit_pass.model.js';
import { VisitRequest, IVisitRequest } from '../models/visit_request.model.js';
import { VisitEvent, IVisitEvent } from '../models/visit_event.model.js';
import { socketService } from '../../../core/socket/socket.service.js';
import { Flat } from '../../../core/models/flat.model.js';

export interface CreatePassDTO {
  societyId: string;
  hostResidentId: string;
  visitorName: string;
  visitorPhone: string;
  visitorType: 'GUEST' | 'DELIVERY' | 'SERVICE' | 'CAB';
  passType: PassType;
  expectedCount?: number;
  validityHours: 1 | 2 | 4;
}

export interface UnexpectedRequestDTO {
  societyId: string;
  securityGuardId: string;
  flatNumber: string;
  visitorName: string;
  visitorPhone: string;
  purpose: string;
  vehicleNumber?: string;
}

export class VisitorService {
  /**
   * Resident generates a pre-planned QR pass (1, 2, or 4 hours validity)
   */
  public async createPrePlannedPass(dto: CreatePassDTO): Promise<IVisitPass> {
    const flat = await Flat.findOne({
      societyId: new Types.ObjectId(dto.societyId),
      residentId: new Types.ObjectId(dto.hostResidentId),
    });

    if (!flat) {
      throw new Error('Resident has no registered flat in this society');
    }

    const passToken = `VP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date();
    const validUntil = new Date(now.getTime() + dto.validityHours * 60 * 60 * 1000);

    const pass = new VisitPass({
      passToken,
      societyId: new Types.ObjectId(dto.societyId),
      hostResidentId: new Types.ObjectId(dto.hostResidentId),
      flatId: flat._id,
      flatNumber: flat.flatNumber,
      visitorName: dto.visitorName,
      visitorPhone: dto.visitorPhone,
      visitorType: dto.visitorType,
      passType: dto.passType,
      expectedCount: dto.passType === 'GROUP' ? (dto.expectedCount || 5) : 1,
      admittedCount: 0,
      validityHours: dto.validityHours,
      validFrom: now,
      validUntil,
      status: 'ACTIVE',
    });

    await pass.save();
    return pass;
  }

  /**
   * Resident renews an expired or active pass.
   * Invalidates the previous pass (status: REVOKED) and issues a new pass token.
   */
  public async renewPass(passId: string, residentId: string, validityHours: 1 | 2 | 4): Promise<IVisitPass> {
    const oldPass = await VisitPass.findOne({
      _id: new Types.ObjectId(passId),
      hostResidentId: new Types.ObjectId(residentId),
    });

    if (!oldPass) {
      throw new Error('Pass not found or unauthorized');
    }

    const newPassToken = `VP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date();
    const validUntil = new Date(now.getTime() + validityHours * 60 * 60 * 1000);

    // Invalidate old pass
    oldPass.status = 'REVOKED';
    oldPass.replacedByToken = newPassToken;
    await oldPass.save();

    // Create renewed pass
    const newPass = new VisitPass({
      passToken: newPassToken,
      societyId: oldPass.societyId,
      hostResidentId: oldPass.hostResidentId,
      flatId: oldPass.flatId,
      flatNumber: oldPass.flatNumber,
      visitorName: oldPass.visitorName,
      visitorPhone: oldPass.visitorPhone,
      visitorType: oldPass.visitorType,
      passType: oldPass.passType,
      expectedCount: oldPass.expectedCount,
      admittedCount: 0,
      validityHours,
      validFrom: now,
      validUntil,
      status: 'ACTIVE',
    });

    await newPass.save();
    return newPass;
  }

  /**
   * Security Guard verifies and admits visitor via QR scan or token entry
   */
  public async verifyAndAdmitPass(
    societyId: string,
    token: string,
    securityGuardId: string
  ): Promise<{ success: boolean; message: string; pass: IVisitPass }> {
    const cleanToken = token.trim().toUpperCase();
    const pass = await VisitPass.findOne({
      societyId: new Types.ObjectId(societyId),
      passToken: cleanToken,
    });

    if (!pass) {
      throw new Error('Invalid QR Pass: Token not found');
    }

    if (pass.status === 'REVOKED') {
      throw new Error(`This pass was renewed. Please use the updated pass (${pass.replacedByToken || 'renewed'})`);
    }

    if (pass.status === 'EXPIRED' || new Date() > pass.validUntil) {
      pass.status = 'EXPIRED';
      await pass.save();
      throw new Error(`QR Pass expired on ${pass.validUntil.toLocaleTimeString()}`);
    }

    if (pass.status === 'USED') {
      throw new Error('This single-use pass has already been used');
    }

    // Admit visitor
    pass.admittedCount += 1;
    pass.verifiedBySecurityId = new Types.ObjectId(securityGuardId);
    pass.usedAt = new Date();

    if (pass.passType === 'INDIVIDUAL' || pass.admittedCount >= pass.expectedCount) {
      pass.status = 'USED';
    }

    await pass.save();

    // Notify resident via Socket.IO
    socketService.emitToUser(pass.hostResidentId.toString(), 'visitor:admitted', {
      passToken: pass.passToken,
      visitorName: pass.visitorName,
      flatNumber: pass.flatNumber,
      admittedAt: pass.usedAt,
    });

    return {
      success: true,
      message: `Verified! Entry granted for ${pass.visitorName} to Flat ${pass.flatNumber}`,
      pass,
    };
  }

  /**
   * Security Guard sends unexpected visitor entry request to resident
   */
  public async createUnexpectedRequest(dto: UnexpectedRequestDTO): Promise<IVisitRequest> {
    const flat = await Flat.findOne({
      societyId: new Types.ObjectId(dto.societyId),
      flatNumber: dto.flatNumber.trim(),
    }).populate('residentId');

    if (!flat || !flat.residentId) {
      throw new Error(`Flat ${dto.flatNumber} has no registered resident to approve entry`);
    }

    const request = new VisitRequest({
      societyId: new Types.ObjectId(dto.societyId),
      flatId: flat._id,
      flatNumber: flat.flatNumber,
      hostResidentId: (flat.residentId as any)._id,
      visitorName: dto.visitorName,
      visitorPhone: dto.visitorPhone,
      purpose: dto.purpose,
      vehicleNumber: dto.vehicleNumber,
      securityGuardId: new Types.ObjectId(dto.securityGuardId),
      status: 'PENDING',
    });

    await request.save();

    // Dispatch real-time push to resident
    socketService.emitToUser((flat.residentId as any)._id.toString(), 'visitor:unexpected_arrival', {
      requestId: request._id,
      visitorName: request.visitorName,
      visitorPhone: request.visitorPhone,
      purpose: request.purpose,
      vehicleNumber: request.vehicleNumber,
      flatNumber: request.flatNumber,
      createdAt: request.createdAt,
    });

    return request;
  }

  /**
   * Resident responds to unexpected visitor request (APPROVE or DENY)
   */
  public async respondToUnexpectedRequest(
    requestId: string,
    residentId: string,
    action: 'APPROVE' | 'DENY'
  ): Promise<IVisitRequest> {
    const request = await VisitRequest.findOne({
      _id: new Types.ObjectId(requestId),
      hostResidentId: new Types.ObjectId(residentId),
      status: 'PENDING',
    });

    if (!request) {
      throw new Error('Request not found, unauthorized, or already handled');
    }

    request.respondedAt = new Date();
    if (action === 'APPROVE') {
      request.status = 'APPROVED';
      request.passToken = `UN-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    } else {
      request.status = 'DENIED';
    }

    await request.save();

    // Notify Security Guard in real time
    socketService.emitToSociety(request.societyId.toString(), 'visitor:unexpected_response', {
      requestId: request._id,
      status: request.status,
      passToken: request.passToken,
      visitorName: request.visitorName,
      flatNumber: request.flatNumber,
    });

    return request;
  }

  /**
   * Resident creates an event with a gate access code
   */
  public async createEvent(
    societyId: string,
    residentId: string,
    eventName: string,
    eventDate: Date,
    expectedGuests: number
  ): Promise<IVisitEvent> {
    const flat = await Flat.findOne({
      societyId: new Types.ObjectId(societyId),
      residentId: new Types.ObjectId(residentId),
    });

    if (!flat) {
      throw new Error('Resident has no flat assigned in this society');
    }

    const eventCode = `EV-${Math.floor(100000 + Math.random() * 900000)}`;

    const event = new VisitEvent({
      societyId: new Types.ObjectId(societyId),
      hostResidentId: new Types.ObjectId(residentId),
      flatNumber: flat.flatNumber,
      eventName,
      eventDate,
      eventCode,
      expectedGuests,
      admittedCount: 0,
      status: 'UPCOMING',
    });

    await event.save();
    return event;
  }

  /**
   * Security Guard verifies an event guest entry code
   */
  public async verifyEventGuest(
    societyId: string,
    eventCode: string
  ): Promise<{ success: boolean; event: IVisitEvent; message: string }> {
    const cleanCode = eventCode.trim().toUpperCase();
    const event = await VisitEvent.findOne({
      societyId: new Types.ObjectId(societyId),
      eventCode: cleanCode,
    });

    if (!event) {
      throw new Error('Invalid Event Code: Event not found');
    }

    event.admittedCount += 1;
    if (event.status === 'UPCOMING') {
      event.status = 'ACTIVE';
    }
    await event.save();

    return {
      success: true,
      event,
      message: `Verified! Guest #${event.admittedCount} admitted for "${event.eventName}" (Flat ${event.flatNumber})`,
    };
  }

  /**
   * List resident's passes
   */
  public async getResidentPasses(societyId: string, residentId: string): Promise<IVisitPass[]> {
    return VisitPass.find({
      societyId: new Types.ObjectId(societyId),
      hostResidentId: new Types.ObjectId(residentId),
    }).sort({ createdAt: -1 });
  }

  /**
   * List pending unexpected requests for resident
   */
  public async getResidentPendingRequests(societyId: string, residentId: string): Promise<IVisitRequest[]> {
    return VisitRequest.find({
      societyId: new Types.ObjectId(societyId),
      hostResidentId: new Types.ObjectId(residentId),
      status: 'PENDING',
    }).sort({ createdAt: -1 });
  }

  /**
   * List active gate logs for Security Guard
   */
  public async getSecurityGateLogs(societyId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [recentPasses, pendingRequests, activeEvents] = await Promise.all([
      VisitPass.find({
        societyId: new Types.ObjectId(societyId),
        createdAt: { $gte: today },
      }).sort({ createdAt: -1 }).limit(50),
      VisitRequest.find({
        societyId: new Types.ObjectId(societyId),
        status: 'PENDING',
      }).sort({ createdAt: -1 }),
      VisitEvent.find({
        societyId: new Types.ObjectId(societyId),
        status: { $in: ['UPCOMING', 'ACTIVE'] },
      }).sort({ eventDate: 1 }),
    ]);

    return { recentPasses, pendingRequests, activeEvents };
  }
}

export const visitorService = new VisitorService();

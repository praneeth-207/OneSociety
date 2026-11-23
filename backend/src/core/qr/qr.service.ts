import crypto from 'crypto';
import { QRPass, IQRPass, PassType, PassStatus } from '../models/qr_pass.model.js';
import { Types } from 'mongoose';

export class QRService {
  public generateSecureToken(): string {
    return 'OSQ-' + crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  public generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  public async createVisitorPass(params: {
    societyId: string | Types.ObjectId;
    flatId?: string | Types.ObjectId;
    flatNumber?: string;
    generatedBy: string | Types.ObjectId;
    guestName: string;
    guestPhone: string;
    purpose?: string;
    validityHours: number;
    passType: 'VISITOR_INDIVIDUAL' | 'VISITOR_GROUP';
    memberCount?: number;
    memberDetails?: string;
  }): Promise<IQRPass> {
    const token = this.generateSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + params.validityHours * 60 * 60 * 1000);

    const pass = new QRPass({
      token,
      passType: params.passType,
      societyId: params.societyId,
      flatId: params.flatId,
      flatNumber: params.flatNumber,
      generatedBy: params.generatedBy,
      guestName: params.guestName,
      guestPhone: params.guestPhone,
      purpose: params.purpose,
      memberCount: params.memberCount || 1,
      memberDetails: params.memberDetails,
      validFrom: now,
      expiresAt,
      status: 'ACTIVE',
    });

    await pass.save();
    return pass;
  }

  public async renewVisitorPass(oldPassId: string | Types.ObjectId, validityHours = 2): Promise<IQRPass> {
    const oldPass = await QRPass.findById(oldPassId);
    if (!oldPass) {
      throw new Error('Old pass not found');
    }

    // Revoke old pass
    oldPass.status = 'REVOKED';
    await oldPass.save();

    // Create new pass copying details
    return this.createVisitorPass({
      societyId: oldPass.societyId,
      flatId: oldPass.flatId,
      flatNumber: oldPass.flatNumber,
      generatedBy: oldPass.generatedBy,
      guestName: oldPass.guestName || '',
      guestPhone: oldPass.guestPhone || '',
      purpose: oldPass.purpose,
      validityHours,
      passType: oldPass.passType as any,
      memberCount: oldPass.memberCount,
      memberDetails: oldPass.memberDetails,
    });
  }

  public async verifyAndCheckInPass(params: {
    token: string;
    verifierId: string | Types.ObjectId;
    verifierName: string;
    societyId: string | Types.ObjectId;
  }): Promise<{ success: boolean; message: string; pass?: IQRPass }> {
    const pass = await QRPass.findOne({ token: params.token, societyId: params.societyId });
    if (!pass) {
      return { success: false, message: 'Invalid QR pass. Record not found.' };
    }

    if (pass.status === 'USED') {
      return { success: false, message: 'QR pass has already been used and cannot be reused.' };
    }

    if (pass.status === 'REVOKED') {
      return { success: false, message: 'This QR pass has been renewed or revoked.' };
    }

    const now = new Date();
    if (now > pass.expiresAt || pass.status === 'EXPIRED') {
      pass.status = 'EXPIRED';
      await pass.save();
      return { success: false, message: 'QR pass has expired.' };
    }

    // Mark used for entry
    pass.status = 'USED';
    pass.usedAt = now;
    pass.usedBy = new Types.ObjectId(params.verifierId.toString());
    pass.usedByName = params.verifierName;
    await pass.save();

    return {
      success: true,
      message: `Verified successfully for ${pass.guestName || 'Resident Delivery'} (Flat: ${pass.flatNumber || 'N/A'})`,
      pass,
    };
  }
}

export const qrService = new QRService();

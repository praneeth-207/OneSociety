import { AuditLog, IAuditLog } from '../models/audit_log.model.js';
import { Types } from 'mongoose';

export interface LogAuditParams {
  societyId: string | Types.ObjectId;
  actorId: string | Types.ObjectId;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AuditService {
  public async log(params: LogAuditParams): Promise<IAuditLog> {
    const log = new AuditLog({
      societyId: params.societyId,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      metadata: params.metadata,
    });

    await log.save();
    return log;
  }
}

export const auditService = new AuditService();

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditEventType } from '../schemas/audit-log.schema';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(data: {
    userId?: string;
    eventType: AuditEventType;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    isSuccessful: boolean;
    failureReason?: string;
  }): Promise<void> {
    try {
      await this.auditLogModel.create(data);
    } catch (error) {
      // Don't let audit logging failures break the application
      console.error('Failed to create audit log:', error);
    }
  }

  async getUserLogs(userId: string, limit: number = 50): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getRecentFailedLogins(email: string, minutes: number = 15): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.auditLogModel.countDocuments({
      email,
      eventType: AuditEventType.LOGIN_FAILED,
      createdAt: { $gte: since },
    });
  }

  async getSecurityEvents(userId: string, limit: number = 20): Promise<AuditLogDocument[]> {
    const securityEvents = [
      AuditEventType.PASSWORD_CHANGE,
      AuditEventType.EMAIL_CHANGE,
      AuditEventType.TWO_FA_ENABLED,
      AuditEventType.TWO_FA_DISABLED,
      AuditEventType.ACCOUNT_LOCKED,
      AuditEventType.ACCOUNT_UNLOCKED,
    ];

    return this.auditLogModel
      .find({ userId, eventType: { $in: securityEvents } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}

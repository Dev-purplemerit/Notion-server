import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export enum AuditEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  SIGNUP = 'signup',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_CHANGE = 'email_change',
  TWO_FA_ENABLED = '2fa_enabled',
  TWO_FA_DISABLED = '2fa_disabled',
  TWO_FA_VERIFIED = '2fa_verified',
  TWO_FA_FAILED = '2fa_failed',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  TOKEN_REFRESH = 'token_refresh',
  EMAIL_VERIFIED = 'email_verified',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
}

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true, enum: AuditEventType })
  eventType: AuditEventType;

  @Prop()
  email?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  isSuccessful: boolean;

  @Prop()
  failureReason?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Index for querying by user and event type
AuditLogSchema.index({ userId: 1, eventType: 1, createdAt: -1 });

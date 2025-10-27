import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GmailTokenDocument = GmailToken & Document;

@Schema({ timestamps: true })
export class GmailToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  accessToken: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop({ required: true })
  tokenType: string;

  @Prop({ required: true })
  expiryDate: number; // Unix timestamp in milliseconds

  @Prop()
  scope: string;

  @Prop()
  email: string; // Gmail email address

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastSyncedAt: Date;
}

export const GmailTokenSchema = SchemaFactory.createForClass(GmailToken);

// Indexes
GmailTokenSchema.index({ userId: 1 });
GmailTokenSchema.index({ email: 1 });

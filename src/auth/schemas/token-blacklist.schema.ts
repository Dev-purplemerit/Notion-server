import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenBlacklistDocument = TokenBlacklist & Document;

@Schema({ timestamps: true })
export class TokenBlacklist {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  reason?: string; // e.g., 'logout', 'password_change', 'security_breach'
}

export const TokenBlacklistSchema = SchemaFactory.createForClass(TokenBlacklist);

// Auto-delete expired tokens
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

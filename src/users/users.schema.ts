import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  // No need to declare _id here, mongoose will handle it

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false }) // Not required for OAuth users
  password?: string;

  @Prop({ required: true, default: 'local' }) // 'local' or 'google' (or other providers)
  provider: string;

  @Prop()
  name?: string;

  @Prop() // To store the OAuth provider's user ID (e.g., Google ID)
  providerId?: string;

  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  // Extended profile fields
  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  phone?: string;

  @Prop()
  bio?: string;

  @Prop()
  avatar?: string;

  @Prop()
  country?: string;

  @Prop()
  cityState?: string;

  @Prop()
  location?: string;

  @Prop()
  postalCode?: string;

  // Security fields
  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  twoFactorSecret?: string;

  @Prop({ type: [String], default: [] })
  twoFactorBackupCodes?: string[];

  // Account lockout fields
  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop()
  lockoutUntil?: Date;

  @Prop()
  lastPasswordChange?: Date;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

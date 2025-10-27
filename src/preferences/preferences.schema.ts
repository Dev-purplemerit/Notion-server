import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PreferencesDocument = Preferences & Document;

@Schema({ timestamps: true })
export class Preferences {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  // Accessibility preferences
  @Prop({ default: 'english' })
  language: string;

  @Prop({ default: 'medium' })
  fontSize: string;

  @Prop({ default: 'light' })
  theme: string;

  @Prop({ default: 'english' })
  captionLanguage: string;

  @Prop({ default: false })
  enableCaptions: boolean;

  // Notification preferences
  @Prop({ type: Object, default: {
    chatNotifications: true,
    meetingInvites: true,
    taskUpdates: true,
    calendarChanges: false,
  }})
  notificationTypes: {
    chatNotifications: boolean;
    meetingInvites: boolean;
    taskUpdates: boolean;
    calendarChanges: boolean;
  };

  @Prop({ type: Object, default: {
    email: true,
    inApp: true,
    push: false,
  }})
  notificationChannels: {
    email: boolean;
    inApp: boolean;
    push: boolean;
  };

  @Prop({ default: 'realtime' })
  notificationFrequency: string;

  // AI preferences
  @Prop({ default: true })
  enableAutoSummaries: boolean;

  @Prop({ default: true })
  enableSmartSuggestions: boolean;

  @Prop({ default: true })
  enableVoiceDetection: boolean;

  @Prop({ default: true })
  enableLanguageTranslation: boolean;

  @Prop({ default: true })
  enableTaskPrioritization: boolean;
}

export const PreferencesSchema = SchemaFactory.createForClass(Preferences);

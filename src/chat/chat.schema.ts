import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true })
  sender: string; // sender email

  @Prop({ required: false })
  receiver?: string; // receiver email (for private messages)

  @Prop({ required: false })
  groupName?: string; // group name (for group messages)

  @Prop({ required: true })
  text: string; // message content

  @Prop({ required: true, enum: ['private', 'group'] })
  mode: string; // message type

  @Prop({ default: false })
  isMedia: boolean;

  @Prop({ required: false })
  mediaUrl?: string;

  @Prop({ required: false })
  filename?: string;

  @Prop({ required: false })
  mimetype?: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ required: false })
  readAt?: Date;

  @Prop({ default: false })
  isDelivered: boolean;

  @Prop({ required: false })
  deliveredAt?: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// Indexes for efficient queries
ChatMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
ChatMessageSchema.index({ groupName: 1, createdAt: -1 });
ChatMessageSchema.index({ receiver: 1, isRead: 1 });
ChatMessageSchema.index({ receiver: 1, isDelivered: 1 }); // For efficient undelivered message queries

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Meeting extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, unique: true })
  roomId: string;

  @Prop({ required: true })
  scheduledDate: Date;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  participants: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }] })
  relatedTasks: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Project' }] })
  relatedProjects: Types.ObjectId[];

  @Prop({ default: 'scheduled', enum: ['scheduled', 'ongoing', 'completed', 'cancelled'] })
  status: string;

  @Prop({ type: Object })
  settings: {
    requiresAuth?: boolean;
    maxParticipants?: number;
    recordingEnabled?: boolean;
  };
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);

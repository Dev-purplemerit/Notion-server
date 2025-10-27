import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop()
  day: string;

  @Prop()
  startTime: number;

  @Prop()
  duration: number;

  @Prop({ enum: ['High', 'Medium', 'Low', 'Stand-by'] })
  label: string;

  @Prop({ type: [String], default: [] })
  members: string[]; // User IDs

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  teamId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId; // Task creator

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  admin: Types.ObjectId; // Can be changed by owner

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  // Legacy fields (keep for backward compatibility if needed)
  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  assignedTo: Types.ObjectId[];

  @Prop({ default: 'todo', enum: ['todo', 'in-progress', 'review', 'completed'] })
  status: string;

  @Prop({ default: 'medium', enum: ['low', 'medium', 'high'] })
  priority: string;

  @Prop()
  dueDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

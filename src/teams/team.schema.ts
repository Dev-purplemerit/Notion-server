import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true })
export class Team {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], default: [] })
  members: string[]; // User IDs

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId; // Task creator

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  admin: Types.ObjectId; // Can be changed by owner

  @Prop({ type: Types.ObjectId, ref: 'Task' })
  taskId?: Types.ObjectId; // Optional: for task-based teams

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId?: Types.ObjectId; // Optional: for project-based teams
}

export const TeamSchema = SchemaFactory.createForClass(Team);

// Indexes
TeamSchema.index({ 'members.userId': 1 });
TeamSchema.index({ createdBy: 1 });

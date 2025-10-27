import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  teamId?: Types.ObjectId; // Auto-created

  @Prop({ default: 'active', enum: ['active', 'completed', 'archived'] })
  status: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Indexes
ProjectSchema.index({ teamId: 1 });
ProjectSchema.index({ status: 1 });

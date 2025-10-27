import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LearningDocument = Learning & Document;
export type ReferenceDocument = Reference & Document;

@Schema({ _id: false })
export class Resource {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  type: string; // article, video, documentation
}

@Schema({ _id: false })
export class Chapter {
  @Prop({ required: true })
  title: string;

  @Prop({ type: [String], default: [] })
  topics: string[];

  @Prop({ type: [Resource], default: [] })
  resources: Resource[];
}

@Schema({ timestamps: true })
export class Learning {
  @Prop({ required: true })
  title: string;

  @Prop()
  subtitle: string;

  @Prop({ required: true })
  category: string;

  @Prop()
  duration: string;

  @Prop({ default: 0 })
  progress: number;

  @Prop()
  image: string;

  @Prop({ type: [Chapter], default: [] })
  chapters: Chapter[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: true })
  isPublished: boolean;
}

@Schema({ timestamps: true })
export class Reference {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  category: string;

  @Prop()
  image: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: true })
  isPublished: boolean;
}

export const LearningSchema = SchemaFactory.createForClass(Learning);
export const ReferenceSchema = SchemaFactory.createForClass(Reference);

// Create indexes
LearningSchema.index({ category: 1 });
LearningSchema.index({ tags: 1 });
LearningSchema.index({ isPublished: 1 });

ReferenceSchema.index({ category: 1 });
ReferenceSchema.index({ tags: 1 });
ReferenceSchema.index({ isPublished: 1 });

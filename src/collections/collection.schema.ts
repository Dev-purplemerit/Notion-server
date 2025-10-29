import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CollectionDocument = Collection & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export interface CellContent {
  id: string;
  type: 'list' | 'image' | 'url' | null;
  data: string | string[];
  backgroundColor: string;
}

@Schema({ timestamps: true })
export class Collection {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: false })
  projectId?: Types.ObjectId;

  @Prop({ required: true })
  rows: number;

  @Prop({ required: true })
  cols: number;

  @Prop({ type: Object, required: true })
  cells: { [key: string]: CellContent };

  @Prop({ required: false })
  thumbnail?: string; // URL to a generated thumbnail or first image

  @Prop({ required: true, enum: ['draft', 'published'], default: 'draft' })
  status: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  sharedWith: Types.ObjectId[];

  @Prop({ required: false })
  size?: string; // calculated size (e.g., "4mb")
}

export const CollectionSchema = SchemaFactory.createForClass(Collection);

// Indexes for efficient queries
CollectionSchema.index({ userId: 1, status: 1, updatedAt: -1 });
CollectionSchema.index({ projectId: 1, status: 1 });
CollectionSchema.index({ userId: 1, updatedAt: -1 });

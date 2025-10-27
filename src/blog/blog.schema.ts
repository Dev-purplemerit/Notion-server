import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BlogDocument = Blog & Document;

@Schema({ timestamps: true })
export class Blog {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  content: string; // Rich text HTML

  @Prop()
  excerpt: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ default: 'draft', enum: ['draft', 'published'] })
  status: string;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  coverImage: string;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likes: Types.ObjectId[];

  @Prop()
  publishedAt: Date;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);

// Create index for slug
BlogSchema.index({ slug: 1 });
BlogSchema.index({ author: 1 });
BlogSchema.index({ status: 1 });

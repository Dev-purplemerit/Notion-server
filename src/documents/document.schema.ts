import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongoDocument, Types } from 'mongoose';

export type DocumentDocument = DocumentModel & MongoDocument;

@Schema({ timestamps: true })
export class DocumentModel {
  @Prop({ required: true })
  title: string;

  @Prop()
  content: string;

  @Prop({ required: true })
  fileUrl: string;

  @Prop()
  fileType: string;

  @Prop()
  fileSize: number;

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  teamId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentModel);

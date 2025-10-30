import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KanbanBoardDocument = KanbanBoard & Document;

@Schema({ timestamps: true })
export class KanbanBoard {
  @Prop({ required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: false })
  projectId?: Types.ObjectId;

  @Prop({ required: true, default: 'Default Board' })
  name: string;

  @Prop({
    type: [{
      title: { type: String, required: true },
      status: [{ type: String, required: true }],
      color: { type: String, required: true },
      order: { type: Number, required: true },
    }],
    required: true,
    default: [
      { title: 'To-do', status: ['todo'], color: '#E8E4FF', order: 0 },
      { title: 'In progress', status: ['in-progress'], color: '#FFE8D9', order: 1 },
      { title: 'Review', status: ['review'], color: '#FFF4D9', order: 2 },
      { title: 'Completed', status: ['completed'], color: '#D9FFE8', order: 3 },
    ]
  })
  columns: {
    title: string;
    status: string[];
    color: string;
    order: number;
  }[];

  @Prop({ default: true })
  isDefault: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const KanbanBoardSchema = SchemaFactory.createForClass(KanbanBoard);
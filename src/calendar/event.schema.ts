import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: false })
  allDay: boolean;

  @Prop()
  location: string;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
      },
    ],
    default: [],
  })
  attendees: {
    userId: Types.ObjectId;
    status: string;
  }[];

  @Prop({
    type: [
      {
        time: Date,
        sent: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  reminders: {
    time: Date;
    sent: boolean;
  }[];

  @Prop()
  googleEventId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  teamId: Types.ObjectId;

  @Prop({
    type: {
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
      endDate: Date,
    },
  })
  recurring: {
    frequency: string;
    endDate: Date;
  };

  @Prop({ default: 'active', enum: ['active', 'cancelled'] })
  status: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);

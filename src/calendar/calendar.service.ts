import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from './event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class CalendarService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private usersService: UsersService,
  ) {}

  async createEvent(createEventDto: CreateEventDto, userEmail: string): Promise<Event> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const attendees = createEventDto.attendees?.map((id) => ({
      userId: new Types.ObjectId(id),
      status: 'pending',
    })) || [];

    const reminders = createEventDto.reminders?.map((time) => ({
      time,
      sent: false,
    })) || [];

    const event = new this.eventModel({
      ...createEventDto,
      createdBy: new Types.ObjectId(userId),
      attendees,
      reminders,
      teamId: createEventDto.teamId ? new Types.ObjectId(createEventDto.teamId) : null,
    });

    return event.save();
  }

  async findAll(userEmail: string): Promise<Event[]> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    return this.eventModel
      .find({
        $or: [
          { createdBy: new Types.ObjectId(userId) },
          { 'attendees.userId': new Types.ObjectId(userId) },
        ],
        status: 'active',
      })
      .populate('createdBy', 'name email')
      .populate('attendees.userId', 'name email')
      .sort({ startDate: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventModel
      .findById(id)
      .populate('createdBy', 'name email')
      .populate('attendees.userId', 'name email')
      .exec();

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async updateEvent(id: string, updateEventDto: UpdateEventDto, userEmail: string): Promise<Event> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const event = await this.eventModel.findOne({
      _id: id,
      createdBy: new Types.ObjectId(userId),
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found or you don't have permission`);
    }

    // Handle attendees update
    const dtoWithAttendees = updateEventDto as any;
    if (dtoWithAttendees.attendees) {
      event.attendees = dtoWithAttendees.attendees.map((id: string) => ({
        userId: new Types.ObjectId(id),
        status: 'pending',
      }));
    }

    // Handle reminders update
    const dtoWithReminders = updateEventDto as any;
    if (dtoWithReminders.reminders) {
      event.reminders = dtoWithReminders.reminders.map((time: Date) => ({
        time,
        sent: false,
      }));
    }

    Object.assign(event, updateEventDto);
    return event.save();
  }

  async deleteEvent(id: string, userEmail: string): Promise<void> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const result = await this.eventModel.updateOne(
      { _id: id, createdBy: new Types.ObjectId(userId) },
      { status: 'cancelled' },
    );

    if (result.modifiedCount === 0) {
      throw new NotFoundException(`Event with ID ${id} not found or you don't have permission`);
    }
  }

  async updateAttendeeStatus(
    eventId: string,
    userEmail: string,
    status: 'accepted' | 'declined',
  ): Promise<Event> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const attendee = event.attendees.find(
      (a) => a.userId.toString() === userId,
    );

    if (!attendee) {
      throw new NotFoundException('You are not an attendee of this event');
    }

    attendee.status = status;
    return event.save();
  }

  async getUpcomingEvents(userEmail: string, days: number = 7): Promise<Event[]> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.eventModel
      .find({
        $or: [
          { createdBy: new Types.ObjectId(userId) },
          { 'attendees.userId': new Types.ObjectId(userId) },
        ],
        startDate: { $gte: now, $lte: futureDate },
        status: 'active',
      })
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 })
      .exec();
  }

  async getEventsByDateRange(userEmail: string, startDate: Date, endDate: Date): Promise<Event[]> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    return this.eventModel
      .find({
        $or: [
          { createdBy: new Types.ObjectId(userId) },
          { 'attendees.userId': new Types.ObjectId(userId) },
        ],
        startDate: { $gte: startDate, $lte: endDate },
        status: 'active',
      })
      .populate('createdBy', 'name email')
      .populate('attendees.userId', 'name email')
      .sort({ startDate: 1 })
      .exec();
  }
}

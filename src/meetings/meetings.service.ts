import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Meeting } from './meeting.schema';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import * as crypto from 'crypto';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectModel(Meeting.name) private meetingModel: Model<Meeting>,
  ) {}

  private generateRoomId(): string {
    // Generate a URL-safe random string
    return crypto.randomBytes(9).toString('base64url').slice(0, 12);
  }

  async create(createMeetingDto: CreateMeetingDto, userId: string): Promise<Meeting> {
    const roomId = this.generateRoomId(); // Generate unique room ID

    const meeting = new this.meetingModel({
      ...createMeetingDto,
      roomId,
      createdBy: userId,
      participants: [userId],
      settings: {
        requiresAuth: createMeetingDto.requiresAuth ?? false,
        maxParticipants: createMeetingDto.maxParticipants ?? 50,
        recordingEnabled: createMeetingDto.recordingEnabled ?? false,
      },
    });

    return meeting.save();
  }

  async findAll(userId: string): Promise<Meeting[]> {
    return this.meetingModel
      .find({
        $or: [
          { createdBy: userId },
          { participants: userId },
        ],
      })
      .populate('createdBy', 'name email')
      .populate('participants', 'name email')
      .populate('relatedTasks', 'title status dueDate')
      .populate('relatedProjects', 'name status')
      .sort({ scheduledDate: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Meeting> {
    const meeting = await this.meetingModel
      .findById(id)
      .populate('createdBy', 'name email')
      .populate('participants', 'name email')
      .populate('relatedTasks', 'title status dueDate')
      .populate('relatedProjects', 'name status')
      .exec();

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }

  async findByRoomId(roomId: string): Promise<Meeting> {
    const meeting = await this.meetingModel
      .findOne({ roomId })
      .populate('createdBy', 'name email')
      .populate('participants', 'name email')
      .populate('relatedTasks', 'title status dueDate')
      .populate('relatedProjects', 'name status')
      .exec();

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }

  async update(id: string, updateMeetingDto: UpdateMeetingDto, userId: string): Promise<Meeting> {
    const meeting = await this.meetingModel.findById(id);

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.createdBy.toString() !== userId) {
      throw new ForbiddenException('You can only update meetings you created');
    }

    Object.assign(meeting, updateMeetingDto);
    return meeting.save();
  }

  async delete(id: string, userId: string): Promise<void> {
    const meeting = await this.meetingModel.findById(id);

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.createdBy.toString() !== userId) {
      throw new ForbiddenException('You can only delete meetings you created');
    }

    await meeting.deleteOne();
  }

  async joinMeeting(roomId: string, userId: string): Promise<Meeting> {
    const meeting = await this.meetingModel.findOne({ roomId });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Add user to participants if not already there
    if (!meeting.participants.includes(userId as any)) {
      meeting.participants.push(userId as any);
      await meeting.save();
    }

    // Update status to ongoing if it's scheduled
    if (meeting.status === 'scheduled') {
      meeting.status = 'ongoing';
      await meeting.save();
    }

    const updatedMeeting = await this.meetingModel
      .findById(meeting._id)
      .populate('createdBy', 'name email')
      .populate('participants', 'name email')
      .populate('relatedTasks', 'title status dueDate')
      .populate('relatedProjects', 'name status')
      .exec();

    if (!updatedMeeting) {
      throw new NotFoundException('Meeting not found after update');
    }

    return updatedMeeting;
  }

  async getUpcoming(userId: string, days: number = 7): Promise<Meeting[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.meetingModel
      .find({
        $or: [
          { createdBy: userId },
          { participants: userId },
        ],
        scheduledDate: {
          $gte: now,
          $lte: futureDate,
        },
        status: { $in: ['scheduled', 'ongoing'] },
      })
      .populate('createdBy', 'name email')
      .populate('participants', 'name email')
      .populate('relatedTasks', 'title status dueDate')
      .populate('relatedProjects', 'name status')
      .sort({ scheduledDate: 1 })
      .exec();
  }
}

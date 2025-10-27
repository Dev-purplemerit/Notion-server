import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post('events')
  async createEvent(@Body() createEventDto: CreateEventDto, @Request() req) {
    return this.calendarService.createEvent(createEventDto, req.user.email);
  }

  @Get('events')
  async getAllEvents(@Request() req) {
    return this.calendarService.findAll(req.user.email);
  }

  @Get('events/upcoming')
  async getUpcomingEvents(@Request() req, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 7;
    return this.calendarService.getUpcomingEvents(req.user.email, daysNum);
  }

  @Get('events/range')
  async getEventsByRange(
    @Request() req,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return this.calendarService.getEventsByDateRange(req.user.email, startDate, endDate);
  }

  @Get('events/:id')
  async getEvent(@Param('id') id: string) {
    return this.calendarService.findOne(id);
  }

  @Put('events/:id')
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req,
  ) {
    return this.calendarService.updateEvent(id, updateEventDto, req.user.email);
  }

  @Delete('events/:id')
  async deleteEvent(@Param('id') id: string, @Request() req) {
    await this.calendarService.deleteEvent(id, req.user.email);
    return { message: 'Event deleted successfully' };
  }

  @Patch('events/:id/attendee-status')
  async updateAttendeeStatus(
    @Param('id') id: string,
    @Body('status') status: 'accepted' | 'declined',
    @Request() req,
  ) {
    return this.calendarService.updateAttendeeStatus(id, req.user.email, status);
  }
}

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
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  create(@Body() createMeetingDto: CreateMeetingDto, @Request() req) {
    return this.meetingsService.create(createMeetingDto, req.user.sub);
  }

  @Get()
  findAll(@Request() req) {
    return this.meetingsService.findAll(req.user.sub);
  }

  @Get('upcoming')
  getUpcoming(@Request() req, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.meetingsService.getUpcoming(req.user.sub, daysNum);
  }

  @Get('room/:roomId')
  findByRoomId(@Param('roomId') roomId: string) {
    return this.meetingsService.findByRoomId(roomId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @Request() req,
  ) {
    return this.meetingsService.update(id, updateMeetingDto, req.user.sub);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) {
    return this.meetingsService.delete(id, req.user.sub);
  }

  @Post('join/:roomId')
  joinMeeting(@Param('roomId') roomId: string, @Request() req) {
    return this.meetingsService.joinMeeting(roomId, req.user.sub);
  }
}

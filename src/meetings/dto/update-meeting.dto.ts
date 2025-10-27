import { PartialType } from '@nestjs/mapped-types';
import { CreateMeetingDto } from './create-meeting.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {
  @IsEnum(['scheduled', 'ongoing', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;
}

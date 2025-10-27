import { IsString, IsNotEmpty, IsDateString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsArray()
  @IsOptional()
  relatedTasks?: string[];

  @IsArray()
  @IsOptional()
  relatedProjects?: string[];

  @IsBoolean()
  @IsOptional()
  requiresAuth?: boolean;

  @IsNumber()
  @IsOptional()
  maxParticipants?: number;

  @IsBoolean()
  @IsOptional()
  recordingEnabled?: boolean;
}

import { IsString, IsDate, IsBoolean, IsOptional, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  attendees?: string[]; // Array of user IDs

  @IsOptional()
  @IsArray()
  reminders?: Date[];

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    endDate: Date;
  };
}

import { IsString, IsOptional, IsArray, IsEnum, IsDateString, IsNumber } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  day?: string;

  @IsOptional()
  @IsNumber()
  startTime?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsEnum(['High', 'Medium', 'Low', 'Stand-by'])
  label?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  members?: string[]; // User IDs

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // Legacy fields (optional for backward compatibility)
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedTo?: string[];

  @IsOptional()
  @IsEnum(['todo', 'in-progress', 'done'])
  status?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

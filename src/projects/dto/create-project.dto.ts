import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsDateString, IsNumber, Min, Max } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  teamId?: string; // Auto-created, no longer required

  @IsEnum(['active', 'completed', 'archived'])
  @IsOptional()
  status?: string;

  @IsArray()
  @IsOptional()
  members?: string[];

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

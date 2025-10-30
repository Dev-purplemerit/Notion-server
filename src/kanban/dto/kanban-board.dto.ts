import { IsString, IsArray, IsOptional, IsBoolean, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class KanbanColumnDto {
  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  status: string[];

  @IsString()
  color: string;

  @IsNumber()
  order: number;
}

export class CreateKanbanBoardDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KanbanColumnDto)
  columns?: KanbanColumnDto[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateKanbanBoardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KanbanColumnDto)
  columns?: KanbanColumnDto[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Types } from 'mongoose';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsOptional()
  fileType?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsOptional()
  teamId?: string;
}

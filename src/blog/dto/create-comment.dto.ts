import { IsString, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  parentComment?: string; // For reply functionality
}

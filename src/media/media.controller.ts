import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AwsS3Service } from '../aws/aws-s3.service';
import { LoggerService } from '../common/services/logger.service';

@Controller('media')
export class MediaController {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

  constructor(
    private readonly s3Service: AwsS3Service,
    private readonly logger: LoggerService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      this.logger.warn(`File upload rejected: size ${file.size} exceeds limit of ${this.MAX_FILE_SIZE}`, 'MediaController');
      throw new BadRequestException(`File size exceeds maximum limit of 5MB. Uploaded file size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    try {
      // Upload the file to S3 and get the file URL
      const url = await this.s3Service.uploadFile(file);

      this.logger.log(`File uploaded successfully: ${file.originalname} (${(file.size / 1024).toFixed(2)}KB)`, 'MediaController');

      // Return the URL and file info in the response
      return {
        url,
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack, 'MediaController');
      throw new BadRequestException('File upload failed. Please try again.');
    }
  }
}

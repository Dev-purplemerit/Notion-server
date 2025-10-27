import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AwsS3Service } from '../aws/aws-s3.service';

@Controller('media')
export class MediaController {
  constructor(private readonly s3Service: AwsS3Service) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    // Upload the file to S3 and get the file URL
    const url = await this.s3Service.uploadFile(file);

    // Return the URL and file info in the response
    return {
      url,
      name: file.originalname,
      type: file.mimetype,
    };
  }
}

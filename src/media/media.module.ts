import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { AwsS3Service } from '../aws/aws-s3.service';

@Module({
  controllers: [MediaController],
  providers: [AwsS3Service],
  exports: [AwsS3Service],
})
export class MediaModule {}

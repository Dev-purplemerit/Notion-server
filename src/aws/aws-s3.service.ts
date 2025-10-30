import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { LoggerService } from '../common/services/logger.service';

@Injectable()
export class AwsS3Service {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.s3 = new S3Client({
      region: this.configService.get<string>('AWS_REGION')!,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });

    this.bucket = this.configService.get<string>('S3_BUCKET_NAME')!;
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    this.logger.log(`Uploading file: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`, 'AwsS3Service');

    // Replace spaces with underscores in the filename
    const sanitizedFilename = file.originalname.replace(/\s+/g, '_');
    const key = `${uuid()}-${sanitizedFilename}`;

    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await this.s3.send(new PutObjectCommand(params));

    // Use path-style URL to avoid SSL certificate issues with bucket names containing dots
    const region = this.configService.get<string>('AWS_REGION');
    const url = `https://s3.${region}.amazonaws.com/${this.bucket}/${key}`;

    this.logger.log(`Upload complete: ${url}`, 'AwsS3Service');
    return url;
  }
}

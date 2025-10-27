import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentModel, DocumentSchema } from './document.schema';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { UsersModule } from '../users/users.module';
import { AwsS3Service } from '../aws/aws-s3.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DocumentModel.name, schema: DocumentSchema }]),
    UsersModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, AwsS3Service],
  exports: [MongooseModule, DocumentsService],
})
export class DocumentsModule {}

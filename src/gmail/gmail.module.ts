import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GmailController } from './gmail.controller';
import { GmailService } from './gmail.service';
import { GmailToken, GmailTokenSchema } from './gmail.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GmailToken.name, schema: GmailTokenSchema },
    ]),
    UsersModule,
  ],
  controllers: [GmailController],
  providers: [GmailService],
  exports: [GmailService],
})
export class GmailModule {}

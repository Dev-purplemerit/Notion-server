import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { AwsS3Service } from './aws/aws-s3.service';
import { VideoModule } from './video/video.module';
import { CalendarModule } from './calendar/calendar.module';
import { BlogModule } from './blog/blog.module'; // Used by /community page
import { TeamsModule } from './teams/teams.module';
import { TasksModule } from './tasks/tasks.module';
import { DocumentsModule } from './documents/documents.module';
import { CommunityModule } from './community/community.module';
import { MeetingsModule } from './meetings/meetings.module';
import { ProjectsModule } from './projects/projects.module';
import { MediaModule } from './media/media.module';
import { PreferencesModule } from './preferences/preferences.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GmailModule } from './gmail/gmail.module';
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),

    AuthModule,
    ChatModule,
    VideoModule,
    CalendarModule,
    BlogModule, // Used by /community page
    TeamsModule,
    TasksModule,
    DocumentsModule,
    CommunityModule,
    MeetingsModule,
    ProjectsModule,
    MediaModule,
    PreferencesModule,
    DashboardModule,
    GmailModule,
    MessagingModule,
  ],
  controllers: [AppController],
  providers: [AppService, AwsS3Service],
})
export class AppModule {}

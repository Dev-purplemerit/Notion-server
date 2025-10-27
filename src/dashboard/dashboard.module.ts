import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User, UserSchema } from '../users/users.schema';
import { Project, ProjectSchema } from '../projects/project.schema';
import { Task, TaskSchema } from '../tasks/task.schema';
import { Team, TeamSchema } from '../teams/team.schema';
import { DocumentModel, DocumentSchema } from '../documents/document.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Team.name, schema: TeamSchema },
      { name: DocumentModel.name, schema: DocumentSchema },
    ]),
    UsersModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

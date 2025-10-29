import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './project.schema';
import { Task, TaskSchema } from '../tasks/task.schema';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    UsersModule,
    TeamsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [MongooseModule, ProjectsService],
})
export class ProjectsModule {}

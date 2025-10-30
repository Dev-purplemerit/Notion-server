import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KanbanController } from './kanban.controller';
import { KanbanService } from './kanban.service';
import { KanbanBoard, KanbanBoardSchema } from './kanban-board.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: KanbanBoard.name, schema: KanbanBoardSchema }]),
    UsersModule,
  ],
  controllers: [KanbanController],
  providers: [KanbanService],
  exports: [KanbanService],
})
export class KanbanModule {}
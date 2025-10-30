import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { KanbanService } from './kanban.service';
import { CreateKanbanBoardDto, UpdateKanbanBoardDto } from './dto/kanban-board.dto';

@Controller('kanban')
@UseGuards(JwtAuthGuard)
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Post('boards')
  async createOrUpdateBoard(@Body() createKanbanBoardDto: CreateKanbanBoardDto, @Request() req) {
    return this.kanbanService.createOrUpdateBoard(req.user.email, createKanbanBoardDto);
  }

  @Get('boards')
  async getBoardByProject(@Query('projectId') projectId: string, @Request() req) {
    return this.kanbanService.getBoardByProject(req.user.email, projectId);
  }

  @Get('boards/all')
  async getAllUserBoards(@Request() req) {
    return this.kanbanService.getAllUserBoards(req.user.email);
  }

  @Put('boards/:id')
  async updateBoard(
    @Param('id') id: string,
    @Body() updateKanbanBoardDto: UpdateKanbanBoardDto,
    @Request() req,
  ) {
    return this.kanbanService.updateBoard(req.user.email, id, updateKanbanBoardDto);
  }

  @Delete('boards/:id')
  async deleteBoard(@Param('id') id: string, @Request() req) {
    await this.kanbanService.deleteBoard(req.user.email, id);
    return { message: 'Kanban board deleted successfully' };
  }
}
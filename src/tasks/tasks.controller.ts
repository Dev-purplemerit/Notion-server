import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    return this.tasksService.create(createTaskDto, req.user.email);
  }

  @Get()
  async findAll(@Request() req, @Query('status') status?: string) {
    return this.tasksService.findAll(req.user.email, status);
  }

  @Get('upcoming')
  async findUpcoming(@Request() req, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 7;
    return this.tasksService.findUpcoming(req.user.email, daysNum);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.tasksService.findOne(id, req.user.email);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req,
  ) {
    return this.tasksService.update(id, updateTaskDto, req.user.email);
  }

  @Patch(':id/complete')
  async markAsCompleted(@Param('id') id: string, @Request() req) {
    return this.tasksService.markAsCompleted(id, req.user.email);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.tasksService.delete(id, req.user.email);
    return { message: 'Task deleted successfully' };
  }
}

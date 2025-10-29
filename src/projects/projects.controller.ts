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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    return this.projectsService.create(createProjectDto, req.user.email);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.projectsService.findAll(req.user.email, status, teamId);
  }

  @Get('team/:teamId')
  async findByTeam(@Param('teamId') teamId: string) {
    return this.projectsService.findByTeam(teamId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.projectsService.findOne(id, req.user.email);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req,
  ) {
    return this.projectsService.update(id, updateProjectDto, req.user.email);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.projectsService.delete(id, req.user.email);
    return { message: 'Project deleted successfully' };
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Request() req,
  ) {
    return this.projectsService.addMember(id, userId, req.user.email);
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.projectsService.removeMember(id, userId, req.user.email);
  }

  // Task management endpoints
  @Post(':id/tasks')
  async createTask(
    @Param('id') projectId: string,
    @Body() createTaskDto: any,
    @Request() req,
  ) {
    return this.projectsService.createTask(projectId, createTaskDto, req.user.email);
  }

  @Get(':id/tasks')
  async getProjectTasks(
    @Param('id') projectId: string,
    @Request() req,
  ) {
    return this.projectsService.findProjectTasks(projectId, req.user.email);
  }

  @Put(':id/tasks/:taskId')
  async updateTask(
    @Param('id') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: any,
    @Request() req,
  ) {
    return this.projectsService.updateProjectTask(projectId, taskId, updateTaskDto, req.user.email);
  }

  @Delete(':id/tasks/:taskId')
  async deleteTask(
    @Param('id') projectId: string,
    @Param('taskId') taskId: string,
    @Request() req,
  ) {
    await this.projectsService.deleteProjectTask(projectId, taskId, req.user.email);
    return { message: 'Task deleted successfully' };
  }
}

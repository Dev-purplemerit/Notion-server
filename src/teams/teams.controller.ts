import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Put, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Body() body: { name: string; description: string }, @Request() req) {
    return this.teamsService.create(body.name, body.description, req.user.email);
  }

  @Get()
  getUserTeams(@Request() req) {
    return this.teamsService.findUserTeams(req.user.email);
  }

  @Get(':id')
  getTeam(@Param('id') id: string, @Request() req) {
    return this.teamsService.findOne(id, req.user.email);
  }

  @Get('task/:taskId')
  getTeamByTask(@Param('taskId') taskId: string) {
    return this.teamsService.findByTaskId(taskId);
  }

  @Get('project/:projectId')
  getTeamByProject(@Param('projectId') projectId: string) {
    return this.teamsService.findByProjectId(projectId);
  }

  @Patch(':id/admin')
  changeAdmin(@Param('id') id: string, @Body() body: { adminId: string }, @Request() req) {
    return this.teamsService.changeAdmin(id, body.adminId, req.user.email);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() body: { userId: string; role: string }, @Request() req) {
    return this.teamsService.addMember(id, body.userId, body.role, req.user.email);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
    return this.teamsService.removeMember(id, userId, req.user.email);
  }
}

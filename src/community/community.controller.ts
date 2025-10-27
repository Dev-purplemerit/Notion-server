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
import { CommunityService } from './community.service';
import { CreateLearningDto, UpdateLearningDto, CreateReferenceDto, UpdateReferenceDto } from './dto/community.dto';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // Learning endpoints
  @Get('learnings')
  async getAllLearnings(
    @Query('category') category?: string,
    @Query('isPublished') isPublished?: string,
  ) {
    const filter: any = {};
    if (category) filter.category = category;
    if (isPublished !== undefined) filter.isPublished = isPublished === 'true';
    
    return this.communityService.getAllLearnings(filter);
  }

  @Get('learnings/:id')
  async getLearningById(@Param('id') id: string) {
    return this.communityService.getLearningById(id);
  }

  @Post('learnings')
  @UseGuards(JwtAuthGuard)
  async createLearning(@Body() dto: CreateLearningDto, @Request() req) {
    return this.communityService.createLearning(dto, req.user.email);
  }

  @Put('learnings/:id')
  @UseGuards(JwtAuthGuard)
  async updateLearning(
    @Param('id') id: string,
    @Body() dto: UpdateLearningDto,
    @Request() req,
  ) {
    return this.communityService.updateLearning(id, dto, req.user.email);
  }

  @Delete('learnings/:id')
  @UseGuards(JwtAuthGuard)
  async deleteLearning(@Param('id') id: string, @Request() req) {
    await this.communityService.deleteLearning(id, req.user.email);
    return { message: 'Learning deleted successfully' };
  }

  // Reference endpoints
  @Get('references')
  async getAllReferences(
    @Query('category') category?: string,
    @Query('isPublished') isPublished?: string,
  ) {
    const filter: any = {};
    if (category) filter.category = category;
    if (isPublished !== undefined) filter.isPublished = isPublished === 'true';
    
    return this.communityService.getAllReferences(filter);
  }

  @Get('references/:id')
  async getReferenceById(@Param('id') id: string) {
    return this.communityService.getReferenceById(id);
  }

  @Post('references')
  @UseGuards(JwtAuthGuard)
  async createReference(@Body() dto: CreateReferenceDto, @Request() req) {
    return this.communityService.createReference(dto, req.user.email);
  }

  @Put('references/:id')
  @UseGuards(JwtAuthGuard)
  async updateReference(
    @Param('id') id: string,
    @Body() dto: UpdateReferenceDto,
    @Request() req,
  ) {
    return this.communityService.updateReference(id, dto, req.user.email);
  }

  @Delete('references/:id')
  @UseGuards(JwtAuthGuard)
  async deleteReference(@Param('id') id: string, @Request() req) {
    await this.communityService.deleteReference(id, req.user.email);
    return { message: 'Reference deleted successfully' };
  }
}

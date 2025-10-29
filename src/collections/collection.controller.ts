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
import { CollectionService } from './collection.service';
import type { CreateCollectionDto, UpdateCollectionDto } from './collection.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  /**
   * Create a new collection
   * POST /collections
   */
  @Post()
  async create(@Request() req, @Body() createDto: CreateCollectionDto) {
    const userId = req.user.sub;
    const collection = await this.collectionService.create(userId, createDto);

    return {
      success: true,
      collection,
    };
  }

  /**
   * Get all collections for current user
   * GET /collections?status=draft|published
   */
  @Get()
  async findAll(@Request() req, @Query('status') status?: 'draft' | 'published') {
    const userId = req.user.sub;
    const collections = await this.collectionService.findAllByUser(userId, status);

    return {
      success: true,
      collections,
    };
  }

  /**
   * Get recent drafts
   * GET /collections/drafts/recent?limit=10
   */
  @Get('drafts/recent')
  async getRecentDrafts(@Request() req, @Query('limit') limit?: string) {
    const userId = req.user.sub;
    const drafts = await this.collectionService.getRecentDrafts(
      userId,
      limit ? parseInt(limit) : 10,
    );

    return {
      success: true,
      drafts,
    };
  }

  /**
   * Get published collections
   * GET /collections/published?limit=20
   */
  @Get('published')
  async getPublished(@Request() req, @Query('limit') limit?: string) {
    const userId = req.user.sub;
    const collections = await this.collectionService.getPublished(
      userId,
      limit ? parseInt(limit) : undefined,
    );

    return {
      success: true,
      collections,
    };
  }

  /**
   * Get collections by project
   * GET /collections/project/:projectId?status=published
   */
  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('status') status?: 'draft' | 'published',
  ) {
    const collections = await this.collectionService.findByProject(projectId, status);

    return {
      success: true,
      collections,
    };
  }

  /**
   * Get a single collection by ID
   * GET /collections/:id
   */
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    const collection = await this.collectionService.findById(id, userId);

    return {
      success: true,
      collection,
    };
  }

  /**
   * Update a collection
   * PUT /collections/:id
   */
  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateCollectionDto,
  ) {
    const userId = req.user.sub;
    const collection = await this.collectionService.update(id, userId, updateDto);

    return {
      success: true,
      collection,
    };
  }

  /**
   * Delete a collection
   * DELETE /collections/:id
   */
  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    await this.collectionService.delete(id, userId);

    return {
      success: true,
      message: 'Collection deleted successfully',
    };
  }

  /**
   * Share a collection with users
   * POST /collections/:id/share
   */
  @Post(':id/share')
  async share(
    @Request() req,
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
  ) {
    const userId = req.user.sub;
    const collection = await this.collectionService.share(id, userId, userIds);

    return {
      success: true,
      collection,
    };
  }
}

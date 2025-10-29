import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Collection, CollectionDocument, CellContent } from './collection.schema';

export interface CreateCollectionDto {
  name: string;
  rows: number;
  cols: number;
  cells: { [key: string]: CellContent };
  projectId?: string;
  status?: 'draft' | 'published';
  thumbnail?: string;
}

export interface UpdateCollectionDto {
  name?: string;
  rows?: number;
  cols?: number;
  cells?: { [key: string]: CellContent };
  status?: 'draft' | 'published';
  thumbnail?: string;
  projectId?: string;
}

@Injectable()
export class CollectionService {
  constructor(
    @InjectModel(Collection.name)
    private collectionModel: Model<CollectionDocument>,
  ) {}

  /**
   * Create a new collection
   */
  async create(
    userId: string,
    createDto: CreateCollectionDto,
  ): Promise<CollectionDocument> {
    const collection = new this.collectionModel({
      ...createDto,
      userId: new Types.ObjectId(userId),
      projectId: createDto.projectId
        ? new Types.ObjectId(createDto.projectId)
        : undefined,
      status: createDto.status || 'draft',
    });

    return await collection.save();
  }

  /**
   * Get all collections for a user
   */
  async findAllByUser(
    userId: string,
    status?: 'draft' | 'published',
  ): Promise<CollectionDocument[]> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }

    return await this.collectionModel
      .find(query)
      .sort({ updatedAt: -1 })
      .populate('projectId', 'name')
      .populate('userId', 'name email')
      .exec();
  }

  /**
   * Get collections by project
   */
  async findByProject(
    projectId: string,
    status?: 'draft' | 'published',
  ): Promise<CollectionDocument[]> {
    const query: any = { projectId: new Types.ObjectId(projectId) };
    if (status) {
      query.status = status;
    }

    return await this.collectionModel
      .find(query)
      .sort({ updatedAt: -1 })
      .populate('userId', 'name email')
      .exec();
  }

  /**
   * Get a single collection by ID
   */
  async findById(
    collectionId: string,
    userId: string,
  ): Promise<CollectionDocument> {
    const collection = await this.collectionModel
      .findById(collectionId)
      .populate('projectId', 'name')
      .populate('userId', 'name email')
      .populate('sharedWith', 'name email')
      .exec();

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Check if user has access (owner or shared with)
    const hasAccess =
      collection.userId._id.toString() === userId ||
      collection.sharedWith.some((user: any) => user._id.toString() === userId);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this collection');
    }

    return collection;
  }

  /**
   * Update a collection
   */
  async update(
    collectionId: string,
    userId: string,
    updateDto: UpdateCollectionDto,
  ): Promise<CollectionDocument> {
    const collection = await this.collectionModel.findById(collectionId);

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Check if user is the owner
    if (collection.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this collection',
      );
    }

    // Update fields
    Object.assign(collection, updateDto);

    if (updateDto.projectId) {
      collection.projectId = new Types.ObjectId(updateDto.projectId);
    }

    return await collection.save();
  }

  /**
   * Delete a collection
   */
  async delete(collectionId: string, userId: string): Promise<void> {
    const collection = await this.collectionModel.findById(collectionId);

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Check if user is the owner
    if (collection.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this collection',
      );
    }

    await this.collectionModel.findByIdAndDelete(collectionId);
  }

  /**
   * Share collection with users
   */
  async share(
    collectionId: string,
    userId: string,
    userIdsToShare: string[],
  ): Promise<CollectionDocument> {
    const collection = await this.collectionModel.findById(collectionId);

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Check if user is the owner
    if (collection.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to share this collection',
      );
    }

    // Add users to sharedWith array (avoid duplicates)
    const existingIds = collection.sharedWith.map((id) => id.toString());
    const newIds = userIdsToShare
      .filter((id) => !existingIds.includes(id))
      .map((id) => new Types.ObjectId(id));

    collection.sharedWith.push(...newIds);
    return await collection.save();
  }

  /**
   * Get recent drafts for a user
   */
  async getRecentDrafts(
    userId: string,
    limit: number = 10,
  ): Promise<CollectionDocument[]> {
    return await this.collectionModel
      .find({
        userId: new Types.ObjectId(userId),
        status: 'draft',
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get published collections for a user
   */
  async getPublished(
    userId: string,
    limit?: number,
  ): Promise<CollectionDocument[]> {
    const query = this.collectionModel
      .find({
        userId: new Types.ObjectId(userId),
        status: 'published',
      })
      .sort({ updatedAt: -1 });

    if (limit) {
      query.limit(limit);
    }

    return await query.exec();
  }

  /**
   * Calculate and update collection size
   */
  private calculateSize(cells: { [key: string]: CellContent }): string {
    // Simple estimation based on content
    const jsonSize = JSON.stringify(cells).length;
    const sizeInKB = jsonSize / 1024;

    if (sizeInKB < 1024) {
      return `${Math.round(sizeInKB)}kb`;
    } else {
      return `${Math.round(sizeInKB / 1024)}mb`;
    }
  }

  /**
   * Generate thumbnail from collection cells
   */
  private generateThumbnail(cells: { [key: string]: CellContent }): string | undefined {
    // Find the first image in cells
    for (const cell of Object.values(cells)) {
      if (cell.type === 'image' && cell.data) {
        return cell.data as string;
      }
    }
    return undefined;
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Learning, LearningDocument, Reference, ReferenceDocument } from './community.schema';
import { CreateLearningDto, UpdateLearningDto, CreateReferenceDto, UpdateReferenceDto } from './dto/community.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class CommunityService {
  constructor(
    @InjectModel(Learning.name) private learningModel: Model<LearningDocument>,
    @InjectModel(Reference.name) private referenceModel: Model<ReferenceDocument>,
    private usersService: UsersService,
  ) {}

  // Learning methods
  async createLearning(dto: CreateLearningDto, userEmail: string): Promise<Learning> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const learning = new this.learningModel({
      ...dto,
      createdBy: userId,
    });
    return learning.save();
  }

  async getAllLearnings(filter?: { category?: string; isPublished?: boolean }): Promise<Learning[]> {
    const query: any = {};

    if (filter?.category) {
      query.category = filter.category;
    }

    if (filter?.isPublished !== undefined) {
      query.isPublished = filter.isPublished;
    }

    return this.learningModel
      .find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getLearningById(id: string): Promise<Learning> {
    const learning = await this.learningModel
      .findById(id)
      .populate('createdBy', 'name email')
      .exec();

    if (!learning) {
      throw new NotFoundException(`Learning with ID ${id} not found`);
    }

    // Increment view count
    learning.viewCount += 1;
    await learning.save();

    return learning;
  }

  async updateLearning(id: string, dto: UpdateLearningDto, userEmail: string): Promise<Learning> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const learning = await this.learningModel.findById(id);

    if (!learning) {
      throw new NotFoundException(`Learning with ID ${id} not found`);
    }

    if (learning.createdBy.toString() !== userId) {
      throw new ForbiddenException('You can only update your own learnings');
    }

    Object.assign(learning, dto);
    return learning.save();
  }

  async deleteLearning(id: string, userEmail: string): Promise<void> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const learning = await this.learningModel.findById(id);

    if (!learning) {
      throw new NotFoundException(`Learning with ID ${id} not found`);
    }

    if (learning.createdBy.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own learnings');
    }

    await this.learningModel.findByIdAndDelete(id);
  }

  // Reference methods
  async createReference(dto: CreateReferenceDto, userEmail: string): Promise<Reference> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const reference = new this.referenceModel({
      ...dto,
      createdBy: userId,
    });
    return reference.save();
  }

  async getAllReferences(filter?: { category?: string; isPublished?: boolean }): Promise<Reference[]> {
    const query: any = {};

    if (filter?.category) {
      query.category = filter.category;
    }

    if (filter?.isPublished !== undefined) {
      query.isPublished = filter.isPublished;
    }

    return this.referenceModel
      .find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getReferenceById(id: string): Promise<Reference> {
    const reference = await this.referenceModel
      .findById(id)
      .populate('createdBy', 'name email')
      .exec();

    if (!reference) {
      throw new NotFoundException(`Reference with ID ${id} not found`);
    }

    // Increment view count
    reference.viewCount += 1;
    await reference.save();

    return reference;
  }

  async updateReference(id: string, dto: UpdateReferenceDto, userEmail: string): Promise<Reference> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const reference = await this.referenceModel.findById(id);

    if (!reference) {
      throw new NotFoundException(`Reference with ID ${id} not found`);
    }

    if (reference.createdBy.toString() !== userId) {
      throw new ForbiddenException('You can only update your own references');
    }

    Object.assign(reference, dto);
    return reference.save();
  }

  async deleteReference(id: string, userEmail: string): Promise<void> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const reference = await this.referenceModel.findById(id);

    if (!reference) {
      throw new NotFoundException(`Reference with ID ${id} not found`);
    }

    if (reference.createdBy.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own references');
    }

    await this.referenceModel.findByIdAndDelete(id);
  }
}

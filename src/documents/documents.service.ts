import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentModel, DocumentDocument } from './document.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentModel.name) private documentModel: Model<DocumentDocument>,
    private usersService: UsersService,
  ) {}

  async create(createDocumentDto: CreateDocumentDto, userEmail: string): Promise<DocumentDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const document = new this.documentModel({
      ...createDocumentDto,
      uploadedBy: user._id,
      teamId: createDocumentDto.teamId ? new Types.ObjectId(createDocumentDto.teamId) : undefined,
    });

    return document.save();
  }

  async findAll(userEmail: string, teamId?: string): Promise<DocumentDocument[]> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const filter: any = { uploadedBy: user._id };
    if (teamId) {
      filter.teamId = new Types.ObjectId(teamId);
    }

    return this.documentModel
      .find(filter)
      .populate('uploadedBy', 'name email')
      .populate('teamId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userEmail: string): Promise<DocumentDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const document = await this.documentModel
      .findById(id)
      .populate('uploadedBy', 'name email')
      .populate('teamId', 'name')
      .exec();

    if (!document) throw new NotFoundException('Document not found');

    // Check if user has access (uploaded by user or part of team)
  if ((document.uploadedBy._id as any).toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, userEmail: string): Promise<DocumentDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const document = await this.documentModel.findById(id);
    if (!document) throw new NotFoundException('Document not found');

  if (document.uploadedBy.toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('You can only update your own documents');
    }

    Object.assign(document, updateDocumentDto);
    if (updateDocumentDto.teamId) {
      document.teamId = new Types.ObjectId(updateDocumentDto.teamId);
    }

    return document.save();
  }

  async delete(id: string, userEmail: string): Promise<void> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const document = await this.documentModel.findById(id);
    if (!document) throw new NotFoundException('Document not found');

  if (document.uploadedBy.toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('You can only delete your own documents');
    }

    await this.documentModel.findByIdAndDelete(id);
  }

  async findByTeam(teamId: string): Promise<DocumentDocument[]> {
    return this.documentModel
      .find({ teamId: new Types.ObjectId(teamId) })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }
}

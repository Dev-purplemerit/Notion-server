import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { KanbanBoard, KanbanBoardDocument } from './kanban-board.schema';
import { CreateKanbanBoardDto, UpdateKanbanBoardDto } from './dto/kanban-board.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class KanbanService {
  constructor(
    @InjectModel(KanbanBoard.name) private kanbanBoardModel: Model<KanbanBoardDocument>,
    private usersService: UsersService,
  ) {}

  async createOrUpdateBoard(userEmail: string, createKanbanBoardDto: CreateKanbanBoardDto): Promise<KanbanBoardDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const filter: any = { userId: user._id };
    if (createKanbanBoardDto.projectId) {
      filter.projectId = new Types.ObjectId(createKanbanBoardDto.projectId);
    } else {
      filter.projectId = { $exists: false };
    }

    // Check if board already exists
    const existingBoard = await this.kanbanBoardModel.findOne(filter);

    if (existingBoard) {
      // Update existing board
      if (createKanbanBoardDto.name) existingBoard.name = createKanbanBoardDto.name;
      if (createKanbanBoardDto.columns) existingBoard.columns = createKanbanBoardDto.columns;
      if (createKanbanBoardDto.isDefault !== undefined) existingBoard.isDefault = createKanbanBoardDto.isDefault;
      existingBoard.updatedAt = new Date();
      
      return existingBoard.save();
    } else {
      // Create new board
      const newBoard = new this.kanbanBoardModel({
        userId: user._id,
        projectId: createKanbanBoardDto.projectId ? new Types.ObjectId(createKanbanBoardDto.projectId) : undefined,
        name: createKanbanBoardDto.name || (createKanbanBoardDto.projectId ? 'Project Board' : 'Default Board'),
        columns: createKanbanBoardDto.columns || [
          { title: 'To-do', status: ['todo'], color: '#E8E4FF', order: 0 },
          { title: 'In progress', status: ['in-progress'], color: '#FFE8D9', order: 1 },
          { title: 'Review', status: ['review'], color: '#FFF4D9', order: 2 },
          { title: 'Completed', status: ['completed'], color: '#D9FFE8', order: 3 },
        ],
        isDefault: createKanbanBoardDto.isDefault ?? true,
      });

      return newBoard.save();
    }
  }

  async getBoardByProject(userEmail: string, projectId?: string): Promise<KanbanBoardDocument | null> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const filter: any = { userId: user._id };
    if (projectId) {
      filter.projectId = new Types.ObjectId(projectId);
    } else {
      filter.projectId = { $exists: false };
    }

    const board = await this.kanbanBoardModel.findOne(filter);
    
    // If no board exists, create default one
    if (!board) {
      return this.createOrUpdateBoard(userEmail, {
        projectId,
        name: projectId ? 'Project Board' : 'Default Board',
      });
    }

    return board;
  }

  async updateBoard(userEmail: string, boardId: string, updateKanbanBoardDto: UpdateKanbanBoardDto): Promise<KanbanBoardDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const board = await this.kanbanBoardModel.findOne({
      _id: new Types.ObjectId(boardId),
      userId: user._id,
    });

    if (!board) throw new NotFoundException('Kanban board not found');

    if (updateKanbanBoardDto.name) board.name = updateKanbanBoardDto.name;
    if (updateKanbanBoardDto.columns) board.columns = updateKanbanBoardDto.columns;
    if (updateKanbanBoardDto.isDefault !== undefined) board.isDefault = updateKanbanBoardDto.isDefault;
    board.updatedAt = new Date();

    return board.save();
  }

  async getAllUserBoards(userEmail: string): Promise<KanbanBoardDocument[]> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    return this.kanbanBoardModel
      .find({ userId: user._id })
      .populate('projectId', 'name description')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async deleteBoard(userEmail: string, boardId: string): Promise<void> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const result = await this.kanbanBoardModel.deleteOne({
      _id: new Types.ObjectId(boardId),
      userId: user._id,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Kanban board not found');
    }
  }
}
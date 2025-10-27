import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private usersService: UsersService,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
  ) {}

  async create(createTaskDto: CreateTaskDto, userEmail: string): Promise<Task> {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const assignedTo = createTaskDto.assignedTo?.map((id) => new Types.ObjectId(id)) || [];

    const task = new this.taskModel({
      ...createTaskDto,
      owner: new Types.ObjectId(userId),
      admin: new Types.ObjectId(userId), // Initially owner is also admin
      createdBy: new Types.ObjectId(userId),
      assignedTo,
      projectId: createTaskDto.projectId ? new Types.ObjectId(createTaskDto.projectId) : null,
      dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
      startDate: createTaskDto.startDate ? new Date(createTaskDto.startDate) : null,
      endDate: createTaskDto.endDate ? new Date(createTaskDto.endDate) : null,
    });

    const savedTask = await task.save();

    // Automatically create a team for this task
    // Get all member IDs from the members field
    const memberIds = createTaskDto.members || [];
    
    // Also add assignedTo if provided (for backward compatibility)
    if (createTaskDto.assignedTo && createTaskDto.assignedTo.length > 0) {
      memberIds.push(...createTaskDto.assignedTo);
    }

    try {
      const team = await this.teamsService.createFromTask(
        (savedTask as any)._id.toString(),
        savedTask.title,
        userEmail,
        memberIds
      );
      
      // Update task with teamId
      savedTask.teamId = (team as any)._id;
      await savedTask.save();
    } catch (error) {
      // Log error but don't fail task creation if team creation fails
      console.error('Failed to create team for task:', error);
    }

    return savedTask;
  }

  async findAll(userEmail: string, status?: string): Promise<Task[]> {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const query: any = {
      $or: [
        { owner: new Types.ObjectId(userId) },
        { members: userId },
      ],
    };

    if (status) {
      query.status = status;
    }

    return this.taskModel
      .find(query)
      .populate('owner', 'name email')
      .populate('admin', 'name email')
      .populate('teamId', 'name members')
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userEmail: string): Promise<Task> {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const task = await this.taskModel
      .findOne({
        _id: id,
        $or: [
          { owner: new Types.ObjectId(userId) },
          { members: userId },
        ],
      })
      .populate('owner', 'name email')
      .populate('admin', 'name email')
      .populate('teamId', 'name members owner admin')
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name')
      .exec();

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found or you don't have permission`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userEmail: string): Promise<Task> {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const task = await this.taskModel.findOne({
      _id: id,
      $or: [
        { owner: new Types.ObjectId(userId) },
        { admin: new Types.ObjectId(userId) },
        { members: userId },
      ],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found or you don't have permission`);
    }

    if (updateTaskDto.assignedTo) {
      task.assignedTo = updateTaskDto.assignedTo.map((id) => new Types.ObjectId(id));
    }

    if (updateTaskDto.projectId) {
      task.projectId = new Types.ObjectId(updateTaskDto.projectId);
    }

    if (updateTaskDto.dueDate) {
      task.dueDate = new Date(updateTaskDto.dueDate);
    }

    if (updateTaskDto.startDate) {
      task.startDate = new Date(updateTaskDto.startDate);
    }

    if (updateTaskDto.endDate) {
      task.endDate = new Date(updateTaskDto.endDate);
    }

    Object.assign(task, updateTaskDto);
    const updatedTask = await task.save();

    // Update team members if members changed
    if (updateTaskDto.members) {
      try {
        await this.teamsService.updateTeamMembers(id, updateTaskDto.members);
      } catch (error) {
        console.error('Failed to update team members:', error);
      }
    }

    return updatedTask;
  }

  async delete(id: string, userEmail: string): Promise<void> {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const result = await this.taskModel.deleteOne({
      _id: id,
      owner: new Types.ObjectId(userId), // Only owner can delete
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Task with ID ${id} not found or you don't have permission to delete`);
    }

    // Delete associated team
    try {
      await this.teamsService.deleteByTaskId(id);
    } catch (error) {
      console.error('Failed to delete team for task:', error);
    }
  }

  async markAsCompleted(id: string, userEmail: string): Promise<Task> {
    return this.update(id, { status: 'done' }, userEmail);
  }

  async findByStatus(userEmail: string, status: string): Promise<Task[]> {
    return this.findAll(userEmail, status);
  }

  async findUpcoming(userEmail: string, days: number = 7): Promise<Task[]> {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.taskModel
      .find({
        $and: [
          {
            $or: [
              { owner: new Types.ObjectId(userId) },
              { members: userId },
            ],
          },
          {
            $or: [
              { dueDate: { $gte: now, $lte: futureDate } },
              { startDate: { $gte: now, $lte: futureDate } },
            ],
          },
        ],
      })
      .populate('owner', 'name email')
      .populate('admin', 'name email')
      .populate('teamId', 'name members')
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name')
      .sort({ startDate: 1, dueDate: 1 })
      .exec();
  }
}

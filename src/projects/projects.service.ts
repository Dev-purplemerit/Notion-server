import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';
import { Task, TaskDocument } from '../tasks/task.schema';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private usersService: UsersService,
    private teamsService: TeamsService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userEmail: string): Promise<ProjectDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    // Create project first without teamId
    const project = new this.projectModel({
      name: createProjectDto.name,
      description: createProjectDto.description,
      status: createProjectDto.status || 'active',
      createdBy: user._id,
      members: createProjectDto.members?.map(id => new Types.ObjectId(id)) || [],
      progress: createProjectDto.progress ?? 0,
      startDate: createProjectDto.startDate ? new Date(createProjectDto.startDate) : undefined,
      endDate: createProjectDto.endDate ? new Date(createProjectDto.endDate) : undefined,
    });

    const savedProject = await project.save();

    // Auto-create team for this project
    try {
      const team = await this.teamsService.createFromProject(
        (savedProject._id as any).toString(),
        createProjectDto.name,
        userEmail,
        createProjectDto.members || [],
      );

      // Update project with teamId
      savedProject.teamId = (team as any)._id;
      await savedProject.save();
    } catch (error) {
      // If team creation fails, log error but don't fail project creation
      console.error('Failed to create team for project:', error);
    }

    // Create initial tasks if provided
    if (createProjectDto.tasks && createProjectDto.tasks.length > 0) {
      try {
        const taskPromises = createProjectDto.tasks.map(taskData => {
          const task = new this.taskModel({
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority || 'Medium',
            timeTracker: taskData.timeTracker,
            taskStatus: taskData.taskStatus || 'To Be Done',
            projectId: savedProject._id,
            createdBy: user._id,
            owner: user._id,
            admin: user._id,
            assignedBy: user._id,
            teamId: savedProject.teamId,
            assignedTo: taskData.assignedTo?.map(id => new Types.ObjectId(id)) || [],
          });
          return task.save();
        });
        await Promise.all(taskPromises);
      } catch (error) {
        console.error('Failed to create initial tasks:', error);
      }
    }

    return this.projectModel
      .findById((savedProject._id as any))
      .populate('teamId', 'name members')
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .exec() as Promise<ProjectDocument>;
  }

  async findAll(userEmail: string, status?: string, teamId?: string): Promise<ProjectDocument[]> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    let filter: any = {};

    // If user is admin, show all projects, otherwise filter by membership
    if (user.role !== 'admin') {
      filter = {
        $or: [
          { createdBy: user._id },
          { members: user._id },
        ],
      };
    }

    if (status) filter.status = status;
    if (teamId) filter.teamId = new Types.ObjectId(teamId);

    return this.projectModel
      .find(filter)
      .populate('teamId', 'name description')
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userEmail: string): Promise<ProjectDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const project = await this.projectModel
      .findById(id)
      .populate('teamId', 'name description')
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .exec();

    if (!project) throw new NotFoundException('Project not found');

    // Admin users have access to all projects
    if (user.role === 'admin') {
      return project;
    }

    // Check if regular user has access
    const hasAccess =
      (project.createdBy._id as any).toString() === (user._id as any).toString() ||
      project.members.some((member: any) => (member._id as any).toString() === (user._id as any).toString());

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userEmail: string): Promise<ProjectDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');

    // Admin users can update any project, regular users can only update projects they created
    if (user.role !== 'admin' && project.createdBy.toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('Only the project creator or admin can update this project');
    }

    if (updateProjectDto.members) {
      project.members = updateProjectDto.members.map(id => new Types.ObjectId(id));

      // Sync team members
      try {
        await this.teamsService.updateProjectTeamMembers(id, updateProjectDto.members);
      } catch (error) {
        console.error('Failed to update team members:', error);
      }
    }

    if (updateProjectDto.startDate) {
      project.startDate = new Date(updateProjectDto.startDate);
    }

    if (updateProjectDto.endDate) {
      project.endDate = new Date(updateProjectDto.endDate);
    }

    Object.assign(project, {
      name: updateProjectDto.name ?? project.name,
      description: updateProjectDto.description ?? project.description,
      status: updateProjectDto.status ?? project.status,
      progress: updateProjectDto.progress ?? project.progress,
    });

    return project.save();
  }

  async delete(id: string, userEmail: string): Promise<void> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');

    // Admin users can delete any project, regular users can only delete projects they created
    if (user.role !== 'admin' && project.createdBy.toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('Only the project creator or admin can delete this project');
    }

    // Delete associated team
    try {
      await this.teamsService.deleteByProjectId(id);
    } catch (error) {
      console.error('Failed to delete team for project:', error);
    }

    await this.projectModel.findByIdAndDelete(id);
  }

  async addMember(id: string, userId: string, userEmail: string): Promise<ProjectDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');

    // Admin users can add members to any project, regular users can only add to projects they created
    if (user.role !== 'admin' && project.createdBy.toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('Only the project creator or admin can add members');
    }

    const memberObjectId = new Types.ObjectId(userId);
    if (!project.members.some(m => m.toString() === memberObjectId.toString())) {
      project.members.push(memberObjectId);
      await project.save();

      // Sync with team
      try {
        const memberIds = project.members.map(m => m.toString());
        await this.teamsService.updateProjectTeamMembers(id, memberIds);
      } catch (error) {
        console.error('Failed to update team members:', error);
      }
    }

    const updatedProject = await this.projectModel
      .findById(id)
      .populate('teamId', 'name description')
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .exec();
    if (!updatedProject) throw new NotFoundException('Project not found');
    return updatedProject;
  }

  async removeMember(id: string, userId: string, userEmail: string): Promise<ProjectDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');

    // Admin users can remove members from any project, regular users can only remove from projects they created
    if (user.role !== 'admin' && project.createdBy.toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('Only the project creator or admin can remove members');
    }

    project.members = project.members.filter(m => m.toString() !== userId);
    await project.save();

    // Sync with team
    try {
      const memberIds = project.members.map(m => m.toString());
      await this.teamsService.updateProjectTeamMembers(id, memberIds);
    } catch (error) {
      console.error('Failed to update team members:', error);
    }

    const updatedProject = await this.projectModel
      .findById(id)
      .populate('teamId', 'name description')
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .exec();
    if (!updatedProject) throw new NotFoundException('Project not found');
    return updatedProject;
  }

  async findByTeam(teamId: string): Promise<ProjectDocument[]> {
    return this.projectModel
      .find({ teamId: new Types.ObjectId(teamId) })
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Task management methods
  async createTask(projectId: string, createTaskDto: any, userEmail: string): Promise<TaskDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    // Check if user has access to the project
    const hasAccess =
      (project.createdBy as any).toString() === (user._id as any).toString() ||
      project.members.some((member: any) => member.toString() === (user._id as any).toString());

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const task = new this.taskModel({
      ...createTaskDto,
      projectId: new Types.ObjectId(projectId),
      createdBy: user._id,
      owner: user._id,
      admin: user._id,
      assignedBy: createTaskDto.assignedBy ? new Types.ObjectId(createTaskDto.assignedBy) : user._id,
      assignedTo: createTaskDto.assignedTo?.map((id: string) => new Types.ObjectId(id)) || [],
      teamId: project.teamId,
      dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
      startDate: createTaskDto.startDate ? new Date(createTaskDto.startDate) : null,
      endDate: createTaskDto.endDate ? new Date(createTaskDto.endDate) : null,
    });

    return task.save();
  }

  async findProjectTasks(projectId: string, userEmail: string): Promise<TaskDocument[]> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    // Admin users have access to all project tasks
    if (user.role !== 'admin') {
      // Check if regular user has access to the project
      const hasAccess =
        (project.createdBy as any).toString() === (user._id as any).toString() ||
        project.members.some((member: any) => member.toString() === (user._id as any).toString());

      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    return this.taskModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .populate('createdBy', 'name email')
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateProjectTask(projectId: string, taskId: string, updateTaskDto: any, userEmail: string): Promise<TaskDocument> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    // Check if user has access to the project
    const hasAccess =
      (project.createdBy as any).toString() === (user._id as any).toString() ||
      project.members.some((member: any) => member.toString() === (user._id as any).toString());

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const task = await this.taskModel.findOne({
      _id: taskId,
      projectId: new Types.ObjectId(projectId),
    });

    if (!task) throw new NotFoundException('Task not found');

    if (updateTaskDto.assignedTo) {
      task.assignedTo = updateTaskDto.assignedTo.map((id: string) => new Types.ObjectId(id));
    }

    if (updateTaskDto.assignedBy) {
      task.assignedBy = new Types.ObjectId(updateTaskDto.assignedBy);
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
    return task.save();
  }

  async deleteProjectTask(projectId: string, taskId: string, userEmail: string): Promise<void> {
    const user = await this.usersService.findByEmail(userEmail);
    if (!user) throw new NotFoundException('User not found');

    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    // Check if user has access to the project
    const hasAccess =
      (project.createdBy as any).toString() === (user._id as any).toString() ||
      project.members.some((member: any) => member.toString() === (user._id as any).toString());

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const result = await this.taskModel.deleteOne({
      _id: taskId,
      projectId: new Types.ObjectId(projectId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Task not found');
    }
  }
}

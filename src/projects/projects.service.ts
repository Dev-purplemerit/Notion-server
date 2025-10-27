import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
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

    const filter: any = {
      $or: [
        { createdBy: user._id },
        { members: user._id },
      ],
    };

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

    // Check if user has access
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

      if (project.createdBy.toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('Only the project creator can update this project');
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

      if (project.createdBy.toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('Only the project creator can delete this project');
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

      if (project.createdBy.toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('Only the project creator can add members');
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

      if (project.createdBy.toString() !== (user._id as any).toString()) {
      throw new ForbiddenException('Only the project creator can remove members');
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
}

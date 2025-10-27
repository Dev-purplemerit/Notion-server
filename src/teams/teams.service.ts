import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Team, TeamDocument } from './team.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    private usersService: UsersService,
  ) {}

  // Create team automatically from a task
  async createFromTask(taskId: string, taskTitle: string, ownerEmail: string, memberIds: string[]): Promise<Team> {
    const ownerId = await this.usersService.getUserIdFromEmail(ownerEmail);
    if (!ownerId) {
      throw new NotFoundException('Owner not found');
    }

    // Ensure owner is in the members list
    const uniqueMemberIds = Array.from(new Set([ownerId, ...memberIds]));

    const team = new this.teamModel({
      name: `Team: ${taskTitle}`,
      taskId: new Types.ObjectId(taskId),
      owner: new Types.ObjectId(ownerId),
      admin: new Types.ObjectId(ownerId), // Initially owner is also admin
      members: uniqueMemberIds,
    });

    return team.save();
  }

  // Create team automatically from a project
  async createFromProject(projectId: string, projectName: string, ownerEmail: string, memberIds: string[] = []): Promise<Team> {
    const ownerId = await this.usersService.getUserIdFromEmail(ownerEmail);
    if (!ownerId) {
      throw new NotFoundException('Owner not found');
    }

    // Ensure owner is in the members list
    const uniqueMemberIds = Array.from(new Set([ownerId, ...memberIds]));

    const team = new this.teamModel({
      name: `${projectName} Team`,
      projectId: new Types.ObjectId(projectId),
      owner: new Types.ObjectId(ownerId),
      admin: new Types.ObjectId(ownerId), // Initially owner is also admin
      members: uniqueMemberIds,
    });

    return team.save();
  }

  // Update team members based on task member changes
  async updateTeamMembers(taskId: string, memberIds: string[]): Promise<Team> {
    const team = await this.teamModel.findOne({ taskId: new Types.ObjectId(taskId) });
    if (!team) {
      throw new NotFoundException('Team not found for this task');
    }

    const owner = team.owner.toString();

    // Ensure owner is always in the members list
    const uniqueMemberIds = Array.from(new Set([owner, ...memberIds]));

    team.members = uniqueMemberIds;
    return team.save();
  }

  // Update team members based on project member changes
  async updateProjectTeamMembers(projectId: string, memberIds: string[]): Promise<Team> {
    const team = await this.teamModel.findOne({ projectId: new Types.ObjectId(projectId) });
    if (!team) {
      throw new NotFoundException('Team not found for this project');
    }

    const owner = team.owner.toString();

    // Ensure owner is always in the members list
    const uniqueMemberIds = Array.from(new Set([owner, ...memberIds]));

    team.members = uniqueMemberIds;
    return team.save();
  }

  // Get team by task ID
  async findByTaskId(taskId: string): Promise<Team | null> {
    return this.teamModel
      .findOne({ taskId: new Types.ObjectId(taskId) })
      .populate('owner', 'name email')
      .populate('admin', 'name email')
      .populate('taskId', 'title description day startTime duration label')
      .exec();
  }

  // Get team by project ID
  async findByProjectId(projectId: string): Promise<Team | null> {
    return this.teamModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .populate('owner', 'name email')
      .populate('admin', 'name email')
      .populate('projectId', 'name description status startDate endDate')
      .exec();
  }

  // Change team admin (only owner can do this)
  async changeAdmin(teamId: string, newAdminId: string, requesterEmail: string): Promise<Team> {
    const requesterId = await this.usersService.getUserIdFromEmail(requesterEmail);
    if (!requesterId) {
      throw new NotFoundException('Requester user not found');
    }

    const team = await this.teamModel.findById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Only owner can change admin
    if (team.owner.toString() !== requesterId) {
      throw new ForbiddenException('Only the owner can change the admin');
    }

    // Check if new admin is a member of the team
    const isMember = team.members.includes(newAdminId);
    if (!isMember) {
      throw new ForbiddenException('New admin must be a member of the team');
    }

    // Update admin field
    team.admin = new Types.ObjectId(newAdminId);

    return team.save();
  }

  // Get team by ID
  async findOne(teamId: string, userEmail: string): Promise<Team> {
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const team = await this.teamModel
      .findOne({
        _id: teamId,
        members: userId
      })
      .populate('owner', 'name email')
      .populate('admin', 'name email')
      .populate('taskId', 'title description day startTime duration label')
      .exec();

    if (!team) {
      throw new NotFoundException('Team not found or you are not a member');
    }

    return team;
  }

  // Delete team (when task is deleted)
  async deleteByTaskId(taskId: string): Promise<void> {
    await this.teamModel.deleteOne({ taskId: new Types.ObjectId(taskId) });
  }

  // Delete team (when project is deleted)
  async deleteByProjectId(projectId: string): Promise<void> {
    await this.teamModel.deleteOne({ projectId: new Types.ObjectId(projectId) });
  }

  async create(name: string, description: string, userEmail: string): Promise<Team> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    // Note: Manual team creation is not allowed
    // Teams should be created automatically via createFromTask or createFromProject
    throw new ForbiddenException('Teams must be created automatically from tasks or projects');
  }

  async findUserTeams(userEmail: string): Promise<Team[]> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    return this.teamModel
      .find({ members: userId })
      .populate('owner', 'name email')
      .populate('admin', 'name email')
      .populate('taskId', 'title description day startTime duration label startDate endDate')
      .exec();
  }

  async addMember(teamId: string, userIdToAdd: string, role: string, requesterEmail: string): Promise<Team> {
    // Get requester ID from email
    const requesterId = await this.usersService.getUserIdFromEmail(requesterEmail);
    if (!requesterId) {
      throw new NotFoundException('Requester user not found');
    }

    const team = await this.teamModel.findById(teamId);
    if (!team) throw new NotFoundException('Team not found');

    // Only owner and admin can add members
    const isOwner = team.owner.toString() === requesterId;
    const isAdmin = team.admin.toString() === requesterId;
    
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only owners and admins can add members');
    }

    // Add member if not already in the list
    if (!team.members.includes(userIdToAdd)) {
      team.members.push(userIdToAdd);
    }
    
    return team.save();
  }

  async removeMember(teamId: string, userIdToRemove: string, requesterEmail: string): Promise<Team> {
    // Get requester ID from email
    const requesterId = await this.usersService.getUserIdFromEmail(requesterEmail);
    if (!requesterId) {
      throw new NotFoundException('Requester user not found');
    }

    const team = await this.teamModel.findById(teamId);
    if (!team) throw new NotFoundException('Team not found');

    // Only owner and admin can remove members
    const isOwner = team.owner.toString() === requesterId;
    const isAdmin = team.admin.toString() === requesterId;
    
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only owners and admins can remove members');
    }

    // Cannot remove the owner
    if (team.owner.toString() === userIdToRemove) {
      throw new ForbiddenException('Cannot remove the owner from the team');
    }

    team.members = team.members.filter((m) => m !== userIdToRemove);
    return team.save();
  }
}

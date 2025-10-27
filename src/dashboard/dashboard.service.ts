import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/users.schema';
import { Project, ProjectDocument } from '../projects/project.schema';
import { Task, TaskDocument } from '../tasks/task.schema';
import { Team, TeamDocument } from '../teams/team.schema';
import { DocumentModel, DocumentDocument } from '../documents/document.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(DocumentModel.name) private documentModel: Model<DocumentDocument>,
  ) {}

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(month?: number, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month !== undefined ? month : new Date().getMonth();

    // Calculate date range for the selected month
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Get monthly statistics
    const [
      monthlyProjects,
      monthlyDocuments,
      monthlyTasks,
      monthlyTeams,
      totalUsers,
      totalProjects,
      totalDocuments,
      totalTasks,
      totalTeams,
    ] = await Promise.all([
      this.projectModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      this.documentModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      this.taskModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      this.teamModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      this.userModel.countDocuments(),
      this.projectModel.countDocuments(),
      this.documentModel.countDocuments(),
      this.taskModel.countDocuments(),
      this.teamModel.countDocuments(),
    ]);

    // Calculate new users in the selected month
    const newUsers = await this.userModel.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Calculate growth percentage (compared to previous month)
    const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    const prevMonthUsers = await this.userModel.countDocuments({
      createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
    });

    const growthPercentage = prevMonthUsers > 0
      ? Math.round(((newUsers - prevMonthUsers) / prevMonthUsers) * 100)
      : newUsers > 0 ? 100 : 0;

    return {
      monthly: {
        projects: monthlyProjects,
        documents: monthlyDocuments,
        tasks: monthlyTasks,
        teams: monthlyTeams,
      },
      total: {
        users: totalUsers,
        projects: totalProjects,
        documents: totalDocuments,
        tasks: totalTasks,
        teams: totalTeams,
      },
      users: {
        total: totalUsers,
        newThisMonth: newUsers,
        growthPercentage,
      },
      period: {
        month: currentMonth,
        year: currentYear,
      },
    };
  }

  /**
   * Get monthly activity data for the entire year
   */
  async getMonthlyActivity(year?: number) {
    const currentYear = year || new Date().getFullYear();
    const monthlyData: Array<{
      month: number;
      monthName: string;
      tasks: number;
      projects: number;
      total: number;
    }> = [];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);

      const [tasksCount, projectsCount] = await Promise.all([
        this.taskModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        this.projectModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
      ]);

      monthlyData.push({
        month,
        monthName: new Date(currentYear, month).toLocaleString('en-US', { month: 'short' }),
        tasks: tasksCount,
        projects: projectsCount,
        total: tasksCount + projectsCount,
      });
    }

    return monthlyData;
  }

  /**
   * Get recent activities (tasks and projects created)
   */
  async getRecentActivities(limit: number = 10, month?: number, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month !== undefined ? month : new Date().getMonth();

    // Calculate date range
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Get recent tasks
    const recentTasks = await this.taskModel
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate('createdBy', 'name firstName lastName')
      .populate('assignedTo', 'name firstName lastName')
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit / 2))
      .exec();

    // Get recent projects
    const recentProjects = await this.projectModel
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate('createdBy', 'name firstName lastName')
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit / 2))
      .exec();

    // Combine and format activities
    const activities: Array<{
      type: string;
      user: string;
      action: string;
      time: any;
      itemId: any;
    }> = [];

    recentTasks.forEach((task: any) => {
      const creator: any = task.createdBy;
      const userName = creator?.name || `${creator?.firstName || ''} ${creator?.lastName || ''}`.trim() || 'User';

      activities.push({
        type: 'task',
        user: userName,
        action: `Created task: ${task.title}`,
        time: task.createdAt || new Date(),
        itemId: task._id,
      });
    });

    recentProjects.forEach((project: any) => {
      const creator: any = project.createdBy;
      const userName = creator?.name || `${creator?.firstName || ''} ${creator?.lastName || ''}`.trim() || 'User';

      activities.push({
        type: 'project',
        user: userName,
        action: `Created project: ${project.name}`,
        time: project.createdAt || new Date(),
        itemId: project._id,
      });
    });

    // Sort by time and limit
    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);
  }

  /**
   * Get active team members
   */
  async getActiveMembers(limit: number = 10) {
    // Get all teams with members
    const teams = await this.teamModel
      .find()
      .populate('members')
      .limit(20)
      .exec();

    // Extract unique members
    const memberMap = new Map();

    teams.forEach((team: any) => {
      if (team.members && Array.isArray(team.members)) {
        team.members.forEach((member: any) => {
          const memberId = member._id || member.user?._id || member;
          if (memberId && !memberMap.has(memberId.toString())) {
            memberMap.set(memberId.toString(), {
              _id: memberId,
              name: member.name || member.user?.name,
              firstName: member.firstName || member.user?.firstName,
              lastName: member.lastName || member.user?.lastName,
              avatar: member.avatar || member.user?.avatar,
            });
          }
        });
      }
    });

    const uniqueMembers = Array.from(memberMap.values()).slice(0, limit);
    return uniqueMembers;
  }

  /**
   * Get user statistics breakdown
   */
  async getUserStats() {
    const totalUsers = await this.userModel.countDocuments();
    const activeUsers = await this.userModel.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    // Get users by provider
    const localUsers = await this.userModel.countDocuments({ provider: 'local' });
    const googleUsers = await this.userModel.countDocuments({ provider: 'google' });

    // Get users with 2FA enabled
    const users2FA = await this.userModel.countDocuments({ twoFactorEnabled: true });

    return {
      total: totalUsers,
      active: activeUsers,
      byProvider: {
        local: localUsers,
        google: googleUsers,
      },
      security: {
        twoFactorEnabled: users2FA,
      },
    };
  }

  /**
   * Get project statistics
   */
  async getProjectStats() {
    const total = await this.projectModel.countDocuments();
    const active = await this.projectModel.countDocuments({ status: 'active' });
    const completed = await this.projectModel.countDocuments({ status: 'completed' });
    const archived = await this.projectModel.countDocuments({ status: 'archived' });

    return {
      total,
      byStatus: {
        active,
        completed,
        archived,
      },
    };
  }

  /**
   * Get task statistics
   */
  async getTaskStats() {
    const total = await this.taskModel.countDocuments();
    const todo = await this.taskModel.countDocuments({ status: 'todo' });
    const inProgress = await this.taskModel.countDocuments({ status: 'in-progress' });
    const done = await this.taskModel.countDocuments({ status: 'done' });

    const high = await this.taskModel.countDocuments({ priority: 'high' });
    const medium = await this.taskModel.countDocuments({ priority: 'medium' });
    const low = await this.taskModel.countDocuments({ priority: 'low' });

    return {
      total,
      byStatus: {
        todo,
        inProgress,
        done,
      },
      byPriority: {
        high,
        medium,
        low,
      },
    };
  }
}

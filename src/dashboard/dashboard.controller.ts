import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/stats
   * Get comprehensive dashboard statistics
   * Query params: month (0-11), year (e.g., 2024)
   */
  @Get('stats')
  async getDashboardStats(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const monthNum = month !== undefined ? parseInt(month, 10) : undefined;
    const yearNum = year !== undefined ? parseInt(year, 10) : undefined;

    return this.dashboardService.getDashboardStats(monthNum, yearNum);
  }

  /**
   * GET /dashboard/monthly-activity
   * Get monthly activity data for the entire year
   * Query params: year (e.g., 2024)
   */
  @Get('monthly-activity')
  async getMonthlyActivity(@Query('year') year?: string) {
    const yearNum = year !== undefined ? parseInt(year, 10) : undefined;
    return this.dashboardService.getMonthlyActivity(yearNum);
  }

  /**
   * GET /dashboard/recent-activities
   * Get recent activities (tasks and projects)
   * Query params: limit, month, year
   */
  @Get('recent-activities')
  async getRecentActivities(
    @Query('limit') limit?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const monthNum = month !== undefined ? parseInt(month, 10) : undefined;
    const yearNum = year !== undefined ? parseInt(year, 10) : undefined;

    return this.dashboardService.getRecentActivities(limitNum, monthNum, yearNum);
  }

  /**
   * GET /dashboard/active-members
   * Get active team members
   * Query params: limit
   */
  @Get('active-members')
  async getActiveMembers(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getActiveMembers(limitNum);
  }

  /**
   * GET /dashboard/user-stats
   * Get user statistics
   */
  @Get('user-stats')
  async getUserStats() {
    return this.dashboardService.getUserStats();
  }

  /**
   * GET /dashboard/project-stats
   * Get project statistics
   */
  @Get('project-stats')
  async getProjectStats() {
    return this.dashboardService.getProjectStats();
  }

  /**
   * GET /dashboard/task-stats
   * Get task statistics
   */
  @Get('task-stats')
  async getTaskStats() {
    return this.dashboardService.getTaskStats();
  }
}

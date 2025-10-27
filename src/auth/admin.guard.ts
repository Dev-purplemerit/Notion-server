import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.email) {
      throw new ForbiddenException('Authentication required');
    }

    // Get full user details from database
    const userDetails = await this.usersService.findByEmail(user.email);

    if (!userDetails) {
      throw new ForbiddenException('User not found');
    }

    // Check if user has admin role
    if (userDetails.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // Attach full user details to request for controllers to use
    request.userDetails = userDetails;

    return true;
  }
}

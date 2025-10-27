import { Controller, Get, Put, Post, UseGuards, Req, Param, Body, NotFoundException, Query, Inject, forwardRef } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminGuard } from '../auth/admin.guard';
import { UsersService } from './users.service';
import { TokenBlacklistService } from '../auth/services/token-blacklist.service';
import { RefreshTokenService } from '../auth/services/refresh-token.service';
import { JwtService } from '@nestjs/jwt';

@Controller('user')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TokenBlacklistService))
    private readonly tokenBlacklistService: TokenBlacklistService,
    @Inject(forwardRef(() => RefreshTokenService))
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req) {
    // req.user is set by JwtStrategy
    const user = await this.usersService.findByEmail(req.user.email);
    if (!user) return null;
    // Return all safe fields (excluding password)
    return {
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      role: user.role,
      createdAt: user.createdAt,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
      country: user.country,
      cityState: user.cityState,
      location: user.location,
      postalCode: user.postalCode,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Body() body: { currentPassword: string; newPassword: string }, @Req() req) {
    const userId = req.user.sub;
    const currentToken = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

    // Change password (this will set lastPasswordChange timestamp)
    await this.usersService.changePassword(req.user.email, body.currentPassword, body.newPassword);

    // Blacklist current access token
    if (currentToken) {
      const decoded: any = this.jwtService.decode(currentToken);
      if (decoded && decoded.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        await this.tokenBlacklistService.blacklistToken(currentToken, expiresAt, 'password_change');
      }
    }

    // Revoke all refresh tokens for security
    await this.refreshTokenService.revokeAllUserTokens(userId);

    return { message: 'Password changed successfully. Please login again with your new password.' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(@Body() body: { newEmail: string; password: string }, @Req() req) {
    const updatedUser = await this.usersService.changeEmail(req.user.email, body.newEmail, body.password);
    return {
      message: 'Email changed successfully',
      email: updatedUser.email,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  async uploadAvatar(@Body() body: { avatarUrl: string }, @Req() req) {
    const user = await this.usersService.findByEmail(req.user.email);
    if (!user) throw new NotFoundException('User not found');

    const updatedUser = await this.usersService.updateUser(
      (user._id as any).toString(),
      { avatar: body.avatarUrl }
    );

    return {
      message: 'Avatar updated successfully',
      avatar: updatedUser?.avatar,
    };
  }
}

// New controller for /users endpoint (matches frontend API expectations)
@Controller('users')
export class UsersV2Controller {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async search(@Query('query') query: string) {
    const users = await this.usersService.search(query);

    return users.map(user => ({
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    const user = await this.usersService.findByEmail(req.user.email);
    if (!user) throw new NotFoundException('User not found');

    return {
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      role: user.role,
      createdAt: user.createdAt,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
      country: user.country,
      cityState: user.cityState,
      location: user.location,
      postalCode: user.postalCode,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');

    return {
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      role: user.role,
      createdAt: user.createdAt,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
      country: user.country,
      cityState: user.cityState,
      location: user.location,
      postalCode: user.postalCode,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updates: any, @Req() req) {
    // Ensure user can only update their own profile or is admin
    const currentUser = await this.usersService.findByEmail(req.user.email);
    if (!currentUser) throw new NotFoundException('Current user not found');

    if ((currentUser._id as any).toString() !== id) {
      throw new NotFoundException('You can only update your own profile');
    }

    const updatedUser = await this.usersService.updateUser(id, updates);
    if (!updatedUser) throw new NotFoundException('User not found');

    return {
      _id: updatedUser._id,
      id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      provider: updatedUser.provider,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar,
      country: updatedUser.country,
      cityState: updatedUser.cityState,
      location: updatedUser.location,
      postalCode: updatedUser.postalCode,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Body() updates: any, @Req() req) {
    const user = await this.usersService.findByEmail(req.user.email);
    if (!user) throw new NotFoundException('User not found');

    const updatedUser = await this.usersService.updateUser((user._id as any).toString(), updates);
    if (!updatedUser) throw new NotFoundException('User not found');

    return {
      _id: updatedUser._id,
      id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      provider: updatedUser.provider,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar,
      country: updatedUser.country,
      cityState: updatedUser.cityState,
      location: updatedUser.location,
      postalCode: updatedUser.postalCode,
    };
  }

  /**
   * Admin endpoints
   */

  // GET /users/admin/all - Get all users (admin only)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/all')
  async getAllUsers() {
    const users = await this.usersService.getAllUsers();
    return users.map(user => ({
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      provider: user.provider,
      createdAt: user.createdAt,
    }));
  }

  // GET /users/admin/list - Get all admins (admin only)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/list')
  async getAllAdmins() {
    const admins = await this.usersService.getAllAdmins();
    return admins.map(user => ({
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
    }));
  }

  // POST /users/admin/assign/:userId - Assign admin role (admin only)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/assign/:userId')
  async assignAdminRole(@Param('userId') userId: string) {
    const updatedUser = await this.usersService.assignAdminRole(userId);
    return {
      message: 'Admin role assigned successfully',
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    };
  }

  // POST /users/admin/revoke/:userId - Revoke admin role (admin only)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/revoke/:userId')
  async revokeAdminRole(@Param('userId') userId: string) {
    const updatedUser = await this.usersService.revokeAdminRole(userId);
    return {
      message: 'Admin role revoked successfully',
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    };
  }
}

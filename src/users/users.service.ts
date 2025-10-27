import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './users.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // Updated to accept providerId as well
  async createUser(
    email: string,
    password: string | null,
    provider: 'local' | 'google',
    name?: string,
    providerId?: string,
  ): Promise<UserDocument> {
    const newUser = new this.userModel({
      email,
      password,
      provider,
      name,
      providerId,
    });
    return newUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async findByProviderId(providerId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ providerId });
  }

  /**
   * Get user ID from email (for CRUD operations)
   */
  async getUserIdFromEmail(email: string): Promise<string | null> {
    const user = await this.userModel.findOne({ email });
    return user ? (user as any)._id.toString() : null;
  }

  /**
   * Validate user exists by email and return user document
   */
  async validateUserByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async findOne(query: any): Promise<UserDocument | null> {
    return this.userModel.findOne(query);
  }

  async updateUser(id: string, updates: any): Promise<UserDocument | null> {
    // Remove sensitive fields from updates
    const { password, providerId, provider, ...safeUpdates } = updates;

    return this.userModel
      .findByIdAndUpdate(id, safeUpdates, { new: true })
      .select('-password');
  }

  /**
   * Search users by name or email
   */
  async search(query: string): Promise<UserDocument[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    return this.userModel
      .find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
        ],
      })
      .select('-password')
      .limit(20)
      .exec();
  }

  /**
   * Change user password
   */
  async changePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has a password (OAuth users don't)
    if (!user.password) {
      throw new BadRequestException('Cannot change password for OAuth users');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and timestamp
    user.password = hashedPassword;
    user.lastPasswordChange = new Date();
    await user.save();
  }

  /**
   * Change user email
   */
  async changeEmail(currentEmail: string, newEmail: string, password: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email: currentEmail });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify password
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Password is incorrect');
      }
    }

    // Check if new email is already taken
    const existingUser = await this.userModel.findOne({ email: newEmail });
    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    // Update email
    user.email = newEmail;
    return user.save();
  }

  /**
   * Assign admin role to a user
   */
  async assignAdminRole(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.role === 'admin') {
      throw new BadRequestException('User is already an admin');
    }

    user.role = 'admin';
    return user.save();
  }

  /**
   * Revoke admin role from a user
   */
  async revokeAdminRole(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.role !== 'admin') {
      throw new BadRequestException('User is not an admin');
    }

    user.role = 'user';
    return user.save();
  }

  /**
   * Get all admin users
   */
  async getAllAdmins(): Promise<UserDocument[]> {
    return this.userModel
      .find({ role: 'admin' })
      .select('-password')
      .exec();
  }

  /**
   * Get all users (for admin management)
   */
  async getAllUsers(): Promise<UserDocument[]> {
    return this.userModel
      .find()
      .select('-password')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Check if user is admin
   */
  async isAdmin(email: string): Promise<boolean> {
    const user = await this.userModel.findOne({ email });
    return user?.role === 'admin';
  }
}

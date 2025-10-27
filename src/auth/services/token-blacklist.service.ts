import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TokenBlacklist, TokenBlacklistDocument } from '../schemas/token-blacklist.schema';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectModel(TokenBlacklist.name) private tokenBlacklistModel: Model<TokenBlacklistDocument>,
  ) {}

  async blacklistToken(token: string, expiresAt: Date, reason?: string): Promise<void> {
    try {
      await this.tokenBlacklistModel.create({
        token,
        expiresAt,
        reason,
      });
    } catch (error) {
      // Ignore duplicate key errors (token already blacklisted)
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await this.tokenBlacklistModel.findOne({ token });
    return !!blacklisted;
  }

  async blacklistAllUserTokens(userId: string, tokens: string[], reason: string): Promise<void> {
    const blacklistPromises = tokens.map(token => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // Keep in blacklist for 1 day
      return this.blacklistToken(token, expiresAt, reason);
    });

    await Promise.all(blacklistPromises);
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { TokenBlacklistService } from './services/token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract from Authorization header (Bearer token)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Fallback to cookie for backwards compatibility
        (request: Request) => {
          return request?.cookies?.accessToken;
        },
      ]),
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true, // Pass request to validate method
    });
  }

  async validate(req: Request, payload: any) {
    // Extract token for blacklist check (prioritize header)
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.accessToken;

    // Check if token is blacklisted
    if (token) {
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    // Verify user still exists
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user changed password after token was issued
    if (user.lastPasswordChange) {
      const passwordChangedAt = Math.floor(user.lastPasswordChange.getTime() / 1000);
      if (payload.iat < passwordChangedAt) {
        throw new UnauthorizedException('Password was changed. Please login again.');
      }
    }

    // Check if account is locked
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new UnauthorizedException('Account is locked');
    }

    // Return user data to be attached to request.user
    return {
      sub: payload.sub,
      email: payload.email,
      provider: payload.provider,
      iat: payload.iat,
    };
  }
}

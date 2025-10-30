import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, StrategyOptions, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { LoggerService } from '../common/services/logger.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private authService: AuthService,
    private logger: LoggerService,
  ) {
    const googleOptions: StrategyOptions = {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/redirect',
      scope: ['email', 'profile'],
    };
    super(googleOptions);
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    this.logger.debug(`Google OAuth validation for user: ${profile.emails?.[0]?.value}`, 'GoogleStrategy');
    await this.authService.validateOAuthLogin(profile); // Call to ensure user is created
    done(null, profile); // Pass raw profile to req.user
  }
}
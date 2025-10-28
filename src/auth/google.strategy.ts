import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, StrategyOptions, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    const googleOptions: StrategyOptions = {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/redirect',
      scope: ['email', 'profile'],
    };
    super(googleOptions);
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    console.log('Google Profile:', profile); // Keep for debugging
    await this.authService.validateOAuthLogin(profile); // Call to ensure user is created
    done(null, profile); // Pass raw profile to req.user
  }
}
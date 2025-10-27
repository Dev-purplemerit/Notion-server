import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Initiates Google OAuth2 login flow
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport handles redirection to Google
  }

  /**
   * Callback for Google OAuth2 redirect
   */
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const profile = req.user;
    const jwt = await this.authService.validateOAuthLogin(profile);

    // Redirect to frontend with JWT token
    return res.redirect(`http://localhost:3001/success?token=${jwt.accessToken}`);
  }

  /**
   * Custom email/password signup
   */
  @Post('signup')
  async signup(@Body() body: { email: string; password: string; name: string }) {
    const { email, password, name } = body;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.signup(email, password, name);
  }

  /**
   * Custom email/password login
   */
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.login(email, password);
  }
}

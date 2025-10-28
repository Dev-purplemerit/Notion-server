import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { JwtAuthGuard } from './jwt.guard';

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
   * Callback for Google OAuth2 redirect - using HTTP-only cookies
   */
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const profile = req.user;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const { accessToken, refreshToken } = await this.authService.validateOAuthLogin(
      profile,
      ipAddress,
      userAgent,
    );

    // Set HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Redirect to frontend without token in URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.redirect(`${frontendUrl}/dashboard`);
  }

  /**
   * Custom email/password signup
   */
  @Post('signup')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 signups per minute
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: SignupDto, @Req() req: Request, @Res() res: Response) {
    const { email, password, name } = signupDto;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.signup(email, password, name, ipAddress, userAgent);

    // Set HTTP-only cookies
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      emailVerificationRequired: result.emailVerificationRequired,
    });
  }

  /**
   * Custom email/password login
   */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res() res: Response) {
    const { email, password } = loginDto;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(email, password, ipAddress, userAgent);

    // If 2FA is required, don't set cookies yet
    if ('requires2FA' in result && result.requires2FA) {
      return res.json({
        requires2FA: true,
        tempToken: result.tempToken,
      });
    }

    // Set HTTP-only cookies
    if ('accessToken' in result) {
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return res.json({ success: true });
  }

  /**
   * Verify 2FA token
   */
  @Post('verify-2fa')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verify2FA(@Body() verify2FADto: Verify2FADto, @Req() req: Request, @Res() res: Response) {
    const { email, token } = verify2FADto;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const { accessToken, refreshToken } = await this.authService.verify2FA(
      email,
      token,
      ipAddress,
      userAgent,
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true });
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new BadRequestException('Refresh token not found');
    }

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const { accessToken } = await this.authService.refreshAccessToken(
      refreshToken,
      ipAddress,
      userAgent,
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ success: true });
  }

  /**
   * Logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res() res: Response) {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;
    const userId = (req.user as any).sub;

    if (accessToken || refreshToken) {
      await this.authService.logout(accessToken, refreshToken, userId);
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.json({ success: true });
  }

  /**
   * Verify email
   */
  @Get('verify-email/:token')
  async verifyEmail(@Req() req: Request) {
    const token = req.params.token;
    return this.authService.verifyEmail(token);
  }

  /**
   * Enable 2FA - returns QR code for setup
   */
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  async enable2FA(@Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.authService.enable2FA(userId);
  }

  /**
   * Verify 2FA setup and activate
   */
  @Post('2fa/verify-setup')
  @UseGuards(JwtAuthGuard)
  async verify2FASetup(@Req() req: Request, @Body() body: { token: string }) {
    const userId = (req.user as any).sub;
    return this.authService.verify2FASetup(userId, body.token);
  }

  /**
   * Disable 2FA
   */
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async disable2FA(@Req() req: Request, @Body() body: { password: string }) {
    const userId = (req.user as any).sub;
    return this.authService.disable2FA(userId, body.password);
  }

  /**
   * Check authentication status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req: Request) {
    return {
      authenticated: true,
      user: req.user,
    };
  }
}

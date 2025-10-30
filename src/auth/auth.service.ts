import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from './services/refresh-token.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { AuditLogService } from './services/audit-log.service';
import { AuditEventType } from './schemas/audit-log.schema';
// COMMENTED OUT: Redis 2FA code
// import { CacheService } from '../common/services/cache.service';
import { EmailService } from '../common/services/email.service';
import { LoggerService } from '../common/services/logger.service';

@Injectable()
export class AuthService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private configService: ConfigService,
    private refreshTokenService: RefreshTokenService,
    private tokenBlacklistService: TokenBlacklistService,
    private auditLogService: AuditLogService,
    // COMMENTED OUT: Redis 2FA code
    // private cacheService: CacheService,
    private emailService: EmailService,
    private logger: LoggerService,
  ) {}

  /**
   * Check if account is locked
   */
  private isAccountLocked(user: any): boolean {
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      return true;
    }
    return false;
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(user: any, email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= this.MAX_FAILED_ATTEMPTS) {
      user.lockoutUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);

      await this.auditLogService.log({
        userId: (user as any)._id.toString(),
        eventType: AuditEventType.ACCOUNT_LOCKED,
        email,
        ipAddress,
        userAgent,
        isSuccessful: true,
        metadata: { reason: 'max_failed_attempts', attempts: user.failedLoginAttempts },
      });
    }

    await user.save();

    await this.auditLogService.log({
      userId: (user as any)._id.toString(),
      eventType: AuditEventType.LOGIN_FAILED,
      email,
      ipAddress,
      userAgent,
      isSuccessful: false,
      failureReason: 'invalid_credentials',
    });
  }

  /**
   * Reset failed login attempts on successful login
   */
  private async resetFailedAttempts(user: any): Promise<void> {
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;
      await user.save();
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokenPair(user: any, ipAddress?: string, userAgent?: string) {
    const payload = {
      sub: (user as any)._id.toString(),
      email: user.email,
      provider: user.provider,
      iat: Math.floor(Date.now() / 1000),
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    const accessToken = this.jwtService.sign(payload, { secret });

    const { token: refreshToken, expiresAt } = await this.refreshTokenService.createRefreshToken(
      (user as any)._id.toString(),
      ipAddress,
      userAgent,
    );

    return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
  }

  /**
   * Google OAuth login handler
   */
  async validateOAuthLogin(profile: any, ipAddress?: string, userAgent?: string) {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const avatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      user = await this.usersService.createUser(email, null, 'google', name);
      user.emailVerified = true; // Auto-verify OAuth users
      if (avatar) {
        user.avatar = avatar; // Store Google profile picture
      }
      await user.save();

      await this.auditLogService.log({
        userId: (user as any)._id.toString(),
        eventType: AuditEventType.SIGNUP,
        email,
        ipAddress,
        userAgent,
        isSuccessful: true,
        metadata: { provider: 'google' },
      });
    } else if (avatar && !user.avatar) {
      // Update avatar for existing users who don't have one
      user.avatar = avatar;
      await user.save();
    }

    const tokens = await this.generateTokenPair(user, ipAddress, userAgent);

    await this.auditLogService.log({
      userId: (user as any)._id.toString(),
      eventType: AuditEventType.LOGIN_SUCCESS,
      email,
      ipAddress,
      userAgent,
      isSuccessful: true,
      metadata: { provider: 'google' },
    });

    return tokens;
  }

  /**
   * Custom email/password signup with email verification
   */
  async signup(
    email: string,
    password: string,
    name: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Increased rounds from 10 to 12

    const user = await this.usersService.createUser(email, hashedPassword, 'local', name);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, name, verificationToken);
      this.logger.log(`Verification email sent to ${email}`, 'AuthService');
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error.stack, 'AuthService');
      // Continue with signup even if email fails
    }

    const tokens = await this.generateTokenPair(user, ipAddress, userAgent);

    await this.auditLogService.log({
      userId: (user as any)._id.toString(),
      eventType: AuditEventType.SIGNUP,
      email,
      ipAddress,
      userAgent,
      isSuccessful: true,
      metadata: { provider: 'local', emailVerified: false },
    });

    return { ...tokens, emailVerificationRequired: true };
  }

  /**
   * Email verification
   */
  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.usersService.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await this.auditLogService.log({
      userId: (user as any)._id.toString(),
      eventType: AuditEventType.EMAIL_VERIFIED,
      email: user.email,
      isSuccessful: true,
    });

    return { success: true };
  }

  /**
   * Custom email/password login with account lockout
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.password) {
      // Don't reveal whether user exists
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (this.isAccountLocked(user)) {
      const minutesLeft = Math.ceil((user.lockoutUntil!.getTime() - Date.now()) / (60 * 1000));
      throw new UnauthorizedException(
        `Account locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s).`
      );
    }

    // Verify password
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      await this.handleFailedLogin(user, email, ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful login
    await this.resetFailedAttempts(user);

    // If 2FA is enabled, return a temporary token for 2FA verification
    // COMMENTED OUT: Redis 2FA code
    /*
    if (user.twoFactorEnabled) {
      const tempToken = crypto.randomBytes(32).toString('hex');

      // Store temp token in Redis cache for 5 minutes
      try {
        await this.cacheService.store2FAToken(email, tempToken, 300); // 5 minutes
        this.logger.debug(`2FA temp token stored for ${email}`, 'AuthService');
      } catch (error) {
        this.logger.error(`Failed to store 2FA token for ${email}`, error.stack, 'AuthService');
        throw new UnauthorizedException('Failed to initiate 2FA verification');
      }

      await this.auditLogService.log({
        userId: (user as any)._id.toString(),
        eventType: AuditEventType.LOGIN_SUCCESS,
        email,
        ipAddress,
        userAgent,
        isSuccessful: true,
        metadata: { requires2FA: true },
      });

      return {
        requires2FA: true,
        tempToken,
        email: user.email,
      };
    }
    */

    const tokens = await this.generateTokenPair(user, ipAddress, userAgent);

    await this.auditLogService.log({
      userId: (user as any)._id.toString(),
      eventType: AuditEventType.LOGIN_SUCCESS,
      email,
      ipAddress,
      userAgent,
      isSuccessful: true,
      metadata: { provider: 'local' },
    });

    return tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const tokenDoc = await this.refreshTokenService.validateRefreshToken(refreshToken);

    if (!tokenDoc) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(tokenDoc.userId.toString());
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      sub: (user as any)._id.toString(),
      email: user.email,
      provider: user.provider,
      iat: Math.floor(Date.now() / 1000),
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    const accessToken = this.jwtService.sign(payload, { secret });

    await this.auditLogService.log({
      userId: (user as any)._id.toString(),
      eventType: AuditEventType.TOKEN_REFRESH,
      email: user.email,
      ipAddress,
      userAgent,
      isSuccessful: true,
    });

    return { accessToken };
  }

  /**
   * Logout - blacklist access token and revoke refresh token
   */
  async logout(accessToken: string, refreshToken: string, userId: string) {
    // Blacklist the access token
    const decoded: any = this.jwtService.decode(accessToken);
    if (decoded && decoded.exp) {
      const expiresAt = new Date(decoded.exp * 1000);
      await this.tokenBlacklistService.blacklistToken(accessToken, expiresAt, 'logout');
    }

    // Revoke the refresh token
    if (refreshToken) {
      await this.refreshTokenService.revokeToken(refreshToken);
    }

    await this.auditLogService.log({
      userId,
      eventType: AuditEventType.LOGOUT,
      isSuccessful: true,
    });
  }

  /**
   * Enable 2FA - generate secret and return QR code data
   */
  async enable2FA(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = speakeasy.generateSecret({
      name: `TaskHub (${user.email})`,
      length: 32,
    });

    // Store the secret temporarily (user must verify before enabling)
    user.twoFactorSecret = secret.base32;
    await user.save();

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
    };
  }

  /**
   * Verify and activate 2FA
   */
  async verify2FASetup(userId: string, token: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      throw new BadRequestException('Invalid 2FA token');
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );
    await user.save();

    await this.auditLogService.log({
      userId: (user as any)._id.toString(),
      eventType: AuditEventType.TWO_FA_ENABLED,
      email: user.email,
      isSuccessful: true,
    });

    return { backupCodes };
  }

  /**
   * Verify 2FA token during login
   * COMMENTED OUT: Redis 2FA validation
   */
  async verify2FA(email: string, token: string, tempToken: string, ipAddress?: string, userAgent?: string) {
    // First, validate the temporary token from cache
    // COMMENTED OUT: Redis cache validation
    /*
    const isValidTempToken = await this.cacheService.validate2FAToken(email, tempToken);
    if (!isValidTempToken) {
      this.logger.warn(`Invalid or expired 2FA temp token for ${email}`, 'AuthService');
      throw new UnauthorizedException('Invalid or expired 2FA session');
    }
    */

    const user = await this.usersService.findByEmail(email);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA not enabled for this user');
    }

    // Try TOTP verification
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified) {
      const tokens = await this.generateTokenPair(user, ipAddress, userAgent);

      await this.auditLogService.log({
        userId: (user as any)._id.toString(),
        eventType: AuditEventType.TWO_FA_VERIFIED,
        email,
        ipAddress,
        userAgent,
        isSuccessful: true,
      });

      return tokens;
    }

    // Try backup code verification
    for (const hashedCode of user.twoFactorBackupCodes || []) {
      const matches = await bcrypt.compare(token, hashedCode);
      if (matches) {
        // Remove used backup code
        user.twoFactorBackupCodes = user.twoFactorBackupCodes!.filter(c => c !== hashedCode);
        await user.save();

        const tokens = await this.generateTokenPair(user, ipAddress, userAgent);

        await this.auditLogService.log({
          userId: (user as any)._id.toString(),
          eventType: AuditEventType.TWO_FA_VERIFIED,
          email,
          ipAddress,
          userAgent,
          isSuccessful: true,
          metadata: { usedBackupCode: true },
        });

        return tokens;
      }
    }

    await this.auditLogService.log({
      userId: (user as any)._id.toString(),
      eventType: AuditEventType.TWO_FA_FAILED,
      email,
      ipAddress,
      userAgent,
      isSuccessful: false,
    });

    throw new UnauthorizedException('Invalid 2FA token');
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, password: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify password before disabling
    if (user.password) {
      const passwordMatches = await bcrypt.compare(password, user.password);
      if (!passwordMatches) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    // Revoke all refresh tokens for security
    await this.refreshTokenService.revokeAllUserTokens(userId);

    await this.auditLogService.log({
      userId: (user as any)._id.toString(),
      eventType: AuditEventType.TWO_FA_DISABLED,
      email: user.email,
      isSuccessful: true,
    });

    return { success: true };
  }
}

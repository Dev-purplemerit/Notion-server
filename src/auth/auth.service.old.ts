import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';  // Import ConfigService

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private configService: ConfigService,  // Inject ConfigService
  ) {}

  /**
   * Google OAuth login handler
   */
  async validateOAuthLogin(profile: any): Promise<{ accessToken: string }> {
    const email = profile.emails[0].value;
    const name = profile.displayName;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      user = await this.usersService.createUser(email, null, 'google', name);
    }

  const payload = { sub: (user as any)._id.toString(), email: user.email, provider: 'google' };
    
    // Use secret from .env for signing the JWT
    const secret = this.configService.get<string>('JWT_SECRET'); 
    const accessToken = this.jwtService.sign(payload, { secret });
    return { accessToken };
  }

  /**
   * Custom email/password signup
   */
  async signup(email: string, password: string, name: string): Promise<{ accessToken: string }> {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Pass `name` to user creation
    const user = await this.usersService.createUser(email, hashedPassword, 'local', name);

  const payload = { sub: (user as any)._id.toString(), email: user.email, provider: 'local' };

    // Use secret from .env for signing the JWT
    const secret = this.configService.get<string>('JWT_SECRET');
    const accessToken = this.jwtService.sign(payload, { secret });
    return { accessToken };
  }

  /**
   * Custom email/password login
   */
  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      throw new BadRequestException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new BadRequestException('Invalid credentials');
    }

  const payload = { sub: (user as any)._id.toString(), email: user.email, provider: 'local' };

    // Use secret from .env for signing the JWT
    const secret = this.configService.get<string>('JWT_SECRET');
    const accessToken = this.jwtService.sign(payload, { secret });
    return { accessToken };
  }
}

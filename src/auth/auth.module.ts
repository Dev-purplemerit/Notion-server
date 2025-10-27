import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { TokenBlacklist, TokenBlacklistSchema } from './schemas/token-blacklist.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { RefreshTokenService } from './services/refresh-token.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { AuditLogService } from './services/audit-log.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },  // Short-lived access tokens
      }),
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 5, // 5 requests per minute for auth routes
    }]),
  ],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    RefreshTokenService,
    TokenBlacklistService,
    AuditLogService,
  ],
  controllers: [AuthController],
  exports: [AuthService, AuditLogService, TokenBlacklistService, RefreshTokenService],
})
export class AuthModule {}

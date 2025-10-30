import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// COMMENTED OUT: Redis 2FA code
// import { CacheService } from './services/cache.service';
import { EmailService } from './services/email.service';
import { LoggerService } from './services/logger.service';

@Global()
@Module({
  imports: [ConfigModule],
  // COMMENTED OUT: Redis 2FA code - CacheService removed
  providers: [/* CacheService, */ EmailService, LoggerService],
  exports: [/* CacheService, */ EmailService, LoggerService],
})
export class CommonModule {}

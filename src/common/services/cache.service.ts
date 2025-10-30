import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      // Use Redis URL if provided (for production)
      this.client = new Redis(redisUrl);
    } else {
      // Use local Redis for development
      this.client = new Redis({
        host: this.configService.get<string>('REDIS_HOST') || 'localhost',
        port: this.configService.get<number>('REDIS_PORT') || 6379,
        password: this.configService.get<string>('REDIS_PASSWORD'),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
    }

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Store 2FA temporary token with expiration
   */
  async store2FAToken(email: string, tempToken: string, ttlSeconds: number = 300): Promise<void> {
    const key = `2fa:temp:${email}`;
    await this.set(key, tempToken, ttlSeconds);
  }

  /**
   * Validate 2FA temporary token
   */
  async validate2FAToken(email: string, tempToken: string): Promise<boolean> {
    const key = `2fa:temp:${email}`;
    const storedToken = await this.get(key);

    if (!storedToken || storedToken !== tempToken) {
      return false;
    }

    // Delete token after successful validation (one-time use)
    await this.delete(key);
    return true;
  }

  /**
   * Delete 2FA temporary token
   */
  async delete2FAToken(email: string): Promise<void> {
    const key = `2fa:temp:${email}`;
    await this.delete(key);
  }
}

import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private redis: Redis | null = null;
  private memoryStore: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(private configService: ConfigService) {
    // Check if Redis is disabled
    const redisDisabled = this.configService.get<string>('REDIS_DISABLED') === 'true';
    
    if (redisDisabled) {
      this.logger.log('📦 Using in-memory rate limiting (Redis disabled)');
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy: () => null,
      });

      this.redis.on('error', () => {
        this.redis = null;
      });

      this.redis.on('connect', () => {
        this.logger.log('✅ Redis connected for rate limiting');
      });

      this.redis.connect().catch(() => {
        this.logger.log('📦 Using in-memory rate limiting (Redis unavailable)');
        this.redis = null;
      });

    } catch (error) {
      this.logger.log('📦 Using in-memory rate limiting');
      this.redis = null;
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (!user) {
      return next();
    }

    const clientId = user.clientId;
    const endpoint = req.path;
    const key = `ratelimit:${clientId}:${endpoint}`;

    const maxRequests = this.configService.get<number>('RATE_LIMIT_MAX') || 100;
    const windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000;
    const windowSeconds = Math.floor(windowMs / 1000);

    try {
      // Try Redis first if available
      if (this.redis) {
        try {
          const current = await this.redis.incr(key);
          
          if (current === 1) {
            await this.redis.expire(key, windowSeconds);
          }

          if (current > maxRequests) {
            throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
          }

          return next();
        } catch (error) {
          if (error instanceof HttpException) {
            throw error;
          }
          // Fall through to memory store
        }
      }

      // Use memory store
      const now = Date.now();
      const record = this.memoryStore.get(key);

      if (!record || now > record.resetAt) {
        this.memoryStore.set(key, {
          count: 1,
          resetAt: now + windowMs,
        });
      } else {
        record.count++;
        if (record.count > maxRequests) {
          throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
        }
      }

      // Periodically clean up expired entries
      if (Math.random() < 0.01) {
        for (const [k, v] of this.memoryStore.entries()) {
          if (now > v.resetAt) {
            this.memoryStore.delete(k);
          }
        }
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      next();
    }
  }
}
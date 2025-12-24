import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

const logger = new Logger('RedisConfig');

export const getRedisConfig = (configService: ConfigService): Redis | null => {
  // Check if Redis should be disabled
  const redisDisabled = configService.get<string>('REDIS_DISABLED') === 'true';
  
  if (redisDisabled) {
    logger.log('Redis is disabled, using in-memory cache');
    return null;
  }

  const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: () => null, // Don't retry
    });

    redis.on('error', (err) => {
      logger.warn('Redis unavailable, using in-memory fallback');
    });

    redis.on('connect', () => {
      logger.log('✅ Redis connected successfully');
    });

    // Try to connect but don't wait
    redis.connect().catch(() => {
      logger.warn('Redis connection failed, using in-memory fallback');
    });

    return redis;
  } catch (error) {
    logger.warn('Redis initialization failed, using in-memory fallback');
    return null;
  }
};
import Redis from 'ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EriSession {
  authToken: string;
  expiresAt: number;
}

@Injectable()
export class SessionManager {
  private readonly logger = new Logger(SessionManager.name);
  private redis: Redis | null = null;
  private memoryCache: Map<string, EriSession> = new Map();

  constructor(private configService: ConfigService) {
    // Check if Redis is disabled
    const redisDisabled = this.configService.get<string>('REDIS_DISABLED') === 'true';
    
    if (redisDisabled) {
      this.logger.log('📦 Using in-memory session storage (Redis disabled)');
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
        // Silent fallback to memory
        this.redis = null;
      });

      this.redis.on('connect', () => {
        this.logger.log('✅ Redis connected for sessions');
      });

      // Try to connect
      this.redis.connect().catch(() => {
        this.logger.log('📦 Using in-memory session storage (Redis unavailable)');
        this.redis = null;
      });

    } catch (error) {
      this.logger.log('📦 Using in-memory session storage');
      this.redis = null;
    }
  }

  async getSession(clientId: string): Promise<EriSession | null> {
    const key = `eri:session:${clientId}`;

    // Try Redis first if available
    if (this.redis) {
      try {
        const data = await this.redis.get(key);
        if (data) return JSON.parse(data);
      } catch (error) {
        // Fall through to memory cache
      }
    }

    // Use memory cache
    return this.memoryCache.get(key) || null;
  }

  async saveSession(clientId: string, session: EriSession, ttlSeconds: number = 1500): Promise<void> {
    const key = `eri:session:${clientId}`;

    // Try Redis first if available
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(session), 'EX', ttlSeconds);
        return;
      } catch (error) {
        // Fall through to memory cache
      }
    }

    // Use memory cache
    this.memoryCache.set(key, session);
    
    // Auto-expire from memory after TTL
    setTimeout(() => {
      this.memoryCache.delete(key);
    }, ttlSeconds * 1000);
  }

  async clearSession(clientId: string): Promise<void> {
    const key = `eri:session:${clientId}`;

    // Clear from both Redis and memory
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        // Ignore error
      }
    }

    this.memoryCache.delete(key);
  }

  async refreshSession(clientId: string, ttlSeconds: number = 1500): Promise<boolean> {
    const session = await this.getSession(clientId);
    if (!session) return false;

    await this.saveSession(clientId, session, ttlSeconds);
    return true;
  }
}
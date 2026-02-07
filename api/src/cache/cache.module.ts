import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

/**
 * Redis Cache Module
 * 
 * Provides distributed caching for:
 * - API response caching
 * - Session data
 * - Salesforce API responses
 * - AI query results
 * 
 * Configuration via environment variables:
 * - REDIS_HOST: Redis server host (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_TTL: Default cache TTL in seconds (default: 300)
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('CacheModule');
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD', '');
        const ttl = configService.get<number>('REDIS_TTL', 300);

        // Check if Redis is configured
        const useRedis = configService.get<string>('USE_REDIS', 'false') === 'true';

        if (useRedis) {
          logger.log(`Connecting to Redis at ${redisHost}:${redisPort}`);
          return {
            store: redisStore,
            host: redisHost,
            port: redisPort,
            password: redisPassword || undefined,
            ttl,
            max: 1000, // Maximum number of items in cache
          };
        } else {
          // Fallback to in-memory cache for development
          logger.log('Using in-memory cache (set USE_REDIS=true for Redis)');
          return {
            ttl,
            max: 500, // Smaller limit for in-memory
          };
        }
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheModule, CacheService],
})
export class RedisCacheModule {}

// Re-export CacheService for convenience
export { CacheService } from './cache.service';


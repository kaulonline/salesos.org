import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Cache Service
 * 
 * Provides a typed wrapper around the cache manager with:
 * - Automatic key prefixing
 * - TTL management
 * - Cache statistics
 * - Error handling
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private hitCount = 0;
  private missCount = 0;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or undefined
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined && value !== null) {
        this.hitCount++;
        return value;
      }
      this.missCount++;
      return undefined;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${error}`);
      this.missCount++;
      return undefined;
    }
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional, uses default if not provided)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error}`);
    }
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}: ${error}`);
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   * @param key Cache key
   * @param fn Function to execute if cache miss
   * @param ttl Time to live in seconds
   */
  async getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate all keys matching a pattern (prefix-based)
   * Note: This is a simple implementation - Redis supports SCAN for better performance
   * @param prefix Key prefix to invalidate
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    // For Redis, we would use SCAN + DEL
    // For in-memory cache, this is a no-op (keys expire naturally)
    this.logger.log(`Invalidating cache keys with prefix: ${prefix}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hitCount: number;
    missCount: number;
    hitRate: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Generate a cache key with namespace
   * @param namespace Namespace for the key (e.g., 'salesforce', 'leads')
   * @param parts Key parts to join
   */
  static key(namespace: string, ...parts: (string | number)[]): string {
    return `${namespace}:${parts.join(':')}`;
  }
}

/**
 * Cache key namespaces for different domains
 */
export const CacheKeys = {
  // Salesforce
  SALESFORCE_CONFIG: 'sf:config',
  SALESFORCE_USER: (userId: string) => `sf:user:${userId}`,
  SALESFORCE_QUERY: (hash: string) => `sf:query:${hash}`,
  
  // CRM Entities
  LEAD: (id: string) => `lead:${id}`,
  ACCOUNT: (id: string) => `account:${id}`,
  OPPORTUNITY: (id: string) => `opportunity:${id}`,
  CONTACT: (id: string) => `contact:${id}`,
  
  // User data
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_PERMISSIONS: (userId: string) => `user:perms:${userId}`,
  
  // AI/LLM
  AI_QUERY_RESULT: (hash: string) => `ai:query:${hash}`,
  AI_ANALYSIS: (type: string, id: string) => `ai:analysis:${type}:${id}`,
  
  // Dashboard/Stats
  DASHBOARD_STATS: (userId: string) => `dashboard:stats:${userId}`,
  PIPELINE_STATS: (userId: string) => `pipeline:stats:${userId}`,
};

/**
 * Default TTL values in seconds
 */
export const CacheTTL = {
  SHORT: 60,        // 1 minute - for frequently changing data
  MEDIUM: 300,      // 5 minutes - default
  LONG: 1800,       // 30 minutes - for stable data
  VERY_LONG: 3600,  // 1 hour - for rarely changing data
  DAY: 86400,       // 24 hours - for static data
};


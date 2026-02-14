import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../database/prisma.service';

/**
 * Token Blacklist Service
 *
 * Manages revoked JWT tokens using Redis/in-memory cache.
 * Tokens are stored with TTL matching their expiration time,
 * so they auto-expire when the JWT would naturally expire.
 *
 * Key features:
 * - Single token revocation (logout)
 * - All sessions revocation (logout all devices)
 * - Session tracking for audit trail
 * - Automatic cache expiration
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly KEY_PREFIX = 'token:revoked:';
  private readonly USER_SESSIONS_PREFIX = 'user:sessions:';

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private prisma: PrismaService,
  ) {}

  /**
   * Revoke a single token by its JTI (JWT ID)
   * @param jti - The unique JWT ID to revoke
   * @param expiresAt - When the token naturally expires (for TTL calculation)
   * @param userId - Optional user ID for audit logging
   */
  async revokeToken(jti: string, expiresAt: Date, userId?: string): Promise<void> {
    try {
      // Calculate TTL in seconds (time until token would naturally expire)
      const now = new Date();
      const ttlMs = expiresAt.getTime() - now.getTime();

      // If token already expired, no need to blacklist
      if (ttlMs <= 0) {
        this.logger.debug(`Token ${jti} already expired, skipping blacklist`);
        return;
      }

      const ttlSeconds = Math.ceil(ttlMs / 1000);
      const key = `${this.KEY_PREFIX}${jti}`;

      // Store in cache with TTL
      await this.cacheManager.set(key, {
        revokedAt: now.toISOString(),
        userId,
        reason: 'logout',
      }, ttlSeconds * 1000); // cache-manager uses milliseconds

      this.logger.log(`Token ${jti} revoked, TTL: ${ttlSeconds}s`);

      // Log to database for audit trail (non-blocking)
      this.logTokenRevocation(jti, userId, 'logout').catch(err => {
        this.logger.warn(`Failed to log token revocation: ${err.message}`);
      });
    } catch (error) {
      this.logger.error(`Failed to revoke token ${jti}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a token has been revoked
   * @param jti - The JWT ID to check
   * @returns true if token is revoked, false otherwise
   */
  async isRevoked(jti: string): Promise<boolean> {
    try {
      const key = `${this.KEY_PREFIX}${jti}`;
      const revoked = await this.cacheManager.get(key);
      return revoked !== undefined && revoked !== null;
    } catch (error) {
      this.logger.error(`Failed to check token revocation for ${jti}: ${error.message}`);
      // Fail open in case of cache errors to prevent DoS
      // In a high-security environment, you might want to fail closed instead
      return false;
    }
  }

  /**
   * Revoke all active sessions for a user
   * This is used for "logout from all devices" functionality
   * @param userId - The user ID whose sessions should be revoked
   * @returns Number of sessions revoked
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    try {
      // Get all active session JTIs for this user
      const sessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessions = await this.cacheManager.get<string[]>(sessionsKey);

      if (!sessions || sessions.length === 0) {
        this.logger.debug(`No active sessions found for user ${userId}`);
        return 0;
      }

      // Revoke each session token
      const now = new Date();
      // Set a long TTL for revoked tokens (24 hours) since we don't know exact expiry
      const ttlSeconds = 24 * 60 * 60;

      const revokePromises = sessions.map(async (jti) => {
        const key = `${this.KEY_PREFIX}${jti}`;
        await this.cacheManager.set(key, {
          revokedAt: now.toISOString(),
          userId,
          reason: 'logout_all',
        }, ttlSeconds * 1000);
      });

      await Promise.all(revokePromises);

      // Clear the user's sessions list
      await this.cacheManager.del(sessionsKey);

      this.logger.log(`Revoked ${sessions.length} sessions for user ${userId}`);

      // Log to database for audit trail (non-blocking)
      this.logTokenRevocation('all', userId, 'logout_all').catch(err => {
        this.logger.warn(`Failed to log bulk token revocation: ${err.message}`);
      });

      return sessions.length;
    } catch (error) {
      this.logger.error(`Failed to revoke all sessions for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track a new session for a user (called when token is issued)
   * @param userId - The user ID
   * @param jti - The JWT ID of the new token
   * @param expiresAt - When the token expires
   */
  async trackSession(userId: string, jti: string, expiresAt: Date): Promise<void> {
    try {
      const sessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

      // Get existing sessions
      const sessions = await this.cacheManager.get<string[]>(sessionsKey) || [];

      // Add new session
      sessions.push(jti);

      // Calculate TTL (use longest expiry, max 7 days for session list)
      const ttlMs = Math.min(
        expiresAt.getTime() - Date.now(),
        7 * 24 * 60 * 60 * 1000 // 7 days max
      );

      await this.cacheManager.set(sessionsKey, sessions, ttlMs);

      this.logger.debug(`Tracked session ${jti} for user ${userId}`);
    } catch (error) {
      // Non-critical - don't fail token issuance if tracking fails
      this.logger.warn(`Failed to track session for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Remove a session from tracking (called when token is revoked)
   * @param userId - The user ID
   * @param jti - The JWT ID to remove
   */
  async untrackSession(userId: string, jti: string): Promise<void> {
    try {
      const sessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      let sessions = await this.cacheManager.get<string[]>(sessionsKey) || [];

      sessions = sessions.filter(s => s !== jti);

      if (sessions.length > 0) {
        // Keep for 7 days or until all sessions expire
        await this.cacheManager.set(sessionsKey, sessions, 7 * 24 * 60 * 60 * 1000);
      } else {
        await this.cacheManager.del(sessionsKey);
      }
    } catch (error) {
      this.logger.warn(`Failed to untrack session for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Log token revocation to database for audit trail
   */
  private async logTokenRevocation(
    jti: string,
    userId: string | undefined,
    reason: string,
  ): Promise<void> {
    try {
      // Use ApplicationLog if available, otherwise log to console
      // This is a best-effort audit log
      if (userId) {
        await this.prisma.applicationLog.create({
          data: {
            source: 'TokenBlacklistService',
            level: 'INFO',
            message: `Token revoked: ${reason}`,
            category: 'AUTH',
            userId,
            metadata: {
              jti: jti === 'all' ? 'all_sessions' : jti,
              reason,
              timestamp: new Date().toISOString(),
            },
          },
        });
      }
    } catch (error) {
      // Silently fail - audit logging should not block operations
      this.logger.debug(`Audit log failed: ${error.message}`);
    }
  }

  /**
   * Get count of active sessions for a user
   * @param userId - The user ID
   * @returns Number of tracked active sessions
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    try {
      const sessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessions = await this.cacheManager.get<string[]>(sessionsKey);
      return sessions?.length || 0;
    } catch (error) {
      this.logger.warn(`Failed to get session count for user ${userId}: ${error.message}`);
      return 0;
    }
  }
}

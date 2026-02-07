import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface LockInfo {
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  acquiredAt: Date;
  expiresAt: Date;
}

export interface LockResult {
  success: boolean;
  lock?: LockInfo;
  lockedBy?: LockInfo;
  error?: string;
}

@Injectable()
export class LocksService {
  private readonly logger = new Logger(LocksService.name);
  private readonly DEFAULT_TTL_SECONDS = 300; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Attempt to acquire a lock on an entity
   */
  async acquireLock(
    entityType: string,
    entityId: string,
    userId: string,
    userName: string,
    userEmail?: string,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<LockResult> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

      // First, clean up any expired lock
      await this.prisma.entityLock.deleteMany({
        where: {
          entityType,
          entityId,
          expiresAt: { lt: now },
        },
      });

      // Check for existing valid lock
      const existingLock = await this.prisma.entityLock.findUnique({
        where: {
          entityType_entityId: { entityType, entityId },
        },
      });

      if (existingLock) {
        // If the lock is held by the same user, refresh it
        if (existingLock.userId === userId) {
          const refreshedLock = await this.prisma.entityLock.update({
            where: { id: existingLock.id },
            data: { expiresAt },
          });
          return {
            success: true,
            lock: refreshedLock,
          };
        }

        // Lock is held by another user
        return {
          success: false,
          lockedBy: existingLock,
          error: `Entity is locked by ${existingLock.userName}`,
        };
      }

      // Create new lock
      const lock = await this.prisma.entityLock.create({
        data: {
          entityType,
          entityId,
          userId,
          userName,
          userEmail,
          expiresAt,
        },
      });

      this.logger.log(`Lock acquired: ${entityType}/${entityId} by ${userName}`);
      return { success: true, lock };
    } catch (error) {
      // Handle race condition where another user acquired lock between our check and create
      if (error?.code === 'P2002') {
        const existingLock = await this.prisma.entityLock.findUnique({
          where: {
            entityType_entityId: { entityType, entityId },
          },
        });
        return {
          success: false,
          lockedBy: existingLock || undefined,
          error: 'Lock was acquired by another user',
        };
      }
      this.logger.error(`Failed to acquire lock: ${error.message}`);
      throw error;
    }
  }

  /**
   * Release a lock
   */
  async releaseLock(
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const result = await this.prisma.entityLock.deleteMany({
        where: {
          entityType,
          entityId,
          userId,
        },
      });

      if (result.count > 0) {
        this.logger.log(`Lock released: ${entityType}/${entityId}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to release lock: ${error.message}`);
      return false;
    }
  }

  /**
   * Force release a lock (admin action)
   */
  async forceReleaseLock(
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    try {
      const result = await this.prisma.entityLock.deleteMany({
        where: { entityType, entityId },
      });
      return result.count > 0;
    } catch (error) {
      this.logger.error(`Failed to force release lock: ${error.message}`);
      return false;
    }
  }

  /**
   * Refresh an existing lock (extend TTL)
   */
  async refreshLock(
    entityType: string,
    entityId: string,
    userId: string,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<LockResult> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      const lock = await this.prisma.entityLock.updateMany({
        where: {
          entityType,
          entityId,
          userId,
        },
        data: { expiresAt },
      });

      if (lock.count === 0) {
        return {
          success: false,
          error: 'Lock not found or not owned by user',
        };
      }

      const updatedLock = await this.prisma.entityLock.findUnique({
        where: {
          entityType_entityId: { entityType, entityId },
        },
      });

      return { success: true, lock: updatedLock || undefined };
    } catch (error) {
      this.logger.error(`Failed to refresh lock: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lock status for an entity
   */
  async getLockStatus(
    entityType: string,
    entityId: string,
  ): Promise<LockInfo | null> {
    const lock = await this.prisma.entityLock.findUnique({
      where: {
        entityType_entityId: { entityType, entityId },
      },
    });

    if (!lock) return null;

    // Check if lock is expired
    if (lock.expiresAt < new Date()) {
      await this.prisma.entityLock.delete({ where: { id: lock.id } });
      return null;
    }

    return lock;
  }

  /**
   * Check if an entity is locked
   */
  async isLocked(entityType: string, entityId: string): Promise<boolean> {
    const lock = await this.getLockStatus(entityType, entityId);
    return lock !== null;
  }

  /**
   * Check if a user owns a lock
   */
  async userOwnsLock(
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<boolean> {
    const lock = await this.getLockStatus(entityType, entityId);
    return lock?.userId === userId;
  }

  /**
   * Get all locks held by a user
   */
  async getUserLocks(userId: string): Promise<LockInfo[]> {
    const now = new Date();
    return this.prisma.entityLock.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
      },
      orderBy: { acquiredAt: 'desc' },
    });
  }

  /**
   * Release all locks held by a user (on disconnect)
   */
  async releaseAllUserLocks(userId: string): Promise<number> {
    const result = await this.prisma.entityLock.deleteMany({
      where: { userId },
    });
    if (result.count > 0) {
      this.logger.log(`Released ${result.count} locks for user ${userId}`);
    }
    return result.count;
  }

  /**
   * Cleanup expired locks (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredLocks(): Promise<void> {
    const result = await this.prisma.entityLock.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    if (result.count > 0) {
      this.logger.debug(`Cleaned up ${result.count} expired locks`);
    }
  }
}

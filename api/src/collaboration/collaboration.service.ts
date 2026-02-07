import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface PresenceInfo {
  userId: string;
  userName: string;
  userEmail?: string | null;
  avatarUrl?: string | null;
  socketId: string;
  lastSeenAt: Date;
}

export interface EntityViewers {
  entityType: string;
  entityId: string;
  viewers: PresenceInfo[];
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  private readonly PRESENCE_TIMEOUT_SECONDS = 60; // Consider user gone after 60s

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Announce that a user is viewing an entity
   */
  async announcePresence(
    entityType: string,
    entityId: string,
    userId: string,
    userName: string,
    userEmail?: string,
    avatarUrl?: string,
    socketId?: string,
  ): Promise<PresenceInfo[]> {
    try {
      // Upsert presence record
      await this.prisma.entityPresence.upsert({
        where: {
          entityType_entityId_userId: { entityType, entityId, userId },
        },
        update: {
          lastSeenAt: new Date(),
          socketId: socketId || '',
          userName,
          avatarUrl,
        },
        create: {
          entityType,
          entityId,
          userId,
          userName,
          userEmail,
          avatarUrl,
          socketId: socketId || '',
        },
      });

      // Return all current viewers
      return this.getEntityViewers(entityType, entityId);
    } catch (error) {
      this.logger.error(`Failed to announce presence: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove user presence from an entity
   */
  async leaveEntity(
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.entityPresence.deleteMany({
        where: { entityType, entityId, userId },
      });
      this.logger.debug(`User ${userId} left ${entityType}/${entityId}`);
    } catch (error) {
      this.logger.error(`Failed to remove presence: ${error.message}`);
    }
  }

  /**
   * Remove all presence for a socket (on disconnect)
   */
  async removeSocketPresence(socketId: string): Promise<string[]> {
    try {
      // Get affected entities before deleting
      const presences = await this.prisma.entityPresence.findMany({
        where: { socketId },
        select: { entityType: true, entityId: true },
      });

      await this.prisma.entityPresence.deleteMany({
        where: { socketId },
      });

      // Return list of affected entity keys for broadcasting
      return presences.map((p) => `${p.entityType}:${p.entityId}`);
    } catch (error) {
      this.logger.error(`Failed to remove socket presence: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all viewers of an entity
   */
  async getEntityViewers(
    entityType: string,
    entityId: string,
  ): Promise<PresenceInfo[]> {
    const timeout = new Date(
      Date.now() - this.PRESENCE_TIMEOUT_SECONDS * 1000,
    );

    const presences = await this.prisma.entityPresence.findMany({
      where: {
        entityType,
        entityId,
        lastSeenAt: { gt: timeout },
      },
      select: {
        userId: true,
        userName: true,
        userEmail: true,
        avatarUrl: true,
        socketId: true,
        lastSeenAt: true,
      },
    });

    return presences;
  }

  /**
   * Get count of active viewers for an entity
   */
  async getViewerCount(entityType: string, entityId: string): Promise<number> {
    const timeout = new Date(
      Date.now() - this.PRESENCE_TIMEOUT_SECONDS * 1000,
    );

    return this.prisma.entityPresence.count({
      where: {
        entityType,
        entityId,
        lastSeenAt: { gt: timeout },
      },
    });
  }

  /**
   * Get all entities a user is currently viewing
   */
  async getUserViewingEntities(
    userId: string,
  ): Promise<{ entityType: string; entityId: string }[]> {
    const timeout = new Date(
      Date.now() - this.PRESENCE_TIMEOUT_SECONDS * 1000,
    );

    return this.prisma.entityPresence.findMany({
      where: {
        userId,
        lastSeenAt: { gt: timeout },
      },
      select: {
        entityType: true,
        entityId: true,
      },
    });
  }

  /**
   * Heartbeat - refresh a user's presence timestamp
   */
  async heartbeat(
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.entityPresence.updateMany({
      where: { entityType, entityId, userId },
      data: { lastSeenAt: new Date() },
    });
  }

  /**
   * Batch heartbeat for multiple entities
   */
  async batchHeartbeat(
    userId: string,
    entities: { entityType: string; entityId: string }[],
  ): Promise<void> {
    await Promise.all(
      entities.map((entity) =>
        this.heartbeat(entity.entityType, entity.entityId, userId),
      ),
    );
  }

  /**
   * Check if a specific user is viewing an entity
   */
  async isUserViewing(
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<boolean> {
    const timeout = new Date(
      Date.now() - this.PRESENCE_TIMEOUT_SECONDS * 1000,
    );

    const presence = await this.prisma.entityPresence.findFirst({
      where: {
        entityType,
        entityId,
        userId,
        lastSeenAt: { gt: timeout },
      },
    });

    return presence !== null;
  }

  /**
   * Get presence summary for multiple entities (for list views)
   */
  async getPresenceSummary(
    entities: { entityType: string; entityId: string }[],
  ): Promise<Map<string, number>> {
    const timeout = new Date(
      Date.now() - this.PRESENCE_TIMEOUT_SECONDS * 1000,
    );

    const counts = await this.prisma.entityPresence.groupBy({
      by: ['entityType', 'entityId'],
      _count: { userId: true },
      where: {
        OR: entities.map((e) => ({
          entityType: e.entityType,
          entityId: e.entityId,
        })),
        lastSeenAt: { gt: timeout },
      },
    });

    const summary = new Map<string, number>();
    for (const count of counts) {
      summary.set(`${count.entityType}:${count.entityId}`, count._count.userId);
    }
    return summary;
  }

  /**
   * Cleanup stale presence records (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupStalePresence(): Promise<void> {
    const timeout = new Date(
      Date.now() - this.PRESENCE_TIMEOUT_SECONDS * 2 * 1000,
    );

    const result = await this.prisma.entityPresence.deleteMany({
      where: {
        lastSeenAt: { lt: timeout },
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Cleaned up ${result.count} stale presence records`);
    }
  }
}

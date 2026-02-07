import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CollaborationService, PresenceInfo } from './collaboration.service';
import { LocksService, LockInfo, LockResult } from './locks.service';

interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  };
}

@Controller('collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly locksService: LocksService,
  ) {}

  // ==================== PRESENCE ENDPOINTS ====================

  /**
   * Get viewers of an entity
   */
  @Get('presence/:entityType/:entityId')
  async getEntityViewers(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<{ viewers: PresenceInfo[] }> {
    const viewers = await this.collaborationService.getEntityViewers(
      entityType,
      entityId,
    );
    return { viewers };
  }

  /**
   * Get viewer count for an entity
   */
  @Get('presence/:entityType/:entityId/count')
  async getViewerCount(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<{ count: number }> {
    const count = await this.collaborationService.getViewerCount(
      entityType,
      entityId,
    );
    return { count };
  }

  /**
   * Get presence summary for multiple entities
   */
  @Post('presence/summary')
  async getPresenceSummary(
    @Body() body: { entities: { entityType: string; entityId: string }[] },
  ): Promise<{ summary: Record<string, number> }> {
    const summaryMap = await this.collaborationService.getPresenceSummary(
      body.entities,
    );
    const summary: Record<string, number> = {};
    summaryMap.forEach((count, key) => {
      summary[key] = count;
    });
    return { summary };
  }

  // ==================== LOCK ENDPOINTS ====================

  /**
   * Get lock status for an entity
   */
  @Get('locks/:entityType/:entityId')
  async getLockStatus(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<{ lock: LockInfo | null; isLocked: boolean }> {
    const lock = await this.locksService.getLockStatus(entityType, entityId);
    return { lock, isLocked: lock !== null };
  }

  /**
   * Acquire a lock on an entity
   */
  @Post('locks/:entityType/:entityId')
  async acquireLock(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() body: { ttlSeconds?: number },
    @Request() req: AuthRequest,
  ): Promise<LockResult> {
    return this.locksService.acquireLock(
      entityType,
      entityId,
      req.user.userId,
      req.user.name || req.user.email,
      req.user.email,
      body.ttlSeconds,
    );
  }

  /**
   * Release a lock on an entity
   */
  @Delete('locks/:entityType/:entityId')
  async releaseLock(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Request() req: AuthRequest,
  ): Promise<{ success: boolean }> {
    const success = await this.locksService.releaseLock(
      entityType,
      entityId,
      req.user.userId,
    );
    return { success };
  }

  /**
   * Refresh a lock (extend TTL)
   */
  @Post('locks/:entityType/:entityId/refresh')
  async refreshLock(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() body: { ttlSeconds?: number },
    @Request() req: AuthRequest,
  ): Promise<LockResult> {
    return this.locksService.refreshLock(
      entityType,
      entityId,
      req.user.userId,
      body.ttlSeconds,
    );
  }

  /**
   * Check if user owns a lock
   */
  @Get('locks/:entityType/:entityId/owned')
  async checkLockOwnership(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Request() req: AuthRequest,
  ): Promise<{ ownsLock: boolean }> {
    const ownsLock = await this.locksService.userOwnsLock(
      entityType,
      entityId,
      req.user.userId,
    );
    return { ownsLock };
  }

  /**
   * Get all locks held by the current user
   */
  @Get('locks/my-locks')
  async getMyLocks(@Request() req: AuthRequest): Promise<{ locks: LockInfo[] }> {
    const locks = await this.locksService.getUserLocks(req.user.userId);
    return { locks };
  }

  /**
   * Force release a lock (admin only - implement role check as needed)
   */
  @Delete('locks/:entityType/:entityId/force')
  async forceReleaseLock(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('confirm') confirm: string,
  ): Promise<{ success: boolean }> {
    if (confirm !== 'true') {
      return { success: false };
    }
    const success = await this.locksService.forceReleaseLock(
      entityType,
      entityId,
    );
    return { success };
  }
}

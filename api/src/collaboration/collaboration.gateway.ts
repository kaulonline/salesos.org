import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CollaborationService, PresenceInfo } from './collaboration.service';
import { LocksService, LockInfo, LockResult } from './locks.service';

interface UserInfo {
  userId: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
}

interface EntityRef {
  entityType: string;
  entityId: string;
}

interface EntityUpdate {
  entityType: string;
  entityId: string;
  changeType: 'created' | 'updated' | 'deleted';
  changedBy: UserInfo;
  timestamp: Date;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://engage.iriseller.com',
      'https://new.iriseller.com',
      'https://iriseller.com',
    ],
    credentials: true,
  },
  namespace: '/collaboration',
})
export class CollaborationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollaborationGateway.name);

  // Map socket ID -> user info
  private socketUsers: Map<string, UserInfo> = new Map();

  // Map socket ID -> entities being viewed
  private socketEntities: Map<string, Set<string>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly collaborationService: CollaborationService,
    private readonly locksService: LocksService,
  ) {}

  afterInit() {
    this.logger.log('Collaboration WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userInfo: UserInfo = {
        userId: payload.sub,
        userName: payload.name || payload.email,
        userEmail: payload.email,
        avatarUrl: payload.avatarUrl,
      };

      this.socketUsers.set(client.id, userInfo);
      this.socketEntities.set(client.id, new Set());

      // Join user-specific room
      client.join(`user:${userInfo.userId}`);

      this.logger.log(
        `Client ${client.id} connected for user ${userInfo.userName}`,
      );

      client.emit('connected', { userId: userInfo.userId });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userInfo = this.socketUsers.get(client.id);
    if (userInfo) {
      // Remove presence from all entities
      const affectedEntities =
        await this.collaborationService.removeSocketPresence(client.id);

      // Notify other viewers of affected entities
      for (const entityKey of affectedEntities) {
        const [entityType, entityId] = entityKey.split(':');
        const viewers = await this.collaborationService.getEntityViewers(
          entityType,
          entityId,
        );
        this.server.to(`entity:${entityKey}`).emit('presence:updated', {
          entityType,
          entityId,
          viewers,
        });
      }

      // Release any locks held by this user
      await this.locksService.releaseAllUserLocks(userInfo.userId);

      this.socketUsers.delete(client.id);
      this.socketEntities.delete(client.id);

      this.logger.log(`Client ${client.id} disconnected`);
    }
  }

  // ==================== PRESENCE HANDLERS ====================

  @SubscribeMessage('presence:join')
  async handleJoinEntity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EntityRef,
  ): Promise<{ viewers: PresenceInfo[] }> {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) return { viewers: [] };

    const { entityType, entityId } = data;
    const entityKey = `${entityType}:${entityId}`;

    // Join the entity room
    client.join(`entity:${entityKey}`);

    // Track which entities this socket is viewing
    this.socketEntities.get(client.id)?.add(entityKey);

    // Announce presence
    const viewers = await this.collaborationService.announcePresence(
      entityType,
      entityId,
      userInfo.userId,
      userInfo.userName,
      userInfo.userEmail,
      userInfo.avatarUrl,
      client.id,
    );

    // Notify others in the room
    client.to(`entity:${entityKey}`).emit('presence:updated', {
      entityType,
      entityId,
      viewers,
    });

    this.logger.debug(`User ${userInfo.userName} joined ${entityKey}`);
    return { viewers };
  }

  @SubscribeMessage('presence:leave')
  async handleLeaveEntity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EntityRef,
  ): Promise<void> {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) return;

    const { entityType, entityId } = data;
    const entityKey = `${entityType}:${entityId}`;

    // Leave the entity room
    client.leave(`entity:${entityKey}`);

    // Remove from tracking
    this.socketEntities.get(client.id)?.delete(entityKey);

    // Remove presence
    await this.collaborationService.leaveEntity(
      entityType,
      entityId,
      userInfo.userId,
    );

    // Notify others
    const viewers = await this.collaborationService.getEntityViewers(
      entityType,
      entityId,
    );
    this.server.to(`entity:${entityKey}`).emit('presence:updated', {
      entityType,
      entityId,
      viewers,
    });

    this.logger.debug(`User ${userInfo.userName} left ${entityKey}`);
  }

  @SubscribeMessage('presence:heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EntityRef,
  ): Promise<void> {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) return;

    await this.collaborationService.heartbeat(
      data.entityType,
      data.entityId,
      userInfo.userId,
    );
  }

  @SubscribeMessage('presence:getViewers')
  async handleGetViewers(
    @MessageBody() data: EntityRef,
  ): Promise<{ viewers: PresenceInfo[] }> {
    const viewers = await this.collaborationService.getEntityViewers(
      data.entityType,
      data.entityId,
    );
    return { viewers };
  }

  // ==================== LOCKING HANDLERS ====================

  @SubscribeMessage('lock:acquire')
  async handleAcquireLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EntityRef & { ttlSeconds?: number },
  ): Promise<LockResult> {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await this.locksService.acquireLock(
      data.entityType,
      data.entityId,
      userInfo.userId,
      userInfo.userName,
      userInfo.userEmail,
      data.ttlSeconds,
    );

    // Notify others if lock was acquired
    if (result.success) {
      const entityKey = `${data.entityType}:${data.entityId}`;
      client.to(`entity:${entityKey}`).emit('lock:acquired', {
        entityType: data.entityType,
        entityId: data.entityId,
        lock: result.lock,
      });
    }

    return result;
  }

  @SubscribeMessage('lock:release')
  async handleReleaseLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EntityRef,
  ): Promise<{ success: boolean }> {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) return { success: false };

    const success = await this.locksService.releaseLock(
      data.entityType,
      data.entityId,
      userInfo.userId,
    );

    if (success) {
      const entityKey = `${data.entityType}:${data.entityId}`;
      this.server.to(`entity:${entityKey}`).emit('lock:released', {
        entityType: data.entityType,
        entityId: data.entityId,
        releasedBy: userInfo,
      });
    }

    return { success };
  }

  @SubscribeMessage('lock:refresh')
  async handleRefreshLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EntityRef & { ttlSeconds?: number },
  ): Promise<LockResult> {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) {
      return { success: false, error: 'Not authenticated' };
    }

    return this.locksService.refreshLock(
      data.entityType,
      data.entityId,
      userInfo.userId,
      data.ttlSeconds,
    );
  }

  @SubscribeMessage('lock:status')
  async handleGetLockStatus(
    @MessageBody() data: EntityRef,
  ): Promise<{ lock: LockInfo | null }> {
    const lock = await this.locksService.getLockStatus(
      data.entityType,
      data.entityId,
    );
    return { lock };
  }

  // ==================== ENTITY UPDATE BROADCASTS ====================

  /**
   * Broadcast an entity update to all viewers (called from other services)
   */
  broadcastEntityUpdate(update: EntityUpdate): void {
    const entityKey = `${update.entityType}:${update.entityId}`;
    this.server.to(`entity:${entityKey}`).emit('entity:updated', update);
    this.logger.debug(
      `Broadcasted ${update.changeType} for ${entityKey} by ${update.changedBy.userName}`,
    );
  }

  /**
   * Notify a specific user about an update (e.g., someone edited their viewing record)
   */
  notifyUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ==================== UTILITY ====================

  /**
   * Get count of users currently viewing an entity
   */
  async getViewerCount(entityType: string, entityId: string): Promise<number> {
    return this.collaborationService.getViewerCount(entityType, entityId);
  }

  /**
   * Check if an entity is locked
   */
  async isEntityLocked(
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    return this.locksService.isLocked(entityType, entityId);
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';

interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  action?: string;
  actionData?: Record<string, any>;
  createdAt: Date;
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
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // Map of userId -> Set of socket IDs
  private userConnections: Map<string, Set<string>> = new Map();

  // Map of socket ID -> userId
  private socketToUser: Map<string, string> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit() {
    this.logger.log('Notifications WebSocket Gateway initialized');
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
      const userId = payload.sub;

      // Store connection
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(client.id);
      this.socketToUser.set(client.id, userId);

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(`Client ${client.id} connected for user ${userId}`);

      // Send any pending notifications
      const pendingNotifications =
        await this.notificationsService.getPendingNotificationsForUser(userId);
      if (pendingNotifications.length > 0) {
        client.emit('pendingNotifications', pendingNotifications);
      }
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      const userSockets = this.userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userConnections.delete(userId);
        }
      }
      this.socketToUser.delete(client.id);
      this.logger.log(`Client ${client.id} disconnected for user ${userId}`);
    }
  }

  // ==================== MESSAGE HANDLERS ====================

  @SubscribeMessage('markAsDelivered')
  async handleMarkAsDelivered(client: Socket, notificationId: string) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    try {
      await this.notificationsService.markAsDelivered(notificationId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to mark notification ${notificationId} as delivered:`, error);
      return { success: false, error: 'Failed to mark as delivered' };
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(client: Socket, notificationId: string) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    try {
      await this.notificationsService.markAsRead(notificationId, userId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to mark notification ${notificationId} as read:`, error);
      return { success: false, error: 'Failed to mark as read' };
    }
  }

  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return { count: 0 };

    const result = await this.notificationsService.getUserNotifications(
      userId,
      1,
      1,
      true,
    );
    return { count: result.unreadCount };
  }

  // ==================== PUSH METHODS ====================

  /**
   * Push notification to a specific user
   */
  pushToUser(userId: string, notification: NotificationPayload): boolean {
    const userSockets = this.userConnections.get(userId);
    if (!userSockets || userSockets.size === 0) {
      this.logger.debug(`User ${userId} is not connected`);
      return false;
    }

    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`Pushed notification ${notification.id} to user ${userId}`);
    return true;
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcastNotification(notification: NotificationPayload): number {
    this.server.emit('notification', notification);
    this.logger.log(`Broadcasted notification ${notification.id} to all users`);
    return this.userConnections.size;
  }

  /**
   * Push notification to multiple specific users
   */
  pushToUsers(userIds: string[], notification: NotificationPayload): number {
    let successCount = 0;
    for (const userId of userIds) {
      if (this.pushToUser(userId, notification)) {
        successCount++;
      }
    }
    return successCount;
  }

  /**
   * Send feature visibility update to user
   */
  sendFeatureUpdate(userId: string) {
    this.server.to(`user:${userId}`).emit('featureUpdate', { refresh: true });
  }

  /**
   * Send license update to user
   */
  sendLicenseUpdate(userId: string) {
    this.server.to(`user:${userId}`).emit('licenseUpdate', { refresh: true });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if a user is currently online
   */
  isUserOnline(userId: string): boolean {
    const userSockets = this.userConnections.get(userId);
    return userSockets !== undefined && userSockets.size > 0;
  }

  /**
   * Get count of online users
   */
  getOnlineUserCount(): number {
    return this.userConnections.size;
  }

  /**
   * Get all online user IDs
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.userConnections.keys());
  }
}

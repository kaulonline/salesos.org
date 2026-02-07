/**
 * Socket.io client for real-time collaboration features
 * Handles presence tracking, record locking, and live entity updates
 */
import { io, Socket } from 'socket.io-client';
import { logger } from './logger';

export interface PresenceInfo {
  userId: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  socketId: string;
  lastSeenAt: Date;
}

export interface LockInfo {
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  acquiredAt: Date;
  expiresAt: Date;
}

export interface LockResult {
  success: boolean;
  lock?: LockInfo;
  lockedBy?: LockInfo;
  error?: string;
}

export interface EntityUpdate {
  entityType: string;
  entityId: string;
  changeType: 'created' | 'updated' | 'deleted';
  changedBy: {
    userId: string;
    userName: string;
    userEmail?: string;
    avatarUrl?: string;
  };
  timestamp: Date;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

type EventHandler<T = unknown> = (data: T) => void;

class CollaborationSocketManager {
  private socket: Socket | null = null;
  private isIntentionallyClosed = false;
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private currentEntities = new Set<string>(); // Track joined entities

  private log(message: string, ...args: unknown[]) {
    if (import.meta.env.DEV) {
      logger.info('[Collaboration]', message, ...args);
    }
  }

  connect(): void {
    if (this.socket?.connected) {
      this.log('Already connected');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.log('No auth token, skipping connection');
      return;
    }

    this.isIntentionallyClosed = false;

    const baseUrl = import.meta.env.VITE_API_URL || '';
    this.socket = io(`${baseUrl}/collaboration`, {
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventHandlers();
    this.log('Connecting to collaboration socket');
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.log('Connected');
      this.startHeartbeat();
      this.emit('connect', undefined);

      // Rejoin any entities we were viewing
      this.currentEntities.forEach((entityKey) => {
        const [entityType, entityId] = entityKey.split(':');
        this.joinEntity(entityType, entityId);
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.log('Disconnected:', reason);
      this.stopHeartbeat();
      this.emit('disconnect', { reason });
    });

    this.socket.on('connect_error', (error) => {
      this.log('Connection error:', error.message);
      this.emit('error', { error: error.message });
    });

    // Presence events
    this.socket.on('presence:updated', (data) => {
      this.emit('presence:updated', data);
    });

    // Lock events
    this.socket.on('lock:acquired', (data) => {
      this.emit('lock:acquired', data);
    });

    this.socket.on('lock:released', (data) => {
      this.emit('lock:released', data);
    });

    // Entity update events
    this.socket.on('entity:updated', (data: EntityUpdate) => {
      this.emit('entity:updated', data);
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    // Send heartbeat every 30 seconds to keep presence active
    this.heartbeatInterval = setInterval(() => {
      this.currentEntities.forEach((entityKey) => {
        const [entityType, entityId] = entityKey.split(':');
        this.socket?.emit('presence:heartbeat', { entityType, entityId });
      });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    this.currentEntities.clear();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.log('Disconnected intentionally');
  }

  // ==================== PRESENCE ====================

  async joinEntity(
    entityType: string,
    entityId: string,
  ): Promise<{ viewers: PresenceInfo[] }> {
    if (!this.socket?.connected) {
      return { viewers: [] };
    }

    const entityKey = `${entityType}:${entityId}`;
    this.currentEntities.add(entityKey);

    return new Promise((resolve) => {
      this.socket!.emit(
        'presence:join',
        { entityType, entityId },
        (response: { viewers: PresenceInfo[] }) => {
          this.log(`Joined ${entityKey}, ${response.viewers.length} viewers`);
          resolve(response);
        },
      );
    });
  }

  leaveEntity(entityType: string, entityId: string): void {
    if (!this.socket?.connected) return;

    const entityKey = `${entityType}:${entityId}`;
    this.currentEntities.delete(entityKey);

    this.socket.emit('presence:leave', { entityType, entityId });
    this.log(`Left ${entityKey}`);
  }

  async getEntityViewers(
    entityType: string,
    entityId: string,
  ): Promise<{ viewers: PresenceInfo[] }> {
    if (!this.socket?.connected) {
      return { viewers: [] };
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        'presence:getViewers',
        { entityType, entityId },
        (response: { viewers: PresenceInfo[] }) => {
          resolve(response);
        },
      );
    });
  }

  // ==================== LOCKING ====================

  async acquireLock(
    entityType: string,
    entityId: string,
    ttlSeconds?: number,
  ): Promise<LockResult> {
    if (!this.socket?.connected) {
      return { success: false, error: 'Not connected' };
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        'lock:acquire',
        { entityType, entityId, ttlSeconds },
        (result: LockResult) => {
          this.log(`Lock ${result.success ? 'acquired' : 'denied'} for ${entityType}/${entityId}`);
          resolve(result);
        },
      );
    });
  }

  async releaseLock(
    entityType: string,
    entityId: string,
  ): Promise<{ success: boolean }> {
    if (!this.socket?.connected) {
      return { success: false };
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        'lock:release',
        { entityType, entityId },
        (result: { success: boolean }) => {
          this.log(`Lock released for ${entityType}/${entityId}`);
          resolve(result);
        },
      );
    });
  }

  async refreshLock(
    entityType: string,
    entityId: string,
    ttlSeconds?: number,
  ): Promise<LockResult> {
    if (!this.socket?.connected) {
      return { success: false, error: 'Not connected' };
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        'lock:refresh',
        { entityType, entityId, ttlSeconds },
        (result: LockResult) => {
          resolve(result);
        },
      );
    });
  }

  async getLockStatus(
    entityType: string,
    entityId: string,
  ): Promise<{ lock: LockInfo | null }> {
    if (!this.socket?.connected) {
      return { lock: null };
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        'lock:status',
        { entityType, entityId },
        (result: { lock: LockInfo | null }) => {
          resolve(result);
        },
      );
    });
  }

  // ==================== EVENT HANDLING ====================

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler);

    return () => {
      this.eventHandlers.get(event)?.delete(handler as EventHandler);
    };
  }

  off(event: string, handler?: EventHandler): void {
    if (handler) {
      this.eventHandlers.get(event)?.delete(handler);
    } else {
      this.eventHandlers.delete(event);
    }
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          this.log('Event handler error:', error);
        }
      });
    }
  }

  // ==================== UTILITY ====================

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const collaborationSocket = new CollaborationSocketManager();

// Initialize on auth
export function initCollaborationSocket(): void {
  const token = localStorage.getItem('token');
  if (token) {
    collaborationSocket.connect();
  }
}

// Cleanup on logout
export function cleanupCollaborationSocket(): void {
  collaborationSocket.disconnect();
}

export default collaborationSocket;

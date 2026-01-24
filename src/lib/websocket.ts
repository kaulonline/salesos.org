import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';
import { captureError, addBreadcrumb } from './errorTracking';

type MessageHandler = (data: unknown) => void;
type ConnectionHandler = () => void;

interface WebSocketMessage {
  type: string;
  entity?: string;
  entityId?: string;
  action?: 'created' | 'updated' | 'deleted';
  data?: unknown;
  timestamp?: string;
}

interface WebSocketOptions {
  url?: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

const DEFAULT_OPTIONS: Required<WebSocketOptions> = {
  url: import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
  reconnectAttempts: 5,
  reconnectInterval: 3000,
  heartbeatInterval: 30000,
  debug: import.meta.env.DEV,
};

class WebSocketManager {
  private socket: WebSocket | null = null;
  private options: Required<WebSocketOptions>;
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private disconnectionHandlers = new Set<ConnectionHandler>();
  private isIntentionallyClosed = false;

  constructor(options: WebSocketOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private log(message: string, ...args: unknown[]) {
    if (this.options.debug) {
      console.log(`[WebSocket] ${message}`, ...args);
    }
  }

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.log('Already connected');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.log('No auth token, skipping connection');
      return;
    }

    this.isIntentionallyClosed = false;
    const url = `${this.options.url}?token=${encodeURIComponent(token)}`;

    try {
      this.socket = new WebSocket(url);
      this.setupEventHandlers();
      this.log('Connecting to', this.options.url);
    } catch (error) {
      captureError(error as Error, { context: 'WebSocket connection' });
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.log('Connected');
      this.reconnectCount = 0;
      this.startHeartbeat();
      this.connectionHandlers.forEach((handler) => handler());
      addBreadcrumb('websocket', 'Connected');
    };

    this.socket.onclose = (event) => {
      this.log('Disconnected', event.code, event.reason);
      this.stopHeartbeat();
      this.disconnectionHandlers.forEach((handler) => handler());

      if (!this.isIntentionallyClosed && event.code !== 1000) {
        this.scheduleReconnect();
      }

      addBreadcrumb('websocket', 'Disconnected', { code: event.code, reason: event.reason });
    };

    this.socket.onerror = (event) => {
      this.log('Error', event);
      captureError(new Error('WebSocket error'), { context: 'WebSocket' });
    };

    this.socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        this.log('Failed to parse message', event.data);
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    this.log('Received', message.type, message);

    // Handle built-in message types
    if (message.type === 'pong') {
      return; // Heartbeat response
    }

    // Handle entity updates (invalidate relevant queries)
    if (message.type === 'entity_update' && message.entity && message.action) {
      this.handleEntityUpdate(message);
    }

    // Notify registered handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message.data));
    }

    // Also notify wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(message));
    }
  }

  private handleEntityUpdate(message: WebSocketMessage): void {
    const { entity, entityId, action } = message;

    // Map entity names to query key factories
    const entityKeyMap: Record<string, () => readonly string[]> = {
      lead: () => queryKeys.leads.all,
      contact: () => queryKeys.contacts.all,
      company: () => queryKeys.companies.all,
      account: () => queryKeys.companies.all,
      deal: () => queryKeys.deals.all,
      opportunity: () => queryKeys.deals.all,
      task: () => queryKeys.tasks.all,
      meeting: () => queryKeys.meetings.all,
      activity: () => queryKeys.activities.all,
    };

    const getQueryKey = entityKeyMap[entity!];
    if (!getQueryKey) {
      this.log('Unknown entity type', entity);
      return;
    }

    // Invalidate queries based on action
    switch (action) {
      case 'created':
      case 'deleted':
        // Invalidate list queries
        queryClient.invalidateQueries({ queryKey: getQueryKey() });
        break;
      case 'updated':
        // Invalidate both list and detail queries
        queryClient.invalidateQueries({ queryKey: getQueryKey() });
        if (entityId) {
          // Also invalidate specific detail query
          queryClient.invalidateQueries({
            queryKey: [...getQueryKey(), 'detail', entityId]
          });
        }
        break;
    }

    this.log('Invalidated queries for', entity, action);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectCount >= this.options.reconnectAttempts) {
      this.log('Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.options.reconnectInterval * Math.pow(1.5, this.reconnectCount);
    this.reconnectCount++;

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.log('Disconnected intentionally');
  }

  send(data: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.log('Cannot send, not connected');
      return;
    }

    this.socket.send(JSON.stringify(data));
  }

  subscribe(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  get readyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

// Auto-connect when authenticated
export function initWebSocket(): void {
  const token = localStorage.getItem('token');
  if (token) {
    wsManager.connect();
  }
}

// Disconnect on logout
export function cleanupWebSocket(): void {
  wsManager.disconnect();
}

export default wsManager;

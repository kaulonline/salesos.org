import { useEffect, useState, useCallback, useRef } from 'react';
import { wsManager } from '../lib/websocket';

// Hook to manage WebSocket connection state
export function useWebSocketConnection() {
  const [isConnected, setIsConnected] = useState(wsManager.isConnected);

  useEffect(() => {
    const unsubConnect = wsManager.onConnect(() => setIsConnected(true));
    const unsubDisconnect = wsManager.onDisconnect(() => setIsConnected(false));

    // Sync initial state
    setIsConnected(wsManager.isConnected);

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  const connect = useCallback(() => wsManager.connect(), []);
  const disconnect = useCallback(() => wsManager.disconnect(), []);

  return {
    isConnected,
    connect,
    disconnect,
    readyState: wsManager.readyState,
  };
}

// Hook to subscribe to specific message types
export function useWebSocketMessage<T = unknown>(
  type: string,
  handler: (data: T) => void
) {
  const handlerRef = useRef(handler);

  // Keep handler ref updated
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe(type, (data) => {
      handlerRef.current(data as T);
    });

    return unsubscribe;
  }, [type]);
}

// Hook to subscribe to entity updates
interface EntityUpdate {
  entityId: string;
  action: 'created' | 'updated' | 'deleted';
  data?: unknown;
}

export function useEntityUpdates(
  entity: 'lead' | 'contact' | 'company' | 'deal' | 'task' | 'meeting' | 'activity',
  handler: (update: EntityUpdate) => void
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe('entity_update', (message: unknown) => {
      const msg = message as { entity?: string; entityId?: string; action?: string; data?: unknown };
      if (msg.entity === entity) {
        handlerRef.current({
          entityId: msg.entityId!,
          action: msg.action as EntityUpdate['action'],
          data: msg.data,
        });
      }
    });

    return unsubscribe;
  }, [entity]);
}

// Hook for real-time presence (who's online, who's viewing what)
interface PresenceUser {
  userId: string;
  name: string;
  avatar?: string;
  currentPage?: string;
  lastActive: string;
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [viewingPage, setViewingPage] = useState<Record<string, PresenceUser[]>>({});

  useEffect(() => {
    // Subscribe to presence updates
    const unsubPresence = wsManager.subscribe('presence', (data: unknown) => {
      const presence = data as { users?: PresenceUser[] };
      if (presence.users) {
        setOnlineUsers(presence.users);
      }
    });

    const unsubPageView = wsManager.subscribe('page_view', (data: unknown) => {
      const pageView = data as { page?: string; users?: PresenceUser[] };
      if (pageView.page && pageView.users) {
        setViewingPage((prev) => ({
          ...prev,
          [pageView.page!]: pageView.users!,
        }));
      }
    });

    // Announce our presence
    wsManager.send({ type: 'presence_join' });

    return () => {
      unsubPresence();
      unsubPageView();
      wsManager.send({ type: 'presence_leave' });
    };
  }, []);

  const announcePageView = useCallback((page: string) => {
    wsManager.send({ type: 'page_view', page });
  }, []);

  return {
    onlineUsers,
    viewingPage,
    announcePageView,
  };
}

// Hook for real-time notifications
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  link?: string;
  timestamp: string;
  read: boolean;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe('notification', (data: unknown) => {
      const notification = data as Notification;
      setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    wsManager.send({ type: 'notification_read', id });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    wsManager.send({ type: 'notification_read_all' });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}

// Hook for typing indicators (e.g., in chat or collaborative editing)
export function useTypingIndicator(channelId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe('typing', (data: unknown) => {
      const typing = data as { channelId?: string; userId?: string; isTyping?: boolean };
      if (typing.channelId === channelId) {
        setTypingUsers((prev) => {
          if (typing.isTyping) {
            return prev.includes(typing.userId!) ? prev : [...prev, typing.userId!];
          }
          return prev.filter((id) => id !== typing.userId);
        });
      }
    });

    return unsubscribe;
  }, [channelId]);

  const startTyping = useCallback(() => {
    wsManager.send({ type: 'typing', channelId, isTyping: true });

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      wsManager.send({ type: 'typing', channelId, isTyping: false });
    }, 3000);
  }, [channelId]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    wsManager.send({ type: 'typing', channelId, isTyping: false });
  }, [channelId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { wsManager, initWebSocket, cleanupWebSocket } from '../lib/websocket';
import { useWebSocketConnection, useRealtimeNotifications, usePresence } from '../hooks/useRealtimeSync';
import { useAuth } from '../context/AuthContext';

interface RealtimeContextValue {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  notifications: ReturnType<typeof useRealtimeNotifications>;
  presence: ReturnType<typeof usePresence>;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { isAuthenticated } = useAuth();
  const { isConnected, connect, disconnect } = useWebSocketConnection();
  const notifications = useRealtimeNotifications();
  const presence = usePresence();

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuthenticated) {
      initWebSocket();
    } else {
      cleanupWebSocket();
    }

    return () => {
      cleanupWebSocket();
    };
  }, [isAuthenticated]);

  const value: RealtimeContextValue = {
    isConnected,
    connect,
    disconnect,
    notifications,
    presence,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

// Component to show connection status
export function ConnectionIndicator() {
  const { isConnected } = useRealtime();

  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-gray-600">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

// Component to show online users
export function OnlineUsers() {
  const { presence } = useRealtime();

  if (presence.onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center -space-x-2">
      {presence.onlineUsers.slice(0, 5).map((user) => (
        <div
          key={user.userId}
          className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-sm font-medium"
          title={user.name}
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
      ))}
      {presence.onlineUsers.length > 5 && (
        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
          +{presence.onlineUsers.length - 5}
        </div>
      )}
    </div>
  );
}

// Component to show notification badge
export function NotificationBadge() {
  const { notifications } = useRealtime();

  if (notifications.unreadCount === 0) {
    return null;
  }

  return (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
      {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
    </span>
  );
}

import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  getPermissionStatus,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscription,
  registerServiceWorker,
  showLocalNotification,
  type NotificationPermissionState,
  type PushSubscriptionData,
} from '../lib/pushNotifications';
import { api } from '../api/client';
import { logger } from '../lib/logger';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<NotificationPermissionState>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => Promise<void>;
  testNotification: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    getPermissionStatus()
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check subscription status on mount
  useEffect(() => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        await registerServiceWorker();
        const subscription = await getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        logger.error('Error checking push subscription:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported]);

  // Listen for permission changes
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      // Check permission when tab becomes visible
      if (document.visibilityState === 'visible') {
        setPermission(getPermissionStatus());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSupported]);

  const handleRequestPermission = useCallback(async () => {
    if (!isSupported) return 'denied' as NotificationPermissionState;

    setError(null);
    const result = await requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const subscriptionData = await subscribeToPush();

      if (!subscriptionData) {
        setError('Failed to subscribe to push notifications');
        return false;
      }

      // Send subscription to backend
      try {
        await api.post('/notifications/push/subscribe', subscriptionData);
      } catch (apiError) {
        logger.warn('Failed to register subscription with server:', apiError);
        // Don't fail - local subscription still works
      }

      setIsSubscribed(true);
      setPermission(getPermissionStatus());
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe';
      setError(message);
      logger.error('Push subscription error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await unsubscribeFromPush();

      if (success) {
        // Notify backend
        try {
          await api.post('/notifications/push/unsubscribe');
        } catch (apiError) {
          logger.warn('Failed to unregister subscription with server:', apiError);
        }

        setIsSubscribed(false);
      }

      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unsubscribe';
      setError(message);
      logger.error('Push unsubscribe error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== 'granted') return;
      await showLocalNotification(title, options);
    },
    [isSupported, permission]
  );

  const testNotification = useCallback(async () => {
    await showNotification('Test Notification', {
      body: 'Push notifications are working correctly!',
      tag: 'test-notification',
      data: { url: '/dashboard' },
    });
  }, [showNotification]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission: handleRequestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    testNotification,
  };
}

export default usePushNotifications;

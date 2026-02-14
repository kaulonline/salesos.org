/**
 * Push Notification utilities for browser notifications
 */

import { logger } from './logger';

// VAPID public key for push notifications (should come from env in production)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export type NotificationPermissionState = 'default' | 'granted' | 'denied';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus(): NotificationPermissionState {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Request notification permission from user
 */
export async function requestPermission(): Promise<NotificationPermissionState> {
  if (!('Notification' in window)) {
    logger.warn('Notifications not supported');
    return 'denied';
  }

  try {
    const result = await Notification.requestPermission();
    logger.info(`Notification permission: ${result}`);
    return result as NotificationPermissionState;
  } catch (error) {
    logger.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Register service worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    logger.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    logger.info('Service worker registered:', registration.scope);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    logger.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Get existing push subscription
 */
export async function getSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    logger.error('Error getting push subscription:', error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    logger.warn('Push notifications not supported');
    return null;
  }

  const permission = await requestPermission();
  if (permission !== 'granted') {
    logger.warn('Notification permission not granted');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      const options: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      };

      // Add VAPID key if available
      if (VAPID_PUBLIC_KEY) {
        options.applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      }

      subscription = await registration.pushManager.subscribe(options);
    }

    const subscriptionData = formatSubscription(subscription);
    logger.info('Push subscription created');

    return subscriptionData;
  } catch (error) {
    logger.error('Error subscribing to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const subscription = await getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      logger.info('Unsubscribed from push notifications');
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error unsubscribing from push:', error);
    return false;
  }
}

/**
 * Show a local notification (not pushed from server)
 */
export async function showLocalNotification(
  title: string,
  options: NotificationOptions = {}
): Promise<void> {
  const permission = getPermissionStatus();
  if (permission !== 'granted') {
    logger.warn('Cannot show notification - permission not granted');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      ...options,
    });
  } catch (error) {
    logger.error('Error showing notification:', error);
  }
}

/**
 * Format push subscription for API
 */
function formatSubscription(subscription: PushSubscription): PushSubscriptionData {
  const rawKey = subscription.getKey('p256dh');
  const rawAuth = subscription.getKey('auth');

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: rawKey ? arrayBufferToBase64(rawKey) : '',
      auth: rawAuth ? arrayBufferToBase64(rawAuth) : '',
    },
  };
}

/**
 * Convert URL-safe base64 to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Notification types for the app
 */
export const NOTIFICATION_TYPES = {
  DEAL_UPDATE: 'deal_update',
  LEAD_ASSIGNED: 'lead_assigned',
  TASK_DUE: 'task_due',
  MEETING_REMINDER: 'meeting_reminder',
  QUOTE_APPROVED: 'quote_approved',
  ORDER_UPDATE: 'order_update',
  SYSTEM_ALERT: 'system_alert',
  CAMPAIGN_UPDATE: 'campaign_update',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/**
 * Create notification options based on type
 */
export function createNotificationOptions(
  type: NotificationType,
  data: Record<string, unknown> = {}
): NotificationOptions & Record<string, any> {
  const baseOptions: NotificationOptions & Record<string, any> = {
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data,
  };

  switch (type) {
    case NOTIFICATION_TYPES.DEAL_UPDATE:
      return {
        ...baseOptions,
        tag: 'deal-update',
        actions: [
          { action: 'view', title: 'View Deal' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

    case NOTIFICATION_TYPES.TASK_DUE:
      return {
        ...baseOptions,
        tag: 'task-due',
        requireInteraction: true,
        actions: [
          { action: 'complete', title: 'Mark Complete' },
          { action: 'snooze', title: 'Snooze 1hr' },
        ],
      };

    case NOTIFICATION_TYPES.MEETING_REMINDER:
      return {
        ...baseOptions,
        tag: 'meeting-reminder',
        requireInteraction: true,
        actions: [
          { action: 'join', title: 'Join Meeting' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

    case NOTIFICATION_TYPES.SYSTEM_ALERT:
      return {
        ...baseOptions,
        tag: 'system-alert',
        requireInteraction: true,
      };

    default:
      return baseOptions;
  }
}

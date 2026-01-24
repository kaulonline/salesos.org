import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  initOfflineStorage,
  getPendingMutations,
  removePendingMutation,
  incrementMutationRetry,
  addPendingMutation,
  getStorageStats,
  cleanupExpired,
} from '../lib/offlineStorage';
import client from '../api/client';
import { captureError } from '../lib/errorTracking';

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30 * 1000; // 30 seconds

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Initialize offline storage
  useEffect(() => {
    initOfflineStorage().catch(console.error);
    cleanupExpired().catch(console.error);
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingMutations();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending mutations
  const syncPendingMutations = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const mutations = await getPendingMutations();
      setPendingCount(mutations.length);

      for (const mutation of mutations) {
        if (mutation.retries >= MAX_RETRIES) {
          // Too many retries, remove and log error
          await removePendingMutation(mutation.id!);
          captureError(new Error('Mutation failed after max retries'), {
            context: 'OfflineSync',
            extra: { mutation },
          });
          continue;
        }

        try {
          // Execute mutation based on type
          switch (mutation.type) {
            case 'create':
              await client.post(`/${mutation.entity}`, mutation.data);
              break;
            case 'update':
              await client.put(`/${mutation.entity}/${mutation.entityId}`, mutation.data);
              break;
            case 'delete':
              await client.delete(`/${mutation.entity}/${mutation.entityId}`);
              break;
          }

          // Success - remove from pending
          await removePendingMutation(mutation.id!);

          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: [mutation.entity] });
        } catch (error) {
          // Increment retry count
          await incrementMutationRetry(mutation.id!);
        }
      }

      // Update pending count after sync
      const remaining = await getPendingMutations();
      setPendingCount(remaining.length);
      setLastSyncTime(new Date());
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, queryClient]);

  // Periodic sync
  useEffect(() => {
    if (isOnline) {
      syncPendingMutations();
      syncIntervalRef.current = setInterval(syncPendingMutations, SYNC_INTERVAL);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, syncPendingMutations]);

  // Queue mutation for offline sync
  const queueMutation = useCallback(
    async (
      type: 'create' | 'update' | 'delete',
      entity: string,
      entityId?: string,
      data?: unknown
    ) => {
      await addPendingMutation(type, entity, entityId, data);
      setPendingCount((prev) => prev + 1);

      // Try to sync immediately if online
      if (navigator.onLine) {
        syncPendingMutations();
      }
    },
    [syncPendingMutations]
  );

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncNow: syncPendingMutations,
    queueMutation,
  };
}

// Hook for offline indicator component
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show "back online" indicator briefly
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return {
    isOnline,
    wasOffline,
    showReconnected: isOnline && wasOffline,
  };
}

// Storage usage hook
export function useStorageStats() {
  const [stats, setStats] = useState<{
    entities: number;
    pendingMutations: number;
    queryCache: number;
  } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const data = await getStorageStats();
      setStats(data);
    };

    loadStats();
  }, []);

  return stats;
}

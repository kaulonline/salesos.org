import { useState, useEffect, useCallback, useRef } from 'react';
import { collaborationSocket, LockInfo, LockResult } from '../lib/collaborationSocket';
import { useAuth } from '../context/AuthContext';

export interface UseEntityLockOptions {
  /** TTL in seconds for the lock (default: 300 = 5 minutes) */
  ttlSeconds?: number;
  /** Whether to auto-acquire lock when editing starts */
  autoAcquire?: boolean;
  /** Interval in seconds to refresh the lock (default: 60) */
  refreshInterval?: number;
  /** Callback when lock is acquired by another user */
  onLockTaken?: (lock: LockInfo) => void;
  /** Callback when lock is released */
  onLockReleased?: () => void;
}

export interface UseEntityLockReturn {
  /** Whether the entity is currently locked by anyone */
  isLocked: boolean;
  /** Whether the current user holds the lock */
  hasLock: boolean;
  /** Info about who holds the lock (if locked) */
  lockedBy: LockInfo | null;
  /** Whether the current user can edit (not locked or has lock) */
  canEdit: boolean;
  /** Whether a lock operation is in progress */
  isLoading: boolean;
  /** Error message if lock operation failed */
  error: string | null;
  /** Time remaining on current lock in seconds */
  timeRemaining: number | null;
  /** Acquire the lock */
  acquireLock: () => Promise<boolean>;
  /** Release the lock */
  releaseLock: () => Promise<void>;
  /** Force acquire (takes over from another user with confirmation) */
  forceAcquire: () => Promise<boolean>;
}

export function useEntityLock(
  entityType: string,
  entityId: string,
  options: UseEntityLockOptions = {},
): UseEntityLockReturn {
  const {
    ttlSeconds = 300,
    autoAcquire = false,
    refreshInterval = 60,
    onLockTaken,
    onLockReleased,
  } = options;

  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [hasLock, setHasLock] = useState(false);
  const [lockedBy, setLockedBy] = useState<LockInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate time remaining
  const updateTimeRemaining = useCallback((lock: LockInfo | null) => {
    if (!lock) {
      setTimeRemaining(null);
      return;
    }
    const remaining = Math.max(
      0,
      Math.floor((new Date(lock.expiresAt).getTime() - Date.now()) / 1000),
    );
    setTimeRemaining(remaining);
  }, []);

  // Start countdown timer
  const startCountdown = useCallback((lock: LockInfo) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    updateTimeRemaining(lock);
    countdownTimerRef.current = setInterval(() => {
      updateTimeRemaining(lock);
    }, 1000);
  }, [updateTimeRemaining]);

  // Stop countdown timer
  const stopCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setTimeRemaining(null);
  }, []);

  // Fetch current lock status
  const checkLockStatus = useCallback(async () => {
    const result = await collaborationSocket.getLockStatus(entityType, entityId);
    if (result.lock) {
      setIsLocked(true);
      setLockedBy(result.lock);
      setHasLock(result.lock.userId === user?.id);
      if (result.lock.userId === user?.id) {
        startCountdown(result.lock);
      }
    } else {
      setIsLocked(false);
      setLockedBy(null);
      setHasLock(false);
      stopCountdown();
    }
  }, [entityType, entityId, user?.id, startCountdown, stopCountdown]);

  // Acquire lock
  const acquireLock = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await collaborationSocket.acquireLock(
        entityType,
        entityId,
        ttlSeconds,
      );

      if (result.success && result.lock) {
        setIsLocked(true);
        setHasLock(true);
        setLockedBy(result.lock);
        startCountdown(result.lock);

        // Start refresh timer
        refreshTimerRef.current = setInterval(async () => {
          const refreshResult = await collaborationSocket.refreshLock(
            entityType,
            entityId,
            ttlSeconds,
          );
          if (refreshResult.success && refreshResult.lock) {
            startCountdown(refreshResult.lock);
          }
        }, refreshInterval * 1000);

        return true;
      } else {
        setError(result.error || 'Failed to acquire lock');
        if (result.lockedBy) {
          setLockedBy(result.lockedBy);
          setIsLocked(true);
        }
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acquire lock');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, ttlSeconds, refreshInterval, startCountdown]);

  // Release lock
  const releaseLock = useCallback(async (): Promise<void> => {
    if (!hasLock) return;

    setIsLoading(true);

    // Clear refresh timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    try {
      await collaborationSocket.releaseLock(entityType, entityId);
      setIsLocked(false);
      setHasLock(false);
      setLockedBy(null);
      stopCountdown();
      onLockReleased?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release lock');
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, hasLock, stopCountdown, onLockReleased]);

  // Force acquire (admin action)
  const forceAcquire = useCallback(async (): Promise<boolean> => {
    // First release any existing lock via REST API
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/collaboration/locks/${entityType}/${entityId}/force?confirm=true`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      // Then acquire
      return acquireLock();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to force acquire lock');
      return false;
    }
  }, [entityType, entityId, acquireLock]);

  // Handle lock events from other users
  useEffect(() => {
    const handleLockAcquired = (data: {
      entityType: string;
      entityId: string;
      lock: LockInfo;
    }) => {
      if (data.entityType === entityType && data.entityId === entityId) {
        if (data.lock.userId !== user?.id) {
          setIsLocked(true);
          setLockedBy(data.lock);
          setHasLock(false);
          stopCountdown();
          onLockTaken?.(data.lock);
        }
      }
    };

    const handleLockReleased = (data: {
      entityType: string;
      entityId: string;
    }) => {
      if (data.entityType === entityType && data.entityId === entityId) {
        setIsLocked(false);
        setLockedBy(null);
        // Don't change hasLock if we released our own lock
      }
    };

    const unsubAcquired = collaborationSocket.on('lock:acquired', handleLockAcquired);
    const unsubReleased = collaborationSocket.on('lock:released', handleLockReleased);

    return () => {
      unsubAcquired();
      unsubReleased();
    };
  }, [entityType, entityId, user?.id, stopCountdown, onLockTaken]);

  // Check lock status on mount
  useEffect(() => {
    if (entityType && entityId) {
      checkLockStatus();
    }

    return () => {
      // Release lock on unmount
      if (hasLock) {
        collaborationSocket.releaseLock(entityType, entityId);
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      stopCountdown();
    };
  }, [entityType, entityId]);

  // Auto-acquire if requested
  useEffect(() => {
    if (autoAcquire && !isLocked && !hasLock) {
      acquireLock();
    }
  }, [autoAcquire]);

  const canEdit = !isLocked || hasLock;

  return {
    isLocked,
    hasLock,
    lockedBy,
    canEdit,
    isLoading,
    error,
    timeRemaining,
    acquireLock,
    releaseLock,
    forceAcquire,
  };
}

export default useEntityLock;

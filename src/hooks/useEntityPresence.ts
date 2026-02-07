import { useState, useEffect, useCallback, useRef } from 'react';
import { collaborationSocket, PresenceInfo, LockInfo } from '../lib/collaborationSocket';

export interface UseEntityPresenceOptions {
  /** Whether to automatically join on mount (default: true) */
  autoJoin?: boolean;
  /** Heartbeat interval in seconds (default: 30) */
  heartbeatInterval?: number;
}

export interface UseEntityPresenceReturn {
  /** List of users currently viewing this entity */
  viewers: PresenceInfo[];
  /** Number of viewers (including self) */
  viewerCount: number;
  /** Whether the entity is being edited by someone */
  isBeingEdited: boolean;
  /** Info about user currently editing (if locked) */
  editingUser: LockInfo | null;
  /** Whether currently joined to the entity room */
  isJoined: boolean;
  /** Whether loading presence data */
  isLoading: boolean;
  /** Join entity room to receive presence updates */
  join: () => Promise<void>;
  /** Leave entity room */
  leave: () => void;
  /** Refresh viewer list */
  refresh: () => Promise<void>;
}

export function useEntityPresence(
  entityType: string,
  entityId: string,
  options: UseEntityPresenceOptions = {},
): UseEntityPresenceReturn {
  const { autoJoin = true } = options;

  const [viewers, setViewers] = useState<PresenceInfo[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<LockInfo | null>(null);

  const isJoinedRef = useRef(false);

  // Join entity room
  const join = useCallback(async () => {
    if (isJoinedRef.current) return;

    setIsLoading(true);
    try {
      const result = await collaborationSocket.joinEntity(entityType, entityId);
      setViewers(result.viewers);
      setIsJoined(true);
      isJoinedRef.current = true;

      // Also check lock status
      const lockResult = await collaborationSocket.getLockStatus(entityType, entityId);
      setEditingUser(lockResult.lock);
    } catch (error) {
      console.error('Failed to join entity:', error);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  // Leave entity room
  const leave = useCallback(() => {
    if (!isJoinedRef.current) return;

    collaborationSocket.leaveEntity(entityType, entityId);
    setIsJoined(false);
    isJoinedRef.current = false;
    setViewers([]);
  }, [entityType, entityId]);

  // Refresh viewer list
  const refresh = useCallback(async () => {
    if (!isJoinedRef.current) return;

    setIsLoading(true);
    try {
      const result = await collaborationSocket.getEntityViewers(entityType, entityId);
      setViewers(result.viewers);
    } catch (error) {
      console.error('Failed to refresh viewers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  // Handle presence updates from server
  useEffect(() => {
    const handlePresenceUpdate = (data: {
      entityType: string;
      entityId: string;
      viewers: PresenceInfo[];
    }) => {
      if (data.entityType === entityType && data.entityId === entityId) {
        setViewers(data.viewers);
      }
    };

    const handleLockAcquired = (data: {
      entityType: string;
      entityId: string;
      lock: LockInfo;
    }) => {
      if (data.entityType === entityType && data.entityId === entityId) {
        setEditingUser(data.lock);
      }
    };

    const handleLockReleased = (data: {
      entityType: string;
      entityId: string;
    }) => {
      if (data.entityType === entityType && data.entityId === entityId) {
        setEditingUser(null);
      }
    };

    const unsubPresence = collaborationSocket.on('presence:updated', handlePresenceUpdate);
    const unsubLockAcquired = collaborationSocket.on('lock:acquired', handleLockAcquired);
    const unsubLockReleased = collaborationSocket.on('lock:released', handleLockReleased);

    return () => {
      unsubPresence();
      unsubLockAcquired();
      unsubLockReleased();
    };
  }, [entityType, entityId]);

  // Handle connect/disconnect
  useEffect(() => {
    const handleConnect = () => {
      // Rejoin if we were joined before disconnect
      if (isJoinedRef.current) {
        join();
      }
    };

    const unsubConnect = collaborationSocket.on('connect', handleConnect);

    return () => {
      unsubConnect();
    };
  }, [join]);

  // Auto-join on mount
  useEffect(() => {
    if (autoJoin && entityType && entityId) {
      join();
    }

    return () => {
      leave();
    };
  }, [entityType, entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewerCount = viewers.length;
  const isBeingEdited = editingUser !== null;

  return {
    viewers,
    viewerCount,
    isBeingEdited,
    editingUser,
    isJoined,
    isLoading,
    join,
    leave,
    refresh,
  };
}

export default useEntityPresence;

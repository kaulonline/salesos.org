import React from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineSync, useOfflineStatus } from '../hooks/useOfflineSync';

interface OfflineIndicatorProps {
  className?: string;
  showPending?: boolean;
}

export function OfflineIndicator({
  className = '',
  showPending = true,
}: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();
  const { showReconnected } = useOfflineStatus();

  // Show nothing if online and no pending items
  if (isOnline && pendingCount === 0 && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 transition-all duration-300 ${className}`}
    >
      {!isOnline ? (
        <OfflineBanner />
      ) : showReconnected ? (
        <ReconnectedBanner />
      ) : showPending && pendingCount > 0 ? (
        <SyncingBanner
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onSyncNow={syncNow}
        />
      ) : null}
    </div>
  );
}

function OfflineBanner() {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center gap-3 px-4 py-3 bg-red-500 text-white rounded-lg shadow-lg"
    >
      <WifiOff className="w-5 h-5" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium">You're offline</p>
        <p className="text-xs opacity-80">Changes will sync when connected</p>
      </div>
    </div>
  );
}

function ReconnectedBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white rounded-lg shadow-lg animate-fade-in"
    >
      <Wifi className="w-5 h-5" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium">Back online</p>
        <p className="text-xs opacity-80">Syncing your changes...</p>
      </div>
    </div>
  );
}

function SyncingBanner({
  pendingCount,
  isSyncing,
  onSyncNow,
}: {
  pendingCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 px-4 py-3 bg-[#1A1A1A] text-white rounded-lg shadow-lg"
    >
      <CloudOff className="w-5 h-5 text-yellow-400" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-medium">
          {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
        </p>
        <p className="text-xs opacity-60">
          {isSyncing ? 'Syncing...' : 'Waiting to sync'}
        </p>
      </div>
      <button
        onClick={onSyncNow}
        disabled={isSyncing}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
        aria-label={isSyncing ? 'Currently syncing' : 'Sync pending changes now'}
        aria-busy={isSyncing}
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
      </button>
    </div>
  );
}

// Compact version for header/navbar
export function OfflineStatusBadge() {
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5" role="status" aria-live="polite">
      {!isOnline ? (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-600 rounded-md text-xs">
          <WifiOff className="w-3 h-3" aria-hidden="true" />
          <span>Offline</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-100 text-yellow-600 rounded-md text-xs">
          {isSyncing ? (
            <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
          ) : (
            <CloudOff className="w-3 h-3" aria-hidden="true" />
          )}
          <span>{pendingCount} pending</span>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Lock, Unlock, AlertTriangle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { LockInfo } from '../../lib/collaborationSocket';
import { Avatar } from '../../../components/ui/Avatar';

export interface LockIndicatorProps {
  /** Whether the entity is locked */
  isLocked: boolean;
  /** Whether current user holds the lock */
  hasLock: boolean;
  /** Lock info (who holds it, when it expires) */
  lockedBy: LockInfo | null;
  /** Time remaining on lock in seconds */
  timeRemaining: number | null;
  /** Whether lock operation is in progress */
  isLoading: boolean;
  /** Error message */
  error?: string | null;
  /** Acquire lock handler */
  onAcquireLock?: () => Promise<boolean>;
  /** Release lock handler */
  onReleaseLock?: () => Promise<void>;
  /** Force acquire handler (admin) */
  onForceAcquire?: () => Promise<boolean>;
  /** Custom class name */
  className?: string;
  /** Compact mode for inline display */
  compact?: boolean;
}

export function LockIndicator({
  isLocked,
  hasLock,
  lockedBy,
  timeRemaining,
  isLoading,
  error,
  onAcquireLock,
  onReleaseLock,
  onForceAcquire,
  className = '',
  compact = false,
}: LockIndicatorProps) {
  const [showForceConfirm, setShowForceConfirm] = useState(false);

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Not locked - show nothing or edit button
  if (!isLocked && !hasLock) {
    if (compact) return null;

    return (
      <button
        onClick={onAcquireLock}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-1.5 bg-[#F8F8F6] hover:bg-[#F2F1EA] rounded-full text-sm text-[#666] transition-colors ${className}`}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Lock size={14} />
        )}
        <span>Start editing</span>
      </button>
    );
  }

  // Current user has the lock
  if (hasLock) {
    if (compact) {
      return (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 bg-[#93C01F]/20 text-[#93C01F] rounded-full text-xs font-medium ${className}`}
        >
          <Lock size={12} />
          <span>Editing</span>
          {timeRemaining !== null && (
            <span className="text-[#93C01F]/70">{formatTime(timeRemaining)}</span>
          )}
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#93C01F]/20 text-[#93C01F] rounded-full text-sm font-medium">
          <Lock size={14} />
          <span>You are editing</span>
          {timeRemaining !== null && (
            <span className="flex items-center gap-1 text-[#93C01F]/70">
              <Clock size={12} />
              {formatTime(timeRemaining)}
            </span>
          )}
        </div>
        <button
          onClick={onReleaseLock}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8F8F6] hover:bg-[#F2F1EA] rounded-full text-sm text-[#666] transition-colors"
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Unlock size={14} />
          )}
          <span>Done editing</span>
        </button>
      </div>
    );
  }

  // Locked by another user
  if (isLocked && lockedBy) {
    if (compact) {
      return (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 bg-[#EAD07D]/20 text-[#1A1A1A] rounded-full text-xs font-medium ${className}`}
          title={`Locked by ${lockedBy.userName}`}
        >
          <Lock size={12} className="text-[#EAD07D]" />
          <span className="truncate max-w-[100px]">{lockedBy.userName}</span>
        </div>
      );
    }

    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-3 p-3 bg-[#EAD07D]/10 border border-[#EAD07D]/30 rounded-xl">
          <Avatar
            src={undefined}
            name={lockedBy.userName}
            size="sm"
            className="ring-2 ring-[#EAD07D]/30"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1A1A1A] flex items-center gap-1.5">
              <Lock size={14} className="text-[#EAD07D]" />
              Locked by {lockedBy.userName}
            </p>
            {timeRemaining !== null && (
              <p className="text-xs text-[#666] flex items-center gap-1">
                <Clock size={10} />
                Expires in {formatTime(timeRemaining)}
              </p>
            )}
          </div>
          {onForceAcquire && (
            <div>
              {showForceConfirm ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await onForceAcquire();
                      setShowForceConfirm(false);
                    }}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      'Confirm'
                    )}
                  </button>
                  <button
                    onClick={() => setShowForceConfirm(false)}
                    className="px-3 py-1.5 bg-[#F8F8F6] hover:bg-[#F2F1EA] text-[#666] rounded-lg text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowForceConfirm(true)}
                  className="px-3 py-1.5 bg-[#F8F8F6] hover:bg-[#F2F1EA] rounded-lg text-xs font-medium text-[#666] transition-colors"
                >
                  Take over
                </button>
              )}
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-500">
            <AlertTriangle size={12} />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Simple lock status badge for cards/list items
 */
export function LockStatusBadge({
  isLocked,
  hasLock,
  lockedBy,
  className = '',
}: {
  isLocked: boolean;
  hasLock: boolean;
  lockedBy?: LockInfo | null;
  className?: string;
}) {
  if (!isLocked) return null;

  if (hasLock) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#93C01F]/20 text-[#93C01F] rounded text-[10px] font-medium ${className}`}
      >
        <Lock size={10} />
        <span>Editing</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#EAD07D]/20 text-[#1A1A1A] rounded text-[10px] font-medium ${className}`}
      title={lockedBy ? `Locked by ${lockedBy.userName}` : 'Locked'}
    >
      <Lock size={10} className="text-[#EAD07D]" />
      <span className="truncate max-w-[60px]">{lockedBy?.userName || 'Locked'}</span>
    </div>
  );
}

export default LockIndicator;

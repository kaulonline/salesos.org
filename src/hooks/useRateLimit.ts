import { useState, useCallback, useEffect } from 'react';
import {
  checkRateLimit,
  recordAttempt,
  resetRateLimit,
  RATE_LIMIT_CONFIGS,
  getLoginLockout,
  recordLoginAttempt,
  clearLoginAttempts,
} from '../lib/rateLimiter';

interface RateLimitStatus {
  isLimited: boolean;
  remainingAttempts: number;
  retryAfterMs: number;
  message: string;
}

interface UseRateLimitOptions {
  key: string;
  maxAttempts?: number;
  windowMs?: number;
  blockDurationMs?: number;
}

/**
 * Hook for client-side rate limiting
 */
export function useRateLimit(options: UseRateLimitOptions) {
  const { key, ...config } = options;

  const [status, setStatus] = useState<RateLimitStatus>(() => checkRateLimit(key, config));
  const [countdown, setCountdown] = useState<number>(0);

  // Update countdown timer
  useEffect(() => {
    if (status.retryAfterMs <= 0) {
      setCountdown(0);
      return;
    }

    setCountdown(Math.ceil(status.retryAfterMs / 1000));

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Re-check status when countdown expires
          const newStatus = checkRateLimit(key, config);
          setStatus(newStatus);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status.retryAfterMs, key]);

  const checkLimit = useCallback(() => {
    const newStatus = checkRateLimit(key, config);
    setStatus(newStatus);
    return newStatus;
  }, [key, config]);

  const recordAction = useCallback(() => {
    const newStatus = recordAttempt(key, config);
    setStatus(newStatus);
    return newStatus;
  }, [key, config]);

  const reset = useCallback(() => {
    resetRateLimit(key);
    const newStatus = checkRateLimit(key, config);
    setStatus(newStatus);
  }, [key, config]);

  return {
    ...status,
    countdown,
    checkLimit,
    recordAction,
    reset,
  };
}

/**
 * Hook specifically for login rate limiting with persistent storage
 */
export function useLoginRateLimit() {
  const [lockout, setLockout] = useState(() => getLoginLockout());
  const [countdown, setCountdown] = useState<number>(0);

  // Check lockout status on mount and update countdown
  useEffect(() => {
    const checkLockout = () => {
      const status = getLoginLockout();
      setLockout(status);
      if (status.isLocked) {
        setCountdown(Math.ceil(status.remainingMs / 1000));
      } else {
        setCountdown(0);
      }
    };

    checkLockout();

    // Update every second if locked
    const interval = setInterval(() => {
      const status = getLoginLockout();
      if (status.isLocked) {
        setLockout(status);
        setCountdown(Math.ceil(status.remainingMs / 1000));
      } else if (lockout.isLocked) {
        // Just unlocked
        setLockout(status);
        setCountdown(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockout.isLocked]);

  const recordFailedAttempt = useCallback((email: string) => {
    const data = recordLoginAttempt(email);
    const status = getLoginLockout();
    setLockout(status);
    return {
      attempts: data.attempts,
      maxAttempts: RATE_LIMIT_CONFIGS.login.maxAttempts,
      isLocked: status.isLocked,
    };
  }, []);

  const clearAttempts = useCallback(() => {
    clearLoginAttempts();
    setLockout({ isLocked: false, unlockTime: null, remainingMs: 0 });
    setCountdown(0);
  }, []);

  const formatCountdown = useCallback(() => {
    if (countdown <= 0) return '';
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [countdown]);

  return {
    isLocked: lockout.isLocked,
    unlockTime: lockout.unlockTime,
    countdown,
    formattedCountdown: formatCountdown(),
    recordFailedAttempt,
    clearAttempts,
    maxAttempts: RATE_LIMIT_CONFIGS.login.maxAttempts,
  };
}

/**
 * HOC pattern for rate-limited actions
 */
export function withRateLimit<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  key: string,
  config?: Partial<typeof RATE_LIMIT_CONFIGS.apiCreate>
): (...args: Parameters<T>) => ReturnType<T> | null {
  return (...args: Parameters<T>) => {
    const status = checkRateLimit(key, config);
    if (status.isLimited) {
      console.warn(`Rate limited: ${status.message}`);
      return null;
    }
    recordAttempt(key, config);
    return fn(...args);
  };
}

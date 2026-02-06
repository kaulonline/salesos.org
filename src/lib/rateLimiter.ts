/**
 * Client-side rate limiter for protecting against spam and abuse
 * Works alongside server-side rate limiting
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockUntil?: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 5 * 60 * 1000, // 5 minutes
};

// Storage for rate limit entries
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start periodic cleanup of expired rate limit entries
 */
function startCleanup(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove entries that are past their block time or window
      const windowExpired = now - entry.firstAttempt > DEFAULT_CONFIG.windowMs * 2;
      const blockExpired = entry.blockUntil && now > entry.blockUntil;

      if (windowExpired || (entry.blocked && blockExpired)) {
        rateLimitStore.delete(key);
      }
    }
  }, 60 * 1000); // Clean up every minute
}

/**
 * Check if an action is rate limited
 * @param key - Unique identifier for the action (e.g., 'login', 'api:POST:/contacts')
 * @param config - Optional custom rate limit configuration
 * @returns Object with isLimited, remaining attempts, and retry time
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): {
  isLimited: boolean;
  remainingAttempts: number;
  retryAfterMs: number;
  message: string;
} {
  const { maxAttempts, windowMs, blockDurationMs } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  startCleanup();

  let entry = rateLimitStore.get(key);

  // Check if blocked
  if (entry?.blocked && entry.blockUntil) {
    if (now < entry.blockUntil) {
      const retryAfterMs = entry.blockUntil - now;
      return {
        isLimited: true,
        remainingAttempts: 0,
        retryAfterMs,
        message: `Too many attempts. Please try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`,
      };
    }
    // Block expired, reset entry
    rateLimitStore.delete(key);
    entry = undefined;
  }

  // Check if window expired
  if (entry && now - entry.firstAttempt > windowMs) {
    rateLimitStore.delete(key);
    entry = undefined;
  }

  // Calculate remaining attempts
  const currentCount = entry?.count || 0;
  const remainingAttempts = Math.max(0, maxAttempts - currentCount);

  return {
    isLimited: false,
    remainingAttempts,
    retryAfterMs: 0,
    message: remainingAttempts <= 2
      ? `${remainingAttempts} attempts remaining before temporary lockout.`
      : '',
  };
}

/**
 * Record an attempt for rate limiting
 * @param key - Unique identifier for the action
 * @param config - Optional custom rate limit configuration
 * @returns Updated rate limit status
 */
export function recordAttempt(
  key: string,
  config: Partial<RateLimitConfig> = {}
): ReturnType<typeof checkRateLimit> {
  const { maxAttempts, windowMs, blockDurationMs } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  startCleanup();

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (entry && now - entry.firstAttempt > windowMs) {
    entry = undefined;
  }

  if (!entry) {
    entry = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false,
    };
  } else {
    entry.count++;
    entry.lastAttempt = now;

    // Check if should be blocked
    if (entry.count >= maxAttempts) {
      entry.blocked = true;
      entry.blockUntil = now + blockDurationMs;
    }
  }

  rateLimitStore.set(key, entry);

  // Return updated status
  return checkRateLimit(key, config);
}

/**
 * Reset rate limit for a key (e.g., on successful action)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get rate limit status for multiple keys
 */
export function getRateLimitStatus(keys: string[]): Map<string, ReturnType<typeof checkRateLimit>> {
  const status = new Map<string, ReturnType<typeof checkRateLimit>>();
  for (const key of keys) {
    status.set(key, checkRateLimit(key));
  }
  return status;
}

// Predefined rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  login: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  apiCreate: {
    maxAttempts: 30,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 60 * 1000, // 1 minute
  },
  apiBulk: {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  },
  export: {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 10 * 60 * 1000, // 10 minutes
  },
} as const;

/**
 * Login attempt tracker with localStorage persistence
 */
const LOGIN_ATTEMPTS_KEY = 'salesos_login_attempts';
const LOGIN_LOCKOUT_KEY = 'salesos_login_lockout';

interface LoginAttemptData {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  email?: string;
}

export function getLoginAttempts(): LoginAttemptData | null {
  try {
    const data = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data) as LoginAttemptData;

    // Expire after 15 minutes of no attempts
    if (Date.now() - parsed.lastAttempt > 15 * 60 * 1000) {
      localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function recordLoginAttempt(email: string): LoginAttemptData {
  const now = Date.now();
  const existing = getLoginAttempts();

  const data: LoginAttemptData = {
    attempts: (existing?.attempts || 0) + 1,
    firstAttempt: existing?.firstAttempt || now,
    lastAttempt: now,
    email,
  };

  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));

  // Check if should be locked out
  if (data.attempts >= RATE_LIMIT_CONFIGS.login.maxAttempts) {
    const lockoutUntil = now + RATE_LIMIT_CONFIGS.login.blockDurationMs;
    localStorage.setItem(LOGIN_LOCKOUT_KEY, lockoutUntil.toString());
  }

  return data;
}

export function clearLoginAttempts(): void {
  localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  localStorage.removeItem(LOGIN_LOCKOUT_KEY);
}

export function getLoginLockout(): { isLocked: boolean; unlockTime: number | null; remainingMs: number } {
  const lockoutUntil = localStorage.getItem(LOGIN_LOCKOUT_KEY);

  if (!lockoutUntil) {
    return { isLocked: false, unlockTime: null, remainingMs: 0 };
  }

  const unlockTime = parseInt(lockoutUntil, 10);
  const now = Date.now();

  if (now >= unlockTime) {
    // Lockout expired
    clearLoginAttempts();
    return { isLocked: false, unlockTime: null, remainingMs: 0 };
  }

  return {
    isLocked: true,
    unlockTime,
    remainingMs: unlockTime - now,
  };
}

/**
 * Request size validator
 */
export const MAX_REQUEST_SIZES = {
  default: 1 * 1024 * 1024, // 1MB
  fileUpload: 10 * 1024 * 1024, // 10MB
  bulkImport: 5 * 1024 * 1024, // 5MB
  jsonPayload: 100 * 1024, // 100KB
} as const;

export function validateRequestSize(
  data: unknown,
  maxSize: number = MAX_REQUEST_SIZES.jsonPayload
): { isValid: boolean; size: number; message: string } {
  let size = 0;

  try {
    if (data instanceof Blob || data instanceof File) {
      size = data.size;
    } else if (typeof data === 'string') {
      size = new Blob([data]).size;
    } else if (data) {
      size = new Blob([JSON.stringify(data)]).size;
    }
  } catch {
    return { isValid: false, size: 0, message: 'Unable to calculate request size' };
  }

  if (size > maxSize) {
    const maxSizeKB = Math.round(maxSize / 1024);
    const actualSizeKB = Math.round(size / 1024);
    return {
      isValid: false,
      size,
      message: `Request size (${actualSizeKB}KB) exceeds maximum allowed (${maxSizeKB}KB)`,
    };
  }

  return { isValid: true, size, message: '' };
}

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  recordAttempt,
  resetRateLimit,
  RATE_LIMIT_CONFIGS,
  getLoginAttempts,
  recordLoginAttempt,
  clearLoginAttempts,
  getLoginLockout,
  validateRequestSize,
  MAX_REQUEST_SIZES,
} from '../rateLimiter';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('rateLimiter', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should not be limited on first check', () => {
      const result = checkRateLimit('test-key');
      expect(result.isLimited).toBe(false);
      expect(result.remainingAttempts).toBe(5); // Default max attempts
    });

    it('should return custom config values', () => {
      const result = checkRateLimit('custom-key', { maxAttempts: 10 });
      expect(result.remainingAttempts).toBe(10);
    });
  });

  describe('recordAttempt', () => {
    it('should decrease remaining attempts', () => {
      recordAttempt('attempt-key');
      const result = checkRateLimit('attempt-key');
      expect(result.remainingAttempts).toBe(4);
    });

    it('should block after max attempts', () => {
      const config = { maxAttempts: 3, windowMs: 60000, blockDurationMs: 60000 };

      for (let i = 0; i < 3; i++) {
        recordAttempt('block-key', config);
      }

      const result = checkRateLimit('block-key', config);
      expect(result.isLimited).toBe(true);
      expect(result.remainingAttempts).toBe(0);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('should show warning message when attempts are low', () => {
      const config = { maxAttempts: 3 };

      recordAttempt('warn-key', config);
      const result = recordAttempt('warn-key', config);

      expect(result.message).toContain('1 attempts remaining');
    });
  });

  describe('resetRateLimit', () => {
    it('should clear rate limit state', () => {
      recordAttempt('reset-key');
      recordAttempt('reset-key');

      resetRateLimit('reset-key');

      const result = checkRateLimit('reset-key');
      expect(result.remainingAttempts).toBe(5);
      expect(result.isLimited).toBe(false);
    });
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('should have login config', () => {
      expect(RATE_LIMIT_CONFIGS.login).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.login.maxAttempts).toBe(5);
    });

    it('should have passwordReset config', () => {
      expect(RATE_LIMIT_CONFIGS.passwordReset).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.passwordReset.maxAttempts).toBe(3);
    });

    it('should have apiCreate config', () => {
      expect(RATE_LIMIT_CONFIGS.apiCreate).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.apiCreate.maxAttempts).toBe(30);
    });
  });

  describe('Login attempts tracking', () => {
    describe('getLoginAttempts', () => {
      it('should return null when no attempts recorded', () => {
        expect(getLoginAttempts()).toBeNull();
      });

      it('should return stored attempts', () => {
        recordLoginAttempt('test@example.com');
        const attempts = getLoginAttempts();

        expect(attempts).not.toBeNull();
        expect(attempts?.attempts).toBe(1);
        expect(attempts?.email).toBe('test@example.com');
      });

      it('should expire after 15 minutes', () => {
        recordLoginAttempt('test@example.com');

        // Advance time by 16 minutes
        vi.advanceTimersByTime(16 * 60 * 1000);

        expect(getLoginAttempts()).toBeNull();
      });
    });

    describe('recordLoginAttempt', () => {
      it('should increment attempt count', () => {
        recordLoginAttempt('test@example.com');
        recordLoginAttempt('test@example.com');

        const attempts = getLoginAttempts();
        expect(attempts?.attempts).toBe(2);
      });

      it('should set lockout after max attempts', () => {
        for (let i = 0; i < 5; i++) {
          recordLoginAttempt('test@example.com');
        }

        const lockout = getLoginLockout();
        expect(lockout.isLocked).toBe(true);
      });
    });

    describe('clearLoginAttempts', () => {
      it('should clear all login attempt data', () => {
        recordLoginAttempt('test@example.com');
        clearLoginAttempts();

        expect(getLoginAttempts()).toBeNull();
        expect(getLoginLockout().isLocked).toBe(false);
      });
    });

    describe('getLoginLockout', () => {
      it('should return not locked when no lockout', () => {
        const lockout = getLoginLockout();
        expect(lockout.isLocked).toBe(false);
        expect(lockout.unlockTime).toBeNull();
        expect(lockout.remainingMs).toBe(0);
      });

      it('should return locked with remaining time', () => {
        // Trigger lockout
        for (let i = 0; i < 5; i++) {
          recordLoginAttempt('test@example.com');
        }

        const lockout = getLoginLockout();
        expect(lockout.isLocked).toBe(true);
        expect(lockout.unlockTime).not.toBeNull();
        expect(lockout.remainingMs).toBeGreaterThan(0);
      });

      it('should auto-clear expired lockout', () => {
        // Trigger lockout
        for (let i = 0; i < 5; i++) {
          recordLoginAttempt('test@example.com');
        }

        // Advance time past lockout period
        vi.advanceTimersByTime(16 * 60 * 1000);

        const lockout = getLoginLockout();
        expect(lockout.isLocked).toBe(false);
      });
    });
  });

  describe('validateRequestSize', () => {
    it('should validate string data', () => {
      const smallData = 'small string';
      const result = validateRequestSize(smallData);

      expect(result.isValid).toBe(true);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should validate object data', () => {
      const data = { name: 'test', value: 123 };
      const result = validateRequestSize(data);

      expect(result.isValid).toBe(true);
    });

    it('should reject data exceeding max size', () => {
      // Create data larger than default max (100KB)
      const largeData = 'x'.repeat(150 * 1024);
      const result = validateRequestSize(largeData);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('exceeds maximum');
    });

    it('should use custom max size', () => {
      const data = 'x'.repeat(50);
      const result = validateRequestSize(data, 10); // 10 bytes max

      expect(result.isValid).toBe(false);
    });

    it('should handle Blob data', () => {
      const blob = new Blob(['test content']);
      const result = validateRequestSize(blob);

      expect(result.isValid).toBe(true);
      expect(result.size).toBe(12); // 'test content'.length
    });

    it('should handle null/undefined', () => {
      expect(validateRequestSize(null).isValid).toBe(true);
      expect(validateRequestSize(undefined).isValid).toBe(true);
    });
  });

  describe('MAX_REQUEST_SIZES', () => {
    it('should have predefined sizes', () => {
      expect(MAX_REQUEST_SIZES.default).toBe(1 * 1024 * 1024);
      expect(MAX_REQUEST_SIZES.fileUpload).toBe(10 * 1024 * 1024);
      expect(MAX_REQUEST_SIZES.bulkImport).toBe(5 * 1024 * 1024);
      expect(MAX_REQUEST_SIZES.jsonPayload).toBe(100 * 1024);
    });
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { tokenManager } from '../tokenManager';

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

// Create a valid JWT token for testing
function createMockJwt(expiresInSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: '123',
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    })
  );
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

describe('tokenManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getToken', () => {
    it('should return null when no token is stored', () => {
      expect(tokenManager.getToken()).toBeNull();
    });

    it('should return the stored token', () => {
      localStorageMock.setItem('token', 'test-token');
      expect(tokenManager.getToken()).toBe('test-token');
    });
  });

  describe('setToken', () => {
    it('should store the token in localStorage', () => {
      tokenManager.setToken('new-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
    });

    it('should parse JWT expiry and store it', () => {
      const token = createMockJwt(3600); // 1 hour from now
      tokenManager.setToken(token);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', token);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'token_expiry',
        expect.any(String)
      );
    });

    it('should use expiresIn parameter when JWT parsing fails', () => {
      tokenManager.setToken('invalid-token', 3600);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'invalid-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'token_expiry',
        expect.any(String)
      );
    });
  });

  describe('clearToken', () => {
    it('should remove all token-related data from localStorage', () => {
      localStorageMock.setItem('token', 'test-token');
      localStorageMock.setItem('token_expiry', '123456789');

      tokenManager.clearToken();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token_expiry');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token_refresh_in_progress');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false when no expiry is set', () => {
      expect(tokenManager.isTokenExpired()).toBe(false);
    });

    it('should return false when token is not expired', () => {
      // Set expiry to 1 hour from now
      const expiry = Date.now() + 60 * 60 * 1000;
      localStorageMock.setItem('token_expiry', expiry.toString());

      expect(tokenManager.isTokenExpired()).toBe(false);
    });

    it('should return true when token is about to expire (within buffer)', () => {
      // Set expiry to 4 minutes from now (within 5 minute buffer)
      const expiry = Date.now() + 4 * 60 * 1000;
      localStorageMock.setItem('token_expiry', expiry.toString());

      expect(tokenManager.isTokenExpired()).toBe(true);
    });

    it('should return true when token is expired', () => {
      // Set expiry to past
      const expiry = Date.now() - 60 * 1000;
      localStorageMock.setItem('token_expiry', expiry.toString());

      expect(tokenManager.isTokenExpired()).toBe(true);
    });
  });

  describe('shouldRefresh', () => {
    it('should return false when no token exists', () => {
      expect(tokenManager.shouldRefresh()).toBe(false);
    });

    it('should return false when token is valid and not expiring', () => {
      localStorageMock.setItem('token', 'valid-token');
      const expiry = Date.now() + 60 * 60 * 1000; // 1 hour
      localStorageMock.setItem('token_expiry', expiry.toString());

      expect(tokenManager.shouldRefresh()).toBe(false);
    });

    it('should return true when token is about to expire', () => {
      localStorageMock.setItem('token', 'valid-token');
      const expiry = Date.now() + 2 * 60 * 1000; // 2 minutes
      localStorageMock.setItem('token_expiry', expiry.toString());

      expect(tokenManager.shouldRefresh()).toBe(true);
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('should return null when no expiry is set', () => {
      expect(tokenManager.getTimeUntilExpiry()).toBeNull();
    });

    it('should return positive time when token is valid', () => {
      const expiry = Date.now() + 60 * 60 * 1000; // 1 hour
      localStorageMock.setItem('token_expiry', expiry.toString());

      const timeUntil = tokenManager.getTimeUntilExpiry();
      expect(timeUntil).toBeGreaterThan(0);
      expect(timeUntil).toBeLessThanOrEqual(60 * 60 * 1000);
    });

    it('should return 0 when token is expired', () => {
      const expiry = Date.now() - 60 * 1000; // 1 minute ago
      localStorageMock.setItem('token_expiry', expiry.toString());

      expect(tokenManager.getTimeUntilExpiry()).toBe(0);
    });
  });

  describe('refreshToken', () => {
    // Note: refreshToken has module-level state that persists between tests
    // These tests verify the function signature and basic behavior

    it('should accept a refresh function parameter', () => {
      const mockRefresh = vi.fn().mockResolvedValue({
        access_token: 'new-token',
        expires_in: 3600,
      });

      // Just verify it doesn't throw when called with proper params
      expect(() => tokenManager.refreshToken(mockRefresh)).not.toThrow();
    });

    it('should return a promise', () => {
      const mockRefresh = vi.fn().mockResolvedValue({
        access_token: 'new-token',
        expires_in: 3600,
      });

      const result = tokenManager.refreshToken(mockRefresh);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('scheduleRefresh', () => {
    it('should return empty cleanup function when no expiry', () => {
      const mockRefresh = vi.fn();
      const cleanup = tokenManager.scheduleRefresh(mockRefresh);

      expect(typeof cleanup).toBe('function');
      cleanup(); // Should not throw
    });

    it('should return cleanup function that clears timeout', () => {
      const mockRefresh = vi.fn();

      // Set token expiring in 10 minutes
      const expiry = Date.now() + 10 * 60 * 1000;
      localStorageMock.setItem('token', 'current-token');
      localStorageMock.setItem('token_expiry', expiry.toString());

      const cleanup = tokenManager.scheduleRefresh(mockRefresh);

      // Cleanup should prevent refresh from being called
      cleanup();

      // Advance time past when refresh would have happened
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Refresh should not have been called since we cleaned up
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });
});

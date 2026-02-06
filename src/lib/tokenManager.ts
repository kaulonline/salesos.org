/**
 * Token Manager - Handles JWT token lifecycle, refresh, and expiry
 */

// Token expiry buffer - refresh 5 minutes before actual expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Minimum time between refresh attempts
const MIN_REFRESH_INTERVAL_MS = 30 * 1000;

// Storage keys
const TOKEN_KEY = 'token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const REFRESH_IN_PROGRESS_KEY = 'token_refresh_in_progress';

// Parse JWT to get expiry time
function parseJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp) {
      return payload.exp * 1000; // Convert to milliseconds
    }
    return null;
  } catch {
    return null;
  }
}

// Token state
let refreshPromise: Promise<string | null> | null = null;
let lastRefreshAttempt = 0;

export const tokenManager = {
  /**
   * Get the current token
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Set token and calculate expiry
   */
  setToken(token: string, expiresIn?: number): void {
    localStorage.setItem(TOKEN_KEY, token);

    // Calculate expiry from JWT or provided expiresIn
    let expiry = parseJwtExpiry(token);
    if (!expiry && expiresIn) {
      expiry = Date.now() + expiresIn * 1000;
    }

    if (expiry) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    }
  },

  /**
   * Clear all token data
   */
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(REFRESH_IN_PROGRESS_KEY);
    refreshPromise = null;
  },

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(): boolean {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return false; // No expiry info, assume valid

    const expiry = parseInt(expiryStr, 10);
    return Date.now() >= expiry - REFRESH_BUFFER_MS;
  },

  /**
   * Check if token needs refresh (expired or about to expire)
   */
  shouldRefresh(): boolean {
    const token = this.getToken();
    if (!token) return false;

    return this.isTokenExpired();
  },

  /**
   * Get time until token expires in milliseconds
   */
  getTimeUntilExpiry(): number | null {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return null;

    const expiry = parseInt(expiryStr, 10);
    return Math.max(0, expiry - Date.now());
  },

  /**
   * Refresh the token - handles deduplication of concurrent refresh requests
   */
  async refreshToken(refreshFn: () => Promise<{ access_token: string; expires_in?: number }>): Promise<string | null> {
    // Prevent refresh spam
    const now = Date.now();
    if (now - lastRefreshAttempt < MIN_REFRESH_INTERVAL_MS) {
      if (refreshPromise) {
        return refreshPromise;
      }
      return this.getToken();
    }

    // If refresh is already in progress, wait for it
    if (refreshPromise) {
      return refreshPromise;
    }

    // Start refresh
    lastRefreshAttempt = now;
    localStorage.setItem(REFRESH_IN_PROGRESS_KEY, 'true');

    refreshPromise = (async () => {
      try {
        const response = await refreshFn();
        this.setToken(response.access_token, response.expires_in);
        return response.access_token;
      } catch (error) {
        // Refresh failed - token is invalid
        this.clearToken();
        return null;
      } finally {
        localStorage.removeItem(REFRESH_IN_PROGRESS_KEY);
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  /**
   * Schedule automatic token refresh
   */
  scheduleRefresh(refreshFn: () => Promise<{ access_token: string; expires_in?: number }>): () => void {
    const timeUntilExpiry = this.getTimeUntilExpiry();
    if (timeUntilExpiry === null) return () => {};

    // Schedule refresh for REFRESH_BUFFER_MS before expiry
    const refreshTime = Math.max(timeUntilExpiry - REFRESH_BUFFER_MS, MIN_REFRESH_INTERVAL_MS);

    const timeoutId = setTimeout(async () => {
      const newToken = await this.refreshToken(refreshFn);
      if (newToken) {
        // Schedule next refresh
        this.scheduleRefresh(refreshFn);
      }
    }, refreshTime);

    // Return cleanup function
    return () => clearTimeout(timeoutId);
  },
};

export default tokenManager;

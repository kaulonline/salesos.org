/**
 * Environment-aware logger
 * Only logs in development mode to prevent console pollution in production
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const logger = {
  /**
   * Log info messages (only in development)
   */
  log: (...args: unknown[]): void => {
    if (isDev) {
      console.log('[SalesOS]', ...args);
    }
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args: unknown[]): void => {
    if (isDev) {
      console.warn('[SalesOS]', ...args);
    }
  },

  /**
   * Log error messages (always - errors should be visible)
   * Consider also sending to error tracking service
   */
  error: (...args: unknown[]): void => {
    // Errors always log - they're important for debugging
    console.error('[SalesOS]', ...args);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.debug('[SalesOS]', ...args);
    }
  },

  /**
   * Log API-related messages (only in development)
   */
  api: (...args: unknown[]): void => {
    if (isDev) {
      console.log('[SalesOS:API]', ...args);
    }
  },

  /**
   * Log WebSocket-related messages (only in development)
   */
  ws: (...args: unknown[]): void => {
    if (isDev) {
      console.log('[SalesOS:WS]', ...args);
    }
  },
};

export default logger;

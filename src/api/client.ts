import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { captureError, addBreadcrumb } from '../lib/errorTracking';
import { tokenManager } from '../lib/tokenManager';
import { logger } from '../lib/logger';
import { getCsrfToken, setCsrfToken } from '../lib/security';

// Organization context management for multi-tenant requests
let currentOrganizationId: string | null = null;

/**
 * Set the current organization context for API requests
 * This will be included as X-Organization-ID header
 */
export function setOrganizationContext(organizationId: string | null): void {
  currentOrganizationId = organizationId;
  if (organizationId) {
    sessionStorage.setItem('organizationId', organizationId);
  } else {
    sessionStorage.removeItem('organizationId');
  }
}

/**
 * Get the current organization context
 */
export function getOrganizationContext(): string | null {
  if (!currentOrganizationId) {
    currentOrganizationId = sessionStorage.getItem('organizationId');
  }
  return currentOrganizationId;
}

/**
 * Clear organization context (e.g., on logout)
 */
export function clearOrganizationContext(): void {
  currentOrganizationId = null;
  sessionStorage.removeItem('organizationId');
}

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

// Request deduplication: Track in-flight requests
const pendingRequests = new Map<string, Promise<AxiosResponse>>();

// Create request key for deduplication
function createRequestKey(config: AxiosRequestConfig): string {
  const { method = 'get', url, params, data } = config;
  return `${method.toUpperCase()}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`;
}

// Check if error is retryable
function isRetryable(error: AxiosError): boolean {
  // Don't retry client errors (4xx) except for specific cases
  if (error.response?.status) {
    const status = error.response.status;
    // Retry on 408 (timeout), 429 (rate limit), 5xx (server errors)
    return status === 408 || status === 429 || status >= 500;
  }
  // Retry on network errors
  return error.code === 'ECONNABORTED' || error.message.includes('Network Error');
}

// Calculate delay with exponential backoff and jitter
function calculateRetryDelay(attempt: number, baseDelay: number = INITIAL_RETRY_DELAY): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}

// Create axios instance
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: Add JWT token, CSRF token, and tracking
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests (POST, PUT, PATCH, DELETE)
    const method = config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken && config.headers) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    // Add Organization ID header for multi-tenant isolation
    const organizationId = getOrganizationContext();
    if (organizationId && config.headers) {
      config.headers['X-Organization-ID'] = organizationId;
    }

    // Add breadcrumb for debugging
    addBreadcrumb('http', `${config.method?.toUpperCase()} ${config.url}`, {
      url: config.url,
      method: config.method,
    });

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Helper to notify subscribers when token is refreshed
function onTokenRefreshed(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// Helper to add subscriber for token refresh
function addRefreshSubscriber(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback);
}

// Response interceptor: Handle errors and retries
client.interceptors.response.use(
  (response) => {
    // Extract CSRF token from response headers if provided by server
    const csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      setCsrfToken(csrfToken);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & {
      _retryCount?: number;
      _skipDedup?: boolean;
      _isRetryAfterRefresh?: boolean;
    };

    // Handle 401 - attempt token refresh first
    if (error.response?.status === 401 && !config._isRetryAfterRefresh) {
      // Don't try to refresh if we're on auth endpoints
      const isAuthEndpoint = config.url?.includes('/auth/');
      if (isAuthEndpoint) {
        tokenManager.clearToken();
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newToken) => {
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
              config._isRetryAfterRefresh = true;
              resolve(client(config));
            } else {
              reject(error);
            }
          });
        });
      }

      // Start refresh
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        const response = await axios.post<{ access_token: string; expires_in?: number }>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${tokenManager.getToken()}`,
            },
          }
        );

        const { access_token, expires_in } = response.data;
        tokenManager.setToken(access_token, expires_in);
        localStorage.setItem('token', access_token);

        // Notify all queued requests
        onTokenRefreshed(access_token);
        isRefreshing = false;

        // Retry the original request with new token
        config.headers.Authorization = `Bearer ${access_token}`;
        config._isRetryAfterRefresh = true;
        return client(config);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        onTokenRefreshed(null);
        isRefreshing = false;
        tokenManager.clearToken();
        localStorage.removeItem('user');

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    // Handle retries for retryable errors
    if (config && isRetryable(error)) {
      config._retryCount = config._retryCount || 0;

      if (config._retryCount < MAX_RETRIES) {
        config._retryCount++;
        config._skipDedup = true; // Skip dedup on retry

        const delay = calculateRetryDelay(config._retryCount);
        logger.api(`Retrying request (attempt ${config._retryCount}/${MAX_RETRIES}) after ${Math.round(delay)}ms`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return client(config);
      }
    }

    // Log error for tracking
    captureError(error as Error, {
      context: 'API',
      extra: {
        url: config?.url,
        method: config?.method,
        status: error.response?.status,
      },
    });

    return Promise.reject(error);
  }
);

// Request wrapper with deduplication for GET requests
export async function request<T>(
  config: AxiosRequestConfig & { skipDedup?: boolean }
): Promise<T> {
  const { skipDedup, ...axiosConfig } = config;

  // Only deduplicate GET requests
  if (axiosConfig.method?.toLowerCase() === 'get' && !skipDedup) {
    const key = createRequestKey(axiosConfig);

    // Return existing promise if request is in-flight
    const pending = pendingRequests.get(key);
    if (pending) {
      const response = await pending;
      return response.data as T;
    }

    // Create new request and track it
    const requestPromise = client(axiosConfig);
    pendingRequests.set(key, requestPromise);

    try {
      const response = await requestPromise;
      return response.data as T;
    } finally {
      pendingRequests.delete(key);
    }
  }

  // Non-GET requests bypass deduplication
  const response = await client(axiosConfig);
  return response.data as T;
}

// Convenience methods
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'get', url }),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'post', url, data }),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'put', url, data }),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'patch', url, data }),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'delete', url }),
};

// Cancel token factory for request cancellation
export function createCancelToken() {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
}

// Check if error is a cancellation
export function isCancel(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError');
}

// Export the raw axios instance for special cases
export default client;

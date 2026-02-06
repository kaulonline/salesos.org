import * as Sentry from '@sentry/react';

interface ErrorContext {
  componentStack?: string;
  component?: string;
  context?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Initialize Sentry for production error tracking
export function initErrorTracking() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    if (isDev) {
      console.info('[ErrorTracking] Sentry DSN not configured, error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,

    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session Replay for debugging (1% of sessions, 100% on error)
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    // Filter out known non-actionable errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Ignore network errors caused by user offline
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        return null;
      }

      // Ignore aborted requests
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }

      return event;
    },

    // Ignore common browser extension errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'http://tt.telecom.com',
      'java.lang.String',
      // Facebook SDK
      'fb_xd_fragment',
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      // Safari extensions
      /safari-extension:/i,
    ],

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  });

  if (isDev) {
    console.info('[ErrorTracking] Sentry initialized');
  }
}

// Capture an error with optional context
export function captureError(error: Error, context?: ErrorContext) {
  // Always log to console in development
  if (import.meta.env.DEV) {
    console.error('[ErrorTracking]', error, context);
  }

  // Send to Sentry if configured
  Sentry.withScope((scope) => {
    if (context?.componentStack) {
      scope.setExtra('componentStack', context.componentStack);
    }
    if (context?.component) {
      scope.setTag('component', context.component);
    }
    if (context?.context) {
      scope.setTag('context', context.context);
    }
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureException(error);
  });
}

// Capture a message (for warnings, info, etc.)
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (import.meta.env.DEV) {
    console.log(`[ErrorTracking] ${level}:`, message);
  }

  Sentry.captureMessage(message, level);
}

// Set user context for better error attribution
export function setUserContext(user: { id: string; email?: string; name?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
}

// Add breadcrumb for debugging
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
  });
}

// Start a performance transaction
export function startTransaction(name: string, op: string) {
  return Sentry.startInactiveSpan({ name, op });
}

// Create Sentry error boundary wrapper for React Router
export const SentryErrorBoundary = Sentry.ErrorBoundary;

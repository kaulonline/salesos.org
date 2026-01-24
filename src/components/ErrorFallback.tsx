import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  variant?: 'page' | 'component' | 'inline';
  componentName?: string;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  variant = 'page',
  componentName,
}: ErrorFallbackProps) {
  const isDev = import.meta.env.DEV;

  if (variant === 'inline') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-md">
        <AlertTriangle className="w-4 h-4" />
        <span>Something went wrong</span>
        <button
          onClick={resetErrorBoundary}
          className="text-red-700 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (variant === 'component') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-200">
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {componentName ? `${componentName} failed to load` : 'Component Error'}
        </h3>
        <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
          This section encountered an error. The rest of the app should still work.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1A1A1A] rounded-md hover:bg-[#2A2A2A] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        {isDev && (
          <details className="mt-4 w-full max-w-md">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Error details (dev only)
            </summary>
            <pre className="mt-2 p-3 text-xs bg-gray-100 rounded overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    );
  }

  // Page-level error (full screen)
  return (
    <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Bug className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h1>

        <p className="text-gray-600 mb-6">
          We apologize for the inconvenience. An unexpected error occurred.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={resetErrorBoundary}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#1A1A1A] rounded-lg hover:bg-[#2A2A2A] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <a
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </a>
        </div>

        {isDev && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Error details (dev only)
            </summary>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-red-600 mb-2">{error.message}</p>
              {error.stack && (
                <pre className="text-xs text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}

        <p className="mt-6 text-xs text-gray-500">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}

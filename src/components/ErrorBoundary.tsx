import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback, ErrorFallbackProps } from './ErrorFallback';
import { captureError } from '../lib/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to tracking service
    captureError(error, {
      componentStack: errorInfo.componentStack || undefined,
      context: 'ErrorBoundary',
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    // Reset error state when resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const keysChanged = this.props.resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );
      if (keysChanged) {
        this.reset();
      }
    }
  }

  private reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error!}
          resetErrorBoundary={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for page-level errors
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <ErrorFallback
          error={error}
          resetErrorBoundary={resetErrorBoundary}
          variant="page"
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Specialized error boundary for component-level errors
export function ComponentErrorBoundary({
  children,
  name,
}: {
  children: ReactNode;
  name?: string;
}) {
  return (
    <ErrorBoundary
      onError={(error) => {
        captureError(error, { component: name });
      }}
      fallback={({ error, resetErrorBoundary }) => (
        <ErrorFallback
          error={error}
          resetErrorBoundary={resetErrorBoundary}
          variant="component"
          componentName={name}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

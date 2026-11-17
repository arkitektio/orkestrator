import React, { Component, ErrorInfo, ReactNode, Suspense } from 'react';

// --- 1. Error Boundary Implementation ---
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can log the error to an error reporting service here
    console.error("AsyncBoundary caught an error:", error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Allow fallback to be a render prop so it can receive the error and reset function
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.resetErrorBoundary);
      }
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// --- 2. Default Fallback Components ---
const DefaultLoadingFallback = () => (
  <div style={{ padding: '1rem', textAlign: 'center' }}>
    <p>Loading...</p>
  </div>
);

const DefaultErrorFallback = ({ error, reset }: { error: Error; reset: () => void }) => (
  <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-destructive">
    <h3 className="mt-0">Something went wrong</h3>
    <p>{error.message}</p>
    <button
      onClick={reset}
      className="cursor-pointer rounded bg-destructive px-4 py-2 text-white"
    >
      Try Again
    </button>
  </div>
);

// --- 3. Combined Async Boundary ---
interface AsyncBoundaryProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onReset?: () => void;
}

/**
 * A wrapper component that handles both Suspense (loading) and ErrorBoundary (errors).
 * Provide custom fallbacks, or leave empty to use the defaults.
 */
export const AsyncBoundary: React.FC<AsyncBoundaryProps> = ({
  children,
  loadingFallback = <DefaultLoadingFallback />,
  errorFallback = (error, reset) => <DefaultErrorFallback error={error} reset={reset} />,
  onReset,
}) => {
  return (
    <ErrorBoundary fallback={errorFallback} onReset={onReset}>
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default AsyncBoundary;

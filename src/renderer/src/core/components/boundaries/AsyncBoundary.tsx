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
  <div style={{ padding: '1rem', border: '1px solid #f87171', borderRadius: '4px', color: '#b91c1c', backgroundColor: '#fef2f2' }}>
    <h3 style={{ marginTop: 0 }}>Something went wrong</h3>
    <p>{error.message}</p>
    <button
      onClick={reset}
      style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#b91c1c', color: 'white', border: 'none', borderRadius: '4px' }}
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

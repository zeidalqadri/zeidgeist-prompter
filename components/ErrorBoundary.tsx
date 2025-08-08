'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Store error info in state for debugging
    this.setState({
      error,
      errorInfo
    });

    // You can also log the error to an error reporting service here
    if (typeof window !== 'undefined') {
      console.group('🚨 React Error Boundary');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-red-500">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-black mb-2">
                Runtime Error
              </h2>
              <p className="text-black font-medium mb-4">
                Runtime error encountered. Refresh to restore functionality.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                >
                  Reload
                </button>
                <button
                  onClick={() => this.setState({ hasError: false })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                >
                  Retry
                </button>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-black font-semibold hover:text-gray-800">
                    Review Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
                    <div className="text-red-700 font-bold mb-2">
                      {this.state.error.message}
                    </div>
                    <pre className="whitespace-pre-wrap text-black font-medium">
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <div className="text-black font-bold mb-1">Runtime Stack:</div>
                        <pre className="whitespace-pre-wrap text-black font-medium">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
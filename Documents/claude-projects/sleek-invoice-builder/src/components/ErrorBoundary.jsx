import React, { Component } from 'react';
import { logError } from '../utils/errorHandler';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service
    logError('ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
      props: this.props.name || 'Unknown',
      errorBoundary: true
    });

    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // If this is a payment-related error, show special handling
    if (this.props.name === 'PaymentFlow' || error.message?.includes('payment')) {
      this.setState({ isPaymentError: true });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // If provided, call the reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Check if we have a custom fallback component
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Payment error specific UI
      if (this.state.isPaymentError) {
        return (
          <div className="min-h-[400px] flex items-center justify-center p-8">
            <div className="max-w-md w-full">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Payment Processing Error
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  We encountered an issue processing your payment. Your card has not been charged.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={this.handleReset}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Oops! Something went wrong
                </h2>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {this.props.name === 'InvoiceEditor'
                    ? "We couldn't save your invoice. Don't worry, your work might be recovered."
                    : this.props.name === 'Dashboard'
                    ? "We're having trouble loading your dashboard."
                    : "An unexpected error occurred. Please try again."}
                </p>

                {/* Show error details in development */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="text-left mb-4 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
                    <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      Error Details
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}

                <div className="space-y-3">
                  <button
                    onClick={this.handleReset}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Try Again
                  </button>

                  {this.state.errorCount > 2 && (
                    <button
                      onClick={this.handleReload}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Reload Page
                    </button>
                  )}

                  <button
                    onClick={() => window.location.href = '/'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>

                {this.state.errorCount > 1 && (
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Multiple errors detected. If this persists, please contact support.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper for easier use with hooks
export const withErrorBoundary = (Component, name) => {
  return function WithErrorBoundaryComponent(props) {
    return (
      <ErrorBoundary name={name}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook for error handling in functional components
export const useErrorHandler = () => {
  return (error, errorInfo) => {
    logError('useErrorHandler', error, errorInfo);
    // Could trigger a context update or state change here
  };
};

export default ErrorBoundary;
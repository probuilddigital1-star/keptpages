/**
 * Centralized Error Handler for Sleek Invoice Builder
 * Replaces console.error statements with proper error handling
 */

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || 
               typeof __DEV__ !== 'undefined' && __DEV__;

// Error severity levels
export const ErrorLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// User-friendly error messages
const USER_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  SAVE_ERROR: 'Unable to save changes. Please try again.',
  LOAD_ERROR: 'Unable to load data. Please refresh and try again.',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  PAYMENT_ERROR: 'Payment processing failed. Please try another method.',
  PDF_ERROR: 'Unable to generate PDF. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  PERMISSION_ERROR: 'You don\'t have permission to perform this action.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  DATABASE_ERROR: 'Unable to access data. Please try again later.',
  UPLOAD_ERROR: 'File upload failed. Please try again.',
  SUBSCRIPTION_ERROR: 'Unable to verify subscription. Please refresh.',
  IMPORT_ERROR: 'Import failed. Please check the file format.',
  EXPORT_ERROR: 'Export failed. Please try again.'
};

// Error tracking queue (for when we add analytics)
const errorQueue = [];

/**
 * Main error logging function
 * @param {string} context - Where the error occurred (component/function name)
 * @param {Error|string} error - The error object or message
 * @param {Object} metadata - Additional context data
 * @param {string} level - Error severity level
 * @returns {string} User-friendly error message
 */
export function logError(context, error, metadata = {}, level = ErrorLevel.ERROR) {
  const timestamp = new Date().toISOString();
  const errorData = {
    timestamp,
    context,
    level,
    message: error?.message || error?.toString() || 'Unknown error',
    stack: error?.stack,
    metadata,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    url: typeof window !== 'undefined' ? window.location.href : 'N/A'
  };

  // Development: Console output with formatting
  if (isDev) {
    const color = getConsoleColor(level);
    console.group(`%c[${context}] ${level.toUpperCase()}`, `color: ${color}; font-weight: bold;`);
    console.log('Message:', errorData.message);
    if (metadata && Object.keys(metadata).length > 0) {
      console.log('Metadata:', metadata);
    }
    if (error?.stack) {
      console.log('Stack:', error.stack);
    }
    console.groupEnd();
  }

  // Add to error queue for future analytics
  errorQueue.push(errorData);
  
  // In production, we'll send to error tracking service
  if (!isDev && errorQueue.length >= 10) {
    // Batch send errors to tracking service
    sendErrorsToTracking(errorQueue.splice(0, 10));
  }

  // Return user-friendly message
  return getUserMessage(error, context);
}

/**
 * Log informational messages
 */
export function logInfo(context, message, metadata = {}) {
  return logError(context, message, metadata, ErrorLevel.INFO);
}

/**
 * Log warning messages
 */
export function logWarning(context, message, metadata = {}) {
  return logError(context, message, metadata, ErrorLevel.WARNING);
}

/**
 * Log debug messages (only in development)
 */
export function logDebug(context, message, metadata = {}) {
  if (isDev) {
    return logError(context, message, metadata, ErrorLevel.DEBUG);
  }
}

/**
 * Get console color based on error level
 */
function getConsoleColor(level) {
  switch (level) {
    case ErrorLevel.DEBUG: return '#888';
    case ErrorLevel.INFO: return '#2196F3';
    case ErrorLevel.WARNING: return '#FF9800';
    case ErrorLevel.ERROR: return '#F44336';
    case ErrorLevel.CRITICAL: return '#D32F2F';
    default: return '#000';
  }
}

/**
 * Get user-friendly error message
 */
function getUserMessage(error, context = '') {
  const errorStr = error?.toString() || '';
  const message = error?.message || errorStr;
  
  // Check for specific error types
  if (message.includes('Network') || message.includes('fetch')) {
    return USER_MESSAGES.NETWORK_ERROR;
  }
  if (message.includes('Auth') || message.includes('401') || message.includes('403')) {
    return USER_MESSAGES.AUTH_ERROR;
  }
  if (message.includes('Payment') || message.includes('purchase')) {
    return USER_MESSAGES.PAYMENT_ERROR;
  }
  if (message.includes('PDF') || message.includes('pdf')) {
    return USER_MESSAGES.PDF_ERROR;
  }
  if (message.includes('Validation') || message.includes('Invalid')) {
    return USER_MESSAGES.VALIDATION_ERROR;
  }
  if (message.includes('Permission') || message.includes('denied')) {
    return USER_MESSAGES.PERMISSION_ERROR;
  }
  if (message.includes('Database') || message.includes('storage')) {
    return USER_MESSAGES.DATABASE_ERROR;
  }
  if (message.includes('Upload') || message.includes('file')) {
    return USER_MESSAGES.UPLOAD_ERROR;
  }
  if (message.includes('Subscription') || message.includes('premium')) {
    return USER_MESSAGES.SUBSCRIPTION_ERROR;
  }
  if (message.includes('Import')) {
    return USER_MESSAGES.IMPORT_ERROR;
  }
  if (message.includes('Export')) {
    return USER_MESSAGES.EXPORT_ERROR;
  }
  
  // Context-specific messages
  if (context.toLowerCase().includes('save')) {
    return USER_MESSAGES.SAVE_ERROR;
  }
  if (context.toLowerCase().includes('load') || context.toLowerCase().includes('fetch')) {
    return USER_MESSAGES.LOAD_ERROR;
  }
  
  return USER_MESSAGES.GENERIC_ERROR;
}

/**
 * Send errors to tracking service (placeholder for future implementation)
 */
async function sendErrorsToTracking(errors) {
  // TODO: Implement when we add Sentry or similar service
  // For now, just log that we would send errors
  if (isDev) {
    console.log('Would send errors to tracking:', errors.length);
  }
}

/**
 * Create an error boundary error handler
 */
export function handleErrorBoundary(error, errorInfo) {
  logError('ErrorBoundary', error, {
    componentStack: errorInfo?.componentStack,
    errorBoundary: true
  }, ErrorLevel.CRITICAL);
}

/**
 * Handle unhandled promise rejections
 */
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logError('UnhandledPromiseRejection', event.reason, {
      promise: event.promise
    }, ErrorLevel.ERROR);
  });
}

/**
 * Export all user messages for use in components
 */
export { USER_MESSAGES };

/**
 * Utility to safely execute async functions with error handling
 */
export async function safeAsync(fn, context = 'AsyncOperation') {
  try {
    return await fn();
  } catch (error) {
    const message = logError(context, error);
    throw new Error(message);
  }
}

/**
 * Utility to safely execute sync functions with error handling
 */
export function safeSync(fn, context = 'SyncOperation', defaultValue = null) {
  try {
    return fn();
  } catch (error) {
    logError(context, error);
    return defaultValue;
  }
}
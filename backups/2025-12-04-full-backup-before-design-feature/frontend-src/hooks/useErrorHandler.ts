// 🛡️ src/hooks/useErrorHandler.ts - Custom Hook for Error Handling with Toasts
import { useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { formatErrorForDisplay, logError, isRetryableError } from '../utils/errorHandling';

export function useErrorHandler() {
  const { error: showErrorToast, warning: showWarningToast } = useToast();

  /**
   * Handle an error and show appropriate toast notification
   * @param error - The error to handle
   * @param context - Optional context for debugging
   * @param customMessage - Optional custom message to override the default
   */
  const handleError = useCallback(
    (error: unknown, context?: string, customMessage?: string) => {
      // Log error for debugging
      logError(error, context);

      // Format error for display
      const { message, canRetry } = formatErrorForDisplay(error);

      // Show appropriate toast
      const displayMessage = customMessage || message;

      if (canRetry) {
        showWarningToast(displayMessage, 6000);
      } else {
        showErrorToast(displayMessage, 7000);
      }
    },
    [showErrorToast, showWarningToast]
  );

  /**
   * Wraps an async function with error handling
   * @param fn - The async function to wrap
   * @param context - Optional context for debugging
   * @param onError - Optional custom error handler
   */
  const withErrorHandler = useCallback(
    <T extends unknown[], R>(
      fn: (...args: T) => Promise<R>,
      context?: string,
      onError?: (error: unknown) => void
    ) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          return await fn(...args);
        } catch (error) {
          handleError(error, context);
          onError?.(error);
          return undefined;
        }
      };
    },
    [handleError]
  );

  /**
   * Wraps a synchronous function with error handling
   * @param fn - The function to wrap
   * @param context - Optional context for debugging
   * @param onError - Optional custom error handler
   */
  const withSyncErrorHandler = useCallback(
    <T extends unknown[], R>(
      fn: (...args: T) => R,
      context?: string,
      onError?: (error: unknown) => void
    ) => {
      return (...args: T): R | undefined => {
        try {
          return fn(...args);
        } catch (error) {
          handleError(error, context);
          onError?.(error);
          return undefined;
        }
      };
    },
    [handleError]
  );

  /**
   * Check if an error is retryable and show appropriate message
   */
  const isRetryable = useCallback((error: unknown): boolean => {
    return isRetryableError(error);
  }, []);

  return {
    handleError,
    withErrorHandler,
    withSyncErrorHandler,
    isRetryable,
  };
}

// Usage examples:
/*
// 1. Basic error handling
const { handleError } = useErrorHandler();

try {
  await someOperation();
} catch (error) {
  handleError(error, 'someOperation');
}

// 2. Wrapping async functions
const { withErrorHandler } = useErrorHandler();

const safeOperation = withErrorHandler(
  async (data: string) => {
    return await api.call('/endpoint', { body: data });
  },
  'api.call'
);

await safeOperation('test'); // Errors are automatically handled with toasts

// 3. With custom error callback
const safeFetch = withErrorHandler(
  fetchData,
  'fetchData',
  (error) => {
    console.log('Custom error handling', error);
  }
);
*/

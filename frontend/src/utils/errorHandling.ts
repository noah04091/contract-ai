// 🛡️ src/utils/errorHandling.ts - Centralized Error Handling Utilities

/**
 * Extracts a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  // Error instance
  if (error instanceof Error) {
    return error.message;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  // Object with message property
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  // Fallback
  return 'Ein unerwarteter Fehler ist aufgetreten';
}

/**
 * Checks if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('internet') ||
    message.includes('offline') ||
    message.includes('verbindung') ||
    error instanceof TypeError && message.includes('failed to fetch')
  );
}

/**
 * Checks if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('timeout') || message.includes('zeitüberschreitung');
}

/**
 * Checks if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return error.status === 401 || error.status === 403;
  }

  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('nicht berechtigt') ||
    message.includes('anmeldung')
  );
}

/**
 * Checks if an error indicates a resource not found
 */
export function isNotFoundError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return error.status === 404;
  }

  const message = getErrorMessage(error).toLowerCase();
  return message.includes('not found') || message.includes('nicht gefunden');
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors are retryable
  if (isNetworkError(error)) return true;

  // Timeout errors are retryable
  if (isTimeoutError(error)) return true;

  // Check for 5xx server errors
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number(error.status);
    return status >= 500 && status < 600;
  }

  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('server') ||
    message.includes('überlastet') ||
    message.includes('versuchen sie es später')
  );
}

/**
 * Formats an error for display to the user
 */
export function formatErrorForDisplay(error: unknown): {
  title: string;
  message: string;
  canRetry: boolean;
} {
  const errorMessage = getErrorMessage(error);

  if (isNetworkError(error)) {
    return {
      title: 'Verbindungsfehler',
      message: 'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
      canRetry: true,
    };
  }

  if (isTimeoutError(error)) {
    return {
      title: 'Zeitüberschreitung',
      message: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.',
      canRetry: true,
    };
  }

  if (isAuthError(error)) {
    return {
      title: 'Authentifizierung fehlgeschlagen',
      message: 'Bitte melden Sie sich erneut an.',
      canRetry: false,
    };
  }

  if (isNotFoundError(error)) {
    return {
      title: 'Nicht gefunden',
      message: 'Die angeforderte Ressource konnte nicht gefunden werden.',
      canRetry: false,
    };
  }

  // Generic server error
  if (isRetryableError(error)) {
    return {
      title: 'Server-Fehler',
      message: 'Ein temporärer Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
      canRetry: true,
    };
  }

  // Use the actual error message if it seems user-friendly
  const isUserFriendly = !errorMessage.toLowerCase().includes('error') &&
                         !errorMessage.includes('undefined') &&
                         !errorMessage.includes('null') &&
                         errorMessage.length < 200;

  if (isUserFriendly) {
    return {
      title: 'Fehler',
      message: errorMessage,
      canRetry: false,
    };
  }

  // Fallback for unclear errors
  return {
    title: 'Ein Fehler ist aufgetreten',
    message: 'Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.',
    canRetry: false,
  };
}

/**
 * Logs error with context for debugging
 */
export function logError(error: unknown, context?: string) {
  const timestamp = new Date().toISOString();
  const errorMessage = getErrorMessage(error);

  console.error(`[${timestamp}] Error${context ? ` in ${context}` : ''}:`, {
    message: errorMessage,
    error,
    isNetworkError: isNetworkError(error),
    isRetryable: isRetryableError(error),
  });

  // In production, you could send to error tracking service:
  // Sentry.captureException(error, { tags: { context } });
  // LogRocket.captureException(error);
}

/**
 * Error boundary fallback with retry
 */
export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Creates a standardized API error response
 */
export function createApiError(
  status: number,
  message: string,
  data?: unknown
): Error & { status: number; data?: unknown } {
  const error = new Error(message) as Error & { status: number; data?: unknown };
  error.status = status;
  error.data = data;
  return error;
}

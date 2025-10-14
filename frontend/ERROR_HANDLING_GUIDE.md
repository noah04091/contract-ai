# Error Handling Guide

This guide explains the modern error handling system implemented in Contract AI.

## Features

### 1. Toast Notifications
Modern, animated toast notifications with icons, progress bars, and stacking support.

### 2. Error Boundaries
React Error Boundaries with auto-recovery and retry functionality.

### 3. Inline Error Displays
Flexible error display components for forms and content areas.

### 4. Centralized Error Utilities
Helper functions for consistent error handling across the application.

## Usage Examples

### Using Toasts

```tsx
import { useToast } from '../context/ToastContext';

function MyComponent() {
  const { success, error, warning, info } = useToast();

  const handleSuccess = () => {
    success('Operation completed successfully!');
  };

  const handleError = () => {
    error('Something went wrong!', 7000); // Show for 7 seconds
  };

  const handleWarning = () => {
    warning('Please check your input');
  };

  const handleInfo = () => {
    info('This is an informational message');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Success</button>
      <button onClick={handleError}>Error</button>
      <button onClick={handleWarning}>Warning</button>
      <button onClick={handleInfo}>Info</button>
    </div>
  );
}
```

### Using Error Handler Hook

```tsx
import { useErrorHandler } from '../hooks/useErrorHandler';

function MyComponent() {
  const { handleError, withErrorHandler } = useErrorHandler();

  // Option 1: Manual error handling
  const manualOperation = async () => {
    try {
      await someApiCall();
    } catch (error) {
      handleError(error, 'manualOperation');
    }
  };

  // Option 2: Automatic error handling
  const autoOperation = withErrorHandler(
    async () => {
      return await someApiCall();
    },
    'autoOperation'
  );

  return (
    <div>
      <button onClick={manualOperation}>Manual</button>
      <button onClick={autoOperation}>Auto</button>
    </div>
  );
}
```

### Using Inline Error Display

```tsx
import ErrorDisplay, { ErrorAlert, EmptyStateError } from '../components/ErrorDisplay';

function MyComponent() {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        variant="card"
        onRetry={() => {
          setError(null);
          refetch();
        }}
        onDismiss={() => setError(null)}
      />
    );
  }

  return <div>Content</div>;
}

// Form error alert
function MyForm() {
  const [formError, setFormError] = useState('');

  return (
    <form>
      {formError && (
        <ErrorAlert
          message={formError}
          onDismiss={() => setFormError('')}
        />
      )}
      {/* Form fields */}
    </form>
  );
}

// Empty state with error
function MyList() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  if (error) {
    return (
      <EmptyStateError
        title="Failed to load items"
        message="Please try again later"
        onAction={() => refetch()}
        actionLabel="Retry"
      />
    );
  }

  return <ul>{/* Render items */}</ul>;
}
```

### Using Error Utilities

```tsx
import {
  getErrorMessage,
  formatErrorForDisplay,
  isNetworkError,
  isRetryableError,
  logError,
} from '../utils/errorHandling';

function handleApiError(error: unknown) {
  // Get user-friendly message
  const message = getErrorMessage(error);

  // Format for display
  const { title, message, canRetry } = formatErrorForDisplay(error);

  // Check error type
  if (isNetworkError(error)) {
    console.log('Network error detected');
  }

  if (isRetryableError(error)) {
    console.log('Error can be retried');
  }

  // Log with context
  logError(error, 'MyComponent.handleApiError');
}
```

### Error Boundary Usage

Error boundaries are already set up at the app level and around specific routes. They automatically catch React errors and show a recovery UI.

```tsx
import ErrorBoundary from '../components/ErrorBoundary';

function MyApp() {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

## Best Practices

1. **Use toasts for user actions**: Show success/error toasts after user-triggered operations
2. **Use inline errors for forms**: Display validation errors inline near form fields
3. **Use error boundaries for unexpected errors**: Let React errors be caught by boundaries
4. **Log errors with context**: Always include context when logging errors
5. **Provide retry options**: For retryable errors, always offer a retry button
6. **Keep messages user-friendly**: Avoid technical jargon in error messages
7. **Use appropriate toast types**:
   - Success: Green, for successful operations
   - Error: Red, for failures (shows longer)
   - Warning: Yellow, for cautionary messages
   - Info: Blue, for general information

## Toast Notification Features

- **Auto-dismiss**: Toasts automatically disappear after duration (configurable)
- **Progress bar**: Visual indicator showing remaining time
- **Stacking**: Multiple toasts stack vertically (max 5)
- **Manual dismiss**: Users can close toasts with X button
- **Animations**: Smooth enter/exit animations
- **Icons**: Type-appropriate icons (checkmark, X, warning triangle, info)
- **Responsive**: Mobile-optimized layout
- **Dark mode**: Automatic dark mode support

## Error Display Variants

### Inline (default)
Simple error display with background color and icon.

### Card
Elevated card with shadow, good for standalone errors.

### Banner
Full-width banner, good for page-level errors.

## Error Types Detected

The error utilities automatically detect:
- Network errors (offline, failed to fetch)
- Timeout errors
- Authentication errors (401, 403)
- Not found errors (404)
- Server errors (5xx)
- Retryable vs non-retryable errors

## Integration Points

The error handling system is integrated into:
- ✅ App.tsx (ToastProvider + ToastContainer)
- ✅ api.ts (retry logic, error formatting)
- ✅ ErrorBoundary (auto-recovery, manual retry)
- ✅ All API calls (error handling + retry)

## Future Enhancements

Potential improvements:
- [ ] Sentry integration for error tracking
- [ ] LogRocket integration for session replay
- [ ] Error rate limiting (prevent toast spam)
- [ ] Undo functionality for certain operations
- [ ] Offline error queue
- [ ] Custom error pages for specific error codes

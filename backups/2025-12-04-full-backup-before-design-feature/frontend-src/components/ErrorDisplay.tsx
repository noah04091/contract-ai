// 🚨 src/components/ErrorDisplay.tsx - Inline Error Display Component
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import styles from './ErrorDisplay.module.css';
import { formatErrorForDisplay } from '../utils/errorHandling';

interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'card' | 'banner';
  className?: string;
}

export default function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  variant = 'inline',
  className = '',
}: ErrorDisplayProps) {
  const { title, message, canRetry } = formatErrorForDisplay(error);

  const showRetry = canRetry && onRetry;
  const showDismiss = onDismiss;

  return (
    <motion.div
      className={`${styles.errorDisplay} ${styles[variant]} ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.errorIcon}>
        <AlertCircle size={20} />
      </div>

      <div className={styles.errorContent}>
        <h4 className={styles.errorTitle}>{title}</h4>
        <p className={styles.errorMessage}>{message}</p>

        {(showRetry || showDismiss) && (
          <div className={styles.errorActions}>
            {showRetry && (
              <button
                className={`${styles.errorButton} ${styles.retryButton}`}
                onClick={onRetry}
              >
                <RefreshCw size={14} />
                Erneut versuchen
              </button>
            )}
            {showDismiss && (
              <button
                className={`${styles.errorButton} ${styles.dismissButton}`}
                onClick={onDismiss}
              >
                <XCircle size={14} />
                Schließen
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Compact error alert for forms
export function ErrorAlert({ message, onDismiss }: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      className={styles.errorAlert}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <AlertCircle size={16} />
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className={styles.alertClose}>
          <XCircle size={14} />
        </button>
      )}
    </motion.div>
  );
}

// Empty state error display
export function EmptyStateError({
  title = 'Keine Daten gefunden',
  message = 'Versuchen Sie es später erneut oder laden Sie die Seite neu.',
  onAction,
  actionLabel = 'Neu laden',
}: {
  title?: string;
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className={styles.emptyStateError}>
      <div className={styles.emptyStateIcon}>
        <AlertCircle size={48} />
      </div>
      <h3 className={styles.emptyStateTitle}>{title}</h3>
      <p className={styles.emptyStateMessage}>{message}</p>
      {onAction && (
        <button className={styles.emptyStateButton} onClick={onAction}>
          <RefreshCw size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

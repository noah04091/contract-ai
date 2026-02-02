// 🛡️ components/ErrorBoundary.tsx - Production-Ready Error Boundary
import { Component, ReactNode, ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import styles from '../styles/ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 🔧 CSS-Preload-Fehler ignorieren - diese sind nicht kritisch
    // Die CSS-Dateien werden trotzdem über normale link-Tags geladen
    if (error.message && (
        error.message.includes('Unable to preload CSS') ||
        error.message.includes('preload'))) {
      // Wir setzen hasError auf false, damit die Komponente nicht die Fallback-UI rendert
      return { hasError: false };
    }

    // Aktualisiere State, damit die nächste Render-Phase die Fallback-UI anzeigt
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('📊 Error Info:', errorInfo);

    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // 🔄 CHUNK LOADING ERROR - Nach Deployment sind alte Chunks nicht mehr verfügbar
    // Lösung: Hard Reload der Seite, damit neue Chunks geladen werden
    if (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk') ||
      error.message.includes('ChunkLoadError')
    ) {
      console.log('🔧 Chunk-Loading-Fehler erkannt - Seite wird neu geladen...');

      // Verhindere Endlos-Reload-Loop
      const lastReload = sessionStorage.getItem('lastChunkReload');
      const now = Date.now();

      if (!lastReload || (now - parseInt(lastReload)) > 10000) {
        // Mehr als 10 Sekunden seit letztem Reload - sicher zu reloaden
        sessionStorage.setItem('lastChunkReload', now.toString());
        window.location.reload();
        return;
      } else {
        console.log('⚠️ Zu viele Reloads - zeige Fehlermeldung stattdessen');
      }
    }

    // 🔄 Auto-Recovery für DOM-Fehler (wie unser removeChild Problem)
    if (error.name === 'NotFoundError' || error.message.includes('removeChild')) {
      console.log('🔧 Auto-Recovery für DOM-Fehler gestartet...');
      this.autoRecover();
    }

    // 🔄 Auto-Recovery für CSS-Preload-Fehler (benign errors - CSS lädt via link tags)
    if (error.message.includes('Unable to preload CSS') || error.message.includes('preload')) {
      console.log('🔧 Auto-Recovery für CSS-Preload-Fehler gestartet...');
      this.autoRecover();
    }

    Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  autoRecover = () => {
    if (this.state.retryCount < 3) {
      this.retryTimeoutId = setTimeout(() => {
        console.log(`🔄 Auto-Recovery Versuch ${this.state.retryCount + 1}/3`);
        this.setState(prevState => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prevState.retryCount + 1
        }));
      }, 500); // 500ms delay für smooth recovery
    }
  };

  handleManualRetry = () => {
    console.log('🔄 Manueller Retry...');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // 🎨 Custom Fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 🚨 Standard Error UI
      return (
        <div className={styles.errorContainer}>
          <motion.div 
            className={styles.errorContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.errorIcon}>
              <AlertTriangle size={48} />
            </div>
            
            <h2 className={styles.errorTitle}>
              Ups, etwas ist schiefgelaufen!
            </h2>
            
            <p className={styles.errorMessage}>
              Keine Sorge - das passiert manchmal. Wir versuchen das Problem automatisch zu beheben.
            </p>

            {this.state.retryCount >= 3 && (
              <div className={styles.persistentError}>
                <p>Das Problem besteht weiterhin. Bitte versuche:</p>
                <ul>
                  <li>Die Seite manuell zu aktualisieren</li>
                  <li>Zum Dashboard zurückzukehren</li>
                  <li>Den Browser-Cache zu löschen</li>
                </ul>
              </div>
            )}

            <div className={styles.errorActions}>
              <motion.button
                className={styles.retryButton}
                onClick={this.handleManualRetry}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw size={16} />
                Erneut versuchen
              </motion.button>
              
              <motion.button
                className={styles.homeButton}
                onClick={this.handleGoHome}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Home size={16} />
                Zum Dashboard
              </motion.button>
            </div>

            {/* 🐛 Debug-Info für Development */}
            {this.props.showDetails && process.env.NODE_ENV === 'development' && (
              <details className={styles.errorDetails}>
                <summary>🐛 Technische Details (Development)</summary>
                <div className={styles.errorStack}>
                  <h4>Error:</h4>
                  <pre>{this.state.error?.toString()}</pre>
                  
                  <h4>Stack:</h4>
                  <pre>{this.state.error?.stack}</pre>
                  
                  <h4>Component Stack:</h4>
                  <pre>{this.state.errorInfo?.componentStack}</pre>
                </div>
              </details>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
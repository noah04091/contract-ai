/**
 * ============================================================
 * Contract-AI Debug Utility
 * Professionelles Logging-System für DevTools Console
 * ============================================================
 */

// Log-Typen mit Farben
const LOG_STYLES = {
  // API-Calls
  API_REQUEST: 'background: #3b82f6; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;',
  API_SUCCESS: 'background: #10b981; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;',
  API_ERROR: 'background: #ef4444; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;',

  // User-Aktionen
  USER_ACTION: 'background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;',

  // State-Änderungen
  STATE_CHANGE: 'background: #f59e0b; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;',

  // Info & Debug
  INFO: 'background: #6b7280; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;',
  DEBUG: 'background: #374151; color: white; padding: 2px 8px; border-radius: 3px;',

  // Erfolg & Fehler
  SUCCESS: 'background: #10b981; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;',
  ERROR: 'background: #ef4444; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;',
  WARNING: 'background: #f59e0b; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;',

  // Component Lifecycle
  COMPONENT_MOUNT: 'background: #06b6d4; color: white; padding: 2px 8px; border-radius: 3px;',
  COMPONENT_UPDATE: 'background: #0891b2; color: white; padding: 2px 8px; border-radius: 3px;',

  // Timestamp
  TIMESTAMP: 'color: #9ca3af; font-size: 11px;',

  // Details
  DETAILS: 'color: #6b7280; margin-left: 20px;',
};

// Hilfsfunktion für Timestamp
const getTimestamp = (): string => {
  const now = new Date();
  return now.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
};

// Hilfsfunktion um Dauer zu formatieren
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Debug-Logger Klasse
 */
class DebugLogger {
  private enabled: boolean = true;
  private apiCallStartTimes: Map<string, number> = new Map();

  constructor() {
    // Prüfe ob Debug aktiviert ist (kann via localStorage gesteuert werden)
    this.enabled = localStorage.getItem('debug_mode') !== 'false';

    // Initiale Nachricht
    if (this.enabled) {
      console.log(
        '%c🔧 Contract-AI Debug Console aktiviert',
        'background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: bold;'
      );
      console.log(
        '%c   Debug deaktivieren: localStorage.setItem("debug_mode", "false") + Seite neu laden',
        'color: #9ca3af; font-size: 11px;'
      );
    }
  }

  /**
   * API Request starten
   */
  apiRequest(method: string, url: string, body?: unknown) {
    if (!this.enabled) return;

    const callId = `${method}-${url}-${Date.now()}`;
    this.apiCallStartTimes.set(callId, Date.now());

    console.groupCollapsed(
      `%c[${getTimestamp()}]%c 🔵 API %c→ ${method} ${url}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.API_REQUEST,
      'color: #3b82f6; font-weight: bold;'
    );

    if (body) {
      console.log('%cRequest Body:', LOG_STYLES.DETAILS, body);
    }

    console.groupEnd();

    return callId;
  }

  /**
   * API Response erfolgreich
   */
  apiSuccess(callId: string | undefined, status: number, data: unknown, url?: string) {
    if (!this.enabled) return;

    const startTime = callId ? this.apiCallStartTimes.get(callId) : undefined;
    const duration = startTime ? Date.now() - startTime : 0;

    if (callId) this.apiCallStartTimes.delete(callId);

    console.groupCollapsed(
      `%c[${getTimestamp()}]%c 🟢 API %c← ${status} OK ${duration ? `(${formatDuration(duration)})` : ''}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.API_SUCCESS,
      'color: #10b981; font-weight: bold;'
    );

    if (url) console.log('%cURL:', LOG_STYLES.DETAILS, url);
    console.log('%cResponse:', LOG_STYLES.DETAILS, data);
    console.log('%cDauer:', LOG_STYLES.DETAILS, formatDuration(duration));

    console.groupEnd();
  }

  /**
   * API Error
   */
  apiError(callId: string | undefined, status: number | string, error: unknown, url?: string) {
    if (!this.enabled) return;

    const startTime = callId ? this.apiCallStartTimes.get(callId) : undefined;
    const duration = startTime ? Date.now() - startTime : 0;

    if (callId) this.apiCallStartTimes.delete(callId);

    console.group(
      `%c[${getTimestamp()}]%c 🔴 API %c← ${status} ERROR ${duration ? `(${formatDuration(duration)})` : ''}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.API_ERROR,
      'color: #ef4444; font-weight: bold;'
    );

    if (url) console.log('%cURL:', LOG_STYLES.DETAILS, url);
    console.error('%cFehler:', LOG_STYLES.DETAILS, error);

    // Stack Trace wenn verfügbar
    if (error instanceof Error && error.stack) {
      console.log('%cStack Trace:', LOG_STYLES.DETAILS);
      console.log(error.stack);
    }

    console.groupEnd();
  }

  /**
   * User-Aktion loggen
   */
  userAction(action: string, details?: Record<string, unknown>) {
    if (!this.enabled) return;

    console.groupCollapsed(
      `%c[${getTimestamp()}]%c 👆 USER %c${action}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.USER_ACTION,
      'color: #8b5cf6; font-weight: bold;'
    );

    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(`%c${key}:`, LOG_STYLES.DETAILS, value);
      });
    }

    console.groupEnd();
  }

  /**
   * State-Änderung loggen
   */
  stateChange(stateName: string, oldValue: unknown, newValue: unknown) {
    if (!this.enabled) return;

    console.groupCollapsed(
      `%c[${getTimestamp()}]%c 🔄 STATE %c${stateName}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.STATE_CHANGE,
      'color: #f59e0b; font-weight: bold;'
    );

    console.log('%cVorher:', LOG_STYLES.DETAILS, oldValue);
    console.log('%cNachher:', LOG_STYLES.DETAILS, newValue);

    console.groupEnd();
  }

  /**
   * Component Mount
   */
  componentMount(componentName: string, props?: Record<string, unknown>) {
    if (!this.enabled) return;

    console.groupCollapsed(
      `%c[${getTimestamp()}]%c 🔵 MOUNT %c${componentName}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.COMPONENT_MOUNT,
      'color: #06b6d4; font-weight: bold;'
    );

    if (props) {
      console.log('%cProps:', LOG_STYLES.DETAILS, props);
    }

    console.groupEnd();
  }

  /**
   * Allgemeine Info
   */
  info(message: string, data?: unknown) {
    if (!this.enabled) return;

    console.log(
      `%c[${getTimestamp()}]%c ℹ️ INFO %c${message}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.INFO,
      'color: #6b7280;',
      data || ''
    );
  }

  /**
   * Erfolg
   */
  success(message: string, data?: unknown) {
    if (!this.enabled) return;

    console.log(
      `%c[${getTimestamp()}]%c ✅ SUCCESS %c${message}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.SUCCESS,
      'color: #10b981;',
      data || ''
    );
  }

  /**
   * Warnung
   */
  warning(message: string, data?: unknown) {
    if (!this.enabled) return;

    console.warn(
      `%c[${getTimestamp()}]%c ⚠️ WARNING %c${message}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.WARNING,
      'color: #f59e0b;',
      data || ''
    );
  }

  /**
   * Fehler
   */
  error(message: string, error?: unknown) {
    if (!this.enabled) return;

    console.group(
      `%c[${getTimestamp()}]%c ❌ ERROR %c${message}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.ERROR,
      'color: #ef4444; font-weight: bold;'
    );

    if (error) {
      console.error('%cDetails:', LOG_STYLES.DETAILS, error);

      if (error instanceof Error && error.stack) {
        console.log('%cStack Trace:', LOG_STYLES.DETAILS);
        console.log(error.stack);
      }
    }

    console.groupEnd();
  }

  /**
   * Event-Daten loggen (z.B. Kalender-Events)
   */
  eventData(eventType: string, count: number, sample?: unknown) {
    if (!this.enabled) return;

    console.groupCollapsed(
      `%c[${getTimestamp()}]%c 📅 EVENTS %c${eventType}: ${count} Einträge`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.INFO,
      'color: #6b7280;'
    );

    if (sample) {
      console.log('%cBeispiel:', LOG_STYLES.DETAILS, sample);
    }

    console.groupEnd();
  }

  /**
   * Navigation loggen
   */
  navigation(from: string, to: string) {
    if (!this.enabled) return;

    console.log(
      `%c[${getTimestamp()}]%c 🧭 NAV %c${from} → ${to}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.INFO,
      'color: #6b7280;'
    );
  }

  /**
   * Performance-Messung starten
   */
  startTimer(label: string): () => void {
    const startTime = performance.now();

    return () => {
      if (!this.enabled) return;
      const duration = performance.now() - startTime;
      console.log(
        `%c[${getTimestamp()}]%c ⏱️ PERF %c${label}: ${formatDuration(duration)}`,
        LOG_STYLES.TIMESTAMP,
        LOG_STYLES.DEBUG,
        'color: #374151;'
      );
    };
  }

  /**
   * Gruppierte Logs
   */
  group(title: string, fn: () => void) {
    if (!this.enabled) return;

    console.group(
      `%c[${getTimestamp()}]%c 📦 %c${title}`,
      LOG_STYLES.TIMESTAMP,
      LOG_STYLES.INFO,
      'color: #6b7280; font-weight: bold;'
    );

    fn();

    console.groupEnd();
  }

  /**
   * Table-Output für Arrays
   */
  table(data: unknown[], label?: string) {
    if (!this.enabled) return;

    if (label) {
      console.log(
        `%c[${getTimestamp()}]%c 📊 TABLE %c${label}`,
        LOG_STYLES.TIMESTAMP,
        LOG_STYLES.INFO,
        'color: #6b7280;'
      );
    }

    console.table(data);
  }
}

// Singleton-Export
export const debug = new DebugLogger();

// Convenience-Exports
export const logApi = {
  request: (method: string, url: string, body?: unknown) => debug.apiRequest(method, url, body),
  success: (callId: string | undefined, status: number, data: unknown, url?: string) => debug.apiSuccess(callId, status, data, url),
  error: (callId: string | undefined, status: number | string, error: unknown, url?: string) => debug.apiError(callId, status, error, url),
};

export const logUser = (action: string, details?: Record<string, unknown>) => debug.userAction(action, details);
export const logState = (name: string, oldVal: unknown, newVal: unknown) => debug.stateChange(name, oldVal, newVal);
export const logInfo = (msg: string, data?: unknown) => debug.info(msg, data);
export const logSuccess = (msg: string, data?: unknown) => debug.success(msg, data);
export const logWarning = (msg: string, data?: unknown) => debug.warning(msg, data);
export const logError = (msg: string, error?: unknown) => debug.error(msg, error);

export default debug;

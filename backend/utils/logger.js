// 📁 backend/utils/logger.js
// 📝 Strukturiertes Logging System für Contract AI

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4
};

// Aktuelles Log-Level aus Environment (default: info in production, debug in development)
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ??
  (process.env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug);

// Farben für Console (nur in Development)
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m',   // Cyan
  info: '\x1b[32m',    // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  critical: '\x1b[35m' // Magenta
};

// Emojis für bessere Lesbarkeit
const EMOJIS = {
  debug: '🔍',
  info: '📝',
  warn: '⚠️',
  error: '❌',
  critical: '🚨'
};

/**
 * Formatiert einen Log-Eintrag als JSON (für Production)
 */
function formatJSON(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
    pid: process.pid,
    env: process.env.NODE_ENV || 'development'
  });
}

/**
 * Formatiert einen Log-Eintrag für die Console (Development)
 */
function formatConsole(level, message, meta = {}) {
  const timestamp = new Date().toLocaleTimeString('de-DE');
  const color = COLORS[level] || COLORS.reset;
  const emoji = EMOJIS[level] || '';
  const reset = COLORS.reset;

  let output = `${color}[${timestamp}] ${emoji} ${level.toUpperCase()}${reset}: ${message}`;

  // Meta-Daten anhängen wenn vorhanden
  if (Object.keys(meta).length > 0) {
    const metaStr = Object.entries(meta)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}=${JSON.stringify(value)}`;
        }
        return `${key}=${value}`;
      })
      .join(' | ');
    output += ` (${metaStr})`;
  }

  return output;
}

/**
 * Erstellt einen Log-Eintrag
 */
function log(level, message, meta = {}) {
  // Prüfe ob Level geloggt werden soll
  if (LOG_LEVELS[level] < currentLevel) {
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const formatted = isProduction
    ? formatJSON(level, message, meta)
    : formatConsole(level, message, meta);

  // Output basierend auf Level
  switch (level) {
    case 'error':
    case 'critical':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }

  return { level, message, meta, timestamp: new Date() };
}

/**
 * Logger-Instanz mit allen Methoden
 */
const logger = {
  debug: (message, meta) => log('debug', message, meta),
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
  critical: (message, meta) => log('critical', message, meta),

  // HTTP Request Logger Middleware
  requestLogger: (req, res, next) => {
    const start = Date.now();

    // Nach Response loggen
    res.on('finish', () => {
      const duration = Date.now() - start;
      const meta = {
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection?.remoteAddress,
        userId: req.user?.userId || null
      };

      // Log-Level basierend auf Status-Code
      if (res.statusCode >= 500) {
        logger.error(`${req.method} ${req.originalUrl}`, meta);

        // 🚨 17.08.2026: Bis heute endete ein Routen-Fehler GENAU HIER — im Logfile
        // und sonst nirgends. 578 Stellen in 61 Routendateien beantworten ihren
        // Fehler selbst mit res.status(5xx), keine einzige reicht ihn weiter
        // (next(err): 0 Treffer in routes/). Das fertige Alarmsystem in
        // services/errorMonitoring.js bekam davon nie etwas mit: error_logs enthielt
        // über die gesamte Laufzeit 15 Einträge, kein einziger ein Routen-Fehler.
        // Ein Ausfall von OpenAI wäre nur über Kundenmails aufgefallen.
        //
        // Dieser Block hängt in res.on('finish') und läuft damit NACH dem
        // vollständigen Senden der Antwort — Status, Body und Laufzeit sind hier
        // unveränderlich (im eigenständigen Mini-Test belegt: ein res.status(999)
        // an dieser Stelle blieb beim Client wirkungslos).
        //
        // Verzögertes require: hält logger.js beim Modulstart abhängigkeitsfrei.
        // Eigenes catch: die Alarmierung darf nie auf den Request-Pfad zurückschlagen.
        try {
          require('../services/errorMonitoring').captureHttpErrorResponse(req, res);
        } catch (_) { /* Alarmierung ist nie wichtiger als die Anfrage */ }
      } else if (res.statusCode >= 400) {
        logger.warn(`${req.method} ${req.originalUrl}`, meta);
      } else {
        logger.info(`${req.method} ${req.originalUrl}`, meta);
      }
    });

    next();
  },

  // Spezialisierte Logger für verschiedene Bereiche
  auth: {
    login: (email, success, meta = {}) =>
      log(success ? 'info' : 'warn', `Login ${success ? 'erfolgreich' : 'fehlgeschlagen'}`, { email, ...meta }),
    register: (email, meta = {}) =>
      log('info', 'Neuer User registriert', { email, ...meta }),
    logout: (userId, meta = {}) =>
      log('info', 'User ausgeloggt', { userId, ...meta }),
    tokenRefresh: (userId, meta = {}) =>
      log('debug', 'Token erneuert', { userId, ...meta })
  },

  api: {
    call: (endpoint, userId, meta = {}) =>
      log('debug', `API Call: ${endpoint}`, { userId, ...meta }),
    error: (endpoint, error, meta = {}) =>
      log('error', `API Error: ${endpoint}`, { error: error.message, ...meta }),
    rateLimit: (ip, endpoint, meta = {}) =>
      log('warn', 'Rate Limit erreicht', { ip, endpoint, ...meta })
  },

  db: {
    query: (collection, operation, meta = {}) =>
      log('debug', `DB ${operation} on ${collection}`, meta),
    error: (operation, error, meta = {}) =>
      log('error', `DB Error: ${operation}`, { error: error.message, ...meta }),
    connected: () =>
      log('info', 'MongoDB verbunden'),
    disconnected: () =>
      log('warn', 'MongoDB Verbindung getrennt'),
    reconnecting: (attempt, maxAttempts) =>
      log('info', `MongoDB Reconnect ${attempt}/${maxAttempts}`)
  },

  ai: {
    request: (feature, userId, meta = {}) =>
      log('info', `AI Request: ${feature}`, { userId, ...meta }),
    response: (feature, tokens, cost, meta = {}) =>
      log('info', `AI Response: ${feature}`, { tokens, cost, ...meta }),
    error: (feature, error, meta = {}) =>
      log('error', `AI Error: ${feature}`, { error: error.message, ...meta }),
    circuitOpen: () =>
      log('warn', 'Circuit Breaker OPEN - AI temporär deaktiviert'),
    circuitClose: () =>
      log('info', 'Circuit Breaker CLOSED - AI wieder aktiv')
  },

  email: {
    sent: (to, subject, meta = {}) =>
      log('info', 'E-Mail gesendet', { to, subject, ...meta }),
    error: (to, error, meta = {}) =>
      log('error', 'E-Mail Fehler', { to, error: error.message, ...meta })
  },

  security: {
    suspiciousActivity: (ip, reason, meta = {}) =>
      log('warn', 'Verdächtige Aktivität', { ip, reason, ...meta }),
    blockedRequest: (ip, reason, meta = {}) =>
      log('warn', 'Request blockiert', { ip, reason, ...meta }),
    authFailure: (email, reason, meta = {}) =>
      log('warn', 'Auth-Fehler', { email, reason, ...meta })
  }
};

module.exports = logger;

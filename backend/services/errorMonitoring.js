// 📁 backend/services/errorMonitoring.js
// 🚨 Eigenes Error Monitoring System - ohne externe Abhängigkeiten

const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { generateEmailTemplate } = require('../utils/emailTemplate');

// In-Memory Cache für Fehler-Gruppierung (verhindert Spam)
const errorCache = new Map();
const ERROR_COOLDOWN_MS = 15 * 60 * 1000; // 15 Minuten zwischen gleichen Fehlern

// Konfiguration
const CONFIG = {
  // E-Mail-Empfänger für kritische Fehler
  alertEmail: process.env.ERROR_ALERT_EMAIL || process.env.ADMIN_EMAIL || null,

  // Minimale Severity für E-Mail-Benachrichtigung
  emailThreshold: 'high', // 'low', 'medium', 'high', 'critical'

  // Maximale Fehler pro Stunde bevor Throttling
  maxErrorsPerHour: 50,

  // Fehler-Zähler
  errorCountThisHour: 0,
  hourStartTime: Date.now(),

  // 🚨 17.08.2026: Eigener, deutlich strengerer Deckel NUR für Alarme aus
  // 5xx-Antworten der Routen (siehe captureHttpErrorResponse). Grund: Bis heute
  // erreichte KEIN Routen-Fehler dieses System, es gibt also keinen Erfahrungswert
  // für das normale Fehleraufkommen. Der globale 50er-Deckel wäre als einzige
  // Bremse zu locker. Wichtig: Der Deckel drosselt ausschließlich den MAILVERSAND,
  // in error_logs (und damit ins Admin-Dashboard) wandert weiterhin JEDER Fall.
  maxRouteAlertMailsPerHour: 5,
  routeAlertMailsThisHour: 0,
  routeAlertHourStart: Date.now()
};

// Severity-Level
const SEVERITY = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

// MongoDB Collection (wird beim ersten Aufruf initialisiert)
let errorsCollection = null;

/**
 * Initialisiert die Error-Collection
 */
function initErrorCollection(db) {
  if (db) {
    errorsCollection = db.collection('error_logs');
    // Index für schnelle Abfragen
    errorsCollection.createIndex({ timestamp: -1 }).catch(() => {});
    errorsCollection.createIndex({ fingerprint: 1 }).catch(() => {});
    errorsCollection.createIndex({ resolved: 1 }).catch(() => {});
    console.log('✅ Error Monitoring initialisiert');
  }
}

/**
 * Generiert einen Fingerprint für Fehler-Gruppierung
 *
 * 🐛 17.08.2026 KORREKTUR: Vorher `Buffer.from(parts.join('|')).toString('base64')
 * .substring(0, 32)`. Base64 kürzt NICHT den Text, sondern die Kodierung — 32
 * Base64-Zeichen entsprechen exakt 24 Byte Klartext. Vom Fingerabdruck übrig blieb
 * damit nur `"MongoNetworkTimeoutError|"` bzw. `"HttpErrorResponse|HTTP 5"`:
 * Fehlermeldung, Route und Methode fielen vollständig weg. Folge im Altbestand:
 * Zwei verschiedene Cron-Jobs mit demselben Fehlertyp (real vorgekommen:
 * `MongoNetworkTimeoutError` in smart-status-update und in event-generation) galten
 * als DERSELBE Fehler — der zweite wurde innerhalb der Ruhezeit stillschweigend
 * verschluckt statt gemeldet.
 *
 * Jetzt: echter Hash über alle vier Teile. Gleiche Rückgabeform (String, 32 Zeichen),
 * gleiche Aufrufer. Alte Fingerabdrücke in error_logs bleiben lesbar, sie werden nur
 * nicht mehr fortgeschrieben — bei 15 Einträgen Gesamtbestand ohne Bedeutung.
 */
function generateFingerprint(error, context = {}) {
  const parts = [
    error?.name || 'Error',
    error?.message?.substring(0, 100) || 'Unknown',
    context.route || 'unknown',
    context.method || 'unknown'
  ];
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex').substring(0, 32);
}

/**
 * Bestimmt die Severity eines Fehlers
 */
function determineSeverity(error, context = {}) {
  // Kritisch: Datenbank-Fehler, Auth-Fehler
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    return 'critical';
  }
  // 🔧 20.08.2026: Diese Regel stufte JEDEN Fehler unter /auth/ als "high" ein, sobald
  // er kein 401 war — auch reine EINGABEfehler des Aufrufers. Realfall, der es aufdeckte:
  // ein bewusst kaputter Anfrage-Inhalt (`{kaputt`) aus einem curl-Test schlug als
  // "high" auf, obwohl der Server voellig korrekt mit 400 abgelehnt hat und nichts
  // kaputt war. Ein 4xx bedeutet "der Absender hat Unsinn geschickt", kein Serverfehler.
  //
  // ⚠️ Bewusst NICHT die ganze Regel gestrichen: Ein echter ABSTURZ unter /auth/ traegt
  // gar keinen Status. Der muss weiterhin sofort "high" sein, sonst waere das eine
  // Verschlechterung. Deshalb wird nur der Fall mit explizitem 4xx herausgenommen.
  const statusCode = error.status || error.statusCode || null;
  const istEingabefehler = statusCode >= 400 && statusCode < 500;
  if (context.route?.includes('/auth/') && !istEingabefehler) {
    return 'high';
  }

  // Hoch: Server-Fehler (5xx)
  if (error.status >= 500 || error.statusCode >= 500) {
    return 'high';
  }

  // Medium: Unerwartete Fehler
  if (!error.status && !error.statusCode) {
    return 'medium';
  }

  // Niedrig: Client-Fehler (4xx)
  return 'low';
}

/**
 * Prüft ob für diesen Fehler kürzlich schon eine Benachrichtigung gesendet wurde
 */
function shouldNotify(fingerprint, severity) {
  const now = Date.now();
  const lastNotification = errorCache.get(fingerprint);

  // Prüfe Cooldown
  if (lastNotification && (now - lastNotification) < ERROR_COOLDOWN_MS) {
    return false;
  }

  // Prüfe Severity-Threshold
  if (SEVERITY[severity] < SEVERITY[CONFIG.emailThreshold]) {
    return false;
  }

  // Prüfe Rate-Limit
  if (now - CONFIG.hourStartTime > 60 * 60 * 1000) {
    CONFIG.errorCountThisHour = 0;
    CONFIG.hourStartTime = now;
  }

  if (CONFIG.errorCountThisHour >= CONFIG.maxErrorsPerHour) {
    console.warn('🚨 Error notification rate limit reached');
    return false;
  }

  return true;
}

/**
 * Sendet E-Mail-Benachrichtigung
 */
async function sendErrorNotification(errorData) {
  if (!CONFIG.alertEmail) {
    console.warn('⚠️ ERROR_ALERT_EMAIL nicht konfiguriert - keine Benachrichtigung gesendet');
    return;
  }

  try {
    const { error, context, severity, fingerprint, count } = errorData;

    // 🔒 20.08.2026: Ab hier stehen vom AUFRUFER gelieferte Werte in der Mail
    // (User-Agent, IP). Die Mail ist HTML — ohne Maskierung koennte ein Angreifer
    // ueber einen praeparierten User-Agent Markup in unsere eigene Alarm-Mail
    // einschleusen. Deshalb laeuft jeder Fremdwert durch diese Funktion.
    const esc = (wert) => String(wert === null || wert === undefined ? '' : wert)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    // 20.08.2026: "Nicht eingeloggt" war irrefuehrend. Bricht die Anfrage schon im
    // Body-Parser ab (type beginnt mit 'entity.'), lief die Anmeldepruefung NIE —
    // dort steht dann immer "nicht eingeloggt", auch bei einem angemeldeten Kunden.
    const vorAnmeldungAbgebrochen = typeof error.type === 'string' && error.type.startsWith('entity.');
    const nutzerZeile = context.userId
      ? esc(context.userId)
      : (vorAnmeldungAbgebrochen
          ? 'unbekannt (Abbruch vor der Anmeldeprüfung)'
          : 'Nicht eingeloggt');

    const subject = `🚨 [${severity.toUpperCase()}] Fehler in Contract AI`;

    const html = generateEmailTemplate({
      title: 'Fehler erkannt',
      body: `
        <p>Ein Fehler wurde in Contract AI erkannt:</p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Fehler:</strong> ${esc(error.name) || 'Error'}</p>
          <p style="margin: 0 0 8px 0;"><strong>Nachricht:</strong> ${esc(error.message) || 'Keine Nachricht'}</p>
          <p style="margin: 0 0 8px 0;"><strong>Severity:</strong> ${severity}</p>
          <p style="margin: 0 0 8px 0;"><strong>Route:</strong> ${esc(context.route) || 'Unbekannt'}</p>
          <p style="margin: 0 0 8px 0;"><strong>Methode:</strong> ${esc(context.method) || 'Unbekannt'}</p>
          <p style="margin: 0 0 8px 0;"><strong>User:</strong> ${nutzerZeile}</p>
          <p style="margin: 0 0 8px 0;"><strong>Absender:</strong> ${esc(context.userAgent) || 'unbekannt'}</p>
          <p style="margin: 0 0 8px 0;"><strong>IP:</strong> ${esc(context.ip) || 'unbekannt'}</p>
          <p style="margin: 0;"><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE')}</p>
        </div>

        ${count > 1 ? `<p style="color: #b91c1c;">Dieser Fehler ist ${count}x aufgetreten.</p>` : ''}

        ${error.stack ? `
          <details style="margin-top: 16px;">
            <summary style="cursor: pointer; color: #6b7280;">Stack Trace anzeigen</summary>
            <pre style="background: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin-top: 8px;">${esc(error.stack)}</pre>
          </details>
        ` : ''}
      `
    });

    await sendEmail({
      to: CONFIG.alertEmail,
      subject,
      html
    });

    console.log(`📧 Error-Benachrichtigung gesendet an ${CONFIG.alertEmail}`);
    CONFIG.errorCountThisHour++;

  } catch (emailError) {
    console.error('❌ Fehler beim Senden der Error-Benachrichtigung:', emailError.message);
  }
}

/**
 * Hauptfunktion: Fehler erfassen und verarbeiten
 */
async function captureError(error, context = {}) {
  try {
    const fingerprint = generateFingerprint(error, context);
    const severity = context.severity || determineSeverity(error, context);
    const timestamp = new Date();

    // Fehler-Dokument
    const errorDoc = {
      fingerprint,
      severity,
      timestamp,
      error: {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        stack: error.stack || null,
        code: error.code || null,
        // 20.08.2026: Beides fehlte und musste bei der Aufklaerung muehsam aus dem
        // Stack Trace erschlossen werden. `type` setzt z.B. body-parser auf
        // 'entity.parse.failed' — daran erkennt man einen Abbruch VOR der Route.
        status: error.status || error.statusCode || null,
        type: error.type || null
      },
      context: {
        route: context.route || null,
        method: context.method || null,
        userId: context.userId || null,
        userEmail: context.userEmail || null,
        ip: context.ip || null,
        userAgent: context.userAgent || null,
        body: context.body ? JSON.stringify(context.body).substring(0, 500) : null,
        query: context.query ? JSON.stringify(context.query) : null
      },
      resolved: false,
      count: 1
    };

    // In MongoDB speichern (mit Gruppierung)
    if (errorsCollection) {
      const existing = await errorsCollection.findOne({
        fingerprint,
        resolved: false,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Letzten 24h
      });

      if (existing) {
        // Existierenden Fehler updaten
        await errorsCollection.updateOne(
          { _id: existing._id },
          {
            $inc: { count: 1 },
            $set: { lastOccurrence: timestamp }
          }
        );
        errorDoc.count = existing.count + 1;
      } else {
        // Neuen Fehler einfügen
        await errorsCollection.insertOne(errorDoc);
      }
    }

    // Console-Log
    console.error(`🚨 [${severity.toUpperCase()}] ${error.name}: ${error.message} (Route: ${context.route || 'unknown'})`);

    // E-Mail-Benachrichtigung
    if (shouldNotify(fingerprint, severity)) {
      errorCache.set(fingerprint, Date.now());
      await sendErrorNotification({ error, context, severity, fingerprint, count: errorDoc.count });
    }

    return { fingerprint, severity };

  } catch (captureError) {
    // Fehler beim Erfassen sollte nie die App crashen
    console.error('❌ Error Monitoring Fehler:', captureError.message);
    return null;
  }
}

/**
 * 🔤 Reduziert einen Anfragepfad auf sein Muster.
 *
 * Warum das PFLICHT und nicht Kosmetik ist: generateFingerprint() bildet den
 * Fingerabdruck aus Fehlername + Meldung + ROUTE + Methode. Steckt in der Route
 * eine echte Vertrags-/Job-/Token-ID, ist jede Anfrage ein eigener Fingerabdruck
 * → der 15-Minuten-Cooldown greift nie und aus EINER Störung würden bis zum
 * Deckel viele Einzelmails. Mit Muster fallen alle Fälle derselben Route
 * zusammen und werden zu einer Mail mit Zähler.
 *
 * Zwei Wege, bewusst in dieser Reihenfolge:
 *  1. Das Express-Routen-Muster (benennt jeden Parameter korrekt: :id, :token, …).
 *  2. Ersatz: Pfad selbst bereinigen — nötig, weil Express bei Antworten aus dem
 *     globalen Error-Handler req.baseUrl zurücksetzt und das Muster dann nur einen
 *     Teilpfad abdeckt (im eigenständigen Mini-Test am 17.08. belegt). Erkannt wird
 *     das über den Segmentvergleich unten.
 */
function normalizeRoutePath(req) {
  const roherPfad = String(req?.originalUrl || req?.url || '').split('?')[0];
  const segmente = roherPfad.split('/').filter(Boolean);

  // 1) Express-Muster, aber nur wenn es den GANZEN Pfad abdeckt.
  const routenPfad = req?.route?.path;
  if (routenPfad && typeof routenPfad === 'string') {
    const muster = ((req.baseUrl || '') + routenPfad).replace(/\/+$/, '') || '/';
    if (muster.split('/').filter(Boolean).length === segmente.length) return muster;
  }

  // 2) Ersatz: jedes Segment, das wie eine ID/ein Token aussieht, generalisieren.
  const bereinigt = segmente.map((seg) => {
    if (/^[0-9a-f]{24}$/i.test(seg)) return ':id';                                  // Mongo-ObjectId
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ':uuid';
    if (/^job_/.test(seg)) return ':jobId';                                          // generateJobId()
    if (/^\d+$/.test(seg)) return ':n';
    if (/^[0-9a-f]{16,}$/i.test(seg)) return ':hex';                                 // Hex-Token beliebiger Länge
    if (seg.length >= 20 && /\d/.test(seg) && /^[A-Za-z0-9._~+/=-]+$/.test(seg)) return ':token';
    return seg;
  });

  return '/' + bereinigt.join('/');
}

/**
 * 🚦 Nur der MAILVERSAND für Routen-Alarme wird gedrosselt, nie die Erfassung.
 * Gibt true zurück, wenn für diesen Fall noch eine Mail rausgehen darf.
 */
function routeAlertMailBudgetOk() {
  const jetzt = Date.now();
  if (jetzt - CONFIG.routeAlertHourStart > 60 * 60 * 1000) {
    CONFIG.routeAlertMailsThisHour = 0;
    CONFIG.routeAlertHourStart = jetzt;
  }
  if (CONFIG.routeAlertMailsThisHour >= CONFIG.maxRouteAlertMailsPerHour) return false;
  CONFIG.routeAlertMailsThisHour++;
  return true;
}

/**
 * 🚨 17.08.2026: Meldet eine 5xx-Antwort, die eine Route SELBST erzeugt hat.
 *
 * Hintergrund: 578 Stellen in 61 Routendateien beantworten ihren Fehler mit
 * res.status(5xx) und geben ihn an NIEMANDEN weiter (next(err): 0 Treffer im
 * gesamten routes/-Verzeichnis). Der globale errorHandler unten hing damit ins
 * Leere — Beleg: error_logs enthielt über die gesamte Laufzeit 15 Einträge, kein
 * einziger davon ein Routen-Fehler. Aufgerufen wird diese Funktion aus dem
 * bestehenden Beobachter in utils/logger.js, der ohnehin jede Antwort sieht.
 *
 * Sicherheitszusagen:
 *  - Läuft in res.on('finish'), also NACH dem vollständigen Senden der Antwort.
 *    Status, Body und Laufzeit sind zu diesem Zeitpunkt unveränderlich.
 *  - Wirft nie. Jeder Fehler hier bleibt hier.
 *  - Der Aufrufer wartet nicht: die Erfassung läuft im Hintergrund weiter. Die
 *    zurückgegebene Promise existiert ausschließlich für die Tests (sie ist bereits
 *    abgesichert und kann nicht abgelehnt werden); übersprungene Fälle liefern null.
 */
function captureHttpErrorResponse(req, res) {
  try {
    // Notbremse ohne Code-Änderung (Umgebungsvariable auf Render; Neustart nötig).
    if (process.env.ROUTE_ERROR_ALERTS_ENABLED === 'false') return null;
    if (!res || res.statusCode < 500) return null;

    // Doppelmeldung verhindern: Ging der Fehler bereits durch errorHandler
    // (z.B. Multer-Uploadfehler), ist er dort schon erfasst. Im Mini-Test belegt,
    // dass 'finish' auch nach dem Error-Handler noch feuert.
    if (res.__caErrorCaptured) return null;

    const route = normalizeRoutePath(req);

    // Synthetischer Fehler: Das echte Fehlerobjekt existiert an dieser Stelle nicht
    // mehr, die Route hat es selbst gefangen. Der HTTP-Status trägt die Severity —
    // determineSeverity() stuft >= 500 als 'high' ein, also mailwürdig.
    /* 05.09.2026: Die Meldung bestand nur aus Status und Route, der Stack
       zeigte ausschliesslich die Alarmierung selbst. Wer die Mail bekam,
       wusste DASS etwas kaputt war, aber nicht WAS, und musste jedes Mal in
       die Server-Logs. Routen koennen jetzt res.__caFehlerGrund setzen und
       damit einen kurzen, selbst gewaehlten Grund mitgeben.
       Bewusst NUR was die Route ausdruecklich hinterlegt: sie weiss, welche
       Fehler bei ihr auftreten, und kann Vertragsinhalte heraushalten.
       Zusaetzlich hart auf 200 Zeichen gedeckelt. */
    const grund = typeof res.__caFehlerGrund === 'string' && res.__caFehlerGrund.trim()
      ? ` — ${res.__caFehlerGrund.trim().slice(0, 200)}`
      : '';
    const fehler = new Error(`HTTP ${res.statusCode} auf ${req?.method || '?'} ${route}${grund}`);
    fehler.name = 'HttpErrorResponse';
    fehler.status = res.statusCode;

    // Deckel greift NUR für die Mail. Ohne Budget wird auf 'medium' herabgestuft:
    // Eintrag in error_logs + Admin-Dashboard bleibt, die Mail entfällt.
    const severity = routeAlertMailBudgetOk() ? 'high' : 'medium';

    return captureError(fehler, {
      route,
      method: req?.method || null,
      userId: req?.user?.userId || null,
      userEmail: req?.user?.email || null,
      ip: req?.ip || null,
      userAgent: req?.headers?.['user-agent'] || null,
      // Bewusst KEIN body/query: die Anfragen tragen Vertragsinhalte und
      // personenbezogene Daten, die nichts in einer Fehlermeldung zu suchen haben.
      severity
    }).catch(() => null);
  } catch (_) {
    // Alarmierung darf niemals auf den Request-Pfad zurückschlagen.
    return null;
  }
}

/**
 * Express Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  // 🚩 17.08.2026: Markierung gegen Doppelmeldung. Dieser Fehler wird gleich unten
  // erfasst; der 5xx-Beobachter in utils/logger.js läuft danach trotzdem noch
  // (res.on('finish') feuert auch nach dem Error-Handler, im Mini-Test belegt) und
  // muss ihn an dieser Marke erkennen und überspringen.
  try { res.__caErrorCaptured = true; } catch (_) { /* niemals blockieren */ }

  // Kontext aus Request extrahieren
  const context = {
    // 17.08.2026: auch hier das Muster statt der rohen URL — sonst trägt jeder
    // Upload-Fehler die echte Vertrags-ID im Fingerabdruck und in error_logs
    // (real vorhanden: `/api/contract-builder/6a280389d416583998d2d74f`), womit
    // die Gruppierung wirkungslos wäre und IDs unnötig protokolliert würden.
    route: normalizeRoutePath(req),
    method: req.method,
    userId: req.user?.userId || null,
    userEmail: req.user?.email || null,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers?.['user-agent'],
    body: req.body,
    query: req.query
  };

  // Fehler erfassen (async, blockiert nicht)
  captureError(err, context).catch(() => {});

  // Response senden (wenn noch nicht gesendet)
  if (!res.headersSent) {
    // 📦 Multer-Upload-Fehler (z.B. Datei über dem Größen-Limit) tragen keinen .status →
    // liefen sonst als generischer 500 „interner Fehler" beim User an, obwohl es ein klarer
    // Eingabe-Fall ist. Hier in eine verständliche 413-Meldung übersetzen (alle Upload-Wege).
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: '📄 Die Datei ist zu groß (max. 50 MB). Bitte lade eine kleinere Datei hoch oder teile das Dokument auf.'
      });
    }
    if (err && typeof err.code === 'string' && err.code.startsWith('LIMIT_')) {
      // Weitere Multer-Limits (zu viele Dateien/Felder o.ä.) ebenfalls verständlich melden.
      return res.status(400).json({
        success: false,
        error: 'UPLOAD_LIMIT',
        message: 'Der Upload hat ein Limit überschritten. Bitte prüfe Datei-Anzahl und -Größe und versuche es erneut.'
      });
    }

    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: statusCode >= 500
        ? 'Ein interner Fehler ist aufgetreten. Unser Team wurde benachrichtigt.'
        : err.message || 'Ein Fehler ist aufgetreten.',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  }
}

/**
 * API-Endpoint für Fehler-Statistiken (Admin)
 */
async function getErrorStats(timeframeHours = 24) {
  if (!errorsCollection) {
    return { error: 'Error collection not initialized' };
  }

  const since = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

  const [total, bySeverity, topErrors, recentErrors] = await Promise.all([
    // Gesamtzahl
    errorsCollection.countDocuments({ timestamp: { $gte: since } }),

    // Nach Severity
    errorsCollection.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]).toArray(),

    // Top 5 häufigste Fehler
    errorsCollection.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: {
        _id: '$fingerprint',
        count: { $sum: '$count' },
        error: { $first: '$error' },
        route: { $first: '$context.route' },
        severity: { $first: '$severity' }
      }},
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray(),

    // Letzte 10 Fehler
    errorsCollection.find({ timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray()
  ]);

  return {
    timeframeHours,
    total,
    bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
    topErrors,
    recentErrors: recentErrors.map(e => ({
      timestamp: e.timestamp,
      severity: e.severity,
      error: e.error.name + ': ' + e.error.message.substring(0, 100),
      route: e.context?.route,
      count: e.count
    }))
  };
}

/**
 * Fehler als gelöst markieren
 */
async function resolveError(fingerprint) {
  if (!errorsCollection) return false;

  const result = await errorsCollection.updateMany(
    { fingerprint },
    { $set: { resolved: true, resolvedAt: new Date() } }
  );

  return result.modifiedCount > 0;
}

module.exports = {
  initErrorCollection,
  captureError,
  captureHttpErrorResponse,
  normalizeRoutePath,
  errorHandler,
  getErrorStats,
  resolveError,
  CONFIG
};

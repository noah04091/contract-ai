// backend/middleware/rateLimiter.js
// Rate Limiting fuer Contract AI API Endpoints

const net = require('net');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit'); // IPv6-sicherer IP-Schlüssel (verhindert Bypass)

/**
 * 🔑 Kundenadresse fuer die NICHT angemeldeten Routen (Anmelden, Passwort vergessen,
 * Passwort neu setzen). Bewusst OHNE app.set('trust proxy', ...).
 *
 * Warum kein trust proxy (17.08.2026 gemessen): api.contract-ai.de antwortet von
 * 216.24.57.7, das liegt in KEINEM veroeffentlichten Cloudflare-Bereich. Renders
 * Zwischensprung ist damit von aussen nicht benennbar. Jede trust-proxy-Variante
 * raet also die Kettenlaenge (dann faelschbar) oder haelt am Zwischensprung (dann
 * zaehlen alle Nutzer dahinter in EINEN Topf, enger als heute).
 *
 * CF-Connecting-IP laeuft die Kette gar nicht ab: Cloudflare setzt die Kopfzeile bei
 * jeder Anfrage selbst und ueberschreibt, was der Aufrufer schickt.
 * Fehlt sie, gilt der bisherige Zustand — der Fehlerfall kostet nichts.
 *
 * Die Wertpruefung faengt nur versehentlichen Muell ab; gegen einen vollaufenden
 * Zaehlerspeicher schuetzen die Nicht-Faelschbarkeit und der selbstraeumende Speicher
 * von express-rate-limit (zwei Puffer, clearExpired im Fenstertakt).
 */
function clientAddressKey(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string') {
    const candidate = cf.trim();
    if (net.isIP(candidate)) return ipKeyGenerator(candidate);
  }
  return ipKeyGenerator(req.ip);
}

const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    error: 'Zu viele Anfragen',
    message: 'Bitte warten Sie einige Minuten und versuchen Sie es erneut.',
    retryAfter: '15 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.user?.id || ipKeyGenerator(req.ip)
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'Zu viele Anmeldeversuche',
    message: 'Bitte warten Sie 15 Minuten und versuchen Sie es erneut.',
    retryAfter: '15 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Vorher ohne keyGenerator -> Default req.ip -> ohne 'trust proxy' die Adresse des
  // vorgelagerten Proxys. Live gemessen: 4 Anmeldeversuche von EINER Leitung ergaben
  // 19, 18, 18, 17 — der Zaehler lief also nicht auf dem Kunden, sondern auf einem
  // wechselnden Proxy-Pool. Folge doppelt schlecht: echte Kunden teilen sich das
  // Kontingent, und die Versuche eines Angreifers verteilen sich ueber mehrere Toepfe.
  keyGenerator: clientAddressKey
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    error: 'Analyse-Limit erreicht',
    message: 'Sie haben das stuendliche Analyse-Limit erreicht.',
    retryAfter: '1 Stunde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // verifyToken.js setzt req.user.userId (JWT-Payload). req.user.id bleibt als
  // Fallback erhalten, req.ip ist Last-Resort. Vorher nur req.user?.id → fiel
  // immer auf req.ip zurück und zaehlte mehrere User hinter demselben Edge zusammen.
  keyGenerator: (req) => req.user?.userId || req.user?.id || ipKeyGenerator(req.ip)
});

const legalPulseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    error: 'Legal Pulse Limit erreicht',
    message: 'Zu viele Anfragen an Legal Pulse.',
    retryAfter: '15 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.user?.id || ipKeyGenerator(req.ip)
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    error: 'Upload-Limit erreicht',
    message: 'Sie haben das stuendliche Upload-Limit erreicht.',
    retryAfter: '1 Stunde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.user?.id || ipKeyGenerator(req.ip)
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Zu viele sensible Anfragen',
    message: 'Bitte warten Sie einige Minuten.',
    retryAfter: '15 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Alle 4 Verwendungen (cancellations.js:119/500/577/742) laufen HINTER verifyToken,
  // req.user.userId ist also da. Vorher ohne keyGenerator -> Default req.ip -> ohne
  // 'trust proxy' die Adresse des vorgelagerten Proxys -> 10 Kuendigungen pro 15 Min
  // fuer die GESAMTE Plattform. Identisch zu den 6 Nachbar-Limitern in dieser Datei.
  keyGenerator: (req) => req.user?.userId || req.user?.id || ipKeyGenerator(req.ip)
});

const sseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: 'Zu viele Stream-Verbindungen',
    message: 'Bitte warten Sie eine Minute.',
    retryAfter: '1 Minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.user?.id || ipKeyGenerator(req.ip)
});

function createDynamicLimiter(options) {
  const freeLimit = options.freeLimit;
  const premiumMultiplier = options.premiumMultiplier || 3;
  const windowMs = options.windowMs || 15 * 60 * 1000;
  
  return rateLimit({
    windowMs,
    max: (req) => {
      const plan = req.user?.subscriptionPlan?.toLowerCase() || 'free';
      const isPaidPlan = ['business', 'enterprise', 'legendary'].includes(plan);
      return isPaidPlan ? freeLimit * premiumMultiplier : freeLimit;
    },
    message: {
      error: 'Rate Limit erreicht',
      message: 'Premium-Nutzer haben hoehere Limits.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || req.user?.id || ipKeyGenerator(req.ip)
  });
}

function skipForPremium(req) {
  const plan = req.user?.subscriptionPlan?.toLowerCase() || 'free';
  return ['business', 'enterprise', 'legendary'].includes(plan);
}

// 🚪 Kontolöschung: EIGENER Zähler (20.08.2026)
//
// Vorher hing DELETE /api/auth/delete am sensitiveLimiter — und den teilen sich fünf
// Kündigungs-Routen in cancellations.js. Zehn Kündigungsschreiben in einer Viertelstunde
// hätten also verhindert, dass derselbe Nutzer danach sein Konto löschen kann.
// Das widerspricht dem Grundsatz des Löschdialogs (und Art. 17 DSGVO): informieren,
// niemals blockieren. Ein eigener Zähler entkoppelt beides; fünf Löschversuche in
// 15 Minuten sind für einen Einmalvorgang reichlich und bremsen Missbrauch trotzdem.
const accountDeletionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Zu viele Löschversuche',
    message: 'Bitte warten Sie einige Minuten.',
    retryAfter: '15 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.user?.id || ipKeyGenerator(req.ip)
});

// 03.09.2026 (Mail-Knopf-Fix): Limiter für die ÖFFENTLICHE Mail-Aktions-Route
// (GET Bestätigungsseite + POST Ausführung, routes/emailQuickAction.js). Die Route
// hat keine Session — Schlüssel ist die echte Client-Adresse (cf-connecting-ip,
// dieselbe Entscheidung wie bei der Drosselung: kein trust proxy). 30/15min reicht
// für jeden legitimen Mail-Klick und bremst Scans/Replay. Antwort als HTML, nicht
// JSON — die Route wird im Browser eines Mail-Empfängers geöffnet.
const mailActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientAddressKey,
  handler: (req, res) => {
    res.status(429)
      .set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      .send('<!doctype html><html lang="de"><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:40px;text-align:center;color:#0f172a;"><h2>Zu viele Anfragen</h2><p>Bitte warte ein paar Minuten und öffne den Link aus deiner E-Mail erneut.</p></body></html>');
  }
});

module.exports = {
  standardLimiter,
  authLimiter,
  analyzeLimiter,
  legalPulseLimiter,
  uploadLimiter,
  sensitiveLimiter,
  sseLimiter,
  accountDeletionLimiter,
  mailActionLimiter,
  createDynamicLimiter,
  skipForPremium
};

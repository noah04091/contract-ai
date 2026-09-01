// 📁 middleware/verifyToken.js
const jwt = require("jsonwebtoken");
const { isSessionTokenPayload } = require("../utils/tokenShape");

// 🔄 Konfiguration für Silent Token Refresh
const TOKEN_REFRESH_THRESHOLD_SECONDS = 30 * 60; // 30 Minuten vor Ablauf erneuern
const JWT_EXPIRES_IN = "2h";

// 🍪 Cookie-Optionen (gleiche wie in auth.js)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax',
  path: "/",
  maxAge: 1000 * 60 * 60 * 2, // 2 Stunden
  ...(process.env.NODE_ENV === 'production' && { domain: ".contract-ai.de" })
};

module.exports = function (req, res, next) {
  // ✅ SKIP JWT-Check für E-Mail-Import (nutzt API-Key stattdessen)
  // 🔒 23.08.2026 SICHERHEIT: NUR den Pfad prüfen, nicht die ganze URL. `req.originalUrl`
  // enthält den Query-String — `.includes()` ließ deshalb JEDE Adresse mit dem Anhängsel
  // `?x=/api/contracts/email-import` die Anmeldung KOMPLETT überspringen. Am Produktivsystem
  // belegt: GET /api/s3/view?key=…&x=/api/contracts/email-import → HTTP 200 ohne Token
  // (unauthentifizierter Datei-Download). Der legitime Weg ist AUSSCHLIESSLICH die exakte
  // Route POST /api/contracts/email-import (über eigenen API-Key abgesichert).
  const emailImportPfad = String(req.originalUrl || '').split('?')[0].split('#')[0];
  if (emailImportPfad === '/api/contracts/email-import' || emailImportPfad === '/api/contracts/email-import/') {
    console.log('⏩ E-Mail-Import Route: JWT-Check übersprungen (nutzt API-Key)');
    return next();
  }

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.log("🔍 Auth-Check:", req.originalUrl);
    console.log("🍪 Cookies:", req.cookies);
    console.log("🔐 Header:", req.headers.authorization);
  }

  let token = null;
  let source = null;

  // ✅ 1. Aus Cookie
  if (req.cookies?.token) {
    token = req.cookies.token;
    source = "cookie";
  }

  // ✅ 2. Aus Authorization Header (Bearer ...)
  else if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
    source = "header";
  }

  // 🔐 SICHERHEIT: Query-Parameter Token ENTFERNT
  // Token in URLs sind unsicher (Browser-History, Server-Logs, Referrer-Header)
  // Nur Cookie und Authorization Header sind sichere Methoden

  // ❌ Kein Token gefunden
  if (!token) {
    console.warn("❌ Kein Auth-Token gefunden (Cookie, Header) - Request:", req.originalUrl);
    return res.status(401).json({ message: "Nicht autorisiert – bitte einloggen." });
  }

  // ✅ Token prüfen
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔒 01.09.2026 (Kalender-Sync-Audit, Stufe 0): Nur echte Session-Tokens
    // (email + userId, kein type-Feld) gelten als Login. Vorher wurde JEDER mit
    // JWT_SECRET signierte Zweck-Token akzeptiert — der Kalender-Feed-Token
    // (365 Tage, liegt bei Google/Apple) und der Mail-Quick-Action-Token (7 Tage,
    // in jeder Erinnerungs-Mail) waren damit vollwertige Konto-Zugänge.
    // Antwort identisch zum Signatur-Fehler (kein Orakel für Angreifer).
    // Invariante + Beweis: utils/tokenShape.js.
    if (!isSessionTokenPayload(decoded)) {
      console.warn("❌ JWT abgelehnt: kein Session-Token (Zweck-Token als Login versucht)");
      return res.status(403).json({ error: "TOKEN_EXPIRED", message: "Sitzung abgelaufen oder ungültig. Bitte erneut einloggen." });
    }

    req.user = decoded;
    req.userId = decoded.userId; // 📁 For Mongoose routes
    req.tokenSource = source;

    // 🔄 SILENT TOKEN REFRESH: Prüfen ob Token bald abläuft
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;

    if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_SECONDS && timeUntilExpiry > 0) {
      // Token läuft bald ab → neuen Token erstellen
      const newToken = jwt.sign(
        { email: decoded.email, userId: decoded.userId },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Neuen Token als Cookie setzen (wenn ursprünglicher Token aus Cookie kam)
      if (source === "cookie") {
        res.cookie("token", newToken, COOKIE_OPTIONS);
      }

      // Neuen Token auch im Header senden (für Frontend)
      res.setHeader("X-Refreshed-Token", newToken);

      console.log(`🔄 Token erneuert für ${decoded.email} (${Math.round(timeUntilExpiry / 60)} Min. vor Ablauf)`);
    }

    if (isDev) console.log(`✅ Authentifiziert via ${source} – ${decoded.email}`);
    next();
  } catch (err) {
    console.error("❌ Ungültiger JWT:", err.message);
    return res.status(403).json({ error: "TOKEN_EXPIRED", message: "Sitzung abgelaufen oder ungültig. Bitte erneut einloggen." });
  }
};

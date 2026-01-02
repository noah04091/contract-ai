// 📁 middleware/verifyToken.js
const jwt = require("jsonwebtoken");

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
  if (req.originalUrl.includes('/api/contracts/email-import')) {
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
    return res.status(403).json({ message: "Sitzung abgelaufen oder ungültig. Bitte erneut einloggen." });
  }
};

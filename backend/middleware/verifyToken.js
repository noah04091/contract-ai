// 📁 middleware/verifyToken.js
const jwt = require("jsonwebtoken");

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
    if (isDev) console.log(`✅ Authentifiziert via ${source} – ${decoded.email}`);
    next();
  } catch (err) {
    console.error("❌ Ungültiger JWT:", err.message);
    return res.status(403).json({ message: "Sitzung abgelaufen oder ungültig. Bitte erneut einloggen." });
  }
};

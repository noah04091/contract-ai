// 📁 middleware/verifyToken.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Zusätzliche Debug-Ausgaben für Cookie-Probleme
  console.log("🍪 Cookie-Header:", req.headers.cookie);
  console.log("🍪 Alle Cookies:", req.cookies);
  console.log("🔑 Authorization-Header:", req.headers.authorization);
  
  // 1. Versuche zuerst, den Token aus dem Cookie zu lesen
  let token = req.cookies.token;
  
  // 2. Falls kein Cookie-Token, versuche es mit dem Authorization-Header
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log("🔄 Kein Cookie gefunden, verwende stattdessen Authorization-Header");
    }
  }
  
  // 3. Prüfe ob Fallback-Token im Query-Parameter vorhanden ist (optional)
  if (!token && req.query.token) {
    token = req.query.token;
    console.log("🔄 Verwende Token aus Query-Parameter als letzten Fallback");
  }

  if (!token) {
    console.log("❌ Kein Token gefunden (weder in Cookie, Header noch Query)");
    return res.status(401).json({ message: "❌ Kein Token gefunden. Bitte melde dich an." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔍 Debug-Ausgabe – kannst du nach erfolgreichem Test entfernen
    console.log("🔐 Token dekodiert:", decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ JWT-Verifizierung fehlgeschlagen:", err.message);
    return res.status(403).json({ message: "❌ Ungültiger Token" });
  }
};
// 📁 middleware/verifyToken.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Diagnose-Ausgaben
  console.log("🔍 Authentifizierungsanfrage für:", req.originalUrl);
  console.log("🍪 Cookie-Header:", req.headers.cookie);
  console.log("🍪 Alle Cookies:", req.cookies);
  console.log("🔑 Authorization-Header:", req.headers.authorization);
  
  // 1. Versuche zuerst, den Token aus dem Cookie zu lesen
  let token = req.cookies.token;
  let tokenSource = "cookie";
  
  // 2. Falls kein Cookie-Token, versuche es mit dem Authorization-Header
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      tokenSource = "header";
      console.log("🔄 Kein Cookie gefunden, verwende stattdessen Authorization-Header");
    }
  }
  
  // 3. Prüfe ob Fallback-Token im Query-Parameter vorhanden ist (optional)
  if (!token && req.query.token) {
    token = req.query.token;
    tokenSource = "query";
    console.log("🔄 Verwende Token aus Query-Parameter als letzten Fallback");
  }

  if (!token) {
    console.log("❌ Kein Token gefunden (weder in Cookie, Header noch Query)");
    return res.status(401).json({ message: "❌ Bitte logge dich ein, um fortzufahren." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Erfolg! Zeige an, welche Methode verwendet wurde
    console.log(`✅ Authentifizierung erfolgreich via ${tokenSource} für ${decoded.email}`);
    
    // Token in Request-Objekt speichern
    req.user = decoded;
    req.tokenSource = tokenSource;
    
    next();
  } catch (err) {
    console.error("❌ JWT-Verifizierung fehlgeschlagen:", err.message);
    return res.status(403).json({ 
      message: "❌ Deine Sitzung ist abgelaufen. Bitte logge dich erneut ein."
    });
  }
};
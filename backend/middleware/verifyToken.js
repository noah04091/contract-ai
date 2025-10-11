// 📁 middleware/verifyToken.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
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

  // ✅ 3. Fallback: Aus Query-Parameter (optional)
  else if (req.query?.token) {
    token = req.query.token;
    source = "query";
  }

  // ❌ Kein Token gefunden
  if (!token) {
    if (isDev) console.warn("❌ Kein Auth-Token gefunden (Cookie, Header, Query)");
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

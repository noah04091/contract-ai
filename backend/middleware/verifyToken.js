// 📁 middleware/verifyToken.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.cookies.token; // ⬅️ Cookie lesen statt Authorization-Header

  if (!token) {
    return res.status(401).json({ message: "❌ Kein Token im Cookie gefunden" });
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

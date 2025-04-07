// 📁 middleware/verifyToken.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "❌ Kein gültiger Authorization-Header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔍 Debug-Ausgabe – kannst du nach erfolgreichem Test wieder entfernen
    console.log("🔐 Token dekodiert:", decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ JWT-Verifizierung fehlgeschlagen:", err.message);
    return res.status(403).json({ message: "❌ Ungültiger Token" });
  }
};

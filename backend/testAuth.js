// 📁 backend/testAuth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// 🧪 Test-Login → Cookie setzen
router.post("/test-login", (req, res) => {
  const token = jwt.sign({ userId: "123", email: req.body.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    domain: ".contract-ai.de", // ⬅️ wichtig!
    maxAge: 3600000,
  });

  res.json({ message: "✅ Token gesetzt!" });
});

// 🧪 Test-/me → Cookie lesen
router.get("/test-me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "❌ Kein Token gefunden" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    res.status(403).json({ message: "❌ Token ungültig" });
  }
});

module.exports = router;

// 📁 backend/server-debug.js - Minimale Version zum Debuggen
const express = require("express");
const app = express();
require("dotenv").config();

const cookieParser = require("cookie-parser");
const cors = require("cors");

const ALLOWED_ORIGINS = [
  "https://contract-ai.de",
  "https://www.contract-ai.de",
];

// 🌍 Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`🚫 CORS blockiert: ${origin}`);
    callback(null, false);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// CORS Header ergänzen
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

// 🚀 SUPER EINFACHE TEST-ROUTE
app.post("/api/contracts/generate", (req, res) => {
  console.log("🎉 Generate-Route aufgerufen!");
  console.log("Request Body:", req.body);
  console.log("Headers:", req.headers);
  
  res.json({
    success: true,
    message: "✅ Route funktioniert!",
    receivedData: req.body,
    timestamp: new Date().toISOString(),
    contractText: "Das ist ein Test-Vertrag. Die Route funktioniert!"
  });
});

// 🧪 Debug-Route
app.get("/debug", (req, res) => {
  res.json({ 
    status: "Server läuft",
    timestamp: new Date().toISOString(),
    message: "Debug-Route funktioniert!"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 DEBUG-Server läuft auf Port ${PORT}`);
  console.log(`📡 Test-Route: POST /api/contracts/generate`);
  console.log(`📡 Debug-Route: GET /debug`);
  console.log(`✅ Server bereit für Tests!`);
});
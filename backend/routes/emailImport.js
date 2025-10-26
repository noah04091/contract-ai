// 📁 backend/routes/emailImport.js
// 📧 Separate Route für E-Mail-Import (OHNE JWT-Auth, nur API-Key)

const express = require("express");
const router = express.Router();

// Import der originalen Handler-Funktion aus contracts.js
// Wir delegieren einfach zum Haupt-Router
const contractsRouter = require("./contracts");

// Exportiere nur den contracts-Router (wird dann ohne verifyToken gemountet)
module.exports = contractsRouter;

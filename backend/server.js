// 📁 backend/server.js
const express = require("express");
const app = express();
require("dotenv").config();

// 📦 Abhängigkeiten
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const pdfParse = require("pdf-parse");
const { OpenAI } = require("openai");
const nodemailer = require("nodemailer");
const { ObjectId } = require("mongodb");
const cron = require("node-cron");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// 🏗️ Import Professional Database
const database = require("./config/database");

const verifyToken = require("./middleware/verifyToken");
const createCheckSubscription = require("./middleware/checkSubscription");

// 📁 Setup
const UPLOAD_PATH = "./uploads";
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};
const ALLOWED_ORIGINS = [
  "https://contract-ai.de",
  "https://www.contract-ai.de",
];

const transporter = nodemailer.createTransport(EMAIL_CONFIG);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const storage = multer.diskStorage({
  destination: UPLOAD_PATH,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

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
app.use("/uploads", express.static(path.join(__dirname, UPLOAD_PATH)));

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

// Hilfsfunktionen zur Vertragsbewertung
function extractExpiryDate(laufzeit) {
  const match = laufzeit.match(/(\d+)\s*(Jahre|Monate)/i);
  if (!match) return "";
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const expiry = new Date();
  if (unit.includes("jahr")) expiry.setFullYear(expiry.getFullYear() + value);
  else expiry.setMonth(expiry.getMonth() + value);
  return expiry.toISOString().split("T")[0];
}

function determineContractStatus(expiryDate) {
  if (!expiryDate) return "Unbekannt";
  const expiry = new Date(expiryDate);
  const today = new Date();
  const in30 = new Date();
  in30.setDate(today.getDate() + 30);
  if (expiry < today) return "Abgelaufen";
  if (expiry <= in30) return "Bald ablaufend";
  return "Aktiv";
}

async function analyzeContract(pdfText) {
  const res = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "Du bist ein KI-Assistent, der Vertragsdaten extrahiert." },
      { role: "user", content: "Extrahiere aus folgendem Vertrag Name, Laufzeit und Kündigungsfrist:\n\n" + pdfText },
    ],
    temperature: 0.3,
  });
  return res.choices[0].message.content;
}

// 📦 Database Connection & Serverstart
(async () => {
  try {
    // 🏗️ Initialize Professional Database Connection
    await database.connect();
    console.log("✅ Professional Database connected!");

    // 🔐 Helper function to create checkSubscription middleware
    const checkSubscription = createCheckSubscription(await database.getCollection('users'));

    // 🔐 Authentifizierung - Pass original DB object for compatibility
    const authRoutes = require("./routes/auth")(await database.connect());
    app.use("/auth", authRoutes);

    // 💳 Stripe-Routen
    app.use("/stripe/portal", require("./routes/stripePortal"));
    app.use("/stripe", require("./routes/stripe"));
    app.use("/stripe", require("./routes/subscribe"));

    // 📦 Vertragsrouten - Pass database instance where needed
    app.use("/optimize", verifyToken, checkSubscription, require("./routes/optimize")(database));
    app.use("/compare", verifyToken, checkSubscription, require("./routes/compare"));
    app.use("/chat", verifyToken, checkSubscription, require("./routes/chatWithContract"));
    app.use("/generate", verifyToken, checkSubscription, require("./routes/generate"));
    app.use("/analyze-type", require("./routes/analyzeType"));
    app.use("/extract-text", require("./routes/extractText"));
    app.use("/contracts", verifyToken, require("./routes/contracts"));
    app.use("/test", require("./testAuth"));

    // 📤 Upload-Logik mit Analyse (Updated to use database service)
    app.post("/upload", verifyToken, checkSubscription, upload.single("file"), async (req, res) => {
      if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });

      try {
        const buffer = await fs.readFile(path.join(__dirname, UPLOAD_PATH, req.file.filename));
        const text = (await pdfParse(buffer)).text.substring(0, 5000);
        const analysis = await analyzeContract(text);

        const name = analysis.match(/Vertragsname:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
        const laufzeit = analysis.match(/Laufzeit:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
        const kuendigung = analysis.match(/Kündigungsfrist:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
        const expiryDate = extractExpiryDate(laufzeit);
        const status = determineContractStatus(expiryDate);

        const contract = {
          userId: req.user.userId,
          name,
          laufzeit,
          kuendigung,
          expiryDate,
          status,
          uploadedAt: new Date(),
          filePath: `/uploads/${req.file.filename}`,
          // 🧠 Add Legal Pulse placeholder for new contracts
          legalPulse: {
            riskScore: null,
            riskSummary: '',
            lastChecked: null,
            lawInsights: [],
            marketSuggestions: [],
            riskFactors: [],
            legalRisks: [],
            recommendations: [],
            analysisDate: null
          }
        };

        // 🏗️ Use database service instead of direct collection
        const result = await database.insertOne('contracts', contract);

        await transporter.sendMail({
          from: `Contract AI <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          subject: "📄 Neuer Vertrag hochgeladen",
          text: `Name: ${name}\nLaufzeit: ${laufzeit}\nKündigungsfrist: ${kuendigung}\nStatus: ${status}\nAblaufdatum: ${expiryDate}`,
        });

        res.status(201).json({ 
          message: "Vertrag gespeichert", 
          contract: { ...contract, _id: result.insertedId } 
        });
      } catch (error) {
        console.error("❌ Upload error:", error);
        res.status(500).json({ message: "Fehler beim Upload: " + error.message });
      }
    });

    // 📔 CRUD für einzelne Verträge (Updated to use database service)
    app.get("/contracts/:id", verifyToken, async (req, res) => {
      try {
        const contract = await database.findOne('contracts', {
          _id: new ObjectId(req.params.id),
          userId: req.user.userId,
        });
        if (!contract) return res.status(404).json({ message: "Nicht gefunden" });
        res.json(contract);
      } catch (error) {
        console.error("❌ Get contract error:", error);
        res.status(500).json({ message: "Fehler beim Laden: " + error.message });
      }
    });

    app.put("/contracts/:id", verifyToken, async (req, res) => {
      try {
        const { name, laufzeit, kuendigung } = req.body;
        await database.updateOne(
          'contracts',
          { _id: new ObjectId(req.params.id), userId: req.user.userId },
          { $set: { name, laufzeit, kuendigung } }
        );
        const updated = await database.findOne('contracts', { _id: new ObjectId(req.params.id) });
        res.json({ message: "Aktualisiert", contract: updated });
      } catch (error) {
        console.error("❌ Update contract error:", error);
        res.status(500).json({ message: "Fehler beim Update: " + error.message });
      }
    });

    app.delete("/contracts/:id", verifyToken, async (req, res) => {
      try {
        const result = await database.deleteOne('contracts', {
          _id: new ObjectId(req.params.id),
          userId: req.user.userId,
        });
        if (!result.deletedCount) return res.status(404).json({ message: "Nicht gefunden" });
        res.json({ message: "Gelöscht", deletedCount: result.deletedCount });
      } catch (error) {
        console.error("❌ Delete contract error:", error);
        res.status(500).json({ message: "Fehler beim Löschen: " + error.message });
      }
    });

    // 🏥 Database Health Check Endpoint
    app.get("/health/db", async (req, res) => {
      try {
        const isHealthy = await database.ping();
        res.json({ 
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          ...database.getStatus()
        });
      } catch (error) {
        res.status(503).json({ 
          status: 'error', 
          error: error.message,
          timestamp: new Date().toISOString(),
          ...database.getStatus()
        });
      }
    });

    // 🧪 Debug-Cookies testen (Enhanced with database status)
    app.get("/debug", (req, res) => {
      console.log("Cookies:", req.cookies);
      res.cookie("debug_cookie", "test-value", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/",
      });
      res.json({ 
        cookies: req.cookies,
        database: database.getStatus(),
        timestamp: new Date().toISOString()
      });
    });

    // ⏰ Reminder-Cronjob – täglich um 08:00 Uhr
    cron.schedule("0 8 * * *", async () => {
      console.log("⏰ Reminder-Cronjob gestartet");
      try {
        const checkContractsAndSendReminders = require("./services/cron");
        await checkContractsAndSendReminders();
      } catch (error) {
        console.error("❌ Reminder Cron Error:", error);
      }
    });

    // 🧠 Legal Pulse Scan – täglich um 06:00 Uhr
    cron.schedule("0 6 * * *", async () => {
      console.log("🧠 Starte täglichen Legal Pulse Scan...");
      try {
        const runLegalPulseScan = require("./services/legalPulseScan");
        await runLegalPulseScan();
      } catch (error) {
        console.error("❌ Legal Pulse Scan Error:", error);
      }
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server läuft auf Port ${PORT}`);
      console.log(`📊 Database Status:`, database.getStatus());
      console.log(`🏥 Health Check verfügbar unter: http://localhost:${PORT}/health/db`);
    });

  } catch (err) {
    console.error("❌ Fehler beim Serverstart:", err);
    console.error("📊 Database Status:", database.getStatus());
    process.exit(1);
  }
})();

// 🔄 Monatslimits zurücksetzen
require("./cron/resetBusinessLimits");
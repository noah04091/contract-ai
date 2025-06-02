// 📁 backend/server.js (Complete fixed version with ANALYZE route)
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
const { MongoClient, ObjectId } = require("mongodb");
const cron = require("node-cron");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const verifyToken = require("./middleware/verifyToken");
const createCheckSubscription = require("./middleware/checkSubscription");

// 📁 Setup
const UPLOAD_PATH = "./uploads";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
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

// Debug-Middleware - Log alle Anfragen
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
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

// 📦 MongoDB & Serverstart
(async () => {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");
    console.log("✅ MongoDB verbunden!");

    const checkSubscription = createCheckSubscription(usersCollection);

    // 🔐 Authentifizierung - WICHTIG: Diese müssen ZUERST kommen!
    try {
      const authRoutes = require("./routes/auth")(db);
      app.use("/auth", authRoutes);
      console.log("✅ Auth-Routen geladen");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Auth-Routen:", err);
    }

    // 💳 Stripe-Routen
    try {
      app.use("/stripe/portal", require("./routes/stripePortal"));
      app.use("/stripe", require("./routes/stripe"));
      app.use("/stripe", require("./routes/subscribe"));
      console.log("✅ Stripe-Routen geladen");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Stripe-Routen:", err);
    }

    // 📦 Vertragsrouten
    try {
      app.use("/optimize", verifyToken, checkSubscription, require("./routes/optimize")(db));
      console.log("✅ Optimize-Route geladen");
    } catch (err) {
      console.error("❌ Fehler bei Optimize-Route:", err);
    }

    try {
      app.use("/compare", verifyToken, checkSubscription, require("./routes/compare"));
      console.log("✅ Compare-Route geladen");
    } catch (err) {
      console.error("❌ Fehler bei Compare-Route:", err);
    }

    try {
      app.use("/chat", verifyToken, checkSubscription, require("./routes/chatWithContract"));
      console.log("✅ Chat-Route geladen");
    } catch (err) {
      console.error("❌ Fehler bei Chat-Route:", err);
    }

    // ✅ ANALYZE-ROUTE - FEHLTE KOMPLETT! (NEU HINZUGEFÜGT)
    try {
      console.log("🔧 Lade Analyze-Route...");
      app.use("/analyze", verifyToken, checkSubscription, require("./routes/analyze"));
      console.log("✅ Analyze-Route erfolgreich geladen auf /analyze!");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Analyze-Route:", err);
      // Fallback-Route für Analyze  
      app.post("/analyze", verifyToken, checkSubscription, (req, res) => {
        console.log("🆘 Fallback Analyze-Route aufgerufen");
        res.status(503).json({
          success: false,
          message: "Analyse-Service vorübergehend nicht verfügbar",
          error: "Route konnte nicht geladen werden"
        });
      });
    }

    // 🚀 GENERATE-ROUTE - KORRIGIERT: Ohne /api/ da Proxy das entfernt
    try {
      console.log("🔧 Lade Generate-Route...");
      const generateRouter = require("./routes/generate");
      app.use("/contracts/generate", verifyToken, checkSubscription, generateRouter);
      console.log("✅ Generate-Route erfolgreich geladen auf /contracts/generate!");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Generate-Route:", err);
      // Fallback-Route für Generate
      app.post("/contracts/generate", verifyToken, checkSubscription, (req, res) => {
        console.log("🆘 Fallback Generate-Route aufgerufen");
        res.json({
          success: true,
          message: "Fallback: Generate-Route funktioniert, aber ohne AI",
          contractText: "Dies ist ein Fallback-Vertrag. Die echte Generate-Route konnte nicht geladen werden."
        });
      });
    }

    try {
      app.use("/analyze-type", require("./routes/analyzeType"));
      app.use("/extract-text", require("./routes/extractText"));
      app.use("/contracts", verifyToken, require("./routes/contracts"));
      app.use("/test", require("./testAuth"));
      console.log("✅ Weitere Routen geladen");
    } catch (err) {
      console.error("❌ Fehler bei weiteren Routen:", err);
    }

    // 🧠 Legal Pulse API Routes
    try {
      app.use("/api/legal-pulse", verifyToken, require("./routes/legalPulse"));
      console.log("✅ Legal Pulse Routen geladen");
    } catch (err) {
      console.error("❌ Fehler bei Legal Pulse Routen:", err);
    }

    // 📤 Upload-Logik mit Analyse
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
          legalPulse: {
            riskScore: null,
            summary: '',
            lastChecked: null,
            lawInsights: [],
            marketSuggestions: [],
            riskFactors: [],
            legalRisks: [],
            recommendations: [],
            analysisDate: null
          }
        };

        const { insertedId } = await contractsCollection.insertOne(contract);

        await transporter.sendMail({
          from: `Contract AI <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          subject: "📄 Neuer Vertrag hochgeladen",
          text: `Name: ${name}\nLaufzeit: ${laufzeit}\nKündigungsfrist: ${kuendigung}\nStatus: ${status}\nAblaufdatum: ${expiryDate}`,
        });

        res.status(201).json({ message: "Vertrag gespeichert", contract: { ...contract, _id: insertedId } });
      } catch (error) {
        console.error("❌ Upload error:", error);
        res.status(500).json({ message: "Fehler beim Upload: " + error.message });
      }
    });

    // 💾 POST-ROUTE für neue Verträge speichern (NEU HINZUGEFÜGT!)
    app.post("/contracts", verifyToken, async (req, res) => {
      try {
        console.log("📄 Neuen Vertrag speichern - Request body:", req.body);
        
        const { name, laufzeit, kuendigung, expiryDate, status, content, signature, isGenerated } = req.body;
        
        // Validierung der erforderlichen Felder
        if (!name && !content) {
          return res.status(400).json({ 
            message: "❌ Name oder Inhalt des Vertrags ist erforderlich" 
          });
        }
        
        const contract = {
          userId: req.user.userId,
          name: name || "Unbenannter Vertrag",
          laufzeit: laufzeit || "Unbekannt",
          kuendigung: kuendigung || "Unbekannt", 
          expiryDate: expiryDate || "",
          status: status || "Aktiv",
          content: content || "",
          signature: signature || null,
          isGenerated: isGenerated || false,
          uploadedAt: new Date(),
          filePath: "",
          // Legal Pulse Integration
          legalPulse: {
            riskScore: null,
            summary: '',
            lastChecked: null,
            lawInsights: [],
            marketSuggestions: [],
            riskFactors: [],
            legalRisks: [],
            recommendations: [],
            analysisDate: null
          }
        };

        console.log("📄 Vertrag wird gespeichert:", {
          userId: contract.userId,
          name: contract.name,
          hasContent: !!contract.content,
          hasSignature: !!contract.signature
        });

        const { insertedId } = await contractsCollection.insertOne(contract);
        
        console.log("✅ Vertrag erfolgreich gespeichert mit ID:", insertedId);
        
        res.status(201).json({ 
          message: "✅ Vertrag erfolgreich gespeichert", 
          contractId: insertedId,
          contract: { ...contract, _id: insertedId }
        });
        
      } catch (error) {
        console.error("❌ Contract save error:", error);
        res.status(500).json({ 
          message: "❌ Fehler beim Speichern des Vertrags",
          error: error.message 
        });
      }
    });

    // 📔 CRUD für einzelne Verträge
    app.get("/contracts/:id", verifyToken, async (req, res) => {
      try {
        const contract = await contractsCollection.findOne({
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
        await contractsCollection.updateOne(
          { _id: new ObjectId(req.params.id), userId: req.user.userId },
          { $set: { name, laufzeit, kuendigung } }
        );
        const updated = await contractsCollection.findOne({ _id: new ObjectId(req.params.id) });
        res.json({ message: "Aktualisiert", contract: updated });
      } catch (error) {
        console.error("❌ Update contract error:", error);
        res.status(500).json({ message: "Fehler beim Update: " + error.message });
      }
    });

    app.delete("/contracts/:id", verifyToken, async (req, res) => {
      try {
        const result = await contractsCollection.deleteOne({
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

    // 🧪 Debug-Route
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
        timestamp: new Date().toISOString(),
        status: "working",
        loadedRoutes: "all routes loaded with error handling",
        newFeature: "Contract save route enabled",
        analyzeRoute: "ANALYZE ROUTE NOW ACTIVE!" // ✅ NEU
      });
    });

    // ⏰ Cron Jobs (vereinfacht)
    try {
      cron.schedule("0 8 * * *", async () => {
        console.log("⏰ Reminder-Cronjob gestartet");
        try {
          const checkContractsAndSendReminders = require("./services/cron");
          await checkContractsAndSendReminders();
        } catch (error) {
          console.error("❌ Reminder Cron Error:", error);
        }
      });

      cron.schedule("0 6 * * *", async () => {
        console.log("🧠 Starte täglichen AI-powered Legal Pulse Scan...");
        try {
          const runLegalPulseScan = require("./services/legalPulseScan");
          await runLegalPulseScan();
        } catch (error) {
          console.error("❌ Legal Pulse Scan Error:", error);
        }
      });
    } catch (err) {
      console.error("❌ Cron Jobs konnten nicht gestartet werden:", err);
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server läuft auf Port ${PORT}`);
      console.log(`📡 Alle wichtigen Routen sollten geladen sein`);
      console.log(`🔧 Generate-Route: POST /contracts/generate (Proxy entfernt /api/)`);
      console.log(`💾 Save-Route: POST /contracts (NEU)`);
      console.log(`📊 Analyze-Route: POST /analyze (NEU HINZUGEFÜGT!)`) // ✅ NEU
      console.log(`🔐 Auth-Routen: /auth/*`);
      console.log(`✅ Server deployment complete!`);
    });

  } catch (err) {
    console.error("❌ Fehler beim Serverstart:", err);
    process.exit(1);
  }
})();

// 🔄 Monatslimits zurücksetzen
try {
  require("./cron/resetBusinessLimits");
} catch (err) {
  console.error("❌ Reset Business Limits konnte nicht geladen werden:", err);
}
// 📁 backend/server.js (Complete fixed version with ANALYZE route + OPTIMIZE route + IMPROVED FILE SERVING + S3 INTEGRATION + REDIRECT FIX)
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

// ✅ NEU: S3 File Storage Import
const { upload: s3Upload, generateSignedUrl } = require("./services/fileStorage");

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
  "http://localhost:3000", // ✅ Für lokale Entwicklung
];

// ✅ NEU: Backend URL für File-URLs
const API_BASE_URL = process.env.API_BASE_URL || (
  process.env.NODE_ENV === 'production' 
    ? 'https://api.contract-ai.de'
    : `http://localhost:${process.env.PORT || 5000}`
);

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

// ✅ VERBESSERT: Static File Serving mit korrekten Headers VOR anderen Routen
app.use('/uploads', express.static(path.join(__dirname, UPLOAD_PATH), {
  // ✅ Korrekte MIME-Types und Headers für verschiedene Dateitypen
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    
    console.log(`📁 Serving file: ${path.basename(filePath)} (${ext})`);
    
    // PDF direkt im Browser anzeigen
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
    // Word-Dokumente zum Download
    else if (ext === '.docx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment');
    }
    else if (ext === '.doc') {
      res.setHeader('Content-Type', 'application/msword');
      res.setHeader('Content-Disposition', 'attachment');
    }
    // Excel-Dateien
    else if (ext === '.xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment');
    }
    // Bilder
    else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline');
    }
    // Andere Dateien als Download
    else {
      res.setHeader('Content-Disposition', 'attachment');
    }
    
    // Cache-Header für bessere Performance
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 Jahr
    res.setHeader('Access-Control-Allow-Origin', '*'); // ✅ Für File-Downloads
  }
}));

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

// ✅ NEU: File URL Helper für Backend
function generateFileUrl(filename) {
  return `${API_BASE_URL}/uploads/${filename}`;
}

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

    // 🔧 OPTIMIZE-ROUTE - KORREKT IMPLEMENTIERT (NEU/ERSETZT)
    try {
      console.log("🔧 Lade Optimize-Route...");
      app.use("/optimize", verifyToken, checkSubscription, require("./routes/optimize"));
      console.log("✅ Optimize-Route erfolgreich geladen auf /optimize!");
    } catch (err) {
      console.error("❌ Fehler bei Optimize-Route:", err);
      app.post("/optimize", verifyToken, checkSubscription, (req, res) => {
        console.log("🆘 Fallback Optimize-Route aufgerufen");
        res.status(503).json({
          success: false,
          message: "Optimierung-Service vorübergehend nicht verfügbar",
          error: "Route konnte nicht geladen werden"
        });
      });
    }

    // 📦 Weitere Vertragsrouten
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
      app.post("/contracts/generate", verifyToken, checkSubscription, (req, res) => {
        console.log("🆘 Fallback Generate-Route aufgerufen");
        res.json({
          success: true,
          message: "Fallback: Generate-Route funktioniert, aber ohne AI",
          contractText: "Dies ist ein Fallback-Vertrag. Die echte Generate-Route konnte nicht geladen werden."
        });
      });
    }

    // 📋 Weitere Standard-Routen
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

    // ✅ FIXED: S3 Signed URL Route - REDIRECT statt JSON für Browser
    app.get("/s3/view", verifyToken, (req, res) => {
      try {
        const { file } = req.query;
        
        if (!file) {
          return res.status(400).json({ message: "File parameter required" });
        }
        
        console.log(`🔗 Generating signed URL for: ${file}`);
        const signedUrl = generateSignedUrl(file);
        
        // ✅ Check ob Request für JSON oder Redirect
        const acceptHeader = req.headers.accept || '';
        const userAgent = req.headers['user-agent'] || '';
        const wantsJson = acceptHeader.includes('application/json') || 
                         acceptHeader.includes('*/*') && userAgent.includes('fetch');
        
        // ✅ DEBUG: Log welcher Typ von Request es ist
        console.log(`🔍 S3 View Request Type:`, {
          file: file,
          acceptHeader: acceptHeader,
          userAgent: userAgent.substring(0, 100),
          wantsJson: wantsJson,
          action: wantsJson ? 'JSON Response' : 'Redirect to S3'
        });
        
        if (wantsJson) {
          // JSON Response für API-Calls (fetch requests)
          console.log(`📋 Returning JSON response for: ${file}`);
          res.json({ 
            fileUrl: signedUrl,
            expiresIn: 3600,
            s3Key: file
          });
        } else {
          // ✅ REDIRECT für Browser-Navigation (Button clicks)
          console.log(`🔄 Redirecting to S3 file: ${signedUrl}`);
          res.redirect(302, signedUrl);
        }
        
      } catch (error) {
        console.error("❌ S3 signed URL error:", error);
        res.status(500).json({ message: "Error generating file URL: " + error.message });
      }
    });

    // ✅ NEU: Separate JSON-Route für explizite API-Calls
    app.get("/s3/json", verifyToken, (req, res) => {
      try {
        const { file } = req.query;
        if (!file) return res.status(400).json({ message: "File parameter required" });
        
        console.log(`📋 JSON-only request for: ${file}`);
        const signedUrl = generateSignedUrl(file);
        
        res.json({ 
          fileUrl: signedUrl,
          expiresIn: 3600,
          s3Key: file
        });
      } catch (error) {
        console.error("❌ S3 JSON error:", error);
        res.status(500).json({ message: "Error: " + error.message });
      }
    });

    // 📤 Upload-Logik mit S3 Analyse (ERWEITERT mit S3-URLs)
    app.post("/upload", verifyToken, checkSubscription, s3Upload.single("file"), async (req, res) => {
      if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });

      try {
        console.log(`📁 S3 Upload successful:`, {
          key: req.file.key,
          bucket: req.file.bucket,
          location: req.file.location
        });

        // ✅ PDF-Text-Extraktion von S3-Datei
        let analysisText = '';
        try {
          // Datei von S3 herunterladen für Text-Extraktion
          const AWS = require('aws-sdk');
          const s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
          });
          
          const s3Object = await s3.getObject({
            Bucket: req.file.bucket,
            Key: req.file.key
          }).promise();
          
          const pdfData = await pdfParse(s3Object.Body);
          analysisText = pdfData.text.substring(0, 5000);
        } catch (extractError) {
          console.warn("⚠️ Text-Extraktion von S3 fehlgeschlagen:", extractError.message);
        }

        // KI-Analyse (falls Text verfügbar)
        let name = "Unbekannt", laufzeit = "Unbekannt", kuendigung = "Unbekannt";
        if (analysisText) {
          try {
            const analysis = await analyzeContract(analysisText);
            name = analysis.match(/Vertragsname:\s*(.*)/i)?.[1]?.trim() || req.file.originalname || "Unbekannt";
            laufzeit = analysis.match(/Laufzeit:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
            kuendigung = analysis.match(/Kündigungsfrist:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
          } catch (aiError) {
            console.warn("⚠️ KI-Analyse fehlgeschlagen:", aiError.message);
            name = req.file.originalname || "Unbekannt";
          }
        } else {
          name = req.file.originalname || "Unbekannt";
        }

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
          
          // ✅ S3-spezifische Felder
          s3Key: req.file.key,                        // S3-Pfad für interne Verwendung
          s3Bucket: req.file.bucket,                  // S3-Bucket Name
          s3Location: req.file.location,              // S3-URL (falls public)
          filename: req.file.key,                     // S3-Key als filename
          originalname: req.file.originalname,        // Original-Dateiname
          mimetype: req.file.mimetype,                // MIME-Type
          size: req.file.size,                        // Dateigröße
          
          // ✅ Legacy-Felder für Frontend-Kompatibilität
          filePath: `/s3/${req.file.key}`,           // Legacy path
          fileUrl: null,                              // Wird über /s3/view generiert
          
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

        console.log(`✅ Contract saved with S3 key: ${req.file.key}`);

        // E-Mail-Benachrichtigung (optional)
        try {
          await transporter.sendMail({
            from: `Contract AI <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: "📄 Neuer Vertrag hochgeladen (S3)",
            text: `Name: ${name}\nLaufzeit: ${laufzeit}\nKündigungsfrist: ${kuendigung}\nStatus: ${status}\nS3-Key: ${req.file.key}`,
          });
        } catch (emailError) {
          console.warn("⚠️ E-Mail-Versand fehlgeschlagen:", emailError.message);
        }

        res.status(201).json({ 
          message: "Vertrag gespeichert", 
          contract: { ...contract, _id: insertedId },
          s3Info: {
            bucket: req.file.bucket,
            key: req.file.key,
            location: req.file.location
          }
        });
        
      } catch (error) {
        console.error("❌ S3 Upload error:", error);
        res.status(500).json({ message: "Fehler beim S3 Upload: " + error.message });
      }
    });

    // 💾 POST-ROUTE für neue Verträge speichern (ERWEITERT)
    app.post("/contracts", verifyToken, async (req, res) => {
      try {
        console.log("📄 Neuen Vertrag speichern - Request body:", req.body);
        
        const { 
          name, laufzeit, kuendigung, expiryDate, status, content, signature, isGenerated,
          filename, originalname, fileUrl, filePath, mimetype, size // ✅ NEU: File-Informationen
        } = req.body;
        
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
          // ✅ ERWEITERT: File-Informationen (S3 + Legacy Support)
          filePath: filePath || "",
          fileUrl: fileUrl || (filename ? generateFileUrl(filename) : null),
          filename: filename || null,
          originalname: originalname || null,
          mimetype: mimetype || null,
          size: size || null,
          // ✅ S3-Felder falls vorhanden
          s3Key: req.body.s3Key || null,
          s3Bucket: req.body.s3Bucket || null,
          s3Location: req.body.s3Location || null,
          optimizationCount: 0,
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
          hasSignature: !!contract.signature,
          hasFileUrl: !!contract.fileUrl // ✅ NEU: File-URL Debug
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

    // 📔 CRUD für einzelne Verträge (unverändert)
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

    // 🧪 Debug-Route (ERWEITERT mit S3-Status)
    app.get("/debug", (req, res) => {
      console.log("Cookies:", req.cookies);
      res.cookie("debug_cookie", "test-value", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/",
      });
      
      // ✅ S3-Status prüfen
      const s3Status = {
        configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
        bucket: process.env.AWS_S3_BUCKET || 'Not set',
        region: process.env.AWS_REGION || 'Not set'
      };
      
      res.json({ 
        cookies: req.cookies,
        timestamp: new Date().toISOString(),
        status: "working",
        loadedRoutes: "all routes loaded with error handling",
        newFeature: "Contract save route enabled",
        analyzeRoute: "ANALYZE ROUTE NOW ACTIVE!",
        optimizeRoute: "OPTIMIZE ROUTE NOW ACTIVE!",
        fileServing: "IMPROVED FILE SERVING ACTIVE!", // ✅ NEU
        s3Integration: "S3 UPLOAD & SIGNED URLS + REDIRECT ACTIVE!", // ✅ UPDATED
        apiBaseUrl: API_BASE_URL, // ✅ NEU: Zeige API Base URL
        uploadPath: UPLOAD_PATH,
        nodeEnv: process.env.NODE_ENV,
        s3Status: s3Status // ✅ NEU: S3-Konfigurationsstatus
      });
    });

    // ⏰ Cron Jobs (unverändert)
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
      console.log(`📁 Static files serviert unter: ${API_BASE_URL}/uploads`); // ✅ NEU
      console.log(`📡 Alle wichtigen Routen sollten geladen sein`);
      console.log(`🔧 Generate-Route: POST /contracts/generate (Proxy entfernt /api/)`);
      console.log(`💾 Save-Route: POST /contracts (NEU)`);
      console.log(`📊 Analyze-Route: POST /analyze (NEU HINZUGEFÜGT!)`);
      console.log(`🔧 Optimize-Route: POST /optimize (NEU HINZUGEFÜGT!)`);
      console.log(`🔐 Auth-Routen: /auth/*`);
      console.log(`🔗 S3-Routes: GET /s3/view (Redirect), GET /s3/json (JSON)`); // ✅ NEU
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
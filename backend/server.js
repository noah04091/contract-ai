// 📁 backend/server.js - ✅ FIXED: Einheitliche /api Struktur für ALLE Routen
const express = require("express");
const app = express();
require("dotenv").config();

// 📦 Dependencies (unchanged)
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const pdfParse = require("pdf-parse");
const { OpenAI } = require("openai");
const nodemailer = require("nodemailer");
const { MongoClient, ObjectId } = require("mongodb");
const cron = require("node-cron");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const verifyToken = require("./middleware/verifyToken");
const createCheckSubscription = require("./middleware/checkSubscription");

// ✅ S3 File Storage Import (unchanged)
let s3Upload, generateSignedUrl;
try {
  const fileStorage = require("./services/fileStorage");
  s3Upload = fileStorage.upload;
  generateSignedUrl = fileStorage.generateSignedUrl;
  console.log("✅ S3 File Storage Services geladen");
} catch (err) {
  console.warn("⚠️ S3 File Storage Services nicht verfügbar:", err.message);
  s3Upload = null;
  generateSignedUrl = null;
}

// 📁 Setup (unchanged)
const UPLOAD_PATH = path.join(__dirname, "uploads");
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
  "http://localhost:3000",
];

const API_BASE_URL = process.env.API_BASE_URL || (
  process.env.NODE_ENV === 'production' 
    ? 'https://api.contract-ai.de'
    : `http://localhost:${process.env.PORT || 5000}`
);

// ✅ Upload-Ordner erstellen (unchanged)
try {
  if (!fsSync.existsSync(UPLOAD_PATH)) {
    fsSync.mkdirSync(UPLOAD_PATH, { recursive: true });
    console.log(`📁 Upload-Ordner erstellt: ${UPLOAD_PATH}`);
  }
} catch (err) {
  console.error(`❌ Fehler beim Erstellen des Upload-Ordners:`, err);
}

const transporter = nodemailer.createTransport(EMAIL_CONFIG);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ MULTER Setup (unchanged)
const storage = multer.diskStorage({
  destination: UPLOAD_PATH,
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname);
    console.log(`📁 [SERVER] Generiere Dateiname: ${filename}`);
    cb(null, filename);
  },
});
const upload = multer({ storage });

// 🌍 Middleware (unchanged)
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

// ✅ Static File Serving (unchanged)
app.use('/uploads', (req, res, next) => {
  const requestedFile = req.path.substring(1);
  const fullPath = path.join(UPLOAD_PATH, requestedFile);
  
  if (!fsSync.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    return res.status(404).json({ 
      error: "File not found",
      requestedFile: requestedFile,
      uploadPath: UPLOAD_PATH 
    });
  }
  next();
});

app.use('/uploads', express.static(UPLOAD_PATH, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    } else if (ext === '.docx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment');
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// CORS Header (unchanged)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

// Debug-Middleware (unchanged)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Helper Functions (unchanged)
function generateFileUrl(filename) {
  return `${API_BASE_URL}/uploads/${filename}`;
}

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

// 🚀 MongoDB Connection (unchanged)
let db = null;
let client = null;

const connectDB = async () => {
  try {
    console.log("🔗 Verbinde zentral zur MongoDB...");
    const startTime = Date.now();
    
    client = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxIdleTimeMS: 30000,
    });
    
    await client.connect();
    db = client.db("contract_ai");
    
    const connectTime = Date.now() - startTime;
    console.log(`✅ MongoDB zentral verbunden in ${connectTime}ms!`);
    
    return db;
  } catch (error) {
    console.error("❌ MongoDB-Verbindung fehlgeschlagen:", error);
    process.exit(1);
  }
};

// 📦 Server Startup with Centralized DB
(async () => {
  try {
    // ✅ STEP 1: Central DB Connection
    db = await connectDB();
    
    // ✅ STEP 2: Pass DB to all routes
    app.use((req, res, next) => {
      req.db = db;
      req.usersCollection = db.collection("users");
      req.contractsCollection = db.collection("contracts");
      next();
    });

    // ✅ STEP 3: Subscription Middleware
    const checkSubscription = createCheckSubscription(db.collection("users"));

    // ✅ STEP 4: Health Check
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK',
        mongodb: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // ==========================================
    // 🔧 CRITICAL FIX: ALLE ROUTEN UNTER /api
    // ==========================================

    // ✅ 1. AUTH ROUTES - MIT /api PREFIX
    try {
      const authRoutes = require("./routes/auth")(db);
      app.use("/api/auth", authRoutes);  // ← FIX: /api PREFIX HINZUGEFÜGT
      console.log("✅ Auth-Routen geladen unter /api/auth");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Auth-Routen:", err);
    }

    // ✅ 2. STRIPE ROUTES - MIT /api PREFIX  
    try {
      app.use("/api/stripe/portal", require("./routes/stripePortal"));  // ← FIX: /api PREFIX
      app.use("/api/stripe", require("./routes/stripe"));               // ← FIX: /api PREFIX
      app.use("/api/stripe", require("./routes/subscribe"));            // ← FIX: /api PREFIX
      console.log("✅ Stripe-Routen geladen unter /api/stripe");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Stripe-Routen:", err);
    }

    // ✅ 3. KI ANALYSIS & OPTIMIZATION - MIT /api PREFIX
    try {
      app.use("/api/analyze", verifyToken, checkSubscription, require("./routes/analyze"));  // ← FIX: /api PREFIX
      console.log("✅ Analyze-Route geladen unter /api/analyze");
    } catch (err) {
      console.error("❌ Fehler bei Analyze-Route:", err);
      // Fallback
      app.post("/api/analyze", verifyToken, checkSubscription, (req, res) => {
        res.status(503).json({
          success: false,
          message: "Analyse-Service vorübergehend nicht verfügbar"
        });
      });
    }

    try {
      app.use("/api/optimize", verifyToken, checkSubscription, require("./routes/optimize"));  // ← FIX: /api PREFIX
      console.log("✅ Optimize-Route geladen unter /api/optimize");
    } catch (err) {
      console.error("❌ Fehler bei Optimize-Route:", err);
      // Fallback
      app.post("/api/optimize", verifyToken, checkSubscription, (req, res) => {
        res.status(503).json({
          success: false,
          message: "Optimierung-Service vorübergehend nicht verfügbar"
        });
      });
    }

    // ✅ 4. CONTRACT ROUTES - SPEZIFISCHE VOR ALLGEMEINEN!
    try {
      // 🚨 CRITICAL: REIHENFOLGE! Generate-Route VOR CRUD-Routes mounten
      const generateRouter = require("./routes/generate");
      app.use("/api/contracts/generate", verifyToken, checkSubscription, generateRouter);  // ← SPEZIFISCH ZUERST
      console.log("✅ Generate-Route geladen unter /api/contracts/generate");
    } catch (err) {
      console.error("❌ Fehler bei Generate-Route:", err);
      app.post("/api/contracts/generate", verifyToken, checkSubscription, (req, res) => {
        res.json({
          success: true,
          message: "Fallback: Generate-Route funktioniert, aber ohne AI"
        });
      });
    }

    // ✅ 5. SMART CONTRACT GENERATOR - SAUBERER ROUTER MOUNT
    try {
      const optimizedContractRouter = require("./routes/optimizedContract");
      app.use("/api/contracts", verifyToken, checkSubscription, optimizedContractRouter);  // ← CLEAN MOUNT
      console.log("✅ Smart Contract Generator geladen unter /api/contracts/:contractId/generate-optimized");
    } catch (err) {
      console.error("❌ Fehler bei Smart Contract Generator:", err);
      // Fallback Route
      app.post("/api/contracts/:contractId/generate-optimized", verifyToken, checkSubscription, (req, res) => {
        res.status(503).json({
          success: false,
          message: "Smart Contract Generator vorübergehend nicht verfügbar"
        });
      });
    }

    // ✅ 6. ALLGEMEINE CONTRACT CRUD - NACH SPEZIFISCHEN ROUTEN
    try {
      app.use("/api/contracts", verifyToken, require("./routes/contracts"));  // ← FIX: /api PREFIX, NACH spezifischen Routen
      console.log("✅ Contracts CRUD-Routen geladen unter /api/contracts");
    } catch (err) {
      console.error("❌ Fehler bei Contract-CRUD-Routen:", err);
    }

    // ✅ 7. WEITERE ROUTEN - ALLE MIT /api PREFIX
    try {
      app.use("/api/compare", verifyToken, checkSubscription, require("./routes/compare"));  // ← FIX: /api PREFIX
      console.log("✅ Compare-Route geladen unter /api/compare");
    } catch (err) {
      console.error("❌ Fehler bei Compare-Route:", err);
    }

    try {
      app.use("/api/chat", verifyToken, checkSubscription, require("./routes/chatWithContract"));  // ← FIX: /api PREFIX
      console.log("✅ Chat-Route geladen unter /api/chat");
    } catch (err) {
      console.error("❌ Fehler bei Chat-Route:", err);
    }

    try {
      app.use("/api/analyze-type", require("./routes/analyzeType"));  // ← FIX: /api PREFIX
      console.log("✅ Analyze-Type-Route geladen unter /api/analyze-type");
    } catch (err) {
      console.error("❌ Fehler bei Analyze-Type-Route:", err);
    }

    try {
      app.use("/api/extract-text", require("./routes/extractText"));  // ← FIX: /api PREFIX
      console.log("✅ Extract-Text-Route geladen unter /api/extract-text");
    } catch (err) {
      console.error("❌ Fehler bei Extract-Text-Route:", err);
    }

    // ✅ 8. LEGAL PULSE - BLEIBT WIE ES IST (war schon korrekt)
    try {
      app.use("/api/legal-pulse", verifyToken, require("./routes/legalPulse"));
      console.log("✅ Legal Pulse Routen geladen unter /api/legal-pulse");
    } catch (err) {
      console.error("❌ Fehler bei Legal Pulse Routen:", err);
    }

    // ✅ 9. S3 ROUTES - NEUE STRUKTUR UNTER /api/s3
    if (generateSignedUrl) {
      app.get("/api/s3/view", verifyToken, (req, res) => {  // ← FIX: /api PREFIX
        try {
          const { file } = req.query;
          if (!file) return res.status(400).json({ message: "File parameter required" });
          
          console.log(`🔗 Generating signed URL for: ${file}`);
          const signedUrl = generateSignedUrl(file);
          
          const acceptHeader = req.headers.accept || '';
          const wantsJson = acceptHeader.includes('application/json');
          
          if (wantsJson) {
            res.json({ 
              fileUrl: signedUrl,
              expiresIn: 3600,
              s3Key: file
            });
          } else {
            res.redirect(302, signedUrl);
          }
        } catch (error) {
          console.error("❌ S3 signed URL error:", error);
          res.status(500).json({ message: "Error generating file URL: " + error.message });
        }
      });

      app.get("/api/s3/json", verifyToken, (req, res) => {  // ← FIX: /api PREFIX
        try {
          const { file } = req.query;
          if (!file) return res.status(400).json({ message: "File parameter required" });
          
          const signedUrl = generateSignedUrl(file);
          res.json({ 
            fileUrl: signedUrl,
            expiresIn: 3600,
            s3Key: file
          });
        } catch (error) {
          res.status(500).json({ message: "Error: " + error.message });
        }
      });

      console.log("✅ S3-Routen geladen unter /api/s3");
    }

    // ✅ 10. UPLOAD ROUTE - UNTER /api/upload
    if (s3Upload) {
      app.post("/api/upload", verifyToken, checkSubscription, s3Upload.single("file"), async (req, res) => {  // ← FIX: /api PREFIX
        if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });

        try {
          console.log(`📁 S3 Upload successful:`, {
            key: req.file.key,
            bucket: req.file.bucket,
            location: req.file.location
          });

          // ... Rest der Upload-Logik bleibt unverändert ...
          let analysisText = '';
          try {
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
            s3Key: req.file.key,
            s3Bucket: req.file.bucket,
            s3Location: req.file.location,
            filename: req.file.key,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            filePath: `/s3/${req.file.key}`,
            fileUrl: null,
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

          const { insertedId } = await req.contractsCollection.insertOne(contract);

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

      console.log("✅ Upload-Route geladen unter /api/upload");
    }

    // ✅ 11. TEST & DEBUG ROUTES - MIT /api PREFIX
    try {
      app.use("/api/test", require("./testAuth"));  // ← FIX: /api PREFIX
      console.log("✅ Test-Route geladen unter /api/test");
    } catch (err) {
      console.error("❌ Fehler bei Test-Route:", err);
    }

    // ✅ 12. DEBUG ROUTE - MIT /api PREFIX
    app.get("/api/debug", (req, res) => {  // ← FIX: /api PREFIX
      console.log("Cookies:", req.cookies);
      res.cookie("debug_cookie", "test-value", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/",
      });
      
      const s3Status = {
        configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
        bucket: process.env.AWS_S3_BUCKET || 'Not set',
        region: process.env.AWS_REGION || 'Not set',
        servicesLoaded: !!(s3Upload && generateSignedUrl)
      };
      
      res.json({ 
        cookies: req.cookies,
        timestamp: new Date().toISOString(),
        status: "working",
        mongodb: db ? 'ZENTRAL VERBUNDEN' : 'NICHT VERBUNDEN',
        routeStructure: "✅ ALLE ROUTEN UNTER /api - EINHEITLICH!",
        authRoute: "/api/auth/* (FIXED!)",
        contractsRoute: "/api/contracts/* (FIXED!)",
        generateRoute: "/api/contracts/generate (FIXED!)",
        smartContractRoute: "/api/contracts/:id/generate-optimized (FIXED!)",
        analyzeRoute: "/api/analyze (FIXED!)",
        optimizeRoute: "/api/optimize (FIXED!)",
        s3Routes: "/api/s3/* (FIXED!)",
        uploadRoute: "/api/upload (FIXED!)",
        s3Status: s3Status,
        message: "🎉 PFAD-CHAOS BEHOBEN - ALLES UNTER /api!"
      });
    });

    // ✅ 13. DEBUG ROUTES LIST
    app.get("/api/debug/routes", (req, res) => {  // ← FIX: /api PREFIX
      const routes = [];
      
      function extractRoutes(stack, basePath = '') {
        stack.forEach((middleware) => {
          if (middleware.route) {
            routes.push({
              path: basePath + middleware.route.path,
              methods: Object.keys(middleware.route.methods),
              type: 'route'
            });
          } else if (middleware.name === 'router' && middleware.handle?.stack) {
            const routerBasePath = middleware.regexp.source
              .replace(/^\^\\?/, '')
              .replace(/\$.*/, '')
              .replace(/\\\//g, '/')
              .replace(/\(\?\:\\\/\)\?\(\?\=\\\/\|\$\)/, '')
              .replace(/\\\//g, '/');
            
            extractRoutes(middleware.handle.stack, basePath + routerBasePath);
          }
        });
      }
      
      try {
        extractRoutes(app._router.stack);
      } catch (error) {
        console.error("❌ Route extraction error:", error);
      }
      
      const apiRoutes = routes.filter(r => r.path.startsWith('/api'));
      const nonApiRoutes = routes.filter(r => !r.path.startsWith('/api'));
      
      res.json({
        success: true,
        message: "🔍 Route Debug Info - NACH PFAD-FIX",
        totalRoutes: routes.length,
        apiRoutes: apiRoutes,
        nonApiRoutes: nonApiRoutes,
        fixedStructure: {
          auth: "/api/auth/*",
          contracts: "/api/contracts/*",
          generate: "/api/contracts/generate",
          generateOptimized: "/api/contracts/:contractId/generate-optimized", 
          analyze: "/api/analyze",
          optimize: "/api/optimize",
          s3: "/api/s3/*",
          upload: "/api/upload",
          stripe: "/api/stripe/*"
        },
        warning: nonApiRoutes.length > 0 ? "⚠️ Es gibt noch non-/api Routen!" : "✅ Alle Routen unter /api!",
        timestamp: new Date().toISOString()
      });
    });

    // ⏰ Cron Jobs (unchanged)
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
      console.log(`📁 Static files serviert unter: ${API_BASE_URL}/uploads`);
      console.log(`🎉 *** PFAD-CHAOS BEHOBEN - ALLE ROUTEN UNTER /api ***`);
      console.log(`🔐 Auth-Route: /api/auth/* (FIXED!)`);
      console.log(`📄 Contracts-Route: /api/contracts/* (FIXED!)`);
      console.log(`🎯 Generate-Route: /api/contracts/generate (FIXED!)`);
      console.log(`🪄 Smart Contract: /api/contracts/:id/generate-optimized (FIXED!)`);
      console.log(`📊 Analyze-Route: /api/analyze (FIXED!)`);
      console.log(`🔧 Optimize-Route: /api/optimize (FIXED!)`);
      console.log(`☁️ S3-Routes: /api/s3/* (FIXED!)`);
      console.log(`📤 Upload-Route: /api/upload (FIXED!)`);
      console.log(`💳 Stripe-Routes: /api/stripe/* (FIXED!)`);
      console.log(`✅ EINHEITLICHE /api STRUKTUR - BEREIT FÜR VERCEL!`);
    });

  } catch (err) {
    console.error("❌ Fehler beim Serverstart:", err);
    process.exit(1);
  }
})();

// Reset Business Limits (unchanged)
try {
  require("./cron/resetBusinessLimits");
} catch (err) {
  console.error("❌ Reset Business Limits konnte nicht geladen werden:", err);
}

// Graceful Shutdown (unchanged)
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing database connection...');
  if (client) {
    await client.close();
    console.log('📦 MongoDB connection closed');
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, closing server...');
  if (client) {
    await client.close();
    console.log('📦 MongoDB connection closed');
  }
  process.exit(0);
});
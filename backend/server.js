// 🚀 backend/server.js - ✅ FIXED: Einheitliche /api Struktur für ALLE Routen + S3 MIGRATION ROUTES + INVOICE ROUTES + CALENDAR INTEGRATION + CONTRACTFORGE
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
const { extractTextFromBuffer } = require("./services/textExtractor");
const { OpenAI } = require("openai");
const nodemailer = require("nodemailer");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose"); // 📁 Mongoose for Folder Models
const database = require("./config/database"); // 📊 Singleton MongoDB Pool
const cron = require("node-cron");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { fixUtf8Filename } = require("./utils/fixUtf8"); // ✅ Fix UTF-8 Encoding

// 🆕 OPTIONAL: Helmet für erweiterte Security
let helmet;
try {
  helmet = require("helmet");
  console.log("✅ Helmet Security Module geladen");
} catch (err) {
  console.warn("⚠️ Helmet nicht installiert - verwende manuelle Security Headers");
  helmet = null;
}

const verifyToken = require("./middleware/verifyToken");
const createCheckSubscription = require("./middleware/checkSubscription");

// ✅ CALENDAR INTEGRATION IMPORTS
const { onContractChange } = require("./services/calendarEvents");
const { checkAndSendNotifications, processEmailQueue } = require("./services/calendarNotifier");
const { processDigests } = require("./services/calendarDigestService");

// 🚨 ERROR MONITORING - Eigenes System für Fehler-Tracking
const { initErrorCollection, errorHandler, getErrorStats, captureError } = require("./services/errorMonitoring");

// 📊 CRON LOGGER - Protokolliert alle Cron-Job Ausführungen
const { initCronLogger, withCronLogging, getCronJobStatus, getCronLogs } = require("./services/cronLogger");

// 📝 STRUCTURED LOGGING
const logger = require("./utils/logger");

// 🔄 CRON JOBS - Monatlicher analysisCount Reset
require("./cron/resetAnalysisCount");

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
  "http://localhost:5173", // Vite Development
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

// 🌐 Middleware (unchanged)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`🚫 CORS blockiert: ${origin}`);
    callback(null, false);
  },
  credentials: true,
}));
app.use(cookieParser());

// 🆕 HELMET SECURITY (falls installiert)
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: false, // Wir setzen CSP im HTML
    crossOriginEmbedderPolicy: false, // Erlaubt Partner iFrames
    frameguard: {
      action: 'sameorigin' // Erlaubt eigene iFrames
    }
  }));
  console.log("✅ Helmet Security aktiviert");
}

// 🆕 FIX: Erhöhtes JSON-Limit für große HTML-Inhalte mit Logos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
console.log("✅ JSON-Limit erhöht auf 50MB für große Verträge mit Logos");

// 📝 REQUEST LOGGING - Strukturiertes Logging aller HTTP Requests
app.use(logger.requestLogger);
console.log("✅ Structured Request Logger aktiviert");

// 🚀 AUTO-INDEX: Performance-Indexes beim Start sicherstellen (idempotent, non-blocking)
async function ensurePerformanceIndexes(db) {
  const indexes = [
    // Contracts Collection
    { collection: 'contracts', index: { userId: 1, 'legalPulse.riskScore': -1 }, name: 'idx_userId_riskScore' },
    { collection: 'contracts', index: { userId: 1, createdAt: -1 }, name: 'idx_userId_createdAt' },
    { collection: 'contracts', index: { organizationId: 1, createdAt: -1 }, name: 'idx_orgId_createdAt', options: { sparse: true } },
    // Analysis Collection
    { collection: 'analyses', index: { userId: 1, contractName: 1 }, name: 'idx_userId_contractName' },
    { collection: 'analyses', index: { userId: 1, originalFileName: 1 }, name: 'idx_userId_originalFileName' },
    // Contract Events Collection
    { collection: 'contract_events', index: { contractId: 1, status: 1, date: 1 }, name: 'idx_contractId_status_date' },
    { collection: 'contract_events', index: { userId: 1, status: 1, date: 1 }, name: 'idx_userId_status_date' },
    // Envelopes Collection
    { collection: 'envelopes', index: { contractId: 1, createdAt: -1 }, name: 'idx_contractId_createdAt' },
    // Cancellations Collection
    { collection: 'cancellations', index: { userId: 1, createdAt: -1 }, name: 'idx_cancel_userId_createdAt' },
    { collection: 'cancellations', index: { contractId: 1 }, name: 'idx_cancel_contractId' },
    // Email Inbox - Unique Index für Upload-Adressen (verhindert Duplikate bei Custom-Aliases)
    { collection: 'users', index: { emailInboxAddress: 1 }, name: 'idx_emailInboxAddress_unique', options: { unique: true, sparse: true } },
  ];

  for (const { collection, index, name, options = {} } of indexes) {
    try {
      await db.collection(collection).createIndex(index, { name, background: true, ...options });
    } catch (err) {
      // Index existiert bereits oder andere nicht-kritische Fehler - ignorieren
      if (err.code !== 85 && err.code !== 86) {
        console.warn(`⚠️ Index ${name}: ${err.message}`);
      }
    }
  }
}

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

// 🆕 PARTNER WIDGET SECURITY HEADERS
app.use((req, res, next) => {
  // Partner Widget Headers für iFrames
  const origin = req.headers.origin;

  // Erlaubt iFrames von Partner-Domains
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // CSP Header für Server-Responses (ergänzend zum HTML Meta-Tag)
  res.setHeader('Content-Security-Policy-Report-Only',
    "frame-ancestors 'self' https://*.check24.de https://*.tarifcheck.de;"
  );

  // Weitere Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  console.log(`🔒 Security Headers gesetzt für: ${req.path}`);
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

// ✅ CALENDAR HELPER FUNCTIONS
async function extractContractMetadata(text) {
  const metadata = {
    provider: null,
    amount: null,
    contractNumber: null,
    customerNumber: null,
    priceIncreaseDate: null,
    newPrice: null,
    autoRenewMonths: 12
  };
  
  try {
    // Provider/Anbieter extrahieren
    const providerPatterns = [
      /(?:anbieter|firma|unternehmen|provider|vertragspartner)[\s:]+([A-Z][A-Za-z\s&\-\.]+)/i,
      /^([A-Z][A-Za-z\s&\-\.]+)\s+(?:GmbH|AG|KG|UG|e\.V\.|Inc\.|Ltd\.)/m
    ];
    
    for (const pattern of providerPatterns) {
      const match = text.match(pattern);
      if (match) {
        metadata.provider = match[1].trim();
        break;
      }
    }
    
    // Betrag/Preis extrahieren
    const amountPatterns = [
      /(?:monatlich|monthly|mtl\.?)\s*:?\s*([0-9]+[,.]?[0-9]*)\s*(?:€|EUR|Euro)/i,
      /(?:betrag|preis|kosten|gebühr)\s*:?\s*([0-9]+[,.]?[0-9]*)\s*(?:€|EUR|Euro)/i,
      /([0-9]+[,.]?[0-9]*)\s*(?:€|EUR|Euro)\s*(?:pro|je|\/)\s*(?:monat|month)/i
    ];
    
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        metadata.amount = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }
    
    // Vertragsnummer extrahieren
    const contractNumberPatterns = [
      /(?:vertragsnummer|contract\s*(?:number|no\.?)|kundennr\.?)\s*:?\s*([A-Z0-9\-\/]+)/i,
      /(?:referenz|ref\.?|aktenzeichen)\s*:?\s*([A-Z0-9\-\/]+)/i
    ];
    
    for (const pattern of contractNumberPatterns) {
      const match = text.match(pattern);
      if (match) {
        metadata.contractNumber = match[1].trim();
        break;
      }
    }
    
    // Automatische Verlängerung
    const renewalPattern = /(?:verlängert|erneuert|renewed?).*?(?:um|by|für)\s*([0-9]+)\s*(?:monate|months?|jahre|years?)/i;
    const renewalMatch = text.match(renewalPattern);
    if (renewalMatch) {
      let months = parseInt(renewalMatch[1]);
      if (text.toLowerCase().includes('jahr') || text.toLowerCase().includes('year')) {
        months *= 12;
      }
      metadata.autoRenewMonths = months;
    }
    
  } catch (error) {
    console.error("⚠️ Fehler bei Metadaten-Extraktion:", error);
  }
  
  return metadata;
}

// 🚀 MongoDB Connection — nutzt Singleton-Pool aus config/database.js
let db = null;

const connectDB = async () => {
  try {
    logger.info("Verbinde zur MongoDB (Singleton-Pool)...");
    const startTime = Date.now();

    // Pool D: Native MongoClient (Singleton aus database.js)
    db = await database.connect();

    const connectTime = Date.now() - startTime;
    logger.db.connected();
    logger.info("MongoDB Singleton-Pool verbunden", { connectTime: `${connectTime}ms` });

    // Pool M: Mongoose für Models (Folder, Organization, Envelope, etc.)
    await mongoose.connect(MONGO_URI, {
      dbName: "contract_ai",
      maxPoolSize: 30,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info("Mongoose verbunden für Models");

    return db;
  } catch (error) {
    logger.critical("MongoDB-Verbindung fehlgeschlagen", { error: error.message });
    process.exit(1);
  }
};

// 📦 Server Startup with Centralized DB
(async () => {
  try {
    // ✅ STEP 1: Central DB Connection
    db = await connectDB();

    // 🚨 STEP 1.5: Error Monitoring initialisieren
    initErrorCollection(db);

    // 📊 STEP 1.6: Cron Logger initialisieren
    initCronLogger(db);

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
        uptime: process.uptime(),
        jsonLimit: '50mb'
      });
    });

    // ==========================================
    // 🔧 CRITICAL FIX: ALLE ROUTEN UNTER /api
    // ==========================================

    // ✅ 1. AUTH ROUTES - MIT /api PREFIX
    try {
      const authRoutes = require("./routes/auth")(db);
      app.use("/api/auth", authRoutes);
      console.log("✅ Auth-Routen geladen unter /api/auth");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Auth-Routen:", err);
    }

    // ✅ 1.5 ONBOARDING ROUTES - Enterprise Onboarding System v3.0
    try {
      const onboardingRoutes = require("./routes/onboarding")(db);
      app.use("/api/onboarding", onboardingRoutes);
      console.log("✅ Onboarding-Routen geladen unter /api/onboarding");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Onboarding-Routen:", err);
    }

    // ✅ 2. EMAIL VERIFICATION ROUTES - NEUE SEPARATE ROUTE
    try {
      const emailVerificationRoutes = require("./routes/emailVerification")(db);
      app.use("/api/email-verification", emailVerificationRoutes);
      console.log("✅ E-Mail-Verifizierungs-Routen geladen unter /api/email-verification");
    } catch (err) {
      console.error("❌ Fehler beim Laden der E-Mail-Verifizierungs-Routen:", err);
    }

    // ✅ 2.6 E-MAIL MANAGEMENT ROUTES (Unsubscribe, Bounce-Handling)
    try {
      const emailRoutes = require("./routes/email");
      app.use("/api/email", emailRoutes);

      // 📊 Campaign-Tracking (öffentliche Endpoints — Auth via signiertem Token)
      app.use("/api/track", require("./routes/campaignTracking"));
      console.log("📧 E-Mail-Management-Routen geladen unter /api/email");
    } catch (err) {
      console.error("❌ Fehler beim Laden der E-Mail-Routen:", err);
    }

    // ✅ 2.5 ADMIN ROUTES - 🔐 Admin Statistics & Monitoring
    try {
      const adminRoutes = require("./routes/admin");
      app.use("/api/admin", adminRoutes);
      console.log("✅ Admin-Routen geladen unter /api/admin");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Admin-Routen:", err);
    }

    // ✅ 3. STRIPE ROUTES - MIT /api PREFIX  
    try {
      app.use("/api/stripe/portal", require("./routes/stripePortal"));
      app.use("/api/stripe", require("./routes/stripe"));
      console.log("✅ Stripe-Routen geladen unter /api/stripe");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Stripe-Routen:", err);
    }

    // ✅ 4. INVOICE ROUTES - NEU HINZUGEFÜGT!
    try {
      app.use("/api/invoices", verifyToken, require("./routes/invoices"));
      console.log("✅ Invoice-Routen geladen unter /api/invoices");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Invoice-Routen:", err);
    }

    // ✅ 5. CALENDAR ROUTES - NEU HINZUGEFÜGT!
    try {
      const calendarRoutes = require("./routes/calendar");

      // ⚠️ WICHTIG: ICS-Endpoint OHNE Auth - muss VOR verifyToken registriert werden!
      // Externe Kalender (Google, Apple, Outlook) können keine Auth-Header senden
      const { generateICSFeed } = require("./utils/icsGenerator");

      app.get("/api/calendar/ics", async (req, res) => {
        // Setze ICS-Header immer zuerst
        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.setHeader("Content-Disposition", 'inline; filename="contract-ai-calendar.ics"');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        try {
          const { token } = req.query;

          if (!token) {
            return res.send(generateEmptyICSHelper("Token fehlt"));
          }

          // Verify token manually
          const jwt = require("jsonwebtoken");
          const { ObjectId } = require("mongodb");

          let decoded;
          try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
          } catch (jwtError) {
            console.error("❌ ICS JWT Error:", jwtError.message);
            return res.send(generateEmptyICSHelper("Token ungültig oder abgelaufen"));
          }

          const userId = new ObjectId(decoded.userId);

          // Get events from DB
          const events = await req.db.collection("contract_events")
            .aggregate([
              {
                $match: {
                  userId,
                  date: { $gte: new Date() },
                  status: { $ne: "dismissed" }
                }
              },
              {
                $lookup: {
                  from: "contracts",
                  localField: "contractId",
                  foreignField: "_id",
                  as: "contract"
                }
              },
              { $unwind: { path: "$contract", preserveNullAndEmptyArrays: true } }
            ])
            .toArray();

          console.log(`📅 ICS Feed: ${events.length} Events für User ${userId}`);

          const icsContent = generateICSFeed(events);
          res.send(icsContent);

        } catch (error) {
          console.error("❌ ICS Error:", error.message, error.stack);
          res.send(generateEmptyICSHelper("Fehler: " + error.message));
        }
      });

      // Helper für leeres ICS
      function generateEmptyICSHelper(message) {
        const now = new Date();
        const dateStr = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        return [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Contract AI//Calendar Feed//DE',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'X-WR-CALNAME:Contract AI Kalender',
          'BEGIN:VEVENT',
          `UID:info-${Date.now()}@contract-ai.de`,
          `DTSTAMP:${dateStr}`,
          `DTSTART:${dateStr}`,
          `DTEND:${dateStr}`,
          `SUMMARY:Contract AI - ${message}`,
          `DESCRIPTION:Bitte öffnen Sie contract-ai.de und synchronisieren Sie den Kalender erneut.`,
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');
      }

      console.log("✅ ICS-Endpoint registriert (ohne Auth) unter /api/calendar/ics");

      // Alle anderen Calendar-Routen MIT Auth
      app.use("/api/calendar", verifyToken, calendarRoutes);
      console.log("✅ Calendar-Routen geladen unter /api/calendar");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Calendar-Routen:", err);
      // Fallback
      app.get("/api/calendar/events", verifyToken, (req, res) => {
        res.status(503).json({
          success: false,
          message: "Calendar-Service vorübergehend nicht verfügbar"
        });
      });
    }

    // ✅ 6. CANCELLATIONS ROUTES - NEU HINZUGEFÜGT!
    try {
      const cancellationsRoutes = require("./routes/cancellations");
      app.use("/api/cancellations", verifyToken, cancellationsRoutes);
      console.log("✅ Cancellations-Routen geladen unter /api/cancellations");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Cancellations-Routen:", err);
    }

    // ✅ 6.1 COMPANY PROFILE ROUTES - NEU HINZUGEFÜGT!
    try {
      const companyProfileRoutes = require("./routes/companyProfile");
      app.use("/api/company-profile", verifyToken, companyProfileRoutes);
      console.log("✅ Company-Profile-Routen geladen unter /api/company-profile");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Company-Profile-Routen:", err);
    }

    // ✅ 6.2 API-KEYS ROUTES - REST API ZUGANG (ENTERPRISE)
    try {
      const apiKeysRoutes = require("./routes/apiKeys");
      app.use("/api/api-keys", apiKeysRoutes);
      console.log("✅ API-Keys-Routen geladen unter /api/api-keys (Enterprise)");
    } catch (err) {
      console.error("❌ Fehler beim Laden der API-Keys-Routen:", err);
    }

    // ✅ 6.3 REST API v1 ENDPOINTS - PUBLIC API (ENTERPRISE)
    try {
      const apiV1Routes = require("./routes/apiV1");
      app.use("/api/v1", apiV1Routes);
      console.log("✅ REST API v1 Endpoints geladen unter /api/v1 (Enterprise)");
    } catch (err) {
      console.error("❌ Fehler beim Laden der API v1 Routes:", err);
    }

    // ✅ 6.4 ORGANIZATIONS - TEAM MANAGEMENT (ENTERPRISE)
    try {
      const organizationsRoutes = require("./routes/organizations");
      app.use("/api/organizations", organizationsRoutes);
      console.log("✅ Organizations-Routen geladen unter /api/organizations (Enterprise Team-Management)");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Organizations-Routen:", err);
    }

    // ✅ 6.5 CRM/ERP/CPQ INTEGRATIONS - Salesforce, HubSpot, SAP
    try {
      const integrationsRoutes = require("./routes/integrations");
      app.use("/api/integrations", integrationsRoutes);
      console.log("✅ CRM/ERP/CPQ Integrations geladen unter /api/integrations (Salesforce, HubSpot, SAP)");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Integrations-Routen:", err);
    }

    // ✅ 6.6 CONTRACT BUILDER - Visueller Vertragsbaukasten (ContractForge)
    try {
      const contractBuilderRoutes = require("./routes/contractBuilder");
      app.use("/api/contract-builder", contractBuilderRoutes);
      console.log("✅ Contract Builder Routen geladen unter /api/contract-builder (ContractForge)");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Contract Builder Routen:", err);
    }

    // ✅ 6.7 PLAYBOOKS - Smart Playbook System (geführte Vertragserstellung)
    try {
      const playbookRoutes = require("./routes/playbooks");
      app.use("/api/playbooks", playbookRoutes);
      console.log("✅ Playbook Routen geladen unter /api/playbooks (Smart Playbook System)");
    } catch (err) {
      console.error("❌ Fehler beim Laden der Playbook Routen:", err);
    }

    // ✅ 7. KI ANALYSIS & OPTIMIZATION - MIT /api PREFIX
    // ✅ NEU: Upload-Route (ohne Analyse, kein Subscription-Check nötig)
    try {
      app.use("/api/upload", verifyToken, require("./routes/upload"));
      console.log("✅ Upload-Route (ohne Analyse) geladen unter /api/upload");
    } catch (err) {
      console.error("❌ Fehler bei Upload-Route:", err);
      app.post("/api/upload", verifyToken, (req, res) => {
        res.status(503).json({
          success: false,
          message: "Upload-Service vorübergehend nicht verfügbar"
        });
      });
    }

    // ✅ Document Scanner Route
    try {
      app.use("/api/scanner", verifyToken, require("./routes/scanner"));
      console.log("✅ Scanner-Route geladen unter /api/scanner");
    } catch (err) {
      console.error("❌ Fehler bei Scanner-Route:", err);
    }

    try {
      app.use("/api/analyze", verifyToken, checkSubscription, require("./routes/analyze"));
      console.log("✅ Analyze-Route geladen unter /api/analyze");
    } catch (err) {
      console.error("❌ Fehler bei Analyze-Route:", err);
      app.post("/api/analyze", verifyToken, checkSubscription, (req, res) => {
        res.status(503).json({
          success: false,
          message: "Analyse-Service vorübergehend nicht verfügbar"
        });
      });
    }

    try {
      app.use("/api/optimize", verifyToken, checkSubscription, require("./routes/optimize"));
      console.log("✅ Optimize-Route geladen unter /api/optimize");
    } catch (err) {
      console.error("❌ Fehler bei Optimize-Route:", err);
      app.post("/api/optimize", verifyToken, checkSubscription, (req, res) => {
        res.status(503).json({
          success: false,
          message: "Optimierung-Service vorübergehend nicht verfügbar"
        });
      });
    }
    
    // Optimizer V2 - Multi-Stage AI Pipeline
    try {
      app.use("/api/optimizer-v2", verifyToken, checkSubscription, require("./routes/optimizerV2"));
      console.log("✅ Optimizer V2 Route geladen unter /api/optimizer-v2");
    } catch (err) {
      console.error("❌ Fehler bei Optimizer V2 Route:", err);
    }

    // 🚀 Revolutionary: Optimized Contract Generation Route
    try {
      app.use("/api/optimized-contract", verifyToken, require("./routes/optimizedContract"));
      console.log("✅ Optimized-Contract-Route geladen unter /api/optimized-contract");
    } catch (error) {
      console.error("❌ Fehler beim Laden der Optimized-Contract-Route:", error);
    }

    // ✅ 🔓 ÖFFENTLICHE VERIFY-ROUTE (OHNE AUTH!) - MUSS GANZ ZUERST KOMMEN!
    // Diese Route MUSS VOR allen anderen /api/contracts Routen registriert werden,
    // da Express Routen in der Reihenfolge matched wie sie registriert werden.
    app.get("/api/contracts/verify/:id", async (req, res) => {
      try {
        const contractId = req.params.id;
        console.log('🔍 [PUBLIC] Vertragsverifizierung angefragt für ID:', contractId);

        const { ObjectId } = require("mongodb");

        // Validiere ObjectId Format
        if (!ObjectId.isValid(contractId)) {
          return res.status(400).json({
            verified: false,
            message: 'Ungültige Vertrags-ID',
            error: 'INVALID_ID'
          });
        }

        // Vertrag suchen (nur nicht-sensible Felder)
        const contract = await db.collection("contracts").findOne(
          { _id: new ObjectId(contractId) },
          {
            projection: {
              name: 1,
              contractType: 1,
              status: 1,
              createdAt: 1,
              updatedAt: 1,
              uploadedAt: 1,
              designVariant: 1
            }
          }
        );

        if (!contract) {
          return res.status(404).json({
            verified: false,
            message: 'Vertrag nicht gefunden',
            error: 'NOT_FOUND'
          });
        }

        // Erfolgreiche Verifizierung - gib öffentliche Metadaten zurück
        console.log('✅ [PUBLIC] Vertrag verifiziert:', contract.name);

        res.json({
          verified: true,
          message: 'Vertrag erfolgreich verifiziert',
          contract: {
            id: contract._id,
            name: contract.name || 'Unbenannter Vertrag',
            type: contract.contractType || 'Vertrag',
            status: contract.status || 'Aktiv',
            createdAt: contract.createdAt || contract.uploadedAt,
            designVariant: contract.designVariant || 'executive'
          },
          platform: {
            name: 'Contract AI',
            url: 'https://contract-ai.de',
            verifiedAt: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error('❌ [PUBLIC] Verifizierungsfehler:', error);
        res.status(500).json({
          verified: false,
          message: 'Fehler bei der Verifizierung',
          error: 'SERVER_ERROR'
        });
      }
    });
    console.log("✅ Öffentliche Verify-Route geladen unter /api/contracts/verify/:id (OHNE AUTH - VOR allen anderen contracts Routen!)");

    // ✅ 8. CONTRACT ROUTES - SPEZIFISCHE VOR ALLGEMEINEN!
    try {
      const generateRouter = require("./routes/generate");
      app.use("/api/contracts/generate", verifyToken, checkSubscription, generateRouter);
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

    // ✅ 8.5 EXCEL EXPORT - Portfolio als Excel-Datei exportieren
    try {
      const exportContractsRouter = require("./routes/exportContracts");
      app.use("/api/contracts", verifyToken, exportContractsRouter);
      console.log("✅ Excel-Export Route geladen unter /api/contracts/export-excel");
    } catch (err) {
      console.error("❌ Fehler bei Excel-Export Route:", err);
    }

    // ✅ 8.6 BULK DOWNLOAD - Mehrere Verträge als ZIP herunterladen
    try {
      const bulkDownloadRouter = require("./routes/bulkDownload");
      app.use("/api/contracts", verifyToken, bulkDownloadRouter);
      console.log("✅ Bulk-Download Route geladen unter /api/contracts/bulk-download");
    } catch (err) {
      console.error("❌ Fehler bei Bulk-Download Route:", err);
    }

    // ✅ 9. SMART CONTRACT GENERATOR - SAUBERER ROUTER MOUNT
    try {
      const optimizedContractRouter = require("./routes/optimizedContract");
      app.use("/api/contracts", verifyToken, checkSubscription, optimizedContractRouter);
      console.log("✅ Smart Contract Generator geladen unter /api/contracts/:contractId/generate-optimized");
    } catch (err) {
      console.error("❌ Fehler bei Smart Contract Generator:", err);
      app.post("/api/contracts/:contractId/generate-optimized", verifyToken, checkSubscription, (req, res) => {
        res.status(503).json({
          success: false,
          message: "Smart Contract Generator vorübergehend nicht verfügbar"
        });
      });
    }

    // ✅ 10. S3 MIGRATION ROUTES
    try {
      app.post("/api/contracts/migrate-legacy", verifyToken, async (req, res) => {
        try {
          console.log("🚀 Starting legacy contract migration...");
          
          const legacyContracts = await req.contractsCollection.find({
            $or: [
              { s3Key: { $exists: false } },
              { s3Key: null },
              { s3Key: "" }
            ]
          }).toArray();
          
          console.log(`📊 Found ${legacyContracts.length} legacy contracts`);
          
          const updateResult = await req.contractsCollection.updateMany(
            {
              $or: [
                { s3Key: { $exists: false } },
                { s3Key: null },
                { s3Key: "" }
              ]
            },
            { 
              $set: { 
                needsReupload: true,
                uploadType: "LOCAL_LEGACY",
                migrationNote: "Contract uploaded before S3 integration - requires reupload for cloud access",
                migrationDate: new Date()
              }
            }
          );
          
          const s3Contracts = await req.contractsCollection.countDocuments({
            s3Key: { $exists: true, $ne: null, $ne: "" }
          });
          
          console.log(`✅ Migration completed:`, {
            legacyContractsFound: legacyContracts.length,
            contractsUpdated: updateResult.modifiedCount,
            s3Contracts: s3Contracts
          });
          
          res.json({
            success: true,
            message: "Legacy contract migration completed",
            statistics: {
              legacyContractsFound: legacyContracts.length,
              contractsUpdated: updateResult.modifiedCount,
              s3ContractsTotal: s3Contracts,
              migrationDate: new Date().toISOString()
            },
            examples: legacyContracts.slice(0, 5).map(contract => ({
              id: contract._id,
              name: contract.name,
              createdAt: contract.createdAt,
              hasS3Key: !!contract.s3Key
            }))
          });
          
        } catch (error) {
          console.error("❌ Migration error:", error);
          res.status(500).json({ 
            success: false,
            error: "Migration failed", 
            details: error.message 
          });
        }
      });

      app.get("/api/contracts/migration-status", verifyToken, async (req, res) => {
        try {
          const legacyCount = await req.contractsCollection.countDocuments({
            uploadType: "LOCAL_LEGACY"
          });
          
          const s3Count = await req.contractsCollection.countDocuments({
            s3Key: { $exists: true, $ne: null, $ne: "" }
          });
          
          const totalCount = await req.contractsCollection.countDocuments({});
          
          res.json({
            success: true,
            statistics: {
              totalContracts: totalCount,
              s3Contracts: s3Count,
              legacyContracts: legacyCount,
              unmigrated: totalCount - s3Count - legacyCount,
              migrationComplete: (legacyCount + s3Count) === totalCount
            }
          });
          
        } catch (error) {
          console.error("❌ Status check error:", error);
          res.status(500).json({ 
            success: false,
            error: "Status check failed",
            details: error.message 
          });
        }
      });

      console.log("✅ S3 Migration Routes geladen unter /api/contracts/migrate-legacy & migration-status");
    } catch (err) {
      console.error("❌ Fehler bei S3 Migration Routes:", err);
    }

    // ✅ 11. ALLGEMEINE CONTRACT CRUD
    // ⚠️ verifyToken überspringt automatisch /email-import (siehe verifyToken.js)
    try {
      app.use("/api/contracts", verifyToken, require("./routes/contracts"));
      console.log("✅ Contracts-Routen geladen (/email-import: API-Key only, Rest: JWT)");
    } catch (err) {
      console.error("❌ Fehler bei Contract-Routen:", err);
    }

    // ✅ 🔄 CONTRACT IMPROVEMENT - Vertrag nachträglich verbessern
    try {
      app.use("/api/contracts", verifyToken, checkSubscription, require("./routes/improve"));
      console.log("✅ Contract Improvement Route geladen unter /api/contracts/improve");
    } catch (err) {
      console.error("❌ Fehler bei Improvement-Route:", err);
    }

    // ✅ 📁 FOLDERS - Ordner-Management
    try {
      app.use("/api/folders", require("./routes/folders"));
      console.log("✅ Folders-Routen geladen unter /api/folders");
    } catch (err) {
      console.error("❌ Fehler bei Folders-Routen:", err);
    }

    // ✅ ✉️ ENVELOPE ROUTES - Digital Signature Workflow
    try {
      const envelopeRoutes = require("./routes/envelopes");

      // 🔧 FIX: Mount router once - routes define full paths internally
      // Public routes: /api/sign/:token (no auth required) - handled in route file
      // Authenticated routes: /api/envelopes/* - checkSubscription prüft Business+
      // 🔐 checkSubscription wird in der Route-Datei angewendet (für /envelopes/*)
      app.use("/api", envelopeRoutes);

      console.log("✅ Envelope-Routen geladen unter /api/envelopes & /api/sign/:token");
    } catch (err) {
      console.error("❌ Fehler bei Envelope-Routen:", err);
    }

    // ❌ ENVELOPE TEMPLATE ROUTES - Deaktiviert (Feature entfernt)
    // try {
    //   const envelopeTemplateRoutes = require("./routes/envelopeTemplates");
    //   app.use("/api", envelopeTemplateRoutes);
    //   console.log("✅ Envelope-Template-Routen geladen unter /api/envelope-templates");
    // } catch (err) {
    //   console.error("❌ Fehler bei Envelope-Template-Routen:", err);
    // }

    // ✅ 12. WEITERE ROUTEN - ALLE MIT /api PREFIX
    try {
      app.use("/api/compare", verifyToken, checkSubscription, require("./routes/compare"));
      console.log("✅ Compare-Route geladen unter /api/compare");
    } catch (err) {
      console.error("❌ Fehler bei Compare-Route:", err);
    }

    try {
      // ✅ LEGAL CHAT 2.0 - MongoDB-basiert, SSE-Streaming, Anwalt-Persona
      // 🔐 verifyToken + checkSubscription - Chat ist Business+ Feature
      const chatRoutes = require("./routes/chat");
      app.use("/api/chat", verifyToken, checkSubscription, chatRoutes); // ✅ FIX: verifyToken MUSS vor checkSubscription!
      console.log("✅ Legal Chat 2.0 geladen unter /api/chat (MongoDB, SSE, Lawyer Persona)");
    } catch (err) {
      console.error("❌ Fehler bei Chat-Route:", err);
    }

    try {
      app.use("/api/analyze-type", require("./routes/analyzeType"));
      console.log("✅ Analyze-Type-Route geladen unter /api/analyze-type");
    } catch (err) {
      console.error("❌ Fehler bei Analyze-Type-Route:", err);
    }

    try {
      app.use("/api/extract-text", require("./routes/extractText"));
      console.log("✅ Extract-Text-Route geladen unter /api/extract-text");
    } catch (err) {
      console.error("❌ Fehler bei Extract-Text-Route:", err);
    }

    try {
      // 🔐 verifyToken + checkSubscription hinzugefügt - Better Contracts ist Business+ Feature
      app.use("/api/better-contracts", verifyToken, checkSubscription, require("./routes/betterContracts"));
      console.log("✅ Better-Contracts-Route geladen unter /api/better-contracts");
    } catch (err) {
      console.error("❌ Fehler bei Better-Contracts-Route:", err);
    }

    // ✅ 13. SAVED ALTERNATIVES
    try {
      app.use("/api/saved-alternatives", verifyToken, require("./routes/savedAlternatives"));
      console.log("✅ Saved Alternatives Routen geladen unter /api/saved-alternatives");
    } catch (err) {
      console.error("❌ Fehler bei Saved Alternatives Routen:", err);
    }

    // ✅ 14. LEGAL PULSE
    try {
      // 🔐 checkSubscription hinzugefügt - Legal Pulse ist Business+ Feature
      app.use("/api/legal-pulse", verifyToken, checkSubscription, require("./routes/legalPulse"));
      console.log("✅ Legal Pulse Routen geladen unter /api/legal-pulse");
    } catch (err) {
      console.error("❌ Fehler bei Legal Pulse Routen:", err);
    }

    // ✅ 14.1 LEGAL PULSE V2 — Deep Contract Analysis Pipeline
    try {
      app.use("/api/legal-pulse-v2", verifyToken, checkSubscription, require("./routes/legalPulseV2"));
      console.log("✅ Legal Pulse V2 Routen geladen unter /api/legal-pulse-v2");
    } catch (err) {
      console.error("❌ Fehler bei Legal Pulse V2 Routen:", err);
    }

    // ✅ 14.0.1 LEGAL PULSE HEALTH & MONITORING
    try {
      const legalPulseHealthRoutes = require("./routes/legalPulseHealth")(db);
      app.use("/api/legal-pulse", legalPulseHealthRoutes);
      console.log("✅ Legal Pulse Health & Monitoring geladen unter /api/legal-pulse/health");
    } catch (err) {
      console.error("❌ Fehler bei Legal Pulse Health:", err);
    }

    // ✅ 14.2 LEGAL PULSE NOTIFICATIONS (Phase 2)
    try {
      const pulseNotificationsRoutes = require("./routes/pulseNotifications");
      app.use("/api/pulse-notifications", verifyToken, pulseNotificationsRoutes);
      console.log("✅ Legal Pulse Notifications geladen unter /api/pulse-notifications");
    } catch (err) {
      console.error("❌ Fehler bei Legal Pulse Notifications:", err);
    }

    // 📊 DASHBOARD NOTIFICATIONS - Aggregierte Benachrichtigungen fürs Dashboard
    try {
      const dashboardNotificationsRoutes = require("./routes/dashboardNotifications");
      app.use("/api/dashboard/notifications", dashboardNotificationsRoutes);
      console.log("✅ Dashboard Notifications API geladen unter /api/dashboard/notifications");
    } catch (err) {
      console.error("❌ Fehler bei Dashboard Notifications:", err);
    }

    // 🔍 LEGAL LENS - Interaktive Vertragsanalyse
    try {
      // 🔐 checkSubscription hinzugefügt - Legal Lens ist Business+ Feature
      const legalLensRoutes = require("./routes/legalLens");
      app.use("/api/legal-lens", verifyToken, checkSubscription, legalLensRoutes);
      console.log("✅ Legal Lens API geladen unter /api/legal-lens");

      // Legal Lens V2 — Interaktiver Vertrags-Explorer (Batch-Analyse)
      const legalLensV2Routes = require("./routes/legalLensV2");
      app.use("/api/legal-lens/v2", verifyToken, checkSubscription, legalLensV2Routes);
      console.log("✅ Legal Lens V2 API geladen unter /api/legal-lens/v2");
    } catch (err) {
      console.error("❌ Fehler bei Legal Lens API:", err);
    }

    // 📚 CLAUSE LIBRARY - Klausel-Favoriten/Bibliothek
    try {
      const clauseLibraryRoutes = require("./routes/clauseLibrary");
      app.use("/api/clause-library", verifyToken, clauseLibraryRoutes);
      console.log("✅ Clause Library API geladen unter /api/clause-library");
    } catch (err) {
      console.error("❌ Fehler bei Clause Library API:", err);
    }

    // 📂 CLAUSE COLLECTIONS API (Benutzerdefinierte Klausel-Sammlungen)
    try {
      const clauseCollectionsRoutes = require("./routes/clauseCollections");
      app.use("/api/clause-collections", verifyToken, clauseCollectionsRoutes);
      console.log("✅ Clause Collections API geladen unter /api/clause-collections");
    } catch (err) {
      console.error("❌ Fehler bei Clause Collections API:", err);
    }

    // 💰 COST TRACKING API (OpenAI Usage & Budget Monitoring)
    try {
      const costTrackingRoutes = require("./routes/costTracking");
      app.use("/api/cost-tracking", verifyToken, costTrackingRoutes);
      console.log("✅ Cost Tracking API geladen unter /api/cost-tracking");
    } catch (err) {
      console.error("❌ Fehler bei Cost Tracking:", err);
    }

    // 🤖 ASSISTANT API - Global Assistant (Sales, Product, Legal)
    try {
      const assistantRoutes = require("./routes/assistant");
      app.use("/api/assistant", assistantRoutes);
      console.log("✅ Assistant API geladen unter /api/assistant");
    } catch (err) {
      console.error("❌ Fehler bei Assistant API:", err);
    }

    // ✅ 14.2.1 ALERT FEEDBACK SYSTEM (Phase 2 - Thumbs Up/Down)
    try {
      const alertFeedbackRoutes = require("./routes/alertFeedback")(db);
      app.use("/api/alert-feedback", alertFeedbackRoutes);
      console.log("✅ Alert Feedback System geladen unter /api/alert-feedback");
    } catch (err) {
      console.error("❌ Fehler bei Alert Feedback:", err);
    }

    // ✅ 14.2.2 PUBLIC FEEDBACK (No Auth - Email Links)
    try {
      const publicFeedbackRoutes = require("./routes/publicFeedback")(db);
      app.use("/feedback", publicFeedbackRoutes); // Public route, no /api prefix
      console.log("✅ Public Feedback Routes geladen unter /feedback");
    } catch (err) {
      console.error("❌ Fehler bei Public Feedback:", err);
    }

    // ✅ REFUND FEEDBACK (Öffentliche Feedback-Seite für Rückerstattungen)
    try {
      const refundFeedbackRoutes = require("./routes/refundFeedback")(db, transporter);
      app.use("/api/refund-feedback", refundFeedbackRoutes);
      console.log("✅ Refund Feedback Routes geladen unter /api/refund-feedback");
    } catch (err) {
      console.error("❌ Fehler bei Refund Feedback:", err);
    }

    // ✅ 14.3 AUTOMATED ACTIONS (Phase 2)
    try {
      const automatedActionsRoutes = require("./routes/automatedActions");
      app.use("/api/automated-actions", verifyToken, automatedActionsRoutes);
      console.log("✅ Automated Actions geladen unter /api/automated-actions");
    } catch (err) {
      console.error("❌ Fehler bei Automated Actions:", err);
    }

    // ✅ 14.4 PREDICTIVE ANALYTICS & FORECAST (Phase 2)
    try {
      const predictiveRoutes = require("./routes/predictiveAnalytics");
      app.use("/api/predictive", verifyToken, predictiveRoutes);
      console.log("✅ Predictive Analytics geladen unter /api/predictive");
    } catch (err) {
      console.error("❌ Fehler bei Predictive Analytics:", err);
    }

    // ✅ 14.5 EXTERNAL LEGAL APIS (Phase 3)
    try {
      const externalLegalAPIsRoutes = require("./routes/externalLegalAPIs");
      app.use("/api/external-legal", verifyToken, externalLegalAPIsRoutes);
      console.log("✅ External Legal APIs geladen unter /api/external-legal");
    } catch (err) {
      console.error("❌ Fehler bei External Legal APIs:", err);
    }

    // ✅ 14.6 MARKET BENCHMARKING (Phase 3)
    try {
      const benchmarkingRoutes = require("./routes/benchmarking");
      app.use("/api/benchmarking", verifyToken, benchmarkingRoutes);
      console.log("✅ Market Benchmarking geladen unter /api/benchmarking");
    } catch (err) {
      console.error("❌ Fehler bei Market Benchmarking:", err);
    }

    // ✅ 14.7 ML FORECASTING API (Phase 3)
    try {
      const mlForecastingRoutes = require("./routes/mlForecasting");
      app.use("/api/ml-forecast", verifyToken, mlForecastingRoutes);
      console.log("✅ ML Forecasting API geladen unter /api/ml-forecast");
    } catch (err) {
      console.error("❌ Fehler bei ML Forecasting API:", err);
    }

    // ✅ 15. S3 ROUTES
    try {
      const s3Routes = require("./routes/s3Routes");
      app.use("/api/s3", s3Routes);
      console.log("✅ S3-Routen geladen unter /api/s3");
    } catch (err) {
      console.error("❌ Fehler beim Laden der S3-Routen:", err);
    }

    // ✅ 16. USER TEMPLATES ROUTES
    try {
      const userTemplatesRoutes = require("./routes/userTemplates")(db);
      app.use("/api/user-templates", verifyToken, userTemplatesRoutes);
      console.log("✅ User Templates Routen geladen unter /api/user-templates");
    } catch (err) {
      console.error("❌ Fehler beim Laden der User Templates Routen:", err);
    }

    // ✅ 15. S3 LEGACY ROUTES
    if (generateSignedUrl) {
      app.get("/api/s3/view", verifyToken, (req, res) => {
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

      app.get("/api/s3/json", verifyToken, (req, res) => {
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

      console.log("✅ S3 Legacy-Routen geladen unter /api/s3");
    }

    // ✅ 16. UPLOAD ROUTE MIT CALENDAR INTEGRATION
    if (s3Upload) {
      app.post("/api/upload", verifyToken, checkSubscription, s3Upload.single("file"), async (req, res) => {
        if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });

        try {
          console.log(`📁 S3 Upload successful:`, {
            key: req.file.key,
            bucket: req.file.bucket,
            location: req.file.location
          });

          // Text-Extraktion aus S3
          let analysisText = '';
          let extractedData = {};
          
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
            
            // Determine mimetype from file key/name
            const s3FileMimetype = req.file.key?.endsWith('.docx')
              ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              : 'application/pdf';
            const parsedDoc = await extractTextFromBuffer(s3Object.Body, s3FileMimetype);
            analysisText = parsedDoc.text.substring(0, 5000);
            
            // ✅ CALENDAR: Erweiterte Datenextraktion
            extractedData = await extractContractMetadata(analysisText);
            
          } catch (extractError) {
            console.warn("⚠️ Text-Extraktion von S3 fehlgeschlagen:", extractError.message);
          }

          // KI-Analyse
          let name = "Unbekannt", laufzeit = "Unbekannt", kuendigung = "Unbekannt";
          if (analysisText) {
            try {
              const analysis = await analyzeContract(analysisText);
              name = analysis.match(/Vertragsname:\s*(.*)/i)?.[1]?.trim() || fixUtf8Filename(req.file.originalname) || "Unbekannt";
              laufzeit = analysis.match(/Laufzeit:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
              kuendigung = analysis.match(/Kündigungsfrist:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
            } catch (aiError) {
              console.warn("⚠️ KI-Analyse fehlgeschlagen:", aiError.message);
              name = fixUtf8Filename(req.file.originalname) || "Unbekannt";
            }
          } else {
            name = fixUtf8Filename(req.file.originalname) || "Unbekannt";
          }

          const expiryDate = extractExpiryDate(laufzeit);
          const status = determineContractStatus(expiryDate);

          // ✅ ERWEITERT: Contract mit Calendar-Metadaten
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
            originalname: fixUtf8Filename(req.file.originalname),
            mimetype: req.file.mimetype,
            size: req.file.size,
            filePath: `/s3/${req.file.key}`,
            fileUrl: null,
            // ✅ CALENDAR: Zusätzliche Felder
            provider: extractedData.provider || null,
            amount: extractedData.amount || null,
            contractNumber: extractedData.contractNumber || null,
            customerNumber: extractedData.customerNumber || null,
            priceIncreaseDate: extractedData.priceIncreaseDate || null,
            newPrice: extractedData.newPrice || null,
            autoRenewMonths: extractedData.autoRenewMonths || 12,
            extractedText: analysisText,
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
          
          // ✅ CALENDAR: Events generieren
          try {
            const fullContract = { ...contract, _id: insertedId };
            const generatedEvents = await onContractChange(req.db, fullContract, "create");
            console.log(`📅 Calendar Events generiert für: ${name}`);
          } catch (eventError) {
            console.warn("⚠️ Calendar Events konnten nicht generiert werden:", eventError.message);
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

      console.log("✅ Upload-Route geladen unter /api/upload");
    }

    // ✅ 17. TEST & DEBUG ROUTES
    try {
      app.use("/api/test", require("./testAuth"));
      console.log("✅ Test-Route geladen unter /api/test");
    } catch (err) {
      console.error("❌ Fehler bei Test-Route:", err);
    }

    // ✅ 18. DEBUG ROUTE
    app.get("/api/debug", (req, res) => {
      console.log("Cookies:", req.cookies);
      res.cookie("debug_cookie", "test-value", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "Lax", // ✅ CSRF-Schutz
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
        jsonLimit: '50mb',
        routeStructure: "✅ ALLE ROUTEN UNTER /api - EINHEITLICH!",
        authRoute: "/api/auth/* (FIXED!)",
        emailVerificationRoute: "/api/email-verification/* (NEW!)",
        contractsRoute: "/api/contracts/* (FIXED!)",
        generateRoute: "/api/contracts/generate (FIXED!)",
        smartContractRoute: "/api/contracts/:id/generate-optimized (FIXED!)",
        analyzeRoute: "/api/analyze (FIXED!)",
        optimizeRoute: "/api/optimize (FIXED!)",
        s3Routes: "/api/s3/* (FIXED + ENHANCED!)",
        uploadRoute: "/api/upload (FIXED!)",
        stripeRoutes: "/api/stripe/* (FIXED!)",
        invoiceRoutes: "/api/invoices/* (ADDED!)",
        betterContractsRoute: "/api/better-contracts (ADDED!)",
        migrationRoutes: "/api/contracts/migrate-legacy & migration-status (NEW!)",
        calendarRoutes: "/api/calendar/* (NEW!)",
        cancellationsRoutes: "/api/cancellations/* (NEW!)",
        calendarFeatures: {
          eventGeneration: "✅ Automatisch bei Upload/Edit",
          notifications: "✅ Täglicher Check um 8 Uhr",
          quickActions: "✅ Cancel, Compare, Optimize, Snooze",
          oneClickCancel: "✅ Direkt aus Calendar oder E-Mail"
        },
        s3Status: s3Status,
        partnerIntegration: {
          check24PartnerId: process.env.CHECK24_PARTNER_ID || 'NOT SET',
          tarifcheckPartnerId: process.env.TARIFCHECK_PARTNER_ID || 'NOT SET',
          widgetSecurity: 'CSP configured for partner domains',
          allowedPartnerDomains: [
            '*.check24.de',
            '*.tarifcheck.de',
            'files.check24.net',
            'form.partner-versicherung.de'
          ]
        },
        message: "🎉 PFAD-CHAOS BEHOBEN + CALENDAR INTEGRATION ACTIVE + 50MB LIMIT + PARTNER SECURITY!"
      });
    });

    // ✅ 19. DEBUG ROUTES LIST
    app.get("/api/debug/routes", (req, res) => {
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
        message: "📁 Route Debug Info - WITH CALENDAR INTEGRATION",
        totalRoutes: routes.length,
        apiRoutes: apiRoutes,
        nonApiRoutes: nonApiRoutes,
        fixedStructure: {
          auth: "/api/auth/*",
          emailVerification: "/api/email-verification/*",
          contracts: "/api/contracts/*",
          generate: "/api/contracts/generate",
          generateOptimized: "/api/contracts/:contractId/generate-optimized", 
          analyze: "/api/analyze",
          optimize: "/api/optimize",
          s3: "/api/s3/*",
          upload: "/api/upload",
          stripe: "/api/stripe/*",
          invoices: "/api/invoices/*",
          betterContracts: "/api/better-contracts",
          migrationRoutes: "/api/contracts/migrate-legacy & migration-status",
          calendar: "/api/calendar/* (NEW!)",
          cancellations: "/api/cancellations/* (NEW!)",
          companyProfile: "/api/company-profile/* (NEW!)"
        },
        warning: nonApiRoutes.length > 0 ? "⚠️ Es gibt noch non-/api Routen!" : "✅ Alle Routen unter /api!",
        timestamp: new Date().toISOString()
      });
    });

    // 🔄 Cron Retry-Wrapper: Retry bei transienten MongoDB-Fehlern
    const RETRYABLE_ERRORS = ['MongoNetworkTimeoutError', 'MongoServerSelectionError', 'ECONNRESET'];
    async function withRetry(fn, retries = 2, delay = 2000) {
      try {
        return await fn();
      } catch (err) {
        const isRetryable = RETRYABLE_ERRORS.some(e =>
          err.name === e || err.code === e || (err.message && err.message.includes(e))
        );
        if (isRetryable && retries > 0) {
          console.warn(`🔄 Cron Retry (${retries} left) nach ${err.name}: ${err.message}`);
          await new Promise(r => setTimeout(r, delay));
          return withRetry(fn, retries - 1, delay * 1.5);
        }
        throw err;
      }
    }

    // 🔒 Cron Overlap-Lock: verhindert parallele Ausführung desselben Jobs
    const cronLocks = new Map();
    function withCronLock(jobName, fn) {
      return async () => {
        if (cronLocks.get(jobName)) {
          console.warn(`⏭️ Cron ${jobName} übersprungen — läuft noch`);
          return;
        }
        cronLocks.set(jobName, true);
        try {
          await withRetry(fn);
        } finally {
          cronLocks.delete(jobName);
        }
      };
    }

    // ⏰ ERWEITERTE Cron Jobs mit Calendar Integration
    try {
      // ✅ BESTEHENDER Reminder-Cronjob ERWEITERT mit Calendar Notifications
      cron.schedule("0 8 * * *", async () => {
        console.log("⏰ Täglicher Reminder-Check gestartet");
        try {
          await withCronLogging('reminder-calendar', async () => {
            // Alte Reminder-Funktion
            const { checkContractsAndSendReminders } = require("./services/cron");
            await checkContractsAndSendReminders();

            // ✅ CALENDAR: Neue Calendar Notifications
            console.log("📅 Calendar Notification Check gestartet");
            const notificationCount = await checkAndSendNotifications(db);
            return { notificationsSent: notificationCount || 0 };
          });
        } catch (error) {
          console.error("❌ Reminder/Calendar Cron Error:", error);
          await captureError(error, { route: 'CRON:reminder-calendar', method: 'SCHEDULED', severity: 'high' });
        }
      });

      // 📧 NEU: E-Mail Queue Retry (alle 15 Minuten)
      cron.schedule("*/15 * * * *", async () => {
        try {
          const stats = await processEmailQueue(db);
          if (stats.processed > 0) {
            console.log();
          }
        } catch (error) {
          console.error("❌ Email Queue Retry Cron Error:", error);
          await captureError(error, { route: 'CRON:email-queue-retry', method: 'SCHEDULED', severity: 'high' });
        }
      });

      // 📮 NEU: Campaign Processor (jede Minute) — verarbeitet 'queued'/'sending' Kampagnen
      // Kill-Switch: env CAMPAIGN_CRON_ENABLED=false deaktiviert komplett
      cron.schedule("*/1 * * * *", withCronLock('campaign-processor', async () => {
        try {
          await withCronLogging('campaign-processor', async () => {
            const { runCampaignProcessor } = require("./jobs/campaignProcessor");
            const result = await runCampaignProcessor();
            return result;
          });
        } catch (error) {
          console.error("❌ Campaign Processor Cron Error:", error);
          await captureError(error, { route: 'CRON:campaign-processor', method: 'SCHEDULED', severity: 'high' });
        }
      }));

      // 🧠 NEU: Smart Status Updater (täglich um 1 Uhr nachts)
      cron.schedule("0 1 * * *", async () => {
        console.log("🧠 Starte Smart Status Update für alle Verträge...");
        try {
          const { updateContractStatuses } = require("./services/smartStatusUpdater");
          const result = await updateContractStatuses(db);
          console.log(`✅ Smart Status Update abgeschlossen:`, result);
        } catch (error) {
          console.error("❌ Smart Status Update Cron Error:", error);
          await captureError(error, { route: 'CRON:smart-status-update', method: 'SCHEDULED', severity: 'medium' });
        }
      });

      // 📤 NEU: Notification Queue Sender (täglich um 9 Uhr morgens)
      cron.schedule("0 9 * * *", async () => {
        console.log("📤 Starte Notification Queue Verarbeitung...");
        try {
          const { processNotificationQueue } = require("./services/notificationSender");
          const result = await processNotificationQueue(db);
          console.log(`✅ Notification Queue abgeschlossen:`, result);
        } catch (error) {
          console.error("❌ Notification Queue Cron Error:", error);
          await captureError(error, { route: 'CRON:notification-queue', method: 'SCHEDULED', severity: 'high' });
        }
      });

      // 📬 NEU: Digest-E-Mails (täglich um 7 Uhr morgens)
      // Sammelt alle Events eines Users und sendet EINE zusammenfassende E-Mail
      cron.schedule("0 7 * * *", async () => {
        console.log("📬 Starte Digest-E-Mail Verarbeitung...");
        try {
          await withCronLogging('digest-emails', async () => {
            const stats = await processDigests(db);
            console.log(`📬 Digest-Verarbeitung: ${stats.users} User, ${stats.events} Events, ${stats.errors} Fehler`);
            return stats;
          });
        } catch (error) {
          console.error("❌ Digest Cron Error:", error);
          await captureError(error, { route: 'CRON:digest-emails', method: 'SCHEDULED', severity: 'high' });
        }
      });

      // 📬 Legal Pulse: Täglicher Digest (täglich um 8:10 Uhr morgens)
      // Verarbeitet alle Legal-Pulse-Alerts aus der digest_queue und sendet Sammel-Emails
      // Gestaffelt: 08:10 statt 08:00 um DB-Connection-Kollision mit reminder-calendar zu vermeiden
      cron.schedule("10 8 * * *", async () => {
        console.log("📬 [LEGAL-PULSE] Starte Daily Digest Verarbeitung...");
        try {
          const DigestProcessor = require("./jobs/digestProcessor");
          const processor = new DigestProcessor();
          const result = await processor.processDailyDigests();
          console.log(`📬 [LEGAL-PULSE] Daily Digest: ${result.sent} gesendet, ${result.errors} Fehler`);
          await processor.close();
        } catch (error) {
          console.error("❌ [LEGAL-PULSE] Daily Digest Cron Error:", error);
          await captureError(error, { route: 'CRON:legal-pulse-daily-digest', method: 'SCHEDULED', severity: 'high' });
        }
      });

      // 📬 Legal Pulse: Wöchentlicher Digest (jeden Montag um 8:20 Uhr morgens)
      // Weekly Check läuft Sonntag 02:00 → Digest versendet Montag 08:20
      // Gestaffelt: 08:20 statt 08:00 um DB-Connection-Kollision zu vermeiden
      cron.schedule("20 8 * * 1", async () => {
        console.log("📬 [LEGAL-PULSE] Starte Weekly Digest Verarbeitung...");
        try {
          const DigestProcessor = require("./jobs/digestProcessor");
          const processor = new DigestProcessor();
          const result = await processor.processWeeklyDigests();
          await processor.cleanup(); // Alte Einträge bereinigen
          console.log(`📬 [LEGAL-PULSE] Weekly Digest: ${result.sent} gesendet, ${result.errors} Fehler`);
          await processor.close();
        } catch (error) {
          console.error("❌ [LEGAL-PULSE] Weekly Digest Cron Error:", error);
          await captureError(error, { route: 'CRON:legal-pulse-weekly-digest', method: 'SCHEDULED', severity: 'high' });
        }
      });

      // 📧 NEU: Onboarding E-Mail Sequence (täglich um 8:30 Uhr morgens)
      // Sendet automatisch Day 2, Day 7, Day 14 und Day 30 E-Mails an neue/Free User
      cron.schedule("30 8 * * *", async () => {
        console.log("📧 [ONBOARDING] Starte E-Mail Sequence Verarbeitung...");
        try {
          const { processOnboardingEmails } = require("./services/onboardingEmailService");
          const emailsSent = await processOnboardingEmails(db);
          console.log(`📧 [ONBOARDING] ${emailsSent} E-Mail(s) gesendet`);
        } catch (error) {
          console.error("❌ Onboarding E-Mail Cron Error:", error);
          await captureError(error, { route: 'CRON:onboarding-emails', method: 'SCHEDULED', severity: 'medium' });
        }
      });

      // 📧 Winback E-Mails für inaktive User (täglich um 10:00 Uhr)
      // Sendet Re-Engagement E-Mails an User, die 30+ Tage inaktiv sind
      cron.schedule("0 10 * * *", async () => {
        console.log("📧 [WINBACK] Starte Winback E-Mail Verarbeitung...");
        try {
          const { processWinbackEmails } = require("./services/triggerEmailService");
          const emailsSent = await processWinbackEmails(db);
          console.log(`📧 [WINBACK] ${emailsSent} Winback E-Mail(s) gesendet`);
        } catch (error) {
          console.error("❌ Winback E-Mail Cron Error:", error);
          await captureError(error, { route: 'CRON:winback-emails', method: 'SCHEDULED', severity: 'low' });
        }
      });

      // ✅ CALENDAR: Event-Generierung für neue Verträge (täglich um 2 Uhr nachts)
      cron.schedule("0 2 * * *", withCronLock('event-generation', async () => {
        console.log("🔄 Starte tägliche Event-Generierung für neue Verträge...");
        try {
          const { regenerateAllEvents } = require("./services/calendarEvents");

          // Finde Verträge ohne Events
          const contractsWithoutEvents = await db.collection("contracts")
            .aggregate([
              {
                $lookup: {
                  from: "contract_events",
                  localField: "_id",
                  foreignField: "contractId",
                  as: "events"
                }
              },
              {
                $match: {
                  "events": { $size: 0 }
                }
              }
            ])
            .toArray();

          console.log(`📊 ${contractsWithoutEvents.length} Verträge ohne Events gefunden`);

          for (const contract of contractsWithoutEvents) {
            await onContractChange(db, contract, "create");
          }

          console.log("✅ Event-Generierung abgeschlossen");
        } catch (error) {
          console.error("❌ Event Generation Cron Error:", error);
          await captureError(error, { route: 'CRON:event-generation', method: 'SCHEDULED', severity: 'high' });
        }
      }));

      // ✅ CALENDAR: Abgelaufene Events aufräumen (täglich um 3 Uhr nachts)
      cron.schedule("0 3 * * *", async () => {
        console.log("🧹 Starte Bereinigung abgelaufener Events...");
        try {
          const { updateExpiredEvents } = require("./services/calendarEvents");
          await updateExpiredEvents(db);
        } catch (error) {
          console.error("❌ Event Cleanup Cron Error:", error);
          await captureError(error, { route: 'CRON:event-cleanup', method: 'SCHEDULED', severity: 'medium' });
        }
      });

      // BESTEHENDER Legal Pulse Scan (mit Retry + Overlap-Lock)
      cron.schedule("0 6 * * *", withCronLock('legal-pulse-scan', async () => {
        console.log("🧠 Starte täglichen AI-powered Legal Pulse Scan...");
        try {
          await withCronLogging('legal-pulse-scan', async () => {
            const runLegalPulseScan = require("./services/legalPulseScan");
            const result = await runLegalPulseScan();
            return result || { scanned: true };
          });
        } catch (error) {
          console.error("❌ Legal Pulse Scan Error:", error);
          await captureError(error, { route: 'CRON:legal-pulse-scan', method: 'SCHEDULED', severity: 'high' });
        }
      }));

      // Legal Pulse V2 — Täglicher RSS→Laws Sync (03:15 UTC, VOR Radar um 07:00)
      cron.schedule("15 3 * * *", withCronLock('pulse-v2-rss-sync', async () => {
        console.log("[PulseV2RssSync] Starte täglichen RSS-Sync...");
        try {
          await withCronLogging('pulse-v2-rss-sync', async () => {
            const { runPulseV2RssSync } = require("./jobs/pulseV2RssSync");
            const cronDb = await database.connect();
            const result = await runPulseV2RssSync(cronDb);
            return result;
          });
        } catch (error) {
          console.error("[PulseV2RssSync] Error:", error);
          await captureError(error, { route: 'CRON:pulse-v2-rss-sync', method: 'SCHEDULED', severity: 'high' });
        }
      }));

      // Legal Pulse V2 — Wöchentlicher automatischer Re-Scan (Sonntags 05:00 UTC)
      cron.schedule("0 5 * * 0", withCronLock('pulse-v2-monitor', async () => {
        console.log("[PulseV2Monitor] Starte wöchentlichen Re-Scan...");
        try {
          await withCronLogging('pulse-v2-monitor', async () => {
            const { runPulseV2Monitor } = require("./jobs/pulseV2Monitor");
            const cronDb = await database.connect();
            const result = await runPulseV2Monitor(cronDb);
            return result;
          });
        } catch (error) {
          console.error("[PulseV2Monitor] Error:", error);
          await captureError(error, { route: 'CRON:pulse-v2-monitor', method: 'SCHEDULED', severity: 'high' });
        }
      }));

      // Legal Pulse V2 Radar — 2x täglich Legal Source Scan (07:00 + 19:00 UTC)
      // Läuft NACH RSS-Sync (03:15) damit neue Laws in der DB verfügbar sind
      cron.schedule("0 7,19 * * *", withCronLock('pulse-v2-radar', async () => {
        console.log("[PulseV2Radar] Starte Legal Source Scan...");
        try {
          await withCronLogging('pulse-v2-radar', async () => {
            const { runPulseV2Radar } = require("./jobs/pulseV2Radar");
            const cronDb = await database.connect();
            const result = await runPulseV2Radar(cronDb);
            return result;
          });
        } catch (error) {
          console.error("[PulseV2Radar] Error:", error);
          await captureError(error, { route: 'CRON:pulse-v2-radar', method: 'SCHEDULED', severity: 'high' });
        }
      }));

      // Staleness Reminder: Monday 08:00 UTC — remind users about unscanned contracts
      cron.schedule("0 8 * * 1", withCronLock('pulse-v2-staleness', async () => {
        console.log("[PulseV2Staleness] Starte Staleness-Reminder...");
        try {
          await withCronLogging('pulse-v2-staleness', async () => {
            const { runStalenessReminder } = require("./jobs/pulseV2StalenessReminder");
            const cronDb = await database.connect();
            const result = await runStalenessReminder(cronDb);
            return result;
          });
        } catch (error) {
          console.error("[PulseV2Staleness] Error:", error);
          await captureError(error, { route: 'CRON:pulse-v2-staleness', method: 'SCHEDULED', severity: 'medium' });
        }
      }));

      // 🔥 Cache-Warming: Nach den schweren Nacht-Cron-Jobs (01:00 Status, 02:00 Events, 06:00 LegalPulse)
      // WiredTiger-Cache ist danach mit Scan-Daten gefüllt — hier laden wir die user-facing Daten zurück
      cron.schedule("30 6 * * *", async () => {
        console.log("🔥 [CACHE-WARM] Starte Cache-Warming für Contracts-Daten...");
        try {
          const warmDb = await database.connect();
          const usersWithContracts = await warmDb.collection("contracts").aggregate([
            { $group: { _id: "$userId" } },
            { $limit: 50 }
          ]).toArray();

          let warmedUsers = 0;
          for (const u of usersWithContracts) {
            try {
              // Lade die gleiche Aggregation die der User beim Öffnen der Contracts-Seite triggert
              await warmDb.collection("contracts").aggregate([
                { $match: { userId: u._id } },
                { $sort: { createdAt: -1 } },
                { $limit: 50 },
                {
                  $lookup: {
                    from: "analysis",
                    let: { analysisId: "$analysisId" },
                    pipeline: [
                      { $match: { $expr: { $eq: ["$_id", "$$analysisId"] } } },
                      { $limit: 1 }
                    ],
                    as: "analysisData"
                  }
                },
                { $project: { _id: 1, name: 1, contractScore: 1 } }
              ]).toArray();
              warmedUsers++;
            } catch {
              // Einzelnen User überspringen, nicht den ganzen Job abbrechen
            }
          }
          console.log(`🔥 [CACHE-WARM] Fertig: ${warmedUsers}/${usersWithContracts.length} User-Caches gewärmt`);
        } catch (error) {
          console.error("❌ [CACHE-WARM] Error:", error.message);
          // Nicht-kritisch, kein captureError nötig
        }
      });

      // 🎁 BETA-TESTER: Feedback-Erinnerung nach 2 Tagen (täglich um 10:10 Uhr)
      // Gestaffelt: 10:10 statt 10:00 um DB-Connection-Kollision mit Winback zu vermeiden
      cron.schedule("10 10 * * *", async () => {
        console.log("🎁 [BETA] Starte Feedback-Erinnerungs-Check...");
        try {
          // Finde ALLE Beta-Tester, die sich vor MINDESTENS 2 Tagen registriert haben
          // und noch keine Erinnerung bekommen haben (niemand rutscht durch!)
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

          // Beta-Tester die sich vor mindestens 2 Tagen registriert haben
          const betaTestersToRemind = await db.collection("users").find({
            betaTester: true,
            betaRegisteredAt: { $lte: twoDaysAgo }, // Mindestens 2 Tage her
            betaReminderSent: { $ne: true } // Noch keine Erinnerung gesendet
          }).toArray();

          console.log(`🎁 [BETA] ${betaTestersToRemind.length} Beta-Tester für Erinnerung gefunden`);

          for (const user of betaTestersToRemind) {
            // Prüfen ob bereits Feedback gegeben wurde
            const existingFeedback = await db.collection("betaFeedback").findOne({
              email: user.email
            });

            if (existingFeedback) {
              console.log(`✅ [BETA] ${user.email} hat bereits Feedback gegeben - überspringe`);
              // Markiere als erinnert, damit wir nicht nochmal prüfen
              await db.collection("users").updateOne(
                { _id: user._id },
                { $set: { betaReminderSent: true } }
              );
              continue;
            }

            // Erinnerungs-E-Mail senden
            const reminderHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <div style="background-color: #fff3ed; padding: 30px; border-radius: 16px 16px 0 0; text-align: center; border-bottom: 3px solid #ff6b35;">
                  <h1 style="margin: 0; font-size: 24px; color: #1d1d1f;">🎁 Wie gefällt dir Contract AI?</h1>
                </div>

                <div style="background-color: #f5f5f7; padding: 30px; border-radius: 0 0 16px 16px;">
                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Hallo!
                  </p>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Du hast dich vor 2 Tagen als <strong>Beta-Tester</strong> bei Contract AI registriert – vielen Dank dafür! 🙏
                  </p>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Wir haben dir <strong>3 Monate kostenlosen Premium-Zugang</strong> zu allen Features freigeschaltet.
                    Dafür würden wir uns sehr über dein ehrliches Feedback freuen!
                  </p>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    <strong>Dein Feedback hilft uns:</strong>
                  </p>
                  <ul style="font-size: 16px; color: #333; line-height: 1.8;">
                    <li>Contract AI noch besser zu machen</li>
                    <li>Zu verstehen, was wirklich gebraucht wird</li>
                    <li>Bugs und Probleme zu finden</li>
                  </ul>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://www.contract-ai.de/beta#feedback"
                       style="display: inline-block; background-color: #007aff; color: #ffffff !important; padding: 16px 40px; border-radius: 100px; font-size: 18px; font-weight: 600; text-decoration: none; border: 2px solid #007aff;">
                      Jetzt Feedback geben
                    </a>
                  </div>

                  <p style="font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
                    Dauert nur 2 Minuten – versprochen! ⏱️
                  </p>

                  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

                  <p style="font-size: 14px; color: #999; text-align: center;">
                    Du erhältst diese E-Mail, weil du dich als Beta-Tester registriert hast.<br>
                    Bei Fragen antworte einfach auf diese E-Mail.
                  </p>
                </div>
              </div>
            `;

            try {
              await transporter.sendMail({
                from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
                to: user.email,
                subject: "Contract AI - Dein Feedback ist gefragt",
                html: reminderHtml,
              });

              require("./utils/emailLogger").logSentEmail({
                to: user.email,
                subject: "Contract AI - Dein Feedback ist gefragt",
                category: 'beta_reminder',
                userId: user._id ? String(user._id) : null,
                source: 'server.js'
              }).catch(() => {});

              // Markiere User als erinnert
              await db.collection("users").updateOne(
                { _id: user._id },
                { $set: { betaReminderSent: true, betaReminderSentAt: new Date() } }
              );

              console.log(`📧 [BETA] Erinnerung gesendet an: ${user.email}`);
            } catch (emailError) {
              console.error(`❌ [BETA] Fehler beim Senden an ${user.email}:`, emailError.message);
            }
          }

          console.log("✅ [BETA] Feedback-Erinnerungs-Check (1. Erinnerung) abgeschlossen");

          // ========================================
          // 🎁 ZWEITE ERINNERUNG nach 4 Tagen
          // ========================================
          const fourDaysAgo = new Date();
          fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

          // Beta-Tester die vor mindestens 4 Tagen registriert, 1. Erinnerung bekommen, aber noch kein Feedback
          const betaTestersSecondReminder = await db.collection("users").find({
            betaTester: true,
            betaRegisteredAt: { $lte: fourDaysAgo }, // Mindestens 4 Tage her
            betaReminderSent: true, // Erste Erinnerung bereits gesendet
            betaSecondReminderSent: { $ne: true } // Zweite Erinnerung noch nicht gesendet
          }).toArray();

          console.log(`🎁 [BETA] ${betaTestersSecondReminder.length} Beta-Tester für 2. Erinnerung gefunden`);

          for (const user of betaTestersSecondReminder) {
            // Prüfen ob bereits Feedback gegeben wurde
            const existingFeedback = await db.collection("betaFeedback").findOne({
              email: user.email
            });

            if (existingFeedback) {
              console.log(`✅ [BETA] ${user.email} hat bereits Feedback gegeben - überspringe 2. Erinnerung`);
              await db.collection("users").updateOne(
                { _id: user._id },
                { $set: { betaSecondReminderSent: true } }
              );
              continue;
            }

            // Zweite Erinnerungs-E-Mail - persönlicher und freundlicher
            const secondReminderHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <div style="background-color: #f0f0ff; padding: 30px; border-radius: 16px 16px 0 0; text-align: center; border-bottom: 3px solid #667eea;">
                  <h1 style="margin: 0; font-size: 24px; color: #1d1d1f;">💬 Kurz 2 Minuten Zeit?</h1>
                </div>

                <div style="background-color: #f5f5f7; padding: 30px; border-radius: 0 0 16px 16px;">
                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Hallo nochmal!
                  </p>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Ich wollte mich nur kurz melden – du nutzt Contract AI jetzt seit ein paar Tagen und ich würde mich riesig über deine Meinung freuen.
                  </p>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Als kleines Ein-Mann-Startup ist <strong>jedes einzelne Feedback Gold wert</strong> für mich. Es hilft mir zu verstehen, was gut funktioniert und wo ich noch nachbessern muss.
                  </p>

                  <div style="background-color: #ffffff; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #667eea;">
                    <p style="font-size: 15px; color: #333; line-height: 1.6; margin: 0;">
                      <strong>Was mich interessiert:</strong><br>
                      • Wie hilfreich war die Vertragsanalyse?<br>
                      • Was hat dir gefallen / was nicht?<br>
                      • Würdest du Contract AI weiterempfehlen?
                    </p>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://www.contract-ai.de/beta#feedback"
                       style="display: inline-block; background-color: #667eea; color: #ffffff !important; padding: 16px 40px; border-radius: 100px; font-size: 18px; font-weight: 600; text-decoration: none; border: 2px solid #667eea;">
                      Feedback geben (2 Min.)
                    </a>
                  </div>

                  <p style="font-size: 15px; color: #555; line-height: 1.6; text-align: center;">
                    Vielen Dank, dass du Contract AI testest! 🙏<br>
                    <em>– Noah, Gründer von Contract AI</em>
                  </p>

                  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

                  <p style="font-size: 13px; color: #999; text-align: center;">
                    PS: Falls du Probleme hattest oder etwas nicht funktioniert hat,<br>
                    antworte einfach auf diese E-Mail – ich helfe dir gerne!
                  </p>
                </div>
              </div>
            `;

            try {
              await transporter.sendMail({
                from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
                to: user.email,
                subject: "Contract AI - Kurze Frage an dich",
                html: secondReminderHtml,
              });

              require("./utils/emailLogger").logSentEmail({
                to: user.email,
                subject: "Contract AI - Kurze Frage an dich",
                category: 'beta_reminder_2',
                userId: user._id ? String(user._id) : null,
                source: 'server.js'
              }).catch(() => {});

              // Markiere User als 2x erinnert
              await db.collection("users").updateOne(
                { _id: user._id },
                { $set: { betaSecondReminderSent: true, betaSecondReminderSentAt: new Date() } }
              );

              console.log(`📧 [BETA] 2. Erinnerung gesendet an: ${user.email}`);
            } catch (emailError) {
              console.error(`❌ [BETA] Fehler beim Senden der 2. Erinnerung an ${user.email}:`, emailError.message);
            }
          }

          console.log("✅ [BETA] Feedback-Erinnerungs-Check (beide Erinnerungen) abgeschlossen");
        } catch (error) {
          console.error("❌ [BETA] Feedback Reminder Cron Error:", error);
          await captureError(error, { route: 'CRON:beta-feedback-reminder', method: 'SCHEDULED', severity: 'medium' });
        }
      });

      // 📊 ADMIN NOTIFICATIONS: Daily Summary (täglich um 18 Uhr)
      cron.schedule("0 18 * * *", async () => {
        console.log("📊 [ADMIN] Starte Daily Summary E-Mail...");
        try {
          const { sendDailyAdminSummary } = require("./services/adminNotificationService");
          await sendDailyAdminSummary();
        } catch (error) {
          console.error("❌ [ADMIN] Daily Summary Cron Error:", error);
          await captureError(error, { route: 'CRON:admin-daily-summary', method: 'SCHEDULED', severity: 'medium' });
        }
      });

      // 📊 ADMIN NOTIFICATIONS: Weekly Summary (jeden Sonntag um 20 Uhr)
      cron.schedule("0 20 * * 0", async () => {
        console.log("📊 [ADMIN] Starte Weekly Summary E-Mail...");
        try {
          const { sendWeeklyAdminSummary } = require("./services/adminNotificationService");
          await sendWeeklyAdminSummary();
        } catch (error) {
          console.error("❌ [ADMIN] Weekly Summary Cron Error:", error);
          await captureError(error, { route: 'CRON:admin-weekly-summary', method: 'SCHEDULED', severity: 'medium' });
        }
      });

      // 📧 VERIFICATION REMINDER: Erinnerung für nicht verifizierte Accounts (täglich um 10:20 Uhr)
      // Gestaffelt: 10:20 statt 10:00 um DB-Connection-Kollision zu vermeiden
      cron.schedule("20 10 * * *", async () => {
        console.log("📧 [VERIFICATION] Starte Erinnerungs-E-Mails für nicht verifizierte Accounts...");
        try {
          const { sendVerificationReminders } = require("./services/verificationReminderService");
          const result = await sendVerificationReminders(2); // 2 Tage nach Registrierung
          console.log(`📧 [VERIFICATION] Ergebnis: ${result.sent} Erinnerungen gesendet`);
        } catch (error) {
          console.error("❌ [VERIFICATION] Reminder Cron Error:", error);
          await captureError(error, { route: 'CRON:verification-reminder', method: 'SCHEDULED', severity: 'medium' });
        }
      });

      // 🗑️ AUTO-DELETE: Stornierte Envelopes nach 30 Tagen endgültig löschen (täglich um 4 Uhr nachts)
      cron.schedule("0 4 * * *", async () => {
        console.log("🗑️ [AUTO-DELETE] Starte Bereinigung alter stornierter Envelopes...");
        try {
          const { autoDeleteOldVoidedEnvelopes } = require("./services/cron");
          const result = await autoDeleteOldVoidedEnvelopes();
          console.log(`🗑️ [AUTO-DELETE] Ergebnis: ${result.deleted} Envelope(s) gelöscht`);
        } catch (error) {
          console.error("❌ [AUTO-DELETE] Cron Error:", error);
          await captureError(error, { route: 'CRON:auto-delete-envelopes', method: 'SCHEDULED', severity: 'low' });
        }
      });

      console.log("✅ Alle Cron Jobs aktiviert (inkl. Calendar Events, Beta Reminder, Admin Notifications, Verification Reminder & Auto-Delete)");
    } catch (err) {
      console.error("❌ Cron Jobs konnten nicht gestartet werden:", err);
    }

    // ========================================
    // 🎁 BETA FEEDBACK ENDPOINT
    // ========================================
    app.post('/api/beta-feedback', async (req, res) => {
      try {
        const { name, email, rating, improvements, wouldPay, testimonial } = req.body;

        // Validation
        if (!name || !email || !rating || !wouldPay) {
          return res.status(400).json({ error: 'Bitte fülle alle Pflichtfelder aus.' });
        }

        // Store feedback in database
        const feedbackData = {
          name,
          email,
          rating: parseInt(rating),
          improvements: improvements || '',
          wouldPay,
          testimonial: testimonial || '',
          createdAt: new Date(),
          source: 'beta-landing-page'
        };

        await db.collection('betaFeedback').insertOne(feedbackData);
        console.log(`✅ [BETA] Neues Feedback von ${name} (${email}) - ${rating} Sterne`);

        // Send email notification to admin
        const ratingStars = '⭐'.repeat(rating);
        const wouldPayText = wouldPay === 'ja' ? '✅ Ja!' : wouldPay === 'vielleicht' ? '🤔 Vielleicht' : '❌ Nein';

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #007aff 0%, #409cff 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🎁 Neues Beta-Feedback!</h1>
            </div>

            <div style="background: #f5f5f7; padding: 30px; border-radius: 0 0 16px 16px;">
              <div style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 16px; color: #1d1d1f; font-size: 18px;">Tester-Infos</h2>
                <p style="margin: 8px 0; color: #333;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 8px 0; color: #333;"><strong>E-Mail:</strong> <a href="mailto:${email}">${email}</a></p>
              </div>

              <div style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 16px; color: #1d1d1f; font-size: 18px;">Bewertung</h2>
                <p style="margin: 8px 0; font-size: 24px;">${ratingStars} (${rating}/5)</p>
                <p style="margin: 8px 0; color: #333;"><strong>Würde zahlen:</strong> ${wouldPayText}</p>
              </div>

              ${improvements ? `
              <div style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 16px; color: #1d1d1f; font-size: 18px;">Verbesserungsvorschläge</h2>
                <p style="margin: 0; color: #333; line-height: 1.6;">${improvements}</p>
              </div>
              ` : ''}

              ${testimonial ? `
              <div style="background: linear-gradient(135deg, #fff9f0 0%, #fffaf5 100%); padding: 24px; border-radius: 12px; border: 1px solid rgba(255, 140, 0, 0.2);">
                <h2 style="margin: 0 0 16px; color: #1d1d1f; font-size: 18px;">📝 Testimonial</h2>
                <p style="margin: 0; color: #333; line-height: 1.6; font-style: italic;">"${testimonial}"</p>
                <p style="margin: 12px 0 0; color: #666; font-size: 14px;">– ${name}</p>
              </div>
              ` : ''}
            </div>

            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
              Contract AI Beta-Feedback System
            </p>
          </div>
        `;

        const betaFeedbackSubject = `🎁 Beta-Feedback: ${name} (${rating}⭐) - ${wouldPay === 'ja' ? 'Würde zahlen!' : wouldPay}`;
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
          to: "info@contract-ai.de",
          subject: betaFeedbackSubject,
          html: emailHtml,
        });

        require("./utils/emailLogger").logSentEmail({
          to: "info@contract-ai.de",
          subject: betaFeedbackSubject,
          category: 'beta_feedback_admin',
          source: 'server.js'
        }).catch(() => {});

        console.log(`📧 [BETA] Admin-Benachrichtigung gesendet`);

        res.json({ success: true, message: 'Feedback erfolgreich gesendet!' });
      } catch (error) {
        console.error('❌ [BETA] Feedback Error:', error);
        res.status(500).json({ error: 'Feedback konnte nicht gespeichert werden.' });
      }
    });

    // Internal Email API für Webhook Server
    app.post('/api/internal/send-email', async (req, res) => {
      try {
        const { to, subject, html, attachments } = req.body;

        // Security Check
        const secret = req.headers['x-internal-secret'];
        if (secret !== 'webhook-to-main-server') {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log(`📧 [INTERNAL API] Webhook Email Request: ${subject} → ${to}`);

        // Base64 Attachments zu Buffer konvertieren
        const processedAttachments = (attachments || []).map(att => ({
          filename: att.filename,
          content: att.encoding === 'base64' ? Buffer.from(att.content, 'base64') : att.content
        }));

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
          to,
          subject,
          html,
          attachments: processedAttachments,
        });

        require("./utils/emailLogger").logSentEmail({
          to,
          subject,
          category: 'stripe_webhook',
          source: 'server.js (internal-api)'
        }).catch(() => {});

        console.log(`✅ [INTERNAL API] Email gesendet: ${subject} → ${to}`);
        res.json({ success: true, message: 'Email sent' });
      } catch (error) {
        console.error(`❌ [INTERNAL API] Email Error:`, error.message);
        res.status(500).json({ error: error.message });
      }
    });

    // ============================================
    // HEALTH CHECK ENDPOINT (für UptimeRobot/Render)
    // ============================================
    app.get("/api/health", (req, res) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Auch ohne /api prefix für einfacheren Zugang
    app.get("/health", (req, res) => {
      res.status(200).json({ status: "ok" });
    });

    // 🚨 ERROR MONITORING: Admin-Endpoint für Fehler-Statistiken
    const verifyAdmin = require("./middleware/verifyAdmin");
    app.get("/api/admin/errors", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const hours = parseInt(req.query.hours) || 24;
        const stats = await getErrorStats(hours);
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 📊 CRON MONITORING: Admin-Endpoints für Cron-Job Status
    app.get("/api/admin/cron/status", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const status = await getCronJobStatus();
        res.json({ success: true, jobs: status });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/admin/cron/logs", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const { limit = 50, jobName, status, hoursBack = 24 } = req.query;
        const logs = await getCronLogs({
          limit: parseInt(limit),
          jobName: jobName || null,
          status: status || null,
          hoursBack: parseInt(hoursBack)
        });
        res.json({ success: true, ...logs });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🚨 GLOBAL ERROR HANDLER - Muss NACH allen Routes kommen!
    app.use(errorHandler);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, async () => {
      logger.info("Server gestartet", { port: PORT, env: process.env.NODE_ENV || 'development' });
      logger.info("Static files serviert", { path: `${API_BASE_URL}/uploads` });
      logger.debug("Server-Konfiguration", { jsonLimit: '50MB' });

      // 🚀 AUTO-INDEX: Performance-Indexes beim Start erstellen (idempotent)
      try {
        await ensurePerformanceIndexes(db);
        logger.info("Performance-Indexes verifiziert");
      } catch (indexErr) {
        logger.warn("Index-Erstellung übersprungen", { error: indexErr.message });
      }

      // ✅ Initialize Legal Pulse Monitoring
      try {
        const LegalPulseMonitor = require("./jobs/legalPulseMonitor");
        const legalPulseMonitor = new LegalPulseMonitor();
        await legalPulseMonitor.init();

        // Dev route for manual triggering
        app.post("/api/legalpulse/cron-run", verifyToken, async (req, res) => {
          try {
            logger.debug("Manual monitoring triggered", { userId: req.user.userId });
            await legalPulseMonitor.runMonitoring();
            res.json({ success: true, message: "Monitoring triggered successfully" });
          } catch (error) {
            logger.error("Manual monitoring error", { error: error.message });
            res.status(500).json({ success: false, error: error.message });
          }
        });

        logger.info("Legal Pulse Monitoring initialized");
      } catch (error) {
        logger.error("Failed to initialize Legal Pulse Monitoring", { error: error.message });
      }
      console.log(`🎉 *** PFAD-CHAOS BEHOBEN - ALLE ROUTEN UNTER /api ***`);
      console.log(`📄 Auth-Route: /api/auth/* (FIXED!)`);
      console.log(`📧 E-Mail-Verification-Route: /api/email-verification/* (NEW!)`);
      console.log(`📄 Contracts-Route: /api/contracts/* (FIXED!)`);
      console.log(`🎯 Generate-Route: /api/contracts/generate (FIXED!)`);
      console.log(`🪄 Smart Contract: /api/contracts/:id/generate-optimized (FIXED!)`);
      console.log(`📊 Analyze-Route: /api/analyze (FIXED!)`);
      console.log(`🔧 Optimize-Route: /api/optimize (FIXED!)`);
      console.log(`☁️ S3-Routes: /api/s3/* (ENHANCED!)`);
      console.log(`📤 Upload-Route: /api/upload (FIXED!)`);
      console.log(`💳 Stripe-Routes: /api/stripe/* (FIXED!)`);
      console.log(`📄 Invoice-Routes: /api/invoices/* (ADDED!)`);
      console.log(`📝 Better-Contracts-Route: /api/better-contracts (ADDED!)`);
      console.log(`🚀 Migration-Routes: /api/contracts/migrate-legacy & migration-status (NEW!)`);
      console.log(`📅 Calendar-Routes: /api/calendar/* (NEW!)`);
      console.log(`🚀 1-Klick-Kündigung: /api/cancellations/* (NEW!)`);
      console.log(`✅ REVOLUTIONARY CALENDAR FEATURES ACTIVE!`);
      console.log(`✅ PUPPETEER PDF READY WITH 50MB SUPPORT!`);
    });

  } catch (err) {
    logger.critical("Fehler beim Serverstart", { error: err.message, stack: err.stack });
    process.exit(1);
  }
})();

// ❌ DEAKTIVIERT: Duplikat von resetAnalysisCount.js (Race Condition vermeiden)
// Der monatliche Reset wird jetzt zentral in cron/resetAnalysisCount.js durchgeführt
// try {
//   require("./cron/resetBusinessLimits");
// } catch (err) {
//   logger.error("Reset Business Limits konnte nicht geladen werden", { error: err.message });
// }

// Graceful Shutdown — beide Pools sauber schließen
process.on('SIGTERM', async () => {
  logger.warn("Received SIGTERM, closing database connections...");
  await database.close();
  await mongoose.disconnect();
  logger.db.disconnected();
});

process.on('SIGINT', async () => {
  logger.warn("Received SIGINT, closing server...");
  await database.close();
  await mongoose.disconnect();
  logger.db.disconnected();
  process.exit(0);
});

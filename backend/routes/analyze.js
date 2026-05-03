// 📊 backend/routes/analyze.js - ENHANCED DEEP LAWYER-LEVEL CONTRACT ANALYSIS + CRITICAL FIXES + AUTO-RENEWAL
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { extractTextFromBuffer, isSupportedMimetype, SUPPORTED_MIMETYPES } = require("../services/textExtractor");
const pdfExtractor = require("../services/pdfExtractor");
const fs = require("fs").promises;
const fsSync = require("fs");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { ObjectId } = require("mongodb");
const database = require("../config/database");
const path = require("path");
const rateLimit = require("express-rate-limit"); // 🚦 Rate Limiting
const contractAnalyzer = require("../services/contractAnalyzer"); // 📋 Provider Detection Import
const { generateEventsForContract, cleanAndRegenerateAIEvents } = require("../services/calendarEvents"); // 🆕 CALENDAR EVENTS IMPORT
const AILegalPulse = require("../services/aiLegalPulse"); // ⚡ NEW: Legal Pulse Risk Analysis
const { getInstance: getCostTrackingService } = require("../services/costTracking"); // 💰 NEW: Cost Tracking
const { clauseParser } = require("../services/legalLens"); // 🔍 Legal Lens Pre-Processing
const { isBusinessOrHigher, isEnterpriseOrHigher, getFeatureLimit, PLANS } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen
const { sendLimitReachedEmail, sendAlmostAtLimitEmail } = require("../services/triggerEmailService"); // 📧 Behavior-based Emails
const { embedContractAsync } = require("../services/contractEmbedder"); // 🔍 Auto-Embedding for Legal Pulse Monitoring
const dateHuntService = require("../services/dateHuntService"); // 📅 Stufe 2: Dedizierte Datums-Extraktion mit Evidence-Validierung

const router = express.Router();

// ✅ Fix UTF-8 Encoding für Dateinamen mit deutschen Umlauten
const { fixUtf8Filename } = require("../utils/fixUtf8");

// 🚦 RATE LIMITING - Schutz vor Missbrauch und Kosten-Explosion
const analyzeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten Zeitfenster
  max: 10, // Maximal 10 Analyse-Requests pro 15 Minuten pro User
  message: {
    success: false,
    message: "Zu viele Analyse-Anfragen. Bitte warten Sie 15 Minuten bevor Sie weitere Verträge analysieren.",
    error: "RATE_LIMIT_EXCEEDED",
    retryAfter: "15 minutes",
    tip: "Premium-User haben höhere Limits. Upgrade jetzt!"
  },
  standardHeaders: true, // RateLimit-* Headers senden
  legacyHeaders: false,
  // Rate Limit pro User-ID (aus JWT Token)
  keyGenerator: (req) => {
    return req.user?.userId || req.ip; // Fallback auf IP wenn kein User
  },
  // Handler für Rate Limit Erreicht
  handler: (req, res) => {
    console.warn(`⚠️ [RATE-LIMIT] User ${req.user?.userId || req.ip} hat Analyse-Limit erreicht`);
    res.status(429).json({
      success: false,
      message: "Zu viele Analyse-Anfragen. Bitte warten Sie 15 Minuten.",
      error: "RATE_LIMIT_EXCEEDED",
      retryAfter: "15 minutes",
      currentLimit: "10 Analysen / 15 Minuten",
      upgradeInfo: {
        message: "Premium-User haben höhere Limits",
        url: "/pricing"
      }
    });
  }
});

// ⚡ Initialize Legal Pulse analyzer
const aiLegalPulse = new AILegalPulse();

// ===== S3 INTEGRATION (AWS SDK v3) =====
let S3Client, PutObjectCommand, HeadBucketCommand, GetObjectCommand, s3Instance;
let S3_AVAILABLE = false;
let S3_CONFIGURED = false;
let S3_CONFIG_ERROR = null;

/**
 * 🛡️ BULLETPROOF S3 CONFIGURATION (AWS SDK v3)
 * Tries to configure S3, falls back to local if anything goes wrong
 */
const initializeS3 = () => {
  try {
    console.log("🔧 [ANALYZE] Initializing S3 configuration (AWS SDK v3)...");

    // Check if all required environment variables are present
    const requiredEnvVars = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'S3_BUCKET_NAME'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    // Try to load AWS SDK v3 (NO multer-s3)
    try {
      const { S3Client: _S3Client, PutObjectCommand: _PutObjectCommand, HeadBucketCommand: _HeadBucketCommand, GetObjectCommand: _GetObjectCommand } = require("@aws-sdk/client-s3");
      S3Client = _S3Client;
      PutObjectCommand = _PutObjectCommand;
      HeadBucketCommand = _HeadBucketCommand;
      GetObjectCommand = _GetObjectCommand;
      console.log("✅ [ANALYZE] AWS SDK v3 loaded successfully");
    } catch (importError) {
      throw new Error(`Failed to import S3 dependencies: ${importError.message}`);
    }

    // Configure AWS S3 Client (v3 style)
    s3Instance = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log("✅ [ANALYZE] AWS S3 Client v3 created successfully");
    console.log(`✅ [ANALYZE] Region: ${process.env.AWS_REGION}`);
    console.log(`✅ [ANALYZE] Bucket: ${process.env.S3_BUCKET_NAME}`);

    S3_CONFIGURED = true;
    S3_CONFIG_ERROR = null;

    // Test S3 connectivity (async, don't block startup)
    testS3Connectivity();

    return true;

  } catch (error) {
    console.error("❌ [ANALYZE] S3 Configuration failed:", error.message);
    S3_CONFIGURED = false;
    S3_AVAILABLE = false;
    S3_CONFIG_ERROR = error.message;

    // Don't throw - fall back to local upload
    console.log("🔄 [ANALYZE] Falling back to LOCAL_UPLOAD mode");
    return false;
  }
};

/**
 * 🧪 TEST S3 CONNECTIVITY (AWS SDK v3)
 * Async test that doesn't block the application startup
 */
const testS3Connectivity = async () => {
  if (!S3_CONFIGURED || !s3Instance || !HeadBucketCommand) {
    return false;
  }

  try {
    console.log("🧪 [ANALYZE] Testing bucket connectivity...");

    // Test bucket access with SDK v3
    const command = new HeadBucketCommand({
      Bucket: process.env.S3_BUCKET_NAME
    });

    await s3Instance.send(command);

    console.log("✅ [ANALYZE] Bucket connectivity test successful");
    S3_AVAILABLE = true;
    return true;

  } catch (error) {
    console.error("❌ [ANALYZE] Bucket connectivity test failed:", error.message);
    S3_AVAILABLE = false;

    // Log helpful error messages
    if (error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403) {
      console.error("❌ [ANALYZE] Access denied - check IAM permissions");
    } else if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.error("❌ [ANALYZE] Bucket not found - check bucket name and region");
    }

    return false;
  }
};

// Initialize S3 on startup
const s3InitSuccess = initializeS3();

// ===== UPLOAD CONFIGURATION (DYNAMIC) - UNCHANGED =====
const UPLOAD_PATH = path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists for fallback
try {
  if (!fsSync.existsSync(UPLOAD_PATH)) {
    fsSync.mkdirSync(UPLOAD_PATH, { recursive: true });
    console.log(`📁 [UPLOAD] Local upload directory created: ${UPLOAD_PATH}`);
  } else {
    console.log(`📁 [UPLOAD] Local upload directory exists: ${UPLOAD_PATH}`);
  }
} catch (err) {
  console.error(`❌ [UPLOAD] Error creating upload directory:`, err);
}

/**
 * 🔄 MULTER CONFIGURATION (AWS SDK v3 Compatible)
 * Always uses disk storage first, then manually uploads to S3
 */
const createUploadMiddleware = () => {
  console.log("📄 [ANALYZE] Using disk storage configuration (manual S3 upload after)");

  const storage = multer.diskStorage({
    destination: UPLOAD_PATH,
    filename: (req, file, cb) => {
      const filename = Date.now() + path.extname(file.originalname);
      console.log(`📁 [ANALYZE] Generated filename: ${filename}`);
      cb(null, filename);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
      if (isSupportedMimetype(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Nur PDF- und DOCX-Dateien sind erlaubt'), false);
      }
    }
  });
};

/**
 * 🔄 Upload file to S3 using AWS SDK v3
 */
const uploadToS3 = async (localFilePath, originalFilename, userId) => {
  try {
    const fileBuffer = await fs.readFile(localFilePath);
    const s3Key = `contracts/${Date.now()}-${originalFilename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: originalFilename?.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
      Metadata: {
        uploadDate: new Date().toISOString(),
        userId: userId || 'unknown',
      },
    });

    await s3Instance.send(command);

    const s3Location = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    console.log(`✅ [ANALYZE S3] Successfully uploaded to: ${s3Location}`);

    return {
      s3Key,
      s3Location,
      s3Bucket: process.env.S3_BUCKET_NAME,
    };
  } catch (error) {
    console.error(`❌ [ANALYZE S3] Upload failed:`, error);
    throw error;
  }
};

/**
 * 🔒 PLAUSIBILITÄTS-VALIDIERUNG für importantDates
 * Stellt sicher dass GPT keine unsinnigen Daten liefert
 * @returns {object} { valid: boolean, reason?: string, confidence: number }
 */
const validateImportantDate = (dateObj, contract, requestId) => {
  if (!dateObj || !dateObj.date) {
    return { valid: false, reason: 'missing_date', confidence: 0 };
  }

  // Parse das Datum
  let date;
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateObj.date)) {
      date = new Date(dateObj.date);
    } else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateObj.date)) {
      const parts = dateObj.date.split('.');
      date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else {
      date = new Date(dateObj.date);
    }
  } catch (e) {
    return { valid: false, reason: 'parse_error', confidence: 0 };
  }

  if (!date || isNaN(date.getTime())) {
    return { valid: false, reason: 'invalid_date', confidence: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 🔒 PLAUSIBILITÄTS-CHECKS:

  // 1. Nicht mehr als 30 Jahre in der Zukunft (unrealistisch für die meisten Verträge)
  const maxFuture = new Date();
  maxFuture.setFullYear(maxFuture.getFullYear() + 30);
  if (date > maxFuture) {
    console.log(`⚠️ [${requestId}] importantDate rejected: ${dateObj.type} - zu weit in Zukunft (${dateObj.date})`);
    return { valid: false, reason: 'too_far_future', confidence: 0 };
  }

  // 2. Nicht mehr als 50 Jahre in der Vergangenheit (außer für historische Verträge)
  const maxPast = new Date();
  maxPast.setFullYear(maxPast.getFullYear() - 50);
  if (date < maxPast) {
    console.log(`⚠️ [${requestId}] importantDate rejected: ${dateObj.type} - zu weit in Vergangenheit (${dateObj.date})`);
    return { valid: false, reason: 'too_far_past', confidence: 0 };
  }

  // 3. end_date muss nach start_date liegen (wenn beide vorhanden)
  if (dateObj.type === 'end_date' && contract?.startDate) {
    const startDate = new Date(contract.startDate);
    if (date < startDate) {
      console.log(`⚠️ [${requestId}] importantDate rejected: end_date vor start_date (${dateObj.date} < ${contract.startDate})`);
      return { valid: false, reason: 'end_before_start', confidence: 0 };
    }
  }

  // 4. cancellation_deadline sollte vor end_date liegen
  if (dateObj.type === 'cancellation_deadline' && contract?.expiryDate) {
    const endDate = new Date(contract.expiryDate);
    if (date > endDate) {
      console.log(`⚠️ [${requestId}] importantDate rejected: cancellation_deadline nach end_date (${dateObj.date} > ${contract.expiryDate})`);
      return { valid: false, reason: 'cancellation_after_end', confidence: 0 };
    }
  }

  // 5. minimum_term_end sollte nach start_date liegen
  if (dateObj.type === 'minimum_term_end' && contract?.startDate) {
    const startDate = new Date(contract.startDate);
    if (date < startDate) {
      console.log(`⚠️ [${requestId}] importantDate rejected: minimum_term_end vor start_date`);
      return { valid: false, reason: 'minimum_before_start', confidence: 0 };
    }
  }

  // ✅ Bestimme Konfidenz basierend auf calculated Flag und Typ
  let confidence = 90; // Base für explizit extrahierte Daten

  if (dateObj.calculated === true) {
    confidence = 70; // Berechnete Daten haben niedrigere Konfidenz
  }

  // Kritische Typen bekommen leicht niedrigere Konfidenz wenn berechnet
  const criticalTypes = ['cancellation_deadline', 'end_date', 'minimum_term_end'];
  if (criticalTypes.includes(dateObj.type) && dateObj.calculated) {
    confidence = 65;
  }

  console.log(`✅ [${requestId}] importantDate validated: ${dateObj.type} = ${dateObj.date} (Konfidenz: ${confidence}%)`);
  return { valid: true, confidence, parsedDate: date };
};

/**
 * 🔒 Filtert und validiert alle importantDates
 * Entfernt ungültige Einträge und fügt Konfidenz hinzu
 */
const validateAndFilterImportantDates = (importantDates, contract, requestId) => {
  if (!importantDates || !Array.isArray(importantDates)) {
    return [];
  }

  const validatedDates = [];

  for (const dateObj of importantDates) {
    const validation = validateImportantDate(dateObj, contract, requestId);

    if (validation.valid) {
      validatedDates.push({
        ...dateObj,
        confidence: validation.confidence,
        validated: true
      });
    }
  }

  console.log(`📊 [${requestId}] importantDates Validierung: ${validatedDates.length}/${importantDates.length} gültig`);
  return validatedDates;
};

/**
 * 🔧 FIX: Extract end_date from AI-analyzed importantDates
 * 🔒 NEU: Nur verwenden wenn Regex-Konfidenz niedrig ist!
 * If importantDates contains type='end_date', use that to update expiryDate
 */
const extractEndDateFromImportantDates = (importantDates, regexEndDateConfidence = 0, requestId = '') => {
  if (!importantDates || !Array.isArray(importantDates)) {
    return null;
  }

  // Find the end_date entry
  const endDateEntry = importantDates.find(d => d.type === 'end_date');
  if (!endDateEntry || !endDateEntry.date) {
    return null;
  }

  // 🔒 SICHERHEITS-CHECK: Nur GPT-Datum verwenden wenn Regex unsicher ist
  // Wenn Regex bereits ein hochkonfidentes Datum hat, NICHT überschreiben!
  const MIN_REGEX_CONFIDENCE_TO_KEEP = 70; // Wenn Regex >= 70%, behalte Regex-Datum

  if (regexEndDateConfidence >= MIN_REGEX_CONFIDENCE_TO_KEEP) {
    console.log(`🔒 [${requestId}] GPT end_date NICHT verwendet - Regex-Konfidenz ausreichend (${regexEndDateConfidence}% >= ${MIN_REGEX_CONFIDENCE_TO_KEEP}%)`);
    return null; // Regex-Datum behalten
  }

  try {
    // Parse the date - handles formats like "2028-01-03", "03.01.2028", "3.1.2028"
    let dateStr = endDateEntry.date;
    let parsedDate;

    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      parsedDate = new Date(dateStr);
    }
    // German format (DD.MM.YYYY or D.M.YYYY)
    else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('.');
      parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    // Fallback: let Date parse it
    else {
      parsedDate = new Date(dateStr);
    }

    // Validate the date
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      // 🔒 Zusätzlicher Plausibilitätscheck
      const today = new Date();
      const maxFuture = new Date();
      maxFuture.setFullYear(maxFuture.getFullYear() + 30);

      if (parsedDate > maxFuture) {
        console.warn(`⚠️ [${requestId}] GPT end_date REJECTED - zu weit in Zukunft: ${parsedDate.toISOString()}`);
        return null;
      }

      console.log(`✅ [${requestId}] GPT end_date akzeptiert (Regex-Konfidenz war nur ${regexEndDateConfidence}%): ${parsedDate.toISOString()}`);
      return parsedDate;
    }
  } catch (err) {
    console.warn(`⚠️ [${requestId}] Failed to parse end_date from importantDates: ${endDateEntry.date}`, err.message);
  }

  return null;
};

/**
 * 📄 DYNAMIC FILE READING (AWS SDK v3) - UNCHANGED
 * Reads file from S3 if uploaded there, from local disk otherwise
 */
const readUploadedFile = async (fileInfo, requestId) => {
  try {
    if (fileInfo.location && fileInfo.key && S3_AVAILABLE && s3Instance && GetObjectCommand) {
      // File was uploaded to S3 (AWS SDK v3)
      console.log(`📖 [${requestId}] Reading file from S3: ${fileInfo.key}`);
      
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileInfo.key
      });
      
      const response = await s3Instance.send(command);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      console.log(`✅ [${requestId}] S3 file read successfully: ${buffer.length} bytes`);
      return buffer;
      
    } else {
      // File was uploaded locally
      console.log(`📖 [${requestId}] Reading file from local disk: ${fileInfo.filename}`);
      
      const filePath = path.join(UPLOAD_PATH, fileInfo.filename);
      
      if (!fsSync.existsSync(filePath)) {
        throw new Error(`Local file not found: ${filePath}`);
      }
      
      const buffer = await fs.readFile(filePath);
      console.log(`✅ [${requestId}] Local file read successfully: ${buffer.length} bytes`);
      return buffer;
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error reading uploaded file:`, error.message);
    throw new Error(`Failed to read uploaded file: ${error.message}`);
  }
};

/**
 * 📊 GET UPLOAD TYPE AND FILE URL - UNCHANGED
 * Returns appropriate upload type and file URL based on where file was stored
 */
const getUploadInfo = (fileInfo) => {
  if (fileInfo.location && fileInfo.key) {
    // File was uploaded to S3
    return {
      uploadType: "S3_UPLOAD",
      fileUrl: fileInfo.location,
      s3Info: {
        bucket: fileInfo.bucket || process.env.S3_BUCKET_NAME,
        key: fileInfo.key,
        location: fileInfo.location,
        etag: fileInfo.etag
      }
    };
  } else {
    // File was uploaded locally
    return {
      uploadType: "LOCAL_UPLOAD",
      fileUrl: `/uploads/${fileInfo.filename}`,
      localInfo: {
        filename: fileInfo.filename,
        path: fileInfo.path
      }
    };
  }
};

// ===== EXISTING SUPPORT MODULES - UNCHANGED =====

// ✅ FALLBACK: crypto only import if available
let crypto;
try {
  crypto = require("crypto");
  console.log("✅ Crypto module loaded successfully");
} catch (err) {
  console.warn("⚠️ Crypto module not available:", err.message);
  crypto = null;
}

// ✅ FALLBACK: saveContract with try-catch
let saveContract;
try {
  saveContract = require("../services/saveContract");
  console.log("✅ SaveContract service loaded successfully");
} catch (err) {
  console.warn("⚠️ SaveContract service not available:", err.message);
  saveContract = null;
}

// ✅ Rate Limiting for GPT-4
let lastGPT4Request = 0;
const GPT4_MIN_INTERVAL = 4000; // 4 seconds between GPT-4 requests

// ✅ FIXED: Updated Token limits for different models
const MODEL_LIMITS = {
  'gpt-4': 8192,                    // ❌ Original GPT-4 (problematic)
  'gpt-4-turbo': 128000,           // ✅ Turbo version (what we'll use)
  'gpt-4o': 128000,                // ✅ Latest version
  'gpt-3.5-turbo': 16384
};

// 🚨 STRIKTE TOKEN & DOKUMENT LIMITS - Kostenkontrolle!
const ANALYSIS_LIMITS = {
  // Free-User Limits
  FREE_MAX_PDF_PAGES: 50,
  FREE_MAX_INPUT_TOKENS: 20000,      // ~80.000 Zeichen
  // Business-User Limits
  BUSINESS_MAX_PDF_PAGES: 100,
  BUSINESS_MAX_INPUT_TOKENS: 40000,  // ~160.000 Zeichen
  // Enterprise-User Limits
  ENTERPRISE_MAX_PDF_PAGES: 200,
  ENTERPRISE_MAX_INPUT_TOKENS: 60000, // ~240.000 Zeichen
  // Output
  MAX_OUTPUT_TOKENS: 4000,
};

/**
 * Gibt Limits basierend auf dem Plan zurück
 */
function getAnalysisLimits(plan) {
  if (isEnterpriseOrHigher(plan)) {
    return { maxPages: ANALYSIS_LIMITS.ENTERPRISE_MAX_PDF_PAGES, maxTokens: ANALYSIS_LIMITS.ENTERPRISE_MAX_INPUT_TOKENS };
  }
  if (isBusinessOrHigher(plan)) {
    return { maxPages: ANALYSIS_LIMITS.BUSINESS_MAX_PDF_PAGES, maxTokens: ANALYSIS_LIMITS.BUSINESS_MAX_INPUT_TOKENS };
  }
  return { maxPages: ANALYSIS_LIMITS.FREE_MAX_PDF_PAGES, maxTokens: ANALYSIS_LIMITS.FREE_MAX_INPUT_TOKENS };
}

/**
 * 📊 Token-Schätzung (grobe Approximation)
 * 1 Token ≈ 4 Zeichen für Deutsch/Englisch Mix
 */
function estimateTokenCount(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * 💰 GPT-4 Turbo Kosten-Berechnung
 */
function calculateCost(promptTokens, completionTokens, model = 'gpt-4-turbo-preview') {
  const PRICING = {
    'gpt-4-turbo-preview': {
      input: 0.01 / 1000,   // $0.01 per 1K input tokens
      output: 0.03 / 1000   // $0.03 per 1K output tokens
    },
    'gpt-3.5-turbo': {
      input: 0.0005 / 1000,
      output: 0.0015 / 1000
    }
  };

  const pricing = PRICING[model] || PRICING['gpt-4-turbo-preview'];
  const cost = (promptTokens * pricing.input) + (completionTokens * pricing.output);
  return parseFloat(cost.toFixed(4));
}

// ===== ENHANCED DEEP LAWYER-LEVEL ANALYSIS PIPELINE =====

/**
 * 📊 FIXED: Smart Token Counter and Text Optimizer
 * Estimates tokens and optimizes text for GPT-4 limits
 */
function estimateTokens(text) {
  // Conservative estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * ✂️ FIXED: ULTRA-AGGRESSIVE Text Optimization for ANY Document Size
 * Guarantees ANY document will fit in token limits
 */
function optimizeTextForGPT4(text, maxTokens = 2000, requestId) {
  const currentTokens = estimateTokens(text);
  
  console.log(`📊 [${requestId}] Text analysis: ${text.length} chars, ~${currentTokens} tokens (limit: ${maxTokens})`);
  
  if (currentTokens <= maxTokens) {
    console.log(`✅ [${requestId}] Text within limits, no optimization needed`);
    return text;
  }
  
  console.log(`✂️ [${requestId}] Text too long, applying ULTRA-AGGRESSIVE truncation...`);
  
  // ✅ ULTRA-AGGRESSIVE: Target much lower to guarantee fit
  const targetChars = Math.floor(maxTokens * 3); // Conservative: 3 chars per token
  
  if (text.length <= targetChars) {
    // Text is already small enough
    console.log(`✅ [${requestId}] Text fits after conservative calculation`);
    return text;
  }
  
  // ✅ STRATEGY: Smart content preservation for contracts
  const isContract = text.toLowerCase().includes('vertrag') || text.toLowerCase().includes('contract');
  
  let optimizedText;
  
  if (isContract) {
    // For contracts: Keep beginning (parties, terms) + key sections + end (signatures)
    const startChars = Math.floor(targetChars * 0.5);   // 50% from start (most important)
    const middleChars = Math.floor(targetChars * 0.3);  // 30% from middle  
    const endChars = Math.floor(targetChars * 0.2);     // 20% from end
    
    const textStart = text.substring(0, startChars);
    const textEnd = text.substring(text.length - endChars);
    
    // Find middle section with important keywords
    const importantKeywords = ['klausel', 'clause', 'haftung', 'liability', 'kündigung', 'termination', 'zahlung', 'payment'];
    let bestMiddleStart = Math.floor((text.length - middleChars) / 2);
    
    // Try to find a section with important keywords
    for (const keyword of importantKeywords) {
      const keywordIndex = text.toLowerCase().indexOf(keyword, Math.floor(text.length * 0.3));
      if (keywordIndex > 0 && keywordIndex < text.length * 0.7) {
        bestMiddleStart = Math.max(0, keywordIndex - Math.floor(middleChars / 2));
        break;
      }
    }
    
    const textMiddle = text.substring(bestMiddleStart, bestMiddleStart + middleChars);
    
    optimizedText = textStart + '\n\n[... VERTRAGSINHALT GEKÜRZT FÜR ANWALTLICHE ANALYSE ...]\n\n' + textMiddle + '\n\n[... VERTRAGSINHALT GEKÜRZT FÜR ANWALTLICHE ANALYSE ...]\n\n' + textEnd;
    
  } else {
    // For other documents: Simple beginning + end approach
    const startChars = Math.floor(targetChars * 0.7);   // 70% from start
    const endChars = Math.floor(targetChars * 0.3);     // 30% from end
    
    const textStart = text.substring(0, startChars);
    const textEnd = text.substring(text.length - endChars);
    
    optimizedText = textStart + '\n\n[... DOKUMENT GEKÜRZT FÜR ANALYSE ...]\n\n' + textEnd;
  }
  
  const finalTokens = estimateTokens(optimizedText);
  const reduction = Math.round((1 - finalTokens/currentTokens) * 100);
  
  console.log(`✅ [${requestId}] ULTRA-AGGRESSIVE optimization complete:`);
  console.log(`   📊 Original: ${text.length} chars (~${currentTokens} tokens)`);
  console.log(`   📊 Optimized: ${optimizedText.length} chars (~${finalTokens} tokens)`);
  console.log(`   📊 Reduction: ${reduction}% - GUARANTEED to fit!`);
  
  return optimizedText;
}

/**
 * 🎯 Enhanced Document Type Detection - UNCHANGED
 * Detects document types and determines the best analysis strategy
 */
function detectDocumentType(filename, text, pageCount) {
  const name = filename.toLowerCase();
  const content = text.toLowerCase();
  
  // Document type patterns
  const patterns = {
    CONTRACT: {
      keywords: ['vertrag', 'contract', 'vereinbarung', 'agreement', 'terms', 'conditions', 'klausel', 'verpflichtung', 'obligation', 'kündig', 'termination', 'laufzeit', 'duration'],
      filePatterns: ['vertrag', 'contract', 'agreement', 'kontrakt'],
      confidence: 0.8
    },
    INVOICE: {
      keywords: ['rechnung', 'invoice', 'bill', 'faktura', 'betrag', 'amount', 'total', 'summe', 'netto', 'brutto', 'mehrwertsteuer', 'mwst', 'vat', 'steuer'],
      filePatterns: ['rechnung', 'invoice', 'bill', 'faktura', 'rg'],
      confidence: 0.7
    },
    RECEIPT: {
      keywords: ['quittung', 'receipt', 'beleg', 'bon', 'kassenbon', 'correction', 'korrektur', 'storno'],
      filePatterns: ['receipt', 'quittung', 'beleg', 'vat_correction', 'correction', 'bon'],
      confidence: 0.6
    },
    FINANCIAL_DOCUMENT: {
      keywords: ['buchung', 'booking', 'umsatz', 'revenue', 'gewinn', 'verlust', 'bilanz', 'übersicht', 'aufstellung', 'auswertung'],
      filePatterns: ['buchung', 'booking', 'umsatz', 'financial', 'übersicht', 'auswertung'],
      confidence: 0.5
    },
    TABLE_DOCUMENT: {
      keywords: ['tabelle', 'table', 'liste', 'list', 'übersicht', 'overview', 'aufstellung', 'zusammenfassung'],
      filePatterns: ['tabelle', 'table', 'liste', 'übersicht', 'list'],
      confidence: 0.4
    }
  };

  let bestMatch = { type: 'UNKNOWN', confidence: 0 };

  for (const [type, pattern] of Object.entries(patterns)) {
    let score = 0;
    
    // Check filename patterns
    for (const filePattern of pattern.filePatterns) {
      if (name.includes(filePattern)) {
        score += 0.3;
      }
    }
    
    // Check content keywords
    let keywordMatches = 0;
    for (const keyword of pattern.keywords) {
      if (content.includes(keyword)) {
        keywordMatches++;
      }
    }
    score += (keywordMatches / pattern.keywords.length) * 0.7;
    
    if (score > bestMatch.confidence && score >= pattern.confidence * 0.6) {
      bestMatch = { type, confidence: score };
    }
  }

  return bestMatch;
}

/**
 * 🧪 Content Quality Assessment - UNCHANGED
 * Analyzes if the document has enough meaningful content
 */
function assessContentQuality(text, pageCount) {
  const words = text.split(/\s+/).filter(word => word.length > 2);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const lines = text.split('\n').filter(line => line.trim().length > 5);
  
  const metrics = {
    wordCount: words.length,
    sentenceCount: sentences.length,
    lineCount: lines.length,
    avgWordsPerPage: Math.round(words.length / pageCount),
    avgSentencesPerPage: Math.round(sentences.length / pageCount),
    hasStructure: sentences.length > 3 && lines.length > 5,
    hasTabularData: text.includes('\t') || /\s{4,}/.test(text),
    isScanned: words.length < 50 && pageCount > 1, // Likely scanned if very few words
  };

  // Quality scoring
  let qualityScore = 0;
  
  if (metrics.wordCount > 100) qualityScore += 0.3;
  if (metrics.sentenceCount > 5) qualityScore += 0.2;
  if (metrics.hasStructure) qualityScore += 0.2;
  if (metrics.avgWordsPerPage > 50) qualityScore += 0.2;
  if (!metrics.isScanned) qualityScore += 0.1;

  return { ...metrics, qualityScore };
}

/**
 * 🎨 Smart Analysis Strategy Selector - UNCHANGED
 * Determines the best analysis approach based on document type and quality
 */
function selectAnalysisStrategy(documentType, contentQuality, filename) {
  const strategies = {
    CONTRACT: {
      method: 'DEEP_LAWYER_LEVEL_CONTRACT_ANALYSIS',
      requiresHighQuality: true,
      fallbackToGeneral: true,
      message: 'Tiefgehende anwaltliche Vertragsanalyse'
    },
    INVOICE: {
      method: 'DEEP_FINANCIAL_ANALYSIS',
      requiresHighQuality: false,
      fallbackToGeneral: true,
      message: 'Vertiefte Rechnungsanalyse'
    },
    RECEIPT: {
      method: 'DEEP_RECEIPT_ANALYSIS',
      requiresHighQuality: false,
      fallbackToGeneral: true,
      message: 'Detaillierte Beleganalyse'
    },
    FINANCIAL_DOCUMENT: {
      method: 'DEEP_GENERAL_FINANCIAL_ANALYSIS',
      requiresHighQuality: false,
      fallbackToGeneral: true,
      message: 'Umfassende finanzielle Dokumentenanalyse'
    },
    TABLE_DOCUMENT: {
      method: 'DEEP_TABULAR_ANALYSIS',
      requiresHighQuality: false,
      fallbackToGeneral: true,
      message: 'Erweiterte Tabellenanalyse'
    },
    UNKNOWN: {
      method: 'DEEP_GENERAL_DOCUMENT_ANALYSIS',
      requiresHighQuality: false,
      fallbackToGeneral: false,
      message: 'Umfassende Dokumentenanalyse'
    }
  };

  const strategy = strategies[documentType.type] || strategies.UNKNOWN;
  
  // Check if quality is sufficient
  const qualityThreshold = strategy.requiresHighQuality ? 0.6 : 0.2;
  const hasEnoughQuality = contentQuality.qualityScore >= qualityThreshold;

  return {
    ...strategy,
    canProceed: hasEnoughQuality || strategy.fallbackToGeneral,
    needsOCR: contentQuality.isScanned,
    confidence: documentType.confidence,
    qualityMet: hasEnoughQuality
  };
}

/**
 * 🛠️ FIXED: SIMPLIFIED Validation - Much Less Aggressive
 * Validates response but allows more content through
 */
function validateAndNormalizeLawyerAnalysis(result, documentType, requestId) {
  console.log(`🛠️ [${requestId}] SIMPLIFIED validation for ${documentType}:`, Object.keys(result));
  
  // ✅ FIXED: Only check for critical errors (much less restrictive)
  const criticalErrors = [
    'fehler:',
    'error:',
    'failed to analyze',
    'kann nicht analysiert werden',
    'analysis impossible'
  ];

  // ✅ FIXED: Light validation on summary only
  if (Array.isArray(result.summary)) {
    for (const text of result.summary) {
      if (typeof text === 'string') {
        const lowerText = text.toLowerCase();
        for (const error of criticalErrors) {
          if (lowerText.includes(error)) {
            console.error(`❌ [${requestId}] Critical error detected: "${error}"`);
            throw new Error(`Critical analysis error detected: "${error}"`);
          }
        }
      }
    }
  }

  // 🌐 ADAPTIVE-OUTPUT POLICY (Phase-1-Redesign):
  // Felder dürfen FEHLEN oder LEER sein, wenn der Vertrag dazu nichts hergibt.
  // Wir füllen NICHT mehr mit generischen Floskel-Defaults auf — das wäre genau
  // die Schema-F-Logik, die wir bewusst abgeschafft haben. Frontend rendert
  // render-if-present.
  //
  // PFLICHTFELDER (vom neuen Prompt verlangt): documentCharacterization,
  // completeness, asymmetryAssessment, contractScore, scoreReasoning,
  // detailedLegalOpinion. Bei diesen warnen wir, wenn sie fehlen, brechen aber
  // nicht ab — Robustheit gegen kurzzeitige GPT-Schwankungen.

  const recognitionRequired = [
    'documentCharacterization',
    'completeness',
    'asymmetryAssessment',
    'scoreReasoning',
  ];
  for (const field of recognitionRequired) {
    if (result[field] === undefined || result[field] === null) {
      console.warn(`⚠️ [${requestId}] Recognition field missing: ${field} — leaving undefined, frontend will render-if-present`);
    }
  }

  // 🌐 Phase-2 (Pilot-Type-Spezialisierung): typeSpecificFindings ist OPTIONAL.
  // Wird nur erwartet, wenn der Vertragstyp ein Pilot-Typ ist (Mietvertrag, Arbeitsvertrag, NDA).
  // Bei anderen Typen oder bei "other" lassen wir das Feld einfach weg — render-if-present.
  // Validation: wenn vorhanden, muss es ein Array sein. Falsch geformte Werte → entfernen.
  if (result.typeSpecificFindings !== undefined && result.typeSpecificFindings !== null) {
    if (!Array.isArray(result.typeSpecificFindings)) {
      console.warn(`⚠️ [${requestId}] typeSpecificFindings is not an array — removing`);
      delete result.typeSpecificFindings;
    } else {
      // Filter: nur Items mit checkpoint + status durchlassen
      result.typeSpecificFindings = result.typeSpecificFindings.filter(item =>
        item && typeof item === 'object' && item.checkpoint && item.status
      );
      if (result.typeSpecificFindings.length === 0) {
        delete result.typeSpecificFindings;
      }
    }
  }

  // Score: weiterhin Pflicht. Fallback nur wenn AI nichts brauchbares geliefert hat.
  if (!result.contractScore || result.contractScore < 1 || result.contractScore > 100) {
    console.warn(`⚠️ [${requestId}] contractScore missing or out-of-range — calculating heuristic fallback`);
    result.contractScore = calculateDeepLawyerScore(result, documentType);
  }

  // Optionale Felder NICHT mehr auto-fillen. Wenn AI sie weglässt, bleiben sie weg.
  // Das ist der Kern des Adaptive-Output-Designs.
  
  // ✅ FIXED: Simple text completion check (no complex validation)
  validateTextCompletenessAndDepth(result, requestId);
  
  console.log(`✅ [${requestId}] SIMPLIFIED validation passed with score: ${result.contractScore}`);
  return result;
}

/**
 * 📊 Enhanced deep lawyer-level score calculation - UNCHANGED
 */
function calculateDeepLawyerScore(result, documentType) {
  // Base scores by document type with deep lawyer-level expectations
  const baseScores = {
    'CONTRACT': 65, // Lower base for stricter evaluation
    'INVOICE': 75,
    'RECEIPT': 80,
    'FINANCIAL_DOCUMENT': 70,
    'TABLE_DOCUMENT': 65,
    'UNKNOWN': 60
  };
  
  let score = baseScores[documentType] || 60;
  
  // ✅ Deep lawyer-level adjustments with stricter criteria
  if (result.positiveAspects && result.positiveAspects.length > 3) score += 8;
  if (result.positiveAspects && result.positiveAspects.length > 5) score += 7;
  if (result.criticalIssues && result.criticalIssues.length === 0) score += 20;
  if (result.criticalIssues && result.criticalIssues.some(issue => issue.riskLevel === 'high')) score -= 20;
  if (result.criticalIssues && result.criticalIssues.filter(issue => issue.riskLevel === 'high').length > 2) score -= 15;
  if (result.recommendations && result.recommendations.length > 2) score += 5;
  if (result.recommendations && result.recommendations.length > 4) score += 5;
  if (result.legalAssessment && Array.isArray(result.legalAssessment)) {
    const totalLength = result.legalAssessment.join(' ').length;
    if (totalLength > 200) score += 5;
    if (totalLength > 400) score += 5;
  }
  
  // Ensure score is in valid range with stricter bounds
  return Math.max(25, Math.min(score, 90));
}

/**
 * 🔄 Convert legacy format to new deep 7-point lawyer structure - UNCHANGED
 */
function convertLegacyToDeepLawyerFormat(result, documentType, requestId) {
  console.log(`🔄 [${requestId}] Converting legacy format to deep lawyer structure`);
  
  // ✅ Keep existing fields for backward compatibility
  const converted = {
    summary: Array.isArray(result.summary) ? result.summary : [result.summary || "Umfassende Dokumentenanalyse auf Anwaltsniveau wurde durchgeführt."],
    legalAssessment: Array.isArray(result.legalAssessment) ? result.legalAssessment : [result.legalAssessment || "Eingehende rechtliche Bewertung wurde vorgenommen."],
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [result.suggestions || "Detaillierte Optimierungsvorschläge wurden entwickelt."],
    comparison: Array.isArray(result.comparison) ? result.comparison : [result.comparison || "Systematischer Marktvergleich wurde durchgeführt."],
    contractScore: result.contractScore || calculateDeepLawyerScore(result, documentType),
    
    // ✅ Generate deep lawyer-level structured content for missing fields
    positiveAspects: [{
      title: "Strukturierte Dokumentenarchitektur",
      description: "Das Dokument zeigt eine erkennbare rechtliche Struktur und ist grundsätzlich nachvollziehbar gegliedert, was die juristische Bewertung und Durchsetzbarkeit erleichtert."
    }, {
      title: "Formelle Mindestanforderungen erfüllt",
      description: "Die grundlegenden formellen Anforderungen für die rechtliche Bindungswirkung scheinen erfüllt, was eine solide Basis für die Vertragsdurchsetzung bildet."
    }],
    
    criticalIssues: [{
      title: "Notwendigkeit fachspezifischer Detailprüfung",
      description: "Einzelne Klauseln und Bestimmungen erfordern eine eingehende rechtliche Detailanalyse durch einen spezialisierten Fachanwalt, um potentielle Haftungsrisiken und rechtliche Schwachstellen zu identifizieren.",
      riskLevel: "medium"
    }, {
      title: "Optimierungsbedarf bei Risikoallokation",
      description: "Die Verteilung rechtlicher und wirtschaftlicher Risiken zwischen den Vertragsparteien könnte durch ausgewogenere Klauselgestaltung optimiert werden, um einseitige Belastungen zu vermeiden.",
      riskLevel: "medium"
    }],
    
    recommendations: [
      {
        title: "Umfassende juristische Fachprüfung",
        description: "Eine detaillierte rechtliche Begutachtung durch einen auf das entsprechende Rechtsgebiet spezialisierten Rechtsanwalt wird nachdrücklich empfohlen, um rechtliche Risiken zu minimieren und Optimierungspotentiale vollständig auszuschöpfen.",
        priority: "high"
      },
      {
        title: "Vollständige rechtssichere Dokumentation",
        description: "Alle wesentlichen Vereinbarungen sollten vollständig schriftlich dokumentiert und rechtssicher archiviert werden, um spätere Beweis- und Durchsetzungsprobleme zu vermeiden.",
        priority: "medium"
      },
      {
        title: "Implementierung systematischer Vertragsreviews",
        description: "Ein strukturiertes Review-System sollte etabliert werden, um Verträge regelmäßig auf Aktualität, Rechtssicherheit und Marktkonformität zu überprüfen und kontinuierlich zu optimieren.",
        priority: "medium"
      }
    ]
  };
  
  console.log(`✅ [${requestId}] Legacy format successfully converted to deep lawyer structure`);
  return converted;
}

/**
 * ✅ FIXED: Simplified text completeness validation
 */
function validateTextCompletenessAndDepth(result, requestId) {
  console.log(`🔍 [${requestId}] Simple text completeness check`);
  
  // ✅ SIMPLIFIED: Only basic completeness checks
  const textFields = ['summary', 'legalAssessment', 'suggestions', 'comparison'];
  
  textFields.forEach(field => {
    if (Array.isArray(result[field])) {
      result[field] = result[field].map(text => {
        if (typeof text === 'string') {
          // Check for truncated sentences (ends with incomplete words)
          if (text.length > 20 && !text.match(/[.!?]$/)) {
            text += '.';
            console.log(`🔧 [${requestId}] Fixed incomplete sentence in ${field}`);
          }
          
          // Ensure minimum content length (much more relaxed)
          if (text.length < 30) {
            text += ' Die Analyse wird vervollständigt.';
            console.log(`🔧 [${requestId}] Extended very short content in ${field}`);
          }
        }
        return text;
      });
    }
  });
  
  // ✅ SIMPLIFIED: Basic structured fields check
  ['positiveAspects', 'criticalIssues', 'recommendations'].forEach(field => {
    if (Array.isArray(result[field])) {
      result[field] = result[field].map(item => {
        if (item.description && !item.description.match(/[.!?]$/)) {
          item.description += '.';
          console.log(`🔧 [${requestId}] Fixed incomplete description in ${field}`);
        }
        return item;
      });
    }
  });
  
  console.log(`✅ [${requestId}] Simple text completeness check completed`);
}

/**
 * 🎯 CONTRACT-TYPE SPECIFIC FOCUS AREAS V2
 * Returns individualized focus points for each contract type
 * WITH critical checkpoints that MUST be analyzed
 */
/**
 * 🎯 CONTRACT TYPE AWARENESS - V3 (Anwalts-Simulation)
 * Keine Checklisten! Stattdessen: Was ein Fachanwalt WEISS über diesen Typ
 */
function getContractTypeAwareness(documentType) {
  const awarenessMap = {
    purchase: {
      title: "Fachanwalt für Kaufrecht",
      expertise: `Als Fachanwalt für Kaufrecht mit 20+ Jahren Erfahrung — inkl. der BGB-Reform 2022 (Verbrauchergüterkauf, digitale Produkte) — weißt du:

Bei Kaufverträgen sind typischerweise relevant: Gewährleistung/Sachmängelhaftung, Beweislastumkehr, digitale Elemente und Aktualisierungspflichten (§§ 327 ff., 475b BGB), Eigentumsvorbehalt, Gefahrübergang, Lieferfristen, Zahlungsbedingungen, Widerrufsrecht im Fernabsatz.

WICHTIG für 2026: Bei Verbrauchsgüterkäufen gelten zusätzlich §§ 474 ff. BGB. Bei digitalen Produkten und Waren mit digitalen Elementen greifen §§ 327 ff., 475b BGB mit Update-Pflicht. Beweislastumkehr nach § 477 BGB jetzt 12 Monate (nicht mehr 6), bei dauerhafter Bereitstellung digitaler Elemente sogar 2 Jahre.

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn keine Eigentumsvorbehaltsklausel drin steht → erwähne sie nicht.
Wenn der Vertrag 10 Seiten mit 50 Klauseln hat → analysiere alle relevanten.
Wenn es nur 2 Seiten mit 5 Klauseln sind → fokussiere auf diese 5.`,

      commonTraps: `Häufige Fallen bei Kaufverträgen (falls im Vertrag vorhanden):
• Gewährleistungsverkürzung unter gesetzliches Minimum (§ 438 BGB: 2 Jahre bei Neuware, 1 Jahr bei Gebrauchtware im B2C)
• Klauseln, die § 442 BGB im B2C wieder einführen wollen (Käufer verliert Rechte bei Mangel-Kenntnis) — unwirksam (§ 475 Abs. 3 BGB n.F.)
• Verkürzung der Beweislastumkehr unter 12 Monate im B2C — unwirksam (§ 477 BGB)
• Bei Smart-Geräten/Software: fehlende Update-Pflicht-Regelung (§§ 327f, 475b BGB)
• Versendungsklausel im B2C, die Gefahrübergang vor Übergabe legt → unwirksam (§ 475 Abs. 2 BGB)
• Unwirksame Haftungsausschlüsse nach § 309 Nr. 7 BGB (Vorsatz/grobe Fahrlässigkeit, Leben/Körper/Gesundheit) — BGH-Indizwirkung auch im B2B
• Versteckte Kosten (Lieferkosten, Verpackung, Finanzierung)
• Unklare Lieferbedingungen ohne Verzugsfolgen
• Überhöhte Verzugszinsen (Verbraucher: max. 5%-Pkt. über Basiszinssatz, B2B: 9%-Pkt. + 40€-Pauschale § 288 Abs. 5 BGB)
• Eigentumsvorbehalt mit unklaren Verwertungsrechten oder Vorausabtretung
• Fehlerhafte Widerrufsbelehrung im Fernabsatz → Widerrufsfrist 12 Monate + 14 Tage statt 14 Tage
• Schiedsklauseln gegenüber Verbrauchern (§ 1031 Abs. 5 ZPO) oder Wegfall des Wohnsitzgerichtsstands (§ 29c ZPO)`,

      // 🌐 Phase-3-Pilot (03.05.2026): Pflicht-Prüfpunkte für kaufrechtliche Tiefenanalyse.
      // Fundiert auf BGB-Reform 2022 (Verbrauchergüterkauf, digitale Produkte) und
      // aktueller BGH-Rechtsprechung. Werden zusätzlich zur Universal-Analyse als
      // typeSpecificFindings ausgegeben.
      pilotChecklist: `KAUFVERTRAGS-PFLICHTPRÜFUNG (Pilot-Tiefenanalyse):
Prüfe gezielt jeden dieser Punkte und gib das Ergebnis im Feld typeSpecificFindings zurück.
Wenn ein Punkt im Vertrag NICHT vorkommt → status "not_applicable" (das ist OK!).
Wenn ein Punkt vorkommt UND in Ordnung ist → status "ok".
Wenn ein Punkt vorkommt UND problematisch ist → status "issue" mit Klausel-Verweis.

CHECKPOINTS:
1. Vertragstyp & Geltungsbereich — Kauf nach § 433 BGB vs. Werkvertrag § 631 BGB; B2C (§ 13) vs. B2B (§ 14); bei Verbrauchsgüterkauf zusätzlich §§ 474 ff. BGB; bei digitalen Produkten zusätzlich §§ 327 ff. BGB
2. Gewährleistungsfrist (§§ 438, 475 BGB) — Neuware B2C zwingend 2 Jahre; Gebrauchtware B2C verkürzbar auf max. 1 Jahr; B2B verkürzbar (außer Vorsatz). Klauseln unter Minimum unwirksam. § 442 BGB im B2C ausgeschlossen — Käufer-Kenntnis schadet nicht (§ 475 Abs. 3 BGB n.F.)
3. Beweislastumkehr (§ 477 BGB) — seit 1.1.2022 12 Monate (vorher 6); bei dauerhafter Bereitstellung digitaler Elemente 2 Jahre (i.V.m. § 475b BGB). Klauseln, die das verkürzen, sind im B2C unwirksam
4. Digitale Elemente & Aktualisierungspflicht (§§ 327f, 475b BGB) — bei Smart-Geräten, Software, Apps: Update-Pflicht für übliche Lebensdauer geregelt? Information über Updates? Bei dauerhafter Bereitstellung mind. 2 Jahre Update-Pflicht
5. Untersuchungs- und Rügepflicht (§ 377 HGB) — nur B2B-Handelskauf. Unverzügliche Anzeige bei erkennbaren Mängeln; bei verdeckten Mängeln nach Erkennen. Klausel-Verkürzung auf starre Tage-Frist in AGB rechtlich problematisch
6. Eigentumsvorbehalt (§ 449 BGB) — einfach / erweitert / verlängert? Vorausabtretungsklausel klar geregelt? Verarbeitungsklausel sauber? Verwertungsrechte transparent?
7. Gefahrübergang (§§ 446, 475 Abs. 2 BGB) — bei B2C zwingend mit Übergabe an Verbraucher; Versendungsklauseln im B2C UNWIRKSAM. Bei B2B Incoterms üblich
8. Lieferfrist & Verzug (§ 286 BGB) — kalendermäßig bestimmte Frist? Mahnung erforderlich? Pauschalierter Verzugsschaden im B2C verhältnismäßig (§ 309 Nr. 5 BGB)?
9. Zahlungsbedingungen & Verzugszinsen (§ 288 BGB) — Verbraucher max. 5%-Pkt. über Basiszinssatz, B2B 9%-Pkt. + 40€-Pauschale (§ 288 Abs. 5 BGB). Vorkasse-Klauseln im B2C kritisch (§ 309 Nr. 2 BGB)
10. Widerrufsrecht im Fernabsatz (§§ 312g, 312f BGB, Art. 246a EGBGB) — bei Verbraucher-Online/-Telefon-Kauf zwingend 14 Tage. Belehrung formgerecht (Anlage 1 EGBGB)? Pflichtangaben nach Art. 246a EGBGB? Bestätigung auf dauerhaftem Datenträger? Fehlerhafte Belehrung verlängert auf 12 Monate + 14 Tage
11. Haftungsausschluss (§§ 307, 309 Nr. 7 BGB) — Vorsatz, grobe Fahrlässigkeit, Verletzung von Leben/Körper/Gesundheit NIEMALS ausschließbar. BGH-Indizwirkung auch im B2B (BGH VIII ZR 174/12). Pauschale Haftungsbegrenzung bei wesentlichen Vertragspflichten kritisch
12. Garantie, Gerichtsstand, VSBG (§§ 443 BGB, 29c ZPO, 36 VSBG) — Garantie klar von Gewährleistung abgegrenzt? Garantiegeber + Inhalt eindeutig? Bei Verbrauchern Wohnsitzgerichtsstand zwingend (§ 29c ZPO); Schiedsklauseln im B2C unwirksam (§ 1031 Abs. 5 ZPO). Online-Shops: VSBG-Hinweis (§ 36 VSBG)?`
    },

    employment: {
      title: "Fachanwalt für Arbeitsrecht",
      expertise: `Als Fachanwalt für Arbeitsrecht mit 20+ Jahren Erfahrung weißt du:

Bei Arbeitsverträgen sind typischerweise relevant: Vergütung, Arbeitszeit, Urlaub, Kündigungsfristen, Probezeit, Wettbewerbsverbote, Überstundenregelungen, Versetzungsklauseln.

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn kein Wettbewerbsverbot drin steht → erwähne es nicht.
Wenn der Vertrag sehr umfangreich ist → analysiere ALLE wichtigen Klauseln.
Wenn es ein kurzer Standard-Vertrag ist → fokussiere auf das Wesentliche.`,

      commonTraps: `Häufige Fallen bei Arbeitsverträgen (falls im Vertrag vorhanden):
• Probezeit > 6 Monate (unzulässig)
• Nachvertragliches Wettbewerbsverbot OHNE Karenzentschädigung (min. 50% Bruttogehalt) → unwirksam
• Ausschlussfristen < 3 Monate (unzulässig)
• Pauschalabgeltung von Überstunden ohne Höchstgrenze (unwirksam)
• Einseitige Kündigungsfristverlängerung nur für Arbeitnehmer (unwirksam)
• Zu weitgehende Versetzungsklauseln (§ 106 GewO)
• Mindestlohn-Unterschreitung (aktuell 12,41€/Std., ab 2025: 12,82€/Std.)`,

      // 🌐 Phase-2-Pilot: Pflicht-Prüfpunkte für arbeitsrechtliche Tiefenanalyse.
      // Werden zusätzlich zur Universal-Analyse als typeSpecificFindings ausgegeben.
      pilotChecklist: `ARBEITSVERTRAGS-PFLICHTPRÜFUNG (Pilot-Tiefenanalyse):
Prüfe gezielt jeden dieser Punkte und gib das Ergebnis im Feld typeSpecificFindings zurück.
Wenn ein Punkt im Vertrag NICHT vorkommt → status "not_applicable" (das ist OK!).
Wenn ein Punkt vorkommt UND in Ordnung ist → status "ok".
Wenn ein Punkt vorkommt UND problematisch ist → status "issue" mit Klausel-Verweis.

CHECKPOINTS:
1. Probezeit-Länge (max. 6 Monate § 622 Abs. 3 BGB)
2. Wettbewerbsverbot — nur wirksam mit Karenzentschädigung ≥ 50% Bruttogehalt (§ 74 Abs. 2 HGB)
3. Überstundenregelung — Pauschalabgeltung nur mit klarer Höchstgrenze wirksam (BAG-Rspr.)
4. Befristung — Sachgrund nach § 14 TzBfG erforderlich, sonst max. 24 Monate sachgrundlos
5. Mindestlohn-Konformität (12,41 €/h aktuell, 12,82 €/h ab 2025) bzw. branchenspezifische Tariflöhne
6. Ausschlussfristen — mind. 3 Monate, beidseitig (sonst unwirksam)
7. Versetzungsklausel — Reichweite nach § 106 GewO (zumutbar?)
8. Urlaubsanspruch (mind. 20 Tage bei 5-Tage-Woche § 3 BUrlG)
9. Kündigungsfristen — beidseitig, mind. § 622 BGB-Niveau
10. Verschwiegenheits- und Geheimhaltungsklausel — Reichweite und nachvertragliche Wirksamkeit`
    },

    rental: {
      title: "Fachanwalt für Mietrecht",
      expertise: `Als Fachanwalt für Mietrecht mit 20+ Jahren Erfahrung weißt du:

Bei Mietverträgen sind typischerweise relevant: Miethöhe, Nebenkosten, Kaution, Schönheitsreparaturen, Kündigungsfristen, Kleinreparaturen, Indexmiete.

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn keine Schönheitsreparatur-Klausel drin steht → erwähne sie nicht.
Wenn der Vertrag viele Sonderregelungen hat → analysiere alle.
Wenn es ein Standard-Formular ist → fokussiere auf typische Problemklauseln.`,

      commonTraps: `Häufige Fallen bei Mietverträgen (falls im Vertrag vorhanden):
• Unwirksame Schönheitsreparatur-Klauseln (BGH-Rechtsprechung: oft formularrechtlich unwirksam!)
• Kaution > 3 Nettokaltmieten (§ 551 BGB)
• Kleinreparaturklauseln über 110€ pro Reparatur oder 200€/Jahr (BGH)
• Pauschale Nebenkostenumlage ohne Abrechnungspflicht
• Indexmiete ohne Kappungsgrenze
• Kündigungsfristen unter gesetzlichem Minimum (§ 573c BGB: 3 Monate)
• Unwirksame Tierhaltungsverbote (BGH: Kleintiere immer erlaubt)`,

      pilotChecklist: `MIETVERTRAGS-PFLICHTPRÜFUNG (Pilot-Tiefenanalyse):
Prüfe gezielt jeden dieser Punkte und gib das Ergebnis im Feld typeSpecificFindings zurück.
Wenn ein Punkt im Vertrag NICHT vorkommt → status "not_applicable".
Wenn ein Punkt vorkommt UND in Ordnung ist → status "ok".
Wenn ein Punkt vorkommt UND problematisch ist → status "issue" mit Klausel-Verweis.

CHECKPOINTS:
1. Schönheitsreparatur-Klausel — starre Fristen / Quotenabgeltung sind nach BGH-Rspr. häufig unwirksam (§ 307 BGB)
2. Kaution-Höhe (max. 3 Nettokaltmieten § 551 BGB) und Verzinsung
3. Kleinreparaturklausel — Einzelfall max. ~110 €, Jahresgrenze max. ~6-8% Jahresmiete (BGH)
4. Nebenkosten-Umlageschlüssel — klar definiert? Heizkostenverordnung beachtet?
5. Indexmiete — mit Kappungsgrenze (§ 557b BGB)? Mindestmietdauer?
6. Staffelmiete — Bedingungen klar, Kündigungsausschluss max. 4 Jahre § 557a Abs. 3
7. Kündigungsfrist — bei Wohnraum mind. 3 Monate (§ 573c BGB), Sperrfrist beachten
8. Tierhaltungsklausel — Generalverbot unwirksam, Einzelabwägung (BGH)
9. Untervermietungsverbot — pauschal unwirksam, berechtigtes Interesse (§ 553 BGB)
10. Mietminderungsausschluss — formularrechtlich unwirksam (§ 536 Abs. 4 BGB)
11. Mietpreisbremse (in angespannten Wohnungsmärkten) — Auskunftspflicht erfüllt?
12. Übergabeprotokoll und Anfangsrenovierung — Pflichten klar geregelt?`
    },

    telecom: {
      title: "Fachanwalt für Telekommunikationsrecht",
      expertise: `Als Fachanwalt für Telekommunikationsrecht mit Fokus auf TKG-Reform 2022 weißt du:

Bei Telekommunikationsverträgen sind typischerweise relevant: Mindestlaufzeit, Kündigungsfristen, Datenvolumen/Drosselung, Preisanpassungen, Sonderkündigungsrechte, Verfügbarkeitsgarantien.

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn keine Drosselungsklausel drin steht → erwähne sie nicht.
Wenn der Vertrag TKG-Reform 2022 komplett umsetzt → lobe das!
Wenn alte Klauseln noch drin sind → kritisiere konkret.`,

      commonTraps: `Häufige Fallen bei Telekommunikationsverträgen (falls im Vertrag vorhanden):
• TKG-Reform 2022 NICHT umgesetzt: Kündigungsfrist > 1 Monat nach Mindestlaufzeit (§ 57 Abs. 4 TKG)
• Mindestlaufzeit > 24 Monate (unzulässig seit März 2022)
• Fehlendes Sonderkündigungsrecht bei Preiserhöhung (§ 57 TKG)
• Unzureichende Entschädigung bei Ausfall (§ 58 TKG: mind. 10-20% Monatsgebühr)
• Intransparente Drosselungsregelungen
• Versteckte Kosten (Router-Gebühr, Anschlussgebühr, Portierungskosten)`
    },

    insurance: {
      title: "Fachanwalt für Versicherungsrecht",
      expertise: `Als Fachanwalt für Versicherungsrecht mit 20+ Jahren Erfahrung — inkl. VVG-Stand 2026 + aktueller BGH-Rechtsprechung 2024/2025 — weißt du:

Bei Versicherungsverträgen sind typischerweise relevant: Anzeigepflicht (§ 19 VVG), Beratungs-/Dokumentationspflicht (§ 6 VVG), Widerrufsrecht (§ 8 VVG / 30 Tage Lebensvers. § 152 VVG), Obliegenheiten + Quotelung (§ 28 VVG), Leistungsausschlüsse, Wartezeiten (§ 197 VVG), Prämienanpassung (§§ 40, 203 VVG), Kündigung nach Versicherungsfall (§ 92 VVG), stillschweigende Verlängerung (§ 11 VVG), Fälligkeit (§ 14 VVG).

WICHTIG für 2026: Spartenspezifika beachten. PKV: § 204 VVG Tarifwechselrecht zu gleichwertigen Tarifen, BGH IV ZR 51/22 + IV ZR 347/22 zu Limitierungsmaßnahmen. BU: abstrakte Verweisung (§ 172 VVG) bei Bestandsverträgen kritisch. Kfz-Haftpflicht: PflVG-Sonderlage (§ 5 PflVG Pflichtkontrahierung).

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn keine Wartezeit vereinbart ist → erwähne es nicht.
Wenn der Vertrag sehr umfangreich ist → analysiere ALLE wichtigen Ausschlüsse.
Wenn es eine Standard-Police ist → fokussiere auf typische Problemfelder.`,

      commonTraps: `Häufige Fallen bei Versicherungsverträgen (falls im Vertrag vorhanden):
• Zu weitgehende Leistungsausschlüsse (grobe Fahrlässigkeit nach BGH unzulässig — Quotelung erforderlich, § 81 Abs. 2 VVG)
• Unklare Obliegenheiten mit pauschaler Leistungsfreiheit bei jeder Verletzung — unwirksam (§ 28 VVG verlangt Quotelung bei grober FL)
• Vorvertragliche Anzeigepflicht: zu weitgehende Fragen ("alle relevanten Umstände") — unwirksam, nur in TEXTFORM gestellte Fragen sind anzeigepflichtig (§ 19 VVG)
• Fehlerhafte Widerrufsbelehrung — verlängert Widerrufsfrist auf 1 Jahr + 14 Tage (BGH/EuGH-Rspr.), insb. bei Lebensversicherungen 1994-2007
• Kündigung durch Versicherer nach jedem Schadensfall einseitig — § 92 VVG sieht beidseitiges Recht vor
• Zu lange Wartezeiten (Krankenvers.: max. 3 Monate allgemein, max. 8 Monate Zahnersatz § 197 VVG)
• BU-Versicherung mit abstrakter Verweisungsklausel (§ 172 VVG) — bei Bestandsverträgen häufig, kritisch für Berufsschutz
• Prämienanpassungsklauseln OHNE Sonderkündigungsrecht (§ 40 VVG) — unwirksam
• PKV: Beitragserhöhung ohne nachvollziehbare Begründung (§ 203 VVG / BGH IV ZR 51/22) angreifbar
• Unzureichende Deckungssummen für typische Schadenfälle bei der Sparte
• Bei Vermittler-Verträgen: fehlende Beratungs-Dokumentation (§ 6 VVG)
• Stillschweigende Verlängerung ohne Kündigungsmöglichkeit nach 3 Jahren (§ 11 Abs. 4 VVG)`,

      // 🌐 Phase-3-Pilot (03.05.2026): Pflicht-Prüfpunkte für versicherungsrechtliche
      // Tiefenanalyse. Fundiert auf VVG-Stand 03.02.2026 und aktueller
      // BGH-Rechtsprechung 2024/2025 (PKV-Limitierung). Werden zusätzlich zur
      // Universal-Analyse als typeSpecificFindings ausgegeben.
      pilotChecklist: `VERSICHERUNGSVERTRAGS-PFLICHTPRÜFUNG (Pilot-Tiefenanalyse):
Prüfe gezielt jeden dieser Punkte und gib das Ergebnis im Feld typeSpecificFindings zurück.
Wenn ein Punkt im Vertrag NICHT vorkommt → status "not_applicable" (das ist OK!).
Wenn ein Punkt vorkommt UND in Ordnung ist → status "ok".
Wenn ein Punkt vorkommt UND problematisch ist → status "issue" mit Klausel-Verweis.

CHECKPOINTS:
1. Vertragsart, Sparte & Geltungsbereich — Sach- / Lebens- (§§ 150 ff. VVG) / PKV (§§ 192 ff. VVG) / BU (§§ 172 ff. VVG) / Kfz-Haftpflicht (PflVG)? Verbraucher- (§ 13 BGB) oder Geschäftsversicherung? PKV: § 204 VVG Tarifwechselrecht zu gleichwertigen Tarifen erkennbar? Kfz-Haftpflicht: Pflichtversicherung nach PflVG (§ 5 PflVG Pflichtkontrahierung)?
2. Vorvertragliche Anzeigepflicht (§ 19 VVG) — Klauseln, die über in TEXTFORM gestellte Fragen hinausgehen ("alle relevanten Umstände") unwirksam. Belehrung über Rechtsfolgen falscher Angaben (§ 19 Abs. 5 VVG) ordnungsgemäß? Bei Gesundheitsdaten: DSGVO-konforme Einwilligung erforderlich
3. Beratungs- und Dokumentationspflicht (§ 6 VVG) — bei Vermittler-Verträgen: anlassbezogene Beratung dokumentiert? IDD-Konformität? Verstoß = Schadensersatzanspruch des VN
4. Widerrufsrecht (§§ 8, 152 VVG) — allgemein 14 Tage; LEBENSVERSICHERUNG 30 Tage (§ 152 Abs. 1 VVG). Belehrung formgerecht? Bei fehlerhafter Belehrung: erweiterter Widerruf bis 1 Jahr + 14 Tage (BGH/EuGH-Rspr., relevant für Verträge 1994-2007 mit Formfehlern)
5. Obliegenheiten & Quotelung (§ 28 VVG) — pauschale Leistungsfreiheit bei jeder Verletzung UNWIRKSAM. Quotelung bei grober Fahrlässigkeit erforderlich. Beweislast für fehlende grobe FL trägt VN. Kausalitätserfordernis (§ 28 Abs. 3 VVG) gewahrt?
6. Leistungsausschlüsse, grobe Fahrlässigkeit & abstrakte Verweisung — pauschaler Ausschluss bei grober FL nach BGH unwirksam (§ 81 Abs. 2 VVG: Quotelung). BU-Versicherung: abstrakte Verweisung (§ 172 VVG) — bei Bestandsverträgen bis ca. 2010 oft enthalten, heute meist Verzicht. Bei vorhandener Verweisungsklausel kritisch prüfen!
7. Wartezeiten (§ 197 VVG bei Krankenvers.) — allgemeine Wartezeit max. 3 Monate; Zahnersatz max. 8 Monate. Längere Wartezeiten unwirksam
8. Selbstbeteiligung, Deckungssummen & versteckte Begrenzungen — klar definiert und transparent? Verhältnismäßig zur Prämie? Kappungsgrenzen für typische Schadensfälle ausreichend? Versteckte Untergrenzen oder Sublimits?
9. Prämien- und Bedingungsanpassung (§§ 40, 203 VVG) — bei Erhöhung: Sonderkündigungsrecht für VN mit sofortiger Wirkung (§ 40 VVG)? Anpassungsklauseln OHNE Sonderkündigung unwirksam. PKV: § 203 VVG — nachvollziehbare Begründung erforderlich, 10%-Schwelle als Auslöser (BGH IV ZR 347/22), Limitierung nur bei korrekter Nachkalkulation wirksam (BGH IV ZR 51/22)
10. Kündigung nach Versicherungsfall (§§ 92, 111, 158 VVG) — beidseitiges Kündigungsrecht innerhalb 1 Monat nach Verhandlungsabschluss. Klauseln, die einseitig nur den Versicherer berechtigen, sind unausgewogen. Kfz-Haftpflicht: § 5 V S. 2 PflVG mit 1-Monats-Frist
11. Stillschweigende Verlängerung & Vertragslaufzeit (§ 11 VVG) — bei Mehrjahresvertrag mit Verlängerungsklausel: Frist und Modalitäten klar? Sonderkündigungsrecht nach 3 Jahren bei Mehrjahresverträgen (§ 11 Abs. 4 VVG)?
12. Fälligkeit der Versicherungsleistung & Verzug (§ 14 VVG) — Fälligkeit binnen 1 Monat nach abgeschlossenen Erhebungen. Klauseln, die das verzögern, sind kritisch. Verzugsfolgen klar geregelt?`
    },

    loan: {
      title: "Fachanwalt für Bank- und Kapitalmarktrecht",
      expertise: `Als Fachanwalt für Bank- und Kapitalmarktrecht mit Fokus auf Verbraucherdarlehen — inkl. BGB-Stand 03.02.2026, ZuFinG seit 1.1.2025, BGH 2025 zum Widerrufsjoker und EuGH C-203/22 zur SCHUFA — weißt du:

Bei Darlehensverträgen sind typischerweise relevant: Vertragstyp (Allgemein-Verbraucherdarlehen § 491 Abs. 2 / Immobiliar-Verbraucherdarlehen § 491 Abs. 3 / Unternehmenskredit), Pflichtangaben (§ 492 BGB / Art. 247 EGBGB), Widerrufsrecht (§§ 495, 356b), Bearbeitungsgebühren (BGH XI ZR 405/12), Vorfälligkeitsentschädigung (§ 502), Sondertilgung (§ 500), Restschuldversicherungs-Kopplung (§ 492a n.F.), Effektivzins (PAngV), Sicherheiten, Kreditwürdigkeitsprüfung (§ 505a), Verzugszinsen (§ 497) und Bank-Kündigung (§ 498).

WICHTIG für 2026: Verbraucherkreditrichtlinie 2.0 (CCD II) tritt am 20.11.2026 in Kraft — erfasst NEU auch Kleinkredite ≤ €200, zinsfreie Kredite, BNPL und kurzlaufende Darlehen ≤ 3 Monate. Restschuldversicherungs-Kopplungsverbot durch ZuFinG seit 1.1.2025 verschärft. EuGH C-203/22 vom 27.02.2025 zur SCHUFA stärkt Verbraucher-Auskunftsrechte über Score-Logik. BGH 2025 klargestellt: KEIN ewiger Widerruf nach komplett-Erfüllung.

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn keine Vorfälligkeitsentschädigung vereinbart ist → erwähne es positiv.
Wenn der Vertrag fehlerhafte Widerrufsbelehrung hat → bei laufendem Vertrag erweiterten Widerruf prüfen.
Wenn Bearbeitungsgebühren drin stehen → sofort auf Unwirksamkeit hinweisen (BGH XI ZR 405/12).`,

      commonTraps: `Häufige Fallen bei Darlehensverträgen (falls im Vertrag vorhanden):
• Bearbeitungsgebühren UNWIRKSAM (BGH XI ZR 405/12 vom 13.05.2014) → Rückforderung möglich, § 488 Abs. 1 S. 2 BGB
• Fehlerhafte Widerrufsbelehrung — bei laufenden Verträgen erweiterter Widerruf möglich; bei Immobilien max. 12 Monate + 14 Tage
• Überhöhte Vorfälligkeitsentschädigung — bei Allgemein-Verbraucherdarlehen MAX 1% (bzw. 0,5% bei <1J Restlaufzeit), bei Immobilien BGH-Formel; ausgeschlossen bei Versicherungsleistung oder unzureichenden Pflichtangaben (§ 502 Abs. 2 BGB)
• Restschuldversicherungs-Kopplung an Darlehen UNZULÄSSIG (§ 492a BGB n.F. seit 1.1.2025) → RSV-Vertrag nichtig
• Unklare Sicherheiten (Grundschuld ohne schriftliche Sicherungsabrede; Übersicherung verboten)
• Variable Zinsen ohne Referenzzinssatz, ohne transparenten Mechanismus, ohne Obergrenze (§ 307 BGB)
• Verzugszinsen über § 288/§ 497 BGB hinaus — bei Immobilien max. 2,5%-Pkt. über Basiszinssatz, sonst 5%-Pkt.
• § 498 BGB Schwellen für Bank-Kündigung wegen Zahlungsverzug nicht eingehalten (10%/5%/2,5% je nach Vertragstyp + 2-Wochen-Frist + Pflicht zur gütlichen Einigung)
• Versteckte Kosten nicht in Effektivzins eingerechnet (PAngV-Verstoß)
• Kreditwürdigkeitsprüfung (§ 505a) nicht dokumentiert; SCHUFA-Score-Logik intransparent (EuGH C-203/22 vom 27.02.2025)
• Sondertilgungsrecht ausgeschlossen oder unzulässig beschränkt (§ 500 BGB Verbraucher-Mindestrecht)`,

      // 🌐 Phase-3-Pilot (03.05.2026): Pflicht-Prüfpunkte für darlehensrechtliche
      // Tiefenanalyse. Fundiert auf BGB-Stand 03.02.2026, ZuFinG (Kopplungsverbot
      // seit 1.1.2025), CCD II (ab 20.11.2026), BGH XI ZR 405/12, BGH 2025 zum
      // Widerrufsjoker und EuGH C-203/22 vom 27.02.2025 zur SCHUFA.
      // Werden zusätzlich zur Universal-Analyse als typeSpecificFindings ausgegeben.
      pilotChecklist: `DARLEHENSVERTRAGS-PFLICHTPRÜFUNG (Pilot-Tiefenanalyse):
Prüfe gezielt jeden dieser Punkte und gib das Ergebnis im Feld typeSpecificFindings zurück.
Wenn ein Punkt im Vertrag NICHT vorkommt → status "not_applicable" (das ist OK!).
Wenn ein Punkt vorkommt UND in Ordnung ist → status "ok".
Wenn ein Punkt vorkommt UND problematisch ist → status "issue" mit Klausel-Verweis.

CHECKPOINTS:
1. Vertragstyp & Geltungsbereich — Allgemein-Verbraucherdarlehen (§ 491 Abs. 2 BGB) vs. Immobiliar-Verbraucherdarlehen (§ 491 Abs. 3) vs. Unternehmenskredit? Bei Verbraucher: zwingende §§ 491-505d BGB. CCD II ab 20.11.2026: erfasst NEU Kleinkredite ≤ €200, zinsfreie Kredite, BNPL, Laufzeit ≤ 3 Monate
2. Pflichtangaben im Vertrag (§ 492 BGB / Art. 247 EGBGB) — Schriftform gewahrt? Alle Pflichtangaben enthalten (Net-Kreditbetrag, Sollzinssatz, Effektivzinssatz, Vertragslaufzeit, Tilgungsplan-Anspruch, Kosten, Sicherheiten, Verzugszinssatz, Widerrufshinweis, Aufsichtsbehörde)? Bei Immobiliendarlehen: ESIS-Merkblatt vorvertraglich ausgehändigt (Anlage 6 EGBGB)?
3. Widerrufsrecht (§§ 495, 356b BGB) — 14 Tage ab Vertragsschluss + Pflichtangaben. Belehrung formgerecht (Anlage 7 EGBGB)? Bei FEHLERHAFTER Belehrung: erweiterter Widerruf möglich für laufende Verträge. Bei Immobiliardarlehen: erlischt nach 12 Monaten + 14 Tagen. Bei vollständig erfüllten Verträgen kein Widerruf mehr (BGH 2025)
4. Bearbeitungsgebühren (BGH XI ZR 405/12 vom 13.05.2014) — Bearbeitungsentgelt-Klauseln in Verbraucherdarlehen UNWIRKSAM, Banken müssen Kosten durch laufzeitabhängigen Zins decken (§ 488 Abs. 1 S. 2 BGB). Rückforderung gezahlter Gebühren möglich
5. Vorfälligkeitsentschädigung (§ 502 BGB) — Allgemein-Verbraucherdarlehen: max. 1% des vorzeitig zurückgezahlten Betrags, bei Restlaufzeit ≤ 1 Jahr max. 0,5%. Immobiliardarlehen: realer Schaden nach BGH-Formel (Aktiv-/Passiv-Vergleichsmethode). AUSGESCHLOSSEN wenn (a) Rückzahlung aus Versicherungsleistungen, (b) Vertrag unzureichende Angaben über Laufzeit/Kündigung/VFE-Berechnung enthält
6. Sondertilgungsrecht (§ 500 BGB) — Verbraucher kann jederzeit teilweise vorzeitig zurückzahlen — nicht vertraglich ausschließbar. Bei vereinbartem Sondertilgungsrecht: bei VFE-Berechnung mindernd zu berücksichtigen, auch wenn nie ausgeübt
7. Kopplungsverbot Restschuldversicherung (§ 492a BGB n.F. seit 1.1.2025) — Darlehensgeber darf Verbraucherdarlehen NICHT vom Abschluss einer RSV abhängig machen. Bei Verstoß: RSV-Vertrag NICHTIG, Darlehen bleibt wirksam. Geänderte Fassung durch Zukunftsfinanzierungsgesetz
8. Effektivzins-Berechnung (Preisangabenverordnung — PAngV) — Effektivzinssatz nach PAngV-Methode? Alle Kosten enthalten (Bearbeitung, Vermittlung, RSV bei Pflichtkopplung)? Versteckte Gebühren als Preisbestandteil?
9. Variable Zinsen & Zinsanpassungsklauseln — Anpassungsklauseln nur wirksam mit Referenzzinssatz + transparentem Mechanismus (BGH-Rspr.). Obergrenze (Cap)? Sonderkündigungsrecht bei Anpassung? Unklare Klauseln → § 307 BGB-unwirksam
10. Sicherheiten, Grundschuld & Sicherungsabrede — Sicherungsabrede schriftlich + zweckgebunden? Übersicherung-Verbot (BGH-Rspr.)? Grundschuld im Immobilienkredit: Zweckbestimmung klar? Verwertungsrechte transparent?
11. Kreditwürdigkeitsprüfung & Bonitätsdaten — § 505a BGB durchgeführt und dokumentiert? Verschärft durch CCD II ab 20.11.2026 (auch ohne Banklizenz, auch BNPL). DSGVO-Konformität bei SCHUFA-Abfrage: nach EuGH C-203/22 vom 27.02.2025 ist Bonitätsbewertung automatisierte Einzelentscheidung (Art. 22 DSGVO) — Verbraucher hat Auskunftsrecht über Score-Logik (Art. 15 DSGVO). Negative SCHUFA-Einträge nach Beglichen sofort zu löschen, pauschale 18-Monats-Fristen unzulässig
12. Vertragsbeendigung, Verzug & Bank-Kündigung — Verzugszinsen (§ 497 BGB): Immobilien max. 2,5%-Pkt. über Basiszinssatz, sonst 5%-Pkt. Gesamtfälligstellung durch Bank (§ 498 BGB) nur bei qualifiziertem Zahlungsverzug: 10% (Laufzeit ≤ 3J), 5% (> 3J), 2,5% (Immobilien) + 2-Wochen-Frist + Pflicht zur gütlichen Einigung. Außerordentliche Kündigung (§ 490 BGB) nur bei wichtigem Grund. Bei unbestimmter Laufzeit: jederzeit kündbar (§ 500 Abs. 1 BGB)`
    },

    service: {
      title: "Fachanwalt für IT-Recht und DSGVO",
      expertise: `Als Fachanwalt für IT-Recht mit DSGVO-Zertifizierung weißt du:

Bei Dienstleistungsverträgen (insb. SaaS) sind typischerweise relevant: Service Level Agreements (SLA), Datenschutz (DSGVO), Kündigungsrechte, Haftungsbeschränkungen, Datenrückgabe, Vendor Lock-In.

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn kein AVV (Auftragsverarbeitungsvertrag) beigefügt ist → kritisiere das scharf (Art. 28 DSGVO PFLICHT!).
Wenn der Vertrag DSGVO-konform ist → lobe das explizit.
Wenn Haftungsausschlüsse zu weit gehen → prüfe § 309 BGB.`,

      commonTraps: `Häufige Fallen bei Dienstleistungsverträgen (falls im Vertrag vorhanden):
• Fehlender Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO (PFLICHT bei personenbezogenen Daten!)
• Haftungsausschluss für Vorsatz/grobe Fahrlässigkeit (UNWIRKSAM nach § 309 BGB)
• Fehlende Datenrückgabe-Regelung (Art. 20 DSGVO: maschinenlesbar!)
• Vendor Lock-In durch proprietäre Datenformate
• Einseitige Leistungsänderungsrechte ohne Kündigungsrecht
• Unzureichende SLA-Penalties bei Ausfall`,

      // 🌐 Phase-2-Erweiterung (28.04.2026): Pilot-Typ ausgebaut.
      // Service-/Dienstleistungs-/SaaS-Verträge sind ein Hochfrequenz-B2B-Typ.
      // Tiefenanalyse mit konkreten Pflicht-Checkpoints.
      pilotChecklist: `DIENSTLEISTUNGSVERTRAGS-PFLICHTPRÜFUNG (Pilot-Tiefenanalyse):
Prüfe gezielt jeden dieser Punkte und gib das Ergebnis im Feld typeSpecificFindings zurück.
Wenn ein Punkt im Vertrag NICHT vorkommt → status "not_applicable" oder "issue" (je nach Wichtigkeit).
Wenn ein Punkt vorkommt UND in Ordnung ist → status "ok".
Wenn ein Punkt vorkommt UND problematisch ist → status "issue" mit Klausel-Verweis.

CHECKPOINTS:
1. Vertragsklassifikation — Dienstvertrag (§§ 611 BGB ff.) vs. Werkvertrag (§§ 631 BGB ff.) eindeutig erkennbar? Korrekte Gewährleistungs-/Abnahmeregeln?
2. Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO — vorhanden bei Verarbeitung personenbezogener Daten? PFLICHT, wenn Daten verarbeitet werden!
3. Datenrückgabe-/Löschpflicht bei Vertragsende (Art. 20 DSGVO, maschinenlesbares Format)
4. Service Level Agreements (SLA) — Verfügbarkeit (z.B. 99,5%/99,9%) und Reaktionszeiten klar definiert?
5. SLA-Penalties bei Nichterfüllung — verhältnismäßig zur Schadenshöhe?
6. Haftungsbegrenzung — Kappung verhältnismäßig (z.B. auf Auftragswert, max. 12-24 Monatshonorar)? Vorsatz/grobe Fahrlässigkeit ausgenommen (§ 309 Nr. 7 BGB)?
7. Vendor Lock-In — Datenexport-Möglichkeiten in offenen Formaten? Migration zu anderem Anbieter möglich?
8. Subunternehmer-Klausel — Information/Zustimmung des Auftraggebers bei Wechsel?
9. Geistiges Eigentum / Code-Ownership — bei individuell entwickelter Software: gehören Rechte dem Auftraggeber oder dem Auftragnehmer?
10. Preisanpassungsklauseln — Obergrenze pro Jahr? Sonderkündigungsrecht bei Erhöhung?
11. Geheimhaltung / Vertraulichkeit — Reichweite + nachvertragliche Wirksamkeit
12. Kündigungsrechte — beidseitig fair? Außerordentliche Kündigung bei wichtigem Grund klar geregelt?`
    },

    // 🔒 NDA / Geheimhaltungsvereinbarung — Pilot-Typ Phase 2
    nda: {
      title: "Fachanwalt für IT-Recht & Geheimnisschutz",
      expertise: `Als Fachanwalt mit Schwerpunkt Geheimnisschutz und Geschäftsgeheimnisgesetz (GeschGehG) weißt du:

Bei Geheimhaltungsvereinbarungen (NDAs) sind typischerweise relevant: Definition vertraulicher Informationen, Reichweite/Zweckbindung, Laufzeit, Standard-Carve-Outs (öffentlich bekannt, eigenständig entwickelt, behördlich angeordnet), Rückgabe-/Vernichtungspflicht, Vertragsstrafe, Geltungsbereich (auch Mitarbeiter/Berater?).

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn keine Vertragsstrafe drin steht → erwähne es nicht (kann sogar positiv sein).
Wenn die Definition vertraulicher Informationen sehr weit oder sehr eng ist → bewerte konkret.
Wenn es ein einseitiges (one-way) NDA ist → benenne das.`,

      commonTraps: `Häufige Fallen bei NDAs (falls im Vertrag vorhanden):
• Definition vertraulicher Informationen zu weit (= alles ist vertraulich = nichts ist durchsetzbar)
• Definition zu eng (z.B. nur "schriftlich gekennzeichnet") = praktisch wirkungslos
• Fehlende Standard-Carve-Outs (öffentlich bekannt, eigenständig entwickelt, gesetzlich offenzulegen) → Klausel kann unangemessen sein § 307 BGB
• Vertragsstrafe-Höhe unverhältnismäßig (in AGB unwirksam § 307 BGB; faustregel: nicht mehr als realistisch zu erwartender Schaden)
• Unbegrenzte Laufzeit der Geheimhaltung — bei nicht-Geschäftsgeheimnissen oft unangemessen, marktüblich 2-5 Jahre
• Fehlende Regelung zu Mitarbeitern/Beratern (Empfänger-Kreis)
• Fehlende Rückgabe-/Vernichtungspflicht bei Vertragsende
• One-way NDA ohne sachlichen Grund — bei beidseitigem Informationsaustausch sollte beidseitig sein
• Gerichtsstand / Rechtswahl ungünstig (z.B. Sitz der offenlegenden Partei in nicht-EU-Land)`,

      pilotChecklist: `NDA-PFLICHTPRÜFUNG (Pilot-Tiefenanalyse):
Prüfe gezielt jeden dieser Punkte und gib das Ergebnis im Feld typeSpecificFindings zurück.
Wenn ein Punkt im Vertrag NICHT vorkommt → status "not_applicable" oder "issue" je nach Wichtigkeit.
Wenn ein Punkt vorkommt UND in Ordnung ist → status "ok".
Wenn ein Punkt vorkommt UND problematisch ist → status "issue" mit Klausel-Verweis.

CHECKPOINTS:
1. Definition vertraulicher Informationen — angemessen weit/eng? Klar abgegrenzt?
2. Standard-Carve-Outs vorhanden? (öffentlich bekannt, eigenständig entwickelt, behördlich angeordnet, vorbekannt)
3. Laufzeit der Geheimhaltung — branchenüblich 2-5 Jahre, unbegrenzt nur bei echten Geschäftsgeheimnissen
4. Vertragsstrafe — Höhe verhältnismäßig? In AGB-Form (§ 307 BGB)?
5. Schadensersatz-Regelung neben Vertragsstrafe (kumulativ?)
6. Empfänger-Kreis — Mitarbeiter, Berater, verbundene Unternehmen einbezogen?
7. Rückgabe-/Vernichtungspflicht bei Vertragsende — geregelt?
8. Einseitig (one-way) oder beidseitig (mutual)? Sachgerecht für die Konstellation?
9. Geltungsbereich (territorial) und Rechtswahl/Gerichtsstand
10. Verhältnis zum GeschGehG — angemessene Schutzmaßnahmen vorausgesetzt (§ 2 Nr. 1 b GeschGehG)
11. Reichweite Zweckbindung — Empfänger darf Informationen nur für den vereinbarten Zweck nutzen`
    },

    other: {
      title: "Fachanwalt für allgemeines Vertragsrecht",
      expertise: `Als Fachanwalt für allgemeines Vertragsrecht mit 20+ Jahren Erfahrung weißt du:

Bei allgemeinen Verträgen sind typischerweise relevant: Vertragsparteien, Leistung & Gegenleistung, AGB-Kontrolle, Haftung, Kündigung, Gerichtsstand.

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn keine AGB einbezogen sind → erwähne das nicht.
Wenn der Vertrag sehr umfangreich ist → analysiere ALLE wichtigen Klauseln gründlich.
Wenn es ein sehr kurzer Vertrag ist → fokussiere auf die wenigen vorhandenen Klauseln.`,

      commonTraps: `Häufige Fallen bei allgemeinen Verträgen (falls im Vertrag vorhanden):
• AGB-Einbeziehung ohne ausdrücklichen Hinweis (§ 305 BGB) → unwirksam
• Überraschende Klauseln (§ 305c BGB) → unwirksam
• Haftungsausschluss für Vorsatz/grobe Fahrlässigkeit (UNWIRKSAM)
• Gerichtsstandsklauseln im Verbrauchervertrag (oft unwirksam)
• Unklare Leistungsbeschreibungen
• Fehlende Kündigungsregelungen`
    }
  };

  return awarenessMap[documentType] || awarenessMap.other;
}

/**
 * 🎯 ANWALTS-SIMULATION V3 - TOP-TIER LEGAL ANALYSIS
 * Simuliert einen erfahrenen Fachanwalt in einer 300€/h Erstberatung
 * KEINE Checklisten, KEINE Templates - nur individuelle, vertragsspezifische Analyse
 * Flexible Tiefe, Qualität > Quantität
 */
function generateDeepLawyerLevelPrompt(text, documentType, strategy, requestId, maxTokens) {
  // Token-Budget für Vertragstext kommt aus dem User-Plan (analyze.js übergibt das
  // plan-basierte Limit). Default 40k = BUSINESS_MAX_INPUT_TOKENS, damit Aufrufer,
  // die das Plan-Limit nicht kennen (z.B. die Edge-Route in contracts.js) trotzdem
  // sinnvolles Verhalten zeigen — nicht mehr 3000-hardcoded.
  // gpt-4-turbo hat 128k Kontext → 60k Vertrag + ~3k Prompt + ~4k Output = passt locker.
  const tokenBudget = typeof maxTokens === 'number' && maxTokens > 0 ? maxTokens : 40000;
  const optimizedText = optimizeTextForGPT4(text, tokenBudget, requestId);

  // Get contract-type-specific AWARENESS (nicht Checklisten!)
  const awareness = getContractTypeAwareness(documentType);

  // 🚀 V3: ANWALTS-SIMULATION - Wie ein echter Top-Anwalt mit 300€/h
  const professionalPrompt = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ ANWALTS-SIMULATION: ${awareness.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Du bist Dr. jur. ${awareness.title} mit 20+ Jahren Erfahrung in renommierten Großkanzleien.

📋 SZENARIO:
Ein Mandant schickt dir diesen Vertrag per E-Mail und fragt:
"Ist das für mich ein guter Vertrag? Worauf muss ich achten? Soll ich unterschreiben?"

Du hast jetzt 60 Minuten Zeit für eine gründliche Erstberatung (Honorar: 300€/h).
Der Mandant erwartet KEINE oberflächliche Durchsicht, sondern eine TIEFE, PROFESSIONELLE Analyse.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 DEIN VORGEHEN (wie ein echter Anwalt):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 📖 Lies den KOMPLETTEN Vertrag gründlich durch (jeden Absatz!)
2. 🔍 Identifiziere die SPEZIFISCHEN Klauseln in DIESEM konkreten Vertrag
3. ⚖️ Prüfe jede wichtige Klausel auf Rechtmäßigkeit (BGB/HGB/DSGVO/etc.)
4. 🚨 Markiere problematische Stellen (unwirksam, benachteiligend, unklar)
5. ✅ Erkenne faire und vorteilhafte Regelungen
6. 💡 Gib konkrete Handlungsempfehlungen für den Mandanten

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 DEINE FACHKENNTNIS (aus 20 Jahren Erfahrung):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${awareness.expertise}

${awareness.commonTraps}

${awareness.pilotChecklist ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 PILOT-TIEFENANALYSE (zusätzlich zur Universal-Analyse):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${awareness.pilotChecklist}

→ Diese Pflicht-Prüfung läuft ZUSÄTZLICH zur normalen Analyse, nicht als Ersatz.
→ Gib das Ergebnis als typeSpecificFindings-Array im JSON zurück (siehe Output-Schema).
→ Sei adaptiv: Wenn ein Punkt nicht relevant für DIESEN Vertrag ist (z.B. ein Pendelvertrag ohne Wettbewerbsverbot) → status "not_applicable" reicht, keine erfundenen Findings.
→ Diese Prüfung ergänzt die Standardfelder, sie ersetzt sie nicht.` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 UNIVERSELLE ANWALTS-PRINZIPIEN (NON-NEGOTIABLE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Analysiere NUR was IM VERTRAG steht - keine erfundenen Klauseln!
✅ Jede Bewertung mit konkretem § BGB/HGB/DSGVO begründen
✅ Wenn 10 Probleme existieren → nenne alle 10
✅ Wenn nur 2 Probleme existieren → nenne nur diese 2
✅ KEINE Schema-F-Analyse - jeder Vertrag ist anders!
✅ Qualität > Quantität (lieber 3 präzise als 10 oberflächliche Punkte)

❌ NIEMALS Einleitungsphrasen: "Der vorliegende Vertrag...", "Es handelt sich um..."
❌ NIEMALS Abschlussfloskeln: "Insgesamt...", "Zusammenfassend..."
❌ NIEMALS generische Platzhalter ohne konkreten Vertragsbezug
❌ NIEMALS oberflächlich - dein Mandant zahlt 300€/Stunde!
❌ NIEMALS vage Formulierungen - sei präzise und konkret!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 UNIVERSALITÄTS-PRINZIP (KRITISCH FÜR DEN OUTPUT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Du bekommst gleich ein Output-Schema mit vielen Feldern. Befolge dabei diese Regel:

✅ Felder sind ADAPTIV: Lasse Felder WEG (gib sie GAR NICHT aus oder leeres Array []),
   wenn dieser konkrete Vertrag dazu nichts inhaltlich Substanzielles hergibt.
✅ Beispiel: Ein leerer Mustervertrag hat keine "positiveAspects" → das Feld weglassen.
✅ Beispiel: Ein Letter of Intent hat keine "criticalIssues" im klassischen Sinn → leer lassen.
✅ Beispiel: Ein Vertrag ohne Marktvergleichspunkte → "comparison" weglassen.

❌ NIEMALS leere Floskel-Einträge produzieren, nur damit ein Feld "gefüllt" wirkt.
❌ NIEMALS erfundene Inhalte zur Schema-Vervollständigung.

PFLICHTFELDER (immer ausgeben): documentCharacterization, completeness,
asymmetryAssessment, contractScore, scoreReasoning, detailedLegalOpinion.
Alle anderen sind ADAPTIV.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📏 TIEFE DER ANALYSE (FLEXIBEL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 **Kurzer 2-Seiten-Vertrag mit 3-5 Klauseln:**
   → 2-3 critical issues, 2-3 recommendations = VÖLLIG OK
   → Fokussiere auf das Wesentliche, keine Fülltext

🔍 **Standard 5-Seiten-Vertrag mit 10-15 Klauseln:**
   → 4-6 critical issues, 4-6 recommendations = angemessen
   → Analysiere alle wichtigen Klauseln gründlich

🔍 **Komplexer 10+-Seiten-Vertrag mit 30+ Klauseln:**
   → 8-15 critical issues, 8-12 recommendations = erwartet
   → Tiefenanalyse ALLER relevanten Klauseln

⚠️ NIEMALS:
❌ Künstlich auf feste Anzahl bringen
❌ Oberflächlich bleiben um schneller fertig zu sein
❌ Irrelevante Punkte erfinden um Mindestanzahl zu erreichen

✅ IMMER:
✅ Wenn du 1 kritisches Problem siehst → nenne 1 (aber gründlich!)
✅ Wenn du 20 kritische Probleme siehst → nenne alle 20
✅ Qualität und Relevanz stehen ÜBER Anzahl

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ANALYSE-STRUKTUR (JSON):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 RECOGNITION-FELDER (PFLICHT — IMMER AUSGEBEN):
─────────────────────────────────────────────

A. **documentCharacterization** (Object, PFLICHTFELD):
   Schema: {
     "description": "Freier Text — was ist dieses Dokument WIRKLICH?",
     "rationale": "1-2 Sätze: woran erkennst du das?"
   }
   → Charakterisiere das Dokument in deinen eigenen Worten — KEINE feste Liste!
   → Nutze die Bezeichnung, die juristisch am genauesten passt:
      Beispiele: "Mustervertrag (Vorlage, Parteien noch nicht ausgefüllt)" |
                 "Vorvertrag (Letter of Intent, kein bindender Hauptvertrag)" |
                 "Term Sheet als Verhandlungsgrundlage" |
                 "Aktiver, beidseitig unterzeichneter Mietvertrag" |
                 "Hybridzustand: teilweise unterzeichnet, einzelne Klauseln noch leer" |
                 "Side Letter / Anhang zu einem Hauptvertrag" |
                 "Memorandum of Understanding" |
                 "Rechnung mit AGB-Verweis (kein eigenständiger Vertrag)" |
                 "Allgemeine Geschäftsbedingungen (AGB) — keine Individualvereinbarung"
   → SEI ECHRLICH: Wenn Parteien fehlen, Unterschrift fehlt, Datum fehlt, Platzhalter im Text stehen → SAGE DAS!
   → rationale: konkrete Belege ("Felder '[NAME]' und '____' im Header", "kein Unterschriftenblock am Ende", "explizit als 'Muster' bezeichnet")

B. **completeness** (Object, PFLICHTFELD):
   Schema: {
     "isComplete": true | false,
     "observation": "Freier Text: was ist drin, was fehlt?",
     "openItems": ["Liste der offenen/leeren/fehlenden Punkte"] // optional, kann [] sein
   }
   → Prüfe inhaltlich: Sind alle für DIESEN Dokumenttyp essenziellen Elemente ausgefüllt?
   → KEINE starre Checkliste — beurteile relativ zu dem, was das Dokument zu sein vorgibt
   → Beispiel komplett: { "isComplete": true, "observation": "Alle Parteien benannt, Datum vorhanden, beidseitig unterzeichnet, alle Konditionen ausgefüllt", "openItems": [] }
   → Beispiel unvollständig: { "isComplete": false, "observation": "Mustervertrag — Lieferanten-Adresse, Unterschriften und Datum fehlen", "openItems": ["Adresse Supplier", "Unterschriftenblock", "Vertragsdatum"] }

C. **asymmetryAssessment** (Object, PFLICHTFELD):
   Schema: {
     "rating": "balanced" | "mostly-fair" | "one-sided" | "heavily-one-sided",
     "favoredParty": "string oder null (z.B. 'Käufer', 'Vermieter', 'Auftraggeber')",
     "explanation": "2-4 Sätze: woran festgemacht, mit konkreten Klausel-Verweisen"
   }
   → Bewerte, ob der Vertrag ausgewogen oder einseitig strukturiert ist
   → "balanced" nur bei wirklich beidseitig fairer Verteilung von Pflichten/Rechten/Risiken
   → "heavily-one-sided" wenn eine Partei fast nur Pflichten/Risiken trägt (Beispiel: Recall-Kosten + Vertragsstrafe + uneingeschränkte Compliance-Last bei einer Partei)
   → favoredParty: Wer profitiert? Bei "balanced" → null
   → explanation MIT konkreten Klausel-Verweisen aus DIESEM Vertrag

D. **scoreReasoning** (String, PFLICHTFELD — gehört zu contractScore):
   → 3-5 Sätze: warum genau dieser Score und nicht 5 Punkte höher/niedriger?
   → Holistische Bewertung: was zieht runter, was hebt, wie ist das Gesamtbild?
   → Beispiel: "Score 67/100 — der Vertrag ist juristisch solide aufgesetzt und enthält klare Verzugsregelungen, wird aber durch eine deutlich einseitige Haftungsverteilung zugunsten des Recipients gedrückt. Die fehlende Haftungsbegrenzung und die uneingeschränkte Compliance-Last für den Supplier sind wesentliche Verhandlungspunkte. Ohne diese Schieflagen wäre der Vertrag im Bereich 80-85."

─────────────────────────────────────────────
ADAPTIVE FELDER (nur ausgeben wenn substanziell):
─────────────────────────────────────────────

1. **laymanSummary** (String[], FLEXIBEL 2-5 Punkte):
   → ALLTAGSSPRACHE ohne Jura-Fachbegriffe!
   → "Was bedeutet das für mich ganz konkret?"
   → Kurzer Vertrag: 2-3 Punkte, Langer Vertrag: 4-5 Punkte
   → Max. 1-2 Sätze pro Punkt, fokussiert auf praktische Auswirkungen
   → Beispiel RICHTIG: "Du kannst das Auto 2 Jahre lang bei Problemen reklamieren - egal was im Vertrag steht"
   → Beispiel FALSCH: "Die Gewährleistung gemäß § 437 BGB bleibt unberührt..."

2. **summary** (String[], 3-6 Punkte - WEICHE GRENZE):
   → Keine Einleitung! Starte direkt mit konkreten Vertragsinhalten
   → KOMPAKT: Max. 2-3 Sätze pro Punkt, fokussiert auf Zahlen/Daten/Fristen
   → Beispiel RICHTIG: "Kaufpreis 24.500€ fällig am 15.06.2024. Eigentumsvorbehalt bis Vollzahlung (§ 449 BGB)."
   → Beispiel FALSCH: "Der Vertrag regelt den Kauf eines Fahrzeugs zwischen den Parteien"

3. **legalAssessment** (String[], 3-8 Punkte - WEICHE GRENZE):
   → Rechtliche Bewertung JEDER kritischen Klausel
   → KOMPAKT: Max. 2 Sätze, Format: [Klausel] → [Rechtliche Einordnung] → [Konsequenz]
   → IMMER mit Gesetzesreferenz (§§ BGB, HGB, etc.)
   → Beispiel: "Gewährleistungsausschluss § 5 unwirksam (§ 444 BGB). Käufer kann trotz Klausel Mängelrechte geltend machen."

4. **suggestions** (String[], 3-8 Punkte - WEICHE GRENZE):
   → Konkrete Handlungsempfehlungen mit Formulierungsvorschlägen
   → KOMPAKT: Max. 2 Sätze, direkt auf den Punkt
   → Priorisierung: Kritische Punkte zuerst
   → Beispiel: "Klausel § 5 streichen. Ersetzen durch: 'Gewährleistung nach §§ 433ff BGB, bei Gebrauchtware 1 Jahr'."

5. **comparison** (String[], 2-4 Punkte - WEICHE GRENZE):
   → Marktvergleich für DIESE spezifische Branche/Vertragsart
   → KOMPAKT: Max. 2 Sätze mit konkreten Benchmarks
   → Beispiel: "Kündigungsfrist 3 Monate über Branchenstandard. Üblich: 1 Monat bei Monatsverträgen."

6. **positiveAspects** (Object[], 2-5 Objekte - WEICHE GRENZE):
   Schema: {
     "title": "Spezifischer Vorteil (max. 8 Wörter)",
     "description": "KOMPAKT: Max. 2 Sätze Erklärung",
     "impact": "high" | "medium" | "low"  // optional
   }
   → NUR echte Stärken! Wenn Vertrag schlecht → nur 1-2 Punkte
   → Beispiel: {"title": "Faire Kündigungsfrist 1 Monat", "description": "Branchenstandard 3 Monate. Spart Flexibilität.", "impact": "high"}

7. **criticalIssues** (Object[], 2-6 Objekte - WEICHE GRENZE):
   Schema: {
     "title": "Spezifisches Risiko (max. 10 Wörter)",
     "description": "KOMPAKT: Max. 2 Sätze zu Folgen",
     "riskLevel": "critical" | "high" | "medium" | "low",
     "legalBasis": "§ 123 BGB" | "Art. 6 DSGVO" | etc.  // optional
     "consequence": "KOMPAKT: 1 Satz konkrete Folge"  // optional
   }
   → 0 Punkte wenn Vertrag perfekt, 6+ wenn katastrophal
   → Beispiel: {"title": "Unwirksamer Gewährleistungsausschluss", "description": "Klausel nichtig nach § 475 BGB. Käufer hat trotzdem 2 Jahre Gewährleistung.", "riskLevel": "critical", "legalBasis": "§ 475 BGB", "consequence": "Bei Motorschaden nach 6 Monaten volle Rechte"}

8. **recommendations** (Object[], 3-6 Objekte - WEICHE GRENZE):
   Schema: {
     "title": "Konkrete Maßnahme (max. 8 Wörter)",
     "description": "KOMPAKT: Max. 2 Sätze Umsetzung",
     "priority": "urgent" | "high" | "medium" | "low",
     "timeframe": "Sofort" | "Vor Vertragsschluss" | "Binnen 14 Tagen" | etc.  // optional
     "effort": "low" | "medium" | "high"  // optional
   }

9. **contractScore** (Number, 1-100):
   → Gesamtbewertung basierend auf Risiken vs. Vorteilen
   → 90-100: Exzellent, kaum Risiken
   → 70-89: Gut, kleinere Optimierungen
   → 50-69: Akzeptabel, größere Mängel
   → 30-49: Problematisch, kritische Risiken
   → 1-29: Inakzeptabel, nicht unterschreiben

10. **quickFacts** (Object[], GENAU 3 Objekte - PFLICHTFELD):
   → Wähle die 3 WICHTIGSTEN Eckdaten basierend auf DOKUMENTTYP:

   📄 Bei KÜNDIGUNGSBESTÄTIGUNG:
      - Label 1: "Gekündigt zum" (Datum der Wirksamkeit)
      - Label 2: "Anbieter" (Firmenname)
      - Label 3: "Restlaufzeit" (bis zur Wirksamkeit)

   📋 Bei LAUFENDEM VERTRAG (Abo, Versicherung, Telekom, etc.):
      - Label 1: "Kündigungsfrist" (z.B. "3 Monate")
      - Label 2: "Ablaufdatum" / "Nächste Verlängerung"
      - Label 3: "Monatliche Kosten" oder "Laufzeit"

   🛒 Bei EINMALIGEM KAUFVERTRAG:
      - Label 1: "Kaufdatum"
      - Label 2: "Kaufpreis"
      - Label 3: "Gewährleistung bis"

   👔 Bei ARBEITSVERTRAG:
      - Label 1: "Arbeitsbeginn"
      - Label 2: "Kündigungsfrist"
      - Label 3: "Befristung" oder "Unbefristet"

   🏠 Bei MIETVERTRAG:
      - Label 1: "Mietbeginn"
      - Label 2: "Kündigungsfrist"
      - Label 3: "Monatliche Miete"

   Schema: {
     "label": "Passender Label-Text (siehe oben)",
     "value": "Konkreter Wert aus Dokument",
     "rating": "good" | "neutral" | "bad"
   }
   → Für schnelle Übersicht der wichtigsten Eckdaten

11. **legalPulseHooks** (String[] - OPTIONAL für Legal Pulse Integration):
   → Markiere relevante Rechtsgebiete/Themen für Legal Pulse Radar
   → Beispiele: "Mietpreisbremse", "TKG-Reform 2022", "DSGVO", "Mindestlohn", "Widerrufsrecht"
   → Max. 3-5 relevante Themen
   → Wird später mit Legal Pulse Feature verbunden

12. **importantDates** (Object[] - KRITISCH für Kalender-Integration):
   → Extrahiere ALLE vertragsrelevanten Datums aus dem Vertrag!
   → Diese werden automatisch in den Vertragskalender übertragen!

   Schema: {
     "type": "start_date" | "end_date" | "cancellation_deadline" | "minimum_term_end" |
             "probation_end" | "warranty_end" | "renewal_date" | "payment_due" |
             "notice_period_start" | "contract_signed" | "delivery_date" | "other",
     "date": "YYYY-MM-DD" (ISO Format!),
     "label": "Beschreibung (z.B. 'Vertragsbeginn', 'Kündigungsfrist endet', 'Probezeit endet')",
     "description": "Kurze Erklärung warum dieses Datum wichtig ist",
     "calculated": true | false,  // true wenn berechnet, false wenn explizit im Vertrag
     "source": "Wo im Vertrag gefunden (z.B. '§ 5 Abs. 2', 'Seite 1', 'Kleingedrucktes')"
   }

   📅 WICHTIGE DATUMS-TYPEN (alle extrahieren wenn vorhanden!):
   - start_date: Vertragsbeginn, Mietbeginn, Arbeitsbeginn, Kaufdatum, Anmeldedatum, Beitrittsdatum
   - end_date: Vertragsende, Ablaufdatum, Laufzeitende, Mietende, befristet bis
   - cancellation_deadline: NÄCHSTER Kündigungstermin (berechnet aus Kündigungsfrist!)
   - minimum_term_end: Ende der Mindestlaufzeit ("Kündigung ab 6. Monat möglich", "Erstlaufzeit", "Bindungsfrist")
   - probation_end: Probezeitende (bei Arbeitsverträgen)
   - warranty_end: Gewährleistungsende, Garantieende (bei Kaufverträgen, Handwerkerverträgen)
   - renewal_date: Automatische Verlängerung (wenn Auto-Renewal), Verlängerungsdatum
   - payment_due: Zahlungsfrist, Fälligkeit, Ratenzahlung, nächste Rate
   - notice_period_start: Ab wann muss Kündigung eingereicht werden
   - insurance_coverage_end: Versicherungsschutz endet (bei Versicherungen)
   - trial_end: Testphase/Probemonat endet (bei Abos, Software)
   - price_guarantee_end: Preisgarantie endet (bei Strom/Gas/Telekom)
   - contract_signed: Unterschriftsdatum, Vertragsabschluss
   - service_start: Leistungsbeginn (wenn anders als Vertragsbeginn)
   - inspection_due: Nächste Inspektion/TÜV/Wartung fällig
   - license_expiry: Lizenz läuft ab (Software, Zertifikate)
   - lease_end: Leasing endet, Rückgabetermin
   - loan_end: Kredit/Darlehen vollständig getilgt
   - interest_rate_change: Zinsbindung endet (bei Krediten)
   - option_deadline: Optionsfrist (z.B. Kaufoption bei Leasing)
   - other: Sonstige wichtige Datums

   🏢 VERTRAGSTYP-SPEZIFISCHE DATUMS:

   📱 MOBILFUNK/INTERNET/TELEKOM:
   - Mindestvertragslaufzeit (meist 24 Monate)
   - Kündigungsfrist (meist 3 Monate zum Laufzeitende)
   - Preisgarantie endet
   - Hardware-Ratenzahlung endet

   🏋️ FITNESS/MITGLIEDSCHAFTEN:
   - Anmeldedatum = Vertragsbeginn
   - "Kündigung ab X. Monat möglich" → minimum_term_end berechnen!
   - "wöchentlich/monatlich kündbar nach Mindestlaufzeit"
   - Kündigungsfrist (oft 4 Wochen zum Monatsende)

   🏠 MIETVERTRÄGE:
   - Mietbeginn
   - Befristung endet (wenn befristet)
   - Staffelmiete: nächste Erhöhung
   - Kündigungsfrist (gesetzlich 3 Monate, kann länger sein)

   💼 ARBEITSVERTRÄGE:
   - Arbeitsbeginn
   - Probezeit endet (meist 6 Monate)
   - Befristung endet
   - Kündigungsfristen (gestaffelt nach Betriebszugehörigkeit)

   🚗 KFZ/LEASING:
   - Leasingbeginn
   - Leasingende / Rückgabetermin
   - Nächste TÜV-Prüfung
   - Kaufoption-Frist

   🏦 KREDITE/FINANZIERUNG:
   - Auszahlungsdatum
   - Erste Rate fällig
   - Zinsbindung endet
   - Kredit vollständig getilgt
   - Sondertilgung möglich ab

   🛡️ VERSICHERUNGEN:
   - Versicherungsbeginn
   - Hauptfälligkeit (jährliche Verlängerung)
   - Kündigungsfrist (meist 3 Monate zur Hauptfälligkeit)
   - Beitragsanpassung

   📦 ABONNEMENTS/STREAMING:
   - Abo-Start
   - Testphase endet (Trial)
   - Monatlich/jährlich kündbar
   - Preiserhöhung ab

   ⚡ STROM/GAS/ENERGIE:
   - Lieferbeginn
   - Erstlaufzeit endet
   - Preisgarantie endet
   - Kündigungsfrist (oft 4-6 Wochen)

   🧮 BERECHNUNGEN (IMMER wenn möglich!):
   - "Kündigungsfrist 3 Monate zum Jahresende" + heute → berechne nächsten Kündigungstermin!
   - "Mindestlaufzeit 6 Monate" + Vertragsbeginn → berechne wann kündbar!
   - "Probezeit 6 Monate" + Arbeitsbeginn → berechne Probezeitende!
   - "Gewährleistung 2 Jahre" + Kaufdatum → berechne Gewährleistungsende!
   - "24 Monate Laufzeit" + Vertragsbeginn → berechne Vertragsende!
   - "monatlich kündbar" → nächstes Monatsende als cancellation_deadline!
   - "zum Quartalsende kündbar" → nächstes Quartalsende berechnen!
   - "14 Tage Widerrufsrecht" + Vertragsabschluss → Widerrufsfrist berechnen!
   - Zinsbindung X Jahre + Kreditbeginn → Ende Zinsbindung berechnen!

   ⚠️ WICHTIG: Auch wenn Datum nicht explizit steht, aber BERECHENBAR ist → berechnen und "calculated": true setzen!

   🚫 NIEMALS DATUMS ERFINDEN:
   - Nur Datums eintragen, die EXPLIZIT im Vertrag stehen ODER sicher BERECHENBAR sind!
   - Wenn ein Kaufvertrag nur das Kaufdatum hat → NUR das Kaufdatum eintragen!
   - Wenn keine Kündigungsfrist erwähnt wird → KEINE Kündigungsfrist eintragen!
   - Wenn keine Laufzeit steht → KEIN Enddatum erfinden!
   - Bei Unsicherheit: Datum WEGLASSEN statt raten!
   - Leeres Array [] ist OK wenn es keine relevanten Datums gibt!

   ✅ RICHTIG: Kaufvertrag vom 11.12.2024 ohne weitere Fristen → [{"type": "contract_signed", "date": "2024-12-11", "label": "Kaufdatum", ...}]
   ❌ FALSCH: Kaufvertrag vom 11.12.2024 → "Gewährleistung endet 2026" (wenn nicht explizit im Vertrag!)

   Beispiel Output:
   [
     {"type": "start_date", "date": "2024-01-15", "label": "Vertragsbeginn", "description": "Fitnessstudio-Mitgliedschaft startet", "calculated": false, "source": "Seite 1"},
     {"type": "minimum_term_end", "date": "2024-07-15", "label": "Kündbar ab", "description": "6 Monate Mindestlaufzeit enden - ab jetzt kündbar!", "calculated": true, "source": "§ 4 Abs. 2: Mindestlaufzeit 6 Monate"},
     {"type": "cancellation_deadline", "date": "2024-06-15", "label": "Kündigungsfrist", "description": "Kündigung muss bis hier eingereicht werden für Vertragsende Juli", "calculated": true, "source": "§ 4 Abs. 3: 1 Monat Kündigungsfrist"}
   ]

13. **detailedLegalOpinion** (String - PFLICHTFELD):
   → Ausführliches, sachliches Rechtsgutachten als Fließtext (KEIN Brief-Stil!)
   → Fasst alle Aspekte zusammen wie ein professionelles Anwalts-Memo auf FACHANWALTSNIVEAU
   → KEINE Anrede ("Sehr geehrter..."), KEINE direkten Anweisungen ("Unterschreiben Sie...")
   → Stattdessen: Sachliche Bewertung ("Dieser Vertrag ist...", "Problematisch ist...", "Die Klausel X entspricht...")
   → LÄNGE: 100% FLEXIBEL basierend auf INHALTLICHEM Analyse-Bedarf (NICHT Seitenzahl!)
     ⚠️  KRITISCH: Seitenzahl ist IRRELEVANT! Nur der tatsächliche Analyse-Bedarf zählt!

     📊 Orientierung nach INHALT (nicht nach Seiten!):
     ✅ Wenig zu analysieren (nur Standard-Klauseln, alles rechtlich OK): 300-500 Wörter
        → Beispiel: 40-Seiten-Vertrag mit nur üblichen Klauseln = kurz ist OK!
     ✅ Moderate Analyse (einige interessante/problematische Punkte): 500-800 Wörter
        → Beispiel: Typischer Vertrag mit 2-3 diskussionswürdigen Klauseln
     ✅ Viel zu analysieren (viele Probleme, komplexe Sachverhalte, kritische Klauseln): 800-1500 Wörter
        → Beispiel: 2-Seiten-Vertrag mit hochkomplexen Rechtsproblemen = lang ist OK!

     💎 Qualitätsprinzip:
     ✅ Schreibe NUR so viel, wie es wirklich zu sagen gibt
     ✅ Erkläre wichtige Klauseln ausführlich, aber überspringe Standardklauseln
     ✅ Liefere tiefgehende Begründungen bei Problemen, aber erfinde keine Probleme
     ✅ Gib Kontext bei kritischen Punkten, aber schweife nicht ab
     ❌ NIEMALS künstlich auffüllen, um eine Wortzahl zu erreichen!
     ❌ NIEMALS irrelevante Details erfinden oder vom Vertrag abschweifen!
   → Struktur (fließend, nicht als Überschriften):
     • Gesamteinschätzung (1-3 Absätze je nach Vertrag)
     • Wichtige/diskussionswürdige Klauseln besprechen (Standard-Klauseln kannst du überspringen!)
     • Problematische Klauseln AUSFÜHRLICH mit Begründung, Konsequenzen & § BGB-Verweisen
     • Bei Bedarf: Rechtliche Zusammenhänge erklären (nur wenn relevant!)
     • Abschließende Gesamtbewertung
   → Beispiel Anfang: "Dieser KFZ-Kaufvertrag ist grundsätzlich rechtswirksam und entspricht der üblichen Praxis bei Gebrauchtwagenverkäufen zwischen Privatpersonen. Die Gewährleistungsfrist von 12 Monaten ist nach § 475 BGB für Verbrauchsgüterkäufe bei gewerblichen Verkäufern zulässig, jedoch ist zu prüfen, ob der Verkäufer tatsächlich als Gewerbetreibender einzustufen ist..."
   → Beispiel Ende: "...Zusammenfassend weist der Vertrag eine rechtlich unwirksame Klausel gemäß § 309 Nr. 7 BGB auf, die im Streitfall zur Nichtigkeit dieser Regelung führen würde. Die übrigen Regelungen sind marktüblich, rechtlich einwandfrei und bieten beiden Parteien einen angemessenen Interessenausgleich."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ ANTI-PATTERN BEISPIELE (So NICHT!):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FALSCH: "Der vorliegende Kaufvertrag regelt den Erwerb eines Fahrzeugs. Die Parteien haben sich auf einen Kaufpreis geeinigt."
RICHTIG: "Kaufpreis 15.000€ ohne Regelung zur Rückabwicklung bei Sachmängeln - kritisch bei Gebrauchtwagen (§ 437 BGB)"

FALSCH: "Die Kündigungsfrist ist angemessen."
RICHTIG: "Kündigungsfrist 6 Monate zum Quartalsende deutlich über gesetzlichem Minimum (§ 621 BGB: 4 Wochen) - Nachteil für Arbeitnehmer"

FALSCH: "Es sollten Verbesserungen vorgenommen werden."
RICHTIG: "Klausel § 12 Abs. 3 streichen: 'Bei Zahlungsverzug Verzugszinsen i.H.v. 15% p.a.' → ersetzen durch '5% über Basiszinssatz gem. § 288 BGB'"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 ZU ANALYSIERENDER VERTRAG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${optimizedText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ ANTWORT-FORMAT: NUR VALIDES JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antworte AUSSCHLIESSLICH mit folgendem JSON (keine Markdown-Blöcke, kein Text davor/danach):

{
  "laymanSummary": ["Laien-Punkt 1 (Alltagssprache!)", "Laien-Punkt 2", "..."],
  "summary": ["Punkt 1 (max. 2-3 Sätze)", "Punkt 2", "..."],
  "legalAssessment": ["Bewertung 1 (max. 2 Sätze)", "Bewertung 2", "..."],
  "suggestions": ["Vorschlag 1 (max. 2 Sätze)", "Vorschlag 2", "..."],
  "comparison": ["Benchmark 1 (max. 2 Sätze)", "Benchmark 2", "..."],
  "positiveAspects": [{"title": "Vorteil (max. 8 Wörter)", "description": "Max. 2 Sätze", "impact": "high"}],
  "criticalIssues": [{"title": "Risiko (max. 10 Wörter)", "description": "Max. 2 Sätze", "riskLevel": "critical", "legalBasis": "§ X BGB", "consequence": "1 Satz Folge"}],
  "recommendations": [{"title": "Maßnahme (max. 8 Wörter)", "description": "Max. 2 Sätze", "priority": "urgent", "timeframe": "Sofort", "effort": "low"}],
  "contractScore": 75,
  "quickFacts": [{"label": "Kündigungsfrist", "value": "3 Monate", "rating": "bad"}],
  "importantDates": [
    {"type": "start_date", "date": "2024-01-15", "label": "Vertragsbeginn", "description": "Mitgliedschaft startet", "calculated": false, "source": "Seite 1"},
    {"type": "minimum_term_end", "date": "2024-07-15", "label": "Kündbar ab", "description": "Mindestlaufzeit endet", "calculated": true, "source": "§ 4: 6 Monate Mindestlaufzeit"},
    {"type": "cancellation_deadline", "date": "2024-12-15", "label": "Kündigungsfrist", "description": "Nächster Termin für Kündigung", "calculated": true, "source": "§ 5: 1 Monat zum Jahresende"}
  ],
  "legalPulseHooks": ["Mietpreisbremse", "TKG-Reform 2022", "..."],
  "detailedLegalOpinion": "Ausführliches Rechtsgutachten als Fließtext auf Fachanwaltsniveau: Dieser Vertrag ist grundsätzlich... [FLEXIBLE Länge je nach INHALT: 300-500 Wörter wenn wenig zu sagen, 500-800 Wörter bei moderater Analyse, 800-1500 Wörter wenn viel zu besprechen. Seitenzahl IRRELEVANT! Nur tatsächlicher Analyse-Bedarf zählt!]",
  "typeSpecificFindings": [
    { "checkpoint": "Probezeit-Länge", "status": "ok", "finding": "Probezeit von 4 Monaten ist innerhalb des gesetzlichen Maximums von 6 Monaten (§ 622 Abs. 3 BGB).", "legalBasis": "§ 622 Abs. 3 BGB" },
    { "checkpoint": "Wettbewerbsverbot mit Karenzentschädigung", "status": "issue", "finding": "Nachvertragliches Wettbewerbsverbot in § 14 ohne Karenzentschädigung — nach § 74 Abs. 2 HGB unverbindlich.", "legalBasis": "§ 74 Abs. 2 HGB", "clauseRef": "§ 14 Wettbewerbsverbot" },
    { "checkpoint": "Mindestlohn-Konformität", "status": "not_applicable", "finding": "Vertrag enthält keine Stundenlohnregelung, sondern Festgehalt deutlich über Mindestlohn." }
  ]
}

NUR FÜR PILOT-TYPEN (Mietvertrag, Arbeitsvertrag, NDA): typeSpecificFindings ist die strukturierte
Antwort auf die PILOT-TIEFENANALYSE oben. Für alle anderen Vertragstypen: Feld weglassen oder leeres
Array []. Status-Werte: "ok" | "issue" | "not_applicable". Bei "issue" möglichst klauselReferenz
mitgeben.`;

  return professionalPrompt;
}

/**
 * 📋 Enhanced PDF Content Validator and Analyzer - UNCHANGED
 * Combines the old assessment with new smart analysis
 */
async function validateAndAnalyzeDocument(filename, pdfText, pdfData, requestId) {
  console.log(`🧠 [${requestId}] Starting smart document analysis for: ${filename}`);
  
  try {
    // Basic PDF validation
    if (!pdfText || pdfText.trim().length === 0) {
      console.log(`⚠️ [${requestId}] No text extracted - potential scan document`);
      return {
        success: false,
        error: 'NO_TEXT_CONTENT',
        canRetryWithOCR: true,
        message: '📸 Diese PDF enthält keinen lesbaren Text. Es handelt sich wahrscheinlich um ein gescanntes Dokument.',
        details: 'Das Dokument scheint gescannt zu sein. Eine OCR-Analyse könnte helfen.',
        suggestions: [
          '📄 Konvertiere die PDF in ein durchsuchbares Format (z.B. mit Adobe Acrobat)',
          '🔍 Öffne das Dokument in Word, das oft Text aus Scans erkennen kann',
          '🖨️ Erstelle eine neue PDF aus dem Originaldokument (falls verfügbar)',
          '🔍 Nutze ein Online-OCR-Tool (z.B. SmallPDF, PDF24) um Text zu extrahieren'
        ]
      };
    }

    // Get document properties
    const pageCount = pdfData?.numpages || 1;
    
    // Detect document type using smart analysis
    const documentType = detectDocumentType(filename, pdfText, pageCount);
    console.log(`📋 [${requestId}] Document type detected: ${documentType.type} (confidence: ${documentType.confidence.toFixed(2)})`);
    
    // Assess content quality using metrics
    const contentQuality = assessContentQuality(pdfText, pageCount);
    console.log(`📊 [${requestId}] Content quality: ${contentQuality.qualityScore.toFixed(2)} (${contentQuality.wordCount} words, ${contentQuality.sentenceCount} sentences)`);
    
    // Select analysis strategy based on type and quality
    const strategy = selectAnalysisStrategy(documentType, contentQuality, filename);
    console.log(`🎯 [${requestId}] Analysis strategy: ${strategy.method} - ${strategy.message}`);
    
    // Decision logic - much more permissive than before!
    if (!strategy.canProceed) {
      return {
        success: false,
        error: 'INSUFFICIENT_CONTENT',
        canRetryWithOCR: strategy.needsOCR,
        documentType: documentType.type,
        message: `📄 Dokument hat unzureichende Qualität für ${strategy.message.toLowerCase()}`,
        details: `Erkannt als: ${documentType.type}, Qualität: ${(contentQuality.qualityScore * 100).toFixed(0)}%`,
        suggestions: [
          'Versuche eine PDF mit mehr Textinhalt',
          'Prüfe ob das Dokument vollständig ist',
          strategy.needsOCR ? 'OCR-Analyse könnte bei gescannten Dokumenten helfen' : null
        ].filter(Boolean)
      };
    }

    // Success - document can be analyzed
    console.log(`✅ [${requestId}] Document validation successful - proceeding with ${strategy.method}`);
    
    return {
      success: true,
      documentType: documentType.type,
      strategy: strategy.method,
      confidence: documentType.confidence,
      qualityScore: contentQuality.qualityScore,
      analysisMessage: strategy.message,
      metrics: {
        wordCount: contentQuality.wordCount,
        pageCount: pageCount,
        hasTabularData: contentQuality.hasTabularData,
        isStructured: contentQuality.hasStructure
      }
    };

  } catch (error) {
    console.error(`❌ [${requestId}] Document validation error:`, error);
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Fehler bei der Dokumentenanalyse',
      details: error.message
    };
  }
}

// ===== EXISTING FUNCTIONS (KEPT FOR COMPATIBILITY) - UNCHANGED =====

const assessTextQuality = (text, fileName = '') => {
  if (!text) {
    return {
      level: 'none',
      score: 0,
      reason: 'No text extracted',
      characterCount: 0,
      wordCount: 0
    };
  }

  const cleanText = text.replace(/\s+/g, ' ').trim();
  const characterCount = cleanText.length;
  const wordCount = cleanText.split(' ').filter(word => word.length > 0).length;
  
  let level, score, reason;
  
  if (characterCount === 0) {
    level = 'none';
    score = 0;
    reason = 'No text data found';
  } else if (characterCount < 50) {
    level = 'none';
    score = characterCount;
    reason = `Too little text found (${characterCount} characters, ${wordCount} words)`;
  } else if (characterCount < 200) {
    level = 'poor';
    score = Math.min(characterCount / 2, 100);
    reason = `Very little text found (${characterCount} characters, ${wordCount} words)`;
  } else if (characterCount < 500) {
    level = 'fair';
    score = Math.min(50 + (characterCount - 200) / 6, 100);
    reason = `Little text found (${characterCount} characters, ${wordCount} words)`;
  } else if (characterCount < 2000) {
    level = 'good';
    score = Math.min(70 + (characterCount - 500) / 50, 100);
    reason = `Sufficient text found (${characterCount} characters, ${wordCount} words)`;
  } else {
    level = 'excellent';
    score = Math.min(90 + (characterCount - 2000) / 200, 100);
    reason = `Abundant text found (${characterCount} characters, ${wordCount} words)`;
  }

  return {
    level,
    score: Math.round(score),
    reason,
    characterCount,
    wordCount,
    fileName: fileName || 'unknown'
  };
};

const createUserFriendlyPDFError = (textQuality, fileName, pages) => {
  const isScanned = textQuality.score === 0 && pages > 0;
  const hasLittleText = textQuality.score > 0 && textQuality.score < 20;
  const isPossiblyProtected = textQuality.reason?.includes('password') || textQuality.reason?.includes('encryption');
  
  let message = "";
  let suggestions = [];
  
  if (isScanned) {
    message = `📸 This PDF appears to be scanned and contains only image data that we cannot currently analyze.`;
    suggestions = [
      "📄 Convert the PDF to a searchable format (e.g. with Adobe Acrobat)",
      "🔍 Open the document in Word, which can often recognize text from scans",
      "🖨️ Create a new PDF from the original document (if available)",
      "🔍 Use an online OCR tool (e.g. SmallPDF, PDF24) to extract text",
      "⚡ For automatic scan recognition: Upgrade to Premium with OCR support"
    ];
  } else if (hasLittleText) {
    message = `📄 This PDF contains very little readable text (${textQuality.characterCount || 0} characters). For meaningful contract analysis, we need more text content.`;
    suggestions = [
      "📖 Ensure the PDF is complete and not corrupted",
      "🔒 Check if the PDF is password protected or encrypted",
      "🔍 If it's a scanned PDF, convert it to a text PDF",
      "📄 Upload a different version of the file (e.g. the original document)",
      "⚡ Try a different PDF file"
    ];
  } else if (isPossiblyProtected) {
    message = `🔒 This PDF appears to be password protected or encrypted and cannot be read.`;
    suggestions = [
      "🔓 Remove password protection and upload the PDF again",
      "📄 Export the document as a new, unprotected PDF",
      "🔍 Convert the PDF to Word and export it again as PDF",
      "⚡ Try a different version of the file"
    ];
  } else {
    message = `🚫 This PDF file cannot be used for contract analysis.`;
    suggestions = [
      "📄 Check if the PDF file is complete and not corrupted",
      "📄 Try a different version or format (DOC, DOCX)",
      "🔍 Ensure the document contains sufficient text",
      "🔒 Check if the PDF is password protected",
      "⚡ Try a different PDF file"
    ];
  }
  
  return {
    message,
    suggestions,
    type: isScanned ? 'scanned' : hasLittleText ? 'little_text' : 'other'
  };
};

// Enhanced but kept for fallback compatibility
const extractTextFromPDFEnhanced = async (buffer, fileName, requestId, onProgress, mimetype) => {
  console.log(`📖 [${requestId}] Starting enhanced text extraction...`);
  console.log(`📄 [${requestId}] File: ${fileName} (${mimetype || 'application/pdf'})`);

  try {
    // DOCX-Dateien: Direkte Extraktion via mammoth (kein OCR/Quality-Check nötig)
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log(`📄 [${requestId}] DOCX detected, extracting text via mammoth...`);
      const docxResult = await extractTextFromBuffer(buffer, mimetype);
      console.log(`✅ [${requestId}] DOCX text extraction successful: ${docxResult.text.length} characters`);
      return {
        success: true,
        text: docxResult.text,
        quality: { level: 'good', score: 100, reason: 'DOCX text extraction' },
        pages: docxResult.pageCount || 0,
        extractionMethod: 'mammoth-docx'
      };
    }

    console.log(`📄 [${requestId}] Step 1: Normal PDF text extraction...`);

    const pdfOptions = {
      normalizeWhitespace: true,
      disableCombineTextItems: false,
      max: 0,
      version: 'v1.10.100'
    };

    const data = await pdfParse(buffer, pdfOptions);
    
    console.log(`📊 [${requestId}] PDF has ${data.numpages} pages`);
    console.log(`📊 [${requestId}] Raw text: ${data.text?.length || 0} characters`);

    const textQuality = assessTextQuality(data.text || '', fileName);
    console.log(`📊 [${requestId}] Text quality: ${textQuality.level} (Score: ${textQuality.score}) - ${textQuality.reason}`);

    if (textQuality.level === 'good' || textQuality.level === 'fair') {
      console.log(`✅ [${requestId}] PDF text extraction successful: ${data.text.length} characters`);
      return {
        success: true,
        text: data.text,
        quality: textQuality,
        pages: data.numpages,
        extractionMethod: 'pdf-parse'
      };
    } else {
      console.log(`❌ [${requestId}] Text quality insufficient for analysis`);
      
      const userFriendlyError = createUserFriendlyPDFError(textQuality, fileName, data.numpages);
      
      return {
        success: false,
        error: userFriendlyError.message,
        errorType: 'unreadable_pdf',
        quality: textQuality,
        pages: data.numpages,
        suggestions: userFriendlyError.suggestions,
        isUserError: true
      };
    }

  } catch (error) {
    console.error(`❌ [${requestId}] PDF parse error:`, error.message);
    
    const userFriendlyError = createUserFriendlyPDFError(
      { level: 'none', score: 0, reason: 'PDF processing error' }, 
      fileName, 
      0
    );
    
    return {
      success: false,
      error: userFriendlyError.message,
      errorType: 'pdf_processing_error',
      suggestions: userFriendlyError.suggestions,
      isUserError: true,
      technicalError: error.message
    };
  }
};

// ===== EXISTING HELPER FUNCTIONS (UNCHANGED) =====

function checkFileExists(filename) {
  const fullPath = path.join(UPLOAD_PATH, filename);
  const exists = fsSync.existsSync(fullPath);
  
  console.log(`🔍 [ANALYZE] File check:`, {
    filename: filename,
    fullPath: fullPath,
    exists: exists,
    uploadPath: UPLOAD_PATH,
    dirname: __dirname
  });
  
  if (!exists) {
    try {
      const files = fsSync.readdirSync(UPLOAD_PATH);
      console.log(`📂 [ANALYZE] Available files in uploads:`, files);
    } catch (err) {
      console.error(`❌ [ANALYZE] Could not read uploads directory:`, err);
    }
  }
  
  return exists;
}

let openaiInstance = null;
const getOpenAI = () => {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API Key missing in environment variables");
    }
    openaiInstance = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 90000, // ✅ FIXED: Longer timeout for complex analysis
      maxRetries: 3    // ✅ Reasonable retry count
    });
    console.log("🤖 OpenAI instance initialized for deep lawyer analysis");
  }
  return openaiInstance;
};

// MongoDB Setup (Singleton-Pool)
let analysisCollection = null;
let usersCollection = null;
let contractsCollection = null;

async function ensureDb() {
  if (analysisCollection && usersCollection && contractsCollection) return;
  const db = await database.connect();
  analysisCollection = db.collection("analyses");
  usersCollection = db.collection("users");
  contractsCollection = db.collection("contracts");
  console.log("📊 MongoDB collections initialized (analyze.js - Singleton-Pool)");
}

const getMongoCollections = async () => {
  await ensureDb();
  return { analysisCollection, usersCollection, contractsCollection };
};

// Initialize on startup
ensureDb().catch(err => console.error("❌ MongoDB error (analyze.js):", err));

const calculateFileHash = (buffer) => {
  if (!crypto) {
    console.warn("⚠️ Crypto not available - using fallback hash");
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  try {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  } catch (err) {
    console.warn("⚠️ Hash calculation failed:", err.message);
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

const checkForDuplicate = async (fileHash, userId) => {
  if (!crypto || !contractsCollection) {
    console.warn("⚠️ Duplicate check not available - skipping");
    return null;
  }
  
  try {
    const { contractsCollection } = await getMongoCollections();
    const existingContract = await contractsCollection.findOne({
      fileHash: fileHash,
      userId: new ObjectId(userId)
    });
    return existingContract;
  } catch (error) {
    console.warn("⚠️ Duplicate check failed:", error.message);
    return null;
  }
};

/**
 * 💾 ENHANCED CONTRACT SAVING (S3 COMPATIBLE) - WITH PROVIDER DETECTION & AUTO-RENEWAL
 * Saves contract with appropriate upload info based on storage type
 */
async function saveContractWithUpload(userId, analysisData, fileInfo, pdfText, storageInfo, fileHash) {
  try {
    const contract = {
      userId: new ObjectId(userId),
      name: fixUtf8Filename(analysisData.name || fileInfo.originalname) || "Unknown",
      
      // Format Laufzeit (contract duration) - NULL if not found
      laufzeit: analysisData.contractDuration ? 
        `${analysisData.contractDuration.value} ${analysisData.contractDuration.unit}` : 
        null,
      
      // Format Kündigungsfrist (cancellation period) - NULL if not found
      kuendigung: analysisData.cancellationPeriod ? 
        (analysisData.cancellationPeriod.type === 'daily' ? 'Täglich kündbar' :
         analysisData.cancellationPeriod.type === 'end_of_period' ? 'Zum Ende der Laufzeit' :
         `${analysisData.cancellationPeriod.value} ${analysisData.cancellationPeriod.unit}`) : 
        null,
      
      startDate: analysisData.startDate || null, // 🆕 START DATE
      expiryDate: analysisData.expiryDate || null,
      status: analysisData.status || "Active",
      
      // 📋 ÄNDERUNG 5: Provider Detection Fields
      provider: analysisData.provider || null,
      contractNumber: analysisData.contractNumber || null,
      customerNumber: analysisData.customerNumber || null,
      providerDetected: analysisData.providerDetected || false,
      providerConfidence: analysisData.providerConfidence || 0,
      contractDuration: analysisData.contractDuration || null, // 🆕 CONTRACT DURATION object
      cancellationPeriod: analysisData.cancellationPeriod || null,
      isAutoRenewal: analysisData.isAutoRenewal || false, // 🆕 AUTO-RENEWAL
      
      uploadedAt: new Date(),
      createdAt: new Date(),
      
      filename: fileInfo.filename || fileInfo.key,
      originalname: fileInfo.originalname,
      filePath: storageInfo.fileUrl,
      mimetype: fileInfo.mimetype,
      size: fileInfo.size,
      fileHash: fileHash, // Add file hash for duplicate detection
      
      uploadType: storageInfo.uploadType,
      
      // ✅ CRITICAL: Set s3Key at top level for frontend compatibility
      ...(storageInfo.s3Info && {
        s3Key: storageInfo.s3Info.key,
        s3Bucket: storageInfo.s3Info.bucket,
        s3Location: storageInfo.s3Info.location,
        s3ETag: storageInfo.s3Info.etag
      }),
      
      extraRefs: {
        uploadType: storageInfo.uploadType,
        ...(storageInfo.s3Info && {
          s3Bucket: storageInfo.s3Info.bucket,
          s3Key: storageInfo.s3Info.key,
          s3Location: storageInfo.s3Info.location,
          s3ETag: storageInfo.s3Info.etag
        }),
        ...(storageInfo.localInfo && {
          uploadPath: UPLOAD_PATH,
          serverPath: storageInfo.localInfo.path
        }),
        analysisId: null
      },
      
      fullText: pdfText.substring(0, 100000),
      content: pdfText.substring(0, 100000),
      analysisDate: new Date(),
      
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

    console.log(`💾 [ANALYZE] Saving contract:`, {
      userId: contract.userId,
      name: contract.name,
      filename: contract.filename,
      uploadType: contract.uploadType,
      filePath: contract.filePath,
      textLength: contract.fullText.length,
      s3Key: contract.s3Key || 'none',
      s3Info: storageInfo.s3Info ? 'present' : 'none',
      provider: contract.provider?.displayName || 'none', // 📋 Provider log
      isAutoRenewal: contract.isAutoRenewal, // 🆕 AUTO-RENEWAL log
      laufzeit: contract.laufzeit || 'none', // 🆕 DURATION log
      kuendigung: contract.kuendigung || 'none' // 🆕 CANCELLATION log
    });

    const { insertedId } = await contractsCollection.insertOne(contract);
    console.log(`✅ [ANALYZE] Contract saved with ID: ${insertedId}, provider: ${contract.provider?.displayName || 'none'}, laufzeit: ${contract.laufzeit || 'none'}, kuendigung: ${contract.kuendigung || 'none'}, autoRenewal: ${contract.isAutoRenewal}`);
    
    return { ...contract, _id: insertedId };
  } catch (error) {
    console.error("❌ [ANALYZE] Save error:", error);
    throw error;
  }
}

/**
 * 🛠️ FIXED: Enhanced Rate-Limited GPT-4 Request (Uses GPT-4-Turbo for 128k Context)
 */
const makeRateLimitedGPT4Request = async (prompt, requestId, openai, maxRetries = 3) => {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeSinceLastRequest = Date.now() - lastGPT4Request;
      if (timeSinceLastRequest < GPT4_MIN_INTERVAL) {
        const waitTime = GPT4_MIN_INTERVAL - timeSinceLastRequest;
        console.log(`⏳ [${requestId}] Rate limiting: Waiting ${waitTime}ms before GPT-4 request...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      lastGPT4Request = Date.now();
      
      console.log(`🛠️ [${requestId}] GPT-4-Turbo request (attempt ${attempt}/${maxRetries})...`);

      // ✅ V2: GPT-4o with JSON mode for structured analysis
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // 🚀 GPT-4o for 128k context + 16k output tokens
        messages: [
          {
            role: "system",
            content: "Du bist ein hochspezialisierter Vertragsanwalt mit 20+ Jahren Erfahrung. Antworte AUSSCHLIESSLICH in korrektem JSON-Format ohne Markdown-Blöcke. Alle Sätze müssen vollständig ausformuliert sein. Sei präzise, konkret und vermeide Standardphrasen."
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" }, // 🚀 V2: Force valid JSON output
        temperature: 0.1, // Low for consistency
        max_tokens: 16000, // 🚀 GPT-4o: 16k tokens für tiefe Analysen (bis 100 Seiten Verträge)
      });

      // 💰 COST TRACKING - Note: Cost tracking is done at the higher level (line 2322-2341)
      // Removed redundant tracking here since we don't have access to req.user.userId
      if (completion.usage) {
        console.log(`💰 [${requestId}] OpenAI Usage: ${completion.usage.total_tokens} tokens (prompt: ${completion.usage.prompt_tokens}, completion: ${completion.usage.completion_tokens})`);
      }

      const response = completion.choices[0].message.content;
      
      // Basic response validation
      if (!response || response.trim().length < 100) {
        console.warn(`⚠️ [${requestId}] Response too short (${response?.length || 0} chars), retrying...`);
        if (attempt < maxRetries) continue;
      }
      
      // Check for JSON structure
      const jsonStart = response.indexOf("{");
      const jsonEnd = response.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.warn(`⚠️ [${requestId}] Response missing JSON structure, retrying...`);
        if (attempt < maxRetries) continue;
      }
      
      console.log(`✅ [${requestId}] GPT-4-Turbo request successful! (${response.length} chars)`);
      return completion;
      
    } catch (error) {
      console.error(`❌ [${requestId}] GPT-4-Turbo error (attempt ${attempt}):`, error.message);
      
      if (error.status === 429) {
        if (attempt < maxRetries) {
          const waitTime = Math.min(8000 * Math.pow(2, attempt - 1), 45000);
          console.log(`⏳ [${requestId}] Rate limit reached. Waiting ${waitTime/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error(`GPT-4-Turbo rate limit reached. Please try again in a few minutes.`);
        }
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  throw new Error(`GPT-4-Turbo request failed after ${maxRetries} attempts.`);
};

// ===== MAIN ANALYZE ROUTE (S3 COMPATIBLE) - ENHANCED WITH DEEP LAWYER-LEVEL ANALYSIS =====
router.post("/", verifyToken, analyzeRateLimiter, async (req, res, next) => {
  // Get upload middleware (dynamically created)
  const uploadMiddleware = createUploadMiddleware();
  
  // Use upload middleware
  uploadMiddleware.single("file")(req, res, async (err) => {
    if (err) {
      console.error("❌ Upload middleware error:", err.message);
      return res.status(400).json({
        success: false,
        message: "File upload failed",
        error: "UPLOAD_ERROR",
        details: err.message
      });
    }
    
    // Continue with analysis logic
    await handleEnhancedDeepLawyerAnalysisRequest(req, res);
  });
});

// ===== FIXED: ENHANCED DEEP LAWYER-LEVEL ANALYSIS REQUEST HANDLER WITH AUTO-RENEWAL =====
const handleEnhancedDeepLawyerAnalysisRequest = async (req, res) => {
  const requestId = Date.now().toString();
  const startTime = Date.now();

  console.log(`⏱️ [ANALYSIS] Start | requestId=${requestId} | user=${req.user?.userId} | file="${req.file?.originalname}"`);
  console.log(`🛠️ [${requestId}] FIXED Enhanced Deep Lawyer-Level Analysis request received:`, {
    hasFile: !!req.file,
    userId: req.user?.userId,
    s3Available: S3_AVAILABLE,
    s3Configured: S3_CONFIGURED
  });

  if (!req.file) {
    console.error(`❌ [${requestId}] No file uploaded`);
    return res.status(400).json({ 
      success: false, 
      message: "No file uploaded" 
    });
  }

  // ✅ Upload to S3 if configured
  let storageInfo;
  let cleanupLocalFile = false;

  if (S3_CONFIGURED && S3_AVAILABLE && s3Instance && PutObjectCommand) {
    console.log(`📤 [${requestId}] Uploading to S3...`);
    try {
      const s3Result = await uploadToS3(req.file.path, req.file.originalname, req.user.userId);
      storageInfo = {
        uploadType: "S3_UPLOAD",
        s3Key: s3Result.s3Key,
        s3Location: s3Result.s3Location,
        s3Bucket: s3Result.s3Bucket,
        s3Info: {
          key: s3Result.s3Key,
          location: s3Result.s3Location,
          bucket: s3Result.s3Bucket
        }
      };
      cleanupLocalFile = true;
      console.log(`✅ [${requestId}] S3 upload successful`);
    } catch (s3Error) {
      console.error(`❌ [${requestId}] S3 upload failed, using local storage:`, s3Error.message);
      storageInfo = {
        uploadType: "LOCAL_UPLOAD",
        filePath: req.file.path,
        localInfo: {
          filename: req.file.filename,
          path: req.file.path
        }
      };
    }
  } else {
    console.log(`📁 [${requestId}] S3 not available, using local storage`);
    storageInfo = {
      uploadType: "LOCAL_UPLOAD",
      filePath: req.file.path,
      localInfo: {
        filename: req.file.filename,
        path: req.file.path
      }
    };
  }

  console.log(`📄 [${requestId}] File info:`, {
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    uploadType: storageInfo.uploadType,
    s3Key: storageInfo.s3Key || 'none'
  });

  // 🔧 FIX: Track if counter was incremented for rollback on error
  let analysisCountIncremented = false;
  let incrementedUserId = null;
  let usersCollectionRef = null;

  try {
    const { analysisCollection, usersCollection: users, contractsCollection } = await getMongoCollections();
    const db = await database.connect(); // 🔧 FIX: db im Scope für triggerEmail-Funktionen
    console.log(`📊 [${requestId}] MongoDB collections available`);

    const user = await users.findOne({ _id: new ObjectId(req.user.userId) });

    console.log(`🔍 [${requestId}] User fetched:`, {
      jwtUserId: req.user.userId,
      dbUserId: user?._id?.toString(),
      userExists: !!user,
      plan: user?.subscriptionPlan
    });

    if (!user) {
      console.error(`❌ [${requestId}] User not found: ${req.user.userId}`);

      // Cleanup on error
      if (req.file && req.file.path && fsSync.existsSync(req.file.path)) {
        try {
          await fs.unlink(req.file.path);
          console.log(`🗑️ [${requestId}] Cleaned up local file after error`);
        } catch (cleanupError) {
          console.error(`❌ [${requestId}] Cleanup error:`, cleanupError);
        }
      }

      return res.status(404).json({
        success: false,
        message: "❌ User not found.",
        error: "USER_NOT_FOUND"
      });
    }

    // 🔐 ATOMIC ANALYSIS COUNT INCREMENT - Race Condition Fix!
    // Statt: 1) Read count, 2) Check limit, 3) Later increment
    // Jetzt: 1) Atomic increment-and-check in ONE operation
    const plan = user.subscriptionPlan || "free";

    // ✅ KORRIGIERT: Limits aus zentraler Konfiguration (subscriptionPlans.js)
    // - Free: 3 Analysen (einmalig, KEIN monatlicher Reset)
    // - Business: 25 Analysen pro Monat (MIT monatlichem Reset)
    // - Enterprise/Legendary: Unbegrenzt
    const limit = getFeatureLimit(plan, 'analyze');

    // ✅ isPremium Flag für spätere Verwendung (Business oder höher)
    const isPremium = isBusinessOrHigher(plan);

    console.log(`📊 [${requestId}] User Plan: ${plan}, Current count: ${user.analysisCount ?? 0}, Limit: ${limit}`);

    // ✅ ATOMIC UPDATE: Build query based on plan
    // For premium/legendary/enterprise: No limit check needed
    // For others: Check if count is under limit
    const updateQuery = {
      _id: user._id  // Use the actual ObjectId from the fetched user
    };

    if (!isEnterpriseOrHigher(plan)) {
      // Only add limit check for non-unlimited users (free + business)
      // 🔧 FIX: $or für fehlende analysisCount Felder — MongoDB $lt matcht NICHT auf null/undefined
      updateQuery.$or = [
        { analysisCount: { $lt: limit } },
        { analysisCount: { $exists: false } },
        { analysisCount: null }
      ];
    }

    console.log(`🔍 [${requestId}] Update Query:`, {
      _id: updateQuery._id.toString(),
      hasLimitCheck: !!updateQuery.analysisCount,
      limit: updateQuery.analysisCount?.$lt
    });
    console.log(`🔍 [${requestId}] Is Premium: ${isPremium}, Is Enterprise: ${isEnterpriseOrHigher(plan)}, Has Limit Check: ${!!updateQuery.analysisCount}`);

    const updateResult = await users.findOneAndUpdate(
      updateQuery,
      {
        $inc: { analysisCount: 1 } // Erhöhe Counter atomar
      },
      {
        returnDocument: 'after' // Gibt aktualisiertes Dokument zurück
      }
    );

    console.log(`🔍 [${requestId}] RAW Update Result:`, JSON.stringify(updateResult, null, 2));
    console.log(`🔍 [${requestId}] Update Result Keys:`, Object.keys(updateResult || {}));
    console.log(`🔍 [${requestId}] Update Result.value:`, updateResult?.value);
    console.log(`🔍 [${requestId}] Update Result parsed:`, {
      success: !!updateResult?.value,
      hasValue: 'value' in (updateResult || {}),
      newCount: updateResult?.value?.analysisCount,
      plan: updateResult?.value?.subscriptionPlan
    });

    // Prüfen ob Update erfolgreich war
    // NOTE: MongoDB native driver returns document directly, NOT in .value property!
    if (!updateResult) {
      // Update fehlgeschlagen = Limit erreicht
      console.warn(`⚠️ [${requestId}] Analysis limit reached for user ${req.user.userId} (Plan: ${plan})`);

      // Cleanup on limit reached
      if (req.file && req.file.path && fsSync.existsSync(req.file.path)) {
        try {
          await fs.unlink(req.file.path);
          console.log(`🗑️ [${requestId}] Cleaned up local file after limit reached`);
        } catch (cleanupError) {
          console.error(`❌ [${requestId}] Cleanup error:`, cleanupError);
        }
      }

      // 📧 Send "Limit Reached" trigger email (async, don't block response)
      if (plan === 'free') {
        sendLimitReachedEmail(db, user, {
          usedAnalyses: user.analysisCount ?? 3,
          maxAnalyses: limit
        }).catch(err => console.error(`📧 Error sending limit email:`, err.message));
      }

      return res.status(403).json({
        success: false,
        message: "❌ Monatliches Analyse-Limit erreicht. Bitte upgraden Sie Ihr Paket.",
        error: "LIMIT_EXCEEDED",
        currentCount: user.analysisCount ?? 0,
        limit: limit,
        plan: plan,
        upgradeUrl: "/pricing",
        upgradeInfo: {
          business: "25 Analysen/Monat",
          enterprise: "Unbegrenzte Analysen"
        }
      });
    }

    // ✅ Counter wurde erfolgreich erhöht - fortfahren mit Analyse
    const newCount = updateResult.analysisCount;  // Document returned directly!
    console.log(`✅ [${requestId}] analysisCount atomar erhöht auf ${newCount}/${limit}`);

    // 🔧 FIX: Track successful increment for rollback on error
    analysisCountIncremented = true;
    incrementedUserId = user._id;
    usersCollectionRef = users;

    // User-Referenz aktualisieren für spätere Verwendung
    user.analysisCount = newCount;

    // 📧 Send "Almost at Limit" email when user has 1 analysis left (async)
    if (plan === 'free' && newCount === limit - 1) {
      sendAlmostAtLimitEmail(db, user, {
        usedAnalyses: newCount,
        maxAnalyses: limit
      }).catch(err => console.error(`📧 Error sending almost-at-limit email:`, err.message));
    }

    console.log(`📄 [${requestId}] Reading uploaded file from local disk...`);

    // Read from local file (always stored locally first)
    const buffer = await fs.readFile(req.file.path);
    console.log(`📄 [${requestId}] Buffer read: ${buffer.length} bytes`);
    
    const fileHash = calculateFileHash(buffer);
    console.log(`🔍 [${requestId}] File hash calculated: ${fileHash.substring(0, 12)}...`);

    let existingContract = null;
    if (crypto && contractsCollection) {
      try {
        existingContract = await checkForDuplicate(fileHash, req.user.userId);
        
        if (existingContract) {
          console.log(`📄 [${requestId}] Duplicate found: ${existingContract._id}`);
          
          const forceReanalyze = req.body.forceReanalyze === 'true';
          
          if (!forceReanalyze) {
            return res.status(409).json({
              success: false,
              duplicate: true,
              message: "📄 This contract has already been uploaded.",
              error: "DUPLICATE_CONTRACT",
              contractId: existingContract._id,
              contractName: existingContract.name,
              uploadedAt: existingContract.createdAt,
              existingContract: existingContract,
              requestId,
              actions: {
                reanalyze: `Re-analyze and overwrite existing analysis`,
                viewExisting: `Open existing contract`
              }
            });
          } else {
            console.log(`📄 [${requestId}] User chooses deep re-analysis for duplicate`);
          }
        }
      } catch (dupError) {
        console.warn(`⚠️ [${requestId}] Duplicate check failed:`, dupError.message);
      }
    } else {
      console.log(`⚠️ [${requestId}] Duplicate check skipped (not available)`);
    }

    // Parse document content first (PDF or DOCX)
    const fileMimetype = req.file.mimetype;
    console.log(`📖 [${requestId}] Parsing document content (${fileMimetype})...`);
    let pdfData;
    try {
      const extracted = await extractTextFromBuffer(buffer, fileMimetype);
      pdfData = { text: extracted.text, numpages: extracted.pageCount || 0 };
      console.log(`📄 [${requestId}] Document parsed: ${pdfData.numpages} pages, ${pdfData.text.length} characters`);

      // OCR-Fallback für gescannte PDFs mit wenig/keinem Text
      const isPdf = fileMimetype === 'application/pdf';
      const textTooShort = !pdfData.text || pdfData.text.trim().length < 200;
      let ocrAttempted = false;
      if (isPdf && textTooShort) {
        ocrAttempted = true;
        console.log(`🔍 [${requestId}] Wenig Text (${pdfData.text?.trim().length || 0} Zeichen) — versuche OCR-Fallback...`);
        try {
          const ocrResult = await pdfExtractor.extractTextWithOCRFallback(buffer, {
            mimetype: fileMimetype,
            enableOCR: true,
            ocrThreshold: 50,
            userId: req.user?.userId
          });
          if (ocrResult.success && ocrResult.text.trim().length > (pdfData.text?.trim().length || 0)) {
            console.log(`✅ [${requestId}] OCR-Fallback erfolgreich: ${ocrResult.text.length} Zeichen (vorher: ${pdfData.text?.length || 0}), OCR=${ocrResult.usedOCR}`);
            pdfData.text = ocrResult.text;
            pdfData.numpages = ocrResult.quality.pageCount || pdfData.numpages;
          } else if (!pdfData.text || pdfData.text.trim().length === 0) {
            // OCR tried but still no text — return clear error to user
            console.warn(`⚠️ [${requestId}] OCR-Fallback lieferte keinen Text — Scan unleserlich`);
            return res.status(400).json({
              success: false,
              message: "📸 Das gescannte Dokument konnte nicht gelesen werden. Die Texterkennung (OCR) hat keinen lesbaren Text gefunden.",
              error: "OCR_NO_TEXT",
              details: "Der Scan ist möglicherweise zu unscharf, zu dunkel oder das Dokument war nicht gut sichtbar.",
              suggestions: [
                "Dokument erneut scannen — auf gute Beleuchtung und Schärfe achten",
                "Dokument flach auf einen hellen Hintergrund legen",
                "Falls möglich, das Originaldokument als digitale PDF hochladen"
              ],
              requestId
            });
          }
        } catch (ocrErr) {
          console.warn(`⚠️ [${requestId}] OCR-Fallback fehlgeschlagen: ${ocrErr.message} — fahre mit Original-Text fort`);
        }
      }
    } catch (error) {
      console.error(`❌ [${requestId}] Document parsing error:`, error);

      // Last-Resort: Bei harten pdf-parse-Crashes (z.B. "bad XRef entry",
      // korrupte Streams, defekte Trailer) Textract direkt mit den rohen
      // Bytes versuchen. Textract ruft pdf-parse nicht auf und kann viele
      // strukturell beschädigte oder gescannte PDFs trotzdem rastern.
      const isPdf = fileMimetype === 'application/pdf';
      if (isPdf) {
        console.log(`🆘 [${requestId}] pdf-parse Crash — versuche OCR-Last-Resort über Textract...`);
        try {
          const ocrResult = await pdfExtractor.extractTextWithOCRFallback(buffer, {
            mimetype: fileMimetype,
            enableOCR: true,
            ocrThreshold: 50,
            userId: req.user?.userId
          });
          if (ocrResult.success && ocrResult.text && ocrResult.text.trim().length >= 50) {
            console.log(`✅ [${requestId}] OCR-Last-Resort erfolgreich: ${ocrResult.text.length} Zeichen, OCR=${ocrResult.usedOCR}`);
            pdfData = {
              text: ocrResult.text,
              numpages: ocrResult.quality?.pageCount || ocrResult.ocrPages || 0
            };
            // weiter im normalen Flow — pdfData ist gesetzt
          } else {
            // OCR konnte ebenfalls nichts retten — differenzierte Fehlermeldung
            const ocrLimitWarning = ocrResult.warnings?.find(w => w.type === 'ocr_limit_reached');
            if (ocrLimitWarning) {
              return res.status(400).json({
                success: false,
                message: "📸 OCR-Kontingent erreicht",
                error: "OCR_LIMIT_REACHED",
                details: ocrLimitWarning.message,
                suggestions: [
                  "Speichern Sie die PDF erneut über Ihren PDF-Viewer (z.B. Adobe Reader → Speichern unter, oder Browser → Drucken → Als PDF speichern)",
                  "Upgraden Sie Ihren Plan für mehr OCR-Seiten"
                ],
                requestId
              });
            }
            return res.status(400).json({
              success: false,
              message: "📄 PDF-Datei beschädigt",
              error: "PDF_CORRUPTED",
              details: "Die PDF-Struktur ist defekt (z.B. beschädigte XRef-Tabelle). Auch automatische Texterkennung (OCR) konnte das Dokument nicht lesen.",
              suggestions: [
                "Öffnen Sie die PDF in einem Viewer (Adobe Reader, Browser, Vorschau) und speichern Sie sie erneut ab — das repariert oft beschädigte PDFs",
                "Alternativ: über Browser → Drucken → 'Als PDF speichern' eine saubere Version erzeugen",
                "Falls Sie das Originaldokument haben, laden Sie es bitte direkt hoch"
              ],
              requestId
            });
          }
        } catch (ocrErr) {
          console.error(`❌ [${requestId}] OCR-Last-Resort fehlgeschlagen: ${ocrErr.message}`);
          return res.status(400).json({
            success: false,
            message: "📄 Datei konnte nicht verarbeitet werden",
            error: "PARSE_ERROR",
            details: "Die PDF konnte weder regulär noch per OCR gelesen werden. Sie ist möglicherweise beschädigt oder kein gültiges PDF.",
            suggestions: [
              "PDF in einem Viewer öffnen und neu abspeichern",
              "Falls möglich, das Originaldokument verwenden"
            ],
            requestId
          });
        }
      } else {
        // Non-PDF (z.B. DOCX): kein OCR-Fallback sinnvoll, klare Meldung
        return res.status(400).json({
          success: false,
          message: "📄 Datei konnte nicht verarbeitet werden",
          error: "PARSE_ERROR",
          details: "Die Datei scheint beschädigt oder kein gültiges PDF/DOCX zu sein",
          requestId
        });
      }
    }

    // 🚨 STRIKTE SEITEN- & TOKEN-LIMIT PRÜFUNG - Plan-basiert
    const { maxPages, maxTokens: maxInputTokens } = getAnalysisLimits(plan);
    const isEnterprise = isEnterpriseOrHigher(plan);

    if (pdfData.numpages > maxPages) {
      console.warn(`⚠️ [${requestId}] PDF zu groß: ${pdfData.numpages} Seiten (Limit: ${maxPages}, Plan: ${plan})`);
      const nextTier = !isPremium ? 'Business' : !isEnterprise ? 'Enterprise' : null;
      const nextLimit = !isPremium ? ANALYSIS_LIMITS.BUSINESS_MAX_PDF_PAGES : !isEnterprise ? ANALYSIS_LIMITS.ENTERPRISE_MAX_PDF_PAGES : null;
      return res.status(400).json({
        success: false,
        message: nextTier
          ? `📊 Dokument zu groß für dein ${plan === 'free' ? 'Free' : 'Business'}-Abo (${pdfData.numpages} Seiten, max. ${maxPages}). Upgrade auf ${nextTier} für bis zu ${nextLimit} Seiten!`
          : `📊 Dokument zu groß (${pdfData.numpages} Seiten). Maximal ${maxPages} Seiten erlaubt. Bitte teile das Dokument auf.`,
        error: "DOCUMENT_TOO_LARGE",
        details: {
          yourPages: pdfData.numpages,
          maxPages,
          subscriptionPlan: plan
        },
        suggestions: nextTier
          ? [`Upgrade auf ${nextTier} für Dokumente bis zu ${nextLimit} Seiten`, "Teile das Dokument in kleinere Abschnitte auf"]
          : ["Teile das Dokument in kleinere Abschnitte auf"],
        upgradeUrl: nextTier ? "/pricing" : null
      });
    }

    // 🚨 TOKEN-LIMIT PRÜFUNG - Geschätzte Tokens vor OpenAI Call
    const estimatedInputTokens = estimateTokenCount(pdfData.text);

    console.log(`📊 [${requestId}] Token-Schätzung: ${estimatedInputTokens} tokens (Limit: ${maxInputTokens}, Plan: ${plan})`);

    if (estimatedInputTokens > maxInputTokens) {
      console.warn(`⚠️ [${requestId}] Zu viele Tokens: ${estimatedInputTokens} (Limit: ${maxInputTokens}, Plan: ${plan})`);
      const nextTier = !isPremium ? 'Business' : !isEnterprise ? 'Enterprise' : null;
      const nextLimit = !isPremium ? ANALYSIS_LIMITS.BUSINESS_MAX_INPUT_TOKENS : !isEnterprise ? ANALYSIS_LIMITS.ENTERPRISE_MAX_INPUT_TOKENS : null;
      return res.status(400).json({
        success: false,
        message: nextTier
          ? `📊 Dieses Dokument ist zu groß für dein ${plan === 'free' ? 'Free' : 'Business'}-Abo. Upgrade auf ${nextTier} für größere Verträge!`
          : `📊 Dokument zu groß für die Analyse. Bitte kürze das Dokument oder teile es auf.`,
        error: "TOKEN_LIMIT_EXCEEDED",
        details: {
          estimatedTokens: estimatedInputTokens,
          maxTokens: maxInputTokens,
          nextTierTokens: nextLimit,
          subscriptionPlan: plan,
          pages: pdfData.numpages
        },
        suggestions: nextTier
          ? [`Upgrade auf ${nextTier} für Dokumente bis zu ~${Math.round(nextLimit * 4 / 1000)}k Zeichen`, "Teile das Dokument auf"]
          : ["Entferne unnötige Abschnitte", "Teile das Dokument auf"],
        upgradeUrl: nextTier ? "/pricing" : null
      });
    }

    console.log(`✅ [${requestId}] Dokument-Checks bestanden: ${pdfData.numpages} Seiten, ~${estimatedInputTokens} tokens`);

    // Smart document validation and analysis strategy
    const validationResult = await validateAndAnalyzeDocument(
      req.file.originalname, 
      pdfData.text, 
      pdfData,
      requestId
    );

    if (!validationResult.success) {
      console.log(`⚠️ [${requestId}] Document validation failed: ${validationResult.error}`);
      
      return res.status(400).json({
        success: false,
        message: validationResult.message,
        error: validationResult.error,
        details: validationResult.details,
        documentType: validationResult.documentType,
        canRetryWithOCR: validationResult.canRetryWithOCR || false,
        suggestions: validationResult.suggestions || [],
        requestId
      });
    }

    const fullTextContent = pdfData.text;
    
    // 📋 ÄNDERUNG 2: PROVIDER DETECTION - Extract provider and contract details WITH AUTO-RENEWAL & DURATION
    console.log(`📋 [${requestId}] Extracting provider and contract details...`);
    let extractedProvider = null;
    let extractedContractNumber = null;
    let extractedCustomerNumber = null;
    let extractedEndDate = null;
    let extractedCancellationPeriod = null;
    let extractedIsAutoRenewal = null; // 🆕 AUTO-RENEWAL
    let extractedContractDuration = null; // 🆕 CONTRACT DURATION (Laufzeit)
    let extractedStartDate = null; // 🆕 START DATE
    let extractedContractType = null; // 🆕 CONTRACT TYPE (telecom, purchase, rental, etc.)
    let extractedDocumentCategory = null; // 🆕 DOCUMENT CATEGORY (cancellation_confirmation, invoice, active_contract)
    let extractedGekuendigtZum = null; // 🆕 Kündigungsdatum für Kündigungsbestätigungen
    let extractedMinimumTerm = null; // 🆕 Mindestlaufzeit (z.B. 6 Monate)
    let extractedCanCancelAfterDate = null; // 🆕 Datum ab wann kündbar

    // 🔒 KONFIDENZ-WERTE für Datenintegrität
    let startDateConfidence = 0;
    let endDateConfidence = 0;
    let autoRenewalConfidence = 0;

    try {
      const providerAnalysis = await contractAnalyzer.analyzeContract(
        fullTextContent,
        req.file.originalname
      );

      if (providerAnalysis.success && providerAnalysis.data) {
        extractedProvider = providerAnalysis.data.provider;
        extractedContractNumber = providerAnalysis.data.contractNumber;
        extractedCustomerNumber = providerAnalysis.data.customerNumber;
        extractedContractType = providerAnalysis.data.contractType; // 🆕 CONTRACT TYPE
        extractedStartDate = providerAnalysis.data.startDate; // 🆕 START DATE
        extractedEndDate = providerAnalysis.data.endDate;
        extractedContractDuration = providerAnalysis.data.contractDuration; // 🆕 CONTRACT DURATION
        extractedCancellationPeriod = providerAnalysis.data.cancellationPeriod;
        extractedIsAutoRenewal = providerAnalysis.data.isAutoRenewal || false; // 🆕 AUTO-RENEWAL
        extractedDocumentCategory = providerAnalysis.data.documentCategory; // 🆕 DOCUMENT CATEGORY
        extractedMinimumTerm = providerAnalysis.data.minimumTerm; // 🆕 MINDESTLAUFZEIT
        extractedCanCancelAfterDate = providerAnalysis.data.canCancelAfterDate; // 🆕 KÜNDBAR AB

        // 🔒 KONFIDENZ-WERTE extrahieren für Datenintegrität
        startDateConfidence = providerAnalysis.data.startDateConfidence || 0;
        endDateConfidence = providerAnalysis.data.endDateConfidence || 0;
        autoRenewalConfidence = providerAnalysis.data.autoRenewalConfidence || 0;

        // 🆕 Für Kündigungsbestätigungen: gekuendigtZum = endDate (das ist das Datum wann Vertrag endet)
        if (extractedDocumentCategory === 'cancellation_confirmation' && extractedEndDate) {
          extractedGekuendigtZum = extractedEndDate;
          console.log(`📄 [${requestId}] Kündigungsbestätigung erkannt - gekuendigtZum: ${extractedGekuendigtZum}`);
        }

        // 🆕 Log Mindestlaufzeit wenn gefunden
        if (extractedMinimumTerm) {
          console.log(`📅 [${requestId}] Mindestlaufzeit erkannt: ${extractedMinimumTerm.months} Monate - Kündbar ab: ${extractedCanCancelAfterDate || 'wird berechnet'}`);
        }

        // Debug-Log hinzufügen
        console.log(`📅 [${requestId}] Date extraction:`, {
          startDate: extractedStartDate,
          endDate: extractedEndDate,
          contractDuration: extractedContractDuration,
          cancellationPeriod: extractedCancellationPeriod,
          isAutoRenewal: extractedIsAutoRenewal,
          documentCategory: extractedDocumentCategory,
          gekuendigtZum: extractedGekuendigtZum,
          minimumTerm: extractedMinimumTerm,
          canCancelAfterDate: extractedCanCancelAfterDate,
          originalData: providerAnalysis.data
        });

        console.log(`✅ [${requestId}] Provider detected:`, extractedProvider?.displayName || 'None');
        console.log(`📋 [${requestId}] Contract type detected:`, extractedContractType || 'None');
        console.log(`📋 [${requestId}] Document category:`, extractedDocumentCategory || 'None');
        console.log(`📋 [${requestId}] Contract details:`, {
          contractNumber: extractedContractNumber,
          customerNumber: extractedCustomerNumber,
          contractType: extractedContractType,
          documentCategory: extractedDocumentCategory,
          startDate: extractedStartDate,
          endDate: extractedEndDate,
          gekuendigtZum: extractedGekuendigtZum,
          contractDuration: extractedContractDuration,
          cancellationPeriod: extractedCancellationPeriod,
          isAutoRenewal: extractedIsAutoRenewal,
          minimumTerm: extractedMinimumTerm,
          canCancelAfterDate: extractedCanCancelAfterDate
        });
      } else {
        console.log(`⚠️ [${requestId}] No provider or contract details extracted`);
      }
    } catch (error) {
      console.warn(`⚠️ [${requestId}] Provider detection failed:`, error.message);
    }
    
    console.log(`🛠️ [${requestId}] Document analysis successful - proceeding with FIXED DEEP LAWYER-LEVEL analysis:`, {
      documentType: validationResult.documentType,
      strategy: validationResult.strategy,
      confidence: Math.round(validationResult.confidence * 100),
      qualityScore: Math.round(validationResult.qualityScore * 100),
      textLength: fullTextContent.length,
      pages: validationResult.metrics.pageCount,
      uploadType: storageInfo.uploadType,
      s3Key: storageInfo.s3Info?.key || 'none'
    });

    // ✅ FIXED: Generate robust lawyer-level analysis prompt.
    // 🌐 Phase-2-Fix (28.04.2026): documentType wird jetzt aus extractedContractType
    // (rental/employment/nda/...) statt aus validationResult.documentType (UNKNOWN/CONTRACT/
    // INVOICE) gespeist. Sonst landet jeder Vertrag bei der "other"-Awareness und die
    // Pilot-Tiefenanalyse triggert nicht. Fallback bleibt unverändert: wenn die
    // contractType-Detection nichts liefert, nutzen wir die Dokumentenklasse wie zuvor —
    // das landet beim "other"-Awareness, identisch zum alten Verhalten.
    const promptContractType = extractedContractType || validationResult.documentType;
    // 📏 Plan-basiertes Token-Limit übergeben statt hardcoded 3000 — sonst sieht
    // die Hauptanalyse bei langen Verträgen nur einen Bruchteil des Inhalts.
    // maxInputTokens stammt aus getAnalysisLimits(plan) — Free 20k / Business 40k / Enterprise 60k.
    const analysisPrompt = generateDeepLawyerLevelPrompt(
      fullTextContent,
      promptContractType,
      validationResult.strategy,
      requestId,
      maxInputTokens
    );

    console.log(`🛠️ [${requestId}] Using FIXED DEEP LAWYER-LEVEL analysis strategy: ${validationResult.strategy} for ${validationResult.documentType} document (contractType passed to prompt: ${promptContractType})`);

    // 🚀 Parallel-Aufruf: Hauptanalyse + Date Hunt Stage gleichzeitig.
    // Date Hunt liefert evidence-validierte importantDates — die Liste der
    // Hauptanalyse wird später überschrieben (Single Source of Truth für Termine).
    // Bei Fehler/Timeout der Date Hunt Stage: leeres Array, Hauptanalyse läuft normal.
    let completion;
    let dateHuntResult = { importantDates: [], stats: { fallback: true } };
    try {
      const [completionResult, dateHuntPromiseResult] = await Promise.all([
        Promise.race([
          makeRateLimitedGPT4Request(analysisPrompt, requestId, getOpenAI(), 3),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("OpenAI API timeout after 90s")), 90000)
          )
        ]),
        dateHuntService.huntDates(fullTextContent, getOpenAI(), requestId)
          .catch(err => {
            console.warn(`⚠️ [${requestId}] [DateHunt] unerwarteter Fehler: ${err.message} — Fallback auf leere Datums-Liste`);
            return { importantDates: [], stats: { fallback: true, error: err.message } };
          })
      ]);
      completion = completionResult;
      dateHuntResult = dateHuntPromiseResult;
    } catch (openaiError) {
      console.error(`❌ [${requestId}] OpenAI error:`, openaiError.message);
      throw new Error(`OpenAI API error: ${openaiError.message}`);
    }

    console.log(`✅ [${requestId}] OpenAI deep lawyer-level response received`);

    // 💰 Track API cost
    if (completion.usage) {
      try {
        const costTracker = getCostTrackingService();
        await costTracker.trackAPICall({
          userId: req.user.userId,
          model: 'gpt-4o',
          inputTokens: completion.usage.prompt_tokens,
          outputTokens: completion.usage.completion_tokens,
          feature: 'analyze',
          requestId,
          metadata: {
            documentType: validationResult.documentType,
            strategy: validationResult.strategy,
            fileName: fixUtf8Filename(req.file.originalname)
          }
        });
      } catch (costError) {
        console.error(`⚠️ [${requestId}] Cost tracking failed (non-critical):`, costError.message);
      }
    }

    const aiMessage = completion.choices[0].message.content || "";
    const jsonStart = aiMessage.indexOf("{");
    const jsonEnd = aiMessage.lastIndexOf("}") + 1;
    
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      console.error(`❌ [${requestId}] No valid JSON response:`, aiMessage.substring(0, 200));
      throw new Error("No valid JSON response received from OpenAI");
    }

    const jsonString = aiMessage.slice(jsonStart, jsonEnd);
    let result;
    
    try {
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error(`❌ [${requestId}] JSON parse error:`, parseError.message);
      console.error(`❌ [${requestId}] Raw JSON string:`, jsonString.substring(0, 500));
      throw new Error("Error parsing AI response");
    }

    // ✅ FIXED: Simplified validation
    try {
      result = validateAndNormalizeLawyerAnalysis(result, validationResult.documentType, requestId);
    } catch (validationError) {
      console.error(`❌ [${requestId}] Deep lawyer analysis validation failed:`, validationError.message);

      // ✅ FIXED: Fallback to legacy format instead of throwing
      console.warn(`⚠️ [${requestId}] Using fallback analysis format`);
      result = convertLegacyToDeepLawyerFormat(result, validationResult.documentType, requestId);
    }

    // 📅 Stufe-2-Merge: Date Hunt Stage liefert evidence-validierte Datums + Frist-Hinweise.
    // Sie ist Single Source of Truth für importantDates (überschreibt die
    // unvalidierten Datums aus der Hauptanalyse) UND für fristHinweise (universelle
    // Frist-Regelungen: Kündigung, Widerruf, Gewährleistung, Probezeit, ...).
    // Strikt: bei Fallback / 0 Treffern → leere Arrays, kein erfundener Eintrag durchgelassen.
    if (!dateHuntResult.stats?.fallback) {
      const previousCount = Array.isArray(result.importantDates) ? result.importantDates.length : 0;
      result.importantDates = dateHuntResult.importantDates;
      result.fristHinweise = Array.isArray(dateHuntResult.fristHinweise) ? dateHuntResult.fristHinweise : [];
      console.log(
        `📅 [${requestId}] Date Hunt Merge: importantDates Hauptanalyse ${previousCount} → Date Hunt ${dateHuntResult.importantDates.length} | ` +
        `fristHinweise: ${result.fristHinweise.length}`
      );
    } else {
      // Im Fallback-Fall keine fristHinweise setzen (bleiben undefined statt leeres Array,
      // damit Frontend per render-if-present sauber unterscheidet).
      result.fristHinweise = undefined;
      console.log(`📅 [${requestId}] Date Hunt im Fallback — Hauptanalyse-importantDates bleiben, fristHinweise leer`);
    }

    console.log(`🛠️ [${requestId}] FIXED Deep lawyer-level analysis successful, saving to DB...`);

    // 📋 ÄNDERUNG 3: UPDATE analysisData OBJECT WITH AUTO-RENEWAL & DURATION
    const analysisData = {
      userId: req.user.userId,
      contractName: fixUtf8Filename(req.file.originalname),
      createdAt: new Date(),
      requestId,
      fullText: fullTextContent,
      extractedText: fullTextContent,
      originalFileName: fixUtf8Filename(req.file.originalname),
      fileSize: buffer.length,
      uploadType: storageInfo.uploadType,
      
      // 📋 NEUE FELDER HINZUFÜGEN:
      provider: extractedProvider,
      contractNumber: extractedContractNumber,
      customerNumber: extractedCustomerNumber,
      startDate: extractedStartDate, // 🆕 START DATE
      expiryDate: extractedEndDate,
      contractDuration: extractedContractDuration, // 🆕 CONTRACT DURATION
      cancellationPeriod: extractedCancellationPeriod,
      providerDetected: !!extractedProvider,
      providerConfidence: extractedProvider?.confidence || 0,
      // 🔒 KONFIDENZ-WERTE für Datenintegrität
      startDateConfidence: startDateConfidence,
      endDateConfidence: endDateConfidence,
      autoRenewalConfidence: autoRenewalConfidence,
      cancellationPeriodConfidence: extractedCancellationPeriod?.confidence || 0,
      contractDurationConfidence: extractedContractDuration?.confidence || 0,
      isAutoRenewal: extractedIsAutoRenewal || false, // 🆕 AUTO-RENEWAL

      // Enhanced metadata from deep lawyer-level analysis
      documentType: validationResult.documentType,
      analysisStrategy: validationResult.strategy,
      confidence: validationResult.confidence,
      qualityScore: validationResult.qualityScore,
      analysisMessage: validationResult.analysisMessage,
      extractionMethod: 'deep-lawyer-level-analysis-FIXED-v5', // ✅ FIXED: Updated method name
      extractionQuality: validationResult.qualityScore > 0.6 ? 'excellent' : validationResult.qualityScore > 0.4 ? 'good' : 'fair',
      pageCount: validationResult.metrics.pageCount,
      
      // ✅ Deep lawyer-level analysis metadata
      deepLawyerLevelAnalysis: true,
      analysisDepth: 'deep-lawyer-level',
      structuredAnalysis: true,
      completenessScore: 100,
      modelUsed: 'gpt-4-turbo', // ✅ NEW: Track which model was used
      tokenOptimized: true,
      substantialContent: true,
      
      ...(storageInfo.s3Info && {
        s3Info: storageInfo.s3Info
      }),
      ...result,
    };

    let inserted;
    try {
      inserted = await analysisCollection.insertOne(analysisData);
      console.log(`✅ [${requestId}] FIXED Enhanced deep lawyer-level analysis saved: ${inserted.insertedId} (${validationResult.documentType}: ${validationResult.analysisMessage})`);
    } catch (dbError) {
      console.error(`❌ [${requestId}] DB insert error:`, dbError.message);
      throw new Error(`Database error while saving: ${dbError.message}`);
    }

    try {
      console.log(`💾 [${requestId}] Saving contract with FIXED deep lawyer-level analysis (${storageInfo.uploadType})...`);

      if (existingContract && req.body.forceReanalyze === 'true') {
        console.log(`📄 [${requestId}] Updating existing contract with FIXED deep lawyer-level analysis: ${existingContract._id}`);
        
        const updateData = {
          lastAnalyzed: new Date(),
          analysisId: inserted.insertedId,
          fullText: fullTextContent,
          content: fullTextContent,
          filePath: storageInfo.fileUrl,
          filename: req.file.filename || req.file.key,
          uploadType: storageInfo.uploadType,

          // 📋 Provider Detection Fields WITH AUTO-RENEWAL & DURATION
          provider: extractedProvider,
          contractNumber: extractedContractNumber,
          customerNumber: extractedCustomerNumber,
          providerDetected: !!extractedProvider,
          providerConfidence: extractedProvider?.confidence || 0,

          // 🔒 KONFIDENZ-WERTE für Datenintegrität (Frontend prüft diese!)
          startDateConfidence: startDateConfidence,
          endDateConfidence: endDateConfidence,
          autoRenewalConfidence: autoRenewalConfidence,
          cancellationPeriodConfidence: extractedCancellationPeriod?.confidence || 0,
          contractDurationConfidence: extractedContractDuration?.confidence || 0,

          // Format strings for display
          laufzeit: extractedContractDuration ?
            `${extractedContractDuration.value} ${extractedContractDuration.unit}` :
            null,
          kuendigung: extractedCancellationPeriod ?
            (extractedCancellationPeriod.type === 'daily' ? 'Täglich kündbar' :
             extractedCancellationPeriod.type === 'end_of_period' ? 'Zum Ende der Laufzeit' :
             `${extractedCancellationPeriod.value} ${extractedCancellationPeriod.unit}`) :
            null,

          // Store objects for precise data
          contractDuration: extractedContractDuration, // 🆕 CONTRACT DURATION object
          cancellationPeriod: extractedCancellationPeriod,
          startDate: extractedStartDate || null, // 🆕 START DATE
          expiryDate: extractedEndDate || null,
          isAutoRenewal: extractedIsAutoRenewal || false, // 🆕 AUTO-RENEWAL

          // Enhanced metadata
          documentType: validationResult.documentType,
          analysisStrategy: validationResult.strategy,
          confidence: validationResult.confidence,
          qualityScore: validationResult.qualityScore,
          extractionMethod: 'deep-lawyer-level-analysis-FIXED-v5',
          extractionQuality: analysisData.extractionQuality,
          analyzeCount: (existingContract.analyzeCount || 0) + 1,

          // ✅ Deep lawyer-level flags
          deepLawyerLevelAnalysis: true,
          analysisDepth: 'deep-lawyer-level',
          structuredAnalysis: true,
          modelUsed: 'gpt-4-turbo',
          tokenOptimized: true,
          substantialContent: true,

          // ✅ ANALYSE-FELDER direkt im Contract speichern für Contract Detail View
          analyzed: true, // 🔧 FIX: Flag setzen damit Status "Aktiv" statt "Neu" angezeigt wird
          analyzedAt: new Date(), // Zeitpunkt der Analyse
          contractScore: result.contractScore || 0,
          // 🌐 Phase-1-Redesign: Recognition-Felder + Adaptive-Output.
          // Bei adaptiven Feldern verwenden wir undefined statt [] / '' damit das
          // Frontend per render-if-present sauber unterscheiden kann zwischen
          // "AI hat bewusst weggelassen" und "leerer Default".
          documentCharacterization: result.documentCharacterization,  // PFLICHT-Recognition-Feld
          completeness: result.completeness,                          // PFLICHT-Recognition-Feld
          asymmetryAssessment: result.asymmetryAssessment,            // PFLICHT-Recognition-Feld
          scoreReasoning: result.scoreReasoning,                      // PFLICHT — gehört zu contractScore
          typeSpecificFindings: result.typeSpecificFindings,          // Phase 2: optional, nur bei Pilot-Typen
          fristHinweise: result.fristHinweise,                        // Stufe 2b: Universelle Frist-Hinweise aus Date Hunt
          laymanSummary: result.laymanSummary,                        // adaptiv
          summary: result.summary,                                    // adaptiv
          legalAssessment: result.legalAssessment,                    // adaptiv
          suggestions: result.suggestions,                            // adaptiv
          comparison: result.comparison,                              // adaptiv
          positiveAspects: result.positiveAspects,                    // adaptiv
          criticalIssues: result.criticalIssues,                      // adaptiv
          risiken: result.criticalIssues,                             // Alias für FE-Kompat
          recommendations: result.recommendations,                    // adaptiv
          quickFacts: result.quickFacts,                              // adaptiv
          legalPulseHooks: result.legalPulseHooks,                    // adaptiv
          detailedLegalOpinion: result.detailedLegalOpinion || '',    // PFLICHT (default ''  ok)
          // 🔒 importantDates werden validiert bevor sie gespeichert werden
          importantDates: validateAndFilterImportantDates(result.importantDates || [], { startDate: extractedStartDate, expiryDate: extractedEndDate }, requestId)
        };

        // 🔧 FIX: Override expiryDate from AI importantDates if available
        // 🔒 NEU: Nur wenn Regex-Konfidenz niedrig ist (< 70%)!
        const aiEndDate = extractEndDateFromImportantDates(result.importantDates, endDateConfidence, requestId);
        if (aiEndDate) {
          const oldExpiry = updateData.expiryDate ? (updateData.expiryDate instanceof Date ? updateData.expiryDate.toISOString() : updateData.expiryDate) : 'null';
          console.log(`🔧 [${requestId}] Updating expiryDate from AI importantDates: ${oldExpiry} → ${aiEndDate.toISOString()}`);
          updateData.expiryDate = aiEndDate;
          updateData.endDate = aiEndDate; // Also update endDate for consistency
          updateData.expiryDateSource = 'ai_importantDates'; // Track the source
        } else {
          // 🛡️ PLAUSIBILITY CHECK: If regex date is in the past but AI found no end_date,
          // the regex probably found the wrong date (e.g., invoice date). Clear it!
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (updateData.expiryDate && new Date(updateData.expiryDate) < today) {
            console.warn(`⚠️ [${requestId}] PLAUSIBILITY CHECK: Regex expiryDate ${updateData.expiryDate} is in the past, but AI found no end_date. Clearing to prevent false "Beendet" status.`);
            updateData.expiryDate = null;
            updateData.endDate = null;
            updateData.expiryDateSource = 'cleared_implausible';
          }
        }

        // Add s3Key at top level if S3 upload
        if (storageInfo.s3Info) {
          updateData.s3Key = storageInfo.s3Info.key;
          updateData.s3Bucket = storageInfo.s3Info.bucket;
          updateData.s3Location = storageInfo.s3Info.location;
          updateData.s3ETag = storageInfo.s3Info.etag;
        }

        updateData.extraRefs = {
          uploadType: storageInfo.uploadType,
          analysisId: inserted.insertedId,
          documentType: validationResult.documentType,
          analysisStrategy: validationResult.strategy,
          ...(storageInfo.s3Info && {
            s3Bucket: storageInfo.s3Info.bucket,
            s3Key: storageInfo.s3Info.key,
            s3Location: storageInfo.s3Info.location,
            s3ETag: storageInfo.s3Info.etag
          }),
          ...(storageInfo.localInfo && {
            uploadPath: UPLOAD_PATH,
            serverPath: storageInfo.localInfo.path
          }),
          extractionMethod: 'deep-lawyer-level-analysis-FIXED-v5',
          deepLawyerLevelAnalysis: true,
          modelUsed: 'gpt-4-turbo',
          tokenOptimized: true,
          substantialContent: true
        };

        await contractsCollection.updateOne(
          { _id: existingContract._id },
          { $set: updateData }
        );

        console.log(`✅ [${requestId}] Existing contract updated with FIXED deep lawyer-level analysis (${fullTextContent.length} characters)`);

        // 🆕 CALENDAR EVENTS REGENERIEREN BEI RE-ANALYSE
        // Cleanup vorher: alte AI-Events werden entfernt, manuelle Termine bleiben.
        try {
          const db = await database.connect();
          const updatedContract = await contractsCollection.findOne({ _id: existingContract._id });
          if (!updatedContract) {
            // Defensive: bei parallelen Re-Analysen kann findOne theoretisch null
            // liefern. Dann nutzen wir das bereits geladene existingContract als
            // Fallback — die updateOne() oben hat ja den Datensatz schon aktualisiert.
            console.warn(`⚠️ [${requestId}] findOne lieferte null nach Update — nutze existingContract als Fallback für Calendar-Sync`);
          }
          const contractForCalendar = updatedContract || existingContract;
          const result = await cleanAndRegenerateAIEvents(db, contractForCalendar);
          console.log(`📅 [${requestId}] Calendar Events regeneriert für ${contractForCalendar.name}: ${result.deleted} alt → ${result.generated} neu${contractForCalendar.isAutoRenewal ? ' (Auto-Renewal)' : ''}`);
        } catch (eventError) {
          console.warn(`⚠️ [${requestId}] Calendar Events konnten nicht regeneriert werden:`, eventError.message);
        }

        // V1 Legal Pulse Background-Analyse — DEAKTIVIERT (22.04.2026)
        // V2 Pipeline hat V1 vollständig ersetzt. Spart OpenAI-Kosten pro Analyse.
        // V2-Analyse läuft separat über die Legal Pulse Seite.

        // 🔍 LEGAL LENS PRE-PROCESSING für existierenden Vertrag (Background Job)
        // Nur wenn noch keine vorverarbeiteten Klauseln existieren
        if (!existingContract.legalLens?.preParsedClauses?.length) {
          (async () => {
            try {
              console.log(`🔍 [${requestId}] Starting Legal Lens pre-processing for existing contract in background...`);

              const cleanedText = clauseParser.preprocessText(fullTextContent);
              const { text: filteredText } = clauseParser.removeHeaderFooter(cleanedText);
              const rawBlocks = clauseParser.createTextBlocks(filteredText);

              if (rawBlocks.length === 0) return;

              const maxBlocksPerCall = 25;
              const batches = [];
              for (let i = 0; i < rawBlocks.length; i += maxBlocksPerCall) {
                batches.push(rawBlocks.slice(i, i + maxBlocksPerCall));
              }

              let allClauses = [];
              for (const batch of batches) {
                try {
                  const batchClauses = await clauseParser.gptSegmentClausesBatch(batch, existingContract.name || '');
                  const validClauses = batchClauses
                    .filter(c => c && c.text && typeof c.text === 'string' && c.text.trim().length > 0)
                    .map((clause, idx) => {
                      const processedTitle = clauseParser.deriveClauseTitle(clause);
                      const riskAssessment = clauseParser.assessClauseRisk(clause.text);
                      const analyzableCheck = clauseParser.detectNonAnalyzable(clause.text, processedTitle);
                      return {
                        id: clause.id || `clause_pre_${allClauses.length + idx + 1}`,
                        number: clause.number || `${allClauses.length + idx + 1}`,
                        title: processedTitle,
                        text: clause.text,
                        type: clause.type || 'paragraph',
                        riskLevel: analyzableCheck.nonAnalyzable ? 'none' : riskAssessment.level,
                        riskScore: analyzableCheck.nonAnalyzable ? 0 : riskAssessment.score,
                        riskKeywords: analyzableCheck.nonAnalyzable ? [] : riskAssessment.keywords,
                        riskIndicators: {
                          level: analyzableCheck.nonAnalyzable ? 'none' : riskAssessment.level,
                          keywords: analyzableCheck.nonAnalyzable ? [] : riskAssessment.keywords,
                          score: analyzableCheck.nonAnalyzable ? 0 : riskAssessment.score
                        },
                        nonAnalyzable: analyzableCheck.nonAnalyzable,
                        nonAnalyzableReason: analyzableCheck.reason,
                        clauseCategory: analyzableCheck.category
                      };
                    });
                  allClauses = [...allClauses, ...validClauses];
                } catch (batchError) {
                  console.warn(`⚠️ [${requestId}] Legal Lens batch error:`, batchError.message);
                }
                await new Promise(resolve => setTimeout(resolve, 300));
              }

              if (allClauses.length === 0) return;

              const analyzableClauses = allClauses.filter(c => !c.nonAnalyzable);
              const riskSummary = {
                high: analyzableClauses.filter(c => c.riskLevel === 'high').length,
                medium: analyzableClauses.filter(c => c.riskLevel === 'medium').length,
                low: analyzableClauses.filter(c => c.riskLevel === 'low').length
              };

              await contractsCollection.updateOne(
                { _id: existingContract._id },
                {
                  $set: {
                    'legalLens.preParsedClauses': allClauses,
                    'legalLens.riskSummary': riskSummary,
                    'legalLens.metadata': {
                      parsedAt: new Date().toISOString(),
                      parserVersion: '2.0.0-preprocess',
                      usedGPT: true,
                      blockCount: rawBlocks.length,
                      batchCount: batches.length,
                      source: 'background-preprocess'
                    },
                    'legalLens.preprocessStatus': 'completed',
                    'legalLens.preprocessedAt': new Date()
                  }
                }
              );

              console.log(`✅ [${requestId}] Legal Lens pre-processing completed: ${allClauses.length} clauses cached for existing contract ${existingContract._id}`);
            } catch (preprocessError) {
              console.error(`❌ [${requestId}] Legal Lens pre-processing failed:`, preprocessError.message);
            }
          })();
        } else {
          console.log(`⏭️ [${requestId}] Legal Lens: Existing contract already has pre-parsed clauses`);
        }

        // 🔍 VECTOR EMBEDDING für Legal Pulse Monitoring (Background)
        embedContractAsync(existingContract._id.toString(), fullTextContent, {
          userId: req.user.userId,
          contractName: existingContract.name,
          contractType: extractedContractType || validationResult.documentType || 'unknown'
        });
        console.log(`🔍 [${requestId}] Contract embedding triggered for existing contract ${existingContract._id}`);

      } else {
        // 📋 ÄNDERUNG 4: UPDATE contractAnalysisData WITH AUTO-RENEWAL & DURATION
        const contractAnalysisData = {
          name: fixUtf8Filename(req.file.originalname),

          // Laufzeit (contract duration) - NULL if not found
          laufzeit: extractedContractDuration ?
            `${extractedContractDuration.value} ${extractedContractDuration.unit}` :
            null,

          // Kündigungsfrist (cancellation period) - NULL if not found
          kuendigung: extractedCancellationPeriod ?
            (extractedCancellationPeriod.type === 'daily' ? 'Täglich kündbar' :
             extractedCancellationPeriod.type === 'end_of_period' ? 'Zum Ende der Laufzeit' :
             `${extractedCancellationPeriod.value} ${extractedCancellationPeriod.unit}`) :
            null,

          startDate: extractedStartDate || null, // 🆕 START DATE
          expiryDate: extractedEndDate || null,  // null statt "" für Datums-Checks!
          status: extractedDocumentCategory === 'cancellation_confirmation' ? 'Gekündigt' : 'Active',

          // 📋 NEUE FELDER:
          provider: extractedProvider,
          contractNumber: extractedContractNumber,
          customerNumber: extractedCustomerNumber,
          providerDetected: !!extractedProvider,
          providerConfidence: extractedProvider?.confidence || 0,
          // 🔒 KONFIDENZ-WERTE für Datenintegrität
          startDateConfidence: startDateConfidence,
          endDateConfidence: endDateConfidence,
          autoRenewalConfidence: autoRenewalConfidence,
          cancellationPeriodConfidence: extractedCancellationPeriod?.confidence || 0,
          contractDurationConfidence: extractedContractDuration?.confidence || 0,
          contractDuration: extractedContractDuration, // 🆕 CONTRACT DURATION object
          cancellationPeriod: extractedCancellationPeriod,
          isAutoRenewal: extractedIsAutoRenewal || false, // 🆕 AUTO-RENEWAL

          // 🆕 DOCUMENT CATEGORY & KÜNDIGUNGSDATUM
          documentCategory: extractedDocumentCategory || 'active_contract',
          gekuendigtZum: extractedGekuendigtZum || null, // 🆕 Für Kalender-Events

          // 🆕 MINDESTLAUFZEIT (z.B. "Kündigung ab 6. Monat möglich")
          minimumTerm: extractedMinimumTerm || null,
          canCancelAfterDate: extractedCanCancelAfterDate || null // 🆕 Datum ab wann kündbar - Für Kalender-Events
        };

        const savedContract = await saveContractWithUpload(
          req.user.userId,
          contractAnalysisData,
          req.file,
          fullTextContent,
          storageInfo,
          fileHash
        );

        // 🔧 FIX: Extract AI end date for new contracts too
        // 🔒 NEU: Nur wenn Regex-Konfidenz niedrig ist (< 70%)!
        const aiEndDateNew = extractEndDateFromImportantDates(result.importantDates, endDateConfidence, requestId);

        // 🛡️ PLAUSIBILITY CHECK for new contracts
        let expiryDateUpdate = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (aiEndDateNew) {
          console.log(`🔧 [${requestId}] [NEW CONTRACT] Overriding expiryDate with AI importantDates: ${aiEndDateNew.toISOString()}`);
          expiryDateUpdate = {
            expiryDate: aiEndDateNew,
            endDate: aiEndDateNew,
            expiryDateSource: 'ai_importantDates'
          };
        } else if (extractedEndDate && new Date(extractedEndDate) < today) {
          // Regex found a date in the past but AI found nothing - clear it!
          console.warn(`⚠️ [${requestId}] [NEW CONTRACT] PLAUSIBILITY CHECK: Regex expiryDate is in the past, but AI found no end_date. Clearing to prevent false "Beendet" status.`);
          expiryDateUpdate = {
            expiryDate: null,
            endDate: null,
            expiryDateSource: 'cleared_implausible'
          };
        }

        await contractsCollection.updateOne(
          { _id: savedContract._id },
          {
            $set: {
              analysisId: inserted.insertedId,

              // 🔧 FIX: Override expiryDate from AI importantDates OR clear if implausible
              ...expiryDateUpdate,

              // Enhanced metadata
              documentType: validationResult.documentType,
              analysisStrategy: validationResult.strategy,
              confidence: validationResult.confidence,
              qualityScore: validationResult.qualityScore,
              extractionMethod: 'deep-lawyer-level-analysis-FIXED-v5',
              extractionQuality: analysisData.extractionQuality,

              // ✅ Deep lawyer-level flags
              deepLawyerLevelAnalysis: true,
              analysisDepth: 'deep-lawyer-level',
              structuredAnalysis: true,
              modelUsed: 'gpt-4-turbo',
              tokenOptimized: true,
              substantialContent: true,

              // ✅ ANALYSE-FELDER direkt im Contract speichern für Contract Detail View
              analyzed: true, // 🔧 FIX: Flag setzen damit Status "Aktiv" statt "Neu" angezeigt wird
              analyzedAt: new Date(), // Zeitpunkt der Analyse
              contractScore: result.contractScore || 0,
              // 🌐 Phase-1-Redesign: Recognition-Felder + Adaptive-Output (siehe oben)
              documentCharacterization: result.documentCharacterization,
              completeness: result.completeness,
              asymmetryAssessment: result.asymmetryAssessment,
              scoreReasoning: result.scoreReasoning,
              typeSpecificFindings: result.typeSpecificFindings,
              fristHinweise: result.fristHinweise,
              laymanSummary: result.laymanSummary,
              summary: result.summary,
              legalAssessment: result.legalAssessment,
              suggestions: result.suggestions,
              comparison: result.comparison,
              positiveAspects: result.positiveAspects,
              criticalIssues: result.criticalIssues,
              risiken: result.criticalIssues,
              recommendations: result.recommendations,
              quickFacts: result.quickFacts,
              legalPulseHooks: result.legalPulseHooks,
              detailedLegalOpinion: result.detailedLegalOpinion || '',
              // 🔒 importantDates werden validiert bevor sie gespeichert werden
              importantDates: validateAndFilterImportantDates(result.importantDates || [], { startDate: extractedStartDate, expiryDate: extractedEndDate }, requestId),

              'extraRefs.analysisId': inserted.insertedId,
              'extraRefs.documentType': validationResult.documentType,
              'extraRefs.analysisStrategy': validationResult.strategy,
              'extraRefs.extractionMethod': 'deep-lawyer-level-analysis-FIXED-v5',
              'extraRefs.deepLawyerLevelAnalysis': true,
              'extraRefs.modelUsed': 'gpt-4-turbo',
              'extraRefs.tokenOptimized': true,
              'extraRefs.substantialContent': true
            }
          }
        );

        console.log(`✅ [${requestId}] New contract saved with FIXED deep lawyer-level analysis: ${savedContract._id} (${validationResult.documentType})`);
        
        // 🆕 CALENDAR EVENTS GENERIEREN FÜR NEUEN CONTRACT
        try {
          const db = await database.connect();
          const events = await generateEventsForContract(db, savedContract);
          console.log(`📅 Calendar Events generiert für ${savedContract.name}: ${events.length} Events${savedContract.isAutoRenewal ? ' (Auto-Renewal)' : ''}`);
          console.log(`📅 Events:`, events.map(e => ({
            type: e.type,
            date: e.date,
            severity: e.severity
          })));
        } catch (eventError) {
          console.warn(`⚠️ Calendar Events konnten nicht generiert werden:`, eventError.message);
        }

        // V1 Legal Pulse Background-Analyse — DEAKTIVIERT (22.04.2026)
        // V2 Pipeline hat V1 vollständig ersetzt. Spart OpenAI-Kosten pro Analyse.
        // V2-Analyse läuft separat über die Legal Pulse Seite.

        // 🔍 LEGAL LENS PRE-PROCESSING (Background Job für alle User)
        // Parsed Klauseln im Hintergrund für schnelles Laden bei Legal Lens
        (async () => {
          try {
            console.log(`🔍 [${requestId}] Starting Legal Lens pre-processing in background...`);

            // Text vorbereiten
            const cleanedText = clauseParser.preprocessText(fullTextContent);
            const { text: filteredText } = clauseParser.removeHeaderFooter(cleanedText);
            const rawBlocks = clauseParser.createTextBlocks(filteredText);

            if (rawBlocks.length === 0) {
              console.log(`⚠️ [${requestId}] Legal Lens: No text blocks found, skipping`);
              return;
            }

            // GPT-basiertes Klausel-Parsing (in Batches)
            const maxBlocksPerCall = 25;
            const batches = [];
            for (let i = 0; i < rawBlocks.length; i += maxBlocksPerCall) {
              batches.push(rawBlocks.slice(i, i + maxBlocksPerCall));
            }

            let allClauses = [];
            for (const batch of batches) {
              try {
                const batchClauses = await clauseParser.gptSegmentClausesBatch(batch, savedContract.name || '');
                const validClauses = batchClauses
                  .filter(c => c && c.text && typeof c.text === 'string' && c.text.trim().length > 0)
                  .map((clause, idx) => {
                    const processedTitle = clauseParser.deriveClauseTitle(clause);
                    const riskAssessment = clauseParser.assessClauseRisk(clause.text);
                    const analyzableCheck = clauseParser.detectNonAnalyzable(clause.text, processedTitle);
                    return {
                      id: clause.id || `clause_pre_${allClauses.length + idx + 1}`,
                      number: clause.number || `${allClauses.length + idx + 1}`,
                      title: processedTitle,
                      text: clause.text,
                      type: clause.type || 'paragraph',
                      riskLevel: analyzableCheck.nonAnalyzable ? 'none' : riskAssessment.level,
                      riskScore: analyzableCheck.nonAnalyzable ? 0 : riskAssessment.score,
                      riskKeywords: analyzableCheck.nonAnalyzable ? [] : riskAssessment.keywords,
                      riskIndicators: {
                        level: analyzableCheck.nonAnalyzable ? 'none' : riskAssessment.level,
                        keywords: analyzableCheck.nonAnalyzable ? [] : riskAssessment.keywords,
                        score: analyzableCheck.nonAnalyzable ? 0 : riskAssessment.score
                      },
                      nonAnalyzable: analyzableCheck.nonAnalyzable,
                      nonAnalyzableReason: analyzableCheck.reason,
                      clauseCategory: analyzableCheck.category
                    };
                  });
                allClauses = [...allClauses, ...validClauses];
              } catch (batchError) {
                console.warn(`⚠️ [${requestId}] Legal Lens batch error:`, batchError.message);
              }
              // Kleine Pause zwischen Batches
              await new Promise(resolve => setTimeout(resolve, 300));
            }

            if (allClauses.length === 0) {
              console.log(`⚠️ [${requestId}] Legal Lens: No clauses parsed`);
              return;
            }

            // Risk Summary berechnen (nur analysierbare Klauseln zählen)
            const analyzableClauses = allClauses.filter(c => !c.nonAnalyzable);
            const riskSummary = {
              high: analyzableClauses.filter(c => c.riskLevel === 'high').length,
              medium: analyzableClauses.filter(c => c.riskLevel === 'medium').length,
              low: analyzableClauses.filter(c => c.riskLevel === 'low').length
            };

            // In DB speichern
            await contractsCollection.updateOne(
              { _id: savedContract._id },
              {
                $set: {
                  'legalLens.preParsedClauses': allClauses,
                  'legalLens.riskSummary': riskSummary,
                  'legalLens.metadata': {
                    parsedAt: new Date().toISOString(),
                    parserVersion: '2.0.0-preprocess',
                    usedGPT: true,
                    blockCount: rawBlocks.length,
                    batchCount: batches.length,
                    source: 'background-preprocess'
                  },
                  'legalLens.preprocessStatus': 'completed',
                  'legalLens.preprocessedAt': new Date()
                }
              }
            );

            console.log(`✅ [${requestId}] Legal Lens pre-processing completed: ${allClauses.length} clauses cached for contract ${savedContract._id}`);
          } catch (preprocessError) {
            console.error(`❌ [${requestId}] Legal Lens pre-processing failed:`, preprocessError.message);
            // Update status to error
            try {
              await contractsCollection.updateOne(
                { _id: savedContract._id },
                { $set: { 'legalLens.preprocessStatus': 'error' } }
              );
            } catch (e) { /* ignore */ }
          }
        })();

        // 🔍 VECTOR EMBEDDING für Legal Pulse Monitoring (Background)
        embedContractAsync(savedContract._id.toString(), fullTextContent, {
          userId: req.user.userId,
          contractName: savedContract.name,
          contractType: extractedContractType || validationResult.documentType || 'unknown'
        });
        console.log(`🔍 [${requestId}] Contract embedding triggered for new contract ${savedContract._id}`);
      }

    } catch (saveError) {
      console.error(`❌ [${requestId}] Contract save error:`, saveError.message);
      console.warn(`⚠️ [${requestId}] FIXED Deep lawyer-level analysis was successful, but contract saving failed`);
    }

    // ✅ Counter wurde bereits atomar am Anfang erhöht (Race Condition Fix)
    // Kein zweites Increment mehr nötig!
    console.log(`✅ [${requestId}] Analysis counter already updated atomically at start`);

    console.log(`🛠️🎉 [${requestId}] FIXED Enhanced DEEP Lawyer-Level Analysis completely successful!`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const contractType = result?.vertragstyp || validationResult?.documentType || 'unknown';
    const contractScore = result?.contractScore || 0;
    console.log(`✅ [ANALYSIS] Done in ${duration}s | type=${contractType} | score=${contractScore} | user=${req.user?.userId} | requestId=${requestId}`);

    // 🎓 Onboarding: firstAnalysisComplete automatisch auf true setzen
    if (req.user?.userId && usersCollectionRef) {
      try {
        const updateResult = await usersCollectionRef.updateOne(
          { _id: new ObjectId(req.user.userId) },
          {
            $set: {
              'onboarding.checklist.firstAnalysisComplete': true,
              updatedAt: new Date()
            }
          }
        );
        if (updateResult.modifiedCount > 0) {
          console.log(`🎓 [Onboarding] Checklist aktualisiert: firstAnalysisComplete = true für User ${req.user.userId}`);
        }
      } catch (onboardingErr) {
        console.warn(`⚠️ [Onboarding] Checklist Update fehlgeschlagen:`, onboardingErr.message);
      }
    }

    // ✅ KRITISCHER FIX: ORIGINAL RESPONSE-STRUKTUR OHNE "data" WRAPPER!
    const responseData = { 
      success: true,
      message: `${validationResult.analysisMessage} auf höchstem Anwaltsniveau erfolgreich abgeschlossen`,
      requestId,
      uploadType: storageInfo.uploadType,
      fileUrl: storageInfo.fileUrl,
      
      // 📋 ALLE FELDER DIREKT IM ROOT (KEIN data OBJEKT!)
      provider: extractedProvider,
      contractNumber: extractedContractNumber,
      customerNumber: extractedCustomerNumber,
      startDate: extractedStartDate,
      expiryDate: extractedEndDate,
      contractDuration: extractedContractDuration,
      cancellationPeriod: extractedCancellationPeriod,
      providerDetected: !!extractedProvider,
      providerConfidence: extractedProvider?.confidence || 0,
      // 🔒 KONFIDENZ-WERTE für Datenintegrität
      startDateConfidence: startDateConfidence,
      endDateConfidence: endDateConfidence,
      autoRenewalConfidence: autoRenewalConfidence,
      cancellationPeriodConfidence: extractedCancellationPeriod?.confidence || 0,
      contractDurationConfidence: extractedContractDuration?.confidence || 0,
      isAutoRenewal: extractedIsAutoRenewal || false,

      // Formatted strings for display
      laufzeit: extractedContractDuration ? 
        `${extractedContractDuration.value} ${extractedContractDuration.unit}` : 
        null,
      kuendigung: extractedCancellationPeriod ? 
        (extractedCancellationPeriod.type === 'daily' ? 'Täglich kündbar' :
         extractedCancellationPeriod.type === 'end_of_period' ? 'Zum Ende der Laufzeit' :
         `${extractedCancellationPeriod.value} ${extractedCancellationPeriod.unit}`) : 
        null,
      
      // Enhanced response data
      documentType: validationResult.documentType || "UNKNOWN",
      analysisStrategy: validationResult.strategy || "DEEP_LAWYER_LEVEL_ANALYSIS", 
      confidence: `${Math.round(validationResult.confidence * 100)}%`,
      qualityScore: `${Math.round(validationResult.qualityScore * 100)}%`,
      analysisMessage: validationResult.analysisMessage || "Tiefgehende anwaltliche Vertragsanalyse",
      
      deepLawyerLevelAnalysis: true,
      lawyerLevelAnalysis: true,
      analysisDepth: 'deep-lawyer-level',
      structuredAnalysis: true,
      completenessGuarantee: true,
      modelUsed: 'gpt-4-turbo',
      tokenOptimized: true,
      substantialContent: true,
      fixedVersion: 'v5',
      
      extractionInfo: {
        method: 'deep-lawyer-level-analysis-FIXED-v5',
        quality: analysisData.extractionQuality || 'excellent',
        charactersExtracted: `${fullTextContent.length}`,
        pageCount: `${validationResult.metrics.pageCount}`,
        hasTabularData: validationResult.metrics.hasTabularData ? "true" : "false",
        isStructured: validationResult.metrics.isStructured ? "true" : "false",
        modelUsed: 'gpt-4-turbo',
        tokenOptimized: "true",
        substantialContent: "true"
      },
      
      ...(storageInfo.s3Info && {
        s3Info: storageInfo.s3Info
      }),
      
      // ✅ WICHTIG: Result-Felder DIREKT im Root spreaden (kein data wrapper!)
      ...result, 
      
      analysisId: inserted.insertedId,
      usage: {
        count: newCount,  // Already incremented earlier (line 2080)
        limit: limit,
        plan: plan
      }
    };

    if (existingContract && req.body.forceReanalyze === 'true') {
      responseData.isReanalysis = true;
      responseData.originalContractId = existingContract._id;
      responseData.message = `${validationResult.analysisMessage} auf höchstem Anwaltsniveau erfolgreich aktualisiert`;
    } else if (savedContract) {
      // ✅ Add contractId for new contracts (for Legal Pulse button)
      responseData.originalContractId = savedContract._id;
    }

    // 📋 Activity Log: Vertrag analysiert
    try {
      const { logActivity, ActivityTypes } = require('../services/activityLogger');
      await logActivity(await database.connect(), {
        type: ActivityTypes.CONTRACT_ANALYZED,
        userId: req.user.userId,
        userEmail: user?.email,
        description: `Vertrag analysiert: ${req.file?.originalname || 'Unbekannt'}`,
        details: {
          plan: plan,
          filename: req.file?.originalname,
          analysisId: inserted?.insertedId?.toString()
        },
        severity: 'info',
        source: 'analyze'
      });
    } catch (logErr) {
      console.error("Activity Log Error:", logErr);
    }

    // ✅ DIREKT responseData senden, KEIN data wrapper!
    res.json(responseData);

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ [ANALYSIS] Error after ${duration}s | user=${req.user?.userId} | file="${req.file?.originalname}" | requestId=${requestId}`);
    console.error(`❌ [${requestId}] Error in FIXED enhanced deep lawyer-level analysis:`, {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      userId: req.user?.userId,
      filename: req.file?.originalname,
      uploadType: storageInfo?.uploadType
    });

    // 🔧 FIX: Rollback analysisCount if it was incremented but analysis failed
    if (analysisCountIncremented && incrementedUserId && usersCollectionRef) {
      try {
        await usersCollectionRef.updateOne(
          { _id: incrementedUserId },
          { $inc: { analysisCount: -1 } }
        );
        console.log(`🔄 [${requestId}] analysisCount rolled back (-1) due to failed analysis`);
      } catch (rollbackError) {
        console.error(`❌ [${requestId}] Failed to rollback analysisCount:`, rollbackError.message);
      }
    }

    // Cleanup local file on error
    if (req.file && req.file.path && fsSync.existsSync(req.file.path)) {
      try {
        await fs.unlink(req.file.path);
        console.log(`🗑️ [${requestId}] Cleaned up local file after error`);
      } catch (cleanupError) {
        console.error(`❌ [${requestId}] Cleanup error:`, cleanupError);
      }
    }

    let errorMessage = "Error during deep lawyer-level analysis.";
    let errorCode = "ANALYSIS_ERROR";

    if (error.message.includes("API Key")) {
      errorMessage = "AI service temporarily unavailable.";
      errorCode = "AI_SERVICE_ERROR";
    } else if (error.message.includes("Timeout")) {
      errorMessage = "Analysis timeout. Please try with a smaller file.";
      errorCode = "TIMEOUT_ERROR";
    } else if (error.message.includes("JSON") || error.message.includes("Parse")) {
      errorMessage = "Error in deep analysis processing.";
      errorCode = "PARSE_ERROR";
    } else if (error.message.includes("PDF") || error.message.includes("File") || error.message.includes("password") || error.message.includes("📸") || error.message.includes("📄") || error.message.includes("🔒")) {
      errorMessage = error.message;
      errorCode = "PDF_ERROR";
    } else if (error.message.includes("Database") || error.message.includes("MongoDB")) {
      errorMessage = "Database error. Please try again.";
      errorCode = "DATABASE_ERROR";
    } else if (error.message.includes("OpenAI") || error.message.includes("Rate Limit")) {
      errorMessage = "AI analysis service temporarily unavailable.";
      errorCode = "AI_SERVICE_ERROR";
    } else if (error.message.includes("S3") || error.message.includes("AWS")) {
      errorMessage = "File storage error. Please try again.";
      errorCode = "STORAGE_ERROR";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorCode,
      requestId,
      uploadType: storageInfo.uploadType,
      deepLawyerLevelAnalysis: true,
      lawyerLevelAnalysis: true,
      modelUsed: 'gpt-4-turbo',
      tokenOptimized: true,
      substantialContent: true,
      fixedVersion: 'v5',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Final cleanup: Delete local file if S3 upload was successful
    if (cleanupLocalFile && req.file && req.file.path && fsSync.existsSync(req.file.path)) {
      try {
        await fs.unlink(req.file.path);
        console.log(`🗑️ [${requestId}] Cleaned up local file after successful S3 upload`);
      } catch (cleanupError) {
        console.error(`⚠️ [${requestId}] Final cleanup warning:`, cleanupError.message);
      }
    }
  }
};

// ===== OTHER ROUTES (UNCHANGED) =====

router.get("/history", verifyToken, async (req, res) => {
  const requestId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`📚 [${requestId}] Analysis history requested for user: ${req.user.userId}`);
    
    const { analysisCollection } = await getMongoCollections();
    
    const history = await analysisCollection
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    console.log(`📚 [${requestId}] ${history.length} analysis entries found`);

    res.json({
      success: true,
      requestId,
      history: history,
      count: history.length
    });

  } catch (err) {
    console.error(`❌ [${requestId}] Error fetching analysis history:`, err);
    res.status(500).json({ 
      success: false,
      message: "Error fetching history.",
      error: "HISTORY_ERROR",
      requestId
    });
  }
});

// ✅ ENHANCED: Health Check with comprehensive S3 status + FIXED Deep Lawyer-Level Analysis + AUTO-RENEWAL + DURATION
router.get("/health", async (req, res) => {
  // Re-test S3 connectivity for health check
  if (S3_CONFIGURED && s3Instance) {
    await testS3Connectivity();
  }

  const checks = {
    service: "FIXED Enhanced DEEP Lawyer-Level Contract Analysis + S3 + Provider Detection WITHOUT Database + Auto-Renewal + Duration Extraction + FIXED RESPONSE STRUCTURE",
    status: "online",
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    mongoConnected: false,
    uploadsPath: fsSync.existsSync(UPLOAD_PATH),
    uploadPath: UPLOAD_PATH,
    uploadType: S3_AVAILABLE ? "S3_UPLOAD" : "LOCAL_UPLOAD",
    s3Available: S3_AVAILABLE,
    s3Configured: S3_CONFIGURED,
    s3Region: process.env.AWS_REGION || 'not-configured',
    s3Bucket: process.env.S3_BUCKET_NAME || 'not-configured',
    s3ConfigError: S3_CONFIG_ERROR,
    cryptoAvailable: !!crypto,
    saveContractAvailable: !!saveContract,
    features: {
      deepLawyerLevelAnalysis: true,
      lawyerLevelAnalysis: true, // Backward compatibility
      providerDetectionWithoutDatabase: true, // 📋 NO DATABASE!
      contractDataExtraction: true, // 📋 NEW
      calendarEventsGeneration: true, // 🆕 NEW
      autoRenewalDetection: true, // 🆕 AUTO-RENEWAL
      contractDurationExtraction: true, // 🆕 DURATION
      dailyCancellationDetection: true, // 🆕 DAILY CANCELLATION
      nullInsteadOfDefaults: true, // 🆕 NULL VALUES
      sevenPointStructure: true,
      simplifiedValidation: true, // ✅ FIXED: Less aggressive validation
      completenessGuarantee: true,
      structuredResponseFormat: true,
      smartDocumentAnalysis: true,
      documentTypeDetection: true,
      qualityAssessment: true,
      specializedPrompts: true,
      enhancedLogging: true,
      jsonValidation: true,
      robustFallbackMechanisms: true, // ✅ FIXED: Better fallbacks
      tokenOptimization: true,
      smartTextTruncation: true,
      largeDocumentSupport: true,
      substantialContentGeneration: true,
      juridicalDepthAnalysis: true,
      enhancedRetryMechanisms: true,
      extendedTimeouts: true,
      gpt4TurboSupport: true, // ✅ NEW: GPT-4-Turbo support
      robustErrorHandling: true, // ✅ FIXED: Better error handling
      syntaxErrorsFree: true, // ✅ NEW: No syntax errors
      fixedResponseStructure: true // ✅ CRITICAL FIX: No data wrapper!
    },
    tokenLimits: MODEL_LIMITS,
    modelUsed: 'gpt-4-turbo', // ✅ NEW: Track which model is being used
    version: "deep-lawyer-level-analysis-FIXED-v5.5-response-structure-fixed"
  };

  try {
    await getMongoCollections();
    checks.mongoConnected = true;
  } catch (err) {
    checks.mongoConnected = false;
    checks.mongoError = err.message;
  }

  const isHealthy = checks.openaiConfigured && checks.mongoConnected && checks.uploadsPath;
  
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    ...checks
  });
});

// ===== EXPORT FUNCTIONS FOR OTHER ROUTES =====
module.exports = router;
module.exports.generateDeepLawyerLevelPrompt = generateDeepLawyerLevelPrompt;
module.exports.getContractTypeAwareness = getContractTypeAwareness;
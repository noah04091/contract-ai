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
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");
const rateLimit = require("express-rate-limit"); // 🚦 Rate Limiting
const contractAnalyzer = require("../services/contractAnalyzer"); // 📋 Provider Detection Import
const { generateEventsForContract } = require("../services/calendarEvents"); // 🆕 CALENDAR EVENTS IMPORT
const AILegalPulse = require("../services/aiLegalPulse"); // ⚡ NEW: Legal Pulse Risk Analysis
const { getInstance: getCostTrackingService } = require("../services/costTracking"); // 💰 NEW: Cost Tracking
const { clauseParser } = require("../services/legalLens"); // 🔍 Legal Lens Pre-Processing
const { isBusinessOrHigher, isEnterpriseOrHigher, getFeatureLimit, PLANS } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen
const { sendLimitReachedEmail, sendAlmostAtLimitEmail } = require("../services/triggerEmailService"); // 📧 Behavior-based Emails
const { embedContractAsync } = require("../services/contractEmbedder"); // 🔍 Auto-Embedding for Legal Pulse Monitoring

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
  MAX_PDF_PAGES: 50,           // Maximal 50 Seiten pro Analyse
  MAX_INPUT_TOKENS: 8000,      // Max Input-Tokens für GPT-4
  MAX_OUTPUT_TOKENS: 4000,     // Max Output-Tokens
  MAX_TOTAL_TOKENS: 12000,     // Gesamt-Limit (Input + Output)
  // Premium-User Limits (2x größer)
  PREMIUM_MAX_PDF_PAGES: 100,
  PREMIUM_MAX_INPUT_TOKENS: 16000
};

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

  // ✅ FIXED: Very relaxed field checking - only ensure they exist
  const requiredFields = ['summary', 'legalAssessment', 'suggestions', 'comparison'];
  
  for (const field of requiredFields) {
    if (!result[field] || (Array.isArray(result[field]) && result[field].length === 0)) {
      console.warn(`⚠️ [${requestId}] Missing field ${field}, adding default`);
      result[field] = [`Analyse für ${field} wird verarbeitet...`];
    }
  }
  
  // ✅ FIXED: Ensure structured fields exist with simple fallbacks
  if (!result.positiveAspects || !Array.isArray(result.positiveAspects)) {
    result.positiveAspects = [{
      title: "Dokumentenstruktur",
      description: "Das Dokument zeigt eine erkennbare rechtliche Struktur und ist grundsätzlich nachvollziehbar."
    }];
  }
  
  if (!result.criticalIssues || !Array.isArray(result.criticalIssues)) {
    result.criticalIssues = [{
      title: "Detailprüfung empfohlen",
      description: "Eine eingehende rechtliche Detailprüfung wird empfohlen, um potentielle Risiken zu bewerten.",
      riskLevel: "medium"
    }];
  }
  
  if (!result.recommendations || !Array.isArray(result.recommendations)) {
    result.recommendations = [{
      title: "Rechtliche Beratung",
      description: "Eine Konsultation mit einem spezialisierten Fachanwalt wird für eine umfassende Bewertung empfohlen.",
      priority: "medium"
    }];
  }
  
  // ✅ FIXED: Ensure score exists
  if (!result.contractScore || result.contractScore < 1 || result.contractScore > 100) {
    result.contractScore = calculateDeepLawyerScore(result, documentType);
  }
  
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
      expertise: `Als Fachanwalt für Kaufrecht mit 20+ Jahren Erfahrung weißt du:

Bei Kaufverträgen sind typischerweise relevant: Gewährleistung/Sachmängelhaftung, Eigentumsvorbehalt, Rücktritts-/Widerrufsrechte, Gefahrübergang, Zahlungsbedingungen, Lieferfristen.

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn keine Eigentumsvorbehaltsklausel drin steht → erwähne sie nicht.
Wenn der Vertrag 10 Seiten mit 50 Klauseln hat → analysiere alle relevanten.
Wenn es nur 2 Seiten mit 5 Klauseln sind → fokussiere auf diese 5.`,

      commonTraps: `Häufige Fallen bei Kaufverträgen (falls im Vertrag vorhanden):
• Gewährleistungsverkürzung unter gesetzliches Minimum (§ 438 BGB: 2 Jahre bei Neuware, 1 Jahr bei Gebrauchtware im B2C)
• Unwirksame Haftungsausschlüsse nach § 309 BGB (für Vorsatz/grobe Fahrlässigkeit)
• Versteckte Kosten (Lieferkosten, Verpackung, Finanzierung)
• Unklare Lieferbedingungen ohne Verzugsfolgen
• Überhöhte Verzugszinsen (Verbraucher: max. 5% über Basiszinssatz)
• Eigentumsvorbehalt mit unklaren Verwertungsrechten`
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
• Mindestlohn-Unterschreitung (aktuell 12,41€/Std., ab 2025: 12,82€/Std.)`
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
• Unwirksame Tierhaltungsverbote (BGH: Kleintiere immer erlaubt)`
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
      expertise: `Als Fachanwalt für Versicherungsrecht mit 20+ Jahren Erfahrung weißt du:

Bei Versicherungsverträgen sind typischerweise relevant: Deckungssumme, Selbstbeteiligung, Leistungsausschlüsse, Obliegenheiten, Wartezeiten, Kündigung nach Schadensfall.

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn keine Wartezeit vereinbart ist → erwähne es nicht.
Wenn der Vertrag sehr umfangreich ist → analysiere ALLE wichtigen Ausschlüsse.
Wenn es eine Standard-Police ist → fokussiere auf typische Problemfelder.`,

      commonTraps: `Häufige Fallen bei Versicherungsverträgen (falls im Vertrag vorhanden):
• Zu weitgehende Leistungsausschlüsse (grobe Fahrlässigkeit oft unzulässig!)
• Unklare Obliegenheiten mit Leistungskürzung bei Verstoß
• Kündigung durch Versicherer nach jedem Schadensfall (oft einseitig)
• Zu lange Wartezeiten (Krankenversicherung: max. 8 Monate bei Zahn)
• Unzureichende Deckungssummen für typische Schadenfälle
• Vorvertragliche Anzeigepflicht: Zu weitgehende Fragen des Versicherers`
    },

    loan: {
      title: "Fachanwalt für Bank- und Kapitalmarktrecht",
      expertise: `Als Fachanwalt für Bank- und Kapitalmarktrecht mit Fokus auf Verbraucherdarlehen weißt du:

Bei Darlehensverträgen sind typischerweise relevant: Zinssatz (fest/variabel), Sicherheiten, Vorfälligkeitsentschädigung, Sondertilgung, Widerrufsbelehrung, effektiver Jahreszins.

ABER: Prüfe NUR die Klauseln, die TATSÄCHLICH in DIESEM konkreten Vertrag stehen!
Wenn keine Vorfälligkeitsentschädigung vereinbart ist → erwähne es positiv.
Wenn der Vertrag fehlerhafte Widerrufsbelehrung hat → "Widerrufsjoker" prüfen!
Wenn Bearbeitungsgebühren drin stehen → sofort auf Unwirksamkeit hinweisen (BGH 2014).`,

      commonTraps: `Häufige Fallen bei Darlehensverträgen (falls im Vertrag vorhanden):
• Bearbeitungsgebühren UNWIRKSAM (BGH 2014) → Rückforderung möglich!
• Fehlerhafte Widerrufsbelehrung = ewiges Widerrufsrecht ("Widerrufsjoker")
• Überhöhte Vorfälligkeitsentschädigung (BGH-Formel prüfen!)
• Restschuldversicherung überteuert (oft 20-30% der Darlehenssumme)
• Unklare Sicherheiten (Grundschuld ohne Sicherungsabrede)
• Variable Zinsen ohne Obergrenze`
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
• Unzureichende SLA-Penalties bei Ausfall`
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
function generateDeepLawyerLevelPrompt(text, documentType, strategy, requestId) {
  // Optimize text for GPT-4 (but allow more tokens for complex analysis)
  const optimizedText = optimizeTextForGPT4(text, 3000, requestId);

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
  "detailedLegalOpinion": "Ausführliches Rechtsgutachten als Fließtext auf Fachanwaltsniveau: Dieser Vertrag ist grundsätzlich... [FLEXIBLE Länge je nach INHALT: 300-500 Wörter wenn wenig zu sagen, 500-800 Wörter bei moderater Analyse, 800-1500 Wörter wenn viel zu besprechen. Seitenzahl IRRELEVANT! Nur tatsächlicher Analyse-Bedarf zählt!]"
}`;

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

// MongoDB Setup - UNCHANGED
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
let mongoClient = null;
let analysisCollection = null;
let usersCollection = null;
let contractsCollection = null;

const getMongoCollections = async () => {
  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    await mongoClient.connect();
    const db = mongoClient.db("contract_ai");
    analysisCollection = db.collection("analyses");
    usersCollection = db.collection("users");
    contractsCollection = db.collection("contracts");
    console.log("📊 MongoDB collections initialized");
  }
  return { analysisCollection, usersCollection, contractsCollection };
};

// Initialize on startup
(async () => {
  try {
    await getMongoCollections();
    console.log("📊 Connected to all collections");
  } catch (err) {
    console.error("❌ MongoDB error (analyze.js):", err);
  }
})();

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
      updateQuery.analysisCount = { $lt: limit };
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
      return res.status(400).json({
        success: false,
        message: "📄 Datei konnte nicht verarbeitet werden",
        error: "PARSE_ERROR",
        details: "Die Datei scheint beschädigt oder kein gültiges PDF/DOCX zu sein",
        requestId
      });
    }

    // 🚨 STRIKTE SEITEN-LIMIT PRÜFUNG - Kostenkontrolle!
    // ✅ KORRIGIERT: Zentrale Funktion statt hardcoded Plan-Check
    const isUnlimited = isEnterpriseOrHigher(user.subscriptionPlan);
    const maxPages = isUnlimited ? ANALYSIS_LIMITS.PREMIUM_MAX_PDF_PAGES : ANALYSIS_LIMITS.MAX_PDF_PAGES;

    if (pdfData.numpages > maxPages) {
      console.warn(`⚠️ [${requestId}] PDF zu groß: ${pdfData.numpages} Seiten (Limit: ${maxPages})`);
      return res.status(400).json({
        success: false,
        message: `Dokument zu groß. Maximal ${maxPages} Seiten erlaubt.`,
        error: "DOCUMENT_TOO_LARGE",
        details: {
          yourPages: pdfData.numpages,
          maxPages: maxPages,
          subscriptionPlan: user.subscriptionPlan
        },
        suggestions: isPremium
          ? ["Teilen Sie das Dokument in kleinere Abschnitte auf"]
          : ["Upgrade auf Premium für größere Dokumente (bis zu 100 Seiten)", "Teilen Sie das Dokument auf"],
        upgradeUrl: isPremium ? null : "/pricing"
      });
    }

    // 🚨 TOKEN-LIMIT PRÜFUNG - Geschätzte Tokens vor OpenAI Call
    const estimatedInputTokens = estimateTokenCount(pdfData.text);
    const maxInputTokens = isPremium ? ANALYSIS_LIMITS.PREMIUM_MAX_INPUT_TOKENS : ANALYSIS_LIMITS.MAX_INPUT_TOKENS;

    console.log(`📊 [${requestId}] Token-Schätzung: ${estimatedInputTokens} tokens (Limit: ${maxInputTokens})`);

    if (estimatedInputTokens > maxInputTokens) {
      console.warn(`⚠️ [${requestId}] Zu viele Tokens: ${estimatedInputTokens} (Limit: ${maxInputTokens})`);
      return res.status(400).json({
        success: false,
        message: `Dokument zu komplex. Bitte kürzen Sie das Dokument.`,
        error: "TOKEN_LIMIT_EXCEEDED",
        details: {
          estimatedTokens: estimatedInputTokens,
          maxTokens: maxInputTokens,
          subscriptionPlan: user.subscriptionPlan,
          pages: pdfData.numpages
        },
        suggestions: isPremium
          ? ["Entfernen Sie unnötige Abschnitte", "Teilen Sie das Dokument auf"]
          : ["Upgrade auf Premium für größere Dokumente", "Teilen Sie das Dokument auf"],
        upgradeUrl: isPremium ? null : "/pricing"
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

    // ✅ FIXED: Generate robust lawyer-level analysis prompt
    const analysisPrompt = generateDeepLawyerLevelPrompt(
      fullTextContent, 
      validationResult.documentType, 
      validationResult.strategy,
      requestId
    );

    console.log(`🛠️ [${requestId}] Using FIXED DEEP LAWYER-LEVEL analysis strategy: ${validationResult.strategy} for ${validationResult.documentType} document`);

    let completion;
    try {
      completion = await Promise.race([
        makeRateLimitedGPT4Request(analysisPrompt, requestId, getOpenAI(), 3),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("OpenAI API timeout after 90s")), 90000)
        )
      ]);
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
          laymanSummary: result.laymanSummary || [],
          summary: result.summary || [],
          legalAssessment: result.legalAssessment || [],
          suggestions: result.suggestions || [],
          comparison: result.comparison || [],
          positiveAspects: result.positiveAspects || [],
          criticalIssues: result.criticalIssues || [],
          risiken: result.criticalIssues || [], // ✅ Alias für Frontend-Kompatibilität
          recommendations: result.recommendations || [],
          quickFacts: result.quickFacts || [],
          legalPulseHooks: result.legalPulseHooks || [],
          detailedLegalOpinion: result.detailedLegalOpinion || '', // ✅ NEU: Ausführliches Rechtsgutachten
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

        // 🆕 CALENDAR EVENTS GENERIEREN FÜR UPDATE
        try {
          const db = mongoClient.db("contract_ai");
          const updatedContract = await contractsCollection.findOne({ _id: existingContract._id });
          const events = await generateEventsForContract(db, updatedContract);
          console.log(`📅 Calendar Events regeneriert für ${updatedContract.name}: ${events.length} Events${updatedContract.isAutoRenewal ? ' (Auto-Renewal)' : ''}`);
        } catch (eventError) {
          console.warn(`⚠️ Calendar Events konnten nicht regeneriert werden:`, eventError.message);
        }

        // ⚡ NEW: LEGAL PULSE RISK ANALYSIS (Async Background Job) for existing contract
        // 🔐 NUR für Business/Enterprise User - Free User bekommen kein Legal Pulse
        // ✅ KORRIGIERT: Zentrale Funktion statt hardcoded Plan-Array
        const canAccessLegalPulse = isBusinessOrHigher(plan);

        if (canAccessLegalPulse) {
          (async () => {
            try {
              console.log(`⚡ [${requestId}] Starting Legal Pulse risk analysis for existing contract in background...`);

              const contractInfo = {
              name: existingContract.name,
              provider: extractedProvider?.displayName || 'Unknown',
              type: extractedContractType || validationResult.documentType || 'other', // ✅ FIXED: Use contract type (telecom, purchase, etc.) instead of document type
              startDate: extractedStartDate,
              expiryDate: extractedEndDate,
              userId: req.user.userId, // 💰 For cost tracking
              contractId: existingContract._id // 💰 For cost tracking
            };

            console.log(`📋 [${requestId}] Legal Pulse using contract type: "${contractInfo.type}" (extracted: ${extractedContractType || 'none'}, documentType: ${validationResult.documentType})`);

            const legalPulseAnalysis = await aiLegalPulse.analyzeFullContract(
              fullTextContent,
              contractInfo
            );

            // Update contract with Legal Pulse analysis
            await contractsCollection.updateOne(
              { _id: existingContract._id },
              {
                $set: {
                  legalPulse: legalPulseAnalysis,
                  legalPulseLastChecked: new Date()
                }
              }
            );

            console.log(`✅ [${requestId}] Legal Pulse risk analysis completed for existing contract ${existingContract._id} (Risk Score: ${legalPulseAnalysis.riskScore})`);
          } catch (analysisError) {
            console.error(`❌ [${requestId}] Legal Pulse risk analysis failed:`, analysisError.message);
            // Don't throw - this is a background job
          }
        })();
        } else {
          console.log(`⏭️ [${requestId}] Skipping Legal Pulse for existing contract - User plan "${plan}" does not include Legal Pulse`);
        }

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
                      const riskAssessment = clauseParser.assessClauseRisk(clause.text);
                      const analyzableCheck = clauseParser.detectNonAnalyzable(clause.text, clause.title);
                      return {
                        id: clause.id || `clause_pre_${allClauses.length + idx + 1}`,
                        number: clause.number || `${allClauses.length + idx + 1}`,
                        title: clause.title || null,
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
              laymanSummary: result.laymanSummary || [],
              summary: result.summary || [],
              legalAssessment: result.legalAssessment || [],
              suggestions: result.suggestions || [],
              comparison: result.comparison || [],
              positiveAspects: result.positiveAspects || [],
              criticalIssues: result.criticalIssues || [],
              risiken: result.criticalIssues || [], // ✅ Alias für Frontend-Kompatibilität
              recommendations: result.recommendations || [],
              quickFacts: result.quickFacts || [],
              legalPulseHooks: result.legalPulseHooks || [],
              detailedLegalOpinion: result.detailedLegalOpinion || '', // ✅ NEU: Ausführliches Rechtsgutachten
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
          const db = mongoClient.db("contract_ai");
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

        // ⚡ NEW: LEGAL PULSE RISK ANALYSIS (Async Background Job)
        // This runs in the background and updates the contract with full risk analysis
        // 🔐 NUR für Business/Enterprise User - Free User bekommen kein Legal Pulse
        // ✅ KORRIGIERT: Zentrale Funktion statt hardcoded Plan-Array
        const canAccessLegalPulseNew = isBusinessOrHigher(plan);

        if (canAccessLegalPulseNew) {
          (async () => {
            try {
              console.log(`⚡ [${requestId}] Starting Legal Pulse risk analysis in background...`);

              const contractInfo = {
                name: savedContract.name,
              provider: extractedProvider?.displayName || 'Unknown',
              type: extractedContractType || validationResult.documentType || 'other', // ✅ FIXED: Use contract type (telecom, purchase, etc.) instead of document type
              startDate: extractedStartDate,
              expiryDate: extractedEndDate,
              userId: req.user.userId, // 💰 For cost tracking
              contractId: savedContract._id // 💰 For cost tracking
            };

            console.log(`📋 [${requestId}] Legal Pulse using contract type: "${contractInfo.type}" (extracted: ${extractedContractType || 'none'}, documentType: ${validationResult.documentType})`);

            const legalPulseAnalysis = await aiLegalPulse.analyzeFullContract(
              fullTextContent,
              contractInfo
            );

            // Update contract with Legal Pulse analysis
            await contractsCollection.updateOne(
              { _id: savedContract._id },
              {
                $set: {
                  legalPulse: legalPulseAnalysis,
                  legalPulseLastChecked: new Date()
                }
              }
            );

            console.log(`✅ [${requestId}] Legal Pulse risk analysis completed for contract ${savedContract._id} (Risk Score: ${legalPulseAnalysis.riskScore})`);
          } catch (analysisError) {
            console.error(`❌ [${requestId}] Legal Pulse risk analysis failed:`, analysisError.message);
            // Don't throw - this is a background job
          }
        })();
        } else {
          console.log(`⏭️ [${requestId}] Skipping Legal Pulse for new contract - User plan "${plan}" does not include Legal Pulse`);
        }

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
                    const riskAssessment = clauseParser.assessClauseRisk(clause.text);
                    const analyzableCheck = clauseParser.detectNonAnalyzable(clause.text, clause.title);
                    return {
                      id: clause.id || `clause_pre_${allClauses.length + idx + 1}`,
                      number: clause.number || `${allClauses.length + idx + 1}`,
                      title: clause.title || null,
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

process.on('SIGTERM', async () => {
  console.log('🛠️ FIXED Enhanced DEEP Lawyer-Level Analysis service with GPT-4-Turbo and Auto-Renewal shutting down...');
  if (mongoClient) {
    await mongoClient.close();
  }
});

// ===== EXPORT FUNCTIONS FOR OTHER ROUTES =====
module.exports = router;
module.exports.generateDeepLawyerLevelPrompt = generateDeepLawyerLevelPrompt;
module.exports.getContractTypeAwareness = getContractTypeAwareness;
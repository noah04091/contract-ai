// 📁 backend/routes/analyze.js - PRODUCTION S3 INTEGRATION + SMART DOCUMENT ANALYSIS + JSON FIX
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const fsSync = require("fs");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");

const router = express.Router();

// ===== S3 INTEGRATION (AWS SDK v3) - UNCHANGED =====
let S3Client, HeadBucketCommand, GetObjectCommand, multerS3, s3Instance;
let S3_AVAILABLE = false;
let S3_CONFIGURED = false;
let S3_CONFIG_ERROR = null;

/**
 * 🛡️ BULLETPROOF S3 CONFIGURATION (AWS SDK v3)
 * Tries to configure S3, falls back to local if anything goes wrong
 */
const initializeS3 = () => {
  try {
    console.log("🔧 [S3] Initializing S3 configuration (AWS SDK v3)...");
    
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
    
    // Try to load AWS SDK v3 and multer-s3
    try {
      const { S3Client: _S3Client, HeadBucketCommand: _HeadBucketCommand, GetObjectCommand: _GetObjectCommand } = require("@aws-sdk/client-s3");
      multerS3 = require("multer-s3");
      S3Client = _S3Client;
      HeadBucketCommand = _HeadBucketCommand;
      GetObjectCommand = _GetObjectCommand;
      console.log("✅ [S3] AWS SDK v3 and multer-s3 loaded successfully");
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
    
    console.log("✅ [S3] AWS S3 Client v3 created successfully");
    console.log(`✅ [S3] Region: ${process.env.AWS_REGION}`);
    console.log(`✅ [S3] Bucket: ${process.env.S3_BUCKET_NAME}`);
    
    S3_CONFIGURED = true;
    S3_CONFIG_ERROR = null;
    
    // Test S3 connectivity (async, don't block startup)
    testS3Connectivity();
    
    return true;
    
  } catch (error) {
    console.error("❌ [S3] Configuration failed:", error.message);
    S3_CONFIGURED = false;
    S3_AVAILABLE = false;
    S3_CONFIG_ERROR = error.message;
    
    // Don't throw - fall back to local upload
    console.log("🔄 [S3] Falling back to LOCAL_UPLOAD mode");
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
    console.log("🧪 [S3] Testing bucket connectivity...");
    
    // Test bucket access with SDK v3
    const command = new HeadBucketCommand({ 
      Bucket: process.env.S3_BUCKET_NAME 
    });
    
    await s3Instance.send(command);
    
    console.log("✅ [S3] Bucket connectivity test successful");
    S3_AVAILABLE = true;
    return true;
    
  } catch (error) {
    console.error("❌ [S3] Bucket connectivity test failed:", error.message);
    S3_AVAILABLE = false;
    
    // Log helpful error messages
    if (error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403) {
      console.error("❌ [S3] Access denied - check IAM permissions");
    } else if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.error("❌ [S3] Bucket not found - check bucket name and region");
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
 * 🔄 DYNAMIC MULTER CONFIGURATION (AWS SDK v3) - UNCHANGED
 * Uses S3 if available, falls back to local storage
 */
const createUploadMiddleware = () => {
  // If S3 is configured and available, use S3 upload
  if (S3_CONFIGURED && S3_AVAILABLE && s3Instance && multerS3) {
    console.log("🚀 [UPLOAD] Using S3 upload configuration (AWS SDK v3)");
    
    return multer({
      storage: multerS3({
        s3: s3Instance,
        bucket: process.env.S3_BUCKET_NAME,
        acl: 'private', // Security: files are private by default
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
          cb(null, {
            userId: req.user?.userId || 'unknown',
            uploadedAt: new Date().toISOString(),
            originalName: file.originalname
          });
        },
        key: function (req, file, cb) {
          // Create organized S3 key structure
          const userId = req.user?.userId || 'anonymous';
          const timestamp = Date.now();
          const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const key = `contracts/${userId}/${timestamp}_${sanitizedFileName}`;
          
          console.log(`📁 [S3] Generated S3 key: ${key}`);
          cb(null, key);
        }
      }),
      limits: { 
        fileSize: 50 * 1024 * 1024 // 50MB limit
      },
      fileFilter: (req, file, cb) => {
        // Only allow PDF files
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed'), false);
        }
      }
    });
  } else {
    // Fall back to local disk storage
    console.log("🔄 [UPLOAD] Using LOCAL upload configuration (S3 not available)");
    
    const storage = multer.diskStorage({
      destination: UPLOAD_PATH,
      filename: (req, file, cb) => {
        const filename = Date.now() + path.extname(file.originalname);
        console.log(`📁 [LOCAL] Generated filename: ${filename}`);
        cb(null, filename);
      },
    });

    return multer({ 
      storage,
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed'), false);
        }
      }
    });
  }
};

/**
 * 🔄 DYNAMIC FILE READING (AWS SDK v3) - UNCHANGED
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

// ===== SMART DOCUMENT ANALYSIS PIPELINE - UNCHANGED =====

/**
 * 🎯 Enhanced Document Type Detection
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
    
    if (score > bestMatch.confidence && score >= pattern.confidence * 0.6) { // Lower threshold for better recognition
      bestMatch = { type, confidence: score };
    }
  }

  return bestMatch;
}

/**
 * 🧪 Content Quality Assessment
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
 * 🎨 Smart Analysis Strategy Selector
 * Determines the best analysis approach based on document type and quality
 */
function selectAnalysisStrategy(documentType, contentQuality, filename) {
  const strategies = {
    CONTRACT: {
      method: 'FULL_CONTRACT_ANALYSIS',
      requiresHighQuality: true,
      fallbackToGeneral: true,
      message: 'Vollständige Vertragsanalyse'
    },
    INVOICE: {
      method: 'FINANCIAL_ANALYSIS',
      requiresHighQuality: false,
      fallbackToGeneral: true,
      message: 'Rechnungsanalyse'
    },
    RECEIPT: {
      method: 'RECEIPT_ANALYSIS',
      requiresHighQuality: false,
      fallbackToGeneral: true,
      message: 'Beleganalyse'
    },
    FINANCIAL_DOCUMENT: {
      method: 'GENERAL_FINANCIAL_ANALYSIS',
      requiresHighQuality: false,
      fallbackToGeneral: true,
      message: 'Finanzielle Dokumentenanalyse'
    },
    TABLE_DOCUMENT: {
      method: 'TABULAR_ANALYSIS',
      requiresHighQuality: false,
      fallbackToGeneral: true,
      message: 'Tabellenanalyse'
    },
    UNKNOWN: {
      method: 'GENERAL_DOCUMENT_ANALYSIS',
      requiresHighQuality: false,
      fallbackToGeneral: false,
      message: 'Allgemeine Dokumentenanalyse'
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
 * 🔧 Enhanced JSON Response Validation - NEW
 * Handles different response structures from specialized prompts
 */
function validateAndNormalizeAIResponse(result, documentType, requestId) {
  console.log(`🔍 [${requestId}] Validating AI response for ${documentType}:`, Object.keys(result));
  
  // Ensure we have a summary
  if (!result.summary) {
    console.error(`❌ [${requestId}] Missing summary in AI response:`, result);
    throw new Error("AI response missing summary");
  }
  
  // Normalize the response structure to ensure compatibility
  const normalized = {
    summary: result.summary,
    legalAssessment: result.legalAssessment || result.financialAnalysis || result.transactionDetails || "Strukturierte Analyse durchgeführt",
    suggestions: result.suggestions || result.notes || result.categorization || "Keine spezifischen Empfehlungen",
    comparison: result.comparison || result.assessment || "Dokumentenspezifische Bewertung durchgeführt",
    contractScore: result.contractScore || calculateFallbackScore(result, documentType)
  };
  
  console.log(`✅ [${requestId}] AI response normalized successfully with score: ${normalized.contractScore}`);
  return normalized;
}

/**
 * 📊 Fallback Score Calculation - NEW
 * Calculates a reasonable score when contractScore is missing
 */
function calculateFallbackScore(result, documentType) {
  // Base scores by document type
  const baseScores = {
    'CONTRACT': 75,
    'INVOICE': 80,
    'RECEIPT': 85,
    'FINANCIAL_DOCUMENT': 70,
    'TABLE_DOCUMENT': 65,
    'UNKNOWN': 60
  };
  
  let score = baseScores[documentType] || 60;
  
  // Boost score if response is detailed
  if (result.transactionDetails || result.financialAnalysis) score += 5;
  if (result.categorization) score += 3;
  if (result.notes && result.notes.length > 50) score += 2;
  
  // Cap at reasonable maximum
  return Math.min(score, 90);
}

/**
 * 🎨 Generate Analysis Prompt Based on Document Type
 * Creates specialized prompts for different document types
 */
function generateAnalysisPrompt(text, documentType, strategy) {
  const basePrompt = `Du bist ein Experte für Dokumentenanalyse. Analysiere das folgende Dokument detailliert und strukturiert.`;
  
  const strategyPrompts = {
    FULL_CONTRACT_ANALYSIS: `
${basePrompt}

**VERTRAGSANALYSE:**
Analysiere diesen Vertrag detailliert und erstelle eine strukturierte Auswertung mit:

1. **Zusammenfassung** (2-3 Sätze): Was ist der Kerninhalt des Vertrags?
2. **Vertragsparteien**: Wer sind die beteiligten Parteien und ihre Rollen?
3. **Laufzeit und Kündigungsfristen**: Wie lange läuft der Vertrag und wie kann gekündigt werden?
4. **Wesentliche Verpflichtungen**: Was sind die Hauptpflichten beider Seiten?
5. **Zahlungsbedingungen**: Wie sind Zahlungen geregelt?
6. **Risikobewertung**: Welche rechtlichen Risiken bestehen?
7. **Optimierungsvorschläge**: Konkrete Verbesserungsempfehlungen
8. **Vertragsscore** (1-100): Gesamtbewertung der Vertragsqualität

Antworte im folgenden JSON-Format:
{
  "summary": "...",
  "legalAssessment": "...",
  "suggestions": "...",
  "comparison": "...",
  "contractScore": 87
}

**DOKUMENT:**
${text}`,

    FINANCIAL_ANALYSIS: `
${basePrompt}

**RECHNUNGSANALYSE:**
Analysiere diese Rechnung strukturiert und extrahiere:

1. **Zusammenfassung**: Art der Rechnung und Hauptinhalt
2. **Rechnungsdetails**: Aussteller, Empfänger, Nummer, Datum
3. **Finanzielle Bewertung**: Beträge, Steuern, Zahlungsbedingungen
4. **Besonderheiten**: Auffälligkeiten oder wichtige Hinweise
5. **Empfehlungen**: Hinweise zur Bearbeitung oder Archivierung

Antworte im folgenden JSON-Format:
{
  "summary": "...",
  "legalAssessment": "...",
  "suggestions": "...",
  "comparison": "...",
  "contractScore": 75
}

**DOKUMENT:**
${text}`,

    RECEIPT_ANALYSIS: `
${basePrompt}

**BELEGANALYSE:**
Analysiere diesen Beleg und gib eine strukturierte Auswertung:

1. **Zusammenfassung**: Art des Belegs und Zweck
2. **Transaktionsdetails**: Händler, Datum, Artikel/Dienstleistungen
3. **Finanzanalyse**: Beträge, Steuern, Zahlungsart
4. **Kategorisierung**: Geschäftliche Einordnung für Buchhaltung
5. **Hinweise**: Steuerliche Relevanz oder Besonderheiten

Antworte im folgenden JSON-Format:
{
  "summary": "...",
  "legalAssessment": "...",
  "suggestions": "...",
  "comparison": "...",
  "contractScore": 70
}

**DOKUMENT:**
${text}`,

    GENERAL_FINANCIAL_ANALYSIS: `
${basePrompt}

**FINANZIELLE DOKUMENTENANALYSE:**
Analysiere dieses finanzielle Dokument und erstelle eine Auswertung:

1. **Zusammenfassung**: Art und Zweck des Dokuments
2. **Finanzanalyse**: Wichtige Kennzahlen und Beträge
3. **Strukturanalyse**: Aufbau und Kategorien der Daten
4. **Erkenntnisse**: Trends, Auffälligkeiten oder wichtige Punkte
5. **Empfehlungen**: Handlungsempfehlungen oder weitere Schritte

Antworte im folgenden JSON-Format:
{
  "summary": "...",
  "legalAssessment": "...",
  "suggestions": "...",
  "comparison": "...",
  "contractScore": 65
}

**DOKUMENT:**
${text}`,

    TABULAR_ANALYSIS: `
${basePrompt}

**TABELLENANALYSE:**
Analysiere diese tabellarische Übersicht strukturiert:

1. **Zusammenfassung**: Zweck und Inhalt der Tabelle
2. **Strukturanalyse**: Aufbau, Spalten und Kategorien
3. **Datenanalyse**: Wichtige Werte, Summen und Trends
4. **Erkenntnisse**: Muster oder auffällige Datenpunkte
5. **Praktische Hinweise**: Nutzungsmöglichkeiten der Daten

Antworte im folgenden JSON-Format:
{
  "summary": "...",
  "legalAssessment": "...",
  "suggestions": "...",
  "comparison": "...",
  "contractScore": 60
}

**DOKUMENT:**
${text}`,

    GENERAL_DOCUMENT_ANALYSIS: `
${basePrompt}

**ALLGEMEINE DOKUMENTENANALYSE:**
Analysiere dieses Dokument und gib eine strukturierte Zusammenfassung:

1. **Zusammenfassung**: Art, Zweck und Hauptinhalt
2. **Strukturanalyse**: Aufbau und wichtige Abschnitte
3. **Inhaltsanalyse**: Kernaussagen und relevante Informationen
4. **Bewertung**: Qualität und Vollständigkeit des Dokuments
5. **Empfehlungen**: Weitere Schritte oder Nutzungsmöglichkeiten

Antworte im folgenden JSON-Format:
{
  "summary": "...",
  "legalAssessment": "...",
  "suggestions": "...",
  "comparison": "...",
  "contractScore": 55
}

**DOKUMENT:**
${text}`
  };

  return strategyPrompts[strategy] || strategyPrompts.GENERAL_DOCUMENT_ANALYSIS;
}

/**
 * 🔍 Enhanced PDF Content Validator and Analyzer
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
          '🔄 Konvertiere die PDF in ein durchsuchbares Format (z.B. mit Adobe Acrobat)',
          '📝 Öffne das Dokument in Word, das oft Text aus Scans erkennen kann',
          '🖨️ Erstelle eine neue PDF aus dem Originaldokument (falls verfügbar)',
          '🔍 Nutze ein Online-OCR-Tool (z.B. SmallPDF, PDF24) um Text zu extrahieren'
        ]
      };
    }

    // Get document properties
    const pageCount = pdfData?.numpages || 1;
    
    // Detect document type using new smart analysis
    const documentType = detectDocumentType(filename, pdfText, pageCount);
    console.log(`📋 [${requestId}] Document type detected: ${documentType.type} (confidence: ${documentType.confidence.toFixed(2)})`);
    
    // Assess content quality using new metrics
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
      "🔄 Convert the PDF to a searchable format (e.g. with Adobe Acrobat)",
      "📝 Open the document in Word, which can often recognize text from scans",
      "🖨️ Create a new PDF from the original document (if available)",
      "🔍 Use an online OCR tool (e.g. SmallPDF, PDF24) to extract text",
      "⚡ For automatic scan recognition: Upgrade to Premium with OCR support"
    ];
  } else if (hasLittleText) {
    message = `📄 This PDF contains very little readable text (${textQuality.characterCount || 0} characters). For meaningful contract analysis, we need more text content.`;
    suggestions = [
      "📖 Ensure the PDF is complete and not corrupted",
      "🔒 Check if the PDF is password protected or encrypted",
      "📝 If it's a scanned PDF, convert it to a text PDF",
      "📄 Upload a different version of the file (e.g. the original document)",
      "⚡ Try a different PDF file"
    ];
  } else if (isPossiblyProtected) {
    message = `🔒 This PDF appears to be password protected or encrypted and cannot be read.`;
    suggestions = [
      "🔓 Remove password protection and upload the PDF again",
      "📄 Export the document as a new, unprotected PDF",
      "📝 Convert the PDF to Word and export it again as PDF",
      "⚡ Try a different version of the file"
    ];
  } else {
    message = `🚫 This PDF file cannot be used for contract analysis.`;
    suggestions = [
      "📄 Check if the PDF file is complete and not corrupted",
      "🔄 Try a different version or format (DOC, DOCX)",
      "📝 Ensure the document contains sufficient text",
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
const extractTextFromPDFEnhanced = async (buffer, fileName, requestId, onProgress) => {
  console.log(`📖 [${requestId}] Starting enhanced PDF text extraction...`);
  console.log(`📄 [${requestId}] File: ${fileName}`);

  try {
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
      timeout: 30000,
      maxRetries: 2
    });
    console.log("🤖 OpenAI instance initialized");
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
 * 💾 ENHANCED CONTRACT SAVING (S3 COMPATIBLE) - UNCHANGED
 * Saves contract with appropriate upload info based on storage type
 */
async function saveContractWithUpload(userId, analysisData, fileInfo, pdfText, uploadInfo) {
  try {
    const contract = {
      userId: new ObjectId(userId),
      name: analysisData.name || fileInfo.originalname || "Unknown",
      laufzeit: analysisData.laufzeit || "Unknown",
      kuendigung: analysisData.kuendigung || "Unknown",
      expiryDate: analysisData.expiryDate || "",
      status: analysisData.status || "Active",
      uploadedAt: new Date(),
      createdAt: new Date(),
      
      filename: fileInfo.filename || fileInfo.key,
      originalname: fileInfo.originalname,
      filePath: uploadInfo.fileUrl,
      mimetype: fileInfo.mimetype,
      size: fileInfo.size,
      
      uploadType: uploadInfo.uploadType,
      
      // ✅ CRITICAL: Set s3Key at top level for frontend compatibility
      ...(uploadInfo.s3Info && {
        s3Key: uploadInfo.s3Info.key,
        s3Bucket: uploadInfo.s3Info.bucket,
        s3Location: uploadInfo.s3Info.location,
        s3ETag: uploadInfo.s3Info.etag
      }),
      
      extraRefs: {
        uploadType: uploadInfo.uploadType,
        ...(uploadInfo.s3Info && {
          s3Bucket: uploadInfo.s3Info.bucket,
          s3Key: uploadInfo.s3Info.key,
          s3Location: uploadInfo.s3Info.location,
          s3ETag: uploadInfo.s3Info.etag
        }),
        ...(uploadInfo.localInfo && {
          uploadPath: UPLOAD_PATH,
          serverPath: uploadInfo.localInfo.path
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
      s3Info: uploadInfo.s3Info ? 'present' : 'none'
    });

    const { insertedId } = await contractsCollection.insertOne(contract);
    console.log(`✅ [ANALYZE] Contract saved with ID: ${insertedId}, s3Key: ${contract.s3Key || 'none'}`);
    
    return { ...contract, _id: insertedId };
  } catch (error) {
    console.error("❌ [ANALYZE] Save error:", error);
    throw error;
  }
}

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
      
      console.log(`🤖 [${requestId}] GPT-4 request (attempt ${attempt}/${maxRetries})...`);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an experienced contract analyst with legal expertise." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });
      
      console.log(`✅ [${requestId}] GPT-4 request successful!`);
      return completion;
      
    } catch (error) {
      console.error(`❌ [${requestId}] GPT-4 error (attempt ${attempt}):`, error.message);
      
      if (error.status === 429) {
        if (attempt < maxRetries) {
          const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
          console.log(`⏳ [${requestId}] Rate limit reached. Waiting ${waitTime/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error(`GPT-4 rate limit reached. Please try again in a few minutes.`);
        }
      }
      
      throw error;
    }
  }
  
  throw new Error(`GPT-4 request failed after ${maxRetries} attempts.`);
};

// ===== MAIN ANALYZE ROUTE (S3 COMPATIBLE) - UNCHANGED =====
router.post("/", verifyToken, async (req, res, next) => {
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
    await handleAnalysisRequest(req, res);
  });
});

// ===== ENHANCED ANALYSIS REQUEST HANDLER - WITH JSON FIX =====
const handleAnalysisRequest = async (req, res) => {
  const requestId = Date.now().toString();
  
  console.log(`🧠 [${requestId}] Enhanced Smart Analysis request received:`, {
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

  // Get upload info to determine storage type
  const uploadInfo = getUploadInfo(req.file);
  
  console.log(`📄 [${requestId}] File info:`, {
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    key: req.file.key,
    location: req.file.location,
    uploadType: uploadInfo.uploadType,
    s3Key: uploadInfo.s3Info?.key || 'none'
  });

  try {
    const { analysisCollection, usersCollection: users, contractsCollection } = await getMongoCollections();
    console.log(`📊 [${requestId}] MongoDB collections available`);
    
    const user = await users.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      console.error(`❌ [${requestId}] User not found: ${req.user.userId}`);
      return res.status(404).json({
        success: false,
        message: "❌ User not found.",
        error: "USER_NOT_FOUND"
      });
    }

    const plan = user.subscriptionPlan || "free";
    const count = user.analysisCount ?? 0;

    let limit = 10;
    if (plan === "business") limit = 50;
    if (plan === "premium") limit = Infinity;

    console.log(`📊 [${requestId}] User limits: ${count}/${limit} (Plan: ${plan})`);

    if (count >= limit) {
      console.warn(`⚠️ [${requestId}] Analysis limit reached for user ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        message: "❌ Analysis limit reached. Please upgrade package.",
        error: "LIMIT_EXCEEDED",
        currentCount: count,
        limit: limit,
        plan: plan
      });
    }

    console.log(`📄 [${requestId}] Reading uploaded file (${uploadInfo.uploadType})...`);
    
    // Use dynamic file reading based on upload type
    const buffer = await readUploadedFile(req.file, requestId);
    console.log(`📄 [${requestId}] Buffer read: ${buffer.length} bytes`);
    
    const fileHash = calculateFileHash(buffer);
    console.log(`🔍 [${requestId}] File hash calculated: ${fileHash.substring(0, 12)}...`);

    let existingContract = null;
    if (crypto && contractsCollection) {
      try {
        existingContract = await checkForDuplicate(fileHash, req.user.userId);
        
        if (existingContract) {
          console.log(`🔄 [${requestId}] Duplicate found: ${existingContract._id}`);
          
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
            console.log(`🔄 [${requestId}] User chooses re-analysis for duplicate`);
          }
        }
      } catch (dupError) {
        console.warn(`⚠️ [${requestId}] Duplicate check failed:`, dupError.message);
      }
    } else {
      console.log(`⚠️ [${requestId}] Duplicate check skipped (not available)`);
    }

    // Parse PDF content first
    console.log(`📖 [${requestId}] Parsing PDF content...`);
    let pdfData;
    try {
      pdfData = await pdfParse(buffer);
      console.log(`📄 [${requestId}] PDF parsed: ${pdfData.numpages} pages, ${pdfData.text.length} characters`);
    } catch (error) {
      console.error(`❌ [${requestId}] PDF parsing error:`, error);
      return res.status(400).json({
        success: false,
        message: "📄 PDF-Datei konnte nicht verarbeitet werden",
        error: "PDF_PARSE_ERROR",
        details: "Die Datei scheint beschädigt oder kein gültiges PDF zu sein",
        requestId
      });
    }

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
    
    console.log(`🎯 [${requestId}] Document analysis successful:`, {
      documentType: validationResult.documentType,
      strategy: validationResult.strategy,
      confidence: Math.round(validationResult.confidence * 100),
      qualityScore: Math.round(validationResult.qualityScore * 100),
      textLength: fullTextContent.length,
      pages: validationResult.metrics.pageCount,
      uploadType: uploadInfo.uploadType,
      s3Key: uploadInfo.s3Info?.key || 'none'
    });

    // Generate specialized analysis prompt based on document type
    const analysisPrompt = generateAnalysisPrompt(
      fullTextContent, 
      validationResult.documentType, 
      validationResult.strategy
    );

    console.log(`🤖 [${requestId}] Using ${validationResult.strategy} for ${validationResult.documentType} document`);

    let completion;
    try {
      completion = await Promise.race([
        makeRateLimitedGPT4Request(analysisPrompt, requestId, getOpenAI()),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("OpenAI API timeout after 60s")), 60000)
        )
      ]);
    } catch (openaiError) {
      console.error(`❌ [${requestId}] OpenAI error:`, openaiError.message);
      throw new Error(`OpenAI API error: ${openaiError.message}`);
    }

    console.log(`✅ [${requestId}] OpenAI response received`);

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
      throw new Error("Error parsing AI response");
    }

    // NEW: Enhanced JSON validation with normalization
    try {
      result = validateAndNormalizeAIResponse(result, validationResult.documentType, requestId);
    } catch (validationError) {
      console.error(`❌ [${requestId}] AI response validation failed:`, validationError.message);
      throw new Error("Error validating AI response");
    }

    console.log(`📊 [${requestId}] Analysis successful, saving to DB...`);

    const analysisData = {
      userId: req.user.userId,
      contractName: req.file.originalname,
      createdAt: new Date(),
      requestId,
      fullText: fullTextContent,
      extractedText: fullTextContent,
      originalFileName: req.file.originalname,
      fileSize: buffer.length,
      uploadType: uploadInfo.uploadType,
      
      // Enhanced metadata from smart analysis
      documentType: validationResult.documentType,
      analysisStrategy: validationResult.strategy,
      confidence: validationResult.confidence,
      qualityScore: validationResult.qualityScore,
      analysisMessage: validationResult.analysisMessage,
      extractionMethod: 'smart-analysis-enhanced',
      extractionQuality: validationResult.qualityScore > 0.6 ? 'excellent' : validationResult.qualityScore > 0.4 ? 'good' : 'fair',
      pageCount: validationResult.metrics.pageCount,
      
      ...(uploadInfo.s3Info && {
        s3Info: uploadInfo.s3Info
      }),
      ...result,
    };

    let inserted;
    try {
      inserted = await analysisCollection.insertOne(analysisData);
      console.log(`✅ [${requestId}] Enhanced analysis saved: ${inserted.insertedId} (${validationResult.documentType}: ${validationResult.analysisMessage})`);
    } catch (dbError) {
      console.error(`❌ [${requestId}] DB insert error:`, dbError.message);
      throw new Error(`Database error while saving: ${dbError.message}`);
    }

    try {
      console.log(`💾 [${requestId}] Saving contract (${uploadInfo.uploadType})...`);

      if (existingContract && req.body.forceReanalyze === 'true') {
        console.log(`🔄 [${requestId}] Updating existing contract: ${existingContract._id}`);
        
        const updateData = {
          lastAnalyzed: new Date(),
          analysisId: inserted.insertedId,
          fullText: fullTextContent,
          content: fullTextContent,
          filePath: uploadInfo.fileUrl,
          filename: req.file.filename || req.file.key,
          uploadType: uploadInfo.uploadType,
          
          // Enhanced metadata
          documentType: validationResult.documentType,
          analysisStrategy: validationResult.strategy,
          confidence: validationResult.confidence,
          qualityScore: validationResult.qualityScore,
          extractionMethod: 'smart-analysis-enhanced',
          extractionQuality: analysisData.extractionQuality,
          analyzeCount: (existingContract.analyzeCount || 0) + 1
        };

        // Add s3Key at top level if S3 upload
        if (uploadInfo.s3Info) {
          updateData.s3Key = uploadInfo.s3Info.key;
          updateData.s3Bucket = uploadInfo.s3Info.bucket;
          updateData.s3Location = uploadInfo.s3Info.location;
          updateData.s3ETag = uploadInfo.s3Info.etag;
        }

        updateData.extraRefs = {
          uploadType: uploadInfo.uploadType,
          analysisId: inserted.insertedId,
          documentType: validationResult.documentType,
          analysisStrategy: validationResult.strategy,
          ...(uploadInfo.s3Info && {
            s3Bucket: uploadInfo.s3Info.bucket,
            s3Key: uploadInfo.s3Info.key,
            s3Location: uploadInfo.s3Info.location,
            s3ETag: uploadInfo.s3Info.etag
          }),
          ...(uploadInfo.localInfo && {
            uploadPath: UPLOAD_PATH,
            serverPath: uploadInfo.localInfo.path
          }),
          extractionMethod: 'smart-analysis-enhanced'
        };

        updateData.legalPulse = {
          riskScore: result.contractScore || null,
          riskSummary: result.summary || '',
          lastChecked: new Date(),
          lawInsights: [],
          marketSuggestions: []
        };
        
        await contractsCollection.updateOne(
          { _id: existingContract._id },
          { $set: updateData }
        );
        
        console.log(`✅ [${requestId}] Existing contract updated (${fullTextContent.length} characters) with enhanced analysis`);
      } else {
        const contractAnalysisData = {
          name: result.summary ? req.file.originalname : req.file.originalname,
          laufzeit: "Unknown",
          kuendigung: "Unknown",
          expiryDate: "",
          status: "Active"
        };

        const savedContract = await saveContractWithUpload(
          req.user.userId,
          contractAnalysisData,
          req.file,
          fullTextContent,
          uploadInfo
        );

        await contractsCollection.updateOne(
          { _id: savedContract._id },
          { 
            $set: {
              analysisId: inserted.insertedId,
              
              // Enhanced metadata
              documentType: validationResult.documentType,
              analysisStrategy: validationResult.strategy,
              confidence: validationResult.confidence,
              qualityScore: validationResult.qualityScore,
              extractionMethod: 'smart-analysis-enhanced',
              extractionQuality: analysisData.extractionQuality,
              
              'extraRefs.analysisId': inserted.insertedId,
              'extraRefs.documentType': validationResult.documentType,
              'extraRefs.analysisStrategy': validationResult.strategy,
              'extraRefs.extractionMethod': 'smart-analysis-enhanced'
            }
          }
        );

        console.log(`✅ [${requestId}] New contract saved: ${savedContract._id} with enhanced analysis (${validationResult.documentType})`);
      }
      
    } catch (saveError) {
      console.error(`❌ [${requestId}] Contract save error:`, saveError.message);
      console.warn(`⚠️ [${requestId}] Analysis was successful, but contract saving failed`);
    }

    try {
      await users.updateOne(
        { _id: user._id },
        { $inc: { analysisCount: 1 } }
      );
      console.log(`✅ [${requestId}] Analysis counter updated`);
    } catch (updateError) {
      console.warn(`⚠️ [${requestId}] Counter update error:`, updateError.message);
    }

    console.log(`🎉 [${requestId}] Enhanced Smart Analysis completely successful!`);

    const responseData = { 
      success: true,
      message: `${validationResult.analysisMessage} erfolgreich abgeschlossen`,
      requestId,
      uploadType: uploadInfo.uploadType,
      fileUrl: uploadInfo.fileUrl,
      
      // Enhanced response data
      documentType: validationResult.documentType,
      analysisStrategy: validationResult.strategy,
      confidence: Math.round(validationResult.confidence * 100),
      qualityScore: Math.round(validationResult.qualityScore * 100),
      analysisMessage: validationResult.analysisMessage,
      
      extractionInfo: {
        method: 'smart-analysis-enhanced',
        quality: analysisData.extractionQuality,
        charactersExtracted: fullTextContent.length,
        pageCount: validationResult.metrics.pageCount,
        hasTabularData: validationResult.metrics.hasTabularData,
        isStructured: validationResult.metrics.isStructured
      },
      
      ...(uploadInfo.s3Info && {
        s3Info: uploadInfo.s3Info
      }),
      
      ...result, 
      analysisId: inserted.insertedId,
      usage: {
        count: count + 1,
        limit: limit,
        plan: plan
      }
    };

    if (existingContract && req.body.forceReanalyze === 'true') {
      responseData.isReanalysis = true;
      responseData.originalContractId = existingContract._id;
      responseData.message = `${validationResult.analysisMessage} erfolgreich aktualisiert`;
    }

    res.json(responseData);

  } catch (error) {
    console.error(`❌ [${requestId}] Error in enhanced smart analysis:`, {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      userId: req.user?.userId,
      filename: req.file?.originalname,
      uploadType: uploadInfo.uploadType
    });
    
    let errorMessage = "Error during analysis.";
    let errorCode = "ANALYSIS_ERROR";
    
    if (error.message.includes("API Key")) {
      errorMessage = "AI service temporarily unavailable.";
      errorCode = "AI_SERVICE_ERROR";
    } else if (error.message.includes("Timeout")) {
      errorMessage = "Analysis timeout. Please try with a smaller file.";
      errorCode = "TIMEOUT_ERROR";
    } else if (error.message.includes("JSON") || error.message.includes("Parse")) {
      errorMessage = "Error in analysis processing.";
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
      uploadType: uploadInfo.uploadType,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// ✅ ENHANCED: Health Check with comprehensive S3 status
router.get("/health", async (req, res) => {
  // Re-test S3 connectivity for health check
  if (S3_CONFIGURED && s3Instance) {
    await testS3Connectivity();
  }

  const checks = {
    service: "Contract Analysis (Enhanced Smart Analysis + S3 - AWS SDK v3 + JSON Fix)",
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
      smartDocumentAnalysis: true,
      documentTypeDetection: true,
      qualityAssessment: true,
      specializedPrompts: true,
      enhancedLogging: true,
      jsonValidation: true
    },
    version: "enhanced-smart-analysis-v1.1-json-fix"
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
  console.log('🧠 Enhanced Smart Analysis service (with JSON fix) shutting down...');
  if (mongoClient) {
    await mongoClient.close();
  }
});

module.exports = router;
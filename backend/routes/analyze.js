// 📁 backend/routes/analyze.js - STABLE VERSION (dein Code + stabile Fixes)
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const fsSync = require("fs");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");
// ❌ ENTFERNT: const Tesseract = require('tesseract.js'); // OCR-Integration entfernt
// ❌ ENTFERNT: const Queue = require('bull'); // Async Processing entfernt  
// ❌ ENTFERNT: const redis = require('redis'); // Redis Support entfernt

const router = express.Router();

// ✅ CRITICAL FIX: Exact same UPLOAD_PATH as server.js
const UPLOAD_PATH = path.join(__dirname, "..", "uploads");

// ✅ CRITICAL FIX: Ensure uploads directory exists (same as server.js)
try {
  if (!fsSync.existsSync(UPLOAD_PATH)) {
    fsSync.mkdirSync(UPLOAD_PATH, { recursive: true });
    console.log(`📁 [ANALYZE] Upload-Ordner erstellt: ${UPLOAD_PATH}`);
  } else {
    console.log(`📁 [ANALYZE] Upload-Ordner existiert: ${UPLOAD_PATH}`);
  }
} catch (err) {
  console.error(`❌ [ANALYZE] Fehler beim Upload-Ordner:`, err);
}

// ✅ CRITICAL FIX: Exact same multer storage configuration as server.js
const storage = multer.diskStorage({
  destination: UPLOAD_PATH,
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname);
    console.log(`📁 [ANALYZE] Generiere Dateiname: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// ❌ ENTFERNT: Redis Queue Setup - verursacht Worker-Crashes
// Keine analysisQueue mehr

// ✅ FALLBACK: crypto nur importieren wenn verfügbar
let crypto;
try {
  crypto = require("crypto");
  console.log("✅ Crypto-Module erfolgreich geladen");
} catch (err) {
  console.warn("⚠️ Crypto-Module nicht verfügbar:", err.message);
  crypto = null;
}

// ✅ FALLBACK: saveContract mit try-catch
let saveContract;
try {
  saveContract = require("../services/saveContract");
  console.log("✅ SaveContract-Service erfolgreich geladen");
} catch (err) {
  console.warn("⚠️ SaveContract-Service nicht verfügbar:", err.message);
  saveContract = null;
}

// ✅ Rate Limiting für GPT-4
let lastGPT4Request = 0;
const GPT4_MIN_INTERVAL = 4000; // 4 Sekunden zwischen GPT-4 Requests

// ===== STABLE PROCESSING FUNCTIONS (OCR entfernt) =====

/**
 * ✅ Text-Qualitäts-Bewertung (verbessert)
 */
function assessTextQuality(text) {
  if (!text || text.length < 50) {
    return { 
      quality: 'none', 
      score: 0, 
      reason: 'Kein oder zu wenig Text gefunden',
      length: text ? text.length : 0,
      words: 0,
      lines: 0,
      suggestion: 'PDF möglicherweise gescannt - verwende ein durchsuchbares PDF oder Word-Dokument'
    };
  }
  
  const length = text.trim().length;
  const words = text.trim().split(/\s+/).filter(word => word.length > 2).length;
  const lines = text.split('\n').length;
  
  const letterCount = (text.match(/[a-zA-ZäöüÄÖÜß]/g) || []).length;
  const totalChars = text.length;
  const letterRatio = letterCount / totalChars;
  
  // Qualitätskriterien
  const hasMinLength = length >= 100;
  const hasMinWords = words >= 20;
  const hasStructure = lines > 5;
  const hasGermanText = /[äöüÄÖÜß]/.test(text) || /\b(der|die|das|und|ist|sind|haben|werden|mit|von|zu|auf|in|an|für|durch)\b/i.test(text);
  const hasGoodLetterRatio = letterRatio > 0.7;
  
  let score = 0;
  if (hasMinLength) score += 20;
  if (hasMinWords) score += 20;
  if (hasStructure) score += 20;
  if (hasGermanText) score += 20;
  if (hasGoodLetterRatio) score += 20;
  
  let quality, reason, suggestion;
  if (score >= 80) {
    quality = 'good';
    reason = 'Normaler, gut lesbarer Text';
    suggestion = null;
  } else if (score >= 60) {
    quality = 'fair';
    reason = 'Text erkannt, aber möglicherweise unvollständig';
    suggestion = 'Für beste Ergebnisse verwende ein durchsuchbares PDF';
  } else if (score >= 25) {
    quality = 'poor';
    reason = 'Wenig verwertbarer Text gefunden';
    suggestion = 'Verwende ein durchsuchbares PDF oder konvertiere das Dokument zu Word';
  } else {
    quality = 'none';
    reason = 'Kein verwertbarer Text gefunden';
    suggestion = 'PDF möglicherweise gescannt - verwende ein durchsuchbares PDF oder Word-Dokument';
  }
  
  return { 
    quality, 
    score, 
    reason, 
    length, 
    words, 
    lines,
    letterRatio: Math.round(letterRatio * 100),
    suggestion
  };
}

/**
 * ✅ STABLE PDF-TEXT-EXTRAKTION (ohne OCR, mit besseren Fehlermeldungen)
 */
async function extractTextFromPDFEnhanced(buffer, filePath, requestId, onProgress) {
  console.log(`📖 [${requestId}] Starte verbesserte PDF-Text-Extraktion (stabile Version)...`);
  
  let extractionResult = {
    text: '',
    fullText: '',
    method: 'none',
    quality: 'none',
    pageCount: 0,
    charactersExtracted: 0,
    wordCount: 0,
    ocrUsed: false, // ✅ Immer false in stabiler Version
    processingTime: 0,
    suggestion: null
  };
  
  const startTime = Date.now();
  
  try {
    // PDF-Text-Extraktion mit erweiterten Optionen
    console.log(`📄 [${requestId}] PDF-Text-Extraktion mit erweiterten Optionen...`);
    if (onProgress) onProgress(20);
    
    let pdfData;
    try {
      pdfData = await pdfParse(buffer, {
        max: 200000, // Mehr Text extrahieren
        normalizeWhitespace: true,
        disableCombineTextItems: false,
        // Weitere pdf-parse Optionen für bessere Extraktion
        version: 'v1.10.100'
      });
      
      extractionResult.pageCount = pdfData.numpages || 0;
      console.log(`📊 [${requestId}] PDF hat ${extractionResult.pageCount} Seiten`);
      
    } catch (pdfError) {
      console.warn(`⚠️ [${requestId}] PDF-Parse-Fehler:`, pdfError.message);
      
      if (pdfError.message.includes('password') || pdfError.message.includes('encrypted')) {
        throw new Error('PDF ist passwortgeschützt. Bitte entferne den Passwortschutz und versuche es erneut.');
      } else if (pdfError.message.includes('Invalid') || pdfError.message.includes('corrupt')) {
        throw new Error('PDF-Datei ist beschädigt oder korrupt. Bitte verwende eine andere Datei.');
      } else {
        throw new Error(`PDF-Verarbeitung fehlgeschlagen: ${pdfError.message}`);
      }
    }
    
    if (onProgress) onProgress(50);
    
    // Text-Qualität bewerten
    const initialText = pdfData.text || '';
    const qualityAssessment = assessTextQuality(initialText);
    
    console.log(`📊 [${requestId}] Text-Qualität: ${qualityAssessment.quality} (Score: ${qualityAssessment.score}) - ${qualityAssessment.reason}`);
    
    if (onProgress) onProgress(75);
    
    // Entscheiden basierend auf Qualität
    if (qualityAssessment.score >= 25) {
      // Text ist verwertbar
      extractionResult.text = initialText.slice(0, 4000); // Für GPT
      extractionResult.fullText = initialText; // Für Content-Tab
      extractionResult.method = 'pdf-extraction';
      extractionResult.quality = qualityAssessment.quality;
      extractionResult.charactersExtracted = initialText.length;
      extractionResult.wordCount = qualityAssessment.words;
      extractionResult.suggestion = qualityAssessment.suggestion;
      
      if (onProgress) onProgress(100);
      console.log(`✅ [${requestId}] PDF-Extraktion erfolgreich: ${extractionResult.charactersExtracted} Zeichen`);
      
    } else {
      // Text-Qualität ist unzureichend → Bessere Fehlermeldung
      console.log(`❌ [${requestId}] Text-Qualität unzureichend (Score: ${qualityAssessment.score})`);
      
      const suggestions = [
        "Verwende ein durchsuchbares PDF (Text-PDF statt Scan)",
        "Konvertiere das Dokument zu Word und exportiere als PDF", 
        "Stelle sicher, dass das PDF nicht passwortgeschützt ist",
        "Prüfe, ob das PDF beschädigt ist",
        "Für gescannte Dokumente: Verbessere die Scan-Qualität"
      ];
      
      const errorMessage = `PDF enthält keinen ausreichend lesbaren Text für eine Analyse. ` +
        `Qualität: ${qualityAssessment.reason} (${qualityAssessment.length} Zeichen, ${qualityAssessment.words} Wörter). ` +
        `Lösungsvorschläge: ${suggestions.join('; ')}`;
      
      throw new Error(errorMessage);
    }
    
    extractionResult.processingTime = Date.now() - startTime;
    if (onProgress) onProgress(100);
    
    console.log(`✅ [${requestId}] Text-Extraktion abgeschlossen:`, {
      method: extractionResult.method,
      quality: extractionResult.quality,
      characters: extractionResult.charactersExtracted,
      words: extractionResult.wordCount,
      ocrUsed: extractionResult.ocrUsed,
      processingTime: `${extractionResult.processingTime}ms`
    });
    
    return extractionResult;
    
  } catch (error) {
    console.error(`❌ [${requestId}] PDF-Extraktion fehlgeschlagen:`, error);
    
    // Benutzerfreundliche Fehlermeldungen
    if (error.message.includes('Lösungsvorschläge')) {
      // Unsere eigene detaillierte Fehlermeldung weiterleiten
      throw error;
    } else if (error.message.includes('passwortgeschützt')) {
      throw new Error('PDF ist passwortgeschützt. Bitte entferne den Passwortschutz und versuche es erneut.');
    } else if (error.message.includes('beschädigt')) {
      throw new Error('PDF-Datei ist beschädigt oder korrupt. Bitte verwende eine andere Datei.');
    } else {
      throw new Error(
        `Fehler beim Lesen der PDF-Datei. ` +
        `Das PDF könnte beschädigt, passwortgeschützt oder in einem ` +
        `unkompatiblen Format sein. Versuche ein anderes PDF oder ` +
        `konvertiere das Dokument neu.`
      );
    }
  }
}

// ===== EXISTING FUNCTIONS (unchanged) =====

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
      throw new Error("OpenAI API Key fehlt in Umgebungsvariablen");
    }
    openaiInstance = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 2
    });
    console.log("🤖 OpenAI-Instance initialisiert");
  }
  return openaiInstance;
};

// MongoDB Setup
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
    console.log("📊 MongoDB-Collections initialisiert");
  }
  return { analysisCollection, usersCollection, contractsCollection };
};

// Initialize on startup
(async () => {
  try {
    await getMongoCollections();
    console.log("📊 Verbunden mit allen Collections");
  } catch (err) {
    console.error("❌ MongoDB-Fehler (analyze.js):", err);
  }
})();

const calculateFileHash = (buffer) => {
  if (!crypto) {
    console.warn("⚠️ Crypto nicht verfügbar - verwende Fallback-Hash");
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  try {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  } catch (err) {
    console.warn("⚠️ Hash-Berechnung fehlgeschlagen:", err.message);
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

const checkForDuplicate = async (fileHash, userId) => {
  if (!crypto || !contractsCollection) {
    console.warn("⚠️ Dubletten-Check nicht verfügbar - überspringe");
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
    console.warn("⚠️ Dubletten-Check fehlgeschlagen:", error.message);
    return null;
  }
};

async function saveContractWithLocalUpload(userId, analysisData, fileInfo, pdfText) {
  try {
    const contract = {
      userId: new ObjectId(userId),
      name: analysisData.name || fileInfo.originalname || "Unbekannt",
      laufzeit: analysisData.laufzeit || "Unbekannt",
      kuendigung: analysisData.kuendigung || "Unbekannt",
      expiryDate: analysisData.expiryDate || "",
      status: analysisData.status || "Aktiv",
      uploadedAt: new Date(),
      createdAt: new Date(),
      
      filename: fileInfo.filename,
      originalname: fileInfo.originalname,
      filePath: `/uploads/${fileInfo.filename}`,
      mimetype: fileInfo.mimetype,
      size: fileInfo.size,
      
      uploadType: "LOCAL_UPLOAD",
      extraRefs: {
        uploadType: "LOCAL_UPLOAD",
        uploadPath: UPLOAD_PATH,
        serverPath: `/uploads/${fileInfo.filename}`,
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
      uploadPath: UPLOAD_PATH
    });

    const { insertedId } = await contractsCollection.insertOne(contract);
    console.log(`✅ [ANALYZE] Contract saved with ID: ${insertedId}`);
    
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
        console.log(`⏳ [${requestId}] Rate Limiting: Warte ${waitTime}ms vor GPT-4 Request...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      lastGPT4Request = Date.now();
      
      console.log(`🤖 [${requestId}] GPT-4 Request (Versuch ${attempt}/${maxRetries})...`);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Du bist ein erfahrener Vertragsanalyst mit juristischer Expertise." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });
      
      console.log(`✅ [${requestId}] GPT-4 Request erfolgreich!`);
      return completion;
      
    } catch (error) {
      console.error(`❌ [${requestId}] GPT-4 Fehler (Versuch ${attempt}):`, error.message);
      
      if (error.status === 429) {
        if (attempt < maxRetries) {
          const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
          console.log(`⏳ [${requestId}] Rate Limit erreicht. Warte ${waitTime/1000}s vor Retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error(`GPT-4 Rate Limit erreicht. Bitte versuche es in einigen Minuten erneut.`);
        }
      }
      
      throw error;
    }
  }
  
  throw new Error(`GPT-4 Request nach ${maxRetries} Versuchen fehlgeschlagen.`);
};

// ===== MAIN ANALYZE ROUTE (STABLE VERSION mit besseren Fehlermeldungen) =====
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  const requestId = Date.now().toString();
  
  console.log(`📊 [${requestId}] Stable Analyse-Request erhalten:`, {
    uploadType: "LOCAL_UPLOAD",
    hasFile: !!req.file,
    userId: req.user?.userId,
    uploadPath: UPLOAD_PATH,
    ocrAvailable: false // ✅ OCR ist in stabiler Version deaktiviert
  });

  if (!req.file) {
    console.error(`❌ [${requestId}] Keine Datei hochgeladen`);
    return res.status(400).json({ 
      success: false, 
      message: "Keine Datei hochgeladen" 
    });
  }

  try {
    console.log(`📄 [${requestId}] File info:`, {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      destination: req.file.destination,
      uploadPath: UPLOAD_PATH
    });

    const fileExists = checkFileExists(req.file.filename);
    if (!fileExists) {
      console.error(`❌ [${requestId}] Datei wurde nicht korrekt gespeichert:`, req.file.filename);
      return res.status(500).json({
        success: false,
        message: "Datei wurde nicht korrekt hochgeladen",
        debug: {
          expectedPath: path.join(UPLOAD_PATH, req.file.filename),
          uploadPath: UPLOAD_PATH,
          filename: req.file.filename
        }
      });
    }

    const { analysisCollection, usersCollection: users, contractsCollection } = await getMongoCollections();
    console.log(`📊 [${requestId}] MongoDB-Collections verfügbar`);
    
    const user = await users.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      console.error(`❌ [${requestId}] User nicht gefunden: ${req.user.userId}`);
      return res.status(404).json({
        success: false,
        message: "❌ Benutzer nicht gefunden.",
        error: "USER_NOT_FOUND"
      });
    }

    const plan = user.subscriptionPlan || "free";
    const count = user.analysisCount ?? 0;

    let limit = 10;
    if (plan === "business") limit = 50;
    if (plan === "premium") limit = Infinity;

    console.log(`📊 [${requestId}] User-Limits: ${count}/${limit} (Plan: ${plan})`);

    if (count >= limit) {
      console.warn(`⚠️ [${requestId}] Analyse-Limit erreicht für User ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        message: "❌ Analyse-Limit erreicht. Bitte Paket upgraden.",
        error: "LIMIT_EXCEEDED",
        currentCount: count,
        limit: limit,
        plan: plan
      });
    }

    console.log(`📄 [${requestId}] PDF wird lokal gelesen...`);
    
    const filePath = path.join(UPLOAD_PATH, req.file.filename);
    if (!fsSync.existsSync(filePath)) {
      throw new Error(`Datei nicht gefunden: ${filePath}`);
    }

    const buffer = await fs.readFile(filePath);
    console.log(`📄 [${requestId}] Buffer gelesen: ${buffer.length} bytes`);
    
    const fileHash = calculateFileHash(buffer);
    console.log(`🔍 [${requestId}] Datei-Hash berechnet: ${fileHash.substring(0, 12)}...`);

    let existingContract = null;
    if (crypto && contractsCollection) {
      try {
        existingContract = await checkForDuplicate(fileHash, req.user.userId);
        
        if (existingContract) {
          console.log(`🔄 [${requestId}] Duplikat gefunden: ${existingContract._id}`);
          
          const forceReanalyze = req.body.forceReanalyze === 'true';
          
          if (!forceReanalyze) {
            return res.status(409).json({
              success: false,
              duplicate: true,
              message: "📄 Dieser Vertrag wurde bereits hochgeladen.",
              error: "DUPLICATE_CONTRACT",
              contractId: existingContract._id,
              contractName: existingContract.name,
              uploadedAt: existingContract.createdAt,
              requestId,
              actions: {
                reanalyze: `Erneut analysieren und bestehende Analyse überschreiben`,
                viewExisting: `Bestehenden Vertrag öffnen`
              }
            });
          } else {
            console.log(`🔄 [${requestId}] Nutzer wählt Re-Analyse für Duplikat`);
          }
        }
      } catch (dupError) {
        console.warn(`⚠️ [${requestId}] Dubletten-Check fehlgeschlagen:`, dupError.message);
      }
    } else {
      console.log(`⚠️ [${requestId}] Dubletten-Check übersprungen (nicht verfügbar)`);
    }

    // ===== STABLE PDF-TEXT-EXTRAKTION (ohne OCR) =====
    console.log(`📖 [${requestId}] Verwende stabile PDF-Extraktion (ohne OCR)...`);
    
    const extractionResult = await extractTextFromPDFEnhanced(buffer, filePath, requestId);
    
    const fullTextContent = extractionResult.fullText;
    const contractText = extractionResult.text;
    
    console.log(`📊 [${requestId}] Extraktion erfolgreich:`, {
      method: extractionResult.method,
      quality: extractionResult.quality,
      ocrUsed: extractionResult.ocrUsed,
      textLength: fullTextContent.length,
      pages: extractionResult.pageCount,
      processingTime: extractionResult.processingTime
    });

    console.log(`🤖 [${requestId}] OpenAI-Anfrage wird gesendet...`);
    
    const openai = getOpenAI();

    const prompt = `
Du bist ein Vertragsanalyst. Analysiere den folgenden Vertrag:

${contractText}

Erstelle eine Analyse mit folgenden Punkten:
1. Eine kurze Zusammenfassung in 2–3 Sätzen.
2. Einschätzung der Rechtssicherheit.
3. Konkrete Optimierungsvorschläge.
4. Vergleichbare Verträge mit besseren Konditionen (wenn möglich).
5. Eine Contract Score Bewertung von 1 bis 100.

Antwort im folgenden JSON-Format:
{
  "summary": "...",
  "legalAssessment": "...",
  "suggestions": "...",
  "comparison": "...",
  "contractScore": 87
}`;

    let completion;
    try {
      completion = await Promise.race([
        makeRateLimitedGPT4Request(prompt, requestId, openai),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("OpenAI API Timeout nach 60s")), 60000)
        )
      ]);
    } catch (openaiError) {
      console.error(`❌ [${requestId}] OpenAI-Fehler:`, openaiError.message);
      throw new Error(`OpenAI API Fehler: ${openaiError.message}`);
    }

    console.log(`✅ [${requestId}] OpenAI-Response erhalten`);

    const aiMessage = completion.choices[0].message.content || "";
    const jsonStart = aiMessage.indexOf("{");
    const jsonEnd = aiMessage.lastIndexOf("}") + 1;
    
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      console.error(`❌ [${requestId}] Keine gültige JSON-Antwort:`, aiMessage.substring(0, 200));
      throw new Error("Keine gültige JSON-Antwort von OpenAI erhalten");
    }

    const jsonString = aiMessage.slice(jsonStart, jsonEnd);
    let result;
    
    try {
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error(`❌ [${requestId}] JSON-Parse-Fehler:`, parseError.message);
      throw new Error("Fehler beim Parsen der AI-Antwort");
    }

    if (!result.summary || !result.contractScore) {
      console.error(`❌ [${requestId}] Unvollständige AI-Response:`, result);
      throw new Error("Unvollständige Analyse-Antwort von OpenAI");
    }

    console.log(`📊 [${requestId}] Analyse erfolgreich, speichere in DB...`);

    const analysisData = {
      userId: req.user.userId,
      contractName: req.file.originalname,
      createdAt: new Date(),
      requestId,
      fullText: fullTextContent,
      extractedText: fullTextContent,
      originalFileName: req.file.originalname,
      fileSize: buffer.length,
      uploadType: "LOCAL_UPLOAD",
      extractionMethod: extractionResult.method,
      extractionQuality: extractionResult.quality,
      ocrUsed: extractionResult.ocrUsed,
      pageCount: extractionResult.pageCount,
      processingTime: extractionResult.processingTime,
      suggestion: extractionResult.suggestion,
      ...result,
    };

    let inserted;
    try {
      inserted = await analysisCollection.insertOne(analysisData);
      console.log(`✅ [${requestId}] Stable Analyse gespeichert: ${inserted.insertedId} (mit fullText: ${fullTextContent.length} Zeichen, OCR: ${extractionResult.ocrUsed})`);
    } catch (dbError) {
      console.error(`❌ [${requestId}] DB-Insert-Fehler:`, dbError.message);
      throw new Error(`Datenbank-Fehler beim Speichern: ${dbError.message}`);
    }

    try {
      console.log(`💾 [${requestId}] Speichere Vertrag (lokal ohne OCR)...`);

      if (existingContract && req.body.forceReanalyze === 'true') {
        console.log(`🔄 [${requestId}] Aktualisiere bestehenden Vertrag: ${existingContract._id}`);
        
        await contractsCollection.updateOne(
          { _id: existingContract._id },
          { 
            $set: {
              lastAnalyzed: new Date(),
              analysisId: inserted.insertedId,
              fullText: fullTextContent,
              content: fullTextContent,
              filePath: `/uploads/${req.file.filename}`,
              filename: req.file.filename,
              uploadType: "LOCAL_UPLOAD",
              extractionMethod: extractionResult.method,
              extractionQuality: extractionResult.quality,
              ocrUsed: extractionResult.ocrUsed,
              extraRefs: {
                uploadType: "LOCAL_UPLOAD",
                analysisId: inserted.insertedId,
                uploadPath: UPLOAD_PATH,
                serverPath: `/uploads/${req.file.filename}`,
                extractionMethod: extractionResult.method,
                ocrUsed: extractionResult.ocrUsed
              },
              legalPulse: {
                riskScore: result.contractScore || null,
                riskSummary: result.summary || '',
                lastChecked: new Date(),
                lawInsights: [],
                marketSuggestions: []
              },
              analyzeCount: (existingContract.analyzeCount || 0) + 1
            }
          }
        );
        
        console.log(`✅ [${requestId}] Bestehender Vertrag aktualisiert (${fullTextContent.length} Zeichen, OCR: ${extractionResult.ocrUsed})`);
      } else {
        const contractAnalysisData = {
          name: result.summary ? req.file.originalname : req.file.originalname,
          laufzeit: "Unbekannt",
          kuendigung: "Unbekannt",
          expiryDate: "",
          status: "Aktiv"
        };

        const savedContract = await saveContractWithLocalUpload(
          req.user.userId,
          contractAnalysisData,
          req.file,
          fullTextContent
        );

        await contractsCollection.updateOne(
          { _id: savedContract._id },
          { 
            $set: {
              analysisId: inserted.insertedId,
              extractionMethod: extractionResult.method,
              extractionQuality: extractionResult.quality,
              ocrUsed: extractionResult.ocrUsed,
              'extraRefs.analysisId': inserted.insertedId,
              'extraRefs.extractionMethod': extractionResult.method,
              'extraRefs.ocrUsed': extractionResult.ocrUsed
            }
          }
        );

        console.log(`✅ [${requestId}] Neuer Vertrag gespeichert: ${savedContract._id} mit analysisId: ${inserted.insertedId} (OCR: ${extractionResult.ocrUsed})`);
      }
      
    } catch (saveError) {
      console.error(`❌ [${requestId}] Vertrag-Speicher-Fehler:`, saveError.message);
      console.warn(`⚠️ [${requestId}] Analyse war erfolgreich, aber Vertrag-Speicherung fehlgeschlagen`);
    }

    try {
      await users.updateOne(
        { _id: user._id },
        { $inc: { analysisCount: 1 } }
      );
      console.log(`✅ [${requestId}] Analyse-Counter aktualisiert`);
    } catch (updateError) {
      console.warn(`⚠️ [${requestId}] Counter-Update-Fehler:`, updateError.message);
    }

    console.log(`✅ [${requestId}] Stable Analyse komplett erfolgreich`);

    const responseData = { 
      success: true,
      message: "Analyse erfolgreich abgeschlossen",
      requestId,
      uploadType: "LOCAL_UPLOAD",
      fileUrl: `/uploads/${req.file.filename}`,
      extractionInfo: {
        method: extractionResult.method,
        quality: extractionResult.quality,
        ocrUsed: extractionResult.ocrUsed,
        ocrAvailable: false, // ✅ OCR ist in stabiler Version deaktiviert
        processingTime: extractionResult.processingTime,
        charactersExtracted: extractionResult.charactersExtracted,
        pageCount: extractionResult.pageCount,
        suggestion: extractionResult.suggestion
      },
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
      responseData.message = "Analyse erfolgreich aktualisiert";
    }

    res.json(responseData);

  } catch (error) {
    console.error(`❌ [${requestId}] Fehler bei stabiler Analyse:`, {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      userId: req.user?.userId,
      filename: req.file?.originalname
    });
    
    let errorMessage = "Fehler bei der Analyse.";
    let errorCode = "ANALYSIS_ERROR";
    
    if (error.message.includes("API Key")) {
      errorMessage = "KI-Service vorübergehend nicht verfügbar.";
      errorCode = "AI_SERVICE_ERROR";
    } else if (error.message.includes("Timeout")) {
      errorMessage = "Analyse-Timeout. Bitte versuche es mit einer kleineren Datei.";
      errorCode = "TIMEOUT_ERROR";
    } else if (error.message.includes("JSON") || error.message.includes("Parse")) {
      errorMessage = "Fehler bei der Analyse-Verarbeitung.";
      errorCode = "PARSE_ERROR";
    } else if (error.message.includes("PDF") || error.message.includes("Datei") || error.message.includes("passwortgeschützt") || error.message.includes("Lösungsvorschläge")) {
      errorMessage = error.message;
      errorCode = "PDF_ERROR";
    } else if (error.message.includes("Datenbank") || error.message.includes("MongoDB")) {
      errorMessage = "Datenbank-Fehler. Bitte versuche es erneut.";
      errorCode = "DATABASE_ERROR";
    } else if (error.message.includes("OpenAI") || error.message.includes("Rate Limit")) {
      errorMessage = "KI-Analyse-Service vorübergehend nicht verfügbar.";
      errorCode = "AI_SERVICE_ERROR";
    } else if (error.message.includes("Nicht genügend Text")) {
      errorMessage = error.message;
      errorCode = "INSUFFICIENT_TEXT";
    }

    res.status(500).json({ 
      success: false,
      message: errorMessage,
      error: errorCode,
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== OTHER ROUTES (unchanged) =====

router.get("/history", verifyToken, async (req, res) => {
  const requestId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`📚 [${requestId}] Analyse-Historie angefordert für User: ${req.user.userId}`);
    
    const { analysisCollection } = await getMongoCollections();
    
    const history = await analysisCollection
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    console.log(`📚 [${requestId}] ${history.length} Analyse-Einträge gefunden`);

    res.json({
      success: true,
      requestId,
      history: history,
      count: history.length
    });

  } catch (err) {
    console.error(`❌ [${requestId}] Fehler beim Abrufen der Analyse-Historie:`, err);
    res.status(500).json({ 
      success: false,
      message: "Fehler beim Abrufen der Historie.",
      error: "HISTORY_ERROR",
      requestId
    });
  }
});

// ✅ UPDATED: Health Check für stabile Version
router.get("/health", async (req, res) => {
  const checks = {
    service: "Contract Analysis (Local Upload - Stable)", // ✅ Updated
    status: "online",
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    mongoConnected: false,
    uploadsPath: fsSync.existsSync(UPLOAD_PATH),
    uploadPath: UPLOAD_PATH,
    uploadType: "LOCAL_UPLOAD",
    s3Integration: "DISABLED (AWS SDK Conflict)",
    cryptoAvailable: !!crypto,
    saveContractAvailable: !!saveContract,
    ocrAvailable: false, // ✅ OCR ist in stabiler Version deaktiviert
    tesseractLoaded: false, // ✅ Tesseract ist entfernt
    queueAvailable: false, // ✅ Queue ist entfernt
    version: "stable-no-ocr" // ✅ Version-Info
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
  console.log('📊 Analyze service (stable) shutting down...');
  if (mongoClient) {
    await mongoClient.close();
  }
});

module.exports = router;
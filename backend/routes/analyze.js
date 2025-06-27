// 📁 backend/routes/analyze.js - STABLE VERSION (dein Code + bessere PDF-Fehlermeldungen)
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

// ===== IMPROVED PROCESSING FUNCTIONS (mit besseren Fehlermeldungen) =====

/**
 * ✅ VERBESSERTE Text-Qualitäts-Bewertung mit detaillierter Analyse
 */
const assessTextQuality = (text, fileName = '') => {
  if (!text) {
    return {
      level: 'none',
      score: 0,
      reason: 'Kein Text extrahiert',
      characterCount: 0,
      wordCount: 0
    };
  }

  const cleanText = text.replace(/\s+/g, ' ').trim();
  const characterCount = cleanText.length;
  const wordCount = cleanText.split(' ').filter(word => word.length > 0).length;
  
  // ✅ Verbesserte Qualitätsbewertung
  let level, score, reason;
  
  if (characterCount === 0) {
    level = 'none';
    score = 0;
    reason = 'Keine Textdaten gefunden';
  } else if (characterCount < 50) {
    level = 'none';
    score = characterCount;
    reason = `Zu wenig Text gefunden (${characterCount} Zeichen, ${wordCount} Wörter)`;
  } else if (characterCount < 200) {
    level = 'poor';
    score = Math.min(characterCount / 2, 100);
    reason = `Sehr wenig Text gefunden (${characterCount} Zeichen, ${wordCount} Wörter)`;
  } else if (characterCount < 500) {
    level = 'fair';
    score = Math.min(50 + (characterCount - 200) / 6, 100);
    reason = `Wenig Text gefunden (${characterCount} Zeichen, ${wordCount} Wörter)`;
  } else if (characterCount < 2000) {
    level = 'good';
    score = Math.min(70 + (characterCount - 500) / 50, 100);
    reason = `Ausreichend Text gefunden (${characterCount} Zeichen, ${wordCount} Wörter)`;
  } else {
    level = 'excellent';
    score = Math.min(90 + (characterCount - 2000) / 200, 100);
    reason = `Viel Text gefunden (${characterCount} Zeichen, ${wordCount} Wörter)`;
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

/**
 * ✅ NEU: Benutzerfreundliche PDF-Fehlermeldungen erstellen
 */
const createUserFriendlyPDFError = (textQuality, fileName, pages) => {
  const isScanned = textQuality.score === 0 && pages > 0;
  const hasLittleText = textQuality.score > 0 && textQuality.score < 20;
  const isPossiblyProtected = textQuality.reason?.includes('password') || textQuality.reason?.includes('encryption');
  
  let message = "";
  let suggestions = [];
  
  if (isScanned) {
    // 📸 Gescannte PDF (nur Bilddaten)
    message = `📸 Diese PDF scheint gescannt zu sein und enthält nur Bilddaten, die wir aktuell nicht analysieren können.`;
    suggestions = [
      "🔄 Konvertiere die PDF zu einem durchsuchbaren Format (z.B. mit Adobe Acrobat)",
      "📝 Öffne das Dokument in Word, das kann oft Text aus Scans erkennen",
      "🖨️ Erstelle eine neue PDF aus dem Original-Dokument (falls verfügbar)",
      "🔍 Nutze ein Online-OCR-Tool (z.B. SmallPDF, PDF24) um Text zu extrahieren",
      "⚡ Für automatische Scan-Erkennung: Upgrade auf Premium mit OCR-Support"
    ];
  } else if (hasLittleText) {
    // 📄 Wenig lesbarer Text
    message = `📄 Diese PDF enthält nur sehr wenig lesbaren Text (${textQuality.characterCount || 0} Zeichen). Für eine sinnvolle Vertragsanalyse benötigen wir mehr Textinhalt.`;
    suggestions = [
      "📖 Stelle sicher, dass die PDF vollständig und nicht beschädigt ist",
      "🔒 Prüfe ob die PDF passwortgeschützt oder verschlüsselt ist",
      "📝 Falls es eine gescannte PDF ist, konvertiere sie zu einem Text-PDF",
      "📄 Lade eine andere Version der Datei hoch (z.B. das Original-Dokument)",
      "⚡ Probiere eine andere PDF-Datei aus"
    ];
  } else if (isPossiblyProtected) {
    // 🔒 Passwortgeschützt oder verschlüsselt
    message = `🔒 Diese PDF scheint passwortgeschützt oder verschlüsselt zu sein und kann nicht gelesen werden.`;
    suggestions = [
      "🔓 Entferne den Passwortschutz und lade die PDF erneut hoch",
      "📄 Exportiere das Dokument als neue, ungeschützte PDF",
      "📝 Konvertiere die PDF zu Word und exportiere sie erneut als PDF",
      "⚡ Probiere eine andere Version der Datei aus"
    ];
  } else {
    // 🚫 Allgemeiner Fehler
    message = `🚫 Diese PDF-Datei kann leider nicht für eine Vertragsanalyse verwendet werden.`;
    suggestions = [
      "📄 Prüfe ob die PDF-Datei vollständig und nicht beschädigt ist",
      "🔄 Versuche eine andere Version oder ein anderes Format (DOC, DOCX)",
      "📝 Stelle sicher, dass das Dokument ausreichend Text enthält",
      "🔒 Prüfe ob die PDF passwortgeschützt ist",
      "⚡ Probiere eine andere PDF-Datei aus"
    ];
  }
  
  return {
    message,
    suggestions,
    type: isScanned ? 'scanned' : hasLittleText ? 'little_text' : 'other'
  };
};

/**
 * ✅ VERBESSERTE PDF-TEXT-EXTRAKTION (mit benutzerfreundlichen Fehlermeldungen)
 */
const extractTextFromPDFEnhanced = async (buffer, fileName, requestId, onProgress) => {
  console.log(`📖 [${requestId}] Starte verbesserte PDF-Text-Extraktion...`);
  console.log(`📄 [${requestId}] Datei: ${fileName}`);

  try {
    // ✅ Schritt 1: Normale PDF-Text-Extraktion mit erweiterten Optionen
    console.log(`📄 [${requestId}] Schritt 1: Normale PDF-Text-Extraktion...`);
    
    const pdfOptions = {
      normalizeWhitespace: true,
      disableCombineTextItems: false,
      max: 0, // Alle Seiten
      version: 'v1.10.100'
    };

    const data = await pdfParse(buffer, pdfOptions);
    
    console.log(`📊 [${requestId}] PDF hat ${data.numpages} Seiten`);
    console.log(`📊 [${requestId}] Roher Text: ${data.text?.length || 0} Zeichen`);

    // ✅ Schritt 2: Text-Qualitäts-Bewertung mit detaillierter Analyse
    const textQuality = assessTextQuality(data.text || '', fileName);
    console.log(`📊 [${requestId}] Text-Qualität: ${textQuality.level} (Score: ${textQuality.score}) - ${textQuality.reason}`);

    // ✅ Schritt 3: Benutzerfreundliche Behandlung basierend auf Qualität
    if (textQuality.level === 'good' || textQuality.level === 'fair') {
      console.log(`✅ [${requestId}] PDF-Text-Extraktion erfolgreich: ${data.text.length} Zeichen`);
      return {
        success: true,
        text: data.text,
        quality: textQuality,
        pages: data.numpages,
        extractionMethod: 'pdf-parse'
      };
    } else {
      // ✅ VERBESSERUNG: Benutzerfreundliche Fehlermeldung statt technischem Fehler
      console.log(`❌ [${requestId}] Text-Qualität unzureichend für Analyse`);
      
      // 🎯 Erstelle hilfreiche, spezifische Fehlermeldung
      const userFriendlyError = createUserFriendlyPDFError(textQuality, fileName, data.numpages);
      
      return {
        success: false,
        error: userFriendlyError.message,
        errorType: 'unreadable_pdf',
        quality: textQuality,
        pages: data.numpages,
        suggestions: userFriendlyError.suggestions,
        isUserError: true // ⭐ Kennzeichnet als User-Problem, nicht System-Fehler
      };
    }

  } catch (error) {
    console.error(`❌ [${requestId}] PDF-Parse-Fehler:`, error.message);
    
    // ✅ VERBESSERUNG: Auch hier benutzerfreundliche Fehlermeldung
    const userFriendlyError = createUserFriendlyPDFError(
      { level: 'none', score: 0, reason: 'PDF-Verarbeitungsfehler' }, 
      fileName, 
      0
    );
    
    return {
      success: false,
      error: userFriendlyError.message,
      errorType: 'pdf_processing_error',
      suggestions: userFriendlyError.suggestions,
      isUserError: true,
      technicalError: error.message // Für Debugging
    };
  }
};

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
              existingContract: existingContract, // ✅ VERBESSERUNG: Vollständige Contract-Info für Frontend
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

    // ===== VERBESSERTE PDF-TEXT-EXTRAKTION (mit benutzerfreundlichen Fehlermeldungen) =====
    console.log(`📖 [${requestId}] Verwende verbesserte PDF-Extraktion...`);
    
    const extractionResult = await extractTextFromPDFEnhanced(buffer, req.file.originalname, requestId);
    
    // ✅ VERBESSERUNG: Check ob Extraktion erfolgreich war
    if (!extractionResult.success) {
      console.log(`❌ [${requestId}] PDF-Extraktion fehlgeschlagen mit benutzerfreundlicher Meldung`);
      
      return res.status(400).json({
        success: false,
        message: extractionResult.error,
        error: extractionResult.errorType,
        suggestions: extractionResult.suggestions,
        quality: extractionResult.quality,
        pages: extractionResult.pages,
        isUserError: extractionResult.isUserError,
        requestId,
        technicalError: extractionResult.technicalError
      });
    }
    
    const fullTextContent = extractionResult.text;
    const contractText = extractionResult.text;
    
    console.log(`📊 [${requestId}] Extraktion erfolgreich:`, {
      method: extractionResult.extractionMethod,
      quality: extractionResult.quality,
      textLength: fullTextContent.length,
      pages: extractionResult.pages
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
      extractionMethod: extractionResult.extractionMethod,
      extractionQuality: extractionResult.quality,
      pageCount: extractionResult.pages,
      ...result,
    };

    let inserted;
    try {
      inserted = await analysisCollection.insertOne(analysisData);
      console.log(`✅ [${requestId}] Stable Analyse gespeichert: ${inserted.insertedId} (mit fullText: ${fullTextContent.length} Zeichen)`);
    } catch (dbError) {
      console.error(`❌ [${requestId}] DB-Insert-Fehler:`, dbError.message);
      throw new Error(`Datenbank-Fehler beim Speichern: ${dbError.message}`);
    }

    try {
      console.log(`💾 [${requestId}] Speichere Vertrag (lokal)...`);

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
              extractionMethod: extractionResult.extractionMethod,
              extractionQuality: extractionResult.quality,
              extraRefs: {
                uploadType: "LOCAL_UPLOAD",
                analysisId: inserted.insertedId,
                uploadPath: UPLOAD_PATH,
                serverPath: `/uploads/${req.file.filename}`,
                extractionMethod: extractionResult.extractionMethod
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
        
        console.log(`✅ [${requestId}] Bestehender Vertrag aktualisiert (${fullTextContent.length} Zeichen)`);
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
              extractionMethod: extractionResult.extractionMethod,
              extractionQuality: extractionResult.quality,
              'extraRefs.analysisId': inserted.insertedId,
              'extraRefs.extractionMethod': extractionResult.extractionMethod
            }
          }
        );

        console.log(`✅ [${requestId}] Neuer Vertrag gespeichert: ${savedContract._id} mit analysisId: ${inserted.insertedId}`);
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
        method: extractionResult.extractionMethod,
        quality: extractionResult.quality,
        charactersExtracted: fullTextContent.length,
        pageCount: extractionResult.pages
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
    } else if (error.message.includes("PDF") || error.message.includes("Datei") || error.message.includes("passwortgeschützt") || error.message.includes("📸") || error.message.includes("📄") || error.message.includes("🔒")) {
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
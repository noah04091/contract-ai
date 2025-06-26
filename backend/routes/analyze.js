// 📁 backend/routes/analyze.js - LIGHTWEIGHT: Bessere PDF-Verarbeitung ohne OCR (für Render-Test)
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

// ✅ CRITICAL FIX: Exact same UPLOAD_PATH as server.js
const UPLOAD_PATH = path.join(__dirname, "..", "uploads"); // ✅ ABSOLUTE PATH to backend/uploads

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
  destination: UPLOAD_PATH, // ✅ SAME ABSOLUTE PATH AS SERVER.JS
  filename: (req, file, cb) => {
    // ✅ SAME NAMING PATTERN AS SERVER.JS
    const filename = Date.now() + path.extname(file.originalname);
    console.log(`📁 [ANALYZE] Generiere Dateiname: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({ 
  storage, // ✅ USE STORAGE CONFIG INSTEAD OF DEST
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

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

// ✅ NEU: Rate Limiting für GPT-4
let lastGPT4Request = 0;
const GPT4_MIN_INTERVAL = 4000; // 4 Sekunden zwischen GPT-4 Requests

// ===== NEUE FUNKTIONEN FÜR VERBESSERTE PDF-VERARBEITUNG (OHNE OCR) =====

/**
 * ✅ NEU: Prüft die Qualität des extrahierten PDF-Texts
 */
function assessTextQuality(text) {
  if (!text || text.length < 50) {
    return { 
      quality: 'none', 
      score: 0, 
      reason: 'Kein oder zu wenig Text gefunden',
      suggestion: 'PDF möglicherweise gescannt - verwende ein durchsuchbares PDF oder Word-Dokument'
    };
  }
  
  // Verhältnis von Buchstaben zu Sonderzeichen
  const letterCount = (text.match(/[a-zA-ZäöüÄÖÜß]/g) || []).length;
  const totalChars = text.length;
  const letterRatio = letterCount / totalChars;
  
  // Wörter zählen
  const wordCount = text.split(/\s+/).filter(word => word.length > 2).length;
  
  if (letterRatio > 0.7 && wordCount > 20) {
    return { 
      quality: 'good', 
      score: 95, 
      reason: 'Normaler, gut lesbarer Text',
      suggestion: null
    };
  } else if (letterRatio > 0.4 && wordCount > 10) {
    return { 
      quality: 'fair', 
      score: 60, 
      reason: 'Möglicherweise OCR-Text oder schlechte Scan-Qualität',
      suggestion: 'Für beste Ergebnisse verwende ein durchsuchbares PDF'
    };
  } else if (wordCount > 5) {
    return { 
      quality: 'poor', 
      score: 30, 
      reason: 'Wenig verwertbarer Text, hauptsächlich Symbole',
      suggestion: 'PDF-Qualität verbessern oder Word-Dokument verwenden'
    };
  } else {
    return { 
      quality: 'none', 
      score: 0, 
      reason: 'Kein verwertbarer Text gefunden',
      suggestion: 'Verwende ein durchsuchbares PDF, Word-Dokument oder bessere Scan-Qualität'
    };
  }
}

/**
 * ✅ NEU: VERBESSERTE PDF-TEXT-EXTRAKTION (ohne OCR, für Render-Kompatibilität)
 */
async function extractTextFromPDFEnhanced(buffer, filePath, requestId) {
  console.log(`📖 [${requestId}] Starte verbesserte PDF-Text-Extraktion (ohne OCR)...`);
  
  let extractionResult = {
    text: '',
    fullText: '',
    method: 'none',
    quality: 'none',
    pageCount: 0,
    charactersExtracted: 0,
    wordCount: 0,
    ocrAvailable: false, // ✅ OCR nicht verfügbar in dieser Version
    processingTime: 0,
    suggestion: null
  };
  
  const startTime = Date.now();
  
  try {
    // SCHRITT 1: Erweiterte PDF-Text-Extraktion
    console.log(`📄 [${requestId}] PDF-Text-Extraktion mit erweiterten Optionen...`);
    
    let pdfData;
    try {
      // ✅ Verbesserte PDF-Parse-Optionen
      pdfData = await pdfParse(buffer, {
        max: 200000, // ✅ Mehr Text extrahieren
        normalizeWhitespace: true,
        disableCombineTextItems: false,
        // ✅ Zusätzliche Optionen für bessere Extraktion
        version: 'v1.10.100',
        verbosity: 0
      });
      
      extractionResult.pageCount = pdfData.numpages || 0;
      console.log(`📊 [${requestId}] PDF hat ${extractionResult.pageCount} Seiten`);
      
    } catch (pdfError) {
      console.warn(`⚠️ [${requestId}] PDF-Parse-Fehler:`, pdfError.message);
      throw new Error(`PDF-Verarbeitung fehlgeschlagen: ${pdfError.message}`);
    }
    
    // SCHRITT 2: Text-Qualität bewerten
    const extractedText = pdfData.text || '';
    const qualityAssessment = assessTextQuality(extractedText);
    
    console.log(`📊 [${requestId}] Text-Qualität: ${qualityAssessment.quality} (Score: ${qualityAssessment.score}) - ${qualityAssessment.reason}`);
    
    // SCHRITT 3: Text verarbeiten
    if (qualityAssessment.quality === 'good' || qualityAssessment.quality === 'fair') {
      // Gute oder akzeptable Qualität
      extractionResult.text = extractedText.slice(0, 4000); // Für GPT
      extractionResult.fullText = extractedText; // Für Content-Tab
      extractionResult.method = 'pdf-extraction-enhanced';
      extractionResult.quality = qualityAssessment.quality;
      extractionResult.charactersExtracted = extractedText.length;
      extractionResult.wordCount = extractedText.split(/\s+/).filter(w => w.length > 2).length;
      
      console.log(`✅ [${requestId}] PDF-Extraktion erfolgreich: ${extractionResult.charactersExtracted} Zeichen`);
      
    } else if (qualityAssessment.quality === 'poor' && extractedText.length > 100) {
      // Schlechte Qualität, aber versuchen wir es trotzdem
      extractionResult.text = extractedText.slice(0, 4000);
      extractionResult.fullText = extractedText;
      extractionResult.method = 'pdf-extraction-poor';
      extractionResult.quality = 'poor';
      extractionResult.charactersExtracted = extractedText.length;
      extractionResult.wordCount = extractedText.split(/\s+/).filter(w => w.length > 2).length;
      extractionResult.suggestion = qualityAssessment.suggestion;
      
      console.log(`⚠️ [${requestId}] Schlechte PDF-Text-Qualität, aber verwertbar: ${extractionResult.charactersExtracted} Zeichen`);
      
    } else {
      // Keine verwertbaren Inhalte gefunden
      extractionResult.suggestion = qualityAssessment.suggestion;
      
      throw new Error(
        `PDF enthält keinen ausreichend lesbaren Text für eine Analyse. ` +
        `${qualityAssessment.reason}. ` +
        `Lösungsvorschläge: ${qualityAssessment.suggestion}`
      );
    }
    
    // SCHRITT 4: Finale Validierung
    if (!extractionResult.text || extractionResult.text.trim().length < 30) {
      throw new Error(
        `Nicht genügend Text für eine zuverlässige Analyse gefunden. ` +
        `Lösungsvorschläge: ${extractionResult.suggestion || 'PDF-Qualität verbessern oder Word-Dokument verwenden'}`
      );
    }
    
    extractionResult.processingTime = Date.now() - startTime;
    
    console.log(`✅ [${requestId}] Text-Extraktion abgeschlossen:`, {
      method: extractionResult.method,
      quality: extractionResult.quality,
      characters: extractionResult.charactersExtracted,
      words: extractionResult.wordCount,
      pages: extractionResult.pageCount,
      processingTime: `${extractionResult.processingTime}ms`
    });
    
    return extractionResult;
    
  } catch (error) {
    console.error(`❌ [${requestId}] Verbesserte PDF-Extraktion fehlgeschlagen:`, error);
    
    // Benutzerfreundliche Fehlermeldungen
    if (error.message.includes('passwortgeschützt')) {
      throw new Error('PDF ist passwortgeschützt. Bitte entferne den Passwortschutz und versuche es erneut.');
    } else if (error.message.includes('beschädigt')) {
      throw new Error('PDF-Datei ist beschädigt oder korrupt. Bitte verwende eine andere Datei.');
    } else if (error.message.includes('keinen ausreichend lesbaren Text')) {
      throw new Error(error.message); // Bereits benutzerfreundlich
    } else {
      throw new Error(`PDF-Verarbeitung fehlgeschlagen: ${error.message}`);
    }
  }
}

// ===== ENDE DER NEUEN FUNKTIONEN =====

// ✅ Debug function to check file existence - ENHANCED
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
    // List all files in uploads directory for debugging
    try {
      const files = fsSync.readdirSync(UPLOAD_PATH);
      console.log(`📂 [ANALYZE] Available files in uploads:`, files);
    } catch (err) {
      console.error(`❌ [ANALYZE] Could not read uploads directory:`, err);
    }
  }
  
  return exists;
}

// ✅ SINGLETON OpenAI-Instance um Connection-Probleme zu vermeiden
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

// MongoDB Setup - ✅ Verbesserte Connection-Handhabung
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

// ✅ FALLBACK: Hash-Berechnung nur wenn crypto verfügbar
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

// ✅ FALLBACK: Dubletten-Check nur wenn alles verfügbar
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
    return null; // Bei Fehler weiter normal verarbeiten
  }
};

// ✅ Contract save function with all required fields for server.js compatibility - ENHANCED
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
      createdAt: new Date(), // ✅ ADDED: For compatibility
      
      // ✅ CRITICAL: File information (compatible with server.js static serving)
      filename: fileInfo.filename,           // multer filename (from storage config)
      originalname: fileInfo.originalname,   // original filename
      filePath: `/uploads/${fileInfo.filename}`, // ✅ CRITICAL: Server URL path
      mimetype: fileInfo.mimetype,           // file type
      size: fileInfo.size,                   // file size
      
      // ✅ CRITICAL: Upload type marker for frontend api.ts
      uploadType: "LOCAL_UPLOAD",           // ✅ Important for api.ts logic
      extraRefs: {
        uploadType: "LOCAL_UPLOAD",         // ✅ Backup field
        uploadPath: UPLOAD_PATH,            // ✅ Debug info
        serverPath: `/uploads/${fileInfo.filename}`, // ✅ Server URL path
        analysisId: null // Will be set later
      },
      
      // ✅ CRITICAL: Content and analysis for ContractDetailsView
      fullText: pdfText.substring(0, 100000), // ✅ Store extracted text for Content tab
      content: pdfText.substring(0, 100000),  // ✅ Alternative field name
      analysisDate: new Date(),
      
      // ✅ Legal Pulse placeholder
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

// ✅ NEU: Rate-Limited GPT-4 Request mit intelligenten Retries
const makeRateLimitedGPT4Request = async (prompt, requestId, openai, maxRetries = 3) => {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // ✅ Rate Limiting: Mindestabstand zwischen Requests
      const timeSinceLastRequest = Date.now() - lastGPT4Request;
      if (timeSinceLastRequest < GPT4_MIN_INTERVAL) {
        const waitTime = GPT4_MIN_INTERVAL - timeSinceLastRequest;
        console.log(`⏳ [${requestId}] Rate Limiting: Warte ${waitTime}ms vor GPT-4 Request...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // ✅ Request-Timestamp speichern
      lastGPT4Request = Date.now();
      
      console.log(`🤖 [${requestId}] GPT-4 Request (Versuch ${attempt}/${maxRetries})...`);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4", // ✅ GPT-4 beibehalten für beste Qualität
        messages: [
          { role: "system", content: "Du bist ein erfahrener Vertragsanalyst mit juristischer Expertise." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000, // ✅ Token-Limit für bessere Rate-Kontrolle
      });
      
      console.log(`✅ [${requestId}] GPT-4 Request erfolgreich!`);
      return completion;
      
    } catch (error) {
      console.error(`❌ [${requestId}] GPT-4 Fehler (Versuch ${attempt}):`, error.message);
      
      // ✅ Spezielle Behandlung für Rate Limit (429)
      if (error.status === 429) {
        if (attempt < maxRetries) {
          // Exponential Backoff: 5s, 10s, 20s
          const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
          console.log(`⏳ [${requestId}] Rate Limit erreicht. Warte ${waitTime/1000}s vor Retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error(`GPT-4 Rate Limit erreicht. Bitte versuche es in einigen Minuten erneut.`);
        }
      }
      
      // ✅ Andere Fehler: Sofort weiterwerfen
      throw error;
    }
  }
  
  throw new Error(`GPT-4 Request nach ${maxRetries} Versuchen fehlgeschlagen.`);
};

// ✅ MAIN ANALYZE ROUTE - ENHANCED (ohne OCR für Render-Kompatibilität)
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  const requestId = Date.now().toString();
  
  console.log(`📊 [${requestId}] LOKALER Analyse-Request erhalten (ohne OCR):`, {
    uploadType: "LOCAL_UPLOAD",
    hasFile: !!req.file,
    userId: req.user?.userId,
    uploadPath: UPLOAD_PATH,
    dirname: __dirname
  });

  if (!req.file) {
    console.error(`❌ [${requestId}] Keine Datei hochgeladen`);
    return res.status(400).json({ 
      success: false, 
      message: "Keine Datei hochgeladen" 
    });
  }

  try {
    // ✅ CRITICAL: File validation and existence check
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

    // ✅ MongoDB-Collections sicher abrufen
    const { analysisCollection, usersCollection: users, contractsCollection } = await getMongoCollections();
    console.log(`📊 [${requestId}] MongoDB-Collections verfügbar`);
    
    // 📊 Nutzer auslesen + Limit prüfen
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

    // ✅ PDF auslesen (lokal) - FIXED path
    console.log(`📄 [${requestId}] PDF wird lokal gelesen...`);
    
    const filePath = path.join(UPLOAD_PATH, req.file.filename);
    if (!fsSync.existsSync(filePath)) {
      throw new Error(`Datei nicht gefunden: ${filePath}`);
    }

    const buffer = await fs.readFile(filePath);
    console.log(`📄 [${requestId}] Buffer gelesen: ${buffer.length} bytes`);
    
    // ✅ Hash berechnen (mit Fallback)
    const fileHash = calculateFileHash(buffer);
    console.log(`🔍 [${requestId}] Datei-Hash berechnet: ${fileHash.substring(0, 12)}...`);

    // ✅ Dubletten-Check (nur wenn verfügbar)
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
        // Weiter normal verarbeiten
      }
    } else {
      console.log(`⚠️ [${requestId}] Dubletten-Check übersprungen (nicht verfügbar)`);
    }

    // ===== VERBESSERTE PDF-TEXT-EXTRAKTION (ohne OCR) =====
    console.log(`📖 [${requestId}] Verwende verbesserte PDF-Extraktion (ohne OCR)...`);
    
    const extractionResult = await extractTextFromPDFEnhanced(buffer, filePath, requestId);
    
    const fullTextContent = extractionResult.fullText;
    const contractText = extractionResult.text;
    
    console.log(`📊 [${requestId}] Extraktion erfolgreich:`, {
      method: extractionResult.method,
      quality: extractionResult.quality,
      textLength: fullTextContent.length,
      pages: extractionResult.pageCount,
      processingTime: extractionResult.processingTime
    });
    // ===== ENDE DER VERBESSERTEN PDF-EXTRAKTION =====

    // ✅ OpenAI-Aufruf - GEÄNDERT: Mit Rate Limiting
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
      // ✅ GEÄNDERT: Rate-Limited GPT-4 Request mit Timeout
      completion = await Promise.race([
        makeRateLimitedGPT4Request(prompt, requestId, openai),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("OpenAI API Timeout nach 60s")), 60000) // ✅ Länger für Retries
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

    // ✅ KRITISCH: Analyse in DB speichern MIT fullText für Content-Tab und Extraktion-Info
    const analysisData = {
      userId: req.user.userId,
      contractName: req.file.originalname,
      createdAt: new Date(),
      requestId,
      fullText: fullTextContent, // ✅ KRITISCH: Vollständiger Text für Content-Tab
      extractedText: fullTextContent, // ✅ Alternative Benennung als Fallback
      originalFileName: req.file.originalname, // ✅ Zusätzliche Info
      fileSize: buffer.length, // ✅ Dateigröße für Debug
      uploadType: "LOCAL_UPLOAD", // ✅ Debug-Info
      // ✅ Extraktion-Metadaten
      extractionMethod: extractionResult.method,
      extractionQuality: extractionResult.quality,
      ocrUsed: false, // ✅ OCR nicht verfügbar
      pageCount: extractionResult.pageCount,
      processingTime: extractionResult.processingTime,
      suggestion: extractionResult.suggestion,
      // OpenAI Analyse-Ergebnisse:
      ...result,
    };

    let inserted;
    try {
      inserted = await analysisCollection.insertOne(analysisData);
      console.log(`✅ [${requestId}] Lokale Analyse gespeichert: ${inserted.insertedId} (mit fullText: ${fullTextContent.length} Zeichen)`);
    } catch (dbError) {
      console.error(`❌ [${requestId}] DB-Insert-Fehler:`, dbError.message);
      throw new Error(`Datenbank-Fehler beim Speichern: ${dbError.message}`);
    }

    // 💾 Vertrag speichern (mit Fallbacks) - ERWEITERT und FIXED
    try {
      console.log(`💾 [${requestId}] Speichere Vertrag (lokal)...`);

      // Bei Duplikat: Bestehenden Vertrag aktualisieren
      if (existingContract && req.body.forceReanalyze === 'true') {
        console.log(`🔄 [${requestId}] Aktualisiere bestehenden Vertrag: ${existingContract._id}`);
        
        await contractsCollection.updateOne(
          { _id: existingContract._id },
          { 
            $set: {
              lastAnalyzed: new Date(),
              analysisId: inserted.insertedId, // ✅ KRITISCH: Reference zur Analyse
              fullText: fullTextContent, // ✅ KRITISCH: Text direkt im Contract als Backup
              content: fullTextContent, // ✅ ZUSÄTZLICH: Alternative Feldname für Kompatibilität
              filePath: `/uploads/${req.file.filename}`, // ✅ FIXED: Korrekter lokaler Pfad
              filename: req.file.filename, // ✅ ADDED: Für File Serving
              uploadType: "LOCAL_UPLOAD", // ✅ CRITICAL: For frontend logic
              // ✅ Extraktion-Metadaten im Contract
              extractionMethod: extractionResult.method,
              extractionQuality: extractionResult.quality,
              ocrUsed: false,
              extraRefs: {
                uploadType: "LOCAL_UPLOAD",
                analysisId: inserted.insertedId,
                uploadPath: UPLOAD_PATH,
                serverPath: `/uploads/${req.file.filename}`,
                extractionMethod: extractionResult.method,
                ocrUsed: false
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
        
        console.log(`✅ [${requestId}] Bestehender Vertrag aktualisiert mit fullText (${fullTextContent.length} Zeichen)`);
      } else {
        // Neuen Vertrag speichern (lokal) - ENHANCED
        const contractAnalysisData = {
          name: result.summary ? req.file.originalname : req.file.originalname,
          laufzeit: "Unbekannt", // TODO: Extract from AI response
          kuendigung: "Unbekannt", // TODO: Extract from AI response  
          expiryDate: "",
          status: "Aktiv"
        };

        const savedContract = await saveContractWithLocalUpload(
          req.user.userId,
          contractAnalysisData,
          req.file,
          fullTextContent
        );

        // ✅ Update contract with analysis reference und Extraktion-Info
        await contractsCollection.updateOne(
          { _id: savedContract._id },
          { 
            $set: {
              analysisId: inserted.insertedId,
              extractionMethod: extractionResult.method,
              extractionQuality: extractionResult.quality,
              ocrUsed: false,
              'extraRefs.analysisId': inserted.insertedId,
              'extraRefs.extractionMethod': extractionResult.method,
              'extraRefs.ocrUsed': false
            }
          }
        );

        console.log(`✅ [${requestId}] Neuer Vertrag gespeichert: ${savedContract._id} mit analysisId: ${inserted.insertedId}`);
      }
      
    } catch (saveError) {
      console.error(`❌ [${requestId}] Vertrag-Speicher-Fehler:`, saveError.message);
      // ✅ Vertrag-Speicher-Fehler soll Analyse nicht blockieren!
      console.warn(`⚠️ [${requestId}] Analyse war erfolgreich, aber Vertrag-Speicherung fehlgeschlagen`);
    }

    // ✅ Analyse-Zähler hochzählen
    try {
      await users.updateOne(
        { _id: user._id },
        { $inc: { analysisCount: 1 } }
      );
      console.log(`✅ [${requestId}] Analyse-Counter aktualisiert`);
    } catch (updateError) {
      console.warn(`⚠️ [${requestId}] Counter-Update-Fehler:`, updateError.message);
    }

    console.log(`✅ [${requestId}] Lokale Analyse komplett erfolgreich`);

    // 📤 Erfolgreiche Response - ERWEITERT mit Extraktion-Info
    const responseData = { 
      success: true,
      message: "Lokale Analyse erfolgreich abgeschlossen",
      requestId,
      uploadType: "LOCAL_UPLOAD", // ✅ Info für Frontend
      fileUrl: `/uploads/${req.file.filename}`, // ✅ CRITICAL: For frontend file access
      // ✅ Extraktion-Informationen für User-Feedback
      extractionInfo: {
        method: extractionResult.method,
        quality: extractionResult.quality,
        ocrUsed: false, // ✅ OCR nicht verfügbar
        ocrAvailable: false, // ✅ OCR nicht verfügbar in dieser Version
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

    // Bei Re-Analyse Hinweis hinzufügen
    if (existingContract && req.body.forceReanalyze === 'true') {
      responseData.isReanalysis = true;
      responseData.originalContractId = existingContract._id;
      responseData.message = "Lokale Analyse erfolgreich aktualisiert";
    }

    // ✅ Warnung für schlechte Text-Qualität hinzufügen
    if (extractionResult.quality === 'poor' && extractionResult.suggestion) {
      responseData.warning = {
        type: 'POOR_TEXT_QUALITY',
        message: 'Text-Qualität könnte besser sein für optimale Analyse-Ergebnisse.',
        suggestion: extractionResult.suggestion
      };
    }

    res.json(responseData);

  } catch (error) {
    console.error(`❌ [${requestId}] Fehler bei lokaler Analyse:`, {
      message: error.message,
      stack: error.stack?.substring(0, 500), // Shortened stack trace
      userId: req.user?.userId,
      filename: req.file?.originalname
    });
    
    // ✅ Spezifische Fehlermeldungen - ERWEITERT
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
    } else if (error.message.includes("PDF") || error.message.includes("Datei") || error.message.includes("passwortgeschützt") || error.message.includes("enthält nur Bilder")) {
      errorMessage = error.message;
      errorCode = "PDF_ERROR";
    } else if (error.message.includes("Datenbank") || error.message.includes("MongoDB")) {
      errorMessage = "Datenbank-Fehler. Bitte versuche es erneut.";
      errorCode = "DATABASE_ERROR";
    } else if (error.message.includes("OpenAI") || error.message.includes("Rate Limit")) {
      errorMessage = "KI-Analyse-Service vorübergehend nicht verfügbar.";
      errorCode = "AI_SERVICE_ERROR";
    } else if (error.message.includes("keinen ausreichend lesbaren Text") || error.message.includes("Nicht genügend Text")) {
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

// 📚 Analyseverlauf abrufen (unverändert)
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

// ✅ Health Check Route - LOKALER UPLOAD ohne OCR
router.get("/health", async (req, res) => {
  const checks = {
    service: "Contract Analysis (Local Upload - Lightweight)", // ✅ Updated
    status: "online",
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    mongoConnected: false,
    uploadsPath: fsSync.existsSync(UPLOAD_PATH),
    uploadPath: UPLOAD_PATH,
    uploadType: "LOCAL_UPLOAD", // ✅ Info
    s3Integration: "DISABLED (AWS SDK Conflict)", // ✅ Info
    cryptoAvailable: !!crypto,
    saveContractAvailable: !!saveContract,
    ocrAvailable: false, // ✅ OCR nicht verfügbar in dieser Version
    version: "lightweight" // ✅ Version-Info
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

// ✅ Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('📊 Analyze service (local - lightweight) shutting down...');
  if (mongoClient) {
    await mongoClient.close();
  }
});

module.exports = router;
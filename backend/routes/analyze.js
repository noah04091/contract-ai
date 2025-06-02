// 📁 backend/routes/analyze.js - RACE CONDITION & PDF-PARSING FIXES + DUBLETTENERKENNUNG (SAVE-BUG FIXED)
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const fsSync = require("fs");
const crypto = require("crypto"); // ✅ NEU: Für Hash-Berechnung
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");
const htmlPdf = require("html-pdf-node");
const saveContract = require("../services/saveContract");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

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
let contractsCollection = null; // ✅ NEU: Für Dubletten-Check

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
    contractsCollection = db.collection("contracts"); // ✅ NEU
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

// ✅ NEU: Hash-Berechnung für Datei-Dublettenerkennung
const calculateFileHash = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

// ✅ NEU: Dubletten-Check Funktion
const checkForDuplicate = async (fileHash, userId) => {
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

// ✅ HAUPTROUTE: POST /analyze mit Dublettenerkennung
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📊 [${requestId}] Analyse-Request erhalten:`, {
    hasFile: !!req.file,
    userId: req.user?.userId,
    filename: req.file?.originalname,
    fileSize: req.file?.size
  });

  // ❌ Keine Datei hochgeladen
  if (!req.file) {
    console.warn(`⚠️ [${requestId}] Keine Datei in Request gefunden`);
    return res.status(400).json({ 
      success: false,
      message: "❌ Keine Datei hochgeladen.",
      error: "FILE_MISSING"
    });
  }

  let tempFilePath = null;
  
  try {
    tempFilePath = req.file.path;
    console.log(`📁 [${requestId}] Temp-Datei erstellt: ${tempFilePath}`);

    // ✅ MongoDB-Collections sicher abrufen
    const { analysisCollection, usersCollection: users, contractsCollection } = await getMongoCollections();
    
    console.log(`🔍 [${requestId}] Prüfe User-Limits...`);
    
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

    // ✅ PDF auslesen für Hash-Berechnung und Dubletten-Check
    console.log(`📄 [${requestId}] PDF wird gelesen...`);
    
    if (!fsSync.existsSync(tempFilePath)) {
      throw new Error(`Temporäre Datei nicht gefunden: ${tempFilePath}`);
    }

    const buffer = await fs.readFile(tempFilePath);
    console.log(`📄 [${requestId}] Buffer gelesen: ${buffer.length} bytes`);
    
    // ✅ NEU: Hash berechnen für Dubletten-Check
    const fileHash = calculateFileHash(buffer);
    console.log(`🔍 [${requestId}] Datei-Hash berechnet: ${fileHash.substring(0, 12)}...`);

    // ✅ NEU: Prüfe auf Duplikate BEVOR die teure OpenAI-Analyse läuft
    const existingContract = await checkForDuplicate(fileHash, req.user.userId);
    
    if (existingContract) {
      console.log(`🔄 [${requestId}] Duplikat gefunden: ${existingContract._id}`);
      
      // Parameter aus Request extrahieren für bessere UX
      const forceReanalyze = req.body.forceReanalyze === 'true';
      
      if (!forceReanalyze) {
        // Erste Erkennung - Frontend informieren
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
        // User will explizit re-analysieren
        console.log(`🔄 [${requestId}] Nutzer wählt Re-Analyse für Duplikat`);
      }
    }

    // ✅ PDF-Text extrahieren (weiter wie gehabt)
    let parsed;
    try {
      parsed = await pdfParse(buffer, {
        max: 50000,
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });
    } catch (pdfError) {
      console.error(`❌ [${requestId}] PDF-Parse-Fehler:`, pdfError.message);
      throw new Error(`PDF-Datei ist beschädigt oder passwortgeschützt: ${pdfError.message}`);
    }
    
    const contractText = parsed.text?.slice(0, 4000) || '';
    
    console.log(`📄 [${requestId}] PDF-Text extrahiert: ${contractText.length} Zeichen`);

    if (!contractText.trim()) {
      const errorDetails = {
        fileSize: buffer.length,
        pdfInfo: parsed.info || 'Unknown',
        pdfMeta: parsed.metadata || 'Unknown',
        textLength: contractText.length
      };
      
      console.error(`❌ [${requestId}] PDF-Analyse-Details:`, errorDetails);
      throw new Error(
        `PDF enthält keinen lesbaren Text. Mögliche Ursachen: ` +
        `PDF ist passwortgeschützt, enthält nur Bilder, oder ist beschädigt. ` +
        `Bitte versuche eine andere PDF-Datei.`
      );
    }

    console.log(`📄 [${requestId}] PDF erfolgreich gelesen: ${contractText.length} Zeichen`);

    // ✅ OpenAI-Aufruf (unverändert)
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
        openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: "Du bist ein erfahrener Vertragsanalyst." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("OpenAI API Timeout nach 30s")), 30000)
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
      console.error(`❌ [${requestId}] JSON-Parse-Fehler:`, parseError.message, jsonString.substring(0, 100));
      throw new Error("Fehler beim Parsen der AI-Antwort");
    }

    if (!result.summary || !result.contractScore) {
      console.error(`❌ [${requestId}] Unvollständige AI-Response:`, result);
      throw new Error("Unvollständige Analyse-Antwort von OpenAI");
    }

    console.log(`📊 [${requestId}] Analyse erfolgreich, speichere in DB...`);

    // 📦 In DB speichern - ✅ ERWEITERT: Mit Hash und Duplikat-Handling
    const analysisData = {
      userId: req.user.userId,
      contractName: req.file.originalname,
      createdAt: new Date(),
      requestId,
      ...result,
    };

    let inserted;
    try {
      inserted = await analysisCollection.insertOne(analysisData);
    } catch (dbError) {
      console.error(`❌ [${requestId}] DB-Insert-Fehler:`, dbError.message);
      throw new Error(`Datenbank-Fehler beim Speichern: ${dbError.message}`);
    }

    // 💾 Vertrag speichern - ✅ FIXED: Korrekte Funktion-Parameter-Struktur
    try {
      console.log(`💾 [${requestId}] Speichere Vertrag...`);

      // Bei Duplikat: Bestehenden Vertrag aktualisieren statt neu anlegen
      if (existingContract && req.body.forceReanalyze === 'true') {
        console.log(`🔄 [${requestId}] Aktualisiere bestehenden Vertrag: ${existingContract._id}`);
        
        await contractsCollection.updateOne(
          { _id: existingContract._id },
          { 
            $set: {
              lastAnalyzed: new Date(),
              analysisId: inserted.insertedId,
              legalPulse: {
                riskScore: result.contractScore || null,
                riskSummary: result.summary || '',
                lastChecked: new Date(),
                lawInsights: [],
                marketSuggestions: []
              },
              // Optional: Analyse-Counter erhöhen
              analyzeCount: (existingContract.analyzeCount || 0) + 1
            }
          }
        );
        
        console.log(`✅ [${requestId}] Bestehender Vertrag aktualisiert`);
      } else {
        // ✅ FIXED: Korrekte saveContract-Aufrufsyntax für NEUE Verträge
        const saveResult = await saveContract({
          userId: req.user.userId,
          fileName: req.file.originalname,
          toolUsed: "analyze",
          filePath: `/uploads/${req.file.filename}`,
          fileHash: fileHash, // ✅ Hash hinzufügen
          extraRefs: { 
            analysisId: inserted.insertedId,
            fileSize: buffer.length,
            uploadedAt: new Date()
          },
          legalPulse: {
            riskScore: result.contractScore || null,
            riskSummary: result.summary || '',
            lastChecked: new Date(),
            lawInsights: [],
            marketSuggestions: []
          }
        });
        
        console.log(`✅ [${requestId}] Neuer Vertrag gespeichert: ${saveResult.insertedId}`);
      }
      
    } catch (saveError) {
      console.error(`❌ [${requestId}] Vertrag-Speicher-Fehler:`, saveError.message);
      // ✅ WICHTIG: Nicht mehr als Warning behandeln, sondern als Fehler!
      throw new Error(`Fehler beim Speichern des Vertrags: ${saveError.message}`);
    }

    // ✅ Analyse-Zähler hochzählen (nur bei erfolgreicher Analyse)
    try {
      await users.updateOne(
        { _id: user._id },
        { $inc: { analysisCount: 1 } }
      );
    } catch (updateError) {
      console.warn(`⚠️ [${requestId}] Counter-Update-Fehler:`, updateError.message);
    }

    console.log(`✅ [${requestId}] Analyse komplett erfolgreich`);

    // 📤 Erfolgreiche Response - ✅ ERWEITERT: Mit Duplikat-Info
    const responseData = { 
      success: true,
      message: "Analyse erfolgreich abgeschlossen",
      requestId,
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
      responseData.message = "Analyse erfolgreich aktualisiert";
    }

    res.json(responseData);

  } catch (error) {
    console.error(`❌ [${requestId}] Fehler bei Analyse:`, {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      filename: req.file?.originalname
    });
    
    // ✅ Spezifische Fehlermeldungen (unverändert)
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
    } else if (error.message.includes("OpenAI")) {
      errorMessage = "KI-Analyse-Service vorübergehend nicht verfügbar.";
      errorCode = "AI_SERVICE_ERROR";
    } else if (error.message.includes("Vertrag")) {
      errorMessage = "Fehler beim Speichern des Vertrags.";
      errorCode = "CONTRACT_SAVE_ERROR";
    }

    res.status(500).json({ 
      success: false,
      message: errorMessage,
      error: errorCode,
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });

  } finally {
    // 🧹 ROBUSTES Cleanup (unverändert)
    if (tempFilePath) {
      try {
        if (fsSync.existsSync(tempFilePath)) {
          await fs.unlink(tempFilePath);
          console.log(`🧹 [${requestId}] Temp-Datei gelöscht: ${tempFilePath}`);
        }
      } catch (cleanupErr) {
        console.error(`⚠️ [${requestId}] Fehler beim Löschen der Temp-Datei:`, cleanupErr.message);
      }
    }
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

// ✅ Health Check Route (erweitert mit Duplikat-Check)
router.get("/health", async (req, res) => {
  const checks = {
    service: "Contract Analysis",
    status: "online",
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    mongoConnected: false,
    uploadsPath: fsSync.existsSync("./uploads"),
    deduplicationEnabled: true // ✅ NEU
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

// ✅ Graceful Shutdown (unverändert)
process.on('SIGTERM', async () => {
  console.log('📊 Analyze service shutting down...');
  if (mongoClient) {
    await mongoClient.close();
  }
});

module.exports = router;
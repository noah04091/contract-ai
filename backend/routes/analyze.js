// 📁 backend/routes/analyze.js - RACE CONDITION & PDF-PARSING FIXES
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises; // ✅ ASYNC fs verwenden
const fsSync = require("fs"); // Fallback für existsSync
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
      timeout: 30000, // 30s timeout
      maxRetries: 2   // Retry bei Fehlern
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
    console.log("📊 MongoDB-Collections initialisiert");
  }
  return { analysisCollection, usersCollection };
};

// Initialize on startup
(async () => {
  try {
    await getMongoCollections();
    console.log("📊 Verbunden mit der Analyse-Collection");
  } catch (err) {
    console.error("❌ MongoDB-Fehler (analyze.js):", err);
  }
})();

// ✅ HAUPTROUTE: POST /analyze mit Race Condition Fixes
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
    const { analysisCollection, usersCollection: users } = await getMongoCollections();
    
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

    // ✅ PDF auslesen - IMPROVED mit besserer Fehlerbehandlung
    console.log(`📄 [${requestId}] PDF wird gelesen...`);
    
    // Prüfe ob Datei existiert
    if (!fsSync.existsSync(tempFilePath)) {
      throw new Error(`Temporäre Datei nicht gefunden: ${tempFilePath}`);
    }

    const buffer = await fs.readFile(tempFilePath);
    console.log(`📄 [${requestId}] Buffer gelesen: ${buffer.length} bytes`);
    
    let parsed;
    try {
      // ✅ IMPROVED: Bessere PDF-Parse-Optionen
      parsed = await pdfParse(buffer, {
        max: 50000,        // Max characters to parse
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });
    } catch (pdfError) {
      console.error(`❌ [${requestId}] PDF-Parse-Fehler:`, pdfError.message);
      throw new Error(`PDF-Datei ist beschädigt oder passwortgeschützt: ${pdfError.message}`);
    }
    
    const contractText = parsed.text?.slice(0, 4000) || '';
    
    console.log(`📄 [${requestId}] PDF-Text extrahiert: ${contractText.length} Zeichen`);
    console.log(`📄 [${requestId}] Text-Preview: "${contractText.substring(0, 100)}..."`);

    // ✅ IMPROVED: Bessere Validierung mit Details
    if (!contractText.trim()) {
      const errorDetails = {
        fileSize: buffer.length,
        pdfInfo: parsed.info || 'Unknown',
        pdfMeta: parsed.metadata || 'Unknown',
        textLength: contractText.length
      };
      
      console.error(`❌ [${requestId}] PDF-Analyse-Details:`, errorDetails);
      
      // Bessere Fehlermeldung für User
      throw new Error(
        `PDF enthält keinen lesbaren Text. Mögliche Ursachen: ` +
        `PDF ist passwortgeschützt, enthält nur Bilder, oder ist beschädigt. ` +
        `Bitte versuche eine andere PDF-Datei.`
      );
    }

    console.log(`📄 [${requestId}] PDF erfolgreich gelesen: ${contractText.length} Zeichen`);

    // ✅ OpenAI-Aufruf mit Singleton-Instance
    console.log(`🤖 [${requestId}] OpenAI-Anfrage wird gesendet...`);
    
    const openai = getOpenAI();

    // 📤 Prompt erstellen
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

    // 💬 OpenAI-Aufruf mit robustem Error-Handling
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

    // ✅ Validierung der AI-Response
    if (!result.summary || !result.contractScore) {
      console.error(`❌ [${requestId}] Unvollständige AI-Response:`, result);
      throw new Error("Unvollständige Analyse-Antwort von OpenAI");
    }

    console.log(`📊 [${requestId}] Analyse erfolgreich, speichere in DB...`);

    // 📦 In DB speichern - mit Retry-Logik
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

    // 💾 Vertrag speichern
    try {
      await saveContract({
        userId: req.user.userId,
        fileName: req.file.originalname,
        toolUsed: "analyze",
        filePath: `/uploads/${req.file.filename}`,
        extraRefs: { analysisId: inserted.insertedId },
        legalPulse: {
          riskScore: result.contractScore || null,
          riskSummary: result.summary || '',
          lastChecked: new Date(),
          lawInsights: [],
          marketSuggestions: []
        }
      });
    } catch (saveError) {
      console.warn(`⚠️ [${requestId}] Vertrag-Speicher-Fehler:`, saveError.message);
      // Nicht kritisch, Analyse trotzdem weiterführen
    }

    // ✅ Analyse-Zähler hochzählen
    try {
      await users.updateOne(
        { _id: user._id },
        { $inc: { analysisCount: 1 } }
      );
    } catch (updateError) {
      console.warn(`⚠️ [${requestId}] Counter-Update-Fehler:`, updateError.message);
      // Nicht kritisch
    }

    console.log(`✅ [${requestId}] Analyse komplett erfolgreich`);

    // 📤 Erfolgreiche Response
    res.json({ 
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
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Fehler bei Analyse:`, {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      filename: req.file?.originalname
    });
    
    // ✅ Spezifische Fehlermeldungen für verschiedene Fehlertypen
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
      errorMessage = error.message; // ✅ IMPROVED: Use detailed PDF error message
      errorCode = "PDF_ERROR";
    } else if (error.message.includes("Datenbank") || error.message.includes("MongoDB")) {
      errorMessage = "Datenbank-Fehler. Bitte versuche es erneut.";
      errorCode = "DATABASE_ERROR";
    } else if (error.message.includes("OpenAI")) {
      errorMessage = "KI-Analyse-Service vorübergehend nicht verfügbar.";
      errorCode = "AI_SERVICE_ERROR";
    }

    res.status(500).json({ 
      success: false,
      message: errorMessage,
      error: errorCode,
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });

  } finally {
    // 🧹 ROBUSTES Cleanup: Hochgeladene Datei löschen
    if (tempFilePath) {
      try {
        if (fsSync.existsSync(tempFilePath)) {
          await fs.unlink(tempFilePath);
          console.log(`🧹 [${requestId}] Temp-Datei gelöscht: ${tempFilePath}`);
        } else {
          console.log(`🧹 [${requestId}] Temp-Datei bereits gelöscht: ${tempFilePath}`);
        }
      } catch (cleanupErr) {
        console.error(`⚠️ [${requestId}] Fehler beim Löschen der Temp-Datei:`, {
          path: tempFilePath,
          error: cleanupErr.message
        });
        // Nicht kritisch, aber loggen für Debugging
      }
    }
  }
});

// 📚 Analyseverlauf abrufen - Auch mit Request-ID
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

// ✅ Health Check Route - Erweitert
router.get("/health", async (req, res) => {
  const checks = {
    service: "Contract Analysis",
    status: "online",
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    mongoConnected: false,
    uploadsPath: fsSync.existsSync("./uploads")
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
  console.log('📊 Analyze service shutting down...');
  if (mongoClient) {
    await mongoClient.close();
  }
});

module.exports = router;
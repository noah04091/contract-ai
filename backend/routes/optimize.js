// 📁 backend/routes/optimize.js - VERTRAGSOPTIMIERUNG
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const fsSync = require("fs");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const saveContract = require("../services/saveContract");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ✅ SINGLETON OpenAI-Instance
let openaiInstance = null;
const getOpenAI = () => {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API Key fehlt in Umgebungsvariablen");
    }
    openaiInstance = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 45000, // Längerer Timeout für Optimierung
      maxRetries: 2
    });
    console.log("🔧 OpenAI-Instance für Optimierung initialisiert");
  }
  return openaiInstance;
};

// MongoDB Setup
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
let mongoClient = null;
let optimizationCollection = null;
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
    optimizationCollection = db.collection("optimizations");
    usersCollection = db.collection("users");
    console.log("🔧 MongoDB-Collections für Optimierung initialisiert");
  }
  return { optimizationCollection, usersCollection };
};

// Initialize on startup
(async () => {
  try {
    await getMongoCollections();
    console.log("🔧 Verbunden mit der Optimierung-Collection");
  } catch (err) {
    console.error("❌ MongoDB-Fehler (optimize.js):", err);
  }
})();

// ✅ HAUPTROUTE: POST /optimize - Vertragsoptimierung
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  const requestId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔧 [${requestId}] Optimierung-Request erhalten:`, {
    hasFile: !!req.file,
    userId: req.user?.userId,
    filename: req.file?.originalname,
    fileSize: req.file?.size,
    contractType: req.body?.contractType || 'unbekannt'
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
    const { optimizationCollection, usersCollection: users } = await getMongoCollections();
    
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
    const optimizationCount = user.optimizationCount ?? 0;

    let limit = 5; // Free: 5 Optimierungen
    if (plan === "business") limit = 25;
    if (plan === "premium") limit = Infinity;

    console.log(`🔧 [${requestId}] User-Limits: ${optimizationCount}/${limit} (Plan: ${plan})`);

    if (optimizationCount >= limit) {
      console.warn(`⚠️ [${requestId}] Optimierung-Limit erreicht für User ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        message: "❌ Optimierung-Limit erreicht. Bitte Paket upgraden.",
        error: "LIMIT_EXCEEDED",
        currentCount: optimizationCount,
        limit: limit,
        plan: plan
      });
    }

    // ✅ PDF auslesen
    console.log(`📄 [${requestId}] PDF wird gelesen...`);
    
    if (!fsSync.existsSync(tempFilePath)) {
      throw new Error(`Temporäre Datei nicht gefunden: ${tempFilePath}`);
    }

    const buffer = await fs.readFile(tempFilePath);
    console.log(`📄 [${requestId}] Buffer gelesen: ${buffer.length} bytes`);
    
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
    
    const contractText = parsed.text?.slice(0, 6000) || ''; // Mehr Text für Optimierung
    
    console.log(`📄 [${requestId}] PDF-Text extrahiert: ${contractText.length} Zeichen`);

    if (!contractText.trim()) {
      throw new Error(
        `PDF enthält keinen lesbaren Text. Mögliche Ursachen: ` +
        `PDF ist passwortgeschützt, enthält nur Bilder, oder ist beschädigt.`
      );
    }

    // ✅ Erweiterte OpenAI-Optimierung
    console.log(`🤖 [${requestId}] OpenAI-Optimierung wird gesendet...`);
    
    const openai = getOpenAI();
    const contractType = req.body?.contractType || 'Standardvertrag';

    // 🎯 Spezialisierter Optimierungs-Prompt
    const prompt = `
Du bist ein erfahrener Vertragsanwalt und spezialisiert auf die Optimierung von Verträgen. 
Analysiere den folgenden ${contractType} und erstelle konkrete Optimierungsvorschläge:

VERTRAG:
${contractText}

AUFGABE:
Erstelle eine detaillierte Optimierungsanalyse mit folgenden Punkten:

1. KRITISCHE SCHWACHSTELLEN: Identifiziere rechtliche Risiken und ungünstige Klauseln
2. KONKRETE VERBESSERUNGEN: Schlage spezifische Textänderungen vor
3. ZUSÄTZLICHE KLAUSELN: Empfehle fehlende Schutzklauseln
4. FAIRE KONDITIONEN: Vorschläge für ausgewogenere Bedingungen
5. RECHTSSICHERHEIT: Maßnahmen zur Erhöhung der Rechtssicherheit
6. MARKTÜBLICHE STANDARDS: Vergleich mit branchenüblichen Verträgen

FORMAT:
Strukturiere deine Antwort in klaren Abschnitten mit konkreten, umsetzbaren Empfehlungen.
Verwende Bulletpoints für bessere Lesbarkeit.
Priorisiere die wichtigsten Optimierungen zuerst.

STIL:
- Professionell aber verständlich
- Konkret und praxisorientiert  
- Mit Begründungen für jede Empfehlung
- Rechtssicher und aktuell`;

    // 💬 OpenAI-Aufruf für Optimierung
    let completion;
    try {
      completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4", // Besseres Modell für komplexe Optimierung
          messages: [
            { 
              role: "system", 
              content: "Du bist ein Experte für Vertragsrecht und -optimierung mit 20+ Jahren Erfahrung." 
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2, // Niedrigere Temperatur für präzisere Ergebnisse
          max_tokens: 2000, // Mehr Tokens für detaillierte Optimierung
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("OpenAI API Timeout nach 45s")), 45000)
        )
      ]);
    } catch (openaiError) {
      console.error(`❌ [${requestId}] OpenAI-Fehler:`, openaiError.message);
      throw new Error(`OpenAI API Fehler: ${openaiError.message}`);
    }

    console.log(`✅ [${requestId}] OpenAI-Optimierung erhalten`);

    const optimizationResult = completion.choices[0].message.content || "";
    
    if (!optimizationResult.trim()) {
      throw new Error("Keine Optimierungsvorschläge von OpenAI erhalten");
    }

    console.log(`🔧 [${requestId}] Optimierung erfolgreich, speichere in DB...`);

    // 📦 In DB speichern
    const optimizationData = {
      userId: req.user.userId,
      contractName: req.file.originalname,
      contractType: contractType,
      originalText: contractText.substring(0, 1000), // Nur Auszug speichern
      optimizationResult: optimizationResult,
      createdAt: new Date(),
      requestId,
    };

    let inserted;
    try {
      inserted = await optimizationCollection.insertOne(optimizationData);
    } catch (dbError) {
      console.error(`❌ [${requestId}] DB-Insert-Fehler:`, dbError.message);
      throw new Error(`Datenbank-Fehler beim Speichern: ${dbError.message}`);
    }

    // ✅ Optimierung-Zähler hochzählen
    try {
      await users.updateOne(
        { _id: user._id },
        { $inc: { optimizationCount: 1 } }
      );
    } catch (updateError) {
      console.warn(`⚠️ [${requestId}] Counter-Update-Fehler:`, updateError.message);
    }

    console.log(`✅ [${requestId}] Optimierung komplett erfolgreich`);

    // 📤 Erfolgreiche Response
    res.json({ 
      success: true,
      message: "Optimierung erfolgreich abgeschlossen",
      requestId,
      optimizationResult: optimizationResult,
      optimizationId: inserted.insertedId,
      usage: {
        count: optimizationCount + 1,
        limit: limit,
        plan: plan
      }
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Fehler bei Optimierung:`, {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      filename: req.file?.originalname
    });
    
    // ✅ Spezifische Fehlermeldungen
    let errorMessage = "Fehler bei der Optimierung.";
    let errorCode = "OPTIMIZATION_ERROR";
    
    if (error.message.includes("API Key")) {
      errorMessage = "KI-Service vorübergehend nicht verfügbar.";
      errorCode = "AI_SERVICE_ERROR";
    } else if (error.message.includes("Timeout")) {
      errorMessage = "Optimierung-Timeout. Bitte versuche es mit einer kleineren Datei.";
      errorCode = "TIMEOUT_ERROR";
    } else if (error.message.includes("PDF") || error.message.includes("Datei")) {
      errorMessage = error.message;
      errorCode = "PDF_ERROR";
    } else if (error.message.includes("Datenbank")) {
      errorMessage = "Datenbank-Fehler. Bitte versuche es erneut.";
      errorCode = "DATABASE_ERROR";
    } else if (error.message.includes("OpenAI")) {
      errorMessage = "KI-Optimierung-Service vorübergehend nicht verfügbar.";
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
    // 🧹 Cleanup: Temp-Datei löschen
    if (tempFilePath) {
      try {
        if (fsSync.existsSync(tempFilePath)) {
          await fs.unlink(tempFilePath);
          console.log(`🧹 [${requestId}] Temp-Datei gelöscht: ${tempFilePath}`);
        }
      } catch (cleanupErr) {
        console.error(`⚠️ [${requestId}] Fehler beim Löschen:`, {
          path: tempFilePath,
          error: cleanupErr.message
        });
      }
    }
  }
});

// 📚 Optimierungsverlauf abrufen
router.get("/history", verifyToken, async (req, res) => {
  const requestId = `opt_hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`📚 [${requestId}] Optimierung-Historie angefordert für User: ${req.user.userId}`);
    
    const { optimizationCollection } = await getMongoCollections();
    
    const history = await optimizationCollection
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    console.log(`📚 [${requestId}] ${history.length} Optimierung-Einträge gefunden`);

    res.json({
      success: true,
      requestId,
      history: history,
      count: history.length
    });

  } catch (err) {
    console.error(`❌ [${requestId}] Fehler beim Abrufen der Optimierung-Historie:`, err);
    res.status(500).json({ 
      success: false,
      message: "Fehler beim Abrufen der Historie.",
      error: "HISTORY_ERROR",
      requestId
    });
  }
});

// ✅ Health Check Route
router.get("/health", async (req, res) => {
  const checks = {
    service: "Contract Optimization",
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
  console.log('🔧 Optimize service shutting down...');
  if (mongoClient) {
    await mongoClient.close();
  }
});

module.exports = router;
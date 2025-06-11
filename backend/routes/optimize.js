// 📁 backend/routes/optimize.js - OPTIMIZED: Verwendet zentrale MongoDB-Verbindung
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const fsSync = require("fs");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { ObjectId } = require("mongodb");

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
      timeout: 60000,
      maxRetries: 3
    });
    console.log("🔧 OpenAI-Instance für Optimierung initialisiert");
  }
  return openaiInstance;
};

// ✅ OPTIMIZED: Keine eigene MongoDB-Verbindung mehr - verwendet req.db
// Alle MongoDB-Setup entfernt - wird jetzt von server.js bereitgestellt

// ✅ ENHANCED: Premium Optimierungs-Prompt für bessere Ergebnisse
const createOptimizationPrompt = (contractText, contractType, fileName) => {
  return `Du bist ein erfahrener Rechtsanwalt mit 20+ Jahren Spezialisierung auf Vertragsoptimierung. 
Analysiere den folgenden ${contractType} (Datei: ${fileName}) und erstelle konkrete, praxisorientierte Optimierungsvorschläge.

VERTRAG:
${contractText}

AUFGABE:
Analysiere den Vertrag systematisch und erstelle strukturierte Optimierungsvorschläge in folgenden Bereichen:

1. KÜNDIGUNGSFRISTEN & LAUFZEITEN
   - Sind die Fristen angemessen und marktüblich?
   - Flexibilität für beide Parteien?
   - Verbesserungsvorschläge mit konkreten Zeiträumen

2. HAFTUNG & RISIKOMANAGEMENT  
   - Übermäßige oder einseitige Haftungsklauseln?
   - Fehlende Haftungsbegrenzungen?
   - Konkrete Verbesserungen für ausgewogene Risikoverteilung

3. ZAHLUNGSKONDITIONEN
   - Zahlungsfristen und -modalitäten
   - Verzugszinsen und Mahnwesen
   - Cashflow-Optimierung

4. RECHTSSICHERHEIT & KLARHEIT
   - Unklare oder mehrdeutige Formulierungen
   - Fehlende oder unvollständige Klauseln
   - Verbesserung der Verständlichkeit

5. COMPLIANCE & DATENSCHUTZ
   - DSGVO-Konformität
   - Branchenspezifische Anforderungen
   - Rechtliche Vollständigkeit

FORMAT:
Strukturiere deine Antwort wie folgt für jede identifizierte Optimierung:

[KATEGORIE: Kündigung/Haftung/Zahlung/Klarheit/Compliance]
PROBLEM: [Beschreibe das konkrete Problem]
EMPFEHLUNG: [Konkrete Verbesserung mit Textvorschlag]
BEGRÜNDUNG: [Rechtliche und praktische Begründung]
PRIORITÄT: [Hoch/Mittel/Niedrig]
UMSETZUNG: [Wie umsetzen - einfach/komplex]
---

STIL:
- Professionell aber verständlich
- Konkrete Textvorschläge statt vage Empfehlungen
- Praxisorientiert mit Business-Impact
- Rechtssicher und aktuell (2024)
- Fokus auf die 3-5 wichtigsten Optimierungen`;
};

// ✅ HAUPTROUTE: POST /optimize - Enhanced Vertragsoptimierung mit zentraler DB
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  const requestId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔧 [${requestId}] Enhanced Optimierung-Request:`, {
    hasFile: !!req.file,
    userId: req.user?.userId,
    filename: req.file?.originalname,
    fileSize: req.file?.size,
    contractType: req.body?.contractType || 'Standardvertrag'
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

    // ✅ OPTIMIZED: Verwende zentrale DB-Verbindung von server.js
    const optimizationCollection = req.db.collection("optimizations");
    const usersCollection = req.db.collection("users");
    
    console.log(`🔍 [${requestId}] Prüfe User-Limits mit zentraler DB...`);
    
    // 📊 Nutzer auslesen + Enhanced Limit-Prüfung
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

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

    // ✅ ENHANCED: Premium-basierte Limits
    let limit = 0; // Free: 0 Optimierungen (Premium-Feature)
    if (plan === "business") limit = 25;
    if (plan === "premium") limit = Infinity;

    console.log(`🔧 [${requestId}] User-Limits: ${optimizationCount}/${limit} (Plan: ${plan})`);

    if (optimizationCount >= limit) {
      console.warn(`⚠️ [${requestId}] Optimierung-Limit erreicht für User ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        message: plan === "free" 
          ? "❌ KI-Vertragsoptimierung ist ein Premium-Feature. Bitte upgrade dein Paket."
          : "❌ Optimierung-Limit erreicht. Bitte upgrade dein Paket oder warte bis zum nächsten Monat.",
        error: "LIMIT_EXCEEDED",
        currentCount: optimizationCount,
        limit: limit,
        plan: plan,
        upgradeRequired: plan === "free"
      });
    }

    // ✅ ENHANCED: PDF Processing mit besserer Fehlerbehandlung
    console.log(`📄 [${requestId}] PDF wird verarbeitet...`);
    
    if (!fsSync.existsSync(tempFilePath)) {
      throw new Error(`Temporäre Datei nicht gefunden: ${tempFilePath}`);
    }

    const buffer = await fs.readFile(tempFilePath);
    console.log(`📄 [${requestId}] Buffer gelesen: ${buffer.length} bytes`);
    
    let parsed;
    try {
      parsed = await pdfParse(buffer, {
        max: 100000,
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });
    } catch (pdfError) {
      console.error(`❌ [${requestId}] PDF-Parse-Fehler:`, pdfError.message);
      throw new Error(`PDF-Datei konnte nicht gelesen werden: ${pdfError.message}`);
    }
    
    const contractText = parsed.text?.slice(0, 8000) || '';
    
    console.log(`📄 [${requestId}] PDF-Text extrahiert: ${contractText.length} Zeichen`);

    if (!contractText.trim()) {
      throw new Error(
        `PDF enthält keinen lesbaren Text. Mögliche Ursachen: ` +
        `PDF ist passwortgeschützt, enthält nur Bilder, oder ist beschädigt.`
      );
    }

    // ✅ ENHANCED: Verbesserte OpenAI-Optimierung
    console.log(`🤖 [${requestId}] Starte Enhanced OpenAI-Optimierung...`);
    
    const openai = getOpenAI();
    const contractType = req.body?.contractType || 'Standardvertrag';
    const fileName = req.file.originalname || 'Vertrag';

    // 🎯 Enhanced Prompt für strukturierte Ergebnisse
    const prompt = createOptimizationPrompt(contractText, contractType, fileName);

    // 💬 Enhanced OpenAI-Aufruf
    let completion;
    try {
      completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { 
              role: "system", 
              content: "Du bist ein führender Experte für Vertragsrecht und -optimierung. Deine Analysen sind präzise, praxisorientiert und rechtlich fundiert." 
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 3000,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("OpenAI API Timeout nach 60s")), 60000)
        )
      ]);
    } catch (openaiError) {
      console.error(`❌ [${requestId}] OpenAI-Fehler:`, openaiError.message);
      
      // Enhanced Error Handling
      if (openaiError.message.includes('rate limit')) {
        throw new Error("KI-Service vorübergehend überlastet. Bitte versuche es in einer Minute erneut.");
      } else if (openaiError.message.includes('timeout')) {
        throw new Error("KI-Analyse-Timeout. Bitte versuche es mit einer kleineren Datei.");
      } else if (openaiError.message.includes('invalid')) {
        throw new Error("Ungültige Anfrage an KI-Service. Prüfe das Dateiformat.");
      } else {
        throw new Error(`KI-Service-Fehler: ${openaiError.message}`);
      }
    }

    console.log(`✅ [${requestId}] Enhanced OpenAI-Optimierung erhalten`);

    const optimizationResult = completion.choices[0].message.content || "";
    
    if (!optimizationResult.trim()) {
      throw new Error("Keine Optimierungsvorschläge von KI erhalten");
    }

    // ✅ Enhanced: Qualitätsprüfung der KI-Response
    if (optimizationResult.length < 200) {
      console.warn(`⚠️ [${requestId}] Kurze KI-Response: ${optimizationResult.length} Zeichen`);
    }

    console.log(`🔧 [${requestId}] Optimierung erfolgreich, speichere in zentrale DB...`);

    // 📦 Enhanced: Verbesserte Datenstruktur
    const optimizationData = {
      userId: req.user.userId,
      contractName: req.file.originalname,
      contractType: contractType,
      originalText: contractText.substring(0, 2000),
      optimizationResult: optimizationResult,
      fileSize: req.file.size,
      textLength: contractText.length,
      model: "gpt-4",
      processingTime: Date.now() - parseInt(requestId.split('_')[1]),
      createdAt: new Date(),
      requestId,
      metadata: {
        userPlan: plan,
        optimizationCount: optimizationCount + 1,
        fileName: fileName,
        categories: [],
        score: null
      }
    };

    let inserted;
    try {
      inserted = await optimizationCollection.insertOne(optimizationData);
    } catch (dbError) {
      console.error(`❌ [${requestId}] DB-Insert-Fehler:`, dbError.message);
      throw new Error(`Datenbank-Fehler beim Speichern: ${dbError.message}`);
    }

    // ✅ Enhanced: Atomic Counter Update mit Retry
    try {
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $inc: { optimizationCount: 1 },
          $set: { 
            lastOptimization: new Date(),
            updatedAt: new Date()
          }
        }
      );
    } catch (updateError) {
      console.warn(`⚠️ [${requestId}] Counter-Update-Fehler:`, updateError.message);
      // Non-blocking - Optimierung war erfolgreich
    }

    console.log(`✅ [${requestId}] Enhanced Optimierung komplett erfolgreich mit zentraler DB`);

    // 📤 Enhanced Success Response
    res.json({ 
      success: true,
      message: "✅ KI-Vertragsoptimierung erfolgreich abgeschlossen",
      requestId,
      optimizationResult: optimizationResult,
      optimizationId: inserted.insertedId,
      usage: {
        count: optimizationCount + 1,
        limit: limit,
        plan: plan,
        remaining: limit === Infinity ? Infinity : Math.max(0, limit - optimizationCount - 1)
      },
      metadata: {
        fileName: fileName,
        fileSize: req.file.size,
        textLength: contractText.length,
        processingTime: Date.now() - parseInt(requestId.split('_')[1]),
        model: "gpt-4",
        timestamp: new Date().toISOString(),
        usedCentralDB: true // ✅ Debug-Info
      }
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Enhanced Optimierung-Fehler:`, {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      filename: req.file?.originalname
    });
    
    // ✅ Enhanced: Intelligente Fehlermeldungen
    let errorMessage = "Fehler bei der KI-Vertragsoptimierung.";
    let errorCode = "OPTIMIZATION_ERROR";
    let statusCode = 500;
    
    if (error.message.includes("API Key")) {
      errorMessage = "🤖 KI-Service nicht konfiguriert. Bitte kontaktiere den Support.";
      errorCode = "AI_CONFIG_ERROR";
      statusCode = 503;
    } else if (error.message.includes("rate limit") || error.message.includes("überlastet")) {
      errorMessage = "🚦 KI-Service vorübergehend überlastet. Bitte versuche es in einer Minute erneut.";
      errorCode = "AI_RATE_LIMIT";
      statusCode = 429;
    } else if (error.message.includes("Timeout")) {
      errorMessage = "⏱️ KI-Analyse-Timeout. Bitte versuche es mit einer kleineren PDF-Datei.";
      errorCode = "TIMEOUT_ERROR";
      statusCode = 408;
    } else if (error.message.includes("PDF") || error.message.includes("Datei")) {
      errorMessage = `📄 ${error.message}`;
      errorCode = "PDF_ERROR";
      statusCode = 400;
    } else if (error.message.includes("Datenbank")) {
      errorMessage = "💾 Datenbank-Fehler. Bitte versuche es erneut.";
      errorCode = "DATABASE_ERROR";
      statusCode = 503;
    } else if (error.message.includes("Premium-Feature")) {
      errorMessage = error.message;
      errorCode = "PREMIUM_REQUIRED";
      statusCode = 402;
    } else if (error.message.includes("Limit erreicht")) {
      errorMessage = error.message;
      errorCode = "LIMIT_EXCEEDED";
      statusCode = 403;
    } else if (error.message.includes("KI-Service")) {
      errorMessage = error.message;
      errorCode = "AI_SERVICE_ERROR";
      statusCode = 503;
    }

    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      error: errorCode,
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      help: statusCode === 402 ? "Upgrade auf Business oder Premium für KI-Optimierungen" :
            statusCode === 403 ? "Warte bis zum nächsten Monat oder upgrade dein Paket" :
            statusCode === 429 ? "Versuche es in 1-2 Minuten erneut" :
            statusCode === 408 ? "Verwende eine kleinere PDF-Datei (< 10MB)" :
            "Kontaktiere den Support falls das Problem weiterhin besteht"
    });

  } finally {
    // 🧹 Enhanced Cleanup mit besserer Fehlerbehandlung
    if (tempFilePath) {
      try {
        if (fsSync.existsSync(tempFilePath)) {
          await fs.unlink(tempFilePath);
          console.log(`🧹 [${requestId}] Temp-Datei erfolgreich gelöscht: ${tempFilePath}`);
        }
      } catch (cleanupErr) {
        console.error(`⚠️ [${requestId}] Cleanup-Fehler (non-blocking):`, {
          path: tempFilePath,
          error: cleanupErr.message
        });
      }
    }
  }
});

// 📚 Enhanced: Optimierungsverlauf mit Pagination - verwendet zentrale DB
router.get("/history", verifyToken, async (req, res) => {
  const requestId = `opt_hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`📚 [${requestId}] Optimierung-Historie angefordert für User: ${req.user.userId}`);
    
    // ✅ OPTIMIZED: Verwende zentrale DB
    const optimizationCollection = req.db.collection("optimizations");
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const [history, totalCount] = await Promise.all([
      optimizationCollection
        .find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({
          contractName: 1,
          contractType: 1,
          createdAt: 1,
          requestId: 1,
          metadata: 1,
          optimizationResult: { $substr: ["$optimizationResult", 0, 200] }
        })
        .toArray(),
      
      optimizationCollection.countDocuments({ userId: req.user.userId })
    ]);

    console.log(`📚 [${requestId}] ${history.length}/${totalCount} Optimierung-Einträge gefunden (zentrale DB)`);

    res.json({
      success: true,
      requestId,
      history: history,
      pagination: {
        current: page,
        limit: limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      count: history.length,
      totalCount: totalCount,
      usedCentralDB: true // ✅ Debug-Info
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

// ✅ Enhanced Health Check mit detaillierten Status-Infos
router.get("/health", async (req, res) => {
  const checks = {
    service: "Enhanced Contract Optimization",
    status: "online",
    timestamp: new Date().toISOString(),
    version: "2.0.0-centralized",
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    openaiModel: "gpt-4",
    mongoConnected: !!req.db,
    centralDB: true, // ✅ Verwendet zentrale DB
    uploadsPath: fsSync.existsSync("./uploads"),
    features: {
      premiumOptimization: true,
      structuredParsing: true,
      enhancedPrompts: true,
      intelligentErrors: true,
      historyPagination: true,
      centralizedDB: true // ✅ NEU
    }
  };

  try {
    if (req.db) {
      // Enhanced: DB Performance Check mit zentraler DB
      const startTime = Date.now();
      await req.db.collection("optimizations").findOne({}, { limit: 1 });
      checks.dbResponseTime = Date.now() - startTime;
      checks.dbPerformance = checks.dbResponseTime < 100 ? 'excellent' : 
                            checks.dbResponseTime < 500 ? 'good' : 'slow';
    }
    
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

// ✅ NEW: Einzelne Optimierung abrufen - verwendet zentrale DB
router.get("/:id", verifyToken, async (req, res) => {
  const requestId = `opt_get_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // ✅ OPTIMIZED: Verwende zentrale DB
    const optimizationCollection = req.db.collection("optimizations");
    
    const optimization = await optimizationCollection.findOne({
      _id: new ObjectId(req.params.id),
      userId: req.user.userId
    });

    if (!optimization) {
      return res.status(404).json({
        success: false,
        message: "Optimierung nicht gefunden",
        error: "NOT_FOUND",
        requestId
      });
    }

    res.json({
      success: true,
      requestId,
      optimization: optimization,
      usedCentralDB: true // ✅ Debug-Info
    });

  } catch (err) {
    console.error(`❌ [${requestId}] Fehler beim Abrufen der Optimierung:`, err);
    res.status(500).json({
      success: false,
      message: "Fehler beim Abrufen der Optimierung",
      error: "FETCH_ERROR",
      requestId
    });
  }
});

// ✅ OPTIMIZED: Kein Graceful Shutdown nötig - zentrale DB wird von server.js verwaltet
// Alle MongoDB-Verbindungs-Management entfernt

module.exports = router;
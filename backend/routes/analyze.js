// 📁 backend/routes/analyze.js - VERBESSERTE ERROR HANDLING
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");
const htmlPdf = require("html-pdf-node");
const saveContract = require("../services/saveContract");

const router = express.Router();
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// MongoDB Setup
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let analysisCollection;

(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    analysisCollection = db.collection("analyses");
    console.log("📊 Verbunden mit der Analyse-Collection");
  } catch (err) {
    console.error("❌ MongoDB-Fehler (analyze.js):", err);
  }
})();

// ✅ HAUPTROUTE: POST /analyze mit verbesserter Fehlerbehandlung
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  console.log("📊 Analyse-Request erhalten:", {
    hasFile: !!req.file,
    userId: req.user?.userId,
    filename: req.file?.originalname
  });

  // ❌ Keine Datei hochgeladen
  if (!req.file) {
    console.warn("⚠️ Keine Datei in Request gefunden");
    return res.status(400).json({ 
      success: false,
      message: "❌ Keine Datei hochgeladen.",
      error: "FILE_MISSING"
    });
  }

  try {
    // 📊 Nutzer auslesen + Limit prüfen
    const usersCollection = client.db("contract_ai").collection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      console.error("❌ User nicht gefunden:", req.user.userId);
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

    console.log(`📊 User-Limits: ${count}/${limit} (Plan: ${plan})`);

    if (count >= limit) {
      console.warn(`⚠️ Analyse-Limit erreicht für User ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        message: "❌ Analyse-Limit erreicht. Bitte Paket upgraden.",
        error: "LIMIT_EXCEEDED",
        currentCount: count,
        limit: limit,
        plan: plan
      });
    }

    // 📥 PDF auslesen
    console.log("📄 PDF wird gelesen...");
    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);
    const contractText = parsed.text.slice(0, 4000);

    if (!contractText.trim()) {
      throw new Error("PDF-Inhalt ist leer oder konnte nicht gelesen werden");
    }

    console.log(`📄 PDF erfolgreich gelesen: ${contractText.length} Zeichen`);

    // ✅ OpenAI API Key prüfen
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API Key fehlt in Umgebungsvariablen");
    }

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

    console.log("🤖 OpenAI-Anfrage wird gesendet...");

    // 💬 OpenAI-Aufruf mit Timeout
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Du bist ein erfahrener Vertragsanalyst." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("OpenAI API Timeout")), 30000)
      )
    ]);

    console.log("✅ OpenAI-Response erhalten");

    const aiMessage = completion.choices[0].message.content || "";
    const jsonStart = aiMessage.indexOf("{");
    const jsonEnd = aiMessage.lastIndexOf("}") + 1;
    
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      throw new Error("Keine gültige JSON-Antwort von OpenAI erhalten");
    }

    const jsonString = aiMessage.slice(jsonStart, jsonEnd);
    const result = JSON.parse(jsonString);

    // ✅ Validierung der AI-Response
    if (!result.summary || !result.contractScore) {
      throw new Error("Unvollständige Analyse-Antwort von OpenAI");
    }

    console.log("📊 Analyse erfolgreich, speichere in DB...");

    // 📦 In DB speichern
    const analysis = {
      userId: req.user.userId,
      contractName: req.file.originalname,
      createdAt: new Date(),
      ...result,
    };

    const inserted = await analysisCollection.insertOne(analysis);

    // 💾 Vertrag speichern
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

    // ✅ Analyse-Zähler hochzählen
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { analysisCount: 1 } }
    );

    console.log("✅ Analyse komplett erfolgreich");

    // 📤 Erfolgreiche Response
    res.json({ 
      success: true,
      message: "Analyse erfolgreich abgeschlossen",
      ...result, 
      analysisId: inserted.insertedId,
      usage: {
        count: count + 1,
        limit: limit,
        plan: plan
      }
    });

  } catch (error) {
    console.error("❌ Fehler bei Analyse:", error);
    
    // ✅ Spezifische Fehlermeldungen für verschiedene Fehlertypen
    let errorMessage = "Fehler bei der Analyse.";
    let errorCode = "ANALYSIS_ERROR";
    
    if (error.message.includes("API Key")) {
      errorMessage = "KI-Service vorübergehend nicht verfügbar.";
      errorCode = "AI_SERVICE_ERROR";
    } else if (error.message.includes("Timeout")) {
      errorMessage = "Analyse-Timeout. Bitte versuche es mit einer kleineren Datei.";
      errorCode = "TIMEOUT_ERROR";
    } else if (error.message.includes("JSON")) {
      errorMessage = "Fehler bei der Analyse-Verarbeitung.";
      errorCode = "PARSE_ERROR";
    } else if (error.message.includes("PDF")) {
      errorMessage = "PDF konnte nicht gelesen werden. Bitte prüfe das Dateiformat.";
      errorCode = "PDF_ERROR";
    }

    res.status(500).json({ 
      success: false,
      message: errorMessage,
      error: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });

  } finally {
    // 🧹 Cleanup: Hochgeladene Datei löschen
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log("🧹 Temp-Datei gelöscht:", req.file.path);
      }
    } catch (cleanupErr) {
      console.warn("⚠️ Fehler beim Löschen der Temp-Datei:", cleanupErr.message);
    }
  }
});

// 📚 Analyseverlauf abrufen
router.get("/history", verifyToken, async (req, res) => {
  try {
    console.log("📚 Analyse-Historie angefordert für User:", req.user.userId);
    
    const history = await analysisCollection
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    console.log(`📚 ${history.length} Analyse-Einträge gefunden`);

    res.json({
      success: true,
      history: history,
      count: history.length
    });

  } catch (err) {
    console.error("❌ Fehler beim Abrufen der Analyse-Historie:", err);
    res.status(500).json({ 
      success: false,
      message: "Fehler beim Abrufen der Historie.",
      error: "HISTORY_ERROR"
    });
  }
});

// ✅ Health Check Route
router.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "Contract Analysis",
    status: "online",
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
});

module.exports = router;
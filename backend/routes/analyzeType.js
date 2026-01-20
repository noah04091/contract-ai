// 📁 backend/routes/analyzeType.js
// MINIMAL ERWEITERT: Bestehende Route 100% unverändert + neue öffentliche Route

const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const saveContract = require("../services/saveContract"); // 🆕 Import
const { isBusinessOrHigher, isEnterpriseOrHigher, getFeatureLimit } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// MongoDB Setup
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);

let usersCollection;
(async () => {
  try {
    await client.connect();
    usersCollection = client.db("contract_ai").collection("users");
    console.log("🔗 Verbunden mit der Users-Collection (analyzeType)");
  } catch (err) {
    console.error("❌ MongoDB-Fehler (analyzeType):", err);
  }
})();

// 🔒 DEINE BESTEHENDE AUTHENTIFIZIERTE ROUTE (100% UNVERÄNDERT!)
router.post("/", verifyToken, async (req, res) => {
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: "❌ Kein Text übergeben." });

  try {
    // 📊 Nutzer + Plan + Limit prüfen
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    const plan = user.subscriptionPlan || "free";
    const count = user.analysisCount ?? 0;

    // ✅ Limits aus zentraler Konfiguration (subscriptionPlans.js)
    // - Free: 3 Analysen EINMALIG
    // - Business: 25 Analysen pro Monat
    // - Enterprise/Legendary: Unbegrenzt
    const limit = getFeatureLimit(plan, 'analyze');

    if (count >= limit) {
      return res.status(403).json({
        message: "❌ Analyse-Limit erreicht. Bitte Paket upgraden.",
        error: "LIMIT_EXCEEDED",
        currentCount: count,
        limit: limit,
        plan: plan
      });
    }

    // 🧠 GPT-Analyse
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Du bist Vertragsexperte. Analysiere den folgenden Vertragstext und gib NUR den passenden Vertragstyp als ein Wort zurück. Beispiele: internet, versicherung, handyvertrag, hosting, software, energie, saas, finanzprodukt, cloud-storage, business-services."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.2
    });

    const contractType = completion.choices[0].message.content.toLowerCase().trim();

    // 🧾 Zentral speichern
    await saveContract({
      userId: req.user.userId,
      fileName: `Erkannt: ${contractType}`,
      toolUsed: "analyzeType",
      filePath: "", // kein physischer Upload
      extraRefs: {
        content: text,
        contractType
      }
    });

    // ✅ Count erhöhen
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { analysisCount: 1 } }
    );

    res.json({ contractType });
  } catch (err) {
    console.error("❌ GPT-Fehler:", err.message);
    res.status(500).json({ error: "Fehler bei der Vertragstyp-Erkennung." });
  }
});

// 🆕 NEUE ÖFFENTLICHE ROUTE für Better Contracts (OHNE verifyToken, OHNE DB-Speicherung)
router.post("/public", async (req, res) => {
  console.log("🔍 Public Analyze-Type Request für Better Contracts");
  
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({
        error: "Text zu kurz",
        message: "Mindestens 10 Zeichen erforderlich für Vertragstyp-Erkennung"
      });
    }

    console.log(`🔍 Analysiere Vertragstyp für Text: ${text.substring(0, 100)}...`);

    // 🧠 GPT-Analyse (gleiche Logik wie authentifizierte Route)
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Du bist Vertragsexperte. Analysiere den folgenden Vertragstext und gib NUR den passenden Vertragstyp als ein Wort zurück. Beispiele: handy, mobilfunk, internet, hosting, versicherung, kfz, haftpflicht, strom, gas, fitness, streaming, bank, kredit, unbekannt."
        },
        {
          role: "user", 
          content: text.substring(0, 2000) // Begrenzt für öffentliche Route
        }
      ],
      temperature: 0.2
    });

    const contractType = completion.choices[0].message.content.toLowerCase().trim();
    
    console.log(`✅ Vertragstyp erkannt: ${contractType}`);

    res.json({
      contractType: contractType,
      success: true,
      textLength: text.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Analyze-Type Public Error:", error);
    
    // Spezifische OpenAI Fehlerbehandlung
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: "OpenAI Rate Limit erreicht",
        message: "Zu viele Anfragen. Bitte versuchen Sie es in einer Minute erneut."
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(503).json({
        error: "OpenAI API Fehler", 
        message: "Service temporär nicht verfügbar."
      });
    }

    res.status(500).json({
      error: "Fehler bei Vertragstyp-Erkennung",
      message: "Ein unerwarteter Fehler ist aufgetreten."
    });
  }
});

// 🔍 Health Check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "analyze-type",
    routes: {
      authenticated: "/api/analyze-type (für Dashboard, normale Analyse etc.)",
      public: "/api/analyze-type/public (für Better Contracts)"
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
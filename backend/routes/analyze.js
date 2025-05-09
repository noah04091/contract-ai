// 📁 routes/analyze.js
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");
const htmlPdf = require("html-pdf-node");

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

router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "❌ Keine Datei hochgeladen." });

  try {
    // 📊 Nutzer auslesen + Limit prüfen
    const usersCollection = client.db("contract_ai").collection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    const plan = user.subscriptionPlan || "free";
    const count = user.analysisCount ?? 0;

    let limit = 10;
    if (plan === "business") limit = 50;
    if (plan === "premium") limit = Infinity;

    if (count >= limit) {
      return res.status(403).json({
        message: "❌ Analyse-Limit erreicht. Bitte Paket upgraden.",
      });
    }

    // 📥 PDF auslesen
    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);
    const contractText = parsed.text.slice(0, 4000);

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

    // 💬 OpenAI-Aufruf
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Du bist ein erfahrener Vertragsanalyst." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });

    const aiMessage = completion.choices[0].message.content || "";
    const jsonStart = aiMessage.indexOf("{");
    const jsonEnd = aiMessage.lastIndexOf("}") + 1;
    const jsonString = aiMessage.slice(jsonStart, jsonEnd);
    const result = JSON.parse(jsonString);

    // 📦 In DB speichern
    const analysis = {
      userId: req.user.userId,
      contractName: req.file.originalname,
      createdAt: new Date(),
      ...result,
    };

    const inserted = await analysisCollection.insertOne(analysis);

    // ✅ Analyse-Zähler hochzählen
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { analysisCount: 1 } }
    );

    // 📄 PDF generieren
    const pdfHtml = `
      <h2>Vertragsanalyse</h2>
      <p><strong>Zusammenfassung:</strong> ${result.summary}</p>
      <p><strong>Rechtssicherheit:</strong> ${result.legalAssessment}</p>
      <p><strong>Optimierung:</strong> ${result.suggestions}</p>
      <p><strong>Vergleich:</strong> ${result.comparison}</p>
      <p><strong>Contract Score:</strong> ${result.contractScore}/100</p>
    `;

    const filePath = `./downloads/contract-analysis-${req.user.userId}-${Date.now()}.pdf`;
    const file = { content: pdfHtml };

    await htmlPdf.generatePdf(file, { format: "A4", path: filePath });

    await analysisCollection.updateOne(
      { _id: inserted.insertedId },
      { $set: { pdfPath: filePath.replace("./", "/") } }
    );

    res.json({ ...result, analysisId: inserted.insertedId, pdfPath: filePath.replace("./", "/") });
  } catch (error) {
    console.error("❌ Fehler bei Analyse:", error.message);
    res.status(500).json({ message: "Fehler bei der Analyse." });
  } finally {
    try {
      if (req.file) fs.unlinkSync(req.file.path);
    } catch (cleanupErr) {
      console.warn("⚠️ Fehler beim Löschen der Datei:", cleanupErr.message);
    }
  }
});

// 📚 Analyseverlauf abrufen
router.get("/history", verifyToken, async (req, res) => {
  try {
    const history = await analysisCollection
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    res.json(history);
  } catch (err) {
    console.error("❌ Fehler beim Abrufen der Analyse-Historie:", err.message);
    res.status(500).json({ message: "Fehler beim Abrufen der Historie." });
  }
});

module.exports = router;

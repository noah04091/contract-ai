// 📁 backend/routes/chatWithContract.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const pdfParse = require("pdf-parse");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");
const { saveContract } = require("../services/saveContract"); // 🆕 Destructured Import

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const chatMemory = new Map(); // 🧠 RAM-Speicher für Chat-Verlauf

// 🔗 MongoDB verbinden
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);

let usersCollection;
(async () => {
  try {
    await client.connect();
    usersCollection = client.db("contract_ai").collection("users");
    console.log("🧠 Verbunden mit users (chatWithContract)");
  } catch (err) {
    console.error("❌ MongoDB-Fehler:", err);
  }
})();

// 📥 Vertrag hochladen
router.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });

  try {
    const buffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text.substring(0, 10000); // Max 10k Zeichen zur Sicherheit

    // 🧠 RAM-Speicher vorbereiten
    chatMemory.set(req.user.userId, {
      contractText: text,
      messages: [],
    });

    // 🗃️ In contracts speichern
    await saveContract({
      userId: req.user.userId,
      fileName: req.file.originalname,
      toolUsed: "chat",
      filePath: `/uploads/${req.file.filename}`,
      extraRefs: {
        chatEnabled: true
      }
    });

    res.json({ message: "Vertrag geladen. Du kannst jetzt Fragen stellen." });
  } catch (err) {
    console.error("❌ Fehler beim Einlesen:", err);
    res.status(500).json({ message: "Fehler beim Hochladen des Vertrags" });
  }
});

// 💬 Frage stellen
router.post("/ask", verifyToken, async (req, res) => {
  const { question } = req.body;
  const chatContext = chatMemory.get(req.user.userId);

  if (!chatContext || !chatContext.contractText) {
    return res.status(400).json({ message: "Kein Vertrag im Chat-Speicher. Bitte zuerst hochladen." });
  }

  try {
    // 📊 Nutzer & Limits prüfen
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

    const messages = [
      { role: "system", content: `Hier ist ein Vertrag. Beantworte Fragen dazu kurz und präzise.\n\n${chatContext.contractText}` },
      ...chatContext.messages,
      { role: "user", content: question },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.4,
    });

    const answer = completion.choices[0].message.content;

    chatContext.messages.push({ role: "user", content: question });
    chatContext.messages.push({ role: "assistant", content: answer });

    // ✅ Count erhöhen
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { analysisCount: 1 } }
    );

    res.json({ answer });
  } catch (err) {
    console.error("❌ Fehler im Chat:", err);
    res.status(500).json({ message: "Fehler bei der Anfrage." });
  }
});

module.exports = router;

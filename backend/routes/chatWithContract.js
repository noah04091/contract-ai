// 📁 backend/routes/chatWithContract.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const pdfParse = require("pdf-parse");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const chatMemory = new Map(); // 🧠 Einfache Chat-Verlauf-Speicherung im RAM (für Demo)

router.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });

  try {
    const buffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text.substring(0, 10000); // Max 10k Zeichen zur Sicherheit

    // 🧠 Chat-Kontext speichern
    chatMemory.set(req.user.userId, {
      contractText: text,
      messages: [],
    });

    res.json({ message: "Vertrag geladen. Du kannst jetzt Fragen stellen." });
  } catch (err) {
    console.error("❌ Fehler beim Einlesen:", err);
    res.status(500).json({ message: "Fehler beim Hochladen des Vertrags" });
  }
});

router.post("/ask", verifyToken, async (req, res) => {
  const { question } = req.body;
  const chatContext = chatMemory.get(req.user.userId);

  if (!chatContext || !chatContext.contractText) {
    return res.status(400).json({ message: "Kein Vertrag im Chat-Speicher. Bitte zuerst hochladen." });
  }

  try {
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

    // 🔁 Verlauf speichern
    chatContext.messages.push({ role: "user", content: question });
    chatContext.messages.push({ role: "assistant", content: answer });

    res.json({ answer });
  } catch (err) {
    console.error("❌ Fehler im Chat:", err);
    res.status(500).json({ message: "Fehler bei der Anfrage." });
  }
});

module.exports = router;

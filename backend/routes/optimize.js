// 📁 routes/optimize.js
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const { ObjectId } = require("mongodb");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const saveContract = require("../services/saveContract"); // ✅ korrekt importiert

const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 📤 Exportiert als Funktion mit Übergabe von `db`
module.exports = (db) => {
  const router = express.Router();
  const usersCollection = db.collection("users");

  router.post("/", verifyToken, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "❌ Keine Datei hochgeladen." });

    try {
      // 📊 Nutzer + Limit prüfen
      const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
      const plan = user.subscriptionPlan || "free";
      const count = user.analysisCount ?? 0;

      let limit = 10;
      if (plan === "business") limit = 50;
      if (plan === "premium") limit = Infinity;

      if (count >= limit) {
        return res.status(403).json({ message: "❌ Analyse-Limit erreicht. Bitte Paket upgraden." });
      }

      // 📄 PDF verarbeiten
      const buffer = fs.readFileSync(req.file.path);
      const parsed = await pdfParse(buffer);
      const contractText = parsed.text.slice(0, 4000); // GPT-Grenze

      const prompt = `
Du bist ein Vertragsberater. Optimiere den folgenden Vertrag:

${contractText}

Antwort im folgenden JSON-Format:

[
  {
    "problem": "Was ist schlecht/unvorteilhaft?",
    "suggestion": "Was wäre eine bessere Formulierung oder Alternative?"
  }
]
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Du bist ein erfahrener Vertragsoptimierer." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      });

      const aiText = completion.choices[0].message.content || "";
      const jsonStart = aiText.indexOf("[");
      const jsonEnd = aiText.lastIndexOf("]") + 1;
      const jsonString = aiText.slice(jsonStart, jsonEnd);
      const optimizations = JSON.parse(jsonString);

      // 🧠 Vertrag speichern
      await saveContract(db, {
        userId: req.user.userId,
        fileName: req.file.originalname,
        toolUsed: "optimize",
        filePath: `/uploads/${req.file.filename}`,
        extraRefs: { optimizations }
      });

      // 🔢 Analyse-Zähler erhöhen
      await usersCollection.updateOne(
        { _id: user._id },
        { $inc: { analysisCount: 1 } }
      );

      res.json({ optimizations });
    } catch (error) {
      console.error("❌ Fehler bei Optimierung:", error.message);
      res.status(500).json({ message: "Fehler bei Optimierung." });
    } finally {
      if (req.file) fs.unlinkSync(req.file.path); // Datei bereinigen
    }
  });

  return router;
};

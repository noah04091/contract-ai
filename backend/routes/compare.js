// 📁 routes/compare.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");

const router = express.Router();
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔗 MongoDB-Verbindung
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let usersCollection;

(async () => {
  try {
    await client.connect();
    usersCollection = client.db("contract_ai").collection("users");
    console.log("📂 Verbunden mit users (compare)");
  } catch (err) {
    console.error("❌ MongoDB-Fehler (compare.js):", err);
  }
})();

router.post("/", verifyToken, upload.fields([{ name: "file1" }, { name: "file2" }]), async (req, res) => {
  if (!req.files || !req.files.file1 || !req.files.file2) {
    return res.status(400).json({ message: "❌ Beide Dateien müssen hochgeladen werden." });
  }

  try {
    // 🔐 Nutzer + Limit prüfen
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

    // 📥 PDF-Inhalte extrahieren
    const buffer1 = fs.readFileSync(req.files.file1[0].path);
    const buffer2 = fs.readFileSync(req.files.file2[0].path);

    const text1 = (await pdfParse(buffer1)).text.slice(0, 4000);
    const text2 = (await pdfParse(buffer2)).text.slice(0, 4000);

    const prompt = `Vergleiche die beiden Verträge objektiv auf Fairness, Unterschiede, Vorteile und Nachteile.
Vertrag A:
${text1}

Vertrag B:
${text2}

Antwort im Format:
{
  "fairness": "...",
  "differences": "...",
  "advantagesA": "...",
  "advantagesB": "...",
  "summary": "..."
}`;

    // 💬 GPT-Analyse
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Du bist ein objektiver Vertragsanalyst." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const response = completion.choices[0].message.content || "";
    const jsonStart = response.indexOf("{");
    const jsonEnd = response.lastIndexOf("}") + 1;
    const jsonText = response.slice(jsonStart, jsonEnd);
    const result = JSON.parse(jsonText);

    // ✅ Count erhöhen
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { analysisCount: 1 } }
    );

    res.json({ result });
  } catch (err) {
    console.error("❌ Fehler beim Vergleich:", err);
    res.status(500).json({ message: "Fehler beim Vergleich." });
  } finally {
    if (req.files.file1) fs.unlinkSync(req.files.file1[0].path);
    if (req.files.file2) fs.unlinkSync(req.files.file2[0].path);
  }
});

module.exports = router;

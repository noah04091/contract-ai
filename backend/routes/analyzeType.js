// 📁 backend/routes/analyzeType.js
const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const saveContract = require("../services/saveContract"); // 🆕 Import

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

router.post("/", verifyToken, async (req, res) => {
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: "❌ Kein Text übergeben." });

  try {
    // 📊 Nutzer + Plan + Limit prüfen
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

module.exports = router;

// 📁 backend/routes/analyzeType.js
const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/", async (req, res) => {
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: "Kein Text übergeben." });

  try {
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
    res.json({ contractType });
  } catch (err) {
    console.error("GPT-Fehler:", err.message);
    res.status(500).json({ error: "Fehler bei der Vertragstyp-Erkennung." });
  }
});

module.exports = router;

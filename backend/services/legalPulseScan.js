// 📁 backend/services/legalPulseScan.js
const { MongoClient, ObjectId } = require("mongodb");
const { OpenAI } = require("openai");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URI);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔁 Helper für den Prompt
function buildPrompt(contractText) {
  return `
Du bist ein KI-Vertragsprüfer. Scanne den folgenden Vertrag auf rechtliche Risiken, neue Gesetzeslagen und potenzielle Optimierungen. Gib die Antwort als kompaktes JSON-Objekt zurück mit:

- riskScore (0–100): Einschätzung des Risikos
- riskSummary: 1-2 Sätze über mögliche Schwächen
- lawInsights: Liste von Gesetzesänderungen oder Klauseln mit Bezug
- marketSuggestions: Liste möglicher besserer Angebote (falls erkennbar)

Vertragstext:
${contractText.slice(0, 5000)}

Antwort:
{
  "riskScore": 78,
  "riskSummary": "...",
  "lawInsights": ["..."],
  "marketSuggestions": ["..."]
}`;
}

module.exports = async function runLegalPulseScan() {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    const contractsCol = db.collection("contracts");

    const contracts = await contractsCol.find({ toolUsed: { $ne: "generate" } }).toArray();

    for (const contract of contracts) {
      if (!contract.filePath) continue;

      const fs = require("fs");
      const pdfParse = require("pdf-parse");
      const buffer = fs.readFileSync("." + contract.filePath);
      const parsed = await pdfParse(buffer);

      const prompt = buildPrompt(parsed.text);

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Du bist ein KI-Vertragsprüfer." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
      });

      const response = completion.choices[0].message.content;
      const jsonStart = response.indexOf("{");
      const jsonEnd = response.lastIndexOf("}") + 1;
      const jsonText = response.slice(jsonStart, jsonEnd);
      const result = JSON.parse(jsonText);

      await contractsCol.updateOne(
        { _id: new ObjectId(contract._id) },
        {
          $set: {
            "legalPulse.riskScore": result.riskScore,
            "legalPulse.riskSummary": result.riskSummary,
            "legalPulse.lawInsights": result.lawInsights,
            "legalPulse.marketSuggestions": result.marketSuggestions,
            "legalPulse.lastChecked": new Date()
          }
        }
      );

      console.log(`✅ Legal Pulse Scan für ${contract.name || contract._id} abgeschlossen.`);
    }
  } catch (err) {
    console.error("❌ Fehler im Legal Pulse Scan:", err.message);
  } finally {
    await client.close();
  }
};

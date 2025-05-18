// 📁 backend/services/saveContract.js
const { ObjectId } = require("mongodb");
const database = require("../config/database");

async function saveContract({
  userId,
  fileName,
  toolUsed,
  filePath,
  extraRefs = {},
  legalPulse = null
}) {
  try {
    const contractDoc = {
      userId: new ObjectId(userId),
      name: fileName,
      toolUsed,
      filePath,
      createdAt: new Date(),
      status: "aktiv",
      expiryDate: null,
      // 🔗 Legal Pulse Placeholder
      legalPulse: legalPulse || {
        riskScore: null,
        riskSummary: '',
        lastChecked: null,
        lawInsights: [],
        marketSuggestions: []
      },
      // ⬇️ Extra-Felder direkt anhängen (z. B. content, isGenerated)
      ...extraRefs
    };

    const result = await database.insertOne('contracts', contractDoc);
    console.log("📁 Vertrag gespeichert:", result.insertedId);
    return result;
  } catch (err) {
    console.error("❌ Fehler beim Speichern des Vertrags:", err.message);
    throw err;
  }
}

module.exports = saveContract;
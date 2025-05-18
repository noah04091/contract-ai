// 📁 backend/services/saveContract.js
const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

async function saveContract({
  userId,
  fileName,
  toolUsed,
  filePath,
  extraRefs = {},
  legalPulse = null
}) {
  let client;
  try {
    // Eigene MongoDB-Verbindung aufbauen
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const contractsCollection = client.db("contract_ai").collection("contracts");

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

    const result = await contractsCollection.insertOne(contractDoc);
    console.log("📁 Vertrag gespeichert:", result.insertedId);
    return result;
  } catch (err) {
    console.error("❌ Fehler beim Speichern des Vertrags:", err.message);
    throw err;
  } finally {
    // Verbindung schließen
    if (client) {
      await client.close();
    }
  }
}

module.exports = saveContract;
// 📁 backend/services/legalPulseScan.js (Updated with Real AI)
const { MongoClient, ObjectId } = require("mongodb");
const AILegalPulse = require("./aiLegalPulse");

async function runLegalPulseScan() {
  console.log("🧠 Starte AI-powered Legal Pulse Scan...");
  
  let client;
  try {
    // MongoDB-Verbindung
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const contractsCollection = client.db("contract_ai").collection("contracts");
    
    // AI Legal Pulse Engine initialisieren
    const aiLegalPulse = new AILegalPulse();
    
    // Finde Verträge für Analyse
    const contracts = await contractsCollection.find({
      $or: [
        // Noch nie analysiert
        { 'legalPulse.lastChecked': null },
        { 'legalPulse.lastChecked': { $exists: false } },
        { 'legalPulse.aiGenerated': { $ne: true } }, // Nicht AI-generiert
        // Älter als 7 Tage
        { 
          'legalPulse.lastChecked': { 
            $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
          }
        }
      ]
    }).toArray();

    console.log(`🔍 Gefunden: ${contracts.length} Verträge für AI Legal Pulse Scan`);

    if (contracts.length === 0) {
      console.log("✅ Alle Verträge sind bereits aktuell analysiert!");
      return;
    }

    // Batch-Analyse durchführen (max 3 gleichzeitig wegen OpenAI Rate Limits)
    const aiResults = await aiLegalPulse.analyzeBatch(contracts, 3);
    
    // Ergebnisse in Datenbank speichern
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < contracts.length; i++) {
      try {
        const contract = contracts[i];
        const aiResult = aiResults[i];
        
        // Update Contract in Database
        await contractsCollection.updateOne(
          { _id: contract._id },
          {
            $set: {
              'legalPulse': aiResult
            }
          }
        );
        
        successCount++;
        console.log(`✅ AI Legal Pulse für "${contract.name}" aktualisiert (Score: ${aiResult.riskScore})`);
        
        // Rate Limiting zwischen Updates
        if (i < contracts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Fehler beim Speichern für "${contracts[i].name}":`, error);
      }
    }
    
    // Statistiken loggen
    console.log(`\n🎉 AI Legal Pulse Scan abgeschlossen!`);
    console.log(`✅ Erfolgreich: ${successCount} Verträge`);
    console.log(`❌ Fehler: ${errorCount} Verträge`);
    console.log(`🧠 AI-Engine: Eingesetzt`);
    
    // Scan-Statistiken in separater Collection speichern
    try {
      const scanStatsCollection = client.db("contract_ai").collection("scan_stats");
      await scanStatsCollection.insertOne({
        scanType: 'legal_pulse_ai',
        timestamp: new Date(),
        contractsProcessed: contracts.length,
        successCount,
        errorCount,
        aiPowered: true,
        engine: 'OpenAI GPT-4'
      });
    } catch (statsError) {
      console.error('❌ Fehler beim Speichern der Scan-Statistiken:', statsError);
    }
    
  } catch (error) {
    console.error("❌ Kritischer Fehler beim AI Legal Pulse Scan:", error);
    throw error;
  } finally {
    // Verbindung schließen
    if (client) {
      await client.close();
    }
  }
}

// Export für Cron-Job
module.exports = runLegalPulseScan;

// Optional: Manueller Scan für einzelnen Vertrag
async function scanSingleContract(contractId) {
  let client;
  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const contractsCollection = client.db("contract_ai").collection("contracts");
    
    // Vertrag laden
    const contract = await contractsCollection.findOne({ _id: new ObjectId(contractId) });
    if (!contract) {
      throw new Error(`Vertrag ${contractId} nicht gefunden`);
    }
    
    // AI-Analyse durchführen
    const aiLegalPulse = new AILegalPulse();
    const aiResult = await aiLegalPulse.analyzeContract(contract);
    
    // In DB speichern
    await contractsCollection.updateOne(
      { _id: contract._id },
      { $set: { 'legalPulse': aiResult } }
    );
    
    console.log(`✅ Einzelanalyse für "${contract.name}" abgeschlossen (Score: ${aiResult.riskScore})`);
    return aiResult;
    
  } catch (error) {
    console.error(`❌ Fehler bei Einzelanalyse für ${contractId}:`, error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Export der Einzelanalyse-Funktion
runLegalPulseScan.scanSingle = scanSingleContract;
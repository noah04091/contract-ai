// 📁 backend/services/legalPulseScan.js (Updated with Real AI + Connection Pool)
const { ObjectId } = require("mongodb");
const AILegalPulse = require("./aiLegalPulse");
const database = require("../config/database");

async function runLegalPulseScan() {
  console.log("🧠 Starte AI-powered Legal Pulse Scan...");

  try {
    // MongoDB-Verbindung via Connection Pool (Singleton)
    const db = await database.connect();
    const contractsCollection = db.collection("contracts");

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
      const scanStatsCollection = db.collection("scan_stats");
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
  }
  // Connection Pool bleibt offen (wird vom Singleton verwaltet)
}

// Export für Cron-Job
module.exports = runLegalPulseScan;

// Optional: Manueller Scan für einzelnen Vertrag
async function scanSingleContract(contractId) {
  const startTime = Date.now();
  try {
    const db = await database.connect();
    const contractsCollection = db.collection("contracts");

    // Vertrag laden
    const contract = await contractsCollection.findOne({ _id: new ObjectId(contractId) });
    if (!contract) {
      throw new Error(`Vertrag ${contractId} nicht gefunden`);
    }

    console.log(`⏱️ [LEGAL-PULSE] Start | contract=${contractId} | user=${contract.userId || 'unknown'} | name="${contract.name}"`);

    // AI-Analyse durchführen
    const aiLegalPulse = new AILegalPulse();
    const aiResult = await aiLegalPulse.analyzeContract(contract);

    // In DB speichern
    await contractsCollection.updateOne(
      { _id: contract._id },
      { $set: { 'legalPulse': aiResult } }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ [LEGAL-PULSE] Done in ${duration}s | riskScore=${aiResult.riskScore} | topRisks=${aiResult.topRisks?.length || 0} | contract=${contractId}`);
    return aiResult;

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ [LEGAL-PULSE] Error after ${duration}s | contract=${contractId} |`, error.message);
    throw error;
  }
  // Connection Pool bleibt offen (wird vom Singleton verwaltet)
}

// Export der Einzelanalyse-Funktion
runLegalPulseScan.scanSingle = scanSingleContract;

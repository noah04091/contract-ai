// 📁 backend/services/legalPulseScan.js (Updated with Real AI + Connection Pool)
const { ObjectId } = require("mongodb");
const AILegalPulse = require("./aiLegalPulse");
const database = require("../config/database");

/**
 * Preserve user risk management data (status, comments, edits) during re-analysis.
 * Matches old risks to new risks by title similarity, then copies over user data.
 */
function preserveRiskManagement(oldLegalPulse, newResult) {
  if (!oldLegalPulse?.topRisks || !newResult?.topRisks) return newResult;

  const oldRisks = oldLegalPulse.topRisks;
  const hasUserData = oldRisks.some(r => r.status || r.userComment || r.userEdits);
  if (!hasUserData) return newResult;

  // Build a map of old risks by normalized title for matching
  const normalize = (str) => (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const oldRiskMap = new Map();
  for (const risk of oldRisks) {
    const key = normalize(risk.title);
    if (key) oldRiskMap.set(key, risk);
  }

  // Transfer user data to matching new risks
  const mergedRisks = newResult.topRisks.map(newRisk => {
    const key = normalize(newRisk.title);
    const oldRisk = oldRiskMap.get(key);
    if (oldRisk) {
      const merged = { ...newRisk };
      if (oldRisk.status) merged.status = oldRisk.status;
      if (oldRisk.resolvedAt) merged.resolvedAt = oldRisk.resolvedAt;
      if (oldRisk.userComment) merged.userComment = oldRisk.userComment;
      if (oldRisk.userEdits) merged.userEdits = oldRisk.userEdits;
      return merged;
    }
    return newRisk;
  });

  // Recalculate adjusted scores
  const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  let totalWeight = 0;
  let resolvedWeight = 0;
  for (const risk of mergedRisks) {
    const sev = risk.userEdits?.severity || risk.severity || 'medium';
    const w = severityWeight[sev] || 2;
    totalWeight += w;
    if (risk.status === 'resolved' || risk.status === 'accepted') {
      resolvedWeight += w;
    }
  }

  const merged = { ...newResult, topRisks: mergedRisks };
  if (totalWeight > 0 && resolvedWeight > 0) {
    const ratio = Math.min(resolvedWeight / totalWeight, 0.7);
    merged.adjustedRiskScore = Math.round(newResult.riskScore * (1 - ratio));
    if (newResult.healthScore != null) {
      merged.adjustedHealthScore = Math.min(100, Math.round(newResult.healthScore + (100 - newResult.healthScore) * ratio));
    }
  }

  return merged;
}

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

        // Preserve user risk management data from previous analysis
        const mergedResult = preserveRiskManagement(contract.legalPulse, aiResult);

        // Update Contract in Database
        await contractsCollection.updateOne(
          { _id: contract._id },
          {
            $set: {
              'legalPulse': mergedResult
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

    // Preserve user risk management data from previous analysis
    const mergedResult = preserveRiskManagement(contract.legalPulse, aiResult);

    // In DB speichern
    await contractsCollection.updateOne(
      { _id: contract._id },
      { $set: { 'legalPulse': mergedResult } }
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

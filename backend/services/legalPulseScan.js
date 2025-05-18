// 📁 backend/services/legalPulseScan.js
const database = require("../config/database");
const { ObjectId } = require("mongodb");

async function runLegalPulseScan() {
  console.log("🧠 Starte Legal Pulse Scan...");
  
  try {
    // Finde alle Verträge ohne aktuelle Legal Pulse Analyse
    const contracts = await database.find('contracts', {
      $or: [
        { 'legalPulse.lastChecked': null },
        { 'legalPulse.lastChecked': { $exists: false } },
        { 
          'legalPulse.lastChecked': { 
            $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Älter als 7 Tage
          }
        }
      ]
    });

    console.log(`🔍 Gefunden: ${contracts.length} Verträge für Legal Pulse Scan`);

    for (const contract of contracts) {
      try {
        // Simuliere Legal Pulse Analyse (später mit echter AI)
        const legalPulseResult = await performLegalPulseAnalysis(contract);
        
        // Update Contract mit Legal Pulse Daten
        await database.updateOne(
          'contracts',
          { _id: contract._id },
          {
            $set: {
              'legalPulse.riskScore': legalPulseResult.riskScore,
              'legalPulse.riskSummary': legalPulseResult.summary,
              'legalPulse.lastChecked': new Date(),
              'legalPulse.lawInsights': legalPulseResult.lawInsights,
              'legalPulse.marketSuggestions': legalPulseResult.marketSuggestions,
              'legalPulse.riskFactors': legalPulseResult.riskFactors,
              'legalPulse.legalRisks': legalPulseResult.legalRisks,
              'legalPulse.recommendations': legalPulseResult.recommendations,
              'legalPulse.analysisDate': new Date()
            }
          }
        );

        console.log(`✅ Legal Pulse für Vertrag ${contract.name} aktualisiert (Score: ${legalPulseResult.riskScore})`);
      } catch (error) {
        console.error(`❌ Fehler bei Legal Pulse für Vertrag ${contract._id}:`, error);
      }
    }

    console.log("🎉 Legal Pulse Scan abgeschlossen!");
  } catch (error) {
    console.error("❌ Fehler beim Legal Pulse Scan:", error);
  }
}

// Simulierte Legal Pulse Analyse (später durch echte AI ersetzen)
async function performLegalPulseAnalysis(contract) {
  // Simuliere Verarbeitungszeit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Basis-Risk-Score basierend auf Vertragsattributen
  let riskScore = Math.floor(Math.random() * 100);
  
  // Anpassungen basierend auf Vertragsdaten
  if (contract.status === 'Abgelaufen') riskScore = Math.min(riskScore + 30, 100);
  if (contract.status === 'Bald ablaufend') riskScore = Math.min(riskScore + 15, 100);
  
  const riskLevel = riskScore >= 70 ? 'low' : riskScore >= 40 ? 'medium' : 'high';

  return {
    riskScore,
    summary: generateRiskSummary(riskLevel, contract),
    lawInsights: generateLawInsights(riskLevel),
    marketSuggestions: generateMarketSuggestions(riskLevel),
    riskFactors: generateRiskFactors(riskLevel, contract),
    legalRisks: generateLegalRisks(riskLevel),
    recommendations: generateRecommendations(riskLevel, contract)
  };
}

function generateRiskSummary(riskLevel, contract) {
  const summaries = {
    low: `Der Vertrag "${contract.name}" zeigt geringe Risiken. Die Vertragskonditionen sind größtenteils vorteilhaft und rechtlich solide.`,
    medium: `Der Vertrag "${contract.name}" weist mittlere Risiken auf. Einige Klauseln sollten überprüft und möglicherweise nachverhandelt werden.`,
    high: `Der Vertrag "${contract.name}" birgt erhöhte Risiken. Dringende Überprüfung und Nachbesserung der Vertragskonditionen empfohlen.`
  };
  return summaries[riskLevel];
}

function generateRiskFactors(riskLevel, contract) {
  const allFactors = [
    'Unklare Kündigungsklauseln',
    'Hohe Vertragsstrafen',
    'Fehlende Haftungsbegrenzung',
    'Automatische Verlängerungsklauseln',
    'Unausgewogene Leistungspflichten',
    'Fehlende Datenschutzbestimmungen',
    'Ungünstige Zahlungskonditionen'
  ];
  
  const factorCount = riskLevel === 'high' ? 4 : riskLevel === 'medium' ? 2 : 1;
  return allFactors.slice(0, factorCount);
}

function generateLegalRisks(riskLevel) {
  const allRisks = [
    'Mögliche Verstöße gegen DSGVO-Bestimmungen',
    'Unklare Gerichtsstandsvereinbarungen',
    'Risiko von Vertragsstrafen bei vorzeitiger Kündigung',
    'Fehlende Compliance mit aktuellen Gesetzen',
    'Unzureichende Gewährleistungsklauseln'
  ];
  
  const riskCount = riskLevel === 'high' ? 3 : riskLevel === 'medium' ? 2 : 1;
  return allRisks.slice(0, riskCount);
}

function generateLawInsights(riskLevel) {
  const allInsights = [
    'BGB §§ 305-310: AGB-Kontrolle erforderlich',
    'DSGVO Art. 28: Auftragsverarbeitungsvertrag prüfen',
    'HGB § 377: Untersuchungs- und Rügepflicht beachten',
    'BGB § 314: Kündigungsrecht bei wichtigem Grund',
    'UWG § 7: Irreführende Werbung vermeiden'
  ];
  
  const insightCount = riskLevel === 'high' ? 3 : 2;
  return allInsights.slice(0, insightCount);
}

function generateMarketSuggestions(riskLevel) {
  const allSuggestions = [
    'Marktübliche Zahlungsziele von 30 Tagen vereinbaren',
    'Branchenstandard-Haftungsobergrenzen einführen',
    'Flexible Kündigungsfristen entsprechend Branchennorm',
    'Preisanpassungsklauseln für längere Vertragslaufzeiten',
    'Service Level Agreements nach Industriestandard'
  ];
  
  const suggestionCount = riskLevel === 'high' ? 3 : 2;
  return allSuggestions.slice(0, suggestionCount);
}

function generateRecommendations(riskLevel, contract) {
  const baseRecommendations = [
    'Regelmäßige Vertragsüberprüfung alle 12 Monate',
    'Rechtliche Beratung bei Vertragsänderungen',
    'Dokumentation aller Vertragsmodifikationen'
  ];
  
  if (riskLevel === 'high') {
    baseRecommendations.unshift(
      'Sofortige rechtliche Prüfung empfohlen',
      'Nachverhandlung problematischer Klauseln'
    );
  } else if (riskLevel === 'medium') {
    baseRecommendations.unshift(
      'Überprüfung von Risikoklauseln binnen 3 Monaten'
    );
  }
  
  return baseRecommendations.slice(0, 3);
}

module.exports = runLegalPulseScan;
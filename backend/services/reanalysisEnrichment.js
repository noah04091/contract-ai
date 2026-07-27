// 🔗 Re-Analyse-Zusatz-Aufbereitung (27.07.2026)
//
// Hintergrund: Die blockierende Route POST /contracts/:id/analyze macht NACH der
// eigentlichen KI-Analyse zwei Zusatz-Schritte, die die Upload-Pipeline selbst NICHT
// erledigt:
//   1) legalPulse-Objekt aus den Analyse-Ergebnissen ableiten (reiches Mapping)
//   2) Onboarding-Häkchen firstAnalysisComplete setzen
//
// Wenn wir diese Route später auf den bewährten Async-Job umstellen (gegen den
// Cloudflare-~100s-Schnitt bei langen Läufen), MUSS derselbe Schritt im Hintergrund-Job
// laufen, sonst verliert die Re-Analyse gegenüber heute Daten. Damit BEIDE Pfade
// (blockierend UND async) exakt dasselbe tun, lebt das Mapping ab jetzt hier — EINE Quelle.
//
// Reines Umsortieren: 1:1 aus contracts.js herausgelöst, kein Verhaltensänderung.

/**
 * Leitet das legalPulse-Objekt aus einem bereits analysierten Vertrag ab und setzt
 * das Onboarding-Häkchen. Best-effort: Fehler werden geloggt, aber nie geworfen,
 * damit die Analyse-Antwort dadurch nie kippt (identisch zum bisherigen Verhalten).
 *
 * @param {object} deps
 * @param {import('mongodb').Collection} deps.contractsCollection
 * @param {import('mongodb').Collection} deps.usersCollection
 * @param {object} deps.aiLegalPulse            Instanz mit calculateHealthScore()
 * @param {Function} deps.ObjectId              mongodb ObjectId-Konstruktor
 * @param {string} deps.contractId              Vertrags-_id als String
 * @param {string} deps.userId                  Nutzer-_id als String
 * @param {string} [deps.requestId]             für Log-Korrelation
 * @param {object} [deps.analyzedContract]      optional bereits geladener Vertrag (spart 1 Read)
 */
async function applyReanalysisEnrichment({
  contractsCollection,
  usersCollection,
  aiLegalPulse,
  ObjectId,
  contractId,
  userId,
  requestId = 'ENRICH',
  analyzedContract = null,
}) {
  const id = contractId;

  // ⚡ LEGAL PULSE: initiales legalPulse aus den Analyse-Ergebnissen ableiten.
  // (Die Upload-Pipeline füllt dieses reiche Objekt nicht — wir behalten das Mapping hier,
  //  damit die Re-Analyse gegenüber vorher keine Daten verliert. Quelle: gespeicherter Vertrag.)
  try {
    const contract = analyzedContract || await contractsCollection.findOne({ _id: new ObjectId(id) });
    const contractScoreRaw = contract?.contractScore || 0;
    const initialRiskScore = Math.max(0, Math.min(100, 100 - contractScoreRaw));
    const initialHealthScore = aiLegalPulse.calculateHealthScore(initialRiskScore, { uploadedAt: new Date() });
    const initialTopRisks = (contract?.criticalIssues || []).map(issue => ({
      title: issue.title || 'Kritischer Punkt',
      description: issue.description || '',
      severity: issue.impact === 'high' || issue.severity === 'high' ? 'high' : 'medium',
      impact: issue.impact || '',
      solution: issue.recommendation || issue.action || ''
    }));
    const initialRecommendations = (contract?.recommendations || []).map(rec =>
      typeof rec === 'string'
        ? { title: rec, description: rec, priority: 'medium', effort: 'mittel', impact: 'mittel' }
        : rec
    );
    const initialLegalPulse = {
      riskScore: initialRiskScore,
      healthScore: initialHealthScore,
      summary: Array.isArray(contract?.summary) ? contract.summary.join(' ') : (contract?.summary || ''),
      lastChecked: new Date(),
      analysisDate: new Date(),
      topRisks: initialTopRisks,
      recommendations: initialRecommendations,
      riskFactors: (contract?.risiken || []).map(r => typeof r === 'string' ? r : r.title || r.description || ''),
      lawInsights: (contract?.legalPulseHooks || []).slice(0, 5),
      marketSuggestions: [],
      scoreHistory: [{ date: new Date(), score: initialRiskScore }],
      analysisHistory: [{
        date: new Date(),
        riskScore: initialRiskScore,
        healthScore: initialHealthScore,
        changes: ['Initiale Analyse aus Vertragsanalyse abgeleitet'],
        triggeredBy: 'contract_analysis'
      }],
      aiGenerated: true,
      status: 'synced'
    };
    await contractsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { legalPulse: initialLegalPulse } });
  } catch (lpErr) {
    console.warn(`⚠️ [${requestId}] Legal Pulse Mapping fehlgeschlagen:`, lpErr.message);
  }

  // Onboarding: firstAnalysisComplete automatisch auf true setzen
  try {
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { 'onboarding.checklist.firstAnalysisComplete': true, updatedAt: new Date() } }
    );
  } catch (onboardingErr) {
    console.warn('⚠️ [ONBOARDING] Checklist update failed:', onboardingErr.message);
  }
}

module.exports = { applyReanalysisEnrichment };

/**
 * Portfolio Aggregator
 * Prepares structured portfolio data for Stage 3 — no AI calls.
 */

const database = require("../../../config/database");
const { ObjectId } = require("mongodb");
const LegalPulseV2Result = require("../../../models/LegalPulseV2Result");
const { fixUtf8Filename } = require("../../../utils/fixUtf8");

// contractAnalyzer stores provider/contractType as either a plain string OR
// an object {name, displayName, confidence, ...}. Normalize at the source so
// downstream grouping code (which calls .toLowerCase) always sees a string.
function toStringOrNull(val) {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object") return val.displayName || val.name || null;
  return null;
}

/**
 * Aggregate portfolio data for cross-contract analysis
 * @param {string} userId
 * @returns {object} Structured portfolio summary
 */
async function aggregatePortfolio(userId) {
  const db = await database.connect();
  const contractsCol = db.collection("contracts");

  // Load all contracts with relevant fields
  const contracts = await contractsCol.find(
    { $or: [{ userId }, { userId: new ObjectId(userId) }] },
    {
      projection: {
        name: 1, title: 1, filename: 1,
        contractType: 1, type: 1,
        endDate: 1, expiryDate: 1, startDate: 1,
        autoRenewal: 1,
        provider: 1, partner: 1, company: 1,
        "legalPulse.healthScore": 1,
        "legalPulse.riskScore": 1,
      },
    }
  ).toArray();

  // Load latest V2 results for each contract
  const contractIds = contracts.map(c => c._id.toString());
  const latestResults = await LegalPulseV2Result.find({
    userId,
    contractId: { $in: contractIds },
    status: "completed",
  }).sort({ createdAt: -1 }).lean();

  // Build result map (latest per contract)
  const resultMap = {};
  for (const r of latestResults) {
    if (!resultMap[r.contractId]) resultMap[r.contractId] = r;
  }

  // Build enriched contract list
  const enriched = contracts.map(c => {
    const id = c._id.toString();
    const v2 = resultMap[id];
    const endDate = c.endDate || c.expiryDate;
    const daysUntilExpiry = endDate
      ? Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id,
      name: fixUtf8Filename(c.name || c.title || c.filename || "Unbenannt"),
      contractType: toStringOrNull(c.contractType) || toStringOrNull(c.type) || v2?.document?.contractType || "unbekannt",
      provider: toStringOrNull(c.provider) || toStringOrNull(c.partner) || toStringOrNull(c.company) || null,
      endDate: endDate || null,
      startDate: c.startDate || null,
      autoRenewal: c.autoRenewal || false,
      daysUntilExpiry,
      score: v2?.scores?.overall || null,
      riskScore: v2?.scores?.risk || null,
      complianceScore: v2?.scores?.compliance || null,
      findingsCount: v2?.clauseFindings?.length || 0,
      criticalFindings: (v2?.clauseFindings || []).filter(f => f.severity === "critical").length,
      highFindings: (v2?.clauseFindings || []).filter(f => f.severity === "high").length,
      topFindings: (v2?.clauseFindings || [])
        .filter(f => f.severity === "critical" || f.severity === "high")
        .slice(0, 3)
        .map(f => ({ title: f.title, severity: f.severity, category: f.category })),
      hasV2Analysis: !!v2,
    };
  });

  // Group by provider
  const byProvider = {};
  for (const c of enriched) {
    if (!c.provider) continue;
    const key = c.provider.toLowerCase().trim();
    if (!byProvider[key]) byProvider[key] = { provider: c.provider, contracts: [] };
    byProvider[key].contracts.push(c);
  }

  // Group by contract type
  const byType = {};
  for (const c of enriched) {
    const key = c.contractType.toLowerCase().trim();
    if (!byType[key]) byType[key] = { type: c.contractType, contracts: [] };
    byType[key].contracts.push(c);
  }

  // Find renewal clusters (contracts expiring within same 60-day window)
  const renewalClusters = [];
  const expiringContracts = enriched
    .filter(c => c.daysUntilExpiry !== null && c.daysUntilExpiry > 0 && c.daysUntilExpiry <= 180)
    .sort((a, b) => (a.daysUntilExpiry || 0) - (b.daysUntilExpiry || 0));

  for (let i = 0; i < expiringContracts.length; i++) {
    const cluster = [expiringContracts[i]];
    for (let j = i + 1; j < expiringContracts.length; j++) {
      if (Math.abs((expiringContracts[j].daysUntilExpiry || 0) - (expiringContracts[i].daysUntilExpiry || 0)) <= 60) {
        cluster.push(expiringContracts[j]);
      }
    }
    if (cluster.length >= 2) {
      renewalClusters.push(cluster);
      i += cluster.length - 1; // skip already clustered
    }
  }

  // Find weak contracts (score < 50)
  const weakContracts = enriched.filter(c => c.score !== null && c.score < 50);

  // Find auto-renewal risks
  const autoRenewalRisks = enriched.filter(c =>
    c.autoRenewal && c.daysUntilExpiry !== null && c.daysUntilExpiry > 0 && c.daysUntilExpiry <= 90
  );

  return {
    totalContracts: enriched.length,
    analyzedContracts: enriched.filter(c => c.hasV2Analysis).length,
    contracts: enriched,
    byProvider: Object.values(byProvider).filter(g => g.contracts.length > 1),
    byType: Object.values(byType).filter(g => g.contracts.length > 1),
    renewalClusters,
    weakContracts,
    autoRenewalRisks,
    averageScore: enriched.filter(c => c.score !== null).length > 0
      ? Math.round(enriched.filter(c => c.score !== null).reduce((sum, c) => sum + (c.score || 0), 0) / enriched.filter(c => c.score !== null).length)
      : null,
  };
}

module.exports = { aggregatePortfolio };

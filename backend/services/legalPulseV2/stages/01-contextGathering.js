/**
 * Stage 1: Context Gathering
 * Collects all relevant context from the database — no AI calls.
 */

const database = require("../../../config/database");
const { ObjectId } = require("mongodb");
const { t } = require("../i18n");

// contractAnalyzer stores provider/contractType as objects {name, displayName, ...}
// This helper always returns a string or null
function toStr(val) {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object") return val.displayName || val.name || null;
  return null;
}

/**
 * Stage 1: Gather contract context from DB
 * @param {string} userId
 * @param {string} contractId
 * @returns {object} Context object
 */
async function runContextGathering(userId, contractId) {
  const db = await database.connect();
  const contractsCol = db.collection("contracts");
  const eventsCol = db.collection("contract_events");

  // Load the target contract
  const contract = await contractsCol.findOne({
    _id: new ObjectId(contractId),
    $or: [{ userId }, { userId: new ObjectId(userId) }],
  });

  if (!contract) {
    // Contract doesn't exist — language can't be determined, default German
    // is consistent with other "not found" errors in the API.
    throw new Error(t("error.contractNotFound", "de", { contractId }));
  }

  // Load all other contracts for portfolio context (lightweight projection)
  const portfolioContracts = await contractsCol.find(
    {
      $or: [{ userId }, { userId: new ObjectId(userId) }],
      _id: { $ne: new ObjectId(contractId) },
    },
    {
      projection: {
        name: 1, title: 1, contractType: 1, type: 1,
        endDate: 1, expiryDate: 1, autoRenewal: 1,
        provider: 1, partner: 1, company: 1,
        "legalPulse.riskScore": 1, "legalPulse.healthScore": 1,
      },
    }
  ).toArray();

  // Load calendar events for this contract
  const events = await eventsCol.find({
    contractId: contractId.toString(),
    $or: [{ userId }, { userId: new ObjectId(userId) }],
  }).toArray().catch(() => []);

  // Load previous Legal Pulse V2 results for trend
  const LegalPulseV2Result = require("../../../models/LegalPulseV2Result");
  const previousResults = await LegalPulseV2Result.find({
    contractId,
    userId,
    status: "completed",
  }).sort({ createdAt: -1 }).limit(5).lean();

  // Calculate days until expiry
  const endDate = contract.endDate || contract.expiryDate;
  let daysUntilExpiry = null;
  if (endDate) {
    daysUntilExpiry = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  }

  // Determine risk trend from previous analyses
  let riskTrend = "stable";
  if (previousResults.length >= 2) {
    const latest = previousResults[0]?.scores?.overall || 50;
    const previous = previousResults[1]?.scores?.overall || 50;
    if (latest - previous >= 5) riskTrend = "improving";
    else if (previous - latest >= 5) riskTrend = "declining";
  }

  // Find related contracts (same provider/partner)
  const contractProvider = toStr(contract.provider) || toStr(contract.partner) || toStr(contract.company);
  const relatedContracts = contractProvider
    ? portfolioContracts
        .filter(c => {
          const p = toStr(c.provider) || toStr(c.partner) || toStr(c.company);
          return p && p.toLowerCase() === contractProvider.toLowerCase();
        })
        .map(c => ({
          name: c.name || c.title || "Unbenannt",
          type: toStr(c.contractType) || toStr(c.type) || "unbekannt",
          endDate: c.endDate || c.expiryDate,
        }))
    : [];

  return {
    contractId: contractId,
    contractName: contract.name || contract.title || contract.filename || "Unbenannt",
    contractType: toStr(contract.contractType) || toStr(contract.type) || null,
    parties: (contract.parties || []).map(p => typeof p === "string" ? p : (p?.name || p?.displayName || String(p))),
    duration: contract.duration || null,
    startDate: contract.startDate || contract.createdAt,
    endDate: endDate || null,
    daysUntilExpiry,
    autoRenewal: contract.autoRenewal || false,
    provider: contractProvider || null,  // already normalized via toStr()
    portfolioSize: portfolioContracts.length + 1,
    relatedContracts,
    previousAnalysisCount: previousResults.length,
    lastAnalysisDate: previousResults[0]?.createdAt || null,
    riskTrend,
    // Internal: pass contract data for text extraction
    _contract: contract,
    _events: events,
  };
}

module.exports = { runContextGathering };

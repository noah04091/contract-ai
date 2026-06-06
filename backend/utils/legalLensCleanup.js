const mongoose = require("mongoose");
const ClauseAnalysis = require("../models/ClauseAnalysis");
const LegalLensProgress = require("../models/LegalLensProgress");

/**
 * Baut einen Filter, der eine ID sowohl als ObjectId ALS AUCH als String matcht.
 * Notwendig, weil userId/contractId in der DB historisch gemischt vorliegen können
 * (siehe CLAUDE.md: "MongoDB userId: can be String OR ObjectId").
 */
function buildIdFilter(field, value) {
  const values = Array.isArray(value) ? value : [value];
  const variants = [];
  for (const v of values) {
    if (v == null) continue;
    if (v instanceof mongoose.Types.ObjectId) {
      variants.push(v, v.toString());
    } else {
      variants.push(v);
      if (mongoose.Types.ObjectId.isValid(String(v))) {
        variants.push(new mongoose.Types.ObjectId(String(v)));
      }
    }
  }
  return { [field]: { $in: variants } };
}

/**
 * Löscht alle Legal-Lens-Daten (Klausel-Analysen + Fortschritt/Decisions/Notizen/Marker)
 * für EINEN Vertrag (contractId) ODER einen kompletten User (userId).
 *
 * Best-effort: Fehler werden geloggt, aber NIE geworfen — das Aufräumen darf den
 * eigentlichen Lösch-Vorgang (Vertrag/Account) niemals blockieren.
 *
 * @param {Object} opts
 * @param {string|ObjectId} [opts.contractId] - Löscht Legal-Lens-Daten dieses Vertrags
 * @param {string|ObjectId} [opts.userId]     - Löscht Legal-Lens-Daten dieses Users
 */
async function cleanupLegalLensData({ contractId, userId } = {}) {
  if (!contractId && !userId) return;

  const filter = contractId
    ? buildIdFilter("contractId", contractId)
    : buildIdFilter("userId", userId);
  const label = contractId ? `contractId=${contractId}` : `userId=${userId}`;

  try {
    const [ca, llp] = await Promise.all([
      ClauseAnalysis.deleteMany(filter),
      LegalLensProgress.deleteMany(filter)
    ]);
    console.log(
      `🧹 [Legal Lens Cleanup] ${label} — Analysen: ${ca.deletedCount}, Fortschritt: ${llp.deletedCount}`
    );
  } catch (err) {
    console.warn(`⚠️ [Legal Lens Cleanup] Fehler bei ${label}:`, err.message);
  }
}

module.exports = { cleanupLegalLensData };

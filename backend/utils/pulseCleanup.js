const mongoose = require("mongoose");

/**
 * 🧹 Legal-Pulse-Cleanup (04.08.2026, "Geister-Verträge"-Fix)
 *
 * Löscht alle Legal-Pulse-V2-Daten (Analyse-Ergebnisse inkl. Handlungsempfehlungen
 * + Radar-Alerts) für EINEN/mehrere Verträge ODER einen kompletten User.
 *
 * WARUM: Die Vertrags-/Konto-Löschung ließ Pulse-Daten bisher komplett stehen.
 * Folgen (in Produktion bewiesen, 04.08.): der Radar überwachte GELÖSCHTE Verträge
 * weiter und erzeugte neue Alerts für sie, der Wochenbericht zählte sie mit
 * ("14 überwacht" vs. 7 echte), die Seite zeigte Meldungen zu Verträgen, die es
 * nicht mehr gibt. Außerdem DSGVO: Klauseltexte/Vertragsnamen sind personenbezogen.
 *
 * Best-effort wie legalLensCleanup: Fehler werden geloggt, NIE geworfen — das
 * Aufräumen darf den eigentlichen Lösch-Vorgang niemals blockieren.
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
 * @param {Object} opts
 * @param {string|ObjectId|Array} [opts.contractId] - Pulse-Daten dieser Verträge löschen
 * @param {string|ObjectId|Array} [opts.userId]     - Pulse-Daten dieses Users löschen
 */
async function cleanupPulseData({ contractId, userId } = {}) {
  if (!contractId && !userId) return;

  const filter = contractId
    ? buildIdFilter("contractId", contractId)
    : buildIdFilter("userId", userId);
  const label = contractId ? `contractId=${contractId}` : `userId=${userId}`;

  try {
    const db = mongoose.connection.db;
    const [results, alerts] = await Promise.all([
      db.collection("legal_pulse_v2_results").deleteMany(filter),
      db.collection("pulse_v2_legal_alerts").deleteMany(filter),
    ]);
    if (results.deletedCount > 0 || alerts.deletedCount > 0) {
      console.log(
        `🧹 [Pulse Cleanup] ${label} — Analysen: ${results.deletedCount}, Alerts: ${alerts.deletedCount}`
      );
    }
  } catch (err) {
    console.warn(`⚠️ [Pulse Cleanup] Fehler bei ${label}:`, err.message);
  }
}

module.exports = { cleanupPulseData };

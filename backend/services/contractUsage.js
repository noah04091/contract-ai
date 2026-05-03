// backend/services/contractUsage.js
// Zentraler Counter für die monatliche Vertragserstellung — über alle Quellen hinweg.
//
// Zählt aus:
//   1. contracts-Collection (Generate + Playbooks): { isGenerated: true, createdAt >= startOfMonth }
//   2. contractbuilders-Collection (Contract Builder): alle User-Docs { createdAt >= startOfMonth }
//
// Wird aufgerufen von:
//   - routes/generate.js POST /api/contracts/generate (vor save)
//   - routes/playbooks.js POST /api/playbooks/:type/generate (vor save)
//   - routes/contractBuilder.js POST /, /import-*, /:id/duplicate (vor save)
//   - routes/auth.js GET /api/auth/me (für UI-Anzeige)
//
// Limit-Quelle: getFeatureLimit(plan, 'generate') aus subscriptionPlans.js
//   - free: 0
//   - business: 10/Monat
//   - enterprise: Infinity

const { ObjectId } = require('mongodb');
const database = require('../config/database');
const { getFeatureLimit } = require('../constants/subscriptionPlans');

/**
 * Liefert den Anfang des aktuellen Monats (lokale Server-Zeit, 00:00:00).
 */
function getStartOfMonth() {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Baut den $or-Filter für userId — Memory-Regel: userId kann String ODER ObjectId sein.
 */
function buildUserIdFilter(userId) {
  const userIdString = String(userId);
  let userIdObjectId = null;
  try {
    userIdObjectId = new ObjectId(userIdString);
  } catch {
    // ungültige ObjectId — nur String-Match probieren
  }
  return userIdObjectId
    ? { $or: [{ userId: userIdString }, { userId: userIdObjectId }] }
    : { userId: userIdString };
}

/**
 * Zählt die im aktuellen Monat erstellten Verträge des Users — über beide Collections.
 * Rückgabe: number (gesamt).
 */
async function getMonthlyContractCount(userId) {
  const db = await database.connect();
  const startOfMonth = getStartOfMonth();
  const userFilter = buildUserIdFilter(userId);

  const [generateCount, builderCount] = await Promise.all([
    db.collection('contracts').countDocuments({
      ...userFilter,
      isGenerated: true,
      createdAt: { $gte: startOfMonth }
    }),
    db.collection('contractbuilders').countDocuments({
      ...userFilter,
      createdAt: { $gte: startOfMonth }
    })
  ]);

  return generateCount + builderCount;
}

/**
 * Prüft ob der User noch ein Vertrag erstellen darf basierend auf seinem Plan.
 * Rückgabe: { allowed: boolean, count: number, limit: number }
 *   - allowed=true: Vertrag erstellbar
 *   - allowed=false: Limit erreicht
 *   - limit=Infinity wird als nummerisch ausgespielt — count wird dann nicht gezählt (Performance)
 */
async function checkContractLimit(userId, plan) {
  const limit = getFeatureLimit(plan, 'generate');

  // Enterprise / Unlimited: kein Counter nötig
  if (limit === Infinity) {
    return { allowed: true, count: 0, limit };
  }

  // Free / Business / sonstige: aktuelle Anzahl prüfen
  const count = await getMonthlyContractCount(userId);
  return { allowed: count < limit, count, limit };
}

module.exports = {
  getMonthlyContractCount,
  checkContractLimit,
  getStartOfMonth,
  buildUserIdFilter
};

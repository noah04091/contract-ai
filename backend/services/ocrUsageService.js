/**
 * OCR Usage Service
 *
 * Verwaltet OCR-Nutzung pro User zur Kostenkontrolle.
 * Textract kostet ~$1.50 pro 1000 Seiten.
 *
 * @version 1.0.0
 */

const { MongoClient, ObjectId } = require('mongodb');

// MongoDB Connection
let usersCollection = null;
let mongoClient = null;

// ============================================
// OCR LIMITS PER SUBSCRIPTION TIER
// ============================================

/**
 * OCR-Seitenlimits pro Monat nach Subscription-Tier.
 * Diese Limits kontrollieren die Textract-Kosten.
 */
const OCR_LIMITS = {
  free: 10,           // 10 Seiten/Monat (Kosten: ~$0.015)
  business: 100,      // 100 Seiten/Monat (Kosten: ~$0.15)
  premium: 500,       // 500 Seiten/Monat (Kosten: ~$0.75)
  legendary: 2000,    // 2000 Seiten/Monat (Kosten: ~$3.00)
  enterprise: -1      // Unbegrenzt
};

/**
 * Initialisiert die MongoDB-Verbindung
 */
async function initMongo() {
  if (usersCollection) return usersCollection;

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI nicht konfiguriert');
  }

  mongoClient = new MongoClient(mongoUri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000
  });

  await mongoClient.connect();
  const db = mongoClient.db('contract_ai');
  usersCollection = db.collection('users');

  console.log('📊 [OCR Usage] MongoDB verbunden');
  return usersCollection;
}

/**
 * Holt das OCR-Limit für einen Subscription-Plan
 * @param {string} plan - Der Subscription-Plan
 * @returns {number} OCR-Seitenlimit (-1 = unbegrenzt)
 */
function getOcrLimit(plan) {
  const normalizedPlan = (plan || 'free').toLowerCase();
  return OCR_LIMITS[normalizedPlan] ?? OCR_LIMITS.free;
}

/**
 * Prüft ob ein User OCR nutzen darf und wie viele Seiten noch verfügbar sind.
 *
 * @param {string} userId - Die User-ID
 * @returns {Promise<{
 *   allowed: boolean,
 *   pagesUsed: number,
 *   pagesLimit: number,
 *   pagesRemaining: number,
 *   plan: string,
 *   error?: string
 * }>}
 */
async function checkOcrUsage(userId) {
  try {
    const users = await initMongo();
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { subscriptionPlan: 1, ocrPagesUsed: 1, ocrResetDate: 1 } }
    );

    if (!user) {
      return {
        allowed: false,
        pagesUsed: 0,
        pagesLimit: 0,
        pagesRemaining: 0,
        plan: 'unknown',
        error: 'User nicht gefunden'
      };
    }

    const plan = user.subscriptionPlan || 'free';
    const limit = getOcrLimit(plan);
    let pagesUsed = user.ocrPagesUsed || 0;

    // Monatlicher Reset prüfen
    const resetDate = user.ocrResetDate ? new Date(user.ocrResetDate) : null;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    const resetMonth = resetDate ? `${resetDate.getFullYear()}-${resetDate.getMonth()}` : null;

    if (resetMonth !== currentMonth) {
      // Neuer Monat → Reset durchführen
      console.log(`🔄 [OCR Usage] Monatlicher Reset für User ${userId}`);
      await users.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            ocrPagesUsed: 0,
            ocrResetDate: now
          }
        }
      );
      pagesUsed = 0;
    }

    // Unbegrenzt
    if (limit === -1) {
      return {
        allowed: true,
        pagesUsed,
        pagesLimit: -1,
        pagesRemaining: -1,
        plan
      };
    }

    const pagesRemaining = Math.max(0, limit - pagesUsed);
    const allowed = pagesRemaining > 0;

    return {
      allowed,
      pagesUsed,
      pagesLimit: limit,
      pagesRemaining,
      plan
    };
  } catch (error) {
    console.error('❌ [OCR Usage] Check Error:', error.message);
    return {
      allowed: false,
      pagesUsed: 0,
      pagesLimit: 0,
      pagesRemaining: 0,
      plan: 'unknown',
      error: error.message
    };
  }
}

/**
 * Inkrementiert die OCR-Nutzung für einen User.
 *
 * @param {string} userId - Die User-ID
 * @param {number} pageCount - Anzahl der verarbeiteten Seiten
 * @returns {Promise<{
 *   success: boolean,
 *   newTotal: number,
 *   error?: string
 * }>}
 */
async function incrementOcrUsage(userId, pageCount = 1) {
  try {
    const users = await initMongo();

    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      {
        $inc: { ocrPagesUsed: pageCount },
        $setOnInsert: { ocrResetDate: new Date() }
      },
      { returnDocument: 'after' }
    );

    const newTotal = result?.ocrPagesUsed || pageCount;
    console.log(`📊 [OCR Usage] User ${userId}: +${pageCount} Seiten (Total: ${newTotal})`);

    return {
      success: true,
      newTotal
    };
  } catch (error) {
    console.error('❌ [OCR Usage] Increment Error:', error.message);
    return {
      success: false,
      newTotal: 0,
      error: error.message
    };
  }
}

/**
 * Holt den aktuellen OCR-Nutzungsstatus für einen User (für Dashboard).
 *
 * @param {string} userId - Die User-ID
 * @returns {Promise<{
 *   pagesUsed: number,
 *   pagesLimit: number,
 *   pagesRemaining: number,
 *   percentUsed: number,
 *   plan: string,
 *   costEstimate: string
 * }>}
 */
async function getOcrUsageStatus(userId) {
  const usage = await checkOcrUsage(userId);

  // Kosten berechnen (~$0.0015 pro Seite)
  const costPerPage = 0.0015;
  const estimatedCost = (usage.pagesUsed * costPerPage).toFixed(3);

  let percentUsed = 0;
  if (usage.pagesLimit > 0) {
    percentUsed = Math.round((usage.pagesUsed / usage.pagesLimit) * 100);
  } else if (usage.pagesLimit === -1) {
    percentUsed = 0; // Unbegrenzt
  }

  return {
    pagesUsed: usage.pagesUsed,
    pagesLimit: usage.pagesLimit,
    pagesRemaining: usage.pagesRemaining,
    percentUsed,
    plan: usage.plan,
    costEstimate: `$${estimatedCost}`,
    isUnlimited: usage.pagesLimit === -1
  };
}

/**
 * Generiert eine benutzerfreundliche Fehlermeldung für OCR-Limit erreicht.
 *
 * @param {Object} usageInfo - Das Ergebnis von checkOcrUsage
 * @returns {string}
 */
function getOcrLimitMessage(usageInfo) {
  const { pagesUsed, pagesLimit, plan } = usageInfo;

  const upgradeOptions = {
    free: 'Upgraden Sie auf Business für 100 OCR-Seiten/Monat.',
    business: 'Upgraden Sie auf Premium für 500 OCR-Seiten/Monat.',
    premium: 'Upgraden Sie auf Legendary für 2000 OCR-Seiten/Monat.'
  };

  const upgradeHint = upgradeOptions[plan] || '';

  return `OCR-Limit erreicht: Sie haben ${pagesUsed} von ${pagesLimit} OCR-Seiten diesen Monat verwendet. ${upgradeHint}`;
}

module.exports = {
  checkOcrUsage,
  incrementOcrUsage,
  getOcrUsageStatus,
  getOcrLimitMessage,
  getOcrLimit,
  OCR_LIMITS
};

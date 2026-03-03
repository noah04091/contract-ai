// 📁 backend/cron/resetAnalysisCount.js
// 🔄 Monatlicher Reset von analysisCount und legalPulseScanCount
// Läuft automatisch am 1. jeden Monats um 00:00 Uhr
//
// ⚠️ WICHTIG: NUR Business-User werden resettet!
// - Free: 3 Analysen EINMALIG (kein Reset!)
// - Business: 25 Analysen pro MONAT (wird am 1. resettet)
// - Premium/Legendary: Unbegrenzt (kein Reset nötig)

const cron = require('node-cron');
const database = require('../config/database');
require('dotenv').config();

// ⏰ Cron-Job: Läuft am 1. jeden Monats um 00:00 Uhr
// Format: Minute Stunde Tag Monat Wochentag
// '0 0 1 * *' = 00:00 Uhr am 1. jeden Monats
cron.schedule('0 0 1 * *', async () => {
  console.log('\n🔄 ═══════════════════════════════════════════════════════');
  console.log('🔄 [CRON] Monatlicher Reset: NUR Business-User werden zurückgesetzt...');
  console.log('🔄 ═══════════════════════════════════════════════════════\n');

  try {
    // MongoDB Verbindung (shared singleton pool)
    const db = await database.connect();

    const usersCollection = db.collection("users");

    // Statistiken vor dem Reset sammeln - NUR Business!
    const statsBefore = await usersCollection.aggregate([
      {
        $match: {
          subscriptionPlan: 'business' // ✅ NUR Business - Free hat EINMALIGE Analysen!
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalAnalyses: { $sum: '$analysisCount' },
          totalLegalPulseScans: { $sum: '$legalPulseScanCount' },
          avgAnalyses: { $avg: '$analysisCount' }
        }
      }
    ]).toArray();

    console.log('📊 [CRON] Business-Statistiken VOR Reset:', statsBefore[0] || 'Keine Daten');

    // ✅ Reset für Business-User: Alle monatlichen Counter zurücksetzen
    // Free-User haben EINMALIGE 3 Analysen - werden NICHT resettet!
    // Enterprise/Legendary haben Infinity - brauchen keinen Reset
    const result = await usersCollection.updateMany(
      {
        subscriptionPlan: 'business' // ✅ NUR Business!
      },
      {
        $set: {
          analysisCount: 0,
          optimizationCount: 0,
          generateCount: 0,
          compareCount: 0,
          chatCount: 0,
          legalPulseScanCount: 0,
          lastMonthlyReset: new Date()
        }
      }
    );

    console.log(`✅ [CRON] Reset erfolgreich: ${result.modifiedCount} Business-User zurückgesetzt`);

    // Statistiken nach dem Reset - NUR Business
    const statsAfter = await usersCollection.aggregate([
      {
        $match: {
          subscriptionPlan: 'business'
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalAnalyses: { $sum: '$analysisCount' },
          totalLegalPulseScans: { $sum: '$legalPulseScanCount' }
        }
      }
    ]).toArray();

    console.log('📊 [CRON] Business-Statistiken NACH Reset:', statsAfter[0] || 'Keine Daten');

    // Optional: Admin-Benachrichtigung (später implementieren)
    // await sendAdminNotification({
    //   type: 'MONTHLY_RESET_SUCCESS',
    //   usersReset: result.modifiedCount,
    //   totalAnalysesBefore: statsBefore[0]?.totalAnalyses || 0
    // });

    console.log('\n✅ [CRON] Monatlicher Reset abgeschlossen!');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ═══════════════════════════════════════════════════════');
    console.error('❌ [CRON] Fehler beim monatlichen Reset:', error);
    console.error('❌ ═══════════════════════════════════════════════════════\n');

    // Optional: Admin-Benachrichtigung bei Fehler
    // await sendAdminAlert({
    //   type: 'MONTHLY_RESET_FAILED',
    //   error: error.message
    // });
  }
});

// Info beim Server-Start
console.log('⏰ [CRON] Monatlicher analysisCount Reset aktiviert');
console.log('⏰ [CRON] Läuft am 1. jeden Monats um 00:00 Uhr');

// Export für Testing (optional)
module.exports = {
  // Test-Funktion um Reset manuell auszulösen
  triggerResetManually: async () => {
    console.log('🧪 [TEST] Manueller Reset wird ausgelöst...');
    // Hier könnte die Reset-Logik direkt aufgerufen werden
  }
};

// 📁 backend/cron/resetAnalysisCount.js
// 🔄 Monatlicher Reset von analysisCount und legalPulseScanCount
// Läuft automatisch am 1. jeden Monats um 00:00 Uhr

const cron = require('node-cron');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// ⏰ Cron-Job: Läuft am 1. jeden Monats um 00:00 Uhr
// Format: Minute Stunde Tag Monat Wochentag
// '0 0 1 * *' = 00:00 Uhr am 1. jeden Monats
cron.schedule('0 0 1 * *', async () => {
  console.log('\n🔄 ═══════════════════════════════════════════════════════');
  console.log('🔄 [CRON] Monatlicher Reset: analysisCount wird zurückgesetzt...');
  console.log('🔄 ═══════════════════════════════════════════════════════\n');

  let client;

  try {
    // MongoDB Verbindung
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const usersCollection = client.db("contract_ai").collection("users");

    // Statistiken vor dem Reset sammeln
    const statsBefore = await usersCollection.aggregate([
      {
        $match: {
          subscriptionPlan: { $in: ['free', 'business'] },
          subscriptionActive: true
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

    console.log('📊 [CRON] Statistiken VOR Reset:', statsBefore[0] || 'Keine Daten');

    // Reset durchführen
    // Nur Free und Business User (Premium hat Infinity Limit)
    // Nur aktive Abos
    const result = await usersCollection.updateMany(
      {
        subscriptionPlan: { $in: ['free', 'business'] },
        subscriptionActive: true
      },
      {
        $set: {
          analysisCount: 0,
          legalPulseScanCount: 0,
          lastMonthlyReset: new Date()
        }
      }
    );

    console.log(`✅ [CRON] Reset erfolgreich: ${result.modifiedCount} User zurückgesetzt`);

    // Statistiken nach dem Reset
    const statsAfter = await usersCollection.aggregate([
      {
        $match: {
          subscriptionPlan: { $in: ['free', 'business'] },
          subscriptionActive: true
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

    console.log('📊 [CRON] Statistiken NACH Reset:', statsAfter[0] || 'Keine Daten');

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
  } finally {
    // MongoDB Verbindung schließen
    if (client) {
      await client.close();
    }
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

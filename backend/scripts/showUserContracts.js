/**
 * Einmal-Script: Zeigt alle User mit ihrer Vertragsanzahl
 * Ausführen: node backend/scripts/showUserContracts.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db('contract_ai');

    // 1. Alle Verträge nach userId gruppieren
    const contractStats = await db.collection('contracts').aggregate([
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
          totalSize: { $sum: { $bsonSize: "$$ROOT" } },
          newestContract: { $max: "$createdAt" }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // 2. User-Details holen
    console.log('\n========================================');
    console.log('  CONTRACT AI - USER & VERTRAGS-ÜBERSICHT');
    console.log('========================================\n');

    let totalContracts = 0;
    let totalSize = 0;
    const rows = [];

    for (const stat of contractStats) {
      let user = null;
      if (stat._id) {
        try {
          const { ObjectId } = require('mongodb');
          // userId kann String oder ObjectId sein
          user = await db.collection('users').findOne(
            { $or: [
              { _id: new ObjectId(stat._id.toString()) },
              { _id: stat._id }
            ]},
            { projection: { email: 1, firstName: 1, lastName: 1, verified: 1, subscriptionPlan: 1, createdAt: 1, lastLoginAt: 1 } }
          );
        } catch(e) { /* skip invalid IDs */ }
      }

      const email = user?.email || '(unbekannt)';
      const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '-';
      const verified = user?.verified ? 'Ja' : 'Nein';
      const plan = user?.subscriptionPlan || 'free';
      const sizeMB = (stat.totalSize / (1024 * 1024)).toFixed(2);
      const lastLogin = user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('de-DE') : 'Nie';

      // Test-Account Erkennung
      const isTest = email.includes('test') || email.includes('demo') || email.includes('example') || email.includes('flirt.ms');

      totalContracts += stat.count;
      totalSize += stat.totalSize;

      rows.push({
        email: email.substring(0, 35),
        name: name.substring(0, 20),
        contracts: stat.count,
        sizeMB,
        plan,
        verified,
        lastLogin,
        isTest: isTest ? '⚠️ TEST' : '',
        userId: stat._id?.toString() || '-'
      });
    }

    // Tabelle ausgeben
    console.log('User-Email'.padEnd(37) + 'Verträge'.padEnd(10) + 'Größe(MB)'.padEnd(11) + 'Plan'.padEnd(12) + 'Verifiziert'.padEnd(13) + 'Letzter Login'.padEnd(15) + 'Test?');
    console.log('-'.repeat(110));

    for (const row of rows) {
      console.log(
        row.email.padEnd(37) +
        String(row.contracts).padEnd(10) +
        row.sizeMB.padEnd(11) +
        row.plan.padEnd(12) +
        row.verified.padEnd(13) +
        row.lastLogin.padEnd(15) +
        row.isTest
      );
    }

    console.log('-'.repeat(110));
    console.log(`\nGESAMT: ${totalContracts} Verträge, ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`User mit Verträgen: ${rows.length}`);
    console.log(`Davon mögl. Test-Accounts: ${rows.filter(r => r.isTest).length}`);

    // Zusammenfassung
    console.log('\n========================================');
    console.log('  ZUM LÖSCHEN VON TEST-VERTRÄGEN:');
    console.log('========================================');
    console.log('Nutze MongoDB Atlas → Browse Collections → contracts');
    console.log('Filter: { "userId": "<userId-von-oben>" }');
    console.log('Dann: Delete Documents\n');
    console.log('ODER führe aus:');
    console.log('node backend/scripts/deleteTestContracts.js <userId>\n');

  } catch (err) {
    console.error('Fehler:', err.message);
  } finally {
    await client.close();
  }
}

main();

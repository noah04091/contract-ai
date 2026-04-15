/**
 * Sicheres Cleanup-Script: Verwaiste & Test-Verträge löschen
 *
 * DRY-RUN (Standard):  node backend/scripts/cleanupOrphanedContracts.js
 * LÖSCHEN:             node backend/scripts/cleanupOrphanedContracts.js --delete
 *
 * Sicherheitsmaßnahmen:
 * - Whitelist-Ansatz: Echte User werden GESCHÜTZT
 * - DRY-RUN zeigt alles an BEVOR etwas gelöscht wird
 * - Zugehörige Daten in allen Collections werden mit bereinigt
 * - S3-Dateien werden NICHT gelöscht
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient, ObjectId } = require('mongodb');

const DELETE_MODE = process.argv.includes('--delete');

// Test-Account Patterns
const TEST_EMAIL_PATTERNS = [
  /@flirt\.ms$/i,
  /@example\.com$/i,
  /@test\.com$/i,
  /^test.*@/i,
  /^demo.*@/i,
];

// Accounts die NICHT gelöscht werden sollen (aktiv genutzt zum Testen)
const KEEP_EMAILS = [
  '2302test@flirt.ms',
  '0503test@flirt.ms',
];

function isTestEmail(email) {
  if (!email) return false;
  // Erst prüfen ob der Account behalten werden soll
  if (KEEP_EMAILS.includes(email.toLowerCase())) return false;
  return TEST_EMAIL_PATTERNS.some(pattern => pattern.test(email));
}

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db('contract_ai');

    console.log('\n' + '='.repeat(60));
    if (DELETE_MODE) {
      console.log('  ⚠️  DELETE MODUS — DATEN WERDEN GELÖSCHT!');
    } else {
      console.log('  🔍 DRY-RUN — ES WIRD NICHTS GELÖSCHT');
      console.log('  Zum Löschen: node backend/scripts/cleanupOrphanedContracts.js --delete');
    }
    console.log('='.repeat(60) + '\n');

    // ========================================
    // Schritt 1: Alle User laden und kategorisieren
    // ========================================
    console.log('📋 Lade alle User...');
    const allUsers = await db.collection('users').find(
      {},
      { projection: { email: 1, firstName: 1, lastName: 1, verified: 1, subscriptionPlan: 1, createdAt: 1 } }
    ).toArray();

    const realUsers = [];
    const testUsers = [];

    for (const user of allUsers) {
      if (isTestEmail(user.email)) {
        testUsers.push(user);
      } else {
        realUsers.push(user);
      }
    }

    // Echte User-IDs als Set (für schnelles Lookup)
    const realUserIds = new Set(realUsers.map(u => u._id.toString()));
    const testUserIds = new Set(testUsers.map(u => u._id.toString()));

    console.log(`✅ ${realUsers.length} echte User (GESCHÜTZT)`);
    console.log(`⚠️  ${testUsers.length} Test-Accounts gefunden\n`);

    // ========================================
    // Schritt 2: Verträge kategorisieren
    // ========================================
    console.log('📋 Lade alle Verträge (ohne Compare-History)...');
    const allContracts = await db.collection('contracts').find(
      { action: { $ne: 'compare_contracts' } },  // ⚠️ Compare-History NIEMALS löschen!
      { projection: { _id: 1, name: 1, userId: 1, s3Key: 1, createdAt: 1 } }
    ).toArray();

    // Info: Compare-History separat zählen
    const compareHistoryCount = await db.collection('contracts').countDocuments({ action: 'compare_contracts' });
    if (compareHistoryCount > 0) {
      console.log(`🛡️  ${compareHistoryCount} Compare-History Einträge werden GESCHÜTZT (nicht berührt)`);
    }

    const protectedContracts = [];
    const orphanedContracts = [];
    const testContracts = [];

    for (const contract of allContracts) {
      const uid = contract.userId?.toString();

      if (uid && realUserIds.has(uid)) {
        protectedContracts.push(contract);
      } else if (uid && testUserIds.has(uid)) {
        testContracts.push(contract);
      } else {
        orphanedContracts.push(contract);
      }
    }

    // ========================================
    // Schritt 3: Zusammenfassung anzeigen
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('  ZUSAMMENFASSUNG');
    console.log('='.repeat(60));

    // Geschützte Verträge
    console.log(`\n✅ GESCHÜTZT (werden NICHT gelöscht): ${protectedContracts.length} Verträge`);
    console.log('   Gehören zu echten Usern:');
    const protectedByUser = {};
    for (const c of protectedContracts) {
      const uid = c.userId?.toString();
      if (!protectedByUser[uid]) protectedByUser[uid] = { count: 0, user: realUsers.find(u => u._id.toString() === uid) };
      protectedByUser[uid].count++;
    }
    for (const [uid, data] of Object.entries(protectedByUser)) {
      const email = data.user?.email || '(unbekannt)';
      console.log(`   - ${email}: ${data.count} Verträge`);
    }

    // Test-Verträge
    console.log(`\n⚠️  TEST-ACCOUNTS: ${testContracts.length} Verträge → LÖSCHEN`);
    const testByUser = {};
    for (const c of testContracts) {
      const uid = c.userId?.toString();
      if (!testByUser[uid]) testByUser[uid] = { count: 0, user: testUsers.find(u => u._id.toString() === uid) };
      testByUser[uid].count++;
    }
    for (const [uid, data] of Object.entries(testByUser)) {
      const email = data.user?.email || '(unbekannt)';
      console.log(`   - ${email}: ${data.count} Verträge`);
    }

    // Verwaiste Verträge
    console.log(`\n🗑️  VERWAIST (kein User mehr): ${orphanedContracts.length} Verträge → LÖSCHEN`);

    const toDelete = [...orphanedContracts, ...testContracts];
    const toDeleteIds = toDelete.map(c => c._id);
    const toDeleteObjectIds = toDeleteIds.map(id => new ObjectId(id.toString()));

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`   TOTAL ZUM LÖSCHEN: ${toDelete.length} Verträge`);
    console.log(`   GESCHÜTZT:         ${protectedContracts.length} Verträge`);
    console.log(`${'─'.repeat(60)}`);

    // ========================================
    // Schritt 4: Zugehörige Daten in anderen Collections zählen
    // ========================================
    console.log('\n📊 Zugehörige Daten in anderen Collections:');

    // userId-basierte Suche (für Collections die nach userId filtern)
    const allDeleteUserIds = [...testUserIds];
    // Für verwaiste Verträge: deren userIds sammeln
    const orphanedUserIds = new Set();
    for (const c of orphanedContracts) {
      if (c.userId) orphanedUserIds.add(c.userId.toString());
    }
    // Verwaiste UserIds die NICHT echte User sind
    for (const uid of orphanedUserIds) {
      if (!realUserIds.has(uid)) allDeleteUserIds.push(uid);
    }

    const relatedCounts = {};
    const collections = [
      { name: 'contract_events', field: 'contractId' },
      { name: 'clause_analyses', field: 'contractId' },
      { name: 'legallensprogresses', field: 'contractId' },
      { name: 'pulsenotifications', field: 'contractId' },
      { name: 'cancellations', field: 'contractId' },
      { name: 'envelopes', field: 'contractId' },
      { name: 'integrationwebhookevents', field: 'contractId' },
      { name: 'vector_contracts', field: 'contractId' },
    ];

    for (const col of collections) {
      try {
        // Versuche mit ObjectId und String
        const count = await db.collection(col.name).countDocuments({
          [col.field]: { $in: toDeleteObjectIds }
        });
        relatedCounts[col.name] = count;
        if (count > 0) {
          console.log(`   - ${col.name}: ${count} Einträge → LÖSCHEN`);
        }
      } catch (e) {
        // Collection existiert möglicherweise nicht
        relatedCounts[col.name] = 0;
      }
    }

    // Analyses: suche nach contractName + userId ODER contractId
    try {
      const analysesCount = await db.collection('analyses').countDocuments({
        $or: [
          { userId: { $in: allDeleteUserIds } },
          { contractId: { $in: toDeleteObjectIds } }
        ]
      });
      relatedCounts['analyses'] = analysesCount;
      if (analysesCount > 0) {
        console.log(`   - analyses: ${analysesCount} Einträge → LÖSCHEN`);
      }
    } catch (e) {
      relatedCounts['analyses'] = 0;
    }

    // S3-Dateien zählen (werden NICHT gelöscht)
    const s3Files = toDelete.filter(c => c.s3Key).length;
    if (s3Files > 0) {
      console.log(`\n   📁 S3-Dateien: ${s3Files} Dateien (werden NICHT gelöscht)`);
    }

    const totalRelated = Object.values(relatedCounts).reduce((a, b) => a + b, 0);
    console.log(`\n   TOTAL zugehörige Daten: ${totalRelated} Einträge`);

    // ========================================
    // Schritt 5: Löschen (nur mit --delete)
    // ========================================
    if (!DELETE_MODE) {
      console.log('\n' + '='.repeat(60));
      console.log('  🔍 DRY-RUN ABGESCHLOSSEN — NICHTS WURDE GELÖSCHT');
      console.log('  Zum Löschen: node backend/scripts/cleanupOrphanedContracts.js --delete');
      console.log('='.repeat(60) + '\n');
      return;
    }

    // DELETE MODUS
    console.log('\n' + '='.repeat(60));
    console.log('  ⚠️  LÖSCHE JETZT...');
    console.log('='.repeat(60));

    let deletedTotal = 0;

    // 5a: Zugehörige Daten löschen (VOR den Verträgen)
    for (const col of collections) {
      if (relatedCounts[col.name] > 0) {
        const result = await db.collection(col.name).deleteMany({
          [col.field]: { $in: toDeleteObjectIds }
        });
        console.log(`   ✅ ${col.name}: ${result.deletedCount} gelöscht`);
        deletedTotal += result.deletedCount;
      }
    }

    // Analyses löschen
    if (relatedCounts['analyses'] > 0) {
      const result = await db.collection('analyses').deleteMany({
        $or: [
          { userId: { $in: allDeleteUserIds } },
          { contractId: { $in: toDeleteObjectIds } }
        ]
      });
      console.log(`   ✅ analyses: ${result.deletedCount} gelöscht`);
      deletedTotal += result.deletedCount;
    }

    // 5b: Verträge löschen
    const contractResult = await db.collection('contracts').deleteMany({
      _id: { $in: toDeleteObjectIds }
    });
    console.log(`   ✅ contracts: ${contractResult.deletedCount} gelöscht`);
    deletedTotal += contractResult.deletedCount;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`   TOTAL GELÖSCHT: ${deletedTotal} Einträge`);
    console.log(`   GESCHÜTZT:      ${protectedContracts.length} Verträge unberührt`);
    console.log(`${'─'.repeat(60)}`);

    // Verifizierung
    const remainingContracts = await db.collection('contracts').countDocuments();
    console.log(`\n   📊 Verträge in DB nach Cleanup: ${remainingContracts}`);
    console.log('   ✅ Cleanup abgeschlossen!\n');

  } catch (err) {
    console.error('\n❌ Fehler:', err.message);
    console.error(err.stack);
  } finally {
    await client.close();
  }
}

main();

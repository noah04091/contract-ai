/**
 * Einmal-Script: Zeigt verwaiste UserIds UND echte User getrennt
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');

  // Alle User laden
  const users = await db.collection('users').find(
    {},
    { projection: { _id: 1, email: 1, firstName: 1, lastName: 1, verified: 1, subscriptionPlan: 1, lastLoginAt: 1, createdAt: 1 } }
  ).toArray();

  const userIdSet = new Set(users.map(u => u._id.toString()));

  // Alle Verträge laden
  const contracts = await db.collection('contracts').find(
    {},
    { projection: { _id: 1, userId: 1, name: 1, createdAt: 1 } }
  ).toArray();

  // Verwaiste UserIds sammeln + Vertragszahlen
  const orphanedMap = {};
  const realUserContractCount = {};

  for (const c of contracts) {
    const uid = c.userId ? c.userId.toString() : '(keine userId)';

    if (!c.userId || !userIdSet.has(uid)) {
      if (!orphanedMap[uid]) orphanedMap[uid] = { count: 0, examples: [] };
      orphanedMap[uid].count++;
      if (orphanedMap[uid].examples.length < 3) {
        orphanedMap[uid].examples.push(c.name || '(ohne Name)');
      }
    } else {
      realUserContractCount[uid] = (realUserContractCount[uid] || 0) + 1;
    }
  }

  // ========================================
  // Teil 1: Verwaiste UserIds
  // ========================================
  console.log('\n' + '='.repeat(70));
  console.log('  TEIL 1: VERWAISTE USERIDS (existieren NICHT mehr in users Collection)');
  console.log('  Diese Vertraege gehoeren zu GELOESCHTEN Accounts');
  console.log('='.repeat(70) + '\n');

  const orphanedSorted = Object.entries(orphanedMap).sort((a, b) => b[1].count - a[1].count);
  let nr = 1;
  let totalOrphaned = 0;

  for (const [uid, data] of orphanedSorted) {
    totalOrphaned += data.count;
    console.log(nr + '. UserId: ' + uid);
    console.log('   Vertraege: ' + data.count);
    console.log('   Beispiele: ' + data.examples.join(', '));
    console.log();
    nr++;
  }
  console.log('GESAMT VERWAIST: ' + totalOrphaned + ' Vertraege von ' + orphanedSorted.length + ' geloeschten UserIds');

  // ========================================
  // Teil 2: Echte User (GESCHUETZT)
  // ========================================
  console.log('\n' + '='.repeat(70));
  console.log('  TEIL 2: ECHTE USER (werden NICHT geloescht!)');
  console.log('='.repeat(70) + '\n');

  // Echte User mit Verträgen
  const realWithContracts = users
    .filter(u => realUserContractCount[u._id.toString()])
    .sort((a, b) => (realUserContractCount[b._id.toString()] || 0) - (realUserContractCount[a._id.toString()] || 0));

  nr = 1;
  console.log('Nr'.padEnd(5) + 'E-Mail'.padEnd(40) + 'Vertraege'.padEnd(12) + 'Plan'.padEnd(14) + 'Verifiziert'.padEnd(13) + 'Letzter Login');
  console.log('-'.repeat(100));

  for (const u of realWithContracts) {
    const count = realUserContractCount[u._id.toString()] || 0;
    const email = u.email || '(keine)';
    const plan = u.subscriptionPlan || 'free';
    const verified = u.verified ? 'Ja' : 'Nein';
    const lastLogin = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('de-DE') : 'Nie';

    console.log(
      String(nr).padEnd(5) +
      email.substring(0, 38).padEnd(40) +
      String(count).padEnd(12) +
      plan.padEnd(14) +
      verified.padEnd(13) +
      lastLogin
    );
    nr++;
  }

  console.log('-'.repeat(100));
  const totalReal = Object.values(realUserContractCount).reduce((a, b) => a + b, 0);
  console.log('GESAMT GESCHUETZT: ' + totalReal + ' Vertraege von ' + realWithContracts.length + ' echten Usern');

  await client.close();
}

main();

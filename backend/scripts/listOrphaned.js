/**
 * Einmal-Script: Zeigt alle verwaisten Verträge (kein User mehr)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');

  // Alle User-IDs
  const users = await db.collection('users').find({}, { projection: { _id: 1 } }).toArray();
  const userIdSet = new Set(users.map(u => u._id.toString()));

  // Alle Verträge
  const contracts = await db.collection('contracts').find(
    {},
    { projection: { _id: 1, name: 1, userId: 1, createdAt: 1, uploadedAt: 1, analyzed: 1, contractType: 1 } }
  ).toArray();

  const orphaned = contracts.filter(c => {
    const uid = c.userId ? c.userId.toString() : null;
    return !uid || !userIdSet.has(uid);
  });

  // Nach userId gruppieren
  const grouped = {};
  for (const c of orphaned) {
    const uid = c.userId ? c.userId.toString() : '(keine userId)';
    if (!grouped[uid]) grouped[uid] = [];
    grouped[uid].push(c);
  }

  console.log('=== VERWAISTE VERTRÄGE — nach userId gruppiert ===');
  console.log('(Alle UserIDs existieren NICHT MEHR in der users Collection)\n');

  const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  for (const [uid, userContracts] of sorted) {
    const date = userContracts[0].createdAt || userContracts[0].uploadedAt;
    const dateStr = date ? new Date(date).toLocaleDateString('de-DE') : '?';
    const names = userContracts.slice(0, 5).map(c => c.name || '(ohne Name)');
    console.log('UserId: ' + uid + '  |  ' + userContracts.length + ' Verträge  |  Erstellt ca: ' + dateStr);
    for (const name of names) {
      console.log('   - ' + name);
    }
    if (userContracts.length > 5) {
      console.log('   ... und ' + (userContracts.length - 5) + ' weitere');
    }
    console.log();
  }

  console.log('─'.repeat(60));
  console.log('GESAMT: ' + orphaned.length + ' verwaiste Verträge');
  console.log('Von ' + Object.keys(grouped).length + ' nicht mehr existierenden UserIDs');

  await client.close();
}

main();

/**
 * Smoke-Test: Feature-Usage-Tracking (read-mostly, räumt sich selbst auf)
 *
 * Beweist End-to-End:
 *  1) Der echte Service `featureUsage.trackFeatureUsage()` schreibt Events.
 *  2) Die exakte Admin-Endpoint-Aggregation liest sie korrekt.
 *  3) Der Test-/Admin-Account-Filter schließt ausgeschlossene User aus.
 *
 * Nutzt einen eindeutigen Test-Feature-Tag (__smoketest__) und LÖSCHT alle
 * eingefügten Test-Events am Ende wieder. Fasst keine echten Feature-Daten an.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');
const featureUsage = require('../services/featureUsage').getInstance();

const TEST_FEATURE = '__smoketest_featureusage__';

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');
  const users = db.collection('users');
  const fu = db.collection('feature_usage');

  try {
    // 1) Einen echten (nicht-Test/nicht-Admin) und einen auszuschließenden User finden
    const realUser = await users.findOne(
      { role: { $ne: 'admin' }, email: { $not: /@flirt\.ms$/i } },
      { projection: { _id: 1, email: 1 } }
    );
    const excludedUser = await users.findOne(
      { $or: [{ role: 'admin' }, { email: /@flirt\.ms$/i }] },
      { projection: { _id: 1, email: 1, role: 1 } }
    );

    console.log('👤 Echter User:    ', realUser?._id?.toString(), realUser?.email);
    console.log('🚫 Ausgeschlossen: ', excludedUser?._id?.toString(), excludedUser?.email, excludedUser?.role);

    if (!realUser || !excludedUser) {
      console.log('⚠️ Keine passenden User gefunden — Test abgebrochen (kein Schaden).');
      return;
    }

    // 2) Events über den ECHTEN Service schreiben (beweist Schreibpfad + Index-Anlage)
    await featureUsage.trackFeatureUsage({ userId: realUser._id.toString(), feature: TEST_FEATURE });
    await featureUsage.trackFeatureUsage({ userId: realUser._id.toString(), feature: TEST_FEATURE });
    await featureUsage.trackFeatureUsage({ userId: excludedUser._id.toString(), feature: TEST_FEATURE });

    // 3) EXAKTE Endpoint-Aggregation nachbilden
    const days = 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const allUsers = await users.find({}, { projection: { _id: 1, email: 1, role: 1 } }).toArray();
    const TEST_DOMAINS = new Set(['flirt.ms']);
    const isTest = (email) => TEST_DOMAINS.has((email?.split('@')[1] || '').toLowerCase());
    const excludedIds = allUsers.filter(u => isTest(u.email) || u.role === 'admin').map(u => u._id.toString());

    const rows = await fu.aggregate([
      { $match: { timestamp: { $gte: since }, userId: { $nin: excludedIds }, feature: TEST_FEATURE } },
      { $group: { _id: '$feature', count: { $sum: 1 }, usersSet: { $addToSet: '$userId' } } },
      { $project: { _id: 0, feature: '$_id', count: 1, uniqueUsers: { $size: '$usersSet' } } }
    ]).toArray();

    const rawTotal = await fu.countDocuments({ feature: TEST_FEATURE });

    console.log('\n📊 Aggregation (gefiltert):', JSON.stringify(rows));
    console.log('🧾 Roh eingefügt (inkl. ausgeschlossen):', rawTotal);

    // 4) Assertions: 3 inserts, 1 ausgeschlossen → 2 Nutzungen / 1 eindeutiger User
    const r = rows[0];
    const pass = !!r && r.count === 2 && r.uniqueUsers === 1 && rawTotal === 3;
    console.log(
      pass
        ? '\n✅ PASS: Schreibpfad ok, Aggregation ok, Test-/Admin-Filter greift (3 → 2 Nutzungen / 1 User).'
        : '\n❌ FAIL: unerwartetes Ergebnis — bitte prüfen.'
    );

    // Index-Beweis
    const idx = await fu.indexes();
    console.log('🔧 Indizes auf feature_usage:', idx.map(i => i.name).join(', '));
  } finally {
    // 5) Cleanup — IMMER, auch bei Fehler
    const del = await fu.deleteMany({ feature: TEST_FEATURE });
    console.log(`🧹 Cleanup: ${del.deletedCount} Test-Events gelöscht`);
    await client.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });

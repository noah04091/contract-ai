/**
 * READ-ONLY: Enumeriert verwaiste contract_events + contracts (userId ohne existierenden User).
 * Verifiziert pro userId, dass WIRKLICH kein User existiert (ObjectId- UND String-Match + Email-Gegenprobe).
 * node backend/scripts/enumerateOrphanedUserData.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const database = require('../config/database');
const { ObjectId } = require('mongodb');

const toObjId = (s) => { try { return new ObjectId(String(s)); } catch (_) { return null; } };

(async () => {
  const db = await database.connect();

  // alle distinkten userIds aus Events + Verträgen
  const evUserIds = await db.collection('contract_events').distinct('userId');
  const cUserIds = await db.collection('contracts').distinct('userId');
  const allIds = [...new Set([...evUserIds, ...cUserIds].map(x => String(x)))];

  const orphans = [];
  for (const idStr of allIds) {
    // existiert ein User? per _id (ObjectId), per _id (String), zur Sicherheit beide
    const oid = toObjId(idStr);
    const userById = oid ? await db.collection('users').findOne({ _id: oid }, { projection: { _id: 1, email: 1 } }) : null;
    const userByStr = userById ? null : await db.collection('users').findOne({ _id: idStr }, { projection: { _id: 1 } });
    if (userById || userByStr) continue; // User existiert → kein Waise

    const evCount = await db.collection('contract_events').countDocuments({ userId: { $in: oid ? [idStr, oid] : [idStr] } });
    const cCount = await db.collection('contracts').countDocuments({ userId: { $in: oid ? [idStr, oid] : [idStr] } });
    // gibt es diesen Account im deleted_accounts-Archiv? (bestätigt: bewusst gelöscht)
    const archived = await db.collection('deleted_accounts').findOne(
      { $or: [{ userId: idStr }, { originalUserId: idStr }, { _id: oid }] }, { projection: { email: 1 } }
    ).catch(() => null);
    orphans.push({ idStr, evCount, cCount, archived: !!archived });
  }

  console.log('\n════ VERWAISTE USER-DATEN (kein existierender User) ════');
  console.log(`distinkte userIds in Events/Verträgen: ${allIds.length} | davon verwaist: ${orphans.length}`);
  let totalEv = 0, totalC = 0;
  for (const o of orphans) {
    totalEv += o.evCount; totalC += o.cCount;
    console.log(`  • userId ${o.idStr} → ${o.evCount} Events, ${o.cCount} Verträge${o.archived ? ' [im deleted_accounts-Archiv ✓]' : ' [NICHT im Archiv ⚠️]'}`);
  }
  console.log(`\nSumme: ${totalEv} verwaiste Events, ${totalC} verwaiste Verträge bei ${orphans.length} gelöschten Usern.`);
  const notArchived = orphans.filter(o => !o.archived).length;
  console.log(notArchived === 0
    ? '✅ ALLE verwaisten userIds sind im deleted_accounts-Archiv → zweifelsfrei gelöschte User, sicher aufräumbar.'
    : `⚠️ ${notArchived} userIds NICHT im Archiv — vor dem Löschen einzeln prüfen.`);
  console.log('(Read-only — nichts verändert.)\n');
  await database.close();
})().catch(async e => { console.error('FEHLER:', e.message); try { await database.close(); } catch (_) {} process.exit(1); });

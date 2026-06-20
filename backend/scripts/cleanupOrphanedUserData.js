/**
 * Räumt verwaiste contract_events + contracts auf (userId ohne existierenden User).
 * SICHER: backupt ALLES vor dem Löschen (rückholbar) + löscht nur userIds, die nachweislich
 * keinen User haben (ObjectId- UND String-Match geprüft).
 *
 *   Trockenlauf (NICHTS wird gelöscht):   node backend/scripts/cleanupOrphanedUserData.js
 *   Wirklich löschen (mit Backup):        node backend/scripts/cleanupOrphanedUserData.js --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const database = require('../config/database');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const toObjId = (s) => { try { return new ObjectId(String(s)); } catch (_) { return null; } };

(async () => {
  const db = await database.connect();
  const evCol = db.collection('contract_events');
  const cCol = db.collection('contracts');
  const ctCol = db.collection('cost_tracking');

  const ids = [...new Set([...(await evCol.distinct('userId')), ...(await cCol.distinct('userId')), ...(await ctCol.distinct('userId'))].map(String))];

  const orphanIds = [];
  let oldFilterWouldMatch = 0, newFilterMatches = 0;
  for (const idStr of ids) {
    const oid = toObjId(idStr);
    const user = (oid && await db.collection('users').findOne({ _id: oid }, { projection: { _id: 1 } }))
      || await db.collection('users').findOne({ _id: idStr }, { projection: { _id: 1 } });
    if (user) continue; // User existiert → NIE anfassen
    orphanIds.push(idStr);
    // Beweis: alter String-Filter vs. neuer $in-Filter
    oldFilterWouldMatch += await evCol.countDocuments({ userId: idStr });
    newFilterMatches += await evCol.countDocuments({ userId: { $in: oid ? [idStr, oid] : [idStr] } });
  }

  // Sammle alle zu löschenden Docs (für Backup)
  const variants = (idStr) => { const o = toObjId(idStr); return o ? [idStr, o] : [idStr]; };
  const evToDelete = await evCol.find({ userId: { $in: orphanIds.flatMap(variants) } }).toArray();
  const cToDelete = await cCol.find({ userId: { $in: orphanIds.flatMap(variants) } }).toArray();
  const ctToDelete = await ctCol.find({ userId: { $in: orphanIds.flatMap(variants) } }).toArray();

  console.log(`\n════ Aufräumung verwaiste User-Daten ${APPLY ? '(LÖSCHEN)' : '(TROCKENLAUF)'} ════`);
  console.log(`Verwaiste User (kein existierender Account): ${orphanIds.length}`);
  console.log(`Zu löschen: ${evToDelete.length} Events, ${cToDelete.length} Verträge, ${ctToDelete.length} cost_tracking`);
  console.log(`🔎 Beweis Cascade-Bug: alter String-Filter hätte ${oldFilterWouldMatch} Events getroffen, neuer $in-Filter trifft ${newFilterMatches}.`);

  if (!APPLY) {
    console.log('\nℹ️ Trockenlauf — nichts verändert. Mit `--apply` ausführen (legt vorher Backup an).');
    await database.close();
    return;
  }

  // Backup
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(__dirname, `backup-orphaned-user-data-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ orphanIds, events: evToDelete, contracts: cToDelete, costTracking: ctToDelete }, null, 2));
  console.log(`💾 Backup geschrieben: ${backupFile} (${evToDelete.length} Events + ${cToDelete.length} Verträge + ${ctToDelete.length} cost_tracking)`);

  const evRes = await evCol.deleteMany({ userId: { $in: orphanIds.flatMap(variants) } });
  const cRes = await cCol.deleteMany({ userId: { $in: orphanIds.flatMap(variants) } });
  const ctRes = await ctCol.deleteMany({ userId: { $in: orphanIds.flatMap(variants) } });
  console.log(`🗑️ Gelöscht: ${evRes.deletedCount} Events, ${cRes.deletedCount} Verträge, ${ctRes.deletedCount} cost_tracking.`);
  console.log('✅ Fertig. Backup oben ist rückholbar (insertMany), falls nötig.');
  await database.close();
})().catch(async e => { console.error('FEHLER:', e.message); try { await database.close(); } catch (_) {} process.exit(1); });

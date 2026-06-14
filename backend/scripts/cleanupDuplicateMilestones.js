// STUFE-B-CLEANUP (Backup + Restore): Fasst bestehende synonyme Meilenstein-Events am
// selben Tag zusammen — nutzt EXAKT dieselbe Funktion wie die Erzeugung (dedupeSameDayMilestones)
// → deckungsgleich. Entfernt nur die nicht-kanonischen Dopplungen + deren Vorwarn-Kinder.
// Das spezifische Event MIT Vorwarnungen bleibt → keine Erinnerung geht verloren.
//
//   node scripts/cleanupDuplicateMilestones.js            → DRY-RUN
//   node scripts/cleanupDuplicateMilestones.js --execute  → Backup + löschen
//   node scripts/cleanupDuplicateMilestones.js --restore <backupdatei>
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const database = require('../config/database');
const { dedupeSameDayMilestones } = require('../services/calendarEvents');

const isReminder = (e) =>
  /_REMINDER_\d+D$/i.test(e.type || '') ||
  /\d+\s*(?:Tage?|Wochen?|Monate?)\s*vorher/i.test(e.title || '');

(async () => {
  const mode = process.argv[2];
  const db = await database.connect();
  const col = db.collection('contract_events');

  // ===== RESTORE =====
  if (mode === '--restore') {
    const file = process.argv[3];
    if (!file || !fs.existsSync(file)) { console.error('❌ Backup nicht gefunden:', file); process.exit(1); }
    const { ObjectId } = require('mongodb');
    const docs = JSON.parse(fs.readFileSync(file, 'utf8')).map(d => ({
      ...d, _id: typeof d._id === 'string' ? new ObjectId(d._id) : d._id,
      date: d.date ? new Date(d.date) : d.date,
      createdAt: d.createdAt ? new Date(d.createdAt) : d.createdAt,
      updatedAt: d.updatedAt ? new Date(d.updatedAt) : d.updatedAt
    }));
    let restored = 0, skipped = 0;
    for (const doc of docs) { if (await col.findOne({ _id: doc._id })) skipped++; else { await col.insertOne(doc); restored++; } }
    console.log(`\n✅ RESTORE: ${restored} wiederhergestellt, ${skipped} existierten bereits.`);
    process.exit(0);
  }

  // ===== Merge berechnen (dieselbe Funktion wie Erzeugung) =====
  const now = new Date();
  const events = await col.find({ status: 'scheduled', date: { $gt: now } }).toArray();
  const { dropped } = dedupeSameDayMilestones(events);

  const droppedMains = dropped.filter(e => !isReminder(e));
  const droppedReminders = dropped.filter(e => isReminder(e));
  const contractsHit = new Set(dropped.map(e => String(e.contractId)));
  const byType = {};
  droppedMains.forEach(e => { byType[e.type] = (byType[e.type] || 0) + 1; });

  // ===== SICHERHEIT: pro Cluster muss ein Event ÜBRIG bleiben (nie alle gedroppt) =====
  // Recompute groups; assert every dropped main has a non-dropped sibling same (contract,day,group).
  const droppedSet = new Set(dropped);
  const dayStr = (d) => new Date(d).toISOString().slice(0, 10);
  const SEM = { CONTRACT_END:'ENDE',MINIMUM_TERM_END:'ENDE',LEASE_END:'ENDE',INSURANCE_END:'ENDE',LOAN_END:'ENDE',LICENSE_EXPIRY:'ENDE',TRIAL_END:'ENDE',AUTO_RENEWAL:'ENDE',CONTRACT_EXPIRY:'ENDE',REMAINING_TIME_END:'ENDE',CONTRACT_START:'START',SERVICE_START:'START' };
  let orphanClusters = 0;
  for (const d of droppedMains) {
    const g = SEM[d.type];
    const siblings = events.filter(e => !isReminder(e) && SEM[e.type] === g && String(e.contractId) === String(d.contractId) && dayStr(e.date) === dayStr(d.date));
    const survivor = siblings.find(s => !droppedSet.has(s));
    if (!survivor) orphanClusters++;
  }

  console.log('\n======== STUFE-B CLEANUP (Dopplungen zusammenfassen) ========');
  console.log(`Zu entfernen: ${dropped.length} (${droppedMains.length} doppelte Termine + ${droppedReminders.length} deren Vorwarner) über ${contractsHit.size} Verträge`);
  console.log('Entfernte Termin-Typen:', JSON.stringify(byType));
  console.log(`\n[Sicherheit] Cluster ohne überlebenden Termin (DARF 0 sein): ${orphanClusters} ${orphanClusters === 0 ? '✅' : '❌ ABBRUCH'}`);
  if (orphanClusters > 0) { console.error('❌ Ein Cluster würde komplett gelöscht — ABBRUCH.'); process.exit(1); }

  if (mode !== '--execute') {
    console.log('\nℹ️ DRY-RUN — nichts gelöscht. Ausführen: --execute');
    process.exit(0);
  }
  if (dropped.length === 0) { console.log('\nNichts zu mergen.'); process.exit(0); }

  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `backup-duplicate-milestones-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(dropped, null, 2), 'utf8');
  const verify = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  if (verify.length !== dropped.length) { console.error('❌ Backup-Verifikation fehlgeschlagen — ABBRUCH.'); process.exit(1); }
  console.log(`\n💾 Backup gesichert + verifiziert: ${verify.length} → ${backupPath}`);

  const res = await col.deleteMany({ _id: { $in: dropped.map(e => e._id) } });
  console.log(`🗑️  Gelöscht: ${res.deletedCount}`);
  console.log(`\n✅ FERTIG. Rückgängig: node scripts/cleanupDuplicateMilestones.js --restore "${backupPath}"\n`);
  process.exit(0);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });

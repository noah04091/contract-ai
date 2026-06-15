// CLEANUP (Backup + Restore): Entfernt bestehende Lifecycle-Events, die am selben Tag wie
// ein KI-erkannter VertragsBEGINN liegen (= Datenfehler "Vertrag endet/verlängert sich an
// seinem Starttag"). Fängt den TerraTech-Fall, den der startDate-Feld-basierte Wächter NICHT
// sieht (startDate-Feld leer, Beginn nur als CONTRACT_START/SERVICE_START-Event vorhanden).
// Spiegelt die Extraktions-Logik des anderen Terminals (Ende == ein Beginn-Termin = ungültig).
// Re-Analyse allein räumt diese Alt-Events NICHT weg (dataSource=unknown, kein KI-Flag) — daher
// dieser gezielte Bestands-Cleanup.
//
//   node scripts/cleanupExpiryOnStartDay.js            → DRY-RUN
//   node scripts/cleanupExpiryOnStartDay.js --execute  → Backup + löschen
//   node scripts/cleanupExpiryOnStartDay.js --restore <backupdatei>
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const database = require('../config/database');

const BLOCK_A = ['CONTRACT_EXPIRY','AUTO_RENEWAL','CANCEL_WINDOW_OPEN','LAST_CANCEL_DAY',
  'CANCEL_WARNING','PRICE_INCREASE','PRICE_INCREASE_WARNING','REVIEW'];
const START_TYPES = ['CONTRACT_START','SERVICE_START'];
const isReminder = (e) =>
  /_REMINDER_\d+D$/i.test(e.type || '') ||
  /\d+\s*(?:Tage?|Wochen?|Monate?)\s*vorher/i.test(e.title || '');
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

(async () => {
  const mode = process.argv[2];
  const db = await database.connect();
  const col = db.collection('contract_events');

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

  const now = new Date();
  const events = await col.find({ status: 'scheduled', date: { $gt: now } }).toArray();

  // pro Vertrag: Beginn-Tage sammeln
  const startDaysByContract = new Map();
  for (const e of events) {
    if (isReminder(e)) continue;
    if (START_TYPES.includes(e.type)) {
      const k = String(e.contractId);
      if (!startDaysByContract.has(k)) startDaysByContract.set(k, new Set());
      startDaysByContract.get(k).add(dayKey(e.date));
    }
  }

  // Block-A-Events am selben Tag wie ein Beginn → falsch
  const parents = events.filter(e =>
    !isReminder(e) && BLOCK_A.includes(e.type) &&
    startDaysByContract.get(String(e.contractId))?.has(dayKey(e.date)));

  // Vorwarn-Kinder dieser Events
  const parentMap = new Set(parents.map(p => String(p._id)));
  const delTypesByContract = {};
  parents.forEach(p => { (delTypesByContract[String(p.contractId)] ||= new Set()).add(p.type); });
  const children = events.filter(e => {
    if (parentMap.has(String(e._id)) || !isReminder(e)) return false;
    if (!delTypesByContract[String(e.contractId)]?.has(e.metadata?.originalEvent)) return false;
    const lead = Number(e.metadata?.daysUntil);
    if (!Number.isFinite(lead)) return true;
    // gehört das Kind zu einem entfernten Eltern-Stichtag (±2 Tage)?
    const target = new Date(e.date); target.setDate(target.getDate() + lead);
    return parents.some(p => String(p.contractId) === String(e.contractId) &&
      Math.abs(target.getTime() - new Date(p.date).getTime()) <= 2 * 86400000);
  });

  const all = [...parents, ...children];
  const contractsHit = new Set(all.map(e => String(e.contractId)));

  console.log('\n======== CLEANUP: Lifecycle-Event am Vertragsbeginn-Tag ========');
  console.log(`Zu entfernen: ${all.length} (${parents.length} Falsch-Termine + ${children.length} Vorwarner) über ${contractsHit.size} Verträge`);
  console.log('Beispiele:');
  all.slice(0, 8).forEach(e => console.log(`  ${dayKey(e.date)} | ${e.type.padEnd(16)} | "${(e.title||'').slice(0,48)}"`));

  if (mode !== '--execute') { console.log('\nℹ️ DRY-RUN — nichts gelöscht. Ausführen: --execute'); process.exit(0); }
  if (all.length === 0) { console.log('\nNichts zu löschen.'); process.exit(0); }

  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `backup-expiry-on-startday-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(all, null, 2), 'utf8');
  const verify = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  if (verify.length !== all.length) { console.error('❌ Backup-Verifikation fehlgeschlagen — ABBRUCH.'); process.exit(1); }
  console.log(`\n💾 Backup gesichert + verifiziert: ${verify.length} → ${backupPath}`);

  const res = await col.deleteMany({ _id: { $in: all.map(e => e._id) } });
  console.log(`🗑️  Gelöscht: ${res.deletedCount}`);
  console.log(`\n✅ FERTIG. Rückgängig: node scripts/cleanupExpiryOnStartDay.js --restore "${backupPath}"\n`);
  process.exit(0);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });

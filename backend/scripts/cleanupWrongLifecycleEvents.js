// STUFE-A-CLEANUP (Backup + Restore): Entfernt bestehende FALSCHE Lifecycle-Events,
// die die neuen Wächter (calendarEvents.js, Problem A) künftig nicht mehr erzeugen:
//   A1) "🔄 Mögliche Verlängerung" (= isAutoRenewal=false → Wächter 2)
//   A2) Lifecycle-Events bei Verträgen mit Enddatum <= Startdatum (→ Wächter 1)
// PLUS: zugehörige Erinnerungs-Kinder (metadata.originalEvent == gelöschter Typ), damit
//       keine verwaisten Vorwarnungen stehenbleiben.
// Lösch-Filter ist DECKUNGSGLEICH mit der Wächter-Logik → kein echter Termin kann mit weg.
// Echte "Automatische Verlängerung" (isAutoRenewal=true, Enddatum>Start) bleiben unberührt.
//
//   node scripts/cleanupWrongLifecycleEvents.js            → DRY-RUN (zählt, löscht NICHTS)
//   node scripts/cleanupWrongLifecycleEvents.js --execute  → Backup + löschen
//   node scripts/cleanupWrongLifecycleEvents.js --restore <backupdatei>
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const database = require('../config/database');

const BLOCK_A = ['CANCEL_WINDOW_OPEN','LAST_CANCEL_DAY','CANCEL_WARNING','AUTO_RENEWAL',
  'PRICE_INCREASE','PRICE_INCREASE_WARNING','REVIEW','CONTRACT_EXPIRY'];

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
      ...d,
      _id: typeof d._id === 'string' ? new ObjectId(d._id) : d._id,
      date: d.date ? new Date(d.date) : d.date,
      createdAt: d.createdAt ? new Date(d.createdAt) : d.createdAt,
      updatedAt: d.updatedAt ? new Date(d.updatedAt) : d.updatedAt
    }));
    let restored = 0, skipped = 0;
    for (const doc of docs) { if (await col.findOne({ _id: doc._id })) { skipped++; } else { await col.insertOne(doc); restored++; } }
    console.log(`\n✅ RESTORE: ${restored} wiederhergestellt, ${skipped} existierten bereits.`);
    process.exit(0);
  }

  // ===== Treffer bestimmen =====
  const now = new Date();
  const events = await col.find({ status: 'scheduled', date: { $gt: now } }).toArray();

  // Verträge mit Enddatum <= Startdatum (Wächter-1-Fall) — DECKUNGSGLEICH mit calendarEvents.js,
  // inkl. der Auto-Renewal-Vorwärts-Rollung des Enddatums (Z.70-84), damit echte Auto-Renewals
  // mit zukünftig gerolltem Enddatum NICHT fälschlich als "Enddatum<=Start" gelten.
  const contracts = await db.collection('contracts')
    .find({}, { projection: { startDate: 1, expiryDate: 1, endDate: 1, isAutoRenewal: 1, autoRenewMonths: 1, name: 1 } }).toArray();
  const effectiveExpiry = (c) => {
    let exp = c.expiryDate ? new Date(c.expiryDate) : (c.endDate ? new Date(c.endDate) : null);
    const isAR = c.isAutoRenewal || false;
    const arM = c.autoRenewMonths || 12;
    if (isAR && exp && exp < now) { while (exp < now) { exp.setMonth(exp.getMonth() + arM); } }
    return exp;
  };
  const badExpiry = new Set(contracts.filter(c => {
    const exp = effectiveExpiry(c);
    const start = c.startDate ? new Date(c.startDate) : null;
    if (!exp) return false; // ohne Enddatum erzeugt der alte Code gar keine Block-A-Events
    return !!start && exp.getTime() <= start.getTime();
  }).map(c => String(c._id)));
  const cName = new Map(contracts.map(c => [String(c._id), c.name]));

  // A1: "Mögliche Verlängerung" (isAutoRenewal=false)
  const a1 = events.filter(e => e.type === 'AUTO_RENEWAL' && /Mögliche Verlängerung/i.test(e.title || ''));
  // A2: Block-A-Events bei badExpiry-Verträgen
  const a2 = events.filter(e => badExpiry.has(String(e.contractId)) && BLOCK_A.includes(e.type));

  // Eltern (dedupliziert per _id)
  const parentMap = new Map();
  [...a1, ...a2].forEach(e => parentMap.set(String(e._id), e));
  const parents = [...parentMap.values()];

  // Erinnerungs-Kinder: isReminder + metadata.originalEvent == gelöschter Typ im selben Vertrag
  const delTypesByContract = {};
  parents.forEach(p => { (delTypesByContract[String(p.contractId)] ||= new Set()).add(p.type); });
  const children = events.filter(e =>
    !parentMap.has(String(e._id)) && isReminder(e) &&
    delTypesByContract[String(e.contractId)]?.has(e.metadata?.originalEvent));

  const all = [...parents, ...children];
  const contractsHit = new Set(all.map(e => String(e.contractId)));

  // Sicherheits-Gegenprobe (DECKUNGSGLEICH): Eine echte "Automatische Verlängerung" darf NUR
  // gelöscht werden, wenn ihr Vertrag bad-expiry ist (Start>=Ende) — denn dann überspringt der
  // Wächter sie ohnehin. Auf einem GÜLTIGEN Vertrag gelöscht zu werden wäre falsch → Abbruch.
  const echtVerlaengerung = events.filter(e => e.type === 'AUTO_RENEWAL' && /Automatische Verlängerung/i.test(e.title || ''));
  const echtGetroffenOk = echtVerlaengerung.filter(e => parentMap.has(String(e._id)) && badExpiry.has(String(e.contractId)));
  const echtGetroffen = echtVerlaengerung.filter(e => parentMap.has(String(e._id)) && !badExpiry.has(String(e.contractId)));

  console.log('\n======== STUFE-A CLEANUP ========');
  console.log(`A1 "Mögliche Verlängerung":               ${a1.length}`);
  console.log(`A2 Lifecycle bei Enddatum<=Start:         ${a2.length}  (über ${badExpiry.size} betroffene Verträge)`);
  console.log(`Erinnerungs-Kinder (verwaiste Vorwarner): ${children.length}`);
  console.log(`→ GESAMT zu löschen:                      ${all.length}  über ${contractsHit.size} Verträge`);
  console.log(`\n[Sicherheit] echte "Automatische Verlängerung": ${echtVerlaengerung.length} gesamt | ${echtGetroffenOk.length} auf kaputten Verträgen (Start>=Ende) → korrekt entfernt (Wächter skippt sie eh) | ${echtGetroffen.length} auf GÜLTIGEN Verträgen → ${echtGetroffen.length===0?'0 ✅':(echtGetroffen.length+' ❌')}`);

  if (echtGetroffen.length > 0) { console.error('❌ Echte Verlängerung auf GÜLTIGEM Vertrag im Lösch-Set — ABBRUCH.'); process.exit(1); }

  if (mode !== '--execute') {
    console.log('\nℹ️ DRY-RUN — nichts gelöscht. Ausführen: --execute');
    console.log('Beispiele:');
    all.slice(0, 6).forEach(e => console.log(`  ${new Date(e.date).toISOString().slice(0,10)} | ${e.type.padEnd(18)} | "${(e.title||'').slice(0,45)}" | ${cName.get(String(e.contractId))?.slice(0,25)||''}`));
    process.exit(0);
  }

  if (all.length === 0) { console.log('\nNichts zu löschen.'); process.exit(0); }

  // Backup + verifizieren
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `backup-wrong-lifecycle-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(all, null, 2), 'utf8');
  const verify = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  if (verify.length !== all.length) { console.error('❌ Backup-Verifikation fehlgeschlagen — ABBRUCH.'); process.exit(1); }
  console.log(`\n💾 Backup gesichert + verifiziert: ${verify.length} Events → ${backupPath}`);

  const ids = all.map(e => e._id);
  const res = await col.deleteMany({ _id: { $in: ids } });
  console.log(`🗑️  Gelöscht: ${res.deletedCount}`);
  console.log(`\n✅ FERTIG. Rückgängig: node scripts/cleanupWrongLifecycleEvents.js --restore "${backupPath}"\n`);
  process.exit(0);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });

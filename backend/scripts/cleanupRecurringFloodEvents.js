// STUFE-1-CLEANUP (mit Backup + Restore): Entfernt bestehende hochfrequent-wiederkehrende
// Frist-Events (monatlich/wöchentlich + zahlungsfrist jeder Frequenz), die die neue Anti-Flut-
// Regel (calendarEvents.js) künftig nicht mehr erzeugt. Diese Events sind Zeitstrahl-Rauschen
// und lösen monatlichen Mail-Spam aus.
//
// SICHERHEIT: Sichert IMMER zuerst alle Treffer in eine JSON-Backup-Datei, verifiziert die
// Sicherung, und löscht erst dann. Vollständig rückholbar via --restore.
//
// Modi:
//   node scripts/cleanupRecurringFloodEvents.js            → DRY-RUN (zählt + zeigt, löscht NICHTS)
//   node scripts/cleanupRecurringFloodEvents.js --execute  → Backup schreiben, dann löschen
//   node scripts/cleanupRecurringFloodEvents.js --restore <backupdatei>  → Backup zurückspielen
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const database = require('../config/database');

const HIGH_FREQ = ['weekly', 'biweekly', 'monthly'];

function buildFilter(now) {
  return {
    'metadata.source': 'fristHinweis-recurring',
    status: 'scheduled',
    date: { $gt: now },
    isManual: { $ne: true },
    $or: [
      { 'metadata.originalType': 'zahlungsfrist' },
      { 'metadata.recurrencePattern.intervalType': { $in: HIGH_FREQ } }
    ]
  };
}

(async () => {
  const mode = process.argv[2];
  const db = await database.connect();
  const col = db.collection('contract_events');

  // ===== RESTORE-MODUS =====
  if (mode === '--restore') {
    const file = process.argv[3];
    if (!file || !fs.existsSync(file)) { console.error('❌ Backup-Datei nicht gefunden:', file); process.exit(1); }
    const docs = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Datums-Strings zurück in Date-Objekte + _id beibehalten
    const { ObjectId } = require('mongodb');
    const restore = docs.map(d => ({
      ...d,
      _id: typeof d._id === 'string' ? new ObjectId(d._id) : d._id,
      date: d.date ? new Date(d.date) : d.date,
      createdAt: d.createdAt ? new Date(d.createdAt) : d.createdAt,
      updatedAt: d.updatedAt ? new Date(d.updatedAt) : d.updatedAt
    }));
    let restored = 0, skipped = 0;
    for (const doc of restore) {
      const exists = await col.findOne({ _id: doc._id });
      if (exists) { skipped++; continue; }
      await col.insertOne(doc);
      restored++;
    }
    console.log(`\n✅ RESTORE fertig: ${restored} wiederhergestellt, ${skipped} existierten bereits (übersprungen).`);
    process.exit(0);
  }

  // ===== DRY-RUN / EXECUTE =====
  const now = new Date();
  const filter = buildFilter(now);
  const matches = await col.find(filter).toArray();

  const byType = {};
  for (const e of matches) { const k = e.metadata?.originalType || '?'; byType[k] = (byType[k] || 0) + 1; }
  const contracts = new Set(matches.map(e => String(e.contractId)));

  console.log('\n======== STUFE-1 CLEANUP ========');
  console.log(`Treffer: ${matches.length} Events über ${contracts.size} Verträge`);
  console.log('Nach Typ:', JSON.stringify(byType));

  if (mode !== '--execute') {
    console.log('\nℹ️ DRY-RUN — es wird NICHTS gelöscht. Zum Ausführen: --execute');
    process.exit(0);
  }

  if (matches.length === 0) { console.log('\nNichts zu löschen.'); process.exit(0); }

  // 1) Backup schreiben
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `backup-recurring-flood-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(matches, null, 2), 'utf8');

  // 2) Backup verifizieren
  const verify = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  if (verify.length !== matches.length) {
    console.error(`❌ Backup-Verifikation fehlgeschlagen (${verify.length} ≠ ${matches.length}) — ABBRUCH, nichts gelöscht.`);
    process.exit(1);
  }
  console.log(`\n💾 Backup gesichert + verifiziert: ${verify.length} Events → ${backupPath}`);

  // 3) Löschen (per _id-Liste, exakt die gesicherten)
  const ids = matches.map(e => e._id);
  const res = await col.deleteMany({ _id: { $in: ids } });
  console.log(`🗑️  Gelöscht: ${res.deletedCount} Events`);

  // 4) Verifizieren, dass weg
  const remaining = await col.countDocuments(filter);
  console.log(`🔎 Verbleibend (Filter): ${remaining}`);
  console.log(`\n✅ FERTIG. Rückgängig machen mit:\n   node scripts/cleanupRecurringFloodEvents.js --restore "${backupPath}"\n`);
  process.exit(0);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });

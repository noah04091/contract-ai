// Korrigiert bestehende Verträge mit kaputtem/Platzhalter-Namen (z.B. "$value.pdf"
// aus fremden Lohn-/Export-Systemen, "undefined.pdf", "null.pdf", leerer Name, nur Endung).
// Setzt stattdessen einen sinnvollen Namen (KI-Charakterisierung / Vertragstyp-Label /
// Provider / "Dokument"). Spiegelt die Backend-Härtung in saveContractWithUpload().
//
//   node scripts/fixPlaceholderContractNames.js            → DRY-RUN (zeigt nur an)
//   node scripts/fixPlaceholderContractNames.js --execute  → Backup + umbenennen
//   node scripts/fixPlaceholderContractNames.js --restore <backupdatei>
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');
const database = require('../config/database');

function isPlaceholderDocName(n) {
  const t = String(n == null ? '' : n).trim();
  return !t || /[${}]/.test(t) || /^(undefined|null)(\.|$)/i.test(t) || /^\.[a-z0-9]{1,5}$/i.test(t);
}

function fallbackName(c) {
  const dc = c.documentCharacterization || (c.analysis && c.analysis.documentCharacterization) || null;
  const desc = dc && typeof dc.description === 'string' ? dc.description.trim() : '';
  const provider = c.provider && typeof c.provider.name === 'string' ? c.provider.name.trim() : '';
  return desc || c.contractTypeLabel || provider || 'Dokument';
}

(async () => {
  const mode = process.argv[2];
  const db = await database.connect();
  const col = db.collection('contracts');

  // ----- RESTORE -----
  if (mode === '--restore') {
    const file = process.argv[3];
    if (!file || !fs.existsSync(file)) { console.error('❌ Backup nicht gefunden:', file); process.exit(1); }
    const docs = JSON.parse(fs.readFileSync(file, 'utf8'));
    let restored = 0;
    for (const d of docs) {
      await col.updateOne({ _id: new ObjectId(d._id) }, { $set: { name: d.name } });
      restored++;
    }
    console.log(`♻️  ${restored} Namen wiederhergestellt aus ${file}`);
    process.exit(0);
  }

  // ----- DRY-RUN / EXECUTE -----
  const execute = process.argv.includes('--execute');
  const all = await col.find(
    {},
    { projection: { name: 1, contractTypeLabel: 1, provider: 1, documentCharacterization: 1, analysis: 1 } }
  ).toArray();
  const broken = all.filter((c) => isPlaceholderDocName(c.name));

  console.log(`📊 ${broken.length} Vertrag/Verträge mit Platzhalter-Namen (von ${all.length} gesamt)`);
  broken.forEach((c) => console.log(`  ${c._id}: "${c.name}"  →  "${fallbackName(c)}"`));

  if (broken.length === 0) { console.log('✅ Nichts zu tun.'); process.exit(0); }
  if (!execute) { console.log('\nℹ️  DRY-RUN. Zum Anwenden: node scripts/fixPlaceholderContractNames.js --execute'); process.exit(0); }

  // Backup
  const backup = broken.map((c) => ({ _id: String(c._id), name: c.name }));
  const backupFile = path.join(__dirname, `backup-placeholder-names-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`💾 Backup: ${backupFile}`);

  let n = 0;
  for (const c of broken) {
    await col.updateOne({ _id: c._id }, { $set: { name: fallbackName(c) } });
    n++;
  }
  console.log(`✅ ${n} Vertrag/Verträge umbenannt. (Rückgängig: --restore ${path.basename(backupFile)})`);
  process.exit(0);
})().catch((e) => { console.error('❌ Fehler:', e); process.exit(1); });

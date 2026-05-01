/**
 * Diagnose: Echte Redline-Daten des Factoring-Vertrags aus MongoDB inspizieren
 *
 * READ-ONLY. Macht ein einziges findOne(), schreibt nichts, ändert nichts.
 *
 * Findet die letzte abgeschlossene Optimizer-V2-Analyse des Factoring-Vertrags
 * für den Test-User und zeigt für jede Klausel, ob die in der DB gespeicherten
 * Diffs zur tatsächlichen Text-Differenz passen.
 *
 * Usage: node backend/scripts/inspectFactoringRedline.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const TARGET_USER_ID = '699c99de6ffba01ace3db87b';
const MODE = 'neutral'; // entspricht dem Tab "Neutral" im Screenshot

function fmt(n, w = 4) { return String(n).padStart(w); }
function pct(part, total) { return total === 0 ? '0%' : Math.round(part / Math.max(total, 1) * 100) + '%'; }
function preview(s, len = 120) {
  if (!s) return '(leer)';
  const cleaned = s.replace(/\n/g, '\\n').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, len) + (cleaned.length > len ? '...' : '');
}
function normalize(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI nicht gesetzt. Aborted (kein DB-Zugriff).');
    process.exit(1);
  }

  console.log('Verbinde zur MongoDB (read-only Intent)...');
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'contract_ai' });
  const db = mongoose.connection.db;
  const col = db.collection('optimizer_v2_results');

  console.log(`Suche letzte 'completed' Optimizer-V2-Analyse für User ${TARGET_USER_ID} mit fileName ~ /Factoring/i ...`);

  const result = await col.findOne(
    { userId: TARGET_USER_ID, fileName: /factoring|grenkefactoring|kaja/i, status: 'completed' },
    { sort: { createdAt: -1 } }
  );

  if (!result) {
    console.log('❌ Keine passende Analyse gefunden. Prüfe alternativ alle Analysen des Users:');
    const fallback = await col.find({ userId: TARGET_USER_ID, status: 'completed' })
      .project({ fileName: 1, createdAt: 1, _id: 1 })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    console.log('Letzte 10 abgeschlossene Analysen:');
    fallback.forEach(r => console.log(`  ${r._id}  ${r.fileName}  (${r.createdAt})`));
    await mongoose.disconnect();
    process.exit(2);
  }

  console.log('\n========================================================');
  console.log(`✓ Analyse gefunden`);
  console.log(`  ID:        ${result._id}`);
  console.log(`  Datei:     ${result.fileName}`);
  console.log(`  Erstellt:  ${result.createdAt}`);
  console.log(`  Klauseln:  ${(result.clauses || []).length}`);
  console.log(`  Optimierungen: ${(result.optimizations || []).length}`);
  console.log('========================================================');

  const clauses = result.clauses || [];
  const optMap = new Map();
  for (const o of (result.optimizations || [])) optMap.set(o.clauseId, o);

  // Per-Klausel Analyse
  const stats = {
    total: 0,
    needsOpt: 0,
    suspicious: 0,    // alles rot trotz inhaltsgleich
    largeDiff: 0,     // >50% rot (echte oder vermeintliche)
    small: 0,         // saubere kleine Optimierung
    unchanged: 0
  };

  const suspicious = []; // Liste der verdächtigen Klauseln

  console.log('\n=== KLAUSEL-DETAIL ===\n');

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const opt = optMap.get(clause.id);
    const version = opt?.versions?.[MODE];

    const orig = clause.originalText || '';
    const optText = version?.text || '';
    const diffs = version?.diffs || [];
    const needsOpt = !!opt?.needsOptimization;

    const equalChars = diffs.filter(d => d.type === 'equal').reduce((s, d) => s + (d.text || '').length, 0);
    const removeChars = diffs.filter(d => d.type === 'remove').reduce((s, d) => s + (d.text || '').length, 0);
    const addChars = diffs.filter(d => d.type === 'add').reduce((s, d) => s + (d.text || '').length, 0);
    const equalCount = diffs.filter(d => d.type === 'equal').length;
    const removeCount = diffs.filter(d => d.type === 'remove').length;
    const addCount = diffs.filter(d => d.type === 'add').length;

    const wsEqual = normalize(orig) === normalize(optText);
    const removeRatio = orig.length > 0 ? removeChars / orig.length : 0;

    stats.total++;
    if (needsOpt) stats.needsOpt++;
    else stats.unchanged++;

    let flag = '🟢 ok';
    if (needsOpt) {
      if (wsEqual && removeChars > 0) {
        flag = '🔴 VERDÄCHTIG: Texte sind whitespace-normalisiert IDENTISCH, aber Diff zeigt Remove-Ops';
        stats.suspicious++;
        suspicious.push({ idx: i, clause, opt, version });
      } else if (removeRatio > 0.7) {
        flag = '🟡 GROSS: >70% des Originals als entfernt markiert';
        stats.largeDiff++;
      } else {
        stats.small++;
      }
    }

    // Nur die ersten 5 + alle verdächtigen ausgeben (sonst zu viel)
    const showFull = i < 5 || flag.startsWith('🔴') || flag.startsWith('🟡');
    if (!showFull && needsOpt) continue;
    if (!showFull && !needsOpt) continue;

    const sectionNum = clause.sectionNumber || '-';
    const title = (clause.title || '').slice(0, 60);
    const category = clause.category || '-';

    console.log(`[#${fmt(i + 1, 2)}] ${flag}`);
    console.log(`     Sektion: "${sectionNum}"  | Title: "${title}"  | Kategorie: ${category}`);
    console.log(`     needsOptimization: ${needsOpt}`);
    console.log(`     Original  (${fmt(orig.length, 5)} chars): "${preview(orig, 130)}"`);
    if (needsOpt) {
      console.log(`     Optimiert (${fmt(optText.length, 5)} chars): "${preview(optText, 130)}"`);
      console.log(`     Whitespace-normalisiert IDENTISCH: ${wsEqual ? 'JA ⚠' : 'nein'}`);
      console.log(`     Diffs: ${diffs.length} Ops  | equal=${equalCount} (${equalChars} chars) remove=${removeCount} (${removeChars} chars) add=${addCount} (${addChars} chars)`);
      console.log(`     remove-Anteil am Original: ${pct(removeChars, orig.length)}`);
    }
    console.log('');
  }

  console.log('\n========================================================');
  console.log('ZUSAMMENFASSUNG');
  console.log('========================================================');
  console.log(`Gesamt-Klauseln:                       ${stats.total}`);
  console.log(`  davon mit needsOptimization=true:    ${stats.needsOpt}`);
  console.log(`  davon ohne (unverändert):            ${stats.unchanged}`);
  console.log('');
  console.log(`🔴 VERDÄCHTIG (alles rot trotz inhaltsgleich): ${stats.suspicious}`);
  console.log(`🟡 GROSSE Diffs (>70% rot):                    ${stats.largeDiff}`);
  console.log(`🟢 Kleine/normale Optimierungen:                ${stats.small}`);
  console.log('');

  if (suspicious.length > 0) {
    console.log('========================================================');
    console.log('LISTE DER VERDÄCHTIGEN KLAUSELN');
    console.log('========================================================');
    suspicious.forEach((s, j) => {
      console.log(`\n--- Verdächtig #${j + 1} (Klausel #${s.idx + 1}) ---`);
      console.log(`Title: ${s.clause.title}`);
      console.log(`Kategorie: ${s.clause.category}`);
      console.log(`reasoning: "${(s.version?.reasoning || '(leer)').slice(0, 200)}"`);
      console.log(`Original (volle Länge ${(s.clause.originalText || '').length}):`);
      console.log(`"${preview(s.clause.originalText, 250)}"`);
      console.log(`Optimiert (volle Länge ${(s.version?.text || '').length}):`);
      console.log(`"${preview(s.version?.text, 250)}"`);
    });
  }

  console.log('\n========================================================');
  console.log('Diagnose abgeschlossen. Disconnecting...');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Fehler:', err.message);
  console.error(err.stack);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});

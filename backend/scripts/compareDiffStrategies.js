/**
 * Verifikation: Welcher Diff-Algorithmus liefert das beste Bild für die
 * problematischen Klauseln des Factoring-Vertrags?
 *
 * READ-ONLY. Schreibt nichts. Vergleicht nur Output verschiedener Algorithmen
 * für dieselben Inputs.
 *
 * Algorithmen:
 *   1. CURRENT     — produktive Funktion (diffWords + Sentence-Fallback @ 60%)
 *   2. WORDS_ONLY  — nur diffWords, kein Fallback
 *   3. WORDS_85    — diffWords mit Sentence-Fallback erst @ 85%
 *   4. LINES       — diffLines (zeilenweise)
 *
 * Bewertung pro Klausel:
 *   - Anzahl Ops (mehr = feinkoerniger)
 *   - equal-Anteil am Original (hoeher = mehr "ungeaendert" Text sichtbar)
 *   - max remove-Block-Groesse (kleiner = besser, da kein "alles weg")
 *
 * Usage: node backend/scripts/compareDiffStrategies.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Diff = require('diff');

const TARGET_USER_ID = '699c99de6ffba01ace3db87b';
const MODE = 'neutral';

function fmt(n, w = 5) { return String(n).padStart(w); }
function pct(part, total) { return total === 0 ? '0%' : Math.round(part / Math.max(total, 1) * 100) + '%'; }

// --- Vier Diff-Strategien ---

function runCurrent(original, optimized) {
  if (!original || !optimized) return [];
  if (original === optimized) return [{ type: 'equal', text: original }];
  const wd = Diff.diffWords(original, optimized, { intlSegmenter: undefined });
  const changeCount = wd.filter(c => c.added || c.removed).length;
  const ratio = wd.length > 0 ? changeCount / wd.length : 0;
  const changes = ratio > 0.6 ? Diff.diffSentences(original, optimized) : wd;
  return mapOps(changes);
}

function runWordsOnly(original, optimized) {
  if (!original || !optimized) return [];
  if (original === optimized) return [{ type: 'equal', text: original }];
  return mapOps(Diff.diffWords(original, optimized, { intlSegmenter: undefined }));
}

function runWords85(original, optimized) {
  if (!original || !optimized) return [];
  if (original === optimized) return [{ type: 'equal', text: original }];
  const wd = Diff.diffWords(original, optimized, { intlSegmenter: undefined });
  const changeCount = wd.filter(c => c.added || c.removed).length;
  const ratio = wd.length > 0 ? changeCount / wd.length : 0;
  const changes = ratio > 0.85 ? Diff.diffSentences(original, optimized) : wd;
  return mapOps(changes);
}

function runLines(original, optimized) {
  if (!original || !optimized) return [];
  if (original === optimized) return [{ type: 'equal', text: original }];
  return mapOps(Diff.diffLines(original, optimized, { newlineIsToken: false }));
}

function mapOps(changes) {
  const ops = [];
  for (const c of changes) {
    if (c.added) ops.push({ type: 'add', text: c.value });
    else if (c.removed) ops.push({ type: 'remove', text: c.value });
    else ops.push({ type: 'equal', text: c.value });
  }
  return ops;
}

// --- Statistik pro Algorithmus ---
function statsOf(ops, originalLen) {
  const eq = ops.filter(o => o.type === 'equal');
  const rm = ops.filter(o => o.type === 'remove');
  const ad = ops.filter(o => o.type === 'add');
  const eqChars = eq.reduce((s, o) => s + o.text.length, 0);
  const rmChars = rm.reduce((s, o) => s + o.text.length, 0);
  const adChars = ad.reduce((s, o) => s + o.text.length, 0);
  const maxRemoveBlock = rm.reduce((m, o) => Math.max(m, o.text.length), 0);
  return {
    opsCount: ops.length,
    eqCount: eq.length,
    rmCount: rm.length,
    adCount: ad.length,
    eqChars, rmChars, adChars,
    maxRemoveBlock,
    eqRatio: originalLen > 0 ? eqChars / originalLen : 0
  };
}

async function run() {
  if (!process.env.MONGO_URI) { console.error('MONGO_URI fehlt'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'contract_ai' });
  const col = mongoose.connection.db.collection('optimizer_v2_results');

  const result = await col.findOne(
    { userId: TARGET_USER_ID, fileName: /factoring|grenkefactoring|kaja/i, status: 'completed' },
    { sort: { createdAt: -1 } }
  );
  if (!result) { console.log('Nicht gefunden'); await mongoose.disconnect(); process.exit(2); }

  const optMap = new Map();
  for (const o of (result.optimizations || [])) optMap.set(o.clauseId, o);

  // Identifiziere problematische Klauseln (>70% rot)
  const problematic = [];
  for (let i = 0; i < (result.clauses || []).length; i++) {
    const clause = result.clauses[i];
    const opt = optMap.get(clause.id);
    const v = opt?.versions?.[MODE];
    if (!opt?.needsOptimization || !v?.text) continue;
    const orig = clause.originalText || '';
    const optTxt = v.text || '';
    const removeChars = (v.diffs || []).filter(d => d.type === 'remove').reduce((s, d) => s + (d.text || '').length, 0);
    const ratio = orig.length > 0 ? removeChars / orig.length : 0;
    if (ratio > 0.7) {
      problematic.push({ idx: i + 1, clause, version: v });
    }
  }

  console.log('========================================================');
  console.log('DIFF-STRATEGIE-VERGLEICH');
  console.log(`${problematic.length} problematische Klauseln (>70% rot mit aktuellem Algorithmus)`);
  console.log('========================================================\n');

  // Aggregate-Stats per Strategie
  const aggregates = {
    CURRENT: { totalOrig: 0, totalEq: 0, totalRm: 0, totalAd: 0, maxBlock: 0, opsSum: 0 },
    WORDS_ONLY: { totalOrig: 0, totalEq: 0, totalRm: 0, totalAd: 0, maxBlock: 0, opsSum: 0 },
    WORDS_85: { totalOrig: 0, totalEq: 0, totalRm: 0, totalAd: 0, maxBlock: 0, opsSum: 0 },
    LINES: { totalOrig: 0, totalEq: 0, totalRm: 0, totalAd: 0, maxBlock: 0, opsSum: 0 }
  };

  for (const p of problematic) {
    const orig = p.clause.originalText || '';
    const optTxt = p.version.text || '';
    const title = (p.clause.title || '').slice(0, 70);

    console.log(`--- Klausel #${p.idx}: "${title}" ---`);
    console.log(`    Original ${orig.length} chars  |  Optimiert ${optTxt.length} chars`);

    const variants = {
      CURRENT: runCurrent(orig, optTxt),
      WORDS_ONLY: runWordsOnly(orig, optTxt),
      WORDS_85: runWords85(orig, optTxt),
      LINES: runLines(orig, optTxt)
    };

    console.log('    Strategie    | Ops  | equal-Ratio | max-remove-Block | Bewertung');
    console.log('    -------------|------|-------------|------------------|----------');
    for (const [name, ops] of Object.entries(variants)) {
      const s = statsOf(ops, orig.length);
      // Aggregate update
      const a = aggregates[name];
      a.totalOrig += orig.length;
      a.totalEq += s.eqChars;
      a.totalRm += s.rmChars;
      a.totalAd += s.adChars;
      a.maxBlock = Math.max(a.maxBlock, s.maxRemoveBlock);
      a.opsSum += s.opsCount;

      // Indicator
      let ind = '';
      if (s.eqRatio > 0.3) ind = '✓ erkennt gemeinsame Stellen';
      else if (s.eqRatio > 0.05) ind = '⚠ wenig Gemeinsamkeiten erkannt';
      else ind = '✗ keine Gemeinsamkeiten — Block-rot';

      console.log(`    ${name.padEnd(12)} | ${fmt(s.opsCount, 4)} | ${pct(s.eqChars, orig.length).padStart(11)} | ${fmt(s.maxRemoveBlock, 16)} | ${ind}`);
    }
    console.log('');
  }

  // Aggregate-Zusammenfassung
  console.log('========================================================');
  console.log('AGGREGATE über alle problematischen Klauseln');
  console.log('========================================================');
  console.log('Strategie     | gesamt-Ops | equal-Ratio gesamt | max-remove-Block-gesamt');
  console.log('--------------|------------|--------------------|-------------------------');
  for (const [name, a] of Object.entries(aggregates)) {
    console.log(`${name.padEnd(13)} | ${fmt(a.opsSum, 10)} | ${pct(a.totalEq, a.totalOrig).padStart(18)} | ${fmt(a.maxBlock, 23)}`);
  }

  console.log('\nLEGENDE:');
  console.log('  Mehr Ops = feinkoerniger (besser fuer den User)');
  console.log('  Hoeherer equal-Ratio = mehr unveraenderter Text sichtbar (besser)');
  console.log('  Kleinere max-remove-Bloecke = kein "alles ist rot" Effekt (besser)');

  await mongoose.disconnect();
}

run().catch(err => { console.error('Fehler:', err.message); console.error(err.stack); mongoose.disconnect().catch(() => {}); process.exit(1); });

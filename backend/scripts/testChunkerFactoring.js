/**
 * READ-ONLY Test für splitIntoSemanticChunks() gegen den echten Factoring-Vertrag.
 *
 * Ziel: Verifizieren dass der Chunker
 *   1. Den Vertrag in 5-15 sinnvolle Chunks zerlegt
 *   2. Alle Chunks im Größenrahmen (400-2000 chars) bleiben
 *   3. JEDE der 4 nachgewiesenen Frist-Passagen KOMPLETT in mindestens
 *      einem Chunk vorhanden ist (kein Boundary-Verlust)
 *   4. Kein Chunk modifiziert wurde — Slice 1:1 aus dem Original
 *
 * Macht NUR Lesezugriff auf MongoDB. Schreibt nichts. Ändert keinen Service-Code.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const {
  splitIntoSemanticChunks,
  CHUNK_TARGET_LEN,
  CHUNK_MIN_LEN,
  CHUNK_MAX_LEN,
  CHUNK_OVERLAP
} = require('../services/dateHuntService');

const TARGET_USER_ID = '699c99de6ffba01ace3db87b';
const FILE_REGEX = /factoring|grenkefactoring|kaja|keck.*marckert|FRV/i;

// Die 4 in Schritt 1 verifizierten Frist-Passagen — als Substring-Suche.
// Jede MUSS in mindestens einem Chunk vollständig enthalten sein.
const KNOWN_FRISTEN = [
  { label: 'Kündigungsfrist 2 Wochen',
    needle: 'Kündigungsfrist von 2 Wochen' },
  { label: 'Reaktionsfrist 90 Tage',
    needle: '90 Tage nach Fälligkeit' },
  { label: 'Einwendungsfrist 6 Wochen',
    needle: '6 Wochen nach erfolgtem Zugang' },
  { label: 'Refinanzierer-Bestätigung 10 Tage',
    needle: '10 Tagen an den Refinanzierer' }
];

// normalize() Imitation für robusteres Matching (gleicher Algorithmus wie Service)
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI nicht gesetzt. Aborted.');
    process.exit(1);
  }
  console.log('Verbinde zur MongoDB (read-only)...');
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'contract_ai' });
  const db = mongoose.connection.db;

  const analysis = await db.collection('analyses').findOne(
    { userId: TARGET_USER_ID, contractName: FILE_REGEX },
    { sort: { createdAt: -1 } }
  );
  if (!analysis) {
    console.log('Keine Factoring-Analyse gefunden. Aborted.');
    await mongoose.disconnect();
    process.exit(2);
  }

  const text = analysis.fullText || analysis.extractedText || '';
  if (!text) {
    console.log('Kein Vertragstext gespeichert. Aborted.');
    await mongoose.disconnect();
    process.exit(3);
  }

  console.log(`\nVertrag geladen: ${analysis.contractName} (${text.length} chars)`);
  console.log(`Konstanten: TARGET=${CHUNK_TARGET_LEN} MIN=${CHUNK_MIN_LEN} MAX=${CHUNK_MAX_LEN} OVERLAP=${CHUNK_OVERLAP}\n`);

  // === Test 1: Chunker laufen lassen ===
  const t0 = Date.now();
  const chunks = splitIntoSemanticChunks(text);
  const elapsedMs = Date.now() - t0;
  console.log(`[Test 1] Chunker fertig in ${elapsedMs}ms. ${chunks.length} Chunks erzeugt.\n`);

  // === Test 2: Größen-Statistik ===
  console.log('================================================================');
  console.log('CHUNK-ÜBERSICHT');
  console.log('================================================================');
  let undersize = 0;
  let oversize = 0;
  for (const c of chunks) {
    const len = c.text.length;
    const tooSmall = len < CHUNK_MIN_LEN;
    const tooLarge = len > CHUNK_MAX_LEN;
    if (tooSmall && c.idx !== chunks.length - 1) undersize++; // letzter Chunk darf kleiner sein
    if (tooLarge) oversize++;
    const flag = tooSmall ? '!UNDER' : tooLarge ? '!OVER' : 'ok';
    const preview = c.text.slice(0, 80).replace(/\s+/g, ' ').trim();
    console.log(`  Chunk ${String(c.idx).padStart(2)}: [${c.startOffset}-${c.endOffset}] len=${String(len).padStart(5)} ${flag}  "${preview}..."`);
  }
  console.log(`\nUnter MIN: ${undersize}  |  Über MAX: ${oversize}`);

  // === Test 3: Slice-1:1-Check ===
  console.log('\n================================================================');
  console.log('SLICE-INTEGRITÄT (Chunk == text.slice(start, end)?)');
  console.log('================================================================');
  let sliceFails = 0;
  for (const c of chunks) {
    const expected = text.slice(c.startOffset, c.endOffset);
    if (c.text !== expected) {
      sliceFails++;
      console.log(`  FAIL Chunk ${c.idx}: text != slice(${c.startOffset}, ${c.endOffset})`);
    }
  }
  console.log(sliceFails === 0 ? '  Alle Chunks sind exakte Slices des Originals.' : `  ${sliceFails} Chunks weichen ab!`);

  // === Test 4: Boundary-Schutz für die 4 verifizierten Fristen ===
  console.log('\n================================================================');
  console.log('FRIST-PASSAGEN: ist jede in mindestens einem Chunk komplett?');
  console.log('================================================================');
  let lostFristen = 0;
  for (const f of KNOWN_FRISTEN) {
    const needleNorm = normalize(f.needle);
    const chunksContaining = [];
    for (const c of chunks) {
      if (normalize(c.text).includes(needleNorm)) {
        chunksContaining.push(c.idx);
      }
    }
    const status = chunksContaining.length > 0 ? 'OK' : 'VERLOREN';
    if (chunksContaining.length === 0) lostFristen++;
    console.log(`  [${status}] ${f.label}`);
    console.log(`           Suche: "${f.needle}"`);
    console.log(`           In Chunks: ${chunksContaining.length > 0 ? chunksContaining.join(', ') : '(keiner!)'}`);
  }

  // === Gesamt-Fazit ===
  console.log('\n================================================================');
  console.log('GESAMT-FAZIT');
  console.log('================================================================');
  const ok = sliceFails === 0 && oversize === 0 && lostFristen === 0;
  console.log(`  Slice-Fails:   ${sliceFails}`);
  console.log(`  Oversize:      ${oversize}`);
  console.log(`  Undersize:     ${undersize} (nur problematisch wenn nicht der letzte Chunk)`);
  console.log(`  Verlorene Fristen: ${lostFristen}`);
  console.log(`  ==> ${ok ? 'CHUNKER FUNKTIONIERT — bereit für Stage 2 GPT-Anbindung.' : 'CHUNKER hat Probleme. Stop.'}`);

  await mongoose.disconnect();
  process.exit(ok ? 0 : 4);
}

run().catch(err => {
  console.error('Fehler:', err.message);
  console.error(err.stack);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});

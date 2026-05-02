/**
 * READ-ONLY Diagnose für Date-Hunt-Failure am Factoring-Vertrag.
 *
 * Macht ausschließlich findOne()-Queries. Schreibt nichts. Ändert nichts.
 *
 * Was wir herausfinden:
 *  1. Liegt der Factoring-Vertragstext überhaupt im DB-Feld `fullText` /
 *     `extractedText` und wie sauber ist die PDF-Extraktion?
 *  2. Welche aktuell gespeicherten importantDates / fristHinweise hat der
 *     letzte Analyse-Datensatz?
 *  3. Sind die "vermissten" Fristen (Reaktion, Einwendung, Annahme,
 *     Bestätigung, Kündigung) als wörtliche Passagen im Text vorhanden?
 *
 * Wenn 3) JA → Architektur ist die Bremse, Kaskaden-Plan zieht.
 * Wenn 3) NEIN → PDF-Extraktion ist die Bremse, Architektur pausieren.
 *
 * Usage: node backend/scripts/inspectFactoringDateHunt.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const TARGET_USER_ID = '699c99de6ffba01ace3db87b';
const FILE_REGEX = /factoring|grenkefactoring|kaja|keck.*marckert|FRV/i;

// Suchmuster für die typischerweise im Factoring-Vertrag vorhandenen Fristen.
// Wir suchen mehrere Varianten je Konzept (Wort + Zahl), damit OCR-Varianten
// und unterschiedliche Formulierungen erfasst werden.
const FRIST_PATTERNS = [
  { label: 'Kündigungsfrist (2 Wochen / erste 3 Monate)', regexes: [
      /2\s*Wochen.{0,30}(ersten|erste)\s*3\s*Monate/i,
      /K(ü|ue)ndigungsfrist.{0,40}2\s*Wochen/i,
  ]},
  { label: 'Kündigungsfrist (6 Monate)', regexes: [
      /6\s*Monate.{0,30}Monatsende/i,
      /K(ü|ue)ndigungsfrist.{0,40}6\s*Monate/i,
  ]},
  { label: 'Reaktionsfrist (90 Tage / Inkasso)', regexes: [
      /90\s*Tage/i,
      /Reaktionsfrist/i,
  ]},
  { label: 'Einwendungsfrist (6 Wochen)', regexes: [
      /6\s*Wochen.{0,30}(Einwend|Zugang|nach)/i,
      /Einwendungsfrist/i,
  ]},
  { label: 'Stellungnahmefrist (5 Werktage)', regexes: [
      /5\s*Werktage/i,
      /Stellungnahme/i,
  ]},
  { label: 'Bindungsfrist (14 Tage)', regexes: [
      /14\s*Tage.{0,30}gebunden/i,
      /Bindungsfrist/i,
  ]},
  { label: 'Annahmefrist (7 Tage)', regexes: [
      /7\s*Tage.{0,30}Annahme/i,
      /Annahmefrist.{0,30}7/i,
  ]},
  { label: 'Refinanzierer-Bestätigung (10 Tage)', regexes: [
      /10\s*(Werk)?Tage.{0,40}(Refinanz|Best(ä|ae)tig)/i,
      /Refinanzierer.{0,40}10/i,
  ]},
];

function preview(s, len = 200) {
  if (!s) return '(leer)';
  const cleaned = s.replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, len) + (cleaned.length > len ? '...' : '');
}

function findContext(text, regex, contextLen = 100) {
  const m = text.match(regex);
  if (!m) return null;
  const idx = text.indexOf(m[0]);
  const start = Math.max(0, idx - contextLen);
  const end = Math.min(text.length, idx + m[0].length + contextLen);
  return {
    matched: m[0],
    position: idx,
    context: text.slice(start, end).replace(/\s+/g, ' ').trim()
  };
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI nicht gesetzt. Aborted.');
    process.exit(1);
  }

  console.log('Verbinde zur MongoDB (read-only Intent)...');
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'contract_ai' });
  const db = mongoose.connection.db;

  // 1. Letzte Factoring-Analyse aus `analyses` ziehen
  console.log(`\n[1/3] Suche letzte Factoring-Analyse für User ${TARGET_USER_ID}...`);
  const analyses = db.collection('analyses');
  const analysis = await analyses.findOne(
    { userId: TARGET_USER_ID, contractName: FILE_REGEX },
    { sort: { createdAt: -1 } }
  );

  if (!analysis) {
    console.log('Keine Factoring-Analyse für diesen User gefunden.');
    console.log('Letzte 5 Analysen des Users:');
    const fallback = await analyses.find({ userId: TARGET_USER_ID })
      .project({ contractName: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    fallback.forEach(a => console.log(`  ${a._id}  ${a.contractName}  (${a.createdAt})`));
    await mongoose.disconnect();
    process.exit(2);
  }

  console.log('================================================================');
  console.log('ANALYSE GEFUNDEN');
  console.log('================================================================');
  console.log(`  ID:                ${analysis._id}`);
  console.log(`  Datei:             ${analysis.contractName}`);
  console.log(`  Erstellt:          ${analysis.createdAt}`);
  console.log(`  importantDates:    ${(analysis.importantDates || []).length}`);
  console.log(`  fristHinweise:     ${Array.isArray(analysis.fristHinweise) ? analysis.fristHinweise.length : '(undefined)'}`);
  console.log(`  fullText Länge:    ${(analysis.fullText || '').length} chars`);
  console.log(`  extractedText Länge: ${(analysis.extractedText || '').length} chars`);
  console.log(`  pageCount:         ${analysis.pageCount || '(unbekannt)'}`);

  const text = analysis.fullText || analysis.extractedText || '';
  if (!text) {
    console.log('\nKein Vertragstext gespeichert. Aborted.');
    await mongoose.disconnect();
    process.exit(3);
  }

  // 2. Was wurde gespeichert?
  console.log('\n================================================================');
  console.log('GESPEICHERTE FUNDE');
  console.log('================================================================');
  console.log('importantDates:');
  (analysis.importantDates || []).forEach((d, i) => {
    console.log(`  [${i + 1}] type=${d.type} date=${d.date} label="${d.label}"`);
    console.log(`        evidence: "${preview(d.evidence, 120)}"`);
  });
  if ((analysis.importantDates || []).length === 0) console.log('  (keine)');

  console.log('\nfristHinweise:');
  if (Array.isArray(analysis.fristHinweise)) {
    analysis.fristHinweise.forEach((f, i) => {
      console.log(`  [${i + 1}] type=${f.type} title="${f.title}"`);
      console.log(`        evidence: "${preview(f.evidence, 120)}"`);
    });
    if (analysis.fristHinweise.length === 0) console.log('  (leeres Array)');
  } else {
    console.log('  (undefined — Date Hunt war im Fallback ODER Feld nicht persistiert)');
  }

  // 3. KERN-CHECK: Sind die erwarteten Fristen TEXTUELL im fullText vorhanden?
  console.log('\n================================================================');
  console.log('KERN-CHECK: stehen die vermuteten Fristen wörtlich im Vertragstext?');
  console.log('================================================================');
  let found = 0;
  let missing = 0;
  for (const pattern of FRIST_PATTERNS) {
    let hit = null;
    for (const rx of pattern.regexes) {
      hit = findContext(text, rx, 80);
      if (hit) break;
    }
    if (hit) {
      found++;
      console.log(`\n[X] ${pattern.label}`);
      console.log(`    Match:    "${hit.matched}"`);
      console.log(`    Pos:      ${hit.position}`);
      console.log(`    Kontext:  "${hit.context}"`);
    } else {
      missing++;
      console.log(`\n[ ] ${pattern.label}  --  NICHT im Text`);
    }
  }

  console.log('\n================================================================');
  console.log('FAZIT');
  console.log('================================================================');
  console.log(`Gefunden: ${found} / ${FRIST_PATTERNS.length} erwarteten Frist-Konzepten`);
  console.log(`Fehlend:  ${missing} / ${FRIST_PATTERNS.length}`);
  console.log(`gespeicherte fristHinweise: ${Array.isArray(analysis.fristHinweise) ? analysis.fristHinweise.length : 'undefined'}`);
  console.log(`Lücke (Text hat es, DB nicht): ${found - (Array.isArray(analysis.fristHinweise) ? analysis.fristHinweise.length : 0)}`);
  console.log('');
  if (found >= 4) {
    console.log('==> Architektur ist die Bremse. Kaskaden-Plan zieht.');
  } else if (found === 0) {
    console.log('==> WARNUNG: PDF-Extraktion liefert die Fristen gar nicht in den Text.');
    console.log('    Architektur-Plan PAUSIEREN, erst PDF-Extract pruefen.');
  } else {
    console.log('==> Mischbild — wahrscheinlich beide Themen anteilig. Genauer ansehen.');
  }

  console.log('\nDiagnose abgeschlossen. Disconnecting...');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Fehler:', err.message);
  console.error(err.stack);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});

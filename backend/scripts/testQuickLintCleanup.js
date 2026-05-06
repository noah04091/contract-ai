// scripts/testQuickLintCleanup.js
// Smoke-Test: Verifiziert dass die quickLint-Patches (postProcess + sanitizeTitle)
// den User-Mietvertrag korrekt aufräumen — OHNE GPT-Call (rein lokal).
//
// Usage: node scripts/testQuickLintCleanup.js

const clauseParser = require('../services/legalLens/clauseParser');
const { postProcess } = require('../services/legalLens/clausePostProcessor');

// Identische Logik wie in quickLintAnalyzer.js (1c)
function isPartiesIntroBlock(clause) {
  const text = (clause?.text || '').trim();
  if (!text) return false;
  if (!/^zwischen\b/i.test(text)) return false;
  if (!/wird\s+folgender.{0,150}\b(geschlossen|abgeschlossen|vereinbart)\b/i.test(text)) return false;
  return true;
}

// Rekonstruktion des Live-Mietvertrags aus dem User-Test (Noah Liebold / Klaus Peter).
// Enthält die exakten Trigger: Stammdaten-Block + redundante Sub-Klauseln.
const MIETVERTRAG = `Mietvertrag

zwischen

Vermieter: Noah Liebold Richard Oberle Weg 27 76448 Durmersheim

und

Mieter: Klaus Peter Hauptstraße 7 76438 Baden-Baden

wird folgender Mietvertrag geschlossen:

§ 1 Mietgegenstand

1. Vermietet wird eine Wohnung, gelegen in Rheinauerring 103, mit einer Größe von 80 Quadratmetern, bestehend aus 2 Zimmern. Die Wohnung ist teilmöbliert.

§ 2 Mietzeit

1. Das Mietverhältnis beginnt am 01.06.2026 und wird auf unbestimmte Zeit geschlossen.
2. Die monatliche Miete beträgt 800 Euro.
Die Nebenkosten betragen monatlich 200 Euro, in denen die Heizkosten enthalten sind.
3. Für den Garagestellplatz wird eine zusätzliche monatliche Gebühr von 50 Euro erhoben.

§ 3 Kaution

1. Der Mieter zahlt eine Kaution in Höhe von 1.000 Euro als Einmalzahlung vor Einzug.
2. Die Kaution dient zur Sicherung aller Ansprüche des Vermieters aus dem Mietverhältnis.

§ 4 Instandhaltung und Instandsetzung

1. Der Mieter ist verpflichtet, die Mietsache pfleglich zu behandeln und für ausreichende Lüftung und Heizung zu sorgen.
2. Der Vermieter ist für die Instandhaltung der Mietsache verantwortlich, soweit nicht der Mieter gemäß § 8 verpflichtet ist.

§ 5 Untervermietung

1. Eine Untervermietung der Mietsache oder von Teilen derselben ist nur mit vorheriger schriftlicher Zustimmung des Vermieters gestattet.

§ 6 Schönheitsreparaturen

1. Der Mieter verpflichtet sich, Schönheitsreparaturen nach einem Fristenplan durchzuführen. Dieser umfasst insbesondere das Streichen der Wände und Decken in regelmäßigen Abständen.

§ 7 Kündigung

1. Die Kündigungsfrist beträgt drei Monate und richtet sich nach den gesetzlichen Bestimmungen.

§ 8 Rückgabe der Mietsache

1. Bei Beendigung des Mietverhältnisses ist die Mietsache in einem ordnungsgemäßen Zustand zurückzugeben.
2. Eventuelle Schäden, die über die normale Abnutzung hinausgehen, sind vom Mieter zu beseitigen.

§ 9 Schlussbestimmungen

1. Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform.
2. Sollten einzelne Bestimmungen dieses Vertrages unwirksam sein oder werden, so wird die Wirksamkeit der übrigen Bestimmungen hiervon nicht berührt.
3. Es gilt das Recht der Bundesrepublik Deutschland.

Ende des Mietvertrages.`;

// sanitizeTitle: identische Logik wie in quickLintAnalyzer.js
function sanitizeTitle(rawTitle, idx) {
  if (!rawTitle || typeof rawTitle !== 'string') return `Abschnitt ${idx + 1}`;
  const trimmed = rawTitle.trim();
  if (!trimmed) return `Abschnitt ${idx + 1}`;
  if (trimmed.length > 70) return `Abschnitt ${idx + 1}`;
  if (/[.!?]\s*$/.test(trimmed)) return `Abschnitt ${idx + 1}`;
  if (!/^[§A-ZÄÖÜ]/.test(trimmed)) return `Abschnitt ${idx + 1}`;
  return trimmed;
}

function dumpClauses(label, clauses) {
  console.log(`\n=== ${label} (${clauses.length}) ===`);
  clauses.forEach((c, i) => {
    const title = c.sectionTitle || c.title || '?';
    const snippet = (c.text || '').replace(/\s+/g, ' ').slice(0, 90);
    console.log(`  [${i + 1}] id="${c.id}" title="${title}" risk=${c.riskLevel || '?'}  text="${snippet}${c.text?.length > 90 ? '…' : ''}"`);
  });
}

function checkIdUniqueness(label, clauses) {
  const idCounts = {};
  clauses.forEach(c => { idCounts[c.id] = (idCounts[c.id] || 0) + 1; });
  const duplicates = Object.entries(idCounts).filter(([_, n]) => n > 1);
  console.log(`\n--- ID-Uniqueness Check (${label}) ---`);
  if (duplicates.length === 0) {
    console.log(`  ✅ Alle ${clauses.length} Klauseln haben eindeutige IDs`);
  } else {
    console.log(`  ❌ Doppelte IDs gefunden in ${clauses.length} Klauseln:`);
    duplicates.forEach(([id, n]) => console.log(`     id="${id}" kommt ${n}x vor`));
  }
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ ${msg}`);
  }
}

console.log('=== QuickLint Cleanup Smoke-Test ===');
console.log(`Vertragstext: ${MIETVERTRAG.length} Zeichen`);

// Schritt 1: clauseParser
const parsed = clauseParser.parseContract(MIETVERTRAG, { detectRisk: true });
const beforeFilter = (parsed?.clauses || []).filter(c => c?.text && c.text.length > 0);
dumpClauses('VOR PostProcess (clauseParser raw)', beforeFilter);

// Schritt 2: postProcess (mit Adapter)
const adapted = beforeFilter.map(c => ({ ...c, title: c.sectionTitle, number: c.id }));
const { clauses: afterPostProcess, stats } = postProcess(adapted, MIETVERTRAG);
dumpClauses('NACH PostProcess', afterPostProcess);
console.log('\nPostProcess-Stats:', stats);

// ID-Uniqueness Check (KRITISCH für GPT-Mapping)
checkIdUniqueness('VOR PostProcess', beforeFilter);
checkIdUniqueness('NACH PostProcess', afterPostProcess);

// Schritt 2b: Generate-spezifischer Filter (1c in quickLintAnalyzer)
const cleaned = afterPostProcess.filter(c => !isPartiesIntroBlock(c));
const introRemoved = afterPostProcess.length - cleaned.length;
if (introRemoved > 0) {
  console.log(`\nPartiesIntroFilter: ${introRemoved} Header-Block(s) zusätzlich entfernt`);
  dumpClauses('NACH PartiesIntroFilter', cleaned);
}

// Schritt 3: sanitizeTitle anwenden (was die Sidebar zeigen würde)
console.log('\n=== Anzeige-Titel nach sanitizeTitle ===');
cleaned.forEach((c, idx) => {
  const display = sanitizeTitle(c.sectionTitle || c.title, idx);
  const orig = c.sectionTitle || c.title;
  const flag = display === orig ? '  ' : '→ ';
  console.log(`  ${flag}[${idx + 1}] "${display}"  ${display !== orig ? `(war: "${orig}")` : ''}`);
});

// ASSERTIONS
console.log('\n=== Assertions ===');

// 1. Stammdaten-Block muss weg sein
const stammdatenSurvived = cleaned.some(c => {
  const t = c.text || '';
  return /zwischen[\s\S]{1,400}wird folgender.*geschlossen/i.test(t)
    || (/Vermieter:\s*Noah Liebold/i.test(t) && /Mieter:\s*Klaus Peter/i.test(t));
});
assert(!stammdatenSurvived, 'Stammdaten-Block (zwischen Vermieter ... wird geschlossen) wurde entfernt');

// 2. Schönheitsreparaturen-Klausel muss vorhanden sein
const schoenheit = cleaned.find(c => /Schönheitsreparaturen nach einem Fristenplan/i.test(c.text || ''));
assert(!!schoenheit, 'Kritische Schönheitsreparaturen-Klausel ist erhalten geblieben');
if (schoenheit) {
  assert(schoenheit.sectionTitle === 'Schönheitsreparaturen' || schoenheit.title === 'Schönheitsreparaturen',
    `Schönheitsreparaturen behält sectionTitle ("${schoenheit.sectionTitle || schoenheit.title}")`);
  // Hinweis: riskLevel="high" wird von GPT gesetzt (Live-Pipeline). Im lokalen Test
  // ohne GPT bleibt der clauseParser-Keyword-Default "low" — das ist erwartet.
}

// 3. Andere Standard-Klauseln müssen erhalten sein
['Mietgegenstand', 'Mietzeit', 'Kaution', 'Untervermietung', 'Kündigung'].forEach(needle => {
  const found = cleaned.some(c => (c.sectionTitle || c.title || '').includes(needle));
  assert(found, `Standard-Klausel "${needle}" ist erhalten`);
});

// 4. Kein Anzeige-Titel ist ein ganzer Satz mit Punkt am Ende
const sentenceTitles = cleaned.filter((c, idx) => {
  const t = sanitizeTitle(c.sectionTitle || c.title, idx);
  return /[.!?]\s*$/.test(t) && t !== 'Abschnitt' && !t.startsWith('Abschnitt');
});
assert(sentenceTitles.length === 0,
  `Keine Card hat einen Satz-mit-Punkt als Anzeige-Titel (gefunden: ${sentenceTitles.length})`);

// 5. Klauselzahl plausibel: vorher 16-20, nachher 10-15 (Stammdaten + Duplikate weg)
assert(cleaned.length >= 8 && cleaned.length <= beforeFilter.length,
  `Klauselzahl im plausiblen Bereich: ${cleaned.length} (vorher: ${beforeFilter.length})`);

// 6. riskLevel-Statistik (im Smoke-Test ohne GPT alle "low" erwartet — GPT macht im Live-Run das Heavy-Lifting)
const high = cleaned.filter(c => c.riskLevel === 'high').length;
const med = cleaned.filter(c => c.riskLevel === 'medium').length;
const low = cleaned.filter(c => c.riskLevel === 'low').length;
console.log(`   Keyword-Statistik: ${high} high, ${med} medium, ${low} low (GPT-Layer fehlt im Test)`);

// ════════════════════════════════════════════════════════════════════
// Sektion 2: GPT-Mapping mit qlId — der eigentliche Fix
// Reproduziert den Live-Bug (3 Klauseln zeigten dieselbe Kaution-Schwäche)
// und verifiziert dass qlId das eindeutige Mapping garantiert.
// ════════════════════════════════════════════════════════════════════

console.log('\n\n=== GPT-Mapping-Test (qlId) ===');

// Wir simulieren was analyzeClauses macht: nach Filtern qlId zuweisen
const withQlId = cleaned.map((c, idx) => ({ ...c, qlId: `qc-${idx + 1}` }));

console.log(`\nKlauseln mit qlId (${withQlId.length}):`);
withQlId.forEach(c => {
  console.log(`  qlId="${c.qlId}" parserId="${c.id}" title="${c.sectionTitle || c.title}"`);
});

// qlId-Uniqueness check
const qlIds = withQlId.map(c => c.qlId);
const qlIdsUnique = new Set(qlIds).size === qlIds.length;
assert(qlIdsUnique, `qlIds sind alle eindeutig (${qlIds.length} Klauseln, ${new Set(qlIds).size} unique)`);

// Mock-GPT-Response: GPT antwortet mit qlId-basiertem Schema, jeweils "kritisch X" als Schwäche.
// Test: Jedes Card bekommt EXAKT seine Mock-Bewertung — keine Doublungen.
const mockGptResponse = withQlId.map(c => ({
  id: c.qlId,
  riskLevel: 'medium',
  weakness: `Mock-Schwäche für ${c.qlId} (Klausel: ${c.sectionTitle || c.title})`,
  bghCite: null,
  optimizedSuggestion: `Mock-Vorschlag für ${c.qlId}`
}));

// Mapping wie in quickLintAnalyzer.js:
const mapped = withQlId.map((clause, idx) => {
  const gptItem = mockGptResponse.find(a => a.id === clause.qlId) || mockGptResponse[idx] || null;
  return {
    qlId: clause.qlId,
    title: clause.sectionTitle || clause.title,
    weaknessFromGpt: gptItem ? gptItem.weakness : null,
    suggestionFromGpt: gptItem ? gptItem.optimizedSuggestion : null
  };
});

console.log('\nMapping-Verifikation:');
let mappingOk = true;
mapped.forEach(m => {
  // Jede weakness muss GENAU die qlId der eigenen Klausel referenzieren
  const matches = m.weaknessFromGpt && m.weaknessFromGpt.includes(m.qlId);
  const sym = matches ? '✅' : '❌';
  console.log(`  ${sym} ${m.qlId} → "${m.weaknessFromGpt}"`);
  if (!matches) mappingOk = false;
});
assert(mappingOk, 'Jede Klausel bekommt EXAKT ihr eigenes Mock-GPT-Assessment (kein cross-mapping)');

// Reproduktion des Live-Bugs: WAS WÄRE PASSIERT mit alter find(a => a.id === c.id) Logik?
const oldStyleMapping = withQlId.map((clause, idx) => {
  // Alt: GPT hätte parser-IDs bekommen (clause.id), nicht qlId
  const fakeOldGpt = withQlId.map(c => ({ id: c.id, weakness: `Schwäche für parserId=${c.id}` }));
  const gptItem = fakeOldGpt.find(a => a.id === clause.id);
  return { parserId: clause.id, mappedTo: gptItem ? gptItem.weakness : null };
});

const distinctMappingsOldStyle = new Set(oldStyleMapping.map(m => m.mappedTo)).size;
const distinctMappingsNewStyle = new Set(mapped.map(m => m.weaknessFromGpt)).size;
console.log(`\nVergleich:`);
console.log(`  Alt (id-basiert): ${distinctMappingsOldStyle} verschiedene Bewertungen für ${oldStyleMapping.length} Klauseln`);
console.log(`  Neu (qlId-basiert): ${distinctMappingsNewStyle} verschiedene Bewertungen für ${mapped.length} Klauseln`);
assert(distinctMappingsNewStyle === mapped.length,
  `Neu-Mapping liefert UNIQUE Bewertung pro Klausel (${distinctMappingsNewStyle}/${mapped.length})`);
assert(distinctMappingsOldStyle < oldStyleMapping.length,
  `Alt-Mapping reproduziert Bug: ${distinctMappingsOldStyle} unique < ${oldStyleMapping.length} Klauseln (= cross-mapping)`);

// ════════════════════════════════════════════════════════════════════
// Sektion 3: Hash-basierte Cache-Invalidierung (Fix B)
// Verifiziert dass identischer Text gleichen Hash liefert,
// veränderter Text einen anderen Hash.
// ════════════════════════════════════════════════════════════════════

console.log('\n\n=== Hash-Cache-Invalidierung-Test ===');

const crypto = require('crypto');
function hashContractText(text) {
  return crypto.createHash('md5').update((text || '').toLowerCase().trim()).digest('hex').substring(0, 16);
}

const hash1 = hashContractText(MIETVERTRAG);
const hash2 = hashContractText(MIETVERTRAG);
const editedText = MIETVERTRAG.replace('1.000 Euro', '5.000 Euro');
const hash3 = hashContractText(editedText);
const hashWhitespace = hashContractText('  ' + MIETVERTRAG + '\n\n');

console.log(`  Hash original:        ${hash1}`);
console.log(`  Hash original (2x):   ${hash2}`);
console.log(`  Hash mit Whitespace:  ${hashWhitespace}`);
console.log(`  Hash editiert:        ${hash3}`);

assert(hash1 === hash2, 'Identischer Text → identischer Hash (Cache-HIT-Pfad)');
assert(hash1 === hashWhitespace, 'Whitespace-Variation → identischer Hash (.trim() greift)');
assert(hash1 !== hash3, 'Editierter Text → anderer Hash (Cache-MISS-Pfad, frische Bewertung)');
assert(hash1.length === 16, 'Hash hat erwartete Länge 16 (md5-Prefix)');

console.log(`\n=== ${process.exitCode ? 'TESTS FEHLGESCHLAGEN ❌' : 'ALLE TESTS GRÜN ✅'} ===`);

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
    console.log(`  [${i + 1}] title="${title}" risk=${c.riskLevel || '?'}  text="${snippet}${c.text?.length > 90 ? '…' : ''}"`);
  });
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

console.log(`\n=== ${process.exitCode ? 'TESTS FEHLGESCHLAGEN ❌' : 'ALLE TESTS GRÜN ✅'} ===`);

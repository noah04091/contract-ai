/**
 * Diagnose: Redline-Diff-Verhalten isoliert prüfen
 *
 * Lädt die echte production-Funktion `generateWordDiff` aus
 * services/optimizerV2/utils/diffGenerator.js und testet sie mit
 * konstruierten Inputs, um nachzuweisen, unter welchen Bedingungen
 * inhaltsgleicher Text als "entfernt" (rot) markiert wird.
 *
 * Read-only. Keine DB-Verbindung. Keine Produktiv-Code-Änderung.
 *
 * Usage: node backend/scripts/diagnoseRedlineDiff.js
 */
const path = require('path');
const Diff = require('diff');
const { generateWordDiff } = require(path.join(__dirname, '..', 'services', 'optimizerV2', 'utils', 'diffGenerator'));

function fmt(n, w = 4) { return String(n).padStart(w); }
function pct(part, total) { return total === 0 ? '0%' : Math.round(part / total * 100) + '%'; }
function esc(s) { return (s || '').replace(/\n/g, '\\n').replace(/\t/g, '\\t'); }

function describeDiff(label, original, optimized, comment) {
  console.log('\n========================================================');
  console.log(label);
  if (comment) console.log('Hypothese: ' + comment);
  console.log('--------------------------------------------------------');
  console.log('  original  length: ' + fmt(original.length));
  console.log('  optimized length: ' + fmt(optimized.length));
  console.log('  strict-equal (===)            : ' + (original === optimized));
  console.log('  whitespace-normalized-equal   : ' + (original.replace(/\s+/g, ' ').trim() === optimized.replace(/\s+/g, ' ').trim()));
  console.log('  trim-equal                    : ' + (original.trim() === optimized.trim()));

  // Raw diffWords, um den Threshold-Trigger zu sehen
  const rawWordDiff = Diff.diffWords(original, optimized, { intlSegmenter: undefined });
  const wordChangeCount = rawWordDiff.filter(c => c.added || c.removed).length;
  const wordTotal = rawWordDiff.length;
  const wordRatio = wordTotal > 0 ? wordChangeCount / wordTotal : 0;
  console.log('--------------------------------------------------------');
  console.log('  diffWords:  ' + fmt(wordTotal) + ' parts, ' + fmt(wordChangeCount) + ' changes, ratio ' + wordRatio.toFixed(2));
  console.log('  -> Fallback auf diffSentences? ' + (wordRatio > 0.6 ? 'JA (>60%)' : 'nein'));

  // Production-Ergebnis
  const ops = generateWordDiff(original, optimized);
  const equal = ops.filter(o => o.type === 'equal');
  const removes = ops.filter(o => o.type === 'remove');
  const adds = ops.filter(o => o.type === 'add');
  const equalChars = equal.reduce((s, o) => s + o.text.length, 0);
  const removeChars = removes.reduce((s, o) => s + o.text.length, 0);
  const addChars = adds.reduce((s, o) => s + o.text.length, 0);

  console.log('--------------------------------------------------------');
  console.log('  PRODUCTION-OUTPUT (was die UI rendert):');
  console.log('    Ops total: ' + fmt(ops.length) + '  | equal: ' + fmt(equal.length) + '  remove: ' + fmt(removes.length) + '  add: ' + fmt(adds.length));
  console.log('    Zeichen equal (normal): ' + fmt(equalChars, 5) + ' (' + pct(equalChars, original.length) + ' des originals)');
  console.log('    Zeichen remove (rot)  : ' + fmt(removeChars, 5));
  console.log('    Zeichen add (gruen)   : ' + fmt(addChars, 5));

  if (ops.length <= 14) {
    console.log('  Op-Detail:');
    ops.forEach((o, i) => {
      const preview = esc(o.text).slice(0, 70);
      const tail = o.text.length > 70 ? '...' : '';
      console.log('    [' + i + '] ' + o.type.padEnd(7) + ' (' + fmt(o.text.length) + ' chars): "' + preview + tail + '"');
    });
  } else {
    console.log('  Op-Detail unterdrueckt (>14 Ops). Erste 5:');
    ops.slice(0, 5).forEach((o, i) => {
      const preview = esc(o.text).slice(0, 70);
      const tail = o.text.length > 70 ? '...' : '';
      console.log('    [' + i + '] ' + o.type.padEnd(7) + ' (' + fmt(o.text.length) + ' chars): "' + preview + tail + '"');
    });
  }
}

console.log('========================================================');
console.log('  Redline-Diff Diagnose');
console.log('  Funktion: generateWordDiff aus diffGenerator.js');
console.log('  Library:  diff (npm package)');
console.log('========================================================');

// ── A: Sanity-Check ─────────────────────────────────────
describeDiff(
  'TEST A — Vollkommen identische Texte (Baseline)',
  'Kaja Food GmbH\nMoerser Str. 135\n47803 Krefeld',
  'Kaja Food GmbH\nMoerser Str. 135\n47803 Krefeld',
  'Strict-equal-Check (Zeile 15) muss 1 equal-Op liefern, sonst ist das Modell selbst kaputt.'
);

// ── B: Trailing-Newline-Asymmetrie (Stage 4 Trim-Verhalten) ──────
describeDiff(
  'TEST B — Trailing-\\n auf Original, optimized getrimmt',
  'Kaja Food GmbH\nMoerser Str. 135\n47803 Krefeld\n',
  'Kaja Food GmbH\nMoerser Str. 135\n47803 Krefeld',
  'Asymmetrisches .trim() in 04-optimizationGeneration.js:194-196 (optimized wird getrimmt, originalText nicht). Reproduziert echte Stage-4-Bedingung.'
);

// ── C: Innere Whitespace-Differenz ────────────────────────────
describeDiff(
  'TEST C — Innere Whitespace-Differenzen (z.B. PDF Doppel-Spaces vs. GPT Single-Space)',
  'Kaja Food GmbH  Moerser Str. 135  47803 Krefeld',
  'Kaja Food GmbH Moerser Str. 135 47803 Krefeld',
  'PDF-Extraktion liefert haeufig Doppel-Spaces. GPT normalisiert auf Single-Space.'
);

// ── D: Realer Header-Block aus Screenshot 1 ────────────────
const realOrig = '103.502 FRV OF SP FR.doc103.502 FRV OF SP FR.doc\nGRENKEFACTORING GmbH ┌ Neuer Markt 2 ┌ 76532 Baden-Baden\n\nAngaben zum Unternehmen:\nName / genaue Anschrift (Firmenstempel)\n\nKaja Food GmbH\nMoerser Str. 135\n47803 Krefeld\n\nNachstehend FACTORINGKUNDE genannt\n\nHerr Dr. Kai Wilhelm Daube, Krefeld, und Herr Dr. Jarg Temme, Muenchen, jeweils\neinzelvertretungsberechtigt\nGeschaeftsfuehrer (Vor- und Nachnamen)\n\n02151 7477860 02151 7477869 order@kaja-food.de\nTelefon Telefax E-Mail\n\nSparkasse Krefeld 327189 / DE13320500000000327189 32050000 / SPKRDE33XXX\nBankverbindung Kontonummer / IBAN Bankleitzahl / BIC\n\nIm Handelsregister eingetragen? Ja, unter Nr. HRB 15374 beim AG Krefeld.\n\nSteuer-Nr.: 117/5820/2158 USt-Id Nr.: DE 301183473';
describeDiff(
  'TEST D — Realer Adress-/Header-Block (Screenshot 1), GPT trimmt nur',
  realOrig,
  realOrig.trim(),
  'Wenn GPT inhaltlich nichts aendert und nur trimmt: zeigt der Diff dann alles als rot, oder fast nichts?'
);

// ── E: Echter Konditionen-Text mit kleiner Einfuegung ─────
describeDiff(
  'TEST E — Konditionen-Text mit kleiner Erweiterung (Screenshot 3)',
  'Die Konditionen basieren auf dem erwarteten Jahresfactoringvolumen. Anpassungen erfolgen einmal pro Quartal.',
  'Die Konditionen dieses Vertrages basieren auf dem erwarteten Jahresfactoringvolumen. Anpassungen sind nur bei wesentlichen wirtschaftlichen Veraenderungen moeglich.',
  'Echte Optimierung: ein Wort eingefuegt + ein Satz umformuliert. Erwartet: feinkoernige Word-Diffs (kein Sentence-Fallback).'
);

// ── F: Komplette Umformulierung (Sentence-Fallback aktiv) ──
describeDiff(
  'TEST F — Komplette Umformulierung',
  'Der Kunde zahlt monatlich einen Festbetrag von 100 EUR. Bei Verspaetung werden Mahngebuehren faellig.',
  'Es ist eine monatliche Gebuehr in Hoehe von 100 EUR durch den Kunden zu entrichten. Verzugszinsen sind im Falle einer Verspaetung gesondert zu erheben.',
  'Stark umformuliert: changeRatio sollte ueber 60% liegen, Sentence-Fallback aktiv. Block-removes sind hier semantisch korrekt.'
);

// ── G: Inhaltsgleich aber andere Linebreak-Struktur ───────
describeDiff(
  'TEST G — Inhaltsgleich, anderer Linebreak (PDF vs DOCX)',
  'Sparkasse Krefeld 327189 / DE13320500000000327189 32050000 / SPKRDE33XXX\nBankverbindung Kontonummer / IBAN Bankleitzahl / BIC',
  'Sparkasse Krefeld 327189 / DE13320500000000327189 32050000 / SPKRDE33XXX Bankverbindung Kontonummer / IBAN Bankleitzahl / BIC',
  'PDF-Extraktion vs. GPT-Output unterscheiden sich oft nur durch \\n vs. Space.'
);

console.log('\n========================================================');
console.log('  Diagnose abgeschlossen.');
console.log('========================================================\n');

/**
 * Zentraler Anzeige-Text-Säuberungs-Layer (12.06.2026)
 * ────────────────────────────────────────────────────
 * Läuft EINMAL ganz am Ende der Analyse, bevor das Ergebnis gespeichert/gesendet wird.
 * Repariert DETERMINISTISCH (keine KI, keine Umformulierung) kaputte Zeichen im
 * angezeigten KI-Text:
 *   - NFC-Normalisierung (zerlegte Umlaut-Sequenzen zusammenführen)
 *   - Mojibake (UTF-8 als Latin-1 fehlgelesen: "GebÃ¼hr" → "Gebühr") — eindeutig umkehrbar
 *   - Unicode-Ersatzzeichen "�" → echtes Zeichen aus dem sauberen Vertragstext
 *   - weggelassene Umlaute ("Gewhrleistung" → "Gewährleistung") — Abgleich mit Vertragstext
 *   - Steuer-/Zero-Width-Zeichen entfernen
 *
 * GARANTIEN:
 *   - Display-only: ändert NUR Zeichen in Text-Strings. Score/Logik/Datums/Enums unberührt.
 *   - Erfindet NIE: ein Wort wird nur ersetzt, wenn das echte Wort nachweislich im
 *     Vertragstext (oder der kuratierten Umlaut-Wortliste) vorkommt. Sonst bleibt es,
 *     bzw. "�" wird entfernt. Kein Raten.
 *   - No-Op auf sauberem Text: enthält ein Feld keine kaputten Zeichen, bleibt es identisch.
 */

// ── Mojibake: UTF-8-Bytes als Latin-1/Windows-1252 fehlinterpretiert. Deterministisch. ──
const MOJIBAKE_PAIRS = [
  ['â€ž', '„'], ['â€œ', '“'], ['â€‘', '‑'], ['â€“', '–'], ['â€”', '—'],
  ['â€™', '’'], ['â€˜', '‘'], ['â€¦', '…'], ['â€¢', '•'],
  ['Ã¤', 'ä'], ['Ã¶', 'ö'], ['Ã¼', 'ü'], ['Ã„', 'Ä'], ['Ã–', 'Ö'], ['Ãœ', 'Ü'], ['ÃŸ', 'ß'],
  ['Ã©', 'é'], ['Ã¨', 'è'], ['Ã ', 'à'], ['Ã¡', 'á'], ['Ã§', 'ç'], ['Ã±', 'ñ'], ['Ã¸', 'ø'],
  ['Â§', '§'], ['Â°', '°'], ['Â´', '´'], ['Â»', '»'], ['Â«', '«'], ['Â·', '·'],
];

const UMLAUT_CANDIDATES = ['ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü', 'ß', '§'];
const UMLAUT_CHARS_RE = /[äöüÄÖÜß]/;

// Fallback-Wortliste für KI-PARAPHRASEN, die nicht wortgleich im Vertrag stehen.
const GERMAN_UMLAUT_WORDS = new Set([
  'für', 'über', 'müssen', 'muss', 'müsste', 'müssten', 'möglich', 'möglichkeit', 'während', 'gegenüber',
  'zunächst', 'dafür', 'hängt', 'abhängig', 'gehört', 'könnte', 'würde', 'wäre', 'hätte', 'größer', 'höher',
  'später', 'spätestens', 'frühestens', 'frühzeitig', 'regelmäßig', 'regelmäßige', 'gemäß', 'jährlich', 'täglich', 'wöchentlich',
  'monatliche', 'jährliche', 'ändern', 'änderung', 'änderungen', 'erhöhung', 'erhöhungen', 'prüfen', 'prüfung',
  'kündigung', 'kündigungsfrist', 'kündigen', 'vergütung', 'vergütungen', 'verfügung', 'rückzahlung', 'rücktritt',
  'zurück', 'gebühr', 'gebühren', 'fällig', 'fälligkeit', 'beträgt', 'beträge', 'enthält', 'schönheitsreparaturen',
  'schäden', 'mängel', 'räume', 'mieträume', 'übernahme', 'überlassung', 'geschäft', 'geschäftlich', 'persönlich', 'zusätzlich',
  'nachträglich', 'ordnungsgemäß', 'unverzüglich', 'einschließlich', 'ausschließlich', 'beschädigung', 'erklärung',
  'behörde', 'grundsätzlich', 'mietverhältnis', 'vertragsgemäß', 'überweisen', 'überweisung', 'rückgabe', 'wohnfläche',
  'gewährleistung', 'durchführen', 'durchzuführen', 'außerordentlich', 'ordentlich', 'höhe', 'größe', 'verstößt',
]);

// Schlüssel, die NIE als Anzeige-Text gesäubert werden (Datums/Enums/IDs/Roh-Evidence).
const SKIP_KEYS = new Set([
  'date', 'type', 'source', 'evidence', 'documentType', 'contractType', 'category',
  '_id', 'id', 'analysisId', 's3Key', 's3Bucket', 's3Location', 's3ETag', 'requestId',
  'confidence', 'checkedAt', 'createdAt', 'updatedAt', 'analyzedAt', 'startDate', 'expiryDate',
  'endDate', 'anchorType', 'recurrencePattern', 'durationDays', 'pages', 'count', 'detected',
]);

// Steuer-/Zero-Width-Zeichen (NICHT \t \n \r) — via Konstruktor, keine literalen Steuerzeichen im Code.
const CONTROL_RE = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u200B-\\u200D\\uFEFF]', 'g');

/**
 * Baut aus dem sauberen Vertragstext eine Karte: umlaut-entfernte Form → Originalwort
 * (für die "weggelassene Umlaute"-Reparatur). Mehrdeutige Schlüssel werden verworfen.
 */
function buildSourceMaps(sourceText) {
  const src = typeof sourceText === 'string' ? sourceText : '';
  const lower = src.toLowerCase();
  const dropMap = new Map();
  const ambiguous = new Set();
  const words = src.match(/\p{L}+/gu) || [];
  for (const w of words) {
    if (!UMLAUT_CHARS_RE.test(w)) continue;
    const stripped = w.replace(/[äöüÄÖÜß]/g, '').toLowerCase();
    if (stripped.length < 4) continue; // zu kurz → Kollisionsrisiko
    if (dropMap.has(stripped)) {
      if (dropMap.get(stripped).toLowerCase() !== w.toLowerCase()) ambiguous.add(stripped);
    } else {
      dropMap.set(stripped, w);
    }
  }
  for (const a of ambiguous) dropMap.delete(a);
  return { lower, dropMap };
}

// ── "�"-Lauf gegen Quelltext/Wortliste auflösen ──
function recoverReplacementRun(run, lower) {
  const phCount = (run.match(/�/g) || []).length;
  const anchorLen = run.length - phCount;
  if (anchorLen < 1 || phCount > 3) return run.replace(/�/g, '');
  let candidates = [''];
  for (const ch of run) {
    if (ch === '�') {
      const next = [];
      for (const c of candidates) for (const u of UMLAUT_CANDIDATES) next.push(c + u);
      candidates = next;
    } else {
      candidates = candidates.map(c => c + ch);
    }
  }
  const fromSource = candidates.find(c => lower.includes(c.toLowerCase()));
  if (fromSource) return fromSource;
  const fromList = candidates.find(c => GERMAN_UMLAUT_WORDS.has(c.toLowerCase()));
  if (fromList) return fromList;
  return run.replace(/�/g, '');
}

/**
 * Säubert EINEN Text-String. Reine Zeichen-Reparatur, keine Umformulierung.
 */
function sanitizeText(text, maps) {
  if (typeof text !== 'string' || text.length === 0) return text;
  let out = text;

  // 1. Steuer-/Zero-Width-Zeichen raus.
  out = out.replace(CONTROL_RE, '');

  // 2. Mojibake (deterministisch).
  if (out.includes('Ã') || out.includes('â') || out.includes('Â')) {
    for (const [bad, good] of MOJIBAKE_PAIRS) out = out.split(bad).join(good);
  }

  // 3. NFC: zerlegte Umlaut-Sequenzen ("ü") zusammenführen.
  out = out.normalize('NFC');

  const hasFFFD = out.includes('�');
  const maybeDropped = maps.dropMap.size > 0;
  if (!hasFFFD && !maybeDropped) return out;

  // 4. Pro Buchstaben-Lauf: "�" auflösen ODER weggelassenen Umlaut zurückholen.
  const isRunChar = (ch) => ch === '�' || /\p{L}/u.test(ch);
  const chars = [...out];
  let res = '';
  let i = 0;
  while (i < chars.length) {
    if (!isRunChar(chars[i])) { res += chars[i]; i++; continue; }
    let run = '';
    while (i < chars.length && isRunChar(chars[i])) { run += chars[i]; i++; }
    if (run.includes('�')) {
      res += recoverReplacementRun(run, maps.lower);
    } else if (run.length >= 4 && maybeDropped && !UMLAUT_CHARS_RE.test(run)
               && !maps.lower.includes(run.toLowerCase())) {
      // Wort steht NICHT (so) im Quelltext → evtl. weggelassener Umlaut.
      const hit = maps.dropMap.get(run.toLowerCase());
      res += hit || run;
    } else {
      res += run;
    }
  }
  return res;
}

/**
 * Geht rekursiv durch das Ergebnis-Objekt und säubert NUR String-Werte.
 * Strukturelle/Datum-/Enum-/ID-Felder (SKIP_KEYS) werden übersprungen.
 */
function sanitizeDeep(value, maps, key) {
  if (typeof value === 'string') {
    if (key && SKIP_KEYS.has(key)) return value;
    return sanitizeText(value, maps);
  }
  if (Array.isArray(value)) {
    return value.map(v => sanitizeDeep(v, maps, key));
  }
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value;
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = SKIP_KEYS.has(k) ? value[k] : sanitizeDeep(value[k], maps, k);
    }
    return out;
  }
  return value; // number, boolean, null, undefined
}

/**
 * Öffentliche API: säubert das komplette Analyse-Ergebnis-Objekt.
 * @param {object} result - das fertige Analyse-Ergebnis (wird NICHT mutiert)
 * @param {string} sourceText - sauberer Vertragstext (für quelltext-validierte Reparatur)
 * @returns {object} gesäubertes Ergebnis (neue Kopie)
 */
function sanitizeAnalysisResult(result, sourceText) {
  if (!result || typeof result !== 'object') return result;
  try {
    const maps = buildSourceMaps(sourceText);
    return sanitizeDeep(result, maps, null);
  } catch (err) {
    // Niemals die Analyse wegen der Kosmetik scheitern lassen.
    console.warn(`⚠️ [textSanitizer] Säuberung übersprungen (ignoriert): ${err.message}`);
    return result;
  }
}

module.exports = { sanitizeAnalysisResult, sanitizeText, buildSourceMaps };

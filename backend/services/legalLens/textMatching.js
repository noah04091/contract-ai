/**
 * Legal Lens - Shared Text Matching Utilities
 *
 * Zentralisierte Fuzzy-Matching-Funktionen fuer alle Parser-Passes.
 * Vorher waren diese Funktionen in structuralDiscovery.js und
 * guidedSegmenter.js dupliziert.
 *
 * Kernproblem: pdf-parse erzeugt oft Mehrfach-Whitespace, GPT zitiert
 * mit einfachen Spaces. Wir normalisieren beide Seiten und halten ein
 * Index-Mapping, um korrekte Original-Offsets zurueckzugeben.
 *
 * @version 1.0.0
 */

/**
 * Normalisiert einen String fuer fuzzy matching: Collapse aller
 * Whitespace-Sequenzen zu einem einzelnen Space, trim.
 */
function normalizeForMatch(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Baut aus dem Rohtext eine normalisierte Version und ein Index-Mapping:
 * fuer jede Zeichenposition im normalisierten String kennen wir die
 * entsprechende Position im Originaltext.
 *
 * @param {string} rawText
 * @returns {{ normalized: string, indexMap: number[] }}
 */
function buildNormalizedIndex(rawText) {
  const normalizedChars = [];
  const indexMap = [];
  let prevWasSpace = false;
  let started = false;
  for (let i = 0; i < rawText.length; i++) {
    const ch = rawText[i];
    const isSpace = /\s/.test(ch);
    if (isSpace) {
      if (!started || prevWasSpace) continue;
      normalizedChars.push(' ');
      indexMap.push(i);
      prevWasSpace = true;
    } else {
      normalizedChars.push(ch);
      indexMap.push(i);
      prevWasSpace = false;
      started = true;
    }
  }
  // Trailing space trimmen
  while (normalizedChars.length && normalizedChars[normalizedChars.length - 1] === ' ') {
    normalizedChars.pop();
    indexMap.pop();
  }
  return { normalized: normalizedChars.join(''), indexMap };
}

/**
 * Findet einen Marker fuzzy (whitespace-normalisiert) im Rohtext und
 * gibt die Original-Position zurueck, oder -1 wenn nicht gefunden.
 *
 * @param {string} rawText
 * @param {string} marker
 * @param {object} [normalizedIndex] - Vorgefertigter Index (optional)
 * @returns {number} Original-Offset oder -1
 */
function findFuzzy(rawText, marker, normalizedIndex = null) {
  if (!marker) return -1;
  const { normalized, indexMap } = normalizedIndex || buildNormalizedIndex(rawText);
  const needle = normalizeForMatch(marker);
  if (!needle) return -1;
  const hit = normalized.indexOf(needle);
  if (hit < 0) return -1;
  return indexMap[hit] ?? -1;
}

/**
 * Wie findFuzzy, aber bei mehreren Fundstellen wird die dem hintOffset
 * naechste gewaehlt. Wichtig fuer Dokumente mit doppeltem Inhalt
 * (Original + Dokumentenkopie).
 *
 * @param {string} rawText
 * @param {string} marker
 * @param {number|null} hintOffset
 * @param {object} [normalizedIndex]
 * @returns {number} Original-Offset oder -1
 */
function findFuzzyNearest(rawText, marker, hintOffset, normalizedIndex = null) {
  if (!marker) return -1;
  const { normalized, indexMap } = normalizedIndex || buildNormalizedIndex(rawText);
  const needle = normalizeForMatch(marker);
  if (!needle) return -1;

  // Alle Vorkommen sammeln
  const positions = [];
  let searchFrom = 0;
  while (searchFrom < normalized.length) {
    const hit = normalized.indexOf(needle, searchFrom);
    if (hit < 0) break;
    positions.push(indexMap[hit] ?? -1);
    searchFrom = hit + 1;
  }

  if (positions.length === 0) return -1;
  if (positions.length === 1 || hintOffset == null) return positions[0];

  // Naechste zum Hint waehlen
  let closest = positions[0];
  let closestDist = Math.abs(positions[0] - hintOffset);
  for (let i = 1; i < positions.length; i++) {
    const dist = Math.abs(positions[i] - hintOffset);
    if (dist < closestDist) {
      closest = positions[i];
      closestDist = dist;
    }
  }
  return closest;
}

/**
 * Progressive Substring-Suche: Versucht zuerst den vollen Marker,
 * dann 60%, dann 40% des Markers. Nuetzlich fuer Self-Correction (Pass 5),
 * wenn GPT-Marker leicht abweichen.
 *
 * @param {string} rawText
 * @param {string} marker
 * @param {object} [normalizedIndex]
 * @returns {{ offset: number, matchLength: number, ratio: number } | null}
 */
function findFuzzyProgressive(rawText, marker, normalizedIndex = null) {
  if (!marker) return null;
  const idx = normalizedIndex || buildNormalizedIndex(rawText);
  const normalizedMarker = normalizeForMatch(marker);
  if (!normalizedMarker) return null;

  // Versuche 100%, 60%, 40% des Markers
  const ratios = [1.0, 0.6, 0.4];
  for (const ratio of ratios) {
    const len = Math.max(10, Math.floor(normalizedMarker.length * ratio));
    const substring = normalizedMarker.substring(0, len);
    const hit = idx.normalized.indexOf(substring);
    if (hit >= 0) {
      return {
        offset: idx.indexMap[hit] ?? -1,
        matchLength: len,
        ratio
      };
    }
  }
  return null;
}

/**
 * Entfernt alle Vorkommen der gegebenen Rahmen-Zeilen aus einem Textabschnitt.
 * Nutzt whitespace-tolerantes Matching.
 *
 * @param {string} text
 * @param {string[]} frameLines
 * @returns {string}
 */
function removeFrameLines(text, frameLines) {
  if (!text || !Array.isArray(frameLines) || frameLines.length === 0) return text;

  const sorted = [...frameLines]
    .filter(s => typeof s === 'string' && s.trim().length > 2)
    .sort((a, b) => b.length - a.length);

  let result = text;
  for (const frameLine of sorted) {
    const normalizedFrame = normalizeForMatch(frameLine);
    if (!normalizedFrame) continue;

    const pattern = normalizedFrame
      .split(/\s+/)
      .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+');

    try {
      const re = new RegExp(pattern, 'g');
      result = result.replace(re, ' ');
    } catch {
      continue;
    }
  }

  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result;
}

module.exports = {
  normalizeForMatch,
  buildNormalizedIndex,
  findFuzzy,
  findFuzzyNearest,
  findFuzzyProgressive,
  removeFrameLines
};

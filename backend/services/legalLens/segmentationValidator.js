/**
 * Legal Lens - Segmentation Validator (Pass 4)
 *
 * Automatische Qualitaetspruefung der Segmentierungsergebnisse.
 * KEIN GPT — reine Algorithmik. Entscheidet, ob der Self-Correction
 * Pass (Pass 5) noetig ist.
 *
 * Pruefungen:
 *   - Coverage: Summe Klausel-Chars / Input-Chars >= 0.75
 *   - Marker-Rate: Verifizierte Marker / Gesamt >= 0.90
 *   - Leere Klauseln: Klauseln mit charLength === 0 = 0
 *   - Reihenfolge: Offsets monoton steigend
 *   - Inhalt-Check: Klauseln mit < 50 Chars und ohne Satzstruktur -> verdaechtig
 *
 * @version 1.0.0
 */

/**
 * @typedef {object} ValidationResult
 * @property {number} qualityScore - 0 bis 1, gewichteter Gesamtscore
 * @property {object} checks - Detaillierte Ergebnisse pro Check
 * @property {boolean} needsCorrection - Ob Pass 5 noetig ist
 * @property {string[]} issues - Menschenlesbare Problembeschreibungen
 * @property {object[]} suspiciousClauses - Klauseln, die verdaechtig sind
 * @property {object[]} gaps - Luecken im Text (fuer Coverage-Korrektur)
 */

// Gewichtung der einzelnen Checks fuer den Gesamtscore
const WEIGHTS = {
  coverage: 0.35,
  markerRate: 0.25,
  emptyClauses: 0.15,
  order: 0.15,
  contentQuality: 0.10
};

// Schwellwerte
const THRESHOLDS = {
  coverageMin: 0.75,
  markerRateMin: 0.90,
  suspiciousMaxChars: 50,
  correctionThreshold: 0.85  // Unter diesem Score -> needsCorrection = true
};

/**
 * Validiert die Segmentierungsergebnisse.
 *
 * @param {object[]} clauses - Array von Klauseln aus Pass 3
 * @param {string} inputText - Der Text, der segmentiert wurde (zugeschnitten)
 * @param {object} [options]
 * @param {number} [options.inputTextLength] - Falls inputText nicht uebergeben wird
 * @returns {ValidationResult}
 */
function validate(clauses, inputText, options = {}) {
  const inputLength = inputText ? inputText.length : (options.inputTextLength || 0);
  const issues = [];
  const suspiciousClauses = [];

  // ── Check 1: Coverage ───────────────────────────────────
  const totalClauseChars = clauses.reduce((sum, c) => sum + (c.charLength || (c.text || '').length), 0);
  const coverage = inputLength > 0 ? totalClauseChars / inputLength : 0;
  const coverageOk = coverage >= THRESHOLDS.coverageMin;
  let coverageScore = Math.min(1, coverage / THRESHOLDS.coverageMin);

  if (!coverageOk) {
    issues.push(`Coverage zu niedrig: ${(coverage * 100).toFixed(1)}% (min: ${(THRESHOLDS.coverageMin * 100)}%)`);
  }

  // ── Check 2: Marker-Rate ───────────────────────────────
  const totalClauses = clauses.length;
  const verifiedMarkers = clauses.filter(c => c.startMarkerFound).length;
  const markerRate = totalClauses > 0 ? verifiedMarkers / totalClauses : 1;
  const markerRateOk = markerRate >= THRESHOLDS.markerRateMin;
  const markerScore = Math.min(1, markerRate / THRESHOLDS.markerRateMin);

  if (!markerRateOk) {
    issues.push(`Marker-Rate zu niedrig: ${(markerRate * 100).toFixed(1)}% (min: ${(THRESHOLDS.markerRateMin * 100)}%)`);
  }

  // ── Check 3: Leere Klauseln ────────────────────────────
  const emptyClauses = clauses.filter(c => (c.charLength || (c.text || '').length) === 0);
  const emptyCount = emptyClauses.length;
  const emptyScore = emptyCount === 0 ? 1 : Math.max(0, 1 - (emptyCount / Math.max(1, totalClauses)));

  if (emptyCount > 0) {
    issues.push(`${emptyCount} leere Klausel(n) gefunden`);
    emptyClauses.forEach(c => {
      suspiciousClauses.push({
        id: c.id,
        index: c.index,
        reason: 'empty',
        title: c.title || c.number || '(ohne Titel)'
      });
    });
  }

  // ── Check 4: Reihenfolge ───────────────────────────────
  let orderOk = true;
  const clausesWithOffset = clauses.filter(c => typeof c.startOffset === 'number' && c.startOffset >= 0);
  for (let i = 1; i < clausesWithOffset.length; i++) {
    if (clausesWithOffset[i].startOffset < clausesWithOffset[i - 1].startOffset) {
      orderOk = false;
      issues.push(
        `Reihenfolge-Fehler: Klausel ${clausesWithOffset[i].id} ` +
        `(Offset ${clausesWithOffset[i].startOffset}) kommt vor ` +
        `${clausesWithOffset[i - 1].id} (Offset ${clausesWithOffset[i - 1].startOffset})`
      );
      break;
    }
  }
  const orderScore = orderOk ? 1 : 0;

  // ── Check 5: Content-Quality ───────────────────────────
  // Klauseln mit < 50 Chars und ohne erkennbare Satzstruktur sind verdaechtig
  const hasSentenceStructure = (text) => {
    if (!text) return false;
    // Mindestens ein Verb-artiges Wort oder Satzzeichen
    return /[.;:,]/.test(text) && text.split(/\s+/).length >= 3;
  };

  let suspiciousCount = 0;
  clauses.forEach(c => {
    const text = c.text || '';
    const len = text.length;
    if (len > 0 && len < THRESHOLDS.suspiciousMaxChars && !hasSentenceStructure(text)) {
      suspiciousCount++;
      suspiciousClauses.push({
        id: c.id,
        index: c.index,
        reason: 'too_short_no_structure',
        title: c.title || c.number || '(ohne Titel)',
        charLength: len,
        preview: text.substring(0, 80)
      });
    }
  });

  const contentScore = totalClauses > 0
    ? Math.max(0, 1 - (suspiciousCount / totalClauses))
    : 1;

  if (suspiciousCount > 0) {
    issues.push(`${suspiciousCount} verdaechtige Klausel(n) (zu kurz, keine Satzstruktur)`);
  }

  // ── Gaps finden (fuer Coverage-Korrektur in Pass 5) ────
  const gaps = findGaps(clauses, inputLength);

  // ── Gesamtscore berechnen ──────────────────────────────
  const qualityScore =
    WEIGHTS.coverage * coverageScore +
    WEIGHTS.markerRate * markerScore +
    WEIGHTS.emptyClauses * emptyScore +
    WEIGHTS.order * orderScore +
    WEIGHTS.contentQuality * contentScore;

  const needsCorrection = qualityScore < THRESHOLDS.correctionThreshold;

  return {
    qualityScore: Math.round(qualityScore * 1000) / 1000,
    checks: {
      coverage: {
        value: Math.round(coverage * 1000) / 1000,
        threshold: THRESHOLDS.coverageMin,
        ok: coverageOk,
        score: Math.round(coverageScore * 1000) / 1000,
        totalClauseChars,
        inputLength
      },
      markerRate: {
        value: Math.round(markerRate * 1000) / 1000,
        threshold: THRESHOLDS.markerRateMin,
        ok: markerRateOk,
        score: Math.round(markerScore * 1000) / 1000,
        verified: verifiedMarkers,
        total: totalClauses
      },
      emptyClauses: {
        count: emptyCount,
        ok: emptyCount === 0,
        score: Math.round(emptyScore * 1000) / 1000
      },
      order: {
        ok: orderOk,
        score: orderScore
      },
      contentQuality: {
        suspiciousCount,
        ok: suspiciousCount === 0,
        score: Math.round(contentScore * 1000) / 1000
      }
    },
    needsCorrection,
    issues,
    suspiciousClauses,
    gaps
  };
}

/**
 * Findet Luecken im Text, die von keiner Klausel abgedeckt werden.
 * Nuetzlich fuer Pass 5 (Self-Correction), um fehlende Bereiche gezielt
 * nochmal an GPT zu schicken.
 *
 * @param {object[]} clauses - Klauseln mit startOffset und charLength
 * @param {number} inputLength - Gesamtlaenge des Eingabetexts
 * @returns {object[]} Array von { start, end, length } Luecken
 */
function findGaps(clauses, inputLength) {
  if (!clauses.length || !inputLength) return [];

  // Nur Klauseln mit gueltigem Offset verwenden
  const sorted = clauses
    .filter(c => typeof c.startOffset === 'number' && c.startOffset >= 0)
    .map(c => ({
      start: c.startOffset,
      end: c.startOffset + (c.charLength || (c.text || '').length)
    }))
    .sort((a, b) => a.start - b.start);

  if (sorted.length === 0) return [];

  const gaps = [];
  const MIN_GAP = 100; // Luecken unter 100 Chars ignorieren (Whitespace, Seitenumbrueche)

  // Luecke am Anfang (vor erster Klausel — meist schon durch Boundary Detection entfernt)
  // Wir ignorieren sie hier, da Pass 1 das bereits behandelt hat

  // Luecken zwischen Klauseln
  for (let i = 1; i < sorted.length; i++) {
    const gapStart = sorted[i - 1].end;
    const gapEnd = sorted[i].start;
    const gapLength = gapEnd - gapStart;
    if (gapLength >= MIN_GAP) {
      gaps.push({ start: gapStart, end: gapEnd, length: gapLength });
    }
  }

  // Luecke am Ende (nach letzter Klausel)
  const lastEnd = sorted[sorted.length - 1].end;
  if (inputLength - lastEnd >= MIN_GAP) {
    gaps.push({ start: lastEnd, end: inputLength, length: inputLength - lastEnd });
  }

  return gaps;
}

module.exports = {
  validate,
  findGaps,
  THRESHOLDS,
  WEIGHTS
};

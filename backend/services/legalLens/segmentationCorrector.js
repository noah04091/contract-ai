/**
 * Legal Lens - Segmentation Corrector (Pass 5)
 *
 * Gezielte Nachbesserung der Segmentierungsergebnisse.
 * Laeuft NUR wenn Pass 4 (Validator) needsCorrection = true meldet.
 *
 * Strategien:
 *   - Coverage < 0.75: Luecken im Text finden, nur diese an GPT schicken
 *   - Marker nicht gefunden: Progressive Substring-Suche
 *   - Verdaechtige Klauseln: GPT-Check ob echter Vertragsinhalt
 *   - Leere Klauseln: Entfernen, Nachbar-Grenzen neu berechnen
 *   - Reihenfolge-Fehler: Duplikat-Erkennung -> naechste Position
 *
 * Maximal 1 Korrektur-Durchlauf. Kein Loop.
 *
 * Kosten: 0-2 GPT Calls (nur bei ~20% der Dokumente)
 *
 * @version 1.0.0
 */

const OpenAI = require('openai');
const {
  normalizeForMatch,
  buildNormalizedIndex,
  findFuzzyProgressive,
  findFuzzyNearest,
  removeFrameLines
} = require('./textMatching');

const MODEL = 'gpt-4o';

class SegmentationCorrector {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('segmentationCorrector: OPENAI_API_KEY fehlt');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Korrigiert die Segmentierung basierend auf Validierungsergebnis.
   *
   * @param {object[]} clauses - Klauseln aus Pass 3
   * @param {string} croppedText - Zugeschnittener Text (aus Pass 1)
   * @param {object} validationResult - Ergebnis von Pass 4 (segmentationValidator)
   * @param {object} [options]
   * @param {number} [options.startOffset=0]
   * @param {string[]} [options.frameLines=[]]
   * @param {number} [options.timeoutMs=60000]
   * @returns {Promise<object>} { clauses, corrections, metadata }
   */
  async correct(clauses, croppedText, validationResult, options = {}) {
    const { startOffset = 0, frameLines = [], timeoutMs = 60000 } = options;
    const startTime = Date.now();
    const corrections = [];

    let correctedClauses = [...clauses];

    // 1. Leere Klauseln entfernen
    const emptyCount = correctedClauses.filter(c => (c.charLength || (c.text || '').length) === 0).length;
    if (emptyCount > 0) {
      correctedClauses = correctedClauses.filter(c => (c.charLength || (c.text || '').length) > 0);
      corrections.push({ type: 'remove_empty', count: emptyCount });
      console.log(`[Corrector] ${emptyCount} leere Klauseln entfernt`);
    }

    // 2. Nicht gefundene Marker: Progressive Suche
    const unfoundCount = correctedClauses.filter(c => !c.startMarkerFound && c.startMarker).length;
    if (unfoundCount > 0) {
      const normalizedIndex = buildNormalizedIndex(croppedText);
      let fixed = 0;
      correctedClauses = correctedClauses.map(c => {
        if (c.startMarkerFound || !c.startMarker) return c;

        const result = findFuzzyProgressive(croppedText, c.startMarker, normalizedIndex);
        if (result && result.offset >= 0) {
          fixed++;
          return {
            ...c,
            startOffset: result.offset + startOffset,
            startMarkerFound: true,
            _correctedMarker: true,
            _markerMatchRatio: result.ratio
          };
        }
        return c;
      });
      if (fixed > 0) {
        corrections.push({ type: 'progressive_marker_fix', fixed, total: unfoundCount });
        console.log(`[Corrector] ${fixed}/${unfoundCount} Marker progressiv gefunden`);
      }
    }

    // 3. Reihenfolge korrigieren (nach Offset sortieren)
    const hasOrderIssue = !validationResult.checks.order.ok;
    if (hasOrderIssue) {
      const withOffset = correctedClauses.filter(c => typeof c.startOffset === 'number' && c.startOffset >= 0);
      const withoutOffset = correctedClauses.filter(c => !(typeof c.startOffset === 'number' && c.startOffset >= 0));

      // Deduplizieren: Wenn zwei Klauseln am gleichen Offset, erste behalten
      const seen = new Map();
      for (const c of withOffset) {
        const key = c.startOffset;
        let isDup = false;
        for (const [existing] of seen) {
          if (Math.abs(existing - key) < 100) { isDup = true; break; }
        }
        if (!isDup) seen.set(key, c);
      }

      correctedClauses = [
        ...Array.from(seen.entries()).sort(([a], [b]) => a - b).map(([, c]) => c),
        ...withoutOffset
      ];
      corrections.push({ type: 'reorder', removed: withOffset.length - seen.size });
      console.log(`[Corrector] Reihenfolge korrigiert, ${withOffset.length - seen.size} Duplikate entfernt`);
    }

    // 4. Text fuer Klauseln mit korrigiertem Offset neu slicen
    correctedClauses = this._resliceClauses(correctedClauses, croppedText, startOffset, frameLines);

    // 5. Coverage-Luecken schliessen (nur wenn signifikante Luecken)
    const gaps = validationResult.gaps || [];
    const significantGaps = gaps.filter(g => g.length >= 200);
    if (significantGaps.length > 0 && significantGaps.length <= 5) {
      try {
        const gapClauses = await this._fillGaps(significantGaps, croppedText, startOffset, frameLines, timeoutMs);
        if (gapClauses.length > 0) {
          correctedClauses = this._mergeClauses(correctedClauses, gapClauses);
          corrections.push({ type: 'gap_fill', gapsFound: significantGaps.length, clausesAdded: gapClauses.length });
          console.log(`[Corrector] ${gapClauses.length} Klauseln aus ${significantGaps.length} Luecken ergaenzt`);
        }
      } catch (err) {
        console.error('[Corrector] Gap-Fill fehlgeschlagen:', err.message);
        corrections.push({ type: 'gap_fill_failed', error: err.message });
      }
    }

    // 6. Verdaechtige Klauseln pruefen (GPT-Call)
    const suspicious = (validationResult.suspiciousClauses || [])
      .filter(s => s.reason === 'too_short_no_structure');
    if (suspicious.length > 0 && suspicious.length <= 10) {
      try {
        const toRemove = await this._checkSuspicious(correctedClauses, suspicious, timeoutMs);
        if (toRemove.length > 0) {
          const removeIds = new Set(toRemove);
          correctedClauses = correctedClauses.filter(c => !removeIds.has(c.id));
          corrections.push({ type: 'remove_suspicious', count: toRemove.length });
          console.log(`[Corrector] ${toRemove.length} verdaechtige Klauseln entfernt`);
        }
      } catch (err) {
        console.error('[Corrector] Suspicious-Check fehlgeschlagen:', err.message);
      }
    }

    // IDs und Indizes neu zuweisen
    correctedClauses = correctedClauses.map((c, i) => ({
      ...c,
      id: `clause_v2_${i + 1}`,
      index: i
    }));

    const elapsedMs = Date.now() - startTime;
    console.log(`[Corrector] Fertig in ${elapsedMs}ms — ${corrections.length} Korrekturen, ${correctedClauses.length} Klauseln`);

    return {
      clauses: correctedClauses,
      corrections,
      metadata: {
        elapsedMs,
        correctionCount: corrections.length,
        clausesBefore: clauses.length,
        clausesAfter: correctedClauses.length
      }
    };
  }

  /**
   * Sliced den Text fuer Klauseln neu (nach Offset-Korrekturen).
   * @private
   */
  _resliceClauses(clauses, croppedText, startOffset, frameLines) {
    const effectiveEnd = startOffset + croppedText.length;

    return clauses.map((c, i) => {
      // Nur re-slicen wenn noetig (korrigierter Marker oder leerer Text)
      if (!c._correctedMarker && c.text && c.charLength > 0) return c;
      if (!c.startMarkerFound || c.startOffset == null) return c;

      const next = clauses.slice(i + 1).find(h => h.startMarkerFound && h.startOffset > c.startOffset);
      const sliceEnd = next ? next.startOffset : effectiveEnd;
      const localStart = c.startOffset - startOffset;
      const localEnd = sliceEnd - startOffset;

      let text = croppedText.substring(
        Math.max(0, localStart),
        Math.min(croppedText.length, localEnd)
      );
      text = removeFrameLines(text, frameLines);
      text = text.trim();

      return { ...c, text, charLength: text.length };
    });
  }

  /**
   * Fuellt Coverage-Luecken durch GPT-Call auf die Luecken-Bereiche.
   * @private
   */
  async _fillGaps(gaps, croppedText, startOffset, frameLines, timeoutMs) {
    // Alle Luecken zusammenfassen und als ein Batch an GPT schicken
    const gapTexts = gaps.map(g => {
      const localStart = g.start - startOffset;
      const localEnd = g.end - startOffset;
      return {
        text: croppedText.substring(Math.max(0, localStart), Math.min(croppedText.length, localEnd)),
        globalOffset: g.start
      };
    }).filter(g => g.text.trim().length > 50);

    if (gapTexts.length === 0) return [];

    const gapContent = gapTexts.map((g, i) =>
      `--- LUECKE ${i + 1} (ab Position ${g.globalOffset}) ---\n${g.text}\n--- ENDE LUECKE ${i + 1} ---`
    ).join('\n\n');

    const response = await this.openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Du bist ein Vertragsklausel-Erkenner. Dir werden Textabschnitte gegeben, die zwischen bekannten Klauseln liegen. Pruefe, ob diese Abschnitte eigene Klauseln enthalten.

Antworte NUR mit JSON:
{
  "clauses": [
    { "number": "...", "title": "...", "startMarker": "erste 40-80 Zeichen WOERTLICH", "gapIndex": 0 }
  ]
}

Wenn ein Abschnitt keine echte Klausel enthaelt (z.B. nur Whitespace, Seitennummern), gib ein leeres Array.`
        },
        { role: 'user', content: gapContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000
    }, { timeout: timeoutMs });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const rawClauses = Array.isArray(parsed.clauses) ? parsed.clauses : [];

    // Marker im croppedText lokalisieren
    const normalizedIndex = buildNormalizedIndex(croppedText);
    const result = [];

    for (const c of rawClauses) {
      if (!c.startMarker) continue;
      const gapInfo = gapTexts[c.gapIndex] || gapTexts[0];
      const pos = findFuzzyNearest(croppedText, c.startMarker, gapInfo.globalOffset - startOffset, normalizedIndex);
      if (pos >= 0) {
        result.push({
          id: `clause_v2_gap_${result.length + 1}`,
          index: -1, // Wird spaeter neu zugewiesen
          number: c.number || null,
          title: c.title || null,
          text: '', // Wird beim Merge resliced
          startMarker: c.startMarker,
          startMarkerFound: true,
          startOffset: pos + startOffset,
          charLength: 0,
          _fromGapFill: true
        });
      }
    }

    return result;
  }

  /**
   * Merged Gap-Fill-Klauseln in die bestehende Liste (nach Offset sortiert).
   * @private
   */
  _mergeClauses(existing, newClauses) {
    const all = [...existing, ...newClauses]
      .filter(c => c.startMarkerFound && c.startOffset != null)
      .sort((a, b) => a.startOffset - b.startOffset);

    // Klauseln ohne Offset ans Ende
    const noOffset = [...existing, ...newClauses]
      .filter(c => !(c.startMarkerFound && c.startOffset != null));

    return [...all, ...noOffset];
  }

  /**
   * Prueft verdaechtige Klauseln per GPT: Sind sie echter Vertragsinhalt?
   * @private
   */
  async _checkSuspicious(clauses, suspicious, timeoutMs) {
    const suspiciousTexts = suspicious.map(s => {
      const clause = clauses.find(c => c.id === s.id);
      return clause ? { id: s.id, text: clause.text } : null;
    }).filter(Boolean);

    if (suspiciousTexts.length === 0) return [];

    const content = suspiciousTexts.map((s, i) =>
      `[${i + 1}] ID: ${s.id}\nText: "${s.text}"`
    ).join('\n\n');

    const response = await this.openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Du pruefst, ob kurze Textfragmente echte Vertragsklauseln sind oder Rahmen-Material (Adressen, Grussformeln, Seitennummern, Header/Footer-Fragmente).

Antworte NUR mit JSON:
{ "remove": ["id1", "id2"] }

"remove" enthaelt die IDs der Fragmente, die KEIN echter Vertragsinhalt sind.`
        },
        { role: 'user', content }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500
    }, { timeout: timeoutMs });

    const parsed = JSON.parse(response.choices?.[0]?.message?.content || '{}');
    return Array.isArray(parsed.remove) ? parsed.remove : [];
  }
}

module.exports = {
  SegmentationCorrector,
  segmentationCorrector: new SegmentationCorrector()
};

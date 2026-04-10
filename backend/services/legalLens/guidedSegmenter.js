/**
 * Legal Lens - Guided Segmentation Service (Pass 2)
 *
 * Segmentiert einen Vertragstext in Klauseln, wobei das Ergebnis des
 * Structural Discovery (Pass 1) als Kontext dient. Der Segmenter weiß
 * also bereits:
 *   - Wo der eigentliche Inhalt beginnt und endet
 *   - Welches Nummerierungs-/Gliederungs­schema verwendet wird
 *   - Welche Zeilen wiederkehrende Rahmen-Elemente sind (werden gefiltert)
 *   - Welche Example-Marker das Modell im Dokument erkannt hat
 *
 * Kein Regex, kein Keyword-Filter. Die Arbeit macht GPT — aber INFORMIERT.
 *
 * @version 1.0.0 — Experiment (Pass 2 von 3)
 */

const OpenAI = require('openai');

const MODEL = 'gpt-4o';
// Das Input-Limit bezieht sich auf den bereits zugeschnittenen Content-Bereich
// (ohne Briefkopf/Anhänge). GPT-4o hat 128k Context, wir lassen ~12k für
// Prompt + Discovery-Kontext + Output übrig.
const MAX_INPUT_CHARS = 110000;
const MAX_COMPLETION_TOKENS = 4000;

/**
 * System-Prompt für die Segmentierung.
 *
 * Wichtig: Das Modell gibt NICHT den vollen Klauseltext zurück (sonst
 * sprengt es das Output-Token-Budget und verstümmelt bei langen Verträgen
 * die Antwort). Stattdessen liefert es nur die START-Marker — wir slicen
 * den Text selbst aus dem Rohtext zwischen startMarker_i und startMarker_{i+1}.
 *
 * Der Prompt nennt bewusst keine konkreten Nummerierungs-Schemata — das
 * kommt alles aus dem Discovery-Ergebnis, das wir im User-Prompt mitgeben.
 */
const SYSTEM_PROMPT = `Du bist ein Experte für die Segmentierung von Vertragstexten. Deine Aufgabe: Erkenne, wo jede einzelne Klausel im gegebenen Vertragstext beginnt, und benenne sie.

Du bekommst:
1. Ein STRUKTUR-KONTEXT-Objekt, das beschreibt, wie dieses spezifische Dokument gegliedert ist (Nummerierungs-Schema, Beispiel-Marker, bekannte Rahmen-Elemente).
2. Den rohen Vertragstext.

Für jede erkannte Klausel gibst du ein JSON-Objekt zurück mit genau diesen Feldern:

{
  "number": "Die sichtbare Nummer dieser Klausel, WÖRTLICH wie im Text (z.B. '§ 1', '1.', 'Artikel 3', 'Section II'). null wenn es keine Nummer gibt.",
  "title": "Der Titel dieser Klausel (z.B. 'Vertragsgegenstand', 'Haftung und Gewährleistung'). null wenn kein Titel vorhanden ist.",
  "startMarker": "Die ersten 40 bis 80 Zeichen dieser Klausel, WÖRTLICH aus dem Originaltext kopiert (nicht umgeschrieben, keine Normalisierung). Dieser Marker wird verwendet, um die Klausel im Originaltext wiederzufinden — er MUSS so zurückgegeben werden, wie er im Text steht, inklusive Whitespace und Zeilenumbrüchen."
}

Deine Antwort ist IMMER ein einzelnes JSON-Objekt der Form:

{
  "clauses": [
    { "number": "...", "title": "...", "startMarker": "..." },
    ...
  ]
}

HARTE REGELN:
1. Halte dich an das Nummerierungs-Schema aus STRUKTUR-KONTEXT. Wenn dort 'Nummerierte Paragraphen mit Titelzeilen' steht, erkenne die Paragraph-Anfänge.
2. Du gibst NUR die Start-Marker zurück, NICHT den vollen Klauseltext. Den vollen Text rekonstruieren wir später aus dem Rohtext.
3. Wiederkehrende Rahmen-Elemente (aus frameElements.repeatingPageHeaders) sind KEINE Klauseln.
4. Briefkopf (coverBlock), Unterschriftenblock (signatureBlock), Anhänge (annexes) sind KEINE Klauseln.
5. Jeder startMarker muss WÖRTLICH aus dem Originaltext stammen. Keine Umformulierungen, keine Vereinheitlichung von Whitespace. Kopiere ihn buchstabengenau.
6. Reihenfolge der Klauseln entspricht der Reihenfolge im Originaltext.
7. Du erfindest KEINE Klauseln und lässt keine aus.
8. Antworte NUR mit dem JSON-Objekt, ohne Erklärungen oder Markdown.
9. Falls nach dem Zuschnitt noch Nicht-Vertragstext übrig ist (Adressen, Grußformeln, reine Seitennummern ohne Inhalt), ignoriere diesen — er ist keine Klausel.
10. Wenn ein Dokument verschachtelte Abschnitte mit EIGENER Nummerierung enthält (z.B. eine Widerrufsbelehrung mit eigenem § 1–§ 8 innerhalb einer Versicherungspolice), disambiguiere doppelte Nummern: Ergänze den Titel des Elternabschnitts in Klammern, damit keine Nummer doppelt vorkommt. Beispiel: '§ 1' der Widerrufsbelehrung wird zu '§ 1 (Widerrufsbelehrung)'.`;

function normalizeForMatch(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim();
}

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
  while (normalizedChars.length && normalizedChars[normalizedChars.length - 1] === ' ') {
    normalizedChars.pop();
    indexMap.pop();
  }
  return { normalized: normalizedChars.join(''), indexMap };
}

/**
 * Entfernt alle Vorkommen der gegebenen Rahmen-Zeilen aus einem Textabschnitt.
 * Nutzt whitespace-tolerantes Matching: Jede Frame-Zeile wird zu einer
 * regulären Zeilensuche, bei der Mehrfach-Whitespaces übersehen werden.
 *
 * Die Frame-Zeilen kommen direkt aus dem Discovery-Ergebnis
 * (frameElements.repeatingPageHeaders) und sind dokument-spezifisch,
 * NICHT hardcodiert.
 */
function removeFrameLines(text, frameLines) {
  if (!text || !Array.isArray(frameLines) || frameLines.length === 0) return text;

  // Sortiere nach Länge absteigend — längere Frame-Zeilen zuerst entfernen,
  // damit sie nicht durch kürzere Varianten "aufgefressen" werden.
  const sorted = [...frameLines]
    .filter(s => typeof s === 'string' && s.trim().length > 2)
    .sort((a, b) => b.length - a.length);

  let result = text;
  for (const frameLine of sorted) {
    const normalizedFrame = normalizeForMatch(frameLine);
    if (!normalizedFrame) continue;

    // Whitespace-toleranter Regex: Jede Whitespace-Sequenz im Frame
    // wird zu \s+ im Regex, andere Zeichen werden escaped.
    const pattern = normalizedFrame
      .split(/\s+/)
      .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+');

    try {
      const re = new RegExp(pattern, 'g');
      result = result.replace(re, ' ');
    } catch {
      // Defensiv: bei ungültigem Pattern einfach überspringen
      continue;
    }
  }

  // Mehrfache Leerzeichen und überflüssige Zeilenumbrüche zusammenfassen
  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result;
}

/**
 * Findet einen Marker fuzzy (whitespace-normalisiert) im Rohtext und
 * gibt die Original-Position zurück, oder -1 wenn nicht gefunden.
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
 * nächste gewählt. Wichtig für Dokumente mit doppeltem Inhalt
 * (Original + Dokumentenkopie).
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

  // Nächste zum Hint wählen
  let closest = positions[0];
  let closestDist = Math.abs(positions[0] - hintOffset);
  for (let i = 1; i < positions.length; i++) {
    const dist = Math.abs(positions[i] - hintOffset);
    if (dist < closestDist) {
      closest = positions[i];
      closestDist = dist;
    }
  }
  if (positions.length > 1) {
    console.log(`[findFuzzyNearest] ${positions.length} Fundstellen, hint=${hintOffset}, gewählt=${closest}`);
  }
  return closest;
}

/**
 * Schneidet den Rohtext auf den Content-Bereich zu, basierend auf den
 * contentStart/contentEnd-Markern aus dem Discovery-Ergebnis.
 * Falls ein Marker nicht gefunden wird, bleibt die entsprechende Grenze
 * unverändert (Anfang bzw. Ende des Textes).
 */
function cropToContentRange(rawText, discovery) {
  const normalizedIndex = buildNormalizedIndex(rawText);

  let start = 0;
  let end = rawText.length;

  // ── contentStart ───────────────────────────────────
  const startMarker = discovery?.contentStart?.marker;
  const startHint = typeof discovery?.contentStart?.charOffset === 'number'
    ? discovery.contentStart.charOffset : null;
  if (startMarker) {
    const pos = findFuzzyNearest(rawText, startMarker, startHint, normalizedIndex);
    if (pos >= 0) {
      start = pos;
    } else if (startHint != null && startHint > 0 && startHint < rawText.length) {
      start = startHint;
    }
  }

  // ── contentEnd ─────────────────────────────────────
  const endMarker = discovery?.contentEnd?.marker;
  const endHint = typeof discovery?.contentEnd?.charOffset === 'number'
    ? discovery.contentEnd.charOffset : null;
  if (endMarker) {
    const pos = findFuzzyNearest(rawText, endMarker, endHint, normalizedIndex);
    if (pos > start) {
      end = pos + endMarker.length;
    } else if (endHint != null && endHint > start && endHint <= rawText.length) {
      end = endHint;
    }
  }

  return {
    croppedText: rawText.substring(start, end),
    startOffset: start,
    endOffset: end,
    cropped: start > 0 || end < rawText.length
  };
}

class GuidedSegmenter {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('guidedSegmenter: OPENAI_API_KEY fehlt in Environment');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Segmentiert einen bereits zugeschnittenen Text in Klauseln.
   * Fuer die neue 5-Pass-Pipeline (universalParserAdapter).
   *
   * Unterschiede zu segment():
   *   - Nimmt bereits zugeschnittenen Text (kein eigenes Cropping)
   *   - Nimmt Structure-Ergebnis statt Discovery-Ergebnis
   *   - Kein estimatedSegmentCount (kein Ziel-Anzahl-Bias)
   *   - Batching fuer lange Texte (> 110K chars)
   *   - Coverage-Tracking in Metadata
   *
   * @param {string} croppedText - Zugeschnittener Text aus Pass 1
   * @param {object} structureResult - Ergebnis von structureAnalyzer.analyze()
   * @param {object} [options]
   * @param {number} [options.startOffset=0] - Offset im Rohtext (fuer absolute Positionen)
   * @param {number} [options.rawTextLength] - Laenge des vollen Rohtexts
   * @param {number} [options.timeoutMs=90000]
   * @returns {Promise<object>} { clauses, metadata }
   */
  async segmentUniversal(croppedText, structureResult, options = {}) {
    const { startOffset = 0, rawTextLength, timeoutMs = 90000 } = options;
    const startTime = Date.now();

    if (!croppedText || typeof croppedText !== 'string') {
      throw new Error('guidedSegmenter.segmentUniversal: croppedText muss ein String sein');
    }

    const structure = structureResult?.structure || structureResult || {};

    console.log(
      `[GuidedSegmenter] Starte Universal-Segmentierung — ${croppedText.length} Zeichen, ` +
      `scheme=${structure.scheme || '?'}`
    );

    // Kontext-Objekt OHNE estimatedSegmentCount
    const context = {
      documentType: structure.documentType,
      language: structure.language,
      segmentation: {
        scheme: structure.scheme,
        // KEIN estimatedSegmentCount — kein Bias
        exampleMarkers: structure.exampleMarkers,
        hasNestedStructure: structure.hasNestedStructure
      },
      frameElements: {
        repeatingPageHeaders: structure.repeatingPageHeaders || []
      }
    };

    // Batching fuer lange Texte
    let allClausesRaw;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let batchCount = 1;

    if (croppedText.length > MAX_INPUT_CHARS) {
      console.log(`[GuidedSegmenter] Text zu lang (${croppedText.length}), starte Batching...`);
      const batchResult = await this._segmentBatched(croppedText, context, timeoutMs);
      allClausesRaw = batchResult.clauses;
      totalPromptTokens = batchResult.promptTokens;
      totalCompletionTokens = batchResult.completionTokens;
      batchCount = batchResult.batchCount;
    } else {
      const result = await this._singleSegmentCall(croppedText, context, timeoutMs);
      allClausesRaw = result.clauses;
      totalPromptTokens = result.promptTokens;
      totalCompletionTokens = result.completionTokens;
    }

    if (allClausesRaw.length === 0) {
      console.log('[GuidedSegmenter] Keine Klauseln erkannt');
      return {
        clauses: [],
        metadata: {
          model: MODEL, elapsedMs: Date.now() - startTime,
          inputCharsTotal: rawTextLength || croppedText.length,
          inputCharsSent: croppedText.length,
          cropped: startOffset > 0, contentStartOffset: startOffset,
          actualSegmentCount: 0, markersVerified: 0,
          coverage: 0, batchCount,
          promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens
        }
      };
    }

    // Post-Processing: Marker lokalisieren + Text slicen
    const normalizedIndex = buildNormalizedIndex(croppedText);
    const frameLines = structure.repeatingPageHeaders || [];

    const markerHits = allClausesRaw.map((c, idx) => {
      const startMarkerStr = typeof c.startMarker === 'string' ? c.startMarker : null;
      const posInCropped = startMarkerStr ? findFuzzy(croppedText, startMarkerStr, normalizedIndex) : -1;
      const startOffsetAbs = posInCropped >= 0 ? posInCropped + startOffset : -1;
      return {
        idx, number: c.number ?? null, title: c.title ?? null,
        startMarker: startMarkerStr, startOffset: startOffsetAbs,
        found: startOffsetAbs >= 0
      };
    });

    const effectiveEnd = startOffset + croppedText.length;

    const clauses = markerHits.map((hit, i) => {
      const next = markerHits.slice(i + 1).find(h => h.found && h.startOffset > hit.startOffset);
      const sliceStart = hit.found ? hit.startOffset : null;
      const sliceEnd = next ? next.startOffset : effectiveEnd;

      let text = '';
      if (sliceStart != null && sliceEnd > sliceStart) {
        // Slice aus dem croppedText (nicht rawText, da wir den nicht haben)
        const localStart = sliceStart - startOffset;
        const localEnd = sliceEnd - startOffset;
        text = croppedText.substring(localStart, localEnd);
        text = removeFrameLines(text, frameLines);
        text = text.trim();
      }

      return {
        id: `clause_v2_${i + 1}`, index: i,
        number: hit.number, title: hit.title, text,
        startMarker: hit.startMarker, startMarkerFound: hit.found,
        startOffset: hit.found ? hit.startOffset : null,
        charLength: text.length
      };
    });

    // Coverage-Tracking
    const totalClauseChars = clauses.reduce((sum, c) => sum + c.charLength, 0);
    const coverage = croppedText.length > 0 ? totalClauseChars / croppedText.length : 0;

    const elapsedMs = Date.now() - startTime;
    const verifiedMarkers = clauses.filter(c => c.startMarkerFound).length;

    console.log(
      `[GuidedSegmenter] ${clauses.length} Klauseln in ${elapsedMs}ms — ` +
      `${verifiedMarkers}/${clauses.length} Marker, Coverage ${(coverage * 100).toFixed(1)}%`
    );

    return {
      clauses,
      metadata: {
        model: MODEL, elapsedMs,
        inputCharsTotal: rawTextLength || croppedText.length,
        inputCharsSent: croppedText.length,
        cropped: startOffset > 0, contentStartOffset: startOffset,
        actualSegmentCount: clauses.length, markersVerified: verifiedMarkers,
        coverage, batchCount,
        promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens
      }
    };
  }

  /**
   * Einzelner GPT-Segmentierungs-Call (ohne Batching).
   * @private
   */
  async _singleSegmentCall(text, context, timeoutMs) {
    const response = await this.openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `STRUKTUR-KONTEXT:\n${JSON.stringify(context, null, 2)}\n\n` +
            `---BEGIN VERTRAGSTEXT---\n${text}\n---END VERTRAGSTEXT---\n\n` +
            `Finde JEDE Klausel in diesem Text. Es gibt keine Ziel-Anzahl — extrahiere so viele oder wenige, wie tatsaechlich vorhanden sind.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: MAX_COMPLETION_TOKENS
    }, { timeout: timeoutMs });

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error('guidedSegmenter: Leere Antwort');

    const parsed = JSON.parse(rawContent);
    return {
      clauses: Array.isArray(parsed.clauses) ? parsed.clauses : [],
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0
    };
  }

  /**
   * Batched Segmentierung fuer lange Texte.
   * Splittet in ueberlappende Fenster, dedupliziert Ergebnisse.
   * @private
   */
  async _segmentBatched(text, context, timeoutMs) {
    const WINDOW_SIZE = 80000;
    const OVERLAP = 5000;

    const windows = [];
    let pos = 0;
    while (pos < text.length) {
      const end = Math.min(pos + WINDOW_SIZE, text.length);
      windows.push({ text: text.substring(pos, end), offset: pos });
      if (end >= text.length) break;
      pos = end - OVERLAP;
    }

    console.log(`[GuidedSegmenter] Batching: ${windows.length} Fenster`);

    let allClauses = [];
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    for (let i = 0; i < windows.length; i++) {
      const win = windows[i];
      console.log(`[GuidedSegmenter] Batch ${i + 1}/${windows.length}: ${win.text.length} chars ab Offset ${win.offset}`);
      try {
        const result = await this._singleSegmentCall(win.text, context, timeoutMs);
        // Offset der Marker anpassen (relativ zum Fenster -> relativ zum Gesamttext)
        for (const c of result.clauses) {
          c._windowOffset = win.offset;
        }
        allClauses.push(...result.clauses);
        totalPromptTokens += result.promptTokens;
        totalCompletionTokens += result.completionTokens;
      } catch (err) {
        console.error(`[GuidedSegmenter] Batch ${i + 1} fehlgeschlagen:`, err.message);
      }
    }

    // Deduplizieren: Klauseln mit gleichem Marker an aehnlicher Position zusammenfuehren
    allClauses = this._deduplicateBatchedClauses(allClauses, text);

    return {
      clauses: allClauses,
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      batchCount: windows.length
    };
  }

  /**
   * Dedupliziert Klauseln aus mehreren Batch-Fenstern.
   * Verwendet Marker-Positionen im Gesamttext als Schluessel.
   * @private
   */
  _deduplicateBatchedClauses(clauses, fullText) {
    const normalizedIndex = buildNormalizedIndex(fullText);
    const seen = new Map(); // offset -> clause

    for (const c of clauses) {
      if (!c.startMarker) continue;
      const pos = findFuzzy(fullText, c.startMarker, normalizedIndex);
      if (pos < 0) continue;

      // Nur behalten, wenn nicht schon eine Klausel an aehnlicher Position existiert
      let isDuplicate = false;
      for (const [existingPos] of seen) {
        if (Math.abs(existingPos - pos) < 200) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        seen.set(pos, c);
      }
    }

    // Nach Position sortieren
    return Array.from(seen.entries())
      .sort(([a], [b]) => a - b)
      .map(([, clause]) => clause);
  }

  /**
   * Segmentiert den Vertragstext in Klauseln.
   * (Original-Methode fuer den bestehenden 3-Pass-Parser)
   *
   * @param {string} rawText - Der volle Vertragstext (wie ihn auch Pass 1 bekam)
   * @param {object} discoveryResult - Das Ergebnis von structuralDiscovery.discover()
   * @param {object} options - { timeoutMs = 90000 }
   * @returns {Promise<object>} - { clauses, metadata }
   */
  async segment(rawText, discoveryResult, options = {}) {
    const { timeoutMs = 90000 } = options;
    const startTime = Date.now();

    if (!rawText || typeof rawText !== 'string') {
      throw new Error('guidedSegmenter: rawText muss ein String sein');
    }
    if (!discoveryResult?.discovery) {
      throw new Error('guidedSegmenter: discoveryResult fehlt oder ist ungültig');
    }

    const discovery = discoveryResult.discovery;

    // 1. Text auf den Content-Bereich zuschneiden
    const { croppedText, startOffset, cropped } = cropToContentRange(rawText, discovery);

    // 2. Wenn der zugeschnittene Text zu lang ist, müssen wir (später) batchen.
    //    Für Pass 2 v1 werfen wir einen klaren Fehler und dokumentieren das.
    if (croppedText.length > MAX_INPUT_CHARS) {
      throw new Error(
        `guidedSegmenter: Text zu lang (${croppedText.length} > ${MAX_INPUT_CHARS}). ` +
        `Batching ist noch nicht implementiert — wird in Pass 2 v2 ergänzt.`
      );
    }

    console.log(
      `[GuidedSegmenter] Starte Segmentierung — ${croppedText.length} Zeichen` +
      `${cropped ? ` (zugeschnitten von ${rawText.length}, Offset ${startOffset})` : ''}, ` +
      `erwartet ${discovery.segmentation?.estimatedSegmentCount ?? '?'} Abschnitte`
    );

    // 3. Kontext-Objekt für das Modell bauen — das ist der Kern des
    //    "Guided"-Ansatzes: GPT bekommt die Struktur-Info vor dem Text.
    const context = {
      documentType: discovery.documentType,
      language: discovery.language,
      segmentation: {
        scheme: discovery.segmentation?.scheme,
        estimatedSegmentCount: discovery.segmentation?.estimatedSegmentCount,
        exampleMarkers: discovery.segmentation?.exampleMarkers,
        hasNestedStructure: discovery.segmentation?.hasNestedStructure
      },
      frameElements: {
        repeatingPageHeaders: discovery.frameElements?.repeatingPageHeaders || []
      }
    };

    // 4. GPT-Call
    let response;
    try {
      response = await this.openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              `STRUKTUR-KONTEXT:\n${JSON.stringify(context, null, 2)}\n\n` +
              `---BEGIN VERTRAGSTEXT---\n${croppedText}\n---END VERTRAGSTEXT---\n\n` +
              `Zerlege den Vertragstext in seine Abschnitte und antworte ausschließlich mit dem geforderten JSON-Objekt.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: MAX_COMPLETION_TOKENS
      }, { timeout: timeoutMs });
    } catch (err) {
      console.error('[GuidedSegmenter] OpenAI-Call fehlgeschlagen:', err.message);
      throw new Error(`guidedSegmenter: OpenAI-Call fehlgeschlagen — ${err.message}`);
    }

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('guidedSegmenter: Leere Antwort vom Modell');
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('[GuidedSegmenter] JSON-Parse fehlgeschlagen. Rohinhalt (erste 500 Zeichen):', rawContent.substring(0, 500));
      throw new Error(`guidedSegmenter: JSON-Parse fehlgeschlagen — ${parseErr.message}`);
    }

    const clausesRaw = Array.isArray(parsed.clauses) ? parsed.clauses : [];
    if (clausesRaw.length === 0) {
      // Kein Fehler — kann bei Nicht-Verträgen (Rechnungen, Formulare) vorkommen.
      console.log('[GuidedSegmenter] Modell hat keine Klauseln zurückgegeben (Dokument enthält vermutlich keine Vertragsklauseln)');
      return {
        clauses: [],
        metadata: {
          model: MODEL,
          elapsedMs: Date.now() - startTime,
          inputCharsTotal: rawText.length,
          inputCharsSent: croppedText.length,
          cropped,
          contentStartOffset: startOffset,
          expectedSegmentCount: discovery.segmentation?.estimatedSegmentCount ?? null,
          actualSegmentCount: 0,
          markersVerified: 0,
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0
        }
      };
    }

    // 5. Post-Processing: Marker im zugeschnittenen Text lokalisieren (GPT sieht
    //    nur croppedText!), dann startOffset addieren um absolute Positionen im
    //    Rohtext zu erhalten.
    const normalizedIndex = buildNormalizedIndex(croppedText);
    const frameLines = discovery.frameElements?.repeatingPageHeaders || [];

    // Erste Runde: Marker-Positionen finden (im croppedText, dann Offset addieren)
    const markerHits = clausesRaw.map((c, idx) => {
      const startMarkerStr = typeof c.startMarker === 'string' ? c.startMarker : null;
      const posInCropped = startMarkerStr ? findFuzzy(croppedText, startMarkerStr, normalizedIndex) : -1;
      const startOffsetAbs = posInCropped >= 0 ? posInCropped + startOffset : -1;
      return {
        idx,
        number: c.number ?? null,
        title: c.title ?? null,
        startMarker: startMarkerStr,
        startOffset: startOffsetAbs,
        found: startOffsetAbs >= 0
      };
    });

    // Wenn Reihenfolge im Rohtext stimmt (sollte), ist das Ende jeder
    // Klausel der Beginn der nächsten. Für die letzte nehmen wir das
    // contentEnd oder das Text-Ende.
    const contentEndMarker = discovery.contentEnd?.marker;
    const contentEndInCropped = contentEndMarker
      ? findFuzzy(croppedText, contentEndMarker, normalizedIndex)
      : -1;
    const contentEndOffset = contentEndInCropped >= 0 ? contentEndInCropped + startOffset : -1;
    const effectiveEnd = contentEndOffset > 0 ? contentEndOffset : rawText.length;

    const clauses = markerHits.map((hit, i) => {
      const next = markerHits.slice(i + 1).find(h => h.found && h.startOffset > hit.startOffset);
      const sliceStart = hit.found ? hit.startOffset : null;
      const sliceEnd = next ? next.startOffset : effectiveEnd;

      let text = '';
      if (sliceStart != null && sliceEnd > sliceStart) {
        text = rawText.substring(sliceStart, sliceEnd);
        text = removeFrameLines(text, frameLines);
        text = text.trim();
      }

      return {
        id: `clause_v2_${i + 1}`,
        index: i,
        number: hit.number,
        title: hit.title,
        text,
        startMarker: hit.startMarker,
        startMarkerFound: hit.found,
        startOffset: hit.found ? hit.startOffset : null,
        charLength: text.length
      };
    });

    const elapsedMs = Date.now() - startTime;
    const verifiedMarkers = clauses.filter(c => c.startMarkerFound).length;
    const emptyClauses = clauses.filter(c => c.charLength === 0).length;

    console.log(
      `[GuidedSegmenter] ${clauses.length} Klauseln extrahiert in ${elapsedMs}ms — ` +
      `${verifiedMarkers}/${clauses.length} Marker verifiziert, ${emptyClauses} leere Klauseln`
    );

    return {
      clauses,
      metadata: {
        model: MODEL,
        elapsedMs,
        inputCharsTotal: rawText.length,
        inputCharsSent: croppedText.length,
        cropped,
        contentStartOffset: startOffset,
        expectedSegmentCount: discovery.segmentation?.estimatedSegmentCount ?? null,
        actualSegmentCount: clauses.length,
        markersVerified: verifiedMarkers,
        promptTokens: response.usage?.prompt_tokens ?? null,
        completionTokens: response.usage?.completion_tokens ?? null
      }
    };
  }
}

module.exports = {
  GuidedSegmenter,
  guidedSegmenter: new GuidedSegmenter(),
  _internal: { cropToContentRange, findFuzzy, buildNormalizedIndex, normalizeForMatch, SYSTEM_PROMPT, MODEL }
};

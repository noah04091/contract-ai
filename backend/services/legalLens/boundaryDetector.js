/**
 * Legal Lens - Boundary Detector (Pass 1)
 *
 * Fokussierte Inhaltsgrenzen-Erkennung: Findet NUR wo der echte
 * Vertragsinhalt beginnt und endet. Kein Dokumenttyp, keine
 * Gliederungsanalyse, keine Segment-Zaehlung.
 *
 * Strategie: GPT zitiert die ersten ~80 Zeichen der ERSTEN echten
 * Klausel und die letzten ~80 Zeichen der LETZTEN echten Klausel.
 * Keine charOffsets (GPT kann nicht zuverlaessig zaehlen).
 * findFuzzyNearest() lokalisiert die Marker im Rohtext.
 *
 * Fallback: Wenn Marker nicht gefunden -> voller Text.
 * Selbstpruefung: Wenn Ergebnis < 20% des Textes -> verdaechtig -> Fallback.
 *
 * Kosten: 1 GPT-4o Call, ~300 Completion Tokens
 *
 * @version 1.0.0
 */

const OpenAI = require('openai');
const { normalizeForMatch, buildNormalizedIndex, findFuzzyNearest } = require('./textMatching');

const MODEL = 'gpt-4o';
const MAX_INPUT_CHARS = 80000;
const HEAD_CHARS = 60000;
const TAIL_CHARS = 20000;

const SYSTEM_PROMPT = `Du bist ein Experte fuer Vertragsdokumente. Deine EINZIGE Aufgabe: Finde die Grenzen des echten Vertragsinhalts.

Ein Vertragsdokument hat oft Rahmen-Material DAVOR und DANACH:
- DAVOR: Briefkopf, Absender/Empfaenger-Adressen, Kontaktdaten, Datum, Betreff, Anrede ("Sehr geehrte..."), einleitende Saetze ("anbei erhalten Sie...")
- DANACH: Unterschriftenblock (Ort, Datum, Unterschriftszeilen), Anhaenge/Anlagen, Anlagenverzeichnisse, Firmenangaben (Geschaeftsfuehrer, Registergericht, USt-IdNr., Bankverbindung), Fusszeilen

Dein Job: Identifiziere die ERSTE echte Vertragsklausel und die LETZTE echte Vertragsklausel.

Antworte NUR mit diesem JSON:

{
  "startMarker": "Woertliches Zitat der ersten ~80 Zeichen der ERSTEN echten Vertragsklausel. Diese Klausel ist typischerweise nummeriert oder betitelt (z.B. '§ 1', 'Artikel 1', '1. Vertragsgegenstand', 'Praeambel'). Das Zitat muss WOERTLICH im Text stehen.",
  "endMarker": "Woertliches Zitat der letzten ~80 Zeichen der LETZTEN echten Vertragsklausel. NICHT Unterschriften, Firmeninfos oder Anhaenge.",
  "startReasoning": "Ein Satz: Warum beginnt hier der Vertragsinhalt?",
  "endReasoning": "Ein Satz: Warum endet hier der Vertragsinhalt?",
  "frameInfo": {
    "hasCoverBlock": true/false,
    "hasSignatureBlock": true/false,
    "repeatingPageHeaders": ["Array von sich wiederholenden Kopf-/Fusszeilen, die gefiltert werden sollten"]
  }
}

REGELN:
1. Zitiere WOERTLICH aus dem Originaltext. Keine Umformulierung, keine Whitespace-Normalisierung.
2. Gib KEINE charOffsets an — nur Marker-Zitate.
3. Wenn das Dokument direkt mit der ersten Klausel beginnt (kein Rahmen davor), zitiere trotzdem den Anfang.
4. Wenn du unsicher bist, zitiere lieber zu viel als zu wenig — besser ein paar Zeilen Rahmen mit drin als eine Klausel abgeschnitten.
5. Antworte NUR mit dem JSON-Objekt.`;

/**
 * Bereitet den Text fuer den Boundary-Detection-Call vor.
 */
function prepareText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('boundaryDetector: rawText muss ein String sein');
  }

  if (rawText.length <= MAX_INPUT_CHARS) {
    return { text: rawText, truncated: false, originalLength: rawText.length };
  }

  const head = rawText.substring(0, HEAD_CHARS);
  const tail = rawText.substring(rawText.length - TAIL_CHARS);
  const elidedChars = rawText.length - HEAD_CHARS - TAIL_CHARS;

  return {
    text: `${head}\n\n[... ${elidedChars} Zeichen aus der Mitte ausgelassen ...]\n\n${tail}`,
    truncated: true,
    originalLength: rawText.length,
    elidedChars
  };
}

class BoundaryDetector {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('boundaryDetector: OPENAI_API_KEY fehlt');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Erkennt die Inhaltsgrenzen eines Vertragsdokuments.
   *
   * @param {string} rawText - Der volle Vertragstext
   * @param {object} [options]
   * @param {number} [options.timeoutMs=60000]
   * @returns {Promise<object>} { croppedText, startOffset, endOffset, frameInfo, metadata }
   */
  async detect(rawText, options = {}) {
    const { timeoutMs = 60000 } = options;
    const startTime = Date.now();

    const { text, truncated, originalLength } = prepareText(rawText);

    console.log(`[BoundaryDetector] Starte — ${originalLength} Zeichen${truncated ? ' (gekuerzt)' : ''}`);

    let response;
    try {
      response = await this.openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Hier ist ein Vertragsdokument. Finde die Grenzen des echten Vertragsinhalts.\n\n---BEGIN DOKUMENT---\n${text}\n---END DOKUMENT---`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 800
      }, { timeout: timeoutMs });
    } catch (err) {
      console.error('[BoundaryDetector] OpenAI-Call fehlgeschlagen:', err.message);
      // Fallback: voller Text
      return this._fallback(rawText, `OpenAI-Fehler: ${err.message}`, startTime);
    }

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) {
      return this._fallback(rawText, 'Leere Antwort vom Modell', startTime);
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('[BoundaryDetector] JSON-Parse fehlgeschlagen:', rawContent.substring(0, 300));
      return this._fallback(rawText, `JSON-Parse: ${parseErr.message}`, startTime);
    }

    // Marker im Rohtext finden
    const normalizedIndex = buildNormalizedIndex(rawText);

    let startOffset = 0;
    let endOffset = rawText.length;
    let startFound = false;
    let endFound = false;

    if (parsed.startMarker) {
      const pos = findFuzzyNearest(rawText, parsed.startMarker, 0, normalizedIndex);
      if (pos >= 0) {
        startOffset = pos;
        startFound = true;
      }
    }

    if (parsed.endMarker) {
      const pos = findFuzzyNearest(rawText, parsed.endMarker, rawText.length, normalizedIndex);
      if (pos >= 0) {
        // endOffset = Ende des Markers, nicht Anfang
        endOffset = pos + parsed.endMarker.length;
        // Sicherheit: Wenn endMarker fuzzy gefunden, etwas Puffer geben
        endOffset = Math.min(rawText.length, endOffset + 50);
        endFound = true;
      }
    }

    // Selbstpruefung: Wenn Ergebnis < 20% des Textes -> verdaechtig
    const croppedLength = endOffset - startOffset;
    if (croppedLength < rawText.length * 0.20) {
      console.warn(
        `[BoundaryDetector] Verdaechtig kurzes Ergebnis: ${croppedLength} von ${rawText.length} ` +
        `(${(croppedLength / rawText.length * 100).toFixed(1)}%) — Fallback auf vollen Text`
      );
      return this._fallback(rawText, 'Ergebnis < 20% des Textes', startTime);
    }

    const elapsedMs = Date.now() - startTime;
    const croppedText = rawText.substring(startOffset, endOffset);

    console.log(
      `[BoundaryDetector] Fertig in ${elapsedMs}ms — ` +
      `${startOffset}..${endOffset} (${croppedLength} von ${rawText.length} chars, ` +
      `${(croppedLength / rawText.length * 100).toFixed(1)}%)`
    );

    return {
      croppedText,
      startOffset,
      endOffset,
      startFound,
      endFound,
      frameInfo: parsed.frameInfo || { hasCoverBlock: false, hasSignatureBlock: false, repeatingPageHeaders: [] },
      metadata: {
        model: MODEL,
        elapsedMs,
        inputLength: rawText.length,
        croppedLength,
        coverageRatio: croppedLength / rawText.length,
        truncatedInput: truncated,
        fallback: false,
        promptTokens: response.usage?.prompt_tokens ?? null,
        completionTokens: response.usage?.completion_tokens ?? null
      }
    };
  }

  /**
   * Fallback: Gibt den vollen Text zurueck, wenn Boundary Detection fehlschlaegt.
   */
  _fallback(rawText, reason, startTime) {
    console.warn(`[BoundaryDetector] Fallback auf vollen Text — Grund: ${reason}`);
    return {
      croppedText: rawText,
      startOffset: 0,
      endOffset: rawText.length,
      startFound: false,
      endFound: false,
      frameInfo: { hasCoverBlock: false, hasSignatureBlock: false, repeatingPageHeaders: [] },
      metadata: {
        model: MODEL,
        elapsedMs: Date.now() - startTime,
        inputLength: rawText.length,
        croppedLength: rawText.length,
        coverageRatio: 1.0,
        truncatedInput: false,
        fallback: true,
        fallbackReason: reason,
        promptTokens: null,
        completionTokens: null
      }
    };
  }
}

module.exports = {
  BoundaryDetector,
  boundaryDetector: new BoundaryDetector()
};

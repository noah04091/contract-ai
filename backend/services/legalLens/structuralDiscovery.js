/**
 * Legal Lens - Structural Discovery Service
 *
 * Macht einen EINZIGEN GPT-Call, der die Struktur eines Vertragsdokuments
 * rein semantisch erkennt — OHNE Regex, OHNE hardcodierte Regeln, OHNE
 * Annahmen über Nummerierungs-Schemata oder Keywords.
 *
 * Ziel: Das Modell beschreibt, wie DIESES konkrete Dokument aufgebaut ist,
 * sodass nachgelagerte Schritte informiert statt blind arbeiten können.
 *
 * @version 1.0.0 — Experiment (Phase 1 von 3)
 */

const OpenAI = require('openai');

const MODEL = 'gpt-4o';
const MAX_INPUT_CHARS = 80000;   // ~20k tokens — sicher unter 128k context
const HEAD_CHARS = 60000;        // Wenn zu lang: Anfang behalten
const TAIL_CHARS = 20000;        // + Ende behalten (Unterschriften, Anhänge)

/**
 * Normalisiert einen String für fuzzy matching: Collapse aller
 * Whitespace-Sequenzen zu einem einzelnen Space, trim. Das ist
 * notwendig, weil pdf-parse oft Mehrfach-Spaces einfügt, während
 * GPT beim Zitieren üblicherweise nur einzelne Spaces benutzt.
 */
function normalizeForMatch(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Baut aus dem Rohtext eine normalisierte Version und ein
 * Index-Mapping: für jede Zeichenposition im normalisierten String
 * kennen wir die entsprechende Position im Originaltext.
 * So können wir fuzzy suchen und trotzdem korrekte Original-Offsets
 * zurückgeben.
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
 * Bereitet den Text für den Discovery-Call vor.
 * Für sehr lange Dokumente: Anfang + Ende, mittlerer Teil wird elidiert.
 * Das Modell sieht damit immer Kopf UND Fuß des Dokuments.
 */
function prepareTextForDiscovery(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('structuralDiscovery: rawText muss ein String sein');
  }

  if (rawText.length <= MAX_INPUT_CHARS) {
    return { text: rawText, truncated: false, originalLength: rawText.length };
  }

  const head = rawText.substring(0, HEAD_CHARS);
  const tail = rawText.substring(rawText.length - TAIL_CHARS);
  const elidedChars = rawText.length - HEAD_CHARS - TAIL_CHARS;

  const text = `${head}\n\n[... ${elidedChars} Zeichen aus der Mitte ausgelassen ...]\n\n${tail}`;

  return {
    text,
    truncated: true,
    originalLength: rawText.length,
    elidedChars
  };
}

/**
 * Der Discovery-Prompt — der Kern dieses Ansatzes.
 *
 * WICHTIG: Dieser Prompt nennt KEINE konkreten Nummerierungs-Schemata
 * (§, Artikel, Ziffer, Section, ...). Das Modell soll rein semantisch
 * erkennen, wie DIESES Dokument aufgebaut ist. Jede Nennung eines
 * konkreten Schemas würde das Modell in Richtung deutscher Verträge
 * biasen und den universellen Anspruch brechen.
 */
const SYSTEM_PROMPT = `Du bist ein Experte für Dokumentstruktur-Analyse. Deine einzige Aufgabe ist es, zu beschreiben, wie ein beliebiges Vertragsdokument strukturell aufgebaut ist.

DU MACHST KEINE ANNAHMEN darüber, in welcher Sprache das Dokument ist, welche Nummerierung es benutzt oder wie Abschnitte benannt sind. Du liest den gegebenen Text und beschreibst rein faktisch, was du siehst.

Dein Output ist IMMER ein einzelnes JSON-Objekt mit genau diesen Feldern:

{
  "documentType": "Kurze Beschreibung des Vertragstyps, soweit erkennbar (z.B. 'Mietvertrag Gewerbe', 'Non-Disclosure Agreement', 'Leasingvertrag Maschinen'). null wenn unklar.",
  "language": "ISO-639-1 Code der Hauptsprache (de, en, fr, ...). Falls mehrsprachig: primäre Sprache.",

  "contentStart": {
    "charOffset": "Integer — Zeichenposition, an der der eigentliche Vertragsinhalt beginnt (nach Briefkopf, Parteien-Adressen, Titel, Präambel etc.). 0 wenn der Vertrag sofort beginnt.",
    "marker": "Wörtliches Zitat der ersten ~80 Zeichen des eigentlichen Inhalts, damit dieser Punkt später im Originaltext wiedergefunden werden kann.",
    "reasoning": "Ein Satz: Warum beginnt hier der inhaltliche Vertragsteil?"
  },

  "contentEnd": {
    "charOffset": "Integer — Zeichenposition, an der der eigentliche Vertragsinhalt endet (vor Unterschriftenblock, Anhängen, Anlagenverzeichnis).",
    "marker": "Wörtliches Zitat der letzten ~80 Zeichen des eigentlichen Inhalts.",
    "reasoning": "Ein Satz: Warum endet hier der inhaltliche Vertragsteil?"
  },

  "segmentation": {
    "scheme": "Wie wird das Dokument in Abschnitte gegliedert? Beschreibe es in eigenen Worten, ohne technische Begriffe zu erfinden. Beispiele: 'Nummerierte Paragraphen mit Titelzeilen', 'Durchgehender Fließtext ohne sichtbare Gliederung', 'Arabisch nummerierte Abschnitte mit Unterpunkten in Klammern', 'Römisch nummerierte Hauptabschnitte, darunter nummerierte Unterabschnitte'.",
    "estimatedSegmentCount": "Integer — Grobe Schätzung, wie viele inhaltliche Top-Level-Abschnitte das Dokument hat.",
    "exampleMarkers": "Array von 3-5 wörtlichen Zitaten, die den Beginn von Abschnitten markieren (z.B. die ersten ~30 Zeichen jedes Abschnitts). Diese Zitate müssen WÖRTLICH im Text auftauchen.",
    "hasNestedStructure": "Boolean — gibt es Unterabschnitte innerhalb der Hauptabschnitte?",
    "notes": "Ein Satz zu Besonderheiten dieser Gliederung, falls relevant."
  },

  "frameElements": {
    "repeatingPageHeaders": "Array von Strings — Zeilen, die sich durch das Dokument wiederholen (Seitenköpfe, Seitenfüße, Wasserzeichen). Leer, wenn keine erkennbar.",
    "coverBlock": "String oder null — der Kopfblock des Dokuments (Briefkopf, Absender, Empfänger, Datum), bevor der Vertragstitel beginnt.",
    "signatureBlock": "String oder null — der Bereich am Ende mit Unterschriften, Orten, Daten.",
    "annexes": "Array — Anhänge/Anlagen, die nicht zum Hauptvertrag gehören. Leer, wenn keine."
  },

  "overallConfidence": "Float zwischen 0 und 1 — wie sicher bist du dir bei dieser Strukturanalyse?",
  "risks": "Array von Strings — was könnte bei der späteren Segmentierung schiefgehen? (z.B. 'Abschnittsnummern wiederholen sich', 'Keine klaren Abschnittstrennungen', 'Gemischte Nummerierungsschemata')."
}

REGELN:
1. Du erfindest NICHTS. Alle "marker" und "exampleMarkers" müssen WÖRTLICH im gegebenen Text vorkommen.
2. Du gibst charOffsets als Integer an (Zeichenposition, 0-basiert).
3. Du beschreibst, was du siehst — nicht was du erwartest.
4. Wenn ein Feld nicht bestimmbar ist, gib null zurück statt zu raten.
5. Du antwortest NUR mit dem JSON-Objekt, ohne weitere Erklärungen.`;

class StructuralDiscovery {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('structuralDiscovery: OPENAI_API_KEY fehlt in Environment');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Führt die Structural Discovery für einen Vertragstext durch.
   *
   * @param {string} rawText - Der unveränderte Vertragstext (direkt aus pdf-parse o.ä.)
   * @param {object} options - { timeoutMs = 60000 }
   * @returns {Promise<object>} - Discovery-Ergebnis + Metadata
   */
  async discover(rawText, options = {}) {
    const { timeoutMs = 60000 } = options;
    const startTime = Date.now();

    const { text, truncated, originalLength, elidedChars } = prepareTextForDiscovery(rawText);

    console.log(`[StructuralDiscovery] Starte Discovery — ${originalLength} Zeichen${truncated ? ` (gekürzt auf ${text.length})` : ''}`);

    let response;
    try {
      response = await this.openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Hier ist der rohe Text eines Vertragsdokuments${truncated ? ` (verkürzte Fassung — die ursprüngliche Länge beträgt ${originalLength} Zeichen)` : ''}. Analysiere die Struktur dieses Dokuments und antworte ausschließlich mit dem geforderten JSON-Objekt.\n\n---BEGIN DOKUMENT---\n${text}\n---END DOKUMENT---`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000
      }, { timeout: timeoutMs });
    } catch (err) {
      console.error('[StructuralDiscovery] OpenAI-Call fehlgeschlagen:', err.message);
      throw new Error(`structuralDiscovery: OpenAI-Call fehlgeschlagen — ${err.message}`);
    }

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('structuralDiscovery: Leere Antwort vom Modell');
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('[StructuralDiscovery] JSON-Parse fehlgeschlagen. Rohinhalt (erste 500 Zeichen):', rawContent.substring(0, 500));
      throw new Error(`structuralDiscovery: JSON-Parse fehlgeschlagen — ${parseErr.message}`);
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`[StructuralDiscovery] Discovery abgeschlossen in ${elapsedMs}ms — confidence=${parsed.overallConfidence}`);

    return {
      discovery: parsed,
      metadata: {
        model: MODEL,
        elapsedMs,
        inputCharsTotal: originalLength,
        inputCharsSent: text.length,
        truncated,
        elidedChars: truncated ? elidedChars : 0,
        promptTokens: response.usage?.prompt_tokens ?? null,
        completionTokens: response.usage?.completion_tokens ?? null
      }
    };
  }

  /**
   * Verifiziert, ob die vom Modell gelieferten Marker tatsächlich im
   * Originaltext vorkommen. Nutzt whitespace-normalisiertes Matching,
   * weil GPT beim Zitieren oft Mehrfach-Whitespaces zu einem einzelnen
   * Space zusammenzieht — eine reine indexOf-Suche würde das als
   * Halluzination werten, obwohl die Stelle objektiv existiert.
   *
   * Die Strategie: Baue zwei parallele Arrays — den Rohtext und eine
   * normalisierte Version, sowie eine Mapping-Tabelle Normalized-Index →
   * Original-Index. So können wir in der normalisierten Version suchen
   * und trotzdem den echten Offset im Originaltext zurückgeben.
   */
  verifyMarkers(rawText, discoveryResult) {
    const checks = {
      contentStartMarker: null,
      contentEndMarker: null,
      exampleMarkers: []
    };

    const d = discoveryResult?.discovery;
    if (!d) return checks;

    const { normalized, indexMap } = buildNormalizedIndex(rawText);

    const findFuzzy = (marker) => {
      if (!marker || typeof marker !== 'string') return -1;
      const normalizedMarker = normalizeForMatch(marker);
      if (!normalizedMarker) return -1;
      const hit = normalized.indexOf(normalizedMarker);
      if (hit < 0) return -1;
      // Map zurück auf den Original-Offset
      return indexMap[hit] ?? -1;
    };

    if (d.contentStart?.marker) {
      checks.contentStartMarker = {
        text: d.contentStart.marker,
        foundAt: findFuzzy(d.contentStart.marker),
        claimedOffset: d.contentStart.charOffset
      };
    }

    if (d.contentEnd?.marker) {
      checks.contentEndMarker = {
        text: d.contentEnd.marker,
        foundAt: findFuzzy(d.contentEnd.marker),
        claimedOffset: d.contentEnd.charOffset
      };
    }

    if (Array.isArray(d.segmentation?.exampleMarkers)) {
      checks.exampleMarkers = d.segmentation.exampleMarkers.map(marker => ({
        text: marker,
        foundAt: findFuzzy(marker)
      }));
    }

    return checks;
  }
}

module.exports = {
  StructuralDiscovery,
  structuralDiscovery: new StructuralDiscovery(),
  // für Tests:
  _internal: { prepareTextForDiscovery, SYSTEM_PROMPT, MODEL, MAX_INPUT_CHARS }
};

/**
 * Legal Lens - Structure Analyzer (Pass 2)
 *
 * Analysiert die Gliederung eines bereits zugeschnittenen Vertragstexts.
 * Input: Zugeschnittener Text aus Pass 1 (ohne Briefkopf/Anhaenge).
 *
 * Gibt zurueck: scheme, exampleMarkers, hasNestedStructure, language,
 * documentType, repeatingPageHeaders.
 *
 * WICHTIG: Fragt NICHT nach estimatedSegmentCount — kein Ziel-Anzahl-Bias.
 *
 * Kosten: 1 GPT-4o Call, ~500 Completion Tokens
 *
 * @version 1.0.0
 */

const OpenAI = require('openai');

const MODEL = 'gpt-4o';

const SYSTEM_PROMPT = `Du bist ein Experte fuer Dokumentstruktur-Analyse. Deine Aufgabe: Beschreibe die Gliederung eines Vertragstexts.

Du bekommst einen Vertragstext, der bereits auf den inhaltlichen Teil zugeschnitten ist (kein Briefkopf, keine Unterschriften). Analysiere, wie dieser Text gegliedert ist.

Antworte NUR mit diesem JSON:

{
  "documentType": "Kurze Beschreibung des Vertragstyps (z.B. 'Mietvertrag Gewerbe', 'NDA', 'AGB'). null wenn unklar.",
  "language": "ISO-639-1 Code der Hauptsprache (de, en, fr, ...)",
  "scheme": "Beschreibe die Gliederung in eigenen Worten. Beispiele: 'Nummerierte Paragraphen mit Titelzeilen', 'Arabisch nummerierte Abschnitte mit Unterpunkten', 'Fliesstext ohne sichtbare Gliederung'.",
  "exampleMarkers": ["5 woertliche Zitate, die den Beginn von Abschnitten markieren (erste ~30-50 Zeichen jedes Abschnitts). Muessen WOERTLICH im Text vorkommen."],
  "hasNestedStructure": false,
  "repeatingPageHeaders": ["Zeilen, die sich wiederholen (Seitenkoepfe, -fuesse). Leer wenn keine."],
  "notes": "Besonderheiten dieser Gliederung, falls relevant. null wenn nichts."
}

REGELN:
1. Alle Zitate (exampleMarkers, repeatingPageHeaders) muessen WOERTLICH im gegebenen Text vorkommen.
2. Beschreibe, was du siehst — nicht was du erwartest.
3. Gib KEINE geschaetzte Abschnitts-Anzahl an. Das ist Absicht — wir wollen keinen Bias.
4. exampleMarkers: Waehle 5 repraesentative Marker aus verschiedenen Stellen des Dokuments (Anfang, Mitte, Ende).
5. Wenn ein Feld nicht bestimmbar ist, gib null zurueck.
6. Antworte NUR mit dem JSON-Objekt.`;

class StructureAnalyzer {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('structureAnalyzer: OPENAI_API_KEY fehlt');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Analysiert die Gliederungsstruktur eines zugeschnittenen Vertragstexts.
   *
   * @param {string} croppedText - Bereits zugeschnittener Text (aus Pass 1)
   * @param {object} [options]
   * @param {number} [options.timeoutMs=60000]
   * @returns {Promise<object>} { structure, metadata }
   */
  async analyze(croppedText, options = {}) {
    const { timeoutMs = 60000 } = options;
    const startTime = Date.now();

    if (!croppedText || typeof croppedText !== 'string') {
      throw new Error('structureAnalyzer: croppedText muss ein String sein');
    }

    // Fuer den Structure-Call: maximal 80K chars senden
    const MAX_CHARS = 80000;
    let textToSend = croppedText;
    let truncated = false;
    if (croppedText.length > MAX_CHARS) {
      // Anfang + Ende, Mitte elidieren
      const head = croppedText.substring(0, 60000);
      const tail = croppedText.substring(croppedText.length - 20000);
      const elided = croppedText.length - 80000;
      textToSend = `${head}\n\n[... ${elided} Zeichen aus der Mitte ausgelassen ...]\n\n${tail}`;
      truncated = true;
    }

    console.log(`[StructureAnalyzer] Starte — ${croppedText.length} Zeichen${truncated ? ' (gekuerzt)' : ''}`);

    let response;
    try {
      response = await this.openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analysiere die Gliederung dieses Vertragstexts:\n\n---BEGIN TEXT---\n${textToSend}\n---END TEXT---`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1000
      }, { timeout: timeoutMs });
    } catch (err) {
      console.error('[StructureAnalyzer] OpenAI-Call fehlgeschlagen:', err.message);
      throw new Error(`structureAnalyzer: OpenAI-Call fehlgeschlagen — ${err.message}`);
    }

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('structureAnalyzer: Leere Antwort vom Modell');
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('[StructureAnalyzer] JSON-Parse fehlgeschlagen:', rawContent.substring(0, 300));
      throw new Error(`structureAnalyzer: JSON-Parse fehlgeschlagen — ${parseErr.message}`);
    }

    const elapsedMs = Date.now() - startTime;
    console.log(
      `[StructureAnalyzer] Fertig in ${elapsedMs}ms — ` +
      `type=${parsed.documentType}, scheme=${parsed.scheme}, ` +
      `${(parsed.exampleMarkers || []).length} Beispiel-Marker`
    );

    return {
      structure: {
        documentType: parsed.documentType || null,
        language: parsed.language || 'de',
        scheme: parsed.scheme || null,
        exampleMarkers: Array.isArray(parsed.exampleMarkers) ? parsed.exampleMarkers : [],
        hasNestedStructure: !!parsed.hasNestedStructure,
        repeatingPageHeaders: Array.isArray(parsed.repeatingPageHeaders) ? parsed.repeatingPageHeaders : [],
        notes: parsed.notes || null
      },
      metadata: {
        model: MODEL,
        elapsedMs,
        inputLength: croppedText.length,
        truncated,
        promptTokens: response.usage?.prompt_tokens ?? null,
        completionTokens: response.usage?.completion_tokens ?? null
      }
    };
  }
}

module.exports = {
  StructureAnalyzer,
  structureAnalyzer: new StructureAnalyzer()
};

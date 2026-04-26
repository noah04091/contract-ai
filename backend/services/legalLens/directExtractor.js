/**
 * Legal Lens - Direct Extraction (V4)
 *
 * Ein einziger GPT-Call der Klauseln MIT vollem Text zurueckgibt.
 * Kein Marker-Matching, kein Fuzzy-Search, kein Offset-Tracking.
 *
 * Fuer lange Dokumente (>60K chars): Batching mit Overlap + Stitching.
 *
 * @version 4.0.0
 */

const OpenAI = require('openai');
const { normalizeForMatch, buildNormalizedIndex, findFuzzy } = require('./textMatching');
const { postProcess } = require('./clausePostProcessor');

const MODEL = 'gpt-4o';
const MAX_INPUT_CHARS = 60000;
const BATCH_OVERLAP = 5000;
const MAX_COMPLETION_TOKENS = 16384;

// ──────────────────────────────────────────────────────────────────
// LENIENT MODE — Fuer "Trotzdem analysieren"-Override
// User hat bewusst entschieden, dass das Dokument analysiert werden
// soll, auch wenn es nicht eindeutig ein Vertrag ist (z.B. komplexe
// Rechnung, Angebot, Formular). Hier extrahieren wir JEDEN strukturell
// erkennbaren Abschnitt — auch ohne juristischen Klausel-Charakter.
// ──────────────────────────────────────────────────────────────────
const LENIENT_SYSTEM_PROMPT = `Du bist ein Experte fuer Dokumentstrukturierung. Der User hat dieses Dokument manuell zur Analyse freigegeben, auch wenn es moeglicherweise kein klassischer Vertrag ist (z.B. eine komplexe Rechnung, ein detailliertes Angebot, ein Formular mit Bestimmungen).

Deine Aufgabe: Zerlege den folgenden Text in seine logisch abgegrenzten inhaltlichen Abschnitte — egal ob sie klassische Vertragsklauseln, Positionen einer Rechnung, Bestimmungen eines Angebots oder andere strukturelle Einheiten sind.

REGELN:
1. Extrahiere ALLE inhaltlichen Abschnitte, die eine eigenstaendige Aussage treffen — sei grosszuegig, nicht zu restriktiv.

2. KEINE Abschnitte fuer reinen Metadaten-Ballast:
   - Briefkoepfe, Absender/Empfaenger-Adressen (auch nicht als eigene Klausel)
   - Seitennummern, Kopf-/Fusszeilen
   - Unterschriftsfelder, Datum-Zeilen ("Ort, Datum: ______")
   - Reine Firmen-Footer (USt-IdNr., HRB, Bank ohne inhaltlichen Kontext)

3. Gib den VOLLSTAENDIGEN Text jedes Abschnitts zurueck — WOERTLICH wie im Dokument. Kein einziges Wort aendern, hinzufuegen oder weglassen.

4. Rechnungs-/Angebotspositionen: Wenn eine Position eine eigene Beschreibung mit mehreren Saetzen hat, ist sie EIN Abschnitt. Reine Tabellenzeilen mit nur Bezeichnung+Preis sind KEINE Abschnitte (zu kurz).

5. Rahmen-Bedingungen (AGB-Verweise, Liefer-/Zahlungsbedingungen, Gewaehrleistung, Garantie) sind IMMER eigene Abschnitte.

6. Reihenfolge = wie im Dokument.

7. KEINE Duplikate.

8. Wenn absolut nichts Extrahierbares vorhanden ist (leerer Text, reine Bilder, reines Zahlenchaos ohne Struktur), gib ein leeres Array zurueck.

Antworte NUR mit JSON:
{
  "clauses": [
    {
      "number": "Pos. 1" | "1." | null,
      "title": "Kurzer Titel des Abschnitts" | null,
      "text": "Vollstaendiger woertlicher Text..."
    }
  ],
  "documentType": "Rechnung" | "Angebot" | "Formular" | "Vertrag" | null,
  "language": "de" | "en"
}`;

const SYSTEM_PROMPT = `Du bist ein Experte fuer Vertragsanalyse. Deine Aufgabe: Zerlege den folgenden Vertragstext in seine einzelnen Klauseln.

REGELN:
1. Extrahiere NUR echte Vertragsklauseln — Paragraphen, Artikel, nummerierte oder betitelte Abschnitte mit rechtlichem Inhalt.

2. KEINE Klauseln fuer:
   - Parteibezeichnungen mit Adressen, Namen, Geburtsdaten, E-Mail-Adressen (auch wenn sie am Anfang des Vertrags stehen und die Vertragsparteien benennen — das ist KEIN Klauselinhalt)
   - Briefkoepfe, Absender-/Empfaenger-Adressen, Kontaktdaten
   - Anrede ("Sehr geehrte..."), Grussformeln ("Mit freundlichen Gruessen")
   - Unterschriftsfelder, Ort/Datum-Zeilen, Unterschriftenblocks ("Ort, Datum: ______", "Unterschrift: ______")
   - Firmenangaben (Geschaeftsfuehrer, Registergericht, Handelsregister, IBAN, USt-IdNr., Bankverbindung) — ES SEI DENN sie sind Teil einer echten Vertragsklausel (z.B. Zahlungsbedingungen)
   - Seitennummern, Kopf-/Fusszeilen
   - Anlagen-/Anhaengeverzeichnisse (nur deren Ueberschrift)
   - Wiederholte Dokumentenkopien (wenn der gleiche Vertrag zweimal im Dokument steht, nimm nur die ERSTE Instanz)

3. Gib den VOLLSTAENDIGEN Text jeder Klausel zurueck — WOERTLICH wie im Dokument, NICHT zusammengefasst oder gekuerzt. Kein einziges Wort aendern, hinzufuegen oder weglassen.

4. Wenn Klauseln verschachtelt sind (z.B. Schlussbestimmungen mit eigenem § 1-§ 5), fasse sie zu EINER Klausel zusammen oder ergaenze den Eltern-Abschnitt im Titel: "§ 1 (Schlussbestimmungen)". Nicht einzeln als Top-Level-Klauseln ausgeben.

5. Reihenfolge = wie im Dokument.

6. Wenn das Dokument KEIN Vertrag ist (Rechnung, Formular, Brief ohne Vertragsklauseln), gib ein leeres Array zurueck.

7. Versuche groessere, zusammenhaengende juristische Einheiten zu bilden. Nicht zu fein aufsplitten — eine Klausel mit 3 Absaetzen ist EINE Klausel, nicht drei. Ein Paragraph mit Unterpunkten ist EINE Klausel.

8. KEINE Duplikate: Wenn der gleiche Inhalt mit leicht anderem Text zweimal vorkommt, nimm nur die ERSTE Instanz.

9. Eine Praeambel darf als Klausel extrahiert werden, aber NUR der inhaltliche Teil (Zweck, Hintergrund). Parteidaten (Namen, Adressen, Geburtsdaten) gehoeren NICHT dazu.

Antworte NUR mit JSON:
{
  "clauses": [
    {
      "number": "§ 1" | "1." | null,
      "title": "Vertragsgegenstand" | null,
      "text": "Vollstaendiger woertlicher Text der Klausel..."
    }
  ],
  "documentType": "Mietvertrag" | "Versicherungspolice" | null,
  "language": "de" | "en"
}`;

class DirectExtractor {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('directExtractor: OPENAI_API_KEY fehlt');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Extrahiert Klauseln direkt aus dem Vertragstext.
   *
   * @param {string} rawText
   * @param {object} [options]
   * @param {number} [options.timeoutMs=120000]
   * @param {boolean} [options.lenient=false] - Lenient-Mode fuer "Trotzdem analysieren":
   *   Extrahiert auch Rechnungs-/Angebots-Positionen, nicht nur Vertragsklauseln.
   * @returns {Promise<object>} { clauses, documentType, language, metadata }
   */
  async extract(rawText, options = {}) {
    const { timeoutMs = 120000, lenient = false, onProgress } = options;
    const startTime = Date.now();

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 100) {
      return { clauses: [], documentType: null, language: null, metadata: { reason: 'Text zu kurz', elapsedMs: 0 } };
    }

    const systemPrompt = lenient ? LENIENT_SYSTEM_PROMPT : SYSTEM_PROMPT;
    if (lenient) {
      console.log(`[DirectExtractor] LENIENT MODE aktiv (Override)`);
    }

    let rawClauses, documentType, language;
    let totalPromptTokens = 0, totalCompletionTokens = 0;
    let batchCount = 1;

    if (rawText.length <= MAX_INPUT_CHARS) {
      // Ein Call reicht
      console.log(`[DirectExtractor] Single Call — ${rawText.length} chars`);
      const result = await this._singleCall(rawText, timeoutMs, systemPrompt);
      rawClauses = result.clauses;
      documentType = result.documentType;
      language = result.language;
      totalPromptTokens = result.promptTokens;
      totalCompletionTokens = result.completionTokens;
    } else {
      // Batching
      console.log(`[DirectExtractor] Batching — ${rawText.length} chars`);
      const result = await this._batchedExtraction(rawText, timeoutMs, systemPrompt, onProgress);
      rawClauses = result.clauses;
      documentType = result.documentType;
      language = result.language;
      totalPromptTokens = result.promptTokens;
      totalCompletionTokens = result.completionTokens;
      batchCount = result.batchCount;
    }

    // ── Stitching (nur bei Batching, VOR Post-Processing) ─
    if (batchCount > 1) {
      rawClauses = this._stitchClauses(rawClauses);
    }

    // ── Post-Processing (deterministisch, kein GPT) ──────
    const { clauses, stats: ppStats } = postProcess(rawClauses, rawText);
    const removedTotal = rawClauses.length - clauses.length;

    // ── Coverage Check ──────────────────────────────────
    const totalClauseChars = clauses.reduce((sum, c) => sum + (c.text || '').length, 0);
    const coverageRatio = rawText.length > 0 ? totalClauseChars / rawText.length : 0;
    const coverageWarning = clauses.length > 0 && coverageRatio < 0.40;

    if (coverageWarning) {
      console.warn(`[DirectExtractor] Coverage-Warnung: ${(coverageRatio * 100).toFixed(1)}% — moeglicherweise Klauseln vergessen`);
    }

    // ── Trust Check ─────────────────────────────────────
    const trustResults = this._trustCheck(clauses, rawText);
    const lowTrustCount = trustResults.filter(t => !t.found).length;

    if (lowTrustCount > 0) {
      console.warn(`[DirectExtractor] Trust-Check: ${lowTrustCount}/${clauses.length} Klauseln nicht im Original gefunden`);
    }

    const elapsedMs = Date.now() - startTime;
    const ppSummary = Object.entries(ppStats)
      .filter(([k, v]) => v > 0 && k !== 'input' && k !== 'output')
      .map(([k, v]) => `${k}=${v}`).join(', ');
    console.log(
      `[DirectExtractor] Fertig in ${elapsedMs}ms — ${clauses.length} Klauseln` +
      ` (${removedTotal} entfernt: ${ppSummary || 'nichts'})` +
      `, Coverage ${(coverageRatio * 100).toFixed(1)}%` +
      `, Trust ${clauses.length - lowTrustCount}/${clauses.length}` +
      (batchCount > 1 ? `, ${batchCount} Batches` : '')
    );

    return {
      clauses,
      documentType: documentType || null,
      language: language || null,
      metadata: {
        model: MODEL,
        elapsedMs,
        inputLength: rawText.length,
        clauseCount: clauses.length,
        postProcessing: ppStats,
        coverageRatio,
        coverageWarning,
        lowTrustCount,
        batchCount,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens
      }
    };
  }

  /**
   * Ein einzelner GPT-Call.
   * @private
   */
  async _singleCall(text, timeoutMs, systemPrompt = SYSTEM_PROMPT) {
    const response = await this.openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Hier ist der Dokumenttext. Zerlege ihn in seine logischen Abschnitte.\n\n---BEGIN DOKUMENT---\n${text}\n---END DOKUMENT---`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: MAX_COMPLETION_TOKENS
    }, { timeout: timeoutMs });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('directExtractor: Leere Antwort');

    const parsed = JSON.parse(content);
    return {
      clauses: Array.isArray(parsed.clauses) ? parsed.clauses : [],
      documentType: parsed.documentType || null,
      language: parsed.language || null,
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0
    };
  }

  /**
   * Batched Extraction fuer lange Texte.
   * @private
   */
  async _batchedExtraction(text, timeoutMs, systemPrompt = SYSTEM_PROMPT, onProgress = null) {
    const CONCURRENCY = 3;
    const windows = [];
    let pos = 0;
    while (pos < text.length) {
      const end = Math.min(pos + MAX_INPUT_CHARS, text.length);
      windows.push({ text: text.substring(pos, end), offset: pos });
      if (end >= text.length) break;
      pos = end - BATCH_OVERLAP;
    }

    console.log(`[DirectExtractor] ${windows.length} Batch-Fenster (Concurrency: ${CONCURRENCY})`);

    // Ergebnisse pro Fenster-Index — damit Reihenfolge garantiert bleibt
    const windowResults = new Array(windows.length).fill(null);
    let totalPromptTokens = 0, totalCompletionTokens = 0;

    // Parallele Verarbeitung mit Concurrency-Limit (Pattern aus batchAnalyzer.js)
    for (let i = 0; i < windows.length; i += CONCURRENCY) {
      const chunk = windows.slice(i, i + CONCURRENCY);
      const chunkStartTime = Date.now();

      console.log(`[DirectExtractor] Runde ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(windows.length / CONCURRENCY)}: Batch ${i + 1}-${Math.min(i + CONCURRENCY, windows.length)} parallel`);

      const results = await Promise.allSettled(
        chunk.map((win, j) => {
          const batchIdx = i + j;
          const batchPrompt = batchIdx === 0
            ? `Hier ist der ERSTE TEIL eines langen Dokuments. Zerlege ihn in Abschnitte. Wenn ein Abschnitt am Ende abgeschnitten wirkt, extrahiere trotzdem alles was da ist.\n\n---BEGIN DOKUMENT (Teil ${batchIdx + 1})---\n${win.text}\n---END DOKUMENT---`
            : `Hier ist ein WEITERER TEIL desselben Dokuments (Fortsetzung). Zerlege ihn in Abschnitte. Es kann sein, dass der Text mitten in einem Abschnitt beginnt — wenn ja, extrahiere ihn trotzdem.\n\n---BEGIN DOKUMENT (Teil ${batchIdx + 1})---\n${win.text}\n---END DOKUMENT---`;

          return this.openai.chat.completions.create({
            model: MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: batchPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
            max_tokens: MAX_COMPLETION_TOKENS
          }, { timeout: timeoutMs });
        })
      );

      // Ergebnisse in der richtigen Reihenfolge verarbeiten
      for (let j = 0; j < results.length; j++) {
        const batchIdx = i + j;
        const result = results[j];

        if (result.status === 'fulfilled') {
          const content = result.value.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            windowResults[batchIdx] = {
              clauses: Array.isArray(parsed.clauses) ? parsed.clauses : [],
              documentType: parsed.documentType || null,
              language: parsed.language || null
            };
            totalPromptTokens += result.value.usage?.prompt_tokens || 0;
            totalCompletionTokens += result.value.usage?.completion_tokens || 0;
          }
        } else {
          console.error(`[DirectExtractor] Batch ${batchIdx + 1} fehlgeschlagen:`, result.reason?.message || result.reason);
        }
      }

      const chunkElapsed = Math.round((Date.now() - chunkStartTime) / 1000);
      const completedBatches = Math.min(i + CONCURRENCY, windows.length);
      const round = Math.floor(i / CONCURRENCY) + 1;
      const totalRounds = Math.ceil(windows.length / CONCURRENCY);
      console.log(`[DirectExtractor] Runde fertig in ${chunkElapsed}s (${completedBatches}/${windows.length} Batches)`);

      // Progressive Callback: neue Klauseln dieser Runde an Aufrufer melden
      if (onProgress) {
        const newClauses = [];
        for (let j = 0; j < chunk.length; j++) {
          const wr = windowResults[i + j];
          if (wr) newClauses.push(...wr.clauses);
        }
        const totalSoFar = windowResults.filter(Boolean).reduce((sum, wr) => sum + wr.clauses.length, 0);
        try {
          onProgress({ newClauses, totalSoFar, round, totalRounds });
        } catch (cbErr) {
          console.warn(`[DirectExtractor] onProgress callback error:`, cbErr.message);
        }
      }
    }

    // Klauseln in Dokumentreihenfolge zusammenfuehren
    let allClauses = [];
    let documentType = null;
    let language = null;

    for (const wr of windowResults) {
      if (!wr) continue;
      allClauses.push(...wr.clauses);
      if (!documentType && wr.documentType) documentType = wr.documentType;
      if (!language && wr.language) language = wr.language;
    }

    return {
      clauses: allClauses,
      documentType,
      language,
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      batchCount: windows.length
    };
  }

  // ──────────────────────────────────────────────────────
  // Post-Processing (lokal, kein GPT)
  // ──────────────────────────────────────────────────────

  /**
   * Clause Cleaner: Entfernt offensichtlichen Nicht-Klausel-Muell.
   * @private
   */
  _cleanClauses(clauses) {
    return clauses.filter(c => {
      const text = (c.text || '').trim();

      // Leere oder sehr kurze Klauseln ohne Satzstruktur
      if (text.length < 30 && !/[.;:]/.test(text)) return false;

      // Reine Firmendaten/Adressen (OHNE juristischen Kontext)
      const hasLegalContent = /[.;:]\s/.test(text) && text.split(/\s+/).length >= 5;
      const isJustMetadata =
        /^(IBAN|BIC|USt-IdNr|Handelsregister|Registergericht|Sitz der Gesellschaft|Gläubiger-ID|Versicherungssteuer-Nr)/i.test(text) ||
        (/\bIBAN\b/.test(text) && /\bBIC\b/.test(text) && !hasLegalContent) ||
        (/Geschaeftsfuehrer|Geschäftsführer|Aufsichtsratsvorsitzend/i.test(text) && !hasLegalContent && text.length < 300);
      if (isJustMetadata) return false;

      // Reine Grussformeln
      if (/^(mit freundlichen gr[uü][sß]en|sincerely|best regards|hochachtungsvoll)/i.test(text) && text.length < 100) return false;

      // Unterschriftsfelder / Unterschriftenblocks
      const underscoreCount = (text.match(/_{3,}/g) || []).length;
      if (underscoreCount >= 2 && /unterschrift|signature|datum|date/i.test(text)) return false;

      // Reine Titel ohne Inhalt (nur Ueberschrift, kein Satz)
      if (text.length < 60 && !/[.;:]/.test(text) && !text.includes('\n')) return false;

      return true;
    });
  }

  /**
   * Deduplizierung: Entfernt Klauseln mit >80% Textuebereinstimmung.
   * @private
   */
  _deduplicateClauses(clauses) {
    const result = [];
    for (const clause of clauses) {
      const normalized = normalizeForMatch((clause.text || '').substring(0, 150));
      const isDuplicate = result.some(existing => {
        const existingNorm = normalizeForMatch((existing.text || '').substring(0, 150));
        if (!normalized || !existingNorm) return false;
        // Einfacher Check: Wenn die ersten 150 Chars zu >80% uebereinstimmen
        const shorter = Math.min(normalized.length, existingNorm.length);
        if (shorter < 20) return false;
        let matches = 0;
        const compareLen = Math.min(shorter, 100);
        for (let i = 0; i < compareLen; i++) {
          if (normalized[i] === existingNorm[i]) matches++;
        }
        return (matches / compareLen) > 0.80;
      });
      if (!isDuplicate) result.push(clause);
    }
    return result;
  }

  /**
   * Clause Stitching: Fuegt abgeschnittene Klauseln an Batch-Grenzen zusammen.
   * @private
   */
  _stitchClauses(clauses) {
    if (clauses.length < 2) return clauses;

    const result = [clauses[0]];
    for (let i = 1; i < clauses.length; i++) {
      const current = clauses[i];
      const prev = result[result.length - 1];

      // Wenn aktuelle Klausel keinen Titel/Nummer hat UND die vorherige
      // nicht mit einem Satzzeichen endet → zusammenfuehren
      const prevText = (prev.text || '').trim();
      const prevEndsClean = /[.;:!?)]$/.test(prevText);
      const currentHasTitle = current.number || current.title;

      if (!currentHasTitle && !prevEndsClean) {
        // Stitching: Text anhaengen
        result[result.length - 1] = {
          ...prev,
          text: prevText + '\n' + (current.text || '').trim()
        };
      } else {
        result.push(current);
      }
    }
    return result;
  }

  /**
   * Trust Check: Prueft ob der erste Satz jeder Klausel im Original vorkommt.
   * Nur flaggen, nicht korrigieren.
   * @private
   */
  _trustCheck(clauses, rawText) {
    // Case-insensitive + Whitespace-normalisierter Index
    const lowerRaw = rawText.toLowerCase();
    const normalizedIndex = buildNormalizedIndex(lowerRaw);

    return clauses.map(c => {
      const text = (c.text || '').trim();
      // Kuerzeren Snippet suchen (60 Chars) — toleranter gegen GPT-Reformatierung
      const snippet = text.substring(0, 60);
      const pos = findFuzzy(lowerRaw, snippet.toLowerCase(), normalizedIndex);
      if (pos >= 0) return { id: c.number || c.title || '?', found: true, searchedFor: snippet };

      // Fallback: Nur die ersten 3 signifikanten Woerter suchen
      const words = text.split(/\s+/).filter(w => w.length > 3).slice(0, 3).join(' ');
      const pos2 = findFuzzy(lowerRaw, words.toLowerCase(), normalizedIndex);
      return {
        id: c.number || c.title || '?',
        found: pos2 >= 0,
        searchedFor: snippet.substring(0, 40)
      };
    });
  }
}

// Lazy singleton — wird erst beim Zugriff erstellt, nicht bei require()
let _instance = null;
module.exports = {
  DirectExtractor,
  get directExtractor() {
    if (!_instance) _instance = new DirectExtractor();
    return _instance;
  }
};

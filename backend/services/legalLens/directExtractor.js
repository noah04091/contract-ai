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

const MODEL = 'gpt-4o';
const MAX_INPUT_CHARS = 60000;
const BATCH_OVERLAP = 5000;
const MAX_COMPLETION_TOKENS = 16384;

const SYSTEM_PROMPT = `Du bist ein Experte fuer Vertragsanalyse. Deine Aufgabe: Zerlege den folgenden Vertragstext in seine einzelnen Klauseln.

REGELN:
1. Extrahiere NUR echte Vertragsklauseln — Paragraphen, Artikel, nummerierte oder betitelte Abschnitte mit rechtlichem Inhalt.

2. KEINE Klauseln fuer:
   - Briefkoepfe, Absender-/Empfaenger-Adressen, Kontaktdaten
   - Anrede ("Sehr geehrte..."), Grussformeln ("Mit freundlichen Gruessen")
   - Unterschriftsfelder, Ort/Datum-Zeilen
   - Firmenangaben (Geschaeftsfuehrer, Registergericht, Handelsregister, IBAN, USt-IdNr., Bankverbindung) — ES SEI DENN sie sind Teil einer echten Vertragsklausel (z.B. Zahlungsbedingungen)
   - Seitennummern, Kopf-/Fusszeilen
   - Anlagen-/Anhaengeverzeichnisse (nur deren Ueberschrift)
   - Wiederholte Dokumentenkopien (wenn der gleiche Vertrag zweimal im Dokument steht, nimm nur die ERSTE Instanz)

3. Gib den VOLLSTAENDIGEN Text jeder Klausel zurueck — WOERTLICH wie im Dokument, NICHT zusammengefasst oder gekuerzt. Kein einziges Wort aendern, hinzufuegen oder weglassen.

4. Wenn Klauseln verschachtelt sind (z.B. eine Widerrufsbelehrung mit eigenem § 1-§ 5 innerhalb einer Versicherungspolice), ergaenze den Eltern-Abschnitt im Titel: "§ 1 (Widerrufsbelehrung)".

5. Reihenfolge = wie im Dokument.

6. Wenn das Dokument KEIN Vertrag ist (Rechnung, Formular, Brief ohne Vertragsklauseln), gib ein leeres Array zurueck.

7. Versuche groessere, zusammenhaengende juristische Einheiten zu bilden. Nicht zu fein aufsplitten — eine Klausel mit 3 Absaetzen ist EINE Klausel, nicht drei.

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
   * @returns {Promise<object>} { clauses, documentType, language, metadata }
   */
  async extract(rawText, options = {}) {
    const { timeoutMs = 120000 } = options;
    const startTime = Date.now();

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 100) {
      return { clauses: [], documentType: null, language: null, metadata: { reason: 'Text zu kurz', elapsedMs: 0 } };
    }

    let rawClauses, documentType, language;
    let totalPromptTokens = 0, totalCompletionTokens = 0;
    let batchCount = 1;

    if (rawText.length <= MAX_INPUT_CHARS) {
      // Ein Call reicht
      console.log(`[DirectExtractor] Single Call — ${rawText.length} chars`);
      const result = await this._singleCall(rawText, timeoutMs);
      rawClauses = result.clauses;
      documentType = result.documentType;
      language = result.language;
      totalPromptTokens = result.promptTokens;
      totalCompletionTokens = result.completionTokens;
    } else {
      // Batching
      console.log(`[DirectExtractor] Batching — ${rawText.length} chars`);
      const result = await this._batchedExtraction(rawText, timeoutMs);
      rawClauses = result.clauses;
      documentType = result.documentType;
      language = result.language;
      totalPromptTokens = result.promptTokens;
      totalCompletionTokens = result.completionTokens;
      batchCount = result.batchCount;
    }

    // ── Clause Cleaner ──────────────────────────────────
    const beforeClean = rawClauses.length;
    let clauses = this._cleanClauses(rawClauses);
    const removedByClean = beforeClean - clauses.length;

    // ── Deduplizierung ──────────────────────────────────
    const beforeDedup = clauses.length;
    clauses = this._deduplicateClauses(clauses);
    const removedByDedup = beforeDedup - clauses.length;

    // ── Stitching (nur bei Batching) ────────────────────
    if (batchCount > 1) {
      clauses = this._stitchClauses(clauses);
    }

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
    console.log(
      `[DirectExtractor] Fertig in ${elapsedMs}ms — ${clauses.length} Klauseln` +
      ` (${removedByClean} gecleant, ${removedByDedup} dedupliziert)` +
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
        removedByClean,
        removedByDedup,
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
  async _singleCall(text, timeoutMs) {
    const response = await this.openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Hier ist der Vertragstext. Zerlege ihn in Klauseln.\n\n---BEGIN VERTRAG---\n${text}\n---END VERTRAG---`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
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
  async _batchedExtraction(text, timeoutMs) {
    const windows = [];
    let pos = 0;
    while (pos < text.length) {
      const end = Math.min(pos + MAX_INPUT_CHARS, text.length);
      windows.push({ text: text.substring(pos, end), offset: pos });
      if (end >= text.length) break;
      pos = end - BATCH_OVERLAP;
    }

    console.log(`[DirectExtractor] ${windows.length} Batch-Fenster`);

    let allClauses = [];
    let documentType = null;
    let language = null;
    let totalPromptTokens = 0, totalCompletionTokens = 0;

    for (let i = 0; i < windows.length; i++) {
      const win = windows[i];
      console.log(`[DirectExtractor] Batch ${i + 1}/${windows.length}: ${win.text.length} chars`);
      try {
        const batchPrompt = i === 0
          ? `Hier ist der ERSTE TEIL eines langen Vertrags. Zerlege ihn in Klauseln. Wenn eine Klausel am Ende abgeschnitten wirkt, extrahiere trotzdem alles was da ist.\n\n---BEGIN VERTRAG (Teil ${i + 1})---\n${win.text}\n---END VERTRAG---`
          : `Hier ist ein WEITERER TEIL desselben Vertrags (Fortsetzung). Zerlege ihn in Klauseln. Es kann sein, dass der Text mitten in einer Klausel beginnt — wenn ja, extrahiere sie trotzdem.\n\n---BEGIN VERTRAG (Teil ${i + 1})---\n${win.text}\n---END VERTRAG---`;

        const response = await this.openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: batchPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: MAX_COMPLETION_TOKENS
        }, { timeout: timeoutMs });

        const content = response.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const batchClauses = Array.isArray(parsed.clauses) ? parsed.clauses : [];
          allClauses.push(...batchClauses);
          if (!documentType && parsed.documentType) documentType = parsed.documentType;
          if (!language && parsed.language) language = parsed.language;
          totalPromptTokens += response.usage?.prompt_tokens || 0;
          totalCompletionTokens += response.usage?.completion_tokens || 0;
        }
      } catch (err) {
        console.error(`[DirectExtractor] Batch ${i + 1} fehlgeschlagen:`, err.message);
      }
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

module.exports = {
  DirectExtractor,
  directExtractor: new DirectExtractor()
};

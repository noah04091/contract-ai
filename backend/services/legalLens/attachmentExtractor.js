/**
 * Attachment Extractor — Erkennt und extrahiert Anhänge/Anlagen aus Vertragstexten.
 *
 * Wird NACH der Hauptextraktion aufgerufen (additive Erweiterung).
 * Analysiert den "Resttext" nach der letzten Hauptklausel und sucht dort Anlagen.
 *
 * @version 1.0.0
 */

const OpenAI = require('openai');

// Lazy init — erst beim ersten Aufruf, nicht bei require()
let _openai = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const ATTACHMENT_SYSTEM_PROMPT = `Du bist ein Experte fuer Vertragsanalyse. Du analysierst den ANHANG-Teil eines Vertrags — also Anlagen, Beilagen, Konditionenblaetter, Negativerklaerungen, Preislisten oder sonstige Dokumente, die dem Hauptvertrag beigefuegt sind.

REGELN:
1. Identifiziere JEDE separate Anlage/jeden Anhang im Text.
2. Gib jeder Anlage einen klaren Namen (z.B. "Konditionenblatt", "Negativerklaerung", "Preisliste", "Debitorenliste").
3. Zerlege jede Anlage in ihre Bestandteile/Klauseln — wie beim Hauptvertrag.
4. Bei tabellarischen Inhalten (z.B. Konditionen, Gebuehren): Fasse zusammengehoerige Zeilen zu EINER Klausel zusammen. Jede Gebuehrenart oder Konditionsgruppe ist eine Klausel.
5. Bei Erklaerungen/Formularen: Jede separate Erklaerung oder Zusicherung ist eine Klausel.
6. Gib den VOLLSTAENDIGEN Text jeder Klausel zurueck — WOERTLICH.
7. KEINE Parteidaten, Adressen, Unterschriftsfelder, Seitennummern.
8. Wenn der Text KEINE Anlagen enthaelt (nur Unterschriften, Adressen, Leerstellen), gib ein leeres Array zurueck.

Antworte NUR mit JSON:
{
  "attachments": [
    {
      "name": "Konditionenblatt",
      "clauses": [
        {
          "number": "1." | null,
          "title": "Factoringgebuehr" | null,
          "text": "Vollstaendiger woertlicher Text..."
        }
      ]
    }
  ]
}`;

/**
 * Findet den "Resttext" nach der letzten Hauptklausel.
 *
 * @param {string} fullText - Gesamter Vertragstext
 * @param {Array<{text: string}>} mainClauses - Bereits extrahierte Hauptklauseln
 * @returns {string} Der Text nach der letzten Hauptklausel
 */
function findRestText(fullText, mainClauses) {
  if (!mainClauses || mainClauses.length === 0) return '';

  let lastEndPos = 0;

  for (const clause of mainClauses) {
    const clauseText = (clause.text || '').trim();
    if (!clauseText || clauseText.length < 30) continue;

    // Suche mit den ersten 80 Zeichen (gleiche Logik wie extractionAdapter)
    const searchSnippet = clauseText.substring(0, 80);
    const pos = fullText.indexOf(searchSnippet);

    if (pos >= 0) {
      const endPos = pos + clauseText.length;
      if (endPos > lastEndPos) {
        lastEndPos = endPos;
      }
    }
  }

  if (lastEndPos === 0) return '';

  return fullText.substring(lastEndPos).trim();
}

/**
 * Extrahiert Anhänge aus dem Resttext nach dem Hauptvertrag.
 *
 * @param {string} fullText - Gesamter Vertragstext
 * @param {Array<{text: string}>} mainClauses - Bereits extrahierte Hauptklauseln
 * @returns {Promise<Array<{name: string, clauses: Array<{number, title, text}>}> | null>}
 */
async function extractAttachments(fullText, mainClauses) {
  const restText = findRestText(fullText, mainClauses);

  // Zu wenig Text fuer sinnvolle Anhang-Extraktion
  if (restText.length < 200) {
    console.log(`[AttachmentExtractor] Kein relevanter Resttext (${restText.length} chars) — keine Anhaenge`);
    return null;
  }

  // Kurz-Check: Enthaelt der Resttext ueberhaupt Anhang-Indikatoren?
  const hasAttachmentIndicators = /anlage|anhang|beilage|kondition|negativerkl|preisliste|debitorenliste|zusatzvereinbarung|ergaenzende|nachtrag|schedule|appendix|annex/i.test(restText);

  if (!hasAttachmentIndicators && restText.length < 500) {
    console.log(`[AttachmentExtractor] Resttext (${restText.length} chars) ohne Anhang-Indikatoren — uebersprungen`);
    return null;
  }

  console.log(`[AttachmentExtractor] Resttext gefunden: ${restText.length} chars — starte GPT-Extraktion`);

  const startedAt = Date.now();

  try {
    // Max 60K chars an GPT senden
    const inputText = restText.length > 60000 ? restText.substring(0, 60000) : restText;

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: ATTACHMENT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Hier ist der ANHANG-Teil eines Vertrags (Text nach den Hauptklauseln). Identifiziere und zerlege die Anlagen.\n\n---BEGIN ANHAENGE---\n${inputText}\n---END ANHAENGE---`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 16384
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[AttachmentExtractor] Leere GPT-Antwort');
      return null;
    }

    const parsed = JSON.parse(content);
    const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];

    // Validierung: Nur Anhänge mit echten Klauseln behalten
    const validAttachments = attachments.filter(att => {
      if (!att.name || !Array.isArray(att.clauses) || att.clauses.length === 0) return false;
      // Mindestens eine Klausel mit >30 Zeichen Text
      return att.clauses.some(c => (c.text || '').trim().length > 30);
    });

    const totalClauses = validAttachments.reduce((sum, att) => sum + att.clauses.length, 0);
    const elapsedMs = Date.now() - startedAt;
    const tokens = response.usage?.total_tokens || 0;

    console.log(`[AttachmentExtractor] ${validAttachments.length} Anhaenge mit ${totalClauses} Klauseln in ${elapsedMs}ms (${tokens} tokens)`);

    return validAttachments.length > 0 ? validAttachments : null;

  } catch (err) {
    console.error(`[AttachmentExtractor] GPT-Fehler:`, err.message);
    return null;
  }
}

module.exports = {
  extractAttachments,
  findRestText
};

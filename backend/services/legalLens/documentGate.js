/**
 * Legal Lens Document Gate
 *
 * Prüft VOR dem teuren Parsing, ob ein Dokument überhaupt ein rechtsrelevantes
 * Vertragsdokument ist (Vertrag, AGB, Datenschutz, Widerruf, NDA, Police, Kündigung).
 *
 * Zweistufige Prüfung:
 *  1) Keyword-Pre-Check (0 GPT-Kosten) — deckt ~70% der Fälle ab
 *  2) GPT-4o-mini-Call mit ersten 2000 Zeichen (nur bei Unsicherheit)
 *
 * Sicherheitsnetz: Fail-Open. Bei Fehler IMMER durchwinken (suitable: true).
 * Ein defekter Gate darf NIEMALS einen echten Vertrag blockieren.
 *
 * Feature-Flag: LEGAL_LENS_DOCUMENT_GATE (default: true)
 *
 * @module services/legalLens/documentGate
 */

const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --- Konfiguration ---------------------------------------------------------

const GATE_ENABLED = process.env.LEGAL_LENS_DOCUMENT_GATE !== 'false'; // default ON

// Mindestlänge: unter diesem Wert ist eine Analyse eh sinnlos
const MIN_TEXT_LENGTH = 200;

// Starke Indikatoren für ein rechtsrelevantes Vertragsdokument
const LEGAL_KEYWORDS_STRONG = [
  'vertrag', 'contract',
  'allgemeine geschäftsbedingungen', 'agb',
  'datenschutzerklärung', 'datenschutzhinweise', 'datenschutzbestimmung',
  'widerrufsbelehrung', 'widerrufsrecht',
  'geheimhaltungsvereinbarung', 'nda', 'non-disclosure',
  'versicherungsbedingungen', 'versicherungspolice', 'police',
  'mietvertrag', 'arbeitsvertrag', 'kaufvertrag', 'dienstvertrag', 'dienstleistungsvertrag',
  'werkvertrag', 'lizenzvertrag', 'leasingvertrag', 'factoringvertrag',
  'kündigungsbestätigung',
  'vereinbarung', 'abkommen',
  'nutzungsbedingungen', 'terms of service', 'terms and conditions'
];

// Mittlere Indikatoren — für sich allein nicht stark genug, aber als Verstärker
const LEGAL_KEYWORDS_MEDIUM = [
  '§', 'paragraph', 'klausel',
  'parteien', 'vertragspartner', 'auftraggeber', 'auftragnehmer',
  'laufzeit', 'kündigungsfrist',
  'haftung', 'gewährleistung',
  'vertraulichkeit'
];

// Starke Indikatoren für NICHT-Vertrag (Rechnung, Beleg etc.)
const NON_LEGAL_KEYWORDS_STRONG = [
  'rechnungsnummer', 'rechnungsbetrag', 'rechnungsdatum',
  'kassenbon', 'kassenbeleg', 'quittung',
  'kontoauszug', 'saldo', 'umsätze',
  'lieferschein',
  'gehaltsabrechnung', 'lohnabrechnung',
  'steuerbescheid', 'einkommensteuer'
];

// --- Öffentliche API -------------------------------------------------------

/**
 * Prüft ob ein Dokument für Legal Lens geeignet ist.
 *
 * @param {string} text - Der extrahierte Dokumenttext
 * @param {object} [options]
 * @param {boolean} [options.skipGate] - Wenn true, immer suitable=true (Override)
 * @returns {Promise<{suitable: boolean, documentType: string|null, confidence: number, reason: string, source: 'disabled'|'override'|'too_short'|'keyword'|'gpt'|'error'}>}
 */
async function checkDocumentSuitability(text, options = {}) {
  // Override: "Trotzdem analysieren"-Button
  if (options.skipGate) {
    return {
      suitable: true,
      documentType: null,
      confidence: 1,
      reason: 'User-Override',
      source: 'override'
    };
  }

  // Feature-Flag aus → immer durchwinken
  if (!GATE_ENABLED) {
    return {
      suitable: true,
      documentType: null,
      confidence: 1,
      reason: 'Gate deaktiviert',
      source: 'disabled'
    };
  }

  // Leerer/sehr kurzer Text → nicht geeignet (ohne GPT-Call)
  if (!text || text.length < MIN_TEXT_LENGTH) {
    return {
      suitable: false,
      documentType: 'empty_or_too_short',
      confidence: 0.95,
      reason: 'Das Dokument enthält zu wenig analysierbaren Text.',
      source: 'keyword'
    };
  }

  // Stufe 1: Keyword-Pre-Check
  const keywordResult = keywordPreCheck(text);
  if (keywordResult.decisive) {
    return keywordResult.result;
  }

  // Stufe 2: GPT-Fallback bei Unsicherheit
  try {
    const gptResult = await gptClassify(text);
    return gptResult;
  } catch (err) {
    // Fail-Open: Niemals User blockieren wegen Gate-Bug
    console.warn('[Document Gate] GPT-Fallback fehlgeschlagen, fail-open:', err.message);
    return {
      suitable: true,
      documentType: null,
      confidence: 0.5,
      reason: 'Klassifizierung nicht möglich, Dokument wird analysiert',
      source: 'error'
    };
  }
}

// --- Interne Helfer --------------------------------------------------------

/**
 * Keyword-basierter Pre-Check. Gibt ein entscheidendes Ergebnis zurück oder
 * signalisiert Unsicherheit (decisive: false).
 */
function keywordPreCheck(text) {
  const lower = text.toLowerCase();

  // Signal-Zählung
  let strongLegal = 0;
  let mediumLegal = 0;
  let strongNonLegal = 0;

  for (const kw of LEGAL_KEYWORDS_STRONG) {
    if (lower.includes(kw)) strongLegal++;
  }
  for (const kw of LEGAL_KEYWORDS_MEDIUM) {
    if (lower.includes(kw)) mediumLegal++;
  }
  for (const kw of NON_LEGAL_KEYWORDS_STRONG) {
    if (lower.includes(kw)) strongNonLegal++;
  }

  // Eindeutig JA: ≥2 starke Legal-Signale, keine starken Non-Legal-Signale
  if (strongLegal >= 2 && strongNonLegal === 0) {
    return {
      decisive: true,
      result: {
        suitable: true,
        documentType: guessDocumentType(lower),
        confidence: 0.9,
        reason: `Vertragsdokument erkannt (${strongLegal} starke Merkmale)`,
        source: 'keyword'
      }
    };
  }

  // Eindeutig JA: 1 starkes + ≥3 mittlere Legal-Signale
  if (strongLegal >= 1 && mediumLegal >= 3 && strongNonLegal === 0) {
    return {
      decisive: true,
      result: {
        suitable: true,
        documentType: guessDocumentType(lower),
        confidence: 0.85,
        reason: 'Vertragsdokument erkannt',
        source: 'keyword'
      }
    };
  }

  // Eindeutig NEIN: ≥2 Non-Legal-Signale, keine starken Legal-Signale
  if (strongNonLegal >= 2 && strongLegal === 0) {
    return {
      decisive: true,
      result: {
        suitable: false,
        documentType: guessNonLegalType(lower),
        confidence: 0.9,
        reason: 'Dokument scheint ein Beleg/Nachweis zu sein, kein Vertragsdokument',
        source: 'keyword'
      }
    };
  }

  // Sonst: unklar → GPT
  return { decisive: false };
}

/**
 * Versucht den Dokumenttyp aus dem Text zu raten (nur für Anzeigezwecke).
 */
function guessDocumentType(lowerText) {
  if (lowerText.includes('allgemeine geschäftsbedingungen') || lowerText.includes(' agb')) return 'AGB';
  if (lowerText.includes('datenschutz')) return 'Datenschutzerklärung';
  if (lowerText.includes('widerruf')) return 'Widerrufsbelehrung';
  if (lowerText.includes('geheimhaltung') || lowerText.includes('nda')) return 'Geheimhaltungsvereinbarung';
  if (lowerText.includes('versicherungsbedingungen') || lowerText.includes('police')) return 'Versicherungsvertrag';
  if (lowerText.includes('mietvertrag')) return 'Mietvertrag';
  if (lowerText.includes('arbeitsvertrag')) return 'Arbeitsvertrag';
  if (lowerText.includes('kaufvertrag')) return 'Kaufvertrag';
  if (lowerText.includes('kündigungsbestätigung')) return 'Kündigungsbestätigung';
  if (lowerText.includes('vertrag')) return 'Vertrag';
  return 'Rechtsdokument';
}

function guessNonLegalType(lowerText) {
  if (lowerText.includes('rechnungsnummer') || lowerText.includes('rechnungsbetrag')) return 'Rechnung';
  if (lowerText.includes('kassenbon') || lowerText.includes('kassenbeleg') || lowerText.includes('quittung')) return 'Quittung';
  if (lowerText.includes('kontoauszug') || lowerText.includes('saldo')) return 'Kontoauszug';
  if (lowerText.includes('lieferschein')) return 'Lieferschein';
  if (lowerText.includes('gehaltsabrechnung') || lowerText.includes('lohnabrechnung')) return 'Gehaltsabrechnung';
  if (lowerText.includes('steuerbescheid')) return 'Steuerbescheid';
  return 'Beleg/Nachweis';
}

/**
 * GPT-Klassifizierung bei unklaren Fällen.
 * Nutzt gpt-4o-mini für niedrige Kosten (~0,0005€/Call).
 */
async function gptClassify(text) {
  const sample = text.substring(0, 2000);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 200,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Du bist Klassifizierer für Rechtsdokumente.

Antworte NUR mit JSON in diesem Format:
{
  "isLegalDocument": boolean,
  "documentType": string,
  "confidence": number (0-1),
  "reason": string (1 Satz auf Deutsch)
}

"isLegalDocument" ist TRUE für:
- Verträge jeder Art (Miete, Arbeit, Kauf, Dienstleistung, Versicherung, Leasing, Factoring, Kredit, Software, SaaS etc.)
- AGBs, Nutzungsbedingungen
- Datenschutzerklärungen, Datenschutzhinweise
- Widerrufsbelehrungen
- Geheimhaltungsvereinbarungen (NDAs)
- Versicherungsbedingungen, Policen
- Kündigungsbestätigungen, Kündigungsschreiben
- Vereinbarungen, Abkommen mit rechtlichem Inhalt

"isLegalDocument" ist FALSE für:
- Rechnungen, Quittungen, Belege
- Kontoauszüge, Saldenlisten
- Gehaltsabrechnungen, Steuerbescheide
- Lieferscheine, Bestellungen ohne Vertragscharakter
- Artikel, Berichte, Protokolle, Notizen
- Formulare ohne Klausel-/Paragraph-Struktur
- Fotos, gescannte Bilder ohne rechtlichen Text

"documentType" ist ein kurzer deutscher Begriff (z.B. "Mietvertrag", "Rechnung", "AGB", "Gehaltsabrechnung").`
      },
      {
        role: 'user',
        content: `Klassifiziere folgenden Dokumentanfang:\n\n---\n${sample}\n---`
      }
    ]
  });

  const raw = completion.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);

  return {
    suitable: !!parsed.isLegalDocument,
    documentType: parsed.documentType || null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
    reason: parsed.reason || (parsed.isLegalDocument ? 'Rechtsdokument erkannt' : 'Kein Rechtsdokument'),
    source: 'gpt'
  };
}

/**
 * Sicherheitsnetz: Erzwingt eine GPT-Klassifizierung mit STARKEM Modell und
 * MEHR Kontext (ignoriert Keyword-Pre-Check).
 *
 * Wird aufgerufen, wenn der Parser trotz "suitable" 0 Klauseln findet.
 * Das ist ein starkes Indiz, dass der einfache Gate-Call (mini, 2000 chars)
 * ein False-Positive produziert hat — hier holen wir ein verlässlicheres
 * Urteil ein, mit dem Kontext "Extraktion fehlgeschlagen".
 *
 * Nutzt gpt-4o mit ~8000 chars Text und explizit gefragter Begründung.
 *
 * @param {string} text
 * @returns {Promise<{suitable: boolean, documentType: string|null, confidence: number, reason: string, source: 'gpt'|'error'|'too_short'}>}
 */
async function forceGptClassify(text) {
  if (!text || text.length < MIN_TEXT_LENGTH) {
    return {
      suitable: false,
      documentType: 'empty_or_too_short',
      confidence: 0.95,
      reason: 'Das Dokument enthält zu wenig analysierbaren Text.',
      source: 'too_short'
    };
  }

  // Für die Nachprüfung: großzügiger Textausschnitt (Anfang + Mitte + Ende)
  // So erwischen wir Cover-Pages UND tatsächlichen Inhalt UND Signatur-Block.
  const totalLen = text.length;
  let sample;
  if (totalLen <= 8000) {
    sample = text;
  } else {
    const headLen = 4000;
    const midLen = 2000;
    const tailLen = 2000;
    const head = text.substring(0, headLen);
    const midStart = Math.floor(totalLen / 2 - midLen / 2);
    const mid = text.substring(midStart, midStart + midLen);
    const tail = text.substring(totalLen - tailLen);
    sample = `${head}\n\n[... Ausschnitt aus der Mitte ...]\n\n${mid}\n\n[... Ende des Dokuments ...]\n\n${tail}`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du bist ein erfahrener juristischer Klassifizierer. Ein Klausel-Extraktor hat VERSUCHT, Vertragsklauseln aus dem folgenden Dokument zu extrahieren, und NICHTS gefunden. Entscheide jetzt final: Ist das ein echtes Vertragsdokument?

Antworte NUR mit JSON:
{
  "isLegalDocument": boolean,
  "documentType": string,
  "confidence": number (0-1),
  "reason": string (ein Satz auf Deutsch, was für/gegen Vertragsdokument spricht)
}

"isLegalDocument" ist TRUE NUR WENN:
- Das Dokument enthält explizite vertragliche Regelungen (Klauseln, Paragraphen, Artikel mit rechtsverbindlichem Inhalt)
- Beispiele: Mietvertrag, Arbeitsvertrag, AGB, Datenschutzerklärung mit Regelwerk, NDA mit Pflichten, Widerrufsbelehrung, Versicherungsbedingungen, Police mit Klauseln

"isLegalDocument" ist FALSE FÜR:
- Werbematerial, Broschüren, Flyer, Produktvorstellungen (auch wenn sie das Wort "Vertrag" enthalten)
- Artikel, Berichte, Analysen, Blog-Posts, Whitepaper über rechtliche Themen
- Rechnungen, Quittungen, Belege, Kontoauszüge, Gehaltsabrechnungen
- Lieferscheine, Bestellbestätigungen ohne Vertragsklauseln
- Briefe, Anschreiben, Infoschreiben ohne Regelwerk
- Formulare ohne vertragliche Klausel-Struktur
- Gescannte Bilder mit OCR-Fehlern (unlesbar/fragmentarisch)
- Protokolle, Notizen, Zusammenfassungen

WICHTIG: Wenn der Extraktor nichts fand, ist die Wahrscheinlichkeit hoch, dass es KEIN echtes Vertragsdokument ist. Sei streng — im Zweifel FALSE. Nur TRUE wenn das Dokument offensichtlich juristische Regelungen enthält.

"documentType" ist ein kurzer deutscher Begriff (z.B. "Factoring-Werbung", "Mietvertrag", "Broschüre").`
        },
        {
          role: 'user',
          content: `Dokumentauszug (${totalLen} Zeichen gesamt):\n\n---\n${sample}\n---`
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    return {
      suitable: !!parsed.isLegalDocument,
      documentType: parsed.documentType || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      reason: parsed.reason || (parsed.isLegalDocument ? 'Rechtsdokument erkannt' : 'Dokument enthält keine vertraglichen Regelungen'),
      source: 'gpt'
    };
  } catch (err) {
    console.warn('[Document Gate] forceGptClassify fehlgeschlagen, fail-open:', err.message);
    return {
      suitable: true,
      documentType: null,
      confidence: 0.5,
      reason: 'Klassifizierung nicht möglich',
      source: 'error'
    };
  }
}

module.exports = {
  checkDocumentSuitability,
  forceGptClassify,
  GATE_ENABLED
};

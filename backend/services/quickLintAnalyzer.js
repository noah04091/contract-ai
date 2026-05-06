// backend/services/quickLintAnalyzer.js
// Quick-Lint: Pro-Klausel juristische Bewertung in EINEM GPT-Call
//
// Pipeline:
//   1. clauseParser.parseContract() — extrahiert Klauseln + lokale Keyword-Risk-Bewertung (0 API-Calls)
//   2. EIN GPT-4o-Call mit JSON-Mode für ALLE Klauseln (statt N Calls pro Klausel)
//   3. Bei GPT-Fehler/Timeout → Fallback auf reine Keyword-Bewertung von clauseParser
//
// Output: pro Klausel { id, number, title, originalText, riskLevel, weakness, bghCite, optimizedSuggestion }

const { OpenAI } = require('openai');
const clauseParser = require('./legalLens/clauseParser');
const { postProcess } = require('./legalLens/clausePostProcessor');

// Lazy-Init: erst beim ersten Aufruf instantiieren — verhindert Crash beim require()
// falls OPENAI_API_KEY (noch) nicht gesetzt ist (z.B. in Tests, Module-Loading-Phase).
let _openai = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// Timeout für GPT-Call (35 s) — etwas Puffer zur Express-Default-Timeout
const GPT_TIMEOUT_MS = 35000;
// Maximale Klauseln pro Call — über 30 wird's für ein einziges JSON zu groß
const MAX_CLAUSES_PER_CALL = 30;

/**
 * Hauptfunktion: bewertet alle Klauseln eines Vertrags juristisch.
 *
 * @param {string} contractText - Der vollständige Vertragstext
 * @param {string} contractType - Vertragstyp (z.B. "mietvertrag", "arbeitsvertrag")
 * @returns {Promise<{success, clauses, score, totalClauses, criticalCount, warningCount, okCount, fromKeywordsOnly, generatedAt}>}
 */
async function analyzeClauses(contractText, contractType) {
  if (!contractText || typeof contractText !== 'string' || contractText.trim().length < 50) {
    throw new Error('Vertragstext ist zu kurz oder leer.');
  }

  // 1) Klauseln extrahieren (lokal, keine Kosten)
  const parsed = clauseParser.parseContract(contractText, { detectRisk: true });
  let localClauses = (parsed?.clauses || []).filter(c => c?.text && c.text.length > 0);

  // 1b) Post-Processing: bewährte Filter aus LegalLens wiederverwenden
  // (Stammdaten/Parteien-Block, Signaturen, Duplikate, leere Titel etc.)
  if (localClauses.length > 0) {
    const adapted = localClauses.map(c => ({ ...c, title: c.sectionTitle, number: c.id }));
    const { clauses: cleaned, stats: ppStats } = postProcess(adapted, contractText);
    const removed = adapted.length - cleaned.length;
    if (removed > 0) {
      const removedKeys = Object.entries(ppStats)
        .filter(([k, v]) => v > 0 && k !== 'input' && k !== 'output')
        .map(([k, v]) => `${k}=${v}`).join(', ');
      console.log(`[QuickLint] PostProcess: ${adapted.length} → ${cleaned.length} Klauseln (${removedKeys})`);
    }
    localClauses = cleaned;
  }

  // 1c) Generate-spezifischer Filter: der "zwischen X und Y wird folgender … geschlossen"-
  // Header-Block, den unsere generierten Verträge an Stelle 1 haben. stripPartyData in
  // postProcess greift hier nicht, weil der Block nach Line-Joining nur 2 Adress-Signale
  // hat (signalCount-Schwelle: 4). Sehr enges Pattern → keine False Positives.
  if (localClauses.length > 0) {
    const beforeIntro = localClauses.length;
    localClauses = localClauses.filter(c => !isPartiesIntroBlock(c));
    if (localClauses.length < beforeIntro) {
      console.log(`[QuickLint] PartiesIntroFilter: ${beforeIntro - localClauses.length} Header-Block(s) entfernt`);
    }
  }

  if (localClauses.length === 0) {
    return {
      success: true,
      clauses: [],
      score: 10,
      totalClauses: 0,
      criticalCount: 0,
      warningCount: 0,
      okCount: 0,
      fromKeywordsOnly: false,
      generatedAt: new Date().toISOString()
    };
  }

  // 1d) Eindeutige Quick-Lint-IDs (qlId) zuweisen, damit das GPT-Response-Mapping
  // verlässlich ist. clauseParser vergibt Sub-Sektion-IDs aus Pattern-Matches
  // (z.B. "1", "2"), die mehrfach pro Vertrag vorkommen können — find() würde
  // sonst das erste Match auf alle Klauseln mit gleicher id mappen (Live-Bug:
  // 3 Klauseln zeigten dieselbe Kaution-Schwäche, weil id="1" 5x vorkam).
  localClauses = localClauses.map((c, idx) => ({ ...c, qlId: `qc-${idx + 1}` }));

  // Bei zu vielen Klauseln: nur die ersten MAX_CLAUSES_PER_CALL bewerten — Rest bekommt Keyword-only
  const clausesForGpt = localClauses.slice(0, MAX_CLAUSES_PER_CALL);

  // 2) GPT-Call versuchen
  let gptAssessments = null;
  try {
    gptAssessments = await callGptForAssessment(clausesForGpt, contractType);
  } catch (err) {
    console.warn('[QuickLint] GPT-Call fehlgeschlagen, Fallback auf Keyword-Bewertung:', err.message);
  }

  // 3) GPT- und Keyword-Daten zusammenführen — ein klares Schema pro Klausel.
  // Mapping primär über qlId (eindeutig), Fallback über Index (falls GPT die
  // Reihenfolge wahrt aber IDs verändert).
  const merged = localClauses.map((clause, idx) => {
    const gptItem = gptAssessments?.find(a => a.id === clause.qlId) || gptAssessments?.[idx] || null;
    const fallback = mapKeywordRiskToAssessment(clause);
    if (gptItem) {
      return {
        id: clause.qlId,
        index: idx,
        number: extractClauseNumber(clause),
        title: sanitizeTitle(clause.sectionTitle, idx),
        originalText: clause.text,
        riskLevel: normalizeRiskLevel(gptItem.riskLevel) || fallback.riskLevel,
        weakness: trimOrNull(gptItem.weakness),
        bghCite: trimOrNull(gptItem.bghCite),
        optimizedSuggestion: trimOrNull(gptItem.optimizedSuggestion)
      };
    }
    return {
      id: clause.qlId,
      index: idx,
      number: extractClauseNumber(clause),
      title: sanitizeTitle(clause.sectionTitle, idx),
      originalText: clause.text,
      ...fallback
    };
  });

  // Statistik
  const criticalCount = merged.filter(c => c.riskLevel === 'high').length;
  const warningCount = merged.filter(c => c.riskLevel === 'medium').length;
  const okCount = merged.filter(c => c.riskLevel === 'low').length;
  const score = computeScore(merged);

  return {
    success: true,
    clauses: merged,
    score,
    totalClauses: merged.length,
    criticalCount,
    warningCount,
    okCount,
    fromKeywordsOnly: !gptAssessments,
    generatedAt: new Date().toISOString()
  };
}

/**
 * GPT-Call mit JSON-Mode — ALLE Klauseln in einem einzigen Aufruf bewerten.
 */
async function callGptForAssessment(clauses, contractType) {
  const systemPrompt = `Du bist Fachanwalt für deutsches Vertragsrecht (BGB) und prüfst Klauseln einzeln auf juristische Schwächen.

Für JEDE Klausel im Input gib genau diese Felder zurück:
- "id": Die ID exakt wie im Input
- "riskLevel": "low" | "medium" | "high"
- "weakness": Ein Satz, der die juristische Schwäche erklärt — oder null wenn die Klausel sauber ist
- "bghCite": Konkretes BGH-Aktenzeichen (z.B. "BGH NJW 2009, 1408") falls SICHER bekannt — sonst NULL. ERFINDE NIEMALS Aktenzeichen!
- "optimizedSuggestion": Eine verbesserte, BGH-konforme Formulierung der Klausel — oder null wenn nicht nötig

WICHTIGE REGELN:
- Antworte AUSSCHLIESSLICH mit gültigem JSON: { "clauses": [...] }
- Bei Unsicherheit über BGH-Urteile: bghCite = null. Lieber zugeben als raten.
- Bei sauberen Klauseln: riskLevel = "low", weakness = null, optimizedSuggestion = null
- Sprache: Deutsch.
- Berücksichtige den Vertragstyp: ${contractType}`;

  const clauseList = clauses.map((c, idx) => ({
    id: c.qlId || c.id || `clause-${idx + 1}`,
    number: extractClauseNumber(c),
    title: c.sectionTitle || `Abschnitt ${idx + 1}`,
    text: c.text
  }));

  const userPrompt = `Vertragstyp: ${contractType}

Bewerte folgende Klauseln juristisch:

${JSON.stringify(clauseList, null, 2)}

Gib zurück: { "clauses": [{ id, riskLevel, weakness, bghCite, optimizedSuggestion }, ...] }`;

  const completion = await callWithTimeout(
    () => getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }),
    GPT_TIMEOUT_MS
  );

  const content = completion?.choices?.[0]?.message?.content;
  if (!content) throw new Error('GPT-Response leer.');

  const parsed = JSON.parse(content);
  const arr = Array.isArray(parsed?.clauses) ? parsed.clauses : null;
  if (!arr) throw new Error('GPT-Response: clauses-Array fehlt.');

  return arr;
}

// Promise.race für Timeout-Schutz
function callWithTimeout(fn, timeoutMs) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('GPT-Timeout')), timeoutMs))
  ]);
}

// Helpers

// Trifft den Stammdaten-Header-Block ("zwischen X und Y wird folgender ... geschlossen"),
// der bei unseren GPT-generierten Verträgen Klausel 1 ist. Sehr eng:
// muss MIT "zwischen" anfangen UND "wird folgender ... geschlossen/abgeschlossen/vereinbart"
// enthalten — beides zusammen kommt in echten juristischen Klauseln praktisch nicht vor.
function isPartiesIntroBlock(clause) {
  const text = (clause?.text || '').trim();
  if (!text) return false;
  if (!/^zwischen\b/i.test(text)) return false;
  if (!/wird\s+folgender.{0,150}\b(geschlossen|abgeschlossen|vereinbart)\b/i.test(text)) return false;
  return true;
}

// Wenn der vom Parser gelieferte sectionTitle ein ganzer Satz oder unsinnig ist
// (endet mit Punkt, beginnt klein, > 70 Zeichen) → Fallback auf "Abschnitt N".
// Akzeptiert: "§ 1 Mietzeit", "Schönheitsreparaturen", "Kaution", etc.
function sanitizeTitle(rawTitle, idx) {
  if (!rawTitle || typeof rawTitle !== 'string') return `Abschnitt ${idx + 1}`;
  const trimmed = rawTitle.trim();
  if (!trimmed) return `Abschnitt ${idx + 1}`;
  if (trimmed.length > 70) return `Abschnitt ${idx + 1}`;
  if (/[.!?]\s*$/.test(trimmed)) return `Abschnitt ${idx + 1}`;
  if (!/^[§A-ZÄÖÜ]/.test(trimmed)) return `Abschnitt ${idx + 1}`;
  return trimmed;
}

function extractClauseNumber(clause) {
  if (!clause) return '';
  if (clause.id && /§\s*\d+[a-z]?/i.test(clause.id)) return clause.id;
  if (clause.sectionTitle) {
    const m = clause.sectionTitle.match(/§\s*\d+[a-z]?/i);
    if (m) return m[0];
  }
  return '';
}

function normalizeRiskLevel(level) {
  if (!level) return null;
  const lvl = String(level).toLowerCase().trim();
  if (['high', 'hoch', 'kritisch', 'red'].includes(lvl)) return 'high';
  if (['medium', 'mittel', 'moderat', 'yellow', 'amber'].includes(lvl)) return 'medium';
  if (['low', 'gering', 'niedrig', 'okay', 'ok', 'green'].includes(lvl)) return 'low';
  return null;
}

function trimOrNull(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed || ['null', 'none', 'keine', 'n/a', '-'].includes(trimmed.toLowerCase())) return null;
  return trimmed;
}

// Wenn GPT nicht greift: Keyword-basierte Bewertung von clauseParser nutzen
function mapKeywordRiskToAssessment(clause) {
  const level = clause?.riskLevel || 'low';
  return {
    riskLevel: level,
    weakness: level === 'high'
      ? `Mögliches Risiko durch Begriffe wie: ${(clause.riskKeywords || []).slice(0, 3).join(', ')}.`
      : level === 'medium'
        ? `Erhöhte Aufmerksamkeit empfohlen (${(clause.riskKeywords || []).slice(0, 2).join(', ') || 'mehrdeutige Formulierung'}).`
        : null,
    bghCite: null,
    optimizedSuggestion: null
  };
}

// Gesamt-Score 0-10 basierend auf Risiko-Verteilung
function computeScore(clauses) {
  if (!clauses.length) return 10;
  let totalPenalty = 0;
  for (const c of clauses) {
    if (c.riskLevel === 'high') totalPenalty += 2;
    else if (c.riskLevel === 'medium') totalPenalty += 0.7;
  }
  const raw = 10 - (totalPenalty / clauses.length) * 5;
  return Math.max(0, Math.min(10, Math.round(raw * 10) / 10));
}

module.exports = {
  analyzeClauses
};

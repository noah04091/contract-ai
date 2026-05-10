/**
 * GPT-basiertes Batch Risk-Assessment + Kategorisierung + Titel-Generierung
 *
 * Bewertet ALLE Klauseln eines Vertrags mit gpt-4o.
 * Bei vielen Klauseln (>30) automatisches Batching mit parallelen Requests.
 *
 * KONSISTENZ-DESIGN: Nutzt dieselben Konstanten wie analyzeClause
 * (PERSPECTIVES, DOCUMENT_TYPE_CONTEXTS, RISK_SCORE_SCALE) damit Liste-Bewertung
 * und Detail-Bewertung möglichst gleich ausfallen.
 *
 * Liefert pro Klausel:
 * - riskLevel (low/medium/high) — passt zu Score laut RISK_SCORE_SCALE
 * - riskScore (0-100)
 * - riskReason (1 Satz, konkret)
 * - category (frei gewählter deutscher Begriff)
 * - suggestedTitle (nur wenn Originalklausel keinen Titel hat)
 *
 * @version 3.0.0 — gpt-4o + Batching + Konsistenz mit analyzeClause
 */

const OpenAI = require('openai');
const {
  RISK_SCORE_SCALE_PROMPT_BLOCK,
  PERSPECTIVES,
  buildContextBlock
} = require('./legalLensConstants');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ──────────────────────────────────────────────────────────────────
// KONSTANTEN
// ──────────────────────────────────────────────────────────────────
const MODEL = 'gpt-4o';
const TEMPERATURE = 0.3;             // identisch zu analyzeClause
const PREVIEW_CHARS = 500;           // Kontext pro Klausel (vorher 300)
const BATCH_SIZE = 30;               // Klauseln pro GPT-Call
const PARALLEL_BATCHES = 3;          // gleichzeitige Calls (OpenAI Rate-Limit-safe)
const MAX_TOKENS_PER_BATCH = 4096;   // pro Batch
const TIMEOUT_MS = 45000;            // 45s pro Batch

/**
 * Hauptfunktion: Bewertet alle Klauseln. Bei >30 Klauseln automatisches Batching.
 *
 * @param {Array<{number: string|null, title: string|null, text: string}>} clauses
 * @param {object} [options]
 * @param {string} [options.perspective='contractor'] — Perspektive für Bewertung
 * @param {string} [options.industry='general']       — Branche für Kontext
 * @param {string} [options.documentType='general_document'] — DocType für Kontext
 * @returns {Promise<Array<{riskLevel, riskScore, riskReason, category, suggestedTitle}|null>>}
 *   Array mit gleicher Länge wie input. null für Klauseln die nicht bewertet werden konnten.
 */
async function assessRiskBatch(clauses, options = {}) {
  if (!clauses || clauses.length === 0) return [];

  const {
    perspective = 'contractor',
    industry = 'general',
    documentType = 'general_document'
  } = options;

  const startedAt = Date.now();

  // Bei kleinen Verträgen: Single-Call
  if (clauses.length <= BATCH_SIZE) {
    const result = await assessRiskBatchSingle(clauses, { perspective, industry, documentType });
    const elapsedMs = Date.now() - startedAt;
    console.log(`[RiskAssessor] Single-Call: ${clauses.length} Klauseln in ${elapsedMs}ms (gpt-4o, ${perspective}/${industry}/${documentType})`);
    return result;
  }

  // Bei großen Verträgen: Batching
  const batches = [];
  for (let i = 0; i < clauses.length; i += BATCH_SIZE) {
    batches.push({ offset: i, items: clauses.slice(i, i + BATCH_SIZE) });
  }

  console.log(`[RiskAssessor] Batching: ${clauses.length} Klauseln in ${batches.length} Batches à ${BATCH_SIZE}, ${PARALLEL_BATCHES} parallel`);

  const results = new Array(clauses.length).fill(null);

  // Wellen-Verarbeitung: PARALLEL_BATCHES gleichzeitig
  for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
    const wave = batches.slice(i, i + PARALLEL_BATCHES);
    const settled = await Promise.allSettled(
      wave.map(b =>
        assessRiskBatchSingle(b.items, { perspective, industry, documentType })
          .then(data => ({ offset: b.offset, data }))
      )
    );

    for (const s of settled) {
      if (s.status === 'fulfilled' && Array.isArray(s.value.data)) {
        s.value.data.forEach((r, j) => {
          if (r) results[s.value.offset + j] = r;
        });
      } else {
        const reason = s.status === 'rejected' ? (s.reason?.message || s.reason) : 'unknown';
        console.warn(`[RiskAssessor] Batch fehlgeschlagen: ${reason} — Klauseln bleiben null (Fallback auf Schnell-Werte)`);
      }
    }
  }

  const elapsedMs = Date.now() - startedAt;
  const success = results.filter(r => r !== null).length;
  console.log(`[RiskAssessor] Batching fertig: ${success}/${clauses.length} bewertet in ${elapsedMs}ms (gpt-4o, ${perspective})`);

  return results;
}

// ──────────────────────────────────────────────────────────────────
// SINGLE BATCH — ein GPT-Call für bis zu BATCH_SIZE Klauseln
// ──────────────────────────────────────────────────────────────────
async function assessRiskBatchSingle(clauses, options) {
  if (!clauses || clauses.length === 0) return [];

  const { perspective, industry, documentType } = options;
  const perspectiveConfig = PERSPECTIVES[perspective] || PERSPECTIVES.contractor;
  const contextBlock = buildContextBlock(industry, documentType);

  // Klausel-Zusammenfassungen für den Prompt
  const clauseSummaries = clauses.map((c, idx) => {
    const label = c.number && c.title
      ? `${c.number} - ${c.title}`
      : c.number || c.title || `Klausel ${idx + 1}`;
    const preview = (c.text || '').substring(0, PREVIEW_CHARS).trim();
    const hasTitle = !!(c.title && c.title.trim().length > 3);
    return `[${idx}] ${label}${hasTitle ? '' : ' (KEIN TITEL)'}: "${preview}"`;
  }).join('\n');

  const systemPrompt = `${perspectiveConfig.systemPrompt}

${contextBlock}

${RISK_SCORE_SCALE_PROMPT_BLOCK}

Du bewertest mehrere Klauseln eines einzelnen Dokuments in EINEM Durchgang.
Wende denselben Maßstab an, als würdest du jede Klausel einzeln analysieren.

Du erhältst Klauseln mit einer Nummer in eckigen Klammern, z.B. [0], [1], [2]. Du MUSST für JEDE Klausel genau diese Nummer als "clauseIndex" zurückgeben.

PRO KLAUSEL liefere:
1. "clauseIndex": Die Nummer aus den eckigen Klammern [X] — MUSS exakt übereinstimmen
2. "riskLevel": "low", "medium" oder "high" (passend zur RISK-SCORE-SKALA oben)
3. "riskScore": 0-100 (passend zur RISK-SCORE-SKALA oben)
4. "riskReason": 1 konkreter Satz, WARUM dieses Risiko besteht — beziehe dich auf den spezifischen Inhalt der Klausel
5. "category": Ein passender deutscher Oberbegriff der das Thema der Klausel beschreibt (z.B. "Haftung & Gewährleistung", "Vergütung & Zahlung", "Vertraulichkeit", "Laufzeit & Kündigung"). Wähle frei was am besten passt.
6. "suggestedTitle": NUR für Klauseln mit "(KEIN TITEL)" — generiere 3-5 Wörter. Für Klauseln MIT Titel: null

Du MUSST exakt ${clauses.length} Einträge liefern — einen pro Klausel, keine auslassen.
Antworte NUR mit einem JSON-Objekt: { "results": [...] }, keine Erklärungen.`;

  const userPrompt = `Bewerte diese ${clauses.length} Klauseln:\n\n${clauseSummaries}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS_PER_BATCH,
      response_format: { type: 'json_object' }
    }, { timeout: TIMEOUT_MS });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[RiskAssessor] Leere GPT-Antwort');
      return new Array(clauses.length).fill(null);
    }

    const parsed = JSON.parse(content);

    // Akzeptiere verschiedene GPT-Output-Strukturen
    const rawResults = Array.isArray(parsed)
      ? parsed
      : parsed.results || parsed.clauses || parsed.assessments || Object.values(parsed)[0];

    if (!Array.isArray(rawResults)) {
      console.warn('[RiskAssessor] Unerwartetes Format:', typeof rawResults);
      return new Array(clauses.length).fill(null);
    }

    // Index-sicheres Mapping per clauseIndex
    const indexed = new Array(clauses.length).fill(null);

    for (const r of rawResults) {
      const ci = parseInt(r.clauseIndex ?? r.index ?? -1, 10);
      const target = (ci >= 0 && ci < clauses.length) ? ci : -1;

      const normalized = {
        riskLevel: normalizeRiskLevel(r.riskLevel || r.risk || 'low'),
        riskScore: clampScore(r.riskScore ?? r.score ?? 0),
        riskReason: r.riskReason || r.reason || null,
        category: cleanCategory(r.category || r.cat || null),
        suggestedTitle: r.suggestedTitle || r.title || null
      };

      if (target >= 0) {
        indexed[target] = normalized;
      }
    }

    // Fallback: Wenn GPT kein clauseIndex liefert, sequenziell zuordnen
    const assignedCount = indexed.filter(x => x !== null).length;
    if (assignedCount === 0 && rawResults.length > 0) {
      console.warn(`[RiskAssessor] GPT lieferte kein clauseIndex — Fallback auf sequenzielles Mapping`);
      for (let i = 0; i < Math.min(rawResults.length, clauses.length); i++) {
        const r = rawResults[i];
        indexed[i] = {
          riskLevel: normalizeRiskLevel(r.riskLevel || r.risk || 'low'),
          riskScore: clampScore(r.riskScore ?? r.score ?? 0),
          riskReason: r.riskReason || r.reason || null,
          category: cleanCategory(r.category || r.cat || null),
          suggestedTitle: r.suggestedTitle || r.title || null
        };
      }
    }

    return indexed;

  } catch (err) {
    console.error(`[RiskAssessor] GPT-Fehler:`, err.message);
    return new Array(clauses.length).fill(null);
  }
}

// ──────────────────────────────────────────────────────────────────
// HELFER
// ──────────────────────────────────────────────────────────────────

/**
 * Normalisiert riskLevel-Strings auf "low" | "medium" | "high"
 * Akzeptiert deutsche und englische Varianten.
 */
function normalizeRiskLevel(level) {
  const l = (level || '').toLowerCase().trim();
  if (l === 'high' || l === 'hoch' || l === 'kritisch' || l === 'critical') return 'high';
  if (l === 'medium' || l === 'mittel' || l === 'moderate') return 'medium';
  return 'low';
}

/**
 * Begrenzt Score auf 0-100 Integer-Bereich
 */
function clampScore(score) {
  const n = parseInt(score, 10);
  if (isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * Bereinigt den Kategorie-String von GPT.
 */
function cleanCategory(cat) {
  if (!cat) return null;
  const cleaned = cat.trim();
  if (!cleaned) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

module.exports = {
  assessRiskBatch
};

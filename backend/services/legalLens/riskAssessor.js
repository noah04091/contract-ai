/**
 * GPT-basiertes Batch Risk-Assessment + Kategorisierung + Titel-Generierung
 *
 * Ein einziger GPT-Call bewertet ALLE Klauseln eines Vertrags auf einmal.
 * GPT bestimmt Risiko, Kategorie und Titel FREI — keine vordefinierten Listen.
 *
 * Liefert pro Klausel:
 * - riskLevel (low/medium/high)
 * - riskScore (0-100)
 * - riskReason (1 Satz, konkret)
 * - category (frei gewählter deutscher Begriff, z.B. "Haftung & Gewährleistung")
 * - suggestedTitle (nur wenn Originalklausel keinen Titel hat)
 *
 * @version 2.0.0 — Freiform-Kategorien, keine vordefinierten Listen
 */

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Batch-Bewertung aller Klauseln eines Vertrags.
 *
 * @param {Array<{number: string|null, title: string|null, text: string}>} clauses
 * @returns {Promise<Array<{riskLevel: string, riskScore: number, riskReason: string, category: string, suggestedTitle: string|null}>>}
 */
async function assessRiskBatch(clauses) {
  if (!clauses || clauses.length === 0) return [];

  const startedAt = Date.now();

  // Klausel-Zusammenfassungen für den Prompt erstellen
  // Titel + erste 300 Zeichen Text — genug Kontext, minimale Token-Kosten
  const clauseSummaries = clauses.map((c, idx) => {
    const label = c.number && c.title
      ? `${c.number} - ${c.title}`
      : c.number || c.title || `Klausel ${idx + 1}`;
    const preview = (c.text || '').substring(0, 300).trim();
    const hasTitle = !!(c.title && c.title.trim().length > 3);
    return `[${idx}] ${label}${hasTitle ? '' : ' (KEIN TITEL)'}: "${preview}"`;
  }).join('\n');

  const systemPrompt = `Du bist ein erfahrener deutscher Vertragsanwalt. Bewerte jede Klausel aus Sicht des VERTRAGSPARTNERS (nicht des Erstellers/Verwenders).

WICHTIG: Du erhältst Klauseln mit einer Nummer in eckigen Klammern, z.B. [0], [1], [2]. Du MUSST für JEDE Klausel genau diese Nummer als "clauseIndex" zurückgeben.

PRO KLAUSEL liefere:
1. "clauseIndex": Die Nummer aus den eckigen Klammern [X] — MUSS exakt übereinstimmen
2. "riskLevel": "low", "medium" oder "high"
3. "riskScore": 0-100 (low: 0-24, medium: 25-59, high: 60-100)
4. "riskReason": 1 konkreter Satz, WARUM dieses Risiko besteht — beziehe dich auf den spezifischen Inhalt der Klausel
5. "category": Ein passender deutscher Oberbegriff der das Thema der Klausel beschreibt (z.B. "Haftung & Gewährleistung", "Vergütung & Zahlung", "Vertraulichkeit", "Laufzeit & Kündigung"). Wähle frei was am besten passt — jeder Vertrag ist anders.
6. "suggestedTitle": NUR für Klauseln mit "(KEIN TITEL)" — generiere 3-5 Wörter. Für Klauseln MIT Titel: null

BEWERTUNGSMASSSTAB:
- "high": Klausel kann dem Vertragspartner erheblich schaden — einseitige Pflichten, unverhältnismäßige Sanktionen, Haftungsrisiken, Verzicht auf Rechte
- "medium": Klausel verdient besondere Aufmerksamkeit — ungewöhnliche Bedingungen, lange Bindungen, weitreichende Pflichten
- "low": Marktübliche Standardklausel ohne besonderes Risiko

Du MUSST exakt ${clauses.length} Einträge liefern — einen pro Klausel, keine auslassen.
Antworte NUR mit einem JSON-Array, keine Erklärungen.`;

  const userPrompt = `Bewerte diese ${clauses.length} Klauseln:\n\n${clauseSummaries}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: Math.min(clauses.length * 120 + 200, 4096),
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[RiskAssessor] Leere GPT-Antwort');
      return null;
    }

    const parsed = JSON.parse(content);

    // GPT kann das Array direkt oder in einem Wrapper-Objekt liefern
    const results = Array.isArray(parsed)
      ? parsed
      : parsed.clauses || parsed.results || parsed.assessments || Object.values(parsed)[0];

    if (!Array.isArray(results)) {
      console.warn('[RiskAssessor] Unerwartetes Format:', typeof results);
      return null;
    }

    const elapsedMs = Date.now() - startedAt;
    const tokens = response.usage?.total_tokens || 0;

    // Statistik loggen
    const riskCounts = { high: 0, medium: 0, low: 0 };
    results.forEach(r => { if (r.riskLevel || r.risk) riskCounts[r.riskLevel || r.risk]++; });
    console.log(`[RiskAssessor] ${clauses.length} Klauseln in ${elapsedMs}ms (${tokens} tokens) — High: ${riskCounts.high}, Medium: ${riskCounts.medium}, Low: ${riskCounts.low}`);

    if (results.length !== clauses.length) {
      console.warn(`[RiskAssessor] GPT lieferte ${results.length} statt ${clauses.length} Ergebnisse — verwende clauseIndex-Mapping`);
    }

    // Index-sicheres Mapping: GPT-Ergebnisse per clauseIndex zuordnen
    // Schützt gegen verschobene Zuordnungen wenn GPT Klauseln auslässt
    const indexed = new Array(clauses.length).fill(null);

    for (const r of results) {
      const ci = parseInt(r.clauseIndex ?? r.index ?? -1, 10);
      const target = (ci >= 0 && ci < clauses.length) ? ci : -1;

      const normalized = {
        riskLevel: normalizeRiskLevel(r.riskLevel || r.risk || 'low'),
        riskScore: clampScore(r.riskScore || r.score || 0),
        riskReason: r.riskReason || r.reason || null,
        category: cleanCategory(r.category || r.cat || null),
        suggestedTitle: r.suggestedTitle || r.title || null
      };

      if (target >= 0) {
        indexed[target] = normalized;
      }
    }

    // Fallback: Wenn GPT kein clauseIndex liefert (alle null), sequenziell zuordnen
    const assignedCount = indexed.filter(x => x !== null).length;
    if (assignedCount === 0 && results.length > 0) {
      console.warn(`[RiskAssessor] GPT lieferte kein clauseIndex — Fallback auf sequenzielles Mapping`);
      for (let i = 0; i < Math.min(results.length, clauses.length); i++) {
        const r = results[i];
        indexed[i] = {
          riskLevel: normalizeRiskLevel(r.riskLevel || r.risk || 'low'),
          riskScore: clampScore(r.riskScore || r.score || 0),
          riskReason: r.riskReason || r.reason || null,
          category: cleanCategory(r.category || r.cat || null),
          suggestedTitle: r.suggestedTitle || r.title || null
        };
      }
    }

    return indexed;

  } catch (err) {
    console.error(`[RiskAssessor] GPT-Fehler:`, err.message);
    return null; // Caller fällt auf Keyword-Assessment zurück
  }
}

function normalizeRiskLevel(level) {
  const l = (level || '').toLowerCase().trim();
  if (l === 'high' || l === 'hoch') return 'high';
  if (l === 'medium' || l === 'mittel') return 'medium';
  return 'low';
}

function clampScore(score) {
  const n = parseInt(score, 10);
  if (isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * Bereinigt den Kategorie-String von GPT.
 * Kein Mapping auf vordefinierte Keys — der String wird direkt verwendet.
 */
function cleanCategory(cat) {
  if (!cat) return null;
  // Trim und erste Buchstaben groß (falls GPT lowercase liefert)
  const cleaned = cat.trim();
  if (!cleaned) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

module.exports = {
  assessRiskBatch
};

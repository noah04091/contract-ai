/**
 * GPT-basiertes Batch Risk-Assessment + Kategorisierung + Titel-Generierung
 *
 * Ersetzt das keyword-basierte assessClauseRisk() für die initiale Risikobewertung.
 * Ein einziger GPT-Call bewertet ALLE Klauseln eines Vertrags auf einmal.
 *
 * Liefert pro Klausel:
 * - riskLevel (low/medium/high)
 * - riskScore (0-100)
 * - riskReason (1 Satz, konkret)
 * - category (aus 13 definierten Kategorien)
 * - suggestedTitle (nur wenn Originalklausel keinen Titel hat)
 *
 * @version 1.0.0
 */

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Verfügbare Kategorien — Frontend mappt Keys auf deutsche Labels
const CATEGORIES = [
  'praembel',        // Präambel & Allgemeines
  'leistung',        // Leistung & Gegenstand
  'verguetung',      // Vergütung & Zahlung
  'laufzeit',        // Laufzeit & Kündigung
  'haftung',         // Haftung & Gewährleistung
  'vertraulichkeit', // Vertraulichkeit & Datenschutz
  'ip',              // Geistiges Eigentum
  'sanktionen',      // Sanktionen & Vertragsstrafen
  'sicherheiten',    // Sicherheiten & Abtretung
  'mitwirkung',      // Mitwirkungs- & Informationspflichten
  'offenlegung',     // Offenlegung & Prüfrechte
  'schluss',         // Schlussbestimmungen
  'sonstiges'        // Sonstiges
];

const CATEGORY_LIST_FOR_PROMPT = CATEGORIES.join(', ');

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

RISIKO-STUFEN:
- "high" (score 60-100): Kann erheblich schaden. Beispiele: Vertragsstrafen nach billigem Ermessen, verschuldensunabhängige Haftung/Garantien, Globalzessionen, unbeschränkte Freistellungspflichten, einseitige Änderungs-/Kündigungsrechte, Reverse-Engineering-Verbote mit Strafandrohung, Aufrechnungsverbote, Verzicht auf Einreden.
- "medium" (score 25-59): Verdient Aufmerksamkeit. Beispiele: Lange Kündigungsfristen, automatische Verlängerungen, weitreichende Geheimhaltung >3 Jahre, Informationspflichten bei Verdacht, Sicherungsabtretungen, Wettbewerbsverbote, Rückgabe-/Löschpflichten mit Bestätigungspflicht.
- "low" (score 0-24): Marktüblich, Standardklausel ohne besonderes Risiko. Beispiele: Präambeln, Definitionen, Gerichtsstandsvereinbarungen, Salvatorische Klauseln, Standard-Datenschutzhinweise.

KATEGORIEN (wähle genau eine pro Klausel):
${CATEGORY_LIST_FOR_PROMPT}

REGELN:
- Bewerte JEDE Klausel einzeln
- riskReason: 1 konkreter Satz, WARUM dieses Risiko besteht (nicht generisch!)
- category: Wähle die passendste Kategorie
- suggestedTitle: NUR für Klauseln mit "(KEIN TITEL)" — generiere 3-5 Wörter. Für Klauseln MIT Titel: null
- Antworte NUR mit einem JSON-Array, keine Erklärungen`;

  const userPrompt = `Bewerte diese ${clauses.length} Klauseln:\n\n${clauseSummaries}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: Math.min(clauses.length * 80 + 200, 4000),
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

    // Normalisierung: GPT-Output auf einheitliches Format bringen
    return results.map((r, idx) => ({
      riskLevel: normalizeRiskLevel(r.riskLevel || r.risk || 'low'),
      riskScore: clampScore(r.riskScore || r.score || 0),
      riskReason: r.riskReason || r.reason || null,
      category: normalizeCategory(r.category || r.cat || 'sonstiges'),
      suggestedTitle: r.suggestedTitle || r.title || null
    }));

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

function normalizeCategory(cat) {
  const c = (cat || '').toLowerCase().trim();
  if (CATEGORIES.includes(c)) return c;
  // Fuzzy-Match für häufige Varianten
  if (c.includes('präambel') || c.includes('allgemein')) return 'praembel';
  if (c.includes('leistung') || c.includes('gegenstand')) return 'leistung';
  if (c.includes('vergütung') || c.includes('zahlung') || c.includes('preis')) return 'verguetung';
  if (c.includes('laufzeit') || c.includes('kündigung') || c.includes('dauer')) return 'laufzeit';
  if (c.includes('haftung') || c.includes('gewähr')) return 'haftung';
  if (c.includes('vertraulich') || c.includes('datenschutz') || c.includes('geheim')) return 'vertraulichkeit';
  if (c.includes('eigentum') || c.includes('ip') || c.includes('urheberrecht') || c.includes('patent')) return 'ip';
  if (c.includes('strafe') || c.includes('sanktion') || c.includes('buße')) return 'sanktionen';
  if (c.includes('sicherheit') || c.includes('abtretung') || c.includes('zession') || c.includes('pfand')) return 'sicherheiten';
  if (c.includes('mitwirkung') || c.includes('information') || c.includes('mitteilung') || c.includes('pflicht')) return 'mitwirkung';
  if (c.includes('offenlegung') || c.includes('einsicht') || c.includes('prüf') || c.includes('audit')) return 'offenlegung';
  if (c.includes('schluss') || c.includes('salvator') || c.includes('gericht') || c.includes('recht')) return 'schluss';
  return 'sonstiges';
}

module.exports = {
  assessRiskBatch,
  CATEGORIES
};

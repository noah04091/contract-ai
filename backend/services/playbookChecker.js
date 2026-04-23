// backend/services/playbookChecker.js — Playbook-basierte Vertragspruefung
// Zwei Hauptfunktionen:
// 1. generateRules() — KI generiert Regeln basierend auf Vertragstyp/Rolle/Branche
// 2. checkContract() — Prueft Vertrag gegen Playbook-Regeln

const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// Constants
// ============================================
const MODEL = "gpt-4o";
const MAX_CONTRACT_CHARS = 80000; // ~20K tokens
const MAX_RULES_PER_CHECK = 20;
const CHECK_TIMEOUT = 120000; // 120s

// ============================================
// 1. REGEL-GENERIERUNG (Wizard)
// ============================================

/**
 * Generiert Playbook-Regeln basierend auf Kontext
 * @param {Object} params - { contractType, role, industry, additionalContext }
 * @returns {Promise<Array>} - Array von Regel-Objekten
 */
async function generateRules({ contractType, role, industry, additionalContext = "" }) {
  const roleLabel = role === "auftraggeber" ? "Auftraggeber (Besteller/Kaeufer)"
    : role === "auftragnehmer" ? "Auftragnehmer (Lieferant/Dienstleister)"
    : "Neutral (beide Seiten)";

  const industryLabel = getIndustryLabel(industry);

  const prompt = `Du bist ein erfahrener deutscher Wirtschaftsjurist.
Erstelle ein Pruef-Playbook mit 8-12 konkreten Anforderungen fuer folgendes Szenario:

VERTRAGSTYP: ${contractType}
PERSPEKTIVE: ${roleLabel}
BRANCHE: ${industryLabel}
${additionalContext ? `ZUSAETZLICHER KONTEXT: ${additionalContext}` : ""}

Jede Anforderung muss:
- Einen klaren, kurzen Titel haben (max 60 Zeichen)
- Eine praezise Beschreibung haben (1-2 Saetze, was genau geprueft wird)
- Einen messbaren Schwellenwert haben wenn moeglich (z.B. "max. 30 Tage", "nicht ueber 5%")
- Eine Kategorie haben aus: zahlung, haftung, kuendigung, gewaehrleistung, vertraulichkeit, datenschutz, eigentum, force_majeure, vertragsstrafe, laufzeit, abnahme, formvorschriften, gerichtsstand, sonstiges
- Eine Prioritaet haben: muss (Deal-Breaker), soll (Verhandlungspunkt), kann (Nice-to-have)

Fokussiere auf die wichtigsten Risiken und Schutzbeduerfnisse aus der Perspektive "${roleLabel}".
Beruecksichtige branchentypische Besonderheiten fuer "${industryLabel}".

Antworte NUR mit einem JSON-Array:
[
  {
    "title": "Kurzer Titel",
    "description": "Was genau geprueft wird",
    "category": "kategorie",
    "priority": "muss|soll|kann",
    "threshold": "Schwellenwert oder null"
  }
]`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "Du antwortest ausschliesslich mit validem JSON. Keine Erklaerungen, kein Markdown." },
      { role: "user", content: prompt }
    ],
    temperature: 0.4,
    max_tokens: 3000
  });

  const content = response.choices[0]?.message?.content || "[]";

  try {
    // JSON aus Antwort extrahieren (auch wenn in Markdown-Block)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("❌ [PLAYBOOK] Keine JSON-Array-Antwort:", content.substring(0, 200));
      return getDefaultRules(contractType, role);
    }
    const rules = JSON.parse(jsonMatch[0]);

    // Validierung
    return rules
      .filter(r => r.title && r.description)
      .map(r => ({
        title: String(r.title).substring(0, 200),
        description: String(r.description).substring(0, 1000),
        category: validCategory(r.category),
        priority: ["muss", "soll", "kann"].includes(r.priority) ? r.priority : "soll",
        threshold: r.threshold ? String(r.threshold).substring(0, 200) : ""
      }));
  } catch (err) {
    console.error("❌ [PLAYBOOK] JSON-Parse-Fehler:", err.message);
    return getDefaultRules(contractType, role);
  }
}

// ============================================
// 2. VERTRAGSPRUEFUNG (Check)
// ============================================

/**
 * Prueft einen Vertrag gegen Playbook-Regeln
 * @param {string} contractText - Extrahierter Vertragstext
 * @param {Array} rules - Array von Regel-Objekten (inkl. globale)
 * @param {Object} context - { contractName, role, contractType }
 * @returns {Promise<Object>} - { results: [], summary: {} }
 */
async function checkContract(contractText, rules, context = {}) {
  if (!contractText || contractText.trim().length < 50) {
    throw new Error("Vertragstext zu kurz fuer Pruefung");
  }

  if (!rules || rules.length === 0) {
    throw new Error("Keine Regeln fuer Pruefung vorhanden");
  }

  // Text kuerzen wenn noetig
  const truncatedText = contractText.length > MAX_CONTRACT_CHARS
    ? contractText.substring(0, MAX_CONTRACT_CHARS) + "\n[... Text gekuerzt ...]"
    : contractText;

  // Max Regeln begrenzen
  const activeRules = rules.slice(0, MAX_RULES_PER_CHECK);

  const rulesForPrompt = activeRules.map((r, i) => {
    const parts = [`${i + 1}. "${r.title}"`];
    parts.push(`   Beschreibung: ${r.description}`);
    if (r.threshold) parts.push(`   Schwellenwert: ${r.threshold}`);
    parts.push(`   Prioritaet: ${r.priority}`);
    parts.push(`   Kategorie: ${r.category}`);
    return parts.join("\n");
  }).join("\n\n");

  const roleLabel = context.role === "auftraggeber" ? "Auftraggeber"
    : context.role === "auftragnehmer" ? "Auftragnehmer"
    : "Neutral";

  const prompt = `Du bist ein erfahrener deutscher Wirtschaftsjurist und pruefst einen Vertrag systematisch gegen vorgegebene Anforderungen.

PERSPEKTIVE: ${roleLabel}
VERTRAGSNAME: ${context.contractName || "Unbenannt"}

===== ANFORDERUNGEN =====
${rulesForPrompt}

===== VERTRAGSTEXT =====
${truncatedText}

===== AUFGABE =====
Pruefe JEDE Anforderung einzeln gegen den Vertragstext. Fuer jede Anforderung:

1. Suche die relevante Klausel/Passage im Vertrag
2. Bewerte ob die Anforderung erfuellt ist
3. Bei Abweichung: Formuliere eine bessere Klausel
4. Gib einen konkreten Verhandlungstipp

Antworte NUR mit einem JSON-Objekt:
{
  "results": [
    {
      "ruleIndex": 1,
      "status": "passed|warning|failed|not_found",
      "confidence": 0-100,
      "finding": "Was im Vertrag steht (Zitat oder Zusammenfassung)",
      "clauseReference": "Wo im Vertrag (z.B. Paragraph 5, Abschnitt 3)",
      "deviation": "Wie die Abweichung aussieht (leer wenn passed)",
      "riskLevel": "low|medium|high",
      "riskExplanation": "Warum das ein Risiko ist (1-2 Saetze)",
      "alternativeText": "Konkrete bessere Formulierung (leer wenn passed)",
      "negotiationTip": "Wie man das beim Vertragspartner anspricht (leer wenn passed)"
    }
  ],
  "overallRecommendation": "Gesamtempfehlung in 2-3 Saetzen"
}

WICHTIG:
- Fuer JEDE Anforderung genau EIN Ergebnis (gleiche Reihenfolge wie Anforderungen)
- "passed" = Klausel vorhanden UND Schwellenwert eingehalten
- "warning" = Klausel vorhanden aber Wert weicht ab oder ist unklar
- "failed" = Klausel widerspricht der Anforderung direkt
- "not_found" = Keine relevante Klausel im Vertrag gefunden
- alternativeText: Formuliere eine konkrete, rechtlich saubere Klausel die der User dem Vertragspartner vorschlagen kann
- negotiationTip: Diplomatisch, professionell, aus Perspektive ${roleLabel}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "Du antwortest ausschliesslich mit validem JSON. Keine Erklaerungen, kein Markdown-Codeblock." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 6000
  });

  const content = response.choices[0]?.message?.content || "{}";
  const usage = response.usage || {};

  try {
    // JSON extrahieren
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ [PLAYBOOK-CHECK] Keine JSON-Antwort:", content.substring(0, 300));
      throw new Error("KI-Antwort konnte nicht verarbeitet werden");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const aiResults = parsed.results || [];

    // Ergebnisse mit Regeln zusammenfuehren
    const results = activeRules.map((rule, index) => {
      const aiResult = aiResults.find(r => r.ruleIndex === index + 1) || aiResults[index] || {};

      return {
        ruleId: rule._id || rule.id,
        ruleTitle: rule.title,
        ruleCategory: rule.category,
        rulePriority: rule.priority,
        status: validStatus(aiResult.status),
        confidence: Math.min(100, Math.max(0, parseInt(aiResult.confidence) || 50)),
        finding: String(aiResult.finding || ""),
        clauseReference: String(aiResult.clauseReference || ""),
        deviation: String(aiResult.deviation || ""),
        riskLevel: validRiskLevel(aiResult.riskLevel),
        riskExplanation: String(aiResult.riskExplanation || ""),
        alternativeText: String(aiResult.alternativeText || ""),
        negotiationTip: String(aiResult.negotiationTip || ""),
        isGlobalRule: rule.isGlobal || false
      };
    });

    // Zusammenfassung berechnen
    const summary = calculateSummary(results, parsed.overallRecommendation);

    return {
      results,
      summary,
      usage: {
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        model: MODEL
      }
    };
  } catch (err) {
    if (err.message === "KI-Antwort konnte nicht verarbeitet werden") throw err;
    console.error("❌ [PLAYBOOK-CHECK] Verarbeitungsfehler:", err.message);
    throw new Error("Pruefungsergebnis konnte nicht verarbeitet werden");
  }
}

// ============================================
// 3. REGEL-EXTRAKTION AUS VERTRAG
// ============================================

/**
 * Extrahiert Regeln aus einem bestehenden Mustervertrag
 * @param {string} contractText - Text des Mustervertrags
 * @param {string} role - "auftraggeber" | "auftragnehmer" | "neutral"
 * @returns {Promise<Array>} - Array von Regel-Vorschlaegen
 */
async function extractRulesFromContract(contractText, role = "neutral") {
  const truncatedText = contractText.length > MAX_CONTRACT_CHARS
    ? contractText.substring(0, MAX_CONTRACT_CHARS)
    : contractText;

  const roleLabel = role === "auftraggeber" ? "Auftraggeber"
    : role === "auftragnehmer" ? "Auftragnehmer"
    : "Neutral";

  const prompt = `Du bist ein erfahrener deutscher Wirtschaftsjurist.
Analysiere diesen Vertrag und extrahiere die wichtigsten Konditionen als Pruef-Regeln.

PERSPEKTIVE: ${roleLabel}

VERTRAGSTEXT:
${truncatedText}

Extrahiere 8-12 konkrete Konditionen aus diesem Vertrag, die als Mindestanforderungen fuer zukuenftige aehnliche Vertraege dienen koennen.

Antworte NUR mit einem JSON-Array:
[
  {
    "title": "Kurzer Titel (max 60 Zeichen)",
    "description": "Was genau diese Kondition bedeutet",
    "category": "zahlung|haftung|kuendigung|gewaehrleistung|vertraulichkeit|datenschutz|eigentum|force_majeure|vertragsstrafe|laufzeit|abnahme|formvorschriften|gerichtsstand|sonstiges",
    "priority": "muss|soll|kann",
    "threshold": "Konkreter Wert aus dem Vertrag (z.B. '30 Tage', '5%')",
    "sourceClause": "Wo im Vertrag gefunden (z.B. 'Paragraph 5')"
  }
]`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "Du antwortest ausschliesslich mit validem JSON. Keine Erklaerungen." },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 3000
  });

  const content = response.choices[0]?.message?.content || "[]";

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const rules = JSON.parse(jsonMatch[0]);
    return rules
      .filter(r => r.title && r.description)
      .map(r => ({
        title: String(r.title).substring(0, 200),
        description: String(r.description).substring(0, 1000),
        category: validCategory(r.category),
        priority: ["muss", "soll", "kann"].includes(r.priority) ? r.priority : "soll",
        threshold: r.threshold ? String(r.threshold).substring(0, 200) : "",
        sourceClause: r.sourceClause || ""
      }));
  } catch (err) {
    console.error("❌ [PLAYBOOK] Extraktion fehlgeschlagen:", err.message);
    return [];
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateSummary(results, overallRecommendation = "") {
  const passed = results.filter(r => r.status === "passed").length;
  const warnings = results.filter(r => r.status === "warning").length;
  const failed = results.filter(r => r.status === "failed").length;
  const notFound = results.filter(r => r.status === "not_found").length;
  const total = results.length;

  // Score berechnen (gewichtet nach Prioritaet)
  let weightedScore = 0;
  let totalWeight = 0;

  results.forEach(r => {
    const weight = r.rulePriority === "muss" ? 3 : r.rulePriority === "soll" ? 2 : 1;
    totalWeight += weight;

    if (r.status === "passed") {
      weightedScore += weight * 100;
    } else if (r.status === "warning") {
      weightedScore += weight * 50;
    }
    // failed und not_found = 0 Punkte
  });

  const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

  // Risiko bestimmen
  const mustFailed = results.filter(r => r.rulePriority === "muss" && (r.status === "failed" || r.status === "not_found")).length;
  let overallRisk = "low";
  if (mustFailed > 0 || overallScore < 40) {
    overallRisk = "high";
  } else if (overallScore < 70 || warnings > total / 2) {
    overallRisk = "medium";
  }

  return {
    passed,
    warnings,
    failed,
    notFound,
    totalRules: total,
    overallScore,
    overallRisk,
    recommendation: overallRecommendation || generateRecommendation(overallScore, mustFailed, failed, warnings)
  };
}

function generateRecommendation(score, mustFailed, failed, warnings) {
  if (score >= 85 && mustFailed === 0) {
    return "Der Vertrag erfuellt die meisten Ihrer Anforderungen. Kleinere Anpassungen koennen sinnvoll sein, aber insgesamt ist der Vertrag akzeptabel.";
  } else if (score >= 60 && mustFailed === 0) {
    return "Der Vertrag hat einige Abweichungen von Ihren Anforderungen. Wir empfehlen, die markierten Punkte vor Unterzeichnung nachzuverhandeln.";
  } else if (mustFailed > 0) {
    return `ACHTUNG: ${mustFailed} Pflicht-Anforderung(en) sind nicht erfuellt. Dieser Vertrag sollte in der aktuellen Form NICHT unterschrieben werden. Verhandeln Sie die kritischen Punkte nach.`;
  } else {
    return "Der Vertrag weicht erheblich von Ihren Anforderungen ab. Eine gruendliche Nachverhandlung ist dringend empfohlen.";
  }
}

function validCategory(cat) {
  const valid = [
    "zahlung", "haftung", "kuendigung", "gewaehrleistung", "vertraulichkeit",
    "datenschutz", "eigentum", "force_majeure", "vertragsstrafe", "laufzeit",
    "abnahme", "formvorschriften", "gerichtsstand", "sonstiges"
  ];
  return valid.includes(cat) ? cat : "sonstiges";
}

function validStatus(status) {
  const valid = ["passed", "warning", "failed", "not_found"];
  return valid.includes(status) ? status : "not_found";
}

function validRiskLevel(level) {
  const valid = ["low", "medium", "high"];
  return valid.includes(level) ? level : "medium";
}

function getIndustryLabel(industry) {
  const labels = {
    it_software: "IT & Software",
    handwerk: "Handwerk",
    bau: "Bauwesen",
    immobilien: "Immobilien",
    beratung: "Beratung & Consulting",
    produktion: "Produktion & Fertigung",
    handel: "Handel & Vertrieb",
    gesundheit: "Gesundheitswesen",
    finanzen: "Finanzdienstleistungen",
    energie: "Energie",
    logistik: "Logistik & Transport",
    allgemein: "Allgemein / Branchenuebergreifend"
  };
  return labels[industry] || labels.allgemein;
}

/**
 * Fallback-Regeln wenn KI-Generierung fehlschlaegt
 */
function getDefaultRules(contractType, role) {
  return [
    {
      title: "Zahlungsfrist pruefen",
      description: "Die Zahlungsfrist sollte angemessen und klar definiert sein.",
      category: "zahlung",
      priority: "soll",
      threshold: "max. 30 Tage nach Rechnungsstellung"
    },
    {
      title: "Haftungsbegrenzung vorhanden",
      description: "Eine Begrenzung der Gesamthaftung muss vorhanden sein.",
      category: "haftung",
      priority: "muss",
      threshold: "Haftung begrenzt auf Auftragswert"
    },
    {
      title: "Kuendigungsfrist definiert",
      description: "Klare Kuendigungsfristen und -bedingungen muessen festgelegt sein.",
      category: "kuendigung",
      priority: "muss",
      threshold: ""
    },
    {
      title: "Gewaehrleistungsfrist angemessen",
      description: "Die Gewaehrleistungsfrist sollte branchenueblich und nicht ueberzogen sein.",
      category: "gewaehrleistung",
      priority: "soll",
      threshold: "max. 24 Monate"
    },
    {
      title: "Schriftformklausel vorhanden",
      description: "Vertragsaenderungen muessen schriftlich erfolgen.",
      category: "formvorschriften",
      priority: "soll",
      threshold: ""
    }
  ];
}

module.exports = {
  generateRules,
  checkContract,
  extractRulesFromContract
};

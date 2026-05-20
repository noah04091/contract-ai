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
const MAX_CONTRACT_CHARS = 220000; // ~55K tokens (gpt-4o 128K Context lässt 70K Reserve für Prompt+Output)
const MAX_RULES_PER_CHECK = 50;
const CHECK_TIMEOUT = 120000; // 120s

// Head+Tail-Pattern: bei sehr langen Verträgen behalten wir Anfang UND Ende
// (Schlussbestimmungen wie Kündigung, Gerichtsstand stehen oft am Ende)
function truncateContractText(text, maxChars = MAX_CONTRACT_CHARS) {
  if (text.length <= maxChars) return { text, wasTruncated: false };
  const headSize = Math.floor(maxChars * 0.7); // 70% Anfang
  const tailSize = maxChars - headSize - 50;   // 30% Ende, abzgl. Marker
  const head = text.substring(0, headSize);
  const tail = text.substring(text.length - tailSize);
  return {
    text: `${head}\n\n[... ${text.length - maxChars} Zeichen aus der Mitte gekuerzt ...]\n\n${tail}`,
    wasTruncated: true
  };
}

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
/**
 * Interner Helper: führt EINEN KI-Call für einen Regel-Subset durch.
 * Wird vom Single-Pass UND vom parallelen Chunking-Pfad benutzt.
 */
async function runSinglePass(truncatedText, ruleSubset, context) {
  const rulesForPrompt = ruleSubset.map((r, i) => {
    const parts = [`${i + 1}. "${r.title}"`];
    parts.push(`   Beschreibung: ${r.description}`);
    if (r.threshold) parts.push(`   Schwellenwert: ${r.threshold}`);
    parts.push(`   Prioritaet: ${r.priority}`);
    parts.push(`   Kategorie: ${r.category}`);
    if (r.standardText) {
      const truncated = r.standardText.length > 2000 ? r.standardText.substring(0, 2000) + "..." : r.standardText;
      parts.push(`   Soll-Formulierung (User-Wunschklausel): "${truncated}"`);
    }
    return parts.join("\n");
  }).join("\n\n");

  const roleLabel = context.role === "auftraggeber" ? "Auftraggeber"
    : context.role === "auftragnehmer" ? "Auftragnehmer"
    : "Neutral";

  const prompt = `Du bist ein erfahrener deutscher Wirtschaftsjurist. Deine Aufgabe ist es, einen Vertrag gruendlich und systematisch gegen vorgegebene Anforderungen zu pruefen.

PERSPEKTIVE: ${roleLabel}
VERTRAGSNAME: ${context.contractName || "Unbenannt"}

===== ANFORDERUNGEN =====
${rulesForPrompt}

===== VERTRAGSTEXT =====
${truncatedText}

===== AUFGABE =====
Pruefe JEDE Anforderung einzeln gegen den GESAMTEN Vertragstext. Durchsuche den kompletten Text sorgfaeltig — nicht nur die ersten Absaetze.

Fuer jede Anforderung:
1. Durchsuche den gesamten Vertragstext nach relevanten Klauseln, Paragraphen oder Passagen
2. Bewerte ob die Anforderung erfuellt ist (auch wenn die Formulierung anders ist aber inhaltlich passt)
3. Wenn eine Soll-Formulierung angegeben ist: Vergleiche die gefundene Klausel direkt mit dieser Soll-Formulierung und beschreibe Abweichungen praezise
4. Bei Abweichung: Formuliere eine konkrete bessere Klausel
5. Gib einen konkreten Verhandlungstipp

Antworte NUR mit einem JSON-Objekt:
{
  "results": [
    {
      "ruleIndex": 1,
      "status": "passed|warning|failed|not_found",
      "confidence": 0-100,
      "finding": "Was im Vertrag steht — IMMER ausfuellen, auch bei passed (Zitat oder Zusammenfassung der gefundenen Klausel)",
      "clauseReference": "Wo im Vertrag (z.B. Paragraph 5, Abschnitt 3, Seite 2)",
      "deviation": "Wie die Abweichung aussieht (leer wenn passed)",
      "riskLevel": "low|medium|high",
      "riskExplanation": "Warum das ein Risiko ist (1-2 Saetze, leer wenn passed)",
      "alternativeText": "Konkrete bessere Formulierung (leer wenn passed)",
      "negotiationTip": "Wie man das beim Vertragspartner anspricht (leer wenn passed)",
      "clarificationNeeded": false,
      "clarificationRequest": "Leer lassen, AUSSER du brauchst mehr Kontext vom User (siehe ANWALTS-REFLEX unten)"
    }
  ],
  "overallRecommendation": "Gesamtempfehlung in 2-3 Saetzen"
}

WICHTIG:
- Fuer JEDE Anforderung genau EIN Ergebnis (gleiche Reihenfolge wie Anforderungen)
- "passed" = Klausel vorhanden UND Schwellenwert eingehalten. Beschreibe im finding WAS gefunden wurde.
- "warning" = Klausel vorhanden aber Wert weicht ab, ist unklar oder nur teilweise erfuellt
- "failed" = Klausel widerspricht der Anforderung direkt oder ist nachteilig
- "not_found" = ERST wenn du den GESAMTEN Vertragstext durchsucht hast und SICHER bist, dass keine relevante Klausel existiert. Pruefe auch Synonyme und alternative Formulierungen.

ENTSCHEIDUNGSREGEL (sehr wichtig — gegen False Negatives):
Findest du eine Klausel die das Thema der Anforderung behandelt aber abweicht (anderer Wert,
andere Frist, anders formuliert) → IMMER "warning", NIE "not_found".
"not_found" nur wenn das Thema im Vertrag KOMPLETT FEHLT.

- finding: IMMER ausfuellen — bei passed zeige was gefunden wurde, bei not_found erklaere was fehlt
- alternativeText: Formuliere eine konkrete, rechtlich saubere Klausel nach deutschem Recht
- negotiationTip: Diplomatisch, professionell, aus Perspektive ${roleLabel}

ANWALTS-REFLEX (clarificationNeeded):
Setze "clarificationNeeded": true UND fülle "clarificationRequest" NUR wenn die Anforderung so vage formuliert ist,
dass du sie nicht zuverlaessig pruefen kannst — z.B. wenn keine Soll-Formulierung hinterlegt ist und die Beschreibung
mehrdeutig ist, oder wenn der Schwellenwert fehlt aber wichtig waere. In "clarificationRequest" formulierst du
KONKRET, was der User ergaenzen muesste (z.B. "Bitte ergaenze eine Soll-Formulierung oder konkreten Schwellenwert
fuer 'angemessene Haftung' — sonst kann ich nicht beurteilen ob die Vertragsklausel passt.").
Sei sparsam damit — nur bei echter Unsicherheit, nicht bei jeder Regel ohne Soll-Formulierung.
Bei klaren Regeln IMMER "clarificationNeeded": false setzen.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "Du antwortest ausschliesslich mit validem JSON. Keine Erklaerungen, kein Markdown-Codeblock." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 12000
  }, { timeout: CHECK_TIMEOUT });

  const content = response.choices[0]?.message?.content || "{}";
  const usage = response.usage || {};

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("❌ [PLAYBOOK-CHECK] Keine JSON-Antwort:", content.substring(0, 300));
    throw new Error("KI-Antwort konnte nicht verarbeitet werden");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    aiResults: parsed.results || [],
    overallRecommendation: parsed.overallRecommendation || "",
    usage
  };
}

async function checkContract(contractText, rules, context = {}) {
  if (!contractText || contractText.trim().length < 50) {
    throw new Error("Vertragstext zu kurz fuer Pruefung");
  }

  if (!rules || rules.length === 0) {
    throw new Error("Keine Regeln fuer Pruefung vorhanden");
  }

  // Text kuerzen wenn noetig — Head+Tail-Pattern erhält Schlussbestimmungen
  const { text: truncatedText, wasTruncated: textWasTruncated } = truncateContractText(contractText);

  // Max Regeln begrenzen
  const rulesSkipped = Math.max(0, rules.length - MAX_RULES_PER_CHECK);
  const activeRules = rules.slice(0, MAX_RULES_PER_CHECK);

  try {
    // Chunking-Entscheidung: >10 Regeln → parallele Calls à ~10 Regeln
    // Bei ≤10 Regeln: ein Call (kein Overhead, gleiche Performance wie heute).
    const CHUNK_SIZE = 10;
    const CHUNK_THRESHOLD = 10;

    let combinedAiResults = [];
    let combinedRecommendation = "";
    let combinedUsage = { prompt_tokens: 0, completion_tokens: 0 };
    let chunkFailureInfo = null;

    if (activeRules.length <= CHUNK_THRESHOLD) {
      // Single-Pass
      const { aiResults, overallRecommendation, usage } = await runSinglePass(truncatedText, activeRules, context);
      combinedAiResults = aiResults;
      combinedRecommendation = overallRecommendation;
      combinedUsage = usage;
    } else {
      // Multi-Pass parallel: Regel-Chunks, jeweils mit vollem Vertragstext
      const chunks = [];
      for (let i = 0; i < activeRules.length; i += CHUNK_SIZE) {
        chunks.push(activeRules.slice(i, i + CHUNK_SIZE));
      }
      console.log(`🔀 [PLAYBOOK-CHECK] Regel-Chunking: ${activeRules.length} Regeln → ${chunks.length} parallele Calls`);

      const passResults = await Promise.allSettled(
        chunks.map(chunk => runSinglePass(truncatedText, chunk, context))
      );

      // Ergebnisse mergen — pro Chunk ist ruleIndex lokal (1..N), wir mappen via Position auf den globalen Index
      let offset = 0;
      const failedChunks = [];
      for (let chunkIdx = 0; chunkIdx < passResults.length; chunkIdx++) {
        const pass = passResults[chunkIdx];
        const chunkRules = chunks[chunkIdx];
        if (pass.status === "fulfilled") {
          // Range-Check: nur ruleIndex 1..chunkRules.length akzeptieren, dann auf globalen Offset verschieben
          const adjustedResults = pass.value.aiResults
            .filter(r => typeof r.ruleIndex === "number" && r.ruleIndex >= 1 && r.ruleIndex <= chunkRules.length)
            .map(r => ({ ...r, ruleIndex: r.ruleIndex + offset }));
          combinedAiResults = combinedAiResults.concat(adjustedResults);
          if (pass.value.overallRecommendation && !combinedRecommendation) {
            combinedRecommendation = pass.value.overallRecommendation;
          }
          combinedUsage.prompt_tokens += pass.value.usage.prompt_tokens || 0;
          combinedUsage.completion_tokens += pass.value.usage.completion_tokens || 0;
        } else {
          console.error(`❌ [PLAYBOOK-CHECK] Chunk ${chunkIdx + 1}/${chunks.length} fehlgeschlagen:`, pass.reason?.message);
          failedChunks.push({ chunkIdx, rulesAffected: chunkRules.length, reason: pass.reason?.message || "unbekannt" });
        }
        offset += chunkRules.length;
      }

      // Wenn ALLE Chunks fehlgeschlagen sind → Hardfail (sonst nur "leere" Ergebnisse)
      if (failedChunks.length === chunks.length) {
        throw new Error("Alle Pruef-Teilanfragen fehlgeschlagen. Bitte erneut versuchen.");
      }
      // Sonst: combinedAiResults enthält die erfolgreichen Chunks; failedChunks-Info wird unten ans Frontend durchgereicht
      if (failedChunks.length > 0) {
        chunkFailureInfo = {
          failedChunks: failedChunks.length,
          totalChunks: chunks.length,
          rulesAffected: failedChunks.reduce((s, f) => s + f.rulesAffected, 0)
        };
      }
    }

    // Ergebnisse mit Regeln zusammenführen (jetzt einheitlich, egal ob Single oder Multi)
    const results = activeRules.map((rule, index) => {
      const aiResult = combinedAiResults.find(r => r.ruleIndex === index + 1) || {};

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
        isGlobalRule: rule.isGlobal || false,
        clarificationNeeded: Boolean(aiResult.clarificationNeeded),
        clarificationRequest: String(aiResult.clarificationRequest || "")
      };
    });

    const summary = calculateSummary(results, combinedRecommendation);

    return {
      results,
      summary,
      truncated: {
        contractText: textWasTruncated,
        rulesSkipped
      },
      chunkFailure: chunkFailureInfo,
      usage: {
        inputTokens: combinedUsage.prompt_tokens || 0,
        outputTokens: combinedUsage.completion_tokens || 0,
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
  const clarifications = results.filter(r => r.clarificationNeeded).length;
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
    clarifications,
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

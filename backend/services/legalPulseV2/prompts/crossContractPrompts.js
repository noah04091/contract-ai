/**
 * Cross-Contract Intelligence — Prompts & Schemas for Stage 3 + Stage 4
 */

const CROSS_CONTRACT_SYSTEM_PROMPT =
`Du bist ein erfahrener Contract Intelligence Analyst. Du analysierst ein PORTFOLIO von Verträgen und erkennst Zusammenhänge, die bei der Einzelanalyse nicht sichtbar sind.

═══════════════════════════════════════════
ANALYSE-VERFAHREN
═══════════════════════════════════════════

SCHRITT 1 — Portfolio-Muster erkennen (intern)
- Welche Verträge stehen in direkter Beziehung zueinander?
- Gibt es Widersprüche zwischen Verträgen (z.B. unterschiedliche NDAs)?
- Gibt es Abhängigkeiten (z.B. Hosting + AVV müssen zusammenpassen)?
- Sind Konditionen bei gleichem Anbieter konsistent?

SCHRITT 2 — Relevanzprüfung (Decision Gate)
Für jedes erkannte Muster:
Q1: Ist das Muster durch konkrete Vertragsdaten belegt?
Q2: Hat es operative, juristische oder wirtschaftliche Auswirkungen?
→ Insight NUR wenn BEIDE Fragen mit JA beantwortet werden.

═══════════════════════════════════════════
INSIGHT-TYPEN
═══════════════════════════════════════════

- "conflict": Widersprüche zwischen Verträgen
- "opportunity": Verbesserungspotential (günstigere Konditionen, bessere Standards)
- "concentration_risk": Zu starke Abhängigkeit von einem Anbieter/Typ
- "renewal_cluster": Mehrere Verträge laufen gleichzeitig aus
- "benchmark_gap": Vertrag deutlich schlechter als vergleichbare im Portfolio

═══════════════════════════════════════════
QUALITÄTSREGELN
═══════════════════════════════════════════

VERBOTEN:
- Insights ohne Bezug zu konkreten Verträgen im Portfolio
- Wiederholung von Einzelvertrag-Findings als Portfolio-Insight
- Vage Aussagen wie "man sollte prüfen"
- Mehr als 5 Insights pro Analyse

ERLAUBT:
- Leeres Array wenn keine relevanten Portfolio-Muster existieren
- Vergleiche zwischen Verträgen gleichen Typs

Antworte NUR im angegebenen JSON-Format.`;

const CROSS_CONTRACT_SCHEMA = {
  type: "object",
  properties: {
    insights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["conflict", "opportunity", "concentration_risk", "renewal_cluster", "benchmark_gap"],
          },
          title: { type: "string" },
          description: { type: "string" },
          severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
          relatedContractIds: {
            type: "array",
            items: { type: "string" },
          },
          confidence: { type: "number" },
          reasoning: { type: "string" },
        },
        required: ["type", "title", "description", "severity", "relatedContractIds", "confidence", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  required: ["insights"],
  additionalProperties: false,
};

const ACTION_ENGINE_SYSTEM_PROMPT =
`Du bist ein Contract Operations Advisor. Deine Aufgabe: Übersetze Vertragsrisiken und Portfolio-Insights in KONKRETE Handlungsempfehlungen.

═══════════════════════════════════════════
REGELN
═══════════════════════════════════════════

Für JEDE Empfehlung:
- "priority": "now" (innerhalb 7 Tagen handeln), "plan" (innerhalb 30 Tagen), "watch" (beobachten)
- "title": Was genau zu tun ist (Imperativ, z.B. "Kündigungsfrist prüfen")
- "description": Warum und was passiert wenn nicht gehandelt wird
- "nextStep": Der EXAKTE erste Schritt (z.B. "E-Mail an Anbieter X mit Bitte um...")
- "estimatedImpact": Geschätzter finanzieller oder operativer Impact
- "confidence": 0-100

QUALITÄTSREGELN:
- NUR Empfehlungen mit Confidence >= 70
- Maximal 7 Empfehlungen
- "now" nur bei echtem Zeitdruck (Frist < 30 Tage, kritisches Risiko)
- Konkrete nächste Schritte, KEINE vagen Ratschläge
- Leeres Array ist erlaubt

Antworte NUR im angegebenen JSON-Format.`;

const ACTION_ENGINE_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["now", "plan", "watch"] },
          title: { type: "string" },
          description: { type: "string" },
          relatedContractIds: {
            type: "array",
            items: { type: "string" },
          },
          estimatedImpact: { type: "string" },
          confidence: { type: "number" },
          nextStep: { type: "string" },
        },
        required: ["priority", "title", "description", "relatedContractIds", "estimatedImpact", "confidence", "nextStep"],
        additionalProperties: false,
      },
    },
  },
  required: ["actions"],
  additionalProperties: false,
};

module.exports = {
  CROSS_CONTRACT_SYSTEM_PROMPT,
  CROSS_CONTRACT_SCHEMA,
  ACTION_ENGINE_SYSTEM_PROMPT,
  ACTION_ENGINE_SCHEMA,
};

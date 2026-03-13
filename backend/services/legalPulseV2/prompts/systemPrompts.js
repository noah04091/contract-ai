/**
 * Legal Pulse V2 — System Prompts & JSON Schemas
 * Decision-First prompts with anti-hallucination rules.
 */

const DEEP_ANALYSIS_SYSTEM_PROMPT = (contractType, jurisdiction, parties) =>
`Du bist ein erfahrener deutscher Wirtschaftsjurist mit 20+ Jahren Erfahrung.
Vertragstyp: ${contractType || "unbekannt"}
Jurisdiktion: ${jurisdiction || "Deutschland"}
Parteien: ${parties?.join(", ") || "N/A"}

Deine EINZIGE Aufgabe: Analysiere die folgenden Vertragsklauseln TIEFGEHEND und identifiziere Befunde.

Für JEDE Klausel, die einen Befund enthält, erstelle einen Eintrag mit:
- "clauseId": Die ID der Klausel
- "category": Eine der Kategorien (vertragsbedingungen, haftung, kuendigung, datenschutz, geistiges_eigentum, zahlungen, geheimhaltung, wettbewerb, compliance, sonstiges)
- "severity": "info" | "low" | "medium" | "high" | "critical"
- "type": "risk" | "compliance" | "opportunity" | "information"
- "title": Kurzer, präziser Titel des Befunds
- "description": Detaillierte Beschreibung (2-4 Sätze)
- "legalBasis": Konkrete Rechtsgrundlage (z.B. "§ 307 BGB", "Art. 28 DSGVO")
- "affectedText": Der EXAKTE betroffene Textabschnitt aus der Klausel (max 200 Zeichen)
- "confidence": 0-100, wie sicher du dir bist
- "reasoning": WARUM dies ein Befund ist (3-5 Sätze mit juristischer Begründung)
- "isIntentional": true wenn die Formulierung wahrscheinlich ABSICHTLICH so gewählt wurde

ENTSCHEIDUNGSLOGIK — BEVOR du ein Risiko meldest, beantworte 3 Fragen:
1. Ist dieses Risiko TATSÄCHLICH im Text vorhanden, oder interpretiere ich es hinein?
2. Wenn die Klausel restriktiv ist — könnte das ABSICHTLICH so sein?
3. Würde ein deutsches Gericht dies tatsächlich als problematisch ansehen?
Wenn eine Antwort "nein" oder "unsicher" ist → NICHT als Risiko melden.

VERBOTEN:
- Risiken erfinden, die nicht im Text stehen
- Behaupten, etwas "fehlt", ohne den GESAMTEN Vertrag geprüft zu haben
- "Könnte problematisch sein" — sei definitiv oder sage nichts
- Dasselbe Risiko in anderen Worten wiederholen
- Phrasen wie "es sei angemerkt" oder "man sollte prüfen"
- Mehr als 3 Befunde pro Klausel (fokussiere auf die wichtigsten)

ERLAUBT:
- "information" Befunde für neutrale, aber wissenswerte Punkte
- "opportunity" Befunde für Verbesserungspotential
- Klauseln OHNE Befunde zu lassen (das ist KORREKT wenn sie solide sind)

Antworte NUR im angegebenen JSON-Format.`;

const DEEP_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          clauseId: { type: "string" },
          category: {
            type: "string",
            enum: [
              "vertragsbedingungen", "haftung", "kuendigung", "datenschutz",
              "geistiges_eigentum", "zahlungen", "geheimhaltung", "wettbewerb",
              "compliance", "sonstiges",
            ],
          },
          severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
          type: { type: "string", enum: ["risk", "compliance", "opportunity", "information"] },
          title: { type: "string" },
          description: { type: "string" },
          legalBasis: { type: "string" },
          affectedText: { type: "string" },
          confidence: { type: "number" },
          reasoning: { type: "string" },
          isIntentional: { type: "boolean" },
        },
        required: [
          "clauseId", "category", "severity", "type", "title",
          "description", "legalBasis", "affectedText", "confidence",
          "reasoning", "isIntentional",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["findings"],
  additionalProperties: false,
};

// Contract type-specific analysis hints
const CONTRACT_TYPE_HINTS = {
  mietvertrag: "Achte besonders auf: Mietrecht (§§ 535-580a BGB), Schönheitsreparaturen, Nebenkostenabrechnung (BetrKV), Kündigungsfristen (§ 573c BGB), Mietpreisbremse, Indexklauseln.",
  arbeitsvertrag: "Achte besonders auf: Arbeitsrecht (TzBfG, KSchG), Kündigungsschutz (§ 622 BGB), Wettbewerbsverbot (§§ 74-75d HGB), Arbeitszeitgesetz, Vergütung, Urlaub (BUrlG), Überstunden.",
  nda: "Achte besonders auf: Vertraulichkeitsumfang, Laufzeit, Vertragsstrafen (§ 339 BGB), Rückgabepflichten, Ausnahmen, Schadensersatz.",
  dienstleistung: "Achte besonders auf: Werkvertrag vs. Dienstvertrag (§§ 611/631 BGB), Haftungsbeschränkungen, SLA, Abnahme, Gewährleistung.",
  saas: "Achte besonders auf: SLA/Verfügbarkeit, Datenlöschung, DSGVO (Art. 28), Subunternehmer, Preisanpassungen, Lock-in-Effekte, Exit-Klauseln.",
  versicherung: "Achte besonders auf: Deckungslücken, Ausschlüsse, Selbstbeteiligung, Obliegenheiten (§§ 19-32 VVG), Kündigungsrechte, Prämienanpassung.",
  kaufvertrag: "Achte besonders auf: Gewährleistung (§§ 434-442 BGB), Eigentumsvorbehalt (§ 449 BGB), Gefahrübergang, Rügepflicht (§ 377 HGB).",
  lizenz: "Achte besonders auf: Nutzungsrechte (§§ 31-44 UrhG), Unterlizenzierung, Territorialbeschränkungen, Laufzeit, Kündigung.",
  freelancer: "Achte besonders auf: Scheinselbständigkeit (§ 7 SGB IV), Weisungsfreiheit, Haftung, IP-Übertragung, Wettbewerbsverbot.",
  gesellschaftsvertrag: "Achte besonders auf: Gesellschafterrechte, Gewinnverteilung, Geschäftsführung, Ausscheiden, Nachfolge, Wettbewerbsverbot.",
};

function getContractTypeHint(contractType) {
  if (!contractType) return "";
  const key = contractType.toLowerCase().replace(/[-\s]/g, "");
  for (const [type, hint] of Object.entries(CONTRACT_TYPE_HINTS)) {
    if (key.includes(type) || type.includes(key)) return hint;
  }
  return "";
}

module.exports = {
  DEEP_ANALYSIS_SYSTEM_PROMPT,
  DEEP_ANALYSIS_SCHEMA,
  CONTRACT_TYPE_HINTS,
  getContractTypeHint,
};

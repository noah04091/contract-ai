/**
 * Legal Pulse V2 — System Prompts & JSON Schemas
 * Decision-First prompts with anti-hallucination rules.
 */

const DEEP_ANALYSIS_SYSTEM_PROMPT = (contractType, jurisdiction, parties) =>
`Du bist ein erfahrener deutscher Wirtschaftsjurist mit 20+ Jahren Erfahrung.
Vertragstyp: ${contractType || "unbekannt"}
Jurisdiktion: ${jurisdiction || "Deutschland"}
Parteien: ${parties?.join(", ") || "N/A"}

Deine EINZIGE Aufgabe: Analysiere die folgenden Vertragsklauseln TIEFGEHEND.

═══════════════════════════════════════════
ANALYSE-VERFAHREN (Two-Pass Legal Reasoning)
═══════════════════════════════════════════

Du MUSST für jede Klausel exakt zwei Schritte durchlaufen:

SCHRITT 1 — Juristische Interpretation (intern, nicht im Output)
Beschreibe für dich selbst:
- Was ist der Zweck dieser Klausel?
- In welchem rechtlichen Kontext steht sie? (BGB, HGB, DSGVO, etc.)
- Was ist der übliche Marktstandard für diese Art von Klausel?
- Ist die Formulierung typisch oder ungewöhnlich?
- Wer profitiert von dieser Klausel, und ist das ausgewogen?

SCHRITT 2 — Risikoentscheidung (Decision Gate)
Beantworte für jeden potenziellen Befund diese 3 Fragen:
Q1: Ist das Risiko TATSÄCHLICH im Text vorhanden — mit konkretem Textbezug?
Q2: Könnte die Formulierung ABSICHTLICH so gewählt sein (branchenüblich, verhandelt)?
Q3: Würde ein deutsches Gericht dies problematisch finden, ODER liegt eine klare Abweichung von gesetzlichen Vorgaben (BGB, HGB, DSGVO), Compliance-Anforderungen oder branchenüblichen Vertragsstandards vor?

GATE-REGEL:
→ Q1 muss IMMER mit JA beantwortet werden. Ohne Textbezug → KEIN Finding.
→ Q2 allein reicht NIE. Absichtlich restriktiv aber zulässig = kein Finding.
→ Q3 oder ein klarer Compliance-/Marktstandard-Verstoß muss zusätzlich vorliegen.
→ Kurzform: Finding NUR wenn Q1=JA UND (Q3=JA ODER klare Compliance-Abweichung).
→ Sonst: KEIN Finding. Das ist korrekt und gewünscht.

═══════════════════════════════════════════
AUSGABE-FORMAT
═══════════════════════════════════════════

Für JEDEN Befund, der das Decision Gate passiert hat:
- "clauseId": Die ID der Klausel
- "category": Eine der Kategorien (vertragsbedingungen, haftung, kuendigung, datenschutz, geistiges_eigentum, zahlungen, geheimhaltung, wettbewerb, compliance, sonstiges)
- "severity": "info" | "low" | "medium" | "high" | "critical"
- "type": "risk" | "compliance" | "opportunity" | "information"
- "title": Kurzer, präziser Titel (KEIN "könnte" oder "eventuell" — sei definitiv)
- "description": Detaillierte Beschreibung (2-4 Sätze)
- "legalBasis": Konkrete Rechtsgrundlage (z.B. "§ 307 BGB", "Art. 28 DSGVO")
- "affectedText": EXAKTES Zitat aus der Klausel, das den Befund belegt (max 200 Zeichen). PFLICHT — ohne konkreten Textbezug KEIN Befund.
- "confidence": 0-100
- "reasoning": Deine juristische Begründung aus Schritt 1+2 (3-5 Sätze: Interpretation → Marktvergleich → Entscheidung)
- "isIntentional": true wenn die Formulierung wahrscheinlich absichtlich so gewählt wurde

═══════════════════════════════════════════
QUALITÄTSREGELN
═══════════════════════════════════════════

VERBOTEN:
- Risiken erfinden, die nicht im Text stehen
- Behaupten, etwas "fehlt", ohne den GESAMTEN Vertrag geprüft zu haben
- Vage Formulierungen: "könnte problematisch sein", "es sei angemerkt", "man sollte prüfen"
- Dasselbe Risiko in anderen Worten wiederholen
- Findings OHNE konkretes Zitat aus dem Vertragstext
- Mehr als 3 Findings pro Klausel-Batch

ERLAUBT:
- "information" Befunde für neutrale, aber wissenswerte Punkte
- "opportunity" Befunde für konkretes Verbesserungspotential
- Klauseln OHNE Befunde zu lassen — das ist KORREKT wenn sie solide sind
- Leeres findings-Array wenn keine Klausel das Decision Gate passiert

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

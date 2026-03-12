/**
 * Optimizer V2 - Spezialisierte System-Prompts
 *
 * Jeder Stage hat einen fokussierten Experten-Prompt.
 * Das ist der Schlüssel zur Qualität: Spezialisierung statt Generalismus.
 */

// ============================================================
// STAGE 1: Structure Recognition
// ============================================================
const STRUCTURE_RECOGNITION_PROMPT = `Du bist ein erfahrener Rechtsanwalt und Vertragsanalyst.

Deine EINZIGE Aufgabe: Analysiere die Struktur dieses Vertrags und extrahiere die Metadaten.

Regeln:
- Sei PRÄZISE. Erfinde keine Informationen die nicht im Text stehen.
- Wenn eine Information nicht im Vertrag steht, setze den Wert auf null.
- Erkenne den Vertragstyp anhand des Inhalts, nicht nur anhand der Überschrift.
- "maturity" bezieht sich auf die professionelle Qualität des Vertragstexts:
  - "high": Kanzlei-Qualität, durchdachte Formulierungen
  - "medium": Solide aber nicht perfekt
  - "low": Laienhaft, viele Lücken oder Template-Charakter
- "recognizedAs" ist eine kurze Beschreibung in 3-5 Wörtern (z.B. "SaaS-Dienstleistungsvertrag für Softwareentwicklung")
- "industry" ist die Branche, in der der Vertrag angesiedelt ist. Leite sie aus dem Vertragsinhalt ab:
  - Parteinamen, Leistungsbeschreibung, Fachbegriffe, Branchenstandards
  - Bevorzuge SPEZIFISCHE Branchen über generische. Beispiele:
    - SaaS-Vertrag / Software-as-a-Service → "saas", NICHT "technology"
    - Webdesign/Agenturvertrag → "marketing", NICHT "technology"
    - Beratungsleistungen → "consulting"
    - Mietvertrag → "real_estate"
  - Wähle die BESTE Kategorie. Wenn wirklich unklar, verwende "other".`;

const STRUCTURE_RECOGNITION_SCHEMA = {
  type: "object",
  properties: {
    contractType: {
      type: "string",
      enum: ["arbeitsvertrag", "mietvertrag", "nda", "saas_vertrag", "kaufvertrag",
             "dienstvertrag", "werkvertrag", "lizenzvertrag", "gesellschaftsvertrag",
             "darlehensvertrag", "agb", "franchise", "rahmenvertrag", "kooperationsvertrag",
             "beratervertrag", "freelancer_vertrag", "agenturvertrag", "sonstiges"]
    },
    contractTypeLabel: { type: "string" },
    contractTypeConfidence: { type: "number" },
    jurisdiction: { type: ["string", "null"] },
    language: { type: "string", enum: ["de", "en", "fr", "es", "it", "other"] },
    isAmendment: { type: "boolean" },
    recognizedAs: { type: "string" },
    industry: {
      type: "string",
      enum: ["technology", "saas", "consulting", "finance", "healthcare", "real_estate",
             "construction", "manufacturing", "ecommerce", "marketing", "media",
             "education", "legal", "logistics", "energy", "insurance", "hr_staffing",
             "food_hospitality", "public_sector", "other"]
    },
    maturity: { type: "string", enum: ["high", "medium", "low"] },
    parties: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          name: { type: ["string", "null"] },
          address: { type: ["string", "null"] }
        },
        required: ["role", "name", "address"],
        additionalProperties: false
      }
    },
    duration: { type: ["string", "null"] },
    startDate: { type: ["string", "null"] },
    endDate: { type: ["string", "null"] },
    legalFramework: {
      type: "array",
      items: { type: "string" }
    },
    keyDates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          date: { type: ["string", "null"] },
          description: { type: "string" }
        },
        required: ["type", "description"],
        additionalProperties: false
      }
    }
  },
  required: ["contractType", "contractTypeLabel", "contractTypeConfidence", "jurisdiction",
             "language", "isAmendment", "recognizedAs", "industry", "maturity", "parties",
             "duration", "legalFramework", "keyDates"],
  additionalProperties: false
};

// ============================================================
// STAGE 2: Clause Extraction
// ============================================================
const CLAUSE_EXTRACTION_PROMPT = `Du bist ein Experte für Vertragsstrukturierung.

Deine EINZIGE Aufgabe: Zerlege diesen Vertrag in seine einzelnen Klauseln/Abschnitte.

Regeln:
- Identifiziere JEDEN einzelnen Abschnitt/Paragraphen des Vertrags.
- Behalte die exakte Reihenfolge bei.
- Jede Klausel bekommt eine "category" aus der folgenden Liste:
  "parties" | "subject" | "duration" | "termination" | "payment" | "liability" |
  "warranty" | "confidentiality" | "ip_rights" | "data_protection" | "non_compete" |
  "force_majeure" | "dispute_resolution" | "general_provisions" | "deliverables" |
  "sla" | "penalties" | "insurance" | "compliance" | "amendments" | "other"
- Wenn ein Abschnitt mehrere Themen abdeckt, wähle die HAUPTKATEGORIE.
- Die "sectionNumber" ist die Originalnummerierung (z.B. "§ 1", "3.2", "Artikel 5").
- Der "title" ist die Original-Überschrift der Klausel.
- "originalText" muss den VOLLSTÄNDIGEN Text der Klausel enthalten - kürze NIEMALS.`;

const CLAUSE_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    clauses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          originalText: { type: "string" },
          category: {
            type: "string",
            enum: ["parties", "subject", "duration", "termination", "payment", "liability",
                   "warranty", "confidentiality", "ip_rights", "data_protection", "non_compete",
                   "force_majeure", "dispute_resolution", "general_provisions", "deliverables",
                   "sla", "penalties", "insurance", "compliance", "amendments", "other"]
          },
          sectionNumber: { type: ["string", "null"] }
        },
        required: ["id", "title", "originalText", "category"],
        additionalProperties: false
      }
    }
  },
  required: ["clauses"],
  additionalProperties: false
};

// ============================================================
// STAGE 3: Clause Analysis (batched)
// ============================================================
const CLAUSE_ANALYSIS_PROMPT = (contractType, jurisdiction, parties, industry) =>
`Du bist ein Senior-Partner einer renommierten Kanzlei mit 25+ Jahren Erfahrung im Vertragsrecht.
Vertragstyp: ${contractType}
Jurisdiktion: ${jurisdiction || 'Deutschland'}
Branche: ${industry || 'nicht spezifiziert'}
Parteien: ${parties?.map(p => `${p.role}: ${p.name || 'nicht angegeben'}`).join(', ') || 'nicht angegeben'}

Deine EINZIGE Aufgabe: Analysiere die folgenden Klauseln TIEFGEHEND.

Für JEDE Klausel:
1. "summary": Was regelt diese Klausel? (1-2 Sätze, verständlich für Nicht-Juristen)
2. "plainLanguage": Erkläre in einfacher Sprache, was das für die Parteien KONKRET bedeutet.
3. "legalAssessment": Detaillierte juristische Bewertung. Ist die Klausel:
   - Rechtlich wirksam?
   - Marktüblich formuliert?
   - Ausreichend detailliert?
   - Gibt es Lücken oder Mehrdeutigkeiten?
4. "strength": Gesamtbewertung der Klausel-Qualität:
   - "strong": Professionell, vollständig, ausgewogen
   - "adequate": Funktional aber verbesserbar
   - "weak": Lückenhaft, unklar oder einseitig
   - "critical": Ernsthaftes rechtliches Risiko
5. "importanceLevel": Wie wichtig ist diese Klausel für den Vertrag insgesamt?
   - "critical": Kernklausel — bei Fehler massive rechtliche/finanzielle Folgen (z.B. Haftung, IP, Datenschutz, Wettbewerbsverbot)
   - "high": Wichtige Klausel — regelt wesentliche Rechte/Pflichten (z.B. Zahlung, Kündigung, Gewährleistung, Laufzeit)
   - "medium": Standard-Klausel — regulärer Vertragsbestandteil (z.B. Leistungsbeschreibung, Compliance)
   - "low": Formale/administrative Klausel — geringe rechtliche Relevanz (z.B. Definitionen, Schlussbestimmungen, Änderungsklauseln)
6. "concerns": Konkrete Bedenken (Array von Strings). NUR echte Probleme, keine generischen Hinweise.
7. "riskLevel": 0 (kein Risiko) bis 10 (kritisches Risiko)
8. "riskType": Art des Risikos - "legal" | "financial" | "compliance" | "operational" | "none"
9. "keyTerms": Wichtige juristische Begriffe in der Klausel
10. "legalReferences": Relevante Gesetze (z.B. "§ 622 BGB", "Art. 13 DSGVO")

WICHTIGE REGELN:
- Bewerte NUR was im Text steht. Erfinde keine Probleme.
- Wenn eine Klausel solide ist, sage das. Nicht jede Klausel muss Probleme haben.
- "concerns" darf leer sein wenn es keine gibt.
- Beziehe dich auf KONKRETE Textstellen, nicht auf Hypothetisches.`;

const CLAUSE_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    analyses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          clauseId: { type: "string" },
          summary: { type: "string" },
          plainLanguage: { type: "string" },
          legalAssessment: { type: "string" },
          strength: { type: "string", enum: ["strong", "adequate", "weak", "critical"] },
          importanceLevel: { type: "string", enum: ["critical", "high", "medium", "low"] },
          concerns: { type: "array", items: { type: "string" } },
          riskLevel: { type: "number" },
          riskType: { type: "string", enum: ["legal", "financial", "compliance", "operational", "none"] },
          keyTerms: { type: "array", items: { type: "string" } },
          legalReferences: { type: "array", items: { type: "string" } }
        },
        required: ["clauseId", "summary", "plainLanguage", "legalAssessment", "strength",
                   "importanceLevel", "concerns", "riskLevel", "riskType", "keyTerms", "legalReferences"],
        additionalProperties: false
      }
    }
  },
  required: ["analyses"],
  additionalProperties: false
};

// ============================================================
// STAGE 4: Optimization Generation (batched)
// ============================================================
const OPTIMIZATION_GENERATION_PROMPT = (contractType, jurisdiction, parties, industry) =>
`Du bist ein Elite-Vertragsanwalt und Verhandlungsexperte.
Vertragstyp: ${contractType}
Jurisdiktion: ${jurisdiction || 'Deutschland'}
Branche: ${industry || 'nicht spezifiziert'}
Parteien: ${parties?.map(p => `${p.role}: ${p.name || 'N/A'}`).join(', ') || 'N/A'}

Deine Aufgabe: Erstelle für jede Klausel, die Verbesserungspotenzial hat, DREI optimierte Versionen.

Für jede Klausel erhältst du:
- Den Originaltext
- Die Analyse (Stärken, Schwächen, Risiken)

Du erstellst DREI Versionen:

1. "neutral": Fair und ausgewogen für BEIDE Parteien
   → Behebe Schwächen, wahre die Balance, orientiere dich am Marktstandard

2. "proCreator": Optimiert zugunsten des ERSTELLERS/ANBIETERS
   → Maximaler Schutz für den Vertragsersteller, rechtlich noch vertretbar

3. "proRecipient": Optimiert zugunsten des EMPFÄNGERS/KUNDEN
   → Maximaler Schutz für die empfangende Partei, rechtlich noch vertretbar

REGELN:
- Schreibe VOLLSTÄNDIGE, einsetzbare Klauseln. Keine Platzhalter wie [Name] oder [Datum].
  Verwende stattdessen die konkreten Parteinamen oder allgemeine Bezeichnungen.
- Jede Version braucht ein "reasoning" das erklärt WARUM diese Formulierung besser ist.
- Wenn eine Klausel bereits STARK ist, setze "needsOptimization" auf false.
- Orientiere dich am geltenden Recht (${jurisdiction || 'deutsches Recht'}).
- Die optimierten Texte müssen sich SPÜRBAR vom Original unterscheiden.
  Keine kosmetischen Änderungen. Echter Mehrwert.
- "marketBenchmark": Wie ist diese Klausel im Vergleich zu marktüblichen Verträgen?
- "negotiationAdvice": Ein praktischer Tipp für die Vertragsverhandlung.`;

const OPTIMIZATION_GENERATION_SCHEMA = {
  type: "object",
  properties: {
    optimizations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          clauseId: { type: "string" },
          needsOptimization: { type: "boolean" },
          neutral: {
            type: "object",
            properties: {
              text: { type: "string" },
              reasoning: { type: "string" }
            },
            required: ["text", "reasoning"],
            additionalProperties: false
          },
          proCreator: {
            type: "object",
            properties: {
              text: { type: "string" },
              reasoning: { type: "string" }
            },
            required: ["text", "reasoning"],
            additionalProperties: false
          },
          proRecipient: {
            type: "object",
            properties: {
              text: { type: "string" },
              reasoning: { type: "string" }
            },
            required: ["text", "reasoning"],
            additionalProperties: false
          },
          marketBenchmark: { type: "string" },
          negotiationAdvice: { type: "string" }
        },
        required: ["clauseId", "needsOptimization", "neutral", "proCreator", "proRecipient",
                   "marketBenchmark", "negotiationAdvice"],
        additionalProperties: false
      }
    }
  },
  required: ["optimizations"],
  additionalProperties: false
};

// ============================================================
// CLAUSE CHAT - Iterative Klausel-Verfeinerung
// ============================================================
const CLAUSE_CHAT_PROMPT = (contractType, jurisdiction, clauseText, clauseAnalysis, chatHistory) =>
`Du bist ein erfahrener Vertragsanwalt und Berater.

KONTEXT:
- Vertragstyp: ${contractType}
- Jurisdiktion: ${jurisdiction || 'Deutschland'}

AKTUELLE KLAUSEL:
${clauseText}

ANALYSE DIESER KLAUSEL:
${clauseAnalysis}

${chatHistory ? `BISHERIGER GESPRÄCHSVERLAUF:\n${chatHistory}` : ''}

DEINE ROLLE:
- Beantworte Fragen zu dieser Klausel klar und verständlich.
- Wenn der User eine Änderung wünscht, erstelle eine verbesserte Version.
- Erkläre juristische Zusammenhänge in einfacher Sprache.
- Gib konkrete, umsetzbare Ratschläge.
- Wenn du eine neue Version der Klausel erstellst, markiere sie mit dem Tag [NEUE_VERSION].
- Halte deine Antworten fokussiert auf diese eine Klausel.`;

module.exports = {
  STRUCTURE_RECOGNITION_PROMPT,
  STRUCTURE_RECOGNITION_SCHEMA,
  CLAUSE_EXTRACTION_PROMPT,
  CLAUSE_EXTRACTION_SCHEMA,
  CLAUSE_ANALYSIS_PROMPT,
  CLAUSE_ANALYSIS_SCHEMA,
  OPTIMIZATION_GENERATION_PROMPT,
  OPTIMIZATION_GENERATION_SCHEMA,
  CLAUSE_CHAT_PROMPT
};

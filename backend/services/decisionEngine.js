// Decision Engine — Smart Playbook System
// Nimmt User-Entscheidungen + Modus + Kontext
// Gibt Struktur, Regeln und Intention für die V2-Pipeline zurück (KEINE fertigen Klauseln!)

const playbooks = {
  arbeitsvertrag: require("../playbooks/arbeitsvertrag"),
  aufhebungsvertrag: require("../playbooks/aufhebungsvertrag"),
  berater: require("../playbooks/berater"),
  darlehensvertrag: require("../playbooks/darlehensvertrag"),
  freelancer: require("../playbooks/freelancer"),
  gesellschaftsvertrag: require("../playbooks/gesellschaftsvertrag"),
  individuell: require("../playbooks/individuell"),
  kaufvertrag: require("../playbooks/kaufvertrag"),
  kooperation: require("../playbooks/kooperation"),
  lizenzvertrag: require("../playbooks/lizenzvertrag"),
  mietvertrag: require("../playbooks/mietvertrag"),
  nda: require("../playbooks/nda"),
  pachtvertrag: require("../playbooks/pachtvertrag"),
  softwareEndkunde: require("../playbooks/softwareEndkunde"),
  softwareVertrieb: require("../playbooks/softwareVertrieb"),
  werkvertrag: require("../playbooks/werkvertrag")
};

/**
 * Resolve Smart Defaults — wenn User keine Auswahl trifft, wählt das System basierend auf Modus
 */
function resolveDefaults(playbook, userDecisions, mode) {
  const resolved = {};

  for (const section of playbook.sections) {
    if (userDecisions[section.key]) {
      resolved[section.key] = userDecisions[section.key];
    } else {
      // Smart Default basierend auf Modus
      resolved[section.key] = section.smartDefault[mode] || section.smartDefault.ausgewogen;
    }
  }

  return resolved;
}

/**
 * Finde die gewählte Option in einer Sektion
 */
function findOption(section, chosenValue) {
  return section.options.find(o => o.value === chosenValue) || null;
}

/**
 * Berechne Gesamt-Risikoprofil aus allen Entscheidungen
 */
function calculateRiskProfile(playbook, resolvedDecisions) {
  const riskMap = { low: 1, medium: 2, high: 3 };
  const sectionRisks = [];
  let totalRisk = 0;
  let count = 0;

  for (const section of playbook.sections) {
    const chosen = resolvedDecisions[section.key];
    const option = findOption(section, chosen);
    if (option) {
      const riskValue = riskMap[option.risk] || 2;
      sectionRisks.push({
        key: section.key,
        title: section.title,
        paragraph: section.paragraph,
        risk: option.risk,
        riskValue,
        chosenLabel: option.label,
        riskNote: option.riskNote
      });
      totalRisk += riskValue;
      count++;
    }
  }

  const avgRisk = count > 0 ? totalRisk / count : 2;
  let overallRisk = "medium";
  if (avgRisk <= 1.3) overallRisk = "low";
  else if (avgRisk >= 2.3) overallRisk = "high";

  return {
    overall: overallRisk,
    averageScore: Math.round((1 - (avgRisk - 1) / 2) * 100), // 100=alles low, 0=alles high
    sections: sectionRisks
  };
}

/**
 * KERN-FUNKTION: Verarbeite alle Entscheidungen und erzeuge Output für V2-Pipeline
 *
 * Output gibt GPT KEINE fertigen Klauseln, sondern:
 * - clauseVariables: dynamische Werte für den Prompt
 * - reasoning: Begründung der Entscheidungen (für GPT-Kontext)
 * - riskLevel: Risiko pro Sektion
 * - negotiationTip: Verhandlungstipp
 * - alternative: Alternative Option
 * - explanation: Erklärung für User
 */
function processDecisions({ type, decisions, mode, partyData }) {
  const playbook = playbooks[type];
  if (!playbook) {
    throw new Error(`Playbook "${type}" nicht gefunden`);
  }

  const validModes = ["sicher", "ausgewogen", "durchsetzungsstark"];
  const safeMode = validModes.includes(mode) ? mode : "ausgewogen";

  // Resolve Defaults für leere Felder
  const resolvedDecisions = resolveDefaults(playbook, decisions || {}, safeMode);

  // Pro Sektion: Output generieren
  const sectionOutputs = [];

  for (const section of playbook.sections) {
    const chosenValue = resolvedDecisions[section.key];
    const chosenOption = findOption(section, chosenValue);

    if (!chosenOption) continue;

    // Finde die beste Alternative (empfohlen für den Modus, aber nicht die gewählte)
    const alternativeOption = section.options.find(
      o => o.value !== chosenValue && o.recommended && o.recommended[safeMode]
    ) || section.options.find(
      o => o.value !== chosenValue && o.risk === "low"
    );

    sectionOutputs.push({
      key: section.key,
      title: section.title,
      paragraph: section.paragraph,
      importance: section.importance,

      // Für den GPT-Prompt (Struktur + Intention, KEINE fertigen Texte)
      clauseVariables: {
        sectionKey: section.key,
        chosenApproach: chosenOption.label,
        chosenValue: chosenValue,
        intensity: safeMode,
        description: chosenOption.description
      },

      // Reasoning für GPT-Kontext
      reasoning: buildReasoning(section, chosenOption, safeMode, partyData),

      // Risiko-Info
      riskLevel: chosenOption.risk,
      riskNote: chosenOption.riskNote,

      // Verhandlungstipp
      negotiationTip: chosenOption.whenNegotiate,

      // Alternative
      alternative: alternativeOption ? {
        label: alternativeOption.label,
        description: alternativeOption.description,
        risk: alternativeOption.risk
      } : null,

      // Erklärung für User
      explanation: {
        what: chosenOption.description,
        whenProblem: chosenOption.whenProblem,
        whenNegotiate: chosenOption.whenNegotiate
      }
    });
  }

  // Gesamt-Risikoprofil
  const riskProfile = calculateRiskProfile(playbook, resolvedDecisions);

  // Prompt-Anweisungen für V2-Pipeline (Struktur + Regeln, KEINE Klauseln)
  const promptInstructions = buildPromptInstructions(playbook, sectionOutputs, safeMode, partyData);

  return {
    playbook: type,
    mode: safeMode,
    modeLabel: playbook.modes[safeMode].label,
    resolvedDecisions,
    sections: sectionOutputs,
    riskProfile,
    promptInstructions,
    partyData
  };
}

/**
 * Baue Reasoning pro Sektion — erklärt GPT die Intention hinter der Entscheidung
 */
function buildReasoning(section, chosenOption, mode, partyData) {
  const modeDescriptions = {
    sicher: "maximaler Schutz für die offenlegende Partei",
    ausgewogen: "faire Balance zwischen beiden Parteien",
    durchsetzungsstark: "optimiert für die stärkere Verhandlungsposition"
  };

  return `Sektion "${section.title}" (${section.paragraph}): ` +
    `User hat "${chosenOption.label}" gewählt im Modus "${mode}" (${modeDescriptions[mode]}). ` +
    `Intention: ${chosenOption.description} ` +
    `Risiko-Level: ${chosenOption.risk}. ` +
    (section.importance === "critical" ? "KRITISCHE Klausel — besonders sorgfältig formulieren. " : "");
}

/**
 * Baue die Prompt-Anweisungen für die V2-Pipeline
 * Gibt GPT Struktur, Regeln und Intention — KEINE fertigen Klauseln
 */
function buildPromptInstructions(playbook, sectionOutputs, mode, partyData) {
  const modeInstructions = {
    sicher: "Der Vertrag soll MAXIMALEN SCHUTZ für die offenlegende Partei bieten. " +
      "Formulierungen sollen klar, strikt und durchsetzbar sein. " +
      "Im Zweifel: strenger formulieren.",
    ausgewogen: "Der Vertrag soll FAIR und AUSGEWOGEN für beide Parteien sein. " +
      "Marktübliche Formulierungen verwenden. " +
      "Beide Parteien sollen sich wohlfühlen.",
    durchsetzungsstark: "Der Vertrag soll die INTERESSEN des Auftraggebers DURCHSETZEN. " +
      "Formulierungen sollen professionell aber bestimmt sein. " +
      "Wo möglich: Vorteile für die auftraggebende Seite einbauen."
  };

  // Sektions-Anweisungen (was GPT pro Paragraph berücksichtigen soll)
  const sectionInstructions = sectionOutputs.map(s => {
    return `${s.paragraph} ${s.title}: ` +
      `Ansatz "${s.clauseVariables.chosenApproach}" — ${s.clauseVariables.description}`;
  }).join("\n");

  // Parteien-Info
  const partyInfo = partyData ? [
    `Offenlegende Partei: ${partyData.partyA_name || "[Name Partei A]"}`,
    partyData.partyA_address ? `Adresse: ${partyData.partyA_address}` : "",
    partyData.partyA_representative ? `Vertreten durch: ${partyData.partyA_representative}` : "",
    `Empfangende Partei: ${partyData.partyB_name || "[Name Partei B]"}`,
    partyData.partyB_address ? `Adresse: ${partyData.partyB_address}` : "",
    partyData.partyB_representative ? `Vertreten durch: ${partyData.partyB_representative}` : "",
    partyData.purpose ? `Zweck: ${partyData.purpose}` : "",
    partyData.direction ? `Art: ${partyData.direction === "gegenseitig" ? "Gegenseitige NDA" : "Einseitige NDA"}` : ""
  ].filter(Boolean).join("\n") : "";

  return {
    systemContext: `Du erstellst eine professionelle Geheimhaltungsvereinbarung (NDA) nach deutschem Recht. ` +
      `Strategie-Modus: ${playbook.modes[mode].label}. ` +
      modeInstructions[mode],
    partyInfo,
    sectionInstructions,
    rules: [
      "Verwende EXAKT die Parteinamen aus den Angaben.",
      "Jeder Paragraph muss eine vollständige, rechtlich formulierte Klausel sein.",
      "KEINE Platzhalter wie [Name] — nur echte Daten.",
      "Sprache: Professionelles Deutsch, rechtlich präzise.",
      "Orientiere dich an den Sektions-Anweisungen für Intention und Strenge.",
      `Art der NDA: ${partyData?.direction === "gegenseitig" ? "Gegenseitig — BEIDE Parteien haben Rechte und Pflichten" : "Einseitig — Pflichten primär bei der empfangenden Partei"}.`,
      "Schreibe den KOMPLETTEN Vertrag mit allen Paragraphen.",
      "KEINE Unterschriftenzeilen — das ist ein separates Dokument."
    ]
  };
}

/**
 * Vorschau einer einzelnen Sektion im Kontext des gesamten Vertrags
 */
function previewSection({ type, decisions, mode, partyData, targetSection }) {
  const result = processDecisions({ type, decisions, mode, partyData });
  const section = result.sections.find(s => s.key === targetSection);

  if (!section) {
    throw new Error(`Sektion "${targetSection}" nicht gefunden`);
  }

  return {
    section,
    fullContext: result.promptInstructions,
    riskProfile: result.riskProfile
  };
}

/**
 * Lade Playbook-Daten (für Frontend)
 */
function getPlaybook(type) {
  const playbook = playbooks[type];
  if (!playbook) return null;
  return playbook;
}

/**
 * Liste aller verfügbaren Playbooks (für Library)
 */
function listPlaybooks() {
  return Object.values(playbooks).map(p => ({
    type: p.type,
    title: p.title,
    description: p.description,
    icon: p.icon,
    difficulty: p.difficulty,
    estimatedTime: p.estimatedTime,
    sectionCount: p.sections.length,
    legalBasis: p.legalBasis
  }));
}

module.exports = {
  processDecisions,
  previewSection,
  getPlaybook,
  listPlaybooks,
  resolveDefaults,
  calculateRiskProfile
};

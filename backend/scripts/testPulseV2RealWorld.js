#!/usr/bin/env node
/**
 * Legal Pulse V2 — Real World Pipeline Test
 *
 * Tests the FULL Radar pipeline with REAL contracts from the database.
 * Simulates law changes and measures Signal-to-Noise Ratio.
 *
 * Usage:
 *   node scripts/testPulseV2RealWorld.js              # Full test (includes GPT calls)
 *   node scripts/testPulseV2RealWorld.js --dry-run     # Matching only, no GPT (free)
 *   node scripts/testPulseV2RealWorld.js --verbose      # Show full clause details
 *
 * What this tests:
 *   A. Arbeitsvertrag + BAG Urteil
 *   B. SaaS/Hosting + DSGVO Update
 *   C. NDA + BGH Urteil (should NOT match Steuerrecht)
 *   D. Freelancer + Urheberrecht
 *   E. AGB + Verbraucherrecht
 *   F. False Positives (wrong area → no match expected)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const LegalPulseV2Result = require("../models/LegalPulseV2Result");
const database = require("../config/database");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VERBOSE = args.includes("--verbose");

// ═══════════════════════════════════════════════════
// AREA-TO-CONTRACT-TYPE MAPPING (same as pulseV2Radar.js)
// ═══════════════════════════════════════════════════

const AREA_TO_CONTRACT_TYPES = {
  datenschutz: ["saas", "hosting", "dienstleistung"],
  arbeitsrecht: ["arbeitsvertrag"],
  mietrecht: ["mietvertrag"],
  handelsrecht: ["dienstleistung", "saas", "hosting", "liefervertrag"],
  verbraucherschutz: ["saas", "hosting", "versicherung"],
  steuerrecht: ["dienstleistung", "freelancer"],
  it_recht: ["saas", "hosting"],
  wettbewerbsrecht: ["nda", "freelancer"],
  versicherungsrecht: ["versicherung"],
  gesellschaftsrecht: ["dienstleistung"],
  vertragsrecht: ["saas", "hosting", "dienstleistung", "freelancer"],
  urheberrecht: ["freelancer", "nda"],
};

// ═══════════════════════════════════════════════════
// SIMULATED LAW CHANGES (realistic German legal events)
// ═══════════════════════════════════════════════════

const SIMULATED_LAW_CHANGES = [
  // ── Test A: Arbeitsrecht ──────────────────────────
  {
    id: "test-A",
    title: "BAG Urteil: Arbeitszeiterfassung ist Pflicht des Arbeitgebers",
    area: "Arbeitsrecht",
    lawStatus: "court_decision",
    description: "Das Bundesarbeitsgericht hat entschieden, dass Arbeitgeber verpflichtet sind, die Arbeitszeit ihrer Mitarbeiter systematisch zu erfassen. Bestehende Verträge ohne Arbeitszeitklausel müssen angepasst werden.",
    expectedMatch: ["arbeitsvertrag"],
    expectedNoMatch: ["nda", "mietvertrag", "hosting", "saas", "freelancer"],
    expectedSeverity: "medium",
  },

  // ── Test B: Datenschutz ───────────────────────────
  {
    id: "test-B",
    title: "DSGVO-Novelle: Neue Anforderungen an Auftragsverarbeitungsverträge",
    area: "Datenschutz",
    lawStatus: "effective",
    description: "Ab sofort gelten verschärfte Anforderungen an Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO. Insbesondere müssen technische und organisatorische Maßnahmen konkret benannt werden.",
    expectedMatch: ["saas", "hosting", "dienstleistung"],
    expectedNoMatch: ["nda", "mietvertrag", "arbeitsvertrag", "freelancer"],
    expectedSeverity: "high",
  },

  // ── Test C: Vertragsrecht (BGH) ───────────────────
  {
    id: "test-C",
    title: "BGH: AGB-Klausel zur Haftungsbeschränkung bei SaaS-Verträgen unwirksam",
    area: "Vertragsrecht",
    lawStatus: "court_decision",
    description: "Der BGH hat entschieden, dass eine pauschale Haftungsbeschränkung in AGB von SaaS-Anbietern gegen § 309 Nr. 7 BGB verstößt. Betrifft insbesondere Klauseln die Haftung für Datenverlust ausschließen.",
    expectedMatch: ["saas", "hosting", "dienstleistung", "freelancer"],
    expectedNoMatch: ["nda", "mietvertrag", "arbeitsvertrag"],
    expectedSeverity: "high",
  },

  // ── Test D: Wettbewerbsrecht ──────────────────────
  {
    id: "test-D",
    title: "Neufassung des GeschGehG: Verschärfte Anforderungen an Geheimhaltungsvereinbarungen",
    area: "Wettbewerbsrecht",
    lawStatus: "passed",
    description: "Das Geschäftsgeheimnisgesetz wird novelliert. NDAs müssen nun angemessene Schutzmaßnahmen nachweisen und die geschützten Informationen genauer definieren.",
    expectedMatch: ["nda", "freelancer"],
    expectedNoMatch: ["mietvertrag", "versicherung", "hosting", "arbeitsvertrag"],
    expectedSeverity: "medium",
  },

  // ── Test E: Verbraucherrecht ──────────────────────
  {
    id: "test-E",
    title: "Neue EU-Richtlinie: Erweiterte Widerrufsrechte für digitale Dienste",
    area: "Verbraucherschutz",
    lawStatus: "effective",
    description: "Verbraucher erhalten erweiterte Widerrufsrechte bei digitalen Dienstleistungen. AGB müssen angepasst werden.",
    expectedMatch: ["saas", "hosting", "versicherung"],
    expectedNoMatch: ["nda", "freelancer", "mietvertrag", "arbeitsvertrag"],
    expectedSeverity: "high",
  },

  // ── Test F: False Positive (Steuerrecht → NDA) ───
  {
    id: "test-F-false-positive",
    title: "Umsatzsteuer-Digitalpaket: Neue Regeln für elektronische Dienstleistungen",
    area: "Steuerrecht",
    lawStatus: "effective",
    description: "Neue Umsatzsteuerregeln für elektronische Dienstleistungen an Endverbraucher in der EU.",
    expectedMatch: ["dienstleistung", "freelancer"],
    expectedNoMatch: ["nda", "mietvertrag", "versicherung", "hosting", "arbeitsvertrag"],
    expectedSeverity: "medium",
  },
];

// ═══════════════════════════════════════════════════
// MATCHING LOGIC (mirrors pulseV2Radar.js)
// ═══════════════════════════════════════════════════

async function matchLawToContracts(lawChange) {
  const area = (lawChange.area || "").toLowerCase();
  const relevantTypes = AREA_TO_CONTRACT_TYPES[area] || [];

  const query = { status: "completed" };

  if (relevantTypes.length > 0) {
    query["document.contractType"] = {
      $in: relevantTypes.map((t) => new RegExp(t, "i")),
    };
  }

  const results = await LegalPulseV2Result.aggregate([
    { $match: query },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { contractId: "$contractId", userId: "$userId" },
        latestResult: { $first: "$$ROOT" },
      },
    },
    { $limit: 30 },
  ]);

  return results.map((r) => ({
    userId: r._id.userId,
    contractId: r._id.contractId,
    contractName: r.latestResult.context?.contractName || r._id.contractId,
    contractType: r.latestResult.document?.contractType || "unknown",
    clauseCount: (r.latestResult.clauses || []).length,
    findingsCount: (r.latestResult.clauseFindings || []).length,
    score: r.latestResult.scores?.overall || null,
    clauses: (r.latestResult.clauses || []).map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
    })),
    findings: (r.latestResult.clauseFindings || [])
      .filter((f) => ["critical", "high", "medium"].includes(f.severity))
      .map((f) => ({
        title: f.title,
        category: f.category,
        severity: f.severity,
        clauseId: f.clauseId,
      })),
    scores: r.latestResult.scores,
  }));
}

// ═══════════════════════════════════════════════════
// GPT IMPACT ASSESSMENT (optional, costs ~$0.01/call)
// ═══════════════════════════════════════════════════

async function assessImpact(lawChange, contracts) {
  if (contracts.length === 0) return [];
  if (DRY_RUN) return contracts.map((c) => ({ ...c, dryRun: true, severity: "unknown" }));

  const OpenAI = require("openai");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("  ⚠️  Kein OPENAI_API_KEY — überspringe GPT Assessment");
    return [];
  }

  const openai = new OpenAI({ apiKey, timeout: 45000, maxRetries: 1 });

  const contractSummaries = contracts
    .slice(0, 10)
    .map((c, i) => {
      const clauseList = c.clauses
        .slice(0, 15)
        .map((cl) => `  - [${cl.id}] ${cl.title} (${cl.category})`)
        .join("\n");
      const findingList = c.findings
        .slice(0, 10)
        .map((f) => `  - ${f.title} (${f.severity}, Klausel: ${f.clauseId})`)
        .join("\n");
      return (
        `[${i + 1}] "${c.contractName}" (${c.contractType}, Score: ${c.score || "?"})\n` +
        `  Klauseln:\n${clauseList || "  - keine"}\n` +
        `  Befunde:\n${findingList || "  - keine"}`
      );
    })
    .join("\n\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 2000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "impact_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              impacts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    contractIndex: { type: "number" },
                    affected: { type: "boolean" },
                    confidence: { type: "number" },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    summary: { type: "string" },
                    recommendation: { type: "string" },
                    affectedClauseIds: { type: "array", items: { type: "string" } },
                    clauseImpacts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          clauseId: { type: "string" },
                          clauseTitle: { type: "string" },
                          impact: { type: "string" },
                          suggestedChange: { type: "string" },
                        },
                        required: ["clauseId", "clauseTitle", "impact", "suggestedChange"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: [
                    "contractIndex", "affected", "confidence", "severity",
                    "summary", "recommendation", "affectedClauseIds", "clauseImpacts",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["impacts"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `Du bist ein deutscher Rechtsexperte. Prüfe ob eine Gesetzesänderung konkrete Auswirkungen auf bestimmte Verträge hat.

REGELN:
- Nur ECHTE, KONKRETE Auswirkungen melden (nicht hypothetische)
- confidence 0-100: Wie sicher bist du, dass der Vertrag betroffen ist?
- severity: critical (Vertrag potentiell unwirksam/illegal), high (Klausel muss angepasst werden), medium (Prüfung empfohlen), low (informativ)
- recommendation: Konkreter nächster Schritt
- affectedClauseIds: Nur IDs aus der Klausel-Liste des Vertrags
- Wenn ein Vertrag NICHT betroffen ist: affected=false, affectedClauseIds=[], clauseImpacts=[]

STATUS-KONTEXT:
- "proposal": Gesetzesentwurf — niedrigere severity
- "passed": Verabschiedet — mittlere severity
- "effective": In Kraft — hohe severity
- "court_decision": Gerichtsentscheidung — Klauseln prüfen
- "guideline": Behörden-Leitlinie — empfohlene Anpassung`,
        },
        {
          role: "user",
          content: `GESETZESÄNDERUNG:
Titel: ${lawChange.title}
Bereich: ${lawChange.area || "unbekannt"}
Status: ${lawChange.lawStatus || "unknown"}
Beschreibung: ${lawChange.description || ""}

VERTRÄGE:
${contractSummaries}

Prüfe für JEDEN Vertrag ob er von dieser Änderung betroffen ist.`,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const usage = response.usage;
    const cost =
      (usage.prompt_tokens * 0.15 + usage.completion_tokens * 0.6) / 1_000_000;

    return {
      impacts: (parsed.impacts || []).map((impact) => {
        const contract = contracts[impact.contractIndex - 1];
        if (!contract) return null;

        // Validate clauseIds
        const validClauseIds = new Set(contract.clauses.map((c) => c.id));
        const hallucinated = (impact.affectedClauseIds || []).filter(
          (id) => !validClauseIds.has(id)
        );

        return {
          contractName: contract.contractName,
          contractType: contract.contractType,
          affected: impact.affected,
          confidence: impact.confidence,
          severity: impact.severity,
          summary: impact.summary,
          recommendation: impact.recommendation,
          affectedClauseIds: (impact.affectedClauseIds || []).filter((id) =>
            validClauseIds.has(id)
          ),
          clauseImpacts: (impact.clauseImpacts || []).filter((ci) =>
            validClauseIds.has(ci.clauseId)
          ),
          hallucinatedIds: hallucinated,
        };
      }).filter(Boolean),
      cost,
      tokens: { input: usage.prompt_tokens, output: usage.completion_tokens },
    };
  } catch (err) {
    console.error(`  ❌ GPT Error: ${err.message}`);
    return { impacts: [], cost: 0, tokens: { input: 0, output: 0 } };
  }
}

// ═══════════════════════════════════════════════════
// SEED: Realistic test contracts for pipeline testing
// ═══════════════════════════════════════════════════

const SEED_USER_ID = "test-realworld-user";

async function seedTestContracts() {
  console.log("  Erstelle 5 realistische Testverträge...\n");
  const contracts = [];

  // ── A: Arbeitsvertrag ────────────────────────────
  contracts.push({
    userId: SEED_USER_ID,
    contractId: "seed-arbeitsvertrag-001",
    requestId: `seed-req-arbeit-${Date.now()}`,
    status: "completed",
    currentStage: 5,
    triggeredBy: "manual",
    document: {
      qualityScore: 88, pageCount: 5, language: "de",
      structureDetected: true, cleanedTextLength: 12000,
      contractType: "arbeitsvertrag", contractTypeConfidence: 95,
      extractedMeta: { parties: ["TechCorp GmbH", "Max Mustermann"], contractDate: "2024-06-01", contractType: "arbeitsvertrag" },
    },
    context: {
      contractName: "Arbeitsvertrag Max Mustermann",
      contractType: "arbeitsvertrag",
      parties: ["TechCorp GmbH", "Max Mustermann"],
      duration: "unbefristet",
      portfolioSize: 5,
    },
    clauses: [
      { id: "arb-c1", title: "Arbeitszeit und Überstunden", originalText: "Die regelmäßige Arbeitszeit beträgt 40 Stunden pro Woche. Überstunden werden mit dem Gehalt abgegolten, soweit sie 10 % der regulären Arbeitszeit nicht überschreiten.", category: "Arbeitszeit", sectionNumber: "§3" },
      { id: "arb-c2", title: "Kündigungsfristen", originalText: "Das Arbeitsverhältnis kann von beiden Seiten mit einer Frist von 4 Wochen zum Monatsende gekündigt werden. Nach 2 Jahren Betriebszugehörigkeit verlängert sich die Frist auf 2 Monate.", category: "Kündigung", sectionNumber: "§8" },
      { id: "arb-c3", title: "Wettbewerbsverbot", originalText: "Der Arbeitnehmer verpflichtet sich, während der Dauer des Arbeitsverhältnisses und 12 Monate nach dessen Beendigung nicht für ein Konkurrenzunternehmen tätig zu werden.", category: "Wettbewerb", sectionNumber: "§11" },
      { id: "arb-c4", title: "Datenschutz am Arbeitsplatz", originalText: "Der Arbeitnehmer verpflichtet sich zur Einhaltung der DSGVO und der betrieblichen Datenschutzrichtlinien.", category: "Datenschutz", sectionNumber: "§14" },
      { id: "arb-c5", title: "Nebentätigkeit", originalText: "Nebentätigkeiten bedürfen der vorherigen schriftlichen Zustimmung des Arbeitgebers.", category: "Pflichten", sectionNumber: "§6" },
    ],
    clauseFindings: [
      { clauseId: "arb-c1", category: "Arbeitszeit", severity: "high", type: "risk", title: "Überstundenpauschale möglicherweise unwirksam", description: "Die pauschale Abgeltung von Überstunden ist nach BAG-Rechtsprechung nur wirksam, wenn sie transparent und bestimmt ist.", legalBasis: "BAG 1 ABR 22/21", affectedText: "Überstunden werden mit dem Gehalt abgegolten", confidence: 80, reasoning: "10% ist zwar ein konkreter Wert, aber die Klausel könnte nach aktueller Rechtsprechung als intransparent gelten.", isIntentional: false },
      { clauseId: "arb-c3", category: "Wettbewerb", severity: "medium", type: "compliance", title: "Nachvertragliches Wettbewerbsverbot ohne Karenzentschädigung", description: "Ein nachvertragliches Wettbewerbsverbot ist nur wirksam mit Karenzentschädigung von mind. 50% des letzten Gehalts.", legalBasis: "§ 74 HGB", affectedText: "12 Monate nach dessen Beendigung", confidence: 90, reasoning: "Keine Karenzentschädigung erwähnt.", isIntentional: false },
    ],
    scores: { overall: 68, risk: 60, compliance: 72, terms: 70, completeness: 65, factors: { riskSeverity: 0.7, contractAge: 0.4, deadlineProximity: 0, historicalTrend: 0 } },
    costs: { totalTokensInput: 6000, totalTokensOutput: 2500, totalCostUSD: 0.18, perStage: [] },
    version: "2.0.0",
    completedAt: new Date(),
  });

  // ── B: SaaS/Hosting Vertrag ──────────────────────
  contracts.push({
    userId: SEED_USER_ID,
    contractId: "seed-hosting-001",
    requestId: `seed-req-hosting-${Date.now()}`,
    status: "completed",
    currentStage: 5,
    triggeredBy: "manual",
    document: {
      qualityScore: 92, pageCount: 8, language: "de",
      structureDetected: true, cleanedTextLength: 18000,
      contractType: "hosting", contractTypeConfidence: 92,
      extractedMeta: { parties: ["CloudHost AG", "TechCorp GmbH"], contractDate: "2025-01-15", contractType: "hosting" },
    },
    context: {
      contractName: "CloudHost Managed Hosting Vertrag",
      contractType: "hosting",
      parties: ["CloudHost AG", "TechCorp GmbH"],
      duration: "24 Monate",
      portfolioSize: 5,
    },
    clauses: [
      { id: "host-c1", title: "Service Level Agreement", originalText: "Der Anbieter garantiert eine Verfügbarkeit von 99,5% pro Monat. Bei Unterschreitung erhält der Kunde eine Gutschrift von 5% der Monatspauschale pro 0,1% Unterschreitung.", category: "SLA", sectionNumber: "§4" },
      { id: "host-c2", title: "Haftungsbeschränkung", originalText: "Die Haftung des Anbieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten. Die Haftung ist auf den vertragstypischen, vorhersehbaren Schaden begrenzt, maximal jedoch auf die Jahresvergütung.", category: "Haftung", sectionNumber: "§9" },
      { id: "host-c3", title: "Auftragsverarbeitung (AVV)", originalText: "Der Anbieter verarbeitet personenbezogene Daten im Auftrag des Kunden. Eine gesonderte Auftragsverarbeitungsvereinbarung gemäß Art. 28 DSGVO ist als Anlage beigefügt.", category: "Datenschutz", sectionNumber: "§12" },
      { id: "host-c4", title: "Datensicherung und Löschung", originalText: "Der Anbieter erstellt tägliche Backups. Nach Vertragsende werden alle Daten innerhalb von 30 Tagen gelöscht. Der Kunde kann vorher einen Datenexport anfordern.", category: "Datenschutz", sectionNumber: "§13" },
      { id: "host-c5", title: "Vertragslaufzeit und Kündigung", originalText: "Der Vertrag hat eine Mindestlaufzeit von 24 Monaten und verlängert sich automatisch um jeweils 12 Monate, wenn er nicht 3 Monate vor Ablauf gekündigt wird.", category: "Laufzeit", sectionNumber: "§15" },
    ],
    clauseFindings: [
      { clauseId: "host-c2", category: "Haftung", severity: "medium", type: "risk", title: "Haftungsbegrenzung auf Jahresvergütung", description: "Die Begrenzung auf die Jahresvergütung könnte bei Datenverlust unzureichend sein.", legalBasis: "§ 309 Nr. 7 BGB", affectedText: "maximal jedoch auf die Jahresvergütung", confidence: 75, reasoning: "Bei kritischer Infrastruktur könnte der Schaden die Jahresvergütung deutlich übersteigen.", isIntentional: true },
      { clauseId: "host-c3", category: "Datenschutz", severity: "high", type: "compliance", title: "AVV als separate Anlage nicht beigefügt", description: "Die AVV wird referenziert, aber es ist unklar ob sie tatsächlich vorliegt.", legalBasis: "Art. 28 Abs. 3 DSGVO", affectedText: "als Anlage beigefügt", confidence: 70, reasoning: "Ohne AVV ist die Datenverarbeitung nicht DSGVO-konform.", isIntentional: false },
    ],
    scores: { overall: 74, risk: 70, compliance: 68, terms: 78, completeness: 80, factors: { riskSeverity: 0.5, contractAge: 0.2, deadlineProximity: 0.4, historicalTrend: 0 } },
    costs: { totalTokensInput: 8000, totalTokensOutput: 3000, totalCostUSD: 0.22, perStage: [] },
    version: "2.0.0",
    completedAt: new Date(),
  });

  // ── C: NDA ───────────────────────────────────────
  contracts.push({
    userId: SEED_USER_ID,
    contractId: "seed-nda-001",
    requestId: `seed-req-nda-${Date.now()}`,
    status: "completed",
    currentStage: 5,
    triggeredBy: "manual",
    document: {
      qualityScore: 95, pageCount: 3, language: "de",
      structureDetected: true, cleanedTextLength: 4500,
      contractType: "nda", contractTypeConfidence: 98,
      extractedMeta: { parties: ["TechCorp GmbH", "InnoStart GmbH"], contractDate: "2025-03-01", contractType: "nda" },
    },
    context: {
      contractName: "NDA TechCorp — InnoStart",
      contractType: "nda",
      parties: ["TechCorp GmbH", "InnoStart GmbH"],
      duration: "36 Monate",
      portfolioSize: 5,
    },
    clauses: [
      { id: "nda-c1", title: "Gegenstand der Geheimhaltung", originalText: "Vertrauliche Informationen sind alle Informationen, die als vertraulich gekennzeichnet sind oder deren Vertraulichkeit sich aus der Natur der Information ergibt.", category: "Geheimhaltung", sectionNumber: "§1" },
      { id: "nda-c2", title: "Geheimhaltungspflicht", originalText: "Die empfangende Partei verpflichtet sich, vertrauliche Informationen streng geheim zu halten und nur für den vereinbarten Zweck zu verwenden. Weitergabe an Dritte nur mit vorheriger schriftlicher Zustimmung.", category: "Geheimhaltung", sectionNumber: "§2" },
      { id: "nda-c3", title: "Vertragsstrafe", originalText: "Bei Verstoß gegen die Geheimhaltungspflicht schuldet die verletztende Partei eine Vertragsstrafe in Höhe von 50.000 EUR pro Verstoß. Die Geltendmachung weitergehender Schadensersatzansprüche bleibt unberührt.", category: "Vertragsstrafe", sectionNumber: "§5" },
      { id: "nda-c4", title: "Laufzeit und Rückgabe", originalText: "Die Geheimhaltungspflicht gilt für 3 Jahre nach Beendigung der Zusammenarbeit. Alle vertraulichen Unterlagen sind nach Beendigung zurückzugeben oder zu vernichten.", category: "Laufzeit", sectionNumber: "§6" },
    ],
    clauseFindings: [
      { clauseId: "nda-c3", category: "Vertragsstrafe", severity: "medium", type: "risk", title: "Hohe pauschale Vertragsstrafe", description: "50.000 EUR pro Verstoß könnte als unverhältnismäßig gelten, insbesondere für kleinere Verstöße.", legalBasis: "§ 343 BGB", affectedText: "50.000 EUR pro Verstoß", confidence: 65, reasoning: "Gerichte prüfen die Angemessenheit von Vertragsstrafen.", isIntentional: true },
    ],
    scores: { overall: 82, risk: 78, compliance: 88, terms: 80, completeness: 76, factors: { riskSeverity: 0.3, contractAge: 0.1, deadlineProximity: 0, historicalTrend: 0 } },
    costs: { totalTokensInput: 3000, totalTokensOutput: 1500, totalCostUSD: 0.10, perStage: [] },
    version: "2.0.0",
    completedAt: new Date(),
  });

  // ── D: Freelancer Vertrag ────────────────────────
  contracts.push({
    userId: SEED_USER_ID,
    contractId: "seed-freelancer-001",
    requestId: `seed-req-freelancer-${Date.now()}`,
    status: "completed",
    currentStage: 5,
    triggeredBy: "manual",
    document: {
      qualityScore: 85, pageCount: 4, language: "de",
      structureDetected: true, cleanedTextLength: 7000,
      contractType: "freelancer", contractTypeConfidence: 88,
      extractedMeta: { parties: ["TechCorp GmbH", "Anna Designer"], contractDate: "2025-02-01", contractType: "freelancer" },
    },
    context: {
      contractName: "Freelancer-Vertrag Anna Designer",
      contractType: "freelancer",
      parties: ["TechCorp GmbH", "Anna Designer"],
      duration: "6 Monate",
      portfolioSize: 5,
    },
    clauses: [
      { id: "free-c1", title: "Leistungsbeschreibung", originalText: "Die Freelancerin erstellt UI/UX-Designs für die Web-Applikation des Auftraggebers. Die Einzelheiten werden in separaten Projektbriefings festgelegt.", category: "Leistung", sectionNumber: "§1" },
      { id: "free-c2", title: "Vergütung", originalText: "Die Vergütung beträgt 85 EUR pro Stunde zzgl. USt. Rechnungen sind monatlich zu stellen mit Zahlungsziel 14 Tage.", category: "Vergütung", sectionNumber: "§3" },
      { id: "free-c3", title: "Nutzungsrechte / Urheberrecht", originalText: "Mit vollständiger Bezahlung gehen alle Nutzungsrechte an den erstellten Werken auf den Auftraggeber über. Dies umfasst die zeitlich und räumlich unbeschränkte Nutzung in allen Medien.", category: "Urheberrecht", sectionNumber: "§5" },
      { id: "free-c4", title: "Geheimhaltung", originalText: "Die Freelancerin verpflichtet sich zur Geheimhaltung aller im Rahmen der Tätigkeit erlangten Geschäftsgeheimnisse, auch nach Vertragsende.", category: "Geheimhaltung", sectionNumber: "§7" },
      { id: "free-c5", title: "Scheinselbständigkeit", originalText: "Die Freelancerin ist in der Gestaltung ihrer Arbeitszeit und ihres Arbeitsortes frei. Sie kann auch für andere Auftraggeber tätig sein.", category: "Selbständigkeit", sectionNumber: "§8" },
    ],
    clauseFindings: [
      { clauseId: "free-c3", category: "Urheberrecht", severity: "medium", type: "risk", title: "Sehr weitgehende Rechteübertragung", description: "Die vollständige Übertragung aller Nutzungsrechte ohne Einschränkung geht über das übliche Maß hinaus.", legalBasis: "§ 31 Abs. 5 UrhG", affectedText: "zeitlich und räumlich unbeschränkte Nutzung in allen Medien", confidence: 72, reasoning: "Zweckübertragungsregel: Nur die für den Vertragszweck notwendigen Rechte gelten als übertragen.", isIntentional: true },
      { clauseId: "free-c2", category: "Vergütung", severity: "low", type: "information", title: "Kurzes Zahlungsziel", description: "14 Tage Zahlungsziel ist marktüblich, aber knapp.", legalBasis: "§ 286 BGB", affectedText: "Zahlungsziel 14 Tage", confidence: 55, reasoning: "Üblicher Marktstandard, kein rechtliches Problem.", isIntentional: true },
    ],
    scores: { overall: 76, risk: 74, compliance: 82, terms: 72, completeness: 70, factors: { riskSeverity: 0.4, contractAge: 0.1, deadlineProximity: 0.6, historicalTrend: 0 } },
    costs: { totalTokensInput: 5000, totalTokensOutput: 2000, totalCostUSD: 0.14, perStage: [] },
    version: "2.0.0",
    completedAt: new Date(),
  });

  // ── E: Mietvertrag ───────────────────────────────
  contracts.push({
    userId: SEED_USER_ID,
    contractId: "seed-mietvertrag-001",
    requestId: `seed-req-miet-${Date.now()}`,
    status: "completed",
    currentStage: 5,
    triggeredBy: "manual",
    document: {
      qualityScore: 78, pageCount: 6, language: "de",
      structureDetected: true, cleanedTextLength: 14000,
      contractType: "mietvertrag", contractTypeConfidence: 96,
      extractedMeta: { parties: ["Immobilien GmbH", "TechCorp GmbH"], contractDate: "2023-07-01", contractType: "mietvertrag" },
    },
    context: {
      contractName: "Gewerbemietvertrag Büro München",
      contractType: "mietvertrag",
      parties: ["Immobilien GmbH", "TechCorp GmbH"],
      duration: "60 Monate",
      portfolioSize: 5,
    },
    clauses: [
      { id: "miet-c1", title: "Mietgegenstand und Mietzins", originalText: "Vermietet wird die Bürofläche im 3. OG, ca. 250 qm. Die monatliche Nettomiete beträgt 3.750 EUR zzgl. Nebenkosten.", category: "Miete", sectionNumber: "§1" },
      { id: "miet-c2", title: "Nebenkosten", originalText: "Der Mieter trägt die Nebenkosten gemäß Betriebskostenverordnung. Vorauszahlung: 750 EUR/Monat. Jährliche Abrechnung.", category: "Nebenkosten", sectionNumber: "§4" },
      { id: "miet-c3", title: "Schönheitsreparaturen", originalText: "Der Mieter übernimmt die Schönheitsreparaturen während der Mietzeit und bei Auszug. Die Renovierung hat in neutralen Farben zu erfolgen.", category: "Instandhaltung", sectionNumber: "§7" },
      { id: "miet-c4", title: "Vertragslaufzeit", originalText: "Der Mietvertrag läuft fest für 5 Jahre bis zum 30.06.2028. Eine ordentliche Kündigung ist während der Festlaufzeit ausgeschlossen.", category: "Laufzeit", sectionNumber: "§10" },
    ],
    clauseFindings: [
      { clauseId: "miet-c3", category: "Instandhaltung", severity: "high", type: "risk", title: "Schönheitsreparaturklausel möglicherweise unwirksam", description: "Nach BGH-Rechtsprechung sind starre Renovierungsfristen und Endrenovierungsklauseln unwirksam.", legalBasis: "BGH VIII ZR 185/14", affectedText: "bei Auszug", confidence: 85, reasoning: "Endrenovierungsklausel ohne Rücksicht auf Zustand = unwirksam nach BGH.", isIntentional: false },
    ],
    scores: { overall: 70, risk: 62, compliance: 75, terms: 72, completeness: 68, factors: { riskSeverity: 0.6, contractAge: 0.6, deadlineProximity: 0.3, historicalTrend: 0 } },
    costs: { totalTokensInput: 6500, totalTokensOutput: 2200, totalCostUSD: 0.16, perStage: [] },
    version: "2.0.0",
    completedAt: new Date(),
  });

  // Insert all
  const inserted = await LegalPulseV2Result.insertMany(contracts);
  console.log(`  ✅ ${inserted.length} Testverträge erstellt:\n`);
  for (const c of contracts) {
    console.log(`    • ${c.context.contractName} (${c.document.contractType}) — ${c.clauses.length} Klauseln, ${c.clauseFindings.length} Befunde`);
  }

  return true;
}

async function cleanupSeedData() {
  const deleted = await LegalPulseV2Result.deleteMany({ userId: SEED_USER_ID });
  if (deleted.deletedCount > 0) {
    console.log(`  ✅ ${deleted.deletedCount} Testverträge bereinigt`);
  }
}

// ═══════════════════════════════════════════════════
// SIGNAL-TO-NOISE CALCULATION
// ═══════════════════════════════════════════════════

function calculateSignalToNoise(results) {
  let totalAlerts = 0;
  let relevantAlerts = 0;
  let falsePositives = 0;
  let correctNoMatch = 0;
  let missedMatches = 0;

  for (const r of results) {
    if (r.matchedContracts.length > 0) {
      totalAlerts += r.matchedContracts.length;

      if (r.gptResult && !r.gptResult.dryRun) {
        for (const impact of r.gptResult.impacts || []) {
          if (impact.affected && impact.confidence >= 60) {
            relevantAlerts++;
          } else if (!impact.affected || impact.confidence < 60) {
            falsePositives++;
          }
        }
      }
    }

    // Check expected no-matches
    for (const noMatchType of r.lawChange.expectedNoMatch || []) {
      const wrongMatch = r.matchedContracts.find(
        (c) => c.contractType.toLowerCase().includes(noMatchType)
      );
      if (wrongMatch) {
        falsePositives++;
        console.log(
          `  ⚠️  FALSE POSITIVE: "${r.lawChange.area}" matched "${wrongMatch.contractType}" (should not match "${noMatchType}")`
        );
      } else {
        correctNoMatch++;
      }
    }
  }

  const snr = totalAlerts > 0
    ? ((relevantAlerts / totalAlerts) * 100).toFixed(1)
    : "N/A";

  return { totalAlerts, relevantAlerts, falsePositives, correctNoMatch, missedMatches, snr };
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Legal Pulse V2 — Real World Pipeline Test             ║");
  console.log(`║   Mode: ${DRY_RUN ? "DRY RUN (kein GPT)" : "FULL (mit GPT Assessment)"}${" ".repeat(DRY_RUN ? 17 : 10)}║`);
  console.log("╚══════════════════════════════════════════════════════════╝");

  // Connect
  await mongoose.connect(process.env.MONGO_URI);
  const db = await database.connect();
  console.log("\n  ✅ Datenbankverbindung hergestellt");

  // ─────────────────────────────────────────────────
  // STEP 1: Discover what V2 results exist
  // ─────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Phase 1: Bestandsaufnahme — V2 Analysen in DB");
  console.log("═══════════════════════════════════════════════════════════\n");

  const allResults = await LegalPulseV2Result.aggregate([
    { $match: { status: "completed" } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { contractId: "$contractId", userId: "$userId" },
        latestResult: { $first: "$$ROOT" },
      },
    },
  ]);

  const typeCounts = {};
  for (const r of allResults) {
    const type = r.latestResult.document?.contractType || "unknown";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }

  console.log(`  Gefunden: ${allResults.length} V2-analysierte Verträge\n`);
  console.log("  Vertragstypen:");
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    • ${type}: ${count}`);
  }

  let seeded = false;
  if (allResults.length === 0) {
    console.log("\n  ⚠️  Keine V2-Ergebnisse gefunden — erstelle realistische Testdaten...\n");
    seeded = true;
    await seedTestContracts();

    // Re-query
    const newResults = await LegalPulseV2Result.aggregate([
      { $match: { status: "completed" } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: { contractId: "$contractId", userId: "$userId" }, latestResult: { $first: "$$ROOT" } } },
    ]);
    allResults.push(...newResults);
    for (const r of newResults) {
      const type = r.latestResult.document?.contractType || "unknown";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
    console.log(`\n  Jetzt verfügbar: ${allResults.length} Verträge`);
  }

  // Show clause stats
  let totalClauses = 0;
  let totalFindings = 0;
  for (const r of allResults) {
    totalClauses += (r.latestResult.clauses || []).length;
    totalFindings += (r.latestResult.clauseFindings || []).length;
  }
  console.log(`\n  Gesamt: ${totalClauses} Klauseln, ${totalFindings} Befunde`);

  // ─────────────────────────────────────────────────
  // STEP 2: Run simulated law changes
  // ─────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Phase 2: Simulierte Gesetzesänderungen → Matching");
  console.log("═══════════════════════════════════════════════════════════");

  const results = [];
  let totalCost = 0;

  for (const lawChange of SIMULATED_LAW_CHANGES) {
    console.log(`\n  ── ${lawChange.id}: ${lawChange.title.substring(0, 60)}...`);
    console.log(`     Area: ${lawChange.area} | Status: ${lawChange.lawStatus}`);

    // Step 2a: Match
    const matched = await matchLawToContracts(lawChange);
    const matchedTypes = [...new Set(matched.map((c) => c.contractType))];

    console.log(`     Matched: ${matched.length} Verträge [${matchedTypes.join(", ") || "keine"}]`);

    // Check expected matches
    if (lawChange.expectedMatch === "all") {
      console.log(`     ✅ Matching: alle Verträge (kein Filter, Vertragsrecht-Catch-All)`);
    } else {
      const expected = lawChange.expectedMatch;
      const noMatch = lawChange.expectedNoMatch;

      // Check for false positives in matching
      for (const type of noMatch) {
        if (matchedTypes.some((t) => t.toLowerCase().includes(type))) {
          console.log(`     ❌ FALSE POSITIVE: "${type}" sollte NICHT gematcht werden`);
        }
      }

      // Check for missed expected matches
      for (const type of expected) {
        if (matched.some((c) => c.contractType.toLowerCase().includes(type))) {
          console.log(`     ✅ ${type} korrekt gematcht`);
        } else if (typeCounts[type]) {
          console.log(`     ⚠️  ${type} existiert in DB, aber NICHT gematcht`);
        }
      }
    }

    if (VERBOSE && matched.length > 0) {
      for (const c of matched) {
        console.log(`       📄 "${c.contractName}" (${c.contractType}) — ${c.clauseCount} Klauseln, Score: ${c.score}`);
      }
    }

    // Step 2b: GPT Assessment (optional)
    let gptResult = null;
    if (matched.length > 0) {
      if (DRY_RUN) {
        console.log(`     ⏭️  GPT Assessment übersprungen (--dry-run)`);
        gptResult = { impacts: matched.map((c) => ({ ...c, dryRun: true })), cost: 0 };
      } else {
        process.stdout.write(`     🤖 GPT Assessment läuft...`);
        gptResult = await assessImpact(lawChange, matched);
        totalCost += gptResult.cost || 0;

        const affected = (gptResult.impacts || []).filter(
          (i) => i.affected && i.confidence >= 60
        );
        const notAffected = (gptResult.impacts || []).filter(
          (i) => !i.affected || i.confidence < 60
        );
        const hallucinated = (gptResult.impacts || []).reduce(
          (sum, i) => sum + (i.hallucinatedIds?.length || 0), 0
        );

        console.log(` fertig ($${(gptResult.cost || 0).toFixed(4)})`);
        console.log(`     → Betroffen: ${affected.length} | Nicht betroffen: ${notAffected.length} | Halluzinierte IDs: ${hallucinated}`);

        for (const impact of affected) {
          console.log(`       ✅ "${impact.contractName}" (${impact.severity}, confidence: ${impact.confidence})`);
          console.log(`          ${impact.summary}`);
          console.log(`          → ${impact.recommendation}`);
          if (impact.affectedClauseIds.length > 0) {
            console.log(`          Klauseln: ${impact.affectedClauseIds.join(", ")}`);
          }
          if (VERBOSE) {
            for (const ci of impact.clauseImpacts || []) {
              console.log(`            📌 ${ci.clauseTitle}: ${ci.impact}`);
            }
          }
        }

        for (const impact of notAffected) {
          console.log(`       ⬚ "${impact.contractName}" — nicht betroffen (confidence: ${impact.confidence})`);
        }
      }
    }

    results.push({ lawChange, matchedContracts: matched, gptResult });
  }

  // ─────────────────────────────────────────────────
  // STEP 3: Signal-to-Noise Ratio
  // ─────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Phase 3: Signal-to-Noise Ratio");
  console.log("═══════════════════════════════════════════════════════════\n");

  const snr = calculateSignalToNoise(results);

  console.log(`  📊 Matching-Ergebnisse:`);
  console.log(`     • Gesamt Alerts erzeugt:     ${snr.totalAlerts}`);
  if (!DRY_RUN) {
    console.log(`     • Davon relevant (GPT):     ${snr.relevantAlerts}`);
  }
  console.log(`     • False Positives (Matching): ${snr.falsePositives}`);
  console.log(`     • Korrekte Non-Matches:      ${snr.correctNoMatch}`);
  if (!DRY_RUN) {
    console.log(`\n  📈 Signal-to-Noise Ratio: ${snr.snr}%`);
    if (parseFloat(snr.snr) >= 70) {
      console.log(`     ✅ Gute Signalqualität (≥70%)`);
    } else if (parseFloat(snr.snr) >= 50) {
      console.log(`     ⚠️  Mittlere Signalqualität — Matching könnte präziser sein`);
    } else {
      console.log(`     ❌ Schlechte Signalqualität — zu viel Noise, Filter verbessern`);
    }
  }

  // ─────────────────────────────────────────────────
  // STEP 4: Coverage Matrix
  // ─────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Phase 4: Coverage Matrix");
  console.log("═══════════════════════════════════════════════════════════\n");

  const allAreas = [...new Set(SIMULATED_LAW_CHANGES.map((l) => l.area))];
  const allTypes = Object.keys(typeCounts);

  // Build matrix
  console.log("  Welche Vertragstypen werden von welchen Rechtsgebieten erfasst:\n");
  const header = "  " + "Rechtsgebiet".padEnd(20) + allTypes.map((t) => t.substring(0, 12).padEnd(14)).join("");
  console.log(header);
  console.log("  " + "─".repeat(header.length - 2));

  for (const area of allAreas) {
    const areaKey = area.toLowerCase();
    const relevantTypes = AREA_TO_CONTRACT_TYPES[areaKey] || [];
    const row =
      "  " +
      area.padEnd(20) +
      allTypes
        .map((t) => {
          const matches =
            relevantTypes.length === 0 || relevantTypes.some((rt) => t.toLowerCase().includes(rt));
          return (matches ? "  ✅" : "  ·").padEnd(14);
        })
        .join("");
    console.log(row);
  }

  // ─────────────────────────────────────────────────
  // STEP 5: Recommendations
  // ─────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Phase 5: Empfehlungen");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Check for missing contract types in mapping
  const mappedTypes = new Set(Object.values(AREA_TO_CONTRACT_TYPES).flat());
  const unmappedTypes = allTypes.filter((t) => !mappedTypes.has(t.toLowerCase()) && t !== "unknown");
  if (unmappedTypes.length > 0) {
    console.log(`  ⚠️  Vertragstypen ohne Area-Mapping: ${unmappedTypes.join(", ")}`);
    console.log(`     → Diese werden bei JEDEM Gesetz gematcht (kein Filter)`);
    console.log(`     → Empfehlung: AREA_TO_CONTRACT_TYPES in pulseV2Radar.js erweitern\n`);
  }

  // Check for areas without matching contracts
  const testedAreas = SIMULATED_LAW_CHANGES.map((l) => l.area.toLowerCase());
  const unmappedAreas = testedAreas.filter((a) => !AREA_TO_CONTRACT_TYPES[a]);
  if (unmappedAreas.length > 0) {
    console.log(`  ⚠️  Rechtsgebiete ohne Mapping: ${unmappedAreas.join(", ")}`);
    console.log(`     → Alle Verträge werden gematcht (zu breit)\n`);
  }

  if (snr.falsePositives === 0) {
    console.log("  ✅ Keine False Positives im Matching erkannt");
  }

  if (!DRY_RUN) {
    console.log(`\n  💰 Gesamtkosten GPT: $${totalCost.toFixed(4)}`);
  }

  // ─────────────────────────────────────────────────
  // CLEANUP (if we seeded test data)
  // ─────────────────────────────────────────────────
  if (seeded) {
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  Cleanup — Testdaten entfernen");
    console.log("═══════════════════════════════════════════════════════════\n");
    await cleanupSeedData();
  }

  // ─────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log(`║  ERGEBNIS: ${allResults.length} Verträge, ${SIMULATED_LAW_CHANGES.length} Szenarien, ${snr.totalAlerts} Alerts${" ".repeat(Math.max(0, 12 - String(snr.totalAlerts).length))}║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("\nFatal:", err);
  try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  process.exit(1);
});

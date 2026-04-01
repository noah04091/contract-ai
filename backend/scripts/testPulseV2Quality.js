#!/usr/bin/env node
/**
 * Legal Pulse V2 — Quality Validation Script
 *
 * Tests the analysis quality after the Ebene 1+2+3 prompt improvements.
 * Evaluates: norm accuracy, false risk detection, severity distribution, finding quality.
 *
 * Usage:
 *   node scripts/testPulseV2Quality.js                    # Analyze existing results from DB (FREE)
 *   node scripts/testPulseV2Quality.js --live              # Run fresh analysis on contracts (costs ~$0.05-0.20 per contract)
 *   node scripts/testPulseV2Quality.js --live --limit 3    # Limit to 3 contracts
 *   node scripts/testPulseV2Quality.js --contract <id>     # Analyze specific contract
 *   node scripts/testPulseV2Quality.js --verbose           # Show individual findings
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const LegalPulseV2Result = require("../models/LegalPulseV2Result");
const database = require("../config/database");

const args = process.argv.slice(2);
const LIVE_MODE = args.includes("--live");
const VERBOSE = args.includes("--verbose");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) || 5 : 10;
const contractIdx = args.indexOf("--contract");
const SPECIFIC_CONTRACT = contractIdx >= 0 ? args[contractIdx + 1] : null;

// ═══════════════════════════════════════════════════
// KNOWN-WRONG NORMS — these should NEVER appear for these contexts
// ═══════════════════════════════════════════════════
const WRONG_NORM_PATTERNS = [
  {
    pattern: /§\s*276\s*BGB/i,
    wrongContext: /agb|allgemeine.geschäftsbedingung|klauselkontrolle|unwirksam/i,
    correctNorm: "§ 307 BGB (AGB-Kontrolle)",
    description: "§ 276 BGB (Verschuldensmaßstäbe) statt § 307 BGB für AGB-Kontrolle",
  },
  {
    pattern: /§\s*276\s*BGB/i,
    wrongContext: /factoring|abtretung|forderungskauf|ankauf/i,
    correctNorm: "§§ 398ff BGB (Abtretung) oder § 307 BGB",
    description: "§ 276 BGB für Factoring-Kontext (kein Verschuldensbezug)",
  },
  {
    pattern: /§\s*305\s*BGB/i,
    wrongContext: /individualvertrag|ausgehandelt|individuell.vereinbart/i,
    correctNorm: "Keine AGB-Norm bei Individualvertrag",
    description: "§ 305 BGB (AGB-Einbeziehung) bei Individualvereinbarung",
  },
  {
    pattern: /§\s*611\s*BGB/i,
    wrongContext: /werkvertrag|herstellung|erfolg/i,
    correctNorm: "§ 631 BGB (Werkvertrag)",
    description: "§ 611 BGB (Dienstvertrag) statt § 631 BGB für Werkleistungen",
  },
  {
    pattern: /§\s*535\s*BGB/i,
    wrongContext: /pacht|landwirtschaft|fruchtziehung/i,
    correctNorm: "§ 581 BGB (Pachtvertrag)",
    description: "§ 535 BGB (Mietvertrag) statt § 581 BGB für Pacht",
  },
];

// ═══════════════════════════════════════════════════
// KERNMECHANISMEN per Vertragstyp — these should NEVER be flagged as risks
// ═══════════════════════════════════════════════════
const KERNMECHANISMEN = {
  factoring: [
    /delkredere/i,
    /forderungs(ab)?tretung/i,
    /ankaufsfaktor/i,
    /veritätshaftung/i,
    /rückabtretung/i,
    /forderungsankauf/i,
  ],
  leasing: [
    /restwert/i,
    /leasingrate/i,
    /vollamortisation/i,
    /teilamortisation/i,
    /andienungsrecht/i,
  ],
  versicherung: [
    /prämie/i,
    /selbstbeteiligung/i,
    /deckungssumme/i,
    /versicherungsfall/i,
    /obliegenheit/i,
  ],
  buergschaft: [
    /bürgschaft/i,
    /selbstschuldnerisch/i,
    /einrede.der.vorausklage/i,
    /höchstbetrag/i,
  ],
  darlehen: [
    /zinssatz/i,
    /tilgung/i,
    /sondertilgung/i,
    /bereitstellungszins/i,
    /annuitätendarlehen/i,
  ],
  mietvertrag: [
    /mietzins/i,
    /kaution/i,
    /nebenkosten/i,
    /staffelmiete/i,
    /indexmiete/i,
  ],
  arbeitsvertrag: [
    /gehalt/i,
    /probezeit/i,
    /kündigungsfrist/i,
    /urlaubsanspruch/i,
    /arbeitszeit/i,
  ],
  saas: [
    /sla|service.level/i,
    /verfügbarkeit/i,
    /uptime/i,
    /api-zugang/i,
    /subscription/i,
  ],
};

// ═══════════════════════════════════════════════════
// QUALITY EVALUATOR
// ═══════════════════════════════════════════════════

function evaluateResult(result) {
  const report = {
    contractId: result.contractId,
    contractType: result.document?.contractType || result.context?.contractType || "unknown",
    contractName: result.context?.contractName || "N/A",
    status: result.status,
    scores: result.scores || {},
    findingsCount: (result.clauseFindings || []).length,
    clauseCount: (result.clauses || []).length,
    coverage: result.coverage || {},
    costs: result.costs || {},

    // Quality metrics
    quality: {
      wrongNorms: [],
      kernmechanismusAsRisk: [],
      severityDistribution: { info: 0, low: 0, medium: 0, high: 0, critical: 0 },
      typeDistribution: { risk: 0, compliance: 0, opportunity: 0, information: 0 },
      confidenceDistribution: { borderline: 0, moderate: 0, high: 0 },
      enforceabilityDistribution: { valid: 0, questionable: 0, likely_invalid: 0, unknown: 0 },
      avgConfidence: 0,
      findingsPerClause: 0,
      unverifiedAffectedText: 0,
      emptyLegalBasis: 0,
      genericFindings: 0,
    },
  };

  const findings = result.clauseFindings || [];
  if (findings.length === 0) return report;

  const contractTypeLower = report.contractType.toLowerCase()
    .replace(/[-\s]+(vertrag|rahmenvertrag|vereinbarung)/g, "")
    .replace(/[^a-zäöü]/g, "");

  // 1. Check for wrong norms
  for (const finding of findings) {
    const textToCheck = [finding.legalBasis, finding.description, finding.reasoning]
      .filter(Boolean).join(" ");

    for (const wrongNorm of WRONG_NORM_PATTERNS) {
      if (wrongNorm.pattern.test(textToCheck) && wrongNorm.wrongContext.test(textToCheck)) {
        report.quality.wrongNorms.push({
          findingTitle: finding.title,
          clauseId: finding.clauseId,
          norm: wrongNorm.description,
          correctNorm: wrongNorm.correctNorm,
          inText: textToCheck.substring(0, 200),
        });
      }
    }
  }

  // 2. Check for Kernmechanismen flagged as risks
  // Only flags findings where the EXISTENCE of the mechanism is treated as a problem,
  // NOT where there's a legitimate issue with HOW it's implemented (e.g., "insufficient vacation" is valid)
  const LEGITIMATE_ISSUE_PATTERNS = [
    /unzureichend|ungenügend|zu\s*(niedrig|gering|kurz|wenig)/i,
    /fehlt|fehlend|nicht\s*geregelt|nicht\s*vorgesehen|lücke/i,
    /unwirksam|unzulässig|rechtswidrig|verstößt/i,
    /unklar|mehrdeutig|widersprüchlich|intransparent/i,
    /übermäßig|unverhältnismäßig|unangemessen/i,
    /haftung.*(mieter|arbeitnehmer|versicherungsnehmer)/i,
    /fristlos|außerordentlich.*kündigung/i,
    /§\s*\d+/i, // cites a specific norm = likely substantive
  ];
  const mechanismenPatterns = KERNMECHANISMEN[contractTypeLower] || [];
  if (mechanismenPatterns.length > 0) {
    for (const finding of findings) {
      if (finding.severity === "info" || finding.type === "information") continue;
      const textToCheck = [finding.title, finding.description, finding.affectedText]
        .filter(Boolean).join(" ");

      for (const pattern of mechanismenPatterns) {
        if (pattern.test(textToCheck)) {
          // Skip if the finding describes a LEGITIMATE issue with the mechanism
          const hasLegitimateIssue = LEGITIMATE_ISSUE_PATTERNS.some(p => p.test(finding.title + " " + (finding.description || "")));
          if (hasLegitimateIssue) continue;

          // Only flag if it's marked as a risk/compliance issue with medium+ severity
          if ((finding.type === "risk" || finding.type === "compliance") &&
              (finding.severity === "medium" || finding.severity === "high" || finding.severity === "critical")) {
            report.quality.kernmechanismusAsRisk.push({
              findingTitle: finding.title,
              clauseId: finding.clauseId,
              severity: finding.severity,
              type: finding.type,
              matchedPattern: pattern.toString(),
              description: finding.description?.substring(0, 150),
            });
          }
        }
      }
    }
  }

  // 3. Severity distribution
  for (const f of findings) {
    report.quality.severityDistribution[f.severity] =
      (report.quality.severityDistribution[f.severity] || 0) + 1;
  }

  // 4. Type distribution
  for (const f of findings) {
    report.quality.typeDistribution[f.type] =
      (report.quality.typeDistribution[f.type] || 0) + 1;
  }

  // 5. Confidence distribution
  for (const f of findings) {
    if (f.confidence < 70) report.quality.confidenceDistribution.borderline++;
    else if (f.confidence < 85) report.quality.confidenceDistribution.moderate++;
    else report.quality.confidenceDistribution.high++;
  }

  // 6. Enforceability distribution
  for (const f of findings) {
    const enf = f.enforceability || "unknown";
    report.quality.enforceabilityDistribution[enf] =
      (report.quality.enforceabilityDistribution[enf] || 0) + 1;
  }

  // 7. Average confidence
  const totalConfidence = findings.reduce((sum, f) => sum + (f.confidence || 0), 0);
  report.quality.avgConfidence = Math.round(totalConfidence / findings.length);

  // 8. Findings per clause
  report.quality.findingsPerClause = report.clauseCount > 0
    ? (findings.length / report.clauseCount).toFixed(2)
    : "N/A";

  // 9. Unverified affectedText
  report.quality.unverifiedAffectedText = findings.filter(
    f => f.affectedTextVerified === false
  ).length;

  // 10. Empty legalBasis
  report.quality.emptyLegalBasis = findings.filter(
    f => !f.legalBasis || f.legalBasis.trim().length < 3
  ).length;

  // 11. Generic findings (title too short or very generic)
  const GENERIC_TITLES = [
    /^risiko$/i, /^hinweis$/i, /^problem$/i, /^mangel$/i,
    /^fehlend/i, /^allgemein/i,
  ];
  report.quality.genericFindings = findings.filter(f => {
    if (!f.title || f.title.length < 10) return true;
    return GENERIC_TITLES.some(p => p.test(f.title));
  }).length;

  return report;
}

// ═══════════════════════════════════════════════════
// REPORT FORMATTER
// ═══════════════════════════════════════════════════

function printReport(reports) {
  console.log("\n" + "═".repeat(80));
  console.log("  LEGAL PULSE V2 — QUALITÄTSBERICHT");
  console.log("  " + new Date().toISOString().split("T")[0]);
  console.log("═".repeat(80));

  // Summary
  console.log(`\n  Verträge analysiert: ${reports.length}`);
  const totalFindings = reports.reduce((s, r) => s + r.findingsCount, 0);
  const totalClauses = reports.reduce((s, r) => s + r.clauseCount, 0);
  console.log(`  Gesamte Befunde: ${totalFindings}`);
  console.log(`  Gesamte Klauseln: ${totalClauses}`);

  // Per contract
  for (const r of reports) {
    console.log("\n" + "─".repeat(80));
    console.log(`  ${r.contractName}`);
    console.log(`  Typ: ${r.contractType} | Befunde: ${r.findingsCount} | Klauseln: ${r.clauseCount}`);
    if (r.scores?.overall != null) {
      console.log(`  Score: ${r.scores.overall}/100 (Risk: ${r.scores.risk}, Compliance: ${r.scores.compliance}, Terms: ${r.scores.terms}, Completeness: ${r.scores.completeness})`);
    }
    if (r.costs?.totalCostUSD) {
      console.log(`  Kosten: $${r.costs.totalCostUSD.toFixed(4)}`);
    }

    // Severity bar
    const sev = r.quality.severityDistribution;
    console.log(`\n  Severity:  critical=${sev.critical}  high=${sev.high}  medium=${sev.medium}  low=${sev.low}  info=${sev.info}`);

    // Type bar
    const typ = r.quality.typeDistribution;
    console.log(`  Types:     risk=${typ.risk}  compliance=${typ.compliance}  opportunity=${typ.opportunity}  information=${typ.information}`);

    // Confidence
    const conf = r.quality.confidenceDistribution;
    console.log(`  Confidence: borderline(60-69)=${conf.borderline}  moderate(70-84)=${conf.moderate}  high(85+)=${conf.high}  avg=${r.quality.avgConfidence}`);

    // Enforceability
    const enf = r.quality.enforceabilityDistribution;
    console.log(`  Enforceability: valid=${enf.valid}  questionable=${enf.questionable}  likely_invalid=${enf.likely_invalid}  unknown=${enf.unknown}`);

    // Quality issues
    console.log(`  Findings/Klausel: ${r.quality.findingsPerClause}`);
    console.log(`  Leere legalBasis: ${r.quality.emptyLegalBasis}`);
    console.log(`  Generische Titel: ${r.quality.genericFindings}`);
    console.log(`  Unverified Quotes: ${r.quality.unverifiedAffectedText}`);
  }

  // ═══════════════════════════════════════
  // CRITICAL QUALITY ISSUES
  // ═══════════════════════════════════════
  const allWrongNorms = reports.flatMap(r => r.quality.wrongNorms.map(n => ({ ...n, contract: r.contractName, contractType: r.contractType })));
  const allKernmechanismus = reports.flatMap(r => r.quality.kernmechanismusAsRisk.map(k => ({ ...k, contract: r.contractName, contractType: r.contractType })));

  console.log("\n" + "═".repeat(80));
  console.log("  KRITISCHE QUALITÄTSPROBLEME");
  console.log("═".repeat(80));

  // Wrong norms
  if (allWrongNorms.length > 0) {
    console.log(`\n  ❌ FALSCHE NORMEN (${allWrongNorms.length} Treffer):`);
    for (const n of allWrongNorms) {
      console.log(`\n    Vertrag: ${n.contract} (${n.contractType})`);
      console.log(`    Finding: ${n.findingTitle} [${n.clauseId}]`);
      console.log(`    Problem: ${n.norm}`);
      console.log(`    Korrekt: ${n.correctNorm}`);
      if (VERBOSE) console.log(`    Text: ${n.inText}`);
    }
  } else {
    console.log("\n  ✓ Keine falschen Normen erkannt");
  }

  // Kernmechanismen as risks
  if (allKernmechanismus.length > 0) {
    console.log(`\n  ❌ KERNMECHANISMEN ALS RISIKO GEMELDET (${allKernmechanismus.length} Treffer):`);
    for (const k of allKernmechanismus) {
      console.log(`\n    Vertrag: ${k.contract} (${k.contractType})`);
      console.log(`    Finding: ${k.findingTitle} [${k.clauseId}] — ${k.severity}/${k.type}`);
      console.log(`    Match: ${k.matchedPattern}`);
      if (VERBOSE && k.description) console.log(`    Desc: ${k.description}`);
    }
  } else {
    console.log("\n  ✓ Keine Kernmechanismen fälschlich als Risiko gemeldet");
  }

  // ═══════════════════════════════════════
  // AGGREGATED METRICS
  // ═══════════════════════════════════════
  console.log("\n" + "═".repeat(80));
  console.log("  AGGREGIERTE METRIKEN");
  console.log("═".repeat(80));

  const aggSev = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
  const aggType = { risk: 0, compliance: 0, opportunity: 0, information: 0 };
  const aggConf = { borderline: 0, moderate: 0, high: 0 };
  let totalAvgConf = 0;
  let totalEmptyBasis = 0;
  let totalGeneric = 0;

  for (const r of reports) {
    for (const [k, v] of Object.entries(r.quality.severityDistribution)) aggSev[k] = (aggSev[k] || 0) + v;
    for (const [k, v] of Object.entries(r.quality.typeDistribution)) aggType[k] = (aggType[k] || 0) + v;
    for (const [k, v] of Object.entries(r.quality.confidenceDistribution)) aggConf[k] = (aggConf[k] || 0) + v;
    totalAvgConf += r.quality.avgConfidence;
    totalEmptyBasis += r.quality.emptyLegalBasis;
    totalGeneric += r.quality.genericFindings;
  }

  console.log(`\n  Severity (gesamt):`);
  console.log(`    critical: ${aggSev.critical}  (${pct(aggSev.critical, totalFindings)})`);
  console.log(`    high:     ${aggSev.high}  (${pct(aggSev.high, totalFindings)})`);
  console.log(`    medium:   ${aggSev.medium}  (${pct(aggSev.medium, totalFindings)})`);
  console.log(`    low:      ${aggSev.low}  (${pct(aggSev.low, totalFindings)})`);
  console.log(`    info:     ${aggSev.info}  (${pct(aggSev.info, totalFindings)})`);

  console.log(`\n  Type (gesamt):`);
  console.log(`    risk:        ${aggType.risk}  (${pct(aggType.risk, totalFindings)})`);
  console.log(`    compliance:  ${aggType.compliance}  (${pct(aggType.compliance, totalFindings)})`);
  console.log(`    opportunity: ${aggType.opportunity}  (${pct(aggType.opportunity, totalFindings)})`);
  console.log(`    information: ${aggType.information}  (${pct(aggType.information, totalFindings)})`);

  console.log(`\n  Confidence (gesamt):`);
  console.log(`    borderline (60-69): ${aggConf.borderline}  (${pct(aggConf.borderline, totalFindings)})`);
  console.log(`    moderate (70-84):   ${aggConf.moderate}  (${pct(aggConf.moderate, totalFindings)})`);
  console.log(`    high (85+):         ${aggConf.high}  (${pct(aggConf.high, totalFindings)})`);
  console.log(`    avg:                ${reports.length > 0 ? Math.round(totalAvgConf / reports.length) : "N/A"}`);

  // Quality score
  const wrongNormRate = totalFindings > 0 ? allWrongNorms.length / totalFindings : 0;
  const kernmechanismusRate = totalFindings > 0 ? allKernmechanismus.length / totalFindings : 0;
  const emptyBasisRate = totalFindings > 0 ? totalEmptyBasis / totalFindings : 0;
  const genericRate = totalFindings > 0 ? totalGeneric / totalFindings : 0;

  console.log("\n" + "═".repeat(80));
  console.log("  QUALITY SCORE");
  console.log("═".repeat(80));

  const qualityScore = Math.max(0, Math.round(
    100
    - (wrongNormRate * 200)        // Heavy penalty for wrong norms
    - (kernmechanismusRate * 150)  // Heavy penalty for false Kernmechanismus risks
    - (emptyBasisRate * 50)        // Medium penalty for missing legal basis
    - (genericRate * 30)           // Light penalty for generic titles
  ));

  console.log(`\n  Quality Score: ${qualityScore}/100`);
  console.log(`    Falsche Normen:      ${allWrongNorms.length}/${totalFindings} (${pct(allWrongNorms.length, totalFindings)})`);
  console.log(`    Kern-als-Risiko:     ${allKernmechanismus.length}/${totalFindings} (${pct(allKernmechanismus.length, totalFindings)})`);
  console.log(`    Fehlende legalBasis: ${totalEmptyBasis}/${totalFindings} (${pct(totalEmptyBasis, totalFindings)})`);
  console.log(`    Generische Titel:    ${totalGeneric}/${totalFindings} (${pct(totalGeneric, totalFindings)})`);

  if (qualityScore >= 85) {
    console.log("\n  -> SEHR GUT — Analyse-Qualität ist marktreif");
  } else if (qualityScore >= 70) {
    console.log("\n  -> GUT — Leichte Verbesserungen möglich");
  } else if (qualityScore >= 50) {
    console.log("\n  -> MITTEL — Signifikante Qualitätsprobleme");
  } else {
    console.log("\n  -> KRITISCH — Grundlegende Qualitätsprobleme");
  }

  console.log("\n" + "═".repeat(80));
}

function pct(n, total) {
  if (total === 0) return "0%";
  return Math.round((n / total) * 100) + "%";
}

// ═══════════════════════════════════════════════════
// VERBOSE: Print all findings for a result
// ═══════════════════════════════════════════════════

function printFindings(result) {
  if (!VERBOSE) return;
  const findings = result.clauseFindings || [];
  if (findings.length === 0) return;

  console.log(`\n  Befunde für: ${result.context?.contractName || result.contractId}`);
  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    console.log(`\n    [${i + 1}] ${f.title}`);
    console.log(`        ${f.severity}/${f.type} | confidence=${f.confidence} | enforceability=${f.enforceability}`);
    console.log(`        clauseId=${f.clauseId} | category=${f.category}`);
    if (f.legalBasis) console.log(`        legalBasis: ${f.legalBasis}`);
    if (f.description) console.log(`        ${f.description.substring(0, 200)}`);
    if (f.affectedText) {
      const verified = f.affectedTextVerified === false ? " [UNVERIFIED]" : "";
      console.log(`        affectedText${verified}: "${f.affectedText.substring(0, 120)}..."`);
    }
    if (f.reasoning) console.log(`        reasoning: ${f.reasoning.substring(0, 150)}`);
  }
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

(async () => {
  try {
    // Connect
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI not set");
    await mongoose.connect(mongoUri);
    const db = await database.connect();
    console.log("Connected to database");

    if (LIVE_MODE) {
      // ─── LIVE MODE: Run fresh analysis ───
      console.log("\n=== LIVE MODE: Frische Analyse wird durchgeführt ===");
      console.log("ACHTUNG: Jeder Vertrag kostet ~$0.05-0.20 (GPT-4o)\n");

      const { runPipeline } = require("../services/legalPulseV2/index");

      // Find contracts with text
      const query = SPECIFIC_CONTRACT
        ? { _id: new (require("mongodb").ObjectId)(SPECIFIC_CONTRACT) }
        : {};

      const contracts = await db.collection("contracts").find(query, {
        projection: { _id: 1, userId: 1, name: 1, contractType: 1, extractedText: 1, text: 1, contractText: 1, s3Key: 1 },
      }).limit(LIMIT).toArray();

      // Filter to contracts that have text
      const validContracts = contracts.filter(c =>
        (c.extractedText && c.extractedText.length > 100) ||
        (c.text && c.text.length > 100) ||
        (c.contractText && c.contractText.length > 100) ||
        c.s3Key
      );

      console.log(`Gefunden: ${contracts.length} Verträge, ${validContracts.length} mit Text`);

      if (validContracts.length === 0) {
        console.log("Keine Verträge mit Text gefunden. Abbruch.");
        process.exit(0);
      }

      const results = [];
      for (const contract of validContracts) {
        const contractId = contract._id.toString();
        const userId = contract.userId?.toString() || contract.userId;
        console.log(`\n>> Analysiere: ${contract.name || contractId} (${contract.contractType || "unknown"})...`);

        try {
          const requestId = `quality-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await runPipeline(
            { userId, contractId, requestId, triggeredBy: "manual" },
            (progress, message, data) => {
              if (data?.stage != null) {
                process.stdout.write(`\r   [${progress}%] ${message}                    `);
              }
            }
          );
          console.log(""); // newline after progress

          // Load the result
          const result = await LegalPulseV2Result.findOne({ requestId }).lean();
          if (result) {
            results.push(result);
            printFindings(result);
          }
        } catch (err) {
          console.error(`\n   FEHLER: ${err.message}`);
        }
      }

      // Evaluate
      const reports = results.map(evaluateResult);
      printReport(reports);

    } else {
      // ─── EXISTING MODE: Analyze existing results (FREE) ───
      console.log("\n=== EXISTING MODE: Bestehende Ergebnisse auswerten (kostenlos) ===");
      console.log("(Für frische Analyse: --live Flag verwenden)\n");

      const query = SPECIFIC_CONTRACT
        ? { contractId: SPECIFIC_CONTRACT, status: "completed" }
        : { status: "completed" };

      const results = await LegalPulseV2Result.find(query)
        .sort({ createdAt: -1 })
        .limit(LIMIT)
        .lean();

      // Deduplicate: only latest result per contract
      const seen = new Set();
      const uniqueResults = [];
      for (const r of results) {
        if (!seen.has(r.contractId)) {
          seen.add(r.contractId);
          uniqueResults.push(r);
        }
      }

      console.log(`Gefunden: ${results.length} Ergebnisse, ${uniqueResults.length} unique Verträge`);

      if (uniqueResults.length === 0) {
        console.log("Keine bestehenden Ergebnisse gefunden.");
        console.log("Nutze --live um frische Analysen durchzuführen.");
        process.exit(0);
      }

      for (const r of uniqueResults) {
        printFindings(r);
      }

      const reports = uniqueResults.map(evaluateResult);
      printReport(reports);
    }

    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();

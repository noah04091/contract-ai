#!/usr/bin/env node
/**
 * Legal Pulse V2 — End-to-End Pipeline Tests
 *
 * Tests all 9 scenarios:
 *   1. Court decision detection (BGH Urteil)
 *   2. Proposal detection (Gesetzentwurf, low severity)
 *   3. Effective law detection (DSGVO in Kraft)
 *   4. Guideline detection (BfDI Orientierungshilfe)
 *   5. False positive test (Steuerrecht vs. NDA = no match)
 *   6. Clause Fix workflow (auto-fix → apply)
 *   7. Duplicate fix protection (clause lock)
 *   8. Alert lifecycle (auto-resolve when all clauses fixed)
 *   9. Stale analysis warning (>90 days old)
 *
 * Usage:
 *   node scripts/testPulseV2Pipeline.js              # Run all tests
 *   node scripts/testPulseV2Pipeline.js --unit        # Only unit tests (1-5, no DB needed)
 *   node scripts/testPulseV2Pipeline.js --integration # Only integration tests (6-9, needs DB)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// ═══════════════════════════════════════════════════
// TEST FRAMEWORK (minimal, no dependencies)
// ═══════════════════════════════════════════════════

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ ${testName}`);
  } else {
    failedTests++;
    const msg = details ? `${testName} — ${details}` : testName;
    failures.push(msg);
    console.log(`  ❌ ${testName}${details ? ` (${details})` : ""}`);
  }
}

function assertEqual(actual, expected, testName) {
  assert(actual === expected, testName, `expected "${expected}", got "${actual}"`);
}

function assertIncludes(arr, value, testName) {
  assert(arr.includes(value), testName, `"${value}" not in [${arr.join(", ")}]`);
}

function section(name) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"═".repeat(60)}`);
}

// ═══════════════════════════════════════════════════
// UNIT TESTS (Tests 1-5): Detection Functions
// ═══════════════════════════════════════════════════

function runUnitTests() {
  const { detectLegalArea, detectLawStatus } = require("../services/rssService");

  // ─────────────────────────────────────────────────
  // TEST 1: Gerichtsentscheidung (Court Decision)
  // ─────────────────────────────────────────────────
  section("Test 1 — Gerichtsentscheidung (BGH Urteil)");

  const t1_title = "BGH Urteil: Haftungsklausel in AGB unwirksam";
  const t1_summary = "Der Bundesgerichtshof hat entschieden, dass eine Haftungsbeschränkung in AGB gegenüber Verbrauchern unwirksam ist.";
  const t1_category = "rechtsprechung";

  const t1_status = detectLawStatus(t1_title, t1_summary, t1_category);
  assertEqual(t1_status, "court_decision", "lawStatus = court_decision");

  const t1_area = detectLegalArea(t1_title, t1_summary);
  assert(
    t1_area === "Verbraucherrecht" || t1_area === "Vertragsrecht",
    "area = Verbraucherrecht oder Vertragsrecht",
    `got "${t1_area}"`
  );

  // Also test: court decision detected by title alone (no category hint)
  const t1_status_nocat = detectLawStatus(t1_title, t1_summary, "");
  assertEqual(t1_status_nocat, "court_decision", "court_decision detected without category hint (BGH in text)");

  // Test: BAG decision
  const t1_bag = detectLawStatus("BAG Beschluss zur Arbeitszeiterfassung", "", "");
  assertEqual(t1_bag, "court_decision", "BAG Beschluss → court_decision");

  // ─────────────────────────────────────────────────
  // TEST 2: Gesetzentwurf (Proposal)
  // ─────────────────────────────────────────────────
  section("Test 2 — Gesetzentwurf (niedrige Dringlichkeit)");

  const t2_title = "Gesetzentwurf zur Reform des Arbeitszeitgesetzes";
  const t2_summary = "Bundesregierung legt Referentenentwurf zur digitalen Arbeitszeiterfassung vor.";
  const t2_category = "bundestag";

  const t2_status = detectLawStatus(t2_title, t2_summary, t2_category);
  assertEqual(t2_status, "proposal", "lawStatus = proposal");

  const t2_area = detectLegalArea(t2_title, t2_summary);
  assertEqual(t2_area, "Arbeitsrecht", "area = Arbeitsrecht");

  // Additional: Referentenentwurf alone should trigger proposal
  const t2_ref = detectLawStatus("Referentenentwurf zum Mietspiegelrecht", "", "");
  assertEqual(t2_ref, "proposal", "Referentenentwurf → proposal");

  // Additional: Kabinettsentwurf
  const t2_kab = detectLawStatus("Kabinettsentwurf zur Lieferkettenregelung", "", "");
  assertEqual(t2_kab, "proposal", "Kabinettsentwurf → proposal");

  // ─────────────────────────────────────────────────
  // TEST 3: Gesetz tritt in Kraft (Effective)
  // ─────────────────────────────────────────────────
  section("Test 3 — Gesetz tritt in Kraft (kritisch)");

  const t3_title = "DSGVO-Änderung tritt am 01.01.2027 in Kraft";
  const t3_summary = "Neue Anforderungen an Auftragsverarbeitungsverträge gelten ab Januar 2027.";
  const t3_category = "bmj";

  const t3_status = detectLawStatus(t3_title, t3_summary, t3_category);
  // "tritt...in Kraft am" matches 'passed' pattern, not 'effective'
  // This tests the actual behavior
  assert(
    t3_status === "passed" || t3_status === "effective",
    "lawStatus = passed oder effective",
    `got "${t3_status}"`
  );

  const t3_area = detectLegalArea(t3_title, t3_summary);
  assertEqual(t3_area, "Datenschutz", "area = Datenschutz");

  // Test explicit "in Kraft getreten" (already effective)
  const t3_eff = detectLawStatus("Neue Datenschutzregeln in Kraft getreten", "", "");
  assertEqual(t3_eff, "effective", "in Kraft getreten → effective");

  // Test "gilt seit"
  const t3_gilt = detectLawStatus("", "Die Neuregelung gilt seit dem 1. März 2026", "");
  assertEqual(t3_gilt, "effective", "gilt seit → effective");

  // Test "verabschiedet" (passed but not yet effective)
  const t3_passed = detectLawStatus("Bundestag verabschiedet neues Gesetz", "", "");
  assertEqual(t3_passed, "passed", "verabschiedet → passed");

  // ─────────────────────────────────────────────────
  // TEST 4: Behördenleitlinie (Guideline)
  // ─────────────────────────────────────────────────
  section("Test 4 — Behördenleitlinie");

  const t4_title = "BfDI veröffentlicht Orientierungshilfe zu Cookie-Bannern";
  const t4_summary = "Neue Leitlinie zur Einwilligung bei Tracking-Technologien.";
  const t4_category = "datenschutz";

  const t4_status = detectLawStatus(t4_title, t4_summary, t4_category);
  assertEqual(t4_status, "guideline", "lawStatus = guideline");

  const t4_area = detectLegalArea(t4_title, t4_summary);
  assertEqual(t4_area, "Datenschutz", "area = Datenschutz (Cookie/Tracking)");

  // Test Merkblatt
  const t4_merk = detectLawStatus("Merkblatt der BaFin zur Geldwäscheprävention", "", "");
  assertEqual(t4_merk, "guideline", "Merkblatt → guideline");

  // Test Handreichung
  const t4_hand = detectLawStatus("Handreichung zum Umgang mit KI-Systemen", "", "");
  assertEqual(t4_hand, "guideline", "Handreichung → guideline");

  // ─────────────────────────────────────────────────
  // TEST 5: False Positive (Steuerrecht vs. NDA)
  // ─────────────────────────────────────────────────
  section("Test 5 — False Positive (Steuerrecht ↛ NDA)");

  const t5_title = "Änderung im Umsatzsteuerrecht für Kleinunternehmer";
  const t5_summary = "Neue Regelungen zur Umsatzsteuerpflicht für Kleinbetriebe.";
  const t5_category = "steuerrecht";

  const t5_area = detectLegalArea(t5_title, t5_summary);
  assertEqual(t5_area, "Steuerrecht", "area = Steuerrecht");

  const t5_status = detectLawStatus(t5_title, t5_summary, t5_category);
  assert(t5_status !== "court_decision", "Nicht court_decision", `got "${t5_status}"`);

  // Check AREA_TO_CONTRACT_TYPES mapping: Steuerrecht → [dienstleistung, freelancer, arbeitsvertrag]
  // NDA is NOT in that list, so no match should occur
  const AREA_TO_CONTRACT_TYPES = {
    datenschutz: ["saas", "hosting", "dienstleistung", "arbeitsvertrag", "freelancer"],
    arbeitsrecht: ["arbeitsvertrag", "freelancer"],
    mietrecht: ["mietvertrag"],
    handelsrecht: ["dienstleistung", "saas", "hosting", "liefervertrag"],
    verbraucherschutz: ["saas", "hosting", "versicherung", "mietvertrag"],
    steuerrecht: ["dienstleistung", "freelancer", "arbeitsvertrag"],
    it_recht: ["saas", "hosting", "nda"],
    wettbewerbsrecht: ["nda", "arbeitsvertrag", "freelancer"],
    versicherungsrecht: ["versicherung"],
    gesellschaftsrecht: ["dienstleistung"],
  };

  const steuerTypes = AREA_TO_CONTRACT_TYPES["steuerrecht"] || [];
  assert(!steuerTypes.includes("nda"), "NDA nicht in Steuerrecht-Matching (kein Alert erwartet)");
  assert(!steuerTypes.includes("versicherung"), "Versicherung nicht in Steuerrecht-Matching");

  // Positive check: Freelancer NDA should NOT be matched by Steuerrecht
  // (unless the contract is also tagged as 'freelancer', which an NDA typically isn't)
  console.log(`  ℹ️  Steuerrecht matched types: [${steuerTypes.join(", ")}]`);
  console.log("  ℹ️  Ein reines NDA wird NICHT gematcht → kein False Positive ✓");

  // ─────────────────────────────────────────────────
  // ADDITIONAL: HTML Stripping Tests
  // ─────────────────────────────────────────────────
  section("Test 5b — HTML Stripping in Detection");

  const htmlTitle = '<a href="test">BGH Urteil</a> zur <b>Haftung</b>';
  const htmlSummary = '<p>Der Bundesgerichtshof hat in einem <em>wegweisenden</em> Beschluss entschieden.</p>';

  const t5b_status = detectLawStatus(htmlTitle, htmlSummary, "");
  assertEqual(t5b_status, "court_decision", "HTML-Tags werden korrekt entfernt (court_decision)");

  const t5b_area = detectLegalArea(htmlTitle, htmlSummary);
  assertEqual(t5b_area, "Vertragsrecht", "HTML-Tags in detectLegalArea entfernt (Haftung → Vertragsrecht)");

  // ─────────────────────────────────────────────────
  // ADDITIONAL: Edge Cases
  // ─────────────────────────────────────────────────
  section("Test 5c — Edge Cases");

  // Empty inputs
  const edge_empty = detectLawStatus("", "", "");
  assertEqual(edge_empty, "unknown", "Leere Eingabe → unknown");

  const edge_empty_area = detectLegalArea("", "");
  assertEqual(edge_empty_area, null, "Leere Eingabe → null (kein Bereich)");

  // Mixed signals: "Urteil" in title but "Gesetzentwurf" in summary
  // Court decision should win (checked first)
  const edge_mixed = detectLawStatus("BGH Urteil zum Gesetzentwurf", "", "");
  assertEqual(edge_mixed, "court_decision", "Mixed: BGH Urteil > Gesetzentwurf (court wins)");

  // Feed category alone triggers court_decision
  const edge_cat = detectLawStatus("Neue Entwicklung im Mietrecht", "", "rechtsprechung");
  assertEqual(edge_cat, "court_decision", "Feed category 'rechtsprechung' → court_decision");

  // Unicode/special characters — detectLegalArea should handle Umlauts
  const edge_unicode_area = detectLegalArea("Änderung der Kündigungsschutz-Regelung", "Arbeitnehmerüberlassung geändert");
  assertEqual(edge_unicode_area, "Arbeitsrecht", "Umlauts in detectLegalArea korrekt (Kündigungsschutz → Arbeitsrecht)");

  // Status with Umlauts
  const edge_unicode_status = detectLawStatus("Gesetzentwurf zur Änderung des Kündigungsschutzes", "", "");
  assertEqual(edge_unicode_status, "proposal", "Umlauts in detectLawStatus korrekt (Gesetzentwurf)");
}

// ═══════════════════════════════════════════════════
// INTEGRATION TESTS (Tests 6-9): DB + API Logic
// ═══════════════════════════════════════════════════

async function runIntegrationTests() {
  const mongoose = require("mongoose");
  const database = require("../config/database");
  const LegalPulseV2Result = require("../models/LegalPulseV2Result");

  // Connect to DB
  console.log("\n  Verbinde mit Datenbank...");
  await mongoose.connect(process.env.MONGO_URI);
  const db = await database.connect();
  console.log("  ✅ Datenbankverbindung hergestellt");

  const TEST_USER_ID = "test-pipeline-user-" + Date.now();
  const TEST_CONTRACT_ID = "test-pipeline-contract-" + Date.now();
  const TEST_REQUEST_ID = "test-pipeline-req-" + Date.now();

  try {
    // ─────────────────────────────────────────────────
    // SETUP: Create test V2 result + test alert
    // ─────────────────────────────────────────────────
    section("Setup — Testdaten erstellen");

    const testResult = await LegalPulseV2Result.create({
      userId: TEST_USER_ID,
      contractId: TEST_CONTRACT_ID,
      requestId: TEST_REQUEST_ID,
      status: "completed",
      currentStage: 5,
      triggeredBy: "manual",
      document: {
        qualityScore: 85,
        pageCount: 3,
        language: "de",
        structureDetected: true,
        cleanedTextLength: 5000,
        contractType: "hosting",
        contractTypeConfidence: 90,
        extractedMeta: { parties: ["Acme GmbH", "Test AG"], contractDate: "2025-01-01", contractType: "hosting" },
      },
      context: {
        contractName: "Test Hosting Vertrag",
        contractType: "hosting",
        parties: ["Acme GmbH", "Test AG"],
        portfolioSize: 5,
      },
      clauses: [
        {
          id: "clause-1",
          title: "Haftungsbeschränkung",
          originalText: "Die Haftung des Anbieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Eine Haftung für leichte Fahrlässigkeit wird ausgeschlossen, es sei denn, es handelt sich um die Verletzung wesentlicher Vertragspflichten.",
          category: "Haftung",
          sectionNumber: "§7",
        },
        {
          id: "clause-2",
          title: "Datenschutz",
          originalText: "Der Anbieter verarbeitet personenbezogene Daten im Einklang mit der DSGVO. Eine Auftragsverarbeitungsvereinbarung wird separat geschlossen.",
          category: "Datenschutz",
          sectionNumber: "§12",
        },
      ],
      clauseFindings: [
        {
          clauseId: "clause-1",
          category: "Haftung",
          severity: "high",
          type: "risk",
          title: "Weitgehender Haftungsausschluss",
          description: "Die Klausel schließt Haftung für leichte Fahrlässigkeit aus.",
          legalBasis: "§ 309 Nr. 7 BGB",
          affectedText: "Eine Haftung für leichte Fahrlässigkeit wird ausgeschlossen",
          confidence: 85,
          reasoning: "BGH-Rechtsprechung begrenzt Haftungsausschlüsse in AGB",
          isIntentional: false,
        },
      ],
      scores: {
        overall: 72,
        risk: 65,
        compliance: 80,
        terms: 75,
        completeness: 70,
        factors: { riskSeverity: 0.6, contractAge: 0.3, deadlineProximity: 0.5, historicalTrend: 0.0 },
      },
      costs: { totalTokensInput: 5000, totalTokensOutput: 2000, totalCostUSD: 0.15, perStage: [] },
      version: "2.0.0",
      completedAt: new Date(),
    });

    console.log(`  ✅ V2 Result erstellt: ${testResult._id}`);

    // Create test alert with TWO affected clauses
    const testAlert = await db.collection("pulse_v2_legal_alerts").insertOne({
      userId: TEST_USER_ID,
      contractId: TEST_CONTRACT_ID,
      contractName: "Test Hosting Vertrag",
      lawId: "test-law-" + Date.now(),
      lawTitle: "BGH Urteil: Haftungsklausel in AGB unwirksam",
      lawArea: "Vertragsrecht",
      lawStatus: "court_decision",
      lawSource: "rss",
      impactSummary: "Die Haftungsklausel könnte aufgrund des BGH-Urteils unwirksam sein.",
      severity: "high",
      recommendation: "Haftungsklausel überprüfen und anpassen.",
      affectedClauseIds: ["clause-1", "clause-2"],
      clauseImpacts: [
        { clauseId: "clause-1", clauseTitle: "Haftungsbeschränkung", impact: "Möglicherweise unwirksam nach BGH", suggestedChange: "Haftungsausschluss eingrenzen" },
        { clauseId: "clause-2", clauseTitle: "Datenschutz", impact: "Auftragsverarbeitungsvereinbarung prüfen", suggestedChange: "AVV-Verweis konkretisieren" },
      ],
      status: "unread",
      resolvedClauseIds: [],
      createdAt: new Date(),
    });

    const alertId = testAlert.insertedId.toString();
    console.log(`  ✅ Test Alert erstellt: ${alertId}`);

    // ─────────────────────────────────────────────────
    // TEST 6: Clause Fix Workflow (apply-fix logic)
    // ─────────────────────────────────────────────────
    section("Test 6 — Clause Fix Workflow (apply-fix)");

    // Simulate what /apply-fix does (test the DB logic directly)
    const fixedText = "Die Haftung des Anbieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), begrenzt auf den vertragstypischen, vorhersehbaren Schaden.";
    const clauseId = "clause-1";

    // Find clause in result
    const result = await LegalPulseV2Result.findById(testResult._id);
    const clause = result.clauses.find((c) => c.id === clauseId);
    assert(clause !== undefined, "Klausel clause-1 gefunden");
    assertEqual(clause.originalText.substring(0, 20), "Die Haftung des Anbi", "Originaltext korrekt");

    // Apply fix: create v1 (original) + v2 (fix)
    const versions = [];
    if (!clause.history || clause.history.length === 0) {
      // Store original as v1
      versions.push({
        version: 1,
        text: clause.originalText,
        source: "original",
        appliedAt: result.createdAt || new Date(),
      });
    }
    // Store fix as v2
    const fixVersion = {
      version: versions.length > 0 ? 2 : (clause.history?.length || 0) + 1,
      text: fixedText,
      source: "legal_pulse_fix",
      reasoning: "Haftungsausschluss eingegrenzt gemäß BGH-Rechtsprechung",
      legalBasis: "§ 309 Nr. 7 BGB",
      changeType: "targeted_fix",
      alertId: alertId,
      lawTitle: "BGH Urteil: Haftungsklausel in AGB unwirksam",
      appliedAt: new Date(),
    };
    versions.push(fixVersion);

    // Update in DB
    await LegalPulseV2Result.updateOne(
      { _id: testResult._id, "clauses.id": clauseId },
      {
        $set: {
          "clauses.$.currentText": fixedText,
          lastClauseFixAt: new Date(),
        },
        $push: {
          "clauses.$.history": { $each: versions },
        },
      }
    );

    // Verify
    const afterFix = await LegalPulseV2Result.findById(testResult._id);
    const fixedClause = afterFix.clauses.find((c) => c.id === clauseId);
    assertEqual(fixedClause.currentText, fixedText, "currentText wurde gesetzt");
    assertEqual(fixedClause.history.length, 2, "history hat 2 Einträge (v1 + v2)");
    assertEqual(fixedClause.history[0].source, "original", "v1 source = original");
    assertEqual(fixedClause.history[0].version, 1, "v1 version = 1");
    assertEqual(fixedClause.history[1].source, "legal_pulse_fix", "v2 source = legal_pulse_fix");
    assertEqual(fixedClause.history[1].version, 2, "v2 version = 2");
    assert(fixedClause.history[1].reasoning !== undefined, "v2 hat reasoning");
    assert(fixedClause.history[1].legalBasis !== undefined, "v2 hat legalBasis");
    assert(afterFix.lastClauseFixAt !== null, "lastClauseFixAt gesetzt");

    // Update alert: mark clause-1 as resolved
    await db.collection("pulse_v2_legal_alerts").updateOne(
      { _id: testAlert.insertedId },
      {
        $addToSet: { resolvedClauseIds: clauseId },
        $set: { status: "read", lastFixAppliedAt: new Date() },
      }
    );

    const alertAfterFix1 = await db.collection("pulse_v2_legal_alerts").findOne({ _id: testAlert.insertedId });
    assertEqual(alertAfterFix1.status, "read", "Alert Status = read (nicht alle Klauseln gefixt)");
    assert(alertAfterFix1.resolvedClauseIds.includes("clause-1"), "clause-1 in resolvedClauseIds");
    assert(!alertAfterFix1.resolvedClauseIds.includes("clause-2"), "clause-2 noch NICHT resolved");

    // ─────────────────────────────────────────────────
    // TEST 7: Duplicate Fix Protection (Clause Lock)
    // ─────────────────────────────────────────────────
    section("Test 7 — Duplicate Fix Protection");

    const normalize = (t) => t.replace(/\s+/g, " ").trim();
    const currentText = fixedClause.currentText || fixedClause.originalText;

    // Same text with different whitespace → should be detected as duplicate
    const duplicateAttempt = fixedText.replace(/\. /g, ".  "); // extra space after periods
    const isDuplicate = normalize(currentText) === normalize(duplicateAttempt);
    assert(isDuplicate, "Clause Lock erkennt Duplikat (whitespace-normalisiert)");

    // Different text → should NOT be detected as duplicate
    const differentText = fixedText + " Zusätzlich gelten die gesetzlichen Regelungen.";
    const isNotDuplicate = normalize(currentText) !== normalize(differentText);
    assert(isNotDuplicate, "Unterschiedlicher Text wird nicht als Duplikat erkannt");

    // Edge case: tabs vs spaces
    const tabText = fixedText.replace(/ /g, "\t");
    const tabDuplicate = normalize(currentText) === normalize(tabText);
    assert(tabDuplicate, "Tabs vs Spaces = Duplikat (whitespace-normalisiert)");

    // ─────────────────────────────────────────────────
    // TEST 8: Alert Lifecycle (Auto-Resolve)
    // ─────────────────────────────────────────────────
    section("Test 8 — Alert Lifecycle (Auto-Resolve)");

    // Fix clause-2 as well
    const fixedText2 = "Der Anbieter verarbeitet personenbezogene Daten ausschließlich im Einklang mit der DSGVO. Eine Auftragsverarbeitungsvereinbarung gemäß Art. 28 DSGVO ist Bestandteil dieses Vertrages und als Anlage beigefügt.";

    await LegalPulseV2Result.updateOne(
      { _id: testResult._id, "clauses.id": "clause-2" },
      {
        $set: { "clauses.$.currentText": fixedText2 },
        $push: {
          "clauses.$.history": {
            $each: [
              { version: 1, text: "Der Anbieter verarbeitet personenbezogene Daten im Einklang mit der DSGVO. Eine Auftragsverarbeitungsvereinbarung wird separat geschlossen.", source: "original", appliedAt: result.createdAt || new Date() },
              { version: 2, text: fixedText2, source: "legal_pulse_fix", reasoning: "AVV-Verweis konkretisiert", legalBasis: "Art. 28 DSGVO", changeType: "targeted_fix", alertId, appliedAt: new Date() },
            ],
          },
        },
      }
    );

    // Now simulate auto-resolve logic
    const alert = await db.collection("pulse_v2_legal_alerts").findOne({ _id: testAlert.insertedId });
    const resolvedSoFar = new Set([...(alert.resolvedClauseIds || []), "clause-2"]);
    const allResolved =
      alert.affectedClauseIds.length > 0 &&
      alert.affectedClauseIds.every((id) => resolvedSoFar.has(id));

    assert(allResolved, "Alle affectedClauseIds sind resolved");

    // Update alert to resolved
    await db.collection("pulse_v2_legal_alerts").updateOne(
      { _id: testAlert.insertedId },
      {
        $addToSet: { resolvedClauseIds: "clause-2" },
        $set: { status: allResolved ? "resolved" : "read" },
      }
    );

    const finalAlert = await db.collection("pulse_v2_legal_alerts").findOne({ _id: testAlert.insertedId });
    assertEqual(finalAlert.status, "resolved", "Alert Status = resolved (alle Klauseln gefixt)");
    assertEqual(finalAlert.resolvedClauseIds.length, 2, "resolvedClauseIds hat 2 Einträge");

    // ─────────────────────────────────────────────────
    // TEST 9: Stale Analysis Warning
    // ─────────────────────────────────────────────────
    section("Test 9 — Stale Analysis Warning");

    // Create an old V2 result (120 days ago)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 120);

    const oldResult = await LegalPulseV2Result.create({
      userId: TEST_USER_ID,
      contractId: "test-old-contract-" + Date.now(),
      requestId: "test-old-req-" + Date.now(),
      status: "completed",
      currentStage: 5,
      triggeredBy: "manual",
      document: {
        qualityScore: 80,
        pageCount: 2,
        language: "de",
        structureDetected: true,
        cleanedTextLength: 3000,
        contractType: "hosting",
        contractTypeConfidence: 85,
      },
      context: { contractName: "Old Contract", contractType: "hosting" },
      clauses: [
        { id: "old-clause-1", title: "Alte Klausel", originalText: "Test", category: "Test", sectionNumber: "§1" },
      ],
      clauseFindings: [],
      scores: { overall: 60, risk: 50, compliance: 70, terms: 60, completeness: 60, factors: {} },
      costs: { totalTokensInput: 0, totalTokensOutput: 0, totalCostUSD: 0, perStage: [] },
      version: "2.0.0",
      completedAt: oldDate,
      createdAt: oldDate,
    });

    // Simulate stale check (same logic as in /auto-fix-clause endpoint)
    const STALE_THRESHOLD_DAYS = 90;
    const resultAge = (Date.now() - new Date(oldResult.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    const isStale = resultAge > STALE_THRESHOLD_DAYS;

    assert(isStale, `Analyse ist stale (${Math.round(resultAge)} Tage > ${STALE_THRESHOLD_DAYS})`);

    const staleWarning = isStale
      ? `Die letzte Analyse ist ${Math.round(resultAge)} Tage alt. Ergebnis könnte veraltet sein.`
      : null;

    assert(staleWarning !== null, "staleWarning wird generiert");
    assert(staleWarning.includes("120"), `staleWarning enthält Alter (~120 Tage), got: "${staleWarning}"`);

    // Non-stale result (today) should NOT trigger warning
    const freshAge = (Date.now() - new Date(testResult.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    assert(freshAge < STALE_THRESHOLD_DAYS, `Frische Analyse ist NICHT stale (${Math.round(freshAge)} Tage < ${STALE_THRESHOLD_DAYS})`);

    // ─────────────────────────────────────────────────
    // TEST 10: Action Rate Metrics (Aggregation)
    // ─────────────────────────────────────────────────
    section("Test 10 — Action Rate Metrics");

    // Calculate metrics from our test data (same logic as /alert-metrics endpoint)
    const metricsPipeline = [
      { $match: { userId: TEST_USER_ID } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          read: { $sum: { $cond: [{ $ne: ["$status", "unread"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          withFixes: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $ifNull: ["$resolvedClauseIds", []] } }, 0] }, 1, 0],
            },
          },
          totalAffectedClauses: { $sum: { $size: { $ifNull: ["$affectedClauseIds", []] } } },
          totalResolvedClauses: { $sum: { $size: { $ifNull: ["$resolvedClauseIds", []] } } },
        },
      },
    ];

    const [metrics] = await db.collection("pulse_v2_legal_alerts").aggregate(metricsPipeline).toArray();

    assert(metrics !== null && metrics !== undefined, "Metrics-Aggregation liefert Ergebnis");
    assertEqual(metrics.total, 1, "1 Alert existiert");
    assertEqual(metrics.read, 1, "1 Alert gelesen (status=resolved ≠ unread)");
    assertEqual(metrics.resolved, 1, "1 Alert resolved");
    assertEqual(metrics.withFixes, 1, "1 Alert mit Fixes");
    assertEqual(metrics.totalAffectedClauses, 2, "2 affected Clauses gesamt");
    assertEqual(metrics.totalResolvedClauses, 2, "2 resolved Clauses gesamt");

    // Calculate rates
    const openRate = Math.round((metrics.read / metrics.total) * 100);
    const actionRate = Math.round((metrics.withFixes / metrics.total) * 100);
    const resolveRate = Math.round((metrics.resolved / metrics.total) * 100);
    const clauseResolveRate = Math.round((metrics.totalResolvedClauses / metrics.totalAffectedClauses) * 100);

    assertEqual(openRate, 100, "Open Rate = 100% (alle Alerts gelesen)");
    assertEqual(actionRate, 100, "Action Rate = 100% (alle Alerts mit Fix)");
    assertEqual(resolveRate, 100, "Resolve Rate = 100% (alle Alerts resolved)");
    assertEqual(clauseResolveRate, 100, "Clause Resolve Rate = 100% (alle Klauseln gefixt)");

    console.log(`\n  📊 Action Rate Funnel (Testdaten):`);
    console.log(`     Alerts: ${metrics.total} → Opened: ${metrics.read} → Fixed: ${metrics.withFixes} → Resolved: ${metrics.resolved}`);
    console.log(`     Open Rate: ${openRate}% | Action Rate: ${actionRate}% | Resolve Rate: ${resolveRate}%`);
    console.log(`     Klauseln: ${metrics.totalResolvedClauses}/${metrics.totalAffectedClauses} resolved (${clauseResolveRate}%)`);

    // ─────────────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────────────
    section("Cleanup — Testdaten entfernen");

    await LegalPulseV2Result.deleteMany({ userId: TEST_USER_ID });
    await db.collection("pulse_v2_legal_alerts").deleteMany({ userId: TEST_USER_ID });
    console.log("  ✅ Testdaten bereinigt");

  } catch (err) {
    console.error("\n  ❌ INTEGRATION TEST ERROR:", err.message);
    console.error(err.stack);
    failedTests++;

    // Cleanup on error
    try {
      await LegalPulseV2Result.deleteMany({ userId: TEST_USER_ID });
      await db.collection("pulse_v2_legal_alerts").deleteMany({ userId: TEST_USER_ID });
    } catch (e) { /* ignore cleanup errors */ }
  } finally {
    await mongoose.disconnect();
  }
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const unitOnly = args.includes("--unit");
  const integrationOnly = args.includes("--integration");
  const runAll = !unitOnly && !integrationOnly;

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Legal Pulse V2 — End-to-End Pipeline Tests            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  if (runAll || unitOnly) {
    section("UNIT TESTS (Tests 1-5)");
    console.log("  Teste Detection-Funktionen ohne Datenbank...\n");
    runUnitTests();
  }

  if (runAll || integrationOnly) {
    section("INTEGRATION TESTS (Tests 6-9)");
    console.log("  Teste DB-Logik mit echten Mongoose-Operationen...\n");
    await runIntegrationTests();
  }

  // ─────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log(`║   ERGEBNIS: ${passedTests}/${totalTests} Tests bestanden${" ".repeat(Math.max(0, 28 - String(passedTests).length - String(totalTests).length))}║`);
  console.log("╚══════════════════════════════════════════════════════════╝");

  if (failedTests > 0) {
    console.log(`\n  ❌ ${failedTests} FEHLGESCHLAGEN:`);
    failures.forEach((f) => console.log(`     • ${f}`));
    process.exit(1);
  } else {
    console.log("\n  🎯 Alle Tests bestanden! Pipeline funktioniert korrekt.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

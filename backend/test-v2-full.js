// 🧪 Complete V2 System Test - Full Two-Phase Flow
// Tests: Phase 1 → Phase 2 → Validator → Self-Check

require('dotenv').config();
const generateV2 = require('./routes/generateV2');
const { MongoClient } = require('mongodb');

// ===== TEST DATA =====
const testMietvertrag = {
  title: "Mietvertrag Wohnung Teststraße",
  parteiA: {
    name: "Immobilien Test GmbH",
    address: "Teststraße 1, 10115 Berlin",
    details: "HRB 98765"
  },
  parteiB: {
    name: "Anna Testerin",
    address: "Beispielweg 42, 10115 Berlin"
  },
  mietobjekt: "2-Zimmer-Wohnung, 1. OG, 65 qm",
  mietbeginn: "2025-02-01",
  miete: "850.00",
  nebenkosten: "150.00",
  kaution: "2550.00",
  customRequirements: "Haustiere (Katzen) sind erlaubt. Vorauszahlung von 50 Euro bereits erfolgt am 15.11.2025."
};

// ===== MongoDB MOCK (für Test ohne echte DB) =====
const mockDb = {
  collection: (name) => ({
    insertOne: async (doc) => {
      console.log(`📝 Mock DB: Würde in Collection "${name}" einfügen`);
      console.log(`   Document hat ${Object.keys(doc).length} Top-Level-Keys`);
      return { insertedId: "mock-id-12345" };
    }
  })
};

// ===== TEST EXECUTION =====
async function runFullTest() {
  console.log("🧪 =====================================================");
  console.log("🧪 V2 FULL SYSTEM TEST - COMPLETE TWO-PHASE FLOW");
  console.log("🧪 =====================================================\n");

  try {
    console.log("📋 Test Contract: Mietvertrag");
    console.log("=" .repeat(60));
    console.log("Parties:", testMietvertrag.parteiA.name, "→", testMietvertrag.parteiB.name);
    console.log("Details:", testMietvertrag.mietobjekt);
    console.log("Custom Requirements:", testMietvertrag.customRequirements);
    console.log();

    // ===== FULL V2 FLOW =====
    console.log("🚀 Starting V2 generateContractV2...\n");
    const startTime = Date.now();

    const result = await generateV2.generateContractV2(
      testMietvertrag,
      "mietvertrag",
      "test-user-id-123",
      mockDb
    );

    const totalTime = Date.now() - startTime;

    // ===== RESULTS ANALYSIS =====
    console.log("\n✅ =====================================================");
    console.log("✅ V2 GENERATION COMPLETED SUCCESSFULLY");
    console.log("✅ =====================================================\n");

    console.log("⏱️  TIMING:");
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Phase 1: ${result.artifacts.phase1.timingMs}ms`);
    console.log(`   Phase 2: ${result.artifacts.phase2.timingMs}ms`);
    console.log(`   Self-Check: ${result.artifacts.selfCheck ? 'included' : 'N/A'}`);
    console.log();

    console.log("🎯 PHASE 1 (Meta-Prompt):");
    console.log(`   Model: ${result.artifacts.phase1.model}`);
    console.log(`   Temperature: ${result.artifacts.phase1.temperature}`);
    console.log(`   Tokens: ${result.artifacts.phase1.tokenCount.total}`);
    console.log(`   Generated Prompt Length: ${result.artifacts.phase1.generatedPrompt.length} chars`);
    console.log(`   Snapshot - Roles: ${result.artifacts.phase1.snapshot.roles.A} / ${result.artifacts.phase1.snapshot.roles.B}`);
    console.log(`   Snapshot - Must-Clauses: ${result.artifacts.phase1.snapshot.mustClauses.length}`);
    console.log(`   Snapshot - Forbidden Topics: ${result.artifacts.phase1.snapshot.forbiddenTopics.length}`);
    console.log(`   Snapshot - Custom Requirements: ${result.artifacts.phase1.snapshot.customRequirements.length}`);
    console.log();

    console.log("📝 PHASE 2 (Contract Generation):");
    console.log(`   Model: ${result.artifacts.phase2.model}`);
    console.log(`   Temperature: ${result.artifacts.phase2.temperature}`);
    console.log(`   Tokens: ${result.artifacts.phase2.tokenCount.total}`);
    console.log(`   Contract Length: ${result.contractText.length} chars`);
    console.log(`   Retries: ${result.artifacts.phase2.retries}`);
    console.log();

    console.log("✅ VALIDATOR (Deterministic):");
    console.log(`   Passed: ${result.artifacts.validator.passed ? '✅ YES' : '❌ NO'}`);
    console.log(`   Roles Correct: ${result.artifacts.validator.checks.rolesCorrect ? '✅' : '❌'}`);
    console.log(`   Paragraphs Sequential: ${result.artifacts.validator.checks.paragraphsSequential ? '✅' : '❌'}`);
    console.log(`   Forbidden Topics Absent: ${result.artifacts.validator.checks.forbiddenTopicsAbsent ? '✅' : '❌'}`);
    if (result.artifacts.validator.warnings.length > 0) {
      console.log(`   Warnings: ${result.artifacts.validator.warnings.length}`);
      result.artifacts.validator.warnings.forEach(w => console.log(`      - ${w}`));
    }
    if (result.artifacts.validator.errors.length > 0) {
      console.log(`   ❌ Errors: ${result.artifacts.validator.errors.length}`);
      result.artifacts.validator.errors.forEach(e => console.log(`      - ${e}`));
    }
    console.log();

    if (result.artifacts.selfCheck) {
      console.log("🔍 SELF-CHECK (LLM-Based):");
      console.log(`   Conforms: ${result.artifacts.selfCheck.conforms ? '✅ YES' : '❌ NO'}`);
      console.log(`   Score: ${result.artifacts.selfCheck.score.toFixed(2)} (Threshold: 0.93)`);
      console.log(`   Notes:`);
      result.artifacts.selfCheck.notes.forEach(note => console.log(`      - ${note}`));
      console.log();
    }

    // ===== CONTRACT PREVIEW =====
    console.log("📄 CONTRACT PREVIEW (first 800 chars):");
    console.log("─".repeat(60));
    console.log(result.contractText.substring(0, 800));
    console.log("─".repeat(60));
    console.log();

    // ===== QUALITY CHECKS =====
    console.log("🔎 QUALITY CHECKS:");
    const hasVermieter = result.contractText.includes("Vermieter");
    const hasMieter = result.contractText.includes("Mieter");
    const hasCustomReq = result.contractText.toLowerCase().includes("katzen") ||
                          result.contractText.toLowerCase().includes("haustiere");
    const hasVorauszahlung = result.contractText.includes("50") &&
                              (result.contractText.includes("Vorauszahlung") ||
                               result.contractText.includes("vorauszahlung"));
    const hasParagraph1 = result.contractText.match(/§\s*1\s+Mietgegenstand/i);
    const hasParagraph11 = result.contractText.match(/§\s*11\s+/);

    console.log(`   ✅ Contains "Vermieter": ${hasVermieter ? 'YES' : 'NO'}`);
    console.log(`   ✅ Contains "Mieter": ${hasMieter ? 'YES' : 'NO'}`);
    console.log(`   ✅ Contains Custom Req (Katzen/Haustiere): ${hasCustomReq ? 'YES' : 'NO'}`);
    console.log(`   ✅ Contains Vorauszahlung (50 Euro): ${hasVorauszahlung ? 'YES' : 'NO'}`);
    console.log(`   ✅ Has § 1 Mietgegenstand: ${hasParagraph1 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Has § 11 (should have 11 paragraphs): ${hasParagraph11 ? 'YES' : 'NO'}`);
    console.log();

    // ===== FINAL VERDICT =====
    const allChecksPassed = hasVermieter && hasMieter && hasCustomReq &&
                             hasParagraph1 && hasParagraph11 &&
                             result.artifacts.validator.passed;

    if (allChecksPassed) {
      console.log("🎉 =====================================================");
      console.log("🎉 ALL TESTS PASSED - V2 SYSTEM WORKING CORRECTLY!");
      console.log("🎉 =====================================================");
    } else {
      console.log("⚠️  =====================================================");
      console.log("⚠️  SOME CHECKS FAILED - REVIEW RESULTS ABOVE");
      console.log("⚠️  =====================================================");
    }

  } catch (error) {
    console.error("\n❌ =====================================================");
    console.error("❌ TEST FAILED WITH ERROR");
    console.error("❌ =====================================================");
    console.error("Error:", error.message);
    console.error("\nStack Trace:");
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
runFullTest().catch(console.error);

// 🧪 Test Script für V2 Phase 1 (Meta-Prompt Generation)
// Testet: Prompt-Generierung, Snapshot-Parsing, Contract-Type-Module

require('dotenv').config();
const generateV2 = require('./routes/generateV2');

// ===== TEST DATA: Mietvertrag =====
const testMietvertrag = {
  title: "Mietvertrag Wohnung Musterstraße",
  parteiA: {
    name: "Max Mustermann GmbH",
    address: "Musterstraße 1, 12345 Musterstadt",
    details: "HRB 12345, USt-IdNr. DE123456789"
  },
  parteiB: {
    name: "Erika Musterfrau",
    address: "Beispielweg 2, 54321 Beispielstadt"
  },
  mietobjekt: "3-Zimmer-Wohnung, 2. OG, 85 qm",
  mietbeginn: "2025-01-01",
  miete: "950.00",
  nebenkosten: "200.00",
  kaution: "2850.00",
  customRequirements: "Haustiere nach Absprache erlaubt. Vorauszahlung von 100 Euro bereits geschehen am 4.11.2025."
};

// ===== TEST DATA: Freelancer =====
const testFreelancer = {
  title: "Freelancer-Vertrag Webentwicklung",
  parteiA: {
    name: "TechCorp GmbH",
    address: "Technologiepark 5, 80333 München"
  },
  parteiB: {
    name: "Julia Webdesign",
    address: "Kreativstraße 12, 10115 Berlin"
  },
  projektbeschreibung: "Entwicklung einer responsiven Website mit React und Node.js",
  verguetung: "5000.00",
  verguetungsart: "pauschal",
  zahlungsziel: "14 Tage",
  projektstart: "2025-01-15",
  laufzeit: "3 Monate",
  customRequirements: "Wöchentliche Status-Meetings per Zoom erforderlich"
};

// ===== TEST DATA: Kaufvertrag =====
const testKaufvertrag = {
  title: "Kaufvertrag Büromöbel",
  parteiA: {
    name: "Möbel Fischer GmbH",
    address: "Industriestraße 45, 70565 Stuttgart"
  },
  parteiB: {
    name: "StartUp Solutions GmbH",
    address: "Gründerweg 8, 60314 Frankfurt"
  },
  kaufgegenstand: "10 Schreibtische, 20 Bürostühle, 5 Regale",
  kaufpreis: "15000.00",
  lieferdatum: "2025-02-01",
  zahlungsbedingungen: "50% Anzahlung, Rest bei Lieferung",
  customRequirements: "Montage und Aufbau durch Verkäufer inklusive"
};

// ===== TEST EXECUTION =====
async function runTests() {
  console.log("🧪 =================================");
  console.log("🧪 V2 PHASE 1 TEST SUITE");
  console.log("🧪 =================================\n");

  const tests = [
    { name: "Mietvertrag", type: "mietvertrag", data: testMietvertrag },
    { name: "Freelancer", type: "freelancer", data: testFreelancer },
    { name: "Kaufvertrag", type: "kaufvertrag", data: testKaufvertrag }
  ];

  for (const test of tests) {
    console.log(`\n📋 TEST: ${test.name}`);
    console.log("=" .repeat(50));

    try {
      // Load contract type module
      const typeProfile = require(`./contractTypes/${test.type}.js`);
      console.log("✅ Contract type module loaded");
      console.log(`   Roles: ${typeProfile.roles.A} / ${typeProfile.roles.B}`);
      console.log(`   Must-Clauses: ${typeProfile.mustClauses.length} Paragraphen`);
      console.log(`   Forbidden Topics: ${typeProfile.forbiddenTopics.length} Themen`);

      // Run Phase 1
      console.log("\n🔄 Running Phase 1...");
      const phase1Result = await generateV2.runPhase1_MetaPrompt(
        test.data,
        test.type,
        typeProfile
      );

      console.log(`✅ Phase 1 completed in ${phase1Result.timingMs}ms`);
      console.log(`   Tokens: ${phase1Result.tokenCount.total} (prompt: ${phase1Result.tokenCount.prompt}, completion: ${phase1Result.tokenCount.completion})`);
      console.log(`   Model: ${phase1Result.model}`);

      // Validate snapshot
      console.log("\n📸 Snapshot Validation:");
      console.log(`   Roles found: ${phase1Result.snapshot.roles.A} / ${phase1Result.snapshot.roles.B}`);
      console.log(`   Must-Clauses: ${phase1Result.snapshot.mustClauses.length}`);
      console.log(`   Forbidden Topics: ${phase1Result.snapshot.forbiddenTopics.length}`);
      console.log(`   Custom Requirements: ${phase1Result.snapshot.customRequirements ? phase1Result.snapshot.customRequirements.length : 0}`);

      // Show first 500 chars of generated prompt
      console.log("\n📝 Generated Prompt (preview):");
      console.log(phase1Result.generatedPrompt.substring(0, 500) + "...\n");

      console.log(`✅ ${test.name} TEST PASSED`);

    } catch (error) {
      console.error(`❌ ${test.name} TEST FAILED:`, error.message);
      console.error(error.stack);
    }
  }

  console.log("\n🧪 =================================");
  console.log("🧪 TEST SUITE COMPLETED");
  console.log("🧪 =================================");
}

// Run tests
runTests().catch(console.error);

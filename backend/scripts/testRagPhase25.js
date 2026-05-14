/**
 * Phase 2.5 RAG-Test mit der NEUEN legalLensSources Collection.
 * Validiert: Finden wir jetzt echte BGB-§§ statt News-Artikel?
 */

require("dotenv").config();
const mongoose = require("mongoose");
const database = require("../config/database");

const TEST_CLAUSES = [
  {
    name: "§ 1 Forderungskauf (Factoring)",
    text: "Der Factoringkunde verpflichtet sich, alle nach Abschluss dieses Factoring-Rahmenvertrages entstehenden Forderungen aus Warenlieferungen und/oder Dienstleistungen an seine in der Debitorenliste aufgeführten Kunden unverzüglich nach deren Entstehung der GRENKEFACTORING zum Kauf anzubieten."
  },
  {
    name: "§ 10 Garantie (verschuldensunabhängig)",
    text: "Der Factoringkunde garantiert GRENKEFACTORING unabhängig von Vorsatz oder Fahrlässigkeit, dass die Forderung einschließlich aller Nebenrechte besteht, abtretbar und nicht mit Einreden oder Einwendungen oder Rechten anderer Dritter behaftet ist."
  },
  {
    name: "AGB Salvatorische Klausel",
    text: "Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein oder werden, so wird hierdurch die Gültigkeit der übrigen Bestimmungen nicht berührt."
  },
  {
    name: "Datenverarbeitung",
    text: "Der Auftragnehmer verarbeitet personenbezogene Daten ausschließlich im Rahmen der Weisungen des Auftraggebers gemäß einer noch zu schließenden Auftragsverarbeitungsvereinbarung."
  }
];

(async () => {
  await database.connect();
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);

  const legalLensSourcesEmb = require("../services/legalLensSourcesEmbeddings").getInstance();
  const courtEmb = require("../services/courtDecisionEmbeddings").getInstance();

  for (const clause of TEST_CLAUSES) {
    console.log("\n══════════════════════════════════════════════════════════");
    console.log(`  TEST: ${clause.name}`);
    console.log("══════════════════════════════════════════════════════════");

    console.log("\n📜 GESETZE (legalLensSources) — Top 5:");
    const statutes = await legalLensSourcesEmb.queryRelevantSections({ text: clause.text, topK: 5 });
    statutes.forEach((s, i) => {
      const rel = s.relevance.toFixed(3);
      console.log(`  ${i + 1}. [${rel}] ${s.section} ${s.code} — ${s.title.substring(0, 60)}`);
      console.log(`     ${s.sourceUrl}`);
    });

    console.log("\n⚖️  URTEILE (courtdecisions) — Top 3:");
    const cases = await courtEmb.queryRelevantDecisions({ text: clause.text, topK: 3 });
    cases.forEach((c, i) => {
      const rel = c.relevance.toFixed(3);
      console.log(`  ${i + 1}. [${rel}] ${c.court} ${c.caseNumber} | area=${c.legalArea}`);
    });
  }

  console.log("\n══════════════════════════════════════════════════════════\n");
  process.exit(0);
})().catch(err => {
  console.error("Fehler:", err.message);
  process.exit(1);
});

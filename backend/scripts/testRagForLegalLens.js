/**
 * Test-Script: Simuliert _fetchLegalCandidates() mit echten Klauseln aus
 * dem Factoring-Vertrag, um zu sehen WARUM keine Treffer kamen.
 *
 * Zeigt:
 * - Top-K Roh-Treffer ohne Filter
 * - Welche Treffer der Quality-Filter rauswirft
 * - Final übrige Kandidaten
 *
 * Run: node backend/scripts/testRagForLegalLens.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const database = require('../config/database');

const VALID_AREAS = new Set([
  'Vertragsrecht', 'Arbeitsrecht', 'Mietrecht', 'Verbraucherrecht',
  'Datenschutz', 'datenschutz', 'kaufrecht', 'Kaufrecht',
  'Bankrecht', 'Gesellschaftsrecht', 'Steuerrecht', 'EU-Recht',
  'Sozialrecht', 'Verfassungsrecht', 'Verwaltungsrecht'
]);

const TEST_CLAUSES = [
  {
    name: '§ 1 Forderungskauf (Factoring)',
    text: 'Der Factoringkunde verpflichtet sich, alle nach Abschluss dieses Factoring-Rahmenvertrages entstehenden Forderungen aus Warenlieferungen und/oder Dienstleistungen an seine in der Debitorenliste aufgeführten Kunden unverzüglich nach deren Entstehung der GRENKEFACTORING zum Kauf anzubieten.'
  },
  {
    name: '§ 10 Garantie (verschuldensunabhängig)',
    text: 'Der Factoringkunde garantiert GRENKEFACTORING unabhängig von Vorsatz oder Fahrlässigkeit, dass die Forderung einschließlich aller Nebenrechte besteht, abtretbar und nicht mit Einreden oder Einwendungen oder Rechten anderer Dritter behaftet ist, und dass er zur Abtretung der Forderung berechtigt ist.'
  },
  {
    name: '§ 15 Einsicht in Geschäftsunterlagen',
    text: 'GRENKEFACTORING ist im Rahmen der üblichen Geschäftszeiten jederzeit berechtigt, zur Prüfung der an die GRENKEFACTORING abgetretenen Forderungen Einsicht in die Geschäftsbücher und sonstigen Unterlagen des Factoringkunden zu nehmen.'
  }
];

(async () => {
  await database.connect();
  // Mongoose-Connection für die Models (Law, CourtDecision)
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const lawEmb = require('../services/lawEmbeddings').getInstance();
  const courtEmb = require('../services/courtDecisionEmbeddings').getInstance();

  for (const clause of TEST_CLAUSES) {
    console.log('\n══════════════════════════════════════════════════════════');
    console.log(`  TEST: ${clause.name}`);
    console.log('══════════════════════════════════════════════════════════');

    // ─── Gesetze ─────────────────────────────────────────────
    console.log('\n📜 LAWS — Top 8 Roh-Treffer (ohne Filter):');
    let rawLaws = [];
    try {
      rawLaws = await lawEmb.queryRelevantSections({ text: clause.text, topK: 8 });
    } catch (err) {
      console.log('  ❌ Fehler:', err.message);
      continue;
    }

    rawLaws.forEach((l, i) => {
      const rel = (l.relevance || 0).toFixed(3);
      const lawId = (l.lawId || '?').substring(0, 40);
      const sec = (l.sectionId || '?').substring(0, 20);
      const title = (l.title || '').substring(0, 50);
      const area = (l.area || '?').substring(0, 20);
      const hasUrl = l.sourceUrl ? '✓url' : '✗url';
      console.log(`  ${i + 1}. [${rel}] ${lawId} ${sec} ${title} | area=${area} ${hasUrl}`);
    });

    // Quality-Filter simulieren
    const filteredLaws = rawLaws
      .filter(s => s.relevance >= 0.65)
      .filter(s => s.lawId && !s.lawId.startsWith('http') && s.lawId.length < 50)
      .filter(s => VALID_AREAS.has(s.area))
      .filter(s => s.sourceUrl && s.sourceUrl.startsWith('http'));

    console.log(`\n  → Nach Filter (threshold 0.65, valid_area, valid_url): ${filteredLaws.length} übrig`);

    // Analysiere warum gefiltert
    const reasons = {
      threshold: rawLaws.filter(s => s.relevance < 0.65).length,
      lawIdBad: rawLaws.filter(s => !s.lawId || s.lawId.startsWith('http') || s.lawId.length >= 50).length,
      areaBad: rawLaws.filter(s => !VALID_AREAS.has(s.area)).length,
      urlBad: rawLaws.filter(s => !s.sourceUrl || !s.sourceUrl.startsWith('http')).length
    };
    console.log(`  Filter-Stats: <0.65=${reasons.threshold}, badLawId=${reasons.lawIdBad}, badArea=${reasons.areaBad}, badUrl=${reasons.urlBad}`);

    // ─── Urteile ──────────────────────────────────────────────
    console.log('\n⚖️  CASELAW — Top 5 Roh-Treffer:');
    let rawCases = [];
    try {
      rawCases = await courtEmb.queryRelevantDecisions({ text: clause.text, topK: 5 });
    } catch (err) {
      console.log('  ❌ Fehler:', err.message);
      continue;
    }

    rawCases.forEach((c, i) => {
      const rel = (c.relevance || 0).toFixed(3);
      const court = (c.court || '?').substring(0, 8);
      const num = (c.caseNumber || '?').substring(0, 20);
      const area = (c.legalArea || '?').substring(0, 20);
      const hasUrl = c.sourceUrl ? '✓url' : '✗url';
      console.log(`  ${i + 1}. [${rel}] ${court} ${num} | area=${area} ${hasUrl}`);
    });

    const filteredCases = rawCases
      .filter(c => c.relevance >= 0.70)
      .filter(c => c.caseNumber && c.court && c.sourceUrl);

    console.log(`\n  → Nach Filter (threshold 0.70): ${filteredCases.length} übrig`);
  }

  console.log('\n══════════════════════════════════════════════════════════\n');
  process.exit(0);
})().catch(err => {
  console.error('Fehler:', err);
  process.exit(1);
});

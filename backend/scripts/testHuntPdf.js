/**
 * One-shot Test: Date Hunt gegen eine lokale PDF.
 * MACHT GPT-CALLS — kostet ~$0.30 für komplexe Verträge.
 *
 * Usage: node scripts/testHuntPdf.js <pfad-zur-pdf>
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { huntDates } = require('../services/dateHuntService');

async function run() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: node scripts/testHuntPdf.js <pfad-zur-pdf>');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY fehlt.');
    process.exit(1);
  }
  if (!fs.existsSync(pdfPath)) {
    console.error(`Datei nicht gefunden: ${pdfPath}`);
    process.exit(2);
  }

  console.log(`PDF lesen: ${pdfPath}`);
  const buffer = fs.readFileSync(pdfPath);
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;
  console.log(`Seiten: ${pdfData.numpages}`);
  console.log(`Text:   ${text.length} Zeichen\n`);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 90000,
    maxRetries: 2
  });

  const t0 = Date.now();
  const requestId = 'pdf-test';
  const result = await huntDates(text, openai, requestId);
  const elapsedMs = Date.now() - t0;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`ERGEBNIS`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Dauer:          ${elapsedMs}ms`);
  console.log(`Datums:         ${result.importantDates.length}`);
  console.log(`Fristen:        ${result.fristHinweise.length}`);
  console.log(`Stages:         Junior=${result.stats.junior?.fallback ? 'FAIL' : `${result.stats.junior?.validated_dates}+${result.stats.junior?.validated_fristen}`} | ` +
              `ClauseAudit=${result.stats.clauseAudit?.fallback ? 'FAIL' : `${result.stats.clauseAudit?.validated_dates}+${result.stats.clauseAudit?.validated_fristen} aus ${result.stats.clauseAudit?.chunks} Chunks`} | ` +
              `Senior=${result.stats.senior?.fallback ? 'FAIL' : `+${result.stats.senior?.validated_dates}+${result.stats.senior?.validated_fristen}`}`);

  console.log(`\nDATUMS:`);
  if (result.importantDates.length === 0) console.log('  (keine)');
  result.importantDates.forEach((d, i) => {
    console.log(`  [${i + 1}] ${d.type}  ${d.date}  "${d.label}"`);
    console.log(`      ${(d.description || '').slice(0, 120)}`);
    console.log(`      evidence: "${(d.evidence || '').slice(0, 130)}${(d.evidence || '').length > 130 ? '...' : ''}"`);
  });

  console.log(`\nFRISTEN:`);
  if (result.fristHinweise.length === 0) console.log('  (keine)');
  result.fristHinweise.forEach((f, i) => {
    console.log(`  [${i + 1}] ${f.type}  "${f.title}"`);
    console.log(`      ${(f.description || '').slice(0, 120)}`);
    console.log(`      ${f.legalBasis ? '§: ' + f.legalBasis : ''}`);
    console.log(`      evidence: "${(f.evidence || '').slice(0, 130)}${(f.evidence || '').length > 130 ? '...' : ''}"`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error('Fehler:', err.message);
  console.error(err.stack);
  process.exit(1);
});

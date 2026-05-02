/**
 * End-to-End-Test der neuen 3-Stage-Kaskade gegen echte DB-Verträge.
 *
 * MACHT ECHTE GPT-CALLS — kostet Geld.
 *
 * Ziele:
 *   • Mietvertrag (Regression-Test): muss weiter ≥4 Datums + ≥2 Fristen liefern
 *   • Factoring (Erfolgs-Test):      muss jetzt ≥3 Fristen liefern (vorher 0)
 *
 * Macht KEINE DB-Writes. Liest nur Vertragstexte aus analyses-Collection.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const OpenAI = require('openai');
const { huntDates } = require('../services/dateHuntService');

const TARGET_USER_ID = '699c99de6ffba01ace3db87b';

async function loadContractText(db, fileRegex, label) {
  const a = await db.collection('analyses').findOne(
    { userId: TARGET_USER_ID, contractName: fileRegex },
    { sort: { createdAt: -1 } }
  );
  if (!a) {
    console.log(`Konnte ${label} nicht finden.`);
    return null;
  }
  const text = a.fullText || a.extractedText || '';
  console.log(`\n=== ${label} ===`);
  console.log(`Datei:       ${a.contractName}`);
  console.log(`Erstellt:    ${a.createdAt}`);
  console.log(`Textlänge:   ${text.length} chars`);
  console.log(`Heute in DB: ${(a.importantDates || []).length} Datums + ${Array.isArray(a.fristHinweise) ? a.fristHinweise.length : '(undef)'} Fristen`);
  return text;
}

async function runTest(label, text, openai, expectations) {
  console.log(`\n${'='.repeat(70)}\nTEST: ${label}\n${'='.repeat(70)}`);
  const t0 = Date.now();
  const requestId = `e2e-${label.toLowerCase().replace(/\s+/g, '')}`;
  const result = await huntDates(text, openai, requestId);
  const elapsedMs = Date.now() - t0;

  console.log(`\n--- ERGEBNIS ${label} ---`);
  console.log(`Dauer:            ${elapsedMs}ms`);
  console.log(`Datums:           ${result.importantDates.length}`);
  console.log(`Fristen:          ${result.fristHinweise.length}`);
  console.log(`Stats:            ${JSON.stringify({
    junior: result.stats.junior?.fallback ? 'FAIL' : `${result.stats.junior?.validated_dates}+${result.stats.junior?.validated_fristen}`,
    clauseAudit: result.stats.clauseAudit?.fallback ? 'FAIL' : `${result.stats.clauseAudit?.validated_dates}+${result.stats.clauseAudit?.validated_fristen} aus ${result.stats.clauseAudit?.chunks} Chunks (${result.stats.clauseAudit?.failed} fail)`,
    senior: result.stats.senior?.fallback ? 'FAIL' : `+${result.stats.senior?.validated_dates}+${result.stats.senior?.validated_fristen}`
  })}`);

  console.log(`\nDATUMS:`);
  result.importantDates.forEach((d, i) => {
    console.log(`  [${i + 1}] ${d.type}  ${d.date}  "${d.label}"`);
    console.log(`      evidence: "${(d.evidence || '').slice(0, 100)}${(d.evidence || '').length > 100 ? '...' : ''}"`);
  });

  console.log(`\nFRISTEN:`);
  result.fristHinweise.forEach((f, i) => {
    console.log(`  [${i + 1}] ${f.type}  "${f.title}"`);
    console.log(`      evidence: "${(f.evidence || '').slice(0, 100)}${(f.evidence || '').length > 100 ? '...' : ''}"`);
  });

  // Erwartungs-Check
  const passDates = result.importantDates.length >= (expectations.minDates || 0);
  const passFristen = result.fristHinweise.length >= (expectations.minFristen || 0);
  const pass = passDates && passFristen;
  console.log(`\n${pass ? '✓ PASS' : '✗ FAIL'} — Erwartung: ≥${expectations.minDates} Datums (${passDates ? 'ok' : 'FAIL'}), ≥${expectations.minFristen} Fristen (${passFristen ? 'ok' : 'FAIL'})`);
  return pass;
}

async function run() {
  if (!process.env.MONGO_URI || !process.env.OPENAI_API_KEY) {
    console.error('MONGO_URI oder OPENAI_API_KEY fehlt. Aborted.');
    process.exit(1);
  }
  console.log('Verbinde zur MongoDB (read-only)...');
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'contract_ai' });
  const db = mongoose.connection.db;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 90000,
    maxRetries: 2
  });

  // 1. Mietvertrag laden
  const mietText = await loadContractText(db, /miet/i, 'Mietvertrag');
  // 2. Factoring laden
  const factoringText = await loadContractText(db, /factoring|grenkefactoring|kaja|keck.*marckert|FRV/i, 'Factoring');

  if (!mietText || !factoringText) {
    console.error('Mindestens ein Vertrag fehlt. Aborted.');
    await mongoose.disconnect();
    process.exit(2);
  }

  // Mietvertrag-Test (Regression)
  const mietPass = await runTest('Mietvertrag (Regression)', mietText, openai, {
    minDates: 4,
    minFristen: 2
  });

  // Factoring-Test (Erfolgs-Check)
  const factPass = await runTest('Factoring (Erfolgs-Check)', factoringText, openai, {
    minDates: 0,    // Factoring hat keine konkreten Datums (Rahmenvertrag)
    minFristen: 3
  });

  console.log(`\n${'#'.repeat(70)}`);
  console.log(`GESAMT-FAZIT`);
  console.log(`${'#'.repeat(70)}`);
  console.log(`Mietvertrag (Regression):  ${mietPass ? 'PASS' : 'FAIL'}`);
  console.log(`Factoring (Erfolgs):       ${factPass ? 'PASS' : 'FAIL'}`);
  console.log(`${'='.repeat(70)}`);
  console.log(mietPass && factPass
    ? '==> BEIDE TESTS GRÜN. Kaskade ist deploy-bereit.'
    : '==> MINDESTENS EIN TEST FAIL. NICHT DEPLOYEN.');

  await mongoose.disconnect();
  process.exit(mietPass && factPass ? 0 : 4);
}

run().catch(err => {
  console.error('Fehler:', err.message);
  console.error(err.stack);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});

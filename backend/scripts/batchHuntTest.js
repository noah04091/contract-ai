/**
 * Batch-Validierung der Date Hunt Cascade über verschiedene Vertragstypen.
 *
 * MACHT GPT-CALLS — Cost ~$1.50 für 7 Verträge + Konsistenz-Check.
 *
 * Prüft pro Vertrag:
 *   1. Wie viele Datums + Fristen werden gefunden?
 *   2. Verteilung über Junior / ClauseAudit / Senior
 *   3. Halluzinations-Check: jede evidence muss WÖRTLICH im Vertrag stehen
 *   4. Konsistenz-Check (für ersten Vertrag): 2x durchjagen, Drift messen
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { huntDates } = require('../services/dateHuntService');

const TEST_DIR = path.join(__dirname, '..', '..', 'test-contracts');

// Auswahl: Vielfalt > Vollständigkeit. Variation in Typ + Komplexität.
const CONTRACTS = [
  { file: 'Mietvertrag_Version_B_Wohnung.pdf',         type: 'Mietvertrag-V2' },
  { file: 'NDA_Version_A_TechCorp.pdf',                type: 'NDA-A' },
  { file: 'NDA_Version_B_InnoSoft.pdf',                type: 'NDA-B' },
  { file: 'Freelancer_Version_A_WebDev.pdf',           type: 'Freelancer' },
  { file: 'Dienstleistungsvertrag_TechServe_GmbH.pdf', type: 'Dienstleistung' },
  { file: 'SaaS_Version_A_CloudPlatform.pdf',          type: 'SaaS' },
  { file: 'real_factoring_eisqueen.pdf',               type: 'Factoring' }
];

// Gleiche normalize-Logik wie der Service — für unabhängigen
// Halluzinations-Check außerhalb der huntDates-Pipeline.
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/­/g, '')
    .replace(/(\w)-\n\s*(\w)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

async function huntOnPdf(filePath, openai, label) {
  const buffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;
  const t0 = Date.now();
  const result = await huntDates(text, openai, label);
  const elapsedMs = Date.now() - t0;
  return { text, result, elapsedMs, pages: pdfData.numpages };
}

function halluzinationCheck(items, contractText, label) {
  const normText = normalize(contractText);
  const halluzinationen = [];
  for (const item of items) {
    const ev = item.evidence || '';
    if (!ev) {
      halluzinationen.push({ label, type: item.type || 'unbekannt', why: 'evidence leer', item });
      continue;
    }
    if (!normText.includes(normalize(ev))) {
      halluzinationen.push({ label, type: item.type || 'unbekannt', why: 'evidence nicht im Vertrag', evidence: ev.slice(0, 80) });
    }
  }
  return halluzinationen;
}

async function run() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY fehlt.'); process.exit(1);
  }
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 90000,
    maxRetries: 2
  });

  const summary = [];
  let allHalluzinationen = [];
  let totalCost = 0; // grobe Schätzung: gpt-4-turbo $0.01/1k input + $0.03/1k output

  console.log('========================================================');
  console.log('BATCH-TEST 7 Verträge');
  console.log('========================================================\n');

  for (const c of CONTRACTS) {
    const filePath = path.join(TEST_DIR, c.file);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP ${c.type}: Datei nicht gefunden (${c.file})`);
      continue;
    }
    console.log(`\n--- ${c.type} (${c.file}) ---`);
    const { text, result, elapsedMs, pages } = await huntOnPdf(filePath, openai, `batch-${c.type}`);
    const hall = halluzinationCheck([
      ...result.importantDates,
      ...result.fristHinweise
    ], text, c.type);
    if (hall.length > 0) allHalluzinationen.push(...hall);

    const stages = result.stats;
    summary.push({
      type: c.type,
      pages,
      chars: text.length,
      datums: result.importantDates.length,
      fristen: result.fristHinweise.length,
      junior: stages.junior?.fallback ? 'FAIL' : `${stages.junior?.validated_dates}+${stages.junior?.validated_fristen}`,
      audit: stages.clauseAudit?.fallback ? 'FAIL' : `${stages.clauseAudit?.validated_dates}+${stages.clauseAudit?.validated_fristen}/${stages.clauseAudit?.chunks}`,
      senior: stages.senior?.fallback ? 'FAIL' : `+${stages.senior?.validated_dates}+${stages.senior?.validated_fristen}`,
      durMs: elapsedMs,
      hall: hall.length
    });
    console.log(`  ${pages} Seiten, ${text.length} chars`);
    console.log(`  Final: ${result.importantDates.length} Datums + ${result.fristHinweise.length} Fristen in ${(elapsedMs/1000).toFixed(1)}s`);
    console.log(`  Stages: J=${summary[summary.length-1].junior}  C=${summary[summary.length-1].audit}  S=${summary[summary.length-1].senior}`);
    console.log(`  Halluzinationen: ${hall.length}`);
  }

  // === Konsistenz-Check (Vertrag 0 zweimal) ===
  console.log('\n========================================================');
  console.log('KONSISTENZ-CHECK: erster Vertrag 2x — Drift messen');
  console.log('========================================================');
  const firstFile = path.join(TEST_DIR, CONTRACTS[0].file);
  if (fs.existsSync(firstFile)) {
    const r1 = await huntOnPdf(firstFile, openai, 'consistency-run1');
    const r2 = await huntOnPdf(firstFile, openai, 'consistency-run2');
    const dt1 = r1.result.importantDates.length;
    const ft1 = r1.result.fristHinweise.length;
    const dt2 = r2.result.importantDates.length;
    const ft2 = r2.result.fristHinweise.length;
    const types1 = new Set(r1.result.fristHinweise.map(f => f.type));
    const types2 = new Set(r2.result.fristHinweise.map(f => f.type));
    const overlap = [...types1].filter(t => types2.has(t)).length;
    const union = new Set([...types1, ...types2]).size;
    const jaccard = union > 0 ? Math.round((overlap / union) * 100) : 100;
    console.log(`  Run 1: ${dt1} Datums + ${ft1} Fristen (Typen: ${[...types1].join(', ')})`);
    console.log(`  Run 2: ${dt2} Datums + ${ft2} Fristen (Typen: ${[...types2].join(', ')})`);
    console.log(`  Frist-Typ-Jaccard-Ähnlichkeit: ${jaccard}%`);
  }

  // === Übersichtstabelle ===
  console.log('\n========================================================');
  console.log('ZUSAMMENFASSUNG');
  console.log('========================================================');
  console.log('Typ                | Seiten | Chars  | Datums | Fristen | Junior | Audit       | Senior | Dauer | Hall');
  console.log('-------------------|--------|--------|--------|---------|--------|-------------|--------|-------|------');
  for (const s of summary) {
    console.log(
      `${s.type.padEnd(18)} | ${String(s.pages).padStart(6)} | ${String(s.chars).padStart(6)} | ${String(s.datums).padStart(6)} | ${String(s.fristen).padStart(7)} | ${s.junior.padEnd(6)} | ${s.audit.padEnd(11)} | ${s.senior.padEnd(6)} | ${(s.durMs/1000).toFixed(1).padStart(5)}s | ${s.hall}`
    );
  }

  console.log('\n========================================================');
  console.log('HALLUZINATIONS-AUDIT');
  console.log('========================================================');
  if (allHalluzinationen.length === 0) {
    console.log('  KEINE Halluzinationen — jede Evidence wörtlich im Vertrag belegbar.');
  } else {
    console.log(`  ${allHalluzinationen.length} Halluzinationen gefunden:`);
    for (const h of allHalluzinationen) {
      console.log(`    [${h.label}] ${h.type}: ${h.why}${h.evidence ? ' — "' + h.evidence + '..."' : ''}`);
    }
  }
}

run().catch(err => {
  console.error('Fehler:', err.message);
  console.error(err.stack);
  process.exit(1);
});

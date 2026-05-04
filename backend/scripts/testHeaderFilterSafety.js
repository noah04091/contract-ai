/**
 * Sicherheits-Test für Option B Header-Filter
 *
 * READ-ONLY. Schreibt nichts, ändert nichts.
 *
 * Prüft auf allen letzten abgeschlossenen Analysen des Users, welche Klauseln
 * von verschiedenen Filter-Varianten getroffen würden. Ziel: sicherstellen,
 * dass NUR Header-/Adress-/Tabellen-Müll-Klauseln getroffen werden, keine
 * echten Klauseln, die GPT legitim verdichtet hat.
 *
 * Drei Filter-Varianten:
 *   V1 (LIBERAL):  orig>2000 UND opt/orig < 0.3
 *   V2 (MITTEL):   orig>2000 UND opt/orig < 0.3 UND opt<500
 *   V3 (STRENG):   orig>2000 UND opt<500 UND ≥3 Header-Indicators im Original
 *
 * Header-Indicators: Steuer-Nr, USt-Id, HRB, IBAN, BIC, Bankverbindung,
 * Geschäftsführer, Amtsgericht, Telefax, Handelsregister
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const TARGET_USER_ID = '699c99de6ffba01ace3db87b';

const HEADER_INDICATORS = [
  /Steuer-?Nr/i,
  /USt-?Id/i,
  /HRB\s*\d/i,
  /IBAN/i,
  /\bBIC\b/i,
  /Bankverbindung/i,
  /Geschäftsführer/i,
  /Amtsgericht/i,
  /Telefax/i,
  /Handelsregister/i,
  /Sparkasse/i
];

function countHeaderIndicators(text) {
  if (!text) return 0;
  return HEADER_INDICATORS.filter(re => re.test(text)).length;
}

function variant1(orig, opt) { return orig.length > 2000 && (opt.length / orig.length) < 0.3; }
function variant2(orig, opt) { return orig.length > 2000 && (opt.length / orig.length) < 0.3 && opt.length < 500; }
function variant3(orig, opt) { return orig.length > 2000 && opt.length < 500 && countHeaderIndicators(orig) >= 3; }

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'contract_ai' });
  const col = mongoose.connection.db.collection('optimizer_v2_results');

  const analyses = await col.find({ userId: TARGET_USER_ID, status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(15)
    .toArray();

  console.log('========================================================');
  console.log('SICHERHEITSTEST FÜR OPTION B HEADER-FILTER');
  console.log('Geprüft: ' + analyses.length + ' abgeschlossene Analysen');
  console.log('========================================================\n');

  const totals = { v1Hits: 0, v2Hits: 0, v3Hits: 0, totalOpts: 0 };
  const v1Cases = [], v2Cases = [], v3Cases = [];

  for (const result of analyses) {
    const optMap = new Map();
    for (const o of (result.optimizations || [])) optMap.set(o.clauseId, o);

    let analysisV1 = 0, analysisV2 = 0, analysisV3 = 0, analysisOpts = 0;

    for (let i = 0; i < (result.clauses || []).length; i++) {
      const clause = result.clauses[i];
      const opt = optMap.get(clause.id);
      if (!opt?.needsOptimization) continue;
      const orig = clause.originalText || '';
      const optTxt = opt.versions?.neutral?.text || '';
      if (!optTxt) continue;

      analysisOpts++;
      totals.totalOpts++;

      const indicators = countHeaderIndicators(orig);
      const v1 = variant1(orig, optTxt);
      const v2 = variant2(orig, optTxt);
      const v3 = variant3(orig, optTxt);

      const caseInfo = {
        analysisName: result.fileName,
        clauseIdx: i + 1,
        title: (clause.title || '').slice(0, 50),
        category: clause.category,
        origLen: orig.length,
        optLen: optTxt.length,
        ratio: (optTxt.length / orig.length * 100).toFixed(0) + '%',
        indicators,
        origPreview: orig.replace(/\s+/g, ' ').trim().slice(0, 120)
      };

      if (v1) { analysisV1++; totals.v1Hits++; v1Cases.push(caseInfo); }
      if (v2) { analysisV2++; totals.v2Hits++; v2Cases.push(caseInfo); }
      if (v3) { analysisV3++; totals.v3Hits++; v3Cases.push(caseInfo); }
    }

    if (analysisOpts > 0) {
      const flag = (analysisV1 + analysisV2 + analysisV3) > 0 ? '⚠' : '✓';
      console.log(flag + ' ' + (result.fileName || '?').padEnd(60) + ' | ' + analysisOpts.toString().padStart(2) + ' Opts | V1: ' + analysisV1 + ' V2: ' + analysisV2 + ' V3: ' + analysisV3);
    }
  }

  console.log('\n========================================================');
  console.log('GESAMT: ' + totals.totalOpts + ' optimierte Klauseln über ' + analyses.length + ' Verträge');
  console.log('========================================================');
  console.log('V1 (LIBERAL): ' + totals.v1Hits + ' Klauseln gefiltert');
  console.log('V2 (MITTEL):  ' + totals.v2Hits + ' Klauseln gefiltert');
  console.log('V3 (STRENG):  ' + totals.v3Hits + ' Klauseln gefiltert');

  function dumpCases(label, cases) {
    if (cases.length === 0) {
      console.log('\n' + label + ': KEINE Treffer.');
      return;
    }
    console.log('\n========================================================');
    console.log(label + ' Treffer (' + cases.length + '):');
    console.log('========================================================');
    cases.forEach((c, i) => {
      console.log('  [' + (i+1) + '] ' + c.analysisName);
      console.log('       Klausel #' + c.clauseIdx + ' [' + c.category + '] "' + c.title + '"');
      console.log('       Original ' + c.origLen + ' chars → Optimiert ' + c.optLen + ' chars (' + c.ratio + ' Verhältnis)');
      console.log('       Header-Indicators gefunden: ' + c.indicators + ' (Steuer-Nr/USt-Id/HRB/IBAN/BIC/Bank/GF/AG/Telefax/HR/Sparkasse)');
      console.log('       Original-Vorschau: "' + c.origPreview + '..."');
      console.log('');
    });
  }

  dumpCases('V1 (LIBERAL)', v1Cases);
  dumpCases('V2 (MITTEL)', v2Cases);
  dumpCases('V3 (STRENG mit Header-Indicators)', v3Cases);

  console.log('\n========================================================');
  console.log('EMPFEHLUNG:');
  console.log('========================================================');
  console.log('Sicherste Variante = die mit den wenigsten "Echte-Klausel-Treffern"');
  console.log('Eine "echte Klausel" ist eine wo Header-Indicators < 3 ist.');
  let v1Risk = v1Cases.filter(c => c.indicators < 3).length;
  let v2Risk = v2Cases.filter(c => c.indicators < 3).length;
  let v3Risk = v3Cases.filter(c => c.indicators < 3).length;
  console.log('  V1 fängt ' + v1Risk + ' echte Klauseln aus Versehen');
  console.log('  V2 fängt ' + v2Risk + ' echte Klauseln aus Versehen');
  console.log('  V3 fängt ' + v3Risk + ' echte Klauseln aus Versehen (sollte 0 sein)');

  await mongoose.disconnect();
}

run().catch(err => { console.error('Fehler:', err.message); console.error(err.stack); mongoose.disconnect().catch(()=>{}); process.exit(1); });

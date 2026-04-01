require('dotenv').config();
const database = require('../config/database');

(async () => {
  const db = await database.connect();

  // 1. What contracts does the Radar match against?
  const LegalPulseV2Result = require('../models/LegalPulseV2Result');
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGO_URI);

  const v2Results = await LegalPulseV2Result.find({ status: 'completed' })
    .sort({ createdAt: -1 }).lean();

  // Deduplicate by contractId
  const seen = new Set();
  const contracts = [];
  for (const r of v2Results) {
    if (!seen.has(r.contractId)) {
      seen.add(r.contractId);
      contracts.push({
        contractId: r.contractId,
        name: r.context?.contractName || r.contractId,
        type: r.document?.contractType || r.context?.contractType || 'unknown',
        findings: (r.clauseFindings || []).length,
        clauses: (r.clauses || []).length,
      });
    }
  }

  console.log('=== V2 VERTRÄGE (Radar-Targets) ===');
  for (const c of contracts) {
    console.log(`  ${c.type.padEnd(25)} | ${c.findings} findings | ${c.clauses} clauses | ${c.name}`);
  }
  const contractTypes = contracts.map(c => c.type.toLowerCase());
  console.log('\nContract Types:', contractTypes.join(', '));

  // 2. Last 50 processed laws — what did the Radar actually look at?
  const processedLaws = await db.collection('laws').find({
    pulseV2Processed: true,
  }).sort({ pulseV2ProcessedAt: -1 }).limit(50).toArray();

  console.log('\n=== LETZTE 50 VERARBEITETE LAWS ===');

  // Categorize relevance
  const RELEVANT_KEYWORDS = {
    factoring: /factoring|forderung(s|en|skauf|sabtretung)|abtretung|delkredere|zession|veritätshaftung|ankaufsfaktor|forderungskauf/i,
    versicherung: /versicherung|vvg|prämie|deckung|police|tarif|versicherer|versicherungsnehmer|rechtsschutz|haftpflicht|schadenfall|selbstbeteiligung/i,
    zahlungen: /zahlung(s|en|sziel|sfrist)|zahlungsverzug|mahnung|verzugszins|inkasso|fälligkeit|liquidität/i,
    haftung: /haftung(s|en|sbeschränkung|sausschluss)|schadensersatz|gewährleistung|garantie|mängel/i,
    bgb_allgemein: /§\s*(305|307|308|309|310)\s*bgb|agb|klauselkontrolle|transparenzgebot/i,
    datenschutz: /dsgvo|datenschutz|personenbezogen|auftragsverarbeitung/i,
  };

  let relevantCount = 0;
  let irrelevantCount = 0;
  const relevantLaws = [];

  for (const law of processedLaws) {
    const text = `${law.title || ''} ${law.summary || law.text || ''}`;
    const area = law.area || 'unknown';
    const areas = (law.areas || []).join(', ') || area;

    let matchedKeywords = [];
    for (const [category, pattern] of Object.entries(RELEVANT_KEYWORDS)) {
      if (pattern.test(text)) {
        matchedKeywords.push(category);
      }
    }

    const isRelevant = matchedKeywords.length > 0;
    if (isRelevant) {
      relevantCount++;
      relevantLaws.push({ law, matchedKeywords });
    } else {
      irrelevantCount++;
    }

    const marker = isRelevant ? '🟢' : '⚪';
    const keywords = matchedKeywords.length > 0 ? ` [${matchedKeywords.join(', ')}]` : '';
    console.log(`  ${marker} [${(law.lawStatus || '?').padEnd(15)}] ${areas.padEnd(25)} | ${(law.title || '').substring(0, 90)}${keywords}`);
  }

  console.log(`\n  Relevant: ${relevantCount}/${processedLaws.length} (${Math.round(relevantCount/processedLaws.length*100)}%)`);
  console.log(`  Irrelevant: ${irrelevantCount}/${processedLaws.length}`);

  // 3. Show relevant laws in detail
  if (relevantLaws.length > 0) {
    console.log('\n=== RELEVANTE LAWS (Detail) ===');
    for (const { law, matchedKeywords } of relevantLaws) {
      console.log(`\n  ${law.title}`);
      console.log(`  Area: ${law.area} | Status: ${law.lawStatus} | Keywords: ${matchedKeywords.join(', ')}`);
      console.log(`  Summary: ${(law.summary || law.text || '').substring(0, 250)}`);
      console.log(`  → Sollte matchen mit: ${matchedKeywords.includes('factoring') ? 'Factoring' : ''} ${matchedKeywords.includes('versicherung') ? 'Versicherung' : ''} ${matchedKeywords.some(k => ['zahlungen', 'haftung', 'bgb_allgemein', 'datenschutz'].includes(k)) ? '(breit relevant)' : ''}`);
    }
  }

  // 4. Check UNPROCESSED laws for relevance too
  const unprocessedLaws = await db.collection('laws').find({
    pulseV2Processed: { $ne: true },
  }).sort({ updatedAt: -1 }).limit(50).toArray();

  let unprocessedRelevant = 0;
  console.log('\n=== UNPROCESSED LAWS: Relevanz-Check (Top 50) ===');
  for (const law of unprocessedLaws) {
    const text = `${law.title || ''} ${law.summary || law.text || ''}`;
    let matchedKeywords = [];
    for (const [category, pattern] of Object.entries(RELEVANT_KEYWORDS)) {
      if (pattern.test(text)) matchedKeywords.push(category);
    }
    if (matchedKeywords.length > 0) {
      unprocessedRelevant++;
      console.log(`  🟢 [${law.lawStatus || '?'}] ${law.area} | ${(law.title || '').substring(0, 90)} [${matchedKeywords.join(', ')}]`);
    }
  }
  console.log(`\n  Relevant: ${unprocessedRelevant}/${unprocessedLaws.length} unprocessed laws`);

  // 5. Area distribution of ALL recent laws
  const areaStats = await db.collection('laws').aggregate([
    { $match: { updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
    { $group: { _id: '$area', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();

  console.log('\n=== AREA VERTEILUNG (letzte 7 Tage) ===');
  for (const a of areaStats) {
    console.log(`  ${String(a.count).padStart(4)} ${a._id || '(null)'}`);
  }

  process.exit(0);
})();

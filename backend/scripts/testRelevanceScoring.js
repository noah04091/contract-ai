require('dotenv').config();
const database = require('../config/database');
const mongoose = require('mongoose');
const LegalPulseV2Result = require('../models/LegalPulseV2Result');

// Mirror the EXACT scoring logic from pulseV2Radar.js
const NOISE_PATTERNS = [
  // Parliamentary / procedural
  /protokoll\s+der\s+\d+\.\s+sitzung/i,
  /tagesordnungspunkt|^top\s+\d/i,
  /drucksache\s+\d+\/\d+/i,
  /kleine\s+anfrage|große\s+anfrage/i,
  /beschlussempfehlung\s+und\s+bericht/i,
  /^21\/\d+:/i,
  // Energy / infrastructure
  /ausschreibung.*(wind|solar|biomasse|netz)/i,
  /netzausbau|stromtrasse|genehmigt.*trasse/i,
  /smart\s*meter|rollout/i,
  /überzeichnung.*ausschreibung/i,
  /höchstwerte.*ausschreibung/i,
  /lieferantenwechsel/i,
  /infrastrukturgebiet/i,
  // EU noise
  /^OJ:L:\d{4}:\d+/i,
  /amtsblatt\s+der\s+europäischen\s+union/i,
  // Criminal law
  /strafbarkeit|strafgesetzbuch|strafrecht/i,
  /strafsenat|strafkammer/i,
  /\d+\s+StR\s+\d+/i,
  /\d+\s+ARs\s+\d+/i,
  /genitalverstümmelung|todesstrafe|deepfake/i,
  // Political / administrative noise
  /fortschrittsbericht\s+\d{4}/i,
  /normenkontrolle.*bundesverfassungsgericht/i,
  /pilotprojekt.*simulation/i,
  /wissenschaftliche.*arbeitskreis/i,
  /neue\s+mitglieder.*berufen/i,
  /transparenzbericht.*terroris/i,
  /klage\s+der\s+afd|allianz\s+gegen\s+rechtsextremismus/i,
  /spritpreis|kraftstoffpreis|elektrokleinstfahrzeug/i,
  /sondervermögen\s+(infrastruktur|bundeswehr)/i,
  /boykottmaßnahmen/i,
  // Political slogans / coalition programs
  /für\s+gute\s+arbeit\s+und\s+faire/i,
  /koalitionsvertrag|regierungsprogramm|wahlprogramm/i,
  // Military / defense
  /wehrdienstsenat|truppendienstgericht|soldatengesetz/i,
  // Administrative / internal notices
  /technischer\s+fehler|newsletterversand/i,
  /arbeitsmarkt\s+(zeigt|bericht|statistik|daten)/i,
  // Regulatory body procedural
  /bundesnetzagentur\s+(leitet|stellt|benennt|begrüßt|veröffentlicht|sieht)/i,
];

const AREA_TO_CONTRACT_TYPES = {
  datenschutz: ["saas", "hosting", "dienstleistung", "arbeitsvertrag", "freelancer"],
  dsgvo: ["saas", "hosting", "dienstleistung", "arbeitsvertrag", "freelancer"],
  arbeitsrecht: ["arbeitsvertrag"],
  mietrecht: ["mietvertrag", "pachtvertrag"],
  kaufrecht: ["kaufvertrag", "factoring", "leasing"],
  handelsrecht: ["dienstleistung", "saas", "hosting", "factoring", "handelsvertreter", "franchisevertrag", "rahmenvertrag"],
  verbraucherschutz: ["saas", "hosting", "versicherung", "leasing", "darlehen", "maklervertrag"],
  verbraucherrecht: ["saas", "hosting", "versicherung", "leasing", "darlehen", "maklervertrag"],
  steuerrecht: ["dienstleistung", "freelancer", "gesellschaftsvertrag"],
  it_recht: ["saas", "hosting", "lizenz"],
  wettbewerbsrecht: ["nda", "freelancer", "handelsvertreter", "franchisevertrag"],
  versicherungsrecht: ["versicherung"],
  gesellschaftsrecht: ["gesellschaftsvertrag", "dienstleistung"],
  vertragsrecht: ["saas", "hosting", "dienstleistung", "freelancer", "rahmenvertrag", "kaufvertrag", "versicherung", "mietvertrag", "arbeitsvertrag", "darlehen"],
  urheberrecht: ["freelancer", "nda", "lizenz"],
  bankrecht: ["darlehen", "factoring", "buergschaft", "leasing"],
  bgb: ["mietvertrag", "kaufvertrag", "dienstleistung", "darlehen", "buergschaft", "pachtvertrag", "maklervertrag"],
  hgb: ["handelsvertreter", "kaufvertrag", "factoring", "gesellschaftsvertrag", "franchisevertrag"],
  baurecht: ["bauvertrag"],
  energierecht: ["dienstleistung", "rahmenvertrag", "kaufvertrag"],
  telekommunikationsrecht: ["saas", "hosting", "dienstleistung", "rahmenvertrag"],
  transportrecht: ["dienstleistung", "rahmenvertrag", "kaufvertrag"],
  medienrecht: ["lizenz", "freelancer", "dienstleistung"],
  umweltrecht: ["bauvertrag", "pachtvertrag", "kaufvertrag"],
  sozialrecht: ["arbeitsvertrag"],
  patentrecht: ["lizenz", "nda", "franchisevertrag"],
  markenrecht: ["lizenz", "nda", "franchisevertrag"],
  insolvenzrecht: ["darlehen", "buergschaft", "factoring", "leasing"],
  verwaltungsrecht: ["bauvertrag", "dienstleistung"],
  verfassungsrecht: ["arbeitsvertrag", "mietvertrag", "dienstleistung"],
  eu_recht: ["saas", "hosting", "dienstleistung", "freelancer", "lizenz", "nda", "arbeitsvertrag"],
  finanzrecht: ["darlehen", "factoring", "buergschaft", "leasing", "versicherung"],
  regulierung: ["saas", "hosting", "dienstleistung", "rahmenvertrag"],
  gesetzgebung: ["saas", "hosting", "dienstleistung", "freelancer", "rahmenvertrag", "kaufvertrag", "arbeitsvertrag"],
  rechtsnews: ["saas", "hosting", "dienstleistung", "freelancer", "rahmenvertrag", "kaufvertrag"],
  bundesrecht: ["saas", "hosting", "dienstleistung", "freelancer", "rahmenvertrag", "kaufvertrag", "arbeitsvertrag", "mietvertrag"],
  sonstiges: ["dienstleistung", "kaufvertrag", "rahmenvertrag"],
};

const CONTRACT_RELEVANCE_KEYWORDS = {
  versicherung: /versicherung|vvg|prämie|deckung|police|versicherer|versicherungsnehmer|rechtsschutz|haftpflicht|schadenfall|selbstbeteiligung|obliegenheit|tarif/i,
  mietvertrag: /miet(recht|vertrag|erhöhung|spiegel|preisbremse)|vermieter|mieter|nebenkosten|kaution|eigenbedarf|wohnung|mietrückstand|indexmiete|staffelmiete|schönheitsreparatur/i,
  arbeitsvertrag: /arbeit(s|nehmer|geber|srecht|svertrag|szeit)|kündigung(sschutz|sfrist)|betriebsrat|tarifvertrag|mindestlohn|teilzeit|probezeit|urlaubsanspruch|überstunden|elternzeit|entgeltfortzahlung/i,
  freelancer: /freiberuf|werkvertrag|dienstvertrag|honorar|scheinselbständig|solo-selbständig|auftragnehmer|vergütung|nutzungsrecht|urheberrecht/i,
  werkvertrag: /werkvertrag|bauvertrag|abnahme|mängel(recht|haftung|anspruch)|nacherfüllung|gewährleistung|hoai|bauordnung|vob|werkleistung|subunternehmer/i,
  dienstleistung: /dienstleistung|dienstvertrag|vergütung|haftung|gewährleistung|auftragsverarbeitung/i,
  saas: /saas|software|cloud|hosting|verfügbarkeit|sla|service.level|api|datenschutz|auftragsverarbeitung|it-sicherheit|cyber/i,
  factoring: /factoring|forderung(s|en|skauf|sabtretung)|abtretung|delkredere|zession|veritätshaftung|ankaufsfaktor/i,
  darlehen: /darlehen|kredit|zinssatz|tilgung|sondertilgung|bereitstellungszins|verbraucherdarlehen/i,
  kaufvertrag: /kauf(recht|vertrag|preis)|gewährleistung|sachmangel|nacherfüllung|mangel(recht|haftung)|rücktritt/i,
  nda: /geheimhaltung|vertraulich|geschäftsgeheimnis|verschwiegenheit|nda|geschgehg/i,
};

const IMPACT_BOOST_PATTERN = /unwirksam|verpflichtend|in\s*kraft|rechtswidrig|verboten|pflicht|frist|neue.*anforderung|änderung|novelle|reform|richtlinie|verordnung/i;

const BROAD_AREAS = new Set([
  "vertragsrecht", "bgb", "hgb", "handelsrecht",
  "gesetzgebung", "rechtsnews", "bundesrecht", "sonstiges",
  "verwaltungsrecht", "verfassungsrecht", "sozialrecht",
]);

function isNoiseLaw(law) {
  const title = (law.title || "").trim();
  if (title.length < 15) return true;
  return NOISE_PATTERNS.some((p) => p.test(title));
}

// Returns { score, breakdown } for debugging
function scoreLawRelevance(law, activeContractTypes) {
  const text = `${law.title || ""} ${(law.summary || law.text || "").substring(0, 500)}`;
  let areaScore = 0;
  let keywordScore = 0;
  let impactScore = 0;
  let statusScore = 0;
  let recencyScore = 0;
  const matchedAreas = [];
  const matchedKeywords = [];

  // 1. Area match — specific areas strong, broad areas weak
  const lawAreas = [law.area, ...(law.areas || [])].filter(Boolean).map((a) => a.toLowerCase().replace(/-/g, "_"));
  for (const area of lawAreas) {
    const mappedTypes = AREA_TO_CONTRACT_TYPES[area] || [];
    const overlap = mappedTypes.filter((t) => activeContractTypes.some((ct) => ct.includes(t) || t.includes(ct)));
    if (overlap.length > 0) {
      if (BROAD_AREAS.has(area)) {
        areaScore += 5;
        matchedAreas.push(`${area}(broad:+5)`);
      } else {
        const pts = 15 + Math.min(overlap.length * 5, 15);
        areaScore += pts;
        matchedAreas.push(`${area}(+${pts})`);
      }
    }
  }

  // 2. Keyword match
  for (const [contractType, pattern] of Object.entries(CONTRACT_RELEVANCE_KEYWORDS)) {
    if (activeContractTypes.some((ct) => ct.includes(contractType) || contractType.includes(ct))) {
      if (pattern.test(text)) {
        keywordScore += 30;
        matchedKeywords.push(contractType);
      }
    }
  }

  // 3. Impact word boost
  if (IMPACT_BOOST_PATTERN.test(text)) impactScore = 15;

  // 4. Law status boost
  const statusBoost = { effective: 20, passed: 15, court_decision: 10, guideline: 5, proposal: 3 };
  statusScore = statusBoost[law.lawStatus] || 0;

  // 5. Recency boost
  if (law.updatedAt) {
    const ageHours = (Date.now() - new Date(law.updatedAt).getTime()) / (1000 * 60 * 60);
    recencyScore = Math.max(0, Math.round(10 - ageHours / 24));
  }

  const total = areaScore + keywordScore + impactScore + statusScore + recencyScore;
  return {
    score: total,
    breakdown: { area: areaScore, keyword: keywordScore, impact: impactScore, status: statusScore, recency: recencyScore },
    matchedAreas,
    matchedKeywords,
  };
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = await database.connect();

  // Get contract types
  const contractTypes = await LegalPulseV2Result.distinct("document.contractType", { status: "completed" });
  const activeTypes = contractTypes
    .filter(Boolean)
    .map((t) => t.toLowerCase().replace(/[-\s]+(vertrag|rahmenvertrag|vereinbarung)/g, "").replace(/[^a-zäöü]/g, ""));
  console.log('Active contract types:', activeTypes.join(', '));

  // Get all unprocessed laws from last 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const allLaws = await db.collection('laws').find({
    updatedAt: { $gte: since },
    pulseV2Processed: { $ne: true },
  }).sort({ updatedAt: -1 }).limit(200).toArray();

  console.log(`\nTotal unprocessed laws (7d): ${allLaws.length}`);

  // Noise filter
  const filtered = allLaws.filter((law) => !isNoiseLaw(law));
  console.log(`After noise filter: ${filtered.length} (${allLaws.length - filtered.length} removed)`);

  // Score with breakdown
  const scored = filtered.map((law) => {
    const result = scoreLawRelevance(law, activeTypes);
    return { law, ...result };
  });
  scored.sort((a, b) => b.score - a.score);

  const MIN_RELEVANCE_SCORE = 30;
  const MAX_PER_AREA = 4;

  const withScore = scored.filter((s) => s.score > 0);
  const zeroScore = scored.filter((s) => s.score === 0);
  const aboveThreshold = scored.filter((s) => s.score >= MIN_RELEVANCE_SCORE);
  console.log(`With score > 0: ${withScore.length}`);
  console.log(`With score = 0: ${zeroScore.length}`);
  console.log(`Above threshold (>=${MIN_RELEVANCE_SCORE}): ${aboveThreshold.length}`);

  // Score distribution
  const ranges = { '80+': 0, '60-79': 0, '40-59': 0, '30-39': 0, '20-29': 0, '1-19': 0, '0': 0 };
  for (const s of scored) {
    if (s.score >= 80) ranges['80+']++;
    else if (s.score >= 60) ranges['60-79']++;
    else if (s.score >= 40) ranges['40-59']++;
    else if (s.score >= 30) ranges['30-39']++;
    else if (s.score >= 20) ranges['20-29']++;
    else if (s.score >= 1) ranges['1-19']++;
    else ranges['0']++;
  }
  console.log('\nScore distribution:');
  for (const [range, count] of Object.entries(ranges)) {
    const bar = '█'.repeat(Math.min(count, 50));
    const marker = range === '1-19' || range === '20-29' || range === '0' ? ' (below threshold)' : '';
    console.log(`  ${range.padStart(5)}: ${String(count).padStart(3)} ${bar}${marker}`);
  }

  // Apply diversity filter (same logic as production)
  const topItems = [];
  const areaCounts = {};
  for (const item of aboveThreshold) {
    if (topItems.length >= 25) break;
    const primaryArea = (item.law.area || 'unknown').toLowerCase();
    areaCounts[primaryArea] = (areaCounts[primaryArea] || 0) + 1;
    if (areaCounts[primaryArea] <= MAX_PER_AREA) {
      topItems.push(item);
    }
  }

  // Show selected items (what GPT would see)
  console.log(`\n=== SELECTED FOR GPT (${topItems.length} laws, threshold>=${MIN_RELEVANCE_SCORE}, max ${MAX_PER_AREA}/area) ===`);
  for (const { law, score, breakdown, matchedAreas, matchedKeywords } of topItems) {
    const areas = (law.areas || [law.area]).join(', ');
    const bk = `A:${breakdown.area} K:${breakdown.keyword} I:${breakdown.impact} S:${breakdown.status} R:${breakdown.recency}`;
    console.log(`  [${String(score).padStart(3)}] ${bk} | ${areas.padEnd(25)} | ${(law.title || '').substring(0, 80)}`);
    if (matchedKeywords.length > 0) {
      console.log(`         Keywords: ${matchedKeywords.join(', ')}`);
    }
  }

  // Area diversity stats
  console.log('\n  Area diversity:');
  for (const [area, count] of Object.entries(areaCounts).sort((a, b) => b[1] - a[1])) {
    const capped = count > MAX_PER_AREA ? ` (capped from ${count})` : '';
    console.log(`    ${area.padEnd(25)} ${Math.min(count, MAX_PER_AREA)}${capped}`);
  }

  // Show what was skipped by threshold
  const belowThresholdItems = scored.filter((s) => s.score > 0 && s.score < MIN_RELEVANCE_SCORE);
  if (belowThresholdItems.length > 0) {
    console.log(`\n=== BELOW THRESHOLD (${belowThresholdItems.length} laws, score < ${MIN_RELEVANCE_SCORE}, showing 10) ===`);
    for (const { law, score, breakdown } of belowThresholdItems.slice(0, 10)) {
      const areas = (law.areas || [law.area]).join(', ');
      const bk = `A:${breakdown.area} K:${breakdown.keyword} I:${breakdown.impact}`;
      console.log(`  [${String(score).padStart(3)}] ${bk} | ${areas.padEnd(25)} | ${(law.title || '').substring(0, 80)}`);
    }
  }

  // Show noise examples
  const noise = allLaws.filter(isNoiseLaw).slice(0, 10);
  if (noise.length > 0) {
    console.log('\n=== NOISE EXAMPLES (filtered out) ===');
    for (const law of noise) {
      console.log(`  ❌ ${(law.title || '').substring(0, 100)}`);
    }
  }

  // Show score 0 examples
  if (zeroScore.length > 0) {
    console.log(`\n=== SCORE=0 EXAMPLES (${zeroScore.length} total, showing 10) ===`);
    for (const { law } of zeroScore.slice(0, 10)) {
      console.log(`  ⚪ [${law.area}] ${(law.title || '').substring(0, 100)}`);
    }
  }

  process.exit(0);
})();

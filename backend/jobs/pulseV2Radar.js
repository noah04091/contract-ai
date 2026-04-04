/**
 * Legal Pulse V2 Radar — Legal Source Monitoring
 *
 * Bridges V1 legal monitoring (RSS feeds, vector matching) with V2 pipeline.
 * Detects new laws/rulings/guidelines and matches them against user contracts
 * that have V2 analysis results.
 *
 * Flow:
 *   1. Fetch recent law changes from `laws` collection (synced by V1 RSS cron)
 *   2. For each law change, find V2-analyzed contracts that may be affected
 *   3. Use GPT-4o-mini to assess actual impact on specific contract findings
 *   4. Store alerts in `pulse_v2_legal_alerts` collection
 *   5. Queue consolidated email notifications
 *
 * Schedule: Mondays 05:30 UTC (after V1 RSS sync at 03:15, before digest at 08:10)
 * Limits: max 10 law changes per run, max 50 contract matches
 */

const OpenAI = require("openai");
const LegalPulseV2Result = require("../models/LegalPulseV2Result");
const { queueEmail } = require("../services/emailRetryService");
const {
  generateEmailTemplate,
  generateEventCard,
  generateStatsRow,
  generateParagraph,
  generateDivider,
} = require("../utils/emailTemplate");

// B3: Lazy-load vector services for semantic matching (fail-safe)
let _vectorStore = null;
let _lawEmbeddings = null;
async function getVectorStore() {
  if (!_vectorStore) {
    try {
      const VectorStore = require("../services/vectorStore");
      _vectorStore = new VectorStore();
      await _vectorStore.init();
    } catch (err) {
      console.warn("[PulseV2Radar] VectorStore not available:", err.message);
      _vectorStore = false; // Mark as unavailable
    }
  }
  return _vectorStore || null;
}
function getLawEmbeddings() {
  if (!_lawEmbeddings) {
    try {
      const { getInstance } = require("../services/lawEmbeddings");
      _lawEmbeddings = getInstance();
    } catch (err) {
      console.warn("[PulseV2Radar] LawEmbeddings not available:", err.message);
      _lawEmbeddings = false;
    }
  }
  return _lawEmbeddings || null;
}

const MAX_LAW_CHANGES = 25;
const MAX_CONTRACT_MATCHES = 150;
const IMPACT_CONFIDENCE_THRESHOLD = 60;
const MIN_RELEVANCE_SCORE = 30; // Laws below this score are skipped (no keyword match, no specific area)
const MAX_PER_AREA = 4; // Diversity: max laws from same primary area in top 25
const MAX_ALERTS_PER_USER = 3; // Safety: prevent alert spam per radar run

// Legal area → contract type mapping for fast pre-filtering.
// IMPORTANT: Areas NOT listed here will be SKIPPED (no broad match).
// This prevents mass false alerts from unmapped legal areas.
// To add coverage for new areas, add them here with specific contract types.
const AREA_TO_CONTRACT_TYPES = {
  // Core legal areas → contract types
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
  // Financial law areas
  bankrecht: ["darlehen", "factoring", "buergschaft", "leasing"],
  bgb: ["mietvertrag", "kaufvertrag", "dienstleistung", "darlehen", "buergschaft", "pachtvertrag", "maklervertrag"],
  hgb: ["handelsvertreter", "kaufvertrag", "factoring", "gesellschaftsvertrag", "franchisevertrag"],
  baurecht: ["bauvertrag"],
  // Extended legal areas (A2)
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
  // EU & regulatory areas (C1/C2)
  eu_recht: ["saas", "hosting", "dienstleistung", "freelancer", "lizenz", "nda", "arbeitsvertrag"],
  finanzrecht: ["darlehen", "factoring", "buergschaft", "leasing", "versicherung"],
  regulierung: ["saas", "hosting", "dienstleistung", "rahmenvertrag"],
  // Feed categories that leak through as areas (fallback from rssService)
  gesetzgebung: ["saas", "hosting", "dienstleistung", "freelancer", "rahmenvertrag", "kaufvertrag", "arbeitsvertrag"],
  rechtsnews: ["saas", "hosting", "dienstleistung", "freelancer", "rahmenvertrag", "kaufvertrag"],
  bundesrecht: ["saas", "hosting", "dienstleistung", "freelancer", "rahmenvertrag", "kaufvertrag", "arbeitsvertrag", "mietvertrag"],
  // Catch broader areas
  sonstiges: ["dienstleistung", "kaufvertrag", "rahmenvertrag"],
};

/**
 * Main radar entry point.
 * @param {import('mongodb').Db} db
 * @param {object} [options]
 * @param {string} [options.userId] - If set, only match contracts for this user (admin test mode)
 */
async function runPulseV2Radar(db, options = {}) {
  const scopeLabel = options.userId ? ` (scoped to user ${options.userId})` : "";
  console.log(`[PulseV2Radar] Starting legal source scan...${scopeLabel}`);
  const startTime = Date.now();

  // Ensure unique index to prevent duplicate alerts (idempotent)
  // Uses lawId (stable ObjectId) instead of lawTitle (can change with rewording)
  await db.collection("pulse_v2_legal_alerts").createIndex(
    { userId: 1, lawId: 1, contractId: 1 },
    { unique: true, background: true }
  );

  // 1. Find recent law changes (from V1 RSS sync)
  const lawChanges = await fetchRecentLawChanges(db);
  if (lawChanges.length === 0) {
    console.log("[PulseV2Radar] No new law changes found. Done.");
    return { lawChanges: 0, contractsMatched: 0, alertsSent: 0 };
  }
  console.log(`[PulseV2Radar] ${lawChanges.length} law changes to process`);

  // 2. Process each law change
  let totalMatches = 0;
  let totalAlerts = 0;
  const userAlerts = new Map(); // userId → [{ lawChange, contracts }]

  for (const law of lawChanges) {
    if (totalMatches >= MAX_CONTRACT_MATCHES) break;

    const matches = await matchLawToContracts(db, law, options);
    if (matches.length === 0) continue;

    // 3. Assess impact with AI
    const confirmedImpacts = await assessImpact(law, matches);
    totalMatches += matches.length;

    // Group by user
    for (const impact of confirmedImpacts) {
      if (!userAlerts.has(impact.userId)) {
        userAlerts.set(impact.userId, []);
      }
      userAlerts.get(impact.userId).push({
        lawChange: law,
        contractId: impact.contractId,
        contractName: impact.contractName,
        impactSummary: impact.summary,
        plainSummary: impact.plainSummary || "",
        businessImpact: impact.businessImpact || "",
        severity: impact.severity,
        impactDirection: impact.impactDirection || "negative",
        recommendation: impact.recommendation,
        affectedClauseIds: impact.affectedClauseIds,
        clauseImpacts: impact.clauseImpacts,
      });
      totalAlerts++;
    }
  }

  // 4. Store alerts + send emails (with per-user cap to prevent spam)
  let cappedCount = 0;
  for (const [userId, alerts] of userAlerts.entries()) {
    if (alerts.length > MAX_ALERTS_PER_USER) {
      // Keep highest severity first, then by confidence
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      alerts.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));
      const capped = alerts.slice(0, MAX_ALERTS_PER_USER);
      const dropped = alerts.length - capped.length;
      cappedCount += dropped;
      console.log(`[PulseV2Radar] Alert cap: user ${userId} has ${alerts.length} alerts, keeping top ${MAX_ALERTS_PER_USER} (dropped ${dropped} lower-priority)`);
      await storeAndNotify(db, userId, capped);
    } else {
      await storeAndNotify(db, userId, alerts);
    }
  }

  // 5. Mark processed law changes
  const lawIds = lawChanges.map((l) => l._id);
  await db.collection("laws").updateMany(
    { _id: { $in: lawIds } },
    { $set: { pulseV2Processed: true, pulseV2ProcessedAt: new Date() } }
  );

  const duration = Date.now() - startTime;

  // D5: Track run history for trend analysis
  let positiveAlertCount = 0;
  let negativeAlertCount = 0;
  for (const [, alerts] of userAlerts.entries()) {
    for (const a of alerts) {
      if (a.impactDirection === "positive") positiveAlertCount++;
      else negativeAlertCount++;
    }
  }

  try {
    await db.collection("radar_run_history").insertOne({
      runAt: new Date(),
      lawChanges: lawChanges.length,
      contractsMatched: totalMatches,
      alertsSent: totalAlerts,
      alertsCapped: cappedCount,
      positiveAlerts: positiveAlertCount,
      negativeAlerts: negativeAlertCount,
      usersNotified: userAlerts.size,
      durationMs: duration,
      scoped: !!options.userId,
    });
  } catch (histErr) {
    console.warn("[PulseV2Radar] Failed to write run history:", histErr.message);
  }

  console.log(
    `[PulseV2Radar] Done. ${lawChanges.length} laws, ${totalMatches} matches, ${totalAlerts} alerts (${positiveAlertCount} pos, ${negativeAlertCount} neg${cappedCount > 0 ? `, ${cappedCount} capped` : ""}), ${userAlerts.size} users. ${Math.round(duration / 1000)}s`
  );

  return { lawChanges: lawChanges.length, contractsMatched: totalMatches, alertsSent: totalAlerts, alertsCapped: cappedCount, positiveAlerts: positiveAlertCount, negativeAlerts: negativeAlertCount, usersNotified: userAlerts.size, durationMs: duration };
}

// ═══════════════════════════════════════════════════
// NOISE FILTER — skip laws that are never contract-relevant
// ═══════════════════════════════════════════════════
const NOISE_PATTERNS = [
  // Parliamentary / procedural
  /protokoll\s+der\s+\d+\.\s+sitzung/i,
  /tagesordnungspunkt|^top\s+\d/i,
  /drucksache\s+\d+\/\d+/i,
  /kleine\s+anfrage|große\s+anfrage/i,
  /beschlussempfehlung\s+und\s+bericht/i,
  /^21\/\d+:/i, // Bundestag Drucksachen
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
  // Criminal law (never relevant for contracts)
  /strafbarkeit|strafgesetzbuch|strafrecht/i,
  /strafsenat|strafkammer/i,
  /\d+\s+StR\s+\d+/i, // Criminal case numbers (2 StR 365/25)
  /\d+\s+ARs\s+\d+/i, // Criminal referral numbers
  /genitalverstümmelung|todesstrafe|deepfake/i,
  // Political / administrative noise
  /fortschrittsbericht\s+\d{4}/i,
  /normenkontrolle.*bundesverfassungsgericht/i,
  /normenkontrolle.*sondervermögen/i,
  /pilotprojekt.*simulation/i,
  /wissenschaftliche.*arbeitskreis/i,
  /neue\s+mitglieder.*berufen/i,
  /transparenzbericht.*terroris/i,
  /klage\s+der\s+afd|allianz\s+gegen\s+rechtsextremismus/i,
  /spritpreis|kraftstoffpreis|elektrokleinstfahrzeug/i,
  /sondervermögen\s+(infrastruktur|bundeswehr)/i,
  /boykottmaßnahmen/i,
  // Bundestag Kleine Anfragen (political statistics, not law changes)
  /^(daten|zahlen|erkenntnisse|angaben|informationen)\s+(zu|zum|zur|über)\s/i,
  /^sorge-\s*und\s*umgangsrecht/i,
  /gesundheitsbezogene\s+fehlinformation/i,
  /^afd\s+fordert/i,
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

function isNoiseLaw(law) {
  const title = (law.title || "").trim();
  if (title.length < 15) return true;
  return NOISE_PATTERNS.some((p) => p.test(title));
}

// ═══════════════════════════════════════════════════
// RELEVANCE SCORING — prioritize laws that match existing contracts
// ═══════════════════════════════════════════════════

// Keywords by contract type — what makes a law relevant to each type
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

// High-impact words that boost relevance regardless of contract type
const IMPACT_BOOST_PATTERN = /unwirksam|verpflichtend|in\s*kraft|rechtswidrig|verboten|pflicht|frist|neue.*anforderung|änderung|novelle|reform|richtlinie|verordnung/i;

// Broad catch-all areas that match many contract types → weak signal.
// These get minimal weight because they don't indicate specific relevance.
// "Vertragsrecht" alone maps to 10 types, inflating all scores equally.
const BROAD_AREAS = new Set([
  "vertragsrecht", "bgb", "hgb", "handelsrecht",
  "gesetzgebung", "rechtsnews", "bundesrecht", "sonstiges",
  "verwaltungsrecht", "verfassungsrecht", "sozialrecht",
]);

function scoreLawRelevance(law, activeContractTypes) {
  const text = `${law.title || ""} ${(law.summary || law.text || "").substring(0, 500)}`;
  let score = 0;

  // 1. Area match — specific areas are strong signals, broad areas are weak
  const lawAreas = [law.area, ...(law.areas || [])].filter(Boolean).map((a) => a.toLowerCase().replace(/-/g, "_"));
  for (const area of lawAreas) {
    const mappedTypes = AREA_TO_CONTRACT_TYPES[area] || [];
    const overlap = mappedTypes.filter((t) => activeContractTypes.some((ct) => ct.includes(t) || t.includes(ct)));
    if (overlap.length > 0) {
      if (BROAD_AREAS.has(area)) {
        score += 5; // Broad area: minimal signal (just confirms it's legal content)
      } else {
        score += 15 + Math.min(overlap.length * 5, 15); // Specific area: 15-30 pts
      }
    }
  }

  // 2. Keyword match — PRIMARY differentiator
  // Law text mentioning contract-specific terms is the strongest relevance signal
  for (const [contractType, pattern] of Object.entries(CONTRACT_RELEVANCE_KEYWORDS)) {
    if (activeContractTypes.some((ct) => ct.includes(contractType) || contractType.includes(ct))) {
      if (pattern.test(text)) score += 30;
    }
  }

  // 3. Impact word boost
  if (IMPACT_BOOST_PATTERN.test(text)) score += 15;

  // 4. Law status boost (in-force > passed > court_decision > proposal)
  const statusBoost = { effective: 20, passed: 15, court_decision: 10, guideline: 5, proposal: 3 };
  score += statusBoost[law.lawStatus] || 0;

  // 5. Recency boost (newer = slight boost, max 10 points)
  if (law.updatedAt) {
    const ageHours = (Date.now() - new Date(law.updatedAt).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, Math.round(10 - ageHours / 24)); // 1 point per day, max 10
  }

  return score;
}

/**
 * Fetch law changes from the last 7 days that haven't been processed by V2 yet.
 * Uses relevance scoring instead of pure chronological order:
 *   1. Fetch unprocessed laws (wider pool)
 *   2. Filter out noise (Bundestag protocols, Ausschreibungen, old EU OJ)
 *   3. Score by relevance to existing V2 contracts
 *   4. Return top MAX_LAW_CHANGES by score
 */
async function fetchRecentLawChanges(db) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. Fetch wider pool of unprocessed laws
  const candidates = await db
    .collection("laws")
    .find({
      updatedAt: { $gte: since },
      pulseV2Processed: { $ne: true },
    })
    .sort({ updatedAt: -1 })
    .limit(500) // Full 7-day pool for scoring (typically 300-500 laws/week)
    .toArray();

  if (candidates.length === 0) return [];

  // 2. Noise filter
  const filtered = candidates.filter((law) => !isNoiseLaw(law));
  const noiseCount = candidates.length - filtered.length;
  if (noiseCount > 0) {
    console.log(`[PulseV2Radar] Noise filter: ${noiseCount}/${candidates.length} laws filtered out`);
  }

  if (filtered.length === 0) return [];

  // 3. Get active contract types from V2 results
  const contractTypes = await LegalPulseV2Result.distinct("document.contractType", {
    status: "completed",
  });
  const activeTypes = contractTypes
    .filter(Boolean)
    .map((t) => t.toLowerCase().replace(/[-\s]+(vertrag|rahmenvertrag|vereinbarung)/g, "").replace(/[^a-zäöü]/g, ""));

  if (activeTypes.length === 0) {
    // No V2 contracts yet — fall back to chronological
    console.log("[PulseV2Radar] No V2 contracts for scoring, using chronological order");
    return filtered.slice(0, MAX_LAW_CHANGES);
  }

  // 4. Score and sort by relevance
  const scored = filtered.map((law) => ({
    law,
    score: scoreLawRelevance(law, activeTypes),
  }));

  scored.sort((a, b) => b.score - a.score);

  // 5. Score threshold — skip laws with no meaningful signal
  const aboveThreshold = scored.filter((s) => s.score >= MIN_RELEVANCE_SCORE);
  const belowThreshold = scored.length - aboveThreshold.length;

  // 6. Diversity filter — prevent area flooding (e.g. 10x Verwaltungsrecht)
  const topItems = [];
  const areaCounts = {};
  for (const item of aboveThreshold) {
    if (topItems.length >= MAX_LAW_CHANGES) break;
    const primaryArea = (item.law.area || "unknown").toLowerCase();
    areaCounts[primaryArea] = (areaCounts[primaryArea] || 0) + 1;
    if (areaCounts[primaryArea] <= MAX_PER_AREA) {
      topItems.push(item);
    }
  }

  console.log(`[PulseV2Radar] Relevance scoring: ${aboveThreshold.length}/${filtered.length} above threshold (>=${MIN_RELEVANCE_SCORE}), ${belowThreshold} skipped, taking ${topItems.length}`);
  if (topItems.length > 0) {
    const topScores = topItems.slice(0, 5).map((s) => `${s.score}:"${(s.law.title || "").substring(0, 50)}"`);
    console.log(`[PulseV2Radar] Top scores: ${topScores.join(" | ")}`);
  }

  return topItems.map((s) => s.law);
}

/**
 * Find V2-analyzed contracts potentially affected by a law change.
 *
 * Strategy:
 *   1. KNOWN area → fast pre-filter by contract type (cheap, no AI)
 *   2. UNKNOWN area → take a small sample of recent contracts and let AI decide
 *      (ensures no legal area is silently ignored)
 */
async function matchLawToContracts(db, lawChange, options = {}) {
  // A4: Multi-Area matching — check primary area AND all areas
  const allAreas = [
    ...(lawChange.areas || []),
    lawChange.area || "",
  ].map((a) => a.toLowerCase().replace(/-/g, "_")).filter(Boolean);
  const uniqueAreas = [...new Set(allAreas)];

  // Collect relevant contract types from ALL matched areas (union)
  const relevantTypesSet = new Set();
  for (const area of uniqueAreas) {
    const types = AREA_TO_CONTRACT_TYPES[area] || [];
    types.forEach((t) => relevantTypesSet.add(t));
  }
  const relevantTypes = [...relevantTypesSet];

  let query;
  let limit;

  if (relevantTypes.length > 0) {
    // KNOWN area(s) → fast pre-filter by contract type
    query = {
      status: "completed",
      "document.contractType": {
        $in: relevantTypes.map((t) => new RegExp(t, "i")),
      },
    };
    limit = 50;
  } else {
    // UNKNOWN area → don't skip! Take a small sample of recent contracts
    // and let the AI decide if they're affected. Conservative limit to control cost.
    const primaryArea = uniqueAreas[0] || "(empty)";
    console.log(`[PulseV2Radar] No pre-filter mapping for area "${primaryArea}" — using AI-based matching (sample of recent contracts)`);
    query = { status: "completed" };
    limit = 10; // Smaller sample for unknown areas to control AI cost
  }

  // Admin test mode: scope to specific user only
  if (options.userId) {
    query.userId = options.userId;
  }

  const results = await LegalPulseV2Result.aggregate([
    { $match: query },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { contractId: "$contractId", userId: "$userId" },
        latestResult: { $first: "$$ROOT" },
      },
    },
    { $limit: limit },
  ]);

  // B3: Semantic matching — find additional contracts via vector similarity
  let semanticResults = [];
  try {
    const vectorStore = await getVectorStore();
    const lawEmb = getLawEmbeddings();
    if (vectorStore && lawEmb) {
      // Generate embedding for the law change
      const lawText = `${lawChange.title || ""} ${lawChange.description || lawChange.summary || ""}`.trim();
      if (lawText.length > 20) {
        const embedding = await lawEmb.generateEmbedding(lawText);
        const vResults = await vectorStore.queryContracts(embedding, 20);
        // Filter by minimum similarity (distance < 0.35 = similarity > 0.65)
        const contractIds = (vResults.ids?.[0] || [])
          .map((id, idx) => ({
            id,
            distance: vResults.distances?.[0]?.[idx] || 1,
            metadata: vResults.metadatas?.[0]?.[idx] || {},
          }))
          .filter((r) => r.distance < 0.35 && r.metadata.contractId)
          .map((r) => r.metadata.contractId);

        if (contractIds.length > 0) {
          // Fetch full V2 results for semantically matched contracts
          const keywordContractIds = new Set(results.map((r) => r._id.contractId));
          const newContractIds = contractIds.filter((id) => !keywordContractIds.has(id));

          if (newContractIds.length > 0) {
            const semQuery = {
              status: "completed",
              contractId: { $in: newContractIds },
            };
            if (options.userId) semQuery.userId = options.userId;

            semanticResults = await LegalPulseV2Result.aggregate([
              { $match: semQuery },
              { $sort: { createdAt: -1 } },
              { $group: { _id: { contractId: "$contractId", userId: "$userId" }, latestResult: { $first: "$$ROOT" } } },
              { $limit: 20 },
            ]);
            if (semanticResults.length > 0) {
              console.log(`[PulseV2Radar] Semantic matching found ${semanticResults.length} additional contracts`);
            }
          }
        }
      }
    }
  } catch (semErr) {
    console.warn("[PulseV2Radar] Semantic matching failed (falling back to keyword only):", semErr.message);
  }

  // Merge keyword + semantic results, deduplicated by contract NAME
  // (not just contractId — users may upload the same file multiple times,
  //  creating different contractIds for the same document)
  const allResults = [...results, ...semanticResults];
  const seenNames = new Set();

  return allResults
    .filter((r) => {
      const name = r.latestResult.context?.contractName || r._id.contractId;
      const key = `${r._id.userId}_${name}`;
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    })
    .map((r) => ({
      userId: r._id.userId,
      contractId: r._id.contractId,
      contractName: r.latestResult.context?.contractName || r._id.contractId,
      contractType: r.latestResult.document?.contractType || "unknown",
      findings: (r.latestResult.clauseFindings || [])
        .filter((f) => f.severity === "critical" || f.severity === "high" || f.severity === "medium")
        .map((f) => ({ title: f.title, category: f.category, severity: f.severity, clauseId: f.clauseId })),
      clauses: (r.latestResult.clauses || [])
        .map((c) => ({ id: c.id, title: c.title, category: c.category })),
      scores: r.latestResult.scores,
    }));
}

/**
 * Use GPT-4o-mini to assess actual impact of a law change on matched contracts.
 * Returns only confirmed impacts above confidence threshold.
 */
async function assessImpact(lawChange, contracts) {
  if (contracts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[PulseV2Radar] No OpenAI API key — skipping AI impact assessment");
    return [];
  }

  const openai = new OpenAI({ apiKey, timeout: 45000, maxRetries: 1 });

  // Batch contracts into a single prompt for efficiency
  const contractSummaries = contracts
    .slice(0, 10)
    .map(
      (c, i) => {
        const clauseList = c.clauses.slice(0, 15).map((cl) => `  - [${cl.id}] ${cl.title} (${cl.category})`).join("\n");
        const findingList = c.findings.slice(0, 10).map((f) => `  - ${f.title} (${f.severity}, Klausel: ${f.clauseId})`).join("\n");
        return `[${i + 1}] "${c.contractName}" (${c.contractType}, Score: ${c.scores?.overall || "?"})\n` +
          `  Klauseln:\n${clauseList || "  - keine"}\n` +
          `  Befunde:\n${findingList || "  - keine"}`;
      }
    )
    .join("\n\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 2000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "impact_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              impacts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    contractIndex: { type: "number" },
                    affected: { type: "boolean" },
                    confidence: { type: "number" },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    impactDirection: { type: "string", enum: ["negative", "positive", "neutral"] },
                    summary: { type: "string" },
                    plainSummary: { type: "string" },
                    businessImpact: { type: "string" },
                    recommendation: { type: "string" },
                    affectedClauseIds: {
                      type: "array",
                      items: { type: "string" },
                    },
                    clauseImpacts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          clauseId: { type: "string" },
                          clauseTitle: { type: "string" },
                          impact: { type: "string" },
                          suggestedChange: { type: "string" },
                        },
                        required: ["clauseId", "clauseTitle", "impact", "suggestedChange"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["contractIndex", "affected", "confidence", "severity", "impactDirection", "summary", "plainSummary", "businessImpact", "recommendation", "affectedClauseIds", "clauseImpacts"],
                  additionalProperties: false,
                },
              },
            },
            required: ["impacts"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `Du bist ein deutscher Rechtsexperte der für Nicht-Juristen schreibt. Prüfe ob eine Gesetzesänderung konkrete Auswirkungen auf bestimmte Verträge hat.

KERNREGEL — RELEVANZ:
- Nur melden wenn das Gesetz den Vertrag DIREKT und KONKRET betrifft
- Wenn die Verbindung nur auf einem gemeinsamen Schlagwort basiert (z.B. beide erwähnen "Daten" aber in völlig verschiedenen Kontexten) → affected=false
- Ein Gesetz über Medizinregister betrifft KEINEN Factoring-Vertrag, auch wenn beide "Datenweitergabe" erwähnen
- Lieber 1 relevanter Alert als 10 vage — im Zweifel affected=false
- confidence >80 NUR wenn du den GENAUEN Regelungsinhalt des Gesetzes benennen kannst, der die GENAUE Klausel im Vertrag betrifft
- confidence 60-79: Vertrag ist nur indirekt oder am Rande betroffen

VERTRAGSTYP-INTELLIGENZ:
- Verstehe den Vertrag BEVOR du das Gesetz anwendest: Was ist der Geschäftszweck? Was sind die Kernmechanismen?
- Kernmechanismen eines Vertragstyps sind KEIN "Risiko" — ein Gesetz das Factoring-Abtretung reguliert betrifft zwar den Vertrag, aber die Abtretung selbst ist kein Problem
- Unterscheide: Betrifft das Gesetz eine ABWEICHUNG im Vertrag (→ echtes Risiko) oder eine STANDARDKLAUSEL (→ informativ/neutral)?
- "Nachteilig für eine Partei" ≠ "rechtswidrig" — melde affected=true NUR wenn das Gesetz konkret eine Klausel ändert/einschränkt/erweitert
- Norm-Genauigkeit: Zitiere in recommendation/clauseImpacts NUR Normen die du sicher dem Problem zuordnen kannst

AUSGABE-FELDER:
- summary: Fachliche Zusammenfassung (1-2 Sätze) — WAS genau das Gesetz ändert in Bezug auf diesen Vertrag
- plainSummary: Erkläre in EINEM einfachen Satz für einen Nicht-Juristen was sich ändert und warum es diesen Vertrag betrifft. Kein Juristendeutsch. Beispiel: "Ein neues Gesetz verkürzt die Kündigungsfrist von 3 auf 1 Monat — Ihr Mietvertrag hat noch die alte Frist."
- businessImpact: Was passiert KONKRET wenn der User NICHTS tut? Kein "könnte Auswirkungen haben" sondern z.B. "Ab 01.07.2026 ist §3 Ihres Vertrags unwirksam" oder "Keine unmittelbare Gefahr, aber bei Neuverhandlung berücksichtigen"
- severity: critical (Vertrag unwirksam/illegal), high (Klausel muss angepasst werden), medium (Prüfung empfohlen), low (informativ)
- impactDirection: "negative" (Risiko), "positive" (Chance/Vorteil), "neutral" (informativ)
- recommendation: Konkreter nächster Schritt mit Bezug auf die spezifische Klausel. NICHT "prüfen und gegebenenfalls anpassen" sondern z.B. "In §15 die Datenweitergabe auf namentlich benannte Empfänger beschränken" oder "Kündigungsfrist in §8 von 3 auf 1 Monat korrigieren"
- affectedClauseIds: EXAKTE Klausel-IDs im Format "clause_N" wie sie in eckigen Klammern [clause_N] in der Klauselliste des Vertrags stehen. NIEMALS Paragraphennummern wie "§7" verwenden — immer das ID-Format "clause_1", "clause_2" etc.
- clauseImpacts: Für JEDE betroffene Klausel: clauseId MUSS exakt das Format "clause_N" haben (wie in der Klauselliste), clauseTitle ist der Klauseltitel mit §-Nummer, impact (was genau das Problem ist), suggestedChange (konkreter Formulierungsvorschlag)
- Wenn NICHT betroffen: affected=false, confidence=0, plainSummary="", businessImpact="", affectedClauseIds=[], clauseImpacts=[]

STATUS-KONTEXT:
- "proposal": Gesetzesentwurf — noch nicht verabschiedet, Handlung vorbereiten aber nicht dringend
- "passed": Verabschiedet — Handlungsbedarf, da bald in Kraft
- "effective": Bereits in Kraft — sofortiger Handlungsbedarf
- "court_decision": Gerichtsentscheidung — Praxis könnte sich ändern, Klauseln prüfen
- "guideline": Behörden-Leitlinie — empfohlene Anpassung
- Passe severity und recommendation an den Status an (Entwurf = niedrigere severity als in Kraft)

POSITIVE ÄNDERUNGEN erkennen:
- Neue Schutzrechte, verkürzte Fristen, vereinfachte Compliance, neue Verhandlungsrechte
- Auch positive Änderungen als affected=true melden mit impactDirection="positive"
- plainSummary auch für positive: "Ein neues Gesetz gibt Ihnen das Recht, den Vertrag kostenfrei zu kündigen"`,
        },
        {
          role: "user",
          content: `GESETZESÄNDERUNG:
Titel: ${lawChange.title}
Bereich: ${lawChange.area || "unbekannt"}
Status: ${lawChange.lawStatus || "unknown"}
Beschreibung: ${lawChange.description || lawChange.summary || ""}
Quelle: ${lawChange.source || ""}

VERTRÄGE:
${contractSummaries}

Prüfe für JEDEN Vertrag ob er von dieser Änderung betroffen ist.`,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const confirmedImpacts = [];

    // Log AI decisions for debugging (especially useful when alertsSent=0)
    let borderlineCount = 0;
    let confidentCount = 0;
    for (const impact of parsed.impacts || []) {
      const contract = contracts[impact.contractIndex - 1];
      const reason = !impact.affected
        ? "not affected"
        : impact.confidence < IMPACT_CONFIDENCE_THRESHOLD
          ? `confidence too low (${impact.confidence}% < ${IMPACT_CONFIDENCE_THRESHOLD}%)`
          : "ACCEPTED";
      console.log(`[PulseV2Radar] AI decision: "${contract?.contractName || '?'}" × "${lawChange.title?.substring(0, 50)}" → ${reason}${impact.affected ? ` | severity=${impact.severity} | direction=${impact.impactDirection || "negative"} | summary="${impact.summary?.substring(0, 80)}"` : ""}`);
      if (impact.affected && impact.confidence >= IMPACT_CONFIDENCE_THRESHOLD) {
        if (impact.confidence < 75) borderlineCount++;
        else confidentCount++;
      }
    }
    if (borderlineCount > 0 || confidentCount > 0) {
      console.log(`[PulseV2Radar] Confidence distribution: ${borderlineCount} borderline (60-74%), ${confidentCount} confident (75-100%)`);
    }

    for (const impact of parsed.impacts || []) {
      if (!impact.affected) continue;
      if (impact.confidence < IMPACT_CONFIDENCE_THRESHOLD) continue;

      const contract = contracts[impact.contractIndex - 1];
      if (!contract) continue;

      // Validate clauseIds — filter out hallucinated IDs not in actual contract
      const validClauseIds = new Set(contract.clauses.map((c) => c.id));
      const validatedClauseImpacts = (impact.clauseImpacts || []).filter(
        (ci) => validClauseIds.has(ci.clauseId)
      );
      const validatedClauseIds = (impact.affectedClauseIds || []).filter(
        (id) => validClauseIds.has(id)
      );

      confirmedImpacts.push({
        userId: contract.userId,
        contractId: contract.contractId,
        contractName: contract.contractName,
        summary: impact.summary,
        plainSummary: impact.plainSummary || "",
        businessImpact: impact.businessImpact || "",
        severity: impact.severity,
        impactDirection: impact.impactDirection || "negative",
        recommendation: impact.recommendation,
        confidence: impact.confidence,
        affectedClauseIds: validatedClauseIds.slice(0, 5),
        clauseImpacts: validatedClauseImpacts.slice(0, 5),
      });
    }

    return confirmedImpacts;
  } catch (err) {
    console.error("[PulseV2Radar] AI assessment failed:", err.message);
    return [];
  }
}

/**
 * Store alerts in DB and send consolidated email to user.
 */
async function storeAndNotify(db, userId, alerts) {
  // Store in pulse_v2_legal_alerts
  const alertDocs = alerts.map((a) => ({
    userId,
    contractId: a.contractId,
    contractName: a.contractName,
    lawId: a.lawChange._id.toString(),
    lawTitle: a.lawChange.title,
    lawArea: a.lawChange.area,
    lawStatus: a.lawChange.lawStatus || "unknown",
    lawSource: a.lawChange.sourceUrl || "",
    impactSummary: a.impactSummary,
    plainSummary: a.plainSummary || "",
    businessImpact: a.businessImpact || "",
    severity: a.severity,
    impactDirection: a.impactDirection || "negative",
    recommendation: a.recommendation,
    affectedClauseIds: a.affectedClauseIds || [],
    clauseImpacts: a.clauseImpacts || [],
    status: "unread",
    createdAt: new Date(),
  }));

  // Insert with ordered:false to skip duplicates (unique index prevents re-alerts)
  try {
    await db.collection("pulse_v2_legal_alerts").insertMany(alertDocs, { ordered: false });
  } catch (err) {
    // Ignore duplicate key errors (code 11000) — means alert already exists
    if (err.code !== 11000) throw err;
    console.log(`[PulseV2Radar] ${err.writeErrors?.length || 0} duplicate alerts skipped for user ${userId}`);
  }

  // Load user for email
  const { ObjectId } = require("mongodb");
  let user;
  try {
    user = await db.collection("users").findOne(
      { $or: [{ _id: userId }, { _id: ObjectId.createFromHexString(userId) }] },
      { projection: { email: 1, name: 1, firstName: 1 } }
    );
  } catch {
    user = await db.collection("users").findOne(
      { _id: userId },
      { projection: { email: 1, name: 1, firstName: 1 } }
    );
  }

  if (!user || !user.email) return;

  const userName = user.firstName || user.name || "Nutzer";

  // Build email
  let body = generateParagraph(`Hallo ${userName},`);
  body += generateParagraph(
    `Legal Pulse Radar hat <strong>${alerts.length} Gesetzesänderung(en)</strong> erkannt, die Ihre Verträge betreffen könnten.`
  );

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const highAlerts = alerts.filter((a) => a.severity === "high");
  const positiveAlerts = alerts.filter((a) => a.impactDirection === "positive");
  const negativeAlerts = alerts.filter((a) => a.impactDirection !== "positive");

  body += generateStatsRow([
    { value: String(alerts.length), label: "Betroffene Verträge", color: "#ea580c" },
    ...(criticalAlerts.length > 0 ? [{ value: String(criticalAlerts.length), label: "Kritisch", color: "#dc2626" }] : []),
    ...(highAlerts.length > 0 ? [{ value: String(highAlerts.length), label: "Hoch", color: "#ea580c" }] : []),
    ...(positiveAlerts.length > 0 ? [{ value: String(positiveAlerts.length), label: "Chancen", color: "#059669" }] : []),
  ]);

  body += generateDivider();

  // Group alerts by law change
  const byLaw = new Map();
  for (const alert of alerts) {
    const key = alert.lawChange.title;
    if (!byLaw.has(key)) {
      byLaw.set(key, { law: alert.lawChange, contracts: [] });
    }
    byLaw.get(key).contracts.push(alert);
  }

  for (const [lawTitle, group] of byLaw.entries()) {
    const hasPositive = group.contracts.some((c) => c.impactDirection === "positive");
    const hasCritical = group.contracts.some((c) => c.severity === "critical" && c.impactDirection !== "positive");
    const allPositive = group.contracts.every((c) => c.impactDirection === "positive");

    body += generateEventCard({
      title: lawTitle,
      subtitle: `${group.law.area || "Recht"} · ${group.contracts.length} Vertrag/Verträge betroffen`,
      badge: allPositive ? "Chance" : hasCritical ? "Kritisch" : hasPositive ? "Chance & Prüfen" : "Prüfen",
      badgeColor: allPositive ? "success" : hasCritical ? "critical" : "warning",
      icon: allPositive ? "\u2705" : "\u2696\ufe0f",
    });

    for (const contract of group.contracts.slice(0, 3)) {
      const isPositive = contract.impactDirection === "positive";
      const sevColor = isPositive ? "#059669" : contract.severity === "critical" ? "#dc2626" : contract.severity === "high" ? "#ea580c" : "#d97706";
      const bgColor = isPositive ? "#f0fdf4" : "#f9fafb";
      body += `<div style="padding: 8px 16px; margin: 4px 0; border-left: 3px solid ${sevColor}; background: ${bgColor}; border-radius: 0 6px 6px 0;">
        <div style="font-size: 13px; font-weight: 600; color: #111827;">${isPositive ? "\u2705 " : ""}${contract.contractName}</div>
        <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">${contract.plainSummary || contract.impactSummary}</div>
        ${contract.businessImpact ? `<div style="font-size: 12px; color: ${isPositive ? "#059669" : "#dc2626"}; margin-top: 3px; font-weight: 500;">${isPositive ? "Vorteil" : "Risiko"}: ${contract.businessImpact}</div>` : ""}
        <div style="font-size: 12px; color: ${isPositive ? "#059669" : "#1e40af"}; margin-top: 4px; font-style: italic;">${contract.recommendation}</div>
      </div>`;
    }

    if (group.contracts.length > 3) {
      body += generateParagraph(`+ ${group.contracts.length - 3} weitere Verträge`, { muted: true });
    }

    body += "<br/>";
  }

  const html = generateEmailTemplate({
    title: "\u2696\ufe0f Legal Pulse Radar: Gesetzesänderung erkannt",
    body,
    preheader: `${alerts.length} Verträge von Gesetzesänderungen betroffen`,
    cta: {
      text: "Im Dashboard ansehen \u2192",
      url: "https://contract-ai.de/pulse",
    },
    unsubscribeUrl: `https://contract-ai.de/unsubscribe?type=legal_pulse`,
  });

  const emailSubject = positiveAlerts.length > 0 && negativeAlerts.length === 0
    ? `\u2705 Legal Radar: ${positiveAlerts.length} Chance(n) erkannt`
    : positiveAlerts.length > 0
      ? `\u2696\ufe0f Legal Radar: ${negativeAlerts.length} Handlungsbedarf + ${positiveAlerts.length} Chance(n)`
      : `\u2696\ufe0f Legal Radar: ${alerts.length} Verträge von Gesetzesänderung betroffen`;

  await queueEmail(db, {
    to: user.email,
    subject: emailSubject,
    html,
    userId,
    emailType: "legal_pulse_v2_radar",
  });

  console.log(`[PulseV2Radar] Alert email queued for ${user.email}: ${alerts.length} impacts`);
}

module.exports = { runPulseV2Radar };

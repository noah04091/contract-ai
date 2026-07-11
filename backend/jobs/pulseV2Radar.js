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
 * Schedule: Daily 07:00 UTC (after RSS sync at 03:15)
 * Limits: max 25 law changes per run, max 150 contract matches
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
// Neues, eigenständiges Pulse-Mail-Design (responsiv) — berührt keine andere Mail.
const {
  generatePulseEmailTemplate, pulseHeadline, pulseLead, pulsePanel, pulseRow, pulseSection, pulseReassurance, pulseNote,
} = require("../utils/pulseEmailTemplate");

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
const MAX_ALERTS_PER_USER = 10; // Email cap: max alerts shown in email per run (all alerts stored in DB)

// OpenAI pricing per 1K tokens (gpt-4o-mini, 2026-04)
const PRICES = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
};

/**
 * Extract a canonical fingerprint from a law/ruling title.
 * Used to detect cross-source duplicates (same legislation from different RSS feeds).
 * Returns null if no recognizable pattern is found (conservative — no dedup for unknowns).
 */
function extractLegislationFingerprint(title) {
  if (!title) return null;
  const t = title.trim();

  // 1. EU Directives: (EU) 2023/2225, Richtlinie 2023/2225
  const euDir = t.match(/(?:richtlinie|directive)\s*\(?(?:EU|EG|EWG)\)?\s*(?:Nr\.?\s*)?(\d{4})[\/\-](\d+)/i)
             || t.match(/\((?:EU|EG|EWG)\)\s*(\d{4})[\/\-](\d+)/i);
  if (euDir) return `eu_rl_${euDir[1]}_${euDir[2]}`;

  // 2. EU Regulations: Verordnung (EU) 2024/1689
  const euReg = t.match(/(?:verordnung|regulation)\s*\(?(?:EU|EG|EWG)\)?\s*(?:Nr\.?\s*)?(\d{4})[\/\-](\d+)/i);
  if (euReg) return `eu_vo_${euReg[1]}_${euReg[2]}`;

  // 3. Generic EU number (catch-all for EU acts not caught above)
  const euGeneric = t.match(/\((?:EU|EG|EWG)\)\s*(?:Nr\.?\s*)?(\d{4})[\/\-](\d+)/i);
  if (euGeneric) return `eu_${euGeneric[1]}_${euGeneric[2]}`;

  // 4. Bundestag Drucksachen: 21/1851, BT-Drs. 21/1851
  const btDs = t.match(/(?:drucksache|bt[\-\s]*drs\.?)\s*(\d{1,2})[\/\-](\d+)/i);
  if (btDs) return `bt_ds_${btDs[1]}_${btDs[2]}`;

  // 5. Bundesrat Drucksachen: BR-Drs. 209/26, Bundesrat 209/26
  const brDs = t.match(/(?:bundesrat|br[\-\s]*drs\.?)\s*(\d+)[\/\-](\d{2,4})/i);
  if (brDs) return `br_ds_${brDs[1]}_${brDs[2]}`;

  // 6. BGBl references: BGBl. I 2024, 1234
  const bgbl = t.match(/BGBl\.?\s*(I{1,3}|[12])\s*(\d{4})\s*,?\s*(\d+)/i);
  if (bgbl) return `bgbl_${bgbl[1]}_${bgbl[2]}_${bgbl[3]}`;

  // 7. Court case numbers: II ZB 2/25, VIII ZR 123/24, XII ZB 45/23
  const courtCase = t.match(/\b([IVX]+)\s+(Z[RB]|AR|StR|BLw)\s+(\d+)[\/\-](\d{2,4})\b/);
  if (courtCase) return `court_${courtCase[1]}_${courtCase[2]}_${courtCase[3]}_${courtCase[4]}`;

  return null; // No fingerprint → no dedup (conservative)
}

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
  // Sparse index for cross-source fingerprint dedup queries
  await db.collection("pulse_v2_legal_alerts").createIndex(
    { userId: 1, legislationFingerprint: 1, contractId: 1 },
    { background: true, sparse: true }
  );
  // Compound index for efficient Radar law-fetch query (pulseV2Processed + updatedAt)
  await db.collection("laws").createIndex(
    { pulseV2Processed: 1, updatedAt: -1 },
    { background: true }
  );
  // TTL index: auto-delete alerts older than 180 days (keeps DB lean as user base grows)
  await db.collection("pulse_v2_legal_alerts").createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 15552000, background: true }
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

  // Cost tracking accumulators
  let totalAiCalls = 0;
  let totalTokensInput = 0;
  let totalTokensOutput = 0;
  let totalCostUSD = 0;
  const failedLawIds = []; // Track laws where AI assessment failed (for retry on next run)
  // Silent-Miss-Fix 08.07.: NUR wirklich verarbeitete Gesetze als processed markieren.
  // Vorher wurden ALLE (nicht-fehlgeschlagenen) lawChanges markiert — auch die, die der
  // Budget-Break (Zeile darunter) nie erreicht hat → sie galten faelschlich als "geprueft"
  // und wurden nie wieder angesehen. Jetzt sammeln wir explizit die tatsaechlich erledigten.
  const processedLawIds = [];

  for (const law of lawChanges) {
    if (totalMatches >= MAX_CONTRACT_MATCHES) break; // NICHT verarbeitet -> bleibt fuer naechsten Lauf

    try {
      const matches = await matchLawToContracts(db, law, options);
      if (matches.length === 0) { processedLawIds.push(law._id); continue; } // geprueft, keine Treffer -> erledigt

      // 3. Assess impact with AI
      const { impacts: confirmedImpacts, cost, aiError } = await assessImpact(law, matches);
      if (aiError) {
        failedLawIds.push(law._id);
        continue; // Don't count matches — will be retried on next run
      }
      totalMatches += matches.length;
      processedLawIds.push(law._id); // vollstaendig verarbeitet -> erledigt

      // Accumulate cost
      totalAiCalls += cost.aiCalls || 0;
      totalTokensInput += cost.tokensInput || 0;
      totalTokensOutput += cost.tokensOutput || 0;
      totalCostUSD += cost.costUSD || 0;

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
    } catch (lawErr) {
      console.error(`[PulseV2Radar] Failed to process law "${(law.title || '').substring(0, 60)}":`, lawErr.message);
      failedLawIds.push(law._id);
    }
  }

  // 4. Store ALL alerts in DB + send email (email body capped to MAX_ALERTS_PER_USER)
  let cappedCount = 0;
  for (const [userId, alerts] of userAlerts.entries()) {
    // Sort by severity (highest first) for email prioritization
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));
    if (alerts.length > MAX_ALERTS_PER_USER) {
      cappedCount += alerts.length - MAX_ALERTS_PER_USER;
      console.log(`[PulseV2Radar] User ${userId}: ${alerts.length} alerts, all stored in DB, email shows top ${MAX_ALERTS_PER_USER}`);
    }
    try {
      await storeAndNotify(db, userId, alerts);
    } catch (notifyErr) {
      console.error(`[PulseV2Radar] storeAndNotify failed for user ${userId}:`, notifyErr.message);
    }
  }

  // 5. Mark ONLY genuinely processed law changes (Silent-Miss-Fix 08.07.):
  //    - AI-failed laws (failedLawIds) -> nicht markiert, Retry naechster Lauf
  //    - vom Budget-Break uebersprungene Laws -> gar nicht in processedLawIds -> Retry
  //    Vorher wurden faelschlich alle nicht-fehlgeschlagenen lawChanges markiert.
  const lawIds = processedLawIds;
  const skippedCount = lawChanges.length - lawIds.length - failedLawIds.length;
  if (failedLawIds.length > 0 || skippedCount > 0) {
    console.log(`[PulseV2Radar] ${lawIds.length} laws marked processed; ${failedLawIds.length} AI-failed + ${skippedCount} budget-skipped NOT marked (retry next run)`);
  }
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
      aiCalls: totalAiCalls,
      tokensInput: totalTokensInput,
      tokensOutput: totalTokensOutput,
      estimatedCostUSD: Number(totalCostUSD.toFixed(6)),
      aiFailures: failedLawIds.length,
    });
  } catch (histErr) {
    console.warn("[PulseV2Radar] Failed to write run history:", histErr.message);
  }

  console.log(
    `[PulseV2Radar] Done. ${lawChanges.length} laws, ${totalMatches} matches, ${totalAlerts} alerts (${positiveAlertCount} pos, ${negativeAlertCount} neg${cappedCount > 0 ? `, ${cappedCount} capped` : ""}${failedLawIds.length > 0 ? `, ${failedLawIds.length} AI failures` : ""}), ${userAlerts.size} users. ${Math.round(duration / 1000)}s | ${totalAiCalls} AI calls, ${totalTokensInput}in/${totalTokensOutput}out tokens, $${totalCostUSD.toFixed(4)}`
  );

  return { lawChanges: lawChanges.length, contractsMatched: totalMatches, alertsSent: totalAlerts, alertsCapped: cappedCount, positiveAlerts: positiveAlertCount, negativeAlerts: negativeAlertCount, usersNotified: userAlerts.size, durationMs: duration, aiCalls: totalAiCalls, tokensInput: totalTokensInput, tokensOutput: totalTokensOutput, estimatedCostUSD: Number(totalCostUSD.toFixed(6)), aiFailures: failedLawIds.length };
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
  // EU-Amtsblatt-Korrekturen (11.07., Voraussetzung für EUR-Lex-Reaktivierung):
  // "Berichtigung der Verordnung (EU) ..." = Tippfehler-Korrektur eines längst
  // veröffentlichten Rechtsakts — für ein Frühwarnsystem irrelevant, aber die
  // Hauptquelle des früheren EUR-Lex-Rauschens (100 Items/Sync).
  /^berichtigung\b/i,
  // Criminal law (never relevant for contracts)
  /strafbarkeit|strafgesetzbuch|strafrecht/i,
  /strafsenat|strafkammer/i,
  /\d+\s+StR\s+\d+/i, // Criminal case numbers (2 StR 365/25)
  /\d+\s+ARs\s+\d+/i, // Criminal referral numbers
  /genitalverstümmelung|todesstrafe|deepfake/i,
  // Political / administrative noise
  /fortschrittsbericht\s+\d{4}/i,
  // ENTFERNT (Silent-Miss-Fix 08.07.): eine BVerfG-Normenkontrolle kann ein Gesetz kippen
  // (Höchst-Impact) — darf kein Rauschen sein. Rein-politische Sondervermögen-Variante bleibt.
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
  // IT / website maintenance announcements from law firms / agencies
  /wartungsarbeit/i,
  // Photo appointments and parliamentary ceremonial items
  /^bildtermin\b/i,
  /^(bundestagspräsident(in)?|julia\s+klöckner)[:\s]/i,
  /^gedenken\s+an\s+die\s+opfer/i,
  /^konferenz\s+im\s+deutschen\s+bundestag/i,
  /^top\s+zp\s+\d/i, // TOP ZP X (Zusatzpunkt) — not caught by /^top\s+\d/
  // Events / conferences / workshops (not law changes)
  /save\s+the\s+date/i,
  /\bstakeholder\s+event\b/i,
  /\b(conference|workshop|webinar|symposium)\b/i,
  /\b(tagung|veranstaltung|fachtagung|jahrestagung)\b/i,
  /\beinladung\s+(zur|zum)\b/i,
  /\bregistration\s+(is\s+)?open\b/i,
  /\bjoin\s+us\s+(for|at)\b/i,
  /\bcall\s+for\s+(papers|abstracts|applications)\b/i,
  // Blog posts / educational / informational content
  /in\s+a\s+nutshell/i,
  /\b(blogartikel|blogbeitrag|gastbeitrag|blog\s*post)\b/i,
  /\b(podcast|video|webcast|livestream)\b/i,
  /\b(interview\s+mit|im\s+gespräch\s+mit)\b/i,
  /\b(buchvorstellung|buchrezension|buchtipp|lesetipp)\b/i,
  /\brückblick\s+\d{4}/i,
  /\bjahresrückblick\b/i,
  /\bpressespiegel\b/i,
  /\btätigkeitsbericht\b/i,
  // Newsletter / promotional content
  /\bnewsletter\b/i,
  // ENTFERNT (Silent-Miss-Fix 08.07.): BaFin/Ministeriums-"Rundschreiben" sind bindende
  // Aufsichts-Vorgaben (detectLawStatus: guideline) — kein Rauschen. "Newsletter" bleibt.
  /\b(folgen\s+sie\s+uns|follow\s+us)\b/i,
  /\b(jetzt\s+anmelden|jetzt\s+registrieren)\b/i,
  /\babonnieren\b/i,
  // Personnel / organizational (not law changes)
  /\b(ernennung|ernannt|bestellung|bestellt)\s+(von|des|der|zum|zur)\b/i,
  /\b(personalie|personalwechsel|stellenausschreibung)\b/i,
  /\bnachfolger(in)?\s+(von|für)\b/i,
  // Rhetorical / journalistic headlines (opinion pieces, not laws)
  /^(neu|new):\s/i,
  /\bkolumne\b/i,
  /\bkommentar\s+(von|zum|zur)\b/i,
  /\b(das\s+bedeutet|was\s+sie\s+wissen\s+müssen)\b/i,
];

// Schutzschild (Silent-Miss-Fix 08.07.): klare echte Rechtsakte (Gesetzentwürfe/Verordnungen)
// NIE als Rauschen verwerfen — sie tragen oft eine Drucksachen-Nummer im Titel und würden sonst
// am /drucksache …/-Muster hängenbleiben. Prozedurales (Anfrage/Beschlussempfehlung/Protokoll/
// Unterrichtung) ist ausdrücklich ausgenommen und wird weiterhin gefiltert.
const REAL_LAW_SIGNAL = /\b(gesetzentwurf|entwurf eines\s+[\wäöüß]*\s*gesetzes|artikelgesetz|verordnungsentwurf|verordnung\s+(zur|zum|über|des|der)\b)/i;
// 'berichtigung' ergänzt 11.07.: "Berichtigung der Verordnung (EU) ..." darf der Schild NICHT
// retten — sonst fluten EU-Amtsblatt-Korrekturen den Radar (Grund der früheren Deaktivierung).
const PROCEDURAL_SIGNAL = /\b(anfrage|beschlussempfehlung|protokoll|tagesordnung|unterrichtung|berichtigung|entschlie(ß|ss)ungsantrag)\b/i;

function isNoiseLaw(law) {
  const title = (law.title || "").trim();
  if (title.length < 15) return true;
  // Echte Gesetze/Verordnungen schützen (aber nicht prozedurale Drucksachen wie Anfragen)
  if (REAL_LAW_SIGNAL.test(title) && !PROCEDURAL_SIGNAL.test(title)) return false;
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
  // Silent-Miss-Fix 09.07.: court_decision 10 -> 25. Urteils-Titel sind naturgemäß dünn
  // (Aktenzeichen statt Signalwörter wie "in Kraft/Pflicht"), darum fielen echte BGH/BAG-
  // Urteile trotz hoher Bedeutung unter die 30er-Relevanzschwelle und wurden nie geprüft.
  // Höherer Floor holt frische Urteile der obersten Bundesgerichte rein; die eigentliche
  // Relevanz filtert danach die KI (assessImpact, "im Zweifel affected=false").
  const statusBoost = { effective: 20, passed: 15, court_decision: 25, guideline: 5, proposal: 3 };
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
  // Exclude "nicht_vertrag" entries (Stage 2 Document-Gate rejects)
  const contractTypes = await LegalPulseV2Result.distinct("document.contractType", {
    status: "completed",
    "document.contractType": { $ne: "nicht_vertrag" },
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

  // 7. Fingerprint dedup — keep highest-scored law per fingerprint (cross-source dedup)
  const fingerprintBest = new Map();
  const dedupedItems = [];
  let fpDedupCount = 0;

  for (const item of topItems) {
    const fp = extractLegislationFingerprint(item.law.title);
    if (!fp) {
      dedupedItems.push(item);
      continue;
    }
    if (!fingerprintBest.has(fp) || item.score > fingerprintBest.get(fp).score) {
      if (fingerprintBest.has(fp)) fpDedupCount++;
      fingerprintBest.set(fp, item);
    } else {
      fpDedupCount++;
    }
  }

  for (const item of fingerprintBest.values()) {
    dedupedItems.push(item);
  }

  if (fpDedupCount > 0) {
    console.log(`[PulseV2Radar] Fingerprint dedup: removed ${fpDedupCount} cross-source duplicates from ${topItems.length} laws`);
  }

  return dedupedItems.map((s) => s.law);
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
    // Exclude nicht_vertrag (Stage 2 Document-Gate rejects)
    query = {
      status: "completed",
      "document.contractType": {
        $in: relevantTypes.map((t) => new RegExp(t, "i")),
        $ne: "nicht_vertrag",
      },
    };
    limit = 50;
  } else {
    // UNKNOWN area → don't skip! Take a small sample of recent contracts
    // and let the AI decide if they're affected. Conservative limit to control cost.
    const primaryArea = uniqueAreas[0] || "(empty)";
    console.log(`[PulseV2Radar] No pre-filter mapping for area "${primaryArea}" — using AI-based matching (sample of recent contracts)`);
    query = {
      status: "completed",
      "document.contractType": { $ne: "nicht_vertrag" },
    };
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
              "document.contractType": { $ne: "nicht_vertrag" },
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
 * Returns only confirmed impacts above confidence threshold plus token usage/cost.
 * Shape: { impacts: [...], cost: { aiCalls, tokensInput, tokensOutput, costUSD } }
 */
async function assessImpact(lawChange, contracts) {
  const emptyCost = { aiCalls: 0, tokensInput: 0, tokensOutput: 0, costUSD: 0 };
  if (contracts.length === 0) return { impacts: [], cost: emptyCost };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[PulseV2Radar] No OpenAI API key — skipping AI impact assessment");
    return { impacts: [], cost: emptyCost, aiError: true };
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

KONTEXT-MATCHING (wichtig!):
- Urteile über PRIVATE Sachverhalte (Familie, Nachbarn, Privatpersonen) sind NICHT automatisch relevant für GEWERBLICHE Verträge, auch wenn sie dasselbe Rechtsgebiet betreffen
- Beispiel: Ein BGH-Urteil über heimliches Filmen in der Wohnung betrifft KEINEN SaaS- oder B2B-Vertrag, auch wenn beide "Datenschutz" betreffen — der Regelungskontext ist völlig verschieden
- Prüfe IMMER: Betrifft die Entscheidung/das Gesetz denselben SACHLICHEN Kontext wie der Vertrag (gewerblich↔gewerblich, Verbraucher↔Verbraucher)?
- Wenn Sachkontext nicht übereinstimmt → affected=false, egal wie ähnlich das Rechtsgebiet klingt
- confidence >80 NUR wenn du den GENAUEN Regelungsinhalt des Gesetzes benennen kannst, der die GENAUE Klausel im Vertrag betrifft
- confidence 60-79: Vertrag ist nur indirekt oder am Rande betroffen

QUELLENTYP-PRÜFUNG (vor jeder Bewertung!):
- Prüfe den TITEL der Gesetzesänderung: Ist es ein ECHTES Gesetz, eine Verordnung, ein Gerichtsurteil oder eine behördliche Leitlinie? Oder ist es ein Nachrichtenartikel, Blogpost, Bildungsbeitrag oder Pressemitteilung ÜBER ein Gesetz?
- Nachrichtenartikel und Blogposts ÜBER Gesetze sind KEINE eigenständigen Gesetzesänderungen — ein Artikel der ein Gesetz erklärt, ändert nichts am Recht
- Journalistische Titel (Fragen, Serien wie "Teil 3", "in a nutshell", Meinungen) → mit höchster Wahrscheinlichkeit kein echtes Gesetz → affected=false
- Nur wenn eine KONKRETE, NEUE gesetzliche Regelung identifizierbar ist (Gesetzesnummer, EU-Verordnungsnummer, Paragraf, Aktenzeichen wie "II ZB 2/25") → affected=true möglich
- Wenn du keinen konkreten Gesetzestext, keine Norm und kein Aktenzeichen benennen kannst → affected=false

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

    // Track token usage + cost from OpenAI response
    const usage = response.usage || {};
    const tokensInput = usage.prompt_tokens || 0;
    const tokensOutput = usage.completion_tokens || 0;
    const costUSD =
      (tokensInput / 1000) * PRICES["gpt-4o-mini"].input +
      (tokensOutput / 1000) * PRICES["gpt-4o-mini"].output;
    const cost = { aiCalls: 1, tokensInput, tokensOutput, costUSD };

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

    return { impacts: confirmedImpacts, cost };
  } catch (err) {
    console.error("[PulseV2Radar] AI assessment failed:", err.message);
    return { impacts: [], cost: emptyCost, aiError: true };
  }
}

/**
 * Store alerts in DB and send consolidated email to user.
 */
async function storeAndNotify(db, userId, alerts, options = {}) {
  // Store in pulse_v2_legal_alerts
  let alertDocs = alerts.map((a) => ({
    userId,
    contractId: a.contractId,
    contractName: a.contractName,
    lawId: a.lawChange._id.toString(),
    lawTitle: a.lawChange.title,
    lawArea: a.lawChange.area,
    lawStatus: a.lawChange.lawStatus || "unknown",
    lawSource: a.lawChange.sourceUrl || a.lawChange.url || "",
    impactSummary: a.impactSummary,
    plainSummary: a.plainSummary || "",
    businessImpact: a.businessImpact || "",
    severity: a.severity,
    impactDirection: a.impactDirection || "negative",
    recommendation: a.recommendation,
    affectedClauseIds: a.affectedClauseIds || [],
    clauseImpacts: a.clauseImpacts || [],
    legislationFingerprint: extractLegislationFingerprint(a.lawChange.title) || null,
    status: "unread",
    createdAt: new Date(),
  }));

  // Cross-run fingerprint dedup: skip alerts if user already has a recent alert
  // for the same legislation (same fingerprint) within the last 30 days.
  // Ignores contractId — all affected contracts are grouped in a single email per run,
  // so a re-alert for the same law across runs is always a duplicate.
  const fpValues = [...new Set(alertDocs.map(d => d.legislationFingerprint).filter(Boolean))];
  if (fpValues.length > 0) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const existing = await db.collection("pulse_v2_legal_alerts").find({
      userId,
      legislationFingerprint: { $in: fpValues },
      createdAt: { $gte: thirtyDaysAgo },
    }, { projection: { legislationFingerprint: 1 } }).toArray();

    const existingFPs = new Set(existing.map(e => e.legislationFingerprint));

    if (existingFPs.size > 0) {
      const beforeCount = alertDocs.length;
      alertDocs = alertDocs.filter(doc => {
        if (!doc.legislationFingerprint) return true;
        return !existingFPs.has(doc.legislationFingerprint);
      });
      const fpSkipped = beforeCount - alertDocs.length;
      if (fpSkipped > 0) {
        console.log(`[PulseV2Radar] Cross-run fingerprint dedup: skipped ${fpSkipped} duplicate alerts for user ${userId} (fingerprints: ${[...existingFPs].join(", ")})`);
      }
    }
  }

  if (alertDocs.length === 0) return; // All duplicates — skip insert + email

  // Insert with ordered:false to skip duplicates (unique index prevents re-alerts)
  try {
    await db.collection("pulse_v2_legal_alerts").insertMany(alertDocs, { ordered: false });
  } catch (err) {
    // Ignore duplicate key errors (code 11000) — means alert already exists
    if (err.code !== 11000) throw err;
    console.log(`[PulseV2Radar] ${err.writeErrors?.length || 0} duplicate alerts skipped for user ${userId}`);
  }

  // Still speichern ohne sofortige Mail (z.B. Backlog-Sweep beim Onboarding):
  // Alerts sind persistiert (sichtbar auf /pulse + Glocke, tauchen im naechsten
  // Wach-Bericht auf) — aber keine ueberraschende Extra-Mail direkt nach der Analyse.
  if (options.skipEmail) {
    console.log(`[PulseV2] ${alertDocs.length} alerts persisted for user ${userId} (skipEmail)`);
    return;
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

  // -- Helpers for email formatting --
  const plural = (n, singular, pluralForm) => n === 1 ? singular : pluralForm;
  const cleanName = (name) => {
    if (!name) return "Unbenannter Vertrag";
    return name
      .replace(/\.\w{2,4}$/, "")     // .pdf, .docx entfernen
      .replace(/^\d{10,13}[-_]/, "")  // Unix-Timestamp-Prefix
      .replace(/^\d{6}_/, "")         // YYMMDD_ Prefix
      .replace(/_/g, " ")             // Unterstriche → Leerzeichen
      .trim() || "Unbenannter Vertrag";
  };
  const cleanLawTitle = (title) => {
    if (!title) return "Gesetzesänderung";
    return title
      .replace(/\s*\(PDF\)\s*$/i, "")            // "(PDF)" am Ende
      .replace(/\s*\[PDF\]\s*$/i, "")             // "[PDF]" am Ende
      .replace(/^zu der \w+ Beratung des /i, "")  // "zu der dritten Beratung des " Prefix
      .replace(/^\d+\/\d+\s*\|\s*/, "")           // "209/26 | " Drucksachen-Prefix
      .replace(/\s*\|\s*\d{1,2}\.\s*[A-Za-zäöüÄÖÜ]+\s+\d{4}\s*$/, "") // " | 21. April 2026" Datum-Suffix
      .trim();
  };
  const cleanRecommendation = (text) => {
    if (!text) return "";
    // [clause_4] → §4, [clause_12] → §12
    return text.replace(/\[clause[_\s]*(\d+)\]/gi, "§$1");
  };

  // Build email — cap detail blocks but show total stats
  const emailAlerts = alerts.length > MAX_ALERTS_PER_USER ? alerts.slice(0, MAX_ALERTS_PER_USER) : alerts;
  const emailCappedCount = alerts.length - emailAlerts.length;
  const alertCount = alerts.length;

  const positiveAlerts = alerts.filter((a) => a.impactDirection === "positive");
  const negativeAlerts = alerts.filter((a) => a.impactDirection !== "positive");

  // Group alerts by law change (use fingerprint for dedup if available)
  const byLaw = new Map();
  for (const alert of emailAlerts) {
    const fp = extractLegislationFingerprint(alert.lawChange.title);
    const key = fp || alert.lawChange.title;
    if (!byLaw.has(key)) {
      byLaw.set(key, { law: alert.lawChange, contracts: [] });
    }
    byLaw.get(key).contracts.push(alert);
  }

  // E-Mail-Body im neuen, ruhigen Pulse-Design (du, Klartext, eine Aktion)
  let body = pulseHeadline(
    alertCount === 1
      ? "Eine Gesetzesänderung betrifft deinen Vertrag"
      : "Gesetzesänderungen betreffen deine Verträge"
  );
  body += pulseLead(`Hallo ${userName},`);
  body += pulseLead(
    `Contract&nbsp;AI prüft deine Verträge automatisch jeden Tag auf neue Gesetze und Urteile. Heute haben wir <strong style="color:#1a1f36;">${alertCount} Treffer</strong> gefunden, die du dir ansehen solltest. Hier in einfachen Worten, was sich ändert und was du tun kannst:`
  );

  for (const [, group] of byLaw.entries()) {
    const contractCount = group.contracts.length;
    const gCrit = group.contracts.filter((c) => c.severity === "critical" && c.impactDirection !== "positive").length;
    body += pulsePanel({
      eyebrow: "Rechtsquelle",
      title: cleanLawTitle(group.law.title),
      meta: `${group.law.area || "Recht"} &nbsp;&middot;&nbsp; ${contractCount} ${plural(contractCount, "Vertrag", "Verträge")} betroffen${gCrit > 0 ? ` &nbsp;&middot;&nbsp; <span style="color:#dc2626; font-weight:600;">${gCrit} dringend</span>` : ""}`,
    });

    group.contracts.slice(0, 3).forEach((contract, i) => {
      const isPositive = contract.impactDirection === "positive";
      const st = isPositive
        ? { dot: "#059669", text: "Chance" }
        : contract.severity === "critical"
          ? { dot: "#dc2626", text: "Dringend" }
          : { dot: "#d97706", text: "Beobachten" };
      const summary = contract.plainSummary || contract.impactSummary || "";
      const impact = contract.businessImpact || "";
      const recommendation = cleanRecommendation(contract.recommendation || "");
      const rows = [];
      if (summary) rows.push(pulseRow("Was sich ändert", summary));
      if (impact) rows.push(pulseRow("Was das für dich heißt", impact));
      if (recommendation) rows.push(pulseRow("Was du tun kannst", recommendation, true));
      body += pulseSection({
        name: cleanName(contract.contractName),
        dotColor: st.dot,
        statusText: st.text,
        statusColor: st.dot,
        rows,
        isFirst: i === 0,
      });
    });

    if (contractCount > 3) {
      body += pulseLead(`<span style="color:#8792a2; font-size:13px;">+ ${contractCount - 3} weitere ${plural(contractCount - 3, "Vertrag", "Verträge")}</span>`);
    }
  }

  if (emailCappedCount > 0) {
    body += pulseLead(`<span style="color:#8792a2; font-size:13px;">+ ${emailCappedCount} weitere ${plural(emailCappedCount, "Alert", "Alerts")} &mdash; im Dashboard einsehbar</span>`);
  }

  body += pulseReassurance({
    text: `<strong style="color:#1a1f36;">Keine Sorge &mdash; du musst kein Jurist sein.</strong> Öffne den Vertrag in Contract&nbsp;AI: Wir zeigen dir genau die betroffene Stelle und führen dich Schritt für Schritt durch das, was zu tun ist.`,
    buttonText: "Verträge ansehen & lösen",
    buttonUrl: "https://contract-ai.de/pulse",
  });
  body += pulseNote(
    "Du bekommst diese E-Mail, weil Contract&nbsp;AI diese Verträge automatisch für dich überwacht. Du kannst das jederzeit in den Einstellungen ändern."
  );

  const html = generatePulseEmailTemplate({
    body,
    badge: "Legal Radar",
    preheader: `${alertCount} Verträge von Gesetzesänderungen betroffen`,
    unsubscribeUrl: `https://contract-ai.de/unsubscribe?type=legal_pulse`,
  });

  // Subject line — specific when possible
  const lawTitles = [...byLaw.values()].map((g) => cleanLawTitle(g.law.title));
  const shortLawTitle = lawTitles.length === 1 && lawTitles[0].length <= 60 ? lawTitles[0] : null;

  const emailSubject = positiveAlerts.length > 0 && negativeAlerts.length === 0
    ? `\u2705 Legal Radar: ${positiveAlerts.length} ${plural(positiveAlerts.length, "Chance", "Chancen")} erkannt`
    : shortLawTitle
      ? `\u2696\ufe0f Legal Radar: ${shortLawTitle}`
      : positiveAlerts.length > 0
        ? `\u2696\ufe0f Legal Radar: ${negativeAlerts.length}x Handlungsbedarf + ${positiveAlerts.length} ${plural(positiveAlerts.length, "Chance", "Chancen")}`
        : `\u2696\ufe0f Legal Radar: ${alertCount} ${plural(alertCount, "Vertrag betroffen", "Verträge betroffen")}`;

  await queueEmail(db, {
    to: user.email,
    subject: emailSubject,
    html,
    userId,
    emailType: "legal_pulse_v2_radar",
  });

  console.log(`[PulseV2Radar] Alert email queued for ${user.email}: ${alerts.length} impacts`);
}

/**
 * Backlog-Sweep (Bereich C "Rückblick beim Aufnehmen"):
 * Prüft EINEN frisch analysierten Vertrag EINMALIG gegen die Rechtsänderungen der letzten
 * `sinceDays` Tage — inkl. der bereits vom Radar verarbeiteten (pulseV2Processed:true), die
 * der tägliche Radar nicht mehr anschaut. So wird ein neu aufgenommener Vertrag gegen die
 * BESTEHENDE Rechtslage geprüft, nicht nur gegen künftige Änderungen.
 *
 * Sicher: reine Wiederverwendung der bewährten Radar-Bausteine, scoped auf EINEN Vertrag,
 * harter Kostendeckel (MAX_BACKLOG_LAWS), Dedup via storeAndNotify (kein Doppel-Alert),
 * setzt pulseV2Processed NICHT (Radar-Cursor unberührt), still (skipEmail).
 * @returns {Promise<{swept:boolean, reason?:string, laws?:number, relevant?:number, alerts?:number}>}
 */
async function runBacklogSweepForContract(db, contractId, userId, sinceDays = 75) {
  const MAX_BACKLOG_LAWS = 20; // Kostendeckel: max. so viele Gesetze pro Vertrag KI-prüfen
  const { ObjectId } = require("mongodb");
  const cidStr = String(contractId);
  const uidStr = String(userId);

  // 1. Neuestes abgeschlossenes V2-Ergebnis dieses Vertrags → Vertrags-Payload (wie matchLawToContracts liefert)
  const idCandidates = [contractId, cidStr];
  try { if (ObjectId.isValid(cidStr)) idCandidates.push(new ObjectId(cidStr)); } catch { /* ignore */ }
  const result = await LegalPulseV2Result.findOne(
    { contractId: { $in: idCandidates }, status: "completed" },
    null,
    { sort: { createdAt: -1 } }
  ).lean();
  if (!result) return { swept: false, reason: "no_completed_result" };

  const contractType = result.document?.contractType || "unknown";
  if (contractType === "nicht_vertrag") return { swept: false, reason: "not_a_contract" };

  const contractPayload = {
    userId: result.userId,
    contractId: result.contractId,
    contractName: result.context?.contractName || cidStr,
    contractType,
    findings: (result.clauseFindings || [])
      .filter((f) => f.severity === "critical" || f.severity === "high" || f.severity === "medium")
      .map((f) => ({ title: f.title, category: f.category, severity: f.severity, clauseId: f.clauseId })),
    clauses: (result.clauses || []).map((c) => ({ id: c.id, title: c.title, category: c.category })),
    scores: result.scores,
  };

  // 2. Backlog-Gesetze laden (auch bereits verarbeitete! → bewusst KEIN pulseV2Processed-Filter)
  const sinceDate = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const candidates = await db.collection("laws")
    .find({ updatedAt: { $gte: sinceDate } })
    .sort({ updatedAt: -1 })
    .limit(500)
    .toArray();
  if (candidates.length === 0) return { swept: true, laws: 0, relevant: 0, alerts: 0 };

  // 3. Rauschen raus + Relevanz gegen DIESEN Vertragstyp scoren + Top-N (Kostendeckel)
  const activeTypes = [String(contractType).toLowerCase()];
  const scored = candidates
    .filter((law) => !isNoiseLaw(law))
    .map((law) => ({ law, score: scoreLawRelevance(law, activeTypes) }))
    .filter((s) => s.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_BACKLOG_LAWS);
  if (scored.length === 0) return { swept: true, laws: candidates.length, relevant: 0, alerts: 0 };

  // 4. Je Gesetz: KI-Impact-Prüfung gegen den EINEN Vertrag (assessImpact filtert affected + Konfidenz≥60)
  const alerts = [];
  for (const { law } of scored) {
    try {
      const { impacts } = await assessImpact(law, [contractPayload]);
      for (const impact of impacts || []) {
        alerts.push({
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
      }
    } catch (err) {
      console.warn(`[PulseV2Backlog] assessImpact failed for law ${law._id}:`, err.message);
    }
  }

  // 5. Still persistieren (Dedup automatisch via storeAndNotify, KEINE sofortige Mail)
  if (alerts.length > 0) {
    await storeAndNotify(db, uidStr, alerts, { skipEmail: true });
  }
  console.log(`[PulseV2Backlog] contract ${cidStr}: ${candidates.length} laws in ${sinceDays}d, ${scored.length} relevant, ${alerts.length} alerts (silent).`);
  return { swept: true, laws: candidates.length, relevant: scored.length, alerts: alerts.length };
}

module.exports = { runPulseV2Radar, isNoiseLaw, scoreLawRelevance, runBacklogSweepForContract };

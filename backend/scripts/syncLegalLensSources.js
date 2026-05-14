// 📁 backend/scripts/syncLegalLensSources.js
// Phase 2.5 — Master-Sync-Script für die legalLensSources Collection.
//
// USAGE:
//   node backend/scripts/syncLegalLensSources.js              # alle 15 Gesetze
//   node backend/scripts/syncLegalLensSources.js BGB          # nur ein Gesetz
//   node backend/scripts/syncLegalLensSources.js --dry-run    # nur Pre-Flight, kein Sync
//   node backend/scripts/syncLegalLensSources.js --skip-prompt  # skip Bestätigung (für Cron später)
//
// SICHERHEIT:
// - Manuell ausgeführt (kein Cron)
// - Schreibt NUR in legalLensSources (NICHT in laws)
// - Skip-Logik via contentHash: bei Re-Run wird nur Geändertes neu embedded
// - Bei Fehler in einem Gesetz: weiter mit dem nächsten (kein totaler Abbruch)
//
// EXIT-CODES:
//   0 — Sync erfolgreich
//   1 — Fehler (Config nicht gefunden, DB nicht erreichbar, etc.)
//   2 — User hat Bestätigung abgelehnt

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

const database = require("../config/database");
const { loadAndParseLaw } = require("./lib/gesetzeImInternet");
const legalLensSourcesEmbeddings = require("../services/legalLensSourcesEmbeddings").getInstance();

// ─── Konfiguration laden ──────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, "data", "legal-lens-sources-config.json");
const DSGVO_PATH = path.join(__dirname, "data", "dsgvo-articles.json");

const args = process.argv.slice(2);
const onlyCode = args.find(a => !a.startsWith("--")) || null;
const isDryRun = args.includes("--dry-run");
const skipPrompt = args.includes("--skip-prompt");

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config nicht gefunden: ${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function loadDsgvoArticles() {
  if (!fs.existsSync(DSGVO_PATH)) return null;
  return JSON.parse(fs.readFileSync(DSGVO_PATH, "utf8"));
}

// ─── Pre-Flight Output ────────────────────────────────────────
function printPreFlight(config) {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  PHASE 2.5 — Legal Lens Sources Sync");
  console.log("══════════════════════════════════════════════════════════\n");

  const targetSources = onlyCode
    ? config.sources.filter(s => s.code === onlyCode)
    : config.sources;

  if (targetSources.length === 0) {
    console.log(`❌ Kein Source mit code="${onlyCode}" in Config gefunden.`);
    return null;
  }

  console.log(`📋 Zu synchronisierende Gesetze: ${targetSources.length}`);
  console.log(`📊 Geschätzte §§ gesamt: ${config._estimatedTotal.sections}`);
  console.log(`💰 Geschätzte OpenAI-Kosten: ${config._estimatedTotal.estimatedCostUSD}`);
  console.log(`⏱️  Geschätzte Dauer: ${config._estimatedTotal.estimatedTimeMinutes}\n`);

  console.log("Gesetze in dieser Reihenfolge:");
  targetSources.forEach((s, i) => {
    const xmlMarker = s.xmlUrl ? "📥 XML" : "📝 Manual";
    console.log(`  ${(i + 1).toString().padStart(2)}. [${xmlMarker}] ${s.code.padEnd(8)} — ${s.name} (~${s.estimatedSections} §§)`);
  });

  return targetSources;
}

// ─── User-Bestätigung ─────────────────────────────────────────
function askConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question("\n❓ Sync jetzt starten? (yes/no): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith("y") || answer.toLowerCase() === "ja");
    });
  });
}

// ─── Manuelle Sources (DSGVO + VOB/B) ─────────────────────────
function buildManualSourceSections(sourceConfig) {
  if (sourceConfig.code === "DSGVO") {
    const dsgvo = loadDsgvoArticles();
    if (!dsgvo) {
      console.warn(`  ⚠️  dsgvo-articles.json nicht gefunden — überspringe DSGVO`);
      return [];
    }
    return dsgvo.articles.map(art => ({
      code: "DSGVO",
      section: art.article,
      title: art.title,
      text: art.text,
      area: sourceConfig.primaryArea,
      secondaryAreas: sourceConfig.secondaryAreas || [],
      sourceUrl: `${sourceConfig.baseSourceUrl}${art.article.toLowerCase().replace(/[\s.]/g, "")}-dsgvo/`,
      sourceOrigin: "eur-lex.europa.eu / dsgvo-gesetz.de",
      isActive: true
    }));
  }

  if (sourceConfig.code === "VOB-B") {
    console.warn(`  ⚠️  VOB/B Manual-Source noch nicht implementiert — überspringe (kann später ergänzt werden)`);
    return [];
  }

  console.warn(`  ⚠️  Unbekannter Manual-Source: ${sourceConfig.code}`);
  return [];
}

// ─── Single-Source Sync ───────────────────────────────────────
async function syncSource(sourceConfig) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📚 ${sourceConfig.code} — ${sourceConfig.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const startTime = Date.now();
  let sections = [];

  try {
    if (sourceConfig.xmlUrl) {
      sections = await loadAndParseLaw(sourceConfig);
    } else if (sourceConfig.manualSource) {
      sections = buildManualSourceSections(sourceConfig);
      console.log(`  [Manual] ${sections.length} §§ aus JSON geladen`);
    } else {
      console.warn(`  ⚠️  Keine Source-Methode konfiguriert — überspringe`);
      return { code: sourceConfig.code, success: false, reason: "no_source" };
    }
  } catch (error) {
    console.error(`  ❌ Source-Load-Fehler: ${error.message}`);
    return { code: sourceConfig.code, success: false, reason: "load_failed", error: error.message };
  }

  if (sections.length === 0) {
    console.log(`  ⚠️  Keine §§ extrahiert — überspringe`);
    return { code: sourceConfig.code, success: false, reason: "no_sections" };
  }

  console.log(`  [Embed+Upsert] ${sections.length} §§ → legalLensSources Collection ...`);
  try {
    const stats = await legalLensSourcesEmbeddings.upsertSources(sections, { skipUnchanged: true });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✅ Fertig in ${elapsed}s — inserted=${stats.inserted}, updated=${stats.updated}, skipped=${stats.skipped}, errors=${stats.errors}`);
    return { code: sourceConfig.code, success: true, stats, elapsed };
  } catch (error) {
    console.error(`  ❌ Upsert-Fehler: ${error.message}`);
    return { code: sourceConfig.code, success: false, reason: "upsert_failed", error: error.message };
  }
}

// ─── Master-Sync ──────────────────────────────────────────────
async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error("❌ Config-Fehler:", err.message);
    process.exit(1);
  }

  const targetSources = printPreFlight(config);
  if (!targetSources) process.exit(1);

  if (isDryRun) {
    console.log("\n✅ Dry-Run erfolgreich — kein Sync durchgeführt.");
    process.exit(0);
  }

  if (!skipPrompt) {
    const confirmed = await askConfirmation();
    if (!confirmed) {
      console.log("\n❌ Sync abgebrochen.");
      process.exit(2);
    }
  }

  // ─── DB-Verbindung ──────────────────────────────────────────
  console.log("\n🔌 Verbinde zur DB ...");
  try {
    await database.connect();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    console.log("✅ DB verbunden\n");
  } catch (err) {
    console.error("❌ DB-Verbindung fehlgeschlagen:", err.message);
    process.exit(1);
  }

  // ─── Sync ausführen ─────────────────────────────────────────
  const startTime = Date.now();
  const results = [];

  for (const source of targetSources) {
    const result = await syncSource(source);
    results.push(result);
  }

  // ─── Final-Report ───────────────────────────────────────────
  const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1);
  const totalStats = results.filter(r => r.success).reduce(
    (acc, r) => ({
      inserted: acc.inserted + (r.stats?.inserted || 0),
      updated: acc.updated + (r.stats?.updated || 0),
      skipped: acc.skipped + (r.stats?.skipped || 0),
      errors: acc.errors + (r.stats?.errors || 0)
    }),
    { inserted: 0, updated: 0, skipped: 0, errors: 0 }
  );

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  SYNC ABGESCHLOSSEN");
  console.log("══════════════════════════════════════════════════════════\n");
  console.log(`⏱️  Gesamtdauer: ${elapsedMin} Minuten\n`);

  console.log("Pro Gesetz:");
  for (const r of results) {
    const icon = r.success ? "✅" : "❌";
    const detail = r.success
      ? `${r.stats.inserted} new, ${r.stats.updated} upd, ${r.stats.skipped} skip, ${r.stats.errors} err`
      : `FEHLER: ${r.reason}${r.error ? " — " + r.error : ""}`;
    console.log(`  ${icon} ${r.code.padEnd(10)} ${detail}`);
  }

  console.log("\nTotal:");
  console.log(`  Inserted: ${totalStats.inserted}`);
  console.log(`  Updated:  ${totalStats.updated}`);
  console.log(`  Skipped:  ${totalStats.skipped} (unverändert seit letztem Sync)`);
  console.log(`  Errors:   ${totalStats.errors}`);

  // Final-Stats aus DB
  try {
    const dbStats = await legalLensSourcesEmbeddings.getStats();
    console.log("\nDB-Stand nach Sync:");
    console.log(`  Total §§:        ${dbStats.total}`);
    console.log(`  Mit Embedding:   ${dbStats.withEmbedding}`);
    console.log(`  Gesetze:         ${dbStats.byCode.length}`);
  } catch (err) {
    console.warn(`⚠️  Stats-Fehler: ${err.message}`);
  }

  console.log("\n══════════════════════════════════════════════════════════\n");
  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Unerwarteter Fehler:", err);
  process.exit(1);
});

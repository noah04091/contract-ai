// 📁 backend/scripts/importFromOpenJur.js
// Auto-Import von Gerichtsentscheidungen aus OpenJur

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const axios = require("axios");
const cheerio = require("cheerio");
const CourtDecision = require("../models/CourtDecision");
const { getInstance } = require("../services/courtDecisionEmbeddings");

// OpenJur Konfiguration
const OPENJUR_BASE = "https://openjur.de";
const USER_AGENT = "Mozilla/5.0 (compatible; ContractAI/1.0; +https://contract-ai.de)";

// Rate Limiting: 1 Request alle 2 Sekunden
const RATE_LIMIT_MS = 2000;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Suche auf OpenJur nach Entscheidungen
 * @param {string} query - Suchbegriff
 * @param {number} maxResults - Maximale Anzahl Ergebnisse
 * @returns {Promise<Array>} - Liste von Entscheidungs-URLs
 */
async function searchOpenJur(query, maxResults = 20) {
  console.log(`🔍 Suche auf OpenJur: "${query}"`);

  const searchUrl = `${OPENJUR_BASE}/suche/?q=${encodeURIComponent(query)}`;

  try {
    const response = await axios.get(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Parse Suchergebnisse
    $('a[href^="/u/"]').each((i, el) => {
      if (results.length >= maxResults) return false;

      const href = $(el).attr('href');
      const title = $(el).text().trim();

      if (href && title) {
        results.push({
          url: `${OPENJUR_BASE}${href}`,
          title: title
        });
      }
    });

    console.log(`   Gefunden: ${results.length} Ergebnisse`);
    return results;

  } catch (error) {
    console.error(`❌ Fehler bei Suche: ${error.message}`);
    return [];
  }
}

/**
 * Extrahiere Details einer Entscheidung von OpenJur
 * @param {string} url - URL der Entscheidung
 * @returns {Promise<Object|null>} - Entscheidungsdaten oder null
 */
async function extractDecisionDetails(url) {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);

    // Extrahiere Metadaten aus der Seite
    const titleElement = $('h1').first().text().trim();
    const metaInfo = $('.meta-info, .info-box, .decision-meta').text();

    // Parse Aktenzeichen aus Titel (Format: "BGH, VIII ZR 277/16")
    const caseMatch = titleElement.match(/([A-Z]+),?\s*([\w\s]+\s+\d+\/\d{2,4})/i);
    if (!caseMatch) {
      console.log(`   ⚠️ Konnte Aktenzeichen nicht extrahieren: ${titleElement}`);
      return null;
    }

    const court = caseMatch[1].toUpperCase();
    const caseNumber = caseMatch[2].trim();

    // Prüfe ob Gericht unterstützt wird
    const validCourts = ['BGH', 'BAG', 'BVERFG', 'BFH', 'BSG', 'BVERWG', 'OLG', 'LAG', 'LG', 'AG', 'ARBG'];
    if (!validCourts.includes(court)) {
      console.log(`   ⚠️ Gericht nicht unterstützt: ${court}`);
      return null;
    }

    // Extrahiere Datum
    const dateMatch = metaInfo.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    let decisionDate = new Date();
    if (dateMatch) {
      decisionDate = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
    }

    // Extrahiere Leitsätze (oft in <blockquote> oder bestimmten Divs)
    const headnotes = [];
    $('blockquote, .leitsatz, .leitsaetze').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50 && text.length < 1000) {
        headnotes.push(text);
      }
    });

    // Falls keine Leitsätze gefunden, nimm den ersten Absatz
    if (headnotes.length === 0) {
      $('p').each((i, el) => {
        if (headnotes.length >= 2) return false;
        const text = $(el).text().trim();
        if (text.length > 100 && text.length < 800) {
          headnotes.push(text);
        }
      });
    }

    // Extrahiere Zusammenfassung (erster längerer Text)
    let summary = '';
    const fullText = $('.content, .decision-text, .entscheidungstext, article').text();
    if (fullText.length > 200) {
      summary = fullText.substring(0, 800).trim();
      // Schneide bei Satzende ab
      const lastPeriod = summary.lastIndexOf('.');
      if (lastPeriod > 400) {
        summary = summary.substring(0, lastPeriod + 1);
      }
    }

    // Extrahiere relevante Gesetze (§ XXX BGB, etc.)
    const lawMatches = fullText.match(/§\s*\d+[a-z]?\s*(?:Abs\.\s*\d+\s*)?(?:BGB|HGB|StGB|ZPO|KSchG|BUrlG|AGG|TzBfG|GmbHG|AktG)/gi) || [];
    const relevantLaws = [...new Set(lawMatches.map(l => l.trim()))].slice(0, 5);

    // Bestimme Rechtsgebiet basierend auf Inhalt
    const legalArea = detectLegalArea(fullText, relevantLaws);

    // Extrahiere Keywords
    const keywords = extractKeywords(fullText, legalArea);

    return {
      caseNumber,
      court,
      decisionDate,
      legalArea,
      headnotes: headnotes.slice(0, 3),
      summary: summary || `Entscheidung des ${court} vom ${decisionDate.toLocaleDateString('de-DE')}`,
      relevantLaws,
      keywords,
      sourceUrl: url
    };

  } catch (error) {
    console.error(`   ❌ Fehler beim Extrahieren: ${error.message}`);
    return null;
  }
}

/**
 * Erkennt das Rechtsgebiet basierend auf dem Text
 */
function detectLegalArea(text, laws) {
  const textLower = text.toLowerCase();
  const lawsJoined = laws.join(' ').toLowerCase();

  // Mietrecht
  if (textLower.includes('miet') || textLower.includes('vermieter') || textLower.includes('mieter') ||
      lawsJoined.includes('535') || lawsJoined.includes('573')) {
    return 'Mietrecht';
  }

  // Arbeitsrecht
  if (textLower.includes('arbeitnehmer') || textLower.includes('arbeitgeber') || textLower.includes('kündigung') ||
      lawsJoined.includes('kschg') || lawsJoined.includes('tzbfg') || lawsJoined.includes('burlg')) {
    return 'Arbeitsrecht';
  }

  // Kaufrecht
  if (textLower.includes('käufer') || textLower.includes('verkäufer') || textLower.includes('gewährleistung') ||
      textLower.includes('mangel') || lawsJoined.includes('437') || lawsJoined.includes('434')) {
    return 'Kaufrecht';
  }

  // Gesellschaftsrecht
  if (textLower.includes('gmbh') || textLower.includes('geschäftsführer') || textLower.includes('gesellschafter') ||
      lawsJoined.includes('gmbhg') || lawsJoined.includes('aktg')) {
    return 'Gesellschaftsrecht';
  }

  // Familienrecht
  if (textLower.includes('ehe') || textLower.includes('scheidung') || textLower.includes('unterhalt') ||
      textLower.includes('sorgerecht')) {
    return 'Familienrecht';
  }

  // Erbrecht
  if (textLower.includes('erbe') || textLower.includes('testament') || textLower.includes('pflichtteil') ||
      textLower.includes('erbschaft')) {
    return 'Erbrecht';
  }

  // Datenschutz
  if (textLower.includes('dsgvo') || textLower.includes('datenschutz') || textLower.includes('personenbezogen')) {
    return 'Datenschutzrecht';
  }

  // Baurecht
  if (textLower.includes('bauherr') || textLower.includes('werkvertrag') || textLower.includes('baumangel')) {
    return 'Baurecht';
  }

  // Versicherungsrecht
  if (textLower.includes('versicher') || lawsJoined.includes('vvg')) {
    return 'Versicherungsrecht';
  }

  // Wettbewerbsrecht
  if (textLower.includes('wettbewerb') || textLower.includes('werbung') || lawsJoined.includes('uwg')) {
    return 'Wettbewerbsrecht';
  }

  // Bankrecht
  if (textLower.includes('bank') || textLower.includes('kredit') || textLower.includes('darlehen')) {
    return 'Bankrecht';
  }

  // Handelsrecht
  if (lawsJoined.includes('hgb') && !textLower.includes('gmbh')) {
    return 'Handelsrecht';
  }

  return 'Vertragsrecht'; // Default
}

/**
 * Extrahiert relevante Keywords aus dem Text
 */
function extractKeywords(text, legalArea) {
  const keywords = [legalArea];
  const textLower = text.toLowerCase();

  // Allgemeine Keywords
  const commonKeywords = {
    'kündigung': ['Kündigung'],
    'fristlos': ['fristlose Kündigung'],
    'schadensersatz': ['Schadensersatz'],
    'vertrag': ['Vertragsrecht'],
    'mangel': ['Mangel', 'Gewährleistung'],
    'haftung': ['Haftung'],
    'vertragsstrafe': ['Vertragsstrafe'],
    'agb': ['AGB', 'Allgemeine Geschäftsbedingungen'],
    'widerruf': ['Widerruf', 'Widerrufsrecht'],
    'befristung': ['Befristung'],
    'überstunden': ['Überstunden', 'Mehrarbeit'],
    'urlaub': ['Urlaub', 'Urlaubsanspruch'],
    'miete': ['Miete', 'Mietrecht'],
    'kaution': ['Kaution', 'Mietkaution'],
    'eigenbedarf': ['Eigenbedarf', 'Eigenbedarfskündigung'],
    'nebenkosten': ['Nebenkosten', 'Betriebskosten'],
    'diskriminierung': ['Diskriminierung', 'AGG'],
    'dsgvo': ['DSGVO', 'Datenschutz']
  };

  for (const [term, kws] of Object.entries(commonKeywords)) {
    if (textLower.includes(term)) {
      keywords.push(...kws);
    }
  }

  // Deduplizieren und limitieren
  return [...new Set(keywords)].slice(0, 8);
}

/**
 * Importiere Entscheidungen von OpenJur
 * @param {string} searchQuery - Suchbegriff
 * @param {number} maxDecisions - Maximale Anzahl zu importierender Entscheidungen
 */
async function importFromOpenJur(searchQuery, maxDecisions = 10) {
  console.log("\n" + "=".repeat(60));
  console.log(`📥 OpenJur Import: "${searchQuery}"`);
  console.log("=".repeat(60) + "\n");

  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Suche Entscheidungen
    const searchResults = await searchOpenJur(searchQuery, maxDecisions * 2); // Mehr suchen wegen Duplikaten

    if (searchResults.length === 0) {
      console.log("❌ Keine Ergebnisse gefunden");
      return { imported: 0, skipped: 0, errors: 0 };
    }

    const embeddingsService = getInstance();
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const result of searchResults) {
      if (imported >= maxDecisions) break;

      console.log(`\n📄 Verarbeite: ${result.title.substring(0, 60)}...`);

      // Rate Limiting
      await sleep(RATE_LIMIT_MS);

      // Extrahiere Details
      const decision = await extractDecisionDetails(result.url);

      if (!decision) {
        errors++;
        continue;
      }

      // Prüfe ob bereits vorhanden
      const existing = await CourtDecision.findOne({ caseNumber: decision.caseNumber });
      if (existing) {
        console.log(`   ⏭️ Bereits vorhanden: ${decision.caseNumber}`);
        skipped++;
        continue;
      }

      // Speichere mit Embeddings
      try {
        await embeddingsService.upsertDecisions([decision]);
        console.log(`   ✅ Importiert: ${decision.court} ${decision.caseNumber} (${decision.legalArea})`);
        imported++;
      } catch (saveError) {
        console.error(`   ❌ Fehler beim Speichern: ${saveError.message}`);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Import-Ergebnis:");
    console.log(`   ✅ Importiert: ${imported}`);
    console.log(`   ⏭️ Übersprungen (bereits vorhanden): ${skipped}`);
    console.log(`   ❌ Fehler: ${errors}`);
    console.log("=".repeat(60) + "\n");

    return { imported, skipped, errors };

  } catch (error) {
    console.error("❌ Import fehlgeschlagen:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

/**
 * Batch-Import mehrerer Rechtsgebiete
 */
async function batchImport() {
  const searches = [
    { query: "BGH Mietrecht 2023", max: 5 },
    { query: "BGH Arbeitsrecht Kündigung", max: 5 },
    { query: "BAG Kündigungsschutz", max: 5 },
    { query: "BGH Kaufrecht Gewährleistung", max: 5 },
    { query: "BGH Vertragsstrafe", max: 3 },
    { query: "BGH AGB unwirksam", max: 3 },
    { query: "BGH DSGVO Schadensersatz", max: 3 },
    { query: "BGH GmbH Geschäftsführerhaftung", max: 3 }
  ];

  console.log("🚀 Starte Batch-Import...\n");

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const search of searches) {
    try {
      const result = await importFromOpenJur(search.query, search.max);
      totalImported += result.imported;
      totalSkipped += result.skipped;
      totalErrors += result.errors;

      // Längere Pause zwischen Batches
      await sleep(5000);
    } catch (error) {
      console.error(`❌ Fehler bei Suche "${search.query}":`, error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 GESAMT-ERGEBNIS:");
  console.log(`   ✅ Importiert: ${totalImported}`);
  console.log(`   ⏭️ Übersprungen: ${totalSkipped}`);
  console.log(`   ❌ Fehler: ${totalErrors}`);
  console.log("=".repeat(60));
}

// CLI Handling
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === '--batch') {
    batchImport();
  } else if (args[0] === '--search' && args[1]) {
    const maxResults = parseInt(args[2]) || 10;
    importFromOpenJur(args[1], maxResults);
  } else {
    console.log(`
📥 OpenJur Import Script
========================

Verwendung:
  node importFromOpenJur.js --search "<Suchbegriff>" [maxResults]
  node importFromOpenJur.js --batch

Beispiele:
  node importFromOpenJur.js --search "BGH Mietrecht" 10
  node importFromOpenJur.js --search "BAG Kündigung" 5
  node importFromOpenJur.js --batch

Der Batch-Import lädt automatisch Entscheidungen aus verschiedenen Rechtsgebieten.
    `);
  }
}

module.exports = { importFromOpenJur, batchImport, searchOpenJur };

/**
 * Check-Script für Phase 2 (Rechtsquellen-Sektion in Legal Lens).
 *
 * Prüft, ob die Datenbasis für RAG (Retrieval Augmented Generation) ausreichend ist:
 * - Wie viele Gesetze (laws) sind in MongoDB?
 * - Wie viele Urteile (courtdecisions)?
 * - Haben sie Embeddings? (Pflicht für Vector-Search)
 * - Welche Areas/Courts sind abgedeckt?
 *
 * Output: Klare Empfehlung — können wir Phase 2 sofort starten oder müssen wir
 * erst Daten sync'en?
 *
 * Run: node backend/scripts/checkLegalSourcesData.js
 */

require('dotenv').config();
const database = require('../config/database');

(async () => {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  PHASE 2 DATA CHECK — Legal Lens Rechtsquellen-Sektion');
  console.log('══════════════════════════════════════════════════════════\n');

  try {
    const db = await database.connect();

    // ─── LAWS Collection ──────────────────────────────────────────
    console.log('📜 LAWS Collection');
    console.log('─────────────────────────────────────────────');

    const totalLaws = await db.collection('laws').countDocuments();
    console.log(`  Total Einträge: ${totalLaws}`);

    const lawsWithEmbedding = await db.collection('laws').countDocuments({
      embedding: { $exists: true, $not: { $size: 0 } }
    });
    console.log(`  Mit Embedding:  ${lawsWithEmbedding} (${totalLaws > 0 ? Math.round(lawsWithEmbedding / totalLaws * 100) : 0}%)`);

    const lawsWithSourceUrl = await db.collection('laws').countDocuments({
      sourceUrl: { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`  Mit sourceUrl:  ${lawsWithSourceUrl} (${totalLaws > 0 ? Math.round(lawsWithSourceUrl / totalLaws * 100) : 0}%)`);

    // Areas-Verteilung
    const areaAgg = await db.collection('laws').aggregate([
      { $group: { _id: '$area', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]).toArray();

    if (areaAgg.length > 0) {
      console.log('\n  Top Areas:');
      for (const a of areaAgg) {
        console.log(`    ${(a._id || 'ohne_area').padEnd(20)} ${a.count}`);
      }
    }

    // 3 Beispiel-Einträge
    const sampleLaws = await db.collection('laws').find({})
      .limit(3)
      .project({ lawId: 1, sectionId: 1, title: 1, area: 1, sourceUrl: 1 })
      .toArray();
    if (sampleLaws.length > 0) {
      console.log('\n  Beispiele:');
      for (const l of sampleLaws) {
        const sourceShort = l.sourceUrl ? l.sourceUrl.substring(0, 50) + '...' : '(keine URL)';
        console.log(`    ${(l.lawId || '?')} ${l.sectionId || '?'} — ${(l.title || '').substring(0, 60)}`);
        console.log(`      area: ${l.area || '?'}, url: ${sourceShort}`);
      }
    }

    // ─── COURT DECISIONS Collection ────────────────────────────────
    console.log('\n\n⚖️  COURT DECISIONS Collection');
    console.log('─────────────────────────────────────────────');

    const totalDecisions = await db.collection('courtdecisions').countDocuments();
    console.log(`  Total Einträge: ${totalDecisions}`);

    const decisionsWithEmbedding = await db.collection('courtdecisions').countDocuments({
      embedding: { $exists: true, $not: { $size: 0 } }
    });
    console.log(`  Mit Embedding:  ${decisionsWithEmbedding} (${totalDecisions > 0 ? Math.round(decisionsWithEmbedding / totalDecisions * 100) : 0}%)`);

    const decisionsWithUrl = await db.collection('courtdecisions').countDocuments({
      sourceUrl: { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`  Mit sourceUrl:  ${decisionsWithUrl} (${totalDecisions > 0 ? Math.round(decisionsWithUrl / totalDecisions * 100) : 0}%)`);

    // Court-Verteilung
    const courtAgg = await db.collection('courtdecisions').aggregate([
      { $group: { _id: '$court', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    if (courtAgg.length > 0) {
      console.log('\n  Verteilung nach Gericht:');
      for (const c of courtAgg) {
        console.log(`    ${(c._id || 'ohne_court').padEnd(15)} ${c.count}`);
      }
    }

    // Rechtsgebiete-Verteilung
    const areaCDAgg = await db.collection('courtdecisions').aggregate([
      { $group: { _id: '$legalArea', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    if (areaCDAgg.length > 0) {
      console.log('\n  Top Rechtsgebiete:');
      for (const a of areaCDAgg) {
        console.log(`    ${(a._id || 'ohne_area').padEnd(25)} ${a.count}`);
      }
    }

    // 3 Beispiel-Einträge
    const sampleDecisions = await db.collection('courtdecisions').find({})
      .limit(3)
      .project({ caseNumber: 1, court: 1, legalArea: 1, decisionDate: 1, sourceUrl: 1 })
      .toArray();
    if (sampleDecisions.length > 0) {
      console.log('\n  Beispiele:');
      for (const d of sampleDecisions) {
        const date = d.decisionDate ? new Date(d.decisionDate).toISOString().substring(0, 10) : '?';
        const sourceShort = d.sourceUrl ? d.sourceUrl.substring(0, 50) + '...' : '(keine URL)';
        console.log(`    ${(d.court || '?')} ${d.caseNumber || '?'} (${date})`);
        console.log(`      area: ${d.legalArea || '?'}, url: ${sourceShort}`);
      }
    }

    // ─── EMPFEHLUNG ────────────────────────────────────────────────
    console.log('\n\n══════════════════════════════════════════════════════════');
    console.log('  EMPFEHLUNG FÜR PHASE 2');
    console.log('══════════════════════════════════════════════════════════\n');

    const lawsReady = lawsWithEmbedding >= 100;
    const decisionsReady = decisionsWithEmbedding >= 20;

    if (lawsReady && decisionsReady) {
      console.log('  ✅ DATEN AUSREICHEND — Phase 2 kann SOFORT starten.');
      console.log(`     ${lawsWithEmbedding} Gesetze + ${decisionsWithEmbedding} Urteile mit Embeddings.`);
    } else if (lawsReady && !decisionsReady) {
      console.log('  ⚠️  TEILWEISE BEREIT');
      console.log(`     Gesetze: ${lawsWithEmbedding} ✅`);
      console.log(`     Urteile: ${decisionsWithEmbedding} ❌ (mind. 20 empfohlen)`);
      console.log('  → Empfehlung: Mit Gesetzen starten, Urteile später ergänzen.');
    } else if (!lawsReady && decisionsReady) {
      console.log('  ⚠️  TEILWEISE BEREIT');
      console.log(`     Gesetze: ${lawsWithEmbedding} ❌ (mind. 100 empfohlen)`);
      console.log(`     Urteile: ${decisionsWithEmbedding} ✅`);
      console.log('  → Empfehlung: Erst Gesetze synchronisieren (Hauptquelle).');
    } else {
      console.log('  ❌ DATEN UNZUREICHEND — Sync-Vorarbeit nötig.');
      console.log(`     Gesetze: ${lawsWithEmbedding} (mind. 100 empfohlen)`);
      console.log(`     Urteile: ${decisionsWithEmbedding} (mind. 20 empfohlen)`);
      console.log('\n  → Schritte:');
      console.log('     1. Externe Quellen synchronisieren via /api/external-legal/sync');
      console.log('     2. Embeddings generieren');
      console.log('     3. Dann Phase 2 starten');
    }

    console.log('\n══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    console.error(error);
    process.exit(1);
  }
})();

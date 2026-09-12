// 📁 backend/routes/portfolio.js
// 🧭 Portfolio-Cockpit v1 (Phase 1.1b, 12.09.2026) — EIN lesender Endpunkt:
// GET /api/portfolio/summary
//
// Grundsätze (Master-Audit + Vorgaben):
//  - NUR LESEN. contract_events stammt aus der bestehenden Kalender-Logik
//    (Temporal-Zone) und wird hier ausschließlich konsumiert.
//  - Population ist BEWUSST user-scoped (beide userId-Formen, wie Dashboard-
//    Summary). Organisations-Scope kommt im B2B-Minimum-Block: dafür ist die
//    Population in buildPopulationFilter() isoliert und dort erweiterbar,
//    ohne die Aggregation anzufassen.
//  - Sichtbarkeit wie Glocke/„Bald fällig": VISIBLE_EVENT_MATCH blendet die
//    automatischen Vorwarn-Staffeln aus (pro Frist EIN Eintrag).
//  - Keine Finanzzahlen. Score nur aus contractScore. Deckung wird mitgeliefert.
//  - Performance: zwei schlanke Queries mit Projektion, keine Vollobjekte.

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const database = require('../config/database');
const verifyToken = require('../middleware/verifyToken');
const { VISIBLE_EVENT_MATCH } = require('../utils/calendarVisibility');
const { calculateSmartStatusBackend, SMART_STATUS_PROJECTION } = require('../utils/contractStatus');
const {
  bucketFristen, scoreVerteilung, typVerteilung, autoRenewalListe,
  RADAR_EVENT_PROJECTION,
} = require('../utils/portfolioRadar');

let db;
async function ensureDb() { if (!db) db = await database.connect(); }

/** Population: user-scoped, beide gespeicherten userId-Formen (ObjectId + String).
 *  Org-Scope wird HIER ergänzt (B2B-Minimum), nirgendwo sonst. */
function buildPopulationFilter(userId) {
  const varianten = [userId];
  try { varianten.push(new ObjectId(userId)); } catch (_) { /* ungültige id */ }
  return { userId: { $in: varianten } };
}

router.get('/summary', verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const population = buildPopulationFilter(req.user.userId);
    const jetzt = new Date();
    const in90Tagen = new Date(jetzt.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [events, contracts] = await Promise.all([
      db.collection('contract_events')
        .find({
          ...population,
          status: { $in: ['scheduled', 'notified'] },
          date: { $gte: jetzt, $lte: in90Tagen },
          ...VISIBLE_EVENT_MATCH,
        })
        .project(RADAR_EVENT_PROJECTION)
        .sort({ date: 1 })
        .limit(300)
        .toArray(),
      db.collection('contracts')
        .find(population)
        .project({
          ...SMART_STATUS_PROJECTION,
          name: 1, contractScore: 1, contractTypeLabel: 1, isAutoRenewal: 1,
        })
        .toArray(),
    ]);

    // Status-Zählung mit derselben zentralen Regel wie Dashboard/Liste/Filter
    const status = { aktiv: 0, laeuftAb: 0, beendet: 0, sonstige: 0 };
    let aktiveOhneEnddatum = 0;
    for (const c of contracts) {
      let s;
      try { s = calculateSmartStatusBackend(c); } catch { status.sonstige++; continue; }
      if (s === 'Aktiv') {
        status.aktiv++;
        const d = c.expiryDate ? new Date(c.expiryDate) : null;
        if (!d || isNaN(d.getTime())) aktiveOhneEnddatum++;
      } else if (s === 'Läuft ab') status.laeuftAb++;
      else if (s === 'Beendet') status.beendet++;
      else status.sonstige++;
    }

    let analysiert = 0;
    for (const c of contracts) {
      if (c.analyzed === true || (typeof c.contractScore === 'number' && c.contractScore > 0)) analysiert++;
    }

    res.json({
      success: true,
      generatedAt: jetzt.toISOString(),
      population: 'user', // 🔎 bewusst dokumentiert: noch KEIN Org-Scope (B2B-Minimum-Block)
      fristenRadar: bucketFristen(events, jetzt, 5),
      autoRenewals: autoRenewalListe(contracts, jetzt, 5),
      status,
      score: scoreVerteilung(contracts),
      typen: typVerteilung(contracts, 6),
      deckung: {
        gesamt: contracts.length,
        analysiert,
        aktiveOhneEnddatum,
        radarEventsBetrachtet: events.length,
      },
    });
  } catch (error) {
    console.error('❌ [PORTFOLIO] summary fehlgeschlagen:', error?.message);
    res.status(500).json({ success: false, message: 'Portfolio-Übersicht konnte nicht geladen werden' });
  }
});

module.exports = router;

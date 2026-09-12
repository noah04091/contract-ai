// 📁 backend/utils/portfolioRadar.js
// 🧭 Portfolio-Cockpit v1 (Phase 1.1b, 12.09.2026) — PURE Aggregations-Helfer.
//
// Datenvertrag (Master-Audit + Noahs Vorgaben):
//  - Fristen kommen AUSSCHLIESSLICH aus contract_events (vorberechnet durch die
//    bestehende Kalender-Logik). Hier wird KEINE eigene Fristenlogik erfunden,
//    nichts an der Temporal-Zone verändert — nur gelesen und gebündelt.
//  - Zeitfenster: 0–30 / 31–60 / 61–90 Tage.
//  - confidence / isEstimated / severity werden durchgereicht, damit die UI
//    Schätzungen anders darstellen kann als sichere Daten.
//  - KEINE Finanzzahlen (bewusst, bis Währung/Frequenz/Deckung belastbar sind).
//  - Score-Quelle ist contractScore (bei jeder Analyse geschrieben) — NIE die
//    tote Quelle legalPulse.riskScore.
//  - Fehlende Daten werden nicht versteckt: Deckungszähler gehören zur Antwort.
//
// Alle Funktionen sind pur (keine DB, kein Datum "jetzt" implizit) → testbar.

const TAG_MS = 24 * 60 * 60 * 1000;

/** Kalendertage von heute (Mitternacht) bis zum Datum; null bei ungültig. */
function kalenderTageBis(datum, jetzt) {
  const d = new Date(datum);
  if (isNaN(d.getTime())) return null;
  const ziel = new Date(d); ziel.setHours(0, 0, 0, 0);
  const heute = new Date(jetzt); heute.setHours(0, 0, 0, 0);
  return Math.round((ziel.getTime() - heute.getTime()) / TAG_MS);
}

/**
 * Bündelt sichtbare, zukünftige Fristen-Events in die Radar-Fenster.
 * @param {Array} events - schlanke contract_events (title, type, date, severity,
 *                         confidence, isEstimated, contractId, metadata?)
 * @param {Date} jetzt
 * @param {number} maxJeFenster - Listeneinträge je Fenster (Zählwerte immer voll)
 */
function bucketFristen(events, jetzt, maxJeFenster = 5) {
  const fenster = {
    tage0bis30: { anzahl: 0, geschaetzt: 0, eintraege: [] },
    tage31bis60: { anzahl: 0, geschaetzt: 0, eintraege: [] },
    tage61bis90: { anzahl: 0, geschaetzt: 0, eintraege: [] },
  };
  const sortiert = [...(events || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const e of sortiert) {
    const tage = kalenderTageBis(e.date, jetzt);
    if (tage === null || tage < 0 || tage > 90) continue;
    const ziel = tage <= 30 ? fenster.tage0bis30 : tage <= 60 ? fenster.tage31bis60 : fenster.tage61bis90;
    ziel.anzahl++;
    const geschaetzt = e.isEstimated === true;
    if (geschaetzt) ziel.geschaetzt++;
    if (ziel.eintraege.length < maxJeFenster) {
      ziel.eintraege.push({
        eventId: e._id ? String(e._id) : undefined,
        contractId: e.contractId ? String(e.contractId) : undefined,
        titel: e.title || '',
        vertrag: e.metadata?.contractName || null,
        typ: e.type || '',
        datum: e.date,
        inTagen: tage,
        severity: e.severity || 'info',
        confidence: typeof e.confidence === 'number' ? e.confidence : null,
        istGeschaetzt: geschaetzt,
      });
    }
  }
  return fenster;
}

/** Score-Verteilung über contractScore; nicht analysierte als eigener Eimer. */
function scoreVerteilung(contracts) {
  const v = { kritischUnter40: 0, mittel40bis69: 0, gut70plus: 0, nichtAnalysiert: 0 };
  for (const c of contracts || []) {
    const analysiert = c.analyzed === true || (typeof c.contractScore === 'number' && c.contractScore > 0);
    const score = typeof c.contractScore === 'number' ? c.contractScore : null;
    if (!analysiert || score === null) { v.nichtAnalysiert++; continue; }
    if (score < 40) v.kritischUnter40++;
    else if (score < 70) v.mittel40bis69++;
    else v.gut70plus++;
  }
  return v;
}

/**
 * Vertragsarten-Verteilung über contractTypeLabel, NUR echte Verträge
 * (documentType === 'CONTRACT'); alles andere ehrlich als andereDokumente.
 */
function typVerteilung(contracts, maxTypen = 6) {
  const zaehler = new Map();
  let andereDokumente = 0;
  let vertraegeOhneLabel = 0;
  for (const c of contracts || []) {
    if (c.documentType !== 'CONTRACT') { andereDokumente++; continue; }
    const label = typeof c.contractTypeLabel === 'string' && c.contractTypeLabel.trim() !== ''
      ? c.contractTypeLabel.trim() : null;
    if (!label) { vertraegeOhneLabel++; continue; }
    zaehler.set(label, (zaehler.get(label) || 0) + 1);
  }
  const sortiert = [...zaehler.entries()].sort((a, b) => b[1] - a[1]);
  const top = sortiert.slice(0, maxTypen).map(([label, anzahl]) => ({ label, anzahl }));
  const weitere = sortiert.slice(maxTypen).reduce((s, [, n]) => s + n, 0);
  return { top, weitere, vertraegeOhneLabel, andereDokumente };
}

/**
 * Verträge mit automatischer Verlängerung (nur belegtes isAutoRenewal:true).
 * KEINE Verlängerungsdauer — autoRenewMonths wird von der Analyse nicht extrahiert,
 * jede Monatsangabe wäre geraten (Audit-Befund).
 */
function autoRenewalListe(contracts, jetzt, maxEintraege = 5) {
  const treffer = (contracts || []).filter((c) => c.isAutoRenewal === true);
  const mitTagen = treffer.map((c) => {
    const tage = c.expiryDate ? kalenderTageBis(c.expiryDate, jetzt) : null;
    return {
      contractId: c._id ? String(c._id) : undefined,
      name: c.name || 'Unbenannter Vertrag',
      ablaufDatum: c.expiryDate || null,
      ablaufInTagen: tage,
    };
  });
  // Nächstliegende zuerst; ohne Datum ans Ende
  mitTagen.sort((a, b) => {
    if (a.ablaufInTagen === null) return 1;
    if (b.ablaufInTagen === null) return -1;
    return a.ablaufInTagen - b.ablaufInTagen;
  });
  return { anzahl: treffer.length, eintraege: mitTagen.slice(0, maxEintraege) };
}

/** Deckungszähler — fehlende Daten sichtbar machen statt verstecken. */
function deckung(contracts, statusZaehlung) {
  const gesamt = (contracts || []).length;
  let analysiert = 0;
  let aktiveOhneEnddatum = 0;
  for (const c of contracts || []) {
    if (c.analyzed === true || (typeof c.contractScore === 'number' && c.contractScore > 0)) analysiert++;
  }
  // "aktiv ohne erkanntes Enddatum" braucht den berechneten Status je Vertrag
  for (const c of statusZaehlung?.aktiveOhneEnddatumDocs || []) { void c; aktiveOhneEnddatum++; }
  return { gesamt, analysiert, aktiveOhneEnddatum };
}

// Schlanke Projektionen für die Route (eine Quelle, keine Vollobjekte zum Client)
// metadata.contractName: Smoke-Test 12.09. — generische Titel („Kündigungsfrist
// während der Probezeit") verrieten nicht, WELCHER Vertrag gemeint ist.
const RADAR_EVENT_PROJECTION = {
  title: 1, type: 1, date: 1, severity: 1, confidence: 1, isEstimated: 1, contractId: 1,
  'metadata.contractName': 1,
};

module.exports = {
  kalenderTageBis,
  bucketFristen,
  scoreVerteilung,
  typVerteilung,
  autoRenewalListe,
  deckung,
  RADAR_EVENT_PROJECTION,
};

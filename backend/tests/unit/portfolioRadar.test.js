// 📁 backend/tests/unit/portfolioRadar.test.js
// 🧭 Cockpit v1 Phase 1.1b — Aggregations-Helfer (pur, ohne DB).
// Pflichtfälle: 0/1/mehrere Verträge · keine Fristen · Fenster 30/60/90 ·
// geschätzte Fristen · Auto-Renewal true/false · fehlende Felder · Altbestand.

const {
  kalenderTageBis, bucketFristen, scoreVerteilung, typVerteilung, autoRenewalListe,
} = require('../../utils/portfolioRadar');

const JETZT = new Date('2026-09-12T10:00:00Z');
const inTagen = (n) => new Date(JETZT.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

describe('kalenderTageBis', () => {
  test('Kalendertage, nicht Zeitdifferenz (12:00-UTC-Event morgen = 1)', () => {
    expect(kalenderTageBis(inTagen(1), JETZT)).toBe(1);
    expect(kalenderTageBis(JETZT, JETZT)).toBe(0);
    expect(kalenderTageBis('kaputt', JETZT)).toBeNull();
  });
});

describe('bucketFristen — Fenster 0-30 / 31-60 / 61-90', () => {
  test('leer: keine Fristen → alle Fenster 0, keine Einträge', () => {
    const f = bucketFristen([], JETZT);
    expect(f.tage0bis30.anzahl).toBe(0);
    expect(f.tage31bis60.anzahl).toBe(0);
    expect(f.tage61bis90.anzahl).toBe(0);
    expect(f.tage0bis30.eintraege).toEqual([]);
  });

  test('Fenstergrenzen exakt: 0, 30, 31, 60, 61, 90 richtig einsortiert; 91 & Vergangenheit raus', () => {
    const events = [0, 30, 31, 60, 61, 90, 91, -1].map((t, i) => ({
      _id: `e${i}`, title: `F${t}`, type: 'LAST_CANCEL_DAY', date: inTagen(t), severity: 'critical',
    }));
    const f = bucketFristen(events, JETZT);
    expect(f.tage0bis30.anzahl).toBe(2);   // 0 + 30
    expect(f.tage31bis60.anzahl).toBe(2);  // 31 + 60
    expect(f.tage61bis90.anzahl).toBe(2);  // 61 + 90
    const alle = [...f.tage0bis30.eintraege, ...f.tage31bis60.eintraege, ...f.tage61bis90.eintraege];
    expect(alle.map(e => e.titel)).not.toContain('F91');
    expect(alle.map(e => e.titel)).not.toContain('F-1');
  });

  test('geschätzte Fristen werden gezählt UND je Eintrag markiert', () => {
    const f = bucketFristen([
      { title: 'sicher', date: inTagen(5), isEstimated: false, confidence: 90 },
      { title: 'geschätzt', date: inTagen(6), isEstimated: true, confidence: 40 },
    ], JETZT);
    expect(f.tage0bis30.anzahl).toBe(2);
    expect(f.tage0bis30.geschaetzt).toBe(1);
    const g = f.tage0bis30.eintraege.find(e => e.titel === 'geschätzt');
    expect(g.istGeschaetzt).toBe(true);
    expect(g.confidence).toBe(40);
  });

  test('Listen-Cap greift nur für Einträge, nie für Zählwerte; Sortierung nach Datum', () => {
    const events = Array.from({ length: 9 }, (_, i) => ({ title: `T${i}`, date: inTagen(9 - i) }));
    const f = bucketFristen(events, JETZT, 3);
    expect(f.tage0bis30.anzahl).toBe(9);
    expect(f.tage0bis30.eintraege).toHaveLength(3);
    expect(f.tage0bis30.eintraege.map(e => e.inTagen)).toEqual([1, 2, 3]);
  });

  test('Altbestand: Event ohne severity/confidence/contractId crasht nicht', () => {
    const f = bucketFristen([{ title: 'alt', date: inTagen(10) }], JETZT);
    expect(f.tage0bis30.eintraege[0]).toMatchObject({ severity: 'info', confidence: null, istGeschaetzt: false });
  });
});

describe('scoreVerteilung — Quelle contractScore, NIE legalPulse.riskScore', () => {
  test('0 / 1 / mehrere Verträge inkl. nicht analysierter', () => {
    expect(scoreVerteilung([])).toEqual({ kritischUnter40: 0, mittel40bis69: 0, gut70plus: 0, nichtAnalysiert: 0 });
    expect(scoreVerteilung([{ analyzed: true, contractScore: 85 }]).gut70plus).toBe(1);
    const v = scoreVerteilung([
      { analyzed: true, contractScore: 20 },
      { analyzed: true, contractScore: 40 },
      { analyzed: true, contractScore: 69 },
      { analyzed: true, contractScore: 70 },
      { analyzed: false },                       // Upload ohne Analyse (Altbestand)
      { name: 'ganz alt, keine Felder' },        // fehlende Felder
    ]);
    expect(v).toEqual({ kritischUnter40: 1, mittel40bis69: 2, gut70plus: 1, nichtAnalysiert: 2 });
  });
});

describe('typVerteilung — nur documentType CONTRACT, Rest ehrlich getrennt', () => {
  test('Nicht-Verträge und fehlende Label landen in eigenen Eimern', () => {
    const t = typVerteilung([
      { documentType: 'CONTRACT', contractTypeLabel: 'Mietvertrag' },
      { documentType: 'CONTRACT', contractTypeLabel: 'Mietvertrag' },
      { documentType: 'CONTRACT', contractTypeLabel: 'Arbeitsvertrag' },
      { documentType: 'CONTRACT' },              // analysiert, aber ohne Label (Altbestand)
      { documentType: 'INVOICE', contractTypeLabel: 'Rechnung' },
      { name: 'uralt ohne documentType' },       // 388/976-Klasse aus dem Audit
    ]);
    expect(t.top[0]).toEqual({ label: 'Mietvertrag', anzahl: 2 });
    expect(t.top[1]).toEqual({ label: 'Arbeitsvertrag', anzahl: 1 });
    expect(t.vertraegeOhneLabel).toBe(1);
    expect(t.andereDokumente).toBe(2);
  });
});

describe('autoRenewalListe — nur belegtes isAutoRenewal, keine geratene Dauer', () => {
  test('true/false/fehlend + Sortierung nach nächstem Ablauf, ohne Datum ans Ende', () => {
    const r = autoRenewalListe([
      { _id: '1', name: 'A', isAutoRenewal: true, expiryDate: inTagen(50) },
      { _id: '2', name: 'B', isAutoRenewal: true, expiryDate: inTagen(10) },
      { _id: '3', name: 'C', isAutoRenewal: true },                 // ohne Enddatum
      { _id: '4', name: 'D', isAutoRenewal: false },
      { _id: '5', name: 'E' },                                       // Feld fehlt (Altbestand)
    ], JETZT);
    expect(r.anzahl).toBe(3);
    expect(r.eintraege.map(e => e.name)).toEqual(['B', 'A', 'C']);
    expect(r.eintraege[0].ablaufInTagen).toBe(10);
    expect(r.eintraege[2].ablaufInTagen).toBeNull();
    // bewusst KEIN Feld für Verlängerungsdauer (autoRenewMonths wird nicht extrahiert)
    expect(Object.keys(r.eintraege[0])).not.toContain('verlaengerungMonate');
  });
});

describe('Route + Mount — Source-Scans', () => {
  const fs = require('fs');
  const path = require('path');
  const routeSrc = fs.readFileSync(path.join(__dirname, '../../routes/portfolio.js'), 'utf8');
  const serverSrc = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');

  test('Route ist mit verifyToken geschützt und unter /api/portfolio gemountet', () => {
    expect(routeSrc).toMatch(/router\.get\('\/summary',\s*verifyToken,/);
    expect(serverSrc).toMatch(/app\.use\("\/api\/portfolio",\s*require\("\.\/routes\/portfolio"\)\)/);
  });

  test('Radar liest NUR contract_events mit Sichtbarkeitsfilter — keine eigene Fristenlogik', () => {
    expect(routeSrc).toContain('VISIBLE_EVENT_MATCH');
    expect(routeSrc).toContain("collection('contract_events')");
    // Verbotene Quellen/Muster: tote Risiko-Quelle, Temporal-Berechnungen
    expect(routeSrc).not.toContain('legalPulse.riskScore');
    expect(routeSrc).not.toContain('subtractNoticePeriod');
  });

  test('Status nutzt die zentrale Regel (calculateSmartStatusBackend)', () => {
    expect(routeSrc).toContain('calculateSmartStatusBackend');
  });
});

// 📁 backend/tests/unit/cockpitDataContract.test.js
// 🧭 Cockpit Phase 1.1a (12.09.2026) — Datenhygiene-Zusicherungen:
//  1) contractType wird in BEIDEN Analyse-Speicherpfaden persistiert (wurde vorher
//     extrahiert und auf dem letzten Meter verworfen → Pulse-Typgruppen "unbekannt",
//     Export-Spalte leer).
//  2) Der isAutoRenewal-Feldnamen-Bug ist behoben: Portfolio-Aggregator und
//     Pulse-Kontext lesen das ECHTE Persistenzfeld (die Analyse schreibt
//     isAutoRenewal; ein Feld 'autoRenewal' existiert am Vertrag nicht — dadurch
//     waren autoRenewalRisks/Auto-Renewal-Insights nachweislich immer leer).
// Source-Scan-Muster (wie contractStatusSingleSource): wird rot, sobald jemand die
// Persistenz wieder entfernt oder den toten Feldnamen zurückbringt.

const fs = require('fs');
const path = require('path');
const lese = (p) => fs.readFileSync(path.join(__dirname, '../../', p), 'utf8');

describe('1) contractType-Persistenz in analyze.js', () => {
  const src = lese('routes/analyze.js');

  test('Neu-Anlage (saveContractWithUpload) persistiert contractType', () => {
    expect(src).toMatch(/contractType:\s*analysisData\.contractType\s*\|\|\s*null/);
  });

  test('Re-Analyse (updateData) persistiert contractType', () => {
    expect(src).toMatch(/contractType:\s*extractedContractType\s*\|\|\s*null/);
  });

  test('bewusst NICHT persistiert in 1.1a: minimumTerm/canCancelAfterDate bleiben NUR im internen Analyse-Objekt', () => {
    // Beide existieren legitim GENAU EINMAL (contractAnalysisData, internes Objekt).
    // Ein zweites Vorkommen hieße: jemand persistiert sie am Vertrag — das würde
    // calendarEvents-Verhalten ändern (canCancelAfterDate-Zweig, Temporal-Zone) und
    // muss eine BEWUSSTE, abgestimmte Änderung sein → dann diesen Test anpassen.
    // Baseline 12.09.2026: exakt 3 interne Vorkommen (Zeilen ~5827/5846/6935 —
    // Zwischenobjekte + contractAnalysisData). Ein VIERTES hieße Persistenz am Vertrag.
    const minimumTermZeilen = src.match(/^\s*minimumTerm:\s*extractedMinimumTerm/gm) || [];
    const canCancelZeilen = src.match(/^\s*canCancelAfterDate:\s*extractedCanCancelAfterDate/gm) || [];
    expect(minimumTermZeilen.length).toBe(3);
    expect(canCancelZeilen.length).toBe(3);
  });
});

describe('2) isAutoRenewal-Feldname in den Pulse-Portfolio-Pfaden', () => {
  const aggregator = lese('services/legalPulseV2/utils/portfolioAggregator.js');
  const kontext = lese('services/legalPulseV2/stages/01-contextGathering.js');

  test('portfolioAggregator projiziert und liest isAutoRenewal', () => {
    expect(aggregator).toMatch(/isAutoRenewal:\s*1/);
    expect(aggregator).toMatch(/c\.isAutoRenewal\s*\|\|\s*false/);
    // der tote Lese-Zugriff darf nicht zurückkommen
    expect(aggregator).not.toMatch(/c\.autoRenewal\s*\|\|/);
    expect(aggregator).not.toMatch(/^\s*autoRenewal:\s*1,/m);
  });

  test('01-contextGathering projiziert und liest isAutoRenewal', () => {
    expect(kontext).toMatch(/isAutoRenewal:\s*1/);
    expect(kontext).toMatch(/contract\.isAutoRenewal\s*\|\|\s*false/);
    expect(kontext).not.toMatch(/contract\.autoRenewal\s*\|\|/);
  });

  test('Die Analyse schreibt tatsächlich isAutoRenewal (Gegenprobe der Quellseite)', () => {
    const analyze = lese('routes/analyze.js');
    expect(analyze).toMatch(/isAutoRenewal:\s*analysisData\.isAutoRenewal\s*\|\|\s*false/);
    expect(analyze).toMatch(/isAutoRenewal:\s*extractedIsAutoRenewal\s*\|\|\s*false/);
  });
});

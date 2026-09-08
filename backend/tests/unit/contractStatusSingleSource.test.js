// 📁 backend/tests/unit/contractStatusSingleSource.test.js
// QA-Punkt 1 (08.09.2026, BUG-006/009): Status-Wahrheit hat genau EINE Quelle.
//
// Absicherungen:
//  A) utils/contractStatus.js liefert für jede Branch das erwartete Label (Verhaltens-Fixierung
//     nach der Auslagerung aus routes/contracts.js — die Logik durfte sich NICHT ändern).
//  B) Jedes erreichbare Label ist über einen STATUS_FILTER_BUCKETS-Eimer filterbar
//     (BUG-009: vorher fielen „Offen/Erhalten/Bezahlt/Pausiert" durch → 26 Verträge unerreichbar).
//  C) Die Dashboard-Summary (dashboardNotifications.js) nutzt calculateSmartStatusBackend und
//     enthält KEINE eigene expiryDate-Zählregel mehr (BUG-006: 141 vs. 115 „Aktiv").
// B+C sind Source-Scans (Muster wie die Static-Coverage-Tests des Cost-Trackings): sie werden
// rot, sobald jemand eine zweite Zählregel oder ein ungefiltertes Label einführt.

const fs = require('fs');
const path = require('path');
const { calculateSmartStatusBackend, SMART_STATUS_PROJECTION } = require('../../utils/contractStatus');

const inTage = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

// Alle Labels, die calculateSmartStatusBackend zurückgeben kann (aus dem Code abgeleitet):
const ALLE_LABELS = [
  'Erhalten', 'Beendet', 'Gekündigt', 'Gekündigt ✓', 'Gekündigt — offen',
  'Bezahlt', 'Offen', 'Aktiv', 'Läuft ab', 'Pausiert', 'Entwurf', 'Optimiert', 'Neu'
];

describe('A) calculateSmartStatusBackend — Verhaltens-Fixierung nach Auslagerung', () => {
  const faelle = [
    [{ documentType: 'LETTER' }, 'Erhalten'],
    [{ documentCategory: 'letter' }, 'Erhalten'],
    [{ documentCategory: 'cancellation_confirmation', gekuendigtZum: inTage(-10) }, 'Beendet'],
    [{ gekuendigtZum: inTage(30) }, 'Gekündigt'],
    [{ documentCategory: 'cancellation_confirmation' }, 'Gekündigt'],
    [{ status: 'gekündigt' }, 'Gekündigt — offen'],
    [{ status: 'gekündigt', cancellationConfirmed: true }, 'Gekündigt ✓'],
    [{ cancellationId: 'x' }, 'Gekündigt — offen'],
    [{ documentType: 'INVOICE', paymentStatus: 'paid' }, 'Bezahlt'],
    [{ documentType: 'INVOICE' }, 'Offen'],
    [{ statusOverride: true, status: 'pausiert' }, 'Pausiert'],
    [{ statusOverride: true, status: 'active' }, 'Aktiv'],
    [{ expiryDate: inTage(60) }, 'Aktiv'],
    [{ expiryDate: inTage(10) }, 'Läuft ab'],
    [{ expiryDate: inTage(-40), createdAt: inTage(-400) }, 'Beendet'],
    // Plausibilitäts-Branch: frisch hochgeladen mit sehr altem Datum → Aktiv
    [{ expiryDate: inTage(-100), createdAt: inTage(-3) }, 'Aktiv'],
    [{ status: 'entwurf' }, 'Entwurf'],
    [{ status: 'pausiert' }, 'Pausiert'],
    [{ isGenerated: true }, 'Entwurf'],
    [{ isOptimized: true }, 'Optimiert'],
    [{}, 'Neu'],
    [{ analyzed: true }, 'Aktiv'],
  ];
  test.each(faelle)('%j → %s', (vertrag, erwartet) => {
    expect(calculateSmartStatusBackend(vertrag)).toBe(erwartet);
  });

  test('alle Testfall-Labels zusammen decken die komplette Label-Liste ab', () => {
    const gesehen = new Set(faelle.map(([, l]) => l));
    for (const label of ALLE_LABELS) expect(gesehen).toContain(label);
  });

  test('SMART_STATUS_PROJECTION enthält jedes Feld, das die Funktion liest', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../utils/contractStatus.js'), 'utf8');
    const gelesen = [...new Set([...src.matchAll(/contract\.([A-Za-z]+)/g)].map(m => m[1]))];
    for (const feld of gelesen) {
      expect(Object.keys(SMART_STATUS_PROJECTION)).toContain(feld);
    }
  });
});

describe('B) STATUS_FILTER_BUCKETS — jedes Label ist filterbar (BUG-009)', () => {
  const contractsSrc = fs.readFileSync(path.join(__dirname, '../../routes/contracts.js'), 'utf8');
  const bucketBlock = contractsSrc.match(/const STATUS_FILTER_BUCKETS = \{[\s\S]*?\n\};/);

  test('Bucket-Definition existiert', () => {
    expect(bucketBlock).not.toBeNull();
  });

  test.each(ALLE_LABELS)('Label "%s" steht in einem Eimer', (label) => {
    expect(bucketBlock[0]).toContain(`'${label}'`);
  });

  test('Sidebar-Zählschleife kennt die vier vorher ungezählten Status', () => {
    for (const label of ['Erhalten', 'Offen', 'Bezahlt', 'Pausiert']) {
      expect(contractsSrc).toContain(`smartStatus === '${label}'`);
    }
  });
});

describe('C) Dashboard-Summary — dieselbe Zählregel wie die Liste (BUG-006)', () => {
  const dashSrc = fs.readFileSync(path.join(__dirname, '../../routes/dashboardNotifications.js'), 'utf8');

  test('nutzt calculateSmartStatusBackend aus utils/contractStatus', () => {
    expect(dashSrc).toMatch(/require\("\.\.\/utils\/contractStatus"\)/);
    expect(dashSrc).toContain('calculateSmartStatusBackend(');
  });

  test('keine eigene expiryDate-Aggregationsregel für "active" mehr', () => {
    // Die alte Regel zählte { $gt: ["$expiryDate", in30Days] } als "aktiv" —
    // taucht so eine $expiryDate-Vergleichs-Aggregation wieder auf, ist die
    // zweite Zählregel zurück und dieser Test wird rot.
    expect(dashSrc).not.toMatch(/\$gt:\s*\[\s*"\$expiryDate"/);
    expect(dashSrc).not.toMatch(/\$lte:\s*\[\s*"\$expiryDate"/);
  });
});

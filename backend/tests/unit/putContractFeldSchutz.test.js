// 📁 backend/tests/unit/putContractFeldSchutz.test.js
// 24.08.2026 — Sicherheits-Durchgang Schritt 2/6.
// PUT /api/contracts/:id uebernahm `{...req.body}` und loeschte nur userId/_id.
// Damit war u.a. `unlock.paid` selbst setzbar → 4,90€-Einmalkauf umgehbar.
// Diese Tests spiegeln die SPERR-LISTE aus contracts.js und pruefen BEIDE Richtungen:
// legitime Bearbeitungsfelder muessen durch, sicherheitsrelevante muessen raus.

const fs = require('fs');
const path = require('path');

// Wir testen die Filter-Logik ueber die Quelltext-Sperr-Liste (die Route ist zu
// verflochten fuer einen isolierten Import) UND simulieren den Filter 1:1.
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'routes', 'contracts.js'), 'utf8');

function sperrlisteAusQuelltext() {
  const m = src.match(/const GESPERRTE_FELDER = \[([\s\S]*?)\];/);
  if (!m) throw new Error('GESPERRTE_FELDER nicht gefunden');
  return m[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
}

// Reproduziert exakt, was die Route tut: spread + updatedAt + delete-Schleife.
function filtere(body) {
  const updateData = { ...body, updatedAt: new Date() };
  const gesperrt = new Set(sperrlisteAusQuelltext());
  for (const s of Object.keys(updateData)) {
    if (s.startsWith('$') || gesperrt.has(s.split('.')[0])) delete updateData[s];
  }
  return updateData;
}

describe('PUT /contracts/:id — gefaehrliche Felder werden entfernt', () => {
  test('🔴 unlock (4,90€-Umgehung) wird entfernt', () => {
    expect(filtere({ unlock: { paid: true } })).not.toHaveProperty('unlock');
  });
  test('🔴 fremder s3Key + Varianten werden entfernt', () => {
    const r = filtere({ s3Key: 'contracts/fremd.pdf', optimizedPdfS3Key: 'x', sealedS3Key: 'y' });
    expect(r).not.toHaveProperty('s3Key');
    expect(r).not.toHaveProperty('optimizedPdfS3Key');
    expect(r).not.toHaveProperty('sealedS3Key');
  });
  test('🔴 analyzed/analyzedAt (Gate-Umgehung) werden entfernt', () => {
    const r = filtere({ analyzed: false, analyzedAt: '2020-01-01' });
    expect(r).not.toHaveProperty('analyzed');
    expect(r).not.toHaveProperty('analyzedAt');
  });
  test('🔴 Besitz/Org (userId, organizationId) werden entfernt', () => {
    const r = filtere({ userId: 'fremd', organizationId: 'fremdeOrg', isGenerated: true });
    expect(r).not.toHaveProperty('userId');
    expect(r).not.toHaveProperty('organizationId');
    expect(r).not.toHaveProperty('isGenerated');
  });
});

describe('⚠️ legitime Bearbeitungsfelder bleiben ERHALTEN (kein Aussperren)', () => {
  test('die echten Editor-Felder gehen alle durch', () => {
    const legit = {
      name: 'Mein Vertrag', notes: 'Notiz', kosten: 12.5,
      kuendigung: '3 Monate', laufzeit: '24 Monate',
      startDate: '2026-01-01', expiryDate: '2027-01-01', gekuendigtZum: null,
      anbieter: 'Telekom', provider: 'Telekom', vertragsnummer: 'V-123',
      contractNumber: 'V-123', contractType: 'telecom', customerNumber: 'K-9',
      paymentFrequency: 'monatlich', paymentMethod: 'SEPA', content: 'Text',
      folderId: 'abc', tags: ['wichtig'], status: 'aktiv'
    };
    const r = filtere(legit);
    for (const k of Object.keys(legit)) {
      expect(r).toHaveProperty(k);
    }
  });
  test('updatedAt wird gesetzt', () => {
    expect(filtere({ name: 'x' })).toHaveProperty('updatedAt');
  });
});

describe('Vollstaendigkeit der Sperr-Liste', () => {
  test('alle bekannten Gefahr-Felder sind gelistet', () => {
    const liste = sperrlisteAusQuelltext();
    for (const muss of ['unlock', 's3Key', 'analyzed', 'analyzedAt', 'userId', '_id', 'organizationId', 'isGenerated', 'fileHash']) {
      expect(liste).toContain(muss);
    }
  });
});

describe('🔴 NACHZUG: Punkt-Schluessel + $-Operatoren (Hintertuer-Bypass)', () => {
  test('unlock.paid (verschachtelter Pfad) wird entfernt — der eigentliche 4,90€-Bypass', () => {
    const r = filtere({ 'unlock.paid': true });
    expect(Object.keys(r)).not.toContain('unlock.paid');
  });
  test('s3Key.irgendwas wird ebenfalls entfernt', () => {
    expect(Object.keys(filtere({ 's3Key.x': 'y' }))).not.toContain('s3Key.x');
  });
  test('$-Operatoren werden entfernt', () => {
    const r = filtere({ '$rename': 'x', '$set': {} });
    expect(r).not.toHaveProperty('$rename');
    expect(r).not.toHaveProperty('$set');
  });
  test('⚠️ ein legitimes Feld mit Punkt (falls es je eins gaebe) OHNE gesperrtes Praefix bleibt', () => {
    // z.B. ein hypothetisches "meta.note" — Praefix "meta" ist nicht gesperrt.
    expect(Object.keys(filtere({ 'meta.note': 'hallo' }))).toContain('meta.note');
  });
});

// 📁 backend/tests/unit/orgContractAccessGuard.test.js
// 18.08.2026: Eine ungueltige Vertrags-ID ist "nicht gefunden", kein Serverfehler.
//
// Vorher warf `new ObjectId(contractId)` in findContractWithOrgAccess einen BSONError,
// der in den Auffangbloecken der 48 Aufrufstellen (contracts/optimize/chat/legalLens/
// legalLensV2) als HTTP 500 landete — ein Serverfehler fuer einen reinen Eingabefall.
// Seit der 5xx-Alarmierung vom 17.08. loeste jede alte Verknuepfung und jeder Tippfehler
// in der Adresse zusaetzlich eine Alarmmail aus. Als Testausloeser fuer den Live-Beweis
// war das praktisch, im Betrieb ist es Laerm.
//
// Zusicherung hier: ungueltige ID -> null (alle Aufrufer antworten darauf mit 404),
// gueltige ID -> normale Abfrage laeuft weiter.

// Die Funktion fragt bei GUELTIGER ID zuerst die Org-Mitgliedschaft ab. Ohne diese
// Attrappe wuerde Mongoose ohne Datenbankverbindung blockieren (Tests liefen in die
// Zeitueberschreitung) — die Attrappe liefert "keine Mitgliedschaft".
jest.mock('../../models/OrganizationMember', () => ({ findOne: jest.fn(async () => null) }));

const { findContractWithOrgAccess, findContractWithOrgAccessMongoose } = require('../../utils/orgContractAccess');

const USER = '6a0857775d71e172609ada21';
const GUELTIGE_ID = '68abc4f1d2e9aa0011223344';

// Sammlung/Model, die sofort auffliegen wuerden, wenn der Waechter NICHT greift:
// Sie wuerden abgefragt, obwohl die ID unbrauchbar ist.
function sammlungMitZaehler() {
  const zaehler = { findOne: 0 };
  return { zaehler, collection: { findOne: async () => { zaehler.findOne++; return null; } } };
}

const UNGUELTIG = [
  'kaputt',
  'nicht-vorhanden@example.invalid',
  '68abc4f1d2e9aa001122334',      // 23 Zeichen, eins zu kurz
  '68abc4f1d2e9aa00112233445',    // 25 Zeichen, eins zu lang
  'zzzzzzzzzzzzzzzzzzzzzzzz',     // 24 Zeichen, aber kein Hex
  '',
  null,
  undefined
];

describe('findContractWithOrgAccess: ungueltige Vertrags-ID', () => {
  test.each(UNGUELTIG.map((v) => [String(v)]))('liefert null statt zu werfen: %s', async (roh) => {
    const wert = roh === 'null' ? null : roh === 'undefined' ? undefined : roh;
    const { zaehler, collection } = sammlungMitZaehler();
    await expect(findContractWithOrgAccess(collection, USER, wert)).resolves.toBeNull();
    // Waechter greift VOR jeder Abfrage — keine unnoetige Last auf der Datenbank.
    expect(zaehler.findOne).toBe(0);
  });

  test('eine gueltige ID laeuft normal weiter (Waechter blockt nicht zu viel)', async () => {
    const { zaehler, collection } = sammlungMitZaehler();
    const ergebnis = await findContractWithOrgAccess(collection, USER, GUELTIGE_ID);
    expect(ergebnis).toBeNull();      // kein Treffer in der Attrappe
    expect(zaehler.findOne).toBe(1);  // aber die Abfrage HAT stattgefunden
  });
});

describe('findContractWithOrgAccessMongoose: derselbe Schutz', () => {
  test('ungueltige ID liefert null, ohne das Model zu befragen', async () => {
    let befragt = 0;
    const Model = { findOne: async () => { befragt++; return null; } };
    await expect(findContractWithOrgAccessMongoose(Model, USER, 'kaputt')).resolves.toBeNull();
    expect(befragt).toBe(0);
  });

  test('gueltige ID befragt das Model', async () => {
    let befragt = 0;
    const Model = { findOne: async () => { befragt++; return null; } };
    await findContractWithOrgAccessMongoose(Model, USER, GUELTIGE_ID);
    expect(befragt).toBe(1);
  });
});

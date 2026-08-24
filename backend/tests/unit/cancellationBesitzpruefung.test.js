// 📁 backend/tests/unit/cancellationBesitzpruefung.test.js
// 24.08.2026 — Sicherheits-Durchgang Schritt 3/6.
// POST /api/cancellations/send setzte einen Vertrag per contractId (aus req.body) auf
// status:"gekündigt", OHNE zu pruefen, wem er gehoert → ein Eingeloggter konnte einen
// FREMDEN Vertrag kuendigen. Fix: findContractWithOrgAccess vor jeder Mutation.
//
// Wir testen den GETEILTEN Helfer direkt (die Route selbst ist zu verflochten fuer einen
// isolierten Import). Genau dieser Helfer entscheidet ueber Zugriff — eigener Vertrag +
// Org-Team durch, fremd raus.

const { findContractWithOrgAccess } = require('../../utils/orgContractAccess');

// Minimaler Fake einer nativen Collection + OrganizationMember.
jest.mock('../../models/OrganizationMember', () => ({
  findOne: jest.fn(),
}), { virtual: true });
const OrganizationMember = require('../../models/OrganizationMember');

const OID = require('mongodb').ObjectId;
const meins = new OID().toString();
const fremd = new OID().toString();
const vertragId = new OID().toString();

function fakeCollection(contractOwnerId, contractOrgId = null) {
  return {
    findOne: async (filter) => {
      // Simuliert Mongo: matcht _id UND (userId ODER organizationId je nach $or)
      const idOk = String(filter._id) === vertragId;
      if (!idOk) return null;
      if (filter.$or) {
        const ownerOk = filter.$or.some(c => c.userId && String(c.userId) === String(contractOwnerId));
        const orgOk = filter.$or.some(c => c.organizationId && contractOrgId && String(c.organizationId) === String(contractOrgId));
        return (ownerOk || orgOk) ? { _id: new OID(vertragId), userId: new OID(contractOwnerId), organizationId: contractOrgId } : null;
      }
      return (String(filter.userId) === String(contractOwnerId)) ? { _id: new OID(vertragId), userId: new OID(contractOwnerId) } : null;
    }
  };
}

describe('Kuendigung: Besitzpruefung laesst eigenen Vertrag durch, sperrt fremden', () => {
  beforeEach(() => OrganizationMember.findOne.mockReset());

  test('✅ EIGENER Vertrag: Zugriff erlaubt', async () => {
    OrganizationMember.findOne.mockResolvedValue(null); // keine Org
    const r = await findContractWithOrgAccess(fakeCollection(meins), meins, vertragId);
    expect(r).not.toBeNull();
    expect(r.isOwner).toBe(true);
  });

  test('🔴 FREMDER Vertrag: kein Zugriff (→ Route gibt 403)', async () => {
    OrganizationMember.findOne.mockResolvedValue(null);
    const r = await findContractWithOrgAccess(fakeCollection(fremd), meins, vertragId);
    expect(r).toBeNull();
  });

  test('✅ TEAM: fremder Owner, aber gleiche aktive Organisation → Zugriff (kein Aussperren)', async () => {
    const orgId = new OID();
    OrganizationMember.findOne.mockResolvedValue({ organizationId: orgId, role: 'member', isActive: true });
    const r = await findContractWithOrgAccess(fakeCollection(fremd, orgId), meins, vertragId);
    expect(r).not.toBeNull();
    expect(r.isOwner).toBe(false);
    expect(r.role).toBe('member');
  });

  test('⚠️ unguelтige/leere contractId → null (Route 403, kein 500)', async () => {
    OrganizationMember.findOne.mockResolvedValue(null);
    expect(await findContractWithOrgAccess(fakeCollection(meins), meins, null)).toBeNull();
    expect(await findContractWithOrgAccess(fakeCollection(meins), meins, 'kaputt')).toBeNull();
  });
});

describe('Quelltext-Zusicherung: /send prueft VOR der Mutation', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'routes', 'cancellations.js'), 'utf8');
  test('findContractWithOrgAccess wird in /send aufgerufen', () => {
    expect(src).toMatch(/findContractWithOrgAccess\(req\.db\.collection\("contracts"\)/);
  });
  test('die Besitzpruefung steht VOR dem status:"gekündigt"-Update', () => {
    const posCheck = src.indexOf('findContractWithOrgAccess(req.db.collection("contracts")');
    const posMutation = src.indexOf('status: "gekündigt"');
    expect(posCheck).toBeGreaterThan(-1);
    expect(posMutation).toBeGreaterThan(posCheck);
  });
});

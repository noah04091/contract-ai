// 📁 backend/tests/unit/requirePremium.test.js
//
// VERDRAHTUNGS-TEST (12.08.2026) — bewusst anders als die übrigen Unit-Tests.
// Die bestehenden Tests prüfen nur die reinen Helfer (mailText, planAccess,
// pulseAccess, syncOrgPlan) mit DB-Attrappen. Ungetestet blieb, ob die Middleware
// diese Helfer überhaupt richtig AUFRUFT — genau dort saß am 11.08. der Fehler,
// der beinahe live gegangen wäre (eine Variable, die es im Scope gar nicht gab).
//
// Dieser Test lädt die ECHTE Middleware, schiebt ihr eine Attrappen-Datenbank unter
// und prüft das tatsächliche Verhalten: Wer kommt durch, wer wird geblockt, und was
// steht danach in `req.user.plan`.

const path = require('path');

// Die Middleware holt sich die Verbindung über config/database — hier abfangen,
// damit der Test ohne echte Datenbank läuft.
jest.mock('../../config/database', () => ({ connect: jest.fn() }));
const database = require('../../config/database');
const requirePremium = require('../../middleware/requirePremium');

/** Baut eine Attrappen-DB: users + optional Organisation. */
function fakeDb({ user = null, membership = null, org = null } = {}) {
  return {
    collection(name) {
      return {
        async findOne() {
          if (name === 'users') return user;
          if (name === 'organizationmembers') return membership;
          if (name === 'organizations') return org;
          return null;
        },
      };
    },
  };
}

function fakeReqRes(userId = '507f1f77bcf86cd799439011') {
  const req = { user: { userId } };
  const res = {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

const OID = '507f1f77bcf86cd799439011';

describe('requirePremium — Verdrahtung', () => {
  beforeEach(() => jest.clearAllMocks());

  test('laesst einen Business-Kunden durch', async () => {
    database.connect.mockResolvedValue(fakeDb({ user: { _id: OID, email: 'a@b.de', subscriptionPlan: 'business' } }));
    const { req, res, next } = fakeReqRes();
    await requirePremium(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  test('blockt einen Free-Nutzer mit 403', async () => {
    database.connect.mockResolvedValue(fakeDb({ user: { _id: OID, email: 'a@b.de', subscriptionPlan: 'free' } }));
    const { req, res, next } = fakeReqRes();
    await requirePremium(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ error: 'PREMIUM_REQUIRED' });
  });

  // Der eigentliche Grund für diesen Test: Genau dieser Fall war monatelang kaputt.
  test('laesst ein Mitglied einer zahlenden Organisation durch (eigener Plan "free")', async () => {
    database.connect.mockResolvedValue(fakeDb({
      user: { _id: OID, email: 'mitarbeiter@hochschule.de', subscriptionPlan: 'free' },
      membership: { organizationId: 'org1' },
      org: { subscriptionPlan: 'enterprise' },
    }));
    const { req, res, next } = fakeReqRes();
    await requirePremium(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  test('blockt ein Mitglied einer NICHT zahlenden Organisation', async () => {
    database.connect.mockResolvedValue(fakeDb({
      user: { _id: OID, email: 'x@y.de', subscriptionPlan: 'free' },
      membership: { organizationId: 'org1' },
      org: { subscriptionPlan: 'free' },
    }));
    const { req, res, next } = fakeReqRes();
    await requirePremium(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  test('setzt req.user.plan auf den EFFEKTIVEN Plan (nicht auf das rohe Feld)', async () => {
    database.connect.mockResolvedValue(fakeDb({
      user: { _id: OID, email: 'mitarbeiter@hochschule.de', subscriptionPlan: 'free' },
      membership: { organizationId: 'org1' },
      org: { subscriptionPlan: 'enterprise' },
    }));
    const { req, res, next } = fakeReqRes();
    await requirePremium(req, res, next);
    // Vor dem 11.08. stand hier "free" — und ueberschrieb damit den korrekten Wert,
    // den checkSubscription zuvor gesetzt hatte.
    expect(req.user.plan).toBe('enterprise');
  });

  test('Alt-Plan "legendary" wird als bezahlt erkannt', async () => {
    database.connect.mockResolvedValue(fakeDb({ user: { _id: OID, email: 'a@b.de', subscriptionPlan: 'legendary' } }));
    const { req, res, next } = fakeReqRes();
    await requirePremium(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('unbekannter Nutzer bekommt 404 statt Zugang', async () => {
    database.connect.mockResolvedValue(fakeDb({ user: null }));
    const { req, res, next } = fakeReqRes();
    await requirePremium(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  test('DB-Ausfall sperrt (fail-closed), stuerzt aber nicht ab', async () => {
    database.connect.mockRejectedValue(new Error('DB weg'));
    const { req, res, next } = fakeReqRes();
    await expect(requirePremium(req, res, next)).resolves.not.toThrow();
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
  });
});

describe('Verdrahtung der Plan-Helfer — laden alle sauber?', () => {
  // Billiger Rundum-Schutz gegen genau den Fehlertyp vom 11.08.: eine Datei, die
  // beim Laden bereits stolpert (fehlender Pfad, kaputter Export).
  const module_pfade = [
    '../../utils/planAccess',
    '../../utils/pulseAccess',
    '../../utils/syncOrgPlan',
    '../../utils/mailText',
    '../../constants/subscriptionPlans',
    '../../middleware/requirePremium',
    '../../middleware/requireFeature',
  ];

  test.each(module_pfade)('%s laedt und exportiert etwas', (p) => {
    const m = require(p);
    expect(m).toBeTruthy();
    expect(typeof m === 'function' || Object.keys(m).length > 0).toBe(true);
  });

  test('die drei Plan-Helfer bieten die erwarteten Funktionen an', () => {
    expect(typeof require('../../utils/planAccess').resolveEffectivePlan).toBe('function');
    expect(typeof require('../../utils/pulseAccess').hasPulseAccess).toBe('function');
    expect(typeof require('../../utils/syncOrgPlan').syncOrgPlan).toBe('function');
    expect(typeof require('../../constants/subscriptionPlans').isBusinessOrHigher).toBe('function');
  });
});

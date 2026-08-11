// 📁 backend/tests/unit/planAccess.test.js
// Unit-Tests für die Ermittlung des effektiven Plans (inkl. Org-Vererbung).
// Fälle stammen aus der Produktions-Kartierung vom 11.08.2026.

const { resolveEffectivePlan } = require('../../utils/planAccess');

/** db-Attrappe: liefert vorgegebene Treffer je Collection. */
function fakeDb({ membership = null, org = null, wirft = false } = {}) {
  const calls = { organizationmembers: 0, organizations: 0 };
  const db = {
    calls,
    collection(name) {
      return {
        async findOne() {
          calls[name] = (calls[name] || 0) + 1;
          if (wirft) throw new Error('DB weg');
          if (name === 'organizationmembers') return membership;
          if (name === 'organizations') return org;
          return null;
        },
      };
    },
  };
  return db;
}

describe('Effektiver Plan (Org-Vererbung)', () => {

  describe('Eigener Plan gewinnt', () => {
    test('business bleibt business', async () => {
      await expect(resolveEffectivePlan(fakeDb(), { _id: 1, subscriptionPlan: 'business' })).resolves.toBe('business');
    });

    test('enterprise bleibt enterprise', async () => {
      await expect(resolveEffectivePlan(fakeDb(), { _id: 1, subscriptionPlan: 'enterprise' })).resolves.toBe('enterprise');
    });

    test('Grossschreibung wird normalisiert', async () => {
      await expect(resolveEffectivePlan(fakeDb(), { _id: 1, subscriptionPlan: 'Business' })).resolves.toBe('business');
    });

    test('bezahlter Plan loest KEINEN Org-Lookup aus (kein unnoetiger DB-Zugriff)', async () => {
      const db = fakeDb({ membership: { organizationId: 7 }, org: { subscriptionPlan: 'enterprise' } });
      await resolveEffectivePlan(db, { _id: 1, subscriptionPlan: 'business' });
      expect(db.calls.organizationmembers).toBe(0);
    });
  });

  describe('Vererbung — der Fall Hochschule Niederrhein', () => {
    test('free-Mitglied einer enterprise-Org erhaelt enterprise', async () => {
      const db = fakeDb({ membership: { organizationId: 7 }, org: { subscriptionPlan: 'enterprise' } });
      await expect(resolveEffectivePlan(db, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe('enterprise');
    });

    test('free-Mitglied einer business-Org erhaelt business', async () => {
      const db = fakeDb({ membership: { organizationId: 7 }, org: { subscriptionPlan: 'business' } });
      await expect(resolveEffectivePlan(db, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe('business');
    });

    test('free-Org vererbt nichts', async () => {
      const db = fakeDb({ membership: { organizationId: 7 }, org: { subscriptionPlan: 'free' } });
      await expect(resolveEffectivePlan(db, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe('free');
    });

    test('ohne aktive Mitgliedschaft bleibt free', async () => {
      await expect(resolveEffectivePlan(fakeDb({ membership: null }), { _id: 1, subscriptionPlan: 'free' })).resolves.toBe('free');
    });

    test('Mitgliedschaft ohne auffindbare Org bleibt free', async () => {
      const db = fakeDb({ membership: { organizationId: 7 }, org: null });
      await expect(resolveEffectivePlan(db, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe('free');
    });
  });

  describe('Fail-Verhalten — darf niemanden schlechter stellen', () => {
    test('DB-Fehler beim Org-Lookup faellt auf den eigenen Plan zurueck (bisheriges Verhalten)', async () => {
      await expect(resolveEffectivePlan(fakeDb({ wirft: true }), { _id: 1, subscriptionPlan: 'free' })).resolves.toBe('free');
    });

    test('DB-Fehler schadet einem bezahlten Plan nicht', async () => {
      await expect(resolveEffectivePlan(fakeDb({ wirft: true }), { _id: 1, subscriptionPlan: 'business' })).resolves.toBe('business');
    });

    test('fehlende db → eigener Plan', async () => {
      await expect(resolveEffectivePlan(null, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe('free');
    });

    test('fehlende _id → eigener Plan (kein Absturz)', async () => {
      const db = fakeDb({ membership: { organizationId: 7 }, org: { subscriptionPlan: 'enterprise' } });
      await expect(resolveEffectivePlan(db, { subscriptionPlan: 'free' })).resolves.toBe('free');
    });

    test('kein Nutzer → free', async () => {
      await expect(resolveEffectivePlan(fakeDb(), null)).resolves.toBe('free');
      await expect(resolveEffectivePlan(fakeDb(), undefined)).resolves.toBe('free');
    });

    test('fehlendes Plan-Feld gilt als free', async () => {
      await expect(resolveEffectivePlan(fakeDb(), { _id: 1 })).resolves.toBe('free');
    });
  });

  describe('Admin-Safeguard (wie checkSubscription)', () => {
    test('Admin ohne Plan bekommt enterprise', async () => {
      await expect(resolveEffectivePlan(fakeDb(), { _id: 1, role: 'admin' })).resolves.toBe('enterprise');
    });

    test('Admin mit free bekommt enterprise', async () => {
      await expect(resolveEffectivePlan(fakeDb(), { _id: 1, subscriptionPlan: 'free', role: 'admin' })).resolves.toBe('enterprise');
    });

    test('Admin mit eigenem business behaelt business (kein Downgrade/Upgrade)', async () => {
      await expect(resolveEffectivePlan(fakeDb(), { _id: 1, subscriptionPlan: 'business', role: 'admin' })).resolves.toBe('business');
    });
  });
});

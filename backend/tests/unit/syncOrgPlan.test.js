// 📁 backend/tests/unit/syncOrgPlan.test.js
// Unit-Tests für den Org-Plan-Abgleich nach Kündigung/Herab-/Heraufstufung.

const { syncOrgPlan, normalisiereOrgPlan } = require('../../utils/syncOrgPlan');

/** db-Attrappe mit Aufzeichnung der Schreibzugriffe. */
function fakeDb({ org = null, wirftBeimLesen = false, wirftBeimSchreiben = false } = {}) {
  const writes = [];
  return {
    writes,
    collection() {
      return {
        async findOne() {
          if (wirftBeimLesen) throw new Error('DB weg');
          return org;
        },
        async updateOne(filter, update) {
          if (wirftBeimSchreiben) throw new Error('Schreiben fehlgeschlagen');
          writes.push({ filter, update });
          return { modifiedCount: 1 };
        },
      };
    },
  };
}

const inhaber = { _id: 'u1', email: 'chef@firma.de' };

describe('Org-Plan-Abgleich', () => {

  describe('normalisiereOrgPlan()', () => {
    test('erlaubte Werte bleiben', () => {
      expect(normalisiereOrgPlan('business')).toBe('business');
      expect(normalisiereOrgPlan('enterprise')).toBe('enterprise');
      expect(normalisiereOrgPlan('free')).toBe('free');
    });

    test('Alt-Namen werden auf enterprise gemappt', () => {
      expect(normalisiereOrgPlan('premium')).toBe('enterprise');
      expect(normalisiereOrgPlan('legendary')).toBe('enterprise');
    });

    test('null/undefined/unbekannt wird free', () => {
      expect(normalisiereOrgPlan(null)).toBe('free');
      expect(normalisiereOrgPlan(undefined)).toBe('free');
      expect(normalisiereOrgPlan('quatsch')).toBe('free');
      expect(normalisiereOrgPlan('')).toBe('free');
    });

    test('Grossschreibung wird normalisiert', () => {
      expect(normalisiereOrgPlan('Enterprise')).toBe('enterprise');
    });
  });

  describe('Kündigung', () => {
    test('Inhaber kündigt → Organisation faellt auf free', async () => {
      const db = fakeDb({ org: { _id: 'o1', name: 'Firma', subscriptionPlan: 'enterprise' } });
      const r = await syncOrgPlan(db, inhaber, 'free');
      expect(r).toMatchObject({ geaendert: true, von: 'enterprise', auf: 'free' });
      expect(db.writes[0].update.$set.subscriptionPlan).toBe('free');
    });

    test('subscriptionPlan null (zweiter Kuendigungspfad) wird als free behandelt', async () => {
      const db = fakeDb({ org: { _id: 'o1', name: 'Firma', subscriptionPlan: 'enterprise' } });
      const r = await syncOrgPlan(db, inhaber, null);
      expect(r.auf).toBe('free');
      expect(db.writes[0].update.$set.subscriptionPlan).toBe('free');
    });
  });

  describe('Herab- und Heraufstufung', () => {
    test('enterprise → business zieht nach', async () => {
      const db = fakeDb({ org: { _id: 'o1', name: 'Firma', subscriptionPlan: 'enterprise' } });
      const r = await syncOrgPlan(db, inhaber, 'business');
      expect(r).toMatchObject({ geaendert: true, von: 'enterprise', auf: 'business' });
    });

    test('free → enterprise zieht ebenfalls nach (Inhaber bucht wieder)', async () => {
      const db = fakeDb({ org: { _id: 'o1', name: 'Firma', subscriptionPlan: 'free' } });
      const r = await syncOrgPlan(db, inhaber, 'enterprise');
      expect(r).toMatchObject({ geaendert: true, von: 'free', auf: 'enterprise' });
    });

    test('gleicher Plan schreibt NICHT (kein unnoetiger Schreibzugriff)', async () => {
      const db = fakeDb({ org: { _id: 'o1', name: 'Firma', subscriptionPlan: 'enterprise' } });
      const r = await syncOrgPlan(db, inhaber, 'enterprise');
      expect(r.geaendert).toBe(false);
      expect(db.writes).toHaveLength(0);
    });
  });

  describe('Nur der Inhaber zaehlt', () => {
    test('kein Inhaber einer Organisation → nichts passiert', async () => {
      const db = fakeDb({ org: null });
      const r = await syncOrgPlan(db, { _id: 'u2', email: 'mitglied@firma.de' }, 'free');
      expect(r.geaendert).toBe(false);
      expect(db.writes).toHaveLength(0);
    });
  });

  describe('Darf den Zahlungs-Webhook NIE stoeren', () => {
    test('Lesefehler wird geschluckt, wirft nicht', async () => {
      const db = fakeDb({ wirftBeimLesen: true });
      await expect(syncOrgPlan(db, inhaber, 'free')).resolves.toMatchObject({ geaendert: false });
    });

    test('Schreibfehler wird geschluckt, wirft nicht', async () => {
      const db = fakeDb({ org: { _id: 'o1', name: 'F', subscriptionPlan: 'enterprise' }, wirftBeimSchreiben: true });
      await expect(syncOrgPlan(db, inhaber, 'free')).resolves.toMatchObject({ geaendert: false });
    });

    test('fehlende db wirft nicht', async () => {
      await expect(syncOrgPlan(null, inhaber, 'free')).resolves.toMatchObject({ geaendert: false });
    });

    test('fehlender Nutzer wirft nicht', async () => {
      await expect(syncOrgPlan(fakeDb(), null, 'free')).resolves.toMatchObject({ geaendert: false });
    });

    test('Nutzer ohne _id wirft nicht', async () => {
      await expect(syncOrgPlan(fakeDb(), { email: 'x@y.de' }, 'free')).resolves.toMatchObject({ geaendert: false });
    });
  });
});

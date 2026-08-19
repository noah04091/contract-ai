// 📁 backend/tests/unit/pulseAccess.test.js
// Unit-Tests für die Legal-Pulse-Zugangsprüfung.
// Die Fälle stammen aus echten Produktionsdaten vom 10.08.2026.

const { hasPulseAccess } = require('../../utils/pulseAccess');

/** Minimales db-Attrappen-Objekt: liefert vorgegebene Treffer je Collection. */
function fakeDb({ membership = null, org = null, wirft = false } = {}) {
  return {
    collection(name) {
      return {
        async findOne() {
          if (wirft) throw new Error('DB weg');
          if (name === 'organizationmembers') return membership;
          if (name === 'organizations') return org;
          return null;
        },
      };
    },
  };
}

describe('Legal-Pulse-Zugang', () => {

  describe('Eigener Plan', () => {
    test('business hat Zugang', async () => {
      await expect(hasPulseAccess(fakeDb(), { _id: 1, subscriptionPlan: 'business' })).resolves.toBe(true);
    });

    test('enterprise hat Zugang', async () => {
      await expect(hasPulseAccess(fakeDb(), { _id: 1, subscriptionPlan: 'enterprise' })).resolves.toBe(true);
    });

    test('legendary hat Zugang (Comp-Account)', async () => {
      await expect(hasPulseAccess(fakeDb(), { _id: 1, subscriptionPlan: 'legendary' })).resolves.toBe(true);
    });

    test('premium hat Zugang', async () => {
      await expect(hasPulseAccess(fakeDb(), { _id: 1, subscriptionPlan: 'premium' })).resolves.toBe(true);
    });

    test('free ohne Organisation hat KEINEN Zugang', async () => {
      await expect(hasPulseAccess(fakeDb(), { _id: 1, subscriptionPlan: 'free' })).resolves.toBe(false);
    });

    test('fehlendes Plan-Feld gilt als free', async () => {
      await expect(hasPulseAccess(fakeDb(), { _id: 1 })).resolves.toBe(false);
    });
  });

  describe('Org-Vererbung (der Fall hs-niederrhein.de)', () => {
    test('free-Mitglied einer enterprise-Organisation HAT Zugang', async () => {
      const db = fakeDb({ membership: { organizationId: 7 }, org: { subscriptionPlan: 'enterprise' } });
      await expect(hasPulseAccess(db, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe(true);
    });

    test('free-Mitglied einer free-Organisation hat KEINEN Zugang', async () => {
      const db = fakeDb({ membership: { organizationId: 7 }, org: { subscriptionPlan: 'free' } });
      await expect(hasPulseAccess(db, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe(false);
    });

    test('ohne aktive Mitgliedschaft kein Zugang', async () => {
      const db = fakeDb({ membership: null });
      await expect(hasPulseAccess(db, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe(false);
    });

    test('Mitgliedschaft ohne auffindbare Organisation kein Zugang', async () => {
      const db = fakeDb({ membership: { organizationId: 7 }, org: null });
      await expect(hasPulseAccess(db, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe(false);
    });
  });

  describe('Sonderfälle', () => {
    test('Admin hat immer Zugang, auch mit free', async () => {
      await expect(hasPulseAccess(fakeDb(), { _id: 1, subscriptionPlan: 'free', role: 'admin' })).resolves.toBe(true);
    });

    test('kein Nutzer → kein Zugang', async () => {
      await expect(hasPulseAccess(fakeDb(), null)).resolves.toBe(false);
      await expect(hasPulseAccess(fakeDb(), undefined)).resolves.toBe(false);
    });

    test('DB-Fehler beim Org-Lookup sperrt (fail-closed), wirft aber nicht', async () => {
      const db = fakeDb({ wirft: true });
      await expect(hasPulseAccess(db, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe(false);
    });

    test('DB-Fehler schadet einem zahlenden Plan NICHT', async () => {
      const db = fakeDb({ wirft: true });
      await expect(hasPulseAccess(db, { _id: 1, subscriptionPlan: 'business' })).resolves.toBe(true);
    });

    test('fehlende _id verhindert Org-Suche, sperrt aber sauber', async () => {
      const db = fakeDb({ membership: { organizationId: 7 }, org: { subscriptionPlan: 'enterprise' } });
      await expect(hasPulseAccess(db, { subscriptionPlan: 'free' })).resolves.toBe(false);
    });

    test('fehlende db verhindert Org-Suche, sperrt aber sauber', async () => {
      await expect(hasPulseAccess(null, { _id: 1, subscriptionPlan: 'free' })).resolves.toBe(false);
    });
  });
});

// ── Feiner Mail-Opt-out (19.08.2026) ────────────────────────────────────────
// Eine Wahrheit für alle 4 Pulse-Mail-Jobs. Fail-open: nur ein EXPLIZITES false
// schaltet Mails ab — fehlende Settings/Felder bedeuten immer "senden".
const { pulseEmailsDisabled } = require('../../utils/pulseAccess');

describe('pulseEmailsDisabled (feiner Mail-Opt-out)', () => {
  test('kein Settings-Objekt → Mails an (fail-open)', () => {
    expect(pulseEmailsDisabled({ email: 'a@b.de' })).toBe(false);
    expect(pulseEmailsDisabled(null)).toBe(false);
    expect(pulseEmailsDisabled(undefined)).toBe(false);
  });

  test('leeres Settings-Objekt → Mails an', () => {
    expect(pulseEmailsDisabled({ legalPulseSettings: {} })).toBe(false);
  });

  test('emailNotifications false → Mails aus', () => {
    expect(pulseEmailsDisabled({ legalPulseSettings: { emailNotifications: false } })).toBe(true);
  });

  test('enabled false → Mails aus (Alt-Feld, gleiche Wirkung wie im Wochenbericht)', () => {
    expect(pulseEmailsDisabled({ legalPulseSettings: { enabled: false, emailNotifications: true } })).toBe(true);
  });

  test('beide true → Mails an (Prod-Bestand 2501test)', () => {
    expect(pulseEmailsDisabled({ legalPulseSettings: { enabled: true, emailNotifications: true } })).toBe(false);
  });

  test('nur truthy/falsy reicht nicht: undefined-Felder bleiben an', () => {
    expect(pulseEmailsDisabled({ legalPulseSettings: { enabled: undefined, emailNotifications: undefined } })).toBe(false);
  });
});

// Tests für das ehrliche „Wieder anmelden" (24.08.2026).
//
// Kern: Nach einem Resubscribe ist die Kategorie wieder an, aber ein breiterer Schalter
// kann noch blockieren. Die Seite darf dann KEINE Erinnerungen versprechen (Alptraum:
// Kunde verlässt sich drauf, Stille). Diese Tests nageln fest, wann ehrlich gewarnt wird.

const { computeResubscribeBlock, processResubscribe } = require('../../utils/resubscribeBlock');

// Mutierendes usersCollection-Double: updateOne wendet $set (Dot-Pfade) an, findOne
// liefert den FRISCHEN Stand — so wird die Reihenfolge (schreiben → neu lesen → prüfen) echt.
function setDeep(o, p, v) { const a = p.split('.'); let c = o; for (let i = 0; i < a.length - 1; i++) { if (typeof c[a[i]] !== 'object' || c[a[i]] === null) c[a[i]] = {}; c = c[a[i]]; } c[a[a.length - 1]] = v; }
function makeUsers(user) {
  return {
    async updateOne(filter, update) {
      if (!user || String(user._id) !== String(filter._id)) return { matchedCount: 0 };
      if (update.$set) for (const [k, v] of Object.entries(update.$set)) setDeep(user, k, v);
      return { matchedCount: 1 };
    },
    async findOne(filter) { return (user && String(user._id) === String(filter._id)) ? user : null; },
  };
}

describe('computeResubscribeBlock', () => {
  test('nichts blockiert → frei, keine Warnung', () => {
    const u = { emailOptOut: false, notificationSettings: { email: { enabled: true } } };
    expect(computeResubscribeBlock(u, 'calendar')).toEqual({ stillBlocked: false, blockReason: null });
  });

  test('emailOptOut global → blockiert für JEDE Kategorie (Grund: all)', () => {
    const u = { emailOptOut: true, notificationSettings: { email: { enabled: true } } };
    expect(computeResubscribeBlock(u, 'calendar')).toEqual({ stillBlocked: true, blockReason: 'all' });
    expect(computeResubscribeBlock(u, 'legal_pulse')).toEqual({ stillBlocked: true, blockReason: 'all' });
    expect(computeResubscribeBlock(u, 'marketing')).toEqual({ stillBlocked: true, blockReason: 'all' });
  });

  test('Profil „alle E-Mails" aus → blockiert NUR Fristen (Grund: email_master)', () => {
    const u = { emailOptOut: false, notificationSettings: { email: { enabled: false } } };
    expect(computeResubscribeBlock(u, 'calendar')).toEqual({ stillBlocked: true, blockReason: 'email_master' });
    // Für andere Kategorien ist der Profil-„alle E-Mails"-Schalter NICHT der Fristen-Gate
    expect(computeResubscribeBlock(u, 'legal_pulse')).toEqual({ stillBlocked: false, blockReason: null });
    expect(computeResubscribeBlock(u, 'marketing')).toEqual({ stillBlocked: false, blockReason: null });
  });

  test('global schlägt Profil (emailOptOut hat Vorrang, Grund bleibt all)', () => {
    const u = { emailOptOut: true, notificationSettings: { email: { enabled: false } } };
    expect(computeResubscribeBlock(u, 'calendar')).toEqual({ stillBlocked: true, blockReason: 'all' });
  });

  test('fehlende Felder → nicht blockiert (fail-open, kein falscher Alarm)', () => {
    expect(computeResubscribeBlock({}, 'calendar')).toEqual({ stillBlocked: false, blockReason: null });
    expect(computeResubscribeBlock({ notificationSettings: {} }, 'calendar')).toEqual({ stillBlocked: false, blockReason: null });
    expect(computeResubscribeBlock(null, 'calendar')).toEqual({ stillBlocked: false, blockReason: null });
    expect(computeResubscribeBlock(undefined, 'calendar')).toEqual({ stillBlocked: false, blockReason: null });
  });

  test('email.enabled undefined (Default an) → nicht blockiert', () => {
    const u = { emailOptOut: false, notificationSettings: { email: {} } };
    expect(computeResubscribeBlock(u, 'calendar')).toEqual({ stillBlocked: false, blockReason: null });
  });
});

describe('processResubscribe — prüft am FRISCHEN Stand (Blocker-Fix 24.08.)', () => {
  test('🔴 BLOCKER: global abgemeldet → resubscribe(all) → NICHT mehr blockiert (nicht der veraltete Stand)', async () => {
    const user = { _id: 'u1', emailOptOut: true, notificationSettings: { email: { enabled: true } } };
    const update = { $set: { emailOptOut: false } }; // = getResubscribeUpdate('all')
    const out = await processResubscribe(makeUsers(user), 'u1', 'all', update);
    expect(out).toEqual({ notFound: false, stillBlocked: false, blockReason: null });
    expect(user.emailOptOut).toBe(false); // wirklich geschrieben
  });

  test('calendar-Resubscribe bei „alle E-Mails aus" → weiterhin ehrlich email_master (Update fasst das Feld nicht an)', async () => {
    const user = { _id: 'u1', emailOptOut: false, notificationSettings: { email: { enabled: false } } };
    const update = { $set: { 'emailPreferences.calendar': true } }; // = getResubscribeUpdate('calendar')
    const out = await processResubscribe(makeUsers(user), 'u1', 'calendar', update);
    expect(out).toEqual({ notFound: false, stillBlocked: true, blockReason: 'email_master' });
  });

  test('calendar-Resubscribe bei global aus → weiterhin all (emailOptOut vom calendar-Update unberührt)', async () => {
    const user = { _id: 'u1', emailOptOut: true, notificationSettings: { email: { enabled: true } } };
    const update = { $set: { 'emailPreferences.calendar': true } };
    const out = await processResubscribe(makeUsers(user), 'u1', 'calendar', update);
    expect(out).toEqual({ notFound: false, stillBlocked: true, blockReason: 'all' });
  });

  test('Nutzer nicht gefunden → notFound', async () => {
    const out = await processResubscribe(makeUsers(null), 'u1', 'all', { $set: { emailOptOut: false } });
    expect(out).toEqual({ notFound: true });
  });
});

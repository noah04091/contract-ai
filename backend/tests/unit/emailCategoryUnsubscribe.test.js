// Tests für die Kategorie-Entflechtung calendar ↔ legal_pulse (23.08.2026).
//
// Hintergrund: Bis 23.08. lieh sich Legal Pulse fälschlich die Kennung "calendar".
// Dadurch schaltete eine Fristen-Abmeldung Legal Pulse ab (und umgekehrt), und weil
// die Warteschlange emailPreferences.calendar liest, der Schreiber aber legalPulseSettings
// füllte, wirkte die Fristen-Abmeldung überhaupt nicht.
//
// Diese Tests nageln die ENTSCHEIDENDE Eigenschaft fest: eine einzige Wahrheit pro
// Kategorie, auf die Schreiber (recordUnsubscribe/resubscribe) UND Leser (isUnsubscribed)
// zeigen, und volle ISOLATION zwischen den beiden Kategorien.

const {
  isUnsubscribed,
  recordUnsubscribe,
  resubscribe,
  EMAIL_CATEGORIES,
} = require('../../services/emailUnsubscribeService');

// Setzt einen Dot-Pfad ("legalPulseSettings.emailNotifications") in ein Objekt.
function setDeep(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// Minimales, aber ECHT mutierendes db-Double: recordUnsubscribe/resubscribe schreiben
// per $set/$unset (Dot-Notation) in den User, ein anschließendes isUnsubscribed liest
// denselben mutierten Zustand — so wird die geschlossene Schleife wirklich geprüft.
function makeDb(user) {
  const optouts = new Map();
  return {
    collection(name) {
      if (name === 'users') {
        return {
          async findOne() { return user; },
          async updateOne(_filter, update) {
            if (update.$set) for (const [k, v] of Object.entries(update.$set)) setDeep(user, k, v);
            if (update.$unset) for (const k of Object.keys(update.$unset)) setDeep(user, k, undefined);
            return { matchedCount: 1, modifiedCount: 1 };
          },
        };
      }
      if (name === 'email_optouts') {
        return {
          async findOne({ email }) { return optouts.get(email) || null; },
          async updateOne({ email }, update) { optouts.set(email, { email, ...(update.$set || {}) }); return { upsertedCount: 1 }; },
          async deleteOne({ email }) { optouts.delete(email); return { deletedCount: 1 }; },
        };
      }
      // email_unsubscribes: reines Protokoll, für diese Tests inert
      return { async insertOne() { return { insertedId: 'x' }; } };
    },
  };
}

const EMAIL = 'kunde@example.de';
const freshUser = () => ({ _id: 'u1', email: EMAIL, emailPreferences: {}, legalPulseSettings: { enabled: true, emailNotifications: true } });

describe('Kategorie calendar = Fristen-Erinnerungen (eigenes Feld)', () => {
  test('Abmelden schreibt emailPreferences.calendar=false und lässt Legal Pulse unberührt', async () => {
    const user = freshUser();
    await recordUnsubscribe(makeDb(user), EMAIL, EMAIL_CATEGORIES.CALENDAR);
    expect(user.emailPreferences.calendar).toBe(false);
    expect(user.legalPulseSettings.emailNotifications).toBe(true); // Pulse NICHT angefasst
  });

  test('nach Fristen-Abmeldung: isUnsubscribed(calendar)=true, isUnsubscribed(legal_pulse)=false (Isolation)', async () => {
    const user = freshUser();
    setDeep(user, 'emailPreferences.calendar', false);
    const db = makeDb(user);
    await expect(isUnsubscribed(db, EMAIL, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(true);
    await expect(isUnsubscribed(db, EMAIL, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(false);
  });

  test('Wieder-Anmelden setzt emailPreferences.calendar=true zurück', async () => {
    const user = freshUser();
    setDeep(user, 'emailPreferences.calendar', false);
    await resubscribe(makeDb(user), EMAIL, EMAIL_CATEGORIES.CALENDAR);
    expect(user.emailPreferences.calendar).toBe(true);
  });
});

describe('Kategorie legal_pulse = Legal Pulse (Feld legalPulseSettings, EINE Wahrheit)', () => {
  test('Abmelden schreibt legalPulseSettings.emailNotifications=false und lässt Fristen unberührt', async () => {
    const user = freshUser();
    await recordUnsubscribe(makeDb(user), EMAIL, EMAIL_CATEGORIES.LEGAL_PULSE);
    expect(user.legalPulseSettings.emailNotifications).toBe(false);
    expect(user.emailPreferences.calendar).toBeUndefined(); // Fristen NICHT angefasst
  });

  test('nach Pulse-Abmeldung: isUnsubscribed(legal_pulse)=true, isUnsubscribed(calendar)=false (Isolation)', async () => {
    const user = freshUser();
    setDeep(user, 'legalPulseSettings.emailNotifications', false);
    const db = makeDb(user);
    await expect(isUnsubscribed(db, EMAIL, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(true);
    await expect(isUnsubscribed(db, EMAIL, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(false);
  });

  test('Wieder-Anmelden setzt emailNotifications UND enabled auf true (V1-Bestand)', async () => {
    const user = { _id: 'u1', email: EMAIL, emailPreferences: {}, legalPulseSettings: { enabled: false, emailNotifications: false } };
    await resubscribe(makeDb(user), EMAIL, EMAIL_CATEGORIES.LEGAL_PULSE);
    expect(user.legalPulseSettings.emailNotifications).toBe(true);
    expect(user.legalPulseSettings.enabled).toBe(true);
  });

  test('legal_pulse spiegelt pulseEmailsDisabled: enabled=false ODER emailNotifications=false ⇒ abgemeldet', async () => {
    const u1 = { _id: 'u1', email: EMAIL, emailPreferences: {}, legalPulseSettings: { enabled: false, emailNotifications: true } };
    await expect(isUnsubscribed(makeDb(u1), EMAIL, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(true);
    const u2 = { _id: 'u1', email: EMAIL, emailPreferences: {}, legalPulseSettings: { enabled: true, emailNotifications: false } };
    await expect(isUnsubscribed(makeDb(u2), EMAIL, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(true);
    const u3 = freshUser();
    await expect(isUnsubscribed(makeDb(u3), EMAIL, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(false);
  });
});

describe('Globale Abmeldung (all) stoppt weiterhin beides', () => {
  test('recordUnsubscribe(all) setzt emailOptOut und unterdrückt jede Kategorie', async () => {
    const user = freshUser();
    await recordUnsubscribe(makeDb(user), EMAIL, EMAIL_CATEGORIES.ALL);
    expect(user.emailOptOut).toBe(true);
    const db = makeDb(user);
    await expect(isUnsubscribed(db, EMAIL, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(true);
    await expect(isUnsubscribed(db, EMAIL, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(true);
  });
});

describe('Regression: bestehende Kategorien unverändert', () => {
  test('marketing bleibt emailPreferences.marketing', async () => {
    const user = freshUser();
    await recordUnsubscribe(makeDb(user), EMAIL, EMAIL_CATEGORIES.MARKETING);
    expect(user.emailPreferences.marketing).toBe(false);
    await expect(isUnsubscribed(makeDb(user), EMAIL, EMAIL_CATEGORIES.MARKETING)).resolves.toBe(true);
    // calendar/legal_pulse davon unberührt
    await expect(isUnsubscribed(makeDb(user), EMAIL, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(false);
  });
});

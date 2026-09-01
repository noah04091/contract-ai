// 📁 backend/tests/unit/calendarPlanAccess.test.js
// Stufe 1 des Kalender-Sync-Audits (01.09.2026): Wächter für die Tarif-Entscheidung.
// Voll-Zugriff (erstellen/bearbeiten/löschen/snooze) ab Business,
// Kalender-Sync (ICS-Feed Google/Apple/Outlook) NUR Enterprise (Noahs Entscheidung).
// Alt-Pläne premium/legendary zählen über normalizePlan als Enterprise.

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';

const { accessFromPlan } = require('../../routes/calendar');

describe('accessFromPlan — Business-Vollzugriff, Enterprise-Sync', () => {
  test('free: weder Vollzugriff noch Sync', () => {
    expect(accessFromPlan('free', true)).toEqual({ hasAccess: false, hasSyncAccess: false });
  });

  test('business: Vollzugriff ja, Sync NEIN (Enterprise-only)', () => {
    expect(accessFromPlan('business', true)).toEqual({ hasAccess: true, hasSyncAccess: false });
  });

  test('enterprise: Vollzugriff und Sync', () => {
    expect(accessFromPlan('enterprise', true)).toEqual({ hasAccess: true, hasSyncAccess: true });
  });

  test('Alt-Pläne premium/legendary zählen als Enterprise (normalizePlan)', () => {
    expect(accessFromPlan('premium', true)).toEqual({ hasAccess: true, hasSyncAccess: true });
    expect(accessFromPlan('legendary', true)).toEqual({ hasAccess: true, hasSyncAccess: true });
  });

  test('subscriptionActive === false sperrt beides, auch bei Enterprise', () => {
    expect(accessFromPlan('enterprise', false)).toEqual({ hasAccess: false, hasSyncAccess: false });
  });

  test('fehlendes subscriptionActive gilt als aktiv (Legacy-Default)', () => {
    expect(accessFromPlan('enterprise', undefined)).toEqual({ hasAccess: true, hasSyncAccess: true });
  });

  test('unbekannter/fehlender Plan fällt auf free (keine Rechte)', () => {
    expect(accessFromPlan('quatschplan', true)).toEqual({ hasAccess: false, hasSyncAccess: false });
    expect(accessFromPlan(undefined, true)).toEqual({ hasAccess: false, hasSyncAccess: false });
    expect(accessFromPlan(null, true)).toEqual({ hasAccess: false, hasSyncAccess: false });
  });
});

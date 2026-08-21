// Unit-Tests für das Abmelde-Tor VOR dem Claim (21.08.2026).
//
// Hintergrund: Die Warteschlange (emailRetryService.processEmailQueue) prüft die Abmeldung
// ebenfalls, aber dort ist das contract_event schon auf "queued" geclaimt und wird beim Skip
// NICHT zurückgesetzt → es hinge dauerhaft fest und der Kalender-Wächter meldete nach 48 h
// einen Fehlalarm. Darum fangen wir abgemeldete Adressen VOR dem Claim ab.
//
// Die kritischste Zusicherung hier ist die FEHLERRICHTUNG: Wenn die Prüfung selbst scheitert,
// darf NICHT unterdrückt werden. Eine Mail zu viel ist harmlos, eine verpasste Frist nicht.
const { isCalendarUnsubscribed } = require('../../services/calendarNotifier');
const { EMAIL_CATEGORIES } = require('../../services/emailUnsubscribeService');

const FAKE_DB = { marker: 'db' };

describe('isCalendarUnsubscribed', () => {
  test('abgemeldet → true (Mail wird unterdrückt, Event bleibt scheduled)', async () => {
    const spy = jest.fn().mockResolvedValue(true);
    await expect(isCalendarUnsubscribed(FAKE_DB, 'kunde@example.com', { isUnsubscribed: spy }))
      .resolves.toBe(true);
  });

  test('nicht abgemeldet → false (Mail geht raus wie bisher)', async () => {
    const spy = jest.fn().mockResolvedValue(false);
    await expect(isCalendarUnsubscribed(FAKE_DB, 'kunde@example.com', { isUnsubscribed: spy }))
      .resolves.toBe(false);
  });

  test('prüft GENAU die Kategorie "calendar" — Spiegel der Warteschlangen-Logik', async () => {
    const spy = jest.fn().mockResolvedValue(false);
    await isCalendarUnsubscribed(FAKE_DB, 'kunde@example.com', { isUnsubscribed: spy });
    expect(spy).toHaveBeenCalledWith(FAKE_DB, 'kunde@example.com', EMAIL_CATEGORIES.CALENDAR);
    expect(EMAIL_CATEGORIES.CALENDAR).toBe('calendar');
  });

  test('FEHLERRICHTUNG: Prüfung wirft → false, es wird trotzdem gesendet', async () => {
    const boom = jest.fn().mockRejectedValue(new Error('MongoNetworkTimeoutError'));
    await expect(isCalendarUnsubscribed(FAKE_DB, 'kunde@example.com', { isUnsubscribed: boom }))
      .resolves.toBe(false);
  });

  test('FEHLERRICHTUNG: Prüfung wirft synchron → ebenfalls false', async () => {
    const boom = jest.fn(() => { throw new Error('kaputt'); });
    await expect(isCalendarUnsubscribed(FAKE_DB, 'kunde@example.com', { isUnsubscribed: boom }))
      .resolves.toBe(false);
  });

  test('ohne injizierte Abhängigkeit wird die echte geteilte Funktion genutzt (eine Wahrheit)', async () => {
    // Kein deps-Objekt: greift auf services/emailUnsubscribeService.isUnsubscribed zu.
    // Mit einer Fake-DB, die nichts findet, muss das Ergebnis "nicht abgemeldet" sein.
    const dbStub = {
      collection: () => ({ findOne: async () => null })
    };
    await expect(isCalendarUnsubscribed(dbStub, 'unbekannt@example.com')).resolves.toBe(false);
  });

  test('echte Funktion: emailOptOut des Nutzers schlägt durch', async () => {
    const dbStub = {
      collection: (name) => ({
        findOne: async () => (name === 'users' ? { email: 'x@example.com', emailOptOut: true } : null)
      })
    };
    await expect(isCalendarUnsubscribed(dbStub, 'x@example.com')).resolves.toBe(true);
  });

  test('echte Funktion: emailPreferences.calendar === false schlägt durch', async () => {
    const dbStub = {
      collection: (name) => ({
        findOne: async () => (name === 'users' ? { email: 'x@example.com', emailPreferences: { calendar: false } } : null)
      })
    };
    await expect(isCalendarUnsubscribed(dbStub, 'x@example.com')).resolves.toBe(true);
  });

  test('echte Funktion: eine ANDERE abgemeldete Kategorie unterdrückt Kalender-Mails NICHT', async () => {
    const dbStub = {
      collection: (name) => ({
        findOne: async () => (name === 'users' ? { email: 'x@example.com', emailPreferences: { marketing: false } } : null)
      })
    };
    await expect(isCalendarUnsubscribed(dbStub, 'x@example.com')).resolves.toBe(false);
  });
});

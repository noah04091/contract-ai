// Unit-Tests fuer die Digest-Weiche (20.08.2026, Due-Diligence-Befund):
// Der Versand-Cron darf einen Nutzer NUR dann überspringen, wenn der Digest-Dienst
// seinen Modus auch wirklich abarbeitet. Sonst entsteht Funkstille ohne Fehlermeldung
// ("weekly" wurde übersprungen, aber processDigests matcht nur "daily").
const { digestModeSkipsInstantMails, DIGEST_MODES_HANDLED } = require('../../services/calendarNotifier');

describe('digestModeSkipsInstantMails', () => {
  test('"daily" wird vom Digest-Dienst verarbeitet → Einzelversand überspringen', () => {
    expect(digestModeSkipsInstantMails('daily')).toBe(true);
  });

  test('"weekly" wird NICHT verarbeitet → Einzelversand MUSS laufen (kein Schweigen)', () => {
    expect(digestModeSkipsInstantMails('weekly')).toBe(false);
  });

  test('"instant" ist der Normalfall → Einzelversand', () => {
    expect(digestModeSkipsInstantMails('instant')).toBe(false);
  });

  test('nicht gesetzt / unbekannt / Tippfehler → Einzelversand statt Funkstille', () => {
    expect(digestModeSkipsInstantMails(undefined)).toBe(false);
    expect(digestModeSkipsInstantMails(null)).toBe(false);
    expect(digestModeSkipsInstantMails('')).toBe(false);
    expect(digestModeSkipsInstantMails('Daily')).toBe(false);   // Groß/klein zählt
    expect(digestModeSkipsInstantMails('monthly')).toBe(false);
    expect(digestModeSkipsInstantMails('woechentlich')).toBe(false);
  });

  test('die Liste enthält GENAU die Modi, die der Digest-Dienst abarbeitet', () => {
    // Wächter gegen Auseinanderdriften: calendarDigestService.processDigests filtert
    // auf "user.emailDigestMode": "daily". Wer dort etwas ergänzt, muss es hier ergänzen.
    expect([...DIGEST_MODES_HANDLED]).toEqual(['daily']);
  });
});

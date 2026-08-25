// Tests für den Aus-Schalter des direkten Legal-Pulse-Versenders (25.08.2026).
//
// Kern: Der Direkt-Versender pulseNotificationService sendet an der Queue vorbei und prüfte
// bisher NUR den Profil-Schalter (notificationSettings.email.legalPulse), NICHT das Feld, das
// der Pulse-Abmelde-Link schreibt (legalPulseSettings). Folge: Ein Pulse-Abmelden stoppte ihn
// nicht. Diese Tests nageln fest, dass er jetzt DIESELBE eine Wahrheit achtet wie alle anderen.

const { pulseDirectEmailSuppressed } = require('../../utils/pulseDirectEmailGate');

describe('pulseDirectEmailSuppressed', () => {
  test('nichts abgeschaltet → senden', () => {
    expect(pulseDirectEmailSuppressed({ email: 'a@b.de' })).toBe(false);
    expect(pulseDirectEmailSuppressed({ email: 'a@b.de', legalPulseSettings: {}, notificationSettings: { email: {} } })).toBe(false);
  });

  test('🔴 DER FIX: Pulse-Abmeldung (legalPulseSettings.emailNotifications=false) → unterdrücken', () => {
    // Genau das schreibt der Abmelde-Link. Früher sendete dieser Versender trotzdem.
    expect(pulseDirectEmailSuppressed({ legalPulseSettings: { emailNotifications: false } })).toBe(true);
  });

  test('legalPulseSettings.enabled=false (Alt-Feld) → unterdrücken', () => {
    expect(pulseDirectEmailSuppressed({ legalPulseSettings: { enabled: false } })).toBe(true);
  });

  test('Profil-Zeile legalPulse=false → unterdrücken (Altverhalten bleibt)', () => {
    expect(pulseDirectEmailSuppressed({ notificationSettings: { email: { legalPulse: false } } })).toBe(true);
  });

  test('Profil „alle E-Mails" aus → unterdrücken', () => {
    expect(pulseDirectEmailSuppressed({ notificationSettings: { email: { enabled: false } } })).toBe(true);
  });

  test('fehlende Felder → senden (fail-open, wie pulseEmailsDisabled)', () => {
    expect(pulseDirectEmailSuppressed({ email: 'a@b.de', legalPulseSettings: { emailNotifications: true, enabled: true } })).toBe(false);
  });

  test('kein User → fail-safe: NICHT senden', () => {
    expect(pulseDirectEmailSuppressed(null)).toBe(true);
    expect(pulseDirectEmailSuppressed(undefined)).toBe(true);
  });

  test('anderer Schalter (marketing) beeinflusst Pulse NICHT', () => {
    expect(pulseDirectEmailSuppressed({ emailPreferences: { marketing: false }, legalPulseSettings: { emailNotifications: true } })).toBe(false);
  });
});

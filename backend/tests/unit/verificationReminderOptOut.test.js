// Tests für den Widerspruch gegen die Verifizierungs-Erinnerung (24.08.2026).
//
// Kern (UWG): Sobald ein Kunde abbestellt hat, MUSS die 30-Tage-Erinnerung schweigen,
// egal über welchen der drei Wege. Diese Tests nageln das „nach dem Abmelden wird NICHT
// gesendet" fest, ohne echte Mails auszulösen. Der Alptraum wäre das Gegenteil: Kunde
// meldet sich ab, Erinnerung läuft trotzdem weiter (genau der alte, kaputte Zustand).

const { isVerificationReminderSuppressed } = require('../../utils/verificationReminderOptOut');

const noOptOut = new Set();

describe('isVerificationReminderSuppressed', () => {
  test('nichts abbestellt → senden (nicht unterdrückt)', () => {
    const u = { email: 'a@x.de', emailPreferences: {} };
    expect(isVerificationReminderSuppressed(u, noOptOut)).toBe(false);
  });

  test('Weg 2: emailPreferences.verification_reminder === false → unterdrücken', () => {
    // Das ist genau, was der Abmelde-Link /abmelden → routes/auth.js schreibt.
    const u = { email: 'a@x.de', emailPreferences: { verification_reminder: false } };
    expect(isVerificationReminderSuppressed(u, noOptOut)).toBe(true);
  });

  test('Weg 3: emailOptOut === true (global) → unterdrücken', () => {
    const u = { email: 'a@x.de', emailOptOut: true, emailPreferences: {} };
    expect(isVerificationReminderSuppressed(u, noOptOut)).toBe(true);
  });

  test('Weg 1: E-Mail steht in der email_unsubscribes-Liste → unterdrücken', () => {
    const u = { email: 'a@x.de', emailPreferences: {} };
    expect(isVerificationReminderSuppressed(u, new Set(['a@x.de']))).toBe(true);
  });

  test('Liste betrifft NUR die genannte Adresse (kein Kollateral)', () => {
    const u = { email: 'a@x.de', emailPreferences: {} };
    expect(isVerificationReminderSuppressed(u, new Set(['jemand-anderes@x.de']))).toBe(false);
  });

  test('verification_reminder === true (ausdrücklich an) → senden', () => {
    const u = { email: 'a@x.de', emailPreferences: { verification_reminder: true } };
    expect(isVerificationReminderSuppressed(u, noOptOut)).toBe(false);
  });

  test('fehlende Felder → senden (kein falsches Unterdrücken)', () => {
    expect(isVerificationReminderSuppressed({ email: 'a@x.de' }, noOptOut)).toBe(false);
    expect(isVerificationReminderSuppressed({ email: 'a@x.de' }, undefined)).toBe(false);
  });

  test('kein User → fail-safe: NICHT senden', () => {
    expect(isVerificationReminderSuppressed(null, noOptOut)).toBe(true);
    expect(isVerificationReminderSuppressed(undefined, noOptOut)).toBe(true);
  });

  test('anderer Schalter (marketing aus) beeinflusst die Erinnerung NICHT', () => {
    // Kategorie-Trennung: eine Newsletter-Abmeldung darf die Verifizierung nicht stummschalten.
    const u = { email: 'a@x.de', emailPreferences: { marketing: false } };
    expect(isVerificationReminderSuppressed(u, noOptOut)).toBe(false);
  });
});

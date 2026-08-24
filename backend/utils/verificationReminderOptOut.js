// 📁 backend/utils/verificationReminderOptOut.js
// Widerspruch gegen die Verifizierungs-Erinnerung (24.08.2026).
//
// Die 30-Tage-Erinnerung an unbestätigte Konten MUSS einen wirksamen Opt-out haben
// (UWG). Sie darf schweigen, sobald der Kunde abbestellt hat, egal über welchen Weg:
//   1. email_unsubscribes-Liste          (category verification_reminder | all; alter/oneclick-Pfad)
//   2. emailPreferences.verification_reminder === false  (der Abmelde-Link /abmelden → routes/auth.js)
//   3. emailOptOut === true               (globaler „alles aus"-Schalter)
//
// Reine Funktion, damit der wichtigste Fall — „nach dem Abmelden wird NICHT gesendet" —
// hart per Test festnagelbar ist, ohne echte Mails auszulösen.

/**
 * @param {{email?: string, emailOptOut?: boolean, emailPreferences?: {verification_reminder?: boolean}}|null|undefined} user
 * @param {Set<string>|null|undefined} optOutEmails  Menge der aus email_unsubscribes abgemeldeten E-Mails
 * @returns {boolean} true = Erinnerung unterdrücken (nicht senden)
 */
function isVerificationReminderSuppressed(user, optOutEmails) {
  if (!user) return true; // kein User → im Zweifel NICHT senden (fail-safe)
  if (optOutEmails && typeof optOutEmails.has === 'function' && user.email && optOutEmails.has(user.email)) {
    return true;
  }
  if (user.emailOptOut === true) return true;
  if (user.emailPreferences && user.emailPreferences.verification_reminder === false) return true;
  return false;
}

module.exports = { isVerificationReminderSuppressed };

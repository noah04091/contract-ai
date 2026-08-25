// 📁 backend/utils/pulseDirectEmailGate.js
// Aus-Schalter für den DIREKTEN Legal-Pulse-Versender (services/pulseNotificationService.js),
// der an der email_queue vorbeisendet (25.08.2026).
//
// Er muss dieselbe eine Wahrheit lesen wie der Pulse-Abmelde-Link und die vier V2-Versender:
//   - legalPulseSettings.emailNotifications / .enabled  (via pulseEmailsDisabled) → das Feld,
//     das der Abmelde-Link /abmelden?category=legal_pulse schreibt.
// Zusätzlich achtet er die Profil-Schalter, die er schon immer gelesen hat:
//   - notificationSettings.email.enabled === false      (Profil „alle E-Mails")
//   - notificationSettings.email.legalPulse === false   (Profil-Zeile Legal Pulse)
//
// FAIL-OPEN bei fehlenden Feldern (wie pulseEmailsDisabled): fehlende Einstellung = Mails an.
// FAIL-SAFE nur bei komplett fehlendem User: dann NICHT senden.

const { pulseEmailsDisabled } = require("./pulseAccess");

/**
 * @param {{notificationSettings?: {email?: {enabled?: boolean, legalPulse?: boolean}}, legalPulseSettings?: {enabled?: boolean, emailNotifications?: boolean}}|null|undefined} user
 * @returns {boolean} true = diese Pulse-Mail NICHT senden
 */
function pulseDirectEmailSuppressed(user) {
  if (!user) return true; // fail-safe
  const ns = user.notificationSettings;
  return ns?.email?.enabled === false
    || ns?.email?.legalPulse === false
    || pulseEmailsDisabled(user);
}

module.exports = { pulseDirectEmailSuppressed };

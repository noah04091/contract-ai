// 📁 backend/utils/resubscribeBlock.js
// Ehrliches „Wieder anmelden" (24.08.2026):
//
// Nach einem Resubscribe ist die abgemeldete Kategorie wieder AN. Aber ein BREITERER
// Schalter kann trotzdem noch blockieren. Diese Funktion sagt, ob das der Fall ist,
// damit die Abmelde-Seite keine Erinnerungen verspricht, die nicht kommen (der Alptraum:
// „ich verlasse mich drauf" + Stille).
//
// Zwei breitere Schalter existieren neben der Fristen-Wahrheit (emailPreferences.calendar):
//   - emailOptOut === true            → global, blockiert JEDE Kategorie.
//   - notificationSettings.email.enabled === false → Profil „alle E-Mails", blockiert
//     zusätzlich die Fristen-/Kalender-Strecke (nur relevant für category 'calendar').
//
// Die einzelnen Vorwarn-Stufen (30/7/1) sind bewusst NICHT hier — die sind eine
// Feineinstellung innerhalb der Fristen, kein „du bekommst gar nichts".

/**
 * @param {{emailOptOut?: boolean, notificationSettings?: {email?: {enabled?: boolean}}}|null|undefined} user
 * @param {string} category  z.B. 'calendar' | 'legal_pulse' | 'marketing' | 'all'
 * @returns {{ stillBlocked: boolean, blockReason: 'all'|'email_master'|null }}
 */
function computeResubscribeBlock(user, category) {
  if (!user) return { stillBlocked: false, blockReason: null };
  if (user.emailOptOut === true) {
    return { stillBlocked: true, blockReason: 'all' };
  }
  if (category === 'calendar' && user.notificationSettings?.email?.enabled === false) {
    return { stillBlocked: true, blockReason: 'email_master' };
  }
  return { stillBlocked: false, blockReason: null };
}

/**
 * Führt das Resubscribe aus UND prüft den Blocker-Zustand am FRISCHEN Stand.
 *
 * Blocker-Fix 24.08.2026 (vom Gegenprüfer gefunden): Vorher prüfte der Handler den VOR
 * dem Update gelesenen User. Bei category 'all' setzt das Update aber emailOptOut:false —
 * der veraltete Stand meldete dann fälschlich „noch global abgemeldet" direkt nachdem der
 * Kunde sich wieder angemeldet hat. Deshalb hier: erst schreiben, DANN neu lesen, DANN prüfen.
 *
 * @returns {Promise<{notFound: boolean, stillBlocked?: boolean, blockReason?: 'all'|'email_master'|null}>}
 */
async function processResubscribe(usersCollection, userId, category, update) {
  const result = await usersCollection.updateOne({ _id: userId }, update);
  if (!result || result.matchedCount === 0) return { notFound: true };
  const fresh = await usersCollection.findOne({ _id: userId });
  return { notFound: false, ...computeResubscribeBlock(fresh, category) };
}

module.exports = { computeResubscribeBlock, processResubscribe };

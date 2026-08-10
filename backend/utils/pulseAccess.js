// 📁 backend/utils/pulseAccess.js
// Einheitliche Zugangsprüfung für Legal Pulse (Business+-Feature).
//
// WARUM ES DIESE DATEI GIBT (Befund 10.08.2026):
// Legal Pulse ist ein Business+-Feature, aber nur der Wach-Bericht hat das geprüft.
// Monitor, Radar-Mail und Staleness-Erinnerung bedienten JEDEN, der einmal eine
// Analyse hatte — auch gekündigte Konten. Gemessen: 25 % der überwachten Verträge
// gehörten Nicht-Zahlern, und zwei gekündigte Konten wurden am 09.08. sonntags
// erneut durch die KI-Pipeline geschickt.
//
// Der naive Guard `isBusinessOrHigher(user.subscriptionPlan)` reicht dafür NICHT:
// In einer Organisation erbt ein Mitglied den Plan seiner Org, sein eigenes
// `subscriptionPlan`-Feld bleibt dabei auf "free". Real betroffen sind 5 Konten
// der hs-niederrhein.de-Organisation (Org-Plan: enterprise). Ein reiner Feld-Check
// hätte sie ausgesperrt, obwohl ihre Organisation zahlt — genau dieser Fehler steckt
// bis heute im Wach-Bericht, der deshalb ebenfalls auf diesen Helfer umgestellt wird.
//
// Die Logik spiegelt bewusst middleware/checkSubscription.js (Admin-Safeguard +
// Org-Vererbung), damit Mail-Jobs und HTTP-Routen dieselbe Antwort geben.

const { isBusinessOrHigher } = require('../constants/subscriptionPlans');

/**
 * Darf dieser Nutzer die (kostenpflichtige) Legal-Pulse-Leistung bekommen?
 *
 * Wichtig für Aufrufer: Das übergebene users-Doc muss `_id` enthalten (für die
 * Org-Suche) und idealerweise `subscriptionPlan` + `role` in der Projektion haben.
 * Fehlende Felder führen zu einem konservativen "nein", nie zu einem Absturz.
 *
 * @param {import('mongodb').Db} db
 * @param {{_id?: any, subscriptionPlan?: string, role?: string}|null|undefined} user
 * @returns {Promise<boolean>}
 */
async function hasPulseAccess(db, user) {
  if (!user) return false;

  // Admin-Safeguard — identisch zu middleware/checkSubscription.js
  if (user.role === 'admin') return true;

  // 1. Eigener Plan (deckt business/enterprise/legendary/premium ab)
  if (isBusinessOrHigher(user.subscriptionPlan || 'free')) return true;

  // 2. Org-Vererbung: Free-Mitglied in einer zahlenden Organisation
  if (!db || !user._id) return false;
  try {
    const membership = await db.collection('organizationmembers').findOne({
      userId: user._id,
      isActive: true,
    });
    if (!membership) return false;

    const org = await db.collection('organizations').findOne({ _id: membership.organizationId });
    return isBusinessOrHigher((org && org.subscriptionPlan) || 'free');
  } catch (err) {
    // Fail-closed: im Zweifel keine kostenpflichtige Leistung. Der eigene Plan wurde
    // oben bereits geprüft, hier geht es nur noch um die Org-Vererbung.
    console.warn('[PulseAccess] Org-Lookup fehlgeschlagen (nicht kritisch):', err.message);
    return false;
  }
}

/** Felder, die ein Aufrufer mindestens projizieren sollte, damit die Prüfung greift. */
const PULSE_ACCESS_PROJECTION = { subscriptionPlan: 1, role: 1 };

module.exports = { hasPulseAccess, PULSE_ACCESS_PROJECTION };

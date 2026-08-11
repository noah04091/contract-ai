// 📁 backend/utils/syncOrgPlan.js
// Hält den Plan einer Organisation mit dem Plan ihres Inhabers im Gleichklang.
//
// WARUM ES DIESE DATEI GIBT (Befund 11.08.2026):
// `organizations.subscriptionPlan` wurde bisher NUR beim Anlegen gesetzt
// (routes/organizations.js) und danach nie wieder angefasst — der Stripe-Webhook
// aktualisiert ausschliesslich das users-Dokument. Folge: Kündigt oder degradiert
// der Inhaber, behält die Organisation ihren alten Plan. Seit die Org-Vererbung an
// den Gates greift (utils/planAccess.js), erben alle Mitglieder damit unbefristet
// weiter die alten Rechte — kostenlose Vollnutzung nach der Kündigung.
//
// REGEL: Die Organisation hat immer den Plan ihres Inhabers. Nach oben wie nach unten.
// Beide Richtungen sind wichtig: Faellt die Org bei einer Kuendigung auf "free", muss
// ein spaeterer Neuabschluss sie auch wieder anheben — sonst bliebe das zahlende Team
// ausgesperrt (genau dieser Fall wurde im TUEV am 11.08.2026 gefunden).
//
// ⚠️ WICHTIGSTE EIGENSCHAFT: Diese Funktion darf den Zahlungs-Webhook NIEMALS
// stören. Sie wirft nie — jeder Fehler wird geschluckt und geloggt. Ein Problem
// beim Org-Abgleich darf nicht dazu führen, dass Stripe den Webhook als
// fehlgeschlagen wertet und Ereignisse erneut zustellt.

// Gültige Werte laut models/Organization.js
const ERLAUBTE_PLAENE = ['free', 'business', 'enterprise'];

/**
 * Normalisiert einen Plan-Wert auf etwas, das im Organization-Schema erlaubt ist.
 * `premium`/`legendary` sind Alt-Namen für enterprise (siehe constants/subscriptionPlans.js).
 * null/undefined/unbekannt → "free".
 */
function normalisiereOrgPlan(plan) {
  const p = String(plan || 'free').toLowerCase();
  if (p === 'premium' || p === 'legendary') return 'enterprise';
  return ERLAUBTE_PLAENE.includes(p) ? p : 'free';
}

/**
 * Zieht den Plan der Organisation nach, deren INHABER dieser Nutzer ist.
 *
 * Bewusst nur für den Inhaber: Kündigt ein einfaches Mitglied sein privates Abo,
 * darf das die Organisation nicht herabstufen.
 *
 * @param {import('mongodb').Db} db          Native MongoDB-Verbindung
 * @param {{_id: any, email?: string}} user  Das users-Dokument, dessen Plan sich geändert hat
 * @param {string|null} neuerPlan            Der neue Plan des Nutzers (null → "free")
 * @returns {Promise<{geaendert: boolean, von?: string, auf?: string, grund?: string}>}
 */
async function syncOrgPlan(db, user, neuerPlan) {
  try {
    if (!db || !user || !user._id) return { geaendert: false, grund: 'kein Nutzer/keine DB' };

    const ziel = normalisiereOrgPlan(neuerPlan);

    const org = await db.collection('organizations').findOne({ ownerId: user._id });
    if (!org) return { geaendert: false, grund: 'nicht Inhaber einer Organisation' };

    const aktuell = normalisiereOrgPlan(org.subscriptionPlan);
    if (aktuell === ziel) return { geaendert: false, grund: 'Plan bereits gleich', von: aktuell, auf: ziel };

    await db.collection('organizations').updateOne(
      { _id: org._id },
      { $set: { subscriptionPlan: ziel, updatedAt: new Date() } }
    );

    console.log(
      `🏢 [OrgSync] Organisation "${org.name}" von "${aktuell}" auf "${ziel}" gesetzt ` +
      `(Inhaber ${user.email || user._id}). Alle Mitglieder erben ab sofort "${ziel}".`
    );
    return { geaendert: true, von: aktuell, auf: ziel };
  } catch (err) {
    // Bewusst geschluckt: Der Zahlungs-Webhook muss weiterlaufen. Ein fehlgeschlagener
    // Org-Abgleich ist aergerlich, aber niemals Grund, ein Stripe-Ereignis scheitern
    // zu lassen (Stripe wuerde es sonst erneut zustellen).
    console.error('❌ [OrgSync] Abgleich fehlgeschlagen (Webhook laeuft weiter):', err.message);
    return { geaendert: false, grund: 'Fehler: ' + err.message };
  }
}

module.exports = { syncOrgPlan, normalisiereOrgPlan };

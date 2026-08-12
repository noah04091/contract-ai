// 📁 backend/utils/planAccess.js
// Ermittelt den TATSÄCHLICH GELTENDEN Abo-Plan eines Nutzers — inklusive Vererbung
// aus einer Organisation.
//
// WARUM ES DIESE DATEI GIBT (Kartierung 11.08.2026):
// Zahlt eine ORGANISATION, bleibt `user.subscriptionPlan` der Mitglieder auf "free" —
// die Rechte erben sie von der Org. Fast alle Gates im Produkt lesen aber nur das rohe
// Feld und sperren solche Mitglieder aus. Real betroffen: die Hochschule Niederrhein
// (Org-Plan enterprise, aktive Stripe-Subscription des Inhabers) — 5 von 6 Mitgliedern
// kamen an KEINE bezahlte Funktion heran: Signaturen, Legal Pulse, Playbooks, QuickLint.
//
// Besonders tückisch war, dass `requirePremium` und `requireFeature` den bereits
// KORREKT ermittelten Wert aus `middleware/checkSubscription.js` (dort Zeile ~76,
// `req.user.plan`) anschliessend mit dem rohen Feld ueberschrieben haben. Diese Datei
// beendet das: beide Middlewares setzen `req.user.plan` jetzt auf den effektiven Plan.
//
// Die Logik spiegelt bewusst `middleware/checkSubscription.js` (Admin-Safeguard +
// Org-Vererbung), damit alle Gates dieselbe Antwort geben.
//
// WICHTIG — Fail-Verhalten: Schlaegt der Org-Lookup fehl, wird der EIGENE Plan
// zurueckgegeben. Das entspricht exakt dem bisherigen Verhalten; ein Ausfall der
// Org-Suche kann also niemanden schlechter stellen als vorher.
//
// ✅ ERLEDIGT (11.08.2026, Commit 60d8422a): Frueher wurde `organizations.subscriptionPlan`
// nur beim Anlegen gesetzt und bei einer Kuendigung nie zurueckgestuft — Mitglieder erbten
// den alten Plan dann unbefristet weiter. Seit `utils/syncOrgPlan.js` folgt der Org-Plan
// dem Plan seines Inhabers (Stripe-Webhook an 4 Stellen + beide Konto-Loesch-Pfade).
// Bewusst NICHT eingebaut: ein Live-Check auf den Zahlungsstatus des Inhabers — bei
// voruebergehendem `past_due` wuerde der sofort das ganze Team eines zahlenden Kunden
// aussperren. Verbleibende Randfaelle (dokumentiert, kein aktiver Schaden): manuelles
// Plan-Setzen im Admin-Panel, Ablauf eines Beta-Zugangs, sowie Organisationen, deren
// Inhaber-Konto nicht mehr existiert (aktuell 1 solche Org, ohne lebende Mitglieder).

/**
 * Liefert den effektiven Plan (kleingeschrieben): eigener bezahlter Plan,
 * sonst der geerbte Org-Plan, sonst "free".
 *
 * Der Aufrufer muss ein users-Doc mit `_id` uebergeben (fuer die Org-Suche);
 * `subscriptionPlan` und `role` sollten enthalten sein.
 *
 * @param {import('mongodb').Db} db
 * @param {{_id?: any, subscriptionPlan?: string, role?: string}|null|undefined} user
 * @returns {Promise<string>} z. B. "free" | "business" | "enterprise"
 */
async function resolveEffectivePlan(db, user) {
  if (!user) return 'free';

  const own = String(user.subscriptionPlan || 'free').toLowerCase();

  // Admin-Safeguard — identisch zu checkSubscription.js: greift nur, wenn der
  // Admin selbst keinen bezahlten Plan hat.
  if (user.role === 'admin' && (!user.subscriptionPlan || own === 'free')) {
    return 'enterprise';
  }

  // Ein eigener bezahlter Plan gewinnt immer — kein DB-Zugriff noetig.
  if (own !== 'free') return own;

  if (!db || !user._id) return own;

  try {
    const membership = await db.collection('organizationmembers').findOne({
      userId: user._id,
      isActive: true,
    });
    if (!membership) return own;

    const org = await db.collection('organizations').findOne({ _id: membership.organizationId });
    const orgPlan = String((org && org.subscriptionPlan) || '').toLowerCase();

    // Nur ein bezahlter Org-Plan hebt den eigenen "free"-Status an.
    return (orgPlan && orgPlan !== 'free') ? orgPlan : own;
  } catch (err) {
    console.warn('[PlanAccess] Org-Lookup fehlgeschlagen (fallback: eigener Plan):', err.message);
    return own;
  }
}

/** Felder, die ein Aufrufer mindestens projizieren sollte. `_id` liefert MongoDB per Default. */
const PLAN_ACCESS_PROJECTION = { subscriptionPlan: 1, role: 1 };

module.exports = { resolveEffectivePlan, PLAN_ACCESS_PROJECTION };

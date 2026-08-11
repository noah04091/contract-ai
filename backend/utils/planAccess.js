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
// ⚠️ BEKANNTE LUECKE (11.08.2026 gefunden, bewusst NICHT hier geloest):
// `organizations.subscriptionPlan` wird NUR beim Anlegen gesetzt (routes/organizations.js:66)
// und bei einer Kuendigung nirgends zurueckgestuft — der Stripe-Webhook fasst
// Organisationen gar nicht an. Kuendigt der Org-Inhaber, erben seine Mitglieder den
// alten Plan also weiter. Diese Luecke ist NICHT neu: `middleware/checkSubscription.js`
// vererbt schon laenger genauso; dieser Helfer weitet sie nur auf mehr Gates aus.
// Der richtige Ort fuer die Reparatur ist der Stripe-Webhook (Org beim Kuendigen
// mit herunterstufen) — NICHT hier: ein Live-Check auf den Zahlungsstatus des
// Inhabers wuerde bei voruebergehenden Zahlungsproblemen (past_due) sofort das
// ganze Team aussperren, und das trifft dann einen zahlenden Kunden.
// Aktuell kein Schaden: der einzige echte Org-Inhaber hat eine aktive Subscription.

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

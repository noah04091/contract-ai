// 🛑 18.08.2026: Die Kontolöschung beendete das Stripe-Abo NICHT — der Kunde löschte sein
// Konto, die Abbuchungen liefen weiter (realer Fall 16./17.08.: Kundin kaufte Business,
// löschte das Konto am selben Abend, das Abo blieb aktiv und hätte am 16.09. erneut
// abgebucht → PayPal-Dispute). Ein gelöschtes Konto löst kein Stripe-Ereignis aus,
// der Webhook kann diese Lücke also nie schließen — nur der Lösch-Pfad selbst.
//
// Verhalten (bewusst OHNE Rückerstattung):
//  - active/trialing  → cancel_at_period_end: bezahlter Zeitraum läuft aus, danach keine
//                       weitere Abbuchung. Kein Sofort-Cancel, damit nichts erstattet wird.
//  - past_due/unpaid  → sofortige Kündigung: keine weiteren Einzugsversuche gegen ein
//                       Konto, das es nicht mehr gibt (jeder Versuch wäre Dispute-Futter).
//
// Diese Funktion wirft NIE — das DSGVO-Löschrecht darf an Stripe nicht scheitern.
// Fehler landen im Alarmsystem (services/errorMonitoring) und im Rückgabeobjekt,
// das der Lösch-Pfad ins deleted_accounts-Archiv schreibt (manuell nachkündbar).

const ENDE_ZUM_PERIODENENDE = ["active", "trialing"];
const SOFORT_BEENDEN = ["past_due", "unpaid"];

async function cancelStripeSubscriptionsOnDelete(user, deps = {}) {
  const result = {
    attempted: false,
    stripeCustomerId: user?.stripeCustomerId || null,
    endOfPeriod: [],   // Sub-IDs, die zum Periodenende auslaufen
    canceledNow: [],   // Sub-IDs, die sofort beendet wurden (past_due/unpaid)
    errors: [],
  };

  try {
    if (!user || !user.stripeCustomerId) {
      return result; // Free-User oder Org-Mitglied ohne eigene Stripe-Kundschaft: nichts zu tun
    }

    const stripe = deps.stripe || (process.env.STRIPE_SECRET_KEY
      ? require("stripe")(process.env.STRIPE_SECRET_KEY)
      : null);
    if (!stripe) {
      result.errors.push("STRIPE_SECRET_KEY fehlt");
      meldeAlarm(new Error("Kontolöschung ohne Stripe-Key: Abo-Kündigung übersprungen"), user);
      return result;
    }

    result.attempted = true;

    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 100,
    });

    for (const sub of subs.data) {
      try {
        if (ENDE_ZUM_PERIODENENDE.includes(sub.status)) {
          if (!sub.cancel_at_period_end) {
            await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
          }
          result.endOfPeriod.push(sub.id);
        } else if (SOFORT_BEENDEN.includes(sub.status)) {
          await stripe.subscriptions.cancel(sub.id);
          result.canceledNow.push(sub.id);
        }
        // canceled/incomplete/incomplete_expired: nichts zu tun
      } catch (subErr) {
        result.errors.push(`${sub.id}: ${subErr.message}`);
        meldeAlarm(subErr, user, sub.id);
      }
    }

    if (result.endOfPeriod.length || result.canceledNow.length) {
      console.log(
        `🛑 Stripe-Abos bei Kontolöschung beendet (${user.email}):`,
        { endOfPeriod: result.endOfPeriod, canceledNow: result.canceledNow }
      );
    }
  } catch (err) {
    result.errors.push(err.message);
    meldeAlarm(err, user);
  }

  return result;
}

// Alarm darf selbst nie den Lösch-Pfad stören
function meldeAlarm(err, user, subId = null) {
  try {
    require("../services/errorMonitoring").captureError(err, {
      severity: "high",
      route: "account-deletion/stripe-cancel",
      userEmail: user?.email || null,
      body: subId ? { subscription: subId } : undefined,
    });
  } catch (_) { /* Alarmierung ist nie wichtiger als die Löschung */ }
}

module.exports = { cancelStripeSubscriptionsOnDelete };

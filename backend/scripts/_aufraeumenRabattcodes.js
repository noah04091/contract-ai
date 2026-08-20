// 🧹 Aufräumen nach dem TÜV vom 20.08.2026 — zwei kleine, geprüfte Eingriffe.
//
// Muss von Noah gestartet werden (der Klassifizierer blockt schreibende Produktiv-
// Skripte für Claude). Aus /c/Users/liebo/Documents/contract-ai-main/backend:
//     ! node scripts/_aufraeumenRabattcodes.js
//
// ── 1) Alt-Testcode "nnn" deaktivieren ──────────────────────────────────────
// 98 % Rabatt, duration "forever", unbegrenzt einlösbar, KEIN Ablaufdatum, seit
// 04.06.2025 aktiv. Drei Kleinbuchstaben sind praktisch geraten, und das Promo-Feld
// im Checkout steht jedem offen -> 0,38 € statt 19 €, dauerhaft.
// Vorher geprüft: 0 von 13 laufenden Abos tragen überhaupt einen Rabatt. Ein bereits
// gewährter Rabatt hängt am ABO, nicht am Code -> niemandem wird etwas weggenommen,
// die Deaktivierung wirkt nur auf NEUE Einlösungen.
// "AKTION10" (10 %, 1 Einlösung) bleibt bewusst aktiv: plausibel eine echte Aktion,
// und der Hebel ist klein. Nur notiert, nicht angefasst.
//
// ── 2) Einen gebundenen Lösch-Code lösen ────────────────────────────────────
// Ein Konto hat sein Rückkehr-Angebot im Zeitfenster zwischen den beiden Deploys
// von heute bekommen, als Lösch-Codes noch an die Stripe-Kundennummer gebunden waren.
// Löscht dieser Nutzer sein Konto, wäre der Code wertlos (neue Kundennummer). Das
// gespeicherte Angebot wird entfernt, damit er im Ernstfall einen frischen,
// ungebundenen bekommt. Der Code selbst bleibt in Stripe gültig, solange sein Konto
// besteht — es geht ihm also nichts verloren.
//
// Beide Schritte sind idempotent: Ein zweiter Lauf ändert nichts mehr.

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

(async () => {
  // ---------- 1) Testcode nnn ----------
  console.log("=== 1) Alt-Testcode 'nnn' ===");
  const treffer = await stripe.promotionCodes.list({ code: "nnn", active: true, limit: 1 });
  const p = treffer.data[0];
  if (!p) {
    console.log("  bereits inaktiv, nichts zu tun");
  } else {
    console.log(`  vorher: aktiv=${p.active} | ${p.coupon.percent_off} % ${p.coupon.duration} | ${p.times_redeemed} Einlösungen`);
    // Sicherheitsnetz: nur deaktivieren, wenn wirklich kein laufendes Abo daran hängt
    let mitRabatt = 0, starting_after;
    do {
      const seite = await stripe.subscriptions.list({ status: "active", limit: 100, starting_after });
      seite.data.forEach(s => { if (s.discounts?.[0] || s.discount) mitRabatt++; });
      starting_after = seite.has_more ? seite.data[seite.data.length - 1].id : null;
    } while (starting_after);
    console.log(`  laufende Abos mit irgendeinem Rabatt: ${mitRabatt}`);
    if (mitRabatt > 0) {
      console.log("  ⚠️ ABBRUCH: Es hängt doch ein laufendes Abo an einem Rabatt. Bitte erst prüfen.");
    } else {
      const nachher = await stripe.promotionCodes.update(p.id, { active: false });
      console.log(`  nachher: aktiv=${nachher.active}  ✅ deaktiviert`);
    }
  }

  const aktiv = await stripe.promotionCodes.list({ active: true, limit: 100 });
  console.log("\n  Noch aktive Codes:");
  aktiv.data.forEach(x => console.log(
    `   ${x.code} | ${x.coupon.percent_off} % ${x.coupon.duration}${x.coupon.duration_in_months ? " (" + x.coupon.duration_in_months + " Monate)" : ""}` +
    ` | Ablauf ${x.expires_at ? new Date(x.expires_at * 1000).toISOString().slice(0, 10) : "keiner"} | eingelöst ${x.times_redeemed}`
  ));

  // ---------- 2) Gebundenes Lösch-Angebot lösen ----------
  console.log("\n=== 2) Gebundene Lösch-Angebote ===");
  const c = new MongoClient(process.env.MONGO_URI);
  await c.connect();
  const users = c.db("contract_ai").collection("users");

  const kandidaten = await users.find({ "retentionOffer.anlass": "loeschung" })
    .project({ email: 1, retentionOffer: 1 }).toArray();

  let geloest = 0;
  for (const u of kandidaten) {
    let gebunden = false;
    try {
      const promo = await stripe.promotionCodes.retrieve(u.retentionOffer.promotionCodeId);
      gebunden = Boolean(promo.customer);
    } catch (_) { /* Code nicht mehr auffindbar: Angebot ist ohnehin wertlos */ gebunden = true; }

    if (!gebunden) {
      console.log(`  ${u.email}: ${u.retentionOffer.code} ist ungebunden ✅ bleibt`);
      continue;
    }
    await users.updateOne({ _id: u._id }, { $unset: { retentionOffer: "" } });
    geloest++;
    console.log(`  ${u.email}: ${u.retentionOffer.code} war an eine Kundennummer gebunden → gespeichertes Angebot entfernt`);
    console.log(`     (der Code bleibt in Stripe gültig, solange das Konto besteht; bei einer Löschung gibt es künftig einen frischen)`);
  }
  console.log(`\n  geprüft: ${kandidaten.length} | gelöst: ${geloest}`);

  await c.close();
  console.log("\n✅ fertig");
})().catch(e => { console.error("FEHLER:", e.message); process.exit(1); });

const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const { ObjectId } = require("mongodb");
const database = require("../config/database");
const verifyToken = require("../middleware/verifyToken");
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

let usersCollection;
let contractsCollection;

async function ensureDb() {
  if (usersCollection && contractsCollection) return;
  const db = await database.connect();
  usersCollection = db.collection("users");
  contractsCollection = db.collection("contracts");
}

ensureDb().catch(err => console.error("❌ Stripe-Route: MongoDB Fehler:", err.message));

router.post("/create-checkout-session", verifyToken, async (req, res) => {
  await ensureDb();
  const { plan, billing = 'monthly', code } = req.body; // billing: 'monthly'/'yearly', code: optionaler Promo-Code aus URL
  const email = req.user.email;

  // DEBUG LOGGING
  console.log("🐛 [STRIPE DEBUG] Request Body:", req.body);
  console.log("🐛 [STRIPE DEBUG] Extracted - Plan:", plan, "Billing:", billing);

  const priceIdMap = {
    // Monatliche Preise
    'business-monthly': process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    'enterprise-monthly': process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,

    // Jährliche Preise
    'business-yearly': process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
    'enterprise-yearly': process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,

    // Backwards compatibility für alte Buttons
    'business': process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || process.env.STRIPE_BUSINESS_PRICE_ID,
    'enterprise': process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID,

    // LEGACY: Alte premium Keys weiterhin unterstützen (mappt zu Enterprise)
    'premium-monthly': process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    'premium-yearly': process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    'premium': process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID,
  };

  const priceKey = `${plan}-${billing}`;
  const selectedPriceId = priceIdMap[priceKey] || priceIdMap[plan];

  // DEBUG LOGGING
  console.log("🐛 [STRIPE DEBUG] Price Key:", priceKey);
  console.log("🐛 [STRIPE DEBUG] Selected Price ID:", selectedPriceId);
  console.log("🐛 [STRIPE DEBUG] Available Keys:", Object.keys(priceIdMap));

  if (!selectedPriceId) {
    return res.status(400).json({
      message: "Ungültiger Plan oder Billing-Zyklus angegeben.",
      debug: { plan, billing, priceKey, availableKeys: Object.keys(priceIdMap) }
    });
  }

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "Benutzer nicht gefunden." });

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId: user._id.toString() },
      });

      customerId = customer.id;

      await usersCollection.updateOne(
        { email },
        { $set: { stripeCustomerId: customerId } }
      );
    }

    // 🎁 Optional: Promo-Code aus URL auto-anwenden (z.B. /pricing?code=BUSINESS10)
    // Fail-safe: Bei jedem Fehler/Mismatch -> Fallback auf manuelle Eingabe via allow_promotion_codes
    let resolvedPromotionCodeId = null;
    if (code && typeof code === 'string' && code.trim().length > 0) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: code.trim(),
          active: true,
          limit: 1
        });
        if (promoCodes.data.length > 0) {
          resolvedPromotionCodeId = promoCodes.data[0].id;
          console.log(`✅ [STRIPE] Promo-Code "${code.trim()}" auto-applied (promo_id: ${resolvedPromotionCodeId})`);
        } else {
          console.warn(`⚠️  [STRIPE] Promo-Code "${code.trim()}" nicht gefunden/inaktiv — Fallback auf manuelle Eingabe`);
        }
      } catch (lookupErr) {
        console.warn(`⚠️  [STRIPE] Promo-Code-Lookup fehlgeschlagen:`, lookupErr.message);
      }
    }

    const sessionParams = {
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: selectedPriceId, quantity: 1 }],
      subscription_data: {
        metadata: { userId: user._id.toString() },
      },
      // ✅ KMU-freundliche Rechnungsadresse (verpflichtend)
      billing_address_collection: 'required',
      // ✅ Firmenname und Steuernummer (optional für KMUs)
      custom_fields: [
        {
          key: 'company_name',
          label: {
            type: 'custom',
            custom: 'Firmenname (optional)'
          },
          type: 'text',
          optional: true
        },
        {
          key: 'tax_id',
          label: {
            type: 'custom',
            custom: 'Steuernummer / USt-ID (optional)'
          },
          type: 'text',
          optional: true
        }
      ],
      success_url: "https://contract-ai.de/success",
      cancel_url: "https://contract-ai.de/pricing?canceled=true",
    };

    // Stripe-API-Konflikt vermeiden: `discounts` und `allow_promotion_codes` sind mutually exclusive
    if (resolvedPromotionCodeId) {
      sessionParams.discounts = [{ promotion_code: resolvedPromotionCodeId }];
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`✅ Stripe Checkout-Session erstellt: ${session.id}${resolvedPromotionCodeId ? ' (mit Auto-Promo)' : ''}`);
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe Checkout Fehler:", err);
    res.status(500).json({ message: "Fehler bei Stripe Checkout", details: err.message });
  }
});

// ============================================
// 🔓 STUFE 2 — Einmal-Freischaltung EINER Analyse (One-time payment, kein Abo)
// Erstellt eine Stripe-Checkout-Session mit mode:"payment". Die Zuordnung
// (welcher Vertrag, welcher User) reist als metadata mit; der Webhook setzt nach
// erfolgreicher Zahlung contract.unlock.paid=true. Inert, solange STRIPE_UNLOCK_PRICE_ID
// nicht gesetzt ist (= Feature aus). Reversibel: Env entfernen.
router.post("/create-unlock-session", verifyToken, async (req, res) => {
  await ensureDb();
  const { contractId, kind: rawKind } = req.body || {};
  // 🔓 Zwei Einmalkauf-Arten: Analyse-Freischaltung (4,90 €) und generierter Vertrag (9,90 €).
  // Jede hat einen EIGENEN Stripe-Preis (Env). Default = analysis_unlock (rückwärtskompatibel).
  const kind = rawKind === "generate_unlock" ? "generate_unlock" : "analysis_unlock";
  const unlockPriceId = kind === "generate_unlock"
    ? process.env.STRIPE_GENERATE_UNLOCK_PRICE_ID
    : process.env.STRIPE_UNLOCK_PRICE_ID;

  if (!unlockPriceId) {
    // Preis (noch) nicht hinterlegt → Feature inert; Frontend fällt sanft auf /pricing zurück.
    return res.status(503).json({ message: "Einmal-Freischaltung ist derzeit nicht verfügbar." });
  }
  if (!contractId || !ObjectId.isValid(contractId)) {
    return res.status(400).json({ message: "Ungültige Vertrags-ID." });
  }

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) return res.status(404).json({ message: "Benutzer nicht gefunden." });

    // 🔒 Sicherheit: Vertrag muss DEM User gehören (sonst könnte man fremde IDs freikaufen)
    const contract = await contractsCollection.findOne(
      { _id: new ObjectId(contractId), userId: new ObjectId(req.user.userId) },
      { projection: { _id: 1, name: 1, unlock: 1 } }
    );
    if (!contract) return res.status(404).json({ message: "Vertrag nicht gefunden." });

    // Schon freigeschaltet? Dann kein erneuter Kauf nötig.
    if (contract.unlock && contract.unlock.paid === true) {
      return res.status(409).json({ message: "Diese Analyse ist bereits freigeschaltet.", alreadyUnlocked: true });
    }

    // Stripe-Kunde wiederverwenden/anlegen (wie beim Abo)
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      await usersCollection.updateOne({ _id: user._id }, { $set: { stripeCustomerId: customerId } });
    }

    const unlockMeta = {
      kind: kind,
      contractId: contractId,
      userId: user._id.toString(),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: unlockPriceId, quantity: 1 }],
      metadata: unlockMeta,
      // Metadaten auch ans PaymentIntent hängen (doppelt sicher fürs spätere Zuordnen)
      payment_intent_data: { metadata: unlockMeta },
      billing_address_collection: "required",
      // {CHECKOUT_SESSION_ID} ersetzt Stripe automatisch → verify-unlock kann GENAU diese
      // Session direkt abrufen (bombensicher, unabhängig von Webhook/Kundenliste).
      success_url: `https://contract-ai.de/contracts?view=${contractId}&unlocked=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://contract-ai.de/contracts?view=${contractId}&unlock_canceled=1`,
    });

    console.log(`✅ [STRIPE] Unlock-Session erstellt: ${session.id} (contract ${contractId})`);
    // 📊 Conversion-Tracking: Kauf-Absicht (Klick auf „Jetzt freischalten")
    require('../services/featureUsage').getInstance().trackFeatureUsage({ userId: req.user.userId, feature: 'unlock_checkout_started' }).catch(() => {});
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe Unlock-Session Fehler:", err);
    res.status(500).json({ message: "Fehler bei der Freischaltung", details: err.message });
  }
});

// ============================================
// 🔓 Fallback-Verifikation (falls der Webhook verzögert): bestätigt direkt bei Stripe,
// dass für diesen Vertrag eine bezahlte Unlock-Session existiert, und setzt das Flag.
router.get("/verify-unlock", verifyToken, async (req, res) => {
  await ensureDb();
  const { contractId, session_id } = req.query || {};
  if (!contractId || !ObjectId.isValid(contractId)) {
    return res.status(400).json({ message: "Ungültige Vertrags-ID." });
  }
  try {
    const contract = await contractsCollection.findOne(
      { _id: new ObjectId(contractId), userId: new ObjectId(req.user.userId) },
      { projection: { unlock: 1 } }
    );
    if (!contract) return res.status(404).json({ message: "Vertrag nicht gefunden." });
    if (contract.unlock && contract.unlock.paid === true) {
      return res.json({ unlocked: true });
    }

    // 🥇 Bevorzugt: GENAU die zurückgegebene Checkout-Session abrufen (bombensicher).
    if (session_id && typeof session_id === "string" && session_id.startsWith("cs_")) {
      try {
        const s = await stripe.checkout.sessions.retrieve(session_id);
        const okOwner = s?.metadata?.userId === String(req.user.userId);
        const okContract = s?.metadata?.contractId === String(contractId);
        const okKind = s?.metadata?.kind === "analysis_unlock" || s?.metadata?.kind === "generate_unlock";
        if (s && s.payment_status === "paid" && okOwner && okContract && okKind) {
          const r = await contractsCollection.updateOne(
            { _id: new ObjectId(contractId), userId: new ObjectId(req.user.userId), "unlock.paid": { $ne: true } },
            { $set: { "unlock.paid": true, "unlock.unlockedAt": new Date(), "unlock.stripeSessionId": s.id, "unlock.paymentIntentId": s.payment_intent || null, "unlock.source": "verify-session" } }
          );
          if (r.modifiedCount > 0) {
            console.log(`🔓 [verify-session] Analyse freigeschaltet (contract ${contractId})`);
            require('../services/featureUsage').getInstance().trackFeatureUsage({ userId: req.user.userId, feature: 'unlock_purchased' }).catch(() => {});
          }
          return res.json({ unlocked: true });
        }
      } catch (e) {
        console.warn(`⚠️ verify-unlock session retrieve fehlgeschlagen: ${e.message}`);
      }
    }

    // Fallback: bei Stripe nach bezahlter Session für genau diesen Vertrag suchen
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) }, { projection: { stripeCustomerId: 1 } });
    if (user?.stripeCustomerId) {
      const sessions = await stripe.checkout.sessions.list({ customer: user.stripeCustomerId, limit: 20 });
      const paid = sessions.data.find(s =>
        s.mode === "payment" &&
        s.payment_status === "paid" &&
        s.metadata && (s.metadata.kind === "analysis_unlock" || s.metadata.kind === "generate_unlock") &&
        s.metadata.contractId === String(contractId)
      );
      if (paid) {
        const r = await contractsCollection.updateOne(
          { _id: new ObjectId(contractId), userId: new ObjectId(req.user.userId), "unlock.paid": { $ne: true } },
          { $set: { "unlock.paid": true, "unlock.unlockedAt": new Date(), "unlock.stripeSessionId": paid.id, "unlock.source": "verify" } }
        );
        if (r.modifiedCount > 0) {
          require('../services/featureUsage').getInstance().trackFeatureUsage({ userId: req.user.userId, feature: 'unlock_purchased' }).catch(() => {});
        }
        return res.json({ unlocked: true });
      }
    }
    res.json({ unlocked: false });
  } catch (err) {
    console.error("❌ verify-unlock Fehler:", err);
    res.status(500).json({ message: "Fehler bei der Verifikation", details: err.message });
  }
});

// ============================================
// 🚀 FALLBACK: Direkte Subscription-Verifizierung mit Stripe
// Wird aufgerufen wenn Webhook zu langsam ist
// ============================================
router.post("/verify-subscription", verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const userId = req.user.userId;
    const email = req.user.email;

    console.log(`🔍 [VERIFY] Prüfe Subscription für User ${email}`);

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
    }

    // Wenn bereits aktiv, sofort zurückgeben
    if (user.subscriptionActive && user.subscriptionPlan !== 'free') {
      console.log(`✅ [VERIFY] User ${email} bereits aktiv: ${user.subscriptionPlan}`);
      return res.json({
        success: true,
        subscriptionActive: true,
        subscriptionPlan: user.subscriptionPlan,
        message: "Subscription bereits aktiv"
      });
    }

    // Prüfe ob User eine stripeCustomerId hat
    if (!user.stripeCustomerId) {
      console.log(`⚠️ [VERIFY] User ${email} hat keine stripeCustomerId`);
      return res.json({
        success: false,
        subscriptionActive: false,
        message: "Keine Stripe-Kundendaten vorhanden"
      });
    }

    // Direkt bei Stripe nach aktiven Subscriptions fragen
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      // Auch "trialing" prüfen
      const trialingSubscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'trialing',
        limit: 1
      });

      if (trialingSubscriptions.data.length === 0) {
        console.log(`⚠️ [VERIFY] Keine aktive Subscription bei Stripe für ${email}`);
        return res.json({
          success: false,
          subscriptionActive: false,
          message: "Keine aktive Subscription bei Stripe gefunden"
        });
      }

      subscriptions.data = trialingSubscriptions.data;
    }

    // Aktive Subscription gefunden - Plan ermitteln
    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price?.id;

    const priceMap = {
      [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID]: "business",
      [process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID]: "business",
      [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID]: "enterprise",
      [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID]: "enterprise",
      [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID]: "enterprise",
      [process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID]: "enterprise",
      [process.env.STRIPE_BUSINESS_PRICE_ID]: "business",
      [process.env.STRIPE_PREMIUM_PRICE_ID]: "enterprise",
    };

    const plan = priceMap[priceId] || "business";

    console.log(`🎉 [VERIFY] Aktive Subscription gefunden für ${email}: ${plan} (Price: ${priceId})`);

    // User in Datenbank aktualisieren (gleiche Logik wie Webhook)
    const updateData = {
      subscriptionActive: true,
      isPremium: plan === "business" || plan === "enterprise",
      isBusiness: plan === "business",
      isEnterprise: plan === "enterprise",
      subscriptionPlan: plan,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      // Limits basierend auf Plan setzen
      analysisLimit: plan === "enterprise" ? Infinity : (plan === "business" ? 25 : 3),
      optimizationLimit: plan === "enterprise" ? Infinity : (plan === "business" ? 15 : 0),
      verifiedByFallback: true,
      verifiedAt: new Date()
    };

    await usersCollection.updateOne(
      { email },
      { $set: updateData }
    );

    console.log(`✅ [VERIFY] User ${email} erfolgreich auf ${plan} aktualisiert (Fallback)`);

    // 📋 Activity Log: Subscription aktiviert
    try {
      const { logActivityStandalone, ActivityTypes } = require('../services/activityLogger');
      await logActivityStandalone({
        type: ActivityTypes.SUBSCRIPTION_ACTIVATED,
        userId: userId,
        userEmail: email,
        description: `Subscription aktiviert: ${plan}`,
        details: {
          plan: plan,
          stripeSubscriptionId: subscription.id
        },
        severity: 'info',
        source: 'stripe'
      });
    } catch (logErr) {
      console.error("Activity Log Error:", logErr);
    }

    return res.json({
      success: true,
      subscriptionActive: true,
      subscriptionPlan: plan,
      message: `Subscription ${plan} erfolgreich aktiviert`
    });

  } catch (error) {
    console.error("❌ [VERIFY] Fehler bei Subscription-Verifizierung:", error);
    return res.status(500).json({
      success: false,
      message: "Fehler bei der Verifizierung",
      error: error.message
    });
  }
});

// TEMPORARY TEST ENDPOINT - REMOVE AFTER TESTING
router.post("/test-price-mapping", async (req, res) => {
  const { plan, billing = 'monthly' } = req.body;

  console.log("🧪 [TEST] Request Body:", req.body);
  console.log("🧪 [TEST] Extracted - Plan:", plan, "Billing:", billing);

  const priceIdMap = {
    'business-monthly': process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    'premium-monthly': process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    'business-yearly': process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
    'premium-yearly': process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    'business': process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || process.env.STRIPE_BUSINESS_PRICE_ID,
    'premium': process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID,
  };

  const priceKey = `${plan}-${billing}`;
  const selectedPriceId = priceIdMap[priceKey] || priceIdMap[plan];

  console.log("🧪 [TEST] Price Key:", priceKey);
  console.log("🧪 [TEST] Selected Price ID:", selectedPriceId);
  console.log("🧪 [TEST] Available Keys:", Object.keys(priceIdMap));

  res.json({
    success: true,
    plan,
    billing,
    priceKey,
    selectedPriceId,
    expectedPrice: plan === 'business' && billing === 'monthly' ? '19€' :
                  plan === 'business' && billing === 'yearly' ? '190€' :
                  (plan === 'enterprise' || plan === 'premium') && billing === 'monthly' ? '29€' :
                  (plan === 'enterprise' || plan === 'premium') && billing === 'yearly' ? '290€' : 'unknown',
    availableKeys: Object.keys(priceIdMap)
  });
});

module.exports = router;


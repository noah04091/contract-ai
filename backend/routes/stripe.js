const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const database = require("../config/database");
const verifyToken = require("../middleware/verifyToken");
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

let usersCollection;

async function ensureDb() {
  if (usersCollection) return;
  const db = await database.connect();
  usersCollection = db.collection("users");
}

ensureDb().catch(err => console.error("❌ Stripe-Route: MongoDB Fehler:", err.message));

router.post("/create-checkout-session", verifyToken, async (req, res) => {
  await ensureDb();
  const { plan, billing = 'monthly' } = req.body; // billing: 'monthly' oder 'yearly'
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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      allow_promotion_codes: true,
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
    });

    console.log(`✅ Stripe Checkout-Session erstellt: ${session.id}`);
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe Checkout Fehler:", err);
    res.status(500).json({ message: "Fehler bei Stripe Checkout", details: err.message });
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


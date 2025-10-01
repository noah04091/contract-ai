const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const { MongoClient } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const client = new MongoClient(process.env.MONGO_URI);

let usersCollection;

client.connect().then(() => {
  const db = client.db("contract_ai");
  usersCollection = db.collection("users");
  console.log("✅ Stripe-Route: MongoDB verbunden");
}).catch((err) => {
  console.error("❌ MongoDB-Verbindung fehlgeschlagen:", err.message);
});

router.post("/create-checkout-session", verifyToken, async (req, res) => {
  const { plan, billing = 'monthly' } = req.body; // billing: 'monthly' oder 'yearly'
  const email = req.user.email;

  // DEBUG LOGGING
  console.log("🐛 [STRIPE DEBUG] Request Body:", req.body);
  console.log("🐛 [STRIPE DEBUG] Extracted - Plan:", plan, "Billing:", billing);

  const priceIdMap = {
    // Monatliche Preise
    'business-monthly': process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    'premium-monthly': process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,

    // Jährliche Preise
    'business-yearly': process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
    'premium-yearly': process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,

    // Backwards compatibility für alte Buttons
    'business': process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || process.env.STRIPE_BUSINESS_PRICE_ID,
    'premium': process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID,
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
      payment_method_types: ["card"],
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
            type: 'text',
            text: 'Firmenname (optional)'
          },
          type: 'text',
          optional: true
        },
        {
          key: 'tax_id',
          label: {
            type: 'text',
            text: 'Steuernummer / USt-ID (optional)'
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
                  plan === 'premium' && billing === 'monthly' ? '29€' :
                  plan === 'premium' && billing === 'yearly' ? '290€' : 'unknown',
    availableKeys: Object.keys(priceIdMap)
  });
});

module.exports = router;


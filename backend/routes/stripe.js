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

module.exports = router;

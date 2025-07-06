// 📁 backend/routes/stripe.js - EINHEITLICHE ROUTE FÜR ALLE PLÄNE
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

// 💳 Einheitliche Stripe Checkout-Session für alle Pläne
router.post("/create-checkout-session", verifyToken, async (req, res) => {
  const { plan } = req.body; // "business", "premium", oder "default"
  const email = req.user.email;

  console.log(`🔍 Checkout-Request: Email=${email}, Plan=${plan}`);

  // ✅ Alle Ihre Pläne in einer Map
  const priceIdMap = {
    business: process.env.STRIPE_BUSINESS_PRICE_ID,   // Business Plan
    premium: process.env.STRIPE_PREMIUM_PRICE_ID,     // Premium Plan
    default: process.env.STRIPE_DEFAULT_PRICE_ID,     // = Business Plan (Fallback)
  };

  const selectedPriceId = priceIdMap[plan];
  if (!selectedPriceId) {
    console.error(`❌ Ungültiger Plan: ${plan}`);
    return res.status(400).json({ 
      message: "Ungültiger Plan angegeben.",
      availablePlans: Object.keys(priceIdMap)
    });
  }

  console.log(`✅ Plan-Mapping: ${plan} → ${selectedPriceId}`);

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "Benutzer nicht gefunden." });

    let customerId = user.stripeCustomerId;

    // ➕ Stripe-Kunde anlegen (nur falls noch nicht vorhanden)
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId: user._id.toString() },
      });

      customerId = customer.id;
      console.log(`✅ Customer erstellt: ${customerId}`);

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
      
      // 🔥 KRITISCH: Sofortige Zahlung erzwingen
      subscription_data: {
        trial_period_days: 0,  // Keine Trial-Periode
        metadata: { 
          userId: user._id.toString(),
          planType: plan,
          priceId: selectedPriceId
        },
      },
      payment_behavior: "default_incomplete",  // Sofortige Zahlung
      
      success_url: "https://contract-ai.de/success",
      cancel_url: "https://contract-ai.de/pricing?canceled=true",
    });

    console.log(`✅ Checkout-Session erstellt: ${session.id} für Plan: ${plan}`);
    res.json({ 
      url: session.url,
      sessionId: session.id,
      plan: plan,
      priceId: selectedPriceId
    });

  } catch (err) {
    console.error("❌ Stripe Checkout Fehler:", err);
    res.status(500).json({ 
      message: "Fehler bei Stripe Checkout", 
      details: err.message,
      plan: plan
    });
  }
});

module.exports = router;
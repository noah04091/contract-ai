// 📁 backend/routes/stripe.js
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
});

// 💳 Stripe Checkout-Session erstellen
router.post("/create-checkout-session", verifyToken, async (req, res) => {
  const { plan } = req.body;
  const email = req.user.email;

  const priceIdMap = {
    business: "price_1RMpeRE21h94C5yQNgoza8cX",
    premium: "price_1RMpexE21h94C5yQnMRTS0q5",
  };
  const selectedPriceId = priceIdMap[plan];

  if (!selectedPriceId) {
    return res.status(400).json({ message: "Ungültiger Plan angegeben." });
  }

  try {
    const user = await usersCollection.findOne({ email });
    let customerId = user?.stripeCustomerId;

    // Falls noch kein Stripe-Kunde existiert → erstellen & speichern
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
      payment_method_types: ["card"],
      line_items: [{ price: selectedPriceId, quantity: 1 }],
      success_url: "https://contract-ai.de/success",
      cancel_url: "https://contract-ai.de/pricing?canceled=true",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe Checkout Fehler:", err.message);
    res.status(500).json({ message: "Fehler bei Stripe Checkout" });
  }
});

module.exports = router;

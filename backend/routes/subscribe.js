// 📁 backend/routes/subscribe.js
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const client = new MongoClient(process.env.MONGO_URI);

let usersCollection;
(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    usersCollection = db.collection("users");
    console.log("✅ Subscribe: MongoDB verbunden");
  } catch (err) {
    console.error("❌ MongoDB-Verbindung fehlgeschlagen:", err.message);
  }
})();

// ✅ Stripe Checkout Session für Standard-Plan erstellen
router.post("/create-checkout-session", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: req.user.userId });

    if (!user) {
      return res.status(404).json({ message: "Benutzer nicht gefunden." });
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() },
      });

      customerId = customer.id;

      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { stripeCustomerId: customerId } }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: customerId,
      allow_promotion_codes: true,
      line_items: [
        {
          price: process.env.STRIPE_DEFAULT_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("❌ Stripe Checkout Fehler:", error.message);
    res.status(500).json({ message: "Fehler beim Stripe Checkout" });
  }
});

module.exports = router;

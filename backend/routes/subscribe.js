// 📁 backend/routes/subscribe.js
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const client = new MongoClient(process.env.MONGO_URI);
let usersCollection;
(async () => {
  await client.connect();
  const db = client.db("contract_ai");
  usersCollection = db.collection("users");
})();

// ✅ Stripe Checkout Session erstellen
router.post("/create-checkout-session", verifyToken, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
      metadata: {
        userId: req.user.userId,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("❌ Stripe Checkout Fehler:", error);
    res.status(500).json({ message: "Fehler beim Upgrade: Stripe Fehler" });
  }
});

module.exports = router;

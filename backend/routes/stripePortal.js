// 📁 backend/routes/stripePortal.js
const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const verifyToken = require("../middleware/verifyToken");
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_URI);
let users;

(async () => {
  await client.connect();
  users = client.db("contract_ai").collection("users");
})();

router.post("/", verifyToken, async (req, res) => {
  try {
    const user = await users.findOne({ email: req.user.email });
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ message: "Kein Stripe-Konto verknüpft." });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: "https://contract-ai.de/me",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Fehler beim Erstellen des Kundenportals:", err.message);
    res.status(500).json({ message: "Fehler beim Stripe-Kundenportal" });
  }
});

module.exports = router;

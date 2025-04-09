// 📁 backend/routes/stripe.js
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const verifyToken = require("../middleware/verifyToken");
require("dotenv").config();

// 🔐 Stripe Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 💳 Stripe Checkout-Session erstellen
router.post("/create-checkout-session", verifyToken, async (req, res) => {
  console.log("🧪 Token beim Checkout:", req.user);

  try {
    const tokenEmail = req.user.email;
    if (!tokenEmail) {
      console.warn("⚠️ Kein E-Mail im JWT-Token vorhanden:", req.user);
      return res.status(400).json({ message: "E-Mail im Token fehlt." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: tokenEmail, // ✅ entscheidend für Webhook-Erkennung!
      allow_promotion_codes: true,
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: "https://contract-ai.de/dashboard?status=success",
      cancel_url: "https://contract-ai.de/dashboard?status=cancel",
    });

    console.log("✅ Stripe-Session erstellt:", session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe-Checkout-Fehler:", err.message);
    res.status(500).json({ message: "Fehler bei Stripe Checkout" });
  }
});

module.exports = router;

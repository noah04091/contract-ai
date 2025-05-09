// 📁 backend/routes/stripeWebhook.js
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const { MongoClient } = require("mongodb");
require("dotenv").config();

// 🧠 Stripe & MongoDB Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const client = new MongoClient(process.env.MONGO_URI);

let db, usersCollection;

// 🔌 MongoDB einmalig verbinden
(async () => {
  try {
    await client.connect();
    db = client.db("contract_ai");
    usersCollection = db.collection("users");
    console.log("✅ StripeWebhook: MongoDB verbunden");
  } catch (err) {
    console.error("❌ Fehler bei MongoDB-Verbindung (StripeWebhook):", err);
  }
})();

// 📩 Webhook-Route (⚠️ raw body notwendig!)
router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook-Verifikation fehlgeschlagen:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const email =
      session.customer_email ||
      session.customer_details?.email ||
      null;

    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;

    // 🧠 Preis-ID aus Checkout ermitteln
    const priceId = session?.display_items?.[0]?.price?.id || session?.line_items?.[0]?.price?.id;
    const priceMap = {
      "price_1RMpeRE21h94C5yQNgoza8cX": "business",
      "price_1RMpexE21h94C5yQnMRTS0q5": "premium",
    };
    const plan = priceMap[priceId] || "unknown";

    console.log("📦 Webhook-Session empfangen:", {
      email,
      stripeCustomerId,
      stripeSubscriptionId,
      plan,
    });

    if (!email) {
      console.warn("⚠️ Keine E-Mail im Session-Objekt vorhanden");
      return res.status(400).send("Fehlende E-Mail");
    }

    try {
      const result = await usersCollection.updateOne(
        { email },
        {
          $set: {
            isPremium: plan === "premium",
            isBusiness: plan === "business",
            subscriptionPlan: plan,
            stripeCustomerId,
            stripeSubscriptionId,
            subscriptionStatus: "active",
            premiumSince: new Date(),
          },
        },
        { upsert: true } // Optional: Nutzer anlegen, falls nicht vorhanden
      );

      if (result.modifiedCount === 1 || result.upsertedCount === 1) {
        console.log(`✅ Nutzer ${email} erfolgreich aktualisiert (${plan})`);
      } else {
        console.warn(`⚠️ Nutzer ${email} nicht geändert.`);
      }
    } catch (err) {
      console.error("❌ Fehler beim DB-Update:", err);
      return res.status(500).send("Fehler beim Updaten");
    }
  }

  res.status(200).send("✅ Webhook empfangen");
});

module.exports = router;

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

  // 🎯 Nur bei erfolgreichem Checkout handeln
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // 🧠 Sicherste Methode: E-Mail über beide Wege prüfen
    const email =
      session.customer_email ||
      session.customer_details?.email ||
      null;

    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;

    console.log("📦 Webhook-Session empfangen:", {
      id: session.id,
      email,
      stripeCustomerId,
      stripeSubscriptionId,
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
            isPremium: true,
            stripeCustomerId,
            stripeSubscriptionId,
            premiumSince: new Date(),
          },
        }
      );

      if (result.modifiedCount === 1) {
        console.log(`✅ Nutzer ${email} erfolgreich auf Premium aktualisiert.`);
      } else {
        console.warn(`⚠️ Kein Nutzer mit der E-Mail ${email} gefunden.`);
      }
    } catch (err) {
      console.error("❌ Fehler beim Update:", err);
      return res.status(500).send("Fehler beim Updaten");
    }
  }

  res.status(200).send("✅ Webhook empfangen");
});

module.exports = router;

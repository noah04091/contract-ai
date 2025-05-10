// 📁 backend/routes/stripeWebhook.js
const express = require("express");
const router = express.Router();
const { MongoClient, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

// 🔌 MongoDB einmalig verbinden
const client = new MongoClient(MONGO_URI);
let db, users;

(async () => {
  try {
    await client.connect();
    db = client.db("contract_ai");
    users = db.collection("users");
    console.log("✅ StripeWebhook: MongoDB verbunden");
  } catch (err) {
    console.error("❌ MongoDB-Verbindung fehlgeschlagen:", err);
  }
})();

// 📩 Webhook-Route (⚠️ raw body notwendig!)
router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("❌ Webhook-Verifikation fehlgeschlagen:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;

    const email = session.customer_email || session.customer_details?.email || null;

    // 📥 Subscription-Daten holen
    let plan = "unknown";
    try {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const priceId = subscription.items.data[0].price.id;

      const priceMap = {
        "price_1RMpeRE21h94C5yQNgoza8cX": "business",
        "price_1RMpexE21h94C5yQnMRTS0q5": "premium",
      };

      plan = priceMap[priceId] || "unknown";
    } catch (err) {
      console.error("❌ Fehler beim Abrufen der Subscription:", err.message);
      return res.status(500).send("Fehler beim Lesen der Subscription");
    }

    console.log("📦 Webhook empfangen:", { email, stripeCustomerId, plan });

    try {
      const query = stripeCustomerId ? { stripeCustomerId } : { email };
      const user = await users.findOne(query);

      if (!user) {
        console.warn("⚠️ Kein Nutzer mit passender E-Mail oder Stripe-ID gefunden.");
        return res.sendStatus(200); // Vermeidet Wiederholungen von Stripe
      }

      await users.updateOne(
        { _id: new ObjectId(user._id) },
        {
          $set: {
            subscriptionActive: true,
            isPremium: plan === "premium",
            isBusiness: plan === "business",
            subscriptionPlan: plan,
            stripeCustomerId,
            stripeSubscriptionId,
            premiumSince: new Date(),
            subscriptionStatus: "active",
          },
        }
      );

      console.log(`✅ Abo bei ${email || user.email} erfolgreich aktiviert (${plan})`);
    } catch (err) {
      console.error("❌ Fehler beim Update:", err.message);
      return res.status(500).send("Fehler beim DB-Update");
    }
  }

  res.status(200).send("✅ Webhook verarbeitet");
});

module.exports = router;

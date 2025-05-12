const express = require("express");
const router = express.Router();
const { MongoClient, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

// MongoDB Verbindung
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

// Webhook-Route (⚠️ raw body notwendig!)
router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("❌ Webhook-Verifikation fehlgeschlagen:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const eventType = event.type;
  const session = event.data.object;

  try {
    if (eventType === "checkout.session.completed") {
      const stripeCustomerId = session.customer;
      const stripeSubscriptionId = session.subscription;
      const email = session.customer_email || session.customer_details?.email || null;

      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;

      const priceMap = {
        [process.env.STRIPE_BUSINESS_PRICE_ID]: "business",
        [process.env.STRIPE_PREMIUM_PRICE_ID]: "premium",
      };

      const plan = priceMap[priceId] || "unknown";
      console.log("📦 Webhook: Abo abgeschlossen:", { email, stripeCustomerId, plan });

      const user = await users.findOne(stripeCustomerId ? { stripeCustomerId } : { email });
      if (!user) {
        console.warn("⚠️ Kein Nutzer mit passender Stripe-ID oder E-Mail gefunden.");
        return res.sendStatus(200);
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

      console.log(`✅ Nutzer ${email || user.email} auf ${plan}-Plan aktualisiert`);
    }

    if (eventType === "customer.subscription.deleted") {
      const subscription = session;
      const stripeCustomerId = subscription.customer;

      const user = await users.findOne({ stripeCustomerId });
      if (!user) {
        console.warn("⚠️ Kein Nutzer zur Kündigung gefunden.");
        return res.sendStatus(200);
      }

      await users.updateOne(
        { _id: new ObjectId(user._id) },
        {
          $set: {
            subscriptionActive: false,
            isPremium: false,
            isBusiness: false,
            subscriptionPlan: null,
            subscriptionStatus: "cancelled",
          },
        }
      );

      console.log(`❌ Abo von ${user.email} wurde gekündigt.`);
    }

    res.status(200).send("✅ Webhook verarbeitet");
  } catch (err) {
    console.error("❌ Fehler in der Webhook-Logik:", err.message);
    res.status(500).send("Interner Fehler bei der Verarbeitung des Webhooks");
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Verbindung zur Datenbank wird von server.js übernommen
let users;

// Diese Funktion ermöglicht es uns, die Datenbank-Verbindung 
// aus der server.js zu verwenden statt eine neue zu erstellen
const init = (db) => {
  users = db.collection("users");
  console.log("✅ StripeWebhook: MongoDB-Verbindung übernommen");
  return router;
};

// ✅ KEIN bodyParser hier - wird in server.js angewendet
router.post("/", async (req, res) => {
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
      const stripeCustomerId = session.customer;

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

// Anstatt einer direkten MongoDB-Verbindung hier
// exportieren wir die init-Funktion, die die Verbindung übernimmt
module.exports = router;
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
  console.log("✅ Stripe-Route: MongoDB verbunden");
});

// 💳 Stripe Checkout-Session erstellen
router.post("/create-checkout-session", verifyToken, async (req, res) => {
  const { plan } = req.body;
  const email = req.user.email;
  const planKey = plan.toLowerCase();

  const priceIdMap = {
    business: process.env.STRIPE_BUSINESS_PRICE_ID,
    premium: process.env.STRIPE_PREMIUM_PRICE_ID,
  };

  const selectedPriceId = priceIdMap[planKey];
  if (!selectedPriceId) {
    return res.status(400).json({ message: "Ungültiger Plan angegeben." });
  }

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "Benutzer nicht gefunden." });

    let customerId = user.stripeCustomerId;

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

    // 🔍 Prüfen, ob bereits aktive Subscription existiert
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    if (existingSubscriptions.data.length > 0) {
      const currentSubscription = existingSubscriptions.data[0];
      const currentSubscriptionItem = currentSubscription.items.data[0];
      
      // 🔍 Prüfen ob es wirklich ein anderer Plan ist
      const currentPriceId = currentSubscriptionItem.price.id;
      if (currentPriceId === selectedPriceId) {
        return res.json({ 
          success: true, 
          message: "Sie haben bereits diesen Plan aktiv",
          alreadyActive: true
        });
      }

      // Upgrade durchführen
      const updatedSubscription = await stripe.subscriptions.update(currentSubscription.id, {
        items: [{
          id: currentSubscriptionItem.id,
          price: selectedPriceId,
        }],
        proration_behavior: 'always_invoice',
        billing_cycle_anchor: 'unchanged',
      });

      console.log(`✅ Subscription upgraded für ${email}: ${currentSubscription.id}`);

      await usersCollection.updateOne(
        { email },
        {
          $set: {
            subscriptionActive: true,
            isPremium: planKey === "premium",
            isBusiness: planKey === "business",
            subscriptionPlan: planKey,
            stripeSubscriptionId: updatedSubscription.id,
            subscriptionStatus: "active",
          },
        }
      );

      return res.json({ 
        success: true, 
        message: "Subscription erfolgreich aktualisiert",
        subscriptionId: updatedSubscription.id 
      });
    } else {
      // Neue Subscription erstellen
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        allow_promotion_codes: true,
        payment_method_types: ["card"],
        line_items: [{ price: selectedPriceId, quantity: 1 }],
        success_url: "https://contract-ai.de/success",
        cancel_url: "https://contract-ai.de/pricing?canceled=true",
        subscription_data: {
          trial_period_days: 0,
        }
      });

      return res.json({ url: session.url });
    }

  } catch (err) {
    console.error("❌ Stripe Checkout Fehler:", err.message);
    res.status(500).json({ message: "Fehler bei Stripe Checkout", error: err.message });
  }
});

// 🔄 Upgrade-Route (kann optional bleiben)
router.post("/upgrade-subscription", verifyToken, async (req, res) => {
  const { plan } = req.body;
  const email = req.user.email;
  const planKey = plan.toLowerCase();

  const priceIdMap = {
    business: process.env.STRIPE_BUSINESS_PRICE_ID,
    premium: process.env.STRIPE_PREMIUM_PRICE_ID,
  };

  const selectedPriceId = priceIdMap[planKey];
  if (!selectedPriceId) {
    return res.status(400).json({ message: "Ungültiger Plan angegeben." });
  }

  try {
    const user = await usersCollection.findOne({ email });
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ message: "Kunde nicht gefunden." });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({ message: "Keine aktive Subscription gefunden." });
    }

    const subscription = subscriptions.data[0];
    const subscriptionItem = subscription.items.data[0];

    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscriptionItem.id,
        price: selectedPriceId,
      }],
      proration_behavior: 'always_invoice',
      billing_cycle_anchor: 'unchanged',
    });

    await usersCollection.updateOne(
      { email },
      {
        $set: {
          subscriptionActive: true,
          isPremium: planKey === "premium",
          isBusiness: planKey === "business",
          subscriptionPlan: planKey,
          subscriptionStatus: "active",
        },
      }
    );

    console.log(`✅ Subscription upgraded: ${email} -> ${planKey}`);
    res.json({ 
      success: true, 
      message: "Subscription erfolgreich aktualisiert",
      subscriptionId: updatedSubscription.id 
    });

  } catch (err) {
    console.error("❌ Upgrade Fehler:", err.message);
    res.status(500).json({ message: "Fehler beim Upgrade", error: err.message });
  }
});

module.exports = router;
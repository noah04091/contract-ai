// 📁 backend/routes/stripePortal.js

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();

// 🛢️ MongoDB-Verbindung vorbereiten
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
let usersCollection;

const client = new MongoClient(MONGO_URI);
client.connect()
  .then(() => {
    const db = client.db("contract_ai");
    usersCollection = db.collection("users");
    console.log("✅ StripePortal: MongoDB verbunden");
  })
  .catch(err => {
    console.error("❌ Fehler bei MongoDB-Verbindung:", err.message);
  });

// 📬 Stripe Customer Portal öffnen
router.post("/", verifyToken, async (req, res) => {
  try {
    console.log("📥 Anfrage /stripe/portal erhalten");
    console.log("🍪 Cookies:", req.cookies);
    console.log("👤 Benutzer:", req.user);

    if (!req.user?.userId) {
      return res.status(401).json({ message: "Nicht autorisiert (kein Token)." });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "Benutzer nicht gefunden." });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: "Stripe-Kunde nicht vorhanden." });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: process.env.FRONTEND_URL || "https://contract-ai.de/profile",
    });

    console.log("🔗 Weiterleitung zum Stripe Kundenportal...");
    res.json({ url: portalSession.url });

  } catch (err) {
    console.error("❌ Fehler beim Öffnen des Stripe Portals:", err);
    res.status(500).json({ message: "Fehler beim Öffnen des Kundenportals." });
  }
});

module.exports = router;

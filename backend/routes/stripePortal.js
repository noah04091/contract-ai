// 📁 backend/routes/stripePortal.js

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { ObjectId } = require("mongodb");
const database = require("../config/database");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();

let usersCollection;

async function ensureDb() {
  if (usersCollection) return;
  const db = await database.connect();
  usersCollection = db.collection("users");
}

ensureDb().catch(err => console.error("❌ StripePortal: MongoDB Fehler:", err.message));

// 📬 Stripe Customer Portal öffnen
router.post("/", verifyToken, async (req, res) => {
  try {
    await ensureDb();

    if (!req.user?.userId) {
      return res.status(401).json({ message: "Nicht autorisiert – kein gültiger Benutzer-Token." });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "Benutzer nicht gefunden." });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: "Stripe-Kundendaten fehlen." });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: process.env.FRONTEND_URL || "https://contract-ai.de/profile",
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("🔗 Stripe Portal URL erstellt:", portalSession.url);
    }

    res.json({ url: portalSession.url });
  } catch (err) {
    console.error("❌ Fehler beim Erstellen der Stripe-Portal-Sitzung:", err.message);
    res.status(500).json({ message: "Interner Fehler beim Öffnen des Kundenportals." });
  }
});

module.exports = router;

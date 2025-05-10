// 📁 backend/routes/stripePortal.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { ObjectId } = require("mongodb");

module.exports = function (usersCollection) {
  router.post("/", verifyToken, async (req, res) => {
    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ message: "Kein Stripe-Konto gefunden." });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: "https://contract-ai.de/profile",
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("❌ Fehler beim Erstellen des Kundenportals:", err.message);
      res.status(500).json({ message: "Serverfehler beim Öffnen des Portals." });
    }
  });

  return router;
};

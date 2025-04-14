// 📁 backend/middleware/checkSubscription.js
const { ObjectId } = require("mongodb");

// Diese Funktion wird vom Server mitgegebenem DB-Handle aufgerufen
module.exports = function createCheckSubscription(usersCollection) {
  return async function checkSubscription(req, res, next) {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "❌ Nicht autorisiert" });
    }

    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
      }

      if (user.isPremium === true || user.subscriptionActive === true) {
        return next(); // ✅ Zugriff erlaubt
      } else {
        return res.status(403).json({
          message: "⛔ Diese Funktion ist nur mit einem aktiven Abo verfügbar.",
        });
      }
    } catch (err) {
      console.error("❌ Fehler in checkSubscription:", err);
      return res.status(500).json({ message: "Serverfehler bei Abo-Überprüfung" });
    }
  };
};

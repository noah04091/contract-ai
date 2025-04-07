// 📁 backend/middleware/checkSubscription.js
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URI);
let usersCollection;

// 🔌 MongoDB verbinden (nur 1x beim Start)
(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    usersCollection = db.collection("users");
    console.log("✅ checkSubscription: MongoDB verbunden");
  } catch (err) {
    console.error("❌ Fehler bei MongoDB (checkSubscription):", err);
  }
})();

const checkSubscription = async (req, res, next) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "❌ Nicht autorisiert" });
  }

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
    }

    if (user.isPremium === true) {
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

module.exports = checkSubscription;

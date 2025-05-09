// 📁 backend/routes/generate.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");

module.exports = function (contractsCollection) {
  const router = express.Router();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // MongoDB Setup für users
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
  const client = new MongoClient(mongoUri);
  let usersCollection;

  (async () => {
    try {
      await client.connect();
      usersCollection = client.db("contract_ai").collection("users");
      console.log("📄 Verbunden mit users (generate.js)");
    } catch (err) {
      console.error("❌ Fehler beim MongoDB-Connect (generate):", err);
    }
  })();

  router.post("/", verifyToken, async (req, res) => {
    const { type, formData } = req.body;

    if (!type || !formData || !formData.title) {
      return res.status(400).json({ message: "❌ Fehlende Felder für Vertragserstellung." });
    }

    // 📊 Nutzer & Plan & Limit prüfen
    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

      const plan = user.subscriptionPlan || "free";
      const count = user.analysisCount ?? 0;

      let limit = 10;
      if (plan === "business") limit = 50;
      if (plan === "premium") limit = Infinity;

      if (count >= limit) {
        return res.status(403).json({
          message: "❌ Analyse-Limit erreicht. Bitte Paket upgraden.",
        });
      }

      let prompt = "";

      switch (type) {
        case "freelancer":
          prompt = `Erstelle einen rechtssicheren Freelancervertrag zwischen ${formData.nameClient} und ${formData.nameFreelancer}.
Leistung: ${formData.description}
Zeitraum: ${formData.timeframe}
Vergütung: ${formData.payment}
Nutzungsrechte: ${formData.rights}
Kündigungsfrist: ${formData.terminationClause}`;
          break;

        case "mietvertrag":
          prompt = `Erstelle einen Mietvertrag für die Immobilie in ${formData.address}.
Vermieter: ${formData.landlord}
Mieter: ${formData.tenant}
Mietbeginn: ${formData.startDate}
Kaltmiete: ${formData.baseRent}
Nebenkosten: ${formData.extraCosts}
Kündigungsfrist: ${formData.termination}`;
          break;

        case "arbeitsvertrag":
          prompt = `Erstelle einen Arbeitsvertrag zwischen ${formData.employer} und ${formData.employee}.
Position: ${formData.position}
Startdatum: ${formData.startDate}
Gehalt: ${formData.salary}
Arbeitszeit: ${formData.workingHours}`;
          break;

        case "kaufvertrag":
          prompt = `Erstelle einen Kaufvertrag für den Verkauf eines ${formData.item}.
Verkäufer: ${formData.seller}
Käufer: ${formData.buyer}
Kaufpreis: ${formData.price}
Lieferdatum: ${formData.deliveryDate}`;
          break;

        case "nda":
          prompt = `Erstelle einen Geheimhaltungsvertrag (NDA) zwischen ${formData.partyA} und ${formData.partyB}.
Zweck: ${formData.purpose}
Gültigkeitsdauer: ${formData.duration}`;
          break;

        case "custom":
          prompt = `Erstelle einen rechtssicheren Vertrag mit dem Titel "${formData.title}".
Der Vertrag soll folgende Punkte behandeln:
${formData.details}
Strukturiere den Vertrag professionell mit Einleitung, Paragraphen und Abschlussformel.`;
          break;

        default:
          return res.status(400).json({ message: "❌ Unbekannter Vertragstyp." });
      }

      // 🧠 GPT-Generierung
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Du bist ein erfahrener Jurist und Vertragsersteller." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
      });

      const content = completion.choices[0].message.content;

      // ✅ Count erhöhen
      await usersCollection.updateOne(
        { _id: user._id },
        { $inc: { analysisCount: 1 } }
      );

      // 📦 In DB speichern
      const contract = {
        userId: req.user.userId,
        name: formData.title,
        laufzeit: "Generiert",
        kuendigung: "Generiert",
        expiryDate: "",
        status: "Generiert",
        uploadedAt: new Date(),
        filePath: "",
        content,
        isGenerated: true,
      };

      const result = await contractsCollection.insertOne(contract);

      res.json({
        message: "✅ Vertrag erfolgreich generiert & gespeichert.",
        contractId: result.insertedId,
        contractText: content,
      });
    } catch (err) {
      console.error("❌ Fehler beim Erzeugen/Speichern:", err);
      res.status(500).json({ message: "Serverfehler beim Erzeugen oder Speichern." });
    }
  });

  return router;
};

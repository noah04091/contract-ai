// 📁 backend/routes/generate.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");

module.exports = function (contractsCollection) {
  const router = express.Router();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 📄 Vertragsgenerator + Speicherung mit Vertragstypen & Key-Details
  router.post("/", verifyToken, async (req, res) => {
    const { type, formData } = req.body;

    if (!type || !formData || !formData.title) {
      return res.status(400).json({ message: "Fehlende Felder für Vertragserstellung." });
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
        return res.status(400).json({ message: "Unbekannter Vertragstyp." });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Du bist ein erfahrener Jurist und Vertragsersteller." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
      });

      const content = completion.choices[0].message.content;

      // 🧠 Generierten Vertrag in MongoDB speichern
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

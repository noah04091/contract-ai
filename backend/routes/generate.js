// 📁 backend/routes/generate.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
// Template-System entfernt - Verwende reine GPT-Generierung

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// MongoDB Setup direkt hier
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let usersCollection, contractsCollection, db;

(async () => {
  try {
    await client.connect();
    db = client.db("contract_ai");
    usersCollection = db.collection("users");
    contractsCollection = db.collection("contracts");
    console.log("📄 Generate.js: MongoDB verbunden!");
  } catch (err) {
    console.error("❌ Generate.js MongoDB Fehler:", err);
  }
})();

router.post("/", verifyToken, async (req, res) => {
  console.log("🚀 Generate Route aufgerufen!"); // Debug-Log
  console.log("📊 Request Body:", {
    type: req.body.type,
    hasFormData: !!req.body.formData,
    useCompanyProfile: req.body.useCompanyProfile,
    userId: req.user?.userId
  });
  
  const { type, formData, useCompanyProfile = false } = req.body;

  if (!type || !formData || !formData.title) {
    return res.status(400).json({ message: "❌ Fehlende Felder für Vertragserstellung." });
  }

  try {
    // ✅ IMMER Company Profile laden wenn vorhanden
    let companyProfile = null;
    try {
      // Warten bis DB verbunden ist
      if (!db) {
        console.log("⚠️ DB noch nicht bereit, warte...");
        return res.status(500).json({ message: "❌ Datenbankverbindung noch nicht bereit." });
      }
      
      const profileData = await db.collection("company_profiles").findOne({ 
        userId: new ObjectId(req.user.userId) 
      });
      
      if (profileData) {
        companyProfile = profileData;
        console.log("✅ Company Profile gefunden:", {
          companyName: companyProfile.companyName,
          hasLogo: !!companyProfile.logoUrl,
          useCompanyProfile: useCompanyProfile
        });
      } else {
        console.log("ℹ️ Kein Company Profile vorhanden für User:", req.user.userId);
      }
    } catch (profileError) {
      console.log("⚠️ Company Profile konnte nicht geladen werden:", profileError.message);
    }
    // Warten bis MongoDB verbunden ist
    if (!usersCollection) {
      return res.status(500).json({ message: "❌ Datenbankverbindung nicht bereit." });
    }

    // 📊 Nutzer & Limit prüfen
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

    // ✅ TEMPLATE-SYSTEM DEAKTIVIERT - Verwende reine GPT-Generierung
    let contractText = "";
    console.log("🔄 Verwende reine GPT-Generierung für saubere Ergebnisse...");

    // ✅ REINE GPT-Generierung für alle Verträge
    let prompt = "";
    console.log("🔄 Reine GPT-Generierung für alle Vertragstypen");

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

    // ✅ GPT-Generierung für alle Vertragstypen
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "Du bist ein erfahrener Jurist und Vertragsersteller. Erstelle professionelle, rechtssichere Verträge im deutschen Recht."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
    });

    const gptResult = completion.choices[0].message.content;
    
    // Finalen Contract-Text bestimmen
    contractText = gptResult || "Fehler bei der Vertragsgenerierung";
    
    // ✅ FIRMENKOPF HINZUFÜGEN wenn Company Profile vorhanden UND aktiviert
    console.log("🔍 Company Profile Check:", {
      hasProfile: !!companyProfile,
      hasContractText: !!contractText,
      useCompanyProfile,
      condition: companyProfile && contractText && (useCompanyProfile !== false)
    });
    
    if (companyProfile && contractText && (useCompanyProfile !== false)) {
      console.log("✅ Füge Firmenkopf hinzu...");
      let companyHeader = '';
      
      // ✅ PROFESSIONELLER FIRMENKOPF mit funktionierendem Logo
      console.log("🔍 Logo URL verfügbar:", companyProfile.logoUrl);
      
      // Logo-Bereich nur wenn Logo vorhanden
      let logoDisplay = '';
      if (companyProfile.logoUrl) {
        // Teste verschiedene Logo-Formate für maximale Kompatibilität
        logoDisplay = `
<div style="text-align: center; margin: 15px 0;">
  <img src="${companyProfile.logoUrl}" 
       alt="${companyProfile.companyName} Logo" 
       style="max-width: 180px; max-height: 100px; object-fit: contain; border: none;" 
       onerror="this.style.display='none'" />
</div>`;
      }
      
      // Kompakte Firmendaten - professionell formatiert
      const firmendaten = [
        `<strong>${companyProfile.companyName || ''}</strong>`,
        companyProfile.legalForm || '',
        companyProfile.street || '',
        `${companyProfile.postalCode || ''} ${companyProfile.city || ''}`.trim(),
        companyProfile.contactEmail || '',
        companyProfile.contactPhone ? `Tel: ${companyProfile.contactPhone}` : '',
        companyProfile.vatId ? `USt-IdNr.: ${companyProfile.vatId}` : '',
        companyProfile.tradeRegister || ''
      ].filter(item => item.trim() !== '').join('<br>');
      
      companyHeader = `${logoDisplay}
<div style="text-align: center; border-bottom: 2px solid #333; padding: 15px 0; margin-bottom: 25px; font-family: Arial, sans-serif; line-height: 1.4;">
${firmendaten}
</div>

`;
      
      console.log("📝 Company Header Debug:", {
        hasLogo: !!companyProfile.logoUrl,
        logoUrl: companyProfile.logoUrl,
        headerLength: companyHeader.length,
        headerPreview: companyHeader.substring(0, 300)
      });
      
      // Firmenkopf am Anfang des Vertrags einfügen
      contractText = companyHeader + contractText;
      console.log("✅ Firmenkopf eingefügt! Neue Vertragslänge:", contractText.length);
      
      // Testen ob Logo-URL erreichbar ist
      if (companyProfile.logoUrl) {
        console.log("🔗 Teste Logo-URL Erreichbarkeit:", companyProfile.logoUrl);
      }
      
      // Firma automatisch als Partei A einsetzen (je nach Vertragstyp)
      const companyFullName = `${companyProfile.companyName}${companyProfile.legalForm ? ` (${companyProfile.legalForm})` : ''}`;
      const companyFullAddress = `${companyProfile.street}, ${companyProfile.postalCode} ${companyProfile.city}`;
      
      // Intelligente Ersetzung basierend auf Vertragstyp
      const companyDetails = `${companyFullName}
${companyFullAddress}
${companyProfile.contactEmail ? `E-Mail: ${companyProfile.contactEmail}` : ''}
${companyProfile.contactPhone ? `Tel: ${companyProfile.contactPhone}` : ''}
${companyProfile.vatId ? `USt-IdNr.: ${companyProfile.vatId}` : ''}`.trim();

      switch(type) {
        case 'freelancer':
          // Verschiedene mögliche Schreibweisen abfangen
          contractText = contractText.replace(
            /\*\*Auftraggeber[:\.?\s]*\*\*\s*\n[^\n]*/,
            `**Auftraggeber:**\n${companyDetails}`
          );
          break;
        case 'kaufvertrag':
          contractText = contractText.replace(
            /\*\*Verkäufer[:\.?\s]*\*\*\s*\n[^\n]*/,
            `**Verkäufer:**\n${companyDetails}`
          );
          break;
        case 'mietvertrag':
          contractText = contractText.replace(
            /\*\*Vermieter[:\.?\s]*\*\*\s*\n[^\n]*/,
            `**Vermieter:**\n${companyDetails}`
          );
          break;
        case 'arbeitsvertrag':
          contractText = contractText.replace(
            /\*\*Arbeitgeber[:\.?\s]*\*\*\s*\n[^\n]*/,
            `**Arbeitgeber:**\n${companyDetails}`
          );
          break;
        case 'nda':
          // Bei NDA ist es "Partei A" - mit verschiedenen Schreibweisen
          contractText = contractText.replace(
            /\*\*Partei A[:\.?\s]*\*\*\s*\n[^\n\*]*/,
            `**Partei A:**\n${companyDetails}`
          );
          break;
      }
      
      console.log("✅ Firmenkopf und Firmendaten in Vertrag eingefügt");
    } else {
      console.log("❌ Firmenkopf NICHT eingefügt:", {
        hasProfile: !!companyProfile,
        hasContractText: !!contractText,
        useCompanyProfile,
        reason: !companyProfile ? "Kein Company Profile" : 
                !contractText ? "Kein Contract Text" : 
                useCompanyProfile === false ? "Company Profile deaktiviert" : "Unbekannt"
      });
    }
    
    console.log("✅ GPT-Generierung + Firmendaten abgeschlossen");

    // ✅ Analyse-Zähler hochzählen
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { analysisCount: 1 } }
    );

    // ✅ ERWEITERTE Vertrag in DB speichern
    const contract = {
      userId: req.user.userId,
      name: formData.title,
      content: contractText, // ✅ Verwendet Template + GPT Result
      laufzeit: "Generiert",
      kuendigung: "Generiert", 
      expiryDate: "",
      status: "Aktiv",
      uploadedAt: new Date(),
      isGenerated: true,
      // ✅ Generierungs-Metadaten
      generationMethod: "gpt_only",
      contractType: type,
      hasCompanyProfile: !!companyProfile
    };

    const result = await contractsCollection.insertOne(contract);

    res.json({
      message: "✅ Vertrag erfolgreich generiert & gespeichert.",
      contractId: result.insertedId,
      contractText: contractText,
      // ✅ Generierungs-Metadaten
      metadata: {
        generationMethod: "gpt_only",
        contractType: type,
        hasCompanyProfile: !!companyProfile
      }
    });
  } catch (err) {
    console.error("❌ Fehler beim Erzeugen/Speichern:", err);
    res.status(500).json({ message: "Serverfehler beim Erzeugen oder Speichern." });
  }
});

module.exports = router;
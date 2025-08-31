// 📁 backend/routes/generate.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
// ✅ NEU: Template-System importieren - ERWEITERT das bestehende System
const { 
  contractTemplates, 
  TemplateEngine, 
  validateRequiredFields, 
  prepareTemplateData 
} = require("../utils/contractTemplates");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// MongoDB Setup direkt hier
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let usersCollection, contractsCollection;

(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    usersCollection = db.collection("users");
    contractsCollection = db.collection("contracts");
    console.log("📄 Generate.js: MongoDB verbunden!");
  } catch (err) {
    console.error("❌ Generate.js MongoDB Fehler:", err);
  }
})();

router.post("/", verifyToken, async (req, res) => {
  console.log("🚀 Generate Route aufgerufen!"); // Debug-Log
  
  const { type, formData, useCompanyProfile = false } = req.body;

  if (!type || !formData || !formData.title) {
    return res.status(400).json({ message: "❌ Fehlende Felder für Vertragserstellung." });
  }

  try {
    // ✅ IMMER Company Profile laden wenn vorhanden
    let companyProfile = null;
    try {
      // Direkt auf company_profiles Collection zugreifen
      const db = usersCollection.db();
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

    // ✅ NEU: Template-basierte Generierung (PHASE 1)
    let templateResult = null;
    let contractText = "";
    
    // Prüfe ob Template-System verfügbar ist
    if (contractTemplates[type]) {
      try {
        console.log("🎯 Template-basierte Generierung für Typ:", type);
        
        // Validiere Pflichtfelder
        const validationErrors = validateRequiredFields(type, formData);
        if (validationErrors.length > 0) {
          console.log("⚠️ Validierungsfehler (nicht kritisch):", validationErrors);
        }
        
        // Template-Daten vorbereiten
        const templateData = prepareTemplateData(type, formData, companyProfile);
        console.log("📋 Template-Daten vorbereitet:", Object.keys(templateData));
        
        // Template rendern
        const template = contractTemplates[type].template;
        templateResult = TemplateEngine.render(template, templateData);
        
        console.log("✅ Template erfolgreich gerendert - Länge:", templateResult.length);
        
        // Template-Result als Basis verwenden
        contractText = templateResult;
        
      } catch (templateError) {
        console.error("❌ Template-Generierung fehlgeschlagen:", templateError.message);
        console.log("🔄 Fallback zu reiner GPT-Generierung...");
      }
    }

    // ✅ BESTEHENDE GPT-Generierung - als Fallback oder Veredelung
    let prompt = "";
    let useGPTForPolishing = false;
    
    if (templateResult) {
      // Template erfolgreich - GPT nur für Veredelung verwenden
      useGPTForPolishing = true;
      prompt = `Du bist ein erfahrener Vertragsanwalt. Verbessere und vervollständige den folgenden Vertragsentwurf.

WICHTIG: Behalte die Struktur und alle wichtigen Klauseln bei. Verbessere nur Sprache, Rechtschreibung und füge fehlende Standard-Klauseln hinzu:

${templateResult}

Bitte verbessere den Vertrag sprachlich und rechtlich, ohne die Grundstruktur zu ändern.`;
      
    } else {
      // Kein Template verfügbar - bestehende GPT-Generierung verwenden
      console.log("🔄 Fallback: Reine GPT-Generierung");

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
    } // ✅ Schließt den Template-Fallback Block

    // ✅ ERWEITERTE GPT-Generierung (Template-aware)
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: useGPTForPolishing 
            ? "Du bist ein erfahrener Rechtsanwalt. Deine Aufgabe ist es, Verträge sprachlich zu verbessern und zu vervollständigen, ohne die Struktur zu ändern."
            : "Du bist ein erfahrener Jurist und Vertragsersteller."
        },
        { role: "user", content: prompt }
      ],
      temperature: useGPTForPolishing ? 0.2 : 0.4, // Niedrigere Temperatur für Veredelung
    });

    const gptResult = completion.choices[0].message.content;
    
    // Finalen Contract-Text bestimmen
    contractText = gptResult || contractText || "Fehler bei der Vertragsgenerierung";
    
    // ✅ FIRMENKOPF HINZUFÜGEN wenn Company Profile vorhanden UND aktiviert
    if (companyProfile && contractText && (useCompanyProfile !== false)) {
      let companyHeader = '';
      
      // Professioneller Firmenkopf als formatierter Text (nicht HTML!)
      companyHeader = `---
${companyProfile.logoUrl ? `![${companyProfile.companyName} Logo](${companyProfile.logoUrl})` : ''}

**${companyProfile.companyName || ''}**
${companyProfile.legalForm ? companyProfile.legalForm : ''}
${companyProfile.street || ''}
${companyProfile.postalCode || ''} ${companyProfile.city || ''}
${companyProfile.contactEmail ? `E-Mail: ${companyProfile.contactEmail}` : ''}
${companyProfile.contactPhone ? `Tel: ${companyProfile.contactPhone}` : ''}
${companyProfile.vatId ? `USt-IdNr.: ${companyProfile.vatId}` : ''}
${companyProfile.tradeRegister ? companyProfile.tradeRegister : ''}

---

`;
      
      // Firmenkopf am Anfang des Vertrags einfügen
      contractText = companyHeader + contractText;
      
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
    }
    
    console.log(useGPTForPolishing 
      ? "✅ Template + GPT-Veredelung + Firmendaten abgeschlossen" 
      : "✅ Reine GPT-Generierung + Firmendaten abgeschlossen"
    );

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
      // ✅ NEU: Template-Metadaten
      generationMethod: useGPTForPolishing ? "template_plus_gpt" : "gpt_only",
      contractType: type,
      hasCompanyProfile: !!companyProfile,
      templateVersion: contractTemplates[type]?.version || null
    };

    const result = await contractsCollection.insertOne(contract);

    res.json({
      message: "✅ Vertrag erfolgreich generiert & gespeichert.",
      contractId: result.insertedId,
      contractText: contractText,
      // ✅ NEU: Erweiterte Metadaten
      metadata: {
        generationMethod: useGPTForPolishing ? "template_plus_gpt" : "gpt_only",
        templateUsed: !!templateResult,
        contractType: type,
        hasCompanyProfile: !!companyProfile,
        processingTime: Date.now() - Date.now() // Kann erweitert werden
      }
    });
  } catch (err) {
    console.error("❌ Fehler beim Erzeugen/Speichern:", err);
    res.status(500).json({ message: "Serverfehler beim Erzeugen oder Speichern." });
  }
});

module.exports = router;
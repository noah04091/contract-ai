// 📁 backend/routes/generate.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const https = require("https");
const http = require("http");
const AWS = require("aws-sdk");
// Template-System entfernt - Verwende reine GPT-Generierung

// ✅ S3 Setup für frische Logo-URLs
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// ✅ Base64-Konvertierung für S3-Logos (CORS-frei!)
const convertS3ToBase64 = async (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      const chunks = [];
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const mimeType = response.headers['content-type'] || 'image/jpeg';
        const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
        resolve(base64);
      });
      
      response.on('error', (error) => {
        reject(error);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

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
          content: `Du bist ein renommierter Fachanwalt für Vertragsrecht. Erstelle hochprofessionelle Verträge nach deutschem Recht auf Premium-Niveau.

PREMIUM LAYOUT:
- Container: <div style="padding: 0 50px; max-width: 640px; margin: 0 auto; font-family: 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;">
- Schließe mit: </div>

VERTRAGSPARTEIEN - ELEGANTE BOXEN NEBENEINANDER:
<div style="display: flex; gap: 20px; margin: 30px 0;">
  <div style="flex: 1; background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 15px;">
    <div style="font-size: 14px; font-weight: 600; color: #222; margin-bottom: 4px;">Verkäufer (Partei A)</div>
    <div style="font-size: 13px; color: #333; line-height: 1.4;">
      [Wird automatisch gefüllt]
    </div>
  </div>
  <div style="flex: 1; background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 15px;">
    <div style="font-size: 14px; font-weight: 600; color: #222; margin-bottom: 4px;">Käufer (Partei B)</div>
    <div style="font-size: 13px; color: #333; line-height: 1.4;">
      [Eingabedaten verwenden]
    </div>
  </div>
</div>

PARAGRAPHEN - PREMIUM FORMATIERUNG:
- Überschriften: <h2 style="font-size: 16px; color: #222; margin: 25px 0 8px 0; font-weight: 600;">§ 1 Überschrift</h2>
- Fließtext: <p style="margin: 12px 0; line-height: 1.5; color: #333; font-size: 13px;">
- Beträge/Daten: <strong style="color: #222;">15.000,00 €</strong>
- Namen: <strong style="color: #222;">

STRUKTUR:
1. Beginne mit den zwei Vertragsparteien-Boxen nebeneinander
2. Dann § 1, § 2, § 3, etc.
3. KEINE Unterschriften (werden separat hinzugefügt)
4. Professionelle Salvatorische Klausel

PREMIUM-QUALITÄT: Keine Hinweise auf automatische Generierung, nur höchste Anwaltsqualität!`
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
      console.log("🔍 Logo Details verfügbar:", {
        hasLogo: !!companyProfile.logoUrl,
        isBase64: companyProfile.logoUrl?.startsWith('data:'),
        urlPreview: companyProfile.logoUrl?.substring(0, 100) + "..."
      });
      
      // ✅ PROFESSIONAL TWO-COLUMN HEADER
      let finalLogoUrl = null;
      
      // Logo-Verarbeitung (falls vorhanden)
      if (companyProfile.logoUrl) {
        if (!companyProfile.logoUrl.startsWith('data:')) {
          console.log("🔄 S3-Logo zu Base64 konvertieren mit frischer URL...");
          try {
            let freshS3Url = companyProfile.logoUrl;
            
            if (companyProfile.logoKey) {
              console.log("🔑 Generiere frische S3-URL für logoKey:", companyProfile.logoKey);
              freshS3Url = s3.getSignedUrl('getObject', {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: companyProfile.logoKey,
                Expires: 3600
              });
              console.log("✅ Frische S3-URL generiert");
            }
            
            finalLogoUrl = await convertS3ToBase64(freshS3Url);
            console.log("✅ Logo erfolgreich zu Base64 konvertiert");
          } catch (error) {
            console.error("❌ Logo-Konvertierung fehlgeschlagen:", error.message);
          }
        } else {
          finalLogoUrl = companyProfile.logoUrl;
        }
      }
      
      // ✅ PREMIUM HEADER - KOMPAKT & HOCH PLATZIERT
      const logoSection = finalLogoUrl 
        ? `<img src="${finalLogoUrl}" alt="Logo" style="max-height: 65px; width: auto; object-fit: contain;" />`
        : '';
        
      const companyInfoSection = `
        <div style="text-align: right; font-family: 'Helvetica Neue', 'Segoe UI', Arial, sans-serif; line-height: 1.2;">
          <div style="font-size: 16px; font-weight: 600; color: #222; margin-bottom: 3px;">
            ${companyProfile.companyName || ''}
          </div>
          <div style="color: #555; font-size: 13px; line-height: 16px;">
            ${companyProfile.street || ''}<br>
            ${companyProfile.postalCode || ''} ${companyProfile.city || ''}<br>
            ${companyProfile.contactEmail || ''}<br>
            ${companyProfile.contactPhone ? `Tel: ${companyProfile.contactPhone}` : ''}<br>
            ${companyProfile.vatId ? `USt-IdNr.: ${companyProfile.vatId}` : ''}
          </div>
        </div>`;

      companyHeader = `
<div style="padding: 60px 50px 0 50px; max-width: 640px; margin: 0 auto;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-top: 10px; padding-bottom: 15px; margin-bottom: 25px; border-bottom: 2px solid #1A73E8; font-family: 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;">
    <div style="flex: 0 0 auto;">
      ${logoSection}
    </div>
    <div style="flex: 0 0 auto;">
      ${companyInfoSection}
    </div>
  </div>
</div>

`;
      
      console.log("📝 Company Header Debug:", {
        hasLogo: !!companyProfile.logoUrl,
        hasBase64Logo: !!finalLogoUrl,
        headerLength: companyHeader.length,
        headerPreview: companyHeader.substring(0, 300)
      });
      
      // ✅ PROFESSIONELLER VERTRAGSTITEL MIT DATUM
      const today = new Date().toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
      
      // ✅ ZENTRIERTER PREMIUM TITEL - OHNE BRANDING
      const contractTitle = `
<div style="padding: 0 50px; max-width: 640px; margin: 0 auto; font-family: 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="font-size: 24px; font-weight: 600; color: #222; margin: 0 0 10px 0;">
      ${formData.title || getContractTitle(type)}
    </h1>
    <p style="color: #666; font-size: 13px; margin: 0;">
      Erstellt am ${today}
    </p>
  </div>
</div>`;

      // ✅ PREMIUM UNTERSCHRIFTSBLOCK - SYMMETRISCH & EDEL
      const signatureSection = `
<div style="padding: 0 50px; max-width: 640px; margin: 40px auto 0 auto;">
  <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; font-family: 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;">
    <div style="display: flex; justify-content: space-between; gap: 40px;">
      <div style="flex: 1;">
        <p style="color: #333; font-size: 13px; margin: 0 0 40px 0;">Ort, Datum: ______________________</p>
        <p style="color: #333; font-size: 13px; margin: 0 0 5px 0;">Unterschrift ${getPartyLabel(type, 'company')}</p>
        <div style="border-bottom: 1px solid #333; margin: 0 0 8px 0; width: 100%;"></div>
        <p style="color: #666; font-size: 11px; margin: 0;">(${companyProfile.companyName})</p>
      </div>
      <div style="flex: 1;">
        <p style="color: #333; font-size: 13px; margin: 0 0 40px 0;">Ort, Datum: ______________________</p>
        <p style="color: #333; font-size: 13px; margin: 0 0 5px 0;">Unterschrift ${getPartyLabel(type, 'counterparty')}</p>
        <div style="border-bottom: 1px solid #333; margin: 0 0 8px 0; width: 100%;"></div>
        <p style="color: #666; font-size: 11px; margin: 0;">(${formData.buyer || formData.tenant || formData.employee || formData.partyB || 'Vertragspartner'})</p>
      </div>
    </div>
  </div>
</div>`;

      // ✅ KEIN FOOTER - PREMIUM CLEAN
      
      // Vertrag zusammensetzen - OHNE FOOTER
      contractText = companyHeader + contractTitle + contractText + signatureSection;
      console.log("✅ Professioneller Vertrag komplett erstellt! Länge:", contractText.length);
      
      // Helper-Funktionen
      function getContractTitle(contractType) {
        const titles = {
          'freelancer': 'Freelancer-Dienstleistungsvertrag',
          'kaufvertrag': 'Kaufvertrag',
          'mietvertrag': 'Mietvertrag',
          'arbeitsvertrag': 'Arbeitsvertrag',
          'nda': 'Geheimhaltungsvereinbarung (NDA)',
          'custom': 'Individueller Vertrag'
        };
        return titles[contractType] || 'Vertrag';
      }
      
      function getPartyLabel(contractType, party) {
        const labels = {
          'freelancer': { company: 'Auftraggeber', counterparty: 'Auftragnehmer' },
          'kaufvertrag': { company: 'Verkäufer', counterparty: 'Käufer' },
          'mietvertrag': { company: 'Vermieter', counterparty: 'Mieter' },
          'arbeitsvertrag': { company: 'Arbeitgeber', counterparty: 'Arbeitnehmer' },
          'nda': { company: 'Partei A', counterparty: 'Partei B' },
          'custom': { company: 'Vertragspartner A', counterparty: 'Vertragspartner B' }
        };
        return labels[contractType]?.[party] || labels.custom[party];
      }
      
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
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
          content: `Du bist ein erfahrener Fachanwalt für Vertragsrecht. Erstelle hochprofessionelle, rechtssichere Verträge nach deutschem Recht.

FORMATIERUNG (WICHTIG - NUR HTML):
- Verwende <h2 style="font-size: 16px; color: #1f2937; margin: 25px 0 15px 0; font-weight: 600;">§ 1 Überschrift</h2> für Paragraphen
- Verwende <p style="margin: 10px 0; line-height: 1.6; color: #374151;"> für Absätze
- Verwende <strong> für wichtige Begriffe und Parteien
- Verwende <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 3px solid #3b82f6;"> für wichtige Klauseln

STRUKTUR:
1. Beginne direkt mit "Zwischen" (Vertragsparteien)
2. Nutze klare Paragraphen-Struktur (§ 1, § 2, etc.)
3. Füge professionelle Salvatorische Klausel am Ende ein
4. KEINE Unterschriftszeilen (werden automatisch hinzugefügt)

SPRACHE:
- Präzise juristische Formulierungen
- Vollständige, eindeutige Sätze
- Vermeide Abkürzungen außer "bzw.", "z.B.", "usw."`
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
      
      // ✅ ULTRA-PROFESSIONELLER ANWALTS-HEADER
      const logoSection = finalLogoUrl 
        ? `<img src="${finalLogoUrl}" alt="Logo" style="max-width: 90px; max-height: 45px; object-fit: contain;" />`
        : '';
        
      const companyInfoSection = `
        <div style="text-align: right; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <div style="font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 6px; letter-spacing: -0.5px;">
            ${companyProfile.companyName || ''}
          </div>
          <div style="color: #6b7280; font-size: 11px; line-height: 1.4;">
            ${companyProfile.legalForm ? `<span style="font-weight: 500;">${companyProfile.legalForm}</span> · ` : ''}
            ${companyProfile.street || ''} · 
            ${companyProfile.postalCode || ''} ${companyProfile.city || ''}<br>
            ${companyProfile.contactEmail ? `${companyProfile.contactEmail} · ` : ''}
            ${companyProfile.contactPhone ? `${companyProfile.contactPhone}` : ''}<br>
            ${companyProfile.vatId ? `<span style="font-size: 10px;">USt-IdNr.: ${companyProfile.vatId}</span>` : ''}
            ${companyProfile.tradeRegister ? ` · <span style="font-size: 10px;">${companyProfile.tradeRegister}</span>` : ''}
          </div>
        </div>`;

      companyHeader = `
<div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0 20px 0; margin-bottom: 35px; border-bottom: 1px solid #e5e7eb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <div style="flex: 0 0 100px;">
    ${logoSection}
  </div>
  <div style="flex: 1; margin-left: 20px;">
    ${companyInfoSection}
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
      
      const contractTitle = `
<div style="text-align: center; margin-bottom: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px 0; letter-spacing: -0.5px;">
    ${formData.title || getContractTitle(type)}
  </h1>
  <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0;">
    Erstellt am ${today} mit Contract AI
  </p>
  <p style="color: #9ca3af; font-size: 12px; font-style: italic; margin: 0;">
    Dieser Vertrag wurde automatisch generiert und kann an Ihre individuellen Bedürfnisse angepasst werden.
  </p>
</div>`;

      // ✅ PROFESSIONELLER UNTERSCHRIFTSBEREICH
      const signatureSection = `
<div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid #e5e7eb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <div style="display: flex; justify-content: space-between; margin-bottom: 80px;">
    <div style="flex: 1; max-width: 45%;">
      <p style="color: #6b7280; font-size: 12px; margin-bottom: 50px;">Ort, Datum:</p>
      <div style="border-bottom: 1px solid #d1d5db; margin-bottom: 8px;"></div>
      <p style="color: #4b5563; font-size: 13px; margin: 0;">Unterschrift ${getPartyLabel(type, 'company')}</p>
      <p style="color: #6b7280; font-size: 11px; margin: 4px 0 0 0;">(${companyProfile.companyName})</p>
    </div>
    <div style="flex: 1; max-width: 45%;">
      <p style="color: #6b7280; font-size: 12px; margin-bottom: 50px;">Ort, Datum:</p>
      <div style="border-bottom: 1px solid #d1d5db; margin-bottom: 8px;"></div>
      <p style="color: #4b5563; font-size: 13px; margin: 0;">Unterschrift ${getPartyLabel(type, 'counterparty')}</p>
      <p style="color: #6b7280; font-size: 11px; margin: 4px 0 0 0;">(${formData.buyer || formData.tenant || formData.employee || formData.partyB || 'Vertragspartner'})</p>
    </div>
  </div>
</div>`;

      // ✅ CONTRACT AI FOOTER
      const footer = `
<div style="text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <p style="color: #9ca3af; font-size: 11px; margin: 0;">
    Erstellt mit <span style="color: #3b82f6; font-weight: 500;">Contract AI</span> · www.contract-ai.de
  </p>
</div>`;
      
      // Vertrag zusammensetzen
      contractText = companyHeader + contractTitle + contractText + signatureSection + footer;
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
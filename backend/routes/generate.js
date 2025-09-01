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
  
  // ✅ HELPER FUNKTIONEN - Außerhalb des IF-Blocks für globale Verfügbarkeit
  function getContractTitle(contractType) {
    const titles = {
      'freelancer': 'Dienstleistungsvertrag',
      'kaufvertrag': 'Kaufvertrag', 
      'mietvertrag': 'Mietvertrag',
      'pachtvertrag': 'Pachtvertrag',
      'arbeitsvertrag': 'Arbeitsvertrag',
      'nda': 'Geheimhaltungsvereinbarung',
      'custom': 'Vertrag'
    };
    return titles[contractType] || 'Vertrag';
  }
  
  function getContractSubtitle(contractType) {
    const subtitles = {
      'freelancer': 'Dienstleistungsvertrag',
      'kaufvertrag': 'Kaufvertrag beweglicher Sachen',
      'mietvertrag': 'Mietvertrag für Wohnraum',
      'arbeitsvertrag': 'Arbeitsvertrag',
      'nda': 'Geheimhaltungsvereinbarung',
      'custom': 'Individueller Vertrag'
    };
    return subtitles[contractType] || '';
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
    
    const contractLabels = labels[contractType] || labels.custom;
    
    if (party === 'both') {
      return contractLabels;
    }
    
    return contractLabels[party] || 'Partei';
  }
  
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

    // ✅ UNIVERSELLE PROFESSIONELLE VERTRAGSVORLAGE - DIN A4 KONFORM
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: `Du bist Vertragsexperte und erstellst professionelle Verträge nach deutschen Standards.

📐 PROFESSIONELLES DIN A4 LAYOUT:
- Format: DIN A4 (210 × 297 mm)
- Seitenränder: Oben 2.5cm, Unten 2cm, Links 3cm, Rechts 2cm
- Schriftart: Arial oder Calibri
- Fließtext: 11pt regular, Zeilenabstand 1.15
- Absatzabstand: 6pt nach jedem Absatz
- Farbe: #000000 (schwarz)

🎯 DOKUMENTENSTRUKTUR - PROFESSIONELLER STANDARD:

1️⃣ VERTRAGSPARTEIEN:
<div style="margin-bottom: 18pt; font-family: Arial, Calibri, sans-serif; font-size: 11pt; line-height: 1.15;">
  <p style="text-align: center; margin: 0 0 6pt;">zwischen</p>
  
  <div style="margin: 6pt 0;">
    <strong>[COMPANY_NAME]</strong><br>
    [COMPANY_ADDRESS]<br>
    [COMPANY_REGISTRATION]<br>
    <span style="font-style: italic;">- nachfolgend "[DYNAMIC_PARTY_A_LABEL]" genannt -</span>
  </div>
  
  <p style="text-align: center; margin: 12pt 0;">und</p>
  
  <div style="margin: 6pt 0;">
    <strong>[PARTY_B_NAME]</strong><br>
    [PARTY_B_ADDRESS]<br>
    [PARTY_B_REGISTRATION]<br>
    <span style="font-style: italic;">- nachfolgend "[DYNAMIC_PARTY_B_LABEL]" genannt -</span>
  </div>
</div>

2️⃣ PARAGRAPHEN-STRUKTUR:
<section style="margin-bottom: 12pt; page-break-inside: avoid;">
  <h2 style="font-family: Arial, Calibri, sans-serif; font-size: 12pt; font-weight: bold; margin: 0 0 6pt;">§ 1 Vertragsgegenstand</h2>
  
  <div style="font-family: Arial, Calibri, sans-serif; font-size: 11pt; line-height: 1.15; text-align: justify; margin-bottom: 6pt;">
    <p style="margin: 0 0 6pt;">(1) [Absatztext mit automatischer Nummerierung]</p>
    <p style="margin: 0 0 6pt;">(2) [Weiterer Absatztext]</p>
  </div>
</section>

HIERARCHIE:
- § X - Hauptparagraph (12pt, fett)
- (1), (2), (3) - Absätze (11pt, regular)
- a), b), c) - Unterpunkte (11pt, 1cm eingerückt)
- aa), bb), cc) - Unter-Unterpunkte (11pt, 2cm eingerückt)

3️⃣ FORMATIERUNGSREGELN:
- Professionelles, klares Layout
- Wichtige Begriffe: <strong>fett</strong>
- Beträge: <strong>15.000,00 EUR</strong>
- Datumsangaben: <strong>31.12.2024</strong>
- Blocksatz mit: text-align: justify;
- Vermeidung von Hurenkindern/Schusterjungen (orphans: 3; widows: 3)
- Mindestens 3 Zeilen eines Absatzes müssen zusammenbleiben

4️⃣ VERTRAGSTYP-SPEZIFISCHE LABELS:
- Kaufvertrag: "Verkäufer" / "Käufer"
- Mietvertrag/Pachtvertrag: "Vermieter/Verpächter" / "Mieter/Pächter"
- Arbeitsvertrag: "Arbeitgeber" / "Arbeitnehmer"
- Dienstleistungsvertrag: "Auftraggeber" / "Auftragnehmer"
- NDA: "Offenlegender" / "Empfänger"

5️⃣ STANDARD-PARAGRAPHEN:
§ 1 Vertragsgegenstand
§ 2 Leistungen und Pflichten
§ 3 Vergütung und Zahlungsbedingungen
§ 4 Laufzeit und Kündigung
§ 5 Gewährleistung und Haftung
§ 6 Vertraulichkeit
§ 7 Datenschutz
§ 8 Schlussbestimmungen
§ 9 Salvatorische Klausel

⚖️ PROFESSIONELLE QUALITÄT:
- Moderner, seriöser Geschäftsstil
- Klare Struktur und Hierarchie
- Arial/Calibri als Hauptschrift
- Professioneller Ton
- KEINE Hinweise auf automatische Generierung
- Saubere Seitenumbrüche
- Barrierefreiheit: Mindestens 11pt Schrift

WICHTIG: Ersetze [DYNAMIC_PARTY_A_LABEL] und [DYNAMIC_PARTY_B_LABEL] mit den korrekten Bezeichnungen!
Ersetze [COMPANY_NAME] mit dem Firmennamen aus dem Profil!
Ersetze [PARTY_B_NAME] mit den Eingabedaten!`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });

    const gptResult = completion.choices[0].message.content;
    
    // ✅ UNIVERSELLE PARTEI-LABELS ERSETZEN
    let processedGptResult = gptResult || "Fehler bei der Vertragsgenerierung";
    const partyLabels = getPartyLabel(type, 'both');
    
    processedGptResult = processedGptResult
      .replace(/\[DYNAMIC_PARTY_A_LABEL\]/g, partyLabels.company)
      .replace(/\[DYNAMIC_PARTY_B_LABEL\]/g, partyLabels.counterparty);
    
    // Finalen Contract-Text bestimmen
    contractText = processedGptResult;
    
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
      
      // ✅ PROFESSIONELLER HEADER - DIN A4 KONFORM
      const logoSection = finalLogoUrl 
        ? `<img src="${finalLogoUrl}" alt="Logo" style="max-height: 2.5cm; object-fit: contain;" />`
        : '';

      companyHeader = `
<!-- Professioneller DIN A4 Header -->
<style>
  @page { 
    size: A4; 
    margin: 2.5cm 2cm 2cm 3cm; /* Oben, Rechts, Unten, Links */
  }
  * {
    font-family: Arial, Calibri, sans-serif;
    color: #000000;
  }
  body { 
    font-size: 11pt; 
    line-height: 1.15;
    margin: 0;
    padding: 0;
  }
  p { 
    text-align: justify; 
    margin: 0 0 6pt 0;
    orphans: 3;
    widows: 3;
  }
  strong {
    font-weight: bold;
  }
  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
</style>

<!-- Firmenlogo -->
<div style="text-align: center; margin-bottom: 12pt;">
  ${logoSection}
</div>

`;
      
      console.log("📝 Company Header Debug:", {
        hasLogo: !!companyProfile.logoUrl,
        hasBase64Logo: !!finalLogoUrl,
        headerLength: companyHeader.length,
        headerPreview: companyHeader.substring(0, 300)
      });
      
      // ✅ VORBEREITUNG DER PARTEI-INFORMATIONEN
      const companyName = companyProfile.companyName || 'Partei A';
      const companyAddress = `${companyProfile.street || ''}, ${companyProfile.postalCode || ''} ${companyProfile.city || ''}`;
      const partyBName = formData.buyer || formData.tenant || formData.employee || formData.nameFreelancer || formData.partyB || 'Partei B';
      const partyBAddress = formData.addressBuyer || formData.addressTenant || formData.addressEmployee || formData.addressFreelancer || '[Adresse]';
      
      // ✅ PROFESSIONELLER VERTRAGSTITEL - DIN A4 KONFORM
      const today = new Date().toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      
      const contractTitle = `
<!-- Vertragstitel -->
<div style="text-align: center; margin-bottom: 12pt;">
  <h1 style="
    font-family: Arial, Calibri, sans-serif;
    font-size: 16pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 0 0 12pt 0;
    color: #000000;
  ">
    ${getContractTitle(type).toUpperCase()}
  </h1>
</div>

<!-- Vertragsparteien -->
<div style="margin-bottom: 18pt; font-family: Arial, Calibri, sans-serif; font-size: 11pt;">
  <p style="text-align: center; margin: 0 0 6pt;">zwischen</p>
  
  <div style="margin: 6pt 0;">
    <strong>${companyName}</strong><br>
    ${companyAddress}<br>
    ${companyProfile?.hrbNumber ? `HRB: ${companyProfile.hrbNumber}<br>` : ''}
    <span style="font-style: italic;">- nachfolgend "${getPartyLabel(type, 'company')}" genannt -</span>
  </div>
  
  <p style="text-align: center; margin: 12pt 0 6pt;">und</p>
  
  <div style="margin: 6pt 0 18pt;">
    <strong>${partyBName}</strong><br>
    ${partyBAddress}<br>
    <span style="font-style: italic;">- nachfolgend "${getPartyLabel(type, 'counterparty')}" genannt -</span>
  </div>
</div>`;

      // ✅ PROFESSIONELLER UNTERSCHRIFTSBLOCK - DIN A4 KONFORM
      const signatureSection = `
<!-- Unterschriftenbereich -->
<div style="
  page-break-inside: avoid;
  margin-top: 36pt;
  font-family: Arial, Calibri, sans-serif;
  font-size: 11pt;
">
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="width: 45%; padding-right: 10%;">
        <div style="margin-bottom: 24pt;">
          _____________________<br>
          Ort, Datum
        </div>
        <div style="margin-top: 36pt; margin-bottom: 4pt;">
          _____________________<br>
          <strong>${companyProfile.companyName}</strong><br>
          ${getPartyLabel(type, 'company')}<br>
          ${companyProfile.legalForm || ''}
        </div>
      </td>
      <td style="width: 45%;">
        <div style="margin-bottom: 24pt;">
          _____________________<br>
          Ort, Datum
        </div>
        <div style="margin-top: 36pt; margin-bottom: 4pt;">
          _____________________<br>
          <strong>${partyBName}</strong><br>
          ${getPartyLabel(type, 'counterparty')}
        </div>
      </td>
    </tr>
  </table>
</div>`;

      // ✅ PROFESSIONELLER FOOTER MIT KOPF-/FUSSZEILEN
      const footerSection = `
<!-- Kopf- und Fußzeilen -->
<style>
  @media print {
    .page-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 1cm;
      font-size: 10pt;
      font-style: italic;
      border-bottom: 0.5pt solid #000;
      padding: 0 3cm 0 3cm;
    }
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1cm;
      font-size: 10pt;
      text-align: center;
      border-top: 0.5pt solid #000;
      padding: 5pt 0;
    }
  }
</style>

<!-- Fußzeile -->
<div class="page-footer" style="
  margin-top: 24pt;
  padding-top: 12pt;
  border-top: 0.5pt solid #000;
  text-align: center;
  font-size: 10pt;
  font-family: Arial, Calibri, sans-serif;
">
  Seite 1 von 1
</div>`;
      
      // Vertrag zusammensetzen - MIT PREMIUM FOOTER
      contractText = companyHeader + contractTitle + contractText + signatureSection + footerSection;
      console.log("✅ Professioneller Vertrag komplett erstellt! Länge:", contractText.length);
      
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
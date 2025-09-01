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

    // ✅ KLASSISCHE DEUTSCHE KANZLEI-VORLAGE - DIN A4 KONFORM
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: `Du bist Senior Partner einer renommierten deutschen Anwaltskanzlei. Erstelle klassische Verträge im traditionellen deutschen Kanzlei-Stil.

📐 KLASSISCHES DIN A4 LAYOUT:
- Schriftart: Times New Roman, Georgia, serif
- Schriftgröße: 11pt
- Zeilenhöhe: 1.45
- Blocksatz mit Silbentrennung
- Farbe: #111 (fast schwarz)

🎯 VERTRAGSSTRUKTUR - KLASSISCHER STIL:

1️⃣ EINLEITUNG MIT PARTEIEN (klassischer Fließtext):
<section style="font-family: 'Times New Roman', Georgia, serif; font-size: 11pt; line-height: 1.45; color: #111; break-inside: avoid; page-break-inside: avoid; margin-bottom: 12mm;">
  <p style="text-align: justify; hyphens: auto; margin: 0 0 10pt;">abgeschlossen zwischen der</p>
  <p style="margin: 6pt 0 2pt;"><strong style="text-transform: uppercase;">[COMPANY_NAME]</strong>, [COMPANY_ADDRESS]</p>
  <p style="font-size: 10pt; color: #555; font-style: italic; margin: 2pt 0;">in der Folge kurz [DYNAMIC_PARTY_A_LABEL] genannt,</p>
  <p style="text-align: center; margin: 10pt 0;">und</p>
  <p style="margin: 6pt 0 2pt;"><strong style="text-transform: uppercase;">[PARTY_B_NAME]</strong>, [PARTY_B_ADDRESS]</p>
  <p style="font-size: 10pt; color: #555; font-style: italic; margin: 2pt 0;">in der Folge kurz [DYNAMIC_PARTY_B_LABEL] genannt,</p>
  <p style="font-size: 10pt; color: #555; font-style: italic; margin: 2pt 0;">andererseits</p>
</section>

2️⃣ PARAGRAPHEN (§) - KLASSISCHER KANZLEI-STIL:
<section style="break-inside: avoid; page-break-inside: avoid; margin-top: 12mm;">
  <h2 style="font-size: 12pt; font-weight: 700; margin: 0 0 8pt;">§ 1 Vertragsgegenstand</h2>
  <p style="text-align: justify; hyphens: auto; -webkit-hyphens: auto; orphans: 3; widows: 3; margin: 0 0 10pt; font-size: 11pt; line-height: 1.45;">
    [Inhalt des Paragraphen - Blocksatz mit Silbentrennung]
  </p>
</section>

3️⃣ WICHTIGE FORMATIERUNGSREGELN:
- KEIN modernes Design, KEINE Boxen
- Klassischer Fließtext-Stil
- Beträge und Termine: <strong>15.000,00 EUR</strong>
- Namen in Verträgen: <strong>Name</strong>
- Blocksatz IMMER mit: text-align: justify; hyphens: auto;
- Absätze mit orphans: 3; widows: 3; (keine Hurenkinder/Schusterjungen)

4️⃣ VERTRAGSTYP-SPEZIFISCHE LABELS:
- Kaufvertrag: "Verkäufer" / "Käufer"
- Mietvertrag/Pachtvertrag: "Vermieter/Verpächter" / "Mieter/Pächter"
- Arbeitsvertrag: "Arbeitgeber" / "Arbeitnehmer"
- Dienstleistungsvertrag: "Auftraggeber" / "Auftragnehmer"
- NDA: "Offenlegender" / "Empfänger"

5️⃣ STRUKTUR DER PARAGRAPHEN:
§ 1 Vertragsgegenstand
§ 2 Leistungen/Pflichten
§ 3 Vergütung/Zahlung
§ 4 Laufzeit und Kündigung
§ 5 Gewährleistung/Haftung
§ 6 Vertraulichkeit (falls relevant)
§ 7 Salvatorische Klausel
§ 8 Schlussbestimmungen

⚖️ KLASSISCHE QUALITÄT:
- Traditioneller deutscher Kanzlei-Stil
- Keine modernen Elemente oder Farben
- Times New Roman als Hauptschrift
- Professioneller juristischer Ton
- KEINE Hinweise auf automatische Generierung
- Saubere Seitenumbrüche

WICHTIG: Ersetze [DYNAMIC_PARTY_A_LABEL] und [DYNAMIC_PARTY_B_LABEL] mit den korrekten Bezeichnungen!
Ersetze [COMPANY_NAME] mit dem Firmennamen aus dem Profil!
Ersetze [PARTY_B_NAME] mit den Eingabedaten!`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });

    const gptResult = completion.choices[0].message.content;
    
    // ✅ UNIVERSELLE PARTEI-LABELS UND DATEN ERSETZEN
    let processedGptResult = gptResult || "Fehler bei der Vertragsgenerierung";
    const partyLabels = getPartyLabel(type, 'both');
    
    // Firmeninformationen (companyProfile wurde weiter oben geladen)
    const companyName = (companyProfile && useCompanyProfile !== false) ? 
      companyProfile.companyName : (formData.seller || formData.landlord || formData.nameClient || 'Partei A');
    const companyAddress = (companyProfile && useCompanyProfile !== false) ? 
      `${companyProfile.street || ''}, ${companyProfile.postalCode || ''} ${companyProfile.city || ''}` : 
      (formData.addressSeller || formData.addressLandlord || formData.addressClient || '[Adresse]');
    
    // Partei B Informationen
    const partyBName = formData.buyer || formData.tenant || formData.employee || formData.nameFreelancer || formData.partyB || 'Partei B';
    const partyBAddress = formData.addressBuyer || formData.addressTenant || formData.addressEmployee || formData.addressFreelancer || '[Adresse]';
    
    processedGptResult = processedGptResult
      .replace(/\[DYNAMIC_PARTY_A_LABEL\]/g, partyLabels.company)
      .replace(/\[DYNAMIC_PARTY_B_LABEL\]/g, partyLabels.counterparty)
      .replace(/\[COMPANY_NAME\]/g, companyName)
      .replace(/\[COMPANY_ADDRESS\]/g, companyAddress)
      .replace(/\[PARTY_B_NAME\]/g, partyBName)
      .replace(/\[PARTY_B_ADDRESS\]/g, partyBAddress);
    
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
      
      // ✅ KLASSISCHER KANZLEI-HEADER - DIN A4 KONFORM
      const logoSection = finalLogoUrl 
        ? `<img src="${finalLogoUrl}" alt="Logo" style="height: 56px; object-fit: contain;" />`
        : '';
        
      const companyInfoSection = `
        <div style="text-align: right; font-family: 'Times New Roman', Georgia, serif;">
          <div style="font-weight: 700; font-size: 12pt; color: #111; margin-bottom: 3pt;">
            ${companyProfile.companyName || ''}
          </div>
          <div style="font-size: 10pt; color: #444; line-height: 12pt;">
            ${companyProfile.legalForm ? `${companyProfile.legalForm}<br>` : ''}
            ${companyProfile.street || ''} · ${companyProfile.postalCode || ''} ${companyProfile.city || ''}<br>
            ${companyProfile.contactEmail || ''} · ${companyProfile.contactPhone ? `${companyProfile.contactPhone}` : ''}<br>
            ${companyProfile.vatId ? `USt-IdNr.: ${companyProfile.vatId}` : ''}${companyProfile.hrbNumber ? ` · HRB ${companyProfile.hrbNumber}` : ''}
          </div>
        </div>`;

      companyHeader = `
<!-- Klassischer Kanzlei-Header -->
<style>
  @page { size: A4; margin: 25mm 20mm 25mm 25mm; }
  html, body { font-family: 'Times New Roman', Georgia, serif; font-size: 11pt; line-height: 1.45; color: #111; }
  p { text-align: justify; hyphens: auto; -webkit-hyphens: auto; orphans: 3; widows: 3; margin: 0 0 10pt; }
  section, .party, .clause, .signature, .titleblock { break-inside: avoid; page-break-inside: avoid; }
</style>
<header style="
  display: grid;
  grid-template-columns: 1fr 2fr;
  column-gap: 12mm;
  margin-bottom: 8mm;
  font-family: 'Times New Roman', Georgia, serif;
">
  <div style="margin-top: 10mm;">
    ${logoSection}
  </div>
  <div style="margin-top: 10mm;">
    ${companyInfoSection}
  </div>
</header>
<div style="height: 1px; background: #C9CCD1; margin-bottom: 14mm;"></div>

`;
      
      console.log("📝 Company Header Debug:", {
        hasLogo: !!companyProfile.logoUrl,
        hasBase64Logo: !!finalLogoUrl,
        headerLength: companyHeader.length,
        headerPreview: companyHeader.substring(0, 300)
      });
      
      // ✅ KLASSISCHER VERTRAGSTITEL - DIN A4 KONFORM
      const today = new Date().toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
      
      const contractTitle = `
<!-- Klassischer Titelblock -->
<section style="
  text-align: center;
  margin: 12mm 0 10mm 0;
  font-family: 'Times New Roman', Georgia, serif;
">
  <h1 style="
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    font-size: 15pt;
    font-weight: 700;
    margin: 0;
    color: #111;
  ">
    ${getContractTitle(type).toUpperCase()}
  </h1>
  <div style="
    text-align: center;
    color: #555;
    font-size: 10pt;
    margin-top: 8pt;
  ">
    ${today}
  </div>
</section>`;

      // ✅ KLASSISCHER UNTERSCHRIFTSBLOCK - DIN A4 KONFORM
      const signatureSection = `
<!-- Klassischer Unterschriftenblock -->
<section style="
  margin-top: 16mm;
  break-inside: avoid;
  page-break-inside: avoid;
  font-family: 'Times New Roman', Georgia, serif;
  font-size: 11pt;
">
  <table style="
    width: 100%;
    border-collapse: collapse;
  ">
    <tr>
      <td style="width: 50%; vertical-align: top; padding-right: 8mm;">
        Ort, Datum: ____________________
      </td>
      <td style="width: 50%; vertical-align: top;">
        Ort, Datum: ____________________
      </td>
    </tr>
    <tr>
      <td style="padding-top: 12pt; padding-right: 8mm;">
        Unterschrift ${getPartyLabel(type, 'company')}
      </td>
      <td style="padding-top: 12pt;">
        Unterschrift ${getPartyLabel(type, 'counterparty')}
      </td>
    </tr>
    <tr>
      <td style="padding-top: 8pt; padding-right: 8mm;">
        ______________________________
      </td>
      <td style="padding-top: 8pt;">
        ______________________________
      </td>
    </tr>
    <tr>
      <td style="padding-top: 4pt; padding-right: 8mm; font-size: 10pt; color: #555;">
        (${companyProfile.companyName})
      </td>
      <td style="padding-top: 4pt; font-size: 10pt; color: #555;">
        (${formData.buyer || formData.tenant || formData.employee || formData.partyB || 'Vertragspartner'})
      </td>
    </tr>
  </table>
</section>`;

      // ✅ KLASSISCHER FOOTER MIT SEITENZAHLEN
      const footerSection = `
<!-- Klassischer Footer -->
<div style="
  position: fixed;
  bottom: 12mm;
  left: 0;
  right: 0;
  text-align: center;
  color: #666;
  font-size: 9pt;
  font-family: 'Times New Roman', Georgia, serif;
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
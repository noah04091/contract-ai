// 🔄 backend/routes/generate.js - MIT HTML-FORMATIERUNG
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const https = require("https");
const http = require("http");
const AWS = require("aws-sdk");

// ✅ S3 Setup für frische Logo-URLs
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// ✅ Base64-Konvertierung für S3-Logos
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

// 🎨 NEU: PROFESSIONELLE HTML-FORMATIERUNG FÜR VERTRÄGE
const formatContractToHTML = async (contractText, companyProfile, contractType) => {
  // Logo als Base64 konvertieren falls vorhanden
  let logoBase64 = null;
  if (companyProfile?.logoUrl) {
    try {
      if (companyProfile.logoUrl.includes('s3.amazonaws.com')) {
        logoBase64 = await convertS3ToBase64(companyProfile.logoUrl);
      } else {
        logoBase64 = companyProfile.logoUrl;
      }
      console.log("✅ Logo für PDF vorbereitet");
    } catch (error) {
      console.warn("⚠️ Logo konnte nicht geladen werden:", error);
    }
  }

  // Text in strukturierte Abschnitte aufteilen
  const lines = contractText.split('\n');
  let htmlContent = '';
  let currentSection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Vertragsüberschrift
    if (trimmedLine.startsWith('===') && trimmedLine.endsWith('===')) {
      continue; // Überspringen, wird durch Header ersetzt
    }
    
    // Hauptüberschrift (KAUFVERTRAG etc.)
    if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && !trimmedLine.startsWith('§')) {
      htmlContent += `<h1 class="contract-title">${trimmedLine}</h1>`;
    }
    // Paragraph-Überschriften (§ 1, § 2, etc.)
    else if (trimmedLine.startsWith('§')) {
      if (currentSection) {
        htmlContent += '</div>'; // Vorherige Section schließen
      }
      currentSection = trimmedLine;
      htmlContent += `<div class="section"><h2 class="paragraph-title">${trimmedLine}</h2>`;
    }
    // Unterabschnitte (1), (2), etc.
    else if (trimmedLine.match(/^\(\d+\)/)) {
      htmlContent += `<div class="subsection">${trimmedLine}</div>`;
    }
    // Unterpunkte a), b), etc.
    else if (trimmedLine.match(/^[a-z]\)/)) {
      htmlContent += `<div class="subpoint">${trimmedLine}</div>`;
    }
    // PRÄAMBEL
    else if (trimmedLine === 'PRÄAMBEL') {
      htmlContent += `<h3 class="preamble-title">PRÄAMBEL</h3>`;
    }
    // Zwischen-Klausel
    else if (trimmedLine === 'zwischen') {
      htmlContent += `<p class="between-clause">zwischen</p>`;
    }
    // Nachfolgend genannt
    else if (trimmedLine.includes('nachfolgend') && trimmedLine.includes('genannt')) {
      htmlContent += `<p class="party-designation">${trimmedLine}</p>`;
    }
    // Unterschriftszeilen
    else if (trimmedLine.includes('_______')) {
      htmlContent += `<div class="signature-line">${trimmedLine.replace(/_+/g, '<span class="line"></span>')}</div>`;
    }
    // Normaler Text
    else if (trimmedLine) {
      htmlContent += `<p class="contract-text">${trimmedLine}</p>`;
    }
  }
  
  if (currentSection) {
    htmlContent += '</div>'; // Letzte Section schließen
  }

  // Vollständiges HTML-Dokument mit professionellem Styling
  const fullHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 25mm 20mm 30mm 25mm;
      
      @bottom-center {
        content: counter(page) " von " counter(pages);
        font-size: 9pt;
        color: #666;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
      background: white;
    }
    
    /* PROFESSIONELLER HEADER MIT LOGO */
    .header {
      margin-bottom: 40px;
      ${logoBase64 ? 'border-bottom: 2px solid #003366;' : ''}
      padding-bottom: 20px;
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-name {
      font-size: 14pt;
      font-weight: bold;
      color: #003366;
      margin-bottom: 5px;
    }
    
    .company-details {
      font-size: 9pt;
      color: #333;
      line-height: 1.3;
    }
    
    .logo-container {
      width: 120px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    /* VERTRAGSTITEL */
    .contract-title {
      font-size: 18pt;
      font-weight: bold;
      text-align: center;
      margin: 40px 0 30px 0;
      color: #000;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    
    /* PARAGRAPHEN */
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .paragraph-title {
      font-size: 13pt;
      font-weight: bold;
      margin: 25px 0 12px 0;
      color: #003366;
      page-break-after: avoid;
    }
    
    /* TEXTFORMATIERUNG */
    .contract-text {
      margin-bottom: 10px;
      text-align: justify;
      text-justify: inter-word;
      hyphens: auto;
    }
    
    .subsection {
      margin: 12px 0 8px 15px;
      text-align: justify;
    }
    
    .subpoint {
      margin: 5px 0 5px 30px;
      text-align: justify;
    }
    
    .between-clause {
      text-align: center;
      margin: 20px 0;
      font-style: italic;
    }
    
    .party-designation {
      text-align: center;
      font-style: italic;
      margin: 5px 0 15px 0;
    }
    
    .preamble-title {
      font-size: 12pt;
      font-weight: bold;
      margin: 20px 0 10px 0;
    }
    
    /* UNTERSCHRIFTEN BEREICH */
    .signature-section {
      margin-top: 60px;
      page-break-inside: avoid;
    }
    
    .signature-line {
      margin: 40px 0 5px 0;
      display: flex;
      justify-content: space-between;
    }
    
    .signature-line .line {
      display: inline-block;
      width: 200px;
      border-bottom: 1px solid #000;
    }
    
    /* SEITENUMBRUCH-KONTROLLE */
    h1, h2, h3 {
      page-break-after: avoid;
    }
    
    p {
      orphans: 3;
      widows: 3;
    }
    
    .section {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* Verhindere Umbruch nach Überschriften */
    .paragraph-title + * {
      page-break-before: avoid;
    }
  </style>
</head>
<body>
  ${companyProfile ? `
  <div class="header">
    <div class="header-content">
      <div class="company-info">
        <div class="company-name">${companyProfile.companyName}</div>
        <div class="company-details">
          ${companyProfile.legalForm ? `${companyProfile.legalForm}<br>` : ''}
          ${companyProfile.street}, ${companyProfile.postalCode} ${companyProfile.city}<br>
          ${companyProfile.contactEmail ? `E-Mail: ${companyProfile.contactEmail}<br>` : ''}
          ${companyProfile.contactPhone ? `Tel: ${companyProfile.contactPhone}<br>` : ''}
          ${companyProfile.vatId ? `USt-IdNr.: ${companyProfile.vatId}<br>` : ''}
          ${companyProfile.tradeRegister ? companyProfile.tradeRegister : ''}
        </div>
      </div>
      ${logoBase64 ? `
      <div class="logo-container">
        <img src="${logoBase64}" alt="Firmenlogo">
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}
  
  <div class="contract-content">
    ${htmlContent}
  </div>
</body>
</html>`;

  return fullHTML;
};

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// MongoDB Setup
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let usersCollection, contractsCollection, db;

(async () => {
  try {
    await client.connect();
    db = client.db("contract_ai");
    usersCollection = db.collection("users");
    contractsCollection = db.collection("contracts");
    console.log("🔄 Generate.js: MongoDB verbunden!");
  } catch (err) {
    console.error("❌ Generate.js MongoDB Fehler:", err);
  }
})();

// 🎯 PROFESSIONELLE VERTRAGSGENERIERUNG
router.post("/", verifyToken, async (req, res) => {
  console.log("🚀 Generate Route aufgerufen!");
  
  const { type, formData, useCompanyProfile = false } = req.body;

  if (!type || !formData || !formData.title) {
    return res.status(400).json({ message: "❌ Fehlende Felder für Vertragserstellung." });
  }

  try {
    // Company Profile laden
    let companyProfile = null;
    if (db) {
      const profileData = await db.collection("company_profiles").findOne({ 
        userId: new ObjectId(req.user.userId) 
      });
      
      if (profileData) {
        companyProfile = profileData;
        console.log("✅ Company Profile gefunden:", companyProfile.companyName);
      }
    }

    // Nutzer & Limit prüfen
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

    // Company Details vorbereiten
    let companyDetails = "";
    if (companyProfile && useCompanyProfile) {
      companyDetails = `${companyProfile.companyName}`;
      if (companyProfile.legalForm) companyDetails += ` (${companyProfile.legalForm})`;
      companyDetails += `\n${companyProfile.street}, ${companyProfile.postalCode || ''} ${companyProfile.city}`;
      if (companyProfile.vatId) companyDetails += `\nUSt-IdNr.: ${companyProfile.vatId}`;
      if (companyProfile.tradeRegister) companyDetails += `\n${companyProfile.tradeRegister}`;
    }

    // System Prompt (IHRE VERSION BEHALTEN)
    let systemPrompt = `Du bist ein Experte für deutsches Vertragsrecht und erstellst professionelle, rechtssichere Verträge.

ABSOLUT KRITISCHE REGELN:
1. Erstelle einen VOLLSTÄNDIGEN Vertrag mit MINDESTENS 10-12 Paragraphen
2. KEIN HTML, KEIN MARKDOWN - nur reiner Text
3. Verwende EXAKT diese Struktur (keine Abweichungen!)
4. Fülle ALLE Felder mit echten Daten - KEINE Platzhalter in eckigen Klammern

EXAKTE VERTRAGSSTRUKTUR (BITTE GENAU SO VERWENDEN):

=================================
[VERTRAGSTYP IN GROSSBUCHSTABEN]
=================================

zwischen

[Vollständige Angaben Partei A mit allen Details]
- nachfolgend "[Kurzbezeichnung]" genannt -

und

[Vollständige Angaben Partei B mit allen Details]
- nachfolgend "[Kurzbezeichnung]" genannt -

PRÄAMBEL
[Mindestens 2-3 Sätze zur Einleitung und zum Vertragszweck]

§ 1 VERTRAGSGEGENSTAND

(1) [Hauptgegenstand sehr detailliert beschreiben - mindestens 3-4 Zeilen]

(2) [Weitere wichtige Details zum Gegenstand]

(3) [Zusätzliche Spezifikationen falls relevant]

§ 2 LEISTUNGEN UND PFLICHTEN

(1) Der [Bezeichnung Partei A] verpflichtet sich zu folgenden Leistungen:
   a) [Detaillierte Pflicht 1]
   b) [Detaillierte Pflicht 2]
   c) [Detaillierte Pflicht 3]
   d) [Weitere Pflichten falls relevant]

(2) Der [Bezeichnung Partei B] verpflichtet sich zu folgenden Leistungen:
   a) [Detaillierte Pflicht 1]
   b) [Detaillierte Pflicht 2]
   c) [Weitere Pflichten falls relevant]

§ 3 VERGÜTUNG UND ZAHLUNGSBEDINGUNGEN

(1) Die Vergütung beträgt [EXAKTER BETRAG mit Währung].

(2) Die Zahlung erfolgt [genaue Zahlungsmodalitäten].

(3) Bei Zahlungsverzug werden Verzugszinsen in Höhe von 9 Prozentpunkten über dem Basiszinssatz berechnet.

§ 4 LAUFZEIT UND KÜNDIGUNG

(1) Dieser Vertrag tritt am [Datum] in Kraft und läuft [Laufzeitdetails].

(2) Die ordentliche Kündigung ist [Kündigungsdetails].

(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.

§ 5 GEWÄHRLEISTUNG

(1) [Detaillierte Gewährleistungsregelungen - mindestens 3-4 Zeilen]

(2) Die Gewährleistungsfrist beträgt [Zeitraum].

(3) [Regelungen zur Nacherfüllung]

§ 6 HAFTUNG

(1) Die Haftung richtet sich nach den gesetzlichen Bestimmungen, soweit nachfolgend nichts anderes bestimmt ist.

(2) [Haftungsbeschränkungen detailliert]

(3) Die Verjährungsfrist für Schadensersatzansprüche beträgt [Zeitraum].

§ 7 EIGENTUMSVORBEHALT / GEFAHRÜBERGANG

(1) [Bei Kaufverträgen: Eigentumsvorbehalt, sonst Gefahrübergang]

(2) [Weitere Details]

§ 8 VERTRAULICHKEIT

(1) Die Vertragsparteien verpflichten sich, über alle vertraulichen Informationen Stillschweigen zu bewahren.

(2) Diese Verpflichtung besteht auch nach Beendigung des Vertrages fort.

§ 9 DATENSCHUTZ

(1) Die Parteien verpflichten sich zur Einhaltung aller geltenden Datenschutzbestimmungen, insbesondere der DSGVO.

(2) Personenbezogene Daten werden ausschließlich zur Vertragsdurchführung verarbeitet.

§ 10 ZUSÄTZLICHE VEREINBARUNGEN [Je nach Vertragstyp anpassen]

(1) [Vertragstyp-spezifische Klauseln]

§ 11 SCHLUSSBESTIMMUNGEN

(1) Änderungen und Ergänzungen dieses Vertrages bedürfen zu ihrer Wirksamkeit der Schriftform. Dies gilt auch für die Änderung dieser Schriftformklausel selbst.

(2) Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein oder werden, so wird hierdurch die Wirksamkeit des Vertrages im Übrigen nicht berührt.

(3) Erfüllungsort und Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist [Ort].

(4) Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.


_______________________     _______________________
Ort, Datum                  Ort, Datum


_______________________     _______________________
[Name Partei A]             [Name Partei B]
[Funktion/Titel]            [Funktion/Titel]`;

    // User Prompts (ALLE IHRE CASES BEHALTEN)
    let userPrompt = "";
    
    switch (type) {
      case "kaufvertrag":
        const verkäufer = companyDetails || formData.seller || "Verkäufer";
        const käufer = formData.buyer || "Käufer";
        
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN, professionellen Kaufvertrag mit MINDESTENS 11 Paragraphen.

VERTRAGSTYP: KAUFVERTRAG

VERKÄUFER (verwende als Partei A):
${verkäufer}

KÄUFER (verwende als Partei B):
${käufer}

KAUFGEGENSTAND:
${formData.item || "Gebrauchtes Kraftfahrzeug, Marke: [MARKE], Modell: [MODELL], Baujahr: [JAHR], Kilometerstand: [KM]"}

KAUFPREIS:
${formData.price || "15.000 EUR"}

ÜBERGABE/LIEFERUNG:
${formData.deliveryDate || new Date().toISOString().split('T')[0]}

ERSTELLE EINEN VOLLSTÄNDIGEN VERTRAG MIT:
- § 1 Vertragsgegenstand (sehr detailliert)
- § 2 Kaufpreis und Zahlungsbedingungen
- § 3 Übergabe und Lieferung
- § 4 Gewährleistung (detailliert!)
- § 5 Haftung
- § 6 Eigentumsvorbehalt
- § 7 Gefahrübergang
- § 8 Beschaffenheit der Kaufsache
- § 9 Vertraulichkeit
- § 10 Datenschutz
- § 11 Schlussbestimmungen

Verwende professionelle juristische Sprache und fülle ALLE Angaben vollständig aus!`;
        break;

      case "freelancer":
        const auftraggeber = companyDetails || formData.nameClient || "Auftraggeber GmbH";
        
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Dienstleistungsvertrag mit MINDESTENS 12 Paragraphen.

VERTRAGSTYP: DIENSTLEISTUNGSVERTRAG / FREELANCER-VERTRAG

AUFTRAGGEBER (verwende als Partei A):
${auftraggeber}
${formData.clientAddress || ""}

AUFTRAGNEHMER (verwende als Partei B):
${formData.nameFreelancer || "Freelancer"}
${formData.freelancerAddress || ""}
${formData.freelancerTaxId ? `Steuer-ID/USt-IdNr.: ${formData.freelancerTaxId}` : ''}

LEISTUNGSBESCHREIBUNG:
${formData.description || "Beratungsdienstleistungen"}

PROJEKTDAUER:
${formData.timeframe || "3 Monate"}

VERGÜTUNG:
${formData.payment || "5000 EUR"}
Zahlungsbedingungen: ${formData.paymentTerms || '14 Tage netto'}
Rechnungsstellung: ${formData.invoiceInterval || 'Monatlich'}

WEITERE DETAILS:
- Arbeitsort: ${formData.workLocation || 'Remote/Homeoffice'}
- Nutzungsrechte: ${formData.rights || "Vollständig an Auftraggeber"}
- Vertraulichkeit: ${formData.confidentiality || 'Standard-Vertraulichkeit'}
- Haftung: ${formData.liability || 'Auf Auftragswert begrenzt'}
- Kündigung: ${formData.terminationClause || "14 Tage zum Monatsende"}
- Gerichtsstand: ${formData.jurisdiction || 'Sitz des Auftraggebers'}

Erstelle einen VOLLSTÄNDIGEN Vertrag mit allen erforderlichen Paragraphen!`;
        break;

      // ALLE ANDEREN CASES BLEIBEN GLEICH
      case "mietvertrag":
        userPrompt = `Erstelle einen professionellen Mietvertrag mit folgenden Daten:

VERTRAGSTYP: Mietvertrag für Wohnraum

VERMIETER:
${companyDetails || formData.landlord}

MIETER:
${formData.tenant}

MIETOBJEKT:
${formData.address}

MIETBEGINN:
${formData.startDate}

MIETE:
Kaltmiete: ${formData.baseRent}
Nebenkosten: ${formData.extraCosts}

KÜNDIGUNG:
${formData.termination}

Füge alle mietrechtlich relevanten Klauseln ein (Schönheitsreparaturen, Kaution, Hausordnung, etc.).`;
        break;

      case "arbeitsvertrag":
        userPrompt = `Erstelle einen professionellen Arbeitsvertrag mit folgenden Daten:

VERTRAGSTYP: Arbeitsvertrag

ARBEITGEBER:
${companyDetails || formData.employer}

ARBEITNEHMER:
${formData.employee}

POSITION/TÄTIGKEIT:
${formData.position}

ARBEITSBEGINN:
${formData.startDate}

VERGÜTUNG:
${formData.salary}

ARBEITSZEIT:
${formData.workingHours}

Füge alle arbeitsrechtlich relevanten Klauseln ein (Probezeit, Urlaub, Krankheit, Verschwiegenheit, etc.).`;
        break;

      case "nda":
        userPrompt = `Erstelle eine professionelle Geheimhaltungsvereinbarung (NDA) mit folgenden Daten:

VERTRAGSTYP: Geheimhaltungsvereinbarung / Non-Disclosure Agreement (NDA)

PARTEI A (Offenlegender):
${companyDetails || formData.partyA}

PARTEI B (Empfänger):
${formData.partyB}

ZWECK DER VEREINBARUNG:
${formData.purpose}

GÜLTIGKEITSDAUER:
${formData.duration}

Füge alle relevanten Klauseln ein (Definition vertraulicher Informationen, Ausnahmen, Rückgabe von Unterlagen, Vertragsstrafe, etc.).`;
        break;

      case "gesellschaftsvertrag":
        userPrompt = `Erstelle einen professionellen Gesellschaftsvertrag mit folgenden Daten:

VERTRAGSTYP: Gesellschaftsvertrag

GESELLSCHAFTSNAME:
${formData.companyName}

GESELLSCHAFTSFORM:
${formData.companyType}

GESELLSCHAFTER:
${formData.partners}

STAMMKAPITAL:
${formData.capital}

GESCHÄFTSANTEILE:
${formData.shares}

UNTERNEHMENSGEGENSTAND:
${formData.purpose}

GESCHÄFTSFÜHRUNG:
${formData.management}`;
        break;

      case "darlehensvertrag":
        userPrompt = `Erstelle einen professionellen Darlehensvertrag mit folgenden Daten:

VERTRAGSTYP: Darlehensvertrag

DARLEHENSGEBER:
${companyDetails || formData.lender}

DARLEHENSNEHMER:
${formData.borrower}

DARLEHENSSUMME:
${formData.amount}

ZINSSATZ:
${formData.interestRate}

LAUFZEIT:
${formData.duration}

RÜCKZAHLUNG:
${formData.repayment}

SICHERHEITEN:
${formData.security || "Keine"}`;
        break;

      case "lizenzvertrag":
        userPrompt = `Erstelle einen professionellen Lizenzvertrag mit folgenden Daten:

VERTRAGSTYP: Lizenzvertrag

LIZENZGEBER:
${companyDetails || formData.licensor}

LIZENZNEHMER:
${formData.licensee}

LIZENZGEGENSTAND:
${formData.subject}

LIZENZART:
${formData.licenseType}

TERRITORIUM:
${formData.territory}

LIZENZGEBÜHREN:
${formData.fee}

LAUFZEIT:
${formData.duration}`;
        break;

      case "aufhebungsvertrag":
        userPrompt = `Erstelle einen professionellen Aufhebungsvertrag mit folgenden Daten:

VERTRAGSTYP: Aufhebungsvertrag

ARBEITGEBER:
${companyDetails || formData.employer}

ARBEITNEHMER:
${formData.employee}

BEENDIGUNGSDATUM:
${formData.endDate}

ABFINDUNG:
${formData.severance || "Keine"}

BEENDIGUNGSGRUND:
${formData.reason}

RESTURLAUB:
${formData.vacation}

ARBEITSZEUGNIS:
${formData.reference}`;
        break;

      case "pachtvertrag":
        userPrompt = `Erstelle einen professionellen Pachtvertrag mit folgenden Daten:

VERTRAGSTYP: Pachtvertrag

VERPÄCHTER:
${companyDetails || formData.lessor}

PÄCHTER:
${formData.lessee}

PACHTOBJEKT:
${formData.object}

PACHTBEGINN:
${formData.startDate}

PACHTZINS:
${formData.rent}

PACHTDAUER:
${formData.duration}

NUTZUNGSZWECK:
${formData.usage}`;
        break;

      case "custom":
        userPrompt = `Erstelle einen professionellen Vertrag mit dem Titel: ${formData.title}

VERTRAGSINHALTE:
${formData.details}

Strukturiere den Vertrag professionell mit allen notwendigen rechtlichen Klauseln.`;
        break;

      default:
        return res.status(400).json({ message: "❌ Unbekannter Vertragstyp." });
    }

    // GPT-4 Generierung
    console.log("🚀 Starte GPT-4 Vertragsgenerierung...");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });
    
    let contractText = completion.choices[0].message.content || "";
    
    // Qualitätskontrolle
    if (contractText.length < 2000) {
      console.warn("⚠️ Vertrag zu kurz (" + contractText.length + " Zeichen), fordere längere Version an...");
      
      const retryCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: systemPrompt + "\n\nWICHTIG: Erstelle einen SEHR DETAILLIERTEN, vollständigen Vertrag mit MINDESTENS 12 ausführlichen Paragraphen! Jeder Paragraph muss mehrere Absätze haben!" 
          },
          { 
            role: "user", 
            content: userPrompt + "\n\nDER VERTRAG MUSS SEHR AUSFÜHRLICH SEIN! Mindestens 12 Paragraphen mit jeweils mehreren Absätzen!" 
          }
        ],
        temperature: 0.4,
        max_tokens: 4000
      });
      
      contractText = retryCompletion.choices[0].message.content || contractText;
      console.log("🔄 Zweiter Versuch abgeschlossen, neue Länge:", contractText.length);
    }
    
    // Struktur-Validation
    const hasRequiredElements = contractText.includes('§ 1') && 
                               contractText.includes('§ 5') && 
                               contractText.includes('§ 10') &&
                               contractText.includes('Unterschrift') && 
                               contractText.length > 2000;
    
    if (!hasRequiredElements) {
      console.warn("⚠️ Vertrag unvollständig, füge fehlende Standard-Klauseln hinzu...");
      
      if (!contractText.includes('§ 10')) {
        contractText = contractText.replace('§ 11 SCHLUSSBESTIMMUNGEN', '§ 10 ZUSÄTZLICHE VEREINBARUNGEN\n\n(1) Weitere Vereinbarungen wurden nicht getroffen.\n\n§ 11 SCHLUSSBESTIMMUNGEN');
      }
    }
    
    console.log("✅ Vertragsgenerierung erfolgreich, finale Länge:", contractText.length);

    // 🎨 NEU: HTML-Formatierung für professionelle Darstellung
    let formattedHTML = "";
    if (useCompanyProfile && companyProfile) {
      formattedHTML = await formatContractToHTML(contractText, companyProfile, type);
      console.log("✅ Professionelle HTML-Formatierung mit Logo erstellt");
    }

    // Analyse-Zähler hochzählen
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { analysisCount: 1 } }
    );

    // Vertrag in DB speichern
    const contract = {
      userId: req.user.userId,
      name: formData.title,
      content: contractText,
      contentHTML: formattedHTML, // NEU: HTML-Version speichern
      laufzeit: "Generiert",
      kuendigung: "Generiert", 
      expiryDate: "",
      status: "Aktiv",
      uploadedAt: new Date(),
      isGenerated: true,
      contractType: type,
      hasCompanyProfile: !!companyProfile,
      formData: formData
    };

    const result = await contractsCollection.insertOne(contract);

    // CONTRACT ANALYTICS
    const logContractGeneration = (contract, user, companyProfile) => {
      const analytics = {
        contractType: contract.contractType,
        hasCompanyProfile: !!companyProfile,
        userPlan: user.subscriptionPlan || 'free',
        timestamp: new Date(),
        contentLength: contract.content.length,
        generationSource: 'ai_generation_v4_professional',
        userId: user._id.toString(),
        success: true
      };
      
      console.log("📊 Contract Generated Analytics:", analytics);
    };

    // Analytics loggen
    logContractGeneration(contract, user, companyProfile);

    res.json({
      message: "✅ Vertrag erfolgreich generiert & gespeichert.",
      contractId: result.insertedId,
      contractText: contractText,
      contractHTML: formattedHTML, // NEU: HTML zurückgeben
      metadata: {
        contractType: type,
        hasCompanyProfile: !!companyProfile,
        hasLogo: !!companyProfile?.logoUrl,
        contentLength: contractText.length,
        generatedAt: new Date().toISOString(),
        version: 'v4_professional'
      }
    });
    
  } catch (err) {
    console.error("❌ Fehler beim Erzeugen/Speichern:", err);
    res.status(500).json({ message: "Serverfehler beim Erzeugen oder Speichern." });
  }
});

module.exports = router;
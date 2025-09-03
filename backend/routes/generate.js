// 📄 backend/routes/generate.js - MIT VERBESSERTER HTML-FORMATIERUNG FÜR PROFESSIONELLE PDFs
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

// ✅ ERWEITERTE Base64-Konvertierung für S3-Logos mit DEBUGGING und FALLBACKS
const convertS3ToBase64 = async (url) => {
  return new Promise((resolve, reject) => {
    console.log("🔄 Logo-Konvertierung gestartet:", url);
    
    const protocol = url.startsWith('https') ? https : http;
    const maxRetries = 3;
    let currentRetry = 0;
    
    const attemptDownload = () => {
      console.log(`🔄 Logo Download Versuch ${currentRetry + 1}/${maxRetries}`);
      
      const request = protocol.get(url, {
        timeout: 10000, // 10 Sekunden Timeout
        headers: {
          'User-Agent': 'Contract-AI-Logo-Fetcher/1.0',
          'Accept': 'image/*'
        }
      }, (response) => {
        console.log(`📊 Logo Response Status: ${response.statusCode}`);
        console.log(`📊 Logo Content-Type: ${response.headers['content-type']}`);
        console.log(`📊 Logo Content-Length: ${response.headers['content-length']}`);
        
        if (response.statusCode !== 200) {
          console.error(`❌ Logo HTTP Error: ${response.statusCode}`);
          if (currentRetry < maxRetries - 1) {
            currentRetry++;
            setTimeout(attemptDownload, 1000); // 1 Sekunde warten
            return;
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }
        }
        
        const chunks = [];
        let totalSize = 0;
        
        response.on('data', (chunk) => {
          chunks.push(chunk);
          totalSize += chunk.length;
          if (totalSize > 5 * 1024 * 1024) { // Max 5MB
            console.error("❌ Logo zu groß (>5MB)");
            request.destroy();
            reject(new Error('Logo file too large (>5MB)'));
            return;
          }
        });
        
        response.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            const mimeType = response.headers['content-type'] || 'image/jpeg';
            
            // Validiere Bildformat
            const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validImageTypes.includes(mimeType)) {
              console.error(`❌ Ungültiges Bildformat: ${mimeType}`);
              reject(new Error(`Unsupported image type: ${mimeType}`));
              return;
            }
            
            const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
            console.log(`✅ Logo erfolgreich konvertiert: ${buffer.length} bytes, ${mimeType}`);
            resolve(base64);
          } catch (error) {
            console.error("❌ Base64 Konvertierung fehlgeschlagen:", error);
            reject(error);
          }
        });
        
        response.on('error', (error) => {
          console.error(`❌ Logo Response Error:`, error);
          if (currentRetry < maxRetries - 1) {
            currentRetry++;
            setTimeout(attemptDownload, 1000);
          } else {
            reject(error);
          }
        });
      });
      
      request.on('timeout', () => {
        console.error("❌ Logo Download Timeout");
        request.destroy();
        if (currentRetry < maxRetries - 1) {
          currentRetry++;
          setTimeout(attemptDownload, 2000);
        } else {
          reject(new Error('Download timeout after multiple retries'));
        }
      });
      
      request.on('error', (error) => {
        console.error(`❌ Logo Request Error:`, error);
        if (currentRetry < maxRetries - 1) {
          currentRetry++;
          setTimeout(attemptDownload, 1000);
        } else {
          reject(error);
        }
      });
    };
    
    attemptDownload();
  });
};

// 🆕 NEUE FUNKTION: Frische S3 URL generieren
const generateFreshS3Url = (logoKey) => {
  try {
    const freshUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: logoKey,
      Expires: 3600 // 1 Stunde gültig
    });
    console.log("✅ Frische S3 URL generiert:", freshUrl.substring(0, 100) + "...");
    return freshUrl;
  } catch (error) {
    console.error("❌ S3 URL Generierung fehlgeschlagen:", error);
    return null;
  }
};

// 🆕 NEUE FUNKTION: Logo mit mehreren Fallback-Strategien laden
const loadLogoWithFallbacks = async (companyProfile) => {
  console.log("🎨 Logo-Loading mit Fallbacks gestartet");
  
  if (!companyProfile?.logoUrl) {
    console.log("ℹ️ Kein Logo-URL im Company Profile vorhanden");
    return null;
  }
  
  const strategies = [];
  
  // Strategie 1: Direkte URL verwenden wenn bereits Base64
  if (companyProfile.logoUrl.startsWith('data:')) {
    console.log("📊 Strategie 1: Logo ist bereits Base64");
    return companyProfile.logoUrl;
  }
  
  // Strategie 2: Frische S3 URL generieren wenn logoKey vorhanden
  if (companyProfile.logoKey) {
    const freshUrl = generateFreshS3Url(companyProfile.logoKey);
    if (freshUrl) {
      strategies.push({ name: 'Frische S3 URL', url: freshUrl });
    }
  }
  
  // Strategie 3: Original URL verwenden
  strategies.push({ name: 'Original URL', url: companyProfile.logoUrl });
  
  // Alle Strategien durchprobieren
  for (const strategy of strategies) {
    try {
      console.log(`🔄 Versuche ${strategy.name}: ${strategy.url.substring(0, 100)}...`);
      const base64Logo = await convertS3ToBase64(strategy.url);
      console.log(`✅ ${strategy.name} erfolgreich!`);
      return base64Logo;
    } catch (error) {
      console.error(`❌ ${strategy.name} fehlgeschlagen:`, error.message);
      continue;
    }
  }
  
  console.error("❌ Alle Logo-Loading-Strategien fehlgeschlagen");
  return null;
};

// 🎨 BOMBASTISCHE HTML-FORMATIERUNG FÜR PROFESSIONELLE PDFs
const formatContractToHTML = async (contractText, companyProfile, contractType) => {
  console.log("🚀 Starte bombastische HTML-Formatierung für:", contractType);
  
  // 🎨 VERBESSERTES Logo-Loading mit allen Fallback-Strategien
  let logoBase64 = null;
  if (companyProfile) {
    console.log("🏢 Company Profile vorhanden, lade Logo...");
    logoBase64 = await loadLogoWithFallbacks(companyProfile);
    
    if (logoBase64) {
      console.log("✅ Logo erfolgreich geladen und konvertiert!");
      console.log(`📊 Logo Größe: ${Math.round(logoBase64.length / 1024)} KB`);
    } else {
      console.warn("⚠️ Logo konnte nicht geladen werden - verwende Fallback");
    }
  } else {
    console.log("ℹ️ Kein Company Profile vorhanden");
  }

  // Text in strukturierte Abschnitte aufteilen
  const lines = contractText.split('\n');
  let htmlContent = '';
  let currentSection = '';
  let inSignatureSection = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Überspringe die === Linien
    if (trimmedLine.startsWith('===') || trimmedLine.endsWith('===')) {
      continue;
    }
    
    // Hauptüberschrift (KAUFVERTRAG etc.)
    if (trimmedLine === trimmedLine.toUpperCase() && 
        trimmedLine.length > 5 && 
        !trimmedLine.startsWith('§') &&
        !trimmedLine.includes('HRB') &&
        trimmedLine !== 'PRÄAMBEL') {
      htmlContent += `<h1 class="contract-title">${trimmedLine}</h1>`;
    }
    // Handelsregister
    else if (trimmedLine.includes('HRB')) {
      htmlContent += `<p class="registry-number">${trimmedLine}</p>`;
    }
    // Paragraph-Überschriften
    else if (trimmedLine.startsWith('§')) {
      if (currentSection) {
        htmlContent += '</div>';
      }
      currentSection = trimmedLine;
      htmlContent += `<div class="section"><h2 class="paragraph-title">${trimmedLine}</h2>`;
    }
    // PRÄAMBEL
    else if (trimmedLine === 'PRÄAMBEL') {
      htmlContent += `<h3 class="preamble-title">PRÄAMBEL</h3>`;
    }
    // zwischen
    else if (trimmedLine === 'zwischen') {
      htmlContent += `<p class="between-clause">zwischen</p>`;
    }
    // nachfolgend genannt
    else if (trimmedLine.includes('nachfolgend') && trimmedLine.includes('genannt')) {
      htmlContent += `<p class="party-designation">${trimmedLine}</p>`;
    }
    // und (zwischen Parteien)
    else if (trimmedLine === 'und') {
      htmlContent += `<p class="and-clause">und</p>`;
    }
    // Unterabschnitte (1), (2), etc.
    else if (trimmedLine.match(/^\(\d+\)/)) {
      htmlContent += `<div class="subsection">${trimmedLine}</div>`;
    }
    // Unterpunkte a), b), etc.
    else if (trimmedLine.match(/^[a-z]\)/)) {
      htmlContent += `<div class="subpoint">${trimmedLine}</div>`;
    }
    // Unterschriftszeilen
    else if (trimmedLine.includes('_____')) {
      if (!inSignatureSection) {
        htmlContent += '<div class="signature-section">';
        inSignatureSection = true;
      }
      htmlContent += `<div class="signature-line">${trimmedLine.replace(/_+/g, '<span class="line"></span>')}</div>`;
    }
    // Normaler Text
    else if (trimmedLine) {
      htmlContent += `<p class="contract-text">${trimmedLine}</p>`;
    }
  }
  
  if (currentSection) {
    htmlContent += '</div>';
  }
  if (inSignatureSection) {
    htmlContent += '</div>';
  }

  // 🎨 BOMBASTISCHES HTML-Dokument mit PREMIUM-Styling
  const fullHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Professioneller Vertrag - ${contractType || 'Contract'}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 20mm 20mm;
      
      @top-center {
        content: "${companyProfile?.companyName || 'Professional Contract'}";
        font-size: 9pt;
        color: #666;
        padding-bottom: 5pt;
        border-bottom: 0.5pt solid #e0e0e0;
      }
      
      @bottom-center {
        content: "Seite " counter(page) " von " counter(pages);
        font-size: 9pt;
        color: #666;
        padding-top: 5pt;
        border-top: 0.5pt solid #e0e0e0;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.7;
      color: #1a1a1a;
      background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
      padding: 0;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* 🎨 BOMBASTISCHER HEADER MIT PREMIUM-DESIGN */
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%);
      color: white;
      padding: 25px 30px;
      margin: -20px -20px 40px -20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 8px 32px rgba(30, 58, 138, 0.3);
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23pattern)"/></svg>');
      opacity: 0.1;
    }
    
    .company-info {
      flex: 1;
      position: relative;
      z-index: 2;
    }
    
    .company-name {
      font-size: 22pt;
      font-weight: 800;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      letter-spacing: 1px;
    }
    
    .company-details {
      font-size: 11pt;
      opacity: 0.95;
      line-height: 1.5;
      font-weight: 300;
    }
    
    .company-details div {
      margin-bottom: 3px;
    }
    
    .logo-container {
      width: 180px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-left: 30px;
      position: relative;
      z-index: 2;
    }
    
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(255,255,255,0.3));
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      padding: 10px;
      backdrop-filter: blur(10px);
    }
    
    /* 🎨 BOMBASTISCHER VERTRAGSTITEL */
    .contract-title {
      font-size: 26pt;
      font-weight: 900;
      text-align: center;
      margin: 40px 0;
      background: linear-gradient(135deg, #1e3a8a, #3b82f6, #6366f1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-transform: uppercase;
      letter-spacing: 4px;
      position: relative;
      padding: 20px 0;
    }
    
    .contract-title::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      height: 4px;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      border-radius: 2px;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    }
    
    /* 🎨 PREMIUM PARTEIEN-STYLING */
    .between-clause {
      text-align: center;
      margin: 40px 0 30px 0;
      font-style: italic;
      font-size: 13pt;
      color: #4f46e5;
      font-weight: 600;
      text-transform: lowercase;
      letter-spacing: 1px;
    }
    
    .and-clause {
      text-align: center;
      margin: 30px 0;
      font-style: italic;
      color: #4f46e5;
      font-weight: 600;
      font-size: 13pt;
      letter-spacing: 1px;
    }
    
    .party-designation {
      text-align: center;
      font-style: italic;
      margin: 10px 0 30px 0;
      color: #6b7280;
      font-weight: 500;
      font-size: 10pt;
    }
    
    .registry-number {
      text-align: center;
      font-size: 16pt;
      font-weight: 800;
      margin: 30px 0;
      padding: 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      color: #1e40af;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.1);
    }
    
    /* 🎨 ELEGANTE PRÄAMBEL */
    .preamble-title {
      font-size: 16pt;
      font-weight: 700;
      margin: 40px 0 20px 0;
      text-align: center;
      letter-spacing: 2px;
      color: #374151;
      text-transform: uppercase;
      position: relative;
    }
    
    .preamble-title::before,
    .preamble-title::after {
      content: '◆';
      color: #3b82f6;
      font-size: 12pt;
      margin: 0 20px;
    }
    
    /* 🎨 PREMIUM PARAGRAPHEN-DESIGN */
    .section {
      margin-bottom: 35px;
      page-break-inside: avoid;
      position: relative;
    }
    
    .paragraph-title {
      font-size: 16pt;
      font-weight: 800;
      margin: 40px 0 20px 0;
      color: #1e40af;
      page-break-after: avoid;
      padding: 15px 20px;
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-left: 6px solid #3b82f6;
      border-radius: 0 8px 8px 0;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
      position: relative;
    }
    
    .paragraph-title::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 10px solid transparent;
      border-bottom: 10px solid transparent;
      border-left: 10px solid #3b82f6;
    }
    
    /* 🎨 PREMIUM TEXTFORMATIERUNG */
    .contract-text {
      margin-bottom: 15px;
      text-align: justify;
      text-justify: inter-word;
      hyphens: auto;
      line-height: 1.8;
      font-weight: 400;
      color: #374151;
      padding: 5px 0;
    }
    
    .subsection {
      margin: 18px 0 12px 30px;
      text-align: justify;
      font-weight: 600;
      color: #1f2937;
      padding: 8px 0;
      position: relative;
    }
    
    .subsection::before {
      content: '';
      position: absolute;
      left: -15px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 4px;
      background: #3b82f6;
      border-radius: 50%;
    }
    
    .subpoint {
      margin: 10px 0 10px 50px;
      text-align: justify;
      color: #4b5563;
      position: relative;
      padding-left: 15px;
    }
    
    .subpoint::before {
      content: '▸';
      position: absolute;
      left: 0;
      color: #6366f1;
      font-weight: bold;
    }
    
    /* 🎨 PREMIUM UNTERSCHRIFTEN-BEREICH */
    .signature-section {
      margin-top: 100px;
      padding: 30px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      border: 2px solid #e2e8f0;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      page-break-inside: avoid;
    }
    
    .signature-line {
      margin: 60px 0 15px 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      position: relative;
    }
    
    .signature-line .line {
      display: inline-block;
      width: 280px;
      border-bottom: 3px solid #3b82f6;
      margin: 0 30px;
      position: relative;
    }
    
    .signature-line .line::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 50px;
      height: 2px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 1px;
    }
    
    /* 🎨 PREMIUM SEITENUMBRUCH-KONTROLLE */
    h1, h2, h3 {
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    
    p {
      orphans: 3;
      widows: 3;
    }
    
    .section {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* 🎨 BOMBASTISCHE ANIMATIONS & EFFECTS */
    .contract-content {
      animation: fadeInUp 0.8s ease-out;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* 🎨 PREMIUM PRINT-OPTIMIERUNG */
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      body {
        padding: 0;
        background: white !important;
      }
      
      .header {
        position: relative;
        margin-bottom: 40px;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .contract-content {
        margin-top: 0;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .paragraph-title {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .signature-section {
        page-break-inside: avoid;
        margin-top: 50px;
      }
    }
    
    /* 🎨 RESPONSIVE DESIGN für Preview */
    @media screen and (max-width: 768px) {
      .header {
        flex-direction: column;
        text-align: center;
      }
      
      .logo-container {
        margin: 20px 0 0 0;
        width: 100%;
        justify-content: center;
      }
      
      .contract-title {
        font-size: 20pt;
        letter-spacing: 2px;
      }
      
      .paragraph-title {
        font-size: 14pt;
        padding: 12px 15px;
      }
    }
  </style>
</head>
<body>
  ${companyProfile ? `
  <div class="header">
    <div class="company-info">
      <div class="company-name">${companyProfile.companyName || 'Firmenname'}${companyProfile.legalForm ? ` ${companyProfile.legalForm}` : ''}</div>
      <div class="company-details">
        ${companyProfile.street ? `<div>${companyProfile.street}</div>` : ''}
        ${companyProfile.postalCode || companyProfile.city ? `<div>${companyProfile.postalCode || ''} ${companyProfile.city || ''}</div>` : ''}
        ${companyProfile.contactEmail ? `<div>E-Mail: ${companyProfile.contactEmail}</div>` : ''}
        ${companyProfile.contactPhone ? `<div>Tel: ${companyProfile.contactPhone}</div>` : ''}
        ${companyProfile.vatId ? `<div>USt-IdNr.: ${companyProfile.vatId}</div>` : ''}
        ${companyProfile.tradeRegister ? `<div>${companyProfile.tradeRegister}</div>` : ''}
      </div>
    </div>
    ${logoBase64 ? `
    <div class="logo-container">
      <img src="${logoBase64}" alt="Firmenlogo" />
    </div>
    ` : ''}
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
    console.log("📄 Generate.js: MongoDB verbunden!");
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
    if (db && useCompanyProfile) {
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

    // 🎨 VERBESSERTE HTML-Formatierung für professionelle Darstellung
    let formattedHTML = "";
    if (useCompanyProfile && companyProfile) {
      formattedHTML = await formatContractToHTML(contractText, companyProfile, type);
      console.log("✅ Professionelle HTML-Formatierung mit Logo erstellt");
      
      // Debug-Ausgabe
      console.log("📊 HTML-Generierung Debug:", {
        hasCompanyProfile: !!companyProfile,
        hasLogo: !!companyProfile?.logoUrl,
        logoUrl: companyProfile?.logoUrl?.substring(0, 50) + "...",
        htmlLength: formattedHTML.length,
        containsLogo: formattedHTML.includes('img src='),
        containsHeader: formattedHTML.includes('class="header"')
      });
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
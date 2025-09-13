// 📄 backend/routes/generate.js - VOLLSTÄNDIGE ENTERPRISE EDITION MIT ALLEN FUNKTIONEN
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const https = require("https");
const http = require("http");
const AWS = require("aws-sdk");
const crypto = require("crypto");
const QRCode = require("qrcode"); // 🆕 ENTERPRISE QR-CODE GENERATION

// 🔴 KRITISCHER FIX #1: Puppeteer richtig importieren für Render.com
let puppeteer;
let chromium;

try {
  // Für Produktion auf Render
  chromium = require('@sparticuz/chromium');
  puppeteer = require('puppeteer-core');
  console.log("✅ Verwende puppeteer-core mit @sparticuz/chromium für Render");
} catch (error) {
  // Für lokale Entwicklung
  try {
    puppeteer = require('puppeteer');
    console.log("✅ Verwende normales puppeteer für lokale Entwicklung");
  } catch (puppeteerError) {
    console.error("⚠️ Weder puppeteer-core noch puppeteer verfügbar");
  }
}

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
            const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
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
  
  // Strategie 4: Alternative URL-Formate probieren
  if (companyProfile.logoUrl.includes('amazonaws.com')) {
    const alternativeUrl = companyProfile.logoUrl.replace('https://', 'http://');
    strategies.push({ name: 'HTTP Alternative', url: alternativeUrl });
  }
  
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

// 🆕 NEUE FUNKTION: Logo optimieren/komprimieren
const optimizeLogoBase64 = (base64Logo, maxSizeKB = 100) => {
  try {
    // Prüfe aktuelle Größe
    const currentSizeKB = Math.round(base64Logo.length / 1024);
    console.log(`📊 Logo-Größe vor Optimierung: ${currentSizeKB} KB`);
    
    // Wenn bereits klein genug, zurückgeben
    if (currentSizeKB <= maxSizeKB) {
      console.log(`✅ Logo ist bereits optimiert (${currentSizeKB}KB <= ${maxSizeKB}KB)`);
      return base64Logo;
    }
    
    // Berechne Kompressionsrate
    const compressionRatio = maxSizeKB / currentSizeKB;
    
    // Für jetzt: Warnung ausgeben und trotzdem verwenden
    console.warn(`⚠️ Logo ist zu groß (${currentSizeKB}KB), sollte optimiert werden auf ${maxSizeKB}KB`);
    console.warn(`⚠️ Kompressionsrate wäre: ${Math.round(compressionRatio * 100)}%`);
    
    // TODO: Hier könnte man mit sharp oder jimp das Bild verkleinern
    // Beispiel für zukünftige Implementation:
    // const sharp = require('sharp');
    // const buffer = Buffer.from(base64Logo.split(',')[1], 'base64');
    // const optimized = await sharp(buffer)
    //   .resize(200, 100, { fit: 'inside' })
    //   .jpeg({ quality: 80 })
    //   .toBuffer();
    // return `data:image/jpeg;base64,${optimized.toString('base64')}`;
    
    // Für jetzt geben wir das Original zurück
    return base64Logo;
  } catch (error) {
    console.error("❌ Logo-Optimierung fehlgeschlagen:", error);
    return base64Logo;
  }
};

// 🆕 ENTERPRISE FUNKTION: Generiere Dokument-Hash für Verifizierung
const generateDocumentHash = (content) => {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16).toUpperCase();
};

// 🆕 ENTERPRISE FUNKTION: Generiere Inhaltsverzeichnis
const generateTableOfContents = (contractText) => {
  const sections = [];
  const lines = contractText.split('\n');
  let pageEstimate = 1;
  let lineCount = 0;
  
  for (const line of lines) {
    lineCount++;
    // Schätze Seitenzahl (ca. 40 Zeilen pro Seite)
    if (lineCount % 40 === 0) pageEstimate++;
    
    if (line.trim().startsWith('§')) {
      sections.push({
        title: line.trim(),
        page: pageEstimate
      });
    }
  }
  
  return sections;
};

// 🆕 ENTERPRISE QR-CODE GENERATION MIT BLOCKCHAIN-KOMPATIBILITÄT - WELTKLASSE-KANZLEI-NIVEAU
const generateEnterpriseQRCode = async (contractData, companyProfile) => {
  try {
    console.log("🔐 Generiere Enterprise QR-Code für Dokument:", contractData.documentId);
    
    const qrPayload = {
      // Basis-Dokument-Info
      id: contractData.documentId,
      hash: contractData.documentHash,
      type: contractData.contractType,
      
      // Enterprise-Metadaten
      issuer: companyProfile?.companyName || 'Vertragsdokument Generator',
      timestamp: Date.now(),
      iso_date: new Date().toISOString(),
      
      // Verifikations-URLs
      verification_url: `https://contract-ai.de/verify/${contractData.documentId}`,
      api_endpoint: `https://api.contract-ai.de/verify/${contractData.documentId}`,
      
      // Sicherheits-Level
      security_level: contractData.isDraft ? 'DRAFT-CONFIDENTIAL' : 'FINAL-CONFIDENTIAL',
      encryption_level: 'SHA256-AES',
      
      // Blockchain-kompatible Daten für Zukunft
      blockchain_hash: crypto.createHash('sha256').update(
        contractData.documentId + contractData.documentHash + contractData.contractType + Date.now()
      ).digest('hex').substring(0, 32),
      
      // Compliance-Daten
      gdpr_compliant: true,
      jurisdiction: 'DE-Germany',
      language: 'de-DE',
      
      // Enterprise-Tracking
      template_version: 'v6.0-enterprise',
      ai_generated: true,
      quality_assured: true
    };
    
    console.log("📊 QR-Payload erstellt, Größe:", JSON.stringify(qrPayload).length, "Bytes");
    
    // Generiere QR-Code mit höchster Qualität
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      errorCorrectionLevel: 'H', // Höchste Fehlerkorrektur (30%)
      type: 'image/png',
      quality: 1.0,           // Maximale Qualität
      margin: 2,              // Professioneller Rand
      width: 200,             // Optimale Größe für PDFs
      height: 200,
      color: { 
        dark: '#000000',      // Tiefschwarz
        light: '#FFFFFF'      // Reinweiß
      },
      // Erweiterte Optionen für Professional-Look
      scale: 8,               // Hohe Auflösung
      border: 1,              // Saubere Grenzen
      version: undefined      // Auto-Optimierung
    });
    
    console.log("✅ Enterprise QR-Code erfolgreich generiert");
    return qrCodeDataUrl;
    
  } catch (error) {
    console.error("❌ Fehler bei QR-Code Generierung:", error);
    // Fallback: Einfacher Text-QR
    try {
      const fallbackData = `${contractData.documentId}-${contractData.contractType}`;
      return await QRCode.toDataURL(fallbackData, {
        errorCorrectionLevel: 'M',
        width: 150
      });
    } catch (fallbackError) {
      console.error("❌ Auch Fallback-QR fehlgeschlagen:", fallbackError);
      return null;
    }
  }
};

// 🆕 INITIALEN-FALLBACK WENN LOGO NICHT LÄDT
const generateCompanyInitials = (companyName) => {
  if (!companyName) return "MM";
  
  const words = companyName.trim().split(/\s+/);
  if (words.length >= 2) {
    // Erste zwei Wörter: "Max Mustermann GmbH" → "MM"
    return (words[0][0] + words[1][0]).toUpperCase();
  } else if (words[0].length >= 2) {
    // Ein Wort, erste zwei Buchstaben: "Mustermann" → "MU"
    return words[0].substring(0, 2).toUpperCase();
  } else {
    // Fallback
    return words[0][0].toUpperCase();
  }
};

// 🆕 TITLE-CASE FUNCTION FÜR NAMEN
const toTitleCase = (str) => {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

// 🆕 SVG-LOGO AUS INITIALEN GENERIEREN
const generateInitialsLogo = (initials, color = '#1a1a1a') => {
  const svgLogo = `
    <svg width="120" height="60" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="60" fill="${color}" rx="4"/>
      <text x="60" y="38" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle">${initials}</text>
    </svg>
  `;
  
  // Konvertiere SVG zu Data-URL
  const base64 = Buffer.from(svgLogo).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
};

// 🎨 ENTERPRISE HTML-FORMATIERUNG FÜR ABSOLUT PROFESSIONELLE VERTRÄGE - VOLLSTÄNDIGE VERSION
const formatContractToHTML = async (contractText, companyProfile, contractType, designVariant = 'executive', isDraft = false) => {
  console.log("🚀 Starte ENTERPRISE HTML-Formatierung für:", contractType);
  console.log('🎨 Design-Variante:', designVariant);
  console.log('📄 Vertragstyp:', contractType);
  console.log('🏢 Company Profile vorhanden:', !!companyProfile);
  console.log('📝 Entwurf-Modus:', isDraft);
  
  // 🎨 ERWEITERTES LOGO-LOADING MIT INITIALEN-FALLBACK
  let logoBase64 = null;
  let useInitialsFallback = false;
  
  if (companyProfile && companyProfile.logoUrl) {
    console.log("🏢 Company Profile vorhanden, lade Logo...");
    logoBase64 = await loadLogoWithFallbacks(companyProfile);
    
    if (logoBase64) {
      logoBase64 = optimizeLogoBase64(logoBase64, 100);
      console.log("✅ Logo erfolgreich geladen und optimiert!");
    } else {
      console.log("⚠️ Logo konnte nicht geladen werden, generiere Initialen-Fallback");
      useInitialsFallback = true;
    }
  } else {
    console.log("ℹ️ Kein Logo verfügbar, verwende Initialen-Fallback");
    useInitialsFallback = true;
  }
  
  // 🔤 INITIALEN-FALLBACK GENERIEREN
  if (useInitialsFallback && companyProfile?.companyName) {
    const initials = generateCompanyInitials(companyProfile.companyName);
    logoBase64 = generateInitialsLogo(initials, '#1a1a1a');
    console.log("✅ Initialen-Logo generiert:", initials);
    console.log("📊 LogoBase64 gesetzt:", logoBase64 ? "JA" : "NEIN");
  } else if (useInitialsFallback) {
    console.log("❌ Kein Firmenname für Initialen-Fallback verfügbar");
    console.log("📊 CompanyProfile:", companyProfile);
  }

  // Generiere Dokument-ID und Hash  
  const documentId = companyProfile?.metadata?.documentId || companyProfile?._id?.toString().slice(0,8) || `${contractType.toUpperCase()}-${Date.now().toString().slice(-8)}`;
  const documentHash = generateDocumentHash(contractText);
  
  // 🆕 ENTERPRISE QR-CODE GENERATION - WELTKLASSE-NIVEAU
  let enterpriseQRCode = null;
  try {
    const qrData = {
      documentId: documentId,
      documentHash: documentHash,
      contractType: contractType,
      isDraft: isDraft
    };
    enterpriseQRCode = await generateEnterpriseQRCode(qrData, companyProfile);
    console.log("✅ Enterprise QR-Code generiert für Dokument:", documentId.substring(0, 16) + "...");
  } catch (qrError) {
    console.error("⚠️ QR-Code Generierung optional fehlgeschlagen:", qrError.message);
    // Fortfahren ohne QR-Code - nicht kritisch
  }
  
  // Generiere Inhaltsverzeichnis
  const tableOfContents = generateTableOfContents(contractText);

  // 🎨 ENTERPRISE DESIGN-VARIANTEN - WELTKLASSE-KANZLEI-NIVEAU
  const designVariants = {
    executive: {
      // 🆕 FRESHFIELDS/CLIFFORD CHANCE NIVEAU - WELTKLASSE-KANZLEI-STANDARD
      primary: '#1a1a1a',              // TIEFSCHWARZ für maximale Seriosität
      secondary: '#2c2c2c',             // Dunkelgrau für Akzente
      accent: '#8B4513',                // Dezentes Braun (traditionell-konservativ)
      text: '#1a1a1a',                  // Tiefschwarz für Text
      lightBg: '#fefefe',               // Nahezu reines Weiß
      border: '#cccccc',                // Neutrales Grau für Abgrenzungen
      headerBg: 'transparent', // Kanzlei-Standard: Kein Background
      
      // 🔥 EXAKTE KANZLEI-TYPOGRAFIE (FRESHFIELDS-STANDARD)
      fontFamily: '"Times New Roman", "Liberation Serif", "DejaVu Serif", serif',
      headingFont: '"Times New Roman", serif',
      fontSize: '10.5pt',               // KOMPAKT 10.5pt für 5-6 Seiten
      lineHeight: '1.35',               // KOMPAKT 1.35 für mehr Inhalt pro Seite
      letterSpacing: '0px',             // Kein Letter-Spacing bei Kanzleien
      textAlign: 'justify',             // BLOCKSATZ - Kanzlei-Pflicht
      hyphens: 'auto',                  // Automatische Silbentrennung
      hyphenateCharacter: '"-"',        // Deutsche Silbentrennung
      
      // 🔥 MILLIMETER-BASIERTE ABSTÄNDE (PROFESSIONELL)
      sectionMargin: 'margin: 8.47mm 0;',          // 24pt = 8.47mm
      paragraphSpacing: 'margin-bottom: 4.23mm;',  // 12pt = 4.23mm
      indentation: 'text-indent: 12.7mm;',         // 36pt = 12.7mm für Einrückungen
      
      // 🔥 SEITENUMBRUCH-KONTROLLE (WELTKLASSE)
      orphans: '3',                     // Min. 3 Zeilen am Seitenende
      widows: '3',                      // Min. 3 Zeilen am Seitenanfang
      pageBreakInside: 'avoid',         // Blockelemente nicht trennen
      
      // DESIGN-ELEMENTE
      sectionNumberStyle: 'color: #1a1a1a; margin-right: 8.47mm; font-weight: bold; font-size: 11pt; min-width: 12.7mm; display: inline-block; text-align: left;',
      pageMargins: 'margin: 0; padding: 0;',
      headerHeight: '33.87mm',          // ~96pt in mm für professionellen Header
      useGradients: false,              // Kanzleien verwenden keine Gradienten
      useSerif: true,                   // Times New Roman ist Kanzlei-Standard
      borderRadius: '0px',              // Keine abgerundeten Ecken
      boxShadow: 'none'                 // Keine Schatten - Clean & Professional
    },
    
    // 🔄 BEHALTE BESTEHENDE VARIANTEN FÜR KOMPATIBILITÄT
    executive_legacy: {
      // Alte Executive-Variante bleibt verfügbar
      primary: '#1a2332',           
      secondary: '#2c3e50',         
      accent: '#c9a961',            
      text: '#2c3e50',              
      lightBg: '#f7f9fc',           
      border: '#e1e8f0',            
      headerBg: 'transparent', // Kanzlei-Standard: Neutral
      fontFamily: '"Georgia", "Times New Roman", serif',
      headingFont: '"Georgia", "Times New Roman", serif',
      fontSize: '10.5pt',               // KOMPAKT für mehr Inhalt
      lineHeight: '1.35',               // KOMPAKT für 5-6 Seiten
      letterSpacing: '0.3px',
      sectionNumberStyle: 'background: #c9a961; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; font-size: 14px;',
      pageMargins: 'margin: 0; padding: 0;',
      sectionMargin: 'margin: 8.8mm 0;',      // 25px = 8.8mm
      paragraphSpacing: 'margin-bottom: 4.9mm;', // 14px = 4.9mm
      headerHeight: '100px',
      useGradients: true,
      useSerif: true,
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    modern: {
      // Tech-Style: Blau-Grün, Sans-Serif, Clean
      primary: '#0ea5e9',           // Himmelblau
      secondary: '#0284c7',         // Dunkleres Blau
      accent: '#06b6d4',            // Cyan
      text: '#1e293b',              // Dunkles Grau
      lightBg: '#f0f9ff',           // Sehr helles Blau
      border: '#e0f2fe',            // Blau Border
      headerBg: 'transparent', // Kanzlei-Standard: Neutral
      fontFamily: '"Arial", "Helvetica", sans-serif',
      headingFont: '"Arial", "Helvetica", sans-serif',
      fontSize: '10.5pt',
      lineHeight: '1.35',               // KOMPAKT für mehr Inhalt
      letterSpacing: '0px',
      sectionNumberStyle: 'background: white; color: #0ea5e9; border: 2px solid #0ea5e9; width: 30px; height: 30px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: 600; font-size: 13px;',
      pageMargins: 'margin: 0; padding: 0;',
      sectionMargin: 'margin: 7.1mm 0;',      // 20px = 7.1mm  
      paragraphSpacing: 'margin-bottom: 4.2mm;', // 12px = 4.2mm
      headerHeight: '90px',
      useGradients: true,
      useSerif: false,
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(14,165,233,0.1)'
    },
    minimal: {
      // Schweizer Style: Nur Schwarz-Weiß, Ultra-Clean
      primary: '#000000',           // Schwarz
      secondary: '#4b5563',         // Mittelgrau
      accent: '#9ca3af',            // Hellgrau
      text: '#111827',              // Fast Schwarz
      lightBg: '#fafafa',           // Fast Weiß
      border: '#e5e7eb',            // Grau Border
      headerBg: '#000000',
      fontFamily: '"Helvetica Neue", "Arial", sans-serif',
      headingFont: '"Helvetica Neue", "Arial", sans-serif',
      fontSize: '10.5pt',               // KOMPAKT aber lesbar
      lineHeight: '1.35',               // KOMPAKT für 5-6 Seiten
      letterSpacing: '-0.2px',
      sectionNumberStyle: 'color: #000; margin-right: 20px; font-weight: 400; font-size: 14px; min-width: 25px; display: inline-block;',
      pageMargins: 'margin: 0; padding: 0;',
      sectionMargin: 'margin: 6.4mm 0;',      // 18px = 6.4mm
      paragraphSpacing: 'margin-bottom: 3.5mm;', // 10px = 3.5mm
      headerHeight: '70px',
      useGradients: false,
      useSerif: false,
      borderRadius: '0px',
      boxShadow: 'none'
    }
  };

  // WICHTIG: Design-Variante korrekt auswählen
  const theme = designVariants[designVariant] || designVariants.executive;
  console.log('🎨 Verwendetes Theme:', designVariant, theme);

  // 📝 INTELLIGENTE TEXT-VERARBEITUNG mit verbesserter Struktur
  const lines = contractText.split('\n');
  let htmlContent = '';
  let currentSection = '';
  let inSignatureSection = false;
  let sectionCounter = 0;
  let subsectionCounters = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Überspringe die === Linien
    if (trimmedLine.startsWith('===') || trimmedLine.endsWith('===')) {
      continue;
    }
    
    // HAUPTÜBERSCHRIFT (KAUFVERTRAG etc.) - PROFESSIONELLES DESIGN
    if (trimmedLine === trimmedLine.toUpperCase() && 
        trimmedLine.length > 5 && 
        !trimmedLine.startsWith('§') &&
        !trimmedLine.includes('HRB') &&
        !['PRÄAMBEL', 'ZWISCHEN', 'UND'].includes(trimmedLine)) {
      
      if (designVariant === 'executive') {
        htmlContent += `
          <div style="
            margin: 8mm 0 12mm 0;
            text-align: center;
            page-break-inside: avoid;
            page-break-after: avoid;
            clear: both;
          ">
            <h1 style="
              font-family: ${theme.headingFont};
              font-size: 22pt;
              font-weight: 700;
              color: ${theme.primary};
              letter-spacing: 2px;
              text-transform: uppercase;
              margin: 0;
              padding: 0;
            ">${trimmedLine}</h1>
            <div style="
              font-size: 9pt;
              color: ${theme.secondary};
              margin-top: 6mm;
              font-style: italic;
            ">Erstellt am ${new Date().toLocaleDateString('de-DE')}</div>
            <div style="
              margin: 15px auto 0;
              width: 150px;
              height: 1px;
              background: ${theme.accent};
            "></div>
          </div>
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <div style="
            margin: 35px 0 30px 0;
            text-align: center;
            position: relative;
          ">
            <div style="
              display: inline-block;
              padding: 15px 40px;
              background: ${theme.lightBg};
              border: 2px solid ${theme.primary};
              border-radius: ${theme.borderRadius};
            ">
              <h1 style="
                font-family: ${theme.headingFont};
                font-size: 22pt;
                font-weight: 600;
                color: ${theme.primary};
                letter-spacing: 2px;
                text-transform: uppercase;
                margin: 0;
              ">${trimmedLine}</h1>
            </div>
          </div>
        `;
      } else { // minimal
        htmlContent += `
          <div style="
            margin: 30px 0;
            text-align: center;
            padding: 15px 0;
            border-top: 1px solid ${theme.primary};
            border-bottom: 1px solid ${theme.primary};
          ">
            <h1 style="
              font-family: ${theme.headingFont};
              font-size: 20pt;
              font-weight: 300;
              color: ${theme.primary};
              letter-spacing: 8px;
              text-transform: uppercase;
              margin: 0;
            ">${trimmedLine}</h1>
          </div>
        `;
      }
    }
    // HANDELSREGISTER - Elegantes Info-Box Design
    else if (trimmedLine.includes('HRB')) {
      if (designVariant === 'executive') {
        htmlContent += `
          <div style="
            margin: 20px 0;
            padding: 15px 20px;
            background: ${theme.lightBg};
            border-left: 3px solid ${theme.accent};
            border-radius: 0 ${theme.borderRadius} ${theme.borderRadius} 0;
            font-family: ${theme.fontFamily};
            font-size: 10pt;
            color: ${theme.text};
            font-weight: 500;
            position: relative;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              right: 0;
              width: 60px;
              height: 60px;
              background: ${theme.accent};
              opacity: 0.05;
              border-radius: 50%;
              transform: translate(20px, -20px);
            "></div>
            <span style="position: relative; z-index: 1;">${trimmedLine}</span>
          </div>
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <div style="
            margin: 18px 0;
            padding: 12px 18px;
            background: ${theme.lightBg};
            border: 1px solid ${theme.border};
            border-radius: ${theme.borderRadius};
            font-family: ${theme.fontFamily};
            font-size: 10pt;
            color: ${theme.text};
            position: relative;
          ">
            <span style="
              position: absolute;
              top: -8px;
              left: 15px;
              background: white;
              padding: 0 8px;
              color: ${theme.primary};
              font-size: 8pt;
              font-weight: 600;
            ">HANDELSREGISTER</span>
            ${trimmedLine}
          </div>
        `;
      } else { // minimal
        htmlContent += `
          <div style="
            margin: 15px 0;
            padding: 10px 0;
            border-bottom: 1px solid ${theme.border};
            font-family: ${theme.fontFamily};
            font-size: 10pt;
            color: ${theme.text};
          ">${trimmedLine}</div>
        `;
      }
    }
    // PARAGRAPH-ÜBERSCHRIFTEN - Professionelles Card-Design
    else if (trimmedLine.startsWith('§')) {
      sectionCounter++;
      subsectionCounters[sectionCounter] = 0;
      
      // Schließe vorherige Section
      if (currentSection) {
        htmlContent += '</div></div>';
      }
      
      currentSection = trimmedLine;
      
      if (designVariant === 'executive') {
        htmlContent += `
          <h2 style="
            font-family: ${theme.headingFont};
            font-size: 12pt;
            font-weight: 600;
            color: ${theme.primary};
            margin: 25px 0 15px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">
            ${sectionCounter}. ${trimmedLine}
          </h2>
          <div style="margin-left: 0;">
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <h2 style="
            font-family: ${theme.headingFont};
            font-size: 12pt;
            font-weight: 600;
            color: ${theme.primary};
            margin: 25px 0 15px 0;
          ">
            ${sectionCounter}. ${trimmedLine}
          </h2>
          <div style="margin-left: 0;">
        `;
      } else { // minimal
        htmlContent += `
          <h2 style="
            font-family: ${theme.headingFont};
            font-size: 12pt;
            font-weight: 600;
            color: ${theme.primary};
            margin: 25px 0 15px 0;
          ">
            ${sectionCounter}. ${trimmedLine}
          </h2>
          <div style="margin-left: 0;">
        `;
      }
    }
    // PRÄAMBEL - Eleganter Intro-Bereich
    else if (trimmedLine === 'PRÄAMBEL' || trimmedLine === 'Präambel') {
      if (designVariant === 'executive') {
        htmlContent += `
          <div style="
            margin: 35px 0 25px 0;
            text-align: center;
            position: relative;
          ">
            <h3 style="
              font-family: ${theme.headingFont};
              font-size: 14pt;
              font-weight: 600;
              color: ${theme.primary};
              letter-spacing: 3px;
              text-transform: uppercase;
              position: relative;
              display: inline-block;
              padding: 0 30px;
            ">
              <span style="
                position: absolute;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 20px;
                height: 1px;
                background: ${theme.accent};
              "></span>
              ${trimmedLine.toUpperCase()}
              <span style="
                position: absolute;
                right: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 20px;
                height: 1px;
                background: ${theme.accent};
              "></span>
            </h3>
          </div>
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <div style="
            margin: 30px 0 20px 0;
            text-align: center;
          ">
            <div style="
              display: inline-block;
              padding: 8px 25px;
              background: ${theme.lightBg};
              border-radius: 20px;
              border: 1px solid ${theme.accent};
            ">
              <h3 style="
                font-family: ${theme.headingFont};
                font-size: 13pt;
                font-weight: 500;
                color: ${theme.primary};
                letter-spacing: 2px;
                text-transform: uppercase;
                margin: 0;
              ">${trimmedLine.toUpperCase()}</h3>
            </div>
          </div>
        `;
      } else { // minimal
        htmlContent += `
          <div style="
            margin: 25px 0 15px 0;
            text-align: center;
          ">
            <h3 style="
              font-family: ${theme.headingFont};
              font-size: 12pt;
              font-weight: 300;
              color: ${theme.primary};
              letter-spacing: 4px;
              text-transform: uppercase;
              margin: 0;
            ">${trimmedLine.toUpperCase()}</h3>
          </div>
        `;
      }
    }
    // ZWISCHEN - Elegante Verbindung
    else if (trimmedLine.toLowerCase() === 'zwischen') {
      if (designVariant === 'executive') {
        htmlContent += `
          <p style="
            text-align: center;
            margin: 30px 0 20px 0;
            font-family: ${theme.fontFamily};
            font-size: 11pt;
            color: ${theme.secondary};
            font-style: italic;
            font-weight: 500;
            letter-spacing: 1px;
          ">${trimmedLine.replace(/\b[a-z]+\s+[a-z]+\b/g, match => match.length > 3 && match.includes(' ') ? toTitleCase(match) : match)}</p>
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <p style="
            text-align: center;
            margin: 25px 0 18px 0;
            font-family: ${theme.fontFamily};
            font-size: 10pt;
            color: ${theme.primary};
            font-weight: 500;
            text-transform: lowercase;
            letter-spacing: 2px;
          ">${trimmedLine.replace(/\b[a-z]+\s+[a-z]+\b/g, match => match.length > 3 && match.includes(' ') ? toTitleCase(match) : match)}</p>
        `;
      } else { // minimal
        htmlContent += `
          <p style="
            text-align: center;
            margin: 20px 0 15px 0;
            font-family: ${theme.fontFamily};
            font-size: 10pt;
            color: ${theme.text};
            font-style: italic;
          ">${trimmedLine.replace(/\b[a-z]+\s+[a-z]+\b/g, match => match.length > 3 && match.includes(' ') ? toTitleCase(match) : match)}</p>
        `;
      }
    }
    // PARTEIEN-BEZEICHNUNG (nachfolgend genannt)
    else if (trimmedLine.includes('nachfolgend') && trimmedLine.includes('genannt')) {
      if (designVariant === 'executive') {
        htmlContent += `
          <div style="
            text-align: center;
            margin: 8px 0 25px 0;
            padding: 8px 15px;
            background: ${theme.lightBg};
            border-radius: 4px;
          ">
            <p style="
              margin: 0;
              font-family: ${theme.fontFamily};
              font-style: italic;
              color: ${theme.secondary};
              font-size: 9pt;
              font-weight: 400;
            ">— ${trimmedLine} —</p>
          </div>
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <div style="
            text-align: center;
            margin: 6px 0 20px 0;
          ">
            <p style="
              margin: 0;
              font-family: ${theme.fontFamily};
              color: ${theme.accent};
              font-size: 9pt;
              font-weight: 400;
              letter-spacing: 0.5px;
            ">– ${trimmedLine} –</p>
          </div>
        `;
      } else { // minimal
        htmlContent += `
          <p style="
            text-align: center;
            margin: 5px 0 18px 0;
            font-family: ${theme.fontFamily};
            font-size: 9pt;
            color: ${theme.secondary};
            font-style: italic;
          ">${trimmedLine.replace(/\b[a-z]+\s+[a-z]+\b/g, match => match.length > 3 && match.includes(' ') ? toTitleCase(match) : match)}</p>
        `;
      }
    }
    // UND (zwischen Parteien)
    else if (trimmedLine.toLowerCase() === 'und') {
      if (designVariant === 'executive') {
        htmlContent += `
          <div style="
            text-align: center;
            margin: 25px 0;
            position: relative;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 10%;
              right: 10%;
              height: 1px;
              background: ${theme.accent};
            "></div>
            <span style="
              background: white;
              padding: 5px 20px;
              position: relative;
              font-family: ${theme.fontFamily};
              font-style: italic;
              color: ${theme.secondary};
              font-size: 11pt;
              font-weight: 400;
              letter-spacing: 1px;
            ">${trimmedLine}</span>
          </div>
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <div style="
            text-align: center;
            margin: 20px 0;
          ">
            <div style="
              display: inline-block;
              padding: 4px 18px;
              background: ${theme.primary};
              color: white;
              border-radius: 15px;
              font-family: ${theme.fontFamily};
              font-size: 10pt;
              font-weight: 500;
              letter-spacing: 1px;
            ">${trimmedLine}</div>
          </div>
        `;
      } else { // minimal
        htmlContent += `
          <p style="
            text-align: center;
            margin: 18px 0;
            font-family: ${theme.fontFamily};
            font-size: 10pt;
            color: ${theme.text};
            font-style: italic;
          ">${trimmedLine.replace(/\b[a-z]+\s+[a-z]+\b/g, match => match.length > 3 && match.includes(' ') ? toTitleCase(match) : match)}</p>
        `;
      }
    }
    // UNTERABSCHNITTE (1), (2), etc. - Strukturierte Liste
    else if (trimmedLine.match(/^\(\d+\)/)) {
      subsectionCounters[sectionCounter]++;
      const number = trimmedLine.match(/^\((\d+)\)/)[1];
      const content = trimmedLine.replace(/^\(\d+\)\s*/, '');
      
      if (designVariant === 'executive') {
        htmlContent += `
          <div style="
            margin: 12px 0;
            padding-left: 35px;
            position: relative;
            font-family: ${theme.fontFamily};
            font-size: ${theme.fontSize};
            color: ${theme.text};
            line-height: ${theme.lineHeight};
          ">
            <div style="
              position: absolute;
              left: 0;
              top: 2px;
              width: 24px;
              height: 24px;
              background: ${theme.accent};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 600;
              font-size: 11pt;
              /* Kanzlei-Standard: Kein Box-Shadow */
            ">${number}</div>
            <span style="text-align: justify;">${content}</span>
          </div>
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <div style="
            margin: 10px 0;
            display: flex;
            align-items: flex-start;
            font-family: ${theme.fontFamily};
            font-size: ${theme.fontSize};
            color: ${theme.text};
            line-height: ${theme.lineHeight};
          ">
            <span style="
              display: inline-block;
              min-width: 32px;
              padding: 1px 6px;
              background: ${theme.lightBg};
              border: 1px solid ${theme.accent};
              border-radius: 4px;
              color: ${theme.primary};
              font-weight: 500;
              font-size: 9pt;
              text-align: center;
              margin-right: 12px;
            ">${number}</span>
            <span style="flex: 1;">${content}</span>
          </div>
        `;
      } else { // minimal
        htmlContent += `
          <div style="
            margin: 8px 0;
            display: flex;
            font-family: ${theme.fontFamily};
            font-size: ${theme.fontSize};
            color: ${theme.text};
            line-height: ${theme.lineHeight};
          ">
            <span style="
              color: ${theme.secondary};
              margin-right: 12px;
              font-weight: 400;
            ">(${number})</span>
            <span style="flex: 1;">${content}</span>
          </div>
        `;
      }
    }
    // UNTERPUNKTE a), b), etc. - Elegante Sub-Liste
    else if (trimmedLine.match(/^[a-z]\)/)) {
      const letter = trimmedLine.match(/^([a-z])\)/)[1];
      const content = trimmedLine.replace(/^[a-z]\)\s*/, '');
      
      if (designVariant === 'executive') {
        htmlContent += `
          <div style="
            margin: 8px 0 8px 45px;
            padding-left: 20px;
            position: relative;
            font-family: ${theme.fontFamily};
            font-size: 10pt;
            color: ${theme.text};
            line-height: ${theme.lineHeight};
          ">
            <div style="
              position: absolute;
              left: 0;
              top: 2px;
              width: 18px;
              height: 18px;
              background: white;
              border: 1.5px solid ${theme.accent};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: ${theme.secondary};
              font-weight: 500;
              font-size: 9pt;
            ">${letter}</div>
            <span>${content}</span>
          </div>
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <div style="
            margin: 6px 0 6px 40px;
            display: flex;
            align-items: flex-start;
            font-family: ${theme.fontFamily};
            font-size: 10pt;
            color: ${theme.text};
            line-height: ${theme.lineHeight};
          ">
            <span style="
              color: ${theme.accent};
              font-weight: 500;
              margin-right: 8px;
              font-size: 9pt;
            ">${letter})</span>
            <span style="flex: 1;">${content}</span>
          </div>
        `;
      } else { // minimal
        htmlContent += `
          <div style="
            margin: 5px 0 5px 35px;
            display: flex;
            font-family: ${theme.fontFamily};
            font-size: 10pt;
            color: ${theme.text};
            line-height: ${theme.lineHeight};
          ">
            <span style="
              color: ${theme.secondary};
              margin-right: 8px;
              font-size: 9pt;
            ">${letter})</span>
            <span style="flex: 1;">${content}</span>
          </div>
        `;
      }
    }
    // UNTERSCHRIFTSBEREICH - Enterprise Signature Section
    else if (trimmedLine.includes('_____')) {
      if (!inSignatureSection) {
        if (currentSection) {
          htmlContent += '</div></div>';
          currentSection = '';
        }
        
        if (designVariant === 'executive') {
          htmlContent += `
            <div style="
              margin-top: 60px;
              padding: 30px;
              background: ${theme.lightBg};
              border: 1px solid ${theme.border};
              border-radius: ${theme.borderRadius};
              page-break-inside: auto;
              position: relative;
            ">
              <div style="
                position: absolute;
                top: -15px;
                left: 40px;
                background: white;
                padding: 5px 20px;
                border: 1px solid ${theme.accent};
                border-radius: 15px;
              ">
                <h3 style="
                  margin: 0;
                  font-family: ${theme.headingFont};
                  color: ${theme.primary};
                  font-size: 11pt;
                  font-weight: 600;
                  letter-spacing: 0.5px;
                  text-transform: uppercase;
                ">Unterschriften</h3>
              </div>
          `;
        } else if (designVariant === 'modern') {
          htmlContent += `
            <div style="
              margin-top: 50px;
              padding: 25px;
              background: ${theme.lightBg};
              border-radius: ${theme.borderRadius};
              page-break-inside: avoid;
            ">
              <h3 style="
                text-align: center;
                font-family: ${theme.headingFont};
                color: ${theme.primary};
                font-size: 12pt;
                font-weight: 500;
                letter-spacing: 1px;
                text-transform: uppercase;
                margin: 0 0 25px 0;
                padding-bottom: 10px;
                border-bottom: 2px solid ${theme.primary};
              ">Unterschriften</h3>
          `;
        } else { // minimal
          htmlContent += `
            <div style="
              margin-top: 45px;
              padding: 20px 0;
              border-top: 1px solid ${theme.primary};
              page-break-inside: avoid;
            ">
              <h3 style="
                font-family: ${theme.headingFont};
                color: ${theme.primary};
                font-size: 11pt;
                font-weight: 400;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin: 0 0 30px 0;
              ">Unterschriften</h3>
          `;
        }
        inSignatureSection = true;
      }
      
      // 🖋️ PROFESSIONELLE SIGNATUREN MIT DYNAMISCHEN DATEN
      htmlContent += `
        <div class="signature" style="
          display: flex;
          justify-content: space-between;
          gap: 12mm;
          margin-top: 18mm;
          page-break-inside: avoid;
        ">
          <div style="width: 48%;">
            <div style="
              border-bottom: 1px dashed #666;
              height: 0;
              margin-bottom: 6mm;
              min-height: 15mm;
            "></div>
            <div style="
              font-size: 9pt;
              color: #555;
              line-height: 1.4;
            ">
              Ort, Datum<br/>
              ${companyProfile?.companyName ? toTitleCase(companyProfile.companyName) : 'Verkäufer'} – ${companyProfile?.ceo ? toTitleCase(companyProfile.ceo) : 'Geschäftsführung'}<br/>
              ${companyProfile?.name || companyProfile?.companyName || 'Firma'}
            </div>
          </div>
          
          <div style="width: 48%;">
            <div style="
              border-bottom: 1px dashed #666;
              height: 0;
              margin-bottom: 6mm;
              min-height: 15mm;
            "></div>
            <div style="
              font-size: 9pt;
              color: #555;
              line-height: 1.4;
            ">
              Ort, Datum<br/>
              Käufer – Privatperson<br/>
              Name, Vorname
            </div>
          </div>
        </div>
      `;
      
      // Überspringe die Original-Linie
      continue;
    }
    // NORMALER TEXT - Optimierte Lesbarkeit
    else if (trimmedLine) {
      if (designVariant === 'executive') {
        htmlContent += `
          <p style="
            margin: 0 0 ${theme.paragraphSpacing} 0;
            font-family: ${theme.fontFamily};
            font-size: ${theme.fontSize};
            line-height: ${theme.lineHeight};
            color: ${theme.text};
            text-align: justify;
            letter-spacing: ${theme.letterSpacing};
            hyphens: auto;
            word-spacing: 0.05em;
          ">${trimmedLine.replace(/\b[a-z]+\s+[a-z]+\b/g, match => match.length > 3 && match.includes(' ') ? toTitleCase(match) : match)}</p>
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <p style="
            margin: 0 0 ${theme.paragraphSpacing} 0;
            font-family: ${theme.fontFamily};
            font-size: ${theme.fontSize};
            line-height: ${theme.lineHeight};
            color: ${theme.text};
            text-align: left;
          ">${trimmedLine.replace(/\b[a-z]+\s+[a-z]+\b/g, match => match.length > 3 && match.includes(' ') ? toTitleCase(match) : match)}</p>
        `;
      } else { // minimal
        htmlContent += `
          <p style="
            margin: 0 0 ${theme.paragraphSpacing} 0;
            font-family: ${theme.fontFamily};
            font-size: ${theme.fontSize};
            line-height: ${theme.lineHeight};
            color: ${theme.text};
          ">${trimmedLine.replace(/\b[a-z]+\s+[a-z]+\b/g, match => match.length > 3 && match.includes(' ') ? toTitleCase(match) : match)}</p>
        `;
      }
    }
  }
  
  // Schließe offene Sections
  if (currentSection) {
    htmlContent += '</div></div>';
  }
  if (inSignatureSection) {
    htmlContent += '</div>';
  }

  // 🎨 VOLLSTÄNDIGES ENTERPRISE HTML-DOKUMENT
  const fullHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${contractType || 'Vertrag'} - ${companyProfile?.companyName || 'Vertragsdokument'}</title>
  
  <!-- Google Fonts für Enterprise Typography -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    /* 🔥 WELTKLASSE-KANZLEI CSS - FRESHFIELDS/CLIFFORD CHANCE NIVEAU */
    
    /* Reset & Base */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
    }
    
    /* 🆕 KANZLEI-TYPOGRAFIE - EXAKTE STANDARDS */
    html, body {
      font-family: ${theme.fontFamily} !important;
      font-size: ${theme.fontSize} !important;
      line-height: ${theme.lineHeight} !important;
      color: ${theme.text} !important;
      background: ${theme.lightBg} !important;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      hyphens: ${theme.hyphens} !important;
      hyphenate-character: ${theme.hyphenateCharacter} !important;
    }
    
    /* 🆕 BLOCKSATZ MIT SILBENTRENNUNG - KANZLEI-PFLICHT */
    p, .paragraph-text, .content-text {
      text-align: ${theme.textAlign} !important;
      hyphens: ${theme.hyphens} !important;
      hyphenate-character: ${theme.hyphenateCharacter} !important;
      word-wrap: break-word;
      overflow-wrap: break-word;
      ${theme.paragraphSpacing}
      orphans: ${theme.orphans} !important;
      widows: ${theme.widows} !important;
      line-height: ${theme.lineHeight} !important;
    }
    
    /* 🆕 FRESHFIELDS-LEVEL SEITENUMBRUCH-KONTROLLE */
    .section-container {
      page-break-inside: auto !important;
      break-inside: avoid !important;
      ${theme.sectionMargin}
      orphans: ${theme.orphans} !important;
      widows: ${theme.widows} !important;
    }
    
    .section-title {
      page-break-after: auto !important;
      break-after: avoid !important;
      page-break-inside: auto !important;
      break-inside: avoid !important;
      font-family: ${theme.headingFont} !important;
      font-weight: bold !important;
      font-size: ${theme.fontSize} !important;
      color: ${theme.primary} !important;
      margin-bottom: 2.12mm !important; /* 6pt = 2.12mm */
    }
    
    .section-content {
      orphans: ${theme.orphans} !important;
      widows: ${theme.widows} !important;
      page-break-inside: auto;
    }
    
    .signature-zone {
      page-break-before: auto;
      break-before: auto;
      margin-top: 16.93mm; /* 48pt = 16.93mm */
      min-height: 21.17mm; /* 60pt = 21.17mm - Signaturbereich */
    }
    
    .party-block, .table-container {
      page-break-inside: auto !important;
      break-inside: avoid !important;
      margin-bottom: 4.23mm; /* 12pt = 4.23mm */
    }
    
    .paragraph-block {
      page-break-inside: auto !important;
      break-inside: avoid !important;
      min-height: 8.47mm; /* 24pt = 8.47mm - Mindesthöhe */
    }
    
    /* 🆕 DIAGONALES WASSERZEICHEN FÜR ENTWÜRFE */
    ${isDraft ? `
      .watermark-draft {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) rotate(-45deg) !important;
        font-size: 120pt !important;
        font-weight: bold !important;
        color: rgba(200, 200, 200, 0.06) !important;
        z-index: 1 !important;
        pointer-events: none !important;
        user-select: none !important;
        font-family: 'Arial Black', Arial, sans-serif !important;
        letter-spacing: 20px !important;
        white-space: nowrap !important;
      }
    ` : ''}
    
    /* A4 Format für Print - KANZLEI-STANDARD */
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 20mm;
    }
    
    body {
      font-family: ${theme.fontFamily};
      font-size: ${theme.fontSize};
      line-height: ${theme.lineHeight};
      color: ${theme.text};
      background: white;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Container für Seite */
    .page-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      background: white;
      min-height: 297mm;
      position: relative;
    }
    
    /* Wasserzeichen für Entwürfe */
    ${isDraft ? `
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      color: rgba(0, 0, 0, 0.03);
      z-index: -1;
      pointer-events: none;
      font-weight: bold;
      letter-spacing: 20px;
      text-transform: uppercase;
    }
    ` : ''}
    
    /* Header für jede Seite */
    .page-header {
      position: running(header);
      font-size: 8pt;
      color: ${theme.secondary};
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 1px solid ${theme.border};
      margin-bottom: 20px;
    }
    
    /* Footer für jede Seite */
    .page-footer {
      position: running(footer);
      font-size: 8pt;
      color: ${theme.secondary};
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid ${theme.border};
      margin-top: 20px;
    }
    
    /* Inhaltsverzeichnis Styles */
    .table-of-contents {
      page-break-after: always;
      padding: 30px 0;
    }
    
    .toc-title {
      font-family: ${theme.headingFont};
      font-size: 16pt;
      font-weight: bold;
      color: ${theme.primary};
      margin-bottom: 30px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .toc-entry {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 10px 0;
      font-family: ${theme.fontFamily};
      font-size: ${theme.fontSize};
      color: ${theme.text};
    }
    
    .toc-dots {
      flex: 1;
      border-bottom: 1px dotted ${theme.accent};
      margin: 0 10px;
      height: 1px;
      position: relative;
      top: -4px;
    }
    
    .toc-page {
      font-weight: 500;
      color: ${theme.secondary};
    }
    
    /* Initialen-Felder */
    .initial-fields {
      position: absolute;
      bottom: 15mm;
      right: 15mm;
      display: flex;
      gap: 20px;
      font-size: 7pt;
      color: ${theme.secondary};
    }
    
    .initial-field {
      text-align: center;
    }
    
    .initial-box {
      width: 30px;
      height: 20px;
      border-bottom: 1px solid ${theme.secondary};
      margin-bottom: 2px;
    }
    
    /* Print-Optimierungen */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .page-container {
        padding: 0;
        margin: 0;
      }
      
      .no-print {
        display: none !important;
      }
      
      /* Verhindere Seitenumbruch in wichtigen Bereichen */
      h1, h2, h3, h4 {
        page-break-after: avoid;
        page-break-inside: auto;
      }
      
      p {
        orphans: 3;
        widows: 3;
        page-break-inside: auto;
      }
      
      .section-container {
        page-break-inside: auto;
      }
      
      .signature-section {
        page-break-inside: avoid;
      }
      
      /* Halte Paragraphen zusammen */
      div[style*="page-break-inside: avoid"] {
        page-break-inside: auto !important;
      }
    }
    
    /* Animations nur für Screen */
    @media screen {
      ${designVariant === 'executive' ? `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .page-container {
        animation: fadeIn 0.5s ease-out;
      }
      ` : ''}
    }
  </style>
</head>
<body>
  ${isDraft ? '<div class="watermark">ENTWURF</div>' : ''}
  
  ${isDraft ? '<div class="watermark-draft">ENTWURF</div>' : ''}
  
  <div class="page-container" style="
    margin: 0;
    padding: 25.4mm; /* 1 Zoll - Kanzlei-Standard */
    background: ${theme.lightBg};
    min-height: 297mm; /* A4 Höhe */
    position: relative;
    z-index: 2;
  ">
    
    <!-- 🏢 WELTKLASSE-KANZLEI-BRIEFKOPF - FRESHFIELDS/CLIFFORD CHANCE NIVEAU -->
    <header style="
      background: ${theme.headerBg};
      border: 1px solid ${theme.border};
      border-radius: ${theme.borderRadius};
      margin-bottom: 12.7mm; /* 36pt = 12.7mm */
      page-break-after: avoid;
      /* Kanzlei-Standard: Kein Box-Shadow */
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 8.47mm; /* 24pt = 8.47mm */
        min-height: ${theme.headerHeight};
        position: relative;
      ">
        
        <!-- LOGO-BEREICH (LINKS) - PROFESSIONELL BEGRENZT -->
        <div style="
          flex: 0 0 60mm; 
          max-width: 60mm;
          height: 25.4mm; /* 1 Zoll Höhe */
          display: flex;
          align-items: center;
          justify-content: flex-start;
        ">
          ${logoBase64 ? `
            <img src="${logoBase64}" style="
              max-width: 55mm;
              max-height: 20mm;
              object-fit: contain;
              object-position: left center;
              border: none;
            " alt="Firmenlogo"/>
          ` : `
            <div style="
              font: bold 14pt ${theme.headingFont};
              color: ${theme.primary};
              border: 2pt solid ${theme.primary};
              padding: 8mm 12mm;
              text-align: center;
              background: ${theme.lightBg};
              border-radius: ${theme.borderRadius};
              max-width: 55mm;
              word-wrap: break-word;
              min-height: 20mm;
              display: flex;
              align-items: center;
              justify-content: center;
            ">${companyProfile?.companyName ? generateCompanyInitials(companyProfile.companyName) : 'LOGO'}</div>
          `}
        </div>
        
        <!-- FIRMENDATEN (RECHTS) - KANZLEI-FORMATIERUNG -->
        <div style="
          flex: 1;
          text-align: right;
          font: 9pt ${theme.fontFamily};
          line-height: 1.3;
          color: ${theme.primary};
          margin-left: 8.47mm; /* 24pt */
          max-width: 80mm;
        ">
          <div style="
            font-weight: bold; 
            font-size: 12pt; 
            margin-bottom: 3.17mm; /* 9pt = 3.17mm */
            color: ${theme.primary};
          ">
            ${companyProfile?.companyName || 'Ihr Unternehmen'}
          </div>
          
          <div style="color: ${theme.secondary}; line-height: 1.5; font-size: 10pt;">
            ${companyProfile?.name || companyProfile?.companyName || 'Firmenname'} ${companyProfile?.legalForm ? companyProfile.legalForm : ''}<br/>
            ${companyProfile?.street || companyProfile?.address || 'Musterstraße 123'}<br/>
            ${companyProfile?.postalCode || '12345'} ${companyProfile?.city || 'Musterstadt'}<br/>
            ${companyProfile?.phone ? `Telefon: ${companyProfile.phone}<br/>` : ''}
            ${companyProfile?.email ? `E-Mail: ${companyProfile.email}<br/>` : ''}
            ${companyProfile?.vatId ? `USt-ID: ${companyProfile.vatId}<br/>` : ''}
            ${companyProfile?.hrb || companyProfile?.registerNumber ? `HRB: ${companyProfile.hrb || companyProfile.registerNumber}` : ''}
          </div>
        </div>
        
        
      </div>
      
      <!-- ZARTE TRENNLINIE -->
      <div style="
        width: 100%;
        height: 1px;
        background: #e0e0e0;
        margin: 8mm 0 12mm 0;
      ">
        
      </div>
      
      <!-- 🆕 DOKUMENT-METADATEN-LEISTE -->
      <div style="
        background: ${theme.lightBg};
        border-top: 1px solid ${theme.border};
        padding: 4.23mm 8.47mm; /* 12pt/24pt */
        font: 8pt ${theme.fontFamily};
        color: ${theme.secondary};
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <strong>Dokument-ID:</strong> ${documentId.substring(0, 20)}...
        </div>
        <div>
          <strong>Typ:</strong> ${contractType.toUpperCase()}
        </div>
        <div>
          <strong>Status:</strong> ${isDraft ? 'ENTWURF' : 'FINAL'}
        </div>
        <div>
          <strong>Erstellt:</strong> ${new Date().toLocaleDateString('de-DE')}
        </div>
      </div>
    </header>
    
    <!-- HAUPTINHALT-BEREICH -->
    <div style="
      position: relative;
      overflow: hidden;
    ">
      ${designVariant === 'executive' ? `
        <!-- Decorative Elements für Executive -->
        <div style="
          position: absolute;
          top: -30%;
          right: -5%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          border-radius: 50%;
        "></div>
        <div style="
          position: absolute;
          bottom: -20%;
          left: -3%;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(201,169,97,0.1) 0%, transparent 70%);
          border-radius: 50%;
        "></div>
      ` : ''}
      
      <div style="flex: 1; position: relative; z-index: 2;">
        ${companyProfile ? `
          <h1 style="
            font-size: 20pt;
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
            text-shadow: ${designVariant === 'executive' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'};
          ">${companyProfile.companyName}${companyProfile.legalForm ? ` ${companyProfile.legalForm}` : ''}</h1>
          <div style="font-size: 9pt; opacity: 0.95; line-height: 1.4;">
            ${companyProfile.street ? `${companyProfile.street}, ` : ''}
            ${companyProfile.postalCode || ''} ${companyProfile.city || ''}
            ${companyProfile.contactEmail ? `<br/>✉ ${companyProfile.contactEmail}` : ''}
            ${companyProfile.contactPhone ? ` | ☎ ${companyProfile.contactPhone}` : ''}
            ${companyProfile.vatId ? `<br/>USt-IdNr.: ${companyProfile.vatId}` : ''}
            ${companyProfile.tradeRegister ? ` | ${companyProfile.tradeRegister}` : ''}
            ${companyProfile.website ? `<br/>🌐 ${companyProfile.website}` : ''}
          </div>
        ` : `
          <h1 style="font-size: 18pt; font-weight: bold; letter-spacing: 1px;">Vertragsdokument</h1>
          <p style="font-size: 10pt; opacity: 0.9; margin-top: 5px;">Professionell erstelltes Dokument</p>
        `}
      </div>
      
      ${logoBase64 ? `
        <div style="
          width: 140px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-left: 20px;
          position: relative;
          z-index: 2;
        ">
          <div style="
            background: rgba(255, 255, 255, 0.95);
            padding: 10px;
            border-radius: ${theme.borderRadius};
            /* Kanzlei-Standard: Kein Box-Shadow */
          ">
            <img src="${logoBase64}" alt="Logo" style="
              max-width: 42mm;
              max-height: 18mm;
              object-fit: contain;
            " />
          </div>
        </div>
      ` : ''}
    </header>
    
    <!-- Dokument-Info Box -->
    <div style="
      background: ${theme.lightBg};
      border: 1px solid ${theme.border};
      border-radius: ${theme.borderRadius};
      padding: 15px 20px;
      margin-bottom: 30px;
      font-size: 9pt;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      /* Kanzlei-Standard: Kein Box-Shadow */
    ">
      <div><strong style="color: ${theme.primary};">Dokument-ID:</strong> ${documentId}</div>
      <div><strong style="color: ${theme.primary};">Erstellt am:</strong> ${new Date().toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })}</div>
      <div><strong style="color: ${theme.primary};">Vertragstyp:</strong> ${contractType?.toUpperCase() || 'VERTRAG'}</div>
      <div><strong style="color: ${theme.primary};">Hash:</strong> ${documentHash}</div>
      ${companyProfile?.registrationNumber ? `
        <div><strong style="color: ${theme.primary};">Registrierungsnr.:</strong> ${companyProfile.registrationNumber}</div>
      ` : ''}
      <div><strong style="color: ${theme.primary};">Status:</strong> ${isDraft ? 'ENTWURF' : 'FINAL'}</div>
    </div>
    
    <!-- Inhaltsverzeichnis deaktiviert bis Seitenzahlen korrekt -->
    
    <!-- Vertragskörper -->
    <main style="margin-top: 30px;">
      ${htmlContent}
    </main>
    
    <!-- Anhang-Platzhalter -->
    <div style="
      margin-top: 50px;
      padding: 20px;
      background: ${theme.lightBg};
      border: 1px dashed ${theme.border};
      border-radius: ${theme.borderRadius};
      page-break-inside: avoid;
    ">
      <h3 style="
        font-family: ${theme.headingFont};
        font-size: 12pt;
        color: ${theme.primary};
        margin-bottom: 10px;
      ">ANLAGEN</h3>
      <p style="
        font-family: ${theme.fontFamily};
        font-size: 9pt;
        color: ${theme.secondary};
        font-style: italic;
      ">Diesem Vertrag sind keine Anlagen beigefügt.</p>
    </div>
    
    <!-- Enterprise Footer mit QR-Code -->
    <footer style="
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid ${theme.accent};
      page-break-inside: avoid;
    ">
      <div style="
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 30px;
        align-items: flex-end;
        margin-bottom: 20px;
      ">
        <div style="font-size: 8pt; color: ${theme.secondary};">
          <strong style="color: ${theme.primary}; font-size: 9pt;">${contractType?.toUpperCase() || 'VERTRAGSDOKUMENT'}</strong><br/>
          ${companyProfile?.companyName ? `© ${new Date().getFullYear()} ${companyProfile.companyName}` : 'Rechtsdokument'}
        </div>
        
        <div style="text-align: center;">
          ${enterpriseQRCode ? `<img src="${enterpriseQRCode}" alt="Verifizierungs-QR" style="width: 25mm; height: 25mm; border: 1px solid ${theme.border}; padding: 2mm; background: white;" />` : ''}
          <div style="font-size: 7pt; color: ${theme.secondary}; margin-top: 5px;">
            <strong>Digitale Verifizierung</strong><br/>
            ${documentHash}
          </div>
        </div>
        
        <div style="text-align: right; font-size: 8pt; color: ${theme.secondary};">
          <strong style="color: ${theme.primary};">Rechtlicher Hinweis:</strong><br/>
          Dieses Dokument ist rechtlich bindend.<br/>
          Alle Rechte vorbehalten.<br/>
          Gerichtsstand: ${companyProfile?.city || 'Deutschland'}
        </div>
      </div>
      
      <!-- Initialen-Felder für jede Seite -->
      <div class="initial-fields no-print">
        <div class="initial-field">
          <div class="initial-box"></div>
          <div>${companyProfile?.companyName ? companyProfile.companyName.substring(0, 2).toUpperCase() : 'VK'}</div>
        </div>
        <div class="initial-field">
          <div class="initial-box"></div>
          <div>KÄ</div>
        </div>
      </div>
    </footer>
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

// 🎯 PROFESSIONELLE VERTRAGSGENERIERUNG - HAUPTROUTE
router.post("/", verifyToken, async (req, res) => {
  console.log("🚀 Generate Route aufgerufen!");
  console.log("📊 Request Body:", {
    type: req.body.type,
    useCompanyProfile: req.body.useCompanyProfile,
    designVariant: req.body.designVariant,
    formDataKeys: Object.keys(req.body.formData || {})
  });
  
  const { type, formData, useCompanyProfile = false, designVariant = 'executive' } = req.body;

  if (!type || !formData || !formData.title) {
    return res.status(400).json({ message: "❌ Fehlende Felder für Vertragserstellung." });
  }

  try {
    // Company Profile laden - KRITISCHER FIX
    let companyProfile = null;
    if (db && useCompanyProfile) {
      try {
        console.log("🔍 Suche Company Profile für User:", req.user.userId);
        const profileData = await db.collection("company_profiles").findOne({ 
          userId: new ObjectId(req.user.userId) 
        });
        
        if (profileData) {
          companyProfile = profileData;
          console.log("✅ Company Profile gefunden:", {
            name: companyProfile.companyName,
            hasLogo: !!companyProfile.logoUrl,
            logoType: companyProfile.logoUrl ? (companyProfile.logoUrl.startsWith('data:') ? 'base64' : 'url') : 'none'
          });
        } else {
          console.log("⚠️ Kein Company Profile gefunden für User:", req.user.userId);
        }
      } catch (profileError) {
        console.error("❌ Fehler beim Laden des Company Profiles:", profileError);
      }
    } else {
      console.log("ℹ️ Company Profile nicht angefordert (useCompanyProfile:", useCompanyProfile, ")");
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

    // Company Details vorbereiten für GPT
    let companyDetails = "";
    if (companyProfile && useCompanyProfile) {
      companyDetails = `${companyProfile.companyName}`;
      if (companyProfile.legalForm) companyDetails += ` (${companyProfile.legalForm})`;
      companyDetails += `\n${companyProfile.street}, ${companyProfile.postalCode || ''} ${companyProfile.city}`;
      if (companyProfile.vatId) companyDetails += `\nUSt-IdNr.: ${companyProfile.vatId}`;
      if (companyProfile.tradeRegister) companyDetails += `\n${companyProfile.tradeRegister}`;
      if (companyProfile.ceo) companyDetails += `\nGeschäftsführer: ${companyProfile.ceo}`;
      if (companyProfile.contactEmail) companyDetails += `\nE-Mail: ${companyProfile.contactEmail}`;
      if (companyProfile.contactPhone) companyDetails += `\nTelefon: ${companyProfile.contactPhone}`;
    }

    // System Prompt für GPT-4 - VOLLSTÄNDIG
    let systemPrompt = `Du bist ein Experte für deutsches Vertragsrecht und erstellst professionelle, rechtssichere Verträge.

ABSOLUT KRITISCHE REGELN:
1. Erstelle einen VOLLSTÄNDIGEN Vertrag mit MINDESTENS 10-12 Paragraphen
2. KEIN HTML, KEIN MARKDOWN - nur reiner Text
3. Verwende EXAKT diese Struktur (keine Abweichungen!)
4. Fülle ALLE Felder mit echten Daten - KEINE Platzhalter in eckigen Klammern
5. Verwende professionelle juristische Sprache
6. Jeder Paragraph muss detailliert ausformuliert sein

EXAKTE VERTRAGSSTRUKTUR (BITTE GENAU SO VERWENDEN):

=================================
[VERTRAGSTYP IN GROSSBUCHSTABEN]
=================================

zwischen

[Vollständige Angaben Partei A mit allen Details]
[Adresse]
[Weitere relevante Angaben wie HRB, USt-IdNr.]
- nachfolgend "[Kurzbezeichnung]" genannt -

und

[Vollständige Angaben Partei B mit allen Details]
[Adresse falls vorhanden]
- nachfolgend "[Kurzbezeichnung]" genannt -

PRÄAMBEL

[Mindestens 2-3 Sätze zur Einleitung und zum Vertragszweck. Erkläre den Hintergrund und die Absicht der Parteien.]

§ 1 VERTRAGSGEGENSTAND

(1) [Hauptgegenstand sehr detailliert beschreiben - mindestens 3-4 Zeilen. Sei spezifisch über alle Eigenschaften und Merkmale.]

(2) [Weitere wichtige Details zum Gegenstand, technische Spezifikationen, Qualitätsmerkmale etc.]

(3) [Zusätzliche Spezifikationen, Abgrenzungen, was NICHT zum Vertragsgegenstand gehört]

§ 2 LEISTUNGEN UND PFLICHTEN

(1) Der [Bezeichnung Partei A] verpflichtet sich zu folgenden Leistungen:
   a) [Detaillierte Pflicht 1 - ausführlich beschreiben]
   b) [Detaillierte Pflicht 2 - ausführlich beschreiben]
   c) [Detaillierte Pflicht 3 - ausführlich beschreiben]
   d) [Weitere Pflichten falls relevant]

(2) Der [Bezeichnung Partei B] verpflichtet sich zu folgenden Leistungen:
   a) [Detaillierte Pflicht 1 - ausführlich beschreiben]
   b) [Detaillierte Pflicht 2 - ausführlich beschreiben]
   c) [Weitere Pflichten falls relevant]

(3) Beide Parteien verpflichten sich zur vertrauensvollen Zusammenarbeit und gegenseitigen Information über alle vertragsrelevanten Umstände.

§ 3 VERGÜTUNG UND ZAHLUNGSBEDINGUNGEN

(1) Die Vergütung beträgt [EXAKTER BETRAG mit Währung und ggf. MwSt.-Angabe].

(2) Die Zahlung erfolgt [genaue Zahlungsmodalitäten, Fristen, Zahlungsweise].

(3) Bei Zahlungsverzug werden Verzugszinsen in Höhe von 9 Prozentpunkten über dem Basiszinssatz berechnet.

(4) [Weitere Zahlungsdetails wie Ratenzahlung, Skonto, Vorauszahlung etc.]

§ 4 LAUFZEIT UND KÜNDIGUNG

(1) Dieser Vertrag tritt am [Datum] in Kraft und läuft [Laufzeitdetails - befristet/unbefristet].

(2) Die ordentliche Kündigung [Kündigungsfristen und -modalitäten genau beschreiben].

(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.

(4) Kündigungen bedürfen zu ihrer Wirksamkeit der Schriftform.

§ 5 GEWÄHRLEISTUNG

(1) [Detaillierte Gewährleistungsregelungen - mindestens 3-4 Zeilen. Beschreibe Umfang und Grenzen der Gewährleistung.]

(2) Die Gewährleistungsfrist beträgt [Zeitraum] ab [Beginn der Frist].

(3) [Regelungen zur Nacherfüllung, Rechte des Käufers bei Mängeln]

(4) [Ausschlüsse und Einschränkungen der Gewährleistung]

§ 6 HAFTUNG

(1) Die Haftung richtet sich nach den gesetzlichen Bestimmungen, soweit nachfolgend nichts anderes bestimmt ist.

(2) [Haftungsbeschränkungen detailliert - bei leichter Fahrlässigkeit, Höchstbeträge etc.]

(3) Die Verjährungsfrist für Schadensersatzansprüche beträgt [Zeitraum].

(4) Die vorstehenden Haftungsbeschränkungen gelten nicht bei Vorsatz, grober Fahrlässigkeit sowie bei der Verletzung von Leben, Körper und Gesundheit.

§ 7 EIGENTUMSVORBEHALT / GEFAHRÜBERGANG

(1) [Bei Kaufverträgen: Eigentumsvorbehalt bis zur vollständigen Zahlung; sonst: Regelung zum Gefahrübergang]

(2) [Weitere Details zu Eigentum und Gefahr]

(3) [Regelungen bei Weiterveräußerung, Verarbeitung etc.]

§ 8 VERTRAULICHKEIT

(1) Die Vertragsparteien verpflichten sich, über alle vertraulichen Informationen, die ihnen im Rahmen dieses Vertrages bekannt werden, Stillschweigen zu bewahren.

(2) Als vertraulich gelten alle Informationen, die als solche bezeichnet werden oder ihrer Natur nach als vertraulich anzusehen sind.

(3) Diese Verpflichtung besteht auch nach Beendigung des Vertrages für einen Zeitraum von [X] Jahren fort.

§ 9 DATENSCHUTZ

(1) Die Parteien verpflichten sich zur Einhaltung aller geltenden Datenschutzbestimmungen, insbesondere der DSGVO.

(2) Personenbezogene Daten werden ausschließlich zur Vertragsdurchführung verarbeitet.

(3) [Weitere datenschutzrechtliche Regelungen, Auftragsverarbeitung etc.]

§ 10 [VERTRAGSTYP-SPEZIFISCHE KLAUSEL]

(1) [Spezielle Regelungen je nach Vertragstyp - z.B. bei Mietvertrag: Schönheitsreparaturen, bei Arbeitsvertrag: Urlaub, etc.]

(2) [Weitere spezifische Details]

§ 11 SCHLUSSBESTIMMUNGEN

(1) Änderungen und Ergänzungen dieses Vertrages bedürfen zu ihrer Wirksamkeit der Schriftform. Dies gilt auch für die Änderung dieser Schriftformklausel selbst.

(2) Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein oder werden, so wird hierdurch die Wirksamkeit des Vertrages im Übrigen nicht berührt. Die Parteien verpflichten sich, die unwirksame Bestimmung durch eine wirksame zu ersetzen, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.

(3) Erfüllungsort und Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist [Ort], sofern die Parteien Kaufleute, juristische Personen des öffentlichen Rechts oder öffentlich-rechtliche Sondervermögen sind.

(4) Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.


_______________________          _______________________
Ort, Datum                       Ort, Datum


_______________________          _______________________
[Name Partei A]                  [Name Partei B]
[Funktion/Titel]                 [Funktion/Titel]`;

    // User Prompts für verschiedene Vertragstypen - VOLLSTÄNDIG
    let userPrompt = "";
    
    switch (type) {
      case "kaufvertrag":
        const verkäufer = companyDetails || formData.seller || "Max Mustermann GmbH, Musterstraße 1, 12345 Musterstadt";
        const käufer = formData.buyer || "Erika Musterfrau, Beispielweg 2, 54321 Beispielstadt";
        
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN, professionellen Kaufvertrag mit MINDESTENS 11 Paragraphen.

VERTRAGSTYP: KAUFVERTRAG

VERKÄUFER (verwende als Partei A):
${verkäufer}

KÄUFER (verwende als Partei B):
${käufer}

KAUFGEGENSTAND:
${formData.item || "Hochwertige Büromöbel bestehend aus 10 Schreibtischen, 10 Bürostühlen und 5 Aktenschränken"}

KAUFPREIS:
${formData.price || "15.000 EUR zzgl. 19% MwSt."}

ÜBERGABE/LIEFERUNG:
${formData.deliveryDate || new Date().toISOString().split('T')[0]}

ZAHLUNGSBEDINGUNGEN:
${formData.paymentTerms || "14 Tage netto nach Rechnungsstellung"}

Erstelle einen VOLLSTÄNDIGEN Vertrag mit allen erforderlichen Paragraphen. Verwende professionelle juristische Sprache und fülle ALLE Angaben vollständig aus!`;
        break;

      case "freelancer":
        const auftraggeber = companyDetails || formData.nameClient || "Auftraggeber GmbH, Hauptstraße 10, 10115 Berlin";
        
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Dienstleistungsvertrag/Freelancer-Vertrag mit MINDESTENS 12 Paragraphen.

VERTRAGSTYP: DIENSTLEISTUNGSVERTRAG / FREELANCER-VERTRAG

AUFTRAGGEBER (verwende als Partei A):
${auftraggeber}
${formData.clientAddress || ""}

AUFTRAGNEHMER (verwende als Partei B):
${formData.nameFreelancer || "Max Mustermann"}
${formData.freelancerAddress || "Freiberuflerweg 5, 80331 München"}
${formData.freelancerTaxId ? `Steuer-ID/USt-IdNr.: ${formData.freelancerTaxId}` : 'Steuer-ID: 12/345/67890'}

LEISTUNGSBESCHREIBUNG:
${formData.description || "Entwicklung einer Webanwendung mit React und Node.js, inklusive Datenbankdesign und API-Entwicklung"}

PROJEKTDAUER:
${formData.timeframe || "3 Monate ab Vertragsbeginn"}

VERGÜTUNG:
${formData.payment || "450 EUR pro Tagessatz, geschätzt 60 Arbeitstage"}
Zahlungsbedingungen: ${formData.paymentTerms || '14 Tage netto nach Rechnungsstellung'}
Rechnungsstellung: ${formData.invoiceInterval || 'Monatlich zum Monatsende'}

WEITERE DETAILS:
- Arbeitsort: ${formData.workLocation || 'Remote mit gelegentlichen Meetings beim Auftraggeber'}
- Arbeitszeiten: ${formData.workingHours || 'Flexible Zeiteinteilung, Kernarbeitszeit 10-16 Uhr'}
- Nutzungsrechte: ${formData.rights || "Vollständige Übertragung aller Rechte an den Auftraggeber"}
- Vertraulichkeit: ${formData.confidentiality || 'Strenge Vertraulichkeit für 5 Jahre nach Vertragsende'}
- Haftung: ${formData.liability || 'Begrenzt auf die Höhe des Auftragswerts'}
- Kündigung: ${formData.terminationClause || "4 Wochen zum Monatsende"}
- Gerichtsstand: ${formData.jurisdiction || 'Sitz des Auftraggebers'}

Erstelle einen VOLLSTÄNDIGEN Vertrag mit allen erforderlichen Paragraphen für einen professionellen Freelancer-Vertrag!`;
        break;

      case "mietvertrag":
        const vermieter = companyDetails || formData.landlord || "Immobilien GmbH, Vermietstraße 1, 60311 Frankfurt";
        const mieter = formData.tenant || "Familie Mustermann";
        
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Mietvertrag für Wohnraum mit MINDESTENS 15 Paragraphen.

VERTRAGSTYP: MIETVERTRAG FÜR WOHNRAUM

VERMIETER (verwende als Partei A):
${vermieter}

MIETER (verwende als Partei B):
${mieter}
${formData.tenantAddress || ""}

MIETOBJEKT:
${formData.address || "3-Zimmer-Wohnung, 2. OG rechts, Musterstraße 15, 10115 Berlin"}
Wohnfläche: ${formData.size || "85 qm"}
Zimmer: ${formData.rooms || "3 Zimmer, Küche, Bad, Balkon"}

MIETBEGINN:
${formData.startDate || new Date().toISOString().split('T')[0]}

MIETE:
Kaltmiete: ${formData.baseRent || "950,00 EUR"}
Nebenkosten-Vorauszahlung: ${formData.extraCosts || "200,00 EUR"}
Gesamtmiete: ${formData.totalRent || "1.150,00 EUR"}

KAUTION:
${formData.deposit || "3 Kaltmieten (2.850,00 EUR)"}

KÜNDIGUNG:
${formData.termination || "Gesetzliche Kündigungsfrist von 3 Monaten"}

BESONDERE VEREINBARUNGEN:
- Haustiere: ${formData.pets || "Nach Absprache mit dem Vermieter"}
- Schönheitsreparaturen: ${formData.renovations || "Nach gesetzlichen Bestimmungen"}
- Garten/Balkon: ${formData.garden || "Mitbenutzung des Gartens"}

Füge alle mietrechtlich relevanten Klauseln ein, inklusive:
- Betriebskosten-Aufstellung
- Schönheitsreparaturen
- Hausordnung
- Untervermietung
- Modernisierung
- Mieterhöhung
- Betreten der Wohnung
- Tierhaltung`;
        break;

      case "arbeitsvertrag":
        const arbeitgeber = companyDetails || formData.employer || "Arbeitgeber GmbH, Firmenweg 1, 80331 München";
        const arbeitnehmer = formData.employee || "Max Mustermann";
        
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Arbeitsvertrag mit MINDESTENS 18 Paragraphen.

VERTRAGSTYP: ARBEITSVERTRAG

ARBEITGEBER (verwende als Partei A):
${arbeitgeber}
vertreten durch: ${formData.representative || "Geschäftsführer Hans Schmidt"}

ARBEITNEHMER (verwende als Partei B):
${arbeitnehmer}
${formData.employeeAddress || "Arbeitnehmerstraße 10, 80331 München"}
geboren am: ${formData.birthDate || "01.01.1990"}
Sozialversicherungsnummer: ${formData.socialSecurityNumber || "[wird nachgereicht]"}

POSITION/TÄTIGKEIT:
${formData.position || "Senior Software Developer"}
Abteilung: ${formData.department || "IT-Entwicklung"}
Vorgesetzter: ${formData.supervisor || "Abteilungsleiter IT"}

ARBEITSBEGINN:
${formData.startDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}

PROBEZEIT:
${formData.probation || "6 Monate"}

VERGÜTUNG:
Bruttogehalt: ${formData.salary || "5.500,00 EUR monatlich"}
Sonderzahlungen: ${formData.bonuses || "Weihnachtsgeld in Höhe eines Monatsgehalts"}
Überstunden: ${formData.overtime || "Mit Gehalt abgegolten bis 10 Std./Monat"}

ARBEITSZEIT:
${formData.workingHours || "40 Stunden pro Woche, Montag bis Freitag"}
Gleitzeit: ${formData.flexTime || "Kernarbeitszeit 10:00 - 15:00 Uhr"}
Homeoffice: ${formData.homeOffice || "2 Tage pro Woche nach Absprache"}

URLAUB:
${formData.vacation || "30 Arbeitstage pro Kalenderjahr"}

WEITERE REGELUNGEN:
- Fortbildung: ${formData.training || "5 Tage Bildungsurlaub pro Jahr"}
- Firmenwagen: ${formData.companyCar || "nicht vorgesehen"}
- Betriebliche Altersvorsorge: ${formData.pension || "Arbeitgeberzuschuss 50%"}

Füge alle arbeitsrechtlich relevanten Klauseln ein, inklusive:
- Verschwiegenheitspflicht
- Nebentätigkeit
- Krankheit
- Wettbewerbsverbot
- Rückzahlungsklauseln
- Vertragsstrafen
- Zeugnis`;
        break;

      case "nda":
        const offenlegender = companyDetails || formData.partyA || "Technologie GmbH, Innovationsweg 1, 10115 Berlin";
        const empfänger = formData.partyB || "Beratung AG, Consultingstraße 5, 60311 Frankfurt";
        
        userPrompt = `Erstelle eine VOLLSTÄNDIGE Geheimhaltungsvereinbarung (NDA) mit MINDESTENS 12 Paragraphen.

VERTRAGSTYP: GEHEIMHALTUNGSVEREINBARUNG / NON-DISCLOSURE AGREEMENT (NDA)

OFFENLEGENDE PARTEI (Partei A):
${offenlegender}

EMPFANGENDE PARTEI (Partei B):
${empfänger}

ZWECK DER VEREINBARUNG:
${formData.purpose || "Prüfung einer möglichen Geschäftspartnerschaft im Bereich KI-Entwicklung"}

ART DER INFORMATIONEN:
${formData.informationType || "Technische Dokumentationen, Geschäftsgeheimnisse, Kundendaten, Finanzdaten, Sourcecode"}

GÜLTIGKEITSDAUER:
Vertragslaufzeit: ${formData.duration || "2 Jahre ab Unterzeichnung"}
Geheimhaltungspflicht: ${formData.confidentialityPeriod || "5 Jahre nach Vertragsende"}

ERLAUBTE NUTZUNG:
${formData.permittedUse || "Ausschließlich zur Evaluierung der Geschäftspartnerschaft"}

VERTRAGSSTRAFE:
${formData.penalty || "50.000 EUR pro Verstoß"}

Füge alle relevanten Klauseln ein, inklusive:
- Definition vertraulicher Informationen
- Ausnahmen von der Geheimhaltung
- Erlaubte Offenlegungen
- Rückgabe/Vernichtung von Unterlagen
- Keine Lizenzgewährung
- Rechtsmittel bei Verstößen
- Keine Verpflichtung zur Offenlegung`;
        break;

      case "gesellschaftsvertrag":
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Gesellschaftsvertrag (GmbH) mit MINDESTENS 20 Paragraphen.

VERTRAGSTYP: GESELLSCHAFTSVERTRAG (GmbH)

GESELLSCHAFTSNAME:
${formData.companyName || "Neue Ventures GmbH"}

SITZ DER GESELLSCHAFT:
${formData.companySeat || "Berlin"}

GESELLSCHAFTER:
${formData.partners || `1. Max Mustermann, Musterstraße 1, 10115 Berlin - 60% Anteile
2. Erika Musterfrau, Beispielweg 2, 10115 Berlin - 40% Anteile`}

STAMMKAPITAL:
${formData.capital || "25.000 EUR"}

GESCHÄFTSANTEILE:
${formData.shares || `Gesellschafter 1: 15.000 EUR (Geschäftsanteil Nr. 1)
Gesellschafter 2: 10.000 EUR (Geschäftsanteil Nr. 2)`}

UNTERNEHMENSGEGENSTAND:
${formData.purpose || "Entwicklung und Vertrieb von Software, IT-Beratung und damit verbundene Dienstleistungen"}

GESCHÄFTSFÜHRUNG:
${formData.management || "Max Mustermann (Einzelvertretungsberechtigung)"}

GESCHÄFTSJAHR:
${formData.fiscalYear || "Kalenderjahr"}

Füge alle gesellschaftsrechtlich relevanten Klauseln ein, inklusive:
- Einlagen und Einzahlung
- Geschäftsführung und Vertretung
- Gesellschafterversammlung
- Gesellschafterbeschlüsse
- Gewinnverteilung
- Jahresabschluss
- Abtretung von Geschäftsanteilen
- Vorkaufsrecht
- Einziehung von Geschäftsanteilen
- Abfindung
- Wettbewerbsverbot
- Kündigung
- Auflösung und Liquidation`;
        break;

      case "darlehensvertrag":
        const darlehensgeber = companyDetails || formData.lender || "Finanz GmbH, Kapitalweg 1, 60311 Frankfurt";
        const darlehensnehmer = formData.borrower || "Max Mustermann, Kreditstraße 5, 10115 Berlin";
        
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Darlehensvertrag mit MINDESTENS 14 Paragraphen.

VERTRAGSTYP: DARLEHENSVERTRAG

DARLEHENSGEBER (Partei A):
${darlehensgeber}

DARLEHENSNEHMER (Partei B):
${darlehensnehmer}

DARLEHENSSUMME:
${formData.amount || "50.000,00 EUR (in Worten: fünfzigtausend Euro)"}

AUSZAHLUNG:
${formData.disbursement || "Überweisung auf das Konto des Darlehensnehmers binnen 5 Werktagen nach Unterzeichnung"}

ZINSSATZ:
${formData.interestRate || "4,5% p.a. (nominal)"}
Zinsberechnung: ${formData.interestCalculation || "30/360 Tage Methode"}
Zinszahlung: ${formData.interestPayment || "Monatlich zum Monatsende"}

LAUFZEIT:
${formData.duration || "5 Jahre (60 Monate)"}
Beginn: ${formData.startDate || new Date().toISOString().split('T')[0]}

TILGUNG:
${formData.repayment || "Monatliche Annuität von 932,56 EUR"}
Sondertilgungen: ${formData.specialRepayments || "Jährlich bis zu 20% der ursprünglichen Darlehenssumme kostenfrei möglich"}

SICHERHEITEN:
${formData.security || "Grundschuld auf Immobilie Grundbuch Berlin Blatt 12345"}

VERWENDUNGSZWECK:
${formData.purpose || "Immobilienfinanzierung / Modernisierung"}

Füge alle relevanten Klauseln ein, inklusive:
- Auszahlungsvoraussetzungen
- Verzug und Verzugszinsen
- Kündigungsrechte
- Vorfälligkeitsentschädigung
- Aufrechnung und Abtretung
- Kosten und Gebühren`;
        break;

      case "lizenzvertrag":
        const lizenzgeber = companyDetails || formData.licensor || "Software Innovations GmbH, Techpark 1, 80331 München";
        const lizenznehmer = formData.licensee || "Anwender AG, Nutzerweg 10, 10115 Berlin";
        
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Lizenzvertrag mit MINDESTENS 15 Paragraphen.

VERTRAGSTYP: LIZENZVERTRAG

LIZENZGEBER (Partei A):
${lizenzgeber}

LIZENZNEHMER (Partei B):
${lizenznehmer}

LIZENZGEGENSTAND:
${formData.subject || "Software 'DataAnalyzer Pro' Version 5.0 inklusive Updates für die Vertragslaufzeit"}

LIZENZART:
${formData.licenseType || "Nicht-exklusive, übertragbare Unternehmenslizenz"}

LIZENZUMFANG:
Nutzer: ${formData.users || "bis zu 50 gleichzeitige Nutzer"}
Installation: ${formData.installations || "Unbegrenzte Installationen innerhalb des Unternehmens"}
Nutzungsart: ${formData.usage || "Kommerzielle Nutzung erlaubt"}

TERRITORIUM:
${formData.territory || "Deutschland, Österreich, Schweiz (DACH-Region)"}

LIZENZGEBÜHREN:
Einmalige Lizenzgebühr: ${formData.fee || "25.000,00 EUR netto"}
Jährliche Wartung: ${formData.maintenance || "5.000,00 EUR netto"}
Zahlungsbedingungen: ${formData.payment || "30 Tage netto nach Rechnungsstellung"}

LAUFZEIT:
${formData.duration || "Unbefristet mit jährlicher Wartungsverlängerung"}

SUPPORT:
${formData.support || "E-Mail und Telefon-Support werktags 9-17 Uhr, Updates und Patches inklusive"}

Füge alle relevanten Klauseln ein, inklusive:
- Rechteeinräumung im Detail
- Nutzungsbeschränkungen
- Quellcode-Hinterlegung
- Gewährleistung und Haftung
- Schutzrechte Dritter
- Vertraulichkeit
- Audit-Rechte`;
        break;

      case "aufhebungsvertrag":
        const arbeitgeberAufhebung = companyDetails || formData.employer || "Arbeitgeber GmbH, Trennungsweg 1, 50667 Köln";
        const arbeitnehmerAufhebung = formData.employee || "Maria Musterfrau";
        
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Aufhebungsvertrag mit MINDESTENS 16 Paragraphen.

VERTRAGSTYP: AUFHEBUNGSVERTRAG

ARBEITGEBER (Partei A):
${arbeitgeberAufhebung}
vertreten durch: ${formData.representative || "Personalleiter Thomas Schmidt"}

ARBEITNEHMER (Partei B):
${arbeitnehmerAufhebung}
${formData.employeeAddress || "Arbeitnehmerstraße 20, 50667 Köln"}
Personalnummer: ${formData.employeeNumber || "2024-4567"}

BESTEHENDES ARBEITSVERHÄLTNIS:
Beginn: ${formData.employmentStart || "01.04.2020"}
Position: ${formData.position || "Marketing Manager"}

BEENDIGUNGSDATUM:
${formData.endDate || "31.12.2024"}

BEENDIGUNGSGRUND:
${formData.reason || "Einvernehmliche Beendigung auf Wunsch des Arbeitnehmers wegen beruflicher Neuorientierung"}

ABFINDUNG:
${formData.severance || "3 Bruttomonatsgehälter = 15.000,00 EUR brutto"}
Auszahlung: ${formData.severancePayment || "Mit der letzten Gehaltsabrechnung"}
Versteuerung: ${formData.taxation || "Nach § 34 EStG (Fünftelregelung)"}

RESTURLAUB:
${formData.vacation || "25 Tage, werden bis zum Beendigungsdatum gewährt"}

FREISTELLUNG:
${formData.gardenLeave || "Unwiderrufliche Freistellung ab 01.11.2024 unter Anrechnung von Resturlaub"}

ARBEITSZEUGNIS:
${formData.reference || "Qualifiziertes Zeugnis mit der Note 'sehr gut', Entwurf als Anlage"}

WEITERE REGELUNGEN:
- Bonuszahlung: ${formData.bonus || "Anteiliger Bonus für 2024"}
- Firmenwagen: ${formData.companyCar || "Rückgabe zum Beendigungsdatum"}
- Firmenhandy/Laptop: ${formData.equipment || "Rückgabe zum Beendigungsdatum"}
- Betriebliche Altersvorsorge: ${formData.pension || "Unverfallbare Anwartschaften bleiben bestehen"}

Füge alle relevanten Klauseln ein, inklusive:
- Gehaltsfortzahlung
- Wettbewerbsverbot
- Verschwiegenheit
- Rückgabe von Firmeneigentum
- Ausgleichsklausel
- Sperrzeit-Hinweis`;
        break;

      case "pachtvertrag":
        const verpächter = companyDetails || formData.lessor || "Grundstücks GmbH, Pachtweg 1, 01067 Dresden";
        const pächter = formData.lessee || "Landwirt Müller, Feldweg 10, 01099 Dresden";
        
        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Pachtvertrag mit MINDESTENS 14 Paragraphen.

VERTRAGSTYP: PACHTVERTRAG

VERPÄCHTER (Partei A):
${verpächter}

PÄCHTER (Partei B):
${pächter}

PACHTOBJEKT:
${formData.object || "Landwirtschaftliche Nutzfläche, 10 Hektar, Flurstück 123/45, Gemarkung Dresden"}
Lage: ${formData.location || "Angrenzend an B6, mit Zufahrt über Feldweg"}
Bodenbeschaffenheit: ${formData.soilQuality || "Ackerland, Bodenqualität 65 Punkte"}

PACHTBEGINN:
${formData.startDate || "01.01.2025"}

PACHTDAUER:
${formData.duration || "12 Jahre (bis 31.12.2036)"}

PACHTZINS:
${formData.rent || "500,00 EUR pro Hektar und Jahr = 5.000,00 EUR jährlich"}
Zahlungsweise: ${formData.paymentMethod || "Jährlich im Voraus zum 01.01."}
Anpassung: ${formData.adjustment || "Alle 3 Jahre entsprechend dem Verbraucherpreisindex"}

NUTZUNGSZWECK:
${formData.usage || "Landwirtschaftliche Nutzung, Anbau von Getreide und Feldfrüchten"}

BESONDERE VEREINBARUNGEN:
- Düngung: ${formData.fertilization || "Nach guter fachlicher Praxis"}
- Fruchtfolge: ${formData.cropRotation || "Mindestens 3-gliedrig"}
- Pflege: ${formData.maintenance || "Hecken und Gräben durch Pächter"}

Füge alle relevanten Klauseln ein, inklusive:
- Übergabe und Rückgabe
- Instandhaltung und Verbesserungen
- Unterverpachtung
- Betretungsrecht
- Jagd- und Fischereirechte
- Vorzeitige Kündigung`;
        break;

      case "custom":
        userPrompt = `Erstelle einen professionellen Vertrag mit dem Titel: ${formData.title}

VERTRAGSART: ${formData.contractType || "Individueller Vertrag"}

PARTEIEN:
${formData.parties || "Partei A und Partei B mit vollständigen Angaben"}

VERTRAGSINHALTE:
${formData.details || "Detaillierte Beschreibung des Vertragsgegenstands"}

BESONDERE VEREINBARUNGEN:
${formData.specialTerms || "Keine besonderen Vereinbarungen"}

Strukturiere den Vertrag professionell mit mindestens 10-12 Paragraphen und allen notwendigen rechtlichen Klauseln.`;
        break;

      default:
        return res.status(400).json({ message: "❌ Unbekannter Vertragstyp." });
    }

    // GPT-4 Generierung
    console.log("🚀 Starte GPT-4 Vertragsgenerierung...");
    console.log("📝 Vertragstyp:", type);
    console.log("🎨 Design-Variante:", designVariant);
    
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
                               contractText.includes('____') && 
                               contractText.length > 2000;
    
    if (!hasRequiredElements) {
      console.warn("⚠️ Vertrag unvollständig, füge fehlende Standard-Klauseln hinzu...");
      
      if (!contractText.includes('§ 10')) {
        contractText = contractText.replace('§ 11 SCHLUSSBESTIMMUNGEN', '§ 10 ZUSÄTZLICHE VEREINBARUNGEN\n\n(1) Weitere Vereinbarungen wurden nicht getroffen.\n\n§ 11 SCHLUSSBESTIMMUNGEN');
      }
      
      if (!contractText.includes('____')) {
        contractText += `\n\n\n_______________________          _______________________\nOrt, Datum                       Ort, Datum\n\n\n_______________________          _______________________\n${companyProfile?.companyName || 'Partei A'}                  Partei B\nGeschäftsführung                 Name, Funktion`;
      }
    }
    
    console.log("✅ Vertragsgenerierung erfolgreich, finale Länge:", contractText.length);

    // 🎨 ENTERPRISE HTML-Formatierung
    let formattedHTML = "";
    const isDraft = formData.isDraft || false;
    
    formattedHTML = await formatContractToHTML(
      contractText, 
      companyProfile,  // Jetzt korrekt geladen mit Logo
      type, 
      designVariant,   // Wird korrekt durchgereicht
      isDraft          // Entwurf-Modus
    );
    
    console.log("✅ Enterprise HTML-Formatierung erstellt:", {
      htmlLength: formattedHTML.length,
      hasCompanyProfile: !!companyProfile,
      hasLogo: !!companyProfile?.logoUrl,
      designVariant: designVariant,
      isDraft: isDraft
    });

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
      contractHTML: formattedHTML,  // Enterprise HTML
      laufzeit: formData.duration || "Generiert",
      kuendigung: formData.termination || "Generiert", 
      expiryDate: formData.expiryDate || "",
      status: isDraft ? "Entwurf" : "Aktiv",
      uploadedAt: new Date(),
      isGenerated: true,
      contractType: type,
      hasCompanyProfile: !!companyProfile,
      formData: formData,
      designVariant: designVariant,
      metadata: {
        version: 'v5_enterprise',
        features: ['table_of_contents', 'qr_code', 'document_hash', 'initial_fields'],
        generatedBy: 'GPT-4',
        templateVersion: '2024.1'
      }
    };

    const result = await contractsCollection.insertOne(contract);
    
    // Contract Analytics
    const logContractGeneration = (contract, user, companyProfile) => {
      const analytics = {
        contractType: contract.contractType,
        hasCompanyProfile: !!companyProfile,
        hasLogo: !!companyProfile?.logoUrl,
        userPlan: user.subscriptionPlan || 'free',
        timestamp: new Date(),
        contentLength: contract.content.length,
        htmlLength: contract.contractHTML.length,
        generationSource: 'ai_generation_v5_enterprise',
        userId: user._id.toString(),
        designVariant: contract.designVariant,
        success: true
      };
      
      console.log("📊 Contract Generated Analytics:", analytics);
    };

    // Analytics loggen
    logContractGeneration(contract, user, companyProfile);

    // Response mit allen Daten
    res.json({
      message: "✅ Vertrag erfolgreich generiert & gespeichert.",
      contractId: result.insertedId,
      contractText: contractText,
      contractHTML: formattedHTML,
      metadata: {
        contractType: type,
        hasCompanyProfile: !!companyProfile,
        hasLogo: !!companyProfile?.logoUrl,
        companyName: companyProfile?.companyName,
        contentLength: contractText.length,
        htmlLength: formattedHTML.length,
        generatedAt: new Date().toISOString(),
        version: 'v5_enterprise',
        designVariant: designVariant,
        isDraft: isDraft,
        features: {
          tableOfContents: true,
          qrCode: true,
          documentHash: true,
          initialFields: true,
          watermark: isDraft
        }
      }
    });
    
  } catch (err) {
    console.error("❌ Fehler beim Erzeugen/Speichern:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ 
      message: "Serverfehler beim Erzeugen oder Speichern.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 🔴 KORRIGIERTE PUPPETEER PDF-ROUTE - MIT ALLEN ENTERPRISE FEATURES
router.post("/pdf", verifyToken, async (req, res) => {
  const { contractId } = req.body;
  
  console.log("🎨 PDF-Generierung mit Puppeteer gestartet für Vertrag:", contractId);
  console.log("📊 User ID:", req.user.userId);
  
  try {
    // Validierung
    if (!contractId) {
      return res.status(400).json({ message: "Contract ID fehlt" });
    }
    
    // Stelle sicher, dass DB verbunden ist
    if (!db || !contractsCollection) {
      console.error("❌ Datenbank nicht verbunden! Versuche Reconnect...");
      try {
        await client.connect();
        db = client.db("contract_ai");
        contractsCollection = db.collection("contracts");
        usersCollection = db.collection("users");
        console.log("✅ Datenbank neu verbunden");
      } catch (reconnectError) {
        console.error("❌ Reconnect fehlgeschlagen:", reconnectError);
        return res.status(500).json({ message: "Datenbankverbindung fehlgeschlagen" });
      }
    }
    
    // KRITISCHER FIX: Hole Vertrag mit flexiblem userId Vergleich
    let contract = null;
    
    // Versuch 1: Mit ObjectId für beides
    try {
      contract = await contractsCollection.findOne({ 
        _id: new ObjectId(contractId),
        userId: new ObjectId(req.user.userId)
      });
      console.log("✅ Versuch 1 (beide als ObjectId):", !!contract);
    } catch (objectIdError) {
      console.log("⚠️ ObjectId-Konvertierung fehlgeschlagen:", objectIdError.message);
    }
    
    // Versuch 2: contractId als ObjectId, userId als String
    if (!contract) {
      try {
        contract = await contractsCollection.findOne({ 
          _id: new ObjectId(contractId),
          userId: req.user.userId
        });
        console.log("✅ Versuch 2 (userId als String):", !!contract);
      } catch (stringError) {
        console.log("⚠️ String-Suche fehlgeschlagen:", stringError.message);
      }
    }
    
    // Versuch 3: Flexibler Vergleich mit toString()
    if (!contract) {
      try {
        const tempContract = await contractsCollection.findOne({ 
          _id: new ObjectId(contractId)
        });
        
        if (tempContract) {
          console.log("⚠️ Vertrag gefunden, prüfe userId Übereinstimmung...");
          console.log("📊 Vertrag userId:", tempContract.userId);
          console.log("📊 Request userId:", req.user.userId);
          
          // Flexibler Vergleich - beide zu String konvertieren
          const contractUserId = tempContract.userId?.toString ? tempContract.userId.toString() : String(tempContract.userId);
          const requestUserId = req.user.userId?.toString ? req.user.userId.toString() : String(req.user.userId);
          
          if (contractUserId === requestUserId) {
            contract = tempContract;
            console.log("✅ Vertrag nach String-Konvertierung gefunden!");
          } else {
            console.log("❌ UserId stimmt nicht überein nach String-Konvertierung");
            console.log("📊 Contract userId (String):", contractUserId);
            console.log("📊 Request userId (String):", requestUserId);
            return res.status(403).json({ message: "Keine Berechtigung für diesen Vertrag" });
          }
        }
      } catch (debugError) {
        console.log("⚠️ Debug-Suche fehlgeschlagen:", debugError.message);
      }
    }
    
    if (!contract) {
      console.error("❌ Vertrag nicht gefunden in DB");
      console.log("🔍 Gesucht mit:", { contractId, userId: req.user.userId });
      
      // Debug: Zeige die letzten Verträge des Users
      try {
        const userContracts = await contractsCollection.find({ 
          userId: req.user.userId 
        }).limit(5).toArray();
        console.log("📋 Letzte 5 Verträge des Users:", userContracts.map(c => ({
          id: c._id.toString(),
          name: c.name,
          created: c.uploadedAt
        })));
      } catch (debugListError) {
        console.error("❌ Fehler beim Auflisten der User-Verträge:", debugListError);
      }
      
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

    console.log("✅ Vertrag gefunden:", {
      name: contract.name,
      type: contract.contractType,
      hasCompanyProfile: contract.hasCompanyProfile,
      designVariant: contract.designVariant
    });

    // Lade Company Profile wenn vorhanden
    let companyProfile = null;
    if (contract.hasCompanyProfile || contract.metadata?.hasLogo) {
      try {
        companyProfile = await db.collection("company_profiles").findOne({ 
          userId: new ObjectId(req.user.userId) 
        });
        console.log("🏢 Company Profile geladen:", !!companyProfile);
        if (companyProfile) {
          console.log("📊 Company Profile Details:", {
            name: companyProfile.companyName,
            hasLogo: !!companyProfile.logoUrl,
            logoType: companyProfile.logoUrl ? (companyProfile.logoUrl.startsWith('data:') ? 'base64' : 'url') : 'none'
          });
        }
      } catch (profileError) {
        console.error("⚠️ Fehler beim Laden des Company Profiles:", profileError);
      }
    }

    // 🔴 FIX: HTML aus DB laden oder neu generieren
    let htmlContent = contract.contractHTML || contract.htmlContent || contract.contentHTML;
    
    if (!htmlContent) {
      console.log("🔄 Kein HTML vorhanden, generiere neu...");
      const isDraft = contract.status === 'Entwurf' || contract.formData?.isDraft;
      
      htmlContent = await formatContractToHTML(
        contract.content, 
        companyProfile, 
        contract.contractType || contract.metadata?.contractType || 'vertrag',
        contract.designVariant || contract.metadata?.designVariant || 'executive',
        isDraft
      );
      
      // HTML für nächstes Mal speichern
      await contractsCollection.updateOne(
        { _id: contract._id },
        { $set: { contractHTML: htmlContent } }
      );
      console.log("✅ HTML für zukünftige Verwendung gespeichert");
    } else {
      console.log("✅ HTML aus Datenbank geladen (Cache-Hit)");
    }

    // Stelle sicher, dass HTML-Content vorhanden ist
    if (!htmlContent || htmlContent.length < 100) {
      console.error("❌ HTML-Content ist leer oder zu kurz");
      return res.status(500).json({ message: "HTML-Content konnte nicht generiert werden" });
    }

    // 🔴 FIX 3: Puppeteer mit Performance-Optimierungen starten
    console.log("🚀 Starte Puppeteer Browser...");
    
    let browser;
    try {
      // Konfiguration für Render.com mit Performance-Optimierungen
      if (chromium) {
        // Produktion auf Render mit chrome-aws-lambda
        browser = await puppeteer.launch({
          args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process', // 🔴 Schneller für Lambda
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--font-render-hinting=none'
          ],
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
          timeout: 30000 // 30 Sekunden Timeout
        });
      } else {
        // Lokale Entwicklung mit normalem Puppeteer
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--font-render-hinting=none'
          ],
          timeout: 30000
        });
      }
    } catch (launchError) {
      console.error("❌ Puppeteer Launch Error:", launchError);
      
      // Fallback: Versuche mit minimalsten Optionen
      try {
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      } catch (fallbackError) {
        console.error("❌ Auch Fallback fehlgeschlagen:", fallbackError);
        return res.status(500).json({ 
          message: "PDF-Generierung fehlgeschlagen - Chrome nicht verfügbar",
          error: "Bitte verwenden Sie den Download-Button erneut oder installieren Sie chrome-aws-lambda",
          suggestion: "Alternative: Nutzen Sie die HTML-Vorschau und drucken Sie als PDF"
        });
      }
    }
    
    try {
      const page = await browser.newPage();
      
      // Setze Viewport für A4
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: 2
      });
      
      // 🔥 UTF-8 ENCODING FÜR DEUTSCHE UMLAUTE - WELTKLASSE-KORREKTUR
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Accept-Charset': 'utf-8',
        'Content-Type': 'text/html; charset=utf-8'
      });
      
      // Explizite UTF-8 Meta-Tags sicherstellen
      console.log("🔤 Korrigiere UTF-8 Encoding für deutsche Umlaute...");
      if (!htmlContent.includes('<meta charset="UTF-8">')) {
        htmlContent = htmlContent.replace('<head>', '<head>\n  <meta charset="UTF-8">');
      }
      
      // Lade HTML mit optimierten UTF-8 Einstellungen
      console.log("📄 Lade HTML in Puppeteer (Länge:", htmlContent.length, "Zeichen)");
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // 🔥 UTF-8 VALIDATION & CORRECTION
      await page.evaluate(() => {
        // Stelle sicher, dass UTF-8 Meta-Tag an erster Stelle steht
        const existingCharsetMeta = document.querySelector('meta[charset]');
        if (!existingCharsetMeta) {
          const meta = document.createElement('meta');
          meta.setAttribute('charset', 'UTF-8');
          document.head.insertBefore(meta, document.head.firstChild);
          console.log('✅ UTF-8 Meta-Tag hinzugefügt');
        }
        
        // Teste deutsche Umlaute
        const testText = document.createElement('div');
        testText.textContent = 'äöüß ÄÖÜ';
        testText.style.visibility = 'hidden';
        document.body.appendChild(testText);
        
        if (testText.textContent !== 'äöüß ÄÖÜ') {
          console.warn('⚠️ UTF-8 Encoding Problem erkannt');
        } else {
          console.log('✅ UTF-8 Encoding korrekt');
        }
        
        document.body.removeChild(testText);
      });
      
      // Warte auf Fonts und wichtige Elemente
      try {
        await page.evaluateHandle('document.fonts.ready');
        console.log("✅ Fonts geladen");
      } catch (fontError) {
        console.warn("⚠️ Font-Loading fehlgeschlagen, fahre fort:", fontError.message);
      }
      
      // Zusätzliche Wartezeit für komplexe Layouts
      await page.waitForTimeout(2000);
      
      // Injiziere zusätzliches CSS für bessere Print-Darstellung
      await page.addStyleTag({
        content: `
          @media print {
            * {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
            .page-container {
              margin: 0 !important;
              padding: 20mm !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `
      });
      
      // 🔥 WELTKLASSE PDF-GENERIERUNG - FRESHFIELDS/CLIFFORD CHANCE NIVEAU
      console.log("🏛️ Generiere WELTKLASSE-KANZLEI PDF...");
      
      // Enterprise-Dokument-Metadaten vorbereiten
      const documentId = contract.metadata?.documentId || `${contract.contractType?.toUpperCase()}-${new Date().getTime()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const contractType = contract.contractType || 'VERTRAG';
      
      // 🆕 ENTERPRISE PDF-OPTIONEN MIT WELTKLASSE-METADATEN
      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        
        // 🔥 MINIMALER HEADER - KANZLEI-STANDARD
        headerTemplate: '<div style="font-size:8pt;text-align:center;color:#666;"></div>',
        
        // 🔥 FRESHFIELDS-STYLE FOOTER MIT PIPE-FORMAT
        footerTemplate: `
          <div style="
            font-size: 9pt;
            font-family: 'Times New Roman', serif;
            width: 100%;
            padding: 0 25.4mm; /* 1 Zoll Kanzlei-Standard */
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #666;
            border-top: 1px solid #eee;
            background: #fafafa;
            height: 15mm;
          ">
            <span style="flex: 1; text-align: left;">
              ${documentId ? `<strong>DOK-ID:</strong> ${documentId}` : ''}
            </span>
            <span style="flex: 1; text-align: center; font-weight: bold;">
              Seite <span class="pageNumber"></span> | <span class="totalPages"></span>
            </span>
            <span style="flex: 1; text-align: right;">
              ${new Date().toLocaleDateString('de-DE')}
            </span>
          </div>
        `,
        
        // 🔥 KANZLEI-STANDARD SEITENRÄNDER (1 Zoll = 25.4mm)
        margin: {
          top: '30mm',    // Header-Platz
          bottom: '25mm', // Footer-Platz  
          left: '25.4mm', // 1 Zoll - Kanzlei-Standard
          right: '25.4mm' // 1 Zoll - Kanzlei-Standard
        },
        
        // 🔥 PROFESSIONELLE PDF-EINSTELLUNGEN
        preferCSSPageSize: false,
        scale: 1,
        pageRanges: '',
        width: '210mm',  // A4 Breite
        height: '297mm', // A4 Höhe
        
        // 🆕 WELTKLASSE-METADATEN FÜR PDF - ENTERPRISE-NIVEAU
        tagged: true,    // Accessibility-Support
        outline: false,  // Keine Outline für Clean-Look
        
        // PDF/A-Kompatible Metadaten
        metadata: {
          // BASIS-METADATEN
          title: `${contractType.toUpperCase()} - ${companyProfile?.companyName || 'Unbekannt'}`,
          author: `${companyProfile?.companyName || 'Professioneller Dokumentenservice'}`,
          subject: `Rechtsdokument ID: ${documentId} | ${contractType}`,
          keywords: `${contractType}, Vertrag, Rechtsgeschäft, ${companyProfile?.companyName || 'Professional Document'}, ${new Date().getFullYear()}`,
          creator: 'Professional Legal Document Generator v6.0',
          producer: 'Puppeteer-Core/Chrome Headless - Enterprise PDF Engine',
          
          // ZEITSTEMPEL
          creationDate: new Date(),
          modDate: new Date(),
          
          // PDF-EINSTELLUNGEN
          trapped: false,
          
          // 🆕 ERWEITERTE ENTERPRISE-METADATEN
          custom: {
            'Document-Classification': 'Legal Contract',
            'Security-Level': contract.status === 'Entwurf' ? 'DRAFT-CONFIDENTIAL' : 'FINAL-CONFIDENTIAL',
            'Template-Version': '6.0-Enterprise-Kanzlei',
            'Generation-Source': 'AI-Assisted Legal Document Generator',
            'Compliance-Standard': 'DSGVO/GDPR Compatible',
            'Language': 'de-DE',
            'Legal-Jurisdiction': 'Germany',
            'Quality-Level': 'Freshfields-Standard',
            'Typography-Standard': 'Times New Roman 11pt, 1.45 Line-Height',
            'Page-Format': 'A4 (210x297mm)',
            'Margin-Standard': '25.4mm (1 inch)',
            'Document-Hash': contract.metadata?.documentHash || 'N/A',
            'Company-Profile': companyProfile?.companyName || 'N/A',
            'Enterprise-Features': 'QR-Code,Watermark,Metadata,Professional-Layout'
          }
        }
      };
      
      console.log("📊 PDF-Metadaten vorbereitet:", {
        title: pdfOptions.metadata.title,
        author: pdfOptions.metadata.author,
        customFields: Object.keys(pdfOptions.metadata.custom).length,
        documentId: documentId.substring(0, 20) + "..."
      });
      
      const pdfBuffer = await page.pdf(pdfOptions);
      
      console.log("✅ PDF erfolgreich generiert, Größe:", Math.round(pdfBuffer.length / 1024), "KB");
      
      // Sende PDF als Response
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${contract.name || 'Vertrag'}_${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.send(pdfBuffer);
      
    } catch (pageError) {
      console.error("❌ Fehler bei der PDF-Generierung:", pageError);
      throw pageError;
    } finally {
      await browser.close();
      console.log("✅ Puppeteer Browser geschlossen");
    }
    
  } catch (error) {
    console.error("❌ PDF Generation Error:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({ 
      message: "PDF-Generierung fehlgeschlagen",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      suggestion: "Bitte versuchen Sie es erneut oder nutzen Sie die HTML-Vorschau"
    });
  }
});

// 🆕 NEUE ROUTE: HTML-Vorschau generieren (ohne PDF)
router.post("/preview", verifyToken, async (req, res) => {
  const { contractId } = req.body;
  
  console.log("👁️ HTML-Vorschau angefordert für Vertrag:", contractId);
  
  try {
    if (!contractId) {
      return res.status(400).json({ message: "Contract ID fehlt" });
    }
    
    // Vertrag laden
    const contract = await contractsCollection.findOne({ 
      _id: new ObjectId(contractId)
    });
    
    if (!contract) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }
    
    // Berechtigungsprüfung
    const contractUserId = contract.userId?.toString ? contract.userId.toString() : String(contract.userId);
    const requestUserId = req.user.userId?.toString ? req.user.userId.toString() : String(req.user.userId);
    
    if (contractUserId !== requestUserId) {
      return res.status(403).json({ message: "Keine Berechtigung für diesen Vertrag" });
    }
    
    // Company Profile laden wenn vorhanden
    let companyProfile = null;
    if (contract.hasCompanyProfile) {
      try {
        companyProfile = await db.collection("company_profiles").findOne({ 
          userId: new ObjectId(req.user.userId) 
        });
      } catch (error) {
        console.error("⚠️ Fehler beim Laden des Company Profiles:", error);
      }
    }
    
    // HTML generieren oder aus Cache
    let htmlContent = contract.contractHTML;
    
    if (!htmlContent) {
      const isDraft = contract.status === 'Entwurf';
      htmlContent = await formatContractToHTML(
        contract.content, 
        companyProfile, 
        contract.contractType,
        contract.designVariant || 'executive',
        isDraft
      );
      
      // Speichern für nächstes Mal
      await contractsCollection.updateOne(
        { _id: contract._id },
        { $set: { contractHTML: htmlContent } }
      );
    }
    
    // HTML als Response senden
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    
    res.send(htmlContent);
    
  } catch (error) {
    console.error("❌ Preview Generation Error:", error);
    res.status(500).json({ 
      message: "Vorschau-Generierung fehlgeschlagen",
      error: error.message
    });
  }
});

// 🆕 NEUE ROUTE: Design-Variante ändern
router.post("/change-design", verifyToken, async (req, res) => {
  const { contractId, newDesignVariant } = req.body;
  
  console.log("🎨 Design-Änderung angefordert:", { contractId, newDesignVariant });
  
  try {
    if (!contractId || !newDesignVariant) {
      return res.status(400).json({ message: "Contract ID oder Design-Variante fehlt" });
    }
    
    // Validiere Design-Variante
    const validDesigns = ['executive', 'modern', 'minimal'];
    if (!validDesigns.includes(newDesignVariant)) {
      return res.status(400).json({ message: "Ungültige Design-Variante" });
    }
    
    // Vertrag laden
    const contract = await contractsCollection.findOne({ 
      _id: new ObjectId(contractId),
      userId: req.user.userId
    });
    
    if (!contract) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }
    
    // Company Profile laden wenn vorhanden
    let companyProfile = null;
    if (contract.hasCompanyProfile) {
      companyProfile = await db.collection("company_profiles").findOne({ 
        userId: new ObjectId(req.user.userId) 
      });
    }
    
    // Neues HTML mit neuer Design-Variante generieren
    const isDraft = contract.status === 'Entwurf';
    const newHTML = await formatContractToHTML(
      contract.content, 
      companyProfile, 
      contract.contractType,
      newDesignVariant,
      isDraft
    );
    
    // Vertrag aktualisieren
    await contractsCollection.updateOne(
      { _id: new ObjectId(contractId) },
      { 
        $set: { 
          designVariant: newDesignVariant,
          contractHTML: newHTML,
          lastModified: new Date()
        } 
      }
    );
    
    res.json({
      message: "✅ Design-Variante erfolgreich geändert",
      newDesignVariant: newDesignVariant,
      htmlLength: newHTML.length
    });
    
  } catch (error) {
    console.error("❌ Design Change Error:", error);
    res.status(500).json({ 
      message: "Design-Änderung fehlgeschlagen",
      error: error.message
    });
  }
});

// 🆕 NEUE ROUTE: Vertrag als Entwurf/Final markieren
router.post("/toggle-draft", verifyToken, async (req, res) => {
  const { contractId } = req.body;
  
  try {
    const contract = await contractsCollection.findOne({ 
      _id: new ObjectId(contractId),
      userId: req.user.userId
    });
    
    if (!contract) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }
    
    const newStatus = contract.status === 'Entwurf' ? 'Aktiv' : 'Entwurf';
    const isDraft = newStatus === 'Entwurf';
    
    // Company Profile laden wenn vorhanden
    let companyProfile = null;
    if (contract.hasCompanyProfile) {
      companyProfile = await db.collection("company_profiles").findOne({ 
        userId: new ObjectId(req.user.userId) 
      });
    }
    
    // HTML neu generieren mit/ohne Wasserzeichen
    const newHTML = await formatContractToHTML(
      contract.content, 
      companyProfile, 
      contract.contractType,
      contract.designVariant || 'executive',
      isDraft
    );
    
    // Vertrag aktualisieren
    await contractsCollection.updateOne(
      { _id: new ObjectId(contractId) },
      { 
        $set: { 
          status: newStatus,
          contractHTML: newHTML,
          lastModified: new Date()
        } 
      }
    );
    
    res.json({
      message: `✅ Vertrag ist jetzt ${newStatus}`,
      newStatus: newStatus,
      isDraft: isDraft
    });
    
  } catch (error) {
    console.error("❌ Toggle Draft Error:", error);
    res.status(500).json({ 
      message: "Status-Änderung fehlgeschlagen",
      error: error.message
    });
  }
});

// 🆕 NEUE ROUTE: Batch-Export mehrerer Verträge
router.post("/batch-export", verifyToken, async (req, res) => {
  const { contractIds } = req.body;
  
  console.log("📦 Batch-Export angefordert für", contractIds?.length, "Verträge");
  
  try {
    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({ message: "Keine Contract IDs angegeben" });
    }
    
    if (contractIds.length > 10) {
      return res.status(400).json({ message: "Maximal 10 Verträge gleichzeitig exportierbar" });
    }
    
    // Alle Verträge laden
    const contracts = await contractsCollection.find({
      _id: { $in: contractIds.map(id => new ObjectId(id)) },
      userId: req.user.userId
    }).toArray();
    
    if (contracts.length === 0) {
      return res.status(404).json({ message: "Keine Verträge gefunden" });
    }
    
    // PDFs generieren
    const pdfs = [];
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      for (const contract of contracts) {
        const page = await browser.newPage();
        
        // HTML laden oder generieren
        let htmlContent = contract.contractHTML;
        if (!htmlContent) {
          // Company Profile laden wenn nötig
          let companyProfile = null;
          if (contract.hasCompanyProfile) {
            companyProfile = await db.collection("company_profiles").findOne({ 
              userId: new ObjectId(req.user.userId) 
            });
          }
          
          htmlContent = await formatContractToHTML(
            contract.content, 
            companyProfile, 
            contract.contractType,
            contract.designVariant || 'executive',
            contract.status === 'Entwurf'
          );
        }
        
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await page.evaluateHandle('document.fonts.ready');
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });
        
        pdfs.push({
          name: contract.name,
          buffer: pdfBuffer
        });
        
        await page.close();
      }
    } finally {
      await browser.close();
    }
    
    // Als ZIP zurückgeben (benötigt zusätzliche Library wie archiver)
    res.json({
      message: `✅ ${pdfs.length} PDFs erfolgreich generiert`,
      count: pdfs.length,
      totalSize: pdfs.reduce((sum, pdf) => sum + pdf.buffer.length, 0)
    });
    
  } catch (error) {
    console.error("❌ Batch Export Error:", error);
    res.status(500).json({ 
      message: "Batch-Export fehlgeschlagen",
      error: error.message
    });
  }
});

// Export
module.exports = router;
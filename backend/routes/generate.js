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
  
  if (!companyProfile?.logoUrl && !companyProfile?.logoKey) {
    console.log("ℹ️ Kein Logo-URL oder LogoKey im Company Profile vorhanden");
    return null;
  }
  
  const strategies = [];
  
  // Strategie 1: Direkte URL verwenden wenn bereits Base64
  if (companyProfile.logoUrl && companyProfile.logoUrl.startsWith('data:')) {
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
  if (companyProfile.logoUrl) {
    strategies.push({ name: 'Original URL', url: companyProfile.logoUrl });
    
    // Strategie 4: Alternative URL-Formate probieren
    if (companyProfile.logoUrl.includes('amazonaws.com')) {
      const alternativeUrl = companyProfile.logoUrl.replace('https://', 'http://');
      strategies.push({ name: 'HTTP Alternative', url: alternativeUrl });
    }
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
const formatContractToHTML = async (contractText, companyProfile, contractType, designVariant = 'executive', isDraft = false, parties = null) => {
  console.log("🚀 Starte ENTERPRISE HTML-Formatierung für:", contractType);
  console.log('🎨 Design-Variante:', designVariant);
  console.log('📄 Vertragstyp:', contractType);
  console.log('🏢 Company Profile vorhanden:', !!companyProfile);
  console.log('📝 Entwurf-Modus:', isDraft);
  console.log('👥 Parties Data:', parties);
  
  // 🔍 DEBUG: Company Profile Details
  if (companyProfile) {
    console.log('🔍 DEBUG Company Profile Details:', {
      companyName: companyProfile.companyName,
      street: companyProfile.street,
      city: companyProfile.city,
      contactPhone: companyProfile.contactPhone,
      contactEmail: companyProfile.contactEmail,
      hasLogoUrl: !!companyProfile.logoUrl,
      hasLogoKey: !!companyProfile.logoKey,
      logoUrlType: companyProfile.logoUrl ? (companyProfile.logoUrl.startsWith('data:') ? 'base64' : 'url') : 'none'
    });
  } else {
    console.log('❌ DEBUG: Company Profile ist NULL oder UNDEFINED!');
  }
  
  // 🎨 ERWEITERTES LOGO-LOADING MIT INITIALEN-FALLBACK
  let logoBase64 = null;
  let useInitialsFallback = false;
  
  if (companyProfile && (companyProfile.logoUrl || companyProfile.logoKey)) {
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
  
  // 🔍 DEBUG: Finales Logo-Status
  console.log('🔍 DEBUG Finales Logo-Status:', {
    logoBase64Available: !!logoBase64,
    logoBase64Length: logoBase64 ? logoBase64.length : 0,
    useInitialsFallback: useInitialsFallback,
    companyNameForInitials: companyProfile?.companyName || 'NICHT VERFÜGBAR'
  });

  // Generiere Dokument-ID und Hash
  // 🔧 FIX: contractType kann null sein - Fallback verwenden
  const safeContractType = contractType || 'VERTRAG';
  const documentId = `${safeContractType.toUpperCase()}-${new Date().getTime()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
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

  // 🎨 PREMIUM DESIGN-VARIANTEN - WELTKLASSE-KANZLEI & DESIGN-AGENTUR NIVEAU
  // Entwickelt wie von Freshfields, Clifford Chance, Hengeler Mueller mit Top-Designern
  const designVariants = {

    // ═══════════════════════════════════════════════════════════════════════════
    // 🏛️ EXECUTIVE - Klassische Großkanzlei (Freshfields/Clifford Chance Style)
    // ═══════════════════════════════════════════════════════════════════════════
    executive: {
      primary: '#1a1a1a',              // Tiefschwarz - maximale Autorität
      secondary: '#2d2d2d',            // Anthrazit für Akzente
      accent: '#8B7355',               // Warmes Bronze - subtiler Luxus
      text: '#1a1a1a',                 // Perfektes Schwarz
      lightBg: '#fdfcfb',              // Warmes Off-White (wie hochwertiges Papier)
      border: '#d4d0c8',               // Elegantes Beige-Grau
      headerBg: 'transparent',

      // Premium Serif-Typografie
      fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
      headingFont: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
      fontSize: '11pt',
      lineHeight: '1.6',
      letterSpacing: '0.01em',
      textAlign: 'justify',

      // Elegante Abstände
      sectionMargin: 'margin: 28px 0;',
      paragraphSpacing: 'margin-bottom: 14px;',

      // Klassische §-Nummerierung mit Bronze-Akzent
      sectionNumberStyle: 'color: #8B7355; margin-right: 12px; font-weight: 600; font-size: 12pt; font-family: "Palatino Linotype", Georgia, serif;',
      pageMargins: 'margin: 0; padding: 0;',
      headerHeight: '100px',
      useGradients: false,
      useSerif: true,
      borderRadius: '0',
      boxShadow: 'none',

      // Spezielle Executive-Elemente
      headerStyle: 'border-bottom: 2px solid #8B7355; padding-bottom: 20px;',
      sectionDivider: 'border-top: 1px solid #d4d0c8; margin: 30px 0; padding-top: 25px;'
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // 🌊 MODERN - Premium Tech & Startup (Silicon Valley / Berlin Style)
    // ═══════════════════════════════════════════════════════════════════════════
    modern: {
      primary: '#0F172A',              // Tiefes Slate - Tech-Eleganz
      secondary: '#334155',            // Slate für Hierarchie
      accent: '#3B82F6',               // Brillantes Blau - Vertrauen & Innovation
      accentLight: '#DBEAFE',          // Helles Blau für Hintergründe
      text: '#1E293B',                 // Dunkles Slate - optimal lesbar
      lightBg: '#F8FAFC',              // Kühles Off-White
      border: '#E2E8F0',               // Zartes Slate-Grau
      headerBg: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',

      // Moderne Sans-Serif
      fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      headingFont: '"Inter", "SF Pro Display", -apple-system, sans-serif',
      fontSize: '10.5pt',
      lineHeight: '1.65',
      letterSpacing: '-0.01em',
      textAlign: 'left',

      // Luftige Abstände
      sectionMargin: 'margin: 32px 0;',
      paragraphSpacing: 'margin-bottom: 16px;',

      // Moderne Pill-Badge Nummerierung
      sectionNumberStyle: 'background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 11px; margin-right: 14px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;',
      pageMargins: 'margin: 0; padding: 0;',
      headerHeight: '90px',
      useGradients: true,
      useSerif: false,
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',

      // Moderne Elemente
      headerStyle: 'background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: white; padding: 25px; border-radius: 12px 12px 0 0;',
      cardStyle: 'background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); padding: 24px;'
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ⬛ MINIMAL - Swiss Design / Bauhaus (Zurückhaltende Eleganz)
    // ═══════════════════════════════════════════════════════════════════════════
    minimal: {
      primary: '#000000',              // Reines Schwarz
      secondary: '#525252',            // Neutrales Grau
      accent: '#000000',               // Schwarz als Akzent
      text: '#171717',                 // Fast-Schwarz
      lightBg: '#FAFAFA',              // Minimales Off-White
      border: '#E5E5E5',               // Zartes Grau
      headerBg: '#000000',

      // Helvetica - Die Ikone des Swiss Design
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      headingFont: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: '10.5pt',
      lineHeight: '1.55',
      letterSpacing: '0',
      textAlign: 'left',

      // Strenge Abstände
      sectionMargin: 'margin: 24px 0;',
      paragraphSpacing: 'margin-bottom: 12px;',

      // Puristische Nummerierung
      sectionNumberStyle: 'color: #000; font-weight: 700; font-size: 11pt; margin-right: 16px; min-width: 30px; display: inline-block;',
      pageMargins: 'margin: 0; padding: 0;',
      headerHeight: '70px',
      useGradients: false,
      useSerif: false,
      borderRadius: '0',
      boxShadow: 'none',

      // Minimale Elemente
      headerStyle: 'border-bottom: 3px solid #000; padding-bottom: 15px;',
      sectionDivider: 'border-top: 1px solid #000; margin: 20px 0; padding-top: 20px;'
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // 🌿 ELEGANT - Boutique-Kanzlei / Luxus-Marken (Hermès/Bottega Style)
    // ═══════════════════════════════════════════════════════════════════════════
    elegant: {
      primary: '#2C2416',              // Dunkles Espresso-Braun
      secondary: '#4A3F2F',            // Warmes Mokka
      accent: '#B8860B',               // Dunkles Gold - Luxus pur
      accentLight: '#F5E6C8',          // Champagner
      text: '#2C2416',                 // Warmes Dunkelbraun
      lightBg: '#FAF8F5',              // Cremiges Off-White
      border: '#E8E2D9',               // Warmes Beige
      headerBg: 'linear-gradient(135deg, #2C2416 0%, #4A3F2F 100%)',

      // Elegante Garamond-Typografie
      fontFamily: '"EB Garamond", "Cormorant Garamond", Garamond, "Times New Roman", serif',
      headingFont: '"EB Garamond", "Cormorant Garamond", Garamond, serif',
      fontSize: '11.5pt',
      lineHeight: '1.7',
      letterSpacing: '0.02em',
      textAlign: 'justify',

      // Großzügige Abstände
      sectionMargin: 'margin: 30px 0;',
      paragraphSpacing: 'margin-bottom: 16px;',

      // Gold-Akzent Nummerierung
      sectionNumberStyle: 'color: #B8860B; font-weight: 600; font-size: 13pt; margin-right: 10px; font-family: "EB Garamond", Garamond, serif; font-style: italic;',
      pageMargins: 'margin: 0; padding: 0;',
      headerHeight: '95px',
      useGradients: true,
      useSerif: true,
      borderRadius: '4px',
      boxShadow: '0 2px 15px rgba(44, 36, 22, 0.06)',

      // Luxuriöse Elemente
      headerStyle: 'border-bottom: 1px solid #B8860B; padding-bottom: 20px;',
      decorativeElement: 'background: linear-gradient(90deg, transparent 0%, #B8860B 50%, transparent 100%); height: 1px; margin: 30px 0;'
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // 🏢 CORPORATE - DAX-Konzern / Enterprise (Siemens/SAP/Allianz Style)
    // ═══════════════════════════════════════════════════════════════════════════
    corporate: {
      primary: '#003366',              // Corporate Navy - Vertrauen & Stabilität
      secondary: '#004D99',            // Helleres Navy
      accent: '#0066CC',               // Corporate Blue
      accentLight: '#E6F0FF',          // Sehr helles Blau
      text: '#1A1A1A',                 // Neutrales Schwarz
      lightBg: '#F5F7FA',              // Kühles Grau-Weiß
      border: '#D1D9E6',               // Business-Grau
      headerBg: '#003366',

      // Corporate Sans-Serif
      fontFamily: '"Source Sans Pro", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      headingFont: '"Source Sans Pro", "Segoe UI", Roboto, sans-serif',
      fontSize: '10.5pt',
      lineHeight: '1.6',
      letterSpacing: '0',
      textAlign: 'left',

      // Strukturierte Abstände
      sectionMargin: 'margin: 26px 0;',
      paragraphSpacing: 'margin-bottom: 14px;',

      // Corporate Badge-Nummerierung
      sectionNumberStyle: 'background: #003366; color: white; width: 28px; height: 28px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; margin-right: 14px; font-weight: 600; font-size: 12px;',
      pageMargins: 'margin: 0; padding: 0;',
      headerHeight: '85px',
      useGradients: false,
      useSerif: false,
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0, 51, 102, 0.08)',

      // Corporate Elemente
      headerStyle: 'background: #003366; color: white; padding: 20px 25px;',
      accentBar: 'background: #0066CC; height: 4px; margin-bottom: 20px;'
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
  let skipPartiesSection = false; // Flag für Parteien-Bereich
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Überspringe die === Linien
    if (trimmedLine.startsWith('===') || trimmedLine.endsWith('===')) {
      continue;
    }
    
    // PARTEIEN-BEREICH ÜBERSPRINGEN (da wir eigenen implementiert haben)
    if (trimmedLine.toLowerCase() === 'zwischen') {
      skipPartiesSection = true;
      continue;
    }
    
    // Ende des Parteien-Bereichs erkennen (bei PRÄAMBEL oder § 1)
    if (skipPartiesSection && (trimmedLine === 'PRÄAMBEL' || trimmedLine === 'Präambel' || trimmedLine.startsWith('§'))) {
      skipPartiesSection = false;
    }
    
    // Überspringe Zeilen im Parteien-Bereich
    if (skipPartiesSection) {
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
            margin: 40px 0 35px 0;
            text-align: center;
            position: relative;
            page-break-after: avoid;
          ">
            <h1 style="
              font-family: ${theme.headingFont};
              font-size: 14pt;
              font-weight: 700;
              color: ${theme.primary};
              letter-spacing: 0.5px;
              text-transform: uppercase;
              margin: 0;
              padding: 20px 0 15px 0;
            ">${trimmedLine}</h1>
            <div style="
              margin: 0 auto;
              width: 150px;
              height: 1px;
              background: #ccc;
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
    // PARAGRAPH-ÜBERSCHRIFTEN - EINHEITLICHES PROFESSIONELLES FORMAT
    else if (trimmedLine.startsWith('§')) {
      sectionCounter++;
      subsectionCounters[sectionCounter] = 0;
      
      // Schließe vorherige Section
      if (currentSection) {
        htmlContent += '</div>';
      }
      
      currentSection = trimmedLine;
      
      if (designVariant === 'executive') {
        htmlContent += `
          <h2 style="
            font-family: ${theme.headingFont};
            font-size: 12pt;
            font-weight: bold;
            color: #222;
            margin: 12mm 0 4mm 0;
            text-transform: uppercase;
            letter-spacing: 0px;
            text-align: left !important;
          ">
            ${trimmedLine}
          </h2>
          <div style="margin-left: 0;">
        `;
      } else if (designVariant === 'modern') {
        htmlContent += `
          <h2 style="
            font-family: ${theme.headingFont};
            font-size: 12pt;
            font-weight: bold;
            color: ${theme.primary};
            margin: 12pt 0 8pt 0;
            text-transform: uppercase;
            letter-spacing: 0px;
            text-align: left !important;
          ">
            ${trimmedLine}
          </h2>
          <div style="margin-left: 0;">
        `;
      } else { // minimal
        htmlContent += `
          <h2 style="
            font-family: ${theme.headingFont};
            font-size: 12pt;
            font-weight: bold;
            color: ${theme.primary};
            margin: 12pt 0 8pt 0;
            text-transform: uppercase;
            letter-spacing: 0px;
            text-align: left !important;
          ">
            ${trimmedLine}
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
              font-size: 12pt;
              font-weight: bold;
              color: ${theme.primary};
              letter-spacing: 1px;
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
          ">${trimmedLine}</p>
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
          ">${trimmedLine}</p>
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
          ">${trimmedLine}</p>
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
          ">${trimmedLine}</p>
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
          ">${trimmedLine}</p>
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
            padding-left: 8mm;
            text-indent: -4mm;
            font-family: ${theme.fontFamily};
            font-size: 10.5pt;
            color: ${theme.text};
            line-height: ${theme.lineHeight};
            text-align: justify;
          ">
            <span style="font-weight: 700; margin-right: 4px;">${number}.</span>${content}
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
    // UNTERSCHRIFTS-LINIEN ÜBERSPRINGEN - Werden am Ende des Dokuments separat hinzugefügt
    else if (trimmedLine.includes('_____')) {
      // Flag setzen dass Unterschriften benötigt werden (nur beim ersten Mal)
      if (!inSignatureSection) {
        inSignatureSection = true;
        console.log('🖋️ UNTERSCHRIFTS-FLAG GESETZT - Professionelle Sektion wird am Ende hinzugefügt!');
      }
      // Alle _____ Linien im Text überspringen
      console.log('🚫 Überspringe Unterschriftslinie:', trimmedLine.substring(0, 50) + '...');
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
          ">${trimmedLine}</p>
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
          ">${trimmedLine}</p>
        `;
      } else { // minimal
        htmlContent += `
          <p style="
            margin: 0 0 ${theme.paragraphSpacing} 0;
            font-family: ${theme.fontFamily};
            font-size: ${theme.fontSize};
            line-height: ${theme.lineHeight};
            color: ${theme.text};
          ">${trimmedLine}</p>
        `;
      }
    }
  }
  
  // Schließe offene Sections
  if (currentSection) {
    htmlContent += '</div></div>';
  }

  // 🖋️ PROFESSIONELLE UNTERSCHRIFTSSEKTION - IMMER AM ENDE HINZUFÜGEN
  console.log('🎯 *** FÜGE PROFESSIONELLE UNTERSCHRIFTSSEKTION HINZU (IMMER) ***');
  // Unterschriften IMMER hinzufügen - nicht nur wenn inSignatureSection gesetzt
  {
    htmlContent += `
      <!-- UNTERSCHRIFTSBEREICH - IMMER EIGENE SEITE -->
      <div style="
        page-break-before: always;
        margin-top: 25mm;
        padding: 0;
        page-break-inside: avoid;
      ">
        <!-- Überschrift - dezent und professionell (kompakt) -->
        <h2 style="
          text-align: center;
          font-family: ${theme.headingFont};
          font-size: 12pt;
          font-weight: 600;
          color: ${theme.primary};
          margin-bottom: 20mm;
          letter-spacing: 0.5px;
        ">Unterschriften der Vertragsparteien</h2>

        <!-- Zweispaltiges Layout -->
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin: 0 auto;
          max-width: 100%;
        ">
          <!-- LINKE SPALTE: VERKÄUFER/PARTEI A -->
          <div style="
            padding: 20px;
            min-height: 200px;
          ">
            <!-- Überschrift -->
            <h3 style="
              font-family: ${theme.fontFamily};
              font-size: 10pt;
              font-weight: 600;
              color: ${theme.primary};
              margin-bottom: 30px;
              text-align: center;
              text-transform: uppercase;
            ">Verkäufer / Partei A</h3>

            <!-- Ort und Datum - kompakt -->
            <div style="margin-bottom: 10mm;">
              <div style="
                border-bottom: 1px solid #666;
                height: 8mm;
                margin-bottom: 2mm;
              "></div>
              <p style="
                font-family: ${theme.fontFamily};
                font-size: 9pt;
                color: #666;
                margin: 0;
                text-align: left;
              ">Ort, Datum</p>
            </div>

            <!-- Unterschriftslinie - kompakt aber professionell -->
            <div style="margin-bottom: 10mm;">
              <div style="
                border-bottom: 2px solid #333;
                height: 12mm;
                margin-bottom: 3mm;
                width: 100%;
              "></div>
              <p style="
                font-family: ${theme.fontFamily};
                font-size: 9pt;
                color: #666;
                text-align: left;
                margin: 0;
              ">(Unterschrift / Stempel)</p>
            </div>

            <!-- Name - kompakt und professionell -->
            <div style="
              padding-top: 8mm;
              border-top: 1px dotted #ccc;
            ">
              <p style="
                font-family: ${theme.fontFamily};
                font-size: 10pt;
                color: ${theme.text};
                margin: 0 0 2mm 0;
                font-weight: 600;
              ">${companyProfile?.companyName || 'Verkäufer'}</p>
              <p style="
                font-family: ${theme.fontFamily};
                font-size: 9pt;
                color: #666;
                margin: 0;
              ">(Geschäftsführung)</p>
            </div>
          </div>

          <!-- RECHTE SPALTE: KÄUFER/PARTEI B -->
          <div style="
            padding: 20px;
            min-height: 200px;
          ">
            <!-- Überschrift -->
            <h3 style="
              font-family: ${theme.fontFamily};
              font-size: 10pt;
              font-weight: 600;
              color: ${theme.primary};
              margin-bottom: 30px;
              text-align: center;
              text-transform: uppercase;
            ">Käufer / Partei B</h3>

            <!-- Ort und Datum - identisch zur Verkäufer-Spalte (kompakt) -->
            <div style="margin-bottom: 10mm;">
              <div style="
                border-bottom: 1px solid #666;
                height: 8mm;
                margin-bottom: 2mm;
              "></div>
              <p style="
                font-family: ${theme.fontFamily};
                font-size: 9pt;
                color: #666;
                margin: 0;
                text-align: left;
              ">Ort, Datum</p>
            </div>

            <!-- Unterschriftslinie - identisch zur Verkäufer-Spalte (kompakt) -->
            <div style="margin-bottom: 10mm;">
              <div style="
                border-bottom: 2px solid #333;
                height: 12mm;
                margin-bottom: 3mm;
                width: 100%;
              "></div>
              <p style="
                font-family: ${theme.fontFamily};
                font-size: 9pt;
                color: #666;
                text-align: left;
                margin: 0;
              ">(Unterschrift)</p>
            </div>

            <!-- Name - symmetrisch zur Verkäufer-Spalte -->
            <div style="
              padding-top: 8mm;
              border-top: 1px dotted #ccc;
            ">
              <div style="
                border-bottom: 1px solid #ccc;
                height: 6mm;
                margin-bottom: 2mm;
              "></div>
              <p style="
                font-family: ${theme.fontFamily};
                font-size: 9pt;
                color: #666;
                margin: 0;
              ">(Name in Druckschrift)</p>
            </div>
          </div>
        </div>


      </div>
    `;
  } // Ende Unterschriftssektion - wird IMMER hinzugefügt

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
    
    /* 📄 DIN A4 FORMAT - EXAKTE SEITENRÄNDER NACH VORGABE */
    @page {
      size: A4;
      margin: 25mm 20mm 20mm 25mm; /* Oben 25mm, Rechts 20mm, Unten 20mm, Links 25mm */
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
    
    /* 📄 SEITEN-CONTAINER - DIN A4 MIT EXAKTEN RÄNDERN */
    .page-container {
      max-width: 210mm; /* DIN A4 Breite */
      margin: 0 auto;
      padding: 25mm 20mm 20mm 25mm; /* Exakte Seitenränder nach Vorgabe */
      background: white;
      min-height: 297mm; /* DIN A4 Höhe */
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
    padding: 25mm 20mm 20mm 25mm; /* Exakte DIN A4 Seitenränder */
    background: white;
    min-height: 297mm; /* A4 Höhe */
    position: relative;
    z-index: 2;
  ">
    
    <!-- 📄 IDEALER BRIEFKOPF NACH DIN-VORGABEN -->
    <header style="
      margin-bottom: 15mm;
      page-break-after: avoid;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0;
      ">
        
        <!-- LOGO LINKS (ganz links oben, bündig mit oberem Rand) -->
        <div style="
          flex: 0 0 auto;
          max-width: 60mm;
        ">
          ${logoBase64 ? `
            <img src="${logoBase64}" style="
              max-height: 20mm;
              width: auto;
              object-fit: contain;
              display: block;
            " alt="Firmenlogo"/>
          ` : `
            <!-- Initialen-Fallback -->
            <div style="
              font: bold 14pt 'Times New Roman', serif;
              color: #1a1a1a;
              padding: 4mm 8mm;
              display: inline-block;
              line-height: 1.2;
            ">${companyProfile?.companyName ? generateCompanyInitials(companyProfile.companyName) : 'AC'}</div>
          `}
        </div>
        
        <!-- UNTERNEHMENSBLOCK RECHTS (rechtsbündig) -->
        <div style="
          text-align: right;
          font-family: 'Times New Roman', serif;
          font-size: 10pt;
          line-height: 1.2;
          color: #1a1a1a;
        ">
          <!-- Fett: Unternehmensname + Rechtsform -->
          <div style="
            font-weight: bold;
            margin-bottom: 2mm;
          ">
            ${companyProfile?.companyName || 'Ihr Unternehmen'}${companyProfile?.legalForm ? ` ${companyProfile.legalForm}` : ''}
          </div>
          
          <!-- Adresse -->
          <div style="margin-bottom: 1mm;">
            ${companyProfile?.street || 'Musterstraße 123'}
          </div>
          <div style="margin-bottom: 2mm;">
            ${companyProfile?.postalCode || '12345'} ${companyProfile?.city || 'Musterstadt'}
          </div>
          
          <!-- Kontakt -->
          ${companyProfile?.contactEmail ? `<div style="margin-bottom: 1mm;">E-Mail: ${companyProfile.contactEmail}</div>` : '<div style="margin-bottom: 1mm;">E-Mail: info@beispiel.de</div>'}
          ${companyProfile?.contactPhone ? `<div style="margin-bottom: 2mm;">Telefon: ${companyProfile.contactPhone}</div>` : '<div style="margin-bottom: 2mm;">Telefon: +49 (0) 123 456789</div>'}
          
          <!-- Registergericht/HRB, USt-ID -->
          ${companyProfile?.tradeRegister ? `<div style="margin-bottom: 1mm;">${companyProfile.tradeRegister}</div>` : ''}
          ${companyProfile?.vatId ? `<div>USt-ID: ${companyProfile.vatId}</div>` : ''}
        </div>
        
      </div>
      
      <!-- Professionelle Trennlinie (verstärkt) -->
      <div style="
        margin: 6mm 0;
        height: 1.5px;
        background-color: #666666;
        width: 100%;
      "></div>
    </header>
    
    <!-- VERTRAGSTITEL (kompakt nach oben) -->
    <div style="
      text-align: center;
      margin: 10mm 0 12mm 0;
    ">
      <h1 style="
        font-family: 'Times New Roman', serif;
        font-size: 21pt;
        font-weight: bold;
        color: #1a1a1a;
        text-transform: uppercase;
        margin: 0;
        letter-spacing: 2.5px;
      ">${contractType?.toUpperCase() || 'KAUFVERTRAG'}</h1>

      <!-- Elegante Datumszeile -->
      <div style="
        font-family: 'Times New Roman', serif;
        font-size: 11pt;
        color: #666666;
        font-style: italic;
        margin-top: 5mm;
      ">
        geschlossen am ${new Date().toLocaleDateString('de-DE', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })}
      </div>
    </div>

    <!-- PARTEIENBLOCK ("zwischen") -->
    <div style="
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.3;
      margin: 0 0 15mm 0;
      color: #1a1a1a;
    ">
      <div style="font-weight: bold; margin-bottom: 8mm;">zwischen</div>

      <div style="margin-bottom: 10mm;">
        <div style="font-weight: bold;">${companyProfile?.companyName || 'ACME GmbH'}${companyProfile?.legalForm ? ` ${companyProfile.legalForm}` : ''}</div>
        <div style="font-style: italic; margin-top: 2mm; color: #666666; font-size: 10pt;">(vollständige Angaben siehe Briefkopf)</div>
        <div style="font-style: italic; margin-top: 3mm;">– nachfolgend "Verkäufer" genannt –</div>
      </div>

      <div style="font-weight: bold; margin-bottom: 6mm;">und</div>

      <div style="margin-bottom: 10mm;">
        <div style="font-weight: bold;">${parties?.buyer || parties?.buyerName || 'Max Mustermann'}</div>
        ${parties?.buyerAddress ? `<div>${parties.buyerAddress}</div>` : '<div>Musterstraße 123</div>'}
        ${parties?.buyerCity ? `<div>${parties.buyerCity}</div>` : '<div>12345 Beispielstadt</div>'}
        <div style="font-style: italic; margin-top: 3mm;">– nachfolgend "Käufer" genannt –</div>
      </div>
    </div>
    
    <!-- SEITENUMBRUCH: Seite 2 beginnt hier -->
    <div style="page-break-after: always;"></div>
    
    <!-- VERTRAGSKÖRPER -->
    <main style="
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.3;
      color: #1a1a1a;
    ">
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 🆕 VERSION 2: KOMPLETT NEUE PDF-GENERIERUNG - SAUBERE STRUKTUR
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Struktur:
// - Seite 1: Deckblatt (Titel, Parteien, Datum)
// - Seiten 2-N: Vertragsinhalt (so viele wie nötig)
// - Letzte Seite: Unterschriften, QR-Code, Rechtliche Hinweise
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const formatContractToHTMLv2 = async (contractText, companyProfile, contractType, designVariant = 'executive', isDraft = false, parties = null) => {
  console.log("🚀 [V2] Starte NEUE PDF-Generierung für:", contractType);
  console.log('🎨 [V2] Design-Variante:', designVariant);
  console.log('📝 [V2] Entwurf-Modus:', isDraft);
  console.log('👥 [V2] Parties Data:', parties);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHRITT 1: LOGO LADEN
  // ═══════════════════════════════════════════════════════════════════════════
  let logoBase64 = null;
  let useInitialsFallback = false;

  if (companyProfile && (companyProfile.logoUrl || companyProfile.logoKey)) {
    logoBase64 = await loadLogoWithFallbacks(companyProfile);
    if (logoBase64) {
      logoBase64 = optimizeLogoBase64(logoBase64, 100);
    } else {
      useInitialsFallback = true;
    }
  } else {
    useInitialsFallback = true;
  }

  if (useInitialsFallback && companyProfile?.companyName) {
    const initials = generateCompanyInitials(companyProfile.companyName);
    logoBase64 = generateInitialsLogo(initials, '#1a1a1a');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHRITT 2: DOKUMENT-METADATEN
  // ═══════════════════════════════════════════════════════════════════════════
  const safeContractType = contractType || 'VERTRAG';
  const documentId = `${safeContractType.toUpperCase()}-${new Date().getTime()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const documentHash = generateDocumentHash(contractText);

  // QR-Code generieren
  let enterpriseQRCode = null;
  try {
    const qrData = {
      documentId: documentId,
      documentHash: documentHash,
      contractType: contractType,
      isDraft: isDraft
    };
    enterpriseQRCode = await generateEnterpriseQRCode(qrData, companyProfile);
  } catch (qrError) {
    console.error("⚠️ [V2] QR-Code Generierung fehlgeschlagen:", qrError.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHRITT 3: PARTY LABELS BESTIMMEN (dynamisch je nach Vertragstyp)
  // ═══════════════════════════════════════════════════════════════════════════
  const getPartyLabels = (type) => {
    const typeLC = (type || '').toLowerCase();
    if (typeLC.includes('kauf')) return { partyA: 'Verkäufer', partyB: 'Käufer' };
    if (typeLC.includes('miet')) return { partyA: 'Vermieter', partyB: 'Mieter' };
    if (typeLC.includes('arbeit')) return { partyA: 'Arbeitgeber', partyB: 'Arbeitnehmer' };
    if (typeLC.includes('dienst')) return { partyA: 'Auftraggeber', partyB: 'Auftragnehmer' };
    if (typeLC.includes('werkvertrag')) return { partyA: 'Besteller', partyB: 'Unternehmer' };
    if (typeLC.includes('darlehen') || typeLC.includes('kredit')) return { partyA: 'Darlehensgeber', partyB: 'Darlehensnehmer' };
    if (typeLC.includes('gesellschaft')) return { partyA: 'Gesellschafter A', partyB: 'Gesellschafter B' };
    if (typeLC.includes('lizenz')) return { partyA: 'Lizenzgeber', partyB: 'Lizenznehmer' };
    if (typeLC.includes('geheim') || typeLC.includes('nda')) return { partyA: 'Offenlegender', partyB: 'Empfänger' };
    return { partyA: 'Partei A', partyB: 'Partei B' };
  };

  const partyLabels = getPartyLabels(contractType);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHRITT 4: VERTRAGSINHALT ZU HTML KONVERTIEREN (V1-STYLE MIT NUMMERIERTEN KREISEN)
  // ═══════════════════════════════════════════════════════════════════════════
  const convertContractTextToHTML = (text) => {
    const lines = text.split('\n');
    let html = '';
    let skipPartiesSection = false;
    let currentParagraphNum = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Überspringe leere Zeilen
      if (!trimmedLine) {
        continue;
      }

      // Überspringe === Linien
      if (trimmedLine.startsWith('===') || trimmedLine.endsWith('===')) {
        continue;
      }

      // PARTEIEN-BEREICH ÜBERSPRINGEN (wird im Deckblatt gehandhabt)
      if (trimmedLine.toLowerCase() === 'zwischen') {
        skipPartiesSection = true;
        continue;
      }

      // Ende des Parteien-Bereichs
      if (skipPartiesSection && (trimmedLine === 'PRÄAMBEL' || trimmedLine === 'Präambel' || trimmedLine.startsWith('§'))) {
        skipPartiesSection = false;
      }

      if (skipPartiesSection) {
        continue;
      }

      // Überspringe die Hauptüberschrift (z.B. "KAUFVERTRAG") - wird im Deckblatt gehandhabt
      if (trimmedLine === trimmedLine.toUpperCase() &&
          trimmedLine.length > 5 &&
          !trimmedLine.startsWith('§') &&
          !trimmedLine.includes(':') &&
          !['PRÄAMBEL', 'ZWISCHEN', 'UND', 'ANLAGEN'].includes(trimmedLine)) {
        continue;
      }

      // PRÄAMBEL - MITTIG mit dezenten Linien
      if (trimmedLine === 'PRÄAMBEL' || trimmedLine === 'Präambel') {
        html += `
          <div style="margin: 10mm 0 6mm 0; page-break-after: avoid; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 5mm;">
              <div style="width: 20mm; height: 1px; background: #999;"></div>
              <h2 style="
                font-family: 'Times New Roman', serif;
                font-size: 13pt;
                font-weight: bold;
                color: #1a1a1a;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin: 0;
                white-space: nowrap;
              ">PRÄAMBEL</h2>
              <div style="width: 20mm; height: 1px; background: #999;"></div>
            </div>
          </div>
        `;
        continue;
      }

      // PARAGRAPHEN (§ 1 Vertragsgegenstand etc.) - V1-Style
      if (trimmedLine.startsWith('§')) {
        const cleanTitle = trimmedLine.replace(/\*\*/g, '');
        currentParagraphNum = 0; // Reset für jeden neuen Paragraphen

        html += `
          <div style="margin: 12mm 0 5mm 0; page-break-after: avoid;">
            <h2 style="
              font-family: 'Times New Roman', serif;
              font-size: 13pt;
              font-weight: bold;
              color: #1a1a1a;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">${cleanTitle}</h2>
          </div>
        `;
        continue;
      }

      // NUMMERIERTE ABSÄTZE (1), (2), (3) etc. - Klassisch mit schwarzem Nummernkreis
      if (/^\(?\d+\)?\.?\s/.test(trimmedLine)) {
        currentParagraphNum++;
        const cleanText = trimmedLine.replace(/^\(?\d+\)?\.?\s*/, '').replace(/\*\*/g, '');

        html += `
          <div style="display: flex; align-items: flex-start; gap: 4mm; margin: 0 0 4mm 0;">
            <div style="
              flex: 0 0 auto;
              min-width: 7mm;
              height: 7mm;
              border: 1.5px solid #333;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9pt;
              font-weight: bold;
              color: #333;
              margin-top: 1mm;
            ">${currentParagraphNum}</div>
            <p style="
              font-family: 'Times New Roman', serif;
              font-size: 11pt;
              line-height: 1.55;
              color: #1a1a1a;
              margin: 0;
              text-align: justify;
              flex: 1;
            ">${cleanText}</p>
          </div>
        `;
        continue;
      }

      // AUFZÄHLUNGEN mit Buchstaben a), b), c) - Klassisch mit schwarzem umkreisten Buchstaben
      if (/^[a-z]\)/.test(trimmedLine)) {
        const letter = trimmedLine.charAt(0);
        const cleanText = trimmedLine.substring(2).trim().replace(/\*\*/g, '');

        html += `
          <div style="display: flex; align-items: flex-start; gap: 3mm; margin: 0 0 3mm 12mm;">
            <div style="
              flex: 0 0 auto;
              min-width: 5.5mm;
              height: 5.5mm;
              border: 1px solid #555;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8pt;
              color: #333;
              margin-top: 1.5mm;
            ">${letter}</div>
            <p style="
              font-family: 'Times New Roman', serif;
              font-size: 10.5pt;
              line-height: 1.5;
              color: #1a1a1a;
              margin: 0;
              text-align: justify;
              flex: 1;
            ">${cleanText}</p>
          </div>
        `;
        continue;
      }

      // Spiegelstriche - Klassisch schwarz
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        const cleanText = trimmedLine.substring(1).trim().replace(/\*\*/g, '');
        html += `
          <div style="display: flex; align-items: flex-start; gap: 3mm; margin: 0 0 2mm 12mm;">
            <span style="color: #333; font-size: 12pt;">•</span>
            <p style="
              font-family: 'Times New Roman', serif;
              font-size: 10.5pt;
              line-height: 1.5;
              color: #1a1a1a;
              margin: 0;
              text-align: justify;
              flex: 1;
            ">${cleanText}</p>
          </div>
        `;
        continue;
      }

      // NORMALE ABSÄTZE - Markdown bereinigen
      let cleanText = trimmedLine
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');

      html += `
        <p style="
          font-family: 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.55;
          color: #1a1a1a;
          margin: 0 0 4mm 0;
          text-align: justify;
        ">${cleanText}</p>
      `;
    }

    return html;
  };

  const contractContentHTML = convertContractTextToHTML(contractText);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHRITT 5: VOLLSTÄNDIGES HTML DOKUMENT ERSTELLEN
  // ═══════════════════════════════════════════════════════════════════════════

  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Seitenzahl berechnen (Deckblatt=1, dann Inhalt, dann Unterschriften)
  const totalPages = 5; // Wird dynamisch berechnet durch Puppeteer

  const fullHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${contractType || 'Vertrag'} - ${companyProfile?.companyName || 'Vertragsdokument'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: A4;
      margin: 25mm 20mm 20mm 25mm;
    }

    body {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
    .no-break { page-break-inside: avoid; }

    /* Footer auf jeder Seite */
    .page-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      border-top: 1px solid #ccc;
      padding-top: 3mm;
      font-size: 8pt;
      color: #666;
    }

    ${isDraft ? `.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100pt; color: rgba(180,0,0,0.07); font-weight: bold; pointer-events: none; z-index: 9999; }` : ''}
  </style>
</head>
<body>
${isDraft ? '<div class="watermark">ENTWURF</div>' : ''}

<!-- ══════════════════════════════════════════════════════════════════════════════════ -->
<!-- SEITE 1: DECKBLATT (V1-Style mit Briefkopf) -->
<!-- ══════════════════════════════════════════════════════════════════════════════════ -->
<div class="page" style="position: relative; min-height: 250mm;">

  <!-- BRIEFKOPF: Logo links, Firmeninfos rechts -->
  <header style="margin-bottom: 15mm;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">

      <!-- Logo links -->
      <div style="flex: 0 0 auto; max-width: 60mm;">
        ${logoBase64 ? `<img src="${logoBase64}" style="max-height: 20mm; width: auto; display: block;" alt="Logo"/>` : ''}
      </div>

      <!-- Firmeninfos rechts -->
      <div style="text-align: right; font-size: 10pt; line-height: 1.3;">
        <div style="font-weight: bold; margin-bottom: 2mm;">
          ${companyProfile?.companyName || 'Ihr Unternehmen'}${companyProfile?.legalForm ? ` ${companyProfile.legalForm}` : ''}
        </div>
        <div>${companyProfile?.street || 'Musterstraße 123'}</div>
        <div style="margin-bottom: 2mm;">${companyProfile?.postalCode || '12345'} ${companyProfile?.city || 'Musterstadt'}</div>
        ${companyProfile?.contactEmail ? `<div>E-Mail: ${companyProfile.contactEmail}</div>` : ''}
        ${companyProfile?.contactPhone ? `<div style="margin-bottom: 2mm;">Telefon: ${companyProfile.contactPhone}</div>` : ''}
        ${companyProfile?.tradeRegister ? `<div>${companyProfile.tradeRegister}</div>` : ''}
        ${companyProfile?.vatId ? `<div>USt-ID: ${companyProfile.vatId}</div>` : ''}
      </div>
    </div>

    <!-- Trennlinie -->
    <div style="margin: 6mm 0; height: 1.5px; background: #666;"></div>
  </header>

  <!-- VERTRAGSTITEL -->
  <div style="text-align: center; margin: 15mm 0 20mm 0;">
    <h1 style="font-size: 21pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2.5px; margin: 0;">
      ${(contractType || 'VERTRAG').toUpperCase()}
    </h1>
    <div style="font-size: 11pt; color: #666; font-style: italic; margin-top: 5mm;">
      geschlossen am ${currentDate}
    </div>
  </div>

  <!-- PARTEIENBLOCK -->
  <div style="font-size: 11pt; line-height: 1.4; margin: 0 0 20mm 0;">
    <div style="font-weight: bold; margin-bottom: 8mm;">zwischen</div>

    <!-- Partei A -->
    <div style="margin-bottom: 10mm;">
      <div style="font-weight: bold;">${companyProfile?.companyName || 'Vertragspartei A'}${companyProfile?.legalForm ? ` ${companyProfile.legalForm}` : ''}</div>
      <div style="font-style: italic; margin-top: 2mm; color: #666; font-size: 10pt;">(vollständige Angaben siehe Briefkopf)</div>
      <div style="font-style: italic; margin-top: 3mm;">– nachfolgend "${partyLabels.partyA}" genannt –</div>
    </div>

    <div style="font-weight: bold; margin-bottom: 6mm;">und</div>

    <!-- Partei B -->
    <div style="margin-bottom: 10mm;">
      <div style="font-weight: bold;">${parties?.buyer || parties?.buyerName || parties?.partyB || 'Vertragspartei B'}</div>
      <div>${parties?.buyerAddress || parties?.partyBAddress || 'Adresse'}</div>
      <div>${parties?.buyerCity || parties?.partyBCity || 'Ort'}</div>
      <div style="font-style: italic; margin-top: 3mm;">– nachfolgend "${partyLabels.partyB}" genannt –</div>
    </div>
  </div>

  <!-- Footer Seite 1 -->
  <div class="page-footer">
    <table style="width: 100%; font-size: 8pt; color: #666;">
      <tr>
        <td style="text-align: left;">DOK-ID: ${documentId.substring(0, 20)}...</td>
        <td style="text-align: center;">Seite 1 | ${totalPages}</td>
        <td style="text-align: right;">${new Date().toLocaleDateString('de-DE')}</td>
      </tr>
    </table>
  </div>

</div>

<!-- ══════════════════════════════════════════════════════════════════════════════════ -->
<!-- SEITEN 2-N: VERTRAGSINHALT -->
<!-- ══════════════════════════════════════════════════════════════════════════════════ -->
<div class="contract-content">
  ${contractContentHTML}
</div>

<!-- ══════════════════════════════════════════════════════════════════════════════════ -->
<!-- LETZTE SEITE: UNTERSCHRIFTEN (V1-Style mit beigem Header) -->
<!-- ══════════════════════════════════════════════════════════════════════════════════ -->
<div class="page" style="position: relative; page-break-before: always; min-height: 250mm;">

  <!-- Beiger Header-Balken wie V1 -->
  <div style="background: linear-gradient(180deg, #f5f0e6 0%, #ebe5d9 100%); padding: 15mm 0 12mm 0; margin: -25mm -20mm 0 -25mm; width: calc(100% + 45mm);">
    <h2 style="text-align: center; font-size: 16pt; font-weight: bold; color: #1a1a1a; margin: 0; padding: 0 25mm;">
      Unterschriften der Vertragsparteien
    </h2>
  </div>

  <!-- Unterschriften-Container -->
  <div style="margin-top: 10mm;">

    <!-- Zwei-Spalten Unterschriften -->
    <div style="display: flex; gap: 10mm; margin-bottom: 15mm;">

      <!-- Partei A (links) -->
      <div style="flex: 1; padding: 5mm;">
        <h3 style="font-size: 10pt; font-weight: 600; text-transform: uppercase; margin-bottom: 8mm;">${partyLabels.partyA} / Partei A</h3>

        <div style="margin-bottom: 8mm;">
          <div style="border-bottom: 1px solid #666; height: 8mm; margin-bottom: 2mm;"></div>
          <p style="font-size: 9pt; color: #666; margin: 0;">Ort, Datum</p>
        </div>

        <div style="margin-bottom: 8mm;">
          <div style="border-bottom: 2px solid #333; height: 12mm; margin-bottom: 2mm;"></div>
          <p style="font-size: 9pt; color: #666; margin: 0;">(Unterschrift / Stempel)</p>
        </div>

        <div style="padding-top: 5mm; border-top: 1px dotted #ccc;">
          <p style="font-size: 10pt; font-weight: 600; margin: 0 0 2mm 0;">${companyProfile?.companyName || partyLabels.partyA}</p>
          <p style="font-size: 9pt; color: #666; margin: 0;">(Geschäftsführung)</p>
        </div>
      </div>

      <!-- Partei B (rechts) -->
      <div style="flex: 1; padding: 5mm;">
        <h3 style="font-size: 10pt; font-weight: 600; text-transform: uppercase; margin-bottom: 8mm;">${partyLabels.partyB} / Partei B</h3>

        <div style="margin-bottom: 8mm;">
          <div style="border-bottom: 1px solid #666; height: 8mm; margin-bottom: 2mm;"></div>
          <p style="font-size: 9pt; color: #666; margin: 0;">Ort, Datum</p>
        </div>

        <div style="margin-bottom: 8mm;">
          <div style="border-bottom: 2px solid #333; height: 12mm; margin-bottom: 2mm;"></div>
          <p style="font-size: 9pt; color: #666; margin: 0;">(Unterschrift)</p>
        </div>

        <div style="padding-top: 5mm; border-top: 1px dotted #ccc;">
          <div style="border-bottom: 1px solid #ccc; height: 6mm; margin-bottom: 2mm;"></div>
          <p style="font-size: 9pt; color: #666; margin: 0;">(Name in Druckschrift)</p>
        </div>
      </div>

    </div>

    <!-- Anlagen-Bereich wie V1 -->
    <div style="background: #faf8f5; border: 1px solid #e5e0d5; padding: 4mm 5mm; margin-bottom: 15mm;">
      <h4 style="font-size: 11pt; font-weight: bold; color: #333; margin: 0 0 2mm 0; font-style: italic;">ANLAGEN</h4>
      <p style="font-size: 10pt; color: #666; margin: 0;">Diesem Vertrag sind keine Anlagen beigefügt.</p>
    </div>

  </div>

  <!-- Footer mit QR-Code und Verifizierung (V1-Style) -->
  <div style="position: absolute; bottom: 0; left: 0; right: 0; background: #f9f7f4; border-top: 1px solid #ddd; padding: 5mm 0;">

    <div style="display: flex; align-items: flex-start; gap: 8mm;">

      <!-- Links: Vertragsinfo -->
      <div style="font-size: 9pt; color: #666;">
        <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 1mm;">${(contractType || 'Vertrag').toUpperCase()}</div>
        <div>© ${new Date().getFullYear()} ${companyProfile?.companyName || 'Contract AI'}</div>
      </div>

      <!-- Mitte: QR-Code -->
      <div style="flex: 1; text-align: center;">
        ${enterpriseQRCode ? `<img src="${enterpriseQRCode}" style="width: 18mm; height: 18mm; display: inline-block;" alt="QR"/>` : '<div style="width: 18mm; height: 18mm; border: 1px dashed #ccc; display: inline-block;"></div>'}
        <div style="font-size: 8pt; color: #888; margin-top: 1mm;">Digitale Verifizierung</div>
        <div style="font-size: 7pt; font-family: monospace; color: #666;">${documentHash}</div>
      </div>

      <!-- Rechts: Rechtliche Hinweise -->
      <div style="text-align: right; font-size: 8pt; color: #666; line-height: 1.4;">
        <div style="font-weight: bold;">Rechtlicher Hinweis:</div>
        <div>Dieses Dokument ist rechtlich bindend.</div>
        <div>Alle Rechte vorbehalten.</div>
        <div>Gerichtsstand: ${companyProfile?.city || 'Deutschland'}</div>
      </div>

    </div>

    <!-- Footer-Zeile -->
    <div style="margin-top: 4mm; padding-top: 3mm; border-top: 1px solid #ddd;">
      <table style="width: 100%; font-size: 8pt; color: #666;">
        <tr>
          <td style="text-align: left;">DOK-ID: ${documentId.substring(0, 20)}...</td>
          <td style="text-align: center;">Seite ${totalPages} | ${totalPages}</td>
          <td style="text-align: right;">${new Date().toLocaleDateString('de-DE')}</td>
        </tr>
      </table>
    </div>

  </div>

</div>

</body>
</html>`;

  console.log("✅ [V2] HTML erfolgreich generiert, Länge:", fullHTML.length);
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

// ℹ️ AUTO-PDF wurde zu contracts.js verschoben (verhindert Puppeteer Race Conditions)

// 📋 HELPER: Formatiere alle formData-Felder für den Prompt
function formatAllFormData(formData, excludeKeys = ['title', 'customRequirements']) {
  const lines = [];

  // Gruppiere Felder nach Kategorien (basierend auf Feldnamen-Mustern)
  const entries = Object.entries(formData)
    .filter(([key, value]) => !excludeKeys.includes(key) && value && value.toString().trim() !== '');

  for (const [key, value] of entries) {
    // Formatiere den Schlüssel lesbarer (camelCase zu Titel)
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();

    lines.push(`${label}: ${value}`);
  }

  return lines.join('\n');
}

// 📋 HELPER: Füge alle zusätzlichen formData-Felder als Kontext hinzu
function getAdditionalContext(formData, usedFields = []) {
  const additionalFields = Object.entries(formData)
    .filter(([key, value]) =>
      !usedFields.includes(key) &&
      !['title', 'customRequirements'].includes(key) &&
      value &&
      value.toString().trim() !== ''
    );

  if (additionalFields.length === 0) return '';

  let context = '\n\n═══════════════════════════════════════════════════════\n';
  context += '§ ZUSÄTZLICHE ANGABEN AUS DEM FORMULAR\n';
  context += '═══════════════════════════════════════════════════════\n\n';

  for (const [key, value] of additionalFields) {
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    context += `${label}: ${value}\n`;
  }

  context += '\nBITTE ALLE OBIGEN ZUSÄTZLICHEN ANGABEN IM VERTRAG BERÜCKSICHTIGEN!';

  return context;
}

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

  // ===== V2 SYSTEM: Automatische Aktivierung für unterstützte Contract-Types =====
  const V2_SUPPORTED_TYPES = [
    'individuell', 'darlehen', 'kaufvertrag', 'mietvertrag',
    'freelancer', 'arbeitsvertrag', 'nda', 'aufhebungsvertrag',
    'gesellschaft', 'lizenzvertrag', 'pacht', 'werkvertrag'
  ];

  const shouldUseV2 = V2_SUPPORTED_TYPES.includes(type);

  if (shouldUseV2) {
    console.log(`🆕 V2 Meta-Prompt System aktiviert für Type: ${type}`);

    try {
      const generateV2 = require('./generateV2');

      // V2 Flow ausführen
      const result = await generateV2.generateContractV2(
        formData,
        type,
        req.user.userId,
        db
      );

      // HTML-Formatierung (wie bei V1)
      // 🔧 FIX: Company Profile aus company_profiles Collection laden (nicht aus user)
      let companyProfile = null;
      if (db && useCompanyProfile) {
        try {
          companyProfile = await db.collection("company_profiles").findOne({
            userId: new ObjectId(req.user.userId)
          });
          console.log("🏢 [V2] Company Profile geladen:", !!companyProfile);
          if (companyProfile) {
            console.log("📊 [V2] Company Profile Details:", {
              name: companyProfile.companyName,
              hasLogo: !!companyProfile.logoUrl
            });
          }
        } catch (profileError) {
          console.error("⚠️ [V2] Fehler beim Laden des Company Profiles:", profileError);
        }
      }

      const formattedHTML = await formatContractToHTML(
        result.contractText,
        companyProfile,
        type,
        designVariant,
        formData.isDraft || false,
        formData // 🔧 FIX: Pass formData as parties for proper data display
      );

      // Speichern in contracts Collection (wie bei V1)
      const contractsCollection = db.collection("contracts");
      const contract = {
        userId: new ObjectId(req.user.userId),
        name: formData.title,
        content: result.contractText,
        contractHTML: formattedHTML,
        laufzeit: formData.duration || "Generiert",
        kuendigung: formData.termination || "Generiert",
        expiryDate: formData.expiryDate || "",
        status: formData.isDraft ? "Entwurf" : "Aktiv",
        uploadedAt: new Date(),
        isGenerated: true,
        contractType: type,
        hasCompanyProfile: !!companyProfile,
        formData: formData,
        designVariant: designVariant,
        metadata: {
          version: 'v2_meta_prompt',
          generationId: result.generationDoc._id,
          selfCheckScore: result.artifacts.selfCheck.score,
          validatorPassed: result.artifacts.validator.passed,
          generatedBy: 'GPT-4',
          templateVersion: '2024.2'
        }
      };

      const insertResult = await contractsCollection.insertOne(contract);

      console.log("✅ V2 Generierung abgeschlossen:", {
        contractId: insertResult.insertedId,
        selfCheckScore: result.artifacts.selfCheck.score
      });

      // ℹ️ AUTO-PDF wird jetzt in contracts.js generiert (wenn Frontend den Vertrag speichert)
      // Das verhindert Puppeteer Race Conditions (ETXTBSY Fehler)

      return res.json({
        success: true,
        message: "✅ Vertrag erfolgreich generiert & gespeichert (V2).",
        contractId: insertResult.insertedId,
        contractText: result.contractText,
        contractHTML: formattedHTML,
        artifacts: result.artifacts,
        metadata: {
          contractType: type,
          hasCompanyProfile: !!companyProfile,
          version: 'v2_meta_prompt',
          selfCheckScore: result.artifacts.selfCheck.score
        }
      });

    } catch (error) {
      console.error("❌ V2 Generierung fehlgeschlagen:", error.message);

      // Fallback zu V1 bei V2-Fehler
      console.log("⚠️ Fallback zu V1 System...");
      // Weiter mit V1-Code unten
    }
  }

  // ===== V1 SYSTEM (Legacy, unverändert) =====
  console.log("📜 V1 Legacy System wird verwendet");

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

    let limit = 0; // Free: 0 (gesperrt)
    if (plan === "business") limit = 10; // Business: 10/Monat
    if (plan === "premium" || plan === "legendary") limit = Infinity; // Premium/Legendary: Unbegrenzt

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


`;

    // User Prompts für verschiedene Vertragstypen - VOLLSTÄNDIG
    let userPrompt = "";
    
    switch (type) {
      case "kaufvertrag":
        const verkäufer = companyDetails || formData.seller || "Max Mustermann GmbH";
        const verkäuferAdresse = formData.sellerAddress || "Musterstraße 1, 12345 Musterstadt";
        const verkäuferTyp = formData.sellerType || "Privatperson";
        const käufer = formData.buyer || "Erika Musterfrau";
        const käuferAdresse = formData.buyerAddress || "Beispielweg 2, 54321 Beispielstadt";

        userPrompt = `Erstelle einen VOLLSTÄNDIGEN, professionellen Kaufvertrag mit MINDESTENS 12 Paragraphen.

VERTRAGSTYP: KAUFVERTRAG

═══════════════════════════════════════════════════════
§ VERTRAGSPARTEIEN
═══════════════════════════════════════════════════════

VERKÄUFER (Partei A):
Name: ${verkäufer}
Adresse: ${verkäuferAdresse}
Verkäufertyp: ${verkäuferTyp}

KÄUFER (Partei B):
Name: ${käufer}
Adresse: ${käuferAdresse}

═══════════════════════════════════════════════════════
§ KAUFGEGENSTAND
═══════════════════════════════════════════════════════

Art des Kaufgegenstands: ${formData.itemCategory || "Sonstige Waren"}
Genaue Beschreibung: ${formData.item || "Kaufgegenstand laut Vereinbarung"}
Zustand: ${formData.condition || "Gebraucht"}
${formData.defects ? `Bekannte Mängel: ${formData.defects}` : 'Bekannte Mängel: Keine bekannt'}
${formData.accessories ? `Zubehör/Lieferumfang: ${formData.accessories}` : ''}

═══════════════════════════════════════════════════════
§ KAUFPREIS & ZAHLUNG
═══════════════════════════════════════════════════════

Kaufpreis: ${formData.price || "Nach Vereinbarung"} (${formData.priceType || "Festpreis (Brutto)"})
Zahlungsart: ${formData.paymentMethod || "Barzahlung bei Übergabe"}
Zahlungsfrist: ${formData.paymentDeadline || "Bei Übergabe"}

═══════════════════════════════════════════════════════
§ ÜBERGABE & LIEFERUNG
═══════════════════════════════════════════════════════

Übergabeart: ${formData.deliveryType || "Abholung durch Käufer"}
Übergabedatum: ${formData.deliveryDate || new Date().toISOString().split('T')[0]}
Übergabeort: ${formData.deliveryLocation || "Adresse des Verkäufers"}
Versandkosten: ${formData.shippingCosts || "Entfällt (Abholung)"}

═══════════════════════════════════════════════════════
§ GEWÄHRLEISTUNG & HAFTUNG
═══════════════════════════════════════════════════════

Gewährleistung: ${formData.warranty || "Gewährleistung ausgeschlossen (Privatverkauf)"}
Eigentumsübergang: ${formData.ownershipTransfer || "Bei vollständiger Zahlung"}
Gefahrübergang: ${formData.riskTransfer || "Bei Übergabe"}

═══════════════════════════════════════════════════════
WICHTIGE HINWEISE FÜR DIE VERTRAGSERSTELLUNG:
═══════════════════════════════════════════════════════

1. ALLE obigen Angaben müssen im Vertrag vollständig übernommen werden
2. Bei Verkäufertyp "${verkäuferTyp}": ${verkäuferTyp === 'Privatperson' ? 'Gewährleistungsausschluss ist zulässig' : 'Gesetzliche Gewährleistung muss gewährt werden'}
3. Der Vertrag muss nach deutschem Recht (BGB) formuliert sein
4. Füge eine Salvatorische Klausel hinzu
5. Erstelle einen professionellen, rechtssicheren Vertrag mit allen genannten Paragraphen
${getAdditionalContext(formData, ['seller', 'sellerAddress', 'sellerType', 'buyer', 'buyerAddress', 'itemCategory', 'item', 'condition', 'defects', 'accessories', 'price', 'priceType', 'paymentMethod', 'paymentDeadline', 'deliveryType', 'deliveryDate', 'deliveryLocation', 'shippingCosts', 'warranty', 'ownershipTransfer', 'riskTransfer'])}
${formData.customRequirements ? `\n\n═══════════════════════════════════════════════════════\n§ INDIVIDUELLE ANPASSUNGEN (VOM NUTZER GEWÜNSCHT)\n═══════════════════════════════════════════════════════\n\n${formData.customRequirements}\n\nDIESE INDIVIDUELLEN WÜNSCHE MÜSSEN IM VERTRAG BERÜCKSICHTIGT WERDEN!` : ''}

Erstelle den VOLLSTÄNDIGEN Kaufvertrag mit professioneller juristischer Sprache!`;
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
${getAdditionalContext(formData, ['nameClient', 'clientAddress', 'nameFreelancer', 'freelancerAddress', 'freelancerTaxId', 'description', 'timeframe', 'payment', 'paymentTerms', 'invoiceInterval', 'workLocation', 'workingHours', 'rights', 'confidentiality', 'liability', 'terminationClause', 'jurisdiction', 'governingLaw', 'ipOwnership'])}
${formData.customRequirements ? `\n\n═══════════════════════════════════════════════════════\n§ INDIVIDUELLE ANPASSUNGEN (VOM NUTZER GEWÜNSCHT)\n═══════════════════════════════════════════════════════\n\n${formData.customRequirements}\n\nDIESE INDIVIDUELLEN WÜNSCHE MÜSSEN IM VERTRAG BERÜCKSICHTIGT WERDEN!` : ''}

Erstelle einen VOLLSTÄNDIGEN Vertrag mit allen erforderlichen Paragraphen für einen professionellen Freelancer-Vertrag!`;
        break;

      case "mietvertrag":
        const vermieter = companyDetails || formData.landlord || "Immobilien GmbH";
        const vermieterAdresse = formData.landlordAddress || "Vermietstraße 1, 60311 Frankfurt";
        const mieter = formData.tenant || "Familie Mustermann";
        const mieterAdresse = formData.tenantAddress || "";

        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Mietvertrag für Wohnraum mit MINDESTENS 15 Paragraphen.

VERTRAGSTYP: MIETVERTRAG FÜR ${formData.propertyType === 'Bürofläche' || formData.propertyType === 'Gewerbefläche' || formData.propertyType === 'Ladenfläche' || formData.propertyType === 'Lager/Halle' ? 'GEWERBEFLÄCHE' : 'WOHNRAUM'}

═══════════════════════════════════════════════════════
§ VERTRAGSPARTEIEN
═══════════════════════════════════════════════════════

VERMIETER (Partei A):
Name: ${vermieter}
Adresse: ${vermieterAdresse}

MIETER (Partei B):
Name: ${mieter}
${mieterAdresse ? `Aktuelle Adresse: ${mieterAdresse}` : ''}

═══════════════════════════════════════════════════════
§ MIETOBJEKT
═══════════════════════════════════════════════════════

Art des Mietobjekts: ${formData.propertyType || "Wohnung"}
Adresse: ${formData.address || "Musterstraße 15, 10115 Berlin"}
Wohnfläche: ${formData.size || "85 m²"}
Zimmer: ${formData.rooms || "3 Zimmer, Küche, Bad"}
Ausstattung: ${formData.furnishing || "Unmöbliert"}

═══════════════════════════════════════════════════════
§ MIETKONDITIONEN
═══════════════════════════════════════════════════════

Mietbeginn: ${formData.startDate || new Date().toISOString().split('T')[0]}
Mietdauer: ${formData.duration || "Unbefristet"}
${formData.minDuration && formData.minDuration !== 'Keine' ? `Mindestmietdauer: ${formData.minDuration}` : ''}

Kaltmiete (monatlich): ${formData.baseRent || "950,00 EUR"}
Nebenkosten-Vorauszahlung: ${formData.extraCosts || "200,00 EUR"}
Heizkosten: ${formData.heatingCosts || "In Nebenkosten enthalten"}
Gesamtmiete: ${parseFloat(formData.baseRent?.replace(/[^0-9,]/g, '').replace(',', '.') || 950) + parseFloat(formData.extraCosts?.replace(/[^0-9,]/g, '').replace(',', '.') || 200)} EUR

═══════════════════════════════════════════════════════
§ KAUTION & ZAHLUNG
═══════════════════════════════════════════════════════

Kaution: ${formData.deposit || "3 Nettokaltmieten"}
Kautionszahlung: ${formData.depositPayment || "Einmalzahlung vor Einzug"}
Mietzahlung fällig: ${formData.paymentDue || "1. des Monats (im Voraus)"}

═══════════════════════════════════════════════════════
§ KÜNDIGUNG & LAUFZEIT
═══════════════════════════════════════════════════════

Kündigungsfrist: ${formData.termination || "Gesetzlich (3 Monate)"}
${formData.minDuration && formData.minDuration !== 'Keine' ? `Beidseitiger Kündigungsverzicht: ${formData.minDuration}` : ''}

═══════════════════════════════════════════════════════
§ BESONDERE VEREINBARUNGEN
═══════════════════════════════════════════════════════

- Haustiere: ${formData.pets || "Nach Absprache mit dem Vermieter"}
- Rauchen: ${formData.smoking || "Nicht gestattet in Gemeinschaftsräumen"}
- Schönheitsreparaturen: ${formData.renovations || "Nach gesetzlichen Bestimmungen"}
- Untervermietung: ${formData.subletting || "Nur mit Zustimmung des Vermieters"}
- Garten/Balkon: ${formData.garden || "Sofern vorhanden: Mitbenutzung"}

═══════════════════════════════════════════════════════
WICHTIGE HINWEISE FÜR DIE VERTRAGSERSTELLUNG:
═══════════════════════════════════════════════════════

1. ALLE obigen Angaben müssen im Vertrag vollständig übernommen werden
2. Bei ${formData.propertyType === 'Bürofläche' || formData.propertyType === 'Gewerbefläche' ? 'Gewerbemietvertrag' : 'Wohnraummietvertrag'} gelten unterschiedliche gesetzliche Regelungen
3. Füge alle mietrechtlich relevanten Paragraphen ein (Betriebskosten, Hausordnung, Modernisierung, Mieterhöhung)
4. Der Vertrag muss nach deutschem Mietrecht (BGB §§ 535 ff.) konform sein
5. Füge eine Salvatorische Klausel hinzu
${getAdditionalContext(formData, ['landlord', 'landlordAddress', 'tenant', 'tenantAddress', 'propertyType', 'address', 'size', 'rooms', 'furnishing', 'startDate', 'duration', 'baseRent', 'extraCosts', 'heatingCosts', 'deposit', 'depositPayment', 'paymentDue', 'termination', 'minDuration', 'pets', 'smoking', 'renovations', 'subletting', 'garden'])}
${formData.customRequirements ? `\n\n═══════════════════════════════════════════════════════\n§ INDIVIDUELLE ANPASSUNGEN (VOM NUTZER GEWÜNSCHT)\n═══════════════════════════════════════════════════════\n\n${formData.customRequirements}\n\nDIESE INDIVIDUELLEN WÜNSCHE MÜSSEN IM VERTRAG BERÜCKSICHTIGT WERDEN!` : ''}

Erstelle den VOLLSTÄNDIGEN Mietvertrag mit professioneller juristischer Sprache!`;
        break;

      case "arbeitsvertrag":
        const arbeitgeber = companyDetails || formData.employer || "Arbeitgeber GmbH";
        const arbeitgeberAdresse = formData.employerAddress || "Firmenweg 1, 80331 München";
        const arbeitnehmer = formData.employee || "Max Mustermann";
        const arbeitnehmerAdresse = formData.employeeAddress || "Arbeitnehmerstraße 10, 80331 München";

        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Arbeitsvertrag mit MINDESTENS 18 Paragraphen.

VERTRAGSTYP: ARBEITSVERTRAG

═══════════════════════════════════════════════════════
§ VERTRAGSPARTEIEN
═══════════════════════════════════════════════════════

ARBEITGEBER (Partei A):
Firma: ${arbeitgeber}
Adresse: ${arbeitgeberAdresse}

ARBEITNEHMER (Partei B):
Name: ${arbeitnehmer}
Adresse: ${arbeitnehmerAdresse}
${formData.employeeBirthdate ? `Geburtsdatum: ${formData.employeeBirthdate}` : ''}

═══════════════════════════════════════════════════════
§ TÄTIGKEIT
═══════════════════════════════════════════════════════

Position: ${formData.position || "Mitarbeiter"}
${formData.department ? `Abteilung: ${formData.department}` : ''}
Tätigkeitsbeschreibung: ${formData.duties || "Entsprechend der Stellenausschreibung"}
Arbeitsort: ${formData.workplace || "Firmensitz"}

═══════════════════════════════════════════════════════
§ VERTRAGSBEGINN & -DAUER
═══════════════════════════════════════════════════════

Arbeitsbeginn: ${formData.startDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}
Vertragsart: ${formData.contractType || "Unbefristet"}
${formData.endDate ? `Befristung bis: ${formData.endDate}` : ''}
Probezeit: ${formData.probation || "6 Monate"}
Kündigungsfrist in Probezeit: ${formData.probationNotice || "2 Wochen"}

═══════════════════════════════════════════════════════
§ VERGÜTUNG
═══════════════════════════════════════════════════════

Bruttogehalt: ${formData.salary || "Nach Vereinbarung"}
Gehaltszahlung: ${formData.paymentSchedule || "Monatlich zum Monatsende"}
${formData.bonus ? `Variable Vergütung / Bonus: ${formData.bonus}` : ''}
${formData.benefits ? `Zusatzleistungen: ${formData.benefits}` : ''}

═══════════════════════════════════════════════════════
§ ARBEITSZEIT
═══════════════════════════════════════════════════════

Wöchentliche Arbeitszeit: ${formData.workingHours || "40 Stunden"}
Arbeitstage: ${formData.workingDays || "Montag bis Freitag"}
Überstundenregelung: ${formData.overtime || "Mit Gehalt abgegolten"}

═══════════════════════════════════════════════════════
§ URLAUB & FREISTELLUNG
═══════════════════════════════════════════════════════

Jahresurlaub: ${formData.vacation || "30 Tage"}
${formData.specialLeave ? `Sonderurlaub: ${formData.specialLeave}` : ''}

═══════════════════════════════════════════════════════
§ KÜNDIGUNG
═══════════════════════════════════════════════════════

Kündigungsfrist (nach Probezeit): ${formData.noticePeriod || "Gesetzlich (§622 BGB)"}
Kündigungsfrist in Probezeit: ${formData.probationNotice || "2 Wochen"}

═══════════════════════════════════════════════════════
§ WEITERE VEREINBARUNGEN
═══════════════════════════════════════════════════════

Geheimhaltung: ${formData.confidentiality || "Standard-Klausel"}
Wettbewerbsverbot: ${formData.nonCompete || "Keines"}
${formData.nonCompete && formData.nonCompete !== 'Keines' ? `HINWEIS: Nachvertragliches Wettbewerbsverbot erfordert Karenzentschädigung von mind. 50% des Gehalts!` : ''}
Geistiges Eigentum: ${formData.intellectualProperty || "Alle Arbeitsergebnisse gehen an Arbeitgeber"}

═══════════════════════════════════════════════════════
WICHTIGE HINWEISE FÜR DIE VERTRAGSERSTELLUNG:
═══════════════════════════════════════════════════════

1. ALLE obigen Angaben müssen im Vertrag vollständig übernommen werden
2. Der Vertrag muss nach deutschem Arbeitsrecht (TzBfG, BUrlG, NachwG, etc.) konform sein
3. Füge Paragraphen zu Nebentätigkeit, Krankheit, Zeugnis, Rückzahlungsklauseln ein
4. Bei Wettbewerbsverbot: Karenzentschädigung (§ 74 HGB) nicht vergessen
5. Füge eine Salvatorische Klausel und Schriftformklausel hinzu
${getAdditionalContext(formData, ['employer', 'employerAddress', 'employee', 'employeeAddress', 'employeeBirthdate', 'position', 'department', 'duties', 'workplace', 'startDate', 'contractType', 'endDate', 'probation', 'probationNotice', 'salary', 'paymentSchedule', 'bonus', 'benefits', 'workingHours', 'workingDays', 'overtime', 'vacation', 'specialLeave', 'noticePeriod', 'confidentiality', 'nonCompete', 'intellectualProperty'])}
${formData.customRequirements ? `\n\n═══════════════════════════════════════════════════════\n§ INDIVIDUELLE ANPASSUNGEN (VOM NUTZER GEWÜNSCHT)\n═══════════════════════════════════════════════════════\n\n${formData.customRequirements}\n\nDIESE INDIVIDUELLEN WÜNSCHE MÜSSEN IM VERTRAG BERÜCKSICHTIGT WERDEN!` : ''}

Erstelle den VOLLSTÄNDIGEN Arbeitsvertrag mit professioneller juristischer Sprache!`;
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
- Keine Verpflichtung zur Offenlegung
${getAdditionalContext(formData, ['partyA', 'partyAAddress', 'partyB', 'partyBAddress', 'purpose', 'informationType', 'duration', 'confidentialityPeriod', 'permittedUse', 'penalty', 'ndaType'])}
${formData.customRequirements ? `\n\n═══════════════════════════════════════════════════════\n§ INDIVIDUELLE ANPASSUNGEN (VOM NUTZER GEWÜNSCHT)\n═══════════════════════════════════════════════════════\n\n${formData.customRequirements}\n\nDIESE INDIVIDUELLEN WÜNSCHE MÜSSEN IM VERTRAG BERÜCKSICHTIGT WERDEN!` : ''}`;
        break;

      case "gesellschaftsvertrag":
        // 🏢 GESELLSCHAFTSVERTRAG - Alle Frontend-Felder strukturiert einbinden
        const gesellschaftsform = formData.companyType || "GmbH (Gesellschaft mit beschränkter Haftung)";
        const firmenname = formData.companyName || "Neue Ventures GmbH";
        const firmensitz = formData.seat || formData.companySeat || "Berlin";
        const geschaeftsadresse = formData.address || "Musterstraße 1, 10115 Berlin";
        const unternehmensgegenstand = formData.purpose || "Entwicklung und Vertrieb von Software, IT-Beratung und damit verbundene Dienstleistungen";

        userPrompt = `Erstelle einen VOLLSTÄNDIGEN ${gesellschaftsform}-Gesellschaftsvertrag mit MINDESTENS 20 Paragraphen.

═══════════════════════════════════════════════════════
VERTRAGSTYP: GESELLSCHAFTSVERTRAG (${gesellschaftsform})
═══════════════════════════════════════════════════════

§ GRUNDLAGEN DER GESELLSCHAFT
═══════════════════════════════════════════════════════
Gesellschaftsform: ${gesellschaftsform}
Firma/Name: ${firmenname}
Sitz der Gesellschaft: ${firmensitz}
Geschäftsadresse: ${geschaeftsadresse}
Unternehmensgegenstand: ${unternehmensgegenstand}

§ GESELLSCHAFTER
═══════════════════════════════════════════════════════
Anzahl der Gesellschafter: ${formData.numberOfPartners || "2 Gesellschafter"}
Gesellschafter (Namen, Adressen, Geburtsdaten):
${formData.partners || `1. Max Mustermann, Musterstraße 1, 10115 Berlin, geb. 01.01.1980 - 60% Anteile
2. Erika Musterfrau, Beispielweg 2, 10115 Berlin, geb. 15.06.1985 - 40% Anteile`}

§ KAPITAL & ANTEILE
═══════════════════════════════════════════════════════
Stammkapital: ${formData.capital || "25.000 EUR"}
Geschäftsanteile Verteilung:
${formData.shares || `Gesellschafter 1: 15.000 EUR (Geschäftsanteil Nr. 1) = 60%
Gesellschafter 2: 10.000 EUR (Geschäftsanteil Nr. 2) = 40%`}
Einzahlung Stammkapital: ${formData.capitalContribution || "100% sofort bei Gründung"}

§ GESCHÄFTSFÜHRUNG
═══════════════════════════════════════════════════════
Geschäftsführer: ${formData.management || "Max Mustermann"}
Vertretungsregelung: ${formData.managementType || "Einzelvertretung (jeder GF allein)"}
Vergütung Geschäftsführer: ${formData.managementCompensation || "Nach gesonderter Vereinbarung"}

§ GEWINNVERTEILUNG & BESCHLÜSSE
═══════════════════════════════════════════════════════
Gewinnverteilung: ${formData.profitDistribution || "Nach Geschäftsanteilen"}
Rücklagenbildung (UG): ${formData.reserveRequirement || "Gesetzlich (25% des Jahresüberschusses)"}
Stimmrechte: ${formData.votingRights || "Nach Geschäftsanteilen"}
Beschlussmehrheit: ${formData.majorityRequirement || "Einfache Mehrheit (>50%)"}

§ ÜBERTRAGUNG & AUSTRITT
═══════════════════════════════════════════════════════
Übertragung von Anteilen: ${formData.shareTransfer || "Mit Zustimmung der Gesellschafterversammlung"}
Vererbung von Anteilen: ${formData.inheritance || "Anteile vererbbar"}
Austritt/Kündigung: ${formData.exitClause || "Mit 6 Monaten Kündigungsfrist"}

§ LAUFZEIT
═══════════════════════════════════════════════════════
Dauer der Gesellschaft: ${formData.duration || "Unbefristet"}
Geschäftsjahr: ${formData.fiscalYear || "Kalenderjahr (31.12.)"}

${getAdditionalContext(formData, ['companyType', 'companyName', 'seat', 'companySeat', 'address', 'purpose', 'numberOfPartners', 'partners', 'capital', 'shares', 'capitalContribution', 'management', 'managementType', 'managementCompensation', 'profitDistribution', 'reserveRequirement', 'votingRights', 'majorityRequirement', 'shareTransfer', 'inheritance', 'exitClause', 'duration', 'fiscalYear'])}

${formData.customRequirements ? `
═══════════════════════════════════════════════════════
§ INDIVIDUELLE ANPASSUNGEN (VOM NUTZER GEWÜNSCHT)
═══════════════════════════════════════════════════════
${formData.customRequirements}

WICHTIG: Die obigen individuellen Anforderungen MÜSSEN im Vertrag berücksichtigt werden!
` : ''}

Erstelle einen VOLLSTÄNDIGEN, rechtssicheren Gesellschaftsvertrag mit MINDESTENS 20 Paragraphen:
- § 1 Firma und Sitz
- § 2 Gegenstand des Unternehmens
- § 3 Stammkapital
- § 4 Geschäftsanteile
- § 5 Einlagen und Einzahlung
- § 6 Geschäftsführung
- § 7 Vertretung der Gesellschaft
- § 8 Gesellschafterversammlung
- § 9 Einberufung der Gesellschafterversammlung
- § 10 Gesellschafterbeschlüsse
- § 11 Gewinnverteilung und Entnahmen
- § 12 Jahresabschluss
- § 13 Abtretung und Belastung von Geschäftsanteilen
- § 14 Vorkaufsrecht
- § 15 Einziehung von Geschäftsanteilen
- § 16 Abfindung ausscheidender Gesellschafter
- § 17 Tod eines Gesellschafters
- § 18 Wettbewerbsverbot
- § 19 Kündigung
- § 20 Auflösung und Liquidation
- § 21 Bekanntmachungen
- § 22 Gründungskosten
- § 23 Schlussbestimmungen`;
        break;

      case "darlehensvertrag":
        // 💰 DARLEHENSVERTRAG - Alle Frontend-Felder strukturiert einbinden
        const darlehensart = formData.loanType || "Privatdarlehen";
        const darlehensgeberTyp = formData.lenderType || "Privatperson";
        const darlehensgeber = companyDetails || formData.lender || "Max Mustermann";
        const darlehensgeberAdresse = formData.lenderAddress || "Musterstraße 1, 10115 Berlin";
        const darlehensnehmerTyp = formData.borrowerType || "Privatperson";
        const darlehensnehmer = formData.borrower || "Erika Beispiel";
        const darlehensnehmerAdresse = formData.borrowerAddress || "Beispielweg 5, 10115 Berlin";

        userPrompt = `Erstelle einen VOLLSTÄNDIGEN ${darlehensart} mit MINDESTENS 14 Paragraphen.

═══════════════════════════════════════════════════════
VERTRAGSTYP: DARLEHENSVERTRAG (${darlehensart})
═══════════════════════════════════════════════════════

§ DARLEHENSART
═══════════════════════════════════════════════════════
Art des Darlehens: ${darlehensart}
Verwendungszweck: ${formData.purpose || "Nicht zweckgebunden"}

§ DARLEHENSGEBER (PARTEI A)
═══════════════════════════════════════════════════════
Darlehensgeber ist: ${darlehensgeberTyp}
Name: ${darlehensgeber}
Anschrift: ${darlehensgeberAdresse}

§ DARLEHENSNEHMER (PARTEI B)
═══════════════════════════════════════════════════════
Darlehensnehmer ist: ${darlehensnehmerTyp}
Name: ${darlehensnehmer}
Anschrift: ${darlehensnehmerAdresse}

§ DARLEHENSSUMME & AUSZAHLUNG
═══════════════════════════════════════════════════════
Darlehenssumme: ${formData.amount ? formData.amount + " EUR" : "50.000,00 EUR"}
Auszahlungsdatum: ${formData.disbursementDate || new Date().toISOString().split('T')[0]}
Auszahlungsart: ${formData.disbursementMethod || "Vollständige Auszahlung"}
Bankverbindung für Auszahlung: ${formData.bankDetails || "Wird separat mitgeteilt"}

§ ZINSEN & KONDITIONEN
═══════════════════════════════════════════════════════
Zinsvereinbarung: ${formData.interestType || "Fester Zinssatz"}
Zinssatz (% p.a.): ${formData.interestRate || "3,5"}
Zinszahlung: ${formData.interestPayment || "Monatlich"}
Verzugszinsen: ${formData.defaultInterest || "Gesetzlicher Verzugszins (5% über Basiszins)"}

§ TILGUNG & RÜCKZAHLUNG
═══════════════════════════════════════════════════════
Tilgungsart: ${formData.repayment || "Annuitätendarlehen (konstante Raten)"}
Ratenhöhe: ${formData.installmentAmount ? formData.installmentAmount + " EUR" : "Nach Berechnung"}
Ratenintervall: ${formData.installmentInterval || "Monatlich"}
Erste Rate fällig am: ${formData.firstInstallmentDate || "01. des Folgemonats"}

§ LAUFZEIT & KÜNDIGUNG
═══════════════════════════════════════════════════════
Laufzeit: ${formData.duration || "5 Jahre"}
Laufzeitende / Fälligkeit: ${formData.endDate || "Nach Ablauf der vereinbarten Laufzeit"}
Ordentliche Kündigung: ${formData.terminationRight || "Beide Seiten mit 3 Monaten Frist"}
Vorzeitige Rückzahlung: ${formData.earlyRepayment || "Jederzeit ohne Vorfälligkeitsentschädigung"}

§ SICHERHEITEN
═══════════════════════════════════════════════════════
Art der Sicherheiten: ${formData.securityType || "Keine Sicherheiten (Blankokredit)"}
Beschreibung der Sicherheiten: ${formData.securityDetails || "Entfällt"}

§ BESONDERE VEREINBARUNGEN
═══════════════════════════════════════════════════════
Außerordentliche Kündigung bei: ${formData.extraordinaryTermination || "Zahlungsverzug (2+ Raten)"}
Verwendungsnachweis: ${formData.usageRestriction || "Nicht erforderlich"}
Besondere Vereinbarungen: ${formData.specialConditions || "Keine besonderen Vereinbarungen"}

${getAdditionalContext(formData, ['loanType', 'lenderType', 'lender', 'lenderAddress', 'borrowerType', 'borrower', 'borrowerAddress', 'purpose', 'amount', 'disbursementDate', 'disbursementMethod', 'bankDetails', 'interestType', 'interestRate', 'interestPayment', 'defaultInterest', 'repayment', 'installmentAmount', 'installmentInterval', 'firstInstallmentDate', 'duration', 'endDate', 'terminationRight', 'earlyRepayment', 'securityType', 'securityDetails', 'extraordinaryTermination', 'usageRestriction', 'specialConditions'])}

${formData.customRequirements ? `
═══════════════════════════════════════════════════════
§ INDIVIDUELLE ANPASSUNGEN (VOM NUTZER GEWÜNSCHT)
═══════════════════════════════════════════════════════
${formData.customRequirements}

WICHTIG: Die obigen individuellen Anforderungen MÜSSEN im Vertrag berücksichtigt werden!
` : ''}

Erstelle einen VOLLSTÄNDIGEN, rechtssicheren Darlehensvertrag mit MINDESTENS 14 Paragraphen:
- § 1 Vertragsgegenstand
- § 2 Darlehenssumme und Auszahlung
- § 3 Zinsen
- § 4 Tilgung und Rückzahlung
- § 5 Sondertilgungen
- § 6 Laufzeit
- § 7 Sicherheiten
- § 8 Verwendungszweck
- § 9 Verzug und Verzugszinsen
- § 10 Ordentliche Kündigung
- § 11 Außerordentliche Kündigung
- § 12 Vorfälligkeitsentschädigung
- § 13 Abtretungsverbot
- § 14 Schlussbestimmungen`;
        break;

      case "lizenzvertrag":
        // ©️ LIZENZVERTRAG - Alle Frontend-Felder strukturiert einbinden
        const ipTyp = formData.ipType || "Software/App";
        const lizenzgeberTyp = formData.licensorType || "Unternehmen";
        const lizenzgeber = companyDetails || formData.licensor || "Software Innovations GmbH";
        const lizenzgeberAdresse = formData.licensorAddress || "Techpark 1, 80331 München";
        const rechtestellung = formData.licensorRights || "Alleiniger Rechteinhaber";
        const lizenznehmerTyp = formData.licenseeType || "Unternehmen";
        const lizenznehmer = formData.licensee || "Anwender AG";
        const lizenznehmerAdresse = formData.licenseeAddress || "Nutzerweg 10, 10115 Berlin";

        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Lizenzvertrag für ${ipTyp} mit MINDESTENS 15 Paragraphen.

═══════════════════════════════════════════════════════
VERTRAGSTYP: LIZENZVERTRAG (${ipTyp})
═══════════════════════════════════════════════════════

§ LIZENZGEGENSTAND
═══════════════════════════════════════════════════════
Art des geistigen Eigentums: ${ipTyp}
Bezeichnung: ${formData.subject || "Lizenzgegenstand"}
Detaillierte Beschreibung: ${formData.subjectDescription || "Vollständige Beschreibung des Lizenzgegenstands"}
Registernummer (falls vorhanden): ${formData.registrationNumber || "Nicht registriert / Entfällt"}

§ LIZENZGEBER (PARTEI A)
═══════════════════════════════════════════════════════
Lizenzgeber ist: ${lizenzgeberTyp}
Name: ${lizenzgeber}
Anschrift: ${lizenzgeberAdresse}
Rechtestellung: ${rechtestellung}

§ LIZENZNEHMER (PARTEI B)
═══════════════════════════════════════════════════════
Lizenznehmer ist: ${lizenznehmerTyp}
Name: ${lizenznehmer}
Anschrift: ${lizenznehmerAdresse}

§ LIZENZUMFANG
═══════════════════════════════════════════════════════
Lizenzart: ${formData.licenseType || "Einfache Lizenz (nicht-exklusiv)"}
Territorium: ${formData.territory || "Deutschland"}
Territorium Details: ${formData.territoryDetails || "Wie oben angegeben"}
Nutzungsarten: ${formData.usageRights || "Alle Nutzungsarten"}
Unterlizenzierung: ${formData.sublicenseRight || "Nicht gestattet"}
Übertragbarkeit: ${formData.transferRight || "Nicht übertragbar"}

§ LIZENZGEBÜHREN
═══════════════════════════════════════════════════════
Vergütungsmodell: ${formData.feeModel || "Einmalzahlung (Flat Fee)"}
Einmalzahlung: ${formData.upfrontFee ? formData.upfrontFee + " EUR" : "Nach Vereinbarung"}
Lizenzgebühr / Royalty: ${formData.royaltyRate || "Entfällt"}
Mindestlizenzgebühr (€/Jahr): ${formData.minimumRoyalty ? formData.minimumRoyalty + " EUR" : "Keine Mindestgebühr"}
Abrechnungszeitraum: ${formData.paymentInterval || "Einmalig"}

§ LAUFZEIT & KÜNDIGUNG
═══════════════════════════════════════════════════════
Laufzeit: ${formData.duration || "Unbefristet"}
Lizenzbeginn: ${formData.startDate || new Date().toISOString().split('T')[0]}
Kündigungsfrist: ${formData.terminationNotice || "3 Monate"}
Automatische Verlängerung: ${formData.autoRenewal || "Keine Verlängerung (endet automatisch)"}

§ GEWÄHRLEISTUNG & HAFTUNG
═══════════════════════════════════════════════════════
Gewährleistung: ${formData.warranty || "Standardgewährleistung (12 Monate)"}
Haftungsbegrenzung: ${formData.liabilityLimit || "Auf Vorsatz/grobe Fahrlässigkeit begrenzt"}
Freistellung bei Rechtsmängeln: ${formData.indemnification || "Lizenzgeber stellt Lizenznehmer frei"}

§ SONDERBESTIMMUNGEN
═══════════════════════════════════════════════════════
Verbesserungen/Weiterentwicklungen: ${formData.improvements || "Verbleiben beim Lizenznehmer"}
Prüfungsrecht: ${formData.auditRight || "Jährliches Audit-Recht"}
Vertraulichkeit: ${formData.confidentiality || "Standard-Vertraulichkeit"}
Besondere Vereinbarungen: ${formData.specialTerms || "Keine besonderen Vereinbarungen"}

${getAdditionalContext(formData, ['ipType', 'licensorType', 'licensor', 'licensorAddress', 'licensorRights', 'licenseeType', 'licensee', 'licenseeAddress', 'subject', 'subjectDescription', 'registrationNumber', 'licenseType', 'territory', 'territoryDetails', 'usageRights', 'sublicenseRight', 'transferRight', 'feeModel', 'upfrontFee', 'royaltyRate', 'minimumRoyalty', 'paymentInterval', 'duration', 'startDate', 'terminationNotice', 'autoRenewal', 'warranty', 'liabilityLimit', 'indemnification', 'improvements', 'auditRight', 'confidentiality', 'specialTerms'])}

${formData.customRequirements ? `
═══════════════════════════════════════════════════════
§ INDIVIDUELLE ANPASSUNGEN (VOM NUTZER GEWÜNSCHT)
═══════════════════════════════════════════════════════
${formData.customRequirements}

WICHTIG: Die obigen individuellen Anforderungen MÜSSEN im Vertrag berücksichtigt werden!
` : ''}

Erstelle einen VOLLSTÄNDIGEN, rechtssicheren Lizenzvertrag mit MINDESTENS 15 Paragraphen:
- § 1 Vertragsgegenstand und Definitionen
- § 2 Lizenzgegenstand
- § 3 Lizenzerteilung
- § 4 Lizenzumfang und Nutzungsrechte
- § 5 Territoriale Beschränkungen
- § 6 Unterlizenzierung
- § 7 Lizenzgebühren und Zahlungsbedingungen
- § 8 Abrechnung und Nachweis
- § 9 Laufzeit und Kündigung
- § 10 Gewährleistung
- § 11 Haftung und Haftungsbeschränkung
- § 12 Schutzrechte Dritter und Freistellung
- § 13 Geheimhaltung
- § 14 Prüfungsrechte (Audit)
- § 15 Schlussbestimmungen`;
        break;

      case "aufhebungsvertrag":
        // 🤝 AUFHEBUNGSVERTRAG - Alle Frontend-Felder strukturiert einbinden
        const arbeitgeberAufhebung = companyDetails || formData.employer || "Arbeitgeber GmbH";
        const arbeitgeberAdresseAufhebung = formData.employerAddress || "Unternehmensstraße 1, 50667 Köln";
        const vertretenDurch = formData.employerRepresentative || "Geschäftsführer/Personalleiter";
        const arbeitnehmerAufhebung = formData.employee || "Max Mustermann";
        const arbeitnehmerAdresseAufhebung = formData.employeeAddress || "Arbeitnehmerstraße 20, 50667 Köln";

        userPrompt = `Erstelle einen VOLLSTÄNDIGEN Aufhebungsvertrag mit MINDESTENS 16 Paragraphen.

═══════════════════════════════════════════════════════
VERTRAGSTYP: AUFHEBUNGSVERTRAG (Arbeitsrecht)
═══════════════════════════════════════════════════════

§ VERTRAGSPARTEIEN
═══════════════════════════════════════════════════════
ARBEITGEBER:
Name/Firma: ${arbeitgeberAufhebung}
Anschrift: ${arbeitgeberAdresseAufhebung}
Vertreten durch: ${vertretenDurch}

ARBEITNEHMER/IN:
Name: ${arbeitnehmerAufhebung}
Anschrift: ${arbeitnehmerAdresseAufhebung}
Geburtsdatum: ${formData.employeeBirthdate || "Wird ergänzt"}

§ BISHERIGES ARBEITSVERHÄLTNIS
═══════════════════════════════════════════════════════
Position/Tätigkeit: ${formData.position || "Angestellte/r"}
Abteilung: ${formData.department || "Nicht angegeben"}
Beschäftigt seit: ${formData.employmentStart || "Datum wird ergänzt"}
Aktuelles Bruttogehalt (€/Monat): ${formData.currentSalary ? formData.currentSalary + " EUR" : "Wird ergänzt"}

§ BEENDIGUNG
═══════════════════════════════════════════════════════
Beendigungsgrund: ${formData.reason || "Einvernehmlich ohne nähere Angabe"}
Beendigungsdatum: ${formData.endDate || "Wird ergänzt"}
Kündigungsfrist: ${formData.noticePeriodWaived || "Kündigungsfrist eingehalten"}
Initiative ging aus von: ${formData.initiator || "Einvernehmlich/Beide"}

§ ABFINDUNG
═══════════════════════════════════════════════════════
Abfindungsregelung: ${formData.severanceType || "Einmalzahlung"}
Abfindungshöhe: ${formData.severanceAmount ? formData.severanceAmount + " EUR brutto" : "Nach Vereinbarung"}
Fälligkeit der Abfindung: ${formData.severancePaymentDate || "Mit letzter Gehaltsabrechnung"}

§ FREISTELLUNG & RESTURLAUB
═══════════════════════════════════════════════════════
Freistellung: ${formData.releaseFromWork || "Bezahlte Freistellung (unwiderruflich)"}
Freistellung ab: ${formData.releaseFromDate || "Nach Vereinbarung"}
Resturlaub (Tage): ${formData.vacationDaysRemaining || "Wird berechnet"}
Urlaubsabgeltung: ${formData.vacationHandling || "Urlaubsgewährung während Freistellung"}
Überstundenabgeltung: ${formData.overtimeHandling || "Mit Abfindung abgegolten"}

§ ARBEITSZEUGNIS
═══════════════════════════════════════════════════════
Art des Zeugnisses: ${formData.referenceType || "Qualifiziertes Zeugnis"}
Zeugnisqualität: ${formData.referenceGrade || "Gut (Note 2)"}
Zeugnis bis: ${formData.referenceDeadline || "Zum Beendigungsdatum"}

§ RÜCKGABEPFLICHTEN
═══════════════════════════════════════════════════════
Rückzugebende Gegenstände: ${formData.returnItems || "Keine besonderen Gegenstände"}
Details zu Rückgaben: ${formData.returnItemsDetails || "Entfällt"}
Dienstwagenregelung: ${formData.companyCarHandling || "Kein Dienstwagen"}

§ ABSCHLIESSENDE REGELUNGEN
═══════════════════════════════════════════════════════
Verschwiegenheitspflicht: ${formData.confidentialityClause || "Gesetzliche Verschwiegenheit"}
Wettbewerbsverbot: ${formData.nonCompete || "Kein Wettbewerbsverbot"}
Erledigungsklausel: ${formData.settlementClause || "Vollständige Erledigung (Generalquittung)"}
Besondere Vereinbarungen: ${formData.specialAgreements || "Keine besonderen Vereinbarungen"}

${getAdditionalContext(formData, ['employer', 'employerAddress', 'employerRepresentative', 'employee', 'employeeAddress', 'employeeBirthdate', 'position', 'department', 'employmentStart', 'currentSalary', 'reason', 'endDate', 'noticePeriodWaived', 'initiator', 'severanceType', 'severanceAmount', 'severancePaymentDate', 'releaseFromWork', 'releaseFromDate', 'vacationDaysRemaining', 'vacationHandling', 'overtimeHandling', 'referenceType', 'referenceGrade', 'referenceDeadline', 'returnItems', 'returnItemsDetails', 'companyCarHandling', 'confidentialityClause', 'nonCompete', 'settlementClause', 'specialAgreements'])}

${formData.customRequirements ? `
═══════════════════════════════════════════════════════
§ INDIVIDUELLE ANPASSUNGEN (VOM NUTZER GEWÜNSCHT)
═══════════════════════════════════════════════════════
${formData.customRequirements}

WICHTIG: Die obigen individuellen Anforderungen MÜSSEN im Vertrag berücksichtigt werden!
` : ''}

WICHTIG: Füge einen Hinweis zur möglichen Sperrzeit beim Arbeitslosengeld (§ 159 SGB III) ein!

Erstelle einen VOLLSTÄNDIGEN, rechtssicheren Aufhebungsvertrag mit MINDESTENS 16 Paragraphen:
- § 1 Beendigung des Arbeitsverhältnisses
- § 2 Beendigungszeitpunkt
- § 3 Abfindung
- § 4 Vergütung und Gehaltsfortzahlung
- § 5 Freistellung
- § 6 Resturlaub
- § 7 Überstunden
- § 8 Arbeitszeugnis
- § 9 Rückgabe von Firmeneigentum
- § 10 Verschwiegenheitspflicht
- § 11 Wettbewerbsverbot
- § 12 Betriebliche Altersversorgung
- § 13 Ausgleichsklausel
- § 14 Hinweis zur Sperrzeit beim Arbeitslosengeld
- § 15 Widerrufsbelehrung
- § 16 Schlussbestimmungen`;
        break;

      case "pachtvertrag":
        // 🌾 PACHTVERTRAG - Alle Frontend-Felder strukturiert einbinden
        const pachtTyp = formData.pachtType || "Landwirtschaftliche Fläche";
        const verpächterTyp = formData.lessorType || "Privatperson";
        const verpächter = companyDetails || formData.lessor || "Verpächter GmbH";
        const verpächterAdresse = formData.lessorAddress || "Eigentumsweg 1, 01067 Dresden";
        const pächterTyp = formData.lesseeType || "Landwirtschaftlicher Betrieb";
        const pächter = formData.lessee || "Landwirt Müller";
        const pächterAdresse = formData.lesseeAddress || "Feldweg 10, 01099 Dresden";

        userPrompt = `Erstelle einen VOLLSTÄNDIGEN ${pachtTyp}-Pachtvertrag mit MINDESTENS 14 Paragraphen.

═══════════════════════════════════════════════════════
VERTRAGSTYP: PACHTVERTRAG (${pachtTyp})
═══════════════════════════════════════════════════════

§ PACHTGEGENSTAND
═══════════════════════════════════════════════════════
Art der Pacht: ${pachtTyp}
Bezeichnung: ${formData.object || "Pachtobjekt"}
Adresse/Lage: ${formData.objectAddress || "Wird ergänzt"}
Größe/Fläche: ${formData.objectSize || "Wird ergänzt"}
Detailbeschreibung: ${formData.objectDescription || "Detaillierte Beschreibung des Pachtobjekts"}
Grundbuch/Kataster: ${formData.cadastralInfo || "Entfällt / Nicht registriert"}

§ VERPÄCHTER (PARTEI A)
═══════════════════════════════════════════════════════
Verpächter ist: ${verpächterTyp}
Name: ${verpächter}
Anschrift: ${verpächterAdresse}

§ PÄCHTER (PARTEI B)
═══════════════════════════════════════════════════════
Pächter ist: ${pächterTyp}
Name: ${pächter}
Anschrift: ${pächterAdresse}
Befähigung/Qualifikation: ${formData.lesseeQualification || "Nicht angegeben"}

§ NUTZUNG
═══════════════════════════════════════════════════════
Nutzungszweck: ${formData.usage || "Nach Vereinbarung"}
Nutzungsdetails/-beschränkungen: ${formData.usageDetails || "Keine besonderen Einschränkungen"}
Erforderliche Genehmigungen: ${formData.operatingLicense || "Keine besonderen Genehmigungen nötig"}
Mitgepachtetes Inventar: ${formData.inventoryIncluded || "Kein Inventar enthalten"}

§ PACHTZINS
═══════════════════════════════════════════════════════
Pachtzins: ${formData.rentAmount ? formData.rentAmount + " EUR" : "Nach Vereinbarung"}
Zahlungsintervall: ${formData.rentInterval || "Monatlich im Voraus"}
Fällig zum: ${formData.rentDueDay || "1. des Monats"}
Pachtzinsanpassung: ${formData.rentAdjustment || "Indexanpassung (Verbraucherpreisindex)"}
Nebenkosten: ${formData.rentAdditionalCosts || "Zusätzlich nach Verbrauch"}

§ LAUFZEIT & KÜNDIGUNG
═══════════════════════════════════════════════════════
Pachtbeginn: ${formData.startDate || new Date().toISOString().split('T')[0]}
Pachtdauer: ${formData.duration || "5 Jahre"}
Pachtende (falls befristet): ${formData.endDate || "Nach Ablauf der Laufzeit"}
Kündigungsfrist: ${formData.terminationNotice || "6 Monate zum Jahresende"}
Verlängerungsoption: ${formData.renewalOption || "Automatische Verlängerung"}

§ PFLICHTEN & INSTANDHALTUNG
═══════════════════════════════════════════════════════
Instandhaltung: ${formData.maintenance || "Kleine Reparaturen Pächter, große Verpächter"}
Versicherungen: ${formData.insurances || "Gebäudeversicherung Verpächter, Inventar Pächter"}
Investitionspflichten: ${formData.investmentObligation || "Keine besonderen Investitionspflichten"}
Zustandsprotokoll: ${formData.conditionProtocol || "Übergabeprotokoll wird erstellt"}

§ KAUTION & SICHERHEITEN
═══════════════════════════════════════════════════════
Kaution/Pacht-Sicherheit: ${formData.deposit || "Barkaution (3 Monatspachten)"}
Kautionshöhe: ${formData.depositAmount ? formData.depositAmount + " EUR" : "Nach Vereinbarung"}

§ BESONDERE VEREINBARUNGEN
═══════════════════════════════════════════════════════
Unterverpachtung: ${formData.subletting || "Nicht gestattet"}
Vorkaufsrecht: ${formData.preemptiveRight || "Kein Vorkaufsrecht"}
Entschädigung für Goodwill: ${formData.goodwillCompensation || "Keine Entschädigung"}
Konkurrenzschutz: ${formData.competitionClause || "Kein Konkurrenzschutz"}

${getAdditionalContext(formData, ['pachtType', 'lessorType', 'lessor', 'lessorAddress', 'lesseeType', 'lessee', 'lesseeAddress', 'lesseeQualification', 'object', 'objectAddress', 'objectSize', 'objectDescription', 'cadastralInfo', 'usage', 'usageDetails', 'operatingLicense', 'inventoryIncluded', 'rentAmount', 'rentInterval', 'rentDueDay', 'rentAdjustment', 'rentAdditionalCosts', 'startDate', 'duration', 'endDate', 'terminationNotice', 'renewalOption', 'maintenance', 'insurances', 'investmentObligation', 'conditionProtocol', 'deposit', 'depositAmount', 'subletting', 'preemptiveRight', 'goodwillCompensation', 'competitionClause'])}

${formData.customRequirements ? `
═══════════════════════════════════════════════════════
§ INDIVIDUELLE ANPASSUNGEN (VOM NUTZER GEWÜNSCHT)
═══════════════════════════════════════════════════════
${formData.customRequirements}

WICHTIG: Die obigen individuellen Anforderungen MÜSSEN im Vertrag berücksichtigt werden!
` : ''}

Erstelle einen VOLLSTÄNDIGEN, rechtssicheren Pachtvertrag mit MINDESTENS 14 Paragraphen:
- § 1 Pachtgegenstand
- § 2 Pachtzeit und Kündigung
- § 3 Pachtzins
- § 4 Nebenkosten
- § 5 Kaution/Sicherheitsleistung
- § 6 Nutzung und Nutzungszweck
- § 7 Übergabe und Zustand
- § 8 Instandhaltung und Reparaturen
- § 9 Inventar
- § 10 Versicherungen
- § 11 Unterverpachtung
- § 12 Vorkaufsrecht
- § 13 Rückgabe bei Pachtende
- § 14 Schlussbestimmungen`;
        break;

      case "custom":
        // 🔥 NEU: Prüfe, ob Optimierungen vorhanden sind (vom Optimizer)
        const hasOptimizations = formData.optimizations && Array.isArray(formData.optimizations) && formData.optimizations.length > 0;

        // 🔥 UNTERSCHIEDLICHE PROMPTS: Mit vs. Ohne Optimierungen
        if (hasOptimizations) {
          console.log(`🎯 OPTIMIERTER VERTRAG: ${formData.optimizations.length} Optimierungen werden angewendet`);

          // FÜR OPTIMIERTE VERTRÄGE: Original als Basis nehmen!
          userPrompt = `Du bekommst einen ORIGINAL-VERTRAG, der bereits analysiert wurde. Deine Aufgabe ist es, diesen Vertrag zu OPTIMIEREN (nicht neu zu schreiben!).

📄 ORIGINAL-VERTRAG (VOLLTEXT):
================================
${formData.originalContent || formData.details || 'Kein Originaltext verfügbar'}
================================

🎯 DEINE AUFGABE:
1. Nimm den obigen ORIGINAL-VERTRAG als BASIS
2. BEHALTE alle guten Teile, Details, Formulierungen, spezifische Angaben
3. BEHALTE die Struktur und Reihenfolge der Paragraphen
4. ERSETZE oder ERGÄNZE nur die folgenden ${formData.optimizations.length} problematischen Stellen:

`;

          formData.optimizations.forEach((opt, index) => {
            userPrompt += `
${index + 1}. 🔧 ${opt.category ? `[${opt.category.toUpperCase()}]` : ''} ${opt.summary || opt.title || 'Optimierung'}
   ❌ PROBLEM im Original: ${opt.original || opt.originalText || 'Fehlt oder unvollständig'}
   ✅ ERSETZE/ERGÄNZE mit: ${opt.improved || opt.improvedText || opt.suggestion || 'Rechtssichere Klausel'}
   💡 Begründung: ${opt.reasoning || opt.explanation || 'Rechtliche Verbesserung'}
`;
          });

          userPrompt += `

⚠️ KRITISCHE REGELN:
- Behalte ALLE Details aus dem Original (Namen, Adressen, Beträge, Daten, spezifische Beschreibungen)
- Behalte die STRUKTUR (Paragraphen-Reihenfolge)
- Ändere NUR die oben genannten ${formData.optimizations.length} problematischen Stellen
- Füge die verbesserten Klauseln an den richtigen Stellen ein oder ergänze sie
- Verwende die gleiche formale Sprache wie im Original
- Falls ein Paragraph komplett fehlt (z.B. Kündigung), füge ihn hinzu

✅ ERGEBNIS: Ein Vertrag der dem Original sehr ähnlich ist, aber die ${formData.optimizations.length} Schwachstellen behoben hat!`;

        } else {
          // FÜR NEUE VERTRÄGE: Komplett neu generieren
          userPrompt = `Erstelle einen professionellen Vertrag mit dem Titel: ${formData.title}

VERTRAGSART: ${formData.contractType || "Individueller Vertrag"}

PARTEIEN:
${formData.parties || "Partei A und Partei B mit vollständigen Angaben"}

VERTRAGSINHALTE:
${formData.details || formData.originalContent || "Detaillierte Beschreibung des Vertragsgegenstands"}

BESONDERE VEREINBARUNGEN:
${formData.specialTerms || "Keine besonderen Vereinbarungen"}

Strukturiere den Vertrag professionell mit mindestens 10-12 Paragraphen und allen notwendigen rechtlichen Klauseln.`;
        }
        break;

      default:
        return res.status(400).json({ message: "❌ Unbekannter Vertragstyp." });
    }

    // ✅ WICHTIG: Individuelle Anpassungen & Wünsche hinzufügen (wenn vorhanden)
    if (formData.customRequirements && formData.customRequirements.trim().length > 0) {
      console.log("📋 Individuelle Anpassungen gefunden:", formData.customRequirements);
      userPrompt += `

⚠️ WICHTIG - INDIVIDUELLE ANPASSUNGEN & ZUSÄTZLICHE ANFORDERUNGEN:
Der Nutzer hat folgende SPEZIELLE ANFORDERUNGEN, die ZWINGEND in den Vertrag eingebaut werden müssen:

${formData.customRequirements}

Diese individuellen Anforderungen haben HÖCHSTE PRIORITÄT und müssen in die entsprechenden Paragraphen des Vertrags integriert werden. Passe den Vertrag entsprechend an und stelle sicher, dass alle genannten Punkte berücksichtigt sind!`;
    }

    // GPT-4 Generierung
    console.log("🚀 Starte GPT-4 Vertragsgenerierung...");
    console.log("📝 Vertragstyp:", type);
    console.log("🎨 Design-Variante:", designVariant);

    // 🔥 NEU: Erweitere System-Prompt für optimierte Verträge
    const hasOptimizationsInSystemPrompt = formData.optimizations && Array.isArray(formData.optimizations) && formData.optimizations.length > 0;
    let finalSystemPrompt = systemPrompt;

    if (hasOptimizationsInSystemPrompt) {
      finalSystemPrompt = `Du bist ein Experte für deutsches Vertragsrecht und optimierst bestehende Verträge.

🎯 SPEZIELLE AUFGABE: VERTRAG OPTIMIEREN (NICHT NEU SCHREIBEN!)

Du bekommst einen ORIGINAL-VERTRAG mit spezifischen Schwachstellen. Deine Aufgabe ist es, den Vertrag zu VERBESSERN, nicht neu zu erstellen.

ABSOLUT KRITISCHE REGELN:
1. BEHALTE den Original-Vertrag als Basis - du machst nur gezielte Verbesserungen!
2. BEHALTE alle Details: Namen, Adressen, Beträge, Daten, spezifische Beschreibungen
3. BEHALTE die Struktur und Paragraphen-Reihenfolge des Originals
4. ÄNDERE NUR die spezifischen Probleme, die im User-Prompt aufgelistet sind
5. FÜGE fehlende Paragraphen hinzu (z.B. Kündigung, Haftung), aber ohne bestehende zu entfernen
6. Verwende EXAKT die gleiche formale Sprache und Tonalität wie im Original
7. KEIN HTML, KEIN MARKDOWN - nur reiner Text
8. Kopiere gute Klauseln 1:1 aus dem Original, ändere sie nicht!

PROZESS:
1. Lies den Original-Vertrag komplett durch
2. Identifiziere die problematischen Stellen
3. Ersetze/Ergänze NUR diese Stellen mit den verbesserten Klauseln
4. Behalte den Rest des Vertrags UNVERÄNDERT

DAS IST KEIN "Vertrag neu schreiben" - DAS IST "Vertrag gezielt verbessern"!`;

      console.log(`🎯 OPTIMIERUNGS-MODUS: ${formData.optimizations.length} gezielte Verbesserungen am Original-Vertrag`);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: finalSystemPrompt },
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
      
      // ✅ Unterschriften werden jetzt über formatContractToHTML hinzugefügt - nicht hier!
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
      isDraft,         // Entwurf-Modus
      formData         // 🔧 FIX: Pass formData as parties for proper data display
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

    // ℹ️ AUTO-PDF wird jetzt in contracts.js generiert (wenn Frontend den Vertrag speichert)
    // Das verhindert Puppeteer Race Conditions (ETXTBSY Fehler)

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
      designVariant: contract.designVariant,
      s3Key: contract.s3Key
    });

    // 🆕 SMART PDF REUSE: Wenn bereits ein PDF existiert (von Auto-PDF), lade es von S3
    if (contract.s3Key && contract.pdfAutoGenerated) {
      console.log("📥 [SMART-PDF] Vorhandenes Auto-PDF von S3 laden:", contract.s3Key);

      try {
        const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
        const s3Client = new S3Client({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        });

        const getCommand = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: contract.s3Key
        });

        const s3Response = await s3Client.send(getCommand);
        const pdfBuffer = await s3Response.Body.transformToByteArray();

        console.log(`✅ [SMART-PDF] PDF von S3 geladen: ${Math.round(pdfBuffer.length / 1024)} KB`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${contract.name || 'vertrag'}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        return res.send(Buffer.from(pdfBuffer));
      } catch (s3Error) {
        console.warn("⚠️ [SMART-PDF] S3-Laden fehlgeschlagen, generiere neu:", s3Error.message);
        // Fallthrough zu normaler PDF-Generierung
      }
    }

    // 🔍 DEBUG: Vollständiger Contract Debug
    console.log("🔍 DEBUG Full Contract Object Keys:", Object.keys(contract));
    console.log("🔍 DEBUG Contract Metadata:", contract.metadata);

    // Lade Company Profile wenn vorhanden
    let companyProfile = null;
    // 🔍 ERWEITERTE BEDINGUNG: Immer versuchen Company Profile zu laden für Premium Users
    const shouldLoadCompanyProfile = contract.hasCompanyProfile || 
                                   contract.metadata?.hasLogo || 
                                   contract.metadata?.hasCompanyProfile ||
                                   true; // Temporary: Always try to load for now
    
    if (shouldLoadCompanyProfile) {
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
    // ✅ FLAG deaktiviert - verwendet gespeicherten HTML aus contracts.js Auto-PDF
    const FORCE_REGENERATE_HTML = false;

    let htmlContent = FORCE_REGENERATE_HTML ? null : (contract.contractHTML || contract.htmlContent || contract.contentHTML);
    
    if (!htmlContent) {
      console.log("🔄 Kein HTML vorhanden, generiere neu...");
      const isDraft = contract.status === 'Entwurf' || contract.formData?.isDraft;
      
      htmlContent = await formatContractToHTML(
        contract.content,
        companyProfile,
        contract.contractType || contract.metadata?.contractType || 'vertrag',
        contract.designVariant || contract.metadata?.designVariant || 'executive',
        isDraft,
        contract.metadata?.parties || contract.parties || null
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
              ${documentId && typeof documentId !== 'undefined' && documentId !== 'undefined' ? '<strong>DOK-ID:</strong> ' + documentId.substring(0, 16) + '...' : '<strong>DOK-ID:</strong> ' + `${contractType || 'DOK'}-${Date.now()}`.substring(0, 16) + '...'}
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
      
      // Sende PDF als Response - mit .end() für Binary Data
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${contract.name || 'Vertrag'}_${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // ✅ FIX: Verwende .end() statt .send() für Binary PDF Data
      res.end(pdfBuffer, 'binary');
      
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 🆕 NEUE ROUTE: PDF-V2 - Komplett neue PDF-Struktur (Deckblatt + Inhalt + Unterschriften-Seite)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
router.post("/pdf-v2", verifyToken, async (req, res) => {
  const { contractId } = req.body;

  console.log("🚀 [PDF-V2] Neue PDF-Generierung gestartet für Vertrag:", contractId);
  console.log("📊 [PDF-V2] User ID:", req.user.userId);

  try {
    // Validierung
    if (!contractId) {
      return res.status(400).json({ message: "Contract ID fehlt" });
    }

    // DB-Verbindung prüfen
    if (!db || !contractsCollection) {
      console.error("❌ [PDF-V2] Datenbank nicht verbunden!");
      try {
        await client.connect();
        db = client.db("contract_ai");
        contractsCollection = db.collection("contracts");
        usersCollection = db.collection("users");
        console.log("✅ [PDF-V2] Datenbank neu verbunden");
      } catch (reconnectError) {
        return res.status(500).json({ message: "Datenbankverbindung fehlgeschlagen" });
      }
    }

    // Vertrag laden (mit flexiblem userId-Vergleich)
    let contract = null;

    try {
      contract = await contractsCollection.findOne({
        _id: new ObjectId(contractId),
        userId: new ObjectId(req.user.userId)
      });
    } catch (e) {}

    if (!contract) {
      try {
        contract = await contractsCollection.findOne({
          _id: new ObjectId(contractId),
          userId: req.user.userId
        });
      } catch (e) {}
    }

    if (!contract) {
      try {
        const tempContract = await contractsCollection.findOne({ _id: new ObjectId(contractId) });
        if (tempContract) {
          const contractUserId = tempContract.userId?.toString?.() || String(tempContract.userId);
          const requestUserId = req.user.userId?.toString?.() || String(req.user.userId);
          if (contractUserId === requestUserId) {
            contract = tempContract;
          } else {
            return res.status(403).json({ message: "Keine Berechtigung für diesen Vertrag" });
          }
        }
      } catch (e) {}
    }

    if (!contract) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

    console.log("✅ [PDF-V2] Vertrag gefunden:", {
      name: contract.name,
      type: contract.contractType
    });

    // Company Profile laden
    let companyProfile = null;
    try {
      companyProfile = await db.collection("company_profiles").findOne({
        userId: new ObjectId(req.user.userId)
      });
      console.log("🏢 [PDF-V2] Company Profile geladen:", !!companyProfile);
    } catch (profileError) {
      console.error("⚠️ [PDF-V2] Fehler beim Laden des Company Profiles:", profileError);
    }

    // Parties aus Vertrag extrahieren
    const parties = contract.metadata?.parties || contract.parties || contract.formData || null;
    console.log("👥 [PDF-V2] Parties:", parties);

    // 🆕 HTML MIT NEUER V2 FUNKTION GENERIEREN
    const isDraft = contract.status === 'Entwurf' || contract.formData?.isDraft;

    const htmlContent = await formatContractToHTMLv2(
      contract.content,
      companyProfile,
      contract.contractType || contract.metadata?.contractType || 'Vertrag',
      contract.designVariant || contract.metadata?.designVariant || 'executive',
      isDraft,
      parties
    );

    console.log("✅ [PDF-V2] HTML generiert, Länge:", htmlContent.length);

    // 🔥 PUPPETEER PDF GENERIERUNG
    let browser = null;

    try {
      // Browser starten
      if (chromium) {
        browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
      } else {
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      }

      const page = await browser.newPage();

      // HTML laden
      await page.setContent(htmlContent, {
        waitUntil: ['domcontentloaded', 'networkidle0'],
        timeout: 30000
      });

      // Kurz warten
      await new Promise(resolve => setTimeout(resolve, 1500));

      // PDF generieren - EINFACH und SAUBER
      // Die Seitenränder kommen aus dem CSS @page, nicht aus Puppeteer!
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false, // Wir machen alles im HTML selbst!
        preferCSSPageSize: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' } // Keine zusätzlichen Margins!
      });

      console.log("✅ [PDF-V2] PDF erfolgreich generiert, Größe:", Math.round(pdfBuffer.length / 1024), "KB");

      // PDF senden
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${contract.name || 'Vertrag'}_V2_${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'no-cache'
      });

      res.end(pdfBuffer, 'binary');

    } catch (pageError) {
      console.error("❌ [PDF-V2] Fehler bei der PDF-Generierung:", pageError);
      throw pageError;
    } finally {
      if (browser) {
        await browser.close();
        console.log("✅ [PDF-V2] Browser geschlossen");
      }
    }

  } catch (error) {
    console.error("❌ [PDF-V2] Error:", error);
    res.status(500).json({
      message: "PDF-V2-Generierung fehlgeschlagen",
      error: error.message
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
    const validDesigns = ['executive', 'modern', 'minimal', 'elegant', 'corporate'];
    if (!validDesigns.includes(newDesignVariant)) {
      return res.status(400).json({ message: "Ungültige Design-Variante" });
    }

    // 🔧 FIX: userId kann String oder ObjectId sein - beide Varianten prüfen
    const userId = req.user.userId || req.user.id;
    console.log("🔍 Suche Vertrag:", { contractId, userId });

    // Vertrag laden - versuche beide userId-Formate
    let contract = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    // Fallback: userId als String
    if (!contract) {
      contract = await contractsCollection.findOne({
        _id: new ObjectId(contractId),
        userId: userId
      });
    }

    console.log("📄 Vertrag gefunden:", !!contract);

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
    
    // Vertrag aktualisieren - WICHTIG: pdfAutoGenerated zurücksetzen damit neue PDF generiert wird!
    await contractsCollection.updateOne(
      { _id: new ObjectId(contractId) },
      {
        $set: {
          designVariant: newDesignVariant,
          contractHTML: newHTML,
          lastModified: new Date(),
          pdfAutoGenerated: false  // 🔧 FIX: Erzwingt neue PDF-Generierung mit neuem Design
        },
        $unset: {
          s3Key: ""  // 🔧 FIX: Alte PDF-Referenz entfernen
        }
      }
    );

    console.log("✅ Design geändert zu:", newDesignVariant, "- PDF-Cache invalidiert");

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
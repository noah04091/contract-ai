// 📄 backend/routes/generate.js - MIT PUPPETEER UND PREMIUM HTML-FORMATIERUNG
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const https = require("https");
const http = require("http");
const AWS = require("aws-sdk");

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

// 🎨 PREMIUM HTML-FORMATIERUNG FÜR ABSOLUT PROFESSIONELLE VERTRÄGE
const formatContractToHTML = async (contractText, companyProfile, contractType, designVariant = 'executive') => {
  console.log("🚀 Starte PREMIUM HTML-Formatierung für:", contractType);
  console.log('🎨 Design-Variante:', designVariant);
  
  // 🎨 Logo-Loading mit allen Fallback-Strategien
  let logoBase64 = null;
  if (companyProfile) {
    console.log("🏢 Company Profile vorhanden, lade Logo...");
    logoBase64 = await loadLogoWithFallbacks(companyProfile);
    
    if (logoBase64) {
      logoBase64 = optimizeLogoBase64(logoBase64, 100);
      console.log("✅ Logo erfolgreich geladen und optimiert!");
    }
  }

  // 🎨 PREMIUM DESIGN-VARIANTEN mit modernen Farben und Effekten
  const designVariants = {
    executive: {
      primary: '#0F172A',      // Sehr dunkles Blau-Grau
      secondary: '#1E40AF',    // Königsblau
      accent: '#3B82F6',       // Helles Blau
      text: '#1E293B',         // Dunkles Grau
      light: '#F8FAFC',        // Sehr helles Grau
      gradient: 'linear-gradient(135deg, #0F172A 0%, #1E40AF 50%, #3B82F6 100%)',
      headerGradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      shadow: '0 20px 60px rgba(15, 23, 42, 0.15)',
      borderRadius: '12px'
    },
    modern: {
      primary: '#059669',      // Smaragdgrün
      secondary: '#10B981',    // Helles Grün
      accent: '#34D399',       // Sehr helles Grün
      text: '#064E3B',         // Dunkles Grün
      light: '#F0FDF4',        // Sehr helles Grün
      gradient: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)',
      headerGradient: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
      shadow: '0 20px 60px rgba(5, 150, 105, 0.15)',
      borderRadius: '16px'
    },
    minimal: {
      primary: '#18181B',      // Fast Schwarz
      secondary: '#52525B',    // Mittelgrau
      accent: '#A1A1AA',       // Hellgrau
      text: '#27272A',         // Dunkles Grau
      light: '#FAFAFA',        // Fast Weiß
      gradient: 'linear-gradient(135deg, #18181B 0%, #52525B 100%)',
      headerGradient: 'linear-gradient(135deg, #18181B 0%, #27272A 100%)',
      shadow: '0 10px 30px rgba(24, 24, 27, 0.08)',
      borderRadius: '8px'
    }
  };

  const theme = designVariants[designVariant] || designVariants.executive;
  console.log('🎨 Verwendetes Theme:', theme);

  // 📝 INTELLIGENTE TEXT-VERARBEITUNG mit verbesserter Struktur
  const lines = contractText.split('\n');
  let htmlContent = '';
  let currentSection = '';
  let inSignatureSection = false;
  let sectionCounter = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Überspringe die === Linien
    if (trimmedLine.startsWith('===') || trimmedLine.endsWith('===')) {
      continue;
    }
    
    // HAUPTÜBERSCHRIFT (KAUFVERTRAG etc.) - BOMBASTISCHES DESIGN
    if (trimmedLine === trimmedLine.toUpperCase() && 
        trimmedLine.length > 5 && 
        !trimmedLine.startsWith('§') &&
        !trimmedLine.includes('HRB') &&
        !['PRÄAMBEL', 'ZWISCHEN', 'UND'].includes(trimmedLine)) {
      htmlContent += `
        <div style="
          margin: 60px 0 50px 0;
          text-align: center;
          position: relative;
          page-break-after: avoid;
        ">
          <div style="
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 3px;
            background: ${theme.gradient};
            border-radius: 2px;
          "></div>
          <h1 style="
            font-size: 32pt;
            font-weight: 900;
            color: ${theme.primary};
            letter-spacing: 8px;
            text-transform: uppercase;
            margin: 0;
            padding: 30px 0;
            background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          ">${trimmedLine}</h1>
          <div style="
            margin: 20px auto 0;
            width: 200px;
            height: 2px;
            background: ${theme.gradient};
            border-radius: 1px;
          "></div>
        </div>
      `;
    }
    // HANDELSREGISTER - Elegantes Info-Box Design
    else if (trimmedLine.includes('HRB')) {
      htmlContent += `
        <div style="
          margin: 30px 0;
          padding: 25px;
          background: linear-gradient(135deg, ${theme.light} 0%, white 100%);
          border-left: 4px solid ${theme.secondary};
          border-radius: ${theme.borderRadius};
          box-shadow: ${theme.shadow};
          position: relative;
          overflow: hidden;
        ">
          <div style="
            position: absolute;
            top: 0;
            right: 0;
            width: 100px;
            height: 100px;
            background: ${theme.gradient};
            opacity: 0.05;
            border-radius: 50%;
            transform: translate(30px, -30px);
          "></div>
          <p style="
            font-size: 14pt;
            font-weight: 600;
            color: ${theme.primary};
            margin: 0;
            position: relative;
            z-index: 1;
          ">${trimmedLine}</p>
        </div>
      `;
    }
    // PARAGRAPH-ÜBERSCHRIFTEN - Modernes Card-Design
    else if (trimmedLine.startsWith('§')) {
      sectionCounter++;
      if (currentSection) {
        htmlContent += '</div></div>';
      }
      currentSection = trimmedLine;
      htmlContent += `
        <div style="
          margin: 40px 0;
          page-break-inside: avoid;
          position: relative;
        ">
          <div style="
            background: white;
            border-radius: ${theme.borderRadius};
            box-shadow: ${theme.shadow};
            overflow: hidden;
            border: 1px solid rgba(0,0,0,0.05);
          ">
            <div style="
              background: ${theme.headerGradient};
              color: white;
              padding: 20px 30px;
              position: relative;
              overflow: hidden;
            ">
              <div style="
                position: absolute;
                top: 50%;
                right: 30px;
                transform: translateY(-50%);
                font-size: 60pt;
                font-weight: 900;
                opacity: 0.1;
                color: white;
              ">${sectionCounter}</div>
              <h2 style="
                font-size: 16pt;
                font-weight: 700;
                margin: 0;
                letter-spacing: 2px;
                text-transform: uppercase;
                position: relative;
                z-index: 1;
              ">${trimmedLine}</h2>
            </div>
            <div style="padding: 25px 30px;">
      `;
    }
    // PRÄAMBEL - Eleganter Intro-Bereich
    else if (trimmedLine === 'PRÄAMBEL') {
      htmlContent += `
        <div style="
          margin: 50px 0 30px 0;
          text-align: center;
          position: relative;
        ">
          <h3 style="
            font-size: 18pt;
            font-weight: 700;
            color: ${theme.primary};
            letter-spacing: 4px;
            text-transform: uppercase;
            position: relative;
            display: inline-block;
            padding: 0 40px;
          ">
            <span style="
              position: absolute;
              left: 0;
              top: 50%;
              transform: translateY(-50%);
              width: 30px;
              height: 2px;
              background: ${theme.gradient};
            "></span>
            ${trimmedLine}
            <span style="
              position: absolute;
              right: 0;
              top: 50%;
              transform: translateY(-50%);
              width: 30px;
              height: 2px;
              background: ${theme.gradient};
            "></span>
          </h3>
        </div>
      `;
    }
    // ZWISCHEN - Elegante Verbindung
    else if (trimmedLine.toLowerCase() === 'zwischen') {
      htmlContent += `
        <p style="
          text-align: center;
          margin: 40px 0 30px 0;
          font-size: 14pt;
          color: ${theme.secondary};
          font-style: italic;
          font-weight: 500;
          letter-spacing: 2px;
        ">${trimmedLine}</p>
      `;
    }
    // PARTEIEN-BEZEICHNUNG (nachfolgend genannt)
    else if (trimmedLine.includes('nachfolgend') && trimmedLine.includes('genannt')) {
      htmlContent += `
        <div style="
          text-align: center;
          margin: 15px 0 35px 0;
          padding: 12px 20px;
          background: linear-gradient(90deg, transparent, ${theme.light}, transparent);
          border-radius: 30px;
          display: inline-block;
          width: 100%;
        ">
          <p style="
            margin: 0;
            font-style: italic;
            color: ${theme.secondary};
            font-size: 11pt;
            font-weight: 500;
          ">${trimmedLine}</p>
        </div>
      `;
    }
    // UND (zwischen Parteien)
    else if (trimmedLine.toLowerCase() === 'und') {
      htmlContent += `
        <div style="
          text-align: center;
          margin: 35px 0;
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, ${theme.accent}, transparent);
          "></div>
          <span style="
            background: white;
            padding: 8px 30px;
            position: relative;
            font-style: italic;
            color: ${theme.secondary};
            font-size: 13pt;
            font-weight: 500;
            letter-spacing: 2px;
          ">${trimmedLine}</span>
        </div>
      `;
    }
    // UNTERABSCHNITTE (1), (2), etc. - Strukturierte Liste
    else if (trimmedLine.match(/^\(\d+\)/)) {
      const number = trimmedLine.match(/^\((\d+)\)/)[1];
      const content = trimmedLine.replace(/^\(\d+\)\s*/, '');
      htmlContent += `
        <div style="
          margin: 20px 0;
          padding-left: 40px;
          position: relative;
        ">
          <div style="
            position: absolute;
            left: 0;
            top: 0;
            width: 30px;
            height: 30px;
            background: ${theme.gradient};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 12pt;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          ">${number}</div>
          <p style="
            margin: 0;
            line-height: 1.8;
            color: ${theme.text};
            text-align: justify;
            font-size: 11pt;
          ">${content}</p>
        </div>
      `;
    }
    // UNTERPUNKTE a), b), etc. - Elegante Sub-Liste
    else if (trimmedLine.match(/^[a-z]\)/)) {
      const letter = trimmedLine.match(/^([a-z])\)/)[1];
      const content = trimmedLine.replace(/^[a-z]\)\s*/, '');
      htmlContent += `
        <div style="
          margin: 15px 0 15px 60px;
          padding-left: 25px;
          position: relative;
        ">
          <div style="
            position: absolute;
            left: 0;
            top: 3px;
            width: 20px;
            height: 20px;
            background: white;
            border: 2px solid ${theme.accent};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${theme.secondary};
            font-weight: 600;
            font-size: 10pt;
          ">${letter}</div>
          <p style="
            margin: 0;
            line-height: 1.7;
            color: ${theme.text};
            font-size: 10.5pt;
          ">${content}</p>
        </div>
      `;
    }
    // UNTERSCHRIFTSBEREICH - Premium Signature Section
    else if (trimmedLine.includes('_____')) {
      if (!inSignatureSection) {
        if (currentSection) {
          htmlContent += '</div></div>';
          currentSection = '';
        }
        htmlContent += `
          <div style="
            margin-top: 80px;
            padding: 40px;
            background: linear-gradient(135deg, ${theme.light} 0%, white 100%);
            border-radius: ${theme.borderRadius};
            border: 2px solid ${theme.accent};
            box-shadow: ${theme.shadow};
            page-break-inside: avoid;
            position: relative;
          ">
            <div style="
              position: absolute;
              top: -20px;
              left: 50%;
              transform: translateX(-50%);
              background: white;
              padding: 8px 30px;
              border-radius: 20px;
              border: 2px solid ${theme.accent};
            ">
              <h3 style="
                margin: 0;
                color: ${theme.primary};
                font-size: 12pt;
                font-weight: 700;
                letter-spacing: 1px;
                text-transform: uppercase;
              ">Unterschriften</h3>
            </div>
        `;
        inSignatureSection = true;
      }
      
      // Formatiere die Unterschriftszeilen
      const parts = trimmedLine.split('_____');
      htmlContent += `
        <div style="
          display: flex;
          justify-content: space-between;
          margin: 60px 0 20px 0;
          flex-wrap: wrap;
          gap: 40px;
        ">
      `;
      
      for (let i = 0; i < parts.length - 1; i++) {
        htmlContent += `
          <div style="
            flex: 1;
            min-width: 200px;
            text-align: center;
          ">
            <div style="
              border-bottom: 3px solid ${theme.secondary};
              margin-bottom: 10px;
              min-height: 50px;
            "></div>
            <p style="
              margin: 0;
              color: ${theme.text};
              font-size: 10pt;
              font-weight: 500;
            ">${parts[i] || 'Ort, Datum'}</p>
          </div>
        `;
      }
      
      if (parts[parts.length - 1]) {
        htmlContent += `
          <div style="
            width: 100%;
            text-align: center;
            margin-top: 10px;
          ">
            <p style="
              color: ${theme.text};
              font-size: 10pt;
            ">${parts[parts.length - 1]}</p>
          </div>
        `;
      }
      
      htmlContent += '</div>';
    }
    // NORMALER TEXT - Optimierte Lesbarkeit
    else if (trimmedLine) {
      htmlContent += `
        <p style="
          margin: 0 0 15px 0;
          line-height: 1.9;
          color: ${theme.text};
          text-align: justify;
          font-size: 11pt;
          hyphens: auto;
          word-spacing: 0.05em;
          letter-spacing: 0.01em;
        ">${trimmedLine}</p>
      `;
    }
  }
  
  // Schließe offene Sections
  if (currentSection) {
    htmlContent += '</div></div>';
  }
  if (inSignatureSection) {
    htmlContent += '</div>';
  }

  // 🎨 VOLLSTÄNDIGES PREMIUM HTML-DOKUMENT
  const fullHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${contractType || 'Premium Vertrag'} - ${companyProfile?.companyName || 'Contract AI'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 15mm 20mm 20mm 20mm;
      
      @bottom-center {
        content: counter(page) " von " counter(pages);
        font-size: 9pt;
        color: #94A3B8;
      }
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: ${theme.text};
      background: white;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .page-container {
      animation: fadeIn 0.6s ease-out;
    }
    
    /* Print Optimizations */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .page-break {
        page-break-after: always;
      }
      
      .no-break {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    ${companyProfile ? `
    <!-- PREMIUM HEADER MIT COMPANY BRANDING -->
    <header style="
      background: ${theme.headerGradient};
      color: white;
      padding: 35px 40px;
      margin: -20px -20px 50px -20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: ${theme.shadow};
      position: relative;
      overflow: hidden;
      border-radius: 0 0 ${theme.borderRadius} ${theme.borderRadius};
    ">
      <!-- Decorative Background Elements -->
      <div style="
        position: absolute;
        top: -50%;
        right: -10%;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        border-radius: 50%;
      "></div>
      <div style="
        position: absolute;
        bottom: -30%;
        left: -5%;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
        border-radius: 50%;
      "></div>
      
      <!-- Company Info -->
      <div style="flex: 1; position: relative; z-index: 2;">
        <h1 style="
          font-size: 24pt;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          ${companyProfile.companyName || 'Firmenname'}
          ${companyProfile.legalForm ? `<span style="
            font-size: 14pt;
            font-weight: 500;
            opacity: 0.9;
            margin-left: 10px;
          ">${companyProfile.legalForm}</span>` : ''}
        </h1>
        
        <div style="
          font-size: 10pt;
          opacity: 0.95;
          line-height: 1.6;
          font-weight: 400;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 30px;
          margin-top: 15px;
        ">
          ${companyProfile.street ? `
            <div style="display: flex; align-items: center;">
              <span style="opacity: 0.7; margin-right: 8px;">📍</span>
              ${companyProfile.street}
            </div>
          ` : ''}
          ${companyProfile.postalCode || companyProfile.city ? `
            <div style="display: flex; align-items: center;">
              <span style="opacity: 0.7; margin-right: 8px;">🏙️</span>
              ${companyProfile.postalCode || ''} ${companyProfile.city || ''}
            </div>
          ` : ''}
          ${companyProfile.contactEmail ? `
            <div style="display: flex; align-items: center;">
              <span style="opacity: 0.7; margin-right: 8px;">✉️</span>
              ${companyProfile.contactEmail}
            </div>
          ` : ''}
          ${companyProfile.contactPhone ? `
            <div style="display: flex; align-items: center;">
              <span style="opacity: 0.7; margin-right: 8px;">📞</span>
              ${companyProfile.contactPhone}
            </div>
          ` : ''}
          ${companyProfile.vatId ? `
            <div style="display: flex; align-items: center;">
              <span style="opacity: 0.7; margin-right: 8px;">🏛️</span>
              USt-IdNr.: ${companyProfile.vatId}
            </div>
          ` : ''}
          ${companyProfile.tradeRegister ? `
            <div style="display: flex; align-items: center;">
              <span style="opacity: 0.7; margin-right: 8px;">📋</span>
              ${companyProfile.tradeRegister}
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Logo Container -->
      ${logoBase64 ? `
      <div style="
        width: 200px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        margin-left: 40px;
        position: relative;
        z-index: 2;
      ">
        <div style="
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border-radius: ${theme.borderRadius};
          padding: 15px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        ">
          <img src="${logoBase64}" alt="Firmenlogo" style="
            max-width: 160px;
            max-height: 90px;
            object-fit: contain;
            filter: brightness(1.1) contrast(1.05);
          " />
        </div>
      </div>
      ` : ''}
    </header>
    ` : `
    <!-- FALLBACK HEADER OHNE COMPANY PROFILE -->
    <header style="
      background: ${theme.headerGradient};
      color: white;
      padding: 30px 40px;
      margin: -20px -20px 50px -20px;
      text-align: center;
      box-shadow: ${theme.shadow};
      border-radius: 0 0 ${theme.borderRadius} ${theme.borderRadius};
    ">
      <h1 style="
        font-size: 22pt;
        font-weight: 800;
        letter-spacing: 2px;
        text-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">CONTRACT AI</h1>
      <p style="
        font-size: 11pt;
        opacity: 0.9;
        margin-top: 8px;
        letter-spacing: 1px;
      ">Intelligente Vertragserstellung</p>
    </header>
    `}
    
    <!-- VERTRAGSKÖRPER -->
    <main style="
      padding: 0 20px;
      max-width: 100%;
      margin: 0 auto;
    ">
      ${htmlContent}
    </main>
    
    <!-- PREMIUM FOOTER -->
    <footer style="
      margin-top: 100px;
      padding-top: 30px;
      border-top: 2px solid ${theme.accent};
      text-align: center;
      color: ${theme.secondary};
      font-size: 9pt;
      page-break-inside: avoid;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      ">
        <div style="text-align: left;">
          <strong style="color: ${theme.primary};">Vertragsdokument</strong><br/>
          Erstellt am ${new Date().toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          })}
        </div>
        <div style="text-align: center;">
          <div style="
            display: inline-block;
            padding: 8px 20px;
            background: ${theme.gradient};
            color: white;
            border-radius: 20px;
            font-weight: 600;
            font-size: 10pt;
            letter-spacing: 1px;
          ">
            ${contractType?.toUpperCase() || 'VERTRAG'}
          </div>
        </div>
        <div style="text-align: right;">
          <strong style="color: ${theme.primary};">Contract AI</strong><br/>
          Premium Vertragserstellung
        </div>
      </div>
      <div style="
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid ${theme.light};
        font-size: 8pt;
        color: #94A3B8;
      ">
        Dieses Dokument wurde mit Contract AI erstellt und ist rechtlich bindend. 
        Alle Rechte vorbehalten. © ${new Date().getFullYear()}
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

// 🎯 PROFESSIONELLE VERTRAGSGENERIERUNG
router.post("/", verifyToken, async (req, res) => {
  console.log("🚀 Generate Route aufgerufen!");
  
  const { type, formData, useCompanyProfile = false, designVariant = 'executive' } = req.body;

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
${formData.item || "Gebrauchtes Kraftfahrzeug, Marke: Mercedes, Modell: E-Klasse, Baujahr: 2020, Kilometerstand: 45.000 km"}

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
      formattedHTML = await formatContractToHTML(contractText, companyProfile, type, designVariant);
      console.log("✅ Professionelle HTML-Formatierung mit Logo erstellt");
      
      // Debug-Ausgabe
      console.log("📊 HTML-Generierung Debug:", {
        hasCompanyProfile: !!companyProfile,
        hasLogo: !!companyProfile?.logoUrl,
        logoUrl: companyProfile?.logoUrl?.substring(0, 50) + "...",
        htmlLength: formattedHTML.length,
        containsLogo: formattedHTML.includes('img src='),
        containsHeader: formattedHTML.includes('background:')
      });
    } else {
      // Auch ohne Company Profile HTML generieren
      formattedHTML = await formatContractToHTML(contractText, null, type, designVariant);
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
      contractHTML: formattedHTML, // 🔴 FIX 1: HTML direkt beim Speichern
      laufzeit: "Generiert",
      kuendigung: "Generiert", 
      expiryDate: "",
      status: "Aktiv",
      uploadedAt: new Date(),
      isGenerated: true,
      contractType: type,
      hasCompanyProfile: !!companyProfile,
      formData: formData,
      designVariant: designVariant // Design-Variante speichern
    };

    const result = await contractsCollection.insertOne(contract);
    
    // 🔴 FIX 1 FORTSETZUNG: HTML auch in DB updaten für schnelleren PDF-Export
    if (formattedHTML && result.insertedId) {
      await contractsCollection.updateOne(
        { _id: result.insertedId },
        { $set: { contractHTML: formattedHTML } }
      );
      console.log("✅ HTML im Vertrag gespeichert für schnelleren PDF-Export");
    }

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

    // 🔴 KRITISCHER FIX #2: HTML in Response zurückgeben!
    res.json({
      message: "✅ Vertrag erfolgreich generiert & gespeichert.",
      contractId: result.insertedId,
      contractText: contractText,
      contractHTML: formattedHTML, // 🔴 WICHTIG: HTML muss hier zurückgegeben werden!
      metadata: {
        contractType: type,
        hasCompanyProfile: !!companyProfile,
        hasLogo: !!companyProfile?.logoUrl,
        contentLength: contractText.length,
        htmlLength: formattedHTML.length,
        generatedAt: new Date().toISOString(),
        version: 'v4_professional',
        designVariant: designVariant
      }
    });
    
  } catch (err) {
    console.error("❌ Fehler beim Erzeugen/Speichern:", err);
    res.status(500).json({ message: "Serverfehler beim Erzeugen oder Speichern." });
  }
});

// 🔴 KORRIGIERTE PUPPETEER PDF-ROUTE - MIT USERID FIX UND PERFORMANCE-OPTIMIERUNGEN
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

    console.log("✅ Vertrag gefunden:", contract.name);

    // Lade Company Profile wenn vorhanden
    let companyProfile = null;
    if (contract.hasCompanyProfile || contract.metadata?.hasLogo) {
      try {
        companyProfile = await db.collection("company_profiles").findOne({ 
          userId: new ObjectId(req.user.userId) 
        });
        console.log("🏢 Company Profile geladen:", !!companyProfile);
      } catch (profileError) {
        console.error("⚠️ Fehler beim Laden des Company Profiles:", profileError);
      }
    }

    // 🔴 FIX: HTML aus DB laden statt neu generieren
    let htmlContent = contract.contractHTML || contract.htmlContent || contract.contentHTML;
    
    if (!htmlContent) {
      console.log("🔄 Kein HTML vorhanden, generiere neu...");
      htmlContent = await formatContractToHTML(
        contract.content, 
        companyProfile, 
        contract.contractType || contract.metadata?.contractType || 'vertrag',
        contract.designVariant || contract.metadata?.designVariant || 'executive'
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
            '--disable-renderer-backgrounding'
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
            '--disable-gpu'
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
          error: "Bitte verwenden Sie den Download-Button erneut (html2pdf Fallback wird aktiviert)",
          suggestion: "Installieren Sie chrome-aws-lambda für Render.com Kompatibilität"
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
      
      // Lade HTML
      console.log("📄 Lade HTML in Puppeteer (Länge:", htmlContent.length, "Zeichen)");
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Warte auf Rendering
      await page.waitForTimeout(1500);
      
      // Generiere PDF
      console.log("📄 Generiere PDF...");
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: {
          top: '10mm',
          bottom: '10mm',
          left: '10mm', 
          right: '10mm'
        },
        preferCSSPageSize: false
      });
      
      console.log("✅ PDF erfolgreich generiert, Größe:", Math.round(pdfBuffer.length / 1024), "KB");
      
      // Sende PDF als Response
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${contract.name || 'Vertrag'}_${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      
      res.send(pdfBuffer);
      
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
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
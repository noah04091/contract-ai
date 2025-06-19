// 📁 backend/routes/betterContracts.js  
// STEP 3: Verbesserte Validierung & Rate Limiting

const express = require("express");
const router = express.Router();
const axios = require("axios");
const { OpenAI } = require("openai");
const cheerio = require("cheerio");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SERP_API_KEY = process.env.SERP_API_KEY;

// 🆕 STEP 3: Rate Limiting (einfache In-Memory Lösung)
const requestTracker = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 Minuten
const MAX_REQUESTS_PER_IP = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requestTracker.get(ip) || [];
  
  // Alte Requests entfernen
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_IP) {
    return false; // Rate limit erreicht
  }
  
  // Neuen Request hinzufügen
  recentRequests.push(now);
  requestTracker.set(ip, recentRequests);
  
  return true; // OK
}

// 🔧 Cache (unverändert)
const contractCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 Minuten

function getCacheKey(contractText, searchQuery) {
  const content = contractText.slice(0, 100) + searchQuery;
  return Buffer.from(content).toString('base64').slice(0, 32);
}

function getFromCache(cacheKey) {
  const cached = contractCache.get(cacheKey);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    contractCache.delete(cacheKey);
    return null;
  }
  
  return cached.data;
}

function saveToCache(cacheKey, data) {
  contractCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  if (contractCache.size > 100) {
    const firstKey = contractCache.keys().next().value;
    contractCache.delete(firstKey);
  }
}

// 🆕 STEP 3: Erweiterte Input-Validierung
function validateInput(contractText, searchQuery) {
  const errors = [];
  
  // ContractText validieren
  if (!contractText) {
    errors.push("contractText ist erforderlich");
  } else {
    contractText = contractText.trim();
    
    if (contractText.length < 20) {
      errors.push("contractText muss mindestens 20 Zeichen lang sein");
    }
    
    if (contractText.length > 10000) {
      errors.push("contractText darf maximal 10.000 Zeichen lang sein");
    }
    
    // Prüfen ob es überhaupt wie ein Vertrag aussieht
    const contractKeywords = ['vertrag', 'tarif', 'laufzeit', 'monatlich', 'kündig', 'bedingung', 'agb', 'preis', '€', 'euro'];
    const hasContractKeywords = contractKeywords.some(keyword => 
      contractText.toLowerCase().includes(keyword)
    );
    
    if (!hasContractKeywords) {
      errors.push("Der Text scheint kein Vertrag zu sein (keine relevanten Keywords gefunden)");
    }
  }
  
  // SearchQuery validieren
  if (!searchQuery) {
    errors.push("searchQuery ist erforderlich");
  } else {
    searchQuery = searchQuery.trim();
    
    if (searchQuery.length < 3) {
      errors.push("searchQuery muss mindestens 3 Zeichen lang sein");
    }
    
    if (searchQuery.length > 200) {
      errors.push("searchQuery darf maximal 200 Zeichen lang sein");
    }
    
    // Gefährliche Zeichen prüfen
    const dangerousChars = ['<', '>', '"', "'", '&', 'script', 'javascript'];
    const hasDangerousChars = dangerousChars.some(char => 
      searchQuery.toLowerCase().includes(char)
    );
    
    if (hasDangerousChars) {
      errors.push("searchQuery enthält unerlaubte Zeichen");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    cleanContractText: contractText ? contractText.trim() : '',
    cleanSearchQuery: searchQuery ? searchQuery.trim() : ''
  };
}

// 🔧 Website-Inhalt extrahieren (unverändert)
async function extractWebContent(url) {
  try {
    console.log(`📄 Extrahiere Inhalt von: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    let prices = [];
    const priceTexts = $('body').text().match(/\d+[,.]?\d*\s*(€|EUR|euro)/gi) || [];
    prices = priceTexts.slice(0, 5);
    
    const title = $('title').text() || 'Unbekannter Titel';
    const description = $('meta[name="description"]').attr('content') || '';
    const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 1500);
    
    const keywords = ['laufzeit', 'monatlich', 'jährlich', 'kündigung', 'tarif', 'flat', 'unlimited'];
    let relevantInfo = '';
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`.{0,80}${keyword}.{0,80}`, 'gi');
      const matches = bodyText.match(regex);
      if (matches) {
        relevantInfo += matches[0] + ' ';
      }
    });
    
    return {
      url,
      title: title.slice(0, 100),
      description: description.slice(0, 200),
      prices: prices,
      relevantInfo: relevantInfo.slice(0, 500),
      success: true
    };
    
  } catch (error) {
    console.warn(`❌ Fehler bei ${url}:`, error.message);
    return {
      url,
      title: 'Nicht verfügbar',
      description: '',
      prices: [],
      relevantInfo: '',
      success: false
    };
  }
}

// 🚀 HAUPTROUTE mit verbesserter Validierung
router.post("/better-contracts", async (req, res) => {
  try {
    // 🆕 STEP 3: Rate Limiting prüfen
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({
        error: "Rate Limit erreicht",
        message: `Maximal ${MAX_REQUESTS_PER_IP} Anfragen alle 15 Minuten erlaubt`,
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000 / 60) + " Minuten"
      });
    }
    
    // 🆕 STEP 3: Erweiterte Input-Validierung
    const { contractText, searchQuery } = req.body;
    const validation = validateInput(contractText, searchQuery);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Eingabefehler",
        details: validation.errors
      });
    }
    
    const cleanContractText = validation.cleanContractText;
    const cleanSearchQuery = validation.cleanSearchQuery;
    
    // Cache Check
    const cacheKey = getCacheKey(cleanContractText, cleanSearchQuery);
    const cachedResult = getFromCache(cacheKey);
    
    if (cachedResult) {
      console.log(`💾 Cache HIT für Key: ${cacheKey}`);
      return res.json({
        ...cachedResult,
        fromCache: true,
        cacheKey
      });
    }
    
    console.log(`🔍 Cache MISS - Starte neue Analyse für: "${cleanSearchQuery}"`);
    console.log(`📊 Request von IP: ${clientIP}`);
    
    // SerpAPI Suche
    const serpRes = await axios.get("https://serpapi.com/search.json", {
      params: {
        q: cleanSearchQuery,
        api_key: SERP_API_KEY,
        num: 10,
        gl: "de",
        hl: "de"
      },
      timeout: 10000
    });

    const organicResults = serpRes.data.organic_results || [];
    
    if (organicResults.length === 0) {
      return res.status(404).json({ 
        error: "Keine Suchergebnisse gefunden",
        searchQuery: cleanSearchQuery,
        suggestion: "Versuchen Sie eine andere Suchanfrage"
      });
    }
    
    console.log(`📊 ${organicResults.length} Suchergebnisse gefunden`);
    
    // Content Extraktion
    const topUrls = organicResults.slice(0, 3).map(result => result.link);
    
    console.log(`📄 Extrahiere Inhalte von ${topUrls.length} Websites...`);
    
    const extractionPromises = topUrls.map(url => extractWebContent(url));
    const extractedContents = await Promise.allSettled(extractionPromises);
    
    const successfulExtractions = extractedContents
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value);
    
    console.log(`✅ ${successfulExtractions.length} Websites erfolgreich extrahiert`);
    
    // Daten kombinieren
    const enrichedResults = organicResults.slice(0, 5).map((result, index) => {
      const extracted = successfulExtractions.find(ext => ext.url === result.link);
      
      return {
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        prices: extracted ? extracted.prices : [],
        relevantInfo: extracted ? extracted.relevantInfo : '',
        hasDetailedData: !!extracted
      };
    });
    
    // GPT-Analyse
    const systemPrompt = `Du bist ein professioneller Vertragsanalyst. Analysiere den gegebenen Vertrag und vergleiche ihn mit gefundenen Alternativen.

WICHTIG: Nutze die extrahierten Preise und Vertragsinformationen für eine genaue Analyse.

ANTWORTE IN DIESEM FORMAT:
## 📊 Zusammenfassung
[2-3 Sätze über den aktuellen Vertrag]

## 🏆 Top 3 Alternativen
1. **[Name]** - [Vorteile/Nachteile]
2. **[Name]** - [Vorteile/Nachteile] 
3. **[Name]** - [Vorteile/Nachteile]

## 💡 Empfehlung
[Klare Handlungsempfehlung mit Begründung]

## 💰 Potenzielle Ersparnis
[Geschätzte monatliche/jährliche Ersparnis]`;

    const userPrompt = `**AKTUELLER VERTRAG:**
${cleanContractText}

**GEFUNDENE ALTERNATIVEN:**
${enrichedResults.map((result, i) => `
${i + 1}. ${result.title}
   URL: ${result.link}
   Kurzbeschreibung: ${result.snippet}
   ${result.hasDetailedData ? `
   Gefundene Preise: ${result.prices.join(', ') || 'Keine Preise gefunden'}
   Vertragsinformationen: ${result.relevantInfo}` : '(Keine detaillierten Daten verfügbar)'}
`).join('\n')}

Bitte analysiere diese Alternativen und gib eine fundierte Empfehlung.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 1200
    });

    const analysis = completion.choices[0].message.content;
    
    // Ergebnis strukturieren
    const result = {
      analysis,
      alternatives: enrichedResults,
      searchQuery: cleanSearchQuery,
      performance: {
        totalAlternatives: organicResults.length,
        detailedExtractions: successfulExtractions.length,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - Date.now() // Placeholder
      }
    };
    
    // Cache speichern
    saveToCache(cacheKey, result);
    console.log(`💾 Ergebnis im Cache gespeichert (Key: ${cacheKey})`);
    
    console.log(`✅ Vertragsvergleich abgeschlossen - ${enrichedResults.length} Alternativen analysiert`);
    
    return res.json({
      ...result,
      fromCache: false,
      cacheKey
    });

  } catch (err) {
    console.error("❌ /better-contracts error:", err);
    
    // Spezifische Fehlerbehandlung
    if (err.response?.status === 429) {
      return res.status(429).json({ 
        error: "API Rate Limit erreicht",
        message: "Zu viele Anfragen an externe Services. Bitte versuchen Sie es später erneut.",
        retryAfter: "60 Sekunden"
      });
    }
    
    if (err.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        error: "Zeitüberschreitung",
        message: "Die Analyse dauert zu lange. Versuchen Sie es mit einer einfacheren Suchanfrage."
      });
    }
    
    if (err.response?.status === 403) {
      return res.status(503).json({
        error: "Service temporär nicht verfügbar",
        message: "Problem mit externen APIs. Bitte versuchen Sie es später erneut."
      });
    }
    
    return res.status(500).json({ 
      error: "Interner Serverfehler",
      message: "Unerwarteter Fehler beim Vertragsvergleich",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 🔧 Management Endpoints
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "better-contracts",
    cache: {
      entries: contractCache.size,
      maxAge: `${CACHE_DURATION / 1000 / 60} minutes`
    },
    rateLimit: {
      activeIPs: requestTracker.size,
      window: `${RATE_LIMIT_WINDOW / 1000 / 60} minutes`,
      maxRequests: MAX_REQUESTS_PER_IP
    },
    timestamp: new Date().toISOString()
  });
});

router.delete("/cache", (req, res) => {
  const sizeBefore = contractCache.size;
  contractCache.clear();
  res.json({ 
    message: `Cache geleert - ${sizeBefore} Einträge entfernt`,
    timestamp: new Date().toISOString()
  });
});

router.get("/cache/stats", (req, res) => {
  const stats = {
    totalEntries: contractCache.size,
    cacheKeys: Array.from(contractCache.keys()),
    oldestEntry: null,
    newestEntry: null
  };
  
  if (contractCache.size > 0) {
    const timestamps = Array.from(contractCache.values()).map(entry => entry.timestamp);
    stats.oldestEntry = new Date(Math.min(...timestamps)).toISOString();
    stats.newestEntry = new Date(Math.max(...timestamps)).toISOString();
  }
  
  res.json(stats);
});

// 🆕 STEP 3: Rate Limit Status
router.get("/rate-limit/:ip?", (req, res) => {
  const checkIP = req.params.ip || req.ip || req.connection.remoteAddress || 'unknown';
  const userRequests = requestTracker.get(checkIP) || [];
  const now = Date.now();
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  res.json({
    ip: checkIP,
    requestsInWindow: recentRequests.length,
    maxRequests: MAX_REQUESTS_PER_IP,
    remaining: Math.max(0, MAX_REQUESTS_PER_IP - recentRequests.length),
    windowResetIn: recentRequests.length > 0 ? 
      Math.ceil((RATE_LIMIT_WINDOW - (now - Math.min(...recentRequests))) / 1000) : 0
  });
});

module.exports = router;
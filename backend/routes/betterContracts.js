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

// 🆕 Erweiterte Search Query Generation
function generateEnhancedSearchQueries(detectedType, contractText) {
  const baseQueries = {
    "handy": [
      "günstige handytarife ohne vertrag 2024",
      "mobilfunk allnet flat vergleich deutschland",
      "prepaid tarife vergleich check24",
      "smartphone tarif wechsel bonus"
    ],
    "mobilfunk": [
      "mobilfunk tarife vergleich günstig deutschland",
      "handyvertrag ohne laufzeit günstig",
      "allnet flat unter 20 euro vergleich"
    ],
    "internet": [
      "dsl internet tarife vergleich günstig",
      "glasfaser anbieter wechsel 2024",
      "internet flatrate ohne drosselung vergleich"
    ],
    "strom": [
      "stromanbieter wechsel bonus 2024",
      "günstiger strom vergleich deutschland",
      "ökostrom tarife günstig vergleich"
    ],
    "gas": [
      "gasanbieter vergleich günstig deutschland",
      "gas tarife wechsel bonus 2024"
    ],
    "versicherung": [
      "versicherung vergleich günstig deutschland",
      "versicherungstarife wechsel 2024"
    ],
    "kfz": [
      "kfz versicherung vergleich günstig",
      "autoversicherung wechsel 2024 check24"
    ],
    "fitness": [
      "fitnessstudio preise vergleich deutschland",
      "günstige fitness studios kündigung"
    ],
    "streaming": [
      "streaming dienste vergleich deutschland 2024",
      "netflix alternativen günstiger"
    ]
  };

  // Erweiterte Suche basierend auf Vertragsinhalt
  const enhancedQueries = [];
  const type = detectedType.toLowerCase();

  if (baseQueries[type]) {
    enhancedQueries.push(...baseQueries[type]);
  }

  // Zusätzliche Queries basierend auf Preisrange
  if (contractText.includes('€') || contractText.includes('euro')) {
    const priceMatches = contractText.match(/(\d+)[,.]?(\d*)\s*(€|euro)/gi);
    if (priceMatches && priceMatches.length > 0) {
      const price = parseFloat(priceMatches[0].replace(/[€euro,]/g, '').trim());
      if (price > 0) {
        enhancedQueries.push(`${type} unter ${Math.floor(price)}€ vergleich`);
        enhancedQueries.push(`günstige ${type} alternative unter ${Math.floor(price * 0.8)}€`);
      }
    }
  }

  // Fallback wenn Typ unbekannt
  if (enhancedQueries.length === 0) {
    enhancedQueries.push(
      "vertragsvergleich deutschland günstig",
      "anbieter wechsel bonus 2024",
      "günstige alternative vertrag"
    );
  }

  return enhancedQueries;
}

// 🆕 Multi-Source Search Function
async function performMultiSourceSearch(searchQueries, SERP_API_KEY) {
  const allResults = [];

  // Probiere mehrere Suchanfragen nacheinander
  for (let i = 0; i < Math.min(searchQueries.length, 3); i++) {
    const query = searchQueries[i];
    console.log(`🔍 Suche ${i + 1}: "${query}"`);

    try {
      const serpRes = await axios.get("https://serpapi.com/search.json", {
        params: {
          q: query,
          api_key: SERP_API_KEY,
          num: 8,
          gl: "de",
          hl: "de"
        },
        timeout: 8000
      });

      const results = serpRes.data.organic_results || [];
      console.log(`📊 Query ${i + 1}: ${results.length} Ergebnisse`);

      if (results.length > 0) {
        allResults.push(...results);

        // Stop wenn wir genug Ergebnisse haben
        if (allResults.length >= 15) break;
      }

      // Kurze Pause zwischen Requests
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.warn(`⚠️ Query ${i + 1} fehlgeschlagen:`, error.message);
      continue;
    }
  }

  // Deduplizierung basierend auf URL
  const uniqueResults = [];
  const seenUrls = new Set();

  for (const result of allResults) {
    if (!seenUrls.has(result.link)) {
      seenUrls.add(result.link);
      uniqueResults.push(result);
    }
  }

  console.log(`✅ Multi-Search: ${uniqueResults.length} eindeutige Ergebnisse`);
  return uniqueResults;
}

// 🆕 Specialized Scrapers für deutsche Vergleichsportale
async function extractCheck24Content(url, $, bodyText) {
  const prices = [];
  const features = [];

  // Check24-spezifische Selektoren
  $('.price, .tariff-price, [data-testid*="price"]').each((i, el) => {
    const priceText = $(el).text().trim();
    if (priceText.includes('€')) {
      prices.push(priceText);
    }
  });

  // Features extrahieren
  $('.feature-list li, .tariff-details li, .comparison-feature').each((i, el) => {
    const feature = $(el).text().trim();
    if (feature.length > 5 && feature.length < 100) {
      features.push(feature);
    }
  });

  return {
    prices: prices.slice(0, 8),
    features: features.slice(0, 5),
    provider: bodyText.match(/(Telekom|Vodafone|O2|1&1|Congstar|Klarmobil)/gi)?.[0] || 'Unknown'
  };
}

async function extractVerivoxContent(url, $, bodyText) {
  const prices = [];
  const features = [];

  // Verivox-spezifische Selektoren
  $('.price-value, .tariff-price, .monthly-cost').each((i, el) => {
    const priceText = $(el).text().trim();
    if (priceText.includes('€')) {
      prices.push(priceText);
    }
  });

  // Tarif-Details
  $('.tariff-feature, .detail-item, .tariff-benefits li').each((i, el) => {
    const feature = $(el).text().trim();
    if (feature.length > 5 && feature.length < 100) {
      features.push(feature);
    }
  });

  return {
    prices: prices.slice(0, 8),
    features: features.slice(0, 5),
    provider: bodyText.match(/(E\\.ON|Vattenfall|EnBW|RWE|Check24)/gi)?.[0] || 'Unknown'
  };
}

async function extractTarifcheckContent(url, $, bodyText) {
  const prices = [];
  const features = [];

  // Tarifcheck-spezifische Selektoren
  $('.price, .cost, .monthly-price, [class*="price"]').each((i, el) => {
    const priceText = $(el).text().trim();
    if (priceText.includes('€') || priceText.includes('EUR')) {
      prices.push(priceText);
    }
  });

  return {
    prices: prices.slice(0, 8),
    features: features.slice(0, 5),
    provider: 'Tarifcheck'
  };
}

// 🆕 Enhanced Website-Inhalt extrahieren mit Portal-spezifischer Logik
async function extractWebContent(url) {
  try {
    console.log(`📄 Extrahiere Inhalt von: ${url}`);

    // Enhanced Headers für bessere Anti-Bot Umgehung
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };

    const response = await axios.get(url, {
      timeout: 10000,
      headers,
      maxRedirects: 3,
      validateStatus: (status) => status < 400
    });

    const $ = cheerio.load(response.data);
    const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 2000);

    // Portal-spezifische Extraktion
    let specialData = { prices: [], features: [], provider: 'Unknown' };

    if (url.includes('check24')) {
      specialData = await extractCheck24Content(url, $, bodyText);
    } else if (url.includes('verivox')) {
      specialData = await extractVerivoxContent(url, $, bodyText);
    } else if (url.includes('tarifcheck')) {
      specialData = await extractTarifcheckContent(url, $, bodyText);
    }

    // Fallback: Generische Preis-Extraktion
    if (specialData.prices.length === 0) {
      const priceTexts = bodyText.match(/\d+[,.]?\d*\s*(€|EUR|euro)/gi) || [];
      specialData.prices = priceTexts.slice(0, 8);
    }

    const title = $('title').text() || $('h1').first().text() || 'Unbekannter Titel';
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') || '';

    // Enhanced Keywords für bessere Relevanz
    const keywords = [
      'laufzeit', 'monatlich', 'jährlich', 'kündigung', 'tarif', 'flat', 'unlimited',
      'grundgebühr', 'einmalig', 'anschluss', 'wechsel', 'bonus', 'rabatt', 'aktion',
      'mindestvertragslaufzeit', 'kündigungsfrist', 'bereitstellung', 'versand'
    ];

    let relevantInfo = '';
    keywords.forEach(keyword => {
      const regex = new RegExp(`.{0,100}${keyword}.{0,100}`, 'gi');
      const matches = bodyText.match(regex);
      if (matches) {
        relevantInfo += matches.slice(0, 2).join(' ') + ' ';
      }
    });

    return {
      url,
      title: title.slice(0, 120),
      description: description.slice(0, 250),
      prices: specialData.prices,
      features: specialData.features || [],
      provider: specialData.provider,
      relevantInfo: relevantInfo.slice(0, 600),
      success: true,
      isSpecialPortal: url.includes('check24') || url.includes('verivox') || url.includes('tarifcheck')
    };

  } catch (error) {
    console.warn(`❌ Fehler bei ${url}:`, error.message);

    // Enhanced Error Info
    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      isTimeout: error.code === 'ECONNABORTED'
    };

    return {
      url,
      title: 'Nicht verfügbar',
      description: `Fehler: ${error.message}`,
      prices: [],
      features: [],
      provider: 'Unknown',
      relevantInfo: '',
      success: false,
      error: errorDetails
    };
  }
}

// 🚀 HAUPTROUTE mit verbesserter Validierung
router.post("/", async (req, res) => {
  console.log(`🚀 START better-contracts Route - ${new Date().toISOString()}`);

  try {
    console.log(`📋 Request Body Keys: ${Object.keys(req.body).join(', ')}`);
    console.log(`📋 Request Body: ${JSON.stringify(req.body, null, 2)}`);

    // 🆕 STEP 3: Rate Limiting prüfen
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    console.log(`🌐 Client IP: ${clientIP}`);
    
    console.log(`✅ Rate Limit Check passed`);

    if (!checkRateLimit(clientIP)) {
      console.log(`❌ Rate Limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        error: "Rate Limit erreicht",
        message: `Maximal ${MAX_REQUESTS_PER_IP} Anfragen alle 15 Minuten erlaubt`,
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000 / 60) + " Minuten"
      });
    }

    console.log(`✅ Rate Limit OK`);

    // 🆕 STEP 3: Erweiterte Input-Validierung
    const { contractText, searchQuery } = req.body;
    console.log(`📝 Input - ContractText Length: ${contractText?.length || 0}, SearchQuery: "${searchQuery || 'empty'}"`);

    const validation = validateInput(contractText, searchQuery);
    console.log(`🔍 Validation Result: ${validation.isValid ? 'VALID' : 'INVALID'}`);

    if (!validation.isValid) {
      console.log(`❌ Validation Errors:`, validation.errors);
      return res.status(400).json({
        error: "Eingabefehler",
        details: validation.errors
      });
    }

    const cleanContractText = validation.cleanContractText;
    const cleanSearchQuery = validation.cleanSearchQuery;
    console.log(`✅ Clean Input - ContractText: ${cleanContractText.length} chars, SearchQuery: "${cleanSearchQuery}"`);

    console.log(`🚀 POINT 1: Input validation passed`);
    
    // Cache Check
    console.log(`🚀 POINT 2: Starting cache check`);
    const cacheKey = getCacheKey(cleanContractText, cleanSearchQuery);
    console.log(`🔑 Cache Key generated: ${cacheKey}`);
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

    // 🆕 Debug: SERP API Key Check
    console.log(`🔑 SERP API Key verfügbar: ${SERP_API_KEY ? 'JA' : 'NEIN'}`);
    console.log(`🔑 SERP API Key (first 10 chars): ${SERP_API_KEY ? SERP_API_KEY.substring(0, 10) + '...' : 'NULL'}`);

    console.log(`🚀 POINT 3: Starting contract type detection`);

    // 🆕 Step 1: Contract Type Detection (Enhanced)
    console.log("🔍 Erkenne Vertragstyp...");

    // 🆕 Contract Type Detection with OpenAI directly (no internal fetch)
    let detectedType = 'unbekannt';
    try {
      console.log(`🤖 Rufe OpenAI für Vertragstyp-Erkennung auf...`);

      const typeCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Du bist ein Experte für Vertragsanalyse. Erkenne den Typ des gegebenen Vertrags. Antworte nur mit einem der folgenden Begriffe: handy, mobilfunk, internet, strom, gas, versicherung, kfz, fitness, streaming, bank, kredit, hosting, unbekannt"
          },
          {
            role: "user",
            content: `Analysiere diesen Vertrag und erkenne den Typ:\n\n${cleanContractText.slice(0, 1000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      });

      detectedType = typeCompletion.choices[0].message.content.trim().toLowerCase();
      console.log(`📊 Erkannter Vertragstyp: ${detectedType}`);

    } catch (typeError) {
      console.error(`❌ Vertragstyp-Erkennung fehlgeschlagen:`, typeError.message);
      detectedType = 'unbekannt';
    }

    console.log(`🚀 POINT 4: Contract type detected: ${detectedType}`);

    // 🆕 Step 2: Generate Enhanced Search Queries
    console.log(`🚀 POINT 5: Generating search queries`);
    const enhancedQueries = generateEnhancedSearchQueries(detectedType, cleanContractText);
    console.log(`🎯 Generated ${enhancedQueries.length} base queries`);

    // Benutzer-Query als erste Option hinzufügen
    if (cleanSearchQuery && cleanSearchQuery.length > 0) {
      enhancedQueries.unshift(cleanSearchQuery);
      console.log(`➕ Added user query to front: "${cleanSearchQuery}"`);
    }

    console.log(`🎯 Final Suchanfragen (${enhancedQueries.length}):`, enhancedQueries.slice(0, 3));

    console.log(`🚀 POINT 6: Starting multi-source search`);

    // 🆕 Step 3: Multi-Source Search
    let organicResults;
    try {
      organicResults = await performMultiSourceSearch(enhancedQueries, SERP_API_KEY);
      console.log(`✅ Multi-search completed with ${organicResults.length} results`);
    } catch (searchError) {
      console.error(`❌ Multi-source search failed:`, searchError);
      organicResults = [];
    }

    console.log(`🚀 POINT 7: Search completed`);

    // 🆕 Enhanced Debug Info
    if (organicResults.length === 0) {
      console.log(`❌ Multi-Search Problem - Keine Ergebnisse gefunden`);
      console.log(`🔍 Versuchte Queries:`, enhancedQueries.slice(0, 3));

      return res.status(404).json({
        error: "Keine Suchergebnisse gefunden",
        searchQuery: cleanSearchQuery,
        detectedType,
        attemptedQueries: enhancedQueries.slice(0, 3),
        suggestion: "Versuchen Sie es mit einem anderen Vertragstyp oder anderen Keywords",
        debug: {
          totalQueriesAttempted: enhancedQueries.length,
          organicResultsLength: organicResults.length
        }
      });
    }
    
    console.log(`📊 ${organicResults.length} Suchergebnisse gefunden`);

    // 🆕 Enhanced Content Extraktion mit Priorisierung
    // Priorisiere Vergleichsportale und extrahiere mehr URLs
    const priorityUrls = [];
    const regularUrls = [];

    organicResults.slice(0, 8).forEach(result => {
      const url = result.link;
      if (url.includes('check24') || url.includes('verivox') || url.includes('tarifcheck') ||
          url.includes('idealo') || url.includes('billiger.de')) {
        priorityUrls.push({ ...result, isPriority: true });
      } else {
        regularUrls.push({ ...result, isPriority: false });
      }
    });

    // Kombiniere Priority und Regular URLs (max 6)
    const urlsToExtract = [...priorityUrls, ...regularUrls].slice(0, 6);
    console.log(`📄 Extrahiere Inhalte von ${urlsToExtract.length} Websites (${priorityUrls.length} Priority)...`);

    // 🆕 Parallele Extraktion mit Error-Handling
    const extractionPromises = urlsToExtract.map(async (result, index) => {
      // Delays für Rate-Limiting
      await new Promise(resolve => setTimeout(resolve, index * 200));

      try {
        const extracted = await extractWebContent(result.link);
        return { ...extracted, originalResult: result };
      } catch (error) {
        console.warn(`⚠️ Extraktion fehlgeschlagen für ${result.link}:`, error.message);
        return {
          url: result.link,
          success: false,
          error: error.message,
          originalResult: result
        };
      }
    });

    const extractedContents = await Promise.allSettled(extractionPromises);

    const successfulExtractions = extractedContents
      .filter(result => result.status === 'fulfilled' && result.value?.success)
      .map(result => result.value);

    const failedExtractions = extractedContents
      .filter(result => result.status === 'rejected' || !result.value?.success)
      .length;

    console.log(`✅ ${successfulExtractions.length} erfolgreich, ${failedExtractions} fehlgeschlagen`);

    // 🆕 Enhanced Data Kombinierung mit mehr Details
    const enrichedResults = organicResults.slice(0, 8).map((result, index) => {
      const extracted = successfulExtractions.find(ext => ext.url === result.link);

      return {
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        prices: extracted?.prices || [],
        features: extracted?.features || [],
        provider: extracted?.provider || 'Unknown',
        relevantInfo: extracted?.relevantInfo || '',
        hasDetailedData: !!extracted,
        isPriorityPortal: extracted?.isSpecialPortal || false,
        position: result.position || index + 1,
        extractionError: extracted?.error || null
      };
    });

    // 🆕 Fallback wenn keine erfolgreichen Extraktionen
    if (successfulExtractions.length === 0) {
      console.log(`⚠️ Keine Website-Inhalte extrahiert - verwende nur Suchergebnisse`);

      // Verwende nur die Suchergebnisse ohne detaillierte Daten
      const fallbackResults = organicResults.slice(0, 5).map((result, index) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        prices: [],
        features: [],
        provider: 'Unknown',
        relevantInfo: result.snippet || '',
        hasDetailedData: false,
        isPriorityPortal: false,
        position: index + 1,
        extractionError: 'Content extraction failed'
      }));

      return res.json({
        analysis: "⚠️ Aufgrund technischer Beschränkungen konnten detaillierte Preise nicht extrahiert werden. Die folgenden Anbieter könnten jedoch relevante Alternativen sein. Besuchen Sie die Links für aktuelle Preise und Details.",
        alternatives: fallbackResults,
        searchQuery: enhancedQueries[0],
        contractType: detectedType,
        performance: {
          totalAlternatives: fallbackResults.length,
          detailedExtractions: 0,
          timestamp: new Date().toISOString(),
          warning: "Limited data extraction"
        },
        fromCache: false
      });
    }
    
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
    console.error("❌❌❌ FATAL ERROR in /better-contracts:", err);
    console.error("❌ Error Stack:", err.stack);
    console.error("❌ Error Message:", err.message);
    console.error("❌ Error Code:", err.code);
    console.error("❌ Error Response:", err.response?.data);

    // Spezifische Fehlerbehandlung
    if (err.response?.status === 429) {
      console.log("📡 Returning 429 Rate Limit Error");
      return res.status(429).json({
        error: "API Rate Limit erreicht",
        message: "Zu viele Anfragen an externe Services. Bitte versuchen Sie es später erneut.",
        retryAfter: "60 Sekunden"
      });
    }

    if (err.code === 'ECONNABORTED') {
      console.log("📡 Returning 408 Timeout Error");
      return res.status(408).json({
        error: "Zeitüberschreitung",
        message: "Die Analyse dauert zu lange. Versuchen Sie es mit einer einfacheren Suchanfrage."
      });
    }

    if (err.response?.status === 403) {
      console.log("📡 Returning 503 Service Unavailable");
      return res.status(503).json({
        error: "Service temporär nicht verfügbar",
        message: "Problem mit externen APIs. Bitte versuchen Sie es später erneut."
      });
    }

    console.log("📡 Returning 500 Internal Server Error");
    return res.status(500).json({
      error: "Interner Serverfehler",
      message: "Unerwarteter Fehler beim Vertragsvergleich",
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
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
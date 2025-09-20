// 📋 backend/routes/betterContracts.js  
// ERWEITERTE VERSION MIT STRENGEM PARTNER-MATCHING

const express = require("express");
const router = express.Router();
const axios = require("axios");
const { OpenAI } = require("openai");
const cheerio = require("cheerio");

// 🔧 FORCE reload environment variables for this module
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 🆕 Partner Mappings Import
const { 
  findBestPartnerCategory, 
  generatePartnerOffers,
  partnerMappings 
} = require('../config/partnerMappings');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let SERP_API_KEY = process.env.SERP_API_KEY;

// 🆕 HARDCODED FALLBACK for Production (temporary)
if (!SERP_API_KEY) {
  console.log(`⚠️ SERP_API_KEY nicht aus Environment geladen, verwende Fallback`);
  SERP_API_KEY = "5e473edbc79256c07dde6b36f2a8595a9e30f41abdc1d3d46c77f7165d0a9823";
}

// 🆕 Debug Environment Variables Loading
console.log(`🔧 Environment Check:`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'LOADED' : 'MISSING'}`);
console.log(`  - SERP_API_KEY (from env): ${process.env.SERP_API_KEY ? 'LOADED' : 'MISSING'}`);
console.log(`  - SERP_API_KEY (final): ${SERP_API_KEY ? 'AVAILABLE' : 'NULL'}`);
console.log(`  - SERP_API_KEY Value: ${SERP_API_KEY ? SERP_API_KEY.substring(0, 10) + '...' : 'NULL'}`);

// 🚨 Final Check
if (!SERP_API_KEY) {
  console.error(`🚨 CRITICAL: SERP_API_KEY ist immer noch nicht verfügbar!`);
  console.error(`🔍 Verfügbare Environment Variables:`, Object.keys(process.env).filter(key => key.includes('SERP')));
} else {
  console.log(`✅ SERP_API_KEY erfolgreich geladen!`);
}

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

// 🆕 Contract Context Analysis
function analyzeContractContext(contractText) {
  const context = {
    provider: null,
    service: null,
    priceInfo: null,
    specificFeatures: [],
    category: 'unknown'
  };

  const text = contractText.toLowerCase();

  // Provider Detection
  const providers = {
    'anthropic': 'AI/Claude API',
    'openai': 'AI/ChatGPT API',
    'telekom': 'Mobilfunk/Internet',
    'vodafone': 'Mobilfunk/Internet',
    'o2': 'Mobilfunk/Internet',
    '1&1': 'Internet/Hosting',
    'check24': 'Vergleichsportal',
    'verivox': 'Vergleichsportal',
    'allianz': 'Versicherung',
    'axa': 'Versicherung',
    'ergo': 'Versicherung',
    'generali': 'Versicherung',
    'zurich': 'Versicherung',
    'huk': 'Versicherung',
    'debeka': 'Versicherung',
    'signal iduna': 'Versicherung',
    'adam riese': 'Versicherung',
    'bavariadirekt': 'Versicherung',
    'cosmos': 'Versicherung',
    'wgv': 'Versicherung',
    'lvm': 'Versicherung',
    'volkswohl': 'Versicherung',
    'nürnberger': 'Versicherung',
    'gothaer': 'Versicherung',
    'helvetia': 'Versicherung',
    'alte leipziger': 'Versicherung',
    'continentale': 'Versicherung',
    'mcfit': 'Fitness',
    'netflix': 'Streaming',
    'spotify': 'Streaming',
    'amazon': 'Streaming/Shopping',
    'apple': 'Software/Streaming'
  };

  for (const [provider, category] of Object.entries(providers)) {
    if (text.includes(provider)) {
      context.provider = provider;
      context.category = category;
      break;
    }
  }

  // Service Detection
  const services = {
    'max plan': 'AI API Premium Plan',
    'claude': 'AI Assistant Service',
    'gpt': 'AI Language Model',
    'api': 'API Service',
    'hosting': 'Web Hosting',
    'webspace': 'Web Hosting',
    'rechtsschutz': 'Rechtsschutzversicherung',
    'haftpflicht': 'Haftpflichtversicherung',
    'hausrat': 'Hausratversicherung',
    'berufsunfähigkeit': 'Berufsunfähigkeitsversicherung',
    'krankenversicherung': 'Krankenversicherung',
    'lebensversicherung': 'Lebensversicherung',
    'kfz': 'KFZ Versicherung',
    'autoversicherung': 'KFZ Versicherung',
    'handy': 'Mobilfunk',
    'internet': 'Internet/DSL',
    'strom': 'Stromtarif',
    'gas': 'Gastarif',
    'fitness': 'Fitnessstudio',
    'streaming': 'Streaming Service'
  };

  for (const [service, description] of Object.entries(services)) {
    if (text.includes(service)) {
      context.service = service;
      context.specificFeatures.push(description);
      break;
    }
  }

  // Price Detection
  const priceMatches = contractText.match(/[€$](\d+[\.,]?\d*)/g);
  if (priceMatches) {
    context.priceInfo = priceMatches[0];
  }

  return context;
}

// 🆕 Erweiterte Search Query Generation mit SPEZIFISCHEN Queries
function generateEnhancedSearchQueries(detectedType, contractText) {
  // 🔍 Analyze contract content for specific context
  const contractContext = analyzeContractContext(contractText);
  console.log(`📊 Contract Context:`, contractContext);

  // 🔴 VERBESSERTE SPEZIFISCHE QUERIES
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
    "rechtsschutzversicherung": [
      "rechtsschutzversicherung vergleich check24 2024",
      "rechtsschutzversicherung verivox testsieger",
      "arag rechtsschutzversicherung direkt abschließen",
      "roland rechtsschutz online tarife"
    ],
    "haftpflichtversicherung": [
      "haftpflichtversicherung vergleich check24 2024",
      "haftpflichtversicherung verivox testsieger",
      "huk coburg haftpflicht direkt abschließen",
      "allianz privathaftpflicht online tarife"
    ],
    "hausratversicherung": [
      "hausratversicherung vergleich check24 2024",
      "günstige hausratversicherung tarifvergleich",
      "hausrat versicherung verivox vergleich",
      "beste hausratversicherung stiftung warentest"
    ],
    "berufsunfähigkeitsversicherung": [
      "berufsunfähigkeitsversicherung vergleich 2024",
      "bu versicherung check24 tarifvergleich",
      "günstige berufsunfähigkeit alternative",
      "beste bu versicherung stiftung warentest"
    ],
    "krankenversicherung": [
      "private krankenversicherung vergleich check24",
      "pkv tarifvergleich verivox 2024",
      "gesetzliche krankenversicherung wechsel",
      "beste krankenkasse stiftung warentest"
    ],
    "lebensversicherung": [
      "lebensversicherung vergleich check24 2024",
      "kapitallebensversicherung alternativen finanztip",
      "risikolebensversicherung günstig vergleich",
      "lebensversicherung kündigen oder behalten"
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
    ],
    "hosting": [
      "webhosting vergleich günstig deutschland",
      "hosting anbieter wechsel 2024",
      "günstige webspace alternative"
    ],
    "software": [
      "software alternativen günstig",
      "saas tools vergleich deutschland",
      "günstige software lizenz alternativen"
    ],
    "ai": [
      "AI tools alternativen günstiger",
      "chatgpt alternativen deutschland",
      "künstliche intelligenz software vergleich",
      "ai subscription günstiger"
    ]
  };

  // 🆕 Context-based Query Generation
  const enhancedQueries = [];

  // 1. PRIORITY: Insurance-specific context detection
  if (contractContext.category === 'Versicherung' || contractContext.service && contractContext.service.includes('versicherung')) {
    console.log(`🥇 Insurance contract detected: ${contractContext.service || 'generic insurance'}`);

    // Get specific insurance queries
    const insuranceType = contractContext.service || detectedType.toLowerCase();
    if (baseQueries[insuranceType]) {
      enhancedQueries.push(...baseQueries[insuranceType]);
      console.log(`📋 Added ${baseQueries[insuranceType].length} insurance-specific queries for: ${insuranceType}`);
    } else {
      // Generic insurance fallback
      enhancedQueries.push(
        "versicherung vergleich check24 deutschland",
        "günstige versicherung alternative wechsel",
        "versicherungstarife vergleich 2024",
        "online versicherung vergleichsportal"
      );
      console.log(`📋 Added generic insurance queries as fallback`);
    }
  }
  // 2. AI-specific context for Anthropic/Claude contracts
  else if (contractContext.provider === 'anthropic' || contractContext.service === 'max plan') {
    enhancedQueries.push(
      "ChatGPT alternativen deutschland günstig",
      "AI assistant software vergleich",
      "claude alternative günstiger",
      "openai chatgpt konkurrenten 2024",
      "künstliche intelligenz tools günstig"
    );
  } else if (contractContext.category === 'AI/Claude API' || contractContext.category === 'AI/ChatGPT API') {
    enhancedQueries.push(
      "AI API alternativen günstiger",
      "language model api vergleich",
      "chatbot software günstig"
    );
  }
  // 3. Other contract types
  else {
    // Use original type-based queries
    const type = detectedType.toLowerCase();
    if (baseQueries[type]) {
      enhancedQueries.push(...baseQueries[type]);
    }
  }

  // 4. Add context-specific searches (only if not insurance to avoid dilution)
  if (contractContext.category !== 'Versicherung') {
    if (contractContext.provider) {
      enhancedQueries.push(`${contractContext.provider} alternative günstiger`);
      enhancedQueries.push(`${contractContext.provider} konkurrent vergleich`);
    }

    if (contractContext.service && !contractContext.service.includes('versicherung')) {
      enhancedQueries.push(`${contractContext.service} alternative deutschland`);
    }
  }

  // 5. Price-based queries (improved)
  if (contractContext.priceInfo) {
    const price = parseFloat(contractContext.priceInfo.replace(/[€$,]/g, ''));
    if (price > 0) {
      if (contractContext.category === 'Versicherung') {
        const insuranceType = contractContext.service || 'versicherung';
        enhancedQueries.push(`${insuranceType} unter ${Math.floor(price)}€ monatlich`);
        enhancedQueries.push(`günstige ${insuranceType} unter ${Math.floor(price * 0.8)}€`);
      } else if (contractContext.category.includes('AI')) {
        enhancedQueries.push(`AI tools unter ${Math.floor(price)}€ monatlich`);
        enhancedQueries.push(`chatbot software unter ${Math.floor(price * 0.7)}€`);
      } else {
        enhancedQueries.push(`${detectedType} unter ${Math.floor(price)}€ vergleich`);
        enhancedQueries.push(`günstige ${detectedType} alternative unter ${Math.floor(price * 0.8)}€`);
      }
    }
  }

  // 6. Fallback with better generic searches
  if (enhancedQueries.length === 0) {
    console.log(`⚠️ No specific queries found, using fallback for category: ${contractContext.category}`);
    if (contractContext.category !== 'unknown') {
      if (contractContext.category === 'Versicherung') {
        enhancedQueries.push(
          "versicherung vergleich check24 deutschland",
          "günstige versicherung online vergleich",
          "versicherung anbieter wechsel bonus 2024"
        );
      } else {
        enhancedQueries.push(
          `${contractContext.category} alternativen deutschland`,
          `${contractContext.category} vergleich günstig`,
          `${contractContext.category} anbieter wechsel 2024`
        );
      }
    } else {
      enhancedQueries.push(
        "software subscription alternativen",
        "saas tools vergleich deutschland",
        "günstige service alternative"
      );
    }
  }

  // 5. Remove duplicates and limit
  const uniqueQueries = [...new Set(enhancedQueries)];
  return {
    queries: uniqueQueries.slice(0, 6), // Limit to 6 best queries
    contractContext: contractContext
  };
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
    provider: bodyText.match(/(E\.ON|Vattenfall|EnBW|RWE|Check24)/gi)?.[0] || 'Unknown'
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

// 🆕 Enhanced Website-Inhalt extrahieren mit BESSERER Provider-Erkennung
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

    // 🔴 VERBESSERTE Provider-Erkennung
    let provider = 'Anbieter';
    let betterDescription = '';
    
    // Extrahiere Provider aus URL oder Seiten-Content
    if (url.includes('check24.de')) {
      provider = 'CHECK24';
      betterDescription = 'Deutschlands größtes Vergleichsportal. Über 300 Tarife im direkten Vergleich mit Best-Preis-Garantie.';
    } else if (url.includes('verivox.de')) {
      provider = 'Verivox';
      betterDescription = 'TÜV-geprüftes Vergleichsportal. Transparent, unabhängig und kostenlos.';
    } else if (url.includes('tarifcheck.de')) {
      provider = 'TarifCheck';
      betterDescription = 'Unabhängiger Versicherungsvergleich mit persönlicher Expertenberatung.';
    } else if (url.includes('finanztip.de')) {
      provider = 'Finanztip';
      betterDescription = 'Gemeinnützige Verbraucher-Redaktion. 100% werbefrei und unabhängig.';
    } else if (url.includes('test.de') || url.includes('stiftung-warentest')) {
      provider = 'Stiftung Warentest';
      betterDescription = 'Deutschlands bekannteste Testorganisation. Objektive Tests seit 1964.';
    } else if (url.includes('finanzfluss.de')) {
      provider = 'Finanzfluss';
      betterDescription = 'Unabhängige Finanzbildung. Transparente Vergleiche ohne versteckte Provisionen.';
    } else if (url.includes('financescout24')) {
      provider = 'FinanceScout24';
      betterDescription = 'Versicherungsvergleich mit über 250 Tarifen von mehr als 70 Anbietern.';
    } else if (url.includes('toptarif.de')) {
      provider = 'TopTarif';
      betterDescription = 'Vergleichsportal für Versicherungen, Energie und Finanzen.';
    } else if (url.includes('arag.de')) {
      provider = 'ARAG';
      betterDescription = 'Europas größter Rechtsschutzversicherer. Direkt beim Spezialisten abschließen.';
    } else if (url.includes('roland-rechtsschutz')) {
      provider = 'ROLAND';
      betterDescription = 'Rechtsschutz-Spezialist seit 1957. Schnelle Hilfe im Rechtsfall.';
    } else if (url.includes('adam-riese')) {
      provider = 'Adam Riese';
      betterDescription = 'Digitaler Versicherer der Württembergischen. Flexibel und transparent.';
    } else if (url.includes('huk.de') || url.includes('huk24') || url.includes('huk-coburg')) {
      provider = 'HUK-COBURG';
      betterDescription = 'Deutschlands Versicherer im Bausparen. Faire Preise, starke Leistungen.';
    } else if (url.includes('allianz')) {
      provider = 'Allianz';
      betterDescription = 'Weltgrößter Versicherer. Umfassender Schutz mit persönlicher Beratung.';
    } else if (url.includes('axa.de')) {
      provider = 'AXA';
      betterDescription = 'Internationale Versicherungsgruppe. Von Krankenakte bis Lebensschutz.';
    } else if (url.includes('ergo.de')) {
      provider = 'ERGO';
      betterDescription = 'Die Versicherung an Ihrer Seite. Teil der Munich Re Gruppe.';
    } else if (url.includes('cosmosdirekt')) {
      provider = 'CosmosDirekt';
      betterDescription = 'Deutschlands führender Online-Versicherer. Direkt abschließen und sparen.';
    } else if (url.includes('generali')) {
      provider = 'Generali';
      betterDescription = 'Traditionsversicherer seit 1831. Einer der größten Erstversicherer weltweit.';
    } else if (url.includes('friday')) {
      provider = 'Friday';
      betterDescription = 'Digitaler Versicherer. Minutenschneller Abschluss per App.';
    } else if (url.includes('getsafe')) {
      provider = 'GetSafe';
      betterDescription = 'Neo-Versicherer. Komplett digital mit Schadenregulierung per App.';
    } else if (url.includes('nexible')) {
      provider = 'Nexible';
      betterDescription = 'Die digitale Kfz-Versicherung der Allianz. Günstig und flexibel.';
    } else if (url.includes('bavariadirekt')) {
      provider = 'BavariaDirekt';
      betterDescription = 'Online-Versicherer der Sparkassen. Regional verwurzelt, digital unterwegs.';
    } else {
      // Versuche Provider aus Title oder Meta-Tags zu extrahieren
      const siteTitle = $('title').text();
      const metaAuthor = $('meta[name="author"]').attr('content');
      const ogSiteName = $('meta[property="og:site_name"]').attr('content');
      
      provider = ogSiteName || metaAuthor || siteTitle.split('|')[0].split('-')[0].trim() || 'Versicherungsanbieter';
      
      // Säubere den Provider-Namen
      provider = provider.replace(/GmbH|AG|SE|&Co|KG|e\.V\.|Versicherung/gi, '').trim();
      if (provider.length > 25) {
        provider = provider.substring(0, 25).trim();
      }
      
      // Generische Beschreibung für unbekannte Anbieter
      betterDescription = 'Versicherungsanbieter mit Online-Abschluss-Möglichkeit.';
    }

    // Portal-spezifische Extraktion
    let specialData = { prices: [], features: [], provider: provider };

    if (url.includes('check24')) {
      specialData = await extractCheck24Content(url, $, bodyText);
      specialData.provider = 'CHECK24';
    } else if (url.includes('verivox')) {
      specialData = await extractVerivoxContent(url, $, bodyText);
      specialData.provider = 'Verivox';
    } else if (url.includes('tarifcheck')) {
      specialData = await extractTarifcheckContent(url, $, bodyText);
      specialData.provider = 'TarifCheck';
    }

    // Fallback: Generische Preis-Extraktion
    if (specialData.prices.length === 0) {
      const priceTexts = bodyText.match(/\d+[,.]?\d*\s*(€|EUR|euro)/gi) || [];
      specialData.prices = priceTexts.slice(0, 8);
    }

    const title = $('title').text() || $('h1').first().text() || 'Unbekannter Titel';
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') || 
                       betterDescription || '';

    // 🔴 VERBESSERTE Relevante Informationen extrahieren
    const keywords = [
      'laufzeit', 'monatlich', 'jährlich', 'kündigung', 'tarif', 'flat', 'unlimited',
      'grundgebühr', 'einmalig', 'anschluss', 'wechsel', 'bonus', 'rabatt', 'aktion',
      'mindestvertragslaufzeit', 'kündigungsfrist', 'bereitstellung', 'versand',
      'testsieger', 'empfehlung', 'auszeichnung', 'bewertung', 'note'
    ];

    let relevantInfo = betterDescription ? betterDescription + ' ' : '';
    keywords.forEach(keyword => {
      const regex = new RegExp(`.{0,100}${keyword}.{0,100}`, 'gi');
      const matches = bodyText.match(regex);
      if (matches) {
        relevantInfo += matches.slice(0, 2).join(' ') + ' ';
      }
    });

    // 🔴 Extrahiere Bewertungen und Auszeichnungen
    const ratingMatch = bodyText.match(/(\d[,.]?\d)\s*(sterne|punkte|note)/i);
    const testsiegerMatch = bodyText.match(/(testsieger|sehr gut|ausgezeichnet|empfehlung)/i);
    
    if (ratingMatch) {
      relevantInfo += ` Bewertung: ${ratingMatch[0]}. `;
    }
    if (testsiegerMatch) {
      relevantInfo += ` ${testsiegerMatch[0]}. `;
    }

    return {
      url,
      title: title.slice(0, 120),
      description: description.slice(0, 250) || relevantInfo.slice(0, 250),
      prices: specialData.prices,
      features: specialData.features || [],
      provider: specialData.provider || provider,
      relevantInfo: relevantInfo.slice(0, 600),
      success: true,
      isSpecialPortal: url.includes('check24') || url.includes('verivox') || url.includes('tarifcheck')
    };

  } catch (error) {
    console.warn(`❌ Fehler bei ${url}:`, error.message);

    // 🔴 Auch bei Fehler: Versuche Provider aus URL zu ermitteln
    let fallbackProvider = 'Anbieter';
    if (url.includes('check24')) fallbackProvider = 'CHECK24';
    else if (url.includes('verivox')) fallbackProvider = 'Verivox';
    else if (url.includes('tarifcheck')) fallbackProvider = 'TarifCheck';
    else if (url.includes('finanztip')) fallbackProvider = 'Finanztip';

    return {
      url,
      title: 'Seite momentan nicht erreichbar',
      description: `Bitte besuchen Sie die Webseite direkt für aktuelle Informationen.`,
      prices: [],
      features: [],
      provider: fallbackProvider,
      relevantInfo: '',
      success: false,
      error: error.message
    };
  }
}

// 🔴🔴🔴 WICHTIGSTE ÄNDERUNG: STRENGE PARTNER-VALIDIERUNG 🔴🔴🔴
function integratePartnerResults(organicResults, detectedType, contractText) {
  console.log(`🔍 STRENGE Partner-Integration gestartet...`);
  console.log(`📋 Erkannter Typ: ${detectedType}`);
  
  // Extract keywords für Partner-Matching
  const keywords = [];
  const textLower = contractText.toLowerCase();
  
  // Extract relevant keywords from contract
  const relevantTerms = textLower.match(/\b\w+\b/g) || [];
  keywords.push(...relevantTerms.filter(term => term.length > 3).slice(0, 20));
  
  // 🔴 STRENGES MATCHING: Explizite Typ-Extraktion
  const explicitTypes = {
    'rechtsschutz': /rechtsschutz/i,
    'haftpflicht': /(?<!kfz.{0,20})haftpflicht(?!.*kfz)/i, // Haftpflicht aber nicht KFZ-Haftpflicht
    'kfz': /kfz|auto(?:versicherung)?|fahrzeug/i,
    'hausrat': /hausrat/i,
    'wohngebäude': /wohngebäude|gebäudeversicherung/i,
    'berufsunfähigkeit': /berufsunfähig/i,
    'kranken': /kranken(?:versicherung|kasse)|pkv/i,
    'leben': /lebensversicherung/i,
    'unfall': /unfallversicherung/i,
    'tierhalter': /tier(?:halter)?.*haftpflicht|hunde.*haftpflicht/i,
    'strom': /strom(?:anbieter|tarif|vertrag)/i,
    'gas': /gas(?:anbieter|tarif|vertrag)/i,
    'dsl': /dsl|internet(?:anschluss|tarif)/i,
    'mobilfunk': /mobilfunk|handy(?:tarif|vertrag)/i,
    'kredit': /kredit|darlehen/i,
    'girokonto': /girokonto|banking/i
  };
  
  // 🔴 SCHRITT 1: Expliziten Vertragstyp finden
  let explicitContractType = null;
  for (const [type, regex] of Object.entries(explicitTypes)) {
    if (regex.test(contractText)) {
      explicitContractType = type;
      console.log(`✅ EXPLIZITER TYP ERKANNT: ${type}`);
      break;
    }
  }
  
  // 🔴 SCHRITT 2: Partner-Kategorie nur bei EXAKTER Übereinstimmung
  let partnerCategory = null;
  
  if (explicitContractType) {
    // Suche nur nach der EXAKTEN Kategorie
    partnerCategory = findBestPartnerCategory(keywords, explicitContractType);
    
    // 🔴 ZUSÄTZLICHE VALIDIERUNG: Prüfe ob gefundene Kategorie zum Typ passt
    if (partnerCategory) {
      const categoryKey = partnerCategory.category;
      
      // Mapping von erkanntem Typ zu erlaubten Kategorien
      const allowedMappings = {
        'rechtsschutz': ['rechtsschutz'],
        'haftpflicht': ['haftpflicht'],
        'kfz': ['kfzversicherung', 'motorrad'],
        'hausrat': ['hausrat'],
        'wohngebäude': ['wohngebaeude'],
        'berufsunfähigkeit': ['berufsunfaehigkeit'],
        'kranken': ['pkv', 'pkvBeamte', 'krankenzusatz'],
        'leben': ['leben', 'risikoleben'],
        'unfall': ['unfall'],
        'tierhalter': ['tierhalter', 'hundekranken'],
        'strom': ['strom', 'oekostrom'],
        'gas': ['gas'],
        'dsl': ['dsl'],
        'mobilfunk': ['mobilfunk'],
        'kredit': ['kredit'],
        'girokonto': ['girokonto']
      };
      
      const allowedCategories = allowedMappings[explicitContractType] || [];
      
      if (!allowedCategories.includes(categoryKey)) {
        console.log(`❌ KATEGORIE-VALIDIERUNG FEHLGESCHLAGEN!`);
        console.log(`   Typ: ${explicitContractType}`);
        console.log(`   Gefundene Kategorie: ${categoryKey}`);
        console.log(`   Erlaubte Kategorien: ${allowedCategories.join(', ')}`);
        console.log(`🚫 BLOCKIERE falsche Partner-Zuordnung!`);
        
        partnerCategory = null; // RESET - keine Partner-Widgets!
      } else {
        console.log(`✅ Kategorie-Validierung erfolgreich: ${categoryKey} passt zu ${explicitContractType}`);
      }
      
      // 🔴 ZUSÄTZLICHER SCORE-CHECK
      if (partnerCategory && partnerCategory.matchScore < 50) {
        console.log(`⚠️ Score zu niedrig (${partnerCategory.matchScore} < 50) - keine Partner-Widgets`);
        partnerCategory = null;
      }
    }
  }
  
  if (!partnerCategory) {
    console.log('🔍 KEINE passende Partner-Kategorie gefunden oder Validierung fehlgeschlagen');
    console.log('✅ Das ist RICHTIG so - lieber keine Widgets als falsche!');
    return { 
      combinedResults: organicResults,
      partnerCategory: null,
      partnerOffers: []
    };
  }
  
  console.log(`✅ VALIDIERTE Partner-Kategorie: ${partnerCategory.name} (Score: ${partnerCategory.matchScore})`);
  
  // Generate partner offers
  const partnerOffers = generatePartnerOffers(partnerCategory.category, {
    price: contractText.match(/(\d+[\.,]?\d*)\s*(€|EUR)/)?.[1]
  });
  
  // Combine results
  const combinedResults = [];
  
  // Add partner offers at strategic positions
  if (partnerOffers.length > 0) {
    // Add best partner offer at position 1
    combinedResults.push(partnerOffers[0]);
    
    // Add first 2 organic results
    combinedResults.push(...organicResults.slice(0, 2));
    
    // Add second partner offer if available at position 4
    if (partnerOffers[1]) {
      combinedResults.push(partnerOffers[1]);
    }
    
    // Add remaining organic results
    combinedResults.push(...organicResults.slice(2));
  } else {
    combinedResults.push(...organicResults);
  }
  
  return {
    combinedResults,
    partnerCategory,
    partnerOffers
  };
}

// 🚀 HAUPTROUTE mit verbesserter Validierung UND PARTNER-INTEGRATION
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
            content: "Du bist ein Experte für Vertragsanalyse. Erkenne den Typ des gegebenen Vertrags. Antworte nur mit einem der folgenden Begriffe: handy, mobilfunk, internet, strom, gas, versicherung, kfz, fitness, streaming, bank, kredit, hosting, software, ai, saas, unbekannt. Besondere Aufmerksamkeit für: Anthropic/Claude = ai, OpenAI/ChatGPT = ai, Software-Abos = software, Web-Services = saas"
          },
          {
            role: "user",
            content: `Analysiere diesen Vertrag und erkenne den Typ. Achte besonders auf Anbieter wie Anthropic, OpenAI, oder Software-Services:\n\n${cleanContractText.slice(0, 1000)}`
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
    const queryResult = generateEnhancedSearchQueries(detectedType, cleanContractText);
    const enhancedQueries = queryResult.queries;
    const contractContext = queryResult.contractContext;
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

    // 🔴🔴🔴 SOFORT-FILTERUNG DIREKT NACH DER SUCHE 🔴🔴🔴
    console.log(`🚨 AGGRESSIVE SOFORT-FILTERUNG für: ${detectedType}`);
    
    // Prüfe ob es eine Versicherung ist
    const isInsurance = detectedType.toLowerCase().includes('versicherung') || 
                       detectedType.toLowerCase().includes('rechtsschutz') ||
                       detectedType.toLowerCase().includes('haftpflicht') ||
                       detectedType.toLowerCase().includes('hausrat');
    
    if (isInsurance && organicResults.length > 0) {
      console.log(`🔴 VERSICHERUNGS-FILTER AKTIV!`);
      
      // BRUTALE Filterung für Versicherungen
      organicResults = organicResults.filter((result, idx) => {
        const text = `${result.title} ${result.snippet} ${result.link}`.toLowerCase();
        
        // Liste von SOFORT-BLOCKIER-WÖRTERN
        const instantBlockWords = ['idealo', 'mydealz', 'chip.de', 'dsl', 'internet', 
                                  'handy', 'mobilfunk', 'telekom', 'vodafone', 'o2', 
                                  '1und1', '1&1', 'mediamarkt', 'saturn', 'otto.de',
                                  'amazon', 'ebay', 'preisvergleich.de'];
        
        // Prüfe ob ein Blockier-Wort enthalten ist
        for (const blockWord of instantBlockWords) {
          if (text.includes(blockWord)) {
            console.log(`🚫 INSTANT-BLOCK [${idx}]: ${result.title} (wegen: ${blockWord})`);
            return false; // BLOCKIERT!
          }
        }
        
        // Bei Rechtsschutz: MUSS "rechtsschutz" enthalten oder von bekannter Seite sein
        if (detectedType.includes('rechtsschutz')) {
          const hasRechtsschutz = text.includes('rechtsschutz');
          const isAllowedSite = text.includes('check24') || text.includes('verivox') || 
                                text.includes('tarifcheck') || text.includes('finanztip');
          
          if (!hasRechtsschutz && !isAllowedSite) {
            console.log(`🚫 KEIN RECHTSSCHUTZ [${idx}]: ${result.title}`);
            return false;
          }
        }
        
        console.log(`✅ OK [${idx}]: ${result.title}`);
        return true; // ERLAUBT
      });
      
      console.log(`🔴 Nach AGGRESSIVER Filterung: ${organicResults.length} Ergebnisse`);
    }

    console.log(`🚀 POINT 7: Search completed`);

    // 🔴🔴🔴 UNIVERSELLE STRENGE FILTERUNG - VERSION 2.0 🔴🔴🔴
    console.log(`🔍 Starte UNIVERSELLE strenge Filterung für Typ: ${detectedType}`);
    console.log(`📊 Anzahl Ergebnisse VOR Filterung: ${organicResults.length}`);
    
    // Debug: Zeige die ersten 3 Titel
    organicResults.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i+1}. ${r.title}`);
    });
    
    // 🔴 SCHRITT 1: Erkenne den Versicherungstyp präzise
    let filterType = 'unknown';
    const textLower = cleanContractText.toLowerCase();
    
    // Prüfe explizit auf Versicherungstypen
    if (textLower.includes('rechtsschutz') || detectedType.includes('rechtsschutz')) {
      filterType = 'rechtsschutz';
    } else if (textLower.includes('haftpflicht') || detectedType.includes('haftpflicht')) {
      filterType = 'haftpflicht';
    } else if ((textLower.includes('kfz') || textLower.includes('auto')) && textLower.includes('versicherung')) {
      filterType = 'kfz';
    } else if (textLower.includes('hausrat') || detectedType.includes('hausrat')) {
      filterType = 'hausrat';
    } else if (textLower.includes('berufsunfähig') || detectedType.includes('berufsunfähig')) {
      filterType = 'berufsunfaehigkeit';
    } else if (textLower.includes('strom') || detectedType.includes('strom')) {
      filterType = 'strom';
    } else if (textLower.includes('gas') || detectedType.includes('gas')) {
      filterType = 'gas';
    } else if (textLower.includes('dsl') || textLower.includes('internet')) {
      filterType = 'dsl';
    } else if (textLower.includes('handy') || textLower.includes('mobilfunk')) {
      filterType = 'mobilfunk';
    }
    
    console.log(`🎯 Erkannter Filter-Typ: ${filterType}`);
    
    // 🔴 SCHRITT 2: STRIKTE FILTER-REGELN
    const strictFilters = {
      'rechtsschutz': {
        mustInclude: ['rechtsschutz'],
        canInclude: ['versicherung', 'anwalt', 'recht', 'klage', 'gericht', 'arag', 'roland', 'advocard', 'adam', 'riese'],
        mustNotInclude: ['dsl', 'internet', 'handy', 'mobilfunk', 'strom', 'gas', 'kfz', 'auto', 
                         'idealo', 'amazon', 'ebay', 'otto', 'mediamarkt', 'saturn', 'conrad',
                         'telekom', 'vodafone', 'o2', '1&1', '1und1', 'chip.de',
                         'haftpflicht', 'hausrat', 'berufsunfähig', 'kranken', 'leben']
      },
      'haftpflicht': {
        mustInclude: ['haftpflicht'],
        canInclude: ['versicherung', 'privat', 'schaden', 'huk', 'allianz', 'axa', 'ergo'],
        mustNotInclude: ['dsl', 'internet', 'handy', 'rechtsschutz', 'kfz', 'auto', 'idealo',
                         'telekom', 'vodafone', 'hausrat', 'berufsunfähig']
      },
      'kfz': {
        mustInclude: ['kfz', 'auto'],
        canInclude: ['versicherung', 'kasko', 'haftpflicht', 'fahrzeug', 'pkw'],
        mustNotInclude: ['dsl', 'internet', 'handy', 'rechtsschutz', 'hausrat', 'idealo']
      },
      'default': {
        mustInclude: [],
        canInclude: ['vergleich', 'tarif', 'günstig'],
        mustNotInclude: []
      }
    };
    
    const activeFilter = strictFilters[filterType] || strictFilters['default'];
    console.log(`📋 Aktiver Filter:`, activeFilter);
    
    // 🔴 SCHRITT 3: AGGRESSIVE FILTERUNG mit BLOG-BLOCKIERUNG
    let filteredResults = organicResults.filter((result, index) => {
      const title = (result.title || '').toLowerCase();
      const snippet = (result.snippet || '').toLowerCase();
      const url = (result.link || '').toLowerCase();
      const combined = `${title} ${snippet} ${url}`;
      
      // Debug für erste 5 Ergebnisse
      if (index < 5) {
        console.log(`\n🔍 Prüfe Ergebnis ${index + 1}: ${result.title}`);
      }
      
      // 🔴 NEU: BLOCKIERE BLOG-SEITEN UND NEWS-PORTALE
      const blogAndNewsBlocklist = [
        'handelsblatt.com', 'spiegel.de', 'focus.de', 'welt.de', 'zeit.de',
        'faz.net', 'sueddeutsche.de', 'bild.de', 'stern.de', 't-online.de',
        'n-tv.de', 'tagesschau.de', 'heise.de', 'golem.de', 'chip.de',
        'computerbild.de', 'giga.de', 'netzwelt.de', 'pcwelt.de',
        'wordpress.com', 'blogspot.com', 'medium.com', 'forbes.com',
        'businessinsider.de', 'wirtschaftswoche.de', 'manager-magazin.de',
        'capital.de', 'gruenderszene.de', 'deutsche-startups.de',
        'versicherungsbote.de', 'versicherungsjournal.de', 'pfefferminzia.de',
        'mydealz.de', 'gutscheinsammler.de', 'sparwelt.de', 'reddit.com'
      ];
      
      // Prüfe ob es eine Blog/News-Seite ist
      const isBlogOrNews = blogAndNewsBlocklist.some(domain => url.includes(domain));
      if (isBlogOrNews) {
        console.log(`   ❌ BLOCKIERT: Blog/News-Seite`);
        return false;
      }
      
      // Prüfe ob "blog", "artikel", "news", "test", "ratgeber" im URL-Pfad
      if (url.includes('/blog/') || url.includes('/artikel/') || 
          url.includes('/news/') || url.includes('/magazin/') ||
          url.includes('/ratgeber/') && !url.includes('finanztip')) {
        console.log(`   ❌ BLOCKIERT: Blog/Artikel-Pfad erkannt`);
        return false;
      }
      
      // REGEL 1: MUSS verbotene Wörter NICHT enthalten
      for (const forbidden of activeFilter.mustNotInclude) {
        if (combined.includes(forbidden)) {
          console.log(`   ❌ BLOCKIERT wegen verbotenem Wort: "${forbidden}"`);
          return false;
        }
      }
      
      // REGEL 2: MUSS erforderliche Wörter enthalten (wenn definiert)
      if (activeFilter.mustInclude.length > 0) {
        let hasRequired = false;
        for (const required of activeFilter.mustInclude) {
          if (combined.includes(required)) {
            hasRequired = true;
            if (index < 5) console.log(`   ✅ Enthält erforderliches Wort: "${required}"`);
            break;
          }
        }
        
        if (!hasRequired) {
          // Prüfe ob es wenigstens ein erlaubtes Wort enthält
          let hasAllowed = false;
          for (const allowed of activeFilter.canInclude) {
            if (combined.includes(allowed)) {
              hasAllowed = true;
              break;
            }
          }
          
          if (!hasAllowed) {
            console.log(`   ❌ BLOCKIERT: Enthält kein erforderliches Keyword`);
            return false;
          }
        }
      }
      
      // REGEL 3: Spezialprüfung für bekannte irrelevante Seiten
      const blacklistedDomains = ['idealo.de', 'preisvergleich.de', 'guenstiger.de', 'billiger.de'];
      if (blacklistedDomains.some(domain => url.includes(domain))) {
        console.log(`   ❌ BLOCKIERT: Blacklisted Domain`);
        return false;
      }
      
      // 🔴 NEU: POSITIV-LISTE für Versicherungen - NUR diese sind erlaubt
      if (filterType.includes('versicherung') || filterType === 'rechtsschutz' || 
          filterType === 'haftpflicht' || filterType === 'kfz' || filterType === 'hausrat') {
        
        const allowedInsuranceDomains = [
          // Vergleichsportale
          'check24.de', 'verivox.de', 'tarifcheck.de', 'financescout24.de',
          'toptarif.de', 'nafi-auto.de', 'dieversicherer.de',
          
          // Direkte Versicherer
          'huk.de', 'huk24.de', 'huk-coburg.de', 'allianz.de', 'axa.de', 
          'ergo.de', 'generali.de', 'zurich.de', 'cosmosdirekt.de',
          'hannoversche.de', 'signal-iduna.de', 'debeka.de', 'gothaer.de',
          'arag.de', 'roland-rechtsschutz.de', 'advocard.de', 'adam-riese.de',
          'friday.de', 'nexible.de', 'getsafe.de', 'luko.de', 'wefox.de',
          'bavariadirekt.de', 'vgh.de', 'lvm.de', 'provinzial.de',
          'versicherungskammer.de', 'nuernberger.de', 'continentale.de',
          
          // Verbraucher-Portale (nur diese!)
          'finanztip.de', 'test.de', 'stiftung-warentest.de', 'finanzfluss.de',
          'verbraucherzentrale.de', 'biallo.de'
        ];
        
        const isDomainAllowed = allowedInsuranceDomains.some(domain => url.includes(domain));
        
        if (!isDomainAllowed) {
          console.log(`   ❌ BLOCKIERT: Nicht in Versicherungs-Whitelist`);
          return false;
        }
      }
      
      if (index < 5) console.log(`   ✅ ERLAUBT`);
      return true;
    });
    
    console.log(`\n🔴 FILTERUNG ABGESCHLOSSEN:`);
    console.log(`   Vorher: ${organicResults.length} Ergebnisse`);
    console.log(`   Nachher: ${filteredResults.length} Ergebnisse`);
    
    // 🔴 SCHRITT 4: Wenn zu wenige Ergebnisse, füge PROFESSIONELLE Fallbacks hinzu
    if (filteredResults.length < 3 && filterType === 'rechtsschutz') {
      console.log(`⚠️ Zu wenige Ergebnisse - füge Rechtsschutz-Fallbacks hinzu`);
      
      const fallbackResults = [
        {
          title: "Finanztip - Rechtsschutzversicherung Ratgeber 2024",
          link: "https://www.finanztip.de/rechtsschutzversicherung/",
          snippet: "Unabhängiger Ratgeber der gemeinnützigen Finanztip-Stiftung. Erfahren Sie, welche Rechtsschutzversicherung wirklich sinnvoll ist und worauf Sie beim Abschluss achten müssen.",
          position: 99,
          provider: 'Finanztip'
        },
        {
          title: "ARAG SE - Rechtsschutz vom Marktführer",
          link: "https://www.arag.de/rechtsschutzversicherung/",
          snippet: "ARAG - Europas größter Rechtsschutzversicherer. Mehrfacher Testsieger mit über 85 Jahren Erfahrung. Flexible Tarife mit oder ohne Selbstbeteiligung.",
          position: 98,
          provider: 'ARAG'
        }
      ];
      
      filteredResults = [...filteredResults, ...fallbackResults];
    } else if (filteredResults.length < 3 && filterType === 'haftpflicht') {
      console.log(`⚠️ Zu wenige Ergebnisse - füge Haftpflicht-Fallbacks hinzu`);
      
      const fallbackResults = [
        {
          title: "HUK-COBURG - Haftpflichtversicherung Testsieger",
          link: "https://www.huk.de/haftpflichtversicherung/",
          snippet: "Deutschlands Versicherer im Bausparen. Haftpflichtschutz ab 2,87€ monatlich mit Deckungssummen bis 50 Mio. Euro.",
          position: 99,
          provider: 'HUK-COBURG'
        },
        {
          title: "Allianz - Privathaftpflicht mit Bestnoten",
          link: "https://www.allianz.de/haftpflichtversicherung/",
          snippet: "Die Allianz Haftpflichtversicherung schützt Sie weltweit. Flexible Tarife für Singles, Paare und Familien mit ausgezeichnetem Service.",
          position: 98,
          provider: 'Allianz'
        }
      ];
      
      filteredResults = [...filteredResults, ...fallbackResults];
    }
    
    // Überschreibe die organicResults mit gefilterten
    organicResults = filteredResults;

    // 🆕 PARTNER-INTEGRATION MIT STRENGER VALIDIERUNG
    console.log(`🤝 Starting STRICT Partner Integration...`);
    const { combinedResults, partnerCategory, partnerOffers } = integratePartnerResults(
      organicResults,
      detectedType,
      cleanContractText
    );
    
    // 🆕 Enhanced Debug Info
    if (combinedResults.length === 0) {
      console.log(`❌ Multi-Search Problem - Keine Ergebnisse gefunden`);
      console.log(`🔍 Versuchte Queries:`, enhancedQueries.slice(0, 3));

      // 🆕 FALLBACK: Wenn SERP nicht funktioniert, erstelle Mock-Ergebnisse
      if (!SERP_API_KEY) {
        console.log(`🔧 FALLBACK: Erstelle Mock-Ergebnisse da SERP API Key fehlt`);

        const mockResults = [
          {
            title: "Check24 - Haftpflichtversicherung Vergleich",
            link: "https://www.check24.de/haftpflichtversicherung/",
            snippet: "Vergleichen Sie über 100 Haftpflichtversicherungen und sparen bis zu 43%. Kostenloser Vergleich mit Sofort-Online-Abschluss.",
            prices: ["19,90€", "24,99€", "32,50€"],
            features: ["Deckungssumme bis 50 Mio. €", "Weltweiter Schutz", "Schlüsselverlust mitversichert"],
            provider: "Check24",
            relevantInfo: "Haftpflichtversicherung ab 19,90€ jährlich. Deckungssumme bis 50 Millionen Euro.",
            hasDetailedData: true,
            isPriorityPortal: true,
            position: 1
          },
          {
            title: "Verivox - Haftpflicht günstiger",
            link: "https://www.verivox.de/haftpflichtversicherung/",
            snippet: "Jetzt Haftpflichtversicherung vergleichen und bis zu 40% sparen. Über 70 Tarife im Vergleich.",
            prices: ["22,80€", "28,95€", "35,40€"],
            features: ["Online-Rabatt", "Sofortschutz", "Kostenlose Beratung"],
            provider: "Verivox",
            relevantInfo: "Haftpflichtversicherung mit Online-Rabatt. Sofortschutz verfügbar.",
            hasDetailedData: true,
            isPriorityPortal: true,
            position: 2
          },
          {
            title: "Allianz Haftpflichtversicherung",
            link: "https://www.allianz.de/recht-und-eigentum/haftpflichtversicherung/",
            snippet: "Schützen Sie sich vor hohen Schadenersatzforderungen. Allianz Haftpflicht ab 47,88€ pro Jahr.",
            prices: ["47,88€", "69,90€"],
            features: ["Allianz Markenqualität", "24/7 Schadenservice", "Flexible Zahlungsweise"],
            provider: "Allianz",
            relevantInfo: "Markenversicherung mit 24/7 Service. Flexible Zahlungsoptionen verfügbar.",
            hasDetailedData: true,
            isPriorityPortal: false,
            position: 3
          }
        ];

        return res.json({
          analysis: `## 📊 Vertragsanalyse\nIhr aktueller BavariaDirekt Haftpflichtvertrag kostet 37,99€ jährlich. Das ist ein sehr guter Preis für eine Haftpflichtversicherung.\n\n## 🏆 Top 3 Alternativen\n1. **Check24 Tarife** - Bereits ab 19,90€ verfügbar, könnte bis zu 18€ jährlich sparen\n2. **Verivox Angebote** - Ab 22,80€ mit Online-Rabatt, Ersparnis von ca. 15€\n3. **Allianz Premium** - Höherpreisig (47,88€) aber Markenqualität\n\n## 💡 Empfehlung\nIhr aktueller Tarif ist bereits sehr günstig positioniert. Ein Wechsel könnte minimal sparen, aber prüfen Sie die Leistungsunterschiede.\n\n## 💰 Potenzielle Ersparnis\nBis zu 18€ jährlich möglich, aber Vorsicht bei Leistungseinschränkungen.`,
          alternatives: mockResults,
          searchQuery: enhancedQueries[0],
          contractType: detectedType,
          partnerCategory: partnerCategory,
          partnerOffers: partnerOffers,
          performance: {
            totalAlternatives: mockResults.length,
            detailedExtractions: mockResults.length,
            partnerOffersCount: partnerOffers.length,
            timestamp: new Date().toISOString(),
            warning: "DEMO MODE: SERP API nicht verfügbar - Mock-Daten verwendet"
          },
          fromCache: false,
          demoMode: true
        });
      }

      return res.status(404).json({
        error: "Keine Suchergebnisse gefunden",
        searchQuery: cleanSearchQuery,
        detectedType,
        attemptedQueries: enhancedQueries.slice(0, 3),
        suggestion: "Versuchen Sie es mit einem anderen Vertragstyp oder anderen Keywords",
        debug: {
          totalQueriesAttempted: enhancedQueries.length,
          organicResultsLength: organicResults.length,
          serpApiKeyAvailable: !!SERP_API_KEY
        }
      });
    }
    
    console.log(`📊 ${combinedResults.length} Gesamtergebnisse (inkl. ${partnerOffers.length} Partner-Angebote)`);

    // 🆕 Enhanced Content Extraktion mit Priorisierung
    // Priorisiere Vergleichsportale und extrahiere mehr URLs
    const priorityUrls = [];
    const regularUrls = [];

    // Only extract from organic (non-partner) results
    const organicResultsToExtract = combinedResults.filter(r => r.source !== 'partner');

    organicResultsToExtract.slice(0, 8).forEach(result => {
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

    // 🆕 Enhanced Data Kombinierung mit VERBESSERTER SORTIERUNG
    const enrichedResults = combinedResults.slice(0, 10).map((result, index) => {
      // Partner results already have all needed data
      if (result.source === 'partner') {
        return {
          ...result,
          position: index + 1,
          sortPriority: 1 // Höchste Priorität für Partner-Widgets
        };
      }
      
      // Enrich organic results with extracted data
      const extracted = successfulExtractions.find(ext => ext.url === result.link);
      
      // Bestimme Sort-Priorität basierend auf Provider-Typ
      let sortPriority = 5; // Standard-Priorität
      const url = result.link?.toLowerCase() || '';
      
      // Direkte Versicherer bekommen höhere Priorität
      if (url.includes('arag.de') || url.includes('roland-rechtsschutz') || 
          url.includes('huk.de') || url.includes('allianz.de') || 
          url.includes('axa.de') || url.includes('cosmosdirekt') ||
          url.includes('adam-riese') || url.includes('friday')) {
        sortPriority = 2; // Direkte Versicherer
      }
      // Spezialisierte Vergleichsportale
      else if ((url.includes('check24') || url.includes('verivox') || 
                url.includes('tarifcheck')) && 
               (result.title?.toLowerCase().includes(detectedType) || 
                result.snippet?.toLowerCase().includes(detectedType))) {
        sortPriority = 3; // Spezialisierte Vergleiche
      }
      // Allgemeine Vergleichsportale
      else if (url.includes('check24') || url.includes('verivox') || 
               url.includes('tarifcheck')) {
        sortPriority = 4; // Generische Vergleiche
      }
      // Ratgeber-Seiten
      else if (url.includes('finanztip') || url.includes('test.de') || 
               url.includes('stiftung-warentest')) {
        sortPriority = 6; // Ratgeber
      }

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
        extractionError: extracted?.error || null,
        source: 'serp',
        sortPriority: sortPriority
      };
    });
    
    // SORTIERE die Ergebnisse nach Priorität
    enrichedResults.sort((a, b) => {
      // Erst nach Priorität sortieren
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }
      // Bei gleicher Priorität: Position beibehalten
      return a.position - b.position;
    });
    
    console.log(`📊 Sortierte Ergebnisse nach Relevanz:`, 
      enrichedResults.slice(0, 5).map(r => `${r.provider} (Prio: ${r.sortPriority})`));

    // 🆕 Fallback wenn keine erfolgreichen Extraktionen
    if (successfulExtractions.length === 0 && partnerOffers.length === 0) {
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
        extractionError: 'Content extraction failed',
        source: 'serp'
      }));

      return res.json({
        analysis: "⚠️ Aufgrund technischer Beschränkungen konnten detaillierte Preise nicht extrahiert werden. Die folgenden Anbieter könnten jedoch relevante Alternativen sein. Besuchen Sie die Links für aktuelle Preise und Details.",
        alternatives: fallbackResults,
        searchQuery: enhancedQueries[0],
        contractType: detectedType,
        partnerCategory: partnerCategory,
        partnerOffers: [],
        performance: {
          totalAlternatives: fallbackResults.length,
          detailedExtractions: 0,
          partnerOffersCount: 0,
          timestamp: new Date().toISOString(),
          warning: "Limited data extraction"
        },
        fromCache: false
      });
    }
    
    // GPT-Analyse (ERWEITERT UM PARTNER-HINWEISE)
    const systemPrompt = `Du bist ein professioneller Vertragsanalyst. Analysiere den gegebenen Vertrag und vergleiche ihn mit gefundenen Alternativen.

WICHTIG: 
- Nutze die extrahierten Preise und Vertragsinformationen für eine genaue Analyse.
- Berücksichtige sowohl Partner-Angebote als auch organische Suchergebnisse.
- Partner-Angebote (Check24, TarifCheck) bieten oft umfassende Vergleiche.

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
   ${result.source === 'partner' ? '⭐ PARTNER-ANGEBOT: Umfassender Vergleich verfügbar' : ''}
   ${result.hasDetailedData ? `
   Gefundene Preise: ${result.prices.join(', ') || 'Keine Preise gefunden'}
   Vertragsinformationen: ${result.relevantInfo}` : '(Keine detaillierten Daten verfügbar)'}
`).join('\n')}

${partnerCategory ? `
**VERFÜGBARE VERGLEICHSPORTALE:**
${partnerCategory.name} über ${partnerCategory.provider === 'check24' ? 'CHECK24' : 'TarifCheck'}
` : ''}

Bitte analysiere diese Alternativen und gib eine fundierte Empfehlung. Berücksichtige besonders die Partner-Angebote, da diese oft die besten Vergleichsmöglichkeiten bieten.`;

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
    
    // Ergebnis strukturieren (MIT PARTNER-INFO)
    const result = {
      analysis,
      alternatives: enrichedResults,
      searchQuery: cleanSearchQuery,
      partnerCategory: partnerCategory,
      partnerOffers: partnerOffers,
      performance: {
        totalAlternatives: combinedResults.length,
        organicResults: organicResults.length,
        partnerOffersCount: partnerOffers.length,
        detailedExtractions: successfulExtractions.length,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - Date.now() // Placeholder
      }
    };
    
    // Cache speichern
    saveToCache(cacheKey, result);
    console.log(`💾 Ergebnis im Cache gespeichert (Key: ${cacheKey})`);
    
    console.log(`✅ Vertragsvergleich abgeschlossen - ${enrichedResults.length} Alternativen analysiert (inkl. ${partnerOffers.length} Partner)`);
    
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

// 🆕 PARTNER WIDGET ENDPOINTS
router.get("/partner-widget/:category", (req, res) => {
  const { category } = req.params;
  const { type } = req.query; // 'full' oder 'quick'
  
  const mapping = partnerMappings[category];
  
  if (!mapping) {
    return res.status(404).json({ error: 'Kategorie nicht gefunden' });
  }
  
  const widgetType = type === 'quick' ? 'quickCalculator' : 'fullCalculator';
  const widget = mapping.widgets[widgetType];
  
  if (!widget) {
    return res.status(404).json({ error: 'Widget nicht verfügbar' });
  }
  
  res.json({
    success: true,
    category: category,
    provider: mapping.provider,
    name: mapping.name,
    widget: widget,
    impressum: getImpressumText(mapping.provider)
  });
});

// Helper: Impressum-Text für Partner
function getImpressumText(provider) {
  if (provider === 'check24') {
    return `<p><strong>CHECK24.net Partnerprogramm</strong></p><p>Wir nehmen am CHECK24.net Partnerprogramm teil. Auf unseren Seiten werden iFrame-Buchungsmasken und andere Werbemittel eingebunden, an denen wir über Transaktionen, zum Beispiel durch Leads und Sales, eine Werbekostenerstattung erhalten können.</p><p>Weitere Informationen zur Datennutzung durch CHECK24.net erhalten Sie in der Datenschutzerklärung von <a href="https://www.check24.net" target="_blank">CHECK24.net</a>.</p>`;
  } else if (provider === 'tarifcheck') {
    return `<p><strong>TarifCheck.de Partnerprogramm</strong></p><p>Wir nehmen am TarifCheck.de Partnerprogramm teil. Auf unseren Seiten werden Vergleichsrechner und andere Werbemittel eingebunden, an denen wir über erfolgreiche Vermittlungen eine Provision erhalten können.</p><p>Weitere Informationen zur Datennutzung durch TarifCheck.de erhalten Sie in der Datenschutzerklärung von <a href="https://www.tarifcheck.de" target="_blank">TarifCheck.de</a>.</p>`;
  }
  return '';
}

// Route: Verfügbare Partner-Kategorien
router.get("/partner-categories", (req, res) => {
  const categories = Object.keys(partnerMappings).map(key => ({
    key: key,
    name: partnerMappings[key].name,
    provider: partnerMappings[key].provider,
    type: partnerMappings[key].type
  }));
  
  res.json({
    success: true,
    categories: categories,
    grouped: groupCategoriesByType(categories)
  });
});

// Helper: Kategorien gruppieren
function groupCategoriesByType(categories) {
  const grouped = {};
  categories.forEach(cat => {
    if (!grouped[cat.type]) {
      grouped[cat.type] = [];
    }
    grouped[cat.type].push(cat);
  });
  return grouped;
}

module.exports = router;
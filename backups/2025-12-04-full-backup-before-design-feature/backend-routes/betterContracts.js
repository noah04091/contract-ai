// 📋 backend/routes/betterContracts.js  
// ERWEITERTE VERSION MIT STRENGEM PARTNER-MATCHING UND INTELLIGENTER PREISERKENNUNG

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
    const contractKeywords = ['vertrag', 'tarif', 'laufzeit', 'monatlich', 'kündig', 'bedingung', 'agb', 'preis', '€', 'euro', 'strom', 'gas', 'kwh'];
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
    'apple': 'Software/Streaming',
    'eon': 'Energie',
    'vattenfall': 'Energie',
    'enbw': 'Energie',
    'rwe': 'Energie',
    'stadtwerke': 'Energie'
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

  // 🔴 VERBESSERTE SPEZIFISCHE QUERIES MIT STROM-FIX
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
      "stromanbieter wechsel 2024 deutschland",
      "günstiger strom vergleich check24 verivox",
      "ökostrom tarife günstig vergleich",
      "stromvergleich testsieger 2024",
      "stromtarife vergleich bonus",
      "stromanbieter wechsel prämie",
      "billig strom anbieter deutschland",
      "strompreise 2024 vergleich"
    ],
    "gas": [
      "gasanbieter vergleich günstig deutschland",
      "gas tarife wechsel bonus 2024",
      "erdgas anbieter wechsel check24",
      "gasvergleich verivox testsieger"
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
      } else if (contractContext.category === 'Energie') {
        enhancedQueries.push(`stromtarife unter ${Math.floor(price)}€ monatlich`);
        enhancedQueries.push(`günstiger strom unter ${Math.floor(price * 0.8)}€`);
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
      } else if (contractContext.category === 'Energie') {
        enhancedQueries.push(
          "stromvergleich check24 verivox",
          "energie anbieter wechsel 2024",
          "günstige strom gas tarife deutschland"
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

// 🔴🔴🔴 VERBESSERTE Website-Inhalt extrahieren mit INTELLIGENTER PREISERKENNUNG 🔴🔴🔴
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
    const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 3000); // Mehr Text für bessere Analyse

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
    } else if (url.includes('preisvergleich.de')) {
      provider = 'PREISVERGLEICH.de';
      betterDescription = 'Unabhängiges Vergleichsportal mit Preisgarantie.';
    } else if (url.includes('strom-gas24.de')) {
      provider = 'strom-gas24.de';
      betterDescription = 'Energie-Vergleichsportal mit aktuellen Tarifen.';
    } else if (url.includes('finanzfluss.de')) {
      provider = 'Finanzfluss';
      betterDescription = 'Unabhängige Finanzbildung. Transparente Vergleiche ohne versteckte Provisionen.';
    } else if (url.includes('financescout24')) {
      provider = 'FinanceScout24';
      betterDescription = 'Versicherungsvergleich mit über 250 Tarifen von mehr als 70 Anbietern.';
    } else if (url.includes('toptarif.de')) {
      provider = 'TopTarif';
      betterDescription = 'Vergleichsportal für Versicherungen, Energie und Finanzen.';
    } else if (url.includes('stromauskunft.de')) {
      provider = 'Stromauskunft';
      betterDescription = 'Unabhängiges Stromvergleichsportal mit aktuellen Tarifen und Wechselservice.';
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
      
      provider = ogSiteName || metaAuthor || siteTitle.split('|')[0].split('-')[0].trim() || 'Anbieter';
      
      // Säubere den Provider-Namen
      provider = provider.replace(/GmbH|AG|SE|&Co|KG|e\.V\.|Versicherung/gi, '').trim();
      if (provider.length > 25) {
        provider = provider.substring(0, 25).trim();
      }
      
      // Generische Beschreibung für unbekannte Anbieter
      betterDescription = 'Online-Vergleichsportal für bessere Tarife.';
    }

    // 🔴🔴🔴 NEUE INTELLIGENTE PREIS-EXTRAKTION 🔴🔴🔴
    const prices = [];
    const savings = [];
    const features = [];
    
    // Definiere Patterns für verschiedene Preis-Typen
    const patterns = {
      // ECHTE PREISE (was man zahlt)
      monthlyPrice: [
        /ab\s+(\d+[,.]?\d*)\s*€(?:\s*\/?\s*(?:pro\s+)?monat(?:lich)?)?/gi,
        /(\d+[,.]?\d*)\s*€\s*(?:pro\s+)?monat(?:lich)?/gi,
        /monatlich(?:er)?\s+(?:ab\s+)?(\d+[,.]?\d*)\s*€/gi,
        /mtl\.\s*(\d+[,.]?\d*)\s*€/gi,
        /(\d+[,.]?\d*)\s*€\/mtl/gi,
        /grundpreis:?\s*(\d+[,.]?\d*)\s*€/gi,
        /arbeitspreis:?\s*(\d+[,.]?\d*)\s*cent/gi
      ],
      yearlyPrice: [
        /(\d+[,.]?\d*)\s*€\s*(?:pro\s+)?jahr/gi,
        /jährlich(?:er)?\s+(?:ab\s+)?(\d+[,.]?\d*)\s*€/gi,
        /(\d+[,.]?\d*)\s*€\s*p\.?\s*a\.?/gi,
        /(\d+[,.]?\d*)\s*€\/jahr/gi
      ],
      // ERSPARNISSE (was man sparen kann)
      savingsAmount: [
        /(?:spare(?:n)?|ersparnis|einspar(?:en)?|spar(?:en)?)\s+(?:bis\s+zu\s+)?(\d+[,.]?\d*)\s*€/gi,
        /bis\s+zu\s+(\d+[,.]?\d*)\s*€\s+(?:spare|ersparnis|günstiger|weniger)/gi,
        /(\d+[,.]?\d*)\s*€\s+(?:ersparnis|einsparung|sparpotenzial|bonus|prämie|cashback)/gi,
        /bonus:?\s*(?:bis\s+zu\s+)?(\d+[,.]?\d*)\s*€/gi,
        /prämie:?\s*(?:bis\s+zu\s+)?(\d+[,.]?\d*)\s*€/gi,
        /wechselbonus:?\s*(?:bis\s+zu\s+)?(\d+[,.]?\d*)\s*€/gi,
        /neukundenbonus:?\s*(?:bis\s+zu\s+)?(\d+[,.]?\d*)\s*€/gi,
        /sofortbonus:?\s*(?:bis\s+zu\s+)?(\d+[,.]?\d*)\s*€/gi
      ]
    };
    
    // Extrahiere ECHTE PREISE
    patterns.monthlyPrice.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const price = match[1].replace(',', '.');
        const priceNum = parseFloat(price);
        // Plausibilitätsprüfung für Monatspreise
        if (priceNum > 0 && priceNum < 500) { // Strompreise über 500€/Monat sind unwahrscheinlich
          prices.push(`${priceNum.toFixed(2)}€/Monat`);
        }
      }
    });
    
    patterns.yearlyPrice.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const price = match[1].replace(',', '.');
        const priceNum = parseFloat(price);
        // Plausibilitätsprüfung für Jahrespreise
        if (priceNum > 50 && priceNum < 6000) { // Plausible Jahrespreise
          const monthlyEquivalent = (priceNum / 12).toFixed(2);
          prices.push(`${priceNum.toFixed(2)}€/Jahr (${monthlyEquivalent}€/Monat)`);
        }
      }
    });
    
    // Extrahiere ERSPARNISSE (NICHT als Preise!)
    patterns.savingsAmount.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const saving = match[1].replace(',', '.');
        const savingNum = parseFloat(saving);
        if (savingNum > 0 && savingNum < 10000) { // Plausible Ersparnisse
          savings.push(`Bis zu ${savingNum.toFixed(0)}€ Ersparnis`);
        }
      }
    });
    
    // Wenn keine echten Preise gefunden, suche nach Preis-Ranges
    if (prices.length === 0) {
      const rangePattern = /tarife?\s+(?:ab|von)\s+(\d+[,.]?\d*)\s*(?:bis|[-–])\s*(\d+[,.]?\d*)\s*€/gi;
      const rangeMatches = bodyText.matchAll(rangePattern);
      for (const match of rangeMatches) {
        const min = parseFloat(match[1].replace(',', '.'));
        const max = parseFloat(match[2].replace(',', '.'));
        if (min > 0 && min < 500 && max > min && max < 1000) {
          prices.push(`${min.toFixed(2)}€ - ${max.toFixed(2)}€/Monat`);
        }
      }
    }
    
    // Portal-spezifische Extraktion für CHECK24/Verivox
    if (url.includes('check24') || url.includes('verivox') || url.includes('tarifcheck')) {
      // Spezielle Selektoren für Vergleichsportale
      $('.price-value, .monthly-price, .tariff-price, [data-price], .result-price').each((i, el) => {
        const priceText = $(el).text().trim();
        const priceMatch = priceText.match(/(\d+[,.]?\d*)\s*€/);
        if (priceMatch && prices.length < 5) {
          const price = parseFloat(priceMatch[1].replace(',', '.'));
          if (price > 0 && price < 500) {
            prices.push(`${price.toFixed(2)}€/Monat`);
          }
        }
      });
    }
    
    // Features extrahieren (verbessert)
    $('.feature-list li, .tariff-details li, .comparison-feature, .benefit-item').each((i, el) => {
      const feature = $(el).text().trim();
      if (feature.length > 5 && feature.length < 100 && features.length < 8) {
        features.push(feature);
      }
    });
    
    // Wenn immer noch keine Features, extrahiere aus Text
    if (features.length === 0) {
      const featureKeywords = [
        'preisgarantie', 'ökostrom', 'klimaneutral', 'wechselbonus',
        'sofortbonus', 'neukundenbonus', 'keine grundgebühr',
        'monatlich kündbar', 'testsieger', 'tüv-geprüft'
      ];
      
      featureKeywords.forEach(keyword => {
        if (bodyText.toLowerCase().includes(keyword) && features.length < 5) {
          features.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      });
    }
    
    // Deduplizierung
    const uniquePrices = [...new Set(prices)].slice(0, 5);
    const uniqueSavings = [...new Set(savings)].slice(0, 3);
    const uniqueFeatures = [...new Set(features)].slice(0, 5);

    const title = $('title').text() || $('h1').first().text() || 'Unbekannter Titel';
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') || 
                       betterDescription || '';

    // 🔴 VERBESSERTE Relevante Informationen extrahieren
    let relevantInfo = betterDescription ? betterDescription + ' ' : '';
    
    // Füge Ersparnisse zur relevanten Info hinzu (aber NICHT als Preise!)
    if (uniqueSavings.length > 0) {
      relevantInfo += ' ' + uniqueSavings.join('. ') + '.';
    }
    
    // Extrahiere Bewertungen und Auszeichnungen
    const ratingMatch = bodyText.match(/(\d[,.]?\d)\s*(sterne|punkte|note)/i);
    const testsiegerMatch = bodyText.match(/(testsieger|sehr gut|ausgezeichnet|empfehlung)/i);
    
    if (ratingMatch) {
      relevantInfo += ` Bewertung: ${ratingMatch[0]}.`;
    }
    if (testsiegerMatch) {
      relevantInfo += ` ${testsiegerMatch[0]}.`;
    }

    console.log(`💰 Extrahierte Preise für ${provider}:`, uniquePrices);
    console.log(`💸 Extrahierte Ersparnisse für ${provider}:`, uniqueSavings);

    return {
      url,
      title: title.slice(0, 120),
      description: description.slice(0, 250) || relevantInfo.slice(0, 250),
      prices: uniquePrices, // NUR echte Preise, KEINE Ersparnisse
      savings: uniqueSavings, // Ersparnisse separat
      features: uniqueFeatures,
      provider: provider,
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
    else if (url.includes('preisvergleich')) fallbackProvider = 'PREISVERGLEICH.de';
    else if (url.includes('strom-gas24')) fallbackProvider = 'strom-gas24.de';

    return {
      url,
      title: 'Seite momentan nicht erreichbar',
      description: `Bitte besuchen Sie die Webseite direkt für aktuelle Informationen.`,
      prices: [],
      savings: [],
      features: [],
      provider: fallbackProvider,
      relevantInfo: '',
      success: false,
      error: error.message
    };
  }
}

// 🔴🔴🔴 WICHTIGSTE ÄNDERUNG: STRENGE PARTNER-VALIDIERUNG MIT STROM-FIX 🔴🔴🔴
function integratePartnerResults(organicResults, detectedType, contractText) {
  console.log(`🔍 STRENGE Partner-Integration gestartet...`);
  console.log(`📋 Erkannter Typ: ${detectedType}`);
  
  // 🚨 PRIORITÄT: Partner-Check für Energie-Verträge
  const textLower = contractText.toLowerCase();
  let partnerCategory = null;
  
  // SOFORT-CHECK für Energie-Verträge
  if (detectedType === 'strom' || detectedType === 'gas' || 
      textLower.includes('strom') || textLower.includes('kwh') ||
      textLower.includes('energie') || textLower.includes('stadtwerke') ||
      textLower.includes('vattenfall') || textLower.includes('eon') ||
      textLower.includes('gas') || textLower.includes('erdgas')) {
    
    console.log(`⚡ ENERGIE-VERTRAG ERKANNT - Forciere Partner-Widget!`);
    
    // Direkte Zuweisung ohne Score-Validierung für Energie
    if (detectedType === 'strom' || textLower.includes('strom') || 
        textLower.includes('kwh') || textLower.includes('energie')) {
      partnerCategory = {
        category: 'strom',
        ...partnerMappings['strom'],
        matchScore: 100
      };
      console.log(`✅ STROM Partner-Widget wird GARANTIERT angezeigt!`);
    } else if (detectedType === 'gas' || textLower.includes('gas') || 
               textLower.includes('erdgas')) {
      partnerCategory = {
        category: 'gas',
        ...partnerMappings['gas'],
        matchScore: 100
      };
      console.log(`✅ GAS Partner-Widget wird GARANTIERT angezeigt!`);
    }
    
    // Generiere Partner-Angebote SOFORT
    const partnerOffers = generatePartnerOffers(partnerCategory.category, {
      price: contractText.match(/(\d+[\.,]?\d*)\s*(€|EUR)/)?.[1]
    });
    
    // Partner-Widget IMMER an Position 1
    const combinedResults = [
      ...partnerOffers, // Partner zuerst
      ...organicResults // Dann organische Ergebnisse
    ];
    
    return {
      combinedResults,
      partnerCategory,
      partnerOffers
    };
  }
  
  // Extract keywords für Partner-Matching (nur für NICHT-Energie)
  const keywords = [];
  const relevantTerms = textLower.match(/\b\w+\b/g) || [];
  keywords.push(...relevantTerms.filter(term => term.length > 3).slice(0, 20));
  
  // 🔴 STRENGES MATCHING: Explizite Typ-Extraktion
  const explicitTypes = {
    'rechtsschutz': /rechtsschutz/i,
    'haftpflicht': /(?<!kfz.{0,20})haftpflicht(?!.*kfz)/i,
    'kfz': /kfz|auto(?:versicherung)?|fahrzeug/i,
    'hausrat': /hausrat/i,
    'wohngebäude': /wohngebäude|gebäudeversicherung/i,
    'berufsunfähigkeit': /berufsunfähig/i,
    'kranken': /kranken(?:versicherung|kasse)|pkv/i,
    'leben': /lebensversicherung/i,
    'unfall': /unfallversicherung/i,
    'tierhalter': /tier(?:halter)?.*haftpflicht|hunde.*haftpflicht/i,
    'strom': /strom|energie|kwh|stadtwerke|stromanbieter|stromtarif|stromvertrag|eon|vattenfall|enbw|rwe/i,
    'gas': /gas|erdgas|gasanbieter|gastarif|gasvertrag/i,
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

// 🌍 ULTIMATIVE STANDORT-INTEGRATION\nconst MAJOR_GERMAN_CITIES = {\n  'berlin': {\n    stadtwerke: 'Berliner Stadtwerke',\n    carsharing: ['car2go', 'DriveNow', 'Miles'],\n    oepnv: 'BVG Berliner Verkehrsbetriebe',\n    internetProvider: ['Telekom', 'Vodafone', 'O2', '1&1', 'EWE'],\n    regionalEnergy: ['Berliner Stadtwerke', 'GASAG', 'E.ON']\n  },\n  'muenchen': {\n    stadtwerke: 'Stadtwerke München',\n    carsharing: ['DriveNow', 'car2go', 'Flinkster'],\n    oepnv: 'MVG Münchner Verkehrsgesellschaft',\n    internetProvider: ['Telekom', 'Vodafone', 'O2', 'M-net'],\n    regionalEnergy: ['Stadtwerke München', 'E.ON Bayern', 'LichtBlick']\n  },\n  'hamburg': {\n    stadtwerke: 'Hamburger Stadtwerke',\n    carsharing: ['car2go', 'DriveNow', 'Cambio'],\n    oepnv: 'HVV Hamburger Verkehrsverbund',\n    internetProvider: ['Telekom', 'Vodafone', 'O2', 'Wilhelm.tel'],\n    regionalEnergy: ['Hamburger Stadtwerke', 'LichtBlick', 'E.ON']\n  },\n  'koeln': {\n    stadtwerke: 'Stadtwerke Köln',\n    carsharing: ['car2go', 'Cambio', 'Flinkster'],\n    oepnv: 'KVB Kölner Verkehrs-Betriebe',\n    internetProvider: ['Telekom', 'Vodafone', 'O2', 'NetCologne'],\n    regionalEnergy: ['RheinEnergie', 'E.ON', 'Stadtwerke Köln']\n  },\n  'frankfurt': {\n    stadtwerke: 'Mainova',\n    carsharing: ['car2go', 'DriveNow', 'Flinkster'],\n    oepnv: 'RMV Rhein-Main-Verkehrsverbund',\n    internetProvider: ['Telekom', 'Vodafone', 'O2', '1&1'],\n    regionalEnergy: ['Mainova', 'E.ON', 'Süwag']\n  },\n  'stuttgart': {\n    stadtwerke: 'Stadtwerke Stuttgart',\n    carsharing: ['car2go', 'Flinkster', 'Stadtmobil'],\n    oepnv: 'VVS Verkehrs- und Tarifverbund Stuttgart',\n    internetProvider: ['Telekom', 'Vodafone', 'O2', 'EWE'],\n    regionalEnergy: ['EnBW', 'Stadtwerke Stuttgart', 'E.ON']\n  },\n  'hannover': {\n    stadtwerke: 'enercity',\n    carsharing: ['stadtmobil', 'car2go'],\n    oepnv: 'üstra',\n    internetProvider: ['Telekom', 'Vodafone', 'O2', 'EWE'],\n    regionalEnergy: ['enercity', 'E.ON', 'EWE']\n  }\n};\n\n// 🌍 Standort-Erkennung\nasync function getLocationFromIP() {\n  try {\n    console.log('🌍 Ermittle Standort über IP...');\n    \n    const response = await axios.get('http://ip-api.com/json/', {\n      timeout: 3000,\n      params: {\n        fields: 'status,city,regionName,country,query'\n      }\n    });\n    \n    if (response.data.status === 'success' && response.data.country === 'Germany') {\n      const city = response.data.city.toLowerCase();\n      const region = response.data.regionName;\n      \n      console.log(`🏙️ Standort erkannt: ${response.data.city}, ${region}`);\n      \n      const cityMapping = {\n        'berlin': 'berlin',\n        'münchen': 'muenchen',\n        'munich': 'muenchen',\n        'hamburg': 'hamburg',\n        'köln': 'koeln',\n        'cologne': 'koeln',\n        'frankfurt': 'frankfurt',\n        'stuttgart': 'stuttgart',\n        'düsseldorf': 'duesseldorf',\n        'dortmund': 'dortmund',\n        'leipzig': 'leipzig',\n        'hannover': 'hannover'\n      };\n      \n      const mappedCity = cityMapping[city] || null;\n      \n      if (mappedCity && MAJOR_GERMAN_CITIES[mappedCity]) {\n        console.log(`✅ Stadt gefunden: ${mappedCity}`);\n        return {\n          city: mappedCity,\n          cityName: response.data.city,\n          region: region,\n          providers: MAJOR_GERMAN_CITIES[mappedCity],\n          success: true\n        };\n      }\n    }\n    \n    console.log('⚠️ Fallback auf default');\n    return { city: 'default', success: false };\n    \n  } catch (error) {\n    console.warn('❌ Standort-Ermittlung fehlgeschlagen:', error.message);\n    return { city: 'default', success: false };\n  }\n}\n\n// 🌍 Standort-spezifische Query-Erweiterung\nfunction enhanceQueriesWithLocation(baseQueries, location, contractType) {\n  if (!location || !location.success) {\n    return baseQueries;\n  }\n  \n  const enhancedQueries = [...baseQueries];\n  const cityName = location.cityName;\n  const providers = location.providers;\n  \n  // Standort-spezifische Queries\n  if (contractType === 'strom' || contractType === 'gas') {\n    if (providers && providers.regionalEnergy) {\n      enhancedQueries.unshift(\n        `${providers.stadtwerke} ${contractType} tarife ${cityName}`,\n        `${contractType}anbieter ${cityName} vergleich`,\n        `günstige ${contractType}tarife ${cityName}`\n      );\n    }\n  } else if (contractType === 'dsl' || contractType === 'internet') {\n    if (providers && providers.internetProvider) {\n      enhancedQueries.unshift(\n        `internet anbieter ${cityName} vergleich`,\n        `dsl tarife ${cityName}`,\n        `glasfaser ${cityName}`\n      );\n    }\n  } else if (contractType === 'carsharing') {\n    if (providers && providers.carsharing) {\n      enhancedQueries.unshift(\n        `carsharing ${cityName} anbieter`,\n        `auto teilen ${cityName}`,\n        `${providers.carsharing[0]} ${cityName}`\n      );\n    }\n  } else if (contractType === 'oepnv') {\n    if (providers && providers.oepnv) {\n      enhancedQueries.unshift(\n        `${providers.oepnv} monatskarte`,\n        `nahverkehr ${cityName} preise`,\n        `öpnv ticket ${cityName}`\n      );\n    }\n  }\n  \n  console.log(`🌍 ${enhancedQueries.length - baseQueries.length} standort-spezifische Queries hinzugefügt`);\n  return enhancedQueries;\n}\n\n// 🚀 HAUPTROUTE mit verbesserter Validierung UND PARTNER-INTEGRATION
router.post("/", async (req, res) => {
  console.log(`🚀 START better-contracts Route - ${new Date().toISOString()}`);

  try {
    console.log(`📋 Request Body Keys: ${Object.keys(req.body).join(', ')}`);
    console.log(`📋 Request Body: ${JSON.stringify(req.body, null, 2)}`);

    // 🆕 STEP 3: Rate Limiting prüfen
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    console.log(`🌍 Client IP: ${clientIP}`);
    
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
    console.log(`🔍 Input - ContractText Length: ${contractText?.length || 0}, SearchQuery: "${searchQuery || 'empty'}"`);

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
            content: `Du bist ein Experte für Vertragsanalyse. Erkenne den Typ des gegebenen Vertrags. 
            Antworte nur mit einem der folgenden Begriffe: 
            - Versicherungen: rechtsschutz, haftpflicht, kfz, hausrat, wohngebäude, berufsunfähigkeit, krankenversicherung, lebensversicherung, unfallversicherung
            - Energie: strom, gas, ökostrom
            - Telekom: dsl, internet, mobilfunk, handy
            - Finanzen: kredit, girokonto, kreditkarte, baufinanzierung
            - Sonstige: fitness, streaming, hosting, software, ai, saas, solar, unbekannt
            
            WICHTIG: Bei Strom/Energie IMMER "strom" oder "gas" zurückgeben!
            Besondere Aufmerksamkeit für: Anthropic/Claude = ai, OpenAI/ChatGPT = ai, Software-Abos = software, Web-Services = saas`
          },
          {
            role: "user",
            content: `Analysiere diesen Vertrag und erkenne den Typ. Achte besonders auf Anbieter wie Anthropic, OpenAI, Software-Services oder Energie-Verträge:\n\n${cleanContractText.slice(0, 1000)}`
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

    // 🌍 ULTIMATIVE STANDORT-INTEGRATION\n    console.log(`🌍 Starting location detection...`);\n    let userLocation = null;\n    try {\n      userLocation = await getLocationFromIP();\n      if (userLocation && userLocation.success) {\n        console.log(`🏙️ Standort erfolgreich erkannt: ${userLocation.cityName}`);\n        \n        // Erweitere Queries mit standort-spezifischen Suchen\n        const locationEnhancedQueries = enhanceQueriesWithLocation(enhancedQueries, userLocation, detectedType);\n        enhancedQueries.splice(0, enhancedQueries.length, ...locationEnhancedQueries);\n        \n        console.log(`🌍 Queries um ${locationEnhancedQueries.length - enhancedQueries.length} Standort-Queries erweitert`);\n      } else {\n        console.log(`⚠️ Kein spezifischer Standort erkannt, verwende Standard-Queries`);\n      }\n    } catch (locationError) {\n      console.warn(`❌ Standort-Erkennung fehlgeschlagen:`, locationError.message);\n    }\n\n    console.log(`🎯 Final Suchanfragen (${enhancedQueries.length}):`, enhancedQueries.slice(0, 3));

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

    // 🔴🔴🔴 UNIVERSELLE STRENGE FILTERUNG - VERSION 2.0 MIT STROM-FIX 🔴🔴🔴
    console.log(`🔍 Starte UNIVERSELLE strenge Filterung für Typ: ${detectedType}`);
    console.log(`📊 Anzahl Ergebnisse VOR Filterung: ${organicResults.length}`);
    
    // Debug: Zeige die ersten 3 Titel
    organicResults.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i+1}. ${r.title}`);
    });
    
    // 🔴 SCHRITT 1: Erkenne den Versicherungstyp präzise
    let filterType = 'unknown';
    const textLower = cleanContractText.toLowerCase();
    
    // Prüfe explizit auf bekannte Vertragstypen
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
    } else if (textLower.includes('kranken') && textLower.includes('versicherung')) {
      filterType = 'krankenversicherung';
    } else if (textLower.includes('leben') && textLower.includes('versicherung')) {
      filterType = 'lebensversicherung';
    } else if (textLower.includes('wohngebäude')) {
      filterType = 'wohngebaeude';
    } else if (textLower.includes('unfall') && textLower.includes('versicherung')) {
      filterType = 'unfallversicherung';
    } else if (textLower.includes('strom') || detectedType === 'strom') {
      filterType = 'strom';
    } else if (textLower.includes('gas') && !textLower.includes('versicherung')) {
      filterType = 'gas';
    } else if (textLower.includes('dsl') || textLower.includes('internet')) {
      filterType = 'dsl';
    } else if (textLower.includes('handy') || textLower.includes('mobilfunk')) {
      filterType = 'mobilfunk';
    } else if (textLower.includes('fitness') || textLower.includes('gym') || textLower.includes('mcfit')) {
      filterType = 'fitness';
    } else if (textLower.includes('netflix') || textLower.includes('spotify') || 
               textLower.includes('disney') || textLower.includes('streaming')) {
      filterType = 'streaming';
    } else if (textLower.includes('kredit') || textLower.includes('darlehen')) {
      filterType = 'kredit';
    } else if (textLower.includes('girokonto') || textLower.includes('banking')) {
      filterType = 'girokonto';
    } else if (textLower.includes('hosting') || textLower.includes('webspace') || 
               textLower.includes('server')) {
      filterType = 'hosting';
    } else if (textLower.includes('adobe') || textLower.includes('microsoft') || 
               textLower.includes('office') || textLower.includes('software')) {
      filterType = 'software';
    } else {
      // UNIVERSELLER FALLBACK für unbekannte Verträge
      filterType = 'universal';
      console.log(`⚠️ Unbekannter Vertragstyp - verwende universelle Filterung`);
    }
    
    console.log(`🎯 Erkannter Filter-Typ: ${filterType}`);
    
    // 🔴 SCHRITT 2: STRIKTE FILTER-REGELN MIT STROM-FIX (erweitert für ALLE Vertragstypen)
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
      'strom': {
        mustInclude: [], // KEINE Pflicht-Keywords für bessere Ergebnisse
        canInclude: ['strom', 'energie', 'kwh', 'tarif', 'anbieter', 'eon', 'vattenfall', 'enbw', 'stadtwerke', 'ökostrom', 'wechsel', 'vergleich', 'stromauskunft', 'toptarif'],
        mustNotInclude: ['versicherung', 'fitness', 'streaming', 'handy', 'mobilfunk', 'kfz', 'haftpflicht'] // Nur echte Konflikte blockieren
      },
      'gas': {
        mustInclude: [], // Lockere Filterung auch für Gas
        canInclude: ['gas', 'erdgas', 'energie', 'tarif', 'anbieter', 'eon', 'vattenfall', 'stadtwerke', 'wechsel', 'vergleich'],
        mustNotInclude: ['versicherung', 'fitness', 'streaming', 'handy', 'mobilfunk', 'strom']
      },
      'fitness': {
        mustInclude: ['fitness', 'gym', 'sport', 'training'],
        canInclude: ['mcfit', 'fitx', 'clever', 'urban', 'john', 'studio', 'mitglied'],
        mustNotInclude: ['versicherung', 'dsl', 'internet', 'handy', 'strom']
      },
      'streaming': {
        mustInclude: ['streaming', 'netflix', 'spotify', 'disney', 'prime', 'video', 'musik'],
        canInclude: ['abo', 'subscription', 'entertainment', 'filme', 'serien'],
        mustNotInclude: ['versicherung', 'dsl', 'kfz', 'fitness']
      },
      'software': {
        mustInclude: ['software', 'adobe', 'microsoft', 'office', 'cloud', 'saas'],
        canInclude: ['lizenz', 'subscription', 'creative', '365', 'workspace'],
        mustNotInclude: ['versicherung', 'fitness', 'streaming']
      },
      'hosting': {
        mustInclude: ['hosting', 'webspace', 'server', 'domain'],
        canInclude: ['strato', 'ionos', '1und1', 'all-inkl', 'hetzner', 'website'],
        mustNotInclude: ['versicherung', 'fitness', 'streaming']
      },
      'dsl': {
        mustInclude: ['dsl', 'internet', 'breitband'],
        canInclude: ['telekom', 'vodafone', '1und1', 'o2', 'mbit', 'glasfaser'],
        mustNotInclude: ['versicherung', 'fitness', 'streaming']
      },
      'mobilfunk': {
        mustInclude: ['handy', 'mobilfunk', 'smartphone'],
        canInclude: ['telekom', 'vodafone', 'o2', 'tarif', 'prepaid', 'vertrag'],
        mustNotInclude: ['versicherung', 'dsl', 'fitness']
      },
      'kredit': {
        mustInclude: ['kredit', 'darlehen', 'finanzierung'],
        canInclude: ['bank', 'zinsen', 'rate', 'sparkasse', 'ing', 'dkb'],
        mustNotInclude: ['versicherung', 'dsl', 'handy']
      },
      'girokonto': {
        mustInclude: ['girokonto', 'konto', 'banking'],
        canInclude: ['bank', 'sparkasse', 'ing', 'dkb', 'comdirect', 'n26'],
        mustNotInclude: ['versicherung', 'kredit', 'dsl']
      },
      'universal': {
        // Für unbekannte Verträge: Sehr lockere Regeln
        mustInclude: [],
        canInclude: ['vergleich', 'anbieter', 'alternative', 'wechsel', 'günstig', 'sparen'],
        mustNotInclude: ['porn', 'casino', 'betting', 'adult'] // Nur illegale/unerwünschte Inhalte blockieren
      },
      'default': {
        mustInclude: [],
        canInclude: ['vergleich', 'tarif', 'günstig'],
        mustNotInclude: []
      }
    };
    
    const activeFilter = strictFilters[filterType] || strictFilters['universal'];
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
      
      // 🔴 NEU: BLOCKIERE BLOG-SEITEN UND NEWS-PORTALE (MIT ENERGIE-AUSNAHMEN)
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
      
      // Ausnahmen für Energie-Vergleichsseiten
      const energyExceptions = ['stromauskunft.de', 'verivox.de/strom', 'check24.de/strom', 
                               'verivox.de/gas', 'check24.de/gas', 'toptarif.de', 
                               'wechselpiraten.de', 'stromvergleich.de'];
      const isEnergyException = energyExceptions.some(exception => url.includes(exception));
      
      // Prüfe ob es eine Blog/News-Seite ist (aber erlaube Energie-Ausnahmen)
      const isBlogOrNews = blogAndNewsBlocklist.some(domain => url.includes(domain));
      if (isBlogOrNews && !isEnergyException) {
        console.log(`   ❌ BLOCKIERT: Blog/News-Seite`);
        return false;
      }
      
      // Prüfe ob "blog", "artikel", "news", "test", "ratgeber" im URL-Pfad
      if ((url.includes('/blog/') || url.includes('/artikel/') || 
          url.includes('/news/') || url.includes('/magazin/') ||
          url.includes('/ratgeber/')) && !url.includes('finanztip') && !isEnergyException) {
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
      if (blacklistedDomains.some(domain => url.includes(domain)) && filterType !== 'universal' && filterType !== 'strom' && filterType !== 'gas') {
        console.log(`   ❌ BLOCKIERT: Blacklisted Domain`);
        return false;
      }
      
      // 🔴 NEU: UNIVERSELLE POSITIV-LISTE - Je nach Vertragstyp
      const allowedDomainsByType = {
        // Versicherungen
        'versicherung': [
          'check24.de', 'verivox.de', 'tarifcheck.de', 'financescout24.de',
          'huk.de', 'allianz.de', 'axa.de', 'ergo.de', 'cosmosdirekt.de',
          'arag.de', 'roland-rechtsschutz.de', 'adam-riese.de', 'friday.de',
          'getsafe.de', 'nexible.de', 'luko.de', 'wefox.de', 'finanzfluss.de'
        ],
        // Energie (ERWEITERT für Strom/Gas)
        'energie': [
          'check24.de', 'verivox.de', 'stromauskunft.de', 'toptarif.de',
          'eon.de', 'vattenfall.de', 'enbw.de', 'rwe.de', 'stadtwerke',
          'lichtblick.de', 'naturstrom.de', 'greenpeace-energy.de',
          'tibber.com', 'octopusenergy.de', 'stromvergleich.de',
          'wechselpiraten.de', 'stromtipp.de', 'energieverbraucherportal.de',
          'preisvergleich.de', 'strom-gas24.de', 'billiger.de'
        ],
        // Telekommunikation
        'telekom': [
          'check24.de', 'verivox.de', 'dslweb.de', 'toptarif.de',
          'telekom.de', 'vodafone.de', 'o2online.de', '1und1.de',
          'congstar.de', 'klarmobil.de', 'mobilcom-debitel.de'
        ],
        // Fitness
        'fitness': [
          'fitnessstudio-vergleich.de', 'studiovergleich.de',
          'mcfit.com', 'fitx.de', 'clever-fit.com', 'fitness-first.de',
          'johnreed.fitness', 'urban-sports-club.com', 'eversports.de',
          'fitogram.de', 'gympass.com'
        ],
        // Streaming
        'streaming': [
          'netflix.com', 'spotify.com', 'disneyplus.com', 'amazon.de/prime',
          'apple.com', 'dazn.com', 'skyticket.de', 'joyn.de', 'tvnow.de',
          'justwatch.com', 'werstreamt.es'
        ],
        // Software
        'software': [
          'adobe.com', 'microsoft.com', 'office.com', 'google.com/workspace',
          'dropbox.com', 'slack.com', 'zoom.us', 'notion.so', 'canva.com',
          'alternativeto.net', 'capterra.de', 'getapp.de', 'g2.com'
        ],
        // Banking/Kredit
        'banking': [
          'check24.de', 'verivox.de', 'smava.de', 'finanzcheck.de',
          'ing.de', 'dkb.de', 'comdirect.de', 'n26.com', 'sparkasse.de',
          'commerzbank.de', 'deutschebank.de', 'consorsbank.de'
        ],
        // Hosting
        'hosting': [
          'ionos.de', 'strato.de', 'all-inkl.com', 'hetzner.de',
          'netcup.de', 'webgo.de', 'domainfactory.de', 'mittwald.de',
          'hosteurope.de', 'alfahosting.de'
        ]
      };
      
      // Bestimme welche Domain-Liste zu verwenden ist
      let allowedDomains = [];
      
      if (filterType.includes('rechtsschutz') || filterType.includes('haftpflicht') || 
          filterType.includes('kfz') || filterType.includes('hausrat')) {
        allowedDomains = allowedDomainsByType['versicherung'];
      } else if (filterType === 'strom' || filterType === 'gas') {
        allowedDomains = allowedDomainsByType['energie'];
      } else if (filterType === 'dsl' || filterType === 'mobilfunk') {
        allowedDomains = allowedDomainsByType['telekom'];
      } else if (filterType === 'fitness') {
        allowedDomains = allowedDomainsByType['fitness'];
      } else if (filterType === 'streaming') {
        allowedDomains = allowedDomainsByType['streaming'];
      } else if (filterType === 'software') {
        allowedDomains = allowedDomainsByType['software'];
      } else if (filterType === 'kredit' || filterType === 'girokonto') {
        allowedDomains = allowedDomainsByType['banking'];
      } else if (filterType === 'hosting') {
        allowedDomains = allowedDomainsByType['hosting'];
      } else if (filterType === 'universal') {
        // Bei unbekannten Verträgen: Erlaube die wichtigsten Vergleichsportale
        allowedDomains = [
          'check24.de', 'verivox.de', 'tarifcheck.de', 'idealo.de',
          'preisvergleich.de', 'billiger.de', 'guenstiger.de',
          'testberichte.de', 'testsieger.de', 'finanzfluss.de'
        ];
      }
      
      // Anwenden der Domain-Filter NUR bei bekannten Kategorien (NICHT bei Energie!)
      if (filterType !== 'universal' && filterType !== 'strom' && filterType !== 'gas' && allowedDomains.length > 0) {
        const isDomainAllowed = allowedDomains.some(domain => url.includes(domain));
        
        if (!isDomainAllowed) {
          console.log(`   ❌ BLOCKIERT: Nicht in Whitelist für ${filterType}`);
          return false;
        }
      }
      
      // 🔴 ZUSÄTZLICHE PRÜFUNG: Blockiere auch erlaubte Domains wenn es Blog-Artikel sind (NICHT für Energie)
      if (filterType !== 'strom' && filterType !== 'gas') {
        const blogIndicators = [
          '/artikel/', '/blog/', '/news/', '/magazin/', '/ratgeber/',
          '/tipps/', '/guide/', '/beitrag/', '/post/', '/aktuelles/',
          'stiftung-warentest', 'test.de', 'finanztip.de'
        ];
        
        const isBlogArticle = blogIndicators.some(indicator => url.includes(indicator));
        if (isBlogArticle) {
          console.log(`   ❌ BLOCKIERT: Blog/Artikel-Indikator gefunden`);
          return false;
        }
      }
      
      // 🔴 TITEL-PRÜFUNG: Blockiere wenn Titel nach Artikel klingt (NICHT für Energie)
      if (filterType !== 'strom' && filterType !== 'gas' && title.includes('im vergleich') && !title.includes('vergleichen')) {
        // "Versicherungen im Vergleich" = OK (Vergleichstool)
        // "Die besten X im Vergleich" = NICHT OK (Artikel)
        if (title.includes('die besten') || title.includes('top ') || 
            title.includes('testsieger') || title.includes('empfehlung')) {
          console.log(`   ❌ BLOCKIERT: Artikel-Titel erkannt`);
          return false;
        }
      }
      
      if (index < 5) console.log(`   ✅ ERLAUBT`);
      return true;
    });
    
    // 🔴🔴🔴 DEDUPLIZIERUNG - Nur ein Eintrag pro Provider! 🔴🔴🔴
    console.log(`🧹 Starte Deduplizierung...`);
    
    const seenProviders = new Set();
    const deduplicatedResults = [];
    
    for (const result of filteredResults) {
      // Extrahiere Provider aus URL
      const url = (result.link || '').toLowerCase();
      let providerKey = '';
      
      // Identifiziere Provider
      if (url.includes('check24')) providerKey = 'check24';
      else if (url.includes('verivox')) providerKey = 'verivox';
      else if (url.includes('tarifcheck')) providerKey = 'tarifcheck';
      else if (url.includes('finanztip')) providerKey = 'finanztip';
      else if (url.includes('test.de') || url.includes('stiftung-warentest')) providerKey = 'stiftungwarentest';
      else if (url.includes('finanzfluss')) providerKey = 'finanzfluss';
      else if (url.includes('stromauskunft')) providerKey = 'stromauskunft';
      else if (url.includes('toptarif')) providerKey = 'toptarif';
      else if (url.includes('preisvergleich')) providerKey = 'preisvergleich';
      else if (url.includes('strom-gas24')) providerKey = 'strom-gas24';
      else if (url.includes('arag')) providerKey = 'arag';
      else if (url.includes('huk')) providerKey = 'huk';
      else if (url.includes('allianz')) providerKey = 'allianz';
      else if (url.includes('cosmosdirekt')) providerKey = 'cosmosdirekt';
      else providerKey = url; // Für unbekannte: nutze komplette URL
      
      // Prüfe ob Provider schon vorhanden
      if (!seenProviders.has(providerKey)) {
        seenProviders.add(providerKey);
        
        // Bei Vergleichsportalen: Bevorzuge spezifische über generische Links
        const title = (result.title || '').toLowerCase();
        const isSpecific = title.includes(filterType) || title.includes('haftpflicht') || 
                          title.includes('rechtsschutz') || title.includes('hausrat') ||
                          title.includes('kfz') || title.includes('strom') || title.includes('gas');
        
        // Wenn wir schon einen generischen Link haben und jetzt einen spezifischen finden
        const existingIndex = deduplicatedResults.findIndex(r => {
          const rUrl = (r.link || '').toLowerCase();
          return (rUrl.includes(providerKey));
        });
        
        if (existingIndex >= 0 && isSpecific) {
          // Ersetze generischen durch spezifischen
          const existingTitle = (deduplicatedResults[existingIndex].title || '').toLowerCase();
          const existingIsGeneric = existingTitle.includes('versicherungsvergleich') || 
                                   existingTitle.includes('versicherungen im vergleich') ||
                                   existingTitle.includes('vergleich');
          
          if (existingIsGeneric) {
            console.log(`   🔄 Ersetze generischen ${providerKey} Link durch spezifischen`);
            deduplicatedResults[existingIndex] = result;
            continue;
          }
        }
        
        deduplicatedResults.push(result);
        console.log(`   ✅ ${providerKey} hinzugefügt`);
      } else {
        console.log(`   ⭕ ${providerKey} übersprungen (Duplikat)`);
      }
    }
    
    console.log(`🧹 Deduplizierung abgeschlossen: ${filteredResults.length} → ${deduplicatedResults.length}`);
    filteredResults = deduplicatedResults;
    
    // 🔴 SCHRITT 4: Wenn zu wenige Ergebnisse, füge PROFESSIONELLE Fallbacks hinzu
    if (filteredResults.length < 3 && filterType === 'rechtsschutz') {
      console.log(`⚠️ Zu wenige Ergebnisse - füge Rechtsschutz-Fallbacks hinzu`);
      
      const fallbackResults = [
        {
          title: "ARAG SE - Rechtsschutz direkt vom Marktführer",
          link: "https://www.arag.de/rechtsschutzversicherung/",
          snippet: "ARAG - Europas größter Rechtsschutzversicherer. Mehrfacher Testsieger mit über 85 Jahren Erfahrung. Flexible Tarife mit oder ohne Selbstbeteiligung.",
          position: 98,
          provider: 'ARAG'
        },
        {
          title: "ROLAND Rechtsschutz - Spezialist seit 1957",
          link: "https://www.roland-rechtsschutz.de/",
          snippet: "ROLAND Rechtsschutzversicherung - Ihr Spezialist für Rechtsschutz. Schnelle Hilfe im Rechtsfall mit 24/7 Hotline.",
          position: 99,
          provider: 'ROLAND'
        }
      ];
      
      // Nur hinzufügen wenn nicht schon vorhanden
      for (const fallback of fallbackResults) {
        const alreadyExists = filteredResults.some(r => 
          r.link?.includes('arag.de') || r.link?.includes('roland-rechtsschutz')
        );
        if (!alreadyExists) {
          filteredResults.push(fallback);
        }
      }
    } else if (filteredResults.length < 3 && filterType === 'haftpflicht') {
      console.log(`⚠️ Zu wenige Ergebnisse - füge Haftpflicht-Fallbacks hinzu`);
      
      const fallbackResults = [
        {
          title: "HUK-COBURG - Haftpflicht direkt vom Testsieger",
          link: "https://www.huk.de/haftpflichtversicherung/",
          snippet: "Deutschlands Versicherer im Bausparen. Haftpflichtschutz ab 2,87€ monatlich mit Deckungssummen bis 50 Mio. Euro.",
          position: 98,
          provider: 'HUK-COBURG'
        },
        {
          title: "Allianz - Privathaftpflicht online abschließen",
          link: "https://www.allianz.de/haftpflichtversicherung/",
          snippet: "Die Allianz Haftpflichtversicherung schützt Sie weltweit. Flexible Tarife für Singles, Paare und Familien mit ausgezeichnetem Service.",
          position: 99,
          provider: 'Allianz'
        }
      ];
      
      // Nur hinzufügen wenn nicht schon vorhanden
      for (const fallback of fallbackResults) {
        const alreadyExists = filteredResults.some(r => 
          r.link?.includes('huk.de') || r.link?.includes('allianz.de')
        );
        if (!alreadyExists) {
          filteredResults.push(fallback);
        }
      }
    } else if (filteredResults.length < 3 && filterType === 'strom') {
      console.log(`⚠️ Zu wenige Ergebnisse - füge Strom-Fallbacks hinzu`);
      
      const fallbackResults = [
        {
          title: "CHECK24 - Stromvergleich 2024",
          link: "https://www.check24.de/strom/",
          snippet: "Stromvergleich beim Testsieger. Über 1.000 Stromanbieter im Vergleich. Bis zu 850€ sparen mit Sofortbonus.",
          position: 98,
          provider: 'CHECK24'
        },
        {
          title: "Verivox - Stromtarife vergleichen",
          link: "https://www.verivox.de/strom/",
          snippet: "TÜV-geprüfter Stromvergleich. Günstige Tarife mit Preisgarantie. Einfacher Wechsel in 5 Minuten.",
          position: 99,
          provider: 'Verivox'
        }
      ];
      
      // Nur hinzufügen wenn nicht schon vorhanden
      for (const fallback of fallbackResults) {
        const alreadyExists = filteredResults.some(r => 
          r.link?.includes('check24.de/strom') || r.link?.includes('verivox.de/strom')
        );
        if (!alreadyExists) {
          filteredResults.push(fallback);
        }
      }
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

    // 🆕 Enhanced Data Kombinierung mit VERBESSERTER SORTIERUNG UND PREISERKENNUNG
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
        prices: extracted?.prices || [], // NUR echte Preise, KEINE Ersparnisse
        savings: extracted?.savings || [], // Ersparnisse separat
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
        savings: [],
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
- Die "prices" Arrays enthalten NUR echte Preise (was man zahlt).
- Die "savings" Arrays enthalten Ersparnisse/Boni (was man sparen kann).
- Verwechsle NIEMALS Ersparnisse mit Preisen!
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
[Geschätzte monatliche/jährliche Ersparnis basierend auf echten Preisen, nicht auf Ersparnisangaben]`;

    const userPrompt = `**AKTUELLER VERTRAG:**
${cleanContractText}

**GEFUNDENE ALTERNATIVEN:**
${enrichedResults.map((result, i) => `
${i + 1}. ${result.title}
   URL: ${result.link}
   Kurzbeschreibung: ${result.snippet}
   ${result.source === 'partner' ? '⭐ PARTNER-ANGEBOT: Umfassender Vergleich verfügbar' : ''}
   ${result.hasDetailedData ? `
   Gefundene ECHTE PREISE: ${result.prices?.join(', ') || 'Keine Preise gefunden'}
   ERSPARNISSE/BONI: ${result.savings?.join(', ') || 'Keine Angaben'}
   Features: ${result.features?.join(', ') || 'Keine Features gefunden'}
   Vertragsinformationen: ${result.relevantInfo}` : '(Keine detaillierten Daten verfügbar)'}
`).join('\n')}

${partnerCategory ? `
**VERFÜGBARE VERGLEICHSPORTALE:**
${partnerCategory.name} über ${partnerCategory.provider === 'check24' ? 'CHECK24' : 'TarifCheck'}
` : ''}

WICHTIG: Basiere deine Analyse auf den ECHTEN PREISEN (prices Array), nicht auf den Ersparnisangaben (savings Array)!
Die Ersparnisse sind nur Marketingangaben darüber, was man maximal sparen könnte.

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
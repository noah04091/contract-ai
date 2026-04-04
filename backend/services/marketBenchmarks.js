// backend/services/marketBenchmarks.js — Static Market Benchmark Data + Matching
// Deterministic benchmark comparison: no GPT calls, purely rule-based.

// ============================================
// Benchmark Data (4 Contract Types)
// ============================================

const BENCHMARKS = {
  // ---- SaaS / Software-Verträge ----
  saas: {
    label: 'SaaS-Vertrag',
    keywords: ['saas', 'software', 'cloud', 'plattform', 'lizenz', 'nutzungsvertrag', 'subscription'],
    metrics: [
      {
        id: 'sla_uptime',
        label: 'SLA Verfügbarkeit',
        clauseArea: 'warranty',
        searchKeys: ['verfügbarkeit', 'uptime', 'sla', 'availability'],
        unit: '%',
        market: { min: 99.0, typical: 99.5, best: 99.99 },
        direction: 'higher_better',
      },
      {
        id: 'liability_cap',
        label: 'Haftungsgrenze',
        clauseArea: 'liability',
        searchKeys: ['haftung', 'haftungsgrenze', 'haftungsbegrenzung', 'liability'],
        unit: 'EUR',
        market: { min: 5000, typical: 30000, best: 100000 },
        direction: 'higher_better',
      },
      {
        id: 'contract_duration',
        label: 'Mindestlaufzeit',
        clauseArea: 'duration',
        searchKeys: ['laufzeit', 'mindestlaufzeit', 'vertragsdauer'],
        unit: 'Monate',
        market: { min: 1, typical: 12, best: 1 },
        direction: 'lower_better',
      },
      {
        id: 'notice_period',
        label: 'Kündigungsfrist',
        clauseArea: 'termination',
        searchKeys: ['kündigungsfrist', 'kündigung', 'frist'],
        unit: 'Monate',
        market: { min: 1, typical: 3, best: 1 },
        direction: 'lower_better',
      },
      {
        id: 'data_retention',
        label: 'Datenbereitstellung nach Vertragsende',
        clauseArea: 'other',
        searchKeys: ['datenmigration', 'datenbereitstellung', 'download', 'export', 'löschung'],
        unit: 'Tage',
        market: { min: 30, typical: 60, best: 90 },
        direction: 'higher_better',
      },
      {
        id: 'support_response',
        label: 'Support-Reaktionszeit',
        clauseArea: 'other',
        searchKeys: ['reaktionszeit', 'support', 'response'],
        unit: 'Stunden',
        market: { min: 24, typical: 8, best: 1 },
        direction: 'lower_better',
      },
      {
        id: 'price_increase_notice',
        label: 'Preisänderungs-Vorlauf',
        clauseArea: 'payment',
        searchKeys: ['preisanpassung', 'preisänderung', 'preiserhöhung', 'vorlauf'],
        unit: 'Monate',
        market: { min: 1, typical: 3, best: 6 },
        direction: 'higher_better',
      },
    ],
  },

  // ---- Freelancer / Dienstvertrag ----
  freelancer: {
    label: 'Freelancer-Vertrag',
    keywords: ['freelancer', 'freier mitarbeiter', 'dienstvertrag', 'werkvertrag', 'freie mitarbeit', 'auftragnehmer'],
    metrics: [
      {
        id: 'hourly_rate',
        label: 'Stundensatz',
        clauseArea: 'payment',
        searchKeys: ['stundensatz', 'stunde', 'eur/h', 'pro stunde', 'vergütung'],
        unit: 'EUR/h',
        market: { min: 60, typical: 90, best: 150 },
        direction: 'info_only', // Neither better nor worse, just context
      },
      {
        id: 'liability_cap',
        label: 'Haftungsgrenze',
        clauseArea: 'liability',
        searchKeys: ['haftung', 'haftungsgrenze', 'haftungsbegrenzung', 'maximal'],
        unit: 'EUR',
        market: { min: 10000, typical: 50000, best: 100000 },
        direction: 'higher_better',
      },
      {
        id: 'warranty_period',
        label: 'Gewährleistungsfrist',
        clauseArea: 'warranty',
        searchKeys: ['gewährleistung', 'mängelansprüche', 'gewährleistungsfrist'],
        unit: 'Monate',
        market: { min: 6, typical: 12, best: 24 },
        direction: 'higher_better',
      },
      {
        id: 'notice_period',
        label: 'Kündigungsfrist',
        clauseArea: 'termination',
        searchKeys: ['kündigungsfrist', 'kündigung', 'frist'],
        unit: 'Wochen',
        market: { min: 2, typical: 4, best: 2 },
        direction: 'lower_better',
      },
      {
        id: 'payment_terms',
        label: 'Zahlungsziel',
        clauseArea: 'payment',
        searchKeys: ['zahlungsziel', 'zahlbar', 'zahlungsfrist', 'tagen'],
        unit: 'Tage',
        market: { min: 7, typical: 14, best: 7 },
        direction: 'lower_better',
      },
      {
        id: 'confidentiality_duration',
        label: 'Geheimhaltungsdauer nach Vertragsende',
        clauseArea: 'confidentiality',
        searchKeys: ['geheimhaltung', 'geheimhaltungsdauer', 'vertraulichkeit', 'stillschweigen'],
        unit: 'Jahre',
        market: { min: 1, typical: 2, best: 5 },
        direction: 'higher_better',
      },
    ],
  },

  // ---- NDA / Geheimhaltungsvereinbarung ----
  nda: {
    label: 'Geheimhaltungsvereinbarung (NDA)',
    keywords: ['nda', 'geheimhaltung', 'vertraulichkeit', 'geheimhaltungsvereinbarung', 'vertraulichkeitsvereinbarung'],
    metrics: [
      {
        id: 'confidentiality_duration',
        label: 'Geheimhaltungsdauer',
        clauseArea: 'confidentiality',
        searchKeys: ['geheimhaltungsdauer', 'dauer', 'jahre', 'offenlegung'],
        unit: 'Jahre',
        market: { min: 2, typical: 3, best: 5 },
        direction: 'higher_better',
      },
      {
        id: 'penalty',
        label: 'Vertragsstrafe',
        clauseArea: 'liability',
        searchKeys: ['vertragsstrafe', 'strafe', 'verstoss', 'verstoß'],
        unit: 'EUR',
        market: { min: 5000, typical: 25000, best: 50000 },
        direction: 'higher_better',
      },
      {
        id: 'liability_cap',
        label: 'Haftungsobergrenze',
        clauseArea: 'liability',
        searchKeys: ['haftung', 'haftungsgrenze', 'maximal', 'begrenzt'],
        unit: 'EUR',
        market: { min: 25000, typical: 100000, best: 250000 },
        direction: 'higher_better',
      },
      {
        id: 'contract_duration',
        label: 'Vertragslaufzeit',
        clauseArea: 'duration',
        searchKeys: ['laufzeit', 'monate', 'vertragsdauer'],
        unit: 'Monate',
        market: { min: 12, typical: 24, best: 12 },
        direction: 'info_only',
      },
      {
        id: 'notice_period',
        label: 'Kündigungsfrist',
        clauseArea: 'termination',
        searchKeys: ['kündigungsfrist', 'kündigung', 'frist'],
        unit: 'Monate',
        market: { min: 1, typical: 3, best: 1 },
        direction: 'lower_better',
      },
    ],
  },

  // ---- Mietvertrag ----
  mietvertrag: {
    label: 'Wohnraummietvertrag',
    keywords: ['mietvertrag', 'miete', 'wohnraum', 'mietverhältnis', 'vermieter', 'mieter', 'wohnung'],
    metrics: [
      {
        id: 'deposit',
        label: 'Kaution',
        clauseArea: 'payment',
        searchKeys: ['kaution', 'mietkaution', 'sicherheit'],
        unit: 'Kaltmieten',
        market: { min: 1, typical: 2, best: 1 },
        direction: 'lower_better',
      },
      {
        id: 'notice_period',
        label: 'Kündigungsfrist',
        clauseArea: 'termination',
        searchKeys: ['kündigungsfrist', 'kündigung', 'frist'],
        unit: 'Monate',
        market: { min: 3, typical: 3, best: 3 },
        direction: 'info_only',
      },
      {
        id: 'rent_increase_cap',
        label: 'Kappungsgrenze Mieterhöhung',
        clauseArea: 'payment',
        searchKeys: ['kappungsgrenze', 'mieterhöhung', 'mieterhoehung', 'mietanpassung'],
        unit: '%',
        market: { min: 15, typical: 15, best: 20 },
        direction: 'lower_better',
      },
      {
        id: 'small_repair_limit',
        label: 'Kleinreparatur-Obergrenze',
        clauseArea: 'liability',
        searchKeys: ['kleinreparatur', 'kleine instandhaltung', 'einzelfall', 'reparatur'],
        unit: 'EUR',
        market: { min: 75, typical: 100, best: 75 },
        direction: 'lower_better',
      },
      {
        id: 'utility_payment',
        label: 'Nebenkostenregelung',
        clauseArea: 'payment',
        searchKeys: ['nebenkosten', 'betriebskosten', 'nebenkostenpauschale', 'nebenkostenvorauszahlung'],
        unit: 'Typ',
        market: { min: null, typical: 'Vorauszahlung mit Abrechnung', best: 'Vorauszahlung mit Abrechnung' },
        direction: 'info_only',
      },
    ],
  },

  // ---- Factoring-Vertrag ----
  factoring: {
    label: 'Factoring-Vertrag',
    keywords: ['factoring', 'factor', 'forderungsankauf', 'forderungsabtretung', 'delkredere', 'ankauflimit', 'factoringkunde', 'debitor', 'forderungskauf', 'zession', 'grenke', 'inkasso', 'globalzession', 'echtes factoring', 'unechtes factoring'],
    metrics: [
      {
        id: 'factoring_fee',
        label: 'Flatrate-Gebühr',
        clauseArea: 'payment',
        searchKeys: ['flatrate', 'gebühr', 'factoringgebühr', 'provision', 'prozent'],
        unit: '%',
        market: { min: 1.5, typical: 2.5, best: 1.0 },
        direction: 'lower_better',
      },
      {
        id: 'purchase_limit',
        label: 'Ankauflimit',
        clauseArea: 'payment',
        searchKeys: ['ankauflimit', 'limit', 'ankaufrahmen', 'rahmen'],
        unit: 'EUR',
        market: { min: 10000, typical: 50000, best: 200000 },
        direction: 'higher_better',
      },
      {
        id: 'debtor_limit',
        label: 'Einzeldebitorlimit',
        clauseArea: 'payment',
        searchKeys: ['debitorenlimit', 'limit je debitor', 'einzellimit', 'einzeldebitor', 'debitorlimit'],
        unit: 'EUR',
        market: { min: 5000, typical: 20000, best: 100000 },
        direction: 'higher_better',
      },
      {
        id: 'notice_period',
        label: 'Kündigungsfrist',
        clauseArea: 'termination',
        searchKeys: ['kündigungsfrist', 'kündigung', 'frist'],
        unit: 'Monate',
        market: { min: 1, typical: 3, best: 1 },
        direction: 'lower_better',
      },
      {
        id: 'security_retention',
        label: 'Sicherungseinbehalt',
        clauseArea: 'payment',
        searchKeys: ['sicherungseinbehalt', 'einbehalt', 'sicherheit', 'retention'],
        unit: '%',
        market: { min: 5, typical: 10, best: 5 },
        direction: 'lower_better',
      },
      {
        id: 'deductible',
        label: 'Selbstbehalt (Delkredere)',
        clauseArea: 'liability',
        searchKeys: ['selbstbehalt', 'delkredere', 'eigenanteil', 'forderungsausfall'],
        unit: 'EUR/Jahr',
        market: { min: 500, typical: 1000, best: 0 },
        direction: 'lower_better',
      },
      {
        id: 'inkasso_fee',
        label: 'Inkasso-Gebühr',
        clauseArea: 'payment',
        searchKeys: ['inkasso', 'mahnwesen', 'inkassogebühr', 'beitreibung'],
        unit: '%',
        market: { min: 0.5, typical: 0.7, best: 0.3 },
        direction: 'lower_better',
      },
    ],
  },
};

// ============================================
// Contract Type Detection
// ============================================

function detectContractType(contractMap1, contractMap2) {
  const text = [
    contractMap1.contractType || '',
    contractMap2.contractType || '',
    contractMap1.subject || '',
    contractMap2.subject || '',
    ...(contractMap1.clauses || []).map(c => `${c.title || ''} ${c.summary || ''}`),
    ...(contractMap2.clauses || []).map(c => `${c.title || ''} ${c.summary || ''}`),
  ].join(' ').toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const [type, config] of Object.entries(BENCHMARKS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = type;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

// ============================================
// Value Extraction from Phase A Maps
// ============================================

function extractValuesForMetric(metric, clauses) {
  const results = [];
  const primaryKey = metric.searchKeys[0]; // e.g., 'flatrate', 'selbstbehalt', 'inkasso'
  let primaryKeyFoundButUnextractable = false;

  for (const clause of clauses) {
    // Check if any searchKey appears in title, summary, or originalText
    const textToSearch = [
      clause.title || '',
      clause.summary || '',
      clause.originalText || '',
      ...Object.keys(clause.keyValues || {}),
      ...Object.values(clause.keyValues || {}).map(v => String(v)),
    ].join(' ').toLowerCase();

    // V3.1: Two-tier matching — primary keyword vs secondary keywords
    const hasPrimaryKey = textToSearch.includes(primaryKey);
    const hasSecondaryKey = metric.searchKeys.slice(1).some(k => textToSearch.includes(k));

    // Only accept secondary matches if the clause ALSO contains the primary keyword
    // This prevents "Inkasso-Gebühr" clause from providing values for "Flatrate-Gebühr"
    // (both contain "gebühr" but only Flatrate clause contains "flatrate")
    if (!hasPrimaryKey && !hasSecondaryKey) continue;
    if (!hasPrimaryKey && hasSecondaryKey) {
      // Secondary keyword matches but primary doesn't — skip this clause
      // unless the clause area matches (allows area-specific fallback)
      if (clause.area !== metric.clauseArea) continue;
    }

    // Extract numeric values from keyValues
    if (clause.keyValues && typeof clause.keyValues === 'object') {
      for (const [key, value] of Object.entries(clause.keyValues)) {
        const keyLower = key.toLowerCase();
        const valueLower = String(value).toLowerCase();

        // V3.1: Strict key matching — the key name must contain the primary keyword
        // OR the metric label's main word
        const keyHasPrimary = keyLower.includes(primaryKey);
        const labelMainWord = metric.label.toLowerCase().split(' ')[0];
        const keyHasLabel = keyLower.includes(labelMainWord) ||
          metric.label.toLowerCase().split(' ').some(w => w.length > 4 && keyLower.includes(w));

        // Also check if value is "not extractable" — track this to prevent fallback
        if ((keyHasPrimary || keyHasLabel) && valueLower.includes('nicht extrahierbar')) {
          primaryKeyFoundButUnextractable = true;
          continue;
        }

        if (keyHasPrimary || keyHasLabel) {
          const num = extractNumberFromText(String(value));
          if (num !== null && isPlausibleValue(num, metric)) {
            // V3.1: Cross-metric contamination check — reject if key contains
            // a DIFFERENT metric's primary keyword (e.g., "Inkasso" key for Flatrate metric)
            const otherMetricPrimaries = ['flatrate', 'inkasso', 'selbstbehalt', 'ankauflimit',
              'sicherungseinbehalt', 'kündigungsfrist', 'limitprüfung', 'einrichtung', 'mindestgebühr'];
            const contaminated = otherMetricPrimaries.some(other =>
              other !== primaryKey && keyLower.includes(other)
            );
            if (contaminated) {
              console.log(`📊 Benchmark: Kreuz-Metrik Kontamination: "${key}" enthält fremdes Keyword — übersprungen für "${metric.label}"`);
              continue;
            }

            results.push({ value: num, source: `${clause.section}: ${key}`, rawText: String(value) });
          }
        }
      }
    }

    // V3.1: Only fall back to summary/originalText if:
    // 1. No keyValues results found
    // 2. Primary keyword found in clause
    // 3. The value was NOT marked as "nicht extrahierbar" (prevent wrong fallback)
    if (results.length === 0 && hasPrimaryKey && !primaryKeyFoundButUnextractable) {
      const textsToCheck = [clause.summary || '', clause.originalText || ''];
      for (const text of textsToCheck) {
        // V3.1: Unit-aware extraction — only extract if the unit context matches
        const num = extractNumberWithUnit(text, metric.unit);
        if (num !== null && isPlausibleValue(num, metric)) {
          results.push({ value: num, source: clause.section, rawText: text.substring(0, 100) });
          break;
        }
      }
    }
  }

  if (results.length > 0) {
    console.log(`📊 Benchmark: "${metric.label}" → ${results.length} Wert(e) gefunden: ${results.map(r => `${r.value} (${r.source})`).join(', ')}`);
  } else {
    console.log(`📊 Benchmark: "${metric.label}" → Kein Wert gefunden${primaryKeyFoundButUnextractable ? ' (Primär-Key gefunden aber nicht extrahierbar)' : ''}`);
  }

  return results;
}

/**
 * Sanity check: Is this value plausible for this metric?
 * Prevents obviously wrong extractions (e.g., Ankauflimit = 0.7 EUR)
 */
function isPlausibleValue(value, metric) {
  if (value === null || value === undefined) return false;
  if (value < 0) return false;

  // Unit-based hard limits (normalize unit for matching)
  const u = metric.unit || '';
  if (u.includes('%') && value > 100) return false;
  if (u.includes('EUR') && value < 1) return false;
  if (u.includes('Monate') && value > 120) return false;
  if (u.includes('Jahre') && value > 50) return false;
  if (u.includes('Tage') && value > 365) return false;

  const { min, best } = metric.market;
  if (typeof min !== 'number') return true; // Can't validate non-numeric markets

  // Allow values within a reasonable range: 0.1x to 10x of the market range
  const lowerBound = Math.min(min, best) * 0.1;
  const upperBound = Math.max(min, best) * 10;

  if (value < lowerBound || value > upperBound) {
    console.log(`📊 Benchmark: Wert ${value} für "${metric.label}" unplausibel (erwartet ${lowerBound}–${upperBound}) — übersprungen`);
    return false;
  }

  return true;
}

/**
 * Unit-aware number extraction — only extracts numbers with matching unit context.
 * Prevents extracting "90" from random text when looking for EUR amounts.
 */
function extractNumberWithUnit(text, unit) {
  if (!text || typeof text !== 'string') return null;

  // Normalize unit for pattern lookup (e.g., "EUR/Jahr" → "EUR")
  const baseUnit = unit.includes('EUR') ? 'EUR' : unit.includes('%') ? '%' : unit;

  const unitPatterns = {
    '%': [/(\d+(?:,\d+)?)\s*%/g],
    'EUR': [/(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(?:eur|€)/gi],
    'Monate': [
      /(\d+(?:,\d+)?)\s*(?:monat|monate|monaten)/gi,
      /(\d+(?:,\d+)?)\s*(?:jahr|jahre|jahren)/gi,
    ],
    'Jahre': [/(\d+(?:,\d+)?)\s*(?:jahr|jahre|jahren)/gi],
    'Tage': [/(\d+(?:,\d+)?)\s*(?:tag|tage|tagen|werktag|werktage)/gi],
  };

  const patterns = unitPatterns[baseUnit];
  if (!patterns) return extractNumberFromText(text); // unknown unit → fallback

  // Collect ALL matches, return the largest (most likely the actual value, not a sub-clause number)
  const values = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(num) && num > 0) values.push(num);
    }
  }

  if (values.length === 0) return null;
  // For EUR: return the largest (5000 > 90)
  // For %: return the first match (usually the most relevant)
  return unit === 'EUR' ? Math.max(...values) : values[0];
}

function extractNumberFromText(text) {
  if (!text || typeof text !== 'string') return null;

  // Try patterns: "25.000 EUR", "99,5%", "12 Monate", "3 Jahre", "14 Tagen", "4 Wochen"
  const patterns = [
    /(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(?:eur|€)/i,           // EUR amounts
    /(\d+(?:,\d+)?)\s*%/,                                      // Percentages
    /(\d+(?:,\d+)?)\s*(?:monat|monate|monaten)/i,             // Months
    /(\d+(?:,\d+)?)\s*(?:jahr|jahre|jahren)/i,                // Years (convert to months for some metrics)
    /(\d+(?:,\d+)?)\s*(?:tag|tage|tagen|werktag)/i,           // Days
    /(\d+(?:,\d+)?)\s*(?:woche|wochen)/i,                     // Weeks
    /(\d+(?:,\d+)?)\s*(?:stunde|stunden|h\b)/i,               // Hours
    /(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/,                         // Generic number (last resort)
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
    }
  }

  return null;
}

// ============================================
// Benchmark Assessment
// ============================================

function assessValue(value, metric) {
  if (value === null || value === undefined) return null;
  const { min, typical, best } = metric.market;

  if (typeof min !== 'number' || typeof typical !== 'number') {
    return { rating: 'info', label: 'Marktvergleich', marketTypical: typical };
  }

  if (metric.direction === 'info_only') {
    return {
      rating: 'info',
      label: 'Marktvergleich',
      marketTypical: typical,
      marketRange: `${min}–${best}`,
    };
  }

  // higher_better: best > typical > min (e.g., Haftungsgrenze: min=5000, typical=30000, best=100000)
  if (metric.direction === 'higher_better') {
    if (value >= typical * 1.1) return { rating: 'above', label: 'Über Marktstandard', marketTypical: typical };
    if (value >= min) return { rating: 'standard', label: 'Marktüblich', marketTypical: typical };
    return { rating: 'below', label: 'Unter Marktstandard', marketTypical: typical };
  }

  // lower_better: best < typical < min (e.g., Flatrate-Gebühr: best=1.0, typical=2.5, min=1.5)
  // Note: "min" here means worst common value, "best" is the optimal value
  if (metric.direction === 'lower_better') {
    if (value <= typical * 0.9) return { rating: 'above', label: 'Über Marktstandard', marketTypical: typical };
    if (value <= min) return { rating: 'standard', label: 'Marktüblich', marketTypical: typical };
    return { rating: 'below', label: 'Unter Marktstandard', marketTypical: typical };
  }

  return null;
}

// ============================================
// Main: Run Benchmark Comparison
// ============================================

function runBenchmarkComparison(contractMap1, contractMap2, differences) {
  const contractType = detectContractType(contractMap1, contractMap2);

  if (!contractType) {
    console.log('📊 Benchmark: Vertragstyp nicht erkannt — überspringe Marktvergleich');
    return { contractType: null, benchmarks: [], enrichedDifferences: differences };
  }

  const config = BENCHMARKS[contractType];
  console.log(`📊 Benchmark: Vertragstyp "${config.label}" erkannt — prüfe ${config.metrics.length} Metriken`);

  const benchmarkResults = [];
  const clauses1 = contractMap1.clauses || [];
  const clauses2 = contractMap2.clauses || [];

  for (const metric of config.metrics) {
    const values1 = extractValuesForMetric(metric, clauses1);
    const values2 = extractValuesForMetric(metric, clauses2);

    // Pick the value closest to market typical (most likely the correct one)
    const pickBest = (values) => {
      if (values.length === 0) return null;
      if (values.length === 1) return values[0];
      return values.reduce((best, curr) =>
        Math.abs(curr.value - metric.market.typical) < Math.abs(best.value - metric.market.typical) ? curr : best
      );
    };
    const v1 = pickBest(values1);
    const v2 = pickBest(values2);

    // Debug: log what was extracted
    if (v1 || v2) {
      console.log(`📊 ${metric.label}: V1=${v1 ? `${v1.value} (${v1.source})` : 'n/a'}, V2=${v2 ? `${v2.value} (${v2.source})` : 'n/a'}`);
    }

    if (!v1 && !v2) continue; // No data for this metric

    const assessment1 = v1 ? assessValue(v1.value, metric) : null;
    const assessment2 = v2 ? assessValue(v2.value, metric) : null;

    if (!assessment1 && !assessment2) continue;

    const result = {
      metricId: metric.id,
      label: metric.label,
      unit: metric.unit,
      clauseArea: metric.clauseArea,
      contract1: v1 ? { value: v1.value, source: v1.source, assessment: assessment1 } : null,
      contract2: v2 ? { value: v2.value, source: v2.source, assessment: assessment2 } : null,
      marketTypical: metric.market.typical,
      marketRange: `${metric.market.min}–${metric.market.best}`,
      direction: metric.direction,
    };

    benchmarkResults.push(result);

    // Enrich corresponding difference with marketContext
    const matchingDiff = differences.find(d =>
      d.clauseArea === metric.clauseArea ||
      d.category?.toLowerCase().includes(metric.label.toLowerCase().split(' ')[0])
    );

    if (matchingDiff && !matchingDiff.marketContext) {
      const better = assessment1 && assessment2
        ? (assessment1.rating === 'above' ? 'Vertrag 1' : assessment2?.rating === 'above' ? 'Vertrag 2' : null)
        : null;

      const contextParts = [];
      if (v1) contextParts.push(`Vertrag 1: ${v1.value} ${metric.unit}`);
      if (v2) contextParts.push(`Vertrag 2: ${v2.value} ${metric.unit}`);
      contextParts.push(`Marktüblich: ${metric.market.typical} ${metric.unit}`);
      if (better) contextParts.push(`${better} liegt über Marktstandard`);

      matchingDiff.marketContext = contextParts.join(' | ');
    }
  }

  if (benchmarkResults.length > 0) {
    console.log(`📊 Benchmark: ${benchmarkResults.length} Metriken gematcht`);
    benchmarkResults.forEach(b => {
      const v1Label = b.contract1 ? `V1=${b.contract1.value}${b.unit}(${b.contract1.assessment?.label})` : 'V1=n/a';
      const v2Label = b.contract2 ? `V2=${b.contract2.value}${b.unit}(${b.contract2.assessment?.label})` : 'V2=n/a';
      console.log(`   → ${b.label}: ${v1Label}, ${v2Label}, Markt=${b.marketTypical}${b.unit}`);
    });
  }

  return {
    contractType,
    contractTypeLabel: config.label,
    benchmarks: benchmarkResults,
    enrichedDifferences: differences,
  };
}

// ============================================
// Exports
// ============================================

module.exports = {
  runBenchmarkComparison,
  detectContractType,
  BENCHMARKS,
};

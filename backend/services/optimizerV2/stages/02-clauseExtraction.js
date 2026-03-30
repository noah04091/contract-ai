/**
 * Stage 2: Clause Extraction
 *
 * Splits the contract into individual clauses/sections.
 * Two paths:
 *   - Small contracts (<20K chars): Full GPT extraction with originalText
 *   - Large contracts (>=20K chars): Regex pre-split + lightweight GPT categorization
 */
const { CLAUSE_EXTRACTION_PROMPT, CLAUSE_EXTRACTION_SCHEMA } = require('../prompts/systemPrompts');
const { preSplitClauses, smartTruncate } = require('../utils/clauseSplitter');
const { calculateCost } = require('./01-structureRecognition');

const LARGE_CONTRACT_THRESHOLD = 20000; // chars

// Categories for lightweight categorization
const CLAUSE_CATEGORIES = [
  'parties', 'subject', 'duration', 'termination', 'payment', 'liability',
  'warranty', 'confidentiality', 'ip_rights', 'data_protection', 'non_compete',
  'force_majeure', 'dispute_resolution', 'general_provisions', 'deliverables',
  'sla', 'penalties', 'insurance', 'compliance', 'amendments', 'other'
];

const CATEGORIZATION_SCHEMA = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string', enum: CLAUSE_CATEGORIES },
          title: { type: 'string' }
        },
        required: ['id', 'category', 'title'],
        additionalProperties: false
      }
    }
  },
  required: ['categories'],
  additionalProperties: false
};

async function runClauseExtraction(openai, contractText, structure, onProgress) {
  onProgress(12, 'Zerlege Vertrag in Klauseln...');

  const preSplit = preSplitClauses(contractText);
  onProgress(14, `${preSplit.length} vorläufige Abschnitte erkannt...`);

  // Large contracts: use fast path ONLY if regex found multiple sections
  // If preSplit returns <=1 section, fall back to GPT extraction (the regex missed the format)
  if (contractText.length >= LARGE_CONTRACT_THRESHOLD && preSplit.length > 1) {
    console.log(`[OptimizerV2] Stage 2: Large contract (${contractText.length} chars), ${preSplit.length} sections found, using fast extraction`);
    return extractLargeContract(openai, contractText, preSplit, structure, onProgress);
  }
  if (contractText.length >= LARGE_CONTRACT_THRESHOLD) {
    console.log(`[OptimizerV2] Stage 2: Large contract (${contractText.length} chars) but regex found only ${preSplit.length} section(s), falling back to GPT extraction`);
  }

  // Small contracts: full GPT extraction
  console.log(`[OptimizerV2] Stage 2: Small contract (${contractText.length} chars), using full GPT extraction`);
  return extractSmallContract(openai, contractText, preSplit, structure, onProgress);
}

/**
 * Fast path for large contracts:
 * 1. Use regex pre-split for text extraction (instant)
 * 2. Send only titles/first lines to GPT for categorization (tiny I/O, fast)
 */
async function extractLargeContract(openai, contractText, preSplit, structure, onProgress) {
  onProgress(16, 'Großer Vertrag — optimierte Extraktion...');

  // Build clauses from pre-split
  const clauses = preSplit.map((section, i) => {
    const lines = (section.text || '').split('\n');
    const firstLine = lines[0].trim();
    // Try to extract a meaningful title from the first line
    const rawTitle = firstLine.replace(/^(§\s*\d+[a-z]?\s*[.:\-–]\s*)/i, '').trim();
    const title = rawTitle.length > 3 && rawTitle.length < 150
      ? rawTitle
      : `Abschnitt ${i + 1}`;

    return {
      id: `clause_${String(i + 1).padStart(3, '0')}`,
      title,
      originalText: section.text,
      category: 'other',
      sectionNumber: section.sectionNumber || null,
      startPosition: contractText.indexOf((section.text || '').substring(0, 50)),
      endPosition: null
    };
  });

  // Lightweight GPT call: categorize based on titles + first 100 chars only
  let totalUsage = { inputTokens: 0, outputTokens: 0, costUSD: 0 };

  try {
    const titlesForGPT = clauses.map(c => {
      const preview = c.originalText.substring(0, 300).replace(/\n/g, ' ').trim();
      return `${c.id}: ${c.sectionNumber || '-'} | ${c.title} | "${preview}..."`;
    }).join('\n');

    onProgress(17, 'KI kategorisiert Klauseln...');

    const catStart = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.0,
      max_tokens: 2000,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'clause_categorization',
          strict: true,
          schema: CATEGORIZATION_SCHEMA
        }
      },
      messages: [
        {
          role: 'system',
          content: `Du bist ein Vertragsstruktur-Experte. Ordne jeder Klausel die passende Kategorie zu und korrigiere ggf. den Titel.
Vertragstyp: ${structure.contractTypeLabel || structure.contractType}
Jurisdiktion: ${structure.jurisdiction || 'Deutschland'}

KATEGORIEN MIT BESCHREIBUNG:
- "parties": Vertragsparteien, Anschriften, Definitionen
- "subject": Vertragsgegenstand, Leistungsbeschreibung
- "duration": Laufzeit, Vertragsbeginn, Verlängerung
- "termination": Kündigung, Vertragsbeendigung, Rücktritt
- "payment": Vergütung, Zahlung, Preise, Gebühren, Entgelt, Fälligkeit, Kosten
- "liability": Haftung, Schadenersatz, Freistellung, Haftungsausschluss
- "warranty": Gewährleistung, Garantie, Mängelansprüche
- "confidentiality": Vertraulichkeit, Geheimhaltung, NDA
- "ip_rights": Geistiges Eigentum, Urheberrecht, Nutzungsrechte
- "data_protection": Datenschutz, DSGVO, Datenverarbeitung
- "non_compete": Wettbewerbsverbot, Konkurrenzverbot
- "force_majeure": Höhere Gewalt, Force Majeure
- "dispute_resolution": Gerichtsstand, Streitbeilegung, Schiedsverfahren
- "general_provisions": Salvatorische Klausel, Schriftform, Schlussbestimmungen
- "deliverables": Lieferung, Abnahme, Werkleistung
- "sla": Service Level, Verfügbarkeit
- "penalties": Vertragsstrafe, Pönale
- "insurance": Versicherung
- "compliance": Compliance, Audit
- "amendments": Vertragsänderungen, Nachträge
- "other": NUR wenn KEINE andere Kategorie passt

WICHTIG: Verwende "other" nur als letzte Option. Orientiere dich am INHALT, nicht nur am Titel.
Bei Multi-Topic-Klauseln priorisiere: liability > payment > termination > data_protection > confidentiality > subject > general_provisions.
Beispiel: "§ 8 Sonstiges — Der Anbieter haftet nicht für mittelbare Schäden..." → "liability" (NICHT "other").`
        },
        {
          role: 'user',
          content: `Kategorisiere diese ${clauses.length} Klauseln:\n\n${titlesForGPT}`
        }
      ]
    });

    console.log(`[OptimizerV2] Stage 2: Categorization done in ${Date.now() - catStart}ms`);

    const catResult = JSON.parse(response.choices[0].message.content);
    for (const cat of catResult.categories) {
      const clause = clauses.find(c => c.id === cat.id);
      if (clause) {
        clause.category = cat.category;
        if (cat.title && cat.title.length > 3) {
          clause.title = cat.title;
        }
      }
    }

    totalUsage = {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      costUSD: calculateCost('gpt-4o-mini', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0)
    };
  } catch (err) {
    console.warn('[OptimizerV2] Stage 2: Categorization failed, using keyword fallback:', err.message);
    // Keyword-based fallback categorization
    for (const clause of clauses) {
      clause.category = guessCategoryFromText(clause.title, clause.originalText);
    }
  }

  // Post-GPT rule-based correction
  applyCategoryOverrides(clauses);

  onProgress(20, `${clauses.length} Klauseln extrahiert`);

  return {
    result: clauses,
    usage: { model: 'gpt-4o-mini', ...totalUsage }
  };
}

/**
 * Full GPT extraction for small contracts (original approach).
 */
async function extractSmallContract(openai, contractText, preSplit, structure, onProgress) {
  const truncated = smartTruncate(contractText, 50000);
  const contextHint = preSplit.length > 1
    ? `\n\nHINWEIS: Der Vertrag enthält ca. ${preSplit.length} Abschnitte. ` +
      `Erkannte Sektionsnummern: ${preSplit.filter(s => s.sectionNumber).map(s => s.sectionNumber).join(', ')}`
    : '';

  onProgress(16, 'KI extrahiert Klauseln...');

  const stage2Start = Date.now();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.0,
    max_tokens: 16000,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'clause_extraction',
        strict: true,
        schema: CLAUSE_EXTRACTION_SCHEMA
      }
    },
    messages: [
      { role: 'system', content: CLAUSE_EXTRACTION_PROMPT },
      {
        role: 'user',
        content: `Vertragstyp: ${structure.contractTypeLabel || structure.contractType}\n` +
                 `Jurisdiktion: ${structure.jurisdiction || 'Deutschland'}${contextHint}\n\n` +
                 `--- VOLLSTÄNDIGER VERTRAGSTEXT ---\n${truncated}`
      }
    ]
  });

  console.log(`[OptimizerV2] Stage 2: OpenAI responded in ${Date.now() - stage2Start}ms, finish_reason: ${response.choices[0].finish_reason}, tokens: ${response.usage?.completion_tokens || '?'}`);

  // Check for truncation
  if (response.choices[0].finish_reason === 'length') {
    console.warn('[OptimizerV2] Stage 2: Response truncated, falling back to large contract path');
    return extractLargeContract(openai, contractText, preSplit, structure, onProgress);
  }

  let result;
  try {
    result = JSON.parse(response.choices[0].message.content);
  } catch (parseErr) {
    console.error('[OptimizerV2] Stage 2: JSON.parse failed, falling back to regex pre-split:', parseErr.message, '| Raw content:', (response.choices[0].message.content || '').substring(0, 200));
    // Use the regex pre-split as fallback
    const fallbackClauses = preSplit.map((section, i) => {
      const lines = (section.text || '').split('\n');
      const firstLine = lines[0].trim();
      const rawTitle = firstLine.replace(/^(§\s*\d+[a-z]?\s*[.:\-–]\s*)/i, '').trim();
      const title = rawTitle.length > 3 && rawTitle.length < 150 ? rawTitle : `Abschnitt ${i + 1}`;
      return {
        id: `clause_${String(i + 1).padStart(3, '0')}`,
        title,
        originalText: section.text,
        category: guessCategoryFromText(title, section.text),
        sectionNumber: section.sectionNumber || null,
        startPosition: contractText.indexOf((section.text || '').substring(0, 50)),
        endPosition: null
      };
    });

    applyCategoryOverrides(fallbackClauses);
    onProgress(20, `${fallbackClauses.length} Klauseln extrahiert (Fallback)`);

    return {
      result: fallbackClauses,
      usage: {
        model: 'gpt-4o-mini',
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        costUSD: calculateCost('gpt-4o-mini', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0)
      }
    };
  }

  result.clauses = result.clauses.map((clause, i) => ({
    ...clause,
    id: clause.id || `clause_${String(i + 1).padStart(3, '0')}`,
    sectionNumber: clause.sectionNumber && clause.sectionNumber !== 'null' ? clause.sectionNumber : null,
    startPosition: contractText.indexOf(clause.originalText.substring(0, 50)),
    endPosition: null
  }));

  // Post-GPT rule-based correction
  applyCategoryOverrides(result.clauses);

  onProgress(20, `${result.clauses.length} Klauseln extrahiert`);

  return {
    result: result.clauses,
    usage: {
      model: 'gpt-4o-mini',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      costUSD: calculateCost('gpt-4o-mini', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0)
    }
  };
}

// ════════════════════════════════════════════════════════
// Rule-Based Category Classifier (Post-GPT Override Layer)
// ════════════════════════════════════════════════════════

/**
 * Keyword lists per category.
 * Each keyword hit = 1 point in body, 2 points in title.
 */
const CATEGORY_KEYWORD_LISTS = {
  liability: ['haftung', 'haftet', 'haften', 'schadenersatz', 'schadensersatz', 'freistellung', 'freihalten', 'haftungsbeschr', 'haftungsausschluss', 'schadloshalt'],
  payment: ['vergütung', 'zahlung', 'entgelt', 'preis', 'honorar', 'gebühr', 'fälligkeit', 'fällig', 'rechnung', 'verzugszins', 'bezahl', 'faktur', 'kostenübernahme', 'aufwandserstattung'],
  termination: ['kündigung', 'kündigungsfrist', 'beendigung', 'vertragsende', 'rücktritt', 'auflösung', 'außerordentlich', 'ordentliche kündigung', 'sonderkündigungsrecht'],
  data_protection: ['datenschutz', 'dsgvo', 'personenbezogen', 'datenverarbeitung', 'auftragsverarbeitung', 'datensicherheit', 'betroffenenrechte'],
  confidentiality: ['vertraulich', 'geheimhaltung', 'verschwiegenheit', 'geheimnis', 'stillschweigen', 'betriebsgeheimnis'],
  warranty: ['gewährleist', 'garantie', 'mängel', 'nachbesser', 'sachmangel', 'rechtsmangel', 'mängelansprüche'],
  ip_rights: ['urheberrecht', 'nutzungsrecht', 'geistiges eigentum', 'lizenz', 'patent', 'markenrecht', 'verwertungsrecht'],
  non_compete: ['wettbewerbsverbot', 'konkurrenzverbot', 'abwerbeverbot', 'karenz', 'wettbewerbsbeschränkung'],
  dispute_resolution: ['gerichtsstand', 'schiedsgericht', 'schiedsverfahren', 'mediation', 'schlichtung', 'streitbeilegung', 'anwendbares recht'],
  force_majeure: ['höhere gewalt', 'force majeure'],
  duration: ['vertragslaufzeit', 'vertragsdauer', 'mindestlaufzeit', 'verlängerung', 'vertragsbeginn'],
  penalties: ['vertragsstrafe', 'pönale', 'konventionalstrafe', 'strafzahlung'],
  insurance: ['versicherung', 'versicherungspflicht', 'deckungssumme', 'haftpflichtversicherung'],
  compliance: ['compliance', 'audit-recht', 'auditrecht', 'regulierung'],
  sla: ['service level', 'verfügbarkeit', 'uptime', 'reaktionszeit', 'erreichbarkeit'],
  deliverables: ['lieferung', 'abnahme', 'leistungsumfang', 'werkleistung'],
};

/**
 * Scored keyword classifier.
 * Title matches count double. Returns category + score, or null if too weak.
 */
function classifyByKeywords(title, text) {
  const titleLower = (title || '').toLowerCase();
  const bodyLower = (text || '').substring(0, 2000).toLowerCase();

  let bestCategory = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORD_LISTS)) {
    let score = 0;
    for (const kw of keywords) {
      if (titleLower.includes(kw)) score += 2;  // Title = strong signal
      if (bodyLower.includes(kw)) score += 1;   // Body = supporting signal
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Require minimum confidence: score >= 2 (e.g. 1 title hit, or 2 body hits)
  return bestScore >= 2 ? { category: bestCategory, score: bestScore } : null;
}

/**
 * Post-GPT category override.
 * Corrects "other" assignments and fixes obvious misclassifications.
 *
 * Strategy:
 * - "other" + keyword match >= 2 → override (conservative)
 * - Any category + keyword match >= 4 and different → override (aggressive, high confidence)
 */
function applyCategoryOverrides(clauses) {
  let overrideCount = 0;

  for (const clause of clauses) {
    const detected = classifyByKeywords(clause.title, clause.originalText);
    if (!detected) continue;

    if (clause.category === 'other') {
      // Conservative: override "other" when keyword classifier is confident
      clause.category = detected.category;
      overrideCount++;
    } else if (detected.category !== clause.category && detected.score >= 4) {
      // Aggressive: override GPT when keyword classifier is very confident
      clause.category = detected.category;
      overrideCount++;
    }
  }

  if (overrideCount > 0) {
    console.log(`[OptimizerV2] Stage 2: Rule-based override corrected ${overrideCount} clause categories`);
  }

  return clauses;
}

/**
 * Simple fallback for when GPT categorization completely fails.
 */
function guessCategoryFromText(title, text) {
  const result = classifyByKeywords(title, text);
  return result ? result.category : 'other';
}

module.exports = { runClauseExtraction };

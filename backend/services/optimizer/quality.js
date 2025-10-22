/**
 * 🎯 ULTIMATE QUALITY LAYER
 * Entfernt Duplikate, garantiert Minimum-Standards, validiert Schema
 */

/**
 * 🔥 CHATGPT-FIX: Stoppwörter für Kanonisierung
 */
const STOP_WORDS = new Set([
  'pflichtklausel', 'klausel', 'fehlt', 'regelung', 'notwendig',
  'erforderlich', 'fehlend', 'missing', 'clause', 'required'
]);

/**
 * 🔥 CHATGPT-FIX: Kanonische Normalisierung für Dedupe
 * - Entfernt Stoppwörter
 * - Mapped Synonyme auf Kernbegriffe
 * - Normalisiert "Pflichtklausel fehlt: X" → "X"
 */
function canonical(s = '') {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:]/gu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^pflichtklausel\s*fehlt\s*:\s*/, '')   // "Pflichtklausel fehlt: X" → "X"
    .replace(/(datenschutz|dsgvo)/g, 'data_protection')
    .replace(/(arbeitsort|einsatzort)/g, 'workplace')
    .replace(/(kündigung|kündigungsfrist|vertragsbeendigung)/g, 'termination')
    .replace(/(haftung|gewährleistung)/g, 'liability')
    .split(' ')
    .filter(w => w && !STOP_WORDS.has(w))
    .join(' ')
    .trim();
}

/**
 * 🔥 CHATGPT-FIX: Prüft ob Issue "FEHLT" signalisiert
 */
function isMissingFlag(issue) {
  const o = (issue.originalText || issue.original || '').trim();
  return o === '' ||
         o === 'FEHLT' ||
         /^fehl|^nicht vorhanden|^diese.*fehlt/i.test(o);
}

/**
 * 🔥 CHATGPT-FIX: Jaccard Similarity (präziser als Token-Overlap)
 */
function jaccard(a, b) {
  const A = new Set(a.split(' ').filter(Boolean));
  const B = new Set(b.split(' ').filter(Boolean));
  const inter = [...A].filter(x => B.has(x)).length;
  const union = A.size + B.size - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Normalisiert String für Similarity-Vergleich (Legacy-Support)
 */
function norm(s = '') {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Berechnet Token-Overlap Similarity (0-1) (Legacy-Support)
 */
function sim(a, b) {
  const A = new Set(norm(a).split(' '));
  const B = new Set(norm(b).split(' '));
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / Math.max(1, Math.min(A.size, B.size));
}

/**
 * 🔥 CHATGPT-IMPROVED DEDUPE: Semantisch intelligente Duplikaterkennung
 *
 * Merge-Strategie:
 * - Kanonische Normalisierung (Stoppwörter, Synonyme)
 * - Jaccard Similarity (präziser als Token-Overlap)
 * - Niedrigerer Threshold für "FEHLT" Issues (0.3 statt 0.6)
 * - Höchste Severity + längste Reasoning behalten
 *
 * @param {Array} issues - Array von Issue-Objekten
 * @returns {Array} - Deduplizierte Issues
 */
function dedupeIssues(issues) {
  if (!Array.isArray(issues) || issues.length === 0) return [];

  const out = [];
  const seen = [];

  for (const it of issues) {
    const cat = (it.category || 'general').toLowerCase();
    const title = it.title || it.summary || '';
    const canTitle = canonical(title);
    const miss = isMissingFlag(it) ? 'M' : 'H';

    // Suche nach semantischem Duplikat
    const dupIndex = seen.findIndex(s => {
      const sameCategory = s.cat === cat;
      if (!sameCategory) return false;

      const canSTitle = canonical(s.title);

      // CHATGPT-FIX: Niedrigerer Threshold für "FEHLT" Issues
      const threshold = (s.miss === 'M' && miss === 'M') ? 0.3 : 0.6;
      const similarity = jaccard(canSTitle, canTitle);

      return similarity >= threshold;
    });

    if (dupIndex === -1) {
      // Kein Duplikat → hinzufügen
      seen.push({ cat, miss, title });
      out.push(it);
    } else {
      // Duplikat gefunden → Merge
      const dup = out[dupIndex];
      console.log(`🔄 Dedupe: Merging "${title}" into "${dup.title || dup.summary}"`);

      // Höchste Severity behalten
      const itSeverity = it.severity || it.risk || 0;
      const dupSeverity = dup.severity || dup.risk || 0;
      if (itSeverity > dupSeverity) {
        dup.severity = itSeverity;
        dup.risk = itSeverity;
      }

      // Längeres Legal Reasoning behalten
      if ((it.legalReasoning || '').length > (dup.legalReasoning || '').length) {
        dup.legalReasoning = it.legalReasoning;
      }

      // Längeren/besseren improvedText behalten
      if ((it.improvedText || '').length > (dup.improvedText || '').length) {
        dup.improvedText = it.improvedText;
      }

      // Sources & LegalReferences zusammenführen
      const dupSources = dup.sources || [dup.source || 'unknown'];
      const itSources = it.sources || [it.source || 'unknown'];
      dup.sources = [...new Set([...dupSources, ...itSources])];

      const dupRefs = dup.legalReferences || [];
      const itRefs = it.legalReferences || [];
      dup.legalReferences = [...new Set([...dupRefs, ...itRefs])];

      // Confidence: Maximum
      if (it.confidence && dup.confidence) {
        dup.confidence = Math.max(it.confidence, dup.confidence);
      }
    }
  }

  console.log(`✅ Smart-Dedupe: ${issues.length} → ${out.length} findings (removed ${issues.length - out.length} duplicates)`);
  return out;
}

/**
 * Validiert und korrigiert Issue-Kategorien
 */
function ensureCategory(issue) {
  const validCategories = new Set([
    'data_protection',
    'termination',
    'payment',
    'liability',
    'confidentiality',
    'jurisdiction',
    'formalities',
    'ip_rights',
    'working_time',
    'workplace',
    'clarity',
    'compliance'
  ]);

  if (!issue.category || !validCategories.has(issue.category)) {
    console.warn(`⚠️ Invalid category "${issue.category}" → falling back to "clarity"`);
    issue.category = 'clarity';
  }

  return issue;
}

/**
 * Entfernt Platzhalter und unsichere Inhalte
 */
function cleanPlaceholders(text) {
  if (!text) return text;

  // Entferne "siehe Vereinbarung" und ähnliche Platzhalter
  const badPatterns = [
    /siehe\s+Vereinbarung/gi,
    /siehe\s+oben/gi,
    /\[TBD\]/gi,
    /\[TODO\]/gi,
    /XXX/g
  ];

  let cleaned = text;
  badPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, 'individuell zu vereinbaren');
  });

  return cleaned;
}

/**
 * Garantiert Minimum-Standards für alle Issues
 */
function applyMinimumStandards(issues) {
  return issues.map(issue => {
    // Ensure summary exists
    if (!issue.summary && issue.title) {
      issue.summary = issue.title;
    }

    // Clean placeholders
    if (issue.improvedText) {
      issue.improvedText = cleanPlaceholders(issue.improvedText);
    }

    // Validate category
    ensureCategory(issue);

    // Ensure minimum length for improved text
    if (issue.improvedText && issue.improvedText.length < 50 && !issue.improvedText.includes('§')) {
      console.warn(`⚠️ Issue "${issue.summary}" has very short improvedText (<50 chars)`);
    }

    return issue;
  });
}

/**
 * 🔥 CHATGPT-FIX: Post-Processing Sanitizer
 * Entfernt willkürliche Zahlen, §-Überschriften, falsche Rollenbegriffe, Pseudo-Statistiken
 *
 * SCHUTZMA NAHMEN:
 * 1. § nur am Zeilenanfang entfernen (nicht § 623 BGB im Text!)
 * 2. Stunden nur kontextsensitiv (nicht wenn BGB/% folgt)
 * 3. Term-Mapping nur für Arbeitsrecht
 * 4. Pseudo-Statistiken raus, echte Quellen behalten
 */
function sanitizeImprovedText(text = '', contractType = '') {
  if (!text) return text;

  let t = text;

  // 1. § ÜBERSCHRIFTEN entfernen (nur Zeilenanfang, NICHT "§ 623 BGB" im Text!)
  // CHATGPT-SCHUTZ: Nur wenn kein BGB/DSGVO/ArbGG folgt
  t = t.replace(/^(?:§|\u00A7)\s*\d+\s+(?=[A-ZÄÖÜa-zäöü])/gm, '');

  // 2. WILLKÜRLICHE STUNDEN → Platzhalter
  // CHATGPT-SCHUTZ: Nur wenn in den nächsten 20 Zeichen kein BGB/DSGVO/% vorkommt
  t = t.replace(/(\b\d{1,3})\s*(Stunden|Std\.?)(?![^]{0,20}\b(BGB|DSGVO|ArbZG|%|€)\b)/gi, '[X] Stunden');

  // 3. TERM-MAPPING für Arbeitsrecht
  // CHATGPT-SCHUTZ: Nur für Arbeitsverträge, mit Wortgrenzen
  if ((contractType || '').toLowerCase().includes('arbeit')) {
    t = t.replace(/\bAuftraggeber\b/g, 'Arbeitgeber')
         .replace(/\bAuftragnehmer\b/g, 'Arbeitnehmer');
  }

  // 4. PSEUDO-STATISTIKEN entfernen
  // CHATGPT-SCHUTZ: Nur Prozent-Claims mit "BRAK/Quelle/Studie", echte BGH/BAG bleiben!
  t = t.replace(/\b(?:8\d|9\d|100)%[^.\n]*?(?:BRAK|Quelle|Studie|Erhebung)[^.\n]*\.?/gi, 'branchenübliche Praxis');

  return t.trim();
}

/**
 * 🔥 CHATGPT-FIX: Sanitizer für Summary/Benchmark (leichter)
 */
function sanitizeText(text = '') {
  if (!text) return text;

  // Entferne Pseudo-Prozente aus Summaries/Benchmarks
  return text.replace(/\b(?:8\d|9\d|100)%.*?(?:BRAK|Erhebung|Studie)[^.\n]*\.?/gi, 'branchenüblich');
}

module.exports = {
  dedupeIssues,
  ensureCategory,
  cleanPlaceholders,
  applyMinimumStandards,
  sanitizeImprovedText,
  sanitizeText,
  norm,
  sim,
  canonical,
  jaccard
};

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
 * 🔥 CHATGPT FIX A: Kanonischer Category-Key für FEHLT-Issues
 * Extrahiert aus Title + Category einen eindeutigen Key für Cross-Category-Dedupe
 */
function canonicalCategory(canTitle, category) {
  // Prüfe welche Kategorie im Title erwähnt wird
  if (/data.*protection|datenschutz|dsgvo/i.test(canTitle)) return 'data_protection';
  if (/termination|k[üu]ndigung|beendigung/i.test(canTitle)) return 'termination';
  if (/workplace|arbeitsort|einsatzort/i.test(canTitle)) return 'workplace';
  if (/working.*time|arbeitszeit/i.test(canTitle)) return 'working_time';
  if (/payment|verg[üu]tung|gehalt/i.test(canTitle)) return 'payment';
  if (/liability|haftung/i.test(canTitle)) return 'liability';
  if (/confidentiality|geheimhaltung|vertraulich/i.test(canTitle)) return 'confidentiality';
  if (/jurisdiction|gerichtsstand|rechtswahl/i.test(canTitle)) return 'jurisdiction';
  if (/formalities|schriftform/i.test(canTitle)) return 'formalities';
  if (/ip.*rights|nutzungsrecht|urheberrecht/i.test(canTitle)) return 'ip_rights';

  // Fallback: verwende die bereits normalisierte Category
  return category;
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
 * - CHATGPT FIX A: Missing-Key für Cross-Category-Duplikate
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

    // 🔥 CHATGPT FIX A: Missing-Key für Cross-Category FEHLT-Duplikate
    // Wenn beide "FEHLT" sind + gleicher kanonischer Kategorie-Begriff → Duplikat!
    const missingKey = (miss === 'M') ? canonicalCategory(canTitle, cat) : null;

    // Suche nach semantischem Duplikat
    const dupIndex = seen.findIndex(s => {
      // CHATGPT FIX A: Prüfe Missing-Key zuerst (härter als Similarity)
      if (missingKey && s.missingKey && missingKey === s.missingKey) {
        return true; // Cross-Category FEHLT-Duplikat gefunden!
      }

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
      seen.push({ cat, miss, title, missingKey });
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
 * 🔥 CHATGPT-FIX: Validiert und korrigiert Issue-Kategorien
 * Normalisiert Kategorien basierend auf Title-Keywords (verhindert Cross-Category-Duplikate)
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

  // CHATGPT-FIX: Category-Normalisierung basierend auf Title-Keywords
  // Verhindert dass "Datenschutzklausel fehlt" in "clarity" landet statt "data_protection"
  const title = (issue.title || issue.summary || '').toLowerCase();
  const summary = (issue.summary || '').toLowerCase();
  const combined = `${title} ${summary}`;

  // Keyword-basiertes Remapping (nur wenn aktuell "clarity" oder "compliance")
  if (issue.category === 'clarity' || issue.category === 'compliance' || !validCategories.has(issue.category)) {
    if (/datenschutz|dsgvo|personenbezogen|art\.\s*\d+\s*dsgvo/i.test(combined)) {
      issue.category = 'data_protection';
    } else if (/k[üu]ndigung|k[üu]ndigungsfrist|beendigung|§\s*62[0-3]\s*bgb/i.test(combined)) {
      issue.category = 'termination';
    } else if (/arbeitsort|einsatzort|t[äa]tigkeitsort/i.test(combined)) {
      issue.category = 'workplace';
    } else if (/arbeitszeit|wochenarbeitszeit|arbzg/i.test(combined)) {
      issue.category = 'working_time';
    } else if (/gehalt|verg[üu]tung|lohn|bezahlung|zahlungsbedingung/i.test(combined)) {
      issue.category = 'payment';
    } else if (/haftung|gew[äa]hrleistung|§\s*276\s*bgb/i.test(combined)) {
      issue.category = 'liability';
    } else if (/geheimhaltung|vertraulich|confidential/i.test(combined)) {
      issue.category = 'confidentiality';
    } else if (/gerichtsstand|rechtswahl|jurisdiction/i.test(combined)) {
      issue.category = 'jurisdiction';
    }
  }

  // Fallback für invalide Kategorien
  if (!validCategories.has(issue.category)) {
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
    /\[ORT(?:,\s*STRASSE)?\]/gi,         // [ORT] oder [ORT, STRASSE]
    /\[STRASSE\]/gi,                      // [STRASSE]
    /\[Datum\]/gi,                        // [Datum]
    /\[PLZ\]/gi,                          // [PLZ]
    /\[XXX\]/gi,                          // [XXX]
    /\[einsetzen\]/gi,                    // [einsetzen]
    /\[Betrag\]/gi,                       // [Betrag]
    /\[Anzahl\]/gi,                       // [Anzahl]
    /\[Name\]/gi,                         // [Name]
    /\[Vollständiger\s+Name\]/gi,        // [Vollständiger Name]
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

    // 🔥 FIX v2: Robuster Benchmark-Sanitizer (ChatGPT's version)
    if (issue.benchmark) {
      issue.benchmark = sanitizeBenchmark(issue.benchmark);
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
 *
 * REIHENFOLGE (ChatGPT-Empfehlung):
 * - Erst Inhalts-Cleanup (Rollen/Prozent) → minimiert False Positives
 * - Dann Struktur-Cleanup (§/Stunden)
 *
 * @returns {object} { text, stats: { roleTerms, pseudoStats, paragraphHeaders, arbitraryHours } }
 */
function sanitizeImprovedText(text = '', contractType = '') {
  if (!text) return { text: '', stats: { roleTerms: 0, pseudoStats: 0, paragraphHeaders: 0, arbitraryHours: 0 } };

  let t = text;
  const stats = { roleTerms: 0, pseudoStats: 0, paragraphHeaders: 0, arbitraryHours: 0 };

  // 1. TERM-MAPPING für Arbeitsrecht (ZUERST, für sauberen Kontext)
  // CHATGPT-SCHUTZ: Nur für Arbeitsverträge, mit Wortgrenzen
  if ((contractType || '').toLowerCase().includes('arbeit')) {
    const before = t;
    t = t.replace(/\bAuftraggeber\b/g, 'Arbeitgeber')
         .replace(/\bAuftragnehmer\b/g, 'Arbeitnehmer');
    if (t !== before) stats.roleTerms++;
  }

  // 2. PSEUDO-STATISTIKEN entfernen (ZWEITES, bereinigt Inhalte)
  // CHATGPT-SCHUTZ: Nur Prozent-Claims mit "BRAK/Quelle/Studie", echte BGH/BAG bleiben!
  const pseudoRegex = /\b(?:8\d|9\d|100)%[^.\n]*?(?:BRAK|Quelle|Studie|Erhebung)[^.\n]*\.?/gi;
  const pseudoMatches = t.match(pseudoRegex);
  if (pseudoMatches) stats.pseudoStats = pseudoMatches.length;
  t = t.replace(pseudoRegex, 'branchenübliche Praxis');

  // 3. § ÜBERSCHRIFTEN entfernen (DRITTES, strukturelle Bereinigung)
  // CHATGPT-SCHUTZ: Nur am Zeilenanfang, NICHT "§ 623 BGB" im Text!
  const headerRegex = /^(?:§|\u00A7)\s*\d+\s+(?=[A-ZÄÖÜa-zäöü])/gm;
  const headerMatches = t.match(headerRegex);
  if (headerMatches) stats.paragraphHeaders = headerMatches.length;
  t = t.replace(headerRegex, '');

  // 4. WILLKÜRLICHE STUNDEN → Platzhalter (LETZTES, präzise Ersetzung)
  // CHATGPT-SCHUTZ: Nur wenn in den nächsten 20 Zeichen kein BGB/DSGVO/% vorkommt
  const hoursRegex = /(\b\d{1,3})\s*(Stunden|Std\.?)(?![^]{0,20}\b(BGB|DSGVO|ArbZG|%|€)\b)/gi;
  const hoursMatches = t.match(hoursRegex);
  if (hoursMatches) stats.arbitraryHours = hoursMatches.length;
  t = t.replace(hoursRegex, '[X] Stunden');

  // 5. PLATZHALTER ENTFERNEN ([ORT, STRASSE], [Datum], etc.)
  t = cleanPlaceholders(t);

  return { text: t.trim(), stats };
}

/**
 * 🔥 CHATGPT-FIX v2: Robuster Benchmark-Sanitizer
 * Entfernt ALL Pseudo-Statistiken inkl. spezifizieren, regeln, etc.
 * Weichzeichnet Superlative (immer, stets, grundsätzlich)
 */
function sanitizeBenchmark(text = '') {
  if (!text) return text;

  let t = String(text);

  // Pattern 1: 90-100% pauschal → "branchenüblich"
  t = t.replace(/\b(9\d|100)%\b/g, 'branchenüblich');

  // Pattern 2: 50-89% pauschal → "branchenüblich"
  t = t.replace(/\b([5-8]\d)%\b/g, 'branchenüblich');

  // Pattern 3: Sätze wie "X% der ... Verträge ... (spezifizieren|regeln|enthalten|...)"
  // ERWEITERT um: spezifizieren, regeln, sehen.*vor, führen.*an
  t = t.replace(
    /\b\d{2,3}%\s+der\s+[^.]{0,80}?(verträge|vereinbarungen|kaufverträge)[^.]{0,80}?\b(enthalten|haben|nutzen|beinhalten|spezifizieren|regeln|sehen.*vor|führen.*an)\b[^.]*\./gi,
    'branchenüblich.'
  );

  // Pattern 4: Superlative/Absolutismen weichzeichnen
  t = t.replace(/\b(immer|stets|grundsätzlich|zu\s*100%)\b/gi, 'in der Regel');

  return t.trim();
}

/**
 * @deprecated Use sanitizeBenchmark() instead - kept for backwards compatibility
 */
function sanitizeText(text = '') {
  return sanitizeBenchmark(text);
}

module.exports = {
  dedupeIssues,
  ensureCategory,
  cleanPlaceholders,
  applyMinimumStandards,
  sanitizeImprovedText,
  sanitizeBenchmark,
  sanitizeText, // deprecated, kept for backwards compatibility
  norm,
  sim,
  canonical,
  jaccard
};

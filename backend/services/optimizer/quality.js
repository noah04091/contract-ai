/**
 * 🎯 ULTIMATE QUALITY LAYER
 * Entfernt Duplikate, garantiert Minimum-Standards, validiert Schema
 */

/**
 * Normalisiert String für Similarity-Vergleich
 */
function norm(s = '') {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Berechnet Token-Overlap Similarity (0-1)
 */
function sim(a, b) {
  const A = new Set(norm(a).split(' '));
  const B = new Set(norm(b).split(' '));
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / Math.max(1, Math.min(A.size, B.size));
}

/**
 * 🔥 DEDUPE-LAYER: Entfernt Duplikate basierend auf Kategorie + Title-Similarity
 *
 * Merge-Strategie:
 * - Höchste Severity behalten
 * - Längste/beste Reasoning behalten
 * - LegalReferences zusammenführen
 *
 * @param {Array} issues - Array von Issue-Objekten
 * @returns {Array} - Deduplizierte Issues
 */
function dedupeIssues(issues) {
  if (!Array.isArray(issues) || issues.length === 0) return [];

  const seen = [];

  for (const it of issues) {
    const keyCat = it.category || 'general';
    const title = it.title || it.summary || '';
    const textFlag = (norm(it.originalText || '') === '' ? 'MISSING' : 'HAS');

    // Suche nach Duplikat in bereits gesehenen Issues
    const dup = seen.find(s => {
      const sameCategory = (s.category || 'general') === keyCat;
      const sTitle = s.title || s.summary || '';

      // Fall 1: Beide haben MISSING originalText + ähnlicher Titel
      if (textFlag === 'MISSING' && norm(s.originalText || '') === '') {
        return sameCategory && sim(sTitle, title) > 0.6;
      }

      // Fall 2: Titel + Summary stark ähnlich
      const titleSimScore = sim(`${sTitle} ${s.summary || ''}`, `${title} ${it.summary || ''}`);
      return sameCategory && titleSimScore > 0.75;
    });

    if (!dup) {
      // Kein Duplikat gefunden → hinzufügen
      seen.push(it);
    } else {
      // Duplikat gefunden → Merge
      console.log(`🔄 Dedupe: Merging "${title}" into existing finding`);

      // Höchste Severity behalten
      if ((it.severity || it.risk || 0) > (dup.severity || dup.risk || 0)) {
        dup.severity = it.severity || it.risk;
        dup.risk = it.severity || it.risk;
      }

      // Längeres Legal Reasoning behalten
      if ((it.legalReasoning || '').length > (dup.legalReasoning || '').length) {
        dup.legalReasoning = it.legalReasoning;
      }

      // Längerer/besserer improvedText behalten
      if ((it.improvedText || '').length > (dup.improvedText || '').length) {
        dup.improvedText = it.improvedText;
      }

      // Sources zusammenführen
      const dupSources = dup.sources || [dup.source || 'unknown'];
      const itSources = it.sources || [it.source || 'unknown'];
      dup.sources = [...new Set([...dupSources, ...itSources])];

      // LegalReferences zusammenführen
      const dupRefs = dup.legalReferences || [];
      const itRefs = it.legalReferences || [];
      dup.legalReferences = [...new Set([...dupRefs, ...itRefs])];

      // Confidence: Durchschnitt oder höchster Wert
      if (it.confidence && dup.confidence) {
        dup.confidence = Math.max(it.confidence, dup.confidence);
      }
    }
  }

  console.log(`✅ Dedupe: ${issues.length} → ${seen.length} findings (removed ${issues.length - seen.length} duplicates)`);
  return seen;
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

module.exports = {
  dedupeIssues,
  ensureCategory,
  cleanPlaceholders,
  applyMinimumStandards,
  norm,
  sim
};

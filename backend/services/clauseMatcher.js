// backend/services/clauseMatcher.js — Clause Matching Engine for Compare V2
// Matches clauses between two contracts using area-based + semantic similarity

// ============================================
// Cosine Similarity (standalone, no vectorStore dependency)
// ============================================

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

// ============================================
// Token Overlap Similarity (fast fallback, no API needed)
// ============================================

function tokenOverlapSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  const normalize = (t) => t.toLowerCase().replace(/[^\wäöüß]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const tokens1 = new Set(normalize(text1));
  const tokens2 = new Set(normalize(text2));
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }
  // Jaccard similarity
  const union = tokens1.size + tokens2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ============================================
// Key Value Similarity (for structured data like amounts, dates)
// ============================================

function keyValueSimilarity(kv1, kv2) {
  if (!kv1 || !kv2) return 0;
  const keys1 = Object.keys(kv1);
  const keys2 = Object.keys(kv2);
  if (keys1.length === 0 && keys2.length === 0) return 1;
  if (keys1.length === 0 || keys2.length === 0) return 0;

  let matchingKeys = 0;
  let matchingValues = 0;
  for (const k of keys1) {
    const normalizedK = k.toLowerCase();
    const matchKey = keys2.find(k2 => k2.toLowerCase() === normalizedK);
    if (matchKey) {
      matchingKeys++;
      if (kv1[k] === kv2[matchKey]) matchingValues++;
    }
  }
  const totalKeys = new Set([...keys1.map(k => k.toLowerCase()), ...keys2.map(k => k.toLowerCase())]).size;
  return totalKeys > 0 ? matchingKeys / totalKeys : 0;
}

// ============================================
// Match Type Classification
// ============================================

function classifyMatch(similarity, kvSim, areaMatch) {
  if (similarity >= 0.92 && kvSim >= 0.8) return 'equivalent';  // Same clause, same values
  if (similarity >= 0.75 && areaMatch) return 'similar';          // Same topic, different wording
  if (similarity >= 0.55 && areaMatch) return 'related';          // Same area, different scope
  if (similarity >= 0.40) return 'potential';                       // Might be related
  return 'none';
}

function classifyStrength(clause1, clause2, kvSim) {
  // Determine if clause1 is weaker/stronger/equivalent to clause2
  // Based on key values: more restrictive = stronger protection
  if (!clause1.keyValues || !clause2.keyValues) return 'different';

  const kv1 = clause1.keyValues;
  const kv2 = clause2.keyValues;

  // Look for numeric comparisons in key values
  const numericKeys = Object.keys(kv1).filter(k => {
    const v = kv1[k];
    return /[\d.,]+/.test(v);
  });

  if (numericKeys.length === 0) return 'different';

  // If values are identical → equivalent
  if (kvSim >= 0.9) return 'equivalent';

  return 'different'; // Can't reliably determine weaker/stronger without domain knowledge
}

// ============================================
// Main Matching Function (Fast: area-based + token overlap)
// ============================================

async function matchClauses(clauses1, clauses2, options = {}) {
  const { useEmbeddings = false } = options;
  const matches = [];
  const unmatchedFrom1 = new Set(clauses1.map((_, i) => i));
  const unmatchedFrom2 = new Set(clauses2.map((_, i) => i));

  // Compute embeddings if requested
  let embeddings1 = null;
  let embeddings2 = null;

  if (useEmbeddings) {
    try {
      const EmbeddingService = require('./embeddingService');
      const embeddingService = new EmbeddingService();

      const texts1 = clauses1.map(c => `${c.title}. ${c.summary}. ${c.originalText}`);
      const texts2 = clauses2.map(c => `${c.title}. ${c.summary}. ${c.originalText}`);

      [embeddings1, embeddings2] = await Promise.all([
        embeddingService.embedBatch(texts1),
        embeddingService.embedBatch(texts2),
      ]);

      console.log(`🔗 Clause Matcher: ${texts1.length} + ${texts2.length} Embeddings berechnet`);
    } catch (err) {
      console.warn(`⚠️ Clause Matcher: Embedding-Fallback auf Token-Overlap (${err.message})`);
      // Fall through to token-based matching
    }
  }

  // Build similarity matrix
  const matrix = [];
  for (let i = 0; i < clauses1.length; i++) {
    for (let j = 0; j < clauses2.length; j++) {
      const c1 = clauses1[i];
      const c2 = clauses2[j];

      const areaMatch = c1.area === c2.area;

      // Compute similarity score
      let similarity;
      if (embeddings1 && embeddings2 && embeddings1[i] && embeddings2[j]) {
        similarity = cosineSimilarity(embeddings1[i], embeddings2[j]);
      } else {
        // Fast fallback: token overlap on summary + originalText
        const textSim = tokenOverlapSimilarity(
          `${c1.summary} ${c1.originalText}`,
          `${c2.summary} ${c2.originalText}`
        );
        const titleSim = tokenOverlapSimilarity(c1.title, c2.title);
        // Weight: 60% text content, 20% title, 20% area bonus
        similarity = textSim * 0.6 + titleSim * 0.2 + (areaMatch ? 0.2 : 0);
      }

      const kvSim = keyValueSimilarity(c1.keyValues, c2.keyValues);
      const matchType = classifyMatch(similarity, kvSim, areaMatch);

      if (matchType !== 'none') {
        matrix.push({ i, j, similarity, kvSim, areaMatch, matchType });
      }
    }
  }

  // Greedy matching: pick best matches first (highest similarity)
  matrix.sort((a, b) => b.similarity - a.similarity);

  for (const m of matrix) {
    if (!unmatchedFrom1.has(m.i) || !unmatchedFrom2.has(m.j)) continue;

    const c1 = clauses1[m.i];
    const c2 = clauses2[m.j];
    const strength = classifyStrength(c1, c2, m.kvSim);

    matches.push({
      clause1Id: c1.id,
      clause2Id: c2.id,
      clause1Index: m.i,
      clause2Index: m.j,
      area: c1.area,
      similarity: Math.round(m.similarity * 100) / 100,
      keyValueSimilarity: Math.round(m.kvSim * 100) / 100,
      matchType: m.matchType,           // equivalent, similar, related, potential
      strengthComparison: strength,      // equivalent, different
      clause1Summary: c1.summary,
      clause2Summary: c2.summary,
      clause1KeyValues: c1.keyValues,
      clause2KeyValues: c2.keyValues,
    });

    unmatchedFrom1.delete(m.i);
    unmatchedFrom2.delete(m.j);
  }

  // Collect unmatched clauses
  const onlyInContract1 = [...unmatchedFrom1].map(i => ({
    clauseId: clauses1[i].id,
    index: i,
    area: clauses1[i].area,
    title: clauses1[i].title,
    summary: clauses1[i].summary,
  }));

  const onlyInContract2 = [...unmatchedFrom2].map(j => ({
    clauseId: clauses2[j].id,
    index: j,
    area: clauses2[j].area,
    title: clauses2[j].title,
    summary: clauses2[j].summary,
  }));

  const result = {
    matches,
    onlyInContract1,
    onlyInContract2,
    stats: {
      totalClauses1: clauses1.length,
      totalClauses2: clauses2.length,
      matched: matches.length,
      equivalent: matches.filter(m => m.matchType === 'equivalent').length,
      similar: matches.filter(m => m.matchType === 'similar').length,
      related: matches.filter(m => m.matchType === 'related').length,
      onlyIn1: onlyInContract1.length,
      onlyIn2: onlyInContract2.length,
    }
  };

  console.log(`🔗 Clause Matching: ${result.stats.matched} Matches (${result.stats.equivalent} identisch, ${result.stats.similar} ähnlich, ${result.stats.related} verwandt), ${result.stats.onlyIn1} nur in V1, ${result.stats.onlyIn2} nur in V2`);

  return result;
}

// ============================================
// Format Matches for Phase B Prompt Context
// ============================================

function formatMatchesForPrompt(matchResult) {
  if (!matchResult || matchResult.matches.length === 0) return '';

  let context = `\nKLAUSEL-MATCHING (automatisch erkannt):\n`;

  // Matched pairs
  if (matchResult.matches.length > 0) {
    context += `\nGEMATCHTE KLAUSELN (${matchResult.matches.length} Paare):\n`;
    for (const m of matchResult.matches) {
      const typeLabel = {
        equivalent: 'IDENTISCH',
        similar: 'ÄHNLICH',
        related: 'VERWANDT',
        potential: 'MÖGLICHERWEISE VERWANDT'
      }[m.matchType] || m.matchType;

      context += `- [${typeLabel}, ${Math.round(m.similarity * 100)}%] ${m.area}: "${m.clause1Summary}" ↔ "${m.clause2Summary}"`;

      // Show key value differences for matched clauses
      if (m.keyValueSimilarity < 1 && m.clause1KeyValues && m.clause2KeyValues) {
        const diffs = [];
        const allKeys = new Set([...Object.keys(m.clause1KeyValues), ...Object.keys(m.clause2KeyValues)]);
        for (const k of allKeys) {
          const v1 = m.clause1KeyValues[k];
          const v2 = m.clause2KeyValues[k];
          if (v1 !== v2) {
            diffs.push(`${k}: "${v1 || 'fehlt'}" vs "${v2 || 'fehlt'}"`);
          }
        }
        if (diffs.length > 0) {
          context += `\n  Wert-Unterschiede: ${diffs.join(', ')}`;
        }
      }
      context += '\n';
    }
  }

  // Only in contract 1
  if (matchResult.onlyInContract1.length > 0) {
    context += `\nNUR IN VERTRAG 1 (${matchResult.onlyInContract1.length}):\n`;
    for (const c of matchResult.onlyInContract1) {
      context += `- ${c.area}: "${c.summary}"\n`;
    }
  }

  // Only in contract 2
  if (matchResult.onlyInContract2.length > 0) {
    context += `\nNUR IN VERTRAG 2 (${matchResult.onlyInContract2.length}):\n`;
    for (const c of matchResult.onlyInContract2) {
      context += `- ${c.area}: "${c.summary}"\n`;
    }
  }

  context += `\nNUTZE DIESE INFORMATION: Gematchte Klauseln sollten als "weaker/stronger/different_scope" analysiert werden, nicht als "missing". Nur wirklich fehlende Klauseln (NUR IN VERTRAG 1/2) als "missing" markieren.\n`;

  return context;
}

module.exports = {
  matchClauses,
  formatMatchesForPrompt,
  cosineSimilarity,
  tokenOverlapSimilarity,
  keyValueSimilarity,
};

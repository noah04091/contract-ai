/**
 * Diff Generator - Word-level diffs for Redline View
 *
 * Generates pre-computed diffs on the backend so the frontend
 * only needs to render styled spans.
 */
const Diff = require('diff');

/**
 * Generate word-level diff operations between original and optimized text.
 * Returns an array of { type: 'equal' | 'add' | 'remove', text: string }
 */
function generateWordDiff(original, optimized) {
  if (!original || !optimized) return [];
  if (original === optimized) {
    return [{ type: 'equal', text: original }];
  }

  // Choose diff algorithm based on change magnitude:
  // If the texts differ significantly in structure, use sentence-level diff for cleaner output.
  // Word-level diff produces confusing artifacts when lists are restructured to prose.
  const wordDiffChanges = Diff.diffWords(original, optimized, { intlSegmenter: undefined });
  const changeCount = wordDiffChanges.filter(c => c.added || c.removed).length;
  const totalParts = wordDiffChanges.length;
  const changeRatio = totalParts > 0 ? changeCount / totalParts : 0;

  // Sentence-fallback only kicks in for near-complete rewrites (>85%).
  // The previous 60% threshold caused block-level remove/add operations to swallow
  // moderate edits (e.g. removing a section header like "§ 2 −"), turning visually
  // 90%-identical clauses into "everything red" in the redline view.
  // Word-level diff is preferred for moderate edits and still yields readable output.
  const changes = changeRatio > 0.85
    ? Diff.diffSentences(original, optimized)
    : wordDiffChanges;

  const ops = [];

  for (const change of changes) {
    if (change.added) {
      ops.push({ type: 'add', text: change.value });
    } else if (change.removed) {
      ops.push({ type: 'remove', text: change.value });
    } else {
      ops.push({ type: 'equal', text: change.value });
    }
  }

  return ops;
}

/**
 * Generate diffs for all three optimization versions of a clause.
 */
function generateClauseDiffs(originalText, versions) {
  const result = {};

  if (versions.neutral?.text) {
    result.neutral = generateWordDiff(originalText, versions.neutral.text);
  }
  if (versions.proCreator?.text) {
    result.proCreator = generateWordDiff(originalText, versions.proCreator.text);
  }
  if (versions.proRecipient?.text) {
    result.proRecipient = generateWordDiff(originalText, versions.proRecipient.text);
  }

  return result;
}

/**
 * Count the number of actual changes (adds + removes) in a diff.
 */
function countChanges(diffOps) {
  if (!diffOps) return 0;
  return diffOps.filter(op => op.type !== 'equal').length;
}

module.exports = {
  generateWordDiff,
  generateClauseDiffs,
  countChanges
};

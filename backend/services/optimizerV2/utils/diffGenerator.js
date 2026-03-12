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

  const changes = Diff.diffWords(original, optimized, { intlSegmenter: undefined });
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

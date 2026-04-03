/**
 * Clause Splitter - Regex-based pre-splitting of contract text
 *
 * Handles German contract patterns (§ N, Absatz N, numbered sections).
 * Used as a pre-processing hint for the GPT clause extraction stage.
 */

/**
 * Normalize common PDF extraction artifacts before any processing.
 *
 * Rule 1: Merges hyphenated line breaks ("erbrin-\ngung" → "erbringung")
 *         Pattern: lowercase-hyphen-newline-lowercase
 *
 * Rule 2: Merges single-letter column break artifacts ("A\nrbeitnehmer" → "Arbeitnehmer")
 *         When a PDF column break splits a word after its first letter, producing a
 *         line with just one letter followed by the rest of the word on the next line.
 *         Safe because: single letter on its own line (no punctuation, no list marker)
 *         followed by lowercase is almost exclusively a PDF column artifact.
 *         Legitimate patterns like "A." or "I." have punctuation and wouldn't match.
 */
function normalizePdfText(text) {
  if (!text) return text;

  // Rule 1: Hyphenated line breaks (existing)
  text = text.replace(/([a-zäöüß])-\n([a-zäöüß])/g, '$1$2');

  // Rule 2: Single-letter column break artifacts
  // Matches: line consisting of exactly one letter + newline + lowercase continuation
  text = text.replace(/^([A-Za-zÄÖÜäöüß])\n([a-zäöüß])/gm, '$1$2');

  return text;
}

/**
 * Detect multi-column PDF extraction artifacts.
 *
 * pdf-parse reads multi-column PDFs left-to-right across columns, producing
 * two distinct artifact types:
 *
 * Check 1 — Single-letter breaks: Word split after first letter across columns
 *           ("A" on one line, "rbeitnehmer" on the next). Threshold: 3+ occurrences.
 *
 * Check 2 — Section number interleaving: Columns read alternately produce
 *           non-sequential § numbers (§1, §11, §2, §12 instead of §1, §2, §3).
 *           Detected via backward jumps in § numbering (>25% backward, min 3).
 *
 * Check 3 — Short average line length: Each column is ~40-50% page width,
 *           so multi-column extraction produces many short lines.
 *           Threshold: avg < 35 chars with 50+ non-empty lines.
 *
 * @param {string} text - Extracted PDF text
 * @returns {boolean} True if column artifacts are likely present
 */
function hasColumnArtifacts(text) {
  if (!text || text.length < 500) return false;

  const lines = text.split('\n');

  // === Check 1: Single-letter lines ===
  let singleLetterLines = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 1 && /[A-Za-zÄÖÜäöüß]/.test(trimmed)) {
      singleLetterLines++;
    }
  }
  if (singleLetterLines >= 3) return true;

  // === Check 2: Non-sequential § section headers (column interleaving) ===
  // Only match § at line start (actual headers, not inline references)
  const sectionNumbers = [];
  for (const line of lines) {
    const match = line.trim().match(/^§\s*(\d+)\b/);
    if (match) sectionNumbers.push(parseInt(match[1]));
  }
  if (sectionNumbers.length >= 4) {
    let backwards = 0;
    for (let i = 1; i < sectionNumbers.length; i++) {
      if (sectionNumbers[i] < sectionNumbers[i - 1]) backwards++;
    }
    // >25% backward jumps with at least 3 = strong interleaving signal
    if (backwards >= 3 && backwards / (sectionNumbers.length - 1) > 0.25) return true;
  }

  // === Check 3: Short average line length ===
  // Single-column PDFs: avg 60-120 chars. Multi-column: avg 25-45 chars.
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);
  if (nonEmptyLines.length >= 50) {
    const totalLength = nonEmptyLines.reduce((sum, l) => sum + l.trim().length, 0);
    const avgLength = totalLength / nonEmptyLines.length;
    if (avgLength < 35) return true;
  }

  return false;
}

/**
 * Split contract text into preliminary sections using common patterns.
 * This is a heuristic to help GPT by providing section boundaries.
 */
function preSplitClauses(text) {
  if (!text || text.length < 50) return [{ text, sectionNumber: null }];

  // Common German contract section patterns (order matters: most specific first)
  const sectionPatterns = [
    /^(§\s*\d+[a-z]?)\s*[.:\-–\s]/gm,                      // § 1, § 2a, § 1 Vertragsgegenstand
    /^(Artikel\s+\d+)\s*[.:\-–]\s*/gim,                     // Artikel 1
    /^(Ziffer\s+\d+)\s*[.:\-–]\s*/gim,                      // Ziffer 1
    /^(Ziff\.\s*\d+)\s*[.:\-–]\s*/gim,                      // Ziff. 1
    /^(Nr\.\s*\d+)\s*[.:\-–]\s*/gim,                        // Nr. 1
    /^(Punkt\s+\d+)\s*[.:\-–]\s*/gim,                       // Punkt 1
    /^(\d+\.)\s+[A-ZÄÖÜ]/gm,                                // 1. Vertragsgegenstand
    /^(\d+\.\d+)\s+/gm,                                     // 1.1, 2.3
    /^([IVXLC]+\.)\s+[A-ZÄÖÜ]/gm,                           // I. Allgemeines, II. Leistungen
    /^(Abschnitt\s+[IVX\d]+)\s*[.:\-–]\s*/gim,              // Abschnitt I
    /^(Teil\s+[IVX\d]+)\s*[.:\-–]\s*/gim,                   // Teil I
    /^(Kapitel\s+\d+)\s*[.:\-–]\s*/gim,                     // Kapitel 1
  ];

  // Find all section starts
  const sectionStarts = [];

  for (const pattern of sectionPatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      sectionStarts.push({
        index: match.index,
        sectionNumber: match[1].trim(),
        matchLength: match[0].length
      });
    }
  }

  if (sectionStarts.length === 0) {
    return [{ text: text.trim(), sectionNumber: null }];
  }

  // Sort by position and deduplicate overlapping matches
  sectionStarts.sort((a, b) => a.index - b.index);
  const deduped = [sectionStarts[0]];
  for (let i = 1; i < sectionStarts.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (sectionStarts[i].index >= prev.index + prev.matchLength + 5) {
      deduped.push(sectionStarts[i]);
    }
  }

  // Extract sections
  const sections = [];

  // Text before first section (preamble)
  const preambleText = text.substring(0, deduped[0].index).trim();
  if (preambleText.length > 30) {
    sections.push({ text: preambleText, sectionNumber: 'Präambel' });
  }

  // Each section
  for (let i = 0; i < deduped.length; i++) {
    const start = deduped[i].index;
    const end = i < deduped.length - 1 ? deduped[i + 1].index : text.length;
    const sectionText = text.substring(start, end).trim();

    if (sectionText.length > 10) {
      sections.push({
        text: sectionText,
        sectionNumber: deduped[i].sectionNumber
      });
    }
  }

  const result = sections.length > 0 ? sections : [{ text: text.trim(), sectionNumber: null }];
  return mergeHeaderOnlySections(result);
}

/**
 * Merge header-only sections with their first subsection.
 *
 * Problem: When a document has "3. Preise" followed by "3.1 Preise können...",
 * the regex creates a section for "3." that contains only the header text.
 * This causes Stage 4 to generate phantom content for empty headers.
 *
 * Solution: If a section has very short text (<120 chars) and the next section's
 * number starts with the same prefix (e.g., "3." → "3.1"), merge them.
 */
function mergeHeaderOnlySections(sections) {
  if (sections.length < 2) return sections;

  const merged = [];
  let i = 0;

  while (i < sections.length) {
    const current = sections[i];
    const next = sections[i + 1];

    if (next && current.text.length < 120 && current.sectionNumber && next.sectionNumber) {
      // Normalize: "3." → "3", "§ 3" → "§ 3"
      const currentBase = current.sectionNumber.replace(/\.$/, '');
      const nextNum = next.sectionNumber;

      // Check if next is a subsection of current (e.g., "3" → "3.1" or "3.2")
      if (nextNum.startsWith(currentBase + '.')) {
        merged.push({
          text: current.text.trimEnd() + '\n' + next.text,
          sectionNumber: current.sectionNumber
        });
        i += 2;
        continue;
      }
    }

    merged.push(current);
    i++;
  }

  return merged;
}

/**
 * Column-aware text extraction using pdfjs-dist positioning data.
 *
 * pdf-parse reads multi-column PDFs left-to-right across columns, interleaving
 * text from different columns. This function uses pdfjs-dist's text item positions
 * (X/Y coordinates) to detect columns and read them sequentially.
 *
 * Supports 2-column AND 3-column layouts (e.g., dense AGBs like FERCHAU).
 *
 * Algorithm:
 *   1. Extract text items with X/Y positions per page
 *   2. Cluster X-positions to detect column boundaries
 *   3. Split items into columns, read each top-to-bottom
 *   4. Concatenate columns left-to-right
 *
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<{text: string, pages: number} | null>} Column-ordered text, or null on failure
 */
async function extractColumnAwareText(pdfBuffer) {
  try {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
    const pdfDoc = await loadingTask.promise;

    // Pass 1: Collect all items per page to detect repeating header/footer
    const allPageItems = [];
    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const content = await page.getTextContent();

      const items = [];
      for (const item of content.items) {
        if (!item.str || !item.str.trim()) continue;
        items.push({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: item.height || 10
        });
      }
      allPageItems.push(items);
    }

    // Detect repeating header/footer fingerprints across pages
    const repeatFingerprints = detectRepeatingHeaderFooter(allPageItems);

    // Pass 2: Build text with header/footer items removed
    const pageTexts = [];

    for (const items of allPageItems) {
      // Filter out header/footer items
      const filtered = repeatFingerprints.size > 0
        ? items.filter(i => !repeatFingerprints.has(itemFingerprint(i)))
        : items;

      if (filtered.length === 0) continue;

      const boundaries = detectColumnBoundaries(filtered);

      if (boundaries && boundaries.length > 0) {
        const columns = [];
        const allBounds = [-Infinity, ...boundaries, Infinity];
        for (let c = 0; c < allBounds.length - 1; c++) {
          const colItems = filtered.filter(i => i.x >= allBounds[c] && i.x < allBounds[c + 1]);
          if (colItems.length > 0) columns.push(colItems);
        }
        pageTexts.push(columns.map(col => positionedItemsToText(col)).join('\n'));
      } else {
        pageTexts.push(positionedItemsToText(filtered));
      }
    }

    const fullText = pageTexts.join('\n\n');
    if (fullText.trim().length < 200) return null;

    const removedCount = repeatFingerprints.size;
    console.log(`[ColumnExtract] Erfolgreich: ${pdfDoc.numPages} Seiten, ${fullText.trim().length} Zeichen${removedCount > 0 ? `, ${removedCount} Header/Footer-Muster entfernt` : ''}`);
    return { text: fullText, pages: pdfDoc.numPages };
  } catch (err) {
    console.error(`[ColumnExtract] Fehler:`, err.message);
    return null;
  }
}

/**
 * Create a position+text fingerprint for a text item.
 * Rounded X/Y so near-identical positions across pages match.
 */
function itemFingerprint(item) {
  return `${Math.round(item.x)}_${Math.round(item.y)}_${item.text.trim()}`;
}

/**
 * Detect repeating header/footer text across pages.
 *
 * Header/footer items appear on most pages at nearly identical positions
 * with identical text (e.g., "ferchau.com", company address, page numbers).
 * Items appearing on 60%+ of pages (min 3 pages) are considered repeating.
 *
 * @param {Array<Array>} allPageItems - Items per page
 * @returns {Set<string>} Set of fingerprints to filter out
 */
function detectRepeatingHeaderFooter(allPageItems) {
  const totalPages = allPageItems.length;
  if (totalPages < 3) return new Set();

  // Count how many pages each fingerprint appears on
  const fpPageCount = {};
  for (const items of allPageItems) {
    const seenOnPage = new Set();
    for (const item of items) {
      const fp = itemFingerprint(item);
      if (!seenOnPage.has(fp)) {
        seenOnPage.add(fp);
        fpPageCount[fp] = (fpPageCount[fp] || 0) + 1;
      }
    }
  }

  // Items on 60%+ of pages = header/footer
  const threshold = Math.max(3, Math.floor(totalPages * 0.6));
  const repeating = new Set();
  for (const [fp, count] of Object.entries(fpPageCount)) {
    if (count >= threshold) {
      repeating.add(fp);
    }
  }

  return repeating;
}

/**
 * Detect column boundaries by clustering X-start positions.
 *
 * Groups items by their starting X coordinate. X positions within 20pt of each
 * other belong to the same cluster. Gaps > 20pt between clusters with 5+ items
 * each indicate column boundaries.
 *
 * @returns {number[] | null} Array of X boundary values, or null for single-column
 */
function detectColumnBoundaries(items) {
  // Count items per rounded X position
  const xCounts = {};
  for (const item of items) {
    const x = Math.round(item.x);
    xCounts[x] = (xCounts[x] || 0) + 1;
  }

  // Keep only X positions with >= 5 items (filter noise)
  const significantX = Object.entries(xCounts)
    .filter(([, count]) => count >= 5)
    .map(([x]) => parseInt(x))
    .sort((a, b) => a - b);

  if (significantX.length < 2) return null;

  // Find gaps > 20pt between significant X positions
  const CLUSTER_GAP = 20;
  const boundaries = [];
  for (let i = 1; i < significantX.length; i++) {
    if (significantX[i] - significantX[i - 1] > CLUSTER_GAP) {
      boundaries.push((significantX[i - 1] + significantX[i]) / 2);
    }
  }

  return boundaries.length > 0 ? boundaries : null;
}

/**
 * Convert positioned text items to line-ordered text.
 * Groups items by Y-position (same line), sorts each line by X.
 */
function positionedItemsToText(items) {
  if (items.length === 0) return '';

  // Sort top-to-bottom (Y descending in PDF coords), then left-to-right
  items.sort((a, b) => b.y - a.y || a.x - b.x);

  // Group into lines using half-height tolerance
  const avgHeight = items.reduce((s, i) => s + i.height, 0) / items.length || 10;
  const tolerance = avgHeight * 0.5;

  const lines = [];
  let line = [items[0]];

  for (let i = 1; i < items.length; i++) {
    if (Math.abs(items[i].y - line[0].y) <= tolerance) {
      line.push(items[i]);
    } else {
      lines.push(line);
      line = [items[i]];
    }
  }
  lines.push(line);

  return lines
    .map(l => {
      l.sort((a, b) => a.x - b.x);
      return l.map(i => i.text).join(' ');
    })
    .join('\n');
}

/**
 * Smart truncation that doesn't cut mid-clause
 */
function smartTruncate(text, maxLength = 50000) {
  if (!text || text.length <= maxLength) return text;

  // Find the last section break before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSectionBreak = Math.max(
    truncated.lastIndexOf('\n§'),
    truncated.lastIndexOf('\n\n'),
    truncated.lastIndexOf('\nArtikel'),
    truncated.lastIndexOf('\nAbschnitt')
  );

  if (lastSectionBreak > maxLength * 0.8) {
    return text.substring(0, lastSectionBreak).trim();
  }

  return truncated.trim();
}

module.exports = {
  preSplitClauses,
  smartTruncate,
  normalizePdfText,
  hasColumnArtifacts,
  extractColumnAwareText
};

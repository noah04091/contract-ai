/**
 * Clause Splitter - Regex-based pre-splitting of contract text
 *
 * Handles German contract patterns (§ N, Absatz N, numbered sections).
 * Used as a pre-processing hint for the GPT clause extraction stage.
 */

/**
 * Normalize common PDF extraction artifacts before any processing.
 * - Merges hyphenated line breaks from multi-column PDFs ("erbrin-\ngung" → "erbringung")
 * - Only matches genuine mid-word hyphenation (lowercase-hyphen-newline-lowercase)
 */
function normalizePdfText(text) {
  if (!text) return text;
  return text.replace(/([a-zäöüß])-\n([a-zäöüß])/g, '$1$2');
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
  normalizePdfText
};

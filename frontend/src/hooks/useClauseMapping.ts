/**
 * useClauseMapping — PDF Text-Layer → Clause-Regions Mapping
 *
 * Scannt die text-layer Spans einer gerenderten PDF-Seite,
 * matched sie gegen geparste Klauseln und berechnet Bounding Boxes.
 */

import { useState, useCallback, useRef } from 'react';
import type { ClauseRegion, ParsedClauseV2 } from '../types/legalLensV2';

// Deutsche Stoppwörter
const STOP_WORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines',
  'und', 'oder', 'aber', 'auch', 'als', 'auf', 'aus', 'bei', 'bis', 'für',
  'mit', 'nach', 'über', 'von', 'vor', 'zum', 'zur', 'sich', 'ist', 'sind',
  'wird', 'hat', 'kann', 'soll', 'muss', 'darf', 'nicht', 'dass',
  'wenn', 'wie', 'was', 'wer', 'wir', 'sie', 'ihr', 'ihm', 'uns', 'ich'
]);

/**
 * Normalisiert Text für Vergleiche
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrahiert signifikante Wörter (4+ Zeichen, keine Stoppwörter)
 */
function getSignificantWords(text: string, count: number = 6): string[] {
  return text
    .replace(/[§()[\]{}"'„"«»\d]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, count)
    .map(w => w.toLowerCase());
}

/**
 * Berechnet das umschließende Rechteck einer Gruppe von Elementen,
 * relativ zum Container.
 */
function calculateBoundingBox(
  elements: Element[],
  containerRect: DOMRect
): { top: number; left: number; width: number; height: number } {
  if (elements.length === 0) {
    return { top: 0, left: 0, width: 0, height: 0 };
  }

  let minTop = Infinity;
  let minLeft = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    minTop = Math.min(minTop, rect.top - containerRect.top);
    minLeft = Math.min(minLeft, rect.left - containerRect.left);
    maxRight = Math.max(maxRight, rect.right - containerRect.left);
    maxBottom = Math.max(maxBottom, rect.bottom - containerRect.top);
  }

  return {
    top: minTop,
    left: minLeft,
    width: maxRight - minLeft,
    height: maxBottom - minTop
  };
}

/**
 * Findet den besten Match-Anchor für eine Klausel im Seitentext
 */
function findClauseInPage(
  clause: ParsedClauseV2,
  pageSpans: Element[],
  pageText: string,
  pageTextNorm: string
): { startIdx: number; endIdx: number } | null {
  // Strategie 1: Anchor-Text aus matchingData verwenden
  const firstWords = clause.matchingData?.firstWords || [];
  const anchorText = clause.position?.anchorText || '';

  if (firstWords.length > 0) {
    // Suche erste signifikante Wörter im normalisierten Seitentext
    const searchTerms = firstWords.map(w => w.toLowerCase());
    const wordsToFind = searchTerms.slice(0, 3).join('.*?');
    const regex = new RegExp(wordsToFind, 'i');
    const match = pageTextNorm.match(regex);

    if (match && match.index !== undefined) {
      // Finde Span-Bereich der zum Match gehört
      return findSpanRange(pageSpans, match.index, clause.matchingData?.charLength || clause.text.length, pageText);
    }
  }

  // Strategie 2: Direkter Textvergleich mit Anchor
  if (anchorText.length > 20) {
    const normAnchor = normalizeText(anchorText);
    const idx = pageTextNorm.indexOf(normAnchor);

    if (idx !== -1) {
      return findSpanRange(pageSpans, idx, clause.matchingData?.charLength || clause.text.length, pageText);
    }
  }

  // Strategie 3: Fallback — signifikante Wörter der Klausel
  const clauseWords = getSignificantWords(clause.text, 6);
  if (clauseWords.length < 3) return null;

  // Finde Span mit den meisten Matches
  let bestSpanIdx = -1;
  let bestScore = 0;

  const spanTexts = pageSpans.map(s => (s.textContent || '').toLowerCase());
  for (let i = 0; i < spanTexts.length; i++) {
    const windowText = spanTexts.slice(i, Math.min(i + 10, spanTexts.length)).join(' ');
    const matchCount = clauseWords.filter(w => windowText.includes(w)).length;

    if (matchCount > bestScore && matchCount >= 3) {
      bestScore = matchCount;
      bestSpanIdx = i;
    }
  }

  if (bestSpanIdx === -1) return null;

  // Erweitere den Bereich basierend auf erwarteter Textlänge
  const expectedLength = clause.matchingData?.charLength || clause.text.length;
  let endIdx = bestSpanIdx;
  let accumulatedLength = 0;

  while (endIdx < pageSpans.length && accumulatedLength < expectedLength) {
    accumulatedLength += (pageSpans[endIdx].textContent || '').length + 1;
    endIdx++;
  }

  return { startIdx: bestSpanIdx, endIdx: Math.min(endIdx, pageSpans.length - 1) };
}

/**
 * Konvertiert einen Char-Offset im verketteten Seitentext zu Span-Indizes
 */
function findSpanRange(
  spans: Element[],
  charOffset: number,
  expectedLength: number,
  _fullText: string
): { startIdx: number; endIdx: number } | null {
  let currentOffset = 0;
  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < spans.length; i++) {
    const spanLength = (spans[i].textContent || '').length + 1; // +1 für Leerzeichen

    if (startIdx === -1 && currentOffset + spanLength > charOffset) {
      startIdx = i;
    }

    if (startIdx !== -1 && currentOffset >= charOffset + expectedLength * 0.7) {
      endIdx = i;
      break;
    }

    currentOffset += spanLength;
  }

  if (startIdx === -1) return null;
  if (endIdx === -1) endIdx = Math.min(startIdx + 20, spans.length - 1);

  return { startIdx, endIdx };
}

/**
 * Hook: Mappt Klauseln auf PDF-Seiten-Overlays
 */
export function useClauseMapping() {
  const [regionsByPage, setRegionsByPage] = useState<Record<number, ClauseRegion[]>>({});
  const processedPagesRef = useRef<Set<number>>(new Set());

  /**
   * Wird aufgerufen wenn eine PDF-Seite gerendert wurde.
   * Scannt die Text-Layer-Spans und berechnet Clause-Regions.
   */
  const mapPageClauses = useCallback((
    pageNumber: number,
    pageElement: HTMLElement,
    clauses: ParsedClauseV2[]
  ) => {
    // Verhindere doppelte Verarbeitung
    if (processedPagesRef.current.has(pageNumber)) return;

    const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) return;

    const spans = Array.from(textLayer.querySelectorAll('span'));
    if (spans.length === 0) return;

    const pageRect = pageElement.getBoundingClientRect();

    // Seitentext aufbauen
    const pageText = spans.map(s => s.textContent || '').join(' ');
    const pageTextNorm = normalizeText(pageText);

    // Klauseln filtern die auf dieser Seite sein könnten
    const candidateClauses = clauses.filter(c => {
      if (c.nonAnalyzable) return false;
      // Geschätzte Seite als Hinweis nutzen (+/- 2 Seiten Toleranz)
      const estPage = c.position?.estimatedPage || 1;
      return Math.abs(estPage - pageNumber) <= 2 || estPage === 0;
    });

    const regions: ClauseRegion[] = [];

    for (const clause of candidateClauses) {
      const match = findClauseInPage(clause, spans, pageText, pageTextNorm);
      if (!match) continue;

      const matchedSpans = spans.slice(match.startIdx, match.endIdx + 1);
      const boundingBox = calculateBoundingBox(matchedSpans, pageRect);

      // Nur gültige Regionen hinzufügen
      if (boundingBox.width > 10 && boundingBox.height > 5) {
        regions.push({
          clauseId: clause.id,
          pageNumber,
          boundingBox,
          riskLevel: clause.riskIndicators?.level || 'none'
        });
      }
    }

    if (regions.length > 0) {
      processedPagesRef.current.add(pageNumber);
      setRegionsByPage(prev => ({ ...prev, [pageNumber]: regions }));
    }
  }, []);

  /**
   * Aktualisiert die Risiko-Level der Regionen basierend auf neuen Analysen
   */
  const updateRegionRiskLevels = useCallback((analysesMap: Record<string, { riskLevel: string }>) => {
    setRegionsByPage(prev => {
      const updated: Record<number, ClauseRegion[]> = {};
      for (const [pageNum, regions] of Object.entries(prev)) {
        updated[Number(pageNum)] = regions.map(region => {
          const analysis = analysesMap[region.clauseId];
          if (analysis) {
            return { ...region, riskLevel: analysis.riskLevel as ClauseRegion['riskLevel'] };
          }
          return region;
        });
      }
      return updated;
    });
  }, []);

  /**
   * Setzt alle Mappings zurück (z.B. bei Zoom-Änderung)
   */
  const resetMappings = useCallback(() => {
    processedPagesRef.current.clear();
    setRegionsByPage({});
  }, []);

  return {
    regionsByPage,
    mapPageClauses,
    updateRegionRiskLevels,
    resetMappings
  };
}

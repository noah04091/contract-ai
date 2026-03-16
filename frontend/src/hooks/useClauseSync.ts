/**
 * useClauseSync — Klausel-Auswahl + Scroll-Sync zwischen PDF/Text Views
 */

import { useState, useCallback, useRef } from 'react';
import type { UseClauseSyncReturn } from '../types/legalLensV2';

export function useClauseSync(): UseClauseSyncReturn {
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [hoveredClauseId, setHoveredClauseId] = useState<string | null>(null);

  const pdfContainerRef = useRef<HTMLDivElement>(null!);
  const textContainerRef = useRef<HTMLDivElement>(null!);

  const scrollToClause = useCallback((clauseId: string, container: HTMLDivElement | null) => {
    if (!container) return;

    const element = container.querySelector(`[data-clause-id="${clauseId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Pulse-Highlight damit der User sieht wohin gesprungen wurde
      element.classList.add('clauseHighlightPulse');
      setTimeout(() => element.classList.remove('clauseHighlightPulse'), 1500);
    }
  }, []);

  const selectClause = useCallback((clauseId: string, source: 'pdf' | 'text' | 'navigator') => {
    setSelectedClauseId(clauseId);

    // Andere Ansicht synchron scrollen
    if (source !== 'pdf') {
      scrollToClause(clauseId, pdfContainerRef.current);
    }
    if (source !== 'text') {
      scrollToClause(clauseId, textContainerRef.current);
    }
  }, [scrollToClause]);

  const hoverClause = useCallback((clauseId: string | null) => {
    setHoveredClauseId(clauseId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedClauseId(null);
    setHoveredClauseId(null);
  }, []);

  return {
    selectedClauseId,
    hoveredClauseId,
    selectClause,
    hoverClause,
    clearSelection,
    pdfContainerRef,
    textContainerRef
  };
}

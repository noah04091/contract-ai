import { useCallback, useRef, useState } from 'react';
import type { ParsedClauseV2, AnalysesMap, V2Analysis } from '../../types/legalLensV2';
import ClauseBlock from './ClauseBlock';
import HoverTooltip from './HoverTooltip';
import styles from '../../styles/LegalLensV2.module.css';

interface TextExplorerViewProps {
  clauses: ParsedClauseV2[];
  analysesMap: AnalysesMap;
  selectedClauseId: string | null;
  hoveredClauseId: string | null;
  onSelectClause: (clauseId: string, source: 'text') => void;
  onHoverClause: (clauseId: string | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  filterRiskOnly: boolean;
  searchQuery: string;
}

export default function TextExplorerView({
  clauses,
  analysesMap,
  selectedClauseId,
  hoveredClauseId,
  onSelectClause,
  onHoverClause,
  containerRef,
  filterRiskOnly,
  searchQuery
}: TextExplorerViewProps) {
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipData, setTooltipData] = useState<{ analysis: V2Analysis; title: string | null } | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Klauseln filtern
  const filteredClauses = clauses.filter(clause => {
    // Risiko-Filter
    if (filterRiskOnly) {
      const analysis = analysesMap[clause.id];
      if (!analysis || analysis.riskLevel === 'low') return false;
    }

    // Such-Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return clause.text.toLowerCase().includes(q) ||
        clause.title?.toLowerCase().includes(q) ||
        false;
    }

    return true;
  });

  const handleHoverStart = useCallback((clauseId: string) => {
    onHoverClause(clauseId);

    // Tooltip nach 300ms Delay anzeigen
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      const analysis = analysesMap[clauseId];
      const clause = clauses.find(c => c.id === clauseId);
      if (analysis) {
        setTooltipData({ analysis, title: clause?.title || null });
      }
    }, 300);
  }, [onHoverClause, analysesMap, clauses]);

  const handleHoverEnd = useCallback(() => {
    onHoverClause(null);
    clearTimeout(hoverTimeoutRef.current);
    setTooltipData(null);
  }, [onHoverClause]);

  const handleSelect = useCallback((clauseId: string) => {
    onSelectClause(clauseId, 'text');
    setTooltipData(null);
  }, [onSelectClause]);

  // Maus-Position tracken für Tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.textExplorer}
      onMouseMove={handleMouseMove}
    >
      <div className={styles.textExplorerContent}>
        {filteredClauses.length === 0 && (
          <div className={styles.textExplorerEmpty}>
            {searchQuery
              ? `Keine Klauseln gefunden für "${searchQuery}"`
              : filterRiskOnly
                ? 'Keine risikobehafteten Klauseln gefunden'
                : 'Keine Klauseln verfügbar'
            }
          </div>
        )}

        {filteredClauses.map(clause => (
          <ClauseBlock
            key={clause.id}
            clause={clause}
            analysis={analysesMap[clause.id] || null}
            isSelected={selectedClauseId === clause.id}
            isHovered={hoveredClauseId === clause.id}
            onSelect={handleSelect}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
          />
        ))}
      </div>

      {/* Hover Tooltip */}
      {tooltipData && (
        <HoverTooltip
          analysis={tooltipData.analysis}
          clauseTitle={tooltipData.title}
          position={tooltipPos}
          visible={!!tooltipData}
        />
      )}
    </div>
  );
}

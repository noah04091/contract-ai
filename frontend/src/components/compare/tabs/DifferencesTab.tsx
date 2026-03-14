import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle, AlertTriangle, AlertCircle, Info,
  ChevronUp, ChevronDown, Eye, EyeOff,
  Scale, Zap, X
} from 'lucide-react';
import {
  ComparisonResult, ComparisonResultV2, isV2Result,
  EnhancedDifference, ComparisonDifference,
  ClauseArea, CLAUSE_AREA_LABELS,
  SEMANTIC_TYPE_LABELS, SEMANTIC_TYPE_COLORS,
} from '../../../types/compare';
import PDFDocumentViewer from '../../PDFDocumentViewer';
import styles from '../../../styles/Compare.module.css';

interface DifferencesTabProps {
  result: ComparisonResult;
  file1: File | null;
  file2: File | null;
}

export default function DifferencesTab({ result, file1, file2 }: DifferencesTabProps) {
  const v2 = isV2Result(result);
  const v2Result = v2 ? (result as ComparisonResultV2) : null;

  const differences = v2Result ? v2Result.differences : result.differences;
  const recommended = result.overallRecommendation.recommended;

  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [showSideBySide, setShowSideBySide] = useState(true);
  const [activeDiffIndex, setActiveDiffIndex] = useState(0);
  const [expandedQuoteIndex, setExpandedQuoteIndex] = useState<number | null>(null);
  const [expandedPdfIndex, setExpandedPdfIndex] = useState<number | null>(null);
  const [activePdfTab, setActivePdfTab] = useState<1 | 2>(1);
  const diffRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Group by clauseArea for V2
  const clauseAreas = v2 && v2Result
    ? [...new Set(v2Result.differences.map(d => d.clauseArea))]
    : [];

  // Category list for V1
  const categories = !v2
    ? [...new Set(result.differences.map(d => d.category))]
    : [];

  // Filtered differences
  const filteredDifferences = selectedArea === 'all'
    ? differences
    : v2
      ? (v2Result?.differences || []).filter(d => d.clauseArea === selectedArea)
      : result.differences.filter(d => d.category === selectedArea);

  useEffect(() => {
    setActiveDiffIndex(0);
    setExpandedQuoteIndex(null);
  }, [selectedArea]);

  const scrollToActiveDiff = (index: number) => {
    diffRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const goToPrevious = () => {
    const newIndex = activeDiffIndex > 0 ? activeDiffIndex - 1 : filteredDifferences.length - 1;
    setActiveDiffIndex(newIndex);
    scrollToActiveDiff(newIndex);
  };

  const goToNext = () => {
    const newIndex = activeDiffIndex < filteredDifferences.length - 1 ? activeDiffIndex + 1 : 0;
    setActiveDiffIndex(newIndex);
    scrollToActiveDiff(newIndex);
  };

  // Severity stats
  const severityStats = {
    critical: filteredDifferences.filter(d => d.severity === 'critical').length,
    high: filteredDifferences.filter(d => d.severity === 'high').length,
    medium: filteredDifferences.filter(d => d.severity === 'medium').length,
    low: filteredDifferences.filter(d => d.severity === 'low').length,
  };

  return (
    <div className={styles.differencesTab}>
      {/* Severity Overview */}
      <div className={styles.severityOverview}>
        {severityStats.critical > 0 && (
          <span className={`${styles.statBadge} ${styles.statCritical}`}>
            <AlertTriangle size={12} /> {severityStats.critical} Kritisch
          </span>
        )}
        {severityStats.high > 0 && (
          <span className={`${styles.statBadge} ${styles.statHigh}`}>
            <AlertCircle size={12} /> {severityStats.high} Hoch
          </span>
        )}
        {severityStats.medium > 0 && (
          <span className={`${styles.statBadge} ${styles.statMedium}`}>
            <AlertTriangle size={12} /> {severityStats.medium} Mittel
          </span>
        )}
        {severityStats.low > 0 && (
          <span className={`${styles.statBadge} ${styles.statLow}`}>
            <CheckCircle size={12} /> {severityStats.low} Niedrig
          </span>
        )}
      </div>

      {/* Filter + Navigation */}
      <div className={styles.diffToolbar}>
        <div className={styles.categoryFilter}>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className={styles.categorySelect}
          >
            <option value="all">Alle Bereiche ({differences.length})</option>
            {v2 ? (
              clauseAreas.map(area => (
                <option key={area} value={area}>
                  {CLAUSE_AREA_LABELS[area as ClauseArea] || area} (
                  {(v2Result?.differences || []).filter(d => d.clauseArea === area).length})
                </option>
              ))
            ) : (
              categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat} ({result.differences.filter(d => d.category === cat).length})
                </option>
              ))
            )}
          </select>
        </div>

        {filteredDifferences.length > 1 && (
          <div className={styles.diffNavigation}>
            <button className={styles.navButton} onClick={goToPrevious} title="Vorheriger (Alt+Up)">
              <ChevronUp size={18} />
            </button>
            <span className={styles.navCounter}>
              {activeDiffIndex + 1} / {filteredDifferences.length}
            </span>
            <button className={styles.navButton} onClick={goToNext} title="Nächster (Alt+Down)">
              <ChevronDown size={18} />
            </button>
          </div>
        )}

        <div className={styles.viewToggles}>
          <button
            className={styles.viewToggle}
            onClick={() => setShowSideBySide(!showSideBySide)}
          >
            {showSideBySide ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showSideBySide ? 'Liste' : 'Vergleich'}</span>
          </button>
        </div>
      </div>

      {/* Differences List */}
      <div className={styles.differencesList}>
        {filteredDifferences.map((diff, index) => {
          const isActive = index === activeDiffIndex;
          const sevColor = getSeverityColor(diff.severity);
          const SevIcon = getSeverityIcon(diff.severity);
          const v2Diff = v2 ? (diff as EnhancedDifference) : null;

          return (
            <div
              key={index}
              ref={(el) => { diffRefs.current[index] = el; }}
              className={`${styles.diffItem} ${isActive ? styles.diffItemActive : ''}`}
              style={{ borderLeftColor: sevColor }}
              onClick={() => setActiveDiffIndex(index)}
            >
              {/* Header */}
              <div className={styles.diffItemHeader}>
                <div className={styles.diffSectionInfo}>
                  <span className={styles.categoryBadge}>{diff.category}</span>
                  {v2Diff && (
                    <span
                      className={styles.semanticBadge}
                      style={{
                        backgroundColor: `${SEMANTIC_TYPE_COLORS[v2Diff.semanticType]}15`,
                        color: SEMANTIC_TYPE_COLORS[v2Diff.semanticType],
                      }}
                    >
                      {SEMANTIC_TYPE_LABELS[v2Diff.semanticType]}
                    </span>
                  )}
                  <h4 className={styles.diffSection}>{diff.section}</h4>
                </div>
                <div className={styles.diffHeaderActions}>
                  <button
                    className={`${styles.pdfPreviewBtn} ${expandedPdfIndex === index ? styles.pdfPreviewBtnActive : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedPdfIndex(expandedPdfIndex === index ? null : index);
                      setActivePdfTab(1);
                    }}
                    disabled={!file1 && !file2}
                    title={file1 || file2 ? 'PDF-Vorschau' : 'Nur bei frischem Vergleich'}
                  >
                    <Eye size={13} />
                    PDF
                  </button>
                  <span className={styles.severityBadge} style={{ backgroundColor: sevColor }}>
                    <SevIcon size={13} />
                    {diff.severity}
                  </span>
                </div>
              </div>

              {/* Explanation */}
              <div className={styles.diffExplanation}>
                {diff.explanation || (diff as ComparisonDifference).impact}
              </div>

              {/* Impact */}
              {diff.explanation && (diff as ComparisonDifference).impact && (
                <div className={styles.diffImpact}>
                  <Scale size={13} />
                  <span>{(diff as ComparisonDifference).impact}</span>
                </div>
              )}

              {/* Financial Impact (V2) */}
              {v2Diff?.financialImpact && (
                <div className={styles.diffFinancial}>
                  <span>Finanzieller Einfluss: {v2Diff.financialImpact}</span>
                </div>
              )}

              {/* Original Text Toggle */}
              <button
                className={styles.showQuotesBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedQuoteIndex(expandedQuoteIndex === index ? null : index);
                }}
              >
                {expandedQuoteIndex === index ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Originaltext anzeigen
              </button>

              {expandedQuoteIndex === index && (
                <div className={styles.quotesPanel}>
                  {showSideBySide ? (
                    <SideBySideQuotes
                      contract1={diff.contract1}
                      contract2={diff.contract2}
                      showDiff={false}
                      recommended={recommended}
                      sevColor={sevColor}
                    />
                  ) : (
                    <div className={styles.stackedQuotes}>
                      <div className={styles.quoteBlock}><strong>Vertrag 1:</strong> {diff.contract1}</div>
                      <div className={styles.quoteBlock}><strong>Vertrag 2:</strong> {diff.contract2}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendation */}
              <div className={styles.diffRecommendation}>
                <Zap size={14} />
                <span>{diff.recommendation}</span>
              </div>

              {/* PDF Preview */}
              {expandedPdfIndex === index && (file1 || file2) && (
                <div className={styles.pdfPreviewPanel}>
                  <div className={styles.pdfPreviewTabs}>
                    <button
                      className={`${styles.pdfTab} ${activePdfTab === 1 ? styles.pdfTabActive : ''}`}
                      onClick={(e) => { e.stopPropagation(); setActivePdfTab(1); }}
                      disabled={!file1}
                    >Vertrag 1</button>
                    <button
                      className={`${styles.pdfTab} ${activePdfTab === 2 ? styles.pdfTabActive : ''}`}
                      onClick={(e) => { e.stopPropagation(); setActivePdfTab(2); }}
                      disabled={!file2}
                    >Vertrag 2</button>
                    <button
                      className={`${styles.pdfTab} ${styles.pdfTabClose}`}
                      onClick={(e) => { e.stopPropagation(); setExpandedPdfIndex(null); }}
                    ><X size={14} /></button>
                  </div>
                  <div className={styles.pdfPreviewViewer} onClick={(e) => e.stopPropagation()}>
                    <PDFDocumentViewer
                      file={activePdfTab === 1 ? file1 : file2}
                      highlightText={activePdfTab === 1 ? diff.contract1 : diff.contract2}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Side-by-Side Quotes (plain text, no diff)
// ============================================
function SideBySideQuotes({
  contract1,
  contract2,
  recommended,
  sevColor,
}: {
  contract1: string;
  contract2: string;
  showDiff: boolean;
  recommended: 1 | 2;
  sevColor: string;
}) {
  return (
    <div className={styles.sideBySideContent}>
      <div className={`${styles.contractColumn} ${recommended === 1 ? styles.columnRecommended : ''}`}>
        <h5>Vertrag 1 {recommended === 1 && <span className={styles.recBadge}>&#10003;</span>}</h5>
        <div className={styles.contractText}>
          {contract1 || <em style={{ color: '#8e8e93' }}>Kein Originaltext verfügbar</em>}
        </div>
      </div>
      <div className={styles.vsDivider} style={{ backgroundColor: sevColor }}>
        <span>VS</span>
      </div>
      <div className={`${styles.contractColumn} ${recommended === 2 ? styles.columnRecommended : ''}`}>
        <h5>Vertrag 2 {recommended === 2 && <span className={styles.recBadge}>&#10003;</span>}</h5>
        <div className={styles.contractText}>
          {contract2 || <em style={{ color: '#8e8e93' }}>Kein Originaltext verfügbar</em>}
        </div>
      </div>
    </div>
  );
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#d70015';
    case 'high': return '#ff453a';
    case 'medium': return '#ff9500';
    case 'low': return '#34c759';
    default: return '#6e6e73';
  }
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'critical': return AlertTriangle;
    case 'high': return AlertCircle;
    case 'medium': return AlertTriangle;
    case 'low': return CheckCircle;
    default: return Info;
  }
}

/**
 * Legal Lens V2 — Interaktiver Vertrags-Explorer
 *
 * Eigenständige Seite unter /legal-lens-v2/:contractId
 * Nicht verlinkt in der Navigation — reine Entwicklungsseite.
 *
 * Architektur: On-Demand-Analyse wie V1.
 * Klick auf PDF-Text oder Klausel → sofortige Streaming-Analyse via V1-API.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLegalLensV2 } from '../hooks/useLegalLensV2';
import { useClauseSync } from '../hooks/useClauseSync';
import { fetchWithAuth, API_BASE_URL } from '../context/authUtils';
import { analyzeClauseStreaming } from '../services/legalLensV2API';
import type { ViewMode } from '../types/legalLensV2';

// Components
import V2Header from '../components/LegalLensV2/V2Header';
import PdfExplorerView from '../components/LegalLensV2/PdfExplorerView';
import TextExplorerView from '../components/LegalLensV2/TextExplorerView';
import AnalysisPanelV2 from '../components/LegalLensV2/AnalysisPanelV2';
import ClauseNavigator from '../components/LegalLensV2/ClauseNavigator';

import styles from '../styles/LegalLensV2.module.css';

// Simple content hash for cache keys
function hashText(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 500);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export default function LegalLensV2() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('pdf');
  const [filterRiskOnly, setFilterRiskOnly] = useState(false);
  const [searchQuery] = useState('');
  const [navOpen, setNavOpen] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // On-demand analysis state
  const [adHocClause, setAdHocClause] = useState<{
    id: string;
    text: string;
    title: string | null;
    mode: string;
  } | null>(null);
  const [isAnalyzingOnDemand, setIsAnalyzingOnDemand] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [onDemandAnalysis, setOnDemandAnalysis] = useState<Record<string, unknown> | null>(null);

  // Analysis cache (content-hash based, survives across selections)
  const analysisCacheRef = useRef<Map<string, Record<string, unknown>>>(new Map());
  const abortAnalysisRef = useRef<(() => void) | null>(null);
  const analysisRequestIdRef = useRef(0);

  // Hooks
  const {
    contract,
    clauses,
    analysesMap,
    isLoadingContract,
    isLoadingClauses,
    isAnalyzing,
    analysisProgress,
    isComplete,
    error,
    stats,
    overallRiskScore,
    worstClause,
    startBatchAnalysis
  } = useLegalLensV2(contractId);

  const {
    selectedClauseId,
    hoveredClauseId,
    selectClause,
    hoverClause,
    clearSelection: clearClauseSelection,
    pdfContainerRef,
    textContainerRef
  } = useClauseSync();

  // PDF-URL laden — auto-switch to text wenn PDF nicht verfügbar
  useEffect(() => {
    if (!contract?.s3Key) {
      if (viewMode === 'pdf') setViewMode('text');
      return;
    }

    const loadPdfUrl = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/s3/view?key=${encodeURIComponent(contract.s3Key!)}`);
        if (response.ok) {
          const data = await response.json();
          setPdfUrl(data.url);
        } else {
          if (viewMode === 'pdf') setViewMode('text');
        }
      } catch {
        if (viewMode === 'pdf') setViewMode('text');
      }
    };

    loadPdfUrl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.s3Key]);

  // Batch-Analyse automatisch starten wenn Klauseln geladen aber nicht analysiert
  useEffect(() => {
    if (clauses?.length > 0 && !isComplete && !isAnalyzing && Object.keys(analysesMap || {}).length === 0) {
      startBatchAnalysis();
    }
  }, [clauses?.length, isComplete, isAnalyzing, analysesMap, startBatchAnalysis]);

  // Ausgewählte Klausel + Analyse + Position (for batch/navigator mode)
  const selectedClause = useMemo(
    () => clauses?.find(c => c.id === selectedClauseId) || null,
    [clauses, selectedClauseId]
  );
  const selectedClauseIndex = useMemo(
    () => selectedClauseId ? clauses?.findIndex(c => c.id === selectedClauseId) ?? -1 : -1,
    [clauses, selectedClauseId]
  );
  const selectedAnalysis = selectedClauseId ? analysesMap[selectedClauseId] || null : null;
  const analyzableClauses = useMemo(
    () => (clauses || []).filter(c => !c.nonAnalyzable).length,
    [clauses]
  );

  // ============================================================
  // On-Demand Analysis — triggered by PDF text click or text view click
  // ============================================================

  const triggerOnDemandAnalysis = useCallback((text: string, mode: string) => {
    if (!contractId || text.length < 10) return;

    // Abort any running analysis
    if (abortAnalysisRef.current) {
      abortAnalysisRef.current();
      abortAnalysisRef.current = null;
    }

    // Clear batch selection
    clearClauseSelection();

    const requestId = ++analysisRequestIdRef.current;
    const contentHash = hashText(text);
    const clauseId = `adhoc-${contentHash}`;

    // Check cache first
    const cached = analysisCacheRef.current.get(contentHash);
    if (cached) {
      setAdHocClause({ id: clauseId, text, title: null, mode });
      setOnDemandAnalysis(cached);
      setStreamingText('');
      setIsAnalyzingOnDemand(false);
      return;
    }

    // Start fresh analysis
    setAdHocClause({ id: clauseId, text, title: null, mode });
    setStreamingText('');
    setOnDemandAnalysis(null);
    setIsAnalyzingOnDemand(true);

    const abort = analyzeClauseStreaming(
      contractId,
      clauseId,
      text,
      'neutral',
      // onChunk
      (chunk) => {
        if (analysisRequestIdRef.current !== requestId) return;
        setStreamingText(prev => prev + chunk);
      },
      // onComplete
      (analysis) => {
        if (analysisRequestIdRef.current !== requestId) return;
        analysisCacheRef.current.set(contentHash, analysis);
        setOnDemandAnalysis(analysis);
        setIsAnalyzingOnDemand(false);
      },
      // onError
      (err) => {
        if (analysisRequestIdRef.current !== requestId) return;
        console.error('[LegalLensV2] On-demand analysis error:', err);
        setIsAnalyzingOnDemand(false);
      }
    );

    abortAnalysisRef.current = abort;
  }, [contractId, clearClauseSelection]);

  // ============================================================
  // PDF text selection handler
  // ============================================================

  const handlePdfTextSelected = useCallback((text: string, mode: string) => {
    triggerOnDemandAnalysis(text, mode);
  }, [triggerOnDemandAnalysis]);

  // ============================================================
  // Text view clause selection — triggers on-demand analysis
  // ============================================================

  const handleSelectFromText = useCallback((clauseId: string) => {
    const clause = clauses?.find(c => c.id === clauseId);
    if (!clause) return;

    // If we already have a batch analysis, use that
    if (analysesMap[clauseId]) {
      setAdHocClause(null);
      setStreamingText('');
      setOnDemandAnalysis(null);
      setIsAnalyzingOnDemand(false);
      selectClause(clauseId, 'text');
      return;
    }

    // Otherwise trigger on-demand
    triggerOnDemandAnalysis(clause.text, 'paragraph');
  }, [clauses, analysesMap, selectClause, triggerOnDemandAnalysis]);

  // ============================================================
  // Navigator clause selection — use batch if available, else on-demand
  // ============================================================

  const handleSelectFromNav = useCallback((clauseId: string) => {
    const clause = clauses?.find(c => c.id === clauseId);
    if (!clause) return;

    if (analysesMap[clauseId]) {
      setAdHocClause(null);
      setStreamingText('');
      setOnDemandAnalysis(null);
      setIsAnalyzingOnDemand(false);
      selectClause(clauseId, 'navigator');
      return;
    }

    triggerOnDemandAnalysis(clause.text, 'paragraph');
  }, [clauses, analysesMap, selectClause, triggerOnDemandAnalysis]);

  // ============================================================
  // Close handler — clears both batch and ad-hoc
  // ============================================================

  const handleClosePanel = useCallback(() => {
    if (abortAnalysisRef.current) {
      abortAnalysisRef.current();
      abortAnalysisRef.current = null;
    }
    clearClauseSelection();
    setAdHocClause(null);
    setStreamingText('');
    setOnDemandAnalysis(null);
    setIsAnalyzingOnDemand(false);
  }, [clearClauseSelection]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleNavigateClause = useCallback((direction: 'prev' | 'next') => {
    if (!clauses || clauses.length === 0 || selectedClauseIndex < 0) return;
    const newIndex = direction === 'prev' ? selectedClauseIndex - 1 : selectedClauseIndex + 1;
    if (newIndex >= 0 && newIndex < clauses.length) {
      handleSelectFromNav(clauses[newIndex].id);
    }
  }, [clauses, selectedClauseIndex, handleSelectFromNav]);

  // Keyboard Navigation — J/K oder Arrow Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedClauseIndex < 0 && clauses?.length) {
          handleSelectFromNav(clauses[0].id);
        } else {
          handleNavigateClause('next');
        }
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedClauseIndex < 0 && clauses?.length) {
          handleSelectFromNav(clauses[clauses.length - 1].id);
        } else {
          handleNavigateClause('prev');
        }
      } else if (e.key === 'Escape') {
        handleClosePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clauses, selectedClauseIndex, handleSelectFromNav, handleNavigateClause, handleClosePanel]);

  // Loading State — Skeleton UI
  if (isLoadingContract || isLoadingClauses) {
    return (
      <div className={styles.v2LoadingPage}>
        <div className={styles.v2LoadingHeader}>
          <div className={styles.v2LoadingSkeleton} style={{ width: 200, height: 24 }} />
          <div className={styles.v2LoadingSkeleton} style={{ width: 120, height: 16, marginTop: 8 }} />
        </div>
        <div className={styles.v2LoadingContent}>
          <div className={styles.v2LoadingSidebar}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.v2LoadingSkeletonItem}>
                <div className={styles.v2LoadingSkeleton} style={{ width: 12, height: 12, borderRadius: '50%' }} />
                <div className={styles.v2LoadingSkeleton} style={{ flex: 1, height: 14 }} />
              </div>
            ))}
          </div>
          <div className={styles.v2LoadingMain}>
            <div className={styles.v2LoadingProgressBar}>
              <div className={styles.v2LoadingProgressFill} />
            </div>
            <p className={styles.v2LoadingText}>
              {isLoadingClauses ? 'KI analysiert Ihren Vertrag...' : 'Vertrag wird geladen...'}
            </p>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.v2LoadingCard}>
                <div className={styles.v2LoadingSkeleton} style={{ width: '40%', height: 16 }} />
                <div className={styles.v2LoadingSkeleton} style={{ width: '100%', height: 12, marginTop: 8 }} />
                <div className={styles.v2LoadingSkeleton} style={{ width: '80%', height: 12, marginTop: 4 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={styles.v2Error}>
        <h2>Fehler</h2>
        <p>{error}</p>
        <button onClick={handleBack}>Zurück</button>
      </div>
    );
  }

  const isPanelOpen = !!selectedClauseId || !!adHocClause;

  return (
    <div className={styles.v2Page}>
      {/* Header */}
      <V2Header
        contractName={contract?.name || 'Vertrag'}
        overallRiskScore={overallRiskScore}
        stats={stats}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filterRiskOnly={filterRiskOnly}
        onFilterToggle={() => setFilterRiskOnly(f => !f)}
        onBack={handleBack}
        isAnalyzing={isAnalyzing}
        analysisProgress={analysisProgress}
        worstClause={worstClause}
        onSelectClause={handleSelectFromNav}
      />

      {/* Main Content */}
      <div className={styles.v2Main}>
        {/* Clause Navigator (links) */}
        <ClauseNavigator
          clauses={clauses}
          analysesMap={analysesMap}
          selectedClauseId={selectedClauseId}
          onSelectClause={handleSelectFromNav}
          isOpen={navOpen}
          onToggle={() => setNavOpen(n => !n)}
          filterRiskOnly={filterRiskOnly}
          searchQuery={searchQuery}
        />

        {/* Content Area */}
        <div className={`${styles.v2Content} ${isPanelOpen ? styles.v2Content_withPanel : ''}`}>
          {/* PDF View */}
          {(viewMode === 'pdf' || viewMode === 'split') && (
            <div className={viewMode === 'split' ? styles.v2SplitLeft : styles.v2FullView}>
              <PdfExplorerView
                pdfUrl={pdfUrl}
                onTextSelected={handlePdfTextSelected}
                containerRef={pdfContainerRef}
              />
            </div>
          )}

          {/* Text View */}
          {(viewMode === 'text' || viewMode === 'split') && (
            <div className={viewMode === 'split' ? styles.v2SplitRight : styles.v2FullView}>
              <TextExplorerView
                clauses={clauses}
                analysesMap={analysesMap}
                selectedClauseId={selectedClauseId}
                hoveredClauseId={hoveredClauseId}
                onSelectClause={handleSelectFromText}
                onHoverClause={hoverClause}
                containerRef={textContainerRef}
                filterRiskOnly={filterRiskOnly}
                searchQuery={searchQuery}
              />
            </div>
          )}
        </div>

        {/* Analysis Panel (rechts) */}
        <AnalysisPanelV2
          clause={selectedClause}
          analysis={selectedAnalysis}
          adHocClause={adHocClause}
          isAnalyzingOnDemand={isAnalyzingOnDemand}
          streamingText={streamingText}
          onDemandAnalysis={onDemandAnalysis}
          isOpen={isPanelOpen}
          onClose={handleClosePanel}
          contractId={contractId || ''}
          clauseIndex={selectedClauseIndex >= 0 ? selectedClauseIndex : undefined}
          totalClauses={analyzableClauses}
          onNavigate={handleNavigateClause}
        />
      </div>
    </div>
  );
}

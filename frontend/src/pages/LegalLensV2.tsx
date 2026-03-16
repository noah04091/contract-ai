/**
 * Legal Lens V2 — Interaktiver Vertrags-Explorer
 *
 * Eigenständige Seite unter /legal-lens-v2/:contractId
 * Nicht verlinkt in der Navigation — reine Entwicklungsseite.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLegalLensV2 } from '../hooks/useLegalLensV2';
import { useClauseSync } from '../hooks/useClauseSync';
import { fetchWithAuth, API_BASE_URL } from '../context/authUtils';
import type { ViewMode } from '../types/legalLensV2';

// Components
import V2Header from '../components/LegalLensV2/V2Header';
import PdfExplorerView from '../components/LegalLensV2/PdfExplorerView';
import TextExplorerView from '../components/LegalLensV2/TextExplorerView';
import AnalysisPanelV2 from '../components/LegalLensV2/AnalysisPanelV2';
import ClauseNavigator from '../components/LegalLensV2/ClauseNavigator';

import styles from '../styles/LegalLensV2.module.css';

export default function LegalLensV2() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('pdf');
  const [filterRiskOnly, setFilterRiskOnly] = useState(false);
  const [searchQuery] = useState('');
  const [navOpen, setNavOpen] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

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
    clearSelection,
    pdfContainerRef,
    textContainerRef
  } = useClauseSync();

  // PDF-URL laden — auto-switch to text wenn PDF nicht verfügbar
  useEffect(() => {
    if (!contract?.s3Key) {
      // Kein S3-Key → direkt auf Text-Ansicht wechseln
      if (viewMode === 'pdf') setViewMode('text');
      return;
    }

    const loadPdfUrl = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/s3/download-url/${encodeURIComponent(contract.s3Key!)}`);
        if (response.ok) {
          const data = await response.json();
          setPdfUrl(data.url || data.downloadUrl);
        } else {
          console.warn('[LegalLensV2] PDF-URL nicht verfügbar (Status:', response.status, ') — wechsle zu Text-Ansicht');
          if (viewMode === 'pdf') setViewMode('text');
        }
      } catch (err) {
        console.warn('[LegalLensV2] PDF-URL konnte nicht geladen werden:', err);
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

  // Ausgewählte Klausel + Analyse
  const selectedClause = useMemo(
    () => clauses?.find(c => c.id === selectedClauseId) || null,
    [clauses, selectedClauseId]
  );
  const selectedAnalysis = selectedClauseId ? analysesMap[selectedClauseId] || null : null;

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleSelectFromPdf = useCallback((clauseId: string) => {
    selectClause(clauseId, 'pdf');
  }, [selectClause]);

  const handleSelectFromText = useCallback((clauseId: string) => {
    selectClause(clauseId, 'text');
  }, [selectClause]);

  const handleSelectFromNav = useCallback((clauseId: string) => {
    selectClause(clauseId, 'navigator');
  }, [selectClause]);

  // Loading State
  if (isLoadingContract || isLoadingClauses) {
    return (
      <div className={styles.v2Loading}>
        <div className={styles.v2LoadingSpinner} />
        <p>{isLoadingClauses ? 'Klauseln werden analysiert...' : 'Vertrag wird geladen...'}</p>
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

  const isPanelOpen = !!selectedClauseId;

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
                clauses={clauses}
                analysesMap={analysesMap}
                selectedClauseId={selectedClauseId}
                hoveredClauseId={hoveredClauseId}
                onSelectClause={handleSelectFromPdf}
                onHoverClause={hoverClause}
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
          isOpen={isPanelOpen}
          onClose={clearSelection}
          contractId={contractId || ''}
        />
      </div>
    </div>
  );
}

// 📁 components/LegalLens/LegalLensViewer.tsx
// Haupt-Komponente für Legal Lens Feature

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Eye, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLegalLens } from '../../hooks/useLegalLens';
import ClauseList from './ClauseList';
import PerspectiveSwitcher from './PerspectiveSwitcher';
import AnalysisPanel from './AnalysisPanel';
import styles from '../../styles/LegalLens.module.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js Worker Setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ViewMode = 'text' | 'pdf';

interface LegalLensViewerProps {
  contractId: string;
  contractName?: string;
}

const LegalLensViewer: React.FC<LegalLensViewerProps> = ({
  contractId,
  contractName = 'Vertrag'
}) => {
  const navigate = useNavigate();

  // View Mode State
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  const {
    clauses,
    selectedClause,
    currentAnalysis,
    currentPerspective,
    progress,
    alternatives,
    negotiation,
    chatHistory,
    isParsing,
    isAnalyzing,
    isGeneratingAlternatives,
    isGeneratingNegotiation,
    isChatting,
    streamingText,
    error,
    parseContract,
    selectClause,
    analyzeClause,
    changePerspective,
    loadAlternatives,
    loadNegotiationTips,
    sendChatMessage,
    markClauseReviewed
  } = useLegalLens();

  // API URL Helper
  const getApiUrl = useCallback(() => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return 'https://api.contract-ai.de';
  }, []);

  // PDF URL laden wenn PDF-Modus aktiviert wird
  useEffect(() => {
    const loadPdfUrl = async () => {
      if (viewMode !== 'pdf' || pdfUrl) return;

      setPdfLoading(true);
      setPdfError(null);

      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/s3/view?contractId=${contractId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('PDF konnte nicht geladen werden');
        }

        const data = await response.json();
        setPdfUrl(data.url || data.fileUrl);
      } catch (err) {
        console.error('[Legal Lens] PDF Load Error:', err);
        setPdfError(err instanceof Error ? err.message : 'PDF Ladefehler');
      } finally {
        setPdfLoading(false);
      }
    };

    loadPdfUrl();
  }, [viewMode, contractId, getApiUrl, pdfUrl]);

  // Vertrag beim Laden parsen
  useEffect(() => {
    if (contractId) {
      parseContract(contractId);
    }
  }, [contractId, parseContract]);

  // Analyse starten wenn Klausel ausgewählt
  useEffect(() => {
    if (selectedClause && !currentAnalysis && !isAnalyzing) {
      analyzeClause(true);
    }
  }, [selectedClause, currentAnalysis, isAnalyzing, analyzeClause]);

  // Re-Analyse bei Perspektiv-Wechsel
  useEffect(() => {
    if (selectedClause && currentAnalysis) {
      analyzeClause(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPerspective]);

  // Klausel als gelesen markieren
  useEffect(() => {
    if (selectedClause && currentAnalysis) {
      markClauseReviewed(selectedClause.id);
    }
  }, [selectedClause, currentAnalysis, markClauseReviewed]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleRetryAnalysis = () => {
    if (selectedClause) {
      analyzeClause(true);
    }
  };

  // PDF Document Loaded
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // PDF Text Click Handler - Findet passende Klausel
  const handlePdfTextClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'SPAN' && target.closest('.react-pdf__Page__textContent')) {
      const clickedText = target.textContent || '';

      // Finde Klausel die diesen Text enthält
      const matchingClause = clauses.find(clause =>
        clause.text.toLowerCase().includes(clickedText.toLowerCase().trim()) ||
        clickedText.toLowerCase().includes(clause.text.toLowerCase().substring(0, 50))
      );

      if (matchingClause) {
        selectClause(matchingClause);
      }
    }
  };

  // Loading State
  if (isParsing) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingOverlay} style={{ flex: 1 }}>
          <div className={styles.loadingSpinner} />
          <span className={styles.loadingText}>Vertrag wird analysiert...</span>
        </div>
      </div>
    );
  }

  const percentComplete = progress?.percentComplete || 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={handleBack}>
            ← Zurück
          </button>
          <h1 className={styles.title}>🔍 Legal Lens: {contractName}</h1>
        </div>

        {/* View Mode Toggle */}
        <div className={styles.viewToggle} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#f1f5f9',
          borderRadius: '8px',
          padding: '4px'
        }}>
          <button
            onClick={() => setViewMode('text')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: viewMode === 'text' ? 'white' : 'transparent',
              color: viewMode === 'text' ? '#3b82f6' : '#64748b',
              boxShadow: viewMode === 'text' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <FileText size={16} />
            Vertragsinhalt
          </button>
          <button
            onClick={() => setViewMode('pdf')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: viewMode === 'pdf' ? 'white' : 'transparent',
              color: viewMode === 'pdf' ? '#3b82f6' : '#64748b',
              boxShadow: viewMode === 'pdf' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Eye size={16} />
            Original PDF
          </button>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.progressBar}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <span className={styles.progressText}>
              {percentComplete}% durchgesehen
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Left: Clause List OR PDF Viewer */}
        {viewMode === 'text' ? (
          <ClauseList
            clauses={clauses}
            selectedClause={selectedClause}
            progress={progress}
            onSelectClause={selectClause}
          />
        ) : (
          <div className={styles.contractPanel} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* PDF Controls */}
            <div className={styles.contractHeader} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <h3 className={styles.contractTitle}>Original PDF</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Zoom Controls */}
                <button
                  onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                  style={{
                    padding: '0.375rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Verkleinern"
                >
                  <ZoomOut size={16} />
                </button>
                <span style={{ fontSize: '0.875rem', color: '#64748b', minWidth: '50px', textAlign: 'center' }}>
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(s => Math.min(2, s + 0.1))}
                  style={{
                    padding: '0.375rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Vergrößern"
                >
                  <ZoomIn size={16} />
                </button>

                {/* Page Navigation */}
                {numPages > 1 && (
                  <>
                    <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 0.5rem' }} />
                    <button
                      onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                      disabled={pageNumber <= 1}
                      style={{
                        padding: '0.375rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: 'white',
                        cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
                        opacity: pageNumber <= 1 ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {pageNumber} / {numPages}
                    </span>
                    <button
                      onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                      disabled={pageNumber >= numPages}
                      style={{
                        padding: '0.375rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: 'white',
                        cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer',
                        opacity: pageNumber >= numPages ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* PDF Viewer */}
            <div
              className={styles.clauseList}
              style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center',
                background: '#f8fafc',
                padding: '1rem'
              }}
              onClick={handlePdfTextClick}
            >
              {pdfLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
                  <div className={styles.loadingSpinner} />
                  <span style={{ marginTop: '1rem', color: '#64748b' }}>PDF wird geladen...</span>
                </div>
              ) : pdfError ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</span>
                  <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{pdfError}</p>
                  <button
                    onClick={() => { setPdfUrl(null); setPdfError(null); }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Erneut versuchen
                  </button>
                </div>
              ) : pdfUrl ? (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem' }}>
                      <div className={styles.loadingSpinner} />
                      <span style={{ marginTop: '1rem', color: '#64748b' }}>PDF wird geladen...</span>
                    </div>
                  }
                  error={
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
                      PDF konnte nicht geladen werden
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              ) : null}

              {/* Hint für klickbare Texte */}
              {pdfUrl && !pdfLoading && (
                <div style={{
                  position: 'absolute',
                  bottom: '1rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  💡 Klicken Sie auf Text um die Analyse zu sehen
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right: Analysis Panel */}
        <div className={styles.analysisPanel}>
          {selectedClause ? (
            <>
              {/* Perspective Switcher */}
              <PerspectiveSwitcher
                currentPerspective={currentPerspective}
                onChangePerspective={changePerspective}
                disabled={isAnalyzing}
              />

              {/* Analysis Content */}
              <AnalysisPanel
                analysis={currentAnalysis}
                currentPerspective={currentPerspective}
                alternatives={alternatives}
                negotiation={negotiation}
                chatHistory={chatHistory}
                isAnalyzing={isAnalyzing}
                isGeneratingAlternatives={isGeneratingAlternatives}
                isGeneratingNegotiation={isGeneratingNegotiation}
                isChatting={isChatting}
                streamingText={streamingText}
                error={error}
                onLoadAlternatives={loadAlternatives}
                onLoadNegotiation={loadNegotiationTips}
                onSendChatMessage={sendChatMessage}
                onRetry={handleRetryAnalysis}
              />
            </>
          ) : (
            <div className={styles.analysisPanelEmpty}>
              <span className={styles.emptyIcon}>👆</span>
              <h3 className={styles.emptyTitle}>Klausel auswählen</h3>
              <p className={styles.emptyText}>
                Wählen Sie links eine Klausel aus, um die detaillierte Analyse zu sehen.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LegalLensViewer;

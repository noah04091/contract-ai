// 📁 components/LegalLens/LegalLensViewer.tsx
// Haupt-Komponente für Legal Lens Feature

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Eye, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, BarChart3, Zap, X, List, MessageSquare, LayoutGrid, ClipboardCheck, Download } from 'lucide-react';
import { useLegalLens } from '../../hooks/useLegalLens';
import ClauseList from './ClauseList';
import PerspectiveSwitcher from './PerspectiveSwitcher';
import AnalysisPanel from './AnalysisPanel';
import SmartSummary from './SmartSummary';
import ContractOverview from './ContractOverview';
import IndustrySelector from './IndustrySelector';
import NegotiationChecklist from './NegotiationChecklist';
import ExportAnalysisModal from './ExportAnalysisModal';
import * as legalLensAPI from '../../services/legalLensAPI';
import type { IndustryType } from '../../types/legalLens';
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

// Mobile Tab Type
type MobileTab = 'clauses' | 'analysis';

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

  // Smart Summary State
  const [showSmartSummary, setShowSmartSummary] = useState<boolean>(true);
  const [summaryDismissed, setSummaryDismissed] = useState<boolean>(false);

  // Overview State
  const [showOverview, setShowOverview] = useState<boolean>(false);

  // Industry Context State
  const [currentIndustry, setCurrentIndustry] = useState<IndustryType>('general');
  const [industryLoading, setIndustryLoading] = useState<boolean>(false);
  const [industryAutoDetected, setIndustryAutoDetected] = useState<boolean>(false);
  const [industryConfidence, setIndustryConfidence] = useState<number>(0);
  const [industryKeywords, setIndustryKeywords] = useState<string[]>([]);

  // Negotiation Checklist State
  const [showChecklist, setShowChecklist] = useState<boolean>(false);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Resizable Panel State
  const [analysisPanelWidth, setAnalysisPanelWidth] = useState<number>(480);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mobile State
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('clauses');

  // Mobile Detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Ref für alle aktuell gelb markierten Text-Elemente
  const highlightedElementsRef = useRef<HTMLElement[]>([]);

  // Ref um doppelte Analyse-Aufrufe zu verhindern
  const lastAnalyzedClauseRef = useRef<string | null>(null);
  const analysisAttemptedRef = useRef<boolean>(false);

  // Resize Handler
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;

      // Beschränke auf min/max Werte
      const clampedWidth = Math.max(350, Math.min(800, newWidth));
      setAnalysisPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const {
    clauses,
    selectedClause,
    currentAnalysis,
    currentPerspective,
    progress,
    alternatives,
    negotiation,
    chatHistory,
    analysisCache,
    batchProgress,
    isParsing,
    isAnalyzing,
    isGeneratingAlternatives,
    isGeneratingNegotiation,
    isChatting,
    isBatchAnalyzing,
    isRetrying,
    retryCount,
    streamingText,
    error,
    errorInfo,
    parseContract,
    selectClause,
    analyzeClause,
    changePerspective,
    loadAlternatives,
    loadNegotiationTips,
    sendChatMessage,
    markClauseReviewed,
    analyzeAllClauses,
    cancelBatchAnalysis
  } = useLegalLens();

  // Auto-switch to analysis tab when clause is selected on mobile
  useEffect(() => {
    if (isMobile && selectedClause && currentAnalysis) {
      setMobileTab('analysis');
    }
  }, [isMobile, selectedClause, currentAnalysis]);

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

  // Industry Context beim Laden holen
  useEffect(() => {
    const loadIndustry = async () => {
      if (!contractId) return;
      try {
        const response = await legalLensAPI.getIndustryContext(contractId);
        if (response.success && response.industry) {
          setCurrentIndustry(response.industry);
          // Auto-Erkennungs-Info setzen
          setIndustryAutoDetected(response.autoDetected || false);
          setIndustryConfidence(response.confidence || 0);
          setIndustryKeywords(response.detectedKeywords || []);
        }
      } catch (err) {
        console.warn('[Legal Lens] Could not load industry context:', err);
      }
    };
    loadIndustry();
  }, [contractId]);

  // Industry Change Handler
  const handleIndustryChange = useCallback(async (industry: IndustryType) => {
    if (!contractId || industry === currentIndustry) return;

    setIndustryLoading(true);
    try {
      const response = await legalLensAPI.setIndustryContext(contractId, industry);
      if (response.success) {
        setCurrentIndustry(industry);
        // Bei manuellem Wechsel: Auto-Detection Badge entfernen
        setIndustryAutoDetected(false);
        setIndustryConfidence(0);
        setIndustryKeywords([]);
        console.log(`[Legal Lens] Industry manually changed to: ${industry}`);
      }
    } catch (err) {
      console.error('[Legal Lens] Failed to set industry:', err);
    } finally {
      setIndustryLoading(false);
    }
  }, [contractId, currentIndustry]);

  // Analyse starten wenn Klausel ausgewählt - MIT Loop-Protection und Cache-Check
  useEffect(() => {
    // Verhindere doppelte Analyse der gleichen Klausel
    if (!selectedClause) {
      lastAnalyzedClauseRef.current = null;
      analysisAttemptedRef.current = false;
      return;
    }

    const clauseKey = `${selectedClause.id}-${currentPerspective}`;

    // ✅ NEU: Wenn bereits eine Analyse vorhanden ist (aus Cache), nichts tun
    if (currentAnalysis) {
      lastAnalyzedClauseRef.current = clauseKey;
      return;
    }

    // Wenn diese Klausel+Perspektive bereits analysiert wird/wurde, nichts tun
    if (lastAnalyzedClauseRef.current === clauseKey) {
      return;
    }

    // Wenn bereits eine Analyse läuft, nicht erneut starten
    if (isAnalyzing) {
      return;
    }

    // Wenn bereits eine Analyse-Versuch für diese Klausel gemacht wurde, nicht wiederholen
    if (analysisAttemptedRef.current && lastAnalyzedClauseRef.current === clauseKey) {
      return;
    }

    // Markiere dass wir diese Klausel analysieren
    lastAnalyzedClauseRef.current = clauseKey;
    analysisAttemptedRef.current = true;

    console.log('[Legal Lens] Starting analysis for:', clauseKey);
    analyzeClause(false); // Use JSON mode, not streaming (streaming doesn't return structured data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClause?.id, currentPerspective, isAnalyzing, currentAnalysis]);

  // Klausel als gelesen markieren
  useEffect(() => {
    if (selectedClause && currentAnalysis) {
      markClauseReviewed(selectedClause.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClause?.id, currentAnalysis]);

  const handleBack = () => {
    navigate(-1);
  };

  // Smart Summary Handler
  const handleDismissSummary = useCallback(() => {
    setShowSmartSummary(false);
    setSummaryDismissed(true);
  }, []);

  const handleShowSummary = useCallback(() => {
    setShowSmartSummary(true);
  }, []);

  const handleRetryAnalysis = () => {
    if (selectedClause) {
      analyzeClause(false); // Use JSON mode for structured data
    }
  };

  // PDF Document Loaded
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // Highlight von allen markierten Elementen entfernen
  const clearHighlight = useCallback(() => {
    highlightedElementsRef.current.forEach(el => {
      el.classList.remove('legal-lens-highlight');
    });
    highlightedElementsRef.current = [];
  }, []);

  // Highlight bei View-Mode Wechsel entfernen
  useEffect(() => {
    if (viewMode === 'text') {
      clearHighlight();
    }
  }, [viewMode, clearHighlight]);

  // PDF Text Click Handler - Findet passende Klausel und markiert ganzen SATZ gelb
  const handlePdfTextClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const textContent = target.closest('.react-pdf__Page__textContent');

    if (target.tagName === 'SPAN' && textContent) {
      // Vorherige Markierung entfernen
      clearHighlight();

      // Alle Spans in Dokumentreihenfolge sammeln
      const allSpans = Array.from(textContent.querySelectorAll('span')) as HTMLElement[];

      // Index des angeklickten Spans finden
      const clickedIndex = allSpans.indexOf(target);
      if (clickedIndex === -1) return;

      // Satzgrenzen finden (. ! ? gefolgt von Leerzeichen oder Ende)
      const sentenceEndRegex = /[.!?](\s|$)/;

      // Rückwärts suchen: Satzanfang finden
      let startIndex = clickedIndex;
      for (let i = clickedIndex; i >= 0; i--) {

        // Prüfe ob wir einen Satzanfang gefunden haben
        if (i === 0) {
          startIndex = 0;
          break;
        }

        // Prüfe ob der vorherige Span mit Satzende endet
        const prevText = allSpans[i - 1].textContent || '';
        if (sentenceEndRegex.test(prevText)) {
          startIndex = i;
          break;
        }
      }

      // Vorwärts suchen: Satzende finden
      let endIndex = clickedIndex;
      for (let i = clickedIndex; i < allSpans.length; i++) {
        const spanText = allSpans[i].textContent || '';
        endIndex = i;

        // Prüfe ob dieser Span ein Satzende enthält
        if (sentenceEndRegex.test(spanText)) {
          break;
        }

        // Wenn wir am Ende sind
        if (i === allSpans.length - 1) {
          break;
        }
      }

      // Alle Spans des Satzes markieren
      const sentenceSpans: HTMLElement[] = [];
      let sentenceText = '';
      for (let i = startIndex; i <= endIndex; i++) {
        sentenceSpans.push(allSpans[i]);
        allSpans[i].classList.add('legal-lens-highlight');
        sentenceText += (allSpans[i].textContent || '') + ' ';
      }
      highlightedElementsRef.current = sentenceSpans;

      // Finde Klausel die diesen Text enthält
      const cleanSentenceText = sentenceText.trim();
      let matchingClause = clauses.find(clause => {
        const clauseTextLower = clause.text.toLowerCase();
        const sentenceTextLower = cleanSentenceText.toLowerCase();
        return clauseTextLower.includes(sentenceTextLower) ||
               sentenceTextLower.includes(clauseTextLower.substring(0, 50)) ||
               clause.text.toLowerCase().split(' ').some(word =>
                 word.length > 4 && sentenceTextLower.includes(word)
               );
      });

      // Falls keine passende Klausel gefunden, erstelle eine temporäre
      if (!matchingClause && cleanSentenceText.length > 10) {
        matchingClause = {
          id: `pdf-selection-${Date.now()}`,
          text: cleanSentenceText,
          type: 'sentence' as const,
          startIndex: 0,
          endIndex: cleanSentenceText.length,
          riskIndicators: {
            level: 'medium' as const,
            keywords: [],
            score: 50
          },
          metadata: {
            wordCount: cleanSentenceText.split(/\s+/).length,
            hasNumbers: /\d/.test(cleanSentenceText),
            hasDates: /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(cleanSentenceText),
            hasMoneyReferences: /€|\$|EUR|USD/.test(cleanSentenceText)
          }
        };
        console.log('[Legal Lens] Created temporary clause for text:', cleanSentenceText.substring(0, 50));
      }

      if (matchingClause) {
        // Reset die Analyse-Refs für neue Klausel
        analysisAttemptedRef.current = false;
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
      {/* Smart Summary Modal */}
      {showSmartSummary && !isParsing && clauses.length > 0 && (
        <SmartSummary
          contractId={contractId}
          contractName={contractName}
          onDismiss={handleDismissSummary}
        />
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={handleBack}>
            ← Zurück
          </button>
          <h1 className={styles.title}>🔍 Legal Lens: {contractName}</h1>
        </div>

        <div className={styles.headerRight}>
          {/* Industry Selector */}
          <IndustrySelector
            currentIndustry={currentIndustry}
            onIndustryChange={handleIndustryChange}
            disabled={industryLoading || isParsing}
            compact={false}
            autoDetected={industryAutoDetected}
            confidence={industryConfidence}
            detectedKeywords={industryKeywords}
          />

          {/* Export Button */}
          <button
            className={styles.exportButton}
            onClick={() => setShowExportModal(true)}
            disabled={clauses.length === 0}
            title="Analyse als PDF exportieren"
          >
            <Download size={18} />
            <span>Export</span>
          </button>

          {/* Negotiation Checklist Button - nur für Vertragsempfänger */}
          {(currentPerspective === 'contractor' || currentPerspective === 'client') && (
            <button
              className={styles.checklistButton}
              onClick={() => setShowChecklist(true)}
              disabled={clauses.length === 0}
              title="Verhandlungs-Checkliste"
            >
              <ClipboardCheck size={18} />
              <span>Checkliste</span>
            </button>
          )}

          {/* Overview Toggle Button */}
          <button
            className={`${styles.overviewToggleButton} ${showOverview ? styles.active : ''}`}
            onClick={() => setShowOverview(!showOverview)}
            title={showOverview ? 'Zur Detail-Ansicht' : 'Gesamtübersicht'}
          >
            <LayoutGrid size={18} />
            <span>{showOverview ? 'Details' : 'Dashboard'}</span>
          </button>

          {/* Summary Button - nur anzeigen wenn Summary dismissed wurde */}
          {summaryDismissed && !showOverview && (
            <button
              className={styles.summaryButton}
              onClick={handleShowSummary}
              title="Übersicht anzeigen"
            >
              <BarChart3 size={18} />
              <span>Übersicht</span>
            </button>
          )}

          {/* Batch Analysis Button / Progress */}
          {isBatchAnalyzing ? (
            <div className={styles.batchProgress}>
              <div className={styles.batchProgressInfo}>
                <span className={styles.batchProgressText}>
                  {batchProgress.completed}/{batchProgress.total} analysiert
                </span>
                <div className={styles.batchProgressBar}>
                  <div
                    className={styles.batchProgressFill}
                    style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
              <button
                className={styles.batchCancelButton}
                onClick={cancelBatchAnalysis}
                title="Abbrechen"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              className={styles.batchAnalyzeButton}
              onClick={analyzeAllClauses}
              disabled={clauses.length === 0}
              title="Alle Klauseln im Hintergrund vorab laden"
            >
              <Zap size={16} />
              <span>Alle laden</span>
            </button>
          )}

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

      {/* Main Content - Overview vs Detail View */}
      {showOverview ? (
        // ===== OVERVIEW DASHBOARD =====
        <main className={styles.mainContent} style={{ display: 'flex', flex: 1 }}>
          <ContractOverview
            clauses={clauses}
            analysisCache={analysisCache as Record<string, typeof analysisCache[keyof typeof analysisCache]>}
            currentPerspective={currentPerspective}
            onSelectClause={(clause) => {
              selectClause(clause);
              setShowOverview(false);
            }}
            onClose={() => setShowOverview(false)}
          />
        </main>
      ) : isMobile ? (
        // ===== MOBILE LAYOUT =====
        <main className={styles.mobileContent}>
          {/* Mobile Tab Content */}
          {mobileTab === 'clauses' ? (
            <div className={styles.mobileTabPanel}>
              <ClauseList
                clauses={clauses}
                selectedClause={selectedClause}
                progress={progress}
                onSelectClause={(clause) => {
                  selectClause(clause);
                  // Auto-switch to analysis after selection
                  setTimeout(() => setMobileTab('analysis'), 100);
                }}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                cachedClauseIds={Object.keys(analysisCache).map(key => key.split('-')[0])}
              />
            </div>
          ) : (
            <div className={styles.mobileTabPanel}>
              <div className={styles.mobileAnalysisPanel}>
                {selectedClause ? (
                  <>
                    {/* Selected Clause Preview */}
                    <div className={styles.mobileClausePreview}>
                      <span className={styles.mobileClauseNumber}>
                        {selectedClause.number || `#${selectedClause.id.slice(-4)}`}
                      </span>
                      <p className={styles.mobileClauseText}>{selectedClause.text}</p>
                    </div>

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
                      isRetrying={isRetrying}
                      retryCount={retryCount}
                      streamingText={streamingText}
                      error={error}
                      errorInfo={errorInfo}
                      originalClauseText={selectedClause?.text}
                      sourceContractId={contractId}
                      sourceContractName={contractName}
                      sourceClauseId={selectedClause?.id}
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
                      Tippen Sie auf "Klauseln" und wählen Sie eine Klausel aus.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Bottom Navigation */}
          <nav className={styles.mobileNav}>
            <button
              className={`${styles.mobileNavButton} ${mobileTab === 'clauses' ? styles.mobileNavActive : ''}`}
              onClick={() => setMobileTab('clauses')}
            >
              <List size={20} />
              <span>Klauseln</span>
              {clauses.length > 0 && (
                <span className={styles.mobileNavBadge}>{clauses.length}</span>
              )}
            </button>
            <button
              className={`${styles.mobileNavButton} ${mobileTab === 'analysis' ? styles.mobileNavActive : ''}`}
              onClick={() => setMobileTab('analysis')}
            >
              <MessageSquare size={20} />
              <span>Analyse</span>
              {selectedClause && currentAnalysis && (
                <span className={styles.mobileNavDot} />
              )}
            </button>
          </nav>
        </main>
      ) : (
        // ===== DESKTOP LAYOUT =====
        <main className={styles.mainContent} ref={containerRef}>
          {/* Left: Clause List OR PDF Viewer */}
          {viewMode === 'text' ? (
            <ClauseList
              clauses={clauses}
              selectedClause={selectedClause}
              progress={progress}
              onSelectClause={selectClause}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              cachedClauseIds={Object.keys(analysisCache).map(key => key.split('-')[0])}
            />
          ) : (
          <div className={styles.contractPanel} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* PDF Controls */}
            <div className={styles.contractHeader}>
              <h3 className={styles.contractTitle}>Dokument</h3>

              {/* View Mode Toggle - Centered */}
              <div className={styles.contractHeaderCenter}>
                <button
                  onClick={() => setViewMode('text')}
                  className={styles.viewToggleBtn}
                >
                  <FileText size={14} />
                  Text
                </button>
                <button
                  onClick={() => setViewMode('pdf')}
                  className={`${styles.viewToggleBtn} ${styles.active}`}
                >
                  <Eye size={14} />
                  PDF
                </button>
              </div>
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
              onClickCapture={handlePdfTextClick}
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

        {/* Resize Divider */}
        <div
          className={`${styles.resizeDivider} ${isDragging ? styles.dragging : ''}`}
          onMouseDown={handleMouseDown}
          title="Ziehen zum Anpassen"
        />

        {/* Right: Analysis Panel */}
        <div className={styles.analysisPanel} style={{ width: analysisPanelWidth }}>
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
                isRetrying={isRetrying}
                retryCount={retryCount}
                streamingText={streamingText}
                error={error}
                errorInfo={errorInfo}
                originalClauseText={selectedClause?.text}
                sourceContractId={contractId}
                sourceContractName={contractName}
                sourceClauseId={selectedClause?.id}
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
      )}

      {/* Negotiation Checklist Modal */}
      {showChecklist && (
        <NegotiationChecklist
          contractId={contractId}
          contractName={contractName}
          perspective={currentPerspective}
          onClose={() => setShowChecklist(false)}
        />
      )}

      {/* Export Analysis Modal */}
      <ExportAnalysisModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        contractId={contractId}
        contractName={contractName}
      />

    </div>
  );
};

export default LegalLensViewer;

// 📁 components/LegalLens/LegalLensViewer.tsx
// Haupt-Komponente für Legal Lens Feature

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Eye, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, BarChart3, Zap, X, List, MessageSquare, LayoutGrid, ClipboardCheck, Download, Type, AlignJustify, MousePointer2, RefreshCw } from 'lucide-react';
import { useLegalLens } from '../../hooks/useLegalLens';
import ClauseList from './ClauseList';
import ClauseSkeleton from './ClauseSkeleton';
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

// ✅ NEU: Selection Mode für flexible Markierung
type SelectionMode = 'sentence' | 'paragraph' | 'custom';

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
  // View Mode State
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  // ✅ PDF Text-Index für Auto-Scroll zur richtigen Seite
  const pdfTextIndexRef = useRef<Map<number, string>>(new Map());
  const [pdfIndexReady, setPdfIndexReady] = useState<boolean>(false);

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

  // ✅ FIX Issue #7: UX-Hinweis verstecken nach erstem Klick
  const [hasPdfClicked, setHasPdfClicked] = useState<boolean>(() => {
    // LocalStorage-Persistenz
    return localStorage.getItem('legalLens_hasPdfClicked') === 'true';
  });

  // ✅ NEU: Selection Mode - Wort/Satz/Paragraph/Frei
  // Default ist 'paragraph' - 'custom' (Frei-Modus) wird NICHT aus localStorage geladen
  // da es für viele User verwirrend ist
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(() => {
    const saved = localStorage.getItem('legalLens_selectionMode');
    // Nur 'word', 'sentence', 'paragraph' aus localStorage laden - NICHT 'custom'
    const validModes = ['word', 'sentence', 'paragraph'];
    if (saved && validModes.includes(saved)) {
      return saved as SelectionMode;
    }
    return 'paragraph'; // Default: Paragraph
  });

  // Selection Mode speichern
  const handleSelectionModeChange = useCallback((mode: SelectionMode) => {
    setSelectionMode(mode);
    localStorage.setItem('legalLens_selectionMode', mode);
  }, []);

  // ✅ Frei-Modus Hinweis-Toast
  const [showFreeModeTip, setShowFreeModeTip] = useState<boolean>(false);

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

  // ✅ FIX v4: Ref um Race Condition zwischen PDF-Klick und Sync-useEffect zu verhindern
  // Wenn User in PDF klickt, soll der Sync-useEffect die Markierung NICHT überschreiben
  const pdfClickActiveRef = useRef<boolean>(false);

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
    cancelBatchAnalysis,
    // ✅ NEU: Streaming-Status (Option B)
    isStreaming,
    streamingProgress,
    streamingStatus,
    // ✅ Phase 1 Schritt 4: Queue-Priorisierung
    bumpClauseInQueue
  } = useLegalLens();

  // ============================================
  // KEYBOARD NAVIGATION (Opt 2: Wow-Effect)
  // ============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Nur navigieren wenn keine Klauseln laden und Klauseln vorhanden
      if (!clauses || clauses.length === 0 || isParsing || isStreaming) return;

      // Ignorieren wenn in Input/Textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Nur nicht-analysierbare Klauseln überspringen
      const analyzableClauses = clauses.filter(c => !c.nonAnalyzable);
      if (analyzableClauses.length === 0) return;

      // Aktuelle Position finden
      const currentIndex = selectedClause
        ? analyzableClauses.findIndex(c => c.id === selectedClause.id)
        : -1;

      let newIndex = -1;

      switch (e.key) {
        case 'ArrowDown':
        case 'j': // Vim-Style
          e.preventDefault();
          newIndex = currentIndex < analyzableClauses.length - 1 ? currentIndex + 1 : 0;
          break;

        case 'ArrowUp':
        case 'k': // Vim-Style
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : analyzableClauses.length - 1;
          break;

        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;

        case 'End':
          e.preventDefault();
          newIndex = analyzableClauses.length - 1;
          break;

        default:
          return;
      }

      if (newIndex >= 0 && newIndex < analyzableClauses.length) {
        selectClause(analyzableClauses[newIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clauses, selectedClause, selectClause, isParsing, isStreaming]);

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

  // ✅ Phase 1 Fix: Analyse starten - Direkter Cache-Check statt Ref-Hacks
  // ✅ FIX Issue #1: Content-basierter Cache für konsistente Text↔PDF Matches
  // ✅ SCHRITT 4: Queue-Priorisierung wenn Batch läuft
  useEffect(() => {
    // Keine Klausel ausgewählt → nichts tun
    if (!selectedClause) return;

    // Bereits eine Analyse läuft → abwarten
    if (isAnalyzing) return;

    // ✅ FIX Issue #1: Content-basierter Cache-Key (gleicher Hash für gleichen Text)
    const generateContentHash = (text: string): string => {
      const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 200);
      let hash = 0;
      for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    };

    const cacheKey = `content-${generateContentHash(selectedClause.text)}-${currentPerspective}`;

    // Direkter Cache-Check
    const isAlreadyCached = cacheKey in analysisCache;
    if (isAlreadyCached) return;

    // ✅ Prüfe ob currentAnalysis zur ausgewählten Klausel passt
    // (Analyse enthält alle Perspektiven, daher nur clauseId prüfen)
    const currentMatchesClause = currentAnalysis &&
      currentAnalysis.clauseId === selectedClause.id;

    if (currentMatchesClause) return;

    // ✅ SCHRITT 4: Queue-Priorisierung wenn Batch läuft
    if (isBatchAnalyzing) {
      // Versuche Klausel in der Queue zu priorisieren
      const wasBumped = bumpClauseInQueue(selectedClause);

      if (wasBumped) {
        // Fallback-Timer: Wenn nach 2s immer noch nicht gecached, direkt analysieren
        const fallbackTimer = setTimeout(() => {
          if (!(cacheKey in analysisCache)) {
            analyzeClause(false);
          }
        }, 2000);

        // Cleanup bei Unmount oder wenn sich Klausel ändert
        return () => clearTimeout(fallbackTimer);
      }
      // Klausel nicht in Queue → normal analysieren (z.B. nicht-high-risk Klausel)
    }

    analyzeClause(false);
  }, [selectedClause?.id, currentPerspective, isAnalyzing, analysisCache, currentAnalysis, analyzeClause, isBatchAnalyzing, bumpClauseInQueue]);

  // Klausel als gelesen markieren
  useEffect(() => {
    if (selectedClause && currentAnalysis) {
      markClauseReviewed(selectedClause.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClause?.id, currentAnalysis]);

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

  // PDF Document Loaded - ✅ Mit Text-Extraktion für alle Seiten
  const onDocumentLoadSuccess = async ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfIndexReady(false); // Reset während Index erstellt wird

    // ✅ Text aller Seiten extrahieren für Auto-Scroll
    if (pdfUrl) {
      try {
        const loadingTask = pdfjs.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const textIndex = new Map<number, string>();

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => ('str' in item ? (item as { str: string }).str : ''))
            .join(' ')
            .toLowerCase()
            .normalize('NFC');
          textIndex.set(i, pageText);
        }

        pdfTextIndexRef.current = textIndex;
        setPdfIndexReady(true); // ✅ Signal dass Index bereit ist
        console.log(`[Legal Lens] PDF Text-Index erstellt: ${numPages} Seiten`);

        // ✅ FIX: Nach Index-Erstellung zur Klausel navigieren (wenn vorhanden)
        // NICHT vorher setPageNumber(1) aufrufen - das überschreibt die Navigation!
        if (selectedClause && !selectedClause.id.startsWith('pdf-')) {
          const targetPage = findPageForClause(selectedClause.text);
          if (targetPage) {
            console.log(`[Legal Lens] onDocumentLoad: Navigating to clause page ${targetPage}`);
            setPageNumber(targetPage);
            lastNavigatedClauseIdRef.current = selectedClause.id;
          } else {
            setPageNumber(1); // Fallback nur wenn Klausel nicht gefunden
          }
        } else {
          setPageNumber(1); // Keine Klausel ausgewählt → Seite 1
        }
      } catch (err) {
        console.warn('[Legal Lens] Text-Index Extraktion fehlgeschlagen:', err);
        setPdfIndexReady(false);
        setPageNumber(1);
      }
    } else {
      setPageNumber(1);
    }
  };

  // ✅ FIX v7: Verbesserte Seiten-Suche mit flexiblerem Matching
  const findPageForClause = useCallback((clauseText: string): number | null => {
    const textIndex = pdfTextIndexRef.current;
    if (textIndex.size === 0) {
      console.log('[Legal Lens] findPageForClause: No text index available');
      return null;
    }

    // Normalisiere Klausel-Text (entferne alle Whitespace-Varianten)
    const clauseNorm = clauseText
      .toLowerCase()
      .normalize('NFC')
      .replace(/[\s\n\r\t]+/g, ' ')
      .replace(/[„""''«»]/g, '"')
      .trim();

    // Extrahiere signifikante Wörter (min 4 Zeichen, keine Stoppwörter)
    const stopWords = ['der', 'die', 'das', 'und', 'oder', 'für', 'von', 'mit', 'bei', 'auf', 'aus', 'nach', 'über', 'unter', 'einer', 'einem', 'einen', 'eine', 'sind', 'wird', 'werden', 'kann', 'können', 'soll', 'haben', 'sein', 'nicht', 'auch', 'wenn', 'dass', 'diese', 'dieser', 'dieses'];
    const clauseWords = clauseNorm
      .split(' ')
      .filter(w => w.length >= 4 && !stopWords.includes(w));

    if (clauseWords.length === 0) {
      console.log('[Legal Lens] findPageForClause: No significant words');
      return null;
    }

    console.log('[Legal Lens] findPageForClause: Searching for words:', clauseWords.slice(0, 5).join(', '));

    // Strategie 1: Suche nach Wort-Sequenzen
    const searchSequences = [
      clauseWords.slice(0, 6),
      clauseWords.slice(0, 4),
      clauseWords.slice(0, 3),
    ].filter(seq => seq.length >= 2);

    for (const [pageNum, pageText] of textIndex) {
      for (const sequence of searchSequences) {
        // Prüfe ob alle Wörter der Sequenz auf der Seite vorkommen (in beliebiger Reihenfolge)
        const allFound = sequence.every(word => pageText.includes(word));
        if (allFound) {
          console.log(`[Legal Lens] findPageForClause: Found on page ${pageNum} (sequence: ${sequence.join(', ')})`);
          return pageNum;
        }
      }
    }

    // Strategie 2: Fallback - mindestens 50% der Wörter auf einer Seite
    let bestPage = null;
    let bestScore = 0;

    for (const [pageNum, pageText] of textIndex) {
      let matchCount = 0;
      for (const word of clauseWords.slice(0, 8)) {
        if (pageText.includes(word)) {
          matchCount++;
        }
      }
      const score = matchCount / Math.min(clauseWords.length, 8);
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestPage = pageNum;
      }
    }

    if (bestPage) {
      console.log(`[Legal Lens] findPageForClause: Best match on page ${bestPage} (score: ${Math.round(bestScore * 100)}%)`);
      return bestPage;
    }

    console.log('[Legal Lens] findPageForClause: No match found');
    return null;
  }, []);

  // Highlight von allen markierten Elementen entfernen
  const clearHighlight = useCallback(() => {
    highlightedElementsRef.current.forEach(el => {
      el.classList.remove('legal-lens-highlight');
    });
    highlightedElementsRef.current = [];
  }, []);

  // ✅ FIX v7: PDF-Sync mit Schutz vor Navigation bei PDF-Klick
  // WICHTIG: Bei PDF-Klick KEINE Navigation, nur bei Text→PDF Wechsel

  const prevViewModeRef = useRef<ViewMode>(viewMode);
  const lastNavigatedClauseIdRef = useRef<string | null>(null);
  const syncPdfHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingNavigationRef = useRef<string | null>(null);

  // ========== EFFECT 1: View-Wechsel Handler ==========
  useEffect(() => {
    if (viewMode === 'text' && prevViewModeRef.current === 'pdf') {
      clearHighlight();
      console.log('[Legal Lens] View switched to Text');
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode, clearHighlight]);

  // ========== EFFECT 2: Navigation bei neuer Klausel ==========
  useEffect(() => {
    if (viewMode !== 'pdf' || !selectedClause || !pdfUrl) return;

    // ✅ FIX v7: KEINE Navigation wenn User gerade in PDF geklickt hat!
    // PDF-Klick-Klauseln haben IDs wie "pdf-paragraph-xxx" oder "pdf-sentence-xxx"
    if (selectedClause.id.startsWith('pdf-')) {
      console.log('[Legal Lens] Skipping navigation - clause created from PDF click');
      lastNavigatedClauseIdRef.current = selectedClause.id;
      return;
    }

    // Nur navigieren wenn sich die KLAUSEL geändert hat
    if (lastNavigatedClauseIdRef.current === selectedClause.id) {
      return;
    }

    console.log('[Legal Lens] New clause from text view:', selectedClause.id);

    // Wenn Index noch nicht geladen, merken für später
    if (pdfTextIndexRef.current.size === 0) {
      pendingNavigationRef.current = selectedClause.id;
      console.log('[Legal Lens] PDF index not ready, pending navigation');
      return;
    }

    // Navigation durchführen
    lastNavigatedClauseIdRef.current = selectedClause.id;
    pendingNavigationRef.current = null;

    const targetPage = findPageForClause(selectedClause.text);
    if (targetPage) {
      console.log(`[Legal Lens] Navigating to page ${targetPage}`);
      setPageNumber(targetPage);
    } else {
      console.log('[Legal Lens] Could not find clause in PDF');
    }
  }, [viewMode, selectedClause?.id, pdfUrl, findPageForClause]);

  // ========== EFFECT 3: Pending Navigation wenn Index bereit ==========
  useEffect(() => {
    // Warte bis Index wirklich bereit ist
    if (!pdfIndexReady) return;
    if (!pendingNavigationRef.current || !selectedClause) return;
    if (pendingNavigationRef.current !== selectedClause.id) return;

    // ✅ FIX v7: Auch hier prüfen ob es eine PDF-Klick-Klausel ist
    if (selectedClause.id.startsWith('pdf-')) {
      pendingNavigationRef.current = null;
      return;
    }

    console.log('[Legal Lens] PDF index ready, executing pending navigation');
    lastNavigatedClauseIdRef.current = selectedClause.id;
    pendingNavigationRef.current = null;

    const targetPage = findPageForClause(selectedClause.text);
    if (targetPage) {
      console.log(`[Legal Lens] Navigating to page ${targetPage}`);
      setPageNumber(targetPage);
    } else {
      console.log('[Legal Lens] Could not find clause in PDF index');
    }
  }, [pdfIndexReady, selectedClause, findPageForClause]);

  // ========== EFFECT 4: Highlighting v7 - Wort-basiertes Matching ==========
  useEffect(() => {
    if (viewMode !== 'pdf' || !selectedClause || !pdfUrl || pdfLoading) return;

    // Skip wenn User gerade in PDF geklickt hat
    if (pdfClickActiveRef.current) {
      console.log('[Legal Lens] PDF highlight: Skipping - user clicked in PDF');
      pdfClickActiveRef.current = false;
      return;
    }

    // Skip für PDF-erstellte Klauseln (die sind bereits markiert)
    if (selectedClause.id.startsWith('pdf-')) {
      console.log('[Legal Lens] PDF highlight: Skipping - clause from PDF click');
      return;
    }

    if (syncPdfHighlightTimeoutRef.current) {
      clearTimeout(syncPdfHighlightTimeoutRef.current);
    }

    syncPdfHighlightTimeoutRef.current = setTimeout(() => {
      if (pdfClickActiveRef.current) {
        pdfClickActiveRef.current = false;
        return;
      }

      clearHighlight();

      const textLayer = document.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) {
        console.log('[Legal Lens] PDF highlight: No text layer found');
        return;
      }

      const allSpans = Array.from(textLayer.querySelectorAll('span')) as HTMLElement[];
      if (allSpans.length === 0) {
        console.log('[Legal Lens] PDF highlight: No spans found');
        return;
      }

      // ✅ WORT-BASIERTES HIGHLIGHTING: Finde Spans die Klausel-Wörter enthalten
      // (Exakter Text-Match funktioniert nicht weil PDF-Text anders formatiert ist)

      const clauseText = selectedClause.text
        .toLowerCase()
        .normalize('NFC')
        .replace(/[„""''«»]/g, '"');

      // Extrahiere die ersten 10 signifikanten Wörter der Klausel
      const stopWords = ['der', 'die', 'das', 'und', 'oder', 'für', 'von', 'mit', 'bei', 'auf', 'aus', 'nach', 'über', 'unter', 'einer', 'einem', 'einen', 'eine', 'sind', 'wird', 'werden', 'kann', 'können', 'soll', 'haben', 'sein', 'nicht', 'auch', 'wenn', 'dass', 'diese', 'dieser', 'dieses', 'sowie', 'durch', 'muss', 'darf', 'zum', 'zur', 'den', 'dem', 'des'];

      const clauseWords = clauseText
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.includes(w))
        .slice(0, 10);

      if (clauseWords.length === 0) {
        console.log('[Legal Lens] PDF highlight: No significant words in clause');
        return;
      }

      console.log('[Legal Lens] PDF highlight: Looking for words:', clauseWords.slice(0, 5).join(', '));

      // ✅ Sortiere alle Spans nach visueller Position
      const spansWithRect = allSpans.map(span => ({
        span,
        rect: span.getBoundingClientRect(),
        text: (span.textContent || '').toLowerCase().normalize('NFC')
      })).sort((a, b) => {
        const yDiff = a.rect.top - b.rect.top;
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.rect.left - b.rect.left;
      });

      // ✅ Finde den ERSTEN Span der das ERSTE signifikante Wort enthält
      let startSpanIndex = -1;
      const firstWord = clauseWords[0];

      for (let i = 0; i < spansWithRect.length; i++) {
        if (spansWithRect[i].text.includes(firstWord)) {
          startSpanIndex = i;
          break;
        }
      }

      if (startSpanIndex === -1) {
        console.log('[Legal Lens] PDF highlight: First word not found:', firstWord);
        return;
      }

      // ✅ Ab dem Startpunkt: Markiere Spans die Klausel-Wörter enthalten
      // Aber nur in einem Fenster von max 30 Spans (um nicht die ganze Seite zu markieren)
      const windowSize = 30;
      const endIndex = Math.min(startSpanIndex + windowSize, spansWithRect.length);

      const spansToHighlight: HTMLElement[] = [];
      let consecutiveMisses = 0;

      for (let i = startSpanIndex; i < endIndex; i++) {
        const spanText = spansWithRect[i].text;
        let hasMatch = false;

        for (const word of clauseWords) {
          if (spanText.includes(word)) {
            hasMatch = true;
            break;
          }
        }

        if (hasMatch) {
          spansToHighlight.push(spansWithRect[i].span);
          consecutiveMisses = 0;
        } else {
          consecutiveMisses++;
          // Stoppe wenn 5 Spans hintereinander kein Match haben
          if (consecutiveMisses >= 5) {
            break;
          }
        }
      }

      console.log('[Legal Lens] PDF highlight: Found', spansToHighlight.length, 'matching spans starting at index', startSpanIndex);

      for (const span of spansToHighlight) {
        span.classList.add('legal-lens-highlight');
      }

      highlightedElementsRef.current = spansToHighlight;

      // Scroll zum ersten markierten Span
      if (spansToHighlight.length > 0) {
        spansToHighlight[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('[Legal Lens] PDF highlight: Marked', spansToHighlight.length, 'spans (exact match)');
      }
    }, 700);

    return () => {
      if (syncPdfHighlightTimeoutRef.current) {
        clearTimeout(syncPdfHighlightTimeoutRef.current);
      }
    };
  }, [viewMode, selectedClause, pdfUrl, pdfLoading, pageNumber, scale, clearHighlight]);

  // ✅ FIX v3: Komplett überarbeiteter PDF Selection Handler
  // WICHTIG: KEINE Klausel-Matching mehr - das verursachte das "Springen"!

  const handlePdfTextClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const textContent = target.closest('.react-pdf__Page__textContent');

    if (!textContent) return;

    // ========== FREI-MODUS: Browser-Textauswahl per Drag ==========
    if (selectionMode === 'custom') {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() || '';

      // Nur wenn Text markiert wurde (min. 10 Zeichen)
      if (selectedText.length >= 10) {
        clearHighlight();

        // Markiere alle Spans die im Selection-Range sind
        const range = selection?.getRangeAt(0);
        if (range) {
          const allSpans = Array.from(textContent.querySelectorAll('span')) as HTMLElement[];
          const selectedSpans: HTMLElement[] = [];

          for (const span of allSpans) {
            if (range.intersectsNode(span)) {
              span.classList.add('legal-lens-highlight');
              selectedSpans.push(span);
            }
          }
          highlightedElementsRef.current = selectedSpans;
        }

        // Klausel aus markiertem Text erstellen
        const hash = Date.now().toString(36);
        const newClause = {
          id: `pdf-frei-${hash}`,
          text: selectedText.normalize('NFC'),
          type: 'paragraph' as const,
          startIndex: 0,
          endIndex: selectedText.length,
          riskIndicators: { level: 'medium' as const, keywords: [], score: 50 },
          metadata: {
            wordCount: selectedText.split(/\s+/).length,
            hasNumbers: /\d/.test(selectedText),
            hasDates: /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(selectedText),
            hasMoneyReferences: /€|\$|EUR|USD/.test(selectedText)
          }
        };

        console.log('[Legal Lens] FREI-MODUS:', selectedText.substring(0, 60) + '...');

        // ✅ FIX v4: Flag setzen BEVOR selectClause aufgerufen wird
        // Verhindert dass PDF-Sync useEffect die Markierung überschreibt
        pdfClickActiveRef.current = true;

        selectClause(newClause);
        setHasPdfClicked(true);
        localStorage.setItem('legalLens_hasPdfClicked', 'true');

        // Selection aufheben nach kurzer Verzögerung
        setTimeout(() => selection?.removeAllRanges(), 100);
      } else {
        // Frei-Modus: Bei einfachem Klick ohne Markierung → Hinweis anzeigen
        setShowFreeModeTip(true);
        setTimeout(() => setShowFreeModeTip(false), 3000);
      }
      return;
    }

    // ========== SATZ & PARAGRAPH MODUS ==========
    if (target.tagName !== 'SPAN') return;

    clearHighlight();

    const allSpans = Array.from(textContent.querySelectorAll('span')) as HTMLElement[];
    const clickedIndex = allSpans.indexOf(target);
    if (clickedIndex === -1) return;

    // Sammle alle Span-Texte
    const spanData = allSpans.map((span, idx) => ({
      span,
      text: (span.textContent || '').normalize('NFC'),
      index: idx
    }));

    let startIdx = clickedIndex;
    let endIdx = clickedIndex;

    // ========== SATZ-MODUS ==========
    if (selectionMode === 'sentence') {
      // Suche Satzanfang (rückwärts bis . ! ? oder Anfang)
      for (let i = clickedIndex - 1; i >= 0; i--) {
        const text = spanData[i].text;
        // Satzende im vorherigen Span = dieser Span ist Satzanfang
        if (/[.!?]\s*$/.test(text)) {
          startIdx = i + 1;
          break;
        }
        // Paragraph-Marker = Satzanfang
        if (/^(§|Art\.|Artikel|\(\d|\d+\.)/.test(text.trim())) {
          startIdx = i;
          break;
        }
        startIdx = i;
        // Max 30 Spans zurück
        if (clickedIndex - i > 30) break;
      }

      // Suche Satzende (vorwärts bis . ! ?)
      for (let i = clickedIndex; i < allSpans.length; i++) {
        endIdx = i;
        const text = spanData[i].text;
        // Echtes Satzende (nicht bei Abkürzungen wie "Nr.", "Art.", "Abs.")
        if (/[.!?]\s*$/.test(text)) {
          const isAbbrev = /\b(Nr|Art|Abs|Ziff|lit|bzw|ca|etc|ggf|inkl|max|min|vgl|gem|ggü|usw|z\.B|u\.a|d\.h|i\.d\.R|S|Rn)\.\s*$/i.test(text);
          if (!isAbbrev) break;
        }
        // Max 40 Spans vorwärts
        if (i - clickedIndex > 40) break;
      }
    }

    // ========== PARAGRAPH-MODUS ==========
    else if (selectionMode === 'paragraph') {
      // Regex für Paragraph-Überschriften: § X, Art. X, Artikel X, X. Titel, römische Ziffern
      const isParagraphStart = (text: string): boolean => {
        const trimmed = text.trim();
        return /^(§\s*\d|Art\.?\s*\d|Artikel\s*\d|\d+\.\d*\s+[A-ZÄÖÜ]|[IVX]+\.\s|[A-Z]\)\s)/.test(trimmed);
      };

      // RÜCKWÄRTS: Finde den Paragraph-Start (§ X)
      for (let i = clickedIndex - 1; i >= 0; i--) {
        const text = spanData[i].text;

        // Hauptparagraph gefunden (§ X, Art. X)
        if (isParagraphStart(text)) {
          startIdx = i;
          break;
        }

        startIdx = i;
        // Max 100 Spans zurück
        if (clickedIndex - i > 100) break;
      }

      // VORWÄRTS: Finde das Ende (nächster § oder Art.)
      for (let i = clickedIndex + 1; i < allSpans.length; i++) {
        const text = spanData[i].text;

        // Nächster Hauptparagraph = Ende dieses Paragraphen
        if (isParagraphStart(text)) {
          endIdx = i - 1;
          break;
        }

        endIdx = i;
        // Max 150 Spans vorwärts (Paragraphen können lang sein)
        if (i - clickedIndex > 150) break;
      }

      console.log('[Legal Lens] PARAGRAPH: Start:', startIdx, 'End:', endIdx, 'Spans:', endIdx - startIdx + 1);
    }

    // Sicherheit: Mindestens der geklickte Span
    if (startIdx > clickedIndex) startIdx = clickedIndex;
    if (endIdx < clickedIndex) endIdx = clickedIndex;

    // ========== Spans markieren und Text sammeln ==========
    const selectedSpans: HTMLElement[] = [];
    let selectedText = '';

    for (let i = startIdx; i <= endIdx; i++) {
      if (i >= 0 && i < spanData.length) {
        selectedSpans.push(spanData[i].span);
        spanData[i].span.classList.add('legal-lens-highlight');
        selectedText += spanData[i].text + ' ';
      }
    }

    selectedText = selectedText.trim().normalize('NFC');
    highlightedElementsRef.current = selectedSpans;

    // Mindestlänge prüfen
    if (selectedText.length < 10) {
      console.log('[Legal Lens] Text zu kurz:', selectedText.length);
      return;
    }

    console.log(`[Legal Lens] ${selectionMode.toUpperCase()}: ${selectedSpans.length} Spans, "${selectedText.substring(0, 80)}..."`);

    // ========== IMMER neue Klausel erstellen (KEIN Matching!) ==========
    // Das verhindert das "Springen" zu anderen Klauseln
    const hash = Date.now().toString(36);
    const newClause = {
      id: `pdf-${selectionMode}-${hash}`,
      text: selectedText,
      type: selectionMode as 'sentence' | 'paragraph',
      startIndex: 0,
      endIndex: selectedText.length,
      riskIndicators: { level: 'medium' as const, keywords: [], score: 50 },
      metadata: {
        wordCount: selectedText.split(/\s+/).length,
        hasNumbers: /\d/.test(selectedText),
        hasDates: /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(selectedText),
        hasMoneyReferences: /€|\$|EUR|USD/.test(selectedText)
      }
    };

    // ✅ FIX v4: Flag setzen BEVOR selectClause aufgerufen wird
    // Verhindert dass PDF-Sync useEffect die Markierung überschreibt
    pdfClickActiveRef.current = true;

    selectClause(newClause);
    setHasPdfClicked(true);
    localStorage.setItem('legalLens_hasPdfClicked', 'true');
  };

  // Loading State - Skeleton UI statt Spinner
  if (isParsing) {
    return (
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FileText size={24} className={styles.headerIcon} />
            <div className={styles.titleContainer}>
              <h1 className={styles.title}>{contractName}</h1>
              <span className={styles.subtitle}>Wird analysiert...</span>
            </div>
          </div>
        </div>

        {/* Main Content mit Skeleton */}
        <div className={styles.mainContent}>
          {/* Left Panel - Skeleton Klauseln */}
          <ClauseSkeleton count={6} showHeader={true} />

          {/* Right Panel - Skeleton Analyse */}
          <div className={styles.analysisPanel}>
            <div className={styles.analysisSkeleton}>
              <div className={styles.skeletonHeader}>
                <span className={`${styles.skeletonText} ${styles.skeletonTitle}`} />
                <span className={styles.skeletonBadge} />
              </div>

              <div className={styles.skeletonActionLevel}>
                <span className={`${styles.skeletonText} ${styles.skeletonActionButton}`} />
                <span className={`${styles.skeletonText} ${styles.skeletonActionButton}`} />
                <span className={`${styles.skeletonText} ${styles.skeletonActionButton}`} />
              </div>

              <div className={styles.skeletonSection}>
                <span className={`${styles.skeletonText} ${styles.skeletonSectionTitle}`} />
                <div className={styles.skeletonParagraph}>
                  <span className={styles.skeletonText} />
                  <span className={styles.skeletonText} />
                  <span className={styles.skeletonText} />
                </div>
              </div>

              <div className={styles.skeletonSection}>
                <span className={`${styles.skeletonText} ${styles.skeletonSectionTitle}`} />
                <div className={styles.skeletonParagraph}>
                  <span className={styles.skeletonText} />
                  <span className={styles.skeletonText} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ NEU: Streaming State (Option B) - Klauseln erscheinen live
  // Zeige normales UI mit Overlay für Streaming-Progress
  const showStreamingOverlay = isStreaming && streamingProgress < 100;

  const percentComplete = progress?.percentComplete || 0;

  return (
    <div className={styles.container}>
      {/* ✅ NEU: Streaming Progress Banner (Option B) */}
      {showStreamingOverlay && (
        <div className={styles.streamingBanner}>
          <div className={styles.streamingContent}>
            <div className={styles.streamingIcon}>
              <Zap size={20} className={styles.pulseIcon} />
            </div>
            <div className={styles.streamingInfo}>
              <span className={styles.streamingTitle}>KI-Analyse läuft</span>
              <span className={styles.streamingStatus}>{streamingStatus}</span>
            </div>
            <div className={styles.streamingProgressWrapper}>
              <div className={styles.streamingProgressBar}>
                <div
                  className={styles.streamingProgressFill}
                  style={{ width: `${streamingProgress}%` }}
                />
              </div>
              <span className={styles.streamingPercent}>{streamingProgress}%</span>
            </div>
            <span className={styles.streamingClauseCount}>
              {(clauses || []).length} Klauseln gefunden
            </span>
          </div>
        </div>
      )}

      {/* Smart Summary Modal - Zeigt sich SOFORT wenn Streaming startet (parallel zu Klauseln) */}
      {showSmartSummary && (isStreaming || (!isParsing && (clauses || []).length > 0)) && (
        <SmartSummary
          contractId={contractId}
          contractName={contractName}
          onDismiss={handleDismissSummary}
        />
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleIcon}>
            <Eye size={20} />
          </div>
          <h1 className={styles.title}>Legal Lens: {contractName}</h1>
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

          {/* Force-Refresh Button */}
          <button
            className={styles.refreshButton}
            onClick={() => parseContract(contractId, true)}
            disabled={isParsing || isStreaming}
            title="Klauseln neu analysieren (Cache ignorieren)"
          >
            <RefreshCw size={18} className={isStreaming ? styles.spinning : ''} />
          </button>

          {/* Export Button */}
          <button
            className={styles.exportButton}
            onClick={() => setShowExportModal(true)}
            disabled={(clauses || []).length === 0}
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
              disabled={(clauses || []).length === 0}
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
              disabled={(clauses || []).length === 0}
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
            // ✅ Neue Props für Inline-Analyse
            contractId={contractId}
            contractName={contractName}
            onAnalyzeClause={async (clause, perspective) => {
              // Klausel auswählen für Synchronisation
              selectClause(clause);
              changePerspective(perspective);

              // ✅ FIX: API DIREKT aufrufen und Ergebnis zurückgeben
              // (statt auf React State-Update zu warten)
              try {
                const response = await legalLensAPI.analyzeClause(
                  contractId,
                  clause.id,
                  clause.text,
                  perspective,
                  false // kein Streaming
                );
                return response.analysis;
              } catch (error) {
                console.error('Inline Analysis Error:', error);
                return null;
              }
            }}
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
                isStreaming={isStreaming}
                streamingProgress={streamingProgress}
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
              {(clauses || []).length > 0 && (
                <span className={styles.mobileNavBadge}>{(clauses || []).length}</span>
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
              isStreaming={isStreaming}
              streamingProgress={streamingProgress}
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
                {/* ✅ Selection Mode Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  background: '#f1f5f9',
                  borderRadius: '6px',
                  padding: '2px'
                }}>
                  <button
                    onClick={() => handleSelectionModeChange('sentence')}
                    style={{
                      padding: '0.375rem 0.5rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: selectionMode === 'sentence' ? 'white' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      color: selectionMode === 'sentence' ? '#3b82f6' : '#64748b',
                      boxShadow: selectionMode === 'sentence' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                    }}
                    title="Satz-Modus: Klick wählt ganzen Satz"
                  >
                    <Type size={12} />
                    Satz
                  </button>
                  <button
                    onClick={() => handleSelectionModeChange('paragraph')}
                    style={{
                      padding: '0.375rem 0.5rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: selectionMode === 'paragraph' ? 'white' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      color: selectionMode === 'paragraph' ? '#3b82f6' : '#64748b',
                      boxShadow: selectionMode === 'paragraph' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                    }}
                    title="Paragraph-Modus: Klick wählt ganzen §/Absatz"
                  >
                    <AlignJustify size={12} />
                    §
                  </button>
                  <button
                    onClick={() => handleSelectionModeChange('custom')}
                    style={{
                      padding: '0.375rem 0.5rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: selectionMode === 'custom' ? 'white' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      color: selectionMode === 'custom' ? '#3b82f6' : '#64748b',
                      boxShadow: selectionMode === 'custom' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                    }}
                    title="Frei-Modus: Text markieren und analysieren"
                  >
                    <MousePointer2 size={12} />
                    Frei
                  </button>
                </div>

                <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />

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
              onMouseUp={selectionMode === 'custom' ? handlePdfTextClick : undefined}
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

              {/* ✅ FIX Issue #7: Hint nur anzeigen bis zum ersten Klick */}
              {pdfUrl && !pdfLoading && !hasPdfClicked && (
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

              {/* Frei-Modus Hinweis-Toast */}
              {showFreeModeTip && (
                <div style={{
                  position: 'absolute',
                  bottom: '1rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(251, 191, 36, 0.95)',
                  color: '#78350f',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  animation: 'fadeIn 0.2s ease',
                  zIndex: 10
                }}>
                  <span style={{ fontSize: '1.1rem' }}>✋</span>
                  Im Frei-Modus: Text mit Maus markieren (ziehen), dann loslassen
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

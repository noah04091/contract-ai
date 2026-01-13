// 📁 components/LegalLens/LegalLensViewer.tsx
// Haupt-Komponente für Legal Lens Feature

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Eye, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, BarChart3, Zap, X, List, MessageSquare, LayoutGrid, ClipboardCheck, Download, Type, AlignJustify, MousePointer2 } from 'lucide-react';
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
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(() => {
    const saved = localStorage.getItem('legalLens_selectionMode');
    return (saved as SelectionMode) || 'paragraph'; // Default: Paragraph
  });

  // Selection Mode speichern
  const handleSelectionModeChange = useCallback((mode: SelectionMode) => {
    setSelectionMode(mode);
    localStorage.setItem('legalLens_selectionMode', mode);
  }, []);

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

    // Debug: Zeige Klick-Details
    console.log(`🖱️ [Legal Lens] Klausel geklickt:`, {
      clauseId: selectedClause.id,
      cacheKey: cacheKey,
      riskLevel: selectedClause.riskIndicators?.level || selectedClause.preAnalysis?.riskLevel || 'unknown',
      textPreview: selectedClause.text.substring(0, 50) + '...',
      cacheKeys: Object.keys(analysisCache),
      isBatchRunning: isBatchAnalyzing
    });

    // ✅ Direkter Cache-Check (statt Ref-basierter Hacks)
    const isAlreadyCached = cacheKey in analysisCache;
    if (isAlreadyCached) {
      console.log('✅ [Legal Lens] Using cached analysis:', cacheKey);
      return;
    }

    // ✅ Prüfe ob currentAnalysis zur ausgewählten Klausel passt
    // (Analyse enthält alle Perspektiven, daher nur clauseId prüfen)
    const currentMatchesClause = currentAnalysis &&
      currentAnalysis.clauseId === selectedClause.id;

    if (currentMatchesClause) {
      console.log('[Legal Lens] Current analysis matches selected clause');
      return;
    }

    // ✅ SCHRITT 4: Queue-Priorisierung wenn Batch läuft
    if (isBatchAnalyzing) {
      // Versuche Klausel in der Queue zu priorisieren
      const wasBumped = bumpClauseInQueue(selectedClause);

      if (wasBumped) {
        console.log(`⏳ [Legal Lens] Klausel in Queue priorisiert, warte auf Batch...`);

        // Fallback-Timer: Wenn nach 2s immer noch nicht gecached, direkt analysieren
        const fallbackTimer = setTimeout(() => {
          // Nochmal prüfen ob inzwischen gecached
          if (!(cacheKey in analysisCache)) {
            console.log(`⚠️ [Legal Lens] Fallback: Batch zu langsam, starte direkte Analyse`);
            analyzeClause(false);
          }
        }, 2000);

        // Cleanup bei Unmount oder wenn sich Klausel ändert
        return () => clearTimeout(fallbackTimer);
      }
      // Klausel nicht in Queue → normal analysieren (z.B. nicht-high-risk Klausel)
    }

    // Starte Analyse
    console.log('[Legal Lens] Starting analysis for:', cacheKey);
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

  // ✅ FIX: Text↔PDF Sync - Ref für vorherigen ViewMode
  const prevViewModeRef = useRef<ViewMode>(viewMode);

  // ✅ FIX: Text↔PDF Sync - Bei View-Wechsel Auswahl spiegeln
  useEffect(() => {
    const prevViewMode = prevViewModeRef.current;
    prevViewModeRef.current = viewMode;

    // Nur bei echtem Wechsel
    if (prevViewMode === viewMode) return;

    if (viewMode === 'text') {
      // Von PDF zu Text: Highlight entfernen, ClauseList scrollt automatisch via ClauseList useEffect
      clearHighlight();
      console.log('[Legal Lens] View switched to Text, clause sync via ClauseList');
    } else if (viewMode === 'pdf' && selectedClause) {
      // Von Text zu PDF: Versuche Text in PDF zu highlighten (nach PDF-Load)
      console.log('[Legal Lens] View switched to PDF, will highlight clause:', selectedClause.id);
      // PDF-Highlight passiert automatisch beim nächsten Render über syncPdfHighlight
    }
  }, [viewMode, clearHighlight, selectedClause]);

  // ✅ FIX v2/v4: Robuste PDF-Text Synchronisation
  const syncPdfHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Nur im PDF-Modus mit ausgewählter Klausel
    if (viewMode !== 'pdf' || !selectedClause || !pdfUrl || pdfLoading) return;

    // ✅ FIX v4: Wenn User gerade in PDF geklickt hat, NICHT synchronisieren!
    // Der Klick-Handler hat bereits die richtige Markierung gesetzt.
    if (pdfClickActiveRef.current) {
      console.log('[Legal Lens] PDF sync: Skipping - user just clicked in PDF');
      pdfClickActiveRef.current = false; // Reset für nächsten Aufruf
      return;
    }

    // Debounce um sicherzustellen, dass PDF gerendert ist
    if (syncPdfHighlightTimeoutRef.current) {
      clearTimeout(syncPdfHighlightTimeoutRef.current);
    }

    syncPdfHighlightTimeoutRef.current = setTimeout(() => {
      // ✅ FIX v4: Nochmal prüfen - könnte sich während des Timeouts geändert haben
      if (pdfClickActiveRef.current) {
        console.log('[Legal Lens] PDF sync: Skipping in timeout - user clicked in PDF');
        pdfClickActiveRef.current = false;
        return;
      }

      // Vorherige Highlights entfernen
      clearHighlight();

      // Finde Text-Layer
      const textLayer = document.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) {
        console.log('[Legal Lens] PDF sync: No text layer found');
        return;
      }

      const allSpans = Array.from(textLayer.querySelectorAll('span')) as HTMLElement[];
      if (allSpans.length === 0) return;

      // ✅ Sammle gesamten Text und finde beste Übereinstimmung
      const clauseText = selectedClause.text.toLowerCase().normalize('NFC');
      const clauseWords = clauseText.split(/\s+/).filter(w => w.length > 3);

      if (clauseWords.length === 0) return;

      // Baue vollständigen Text mit Span-Referenzen
      let fullText = '';
      const spanPositions: Array<{span: HTMLElement, start: number, end: number}> = [];

      for (const span of allSpans) {
        const text = (span.textContent || '').normalize('NFC');
        const start = fullText.length;
        fullText += text + ' ';
        spanPositions.push({ span, start, end: fullText.length });
      }

      const fullTextLower = fullText.toLowerCase();

      // ✅ Suche nach den ersten 3-5 signifikanten Wörtern als Phrase
      const searchPhrases = [
        clauseWords.slice(0, 5).join(' '),  // Erste 5 Wörter
        clauseWords.slice(0, 3).join(' '),  // Erste 3 Wörter
        clauseWords[0] + ' ' + clauseWords[1], // Erste 2 Wörter
      ].filter(p => p.length > 5);

      let bestMatchIndex = -1;

      for (const phrase of searchPhrases) {
        const idx = fullTextLower.indexOf(phrase);
        if (idx !== -1) {
          bestMatchIndex = idx;
          console.log('[Legal Lens] PDF sync: Found phrase match:', phrase.substring(0, 30));
          break;
        }
      }

      // Fallback: Einzelne Wörter suchen
      if (bestMatchIndex === -1) {
        for (const word of clauseWords.slice(0, 3)) {
          if (word.length > 4) {
            const idx = fullTextLower.indexOf(word);
            if (idx !== -1) {
              bestMatchIndex = idx;
              console.log('[Legal Lens] PDF sync: Found word match:', word);
              break;
            }
          }
        }
      }

      if (bestMatchIndex === -1) {
        console.log('[Legal Lens] PDF sync: No match found in PDF');
        return;
      }

      // ✅ Finde alle Spans in diesem Bereich (ca. 200 Zeichen)
      const matchEnd = Math.min(bestMatchIndex + 200, fullText.length);
      const matchingSpans: HTMLElement[] = [];

      for (const { span, start, end } of spanPositions) {
        // Span überlappt mit Match-Bereich?
        if (start < matchEnd && end > bestMatchIndex) {
          matchingSpans.push(span);
          // Highlight hinzufügen
          span.classList.add('legal-lens-highlight');
        }
      }

      highlightedElementsRef.current = matchingSpans;

      // ✅ Scroll zum ersten Match
      if (matchingSpans.length > 0) {
        matchingSpans[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('[Legal Lens] PDF sync: Highlighted', matchingSpans.length, 'spans for clause:', selectedClause.id);
      }
    }, 600); // Etwas mehr Zeit für PDF-Rendering

    return () => {
      if (syncPdfHighlightTimeoutRef.current) {
        clearTimeout(syncPdfHighlightTimeoutRef.current);
      }
    };
  }, [viewMode, selectedClause?.id, pdfUrl, pdfLoading, pageNumber, clearHighlight]);

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
      }
      // Frei-Modus: Bei einfachem Klick ohne Markierung → nichts tun
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

  // Loading State - Normal Parsing
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

      {/* Smart Summary Modal */}
      {showSmartSummary && !isParsing && !isStreaming && (clauses || []).length > 0 && (
        <SmartSummary
          contractId={contractId}
          contractName={contractName}
          onDismiss={handleDismissSummary}
        />
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
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

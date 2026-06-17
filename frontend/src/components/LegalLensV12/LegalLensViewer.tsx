// 📁 components/LegalLens/LegalLensViewer.tsx
// Haupt-Komponente für Legal Lens Feature

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Eye, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, BarChart3, Zap, X, List, MessageSquare, LayoutGrid, ClipboardCheck, Download, Type, AlignJustify, MousePointer2, RefreshCw, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { useLegalLensV12 as useLegalLens, generateContentHash } from '../../hooks/useLegalLensV12';
import ClauseList from './ClauseList';
import ClauseSkeleton from './ClauseSkeleton';
import PerspectiveSwitcher from './PerspectiveSwitcher';
import AnalysisPanel from './AnalysisPanel';
import SmartSummary from './SmartSummary';
import ContractOverview from './ContractOverview';
import IndustrySelector from './IndustrySelector';
import NegotiationChecklist from './NegotiationChecklist';
import ExportAnalysisModal from './ExportAnalysisModal';
import RiskScoreGauge from './RiskScoreGauge';
import PerspectiveSelectionModal from './PerspectiveSelectionModal';
import * as legalLensAPI from '../../services/legalLensAPI';
import { handleAuthResponse } from '../../utils/api';
import type { IndustryType } from '../../types/legalLens';
import styles from '../../styles/LegalLensV12.module.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js Worker Setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// DEV-only logging - stripped in production builds by tree-shaking
const isDev = import.meta.env.DEV;
const devLog = (...args: unknown[]) => { if (isDev) console.log(...args); };
const devWarn = (...args: unknown[]) => { if (isDev) console.warn(...args); };

type ViewMode = 'text' | 'pdf';

// German legal abbreviations that should NOT be treated as sentence endings
const GERMAN_LEGAL_ABBREVIATIONS = /\b(Nr|Art|Abs|Ziff|lit|bzw|ca|etc|ggf|inkl|max|min|vgl|gem|ggü|usw|z\.?B|u\.?a|d\.?h|i\.?d\.?R|S|Rn|bez|bspw|lt|zzgl|abzgl|Tel|Fax|Str|Prof|Dr|i\.?V|evtl|einschl|sog|vorgen|nachf|Dipl|Ing|Aufl|Bd|Hrsg|allg|insb|entspr|ff|Fn|Kap|Zl|o\.?g|a\.?a\.?O|m\.?E|m\.?w\.?N|Anm|Anh)\.\s*$/i;

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

  // Analysis Panel ref for scroll-to-top
  const analysisPanelRef = useRef<HTMLDivElement>(null);

  // Perspective Selection Modal State
  const [showPerspectiveModal, setShowPerspectiveModal] = useState<boolean>(() => {
    return !localStorage.getItem('legalLens_defaultPerspective');
  });

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
  const [isExportingMarkedPdf, setIsExportingMarkedPdf] = useState<boolean>(false);

  // Decision-Filter (vom Banner getriggert, wird an ClauseList als Prop weitergereicht)
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'accepted' | 'negotiate' | 'rejected' | 'open' | 'noted'>('all');

  // Clause-Annotations (Inline-Notizen, localStorage-persistiert) — hochgezogen damit Banner sie zählen kann
  const annotationsKey = contractId ? `legalLens_annotations_${contractId}` : 'legalLens_annotations';
  const [clauseAnnotations, setClauseAnnotationsState] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(annotationsKey);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const handleSaveAnnotation = useCallback((clauseId: string, text: string) => {
    // Guard: PDF-Klausel-IDs (pdf-XXX) sind temporär und nicht in der clauses-Liste —
    // Notizen darauf wären "unsichtbar" für Banner-Filter. PDF-Markierungs-System
    // kommt in eigener Phase mit Page/Position-Anker.
    if (clauseId.startsWith('pdf-')) return;
    setClauseAnnotationsState(prev => {
      const next = { ...prev };
      if (text.trim()) next[clauseId] = text.trim();
      else delete next[clauseId];
      try { localStorage.setItem(annotationsKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [annotationsKey]);

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

  // ✅ Gescanntes-PDF-Hinweis (kein Text-Layer erkannt)
  const [showScanHint, setShowScanHint] = useState<boolean>(false);
  // Proaktive Erkennung: Wird in onDocumentLoadSuccess anhand des extrahierten Textes gesetzt
  const [isScannedPdf, setIsScannedPdf] = useState<boolean>(false);

  // Focus Mode — dims everything except selected clause
  const [focusMode, setFocusMode] = useState<boolean>(false);

  // Keyboard Shortcuts Modal
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // Header Score & Worst Clause Popovers
  const [showScorePopover, setShowScorePopover] = useState<boolean>(false);
  const [showWorstPopover, setShowWorstPopover] = useState<boolean>(false);
  const scorePopoverRef = useRef<HTMLDivElement>(null);
  const worstPopoverRef = useRef<HTMLDivElement>(null);

  // Header Overflow-Menü (Fokus, Branche, Export, Checkliste, Dashboard, Refresh, Summary)
  const [showOverflowMenu, setShowOverflowMenu] = useState<boolean>(false);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  // Celebration when all clauses reviewed
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const celebrationShownRef = useRef<boolean>(false);

  // Resizable Panel State
  const [analysisPanelWidth, setAnalysisPanelWidth] = useState<number>(() => {
    const vw = window.innerWidth;
    if (vw <= 1280) return Math.max(300, vw * 0.3);
    if (vw <= 1440) return Math.max(320, vw * 0.32);
    if (vw <= 1600) return Math.max(380, vw * 0.3);
    return 480;
  });
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

  // PDF continuous scroll: ref + scroll helper + IntersectionObserver
  const pdfScrollRef = useRef<HTMLDivElement>(null);

  const scrollToPdfPage = useCallback((page: number) => {
    setPageNumber(page);
    const container = pdfScrollRef.current;
    if (!container) return;
    const target = container.querySelector(`[data-page-num="${page}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  useEffect(() => {
    const container = pdfScrollRef.current;
    if (!container || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible page
        let maxRatio = 0;
        let visiblePage = pageNumber;
        for (const entry of entries) {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const pg = parseInt(entry.target.getAttribute('data-page-num') || '1', 10);
            visiblePage = pg;
          }
        }
        if (maxRatio > 0) setPageNumber(visiblePage);
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75] }
    );

    const pageElements = container.querySelectorAll('[data-page-num]');
    pageElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [numPages, viewMode, pdfUrl]);

  // Click-outside for score, worst clause & overflow menu
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (showScorePopover && scorePopoverRef.current && !scorePopoverRef.current.contains(e.target as Node)) {
        setShowScorePopover(false);
      }
      if (showWorstPopover && worstPopoverRef.current && !worstPopoverRef.current.contains(e.target as Node)) {
        setShowWorstPopover(false);
      }
      if (showOverflowMenu && overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
    };
    if (showScorePopover || showWorstPopover || showOverflowMenu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showScorePopover, showWorstPopover, showOverflowMenu]);

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
      const clampedWidth = Math.max(280, Math.min(800, newWidth));
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
    deselectClause,
    // ✅ Phase 1 Schritt 4: Queue-Priorisierung
    bumpClauseInQueue,
    // 🚪 Document Gate
    documentGateInfo
  } = useLegalLens();

  // Decision State — shared zwischen Banner (hier) und ClauseList (prop). Server-First mit Migration.
  const decisionsKey = contractId ? `legalLens_decisions_${contractId}` : 'legalLens_decisions';
  type ClauseDecision = 'accepted' | 'negotiate' | 'rejected';
  const [clauseDecisions, setClauseDecisionsState] = useState<Record<string, ClauseDecision>>(() => {
    try {
      const stored = localStorage.getItem(decisionsKey);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const migrationDoneRef = useRef(false);
  // Verhindert dass spätere setProgress-Calls (markAsReviewed/addNote/etc) den lokalen
  // Decision-State mit dem alten Server-Stand aus progress.decisions überschreiben.
  // Initial-Sync läuft EINMAL pro contractId, danach ist clauseDecisions Source of Truth.
  const initialDecisionsSyncedRef = useRef(false);
  useEffect(() => {
    initialDecisionsSyncedRef.current = false;
    migrationDoneRef.current = false;
  }, [contractId]);
  useEffect(() => {
    if (!contractId || !progress) return;
    if (initialDecisionsSyncedRef.current) return;
    initialDecisionsSyncedRef.current = true;
    const serverDecisions = progress.decisions || [];
    if (serverDecisions.length > 0) {
      const next: Record<string, ClauseDecision> = {};
      serverDecisions.forEach(d => { next[d.clauseId] = d.decision; });
      setClauseDecisionsState(next);
      try { localStorage.setItem(decisionsKey, JSON.stringify(next)); } catch { /* ignore */ }
    } else if (!migrationDoneRef.current) {
      let local: Record<string, ClauseDecision> = {};
      try { local = JSON.parse(localStorage.getItem(decisionsKey) || '{}'); } catch { /* ignore */ }
      const entries = Object.entries(local);
      if (entries.length > 0) {
        migrationDoneRef.current = true;
        const token = localStorage.getItem('token');
        entries.forEach(([clauseId, decision]) => {
          fetch(`/api/legal-lens/${contractId}/decision`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ clauseId, decision })
          })
            .then(handleAuthResponse)
            .catch(() => { /* fire-and-forget */ });
        });
      }
    }
  }, [progress, contractId, decisionsKey]);

  const handleSetDecision = useCallback((clauseId: string, decision: ClauseDecision) => {
    setClauseDecisionsState(prev => {
      const next = { ...prev };
      const newDecision = next[clauseId] === decision ? null : decision;
      if (newDecision === null) {
        delete next[clauseId];
      } else {
        next[clauseId] = newDecision;
      }
      try { localStorage.setItem(decisionsKey, JSON.stringify(next)); } catch { /* ignore */ }
      if (contractId) {
        const token = localStorage.getItem('token');
        fetch(`/api/legal-lens/${contractId}/decision`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clauseId, decision: newDecision })
        })
          .then(handleAuthResponse)
          .catch(err => console.warn('[Legal Lens] Decision sync failed:', err));
      }
      return next;
    });
  }, [decisionsKey, contractId]);

  // ─────────────────────────────────────────────────────────────────────────
  // PDF-Markers (Highlighter-Style, Server-persistiert) — eigene Welt von Text-Decisions
  // ─────────────────────────────────────────────────────────────────────────
  type PdfMarkerColor = 'green' | 'orange' | 'red' | 'blue';
  type PdfMarker = {
    id: string;
    page: number;
    spanIndices: number[];
    textSnippet: string;
    color: PdfMarkerColor;
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  const [pdfMarkers, setPdfMarkersState] = useState<PdfMarker[]>([]);

  // Server-Sync: progress.pdfMarkers → State (Server gewinnt)
  useEffect(() => {
    if (!progress) return;
    const serverMarkers = (progress as { pdfMarkers?: PdfMarker[] }).pdfMarkers || [];
    setPdfMarkersState(serverMarkers);
  }, [progress]);

  const handleAddPdfMarker = useCallback((marker: PdfMarker) => {
    setPdfMarkersState(prev => [...prev, marker]);
    if (contractId) {
      const token = localStorage.getItem('token');
      fetch(`/api/legal-lens/${contractId}/pdf-marker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(marker)
      })
        .then(handleAuthResponse)
        .catch(err => console.warn('[Legal Lens] PDF-Marker create failed:', err));
    }
  }, [contractId]);

  const handleUpdatePdfMarker = useCallback((markerId: string, updates: Partial<Pick<PdfMarker, 'color' | 'note'>>) => {
    setPdfMarkersState(prev => prev.map(m =>
      m.id === markerId ? { ...m, ...updates, updatedAt: new Date() } : m
    ));
    if (contractId) {
      const token = localStorage.getItem('token');
      fetch(`/api/legal-lens/${contractId}/pdf-marker/${markerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates)
      })
        .then(handleAuthResponse)
        .catch(err => console.warn('[Legal Lens] PDF-Marker update failed:', err));
    }
  }, [contractId]);

  const handleDeletePdfMarker = useCallback((markerId: string) => {
    setPdfMarkersState(prev => prev.filter(m => m.id !== markerId));
    // SOFORT DOM-Elemente entfernen (synchron) — verhindert Race-Condition:
    // Wenn User direkt nach Delete nochmal klickt, soll der Marker visuell schon weg sein,
    // damit kein "Geister-Klick" auf alten DOM-Marker erfolgt.
    document.querySelectorAll(`[data-marker-id="${markerId}"]`).forEach(el => el.remove());
    if (contractId) {
      const token = localStorage.getItem('token');
      fetch(`/api/legal-lens/${contractId}/pdf-marker/${markerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(handleAuthResponse)
        .catch(err => console.warn('[Legal Lens] PDF-Marker delete failed:', err));
    }
  }, [contractId]);

  // Aktiver Markierungs-Modus (null = Lesemodus)
  type ActiveMarkerMode = PdfMarkerColor | 'note' | null;
  const [activeMarkerMode, setActiveMarkerMode] = useState<ActiveMarkerMode>(null);

  // ─── Sub-Phase 6: Sidebar "Deine Markierungen" ───
  // Isolierter Block — komplette Rücknahme möglich durch Entfernen von:
  // a) showMarkerSidebar/pdfMarkerCountsForSidebar (hier)
  // b) Toggle-Button in PDF-Toolbar (suche: data-sub-phase-6-toggle)
  // c) Sidebar-JSX (suche: data-sub-phase-6-sidebar)
  // d) scrollToMarker-Funktion (suche: data-sub-phase-6-scroll)
  // e) CSS-Klassen in LegalLensV12.module.css (suche: Sub-Phase 6)
  const [showMarkerSidebar, setShowMarkerSidebar] = useState<boolean>(false);
  const pdfMarkerCountsForSidebar = useMemo(() => {
    const counts = { green: 0, orange: 0, red: 0, blue: 0 };
    pdfMarkers.forEach(m => {
      if (m.color in counts) counts[m.color]++;
    });
    return counts;
  }, [pdfMarkers]);
  const scrollToMarker = useCallback((marker: PdfMarker) => {
    // data-sub-phase-6-scroll
    scrollToPdfPage(marker.page);
    // Kurzer Blink-Effekt: füge temp Klasse hinzu, entferne nach 1.5s
    setTimeout(() => {
      const el = document.querySelector(`[data-marker-id="${marker.id}"]`) as HTMLElement | null;
      if (el) {
        el.classList.add('legal-lens-marker-blink');
        setTimeout(() => el.classList.remove('legal-lens-marker-blink'), 1500);
      }
    }, 400); // wait for scroll to settle
  }, [scrollToPdfPage]);
  // Ref damit DOM-Listener und Render-Funktion den aktuellen Modus lesen können, ohne Re-Bind
  const activeMarkerModeRef = useRef<ActiveMarkerMode>(null);
  useEffect(() => {
    activeMarkerModeRef.current = activeMarkerMode;
    // Lesemodus: Marker-Overlays click-through (Klausel-Analyse fängt Klick ab)
    // Marker-Modus: Marker-Overlays klickbar (Edit-Popover öffnet sich)
    const inReadMode = activeMarkerMode === null;
    document.querySelectorAll('.legal-lens-pdf-marker').forEach(el => {
      const h = el as HTMLElement;
      h.style.pointerEvents = inReadMode ? 'none' : 'auto';
      h.style.cursor = inReadMode ? 'inherit' : 'pointer';
    });
  }, [activeMarkerMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-Phase 3: Persistente Marker-Overlays auf dem PDF
  // ─────────────────────────────────────────────────────────────────────────
  const pdfMarkerContainersRef = useRef<Map<number, HTMLDivElement>>(new Map());

  // Ref-Pattern: openMarkerEditor wird weiter unten definiert, aber Marker-onClick
  // braucht stabilen Verweis (DOM-vanilla addEventListener kann keine stale closures)
  const openMarkerEditorRef = useRef<(markerId: string, anchorEl: HTMLElement) => void>(() => {});

  // MARKER_COLOR_BG ist stable via useRef damit useCallback-Identity nicht bei jedem Render wechselt
  // (verhindert Render-Loop in useEffect[renderPdfMarkersForPage])
  // Highlighter-Farben: bewusst transparent damit Text darunter klar lesbar bleibt (wie echter Marker)
  const MARKER_COLOR_BG_REF = useRef<Record<PdfMarkerColor, string>>({
    green: 'rgba(34, 197, 94, 0.22)',
    orange: 'rgba(249, 115, 22, 0.25)',
    red: 'rgba(239, 68, 68, 0.22)',
    blue: 'rgba(59, 130, 246, 0.20)'
  });

  // Marker für eine bestimmte Page rendern (Overlay-Divs über den Text-Spans)
  const renderPdfMarkersForPage = useCallback((pageNum: number) => {
    const pageWrapper = document.querySelector(`[data-page-num="${pageNum}"]`);
    if (!pageWrapper) return;
    const pdfPage = pageWrapper.querySelector('.react-pdf__Page');
    if (!pdfPage) return;
    const textLayer = pdfPage.querySelector('.react-pdf__Page__textContent');
    if (!textLayer || textLayer.querySelectorAll('span').length === 0) return; // noch nicht bereit

    // Alten Marker-Container für diese Page entfernen
    const existing = pdfMarkerContainersRef.current.get(pageNum);
    if (existing) existing.remove();

    const markersForPage = pdfMarkers.filter(m => m.page === pageNum);
    if (markersForPage.length === 0) {
      // Container aus DOM entfernen (sonst bleibt alter Marker visuell stehen)
      const existing = pdfMarkerContainersRef.current.get(pageNum);
      if (existing) existing.remove();
      pdfMarkerContainersRef.current.delete(pageNum);
      return;
    }

    const pageRect = pdfPage.getBoundingClientRect();
    const allSpans = Array.from(textLayer.querySelectorAll('span')) as HTMLElement[];

    const container = document.createElement('div');
    container.className = 'legal-lens-pdf-markers';
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 3;
      overflow: visible;
    `;
    // PdfPage explizit auf overflow:visible setzen damit Notiz-Icon außerhalb sichtbar bleibt
    (pdfPage as HTMLElement).style.overflow = 'visible';

    markersForPage.forEach(marker => {
      marker.spanIndices.forEach(idx => {
        const span = allSpans[idx];
        if (!span) return;
        const rect = span.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.className = 'legal-lens-pdf-marker';
        overlay.dataset.markerId = marker.id;
        overlay.dataset.markerColor = marker.color;
        // Im Lesemodus click-through, damit Klausel-Analyse durchgereicht wird
        const inReadMode = activeMarkerModeRef.current === null;
        overlay.style.cssText = `
          position: absolute;
          left: ${rect.left - pageRect.left}px;
          top: ${rect.top - pageRect.top}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          background-color: ${MARKER_COLOR_BG_REF.current[marker.color] || 'rgba(253, 224, 71, 0.4)'};
          border-radius: 2px;
          pointer-events: ${inReadMode ? 'none' : 'auto'};
          cursor: ${inReadMode ? 'inherit' : 'pointer'};
          transition: filter 0.15s;
          z-index: 4;
        `;
        if (marker.note) {
          overlay.title = marker.note;
        }
        // Direkt einen Click-Listener attachen — robuster als target.closest in onClickCapture
        overlay.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          openMarkerEditorRef.current(marker.id, overlay);
        });
        overlay.addEventListener('mouseenter', () => {
          overlay.style.filter = 'brightness(0.85)';
        });
        overlay.addEventListener('mouseleave', () => {
          overlay.style.filter = 'none';
        });
        container.appendChild(overlay);
      });

      // 📝-Indikator wenn Marker eine Notiz hat — am rechten Rand des ersten Spans
      if (marker.note && marker.note.trim().length > 0 && marker.spanIndices.length > 0) {
        const firstSpan = allSpans[marker.spanIndices[0]];
        if (firstSpan) {
          const fRect = firstSpan.getBoundingClientRect();
          const noteIcon = document.createElement('div');
          noteIcon.className = 'legal-lens-pdf-marker-note-icon';
          noteIcon.textContent = '📝';
          noteIcon.title = marker.note;
          noteIcon.dataset.markerId = marker.id;
          noteIcon.style.cssText = `
            position: absolute;
            right: -34px;
            top: ${fRect.top - pageRect.top - 2}px;
            font-size: 14px;
            line-height: 1;
            pointer-events: auto;
            cursor: pointer;
            background: white;
            border: 1.5px solid #93c5fd;
            border-radius: 6px;
            padding: 2px 5px;
            box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25);
            z-index: 5;
          `;
          noteIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const allOverlays = container.querySelectorAll(`[data-marker-id="${marker.id}"]`);
            const anchor = (allOverlays[0] as HTMLElement) || noteIcon;
            openMarkerEditorRef.current(marker.id, anchor);

            // Pulse-Effekt: alle Marker-Overlays kurz hervorheben — weicher Glow + Brightness-Lift
            // damit User sieht WO die Notiz im PDF ist (Tage später nachvollziehbar)
            setTimeout(() => {
              allOverlays.forEach((el) => {
                const overlay = el as HTMLElement;
                const originalBoxShadow = overlay.style.boxShadow;
                const originalFilter = overlay.style.filter;
                const originalTransition = overlay.style.transition;
                overlay.style.transition = 'box-shadow 0.4s ease-out, filter 0.4s ease-out';
                overlay.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.18), 0 0 14px rgba(59, 130, 246, 0.35)';
                overlay.style.filter = 'brightness(1.2) saturate(1.3)';
                setTimeout(() => {
                  overlay.style.boxShadow = originalBoxShadow || '';
                  overlay.style.filter = originalFilter || '';
                  overlay.style.transition = originalTransition || '';
                }, 1500);
              });
            }, 50);
          });
          container.appendChild(noteIcon);
        }
      }
    });

    // Container NACH textLayer einfügen (höher im DOM-Stacking) damit Klicks ankommen
    pdfPage.appendChild(container);
    pdfMarkerContainersRef.current.set(pageNum, container);
  }, [pdfMarkers]);

  // Re-Render Marker bei pdfMarkers / Page-Wechsel (NICHT bei scale — siehe separater Effect unten)
  // Retry-Loop: pollt bis Text-Layer der Page bereit ist (PDF-Pages laden lazy)
  useEffect(() => {
    if (viewMode !== 'pdf') return;
    const pagesWithMarkers = Array.from(new Set(pdfMarkers.map(m => m.page)));

    // Cleanup: entferne Container für Pages die KEINE Marker mehr haben
    const pagesInDOM = Array.from(pdfMarkerContainersRef.current.keys());
    pagesInDOM.forEach(p => {
      if (!pagesWithMarkers.includes(p)) {
        const c = pdfMarkerContainersRef.current.get(p);
        if (c) c.remove();
        pdfMarkerContainersRef.current.delete(p);
      }
    });

    if (pagesWithMarkers.length === 0) return;

    let totalAttempts = 0;
    const MAX_ATTEMPTS = 30; // 30 × 200ms = max 6s warten
    const renderedPages = new Set<number>();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const attemptRender = () => {
      if (totalAttempts >= MAX_ATTEMPTS) return;
      totalAttempts++;

      let allDone = true;
      pagesWithMarkers.forEach(p => {
        if (renderedPages.has(p)) return;
        const pageEl = document.querySelector(`[data-page-num="${p}"]`);
        const textLayer = pageEl?.querySelector('.react-pdf__Page__textContent');
        if (textLayer && textLayer.querySelectorAll('span').length > 0) {
          renderPdfMarkersForPage(p);
          renderedPages.add(p);
        } else {
          allDone = false;
        }
      });

      if (!allDone) {
        timeoutId = setTimeout(attemptRender, 200);
      }
    };

    attemptRender();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pdfMarkers, numPages, viewMode, renderPdfMarkersForPage]);

  // Separater Effect für Scale-Change: alte Container entfernen + neu rendern mit Debounce
  // Verhindert Scroll-Sprung weil react-pdf-internal beim Scale-Re-Render Page-Order verändern kann
  useEffect(() => {
    if (viewMode !== 'pdf') return;
    if (pdfMarkers.length === 0) return;

    // Alle existing Container entfernen (alte Position passt nicht mehr nach Scale)
    pdfMarkerContainersRef.current.forEach(c => c.remove());
    pdfMarkerContainersRef.current.clear();

    // Nach 600ms (PDF fertig re-rendert) neu zeichnen
    const timer = setTimeout(() => {
      const pagesWithMarkers = Array.from(new Set(pdfMarkers.map(m => m.page)));
      pagesWithMarkers.forEach(p => {
        const pageEl = document.querySelector(`[data-page-num="${p}"]`);
        const textLayer = pageEl?.querySelector('.react-pdf__Page__textContent');
        if (textLayer && textLayer.querySelectorAll('span').length > 0) {
          renderPdfMarkersForPage(p);
        }
      });
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // Cleanup beim Wechsel zur Text-View (sonst hängen Marker-Container in der DOM-Hierarchie)
  useEffect(() => {
    if (viewMode === 'text') {
      pdfMarkerContainersRef.current.forEach(c => c.remove());
      pdfMarkerContainersRef.current.clear();
    }
  }, [viewMode]);

  // Cleanup beim Unmount
  useEffect(() => {
    const containers = pdfMarkerContainersRef.current;
    return () => {
      containers.forEach(c => c.remove());
      containers.clear();
    };
  }, []);

  // Tastenkürzel für Marker-Modus (Sub-Phase 4)
  useEffect(() => {
    if (viewMode !== 'pdf') return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { setActiveMarkerMode(null); }
      else if (e.key === '1') { setActiveMarkerMode('green'); }
      else if (e.key === '2') { setActiveMarkerMode('orange'); }
      else if (e.key === '3') { setActiveMarkerMode('red'); }
      else if (e.key === '4') { setActiveMarkerMode('note'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-Phase 7: Edit-on-Click Popover für existing Marker
  // ─────────────────────────────────────────────────────────────────────────
  const [editingMarker, setEditingMarker] = useState<{
    markerId: string;
    color: PdfMarkerColor;
    note: string;
    position: { top: number; left: number };
  } | null>(null);

  const openMarkerEditor = useCallback((markerId: string, anchorEl: HTMLElement) => {
    const marker = pdfMarkers.find(m => m.id === markerId);
    if (!marker) return;
    const rect = anchorEl.getBoundingClientRect();
    const POPOVER_HEIGHT_ESTIMATE = 280;
    const POPOVER_WIDTH = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= POPOVER_HEIGHT_ESTIMATE + 16
      ? rect.bottom + 8
      : Math.max(8, rect.top - POPOVER_HEIGHT_ESTIMATE - 8);
    setEditingMarker({
      markerId,
      color: marker.color,
      note: marker.note || '',
      position: {
        top,
        left: Math.max(8, Math.min(window.innerWidth - POPOVER_WIDTH - 8, rect.left))
      }
    });
  }, [pdfMarkers]);

  // Sync Ref damit Marker-Click-Listener immer aktuelle Closure trifft
  useEffect(() => {
    openMarkerEditorRef.current = openMarkerEditor;
  }, [openMarkerEditor]);

  // Helper: Editor schließen + aktuelle Notiz vorher speichern (verhindert Datenverlust)
  const closeMarkerEditor = useCallback(() => {
    if (editingMarker) {
      handleUpdatePdfMarker(editingMarker.markerId, { note: editingMarker.note });
    }
    setEditingMarker(null);
  }, [editingMarker, handleUpdatePdfMarker]);

  // Klick außerhalb des Popovers → schließen (mit Save)
  useEffect(() => {
    if (!editingMarker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.legal-lens-marker-popover') || target.closest('.legal-lens-pdf-marker')) return;
      closeMarkerEditor();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [editingMarker, closeMarkerEditor]);

  // Decision Summary — liest direkt aus shared State, synchron mit jeder Aktion
  // Notes-Count: nur Klauseln aus der echten clauses-Liste (KEINE pdf-XXX temporären IDs)
  const decisionSummary = useMemo(() => {
    const values = Object.values(clauseDecisions);
    const notedClauseIds = new Set<string>();
    (progress?.notes || []).forEach(n => {
      if (!n.clauseId.startsWith('pdf-')) notedClauseIds.add(n.clauseId);
    });
    Object.entries(clauseAnnotations).forEach(([clauseId, text]) => {
      if (clauseId.startsWith('pdf-')) return;
      if (text && text.trim().length > 0) notedClauseIds.add(clauseId);
    });
    const noted = notedClauseIds.size;
    if (values.length === 0 && noted === 0) return null;
    return {
      accepted: values.filter(v => v === 'accepted').length,
      negotiate: values.filter(v => v === 'negotiate').length,
      rejected: values.filter(v => v === 'rejected').length,
      noted,
      total: values.length
    };
  }, [clauseDecisions, progress?.notes, clauseAnnotations]);

  // ============================================
  // URL ANCHORING — #clause=<id> for deep-linking
  // ============================================
  // Read clause from hash on initial load
  useEffect(() => {
    if (!clauses || clauses.length === 0) return;
    const hash = window.location.hash;
    const match = hash.match(/clause=([^&]+)/);
    if (match) {
      const targetId = match[1];
      const target = clauses.find(c => c.id === targetId);
      if (target && !target.nonAnalyzable) {
        selectClause(target);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clauses?.length]); // Only on first load when clauses arrive

  // Update hash when clause selection changes
  useEffect(() => {
    if (selectedClause) {
      const newHash = `#clause=${selectedClause.id}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    } else if (window.location.hash.includes('clause=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [selectedClause?.id]);

  // ============================================
  // RISK STATS — Gesamtrisiko, Quick Stats, Worst Clause
  // ============================================
  const riskStats = useMemo(() => {
    const cacheEntries = Object.entries(analysisCache);
    if (cacheEntries.length === 0) return null;

    const perspectiveEntries = cacheEntries.filter(([key]) =>
      key.endsWith(`-${currentPerspective}`)
    );
    if (perspectiveEntries.length === 0) return null;

    let totalScore = 0;
    let count = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let worstScore = 0;
    let worstClauseId: string | null = null;

    for (const [key, analysis] of perspectiveEntries) {
      const a = analysis as { riskAssessment?: { score: number }; actionLevel?: string; clauseId?: string };
      let score = 0;

      if (a.riskAssessment?.score != null) {
        score = a.riskAssessment.score;
      } else if (a.actionLevel) {
        score = a.actionLevel === 'reject' ? 80 : a.actionLevel === 'negotiate' ? 50 : 20;
      }

      if (score > 0) {
        totalScore += score;
        count++;
        if (score >= 60) high++;
        else if (score >= 30) medium++;
        else low++;

        if (score > worstScore) {
          worstScore = score;
          // Extract clauseId from cache key: "v2-{hash}-{perspective}"
          worstClauseId = a.clauseId || key.split('-').slice(1, -1).join('-');
        }
      }
    }

    if (count === 0) return null;

    const worstClause = worstClauseId && clauses
      ? clauses.find(c => c.id === worstClauseId) ||
        clauses.find(c => {
          const hash = generateContentHash(c.text);
          return worstClauseId === hash;
        })
      : null;

    return {
      overallScore: Math.round(totalScore / count),
      analyzed: count,
      high,
      medium,
      low,
      worstClause,
      worstScore
    };
  }, [analysisCache, currentPerspective, clauses]);

  // Navigate to next high-risk clause (skips already-reviewed if possible)
  // Bevorzugt Tiefenanalyse-Score (≥30 = mittel/hoch), fällt auf Pre-Analyse zurück
  // wenn noch keine Tiefenanalyse vorliegt — synchron mit riskStats im Header.
  const goToNextRisk = useCallback(() => {
    if (!clauses || clauses.length === 0) return;

    const analyzable = clauses.filter(c => !c.nonAnalyzable);
    const currentIdx = selectedClause
      ? analyzable.findIndex(c => c.id === selectedClause.id)
      : -1;

    const reviewed = new Set(progress?.reviewedClauses || []);
    const candidates = analyzable.filter((c, idx) => {
      if (idx === currentIdx) return false;

      // 1. Versuche Tiefenanalyse-Score aus dem Cache (gleicher Lookup wie riskStats)
      const hash = generateContentHash(c.text);
      const cacheKey = `v2-${hash}-${currentPerspective}`;
      const cached = (analysisCache as Record<string, unknown>)[cacheKey] as
        { riskAssessment?: { score?: number }; actionLevel?: string } | undefined;

      if (cached) {
        let score = 0;
        if (cached.riskAssessment?.score != null) {
          score = cached.riskAssessment.score;
        } else if (cached.actionLevel) {
          score = cached.actionLevel === 'reject' ? 80 : cached.actionLevel === 'negotiate' ? 50 : 20;
        }
        return score >= 30; // mittel + hoch
      }

      // 2. Fallback: Pre-Analyse (wenn Tiefenanalyse fehlt)
      const riskLevel = c.preAnalysis?.riskLevel || c.riskIndicators?.level || 'low';
      return riskLevel === 'high' || riskLevel === 'medium';
    });

    // Prefer unreviewed, then any risk clause
    const unreviewed = candidates.filter(c => !reviewed.has(c.id));
    const target = unreviewed.length > 0 ? unreviewed[0] : candidates[0];

    if (target) {
      selectClause(target);
    }
  }, [clauses, selectedClause, progress, selectClause, analysisCache, currentPerspective]);

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

        case 'n': // Next risk clause
          e.preventDefault();
          goToNextRisk();
          return;

        case 'f': // Focus mode toggle
          e.preventDefault();
          setFocusMode(prev => !prev);
          return;

        case '?': // Keyboard shortcuts help
          e.preventDefault();
          setShowShortcutsModal(prev => !prev);
          return;

        case 'Escape':
          e.preventDefault();
          if (showShortcutsModal) {
            setShowShortcutsModal(false);
          } else if (focusMode) {
            setFocusMode(false);
          } else if (selectedClause) {
            deselectClause();
          }
          return;

        default:
          return;
      }

      if (newIndex >= 0 && newIndex < analyzableClauses.length) {
        selectClause(analyzableClauses[newIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clauses, selectedClause, selectClause, deselectClause, goToNextRisk, focusMode, showShortcutsModal, isParsing, isStreaming]);

  // Auto-mark clause as reviewed when analysis is displayed
  useEffect(() => {
    if (selectedClause && currentAnalysis && !isAnalyzing) {
      markClauseReviewed(selectedClause.id);
    }
  }, [selectedClause?.id, currentAnalysis, isAnalyzing, markClauseReviewed]);

  // Review progress stats
  const reviewStats = useMemo(() => {
    if (!clauses || clauses.length === 0) return null;
    const analyzable = clauses.filter(c => !c.nonAnalyzable);
    const reviewed = progress?.reviewedClauses?.length || 0;
    const total = analyzable.length;
    return {
      reviewed,
      total,
      percent: total > 0 ? Math.round((reviewed / total) * 100) : 0
    };
  }, [clauses, progress?.reviewedClauses]);

  // Celebration trigger
  useEffect(() => {
    if (reviewStats && reviewStats.percent === 100 && reviewStats.total > 2 && !celebrationShownRef.current) {
      celebrationShownRef.current = true;
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4000);
    }
  }, [reviewStats]);

  // Prev/Next clause navigation for Analysis Panel
  const clauseNavInfo = useMemo(() => {
    if (!clauses || clauses.length === 0 || !selectedClause) return null;
    const analyzable = clauses.filter(c => !c.nonAnalyzable);
    const idx = analyzable.findIndex(c => c.id === selectedClause.id);
    if (idx === -1) return null;
    return {
      current: idx + 1,
      total: analyzable.length,
      hasPrev: idx > 0,
      hasNext: idx < analyzable.length - 1,
      prevClause: idx > 0 ? analyzable[idx - 1] : null,
      nextClause: idx < analyzable.length - 1 ? analyzable[idx + 1] : null
    };
  }, [clauses, selectedClause]);

  const goToPrevClause = useCallback(() => {
    if (clauseNavInfo?.prevClause) selectClause(clauseNavInfo.prevClause);
  }, [clauseNavInfo, selectClause]);

  const goToNextClause = useCallback(() => {
    if (clauseNavInfo?.nextClause) selectClause(clauseNavInfo.nextClause);
  }, [clauseNavInfo, selectClause]);

  // Scroll analysis panel to top when clause changes
  useEffect(() => {
    if (selectedClause && analysisPanelRef.current) {
      analysisPanelRef.current.scrollTop = 0;
    }
  }, [selectedClause?.id]);

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
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const response = await fetch(`${apiUrl}/api/s3/view?contractId=${contractId}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        await handleAuthResponse(response);

        if (!response.ok) {
          throw new Error('PDF konnte nicht geladen werden');
        }

        const data = await response.json();
        setPdfUrl(data.url || data.fileUrl);
      } catch (err) {
        devLog('[Legal Lens] PDF Load Error:', err);
        setPdfError(err instanceof Error ? err.message : 'PDF Ladefehler');
      } finally {
        setPdfLoading(false);
      }
    };

    loadPdfUrl();
  }, [viewMode, contractId, getApiUrl, pdfUrl]);

  // Vertrag beim Laden parsen
  // ✅ Stable-Ref-Pattern: parseContract.reference kann sich ändern (retryCount-Dep im Hook),
  // aber wir wollen NUR bei contractId-Change neu parsen (verhindert Endlosschleife)
  const parseContractRef = useRef(parseContract);
  useEffect(() => { parseContractRef.current = parseContract; }, [parseContract]);

  useEffect(() => {
    if (contractId) {
      parseContractRef.current(contractId);
    }
  }, [contractId]);

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
        devWarn('[Legal Lens] Could not load industry context:', err);
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
        devLog(`[Legal Lens] Industry manually changed to: ${industry}`);
      }
    } catch (err) {
      devLog('[Legal Lens] Failed to set industry:', err);
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

    // ✅ FIX Issue #1: Content-basierter Cache-Key (gleicher Hash wie im Hook)
    const cacheKey = `v2-${generateContentHash(selectedClause.text)}-${currentPerspective}`;

    // Direkter Cache-Check
    const isAlreadyCached = cacheKey in analysisCache;
    if (isAlreadyCached) return;

    // ✅ Prüfe ob currentAnalysis zur ausgewählten Klausel passt
    // (Analyse enthält alle Perspektiven, daher nur clauseId prüfen)
    const currentMatchesClause = currentAnalysis &&
      currentAnalysis.clauseId === selectedClause.id;

    if (currentMatchesClause) return;

    // Queue-Priorisierung wenn Batch läuft, aber sofort analysieren
    if (isBatchAnalyzing) {
      bumpClauseInQueue(selectedClause);
    }

    // JSON-Modus statt Streaming — Streaming-Route liefert nur Markdown ohne strukturierte Analyse
    analyzeClause(false);
  }, [selectedClause?.id, currentPerspective, isAnalyzing, analysisCache, currentAnalysis, analyzeClause, isBatchAnalyzing, bumpClauseInQueue]);

  // Perspective Selection Handler
  const handlePerspectiveSelected = useCallback((perspective: import('../../types/legalLens').PerspectiveType) => {
    localStorage.setItem('legalLens_defaultPerspective', perspective);
    changePerspective(perspective);
    setShowPerspectiveModal(false);
  }, [changePerspective]);

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
    setIsScannedPdf(false); // Reset Scan-Detection für neues Dokument

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

        // ✅ Gescanntes PDF erkennen: Wenn pdfjs keinen (oder kaum) Text liefert,
        // hat das PDF keine Text-Ebene (OCR-Scan). Schwelle: < 50 Zeichen pro Seite im Schnitt.
        let totalChars = 0;
        textIndex.forEach(t => { totalChars += t.replace(/\s/g, '').length; });
        const avgPerPage = numPages > 0 ? totalChars / numPages : 0;
        setIsScannedPdf(avgPerPage < 50);

        setPdfIndexReady(true); // ✅ Signal dass Index bereit ist
        // ✅ FIX: Nach Index-Erstellung zur Klausel navigieren (wenn vorhanden)
        // NICHT vorher setPageNumber(1) aufrufen - das überschreibt die Navigation!
        if (selectedClause && !selectedClause.id.startsWith('pdf-')) {
          const targetPage = findPageForClause(selectedClause.text);
          if (targetPage) {
            scrollToPdfPage(targetPage);
            lastNavigatedClauseIdRef.current = selectedClause.id;
          } else {
            setPageNumber(1); // Fallback nur wenn Klausel nicht gefunden
          }
        } else {
          setPageNumber(1); // Keine Klausel ausgewählt → Seite 1
        }
      } catch (err) {
        devWarn('[Legal Lens] Text-Index Extraktion fehlgeschlagen:', err);
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
      devLog('[Legal Lens] findPageForClause: No text index available');
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
      devLog('[Legal Lens] findPageForClause: No significant words');
      return null;
    }

    devLog('[Legal Lens] findPageForClause: Searching for words:', clauseWords.slice(0, 5).join(', '));

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
      return bestPage;
    }

    devLog('[Legal Lens] findPageForClause: No match found');
    return null;
  }, []);

  // Highlight-Overlay-Container Ref
  const highlightContainerRef = useRef<HTMLDivElement | null>(null);

  // Highlight von allen markierten Elementen entfernen
  const clearHighlight = useCallback(() => {
    // Alte Methode: Klassen entfernen (falls noch vorhanden)
    highlightedElementsRef.current.forEach(el => {
      el.classList.remove('legal-lens-highlight');
    });
    highlightedElementsRef.current = [];

    // Neue Methode: Highlight-Overlay-Divs entfernen
    if (highlightContainerRef.current) {
      highlightContainerRef.current.remove();
      highlightContainerRef.current = null;
    }
  }, []);

  // ✅ NEUE METHODE: Erstelle Highlight-Overlays UNTER der Textschicht
  const createHighlightOverlays = useCallback((spans: HTMLElement[], targetPdfPage?: Element | null) => {
    if (spans.length === 0) return;

    // Finde die PDF-Page (Target hat Vorrang vor "erste Page im DOM"-Fallback)
    const pdfPage = targetPdfPage ?? document.querySelector('.react-pdf__Page');
    if (!pdfPage) return;

    // Entferne alten Container falls vorhanden
    if (highlightContainerRef.current) {
      highlightContainerRef.current.remove();
    }

    // Erstelle neuen Highlight-Container
    const container = document.createElement('div');
    container.className = 'legal-lens-highlight-container';
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    `;

    // Page-Position für relative Berechnung
    const pageRect = pdfPage.getBoundingClientRect();

    // Erstelle für jeden Span ein Highlight-Div
    for (const span of spans) {
      const rect = span.getBoundingClientRect();

      const highlightDiv = document.createElement('div');
      highlightDiv.className = 'legal-lens-highlight-box';
      highlightDiv.style.cssText = `
        position: absolute;
        left: ${rect.left - pageRect.left}px;
        top: ${rect.top - pageRect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background-color: rgba(253, 224, 71, 0.4);
        pointer-events: none;
        border-radius: 2px;
      `;
      container.appendChild(highlightDiv);
    }

    // Füge Container VOR der Textschicht ein (damit er darunter liegt)
    const textLayer = pdfPage.querySelector('.react-pdf__Page__textContent');
    if (textLayer) {
      pdfPage.insertBefore(container, textLayer);
    } else {
      pdfPage.appendChild(container);
    }

    highlightContainerRef.current = container;
    devLog('[Legal Lens] Created', spans.length, 'highlight overlays');
  }, []);

  // ✅ FIX v7: PDF-Sync mit Schutz vor Navigation bei PDF-Klick
  // WICHTIG: Bei PDF-Klick KEINE Navigation, nur bei Text→PDF Wechsel

  const prevViewModeRef = useRef<ViewMode>(viewMode);
  const lastNavigatedClauseIdRef = useRef<string | null>(null);
  const syncPdfHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingNavigationRef = useRef<string | null>(null);
  const lastScrolledClauseIdRef = useRef<string | null>(null);

  // ========== EFFECT 0: Clear highlights on zoom/page change ==========
  useEffect(() => {
    clearHighlight();
  }, [scale, pageNumber, clearHighlight]);

  // ========== EFFECT 1: View-Wechsel Handler ==========
  useEffect(() => {
    if (viewMode === 'text' && prevViewModeRef.current === 'pdf') {
      clearHighlight();
      lastScrolledClauseIdRef.current = null;
      devLog('[Legal Lens] View switched to Text');
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode, clearHighlight]);

  // Reset Scroll-Guard bei Deselect, damit Re-Selektion derselben Klausel wieder scrollt
  useEffect(() => {
    if (!selectedClause?.id) {
      lastScrolledClauseIdRef.current = null;
    }
  }, [selectedClause?.id]);

  // ========== EFFECT 2: Navigation bei neuer Klausel ==========
  useEffect(() => {
    if (viewMode !== 'pdf' || !selectedClause || !pdfUrl) return;

    // ✅ FIX v7: KEINE Navigation wenn User gerade in PDF geklickt hat!
    // PDF-Klick-Klauseln haben IDs wie "pdf-paragraph-xxx" oder "pdf-sentence-xxx"
    if (selectedClause.id.startsWith('pdf-')) {
      devLog('[Legal Lens] Skipping navigation - clause created from PDF click');
      lastNavigatedClauseIdRef.current = selectedClause.id;
      return;
    }

    // Nur navigieren wenn sich die KLAUSEL geändert hat
    if (lastNavigatedClauseIdRef.current === selectedClause.id) {
      return;
    }

    devLog('[Legal Lens] New clause from text view:', selectedClause.id);

    // Wenn Index noch nicht geladen, merken für später
    if (pdfTextIndexRef.current.size === 0) {
      pendingNavigationRef.current = selectedClause.id;
      devLog('[Legal Lens] PDF index not ready, pending navigation');
      return;
    }

    // Navigation durchführen
    lastNavigatedClauseIdRef.current = selectedClause.id;
    pendingNavigationRef.current = null;

    const targetPage = findPageForClause(selectedClause.text);
    if (targetPage) {
      scrollToPdfPage(targetPage);
    } else {
      devLog('[Legal Lens] Could not find clause in PDF');
    }
  }, [viewMode, selectedClause?.id, pdfUrl, findPageForClause, scrollToPdfPage]);

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

    devLog('[Legal Lens] PDF index ready, executing pending navigation');
    lastNavigatedClauseIdRef.current = selectedClause.id;
    pendingNavigationRef.current = null;

    const targetPage = findPageForClause(selectedClause.text);
    if (targetPage) {
      scrollToPdfPage(targetPage);
    } else {
      devLog('[Legal Lens] Could not find clause in PDF index');
    }
  }, [pdfIndexReady, selectedClause, findPageForClause, scrollToPdfPage]);

  // ========== EFFECT: Proaktive Scan-Erkennung ==========
  // Sobald das PDF als gescannt erkannt ist, zeigen wir einen PERSISTENTEN Hinweis.
  // Kein Auto-Switch — User entscheidet selbst per Button.
  useEffect(() => {
    if (viewMode !== 'pdf' || !isScannedPdf || !pdfIndexReady) {
      setShowScanHint(false);
      return;
    }
    setShowScanHint(true);
  }, [viewMode, isScannedPdf, pdfIndexReady]);

  // ========== EFFECT 4: Highlighting v7 - Wort-basiertes Matching ==========
  useEffect(() => {
    if (viewMode !== 'pdf' || !selectedClause || !pdfUrl || pdfLoading || !pdfIndexReady) return;

    // Skip wenn User gerade in PDF geklickt hat (direkt nach Klick, nicht nach Zoom)
    if (pdfClickActiveRef.current) {
      devLog('[Legal Lens] PDF highlight: Skipping - user clicked in PDF');
      pdfClickActiveRef.current = false;
      lastScrolledClauseIdRef.current = selectedClause.id;
      return;
    }

    if (syncPdfHighlightTimeoutRef.current) {
      clearTimeout(syncPdfHighlightTimeoutRef.current);
    }

    // Highlight-Logik als Funktion für Retry-Fähigkeit
    const attemptHighlight = () => {
      if (pdfClickActiveRef.current) {
        pdfClickActiveRef.current = false;
        return;
      }

      clearHighlight();

      // Klausel-Page via Text-Index ermitteln (statt blind erste Page im DOM zu nehmen)
      const targetPage = findPageForClause(selectedClause.text);
      if (!targetPage) {
        devLog('[Legal Lens] PDF highlight: Klausel-Page nicht im Index gefunden');
        return;
      }
      const pageWrapper = document.querySelector(`[data-page-num="${targetPage}"]`);
      const targetPdfPage = pageWrapper?.querySelector('.react-pdf__Page') ?? null;
      const textLayer = targetPdfPage?.querySelector('.react-pdf__Page__textContent') ?? null;
      if (!textLayer) {
        devLog('[Legal Lens] PDF highlight: Kein Text-Layer auf Page', targetPage);
        return;
      }

      const allSpans = Array.from(textLayer.querySelectorAll('span')) as HTMLElement[];
      if (allSpans.length === 0) {
        devLog('[Legal Lens] PDF highlight: No spans found');
        return;
      }

      // WORT-BASIERTES MATCHING mit zusammenhängendem Bereich
      devLog('[Legal Lens] PDF highlight: Starting word-based matching...');
      devLog('[Legal Lens] PDF highlight: Clause text:', selectedClause.text.substring(0, 100));

      // Extrahiere signifikante Wörter aus der Klausel (längere Wörter = eindeutiger)
      const stopWords = new Set(['der', 'die', 'das', 'und', 'oder', 'für', 'von', 'mit', 'bei', 'auf', 'aus', 'nach', 'über', 'unter', 'einer', 'einem', 'einen', 'eine', 'sind', 'wird', 'werden', 'kann', 'können', 'soll', 'haben', 'sein', 'nicht', 'auch', 'wenn', 'dass', 'diese', 'dieser', 'dieses', 'sowie', 'durch', 'muss', 'darf', 'zum', 'zur', 'den', 'dem', 'des', 'als', 'ist', 'hat', 'nur']);

      const clauseWords = selectedClause.text
        .toLowerCase()
        .normalize('NFC')
        .split(/\s+/)
        .filter(w => w.length >= 4 && !stopWords.has(w))
        .slice(0, 10);

      if (clauseWords.length < 2) {
        devLog('[Legal Lens] PDF highlight: Not enough significant words');
        return;
      }

      devLog('[Legal Lens] PDF highlight: Searching for words:', clauseWords.join(', '));

      // Sortiere Spans nach visueller Position (Lesereihenfolge)
      const spansWithData = allSpans.map(span => ({
        span,
        rect: span.getBoundingClientRect(),
        text: (span.textContent || '').toLowerCase().normalize('NFC')
      })).sort((a, b) => {
        const yDiff = a.rect.top - b.rect.top;
        const lineTolerance = 8 * scale;
        if (Math.abs(yDiff) > lineTolerance) return yDiff;
        return a.rect.left - b.rect.left;
      });

      // Suche nach dem BESTEN Startpunkt
      let bestAnchorIndex = -1;
      let bestScore = 0;

      for (let i = 0; i < spansWithData.length; i++) {
        if (!spansWithData[i].text.includes(clauseWords[0])) continue;

        // Prüfe wie viele Wörter in den nächsten 30 Spans vorkommen
        const foundWordsLocal = new Set<string>();
        for (let j = i; j < Math.min(i + 30, spansWithData.length); j++) {
          for (const word of clauseWords) {
            if (spansWithData[j].text.includes(word)) {
              foundWordsLocal.add(word);
            }
          }
        }

        if (foundWordsLocal.size > bestScore) {
          bestScore = foundWordsLocal.size;
          bestAnchorIndex = i;
        }
      }

      if (bestAnchorIndex === -1 || bestScore < Math.ceil(clauseWords.length * 0.4)) {
        devLog('[Legal Lens] PDF highlight: No good match found. Best score:', bestScore);
        return;
      }

      devLog('[Legal Lens] PDF highlight: Found best anchor at index', bestAnchorIndex, 'with score', bestScore);

      // Finde Start und Ende basierend auf Wort-Vorkommen
      const firstMatchIdx = bestAnchorIndex;
      let lastMatchIdx = bestAnchorIndex;
      const maxWindow = 40;

      for (let i = bestAnchorIndex; i < Math.min(bestAnchorIndex + maxWindow, spansWithData.length); i++) {
        const spanText = spansWithData[i].text;
        for (const word of clauseWords) {
          if (spanText.includes(word)) {
            lastMatchIdx = i;
            break;
          }
        }
      }

      // Markiere ALLE Spans von firstMatchIdx bis lastMatchIdx (zusammenhängend!)
      const spansToHighlight: HTMLElement[] = [];
      for (let i = firstMatchIdx; i <= lastMatchIdx; i++) {
        spansToHighlight.push(spansWithData[i].span);
      }

      devLog('[Legal Lens] PDF highlight: Highlighting spans', firstMatchIdx, 'to', lastMatchIdx, '(', spansToHighlight.length, 'spans)');

      // Erstelle Highlight-Overlays (mit Target-Page für korrekte Geometrie)
      createHighlightOverlays(spansToHighlight, targetPdfPage);
      highlightedElementsRef.current = spansToHighlight;

      // Scroll zum ersten Span — aber nur einmal pro Klausel-Auswahl
      // (verhindert Auto-Scroll-Rückwurf bei manuellem User-Scroll, da pageNumber in Effect-deps)
      if (spansToHighlight.length > 0 && lastScrolledClauseIdRef.current !== selectedClause.id) {
        spansToHighlight[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        lastScrolledClauseIdRef.current = selectedClause.id;
      }
    };

    // 500ms Timeout mit Retry wenn Text-Layer noch nicht bereit (max 5 Versuche)
    let highlightRetries = 0;
    const MAX_HIGHLIGHT_RETRIES = 5;

    const tryHighlight = () => {
      // Warte target-spezifisch: Text-Layer der KLAUSEL-Page muss bereit sein, nicht irgendeine
      const targetPage = findPageForClause(selectedClause.text);
      const pageWrapper = targetPage ? document.querySelector(`[data-page-num="${targetPage}"]`) : null;
      const textLayer = pageWrapper?.querySelector('.react-pdf__Page__textContent');
      if (!textLayer || textLayer.querySelectorAll('span').length === 0) {
        highlightRetries++;
        if (highlightRetries < MAX_HIGHLIGHT_RETRIES) {
          syncPdfHighlightTimeoutRef.current = setTimeout(tryHighlight, 500);
        }
        return;
      }
      attemptHighlight();
    };

    syncPdfHighlightTimeoutRef.current = setTimeout(tryHighlight, 500);

    return () => {
      if (syncPdfHighlightTimeoutRef.current) {
        clearTimeout(syncPdfHighlightTimeoutRef.current);
      }
    };
  }, [viewMode, selectedClause, pdfUrl, pdfLoading, pdfIndexReady, pageNumber, scale, clearHighlight, createHighlightOverlays, findPageForClause]);

  // ✅ PDF Selection Handler - Direktes Klicken in der PDF-Ansicht
  const handlePdfTextClick = (event: React.MouseEvent) => {
    // Fix: Im Frei-Modus nur auf mouseup reagieren, nicht doppelt auf click
    if (selectionMode === 'custom' && event.type === 'click') return;

    const target = event.target as HTMLElement;

    // Sub-Phase 7: Klick auf existing Marker → Edit-Popover öffnen
    const markerEl = target.closest('.legal-lens-pdf-marker') as HTMLElement | null;
    if (markerEl) {
      const markerId = markerEl.dataset.markerId;
      if (markerId) {
        event.stopPropagation();
        openMarkerEditor(markerId, markerEl);
        return;
      }
    }

    const textContent = target.closest('.react-pdf__Page__textContent');

    if (!textContent) {
      // Klick außerhalb Text-Layer — Hinweis ist bereits persistent sichtbar bei Scan-PDF
      return;
    }

    // ========== FREI-MODUS: Browser-Textauswahl per Drag ==========
    if (selectionMode === 'custom') {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() || '';

      // Nur wenn Text markiert wurde (min. 10 Zeichen)
      if (selectedText.length >= 10) {
        clearHighlight();

        // Markiere alle Spans die im Selection-Range sind
        const range = selection?.getRangeAt(0);
        // selectedSpans außerhalb des inneren Blocks deklariert (für Sub-Phase 5 Marker-Logic verfügbar)
        const selectedSpans: HTMLElement[] = [];
        if (range) {
          const allSpans = Array.from(textContent.querySelectorAll('span')) as HTMLElement[];

          // Visuellen Bereich der Selektion berechnen (verhindert "alles unten drunter")
          const rangeRects = range.getClientRects();
          let minY = Infinity, maxY = -Infinity;
          for (let r = 0; r < rangeRects.length; r++) {
            minY = Math.min(minY, rangeRects[r].top);
            maxY = Math.max(maxY, rangeRects[r].bottom);
          }
          if (minY === Infinity) { minY = 0; maxY = Infinity; } // Fallback
          minY -= 5; // Toleranz
          maxY += 5;

          for (const span of allSpans) {
            if (range.intersectsNode(span)) {
              const rect = span.getBoundingClientRect();
              // Nur Spans akzeptieren die visuell im Selektions-Bereich liegen
              if (rect.top >= minY && rect.bottom <= maxY) {
                selectedSpans.push(span);
              }
            }
          }
          // ✅ NEUE METHODE: Overlay-Divs statt CSS-Klassen
          createHighlightOverlays(selectedSpans);
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

        devLog('[Legal Lens] FREI-MODUS:', selectedText.substring(0, 60) + '...');

        // ========== Sub-Phase 5: Marker-Modus aktiv? → Marker erstellen statt Klausel-Selektion
        if (activeMarkerMode !== null) {
          const pageEl = target.closest('[data-page-num]') as HTMLElement | null;
          const page = pageEl ? parseInt(pageEl.getAttribute('data-page-num') || '1', 10) : 1;
          const allSpansForPage = Array.from(textContent.querySelectorAll('span')) as HTMLElement[];
          const spanIndicesFromSelection = selectedSpans
            .map((s: HTMLElement) => allSpansForPage.indexOf(s))
            .filter((i: number) => i >= 0);

          if (spanIndicesFromSelection.length > 0) {
            const isNoteMode = activeMarkerMode === 'note';
            const color: PdfMarkerColor = isNoteMode ? 'blue' : activeMarkerMode;
            const newMarkerId = `marker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            handleAddPdfMarker({
              id: newMarkerId,
              page,
              spanIndices: spanIndicesFromSelection,
              textSnippet: selectedText.slice(0, 200),
              color,
              note: ''
            });
            clearHighlight();
            setTimeout(() => selection?.removeAllRanges(), 100);
            // Auto-Open Editor wenn Notiz-Modus
            if (isNoteMode) {
              setTimeout(() => {
                const newMarkerEl = document.querySelector(`[data-marker-id="${newMarkerId}"]`) as HTMLElement | null;
                if (newMarkerEl) openMarkerEditorRef.current(newMarkerId, newMarkerEl);
              }, 250);
            }
          }
          return;
        }

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

    // Vorberechnung: Alle Span-Positionen einmalig (statt pro Loop-Iteration)
    const spanRects = allSpans.map(s => s.getBoundingClientRect());
    const lineHeight = spanRects[clickedIndex].height || 14;

    // Adaptive span search windows based on page size
    const totalSpans = allSpans.length;
    const sentenceBackward = Math.min(Math.max(30, Math.floor(totalSpans * 0.05)), 60);
    const sentenceForward = Math.min(Math.max(40, Math.floor(totalSpans * 0.07)), 80);
    const paragraphBackward = Math.min(Math.max(80, Math.floor(totalSpans * 0.15)), 250);
    const paragraphForward = Math.min(Math.max(100, Math.floor(totalSpans * 0.2)), 300);

    // ========== SATZ-MODUS ==========
    if (selectionMode === 'sentence') {
      // Suche Satzanfang (rückwärts bis . ! ? oder Anfang)
      for (let i = clickedIndex - 1; i >= 0; i--) {
        const text = spanData[i].text;
        // Gap-Detection: Lücke zwischen span[i] und span[i+1] = Absatzgrenze
        if (spanRects[i].bottom + lineHeight * 1.2 < spanRects[i + 1].top) break;
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
        if (clickedIndex - i > sentenceBackward) break;
      }

      // Suche Satzende (vorwärts bis . ! ?)
      for (let i = clickedIndex; i < allSpans.length; i++) {
        const text = spanData[i].text;
        // Gap-Detection: Lücke zwischen span[i-1] und span[i] = Absatzgrenze
        if (i > clickedIndex && spanRects[i - 1].bottom + lineHeight * 1.2 < spanRects[i].top) {
          endIdx = Math.max(clickedIndex, i - 1);
          break;
        }
        endIdx = i;
        // Echtes Satzende (nicht bei Abkürzungen)
        if (/[.!?]\s*$/.test(text)) {
          if (!GERMAN_LEGAL_ABBREVIATIONS.test(text)) break;
        }
        if (i - clickedIndex > sentenceForward) break;
      }
    }

    // ========== PARAGRAPH-MODUS ==========
    else if (selectionMode === 'paragraph') {
      // Extended paragraph start patterns
      const isParagraphStart = (text: string): boolean => {
        const trimmed = text.trim();
        return /^(§\s*\d|Art\.?\s*\d|Artikel\s*\d|\d+\.\d*\s+[A-ZÄÖÜ]|[IVX]+\.\s|[A-Z]\)\s|\d+\)\s|[a-z]\)\s|Punkt\s+\d|Abschnitt\s+\d|Teil\s+\d|Ziffer\s+\d|Anlage\s+\d|Anhang\s+\d)/i.test(trimmed);
      };

      // RÜCKWÄRTS: Finde den Paragraph-Start (§ X)
      for (let i = clickedIndex - 1; i >= 0; i--) {
        const text = spanData[i].text;

        // Gap-Detection: Lücke zwischen span[i] und span[i+1] = Absatzgrenze
        if (spanRects[i].bottom + lineHeight * 1.8 < spanRects[i + 1].top) break;

        // Multi-Span Paragraph-Start: span[i] allein ODER span[i]+span[i+1] zusammen
        const combinedText = (text + ' ' + (spanData[i + 1]?.text || '')).trim();
        if (isParagraphStart(text) || isParagraphStart(combinedText)) {
          startIdx = i;
          break;
        }

        startIdx = i;
        if (clickedIndex - i > paragraphBackward) break;
      }

      // VORWÄRTS: Finde das Ende (nächster § oder Art. oder empty block)
      let consecutiveShort = 0;
      for (let i = clickedIndex + 1; i < allSpans.length; i++) {
        const text = spanData[i].text;

        // Gap-Detection: Lücke zwischen span[i-1] und span[i] = Absatzgrenze
        if (spanRects[i - 1].bottom + lineHeight * 1.8 < spanRects[i].top) {
          endIdx = Math.max(clickedIndex, i - 1);
          break;
        }

        // 3+ consecutive empty/very short spans = paragraph break
        if (text.trim().length < 2) {
          consecutiveShort++;
          if (consecutiveShort >= 3) { endIdx = i - 3; break; }
        } else {
          consecutiveShort = 0;
        }

        // Nächster Hauptparagraph = Ende dieses Paragraphen (Multi-Span)
        const combinedTextFwd = (text + ' ' + (spanData[i + 1]?.text || '')).trim();
        if (isParagraphStart(text) || isParagraphStart(combinedTextFwd)) {
          endIdx = i - 1;
          break;
        }

        endIdx = i;
        if (i - clickedIndex > paragraphForward) break;
      }

      devLog('[Legal Lens] PARAGRAPH: Start:', startIdx, 'End:', endIdx, 'Spans:', endIdx - startIdx + 1);
    }

    // Sicherheit: Mindestens der geklickte Span
    if (startIdx > clickedIndex) startIdx = clickedIndex;
    if (endIdx < clickedIndex) endIdx = clickedIndex;

    // ========== Spans sammeln und Text extrahieren ==========
    const selectedSpans: HTMLElement[] = [];
    let selectedText = '';

    for (let i = startIdx; i <= endIdx; i++) {
      if (i >= 0 && i < spanData.length) {
        selectedSpans.push(spanData[i].span);
        selectedText += spanData[i].text + ' ';
      }
    }

    selectedText = selectedText.trim().normalize('NFC');

    // ✅ NEUE METHODE: Overlay-Divs statt CSS-Klassen
    createHighlightOverlays(selectedSpans);
    highlightedElementsRef.current = selectedSpans;

    // Mindestlänge prüfen
    if (selectedText.length < 10) {
      devLog('[Legal Lens] Text zu kurz:', selectedText.length);
      return;
    }

    // ========== Sub-Phase 5: Marker-Modus aktiv? → Marker erstellen statt Klausel-Selektion
    if (activeMarkerMode !== null) {
      const pageEl = target.closest('[data-page-num]') as HTMLElement | null;
      const page = pageEl ? parseInt(pageEl.getAttribute('data-page-num') || '1', 10) : 1;
      const spanIndicesRange: number[] = [];
      for (let i = startIdx; i <= endIdx; i++) spanIndicesRange.push(i);
      const isNoteMode = activeMarkerMode === 'note';
      const color: PdfMarkerColor = isNoteMode ? 'blue' : activeMarkerMode;
      const newMarkerId = `marker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      handleAddPdfMarker({
        id: newMarkerId,
        page,
        spanIndices: spanIndicesRange,
        textSnippet: selectedText.slice(0, 200),
        color,
        note: ''
      });
      clearHighlight();
      // Auto-Open Editor wenn Notiz-Modus
      if (isNoteMode) {
        setTimeout(() => {
          const newMarkerEl = document.querySelector(`[data-marker-id="${newMarkerId}"]`) as HTMLElement | null;
          if (newMarkerEl) openMarkerEditorRef.current(newMarkerId, newMarkerEl);
        }, 250);
      }
      return;
    }

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

  // Berechne Fortschritt aus tatsächlicher Klauselanzahl statt gespeichertem totalClauses
  const percentComplete = useMemo(() => {
    if (!progress || !clauses || clauses.length === 0) return 0;
    const reviewed = progress.reviewedClauses?.length || 0;
    // Nur analysierbare Klauseln zählen (Adressen/Unterschriften sind nicht "durchsehbar") —
    // konsistent mit reviewStats und der 100%-Celebration, damit der Header-Balken 100% erreicht.
    const analyzableTotal = clauses.filter(c => !c.nonAnalyzable).length;
    if (analyzableTotal === 0) return 0;
    return Math.min(100, Math.round((reviewed / analyzableTotal) * 100));
  }, [progress, clauses]);

  // 🚪 Document Gate: Dokument ist kein Rechtsdokument → Stop-Screen
  if (documentGateInfo && !isParsing && !isStreaming) {
    const displayType = documentGateInfo.documentType || 'Nicht-Rechtsdokument';
    return (
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FileText size={24} className={styles.headerIcon} />
            <div className={styles.titleContainer}>
              <h1 className={styles.title}>{contractName}</h1>
              <span className={styles.subtitle}>Dokument-Prüfung</span>
            </div>
          </div>
        </div>

        {/* Stop-Screen */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#f8fafc'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              color: '#b45309',
              margin: '0 auto 1.25rem'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h2 style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 0.5rem',
              lineHeight: 1.3
            }}>
              Dieses Dokument sieht nicht nach einem Vertrag aus
            </h2>

            <p style={{
              fontSize: '0.95rem',
              color: '#475569',
              margin: '0 0 1.5rem',
              lineHeight: 1.55
            }}>
              {documentGateInfo.reason || `Legal Lens wurde für Verträge und Rechtsdokumente entwickelt (z.B. AGBs, Datenschutzhinweise, Widerrufsbelehrungen, NDAs). Dieses Dokument wurde als „${displayType}" eingestuft.`}
            </p>

            <div style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.875rem 1rem',
              margin: '0 0 1.75rem',
              textAlign: 'left',
              fontSize: '0.85rem',
              color: '#334155'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#0f172a' }}>
                Erkannter Dokumenttyp
              </div>
              <div>{displayType}</div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem'
            }}>
              <button
                type="button"
                onClick={() => { window.location.href = '/contracts'; }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                Zurück zu meinen Verträgen
              </button>

              <button
                type="button"
                onClick={() => { parseContract(contractId, true, true); }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Trotzdem analysieren
              </button>
            </div>

            <p style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              margin: '1.25rem 0 0',
              lineHeight: 1.5
            }}>
              Tipp: Bei Nicht-Verträgen liefert Legal Lens keine sinnvollen Ergebnisse.
              Die Analyse verbraucht trotzdem Budget.
            </p>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className={styles.container}>
      {/* ✅ NEU: Streaming Progress Banner (Option B) */}
      {showStreamingOverlay && (
        <div className={styles.streamingBanner}>
          <div className={styles.streamingContent}>
            {/* Sanfter "Trickle"-Fortschritt (bewegt sich, friert nie ein) statt
                fake-Prozentbalken ODER abschreckender Zeitangabe. Gibt das beruhigende
                Gefühl von Fortschritt, ohne ein lügendes "80%" und ohne "1-2 Minuten". */}
            <div className={styles.streamingIcon}>
              <RefreshCw size={20} className={styles.spinning} />
            </div>
            <div className={styles.streamingInfo}>
              <span className={styles.streamingTitle}>
                {(clauses || []).length === 0
                  ? 'KI liest den Vertrag…'
                  : `${(clauses || []).length} Klauseln gefunden — Risiko-Bewertung läuft…`}
              </span>
              <span className={styles.streamingStatus}>
                {(clauses || []).length === 0
                  ? 'Die Klauseln werden vorbereitet — gleich geht es los.'
                  : streamingStatus}
              </span>
            </div>
            <div className={styles.streamingProgressWrapper}>
              <div className={styles.streamingProgressBar}>
                <div className={styles.streamingTrickleFill} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Perspective Selection Modal — nur beim allerersten Mal */}
      {showPerspectiveModal && !isParsing && (
        <PerspectiveSelectionModal onSelect={handlePerspectiveSelected} />
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

          {/* Risk Stats — erscheint sobald Analysen gecacht sind */}
          {riskStats && (
            <div className={styles.headerStats}>
              {/* Klickbarer Score-Gauge mit Erklärungs-Popover */}
              <div className={styles.scorePopoverAnchor} ref={scorePopoverRef}>
                <button
                  className={styles.scoreGaugeBtn}
                  onClick={() => { setShowScorePopover(prev => !prev); setShowWorstPopover(false); }}
                  aria-label="Risiko-Score Erklärung anzeigen"
                >
                  <RiskScoreGauge score={riskStats.overallScore} size={40} strokeWidth={3} />
                </button>
                {showScorePopover && (
                  <div className={styles.scorePopover}>
                    <div className={styles.scorePopoverHeader}>
                      <span className={styles.scorePopoverTitle}>Risiko-Score erklärt</span>
                    </div>
                    <p className={styles.scorePopoverDesc}>
                      Der Score zeigt das <strong>durchschnittliche Risiko</strong> aller {riskStats.analyzed} analysierten Klauseln auf einer Skala von 0–100.
                    </p>
                    <div className={styles.scorePopoverScale}>
                      <div className={styles.scoreScaleRow}>
                        <span className={styles.scoreScaleDot} style={{ background: '#10b981' }} />
                        <span className={styles.scoreScaleRange}>0–29</span>
                        <span className={styles.scoreScaleLabel}>Niedriges Risiko</span>
                        {riskStats.low > 0 && <span className={styles.scoreScaleCount}>{riskStats.low} Klauseln</span>}
                      </div>
                      <div className={styles.scoreScaleRow}>
                        <span className={styles.scoreScaleDot} style={{ background: '#f59e0b' }} />
                        <span className={styles.scoreScaleRange}>30–59</span>
                        <span className={styles.scoreScaleLabel}>Mittleres Risiko</span>
                        {riskStats.medium > 0 && <span className={styles.scoreScaleCount}>{riskStats.medium} Klauseln</span>}
                      </div>
                      <div className={styles.scoreScaleRow}>
                        <span className={styles.scoreScaleDot} style={{ background: '#ef4444' }} />
                        <span className={styles.scoreScaleRange}>60–100</span>
                        <span className={styles.scoreScaleLabel}>Hohes Risiko</span>
                        {riskStats.high > 0 && <span className={styles.scoreScaleCount}>{riskStats.high} Klauseln</span>}
                      </div>
                    </div>
                    <div className={styles.scorePopoverCurrent}>
                      Dein Vertrag: <strong style={{ color: riskStats.overallScore < 30 ? '#10b981' : riskStats.overallScore < 60 ? '#f59e0b' : '#ef4444' }}>{riskStats.overallScore}/100</strong>
                      {riskStats.overallScore < 30 && ' — Überwiegend unbedenklich'}
                      {riskStats.overallScore >= 30 && riskStats.overallScore < 60 && ' — Einige Klauseln prüfen'}
                      {riskStats.overallScore >= 60 && ' — Mehrere kritische Klauseln'}
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.quickStats}>
                <span className={styles.statCount}>{riskStats.analyzed} analysiert</span>
              </div>
              {riskStats.worstClause && riskStats.worstScore >= 50 && (
                <div className={styles.worstPopoverAnchor} ref={worstPopoverRef}>
                  <button
                    className={styles.worstClauseBtn}
                    onClick={() => { setShowWorstPopover(prev => !prev); setShowScorePopover(false); }}
                    title={`Riskanteste Klausel: ${riskStats.worstClause.title || riskStats.worstClause.number || 'Klausel'} (${riskStats.worstScore}/100)`}
                  >
                    <AlertTriangle size={14} />
                    <span>Riskanteste: {riskStats.worstScore}</span>
                  </button>
                  {showWorstPopover && (
                    <div className={styles.worstPopover}>
                      <div className={styles.worstPopoverHeader}>
                        <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                        <span className={styles.worstPopoverTitle}>Riskanteste Klausel</span>
                      </div>
                      <div className={styles.worstPopoverClause}>
                        <span className={styles.worstPopoverName}>
                          {riskStats.worstClause!.title || riskStats.worstClause!.number || 'Klausel'}
                        </span>
                        <span className={styles.worstPopoverScore} style={{ color: '#ef4444' }}>
                          {riskStats.worstScore}/100
                        </span>
                      </div>
                      <p className={styles.worstPopoverDesc}>
                        Diese Klausel hat den höchsten Risiko-Score in deinem Vertrag.
                        {riskStats.worstScore >= 80 && ' Dringend prüfen — enthält potenziell nachteilige Bedingungen.'}
                        {riskStats.worstScore >= 60 && riskStats.worstScore < 80 && ' Sollte vor Unterzeichnung besprochen werden.'}
                      </p>
                      <button
                        className={styles.worstPopoverBtn}
                        onClick={() => { selectClause(riskStats.worstClause!); setShowWorstPopover(false); }}
                      >
                        Zur Klausel springen
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {(riskStats.high > 0 || riskStats.medium > 0) && (
                <button
                  className={styles.nextRiskBtn}
                  onClick={goToNextRisk}
                  title="Zur nächsten Risiko-Klausel springen (n)"
                >
                  <ChevronRight size={14} />
                  <span>Nächstes Risiko</span>
                </button>
              )}
            </div>
          )}
          {reviewStats && reviewStats.reviewed > 0 && (
            <div className={styles.reviewProgress}>
              <div className={styles.reviewBar}>
                <div className={styles.reviewFill} style={{ width: `${reviewStats.percent}%` }} />
              </div>
              <span className={styles.reviewLabel}>{reviewStats.reviewed}/{reviewStats.total} geprüft</span>
            </div>
          )}
          {decisionSummary && (
            <div className={styles.decisionSummaryBanner}>
              {decisionSummary.accepted > 0 && (
                <button
                  type="button"
                  className={`${styles.decisionSummaryItem} ${decisionFilter === 'accepted' ? styles.decisionSummaryItemActive : ''}`}
                  data-type="accepted"
                  onClick={() => setDecisionFilter(decisionFilter === 'accepted' ? 'all' : 'accepted')}
                  title="Akzeptierte Klauseln filtern"
                >
                  ✅ {decisionSummary.accepted}
                </button>
              )}
              {decisionSummary.negotiate > 0 && (
                <button
                  type="button"
                  className={`${styles.decisionSummaryItem} ${decisionFilter === 'negotiate' ? styles.decisionSummaryItemActive : ''}`}
                  data-type="negotiate"
                  onClick={() => setDecisionFilter(decisionFilter === 'negotiate' ? 'all' : 'negotiate')}
                  title="Zu verhandelnde Klauseln filtern"
                >
                  💬 {decisionSummary.negotiate}
                </button>
              )}
              {decisionSummary.rejected > 0 && (
                <button
                  type="button"
                  className={`${styles.decisionSummaryItem} ${decisionFilter === 'rejected' ? styles.decisionSummaryItemActive : ''}`}
                  data-type="rejected"
                  onClick={() => setDecisionFilter(decisionFilter === 'rejected' ? 'all' : 'rejected')}
                  title="Abgelehnte Klauseln filtern"
                >
                  ❌ {decisionSummary.rejected}
                </button>
              )}
              {decisionSummary.noted > 0 && (
                <button
                  type="button"
                  className={`${styles.decisionSummaryItem} ${decisionFilter === 'noted' ? styles.decisionSummaryItemActive : ''}`}
                  data-type="noted"
                  onClick={() => setDecisionFilter(decisionFilter === 'noted' ? 'all' : 'noted')}
                  title="Klauseln mit Notiz filtern"
                >
                  📝 {decisionSummary.noted}
                </button>
              )}
            </div>
          )}
        </div>

        <div className={styles.headerRight}>
          {/* Primary Action: Batch Analysis / Vorlade-Status / Button — 3 Zustände:
              - manuelles "Alle laden" (mode==='all') → echter Fortschritt + Abbrechen
              - automatisches Vorladen (mode==='preload-highrisk') → ehrlicher, transienter Hinweis
                (kein "X/7 analysiert", keine Zahl, kein toter Button) — verschwindet von selbst
              - sonst → normaler, klickbarer "Alle laden"-Button */}
          {isBatchAnalyzing ? (
            batchProgress.mode === 'all' ? (
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
              <div className={styles.batchProgress}>
                <RefreshCw size={14} className={styles.spinning} />
                <span className={styles.batchProgressText}>Risiko-Klauseln werden vorbereitet…</span>
              </div>
            )
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

          {/* Progress-Bar */}
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

          {/* Overflow-Menü: Sekundäre Aktionen (Fokus, Branche, Refresh, Export, Checkliste, Dashboard, Summary) */}
          <div className={styles.overflowMenuAnchor} ref={overflowMenuRef}>
            <button
              className={styles.overflowMenuBtn}
              onClick={() => setShowOverflowMenu(prev => !prev)}
              title="Weitere Aktionen"
              aria-label="Weitere Aktionen"
              aria-haspopup="menu"
              aria-expanded={showOverflowMenu}
            >
              <MoreHorizontal size={18} />
            </button>
            {showOverflowMenu && (
              <div className={styles.overflowMenu} role="menu">
                {/* Fokus-Modus Toggle */}
                <button
                  className={`${styles.overflowMenuItem} ${focusMode ? styles.overflowMenuItemActive : ''}`}
                  onClick={() => { setFocusMode(prev => !prev); setShowOverflowMenu(false); }}
                  role="menuitem"
                >
                  <Eye size={16} />
                  <span>{focusMode ? 'Fokus-Modus: An' : 'Fokus-Modus'}</span>
                </button>

                {/* Dashboard/Details Toggle */}
                <button
                  className={`${styles.overflowMenuItem} ${showOverview ? styles.overflowMenuItemActive : ''}`}
                  onClick={() => { setShowOverview(!showOverview); setShowOverflowMenu(false); }}
                  role="menuitem"
                >
                  <LayoutGrid size={16} />
                  <span>{showOverview ? 'Zur Detail-Ansicht' : 'Dashboard-Übersicht'}</span>
                </button>

                {/* Summary Button - nur wenn dismissed */}
                {summaryDismissed && !showOverview && (
                  <button
                    className={styles.overflowMenuItem}
                    onClick={() => { handleShowSummary(); setShowOverflowMenu(false); }}
                    role="menuitem"
                  >
                    <BarChart3 size={16} />
                    <span>Vertrags-Übersicht</span>
                  </button>
                )}

                <div className={styles.overflowMenuDivider} />

                {/* Industry Selector (im Menü als spezielle Zeile) */}
                <div className={styles.overflowMenuIndustry}>
                  <IndustrySelector
                    currentIndustry={currentIndustry}
                    onIndustryChange={handleIndustryChange}
                    disabled={industryLoading || isParsing}
                    compact={false}
                    autoDetected={industryAutoDetected}
                    confidence={industryConfidence}
                    detectedKeywords={industryKeywords}
                  />
                </div>

                <div className={styles.overflowMenuDivider} />

                {/* Export */}
                <button
                  className={styles.overflowMenuItem}
                  onClick={() => { setShowExportModal(true); setShowOverflowMenu(false); }}
                  disabled={(clauses || []).length === 0}
                  role="menuitem"
                >
                  <Download size={16} />
                  <span>Als PDF exportieren</span>
                </button>

                {/* Negotiation Checklist - nur für Vertragsempfänger */}
                {(currentPerspective === 'contractor' || currentPerspective === 'client') && (
                  <button
                    className={styles.overflowMenuItem}
                    onClick={() => { setShowChecklist(true); setShowOverflowMenu(false); }}
                    disabled={(clauses || []).length === 0}
                    role="menuitem"
                  >
                    <ClipboardCheck size={16} />
                    <span>Verhandlungs-Checkliste</span>
                  </button>
                )}

                <div className={styles.overflowMenuDivider} />

                {/* Refresh */}
                <button
                  className={styles.overflowMenuItem}
                  onClick={() => { parseContract(contractId, true); setShowOverflowMenu(false); }}
                  disabled={isParsing || isStreaming}
                  role="menuitem"
                >
                  <RefreshCw size={16} className={isStreaming ? styles.spinning : ''} />
                  <span>Neu analysieren (Cache ignorieren)</span>
                </button>
              </div>
            )}
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
                devLog('Inline Analysis Error:', error);
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
                key={contractId || 'pending'}
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
                analysisCache={analysisCache as Record<string, unknown>}
                currentPerspective={currentPerspective}
                focusMode={focusMode}
                contractId={contractId}
                onRetry={() => parseContract(contractId, true)}
                clauseDecisions={clauseDecisions}
                onSetDecision={handleSetDecision}
                decisionFilter={decisionFilter}
                clauseAnnotations={clauseAnnotations}
                onSaveAnnotation={handleSaveAnnotation}
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
                      currentIndustry={currentIndustry}
                      listRiskScore={
                        selectedClause?.riskIndicators?.score ??
                        selectedClause?.preAnalysis?.riskScore
                      }
                      listRiskLevel={
                        (selectedClause?.riskIndicators?.level ??
                          selectedClause?.preAnalysis?.riskLevel) as
                          'low' | 'medium' | 'high' | undefined
                      }
                      onLoadAlternatives={loadAlternatives}
                      onLoadNegotiation={loadNegotiationTips}
                      onSendChatMessage={sendChatMessage}
                      onRetry={handleRetryAnalysis}
                      currentDecision={selectedClause?.id ? clauseDecisions[selectedClause.id] : undefined}
                      onSetDecision={handleSetDecision}
                    />
                  </>
                ) : (
                  <div className={styles.analysisPanelEmpty}>
                    <span className={styles.emptyIcon}>👆</span>
                    <h3 className={styles.emptyTitle}>Klausel auswählen</h3>
                    <p className={styles.emptyText}>
                      Tippe auf "Klauseln" und wähle eine Klausel aus.
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
              key={contractId || 'pending'}
              clauses={clauses}
              selectedClause={selectedClause}
              progress={progress}
              onSelectClause={selectClause}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              cachedClauseIds={Object.keys(analysisCache).map(key => key.split('-')[0])}
              isStreaming={isStreaming}
              streamingProgress={streamingProgress}
              analysisCache={analysisCache as Record<string, unknown>}
              currentPerspective={currentPerspective}
              focusMode={focusMode}
              contractId={contractId}
              onRetry={() => parseContract(contractId, true)}
              clauseDecisions={clauseDecisions}
              onSetDecision={handleSetDecision}
              decisionFilter={decisionFilter}
              clauseAnnotations={clauseAnnotations}
              onSaveAnnotation={handleSaveAnnotation}
            />
          ) : (
          <div className={styles.contractPanel} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
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

                {/* Marker-Mode Picker (Sub-Phase 4) — Highlighter-Modi */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  background: '#f1f5f9',
                  borderRadius: '6px',
                  padding: '2px'
                }}>
                  <button
                    onClick={() => setActiveMarkerMode(null)}
                    style={{
                      padding: '0.375rem 0.5rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: activeMarkerMode === null ? 'white' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: activeMarkerMode === null ? '#3b82f6' : '#64748b',
                      boxShadow: activeMarkerMode === null ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                    }}
                    title="Lesen-Modus — kein Marker beim Klick (Esc)"
                  >
                    ✋ Lesen
                  </button>
                  <button
                    onClick={() => setActiveMarkerMode('green')}
                    style={{
                      padding: '0.375rem 0.5rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: activeMarkerMode === 'green' ? '#16a34a' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      color: activeMarkerMode === 'green' ? 'white' : '#16a34a',
                      boxShadow: activeMarkerMode === 'green' ? '0 1px 2px rgba(0,0,0,0.15)' : 'none'
                    }}
                    title="Akzeptieren-Marker (1) — markiert Auswahl grün"
                  >
                    🟢
                  </button>
                  <button
                    onClick={() => setActiveMarkerMode('orange')}
                    style={{
                      padding: '0.375rem 0.5rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: activeMarkerMode === 'orange' ? '#d97706' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      color: activeMarkerMode === 'orange' ? 'white' : '#d97706',
                      boxShadow: activeMarkerMode === 'orange' ? '0 1px 2px rgba(0,0,0,0.15)' : 'none'
                    }}
                    title="Verhandeln-Marker (2) — markiert Auswahl orange"
                  >
                    🟡
                  </button>
                  <button
                    onClick={() => setActiveMarkerMode('red')}
                    style={{
                      padding: '0.375rem 0.5rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: activeMarkerMode === 'red' ? '#dc2626' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      color: activeMarkerMode === 'red' ? 'white' : '#dc2626',
                      boxShadow: activeMarkerMode === 'red' ? '0 1px 2px rgba(0,0,0,0.15)' : 'none'
                    }}
                    title="Ablehnen-Marker (3) — markiert Auswahl rot"
                  >
                    🔴
                  </button>
                  <button
                    onClick={() => setActiveMarkerMode('note')}
                    style={{
                      padding: '0.375rem 0.5rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: activeMarkerMode === 'note' ? '#2563eb' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.85rem',
                      color: activeMarkerMode === 'note' ? 'white' : '#2563eb',
                      boxShadow: activeMarkerMode === 'note' ? '0 1px 2px rgba(0,0,0,0.15)' : 'none'
                    }}
                    title="Notiz-Marker (4) — blau markiert, öffnet Notiz-Editor automatisch"
                  >
                    🔵 📝
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

                {/* Page Indicator (scroll-based) */}
                {numPages > 1 && (
                  <>
                    <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 0.5rem' }} />
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Seite {pageNumber} / {numPages}
                    </span>
                  </>
                )}

                {/* PDF-Export mit Markierungen */}
                {pdfMarkers.length > 0 && (
                  <>
                    <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 0.5rem' }} />
                    <button
                      disabled={isExportingMarkedPdf}
                      onClick={async () => {
                        if (!contractId || isExportingMarkedPdf) return;
                        setIsExportingMarkedPdf(true);
                        try {
                          const token = localStorage.getItem('token');
                          const response = await fetch(`/api/legal-lens/${contractId}/pdf-export`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          await handleAuthResponse(response);
                          if (!response.ok) {
                            const err = await response.json().catch(() => ({}));
                            console.warn('[Legal Lens] PDF-Export failed:', err);
                            return;
                          }
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          const cd = response.headers.get('content-disposition') || '';
                          const fnMatch = cd.match(/filename="([^"]+)"/);
                          a.download = fnMatch ? fnMatch[1] : 'vertrag_markiert.pdf';
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          console.warn('[Legal Lens] PDF-Export error:', err);
                        } finally {
                          setIsExportingMarkedPdf(false);
                        }
                      }}
                      style={{
                        padding: '0.375rem 0.625rem',
                        border: '1px solid #3b82f6',
                        borderRadius: '6px',
                        background: isExportingMarkedPdf
                          ? 'linear-gradient(135deg, #93c5fd, #60a5fa)'
                          : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white',
                        cursor: isExportingMarkedPdf ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        opacity: isExportingMarkedPdf ? 0.85 : 1,
                        pointerEvents: isExportingMarkedPdf ? 'none' : 'auto'
                      }}
                      title={isExportingMarkedPdf
                        ? 'PDF wird vorbereitet…'
                        : `Markierte PDF herunterladen (${pdfMarkers.length} Markierung${pdfMarkers.length === 1 ? '' : 'en'})`}
                    >
                      {isExportingMarkedPdf ? (
                        <>
                          <span style={{
                            width: 10, height: 10,
                            borderRadius: '50%',
                            border: '2px solid white',
                            borderTopColor: 'transparent',
                            animation: 'spin 0.7s linear infinite',
                            display: 'inline-block'
                          }} />
                          PDF wird erstellt…
                        </>
                      ) : (
                        <>📥 PDF mit Markierungen</>
                      )}
                    </button>

                    {/* Sub-Phase 6: Sidebar-Toggle — data-sub-phase-6-toggle */}
                    <button
                      onClick={() => setShowMarkerSidebar(prev => !prev)}
                      style={{
                        padding: '0.375rem 0.5rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: showMarkerSidebar ? '#3b82f6' : 'white',
                        color: showMarkerSidebar ? 'white' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }}
                      title={showMarkerSidebar
                        ? 'Markierungs-Liste schließen'
                        : `Markierungs-Liste öffnen (${pdfMarkers.length})`
                      }
                    >
                      <List size={14} />
                      <span>{pdfMarkers.length}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Gescanntes-PDF-Hinweis: Fester Balken unterhalb der Toolbar, immer sichtbar */}
            {showScanHint && (
              <div style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'linear-gradient(to right, #eff6ff, #dbeafe)',
                borderBottom: '1px solid #bfdbfe'
              }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e3a8a', marginBottom: '0.125rem' }}>
                    Gescanntes PDF erkannt
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.8125rem' }}>
                    Textauswahl direkt im PDF ist nicht möglich. Die Textansicht zeigt den OCR-erkannten Inhalt mit allen Analyse-Funktionen.
                  </div>
                </div>
                <button
                  onClick={() => setViewMode('text')}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  Zur Textansicht
                </button>
                <button
                  onClick={() => setShowScanHint(false)}
                  aria-label="Hinweis schließen"
                  style={{
                    background: 'transparent',
                    color: '#64748b',
                    border: 'none',
                    padding: '0.25rem 0.5rem',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    lineHeight: 1,
                    flexShrink: 0
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* PDF Viewer — Continuous Scroll */}
            <div
              ref={pdfScrollRef}
              className={styles.clauseList}
              style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#f8fafc',
                padding: '1rem',
                gap: '12px'
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
                  {Array.from({ length: numPages }, (_, i) => (
                    <div
                      key={`page-${i + 1}`}
                      data-page-num={i + 1}
                      className={styles.pdfPageWrapper}
                    >
                      <Page
                        pageNumber={i + 1}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </div>
                  ))}
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
                  💡 Klick auf Text, um die Analyse zu sehen
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

            {/* Sub-Phase 7: Edit-Popover für existing Marker */}
            {editingMarker && (
              <div
                className="legal-lens-marker-popover"
                style={{
                  position: 'fixed',
                  top: `${editingMarker.position.top}px`,
                  left: `${editingMarker.position.left}px`,
                  width: '300px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  padding: '12px',
                  zIndex: 300
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <span>Marker bearbeiten</span>
                  <button
                    onClick={closeMarkerEditor}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: '#64748b',
                      lineHeight: 1,
                      padding: '0 4px'
                    }}
                    title="Schließen + Speichern"
                  >
                    ×
                  </button>
                </div>

                {/* Farb-Picker */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Farbe</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['green', 'orange', 'red', 'blue'] as PdfMarkerColor[]).map(c => {
                      const colorMap = { green: '#16a34a', orange: '#d97706', red: '#dc2626', blue: '#2563eb' };
                      const emojiMap = { green: '🟢', orange: '🟡', red: '🔴', blue: '🔵' };
                      const labelMap = { green: 'Akzeptieren', orange: 'Verhandeln', red: 'Ablehnen', blue: 'Notiz' };
                      return (
                        <button
                          key={c}
                          onClick={() => {
                            setEditingMarker(prev => prev ? { ...prev, color: c } : null);
                            handleUpdatePdfMarker(editingMarker.markerId, { color: c });
                          }}
                          style={{
                            flex: 1,
                            padding: '6px',
                            border: `2px solid ${editingMarker.color === c ? colorMap[c] : '#e2e8f0'}`,
                            borderRadius: '6px',
                            background: editingMarker.color === c ? colorMap[c] + '15' : 'white',
                            cursor: 'pointer',
                            fontSize: '16px'
                          }}
                          title={labelMap[c]}
                        >
                          {emojiMap[c]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notiz-Editor */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Notiz</div>
                  <textarea
                    value={editingMarker.note}
                    onChange={(e) => setEditingMarker(prev => prev ? { ...prev, note: e.target.value } : null)}
                    onBlur={() => handleUpdatePdfMarker(editingMarker.markerId, { note: editingMarker.note })}
                    placeholder="Notiz zu diesem Marker hinzufügen…"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    autoFocus={activeMarkerMode === 'note'}
                  />
                </div>

                {/* Delete-Button */}
                <button
                  onClick={() => {
                    handleDeletePdfMarker(editingMarker.markerId);
                    setEditingMarker(null);
                    // activeMarkerMode bleibt erhalten — User hat ihn bewusst gewählt,
                    // will vermutlich weiter markieren (synchroner DOM-Cleanup in
                    // handleDeletePdfMarker verhindert Geister-Klicks auf gelöschten Marker)
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1.5px solid #fecaca',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  🗑️ Marker löschen
                </button>
              </div>
            )}

            {/* Sub-Phase 6: Sidebar "Deine Markierungen" — data-sub-phase-6-sidebar */}
            {showMarkerSidebar && viewMode === 'pdf' && pdfMarkers.length > 0 && (
              <>
                {isMobile && (
                  <div
                    onClick={() => setShowMarkerSidebar(false)}
                    style={{
                      position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 998
                    }}
                  />
                )}
                <aside
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: isMobile ? '100%' : '320px',
                    background: 'white',
                    borderLeft: '1px solid #e2e8f0',
                    boxShadow: '-4px 0 16px rgba(15,23,42,0.08)',
                    zIndex: 999,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'legalLensSidebarSlideIn 0.2s ease-out'
                  }}
                >
                  <div style={{
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Deine Markierungen</strong>
                      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                        {pdfMarkerCountsForSidebar.green > 0 && <span>🟢 {pdfMarkerCountsForSidebar.green}</span>}
                        {pdfMarkerCountsForSidebar.orange > 0 && <span>🟡 {pdfMarkerCountsForSidebar.orange}</span>}
                        {pdfMarkerCountsForSidebar.red > 0 && <span>🔴 {pdfMarkerCountsForSidebar.red}</span>}
                        {pdfMarkerCountsForSidebar.blue > 0 && <span>🔵 {pdfMarkerCountsForSidebar.blue}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMarkerSidebar(false)}
                      style={{
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        padding: '0.25rem', borderRadius: '4px', color: '#64748b',
                        display: 'flex', alignItems: 'center'
                      }}
                      title="Schließen"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {[...pdfMarkers]
                      .sort((a, b) => {
                        if (a.page !== b.page) return a.page - b.page;
                        return (a.spanIndices?.[0] ?? 0) - (b.spanIndices?.[0] ?? 0);
                      })
                      .map((marker, idx) => {
                        const colorMap = { green: '#16a34a', orange: '#d97706', red: '#dc2626', blue: '#2563eb' };
                        const labelMap = { green: 'Akzeptiert', orange: 'Verhandeln', red: 'Ablehnen', blue: 'Notiz' };
                        const accent = colorMap[marker.color] || '#64748b';
                        const snippet = (marker.textSnippet || '').replace(/\s+/g, ' ').trim();
                        const snippetShort = snippet.length > 70 ? snippet.slice(0, 67) + '…' : snippet;
                        return (
                          <button
                            key={marker.id}
                            onClick={() => scrollToMarker(marker)}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '0.625rem 0.75rem',
                              marginBottom: '0.375rem',
                              border: '1px solid #e2e8f0',
                              borderLeft: `3px solid ${accent}`,
                              borderRadius: '6px',
                              background: 'white',
                              cursor: 'pointer',
                              transition: 'background 0.15s, border-color 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                            title={`Springe zu Seite ${marker.page}`}
                          >
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                              marginBottom: '0.25rem'
                            }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                {labelMap[marker.color]}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                S. {marker.page} · #{idx + 1}
                              </span>
                            </div>
                            {snippetShort && (
                              <div style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', marginBottom: marker.note ? '0.25rem' : 0 }}>
                                „{snippetShort}"
                              </div>
                            )}
                            {marker.note && (
                              <div style={{ fontSize: '0.78rem', color: '#0f172a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {marker.note.length > 100 ? marker.note.slice(0, 97) + '…' : marker.note}
                              </div>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </aside>
              </>
            )}
          </div>
        )}

        {/* Resize Divider */}
        <div
          className={`${styles.resizeDivider} ${isDragging ? styles.dragging : ''}`}
          onMouseDown={handleMouseDown}
          title="Ziehen zum Anpassen"
        />

        {/* Right: Analysis Panel */}
        <div ref={analysisPanelRef} className={styles.analysisPanel} style={{ width: analysisPanelWidth }}>
          {selectedClause ? (
            <>
              {/* Clause Navigation Bar */}
              {clauseNavInfo && (
                <div className={styles.clauseNavBar}>
                  <button
                    className={styles.clauseNavBtn}
                    onClick={goToPrevClause}
                    disabled={!clauseNavInfo.hasPrev}
                    title="Vorherige Klausel (↑)"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className={styles.clauseNavLabel}>
                    {selectedClause.number || selectedClause.title || `Klausel ${clauseNavInfo.current}`}
                    <span className={styles.clauseNavCount}>{clauseNavInfo.current}/{clauseNavInfo.total}</span>
                  </span>
                  <button
                    className={styles.clauseNavBtn}
                    onClick={goToNextClause}
                    disabled={!clauseNavInfo.hasNext}
                    title="Nächste Klausel (↓)"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

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
                currentIndustry={currentIndustry}
                analysisCache={analysisCache as Record<string, unknown>}
                listRiskScore={
                  selectedClause?.riskIndicators?.score ??
                  selectedClause?.preAnalysis?.riskScore
                }
                listRiskLevel={
                  (selectedClause?.riskIndicators?.level ??
                    selectedClause?.preAnalysis?.riskLevel) as
                    'low' | 'medium' | 'high' | undefined
                }
                onLoadAlternatives={loadAlternatives}
                onLoadNegotiation={loadNegotiationTips}
                onSendChatMessage={sendChatMessage}
                onRetry={handleRetryAnalysis}
                currentDecision={selectedClause?.id ? clauseDecisions[selectedClause.id] : undefined}
                onSetDecision={handleSetDecision}
              />
            </>
          ) : (
            <div className={styles.analysisPanelEmpty}>
              <span className={styles.emptyIcon}>👆</span>
              <h3 className={styles.emptyTitle}>Klausel auswählen</h3>
              <p className={styles.emptyText}>
                Wähle links eine Klausel aus, um die detaillierte Analyse zu sehen.
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


      {/* Celebration Overlay */}
      {showCelebration && (
        <div className={styles.celebrationOverlay}>
          <div className={styles.celebrationContent}>
            <span className={styles.celebrationEmoji}>🎉</span>
            <h3 className={styles.celebrationTitle}>Alle Klauseln geprüft!</h3>
            <p className={styles.celebrationText}>
              Du hast {reviewStats?.total} Klauseln durchgesehen. Gut gemacht!
            </p>
          </div>
          {/* CSS confetti particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={styles.confettiParticle}
              style={{
                '--x': `${Math.random() * 100}vw`,
                '--delay': `${Math.random() * 0.5}s`,
                '--color': ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'][i % 6]
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className={styles.shortcutsOverlay} onClick={() => setShowShortcutsModal(false)}>
          <div className={styles.shortcutsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.shortcutsHeader}>
              <h3>Tastenkürzel</h3>
              <button onClick={() => setShowShortcutsModal(false)} className={styles.shortcutsCloseBtn}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.shortcutsGrid}>
              <div className={styles.shortcutsGroup}>
                <h4 className={styles.shortcutsGroupTitle}>Navigation</h4>
                <div className={styles.shortcutRow}><kbd>↑</kbd> <kbd>k</kbd><span>Vorherige Klausel</span></div>
                <div className={styles.shortcutRow}><kbd>↓</kbd> <kbd>j</kbd><span>Nächste Klausel</span></div>
                <div className={styles.shortcutRow}><kbd>n</kbd><span>Nächstes Risiko</span></div>
                <div className={styles.shortcutRow}><kbd>Home</kbd><span>Erste Klausel</span></div>
                <div className={styles.shortcutRow}><kbd>End</kbd><span>Letzte Klausel</span></div>
              </div>
              <div className={styles.shortcutsGroup}>
                <h4 className={styles.shortcutsGroupTitle}>Ansicht</h4>
                <div className={styles.shortcutRow}><kbd>f</kbd><span>Fokus-Modus</span></div>
                <div className={styles.shortcutRow}><kbd>Esc</kbd><span>Schließen / Zurück</span></div>
                <div className={styles.shortcutRow}><kbd>?</kbd><span>Diese Hilfe</span></div>
              </div>
              <div className={styles.shortcutsGroup}>
                <h4 className={styles.shortcutsGroupTitle}>Suche</h4>
                <div className={styles.shortcutRow}><kbd>Ctrl</kbd>+<kbd>F</kbd><span>Klauseln durchsuchen</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LegalLensViewer;

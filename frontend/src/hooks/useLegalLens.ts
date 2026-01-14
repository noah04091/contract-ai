// 📁 frontend/src/hooks/useLegalLens.ts
// Custom Hook für Legal Lens Feature

import { useState, useEffect, useCallback, useRef } from 'react';
import * as legalLensAPI from '../services/legalLensAPI';
import type {
  ParsedClause,
  ClauseAnalysis,
  PerspectiveType,
  LegalLensProgress,
  ClauseAlternative,
  NegotiationInfo,
  ChatMessage,
  RiskLevel
} from '../types/legalLens';

interface BatchProgress {
  total: number;
  completed: number;
  current: string | null;
  isRunning: boolean;
}

// Erweiterte Error-Info für bessere UX
export interface ErrorInfo {
  message: string;
  type: 'network' | 'timeout' | 'server' | 'parse' | 'unknown';
  retryCount: number;
  canRetry: boolean;
  hint: string;
}

// Hilfsfunktion für Fehlerkategorisierung
const categorizeError = (err: unknown, retryCount: number = 0): ErrorInfo => {
  const message = err instanceof Error ? err.message : String(err);
  const messageLower = message.toLowerCase();

  if (messageLower.includes('network') || messageLower.includes('fetch') || messageLower.includes('connection')) {
    return {
      message: 'Netzwerkfehler',
      type: 'network',
      retryCount,
      canRetry: true,
      hint: 'Bitte prüfe deine Internetverbindung und versuche es erneut.'
    };
  }

  if (messageLower.includes('timeout') || messageLower.includes('aborted')) {
    return {
      message: 'Zeitüberschreitung',
      type: 'timeout',
      retryCount,
      canRetry: true,
      hint: 'Die Anfrage hat zu lange gedauert. Versuche es erneut.'
    };
  }

  if (messageLower.includes('500') || messageLower.includes('502') || messageLower.includes('503') || messageLower.includes('server')) {
    return {
      message: 'Serverfehler',
      type: 'server',
      retryCount,
      canRetry: true,
      hint: 'Der Server ist gerade ausgelastet. Bitte warte einen Moment und versuche es erneut.'
    };
  }

  if (messageLower.includes('parse') || messageLower.includes('json') || messageLower.includes('syntax')) {
    return {
      message: 'Verarbeitungsfehler',
      type: 'parse',
      retryCount,
      canRetry: true,
      hint: 'Die Antwort konnte nicht verarbeitet werden. Versuche es erneut.'
    };
  }

  return {
    message: message || 'Ein Fehler ist aufgetreten',
    type: 'unknown',
    retryCount,
    canRetry: retryCount < 2,
    hint: 'Bitte versuche es erneut oder kontaktiere den Support.'
  };
};

// Retry mit exponential backoff
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  onRetryAttempt?: (attempt: number) => void
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        onRetryAttempt?.(attempt + 1);
        await wait(delay);
      }
    }
  }

  throw lastError;
};

interface UseLegalLensReturn {
  // Daten
  clauses: ParsedClause[];
  selectedClause: ParsedClause | null;
  currentAnalysis: ClauseAnalysis | null;
  currentPerspective: PerspectiveType;
  progress: LegalLensProgress | null;
  alternatives: ClauseAlternative[];
  negotiation: NegotiationInfo | null;
  chatHistory: ChatMessage[];
  summary: {
    totalClauses: number;
    analyzedClauses: number;
    riskDistribution: { high: number; medium: number; low: number };
    topRisks: Array<{ clauseId: string; clauseText: string; riskLevel: RiskLevel; riskScore: number }>;
    overallRisk: RiskLevel;
  } | null;
  analysisCache: AnalysisCache;
  batchProgress: BatchProgress;

  // Status
  isLoading: boolean;
  isParsing: boolean;
  isAnalyzing: boolean;
  isGeneratingAlternatives: boolean;
  isGeneratingNegotiation: boolean;
  isChatting: boolean;
  isBatchAnalyzing: boolean;
  isRetrying: boolean;
  retryCount: number;
  streamingText: string;
  error: string | null;
  errorInfo: ErrorInfo | null;

  // ✅ NEU: Streaming-Status (Option B)
  isStreaming: boolean;
  streamingProgress: number;
  streamingStatus: string;
  parseSource: 'preprocessed' | 'streaming' | 'regex' | null;

  // Aktionen
  parseContract: (contractId: string) => Promise<void>;
  selectClause: (clause: ParsedClause) => void;
  analyzeClause: (streaming?: boolean) => Promise<void>;
  changePerspective: (perspective: PerspectiveType) => void;
  loadAlternatives: () => Promise<void>;
  loadNegotiationTips: () => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  markClauseReviewed: (clauseId: string) => Promise<void>;
  addNote: (clauseId: string, content: string) => Promise<void>;
  toggleBookmark: (clauseId: string, label?: string, color?: string) => Promise<void>;
  loadSummary: () => Promise<void>;
  analyzeAllClauses: () => Promise<void>;
  cancelBatchAnalysis: () => void;
  reset: () => void;
  // ✅ Phase 1 Schritt 4: Queue-Priorisierung
  bumpClauseInQueue: (clause: ParsedClause) => boolean;
}

// Cache-Key für Klausel+Perspektive Kombination
type CacheKey = `${string}-${PerspectiveType}`;

interface AnalysisCache {
  [key: CacheKey]: ClauseAnalysis;
}

/**
 * ✅ FIX Issue #1: Content-basierter Hash für konsistenten Cache
 * Erzeugt einen stabilen Hash aus dem Klauseltext (unabhängig von der clause.id)
 * So matchen PDF-Klicks und Text-Klauseln mit demselben Inhalt
 */
const generateContentHash = (text: string): string => {
  // Normalisiere Text: lowercase, whitespace reduzieren, erste 200 Zeichen
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);

  // Einfacher Hash basierend auf dem normalisierten Text
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Positiver Hash als Hex-String
  return Math.abs(hash).toString(16);
};

/**
 * Erzeugt einen konsistenten Cache-Key basierend auf INHALT statt ID
 */
const getCacheKey = (clause: ParsedClause, perspective: PerspectiveType): CacheKey => {
  const contentHash = generateContentHash(clause.text);
  return `content-${contentHash}-${perspective}` as CacheKey;
};

/**
 * Custom Hook für die Legal Lens Funktionalität
 */
export function useLegalLens(initialContractId?: string): UseLegalLensReturn {
  // State
  const [contractId, setContractId] = useState<string | null>(initialContractId || null);
  const [clauses, setClauses] = useState<ParsedClause[]>([]);
  const [selectedClause, setSelectedClause] = useState<ParsedClause | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<ClauseAnalysis | null>(null);
  const [currentPerspective, setCurrentPerspective] = useState<PerspectiveType>('contractor');
  const [progress, setProgress] = useState<LegalLensProgress | null>(null);
  const [alternatives, setAlternatives] = useState<ClauseAlternative[]>([]);
  const [negotiation, setNegotiation] = useState<NegotiationInfo | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<UseLegalLensReturn['summary']>(null);

  // ✅ NEU: Analysis Cache - speichert bereits analysierte Klauseln
  const [analysisCache, setAnalysisCache] = useState<AnalysisCache>({});

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAlternatives, setIsGeneratingAlternatives] = useState(false);
  const [isGeneratingNegotiation, setIsGeneratingNegotiation] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    completed: 0,
    current: null,
    isRunning: false
  });
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // ✅ NEU: Streaming-spezifische States für Option B
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  const [parseSource, setParseSource] = useState<'preprocessed' | 'streaming' | 'regex' | null>(null);

  // Refs
  const abortControllerRef = useRef<(() => void) | null>(null);
  const streamingAbortRef = useRef<(() => void) | null>(null);
  const batchAbortRef = useRef<boolean>(false);

  // ✅ Race Condition Fix: Request ID Tracking
  // Jede Analyse bekommt eine eindeutige ID, nur die neueste wird akzeptiert
  const analysisRequestIdRef = useRef<number>(0);
  const lastClauseIdRef = useRef<string | null>(null);

  // ✅ Phase 1 Performance: Ref um doppelten Auto-Preload zu verhindern
  const startedPreloadRef = useRef<boolean>(false);

  // ✅ Phase 1 Schritt 4: Queue-Priorisierung
  // Speichert die Klauseln die noch analysiert werden müssen (als Map: cacheKey -> clause)
  const preloadQueueRef = useRef<Map<string, ParsedClause>>(new Map());
  // Speichert den cacheKey der Klausel die der User angeklickt hat (Priorität)
  const priorityClauseRef = useRef<string | null>(null);

  /**
   * Vertrag parsen - mit Auto-Streaming für nicht-vorverarbeitete Verträge
   */
  const parseContract = useCallback(async (id: string) => {
    // FIX: Race Condition - Abort any existing streaming FIRST
    if (streamingAbortRef.current) {
      console.log('[Legal Lens] Aborting existing streaming session');
      streamingAbortRef.current();
      streamingAbortRef.current = null;
    }

    setIsParsing(true);
    setIsStreaming(false); // Reset streaming state
    setError(null);
    setErrorInfo(null);
    setContractId(id);
    setRetryCount(0);
    setParseSource(null);
    setStreamingProgress(0);
    setStreamingStatus('');
    // FIX: Reset clauses bei neuem Contract, um alte Daten zu vermeiden
    setClauses([]);

    try {
      // Erst normalen Parse versuchen (prüft auf vorverarbeitete Klauseln)
      const response = await withRetry(
        () => legalLensAPI.parseContract(id),
        2,
        (attempt) => {
          setIsRetrying(true);
          setRetryCount(attempt);
          console.log(`[Legal Lens] Parse retry attempt ${attempt}`);
        }
      );

      setIsRetrying(false);
      setRetryCount(0);

      if (response.success) {
        // 🌊 STREAMING PATH: Backend empfiehlt Streaming (keine Vorverarbeitung)
        if (response.useStreaming) {
          console.log(`🌊 [Legal Lens] Backend empfiehlt Streaming: ${response.reason}`);
          setIsParsing(false);
          setIsStreaming(true);
          setStreamingStatus(response.message || 'Starte KI-Analyse...');

          // Streaming sofort starten
          streamingAbortRef.current = legalLensAPI.parseContractStreaming(id, {
            onStatus: (message, progress) => {
              setStreamingStatus(message);
              setStreamingProgress(progress);
            },
            onClausesBatch: (newClauses, totalSoFar) => {
              setClauses(prev => {
                const existingIds = new Set(prev.map(c => c.id));
                const uniqueNew = newClauses.filter(c => !existingIds.has(c.id));
                return [...prev, ...uniqueNew];
              });
              setStreamingStatus(`${totalSoFar} Klauseln analysiert...`);
            },
            onComplete: (totalClauses) => {
              console.log(`✅ [Legal Lens] Streaming complete: ${totalClauses} Klauseln`);
              setIsStreaming(false);
              setStreamingProgress(100);
              setStreamingStatus('Analyse abgeschlossen');
              setParseSource('streaming');
            },
            onError: (errorMsg) => {
              console.error(`❌ [Legal Lens] Streaming error:`, errorMsg);
              setIsStreaming(false);
              setError(errorMsg);
            }
          });
          return; // Fertig - Streaming übernimmt
        }

        // Prüfe ob vorverarbeitet (Option A)
        const source = response.metadata?.source as 'preprocessed' | 'regex' | undefined;

        if (source === 'preprocessed') {
          // ⚡ FAST PATH: Vorverarbeitete Klauseln - sofort anzeigen
          console.log(`⚡ [Legal Lens] Vorverarbeitete Klauseln: ${response.clauses?.length}`);
          setClauses(response.clauses || []);
          setParseSource('preprocessed');
          setIsParsing(false);
        } else if (response.clauses && response.clauses.length > 50) {
          // 🌊 FALLBACK STREAMING: Viele Klauseln vom alten Regex-Parser
          // (Sollte mit neuer Backend-Logik nicht mehr vorkommen)
          console.log(`🌊 [Legal Lens] Fallback: Starte Streaming für bessere Ergebnisse...`);
          setIsParsing(false);
          setIsStreaming(true);
          setStreamingStatus('Starte KI-Analyse...');

          // Streaming starten
          streamingAbortRef.current = legalLensAPI.parseContractStreaming(id, {
            onStatus: (message, progress) => {
              setStreamingStatus(message);
              setStreamingProgress(progress);
            },
            onClausesBatch: (newClauses, totalSoFar) => {
              setClauses(prev => {
                // Merge neue Klauseln (dedupliziert nach ID)
                const existingIds = new Set(prev.map(c => c.id));
                const uniqueNew = newClauses.filter(c => !existingIds.has(c.id));
                return [...prev, ...uniqueNew];
              });
              setStreamingStatus(`${totalSoFar} Klauseln analysiert...`);
            },
            onComplete: (totalClauses) => {
              console.log(`✅ [Legal Lens] Streaming complete: ${totalClauses} Klauseln`);
              setIsStreaming(false);
              setStreamingProgress(100);
              setStreamingStatus('Analyse abgeschlossen');
              setParseSource('streaming');
            },
            onError: (errorMsg) => {
              console.error(`❌ [Legal Lens] Streaming error:`, errorMsg);
              setIsStreaming(false);
              setError(errorMsg);
              // Behalte die Regex-Klauseln als Fallback
              setParseSource('regex');
            }
          });
        } else if (response.clauses && response.clauses.length > 0) {
          // Wenige Klauseln - normal anzeigen (könnte vorverarbeitet sein ohne Metadata)
          console.log(`📋 [Legal Lens] ${response.clauses.length} Klauseln geladen`);
          setClauses(response.clauses);
          setParseSource(source || 'regex');
          setIsParsing(false);
        } else {
          // Keine Klauseln - Fehler
          console.error(`❌ [Legal Lens] Keine Klauseln in Response`);
          setError('Keine Klauseln gefunden');
          setIsParsing(false);
        }

        // Fortschritt laden
        try {
          const progressResponse = await withRetry(
            () => legalLensAPI.getProgress(id),
            1
          );
          if (progressResponse.success) {
            setProgress(progressResponse.progress);
            if (progressResponse.progress.currentPerspective) {
              setCurrentPerspective(progressResponse.progress.currentPerspective);
            }
          }
        } catch {
          console.warn('[Legal Lens] Could not load progress');
        }
      }
    } catch (err) {
      const errorDetails = categorizeError(err, retryCount);
      setError(errorDetails.message);
      setErrorInfo(errorDetails);
      setIsRetrying(false);
      setIsParsing(false);
      console.error('[Legal Lens] Parse error after retries:', err);
    }
  }, [retryCount]);

  /**
   * Klausel auswählen - mit Cache-Prüfung
   * ✅ Race Condition Fix: Bricht laufende Analysen ab
   */
  const selectClause = useCallback((clause: ParsedClause) => {
    // ✅ Race Condition Fix: Abbrechen laufender Analyse wenn andere Klausel
    if (lastClauseIdRef.current !== clause.id) {
      if (abortControllerRef.current) {
        console.log('[Legal Lens] Abbreche laufende Analyse (neue Klausel ausgewählt)');
        abortControllerRef.current();
        abortControllerRef.current = null;
      }
      // Reset analyzing state
      setIsAnalyzing(false);
      setStreamingText('');
    }

    lastClauseIdRef.current = clause.id;
    setSelectedClause(clause);

    // ✅ FIX Issue #1: Content-basierter Cache-Key statt ID
    const cacheKey = getCacheKey(clause, currentPerspective);
    const cachedAnalysis = analysisCache[cacheKey];

    if (cachedAnalysis) {
      setCurrentAnalysis(cachedAnalysis);
      setChatHistory(cachedAnalysis.chatHistory || []);
    } else {
      // Keine gecachte Analyse - wird später durch analyzeClause geladen
      setCurrentAnalysis(null);
      setChatHistory([]);
    }

    setAlternatives([]);
    setNegotiation(null);
  }, [currentPerspective, analysisCache]);

  /**
   * Klausel analysieren - mit Caching
   * ✅ Race Condition Fix: Request ID Tracking
   */
  const analyzeClause = useCallback(async (streaming: boolean = true) => {
    if (!contractId || !selectedClause) return;

    // ✅ FIX Issue #1: Content-basierter Cache-Key statt ID
    const cacheKey = getCacheKey(selectedClause, currentPerspective);
    const cachedAnalysis = analysisCache[cacheKey];

    if (cachedAnalysis) {
      setCurrentAnalysis(cachedAnalysis);
      setChatHistory(cachedAnalysis.chatHistory || []);
      return; // Keine API-Anfrage nötig!
    }

    // Vorherige Streaming-Anfrage abbrechen
    if (abortControllerRef.current) {
      abortControllerRef.current();
      abortControllerRef.current = null;
    }

    // ✅ Race Condition Fix: Eindeutige Request ID für diese Analyse
    const currentRequestId = ++analysisRequestIdRef.current;
    const currentClauseId = selectedClause.id;

    setIsAnalyzing(true);
    setError(null);
    setErrorInfo(null);
    setStreamingText('');
    setRetryCount(0);

    // ✅ Helper: Prüft ob diese Anfrage noch aktuell ist
    const isRequestStale = () => {
      const isStale = analysisRequestIdRef.current !== currentRequestId ||
                      lastClauseIdRef.current !== currentClauseId;
      if (isStale) {
        console.log('[Legal Lens] Ignoriere veraltete Response (Request ID mismatch)');
      }
      return isStale;
    };

    // ✅ Helper: Analyse in Cache speichern
    const cacheAnalysis = (analysis: ClauseAnalysis) => {
      setAnalysisCache(prev => ({
        ...prev,
        [cacheKey]: analysis
      }));
    };

    try {
      if (streaming) {
        // Streaming-Analyse (kein Retry da EventSource)
        const abort = legalLensAPI.analyzeClauseStreaming(
          contractId,
          selectedClause.id,
          selectedClause.text,
          currentPerspective,
          (chunk) => {
            // ✅ Race Condition Fix: Nur updaten wenn Request noch aktuell
            if (!isRequestStale()) {
              setStreamingText(prev => prev + chunk);
            }
          },
          (response) => {
            // ✅ Race Condition Fix: Nur updaten wenn Request noch aktuell
            if (isRequestStale()) return;
            setCurrentAnalysis(response.analysis);
            setChatHistory(response.analysis.chatHistory || []);
            cacheAnalysis(response.analysis);
            setIsAnalyzing(false);
            setIsRetrying(false);
          },
          (err) => {
            // ✅ Race Condition Fix: Fehler nur anzeigen wenn Request noch aktuell
            if (isRequestStale()) return;
            const errorDetails = categorizeError(err);
            setError(errorDetails.message);
            setErrorInfo(errorDetails);
            setIsAnalyzing(false);
            setIsRetrying(false);
          }
        );
        abortControllerRef.current = abort;
      } else {
        // Normale Analyse - mit Auto-Retry
        const response = await withRetry(
          () => legalLensAPI.analyzeClause(
            contractId,
            selectedClause.id,
            selectedClause.text,
            currentPerspective,
            false
          ),
          2,
          (attempt) => {
            // ✅ Race Condition Fix: Nur Retry-Status updaten wenn noch aktuell
            if (!isRequestStale()) {
              setIsRetrying(true);
              setRetryCount(attempt);
            }
            console.log(`[Legal Lens] Analyze retry attempt ${attempt}`);
          }
        );

        // ✅ Race Condition Fix: Nur updaten wenn Request noch aktuell
        if (isRequestStale()) return;

        setIsRetrying(false);
        setRetryCount(0);

        if (response.success) {
          setCurrentAnalysis(response.analysis);
          setChatHistory(response.analysis.chatHistory || []);
          cacheAnalysis(response.analysis);
        }
        setIsAnalyzing(false);
      }
    } catch (err) {
      // ✅ Race Condition Fix: Fehler nur anzeigen wenn Request noch aktuell
      if (isRequestStale()) return;
      const errorDetails = categorizeError(err, retryCount);
      setError(errorDetails.message);
      setErrorInfo(errorDetails);
      setIsAnalyzing(false);
      setIsRetrying(false);
    }
  }, [contractId, selectedClause, currentPerspective, analysisCache, retryCount]);

  /**
   * Perspektive wechseln - mit Cache-Prüfung
   */
  const changePerspective = useCallback(async (perspective: PerspectiveType) => {
    setCurrentPerspective(perspective);

    // Perspektive im Backend speichern
    if (contractId) {
      try {
        await legalLensAPI.updateProgress(contractId, { currentPerspective: perspective });
      } catch (err) {
        console.error('[Legal Lens] Error saving perspective:', err);
      }
    }

    // ✅ FIX Issue #1: Content-basierter Cache-Key für neue Perspektive
    if (selectedClause) {
      const cacheKey = getCacheKey(selectedClause, perspective);
      const cachedAnalysis = analysisCache[cacheKey];

      if (cachedAnalysis) {
        setCurrentAnalysis(cachedAnalysis);
        setChatHistory(cachedAnalysis.chatHistory || []);
      } else {
        // Keine gecachte Analyse für diese Perspektive - wird neu geladen
        setCurrentAnalysis(null);
        setChatHistory([]);
        setStreamingText('');
      }
    }
  }, [contractId, selectedClause, analysisCache]);

  /**
   * Alternativen laden
   */
  const loadAlternatives = useCallback(async () => {
    if (!contractId || !selectedClause) return;

    setIsGeneratingAlternatives(true);
    setError(null);

    try {
      const response = await legalLensAPI.generateAlternatives(
        contractId,
        selectedClause.id,
        selectedClause.text,
        currentPerspective
      );

      if (response.success) {
        setAlternatives(response.alternatives);
      }
    } catch (err) {
      // ✅ Phase 1 Task 4: Kategorisierte Fehlermeldungen
      const errorDetails = categorizeError(err);
      setError(errorDetails.message);
      setErrorInfo(errorDetails);
    } finally {
      setIsGeneratingAlternatives(false);
    }
  }, [contractId, selectedClause, currentPerspective]);

  /**
   * Verhandlungstipps laden
   */
  const loadNegotiationTips = useCallback(async () => {
    if (!contractId || !selectedClause) return;

    setIsGeneratingNegotiation(true);
    setError(null);

    try {
      const response = await legalLensAPI.generateNegotiationTips(
        contractId,
        selectedClause.id,
        selectedClause.text,
        currentPerspective
      );

      if (response.success) {
        setNegotiation(response.negotiation);
      }
    } catch (err) {
      // ✅ Phase 1 Task 4: Kategorisierte Fehlermeldungen
      const errorDetails = categorizeError(err);
      setError(errorDetails.message);
      setErrorInfo(errorDetails);
    } finally {
      setIsGeneratingNegotiation(false);
    }
  }, [contractId, selectedClause, currentPerspective]);

  /**
   * Chat-Nachricht senden
   */
  const sendChatMessage = useCallback(async (message: string) => {
    if (!contractId || !selectedClause) return;

    setIsChatting(true);
    setError(null);

    // Optimistic Update
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      const response = await legalLensAPI.chatAboutClause(
        contractId,
        selectedClause.id,
        message,
        selectedClause.text,
        currentPerspective
      );

      if (response.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      // ✅ Phase 1 Task 4: Bessere Chat-Fehlermeldungen
      const errorDetails = categorizeError(err);
      setError(errorDetails.message);
      setErrorInfo(errorDetails);
      // User-Nachricht wieder entfernen bei Fehler
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setIsChatting(false);
    }
  }, [contractId, selectedClause, currentPerspective]);

  /**
   * Klausel als gelesen markieren
   */
  const markClauseReviewed = useCallback(async (clauseId: string) => {
    if (!contractId) return;

    try {
      const currentReviewed = progress?.reviewedClauses || [];
      if (!currentReviewed.includes(clauseId)) {
        const updatedReviewed = [...currentReviewed, clauseId];
        await legalLensAPI.updateProgress(contractId, {
          reviewedClauses: updatedReviewed,
          lastViewedClause: clauseId
        });

        setProgress(prev => prev ? {
          ...prev,
          reviewedClauses: updatedReviewed,
          lastViewedClause: clauseId,
          percentComplete: Math.round((updatedReviewed.length / (prev.totalClauses || 1)) * 100)
        } : null);
      }
    } catch (err) {
      console.error('[Legal Lens] Error marking clause reviewed:', err);
    }
  }, [contractId, progress]);

  /**
   * Notiz hinzufügen
   */
  const addNote = useCallback(async (clauseId: string, content: string) => {
    if (!contractId) return;

    try {
      const response = await legalLensAPI.addNote(contractId, clauseId, content);
      if (response.success) {
        setProgress(prev => prev ? {
          ...prev,
          notes: [...prev.notes, response.note]
        } : null);
      }
    } catch (err) {
      // ✅ Phase 1 Task 4: Kategorisierte Fehlermeldungen
      const errorDetails = categorizeError(err);
      setError(errorDetails.message);
      setErrorInfo(errorDetails);
    }
  }, [contractId]);

  /**
   * Bookmark hinzufügen/entfernen
   */
  const toggleBookmark = useCallback(async (clauseId: string, label?: string, color?: string) => {
    if (!contractId) return;

    try {
      const response = await legalLensAPI.toggleBookmark(contractId, clauseId, label, color);
      if (response.success) {
        setProgress(prev => {
          if (!prev) return null;

          if (response.action === 'added' && response.bookmark) {
            return {
              ...prev,
              bookmarks: [...prev.bookmarks, response.bookmark]
            };
          } else {
            return {
              ...prev,
              bookmarks: prev.bookmarks.filter(b => b.clauseId !== clauseId)
            };
          }
        });
      }
    } catch (err) {
      // ✅ Phase 1 Task 4: Kategorisierte Fehlermeldungen
      const errorDetails = categorizeError(err);
      setError(errorDetails.message);
      setErrorInfo(errorDetails);
    }
  }, [contractId]);

  /**
   * Zusammenfassung laden
   */
  const loadSummary = useCallback(async () => {
    if (!contractId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await legalLensAPI.getAnalysisSummary(contractId);
      if (response.success) {
        setSummary(response.summary);
      }
    } catch (err) {
      // ✅ Phase 1 Task 4: Kategorisierte Fehlermeldungen
      const errorDetails = categorizeError(err);
      setError(errorDetails.message);
      setErrorInfo(errorDetails);
    } finally {
      setIsLoading(false);
    }
  }, [contractId]);

  /**
   * ✅ NEU: Alle Klauseln im Hintergrund analysieren (Batch)
   */
  const analyzeAllClauses = useCallback(async () => {
    if (!contractId || clauses.length === 0) return;

    // Reset abort flag
    batchAbortRef.current = false;
    setIsBatchAnalyzing(true);
    setError(null);

    // ✅ FIX Issue #1: Content-basierter Cache-Key
    // Finde alle Klauseln die noch nicht im Cache sind
    const uncachedClauses = clauses.filter(clause => {
      const cacheKey = getCacheKey(clause, currentPerspective);
      return !analysisCache[cacheKey];
    });

    if (uncachedClauses.length === 0) {
      console.log('[Legal Lens] All clauses already cached!');
      setIsBatchAnalyzing(false);
      return;
    }

    setBatchProgress({
      total: uncachedClauses.length,
      completed: 0,
      current: uncachedClauses[0]?.text.substring(0, 50) || null,
      isRunning: true
    });

    console.log(`[Legal Lens] Starting batch analysis for ${uncachedClauses.length} clauses`);

    // Analysiere Klauseln nacheinander
    for (let i = 0; i < uncachedClauses.length; i++) {
      // Prüfe ob abgebrochen werden soll
      if (batchAbortRef.current) {
        console.log('[Legal Lens] Batch analysis cancelled');
        break;
      }

      const clause = uncachedClauses[i];
      // ✅ FIX Issue #1: Content-basierter Cache-Key
      const cacheKey = getCacheKey(clause, currentPerspective);

      // Update Progress
      setBatchProgress(prev => ({
        ...prev,
        current: clause.text.substring(0, 50) + '...',
        completed: i
      }));

      try {
        // Normale (nicht-streaming) Analyse verwenden
        const response = await legalLensAPI.analyzeClause(
          contractId,
          clause.id,
          clause.text,
          currentPerspective,
          false
        );

        if (response.success) {
          // In Cache speichern
          setAnalysisCache(prev => ({
            ...prev,
            [cacheKey]: response.analysis
          }));
        }
      } catch (err) {
        console.error(`[Legal Lens] Error analyzing clause ${clause.id}:`, err);
        // Fehler bei einer Klausel sollte den Batch nicht abbrechen
      }

      // Kleine Pause um Backend nicht zu überlasten (300ms)
      if (i < uncachedClauses.length - 1 && !batchAbortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setBatchProgress(prev => ({
      ...prev,
      completed: batchAbortRef.current ? prev.completed : uncachedClauses.length,
      current: null,
      isRunning: false
    }));
    setIsBatchAnalyzing(false);

    console.log('[Legal Lens] Batch analysis completed');
  }, [contractId, clauses, currentPerspective, analysisCache]);

  /**
   * ✅ NEU: Batch-Analyse abbrechen
   */
  const cancelBatchAnalysis = useCallback(() => {
    batchAbortRef.current = true;
    console.log('[Legal Lens] Batch analysis cancel requested');
  }, []);

  /**
   * ✅ Phase 1 Schritt 4: Klausel in Queue nach vorne schieben
   * Wird aufgerufen wenn User auf eine Klausel klickt während Batch läuft.
   * Gibt true zurück wenn die Klausel in der Queue ist und priorisiert wurde.
   */
  const bumpClauseInQueue = useCallback((clause: ParsedClause): boolean => {
    const cacheKey = getCacheKey(clause, currentPerspective);

    // Prüfe ob Klausel in der Queue ist
    if (preloadQueueRef.current.has(cacheKey)) {
      priorityClauseRef.current = cacheKey;
      return true;
    }

    return false;
  }, [currentPerspective]);

  /**
   * ✅ Phase 1 Performance: Automatisches Vorladen von HIGH-Risk Klauseln
   * Wird nach erfolgreichem Streaming automatisch getriggert.
   * Analysiert NUR High-Risk Klauseln (meist 3-7 Stück) für optimale Kosten/UX Balance.
   *
   * SCHRITT 4: Unterstützt Queue-Priorisierung - wenn User eine Klausel anklickt
   * während der Batch läuft, wird diese Klausel als nächstes analysiert.
   */
  const autoAnalyzeHighRisk = useCallback(async () => {
    if (!contractId || clauses.length === 0) return;

    // Filtere nur HIGH-Risk Klauseln
    const highRiskClauses = clauses.filter(clause => {
      const riskLevel = clause.riskIndicators?.level || clause.preAnalysis?.riskLevel;
      return riskLevel === 'high';
    });

    if (highRiskClauses.length === 0) return;

    // Filtere bereits gecachte Klauseln raus
    const uncachedHighRisk = highRiskClauses.filter(clause => {
      const cacheKey = getCacheKey(clause, currentPerspective);
      return !analysisCache[cacheKey];
    });

    if (uncachedHighRisk.length === 0) return;

    console.log(`🚀 [Legal Lens] Auto-Preload: ${uncachedHighRisk.length} high-risk clauses`);

    // Queue aufbauen (Map: cacheKey -> clause)
    preloadQueueRef.current.clear();
    priorityClauseRef.current = null;

    uncachedHighRisk.forEach((clause) => {
      const cacheKey = getCacheKey(clause, currentPerspective);
      preloadQueueRef.current.set(cacheKey, clause);
    });

    // Batch starten
    batchAbortRef.current = false;
    setIsBatchAnalyzing(true);
    setBatchProgress({
      total: uncachedHighRisk.length,
      completed: 0,
      current: uncachedHighRisk[0]?.text.substring(0, 50) || null,
      isRunning: true
    });

    let completedCount = 0;

    // ✅ SCHRITT 4: Queue-basierte Verarbeitung mit Priorität
    while (preloadQueueRef.current.size > 0 && !batchAbortRef.current) {
      // Prüfe ob es eine priorisierte Klausel gibt
      let nextCacheKey: string;
      let clause: ParsedClause;

      if (priorityClauseRef.current && preloadQueueRef.current.has(priorityClauseRef.current)) {
        // Priorisierte Klausel zuerst
        nextCacheKey = priorityClauseRef.current;
        clause = preloadQueueRef.current.get(nextCacheKey)!;
        priorityClauseRef.current = null; // Reset nach Verwendung
      } else {
        // Nächste Klausel aus der Queue (erste in der Map)
        const firstEntry = preloadQueueRef.current.entries().next().value;
        if (!firstEntry) break;
        [nextCacheKey, clause] = firstEntry;
      }

      // Entferne aus Queue
      preloadQueueRef.current.delete(nextCacheKey);

      setBatchProgress(prev => ({
        ...prev,
        current: `🔴 ${clause.text.substring(0, 40)}...`,
        completed: completedCount
      }));

      try {
        const response = await legalLensAPI.analyzeClause(
          contractId,
          clause.id,
          clause.text,
          currentPerspective,
          false
        );

        if (response.success) {
          setAnalysisCache(prev => ({
            ...prev,
            [nextCacheKey]: response.analysis
          }));
          completedCount++;
        }
      } catch (err) {
        console.error(`❌ [Legal Lens] Auto-Preload error for ${clause.id}:`, err);
        completedCount++; // Trotzdem weiterzählen
      }

      // Pause zwischen Requests (300ms) - nur wenn noch Klauseln in Queue
      if (preloadQueueRef.current.size > 0 && !batchAbortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Queue leeren falls abgebrochen
    preloadQueueRef.current.clear();
    priorityClauseRef.current = null;

    setBatchProgress(prev => ({
      ...prev,
      completed: completedCount,
      current: null,
      isRunning: false
    }));
    setIsBatchAnalyzing(false);
  }, [contractId, clauses, currentPerspective, analysisCache]);

  /**
   * Reset
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current();
      abortControllerRef.current = null;
    }

    setContractId(null);
    setClauses([]);
    setSelectedClause(null);
    setCurrentAnalysis(null);
    setCurrentPerspective('contractor');
    setProgress(null);
    setAlternatives([]);
    setNegotiation(null);
    setChatHistory([]);
    setSummary(null);
    setStreamingText('');
    setError(null);
    setAnalysisCache({}); // ✅ NEU: Cache leeren
    startedPreloadRef.current = false; // ✅ Phase 1: Preload-Flag zurücksetzen
    // ✅ Phase 1 Schritt 4: Queue zurücksetzen
    preloadQueueRef.current.clear();
    priorityClauseRef.current = null;
  }, []);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current();
      }
    };
  }, []);

  /**
   * ✅ Phase 1 Performance: Auto-Preload nach Streaming
   *
   * GUARDRAILS (wie von ChatGPT empfohlen):
   * - Streaming muss abgeschlossen sein (!isStreaming)
   * - Klauseln müssen vorhanden sein (clauses.length > 0)
   * - Noch kein Batch läuft (!isBatchAnalyzing)
   * - Noch nicht gestartet (!startedPreloadRef.current)
   *
   * Das verhindert Race Conditions mit React State Updates.
   */
  useEffect(() => {
    // Alle Guardrails prüfen
    if (
      !isStreaming &&                      // Streaming muss fertig sein
      clauses.length > 0 &&                // Klauseln müssen da sein
      !isBatchAnalyzing &&                 // Kein Batch darf laufen
      !startedPreloadRef.current &&        // Noch nicht gestartet
      parseSource === 'streaming'          // Nur nach echtem Streaming (nicht bei preprocessed)
    ) {
      startedPreloadRef.current = true;
      autoAnalyzeHighRisk();
    }
  }, [isStreaming, clauses.length, isBatchAnalyzing, parseSource, autoAnalyzeHighRisk]);

  return {
    // Daten
    clauses,
    selectedClause,
    currentAnalysis,
    currentPerspective,
    progress,
    alternatives,
    negotiation,
    chatHistory,
    summary,
    analysisCache,
    batchProgress,

    // Status
    isLoading,
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

    // ✅ NEU: Streaming-Status (Option B)
    isStreaming,
    streamingProgress,
    streamingStatus,
    parseSource,

    // Aktionen
    parseContract,
    selectClause,
    analyzeClause,
    changePerspective,
    loadAlternatives,
    loadNegotiationTips,
    sendChatMessage,
    markClauseReviewed,
    addNote,
    toggleBookmark,
    loadSummary,
    analyzeAllClauses,
    cancelBatchAnalysis,
    reset,
    // ✅ Phase 1 Schritt 4: Queue-Priorisierung
    bumpClauseInQueue
  };
}

export default useLegalLens;

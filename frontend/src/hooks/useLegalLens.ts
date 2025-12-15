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
}

// Cache-Key für Klausel+Perspektive Kombination
type CacheKey = `${string}-${PerspectiveType}`;

interface AnalysisCache {
  [key: CacheKey]: ClauseAnalysis;
}

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

  // Refs
  const abortControllerRef = useRef<(() => void) | null>(null);
  const batchAbortRef = useRef<boolean>(false);

  /**
   * Vertrag parsen - mit Auto-Retry
   */
  const parseContract = useCallback(async (id: string) => {
    setIsParsing(true);
    setError(null);
    setErrorInfo(null);
    setContractId(id);
    setRetryCount(0);

    try {
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
        setClauses(response.clauses);

        // Fortschritt laden (auch mit Retry)
        try {
          const progressResponse = await withRetry(
            () => legalLensAPI.getProgress(id),
            1
          );
          if (progressResponse.success) {
            setProgress(progressResponse.progress);

            // Letzte Perspektive wiederherstellen
            if (progressResponse.progress.currentPerspective) {
              setCurrentPerspective(progressResponse.progress.currentPerspective);
            }
          }
        } catch {
          // Progress-Fehler ist nicht kritisch, ignorieren
          console.warn('[Legal Lens] Could not load progress');
        }
      }
    } catch (err) {
      const errorDetails = categorizeError(err, retryCount);
      setError(errorDetails.message);
      setErrorInfo(errorDetails);
      setIsRetrying(false);
      console.error('[Legal Lens] Parse error after retries:', err);
    } finally {
      setIsParsing(false);
    }
  }, [retryCount]);

  /**
   * Klausel auswählen - mit Cache-Prüfung
   */
  const selectClause = useCallback((clause: ParsedClause) => {
    setSelectedClause(clause);

    // ✅ NEU: Prüfe ob Analyse bereits im Cache ist
    const cacheKey: CacheKey = `${clause.id}-${currentPerspective}`;
    const cachedAnalysis = analysisCache[cacheKey];

    if (cachedAnalysis) {
      console.log('[Legal Lens] Using cached analysis for:', cacheKey);
      setCurrentAnalysis(cachedAnalysis);
      setChatHistory(cachedAnalysis.chatHistory || []);
    } else {
      // Keine gecachte Analyse - wird später durch analyzeClause geladen
      setCurrentAnalysis(null);
      setChatHistory([]);
    }

    setAlternatives([]);
    setNegotiation(null);
    setStreamingText('');
  }, [currentPerspective, analysisCache]);

  /**
   * Klausel analysieren - mit Caching
   */
  const analyzeClause = useCallback(async (streaming: boolean = true) => {
    if (!contractId || !selectedClause) return;

    // ✅ NEU: Prüfe zuerst den Cache
    const cacheKey: CacheKey = `${selectedClause.id}-${currentPerspective}`;
    const cachedAnalysis = analysisCache[cacheKey];

    if (cachedAnalysis) {
      console.log('[Legal Lens] Analysis already cached, skipping API call');
      setCurrentAnalysis(cachedAnalysis);
      setChatHistory(cachedAnalysis.chatHistory || []);
      return; // Keine API-Anfrage nötig!
    }

    // Vorherige Streaming-Anfrage abbrechen
    if (abortControllerRef.current) {
      abortControllerRef.current();
      abortControllerRef.current = null;
    }

    setIsAnalyzing(true);
    setError(null);
    setErrorInfo(null);
    setStreamingText('');
    setRetryCount(0);

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
            setStreamingText(prev => prev + chunk);
          },
          (response) => {
            setCurrentAnalysis(response.analysis);
            setChatHistory(response.analysis.chatHistory || []);
            cacheAnalysis(response.analysis);
            setIsAnalyzing(false);
            setIsRetrying(false);
          },
          (err) => {
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
            setIsRetrying(true);
            setRetryCount(attempt);
            console.log(`[Legal Lens] Analyze retry attempt ${attempt}`);
          }
        );

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

    // ✅ NEU: Prüfe Cache für neue Perspektive
    if (selectedClause) {
      const cacheKey: CacheKey = `${selectedClause.id}-${perspective}`;
      const cachedAnalysis = analysisCache[cacheKey];

      if (cachedAnalysis) {
        console.log('[Legal Lens] Using cached analysis for perspective:', perspective);
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
      setError(err instanceof Error ? err.message : 'Fehler beim Generieren der Alternativen');
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
      setError(err instanceof Error ? err.message : 'Fehler beim Generieren der Verhandlungstipps');
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
      setError(err instanceof Error ? err.message : 'Chat-Fehler');
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
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern der Notiz');
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
      setError(err instanceof Error ? err.message : 'Fehler beim Bookmark');
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
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Zusammenfassung');
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

    // Finde alle Klauseln die noch nicht im Cache sind
    const uncachedClauses = clauses.filter(clause => {
      const cacheKey: CacheKey = `${clause.id}-${currentPerspective}`;
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
      const cacheKey: CacheKey = `${clause.id}-${currentPerspective}`;

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
          console.log(`[Legal Lens] Cached clause ${i + 1}/${uncachedClauses.length}: ${clause.id}`);
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
  }, []);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current();
      }
    };
  }, []);

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
    reset
  };
}

export default useLegalLens;

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

  // Status
  isLoading: boolean;
  isParsing: boolean;
  isAnalyzing: boolean;
  isGeneratingAlternatives: boolean;
  isGeneratingNegotiation: boolean;
  isChatting: boolean;
  streamingText: string;
  error: string | null;

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
  reset: () => void;
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

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAlternatives, setIsGeneratingAlternatives] = useState(false);
  const [isGeneratingNegotiation, setIsGeneratingNegotiation] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const abortControllerRef = useRef<(() => void) | null>(null);

  /**
   * Vertrag parsen
   */
  const parseContract = useCallback(async (id: string) => {
    setIsParsing(true);
    setError(null);
    setContractId(id);

    try {
      const response = await legalLensAPI.parseContract(id);

      if (response.success) {
        setClauses(response.clauses);

        // Fortschritt laden
        const progressResponse = await legalLensAPI.getProgress(id);
        if (progressResponse.success) {
          setProgress(progressResponse.progress);

          // Letzte Perspektive wiederherstellen
          if (progressResponse.progress.currentPerspective) {
            setCurrentPerspective(progressResponse.progress.currentPerspective);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Parsen');
      console.error('[Legal Lens] Parse error:', err);
    } finally {
      setIsParsing(false);
    }
  }, []);

  /**
   * Klausel auswählen
   */
  const selectClause = useCallback((clause: ParsedClause) => {
    setSelectedClause(clause);
    setCurrentAnalysis(null);
    setAlternatives([]);
    setNegotiation(null);
    setChatHistory([]);
    setStreamingText('');
  }, []);

  /**
   * Klausel analysieren
   */
  const analyzeClause = useCallback(async (streaming: boolean = true) => {
    if (!contractId || !selectedClause) return;

    // Vorherige Streaming-Anfrage abbrechen
    if (abortControllerRef.current) {
      abortControllerRef.current();
      abortControllerRef.current = null;
    }

    setIsAnalyzing(true);
    setError(null);
    setStreamingText('');

    try {
      if (streaming) {
        // Streaming-Analyse
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
            setIsAnalyzing(false);
          },
          (err) => {
            setError(err.message);
            setIsAnalyzing(false);
          }
        );
        abortControllerRef.current = abort;
      } else {
        // Normale Analyse
        const response = await legalLensAPI.analyzeClause(
          contractId,
          selectedClause.id,
          selectedClause.text,
          currentPerspective,
          false
        );

        if (response.success) {
          setCurrentAnalysis(response.analysis);
          setChatHistory(response.analysis.chatHistory || []);
        }
        setIsAnalyzing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyse-Fehler');
      setIsAnalyzing(false);
    }
  }, [contractId, selectedClause, currentPerspective]);

  /**
   * Perspektive wechseln
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

    // Neu analysieren wenn Klausel ausgewählt
    if (selectedClause && currentAnalysis) {
      setCurrentAnalysis(null);
      setStreamingText('');
    }
  }, [contractId, selectedClause, currentAnalysis]);

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

    // Status
    isLoading,
    isParsing,
    isAnalyzing,
    isGeneratingAlternatives,
    isGeneratingNegotiation,
    isChatting,
    streamingText,
    error,

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
    reset
  };
}

export default useLegalLens;

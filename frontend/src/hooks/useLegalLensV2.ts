/**
 * useLegalLensV2 — Master-Hook für Legal Lens V2
 *
 * Lädt Vertrag, parst Klauseln, fetcht Analysen und startet SSE-Batch.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchWithAuth, API_BASE_URL } from '../context/authUtils';
import * as api from '../services/legalLensV2API';
import type {
  ParsedClauseV2,
  AnalysesMap,
  UseLegalLensV2Return
} from '../types/legalLensV2';

export function useLegalLensV2(contractId: string | undefined): UseLegalLensV2Return {
  // Daten
  const [contract, setContract] = useState<{ _id: string; name: string; s3Key?: string } | null>(null);
  const [clauses, setClauses] = useState<ParsedClauseV2[]>([]);
  const [analysesMap, setAnalysesMap] = useState<AnalysesMap>({});

  // Status
  const [isLoadingContract, setIsLoadingContract] = useState(true);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // 1. Vertrag laden
  useEffect(() => {
    if (!contractId) return;

    const loadContract = async () => {
      setIsLoadingContract(true);
      setError(null);

      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/contracts/${contractId}`);
        if (!response.ok) throw new Error('Vertrag nicht gefunden');

        const data = await response.json();
        if (mountedRef.current) {
          setContract(data.contract || data);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        }
      } finally {
        if (mountedRef.current) setIsLoadingContract(false);
      }
    };

    loadContract();
  }, [contractId]);

  // 2. Klauseln parsen + Analysen laden (parallel)
  useEffect(() => {
    if (!contractId || !contract) return;

    const loadData = async () => {
      setIsLoadingClauses(true);

      try {
        // Parallel: Klauseln parsen + bestehende Analysen laden
        const [parseResult, analysesResult] = await Promise.allSettled([
          api.parseContract(contractId),
          api.getAnalyses(contractId)
        ]);

        if (!mountedRef.current) return;

        // Klauseln verarbeiten
        if (parseResult.status === 'fulfilled' && parseResult.value.success) {
          setClauses(parseResult.value.clauses);
        } else {
          const errMsg = parseResult.status === 'rejected' ? parseResult.reason?.message : 'Parse fehlgeschlagen';
          setError(errMsg);
          return;
        }

        // Analysen verarbeiten
        if (analysesResult.status === 'fulfilled' && analysesResult.value.success) {
          setAnalysesMap(analysesResult.value.analyses);
          setIsComplete(analysesResult.value.isComplete);

          const stats = analysesResult.value.stats;
          setAnalysisProgress({
            completed: stats.completed,
            total: stats.total,
            percentage: stats.percentage
          });
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        }
      } finally {
        if (mountedRef.current) setIsLoadingClauses(false);
      }
    };

    loadData();
  }, [contractId, contract]);

  // 3. Batch-Analyse starten
  const startBatchAnalysis = useCallback((industry?: string) => {
    if (!contractId || isAnalyzing) return;

    setIsAnalyzing(true);

    // Vorherigen Stream abbrechen
    abortRef.current?.abort();

    abortRef.current = api.startBatchAnalysis(contractId, {
      industry,
      onStart: (data) => {
        if (!mountedRef.current) return;
        setAnalysisProgress({ completed: 0, total: data.totalClauses, percentage: 0 });
      },
      onProgress: (data) => {
        if (!mountedRef.current) return;

        // Analyse zur Map hinzufügen
        setAnalysesMap(prev => ({
          ...prev,
          [data.clauseId]: data.analysis
        }));

        setAnalysisProgress({
          completed: data.completed,
          total: data.total,
          percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
        });
      },
      onError: (data) => {
        if (!mountedRef.current) return;
        console.warn('[LegalLensV2] Analyse-Fehler:', data.error);
      },
      onComplete: (data) => {
        if (!mountedRef.current) return;
        setIsAnalyzing(false);
        setIsComplete(data.success);
      }
    });
  }, [contractId, isAnalyzing]);

  // 4. Klauseln neu parsen (Force-Refresh)
  const refreshClauses = useCallback(async () => {
    if (!contractId) return;
    setIsLoadingClauses(true);

    try {
      const result = await api.parseContract(contractId);
      if (mountedRef.current && result.success) {
        setClauses(result.clauses);
      }
    } catch (err) {
      console.error('[LegalLensV2] Refresh fehlgeschlagen:', err);
    } finally {
      if (mountedRef.current) setIsLoadingClauses(false);
    }
  }, [contractId]);

  // Stats berechnen
  const stats = useMemo(() => {
    const analyses = Object.values(analysesMap);
    return {
      high: analyses.filter(a => a.riskLevel === 'high').length,
      medium: analyses.filter(a => a.riskLevel === 'medium').length,
      low: analyses.filter(a => a.riskLevel === 'low').length,
      total: analyses.length
    };
  }, [analysesMap]);

  const overallRiskScore = useMemo(() => {
    const analyses = Object.values(analysesMap);
    if (analyses.length === 0) return 0;
    return Math.round(analyses.reduce((sum, a) => sum + (a.riskScore || 0), 0) / analyses.length);
  }, [analysesMap]);

  // Kritischste Klausel (höchster riskScore)
  const worstClause = useMemo(() => {
    if (clauses.length === 0 || Object.keys(analysesMap).length === 0) return null;
    let worst: { clauseId: string; title: string | null; riskScore: number; explanation: string } | null = null;
    for (const clause of clauses) {
      const analysis = analysesMap[clause.id];
      if (!analysis) continue;
      const score = analysis.riskScore || 0;
      if (!worst || score > worst.riskScore) {
        worst = {
          clauseId: clause.id,
          title: clause.title,
          riskScore: score,
          explanation: analysis.explanation
        };
      }
    }
    return worst;
  }, [clauses, analysesMap]);

  return {
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
    startBatchAnalysis,
    refreshClauses
  };
}

import { useCallback, useReducer, useRef } from 'react';
import type {
  PulseV2Result,
  PulseV2Status,
  PulseV2ProgressEvent,
  StageInfo,
} from '../types/pulseV2';

const API_BASE = '/api';

/** Safely extract string from contractType (may be string or object from DB) */
function safeStr(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    return (obj.displayName || obj.name || undefined) as string | undefined;
  }
  return undefined;
}

interface PartialFinding {
  clauseId: string;
  category: string;
  severity: string;
  type: string;
  title: string;
  description: string;
  legalBasis: string;
  affectedText: string;
  confidence: number;
  reasoning: string;
  isIntentional: boolean;
  enforceability?: string;
}

interface PartialClause {
  id: string;
  title: string;
  category: string;
  sectionNumber: string;
}

interface PulseV2Rejection {
  reason: string;
  rejectedAt?: string;
}

interface PulseV2State {
  status: PulseV2Status;
  progress: number;
  progressMessage: string;
  stages: StageInfo[];
  resultId: string | null;
  result: PulseV2Result | null;
  error: string | null;
  rejected: PulseV2Rejection | null;
  partialFindings: PartialFinding[];
  partialClauses: PartialClause[];
  contractMeta: { name?: string; type?: string } | null;
}

type PulseV2Action =
  | { type: 'START_ANALYSIS' }
  | { type: 'PROGRESS'; progress: number; message: string; stage?: number; stageName?: string; stageComplete?: boolean; stageError?: boolean }
  | { type: 'ADD_FINDINGS_BATCH'; findings: PartialFinding[]; clauses: PartialClause[] }
  | { type: 'SET_CONTRACT_META'; name?: string; contractType?: string }
  | { type: 'ANALYSIS_COMPLETE'; result: PulseV2Result; resultId: string }
  | { type: 'ANALYSIS_ERROR'; error: string }
  | { type: 'ANALYSIS_REJECTED'; rejection: PulseV2Rejection }
  | { type: 'SET_RESULT'; result: PulseV2Result }
  | { type: 'RESET' };

const INITIAL_STAGES: StageInfo[] = [
  { id: 1, name: 'Kontext sammeln', status: 'pending' },
  { id: 0, name: 'Dokument analysieren', status: 'pending' },
  { id: 2, name: 'Tiefenanalyse', status: 'pending' },
  { id: 3, name: 'Portfolio Intelligence', status: 'pending' },
  { id: 4, name: 'Handlungsempfehlungen', status: 'pending' },
  { id: 5, name: 'Score berechnen', status: 'pending' },
];

function reducer(state: PulseV2State, action: PulseV2Action): PulseV2State {
  switch (action.type) {
    case 'START_ANALYSIS':
      return {
        ...state,
        status: 'analyzing',
        progress: 0,
        progressMessage: 'Pipeline wird gestartet...',
        stages: INITIAL_STAGES.map(s => ({ ...s, status: 'pending' as const })),
        resultId: null,
        result: null,
        error: null,
        rejected: null,
        partialFindings: [],
        partialClauses: [],
        contractMeta: null,
      };

    case 'PROGRESS': {
      const stages = state.stages.map(s => {
        if (action.stage === undefined) return s;
        if (s.id === action.stage) {
          const status = action.stageError ? 'error' as const
            : action.stageComplete ? 'completed' as const
            : 'running' as const;
          return { ...s, status, detail: action.message };
        }
        // Mark earlier stages as completed
        const stageOrder = [1, 0, 2, 5];
        const currentIdx = stageOrder.indexOf(action.stage);
        const thisIdx = stageOrder.indexOf(s.id);
        if (thisIdx < currentIdx && s.status !== 'completed') {
          return { ...s, status: 'completed' as const };
        }
        return s;
      });

      return {
        ...state,
        progress: action.progress,
        progressMessage: action.message,
        stages,
      };
    }

    case 'ANALYSIS_COMPLETE':
      return {
        ...state,
        status: 'completed',
        progress: 100,
        progressMessage: 'Analyse abgeschlossen',
        stages: state.stages.map(s => ({ ...s, status: 'completed' as const })),
        resultId: action.resultId,
        result: action.result,
      };

    case 'ANALYSIS_ERROR':
      return {
        ...state,
        status: 'error',
        progress: 0,
        progressMessage: action.error,
        error: action.error,
      };

    case 'ANALYSIS_REJECTED':
      return {
        ...state,
        status: 'error',
        progress: 0,
        progressMessage: action.rejection.reason,
        rejected: action.rejection,
        error: null,
      };

    case 'SET_RESULT':
      return {
        ...state,
        status: 'completed',
        progress: 100,
        result: action.result,
        resultId: action.result._id,
      };

    case 'ADD_FINDINGS_BATCH':
      return {
        ...state,
        partialFindings: [...state.partialFindings, ...action.findings],
        partialClauses: [
          ...state.partialClauses,
          // Only add clauses we haven't seen yet
          ...action.clauses.filter(c => !state.partialClauses.some(pc => pc.id === c.id)),
        ],
      };

    case 'SET_CONTRACT_META':
      return {
        ...state,
        contractMeta: { name: action.name, type: safeStr(action.contractType) },
      };

    case 'RESET':
      return {
        status: 'idle',
        progress: 0,
        progressMessage: '',
        stages: INITIAL_STAGES.map(s => ({ ...s, status: 'pending' as const })),
        resultId: null,
        result: null,
        error: null,
        rejected: null,
        partialFindings: [],
        partialClauses: [],
        contractMeta: null,
      };

    default:
      return state;
  }
}

export function usePulseV2() {
  const [state, dispatch] = useReducer(reducer, {
    status: 'idle',
    progress: 0,
    progressMessage: '',
    stages: INITIAL_STAGES.map(s => ({ ...s, status: 'pending' as const })),
    resultId: null,
    result: null,
    error: null,
    rejected: null,
    partialFindings: [],
    partialClauses: [],
    contractMeta: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startAnalysis = useCallback(async (contractId: string, options?: { lenientMode?: boolean }) => {
    dispatch({ type: 'START_ANALYSIS' });

    abortControllerRef.current = new AbortController();

    // Optional override: when the user clicks "Trotzdem analysieren" / "Analyze anyway"
    // after a previous rejection, we append ?lenientMode=true so the backend bypasses
    // the document gate. Default behavior unchanged when option not provided.
    const url = options?.lenientMode
      ? `${API_BASE}/legal-pulse-v2/analyze/${contractId}?lenientMode=true`
      : `${API_BASE}/legal-pulse-v2/analyze/${contractId}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream nicht verfügbar');

      const decoder = new TextDecoder();
      let buffer = '';
      let contractMetaReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw: any = JSON.parse(line.slice(6));
            const event = raw as PulseV2ProgressEvent;

            if (event.error) {
              // Document-Gate: Stage 2 AI rejected the document as non-contract
              if (raw.rejectedNotContract) {
                dispatch({
                  type: 'ANALYSIS_REJECTED',
                  rejection: {
                    reason: raw.rejectionReason || event.message || 'Dokument ist kein Vertrag',
                  },
                });
                return;
              }
              dispatch({ type: 'ANALYSIS_ERROR', error: event.message });
              return;
            }

            if (event.complete && event.resultId) {
              // Fetch full result
              const res = await fetch(`${API_BASE}/legal-pulse-v2/results/${event.resultId}`, {
                credentials: 'include',
              });
              const data = await res.json();
              if (data.result) {
                dispatch({ type: 'ANALYSIS_COMPLETE', result: data.result, resultId: event.resultId });
              }
              return;
            }

            // Progressive Rendering: stream findings per batch
            if (raw.findingsBatch) {
              dispatch({
                type: 'ADD_FINDINGS_BATCH',
                findings: raw.findingsBatch,
                clauses: raw.clausesBatch || [],
              });
            }

            // Contract meta from early Stage 2
            if (raw.contractName && !contractMetaReceived) {
              contractMetaReceived = true;
              dispatch({
                type: 'SET_CONTRACT_META',
                name: raw.contractName,
                contractType: raw.contractType,
              });
            }

            dispatch({
              type: 'PROGRESS',
              progress: event.progress,
              message: event.message,
              stage: event.stage,
              stageName: event.stageName,
              stageComplete: event.complete,
              stageError: raw.stageError,
            });
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      dispatch({ type: 'ANALYSIS_ERROR', error: err instanceof Error ? err.message : 'Unbekannter Fehler' });
    }
  }, []);

  const cancelAnalysis = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: 'RESET' });
  }, []);

  const loadResult = useCallback(async (resultId: string) => {
    try {
      const res = await fetch(`${API_BASE}/legal-pulse-v2/results/${resultId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        console.error(`[usePulseV2] loadResult failed: ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.result) {
        dispatch({ type: 'SET_RESULT', result: data.result });
      }
    } catch (err) {
      console.error('[usePulseV2] loadResult error:', err);
    }
  }, []);

  const loadLatest = useCallback(async (contractId: string): Promise<PulseV2Result | null> => {
    try {
      const res = await fetch(`${API_BASE}/legal-pulse-v2/contract/${contractId}/latest`, {
        credentials: 'include',
      });
      if (!res.ok) {
        console.error(`[usePulseV2] loadLatest failed: ${res.status}`);
        return null;
      }
      const data = await res.json();
      if (data.result) {
        dispatch({ type: 'SET_RESULT', result: data.result });
        return data.result;
      }
      // Previous attempt was rejected as non-contract — surface it to the UI
      if (data.rejected) {
        dispatch({
          type: 'ANALYSIS_REJECTED',
          rejection: {
            reason: data.rejected.reason || 'Dokument ist kein Vertrag',
            rejectedAt: data.rejected.rejectedAt,
          },
        });
      }
      return null;
    } catch (err) {
      console.error('[usePulseV2] loadLatest error:', err);
      return null;
    }
  }, []);

  return {
    ...state,
    startAnalysis,
    cancelAnalysis,
    loadResult,
    loadLatest,
  };
}

import { useCallback, useReducer, useRef } from 'react';
import type {
  PulseV2Result,
  PulseV2Status,
  PulseV2ProgressEvent,
  StageInfo,
} from '../types/pulseV2';

const API_BASE = '/api';

interface PulseV2State {
  status: PulseV2Status;
  progress: number;
  progressMessage: string;
  stages: StageInfo[];
  resultId: string | null;
  result: PulseV2Result | null;
  error: string | null;
}

type PulseV2Action =
  | { type: 'START_ANALYSIS' }
  | { type: 'PROGRESS'; progress: number; message: string; stage?: number; stageName?: string; stageComplete?: boolean }
  | { type: 'ANALYSIS_COMPLETE'; result: PulseV2Result; resultId: string }
  | { type: 'ANALYSIS_ERROR'; error: string }
  | { type: 'SET_RESULT'; result: PulseV2Result }
  | { type: 'RESET' };

const INITIAL_STAGES: StageInfo[] = [
  { id: 1, name: 'Kontext sammeln', status: 'pending' },
  { id: 0, name: 'Dokument analysieren', status: 'pending' },
  { id: 2, name: 'Tiefenanalyse', status: 'pending' },
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
      };

    case 'PROGRESS': {
      const stages = state.stages.map(s => {
        if (action.stage === undefined) return s;
        if (s.id === action.stage) {
          return { ...s, status: action.stageComplete ? 'completed' as const : 'running' as const, detail: action.message };
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

    case 'SET_RESULT':
      return {
        ...state,
        status: 'completed',
        progress: 100,
        result: action.result,
        resultId: action.result._id,
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
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startAnalysis = useCallback(async (contractId: string) => {
    dispatch({ type: 'START_ANALYSIS' });

    abortControllerRef.current = new AbortController();
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE}/legal-pulse-v2/analyze/${contractId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: PulseV2ProgressEvent = JSON.parse(line.slice(6));

            if (event.error) {
              dispatch({ type: 'ANALYSIS_ERROR', error: event.message });
              return;
            }

            if (event.complete && event.resultId) {
              // Fetch full result
              const res = await fetch(`${API_BASE}/legal-pulse-v2/results/${event.resultId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (data.result) {
                dispatch({ type: 'ANALYSIS_COMPLETE', result: data.result, resultId: event.resultId });
              }
              return;
            }

            dispatch({
              type: 'PROGRESS',
              progress: event.progress,
              message: event.message,
              stage: event.stage,
              stageName: event.stageName,
              stageComplete: event.complete,
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
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/legal-pulse-v2/results/${resultId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.result) {
      dispatch({ type: 'SET_RESULT', result: data.result });
    }
  }, []);

  const loadLatest = useCallback(async (contractId: string): Promise<PulseV2Result | null> => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/legal-pulse-v2/contract/${contractId}/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.result) {
      dispatch({ type: 'SET_RESULT', result: data.result });
      return data.result;
    }
    return null;
  }, []);

  return {
    ...state,
    startAnalysis,
    cancelAnalysis,
    loadResult,
    loadLatest,
  };
}

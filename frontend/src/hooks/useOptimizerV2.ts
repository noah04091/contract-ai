import { useReducer, useCallback, useRef } from 'react';
import { apiCall } from '../utils/api';
import type {
  OptimizerV2State,
  AnalysisResult,
  OptimizationMode,
  ActiveTab,
  UserSelection,
  ChatMessage,
  ProgressEvent,
  StageInfo,
  ClauseChatResponse
} from '../types/optimizerV2';

// ── Pipeline Stage Definitions ──
const PIPELINE_STAGES: StageInfo[] = [
  { number: 1, name: 'Vertragsstruktur', description: 'Vertragstyp, Parteien und Jurisdiktion erkennen', status: 'pending' },
  { number: 2, name: 'Klauselextraktion', description: 'Vertrag in einzelne Klauseln zerlegen', status: 'pending' },
  { number: 3, name: 'Tiefenanalyse', description: 'Jede Klausel juristisch analysieren', status: 'pending' },
  { number: 4, name: 'Optimierung', description: 'Optimierte Klauseln in 3 Versionen generieren', status: 'pending' },
  { number: 5, name: 'Scoring', description: 'Vertrags-Scores berechnen', status: 'pending' }
];

// ── Initial State ──
const initialState: OptimizerV2State = {
  file: null,
  status: 'idle',
  currentStage: 0,
  progress: 0,
  progressMessage: '',
  stages: PIPELINE_STAGES.map(s => ({ ...s })),
  resultId: null,
  result: null,
  activeMode: 'neutral',
  activeTab: 'overview',
  selectedClauseId: null,
  userSelections: new Map(),
  clauseChats: new Map(),
  error: null
};

// ── Action Types ──
type Action =
  | { type: 'SET_FILE'; file: File | null }
  | { type: 'START_ANALYSIS' }
  | { type: 'PROGRESS'; progress: number; message: string; stage?: number }
  | { type: 'STAGE_COMPLETE'; stage: number }
  | { type: 'ANALYSIS_COMPLETE'; result: AnalysisResult; resultId: string }
  | { type: 'ANALYSIS_ERROR'; error: string }
  | { type: 'SET_MODE'; mode: OptimizationMode }
  | { type: 'SET_TAB'; tab: ActiveTab }
  | { type: 'SELECT_CLAUSE'; clauseId: string | null }
  | { type: 'SET_SELECTION'; clauseId: string; selection: UserSelection }
  | { type: 'ADD_CHAT_MESSAGE'; clauseId: string; messages: ChatMessage[] }
  | { type: 'LOAD_RESULT'; result: AnalysisResult; resultId: string }
  | { type: 'RESET' };

// ── Reducer ──
function reducer(state: OptimizerV2State, action: Action): OptimizerV2State {
  switch (action.type) {
    case 'SET_FILE':
      return { ...state, file: action.file, error: null };

    case 'START_ANALYSIS':
      return {
        ...state,
        status: 'analyzing',
        progress: 0,
        progressMessage: 'Analyse wird gestartet...',
        currentStage: 0,
        stages: PIPELINE_STAGES.map(s => ({ ...s, status: 'pending' })),
        result: null,
        resultId: null,
        error: null,
        userSelections: new Map(),
        clauseChats: new Map()
      };

    case 'PROGRESS': {
      const stages = state.stages.map(s => {
        if (action.stage !== undefined) {
          if (s.number < action.stage) return { ...s, status: 'completed' as const };
          if (s.number === action.stage) return { ...s, status: 'running' as const };
        }
        return s;
      });
      return {
        ...state,
        progress: action.progress,
        progressMessage: action.message,
        currentStage: action.stage ?? state.currentStage,
        stages
      };
    }

    case 'STAGE_COMPLETE':
      return {
        ...state,
        stages: state.stages.map(s =>
          s.number === action.stage ? { ...s, status: 'completed' } : s
        )
      };

    case 'ANALYSIS_COMPLETE':
      return {
        ...state,
        status: 'completed',
        progress: 100,
        progressMessage: 'Analyse abgeschlossen!',
        result: action.result,
        resultId: action.resultId,
        stages: state.stages.map(s => ({ ...s, status: 'completed' as const })),
        activeTab: 'overview'
      };

    case 'ANALYSIS_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.error,
        stages: state.stages.map(s =>
          s.status === 'running' ? { ...s, status: 'error' } : s
        )
      };

    case 'SET_MODE':
      return { ...state, activeMode: action.mode };

    case 'SET_TAB':
      return { ...state, activeTab: action.tab };

    case 'SELECT_CLAUSE':
      return { ...state, selectedClauseId: action.clauseId };

    case 'SET_SELECTION': {
      const newSelections = new Map(state.userSelections);
      newSelections.set(action.clauseId, action.selection);
      return { ...state, userSelections: newSelections };
    }

    case 'ADD_CHAT_MESSAGE': {
      const newChats = new Map(state.clauseChats);
      const existing = newChats.get(action.clauseId) || [];
      newChats.set(action.clauseId, [...existing, ...action.messages]);
      return { ...state, clauseChats: newChats };
    }

    case 'LOAD_RESULT': {
      // Restore userSelections from backend result if available
      const loadedSelections = new Map<string, UserSelection>();
      if (action.result.userSelections) {
        for (const sel of action.result.userSelections) {
          loadedSelections.set(sel.clauseId, sel);
        }
      }
      return {
        ...state,
        status: 'completed',
        progress: 100,
        result: action.result,
        resultId: action.resultId,
        stages: PIPELINE_STAGES.map(s => ({ ...s, status: 'completed' as const })),
        activeTab: 'overview',
        userSelections: loadedSelections
      };
    }

    case 'RESET':
      return { ...initialState, stages: PIPELINE_STAGES.map(s => ({ ...s })) };

    default:
      return state;
  }
}

// ── Hook ──
export function useOptimizerV2() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // API base URL
  const getApiBase = () => {
    const custom = import.meta.env?.VITE_API_URL;
    if (custom) return custom as string;
    if (window.location.hostname === 'localhost') return '';
    return 'https://api.contract-ai.de';
  };

  // ── Start Analysis ──
  const startAnalysis = useCallback(async (file: File, perspective: string = 'neutral') => {
    dispatch({ type: 'START_ANALYSIS' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('perspective', perspective);

    abortControllerRef.current = new AbortController();
    const token = localStorage.getItem('token');
    const apiBase = getApiBase();
    let lastResultId: string | null = null;

    try {
      const response = await fetch(`${apiBase}/api/optimizer-v2/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming nicht verfügbar');

      const decoder = new TextDecoder();
      let buffer = '';

      let streamCompleted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: ProgressEvent = JSON.parse(line.slice(6));

            if (event.error) {
              dispatch({ type: 'ANALYSIS_ERROR', error: event.message });
              streamCompleted = true;
              return;
            }

            if (event.resultId) lastResultId = event.resultId;

            if (event.complete && event.resultId) {
              // SSE complete event only contains resultId — fetch full result
              try {
                const data = await apiCall(`/optimizer-v2/results/${event.resultId}`) as { success?: boolean; result?: AnalysisResult };
                if (data?.success && data?.result) {
                  dispatch({
                    type: 'ANALYSIS_COMPLETE',
                    result: data.result,
                    resultId: event.resultId
                  });
                } else {
                  dispatch({ type: 'ANALYSIS_ERROR', error: 'Ergebnis konnte nicht geladen werden.' });
                }
              } catch {
                dispatch({ type: 'ANALYSIS_ERROR', error: 'Ergebnis konnte nicht geladen werden.' });
              }
              streamCompleted = true;
              return;
            }

            // Regular progress update
            dispatch({
              type: 'PROGRESS',
              progress: event.progress,
              message: event.message,
              stage: event.stage
            });

            // Stage complete events
            if (event.stage && event.complete) {
              dispatch({ type: 'STAGE_COMPLETE', stage: event.stage });
            }

          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      // Stream ended without completion — try to recover result
      if (!streamCompleted && lastResultId) {
        dispatch({ type: 'PROGRESS', progress: 95, message: 'Verbindung unterbrochen — versuche Ergebnis zu laden...' });
        try {
          const data = await apiCall(`/optimizer-v2/results/${lastResultId}`) as { success?: boolean; result?: AnalysisResult };
          if (data?.success && data?.result && data.result.status === 'completed') {
            dispatch({ type: 'ANALYSIS_COMPLETE', result: data.result, resultId: lastResultId });
            return;
          }
        } catch { /* ignore */ }
        dispatch({ type: 'ANALYSIS_ERROR', error: 'Verbindung zum Server wurde unterbrochen. Die Analyse läuft möglicherweise noch — bitte lade die Seite neu.' });
      } else if (!streamCompleted) {
        dispatch({ type: 'ANALYSIS_ERROR', error: 'Verbindung zum Server wurde unerwartet beendet. Bitte versuche es erneut.' });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;

      // If we have a resultId, the backend may still be processing — poll for result
      if (lastResultId) {
        dispatch({ type: 'PROGRESS', progress: 90, message: 'Verbindung unterbrochen — warte auf Ergebnis...' });
        // Poll up to 3 minutes (18 attempts × 10s) for the backend to finish
        for (let attempt = 0; attempt < 18; attempt++) {
          await new Promise(r => setTimeout(r, 10000));
          try {
            const data = await apiCall(`/optimizer-v2/results/${lastResultId}`) as { success?: boolean; result?: AnalysisResult };
            if (data?.success && data?.result) {
              if (data.result.status === 'completed') {
                dispatch({ type: 'ANALYSIS_COMPLETE', result: data.result, resultId: lastResultId });
                return;
              }
              if (data.result.status === 'failed') {
                dispatch({ type: 'ANALYSIS_ERROR', error: 'Analyse fehlgeschlagen. Bitte versuche es erneut.' });
                return;
              }
              // Still running — update progress
              dispatch({ type: 'PROGRESS', progress: 90 + attempt, message: `Analyse läuft noch (Stage ${(data.result as Record<string, unknown>).currentStage || '?'})...` });
            }
          } catch { /* ignore poll errors, keep trying */ }
        }
        dispatch({ type: 'ANALYSIS_ERROR', error: 'Verbindung unterbrochen. Die Analyse läuft möglicherweise noch — bitte lade die Seite neu.' });
        return;
      }

      // No resultId — genuine connection error
      let message = 'Analyse fehlgeschlagen. Bitte versuche es erneut.';
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes('failed to fetch') || errMsg.includes('network')) {
          message = 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.';
        } else if (errMsg.includes('http 4')) {
          message = 'Sitzung abgelaufen — bitte melde dich erneut an.';
        } else if (errMsg.includes('streaming')) {
          message = 'Echtzeitverbindung konnte nicht hergestellt werden. Bitte versuche es erneut.';
        }
      }
      dispatch({ type: 'ANALYSIS_ERROR', error: message });
    }
  }, []);

  // ── Cancel Analysis ──
  const cancelAnalysis = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: 'RESET' });
  }, []);

  // ── Load Result ──
  const loadResult = useCallback(async (resultId: string) => {
    try {
      const data = await apiCall(`/optimizer-v2/results/${resultId}`) as { success?: boolean; result?: AnalysisResult };
      if (data?.success && data?.result) {
        dispatch({ type: 'LOAD_RESULT', result: data.result, resultId });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Laden fehlgeschlagen';
      dispatch({ type: 'ANALYSIS_ERROR', error: message });
    }
  }, []);

  // ── Switch Mode ──
  const switchMode = useCallback(async (mode: OptimizationMode) => {
    dispatch({ type: 'SET_MODE', mode });
    if (state.resultId) {
      try {
        await apiCall(`/optimizer-v2/results/${state.resultId}/mode`, {
          method: 'PATCH',
          body: JSON.stringify({ mode }),
          headers: { 'Content-Type': 'application/json' }
        });
      } catch {
        console.warn('[OptimizerV2] Mode sync failed — local change preserved');
      }
    }
  }, [state.resultId]);

  // ── Save Selection ──
  const saveSelection = useCallback(async (clauseId: string, selectedVersion: UserSelection['selectedVersion'], customText?: string): Promise<boolean> => {
    const selection: UserSelection = { clauseId, selectedVersion, customText };
    dispatch({ type: 'SET_SELECTION', clauseId, selection });

    if (state.resultId) {
      const allSelections = new Map(state.userSelections);
      allSelections.set(clauseId, selection);
      try {
        await apiCall(`/optimizer-v2/results/${state.resultId}/selections`, {
          method: 'PATCH',
          body: JSON.stringify({ selections: Array.from(allSelections.values()) }),
          headers: { 'Content-Type': 'application/json' }
        });
        return true;
      } catch {
        console.warn('[OptimizerV2] Selection sync failed — local change preserved');
        return false;
      }
    }
    return true;
  }, [state.resultId, state.userSelections]);

  // ── Clause Chat ──
  const sendClauseChat = useCallback(async (clauseId: string, message: string): Promise<ClauseChatResponse | null> => {
    if (!state.resultId) return null;

    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      clauseId,
      messages: [{ role: 'user', content: message, timestamp: new Date().toISOString() }]
    });

    try {
      const data = await apiCall(`/optimizer-v2/results/${state.resultId}/clause-chat`, {
        method: 'POST',
        body: JSON.stringify({ clauseId, message }),
        headers: { 'Content-Type': 'application/json' }
      }) as ClauseChatResponse;

      if (data?.success) {
        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          clauseId,
          messages: [{
            role: 'assistant',
            content: data.response,
            timestamp: new Date().toISOString(),
            generatedVersion: data.generatedVersion
          }]
        });
        return data;
      }
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        clauseId,
        messages: [{ role: 'assistant', content: 'Entschuldigung, die Antwort konnte nicht generiert werden. Bitte versuche es erneut.', timestamp: new Date().toISOString() }]
      });
      return null;
    } catch {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        clauseId,
        messages: [{ role: 'assistant', content: 'Verbindungsfehler — bitte versuche es erneut.', timestamp: new Date().toISOString() }]
      });
      return null;
    }
  }, [state.resultId]);

  // ── Set Tab ──
  const setTab = useCallback((tab: ActiveTab) => {
    dispatch({ type: 'SET_TAB', tab });
  }, []);

  // ── Select Clause ──
  const selectClause = useCallback((clauseId: string | null) => {
    dispatch({ type: 'SELECT_CLAUSE', clauseId });
  }, []);

  // ── Set File ──
  const setFile = useCallback((file: File | null) => {
    dispatch({ type: 'SET_FILE', file });
  }, []);

  // ── Reset ──
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    actions: {
      setFile,
      startAnalysis,
      cancelAnalysis,
      loadResult,
      switchMode,
      saveSelection,
      sendClauseChat,
      setTab,
      selectClause,
      reset
    }
  };
}

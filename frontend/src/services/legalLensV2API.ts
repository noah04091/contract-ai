/**
 * Legal Lens V2 — API Service
 *
 * API-Calls für den interaktiven Vertrags-Explorer.
 * Nutzt bestehende v1-Parse-API + neue v2-Analyse-Endpoints.
 */

import { fetchWithAuth, API_BASE_URL } from '../context/authUtils';
import type {
  AnalysesResponse,
  StatusResponse,
  SSEProgressEvent,
  SSEStartEvent,
  SSECompleteEvent,
  ParsedClauseV2,
  ClauseSimulation
} from '../types/legalLensV2';

const V2_BASE = `${API_BASE_URL}/legal-lens/v2`;
const V1_BASE = `${API_BASE_URL}/legal-lens`;

// ============================================================
// V1 Parse API (wiederverwendet)
// ============================================================

/**
 * Parst einen Vertrag in Klauseln (nutzt bestehende v1-API)
 */
export async function parseContract(contractId: string): Promise<{
  success: boolean;
  clauses: ParsedClauseV2[];
  totalClauses: number;
  riskSummary: { high: number; medium: number; low: number };
}> {
  const response = await fetchWithAuth(`${V1_BASE}/parse`, {
    method: 'POST',
    body: JSON.stringify({ contractId })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Parse fehlgeschlagen' }));
    throw new Error(error.error || `Parse fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

// ============================================================
// V2 Analyse API
// ============================================================

/**
 * Lädt alle vorberechneten V2-Analysen für einen Vertrag
 */
export async function getAnalyses(contractId: string): Promise<AnalysesResponse> {
  const response = await fetchWithAuth(`${V2_BASE}/${contractId}/analyses`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Laden fehlgeschlagen' }));
    throw new Error(error.error || `Analysen laden fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

/**
 * Lädt den Batch-Analyse-Status
 */
export async function getStatus(contractId: string): Promise<StatusResponse> {
  const response = await fetchWithAuth(`${V2_BASE}/${contractId}/status`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Status laden fehlgeschlagen' }));
    throw new Error(error.error || `Status laden fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

/**
 * Startet die Batch-Analyse aller Klauseln via SSE
 *
 * @param contractId - Vertrag-ID
 * @param options - { industry, onStart, onProgress, onError, onComplete }
 * @returns AbortController zum Abbrechen des Streams
 */
export function startBatchAnalysis(
  contractId: string,
  options: {
    industry?: string;
    onStart?: (data: SSEStartEvent) => void;
    onProgress?: (data: SSEProgressEvent) => void;
    onError?: (data: { clauseId?: string; error: string }) => void;
    onComplete?: (data: SSECompleteEvent) => void;
  }
): AbortController {
  const controller = new AbortController();
  const token = localStorage.getItem('token');

  // POST mit SSE — nutzt fetch mit ReadableStream
  fetch(`${V2_BASE}/${contractId}/analyze-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ industry: options.industry || 'general' }),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Batch-Analyse fehlgeschlagen' }));
        options.onError?.({ error: error.error || `Fehler: ${response.status}` });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        options.onError?.({ error: 'Stream nicht verfügbar' });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE-Events parsen
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Letzte unvollständige Zeile behalten

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.substring(6);
          } else if (line === '' && currentEvent && currentData) {
            // Event komplett — verarbeiten
            try {
              const data = JSON.parse(currentData);

              switch (currentEvent) {
                case 'start':
                  options.onStart?.(data as SSEStartEvent);
                  break;
                case 'progress':
                  options.onProgress?.(data as SSEProgressEvent);
                  break;
                case 'error':
                  options.onError?.(data);
                  break;
                case 'complete':
                  options.onComplete?.(data as SSECompleteEvent);
                  break;
              }
            } catch (parseError) {
              console.warn('[LegalLensV2] SSE parse error:', parseError);
            }

            currentEvent = '';
            currentData = '';
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        options.onError?.({ error: error.message || 'Netzwerkfehler' });
      }
    });

  return controller;
}

// ============================================================
// Clause Simulation
// ============================================================

/**
 * Simuliert die Auswirkungen einer Klausel-Änderung
 */
export async function simulateClause(
  contractId: string,
  originalClause: string,
  modifiedClause: string,
  industry?: string
): Promise<{ success: boolean; simulation: ClauseSimulation }> {
  const response = await fetchWithAuth(`${V2_BASE}/${contractId}/simulate-clause`, {
    method: 'POST',
    body: JSON.stringify({ originalClause, modifiedClause, industry })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Simulation fehlgeschlagen' }));
    throw new Error(error.error || `Simulation fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

// ============================================================
// V1 Deep-Dive & Chat API (wiederverwendet)
// ============================================================

/**
 * Volle 4-Perspektiven-Analyse einer einzelnen Klausel (v1-API)
 */
export async function analyzeClauseDeep(
  contractId: string,
  clauseId: string,
  clauseText: string,
  perspective: string = 'neutral'
): Promise<{ success: boolean; analysis: Record<string, unknown> }> {
  const response = await fetchWithAuth(
    `${V1_BASE}/${contractId}/clause/${clauseId}/analyze`,
    {
      method: 'POST',
      body: JSON.stringify({ clauseText, perspective })
    }
  );

  if (!response.ok) {
    throw new Error(`Analyse fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

/**
 * Chat über eine bestimmte Klausel (v1-API)
 */
export async function chatAboutClause(
  contractId: string,
  clauseId: string,
  message: string,
  clauseText: string
): Promise<{ success: boolean; response: string }> {
  const resp = await fetchWithAuth(
    `${V1_BASE}/${contractId}/clause/${clauseId}/chat`,
    {
      method: 'POST',
      body: JSON.stringify({ message, clauseText })
    }
  );

  if (!resp.ok) {
    throw new Error(`Chat fehlgeschlagen: ${resp.status}`);
  }

  return resp.json();
}

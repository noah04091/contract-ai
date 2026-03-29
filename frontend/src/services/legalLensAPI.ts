// 📡 legalLensAPI.ts - API Service für Legal Lens Feature
import { fetchWithAuth, API_BASE_URL } from '../context/authUtils';
import type {
  ParseContractResponse,
  ParsedClause,
  AnalyzeClauseResponse,
  GetPerspectivesResponse,
  GenerateAlternativesResponse,
  GenerateNegotiationResponse,
  ChatResponse,
  ProgressResponse,
  SummaryResponse,
  PerspectiveType,
  IndustryType,
  NegotiationChecklistResponse,
  LegalLensProgress,
  Note,
  Bookmark,
  ReportDesign,
  ReportSection,
  ReportDesignInfo,
  ReportSectionInfo
} from '../types/legalLens';

const LEGAL_LENS_BASE = `${API_BASE_URL}/legal-lens`;

/**
 * fetchWithAuth mit automatischem Timeout (Standard: 35s)
 * Verhindert, dass API-Calls endlos hängen bleiben.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 35000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchWithAuth(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Vertrag in Klauseln parsen
 */
export async function parseContract(
  contractId: string,
  options?: {
    includeSubSentences?: boolean;
    preserveFormatting?: boolean;
    forceRefresh?: boolean; // Force Cache-Invalidierung
  }
): Promise<ParseContractResponse> {
  const response = await fetchWithTimeout(`${LEGAL_LENS_BASE}/parse`, {
    method: 'POST',
    body: JSON.stringify({
      contractId,
      ...options
    })
  }, 60000);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Parsen des Vertrags');
  }

  return response.json();
}

/**
 * Einzelne Klausel analysieren
 */
export async function analyzeClause(
  contractId: string,
  clauseId: string,
  clauseText: string,
  perspective: PerspectiveType = 'contractor',
  stream: boolean = false
): Promise<AnalyzeClauseResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetchWithAuth(
      `${LEGAL_LENS_BASE}/${contractId}/clause/${clauseId}/analyze`,
      {
        method: 'POST',
        body: JSON.stringify({
          clauseText,
          perspective,
          stream
        }),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler bei der Klausel-Analyse');
    }

    return response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Die Analyse hat zu lange gedauert. Bitte versuchen Sie es erneut.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Streaming-Analyse einer Klausel (SSE)
 */
export function analyzeClauseStreaming(
  contractId: string,
  clauseId: string,
  clauseText: string,
  perspective: PerspectiveType,
  onChunk: (chunk: string) => void,
  onComplete: (analysis: AnalyzeClauseResponse) => void,
  onError: (error: Error) => void
): () => void {
  const controller = new AbortController();
  let completed = false;

  // 35s Timeout — wenn keine Antwort kommt, abbrechen
  const timeoutId = setTimeout(() => {
    if (!completed) {
      controller.abort();
      onError(new Error('Die Analyse hat zu lange gedauert (> 35s). Bitte versuchen Sie es erneut.'));
    }
  }, 35000);

  const token = localStorage.getItem('token');

  fetch(`${LEGAL_LENS_BASE}/${contractId}/clause/${clauseId}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    credentials: 'include',
    body: JSON.stringify({
      clauseText,
      perspective,
      stream: true
    }),
    signal: controller.signal
  })
    .then(async response => {
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Streaming-Fehler');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Kein Reader verfügbar');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              } else if (parsed.analysis) {
                completed = true;
                clearTimeout(timeoutId);
                onComplete(parsed);
              }
            } catch {
              // Ignoriere Parse-Fehler bei unvollständigen Chunks
            }
          }
        }
      }
    })
    .catch(error => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });

  return () => {
    completed = true;
    clearTimeout(timeoutId);
    controller.abort();
  };
}

/**
 * Alle Perspektiven für eine Klausel abrufen
 */
export async function getAllPerspectives(
  contractId: string,
  clauseId: string
): Promise<GetPerspectivesResponse> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/clause/${clauseId}/perspectives`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Perspektiven');
  }

  return response.json();
}

/**
 * Alternative Formulierungen generieren
 */
export async function generateAlternatives(
  contractId: string,
  clauseId: string,
  clauseText: string,
  perspective: PerspectiveType = 'contractor'
): Promise<GenerateAlternativesResponse> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/clause/${clauseId}/alternatives`,
    {
      method: 'POST',
      body: JSON.stringify({
        clauseText,
        perspective
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Generieren der Alternativen');
  }

  return response.json();
}

/**
 * Verhandlungstipps generieren
 */
export async function generateNegotiationTips(
  contractId: string,
  clauseId: string,
  clauseText: string,
  perspective: PerspectiveType = 'contractor'
): Promise<GenerateNegotiationResponse> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/clause/${clauseId}/negotiation`,
    {
      method: 'POST',
      body: JSON.stringify({
        clauseText,
        perspective
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Generieren der Verhandlungstipps');
  }

  return response.json();
}

/**
 * Chat über eine Klausel
 */
export async function chatAboutClause(
  contractId: string,
  clauseId: string,
  message: string,
  clauseText: string,
  perspective: PerspectiveType = 'contractor'
): Promise<ChatResponse> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/clause/${clauseId}/chat`,
    {
      method: 'POST',
      body: JSON.stringify({
        message,
        clauseText,
        perspective
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler bei der Chat-Anfrage');
  }

  return response.json();
}

/**
 * Fortschritt abrufen
 */
export async function getProgress(
  contractId: string
): Promise<ProgressResponse> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/progress`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden des Fortschritts');
  }

  return response.json();
}

/**
 * Fortschritt aktualisieren
 */
export async function updateProgress(
  contractId: string,
  updates: Partial<Pick<LegalLensProgress,
    'reviewedClauses' | 'lastViewedClause' | 'currentPerspective' |
    'scrollPosition' | 'status'
  >>
): Promise<ProgressResponse> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/progress`,
    {
      method: 'POST',
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Aktualisieren des Fortschritts');
  }

  return response.json();
}

/**
 * Notiz hinzufügen
 */
export async function addNote(
  contractId: string,
  clauseId: string,
  content: string
): Promise<{ success: boolean; note: Note }> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/note`,
    {
      method: 'POST',
      body: JSON.stringify({
        clauseId,
        content
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Speichern der Notiz');
  }

  return response.json();
}

/**
 * Bookmark hinzufügen/entfernen
 */
export async function toggleBookmark(
  contractId: string,
  clauseId: string,
  label?: string,
  color?: string
): Promise<{ success: boolean; action: 'added' | 'removed'; bookmark?: Bookmark }> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/bookmark`,
    {
      method: 'POST',
      body: JSON.stringify({
        clauseId,
        label,
        color
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Bookmark');
  }

  return response.json();
}

/**
 * Verfügbare Perspektiven abrufen
 */
export async function getAvailablePerspectives(): Promise<{
  success: boolean;
  perspectives: Array<{
    id: PerspectiveType;
    name: string;
    description: string;
  }>;
}> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/perspectives`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Perspektiven');
  }

  return response.json();
}

/**
 * Zusammenfassung der Analyse abrufen
 */
export async function getAnalysisSummary(
  contractId: string
): Promise<SummaryResponse> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/summary`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Zusammenfassung');
  }

  return response.json();
}

// ============================================
// INDUSTRY CONTEXT API
// ============================================

/**
 * Verfügbare Branchen abrufen
 */
export async function getAvailableIndustries(): Promise<{
  success: boolean;
  industries: Array<{
    id: IndustryType;
    name: string;
  }>;
}> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/industries`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Branchen');
  }

  return response.json();
}

/**
 * Branchen-Kontext für einen Vertrag setzen
 */
export async function setIndustryContext(
  contractId: string,
  industry: IndustryType
): Promise<{
  success: boolean;
  industry: IndustryType;
  industrySetAt: string;
  message: string;
}> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/industry`,
    {
      method: 'POST',
      body: JSON.stringify({ industry })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Setzen der Branche');
  }

  return response.json();
}

/**
 * Branchen-Kontext für einen Vertrag abrufen
 */
export async function getIndustryContext(
  contractId: string
): Promise<{
  success: boolean;
  industry: IndustryType;
  industrySetAt: string | null;
  autoDetected?: boolean;
  confidence?: number;
  detectedKeywords?: string[];
}> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/industry`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Branche');
  }

  return response.json();
}

// ============================================
// NEGOTIATION CHECKLIST API
// ============================================

/**
 * Verhandlungs-Checkliste generieren
 */
export async function generateNegotiationChecklist(
  contractId: string,
  perspective: PerspectiveType = 'contractor'
): Promise<NegotiationChecklistResponse> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/negotiation-checklist`,
    {
      method: 'POST',
      body: JSON.stringify({ perspective })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Generieren der Verhandlungs-Checkliste');
  }

  return response.json();
}

/**
 * Checkliste als PDF exportieren
 */
export async function exportChecklistPdf(
  contractId: string,
  perspective: PerspectiveType = 'contractor'
): Promise<Blob> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/${contractId}/checklist-pdf`,
    {
      method: 'POST',
      body: JSON.stringify({ perspective })
    },
    60000
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Exportieren der Checkliste');
  }

  return response.blob();
}

// ============================================
// EXPORT REPORT API
// ============================================

/**
 * Verfügbare Export-Designs abrufen
 */
export async function getExportDesigns(): Promise<{
  success: boolean;
  designs: ReportDesignInfo[];
}> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/export/designs`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Export-Designs');
  }

  return response.json();
}

/**
 * Verfügbare Export-Sektionen abrufen
 */
export async function getExportSections(): Promise<{
  success: boolean;
  sections: ReportSectionInfo[];
}> {
  const response = await fetchWithTimeout(
    `${LEGAL_LENS_BASE}/export/sections`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Export-Sektionen');
  }

  return response.json();
}

/**
 * Analyse-Report als PDF exportieren
 * Gibt einen Blob zurück, der direkt heruntergeladen werden kann
 */
export async function exportAnalysisReport(
  contractId: string,
  design: ReportDesign = 'executive',
  includeSections: ReportSection[] = ['summary', 'criticalClauses']
): Promise<Blob> {
  const token = localStorage.getItem('token');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch(
      `${LEGAL_LENS_BASE}/${contractId}/export-report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({ design, includeSections }),
        signal: controller.signal
      }
    );
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Der Report-Export hat zu lange gedauert. Bitte versuchen Sie es erneut.');
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    // Versuche JSON-Fehlermeldung zu lesen
    try {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Exportieren des Reports');
    } catch {
      throw new Error('Fehler beim Exportieren des Reports');
    }
  }

  return response.blob();
}

/**
 * Hilfsfunktion: PDF-Blob herunterladen
 */
export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// ============================================
// STREAMING PARSE API (SSE)
// ============================================

export interface StreamingParseCallbacks {
  onStatus?: (message: string, progress: number) => void;
  onClausesBatch?: (clauses: ParsedClause[], totalSoFar: number) => void;
  onComplete?: (totalClauses: number, riskSummary: { high: number; medium: number; low: number }) => void;
  onError?: (error: string) => void;
  /** Phase 5: Callback bei Verbindungsverlust */
  onConnectionLost?: (info: {
    clausesReceived: number;
    progress: number;
    retryCount: number;
    willRetry: boolean;
  }) => void;
  /** Phase 5: Callback bei Retry-Versuch */
  onRetrying?: (attempt: number, maxAttempts: number) => void;
}

/**
 * Streaming-Parse für Klauseln (SSE)
 * Verwendet Server-Sent Events für Live-Updates
 *
 * Phase 5: Mit Connection-Loss-Erkennung und Auto-Retry
 *
 * @param forceRefresh - Force Cache-Invalidierung
 * @returns Cleanup-Funktion zum Abbrechen
 */
export function parseContractStreaming(
  contractId: string,
  callbacks: StreamingParseCallbacks,
  forceRefresh: boolean = false
): () => void {
  const token = localStorage.getItem('token');
  const controller = new AbortController();

  // Phase 5: Retry-Konfiguration
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1000; // Exponential backoff: 1s, 2s, 4s

  // Phase 5: Fortschritts-Tracking für Resume
  let clausesReceived = 0;
  let lastProgress = 0;
  let isComplete = false;
  let retryCount = 0;
  let isAborted = false;

  // URL mit optionalem forceRefresh Query-Parameter
  const getUrl = () => forceRefresh
    ? `${LEGAL_LENS_BASE}/${contractId}/parse-stream?forceRefresh=true`
    : `${LEGAL_LENS_BASE}/${contractId}/parse-stream`;

  /**
   * Führt den Streaming-Request aus (mit Retry-Logik)
   */
  const executeStream = async () => {
    if (isAborted) return;

    try {
      const response = await fetch(getUrl(), {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Streaming-Verbindung fehlgeschlagen');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Kein Reader verfügbar');

      const decoder = new TextDecoder();
      let buffer = '';

      // Bei erfolgreichem Connect: Retry-Counter zurücksetzen
      retryCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);

            // Event verarbeiten
            if (currentEvent && currentData) {
              try {
                const data = JSON.parse(currentData);

                switch (currentEvent) {
                  case 'status':
                    lastProgress = data.progress || lastProgress;
                    callbacks.onStatus?.(data.message, data.progress);
                    break;
                  case 'clauses_batch':
                    clausesReceived = data.totalSoFar || clausesReceived;
                    callbacks.onClausesBatch?.(data.newClauses, data.totalSoFar);
                    break;
                  case 'clauses':
                    // Alle Klauseln auf einmal (cached)
                    clausesReceived = data.totalClauses || clausesReceived;
                    callbacks.onClausesBatch?.(data.clauses, data.totalClauses);
                    break;
                  case 'complete':
                    isComplete = true;
                    callbacks.onComplete?.(data.totalClauses, data.riskSummary);
                    break;
                  case 'error':
                    callbacks.onError?.(data.error);
                    break;
                  case 'warning':
                    console.warn('[Legal Lens Stream]', data.message);
                    break;
                }
              } catch {
                // Ignoriere Parse-Fehler bei unvollständigen Chunks
              }
            }
          } else if (line === '') {
            // Leere Zeile = Event Ende, reset
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (error) {
      // Abbruch durch User? → Kein Retry
      if (isAborted || (error instanceof Error && error.name === 'AbortError')) {
        console.log('[Legal Lens] Streaming abgebrochen durch User');
        return;
      }

      // Bereits complete? → Kein Retry nötig
      if (isComplete) {
        return;
      }

      // Phase 5: Verbindungsverlust-Erkennung
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConnectionLost =
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout');

      console.warn(`[Legal Lens] Streaming-Fehler: ${errorMessage} (Retry ${retryCount}/${MAX_RETRIES})`);

      // Callback für Verbindungsverlust
      const willRetry = retryCount < MAX_RETRIES && isConnectionLost;
      callbacks.onConnectionLost?.({
        clausesReceived,
        progress: lastProgress,
        retryCount,
        willRetry
      });

      // Retry bei Verbindungsverlust (mit exponential backoff)
      if (willRetry) {
        retryCount++;
        const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
        console.log(`[Legal Lens] Retry in ${delay}ms (Attempt ${retryCount}/${MAX_RETRIES})`);

        callbacks.onRetrying?.(retryCount, MAX_RETRIES);

        await new Promise(resolve => setTimeout(resolve, delay));

        if (!isAborted) {
          executeStream(); // Rekursiver Retry
        }
      } else {
        // Kein Retry mehr möglich
        callbacks.onError?.(isConnectionLost
          ? `Verbindung verloren nach ${MAX_RETRIES} Versuchen. Bitte prüfe deine Internetverbindung.`
          : errorMessage
        );
      }
    }
  };

  // Stream starten
  executeStream();

  // Cleanup-Funktion
  return () => {
    isAborted = true;
    controller.abort();
  };
}

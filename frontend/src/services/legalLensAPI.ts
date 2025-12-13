// 📡 legalLensAPI.ts - API Service für Legal Lens Feature
import { fetchWithAuth, API_BASE_URL } from '../context/authUtils';
import type {
  ParseContractResponse,
  AnalyzeClauseResponse,
  GetPerspectivesResponse,
  GenerateAlternativesResponse,
  GenerateNegotiationResponse,
  ChatResponse,
  ProgressResponse,
  SummaryResponse,
  PerspectiveType,
  LegalLensProgress,
  Note,
  Bookmark
} from '../types/legalLens';

const LEGAL_LENS_BASE = `${API_BASE_URL}/legal-lens`;

/**
 * Vertrag in Klauseln parsen
 */
export async function parseContract(
  contractId: string,
  options?: {
    includeSubSentences?: boolean;
    preserveFormatting?: boolean;
  }
): Promise<ParseContractResponse> {
  const response = await fetchWithAuth(`${LEGAL_LENS_BASE}/parse`, {
    method: 'POST',
    body: JSON.stringify({
      contractId,
      ...options
    })
  });

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
  streaming: boolean = false
): Promise<AnalyzeClauseResponse> {
  const response = await fetchWithAuth(
    `${LEGAL_LENS_BASE}/${contractId}/clause/${clauseId}/analyze`,
    {
      method: 'POST',
      body: JSON.stringify({
        clauseText,
        perspective,
        streaming
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler bei der Klausel-Analyse');
  }

  return response.json();
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

  const token = document.cookie
    .split(';')
    .find(c => c.trim().startsWith('token='))
    ?.split('=')[1];

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
      streaming: true
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
    });

  return () => controller.abort();
}

/**
 * Alle Perspektiven für eine Klausel abrufen
 */
export async function getAllPerspectives(
  contractId: string,
  clauseId: string
): Promise<GetPerspectivesResponse> {
  const response = await fetchWithAuth(
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
  const response = await fetchWithAuth(
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
  const response = await fetchWithAuth(
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
  const response = await fetchWithAuth(
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
  const response = await fetchWithAuth(
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
  const response = await fetchWithAuth(
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
  const response = await fetchWithAuth(
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
  const response = await fetchWithAuth(
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
  const response = await fetchWithAuth(
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
  const response = await fetchWithAuth(
    `${LEGAL_LENS_BASE}/${contractId}/summary`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Zusammenfassung');
  }

  return response.json();
}

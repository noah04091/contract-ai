// 📡 clauseLibraryAPI.ts - API Service für Klausel-Bibliothek
import { fetchWithAuth, API_BASE_URL } from '../context/authUtils';
import type {
  SavedClause,
  SaveClauseRequest,
  UpdateClauseRequest,
  ClauseLibraryFilters,
  ClauseLibraryResponse,
  ClauseLibraryStatistics,
  TagWithCount,
  SimilarityCheckResponse,
  BatchCheckResponse
} from '../types/clauseLibrary';

const CLAUSE_LIBRARY_BASE = `${API_BASE_URL}/clause-library`;

/**
 * Alle gespeicherten Klauseln abrufen
 */
export async function getSavedClauses(
  filters: ClauseLibraryFilters = {}
): Promise<ClauseLibraryResponse> {
  const params = new URLSearchParams();

  if (filters.category) params.append('category', filters.category);
  if (filters.clauseArea) params.append('clauseArea', filters.clauseArea);
  if (filters.tag) params.append('tag', filters.tag);
  if (filters.industryContext) params.append('industryContext', filters.industryContext);
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const queryString = params.toString();
  const url = queryString
    ? `${CLAUSE_LIBRARY_BASE}?${queryString}`
    : CLAUSE_LIBRARY_BASE;

  const response = await fetchWithAuth(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Klauseln');
  }

  return response.json();
}

/**
 * Einzelne Klausel abrufen
 */
export async function getClause(clauseId: string): Promise<{ success: boolean; clause: SavedClause }> {
  const response = await fetchWithAuth(`${CLAUSE_LIBRARY_BASE}/${clauseId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Klausel');
  }

  return response.json();
}

/**
 * Neue Klausel speichern
 */
export async function saveClause(data: SaveClauseRequest): Promise<{ success: boolean; clause: SavedClause; message: string }> {
  const response = await fetchWithAuth(CLAUSE_LIBRARY_BASE, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    // Spezialfall: Duplikat
    if (response.status === 409) {
      throw new Error(`DUPLICATE:${error.existingClause?.id || ''}`);
    }
    throw new Error(error.error || 'Fehler beim Speichern der Klausel');
  }

  return response.json();
}

/**
 * Klausel aktualisieren
 */
export async function updateClause(
  clauseId: string,
  data: UpdateClauseRequest
): Promise<{ success: boolean; clause: SavedClause; message: string }> {
  const response = await fetchWithAuth(`${CLAUSE_LIBRARY_BASE}/${clauseId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Aktualisieren der Klausel');
  }

  return response.json();
}

/**
 * Klausel löschen
 */
export async function deleteClause(clauseId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth(`${CLAUSE_LIBRARY_BASE}/${clauseId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Löschen der Klausel');
  }

  return response.json();
}

/**
 * Alle Tags abrufen
 */
export async function getTags(): Promise<{ success: boolean; tags: TagWithCount[] }> {
  const response = await fetchWithAuth(`${CLAUSE_LIBRARY_BASE}/meta/tags`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Tags');
  }

  return response.json();
}

/**
 * Statistiken abrufen
 */
export async function getStatistics(): Promise<{ success: boolean; statistics: ClauseLibraryStatistics }> {
  const response = await fetchWithAuth(`${CLAUSE_LIBRARY_BASE}/meta/statistics`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Statistiken');
  }

  return response.json();
}

/**
 * Ähnliche Klauseln prüfen
 */
export async function checkSimilar(
  clauseText: string,
  threshold: number = 3
): Promise<SimilarityCheckResponse> {
  const response = await fetchWithAuth(`${CLAUSE_LIBRARY_BASE}/check-similar`, {
    method: 'POST',
    body: JSON.stringify({ clauseText, threshold })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler bei der Ähnlichkeitsprüfung');
  }

  return response.json();
}

/**
 * Mehrere Klauseln auf Ähnlichkeit prüfen (für Legal Lens Integration)
 */
export async function batchCheckSimilar(
  clauses: Array<{ id: string; text: string }>
): Promise<BatchCheckResponse> {
  const response = await fetchWithAuth(`${CLAUSE_LIBRARY_BASE}/batch-check`, {
    method: 'POST',
    body: JSON.stringify({ clauses })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler bei der Batch-Prüfung');
  }

  return response.json();
}

/**
 * Nutzungszähler erhöhen
 */
export async function incrementUsage(clauseId: string): Promise<{ success: boolean; usageCount: number }> {
  const response = await fetchWithAuth(`${CLAUSE_LIBRARY_BASE}/${clauseId}/use`, {
    method: 'POST'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Aktualisieren');
  }

  return response.json();
}

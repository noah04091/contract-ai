// clauseCollectionAPI.ts - API Service fuer Klausel-Sammlungen
import { fetchWithAuth, API_BASE_URL } from '../context/authUtils';
import type {
  ClauseCollection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  AddCollectionItemRequest,
  CollectionItem
} from '../types/clauseLibrary';

const BASE = `${API_BASE_URL}/clause-collections`;

/**
 * Alle Sammlungen des Users abrufen (mit itemCount)
 */
export async function getCollections(): Promise<{ success: boolean; collections: ClauseCollection[] }> {
  const response = await fetchWithAuth(BASE);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Sammlungen');
  }
  return response.json();
}

/**
 * Einzelne Sammlung mit aufgeloesten Klauseln laden
 */
export async function getCollection(id: string): Promise<{ success: boolean; collection: ClauseCollection }> {
  const response = await fetchWithAuth(`${BASE}/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden der Sammlung');
  }
  return response.json();
}

/**
 * Neue Sammlung erstellen
 */
export async function createCollection(data: CreateCollectionRequest): Promise<{ success: boolean; collection: ClauseCollection; message: string }> {
  const response = await fetchWithAuth(BASE, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Erstellen der Sammlung');
  }
  return response.json();
}

/**
 * Sammlung aktualisieren (Name, Beschreibung, Icon, Farbe)
 */
export async function updateCollection(
  id: string,
  data: UpdateCollectionRequest
): Promise<{ success: boolean; collection: ClauseCollection; message: string }> {
  const response = await fetchWithAuth(`${BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Aktualisieren');
  }
  return response.json();
}

/**
 * Sammlung loeschen
 */
export async function deleteCollection(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth(`${BASE}/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Loeschen');
  }
  return response.json();
}

/**
 * Klausel zu Sammlung hinzufuegen
 */
export async function addItem(
  collectionId: string,
  data: AddCollectionItemRequest
): Promise<{ success: boolean; item: CollectionItem; itemCount: number; message: string }> {
  const response = await fetchWithAuth(`${BASE}/${collectionId}/items`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    if (response.status === 409) {
      throw new Error('DUPLICATE');
    }
    throw new Error(error.error || 'Fehler beim Hinzufuegen');
  }
  return response.json();
}

/**
 * Klausel aus Sammlung entfernen
 */
export async function removeItem(
  collectionId: string,
  itemId: string
): Promise<{ success: boolean; itemCount: number; message: string }> {
  const response = await fetchWithAuth(`${BASE}/${collectionId}/items/${itemId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Entfernen');
  }
  return response.json();
}

/**
 * Reihenfolge der Items aendern
 */
export async function reorderItems(
  collectionId: string,
  itemIds: string[]
): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth(`${BASE}/${collectionId}/items/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ itemIds })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Sortieren');
  }
  return response.json();
}

/**
 * Sammlungen finden die eine bestimmte SavedClause enthalten
 */
export async function getCollectionsByClause(
  clauseId: string
): Promise<{ success: boolean; collections: Array<{ _id: string; name: string; icon: string; color: string }> }> {
  const response = await fetchWithAuth(`${BASE}/by-clause/${clauseId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Fehler beim Laden');
  }
  return response.json();
}

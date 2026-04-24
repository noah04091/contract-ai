import { fetchWithAuth, API_BASE_URL } from '../context/authUtils';

const BASE_URL = `${API_BASE_URL}/playbook-review`;

// ============================================
// PLAYBOOK CRUD
// ============================================

/**
 * Alle Playbooks laden (inkl. globale, Stats, letzte Checks)
 */
export async function getPlaybooks() {
  const response = await fetchWithAuth(BASE_URL);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Laden der Playbooks');
  }
  return response.json();
}

/**
 * Einzelnes Playbook laden (inkl. Check-Historie)
 */
export async function getPlaybook(id: string) {
  const response = await fetchWithAuth(`${BASE_URL}/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Playbook nicht gefunden');
  }
  return response.json();
}

/**
 * Neues Playbook erstellen
 */
export async function createPlaybook(data: {
  name: string;
  description?: string;
  contractType?: string;
  role?: string;
  industry?: string;
  rules?: Array<{
    title: string;
    description: string;
    category?: string;
    priority?: string;
    threshold?: string;
    note?: string;
    standardText?: string;
  }>;
  isDefault?: boolean;
  isGlobal?: boolean;
}) {
  const response = await fetchWithAuth(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Erstellen');
  }
  return response.json();
}

/**
 * Playbook aktualisieren
 */
export async function updatePlaybook(id: string, data: {
  name?: string;
  description?: string;
  contractType?: string;
  role?: string;
  industry?: string;
  rules?: Array<{
    title: string;
    description: string;
    category?: string;
    priority?: string;
    threshold?: string;
    note?: string;
    standardText?: string;
  }>;
  isDefault?: boolean;
  status?: string;
}) {
  const response = await fetchWithAuth(`${BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Aktualisieren');
  }
  return response.json();
}

/**
 * Playbook loeschen
 */
export async function deletePlaybook(id: string) {
  const response = await fetchWithAuth(`${BASE_URL}/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Loeschen');
  }
  return response.json();
}

// ============================================
// REGEL-GENERIERUNG
// ============================================

/**
 * KI generiert Regeln basierend auf Kontext
 */
export async function generateRules(data: {
  contractType: string;
  role?: string;
  industry?: string;
  additionalContext?: string;
}) {
  const response = await fetchWithAuth(`${BASE_URL}/generate-rules`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler bei der Regelgenerierung');
  }
  return response.json();
}

/**
 * Regeln aus bestehendem Vertrag extrahieren
 */
export async function extractRules(data: {
  contractText: string;
  role?: string;
}) {
  const response = await fetchWithAuth(`${BASE_URL}/extract-rules`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler bei der Regelextraktion');
  }
  return response.json();
}

// ============================================
// VERTRAGSPRUEFUNG
// ============================================

/**
 * Vertrag gegen Playbook pruefen
 */
export async function checkContract(playbookId: string, data: {
  contractText: string;
  contractName?: string;
  contractId?: string;
}) {
  const response = await fetchWithAuth(`${BASE_URL}/${playbookId}/check`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler bei der Vertragspruefung');
  }
  return response.json();
}

/**
 * Einzelnes Pruefungsergebnis laden
 */
export async function getCheck(checkId: string) {
  const response = await fetchWithAuth(`${BASE_URL}/checks/${checkId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Pruefung nicht gefunden');
  }
  return response.json();
}

/**
 * Letzte Pruefungen laden
 */
export async function getRecentChecks(limit = 10) {
  const response = await fetchWithAuth(`${BASE_URL}/checks/recent?limit=${limit}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Laden');
  }
  return response.json();
}

// ============================================
// VERTRAEGE (fuer Auswahl)
// ============================================

/**
 * Vertraege des Users laden (fuer Check-Auswahl)
 */
export async function getContractsList() {
  const response = await fetchWithAuth(`${BASE_URL}/contracts/list`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Laden der Vertraege');
  }
  return response.json();
}

/**
 * Vertragstext laden
 */
export async function getContractText(contractId: string) {
  const response = await fetchWithAuth(`${BASE_URL}/contracts/${contractId}/text`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Laden des Vertragstexts');
  }
  return response.json();
}

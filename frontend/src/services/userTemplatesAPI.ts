// 📡 userTemplatesAPI.ts - API Service für benutzerdefinierte Vorlagen

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface UserTemplate {
  id: string;
  name: string;
  description: string;
  contractType: string;
  defaultValues: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  contractType: string;
  defaultValues: Record<string, unknown>;
}

/**
 * Alle User Templates abrufen
 */
export async function fetchUserTemplates(): Promise<UserTemplate[]> {
  const response = await fetch(`${API_BASE_URL}/api/user-templates`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Laden der Vorlagen');
  }

  const data = await response.json();
  return data.templates || [];
}

/**
 * Templates nach Vertragstyp filtern
 */
export async function fetchTemplatesByType(contractType: string): Promise<UserTemplate[]> {
  const response = await fetch(`${API_BASE_URL}/api/user-templates/by-type/${contractType}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Laden der Vorlagen');
  }

  const data = await response.json();
  return data.templates || [];
}

/**
 * Neues Template erstellen
 */
export async function createUserTemplate(templateData: CreateTemplateRequest): Promise<UserTemplate> {
  const response = await fetch(`${API_BASE_URL}/api/user-templates`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(templateData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Erstellen der Vorlage');
  }

  const data = await response.json();
  return data.template;
}

/**
 * Template aktualisieren
 */
export async function updateUserTemplate(
  templateId: string,
  updates: Partial<CreateTemplateRequest>
): Promise<UserTemplate> {
  const response = await fetch(`${API_BASE_URL}/api/user-templates/${templateId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Aktualisieren der Vorlage');
  }

  const data = await response.json();
  return data.template;
}

/**
 * Template löschen
 */
export async function deleteUserTemplate(templateId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/user-templates/${templateId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Fehler beim Löschen der Vorlage');
  }
}

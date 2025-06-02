// 📁 src/utils/api.ts - IMPROVED ERROR HANDLING & RETRY LOGIC + OPTIMIZE FUNCTIONS + DUBLIKAT-HANDLING (TYPESCRIPT FIXED)
const API_BASE_URL = "/api"; // Proxy-Pfad für Vercel & devServer

/**
 * Type Guard um zu prüfen ob etwas ein Error ist
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Helper um einen Error-String aus unknown zu extrahieren
 */
function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}

// ✅ NEU: Interface für Duplikat-Error-Response
interface DuplicateError {
  status: 409;
  duplicate: true;
  data: any;
}

/**
 * ✅ NEU: Type Guard für Duplikat-Error
 */
function isDuplicateError(error: unknown): error is DuplicateError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    'duplicate' in error &&
    (error as any).status === 409 &&
    (error as any).duplicate === true
  );
}

/**
 * Sleep-Funktion für Retry-Logic
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Universelle API-Fetch-Funktion mit verbesserter Fehlerbehandlung & Retry
 */
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<unknown> => {
  const authToken = localStorage.getItem("authToken");
  const isFormData = options.body instanceof FormData;
  const maxRetries = 2;

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(authToken && !(options.headers && "Authorization" in options.headers)
      ? { Authorization: `Bearer ${authToken}` }
      : {}),
  };

  const mergedOptions: RequestInit = {
    credentials: "include",
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers as Record<string, string> || {}),
    },
  };

  try {
    const retryInfo = retryCount > 0 ? ` (Retry ${retryCount}/${maxRetries})` : '';
    console.log(`🔄 API-Request: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}${retryInfo}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);

    // 🔍 Enhanced Debugging
    console.log(`📡 API-Response: ${response.status} ${response.statusText}${retryInfo}`, {
      url: `${API_BASE_URL}${endpoint}`,
      headers: Object.fromEntries(response.headers.entries()),
      ok: response.ok
    });

    // ✅ Prüfe Content-Type für bessere Fehlermeldungen
    const contentType = response.headers.get("content-type");
    const isJsonResponse = contentType?.includes("application/json");
    
    if (!response.ok) {
      let errorMessage = `❌ HTTP ${response.status} ${response.statusText}`;
      let shouldRetry = false;
      
      if (isJsonResponse) {
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
          
          // ✅ NEU: Für 409 (Conflict/Duplikat) nicht retyen - das ist ein erwarteter Zustand
          if (response.status === 409) {
            // Bei Duplikaten die komplette Response zurückgeben für Frontend-Handling
            const duplicateError: DuplicateError = { 
              status: 409, 
              duplicate: true, 
              data: errorData 
            };
            throw duplicateError;
          }
          
          // Prüfe ob Retry sinnvoll ist
          if (response.status >= 500 && response.status < 600) {
            shouldRetry = true;
          }
        } catch (parseError) {
          // ✅ NEU: Spezial-Handling für Duplikat-Response
          if (response.status === 409) {
            const duplicateError: DuplicateError = { 
              status: 409, 
              duplicate: true, 
              data: null 
            };
            throw duplicateError;
          }
          
          console.warn("⚠️ Konnte JSON-Error nicht parsen:", parseError);
          shouldRetry = response.status >= 500;
        }
      } else {
        // HTML oder andere Responses
        const textResponse = await response.text();
        console.error("❌ Nicht-JSON Response erhalten:", textResponse.substring(0, 200));
        
        if (response.status === 404) {
          errorMessage = `❌ API-Endpoint nicht gefunden: ${endpoint}`;
        } else if (response.status >= 500) {
          errorMessage = `❌ Server-Fehler bei ${endpoint}`;
          shouldRetry = true;
        } else {
          errorMessage = `❌ Unerwarteter Fehler (${response.status}) bei ${endpoint}`;
        }
      }
      
      // ✅ RETRY-LOGIC für 500er-Fehler
      if (shouldRetry && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`🔄 Retrying in ${delay}ms due to server error...`);
        await sleep(delay);
        return apiCall(endpoint, options, retryCount + 1);
      }
      
      throw new Error(errorMessage);
    }

    // ✅ Response verarbeiten
    if (isJsonResponse) {
      try {
        return await response.json();
      } catch (jsonError) {
        console.error("❌ JSON-Parse-Fehler:", jsonError);
        throw new Error("❌ Server-Response konnte nicht als JSON geparst werden");
      }
    } else {
      // Nicht-JSON Response (z.B. Datei-Download)
      return await response.text();
    }

  } catch (err) {
    console.error(`❌ API-Fehler bei [${endpoint}] (Attempt ${retryCount + 1}):`, err);
    
    // ✅ NEU: TypeScript-sicheres Spezial-Handling für Duplikat-Response
    if (isDuplicateError(err)) {
      throw err; // Duplikat-Error direkt weiterleiten
    }
    
    // ✅ FIXED: TypeScript-sichere Fehlerbehandlung
    const errorMessage = getErrorMessage(err);
    
    // ✅ Network-Fehler Retry-Logic
    if (isError(err) && err instanceof TypeError && errorMessage.includes('Failed to fetch')) {
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`🔄 Network error - retrying in ${delay}ms...`);
        await sleep(delay);
        return apiCall(endpoint, options, retryCount + 1);
      } else {
        throw new Error("❌ Netzwerk-Fehler: Server nicht erreichbar (nach mehreren Versuchen)");
      }
    }
    
    // ✅ Spezifische Fehlermeldungen für verschiedene Szenarien
    if (errorMessage.includes('Unexpected token')) {
      throw new Error("❌ Server-Fehler: Unerwartete Antwort (möglicherweise ist die API offline)");
    }
    
    throw err;
  }
};

/**
 * ✅ ERWEITERT: Spezielle Funktion für File-Upload mit Analyse - MIT RETRY, PROGRESS & DUPLIKAT-HANDLING
 */
export const uploadAndAnalyze = async (
  file: File, 
  onProgress?: (progress: number) => void,
  forceReanalyze: boolean = false // ✅ NEU: Parameter für Re-Analyse
): Promise<unknown> => {
  const formData = new FormData();
  formData.append('file', file);
  
  // ✅ NEU: forceReanalyze Parameter hinzufügen
  if (forceReanalyze) {
    formData.append('forceReanalyze', 'true');
    console.log(`🔄 Upload & Analyze mit Force-Reanalyze: ${file.name}`);
  } else {
    console.log(`📤 Upload & Analyze: ${file.name} (${file.size} bytes)`);
  }

  // ✅ Progress-Simulation (da FormData keinen echten Progress hat)
  if (onProgress) {
    onProgress(10); // Start
  }

  try {
    if (onProgress) onProgress(30); // PDF wird gelesen
    
    const result = await apiCall('/analyze', {
      method: 'POST',
      body: formData,
    });
    
    if (onProgress) onProgress(100); // Fertig
    
    console.log("✅ Analyse erfolgreich:", result);
    return result;
    
  } catch (error) {
    if (onProgress) onProgress(0); // Reset bei Fehler
    
    // ✅ NEU: TypeScript-sicheres Spezial-Handling für Duplikat-Response
    if (isDuplicateError(error)) {
      console.log("🔄 Duplikat erkannt - Frontend-Handling erforderlich");
      return error.data; // ✅ FIXED: TypeScript weiß jetzt, dass 'data' existiert
    }
    
    console.error("❌ Upload & Analyze Fehler:", error);
    
    // ✅ FIXED: TypeScript-sichere Fehlerbehandlung
    const errorMessage = getErrorMessage(error);
    
    // ✅ Benutzerfreundliche Fehlermeldungen
    if (errorMessage.includes('nicht gefunden') || errorMessage.includes('404')) {
      throw new Error("❌ Analyse-Service ist derzeit nicht verfügbar. Bitte kontaktiere den Support.");
    }
    
    if (errorMessage.includes('Server-Fehler') || errorMessage.includes('500')) {
      throw new Error("❌ Fehler bei der Vertragsanalyse. Bitte versuche es später erneut.");
    }
    
    if (errorMessage.includes('Limit erreicht')) {
      throw new Error("📊 Analyse-Limit erreicht. Bitte upgrade dein Paket für weitere Analysen.");
    }
    
    if (errorMessage.includes('Timeout')) {
      throw new Error("⏱️ Analyse-Timeout. Bitte versuche es mit einer kleineren PDF-Datei.");
    }
    
    if (errorMessage.includes('PDF') || errorMessage.includes('Datei')) {
      throw new Error("📄 PDF-Datei konnte nicht verarbeitet werden. Bitte prüfe das Dateiformat.");
    }
    
    throw error;
  }
};

/**
 * ⭐ NEU: Spezielle Funktion für File-Upload mit Optimierung - MIT RETRY & PROGRESS
 */
export const uploadAndOptimize = async (
  file: File, 
  contractType?: string,
  onProgress?: (progress: number) => void
): Promise<unknown> => {
  const formData = new FormData();
  formData.append('file', file);
  if (contractType) {
    formData.append('contractType', contractType);
  }

  console.log(`🔧 Upload & Optimize: ${file.name} (${file.size} bytes)`);

  // ✅ Progress-Simulation für Optimierung (dauert länger)
  if (onProgress) {
    onProgress(5); // Start
  }

  try {
    if (onProgress) onProgress(20); // PDF wird gelesen
    
    // ✅ Optimierung dauert länger als Analyse
    const progressInterval = setInterval(() => {
      if (onProgress) {
        const currentProgress = Math.min(85, Math.random() * 20 + 40);
        onProgress(currentProgress);
      }
    }, 2000);

    const result = await apiCall('/optimize', {
      method: 'POST',
      body: formData,
    });
    
    clearInterval(progressInterval);
    if (onProgress) onProgress(100); // Fertig
    
    console.log("✅ Optimierung erfolgreich:", result);
    return result;
    
  } catch (error) {
    if (onProgress) onProgress(0); // Reset bei Fehler
    
    console.error("❌ Upload & Optimize Fehler:", error);
    
    // ✅ FIXED: TypeScript-sichere Fehlerbehandlung
    const errorMessage = getErrorMessage(error);
    
    // ✅ Benutzerfreundliche Fehlermeldungen für Optimierung
    if (errorMessage.includes('nicht gefunden') || errorMessage.includes('404')) {
      throw new Error("❌ Optimierung-Service ist derzeit nicht verfügbar. Bitte kontaktiere den Support.");
    }
    
    if (errorMessage.includes('Server-Fehler') || errorMessage.includes('500')) {
      throw new Error("❌ Fehler bei der Vertragsoptimierung. Bitte versuche es später erneut.");
    }
    
    if (errorMessage.includes('Limit erreicht')) {
      throw new Error("🔧 Optimierung-Limit erreicht. Bitte upgrade dein Paket für weitere Optimierungen.");
    }
    
    if (errorMessage.includes('Timeout')) {
      throw new Error("⏱️ Optimierung-Timeout. Bitte versuche es mit einer kleineren PDF-Datei.");
    }
    
    if (errorMessage.includes('PDF') || errorMessage.includes('Datei')) {
      throw new Error("📄 PDF-Datei konnte nicht verarbeitet werden. Bitte prüfe das Dateiformat.");
    }
    
    throw error;
  }
};

/**
 * Health Check für Analyse-Service
 */
interface HealthCheckResponse {
  success: boolean;
  status?: string;
  timestamp?: string;
}

export const checkAnalyzeHealth = async (): Promise<boolean> => {
  try {
    const result = await apiCall('/analyze/health') as HealthCheckResponse;
    return !!result?.success;
  } catch {
    return false;
  }
};

/**
 * ⭐ NEU: Health Check für Optimierung-Service
 */
export const checkOptimizeHealth = async (): Promise<boolean> => {
  try {
    const result = await apiCall('/optimize/health') as HealthCheckResponse;
    return !!result?.success;
  } catch {
    return false;
  }
};

/**
 * ⭐ NEU: Optimierung-Historie abrufen
 */
export const getOptimizationHistory = async (): Promise<unknown> => {
  try {
    return await apiCall('/optimize/history');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Optimierung-Historie:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Analyse-Historie abrufen
 */
export const getAnalysisHistory = async (): Promise<unknown> => {
  try {
    return await apiCall('/analyze/history');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Analyse-Historie:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: User-Limits abrufen
 */
export const getUserLimits = async (): Promise<unknown> => {
  try {
    return await apiCall('/auth/me');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der User-Limits:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Vertrag speichern (nach Generierung oder Optimierung)
 */
export const saveContract = async (contractData: {
  name: string;
  content: string;
  laufzeit?: string;
  kuendigung?: string;
  expiryDate?: string;
  status?: string;
  isGenerated?: boolean;
  signature?: string;
}): Promise<unknown> => {
  try {
    return await apiCall('/contracts', {
      method: 'POST',
      body: JSON.stringify(contractData),
    });
  } catch (error) {
    console.error("❌ Fehler beim Speichern des Vertrags:", error);
    throw error;
  }
};

/**
 * ⭐ VERBESSERT: Contracts abrufen mit Fehlerbehandlung
 */
export const getContracts = async (): Promise<unknown> => {
  try {
    return await apiCall('/contracts');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Verträge:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Einzelnen Vertrag abrufen
 */
export const getContract = async (contractId: string): Promise<unknown> => {
  try {
    return await apiCall(`/contracts/${contractId}`);
  } catch (error) {
    console.error("❌ Fehler beim Abrufen des Vertrags:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Einzelnen Vertrag nach Details abrufen (für Duplikat-Navigation)
 */
export const getContractDetails = async (contractId: string): Promise<unknown> => {
  try {
    return await apiCall(`/contracts/${contractId}`);
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Vertrag-Details:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Alle Verträge eines Users abrufen (für Duplikat-Check im Frontend)
 */
export const getUserContracts = async (): Promise<unknown> => {
  try {
    return await apiCall('/contracts');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der User-Verträge:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Vertrag löschen
 */
export const deleteContract = async (contractId: string): Promise<unknown> => {
  try {
    return await apiCall(`/contracts/${contractId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error("❌ Fehler beim Löschen des Vertrags:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Reminder für Vertrag togglen
 */
export const toggleContractReminder = async (contractId: string, enabled: boolean): Promise<unknown> => {
  try {
    return await apiCall(`/contracts/${contractId}/reminder`, {
      method: 'PATCH',
      body: JSON.stringify({ reminder: enabled }),
    });
  } catch (error) {
    console.error("❌ Fehler beim Togglen des Vertrags-Reminders:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Vertrag-Status aktualisieren
 */
export const updateContractStatus = async (contractId: string, status: string): Promise<unknown> => {
  try {
    return await apiCall(`/contracts/${contractId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Vertrag-Status:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Batch-Operationen für mehrere Verträge
 */
export const batchUpdateContracts = async (contractIds: string[], updates: Record<string, unknown>): Promise<unknown> => {
  try {
    return await apiCall('/contracts/batch', {
      method: 'PATCH',
      body: JSON.stringify({ contractIds, updates }),
    });
  } catch (error) {
    console.error("❌ Fehler beim Batch-Update der Verträge:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Suche in Verträgen
 */
export const searchContracts = async (query: string, filters?: Record<string, unknown>): Promise<unknown> => {
  try {
    const searchParams = new URLSearchParams({
      q: query,
      ...(filters && { filters: JSON.stringify(filters) })
    });
    
    return await apiCall(`/contracts/search?${searchParams.toString()}`);
  } catch (error) {
    console.error("❌ Fehler bei der Vertrags-Suche:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Statistiken für Dashboard abrufen
 */
export const getDashboardStats = async (): Promise<unknown> => {
  try {
    return await apiCall('/dashboard/stats');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Dashboard-Statistiken:", error);
    throw error;
  }
};

/**
 * Löscht alle gespeicherten Authentifizierungsdaten
 */
export const clearAuthData = (): void => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authEmail");
  localStorage.removeItem("authTimestamp");
};

export default API_BASE_URL;
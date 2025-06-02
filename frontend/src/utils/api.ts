// 📁 src/utils/api.ts - TYPESCRIPT ERRORS FIXED
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

/**
 * Universelle API-Fetch-Funktion mit verbesserter Fehlerbehandlung
 */
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<unknown> => {
  const authToken = localStorage.getItem("authToken");
  const isFormData = options.body instanceof FormData;

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
    console.log(`🔄 API-Request: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);

    // 🔍 Enhanced Debugging
    console.log(`📡 API-Response: ${response.status} ${response.statusText}`, {
      url: `${API_BASE_URL}${endpoint}`,
      headers: Object.fromEntries(response.headers.entries()),
      ok: response.ok
    });

    // ✅ Prüfe Content-Type für bessere Fehlermeldungen
    const contentType = response.headers.get("content-type");
    const isJsonResponse = contentType?.includes("application/json");
    
    if (!response.ok) {
      let errorMessage = `❌ HTTP ${response.status} ${response.statusText}`;
      
      if (isJsonResponse) {
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.warn("⚠️ Konnte JSON-Error nicht parsen:", parseError);
        }
      } else {
        // HTML oder andere Responses
        const textResponse = await response.text();
        console.error("❌ Nicht-JSON Response erhalten:", textResponse.substring(0, 200));
        
        if (response.status === 404) {
          errorMessage = `❌ API-Endpoint nicht gefunden: ${endpoint}`;
        } else if (response.status === 500) {
          errorMessage = `❌ Server-Fehler bei ${endpoint}`;
        } else {
          errorMessage = `❌ Unerwarteter Fehler (${response.status}) bei ${endpoint}`;
        }
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
    console.error(`❌ API-Fehler bei [${endpoint}]:`, err);
    
    // ✅ FIXED: TypeScript-sichere Fehlerbehandlung
    const errorMessage = getErrorMessage(err);
    
    // ✅ Spezifische Fehlermeldungen für verschiedene Szenarien
    if (isError(err) && err instanceof TypeError && errorMessage.includes('Failed to fetch')) {
      throw new Error("❌ Netzwerk-Fehler: Server nicht erreichbar");
    }
    
    if (errorMessage.includes('Unexpected token')) {
      throw new Error("❌ Server-Fehler: Unerwartete Antwort (möglicherweise ist die API offline)");
    }
    
    throw err;
  }
};

/**
 * Spezielle Funktion für File-Upload mit Analyse
 */
export const uploadAndAnalyze = async (file: File): Promise<unknown> => {
  const formData = new FormData();
  formData.append('file', file);

  console.log(`📤 Upload & Analyze: ${file.name} (${file.size} bytes)`);

  try {
    const result = await apiCall('/analyze', {
      method: 'POST',
      body: formData,
    });
    
    console.log("✅ Analyse erfolgreich:", result);
    return result;
  } catch (error) {
    console.error("❌ Upload & Analyze Fehler:", error);
    
    // ✅ FIXED: TypeScript-sichere Fehlerbehandlung
    const errorMessage = getErrorMessage(error);
    
    // ✅ Benutzerfreundliche Fehlermeldungen
    if (errorMessage.includes('nicht gefunden')) {
      throw new Error("❌ Analyse-Service ist derzeit nicht verfügbar. Bitte kontaktiere den Support.");
    }
    
    if (errorMessage.includes('Server-Fehler')) {
      throw new Error("❌ Fehler bei der Vertragsanalyse. Bitte versuche es später erneut.");
    }
    
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
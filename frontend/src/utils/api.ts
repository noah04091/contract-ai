// 📁 src/utils/api.ts

const API_BASE_URL = "/api"; // Proxy-Pfad für Vercel & devServer

/**
 * Universelle API-Fetch-Funktion mit Cookie- und optionalem Token-Support.
 */
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);

    // 🔍 Optionales Debugging über Konsole aktivieren
    if ((window as any).DEBUG_API) {
      console.log(`🔍 [apiCall] ${endpoint}`, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        cookies: document.cookie,
      });
    }

    if (!response.ok) {
      let errorMessage = `❌ Fehler ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) errorMessage = errorData.message;
      } catch {
        // Ignoriere JSON-Fehler
      }
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch {
      return {}; // Fallback bei leerem Body (z. B. 204 No Content)
    }

  } catch (err: unknown) {
    console.error(`❌ API-Fehler bei [${endpoint}]:`, err);
    throw err;
  }
};

/**
 * Löscht alle gespeicherten Authentifizierungsdaten (Token, Zeitstempel, E-Mail).
 */
export const clearAuthData = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authEmail");
  localStorage.removeItem("authTimestamp");
};

export default API_BASE_URL;

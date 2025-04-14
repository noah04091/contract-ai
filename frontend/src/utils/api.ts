// C:\Users\liebo\Documents\contract-ai\frontend\src\utils\api.ts

const API_BASE_URL = "https://api.contract-ai.de";

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  // Standard-Optionen für alle API-Aufrufe
  const defaultOptions: RequestInit = {
    credentials: "include", // Wichtig: Sendet Cookies mit jeder Anfrage
    headers: {
      "Content-Type": "application/json"
    }
  };

  // Token aus localStorage als Fallback hinzufügen
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      "Authorization": `Bearer ${authToken}`
    };
  }

  // Optionen zusammenführen
  const fetchOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers as Record<string, string>,
      ...(options.headers as Record<string, string> || {})
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
    
    if (!response.ok) {
      // Versuche, den Fehler als JSON zu lesen
      try {
        const error = await response.json();
        throw new Error(error.message || `Server antwortet mit Status ${response.status}`);
      } catch (jsonError) {
        // Falls keine gültige JSON-Antwort
        throw new Error(`Server antwortet mit Status ${response.status}`);
      }
    }
    
    // Versuche, die Antwort als JSON zu parsen
    try {
      return await response.json();
    } catch (jsonError) {
      // Falls keine JSON-Antwort (z.B. bei leerer Antwort)
      return {};
    }
  } catch (error) {
    console.error(`API-Fehler (${endpoint}):`, error);
    throw error;
  }
};

// Funktion zum Löschen der Auth-Daten (nützlich beim Logout)
export const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authEmail');
  localStorage.removeItem('authTimestamp');
};

export default API_BASE_URL;
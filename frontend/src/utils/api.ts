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
      const error = await response.json();
      throw new Error(error.message || `Server antwortet mit Status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API-Fehler (${endpoint}):`, error);
    throw error;
  }
};

export default API_BASE_URL;
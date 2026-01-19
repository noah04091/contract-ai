// Konstanten
export const API_BASE_URL = "/api";
export const AUTH_ENDPOINTS = {
  ME: `${API_BASE_URL}/auth/me`,
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  CHANGE_PASSWORD: `${API_BASE_URL}/auth/change-password`,
  DELETE: `${API_BASE_URL}/auth/delete`,
};

export interface UserData {
    email: string;
    // ✅ Alle gültigen Subscription-Pläne
    subscriptionPlan: "free" | "business" | "enterprise" | "legendary";
    subscriptionStatus: "active" | "canceled" | "incomplete" | "past_due" | string;
    // ✅ Premium = hat bezahltes Abo (Business, Enterprise oder Legendary)
    isPremium: boolean;
    isBusiness: boolean;
    isEnterprise: boolean;
    isFree: boolean;
    isLegendary: boolean;
    subscriptionActive: boolean;
    analysisCount: number;
    analysisLimit: number;
    optimizationCount: number;
    optimizationLimit: number;
  }   

/**
 * Holt das JWT Token aus dem Cookie storage (falls vorhanden)
 */
export const getToken = (): string | null => {
  const cookies = document.cookie.split(";");
  const tokenCookie = cookies.find((cookie) => cookie.trim().startsWith("token="));
  return tokenCookie ? tokenCookie.split("=")[1] : null;
};

/**
 * Hilfsfunktion für API-Requests mit Auth-Header
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getToken();

  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
};

/**
 * Holt die Nutzerdaten vom Server
 */
export const fetchUserData = async (): Promise<UserData> => {
  const res = await fetch(AUTH_ENDPOINTS.ME, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to fetch user data");

  const data = await res.json();
  return data;
};

/**
 * Führt den Login-Prozess durch
 */
export const login = async (email: string, password: string) => {
  const res = await fetch(AUTH_ENDPOINTS.LOGIN, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Login fehlgeschlagen");
  }

  return await res.json();
};

/**
 * Führt den Logout-Prozess durch
 */
export const logout = async () => {
  await fetch(AUTH_ENDPOINTS.LOGOUT, {
    method: "POST",
    credentials: "include",
  });
};

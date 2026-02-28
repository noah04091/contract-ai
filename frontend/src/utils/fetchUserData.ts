// 📁 frontend/src/utils/fetchUserData.ts
// ✅ ERWEITERT: Mit Authorization Header Fallback für bessere Kompatibilität

import type { OnboardingState } from '../types/onboarding';

export interface UserData {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: "user" | "admin";
  // ✅ Nur 3 Pläne: free (0€), business (19€), enterprise (29€)
  subscriptionPlan: "free" | "business" | "enterprise";
  subscriptionStatus: string;
  subscriptionActive: boolean;
  isPremium: boolean;
  isBusiness: boolean;
  isEnterprise: boolean;
  isFree: boolean;
  analysisCount: number;
  analysisLimit: number;
  optimizationCount: number;
  optimizationLimit: number;
  createdAt: string;
  emailNotifications: boolean;
  contractReminders: boolean;
  onboarding?: OnboardingState;
  uiPreferences?: Record<string, unknown>;
}

export const fetchUserData = async (): Promise<UserData> => {
  try {
    // ✅ Token aus localStorage holen (falls vorhanden)
    // WICHTIG: Login speichert als "authToken", also beide prüfen!
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    
    // ✅ Headers vorbereiten
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // ✅ Authorization Header hinzufügen (falls Token vorhanden)
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("🔑 Using Authorization Header für /api/auth/me");
    }

    // Cache-Busting: Immer frische Daten (wichtig nach Abo-Änderungen!)
    const response = await fetch(`/api/auth/me?_t=${Date.now()}`, {
      method: "GET",
      credentials: "include", // ✅ Für Cookies (falls sie funktionieren)
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`❌ /api/auth/me failed: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // ✅ WICHTIG: Backend gibt { user: {...} } zurück
    if (!data.user) {
      console.error("❌ Invalid response format - no user data:", data);
      throw new Error("Invalid response format - no user data");
    }

    console.log("✅ User-Daten erfolgreich geladen:", data.user.email);
    return data.user;
  } catch (error) {
    console.error("❌ Fehler beim Laden der User-Daten:", error);
    throw error;
  }
};
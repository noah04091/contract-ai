// 📁 frontend/src/utils/fetchUserData.ts
// ✅ ERWEITERT: Mit Authorization Header Fallback für bessere Kompatibilität

export interface UserData {
  email: string;
  subscriptionPlan: "free" | "business" | "premium";
  subscriptionStatus: string;
  subscriptionActive: boolean;
  isPremium: boolean;
  isBusiness: boolean;
  isFree: boolean;
  analysisCount: number;
  analysisLimit: number;
  optimizationCount: number;
  optimizationLimit: number;
  createdAt: string;
  emailNotifications: boolean;
  contractReminders: boolean;
}

export const fetchUserData = async (): Promise<UserData> => {
  try {
    // ✅ CRITICAL FIX: Cookie-basierte Auth priorisieren, localStorage als Fallback
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include", // ✅ WICHTIG: Cookies werden mitgesendet
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
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
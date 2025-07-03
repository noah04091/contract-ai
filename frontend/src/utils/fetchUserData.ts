// 📁 frontend/src/utils/fetchUserData.ts
// ✅ FEHLENDE FUNCTION - DAHER FRONTEND-CRASH!

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
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // ✅ WICHTIG: Backend gibt { user: {...} } zurück
    if (!data.user) {
      throw new Error("Invalid response format - no user data");
    }

    return data.user;
  } catch (error) {
    console.error("❌ Fehler beim Laden der User-Daten:", error);
    throw error;
  }
};
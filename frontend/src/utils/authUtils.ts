// 📁 frontend/src/utils/authUtils.ts
// ✅ HYBRID VERSION - Backend-kompatible Interface + deine Helper-Funktionen

// ✅ BACKEND-KOMPATIBLE UserData Interface
export interface UserData {
  // 🔐 Auth-Basis (aus Backend)
  email: string;
  role?: 'user' | 'admin'; // 🔐 Admin-Role Support
  subscriptionPlan: "free" | "premium" | "business" | "enterprise";
  subscriptionStatus: string;
  subscriptionActive: boolean;

  // 🏷️ Plan-Booleans (aus Backend)
  isPremium: boolean;
  isBusiness: boolean;
  isFree: boolean;

  // 📊 Limits (aus Backend)
  analysisCount: number;
  analysisLimit: number;
  optimizationCount: number;
  optimizationLimit: number;

  // 📅 Timestamps (aus Backend)
  createdAt: string;
  emailNotifications: boolean;
  contractReminders: boolean;

  // ✅ OPTIONAL: Falls vorhanden (für Zukunft)
  _id?: string;
  firstName?: string;
  lastName?: string;
  updatedAt?: string;

  // 🎓 Onboarding (aus Backend)
  onboarding?: {
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
    checklist?: Record<string, boolean>;
    seenFeatures?: string[];
    showTooltips?: boolean;
  };
}

// ✅ DEINE HELPER-FUNKTIONEN (behalten!)
export const getDisplayName = (user: UserData): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) {
    return user.firstName;
  }
  return user.email;
};

export const getSubscriptionDisplayName = (plan?: string): string => {
  switch (plan) {
    case 'premium':
      return 'Premium';
    case 'business':
      return 'Business';
    case 'free':
    default:
      return 'Kostenlos';
  }
};

export const isSubscribed = (user: UserData): boolean => {
  return user.subscriptionPlan === 'premium' || user.subscriptionPlan === 'business';
};

export const isSubscriptionActive = (user: UserData): boolean => {
  return user.subscriptionActive === true;
};

// ✅ TOKEN-UTILITIES (hinzugefügt)
export const getAuthToken = (): string | null => {
  // ✅ Beide Keys prüfen für Backwards-Compatibility
  return localStorage.getItem("token") || localStorage.getItem("authToken");
};

export const setAuthToken = (token: string): void => {
  // ✅ Beide Keys setzen für Backwards-Compatibility
  localStorage.setItem("token", token);
  localStorage.setItem("authToken", token);
};

export const removeAuthToken = (): void => {
  // ✅ Beide Keys entfernen
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return !!token;
};

// 🔄 SILENT TOKEN REFRESH: Prüft Response auf erneuerten Token
export const handleTokenRefresh = (response: Response): void => {
  const refreshedToken = response.headers.get("X-Refreshed-Token");
  if (refreshedToken) {
    console.log("🔄 Token wurde automatisch erneuert");
    setAuthToken(refreshedToken);
  }
};

// ✅ NEUE HELPER für Backend-Properties
export const hasAnalysisLimit = (user: UserData): boolean => {
  return user.analysisLimit !== Infinity && user.analysisLimit > 0;
};

export const hasOptimizationLimit = (user: UserData): boolean => {
  return user.optimizationLimit !== Infinity && user.optimizationLimit > 0;
};

export const getAnalysisRemaining = (user: UserData): number => {
  if (user.analysisLimit === Infinity) return Infinity;
  return Math.max(0, user.analysisLimit - user.analysisCount);
};

export const getOptimizationRemaining = (user: UserData): number => {
  if (user.optimizationLimit === Infinity) return Infinity;
  return Math.max(0, user.optimizationLimit - user.optimizationCount);
};
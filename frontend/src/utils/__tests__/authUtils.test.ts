// 🧪 authUtils.test.ts - Tests für Authentication Utilities

import {
  getDisplayName,
  getSubscriptionDisplayName,
  isSubscribed,
  isSubscriptionActive,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  isAuthenticated,
  hasAnalysisLimit,
  hasOptimizationLimit,
  getAnalysisRemaining,
  getOptimizationRemaining,
  UserData
} from "../authUtils";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock User für Tests
const createMockUser = (overrides: Partial<UserData> = {}): UserData => ({
  email: "test@example.com",
  subscriptionPlan: "free",
  subscriptionStatus: "active",
  subscriptionActive: true,
  isPremium: false,
  isBusiness: false,
  isFree: true,
  analysisCount: 0,
  analysisLimit: 3,
  optimizationCount: 0,
  optimizationLimit: 1,
  createdAt: new Date().toISOString(),
  emailNotifications: true,
  contractReminders: true,
  ...overrides
});

describe("authUtils", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("getDisplayName()", () => {
    test("gibt Vor- und Nachname zurück wenn vorhanden", () => {
      const user = createMockUser({ firstName: "Max", lastName: "Mustermann" });
      expect(getDisplayName(user)).toBe("Max Mustermann");
    });

    test("gibt nur Vorname zurück wenn Nachname fehlt", () => {
      const user = createMockUser({ firstName: "Max" });
      expect(getDisplayName(user)).toBe("Max");
    });

    test("gibt E-Mail zurück wenn kein Name vorhanden", () => {
      const user = createMockUser();
      expect(getDisplayName(user)).toBe("test@example.com");
    });
  });

  describe("getSubscriptionDisplayName()", () => {
    test("gibt 'Premium' für premium zurück", () => {
      expect(getSubscriptionDisplayName("premium")).toBe("Premium");
    });

    test("gibt 'Business' für business zurück", () => {
      expect(getSubscriptionDisplayName("business")).toBe("Business");
    });

    test("gibt 'Kostenlos' für free zurück", () => {
      expect(getSubscriptionDisplayName("free")).toBe("Kostenlos");
    });

    test("gibt 'Kostenlos' für undefined zurück", () => {
      expect(getSubscriptionDisplayName(undefined)).toBe("Kostenlos");
    });
  });

  describe("isSubscribed()", () => {
    test("gibt true für Premium-User zurück", () => {
      const user = createMockUser({ subscriptionPlan: "premium" });
      expect(isSubscribed(user)).toBe(true);
    });

    test("gibt true für Business-User zurück", () => {
      const user = createMockUser({ subscriptionPlan: "business" });
      expect(isSubscribed(user)).toBe(true);
    });

    test("gibt false für Free-User zurück", () => {
      const user = createMockUser({ subscriptionPlan: "free" });
      expect(isSubscribed(user)).toBe(false);
    });
  });

  describe("isSubscriptionActive()", () => {
    test("gibt true für aktive Subscription zurück", () => {
      const user = createMockUser({ subscriptionActive: true });
      expect(isSubscriptionActive(user)).toBe(true);
    });

    test("gibt false für inaktive Subscription zurück", () => {
      const user = createMockUser({ subscriptionActive: false });
      expect(isSubscriptionActive(user)).toBe(false);
    });
  });

  describe("Token Management", () => {
    test("getAuthToken gibt null zurück wenn kein Token existiert", () => {
      expect(getAuthToken()).toBeNull();
    });

    test("setAuthToken speichert Token in beiden Keys", () => {
      setAuthToken("test-token-123");
      expect(localStorageMock.getItem("token")).toBe("test-token-123");
      expect(localStorageMock.getItem("authToken")).toBe("test-token-123");
    });

    test("getAuthToken liest Token aus 'token' Key", () => {
      localStorageMock.setItem("token", "my-token");
      expect(getAuthToken()).toBe("my-token");
    });

    test("getAuthToken liest Token aus 'authToken' Key als Fallback", () => {
      localStorageMock.setItem("authToken", "fallback-token");
      expect(getAuthToken()).toBe("fallback-token");
    });

    test("removeAuthToken entfernt beide Keys", () => {
      setAuthToken("token-to-remove");
      removeAuthToken();
      expect(localStorageMock.getItem("token")).toBeNull();
      expect(localStorageMock.getItem("authToken")).toBeNull();
    });
  });

  describe("isAuthenticated()", () => {
    test("gibt true zurück wenn Token existiert", () => {
      setAuthToken("valid-token");
      expect(isAuthenticated()).toBe(true);
    });

    test("gibt false zurück wenn kein Token existiert", () => {
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe("Analysis Limits", () => {
    test("hasAnalysisLimit gibt true zurück bei begrenztem Limit", () => {
      const user = createMockUser({ analysisLimit: 3 });
      expect(hasAnalysisLimit(user)).toBe(true);
    });

    test("hasAnalysisLimit gibt false zurück bei Infinity", () => {
      const user = createMockUser({ analysisLimit: Infinity });
      expect(hasAnalysisLimit(user)).toBe(false);
    });

    test("getAnalysisRemaining berechnet korrekt", () => {
      const user = createMockUser({ analysisLimit: 5, analysisCount: 2 });
      expect(getAnalysisRemaining(user)).toBe(3);
    });

    test("getAnalysisRemaining gibt 0 zurück wenn Limit erreicht", () => {
      const user = createMockUser({ analysisLimit: 3, analysisCount: 5 });
      expect(getAnalysisRemaining(user)).toBe(0);
    });

    test("getAnalysisRemaining gibt Infinity zurück für Unlimited-User", () => {
      const user = createMockUser({ analysisLimit: Infinity });
      expect(getAnalysisRemaining(user)).toBe(Infinity);
    });
  });

  describe("Optimization Limits", () => {
    test("hasOptimizationLimit gibt true zurück bei begrenztem Limit", () => {
      const user = createMockUser({ optimizationLimit: 10 });
      expect(hasOptimizationLimit(user)).toBe(true);
    });

    test("hasOptimizationLimit gibt false zurück bei Infinity", () => {
      const user = createMockUser({ optimizationLimit: Infinity });
      expect(hasOptimizationLimit(user)).toBe(false);
    });

    test("getOptimizationRemaining berechnet korrekt", () => {
      const user = createMockUser({ optimizationLimit: 10, optimizationCount: 3 });
      expect(getOptimizationRemaining(user)).toBe(7);
    });
  });
});

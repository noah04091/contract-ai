// 📁 frontend/src/hooks/useAssistantContext.ts
// Hook zur Bestimmung des Assistant-Modus und Kontext

import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export type AssistantMode = "sales" | "product" | "legal";

export interface AssistantContext {
  mode: AssistantMode;
  page: string;
  route: string;
  userPlan: "free" | "premium" | "business" | "enterprise" | "legendary" | null;
  isAuthenticated: boolean;
  // Optional: später für Vertrags-Context
  currentContractId?: string | null;
  currentAnalysisId?: string | null;
}

/**
 * Hook zur Bestimmung des Assistant-Kontexts basierend auf:
 * - Aktueller Route
 * - User Authentication Status
 * - User Subscription Plan
 */
export function useAssistantContext(): AssistantContext {
  const location = useLocation();
  const { user } = useAuth();

  const context = useMemo<AssistantContext>(() => {
    const isAuthenticated = !!user;
    const userPlan = user?.subscriptionPlan || null;
    const route = location.pathname;

    // Extrahiere Contract ID aus Path ODER Query Parameter
    let currentContractId: string | null = null;

    // 1. Versuche aus Path zu extrahieren (/contracts/abc123 - alte Detailseite)
    const pathMatch = route.match(/\/contracts\/([a-f0-9]+)/i);
    if (pathMatch) {
      currentContractId = pathMatch[1];
      console.log('🔍 [useAssistantContext] Contract ID aus PATH extrahiert:', currentContractId);
    }

    // 2. Falls nicht gefunden, versuche aus Query Parameter (?view=abc123 - Modal)
    if (!currentContractId) {
      const searchParams = new URLSearchParams(location.search);
      const viewParam = searchParams.get('view');
      if (viewParam && /^[a-f0-9]+$/i.test(viewParam)) {
        currentContractId = viewParam;
        console.log('🔍 [useAssistantContext] Contract ID aus QUERY extrahiert:', currentContractId);
      } else if (location.search) {
        console.log('⚠️ [useAssistantContext] Query params vorhanden, aber kein gültiges "view":', location.search);
      }
    }

    if (!currentContractId && route === '/contracts') {
      console.log('ℹ️ [useAssistantContext] Auf /contracts ohne Contract ID (Liste-Ansicht)');
    }

    // ============================================
    // MODE DETECTION LOGIC
    // ============================================

    // 1. SALES MODE: Nicht eingeloggt
    if (!isAuthenticated) {
      return {
        mode: "sales",
        page: route,
        route,
        userPlan: null,
        isAuthenticated: false,
        currentContractId: null,
      };
    }

    // 2. LEGAL MODE: Eingeloggt + Contract-Seiten + Premium/Business/Enterprise
    const legalRoutes = [
      "/contracts",
      "/optimizer",
      "/compare",
      "/generate",
      "/legalpulse",
    ];

    const isLegalRoute = legalRoutes.some((prefix) =>
      route.toLowerCase().startsWith(prefix.toLowerCase())
    );

    if (isLegalRoute) {
      // Free User auf Legal-Seiten: Zeige Product Mode (mit Upgrade-Hinweis)
      // Premium+ User: Voller Legal Mode
      const isPremiumOrHigher =
        userPlan === "premium" ||
        userPlan === "business" ||
        userPlan === "enterprise";

      if (isPremiumOrHigher) {
        return {
          mode: "legal",
          page: route,
          route,
          userPlan,
          isAuthenticated: true,
          currentContractId,
        };
      } else {
        // Free user auf Legal-Seite → Product Mode (kein Vertrags-Context)
        return {
          mode: "product",
          page: route,
          route,
          userPlan,
          isAuthenticated: true,
          currentContractId: null, // Kein Context für Free
        };
      }
    }

    // 3. PRODUCT MODE: Eingeloggt + alle anderen Seiten
    return {
      mode: "product",
      page: route,
      route,
      userPlan,
      isAuthenticated: true,
      currentContractId: null,
    };
  }, [location.pathname, location.search, user]);

  return context;
}

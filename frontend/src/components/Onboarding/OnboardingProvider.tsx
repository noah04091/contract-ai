// 📁 frontend/src/components/Onboarding/OnboardingProvider.tsx
// Enterprise Onboarding System v3.0 - Context Provider

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboarding } from '../../hooks/useOnboarding';
import { OnboardingModal } from './OnboardingModal';

interface OnboardingContextType {
  showModal: () => void;
  hideModal: () => void;
  isModalOpen: boolean;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
}

interface OnboardingProviderProps {
  children: ReactNode;
}

// Routes where onboarding modal should NOT show
const EXCLUDED_ROUTES = [
  '/login',
  '/register',
  '/reset-password',
  '/verify-email',
  '/forgot-password',
  '/pricing',
  '/features',
  '/blog',
  '/about',
  '/imprint',
  '/privacy',
  '/terms',
  '/contract-builder', // Full-screen app
];

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const location = useLocation();
  const { shouldShowModal, resetOnboarding: hookResetOnboarding } = useOnboarding();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔒 WICHTIG: Flag um zu verhindern, dass Modal nach Dismiss wieder erscheint
  // Sobald der User das Modal einmal schließt (Skip/Complete), wird es in dieser
  // Session NIEMALS wieder automatisch geöffnet - auch nicht bei Navigation.
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  // Check if current route is excluded
  const isExcludedRoute = EXCLUDED_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  // Also exclude public pages (no /dashboard, /contracts, etc.)
  const isAuthenticatedRoute = [
    '/dashboard',
    '/contracts',
    '/calendar',
    '/optimizer',
    '/compare',
    '/generate',
    '/chat',
    '/profile',
    '/envelopes',
    '/company-profile',
    '/legal-pulse',
    '/better-contracts'
  ].some(route => location.pathname.startsWith(route));

  // Show modal automatically for new users on authenticated routes
  // ⚠️ NUR wenn es noch nicht dismissed wurde!
  // Die früheren console.log-Ausgaben liefen bei jedem Kunden mit und legten den
  // internen Zustand offen, sobald jemand die Entwicklerkonsole öffnet. Für die
  // Fehlersuche waren sie hilfreich, in der Produktion haben sie nichts verloren.
  useEffect(() => {
    // 🔒 hasBeenDismissed verhindert erneutes Öffnen nach dem Schließen
    if (shouldShowModal && isAuthenticatedRoute && !isExcludedRoute && !hasBeenDismissed) {
      // Kurze Verzögerung, damit die Seite zuerst fertig zeichnet
      const timer = setTimeout(() => setIsModalOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowModal, isAuthenticatedRoute, isExcludedRoute, location.pathname, hasBeenDismissed]);

  const showModal = () => setIsModalOpen(true);

  // 🔒 hideModal setzt auch hasBeenDismissed auf true
  const hideModal = () => {
    setIsModalOpen(false);
    setHasBeenDismissed(true); // Verhindert erneutes automatisches Öffnen
  };

  const resetOnboarding = async () => {
    await hookResetOnboarding();
    setHasBeenDismissed(false); // Reset erlaubt erneutes Öffnen
    setIsModalOpen(true);
  };

  return (
    <OnboardingContext.Provider
      value={{
        showModal,
        hideModal,
        isModalOpen,
        resetOnboarding
      }}
    >
      {children}
      <OnboardingModal isOpen={isModalOpen} onClose={hideModal} />
    </OnboardingContext.Provider>
  );
}

export default OnboardingProvider;

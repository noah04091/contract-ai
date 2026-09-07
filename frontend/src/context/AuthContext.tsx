// 📁 frontend/src/context/AuthContext.tsx
// ✅ OPTIMIERT: Mit Caching um doppelte API-Calls zu vermeiden

import { createContext, useState, useEffect, useContext, useRef } from "react";
import { fetchUserData } from "../utils/fetchUserData";
import type { UserData } from "../utils/authUtils";

interface AuthContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  isLoading: boolean;
  refetchUser: () => Promise<void>;
}

// ✅ Cache-Konstanten
const CACHE_DURATION_MS = 2000; // 2 Sekunden Cache

// ✅ Export the context for useAuth hook
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ useAuth hook für bessere TypeScript-Sicherheit
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ✅ AuthProvider component - OPTIMIERT mit Caching
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Cache-Refs um doppelte Fetches zu vermeiden
  const lastFetchTime = useRef<number>(0);
  const fetchPromise = useRef<Promise<void> | null>(null);

  const refetchUser = async (force = false) => {
    const now = Date.now();

    // ✅ Wenn bereits ein Fetch läuft, auf diesen warten
    if (fetchPromise.current) {
      return fetchPromise.current;
    }

    // ✅ Cache-Check: Nicht erneut fetchen wenn kürzlich erfolgt (außer force=true)
    if (!force && lastFetchTime.current && (now - lastFetchTime.current) < CACHE_DURATION_MS) {
      return;
    }

    const doFetch = async () => {
      try {
        setIsLoading(true);
        const userData = await fetchUserData();
        setUser(userData);
        lastFetchTime.current = Date.now();
      } catch (error) {
        if (!(error instanceof Error && error.name === 'NotAuthenticated')) {
          console.error("❌ refetchUser Fehler:", error);
        }
        setUser(null);
      } finally {
        setIsLoading(false);
        fetchPromise.current = null;
      }
    };

    fetchPromise.current = doFetch();
    return fetchPromise.current;
  };

  useEffect(() => {
    refetchUser(true); // Force-Fetch beim ersten Mount
  }, []);

  const contextValue = { user, setUser, isLoading, refetchUser: () => refetchUser(true) };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Fast Refresh Fix - Dummy-Komponente
export default function AuthContextDummy() { 
  return null; 
}
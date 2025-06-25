// 📁 src/context/AuthContext.tsx - SIMPLIFIED: Cleaner solution
import { createContext, useState, useEffect, useContext } from "react";
import { fetchUserData } from "../utils/fetchUserData";
import type { UserData } from "../utils/authUtils";

interface AuthContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  isLoading: boolean;
  refetchUser: () => Promise<void>;
}

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

// ✅ AuthProvider component - only component export
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetchUser = async () => {
    try {
      setIsLoading(true);
      const userData = await fetchUserData();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUserData();
        setUser(userData);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []); // Läuft nur einmal beim Mount

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Fast Refresh Fix - Dummy-Komponente (für React Fast Refresh)
export default function AuthContextDummy() { 
  return null; 
}
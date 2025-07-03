// 📁 frontend/src/context/AuthContext.tsx
// ✅ VERBESSERTES DEBUGGING - Warum wird User-State nicht gesetzt?

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

// ✅ AuthProvider component - mit DEBUGGING
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ DEBUGGING: User-State-Änderungen loggen
  useEffect(() => {
    console.log("🔄 AuthContext User-State geändert:", user ? `${user.email} (${user.subscriptionPlan})` : "null");
  }, [user]);

  const refetchUser = async () => {
    console.log("🔄 refetchUser aufgerufen...");
    try {
      setIsLoading(true);
      const userData = await fetchUserData();
      
      console.log("✅ fetchUserData erfolgreich in refetchUser:", userData);
      console.log("🔄 Setze User-State in refetchUser...");
      
      setUser(userData);
      
      // ✅ DEBUGGING: Prüfen ob setUser funktioniert hat
      setTimeout(() => {
        console.log("🔍 User-State nach setUser in refetchUser:", userData.email);
      }, 100);
      
    } catch (error) {
      console.error("❌ refetchUser Fehler:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      console.log("🚀 AuthProvider: Lade User beim Start...");
      try {
        setIsLoading(true);
        const userData = await fetchUserData();
        
        console.log("✅ Initial fetchUserData erfolgreich:", userData);
        console.log("🔄 Setze initialen User-State...");
        
        setUser(userData);
        
        // ✅ DEBUGGING: Prüfen ob setUser funktioniert hat
        setTimeout(() => {
          console.log("🔍 Initial User-State nach setUser:", userData.email);
        }, 100);
        
      } catch (error) {
        console.error("❌ Initial loadUser Fehler:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
        console.log("✅ AuthProvider: Loading abgeschlossen");
      }
    };

    loadUser();
  }, []); // Läuft nur einmal beim Mount

  // ✅ DEBUGGING: Context-Value loggen
  const contextValue = { user, setUser, isLoading, refetchUser };
  
  useEffect(() => {
    console.log("🔄 AuthContext contextValue:", {
      hasUser: !!user,
      userEmail: user?.email,
      isLoading,
      userPlan: user?.subscriptionPlan
    });
  }, [user, isLoading]);

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
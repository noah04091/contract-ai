// 📁 src/components/RequireAuth.tsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiCall } from "../utils/api";

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // apiCall verwendet jetzt automatisch den Token aus localStorage
        const data = await apiCall("/auth/me");
        console.log("✅ Authentifizierung erfolgreich:", data.email);
        setIsAuthenticated(true);
      } catch (err) {
        console.warn("❌ Authentifizierung fehlgeschlagen:", err);
        
        // Prüfe zusätzlich den alten Token-Namen für Kompatibilität
        const legacyToken = localStorage.getItem('token');
        if (legacyToken) {
          try {
            // Manueller API-Aufruf mit dem alten Token
            const response = await fetch(`https://api.contract-ai.de/auth/me`, {
              headers: {
                "Authorization": `Bearer ${legacyToken}`
              }
            });
            
            if (response.ok) {
              console.log("✅ Legacy-Token-Authentifizierung erfolgreich");
              setIsAuthenticated(true);
              return;
            }
          } catch (legacyErr) {
            console.warn("❌ Legacy-Token-Authentifizierung fehlgeschlagen");
          }
        }
        
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem" }}>⏳ Authentifizierung wird geprüft...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
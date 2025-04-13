// 📁 src/components/RequireAuth.tsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiCall } from "../utils/api";

interface RequireAuthProps {
  children: React.ReactNode; // ✅ Beste Kompatibilität mit Routing und JSX
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiCall("/auth/me");
        console.log("✅ Eingeloggt als:", data.email);
        setIsAuthenticated(true);
      } catch (err) {
        console.warn("❌ Nicht eingeloggt");
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
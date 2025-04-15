import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include", // ✅ Cookies nutzen
        });

        if (!res.ok) throw new Error("Nicht authentifiziert");

        const data = await res.json();
        console.log("✅ Eingeloggt als:", data.email);

        if (!cancelled) setIsAuthenticated(true);
      } catch (err) {
        console.warn("❌ Nicht eingeloggt:", err);
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>🔐 Authentifizierung wird geprüft...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

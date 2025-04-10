// src/components/RequireAuth.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import React from "react";

interface DecodedToken {
  exp: number;
  email: string;
  iat: number;
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("📦 Loaded token:", token);

    if (!token) {
      console.warn("⚠️ Kein Token gefunden – weiterleiten zur Anmeldung");
      setIsValid(false);
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const now = Date.now() / 1000;

      if (!decoded.exp || decoded.exp < now) {
        console.warn("⚠️ Token ist abgelaufen");
        localStorage.removeItem("token");
        setIsValid(false);
        return;
      }

      console.log("✅ Token ist gültig – Zugriff erlaubt");
      setIsValid(true);
    } catch (err) {
      console.error("❌ Fehler beim Dekodieren des Tokens:", err);
      localStorage.removeItem("token");
      setIsValid(false);
    }
  }, []);

  useEffect(() => {
    if (isValid === false) {
      navigate("/login");
    }
  }, [isValid, navigate]);

  if (isValid === null) {
    return <div style={{ padding: "2rem" }}>⏳ Authentifizierung wird überprüft...</div>;
  }

  return <>{children}</>;
}

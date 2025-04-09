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

    if (!token) {
      setIsValid(false);
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const now = Date.now() / 1000;

      if (!decoded.exp || decoded.exp < now) {
        localStorage.removeItem("token");
        setIsValid(false);
        return;
      }

      setIsValid(true); // ✅ Token ist gültig
    } catch (err) {
      console.error("❌ Fehler beim Token-Check:", err);
      localStorage.removeItem("token");
      setIsValid(false);
    }
  }, []);

  useEffect(() => {
    if (isValid === false) {
      alert("🔐 Zugriff verweigert – bitte anmelden");
      navigate("/login");
    }
  }, [isValid, navigate]);

  if (isValid === null) return <div style={{ padding: "2rem" }}>⏳ Lade Auth...</div>;

  return <>{children}</>;
}

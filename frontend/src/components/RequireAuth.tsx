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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("⚠️ Bitte logge dich ein, um fortzufahren.");
        navigate("/login");
        return;
      }

      try {
        const decoded = jwtDecode<DecodedToken>(token);
        const now = Date.now() / 1000;

        if (!decoded?.exp || decoded.exp < now) {
          localStorage.removeItem("token");
          alert("🔒 Deine Sitzung ist abgelaufen. Bitte logge dich erneut ein.");
          navigate("/login");
          return;
        }

        // ✅ Alles gut – Zugriff erlaubt
        setLoading(false);
      } catch (err) {
        console.error("❌ Fehler beim Token-Check:", err);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    checkToken();
  }, [navigate]);

  if (loading) return null; // oder: <div>Lade...</div>

  return <>{children}</>;
}

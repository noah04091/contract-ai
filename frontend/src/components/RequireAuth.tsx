// 📁 src/components/RequireAuth.tsx
import { useEffect } from "react";
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

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("⚠️ Bitte einloggen, um fortzufahren.");
        return navigate("/login");
      }

      try {
        const decoded = jwtDecode<DecodedToken>(token);
        const now = Date.now() / 1000;

        if (!decoded?.exp || decoded.exp < now) {
          localStorage.removeItem("token");
          alert("🔒 Deine Sitzung ist abgelaufen. Bitte logge dich erneut ein.");
          return navigate("/login");
        }
      } catch (error) {
        console.error("❌ Fehler beim Token-Check:", error);
        localStorage.removeItem("token");
        return navigate("/login");
      }
    };

    checkToken();
  }, [navigate]);

  return <>{children}</>;
}

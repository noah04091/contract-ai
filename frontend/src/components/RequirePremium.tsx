// 📁 src/components/RequirePremium.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PremiumNotice from "./PremiumNotice";
import API_BASE_URL from "../utils/api";

interface Props {
  children: React.ReactNode;
}

export default function RequirePremium({ children }: Props) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include", // ✅ Cookie wird mitgeschickt
        });

        if (!res.ok) {
          console.warn("❌ Nicht eingeloggt");
          if (!cancelled) navigate("/login");
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setIsPremium(data.isPremium || data.subscriptionActive || false);
        }
      } catch (err) {
        console.error("❌ Fehler bei Premium-Check:", err);
        if (!cancelled) setIsPremium(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStatus();

    return () => {
      cancelled = true; // 🛡️ Cleanup gegen setState nach Unmount
    };
  }, [navigate]);

  if (loading || isPremium === null) return null; // 🔄 Alternativ Spinner möglich
  if (!isPremium) return <PremiumNotice />;

  return <>{children}</>;
}

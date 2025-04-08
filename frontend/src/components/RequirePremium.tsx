import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PremiumNotice from "./PremiumNotice";

interface Props {
  children: React.ReactNode;
}

export default function RequirePremium({ children }: Props) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch("http://https://contract-ai-backend.onrender.com/auth/me", {
          headers: { Authorization: token },
        });

        const data = await res.json();
        setIsPremium(data.subscriptionActive || false);
      } catch (err) {
        console.error("❌ Fehler bei Premium-Check:", err);
        setIsPremium(false);
      }
    };

    fetchStatus();
  }, [navigate]);

  if (isPremium === null) return null;
  if (isPremium === false) return <PremiumNotice />;

  return <>{children}</>;
}

import { useEffect, useState } from "react";
import UnifiedPremiumNotice from "./UnifiedPremiumNotice";

export default function PremiumNotice() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Nicht authentifiziert");

        const data = await res.json();
        setIsPremium(data.subscriptionActive === true);
      } catch (err) {
        console.error("❌ Fehler beim Laden des Abostatus:", err);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (loading || isPremium === null || isPremium === true) return null;

  return (
    <UnifiedPremiumNotice
      featureName="Diese Funktion"
    />
  );
}

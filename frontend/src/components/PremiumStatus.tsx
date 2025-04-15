import { useEffect, useState } from "react";

export default function PremiumStatus() {
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
        console.error("❌ Fehler beim Laden des Premium-Status:", err);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("❌ Fehler beim Weiterleiten zu Stripe");
      }
    } catch (err) {
      console.error("❌ Stripe Fehler:", err);
      alert("❌ Upgrade fehlgeschlagen.");
    }
  };

  if (loading || isPremium === null) {
    return <p>🔄 Lade Premium-Status...</p>;
  }

  return isPremium ? (
    <p style={{ color: "green", fontWeight: "bold" }}>
      💎 Du hast ein aktives Premium-Abo!
    </p>
  ) : (
    <div>
      <p style={{ color: "red", fontWeight: "bold" }}>⚠️ Kein aktives Abo</p>
      <button onClick={handleUpgrade}>💳 Jetzt auf Premium upgraden</button>
    </div>
  );
}

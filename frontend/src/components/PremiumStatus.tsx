import { useEffect, useState } from "react";

export default function PremiumStatus() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("https://contract-ai-backend.onrender.com/auth/me", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        const data = await res.json();
        setIsPremium(data.isPremium);
      } catch (err) {
        console.error("❌ Fehler beim Laden des Premium-Status:", err);
      }
    };

    fetchStatus();
  }, []);

  const handleUpgrade = async () => {
    try {
      const res = await fetch("https://contract-ai-backend.onrender.com/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
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

  if (isPremium === null) return <p>🔄 Lade Status...</p>;

  return isPremium ? (
    <p style={{ color: "green", fontWeight: "bold" }}>💎 Du hast ein aktives Premium-Abo!</p>
  ) : (
    <div>
      <p style={{ color: "red" }}>⚠️ Kein aktives Abo</p>
      <button onClick={handleUpgrade}>💳 Jetzt auf Premium upgraden</button>
    </div>
  );
}

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

  const handleUpgrade = () => {
    // Redirect zur Pricing-Seite, wo User Business oder Enterprise wählen kann
    window.location.href = "/pricing";
  };

  if (loading || isPremium === null) {
    return <p>🔄 Lade Abo-Status...</p>;
  }

  return isPremium ? (
    <p style={{ color: "green", fontWeight: "bold" }}>
      💎 Du hast ein aktives Abo!
    </p>
  ) : (
    <div>
      <p style={{ color: "red", fontWeight: "bold" }}>⚠️ Kein aktives Abo</p>
      <button onClick={handleUpgrade}>💳 Jetzt upgraden</button>
    </div>
  );
}

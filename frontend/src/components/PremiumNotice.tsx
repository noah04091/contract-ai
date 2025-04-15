import { useEffect, useState } from "react";
import styles from "../styles/PremiumNotice.module.css";

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
        alert("❌ Fehler beim Starten des Stripe-Checkouts");
      }
    } catch (err) {
      console.error("❌ Stripe Fehler:", err);
      alert("❌ Upgrade konnte nicht gestartet werden.");
    }
  };

  if (loading || isPremium === null || isPremium === true) return null;

  return (
    <div className={styles.notice}>
      <p>
        🔒 Diese Funktion ist nur mit aktivem <strong>Premium-Abo</strong> verfügbar.
      </p>
      <button onClick={handleUpgrade} className={styles.upgradeButton}>
        💎 Jetzt upgraden
      </button>
    </div>
  );
}

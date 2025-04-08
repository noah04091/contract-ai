// src/pages/Upgrade.tsx
import { useState } from "react";
import styles from "../styles/Upgrade.module.css";

export default function Upgrade() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://https://contract-ai-backend.onrender.com/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token") || "",
        },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Fehler beim Weiterleiten zu Stripe.");
      }
    } catch (err) {
      alert("Stripe-Verbindung fehlgeschlagen.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.upgradeContainer}>
      <h1>🚀 Contract AI Premium</h1>
      <p>Für nur <strong>9,90 € / Monat</strong> erhältst du unbegrenzten Zugang zu allen Funktionen.</p>

      <button onClick={handleUpgrade} disabled={loading} className={styles.upgradeButton}>
        {loading ? "Weiterleitung..." : "Jetzt upgraden mit Stripe"}
      </button>
    </div>
  );
}

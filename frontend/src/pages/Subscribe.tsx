// src/pages/Subscribe.tsx
import { useState } from "react";
import styles from "../styles/Subscribe.module.css";
import API_BASE_URL from "../utils/api";

export default function Subscribe() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Weiterleitung zu Stripe Checkout
      } else {
        alert("Fehler beim Starten des Zahlungsprozesses.");
      }
    } catch (err) {
      alert("❌ Fehler: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>🚀 Upgrade auf Premium</h2>
      <p>Für nur <strong>9,99 € / Monat</strong> erhältst du Zugriff auf alle Premium-Funktionen.</p>
      <button onClick={handleSubscribe} disabled={loading}>
        {loading ? "⏳ Weiterleitung..." : "💳 Jetzt abonnieren"}
      </button>
    </div>
  );
}

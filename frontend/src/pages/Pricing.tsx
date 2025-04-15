import styles from "../styles/Pricing.module.css";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Helmet } from "react-helmet-async";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpgrade = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "include",
      });

      const data: { url?: string; message?: string } = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.message || "Fehler beim Stripe-Checkout");
      }

      window.location.href = data.url;
    } catch (error) {
      const err = error as Error;
      alert("❌ Fehler beim Upgrade: " + err.message);
      navigate("/dashboard?status=error");
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      title: "Free",
      price: "0€",
      features: [
        "1 Vertragsanalyse pro Monat",
        "Basis-Upload & PDF-Anzeige",
        "Keine Optimierung oder Vergleich",
      ],
      button: (
        <button className={styles.btnOutline} onClick={() => navigate("/register")}>
          Kostenlos starten
        </button>
      ),
    },
    {
      title: "Premium",
      price: "9,90€/Monat",
      features: [
        "Unbegrenzte Analysen",
        "Vertragsvergleich & Optimierung",
        "KI-Chat & Erinnerungen",
        "Vertragserstellung mit KI",
        "Exklusiver Support",
      ],
      highlight: true,
      button: (
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className={styles.btnFilled}
        >
          {loading ? "⏳ Lade Stripe..." : "Upgrade starten"}
        </button>
      ),
    },
  ];

  const featureMatrix = [
    { feature: "Analysen pro Monat", free: "1", premium: "Unbegrenzt" },
    { feature: "Vertragsvergleich & Optimierung", free: "–", premium: "✓" },
    { feature: "KI-Zusammenfassung & Score", free: "✓", premium: "✓" },
    { feature: "Erinnerungen per E-Mail", free: "–", premium: "✓" },
    { feature: "Vertragserstellung per KI", free: "–", premium: "✓" },
    { feature: "KI-Chat zum Vertrag", free: "–", premium: "✓" },
    { feature: "PDF-Export mit Branding", free: "–", premium: "✓" },
    { feature: "Exklusiver Support", free: "Community", premium: "✓" },
  ];

  return (
    <div className={styles.container}>
      <Helmet>
        <title>Preise | Contract AI</title>
        <meta
          name="description"
          content="Vergleiche unsere Contract-AI-Pakete: Kostenloser Einstieg oder Premium mit unbegrenzten Analysen, KI-Optimierung und Support."
        />
      </Helmet>

      <h1 className={styles.title}>💰 Unsere Preise</h1>
      <p className={styles.subtitle}>Wähle das passende Paket für deinen Bedarf</p>

      <div className={styles.plans}>
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`${styles.card} ${plan.highlight ? styles.highlight : ""}`}
          >
            <h2 className={styles.planTitle}>{plan.title}</h2>
            <p className={styles.price}>{plan.price}</p>

            <ul className={styles.features}>
              {plan.features.map((feature, i) => (
                <li key={i}>
                  <CheckCircle size={16} /> {feature}
                </li>
              ))}
            </ul>

            <div className={styles.buttonBox}>{plan.button}</div>
          </div>
        ))}
      </div>

      <h2 style={{ textAlign: "center", marginTop: "4rem" }}>🔍 Vergleich der Funktionen</h2>
      <div style={{ overflowX: "auto", marginTop: "1rem" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ padding: "1rem", textAlign: "left" }}>Funktion</th>
              <th style={{ padding: "1rem", textAlign: "center" }}>Free</th>
              <th style={{ padding: "1rem", textAlign: "center" }}>Premium</th>
            </tr>
          </thead>
          <tbody>
            {featureMatrix.map((item, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.75rem" }}>{item.feature}</td>
                <td style={{ padding: "0.75rem", textAlign: "center" }}>{item.free}</td>
                <td style={{ padding: "0.75rem", textAlign: "center" }}>{item.premium}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ textAlign: "center", marginTop: "2rem", color: "#444" }}>
        Keine Kündigungsfrist. Jederzeit kündbar.
      </p>
    </div>
  );
}

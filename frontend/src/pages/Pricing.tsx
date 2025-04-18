import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "../styles/Pricing.module.css";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'table'>('cards');
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
      period: "für immer",
      features: [
        "1 Vertragsanalyse pro Monat",
        "Basis-Upload & PDF-Anzeige",
        "KI-Zusammenfassung & Score",
        "Community Support",
      ],
      limitations: [
        "Keine Optimierung oder Vergleich",
        "Keine Erinnerungen",
        "Keine KI-Vertragserstellung",
      ],
      button: (
        <motion.button 
          className={styles.btnOutline} 
          onClick={() => navigate("/register")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          Kostenlos starten
        </motion.button>
      ),
    },
    {
      title: "Premium",
      price: "9,90€",
      period: "pro Monat",
      features: [
        "Unbegrenzte Analysen",
        "Vertragsvergleich & Optimierung",
        "KI-Chat & Erinnerungen",
        "Vertragserstellung mit KI",
        "PDF-Export mit Branding",
        "Exklusiver Support",
      ],
      highlight: true,
      button: (
        <motion.button
          onClick={handleUpgrade}
          disabled={loading}
          className={styles.btnFilled}
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {loading ? (
            <>
              <span className={styles.loadingSpinner}></span>
              <span>Lade Stripe...</span>
            </>
          ) : (
            <>
              Upgrade starten
              <ExternalLink size={16} className={styles.buttonIcon} />
            </>
          )}
        </motion.button>
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

      <motion.div 
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1 
          className={styles.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Wähle dein Paket
        </motion.h1>
        <motion.p 
          className={styles.subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Finde den perfekten Plan für deine Vertragsmanagement-Bedürfnisse
        </motion.p>
      </motion.div>

      <div className={styles.viewToggle}>
        <button 
          className={`${styles.toggleButton} ${activeTab === 'cards' ? styles.activeToggle : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          Pläne
        </button>
        <button 
          className={`${styles.toggleButton} ${activeTab === 'table' ? styles.activeToggle : ''}`}
          onClick={() => setActiveTab('table')}
        >
          Vergleich
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'cards' && (
          <motion.div 
            className={styles.plansContainer}
            key="plans"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.plans}>
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  className={`${styles.card} ${plan.highlight ? styles.highlight : ""}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.4 }}
                  whileHover={{ y: -5, boxShadow: plan.highlight ? 
                    "0 20px 40px rgba(0, 113, 227, 0.15)" : 
                    "0 20px 40px rgba(0, 0, 0, 0.08)" 
                  }}
                >
                  {plan.highlight && <div className={styles.popularBadge}>Beliebt</div>}
                  
                  <div className={styles.cardHeader}>
                    <h2 className={styles.planTitle}>{plan.title}</h2>
                    <div className={styles.priceContainer}>
                      <p className={styles.price}>{plan.price}</p>
                      <span className={styles.period}>{plan.period}</span>
                    </div>
                  </div>

                  <div className={styles.cardContent}>
                    <ul className={styles.features}>
                      {plan.features.map((feature, i) => (
                        <li key={i}>
                          <CheckCircle size={16} className={styles.featureIcon} /> {feature}
                        </li>
                      ))}
                    </ul>

                    {plan.limitations && (
                      <ul className={styles.limitations}>
                        {plan.limitations.map((limitation, i) => (
                          <li key={i}>
                            <X size={16} className={styles.limitationIcon} /> {limitation}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className={styles.buttonBox}>{plan.button}</div>
                </motion.div>
              ))}
            </div>

            <motion.p 
              className={styles.cancellationNote}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              Keine Kündigungsfrist. Jederzeit kündbar.
            </motion.p>
          </motion.div>
        )}

        {activeTab === 'table' && (
          <motion.div 
            className={styles.tableContainer}
            key="table"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.tableWrapper}>
              <table className={styles.featureTable}>
                <thead>
                  <tr>
                    <th className={styles.featureColumn}>Funktion</th>
                    <th className={styles.planColumn}>Free</th>
                    <th className={`${styles.planColumn} ${styles.premiumColumn}`}>Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {featureMatrix.map((item, index) => (
                    <tr key={index}>
                      <td className={styles.featureCell}>{item.feature}</td>
                      <td className={styles.freeCell}>
                        {item.free === "✓" ? (
                          <CheckCircle size={18} className={styles.checkIcon} />
                        ) : item.free === "–" ? (
                          <span className={styles.dash}>–</span>
                        ) : (
                          item.free
                        )}
                      </td>
                      <td className={`${styles.premiumCell}`}>
                        {item.premium === "✓" ? (
                          <CheckCircle size={18} className={styles.checkIcon} />
                        ) : item.premium === "–" ? (
                          <span className={styles.dash}>–</span>
                        ) : (
                          item.premium
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className={styles.tableActions}>
              <motion.button
                onClick={handleUpgrade}
                disabled={loading}
                className={styles.btnFilled}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {loading ? (
                  <>
                    <span className={styles.loadingSpinner}></span>
                    <span>Lade Stripe...</span>
                  </>
                ) : (
                  "Premium aktivieren"
                )}
              </motion.button>
              
              <motion.p 
                className={styles.cancellationNote}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                Keine Kündigungsfrist. Jederzeit kündbar.
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
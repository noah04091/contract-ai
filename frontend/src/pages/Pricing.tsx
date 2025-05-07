import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X, ExternalLink, Star, Zap, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "../styles/Pricing.module.css";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'table'>('cards');
  const navigate = useNavigate();

  const handleUpgrade = async (planId: string = 'premium') => {
    setLoading(true);

    try {
      const res = await fetch(`/api/stripe/create-checkout-session?plan=${planId}`, {
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
      id: "free",
      title: "Free",
      price: "0€",
      period: "für immer",
      icon: <Users size={20} className={styles.planIcon} />,
      description: "Perfekt zum Testen und für gelegentliche Nutzung",
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
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          Kostenlos starten
        </motion.button>
      ),
    },
    {
      id: "business",
      title: "Business",
      price: "4,90€",
      period: "pro Monat",
      icon: <Zap size={20} className={styles.planIcon} />,
      description: "Für Freelancer und kleine Teams",
      features: [
        "5 Vertragsanalysen pro Monat",
        "Vertragsvergleich & Optimierung",
        "KI-Chat zum Vertrag",
        "Erinnerungen per E-Mail",
        "Standard Support",
      ],
      highlight: true,
      popular: true,
      button: (
        <motion.button
          onClick={() => handleUpgrade('business')}
          disabled={loading}
          className={styles.btnFilled}
          whileHover={!loading ? { scale: 1.03 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {loading ? (
            <>
              <span className={styles.loadingSpinner}></span>
              <span>Lade Stripe...</span>
            </>
          ) : (
            "Business starten"
          )}
        </motion.button>
      ),
    },
    {
      id: "premium",
      title: "Premium",
      price: "9,90€",
      period: "pro Monat",
      icon: <Star size={20} className={styles.planIcon} />,
      description: "Unbegrenzte Features für Profis",
      features: [
        "Unbegrenzte Analysen",
        "Vertragsvergleich & Optimierung",
        "KI-Chat & Erinnerungen",
        "Vertragserstellung mit KI",
        "PDF-Export mit Branding",
        "Exklusiver Premium Support",
      ],
      button: (
        <motion.button
          onClick={() => handleUpgrade('premium')}
          disabled={loading}
          className={`${styles.btnGradient}`}
          whileHover={!loading ? { scale: 1.03 } : {}}
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
              Premium aktivieren
              <ExternalLink size={16} className={styles.buttonIcon} />
            </>
          )}
        </motion.button>
      ),
    },
  ];

  const featureMatrix = [
    { feature: "Analysen pro Monat", free: "1", business: "5", premium: "Unbegrenzt" },
    { feature: "Vertragsvergleich", free: "–", business: "✓", premium: "✓" },
    { feature: "Vertragsoptimierung", free: "–", business: "✓", premium: "✓" },
    { feature: "KI-Zusammenfassung & Score", free: "✓", business: "✓", premium: "✓" },
    { feature: "Erinnerungen per E-Mail", free: "–", business: "✓", premium: "✓" },
    { feature: "Vertragserstellung per KI", free: "–", business: "–", premium: "✓" },
    { feature: "KI-Chat zum Vertrag", free: "–", business: "Basis", premium: "Erweitert" },
    { feature: "PDF-Export mit Branding", free: "–", business: "–", premium: "✓" },
    { feature: "Support", free: "Community", business: "Standard", premium: "Premium" },
  ];

  // Subtle background animation
  const backgroundVariants = {
    animate: {
      background: [
        "linear-gradient(120deg, rgba(250,250,255,1) 0%, rgba(240,245,255,1) 100%)",
        "linear-gradient(120deg, rgba(245,250,255,1) 0%, rgba(235,245,255,1) 100%)",
        "linear-gradient(120deg, rgba(250,250,255,1) 0%, rgba(240,245,255,1) 100%)",
      ],
      transition: {
        duration: 15,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
  };

  return (
    <motion.div 
      className={styles.container}
      variants={backgroundVariants}
      animate="animate"
    >
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
                  whileHover={{ 
                    y: -8, 
                    boxShadow: plan.highlight ? 
                      "0 25px 50px rgba(0, 113, 227, 0.15)" : 
                      "0 25px 50px rgba(0, 0, 0, 0.08)" 
                  }}
                >
                  {plan.popular && <div className={styles.popularBadge}>Beliebt</div>}
                  
                  <div className={styles.cardHeader}>
                    <div className={styles.planTitleGroup}>
                      {plan.icon}
                      <h2 className={styles.planTitle}>{plan.title}</h2>
                    </div>
                    <div className={styles.priceContainer}>
                      <p className={styles.price}>{plan.price}</p>
                      <span className={styles.period}>{plan.period}</span>
                    </div>
                    <p className={styles.planDescription}>{plan.description}</p>
                  </div>

                  <div className={styles.cardContent}>
                    <ul className={styles.features}>
                      {plan.features.map((feature, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 + 0.5 }}
                        >
                          <CheckCircle size={16} className={styles.featureIcon} /> {feature}
                        </motion.li>
                      ))}
                    </ul>

                    {plan.limitations && (
                      <ul className={styles.limitations}>
                        {plan.limitations.map((limitation, i) => (
                          <motion.li 
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 + 0.8 }}
                          >
                            <X size={16} className={styles.limitationIcon} /> {limitation}
                          </motion.li>
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
                    <th className={`${styles.planColumn} ${styles.businessColumn}`}>Business</th>
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
                      <td className={`${styles.businessCell}`}>
                        {item.business === "✓" ? (
                          <CheckCircle size={18} className={styles.checkIcon} />
                        ) : item.business === "–" ? (
                          <span className={styles.dash}>–</span>
                        ) : (
                          item.business
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
              <div className={styles.actionButtons}>
                <motion.button
                  onClick={() => handleUpgrade('business')}
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
                    "Business aktivieren"
                  )}
                </motion.button>

                <motion.button
                  onClick={() => handleUpgrade('premium')}
                  disabled={loading}
                  className={styles.btnGradient}
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
              </div>
              
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
    </motion.div>
  );
}
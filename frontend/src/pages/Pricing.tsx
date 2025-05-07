import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X, ExternalLink, Users, Zap, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "../styles/Pricing.module.css";

// Typdefinitionen
interface PlanButton {
  text: string;
  action: () => void;
  variant: "outline" | "filled" | "gradient";
  icon?: ReactNode;
}

interface Plan {
  id: string;
  title: string;
  price: string;
  period: string;
  icon: ReactNode;
  description: string;
  features: string[];
  limitations?: string[];
  color: string;
  popular?: boolean;
  button: PlanButton;
}

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'table'>('cards');
  const [animateCards, setAnimateCards] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger card animations after component mount
    const timer = setTimeout(() => {
      setAnimateCards(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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

  const plans: Plan[] = [
    {
      id: "free",
      title: "Free",
      price: "0€",
      period: "für immer",
      icon: <Users size={20} />,
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
      color: "#006EFC",
      button: {
        text: "Kostenlos starten",
        action: () => navigate("/register"),
        variant: "outline" as const
      }
    },
    {
      id: "business",
      title: "Business",
      price: "4,90€",
      period: "pro Monat",
      icon: <Zap size={20} />,
      description: "Für Freelancer und kleine Teams",
      features: [
        "5 Vertragsanalysen pro Monat",
        "Vertragsvergleich & Optimierung",
        "KI-Chat zum Vertrag",
        "Erinnerungen per E-Mail",
        "Standard Support",
      ],
      color: "#0057D9",
      popular: true,
      button: {
        text: "Business starten",
        action: () => handleUpgrade('business'),
        variant: "filled" as const
      }
    },
    {
      id: "premium",
      title: "Premium",
      price: "9,90€",
      period: "pro Monat",
      icon: <Star size={20} />,
      description: "Unbegrenzte Features für Profis",
      features: [
        "Unbegrenzte Analysen",
        "Vertragsvergleich & Optimierung",
        "KI-Chat & Erinnerungen",
        "Vertragserstellung mit KI",
        "PDF-Export mit Branding",
        "Exklusiver Premium Support",
      ],
      color: "#0040A0",
      button: {
        text: "Premium aktivieren",
        action: () => handleUpgrade('premium'),
        variant: "gradient" as const,
        icon: <ExternalLink size={16} />
      }
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

  // Render buttons based on plan configuration
  const renderButton = (plan: Plan, isLoading = false) => {
    if (plan.button.variant === "outline") {
      return (
        <motion.button 
          className={styles.btnOutline} 
          onClick={plan.button.action}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {plan.button.text}
        </motion.button>
      );
    } else if (plan.button.variant === "filled") {
      return (
        <motion.button
          onClick={plan.button.action}
          disabled={isLoading}
          className={styles.btnFilled}
          whileHover={!isLoading ? { scale: 1.03 } : {}}
          whileTap={!isLoading ? { scale: 0.98 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          style={{
            background: isLoading ? undefined : plan.color,
            boxShadow: isLoading ? undefined : `0 4px 12px ${plan.color}30`
          }}
        >
          {isLoading ? (
            <>
              <span className={styles.loadingSpinner}></span>
              <span>Lade Stripe...</span>
            </>
          ) : (
            <>
              {plan.button.text}
              {plan.button.icon && plan.button.icon}
            </>
          )}
        </motion.button>
      );
    } else {
      return (
        <motion.button
          onClick={plan.button.action}
          disabled={isLoading}
          className={styles.btnGradient}
          whileHover={!isLoading ? { scale: 1.03 } : {}}
          whileTap={!isLoading ? { scale: 0.98 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          style={{
            background: isLoading ? undefined : `linear-gradient(90deg, ${plan.color} 0%, ${plan.color}CF 100%)`,
            boxShadow: isLoading ? undefined : `0 4px 15px ${plan.color}40`
          }}
        >
          {isLoading ? (
            <>
              <span className={styles.loadingSpinner}></span>
              <span>Lade Stripe...</span>
            </>
          ) : (
            <>
              {plan.button.text}
              {plan.button.icon && <span className={styles.buttonIcon}>{plan.button.icon}</span>}
            </>
          )}
        </motion.button>
      );
    }
  };

  return (
    <div className={styles.pageWrapper}>
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
                    className={styles.cardWrapper}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ 
                      opacity: animateCards ? 1 : 0, 
                      y: animateCards ? 0 : 30 
                    }}
                    transition={{ 
                      delay: index * 0.1 + 0.2, 
                      duration: 0.5,
                      ease: [0.23, 1, 0.32, 1]
                    }}
                  >
                    <div 
                      className={`${styles.card} ${plan.popular ? styles.popularCard : ''}`}
                    >
                      {plan.popular && (
                        <div className={styles.popularBadge}>
                          Beliebt
                        </div>
                      )}
                      
                      <div className={styles.cardHeader}>
                        <div 
                          className={styles.iconWrapper} 
                          style={{ 
                            color: plan.color,
                            background: `${plan.color}15`
                          }}
                        >
                          {plan.icon}
                        </div>
                        <h2 className={styles.planTitle}>{plan.title}</h2>
                        <p className={styles.planDescription}>{plan.description}</p>
                        <div className={styles.priceContainer}>
                          <p className={styles.price}>{plan.price}</p>
                          <span className={styles.period}>{plan.period}</span>
                        </div>
                      </div>

                      <div className={styles.divider}></div>

                      <div className={styles.cardContent}>
                        <ul className={styles.features}>
                          {plan.features.map((feature, i) => (
                            <motion.li 
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: animateCards ? 1 : 0, x: animateCards ? 0 : -10 }}
                              transition={{ delay: i * 0.05 + index * 0.1 + 0.5 }}
                            >
                              <CheckCircle size={16} className={styles.featureIcon} style={{ color: plan.color }} /> 
                              <span>{feature}</span>
                            </motion.li>
                          ))}
                        </ul>

                        {plan.limitations && (
                          <ul className={styles.limitations}>
                            {plan.limitations.map((limitation, i) => (
                              <motion.li 
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: animateCards ? 1 : 0, x: animateCards ? 0 : -10 }}
                                transition={{ delay: i * 0.05 + plan.features.length * 0.05 + index * 0.1 + 0.5 }}
                              >
                                <X size={16} className={styles.limitationIcon} /> 
                                <span>{limitation}</span>
                              </motion.li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className={styles.buttonBox}>
                        {renderButton(plan, loading)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.p 
                className={styles.cancellationNote}
                initial={{ opacity: 0 }}
                animate={{ opacity: animateCards ? 1 : 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
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
                            <CheckCircle size={18} className={styles.checkIcon} style={{ color: plans[0].color }} />
                          ) : item.free === "–" ? (
                            <span className={styles.dash}>–</span>
                          ) : (
                            item.free
                          )}
                        </td>
                        <td className={`${styles.businessCell}`}>
                          {item.business === "✓" ? (
                            <CheckCircle size={18} className={styles.checkIcon} style={{ color: plans[1].color }} />
                          ) : item.business === "–" ? (
                            <span className={styles.dash}>–</span>
                          ) : (
                            item.business
                          )}
                        </td>
                        <td className={`${styles.premiumCell}`}>
                          {item.premium === "✓" ? (
                            <CheckCircle size={18} className={styles.checkIcon} style={{ color: plans[2].color }} />
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
                    style={{
                      background: loading ? undefined : plans[1].color,
                      boxShadow: loading ? undefined : `0 4px 12px ${plans[1].color}30`
                    }}
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
                    style={{
                      background: loading ? undefined : `linear-gradient(90deg, ${plans[2].color} 0%, ${plans[2].color}CF 100%)`,
                      boxShadow: loading ? undefined : `0 4px 15px ${plans[2].color}40`
                    }}
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
      </div>
    </div>
  );
}
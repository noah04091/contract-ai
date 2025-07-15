import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X, ExternalLink, Users, Zap, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
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

  // Stripe Checkout Funktion
  const startCheckout = async (plan: string) => {
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
      });

      const data: { url?: string; message?: string } = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.message || "Fehler beim Stripe-Checkout");
      }

      // Weiterleitung zur Stripe Checkout URL
      window.location.href = data.url;
    } catch (error) {
      const err = error as Error;
      alert("❌ Fehler beim Checkout: " + err.message);
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
      icon: <Users size={22} />,
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
      color: "#0080FF",
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
      icon: <Zap size={22} />,
      description: "Für Freelancer und kleine Teams",
      features: [
        "5 Vertragsanalysen pro Monat",
        "Vertragsvergleich & Optimierung",
        "KI-Chat zum Vertrag",
        "Erinnerungen per E-Mail",
        "Standard Support",
      ],
      color: "#2D7FF9",
      popular: true,
      button: {
        text: "Business starten",
        action: () => startCheckout('business'),
        variant: "filled" as const
      }
    },
    {
      id: "premium",
      title: "Premium",
      price: "9,90€",
      period: "pro Monat",
      icon: <Star size={22} />,
      description: "Unbegrenzte Features für Profis",
      features: [
        "Unbegrenzte Analysen",
        "Vertragsvergleich & Optimierung",
        "KI-Chat & Erinnerungen",
        "Vertragserstellung mit KI",
        "PDF-Export mit Branding",
        "Exklusiver Premium Support",
      ],
      color: "#0062E0",
      button: {
        text: "Premium aktivieren",
        action: () => startCheckout('premium'),
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

  // Card animation variants
  const cardWrapperVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15 + 0.2,
        duration: 0.6,
        ease: [0.23, 1, 0.32, 1]
      }
    })
  };

  // Hover animation für Karten
  const cardHoverVariants = {
    initial: { y: 0, boxShadow: "0 10px 40px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.1)" },
    hover: (i: number) => ({
      y: -10,
      boxShadow: i === 1 
        ? "0 30px 60px rgba(45, 127, 249, 0.2)" 
        : "0 30px 60px rgba(0, 0, 0, 0.1)",
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    })
  };
  
  // Button hover animation
  const buttonHoverVariants = {
    initial: { scale: 1, y: 0 },
    hover: { scale: 1.02, y: -2 },
    tap: { scale: 0.98 },
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  };

  // Feature list animation
  const featureItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (customDelay: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: customDelay,
        duration: 0.5
      }
    })
  };

  // Table row animation
  const tableRowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05 + 0.3,
        duration: 0.5
      }
    })
  };

  // Hintergrund animation
  const backgroundVariants = {
    animate: {
      backgroundPosition: ["0% 0%", "100% 100%"],
      transition: {
        duration: 20,
        ease: "linear",
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    }
  };

  // Render buttons basierend auf Plan-Konfiguration
  const renderButton = (plan: Plan, isLoading = false) => {
    if (plan.button.variant === "outline") {
      return (
        <motion.button 
          className={styles.btnOutline} 
          onClick={plan.button.action}
          variants={buttonHoverVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          style={{
            borderColor: plan.color,
            color: plan.color
          }}
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
          variants={buttonHoverVariants}
          initial="initial"
          whileHover={!isLoading ? "hover" : undefined}
          whileTap={!isLoading ? "tap" : undefined}
          style={{
            backgroundColor: isLoading ? undefined : plan.color,
            boxShadow: isLoading ? undefined : `0 8px 20px ${plan.color}40`
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
          variants={buttonHoverVariants}
          initial="initial"
          whileHover={!isLoading ? "hover" : undefined}
          whileTap={!isLoading ? "tap" : undefined}
          style={{
            background: isLoading ? undefined : `linear-gradient(135deg, ${plan.color} 0%, ${plan.color}BB 100%)`,
            boxShadow: isLoading ? undefined : `0 8px 25px ${plan.color}50`
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
    <>
      <Helmet>
        <title>Preise – Contract AI | Flexible Abos für deine Vertragsanalyse</title>
        <meta name="description" content="Wähle deinen passenden Plan für KI-gestützte Vertragsanalyse & Optimierung. Schon ab 4,90 € im Monat. Jetzt starten & volle Kontrolle sichern!" />
        <meta name="keywords" content="Preise Contract AI, Vertragsanalyse Abo, Vertragsoptimierung Kosten, SaaS Preismodelle, Vertragsmanagement Preise" />
        <link rel="canonical" href="https://contract-ai.de/pricing" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Preise – Contract AI | Flexible Abos für deine Vertragsanalyse" />
        <meta property="og:description" content="Entdecke die passenden Pläne für deine KI-gestützte Vertragsanalyse & Optimierung. Ab 4,90 € monatlich. Jetzt loslegen!" />
        <meta property="og:url" content="https://contract-ai.de/pricing" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Preise – Contract AI | Flexible Abos für deine Vertragsanalyse" />
        <meta name="twitter:description" content="KI-gestützte Vertragsanalyse & Optimierung schon ab 4,90 €/Monat. Wähle deinen Plan & sichere dir volle Kontrolle. Jetzt starten!" />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>

      <motion.div 
        className={styles.pageWrapper}
        variants={backgroundVariants}
        animate="animate"
        style={{
          backgroundSize: "400% 400%",
          background: "linear-gradient(135deg, #f5f7fb 0%, #eef2f6 25%, #eff4f9 50%, #edf1f5 75%, #f0f4f8 100%)",
        }}
      >
        <div className={styles.container}>
          <motion.div 
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
            <motion.h1 
              className={styles.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            >
              Wähle dein Paket
            </motion.h1>
            <motion.p 
              className={styles.subtitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            >
              Finde den perfekten Plan für deine Vertragsmanagement-Bedürfnisse
            </motion.p>
          </motion.div>



          <motion.div 
            className={styles.viewToggle}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
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
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            {activeTab === 'cards' && (
              <motion.div 
                className={styles.plansContainer}
                key="plans"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className={styles.plans}>
                  {plans.map((plan, index) => (
                    <motion.div
                      key={index}
                      className={styles.cardWrapper}
                      custom={index}
                      variants={cardWrapperVariants}
                      initial="hidden"
                      animate={animateCards ? "visible" : "hidden"}
                      style={{
                        transformStyle: 'preserve-3d',
                        perspective: '1000px'
                      }}
                    >
                      <motion.div 
                        className={`${styles.card} ${plan.popular ? styles.popularCard : ''}`}
                        custom={index === 1 ? 1 : 0}
                        variants={cardHoverVariants}
                        initial="initial"
                        whileHover="hover"
                        style={{
                          borderColor: plan.popular ? `${plan.color}30` : undefined,
                          boxShadow: plan.popular ? `0 20px 40px ${plan.color}20` : undefined
                        }}
                      >
                        {/* Popular Badge */}
                        {plan.popular && (
                          <div className={styles.popularBadge} style={{ background: plan.color }}>
                            Beliebt
                          </div>
                        )}
                        
                        {/* Card Header */}
                        <div className={styles.cardHeader}>
                          <motion.div 
                            className={styles.iconWrapper} 
                            style={{ 
                              color: plan.color,
                              background: `${plan.color}12`
                            }}
                            whileHover={{
                              scale: 1.05, 
                              boxShadow: `0 3px 10px ${plan.color}20`
                            }}
                            transition={{ 
                              type: "spring", 
                              stiffness: 500, 
                              damping: 30 
                            }}
                          >
                            {plan.icon}
                          </motion.div>
                          <h2 className={styles.planTitle}>{plan.title}</h2>
                          <p className={styles.planDescription}>{plan.description}</p>
                          
                          <div className={styles.priceContainer}>
                            <p className={styles.price} style={{ color: plan.popular ? plan.color : undefined }}>
                              {plan.price}
                            </p>
                            <span className={styles.period}>{plan.period}</span>
                          </div>
                        </div>

                        <div className={styles.divider}></div>

                        {/* Card Content */}
                        <div className={styles.cardContent}>
                          <ul className={styles.features}>
                            {plan.features.map((feature, i) => (
                              <motion.li 
                                key={i}
                                variants={featureItemVariants}
                                custom={i * 0.07 + index * 0.15 + 0.5}
                                initial="hidden"
                                animate={animateCards ? "visible" : "hidden"}
                                whileHover={{
                                  x: 2,
                                  transition: { 
                                    type: "spring", 
                                    stiffness: 500, 
                                    damping: 30 
                                  }
                                }}
                              >
                                <CheckCircle 
                                  size={16} 
                                  className={styles.featureIcon} 
                                  style={{ color: plan.color }} 
                                /> 
                                <span>{feature}</span>
                              </motion.li>
                            ))}
                          </ul>

                          {plan.limitations && (
                            <ul className={styles.limitations}>
                              {plan.limitations.map((limitation, i) => (
                                <motion.li 
                                  key={i}
                                  variants={featureItemVariants}
                                  custom={i * 0.07 + plan.features.length * 0.07 + index * 0.15 + 0.5}
                                  initial="hidden"
                                  animate={animateCards ? "visible" : "hidden"}
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
                      </motion.div>
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
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              >
                <motion.div 
                  className={styles.tableWrapper}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                >
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
                        <motion.tr 
                          key={index}
                          variants={tableRowVariants}
                          custom={index}
                          initial="hidden"
                          animate="visible"
                          whileHover={{ backgroundColor: "rgba(245, 247, 250, 0.8)" }}
                        >
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
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
                
                <div className={styles.tableActions}>
                  <div className={styles.actionButtons}>
                    <motion.button
                      onClick={() => startCheckout('business')}
                      disabled={loading}
                      className={styles.btnFilled}
                      variants={buttonHoverVariants}
                      initial="initial"
                      whileHover={!loading ? "hover" : undefined}
                      whileTap={!loading ? "tap" : undefined}
                      style={{
                        background: loading ? undefined : plans[1].color,
                        boxShadow: loading ? undefined : `0 8px 20px ${plans[1].color}40`
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
                      onClick={() => startCheckout('premium')}
                      disabled={loading}
                      className={styles.btnGradient}
                      variants={buttonHoverVariants}
                      initial="initial"
                      whileHover={!loading ? "hover" : undefined}
                      whileTap={!loading ? "tap" : undefined}
                      style={{
                        background: loading ? undefined : `linear-gradient(135deg, ${plans[2].color} 0%, ${plans[2].color}BB 100%)`,
                        boxShadow: loading ? undefined : `0 8px 25px ${plans[2].color}50`
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
                    transition={{ delay: 0.8, duration: 0.5 }}
                  >
                    Keine Kündigungsfrist. Jederzeit kündbar.
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
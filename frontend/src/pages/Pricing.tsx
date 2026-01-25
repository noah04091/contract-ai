import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Zap, Star, Shield, ChevronDown, TrendingUp, Users, Calendar, Bell, Download, Sparkles, Lock, ArrowRight, Eye, Search, FolderOpen, Clock, Smartphone, PenTool } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Footer from "../components/Footer";
import styles from "../styles/Pricing.module.css";
import "../styles/landing.css";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [filledSpots, setFilledSpots] = useState(47);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'business' | 'enterprise' | null>(null);
  const navigate = useNavigate();

  // Load current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        setCurrentPlan(null);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          const user = data.user || data;

          if (user.subscriptionPlan === 'enterprise' || user.isEnterprise) {
            setCurrentPlan('enterprise');
          } else if (user.subscriptionPlan === 'business' || user.isBusiness) {
            setCurrentPlan('business');
          } else {
            setCurrentPlan('free');
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden des Abo-Status:', error);
      }
    };

    checkSubscription();
  }, []);

  // Urgency Data - 14-Tage Zyklen
  const urgencyData = {
    getNextCycleEnd: () => {
      const cycleLength = 14 * 24 * 60 * 60 * 1000;
      const currentTime = Date.now();
      const cycleStart = Math.floor(currentTime / cycleLength) * cycleLength;
      return new Date(cycleStart + cycleLength);
    },
    getFilledSpots: () => {
      const cycleStart = new Date('2025-01-01T00:00:00').getTime();
      const now = Date.now();
      const hoursPerStep = 3;
      const stepsInCycle = 70;
      const cycleDurationMs = stepsInCycle * hoursPerStep * 60 * 60 * 1000;
      const timeSinceStart = now - cycleStart;
      const positionInCycle = timeSinceStart % cycleDurationMs;
      const currentStep = Math.floor(positionInCycle / (hoursPerStep * 60 * 60 * 1000));
      return Math.min(90, 20 + currentStep);
    },
    discountPercent: 25,
    message: "Früher-Zugang Aktion"
  };

  // Countdown Timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const nextCycleEnd = urgencyData.getNextCycleEnd().getTime();
      const distance = nextCycleEnd - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filled Spots Update
  useEffect(() => {
    setFilledSpots(urgencyData.getFilledSpots());
    const spotsTimer = setInterval(() => {
      setFilledSpots(urgencyData.getFilledSpots());
    }, 60 * 60 * 1000);
    return () => clearInterval(spotsTimer);
  }, []);

  // Open Stripe Portal for existing subscribers (upgrades/downgrades)
  const openStripePortal = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const res = await fetch('/api/stripe-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Keine Portal-URL erhalten');
      }
    } catch (error) {
      console.error('Fehler beim Öffnen des Portals:', error);
      alert('Fehler beim Öffnen der Abo-Verwaltung');
    } finally {
      setLoading(false);
    }
  };

  // Stripe Checkout (only for new subscriptions)
  const startCheckout = async (plan: string) => {
    // If user already has a subscription, redirect to Stripe Portal for upgrade
    if (currentPlan && currentPlan !== 'free') {
      // Same plan clicked - do nothing or show info
      if ((plan === 'business' && currentPlan === 'business') ||
          ((plan === 'premium' || plan === 'enterprise') && currentPlan === 'enterprise')) {
        alert('Du hast diesen Plan bereits!');
        return;
      }

      // Upgrade or downgrade - go to Stripe Portal
      openStripePortal();
      return;
    }

    setLoading(true);
    setLoadingPlan(plan);
    let res: Response | undefined;

    try {
      res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing: billingPeriod })
      });

      const data: { url?: string; message?: string } = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.message || "Fehler beim Stripe-Checkout");
      }

      window.location.href = data.url;
    } catch (error) {
      const err = error as Error;
      if (res && (res.status === 401 || res.status === 403)) {
        alert("Um ein Abo zu kaufen, müssen Sie sich zuerst registrieren.");
        navigate("/register?from=pricing&plan=" + plan);
      } else {
        alert("Fehler beim Checkout: " + err.message);
      }
    } finally {
      setLoading(false);
      setLoadingPlan(null);
    }
  };

  // FAQ Data
  const faqs = [
    {
      question: "Kann ich jederzeit kündigen?",
      answer: "Ja, absolut. Es gibt keine Kündigungsfristen. Sie können Ihr Abo mit einem Klick im Dashboard kündigen und nutzen es bis zum Ende der bezahlten Periode."
    },
    {
      question: "Gibt es eine Geld-zurück-Garantie?",
      answer: "Ja! Wir bieten eine 14-Tage-Geld-zurück-Garantie ohne Fragen. Wenn Sie nicht zufrieden sind, erstatten wir den vollen Betrag."
    },
    {
      question: "Was passiert mit meinen Daten?",
      answer: "Ihre Daten sind sicher. Wir sind DSGVO-konform, alle Server stehen in Frankfurt/Deutschland. Ihre Verträge werden verschlüsselt gespeichert und niemals an Dritte weitergegeben."
    },
    {
      question: "Kann ich zwischen Plänen wechseln?",
      answer: "Ja, Sie können jederzeit upgraden oder downgraden. Beim Upgrade wird die Differenz anteilig berechnet, beim Downgrade gilt der neue Preis ab der nächsten Periode."
    },
    {
      question: "Gibt es einen kostenlosen Plan?",
      answer: "Ja! Unser Starter-Plan ist für immer kostenlos und enthält 3 KI-Analysen. Perfekt zum Testen, bevor Sie sich für Business oder Enterprise entscheiden."
    }
  ];

  // Feature Matrix für Vergleichstabelle
  const featureMatrix = [
    // KI-Analyse Features
    { feature: "KI-Vertragsanalysen", free: "3 (einmalig)", business: "25/Monat", premium: "Unbegrenzt" },
    { feature: "KI-Optimierung", free: "–", business: "15/Monat", premium: "Unbegrenzt" },
    { feature: "Vertragsvergleich", free: "–", business: "20/Monat", premium: "Unbegrenzt" },
    { feature: "KI-Chat mit Vertrag", free: "–", business: "50 Fragen/Monat", premium: "Unbegrenzt" },
    { feature: "Legal Lens", free: "–", business: "✓", premium: "✓" },
    { feature: "Better Contracts (Anbieterwechsel)", free: "–", business: "✓", premium: "✓" },
    // Erstellung & Vorlagen
    { feature: "KI-Vertragserstellung", free: "–", business: "10/Monat", premium: "Unbegrenzt" },
    { feature: "Contract Builder", free: "✓ Basis", business: "✓ + Vorlagen speichern", premium: "✓ + Vorlagen speichern" },
    { feature: "Klausel-Bibliothek", free: "✓", business: "✓", premium: "✓" },
    { feature: "Digitale Signaturen", free: "–", business: "✓ Unbegrenzt", premium: "✓ Unbegrenzt" },
    // Verwaltung & Organisation
    { feature: "Vertragsverwaltung", free: "✓ Basis", business: "✓ Unbegrenzt", premium: "✓ Unbegrenzt" },
    { feature: "Verträge hochladen", free: "✓ Nur ansehen", business: "✓ Unbegrenzt", premium: "✓ Unbegrenzt" },
    { feature: "Ordner-Organisation", free: "–", business: "✓ + KI-Vorschläge", premium: "✓ + KI-Vorschläge" },
    { feature: "Kalender & Fristen", free: "✓ Nur ansehen", business: "✓ Vollzugriff", premium: "✓ Vollzugriff" },
    { feature: "Email-Erinnerungen", free: "–", business: "✓", premium: "✓" },
    { feature: "Kalender-Sync", free: "–", business: "–", premium: "✓ Google/Outlook" },
    { feature: "SMS-Fristenwarnungen", free: "–", business: "–", premium: "✓" },
    { feature: "Legal Pulse Feed", free: "✓ Nur ansehen", business: "✓ Aktiv", premium: "✓ Aktiv" },
    // Export & Extras
    { feature: "PDF-Download", free: "✓ Nur ansehen", business: "✓ + Analyse-Reports", premium: "✓ White-Label" },
    { feature: "Excel-Export", free: "–", business: "–", premium: "✓" },
    { feature: "REST API-Zugang", free: "–", business: "–", premium: "✓" },
    { feature: "Priority Processing", free: "–", business: "–", premium: "✓" },
    { feature: "Team-Management", free: "–", business: "–", premium: "✓ (bis 10 User)" },
    { feature: "Support", free: "Community", business: "Priority (24h)", premium: "Priority + Onboarding" },
  ];

  // Business Features - Benefit-focused, seriös
  const businessFeatures = [
    { icon: <Search size={20} />, text: "KI erkennt Risiken & Kündigungsfristen automatisch" },
    { icon: <Eye size={20} />, text: "Legal Lens: Klauseln verständlich erklärt" },
    { icon: <PenTool size={20} />, text: "Rechtssichere digitale Unterschriften" },
    { icon: <Bell size={20} />, text: "Automatische Erinnerungen – nie wieder Fristen verpassen" },
    { icon: <FolderOpen size={20} />, text: "Alle Verträge zentral & übersichtlich verwalten" },
    { icon: <Clock size={20} />, text: "Priority Support innerhalb von 24 Stunden" },
  ];

  // Enterprise Features - Freiheit, Kontrolle, Status
  const enterpriseFeatures = [
    { icon: <Sparkles size={20} />, text: "Unbegrenzte KI-Analysen & Optimierungen", highlight: true },
    { icon: <Search size={20} />, text: "Better Contracts: bessere Alternativen finden", highlight: true },
    { icon: <Smartphone size={20} />, text: "SMS-Warnungen vor jeder wichtigen Frist", highlight: true },
    { icon: <Calendar size={20} />, text: "Kalender-Sync mit Google & Outlook" },
    { icon: <Download size={20} />, text: "White-Label PDFs mit eigenem Branding" },
    { icon: <Users size={20} />, text: "Team-Zugriff für bis zu 10 Nutzer" },
    { icon: <Lock size={20} />, text: "API-Zugang & Custom Templates" },
  ];

  return (
    <>
      <Helmet>
        <title>Preise & Tarife – Contract AI | KI-Vertragsanalyse ab 0€</title>
        <meta name="description" content="Vergleiche unsere Preise: Business (19€) und Enterprise (29€). KI-gestützte Vertragsanalyse, Risikoerkennung & Optimierung. Jetzt kostenlos starten!" />
        <meta name="keywords" content="Preise Contract AI, Vertragsanalyse Kosten, KI Vertragsanalyse Preis, Legal Tech Preise" />
        <link rel="canonical" href="https://www.contract-ai.de/pricing" />
        <meta name="robots" content="index, follow" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Preise & Tarife – Contract AI | KI-Vertragsanalyse" />
        <meta property="og:description" content="Transparente Preise für KI-gestützte Vertragsanalyse. Business & Enterprise Pläne. Jetzt kostenlos testen!" />
        <meta property="og:url" content="https://www.contract-ai.de/pricing" />
      </Helmet>

      <div className={styles.pricingPage}>
        {/* HERO SECTION - Like About Page */}
        <section className={styles.heroSection}>
          <motion.h1
            className={styles.heroTitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Wähle deinen Plan:<br />
            <span className={styles.heroHighlight}>Transparent. Flexibel. Fair.</span>
          </motion.h1>
          <motion.div
            className={styles.heroLine}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          />
          <motion.div
            className={styles.heroTrust}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Shield size={16} />
            <span>14 Tage Geld-zurück-Garantie • Jederzeit kündbar</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Link to="/register" className={styles.freeLink}>
              Oder kostenlos mit dem Starter-Plan beginnen <ArrowRight size={16} />
            </Link>
          </motion.div>
        </section>

        {/* URGENCY BANNER */}
        <motion.section
          className={styles.urgencyBanner}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className={styles.urgencyContent}>
            <div className={styles.urgencyText}>
              <span className={styles.urgencyTitle}>
                {urgencyData.message} – {filledSpots} von 100 Plätzen vergeben
              </span>
              <span className={styles.urgencySubtitle}>
                {urgencyData.discountPercent}% Rabatt endet in:
              </span>
            </div>
            <div className={styles.countdown}>
              <div className={styles.countdownItem}>
                <span className={styles.countdownNumber}>{timeLeft.days}</span>
                <span className={styles.countdownLabel}>Tage</span>
              </div>
              <span className={styles.countdownSeparator}>:</span>
              <div className={styles.countdownItem}>
                <span className={styles.countdownNumber}>{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className={styles.countdownLabel}>Std</span>
              </div>
              <span className={styles.countdownSeparator}>:</span>
              <div className={styles.countdownItem}>
                <span className={styles.countdownNumber}>{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className={styles.countdownLabel}>Min</span>
              </div>
              <span className={styles.countdownSeparator}>:</span>
              <div className={styles.countdownItem}>
                <span className={styles.countdownNumber}>{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className={styles.countdownLabel}>Sek</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* BILLING TOGGLE */}
        <section className={styles.billingSection}>
          <div className={styles.billingToggle}>
            <button
              className={`${styles.billingButton} ${billingPeriod === 'monthly' ? styles.activeBilling : ''}`}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monatlich
            </button>
            <button
              className={`${styles.billingButton} ${billingPeriod === 'yearly' ? styles.activeBilling : ''}`}
              onClick={() => setBillingPeriod('yearly')}
            >
              Jährlich
              <span className={styles.saveBadge}>-45%</span>
            </button>
          </div>
          {billingPeriod === 'yearly' && (
            <motion.p
              className={styles.yearlyHint}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <TrendingUp size={16} />
              10 Monate zahlen, 12 nutzen
            </motion.p>
          )}
        </section>

        {/* PLANS SPLIT SECTION - Full Width */}
        <section className={styles.plansSplitSection}>
          {/* BUSINESS HALF */}
          <motion.div
            className={styles.planHalf}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className={styles.planHalfContent}>
              <div className={styles.planBadge}>Beliebt</div>
              <div className={styles.planIcon}>
                <Zap size={32} />
              </div>
              <h2 className={styles.planName}>Business</h2>
              <p className={styles.planTagline}>Für Profis & Freelancer</p>

              <div className={styles.planPricing}>
                <div className={styles.priceRow}>
                  <span className={styles.originalPrice}>
                    {billingPeriod === 'monthly' ? '29€' : '348€'}
                  </span>
                  <span className={styles.discountBadge}>
                    {billingPeriod === 'monthly' ? '33%' : '45%'} RABATT
                  </span>
                </div>
                <div className={styles.currentPrice}>
                  <span className={styles.priceAmount}>
                    {billingPeriod === 'monthly' ? '19' : '190'}
                  </span>
                  <span className={styles.priceCurrency}>€</span>
                  <span className={styles.pricePeriod}>
                    /{billingPeriod === 'monthly' ? 'Monat' : 'Jahr'}
                  </span>
                </div>
                {billingPeriod === 'yearly' && (
                  <p className={styles.savingNote}>Sie sparen 158€ pro Jahr</p>
                )}
              </div>

              <div className={styles.planFeatures}>
                {businessFeatures.map((feature, i) => (
                  <motion.div
                    key={i}
                    className={styles.featureItem}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
                    whileHover={{ scale: 1.02, x: 4 }}
                  >
                    <div className={styles.featureIcon}>{feature.icon}</div>
                    <span>{feature.text}</span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                className={`${styles.planButton} ${currentPlan === 'business' ? styles.currentPlanButton : ''}`}
                onClick={() => startCheckout('business')}
                disabled={loading || currentPlan === 'business'}
                whileHover={currentPlan !== 'business' ? { scale: 1.02, y: -2 } : {}}
                whileTap={currentPlan !== 'business' ? { scale: 0.98 } : {}}
              >
                {loadingPlan === 'business' ? (
                  <>
                    <span className={styles.spinner}></span>
                    Lade...
                  </>
                ) : currentPlan === 'business' ? (
                  <>
                    <Check size={18} />
                    Dein aktueller Plan
                  </>
                ) : currentPlan === 'enterprise' ? (
                  <>
                    Zu Business wechseln
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    Business starten
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* ENTERPRISE HALF */}
          <motion.div
            className={`${styles.planHalf} ${styles.enterpriseHalf}`}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className={styles.planHalfContent}>
              <div className={`${styles.planBadge} ${styles.enterpriseBadge}`}>
                <span className={styles.badgeDot}></span>
                Meist gewählt
              </div>
              <div className={`${styles.planIcon} ${styles.enterpriseIcon}`}>
                <Star size={32} />
              </div>
              <h2 className={styles.planName}>Enterprise</h2>
              <p className={styles.planTagline}>Unbegrenzt & ohne Limits</p>

              <div className={styles.planPricing}>
                <div className={styles.priceRow}>
                  <span className={styles.originalPrice}>
                    {billingPeriod === 'monthly' ? '39€' : '468€'}
                  </span>
                  <span className={`${styles.discountBadge} ${styles.enterpriseDiscount}`}>
                    {billingPeriod === 'monthly' ? '25%' : '38%'} RABATT
                  </span>
                </div>
                <div className={styles.currentPrice}>
                  <span className={styles.priceAmount}>
                    {billingPeriod === 'monthly' ? '29' : '290'}
                  </span>
                  <span className={styles.priceCurrency}>€</span>
                  <span className={styles.pricePeriod}>
                    /{billingPeriod === 'monthly' ? 'Monat' : 'Jahr'}
                  </span>
                </div>
                {billingPeriod === 'yearly' && (
                  <p className={styles.savingNote}>Sie sparen 178€ pro Jahr</p>
                )}
              </div>

              <div className={styles.planFeatures}>
                {enterpriseFeatures.map((feature, i) => (
                  <motion.div
                    key={i}
                    className={`${styles.featureItem} ${feature.highlight ? styles.highlightFeature : ''}`}
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
                    whileHover={{ scale: 1.02, x: -4 }}
                  >
                    <div className={styles.featureIcon}>{feature.icon}</div>
                    <span>{feature.text}</span>
                    {feature.highlight && <span className={styles.newTag}>Exklusiv</span>}
                  </motion.div>
                ))}
              </div>

              <motion.button
                className={`${styles.planButton} ${styles.enterpriseButton} ${currentPlan === 'enterprise' ? styles.currentPlanButton : ''}`}
                onClick={() => startCheckout('premium')}
                disabled={loading || currentPlan === 'enterprise'}
                whileHover={currentPlan !== 'enterprise' ? { scale: 1.02, y: -2 } : {}}
                whileTap={currentPlan !== 'enterprise' ? { scale: 0.98 } : {}}
              >
                {loadingPlan === 'premium' ? (
                  <>
                    <span className={styles.spinner}></span>
                    Lade...
                  </>
                ) : currentPlan === 'enterprise' ? (
                  <>
                    <Check size={18} />
                    Dein aktueller Plan
                  </>
                ) : currentPlan === 'business' ? (
                  <>
                    Auf Enterprise upgraden
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    Enterprise wählen
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </section>

        {/* FEATURE COMPARISON TABLE */}
        <section className={styles.comparisonSection}>
          <h2 className={styles.sectionTitle}>Alle Features im Vergleich</h2>
          <div className={styles.scrollHint}>
            <span>← Wische um mehr zu sehen →</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.featureTable}>
              <thead>
                <tr>
                  <th className={styles.featureColumn}>Funktion</th>
                  <th className={styles.planColumn}>Starter</th>
                  <th className={`${styles.planColumn} ${styles.businessColumn}`}>Business</th>
                  <th className={`${styles.planColumn} ${styles.premiumColumn}`}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {featureMatrix.map((item, index) => (
                  <tr key={index}>
                    <td className={styles.featureCell}>{item.feature}</td>
                    <td className={styles.freeCell}>
                      {item.free === "✓" || item.free.startsWith("✓") ? (
                        <span className={styles.cellContent}>
                          <Check size={18} className={styles.checkIcon} />
                          {item.free !== "✓" && <span className={styles.cellNote}>{item.free.replace("✓ ", "")}</span>}
                        </span>
                      ) : item.free === "–" ? (
                        <X size={18} className={styles.xIcon} />
                      ) : (
                        <span>{item.free}</span>
                      )}
                    </td>
                    <td className={`${styles.businessCell}`}>
                      {item.business === "✓" || item.business.startsWith("✓") ? (
                        <span className={styles.cellContent}>
                          <Check size={18} className={styles.checkIcon} />
                          {item.business !== "✓" && <span className={styles.cellNote}>{item.business.replace("✓ ", "")}</span>}
                        </span>
                      ) : item.business === "–" ? (
                        <X size={18} className={styles.xIcon} />
                      ) : (
                        <span>{item.business}</span>
                      )}
                    </td>
                    <td className={`${styles.premiumCell}`}>
                      {item.premium === "✓" || item.premium.startsWith("✓") ? (
                        <span className={styles.cellContent}>
                          <Check size={18} className={styles.checkIcon} />
                          {item.premium !== "✓" && <span className={styles.cellNote}>{item.premium.replace("✓ ", "")}</span>}
                        </span>
                      ) : item.premium === "–" ? (
                        <X size={18} className={styles.xIcon} />
                      ) : (
                        <span>{item.premium}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className={styles.faqSection}>
          <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
          <div className={styles.faqList}>
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}
                initial={false}
              >
                <button
                  className={styles.faqQuestion}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown size={20} className={styles.faqChevron} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      className={styles.faqAnswer}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p>{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="final-cta-section">
          <div className="final-cta-content">
            {/* Social Proof with Avatar Stack */}
            <div className="final-cta-social-proof">
              <div className="final-cta-avatar-stack">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                  alt="Nutzerin"
                  className="final-cta-avatar"
                />
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
                  alt="Nutzer"
                  className="final-cta-avatar"
                />
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
                  alt="Nutzerin"
                  className="final-cta-avatar"
                />
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
                  alt="Nutzerin"
                  className="final-cta-avatar"
                />
                <div className="final-cta-avatar-placeholder">+</div>
              </div>
              <div className="final-cta-social-text">
                <div className="final-cta-stars-row">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <span className="final-cta-rating-text">von 500+ zufriedenen Nutzern</span>
              </div>
            </div>

            <h2 className="final-cta-title">
              <span className="final-cta-title-gradient">Starte jetzt risikofrei</span>
            </h2>
            <p className="final-cta-subtitle">
              Schließe dich über 500 Unternehmen an, die ihre Verträge bereits smarter verwalten.
              <br />14 Tage Geld-zurück-Garantie – ohne Wenn und Aber.
            </p>

            <div className="final-cta-buttons">
              {currentPlan === 'enterprise' ? (
                <button
                  className="final-cta-primary"
                  onClick={() => navigate('/dashboard')}
                >
                  Zum Dashboard
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              ) : currentPlan === 'business' ? (
                <>
                  <button
                    className="final-cta-primary"
                    onClick={() => startCheckout('premium')}
                    disabled={loading}
                  >
                    {loadingPlan === 'premium' ? 'Lade...' : 'Auf Enterprise upgraden'}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                  <button
                    className="final-cta-secondary"
                    onClick={() => navigate('/dashboard')}
                  >
                    Zum Dashboard
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="final-cta-primary"
                    onClick={() => startCheckout('premium')}
                    disabled={loading}
                  >
                    {loadingPlan === 'premium' ? 'Lade...' : 'Enterprise starten'}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                  <button
                    className="final-cta-secondary"
                    onClick={() => startCheckout('business')}
                    disabled={loading}
                  >
                    {loadingPlan === 'business' ? 'Lade...' : 'Oder Business wählen'}
                  </button>
                </>
              )}
            </div>

            <div className="final-cta-trust-badges">
              <div className="final-cta-trust-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>DSGVO-konform</span>
              </div>
              <div className="final-cta-trust-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>14-Tage-Garantie</span>
              </div>
              <div className="final-cta-trust-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Jederzeit kündbar</span>
              </div>
              <div className="final-cta-trust-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Deutsche Server</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

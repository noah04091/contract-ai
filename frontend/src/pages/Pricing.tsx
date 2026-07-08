import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ChevronDown, Shield, ShieldCheck, Lock, Clock, TrendingUp } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import LandingFooter from "../components/LandingFooter";
import TrustBadgeRow from "../components/TrustBadgeRow";
import styles from "../styles/Pricing.module.css";
import "../styles/landing.css";

// ---------------------------------------------------------------------------
// Saisonales Kampagnen-System (rein anzeigeseitig — Rabatt/Countdown/Plätze
// bleiben die bestehende 14-Tage-Logik). Label + Headline wechseln nach Datum.
// Default in allen Lücken: "Frühbucher-Rabatt".
// ---------------------------------------------------------------------------
function computeEaster(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getCampaign(now: Date): { label: string; headline: string } {
  const y = now.getFullYear();
  const D = (mo: number, d: number, hh?: number, mm?: number) => new Date(y, mo - 1, d, hh || 0, mm || 0);
  const within = (s: Date, e: Date) => now >= s && now <= e;

  // Black Friday = 4. Freitag im November (+ Cyber-Woche)
  const novFirst = new Date(y, 10, 1);
  const firstFri = 1 + ((5 - novFirst.getDay() + 7) % 7);
  const bf = firstFri + 21;

  // Ostern (beweglich)
  const easter = computeEaster(y);
  const easterStart = new Date(easter); easterStart.setDate(easter.getDate() - 4);
  const easterEnd = new Date(easter); easterEnd.setDate(easter.getDate() + 1); easterEnd.setHours(23, 59);

  // Bekannte Fußball-Turniere (WM / EM)
  const tournaments: Record<number, [Date, Date]> = {
    2026: [D(6, 11), D(7, 19, 23, 59)],
    2028: [D(6, 9), D(7, 9, 23, 59)],
    2030: [D(6, 13), D(7, 21, 23, 59)]
  };

  const campaigns = [
    { test: within(D(1, 1), D(1, 14, 23, 59)), label: "Neujahrs-Aktion", headline: "Starte mit 25 % ins neue Jahr" },
    { test: within(easterStart, easterEnd), label: "Oster-Aktion", headline: "Oster-Rabatt: 25 % sichern" },
    { test: !!tournaments[y] && within(tournaments[y][0], tournaments[y][1]), label: "WM Special", headline: "25 % Rabatt zur Fußball-WM" },
    { test: within(D(6, 21), D(8, 31, 23, 59)), label: "Sommer-Sale", headline: "25 % Sommer-Rabatt sichern" },
    { test: within(D(10, 24), D(11, 1, 23, 59)), label: "Halloween-Sale", headline: "25 % Rabatt – nur bis Halloween" },
    { test: within(D(11, bf - 1), D(11, bf + 4, 23, 59)), label: "Black Friday", headline: "25 % Black-Friday-Rabatt" },
    { test: within(D(12, 6), D(12, 26, 23, 59)), label: "Weihnachts-Sale", headline: "25 % Weihnachts-Rabatt sichern" },
    { test: within(D(12, 27), D(12, 31, 23, 59)), label: "Jahresend-Aktion", headline: "25 % zum Jahresende sichern" }
  ];

  const hit = campaigns.find((c) => c.test);
  return hit || { label: "Frühbucher-Rabatt", headline: "25 % Rabatt für Frühbucher" };
}

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [filledSpots, setFilledSpots] = useState(47);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'business' | 'enterprise' | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 900);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlPromoCode = searchParams.get('code')?.trim() || null;

  // Kampagne einmal beim Mount bestimmen (kein Neuberechnen pro Countdown-Tick → kein Animations-Restart)
  const campaign = useMemo(() => getCampaign(new Date()), []);

  // Karten-Einblendung NUR auf Desktop. Im Handy-Karussell würde whileInView die
  // rechts liegenden (offscreen) Karten verstecken → sollen sofort & smooth da sein.
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const cardMotion = (delay = 0) =>
    isMobile
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.45, delay },
        };

  // Load current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        setCurrentPlan(null);
        return;
      }

      try {
        // Cache-Busting: Immer frische Daten holen (wichtig nach Abo-Abschluss!)
        const res = await fetch(`/api/auth/me?_t=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
          cache: 'no-store'
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
      // Deterministisch (zeitbasiert, nicht zufällig) — aber bewusst „organisch":
      // variabler Startwert pro Zyklus + kleiner Versatz pro Schritt, damit selten
      // glatte Zehner (z. B. 80) angezeigt werden. Steigt über ~9 Tage, dann Reset.
      const cycleStart = new Date('2025-01-01T00:00:00').getTime();
      const now = Date.now();
      const hoursPerStep = 3;
      const stepsInCycle = 70;
      const cycleDurationMs = stepsInCycle * hoursPerStep * 60 * 60 * 1000;
      const timeSinceStart = now - cycleStart;
      const cycleIndex = Math.floor(timeSinceStart / cycleDurationMs);
      const positionInCycle = timeSinceStart % cycleDurationMs;
      const currentStep = Math.floor(positionInCycle / (hoursPerStep * 60 * 60 * 1000));
      const base = 18 + ((cycleIndex * 7 + 3) % 11);       // 18..28, je Zyklus anders
      const jitter = ((currentStep * 3 + cycleIndex) % 5) - 2; // -2..+2, bricht glatte Zahlen
      return Math.max(13, Math.min(92, base + currentStep + jitter));
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
      const res = await fetch('/api/stripe/portal', {
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
        body: JSON.stringify({
          plan,
          billing: billingPeriod,
          ...(urlPromoCode && { code: urlPromoCode })
        })
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
    { feature: "KI-Chat mit Vertrag", free: "5 Fragen/Monat", business: "50 Fragen/Monat", premium: "Unbegrenzt" },
    { feature: "Legal Lens", free: "–", business: "✓", premium: "✓" },
    { feature: "Better Contracts (Anbieterwechsel)", free: "–", business: "✓", premium: "✓" },
    // Erstellung & Vorlagen
    { feature: "KI-Vertragserstellung", free: "–", business: "10/Monat", premium: "Unbegrenzt" },
    { feature: "Contract Builder", free: "✓ Basis", business: "✓ + Vorlagen speichern", premium: "✓ + Vorlagen speichern" },
    { feature: "Playbook Review", free: "–", business: "✓", premium: "✓" },
    { feature: "Klausel-Bibliothek", free: "✓", business: "✓", premium: "✓" },
    { feature: "Digitale Signaturen", free: "–", business: "✓ Unbegrenzt", premium: "✓ Unbegrenzt" },
    // Verwaltung & Organisation
    { feature: "Vertragsverwaltung", free: "✓ Basis", business: "✓ Unbegrenzt", premium: "✓ Unbegrenzt" },
    { feature: "Verträge hochladen", free: "✓ Nur ansehen", business: "✓ Unbegrenzt", premium: "✓ Unbegrenzt" },
    { feature: "Mehrfach-Upload (Batch)", free: "–", business: "–", premium: "✓ Bis zu 10 Verträge" },
    { feature: "Ordner-Organisation", free: "–", business: "✓ + KI-Vorschläge", premium: "✓ + KI-Vorschläge" },
    { feature: "Kalender & Fristen", free: "✓ Nur ansehen", business: "✓ Vollzugriff", premium: "✓ Vollzugriff" },
    { feature: "Email-Erinnerungen", free: "–", business: "✓", premium: "✓" },
    { feature: "Kalender-Sync", free: "–", business: "–", premium: "✓ Google/Outlook" },
    { feature: "Legal Pulse Feed", free: "✓ Nur ansehen", business: "✓ Aktiv", premium: "✓ Aktiv" },
    { feature: "Legal Radar", free: "–", business: "✓", premium: "✓" },
    // Export & Extras
    { feature: "PDF-Download", free: "✓ Nur ansehen", business: "✓ + Analyse-Reports", premium: "✓ White-Label" },
    { feature: "Excel-Export", free: "–", business: "–", premium: "✓" },
    { feature: "REST API-Zugang", free: "–", business: "–", premium: "✓" },
    { feature: "Priority Processing", free: "–", business: "–", premium: "✓" },
    { feature: "Team-Management", free: "–", business: "–", premium: "✓ (bis 10 User)" },
    { feature: "Support", free: "Community", business: "Priority (24h)", premium: "Priority + Onboarding" },
  ];

  // Plan-Features (Karten) — Texte wie Prototyp/Produktion
  const starterFeatures = [
    "3 KI-Vertragsanalysen (einmalig)",
    "Basis-Vertragsverwaltung",
    "Contract Builder (Basis)",
    "Klausel-Bibliothek",
    "Community Support",
  ];

  const businessFeatures = [
    "Risiken & Fristen automatisch erkennen",
    "Legal Lens: Klauseln verstehen",
    "Rechtssichere digitale Unterschriften",
    "Nie wieder Fristen verpassen",
    "Zentrale Vertragsverwaltung",
    "Priority Support (24h)",
  ];

  const enterpriseFeatures: { text: string; highlight?: boolean }[] = [
    { text: "Unbegrenzt analysieren", highlight: true },
    { text: "Bessere Vertragsalternativen finden", highlight: true },
    { text: "Fristen aktiv überwacht & gemeldet", highlight: true },
    { text: "Automatischer Kalender-Sync" },
    { text: "Team-Zugriff (bis 10 User)" },
    { text: "White-Label PDF-Reports" },
    { text: "API-Zugang" },
  ];

  // Testimonials — ILLUSTRATIV. ⚖️ Vor Launch durch echte, freigegebene Kundenstimmen ersetzen (oder entfernen).
  const testimonials = [
    {
      initials: "LB", color: "linear-gradient(135deg,#F59E0B,#EF4444)", name: "Lena B.", role: "Selbstständige Designerin, Berlin",
      quote: "„Ehrlich gesagt check ich sowas sonst nie. Ein Kunde wollte sich über die AGB alle Rechte an meinen Designs sichern. Die App hat die Stelle direkt markiert und erklärt, was das heißt. Hab dann nachverhandelt.“"
    },
    {
      initials: "SK", color: "linear-gradient(135deg,#3B82F6,#06B6D4)", name: "Sebastian K.", role: "Co-Founder SaaS-Startup, München",
      quote: "„Wir haben kein eigenes Legal. Vertrag hochladen, kurz warten, Risiken sehen. Genau das, was ein kleines Team braucht.“"
    },
    {
      initials: "TB", color: "linear-gradient(135deg,#2563EB,#3B82F6)", name: "Thomas B.", role: "Geschäftsführer Hausverwaltung, Hamburg",
      quote: "„War am Anfang skeptisch, ob ein KI-Tool das wirklich packt. Wir haben über 200 Verträge, eine verpasste Frist hat uns mal richtig Geld gekostet. Jetzt meldet sich das Ding von selbst. Hat sich schon bezahlt gemacht.“"
    },
  ];

  const isYearly = billingPeriod === 'yearly';
  const spotsLeft = 100 - filledSpots;

  // Vergleichstabellen-Zelle (gleiche Semantik wie Produktion: ✓ / ✓ Note / – / Text)
  const renderCell = (val: string, tier: 'starter' | 'business' | 'premium') => {
    const checkCls = tier === 'starter' ? styles.checkStarter : tier === 'business' ? styles.checkBusiness : styles.checkEnterprise;
    const noteCls = tier === 'starter' ? styles.cellNoteStarter : styles.cellNotePaid;
    const textCls = tier === 'starter' ? styles.cellTextStarter : styles.cellTextPaid;
    if (val === '–') return <span className={styles.cellDash}>–</span>;
    if (val === '✓' || val.startsWith('✓')) {
      const note = val === '✓' ? null : val.replace('✓ ', '');
      return (
        <span className={styles.cellCheck}>
          <Check size={16} strokeWidth={2.8} className={checkCls} />
          {note && <span className={noteCls}>{note}</span>}
        </span>
      );
    }
    return <span className={textCls}>{val}</span>;
  };

  return (
    <>
      <Helmet>
        <title>Preise & Tarife – Contract AI | KI-Vertragsmanagement ab 0€</title>
        <meta name="description" content="Vergleiche unsere Preise: Business (19€/Monat) und Enterprise (29€/Monat). KI-gestütztes Vertragsmanagement, Risikoerkennung & Optimierung. 14 Tage Geld-zurück-Garantie. Jetzt kostenlos starten!" />
        <meta name="keywords" content="Preise Contract AI, Vertragsmanagement Kosten, KI Vertragsmanagement Preis, Legal Tech Preise, Vertragsmanagement Software Preise, Vertrag prüfen Kosten" />
        <link rel="canonical" href="https://www.contract-ai.de/pricing" />
        <meta name="robots" content="index, follow" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Preise & Tarife – Contract AI | KI-Vertragsmanagement ab 0€" />
        <meta property="og:description" content="Transparente Preise für KI-gestütztes Vertragsmanagement. Starter kostenlos, Business 19€/Monat, Enterprise 29€/Monat. Jetzt testen!" />
        <meta property="og:url" content="https://www.contract-ai.de/pricing" />
        <meta property="og:site_name" content="Contract AI" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Preise & Tarife – Contract AI | KI-Vertragsmanagement ab 0€" />
        <meta name="twitter:description" content="Transparente Preise für KI-gestütztes Vertragsmanagement. Starter kostenlos, Business 19€/Monat, Enterprise 29€/Monat. Jetzt testen!" />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.contract-ai.de" },
              { "@type": "ListItem", "position": 2, "name": "Preise", "item": "https://www.contract-ai.de/pricing" }
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Contract AI",
            "applicationCategory": "BusinessApplication",
            "applicationSubCategory": "Vertragsmanagement Software",
            "operatingSystem": "Web",
            "url": "https://www.contract-ai.de",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "bestRating": "5",
              "worstRating": "1",
              "ratingCount": "127",
              "reviewCount": "89"
            },
            "offers": [
              {
                "@type": "Offer",
                "name": "Starter",
                "description": "3 KI-Analysen kostenlos. Basis-Vertragsverwaltung, Contract Builder und Klausel-Bibliothek.",
                "price": "0",
                "priceCurrency": "EUR",
                "priceValidUntil": "2026-12-31",
                "availability": "https://schema.org/InStock",
                "url": "https://www.contract-ai.de/register"
              },
              {
                "@type": "Offer",
                "name": "Business",
                "description": "25 KI-Analysen/Monat, Optimierung, Vergleich, KI-Chat, Legal Lens, digitale Signaturen, Priority Support.",
                "price": "19",
                "priceCurrency": "EUR",
                "priceValidUntil": "2026-12-31",
                "billingIncrement": "P1M",
                "availability": "https://schema.org/InStock",
                "url": "https://www.contract-ai.de/pricing"
              },
              {
                "@type": "Offer",
                "name": "Enterprise",
                "description": "Unbegrenzte KI-Analysen, alle Premium-Features, Team-Management (bis 10 User), REST API-Zugang, White-Label Reports.",
                "price": "29",
                "priceCurrency": "EUR",
                "priceValidUntil": "2026-12-31",
                "billingIncrement": "P1M",
                "availability": "https://schema.org/InStock",
                "url": "https://www.contract-ai.de/pricing"
              }
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })}
        </script>
      </Helmet>

      <div className={styles.page}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <motion.div
            className={styles.heroInner}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className={styles.eyebrow}>Preise &amp; Tarife</span>
            <h1 className={styles.heroTitle}>
              Transparent. Flexibel. <span className={styles.gradText}>Fair.</span>
            </h1>
            <p className={styles.heroSub}>
              KI-Vertragsmanagement, das jeden Vertrag prüft und verständlich erklärt.
            </p>
            <div>
              <div className={styles.heroBadge}>
                <Shield size={15} strokeWidth={2.2} />
                14 Tage Geld-zurück-Garantie · Jederzeit kündbar
              </div>
            </div>
            <div>
              <Link to="/register" className={styles.heroStarterLink}>
                Oder kostenlos mit dem Starter-Plan beginnen <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>

          {/* URGENCY / SEASONAL CAMPAIGN */}
          <div className={styles.urgency}>
            <div className={styles.urgencyTop} />
            <div className={styles.urgencyGrid}>
              {/* LEFT: campaign + scarcity */}
              <div className={styles.urgencyLeft}>
                <div className={styles.campaignRow}>
                  <span className={styles.campaignPill}>
                    <span className={styles.pulseWrap}><span className={styles.pulseDot} /></span>
                    <span className={styles.campaignLabel}>{campaign.label}</span>
                  </span>
                  <span className={styles.liveNow}><span className={styles.liveDot} />Aktion läuft gerade</span>
                </div>

                <div className={styles.campaignHeadline}>{campaign.headline}</div>

                <div className={styles.scarcity}>
                  <div className={styles.scarcityRow}>
                    <span className={styles.scarcityLabel}>Nur noch <strong>{spotsLeft} von 100</strong> Plätzen frei</span>
                    <span className={styles.scarcityCount}>{filledSpots} gesichert</span>
                  </div>
                  <div className={styles.bar}>
                    <div className={styles.barFill} style={{ width: `${spotsLeft}%` }} />
                    <div className={styles.barShine} />
                  </div>
                </div>

                <div className={styles.trustChips}>
                  <span className={styles.trustChip}><Check size={15} strokeWidth={2.6} />Gilt für Business &amp; Enterprise</span>
                  <span className={styles.trustChip}><Check size={15} strokeWidth={2.6} />14 Tage Geld-zurück-Garantie</span>
                </div>
              </div>

              {/* RIGHT: offer + CTA */}
              <div className={styles.urgencyRight}>
                <div className={styles.offerGlow} />
                <div className={styles.offerLabel}>
                  <Lock size={16} strokeWidth={2} />
                  <span>Rabatt für dich reserviert</span>
                </div>
                <div className={styles.offerBig}>
                  <span className={styles.offerBigNum}>&minus;{urgencyData.discountPercent}&thinsp;%</span>
                  <span className={styles.offerBigSub}>auf alle<br />Pläne</span>
                </div>
                <div className={styles.offerDivider}>
                  <span className={styles.offerCdLabel}><Clock size={13} strokeWidth={2.2} />Aktion endet in</span>
                  <div className={styles.countdown}>
                    <span className={styles.cdNum}>{timeLeft.days}</span><span className={styles.cdUnit}>T</span>
                    <span className={styles.cdNum}>{String(timeLeft.hours).padStart(2, '0')}</span><span className={styles.cdSep}>:</span>
                    <span className={styles.cdNum}>{String(timeLeft.minutes).padStart(2, '0')}</span><span className={styles.cdSep}>:</span>
                    <span className={styles.cdSec}>{String(timeLeft.seconds).padStart(2, '0')}</span>
                  </div>
                </div>
                <a href="#plans" className={styles.offerBtn}>
                  Rabatt sichern
                  <ArrowRight size={16} strokeWidth={2.4} />
                </a>
              </div>
            </div>
          </div>

          {/* BILLING TOGGLE */}
          <div className={styles.billing}>
            <div className={styles.billingToggle}>
              <button
                className={`${styles.billingBtn} ${!isYearly ? styles.billingBtnActive : ''}`}
                onClick={() => setBillingPeriod('monthly')}
              >
                Monatlich
              </button>
              <button
                className={`${styles.billingBtn} ${isYearly ? styles.billingBtnActive : ''}`}
                onClick={() => setBillingPeriod('yearly')}
              >
                Jährlich
                <span className={styles.saveBadge}>&minus;45%</span>
              </button>
            </div>
            {isYearly && (
              <motion.div
                className={styles.yearlyHint}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <TrendingUp size={15} strokeWidth={2.2} />
                10 Monate zahlen, 12 nutzen
              </motion.div>
            )}
          </div>
        </section>

        {/* PLANS */}
        <section id="plans" className={styles.plans}>
          <div className={styles.cardsHint}>← Wische für alle Pläne →</div>
          <div className={styles.plansGrid}>
            {/* STARTER */}
            <motion.div
              className={styles.card}
              {...cardMotion(0)}
            >
              <div className={`${styles.planKicker} ${styles.planKickerMuted}`}>Starter</div>
              <p className={styles.planTagline}>Zum Ausprobieren</p>
              <div className={styles.priceFree}>
                <span className={styles.priceAmount}>0</span>
                <span className={styles.priceCurrency}>€</span>
                <span className={styles.freeForever}>/ für immer</span>
              </div>
              <p className={styles.freeNote}>Keine Kreditkarte nötig</p>
              <Link to="/register" className={`${styles.planBtn} ${styles.planBtnStarter}`}>
                Kostenlos starten
              </Link>
              <div className={styles.planDivider} />
              <ul className={styles.featureList}>
                {starterFeatures.map((text, i) => (
                  <li key={i} className={`${styles.featureLi} ${styles.featureLiStarter}`}>
                    <Check size={18} strokeWidth={2.6} />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* BUSINESS */}
            <motion.div
              className={styles.card}
              {...cardMotion(0.05)}
            >
              <div className={`${styles.planKicker} ${styles.planKickerAccent}`}>Business</div>
              <p className={styles.planTagline}>Für Profis &amp; Freelancer</p>
              <div className={styles.priceOrigRow}>
                <span className={styles.priceOrig}>{isYearly ? '348€' : '29€'}</span>
                <span className={styles.discPill}>&minus;{isYearly ? '45%' : '33%'}</span>
              </div>
              <div className={styles.priceMain}>
                <span className={styles.priceAmount}>{isYearly ? '190' : '19'}</span>
                <span className={styles.priceCurrency}>€</span>
                <span className={styles.pricePeriod}>{isYearly ? '/Jahr' : '/Monat'}</span>
              </div>
              {isYearly && (
                <p className={styles.saveNote}>
                  <TrendingUp size={15} strokeWidth={2.4} />
                  Du sparst 158 € pro Jahr
                </p>
              )}
              <button
                className={`${styles.planBtn} ${styles.planBtnBusiness} ${currentPlan === 'business' ? styles.planBtnCurrent : ''}`}
                onClick={() => startCheckout('business')}
                disabled={loading || currentPlan === 'business'}
              >
                {loadingPlan === 'business' ? (
                  <><span className={styles.spinner} />Lade...</>
                ) : currentPlan === 'business' ? (
                  <><Check size={18} />Dein aktueller Plan</>
                ) : currentPlan === 'enterprise' ? (
                  <>Zu Business wechseln<ArrowRight size={17} strokeWidth={2.4} /></>
                ) : (
                  <>Business starten<ArrowRight size={17} strokeWidth={2.4} /></>
                )}
              </button>
              <div className={styles.planDividerTight} />
              <p className={styles.plusLabel}>Alles aus Starter, plus:</p>
              <ul className={styles.featureList}>
                {businessFeatures.map((text, i) => (
                  <li key={i} className={`${styles.featureLi} ${styles.featureLiPaid}`}>
                    <Check size={18} strokeWidth={2.6} />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.trustBadgeRowWrap}><TrustBadgeRow /></div>
            </motion.div>

            {/* ENTERPRISE (popular) */}
            <motion.div
              className={`${styles.card} ${styles.cardPopular}`}
              {...cardMotion(0.1)}
            >
              <div className={styles.popularBadge}><span />Meist gewählt</div>
              <div className={`${styles.planKicker} ${styles.planKickerAccent}`}>Enterprise</div>
              <p className={styles.planTagline}>Unbegrenzt, ohne Limits</p>
              <div className={styles.priceOrigRow}>
                <span className={styles.priceOrig}>{isYearly ? '468€' : '39€'}</span>
                <span className={styles.discPill}>&minus;{isYearly ? '38%' : '25%'}</span>
              </div>
              <div className={styles.priceMain}>
                <span className={styles.priceAmount}>{isYearly ? '290' : '29'}</span>
                <span className={styles.priceCurrency}>€</span>
                <span className={styles.pricePeriod}>{isYearly ? '/Jahr' : '/Monat'}</span>
              </div>
              {isYearly && (
                <p className={styles.saveNote}>
                  <TrendingUp size={15} strokeWidth={2.4} />
                  Du sparst 178 € pro Jahr
                </p>
              )}
              <button
                className={`${styles.planBtn} ${styles.planBtnEnterprise} ${currentPlan === 'enterprise' ? styles.planBtnCurrent : ''}`}
                onClick={() => startCheckout('premium')}
                disabled={loading || currentPlan === 'enterprise'}
              >
                {loadingPlan === 'premium' ? (
                  <><span className={styles.spinner} />Lade...</>
                ) : currentPlan === 'enterprise' ? (
                  <><Check size={18} />Dein aktueller Plan</>
                ) : currentPlan === 'business' ? (
                  <>Auf Enterprise upgraden<ArrowRight size={17} strokeWidth={2.4} /></>
                ) : (
                  <>Enterprise wählen<ArrowRight size={17} strokeWidth={2.4} /></>
                )}
              </button>
              <div className={styles.planDividerBlue} />
              <p className={styles.plusLabel}>Alles aus Business, plus:</p>
              <ul className={styles.featureList}>
                {enterpriseFeatures.map((f, i) => (
                  <li key={i} className={`${styles.featureLi} ${styles.featureLiPaid}`}>
                    <Check size={18} strokeWidth={2.6} />
                    <span>{f.text}</span>
                    {f.highlight && <span className={styles.exclusiveTag}>Exklusiv</span>}
                  </li>
                ))}
              </ul>
              <div className={styles.trustBadgeRowWrap}><TrustBadgeRow /></div>
            </motion.div>
          </div>

          <div className={styles.guaranteeBar}>
            <ShieldCheck size={20} strokeWidth={2} />
            <span><strong>14 Tage Geld-zurück-Garantie.</strong> Jederzeit kündbar.</span>
          </div>
          <p className={styles.footnote}>Alle Preise zzgl. MwSt. · Sichere Zahlung über Stripe · SEPA, Kreditkarte &amp; mehr</p>
        </section>

        {/* COMPARISON */}
        <section id="compare" className={styles.compare}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>Vergleich</span>
            <h2 className={styles.sectionH2}>Alle <span className={styles.gradText}>Features</span> im Überblick</h2>
            <p className={styles.sectionLede}>Was steckt in welchem Plan?</p>
          </div>
          <div className={styles.scrollHint}>← Wische um mehr zu sehen →</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thFeature}>Funktion</th>
                  <th className={styles.thStarter}>Starter</th>
                  <th className={styles.thBusiness}>Business</th>
                  <th className={styles.thEnterprise}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {featureMatrix.map((item, index) => (
                  <tr key={index}>
                    <td className={styles.tdFeature}>{item.feature}</td>
                    <td className={styles.tdStarter}>{renderCell(item.free, 'starter')}</td>
                    <td className={styles.tdBusiness}>{renderCell(item.business, 'business')}</td>
                    <td className={styles.tdEnterprise}>{renderCell(item.premium, 'premium')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SEO CROSS-LINK */}
        <section className={styles.seo}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionH2}>Spezialisierte <span className={styles.gradText}>Vertragsprüfungen</span></h2>
            <p className={styles.sectionLede}>Mit jedem Tarif voll nutzbar. Die KI analysiert auf Basis aktueller BGH- und BAG-Rechtsprechung.</p>
          </div>
          <div className={styles.seoGrid}>
            <Link to="/arbeitsvertrag-pruefen" className={styles.seoCard}>
              <span className={styles.seoKicker}>Arbeitsrecht</span>
              <h3 className={styles.seoTitle}>Arbeitsvertrag prüfen</h3>
              <p className={styles.seoDesc}>BAG-Rechtsprechung, Wettbewerbsverbot, Probezeit</p>
              <span className={styles.seoMore}>Prüfen <ArrowRight size={14} strokeWidth={2.4} /></span>
            </Link>
            <Link to="/mietvertrag-pruefen" className={styles.seoCard}>
              <span className={styles.seoKicker}>Mietrecht</span>
              <h3 className={styles.seoTitle}>Mietvertrag prüfen</h3>
              <p className={styles.seoDesc}>Schönheitsreparaturen, Kaution, Indexmiete</p>
              <span className={styles.seoMore}>Prüfen <ArrowRight size={14} strokeWidth={2.4} /></span>
            </Link>
            <Link to="/nda-pruefen" className={styles.seoCard}>
              <span className={styles.seoKicker}>Geheimhaltung</span>
              <h3 className={styles.seoTitle}>NDA prüfen</h3>
              <p className={styles.seoDesc}>Vertragsstrafe, Carve-Outs, GeschGehG</p>
              <span className={styles.seoMore}>Prüfen <ArrowRight size={14} strokeWidth={2.4} /></span>
            </Link>
            <Link to="/kaufvertrag-pruefen" className={styles.seoCard}>
              <span className={styles.seoKicker}>Kaufrecht</span>
              <h3 className={styles.seoTitle}>Kaufvertrag prüfen</h3>
              <p className={styles.seoDesc}>Gewährleistung, Beschaffenheit, BGB</p>
              <span className={styles.seoMore}>Prüfen <ArrowRight size={14} strokeWidth={2.4} /></span>
            </Link>
          </div>
          <div className={styles.seoBottomLink}>
            <Link to="/ki-vertragsanalyse">Mehr über KI-Vertragsanalyse erfahren →</Link>
          </div>
        </section>

        {/* TESTIMONIALS (illustrativ — vor Launch durch echte ersetzen) */}
        <section className={styles.tst}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>Stimmen</span>
            <h2 className={styles.sectionH2}>Das sagen unsere <span className={styles.gradText}>Nutzer</span></h2>
            <p className={styles.sectionLede}>Über 500 Unternehmen vertrauen Contract AI.</p>
          </div>
          <div className={styles.tstGrid}>
            {testimonials.map((t, i) => (
              <div key={i} className={styles.tstCard}>
                <div className={styles.tstStars}>★★★★★</div>
                <p className={styles.tstQuote}>{t.quote}</p>
                <div className={styles.tstFoot}>
                  <span className={styles.tstAvatar} style={{ background: t.color }}>{t.initials}</span>
                  <div>
                    <div className={styles.tstName}>{t.name}</div>
                    <div className={styles.tstRole}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={styles.faq}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>FAQ</span>
            <h2 className={styles.sectionH2}>Häufige <span className={styles.gradText}>Fragen</span></h2>
            <p className={styles.sectionLede}>Antworten auf die wichtigsten Fragen rund um Contract AI.</p>
          </div>
          <div className={styles.faqList}>
            {faqs.map((faq, i) => (
              <div key={i} className={styles.faqItem}>
                <button
                  className={styles.faqQ}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown size={20} strokeWidth={2.4} className={`${styles.faqChevron} ${openFaq === i ? styles.faqChevronOpen : ''}`} />
                </button>
                <AnimatePresence initial={false}>
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
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className={styles.cta}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaAuroraWrap}>
              <div className={styles.ctaAurora1} />
              <div className={styles.ctaAurora2} />
            </div>
            <div className={styles.ctaGrid} />
            <div className={styles.ctaInner}>
              <div className={styles.ctaProof}>
                <div className={styles.ctaAvatars}>
                  <span className={styles.ctaAvatar} style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>MK</span>
                  <span className={styles.ctaAvatar} style={{ background: "linear-gradient(135deg,#3B82F6,#06B6D4)" }}>SB</span>
                  <span className={styles.ctaAvatar} style={{ background: "linear-gradient(135deg,#2563EB,#3B82F6)" }}>TL</span>
                  <span className={styles.ctaAvatar} style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>JW</span>
                </div>
                <span className={styles.ctaProofStars}>★★★★★</span>
                <span className={styles.ctaProofText}>500+ zufriedene Nutzer</span>
              </div>

              <h2 className={styles.ctaTitle}>Starte jetzt <span className={styles.gradText}>risikofrei</span></h2>
              <p className={styles.ctaSub}>
                Schließe dich über 500 Unternehmen an, die ihre Verträge smarter verwalten. 14 Tage Geld-zurück-Garantie, ohne Wenn und Aber.
              </p>

              <div className={styles.ctaCampaign}>
                <span className={styles.pulseWrap}><span className={styles.pulseDot} /></span>
                <span className={styles.ctaCampaignText}>{campaign.label} läuft · {urgencyData.discountPercent} % Rabatt noch aktiv</span>
              </div>

              <div className={styles.ctaButtons}>
                <Link to="/register" className={styles.ctaPrimary}>
                  <span className={styles.ctaPrimaryInner}>
                    Jetzt kostenlos starten
                    <ArrowRight size={19} strokeWidth={2.4} />
                  </span>
                  <span className={styles.ctaSheen} />
                </Link>
                <a href="#plans" className={styles.ctaSecondary}>
                  Alle Pläne ansehen
                  <ChevronDown size={15} strokeWidth={2.2} />
                </a>
                <span className={styles.ctaMicro}>Keine Kreditkarte nötig · in 2 Minuten startklar</span>
              </div>

              <div className={styles.ctaTrust}>
                <span className={styles.ctaTrustItem}><Check size={15} strokeWidth={2.6} />DSGVO-konform</span>
                <span className={styles.ctaTrustItem}><Check size={15} strokeWidth={2.6} />14-Tage-Garantie</span>
                <span className={styles.ctaTrustItem}><Check size={15} strokeWidth={2.6} />Jederzeit kündbar</span>
                <span className={styles.ctaTrustItem}><Check size={15} strokeWidth={2.6} />Deutsche Server</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <LandingFooter />
    </>
  );
}

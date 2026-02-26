import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from "react-helmet-async";
import { useAuth } from "../hooks/useAuth";;
import HomePricingCards from "../components/HomePricingCards";
import AutoPlayVideo from "../components/AutoPlayVideo";
import "../styles/landing.css";

// Importiere Bilder
import logo from "../assets/logo-contractai.webp";
import logoHeader from "../assets/logo-header.webp";
import analyseImg from "../assets/Analyse.webp";
import fristenImg from "../assets/Fristen.webp";
import optimierungImg from "../assets/Optimierung.webp";
import vergleichImg from "../assets/Vergleich.webp";
import dsgvoBadge from "../assets/dsgvo-badge.webp";
import trustpilotBadge from "../assets/trustpilot-badge.webp";

// Video-Pfade (aus public-Ordner)
const analyseVideo = "/Videos/analyse.mp4";
const optimierungVideo = "/Videos/optimierung.mp4";
const fristenVideo = "/Videos/fristen.mp4";
const vergleichVideo = "/Videos/vergleich.mp4";





// TypeScript-Interface für Window-Erweiterung
declare global {
  interface Window {
    openCookieSettings?: () => void;
  }
}

// Testimonials Marquee Component - Modern 2-Row Design
const TestimonialsMarquee = () => {

  // Testimonial-Daten - Mix aus Fotos und Initialen für Authentizität
  const testimonials = [
    {
      id: 1,
      name: "Lisa Kramer",
      location: "Frankfurt",
      role: "Freelancerin",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
      rating: 5,
      text: "Habe bei meinem Werkvertrag einen Passus übersehen, der mich 280€ extra gekostet hätte. Contract AI hat das sofort erkannt!",
      verified: true
    },
    {
      id: 2,
      name: "Marcus T.",
      location: "München",
      role: "IT-Berater",
      image: null, // Kein Bild - zeigt Initialen
      rating: 5,
      text: "Endlich verstehe ich meine Mietverträge ohne Anwalt. Die KI erklärt alles verständlich — spart Zeit und Geld.",
      verified: true
    },
    {
      id: 3,
      name: "Sarah Müller",
      location: "Berlin",
      role: "Projektmanagerin",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
      rating: 5,
      text: "Dachte, mein Handyvertrag läuft noch 6 Monate. War tatsächlich schon kündbar — 180€ gespart!",
      verified: true
    },
    {
      id: 4,
      name: "Daniel Richter",
      location: "Hamburg",
      role: "Startup-Gründer",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
      rating: 5,
      text: "Für NDA-Verträge mit Investoren nutze ich nur noch Contract AI. Kein Rechtsanwalt nötig für Standardverträge.",
      verified: true
    },
    {
      id: 5,
      name: "Thomas W.",
      location: "Würzburg",
      role: "Handwerksmeister",
      image: null, // Kein Bild - zeigt Initialen
      rating: 5,
      text: "Hab meinen Lieferantenvertrag gecheckt und eine versteckte Preisklausel gefunden. Hätte mich 2.400€ mehr pro Jahr gekostet!",
      verified: true
    },
    {
      id: 6,
      name: "Julia Schmidt",
      location: "Köln",
      role: "Marketing Managerin",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
      rating: 5,
      text: "Bei uns im Team nutzen jetzt alle Contract AI für Freelancer-Verträge. Spart uns echt Zeit!",
      verified: true
    },
    {
      id: 7,
      name: "Kevin B.",
      location: "Stuttgart",
      role: "BWL-Student",
      image: null, // Kein Bild - zeigt Initialen
      rating: 4,
      text: "Mein Fitnessstudio-Abo lief automatisch weiter. Contract AI hat mein Sonderkündigungsrecht erkannt — 360€ zurück!",
      verified: true
    },
    {
      id: 8,
      name: "Dr. Anna Peters",
      location: "München",
      role: "Steuerberaterin",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face",
      rating: 5,
      text: "Als Steuerberaterin muss ich oft Verträge prüfen. Contract AI ist fester Teil meines Workflows. Die Risiko-Analyse ist top.",
      verified: true
    }
  ];

  // Erste Reihe: Testimonials 1-4
  const row1 = testimonials.slice(0, 4);
  // Zweite Reihe: Testimonials 5-8
  const row2 = testimonials.slice(4, 8);

  // Star Rating Component
  const StarRating = ({ rating }: { rating: number }) => (
    <div className="testimonial-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`star-icon ${star <= rating ? 'filled' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={star <= rating ? "#FBBF24" : "none"}
          stroke={star <= rating ? "#FBBF24" : "#D1D5DB"}
          strokeWidth="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );

  // Initialen aus Name extrahieren
  const getInitials = (name: string) => {
    const parts = name.replace('Dr. ', '').split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Testimonial Card Component
  const TestimonialCard = ({ testimonial }: { testimonial: typeof testimonials[0] }) => (
    <div className="testimonial-card-new">
      <div className="testimonial-header">
        {testimonial.image ? (
          <img
            src={testimonial.image}
            alt={testimonial.name}
            className="testimonial-avatar"
            loading="lazy"
          />
        ) : (
          <div className="testimonial-avatar-initials">
            {getInitials(testimonial.name)}
          </div>
        )}
        <div className="testimonial-info">
          <div className="testimonial-name-row">
            <span className="testimonial-name">{testimonial.name}</span>
            {testimonial.verified && (
              <svg className="verified-badge" width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fff" strokeWidth="2" fill="#3B82F6"/>
                <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            )}
          </div>
          <span className="testimonial-location">{testimonial.location} • {testimonial.role}</span>
        </div>
      </div>
      <StarRating rating={testimonial.rating} />
      <p className="testimonial-text-new">"{testimonial.text}"</p>
      {testimonial.verified && (
        <div className="testimonial-verified-tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Verifizierter Nutzer</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="testimonials-marquee">
      {/* Row 1 - Scrolls Left */}
      <div className="marquee-row">
        <div className="marquee-fade marquee-fade-left"></div>
        <div className="marquee-track">
          {/* Duplicate cards for seamless loop */}
          {[...row1, ...row1].map((testimonial, index) => (
            <TestimonialCard key={`row1-${testimonial.id}-${index}`} testimonial={testimonial} />
          ))}
        </div>
        <div className="marquee-fade marquee-fade-right"></div>
      </div>

      {/* Row 2 - Scrolls Right (reverse) */}
      <div className="marquee-row">
        <div className="marquee-fade marquee-fade-left"></div>
        <div className="marquee-track marquee-reverse">
          {/* Duplicate cards for seamless loop */}
          {[...row2, ...row2].map((testimonial, index) => (
            <TestimonialCard key={`row2-${testimonial.id}-${index}`} testimonial={testimonial} />
          ))}
        </div>
        <div className="marquee-fade marquee-fade-right"></div>
      </div>
    </div>
  );
};

// Animated Counter Component with Intersection Observer
const AnimatedCounter = ({ end, suffix = '', prefix = '', duration = 2000 }: {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);

            // Animate the counter
            const startTime = performance.now();
            const animate = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);

              // Easing function for smooth animation
              const easeOutQuart = 1 - Math.pow(1 - progress, 4);
              const currentCount = Math.floor(easeOutQuart * end);

              setCount(currentCount);

              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                setCount(end);
              }
            };

            requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return (
    <span ref={counterRef} className="counter-number">
      {prefix}{count.toLocaleString('de-DE')}{suffix}
    </span>
  );
};

// Stats Counter Section Component
const StatsSection = () => {
  const stats = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="usersGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <circle cx="18" cy="14" r="8" fill="url(#usersGrad)" />
          <path d="M4 40c0-8 6-14 14-14s14 6 14 14" fill="url(#usersGrad)" opacity="0.9" />
          <circle cx="34" cy="16" r="6" fill="url(#usersGrad)" opacity="0.7" />
          <path d="M44 40c0-6-4-10-10-10" stroke="url(#usersGrad)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
        </svg>
      ),
      number: 200,
      suffix: '+',
      label: 'Zufriedene Kunden',
      color: '#3b82f6',
      bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(96, 165, 250, 0.08) 100%)'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="docsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path d="M12 4h16l12 12v28a4 4 0 01-4 4H12a4 4 0 01-4-4V8a4 4 0 014-4z" fill="url(#docsGrad)" />
          <path d="M28 4v12h12" fill="rgba(255,255,255,0.3)" />
          <rect x="14" y="24" width="20" height="3" rx="1.5" fill="white" opacity="0.9" />
          <rect x="14" y="32" width="14" height="3" rx="1.5" fill="white" opacity="0.7" />
          <circle cx="38" cy="38" r="10" fill="#10b981" stroke="white" strokeWidth="3" />
          <path d="M34 38l3 3 6-6" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      number: 1500,
      suffix: '+',
      label: 'Verträge analysiert',
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(52, 211, 153, 0.08) 100%)'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="moneyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="20" fill="url(#moneyGrad)" />
          <circle cx="24" cy="24" r="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <text x="24" y="30" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="Arial">€</text>
          <path d="M8 8l4 4M40 8l-4 4M8 40l4-4M40 40l-4-4" stroke="url(#moneyGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        </svg>
      ),
      number: 75000,
      suffix: '€+',
      label: 'Eingespart durch Optimierung',
      color: '#f59e0b',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.08) 100%)'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <path d="M24 4L6 12v12c0 11 8 21 18 24 10-3 18-13 18-24V12L24 4z" fill="url(#shieldGrad)" />
          <path d="M24 8L10 14v10c0 9 6 17 14 20 8-3 14-11 14-20V14L24 8z" fill="rgba(255,255,255,0.2)" />
          <circle cx="24" cy="22" r="8" fill="white" opacity="0.95" />
          <path d="M20 22l3 3 6-6" stroke="#8b5cf6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      number: 99,
      suffix: '%',
      label: 'Kundenzufriedenheit',
      color: '#8b5cf6',
      bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(167, 139, 250, 0.08) 100%)'
    }
  ];

  return (
    <section className="stats-counter-section">
      <div className="section-container">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="stat-card reveal-card"
              style={{"--animation-order": index, "--stat-color": stat.color} as React.CSSProperties}
            >
              <div className="stat-icon" style={{ background: stat.bgGradient }}>
                {stat.icon}
              </div>
              <div className="stat-content">
                <AnimatedCounter end={stat.number} suffix={stat.suffix} duration={2500} />
                <span className="stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HomeRedesign = () => {
  const { user } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<{ [key: string]: HTMLElement | null }>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Scroll event listener for reveal animations
    const handleScroll = () => {
      // Reveal animations based on scroll position
      document.querySelectorAll('.reveal-card, .reveal-block').forEach((element) => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
          element.classList.add('animated');
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    // Initial call to ensure no transformation is applied on page load
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Register section refs
  const registerSection = (id: string, element: HTMLElement | null) => {
    if (element) {
      sectionsRef.current[id] = element;
    }
  };

  // Cookie-Einstellungen öffnen
  const handleOpenCookieSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.openCookieSettings) {
      window.openCookieSettings();
    }
  };

  return (
    <>
      <Helmet>
        <title>Contract AI – Verträge mit KI analysieren & optimieren | Jetzt kostenlos testen</title>
        <meta
          name="description"
          content="Analysiere, optimiere & vergleiche Verträge in Minuten mit KI. Versteckte Risiken erkennen, Fristen im Blick behalten, Verträge generieren. Jetzt kostenlos starten!"
        />
        <meta
          name="keywords"
          content="Vertragsanalyse KI, Vertragsoptimierung, KI Vertragsmanagement, Verträge analysieren, Vertragsrisiken erkennen, Verträge vergleichen, Contract AI, Legal Tech, Fristenverwaltung, Vertragsgenerator"
        />
        <link rel="canonical" href="https://www.contract-ai.de/" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

        {/* Open Graph / Facebook */}
        <meta property="og:locale" content="de_DE" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contract AI – Verträge mit KI analysieren & optimieren | Jetzt testen" />
        <meta property="og:description" content="Analysiere, optimiere & vergleiche Verträge in Minuten mit KI. Contract AI ist deine smarte Lösung für sichere & effiziente Vertragsverwaltung." />
        <meta property="og:url" content="https://www.contract-ai.de/" />
        <meta property="og:site_name" content="Contract AI" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Contract AI - KI-gestützte Vertragsanalyse" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@contract_ai" />
        <meta name="twitter:creator" content="@contract_ai" />
        <meta name="twitter:title" content="Contract AI – Verträge mit KI analysieren & optimieren" />
        <meta name="twitter:description" content="Sichere dir jetzt volle Kontrolle über deine Verträge. Analysiere & optimiere mit Contract AI – schnell, einfach & effizient." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />

        {/* Schema.org JSON-LD: Organization */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": "https://www.contract-ai.de/#organization",
            "name": "Contract AI",
            "url": "https://www.contract-ai.de",
            "logo": {
              "@type": "ImageObject",
              "url": "https://www.contract-ai.de/logo.png",
              "width": 512,
              "height": 512
            },
            "image": "https://www.contract-ai.de/og-image.jpg",
            "description": "KI-gestützte Vertragsanalyse und -optimierung für Unternehmen und Privatpersonen",
            "email": "support@contract-ai.de",
            "sameAs": [
              "https://www.linkedin.com/company/contract-ai",
              "https://twitter.com/contract_ai"
            ]
          })}
        </script>

        {/* Schema.org JSON-LD: WebSite */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": "https://www.contract-ai.de/#website",
            "url": "https://www.contract-ai.de",
            "name": "Contract AI",
            "description": "Verträge analysieren, optimieren und verwalten mit KI",
            "publisher": {
              "@id": "https://www.contract-ai.de/#organization"
            },
            "inLanguage": "de-DE",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://www.contract-ai.de/blog?search={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          })}
        </script>

        {/* Schema.org JSON-LD: SoftwareApplication */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "@id": "https://www.contract-ai.de/#software",
            "name": "Contract AI",
            "operatingSystem": "Web",
            "applicationCategory": "BusinessApplication",
            "applicationSubCategory": "Legal Tech Software",
            "url": "https://www.contract-ai.de",
            "screenshot": "https://www.contract-ai.de/og-image.jpg",
            "description": "Contract AI ist eine smarte SaaS-Lösung für KI-gestützte Vertragsanalyse, Optimierung und Vertragsverwaltung. Analysiere Verträge in 60 Sekunden, erkenne versteckte Risiken und spare bis zu 80% Zeit.",
            "featureList": [
              "KI-gestützte Vertragsanalyse in 60 Sekunden",
              "Automatische Risikoerkennung",
              "Vertragsoptimierung mit Verbesserungsvorschlägen",
              "Fristenverwaltung mit Erinnerungen",
              "Vertragsvergleich",
              "Vertragsgenerator",
              "Legal Pulse News",
              "Digitale Signatur"
            ],
            "offers": [
              {
                "@type": "Offer",
                "name": "Starter",
                "description": "3 KI-Vertragsanalysen kostenlos",
                "price": "0",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                "name": "Business",
                "description": "25 KI-Analysen/Monat, Optimierung, Vergleich, KI-Chat, digitale Signaturen",
                "price": "19",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                "name": "Enterprise",
                "description": "Unbegrenzte Analysen, alle Features, Team-Management, API-Zugang",
                "price": "29",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock"
              }
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "bestRating": "5",
              "worstRating": "1",
              "ratingCount": "127",
              "reviewCount": "89"
            },
            "review": [
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Lisa Kramer" },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Habe bei meinem Werkvertrag einen Passus übersehen, der mich 280€ extra gekostet hätte. Contract AI hat das sofort erkannt!"
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Marcus T." },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Endlich verstehe ich meine Mietverträge ohne Anwalt. Die KI erklärt alles verständlich — spart Zeit und Geld."
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Sarah Müller" },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Dachte, mein Handyvertrag läuft noch 6 Monate. War tatsächlich schon kündbar — 180€ gespart!"
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Daniel Richter" },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Für NDA-Verträge mit Investoren nutze ich nur noch Contract AI. Kein Rechtsanwalt nötig für Standardverträge."
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Thomas W." },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Hab meinen Lieferantenvertrag gecheckt und eine versteckte Preisklausel gefunden. Hätte mich 2.400€ mehr pro Jahr gekostet!"
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Julia Schmidt" },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Bei uns im Team nutzen jetzt alle Contract AI für Freelancer-Verträge. Spart uns echt Zeit!"
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Kevin B." },
                "reviewRating": { "@type": "Rating", "ratingValue": "4", "bestRating": "5" },
                "reviewBody": "Mein Fitnessstudio-Abo lief automatisch weiter. Contract AI hat mein Sonderkündigungsrecht erkannt — 360€ zurück!"
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Dr. Anna Peters" },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Als Steuerberaterin muss ich oft Verträge prüfen. Contract AI ist fester Teil meines Workflows. Die Risiko-Analyse ist top."
              }
            ],
            "provider": {
              "@id": "https://www.contract-ai.de/#organization"
            }
          })}
        </script>
      </Helmet>

      <div className="landing-page">
        {/* Floating Light Elements */}
        <div className="floating-light floating-light-left" style={{ left: '20px' }}></div>
        <div className="floating-light floating-light-right" style={{ right: '20px', animationDelay: '4s' }}></div>

        {/* Sophisticated Apple-Hero with Modern Effects */}
        <section className="hero sophisticated-hero" ref={heroRef}>
          {/* Contract Theme Background Effects */}

          {/* Paper Lines - Like a contract document */}
          <div className="contract-paper-lines"></div>

          {/* Floating Document Icons - VERSTÄRKT */}
          <div className="floating-document floating-document-1">
            <svg viewBox="0 0 60 75" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="56" height="71" rx="4" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="2.5" fill="rgba(255,255,255,0.5)"/>
              <line x1="12" y1="20" x2="48" y2="20" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              <line x1="12" y1="32" x2="48" y2="32" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              <line x1="12" y1="44" x2="36" y2="44" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              <line x1="12" y1="56" x2="42" y2="56" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              {/* Signatur-Linien unten */}
              <path d="M12,64 Q20,60 28,64 T44,62" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <div className="floating-document floating-document-2">
            <svg viewBox="0 0 60 75" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="56" height="71" rx="4" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="2.5" fill="rgba(255,255,255,0.5)"/>
              <line x1="12" y1="20" x2="48" y2="20" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              <line x1="12" y1="32" x2="48" y2="32" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              <line x1="12" y1="44" x2="36" y2="44" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              {/* Checkbox */}
              <rect x="12" y="54" width="12" height="12" rx="2" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="1.5" fill="none"/>
              <path d="M14,60 L17,63 L22,56" stroke="rgba(34, 197, 94, 0.6)" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <div className="floating-document floating-document-3">
            <svg viewBox="0 0 60 75" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="56" height="71" rx="4" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="2.5" fill="rgba(255,255,255,0.5)"/>
              <line x1="12" y1="20" x2="48" y2="20" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              <line x1="12" y1="32" x2="40" y2="32" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              {/* Paragraph Symbol */}
              <text x="20" y="58" fill="rgba(99, 102, 241, 0.5)" fontSize="20" fontFamily="Georgia, serif">§</text>
            </svg>
          </div>
          <div className="floating-document floating-document-4">
            <svg viewBox="0 0 60 75" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="56" height="71" rx="4" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="2.5" fill="rgba(255,255,255,0.5)"/>
              <line x1="12" y1="20" x2="48" y2="20" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              <line x1="12" y1="32" x2="48" y2="32" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              <line x1="12" y1="44" x2="30" y2="44" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2.5"/>
              {/* Stempel */}
              <circle cx="42" cy="58" r="10" stroke="rgba(34, 197, 94, 0.5)" strokeWidth="2" fill="none"/>
              <text x="38" y="61" fill="rgba(34, 197, 94, 0.5)" fontSize="6" fontWeight="bold">OK</text>
            </svg>
          </div>

          <div className="sophisticated-logo-hero">
            <img src={logoHeader} alt="Contract AI Logo" className="sophisticated-logo-animation" />
          </div>

          <div className="sophisticated-hero-content">
            <div className="sophisticated-hero-text-container">
              {/* Headline with Glow Effect */}
              <div className="headline-glow-wrapper">
                <h1 className="sophisticated-hero-headline sophisticated-fade-up">
                  <span className="headline-line">Verträge im Griff.</span>
                  <span className="headline-line">Kosten gespart.</span>
                  <span className="headline-line headline-line-with-signature">
                    Zeit gewonnen.
                    {/* "Contract AI" als handschriftliche Unterschrift - inline nach dem Punkt */}
                    <svg className="contractai-signature" viewBox="0 0 200 50" preserveAspectRatio="xMinYMid meet">
                      {/* "C" - Großbuchstabe */}
                      <path
                        className="sig-c"
                        d="M18,18 C8,20 4,28 6,36 C8,44 16,48 26,46 C30,45 33,43 35,40"
                      />
                      {/* "ontract" - verbunden, schnell geschrieben */}
                      <path
                        className="sig-ontract"
                        d="M28,38 C32,36 35,32 38,34 C41,36 40,40 43,38 C46,36 48,32 52,34 C54,35 54,38 56,36 C58,34 60,30 64,32 C66,33 66,38 69,36 C72,34 74,30 78,32 C80,34 80,38 83,35 C86,32 88,28 92,32"
                      />
                      {/* Leerzeichen + "A" - Großbuchstabe */}
                      <path
                        className="sig-a"
                        d="M105,42 L112,22 L119,42 M108,34 L116,34"
                      />
                      {/* "I" - mit Punkt */}
                      <path
                        className="sig-i"
                        d="M128,26 L128,42"
                      />
                      <circle className="sig-i-dot" cx="128" cy="20" r="2" />
                      {/* Schwungvoller Unterstrich */}
                      <path
                        className="sig-flourish"
                        d="M6,50 Q60,55 120,48 Q150,45 180,50"
                      />
                    </svg>
                  </span>
                </h1>
              </div>

              {/* Subheadline with Glass Effect */}
              <div className="subheadline-glass-wrapper">
                <p className="sophisticated-hero-subheadline sophisticated-fade-up-delay">
                  Erkennt versteckte Risiken, erinnert an Fristen und behält alle Verträge im Blick – damit Sie es nicht müssen.
                </p>
              </div>
              
              {/* Trust Hint with Enhanced Glass Effect */}
              <div className="trust-hint-enhanced-wrapper">
                <div className="sophisticated-hero-trust-hint sophisticated-fade-up-delay-2">
                  <span className="trust-hint-icon">🔐</span>
                  <span className="trust-hint-text">Deutsche Server. Maximaler Schutz. Ihre Daten bleiben Ihre Daten.</span>
                </div>
              </div>
            </div>

            {/* Scroll Indicator - zentriert zwischen Trust Hint und Buttons */}
            <div className="sophisticated-scroll-indicator">
              <div className="sophisticated-scroll-chevron"></div>
            </div>

            <div className="sophisticated-hero-cta sophisticated-fade-up-delay-3">
              {!user ? (
                <div className="sophisticated-auth-cta">
                  <Link to="/register" className="sophisticated-cta-button sophisticated-primary">
                    <span className="cta-button-glow"></span>
                    <span className="sophisticated-button-content">
                      <span className="sophisticated-button-text">Jetzt starten</span>
                      <span className="sophisticated-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"></path>
                          <path d="m12 5 7 7-7 7"></path>
                        </svg>
                      </span>
                    </span>
                  </Link>
                  <Link to="/pricing" className="sophisticated-cta-button sophisticated-secondary">
                    <span className="sophisticated-button-content">
                      <span className="sophisticated-button-text">Kostenlos testen</span>
                    </span>
                  </Link>
                </div>
              ) : user.subscriptionActive ? (
                <Link to="/dashboard" className="sophisticated-cta-button sophisticated-primary">
                  <span className="cta-button-glow"></span>
                  <span className="sophisticated-button-content">
                    <span className="sophisticated-button-text">Zum Dashboard</span>
                    <span className="sophisticated-button-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                      </svg>
                    </span>
                  </span>
                </Link>
              ) : (
                <div className="sophisticated-auth-cta">
                  <Link to="/dashboard" className="sophisticated-cta-button sophisticated-primary">
                    <span className="cta-button-glow"></span>
                    <span className="sophisticated-button-content">
                      <span className="sophisticated-button-text">Zum Dashboard</span>
                      <span className="sophisticated-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"></path>
                          <path d="m12 5 7 7-7 7"></path>
                        </svg>
                      </span>
                    </span>
                  </Link>
                  <Link to="/pricing" className="sophisticated-cta-button sophisticated-secondary">
                    <span className="sophisticated-button-content">
                      <span className="sophisticated-button-text">🔒 Free – Jetzt upgraden</span>
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Trustbar Section */}
        <section className="trustbar-section">
          <div className="section-container">
            <div className="trustbar">
              <div className="trust-item reveal-card" style={{"--animation-order": 0} as React.CSSProperties}>
                <span className="trust-icon">✅</span>
                <span className="trust-text">DSGVO-konform</span>
              </div>
              <div className="trust-item reveal-card" style={{"--animation-order": 1} as React.CSSProperties}>
                <span className="trust-icon">🇩🇪</span>
                <span className="trust-text">Serverstandort: Frankfurt (EU-Cloud)</span>
              </div>
              <div className="trust-item reveal-card" style={{"--animation-order": 2} as React.CSSProperties}>
                <span className="trust-icon">🧠</span>
                <span className="trust-text">KI-gestützt & juristisch geprüft</span>
              </div>
              <div className="trust-item reveal-card" style={{"--animation-order": 3} as React.CSSProperties}>
                <span className="trust-icon">🔒</span>
                <span className="trust-text">Verschlüsselte Datenübertragung</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Counter Section - Animated Numbers */}
        <StatsSection />

        {/* Features Section - Erweitert auf 6 Cards */}
        <section className="features-section" ref={(el) => registerSection('features', el)}>
          {/* Contract Theme: Floating § (Paragraph) Symbols */}
          <span className="floating-paragraph floating-paragraph-1">§</span>
          <span className="floating-paragraph floating-paragraph-2">§</span>
          <span className="floating-paragraph floating-paragraph-3">§</span>
          <div className="section-container">
            <div className="section-title features-title">
              <span className="section-badge reveal-text">SO FUNKTIONIERT'S</span>
              <h2 className="reveal-text">Unsere KI-Tools für<br /><span className="text-gradient">Ihre Verträge</span></h2>
              <p className="reveal-text">Erleben Sie die Zukunft des Vertragsmanagements.</p>
              </div>
            
            <div className="features-grid">
              <div className="feature-card reveal-card" style={{"--animation-order": 0} as React.CSSProperties}>
                <div className="feature-icon-wrapper blue">
                  <div className="feature-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      <line x1="11" y1="8" x2="11" y2="14"></line>
                      <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                  </div>
                </div>
                <h3>Analyse</h3>
                <p>Verträge KI-basiert auswerten, Risiken erkennen & Transparenz gewinnen.</p>
                <Link to="/features/vertragsanalyse" className="feature-link">
                  Vertragsanalyse entdecken
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>
              
              <div className="feature-card reveal-card" style={{"--animation-order": 1} as React.CSSProperties}>
                <div className="feature-icon-wrapper pink">
                  <div className="feature-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {/* Zauberstab für "magische" Optimierung */}
                      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"></path>
                    </svg>
                  </div>
                </div>
                <h3>Optimierung</h3>
                <p>Unvorteilhafte Klauseln erkennen und durch bessere Formulierungen ersetzen.</p>
                <Link to="/features/optimierung" className="feature-link">
                  Optimierung entdecken
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>
              
              <div className="feature-card reveal-card" style={{"--animation-order": 2} as React.CSSProperties}>
                <div className="feature-icon-wrapper orange">
                  <div className="feature-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                </div>
                <h3>Fristen</h3>
                <p>Kündigungsfristen automatisch erkennen & rechtzeitig per Mail erinnert werden.</p>
                <Link to="/features/fristen" className="feature-link">
                  Fristenkalender entdecken
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>
              
              <div className="feature-card reveal-card" style={{"--animation-order": 3} as React.CSSProperties}>
                <div className="feature-icon-wrapper purple">
                  <div className="feature-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {/* Zwei Dokumente nebeneinander für Vergleich */}
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <line x1="10" y1="9" x2="8" y2="9"></line>
                    </svg>
                  </div>
                </div>
                <h3>Vergleich</h3>
                <p>Zwei Verträge gegenüberstellen, Unterschiede visuell hervorheben.</p>
                <Link to="/features/vergleich" className="feature-link">
                  Vertragsvergleich entdecken
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>

              {/* Legal Lens Card - Position 4 (Ende Reihe 1) */}
              <div className="feature-card reveal-card" style={{"--animation-order": 4} as React.CSSProperties}>
                <div className="feature-icon-wrapper cyan">
                  <div className="feature-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {/* Auge mit Lupe - "Deep Vision" */}
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </div>
                </div>
                <h3>Legal Lens</h3>
                <p>Interaktive Vertragsanalyse mit Risiko-Score, Smart Summary & Verhandlungs-Empfehlungen.</p>
                <Link to="/features/legal-lens" className="feature-link">
                  Legal Lens entdecken
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>

              {/* Generator Card - Position 5 (Anfang Reihe 2) */}
              <div className="feature-card reveal-card" style={{"--animation-order": 5} as React.CSSProperties}>
                <div className="feature-icon-wrapper green">
                  <div className="feature-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                </div>
                <h3>Generator</h3>
                <p>Vertragsdokumente aus KI-Vorlagen erzeugen – z. B. Freelancer-, NDA- oder Mietverträge.</p>
                <Link to="/features/generator" className="feature-link">
                  Vertragsgenerator entdecken
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>

              {/* Digitale Signatur Card */}
              <div className="feature-card reveal-card" style={{"--animation-order": 6} as React.CSSProperties}>
                <div className="feature-icon-wrapper teal">
                  <div className="feature-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {/* Stift für digitale Signatur */}
                      <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                      <path d="M2 2l7.586 7.586"></path>
                      <circle cx="11" cy="11" r="2"></circle>
                    </svg>
                  </div>
                </div>
                <h3>Digitale Signatur</h3>
                <p>Verträge rechtssicher digital signieren lassen – mit Audit Trail, E-Mail-Benachrichtigung & versiegeltem PDF.</p>
                <Link to="/features/digitalesignatur" className="feature-link">
                  Digitale Signatur entdecken
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>

              {/* Legal Pulse Card */}
              <div className="feature-card reveal-card" style={{"--animation-order": 7} as React.CSSProperties}>
                <div className="feature-icon-wrapper red">
                  <div className="feature-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                  </div>
                </div>
                <h3>Legal Pulse</h3>
                <p>Frühwarnsystem für neue Risiken durch Gesetzesänderungen oder unfaire Formulierungen.</p>
                <Link to="/features/legalpulse" className="feature-link">
                  Legal Pulse entdecken
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>
            </div>

            {/* "Alle Funktionen" Button */}
            <div className="features-cta-wrapper">
              <p className="features-hint">Das war noch längst nicht alles.</p>
              <Link to="/features" className="features-discover-btn">
                <span>Alle Funktionen entdecken</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Integrations Logo Banner */}
        <section className="integrations-banner-section" aria-label="Integrationen">
          <div className="section-container">
            <div className="section-title features-title">
              <span className="section-badge reveal-text">INTEGRATIONEN</span>
              <h2 className="reveal-text">Passt in <span className="text-gradient">Ihren Workflow</span></h2>
              <p className="reveal-text">Verbinden Sie Contract AI mit Ihren bestehenden Tools.</p>
            </div>
          </div>

          {/* Full-Width Logo Marquee */}
          <div className="logo-marquee-wrapper">
            <div className="logo-marquee-fade logo-marquee-fade-left"></div>
            <div className="logo-marquee-fade logo-marquee-fade-right"></div>

            <div className="logo-marquee-track">
              {/* Erste Reihe - Original */}

              {/* Google Calendar */}
              <div className="logo-marquee-item">
                <img src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" alt="Google Calendar" className="integration-logo-img" />
                <span>Google Calendar</span>
              </div>

              {/* Microsoft Outlook */}
              <div className="logo-marquee-item">
                <img src="https://img.icons8.com/color/96/microsoft-outlook-2019.png" alt="Microsoft Outlook" className="integration-logo-img" />
                <span>Microsoft Outlook</span>
              </div>

              {/* Apple iCloud */}
              <div className="logo-marquee-item">
                <img src="https://img.icons8.com/ios-filled/100/000000/mac-os.png" alt="Apple" className="integration-logo-img" />
                <span>Apple Calendar</span>
              </div>

              {/* Salesforce */}
              <div className="logo-marquee-item">
                <img src="https://img.icons8.com/color/96/salesforce.png" alt="Salesforce" className="integration-logo-img" />
                <span>Salesforce</span>
              </div>

              {/* HubSpot */}
              <div className="logo-marquee-item">
                <img src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png" alt="HubSpot" className="integration-logo-img" />
                <span>HubSpot</span>
              </div>

              {/* SAP */}
              <div className="logo-marquee-item">
                <img src="https://img.icons8.com/color/96/sap.png" alt="SAP" className="integration-logo-img" />
                <span>SAP</span>
              </div>

              {/* OpenAI */}
              <div className="logo-marquee-item">
                <img src="https://img.icons8.com/ios-filled/100/000000/chatgpt.png" alt="OpenAI" className="integration-logo-img" />
                <span>OpenAI</span>
              </div>

              {/* Zweite Reihe - Duplikat für nahtlose Animation */}

              {/* Google Calendar - Duplikat */}
              <div className="logo-marquee-item">
                <img src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" alt="Google Calendar" className="integration-logo-img" />
                <span>Google Calendar</span>
              </div>

              {/* Microsoft Outlook - Duplikat */}
              <div className="logo-marquee-item">
                <img src="https://img.icons8.com/color/96/microsoft-outlook-2019.png" alt="Microsoft Outlook" className="integration-logo-img" />
                <span>Microsoft Outlook</span>
              </div>

              {/* Apple - Duplikat */}
              <div className="logo-marquee-item">
                <img src="https://img.icons8.com/ios-filled/100/000000/mac-os.png" alt="Apple" className="integration-logo-img" />
                <span>Apple Calendar</span>
              </div>

              {/* Salesforce - Duplikat */}
              <div className="logo-marquee-item">
                <img src="https://img.icons8.com/color/96/salesforce.png" alt="Salesforce" className="integration-logo-img" />
                <span>Salesforce</span>
              </div>

              {/* HubSpot - Duplikat */}
              <div className="logo-marquee-item">
                <img src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png" alt="HubSpot" className="integration-logo-img" />
                <span>HubSpot</span>
              </div>

              {/* SAP - Duplikat */}
              <div className="logo-marquee-item">
                <img src="https://img.icons8.com/color/96/sap.png" alt="SAP" className="integration-logo-img" />
                <span>SAP</span>
              </div>

              {/* OpenAI - Duplikat */}
              <div className="logo-marquee-item">
                <img src="https://img.icons8.com/ios-filled/100/000000/chatgpt.png" alt="OpenAI" className="integration-logo-img" />
                <span>OpenAI</span>
              </div>
            </div>
          </div>
        </section>

        {/* Digitale Vertragsverwaltung Section */}
        <section className="contracts-management" aria-labelledby="contracts-management-title">
          <div className="section-container">
            <div className="cm-grid">
              <div className="cm-text">
                <span className="section-badge reveal-text">VERTRAGSVERWALTUNG</span>
                <h2 id="contracts-management-title" className="cm-headline reveal-text">Ihre Verträge.<br /><span className="text-gradient">Perfekt organisiert.</span></h2>
                <p className="cm-subtext reveal-text">Speichern, organisieren und verwalten Sie all Ihre Verträge sicher in der Contract AI Cloud. Mit automatischen Erinnerungen, schneller Suche und DSGVO-konformer Speicherung.</p>
                <ul className="cm-bullets reveal-block">
                  <li>
                    <div className="cm-bullet-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1Z"></path>
                      </svg>
                    </div>
                    <span><strong>Zentrale Ablage:</strong> Alle Verträge sicher an einem Ort</span>
                  </li>
                  <li>
                    <div className="cm-bullet-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </div>
                    <span><strong>Sofortiger Zugriff:</strong> Finden Sie Dokumente in Sekunden</span>
                  </li>
                  <li>
                    <div className="cm-bullet-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <span><strong>Automatische Erinnerungen:</strong> Fristen nie wieder verpassen</span>
                  </li>
                  <li>
                    <div className="cm-bullet-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>
                    <span><strong>100 % DSGVO-konform:</strong> Deutsche Server</span>
                  </li>
                </ul>
                <div className="cm-cta reveal-text">
                  <Link to="/dashboard" className="cm-btn-primary" data-track="cta-upload-contracts">
                    Jetzt Verträge hochladen
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
              <div className="cm-visual" style={{background: 'transparent', padding: '0'}}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 500 400"
                  className="cm-illustration"
                >
                  <defs>
                    <linearGradient id="folder-gradient-v3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#007aff', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#0052cc', stopOpacity: 1}} />
                    </linearGradient>
                    <linearGradient id="card-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#ffffff', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#f8fafc', stopOpacity: 1}} />
                    </linearGradient>
                    <filter id="shadow-soft">
                      <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#007aff" floodOpacity="0.15"/>
                    </filter>
                    <filter id="shadow-card">
                      <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.08"/>
                    </filter>
                  </defs>

                  {/* Background glow */}
                  <circle cx="250" cy="200" r="120" fill="#007aff" opacity="0.05"/>
                  <circle cx="250" cy="200" r="180" fill="#007aff" opacity="0.03"/>

                  {/* Floating elements */}
                  <circle cx="100" cy="80" r="6" fill="#007aff" opacity="0.4" className="floating-dot floating-dot-1"/>
                  <circle cx="420" cy="120" r="8" fill="#10b981" opacity="0.5" className="floating-dot floating-dot-2"/>
                  <circle cx="380" cy="320" r="5" fill="#007aff" opacity="0.3" className="floating-dot floating-dot-3"/>
                  <circle cx="80" cy="300" r="7" fill="#f59e0b" opacity="0.4" className="floating-dot floating-dot-4"/>

                  {/* Main folder card */}
                  <g transform="translate(125, 80)" filter="url(#shadow-soft)">
                    {/* Folder back */}
                    <rect x="0" y="35" width="250" height="180" rx="16" fill="url(#folder-gradient-v3)"/>
                    {/* Folder tab */}
                    <path d="M0 51 Q0 35 16 35 L80 35 L100 55 L234 55 Q250 55 250 71 L250 51 Q250 35 234 35 L100 35 L80 35 L16 35 Q0 35 0 51 Z" fill="#339dff"/>

                    {/* Glass effect overlay */}
                    <rect x="0" y="35" width="250" height="90" rx="16" fill="url(#card-gradient)" opacity="0.1"/>

                    {/* Document cards stacked */}
                    <g transform="translate(25, 75)" filter="url(#shadow-card)">
                      <rect x="0" y="0" width="80" height="100" rx="8" fill="#ffffff"/>
                      <rect x="10" y="15" width="40" height="4" rx="2" fill="#007aff" opacity="0.8"/>
                      <rect x="10" y="25" width="60" height="3" rx="1.5" fill="#e2e8f0"/>
                      <rect x="10" y="33" width="55" height="3" rx="1.5" fill="#e2e8f0"/>
                      <rect x="10" y="41" width="50" height="3" rx="1.5" fill="#e2e8f0"/>
                      <rect x="10" y="55" width="30" height="20" rx="4" fill="#007aff" opacity="0.1"/>
                      <text x="25" y="68" fontSize="8" fill="#007aff" fontWeight="600" textAnchor="middle">PDF</text>
                    </g>

                    <g transform="translate(85, 65)" filter="url(#shadow-card)">
                      <rect x="0" y="0" width="80" height="100" rx="8" fill="#ffffff"/>
                      <rect x="10" y="15" width="45" height="4" rx="2" fill="#10b981" opacity="0.8"/>
                      <rect x="10" y="25" width="60" height="3" rx="1.5" fill="#e2e8f0"/>
                      <rect x="10" y="33" width="50" height="3" rx="1.5" fill="#e2e8f0"/>
                      <rect x="10" y="41" width="55" height="3" rx="1.5" fill="#e2e8f0"/>
                      <circle cx="60" cy="75" r="12" fill="#10b981" opacity="0.15"/>
                      <path d="M54 75 L58 79 L66 71" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    </g>

                    <g transform="translate(145, 55)" filter="url(#shadow-card)">
                      <rect x="0" y="0" width="80" height="100" rx="8" fill="#ffffff"/>
                      <rect x="10" y="15" width="35" height="4" rx="2" fill="#f59e0b" opacity="0.8"/>
                      <rect x="10" y="25" width="60" height="3" rx="1.5" fill="#e2e8f0"/>
                      <rect x="10" y="33" width="45" height="3" rx="1.5" fill="#e2e8f0"/>
                      <rect x="10" y="41" width="55" height="3" rx="1.5" fill="#e2e8f0"/>
                      <rect x="10" y="60" width="60" height="25" rx="4" fill="#f59e0b" opacity="0.1"/>
                    </g>
                  </g>

                  {/* Search icon floating */}
                  <g transform="translate(380, 220)" filter="url(#shadow-card)">
                    <circle cx="25" cy="25" r="25" fill="#ffffff"/>
                    <circle cx="22" cy="22" r="10" fill="none" stroke="#007aff" strokeWidth="2.5"/>
                    <line x1="29" y1="29" x2="36" y2="36" stroke="#007aff" strokeWidth="2.5" strokeLinecap="round"/>
                  </g>

                  {/* Lock icon floating */}
                  <g transform="translate(70, 180)" filter="url(#shadow-card)">
                    <circle cx="22" cy="22" r="22" fill="#ffffff"/>
                    <rect x="12" y="20" width="20" height="14" rx="3" fill="#10b981"/>
                    <path d="M16 20 L16 16 Q16 10 22 10 Q28 10 28 16 L28 20" fill="none" stroke="#10b981" strokeWidth="2.5"/>
                    <circle cx="22" cy="26" r="2" fill="#ffffff"/>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Email Upload Section - Spiegelverkehrt */}
        <section className="email-upload-section" aria-labelledby="email-upload-title">
          <div className="section-container">
            <div className="cm-grid cm-grid-reverse">
              <div className="cm-visual" style={{background: 'transparent', padding: '0'}}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 500 400"
                  className="cm-illustration cm-illustration-reverse"
                >
                  <defs>
                    <linearGradient id="email-gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#007aff', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#0052cc', stopOpacity: 1}} />
                    </linearGradient>
                    <linearGradient id="envelope-flap" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#339dff', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#007aff', stopOpacity: 1}} />
                    </linearGradient>
                    <filter id="shadow-email-v2">
                      <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#007aff" floodOpacity="0.2"/>
                    </filter>
                    <filter id="glow-blue">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Background glow */}
                  <circle cx="250" cy="200" r="130" fill="#007aff" opacity="0.04"/>
                  <circle cx="250" cy="200" r="190" fill="#007aff" opacity="0.02"/>

                  {/* Floating dots - alle in Firmenfarben */}
                  <circle cx="90" cy="70" r="6" fill="#007aff" opacity="0.5" className="floating-dot floating-dot-1"/>
                  <circle cx="430" cy="100" r="8" fill="#0052cc" opacity="0.4" className="floating-dot floating-dot-2"/>
                  <circle cx="400" cy="310" r="5" fill="#10b981" opacity="0.5" className="floating-dot floating-dot-3"/>
                  <circle cx="80" cy="290" r="7" fill="#f59e0b" opacity="0.4" className="floating-dot floating-dot-4"/>
                  <circle cx="350" cy="60" r="4" fill="#007aff" opacity="0.3" className="floating-dot floating-dot-5"/>

                  {/* Main Email Envelope - Modern Design */}
                  <g transform="translate(125, 90)" filter="url(#shadow-email-v2)">
                    {/* Envelope body */}
                    <rect x="0" y="50" width="250" height="170" rx="16" fill="url(#email-gradient-blue)"/>

                    {/* Envelope flap (opened, tilted back) */}
                    <path d="M0 66 Q0 50 16 50 L234 50 Q250 50 250 66 L125 140 Z" fill="url(#envelope-flap)"/>

                    {/* Glass highlight on envelope */}
                    <rect x="0" y="50" width="250" height="85" rx="16" fill="#ffffff" opacity="0.08"/>

                    {/* Inner envelope shadow line */}
                    <line x1="0" y1="66" x2="125" y2="140" stroke="#ffffff" strokeWidth="1.5" opacity="0.2"/>
                    <line x1="250" y1="66" x2="125" y2="140" stroke="#ffffff" strokeWidth="1.5" opacity="0.2"/>

                    {/* @ Symbol - cleaner design */}
                    <circle cx="125" cy="160" r="35" fill="#ffffff" opacity="0.15"/>
                    <text x="125" y="175" fontSize="50" fontWeight="700" fill="#ffffff" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">@</text>
                  </g>

                  {/* Incoming document animation feel */}
                  <g transform="translate(70, 150)" filter="url(#shadow-card)">
                    <rect x="0" y="0" width="55" height="70" rx="6" fill="#ffffff"/>
                    <rect x="8" y="12" width="25" height="3" rx="1.5" fill="#007aff"/>
                    <rect x="8" y="20" width="40" height="2" rx="1" fill="#e2e8f0"/>
                    <rect x="8" y="26" width="35" height="2" rx="1" fill="#e2e8f0"/>
                    <rect x="8" y="32" width="38" height="2" rx="1" fill="#e2e8f0"/>
                    <rect x="8" y="45" width="20" height="15" rx="3" fill="#ef4444" opacity="0.9"/>
                    <text x="18" y="56" fontSize="7" fill="#ffffff" fontWeight="700" textAnchor="middle">PDF</text>
                    {/* Motion lines */}
                    <line x1="60" y1="25" x2="75" y2="25" stroke="#007aff" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
                    <line x1="65" y1="35" x2="80" y2="35" stroke="#007aff" strokeWidth="2" opacity="0.3" strokeLinecap="round"/>
                    <line x1="60" y1="45" x2="72" y2="45" stroke="#007aff" strokeWidth="2" opacity="0.2" strokeLinecap="round"/>
                  </g>

                  {/* Success checkmark badge */}
                  <g transform="translate(370, 140)" filter="url(#shadow-card)">
                    <circle cx="28" cy="28" r="28" fill="#ffffff"/>
                    <circle cx="28" cy="28" r="20" fill="#10b981"/>
                    <path d="M20 28 L26 34 L38 22" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>

                  {/* Upload cloud icon */}
                  <g transform="translate(340, 250)" filter="url(#shadow-card)">
                    <circle cx="25" cy="25" r="25" fill="#ffffff"/>
                    <path d="M25 32 L25 18 M19 24 L25 18 L31 24" stroke="#007aff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 32 L33 32" stroke="#007aff" strokeWidth="2.5" strokeLinecap="round"/>
                  </g>

                  {/* Small notification badge */}
                  <g transform="translate(95, 95)">
                    <circle cx="12" cy="12" r="12" fill="#007aff" filter="url(#glow-blue)"/>
                    <text x="12" y="16" fontSize="12" fill="#ffffff" fontWeight="700" textAnchor="middle">1</text>
                  </g>
                </svg>
              </div>

              <div className="cm-text">
                <span className="section-badge reveal-text">E-MAIL UPLOAD</span>
                <h2 id="email-upload-title" className="cm-headline reveal-text">Verträge per E-Mail.<br /><span className="text-gradient">Automatisch erfasst.</span></h2>
                <p className="cm-subtext reveal-text">Leiten Sie E-Mails mit Vertragsanhängen einfach an Ihre persönliche Contract AI Adresse weiter. PDFs werden automatisch erkannt, hochgeladen und analysiert.</p>
                <ul className="cm-bullets reveal-block">
                  <li>
                    <div className="cm-bullet-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5"></path>
                        <path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 002-2v-6l-3.4-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.8 1.1z"></path>
                      </svg>
                    </div>
                    <span><strong>Zero Aufwand:</strong> Einfach E-Mail weiterleiten</span>
                  </li>
                  <li>
                    <div className="cm-bullet-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>
                    <span><strong>Auto-Erkennung:</strong> PDFs sofort verarbeitet</span>
                  </li>
                  <li>
                    <div className="cm-bullet-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                      </svg>
                    </div>
                    <span><strong>Jedes Postfach:</strong> Gmail, Outlook, Apple Mail</span>
                  </li>
                  <li>
                    <div className="cm-bullet-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <span><strong>Instant sync:</strong> Direkt im Dashboard</span>
                  </li>
                </ul>
                <div className="cm-cta reveal-text">
                  <Link to="/features/email-upload" className="cm-btn-primary" data-track="cta-email-upload">
                    E-Mail Upload entdecken
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Extended Showcase Section with 6 New Features */}
        <section className="showcase-section" ref={(el) => registerSection('showcase', el)}>
          <div className="floating-shapes">
            <div className="floating-shape floating-shape-4"></div>
            <div className="floating-shape floating-shape-5 wave"></div>
            <div className="floating-shape floating-shape-6"></div>
          </div>
          <div className="showcase-bg">
            <div className="showcase-shape shape-1"></div>
            <div className="showcase-shape shape-2"></div>
          </div>
          <div className="section-container">
            <div className="section-title features-title">
              <span className="section-badge reveal-text">FUNKTIONEN</span>
              <h2 className="reveal-text">Alles, was Sie für Ihre<br /><span className="text-gradient">Verträge brauchen</span></h2>
              <p className="reveal-text">Von der Analyse bis zur Unterschrift – unsere KI-Tools automatisieren Ihren kompletten Vertragsworkflow.</p>
            </div>
            
            <div className="showcase-items">

              {/* New Feature 1: Analyse */}
              <div className="showcase-item reveal-block">
                <div className="showcase-content">
                  <div className="showcase-label blue-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    KI-Powered
                  </div>
                  <h3>Vertragsanalyse mit Score</h3>
                  <p>Risiken, Chancen und Verständlichkeit auf einen Blick. Unsere KI bewertet Ihre Verträge und deckt versteckte Fallstricke auf.</p>
                  <ul className="feature-list">
                    <li>Automatische Risikoanalyse</li>
                    <li>Verständlichkeitsindex für Laien und Profis</li>
                    <li>Detaillierte Klausel-Insights</li>
                  </ul>
                  <Link to="/features/vertragsanalyse" className="showcase-link">
                    Zur Vertragsanalyse
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
                <div className="showcase-image">
                  <div className="image-mac-frame">
                    <div className="image-mac-topbar">
                      <div className="image-mac-buttons">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                    <div className="image-container video-container">
                      <AutoPlayVideo
                        src={analyseVideo}
                        poster={analyseImg}
                        alt="Vertragsanalyse mit Score"
                      />
                      <div className="image-shine"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* New Feature 2: Optimierung */}
              <div className="showcase-item reverse reveal-block">
                <div className="showcase-content">
                  <div className="showcase-label purple-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                    </svg>
                    Intelligent
                  </div>
                  <h3>Verträge optimieren & verbessern</h3>
                  <p>Schwache oder unfaire Klauseln? Unsere KI findet sie und schlägt sofort bessere Formulierungen vor — für fairere, stärkere Verträge.</p>
                  <ul className="feature-list">
                    <li>Automatische Klausel-Optimierung</li>
                    <li>Verständlichere Sprache</li>
                    <li>Sofort einsatzbereite Änderungen</li>
                  </ul>
                  <Link to="/features/optimierung" className="showcase-link">
                    Zum Optimierer
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
                <div className="showcase-image">
                  <div className="image-mac-frame">
                    <div className="image-mac-topbar">
                      <div className="image-mac-buttons">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                    <div className="image-container video-container">
                      <AutoPlayVideo
                        src={optimierungVideo}
                        poster={optimierungImg}
                        alt="Verträge optimieren"
                      />
                      <div className="image-shine"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* New Feature 3: Fristen */}
              <div className="showcase-item reveal-block">
                <div className="showcase-content">
                  <div className="showcase-label green-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Automatisch
                  </div>
                  <h3>Fristen automatisch erkennen</h3>
                  <p>Verpassen Sie nie wieder eine Kündigungsfrist. Contract AI erkennt wichtige Fristen und erinnert Sie rechtzeitig.</p>
                  <ul className="feature-list">
                    <li>Automatische Fristenerkennung</li>
                    <li>Erinnerungsfunktion per E-Mail</li>
                    <li>Integration in Ihren Kalender</li>
                  </ul>
                  <Link to="/features/fristen" className="showcase-link">
                    Zum Fristenkalender
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
                <div className="showcase-image">
                  <div className="image-mac-frame">
                    <div className="image-mac-topbar">
                      <div className="image-mac-buttons">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                    <div className="image-container video-container">
                      <AutoPlayVideo
                        src={fristenVideo}
                        poster={fristenImg}
                        alt="Fristen automatisch erkennen"
                      />
                      <div className="image-shine"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* New Feature 4: Vergleich */}
              <div className="showcase-item reverse reveal-block">
                <div className="showcase-content">
                  <div className="showcase-label pink-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 3H3v18h18V3z"></path>
                      <path d="M9 3v18"></path>
                      <path d="M3 9h18"></path>
                    </svg>
                    Präzise
                  </div>
                  <h3>Verträge intelligent vergleichen</h3>
                  <p>Lassen Sie zwei Verträge gegeneinander antreten. Contract AI zeigt Unterschiede, Fairness und empfiehlt den besseren Weg.</p>
                  <ul className="feature-list">
                    <li>Visualisierte Unterschiede</li>
                    <li>Fairness-Score & Verbesserungstipps</li>
                    <li>Entscheidungshilfe in Sekunden</li>
                  </ul>
                  <Link to="/features/vergleich" className="showcase-link">
                    Zum Vergleich
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
                <div className="showcase-image">
                  <div className="image-mac-frame">
                    <div className="image-mac-topbar">
                      <div className="image-mac-buttons">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                    <div className="image-container video-container">
                      <AutoPlayVideo
                        src={vergleichVideo}
                        poster={vergleichImg}
                        alt="Verträge intelligent vergleichen"
                      />
                      <div className="image-shine"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Und vieles mehr - Compact Feature Grid */}
            </div>

            {/* More Features Section */}
            <div className="more-features-section reveal-block">
              <div className="more-features-header">
                <h3>Und vieles mehr</h3>
                <p>Weitere leistungsstarke Tools für Ihr Vertragsmanagement</p>
              </div>

              <div className="more-features-grid">
                <Link to="/features/generator" className="more-feature-card">
                  <div className="more-feature-icon teal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div className="more-feature-content">
                    <h4>Vertragsgenerator</h4>
                    <p>Rechtssichere Verträge aus Vorlagen erstellen</p>
                  </div>
                  <svg className="more-feature-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>

                <Link to="/features/digitalesignatur" className="more-feature-card">
                  <div className="more-feature-icon green">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      <path d="m9 12 2 2 4-4"></path>
                    </svg>
                  </div>
                  <div className="more-feature-content">
                    <h4>Digitale Signatur</h4>
                    <p>Verträge rechtssicher unterschreiben lassen</p>
                  </div>
                  <svg className="more-feature-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>

                <Link to="/features/legalpulse" className="more-feature-card">
                  <div className="more-feature-icon red">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                  </div>
                  <div className="more-feature-content">
                    <h4>Legal Pulse</h4>
                    <p>Frühwarnsystem für rechtliche Änderungen</p>
                  </div>
                  <svg className="more-feature-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>

                <Link to="/features/contract-builder" className="more-feature-card">
                  <div className="more-feature-icon purple">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </div>
                  <div className="more-feature-content">
                    <h4>Contract Builder</h4>
                    <p>Verträge per Drag & Drop erstellen</p>
                  </div>
                  <svg className="more-feature-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>

                <Link to="/features/legal-lens" className="more-feature-card">
                  <div className="more-feature-icon orange">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <circle cx="11" cy="11" r="3"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                  </div>
                  <div className="more-feature-content">
                    <h4>Legal Lens</h4>
                    <p>Interaktive Tiefenanalyse jeder Klausel</p>
                  </div>
                  <svg className="more-feature-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              
                <Link to="/features/vertragsverwaltung" className="more-feature-card">
                  <div className="more-feature-icon blue">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  </div>
                  <div className="more-feature-content">
                    <h4>Vertragsverwaltung</h4>
                    <p>Alle Verträge zentral organisieren</p>
                  </div>
                  <svg className="more-feature-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link></div>

              <div className="more-features-cta">
                <Link to="/features" className="all-features-link">
                  Alle Funktionen ansehen
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

{/* Testimonials Section */}
        <section className="testimonials-section" ref={(el) => registerSection('testimonials', el)}>
          {/* Contract Theme: Stamp Effects */}
          <div className="stamp-effect stamp-effect-1"></div>
          <div className="stamp-effect stamp-effect-2"></div>
          <div className="section-container">
            <div className="section-title features-title">
              <span className="section-badge reveal-text">KUNDENSTIMMEN</span>
              <h2 className="reveal-text">Von Profis <span className="text-gradient">empfohlen</span></h2>
              <p className="reveal-text">Warum über 500+ Unternehmen auf Contract AI vertrauen.</p>
            </div>
            
            <TestimonialsMarquee />
          </div>
        </section>

        {/* ChatGPT Comparison Section */}
        <section className="chatgpt-comparison-section">
          <div className="section-container">
            <div className="comparison-content">
              <h2 className="comparison-question reveal-text">
                „Kann ich nicht einfach ChatGPT benutzen?"
              </h2>
              <div className="comparison-answer reveal-text">
                <p className="answer-intro">Klar – für eine einmalige Frage.</p>
                <div className="answer-questions">
                  <p>Aber wer erinnert dich an Fristen?</p>
                  <p>Wer prüft, ob sich Gesetze geändert haben?</p>
                  <p>Wer behält 50 Verträge gleichzeitig im Blick?</p>
                </div>
                <p className="answer-conclusion">
                  <span className="checkmark">✓</span> Contract AI. Automatisch. 24/7.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="pricing-section" ref={(el) => registerSection('pricing', el)}>
          {/* Contract Theme: Paper texture background */}
          <div className="contract-texture"></div>

          {/* Pricing Theme: Floating Elements - Preis & Vertrag bezogen */}
          <div className="pricing-float-elements">
            {/* Euro-Zeichen */}
            <div className="pricing-float pricing-euro-1">€</div>
            <div className="pricing-float pricing-euro-2">€</div>

            {/* Prozent-Zeichen für Rabatte */}
            <div className="pricing-float pricing-percent">%</div>

            {/* Approved Stempel */}
            <div className="pricing-stamp">
              <svg viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="35" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="3" fill="none"/>
                <circle cx="40" cy="40" r="28" stroke="rgba(34, 197, 94, 0.3)" strokeWidth="1.5" fill="none"/>
                <text x="40" y="38" textAnchor="middle" fill="rgba(34, 197, 94, 0.5)" fontSize="10" fontWeight="bold">FAIR</text>
                <text x="40" y="50" textAnchor="middle" fill="rgba(34, 197, 94, 0.5)" fontSize="8">PRICING</text>
              </svg>
            </div>

            {/* Kleine Vertragsklausel-Icons */}
            <div className="pricing-clause pricing-clause-1">
              <svg viewBox="0 0 40 50" fill="none">
                <rect x="2" y="2" width="36" height="46" rx="3" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="1.5" fill="rgba(255,255,255,0.3)"/>
                <line x1="8" y1="12" x2="32" y2="12" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5"/>
                <line x1="8" y1="20" x2="28" y2="20" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5"/>
                <line x1="8" y1="28" x2="30" y2="28" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5"/>
                <path d="M8,38 L12,42 L20,34" stroke="rgba(34, 197, 94, 0.5)" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div className="pricing-clause pricing-clause-2">
              <svg viewBox="0 0 40 50" fill="none">
                <rect x="2" y="2" width="36" height="46" rx="3" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="1.5" fill="rgba(255,255,255,0.3)"/>
                <line x1="8" y1="12" x2="32" y2="12" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5"/>
                <line x1="8" y1="20" x2="28" y2="20" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5"/>
                <path d="M8,32 L12,36 L20,28" stroke="rgba(34, 197, 94, 0.5)" strokeWidth="2" fill="none"/>
              </svg>
            </div>

            {/* Checkboxen (verbessert) */}
            <div className="pricing-checkbox pricing-checkbox-1"></div>
            <div className="pricing-checkbox pricing-checkbox-2"></div>
            <div className="pricing-checkbox pricing-checkbox-3"></div>
            <div className="pricing-checkbox pricing-checkbox-4"></div>
            <div className="pricing-checkbox pricing-checkbox-5"></div>
          </div>
          <div className="section-container">
            <div className="section-title features-title">
              <span className="section-badge reveal-text">PREISE</span>
              <h2 className="reveal-text">Einfach & <span className="text-gradient">transparent</span></h2>
              <p className="reveal-text">Wählen Sie den Plan, der zu Ihnen passt. Jederzeit kündbar.</p>
            </div>
            
            <HomePricingCards />
          </div>
        </section>

        {/* CTA Section - Premium Redesign */}
        <section className="final-cta-section" ref={(el) => registerSection('cta', el)}>
          <div className="final-cta-content reveal-text">
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
              {user ? (
                <Link to="/dashboard" className="final-cta-primary">
                  Zum Dashboard
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              ) : (
                <>
                  <Link to="/register" className="final-cta-primary">
                    Kostenlos starten
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                  <Link to="/pricing" className="final-cta-secondary">
                    Alle Preise ansehen
                  </Link>
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

        {/* Footer */}
        <footer className="footer" ref={(el) => registerSection('footer', el)}>
          <div className="footer-container">
            <div className="footer-top">
              <div className="footer-logo">
                <img src={logo} alt="Contract AI Logo" />
                <p className="company-description">
                  Contract AI revolutioniert Ihr Vertragsmanagement mit neuester KI-Technologie.
                  Wir helfen Ihnen, Verträge zu analysieren, optimieren und verwalten.
                </p>
                <div className="footer-trust-badges">
                  <img src={dsgvoBadge} alt="DSGVO-konform" className="trust-badge" />
                  <img src={trustpilotBadge} alt="Trustpilot Bewertungen" className="trust-badge" />
                </div>
              </div>
              <div className="footer-columns">
                <div className="footer-column">
                  <h4>Funktionen</h4>
                  <ul>
                    <li><Link to="/ki-vertragsanalyse">KI-Vertragsanalyse</Link></li>
                    <li><Link to="/features/vertragsanalyse">Vertragsanalyse</Link></li>
                    <li><Link to="/features/optimierung">Optimierung</Link></li>
                    <li><Link to="/features/fristen">Fristen</Link></li>
                    <li><Link to="/features/vergleich">Vergleich</Link></li>
                    <li><Link to="/features/generator">Generator</Link></li>
                    <li><Link to="/features/legalpulse">Legal Pulse</Link></li>
                    <li><Link to="/features/vertragsverwaltung">Vertragsverwaltung</Link></li>
                    <li><Link to="/features/digitalesignatur">Digitale Signatur</Link></li>
                    <li><Link to="/features/email-upload">E-Mail Upload</Link></li>
                    <li><Link to="/features/contract-builder">Contract Builder</Link></li>
                    <li><Link to="/features/legal-lens">Legal Lens</Link></li>
                  </ul>
                </div>
                
                <div className="footer-column">
                  <h4>Unternehmen</h4>
                  <ul>
                    <li><a href="mailto:info@contract-ai.de">Kontakt</a></li>
                    <li><Link to="/about">Über uns</Link></li>
                    <li><Link to="/hilfe">Hilfe</Link></li>
                    <li><Link to="/blog">Blog</Link></li>
                    <li><Link to="/press">Presse</Link></li>
                  </ul>
                </div>
                
                <div className="footer-column">
                  <h4>Rechtliches</h4>
                  <ul>
                    <li><Link to="/datenschutz">Datenschutz</Link></li>
                    <li><Link to="/agb">AGB</Link></li>
                    <li><Link to="/impressum">Impressum</Link></li>
                    <li><a href="#" onClick={handleOpenCookieSettings}>Cookie-Einstellungen ändern</a></li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="footer-bottom">
              <p className="copyright">© 2026 Contract AI. Alle Rechte vorbehalten.</p>
              <div className="social-links">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="social-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                </a>
                <a href="https://www.instagram.com/contract_ai?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="social-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm10 2c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3h10zm-5 3a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm4.5-.5a1 1 0 100 2 1 1 0 000-2z"></path>
                  </svg>
                </a>
                <a href="https://www.facebook.com/profile.php?id=61578781115190" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="social-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* Mobile Sticky CTA */}
        {isMobile && !user && (
          <div className="mobile-sticky-cta">
            <div className="mobile-cta-content">
              <div className="mobile-cta-text">
                <span className="mobile-cta-title">Jetzt kostenlos testen</span>
              </div>
              <Link to="/register" className="mobile-cta-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HomeRedesign;

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from "react-helmet";
import { useAuth } from "../hooks/useAuth";;
import HomePricingCards from "../components/HomePricingCards";
import "../styles/landing.css";

// Importiere Bilder
import logo from "../assets/logo-contractai.png";
import logoHeader from "../assets/logo-header.png";
import analyseImg from "../assets/Analyse.png";
import fristenImg from "../assets/Fristen.png";
import generatorImg from "../assets/Generator.png";
import legalPulseImg from "../assets/Legal Pulse.png";
import optimierungImg from "../assets/Optimierung.png";
import vergleichImg from "../assets/Vergleich.png";
import dsgvoBadge from "../assets/dsgvo-badge.png";
import trustpilotBadge from "../assets/trustpilot-badge.png";





// TypeScript-Interface für Window-Erweiterung
declare global {
  interface Window {
    openCookieSettings?: () => void;
  }
}

// Testimonials Slider Component
const TestimonialsSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false); // Flag to prevent handleScroll conflicts

  const testimonials = [
    {
      id: 1,
      text: "Habe bei meinem Werkvertrag einen Passus übersehen, der mich 280€ extra gekostet hätte. Contract AI hat das sofort erkannt!",
      author: "Lisa K.",
      role: "Freelancerin, Grafikdesign",
      avatar: "LK"
    },
    {
      id: 2,
      text: "Endlich verstehe ich meine Mietverträge ohne Anwalt. Die KI erklärt alles verständlich — spart Zeit und Geld.",
      author: "Marcus T.",
      role: "Geschäftsführer, IT-Beratung",
      avatar: "MT"
    },
    {
      id: 3,
      text: "Dachte, mein Handyvertrag läuft noch 6 Monate. War tatsächlich schon kündbar — 180€ gespart dank der Fristenerkennung!",
      author: "Sarah M.",
      role: "Alleinerziehende Mutter",
      avatar: "SM"
    },
    {
      id: 4,
      text: "Für NDA-Verträge mit Investoren nutze ich nur noch Contract AI. Kein Rechtsanwalt nötig für Standardverträge.",
      author: "Daniel R.",
      role: "Startup-Gründer",
      avatar: "DR"
    },
    {
      id: 5,
      text: "Hab mit Contract AI meinen Lieferantenvertrag gecheckt und dabei ne versteckte Preisklausel gefunden. Hätte mich locker 2.400€ mehr pro Jahr gekostet. Krass!",
      author: "Thomas W.",
      role: "Inhaber, Malerbetrieb Würzburg",
      avatar: "TW"
    },
    {
      id: 6,
      text: "Bei uns im Team nutzen jetzt alle Contract AI für Freelancer-Verträge. Spart uns echt Zeit und die Rechtsabteilung freut sich auch.",
      author: "Julia S.",
      role: "Projektmanagerin, Digital Agency Hamburg",
      avatar: "JS"
    },
    {
      id: 7,
      text: "Mein Fitnessstudio-Abo lief automatisch weiter, obwohl ich umgezogen bin. Contract AI hat mein Sonderkündigungsrecht erkannt — 360€ zurückbekommen!",
      author: "Kevin B.",
      role: "Student, BWL",
      avatar: "KB"
    },
    {
      id: 8,
      text: "Als Steuerberaterin muss ich oft Verträge prüfen. Contract AI ist mittlerweile fester Teil meines Workflows. Die Risiko-Analyse ist top.",
      author: "Dr. Anna P.",
      role: "Steuerberaterin, Kanzlei München",
      avatar: "AP"
    }
  ];

  const getItemsPerView = () => {
    if (typeof window === 'undefined') return 1;
    const width = window.innerWidth;
    if (width <= 768) return 1;  // Mobile: 1 Testimonial
    if (width <= 1024) return 2; // Tablet: 2 Testimonials
    return 3; // Desktop: 3 Testimonials
  };

  const [itemsPerView, setItemsPerView] = useState(getItemsPerView());

  useEffect(() => {
    const handleResize = () => {
      const newItemsPerView = getItemsPerView();
      setItemsPerView(newItemsPerView);

      // Reset current index if out of bounds
      const maxIndex = Math.max(0, testimonials.length - newItemsPerView);
      if (currentIndex > maxIndex) {
        setCurrentIndex(maxIndex);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentIndex, testimonials.length]);

  // Auto-advance slider (pause on hover) - Mobile langsamer als Desktop
  useEffect(() => {
    console.log('🔄 Auto-advance effect running. isHovered:', isHovered, 'itemsPerView:', itemsPerView);

    if (isHovered) {
      console.log('⏸️ Auto-advance paused (hovered)');
      return;
    }

    // Mobile (1 Karte): 5 Sekunden | Desktop (3+ Karten): 2 Sekunden
    const intervalDuration = itemsPerView === 1 ? 5000 : 2000;

    const interval = setInterval(() => {
      const maxIdx = Math.max(0, testimonials.length - itemsPerView);
      console.log('⏱️ Interval fired! currentIndex will change. maxIdx:', maxIdx);

      setCurrentIndex((prev) => {
        const next = prev + 1;
        const newIndex = next > maxIdx ? 0 : next;
        console.log('📊 Index change:', prev, '->', newIndex);
        return newIndex;
      });
    }, intervalDuration);

    return () => {
      console.log('🧹 Cleaning up interval');
      clearInterval(interval);
    };
  }, [isHovered, itemsPerView, testimonials.length]);

  // Sync slider position when currentIndex changes
  useEffect(() => {
    console.log('🎯 Sync effect triggered. currentIndex:', currentIndex, 'sliderRef exists:', !!sliderRef.current);

    if (!sliderRef.current) {
      console.log('❌ sliderRef.current is null!');
      return;
    }

    const slideWidth = sliderRef.current.offsetWidth / itemsPerView;
    const scrollLeft = currentIndex * slideWidth;

    console.log('📏 Calculated scroll:', {
      containerWidth: sliderRef.current.offsetWidth,
      itemsPerView,
      slideWidth,
      currentIndex,
      scrollLeft
    });

    // Set flag to prevent handleScroll from interfering
    isProgrammaticScroll.current = true;

    sliderRef.current.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    });

    console.log('✅ Scroll command sent!');

    // Reset flag after scroll animation completes (smooth scroll takes ~300-500ms)
    setTimeout(() => {
      isProgrammaticScroll.current = false;
      console.log('🏁 Programmatic scroll complete, handleScroll re-enabled');
    }, 600);
  }, [currentIndex, itemsPerView]);

  const scrollToSlide = (index: number) => {
    if (!sliderRef.current) return;
    
    const slideWidth = sliderRef.current.offsetWidth / itemsPerView;
    const scrollLeft = index * slideWidth;
    
    sliderRef.current.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    });
    
    setCurrentIndex(index);
  };

  const nextSlide = () => {
    const maxIndex = Math.max(0, testimonials.length - itemsPerView);
    // Loop: Bei letzter Slide → springe zu erster Slide
    const newIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
    scrollToSlide(newIndex);
  };

  const prevSlide = () => {
    const maxIndex = Math.max(0, testimonials.length - itemsPerView);
    // Loop: Bei erster Slide → springe zu letzter Slide
    const newIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
    scrollToSlide(newIndex);
  };

  // Sync dots when user swipes manually
  const handleScroll = () => {
    // Ignore scroll events during programmatic scrolling
    if (isProgrammaticScroll.current) {
      console.log('🚫 handleScroll ignored (programmatic scroll in progress)');
      return;
    }

    if (!sliderRef.current) return;

    const slideWidth = sliderRef.current.offsetWidth / itemsPerView;
    const scrollLeft = sliderRef.current.scrollLeft;
    const calculatedIndex = Math.round(scrollLeft / slideWidth);

    console.log('👆 Manual scroll detected. Calculated index:', calculatedIndex);

    // Only update if index actually changed to avoid unnecessary re-renders
    if (calculatedIndex !== currentIndex) {
      setCurrentIndex(calculatedIndex);
    }
  };

  const maxIndex = Math.max(0, testimonials.length - itemsPerView);

  return (
    <div className="testimonials-slider">
      <div
        className="slider-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        <button
          className="slider-nav slider-prev"
          onClick={prevSlide}
          aria-label="Vorheriges Testimonial"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>

        <div
          ref={sliderRef}
          className="slider-track"
          onScroll={handleScroll}
        >
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="testimonial-slide">
              <div className="testimonial-card">
                <div className="testimonial-content">
                  <div className="testimonial-quote">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="quote-icon">
                      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                    </svg>
                  </div>
                  <p className="testimonial-text">"{testimonial.text}"</p>
                  <div className="testimonial-author">
                    <div className="author-avatar">
                      <span>{testimonial.avatar}</span>
                    </div>
                    <div className="author-info">
                      <div className="author-name">{testimonial.author}</div>
                      <div className="author-role">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="slider-nav slider-next"
          onClick={nextSlide}
          aria-label="Nächstes Testimonial"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>

      <div className="slider-dots">
        {Array.from({ length: maxIndex + 1 }).map((_, index) => (
          <button
            key={index}
            className={`slider-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => scrollToSlide(index)}
            aria-label={`Gehe zu Testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
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

    // Scroll event listener mit modifiziertem Parallax-Effekt
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      
      // WICHTIG: Deaktiviere den Parallax-Effekt vollständig, um den weißen Balken zu vermeiden
      if (heroRef.current) {
        // Behalt die Opazität bei, aber entferne die Transformation
        const opacity = Math.max(1 - scrollPosition / 900, 0.2);
        heroRef.current.style.opacity = opacity.toString();
        
        // Finde den hero-content und setze die Transformation auf 0
        const heroContent = heroRef.current.querySelector('.hero-content');
        if (heroContent) {
          // Setze die Transformation auf 0, um keine Lücken zu verursachen
          heroContent.setAttribute('style', 'transform: translateY(0)');
        }
      }
      
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
        <title>Contract AI – Verträge mit KI analysieren & optimieren | Jetzt testen</title>
        <meta
          name="description"
          content="Analysiere, optimiere & vergleiche Verträge in Minuten mit KI. Einfach, sicher & effizient. Jetzt kostenlos starten mit Contract AI!"
        />
        <meta
          name="keywords"
          content="Vertragsanalyse, Vertragsoptimierung, KI Vertragsmanagement, Verträge analysieren, SaaS Vertragsplattform, Verträge vergleichen, Contract AI"
        />
        <link rel="canonical" href="https://www.contract-ai.de/" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Contract AI – Verträge mit KI analysieren & optimieren | Jetzt testen" />
        <meta property="og:description" content="Analysiere, optimiere & vergleiche Verträge in Minuten mit KI. Contract AI ist deine smarte Lösung für sichere & effiziente Vertragsverwaltung." />
        <meta property="og:url" content="https://contract-ai.de/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contract AI – Verträge mit KI analysieren & optimieren | Jetzt testen" />
        <meta name="twitter:description" content="Sichere dir jetzt volle Kontrolle über deine Verträge. Analysiere & optimiere mit Contract AI – schnell, einfach & effizient." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />

        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "SoftwareApplication",
            "name": "Contract AI",
            "operatingSystem": "Web",
            "applicationCategory": "BusinessApplication",
            "url": "https://contract-ai.de",
            "logo": "https://contract-ai.de/logo.png",
            "description": "Contract AI ist eine smarte SaaS-Lösung für KI-gestützte Vertragsanalyse, Optimierung und Vertragsverwaltung.",
            "offers": {
              "@type": "Offer",
              "price": "4.90",
              "priceCurrency": "EUR"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Primetime Marketing UG",
              "url": "https://contract-ai.de"
            }
          })}
        </script>
      </Helmet>

      <div className="landing-page">
        {/* Sophisticated Apple-Hero with Modern Effects */}
        <section className="hero sophisticated-hero" ref={heroRef}>
          {/* Advanced Background with Multiple Layers */}
          <div className="sophisticated-hero-bg">
            {/* Gradient Mesh Layer */}
            <div className="gradient-mesh-layer">
              <div className="gradient-mesh gradient-mesh-1"></div>
              <div className="gradient-mesh gradient-mesh-2"></div>
              <div className="gradient-mesh gradient-mesh-3"></div>
              <div className="gradient-mesh gradient-mesh-4"></div>
            </div>
            
            {/* Floating Glass Orbs */}
            <div className="floating-orbs-layer">
              <div className="glass-orb glass-orb-1"></div>
              <div className="glass-orb glass-orb-2"></div>
              <div className="glass-orb glass-orb-3"></div>
              <div className="glass-orb glass-orb-4"></div>
              <div className="glass-orb glass-orb-5"></div>
            </div>
            
            {/* Light Rays Layer */}
            <div className="light-rays-layer">
              <div className="light-ray light-ray-1"></div>
              <div className="light-ray light-ray-2"></div>
            </div>
            
            {/* Noise Texture Overlay */}
            <div className="noise-texture-overlay"></div>
          </div>
          
          {/* Content Glow Backdrop */}
          <div className="content-glow-backdrop"></div>
          
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
                  <span className="headline-line">Zeit gewonnen.</span>
                  <span className="headline-line platform-line">Alles in einer Plattform.</span>
                </h1>
              </div>

              {/* Subheadline with Glass Effect */}
              <div className="subheadline-glass-wrapper">
                <p className="sophisticated-hero-subheadline sophisticated-fade-up-delay">
                  Contract AI automatisiert Ihr gesamtes Vertragsmanagement – von der KI-Analyse bis zur digitalen Signatur.
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
          
          <div className="sophisticated-scroll-indicator">
            <div className="sophisticated-scroll-chevron"></div>
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

        {/* Features Section - Erweitert auf 6 Cards */}
        <section className="features-section" ref={(el) => registerSection('features', el)}>
          <div className="floating-shapes">
            <div className="floating-shape floating-shape-1"></div>
            <div className="floating-shape floating-shape-2"></div>
            <div className="floating-shape floating-shape-3 triangle"></div>
          </div>
          <div className="section-container">
            <div className="section-title">
              <div className="section-title-decoration">
                <span></span>
                <span></span>
              </div>
              <h2 className="reveal-text">Unsere KI-Tools für Ihre Verträge</h2>
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
                  Mehr erfahren
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
                  Mehr erfahren
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
                  Mehr erfahren
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
                  Mehr erfahren
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>

              {/* Generator Card */}
              <div className="feature-card reveal-card" style={{"--animation-order": 4} as React.CSSProperties}>
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
                  Mehr erfahren
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>

              {/* Legal Pulse Card */}
              <div className="feature-card reveal-card" style={{"--animation-order": 5} as React.CSSProperties}>
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
                  Mehr erfahren
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
                  Mehr erfahren
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>

              {/* Vertragsverwaltung Card */}
              <div className="feature-card reveal-card" style={{"--animation-order": 7} as React.CSSProperties}>
                <div className="feature-icon-wrapper yellow">
                  <div className="feature-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                </div>
                <h3>Vertragsverwaltung</h3>
                <p>Alle Verträge zentral verwalten, Ordner organisieren & mit intelligenter Suche sofort finden.</p>
                <Link to="/features/vertragsverwaltung" className="feature-link">
                  Mehr erfahren
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Digitale Vertragsverwaltung Section */}
        <section className="contracts-management" aria-labelledby="contracts-management-title">
          <div className="section-container">
            <div className="cm-grid">
              <div className="cm-text">
                <h2 id="contracts-management-title" className="reveal-text">📂 Digitale Vertragsverwaltung — Alles an einem Ort, jederzeit verfügbar</h2>
                <p className="cm-subtext reveal-text">Speichern, organisieren und verwalten Sie all Ihre Verträge sicher in der Contract AI Cloud. Mit automatischen Erinnerungen, schneller Suche und DSGVO-konformer Speicherung behalten Sie jederzeit den Überblick — ob am Schreibtisch oder unterwegs.</p>
                <ul className="cm-bullets reveal-block">
                  <li>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1Z"></path>
                    </svg>
                    <span><strong>Zentrale Ablage:</strong> Alle Verträge sicher an einem Ort</span>
                  </li>
                  <li>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <span><strong>Sofortiger Zugriff:</strong> Finden Sie Dokumente in Sekunden</span>
                  </li>
                  <li>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span><strong>Automatische Erinnerungen:</strong> Fristen nie wieder verpassen</span>
                  </li>
                  <li>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span><strong>100 % DSGVO-konform:</strong> Speicherung auf deutschen Servern</span>
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
                  style={{
                    width: '120%',
                    height: 'auto',
                    display: 'block',
                    background: 'transparent',
                    transform: 'translateX(-10%)'
                  }}
                >
                  <defs>
                    <linearGradient id="folder-gradient-v2" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#3b82f6', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#2563eb', stopOpacity: 1}} />
                    </linearGradient>
                    <filter id="shadow-v2">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12"/>
                    </filter>
                  </defs>

                  <circle cx="130" cy="90" r="8" fill="#ec4899" opacity="0.6" className="floating-dot floating-dot-1"/>
                  <circle cx="400" cy="150" r="6" fill="#10b981" opacity="0.6" className="floating-dot floating-dot-2"/>
                  <circle cx="370" cy="320" r="9" fill="#f97316" opacity="0.6" className="floating-dot floating-dot-3"/>
                  <circle cx="110" cy="290" r="7" fill="#a855f7" opacity="0.6" className="floating-dot floating-dot-4"/>
                  <circle cx="420" cy="250" r="5" fill="#3b82f6" opacity="0.6" className="floating-dot floating-dot-5"/>

                  <g transform="translate(175, 120)" filter="url(#shadow-v2)">
                    <rect x="0" y="30" width="150" height="110" rx="10" fill="url(#folder-gradient-v2)"/>
                    <path d="M0 30 L0 18 Q0 12 6 12 L45 12 L57 24 L144 24 Q150 24 150 30" fill="#60a5fa"/>

                    <rect x="25" y="60" width="30" height="40" rx="4" fill="#ffffff" opacity="0.95"/>
                    <rect x="60" y="65" width="30" height="40" rx="4" fill="#f0f9ff" opacity="0.9"/>
                    <rect x="95" y="70" width="30" height="40" rx="4" fill="#dbeafe" opacity="0.85"/>

                    <line x1="30" y1="70" x2="50" y2="70" stroke="#2563eb" strokeWidth="2.5"/>
                    <line x1="30" y1="78" x2="50" y2="78" stroke="#2563eb" strokeWidth="2.5"/>
                    <line x1="30" y1="86" x2="50" y2="86" stroke="#2563eb" strokeWidth="2.5"/>
                    <line x1="30" y1="94" x2="45" y2="94" stroke="#2563eb" strokeWidth="2.5" opacity="0.6"/>
                  </g>

                  <g transform="translate(360, 250)" filter="url(#shadow-v2)">
                    <circle cx="20" cy="20" r="18" fill="none" stroke="#2563eb" strokeWidth="5"/>
                    <line x1="32" y1="32" x2="45" y2="45" stroke="#2563eb" strokeWidth="5" strokeLinecap="round"/>
                  </g>

                  <g transform="translate(100, 200)" filter="url(#shadow-v2)">
                    <rect x="0" y="15" width="35" height="28" rx="5" fill="#10b981"/>
                    <path d="M9 15 L9 9 Q9 0 17.5 0 Q26 0 26 9 L26 15" fill="none" stroke="#10b981" strokeWidth="4"/>
                    <circle cx="17.5" cy="26" r="4" fill="#ffffff"/>
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
                  style={{
                    width: '120%',
                    height: 'auto',
                    display: 'block',
                    background: 'transparent',
                    transform: 'translateX(10%)'
                  }}
                >
                  <defs>
                    <linearGradient id="email-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#667eea', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#764ba2', stopOpacity: 1}} />
                    </linearGradient>
                    <filter id="shadow-email">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12"/>
                    </filter>
                  </defs>

                  {/* Floating dots */}
                  <circle cx="100" cy="80" r="7" fill="#667eea" opacity="0.6" className="floating-dot floating-dot-1"/>
                  <circle cx="420" cy="120" r="8" fill="#764ba2" opacity="0.6" className="floating-dot floating-dot-2"/>
                  <circle cx="380" cy="300" r="6" fill="#10b981" opacity="0.6" className="floating-dot floating-dot-3"/>
                  <circle cx="90" cy="280" r="9" fill="#f59e0b" opacity="0.6" className="floating-dot floating-dot-4"/>

                  {/* Email Envelope - Klassisches @ Symbol */}
                  <g transform="translate(150, 110)" filter="url(#shadow-email)">
                    {/* Envelope body (Rechteck) */}
                    <rect x="0" y="40" width="200" height="140" rx="12" fill="url(#email-gradient)"/>

                    {/* Briefumschlag-Klappe (V-Form oben) */}
                    <path d="M0 40 L100 110 L200 40" fill="#764ba2" opacity="0.9"/>

                    {/* Umschlag-Kanten für 3D-Effekt */}
                    <line x1="0" y1="40" x2="100" y2="110" stroke="#ffffff" strokeWidth="2" opacity="0.3"/>
                    <line x1="200" y1="40" x2="100" y2="110" stroke="#ffffff" strokeWidth="2" opacity="0.3"/>

                    {/* Großes @ Symbol in der Mitte */}
                    <text x="100" y="135" fontSize="80" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="Arial, sans-serif">@</text>
                  </g>

                  {/* Upload arrow icon */}
                  <g transform="translate(330, 180)" filter="url(#shadow-email)">
                    <circle cx="25" cy="25" r="25" fill="#10b981"/>
                    <path d="M25 15 L25 35 M25 15 L18 22 M25 15 L32 22"
                          stroke="#ffffff"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"/>
                  </g>

                  {/* PDF document icon */}
                  <g transform="translate(110, 240)" filter="url(#shadow-email)">
                    <rect x="0" y="0" width="45" height="55" rx="4" fill="#ef4444"/>
                    <path d="M45 0 L45 15 L30 0 Z" fill="#dc2626"/>
                    <text x="22.5" y="38" fontSize="14" fontWeight="bold" fill="#ffffff" textAnchor="middle">PDF</text>
                  </g>

                  {/* Checkmark badge */}
                  <g transform="translate(360, 90)">
                    <circle cx="15" cy="15" r="15" fill="#10b981"/>
                    <path d="M8 15 L13 20 L22 11"
                          stroke="#ffffff"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"/>
                  </g>
                </svg>
              </div>

              <div className="cm-text">
                <h2 id="email-upload-title" className="reveal-text">Automatischer E-Mail-Upload — Verträge per E-Mail hochladen</h2>
                <p className="cm-subtext reveal-text">Leiten Sie E-Mails mit Vertragsanhängen einfach an Ihre persönliche Contract AI E-Mail-Adresse weiter. Das System erkennt PDF-Dateien automatisch, lädt sie hoch und analysiert sie — vollautomatisch und ohne manuelle Eingabe.</p>
                <ul className="cm-bullets reveal-block">
                  <li>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5"></path>
                      <path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 002-2v-6l-3.4-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.8 1.1z"></path>
                    </svg>
                    <span><strong>Keine manuelle Eingabe:</strong> Einfach E-Mail weiterleiten</span>
                  </li>
                  <li>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span><strong>Automatische Erkennung:</strong> PDFs werden sofort verarbeitet</span>
                  </li>
                  <li>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"></path>
                    </svg>
                    <span><strong>Funktioniert überall:</strong> Von jedem E-Mail-Postfach</span>
                  </li>
                  <li>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    <span><strong>Sofort im Dashboard:</strong> Verträge erscheinen automatisch</span>
                  </li>
                </ul>
                <div className="cm-cta reveal-text">
                  <Link to="/features/email-upload" className="cm-btn-primary" data-track="cta-email-upload">
                    Mehr erfahren
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
            <div className="section-title">
              <div className="section-title-decoration">
                <span></span>
                <span></span>
              </div>
              <h2 className="reveal-text">Entdecken Sie unsere Funktionen</h2>
              <p className="reveal-text">Sehen Sie, wie unsere KI-Tools Ihren Vertragsworkflow revolutionieren.</p>
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
                    <div className="image-container">
                      <img src={analyseImg} alt="Vertragsanalyse mit Score" />
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
                    <div className="image-container">
                      <img src={optimierungImg} alt="Verträge optimieren" />
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
                    <div className="image-container">
                      <img src={fristenImg} alt="Fristen Screenshot" />
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
                    <div className="image-container">
                      <img src={vergleichImg} alt="Verträge vergleichen" />
                      <div className="image-shine"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* New Feature 5: Generator */}
              <div className="showcase-item reveal-block">
                <div className="showcase-content">
                  <div className="showcase-label teal-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    Kreativ
                  </div>
                  <h3>Verträge automatisch erstellen</h3>
                  <p>Erstellen Sie rechtssichere, individuelle Verträge aus geprüften Vorlagen — in Minuten statt Stunden.</p>
                  <ul className="feature-list">
                    <li>Freelancer-, NDA- und Mietverträge</li>
                    <li>Intelligente Eingabemasken</li>
                    <li>Sofort exportieren & digital signieren</li>
                  </ul>
                  <Link to="/features/generator" className="showcase-link">
                    Zum Generator
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
                    <div className="image-container">
                      <img src={generatorImg} alt="Verträge automatisch erstellen" />
                      <div className="image-shine"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* New Feature 6: Legal Pulse */}
              <div className="showcase-item reverse reveal-block">
                <div className="showcase-content">
                  <div className="showcase-label red-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                    Proaktiv
                  </div>
                  <h3>Legal Pulse: Frühwarnsystem für Risiken</h3>
                  <p>Verfolgen Sie rechtliche Änderungen und bleiben Sie immer up to date. Contract AI schützt Sie vor neuen Risiken.</p>
                  <ul className="feature-list">
                    <li>Aktuelle Markt- und Gesetzes-Checks</li>
                    <li>Automatische Risiko-Alerts</li>
                    <li>Empfehlungen zur Anpassung</li>
                  </ul>
                  <Link to="/features/legalpulse" className="showcase-link">
                    Zum Legal Pulse
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
                    <div className="image-container">
                      <img src={legalPulseImg} alt="Legal Pulse Frühwarnsystem" />
                      <div className="image-shine"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* New Feature 7: Digitale Signatur */}
              <div className="showcase-item reveal-block">
                <div className="showcase-content">
                  <div className="showcase-label teal-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12"></path>
                    </svg>
                    Rechtssicher
                  </div>
                  <h3>Digitale Signatur: Verträge rechtssicher signieren lassen</h3>
                  <p>Versenden Sie Verträge zur digitalen Unterschrift, verfolgen Sie den Status in Echtzeit und erhalten Sie versiegelte PDFs mit vollständigem Audit Trail.</p>
                  <ul className="feature-list">
                    <li>E-Mail-Benachrichtigung an Unterzeichner</li>
                    <li>Echtzeit-Status-Tracking mit Audit Trail</li>
                    <li>Versiegeltes & rechtssicheres PDF</li>
                  </ul>
                  <Link to="/features/digitalesignatur" className="showcase-link">
                    Zur digitalen Signatur
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
                    <div className="image-container">
                      {/* SVG für Digitale Signatur - zeigt klar Unterschriften-Prozess */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid meet" style={{background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'}}>
                        <defs>
                          <linearGradient id="sig-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.1"/>
                            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.2"/>
                          </linearGradient>
                        </defs>

                        <circle cx="400" cy="300" r="180" fill="url(#sig-gradient-1)" opacity="0.3"/>
                        <circle cx="500" cy="200" r="120" fill="url(#sig-gradient-1)" opacity="0.2"/>

                        {/* Vertragsdokument */}
                        <g transform="translate(250, 80)">
                          <rect x="0" y="0" width="300" height="360" rx="12" fill="white" stroke="#14b8a6" strokeWidth="3" opacity="0.95"/>

                          {/* Vertrags-Header */}
                          <text x="150" y="35" fontSize="18" fill="#14b8a6" fontWeight="bold" textAnchor="middle">VERTRAG</text>
                          <line x1="30" y1="50" x2="270" y2="50" stroke="#e2e8f0" strokeWidth="2"/>

                          {/* Vertragstext-Linien */}
                          <line x1="30" y1="75" x2="270" y2="75" stroke="#cbd5e1" strokeWidth="2"/>
                          <line x1="30" y1="95" x2="270" y2="95" stroke="#cbd5e1" strokeWidth="2"/>
                          <line x1="30" y1="115" x2="240" y2="115" stroke="#cbd5e1" strokeWidth="2"/>
                          <line x1="30" y1="135" x2="270" y2="135" stroke="#cbd5e1" strokeWidth="2"/>

                          {/* UNTERSCHRIFTEN BEREICH 1 */}
                          <rect x="20" y="170" width="260" height="75" rx="8" fill="#f0fdfa" stroke="#14b8a6" strokeWidth="2" strokeDasharray="5,5"/>

                          <text x="30" y="190" fontSize="11" fill="#64748b" fontWeight="500">UNTERSCHRIFT:</text>

                          {/* Realistische Handschrift-Signatur */}
                          <path d="M 40 210 Q 55 200, 70 210 T 100 205 Q 115 200, 130 215 Q 140 225, 150 215 T 170 220"
                                stroke="#14b8a6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>

                          {/* Datum unter Signatur */}
                          <text x="40" y="235" fontSize="9" fill="#94a3b8">15.01.2025</text>

                          {/* Grüner Checkmark Badge */}
                          <circle cx="245" cy="207" r="18" fill="#10b981"/>
                          <path d="M 238 207 L 243 212 L 252 200" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>

                          {/* UNTERSCHRIFTEN BEREICH 2 */}
                          <rect x="20" y="265" width="260" height="75" rx="8" fill="#fefce8" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,5"/>

                          <text x="30" y="285" fontSize="11" fill="#64748b" fontWeight="500">UNTERSCHRIFT:</text>

                          {/* Gestrichelte Linie = noch nicht unterschrieben */}
                          <line x1="40" y1="305" x2="170" y2="305" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,4"/>

                          {/* Gelber Pending Badge */}
                          <circle cx="245" cy="302" r="18" fill="#f59e0b"/>
                          <text x="245" y="308" fontSize="20" fill="white" fontWeight="bold" textAnchor="middle">!</text>
                        </g>

                        {/* Stift-Icon (Schreib-Tool) */}
                        <g transform="translate(580, 120)">
                          <rect x="0" y="20" width="8" height="45" rx="2" fill="#14b8a6" transform="rotate(-45 4 42)"/>
                          <polygon points="0,20 8,20 4,10" fill="#0d9488"/>
                          <circle cx="4" cy="8" r="3" fill="#fbbf24"/>
                        </g>

                        {/* E-Mail Benachrichtigung Icon */}
                        <g transform="translate(100, 350)">
                          <rect x="0" y="0" width="70" height="50" rx="6" fill="#14b8a6" opacity="0.9"/>
                          <path d="M 0 0 L 35 28 L 70 0" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
                          <circle cx="60" cy="10" r="8" fill="#ef4444"/>
                          <text x="60" y="14" fontSize="10" fill="white" fontWeight="bold" textAnchor="middle">1</text>
                        </g>

                        {/* Dekorative Punkte */}
                        <circle cx="150" cy="100" r="5" fill="#14b8a6" opacity="0.4"/>
                        <circle cx="680" cy="250" r="6" fill="#10b981" opacity="0.4"/>
                        <circle cx="120" cy="300" r="4" fill="#0d9488" opacity="0.4"/>
                      </svg>
                      <div className="image-shine"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="testimonials-section" ref={(el) => registerSection('testimonials', el)}>
          <div className="section-container">
            <div className="section-title">
              <div className="section-title-decoration">
                <span></span>
                <span></span>
              </div>
              <h2 className="reveal-text">Das sagen unsere Nutzer</h2>
              <p className="reveal-text">Echte Erfahrungen von Menschen, die Contract AI bereits nutzen.</p>
            </div>
            
            <TestimonialsSlider />
          </div>
        </section>

        {/* Pricing Section */}
        <section className="pricing-section" ref={(el) => registerSection('pricing', el)}>
          <div className="pricing-bg">
            <div className="pricing-shape shape-1"></div>
            <div className="pricing-shape shape-2"></div>
          </div>
          <div className="section-container">
            <div className="section-title">
              <div className="section-title-decoration">
                <span></span>
                <span></span>
              </div>
              <h2 className="reveal-text">Transparente Preisgestaltung</h2>
              <p className="reveal-text">Wählen Sie den Plan, der Ihren Anforderungen entspricht.</p>
            </div>
            
            <HomePricingCards />
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section" ref={(el) => registerSection('cta', el)}>
          <div className="cta-bg">
            <div className="cta-shape shape-1"></div>
            <div className="cta-shape shape-2"></div>
          </div>
          <div className="section-container">
            <h2 className="reveal-text">Bereit, Ihre Verträge zu optimieren?</h2>
            <p className="reveal-text">Starten Sie jetzt mit Contract AI und erleben Sie die Zukunft des Vertragsmanagements.</p>
            <div className="cta-buttons reveal-text">
              {user ? (
                <Link to="/dashboard" className="cta-button primary glow">
                  <span className="button-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                      <line x1="8" y1="16" x2="16" y2="16"></line>
                      <line x1="8" y1="8" x2="10" y2="8"></line>
                    </svg>
                  </span>
                  Zum Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className="cta-button primary glow">
                    <span className="button-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                    </span>
                    Jetzt registrieren
                  </Link>
                  <Link to="/login" className="cta-button secondary">
                    <span className="button-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                      </svg>
                    </span>
                    Einloggen
                  </Link>
                </>
              )}
            </div>

            {/* Trust Line */}
            <div className="cta-trust-line reveal-text">
              <span className="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
                DSGVO-konform
              </span>
              <span className="trust-separator">·</span>
              <span className="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <circle cx="12" cy="16" r="1"></circle>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                TÜV-zertifiziert
              </span>
              <span className="trust-separator">·</span>
              <span className="trust-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12,6 12,12 16,14"></polyline>
                </svg>
                99,9% Uptime
              </span>
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
                    <li><Link to="/contracts">Vertragsanalyse</Link></li>
                    <li><Link to="/optimizer">Optimierung</Link></li>
                    <li><Link to="/calendar">Fristen</Link></li>
                    <li><Link to="/compare">Vergleich</Link></li>
                    <li><Link to="/generate">Generator</Link></li>
                    <li><Link to="/legalpulse">Legal Pulse</Link></li>
                    <li><Link to="/features/digitalesignatur">Digitale Signatur</Link></li>
                    <li><Link to="/features/vertragsverwaltung">Vertragsverwaltung</Link></li>
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
                    <li><Link to="/Datenschutz">Datenschutz</Link></li>
                    <li><Link to="/AGB">AGB</Link></li>
                    <li><Link to="/Impressum">Impressum</Link></li>
                    <li><a href="#" onClick={handleOpenCookieSettings}>Cookie-Einstellungen ändern</a></li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="footer-bottom">
              <p className="copyright">© 2025 Contract AI. Alle Rechte vorbehalten.</p>
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

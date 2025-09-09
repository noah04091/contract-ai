import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from "react-helmet";
import { useAuth } from "../hooks/useAuth";;
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
  const sliderRef = useRef<HTMLDivElement>(null);

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
    const newIndex = Math.min(currentIndex + 1, maxIndex);
    scrollToSlide(newIndex);
  };

  const prevSlide = () => {
    const newIndex = Math.max(currentIndex - 1, 0);
    scrollToSlide(newIndex);
  };

  const maxIndex = Math.max(0, testimonials.length - itemsPerView);

  return (
    <div className="testimonials-slider">
      <div className="slider-container">
        <button 
          className="slider-nav slider-prev" 
          onClick={prevSlide}
          disabled={currentIndex === 0}
          aria-label="Vorheriges Testimonial"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>

        <div 
          ref={sliderRef}
          className="slider-track"
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
          disabled={currentIndex >= maxIndex}
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
                  <span className="headline-line">Verträge verstehen.</span>
                  <span className="headline-line">Risiken vermeiden.</span>
                  <span className="headline-line">Freiheit gewinnen.</span>
                </h1>
              </div>
              
              {/* Subheadline with Glass Effect */}
              <div className="subheadline-glass-wrapper">
                <p className="sophisticated-hero-subheadline sophisticated-fade-up-delay">
                  Schluss mit stundenlangem Lesen. Komplexe Verträge werden endlich klar und verständlich.
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
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
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
                      <path d="M21 3H3v18h18V3z"></path>
                      <path d="M9 3v18"></path>
                      <path d="M3 9h18"></path>
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
              <div className="cm-visual" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
                  <defs>
                    <linearGradient id="cm-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3d7cf3" stopOpacity="0.1"/>
                      <stop offset="100%" stopColor="#5c7eea" stopOpacity="0.3"/>
                    </linearGradient>
                    <linearGradient id="cm-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4e20e4" stopOpacity="0.1"/>
                      <stop offset="100%" stopColor="#8a4fff" stopOpacity="0.2"/>
                    </linearGradient>
                  </defs>
                  
                  {/* Background circles */}
                  <circle cx="200" cy="150" r="120" fill="url(#cm-gradient-1)" opacity="0.4"/>
                  <circle cx="250" cy="100" r="80" fill="url(#cm-gradient-2)" opacity="0.3"/>
                  
                  {/* Main folder icon */}
                  <g transform="translate(150, 100)">
                    <rect x="0" y="20" width="100" height="70" rx="8" fill="#3d7cf3" opacity="0.9"/>
                    <path d="M0 20 L0 12 Q0 8 4 8 L30 8 L38 16 L96 16 Q100 16 100 20" fill="#5c7eea" opacity="0.9"/>
                    
                    {/* Document icons inside folder */}
                    <rect x="15" y="35" width="20" height="25" rx="2" fill="white" opacity="0.9"/>
                    <rect x="40" y="40" width="20" height="25" rx="2" fill="white" opacity="0.7"/>
                    <rect x="65" y="45" width="20" height="25" rx="2" fill="white" opacity="0.5"/>
                  </g>
                  
                  {/* Floating elements */}
                  <g opacity="0.6">
                    <circle cx="120" cy="80" r="4" fill="#f85ebd"/>
                    <circle cx="320" cy="120" r="3" fill="#2ed573"/>
                    <circle cx="280" cy="220" r="5" fill="#ff8c41"/>
                    <circle cx="100" cy="200" r="3" fill="#8a4fff"/>
                  </g>
                  
                  {/* Search icon */}
                  <g transform="translate(270, 180)" opacity="0.7">
                    <circle cx="15" cy="15" r="12" fill="none" stroke="#3d7cf3" strokeWidth="3"/>
                    <line x1="24" y1="24" x2="32" y2="32" stroke="#3d7cf3" strokeWidth="3" strokeLinecap="round"/>
                  </g>
                  
                  {/* Lock icon for security */}
                  <g transform="translate(100, 140)" opacity="0.6">
                    <rect x="0" y="10" width="24" height="18" rx="3" fill="#2ed573"/>
                    <path d="M6 10 L6 6 Q6 0 12 0 Q18 0 18 6 L18 10" fill="none" stroke="#2ed573" strokeWidth="2"/>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Extended Showcase Section with 6 New Features */}
        <section className="showcase-section" ref={(el) => registerSection('showcase', el)}>
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
            
            <div className="pricing-plans">
              <div className="pricing-plan standard reveal-card" style={{"--animation-order": 0} as React.CSSProperties}>
                <div className="plan-header">
                  <div className="plan-name">Free</div>
                  <div className="plan-price">
                    <span className="currency">€</span>
                    <span className="amount">0</span>
                    <span className="period"></span>
                  </div>
                  <div className="plan-billing">für immer</div>
                </div>
                <ul className="plan-features">
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Perfekt zum Testen
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Für gelegentliche Nutzung
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Grundfunktionen
                  </li>
                  <li className="unavailable">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Erweiterte Funktionen
                  </li>
                  <li className="unavailable">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Unbegrenzte Analysen
                  </li>
                </ul>
                <Link to="/register?plan=free" className="plan-cta">
                  Free wählen
                </Link>
              </div>
              
              <div className="pricing-plan premium reveal-card" style={{"--animation-order": 1} as React.CSSProperties}>
                <div className="plan-badge">Beliebt</div>
                <div className="plan-header">
                  <div className="plan-name">Business</div>
                  <div className="plan-price">
                    <span className="currency">€</span>
                    <span className="amount">4,90</span>
                    <span className="period">/Monat</span>
                  </div>
                  <div className="plan-billing">Für Freelancer und kleine Teams</div>
                </div>
                <ul className="plan-features">
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Bis zu 50 Vertragsanalysen
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Fristenerkennung & Benachrichtigungen
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Basisoptimierung
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Vertragsvergleich
                  </li>
                  <li className="unavailable">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Unbegrenzte Analysen
                  </li>
                </ul>
                <Link to="/register?plan=business" className="plan-cta premium-cta">
                  Business wählen
                </Link>
              </div>
              
              <div className="pricing-plan enterprise reveal-card" style={{"--animation-order": 2} as React.CSSProperties}>
                <div className="plan-header">
                  <div className="plan-name">Premium</div>
                  <div className="plan-price">
                    <span className="currency">€</span>
                    <span className="amount">9,90</span>
                    <span className="period">/Monat</span>
                  </div>
                  <div className="plan-billing">Unbegrenzte Features für Profis</div>
                </div>
                <ul className="plan-features">
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Unbegrenzte Vertragsanalysen
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Erweiterte Fristenverwaltung
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Erweiterte Optimierung
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Vertragsvergleich & -generator
                  </li>
                  <li>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Prioritäts-Support
                  </li>
                </ul>
                <Link to="/register?plan=premium" className="plan-cta enterprise-cta">
                  Premium wählen
                </Link>
              </div>
            </div>
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
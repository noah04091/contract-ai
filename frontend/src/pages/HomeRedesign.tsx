import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import "../styles/landing.css";

// Importiere Bilder
import logo from "../assets/logo-contractai.png";
import analysisImg from "../assets/screenshot-dashboard.png";
import deadlineImg from "../assets/screenshot-deadline.png";

interface User {
  plan: 'standard' | 'premium';
  isAuthenticated: boolean;
}

const HomeRedesign = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    
    // Scroll event listener
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrolled(scrollPosition > 10);
      
      // Parallax effect for hero section
      if (heroRef.current) {
        const opacity = Math.max(1 - scrollPosition / 900, 0.2);
        const translateY = scrollPosition * 0.4;
        heroRef.current.style.opacity = opacity.toString();
        const heroContent = heroRef.current.querySelector('.hero-content');
        if (heroContent) {
          heroContent.setAttribute('style', `transform: translateY(${translateY}px)`);
        }
      }
      
      // Check which section is currently in viewport
      const sectionIds = Object.keys(sectionsRef.current);
      for (const id of sectionIds) {
        const section = sectionsRef.current[id];
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            setActiveSection(id);
            break;
          }
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
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Register section refs
  const registerSection = (id: string, element: HTMLElement | null) => {
    if (element) {
      sectionsRef.current[id] = element;
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="logo">
            <Link to="/">
              <img src={logo} alt="Contract AI Logo" />
            </Link>
          </div>
          <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li className={activeSection === 'dashboard' ? 'active' : ''}>
              <Link to="/" className="nav-link">
                <span className="nav-icon">🏠</span>
                Dashboard
              </Link>
            </li>
            <li className={activeSection === 'features' ? 'active' : ''}>
              <Link to="/contracts" className="nav-link">
                <span className="nav-icon">📁</span>
                Verträge
              </Link>
            </li>
            <li className={activeSection === 'optimizer' ? 'active' : ''}>
              <Link to="/optimizer" className="nav-link">
                <span className="nav-icon">🧠</span>
                Optimierer
              </Link>
            </li>
            {!user?.isAuthenticated || (user && user.plan !== 'premium') ? (
              <li className={activeSection === 'pricing' ? 'active' : ''}>
                <Link to="/pricing" className="nav-link">
                  <span className="nav-icon">💰</span>
                  Preise
                </Link>
              </li>
            ) : null}
            {isLoading ? (
              <li className="loading-auth">
                <div className="loading-spinner"></div>
              </li>
            ) : user?.isAuthenticated ? (
              <li className="auth-buttons">
                <Link to="/dashboard" className="primary-button">
                  <span className="button-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                      <line x1="8" y1="16" x2="16" y2="16"></line>
                      <line x1="8" y1="8" x2="10" y2="8"></line>
                    </svg>
                  </span>
                  Zum Dashboard
                </Link>
              </li>
            ) : (
              <li className="auth-buttons">
                <Link to="/login" className="login-button">
                  <span className="button-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                      <polyline points="10 17 15 12 10 7"></polyline>
                      <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                  </span>
                  Login
                </Link>
                <Link to="/register" className="primary-button">
                  <span className="button-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                  </span>
                  Registrieren
                </Link>
              </li>
            )}
          </ul>
          <div className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`} onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="theme-toggle">
            <Link to="#" className="theme-button">
              <span className="light-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              </span>
              <span className="dark-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Floating Scroll Progress */}
      <div className="scroll-progress">
        <div className="scroll-progress-bar" style={{ width: `${(window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100}%` }}></div>
      </div>

      {/* Hero Section */}
      <section className="hero" ref={heroRef}>
        <div className="hero-bg">
          <div className="hero-shapes">
            <div className="hero-shape shape-1"></div>
            <div className="hero-shape shape-2"></div>
            <div className="hero-shape shape-3"></div>
            <div className="hero-glow"></div>
          </div>
        </div>
        <div className="logo-hero">
          <img src={logo} alt="Contract AI Logo" className="pulse-logo" />
        </div>
        <div className="hero-content">
          <h1 className="reveal-text">KI-gestützte Vertragsanalyse</h1>
          <p className="subtitle reveal-text">Verträge analysieren, optimieren & verwalten – einfach & sicher.</p>
          
          {!isLoading && (
            <div className="hero-cta reveal-text">
              {user?.isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="cta-button primary">
                    <span className="button-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                        <line x1="8" y1="16" x2="16" y2="16"></line>
                        <line x1="8" y1="8" x2="10" y2="8"></line>
                      </svg>
                    </span>
                    Zum Dashboard
                  </Link>
                  <div className="user-plan">
                    {user.plan === 'premium' ? (
                      <span className="premium-badge">
                        <span className="badge-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        </span>
                        Premium aktiviert
                      </span>
                    ) : (
                      <Link to="/pricing" className="upgrade-link">
                        <span className="badge-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                        </span>
                        Standard – Jetzt upgraden
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <div className="auth-cta">
                  <Link to="/register" className="cta-button primary">
                    <span className="button-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                    </span>
                    Registrieren
                  </Link>
                  <Link to="/login" className="cta-button secondary">
                    <span className="button-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                      </svg>
                    </span>
                    Login
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="hero-scroll-indicator">
          <div className="scroll-arrow"></div>
        </div>
      </section>

      {/* Features Section */}
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
              <p>Verträge KI-gestützt auswerten & bewerten lassen.</p>
              <Link to="/contracts" className="feature-link">
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
              <p>Unvorteilhafte Inhalte erkennen & direkt verbessern.</p>
              <Link to="/optimizer" className="feature-link">
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
              <p>Nie wieder Fristen verpassen dank automatischer Mails.</p>
              <Link to="/calendar" className="feature-link">
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
              <p>Zwei Verträge vergleichen & Unterschiede aufdecken.</p>
              <Link to="/compare" className="feature-link">
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

      {/* Showcase Section */}
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
            <div className="showcase-item reveal-block">
              <div className="showcase-content">
                <div className="showcase-label">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                  Fortschrittlich
                </div>
                <h3>Vertragsanalyse mit Score</h3>
                <p>Risiken, Chancen und Verständlichkeit per KI bewerten. Unsere intelligente Analyse identifiziert kritische Punkte in Ihren Verträgen und gibt Ihnen einen klaren Überblick über potenzielle Risiken.</p>
                <ul className="feature-list">
                  <li>Automatische Risikobewertung</li>
                  <li>Verständlichkeitsindex</li>
                  <li>Klauselanalyse</li>
                </ul>
                <Link to="/contracts" className="showcase-link">
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
                    <img src={analysisImg} alt="Vertragsanalyse Screenshot" />
                    <div className="image-shine"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="showcase-item reverse reveal-block">
              <div className="showcase-content">
                <div className="showcase-label orange-label">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  Zeitsparend
                </div>
                <h3>Fristen automatisch erkennen</h3>
                <p>Kündigungsfristen erkennen, Mails senden. Nie wieder eine wichtige Vertragsfrist verpassen mit unserer automatischen Fristenerkennung und Erinnerungsfunktion.</p>
                <ul className="feature-list">
                  <li>Automatische Fristenerkennung</li>
                  <li>Rechtzeitige E-Mail-Benachrichtigungen</li>
                  <li>Kalenderintegration</li>
                </ul>
                <Link to="/calendar" className="showcase-link">
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
                    <img src={deadlineImg} alt="Fristen Screenshot" />
                    <div className="image-shine"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                <div className="plan-name">Standard</div>
                <div className="plan-price">
                  <span className="currency">€</span>
                  <span className="amount">29</span>
                  <span className="period">/Monat</span>
                </div>
                <div className="plan-billing">Jährliche Abrechnung</div>
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
                  Fristenerkennung
                </li>
                <li>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Basisoptimierung
                </li>
                <li className="unavailable">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Unbegrenzte Vertragsanalysen
                </li>
                <li className="unavailable">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Erweiterte Funktionen
                </li>
              </ul>
              <Link to="/register?plan=standard" className="plan-cta">
                Standard wählen
              </Link>
            </div>
            
            <div className="pricing-plan premium reveal-card" style={{"--animation-order": 1} as React.CSSProperties}>
              <div className="plan-badge">Beliebt</div>
              <div className="plan-header">
                <div className="plan-name">Premium</div>
                <div className="plan-price">
                  <span className="currency">€</span>
                  <span className="amount">89</span>
                  <span className="period">/Monat</span>
                </div>
                <div className="plan-billing">Jährliche Abrechnung</div>
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
                  Fristenerkennung & Benachrichtigungen
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
                  Vertragsvergleich
                </li>
                <li>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Prioritäts-Support
                </li>
              </ul>
              <Link to="/register?plan=premium" className="plan-cta premium-cta">
                Premium wählen
              </Link>
            </div>
            
            <div className="pricing-plan enterprise reveal-card" style={{"--animation-order": 2} as React.CSSProperties}>
              <div className="plan-header">
                <div className="plan-name">Enterprise</div>
                <div className="plan-price">
                  <span className="custom-price">Individuell</span>
                </div>
                <div className="plan-billing">Maßgeschneiderte Lösung</div>
              </div>
              <ul className="plan-features">
                <li>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Alle Premium-Funktionen
                </li>
                <li>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  API-Zugang
                </li>
                <li>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Maßgeschneiderte Integrationen
                </li>
                <li>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Dedizierter Account Manager
                </li>
                <li>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  SLA-Garantie
                </li>
              </ul>
              <Link to="/contact" className="plan-cta enterprise-cta">
                Kontakt aufnehmen
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
            {!isLoading && (
              user?.isAuthenticated ? (
                <Link to="/dashboard" className="cta-button primary glow">
                  <span className="button-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                      </svg>
                    </span>
                    Einloggen
                  </Link>
                </>
              )
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
            </div>
            <div className="footer-columns">
              <div className="footer-column">
                <h4>Funktionen</h4>
                <ul>
                  <li><Link to="/contracts">Vertragsanalyse</Link></li>
                  <li><Link to="/optimizer">Optimierung</Link></li>
                  <li><Link to="/calendar">Fristen</Link></li>
                  <li><Link to="/compare">Vergleich</Link></li>
                </ul>
              </div>
              
              <div className="footer-column">
                <h4>Unternehmen</h4>
                <ul>
                  <li><a href="mailto:info@contract-ai.de">Kontakt</a></li>
                  <li><Link to="/about">Über uns</Link></li>
                  <li><Link to="/press">Presse</Link></li>
                </ul>
              </div>
              
              <div className="footer-column">
                <h4>Rechtliches</h4>
                <ul>
                  <li><Link to="/Datenschutz">Datenschutz</Link></li>
                  <li><Link to="/AGB">AGB</Link></li>
                  <li><Link to="/Impressum">Impressum</Link></li>
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
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomeRedesign;
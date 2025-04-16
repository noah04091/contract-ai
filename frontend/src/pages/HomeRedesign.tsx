import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import "../styles/landing.css";

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
              <img src="/assets/logo-contractai.png" alt="Contract AI Logo" />
            </Link>
          </div>
          <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li className={activeSection === 'features' ? 'active' : ''}>
              <Link to="/contracts" className="nav-link">
                <span className="nav-icon">📄</span>
                Verträge
              </Link>
            </li>
            <li className={activeSection === 'optimizer' ? 'active' : ''}>
              <Link to="/optimizer" className="nav-link">
                <span className="nav-icon">✨</span>
                Optimierer
              </Link>
            </li>
            <li className={activeSection === 'deadlines' ? 'active' : ''}>
              <Link to="/calendar" className="nav-link">
                <span className="nav-icon">⏰</span>
                Fristen
              </Link>
            </li>
            <li className={activeSection === 'compare' ? 'active' : ''}>
              <Link to="/compare" className="nav-link">
                <span className="nav-icon">⚖️</span>
                Vergleich
              </Link>
            </li>
            <li className={activeSection === 'pricing' ? 'active' : ''}>
              <Link to="/pricing" className="nav-link">
                <span className="nav-icon">💰</span>
                Preise
              </Link>
            </li>
            {isLoading ? (
              <li className="loading-auth">
                <div className="loading-spinner"></div>
              </li>
            ) : user?.isAuthenticated ? (
              <li className="auth-buttons">
                <Link to="/dashboard" className="primary-button">
                  <span className="button-icon">🚀</span>
                  Zum Dashboard
                </Link>
              </li>
            ) : (
              <li className="auth-buttons">
                <Link to="/login" className="login-button">
                  <span className="button-icon">🔐</span>
                  Login
                </Link>
                <Link to="/register" className="primary-button">
                  <span className="button-icon">📝</span>
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
              <span className="light-icon">🌞</span>
              <span className="dark-icon">🌙</span>
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
          </div>
        </div>
        <div className="logo-hero">
          <img src="/assets/logo-contractai.png" alt="Contract AI Logo" />
        </div>
        <div className="hero-content">
          <h1 className="reveal-text">KI-gestützte Vertragsanalyse</h1>
          <p className="subtitle reveal-text">Verträge analysieren, optimieren & verwalten – einfach & sicher.</p>
          
          {!isLoading && (
            <div className="hero-cta reveal-text">
              {user?.isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="cta-button primary">
                    <span className="button-icon">🚀</span>
                    Zum Dashboard
                  </Link>
                  <div className="user-plan">
                    {user.plan === 'premium' ? (
                      <span className="premium-badge">
                        <span className="badge-icon">💎</span>
                        Premium aktiviert
                      </span>
                    ) : (
                      <Link to="/pricing" className="upgrade-link">
                        <span className="badge-icon">🔓</span>
                        Standard – Jetzt upgraden
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <div className="auth-cta">
                  <Link to="/register" className="cta-button primary">
                    <span className="button-icon">📝</span>
                    Registrieren
                  </Link>
                  <Link to="/login" className="cta-button secondary">
                    <span className="button-icon">🔐</span>
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
            <h2 className="reveal-text">Unsere KI-Tools für Ihre Verträge</h2>
            <p className="reveal-text">Erleben Sie die Zukunft des Vertragsmanagements.</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card reveal-card" style={{"--animation-order": 0} as React.CSSProperties}>
              <div className="feature-icon-wrapper blue">
                <div className="feature-icon">🔍</div>
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
                <div className="feature-icon">🧠</div>
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
                <div className="feature-icon">⏰</div>
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
                <div className="feature-icon">📊</div>
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
            <h2 className="reveal-text">Entdecken Sie unsere Funktionen</h2>
            <p className="reveal-text">Sehen Sie, wie unsere KI-Tools Ihren Vertragsworkflow revolutionieren.</p>
          </div>
          
          <div className="showcase-items">
            <div className="showcase-item reveal-block">
              <div className="showcase-content">
                <div className="showcase-label">Fortschrittlich</div>
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
                <img src="/assets/showcase-analysis.png" alt="Vertragsanalyse Screenshot" />
                <div className="image-shine"></div>
              </div>
            </div>
            
            <div className="showcase-item reverse reveal-block">
              <div className="showcase-content">
                <div className="showcase-label">Zeitsparend</div>
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
                <img src="/assets/showcase-deadline.png" alt="Fristen-Feature Screenshot" />
                <div className="image-shine"></div>
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
            <h2 className="reveal-text">Transparente Preisgestaltung</h2>
            <p className="reveal-text">Wählen Sie den Plan, der Ihren Anforderungen entspricht.</p>
          </div>
          
          <div className="pricing-plans">
            <div className="pricing-plan standard reveal-card" style={{"--animation-order": 0} as React.CSSProperties}>
              <div className="plan-header">
                <div className="plan-name">Standard</div>
                <div className="plan-price">
                  <span className="amount">29</span>
                  <span className="currency">€</span>
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
                  <span className="amount">89</span>
                  <span className="currency">€</span>
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
              <Link to="/contact" className="plan-cta">
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
                  <span className="button-icon">🚀</span>
                  Zum Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className="cta-button primary glow">
                    <span className="button-icon">📝</span>
                    Jetzt registrieren
                  </Link>
                  <Link to="/login" className="cta-button secondary">
                    <span className="button-icon">🔐</span>
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
              <img src="/assets/logo-contractai.png" alt="Contract AI Logo" />
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
                  <li><Link to="/privacy">Datenschutz</Link></li>
                  <li><Link to="/terms">AGB</Link></li>
                  <li><Link to="/imprint">Impressum</Link></li>
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
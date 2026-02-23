import React from 'react';
import { Link } from 'react-router-dom';
import logo from "../assets/logo-contractai.webp";
import dsgvoBadge from "../assets/dsgvo-badge.webp";
import trustpilotBadge from "../assets/trustpilot-badge.webp";

const Footer: React.FC = () => {
  const handleOpenCookieSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.openCookieSettings) {
      window.openCookieSettings();
    }
  };

  return (
    <footer className="footer">
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
  );
};

// Window interface für TypeScript
declare global {
  interface Window {
    openCookieSettings?: () => void;
  }
}

export default Footer;
import { Helmet } from "react-helmet";
import { useEffect, useRef } from "react";
import "../styles/LegalPages.css";

export default function AGB() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Parallax effect for the header section
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const header = document.querySelector('.legal-header') as HTMLElement;
      if (header) {
        header.style.transform = `translateY(${scrollPosition * 0.3}px)`;
        header.style.opacity = `${1 - scrollPosition / 500}`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Subtle animation on section hover
    const sections = document.querySelectorAll('.legal-section');
    sections.forEach(section => {
      section.addEventListener('mouseenter', () => {
        section.classList.add('hovered');
      });
      section.addEventListener('mouseleave', () => {
        section.classList.remove('hovered');
      });
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      sections.forEach(section => {
        section.removeEventListener('mouseenter', () => {});
        section.removeEventListener('mouseleave', () => {});
      });
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Allgemeine Geschäftsbedingungen | Contract AI</title>
        <meta name="description" content="Hier findest du die Allgemeinen Geschäftsbedingungen (AGB) von Contract AI – transparent, fair und verständlich erklärt." />
        <meta name="keywords" content="AGB, Vertragsbedingungen, Contract AI AGB, Nutzungsbedingungen" />
        <link rel="canonical" href="https://contract-ai.de/agb" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Allgemeine Geschäftsbedingungen | Contract AI" />
        <meta property="og:description" content="Unsere AGB geben dir volle Transparenz zu den Vertragsbedingungen und der Nutzung von Contract AI." />
        <meta property="og:url" content="https://contract-ai.de/agb" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Allgemeine Geschäftsbedingungen | Contract AI" />
        <meta name="twitter:description" content="Lies hier die Vertrags- und Nutzungsbedingungen von Contract AI. Transparent und klar formuliert." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>
      
      <div className="legal-container" ref={containerRef}>
        <div className="legal-bg">
          <div className="legal-shape shape-1"></div>
          <div className="legal-shape shape-2"></div>
        </div>
        
        <div className="legal-header">
          <div className="legal-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h6"></path>
              <path d="M14 3v5h5M18 21v-6M15 18h6"></path>
            </svg>
          </div>
          <h1>Allgemeine Geschäftsbedingungen</h1>
          <p className="legal-subtitle">Gültig ab 17. April 2025</p>
        </div>
        
        <div className="legal-content">
          <div className="legal-section">
            <div className="section-number">01</div>
            <div className="section-content">
              <h2>Geltungsbereich</h2>
              <p>Diese AGB gelten für die Nutzung der Webanwendung Contract AI, bereitgestellt von Noah Liebold.</p>
            </div>
          </div>
          
          <div className="legal-section">
            <div className="section-number">02</div>
            <div className="section-content">
              <h2>Vertragsschluss</h2>
              <p>Mit der Registrierung und Nutzung unserer Leistungen kommt ein Nutzungsvertrag zustande.</p>
            </div>
          </div>
          
          <div className="legal-section">
            <div className="section-number">03</div>
            <div className="section-content">
              <h2>Leistungen</h2>
              <p>Die Plattform bietet KI-gestützte Vertragsanalysen, Vergleiche und Erinnerungsdienste.</p>
            </div>
          </div>
          
          <div className="legal-section">
            <div className="section-number">04</div>
            <div className="section-content">
              <h2>Pflichten des Nutzers</h2>
              <p>Der Nutzer verpflichtet sich, keine rechtswidrigen Inhalte hochzuladen und die Plattform nicht zu missbrauchen.</p>
            </div>
          </div>
          
          <div className="legal-section">
            <div className="section-number">05</div>
            <div className="section-content">
              <h2>Haftung</h2>
              <p>Wir haften nicht für die Richtigkeit der KI-generierten Analysen oder für etwaige rechtliche Fehlinterpretationen.</p>
            </div>
          </div>
          
          <div className="legal-section">
            <div className="section-number">06</div>
            <div className="section-content">
              <h2>Schlussbestimmungen</h2>
              <p>Es gilt deutsches Recht. Gerichtsstand ist – soweit gesetzlich zulässig – der Sitz des Betreibers.</p>
            </div>
          </div>
        </div>
        
        <div className="legal-footer">
          <p>Bei Fragen zu unseren AGB kontaktieren Sie uns bitte unter <a href="mailto:info@contract-ai.de">info@contract-ai.de</a></p>
          <div className="legal-updated">Letzte Aktualisierung: April 2025</div>
        </div>
      </div>
    </>
  );
}
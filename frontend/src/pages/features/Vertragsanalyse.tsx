import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import "../../styles/landing.css";

const Vertragsanalyse: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const vorteile = [
    {
      title: "Schnell",
      description: "Analyse in Sekunden statt Stunden."
    },
    {
      title: "Präzise",
      description: "Erkennt auch versteckte Formulierungsfallen."
    },
    {
      title: "Übersichtlich",
      description: "Ampelsystem & Score für schnelle Entscheidungen."
    }
  ];

  const funktionen = [
    "Unsere KI prüft Ihren Vertrag Zeile für Zeile.",
    "Risiken werden markiert, Chancen hervorgehoben.",
    "Verständlichkeit wird mit einem Score bewertet – perfekt für Laien und Profis."
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie funktioniert die KI-Vertragsanalyse?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die KI liest und interpretiert Ihren Vertrag vollständig, erkennt Risiken, bewertet Fairness und erstellt eine verständliche Zusammenfassung. In unter 60 Sekunden erhalten Sie Chancen-Risiken-Score, kritische Klauseln und Handlungsempfehlungen."
        }
      },
      {
        "@type": "Question", 
        "name": "Welche Vertragsarten werden unterstützt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Arbeitsverträge, Mietverträge, Kaufverträge, Freelancer-Agreements, NDAs, SaaS-Verträge, Dienstleistungsverträge, Kooperationsverträge und mehr. Die KI erkennt automatisch den Vertragstyp und passt die Analyse entsprechend an."
        }
      },
      {
        "@type": "Question",
        "name": "Ist die Analyse rechtssicher?", 
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die KI-Analyse basiert auf aktueller Rechtsprechung und identifiziert potenzielle Problemstellen zuverlässig. Für bindende Rechtsberatung empfehlen wir bei kritischen Punkten zusätzlich einen Anwalt zu konsultieren."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertragsanalyse mit KI - Versteckte Risiken in 60 Sekunden aufdecken | Contract AI</title>
        <meta name="description" content="🔍 KI analysiert Ihren Vertrag in 60 Sekunden → Chancen-Risiken-Score, kritische Klauseln, Handlungsempfehlungen. DSGVO-konform, EU-Server. Jetzt kostenlos testen!" />
        <meta name="keywords" content="Vertragsanalyse, KI, AI, Vertrag prüfen, Risiken erkennen, Contract AI, Künstliche Intelligenz, Rechtstech, LegalTech" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Vertragsanalyse mit KI - Versteckte Risiken in 60 Sekunden aufdecken" />
        <meta property="og:description" content="🔍 KI analysiert Ihren Vertrag in 60 Sekunden → Chancen-Risiken-Score, kritische Klauseln, Handlungsempfehlungen. Jetzt kostenlos testen!" />
        <meta property="og:type" content="website" />
        
        {/* Schema.org FAQ Data */}
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>
      
      <div className={styles.featureContainer}>
        
        {/* Hero Section */}
        <header className={`${styles.heroSection} ${styles.hero}`}>
          <div className={styles.heroIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
          <h1 className={`${styles.heroTitle} fadeInUp`}>
            Verträge verstehen in Sekunden – mit KI-Score
          </h1>
          <p className={`${styles.heroSubtitle} ${styles.lead} fadeInUp`} style={{ animationDelay: '0.1s' }}>
            Unsere KI liest, bewertet und erklärt Ihre Verträge. Risiken, Chancen und Verständlichkeit – alles auf einen Blick. Für Laien und Profis.
          </p>
          
          {/* Trust Badges */}
          <div className={`${styles.badges} fadeInUp`} style={{ 
            animationDelay: '0.2s', 
            marginTop: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '16px', 
            flexWrap: 'wrap',
            fontSize: '14px',
            color: '#666'
          }}>
            <span className={styles.badge} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🇪🇺 DSGVO-konform
            </span>
            <span className={styles.badge} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🔒 Server: Frankfurt (EU)
            </span>
            <span className={styles.badge} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚡ Sichere Verschlüsselung
            </span>
          </div>
          
          {/* Hero CTA Group */}
          <div className={`${styles.ctaWrap} fadeInUp`} style={{ animationDelay: '0.3s', marginTop: '32px' }} aria-label="Schnellstart">
            <a 
              href="#so-funktionierts" 
              className={`${styles.btn} ${styles['btn-secondary']}`}
              style={{ 
                background: 'rgba(255,255,255,0.1)', 
                color: '#007aff', 
                border: '1px solid rgba(0,122,255,0.3)', 
                padding: '14px 18px', 
                borderRadius: '12px', 
                fontWeight: '600', 
                textDecoration: 'none' 
              }}
            >
              Mehr erfahren
            </a>
            {user && user.subscriptionActive ? (
              <Link 
                to="/contracts" 
                className={`${styles.btn} ${styles['btn-primary']} ${styles.ctaButton}`}
                style={{ padding: '14px 18px' }}
              >
                Jetzt Vertrag analysieren
              </Link>
            ) : (
              <Link 
                to="/login" 
                className={`${styles.btn} ${styles['btn-primary']} ${styles.ctaButton}`}
                style={{ padding: '14px 18px' }}
              >
                Jetzt Vertrag analysieren
              </Link>
            )}
          </div>
        </header>
        
        {/* Was es macht Section */}
        <section className={styles.funktionSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.2s' }}>
            <h2 className={styles.sectionTitle}>Was es macht</h2>
            <div className={`${styles.funktionGrid} ${styles.grid}`}>
              {funktionen.map((funktion, index) => (
                <div key={index} className={`${styles.funktionItem} ${styles.card} fadeInUp`} style={{ animationDelay: `${0.3 + index * 0.1}s` }}>
                  <div className={styles.funktionIcon}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <p className={styles.funktionText}>{funktion}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Visual Features Section - Apple Style */}
        <section style={{ padding: '80px 20px', background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 100%)' }}>
          <div className={styles.contentContainer}>
            <h2 className={`${styles.sectionTitle} fadeInUp`} style={{ 
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #007aff, #5856d6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Intelligente Vertragsanalyse
            </h2>
            <p style={{ 
              textAlign: 'center', 
              color: '#666', 
              fontSize: '18px', 
              maxWidth: '600px', 
              margin: '0 auto 48px',
              lineHeight: '1.6'
            }}>
              Drei Dimensionen der Analyse, die den Unterschied machen
            </p>
            
            {/* Visual Cards Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '32px', 
              maxWidth: '1000px', 
              margin: '0 auto' 
            }}>
              {vorteile.map((vorteil, index) => (
                <div key={index} className={`fadeInUp`} style={{ 
                  animationDelay: `${0.5 + index * 0.2}s`,
                  background: 'white',
                  padding: '32px 24px',
                  borderRadius: '20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(255,255,255,0.8)',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Gradient Background */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: index === 0 ? 'linear-gradient(90deg, #ff6b6b, #ffa726)' : 
                               index === 1 ? 'linear-gradient(90deg, #4caf50, #8bc34a)' : 
                               'linear-gradient(90deg, #2196f3, #03a9f4)'
                  }} />
                  
                  {/* Icon */}
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    margin: '0 auto 20px',
                    background: index === 0 ? 'linear-gradient(135deg, #ff6b6b, #ffa726)' : 
                               index === 1 ? 'linear-gradient(135deg, #4caf50, #8bc34a)' : 
                               'linear-gradient(135deg, #2196f3, #03a9f4)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {index === 0 ? '⚡' : index === 1 ? '🎯' : '📊'}
                  </div>
                  
                  <h3 style={{ 
                    margin: '0 0 12px', 
                    fontSize: '20px', 
                    fontWeight: '600',
                    color: '#1d1d1f'
                  }}>
                    {vorteil.title}
                  </h3>
                  
                  <p style={{ 
                    margin: '0', 
                    color: '#666', 
                    fontSize: '16px',
                    lineHeight: '1.5'
                  }}>
                    {vorteil.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Beispiel Section */}
        <section className={styles.beispielSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.6s' }}>
            <h2 className={styles.sectionTitle}>Praxisbeispiel</h2>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <blockquote className={styles.beispielText}>
                „Ihre Kündigungsfrist ist ungewöhnlich lang – das könnte zu Nachteilen führen. 
                Kürzen Sie diese auf 3 Monate, um flexibler zu bleiben."
              </blockquote>
              <p className={styles.beispielHinweis}>
                So könnte eine typische Analyse-Empfehlung aussehen
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.statsSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.7s' }}>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>15 Sek</div>
                <div className={styles.statLabel}>Durchschnittliche Analysezeit</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>98%</div>
                <div className={styles.statLabel}>Erkennungsgenauigkeit</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>1000+</div>
                <div className={styles.statLabel}>Analysierte Verträge</div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section style={{ background: '#f8fbff', padding: '48px 20px', textAlign: 'center' }}>
          <div className={styles.contentContainer}>
            <h3 style={{ margin: '0 0 24px', fontSize: '20px', color: '#1d1d1f' }}>
              Bereits über 10.000 Verträge erfolgreich analysiert
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '24px', 
              maxWidth: '800px', 
              margin: '0 auto' 
            }}>
              <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>
                  "Hätte nie gedacht, dass in meinem Mietvertrag so viele Risiken stecken. Dank Contract AI konnte ich nachverhandeln."
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: '#999', fontWeight: '600' }}>
                  Startup-Gründer, München
                </p>
              </div>
              <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>
                  "Die Analyse war so detailliert, dass mein Anwalt beeindruckt war. Hat mir 500€ Beratungskosten gespart."
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: '#999', fontWeight: '600' }}>
                  Freelancerin, Berlin
                </p>
              </div>
              <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>
                  "60 Sekunden und ich wusste genau, worauf ich beim Vertragspartner achten muss. Genial einfach."
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: '#999', fontWeight: '600' }}>
                  Unternehmer, Hamburg
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.8s' }}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>🔍 Entdecken Sie jetzt versteckte Vertragsrisiken</h2>
              <p className={styles.ctaSubtitle}>
                Über 87% unserer Nutzer finden kritische Klauseln, die sie übersehen hätten. 
                Gehören Sie zu den 13%, die alles richtig gemacht haben?
              </p>
              {user && user.subscriptionActive ? (
                <Link to="/contracts" className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }}>
                  ⚡ Vertrag analysieren (kostenlos)
                </Link>
              ) : (
                <Link to="/login" className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }}>
                  💡 Risiken in 60 Sekunden aufdecken
                </Link>
              )}
              
              {/* Trust badges below CTA */}
              <div style={{ 
                marginTop: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '32px', 
                flexWrap: 'wrap',
                fontSize: '13px',
                color: '#ccc'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✓ 100% kostenlos testen
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✓ Keine Kreditkarte nötig
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✓ DSGVO-konform
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </>
  );
};

export default Vertragsanalyse;
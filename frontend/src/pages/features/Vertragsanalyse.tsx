import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { Search, Target, CheckCircle, AlertTriangle } from "lucide-react";

const Vertragsanalyse: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/contracts";
  const target = isAuthenticated ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
        
        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <Search size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Versteckte Risiken erkennen – <span className={styles.heroTitleHighlight}>automatisch</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Unsere KI liest, bewertet und erklärt Ihre Verträge in unter 60 Sekunden. Risiken, Chancen und kritische Klauseln – alles auf einen Blick.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Vertrag jetzt analysieren">
              🔍 Vertrag jetzt analysieren
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie die Analyse funktioniert">
              Wie die Analyse funktioniert
            </a>
          </div>
          
          {/* Trust Signals */}
          <div style={{ 
            marginTop: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '24px', 
            flexWrap: 'wrap',
            fontSize: '14px',
            color: '#666'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚡ In 60 Sekunden fertig
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎯 98% Genauigkeit
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🇪🇺 DSGVO-konform
            </span>
          </div>
        </section>
        <div className={styles.contentContainer}>
          
          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Vertragsanalyse so wichtig ist</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <AlertTriangle size={20} />
                </div>
                <p className={styles.funktionText}>
                  Die meisten Verträge sind kompliziert geschrieben und voller Risiken, die Laien übersehen. Versteckte Klauseln können teuer werden: Einseitige Haftung, ungünstige Kündigungsfristen, unklare Leistungsbeschreibungen oder Kostenüberraschungen. Was heute unproblematisch aussieht, wird morgen zum Streitfall.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Target size={20} />
                </div>
                <p className={styles.funktionText}>
                  Contract AI erkennt diese Fallen automatisch und erklärt sie in verständlicher Sprache. In unter 60 Sekunden wissen Sie, wo Ihre Risiken liegen, welche Klauseln problematisch sind und was Sie dagegen tun können. Objektiv, schnell und ohne Juristendeutsch.
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: KI-gestützte Vertragsanalyse in 60 Sekunden</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Contract AI liest Ihren Vertrag wie ein erfahrener Jurist – nur viel schneller. Die KI erkennt automatisch den Vertragstyp, analysiert alle Klauseln systematisch und bewertet Risiken nach objektiven Kriterien. Das Ergebnis: Ein klarer Überblick über Chancen und Gefahren.
            </p>
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🎯 <strong>Automatische Risikobewertung:</strong> Jede Klausel wird auf Fairness und mögliche Nachteile geprüft</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📊 <strong>Verständliche Scores:</strong> Chancen-Risiken-Bewertung mit Ampelsystem für schnelle Entscheidungen</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>💡 <strong>Konkrete Handlungsempfehlungen:</strong> Was Sie tun können, um Ihre Position zu verbessern</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>⚡ <strong>In Sekunden fertig:</strong> Upload, Analyse, Ergebnis – alles in unter einer Minute</li>
            </ul>
          </section>

          {/* HOW IT WORKS */}
          <section id="so-funktionierts" className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>So funktioniert's – in 3 Schritten</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>1</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Vertrag hochladen:</strong> PDF oder DOCX Ihres Vertrags hochladen – verschlüsselt und sicher auf EU-Servern verarbeitet.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>KI-Analyse:</strong> Intelligente Erkennung von Vertragstyp, Klauseln und Risiken. Bewertung nach objektiven Kriterien.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Ergebnis erhalten:</strong> Übersichtliche Zusammenfassung mit Chancen-Risiken-Score und konkreten Handlungsempfehlungen.
                </p>
              </div>
            </div>
          </section>

          {/* FEATURES GRID */}
          <section className={styles.vorteileSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Funktionen im Überblick</h2>
              <div className={styles.vorteileGrid}>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Risiko-Scanner</h3>
                  <p className={styles.vorteilText}>Erkennt problematische Klauseln, einseitige Regelungen und versteckte Kostenfallen automatisch.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Fairness-Bewertung</h3>
                  <p className={styles.vorteilText}>Bewertet Ausgewogenheit des Vertrags und zeigt, wo eine Seite benachteiligt wird.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Verständlichkeits-Check</h3>
                  <p className={styles.vorteilText}>Übersetzt kompliziertes Juristendeutsch in klare, verständliche Sprache.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Chancen-Analyse</h3>
                  <p className={styles.vorteilText}>Zeigt nicht nur Risiken, sondern auch Ihre Vorteile und Rechte im Vertrag auf.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Handlungsempfehlungen</h3>
                  <p className={styles.vorteilText}>Konkrete Tipps, wie Sie problematische Punkte ansprechen oder nachverhandeln können.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Export-Funktionen</h3>
                  <p className={styles.vorteilText}>Analyseergebnisse als PDF speichern und für Verhandlungen oder Beratung nutzen.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>Typische Vertragsrisiken – die wir automatisch erkennen</h2>
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '40px' }}>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Überlange Kündigungsfristen</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Risiko:</strong> 12 Monate Kündigungsfrist als Mieter</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Analyse:</strong> "Ungewöhnlich lang – schränkt Ihre Flexibilität stark ein."</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Versteckte Kostenfallen</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Risiko:</strong> "Zusätzliche Gebühren nach Ermessen"</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Analyse:</strong> "Gefahr unbegrenzter Zusatzkosten – verlangen Sie Obergrenze."</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Einseitige Haftungsklauseln</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Risiko:</strong> "Vollständige Haftung beim Auftragnehmer"</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Analyse:</strong> "Extrem einseitig – fordern Sie Haftungsbegrenzung."</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Unklare Leistungsbeschreibung</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Risiko:</strong> Vage definierte Arbeitszeiten</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Analyse:</strong> "Streitpotential hoch – konkretisieren Sie die Leistung."</p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <CheckCircle size={32} />
              </div>
              <p className={styles.beispielText}>
                "Contract AI hat mir in 30 Sekunden gezeigt, was mein Anwalt übersehen hätte. Das Risiko-Scoring ist genial."
              </p>
              <p className={styles.beispielHinweis}>
                Typisches Feedback unserer Premium-Nutzer
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Contract AI?</h2>
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🎯 <strong>Objektive Bewertung</strong> ohne kommerzielle Interessen – nur die Fakten für Sie</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🇪🇺 <strong>Server in Deutschland (Frankfurt)</strong>, volle DSGVO-Konformität und EU-Datenschutz</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📋 <strong>Verständliche Ergebnisse:</strong> Ampelsystem und klare Sprache statt Juristendeutsch</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>👤 <strong>Für jeden geeignet:</strong> Ob Laie oder Profi – die Analyse passt sich Ihrem Niveau an</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>⚡ <strong>Sofort verfügbar:</strong> Keine Termine, keine Wartezeiten – Analyse in unter 60 Sekunden</li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle} style={{ color: 'white' }}>Sicherheit & Datenschutz</h2>
              <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Ihre Verträge bleiben Ihre Daten. Verschlüsselung bei Übertragung und Speicherung, Verarbeitung ausschließlich auf EU-Servern in Frankfurt. 
                Löschung auf Wunsch jederzeit möglich. Keine Weitergabe an Dritte, nur zweckgebundene KI-Analyse.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>98%</div>
                  <div className={styles.statLabel}>Erkennungsgenauigkeit</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{'< 60s'}</div>
                  <div className={styles.statLabel}>Analysezeit</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>10,000+</div>
                  <div className={styles.statLabel}>Analysierte Verträge</div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Ersetzt die Analyse eine Rechtsberatung?</summary>
                <p style={{ margin: '0', color: '#666' }}>Nein, Contract AI liefert strukturierte Risikoanalysen und Bewertungen. Für komplexe rechtliche Fragen sollten Sie weiterhin einen Anwalt konsultieren.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Welche Vertragsarten können analysiert werden?</summary>
                <p style={{ margin: '0', color: '#666' }}>Die meisten Standardverträge: Arbeitsverträge, Mietverträge, Kaufverträge, NDAs, Freelancer-Agreements, SaaS-Verträge, Dienstleistungsverträge und mehr.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Wie genau ist die KI-Analyse?</summary>
                <p style={{ margin: '0', color: '#666' }}>Die KI erreicht eine Erkennungsgenauigkeit von 98% bei der Identifikation problematischer Klauseln. Sie basiert auf tausenden analysierten Verträgen und aktueller Rechtsprechung.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Werden meine Vertragsdaten gespeichert?</summary>
                <p style={{ margin: '0', color: '#666' }}>Optional zur Verlaufsanzeige. Sie können Dokumente jederzeit löschen lassen. Verarbeitung erfolgt ausschließlich zur Analyse, keine Weitergabe an Dritte.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Was kostet die Vertragsanalyse?</summary>
                <p style={{ margin: '0', color: '#666' }}>Im Free-Tier: 3 Analysen pro Monat kostenlos. Premium-Pläne ab 19€/Monat mit unbegrenzten Analysen und erweiterten Features.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Wie schnell erhalte ich das Ergebnis?</summary>
                <p style={{ margin: '0', color: '#666' }}>In der Regel unter 60 Sekunden nach dem Upload. Bei sehr umfangreichen Verträgen kann es bis zu 2 Minuten dauern.</p>
              </details>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Versteckte Risiken aufdecken, bevor sie teuer werden</h2>
              <p className={styles.ctaSubtitle}>
                Über 87% unserer Nutzer finden kritische Klauseln, die sie übersehen hätten. Analysieren Sie Ihren Vertrag – in 60 Sekunden
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
                <button 
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  So funktioniert die Analyse
                </button>
                <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Vertrag kostenlos analysieren">
                  🔍 Vertrag kostenlos analysieren
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
      
      <Footer />
    </>
  );
};

export default Vertragsanalyse;
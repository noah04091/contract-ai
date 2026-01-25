import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import AutoPlayVideo from "../../components/AutoPlayVideo";
import { Search, Target, CheckCircle, AlertTriangle, FileText, Shield, Zap, Briefcase, ArrowRight, Play } from "lucide-react";

// Video
const analyseVideo = "/Videos/analyse.mp4";
import analyseImg from "../../assets/Analyse.webp";

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
        
        <link rel="canonical" href="https://www.contract-ai.de/features/vertragsanalyse" />
        <meta name="robots" content="index,follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Vertragsanalyse mit KI - Versteckte Risiken in 60 Sekunden aufdecken" />
        <meta property="og:description" content="🔍 KI analysiert Ihren Vertrag in 60 Sekunden → Chancen-Risiken-Score, kritische Klauseln, Handlungsempfehlungen. Jetzt kostenlos testen!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/vertragsanalyse" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertragsanalyse mit KI - Versteckte Risiken in 60 Sekunden aufdecken" />
        <meta name="twitter:description" content="KI analysiert Ihren Vertrag in 60 Sekunden. Chancen-Risiken-Score, kritische Klauseln, Handlungsempfehlungen." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />

        {/* Schema.org FAQ Data */}
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <div className={styles.pageBackground}>
        {/* Dots Pattern */}
        <div className={styles.dotsPattern} />

        {/* Floating Decorative Elements */}
        <div className={styles.floatingElements}>
          <FileText className={styles.floatingIcon} size={28} />
          <Shield className={styles.floatingIcon} size={24} />
          <Search className={styles.floatingIcon} size={22} />
          <CheckCircle className={styles.floatingIcon} size={26} />
          <Target className={styles.floatingIcon} size={20} />
          <AlertTriangle className={styles.floatingIcon} size={24} />
          <Zap className={styles.floatingIcon} size={22} />
          <Briefcase className={styles.floatingIcon} size={26} />
        </div>

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
          <div className={styles.heroButtons}>
            <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Vertrag jetzt analysieren">
              🔍 Vertrag jetzt analysieren
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie die Analyse funktioniert">
              Wie die Analyse funktioniert
            </a>
          </div>
          
          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <Zap size={16} className={styles.trustBadgeIcon} />
              <span>In 60 Sekunden</span>
            </div>
            <div className={styles.trustBadge}>
              <Target size={16} className={styles.trustBadgeIcon} />
              <span>98% Genauigkeit</span>
            </div>
            <div className={styles.trustBadge}>
              <Shield size={16} className={styles.trustBadgeIcon} />
              <span>DSGVO-konform</span>
            </div>
          </div>
        </section>

        {/* VIDEO SHOWCASE */}
        <section className={styles.videoSection}>
          <div className={styles.videoContainer}>
            <div style={{ textAlign: 'center' }}>
              <div className={styles.videoLabel}>
                <Play size={14} />
                <span>So sieht's aus</span>
              </div>
            </div>
            <h2 className={styles.sectionTitle}>Die Vertragsanalyse in Aktion</h2>
            <div className={styles.videoFrame}>
              <div className={styles.videoWrapper}>
                <AutoPlayVideo
                  src={analyseVideo}
                  poster={analyseImg}
                  alt="Vertragsanalyse Demo"
                />
              </div>
            </div>
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
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎯</span>
                <span className={styles.featureListContent}><strong>Automatische Risikobewertung:</strong> Jede Klausel wird auf Fairness und mögliche Nachteile geprüft</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📊</span>
                <span className={styles.featureListContent}><strong>Verständliche Scores:</strong> Chancen-Risiken-Bewertung mit Ampelsystem für schnelle Entscheidungen</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>💡</span>
                <span className={styles.featureListContent}><strong>Konkrete Handlungsempfehlungen:</strong> Was Sie tun können, um Ihre Position zu verbessern</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚡</span>
                <span className={styles.featureListContent}><strong>In Sekunden fertig:</strong> Upload, Analyse, Ergebnis – alles in unter einer Minute</span>
              </li>
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
            <div className={styles.useCaseGrid}>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Überlange Kündigungsfristen</h3>
                <p className={styles.useCaseChallenge}><strong>Risiko:</strong> 12 Monate Kündigungsfrist als Mieter</p>
                <p className={styles.useCaseSolution}>→ "Ungewöhnlich lang – schränkt Ihre Flexibilität stark ein."</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Versteckte Kostenfallen</h3>
                <p className={styles.useCaseChallenge}><strong>Risiko:</strong> "Zusätzliche Gebühren nach Ermessen"</p>
                <p className={styles.useCaseSolution}>→ "Gefahr unbegrenzter Zusatzkosten – verlangen Sie Obergrenze."</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Einseitige Haftungsklauseln</h3>
                <p className={styles.useCaseChallenge}><strong>Risiko:</strong> "Vollständige Haftung beim Auftragnehmer"</p>
                <p className={styles.useCaseSolution}>→ "Extrem einseitig – fordern Sie Haftungsbegrenzung."</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Unklare Leistungsbeschreibung</h3>
                <p className={styles.useCaseChallenge}><strong>Risiko:</strong> Vage definierte Arbeitszeiten</p>
                <p className={styles.useCaseSolution}>→ "Streitpotential hoch – konkretisieren Sie die Leistung."</p>
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
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎯</span>
                <span className={styles.featureListContent}><strong>Objektive Bewertung</strong> ohne kommerzielle Interessen – nur die Fakten für Sie</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🇪🇺</span>
                <span className={styles.featureListContent}><strong>Server in Deutschland (Frankfurt)</strong>, volle DSGVO-Konformität und EU-Datenschutz</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📋</span>
                <span className={styles.featureListContent}><strong>Verständliche Ergebnisse:</strong> Ampelsystem und klare Sprache statt Juristendeutsch</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>👤</span>
                <span className={styles.featureListContent}><strong>Für jeden geeignet:</strong> Ob Laie oder Profi – die Analyse passt sich Ihrem Niveau an</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚡</span>
                <span className={styles.featureListContent}><strong>Sofort verfügbar:</strong> Keine Termine, keine Wartezeiten – Analyse in unter 60 Sekunden</span>
              </li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Sicherheit & Datenschutz</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
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
          <section className={styles.funktionSection} aria-labelledby="faq-heading">
            <h2 id="faq-heading" className={styles.sectionTitle}>Häufige Fragen</h2>
            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ersetzt die Analyse eine Rechtsberatung?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Nein, Contract AI liefert strukturierte Risikoanalysen und Bewertungen. Für komplexe rechtliche Fragen sollten Sie weiterhin einen Anwalt konsultieren.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Vertragsarten können analysiert werden?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Die meisten Standardverträge: Arbeitsverträge, Mietverträge, Kaufverträge, NDAs, Freelancer-Agreements, SaaS-Verträge, Dienstleistungsverträge und mehr.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau ist die KI-Analyse?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Die KI erreicht eine Erkennungsgenauigkeit von 98% bei der Identifikation problematischer Klauseln. Sie basiert auf tausenden analysierten Verträgen und aktueller Rechtsprechung.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Werden meine Vertragsdaten gespeichert?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Optional zur Verlaufsanzeige. Sie können Dokumente jederzeit löschen lassen. Verarbeitung erfolgt ausschließlich zur Analyse, keine Weitergabe an Dritte.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet die Vertragsanalyse?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Im Free-Tier: 3 Analysen kostenlos. Business (19€/Monat): 25 Analysen. Enterprise (29€/Monat): Unbegrenzte Analysen und alle Features.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie schnell erhalte ich das Ergebnis?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>In der Regel unter 60 Sekunden nach dem Upload. Bei sehr umfangreichen Verträgen kann es bis zu 2 Minuten dauern.</p>
              </details>
            </div>
          </section>

          {/* RELATED FEATURES */}
          <section className={styles.relatedSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Verwandte Funktionen</h2>
              <div className={styles.relatedGrid}>
                <Link to="/features/optimierung" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>✨</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Vertragsoptimierung</div>
                    <div className={styles.relatedDescription}>Nach der Analyse: KI-Vorschläge zur Verbesserung problematischer Klauseln</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
                <Link to="/features/legal-lens" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>🔍</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Legal Lens</div>
                    <div className={styles.relatedDescription}>Klauseln anklicken und sofort verstehen – interaktive Vertragsansicht</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
                <Link to="/features/legalpulse" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>⚖️</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Legal Pulse</div>
                    <div className={styles.relatedDescription}>Automatische Überwachung auf Gesetzesänderungen die Ihre Verträge betreffen</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Versteckte Risiken aufdecken, bevor sie teuer werden</h2>
              <p className={styles.ctaSubtitle}>
                Über 87% unserer Nutzer finden kritische Klauseln, die sie übersehen hätten. Analysieren Sie Ihren Vertrag – in 60 Sekunden
              </p>
              <div className={styles.ctaButtons}>
                <button
                  className={styles.secondaryButtonLight}
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
      </div>

      <Footer />
    </>
  );
};

export default Vertragsanalyse;
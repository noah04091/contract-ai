import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import AutoPlayVideo from "../../components/AutoPlayVideo";
import { Wrench, Target, CheckCircle, AlertTriangle, FileText, Shield, Zap, ArrowRight, Play } from "lucide-react";

// Video
const optimierungVideo = "/Videos/optimierung.mp4";
import optimierungImg from "../../assets/Optimierung.webp";

const Optimierung: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/optimizer";
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
        "name": "Wie funktioniert die Vertragsoptimierung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die KI analysiert Ihren Vertrag, erkennt einseitige oder problematische Klauseln und schlägt ausgewogenere, fairere Formulierungen vor. Sie erhalten konkrete Textvorschläge und Begründungen für jede Änderung."
        }
      },
      {
        "@type": "Question", 
        "name": "Werden meine ursprünglichen Interessen berücksichtigt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, die KI optimiert in beide Richtungen - sowohl zugunsten Ihrer Position als auch für ausgewogenere, verhandlungsfähige Kompromisse. Sie wählen aus verschiedenen Varianten die passende aus."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich die Vorschläge direkt verwenden?", 
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Alle Vorschläge sind sofort verhandlungsfertig formuliert. Sie können sie 1:1 übernehmen, als Basis für weitere Anpassungen nutzen oder verschiedene Varianten kombinieren."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertragsoptimierung mit KI - Schwache Klauseln automatisch verbessern | Contract AI</title>
        <meta name="description" content="🔧 KI findet problematische Klauseln und schlägt sofort bessere Formulierungen vor → Faire Verträge, verhandlungsfertig. DSGVO-konform. Jetzt kostenlos testen!" />
        <meta name="keywords" content="Vertragsoptimierung, KI, Vertrag verbessern, Klauseln ändern, Contract AI, LegalTech, Vertragsverhandlung" />
        
        <link rel="canonical" href="https://www.contract-ai.de/features/optimierer" />
        <meta name="robots" content="index,follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Vertragsoptimierung mit KI - Schwache Klauseln automatisch verbessern" />
        <meta property="og:description" content="🔧 KI findet problematische Klauseln und schlägt sofort bessere Formulierungen vor → Faire Verträge, verhandlungsfertig. Jetzt kostenlos testen!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/optimierung" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-optimierung.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertragsoptimierung mit KI - Schwache Klauseln automatisch verbessern" />
        <meta name="twitter:description" content="KI findet problematische Klauseln und schlägt sofort bessere Formulierungen vor. Faire Verträge, verhandlungsfertig." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-optimierung.png" />

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
          <Wrench className={styles.floatingIcon} size={28} />
          <Shield className={styles.floatingIcon} size={24} />
          <FileText className={styles.floatingIcon} size={22} />
          <CheckCircle className={styles.floatingIcon} size={26} />
          <Target className={styles.floatingIcon} size={20} />
          <AlertTriangle className={styles.floatingIcon} size={24} />
          <Zap className={styles.floatingIcon} size={22} />
          <Wrench className={styles.floatingIcon} size={20} />
        </div>

        <div className={styles.featureContainer}>

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <Wrench size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Schwache Klauseln stark machen – <span className={styles.heroTitleHighlight}>automatisch</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Unsere KI findet einseitige, unklare oder riskante Passagen und schlägt sofort bessere, faire Formulierungen vor – verhandlungsbereit.
          </p>
          <div className={styles.heroButtons}>
            <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Schwache Klauseln jetzt verbessern">
              🔧 Schwache Klauseln jetzt verbessern
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie der Optimierer funktioniert">
              Wie der Optimierer funktioniert
            </a>
          </div>
          
          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <Zap size={16} className={styles.trustBadgeIcon} />
              <span>Sofortige Verbesserungen</span>
            </div>
            <div className={styles.trustBadge}>
              <Target size={16} className={styles.trustBadgeIcon} />
              <span>Verhandlungsfertig</span>
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
            <h2 className={styles.sectionTitle}>Der Optimierer in Aktion</h2>
            <div className={styles.videoFrame}>
              <div className={styles.videoWrapper}>
                <AutoPlayVideo
                  src={optimierungVideo}
                  poster={optimierungImg}
                  alt="Vertragsoptimierung Demo"
                />
              </div>
            </div>
          </div>
        </section>

        <div className={styles.contentContainer}>

          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Vertragsoptimierung so wichtig ist</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <AlertTriangle size={20} />
                </div>
                <p className={styles.funktionText}>
                  Viele Verträge sind zugunsten einer Seite formuliert: Haftung wird verschoben, Pflichten sind ungleich verteilt, Fristen überlang. Das fällt meist erst auf, wenn es teuer wird. Als Freelancer zahlen Sie monatelang drauf, als Mieter bleiben Sie in unflexiblen Bindungen gefangen, als Unternehmer tragen Sie unnötige Risiken.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Target size={20} />
                </div>
                <p className={styles.funktionText}>
                  Der KI-Optimierer zeigt solche Schieflagen und liefert Ihnen sofort handfeste Alternativen – in klarer Sprache. Keine theoretischen Ratschläge, sondern konkret formulierte Verbesserungen, die Sie direkt übernehmen oder als Basis für Verhandlungen nutzen können. So bekommen Sie faire, ausgewogene Verträge.
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: KI-gestützte Optimierung mit konkreten Vorschlägen</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Contract AI analysiert Ihren Vertrag systematisch auf Schwachstellen und generiert sofort bessere Formulierungen. Die KI berücksichtigt den Zweck des Vertrags, die Branchenpraxis und die Interessen beider Seiten, um ausgewogene Lösungen vorzuschlagen – nicht einfach nur "pro Contra-Seite".
            </p>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📝</span>
                <span className={styles.featureListContent}><strong>Automatische Klausel-Optimierung:</strong> Jede riskante Klausel erhält eine konkret formulierte Verbesserung – inklusive Begründung</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔍</span>
                <span className={styles.featureListContent}><strong>Verständliche Sprache:</strong> Schluss mit Juristendeutsch – die Vorschläge sind laienverständlich und gleichzeitig präzise</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚖️</span>
                <span className={styles.featureListContent}><strong>Kontext & Fairness:</strong> Berücksichtigt Branchenpraxis und Interessensausgleich für ausgewogene Formulierungen</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>✅</span>
                <span className={styles.featureListContent}><strong>Direkt einsatzbereit:</strong> Änderungen sind so strukturiert, dass Sie sie Abschnitt für Abschnitt übernehmen können</span>
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
                  <strong>Vertrag hochladen:</strong> PDF oder DOCX Ihres bestehenden Vertrags hochladen – verschlüsselt und sicher auf EU-Servern verarbeitet.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>KI-Analyse & Optimierung:</strong> Intelligente Erkennung problematischer Klauseln, Bewertung der Fairness und Generierung verbesserter Formulierungen.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Optimierungsvorschläge erhalten:</strong> Klare Empfehlungen mit Änderungsmarkierungen, Begründungen und verhandlungsfertigen Texten.
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
                  <h3 className={styles.vorteilTitle}>Schwachstellen-Scanner</h3>
                  <p className={styles.vorteilText}>Erkennt einseitige Klauseln, unklare Formulierungen und versteckte Risiken automatisch.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Konkrete Alternativtexte</h3>
                  <p className={styles.vorteilText}>Liefert sofort verwendbare, bessere Formulierungen statt nur theoretischer Hinweise.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Fairness-Check</h3>
                  <p className={styles.vorteilText}>Bewertet Ausgewogenheit und schlägt faire Kompromisse für beide Seiten vor.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Klartext-Übersetzung</h3>
                  <p className={styles.vorteilText}>Verwandelt kompliziertes Juristendeutsch in verständliche, präzise Sprache.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Änderungsprotokoll</h3>
                  <p className={styles.vorteilText}>Dokumentiert alle Optimierungen mit Begründung für transparente Nachverfolgung.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Export-Funktionen</h3>
                  <p className={styles.vorteilText}>Optimierte Verträge als PDF oder DOCX exportieren und direkt verwenden.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>Typische Schwachstellen – und bessere Vorschläge</h2>
            <div className={styles.useCaseGrid}>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Haftungsklausel</h3>
                <p className={styles.useCaseChallenge}><strong>Original:</strong> "Haftung liegt vollständig beim Auftragnehmer"</p>
                <p className={styles.useCaseSolution}><strong>Empfehlung:</strong> Haftungsgrenzen je Schadensart + beidseitige Pflicht zur Schadensminderung.</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Zahlungskonditionen</h3>
                <p className={styles.useCaseChallenge}><strong>Original:</strong> "Zahlungsziel 60 Tage"</p>
                <p className={styles.useCaseSolution}><strong>Empfehlung:</strong> 14 Tage, Skonto bei schneller Zahlung, Verzugszinsen geregelt.</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Leistungsbeschreibung</h3>
                <p className={styles.useCaseChallenge}><strong>Original:</strong> "Unklare Leistungsbeschreibung"</p>
                <p className={styles.useCaseSolution}><strong>Empfehlung:</strong> Messbare Kriterien, Abnahmeprozess, Änderungsmanagement.</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Vertraulichkeit</h3>
                <p className={styles.useCaseChallenge}><strong>Original:</strong> "Allgemeine NDA-Klausel"</p>
                <p className={styles.useCaseSolution}><strong>Empfehlung:</strong> Präzise Definitionen, Laufzeit, Ausnahmen, Vertragsstrafen.</p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <CheckCircle size={32} />
              </div>
              <p className={styles.beispielText}>
                "Der Optimierer spart uns pro Vertrag 1–2 Verhandlungsrunden. Endlich objektive, faire Formulierungen."
              </p>
              <p className={styles.beispielHinweis}>
                Typisches Feedback unserer Business-Nutzer
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Contract AI?</h2>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎯</span>
                <span className={styles.featureListContent}><strong>Echte Individualoptimierung</strong> statt starrer Textbausteine – jeder Vertrag wird kontextspezifisch verbessert</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🇪🇺</span>
                <span className={styles.featureListContent}><strong>Server in Deutschland (Frankfurt)</strong>, volle DSGVO-Konformität und EU-Datenschutz</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📋</span>
                <span className={styles.featureListContent}><strong>Transparente Optimierungen:</strong> Jede Änderung wird begründet und ist nachvollziehbar dokumentiert</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>👤</span>
                <span className={styles.featureListContent}><strong>Für Laien verständlich, für Profis präzise</strong> – sowohl Klartext als auch rechtssichere Formulierungen</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚡</span>
                <span className={styles.featureListContent}><strong>Sofort einsatzbereit:</strong> Optimierungen sind so formuliert, dass Sie sie direkt verwenden können</span>
              </li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Sicherheit & Datenschutz</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Ihre Verträge bleiben Ihre Daten. Verschlüsselung bei Übertragung und Speicherung, Verarbeitung ausschließlich auf EU-Servern in Frankfurt. 
                Löschung auf Wunsch jederzeit möglich. Keine Weitergabe an Dritte, nur zweckgebundene KI-Analyse zur Optimierung.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>87%</div>
                  <div className={styles.statLabel}>Fairere Vertragsklauseln</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>3.5x</div>
                  <div className={styles.statLabel}>Schneller als manuell</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>24/7</div>
                  <div className={styles.statLabel}>Jederzeit verfügbar</div>
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
                  Ersetzt die Optimierung eine Rechtsberatung?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Nein, Contract AI liefert strukturierte Optimierungsvorschläge und Formulierungsalternativen. Für komplexe rechtliche Fragen sollten Sie weiterhin einen Anwalt konsultieren.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Vertragsarten können optimiert werden?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Die meisten Standardverträge: Arbeitsverträge, Dienstleistungsverträge, Mietverträge, NDAs, Lizenzverträge, Kaufverträge. Sehr spezifische Branchen-Verträge können eingeschränkt funktionieren.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau sind die Optimierungsvorschläge?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Die KI arbeitet mit bewährten Rechtsmustern und Branchenstandards. Rund 90% der Vorschläge sind direkt umsetzbar, bei speziellen Fällen empfehlen wir zusätzliche Prüfung.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Werden meine Vertragsdaten gespeichert?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Optional zur Verlaufsanzeige. Sie können Dokumente jederzeit löschen lassen. Verarbeitung erfolgt ausschließlich zur Optimierung, keine Weitergabe an Dritte.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet die Vertragsoptimierung?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Der KI-Optimizer ist ab Business (19€/Monat) mit 15 Optimierungen verfügbar. Enterprise (29€/Monat): Unbegrenzte Optimierungen.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich die Optimierungen direkt übernehmen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, alle Vorschläge sind so formuliert, dass Sie sie Abschnitt für Abschnitt in Ihren Vertrag übernehmen können. Mit Änderungsmarkierungen und Export-Funktion.</p>
              </details>
            </div>
          </section>

          {/* RELATED FEATURES */}
          <section className={styles.relatedSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Verwandte Funktionen</h2>
              <div className={styles.relatedGrid}>
                <Link to="/features/vertragsanalyse" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>🔍</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Vertragsanalyse</div>
                    <div className={styles.relatedDescription}>Erst analysieren, dann optimieren: Risiken und Schwachstellen erkennen</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
                <Link to="/features/vergleich" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>📊</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Vertragsvergleich</div>
                    <div className={styles.relatedDescription}>Zwei Versionen vergleichen und die bessere Variante finden</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
                <Link to="/features/generator" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>📝</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Vertragsgenerator</div>
                    <div className={styles.relatedDescription}>Komplett neue Verträge mit optimierten Klauseln erstellen</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Stärkere Position, weniger Risiko</h2>
              <p className={styles.ctaSubtitle}>
                Verwandeln Sie schwache Klauseln in starke Formulierungen – mit konkreten Vorschlägen und Begründungen
              </p>
              <div className={styles.ctaButtons}>
                <button
                  className={styles.secondaryButtonLight}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  So funktioniert der Optimierer
                </button>
                <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Vertrag kostenlos optimieren">
                  🚀 Vertrag kostenlos optimieren
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

export default Optimierung;
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { Eye, MousePointer, MessageCircle, AlertTriangle, Scale, Lightbulb, CheckCircle, Shield, FileText, ArrowRight } from "lucide-react";

const LegalLens: React.FC = () => {
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
        "name": "Was ist Legal Lens?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Legal Lens ist eine interaktive Vertragsansicht, bei der Sie auf jede Klausel klicken können, um sofort eine verständliche Erklärung, Risikobewertung und Verhandlungstipps zu erhalten. Komplexe Verträge werden so leicht verständlich."
        }
      },
      {
        "@type": "Question",
        "name": "Wie funktioniert die Klausel-Erklärung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Klicken Sie einfach auf eine Klausel im Vertrag. Die KI analysiert den Text sofort und zeigt: Was bedeutet das? Ist es fair? Welche Risiken gibt es? Wie können Sie verhandeln? Alles in verständlicher Sprache."
        }
      },
      {
        "@type": "Question",
        "name": "Für wen ist Legal Lens geeignet?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Legal Lens ist für jeden geeignet, der Verträge verstehen möchte - Privatpersonen, Freiberufler, Unternehmer. Keine juristischen Vorkenntnisse nötig. Die KI erklärt alles in einfacher Sprache."
        }
      },
      {
        "@type": "Question",
        "name": "Muss ich den Vertrag vorher analysieren lassen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Legal Lens funktioniert mit allen bereits hochgeladenen Verträgen. Die Klausel-Analyse erfolgt on-demand beim Klick."
        }
      },
      {
        "@type": "Question",
        "name": "Ersetzt Legal Lens eine anwaltliche Beratung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Legal Lens hilft beim Verstehen, ersetzt aber keine Rechtsberatung. Bei kritischen Verträgen empfehlen wir zusätzlich einen Anwalt."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Vertragstypen werden unterstützt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Alle deutschen Vertragstypen: Arbeitsverträge, Mietverträge, Kaufverträge, NDAs, Dienstleistungsverträge, AGB und mehr."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Legal Lens - Vertragsklauseln verstehen mit einem Klick | Contract AI</title>
        <meta name="description" content="Klicken Sie auf jede Klausel und verstehen Sie sofort, was sie bedeutet. Risikobewertung, Erklärungen, Verhandlungstipps. Komplexe Verträge einfach erklärt!" />
        <meta name="keywords" content="Vertragsklauseln, Klauseln verstehen, Legal Lens, Risikobewertung, Verhandlungstipps, Vertragsanalyse, interaktiv" />

        <link rel="canonical" href="https://www.contract-ai.de/features/legal-lens" />
        <meta name="robots" content="index,follow" />

        {/* Open Graph */}
        <meta property="og:title" content="Legal Lens - Vertragsklauseln verstehen mit einem Klick" />
        <meta property="og:description" content="Klicken Sie auf jede Klausel und verstehen Sie sofort, was sie bedeutet. Risikobewertung, Erklärungen, Verhandlungstipps." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/legal-lens" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-legal-lens.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Legal Lens - Vertragsklauseln verstehen mit einem Klick" />
        <meta name="twitter:description" content="Klicken Sie auf jede Klausel und verstehen Sie sofort, was sie bedeutet. Risikobewertung, Erklärungen, Verhandlungstipps." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-legal-lens.png" />

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
          <Eye className={styles.floatingIcon} size={28} />
          <MousePointer className={styles.floatingIcon} size={24} />
          <MessageCircle className={styles.floatingIcon} size={22} />
          <AlertTriangle className={styles.floatingIcon} size={26} />
          <Scale className={styles.floatingIcon} size={20} />
          <Lightbulb className={styles.floatingIcon} size={24} />
          <CheckCircle className={styles.floatingIcon} size={22} />
          <FileText className={styles.floatingIcon} size={26} />
        </div>

        <div className={styles.featureContainer}>

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <Eye size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Verträge verstehen mit einem <span className={styles.heroTitleHighlight}>Klick</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Legal Lens macht jeden Vertrag interaktiv. Klicken Sie auf eine Klausel und erfahren Sie sofort: Was bedeutet das? Ist es fair? Wie verhandeln Sie besser?
          </p>
          <div className={styles.heroButtons}>
            <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Legal Lens ausprobieren">
              Legal Lens ausprobieren
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="So funktioniert Legal Lens">
              So funktioniert es
            </a>
          </div>

          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <MousePointer size={16} className={styles.trustBadgeIcon} />
              <span>Klick-Erklärung</span>
            </div>
            <div className={styles.trustBadge}>
              <Scale size={16} className={styles.trustBadgeIcon} />
              <span>Fairness-Check</span>
            </div>
            <div className={styles.trustBadge}>
              <Shield size={16} className={styles.trustBadgeIcon} />
              <span>Risiko-Analyse</span>
            </div>
          </div>
        </section>
        <div className={styles.contentContainer}>

          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Das Problem: Verträge sind unverständlich</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <AlertTriangle size={20} />
                </div>
                <p className={styles.funktionText}>
                  Juristische Sprache ist absichtlich komplex. Wichtige Klauseln verstecken sich in langen Absätzen. Selbst wenn Sie alles lesen, verstehen Sie oft nicht die Konsequenzen. "Salvatorische Klausel", "Haftungsfreistellung", "Gerichtsstandsvereinbarung" – was bedeutet das konkret für Sie?
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Eye size={20} />
                </div>
                <p className={styles.funktionText}>
                  Legal Lens verwandelt jeden Vertrag in ein interaktives Dokument. Klicken Sie auf eine beliebige Stelle und die KI erklärt sofort: Was steht da wirklich? Ist es fair oder einseitig? Welche Risiken gibt es? Und was können Sie tun, um Ihre Position zu verbessern?
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: Interaktive Vertragsanalyse</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Legal Lens zeigt Ihren Vertrag mit farbigen Markierungen: Grün für faire Klauseln, Gelb für Vorsicht, Rot für kritische Punkte. Klicken Sie auf eine Stelle und erhalten Sie sofort eine verständliche Erklärung – wie ein Anwalt, der neben Ihnen sitzt.
            </p>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🖱️</span>
                <span className={styles.featureListContent}><strong>Klick-Erklärung:</strong> Tippen Sie auf jede Klausel für sofortige Erläuterung in einfacher Sprache</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎨</span>
                <span className={styles.featureListContent}><strong>Farbcodierung:</strong> Ampelsystem zeigt auf einen Blick, wo Risiken lauern</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚖️</span>
                <span className={styles.featureListContent}><strong>Fairness-Bewertung:</strong> Ist die Klausel ausgewogen oder einseitig?</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>💡</span>
                <span className={styles.featureListContent}><strong>Verhandlungstipps:</strong> Konkrete Vorschläge, wie Sie die Klausel verbessern können</span>
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
                  <strong>Vertrag öffnen:</strong> Laden Sie Ihren Vertrag hoch oder wählen Sie einen bereits analysierten Vertrag aus Ihrer Bibliothek.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Legal Lens aktivieren:</strong> Klicken Sie auf "Legal Lens" und der Vertrag wird mit Farbmarkierungen angezeigt.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Klauseln erkunden:</strong> Klicken Sie auf jede markierte Stelle für Erklärung, Risikobewertung und Verhandlungstipps.
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
                  <h3 className={styles.vorteilTitle}>Klausel-Erklärung</h3>
                  <p className={styles.vorteilText}>Jede Klausel wird in verständlicher Sprache erklärt. Kein Juristendeutsch, sondern klare Aussagen.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Risiko-Bewertung</h3>
                  <p className={styles.vorteilText}>Farbcodierung zeigt sofort: Grün = OK, Gelb = Vorsicht, Rot = Kritisch. Kein Übersehen mehr.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Fairness-Check</h3>
                  <p className={styles.vorteilText}>Ist die Klausel ausgewogen oder bevorzugt sie eine Seite? Sofortige Einschätzung.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Verhandlungstipps</h3>
                  <p className={styles.vorteilText}>Konkrete Formulierungsvorschläge, um kritische Klauseln zu Ihren Gunsten anzupassen.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Kontext-Infos</h3>
                  <p className={styles.vorteilText}>Erfahren Sie, warum eine Klausel problematisch ist und welche Alternativen üblich sind.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Smart Summary</h3>
                  <p className={styles.vorteilText}>Zusammenfassung der wichtigsten Punkte auf einen Blick – perfekt für schnelle Entscheidungen.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>So hilft Legal Lens in der Praxis</h2>
            <div className={styles.useCaseGrid}>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>"Vertragsstrafe bei Verzug"</h3>
                <p className={styles.useCaseChallenge}><strong>Im Vertrag:</strong> "Bei Verzug 5% des Auftragswertes pro Woche"</p>
                <p className={styles.useCaseSolution}>Legal Lens: "Sehr hoch. Üblich sind max. 5% insgesamt. Tipp: Deckelung auf 10% des Gesamtwertes fordern."</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>"Salvatorische Klausel"</h3>
                <p className={styles.useCaseChallenge}><strong>Im Vertrag:</strong> Komplexer Absatz mit Fachbegriffen</p>
                <p className={styles.useCaseSolution}>Legal Lens: "Standard-Klausel. Falls ein Teil ungültig wird, bleibt der Rest gültig. Kein Risiko."</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>"Gerichtsstand Berlin"</h3>
                <p className={styles.useCaseChallenge}><strong>Im Vertrag:</strong> "Ausschließlicher Gerichtsstand ist Berlin"</p>
                <p className={styles.useCaseSolution}>Legal Lens: "Sie müssten bei Streit nach Berlin. Prüfen Sie, ob das praktikabel ist."</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>"Haftungsausschluss"</h3>
                <p className={styles.useCaseChallenge}><strong>Im Vertrag:</strong> "Jegliche Haftung wird ausgeschlossen"</p>
                <p className={styles.useCaseSolution}>Legal Lens: "Kritisch! Vollständiger Haftungsausschluss ist oft unwirksam. Fordern Sie Nachbesserung."</p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <CheckCircle size={32} />
              </div>
              <p className={styles.beispielText}>
                "Legal Lens hat mir bei einem Mietvertrag gezeigt, dass die Renovierungsklausel unwirksam ist. Das hätte ich nie selbst erkannt."
              </p>
              <p className={styles.beispielHinweis}>
                Feedback eines Mieters
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Legal Lens?</h2>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎯</span>
                <span className={styles.featureListContent}><strong>Punktgenau:</strong> Erklärungen genau dort, wo Sie sie brauchen – direkt bei der Klausel</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🗣️</span>
                <span className={styles.featureListContent}><strong>Verständlich:</strong> Juristische Fachbegriffe werden in Alltagssprache übersetzt</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚡</span>
                <span className={styles.featureListContent}><strong>Sofort:</strong> Keine Wartezeit – klicken und verstehen in Sekundenschnelle</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>💪</span>
                <span className={styles.featureListContent}><strong>Handlungsfähig:</strong> Nicht nur verstehen, sondern auch wissen, was zu tun ist</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📱</span>
                <span className={styles.featureListContent}><strong>Überall nutzbar:</strong> Auf Desktop, Tablet oder Smartphone – perfekt für unterwegs</span>
              </li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Vertrauen & Qualität</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Legal Lens basiert auf modernster KI-Technologie, trainiert mit tausenden deutschen Verträgen und aktueller Rechtsprechung.
                Ihre Verträge werden sicher auf EU-Servern verarbeitet.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{'< 2s'}</div>
                  <div className={styles.statLabel}>Antwortzeit pro Klausel</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>50+</div>
                  <div className={styles.statLabel}>Klauseltypen erkannt</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>100%</div>
                  <div className={styles.statLabel}>DSGVO-konform</div>
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
                  Muss ich den Vertrag vorher analysieren lassen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Legal Lens funktioniert mit allen bereits hochgeladenen Verträgen. Die Klausel-Analyse erfolgt on-demand beim Klick.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ersetzt Legal Lens eine anwaltliche Beratung?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Legal Lens hilft beim Verstehen, ersetzt aber keine Rechtsberatung. Bei kritischen Verträgen empfehlen wir zusätzlich einen Anwalt.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Vertragstypen werden unterstützt?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Alle deutschen Vertragstypen: Arbeitsverträge, Mietverträge, Kaufverträge, NDAs, Dienstleistungsverträge, AGB und mehr.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau sind die Erklärungen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Die KI basiert auf tausenden analysierten Verträgen und aktueller Rechtsprechung. Erklärungen sind praxisnah und rechtlich fundiert.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Funktioniert Legal Lens auf dem Smartphone?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, Legal Lens ist vollständig responsive und funktioniert auf allen Geräten – Desktop, Tablet und Smartphone.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet Legal Lens?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Legal Lens ist in allen Premium-Plänen enthalten. Im Free-Tier können Sie es mit eingeschränkten Funktionen testen.</p>
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
                    <div className={styles.relatedDescription}>Komplette Analyse Ihres Vertrags mit Risiko-Score und Handlungsempfehlungen</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
                <Link to="/features/optimierung" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>✨</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Optimierung</div>
                    <div className={styles.relatedDescription}>KI-Vorschläge zur Verbesserung problematischer Klauseln</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
                <Link to="/features/legalpulse" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>📊</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Legal Pulse</div>
                    <div className={styles.relatedDescription}>Marktdaten und Benchmarks zu Vertragsklauseln</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Verstehen Sie jeden Vertrag – Klausel für Klausel</h2>
              <p className={styles.ctaSubtitle}>
                Nie wieder Verträge unterschreiben, die Sie nicht verstehen. Legal Lens macht juristische Sprache verständlich.
              </p>
              <div className={styles.ctaButtons}>
                <button
                  className={styles.secondaryButtonLight}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  So funktioniert es
                </button>
                <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Legal Lens jetzt testen">
                  Legal Lens jetzt testen
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

export default LegalLens;

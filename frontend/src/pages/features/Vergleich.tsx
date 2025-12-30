import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { GitCompare, Target, BarChart3, AlertTriangle, FileText, Shield, CheckCircle, ArrowRight } from "lucide-react";

const Vergleich: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/compare";
  const target = isAuthenticated ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Vertragsvergleich mit KI - Zwei Verträge intelligent vergleichen | Contract AI</title>
        <meta name="description" content="KI-basierter Vertragsvergleich mit Diff-Ansicht, Fairness-Score und klarer Empfehlung. Welcher Vertrag ist besser? DSGVO-konform. Jetzt testen!" />
        <meta name="keywords" content="Vertragsvergleich, Verträge vergleichen, KI, Diff-Ansicht, Fairness-Score, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/vergleich" />
        <meta name="robots" content="index,follow" />

        {/* Open Graph */}
        <meta property="og:title" content="Vertragsvergleich mit KI - Zwei Verträge intelligent vergleichen" />
        <meta property="og:description" content="KI-basierter Vertragsvergleich mit Diff-Ansicht, Fairness-Score und klarer Empfehlung." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/vergleich" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vergleich.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertragsvergleich mit KI - Zwei Verträge intelligent vergleichen" />
        <meta name="twitter:description" content="KI-basierter Vertragsvergleich mit Diff-Ansicht, Fairness-Score und klarer Empfehlung." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-vergleich.png" />
      </Helmet>

      <div className={styles.pageBackground}>
        {/* Dots Pattern */}
        <div className={styles.dotsPattern} />

        {/* Floating Decorative Elements */}
        <div className={styles.floatingElements}>
          <GitCompare className={styles.floatingIcon} size={28} />
          <Shield className={styles.floatingIcon} size={24} />
          <FileText className={styles.floatingIcon} size={22} />
          <CheckCircle className={styles.floatingIcon} size={26} />
          <Target className={styles.floatingIcon} size={20} />
          <BarChart3 className={styles.floatingIcon} size={24} />
          <AlertTriangle className={styles.floatingIcon} size={22} />
          <GitCompare className={styles.floatingIcon} size={20} />
        </div>

        <div className={styles.featureContainer}>

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <GitCompare size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Welcher Vertrag ist besser? <span className={styles.heroTitleHighlight}>Die KI zeigt es Ihnen</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Lassen Sie zwei Verträge gegeneinander antreten. Wir visualisieren die Unterschiede, bewerten Fairness & Risiko und geben eine klare Empfehlung.
          </p>
          <div className={styles.heroButtons}>
            <Link to={target} className={styles.ctaButton} aria-label="Verträge vergleichen">
              Verträge vergleichen
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie der Vergleich arbeitet">
              Wie der Vergleich arbeitet
            </a>
          </div>
          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <BarChart3 size={16} className={styles.trustBadgeIcon} />
              <span>Diff-Ansicht</span>
            </div>
            <div className={styles.trustBadge}>
              <Target size={16} className={styles.trustBadgeIcon} />
              <span>Fairness-Score</span>
            </div>
            <div className={styles.trustBadge}>
              <CheckCircle size={16} className={styles.trustBadgeIcon} />
              <span>Empfehlung</span>
            </div>
          </div>
        </section>

        <div className={styles.contentContainer}>
          
          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Kleine Unterschiede, große Wirkung</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <AlertTriangle size={20} />
                </div>
                <p className={styles.funktionText}>
                  Zwei Dokumente wirken ähnlich – aber Abweichungen bei Kündigungsfristen, Haftung, Kosten oder Leistungsumfang haben spürbare Folgen. Als Mieter zahlen Sie womöglich 200€ mehr Nebenkosten pro Jahr, als Freelancer warten Sie 30 Tage länger auf Ihr Geld, als Unternehmer tragen Sie unnötige Haftungsrisiken.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Target size={20} />
                </div>
                <p className={styles.funktionText}>
                  Der Vergleich macht Unterschiede transparent und hilft, sicher zu entscheiden. Keine stundenlangen Tabellen-Kämpfe, kein Raten bei komplizierten Klauseln – die KI analysiert beide Verträge systematisch und gibt eine nachvollziehbare Empfehlung basierend auf Ihren Prioritäten.
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: Intelligenter Vertragsvergleich mit visueller Diff-Ansicht</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Contract AI stellt beide Verträge nebeneinander dar und markiert automatisch alle relevanten Unterschiede. Die KI bewertet nicht nur die offensichtlichen Abweichungen, sondern analysiert auch die Auswirkungen auf Fairness, Risiko und Kosten – über mehrere Dimensionen hinweg.
            </p>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📊</span>
                <span className={styles.featureListContent}><strong>Visualisierte Unterschiede:</strong> Abschnitte werden nebeneinander dargestellt und Abweichungen hervorgehoben</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚖️</span>
                <span className={styles.featureListContent}><strong>Fairness-Score:</strong> KI bewertet, wie ausgewogen die Verträge sind – über Kündigung, Zahlung, Haftung, Klarheit</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎯</span>
                <span className={styles.featureListContent}><strong>Präferenz-basierte Empfehlung:</strong> Basierend auf Ihren Prioritäten (Flexibilität vs. Preis) mit Begründung</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔧</span>
                <span className={styles.featureListContent}><strong>What-if-Analyse:</strong> Ändern Sie Parameter um zu sehen, wie sich die Bewertung verschiebt</span>
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
                  <strong>Beide Verträge hochladen:</strong> PDF oder DOCX der beiden Alternativen hochladen – sicher verschlüsselt auf EU-Servern verarbeitet.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>KI-Vergleich & Bewertung:</strong> Intelligente Analyse aller Unterschiede, Fairness-Bewertung und Risiko-Assessment für beide Optionen.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Empfehlung mit Begründung:</strong> Klare Visualisierung der Unterschiede plus konkrete Handlungsempfehlung basierend auf Ihren Präferenzen.
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
                  <h3 className={styles.vorteilTitle}>Side-by-Side Diff-View</h3>
                  <p className={styles.vorteilText}>Beide Verträge nebeneinander mit farblicher Markierung aller Unterschiede – sofort erkennbar.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Multi-Dimensionaler Score</h3>
                  <p className={styles.vorteilText}>Bewertung über Fairness, Flexibilität, Kostenklarheit, Risiko und Verständlichkeit.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Smarte Empfehlungslogik</h3>
                  <p className={styles.vorteilText}>KI berücksichtigt Ihre Präferenzen und gibt eine begründete, nachvollziehbare Empfehlung.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Kosten-Nutzen-Analyse</h3>
                  <p className={styles.vorteilText}>Quantifiziert finanzielle Auswirkungen der Unterschiede auf Basis der Vertragslaufzeit.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Verhandlungs-Insights</h3>
                  <p className={styles.vorteilText}>Zeigt auf, welche Klauseln aus dem besseren Vertrag übernommen werden sollten.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Export & Dokumentation</h3>
                  <p className={styles.vorteilText}>Vergleichsergebnis als PDF exportieren und für Entscheidungsprozesse teilen.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>Typische Entscheidungen</h2>
            <div className={styles.useCaseGrid}>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Mietvertrag A vs. B</h3>
                <p className={styles.useCaseChallenge}>B hat niedrigere Nebenkosten und kürzere Fristen</p>
                <p className={styles.useCaseSolution}><strong>→ Empfehlung: B</strong></p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Jobangebot</h3>
                <p className={styles.useCaseChallenge}>A: 28 Urlaubstage, B: 24 + Remote-Option</p>
                <p className={styles.useCaseSolution}><strong>→ Abhängig von Präferenzprofil</strong></p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Lieferantenvertrag</h3>
                <p className={styles.useCaseChallenge}>A: bessere Preise, B: bessere SLA</p>
                <p className={styles.useCaseSolution}><strong>→ A + SLA-Klausel aus B übernehmen</strong></p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>SaaS-Angebote</h3>
                <p className={styles.useCaseChallenge}>A: günstiger, B: flexible Kündigung</p>
                <p className={styles.useCaseSolution}><strong>→ B bei hoher Planungsunsicherheit</strong></p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <BarChart3 size={32} />
              </div>
              <p className={styles.beispielText}>
                "Der Vergleich hat uns 3 Stunden Recherche gespart und eine objektive Basis für die Entscheidung gegeben. Genau das, was wir brauchten."
              </p>
              <p className={styles.beispielHinweis}>
                Feedback einer Geschäftsführerin beim Anbietervergleich
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Contract AI?</h2>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔍</span>
                <span className={styles.featureListContent}><strong>Detailgenaue Diff-Ansicht</strong> statt oberflächlicher Checklisten – jede relevante Abweichung wird erfasst</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🇪🇺</span>
                <span className={styles.featureListContent}><strong>Server in Deutschland (Frankfurt)</strong>, volle DSGVO-Konformität und EU-Datenschutz</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎯</span>
                <span className={styles.featureListContent}><strong>Präferenz-basierte Bewertung:</strong> Empfehlungen passend zu Ihren individuellen Prioritäten</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📊</span>
                <span className={styles.featureListContent}><strong>Multi-Dimensionaler Score</strong> – nicht nur Preis, sondern Fairness, Flexibilität, Risiko und Klarheit</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>💡</span>
                <span className={styles.featureListContent}><strong>Verhandlungsoptimierte Insights:</strong> Zeigt konkret, welche Klauseln übernommen werden sollten</span>
              </li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Sicherheit & Datenschutz</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Ihre Verträge werden verschlüsselt übertragen und ausschließlich auf EU-Servern in Frankfurt verarbeitet. 
                Vergleichsanalyse erfolgt datenschutzkonform, keine Weitergabe an Dritte. Löschung jederzeit auf Wunsch möglich.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>2-3 Min</div>
                  <div className={styles.statLabel}>Vergleichsdauer</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>95%</div>
                  <div className={styles.statLabel}>Bewertungsgenauigkeit</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>50+</div>
                  <div className={styles.statLabel}>Vergleichskriterien</div>
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
                  Welche Vertragsarten kann ich vergleichen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Alle Standardverträge: Mietverträge, Arbeitsverträge, Dienstleistungsverträge, Kaufverträge, Versicherungen, SaaS-Abos. Beide Verträge sollten ähnlichen Zweck haben für optimale Ergebnisse.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie objektiv ist die KI-Bewertung?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Die KI nutzt bewährte Rechtsmuster und Marktstandards als Basis. Sie ist objektiver als das Bauchgefühl, aber Sie definieren die Gewichtung der Kriterien (Preis vs. Flexibilität).</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich die Bewertungskriterien anpassen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, Sie können Prioritäten setzen: Ist Ihnen Kostenklarheit wichtiger als Flexibilität? Kurze Fristen wichtiger als niedrige Preise? Die Empfehlung passt sich entsprechend an.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Werden beide Verträge gleich behandelt?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, die Analyse ist symmetrisch. Beide Verträge werden nach denselben Kriterien bewertet. Es gibt keine Bevorzugung für "Vertrag A" oder "Vertrag B".</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich das Ergebnis exportieren?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, der komplette Vergleichsreport kann als PDF exportiert werden – inklusive Diff-View, Scores, Empfehlung und Begründung. Ideal für Team-Entscheidungen.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was passiert mit meinen Vertragsdaten?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Verschlüsselte Übertragung und Verarbeitung ausschließlich auf EU-Servern. Speicherung nur für Verlaufsanzeige, jederzeit löschbar. Keine Weitergabe an Dritte.</p>
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
                    <div className={styles.relatedTitle}>Optimierung</div>
                    <div className={styles.relatedDescription}>KI-Vorschläge zur Verbesserung Ihrer Vertragsklauseln</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
                <Link to="/features/vertragsanalyse" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>🔍</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Vertragsanalyse</div>
                    <div className={styles.relatedDescription}>Komplette Analyse mit Risiko-Score und Handlungsempfehlungen</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
                <Link to="/features/legal-lens" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>👁️</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Legal Lens</div>
                    <div className={styles.relatedDescription}>Klauseln anklicken und sofort verstehen</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Entscheiden Sie mit Klarheit statt Bauchgefühl</h2>
              <p className={styles.ctaSubtitle}>
                Objektive Analyse, visualisierte Unterschiede und eine klare Empfehlung – damit Sie die richtige Wahl treffen.
              </p>
              <div className={styles.ctaButtons}>
                <button
                  className={styles.secondaryButtonLight}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Wie der Vergleich arbeitet
                </button>
                <Link to={target} className={styles.ctaButton} aria-label="Verträge vergleichen">
                  Verträge vergleichen
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

export default Vergleich;
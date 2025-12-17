import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { GitCompare, Target, BarChart3, AlertTriangle } from "lucide-react";

const Vergleich: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/compare";
  const target = isAuthenticated ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Vertragsvergleich – Contract AI | Verträge verstehen, optimieren, absichern";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'KI-basierter Vertragsvergleich mit Diff-Ansicht, Fairness-Score & klarer Empfehlung. DSGVO-konform, Server in Frankfurt. Jetzt testen.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'KI-basierter Vertragsvergleich mit Diff-Ansicht, Fairness-Score & klarer Empfehlung. DSGVO-konform, Server in Frankfurt. Jetzt testen.';
      document.head.appendChild(meta);
    }

    // Add canonical link
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://www.contract-ai.de/features/vergleich');
    } else {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = 'https://www.contract-ai.de/features/vergleich';
      document.head.appendChild(link);
    }

    // Add robots meta
    const robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'index,follow';
      document.head.appendChild(meta);
    }

    return () => {
      document.title = 'Contract AI';
    };
  }, []);

  return (
    <>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <Link to={target} className={styles.ctaButton} aria-label="Verträge vergleichen">
              Verträge vergleichen
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie der Vergleich arbeitet">
              Wie der Vergleich arbeitet
            </a>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '24px', justifyContent: 'center', fontSize: '14px', color: '#666' }}>
            <span>📊 Diff-Ansicht</span>
            <span>⚖️ Fairness-Score</span>
            <span>✅ Empfehlung</span>
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
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📊 <strong>Visualisierte Unterschiede:</strong> Abschnitte werden nebeneinander dargestellt und Abweichungen hervorgehoben</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>⚖️ <strong>Fairness-Score:</strong> KI bewertet, wie ausgewogen die Verträge sind – über Kündigung, Zahlung, Haftung, Klarheit</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🎯 <strong>Präferenz-basierte Empfehlung:</strong> Basierend auf Ihren Prioritäten (Flexibilität vs. Preis) mit Begründung</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🔧 <strong>What-if-Analyse:</strong> Ändern Sie Parameter um zu sehen, wie sich die Bewertung verschiebt</li>
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
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '40px' }}>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Mietvertrag A vs. B</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>B hat niedrigere Nebenkosten und kürzere Fristen</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ Empfehlung: B</strong></p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Jobangebot</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>A: 28 Urlaubstage, B: 24 + Remote-Option</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ Abhängig von Präferenzprofil</strong></p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Lieferantenvertrag</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>A: bessere Preise, B: bessere SLA</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ A + SLA-Klausel aus B übernehmen</strong></p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>SaaS-Angebote</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>A: günstiger, B: flexible Kündigung</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ B bei hoher Planungsunsicherheit</strong></p>
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
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🔍 <strong>Detailgenaue Diff-Ansicht</strong> statt oberflächlicher Checklisten – jede relevante Abweichung wird erfasst</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🇪🇺 <strong>Server in Deutschland (Frankfurt)</strong>, volle DSGVO-Konformität und EU-Datenschutz</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🎯 <strong>Präferenz-basierte Bewertung:</strong> Empfehlungen passend zu Ihren individuellen Prioritäten</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📊 <strong>Multi-Dimensionaler Score</strong> – nicht nur Preis, sondern Fairness, Flexibilität, Risiko und Klarheit</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>💡 <strong>Verhandlungsoptimierte Insights:</strong> Zeigt konkret, welche Klauseln übernommen werden sollten</li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle} style={{ color: 'white' }}>Sicherheit & Datenschutz</h2>
              <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
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
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Welche Vertragsarten kann ich vergleichen?</summary>
                <p style={{ margin: '0', color: '#666' }}>Alle Standardverträge: Mietverträge, Arbeitsverträge, Dienstleistungsverträge, Kaufverträge, Versicherungen, SaaS-Abos. Beide Verträge sollten ähnlichen Zweck haben für optimale Ergebnisse.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Wie objektiv ist die KI-Bewertung?</summary>
                <p style={{ margin: '0', color: '#666' }}>Die KI nutzt bewährte Rechtsmuster und Marktstandards als Basis. Sie ist objektiver als das Bauchgefühl, aber Sie definieren die Gewichtung der Kriterien (Preis vs. Flexibilität).</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Kann ich die Bewertungskriterien anpassen?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, Sie können Prioritäten setzen: Ist Ihnen Kostenklarheit wichtiger als Flexibilität? Kurze Fristen wichtiger als niedrige Preise? Die Empfehlung passt sich entsprechend an.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Werden beide Verträge gleich behandelt?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, die Analyse ist symmetrisch. Beide Verträge werden nach denselben Kriterien bewertet. Es gibt keine Bevorzugung für "Vertrag A" oder "Vertrag B".</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Kann ich das Ergebnis exportieren?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, der komplette Vergleichsreport kann als PDF exportiert werden – inklusive Diff-View, Scores, Empfehlung und Begründung. Ideal für Team-Entscheidungen.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Was passiert mit meinen Vertragsdaten?</summary>
                <p style={{ margin: '0', color: '#666' }}>Verschlüsselte Übertragung und Verarbeitung ausschließlich auf EU-Servern. Speicherung nur für Verlaufsanzeige, jederzeit löschbar. Keine Weitergabe an Dritte.</p>
              </details>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Entscheiden Sie mit Klarheit statt Bauchgefühl</h2>
              <p className={styles.ctaSubtitle}>
                Objektive Analyse, visualisierte Unterschiede und eine klare Empfehlung – damit Sie die richtige Wahl treffen.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
                <button 
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
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
      
      <Footer />
    </>
  );
};

export default Vergleich;
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { Wrench, Target, CheckCircle, AlertTriangle } from "lucide-react";

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
        
        {/* Open Graph */}
        <meta property="og:title" content="Vertragsoptimierung mit KI - Schwache Klauseln automatisch verbessern" />
        <meta property="og:description" content="🔧 KI findet problematische Klauseln und schlägt sofort bessere Formulierungen vor → Faire Verträge, verhandlungsfertig. Jetzt kostenlos testen!" />
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
            <Wrench size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Schwache Klauseln stark machen – <span className={styles.heroTitleHighlight}>automatisch</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Unsere KI findet einseitige, unklare oder riskante Passagen und schlägt sofort bessere, faire Formulierungen vor – verhandlungsbereit.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Schwache Klauseln jetzt verbessern">
              🔧 Schwache Klauseln jetzt verbessern
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie der Optimierer funktioniert">
              Wie der Optimierer funktioniert
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
              ⚡ Sofortige Verbesserungen
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎯 Verhandlungsfertig
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🇪🇺 DSGVO-konform
            </span>
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
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📝 <strong>Automatische Klausel-Optimierung:</strong> Jede riskante Klausel erhält eine konkret formulierte Verbesserung – inklusive Begründung</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🔍 <strong>Verständliche Sprache:</strong> Schluss mit Juristendeutsch – die Vorschläge sind laienverständlich und gleichzeitig präzise</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>⚖️ <strong>Kontext & Fairness:</strong> Berücksichtigt Branchenpraxis und Interessensausgleich für ausgewogene Formulierungen</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>✅ <strong>Direkt einsatzbereit:</strong> Änderungen sind so strukturiert, dass Sie sie Abschnitt für Abschnitt übernehmen können</li>
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
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '40px' }}>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Haftungsklausel</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Original:</strong> "Haftung liegt vollständig beim Auftragnehmer"</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Empfehlung:</strong> Haftungsgrenzen je Schadensart + beidseitige Pflicht zur Schadensminderung.</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Zahlungskonditionen</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Original:</strong> "Zahlungsziel 60 Tage"</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Empfehlung:</strong> 14 Tage, Skonto bei schneller Zahlung, Verzugszinsen geregelt.</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Leistungsbeschreibung</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Original:</strong> "Unklare Leistungsbeschreibung"</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Empfehlung:</strong> Messbare Kriterien, Abnahmeprozess, Änderungsmanagement.</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Vertraulichkeit</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Original:</strong> "Allgemeine NDA-Klausel"</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Empfehlung:</strong> Präzise Definitionen, Laufzeit, Ausnahmen, Vertragsstrafen.</p>
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
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🎯 <strong>Echte Individualoptimierung</strong> statt starrer Textbausteine – jeder Vertrag wird kontextspezifisch verbessert</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🇪🇺 <strong>Server in Deutschland (Frankfurt)</strong>, volle DSGVO-Konformität und EU-Datenschutz</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📋 <strong>Transparente Optimierungen:</strong> Jede Änderung wird begründet und ist nachvollziehbar dokumentiert</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>👤 <strong>Für Laien verständlich, für Profis präzise</strong> – sowohl Klartext als auch rechtssichere Formulierungen</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>⚡ <strong>Sofort einsatzbereit:</strong> Optimierungen sind so formuliert, dass Sie sie direkt verwenden können</li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle} style={{ color: 'white' }}>Sicherheit & Datenschutz</h2>
              <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
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
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Ersetzt die Optimierung eine Rechtsberatung?</summary>
                <p style={{ margin: '0', color: '#666' }}>Nein, Contract AI liefert strukturierte Optimierungsvorschläge und Formulierungsalternativen. Für komplexe rechtliche Fragen sollten Sie weiterhin einen Anwalt konsultieren.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Welche Vertragsarten können optimiert werden?</summary>
                <p style={{ margin: '0', color: '#666' }}>Die meisten Standardverträge: Arbeitsverträge, Dienstleistungsverträge, Mietverträge, NDAs, Lizenzverträge, Kaufverträge. Sehr spezifische Branchen-Verträge können eingeschränkt funktionieren.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Wie genau sind die Optimierungsvorschläge?</summary>
                <p style={{ margin: '0', color: '#666' }}>Die KI arbeitet mit bewährten Rechtsmustern und Branchenstandards. Rund 90% der Vorschläge sind direkt umsetzbar, bei speziellen Fällen empfehlen wir zusätzliche Prüfung.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Werden meine Vertragsdaten gespeichert?</summary>
                <p style={{ margin: '0', color: '#666' }}>Optional zur Verlaufsanzeige. Sie können Dokumente jederzeit löschen lassen. Verarbeitung erfolgt ausschließlich zur Optimierung, keine Weitergabe an Dritte.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Was kostet die Vertragsoptimierung?</summary>
                <p style={{ margin: '0', color: '#666' }}>Im Free-Tier: 3 Optimierungen pro Monat. Premium-Pläne ab 19€/Monat mit unbegrenzten Optimierungen und erweiterten Features.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Kann ich die Optimierungen direkt übernehmen?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, alle Vorschläge sind so formuliert, dass Sie sie Abschnitt für Abschnitt in Ihren Vertrag übernehmen können. Mit Änderungsmarkierungen und Export-Funktion.</p>
              </details>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Stärkere Position, weniger Risiko</h2>
              <p className={styles.ctaSubtitle}>
                Verwandeln Sie schwache Klauseln in starke Formulierungen – mit konkreten Vorschlägen und Begründungen
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
                <button 
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
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
      
      <Footer />
    </>
  );
};

export default Optimierung;
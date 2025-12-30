import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { FileText, Zap, Shield, PenTool, Target, CheckCircle, ArrowRight } from "lucide-react";

const Generator: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/generate";
  const target = isAuthenticated ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Vertragsgenerator mit KI - Neue Verträge in Minuten erstellen | Contract AI</title>
        <meta name="description" content="Contract Generator: Neue Verträge aus Bausteinen erstellen. Individuell anpassbar, rechtssicher, sofort einsatzbereit. DSGVO-konform. Jetzt testen!" />
        <meta name="keywords" content="Vertragsgenerator, Verträge erstellen, KI, Vorlagen, Contract AI, rechtssicher, LegalTech" />

        <link rel="canonical" href="https://www.contract-ai.de/features/generator" />
        <meta name="robots" content="index,follow" />

        {/* Open Graph */}
        <meta property="og:title" content="Vertragsgenerator mit KI - Neue Verträge in Minuten erstellen" />
        <meta property="og:description" content="Neue Verträge aus Bausteinen erstellen. Individuell anpassbar, rechtssicher, sofort einsatzbereit." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/generator" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-generator.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertragsgenerator mit KI - Neue Verträge in Minuten erstellen" />
        <meta name="twitter:description" content="Neue Verträge aus Bausteinen erstellen. Individuell anpassbar, rechtssicher." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-generator.png" />
      </Helmet>

      <div className={styles.pageBackground}>
        {/* Dots Pattern */}
        <div className={styles.dotsPattern} />

        {/* Floating Decorative Elements */}
        <div className={styles.floatingElements}>
          <FileText className={styles.floatingIcon} size={28} />
          <Shield className={styles.floatingIcon} size={24} />
          <PenTool className={styles.floatingIcon} size={22} />
          <CheckCircle className={styles.floatingIcon} size={26} />
          <Target className={styles.floatingIcon} size={20} />
          <Zap className={styles.floatingIcon} size={24} />
          <FileText className={styles.floatingIcon} size={22} />
          <PenTool className={styles.floatingIcon} size={20} />
        </div>

        <div className={styles.featureContainer}>

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <FileText size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Generator – Neue <span className={styles.heroTitleHighlight}>Verträge</span> in wenigen Minuten
          </h1>
          <p className={styles.heroSubtitle}>
            Von der leeren Vorlage zum unterschriftsfertigen Vertrag: Der Generator baut aus erprobten Klauseln genau den Vertrag, den Sie brauchen.
          </p>
          <div className={styles.heroButtons}>
            <Link to={target} className={styles.ctaButton} aria-label="Generator starten">
              Generator starten
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie der Generator arbeitet">
              Wie der Generator arbeitet
            </a>
          </div>
          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <FileText size={16} className={styles.trustBadgeIcon} />
              <span>Vorgefertigte Templates</span>
            </div>
            <div className={styles.trustBadge}>
              <Target size={16} className={styles.trustBadgeIcon} />
              <span>Individuell konfigurierbar</span>
            </div>
            <div className={styles.trustBadge}>
              <Zap size={16} className={styles.trustBadgeIcon} />
              <span>Sofort einsatzbereit</span>
            </div>
          </div>
        </section>

        <div className={styles.contentContainer}>
          
          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Neue Verträge brauchen Sie öfter als gedacht</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Shield size={20} />
                </div>
                <p className={styles.funktionText}>
                  Freelancer-Auftrag, NDA, Mietvertrag, Kooperationen: Oft stehen Sie vor einem leeren Blatt – oder kopieren alte Verträge, die nicht ganz passen. Dann doch zum Anwalt? Das dauert Wochen und kostet Hunderte von Euro für Standard-Klauseln, die es längst gibt.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Zap size={20} />
                </div>
                <p className={styles.funktionText}>
                  Der Generator löst das: Aus bewährten Klausel-Bausteinen entsteht in Minuten der passende Vertrag. Keine Blindkopie alter Dokumente, keine wochenlange Wartezeit – sondern zielgerichtete Zusammenstellung genau für Ihren Anwendungsfall.
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: Modularer Vertragsaufbau nach Ihren Anforderungen</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Der Generator führt Sie Schritt für Schritt durch die Vertragsgestaltung. Basierend auf bewährten Klausel-Bibliotheken wählen Sie die Module, die Sie brauchen. Das Ergebnis: Ein rechtssicherer, individueller Vertrag – ohne die Kosten und Wartezeit eines Anwalts.
            </p>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📋</span>
                <span className={styles.featureListContent}><strong>Klausel-Bibliothek:</strong> Hunderte bewährte Bausteine für alle Vertragstypen – von Standard bis spezifisch</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎯</span>
                <span className={styles.featureListContent}><strong>Geführte Auswahl:</strong> Intelligente Fragen führen zu den passenden Klauseln für Ihren Fall</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚖️</span>
                <span className={styles.featureListContent}><strong>Rechtssicherheit:</strong> Alle Klauseln sind geprüft und aktuell – keine veralteten Formulierungen</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📝</span>
                <span className={styles.featureListContent}><strong>Sofort einsatzbereit:</strong> PDF zum Signieren oder DOCX zur weiteren Anpassung – je nach Bedarf</span>
              </li>
            </ul>
          </section>

          {/* HOW IT WORKS */}
          <section id="so-funktionierts" className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>So funktioniert's – in 4 Schritten</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>1</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Vertragstyp wählen:</strong> Freelancer, NDA, Mietvertrag, Koop – oder „individuell" für maßgeschneiderte Zusammenstellung.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Module konfigurieren:</strong> Geführte Fragen zu Ihren Anforderungen – Laufzeit, Haftung, IP-Rechte, Besonderheiten.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Preview & Anpassung:</strong> Vollständigen Vertragstext prüfen, optional einzelne Klauseln austauschen oder ergänzen.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>4</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Export & Signatur:</strong> PDF für sofortige Signatur oder DOCX zum Weiterbearbeiten – inklusive digitaler Signatur-Option.
                </p>
              </div>
            </div>
          </section>

          {/* FEATURES GRID */}
          <section className={styles.vorteileSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Funktionen im Detail</h2>
              <div className={styles.vorteileGrid}>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Intelligente Templates</h3>
                  <p className={styles.vorteilText}>Vorgefertigte Vorlagen für häufige Vertragstypen – als Basis für individuelle Anpassungen.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Klausel-Empfehlungen</h3>
                  <p className={styles.vorteilText}>Automatische Vorschläge basierend auf Ihren Angaben: Branche, Risiko, Vertragswert.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Konsistenz-Check</h3>
                  <p className={styles.vorteilText}>Automatische Prüfung auf widersprüchliche Klauseln und fehlende Bausteine.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Modulare Klauselpakete</h3>
                  <p className={styles.vorteilText}>Zusätzliche Klauseln für spezielle Anforderungen: IP, Wettbewerb, Service-Level, Compliance.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Digitale Signatur</h3>
                  <p className={styles.vorteilText}>Rechtsgültige elektronische Unterschrift mit Zeitstempel und direktem Versand an Vertragspartner.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Export-Flexibilität</h3>
                  <p className={styles.vorteilText}>PDF für Signatur, DOCX zur weiteren Bearbeitung – je nach Workflow-Anforderung.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>Beispiele, die täglich vorkommen</h2>
            <div className={styles.useCaseGrid}>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Freelancer-Vertrag</h3>
                <p className={styles.useCaseChallenge}>Umfang, Abnahme, Zahlungsplan, Nutzungsrechte</p>
                <p className={styles.useCaseSolution}><strong>→ Alles sauber geregelt, sofort einsatzbereit</strong></p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>NDA</h3>
                <p className={styles.useCaseChallenge}>Vertraulichkeit präzise definiert</p>
                <p className={styles.useCaseSolution}><strong>→ Ausnahmen, Laufzeit, Vertragsstrafe geregelt</strong></p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Mietvertrag</h3>
                <p className={styles.useCaseChallenge}>Individuelle Klauseln zu Nebenkosten, Renovierung</p>
                <p className={styles.useCaseSolution}><strong>→ Haustiere, Untermiete – ohne Grauzonen</strong></p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Kooperationsvertrag</h3>
                <p className={styles.useCaseChallenge}>Ziele, IP, Haftung, Exit-Regelungen</p>
                <p className={styles.useCaseSolution}><strong>→ Modular wählbar je nach Partnerschaft</strong></p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <PenTool size={32} />
              </div>
              <p className={styles.beispielText}>
                "In 8 Minuten vom leeren Blatt zum unterschriftsfertigen Freelancer-Vertrag. Das hätte beim Anwalt Wochen gedauert und 400€ gekostet."
              </p>
              <p className={styles.beispielHinweis}>
                Feedback eines Designers bei seinem ersten generierten Vertrag
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Contract AI?</h2>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚖️</span>
                <span className={styles.featureListContent}><strong>Rechtssicher & aktuell</strong> – alle Klauseln sind geprüft und entsprechen aktuellem Recht</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🇪🇺</span>
                <span className={styles.featureListContent}><strong>Server in Deutschland (Frankfurt)</strong>, volle DSGVO-Konformität und EU-Datenschutz</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎯</span>
                <span className={styles.featureListContent}><strong>Modularer Aufbau:</strong> Nur die Klauseln, die Sie wirklich brauchen – kein unnötiger Ballast</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚡</span>
                <span className={styles.featureListContent}><strong>Zeit & Kostenersparnis:</strong> In Minuten statt Wochen zum fertigen Vertrag</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔄</span>
                <span className={styles.featureListContent}><strong>Nahtlose Integration:</strong> Direkter Übergang zu Analyse, Optimierung oder Fristenverwaltung</span>
              </li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Sicherheit & Rechtssicherheit</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Alle Klauseln werden von Juristen geprüft und regelmäßig aktualisiert. 
                Ihre Vertragsdaten sind verschlüsselt und werden ausschließlich auf EU-Servern verarbeitet.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>500+</div>
                  <div className={styles.statLabel}>Klausel-Bausteine</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>⚖️</div>
                  <div className={styles.statLabel}>Juristisch geprüft</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>&lt; 5 Min</div>
                  <div className={styles.statLabel}>Durchschnittliche Erstellung</div>
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
                  Welche Vertragstypen kann der Generator erstellen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Freelancer-Verträge, NDAs, Mietverträge, Kooperationsverträge, Lizenzverträge, Service-Agreements und individuelle Zusammenstellungen aus unserer Klausel-Bibliothek.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Sind die generierten Verträge rechtssicher?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, alle Klauseln sind von Juristen geprüft und entsprechen aktuellem deutschen/EU-Recht. Für hochspezifische Fälle empfehlen wir zusätzliche Anwaltsberatung.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich die Verträge nachträglich ändern?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, Sie erhalten sowohl PDF als auch DOCX-Format. Im Dashboard können Sie Verträge erneut öffnen und anpassen.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Funktioniert die digitale Signatur rechtsgültig?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, unsere eIDAS-konforme elektronische Signatur ist in der EU voll rechtsgültig. Mit Zeitstempel und Versand per E-Mail.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie viele Verträge kann ich generieren?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Je nach Plan: Premium 5/Monat, Business 20/Monat, Legendary unbegrenzt. Alle mit Export-Funktion und digitaler Signatur.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was unterscheidet das von Standard-Vorlagen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Individuelle Konfiguration statt starrer Vorlagen, immer aktuelle Klauseln, Konsistenz-Checks und nahtlose Integration in Ihren Workflow.</p>
              </details>
            </div>
          </section>

          {/* RELATED FEATURES */}
          <section className={styles.relatedSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Verwandte Funktionen</h2>
              <div className={styles.relatedGrid}>
                <Link to="/features/contract-builder" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>🔧</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Contract Builder</div>
                    <div className={styles.relatedDescription}>Visueller Editor mit Drag & Drop für individuelle Vertragsgestaltung</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
                <Link to="/features/digitalesignatur" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>✍️</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Digitale Signatur</div>
                    <div className={styles.relatedDescription}>Unterschreiben Sie generierte Verträge rechtsgültig digital</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
                <Link to="/features/optimierung" className={styles.relatedCard}>
                  <span className={styles.relatedIcon}>✨</span>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedTitle}>Optimierung</div>
                    <div className={styles.relatedDescription}>KI-Vorschläge zur Verbesserung Ihrer Vertragsklauseln</div>
                  </div>
                  <ArrowRight size={20} className={styles.relatedArrow} />
                </Link>
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Vom Bedarf zum fertigen Vertrag – in wenigen Minuten</h2>
              <p className={styles.ctaSubtitle}>
                Keine Wartezeiten, keine Anwaltskosten für Standard-Verträge. Der Generator baut aus bewährten Bausteinen genau das, was Sie brauchen.
              </p>
              <div className={styles.ctaButtons}>
                <button
                  className={styles.secondaryButtonLight}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Wie der Generator arbeitet
                </button>
                <Link to={target} className={styles.ctaButton} aria-label="Generator starten">
                  Generator starten
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

export default Generator;
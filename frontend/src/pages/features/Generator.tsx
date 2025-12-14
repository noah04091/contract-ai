import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { FileText, Zap, Shield, PenTool, Target, CheckCircle } from "lucide-react";

const Generator: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/generate";
  const target = isAuthenticated ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Generator – Contract AI | Verträge verstehen, optimieren, absichern";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Contract Generator: Neue Verträge aus Bausteinen erstellen. Individuell anpassbar, rechtssicher, sofort einsatzbereit. DSGVO-konform, Frankfurt. Jetzt testen.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Contract Generator: Neue Verträge aus Bausteinen erstellen. Individuell anpassbar, rechtssicher, sofort einsatzbereit. DSGVO-konform, Frankfurt. Jetzt testen.';
      document.head.appendChild(meta);
    }

    // Add canonical link
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://www.contract-ai.de/features/generator');
    } else {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = 'https://www.contract-ai.de/features/generator';
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
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
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📋 <strong>Klausel-Bibliothek:</strong> Hunderte bewährte Bausteine für alle Vertragstypen – von Standard bis spezifisch</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🎯 <strong>Geführte Auswahl:</strong> Intelligente Fragen führen zu den passenden Klauseln für Ihren Fall</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>⚖️ <strong>Rechtssicherheit:</strong> Alle Klauseln sind geprüft und aktuell – keine veralteten Formulierungen</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📝 <strong>Sofort einsatzbereit:</strong> PDF zum Signieren oder DOCX zur weiteren Anpassung – je nach Bedarf</li>
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
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '40px' }}>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Freelancer-Vertrag</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Umfang, Abnahme, Zahlungsplan, Nutzungsrechte</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ Alles sauber geregelt, sofort einsatzbereit</strong></p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>NDA</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Vertraulichkeit präzise definiert</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ Ausnahmen, Laufzeit, Vertragsstrafe geregelt</strong></p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Mietvertrag</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Individuelle Klauseln zu Nebenkosten, Renovierung</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ Haustiere, Untermiete – ohne Grauzonen</strong></p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Kooperationsvertrag</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Ziele, IP, Haftung, Exit-Regelungen</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ Modular wählbar je nach Partnerschaft</strong></p>
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
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>⚖️ <strong>Rechtssicher & aktuell</strong> – alle Klauseln sind geprüft und entsprechen aktuellem Recht</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🇪🇺 <strong>Server in Deutschland (Frankfurt)</strong>, volle DSGVO-Konformität und EU-Datenschutz</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🎯 <strong>Modularer Aufbau:</strong> Nur die Klauseln, die Sie wirklich brauchen – kein unnötiger Ballast</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>⚡ <strong>Zeit & Kostenersparnis:</strong> In Minuten statt Wochen zum fertigen Vertrag</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🔄 <strong>Nahtlose Integration:</strong> Direkter Übergang zu Analyse, Optimierung oder Fristenverwaltung</li>
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
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Welche Vertragstypen kann der Generator erstellen?</summary>
                <p style={{ margin: '0', color: '#666' }}>Freelancer-Verträge, NDAs, Mietverträge, Kooperationsverträge, Lizenzverträge, Service-Agreements und individuelle Zusammenstellungen aus unserer Klausel-Bibliothek.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Sind die generierten Verträge rechtssicher?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, alle Klauseln sind von Juristen geprüft und entsprechen aktuellem deutschen/EU-Recht. Für hochspezifische Fälle empfehlen wir zusätzliche Anwaltsberatung.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Kann ich die Verträge nachträglich ändern?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, Sie erhalten sowohl PDF als auch DOCX-Format. Im Dashboard können Sie Verträge erneut öffnen und anpassen.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Funktioniert die digitale Signatur rechtsgültig?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, unsere eIDAS-konforme elektronische Signatur ist in der EU voll rechtsgültig. Mit Zeitstempel und Versand per E-Mail.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Wie viele Verträge kann ich generieren?</summary>
                <p style={{ margin: '0', color: '#666' }}>Je nach Plan: Premium 5/Monat, Business 20/Monat, Legendary unbegrenzt. Alle mit Export-Funktion und digitaler Signatur.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Was unterscheidet das von Standard-Vorlagen?</summary>
                <p style={{ margin: '0', color: '#666' }}>Individuelle Konfiguration statt starrer Vorlagen, immer aktuelle Klauseln, Konsistenz-Checks und nahtlose Integration in Ihren Workflow.</p>
              </details>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Vom Bedarf zum fertigen Vertrag – in wenigen Minuten</h2>
              <p className={styles.ctaSubtitle}>
                Keine Wartezeiten, keine Anwaltskosten für Standard-Verträge. Der Generator baut aus bewährten Bausteinen genau das, was Sie brauchen.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
                <button 
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
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
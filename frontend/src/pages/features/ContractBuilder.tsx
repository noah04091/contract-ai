import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { Wrench, Layers, MousePointer, Variable, Sparkles, FileDown, CheckCircle, Shield, FileText } from "lucide-react";

const ContractBuilder: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/contract-builder";
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
        "name": "Wie funktioniert der Contract Builder?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Der Contract Builder ist ein visueller Editor, mit dem Sie Verträge per Drag & Drop erstellen können. Wählen Sie Bausteine wie Klauseln, Parteien, Unterschriftsfelder aus und ziehen Sie diese auf Ihre Vorlage. Smart Variables ermöglichen automatisches Ausfüllen wiederkehrender Daten."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich eigene Vorlagen erstellen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, Sie können Ihre Verträge als Vorlagen speichern und wiederverwenden. Organisieren Sie Ihre Vorlagen nach Vertragstypen und teilen Sie sie optional mit Ihrem Team."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Exportformate werden unterstützt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Exportieren Sie Ihre Verträge als professionelles PDF mit Ihrem Branding, als Word-Dokument zur weiteren Bearbeitung, oder nutzen Sie die integrierte Druckfunktion."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Contract Builder - Verträge visuell erstellen mit Drag & Drop | Contract AI</title>
        <meta name="description" content="Erstellen Sie professionelle Verträge per Drag & Drop. Smart Variables, KI-Unterstützung, PDF-Export. Keine Programmierkenntnisse nötig. Jetzt kostenlos testen!" />
        <meta name="keywords" content="Verträge erstellen, Vertragsgenerator, Drag Drop, Contract Builder, Vorlagen, KI, Smart Variables, PDF Export" />

        <link rel="canonical" href="https://www.contract-ai.de/features/contract-builder" />
        <meta name="robots" content="index,follow" />

        {/* Open Graph */}
        <meta property="og:title" content="Contract Builder - Verträge visuell erstellen mit Drag & Drop" />
        <meta property="og:description" content="Erstellen Sie professionelle Verträge per Drag & Drop. Smart Variables, KI-Unterstützung, PDF-Export. Jetzt kostenlos testen!" />
        <meta property="og:type" content="website" />

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
          <Layers className={styles.floatingIcon} size={24} />
          <MousePointer className={styles.floatingIcon} size={22} />
          <Variable className={styles.floatingIcon} size={26} />
          <Sparkles className={styles.floatingIcon} size={20} />
          <FileDown className={styles.floatingIcon} size={24} />
          <CheckCircle className={styles.floatingIcon} size={22} />
          <FileText className={styles.floatingIcon} size={26} />
        </div>

        <div className={styles.featureContainer}>

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <Wrench size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Verträge erstellen wie ein <span className={styles.heroTitleHighlight}>Profi</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Visueller Baukasten für rechtssichere Verträge. Drag & Drop, Smart Variables und KI-Unterstützung – keine Vorkenntnisse nötig.
          </p>
          <div className={styles.heroButtons}>
            <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Jetzt Vertrag erstellen">
              Jetzt Vertrag erstellen
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="So funktioniert der Builder">
              So funktioniert der Builder
            </a>
          </div>

          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <Layers size={16} className={styles.trustBadgeIcon} />
              <span>Drag & Drop</span>
            </div>
            <div className={styles.trustBadge}>
              <Variable size={16} className={styles.trustBadgeIcon} />
              <span>Smart Variables</span>
            </div>
            <div className={styles.trustBadge}>
              <Shield size={16} className={styles.trustBadgeIcon} />
              <span>Rechtssicher</span>
            </div>
          </div>
        </section>
        <div className={styles.contentContainer}>

          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum ein visueller Vertragsbaukasten?</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <FileText size={20} />
                </div>
                <p className={styles.funktionText}>
                  Verträge von Grund auf zu schreiben ist zeitaufwändig und fehleranfällig. Word-Vorlagen sind starr und schwer anpassbar. Juristisches Wissen fehlt oft, und jeder Fehler kann teuer werden. Wer nicht täglich mit Verträgen arbeitet, steht schnell vor einer Herausforderung.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Wrench size={20} />
                </div>
                <p className={styles.funktionText}>
                  Der Contract Builder löst dieses Problem: Ein visueller Editor, der Verträge aus bewährten Bausteinen zusammensetzt. Ziehen Sie Klauseln, Parteien und Unterschriftsfelder per Drag & Drop. Smart Variables füllen wiederkehrende Daten automatisch aus. Kein Jurastudium nötig.
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: Verträge bauen statt schreiben</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Der Contract Builder verwandelt Vertragsgestaltung in einen intuitiven Prozess. Wählen Sie aus einer Bibliothek von Bausteinen, passen Sie Inhalte an Ihre Bedürfnisse an und exportieren Sie professionelle Dokumente – alles in einer modernen Oberfläche.
            </p>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🧱</span>
                <span className={styles.featureListContent}><strong>Baustein-Bibliothek:</strong> Kopfzeilen, Parteien, Klauseln, Unterschriften, Anlagen und mehr</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🖱️</span>
                <span className={styles.featureListContent}><strong>Drag & Drop:</strong> Bausteine einfach auf die Vorlage ziehen und anordnen</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔄</span>
                <span className={styles.featureListContent}><strong>Smart Variables:</strong> Einmal definieren, überall automatisch einsetzen</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>✨</span>
                <span className={styles.featureListContent}><strong>KI-Assistent:</strong> Lassen Sie Klauseln von der KI generieren oder optimieren</span>
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
                  <strong>Vorlage wählen:</strong> Starten Sie mit einer leeren Vorlage oder wählen Sie aus professionellen Templates für verschiedene Vertragstypen.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Bausteine hinzufügen:</strong> Ziehen Sie Parteien, Klauseln, Tabellen und Unterschriftsfelder per Drag & Drop auf Ihre Vorlage.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Variablen ausfüllen:</strong> Definieren Sie Smart Variables für Namen, Adressen, Beträge – sie werden überall automatisch eingesetzt.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>4</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Exportieren:</strong> Laden Sie Ihren fertigen Vertrag als professionelles PDF herunter oder drucken Sie ihn direkt aus.
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
                  <h3 className={styles.vorteilTitle}>Baustein-Editor</h3>
                  <p className={styles.vorteilText}>Über 15 verschiedene Bausteine: Kopfzeilen, Parteien, Klauseln, Tabellen, Definitionen, Hinweise, Unterschriften und mehr.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Smart Variables</h3>
                  <p className={styles.vorteilText}>Variablen einmal definieren und überall im Dokument automatisch einsetzen. Perfekt für wiederkehrende Daten.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>KI-Klauselgenerator</h3>
                  <p className={styles.vorteilText}>Beschreiben Sie, was Sie brauchen – die KI generiert rechtssichere Klauseln mit Begründung.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Design-Anpassung</h3>
                  <p className={styles.vorteilText}>Passen Sie Schriften, Farben und Layout an Ihr Corporate Design an. Professioneller Auftritt garantiert.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Vorlagen-Bibliothek</h3>
                  <p className={styles.vorteilText}>Speichern Sie Ihre Verträge als Vorlagen und verwenden Sie sie für ähnliche Projekte wieder.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>PDF-Export mit Anlagen</h3>
                  <p className={styles.vorteilText}>Exportieren Sie Verträge als PDF inkl. hochgeladener Anlagen. Alles in einem Dokument.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>Typische Anwendungsfälle</h2>
            <div className={styles.useCaseGrid}>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Dienstleistungsverträge</h3>
                <p className={styles.useCaseChallenge}><strong>Bedarf:</strong> Wiederkehrende Kundenverträge</p>
                <p className={styles.useCaseSolution}>Vorlage erstellen, Variablen anpassen, sofort versandfertig.</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Freelancer-Agreements</h3>
                <p className={styles.useCaseChallenge}><strong>Bedarf:</strong> Schnelle Projektverträge</p>
                <p className={styles.useCaseSolution}>Bausteine kombinieren, Leistungen definieren, unterschriftsreif in Minuten.</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>NDAs & Geheimhaltung</h3>
                <p className={styles.useCaseChallenge}><strong>Bedarf:</strong> Vertraulichkeitsvereinbarungen</p>
                <p className={styles.useCaseSolution}>Professionelle NDA-Vorlage, Parteien eintragen, fertig.</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Kooperationsverträge</h3>
                <p className={styles.useCaseChallenge}><strong>Bedarf:</strong> Partnerschaftsvereinbarungen</p>
                <p className={styles.useCaseSolution}>Komplexe Regelungen übersichtlich strukturieren mit Klausel-Bausteinen.</p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <CheckCircle size={32} />
              </div>
              <p className={styles.beispielText}>
                "Mit dem Contract Builder erstelle ich jetzt in 10 Minuten, wofür ich früher einen halben Tag gebraucht habe. Die Smart Variables sind genial."
              </p>
              <p className={styles.beispielHinweis}>
                Feedback eines Agentur-Inhabers
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Contract Builder?</h2>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎨</span>
                <span className={styles.featureListContent}><strong>Visuell & Intuitiv:</strong> Keine Programmierkenntnisse, kein Jurastudium erforderlich</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🚀</span>
                <span className={styles.featureListContent}><strong>Schnelle Erstellung:</strong> Von der Idee zum fertigen Vertrag in Minuten statt Stunden</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔁</span>
                <span className={styles.featureListContent}><strong>Wiederverwendbar:</strong> Einmal erstellen, immer wieder nutzen mit Vorlagen</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🤖</span>
                <span className={styles.featureListContent}><strong>KI-Unterstützung:</strong> Klauseln generieren, optimieren und rechtlich prüfen lassen</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📄</span>
                <span className={styles.featureListContent}><strong>Professionelle Ausgabe:</strong> PDF-Export mit Anlagen, druckfertig und versandbereit</span>
              </li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Sicherheit & Qualität</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Alle Bausteine basieren auf erprobten juristischen Formulierungen. Ihre Daten bleiben sicher auf EU-Servern.
                Automatische Speicherung verhindert Datenverlust. Exportieren Sie jederzeit Ihre Dokumente.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>15+</div>
                  <div className={styles.statLabel}>Bausteintypen</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{'< 10min'}</div>
                  <div className={styles.statLabel}>Durchschnittliche Erstellzeit</div>
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
                  Brauche ich juristische Vorkenntnisse?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Nein, der Contract Builder ist für jeden bedienbar. Die Bausteine enthalten bereits rechtlich geprüfte Formulierungen. Die KI hilft bei Anpassungen.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich eigene Klauseln hinzufügen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, Sie können jederzeit eigene Texte eingeben oder von der KI generieren lassen. Alle Bausteine sind vollständig anpassbar.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Exportformate gibt es?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Export als PDF (inkl. Anlagen), Druck-Funktion und Speicherung als wiederverwendbare Vorlage. Word-Export ist in Planung.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Werden meine Verträge gespeichert?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, automatische Speicherung auf EU-Servern. Sie können Ihre Verträge jederzeit bearbeiten oder löschen.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie funktionieren Smart Variables?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Definieren Sie Variablen wie {'{{'}<em>name</em>{'}}'}  oder {'{{'}<em>adresse</em>{'}}'}  einmal und sie werden automatisch überall im Dokument eingesetzt, wo sie verwendet werden.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich Vorlagen mit meinem Team teilen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Die Team-Funktion ist für Business-Nutzer verfügbar. Erstellen und teilen Sie Vorlagen innerhalb Ihrer Organisation.</p>
              </details>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Erstellen Sie Ihren ersten Vertrag in Minuten</h2>
              <p className={styles.ctaSubtitle}>
                Kein Jurastudium nötig. Keine komplizierten Tools. Einfach Bausteine zusammensetzen und professionelle Verträge erstellen.
              </p>
              <div className={styles.ctaButtons}>
                <button
                  className={styles.secondaryButtonLight}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  So funktioniert es
                </button>
                <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Contract Builder starten">
                  Contract Builder starten
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

export default ContractBuilder;

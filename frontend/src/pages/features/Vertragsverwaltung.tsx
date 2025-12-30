import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { FolderOpen, CheckCircle, Clock, FileText, Shield, Zap, Target } from "lucide-react";

const Vertragsverwaltung: React.FC = () => {
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
        "name": "Wie sicher ist die Vertragsverwaltung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Alle Verträge werden verschlüsselt auf deutschen Servern in Frankfurt gespeichert. Vollständige DSGVO-Konformität, keine Weitergabe an Dritte. Sie können Dokumente jederzeit löschen."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich Verträge in Ordnern organisieren?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, Sie können beliebig viele Ordner erstellen und Verträge per Drag & Drop organisieren. Unterordner, Farb-Coding und intelligente Filter helfen bei der Übersicht."
        }
      },
      {
        "@type": "Question",
        "name": "Funktioniert die Suche auch im Vertragsinhalt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, die Volltextsuche durchsucht nicht nur Dateinamen, sondern auch den kompletten Vertragsinhalt. Finden Sie Klauseln, Begriffe oder Daten in Sekundenschnelle."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertragsverwaltung - Alle Verträge zentral & sicher organisieren | Contract AI</title>
        <meta name="description" content="📂 Verwalten Sie alle Verträge zentral in der Cloud. Intelligente Ordner, Volltextsuche, automatische Erinnerungen. DSGVO-konform auf deutschen Servern. Jetzt testen!" />
        <meta name="keywords" content="Vertragsverwaltung, Vertragsmanagement, Cloud-Speicher, Ordnerverwaltung, Contract AI, DSGVO, LegalTech" />

        <link rel="canonical" href="https://www.contract-ai.de/features/vertragsverwaltung" />
        <meta name="robots" content="index,follow" />

        {/* Open Graph */}
        <meta property="og:title" content="Vertragsverwaltung - Alle Verträge zentral & sicher organisieren" />
        <meta property="og:description" content="Zentrale Vertragsverwaltung in der Cloud. Ordner, Suche, Erinnerungen – alles DSGVO-konform. Jetzt testen!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/vertragsverwaltung" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsverwaltung.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertragsverwaltung - Alle Verträge zentral & sicher organisieren" />
        <meta name="twitter:description" content="Zentrale Vertragsverwaltung in der Cloud. Ordner, Suche, Erinnerungen – DSGVO-konform." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-vertragsverwaltung.png" />

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
          <FolderOpen className={styles.floatingIcon} size={28} />
          <Shield className={styles.floatingIcon} size={24} />
          <FileText className={styles.floatingIcon} size={22} />
          <CheckCircle className={styles.floatingIcon} size={26} />
          <Target className={styles.floatingIcon} size={20} />
          <Clock className={styles.floatingIcon} size={24} />
          <Zap className={styles.floatingIcon} size={22} />
          <FolderOpen className={styles.floatingIcon} size={20} />
        </div>

        <div className={styles.featureContainer}>

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <FolderOpen size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Verträge zentral verwalten – <span className={styles.heroTitleHighlight}>mühelos</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Schluss mit Papierstapeln und verstreuten Dateien. Organisieren Sie alle Verträge zentral, sicher und intelligent in der Cloud – mit automatischen Erinnerungen und Volltextsuche.
          </p>
          <div className={styles.heroButtons}>
            <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Verträge jetzt verwalten">
              📂 Verträge jetzt verwalten
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie die Verwaltung funktioniert">
              Wie die Verwaltung funktioniert
            </a>
          </div>

          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <Shield size={16} className={styles.trustBadgeIcon} />
              <span>DSGVO-konform</span>
            </div>
            <div className={styles.trustBadge}>
              <Target size={16} className={styles.trustBadgeIcon} />
              <span>Server in Frankfurt</span>
            </div>
            <div className={styles.trustBadge}>
              <Zap size={16} className={styles.trustBadgeIcon} />
              <span>Sofort verfügbar</span>
            </div>
          </div>
        </section>
        <div className={styles.contentContainer}>

          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Vertragsverwaltung so wichtig ist</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Clock size={20} />
                </div>
                <p className={styles.funktionText}>
                  Verträge in E-Mail-Postfächern, auf dem Desktop, in Papierordnern – Chaos kostet Zeit und Nerven. Wichtige Kündigungsfristen werden übersehen, Dokumente sind nicht auffindbar, wenn man sie braucht, und bei Streitfällen fehlen plötzlich entscheidende Unterlagen.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <FolderOpen size={20} />
                </div>
                <p className={styles.funktionText}>
                  Contract AI bringt Ordnung in Ihre Vertragswelt. Zentrale Cloud-Speicherung mit intelligenter Organisation, automatischen Erinnerungen und Volltextsuche. Ob am PC oder unterwegs – Sie haben alle Verträge griffbereit, sicher und DSGVO-konform gespeichert.
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: Intelligente Cloud-Vertragsverwaltung</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Speichern Sie alle Verträge zentral in der Contract AI Cloud. Organisieren Sie mit Ordnern, Tags und Farben. Die intelligente Suche findet jede Klausel in Sekunden – egal ob im Dateinamen oder tief im Vertragstext. Automatische Erinnerungen sorgen dafür, dass Sie keine Frist mehr verpassen.
            </p>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📁</span>
                <span className={styles.featureListContent}><strong>Ordner & Unterordner:</strong> Strukturieren Sie Verträge nach Projekten, Kunden oder Kategorien</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔍</span>
                <span className={styles.featureListContent}><strong>Volltextsuche:</strong> Durchsuchen Sie alle Verträge gleichzeitig – selbst im Vertragsinhalt</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔔</span>
                <span className={styles.featureListContent}><strong>Automatische Erinnerungen:</strong> Werden Sie per E-Mail an Kündigungsfristen erinnert</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔒</span>
                <span className={styles.featureListContent}><strong>Maximale Sicherheit:</strong> Verschlüsselte Speicherung auf deutschen Servern (Frankfurt)</span>
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
                  <strong>Verträge hochladen:</strong> Laden Sie PDFs oder DOCX-Dateien per Drag & Drop hoch – alles verschlüsselt und sicher.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Ordner erstellen:</strong> Organisieren Sie Verträge in Ordnern, nutzen Sie Tags und Farben für bessere Übersicht.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Jederzeit abrufen:</strong> Finden Sie jeden Vertrag in Sekunden – mit intelligenter Suche und Filteroptionen.
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
                  <h3 className={styles.vorteilTitle}>Ordner & Unterordner</h3>
                  <p className={styles.vorteilText}>Strukturieren Sie Verträge hierarchisch nach Projekten, Kunden oder Kategorien – beliebig viele Ebenen möglich.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Intelligente Suche</h3>
                  <p className={styles.vorteilText}>Volltextsuche durchsucht Dateinamen UND Vertragsinhalt. Finden Sie jede Klausel in Sekunden.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Automatische Erinnerungen</h3>
                  <p className={styles.vorteilText}>Kündigungsfristen werden automatisch erkannt. Erhalten Sie Erinnerungen per E-Mail – nie wieder eine Frist verpassen.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Tags & Filter</h3>
                  <p className={styles.vorteilText}>Versehen Sie Verträge mit Tags und nutzen Sie Filter, um schnell die richtigen Dokumente zu finden.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Multi-Device Sync</h3>
                  <p className={styles.vorteilText}>Greifen Sie von jedem Gerät auf Ihre Verträge zu – PC, Tablet, Smartphone. Alles automatisch synchronisiert.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Sichere Löschung</h3>
                  <p className={styles.vorteilText}>Löschen Sie Verträge jederzeit dauerhaft – inklusive aller Backups. Volle Kontrolle über Ihre Daten.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>Typische Anwendungsfälle</h2>
            <div className={styles.useCaseGrid}>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Freiberufler & Freelancer</h3>
                <p className={styles.useCaseChallenge}><strong>Herausforderung:</strong> Dutzende Kundenverträge verwalten</p>
                <p className={styles.useCaseSolution}><strong>Lösung:</strong> Ordner pro Kunde, automatische Erinnerungen an Zahlungsfristen</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Unternehmen & Agenturen</h3>
                <p className={styles.useCaseChallenge}><strong>Herausforderung:</strong> Lieferanten-, Kunden- und Mitarbeiterverträge im Blick</p>
                <p className={styles.useCaseSolution}><strong>Lösung:</strong> Kategorisierung nach Typ, Team-Zugriff, zentrale Ablage</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Privatpersonen</h3>
                <p className={styles.useCaseChallenge}><strong>Herausforderung:</strong> Mietvertrag, Versicherungen, Handyvertrag – alles verstreut</p>
                <p className={styles.useCaseSolution}><strong>Lösung:</strong> Alle privaten Verträge an einem Ort mit Kündigungserinnerungen</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Startups & Gründer</h3>
                <p className={styles.useCaseChallenge}><strong>Herausforderung:</strong> Schnell wachsende Vertragszahl, oft remote</p>
                <p className={styles.useCaseSolution}><strong>Lösung:</strong> Cloud-basiert, von überall abrufbar, skalierbar</p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <CheckCircle size={32} />
              </div>
              <p className={styles.beispielText}>
                "Endlich habe ich alle Verträge an einem Ort. Die Suche ist so schnell, dass ich jeden Vertrag in Sekunden finde."
              </p>
              <p className={styles.beispielHinweis}>
                Feedback eines Premium-Nutzers
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Contract AI?</h2>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔒</span>
                <span className={styles.featureListContent}><strong>Maximale Sicherheit:</strong> Deutsche Server (Frankfurt), SSL-Verschlüsselung, DSGVO-konform</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚡</span>
                <span className={styles.featureListContent}><strong>Blitzschnelle Suche:</strong> Volltextsuche durchsucht alle Verträge gleichzeitig</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔔</span>
                <span className={styles.featureListContent}><strong>Nie wieder Fristen verpassen:</strong> Automatische E-Mail-Erinnerungen</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📱</span>
                <span className={styles.featureListContent}><strong>Von überall zugreifen:</strong> Web, Desktop, Tablet, Smartphone – voll synchronisiert</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🎨</span>
                <span className={styles.featureListContent}><strong>Flexibel organisierbar:</strong> Ordner, Tags, Farben – wie Sie es brauchen</span>
              </li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Sicherheit & Datenschutz</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Ihre Verträge sind bei uns sicherer als auf Ihrem eigenen Rechner. Verschlüsselte Übertragung und Speicherung auf zertifizierten Servern in Frankfurt (Deutschland).
                Keine Weitergabe an Dritte. Löschung jederzeit auf Knopfdruck möglich.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>100%</div>
                  <div className={styles.statLabel}>DSGVO-konform</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>🇩🇪</div>
                  <div className={styles.statLabel}>Server in Deutschland</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>24/7</div>
                  <div className={styles.statLabel}>Verfügbar</div>
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
                  Wie sicher ist die Vertragsverwaltung?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Sehr sicher. Alle Verträge werden verschlüsselt übertragen und auf deutschen Servern in Frankfurt gespeichert. Vollständige DSGVO-Konformität, keine Weitergabe an Dritte.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich meine Verträge in Ordnern organisieren?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, Sie können beliebig viele Ordner und Unterordner erstellen. Zusätzlich stehen Tags, Farben und Filter zur Verfügung.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Funktioniert die Suche auch im Vertragsinhalt?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, die Volltextsuche durchsucht nicht nur Dateinamen, sondern auch den kompletten Vertragsinhalt. Sie finden Klauseln, Begriffe oder Daten in Sekundenschnelle.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich Verträge von mehreren Geräten verwalten?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, Contract AI ist vollständig Cloud-basiert. Sie können von PC, Tablet oder Smartphone auf Ihre Verträge zugreifen – alles automatisch synchronisiert.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie funktionieren die automatischen Erinnerungen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Die KI erkennt Kündigungsfristen automatisch. Sie erhalten rechtzeitig E-Mail-Erinnerungen, damit Sie keine Frist verpassen.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich Verträge wieder löschen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, Sie können Verträge jederzeit dauerhaft löschen – inklusive aller Backups. Sie behalten volle Kontrolle über Ihre Daten.</p>
              </details>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Bringen Sie Ordnung in Ihre Vertragswelt</h2>
              <p className={styles.ctaSubtitle}>
                Über 92% unserer Nutzer finden, dass Contract AI ihre Vertragsverwaltung deutlich vereinfacht hat. Probieren Sie es jetzt kostenlos aus!
              </p>
              <div className={styles.ctaButtons}>
                <button
                  className={styles.secondaryButtonLight}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  So funktioniert die Verwaltung
                </button>
                <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Jetzt kostenlos starten">
                  📂 Jetzt kostenlos starten
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

export default Vertragsverwaltung;

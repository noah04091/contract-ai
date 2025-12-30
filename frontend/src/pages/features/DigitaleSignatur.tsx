import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { PenTool, CheckCircle, Mail, FileText, Shield, Zap } from "lucide-react";

const DigitaleSignatur: React.FC = () => {
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
        "name": "Ist die digitale Signatur rechtssicher?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, die digitale Signatur entspricht der eIDAS-Verordnung und ist in Deutschland und der EU rechtlich bindend. Jeder Signiervorgang wird mit vollständigem Audit Trail dokumentiert."
        }
      },
      {
        "@type": "Question",
        "name": "Wie funktioniert der Signaturprozess?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sie laden Ihren Vertrag hoch, definieren Signaturfelder, und senden eine E-Mail an die Unterzeichner. Diese signieren per Mausklick – ohne Login oder Software-Installation. Sie erhalten ein versiegeltes PDF mit Audit Trail."
        }
      },
      {
        "@type": "Question",
        "name": "Was ist ein Audit Trail?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Der Audit Trail protokolliert jeden Schritt: Wer hat wann, wo und wie signiert (IP-Adresse, Zeitstempel, Gerät). Das versiegelte PDF ist rechtlich beweiskräftig."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Digitale Signatur - Verträge rechtssicher online signieren | Contract AI</title>
        <meta name="description" content="✍️ Verträge rechtssicher digital signieren lassen. E-Mail-Versand, Echtzeit-Tracking, Audit Trail, versiegeltes PDF. eIDAS-konform. Jetzt kostenlos testen!" />
        <meta name="keywords" content="Digitale Signatur, E-Signatur, eIDAS, Vertrag signieren, DocuSign Alternative, Contract AI, LegalTech" />

        <link rel="canonical" href="https://www.contract-ai.de/features/digitalesignatur" />
        <meta name="robots" content="index,follow" />

        {/* Open Graph */}
        <meta property="og:title" content="Digitale Signatur - Verträge rechtssicher online signieren" />
        <meta property="og:description" content="Verträge rechtssicher digital signieren lassen. E-Mail, Tracking, Audit Trail. eIDAS-konform. Jetzt testen!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/digitalesignatur" />
        <meta property="og:image" content="https://www.contract-ai.de/og-digitalesignatur.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Digitale Signatur - Verträge rechtssicher online signieren" />
        <meta name="twitter:description" content="Verträge rechtssicher digital signieren. E-Mail, Tracking, Audit Trail. eIDAS-konform." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-digitalesignatur.png" />

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
          <PenTool className={styles.floatingIcon} size={28} />
          <Shield className={styles.floatingIcon} size={24} />
          <FileText className={styles.floatingIcon} size={22} />
          <CheckCircle className={styles.floatingIcon} size={26} />
          <Mail className={styles.floatingIcon} size={20} />
          <Zap className={styles.floatingIcon} size={24} />
          <PenTool className={styles.floatingIcon} size={22} />
          <FileText className={styles.floatingIcon} size={20} />
        </div>

        <div className={styles.featureContainer}>

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <PenTool size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Verträge rechtssicher signieren – <span className={styles.heroTitleHighlight}>digital</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Schluss mit Ausdrucken, Scannen und Versenden. Lassen Sie Verträge einfach digital signieren – mit E-Mail-Benachrichtigung, Echtzeit-Tracking und vollständigem Audit Trail. Rechtssicher nach eIDAS-Verordnung.
          </p>
          <div className={styles.heroButtons}>
            <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Vertrag jetzt signieren lassen">
              ✍️ Vertrag jetzt signieren lassen
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie die Signatur funktioniert">
              Wie die Signatur funktioniert
            </a>
          </div>

          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <Shield size={16} className={styles.trustBadgeIcon} />
              <span>eIDAS-konform</span>
            </div>
            <div className={styles.trustBadge}>
              <FileText size={16} className={styles.trustBadgeIcon} />
              <span>Vollständiger Audit Trail</span>
            </div>
            <div className={styles.trustBadge}>
              <Zap size={16} className={styles.trustBadgeIcon} />
              <span>In Minuten fertig</span>
            </div>
          </div>
        </section>
        <div className={styles.contentContainer}>

          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum digitale Signaturen so wichtig sind</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Mail size={20} />
                </div>
                <p className={styles.funktionText}>
                  Verträge ausdrucken, unterschreiben, scannen und per E-Mail verschicken – zeitaufwändig, umständlich und fehleranfällig. Signaturen gehen verloren, Dokumente werden vergessen, und der Prozess zieht sich über Tage oder Wochen. Bei mehreren Unterzeichnern wird es schnell chaotisch.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <PenTool size={20} />
                </div>
                <p className={styles.funktionText}>
                  Contract AI digitalisiert den gesamten Signaturprozess. Versenden Sie Verträge per E-Mail, verfolgen Sie den Status in Echtzeit, und erhalten Sie ein versiegeltes PDF mit vollständigem Audit Trail. Rechtssicher nach eIDAS-Verordnung, anerkannt in ganz Europa.
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: Digitale Signatur in Minuten</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Laden Sie Ihren Vertrag hoch, definieren Sie Signaturfelder, und versenden Sie eine E-Mail an die Unterzeichner. Diese erhalten einen Link, öffnen das Dokument im Browser und signieren per Mausklick – ohne Login, ohne Software-Installation. Sie erhalten eine Benachrichtigung, sobald alle signiert haben, und bekommen ein versiegeltes PDF mit vollständigem Audit Trail.
            </p>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📧</span>
                <span className={styles.featureListContent}><strong>E-Mail-Benachrichtigung:</strong> Unterzeichner erhalten automatisch einen Link zum Signieren</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📊</span>
                <span className={styles.featureListContent}><strong>Echtzeit-Tracking:</strong> Sehen Sie, wer bereits signiert hat und wer noch aussteht</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📋</span>
                <span className={styles.featureListContent}><strong>Audit Trail:</strong> Vollständige Dokumentation jedes Schritts (Zeitstempel, IP, Gerät)</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔒</span>
                <span className={styles.featureListContent}><strong>Versiegeltes PDF:</strong> Rechtssicheres, unveränderliches Dokument nach Abschluss</span>
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
                  <strong>Vertrag vorbereiten:</strong> Laden Sie Ihren Vertrag hoch und definieren Sie Signaturfelder für jeden Unterzeichner.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>E-Mail versenden:</strong> Geben Sie E-Mail-Adressen der Unterzeichner ein – sie erhalten automatisch einen Link zum Signieren.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Versiegeltes PDF erhalten:</strong> Nach der letzten Signatur erhalten Sie ein rechtssicheres PDF mit Audit Trail.
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
                  <h3 className={styles.vorteilTitle}>E-Mail-Versand</h3>
                  <p className={styles.vorteilText}>Senden Sie Signier-Links automatisch per E-Mail. Unterzeichner brauchen weder Login noch Software.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Echtzeit-Status</h3>
                  <p className={styles.vorteilText}>Verfolgen Sie in Echtzeit, wer bereits signiert hat, wer noch aussteht, und wer das Dokument geöffnet hat.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Audit Trail</h3>
                  <p className={styles.vorteilText}>Jeder Schritt wird protokolliert: Zeitstempel, IP-Adresse, Gerät, Standort. Rechtlich beweiskräftig.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Versiegeltes PDF</h3>
                  <p className={styles.vorteilText}>Nach Abschluss erhalten Sie ein unveränderliches, rechtssicheres PDF mit allen Signaturen und Audit Trail.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>eIDAS-konform</h3>
                  <p className={styles.vorteilText}>Rechtlich bindend in Deutschland und der gesamten EU nach eIDAS-Verordnung.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Mehrere Unterzeichner</h3>
                  <p className={styles.vorteilText}>Definieren Sie Signierreihenfolge oder lassen Sie alle gleichzeitig signieren. Flexibel und einfach.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>Typische Anwendungsfälle</h2>
            <div className={styles.useCaseGrid}>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Arbeitsverträge</h3>
                <p className={styles.useCaseChallenge}><strong>Szenario:</strong> Neuer Mitarbeiter soll schnell starten</p>
                <p className={styles.useCaseSolution}><strong>Lösung:</strong> Arbeitsvertrag digital signieren lassen – in Minuten statt Tagen</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Kaufverträge & NDAs</h3>
                <p className={styles.useCaseChallenge}><strong>Szenario:</strong> Geschäftspartner sind remote oder im Ausland</p>
                <p className={styles.useCaseSolution}><strong>Lösung:</strong> Signatur per E-Mail – ohne Postweg oder Scan</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Freelancer-Verträge</h3>
                <p className={styles.useCaseChallenge}><strong>Szenario:</strong> Projekt soll sofort starten</p>
                <p className={styles.useCaseSolution}><strong>Lösung:</strong> Vertrag digital versenden und in Echtzeit verfolgen</p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Mehrparteien-Verträge</h3>
                <p className={styles.useCaseChallenge}><strong>Szenario:</strong> 3+ Unterzeichner an verschiedenen Orten</p>
                <p className={styles.useCaseSolution}><strong>Lösung:</strong> Signierreihenfolge definieren, Tracking in Echtzeit</p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <CheckCircle size={32} />
              </div>
              <p className={styles.beispielText}>
                "Statt 2 Wochen Postweg haben wir den Vertrag in 15 Minuten komplett unterschrieben. Der Audit Trail gibt uns volle Sicherheit."
              </p>
              <p className={styles.beispielHinweis}>
                Feedback eines Unternehmenskunden
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Contract AI?</h2>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🔒</span>
                <span className={styles.featureListContent}><strong>Rechtssicher:</strong> eIDAS-konform, rechtlich bindend in Deutschland und EU</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📋</span>
                <span className={styles.featureListContent}><strong>Vollständiger Audit Trail:</strong> Jeder Schritt dokumentiert (Zeitstempel, IP, Gerät)</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚡</span>
                <span className={styles.featureListContent}><strong>Blitzschnell:</strong> In Minuten statt Tagen – kein Postweg mehr nötig</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📧</span>
                <span className={styles.featureListContent}><strong>Einfacher Versand:</strong> Per E-Mail – Unterzeichner brauchen keinen Account</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🇩🇪</span>
                <span className={styles.featureListContent}><strong>Deutsche Server:</strong> DSGVO-konform, Speicherung in Frankfurt</span>
              </li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Sicherheit & Rechtssicherheit</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Digitale Signaturen mit Contract AI entsprechen der eIDAS-Verordnung und sind rechtlich bindend.
                Jeder Signiervorgang wird mit vollständigem Audit Trail dokumentiert – beweiskräftig vor Gericht.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>100%</div>
                  <div className={styles.statLabel}>eIDAS-konform</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>{'< 15min'}</div>
                  <div className={styles.statLabel}>Durchschnittliche Signaturzeit</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>🇪🇺</div>
                  <div className={styles.statLabel}>EU-weit gültig</div>
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
                  Ist die digitale Signatur rechtssicher?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, digitale Signaturen mit Contract AI entsprechen der eIDAS-Verordnung und sind in Deutschland und der gesamten EU rechtlich bindend. Jeder Signiervorgang wird mit vollständigem Audit Trail dokumentiert.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie funktioniert der Signaturprozess?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Sie laden Ihren Vertrag hoch, definieren Signaturfelder, und senden eine E-Mail an die Unterzeichner. Diese erhalten einen Link, öffnen das Dokument im Browser und signieren per Mausklick – ohne Login oder Software-Installation.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was ist ein Audit Trail?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Der Audit Trail protokolliert jeden Schritt des Signierprozesses: Wer hat wann, wo und wie signiert (IP-Adresse, Zeitstempel, Gerät, Standort). Das versiegelte PDF mit Audit Trail ist rechtlich beweiskräftig.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Können mehrere Personen gleichzeitig signieren?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, Sie können entweder eine Signierreihenfolge definieren oder alle Unterzeichner gleichzeitig einladen. Sie sehen in Echtzeit, wer bereits signiert hat.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Brauchen Unterzeichner einen Account?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Nein, Unterzeichner erhalten einen Link per E-Mail und können direkt im Browser signieren – ohne Registrierung oder Software-Installation.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie sieht das versiegelte PDF aus?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Das versiegelte PDF enthält alle Signaturen, einen vollständigen Audit Trail auf der letzten Seite und ein digitales Siegel. Es ist rechtlich beweiskräftig und kann nicht nachträglich verändert werden.</p>
              </details>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Verträge in Minuten rechtssicher signieren lassen</h2>
              <p className={styles.ctaSubtitle}>
                Über 95% unserer Nutzer schließen den Signaturprozess in unter 15 Minuten ab. Probieren Sie es jetzt kostenlos aus!
              </p>
              <div className={styles.ctaButtons}>
                <button
                  className={styles.secondaryButtonLight}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  So funktioniert die Signatur
                </button>
                <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Jetzt kostenlos testen">
                  ✍️ Jetzt kostenlos testen
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

export default DigitaleSignatur;

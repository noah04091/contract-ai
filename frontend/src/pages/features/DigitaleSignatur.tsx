import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { PenTool, CheckCircle, Mail } from "lucide-react";

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
        <meta property="og:description" content="✍️ Verträge rechtssicher digital signieren lassen. E-Mail, Tracking, Audit Trail. eIDAS-konform. Jetzt testen!" />
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
            <PenTool size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Verträge rechtssicher signieren – <span className={styles.heroTitleHighlight}>digital</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Schluss mit Ausdrucken, Scannen und Versenden. Lassen Sie Verträge einfach digital signieren – mit E-Mail-Benachrichtigung, Echtzeit-Tracking und vollständigem Audit Trail. Rechtssicher nach eIDAS-Verordnung.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Vertrag jetzt signieren lassen">
              ✍️ Vertrag jetzt signieren lassen
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie die Signatur funktioniert">
              Wie die Signatur funktioniert
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
              🔒 eIDAS-konform
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              📋 Vollständiger Audit Trail
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚡ In Minuten fertig
            </span>
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
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📧 <strong>E-Mail-Benachrichtigung:</strong> Unterzeichner erhalten automatisch einen Link zum Signieren</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📊 <strong>Echtzeit-Tracking:</strong> Sehen Sie, wer bereits signiert hat und wer noch aussteht</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📋 <strong>Audit Trail:</strong> Vollständige Dokumentation jedes Schritts (Zeitstempel, IP, Gerät)</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🔒 <strong>Versiegeltes PDF:</strong> Rechtssicheres, unveränderliches Dokument nach Abschluss</li>
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
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '40px' }}>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Arbeitsverträge</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Szenario:</strong> Neuer Mitarbeiter soll schnell starten</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Lösung:</strong> Arbeitsvertrag digital signieren lassen – in Minuten statt Tagen</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Kaufverträge & NDAs</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Szenario:</strong> Geschäftspartner sind remote oder im Ausland</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Lösung:</strong> Signatur per E-Mail – ohne Postweg oder Scan</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Freelancer-Verträge</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Szenario:</strong> Projekt soll sofort starten</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Lösung:</strong> Vertrag digital versenden und in Echtzeit verfolgen</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Mehrparteien-Verträge</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Szenario:</strong> 3+ Unterzeichner an verschiedenen Orten</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Lösung:</strong> Signierreihenfolge definieren, Tracking in Echtzeit</p>
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
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🔒 <strong>Rechtssicher:</strong> eIDAS-konform, rechtlich bindend in Deutschland und EU</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📋 <strong>Vollständiger Audit Trail:</strong> Jeder Schritt dokumentiert (Zeitstempel, IP, Gerät)</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>⚡ <strong>Blitzschnell:</strong> In Minuten statt Tagen – kein Postweg mehr nötig</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📧 <strong>Einfacher Versand:</strong> Per E-Mail – Unterzeichner brauchen keinen Account</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🇩🇪 <strong>Deutsche Server:</strong> DSGVO-konform, Speicherung in Frankfurt</li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle} style={{ color: 'white' }}>Sicherheit & Rechtssicherheit</h2>
              <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
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
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Ist die digitale Signatur rechtssicher?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, digitale Signaturen mit Contract AI entsprechen der eIDAS-Verordnung und sind in Deutschland und der gesamten EU rechtlich bindend. Jeder Signiervorgang wird mit vollständigem Audit Trail dokumentiert.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Wie funktioniert der Signaturprozess?</summary>
                <p style={{ margin: '0', color: '#666' }}>Sie laden Ihren Vertrag hoch, definieren Signaturfelder, und senden eine E-Mail an die Unterzeichner. Diese erhalten einen Link, öffnen das Dokument im Browser und signieren per Mausklick – ohne Login oder Software-Installation.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Was ist ein Audit Trail?</summary>
                <p style={{ margin: '0', color: '#666' }}>Der Audit Trail protokolliert jeden Schritt des Signierprozesses: Wer hat wann, wo und wie signiert (IP-Adresse, Zeitstempel, Gerät, Standort). Das versiegelte PDF mit Audit Trail ist rechtlich beweiskräftig.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Können mehrere Personen gleichzeitig signieren?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, Sie können entweder eine Signierreihenfolge definieren oder alle Unterzeichner gleichzeitig einladen. Sie sehen in Echtzeit, wer bereits signiert hat.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Brauchen Unterzeichner einen Account?</summary>
                <p style={{ margin: '0', color: '#666' }}>Nein, Unterzeichner erhalten einen Link per E-Mail und können direkt im Browser signieren – ohne Registrierung oder Software-Installation.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Wie sieht das versiegelte PDF aus?</summary>
                <p style={{ margin: '0', color: '#666' }}>Das versiegelte PDF enthält alle Signaturen, einen vollständigen Audit Trail auf der letzten Seite und ein digitales Siegel. Es ist rechtlich beweiskräftig und kann nicht nachträglich verändert werden.</p>
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
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
                <button
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
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

      <Footer />
    </>
  );
};

export default DigitaleSignatur;

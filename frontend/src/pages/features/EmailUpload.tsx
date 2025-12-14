import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { Mail, CheckCircle, FileText, Shield, Zap } from "lucide-react";

const EmailUpload: React.FC = () => {
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
        "name": "Ist der E-Mail-Upload sicher?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, der E-Mail-Upload ist vollständig DSGVO-konform. E-Mails werden nicht gespeichert, nur die PDF-Anhänge werden verschlüsselt übertragen und auf deutschen Servern in Frankfurt gespeichert."
        }
      },
      {
        "@type": "Question",
        "name": "Wie funktioniert der E-Mail-Upload?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nach der Registrierung erhalten Sie eine persönliche E-Mail-Adresse. Leiten Sie einfach E-Mails mit PDF-Anhängen dorthin weiter. Das System erkennt die PDFs automatisch und lädt sie in Ihr Dashboard hoch – ohne manuelle Eingabe."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Dateiformate werden unterstützt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Aktuell werden ausschließlich PDF-Dateien unterstützt (max. 15 MB). Andere Formate werden automatisch ignoriert."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Automatischer E-Mail-Upload - Verträge per E-Mail hochladen | Contract AI</title>
        <meta name="description" content="📧 Laden Sie Verträge per E-Mail hoch – vollautomatisch! Einfach weiterleiten, automatisch verarbeiten. DSGVO-konform, sicher, von überall. Jetzt testen!" />
        <meta name="keywords" content="E-Mail Upload, Vertrag hochladen, automatischer Upload, E-Mail Weiterleitung, Contract AI, DSGVO, LegalTech" />

        <link rel="canonical" href="https://www.contract-ai.de/features/email-upload" />
        <meta name="robots" content="index,follow" />

        {/* Open Graph */}
        <meta property="og:title" content="Automatischer E-Mail-Upload - Verträge per E-Mail hochladen" />
        <meta property="og:description" content="📧 Verträge per E-Mail hochladen – vollautomatisch! Einfach weiterleiten, automatisch verarbeitet und sicher gespeichert. Jetzt testen!" />
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
          <Mail className={styles.floatingIcon} size={28} />
          <Shield className={styles.floatingIcon} size={24} />
          <FileText className={styles.floatingIcon} size={22} />
          <CheckCircle className={styles.floatingIcon} size={26} />
          <Zap className={styles.floatingIcon} size={20} />
          <Mail className={styles.floatingIcon} size={24} />
          <FileText className={styles.floatingIcon} size={22} />
          <Shield className={styles.floatingIcon} size={20} />
        </div>

        <div className={styles.featureContainer}>

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <Mail size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Verträge per E-Mail hochladen – <span className={styles.heroTitleHighlight}>vollautomatisch</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Leiten Sie E-Mails mit Vertragsanhängen einfach an Ihre persönliche Contract AI E-Mail-Adresse weiter. Das System erkennt PDFs automatisch, lädt sie hoch und analysiert sie – ohne manuelle Eingabe.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Jetzt E-Mail-Adresse erhalten">
              📧 Jetzt E-Mail-Adresse erhalten
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie E-Mail-Upload funktioniert">
              Wie E-Mail-Upload funktioniert
            </a>
          </div>

          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <Shield size={16} className={styles.trustBadgeIcon} />
              <span>DSGVO-konform</span>
            </div>
            <div className={styles.trustBadge}>
              <Mail size={16} className={styles.trustBadgeIcon} />
              <span>E-Mails nicht gespeichert</span>
            </div>
            <div className={styles.trustBadge}>
              <Zap size={16} className={styles.trustBadgeIcon} />
              <span>Automatische Verarbeitung</span>
            </div>
          </div>
        </section>
        <div className={styles.contentContainer}>

          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum E-Mail-Upload so praktisch ist</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Mail size={20} />
                </div>
                <p className={styles.funktionText}>
                  Verträge kommen oft per E-Mail – vom Arbeitgeber, Vermieter, Versicherung oder Dienstleister. Diese E-Mails manuell zu öffnen, PDFs herunterzuladen und einzeln hochzuladen kostet Zeit und ist umständlich, vor allem unterwegs oder am Smartphone.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <CheckCircle size={20} />
                </div>
                <p className={styles.funktionText}>
                  Mit Contract AI leiten Sie E-Mails einfach an Ihre persönliche E-Mail-Adresse weiter. Das System erkennt PDF-Anhänge automatisch, lädt sie hoch, analysiert sie und speichert sie sicher in Ihrem Dashboard – ohne manuelle Eingabe.
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: Automatischer E-Mail-Upload</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Jeder Contract AI Nutzer erhält eine persönliche, einzigartige E-Mail-Adresse. Leiten Sie E-Mails mit Vertragsanhängen einfach dorthin weiter. Das System erkennt PDF-Dateien automatisch, lädt sie verschlüsselt hoch und analysiert sie mit KI. Der E-Mail-Betreff wird als Notiz gespeichert. Alles passiert im Hintergrund – Sie müssen nichts tun.
            </p>
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📧 <strong>Einfach weiterleiten:</strong> Kein manuelles Herunterladen oder Hochladen nötig</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🤖 <strong>Automatische Erkennung:</strong> PDFs werden sofort erkannt und verarbeitet</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📱 <strong>Funktioniert überall:</strong> Von jedem E-Mail-Postfach – Gmail, Outlook, Apple Mail, etc.</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🔒 <strong>Sicher & DSGVO-konform:</strong> E-Mails werden nicht gespeichert, nur die PDFs (verschlüsselt)</li>
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
                  <strong>E-Mail-Adresse erhalten:</strong> Nach der Registrierung bekommen Sie Ihre persönliche Contract AI E-Mail-Adresse (z.B. xyz123@inbox.contract-ai.de).
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>E-Mail weiterleiten:</strong> Leiten Sie E-Mails mit PDF-Verträgen an diese Adresse weiter – von jedem E-Mail-Client.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Automatische Verarbeitung:</strong> PDFs werden erkannt, hochgeladen, analysiert und verschlüsselt gespeichert.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>4</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Sofort verfügbar:</strong> Ihre Verträge erscheinen automatisch im Dashboard – mit KI-Analyse und Kündigungserinnerungen.
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
                  <h3 className={styles.vorteilTitle}>Keine manuelle Eingabe</h3>
                  <p className={styles.vorteilText}>Kein mühsames Herunterladen und Hochladen. Einfach E-Mail weiterleiten – das System erledigt den Rest automatisch.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Automatische PDF-Erkennung</h3>
                  <p className={styles.vorteilText}>Das System erkennt PDF-Anhänge automatisch und ignoriert andere Dateiformate. Nur Verträge werden verarbeitet.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>E-Mail-Betreff als Notiz</h3>
                  <p className={styles.vorteilText}>Der Betreff Ihrer E-Mail wird automatisch als Notiz zum Vertrag gespeichert – praktisch für Kontext.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Funktioniert überall</h3>
                  <p className={styles.vorteilText}>Gmail, Outlook, Apple Mail, Yahoo – von jedem E-Mail-Postfach, auf jedem Gerät.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Sichere Verschlüsselung</h3>
                  <p className={styles.vorteilText}>PDFs werden verschlüsselt übertragen und auf deutschen Servern (Frankfurt) gespeichert. DSGVO-konform.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Keine E-Mail-Speicherung</h3>
                  <p className={styles.vorteilText}>Wir speichern KEINE E-Mails. Nur die PDF-Anhänge und der Betreff werden verarbeitet – maximale Privatsphäre.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>Typische Anwendungsfälle</h2>
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '40px' }}>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Unterwegs auf dem Smartphone</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Szenario:</strong> Vertragsmail am Handy erhalten</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Lösung:</strong> Einfach weiterleiten – kein umständliches Download & Upload</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Integration mit anderen Tools</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Szenario:</strong> Verträge aus CRM oder ERP-System</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Lösung:</strong> Automatische Weiterleitung konfigurieren – vollständig automatisiert</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Verträge von Partnern/Kunden</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Szenario:</strong> Partner senden Verträge per E-Mail</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Lösung:</strong> Einfach CC an Contract AI – automatisch im System</p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Workflow-Automatisierung</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}><strong>Szenario:</strong> Viele Verträge, wenig Zeit</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>Lösung:</strong> E-Mail-Regeln aufsetzen – komplett automatischer Upload</p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <CheckCircle size={32} />
              </div>
              <p className={styles.beispielText}>
                "Ich leite einfach alle Vertrags-Mails an Contract AI weiter. Spart mir täglich 10-15 Minuten!"
              </p>
              <p className={styles.beispielHinweis}>
                Feedback eines Business-Nutzers
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Contract AI?</h2>
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🔒 <strong>Maximale Sicherheit:</strong> E-Mails werden NICHT gespeichert – nur PDFs (verschlüsselt)</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>⚡ <strong>Blitzschnell:</strong> PDFs werden in Sekunden erkannt und hochgeladen</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🤖 <strong>Vollautomatisch:</strong> Kein manuelles Eingreifen nötig – einfach weiterleiten</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📱 <strong>Überall nutzbar:</strong> Funktioniert von jedem E-Mail-Client, auf jedem Gerät</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🎯 <strong>Intelligente Verarbeitung:</strong> KI-Analyse + Kündigungserinnerungen inklusive</li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Sicherheit & Datenschutz</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Datenschutz hat höchste Priorität. E-Mails werden NICHT gespeichert – nur PDF-Anhänge und der Betreff. Verschlüsselte Übertragung und Speicherung auf deutschen Servern in Frankfurt.
                Vollständig DSGVO-konform. Löschung jederzeit möglich.
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
                  <div className={styles.statNumber}>0</div>
                  <div className={styles.statLabel}>E-Mails gespeichert</div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Ist der E-Mail-Upload sicher?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, vollständig. E-Mails werden NICHT gespeichert – nur PDF-Anhänge. Diese werden verschlüsselt übertragen und auf deutschen Servern (Frankfurt) gespeichert. Vollständig DSGVO-konform.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Muss ich mich einloggen, um Verträge per E-Mail hochzuladen?</summary>
                <p style={{ margin: '0', color: '#666' }}>Nein, absolut nicht. Sie leiten einfach E-Mails an Ihre persönliche Contract AI Adresse weiter. Das System verarbeitet alles automatisch im Hintergrund.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Welche Dateiformate werden unterstützt?</summary>
                <p style={{ margin: '0', color: '#666' }}>Aktuell werden ausschließlich PDF-Dateien unterstützt (max. 15 MB pro Datei). Andere Formate werden automatisch ignoriert.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Werden meine E-Mails gespeichert?</summary>
                <p style={{ margin: '0', color: '#666' }}>Nein, niemals. Wir speichern KEINE E-Mails. Nur PDF-Anhänge und der E-Mail-Betreff werden verarbeitet. Maximale Privatsphäre.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Funktioniert das mit jedem E-Mail-Anbieter?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, mit allen gängigen Anbietern: Gmail, Outlook, Apple Mail, Yahoo Mail, GMX, Web.de, etc. Funktioniert auf PC, Tablet und Smartphone.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Kann ich meine E-Mail-Adresse ändern?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, Sie können jederzeit eine neue persönliche E-Mail-Adresse generieren. Die alte Adresse wird dann ungültig.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Gibt es ein Upload-Limit?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, abhängig von Ihrem Plan: Free (1 E-Mail/Stunde), Premium (10 E-Mails/Stunde), Business (20 E-Mails/Stunde). Einzelne PDFs dürfen max. 15 MB groß sein.</p>
              </details>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Starten Sie mit automatischem E-Mail-Upload</h2>
              <p className={styles.ctaSubtitle}>
                Sparen Sie Zeit und laden Sie Verträge per E-Mail hoch – vollautomatisch, sicher und DSGVO-konform. Probieren Sie es jetzt kostenlos aus!
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
                <button
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  So funktioniert E-Mail-Upload
                </button>
                <Link to={target} className={styles.ctaButton} style={{ fontSize: '18px', padding: '16px 32px' }} aria-label="Jetzt kostenlos starten">
                  📧 Jetzt kostenlos starten
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

export default EmailUpload;

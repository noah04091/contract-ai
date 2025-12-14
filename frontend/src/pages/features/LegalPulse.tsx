import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { Activity, TrendingUp, AlertTriangle, Bell, Shield, CheckCircle } from "lucide-react";

const LegalPulse: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/legal-pulse";
  const target = isAuthenticated ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Legal Pulse – Contract AI | Verträge verstehen, optimieren, absichern";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Legal Pulse: Frühwarnsystem für Vertragsrisiken. Regelmäßige Checks, Risiko-Alerts, konkrete Empfehlungen. DSGVO-konform, Frankfurt. Jetzt testen.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Legal Pulse: Frühwarnsystem für Vertragsrisiken. Regelmäßige Checks, Risiko-Alerts, konkrete Empfehlungen. DSGVO-konform, Frankfurt. Jetzt testen.';
      document.head.appendChild(meta);
    }

    // Add canonical link
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://www.contract-ai.de/features/legal-pulse');
    } else {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = 'https://www.contract-ai.de/features/legal-pulse';
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
          <Activity className={styles.floatingIcon} size={28} />
          <Shield className={styles.floatingIcon} size={24} />
          <Bell className={styles.floatingIcon} size={22} />
          <CheckCircle className={styles.floatingIcon} size={26} />
          <TrendingUp className={styles.floatingIcon} size={20} />
          <AlertTriangle className={styles.floatingIcon} size={24} />
          <Activity className={styles.floatingIcon} size={22} />
          <Bell className={styles.floatingIcon} size={20} />
        </div>

        <div className={styles.featureContainer}>

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <Activity size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Legal Pulse – Ihr <span className={styles.heroTitleHighlight}>Frühwarnsystem</span> für Vertragsrisiken
          </h1>
          <p className={styles.heroSubtitle}>
            Gesetze ändern sich. Märkte bewegen sich. Legal Pulse prüft Ihre Verträge regelmäßig, erkennt neue Risiken und empfiehlt konkrete Updates.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <Link to={target} className={styles.ctaButton} aria-label="Legal Pulse aktivieren">
              Legal Pulse aktivieren
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Wie Legal Pulse arbeitet">
              Wie Legal Pulse arbeitet
            </a>
          </div>
          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <Activity size={16} className={styles.trustBadgeIcon} />
              <span>Regelmäßige Checks</span>
            </div>
            <div className={styles.trustBadge}>
              <AlertTriangle size={16} className={styles.trustBadgeIcon} />
              <span>Risiko-Alerts</span>
            </div>
            <div className={styles.trustBadge}>
              <TrendingUp size={16} className={styles.trustBadgeIcon} />
              <span>Empfehlungen</span>
            </div>
          </div>
        </section>

        <div className={styles.contentContainer}>
          
          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Stillstand ist Risiko</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <AlertTriangle size={20} />
                </div>
                <p className={styles.funktionText}>
                  Ein Vertrag, der heute passt, kann morgen Lücken haben – durch neue Rechtsprechung, Marktstandards oder Compliance-Anforderungen. DSGVO-Updates, veränderte Kündigungsregeln bei Abos, neue Arbeitsrechtsbestimmungen: Was gestern rechtssicher war, ist heute womöglich angreifbar oder unvollständig.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <TrendingUp size={20} />
                </div>
                <p className={styles.funktionText}>
                  Legal Pulse erkennt solche Veränderungen frühzeitig und übersetzt sie in verständliche, umsetzbare Empfehlungen. Statt selbst durch Rechtsprechungs-Updates zu kämpfen, bekommen Sie präzise To-Dos: „Klausel X in Vertrag Y anpassen", „Neue Informationspflicht ergänzen", „Haftungsbegrenzung erweitern".
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: Intelligentes Monitoring mit proaktiven Empfehlungen</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Legal Pulse überwacht kontinuierlich relevante Rechtsquellen und gleicht sie mit Ihren Verträgen ab. Relevante Änderungen werden thematisch klassifiziert (Datenschutz, Arbeitsrecht, Verbraucherschutz) und den betroffenen Klauseln zugeordnet. Sie erhalten nicht nur Warnungen, sondern konkrete Handlungsempfehlungen.
            </p>
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📊 <strong>Monitoring & Klassifikation:</strong> Relevante Änderungen werden thematisch zugeordnet und nach Auswirkung bewertet</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🎯 <strong>Risikobewertung:</strong> Auswirkung auf Ihre Verträge wird bewertet (niedrig/mittel/hoch) mit Priorisierung</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>💡 <strong>Konkrete Empfehlungen:</strong> Klare Textvorschläge und To-Dos, die Sie direkt übernehmen oder dem Optimierer übergeben können</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📋 <strong>Audit-Protokoll:</strong> Alle Anpassungen werden dokumentiert – für interne Audits und Compliance-Nachweise</li>
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
                  <strong>Vertragsbestand einrichten:</strong> Ihre wichtigsten Verträge mit Legal Pulse verknüpfen – automatische Kategorisierung nach Branche und Vertragstyp.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Kontinuierliches Monitoring:</strong> 24/7-Überwachung von Rechtsquellen, Klassifikation relevanter Änderungen und Abgleich mit Ihren Verträgen.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Proaktive Alerts & Updates:</strong> Sofortige Benachrichtigung bei relevanten Änderungen mit konkreten Handlungsempfehlungen und Textvorschlägen.
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
                  <h3 className={styles.vorteilTitle}>Kontinuierliches Monitoring</h3>
                  <p className={styles.vorteilText}>24/7-Überwachung relevanter Rechtsquellen, Rechtsprechung und Compliance-Entwicklungen.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Intelligente Klassifikation</h3>
                  <p className={styles.vorteilText}>Automatische Zuordnung zu Themenbereichen: Datenschutz, Arbeitsrecht, Verbraucherschutz, Branchenspezifisches.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Risiko-Priorisierung</h3>
                  <p className={styles.vorteilText}>Bewertung der Auswirkungen: niedrig/mittel/hoch mit klarer Priorisierung der Handlungen.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Konkrete Handlungsempfehlungen</h3>
                  <p className={styles.vorteilText}>Nicht nur Warnungen, sondern klare To-Dos und Textvorschläge für notwendige Anpassungen.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Compliance-Dokumentation</h3>
                  <p className={styles.vorteilText}>Vollständige Nachverfolgung aller Änderungen für interne Audits und Compliance-Berichte.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Nahtlose Integration</h3>
                  <p className={styles.vorteilText}>Direkter Transfer der Empfehlungen in Optimierer oder Generator zur sofortigen Umsetzung.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>Wenn sich die Welt ändert – bleibt Ihr Vertrag aktuell</h2>
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '40px' }}>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Datenschutz</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Neue EU-Vorgaben zur Datenverarbeitung</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ Aktualisierung der AV-Verträge & Informationspflichten</strong></p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Arbeitsrecht</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Neue Homeoffice-Regelungen</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ Ergänzungen zu Arbeitszeiten, Datenschutz, Equipment</strong></p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Verbraucherschutz</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Einfachere Kündigungen bei Abos</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ Anpassung von Kündigungswegen & Fristen</strong></p>
              </div>
              <div style={{ background: '#f8fbff', border: '1px dashed #d7e0ef', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', color: '#1d1d1f' }}>Lieferketten</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Neue Nachweispflichten</p>
                <p style={{ margin: '0', fontSize: '14px', color: '#333' }}><strong>→ Klarere Dokumentations- und Prüfpflichten im Vertrag</strong></p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <Bell size={32} />
              </div>
              <p className={styles.beispielText}>
                "Legal Pulse hat uns vor einem kostspieligen Compliance-Verstoß bewahrt. Die DSGVO-Anpassung kam 3 Monate vor der ersten Prüfung."
              </p>
              <p className={styles.beispielHinweis}>
                Compliance-Managerin eines SaaS-Unternehmens
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Contract AI?</h2>
            <ul style={{ fontSize: '16px', lineHeight: '1.7', maxWidth: '800px', margin: '0 auto' }}>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🤖 <strong>KI-basiertes Monitoring</strong> statt manueller Newsletter – nur relevante Änderungen werden erfasst und bewertet</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🇪🇺 <strong>Server in Deutschland (Frankfurt)</strong>, volle DSGVO-Konformität und EU-Datenschutz</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🎯 <strong>Vertragskontext-spezifisch:</strong> Warnungen nur für Bereiche, die Ihre Verträge tatsächlich betreffen</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>📝 <strong>Umsetzbare Empfehlungen</strong> – nicht nur "Achtung", sondern konkrete Formulierungsvorschläge</li>
              <li style={{ margin: '12px 0', color: '#2a3440' }}>🔄 <strong>Nahtlose Workflow-Integration:</strong> Empfehlungen direkt in Optimierer oder Generator übernehmen</li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Sicherheit & Datenschutz</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Legal Pulse arbeitet ausschließlich mit öffentlich zugänglichen Rechtsquellen und offiziellen Publikationen. 
                Ihre Vertragsdaten werden verschlüsselt auf EU-Servern verarbeitet, keine Weitergabe an Dritte.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>24/7</div>
                  <div className={styles.statLabel}>Monitoring aktiv</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>∅ 48h</div>
                  <div className={styles.statLabel}>Alert-Reaktionszeit</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>100+</div>
                  <div className={styles.statLabel}>Überwachte Rechtsquellen</div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Welche Rechtsquellen überwacht Legal Pulse?</summary>
                <p style={{ margin: '0', color: '#666' }}>Offizielle EU- und deutsche Rechtsquellen: Bundesanzeiger, EU-Amtsblätter, BGH/BVerfG-Entscheidungen, Ministerialblätter, Branchenverbände. Keine Blogs oder ungeprüfte Quellen.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Wie aktuell sind die Informationen?</summary>
                <p style={{ margin: '0', color: '#666' }}>Legal Pulse prüft kontinuierlich und reagiert binnen 48 Stunden auf relevante Änderungen. Bei kritischen Updates (z.B. sofortige Compliance-Anforderungen) erfolgen Eilmeldungen.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Kann ich die Alerts anpassen?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, Sie können Themenbereiche und Risikostufen filtern. Wollen Sie nur kritische DSGVO-Updates? Oder alle arbeitsrechtlichen Änderungen? Vollständig konfigurierbar.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Gibt es auch branchenspezifische Überwachung?</summary>
                <p style={{ margin: '0', color: '#666' }}>Ja, Legal Pulse erkennt Ihren Geschäftsbereich und fokussiert auf relevante Regelungen: FinTech, SaaS, E-Commerce, Immobilien, Handwerk, Gesundheitswesen etc.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Wie werden die Empfehlungen umgesetzt?</summary>
                <p style={{ margin: '0', color: '#666' }}>Per Klick übertragen Sie Empfehlungen direkt in den Optimierer oder Generator. Alternativ Export als Checklist für Ihren Anwalt oder interne Prüfung.</p>
              </details>
              <details style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e7ecf2', borderRadius: '12px' }}>
                <summary style={{ fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>Was kostet Legal Pulse?</summary>
                <p style={{ margin: '0', color: '#666' }}>Legal Pulse ist ab dem Business-Plan (49€/Monat) enthalten. Free- und Premium-Nutzer erhalten monatliche Zusammenfassungen der wichtigsten Änderungen.</p>
              </details>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Proaktiv statt reaktiv – halten Sie Ihre Verträge up to date</h2>
              <p className={styles.ctaSubtitle}>
                Erkennen Sie Risiken bevor sie zum Problem werden. Legal Pulse überwacht, warnt und empfiehlt – Sie setzen um.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
                <button 
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Wie Legal Pulse arbeitet
                </button>
                <Link to={target} className={styles.ctaButton} aria-label="Legal Pulse aktivieren">
                  Legal Pulse aktivieren
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

export default LegalPulse;
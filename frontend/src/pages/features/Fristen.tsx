import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import { Calendar, Clock, AlertCircle, Mail, Shield, CheckCircle } from "lucide-react";

const Fristen: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/deadlines";
  const target = isAuthenticated ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Fristenkalender – Contract AI | Verträge verstehen, optimieren, absichern";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Nie wieder Kündigungsfristen verpassen. KI erkennt Fristen automatisch, erinnert rechtzeitig. DSGVO-konform, Server in Frankfurt. Jetzt testen.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Nie wieder Kündigungsfristen verpassen. KI erkennt Fristen automatisch, erinnert rechtzeitig. DSGVO-konform, Server in Frankfurt. Jetzt testen.';
      document.head.appendChild(meta);
    }

    // Add canonical link
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://www.contract-ai.de/features/fristenkalender');
    } else {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = 'https://www.contract-ai.de/features/fristenkalender';
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
          <Calendar className={styles.floatingIcon} size={28} />
          <Shield className={styles.floatingIcon} size={24} />
          <Clock className={styles.floatingIcon} size={22} />
          <CheckCircle className={styles.floatingIcon} size={26} />
          <Mail className={styles.floatingIcon} size={20} />
          <AlertCircle className={styles.floatingIcon} size={24} />
          <Calendar className={styles.floatingIcon} size={22} />
          <Clock className={styles.floatingIcon} size={20} />
        </div>

        <div className={styles.featureContainer}>

        {/* HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <Calendar size={64} />
          </div>
          <h1 className={styles.heroTitle}>
            Nie wieder <span className={styles.heroTitleHighlight}>Kündigungsfristen verpassen</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Contract AI erkennt Fristen automatisch in Ihren Verträgen und erinnert Sie rechtzeitig – per E-Mail und Kalenderintegration.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <Link to={target} className={styles.ctaButton} aria-label="Zum Fristenkalender">
              Zum Fristenkalender
            </Link>
            <a href="#so-funktionierts" style={{ background: 'rgba(255,255,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }} aria-label="Mehr über Erinnerungen">
              Mehr über Erinnerungen
            </a>
          </div>
          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <Calendar size={16} className={styles.trustBadgeIcon} />
              <span>Automatische Erkennung</span>
            </div>
            <div className={styles.trustBadge}>
              <Mail size={16} className={styles.trustBadgeIcon} />
              <span>E-Mail-Reminder</span>
            </div>
            <div className={styles.trustBadge}>
              <CheckCircle size={16} className={styles.trustBadgeIcon} />
              <span>Google/Outlook/iCal</span>
            </div>
          </div>
        </section>

        <div className={styles.contentContainer}>
          
          {/* PAIN */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Automatische Verlängerungen – die teure Falle</h2>
            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <AlertCircle size={20} />
                </div>
                <p className={styles.funktionText}>
                  Versicherungen, Mobilfunkverträge, SaaS-Abos oder Mietverträge verlängern sich oft automatisch. Wer Kündigungsfristen verpasst, zahlt weiter – teils über Jahre. Ein übersehener Stichtag kann Sie Hunderte oder Tausende Euro kosten. Besonders ärgerlich: Die wichtigen Termine stehen meist im Kleingedruckten versteckt.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Clock size={20} />
                </div>
                <p className={styles.funktionText}>
                  Der Fristenkalender nimmt Ihnen das Risiko ab, indem er Fristen aus Verträgen herausliest und Erinnerungen setzt. Keine manuellen Kalendereinträge, keine vergessenen Stichtage, keine bösen Überraschungen bei der nächsten Abrechnung. Sie behalten die Kontrolle über Ihre Verträge.
                </p>
              </div>
            </div>
          </section>

          {/* SOLUTION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Die Lösung: Intelligente Fristenerkennung mit automatischen Erinnerungen</h2>
            <p className={styles.funktionText} style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
              Contract AI scannt Ihre Verträge nach allen relevanten Fristen und Stichtagen. Die KI erkennt nicht nur offensichtliche Termine, sondern findet auch versteckte Kündigungsfristen, Mindestlaufzeiten und Verlängerungsregeln – selbst wenn sie in kompliziertem Juristendeutsch formuliert sind.
            </p>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📋</span>
                <span className={styles.featureListContent}><strong>Erkennung von Fristen & Laufzeiten:</strong> KI extrahiert Kündigungsfristen, Mindestlaufzeiten, Verlängerungsregeln und relevante Stichtage</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⏰</span>
                <span className={styles.featureListContent}><strong>Erinnerungen nach Wunsch:</strong> Legen Sie fest, wann Sie erinnert werden möchten (90/60/30/14 Tage vorher)</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📱</span>
                <span className={styles.featureListContent}><strong>Kalenderintegration:</strong> Ein Klick übernimmt Fristen in Google, Outlook oder iCal – automatisch synchronisiert</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>👥</span>
                <span className={styles.featureListContent}><strong>Teilen & Verantwortlichkeiten:</strong> Weisen Sie Fristen Teammitgliedern zu – ideal für Unternehmen mit vielen Verträgen</span>
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
                  <strong>Vertrag hochladen:</strong> PDF oder DOCX Ihres Vertrags hochladen – die KI scannt automatisch nach Fristen und Stichtagen.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>2</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Fristen-Extraktion:</strong> Intelligente Erkennung aller Kündigungsfristen, Verlängerungsregeln und wichtiger Termine – auch versteckte.
                </p>
              </div>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#007aff' }}>3</span>
                </div>
                <p className={styles.funktionText}>
                  <strong>Automatische Erinnerungen:</strong> E-Mail-Benachrichtigungen und Kalendereinträge rechtzeitig vor Ablauf der Fristen.
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
                  <h3 className={styles.vorteilTitle}>Automatische Fristenerkennung</h3>
                  <p className={styles.vorteilText}>KI findet alle Kündigungsfristen, Mindestlaufzeiten und Verlängerungsregeln – auch versteckte.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Flexible Erinnerungen</h3>
                  <p className={styles.vorteilText}>Mehrere Benachrichtigungen nach Ihren Wünschen: 90, 60, 30, 14 Tage vor dem Stichtag.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Kalender-Synchronisation</h3>
                  <p className={styles.vorteilText}>Nahtlose Integration in Google Kalender, Outlook oder iCal mit automatischen Updates.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Team-Funktionen</h3>
                  <p className={styles.vorteilText}>Fristen an Kollegen zuweisen, Verantwortlichkeiten definieren und gemeinsam verwalten.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Smart-Berechnung</h3>
                  <p className={styles.vorteilText}>Automatische Berechnung von Kündigungsstichtagen basierend auf komplexen Vertragsklauseln.</p>
                </div>
                <div className={styles.vorteilCard}>
                  <h3 className={styles.vorteilTitle}>Verlaufs-Tracking</h3>
                  <p className={styles.vorteilText}>Alle Vertragsfristen im Überblick mit Historie und Dokumentation der Aktionen.</p>
                </div>
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section className={styles.beispielSection}>
            <h2 className={styles.sectionTitle}>Typische Szenarien</h2>
            <div className={styles.useCaseGrid}>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Versicherung</h3>
                <p className={styles.useCaseChallenge}>Laufzeit bis 31.12., Kündigungsfrist 3 Monate</p>
                <p className={styles.useCaseSolution}><strong>→ Erinnerung am 30.09.</strong></p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>SaaS-Abo</h3>
                <p className={styles.useCaseChallenge}>Verlängerung jährlich am 15.05.</p>
                <p className={styles.useCaseSolution}><strong>→ Hinweis 14 Tage vorher.</strong></p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Mietvertrag</h3>
                <p className={styles.useCaseChallenge}>Kündigung mind. 3 Monate zum Monatsende</p>
                <p className={styles.useCaseSolution}><strong>→ Automatische Berechnung des Stichtags.</strong></p>
              </div>
              <div className={styles.useCaseCard}>
                <h3 className={styles.useCaseTitle}>Wartungsvertrag</h3>
                <p className={styles.useCaseChallenge}>Mindestlaufzeit 24 Monate</p>
                <p className={styles.useCaseSolution}><strong>→ Erinnerung zur Verhandlung 60 Tage vorher.</strong></p>
              </div>
            </div>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <Mail size={32} />
              </div>
              <p className={styles.beispielText}>
                "Seit dem Fristenkalender haben wir keine teure Verlängerung mehr übersehen. Das spart uns jedes Jahr Tausende Euro."
              </p>
              <p className={styles.beispielHinweis}>
                Feedback eines Unternehmenskunden mit 50+ Verträgen
              </p>
            </div>
          </section>

          {/* DIFFERENTIATION */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Warum Contract AI?</h2>
            <ul className={styles.featureList}>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🤖</span>
                <span className={styles.featureListContent}><strong>Intelligente KI-Erkennung</strong> statt manueller Eingabe – auch komplexe Fristen werden automatisch gefunden</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>🇪🇺</span>
                <span className={styles.featureListContent}><strong>Server in Deutschland (Frankfurt)</strong>, volle DSGVO-Konformität und EU-Datenschutz</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>📱</span>
                <span className={styles.featureListContent}><strong>Nahtlose Kalenderintegration</strong> mit Google, Outlook und iCal – keine Doppeleingaben nötig</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>⚡</span>
                <span className={styles.featureListContent}><strong>Mehrfach-Erinnerungen</strong> mit flexiblen Vorlaufzeiten – nie wieder einen Termin verpassen</span>
              </li>
              <li className={styles.featureListItem}>
                <span className={styles.featureListIcon}>👥</span>
                <span className={styles.featureListContent}><strong>Team-Features für Unternehmen</strong> – Zuweisungen, Verantwortlichkeiten, gemeinsame Verwaltung</span>
              </li>
            </ul>
          </section>

          {/* SECURITY */}
          <section className={styles.statsSection}>
            <div className={styles.contentContainer}>
              <h2 className={styles.sectionTitle}>Sicherheit & Datenschutz</h2>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: '40px', fontSize: '17px' }}>
                Ihre Vertragsdaten werden verschlüsselt übertragen und ausschließlich auf EU-Servern in Frankfurt verarbeitet. 
                Fristen-Extraktion erfolgt datenschutzkonform, keine Weitergabe an Dritte. Löschung jederzeit auf Wunsch möglich.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>100%</div>
                  <div className={styles.statLabel}>Fristenerkennung</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>∅ 30 Tage</div>
                  <div className={styles.statLabel}>Vorlaufzeit</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>€500+</div>
                  <div className={styles.statLabel}>Durchschnittliche Ersparnis</div>
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
                  Welche Arten von Fristen erkennt die KI?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Kündigungsfristen, Mindestlaufzeiten, automatische Verlängerungen, Zahlungsfristen, Gewährleistungszeiten und andere vertraglich relevante Stichtage. Auch komplexe Berechnungen wie "3 Monate zum Monatsende".</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau ist die automatische Erkennung?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Die KI erreicht eine Genauigkeit von über 95% bei Standardverträgen. Bei unklaren Formulierungen markiert sie potentielle Fristen zur manuellen Überprüfung.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich eigene Erinnerungszeiten festlegen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, Sie können für jeden Vertragstyp individuelle Vorlaufzeiten definieren. Standard sind 90, 60, 30 und 14 Tage, aber Sie können beliebige Zeiträume wählen.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Funktioniert die Kalenderintegration mit allen Anbietern?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, wir unterstützen Google Kalender, Outlook, Apple Kalender und alle iCal-kompatiblen Apps. Die Synchronisation erfolgt bidirektional.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was passiert bei Vertragsänderungen?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Bei Upload einer neuen Version erkennt die KI Änderungen an Fristen und aktualisiert automatisch alle Erinnerungen und Kalendereinträge.</p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Können Teams gemeinsam Fristen verwalten?
                  <span className={styles.faqIcon}>▼</span>
                </summary>
                <p className={styles.faqAnswer}>Ja, Sie können Fristen an Teammitglieder zuweisen, Verantwortlichkeiten definieren und gemeinsame Kalender erstellen. Ideal für Unternehmen mit vielen Verträgen.</p>
              </details>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Fristen im Griff – automatisch</h2>
              <p className={styles.ctaSubtitle}>
                Nie wieder wichtige Termine verpassen. Lassen Sie die KI Ihre Verträge überwachen und rechtzeitig erinnern.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
                <button 
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => document.getElementById('so-funktionierts')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Mehr über Erinnerungen
                </button>
                <Link to={target} className={styles.ctaButton} aria-label="Zum Fristenkalender">
                  Zum Fristenkalender
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

export default Fristen;
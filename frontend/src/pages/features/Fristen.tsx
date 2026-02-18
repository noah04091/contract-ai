import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import AutoPlayVideo from "../../components/AutoPlayVideo";
import {
  Calendar, Clock, AlertTriangle, Mail, Shield,
  ArrowRight, ChevronDown, Bell, FileText, Zap, Target, FolderOpen, Search
} from "lucide-react";

// Video
const fristenVideo = "/Videos/fristen.mp4";
import fristenImg from "../../assets/Fristen.webp";

const Fristen: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/calendar";
  const target = isAuthenticated ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

  // Scroll animation refs
  const animatedRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    animatedRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !animatedRefs.current.includes(el)) {
      animatedRefs.current.push(el);
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.contract-ai.de" },
      { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://www.contract-ai.de/features" },
      { "@type": "ListItem", "position": 3, "name": "Fristenkalender", "item": "https://www.contract-ai.de/features/fristen" }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Welche Arten von Fristen erkennt die KI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Kündigungsfristen, Mindestlaufzeiten, automatische Verlängerungen, Zahlungsfristen, Gewährleistungszeiten und andere vertraglich relevante Stichtage."
        }
      },
      {
        "@type": "Question",
        "name": "Wie genau ist die automatische Erkennung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die KI erreicht eine Genauigkeit von über 95% bei Standardverträgen."
        }
      },
      {
        "@type": "Question",
        "name": "Funktioniert die Kalenderintegration mit allen Anbietern?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, wir unterstützen Google Kalender, Outlook, Apple Kalender und alle iCal-kompatiblen Apps."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Kündigungsfrist nie wieder verpassen | Contract AI</title>
        <meta name="description" content="Nie wieder Kündigungsfristen verpassen! KI erkennt alle Fristen automatisch, erinnert per E-Mail & synchronisiert mit Google/Outlook Kalender. Wie AboAlarm, nur besser. ✓ Kostenlos starten" />
        <meta name="keywords" content="Kündigungsfrist vergessen, Kündigungsfrist verpassen, Fristenkalender, Vertragsfristen verwalten, Kündigungserinnerung, AboAlarm Alternative, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/fristen" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Kündigungsfrist nie wieder verpassen | Contract AI" />
        <meta property="og:description" content="Nie wieder Kündigungsfristen verpassen! KI erkennt Fristen automatisch, erinnert per E-Mail & Kalender. ✓ Kostenlos starten" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/fristen" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-fristen.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Kündigungsfrist nie wieder verpassen | Contract AI" />
        <meta name="twitter:description" content="Nie wieder Kündigungsfristen verpassen! KI erkennt Fristen automatisch, erinnert per E-Mail & Kalender. ✓ Kostenlos starten" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-fristen.png" />

        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <div className={styles.pageBackground}>
        {/* Ambient Orbs */}
        <div className={styles.ambientBg}>
          <div className={`${styles.ambientOrb} ${styles.orb1}`}></div>
          <div className={`${styles.ambientOrb} ${styles.orb2}`}></div>
          <div className={`${styles.ambientOrb} ${styles.orb3}`}></div>
        </div>

        {/* ==========================================
            HERO SECTION - V5 Side-by-Side Layout
            ========================================== */}
        <section className={styles.hero}>
          <div className={styles.containerLg}>
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeDot}></span>
                Intelligente Fristenverwaltung
              </div>

              <h1 className={styles.heroTitle}>
                Nie wieder Fristen<br/>
                <span className={styles.heroTitleHighlight}>verpassen</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Contract AI erkennt Fristen automatisch in Ihren Verträgen und
                erinnert Sie rechtzeitig – per E-Mail und Kalenderintegration.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Zum Fristenkalender
                  <ArrowRight size={20} />
                </Link>
                <a href="#video" className={styles.btnSecondary}>
                  Live-Demo ansehen
                </a>
              </div>
            </div>

            {/* Interactive Demo Visual */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Mail size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>E-Mail-Reminder</div>
                  <div className={styles.floatingSubtext}>Automatisch</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Kalender-Sync</div>
                  <div className={styles.floatingSubtext}>Google/Outlook</div>
                </div>
              </div>

              <div className={styles.demoWindow}>
                <div className={styles.demoHeader}>
                  <span className={`${styles.demoDot} ${styles.demoDotRed}`}></span>
                  <span className={`${styles.demoDot} ${styles.demoDotYellow}`}></span>
                  <span className={`${styles.demoDot} ${styles.demoDotGreen}`}></span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>März 2025</span>
                </div>
                <div className={styles.demoContent}>
                  {/* Mini Calendar Grid */}
                  <div style={{ padding: '4px 8px' }}>
                    {/* Weekday Headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
                      {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                        <div key={day} style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>{day}</div>
                      ))}
                    </div>
                    {/* Calendar Days */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                      {/* Empty cells for offset */}
                      {[null, null, null, null, null, 1, 2].map((d, i) => (
                        <div key={`w1-${i}`} style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', color: d ? '#334155' : 'transparent',
                          background: d === 1 ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                        }}>{d || '·'}</div>
                      ))}
                      {/* Week 2: 3-9 */}
                      {[3, 4, 5, 6, 7, 8, 9].map(d => (
                        <div key={`d-${d}`} style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', color: '#334155',
                          background: d === 7 ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                          border: d === 7 ? '1px solid rgba(234, 179, 8, 0.4)' : 'none'
                        }}>{d}</div>
                      ))}
                      {/* Week 3: 10-16 with deadline highlight */}
                      {[10, 11, 12, 13, 14, 15, 16].map(d => (
                        <div key={`d-${d}`} style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: d === 14 ? 700 : 400,
                          color: d === 14 ? '#fff' : '#334155',
                          background: d === 14 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
                          boxShadow: d === 14 ? '0 2px 8px rgba(239, 68, 68, 0.4)' : 'none'
                        }}>{d}</div>
                      ))}
                      {/* Week 4: 17-23 */}
                      {[17, 18, 19, 20, 21, 22, 23].map(d => (
                        <div key={`d-${d}`} style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', color: '#334155'
                        }}>{d}</div>
                      ))}
                      {/* Week 5: 24-30 with reminder */}
                      {[24, 25, 26, 27, 28, 29, 30].map(d => (
                        <div key={`d-${d}`} style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', color: '#334155',
                          background: d === 28 ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                          border: d === 28 ? '1px solid rgba(34, 197, 94, 0.4)' : 'none'
                        }}>{d}</div>
                      ))}
                    </div>
                  </div>
                  {/* Legend / Upcoming */}
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '10px', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', marginBottom: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                      <span style={{ fontSize: '11px', color: '#334155', flex: 1 }}>14. März – Kündigungsfrist</span>
                      <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>Dringend</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                      <span style={{ fontSize: '11px', color: '#64748b', flex: 1 }}>28. März – Erinnerung gesetzt</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <div className={styles.container}>
          <div className={styles.trustBadgesRow}>
            <div className={styles.trustBadge}>
              <Calendar size={18} />
              Automatische Erkennung
            </div>
            <div className={styles.trustBadge}>
              <Mail size={18} />
              E-Mail-Erinnerungen
            </div>
            <div className={styles.trustBadge}>
              <Shield size={18} />
              DSGVO-konform
            </div>
          </div>
        </div>

        {/* ==========================================
            VIDEO SECTION
            ========================================== */}
        <section className={styles.videoSection} id="video">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>So sieht's aus</span>
              <h2 className={styles.sectionTitle}>Der Fristenkalender in Aktion</h2>
              <p className={styles.sectionSubtitle}>
                Sehen Sie, wie Contract AI Fristen automatisch erkennt und Sie
                rechtzeitig erinnert.
              </p>
            </div>

            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo
                  src={fristenVideo}
                  poster={fristenImg}
                  alt="Fristenkalender Demo"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            PROBLEM SECTION
            ========================================== */}
        <section className={styles.problemSection} id="problem">
          <div className={styles.container}>
            <div className={styles.problemGrid}>
              <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Das Problem</span>
                <h2 className={styles.sectionTitleLeft}>Automatische Verlängerungen – die teure Falle</h2>
                <p className={styles.problemText}>
                  Versicherungen, Mobilfunkverträge, SaaS-Abos oder Mietverträge verlängern sich oft automatisch.
                  Wer Kündigungsfristen verpasst, zahlt weiter – teils über Jahre. Ein übersehener Stichtag
                  kann Sie Hunderte oder Tausende Euro kosten.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>67%</div>
                    <div className={styles.problemStatLabel}>verpassen mindestens eine Kündigungsfrist pro Jahr</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>500 EUR</div>
                    <div className={styles.problemStatLabel}>durchschnittliche Kosten pro verpasster Frist</div>
                  </div>
                </div>
              </div>

              <div className={`${styles.problemVisual} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.problemDoc}>
                  <div className={styles.problemDocHeader}>
                    <div className={styles.problemDocIcon}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className={styles.problemDocTitle}>Mobilfunkvertrag.pdf</div>
                      <div className={styles.problemDocSubtitle}>Automatische Verlängerung</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...verlängert sich automatisch um 12 Monate..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Frist verpasst!
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  +12 Monate gebunden
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SOLUTION SECTION
            ========================================== */}
        <section className={styles.solutionSection} id="solution">
          <div className={styles.container}>
            <div className={styles.solutionGrid}>
              <div className={`${styles.solutionVisual} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.solutionComparison}>
                  <div className={`${styles.comparisonCard} ${styles.before}`}>
                    <span className={styles.comparisonLabel}>Vorher</span>
                    <div className={styles.comparisonIcon}>
                      <AlertTriangle size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Manuelle Verwaltung</div>
                    <div className={styles.comparisonDesc}>
                      Kalendereinträge vergessen, Fristen übersehen, teure Verlängerungen.
                    </div>
                    <div className={styles.comparisonTime}>
                      <AlertTriangle size={16} />
                      67% verpassen Fristen
                    </div>
                  </div>

                  <div className={styles.comparisonArrow}>
                    <ArrowRight size={24} />
                  </div>

                  <div className={`${styles.comparisonCard} ${styles.after}`}>
                    <span className={styles.comparisonLabel}>Nachher</span>
                    <div className={styles.comparisonIcon}>
                      <Bell size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Automatische Erinnerungen</div>
                    <div className={styles.comparisonDesc}>
                      KI erkennt Fristen, erinnert rechtzeitig, Kalender synchronisiert.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      Keine Frist mehr verpassen
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>Intelligente Fristenerkennung mit KI</h2>
                <p className={styles.solutionText}>
                  Contract AI scannt Ihre Verträge nach allen relevanten Fristen und Stichtagen.
                  Die KI erkennt auch versteckte Kündigungsfristen, Mindestlaufzeiten und Verlängerungsregeln.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Calendar size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Automatische Erkennung</h4>
                      <p>KI findet alle Fristen, auch versteckte Klauseln</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Bell size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Flexible Erinnerungen</h4>
                      <p>90, 60, 30, 14 Tage – oder individuell</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Mail size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Kalender-Integration</h4>
                      <p>Google, Outlook, iCal – automatisch synchronisiert</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            WHY US SECTION
            ========================================== */}
        <section className={styles.whySection} id="why">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Ihre Vorteile</span>
              <h2 className={styles.sectionTitle}>Was der Fristenkalender bietet</h2>
              <p className={styles.sectionSubtitle}>
                Nie wieder wichtige Termine verpassen – automatisch und zuverlässig.
              </p>
            </div>

            <div className={styles.whyGrid}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Calendar size={28} />
                </div>
                <h3 className={styles.whyTitle}>Automatische Erkennung</h3>
                <p className={styles.whyDesc}>
                  KI findet alle Kündigungsfristen, Mindestlaufzeiten und
                  Verlängerungsregeln – auch versteckte.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Bell size={28} />
                </div>
                <h3 className={styles.whyTitle}>Flexible Erinnerungen</h3>
                <p className={styles.whyDesc}>
                  Mehrere Benachrichtigungen nach Ihren Wünschen: 90, 60, 30, 14 Tage
                  vor dem Stichtag.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Mail size={28} />
                </div>
                <h3 className={styles.whyTitle}>Kalender-Sync</h3>
                <p className={styles.whyDesc}>
                  Nahtlose Integration in Google Kalender, Outlook oder iCal
                  mit automatischen Updates.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Target size={28} />
                </div>
                <h3 className={styles.whyTitle}>Smart-Berechnung</h3>
                <p className={styles.whyDesc}>
                  Automatische Berechnung von Kündigungsstichtagen basierend
                  auf komplexen Klauseln.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            PROCESS SECTION - V5 Timeline with Line
            ========================================== */}
        <section className={styles.processSection} id="process">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>So funktioniert's</span>
              <h2 className={styles.sectionTitle}>In 3 Schritten zum Fristenkalender</h2>
              <p className={styles.sectionSubtitle}>
                Automatische Fristenerkennung und Erinnerungen – kinderleicht eingerichtet.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Vertrag hochladen</h3>
                    <p className={styles.processDesc}>
                      PDF oder DOCX Ihres Vertrags hochladen – die KI scannt automatisch nach Fristen und Stichtagen.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Fristen-Extraktion</h3>
                    <p className={styles.processDesc}>
                      Intelligente Erkennung aller Kündigungsfristen, Verlängerungsregeln und wichtiger Termine.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Automatische Erinnerungen</h3>
                    <p className={styles.processDesc}>
                      E-Mail-Benachrichtigungen und Kalendereinträge rechtzeitig vor Ablauf der Fristen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            STATS SECTION
            ========================================== */}
        <section className={styles.statsSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Unsere Zahlen</span>
              <h2 className={styles.sectionTitle}>Zuverlässige Fristenerkennung</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>95%+</div>
                <div className={styles.statLabel}>Erkennungsgenauigkeit</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>30 Tage</div>
                <div className={styles.statLabel}>Standard-Vorlaufzeit</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>500€+</div>
                <div className={styles.statLabel}>Durchschnittliche Ersparnis</div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            FAQ SECTION
            ========================================== */}
        <section className={styles.faqSection} id="faq">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Fragen & Antworten</span>
              <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Arten von Fristen erkennt die KI?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Kündigungsfristen, Mindestlaufzeiten, automatische Verlängerungen, Zahlungsfristen,
                  Gewährleistungszeiten und andere vertraglich relevante Stichtage. Auch komplexe
                  Berechnungen wie "3 Monate zum Monatsende".
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau ist die automatische Erkennung?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die KI erreicht eine Genauigkeit von über 95% bei Standardverträgen. Bei unklaren
                  Formulierungen markiert sie potenzielle Fristen zur manuellen Überprüfung.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich eigene Erinnerungszeiten festlegen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, Sie können für jeden Vertragstyp individuelle Vorlaufzeiten definieren.
                  Standard sind 90, 60, 30 und 14 Tage, aber Sie können beliebige Zeiträume wählen.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Funktioniert die Kalenderintegration mit allen Anbietern?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, wir unterstützen Google Kalender, Outlook, Apple Kalender und alle
                  iCal-kompatiblen Apps. Die Synchronisation erfolgt bidirektional.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was passiert bei Vertragsänderungen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Bei Upload einer neuen Version erkennt die KI Änderungen an Fristen und
                  aktualisiert automatisch alle Erinnerungen und Kalendereinträge.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ==========================================
            RELATED FEATURES
            ========================================== */}
        <section className={styles.relatedSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <h2 className={styles.sectionTitle}>Verwandte Funktionen</h2>
            </div>

            <div className={styles.relatedGrid}>
              <Link to="/features/vertragsverwaltung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><FolderOpen size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsverwaltung</div>
                  <div className={styles.relatedDescription}>
                    Alle Verträge zentral organisieren, kategorisieren und durchsuchen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><Search size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsanalyse</div>
                  <div className={styles.relatedDescription}>
                    KI-gestützte Analyse von Risiken und kritischen Klauseln
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/email-upload" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><Mail size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>E-Mail Upload</div>
                  <div className={styles.relatedDescription}>
                    Verträge per E-Mail hochladen – automatisch erkannt und importiert
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
            </div>
          </div>
        </section>

        {/* ==========================================
            CTA SECTION
            ========================================== */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={`${styles.ctaCard} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.ctaContent}>
                <h2 className={styles.ctaTitle}>
                  Fristen im Griff – automatisch
                </h2>
                <p className={styles.ctaSubtitle}>
                  Nie wieder wichtige Termine verpassen. Lassen Sie die KI Ihre Verträge
                  überwachen und rechtzeitig erinnern.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Jetzt kostenlos starten
                    <ArrowRight size={20} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      <Footer />
    </>
  );
};

export default Fristen;

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../hooks/useAuth";
import styles from "../styles/FeaturePage.module.css";
import Footer from "../components/Footer";
import {
  ArrowRight, ChevronDown, CheckCircle, Shield, Lock, MapPin, Clock,
  Users, UserPlus, FolderOpen, Code, Download, Activity, CreditCard, Zap,
  Briefcase, Home, Scale, FileText, FileSpreadsheet, AlertTriangle,
  Sparkles, BookOpen
} from "lucide-react";

const FuerAgenturen: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const primaryTarget = isAuthenticated ? "/contracts" : "/pricing";
  const secondaryTarget = isAuthenticated ? "/team" : "/register?plan=enterprise";

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
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.contract-ai.de"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Für Agenturen & Teams",
        "item": "https://www.contract-ai.de/fuer-agenturen"
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Kann ich Verträge meiner Kunden hochladen — ist das DSGVO-konform?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, absolut. Contract AI ist DSGVO-konform und alle Server stehen in Frankfurt am Main. Als Agentur, Verwaltung oder Berater bist du Auftragsverarbeiter im Sinne der DSGVO — wir stellen dir auf Anfrage einen kostenlosen Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO zur Verfügung. Eine DSGVO-konforme Verarbeitung von Mandanten- und Kundendokumenten ist damit vollständig abgesichert."
        }
      },
      {
        "@type": "Question",
        "name": "Wie funktioniert das Rollen-System im Team?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Es gibt drei Rollen: Admin (kann das Team verwalten, einladen, Rechte vergeben), Mitarbeiter (kann Verträge hochladen, analysieren und bearbeiten) und Viewer (Lesezugriff). So entscheidest du selbst, wer in deiner Agentur welche Verträge sehen darf — etwa, wenn du sensible Mandantenakten von normalen Lieferantenverträgen trennen willst."
        }
      },
      {
        "@type": "Question",
        "name": "Was passiert, wenn mein Team größer als 10 Personen wird?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Im Enterprise-Tarif sind bis zu 10 aktive Nutzer enthalten — ohne Aufpreis pro Sitz. Bei größeren Teams (z.B. Verwaltungen mit 25 Mitarbeitern oder Kanzleien mit mehreren Standorten) bieten wir individuelle Konditionen an. Schreib uns einfach kurz an info@contract-ai.de und wir machen dir ein faires Team-Angebot."
        }
      },
      {
        "@type": "Question",
        "name": "Bekomme ich eine zentrale Rechnung für mein Team?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja. Du als Account-Inhaber erhältst eine einzige monatliche oder jährliche Rechnung — DSGVO-konform mit Pflichtangaben nach § 14 UStG, automatisch per E-Mail und im Dashboard zum Download. Reverse-Charge nach § 13b UStG für EU-B2B-Kunden ist möglich. Deine Mitarbeiter selbst zahlen nichts — die Lizenzen werden zentral abgerechnet."
        }
      },
      {
        "@type": "Question",
        "name": "Gibt es eine API, mit der ich Contract AI in meine bestehende Software integriere?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja. Im Enterprise-Tarif erhältst du Zugang zur REST API von Contract AI. Du kannst damit Verträge automatisch hochladen, Analysen abrufen und Ergebnisse in deine Kanzleisoftware, dein CRM, deine Hausverwaltungssoftware oder dein DMS einspielen. Die vollständige API-Dokumentation findest du auf /api-docs."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich White-Label-Reports an meine Kunden weitergeben?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja. Im Enterprise-Tarif kannst du PDF-Analyse-Reports im White-Label-Modus exportieren — also ohne Contract-AI-Branding und mit deinem eigenen Logo. Ideal für Agenturen, die Vertragsanalysen als eigene Leistung an ihre Kunden weitergeben oder berechnen möchten."
        }
      },
      {
        "@type": "Question",
        "name": "Wo werden die Verträge gespeichert und wie sicher sind sie?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Alle Verträge werden ausschließlich auf europäischen Servern (Frankfurt am Main) verarbeitet und gespeichert. Die Übertragung erfolgt SSL-verschlüsselt mit 256-bit-Verschlüsselung, die Speicherung ist verschlüsselt im Ruhezustand. Es gibt kein Modell-Training mit deinen Daten und keine Weitergabe an Dritte — du bleibst jederzeit Eigentümer."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich jederzeit kündigen, wenn mein Team Contract AI doch nicht braucht?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja. Es gibt keine Mindestlaufzeit und keine Kündigungsfristen — du kannst jederzeit zum Ende der bezahlten Periode mit einem Klick im Dashboard kündigen. Zusätzlich gilt die 14-Tage-Geld-zurück-Garantie ohne Wenn und Aber: Wenn du innerhalb der ersten 14 Tage merkst, dass es nicht passt, erstatten wir den vollen Betrag."
        }
      }
    ]
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Contract AI für Agenturen & Teams",
    "serviceType": "Vertragsmanagement-Software",
    "provider": {
      "@type": "Organization",
      "name": "Contract AI",
      "url": "https://www.contract-ai.de"
    },
    "areaServed": {
      "@type": "Country",
      "name": "Deutschland"
    },
    "audience": [
      { "@type": "BusinessAudience", "audienceType": "Marketingagenturen" },
      { "@type": "BusinessAudience", "audienceType": "Immobilienverwaltungen" },
      { "@type": "BusinessAudience", "audienceType": "HR-Berater & People Ops" },
      { "@type": "BusinessAudience", "audienceType": "Kleine Kanzleien & Steuerberater" }
    ],
    "description": "Team-fähiges Vertragsmanagement mit KI-Vertragsanalyse, Rollen-System, gemeinsamen Vertragsordnern, REST API und White-Label-Reports — speziell für Agenturen, Immobilienverwalter, HR-Berater und kleine Kanzleien.",
    "offers": {
      "@type": "Offer",
      "price": "29",
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock",
      "url": "https://www.contract-ai.de/pricing",
      "description": "Enterprise-Tarif inkl. Team-Verwaltung für bis zu 10 Nutzer."
    }
  };

  return (
    <>
      <Helmet>
        <title>Vertragsmanagement für Agenturen & Teams – Contract AI</title>
        <meta name="description" content="Vertragsmanagement für Agenturen, Immobilienverwalter, HR-Berater & kleine Kanzleien. Team-Verwaltung für bis zu 10 Nutzer, KI-Analyse, REST API, White-Label-Reports — ab 29 €/Monat. DSGVO, Server DE." />
        <meta name="keywords" content="Vertragsmanagement Agentur, Vertragsmanagement Immobilienverwaltung, Software HR-Berater, Team Vertragsmanagement, Vertragsverwaltung Kanzlei, KI Vertragsprüfung Team, Mehrbenutzer Vertragsmanagement, Vertrags-Software Teams" />

        <link rel="canonical" href="https://www.contract-ai.de/fuer-agenturen" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Vertragsmanagement für Agenturen & Teams – Contract AI" />
        <meta property="og:description" content="Team-fähiges Vertragsmanagement für Agenturen, Verwaltungen, HR-Berater & Kanzleien. Bis zu 10 Nutzer inklusive. KI-Analyse, API, White-Label. Ab 29 €/Monat." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/fuer-agenturen" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertragsmanagement für Agenturen & Teams – Contract AI" />
        <meta name="twitter:description" content="Team-fähiges Vertragsmanagement für Agenturen, Verwaltungen, HR-Berater & Kanzleien. Bis zu 10 Nutzer inklusive. Ab 29 €/Monat." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />

        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(serviceSchema)}
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
            SECTION 1 — HERO
            ========================================== */}
        <section className={styles.hero}>
          <div className={styles.containerLg}>
            <div className={styles.heroContent} style={{ textAlign: 'center', margin: '0 auto', maxWidth: '900px' }}>
              <div className={styles.heroBadge} style={{ margin: '0 auto 24px' }}>
                <span className={styles.heroBadgeDot}></span>
                Für Agenturen, Verwaltungen & Berater
              </div>

              <h1 className={styles.heroTitle}>
                Vertragsmanagement<br/>
                <span className={styles.heroTitleHighlight}>für dein gesamtes Team.</span>
              </h1>

              <p className={styles.heroSubtitle} style={{ margin: '0 auto 40px', maxWidth: '720px' }}>
                Eine zentrale Plattform für Agenturen, Immobilienverwalter, HR-Freelancer und kleine
                Kanzleien. KI-Vertragsanalyse, gemeinsame Ordner, Rollen-System und REST API —
                alles inklusive ab <strong>29 € pro Monat für bis zu 10 Nutzer</strong>.
              </p>

              <div className={styles.heroCta} style={{ justifyContent: 'center' }}>
                <Link to={primaryTarget} className={styles.btnPrimary}>
                  Enterprise starten
                  <ArrowRight size={20} />
                </Link>
                <Link to={secondaryTarget} className={styles.btnSecondary}>
                  Kostenlos testen
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 2 — TRUST-BAR
            ========================================== */}
        <div className={styles.container}>
          <div className={styles.trustBadgesRow}>
            <div className={styles.trustBadge}>
              <Shield size={18} />
              DSGVO-konform
            </div>
            <div className={styles.trustBadge}>
              <Lock size={18} />
              256-bit Verschlüsselung
            </div>
            <div className={styles.trustBadge}>
              <MapPin size={18} />
              Server in Frankfurt
            </div>
            <div className={styles.trustBadge}>
              <Clock size={18} />
              14 Tage Geld-zurück
            </div>
          </div>
        </div>

        {/* ==========================================
            SECTION 3 — PERSONAS (Wer profitiert besonders?)
            ========================================== */}
        <section className={styles.functionsSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Wer profitiert besonders</span>
              <h2 className={styles.sectionTitle}>Gemacht für Teams, die täglich mit Verträgen arbeiten</h2>
              <p className={styles.sectionSubtitle}>
                Wenn du regelmäßig Verträge prüfst — für deine Kunden, deine Mandanten oder deine
                Mieter — ist Contract AI für dich gebaut.
              </p>
            </div>

            <div className={styles.functionsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', maxWidth: '880px', margin: '0 auto' }}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <Briefcase size={24} />
                </div>
                <h3 className={styles.functionTitle}>Marketing- & Kreativagenturen</h3>
                <p className={styles.functionDesc}>
                  NDAs, Kundenverträge, Lieferanten- und Freelancer-Verträge — alle zentral, mit
                  klarer Rechte-Verteilung im Team. Weniger Anwaltskosten für jeden Kleinkram.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Home size={24} />
                </div>
                <h3 className={styles.functionTitle}>Hausverwaltungen & Makler</h3>
                <p className={styles.functionDesc}>
                  Mietverträge auf unwirksame Klauseln prüfen, Kündigungs- und Indexierungsfristen
                  automatisch tracken, Kündigungen rechtssicher per E-Mail versenden — alle Mitarbeiter
                  arbeiten am selben Bestand.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Users size={24} />
                </div>
                <h3 className={styles.functionTitle}>HR-Freelancer & People Ops</h3>
                <p className={styles.functionDesc}>
                  Arbeitsverträge, AGB, Datenschutzklauseln — KI-geprüft mit BGB-Begründung. Ideal
                  für Berater, die mehrere Kunden parallel betreuen und schnelle, fundierte Aussagen
                  liefern müssen.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}>
                  <Scale size={24} />
                </div>
                <h3 className={styles.functionTitle}>Kleine Kanzleien & Steuerberater</h3>
                <p className={styles.functionDesc}>
                  Mandantendokumente strukturiert ablegen, mit dem Team teilen, Klauselbibliothek
                  zentral pflegen, REST API für die Anbindung an deine Kanzlei- oder DATEV-Software.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 4 — BENEFITS (Das bekommt dein Team)
            ========================================== */}
        <section className={styles.whySection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Das bekommt dein Team</span>
              <h2 className={styles.sectionTitle}>Sechs Bausteine, die ein Team-Abo wirklich ausmachen</h2>
              <p className={styles.sectionSubtitle}>
                Kein Pro-Sitz-Aufpreis, keine versteckten Limits — alles, was kollaboratives
                Vertragsmanagement braucht, ist im Enterprise-Tarif enthalten.
              </p>
            </div>

            <div className={styles.whyGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <Users size={28} />
                </div>
                <h3 className={styles.whyTitle}>Bis zu 10 Teammitglieder</h3>
                <p className={styles.whyDesc}>
                  Inklusive im Enterprise-Tarif. Kein Aufpreis pro Sitz, keine Mindestlaufzeit pro
                  Mitarbeiter — du verteilst die Lizenzen, wie du willst.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Lock size={28} />
                </div>
                <h3 className={styles.whyTitle}>Rollen & Rechte</h3>
                <p className={styles.whyDesc}>
                  Drei Rollen — Admin, Mitarbeiter, Viewer. Du entscheidest, wer Verträge sehen,
                  bearbeiten oder verwalten darf. Sensible Mandantenakten bleiben sensibel.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <FolderOpen size={28} />
                </div>
                <h3 className={styles.whyTitle}>Gemeinsame Vertragsordner</h3>
                <p className={styles.whyDesc}>
                  Ein zentraler Vertragsbestand — alle im Team arbeiten am selben Stand. Schluss
                  mit verschickten ZIP-Dateien und veralteten Excel-Listen.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}>
                  <Code size={28} />
                </div>
                <h3 className={styles.whyTitle}>REST API-Zugang</h3>
                <p className={styles.whyDesc}>
                  Verbinde Contract AI mit deiner Kanzleisoftware, deinem CRM, deiner Hausverwaltungs-
                  Software oder deinem DMS — vollständige API-Doku auf{' '}
                  <Link to="/api-docs" style={{ color: '#3b82f6', fontWeight: 600 }}>/api-docs</Link>.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}>
                  <Download size={28} />
                </div>
                <h3 className={styles.whyTitle}>White-Label PDF-Reports</h3>
                <p className={styles.whyDesc}>
                  Analyse-Reports mit deinem Logo statt mit dem Contract-AI-Branding. Ideal, wenn
                  du Vertragsanalysen als eigene Leistung an deine Kunden weitergibst.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Activity size={28} />
                </div>
                <h3 className={styles.whyTitle}>Activity-Log & Compliance</h3>
                <p className={styles.whyDesc}>
                  Jede Änderung am Vertragsbestand wird dokumentiert: Wer hat wann was gemacht?
                  Wichtig für Compliance, Mandantentransparenz und interne Audits.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 5 — PROCESS (3 Schritte)
            ========================================== */}
        <section className={styles.processSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>So funktioniert's</span>
              <h2 className={styles.sectionTitle}>In drei Schritten startklar</h2>
              <p className={styles.sectionSubtitle}>
                Vom Abschluss bis zum ersten gemeinsam analysierten Vertrag vergehen keine fünf Minuten.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Enterprise-Tarif abschließen</h3>
                    <p className={styles.processDesc}>
                      29 €/Monat, monatlich oder jährlich, mit 14-Tage-Geld-zurück-Garantie. Keine
                      Setup-Gebühr, kein Onboarding-Aufwand, keine Mindestlaufzeit über die bezahlte
                      Periode hinaus.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Team einladen</h3>
                    <p className={styles.processDesc}>
                      Im Team-Bereich lädst du bis zu neun weitere Kollegen per E-Mail ein. Sie
                      erhalten einen Einladungslink, registrieren sich und sind sofort einsatzbereit
                      — mit der Rolle, die du ihnen zuweist.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Sofort gemeinsam Verträge analysieren</h3>
                    <p className={styles.processDesc}>
                      Lade Verträge hoch, ordne sie Ordnern zu, lasse die KI sie prüfen — alle im
                      Team sehen denselben Stand, mit Activity-Log, gemeinsamer Klauselbibliothek
                      und White-Label-Export für deine Kunden.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 6 — DIFFERENZIERUNG (Warum nicht Excel/ChatGPT?)
            ========================================== */}
        <section className={styles.problemSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Der Vergleich</span>
              <h2 className={styles.sectionTitle}>Warum nicht einfach Excel oder ChatGPT?</h2>
              <p className={styles.sectionSubtitle}>
                Beides geht — aber beides bringt für Agenturen und Verwaltungen typische Probleme mit.
              </p>
            </div>

            <div className={styles.functionsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs} style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <FileSpreadsheet size={24} />
                </div>
                <h3 className={styles.functionTitle}>Excel-Listen</h3>
                <p className={styles.functionDesc}>
                  <strong>Manuell, fehleranfällig, niemand weiß den aktuellen Stand.</strong> Fristen
                  werden vergessen, Kollegen arbeiten in unterschiedlichen Versionen, und eine
                  echte Klauselprüfung gibt es nicht.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs} style={{ borderColor: 'rgba(234, 179, 8, 0.2)' }}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <AlertTriangle size={24} />
                </div>
                <h3 className={styles.functionTitle}>ChatGPT & Co.</h3>
                <p className={styles.functionDesc}>
                  <strong>Keine DSGVO-Sicherheit, keine Speicherung, keine Team-Funktion.</strong>{' '}
                  Mandantendaten bei OpenAI hochladen ist datenschutzrechtlich heikel — und beim
                  nächsten Tab-Schließen ist alles weg.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs} style={{ borderColor: 'rgba(16, 185, 129, 0.25)' }}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <CheckCircle size={24} />
                </div>
                <h3 className={styles.functionTitle}>Contract AI</h3>
                <p className={styles.functionDesc}>
                  <strong>DSGVO, Server DE, Team-Verwaltung, KI-Analyse, Fristen-Cron.</strong>{' '}
                  Eine Plattform, die alle drei Anforderungen — Recht, Effizienz, Kollaboration —
                  gleichzeitig erfüllt.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 7 — PRICING-TEASER
            ========================================== */}
        <section className={styles.whySection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Klarer Preis</span>
              <h2 className={styles.sectionTitle}>Enterprise — alles drin, ohne Überraschungen</h2>
              <p className={styles.sectionSubtitle}>
                Ein Tarif für dein gesamtes Team. Keine Pro-Sitz-Mathematik, keine versteckten Limits.
              </p>
            </div>

            <div className={`${styles.beispielBox} ${styles.animateOnScroll}`} ref={addToRefs} style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div className={styles.beispielIcon} style={{ marginBottom: 0, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#3b82f6' }}>
                  <Sparkles size={28} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Enterprise-Tarif
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    29 € / Monat <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>· bis zu 10 Nutzer</span>
                  </div>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '15px', color: '#334155' }}>
                  <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                  Unbegrenzte KI-Analysen, Optimierung, Vergleich
                </li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '15px', color: '#334155' }}>
                  <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                  Team-Verwaltung mit Rollen-System
                </li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '15px', color: '#334155' }}>
                  <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                  REST API & White-Label PDF-Reports
                </li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '15px', color: '#334155' }}>
                  <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                  Kalender-Sync & Email-Erinnerungen
                </li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '15px', color: '#334155' }}>
                  <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                  Priority Support & Onboarding
                </li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '15px', color: '#334155' }}>
                  <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                  14 Tage Geld-zurück-Garantie
                </li>
              </ul>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link to="/pricing" className={styles.btnPrimary}>
                  Zur vollständigen Preisübersicht
                  <ArrowRight size={20} />
                </Link>
                <a href="mailto:info@contract-ai.de?subject=Anfrage%20Team-Lizenz%20%28%3E10%20Nutzer%29" className={styles.btnSecondary}>
                  Größeres Team? Schreib uns
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 8 — SICHERHEIT & COMPLIANCE
            ========================================== */}
        <section className={styles.functionsSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Sicherheit & Compliance</span>
              <h2 className={styles.sectionTitle}>Wenn Mandantendaten im Spiel sind, zählt jedes Detail</h2>
              <p className={styles.sectionSubtitle}>
                Contract AI ist von Tag eins für die Verarbeitung sensibler Vertragsdaten gebaut —
                deutscher Datenschutzstandard, kein Schmuckwerk.
              </p>
            </div>

            <div className={styles.functionsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Shield size={24} />
                </div>
                <h3 className={styles.functionTitle}>DSGVO-konform</h3>
                <p className={styles.functionDesc}>
                  Vollständige Erfüllung der DSGVO-Anforderungen. Kein Modell-Training mit deinen
                  Daten, keine Weitergabe an Dritte.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <MapPin size={24} />
                </div>
                <h3 className={styles.functionTitle}>Server in Frankfurt</h3>
                <p className={styles.functionDesc}>
                  Alle Verarbeitung und Speicherung ausschließlich auf deutschen Rechenzentren —
                  kein Datenabfluss in die USA, keine Drittstaaten-Übermittlung.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Lock size={24} />
                </div>
                <h3 className={styles.functionTitle}>256-bit-Verschlüsselung</h3>
                <p className={styles.functionDesc}>
                  Übertragung mit TLS 1.3, Speicherung verschlüsselt im Ruhezustand — Stand der
                  Technik, ohne Wenn und Aber.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}>
                  <FileText size={24} />
                </div>
                <h3 className={styles.functionTitle}>AVV nach Art. 28 DSGVO</h3>
                <p className={styles.functionDesc}>
                  Auftragsverarbeitungsvertrag auf Anfrage kostenlos verfügbar — wichtig, wenn du
                  als Auftragsverarbeiter für deine Kunden arbeitest.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}>
                  <Activity size={24} />
                </div>
                <h3 className={styles.functionTitle}>Audit-Log</h3>
                <p className={styles.functionDesc}>
                  Jede Aktion im Team — Upload, Analyse, Löschen, Rolle ändern — wird protokolliert.
                  Compliance-Nachweise auf Knopfdruck.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Clock size={24} />
                </div>
                <h3 className={styles.functionTitle}>14 Tage Geld-zurück</h3>
                <p className={styles.functionDesc}>
                  Wenn das Team nach zwei Wochen merkt, dass es nicht passt, erstatten wir den
                  vollen Betrag. Ohne Rückfragen, ohne Bedingungen.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 9 — FAQ
            ========================================== */}
        <section className={styles.faqSection} id="faq">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Fragen & Antworten</span>
              <h2 className={styles.sectionTitle}>Was Agenturen, Verwalter und Berater häufig fragen</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich Verträge meiner Kunden hochladen — ist das DSGVO-konform?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, absolut. Contract AI ist DSGVO-konform und alle Server stehen in Frankfurt
                  am Main. Als Agentur, Verwaltung oder Berater bist du Auftragsverarbeiter im Sinne
                  der DSGVO — wir stellen dir auf Anfrage einen kostenlosen Auftragsverarbeitungsvertrag
                  (AVV) nach Art. 28 DSGVO zur Verfügung. Eine DSGVO-konforme Verarbeitung von
                  Mandanten- und Kundendokumenten ist damit vollständig abgesichert.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie funktioniert das Rollen-System im Team?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Es gibt drei Rollen: <strong>Admin</strong> (kann das Team verwalten, einladen,
                  Rechte vergeben), <strong>Mitarbeiter</strong> (kann Verträge hochladen,
                  analysieren und bearbeiten) und <strong>Viewer</strong> (Lesezugriff). So
                  entscheidest du selbst, wer in deiner Agentur welche Verträge sehen darf — etwa,
                  wenn du sensible Mandantenakten von normalen Lieferantenverträgen trennen willst.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was passiert, wenn mein Team größer als 10 Personen wird?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Im Enterprise-Tarif sind bis zu 10 aktive Nutzer enthalten — ohne Aufpreis pro
                  Sitz. Bei größeren Teams (z.B. Verwaltungen mit 25 Mitarbeitern oder Kanzleien
                  mit mehreren Standorten) bieten wir individuelle Konditionen an. Schreib uns
                  einfach kurz an{' '}
                  <a href="mailto:info@contract-ai.de" style={{ color: '#3b82f6', fontWeight: 600 }}>
                    info@contract-ai.de
                  </a>
                  {' '}und wir machen dir ein faires Team-Angebot.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Bekomme ich eine zentrale Rechnung für mein Team?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja. Du als Account-Inhaber erhältst eine einzige monatliche oder jährliche
                  Rechnung — DSGVO-konform mit Pflichtangaben nach § 14 UStG, automatisch per
                  E-Mail und im Dashboard zum Download. Reverse-Charge nach § 13b UStG für
                  EU-B2B-Kunden ist möglich. Deine Mitarbeiter selbst zahlen nichts — die Lizenzen
                  werden zentral abgerechnet.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Gibt es eine API, mit der ich Contract AI in meine bestehende Software integriere?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja. Im Enterprise-Tarif erhältst du Zugang zur REST API von Contract AI. Du
                  kannst damit Verträge automatisch hochladen, Analysen abrufen und Ergebnisse in
                  deine Kanzleisoftware, dein CRM, deine Hausverwaltungssoftware oder dein DMS
                  einspielen. Die vollständige API-Dokumentation findest du auf{' '}
                  <Link to="/api-docs" style={{ color: '#3b82f6', fontWeight: 600 }}>/api-docs</Link>.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich White-Label-Reports an meine Kunden weitergeben?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja. Im Enterprise-Tarif kannst du PDF-Analyse-Reports im White-Label-Modus
                  exportieren — also ohne Contract-AI-Branding und mit deinem eigenen Logo. Ideal
                  für Agenturen, die Vertragsanalysen als eigene Leistung an ihre Kunden weitergeben
                  oder berechnen möchten.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wo werden die Verträge gespeichert und wie sicher sind sie?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Alle Verträge werden ausschließlich auf europäischen Servern (Frankfurt am Main)
                  verarbeitet und gespeichert. Die Übertragung erfolgt SSL-verschlüsselt mit
                  256-bit-Verschlüsselung, die Speicherung ist verschlüsselt im Ruhezustand. Es
                  gibt kein Modell-Training mit deinen Daten und keine Weitergabe an Dritte — du
                  bleibst jederzeit Eigentümer.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich jederzeit kündigen, wenn mein Team Contract AI doch nicht braucht?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja. Es gibt keine Mindestlaufzeit und keine Kündigungsfristen — du kannst
                  jederzeit zum Ende der bezahlten Periode mit einem Klick im Dashboard kündigen.
                  Zusätzlich gilt die 14-Tage-Geld-zurück-Garantie ohne Wenn und Aber: Wenn du
                  innerhalb der ersten 14 Tage merkst, dass es nicht passt, erstatten wir den
                  vollen Betrag.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 10 — RELATED (Internal Linking)
            ========================================== */}
        <section className={styles.relatedSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <h2 className={styles.sectionTitle}>Auch interessant</h2>
            </div>

            <div className={styles.relatedGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <Link to="/features/vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#3b82f6' }}><FileText size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>KI-Vertragsanalyse</div>
                  <div className={styles.relatedDescription}>
                    Wie die KI Risiken erkennt, bewertet und Klartext-Empfehlungen liefert
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/contract-builder" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#8b5cf6' }}><BookOpen size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Contract Builder</div>
                  <div className={styles.relatedDescription}>
                    Eigene Vertragsvorlagen erstellen, im Team teilen und versionieren
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/digitalesignatur" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#10b981' }}><CheckCircle size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Digitale Signatur</div>
                  <div className={styles.relatedDescription}>
                    Verträge rechtssicher digital unterschreiben lassen — eIDAS-konform
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/api-docs" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#06b6d4' }}><Code size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>REST API-Dokumentation</div>
                  <div className={styles.relatedDescription}>
                    Endpoints, Authentifizierung und Beispiel-Requests für Integrationen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/pricing" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#f97316' }}><CreditCard size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vollständige Preisübersicht</div>
                  <div className={styles.relatedDescription}>
                    Alle Tarife im Vergleich — Starter, Business, Enterprise
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/ki-vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#eab308' }}><Sparkles size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>KI-Vertragsanalyse Guide</div>
                  <div className={styles.relatedDescription}>
                    Der komplette Guide: Wie KI-Vertragsanalyse funktioniert, KI vs. Anwalt, Kosten
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 11 — FINAL CTA
            ========================================== */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={`${styles.ctaCard} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.ctaContent}>
                <h2 className={styles.ctaTitle}>
                  Bereit, mit deinem Team zu starten?
                </h2>
                <p className={styles.ctaSubtitle}>
                  Enterprise — bis zu 10 Nutzer, alles inklusive, ab 29 €/Monat. Mit
                  14-Tage-Geld-zurück-Garantie. Keine Mindestlaufzeit. Jederzeit kündbar.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={primaryTarget} className={styles.btnWhite}>
                    Enterprise starten
                    <ArrowRight size={20} />
                  </Link>
                  <Link to={secondaryTarget} className={styles.btnSecondary} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                    Erstmal kostenlos testen
                  </Link>
                </div>
                <div style={{ marginTop: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.85)', display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} /> DSGVO-konform
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> 14 Tage Geld-zurück
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <UserPlus size={14} /> Bis zu 10 Nutzer inklusive
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} /> Sofort einsatzbereit
                  </span>
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

export default FuerAgenturen;

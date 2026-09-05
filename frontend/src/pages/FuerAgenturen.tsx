import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../hooks/useAuth";
import styles from "../styles/FuerAgenturen.module.css";
import LandingFooter from "../components/LandingFooter";
import {
  ArrowRight, Check, X, Shield, Lock, MapPin, Clock,
  Users, FolderOpen, Code, Download, Activity, CreditCard, Zap,
  Briefcase, Home, Scale, FileText, ChevronDown, Sparkles, BookOpen
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

    // Sichtbarkeits-Fallback: Inhalt darf nie unsichtbar haengen bleiben
    const fallback = window.setTimeout(() => {
      animatedRefs.current.forEach((ref) => ref?.classList.add(styles.visible));
    }, 2000);

    return () => { observer.disconnect(); window.clearTimeout(fallback); };
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

  // Score-Ring der Produktansicht. Reine Beispielwerte.
  const Ring = ({ wert, offset }: { wert: number; offset: number }) => (
    <svg width="38" height="38" viewBox="0 0 38 38">
      <circle cx="19" cy="19" r="15" fill="none" stroke="rgba(37,99,235,.14)" strokeWidth="4" />
      <circle cx="19" cy="19" r="15" fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round"
              strokeDasharray="94.2" strokeDashoffset={offset} transform="rotate(-90 19 19)" />
      <text className={styles.ringWert} x="19" y="23" textAnchor="middle">{wert}</text>
    </svg>
  );

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

      <div className={styles.seite}>
        {/* ==========================================
            AUFTAKT — These links, die Rechnung rechts
            ========================================== */}
        <header className={`${styles.auftakt} ${styles.band}`}>
          <span className={styles.marke}>
            <span className={styles.markePunkt} />
            Für Agenturen, Verwaltungen &amp; Berater
          </span>

          <div className={styles.auftaktRaster}>
            <div>
              {/* Weiches Trennzeichen: falls das lange Wort doch umbrechen muss,
                  dann an der richtigen Stelle (Vertrags-management). */}
              <h1 className={styles.heroTitel}>
                Vertrags{'­'}management
                <span className={styles.zweiteZeile}>für dein gesamtes Team.</span>
              </h1>
              <p className={styles.anriss}>
                Eine zentrale Plattform für Agenturen, Immobilienverwalter, HR-Freelancer und kleine
                Kanzleien. KI-Vertragsanalyse, gemeinsame Ordner, Rollen-System und REST API,
                alles inklusive ab <strong>29 € pro Monat für bis zu 10 Nutzer</strong>.
              </p>
              <div className={styles.knoepfe}>
                <Link to={primaryTarget} className={styles.knopfVoll}>
                  Enterprise starten
                  <ArrowRight size={18} />
                </Link>
                <Link to={secondaryTarget} className={styles.knopfLinie}>
                  Kostenlos testen
                </Link>
              </div>
            </div>

            <aside className={styles.rechnung}>
              <div className={styles.rechnungKopf}>Enterprise-Tarif</div>
              <div className={styles.preis}>29 €</div>
              <div className={styles.preisNote}>pro Monat, bis zu 10 Nutzer</div>
              <div className={styles.teilung}>
                <div className={styles.teilungZeile}><span>Aufpreis pro Sitz</span><b>0 €</b></div>
                <div className={styles.teilungZeile}><span>Setup-Gebühr</span><b>0 €</b></div>
                <div className={styles.teilungZeile}><span>Mindestlaufzeit</span><b>keine</b></div>
              </div>
              <div className={styles.proKopf}>
                <span>Bei 10 Nutzern entspricht das</span>
                <b>2,90 €</b>
              </div>
            </aside>
          </div>

          {/* Produktansicht: ein gemeinsamer Vertragsbestand mit Rollen.
              Alle Namen und Zahlen darin sind erfundene Beispiele. */}
          <div className={`${styles.buehne} ${styles.animiert}`} ref={addToRefs}>
            <div className={styles.fensterKopf}>
              <span className={styles.fensterTitel}>Vertragsordner · <b>Kunden 2026</b></span>
              <span className={styles.chip}>24 Dokumente</span>
              <div className={styles.avatare}>
                <span className={`${styles.avatar} ${styles.avatarBlau}`}>AB</span>
                <span className={`${styles.avatar} ${styles.avatarHell}`}>MK</span>
                <span className={`${styles.avatar} ${styles.avatarTief}`}>SL</span>
                <span className={`${styles.avatar} ${styles.avatarRest}`}>+5</span>
              </div>
            </div>
            <div className={styles.buehneInhalt}>
              <div className={styles.liste}>
                <div className={styles.zeileVertrag}>
                  <div>
                    <div className={styles.vName}>Agenturvertrag Musterkunde GmbH</div>
                    <div className={styles.vMeta}>zuletzt bearbeitet · vor 2 Std.</div>
                  </div>
                  <span className={styles.chip}>Geprüft</span>
                  <Ring wert={82} offset={17} />
                </div>
                <div className={styles.zeileVertrag}>
                  <div>
                    <div className={styles.vName}>Mietvertrag Objekt 14</div>
                    <div className={styles.vMeta}>Kündigungsfrist · 30.11.2026</div>
                  </div>
                  <span className={`${styles.chip} ${styles.chipWarn}`}>Frist in 12 Tagen</span>
                  <Ring wert={61} offset={36} />
                </div>
                <div className={styles.zeileVertrag}>
                  <div>
                    <div className={styles.vName}>NDA Freelancer Design</div>
                    <div className={styles.vMeta}>hochgeladen von · Mitarbeiter</div>
                  </div>
                  <span className={styles.chip}>Geprüft</span>
                  <Ring wert={91} offset={9} />
                </div>
              </div>
              <aside className={styles.seitenspalte}>
                <div className={styles.spaltenTitel}>Team &amp; Rollen</div>
                <div className={styles.rolle}>
                  <span className={`${styles.avatar} ${styles.avatarBlau}`}>AB</span>
                  <div>
                    <div className={styles.rolleName}>Admin</div>
                    <div className={styles.rolleRecht}>verwalten · einladen</div>
                  </div>
                </div>
                <div className={styles.rolle}>
                  <span className={`${styles.avatar} ${styles.avatarHell}`}>MK</span>
                  <div>
                    <div className={styles.rolleName}>Mitarbeiter</div>
                    <div className={styles.rolleRecht}>hochladen · prüfen</div>
                  </div>
                </div>
                <div className={styles.rolle}>
                  <span className={`${styles.avatar} ${styles.avatarTief}`}>SL</span>
                  <div>
                    <div className={styles.rolleName}>Viewer</div>
                    <div className={styles.rolleRecht}>nur lesen</div>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <div className={styles.vertrauen}>
            <span><Shield size={17} /> DSGVO-konform</span>
            <span><Lock size={17} /> 256-bit Verschlüsselung</span>
            <span><MapPin size={17} /> Server in Frankfurt</span>
            <span><Clock size={17} /> 14 Tage Geld-zurück</span>
          </div>
        </header>

        {/* ==========================================
            WER PROFITIERT BESONDERS
            ========================================== */}
        <section className={`${styles.abschnitt} ${styles.band}`}>
          <span className={styles.augenbraue}>Wer profitiert besonders</span>
          <h2 className={styles.titel}>
            Gemacht für Teams, die täglich mit Verträgen <span className={styles.akzent}>arbeiten</span>
          </h2>
          <p className={styles.unterzeile}>
            Wenn du regelmäßig Verträge prüfst, für deine Kunden, deine Mandanten oder deine
            Mieter, ist Contract AI für dich gebaut.
          </p>
          <div className={styles.zeilen}>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Briefcase size={19} /></span>
                <h3 className={styles.zeileTitel}>Marketing- &amp; Kreativagenturen</h3>
              </div>
              <p className={styles.zeileText}>
                NDAs, Kundenverträge, Lieferanten- und Freelancer-Verträge, alle zentral, mit
                klarer Rechte-Verteilung im Team. Weniger Anwaltskosten für jeden Kleinkram.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Home size={19} /></span>
                <h3 className={styles.zeileTitel}>Hausverwaltungen &amp; Makler</h3>
              </div>
              <p className={styles.zeileText}>
                Mietverträge auf unwirksame Klauseln prüfen, Kündigungs- und Indexierungsfristen
                automatisch tracken, Kündigungen rechtssicher per E-Mail versenden, alle Mitarbeiter
                arbeiten am selben Bestand.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Users size={19} /></span>
                <h3 className={styles.zeileTitel}>HR-Freelancer &amp; People Ops</h3>
              </div>
              <p className={styles.zeileText}>
                Arbeitsverträge, AGB, Datenschutzklauseln, KI-geprüft mit BGB-Begründung. Ideal
                für Berater, die mehrere Kunden parallel betreuen und schnelle, fundierte Aussagen
                liefern müssen.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Scale size={19} /></span>
                <h3 className={styles.zeileTitel}>Kleine Kanzleien &amp; Steuerberater</h3>
              </div>
              <p className={styles.zeileText}>
                Mandantendokumente strukturiert ablegen, mit dem Team teilen, Klauselbibliothek
                zentral pflegen, REST API für die Anbindung an deine Kanzlei- oder DATEV-Software.
              </p>
            </div>
          </div>
        </section>

        {/* ==========================================
            DAS BEKOMMT DEIN TEAM
            ========================================== */}
        <section className={`${styles.abschnitt} ${styles.band}`}>
          <span className={styles.augenbraue}>Das bekommt dein Team</span>
          <h2 className={styles.titel}>
            Sechs Bausteine, die ein Team-Abo wirklich <span className={styles.akzent}>ausmachen</span>
          </h2>
          <p className={styles.unterzeile}>
            Kein Pro-Sitz-Aufpreis, keine versteckten Limits. Alles, was kollaboratives
            Vertragsmanagement braucht, ist im Enterprise-Tarif enthalten.
          </p>
          <div className={styles.zeilen}>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Users size={19} /></span>
                <h3 className={styles.zeileTitel}>Bis zu 10 Teammitglieder</h3>
              </div>
              <p className={styles.zeileText}>
                Inklusive im Enterprise-Tarif. Kein Aufpreis pro Sitz, keine Mindestlaufzeit pro
                Mitarbeiter, du verteilst die Lizenzen, wie du willst.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Lock size={19} /></span>
                <h3 className={styles.zeileTitel}>Rollen &amp; Rechte</h3>
              </div>
              <p className={styles.zeileText}>
                Drei Rollen: Admin, Mitarbeiter, Viewer. Du entscheidest, wer Verträge sehen,
                bearbeiten oder verwalten darf. Sensible Mandantenakten bleiben sensibel.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><FolderOpen size={19} /></span>
                <h3 className={styles.zeileTitel}>Gemeinsame Vertragsordner</h3>
              </div>
              <p className={styles.zeileText}>
                Ein zentraler Vertragsbestand, alle im Team arbeiten am selben Stand. Schluss
                mit verschickten ZIP-Dateien und veralteten Excel-Listen.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Code size={19} /></span>
                <h3 className={styles.zeileTitel}>REST API-Zugang</h3>
              </div>
              <p className={styles.zeileText}>
                Verbinde Contract AI mit deiner Kanzleisoftware, deinem CRM, deiner Hausverwaltungs-
                Software oder deinem DMS, vollständige API-Doku auf{' '}
                <Link to="/api-docs">/api-docs</Link>.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Download size={19} /></span>
                <h3 className={styles.zeileTitel}>White-Label PDF-Reports</h3>
              </div>
              <p className={styles.zeileText}>
                Analyse-Reports mit deinem Logo statt mit dem Contract-AI-Branding. Ideal, wenn
                du Vertragsanalysen als eigene Leistung an deine Kunden weitergibst.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Activity size={19} /></span>
                <h3 className={styles.zeileTitel}>Activity-Log &amp; Compliance</h3>
              </div>
              <p className={styles.zeileText}>
                Jede Änderung am Vertragsbestand wird dokumentiert: Wer hat wann was gemacht?
                Wichtig für Compliance, Mandantentransparenz und interne Audits.
              </p>
            </div>
          </div>

          {/* Zeigt, was White-Label konkret bedeutet */}
          <figure className={`${styles.blattFigur} ${styles.animiert}`} ref={addToRefs}>
            <div className={styles.blattPaar}>
              <div className={styles.blatt}>
                <div className={styles.blattKopf}><span className={styles.blattLogo}>CONTRACT AI</span></div>
                <div className={styles.blattZeile} />
                <div className={styles.blattZeile} />
                <div className={`${styles.blattZeile} ${styles.blattKurz}`} />
                <div className={styles.blattZeile} />
                <div className={`${styles.blattZeile} ${styles.blattKurz}`} />
              </div>
              <div className={styles.blatt}>
                <div className={styles.blattKopf}>
                  <span className={`${styles.blattLogo} ${styles.blattLogoDeins}`}>Dein Logo</span>
                </div>
                <div className={styles.blattZeile} />
                <div className={styles.blattZeile} />
                <div className={`${styles.blattZeile} ${styles.blattKurz}`} />
                <div className={styles.blattZeile} />
                <div className={`${styles.blattZeile} ${styles.blattKurz}`} />
              </div>
            </div>
            <figcaption className={styles.blattNote}>
              Derselbe Analyse-Report, einmal mit Contract-AI-Branding, einmal mit deinem
            </figcaption>
          </figure>
        </section>

        {/* ==========================================
            SO FUNKTIONIERT'S — echte Sequenz, deshalb nummeriert
            ========================================== */}
        <section className={`${styles.abschnitt} ${styles.band}`}>
          <span className={styles.augenbraue}>So funktioniert's</span>
          <h2 className={styles.titel}>
            In drei Schritten <span className={styles.akzent}>startklar</span>
          </h2>
          <p className={styles.unterzeile}>
            Vom Abschluss bis zum ersten gemeinsam analysierten Vertrag vergehen keine fünf Minuten.
          </p>

          <div style={{ marginTop: '34px' }}>
            <div className={styles.schritt}>
              <div className={styles.ziffer}>1</div>
              <div>
                <h3 className={styles.schrittTitel}>Enterprise-Tarif abschließen</h3>
                <p className={styles.schrittText}>
                  29 €/Monat, monatlich oder jährlich, mit 14-Tage-Geld-zurück-Garantie. Keine
                  Setup-Gebühr, kein Onboarding-Aufwand, keine Mindestlaufzeit über die bezahlte
                  Periode hinaus.
                </p>
              </div>
              <div className={styles.schrittBild}>
                <div className={styles.bildLabel}>Enterprise</div>
                <div className={styles.bildPreis}>29 € <span>/ Monat</span></div>
                <div className={styles.klausel}><span>Nutzer inklusive</span><b>10</b></div>
                <div className={styles.klausel}><span>Aufpreis pro Sitz</span><b>0 €</b></div>
                <div className={styles.klausel}><span>Mindestlaufzeit</span><b>keine</b></div>
                <div className={styles.feldKnopf}>Jetzt abschließen</div>
              </div>
            </div>

            <div className={styles.schritt}>
              <div className={styles.ziffer}>2</div>
              <div>
                <h3 className={styles.schrittTitel}>Team einladen</h3>
                <p className={styles.schrittText}>
                  Im Team-Bereich lädst du bis zu neun weitere Kollegen per E-Mail ein. Sie
                  erhalten einen Einladungslink, registrieren sich und sind sofort einsatzbereit,
                  mit der Rolle, die du ihnen zuweist.
                </p>
              </div>
              <div className={styles.schrittBild}>
                <div className={styles.bildLabel} style={{ marginBottom: '10px' }}>Kollegen einladen</div>
                <div className={styles.feld}>kollege@agentur.de</div>
                <div className={styles.feld} style={{ justifyContent: 'space-between' }}>
                  Rolle: Mitarbeiter <ChevronDown size={11} />
                </div>
                <div className={styles.feldKnopf}>Einladung senden</div>
                <div className={styles.eingeladen}>
                  <span className={`${styles.avatar} ${styles.avatarBlau}`}>AB</span>
                  <span className={`${styles.avatar} ${styles.avatarHell}`}>MK</span>
                  <span className={`${styles.avatar} ${styles.avatarRest}`}>+2</span>
                  <span className={styles.eingeladenZahl}>4 von 10</span>
                </div>
              </div>
            </div>

            <div className={styles.schritt}>
              <div className={styles.ziffer}>3</div>
              <div>
                <h3 className={styles.schrittTitel}>Sofort gemeinsam Verträge analysieren</h3>
                <p className={styles.schrittText}>
                  Lade Verträge hoch, ordne sie Ordnern zu, lasse die KI sie prüfen. Alle im
                  Team sehen denselben Stand, mit Activity-Log, gemeinsamer Klauselbibliothek
                  und White-Label-Export für deine Kunden.
                </p>
              </div>
              <div className={styles.schrittBild}>
                <div className={styles.bildKopf}>
                  <span className={styles.bildLabel}>Analyse</span>
                  <span className={styles.chip}>fertig</span>
                </div>
                <div className={styles.klausel}><span>Haftung</span><b className={styles.gut}>unkritisch</b></div>
                <div className={styles.balken}><i style={{ width: '86%' }} /></div>
                <div className={styles.klausel}><span>Kündigungsfrist</span><b className={styles.pruefen}>prüfen</b></div>
                <div className={styles.balken}><i style={{ width: '54%' }} /></div>
                <div className={styles.klausel}><span>Vergütung</span><b className={styles.gut}>unkritisch</b></div>
                <div className={styles.balken}><i style={{ width: '78%' }} /></div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            DER VERGLEICH — Gegenueberstellung statt drei Karten
            ========================================== */}
        <section className={`${styles.abschnitt} ${styles.band}`}>
          <span className={styles.augenbraue}>Der Vergleich</span>
          <h2 className={styles.titel}>
            Warum nicht einfach Excel oder <span className={styles.akzent}>ChatGPT</span>?
          </h2>
          <p className={styles.unterzeile}>
            Beides geht, aber beides bringt für Agenturen und Verwaltungen typische Probleme mit.
          </p>
          <div className={styles.gegen}>
            <table>
              <colgroup>
                <col /><col /><col /><col className={styles.unsSpalte} />
              </colgroup>
              <thead>
                <tr>
                  <th />
                  <th>Excel-Listen</th>
                  <th>ChatGPT &amp; Co.</th>
                  <th className={styles.uns}>Contract AI</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Aktueller Stand</th>
                  <td><span className={`${styles.marker} ${styles.nein}`}><X size={15} /></span> Niemand weiß ihn, Kollegen arbeiten in unterschiedlichen Versionen</td>
                  <td><span className={`${styles.marker} ${styles.nein}`}><X size={15} /></span> Beim nächsten Tab-Schließen ist alles weg</td>
                  <td className={styles.uns}><span className={`${styles.marker} ${styles.ja}`}><Check size={15} /></span> Ein zentraler Bestand für das ganze Team</td>
                </tr>
                <tr>
                  <th>Fristen</th>
                  <td><span className={`${styles.marker} ${styles.nein}`}><X size={15} /></span> Werden vergessen, manuell und fehleranfällig</td>
                  <td><span className={`${styles.marker} ${styles.nein}`}><X size={15} /></span> Keine Speicherung, keine Erinnerung</td>
                  <td className={styles.uns}><span className={`${styles.marker} ${styles.ja}`}><Check size={15} /></span> Fristen-Cron mit E-Mail-Erinnerungen</td>
                </tr>
                <tr>
                  <th>Klauselprüfung</th>
                  <td><span className={`${styles.marker} ${styles.nein}`}><X size={15} /></span> Gibt es nicht</td>
                  <td>Ohne Rechtsbezug und ohne Nachvollziehbarkeit</td>
                  <td className={styles.uns}><span className={`${styles.marker} ${styles.ja}`}><Check size={15} /></span> KI-Analyse mit BGB-Begründung</td>
                </tr>
                <tr>
                  <th>Datenschutz</th>
                  <td>Liegt bei dir, ohne Protokoll</td>
                  <td><span className={`${styles.marker} ${styles.nein}`}><X size={15} /></span> Mandantendaten bei OpenAI hochladen ist heikel</td>
                  <td className={styles.uns}><span className={`${styles.marker} ${styles.ja}`}><Check size={15} /></span> DSGVO, Server in Frankfurt, AVV nach Art. 28</td>
                </tr>
                <tr>
                  <th>Team-Funktion</th>
                  <td>Dateien hin und her schicken</td>
                  <td><span className={`${styles.marker} ${styles.nein}`}><X size={15} /></span> Keine</td>
                  <td className={styles.uns}><span className={`${styles.marker} ${styles.ja}`}><Check size={15} /></span> Rollen, Rechte und Activity-Log</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ==========================================
            KLARER PREIS
            ========================================== */}
        <section className={`${styles.abschnitt} ${styles.preisBand}`}>
          <div className={styles.band}>
            <span className={styles.augenbraue}>Klarer Preis</span>
            <h2 className={styles.titel}>
              Enterprise, alles drin, ohne <span className={styles.akzent}>Überraschungen</span>
            </h2>
            <p className={styles.unterzeile}>
              Ein Tarif für dein gesamtes Team. Keine Pro-Sitz-Mathematik, keine versteckten Limits.
            </p>
            <div className={styles.preisRaster}>
              <ul className={styles.haken}>
                <li><Check size={19} /> Unbegrenzte KI-Analysen, Optimierung, Vergleich</li>
                <li><Check size={19} /> Team-Verwaltung mit Rollen-System</li>
                <li><Check size={19} /> REST API &amp; White-Label PDF-Reports</li>
                <li><Check size={19} /> Kalender-Sync &amp; Email-Erinnerungen</li>
                <li><Check size={19} /> Priority Support &amp; Onboarding</li>
                <li><Check size={19} /> 14 Tage Geld-zurück-Garantie</li>
              </ul>
              <div className={styles.rechnung}>
                <div className={styles.rechnungKopf}>Enterprise-Tarif</div>
                <div className={styles.preis}>29 € <span className={styles.preisEinheit}>/ Monat</span></div>
                <div className={styles.preisNote}>bis zu 10 Nutzer</div>
                <div className={styles.knoepfe} style={{ marginTop: '24px' }}>
                  <Link to="/pricing" className={styles.knopfVoll}>
                    Zur vollständigen Preisübersicht
                    <ArrowRight size={18} />
                  </Link>
                  <a
                    href="mailto:info@contract-ai.de?subject=Anfrage%20Team-Lizenz%20%28%3E10%20Nutzer%29"
                    className={styles.knopfLinie}
                  >
                    Größeres Team? Schreib uns
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SICHERHEIT & COMPLIANCE
            ========================================== */}
        <section className={`${styles.abschnitt} ${styles.band}`}>
          <span className={styles.augenbraue}>Sicherheit &amp; Compliance</span>
          <h2 className={styles.titel}>
            Wenn Mandantendaten im Spiel sind, zählt jedes <span className={styles.akzent}>Detail</span>
          </h2>
          <p className={styles.unterzeile}>
            Contract AI ist von Tag eins für die Verarbeitung sensibler Vertragsdaten gebaut,
            deutscher Datenschutzstandard, kein Schmuckwerk.
          </p>
          <div className={styles.zeilen}>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Shield size={19} /></span>
                <h3 className={styles.zeileTitel}>DSGVO-konform</h3>
              </div>
              <p className={styles.zeileText}>
                Vollständige Erfüllung der DSGVO-Anforderungen. Kein Modell-Training mit deinen
                Daten, keine Weitergabe an Dritte.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><MapPin size={19} /></span>
                <h3 className={styles.zeileTitel}>Server in der EU</h3>
              </div>
              <p className={styles.zeileText}>
                Verarbeitung und Speicherung in europäischen Rechenzentren, AVV nach
                Art. 28 DSGVO mit vollständiger Unterauftragnehmer-Liste öffentlich abrufbar.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Lock size={19} /></span>
                <h3 className={styles.zeileTitel}>256-bit-Verschlüsselung</h3>
              </div>
              <p className={styles.zeileText}>
                Übertragung mit TLS 1.3, Speicherung verschlüsselt im Ruhezustand, Stand der
                Technik, ohne Wenn und Aber.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><FileText size={19} /></span>
                <h3 className={styles.zeileTitel}>AVV nach Art. 28 DSGVO</h3>
              </div>
              <p className={styles.zeileText}>
                Auftragsverarbeitungsvertrag auf Anfrage kostenlos verfügbar, wichtig, wenn du
                als Auftragsverarbeiter für deine Kunden arbeitest.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Activity size={19} /></span>
                <h3 className={styles.zeileTitel}>Audit-Log</h3>
              </div>
              <p className={styles.zeileText}>
                Jede Aktion im Team, Upload, Analyse, Löschen, Rolle ändern, wird protokolliert.
                Compliance-Nachweise auf Knopfdruck.
              </p>
            </div>
            <div className={styles.zeile}>
              <div className={styles.zeileKopf}>
                <span className={styles.zeileIcon}><Clock size={19} /></span>
                <h3 className={styles.zeileTitel}>14 Tage Geld-zurück</h3>
              </div>
              <p className={styles.zeileText}>
                Wenn das Team nach zwei Wochen merkt, dass es nicht passt, erstatten wir den
                vollen Betrag. Ohne Rückfragen, ohne Bedingungen.
              </p>
            </div>
          </div>
        </section>

        {/* ==========================================
            FAQ
            ========================================== */}
        <section className={`${styles.abschnitt} ${styles.band}`} id="faq">
          <span className={styles.augenbraue}>Fragen &amp; Antworten</span>
          <h2 className={styles.titel}>
            Was Agenturen, Verwalter und Berater häufig <span className={styles.akzent}>fragen</span>
          </h2>
          <div className={styles.faq}>
            <details className={styles.faqItem}>
              <summary className={styles.faqFrage}>
                Kann ich Verträge meiner Kunden hochladen, ist das DSGVO-konform?
              </summary>
              <p className={styles.faqAntwort}>
                Ja, absolut. Contract AI ist DSGVO-konform und alle Server stehen in Frankfurt
                am Main. Als Agentur, Verwaltung oder Berater bist du Auftragsverarbeiter im Sinne
                der DSGVO, wir stellen dir auf Anfrage einen kostenlosen Auftragsverarbeitungsvertrag
                (AVV) nach Art. 28 DSGVO zur Verfügung. Eine DSGVO-konforme Verarbeitung von
                Mandanten- und Kundendokumenten ist damit vollständig abgesichert.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqFrage}>
                Wie funktioniert das Rollen-System im Team?
              </summary>
              <p className={styles.faqAntwort}>
                Es gibt drei Rollen: <strong>Admin</strong> (kann das Team verwalten, einladen,
                Rechte vergeben), <strong>Mitarbeiter</strong> (kann Verträge hochladen,
                analysieren und bearbeiten) und <strong>Viewer</strong> (Lesezugriff). So
                entscheidest du selbst, wer in deiner Agentur welche Verträge sehen darf, etwa,
                wenn du sensible Mandantenakten von normalen Lieferantenverträgen trennen willst.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqFrage}>
                Was passiert, wenn mein Team größer als 10 Personen wird?
              </summary>
              <p className={styles.faqAntwort}>
                Im Enterprise-Tarif sind bis zu 10 aktive Nutzer enthalten, ohne Aufpreis pro
                Sitz. Bei größeren Teams (z.B. Verwaltungen mit 25 Mitarbeitern oder Kanzleien
                mit mehreren Standorten) bieten wir individuelle Konditionen an. Schreib uns
                einfach kurz an{' '}
                <a href="mailto:info@contract-ai.de">info@contract-ai.de</a>
                {' '}und wir machen dir ein faires Team-Angebot.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqFrage}>
                Bekomme ich eine zentrale Rechnung für mein Team?
              </summary>
              <p className={styles.faqAntwort}>
                Ja. Du als Account-Inhaber erhältst eine einzige monatliche oder jährliche
                Rechnung, DSGVO-konform mit Pflichtangaben nach § 14 UStG, automatisch per
                E-Mail und im Dashboard zum Download. Reverse-Charge nach § 13b UStG für
                EU-B2B-Kunden ist möglich. Deine Mitarbeiter selbst zahlen nichts, die Lizenzen
                werden zentral abgerechnet.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqFrage}>
                Gibt es eine API, mit der ich Contract AI in meine bestehende Software integriere?
              </summary>
              <p className={styles.faqAntwort}>
                Ja. Im Enterprise-Tarif erhältst du Zugang zur REST API von Contract AI. Du
                kannst damit Verträge automatisch hochladen, Analysen abrufen und Ergebnisse in
                deine Kanzleisoftware, dein CRM, deine Hausverwaltungssoftware oder dein DMS
                einspielen. Die vollständige API-Dokumentation findest du auf{' '}
                <Link to="/api-docs">/api-docs</Link>.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqFrage}>
                Kann ich White-Label-Reports an meine Kunden weitergeben?
              </summary>
              <p className={styles.faqAntwort}>
                Ja. Im Enterprise-Tarif kannst du PDF-Analyse-Reports im White-Label-Modus
                exportieren, also ohne Contract-AI-Branding und mit deinem eigenen Logo. Ideal
                für Agenturen, die Vertragsanalysen als eigene Leistung an ihre Kunden weitergeben
                oder berechnen möchten.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqFrage}>
                Wo werden die Verträge gespeichert und wie sicher sind sie?
              </summary>
              <p className={styles.faqAntwort}>
                Alle Verträge werden ausschließlich auf europäischen Servern (Frankfurt am Main)
                verarbeitet und gespeichert. Die Übertragung erfolgt SSL-verschlüsselt mit
                256-bit-Verschlüsselung, die Speicherung ist verschlüsselt im Ruhezustand. Es
                gibt kein Modell-Training mit deinen Daten und keine Weitergabe an Dritte, du
                bleibst jederzeit Eigentümer.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqFrage}>
                Kann ich jederzeit kündigen, wenn mein Team Contract AI doch nicht braucht?
              </summary>
              <p className={styles.faqAntwort}>
                Ja. Es gibt keine Mindestlaufzeit und keine Kündigungsfristen, du kannst
                jederzeit zum Ende der bezahlten Periode mit einem Klick im Dashboard kündigen.
                Zusätzlich gilt die 14-Tage-Geld-zurück-Garantie ohne Wenn und Aber: Wenn du
                innerhalb der ersten 14 Tage merkst, dass es nicht passt, erstatten wir den
                vollen Betrag.
              </p>
            </details>
          </div>
        </section>

        {/* ==========================================
            AUCH INTERESSANT
            ========================================== */}
        <section className={`${styles.abschnitt} ${styles.band}`}>
          <span className={styles.augenbraue}>Auch interessant</span>
          <h2 className={styles.titel}>Weiterlesen</h2>
          <div className={styles.verweise}>
            <Link to="/features/vertragsanalyse" className={styles.verweis}>
              <span className={styles.verweisName}><FileText size={17} />KI-Vertragsanalyse</span>
              <span className={styles.verweisText}>
                Wie die KI Risiken erkennt, bewertet und Klartext-Empfehlungen liefert
              </span>
              <ArrowRight size={19} className={styles.pfeil} />
            </Link>

            <Link to="/features/contract-builder" className={styles.verweis}>
              <span className={styles.verweisName}><BookOpen size={17} />Contract Builder</span>
              <span className={styles.verweisText}>
                Eigene Vertragsvorlagen erstellen, im Team teilen und versionieren
              </span>
              <ArrowRight size={19} className={styles.pfeil} />
            </Link>

            <Link to="/features/digitalesignatur" className={styles.verweis}>
              <span className={styles.verweisName}><Check size={17} />Digitale Signatur</span>
              <span className={styles.verweisText}>
                Verträge rechtssicher digital unterschreiben lassen, eIDAS-konform
              </span>
              <ArrowRight size={19} className={styles.pfeil} />
            </Link>

            <Link to="/api-docs" className={styles.verweis}>
              <span className={styles.verweisName}><Code size={17} />REST API-Dokumentation</span>
              <span className={styles.verweisText}>
                Endpoints, Authentifizierung und Beispiel-Requests für Integrationen
              </span>
              <ArrowRight size={19} className={styles.pfeil} />
            </Link>

            <Link to="/pricing" className={styles.verweis}>
              <span className={styles.verweisName}><CreditCard size={17} />Vollständige Preisübersicht</span>
              <span className={styles.verweisText}>
                Alle Tarife im Vergleich, Starter, Business, Enterprise
              </span>
              <ArrowRight size={19} className={styles.pfeil} />
            </Link>

            <Link to="/ki-vertragsanalyse" className={styles.verweis}>
              <span className={styles.verweisName}><Sparkles size={17} />KI-Vertragsanalyse Guide</span>
              <span className={styles.verweisText}>
                Der komplette Guide: Wie KI-Vertragsanalyse funktioniert, KI vs. Anwalt, Kosten
              </span>
              <ArrowRight size={19} className={styles.pfeil} />
            </Link>
          </div>
        </section>

        {/* ==========================================
            SCHLUSS
            ========================================== */}
        <section className={styles.schluss}>
          <div className={styles.band}>
            <h2 className={styles.titel}>
              Bereit, mit deinem Team zu <span className={styles.akzent}>starten</span>?
            </h2>
            <p className={styles.unterzeile}>
              Enterprise, bis zu 10 Nutzer, alles inklusive, ab 29 €/Monat. Mit
              14-Tage-Geld-zurück-Garantie. Keine Mindestlaufzeit. Jederzeit kündbar.
            </p>
            <div className={styles.knoepfe}>
              <Link to={primaryTarget} className={styles.knopfVoll}>
                Enterprise starten
                <ArrowRight size={18} />
              </Link>
              <Link to={secondaryTarget} className={styles.knopfLinie}>
                Erstmal kostenlos testen
              </Link>
            </div>
            <div className={styles.schlussFakten}>
              <span><Shield size={15} /> DSGVO-konform</span>
              <span><Clock size={15} /> 14 Tage Geld-zurück</span>
              <span><Users size={15} /> Bis zu 10 Nutzer inklusive</span>
              <span><Zap size={15} /> Sofort einsatzbereit</span>
            </div>
          </div>
        </section>
      </div>

      <LandingFooter />
    </>
  );
};

export default FuerAgenturen;

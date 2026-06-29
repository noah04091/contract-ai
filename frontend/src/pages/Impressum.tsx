// Impressum - Redesign (gemeinsames Legal-Design-System, Claude-Handoff 29.06.2026)
// Rechtstext/Angaben 1:1 aus der bisherigen Fassung übernommen (wortgleich).
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import styles from "../styles/LegalRedesign.module.css";
import LandingFooter from "../components/LandingFooter";
import {
  Building2, Mail, Briefcase, User, Scale, Shield,
  Phone, Globe, MapPin, CreditCard, ExternalLink, ArrowRight,
  Calendar, Check, MessageCircle
} from "lucide-react";

interface TocItem { id: string; title: string; }

const tocItems: TocItem[] = [
  { id: "betreiber", title: "Betreiber" },
  { id: "kontakt", title: "Kontakt" },
  { id: "taetigkeit", title: "Tätigkeitsbereich" },
  { id: "verantwortlich", title: "Verantwortlich" },
  { id: "haftung", title: "Haftung" },
  { id: "streit", title: "Streitbeilegung" },
];

const sectionIcons: Record<string, React.ReactNode> = {
  betreiber: <Building2 size={22} />, kontakt: <Mail size={22} />,
  taetigkeit: <Briefcase size={22} />, verantwortlich: <User size={22} />,
  haftung: <Scale size={22} />, streit: <Shield size={22} />,
};

export default function Impressum() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const animatedRefs = useRef<(HTMLElement | null)[]>([]);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    window.scrollTo(0, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            const id = entry.target.getAttribute("data-section-id");
            if (id) setActiveSection(id);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -55% 0px" }
    );
    animatedRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });

    const fallback = window.setTimeout(() => {
      animatedRefs.current.forEach((ref) => ref?.classList.add(styles.visible));
    }, 900);

    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => { observer.disconnect(); window.clearTimeout(fallback); window.removeEventListener("scroll", onScroll); };
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !animatedRefs.current.includes(el)) animatedRefs.current.push(el);
  };

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      const top = element.getBoundingClientRect().top + window.pageYOffset - 92;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Contract AI",
    "url": "https://www.contract-ai.de",
    "logo": "https://www.contract-ai.de/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+49-176-55549923",
      "contactType": "customer service",
      "availableLanguage": ["German", "English"]
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Richard-Oberle-Weg 27",
      "addressLocality": "Durmersheim",
      "postalCode": "76648",
      "addressCountry": "DE"
    }
  };

  const setSec = (id: string) => (el: HTMLElement | null) => { addToRefs(el); sectionRefs.current[id] = el; };

  return (
    <>
      <Helmet>
        <title>Impressum | Contract AI - Rechtliche Angaben</title>
        <meta name="description" content="Impressum von Contract AI. Alle rechtlichen Angaben, Kontaktdaten und Informationen gemäß § 5 TMG zum KI-gestützten Vertragsmanagement." />
        <meta name="keywords" content="Impressum, Contract AI, Anbieterkennzeichnung, Kontakt, rechtliche Angaben" />
        <link rel="canonical" href="https://www.contract-ai.de/impressum" />
        <meta property="og:title" content="Impressum | Contract AI" />
        <meta property="og:description" content="Rechtliche Informationen und Kontaktdaten zu Contract AI." />
        <meta property="og:url" content="https://www.contract-ai.de/impressum" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Impressum | Contract AI" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <div className={styles.page}>
        <div className={styles.progress} style={{ width: `${progress}%` }} />

        {/* Hero */}
        <header className={styles.hero}>
          <div className={styles.heroGlows} aria-hidden="true" />
          <div className={styles.heroBlob} aria-hidden="true" />
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              Über Contract AI
            </span>
            <h1 className={styles.heroTitle}>Impressum</h1>
            <p className={styles.heroLead}>
              Hinter Contract AI steckt kein anonymer Konzern — sondern echte Menschen, die an faire, verständliche Verträge glauben.
            </p>
            <p className={styles.heroSubtitle}>
              Angaben gemäß § 5 TMG und § 18 Abs. 2 MStV. Transparent und vollständig — so wie es sein soll.
            </p>
            <div className={styles.heroPills}>
              <span className={styles.heroPill}><Check size={15} /> DSGVO-konform</span>
              <span className={styles.heroPill}><Check size={15} /> Server in Deutschland</span>
              <span className={styles.heroPill}><Check size={15} /> Persönlicher Support</span>
            </div>
            <div className={styles.heroMeta}>
              <span className={styles.heroMetaItem}><Calendar size={15} /> Stand: Februar 2025</span>
            </div>
          </div>
        </header>

        {/* Doc-Shell */}
        <div className={styles.shell}>
          {/* TOC */}
          <aside className={styles.toc}>
            <div className={styles.tocLabel}>Auf dieser Seite</div>
            <nav className={styles.tocNav}>
              {tocItems.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`${styles.tocItem} ${activeSection === item.id ? styles.active : ""}`}
                >
                  <span className={styles.tocNum}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.tocText}>{item.title}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className={styles.content}>

            {/* 01 Betreiber */}
            <section id="betreiber" className={`${styles.section} ${styles.reveal}`} ref={setSec("betreiber")} data-section-id="betreiber">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.betreiber}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>01 — Betreiber</div>
                  <h2 className={styles.sectionTitle}>Betreiber der Plattform</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p><strong>Contract AI</strong> wird betrieben von:</p>
                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><User size={20} /></div>
                    <div className={styles.infoLabel}>Inhaber</div>
                    <div className={styles.infoValue}>Noah Liebold</div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><Briefcase size={20} /></div>
                    <div className={styles.infoLabel}>Unternehmensform</div>
                    <div className={styles.infoValue}>Einzelunternehmen</div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><MapPin size={20} /></div>
                    <div className={styles.infoLabel}>Adresse</div>
                    <div className={styles.infoValue}>
                      Richard-Oberle-Weg 27<br />
                      76648 Durmersheim<br />
                      Deutschland
                    </div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><CreditCard size={20} /></div>
                    <div className={styles.infoLabel}>USt-IdNr.</div>
                    <div className={styles.infoValue}>DE361461136</div>
                  </div>
                </div>
              </div>
            </section>

            {/* 02 Kontakt */}
            <section id="kontakt" className={`${styles.section} ${styles.reveal}`} ref={setSec("kontakt")} data-section-id="kontakt">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.kontakt}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>02 — Kontakt</div>
                  <h2 className={styles.sectionTitle}>Kontakt</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p>Eine echte Person antwortet — meistens noch am selben Tag.</p>
                <div className={styles.infoGrid}>
                  <a href="tel:+4917655549923" className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><Phone size={20} /></div>
                    <div className={styles.infoLabel}>Telefon</div>
                    <div className={styles.infoValue}>0176 5554 9923</div>
                  </a>
                  <a href="mailto:info@contract-ai.de" className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><Mail size={20} /></div>
                    <div className={styles.infoLabel}>E-Mail</div>
                    <div className={styles.infoValue}>info@contract-ai.de</div>
                  </a>
                  <a href="https://contract-ai.de" target="_blank" rel="noreferrer" className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><Globe size={20} /></div>
                    <div className={styles.infoLabel}>Website</div>
                    <div className={styles.infoValue}>contract-ai.de</div>
                  </a>
                </div>
              </div>
            </section>

            {/* 03 Tätigkeitsbereich */}
            <section id="taetigkeit" className={`${styles.section} ${styles.reveal}`} ref={setSec("taetigkeit")} data-section-id="taetigkeit">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.taetigkeit}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>03 — Tätigkeit</div>
                  <h2 className={styles.sectionTitle}>Tätigkeitsbereich</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p>
                  Softwareentwicklung, KI-gestützte Webanwendungen und digitale SaaS-Plattformen
                  im Bereich Vertragsmanagement und Rechtstechnologie.
                </p>
                <div className={styles.calloutInfo}>
                  Contract AI bietet KI-basierte Vertragsanalyse, -optimierung und -generierung
                  für Unternehmen und Privatpersonen. Alle Daten werden DSGVO-konform auf
                  deutschen Servern verarbeitet.
                </div>
              </div>
            </section>

            {/* 04 Verantwortlich */}
            <section id="verantwortlich" className={`${styles.section} ${styles.reveal}`} ref={setSec("verantwortlich")} data-section-id="verantwortlich">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.verantwortlich}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>04 — Verantwortlich</div>
                  <h2 className={styles.sectionTitle}>Verantwortlich für den Inhalt</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div className={styles.avatar}>NL</div>
                  <div>
                    <p className={styles.infoLabel} style={{ marginBottom: "6px" }}>Gemäß § 18 Abs. 2 MStV:</p>
                    <p style={{ margin: 0 }}>
                      <strong>Noah Liebold</strong><br />
                      Richard-Oberle-Weg 27<br />
                      76648 Durmersheim
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 05 Haftung */}
            <section id="haftung" className={`${styles.section} ${styles.reveal}`} ref={setSec("haftung")} data-section-id="haftung">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.haftung}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>05 — Haftung</div>
                  <h2 className={styles.sectionTitle}>Haftungsausschluss</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <h3 className={`${styles.subTitle} ${styles.subTitleDot}`}>Haftung für Inhalte</h3>
                <p>
                  Ich bin gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
                  allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG bin ich jedoch nicht
                  verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
                </p>
                <h3 className={`${styles.subTitle} ${styles.subTitleDot}`}>Haftung für Links</h3>
                <p>
                  Für Inhalte externer Webseiten, auf die ich verlinke, übernehme ich keine
                  Verantwortung. Für diese sind ausschließlich deren Betreiber verantwortlich.
                </p>
                <h3 className={`${styles.subTitle} ${styles.subTitleDot}`}>Urheberrecht</h3>
                <p>
                  Alle Inhalte dieser Website unterliegen dem deutschen Urheberrecht.
                  Vervielfältigung, Bearbeitung oder Verbreitung bedürfen der schriftlichen
                  Zustimmung des Autors.
                </p>
              </div>
            </section>

            {/* 06 Streitbeilegung */}
            <section id="streit" className={`${styles.section} ${styles.reveal}`} ref={setSec("streit")} data-section-id="streit">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.streit}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>06 — Streitbeilegung</div>
                  <h2 className={styles.sectionTitle}>Verbraucherstreitbeilegung</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p>
                  Ich bin nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren
                  vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
                <div className={styles.calloutWarn}>
                  <strong>EU-Streitbeilegung:</strong> Die Europäische Kommission stellt eine
                  Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
                  <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer" className={styles.link}>
                    https://ec.europa.eu/consumers/odr
                    <ExternalLink size={12} style={{ marginLeft: "4px", verticalAlign: "middle" }} />
                  </a>
                </div>
              </div>
            </section>

            {/* CTA (genau EINER) */}
            <div className={`${styles.cta} ${styles.reveal}`} ref={addToRefs}>
              <div className={styles.ctaGlow} aria-hidden="true" />
              <div className={styles.ctaInner}>
                <div className={styles.ctaIcon}><MessageCircle size={26} /></div>
                <h3 className={styles.ctaTitle}>Haben Sie Fragen?</h3>
                <p className={styles.ctaText}>
                  Kein Callcenter, keine Warteschleife — schreiben Sie uns direkt. Wir helfen Ihnen wirklich gerne weiter.
                </p>
                <a href="mailto:info@contract-ai.de" className={styles.ctaButton}>
                  Kontakt aufnehmen
                  <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </main>

          {/* Spacer */}
          <div className={styles.spacer} aria-hidden="true" />
        </div>
      </div>

      <LandingFooter />
    </>
  );
}

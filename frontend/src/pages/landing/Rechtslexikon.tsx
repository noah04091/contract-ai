import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useReducedMotion } from "framer-motion";
import { Search, X, ArrowRight, BookOpen } from "lucide-react";
import LandingFooter from "../../components/LandingFooter";
import { legalTerms } from "../../data/legalTerms";
import { LEGAL_AREA_INFO } from "../../types/clauseLibrary";
import type { LegalArea, LegalTerm } from "../../types/clauseLibrary";
import { termPath, termUrl, SITE_URL, LEXIKON_BASE_PATH, hexToRgba } from "../../utils/lexikon";
import styles from "../../styles/Rechtslexikon.module.css";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Rechtslexikon() {
  const [query, setQuery] = useState("");
  const [activeArea, setActiveArea] = useState<"all" | LegalArea>("all");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Begriffe pro Rechtsgebiet zählen (für Chip-Zähler)
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    legalTerms.forEach((t) => {
      counts[t.legalArea] = (counts[t.legalArea] || 0) + 1;
    });
    return counts;
  }, []);

  // Filtern nach Rechtsgebiet + Suche
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return legalTerms.filter((t) => {
      if (activeArea !== "all" && t.legalArea !== activeArea) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.simpleExplanation.toLowerCase().includes(q) ||
        t.legalDefinition.toLowerCase().includes(q)
      );
    });
  }, [query, activeArea]);

  // Nach Anfangsbuchstabe gruppieren + alphabetisch sortieren
  const grouped = useMemo(() => {
    const groups: Record<string, LegalTerm[]> = {};
    filtered.forEach((t) => {
      const letter = (t.letterGroup || t.term.charAt(0)).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(t);
    });
    Object.keys(groups).forEach((letter) => {
      groups[letter].sort((a, b) => a.term.localeCompare(b.term, "de"));
    });
    return groups;
  }, [filtered]);

  const availableLetters = useMemo(() => new Set(Object.keys(grouped)), [grouped]);
  const sortedLetters = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b, "de")),
    [grouped]
  );

  // Scroll-Spy: markiert den Buchstaben des aktuell sichtbaren Abschnitts
  useEffect(() => {
    const sections = sortedLetters
      .map((l) => document.getElementById(`letter-${l}`))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) {
      setActiveLetter(null);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveLetter(visible[0].target.id.replace("letter-", ""));
        }
      },
      { rootMargin: "-170px 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [sortedLetters]);

  // --- SEO Schema ---
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Rechtslexikon", item: `${SITE_URL}${LEXIKON_BASE_PATH}` },
    ],
  };

  const definedTermSetSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Contract AI Rechtslexikon",
    description:
      "Juristische Begriffe aus dem deutschen Vertrags-, Arbeits-, Miet-, Handels- und Datenschutzrecht – verständlich erklärt.",
    url: `${SITE_URL}${LEXIKON_BASE_PATH}`,
    hasDefinedTerm: legalTerms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.simpleExplanation,
      url: termUrl(t.id),
    })),
  };

  const reveal = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "0px 0px -60px 0px" },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <>
      <Helmet>
        <title>Rechtslexikon: Juristische Begriffe verständlich erklärt | Contract AI</title>
        <meta
          name="description"
          content="Kostenloses Rechtslexikon: über 90 juristische Begriffe aus dem deutschen Recht – in einfacher Sprache erklärt, mit Gesetzesbezug und Beispielen."
        />
        <meta
          name="keywords"
          content="Rechtslexikon, juristische Begriffe, Rechtsbegriffe erklärt, Vertragsrecht, Arbeitsrecht, Mietrecht, DSGVO, Gesetz, Definition"
        />
        <link rel="canonical" href={`${SITE_URL}${LEXIKON_BASE_PATH}`} />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Rechtslexikon: Juristische Begriffe verständlich erklärt | Contract AI" />
        <meta
          property="og:description"
          content="Über 90 juristische Begriffe verständlich erklärt – mit Gesetzesbezug und Praxisbeispielen."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}${LEXIKON_BASE_PATH}`} />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rechtslexikon: Juristische Begriffe verständlich erklärt" />
        <meta
          name="twitter:description"
          content="Über 90 juristische Begriffe verständlich erklärt – mit Gesetzesbezug und Praxisbeispielen."
        />

        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(definedTermSetSchema)}</script>
      </Helmet>

      <div className={styles.page}>
        {/* HERO */}
        <header className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={`${styles.container} ${styles.heroInner}`}>
            <span className={styles.eyebrow}>
              <BookOpen size={15} aria-hidden="true" /> Rechtslexikon
            </span>
            <h1 className={styles.heroTitle}>
              Recht, <span className={styles.accent}>verständlich</span> erklärt.
            </h1>
            <p className={styles.heroSubtitle}>
              {legalTerms.length} juristische Begriffe aus dem deutschen Recht – in klarer Sprache,
              mit Gesetzesbezug und Beispielen aus der Praxis.
            </p>

            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} size={20} aria-hidden="true" />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Begriff suchen, z. B. „Kündigung“ oder „DSGVO“…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechtsbegriff suchen"
              />
              {query && (
                <button className={styles.searchClear} onClick={() => setQuery("")} aria-label="Suche zurücksetzen">
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className={styles.trustRow}>
              <span className={styles.trustItem}>
                <strong>{legalTerms.length}</strong> Begriffe
              </span>
              <span className={styles.trustSep} />
              <span className={styles.trustItem}>
                <strong>{Object.keys(areaCounts).length}</strong> Rechtsgebiete
              </span>
              <span className={styles.trustSep} />
              <span className={styles.trustItem}>Mit Gesetzesbezug</span>
            </div>

            <div className={styles.srOnly} aria-live="polite">
              {query || activeArea !== "all" ? `${filtered.length} Begriffe gefunden` : ""}
            </div>
          </div>
        </header>

        {/* FILTER + A–Z */}
        <div className={styles.controls}>
          <div className={styles.container}>
            <div className={styles.chips}>
              <button
                className={`${styles.chip} ${activeArea === "all" ? styles.chipActive : ""}`}
                onClick={() => setActiveArea("all")}
              >
                Alle
                <span className={styles.chipCount}>{legalTerms.length}</span>
              </button>
              {(Object.keys(LEGAL_AREA_INFO) as LegalArea[]).map((area) => {
                const info = LEGAL_AREA_INFO[area];
                const count = areaCounts[area] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={area}
                    className={`${styles.chip} ${activeArea === area ? styles.chipActive : ""}`}
                    onClick={() => setActiveArea(area)}
                  >
                    <span className={styles.chipDot} style={{ background: info.color }} />
                    {info.label}
                    <span className={styles.chipCount}>{count}</span>
                  </button>
                );
              })}
            </div>

            <nav className={styles.azNav} aria-label="Alphabetische Navigation">
              {ALPHABET.map((letter) =>
                availableLetters.has(letter) ? (
                  <a
                    key={letter}
                    href={`#letter-${letter}`}
                    className={`${styles.azLink} ${activeLetter === letter ? styles.azActive : ""}`}
                  >
                    {letter}
                  </a>
                ) : (
                  <span key={letter} className={`${styles.azLink} ${styles.azDisabled}`} aria-hidden="true">
                    {letter}
                  </span>
                )
              )}
            </nav>
          </div>
        </div>

        {/* ERGEBNISSE */}
        <main className={styles.results}>
          <div className={styles.container}>
            {sortedLetters.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Kein Begriff gefunden</p>
                <p>Versuche es mit einem anderen Suchwort oder wähle ein anderes Rechtsgebiet.</p>
              </div>
            ) : (
              sortedLetters.map((letter) => (
                <section key={letter} id={`letter-${letter}`} className={styles.letterGroup}>
                  <h2 className={styles.letterHeading}>{letter}</h2>
                  <div className={styles.grid}>
                    {grouped[letter].map((term) => {
                      const info = LEGAL_AREA_INFO[term.legalArea];
                      return (
                        <motion.div key={term.id} {...reveal}>
                          <Link to={termPath(term.id)} className={styles.card}>
                            <div className={styles.cardTop}>
                              <h3 className={styles.cardTerm}>{term.term}</h3>
                              <span
                                className={styles.areaBadge}
                                style={{ background: hexToRgba(info.color, 0.1) }}
                              >
                                <span className={styles.badgeDot} style={{ background: info.color }} />
                                {info.label}
                              </span>
                            </div>
                            <p className={styles.cardExplanation}>{term.simpleExplanation}</p>
                            <div className={styles.cardFooter}>
                              <span className={styles.cardBasis}>{term.legalBasis || ""}</span>
                              <span className={styles.cardArrow}>
                                Mehr <ArrowRight size={15} aria-hidden="true" />
                              </span>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </main>

        <div className={styles.container}>
          <p className={styles.disclaimer}>
            Hinweis: Dieses Rechtslexikon bietet allgemeine, redaktionell aufbereitete Erklärungen
            und ersetzt keine Rechtsberatung im Einzelfall.
          </p>
        </div>

        <LandingFooter />
      </div>
    </>
  );
}

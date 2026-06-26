import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import LandingFooter from "../../components/LandingFooter";
import { getTermById, getRelatedTerms } from "../../data/legalTerms";
import { LEGAL_AREA_INFO } from "../../types/clauseLibrary";
import { slugToTermId, termPath, termUrl, SITE_URL, LEXIKON_BASE_PATH, hexToRgba } from "../../utils/lexikon";
import styles from "../../styles/Rechtslexikon.module.css";

// Begriff → passende „[Typ] prüfen"-Landingpage (kontextbezogene interne Verlinkung).
// Unbekannte Begriffe sind hier einfach nicht enthalten → sie behalten den generischen CTA.
const TERM_TO_PRUEFEN: Record<string, { path: string; label: string }> = {
  arbeitsvertrag: { path: "/arbeitsvertrag-pruefen", label: "Arbeitsvertrag prüfen" },
  kuendigungsschutz: { path: "/arbeitsvertrag-pruefen", label: "Arbeitsvertrag prüfen" },
  probezeit: { path: "/arbeitsvertrag-pruefen", label: "Arbeitsvertrag prüfen" },
  wettbewerbsverbot: { path: "/arbeitsvertrag-pruefen", label: "Arbeitsvertrag prüfen" },
  sozialauswahl: { path: "/arbeitsvertrag-pruefen", label: "Arbeitsvertrag prüfen" },
  aufhebungsvertrag: { path: "/aufhebungsvertrag-pruefen", label: "Aufhebungsvertrag prüfen" },
  abfindung: { path: "/aufhebungsvertrag-pruefen", label: "Aufhebungsvertrag prüfen" },
  sperrzeit: { path: "/aufhebungsvertrag-pruefen", label: "Aufhebungsvertrag prüfen" },
  mietvertrag: { path: "/mietvertrag-pruefen", label: "Mietvertrag prüfen" },
  kaution: { path: "/mietvertrag-pruefen", label: "Mietvertrag prüfen" },
  nebenkosten: { path: "/mietvertrag-pruefen", label: "Mietvertrag prüfen" },
  betriebskosten: { path: "/mietvertrag-pruefen", label: "Mietvertrag prüfen" },
  kaufvertrag: { path: "/kaufvertrag-pruefen", label: "Kaufvertrag prüfen" },
  gewaehrleistung: { path: "/kaufvertrag-pruefen", label: "Kaufvertrag prüfen" },
  eigentumsvorbehalt: { path: "/kaufvertrag-pruefen", label: "Kaufvertrag prüfen" },
  nacherfuellung: { path: "/kaufvertrag-pruefen", label: "Kaufvertrag prüfen" },
  geschaeftsgeheimnis: { path: "/nda-pruefen", label: "NDA prüfen" },
};

export default function RechtslexikonTerm() {
  const { slug } = useParams<{ slug: string }>();
  const term = slug ? getTermById(slugToTermId(slug)) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // --- Begriff nicht gefunden ---
  if (!term) {
    return (
      <>
        <Helmet>
          <title>Begriff nicht gefunden | Rechtslexikon | Contract AI</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <div className={styles.page}>
          <div className={styles.containerNarrow}>
            <div className={styles.notFound}>
              <h1>Begriff nicht gefunden</h1>
              <p>Diesen Rechtsbegriff haben wir (noch) nicht im Lexikon.</p>
              <Link to={LEXIKON_BASE_PATH} className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Zurück zum Rechtslexikon
              </Link>
            </div>
          </div>
          <LandingFooter />
        </div>
      </>
    );
  }

  const info = LEGAL_AREA_INFO[term.legalArea];
  const related = getRelatedTerms(term);
  const url = termUrl(term.id);
  const pruefenMatch = TERM_TO_PRUEFEN[term.id];

  // --- SEO Schema ---
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Rechtslexikon", item: `${SITE_URL}${LEXIKON_BASE_PATH}` },
      { "@type": "ListItem", position: 3, name: term.term, item: url },
    ],
  };

  const definedTermSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    description: term.simpleExplanation,
    url,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Contract AI Rechtslexikon",
      url: `${SITE_URL}${LEXIKON_BASE_PATH}`,
    },
    ...(term.legalBasis ? { termCode: term.legalBasis } : {}),
  };

  const metaDescription = `${term.term}: ${term.simpleExplanation}`.slice(0, 158);

  return (
    <>
      <Helmet>
        <title>{term.term} – einfach erklärt | Rechtslexikon | Contract AI</title>
        <meta name="description" content={metaDescription} />
        <meta
          name="keywords"
          content={`${term.term}, ${term.term} Definition, ${term.term} einfach erklärt, ${info.label}${
            term.legalBasis ? `, ${term.legalBasis}` : ""
          }`}
        />
        <link rel="canonical" href={url} />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content={`${term.term} – einfach erklärt | Contract AI`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${term.term} – einfach erklärt`} />
        <meta name="twitter:description" content={metaDescription} />

        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(definedTermSchema)}</script>
      </Helmet>

      <div className={styles.page}>
        <main className={styles.detailWrap}>
          <div className={styles.containerNarrow}>
            {/* Breadcrumb */}
            <nav className={styles.breadcrumb} aria-label="Brotkrumen-Navigation">
              <Link to="/">Home</Link>
              <ChevronRight size={14} className={styles.breadcrumbSep} aria-hidden="true" />
              <Link to={LEXIKON_BASE_PATH}>Rechtslexikon</Link>
              <ChevronRight size={14} className={styles.breadcrumbSep} aria-hidden="true" />
              <span className={styles.breadcrumbCurrent}>{term.term}</span>
            </nav>

            {/* Header */}
            <header className={styles.detailHeader}>
              <div className={styles.detailBadges}>
                <span
                  className={styles.areaBadge}
                  style={{ background: hexToRgba(info.color, 0.1) }}
                >
                  <span className={styles.badgeDot} style={{ background: info.color }} />
                  {info.label}
                </span>
                {term.legalBasis && <span className={styles.basisChip}>{term.legalBasis}</span>}
              </div>
              <h1 className={styles.detailTitle}>{term.term}</h1>
            </header>

            {/* Einfache Erklärung (Lead) */}
            <p className={styles.lead}>{term.simpleExplanation}</p>

            {/* Juristische Definition */}
            <section className={styles.section}>
              <h2 className={styles.sectionLabel}>Juristische Definition</h2>
              <p className={styles.definition}>{term.legalDefinition}</p>
            </section>

            {/* Beispiele */}
            {term.examples.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionLabel}>Beispiele aus der Praxis</h2>
                <ul className={styles.exampleList}>
                  {term.examples.map((example, i) => (
                    <li key={i} className={styles.exampleItem}>
                      {example}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Verwandte Begriffe */}
            {related.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionLabel}>Verwandte Begriffe</h2>
                <div className={styles.relatedGrid}>
                  {related.map((rel) => {
                    const relInfo = LEGAL_AREA_INFO[rel.legalArea];
                    return (
                      <Link key={rel.id} to={termPath(rel.id)} className={styles.relatedChip}>
                        <span className={styles.relatedDot} style={{ background: relInfo.color }} />
                        {rel.term}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* CTA */}
            <section className={styles.cta}>
              <h2 className={styles.ctaTitle}>Steht dieser Begriff in deinem Vertrag?</h2>
              <p className={styles.ctaText}>
                Lass deinen Vertrag in 60 Sekunden von unserer KI prüfen – Risiken, Fristen und
                unfaire Klauseln auf einen Blick.
              </p>
              <Link to={pruefenMatch ? pruefenMatch.path : "/ki-vertragsanalyse"} className={styles.ctaButton}>
                {pruefenMatch ? pruefenMatch.label : "Vertrag jetzt prüfen"} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              {pruefenMatch && (
                <div style={{ marginTop: 12 }}>
                  <Link to="/ki-vertragsanalyse" style={{ fontSize: "0.9rem", color: "#3b82f6", textDecoration: "none" }}>
                    Oder allgemeine KI-Vertragsanalyse ansehen →
                  </Link>
                </div>
              )}
            </section>

            <Link to={LEXIKON_BASE_PATH} className={styles.backLink}>
              <ArrowLeft size={16} aria-hidden="true" /> Alle Begriffe im Rechtslexikon
            </Link>

            <p className={styles.disclaimer}>
              Hinweis: Dieses Rechtslexikon bietet allgemeine, redaktionell aufbereitete Erklärungen
              und ersetzt keine Rechtsberatung im Einzelfall.
            </p>
          </div>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}

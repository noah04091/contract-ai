import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import Footer from "../../components/Footer";
import { getTermById, getRelatedTerms } from "../../data/legalTerms";
import { LEGAL_AREA_INFO } from "../../types/clauseLibrary";
import { slugToTermId, termPath, termUrl, SITE_URL, LEXIKON_BASE_PATH } from "../../utils/lexikon";
import styles from "../../styles/Rechtslexikon.module.css";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
                <ArrowLeft size={16} /> Zurück zum Rechtslexikon
              </Link>
            </div>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  const info = LEGAL_AREA_INFO[term.legalArea];
  const related = getRelatedTerms(term);
  const url = termUrl(term.id);

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap"
          rel="stylesheet"
        />
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
        <article className={styles.detailWrap}>
          <div className={styles.containerNarrow}>
            {/* Breadcrumb */}
            <nav className={styles.breadcrumb} aria-label="Brotkrumen-Navigation">
              <Link to="/">Home</Link>
              <ChevronRight size={14} className={styles.breadcrumbSep} />
              <Link to={LEXIKON_BASE_PATH}>Rechtslexikon</Link>
              <ChevronRight size={14} className={styles.breadcrumbSep} />
              <span className={styles.breadcrumbCurrent}>{term.term}</span>
            </nav>

            {/* Header */}
            <header className={styles.detailHeader}>
              <div className={styles.detailBadges}>
                <span
                  className={styles.areaBadge}
                  style={{ color: info.color, background: hexToRgba(info.color, 0.1) }}
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
              <span className={styles.sectionLabel}>Juristische Definition</span>
              <p className={styles.definition}>{term.legalDefinition}</p>
            </section>

            {/* Beispiele */}
            {term.examples.length > 0 && (
              <section className={styles.section}>
                <span className={styles.sectionLabel}>Beispiele aus der Praxis</span>
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
                <span className={styles.sectionLabel}>Verwandte Begriffe</span>
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
              <Link to="/ki-vertragsanalyse" className={styles.ctaButton}>
                Vertrag jetzt prüfen <ArrowRight size={18} />
              </Link>
            </section>

            <Link to={LEXIKON_BASE_PATH} className={styles.backLink}>
              <ArrowLeft size={16} /> Alle Begriffe im Rechtslexikon
            </Link>
          </div>
        </article>

        <Footer />
      </div>
    </>
  );
}

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { Helmet } from "react-helmet";
import styles from '../styles/BlogPost.module.css';

// ✅ Import der zentralen Artikel-Daten
import { articles, getArticleBySlug } from '../data/articlesData';

interface BlogPostProps {
  // You would typically get this data from props, API, or router params
  article?: {
    title: string;
    subtitle: string;
    content: string;
    category: string;
    date: string;
    readTime: string;
    author: string;
    slug: string;
  };
}

const BlogPost: React.FC<BlogPostProps> = ({ article }) => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  
  // ✅ 404-HANDLING: Saubere Behandlung unbekannter Slugs
  const rawArticle = slug ? getArticleBySlug(slug) : null;
  const isNotFound = !!slug && !rawArticle;
  const currentArticle = article || rawArticle || articles[0]; // articles[0] nur wenn KEIN slug da ist

  // 🔧 SEO-OPTIMIERUNG: Dynamische Meta-Daten
  const currentSlug = slug || currentArticle.slug;
  const canonicalUrl = isNotFound
    ? "https://www.contract-ai.de/blog"
    : `https://www.contract-ai.de/blog/${currentSlug}`;
  
  // Hole den vollständigen Artikel aus articlesData für Meta-Daten
  const fullArticle = slug && !isNotFound ? getArticleBySlug(slug) : null;
  
  // Meta-Description: Nutze excerpt vom vollständigen Artikel, sonst subtitle
  const metaDescription = fullArticle?.excerpt || currentArticle.subtitle;
  
  // Dynamischer Titel für SEO
  const pageTitle = `${currentArticle.title} | Contract AI Blog`;
  
  // OG Image URL (einheitlich mit www)
  const ogImageUrl = 'https://www.contract-ai.de/og-image.jpg';
  
  // 📅 Datum in ISO-Format konvertieren für JSON-LD
  const toISO = (dateStr: string): string => {
    // Erwartet Format "DD. Monat YYYY" (z.B. "5. Juli 2025")
    const monthMap: { [key: string]: string } = {
      'Januar': '01', 'Februar': '02', 'März': '03', 'April': '04',
      'Mai': '05', 'Juni': '06', 'Juli': '07', 'August': '08',
      'September': '09', 'Oktober': '10', 'November': '11', 'Dezember': '12'
    };
    
    const match = dateStr.match(/^(\d{1,2})\.\s+(\w+)\s+(\d{4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = monthMap[match[2]] || '01';
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
    
    // Fallback: Versuche DD.MM.YYYY Format
    const altMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (altMatch) {
      return `${altMatch[3]}-${altMatch[2].padStart(2, '0')}-${altMatch[1].padStart(2, '0')}`;
    }
    
    return dateStr; // Fallback auf Original
  };
  
  const dateISO = toISO(currentArticle.date);

  const handleBackClick = () => {
    navigate('/blog');
  };

  const handleCTAClick = () => {
    navigate('/dashboard');
  };

  const handleRelatedArticleClick = (relatedSlug: string) => {
    navigate(`/blog/${relatedSlug}`);
  };

  // ✅ Dynamische Related Articles basierend auf zentralen Daten
  const getRelatedArticles = () => {
    return articles
      .filter(art => art.slug !== currentArticle.slug) // Aktuellen Artikel ausschließen
      .slice(0, 3); // Erste 3 als Related nehmen
  };

  const relatedArticles = getRelatedArticles();

  // 🚫 404-SEITE: Wenn Artikel nicht gefunden
  if (isNotFound) {
    return (
      <>
        <Helmet>
          <title>Artikel nicht gefunden | Contract AI Blog</title>
          <meta name="robots" content="noindex,follow" />
          <link rel="canonical" href="https://www.contract-ai.de/blog" />
          <meta property="og:title" content="Artikel nicht gefunden | Contract AI Blog" />
          <meta property="og:url" content="https://www.contract-ai.de/blog" />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Contract AI" />
        </Helmet>
        <div className={styles.blogPost}>
          <section className={styles.articleHero}>
            <div className={styles.container}>
              <div className={styles.articleHeroContent}>
                <h1 className={styles.articleTitle}>Artikel nicht gefunden</h1>
                <p className={styles.articleSubtitle}>
                  Der gesuchte Beitrag existiert nicht (mehr). 
                  Entdecken Sie stattdessen unsere anderen spannenden Artikel.
                </p>
                <button className={styles.backButton} onClick={() => navigate('/blog')}>
                  <ArrowLeft size={20} />
                  Zurück zum Blog
                </button>
              </div>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        {/* Dynamischer Titel pro Artikel */}
        <title>{pageTitle}</title>
        
        {/* Dynamische Meta-Description aus Artikeldaten */}
        <meta name="description" content={metaDescription} />
        
        {/* Keywords können artikel-spezifisch sein */}
        <meta name="keywords" content={`${currentArticle.title}, ${currentArticle.category}, Contract AI, Vertragsanalyse, KI Vertragsprüfung`} />
        
        {/* ✅ DYNAMISCHE Canonical URL pro Blogpost */}
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook - Dynamisch pro Artikel */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:site_name" content="Contract AI" />
        
        {/* Zusätzliche OG-Article Tags */}
        <meta property="article:published_time" content={dateISO} />
        <meta property="article:author" content={currentArticle.author} />
        <meta property="article:section" content={currentArticle.category} />
        <meta property="article:tag" content={currentArticle.category} />
        
        {/* Twitter - Dynamisch pro Artikel */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
        
        {/* Strukturierte Daten für bessere SEO */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": currentArticle.title,
            "description": metaDescription,
            "author": {
              "@type": "Organization",
              "name": currentArticle.author
            },
            "datePublished": dateISO,
            "url": canonicalUrl,
            "image": ogImageUrl,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": canonicalUrl
            },
            "publisher": {
              "@type": "Organization",
              "name": "Contract AI",
              "logo": {
                "@type": "ImageObject",
                "url": "https://www.contract-ai.de/logo.png"
              }
            }
          })}
        </script>
      </Helmet>

      <div className={styles.blogPost}>
        {/* Article Hero */}
        <section className={styles.articleHero}>
          <div className={styles.container}>
            <div className={styles.articleHeroContent}>
              <button className={styles.backButton} onClick={handleBackClick}>
                <ArrowLeft size={20} />
                Zurück zum Blog
              </button>
              <h1 className={styles.articleTitle}>{currentArticle.title}</h1>
              <p className={styles.articleSubtitle}>{currentArticle.subtitle}</p>
              <div className={styles.articleInfo}>
                <span className={styles.infoItem}>
                  <Calendar size={16} />
                  {currentArticle.date}
                </span>
                <span className={styles.metaSeparator}>•</span>
                <span className={styles.infoItem}>
                  <Clock size={16} />
                  {currentArticle.readTime}
                </span>
                <span className={styles.metaSeparator}>•</span>
                <span className={styles.infoItem}>
                  <User size={16} />
                  {currentArticle.author}
                </span>
                <span className={styles.metaSeparator}>•</span>
                <span className={styles.category}>{currentArticle.category}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Article Body */}
        <section className={styles.articleBody}>
          <div className={styles.container}>
            <div className={styles.articleContentFull}>
              <div 
                className={styles.content}
                dangerouslySetInnerHTML={{ __html: currentArticle.content }}
              />
            </div>
          </div>
        </section>

        {/* Related Articles */}
        <section className={styles.relatedSection}>
          <div className={styles.container}>
            <h2 className={styles.relatedTitle}>Ähnliche Artikel</h2>
            <div className={styles.relatedGrid}>
              {relatedArticles.map((relatedArticle) => (
                <article 
                  key={relatedArticle.id}
                  className={styles.relatedCard}
                  onClick={() => handleRelatedArticleClick(relatedArticle.slug)}
                >
                  <h3>{relatedArticle.title}</h3>
                  <p>{relatedArticle.subtitle}</p>
                  <span className={styles.relatedLink}>Artikel lesen →</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <h2 className={styles.ctaTitle}>Lassen Sie Ihre Verträge von KI prüfen</h2>
            <p className={styles.ctaSubtitle}>
              Contract AI analysiert Ihre Verträge in Sekunden und warnt vor problematischen Klauseln
            </p>
            <button className={styles.ctaButton} onClick={handleCTAClick}>
              Jetzt kostenlos Vertrag prüfen
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default BlogPost;
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
  
  // ✅ SIMPLIFIED: Nutzt zentrale Funktionen statt lokales Array
  const findArticleBySlug = (articleSlug: string | undefined) => {
    if (!articleSlug) return articles[0]; // Fallback zum ersten Artikel
    
    const foundArticle = getArticleBySlug(articleSlug);
    return foundArticle || articles[0]; // Fallback zum ersten Artikel wenn nicht gefunden
  };

  const currentArticle = article || findArticleBySlug(slug);

  const handleBackClick = () => {
    navigate('/blog');
  };

  const handleCTAClick = () => {
    navigate('/dashboard');
  };

  const handleRelatedArticleClick = (slug: string) => {
    navigate(`/blog/${slug}`);
  };

  // ✅ Dynamische Related Articles basierend auf zentralen Daten
  const getRelatedArticles = () => {
    return articles
      .filter(art => art.slug !== currentArticle.slug) // Aktuellen Artikel ausschließen
      .slice(0, 3); // Erste 3 als Related nehmen
  };

  const relatedArticles = getRelatedArticles();

  return (
    <>
      <Helmet>
        <title>Beitrag lesen | Contract AI Blog</title>
        <meta name="description" content="Detaillierte Einblicke in Vertragsanalyse, KI-gestützte Optimierung und die Zukunft des Vertragsmanagements — jetzt im Contract AI Blogpost lesen." />
        <meta name="keywords" content="Blogpost Vertragsanalyse, KI Vertragsoptimierung, Contract AI Beitrag, Vertragsmanagement Wissen" />
        <link rel="canonical" href="https://contract-ai.de/blog/beitrag" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Beitrag lesen | Contract AI Blog" />
        <meta property="og:description" content="Erfahre alles über aktuelle Trends und Strategien in der Vertragsanalyse und -optimierung. Mehr im Blog von Contract AI." />
        <meta property="og:url" content="https://contract-ai.de/blog/beitrag" />
        <meta property="og:type" content="article" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Beitrag lesen | Contract AI Blog" />
        <meta name="twitter:description" content="Insights zur Vertragswelt, direkt aus dem Contract AI Blog. Jetzt Beitrag entdecken." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
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
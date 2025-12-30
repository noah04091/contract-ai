import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, Share2, Twitter, Linkedin, Link2, ArrowRight } from 'lucide-react';
import { Helmet } from "react-helmet-async";
import styles from '../styles/BlogPost.module.css';
import Footer from '../components/Footer';

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
  const articleRef = useRef<HTMLDivElement>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // Reading Progress Bar
  useEffect(() => {
    const handleScroll = () => {
      if (!articleRef.current) return;

      const element = articleRef.current;
      const totalHeight = element.offsetHeight - window.innerHeight;
      const windowScrollTop = window.scrollY - element.offsetTop;

      if (windowScrollTop <= 0) {
        setReadingProgress(0);
      } else if (windowScrollTop >= totalHeight) {
        setReadingProgress(100);
      } else {
        setReadingProgress((windowScrollTop / totalHeight) * 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    window.scrollTo(0, 0);
  };

  // Share Functions
  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(currentArticle.title)}&url=${encodeURIComponent(canonicalUrl)}`;
    window.open(url, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`;
    window.open(url, '_blank');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // ✅ Dynamische Related Articles basierend auf zentralen Daten
  const getRelatedArticles = () => {
    return articles
      .filter(art => art.slug !== currentArticle.slug) // Aktuellen Artikel ausschließen
      .slice(0, 3); // Erste 3 als Related nehmen
  };

  const relatedArticles = getRelatedArticles();

  // Author Info
  const authorInfo = {
    name: currentArticle.author || 'Contract AI Team',
    bio: 'Experten für KI-gestützte Vertragsanalyse. Wir helfen Unternehmen und Privatpersonen, ihre Verträge besser zu verstehen und zu optimieren.',
    initial: (currentArticle.author || 'C').charAt(0)
  };

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

      <div className={styles.blogPost} ref={articleRef}>
        {/* Reading Progress Bar */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${readingProgress}%` }}
          />
        </div>

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

              {/* Share Section */}
              <div className={styles.shareSection}>
                <span className={styles.shareLabel}>
                  <Share2 size={18} />
                  Artikel teilen
                </span>
                <div className={styles.shareButtons}>
                  <button
                    className={`${styles.shareButton} ${styles.twitter}`}
                    onClick={shareOnTwitter}
                    title="Auf Twitter teilen"
                  >
                    <Twitter size={20} />
                  </button>
                  <button
                    className={`${styles.shareButton} ${styles.linkedin}`}
                    onClick={shareOnLinkedIn}
                    title="Auf LinkedIn teilen"
                  >
                    <Linkedin size={20} />
                  </button>
                  <button
                    className={`${styles.shareButton} ${styles.copy}`}
                    onClick={copyLink}
                    title={copied ? 'Link kopiert!' : 'Link kopieren'}
                  >
                    <Link2 size={20} />
                  </button>
                </div>
              </div>

              {/* Author Box */}
              <div className={styles.authorBox}>
                <div className={styles.authorAvatar}>
                  {authorInfo.initial}
                </div>
                <div className={styles.authorInfo}>
                  <span className={styles.authorLabel}>Geschrieben von</span>
                  <h4 className={styles.authorName}>{authorInfo.name}</h4>
                  <p className={styles.authorBio}>{authorInfo.bio}</p>
                  <div className={styles.authorSocial}>
                    <button className={styles.authorSocialLink} title="Twitter">
                      <Twitter size={16} />
                    </button>
                    <button className={styles.authorSocialLink} title="LinkedIn">
                      <Linkedin size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Related Articles */}
        <section className={styles.relatedSection}>
          <div className={styles.container}>
            <div className={styles.relatedHeader}>
              <h2 className={styles.relatedTitle}>Das könnte Sie auch interessieren</h2>
              <p className={styles.relatedSubtitle}>Weitere spannende Artikel aus unserem Blog</p>
            </div>
            <div className={styles.relatedGrid}>
              {relatedArticles.map((relatedArticle) => (
                <article
                  key={relatedArticle.id}
                  className={styles.relatedCard}
                  onClick={() => handleRelatedArticleClick(relatedArticle.slug)}
                >
                  <div className={styles.relatedCardImage}>
                    <img
                      src={relatedArticle.image}
                      alt={relatedArticle.title}
                      className={styles.relatedCardImg}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.relatedCardContent}>
                    <div className={styles.relatedCardMeta}>
                      <span><Clock size={14} /> {relatedArticle.readTime}</span>
                    </div>
                    <h3>{relatedArticle.title}</h3>
                    <p>{relatedArticle.excerpt}</p>
                    <span className={styles.relatedLink}>
                      Weiterlesen
                      <ArrowRight size={16} />
                    </span>
                  </div>
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

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
};

export default BlogPost;
// 📁 src/pages/Blog.tsx - MODIFIZIERT für zentrale Artikel-Daten
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from "react-helmet-async";
import { Search, Calendar, Clock, ArrowRight, Sparkles, Mail, TrendingUp } from 'lucide-react';
import styles from '../styles/Blog.module.css';
import Footer from '../components/Footer';

// ✅ Import der zentralen Artikel-Daten
import { getArticlesByCategory, searchArticles, Article, articles } from '../data/articlesData';

interface CategoryFilter {
  key: string;
  label: string;
}

const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('alle');
  const [searchTerm, setSearchTerm] = useState('');

  const categories: CategoryFilter[] = [
    { key: 'alle', label: 'Alle Artikel' },
    { key: 'mietrecht', label: 'Mietrecht' },
    { key: 'arbeitsrecht', label: 'Arbeitsrecht' },
    { key: 'kaufvertraege', label: 'Kaufverträge' },
    { key: 'agb', label: 'AGB & Verbraucherrecht' },
    { key: 'tipps', label: 'Praxis-Tipps' }
  ];

  // ✅ SIMPLIFIED: Nutzt zentrale Funktionen statt lokales Array
  const filteredArticles = useMemo((): Article[] => {
    let filtered = getArticlesByCategory(activeCategory);

    // Filter by search term
    if (searchTerm) {
      filtered = searchArticles(searchTerm);
      // Falls Kategorie aktiv ist, zusätzlich nach Kategorie filtern
      if (activeCategory !== 'alle') {
        filtered = filtered.filter((article: Article) => article.category === activeCategory);
      }
    }

    return filtered;
  }, [activeCategory, searchTerm]);

  const handleCategoryFilter = (category: string) => {
    setActiveCategory(category);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleArticleClick = (slug: string) => {
    navigate(`/blog/${slug}`);
  };

  const handleCTAClick = () => {
    navigate('/dashboard');
  };

  const getCategoryDisplayName = (categoryKey: string): string => {
    const category = categories.find(cat => cat.key === categoryKey);
    return category ? category.label : categoryKey;
  };

  const getCategoryColor = (categoryKey: string): { color: string; background: string } => {
    const colors: Record<string, { color: string; background: string }> = {
      tipps: { color: '#16a34a', background: '#f0fdf4' },
      mietrecht: { color: '#d97706', background: '#fffbeb' },
      arbeitsrecht: { color: '#2563eb', background: '#eff6ff' },
      kaufvertraege: { color: '#9333ea', background: '#faf5ff' },
      agb: { color: '#dc2626', background: '#fef2f2' },
    };
    return colors[categoryKey] || { color: '#0052cc', background: '#e6f3ff' };
  };

  // Featured Article (neuester Artikel)
  const featuredArticle = articles[0];

  // Restliche Artikel (ohne Featured)
  const remainingArticles = useMemo(() => {
    if (activeCategory === 'alle' && !searchTerm) {
      return filteredArticles.slice(1); // Skip featured
    }
    return filteredArticles;
  }, [filteredArticles, activeCategory, searchTerm]);

  // Stats für Hero
  const totalArticles = articles.length;
  const totalCategories = categories.length - 1; // Minus "Alle"

  // Scroll-reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll(`.${styles.animateOnScroll}`);
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [remainingArticles]);

  return (
    <>
      <Helmet>
        <title>Blog & News zu Vertragsanalyse | Contract AI</title>
        <meta
          name="description"
          content="Entdecke aktuelle Artikel, Insights und Tipps rund um Vertragsanalyse, Vertragsoptimierung und KI-gestütztes Vertragsmanagement im Contract AI Blog."
        />
        <meta
          name="keywords"
          content="Vertragsanalyse Blog, Contract AI News, Vertragsoptimierung Tipps, KI Vertragsmanagement Artikel"
        />
        <link rel="canonical" href="https://www.contract-ai.de/blog" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Blog & News zu Vertragsanalyse | Contract AI" />
        <meta
          property="og:description"
          content="Lesen Sie spannende Beiträge über Vertragsanalyse, Optimierung und KI-basierte Lösungen. Immer up to date mit dem Contract AI Blog."
        />
        <meta property="og:url" content="https://www.contract-ai.de/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog & News zu Vertragsanalyse | Contract AI" />
        <meta
          name="twitter:description"
          content="Insights und Expertenwissen rund um Verträge, KI und Optimierung — im Contract AI Blog."
        />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.contract-ai.de" },
              { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.contract-ai.de/blog" }
            ]
          })}
        </script>
      </Helmet>

      <div className={styles.blog}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>
                <Sparkles size={16} />
                Wissen für klügere Verträge
              </div>
              <h1 className={styles.heroTitle}>Contract AI Blog</h1>
              <p className={styles.heroSubtitle}>
                Expertenwissen zu Verträgen, Rechtsfragen und smarten Lösungen für Ihren Alltag
              </p>
              <div className={styles.heroStats}>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatNumber}>{totalArticles}+</span>
                  <span className={styles.heroStatLabel}>Artikel</span>
                </div>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatNumber}>{totalCategories}</span>
                  <span className={styles.heroStatLabel}>Kategorien</span>
                </div>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatNumber}>5 Min</span>
                  <span className={styles.heroStatLabel}>Ø Lesezeit</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Article */}
        {activeCategory === 'alle' && !searchTerm && (
          <section className={styles.featuredSection}>
            <div className={styles.containerWide}>
              <article
                className={styles.featuredArticle}
                onClick={() => handleArticleClick(featuredArticle.slug)}
              >
                <div className={styles.featuredImage}>
                  <img
                    src={featuredArticle.image}
                    alt={featuredArticle.title}
                    className={styles.featuredImg}
                  />
                </div>
                <div className={styles.featuredContent}>
                  <div className={styles.featuredBadge}>
                    <TrendingUp size={14} />
                    Neuester Artikel
                  </div>
                  <div className={styles.featuredMeta}>
                    <span className={styles.featuredMetaItem}>
                      <Calendar size={14} />
                      {featuredArticle.date}
                    </span>
                    <span className={styles.featuredMetaItem}>
                      <Clock size={14} />
                      {featuredArticle.readTime}
                    </span>
                  </div>
                  <h2 className={styles.featuredTitle}>{featuredArticle.title}</h2>
                  <p className={styles.featuredExcerpt}>{featuredArticle.excerpt}</p>
                  <button className={styles.featuredCta}>
                    Artikel lesen
                    <ArrowRight size={18} />
                  </button>
                </div>
              </article>
            </div>
          </section>
        )}

        {/* Filter Section */}
        <section className={styles.filterSection}>
          <div className={styles.container}>
            <div className={styles.filters}>
              {categories.map((category) => (
                <button
                  key={category.key}
                  className={`${styles.filterButton} ${
                    activeCategory === category.key ? styles.active : ''
                  }`}
                  onClick={() => handleCategoryFilter(category.key)}
                >
                  {category.label}
                </button>
              ))}
            </div>
            
            <div className={styles.searchBar}>
              <Search className={styles.searchIcon} size={20} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Artikel durchsuchen..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
        </section>

        {/* Articles Section */}
        <section className={styles.articlesSection}>
          <div className={styles.containerWide}>
            <h2 className={styles.sectionTitle}>
              {activeCategory === 'alle' ? 'Neueste Artikel' : getCategoryDisplayName(activeCategory)}
            </h2>
            
            {remainingArticles.length === 0 ? (
              <div className={styles.noResults}>
                <p>Keine Artikel gefunden. Versuchen Sie andere Suchbegriffe oder wählen Sie eine andere Kategorie.</p>
              </div>
            ) : (
              <>
                <div className={styles.articlesGrid}>
                  {remainingArticles.slice(0, 3).map((article: Article) => (
                    <article
                      key={article.id}
                      className={`${styles.articleCard} ${styles.animateOnScroll}`}
                      onClick={() => handleArticleClick(article.slug)}
                    >
                      <div className={styles.articleImage}>
                        <img
                          src={article.image}
                          alt={article.title}
                          className={styles.articleImg}
                          loading="lazy"
                        />
                      </div>
                      <div className={styles.articleContent}>
                        <div className={styles.articleMeta}>
                          <span
                            className={styles.articleCategory}
                            style={{
                              color: getCategoryColor(article.category).color,
                              background: getCategoryColor(article.category).background,
                            }}
                          >
                            {getCategoryDisplayName(article.category)}
                          </span>
                          <span className={styles.metaSeparator}>•</span>
                          <span className={styles.articleReadTime}>
                            <Clock size={14} />
                            {article.readTime}
                          </span>
                          <span className={styles.metaSeparator}>•</span>
                          <span className={styles.articleDate}>
                            <Calendar size={14} />
                            {article.date}
                          </span>
                        </div>
                        <h3 className={styles.articleTitle}>{article.title}</h3>
                        <p className={styles.articleExcerpt}>{article.excerpt}</p>
                        <div className={styles.articleAuthor}>
                          <div className={styles.authorAvatar}>
                            {article.author?.charAt(0) || 'C'}
                          </div>
                          <span className={styles.authorName}>
                            von <strong>{article.author || 'Contract AI'}</strong>
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Newsletter Banner nach ersten 3 Artikeln */}
                {remainingArticles.length > 3 && (
                  <div className={styles.newsletterBanner}>
                    <div className={styles.newsletterContent}>
                      <div className={styles.newsletterIcon}>
                        <Mail size={24} />
                      </div>
                      <h3 className={styles.newsletterTitle}>Keine Neuigkeiten verpassen</h3>
                      <p className={styles.newsletterText}>
                        Erhalten Sie die neuesten Artikel und Tipps direkt in Ihr Postfach.
                      </p>
                    </div>
                    <form className={styles.newsletterForm} onSubmit={(e) => e.preventDefault()}>
                      <input
                        type="email"
                        placeholder="Ihre E-Mail-Adresse"
                        className={styles.newsletterInput}
                      />
                      <button type="submit" className={styles.newsletterButton}>
                        Abonnieren
                      </button>
                    </form>
                  </div>
                )}

                {/* Restliche Artikel */}
                {remainingArticles.length > 3 && (
                  <div className={styles.articlesGrid}>
                    {remainingArticles.slice(3).map((article: Article) => (
                      <article
                        key={article.id}
                        className={`${styles.articleCard} ${styles.animateOnScroll}`}
                        onClick={() => handleArticleClick(article.slug)}
                      >
                        <div className={styles.articleImage}>
                          <img
                            src={article.image}
                            alt={article.title}
                            className={styles.articleImg}
                            loading="lazy"
                          />
                        </div>
                        <div className={styles.articleContent}>
                          <div className={styles.articleMeta}>
                            <span
                              className={styles.articleCategory}
                              style={{
                                color: getCategoryColor(article.category).color,
                                background: getCategoryColor(article.category).background,
                              }}
                            >
                              {getCategoryDisplayName(article.category)}
                            </span>
                            <span className={styles.metaSeparator}>•</span>
                            <span className={styles.articleReadTime}>
                              <Clock size={14} />
                              {article.readTime}
                            </span>
                            <span className={styles.metaSeparator}>•</span>
                            <span className={styles.articleDate}>
                              <Calendar size={14} />
                              {article.date}
                            </span>
                          </div>
                          <h3 className={styles.articleTitle}>{article.title}</h3>
                          <p className={styles.articleExcerpt}>{article.excerpt}</p>
                          <div className={styles.articleAuthor}>
                            <div className={styles.authorAvatar}>
                              {article.author?.charAt(0) || 'C'}
                            </div>
                            <span className={styles.authorName}>
                              von <strong>{article.author || 'Contract AI'}</strong>
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
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

export default Blog;
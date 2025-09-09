// 📁 src/pages/Blog.tsx - MODIFIZIERT für zentrale Artikel-Daten
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from "react-helmet";
import { Search, Calendar, Clock, ArrowRight } from 'lucide-react';
import styles from '../styles/Blog.module.css';

// ✅ Import der zentralen Artikel-Daten
import { getArticlesByCategory, searchArticles, Article } from '../data/articlesData';

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
        <meta property="og:url" content="https://contract-ai.de/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog & News zu Vertragsanalyse | Contract AI" />
        <meta
          name="twitter:description"
          content="Insights und Expertenwissen rund um Verträge, KI und Optimierung — im Contract AI Blog."
        />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className={styles.blog}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <h1 className={styles.heroTitle}>Contract AI Blog</h1>
            <p className={styles.heroSubtitle}>
              Expertenwissen zu Verträgen, Rechtsfragen und smarten Lösungen für Ihren Alltag
            </p>
          </div>
        </section>

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
            
            {filteredArticles.length === 0 ? (
              <div className={styles.noResults}>
                <p>Keine Artikel gefunden. Versuchen Sie andere Suchbegriffe oder wählen Sie eine andere Kategorie.</p>
              </div>
            ) : (
              <div className={styles.articlesGrid}>
                {filteredArticles.map((article: Article) => (
                  <article
                    key={article.id}
                    className={styles.articleCard}
                    onClick={() => handleArticleClick(article.slug)}
                  >
                    <div className={styles.articleImage}>
                      <span className={styles.articleIcon}>{article.icon}</span>
                    </div>
                    <div className={styles.articleContent}>
                      <div className={styles.articleMeta}>
                        <span className={styles.articleCategory}>
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
                      <div className={styles.articleCta}>
                        <span>Artikel lesen</span>
                        <ArrowRight className={styles.ctaIcon} size={16} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
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
      </div>
    </>
  );
};

export default Blog;
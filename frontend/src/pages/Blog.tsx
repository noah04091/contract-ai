import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Clock, ArrowRight } from 'lucide-react';
import styles from '../styles/Blog.module.css';

interface BlogArticle {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  icon: string;
  slug: string;
}

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

  const articles: BlogArticle[] = [
    {
      id: 1,
      title: '5 Warnsignale: So erkennen Sie schlechte Verträge sofort',
      excerpt: 'Versteckte Kosten, unfaire Klauseln, einseitige Bedingungen – lernen Sie die häufigsten Fallen kennen und schützen Sie sich vor teuren Fehlentscheidungen.',
      category: 'tipps',
      date: '23. Mai 2025',
      readTime: '5 Min. Lesezeit',
      icon: '📋',
      slug: 'warnsignale-schlechte-vertraege'
    },
    {
      id: 2,
      title: 'Mietvertrag-Check: Diese Klauseln sind unwirksam',
      excerpt: 'Schönheitsreparaturen, Haustierhaltung, Kautionshöhe – welche Klauseln in Ihrem Mietvertrag rechtlich problematisch sind und was Sie dagegen tun können.',
      category: 'mietrecht',
      date: '20. Mai 2025',
      readTime: '8 Min. Lesezeit',
      icon: '🏠',
      slug: 'mietvertrag-unwirksame-klauseln'
    },
    {
      id: 3,
      title: 'Arbeitsvertrag verstehen: Überstunden, Urlaub & Kündigung',
      excerpt: 'Was steht wirklich in Ihrem Arbeitsvertrag? Wir erklären die wichtigsten Klauseln und Ihre Rechte als Arbeitnehmer.',
      category: 'arbeitsrecht',
      date: '18. Mai 2025',
      readTime: '6 Min. Lesezeit',
      icon: '💼',
      slug: 'arbeitsvertrag-rechte-verstehen'
    },
    {
      id: 4,
      title: 'AGB-Fallen bei Online-Shopping: Darauf müssen Sie achten',
      excerpt: 'Automatische Vertragsverlängerung, versteckte Kosten, eingeschränkte Gewährleistung – so durchschauen Sie problematische AGB.',
      category: 'agb',
      date: '15. Mai 2025',
      readTime: '4 Min. Lesezeit',
      icon: '📜',
      slug: 'agb-fallen-online-shopping'
    },
    {
      id: 5,
      title: 'Autokauf-Vertrag: Gewährleistung, Sachmängel & Rücktritt',
      excerpt: 'Beim Autokauf kann viel schiefgehen. So schützen Sie sich vor versteckten Mängeln und problematischen Verkäufern.',
      category: 'kaufvertraege',
      date: '12. Mai 2025',
      readTime: '7 Min. Lesezeit',
      icon: '🚗',
      slug: 'autokauf-vertrag-gewährleistung'
    },
    {
      id: 6,
      title: 'Vertragsverhandlung: So erreichen Sie bessere Bedingungen',
      excerpt: 'Auch als Privatperson können Sie Verträge nachverhandeln. Mit diesen Strategien erreichen Sie fairere Konditionen.',
      category: 'tipps',
      date: '10. Mai 2025',
      readTime: '5 Min. Lesezeit',
      icon: '⚖️',
      slug: 'vertragsverhandlung-strategien'
    },
    {
      id: 7,
      title: 'Widerrufsrecht: 14 Tage richtig nutzen',
      excerpt: 'Das Widerrufsrecht schützt Verbraucher – aber nur, wenn Sie es richtig anwenden. Die wichtigsten Regeln und Ausnahmen.',
      category: 'agb',
      date: '8. Mai 2025',
      readTime: '6 Min. Lesezeit',
      icon: '↩️',
      slug: 'widerrufsrecht-richtig-nutzen'
    },
    {
      id: 8,
      title: 'Kündigung Arbeitsvertrag: Fristen und Formvorschriften',
      excerpt: 'Kündigungsfristen, Formfehler, Kündigungsschutz – was Arbeitnehmer und Arbeitgeber bei Kündigungen beachten müssen.',
      category: 'arbeitsrecht',
      date: '5. Mai 2025',
      readTime: '9 Min. Lesezeit',
      icon: '📋',
      slug: 'kuendigung-arbeitsvertrag-fristen'
    }
  ];

  const filteredArticles = useMemo(() => {
    let filtered = articles;

    // Filter by category
    if (activeCategory !== 'alle') {
      filtered = filtered.filter(article => article.category === activeCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [activeCategory, searchTerm, articles]);

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
              {filteredArticles.map((article) => (
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
  );
};

export default Blog;
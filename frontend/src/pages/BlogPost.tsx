import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import styles from '../styles/BlogPost.module.css';

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
  
  // Alle verfügbaren Artikel (sollte später aus einer API/CMS kommen)
  const allArticles = [
    {
      slug: 'warnsignale-schlechte-vertraege',
      title: '5 Warnsignale: So erkennen Sie schlechte Verträge sofort',
      subtitle: 'Versteckte Kosten, unfaire Klauseln, einseitige Bedingungen – lernen Sie die häufigsten Fallen kennen',
      category: 'Praxis-Tipps',
      date: '23. Mai 2025',
      readTime: '5 Min. Lesezeit',
      author: 'Contract AI Team',
      content: `
        <p>Täglich schließen wir Verträge ab – beim Online-Shopping, der Wohnungssuche oder beim neuen Mobilfunkvertrag. Doch nicht alle Verträge sind fair gestaltet. Einige enthalten Fallen, die später teuer werden können.</p>

        <p>Als Verbraucherschutz-Experte und Entwickler von Contract AI habe ich tausende Verträge analysiert. Dabei sind mir immer wieder dieselben Warnsignale aufgefallen, die auf problematische Vertragsbedingungen hindeuten.</p>

        <h2>1. Unklare oder schwammige Formulierungen</h2>
        
        <p>Seriöse Verträge sind klar und verständlich formuliert. Warnsignale sind Begriffe wie:</p>
        
        <ul>
          <li>"angemessen"</li>
          <li>"nach billigem Ermessen"</li>
          <li>"marktüblich"</li>
          <li>"unverzüglich"</li>
        </ul>

        <p>Diese Formulierungen lassen dem Vertragspartner viel Interpretationsspielraum – meist zu Ihren Ungunsten.</p>

        <div class="highlight-box">
          <h4>Praxis-Tipp</h4>
          <p>Bestehen Sie auf konkreten Zahlen, Fristen und Bedingungen. Statt "angemessene Bearbeitungszeit" sollte "maximal 14 Tage" im Vertrag stehen.</p>
        </div>

        <h2>2. Einseitige Kündigungsrechte</h2>

        <p>Problematisch wird es, wenn nur eine Partei den Vertrag kündigen oder ändern kann. Typische Beispiele:</p>

        <ul>
          <li>Der Anbieter kann jederzeit kündigen, Sie sind aber an lange Laufzeiten gebunden</li>
          <li>Preiserhöhungen sind möglich, Preissenkungen aber ausgeschlossen</li>
          <li>Leistungskürzungen werden vorbehalten, Leistungserweiterungen nicht</li>
        </ul>

        <h2>3. Versteckte Kosten und automatische Verlängerungen</h2>

        <p>Achten Sie besonders auf:</p>

        <ul>
          <li><strong>Bearbeitungsgebühren:</strong> Zusätzliche Kosten für Standard-Services</li>
          <li><strong>Automatische Verlängerung:</strong> Kurze Kündigungsfristen bei langen Verlängerungsperioden</li>
          <li><strong>Versteckte Nebenkosten:</strong> "Zzgl. Versand", "zzgl. Service-Pauschale"</li>
        </ul>

        <h3>Beispiel aus der Praxis</h3>

        <p>Ein Fitnessstudio-Vertrag mit 24 Monaten Laufzeit, automatischer Verlängerung um weitere 12 Monate und einer Kündigungsfrist von 3 Monaten zum Vertragsende. Wer die Kündigung verpasst, sitzt weitere 15 Monate fest.</p>

        <h2>4. Unverhältnismäßige Haftungsausschlüsse</h2>

        <p>Seriöse Anbieter übernehmen Verantwortung für ihre Leistungen. Warnsignale sind:</p>

        <ul>
          <li>Kompletter Haftungsausschluss auch bei grober Fahrlässigkeit</li>
          <li>Ausschluss der Gewährleistung bei Mängeln</li>
          <li>Sehr kurze Reklamationsfristen (weniger als die gesetzlichen 2 Jahre)</li>
        </ul>

        <h2>5. Unzulässige Datenverwendung</h2>

        <p>Besonders bei Online-Services sollten Sie auf die Datenverwendung achten:</p>

        <ul>
          <li>Weitergabe an Dritte ohne Ihre Zustimmung</li>
          <li>Verwendung für Werbezwecke ohne Opt-out-Möglichkeit</li>
          <li>Speicherung auch nach Vertragsende</li>
          <li>Unklare Angaben zum Speicherort (außerhalb der EU)</li>
        </ul>

        <div class="highlight-box">
          <h4>Was tun bei problematischen Verträgen?</h4>
          <p>Lassen Sie verdächtige Verträge vor Unterschrift professionell prüfen – mit Contract AI analysieren Sie Verträge in wenigen Minuten und erhalten konkrete Handlungsempfehlungen.</p>
        </div>

        <h2>Fazit: Vertrauen ist gut, Kontrolle ist besser</h2>

        <p>Die meisten Unternehmen sind seriös und bemüht um faire Verträge. Doch schwarze Schafe gibt es in jeder Branche. Mit diesen fünf Warnsignalen erkennen Sie problematische Verträge schon vor der Unterschrift.</p>

        <p>Nehmen Sie sich die Zeit, Verträge gründlich zu lesen. Bei wichtigen oder komplexen Verträgen sollten Sie nicht zögern, professionelle Hilfe in Anspruch zu nehmen.</p>
      `
    },
    {
      slug: 'mietvertrag-unwirksame-klauseln',
      title: 'Mietvertrag-Check: Diese Klauseln sind unwirksam',
      subtitle: 'Schönheitsreparaturen, Haustierhaltung, Kautionshöhe – welche Klauseln rechtlich problematisch sind',
      category: 'Mietrecht',
      date: '20. Mai 2025',
      readTime: '8 Min. Lesezeit',
      author: 'Contract AI Team',
      content: `
        <p>Mietverträge enthalten oft Klauseln, die zu Gunsten des Vermieters formuliert sind. Doch nicht alles, was im Vertrag steht, ist auch rechtlich wirksam. Wir zeigen Ihnen, welche Klauseln problematisch sind.</p>

        <h2>Schönheitsreparaturen: Wann sie unwirksam sind</h2>
        
        <p>Viele Mietverträge enthalten Klauseln zu Schönheitsreparaturen. Folgende Regelungen sind unwirksam:</p>
        
        <ul>
          <li>Starre Renovierungsfristen ohne Berücksichtigung des Zustands</li>
          <li>Verpflichtung zur Renovierung bei Auszug unabhängig vom Zustand</li>
          <li>Vorgaben zu bestimmten Farben oder Materialien</li>
        </ul>

        <h2>Haustierhaltung richtig regeln</h2>
        
        <p>Ein generelles Haustierverbot ist unwirksam. Erlaubt sind differenzierte Regelungen:</p>
        
        <ul>
          <li>Kleintierhaltung (Hamster, Vögel) kann nicht verboten werden</li>
          <li>Hunde und Katzen benötigen meist die Erlaubnis des Vermieters</li>
          <li>Gefährliche Tiere können generell verboten werden</li>
        </ul>

        <div class="highlight-box">
          <h4>Tipp für Mieter</h4>
          <p>Lassen Sie sich die Erlaubnis zur Haustierhaltung schriftlich geben und dokumentieren Sie den Zustand der Wohnung bei Einzug.</p>
        </div>

        <h2>Kaution: Grenzen und Regelungen</h2>
        
        <p>Bei der Mietkaution gibt es klare gesetzliche Grenzen:</p>
        
        <ul>
          <li>Maximal 3 Kaltmieten als Kaution</li>
          <li>Zahlung in 3 Raten möglich</li>
          <li>Kaution muss zinsbringend angelegt werden</li>
          <li>Rückzahlung binnen 6 Monaten nach Auszug</li>
        </ul>

        <h2>Fazit</h2>
        
        <p>Lassen Sie sich nicht von unwirksamen Klauseln einschüchtern. Im Zweifelsfall lohnt sich eine rechtliche Beratung oder die Prüfung mit Contract AI.</p>
      `
    },
    {
      slug: 'arbeitsvertrag-rechte-verstehen',
      title: 'Arbeitsvertrag verstehen: Überstunden, Urlaub & Kündigung',
      subtitle: 'Was steht wirklich in Ihrem Arbeitsvertrag? Die wichtigsten Klauseln erklärt',
      category: 'Arbeitsrecht',
      date: '18. Mai 2025',
      readTime: '6 Min. Lesezeit',
      author: 'Contract AI Team',
      content: `
        <p>Ihr Arbeitsvertrag regelt mehr als nur Gehalt und Arbeitszeit. Wir erklären die wichtigsten Klauseln und Ihre Rechte als Arbeitnehmer.</p>

        <h2>Arbeitszeit und Überstunden</h2>
        
        <p>Die wichtigsten Punkte zur Arbeitszeit:</p>
        
        <ul>
          <li>Maximal 8 Stunden täglich, in Ausnahmen 10 Stunden</li>
          <li>Überstunden müssen vergütet oder durch Freizeit ausgeglichen werden</li>
          <li>Pausenregelungen sind gesetzlich vorgeschrieben</li>
        </ul>

        <h2>Urlaubsanspruch</h2>
        
        <p>Jeder Arbeitnehmer hat Anspruch auf Erholung:</p>
        
        <ul>
          <li>Mindestens 20 Werktage bei 5-Tage-Woche</li>
          <li>Urlaub kann nur in Ausnahmen verfallen</li>
          <li>Bei Kündigung steht anteiliger Urlaub zu</li>
        </ul>

        <div class="highlight-box">
          <h4>Wichtiger Hinweis</h4>
          <p>Überstunden mit dem Gehalt "abgegolten" - das gilt nur bei angemessener Vergütung und klarer Regelung im Vertrag.</p>
        </div>

        <h2>Kündigungsfristen</h2>
        
        <p>Die Kündigungsfristen steigen mit der Betriebszugehörigkeit:</p>
        
        <ul>
          <li>Probezeit: 2 Wochen</li>
          <li>Bis 2 Jahre: 4 Wochen zum 15. oder Monatsende</li>
          <li>Ab 2 Jahre: verlängerte Fristen je nach Dauer</li>
        </ul>

        <h2>Fazit</h2>
        
        <p>Kennen Sie Ihre Rechte! Bei Unklarheiten lassen Sie Ihren Arbeitsvertrag professionell prüfen.</p>
      `
    },
    // Weitere Artikel können hier hinzugefügt werden...
  ];

  // Finde den Artikel basierend auf dem URL-Slug
  const findArticleBySlug = (articleSlug: string | undefined) => {
    if (!articleSlug) return allArticles[0]; // Fallback zum ersten Artikel
    
    const foundArticle = allArticles.find(art => art.slug === articleSlug);
    return foundArticle || allArticles[0]; // Fallback zum ersten Artikel wenn nicht gefunden
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

  return (
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
            <article 
              className={styles.relatedCard}
              onClick={() => handleRelatedArticleClick('mietvertrag-unwirksame-klauseln')}
            >
              <h3>Mietvertrag-Check: Diese Klauseln sind unwirksam</h3>
              <p>Schönheitsreparaturen, Haustierhaltung, Kautionshöhe – welche Klauseln rechtlich problematisch sind.</p>
              <span className={styles.relatedLink}>Artikel lesen →</span>
            </article>
            <article 
              className={styles.relatedCard}
              onClick={() => handleRelatedArticleClick('arbeitsvertrag-rechte-verstehen')}
            >
              <h3>Arbeitsvertrag verstehen: Überstunden, Urlaub & Kündigung</h3>
              <p>Was steht wirklich in Ihrem Arbeitsvertrag? Die wichtigsten Klauseln erklärt.</p>
              <span className={styles.relatedLink}>Artikel lesen →</span>
            </article>
            <article 
              className={styles.relatedCard}
              onClick={() => handleRelatedArticleClick('vertragsverhandlung-strategien')}
            >
              <h3>Vertragsverhandlung: So erreichen Sie bessere Bedingungen</h3>
              <p>Auch als Privatperson können Sie Verträge nachverhandeln. Die besten Strategien.</p>
              <span className={styles.relatedLink}>Artikel lesen →</span>
            </article>
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
  );
};

export default BlogPost;
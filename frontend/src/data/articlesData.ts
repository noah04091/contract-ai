// 📁 src/data/articlesData.ts - Zentrale Artikel-Verwaltung

export interface Article {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
  icon: string;
  content: string;
}

export const articles: Article[] = [
  {
    id: 1,
    slug: 'warnsignale-schlechte-vertraege',
    title: '5 Warnsignale: So erkennen Sie schlechte Verträge sofort',
    subtitle: 'Versteckte Kosten, unfaire Klauseln, einseitige Bedingungen – lernen Sie die häufigsten Fallen kennen',
    excerpt: 'Versteckte Kosten, unfaire Klauseln, einseitige Bedingungen – lernen Sie die häufigsten Fallen kennen und schützen Sie sich vor teuren Fehlentscheidungen.',
    category: 'tipps',
    date: '23. Mai 2025',
    readTime: '5 Min. Lesezeit',
    author: 'Contract AI Team',
    icon: '📋',
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
    id: 2,
    slug: 'mietvertrag-unwirksame-klauseln',
    title: 'Mietvertrag-Check: Diese Klauseln sind unwirksam',
    subtitle: 'Schönheitsreparaturen, Haustierhaltung, Kautionshöhe – welche Klauseln rechtlich problematisch sind',
    excerpt: 'Schönheitsreparaturen, Haustierhaltung, Kautionshöhe – welche Klauseln in Ihrem Mietvertrag rechtlich problematisch sind und was Sie dagegen tun können.',
    category: 'mietrecht',
    date: '20. Mai 2025',
    readTime: '8 Min. Lesezeit',
    author: 'Contract AI Team',
    icon: '🏠',
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
    id: 3,
    slug: 'arbeitsvertrag-rechte-verstehen',
    title: 'Arbeitsvertrag verstehen: Überstunden, Urlaub & Kündigung',
    subtitle: 'Was steht wirklich in Ihrem Arbeitsvertrag? Die wichtigsten Klauseln erklärt',
    excerpt: 'Was steht wirklich in Ihrem Arbeitsvertrag? Wir erklären die wichtigsten Klauseln und Ihre Rechte als Arbeitnehmer.',
    category: 'arbeitsrecht',
    date: '18. Mai 2025',
    readTime: '6 Min. Lesezeit',
    author: 'Contract AI Team',
    icon: '💼',
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
  {
    id: 4,
    slug: 'agb-fallen-online-shopping',
    title: 'AGB-Fallen bei Online-Shopping: Darauf müssen Sie achten',
    subtitle: 'Automatische Vertragsverlängerung, versteckte Kosten, eingeschränkte Gewährleistung – so durchschauen Sie problematische AGB',
    excerpt: 'Automatische Vertragsverlängerung, versteckte Kosten, eingeschränkte Gewährleistung – so durchschauen Sie problematische AGB.',
    category: 'agb',
    date: '15. Mai 2025',
    readTime: '4 Min. Lesezeit',
    author: 'Contract AI Team',
    icon: '📜',
    content: `
      <p>Beim Online-Shopping klicken wir oft schnell auf "AGB akzeptieren" – doch das kann teuer werden. Wir zeigen, worauf Sie achten müssen.</p>

      <h2>Versteckte Kosten erkennen</h2>
      
      <p>Häufige Kostenfallen in AGB:</p>
      
      <ul>
        <li>Zusätzliche Versandkosten erst im letzten Schritt</li>
        <li>Bearbeitungsgebühren für Standardleistungen</li>
        <li>Aufschläge für bestimmte Zahlungsarten</li>
      </ul>

      <h2>Gewährleistung und Garantie</h2>
      
      <p>Diese Klauseln sind problematisch:</p>
      
      <ul>
        <li>Ausschluss der gesetzlichen Gewährleistung</li>
        <li>Verkürzte Reklamationsfristen</li>
        <li>Ausschluss bestimmter Mängelarten</li>
      </ul>

      <div class="highlight-box">
        <h4>Wichtig zu wissen</h4>
        <p>Die gesetzliche Gewährleistung von 2 Jahren kann bei Verbraucherkäufen nicht ausgeschlossen werden.</p>
      </div>

      <h2>Fazit</h2>
      
      <p>Lesen Sie AGB zumindest überfliegend – Contract AI kann dabei helfen, problematische Klauseln zu identifizieren.</p>
    `
  },
  {
    id: 5,
    slug: 'autokauf-vertrag-gewährleistung',
    title: 'Autokauf-Vertrag: Gewährleistung, Sachmängel & Rücktritt',
    subtitle: 'Beim Autokauf kann viel schiefgehen. So schützen Sie sich vor versteckten Mängeln und problematischen Verkäufern',
    excerpt: 'Beim Autokauf kann viel schiefgehen. So schützen Sie sich vor versteckten Mängeln und problematischen Verkäufern.',
    category: 'kaufvertraege',
    date: '12. Mai 2025',
    readTime: '7 Min. Lesezeit',
    author: 'Contract AI Team',
    icon: '🚗',
    content: `
      <p>Der Autokauf ist für viele eine große Investition. Umso wichtiger ist es, den Kaufvertrag genau zu prüfen und seine Rechte zu kennen.</p>

      <h2>Gewährleistung beim Autokauf</h2>
      
      <p>Ihre Rechte als Käufer:</p>
      
      <ul>
        <li>Bei Händlern: 2 Jahre Gewährleistung (1 Jahr bei Gebrauchtwagen möglich)</li>
        <li>Bei Privatverkäufern: Gewährleistung kann ausgeschlossen werden</li>
        <li>Versteckte Mängel: Verkäufer muss diese offenlegen</li>
      </ul>

      <h2>Sachmängel und Ihre Rechte</h2>
      
      <p>Bei Mängeln haben Sie verschiedene Optionen:</p>
      
      <ul>
        <li>Nachbesserung oder Ersatzlieferung verlangen</li>
        <li>Preisminderung durchsetzen</li>
        <li>Vom Vertrag zurücktreten</li>
      </ul>

      <div class="highlight-box">
        <h4>Praxis-Tipp</h4>
        <p>Dokumentieren Sie den Fahrzeugzustand vor Übergabe ausführlich mit Fotos und lassen Sie eine Probefahrt protokollieren.</p>
      </div>

      <h2>Rücktritt vom Kaufvertrag</h2>
      
      <p>Ein Rücktritt ist möglich bei:</p>
      
      <ul>
        <li>Erheblichen Mängeln, die nicht behoben werden können</li>
        <li>Arglistiger Täuschung durch den Verkäufer</li>
        <li>Nicht eingehaltenen Zusagen</li>
      </ul>

      <h2>Fazit</h2>
      
      <p>Lassen Sie Kaufverträge vor Unterschrift prüfen und scheuen Sie sich nicht, bei Problemen Ihre Rechte geltend zu machen.</p>
    `
  },
  {
    id: 6,
    slug: 'vertragsverhandlung-strategien',
    title: 'Vertragsverhandlung: So erreichen Sie bessere Bedingungen',
    subtitle: 'Auch als Privatperson können Sie Verträge nachverhandeln. Mit diesen Strategien erreichen Sie fairere Konditionen',
    excerpt: 'Auch als Privatperson können Sie Verträge nachverhandeln. Mit diesen Strategien erreichen Sie fairere Konditionen.',
    category: 'tipps',
    date: '10. Mai 2025',
    readTime: '5 Min. Lesezeit',
    author: 'Contract AI Team',
    icon: '⚖️',
    content: `
      <p>Viele glauben, Verträge seien in Stein gemeißelt. Doch oft lassen sich auch als Privatperson bessere Konditionen aushandeln.</p>

      <h2>Vorbereitung ist alles</h2>
      
      <p>Bevor Sie verhandeln:</p>
      
      <ul>
        <li>Informieren Sie sich über marktübliche Konditionen</li>
        <li>Sammeln Sie Vergleichsangebote</li>
        <li>Identifizieren Sie Ihre wichtigsten Verhandlungspunkte</li>
      </ul>

      <h2>Verhandlungsstrategien</h2>
      
      <p>Erfolgreiche Verhandlungstaktiken:</p>
      
      <ul>
        <li>Bleiben Sie sachlich und freundlich</li>
        <li>Argumentieren Sie mit konkreten Zahlen und Fakten</li>
        <li>Bieten Sie Win-Win-Lösungen an</li>
        <li>Zeigen Sie Alternativen auf</li>
      </ul>

      <div class="highlight-box">
        <h4>Verhandlungsbeispiel</h4>
        <p>"Aufgrund meiner langjährigen Treue und der aktuellen Marktpreise bitte ich um eine Anpassung der Konditionen. Hier sind drei Vergleichsangebote..."</p>
      </div>

      <h2>Häufige Verhandlungserfolge</h2>
      
      <p>Diese Bereiche lassen sich oft verbessern:</p>
      
      <ul>
        <li>Kündigungsfristen verkürzen</li>
        <li>Preise oder Gebühren reduzieren</li>
        <li>Zusätzliche Leistungen einschließen</li>
        <li>Flexiblere Zahlungsbedingungen</li>
      </ul>

      <h2>Fazit</h2>
      
      <p>Verhandeln kostet nichts außer Zeit – und kann sich richtig lohnen. Probieren Sie es aus!</p>
    `
  },
  {
    id: 7,
    slug: 'widerrufsrecht-richtig-nutzen',
    title: 'Widerrufsrecht: 14 Tage richtig nutzen',
    subtitle: 'Das Widerrufsrecht schützt Verbraucher – aber nur, wenn Sie es richtig anwenden. Die wichtigsten Regeln und Ausnahmen',
    excerpt: 'Das Widerrufsrecht schützt Verbraucher – aber nur, wenn Sie es richtig anwenden. Die wichtigsten Regeln und Ausnahmen.',
    category: 'agb',
    date: '8. Mai 2025',
    readTime: '6 Min. Lesezeit',
    author: 'Contract AI Team',
    icon: '↩️',
    content: `
      <p>Das 14-tägige Widerrufsrecht ist ein wichtiger Verbraucherschutz. Doch es gibt Ausnahmen und Regeln, die Sie kennen sollten.</p>

      <h2>Wo gilt das Widerrufsrecht?</h2>
      
      <p>Das Widerrufsrecht gilt bei:</p>
      
      <ul>
        <li>Online-Käufen und Fernabsatzverträgen</li>
        <li>Haustürgeschäften</li>
        <li>Verträgen außerhalb von Geschäftsräumen</li>
      </ul>

      <h2>Wichtige Ausnahmen</h2>
      
      <p>Kein Widerrufsrecht gibt es bei:</p>
      
      <ul>
        <li>Verderblichen Waren</li>
        <li>Individualisierten Produkten</li>
        <li>Geöffneten hygienischen Artikeln</li>
        <li>Downloads und digitalen Inhalten</li>
      </ul>

      <div class="highlight-box">
        <h4>Fristen beachten</h4>
        <p>Die 14-Tage-Frist beginnt erst, wenn Sie ordnungsgemäß über das Widerrufsrecht belehrt wurden.</p>
      </div>

      <h2>Widerruf richtig erklären</h2>
      
      <p>So gehen Sie vor:</p>
      
      <ul>
        <li>Schriftlich widerrufen (E-Mail reicht)</li>
        <li>Eindeutig den Widerruf erklären</li>
        <li>Vertrag und Bestellnummer angeben</li>
        <li>Bestätigung anfordern</li>
      </ul>

      <h2>Fazit</h2>
      
      <p>Das Widerrufsrecht ist ein starkes Verbraucherrecht – nutzen Sie es bewusst und informiert.</p>
    `
  },
  {
    id: 8,
    slug: 'kuendigung-arbeitsvertrag-fristen',
    title: 'Kündigung Arbeitsvertrag: Fristen und Formvorschriften',
    subtitle: 'Kündigungsfristen, Formfehler, Kündigungsschutz – was Arbeitnehmer und Arbeitgeber bei Kündigungen beachten müssen',
    excerpt: 'Kündigungsfristen, Formfehler, Kündigungsschutz – was Arbeitnehmer und Arbeitgeber bei Kündigungen beachten müssen.',
    category: 'arbeitsrecht',
    date: '5. Mai 2025',
    readTime: '9 Min. Lesezeit',
    author: 'Contract AI Team',
    icon: '📋',
    content: `
      <p>Eine Kündigung ist ein wichtiger rechtlicher Schritt. Dabei gibt es viele Fallstricke und Formvorschriften zu beachten.</p>

      <h2>Kündigungsfristen im Überblick</h2>
      
      <p>Die gesetzlichen Fristen:</p>
      
      <ul>
        <li>Probezeit: 2 Wochen zu jedem Tag</li>
        <li>Bis 2 Jahre: 4 Wochen zum 15. oder Monatsende</li>
        <li>2-5 Jahre: 1 Monat zum Monatsende</li>
        <li>5-8 Jahre: 2 Monate zum Monatsende</li>
      </ul>

      <h2>Formvorschriften beachten</h2>
      
      <p>Eine wirksame Kündigung muss:</p>
      
      <ul>
        <li>Schriftlich erfolgen (§ 623 BGB)</li>
        <li>Eigenhändig unterschrieben sein</li>
        <li>Dem Vertragspartner zugehen</li>
        <li>Den Beendigungszeitpunkt nennen</li>
      </ul>

      <div class="highlight-box">
        <h4>Achtung Formfehler</h4>
        <p>E-Mail, Fax oder mündliche Kündigungen sind unwirksam! Nur das Original mit Unterschrift zählt.</p>
      </div>

      <h2>Kündigungsschutz</h2>
      
      <p>Besonderen Schutz genießen:</p>
      
      <ul>
        <li>Schwangere und Mütter in Elternzeit</li>
        <li>Schwerbehinderte Menschen</li>
        <li>Betriebsratsmitglieder</li>
        <li>Arbeitnehmer in Kleinbetrieben unter besonderen Umständen</li>
      </ul>

      <h2>Aufhebungsvertrag als Alternative</h2>
      
      <p>Vorteile eines Aufhebungsvertrags:</p>
      
      <ul>
        <li>Flexible Beendigung ohne Fristen</li>
        <li>Einvernehmliche Regelung von Abfindungen</li>
        <li>Vermeidung von Rechtsstreitigkeiten</li>
      </ul>

      <h2>Fazit</h2>
      
      <p>Bei Kündigungen sind Form und Fristen entscheidend. Im Zweifel sollten Sie rechtlichen Rat einholen.</p>
    `
  }
];

// Hilfsfunktionen für die Komponenten
export const getArticleBySlug = (slug: string): Article | undefined => {
  return articles.find(article => article.slug === slug);
};

export const getArticleById = (id: number): Article | undefined => {
  return articles.find(article => article.id === id);
};

export const getArticlesByCategory = (category: string): Article[] => {
  if (category === 'alle') return articles;
  return articles.filter(article => article.category === category);
};

export const searchArticles = (searchTerm: string): Article[] => {
  const term = searchTerm.toLowerCase();
  return articles.filter(article =>
    article.title.toLowerCase().includes(term) ||
    article.excerpt.toLowerCase().includes(term) ||
    article.content.toLowerCase().includes(term)
  );
};
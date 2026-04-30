// Pachtvertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Basis: BGB §§ 581–597 (allg. Pachtrecht); §§ 585–597 (Landpachtrecht); LandpachtVG;
// BGB §§ 535–580a subsidiär (Mietrecht analog); BGH XII ZR 84/22 (AGB-Kontrolle Gewerbepacht)

module.exports = {
  type: "pachtvertrag",
  title: "Pachtvertrag",
  description: "Vertrag über die Überlassung einer Sache oder eines Rechts zur Nutzung gegen Pachtzins, mit dem Recht zur Fruchtziehung (§§ 581 ff. BGB). Geeignet für Landpacht, Restaurant-/Hotelpacht, Unternehmenspacht und Grundstückspacht.",
  icon: "wheat",
  difficulty: "komplex",
  estimatedTime: "12–18 Minuten",
  legalBasis: "BGB §§ 581–597; §§ 585–597 (Landpacht); LandpachtVG; BGB §§ 535–580a subsidiär",

  // Rollen-Definition
  roles: {
    A: { key: "verpaechter", label: "Verpächter", description: "Eigentümer der Pachtsache (Grundstück, Betrieb, Geschäft). Stellt Sache + ggf. Inventar zur Verfügung." },
    B: { key: "paechter", label: "Pächter", description: "Nutzt Pachtsache, zieht Früchte (Erträge), zahlt Pachtzins, betreibt ggf. Betrieb auf eigenes Risiko." }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Verpächter — eiserne Verpachtung, Pächter trägt Erhaltungspflichten + Versicherung, kurze Anpassungsintervalle",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — Inventar mit Verzeichnis, Erhaltung Pächter / größere Reparaturen Verpächter, gesetzliche Anpassung",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Pächter — lange feste Laufzeit, Investitionsschutz, Pachtzins fest, Kündigung nur aus wichtigem Grund",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    { key: "partyA_name", label: "Name / Firma (Verpächter)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Adresse", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertreten durch", type: "text", required: false, group: "partyA" },
    { key: "partyB_name", label: "Name / Firma (Pächter)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Adresse", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_business_type", label: "Betriebsform / Berufsbezeichnung des Pächters", type: "text", required: false, group: "partyB" },
    { key: "pacht_type", label: "Art der Pacht", type: "select", required: true, group: "context",
      options: [
        { value: "landpacht", label: "Landpacht (Acker, Wiese, Forst, Weinberg) — LandpachtVG, Anzeigepflicht" },
        { value: "gewerbepacht", label: "Gewerbepacht (Restaurant, Hotel, Apotheke, Tankstelle)" },
        { value: "unternehmenspacht", label: "Unternehmenspacht (gesamter Betrieb mit Goodwill)" },
        { value: "sonstige_sachpacht", label: "Sonstige Sachpacht (Reklamefläche, Kiesgrube, Solaranlage)" }
      ]
    },
    { key: "object_address", label: "Lage / Anschrift der Pachtsache", type: "textarea", required: true, group: "context" },
    { key: "object_size", label: "Größe (m² oder ha)", type: "number", required: true, group: "context" },
    { key: "object_description", label: "Beschreibung der Pachtsache", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Acker, Restaurant, Apotheke, Hotel, ..." },
    { key: "inventory_included", label: "Inventar enthalten?", type: "select", required: true, group: "context",
      options: [
        { value: "kein_inventar", label: "Kein Inventar (nur Pachtsache)" },
        { value: "nur_verzeichnis", label: "Inventar mit Verzeichnis (ohne Schätzwert)" },
        { value: "eiserne_verpachtung_schaetzwert", label: "Eiserne Verpachtung zum Schätzwert" }
      ]
    },
    { key: "inventory_value", label: "Wert des Inventars (EUR, falls eiserne Verpachtung)", type: "number", required: false, group: "context" },
    { key: "start_date", label: "Pachtbeginn", type: "date", required: true, group: "context" },
    { key: "pacht_amount", label: "Pachtzins (EUR pro Jahr oder Monat)", type: "number", required: true, group: "context" },
    { key: "payment_interval", label: "Zahlungsintervall", type: "select", required: true, group: "context",
      options: [
        { value: "monatlich", label: "Monatlich" },
        { value: "quartalsweise", label: "Quartalsweise" },
        { value: "halbjaehrlich", label: "Halbjährlich" },
        { value: "jaehrlich", label: "Jährlich" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — 10 strategische Entscheidungen
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Pachtgegenstand und Inventar ──
    {
      key: "inventory",
      title: "Pachtgegenstand und Inventar",
      paragraph: "§ 2",
      description: "Was wird genau verpachtet? Bei Pacht zentral: Inventar — hier liegen die meisten Streitfälle.",
      importance: "critical",
      options: [
        {
          value: "grundstueck_ohne_inventar",
          label: "Nur Pachtsache, kein Inventar",
          description: "Ausschließlich Grundstück / Räumlichkeiten ohne Einrichtung. Pächter bringt eigenes Inventar.",
          risk: "low",
          riskNote: "Klar abgegrenzt. Geeignet für Landpacht, leere Gewerberäume, Reklameflächen.",
          whenProblem: "Wenn der Pächter nach Pachtende seine Investitionen entfernen muss — Schäden / Wegnahmerecht § 591 BGB Streitthema.",
          whenNegotiate: "Pächter sollte Wegnahmerecht und ggf. Verwendungsersatz für notwendige Investitionen verhandeln.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "mit_inventarverzeichnis",
          label: "Inventar mit detailliertem Verzeichnis (ohne Schätzwert)",
          description: "Inventarstücke werden in Anlage einzeln aufgelistet (Bezeichnung, Stückzahl, Zustand). Pächter erhält Stücke, hat sie zu erhalten und im Verzeichnis zurückzugeben.",
          risk: "low",
          riskNote: "BGH-konform. Verzeichnis ist verbindlicher Vertragsbestandteil. Pflichten nach § 582 BGB klar zuzuordnen.",
          whenProblem: "Bei Verschleiß teurer Stücke (z.B. Restaurantküche): Streit über Erhaltungs- vs. Erneuerungspflicht.",
          whenNegotiate: "Klare Abgrenzung zwischen 'Erhaltung' (Pächter) und 'Ersatz / größerer Reparaturen' (Verpächter) verhandeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "eiserne_verpachtung",
          label: "Eiserne Verpachtung zum Schätzwert (§ 582a BGB)",
          description: "Inventar wird zum vereinbarten Schätzwert übergeben. Pächter muss Inventar im selben wirtschaftlichen Wert erhalten und am Ende zum Schätzwert zurückgeben (§ 582a BGB). Erneuerungen gehen ins Eigentum des Verpächters über.",
          risk: "high",
          riskNote: "Pächter trägt umfassende Erhaltungs-, Erneuerungs- und Schadensersatzpflichten. Bei Pachtende muss er den vollen Schätzwert herstellen oder Differenz zahlen (BGH XII ZR 17/19).",
          whenProblem: "Pächter unterschätzt Erneuerungsbedarf — bei Pachtende erhebliche Nachzahlung. Verpächter muss bei Schätzung sorgfältig sein, sonst Streit.",
          whenNegotiate: "Pächter sollte Schätzwert kritisch prüfen, Wertanpassung bei strukturellen Änderungen verhandeln, ggf. Versicherungspflicht abwälzen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "eiserne_verpachtung", ausgewogen: "mit_inventarverzeichnis", durchsetzungsstark: "mit_inventarverzeichnis" }
    },

    // ── 2. Pachtzweck und Bewirtschaftungspflicht ──
    {
      key: "usage_purpose",
      title: "Pachtzweck und Bewirtschaftungspflicht",
      paragraph: "§ 3",
      description: "Welcher Zweck wird vereinbart und wie strikt? Wichtig wegen § 586 BGB (ordnungsgemäße Bewirtschaftung).",
      importance: "high",
      options: [
        {
          value: "enger_zweck",
          label: "Eng definierter Zweck (z.B. nur Acker, nur Restaurant)",
          description: "Pächter darf die Pachtsache ausschließlich für den vereinbarten Zweck nutzen. Zweckänderung erfordert schriftliche Zustimmung.",
          risk: "low",
          riskNote: "Pro Verpächter. Vermeidet ungewollte Nutzungen (z.B. Pachthof als Pension umfunktioniert). § 586a BGB Verbot der willkürlichen Zerschlagung greift bei Landpacht ergänzend.",
          whenProblem: "Wenn der Pächter wirtschaftlich auf Diversifikation angewiesen ist (z.B. Hofcafé zur Acker-Bewirtschaftung).",
          whenNegotiate: "Pächter sollte Zweck breiter formulieren oder Diversifikationsklausel verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "branchenuebliche_nutzung",
          label: "Branchenübliche Nutzung im Rahmen des Hauptzwecks",
          description: "Hauptzweck definiert (z.B. Gastronomie), branchenübliche Nebenzwecke (Catering, Zulieferung) sind erlaubt. Substantielle Zweckänderung bedarf Zustimmung.",
          risk: "low",
          riskNote: "Ausgewogene Lösung. BGH-fest. Lässt Pächter wirtschaftliche Flexibilität, sichert Verpächter den Charakter.",
          whenProblem: "Streit über 'branchenüblich' bei Innovationen (z.B. Vegan-Restaurant, Lieferdienst).",
          whenNegotiate: "Beispielkatalog erlaubter Nebenzwecke kann helfen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "weite_nutzung",
          label: "Weite Nutzungserlaubnis innerhalb gesetzlicher Schranken",
          description: "Pächter darf die Pachtsache zu jedem Zweck nutzen, der nicht gegen Gesetze, baurechtliche Vorgaben oder Belange Dritter verstößt.",
          risk: "medium",
          riskNote: "Pro Pächter. Verpächter verliert Gestaltungsmacht über den Charakter der Pachtsache.",
          whenProblem: "Pächter ändert Nutzung (z.B. Bauernhof → Eventlocation), Charakter der Sache wird verändert.",
          whenNegotiate: "Verpächter wird i.d.R. mindestens Hauptzweck definieren wollen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "enger_zweck", ausgewogen: "branchenuebliche_nutzung", durchsetzungsstark: "weite_nutzung" }
    },

    // ── 3. Pachtzins und Anpassung ──
    {
      key: "pacht_amount",
      title: "Pachtzins und Anpassung",
      paragraph: "§ 4",
      description: "Festgelegter Pachtzins, Anpassungsmechanismus, Wertsicherung.",
      importance: "critical",
      options: [
        {
          value: "fest",
          label: "Fester Pachtzins ohne Anpassung",
          description: "Pachtzins für die Vertragslaufzeit fest, keine Anpassung außer bei Vertragsänderung.",
          risk: "medium",
          riskNote: "Pro Pächter (Planbarkeit). Verpächter trägt bei langer Laufzeit Inflationsrisiko. § 593 BGB Wertanpassung bei nachhaltiger Wertänderung gilt subsidiär trotzdem.",
          whenProblem: "Hohe Inflation oder starker Marktwertsprung — Verpächter verliert real.",
          whenNegotiate: "Verpächter wird i.d.R. Wertanpassung verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "index",
          label: "Wertsicherungsklausel (Verbraucherpreisindex)",
          description: "Pachtzins wird an VPI gekoppelt. Anpassung jährlich oder bei definierter Indexänderung. Bei Landpacht ergänzend § 593 BGB.",
          risk: "low",
          riskNote: "Marktstandard bei Gewerbepacht und Landpacht. § 1 PrKlG (Preisklauselgesetz) beachten — Indexbindung bei Verträgen > 10 Jahre möglich.",
          whenProblem: "Bei sehr hoher Inflation Pächter unter Druck. Mietpreisbremse-analoge Schranken bestehen NICHT für Pacht — daher fairer beidseitig.",
          whenNegotiate: "Anpassungsintervall (jährlich vs. nach 10 % Indexänderung).",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "umsatzpacht",
          label: "Umsatzpacht (Pachtzins prozentual am Umsatz)",
          description: "Pächter zahlt Mindestpachtzins + variablen Anteil als Prozentsatz des Umsatzes (z.B. 6 % Nettoumsatz). Üblich bei Hotels, Restaurants, Tankstellen.",
          risk: "medium",
          riskNote: "Beidseitige Risikoteilung. Verpächter profitiert von Erfolgen. Pflicht zur Buchführung und Auskunft, Prüfungsrecht des Verpächters.",
          whenProblem: "Pächter hat Anreiz, Umsätze zu verschleiern. Verpächter braucht Auskunfts- und Prüfungsrechte.",
          whenNegotiate: "Mindestpachtzins-Höhe, Prozentsatz, Buchprüfungsrecht, Sanktionen bei Verschleierung.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "anpassung_593_bgb",
          label: "Pachtzins fest + Anpassung nach § 593 BGB (Landpacht)",
          description: "Fester Pachtzins, aber bei nachhaltiger Wertänderung (mind. 3 Jahre nach Beginn) Anpassungsanspruch nach § 593 BGB. Spezifisch für Landpacht.",
          risk: "low",
          riskNote: "Gesetzlicher Standard für Landpacht. Beidseitig anwendbar. Schiedsverfahren bei Streit üblich.",
          whenProblem: "Verfahren langwierig, Sachverständigengutachten erforderlich.",
          whenNegotiate: "Schiedsklausel mit landwirtschaftlichem Sachverständigen verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "umsatzpacht", ausgewogen: "index", durchsetzungsstark: "fest" }
    },

    // ── 4. Vertragslaufzeit und Verlängerung ──
    {
      key: "term",
      title: "Vertragslaufzeit und Verlängerung",
      paragraph: "§ 5",
      description: "Wie lange läuft die Pacht? Bei Landpacht zwingender Verlängerungsanspruch § 593a BGB.",
      importance: "critical",
      options: [
        {
          value: "fest_kurz",
          label: "Feste Laufzeit 3–5 Jahre, keine Verlängerung",
          description: "Vertrag endet mit Ablauf der festen Laufzeit. Keine automatische Verlängerung.",
          risk: "medium",
          riskNote: "Pro Verpächter. Achtung Landpacht: § 593a BGB gibt zwingenden Verlängerungsanspruch — vertragliche Ausschlüsse problematisch.",
          whenProblem: "Pächter hat Investitionen getätigt, kann nicht amortisieren. Bei Landpacht zwingende Verlängerungsregeln greifen.",
          whenNegotiate: "Pächter sollte Verlängerungsoption + Investitionsschutz verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "fest_lang_mit_option",
          label: "Feste Laufzeit 10+ Jahre mit Verlängerungsoption",
          description: "Lange Grundlaufzeit, Pächter hat einseitiges Verlängerungsrecht für definierten Zeitraum (z.B. 5 Jahre Option). Optionserklärung mit Frist.",
          risk: "low",
          riskNote: "Marktstandard bei Gewerbepacht. Pächter kann Investitionen amortisieren, Verpächter hat Sicherheit über Mindestlaufzeit.",
          whenProblem: "Pächter ist gebunden, auch wenn Geschäft schlecht läuft. Bei Insolvenz: Sondervertragsrecht (§ 109 InsO).",
          whenNegotiate: "Optionsbedingungen (automatisch / aktive Erklärung), Optionsfristen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "unbestimmt",
          label: "Unbefristet mit Kündigungsrecht",
          description: "Laufzeit unbestimmt. Beidseitige Kündigung mit Frist nach § 584 BGB (zum Pachtjahresende, mind. 6 Monate Frist) bzw. § 594a BGB bei Landpacht (2 Jahre).",
          risk: "medium",
          riskNote: "Flexibel, aber: § 584 BGB Kündigungsfristen sind auf das Pachtjahr ausgerichtet. Bei Landpacht 2-Jahres-Frist!",
          whenProblem: "Lange Kündigungsfristen können beidseitig hinderlich sein.",
          whenNegotiate: "Bei Gewerbe vertragliche Verkürzung möglich (§ 584 BGB nicht zwingend).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "fest_kurz", ausgewogen: "fest_lang_mit_option", durchsetzungsstark: "fest_lang_mit_option" }
    },

    // ── 5. Erhaltung, Reparaturen, Investitionen ──
    {
      key: "maintenance",
      title: "Erhaltung, Reparaturen, Investitionen",
      paragraph: "§ 6",
      description: "Wer trägt welche Reparaturen? Wer haftet für Verbesserungen / Investitionen?",
      importance: "high",
      options: [
        {
          value: "gesetzlich",
          label: "Gesetzliche Verteilung (§§ 581 II, 535 BGB analog)",
          description: "Verpächter erhält die Pachtsache in gebrauchstauglichem Zustand, Pächter trägt nur kleinere Erhaltungsmaßnahmen und Schönheitsreparaturen analog Mietrecht.",
          risk: "low",
          riskNote: "Gesetzlicher Standard. Pro Pächter. AGB-fest.",
          whenProblem: "Verpächter trägt langfristig hohe Investitionskosten.",
          whenNegotiate: "Verpächter wird i.d.R. Erhaltungspflichten weiter abwälzen wollen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "paechter_alle_erhaltung",
          label: "Pächter trägt sämtliche Erhaltungs- und Reparaturkosten (Dach und Fach beim Verpächter)",
          description: "Pächter zahlt alle Reparaturen außer Substanzerhaltung am Gebäude (Dach, tragende Wände, Fundament). Verpächter haftet nur für Substanz.",
          risk: "medium",
          riskNote: "BGH XII ZR 84/22: Pauschale Übertragung sämtlicher Erhaltungspflichten in AGB kann bei unangemessener Benachteiligung unwirksam sein. Differenzierung empfohlen.",
          whenProblem: "Heizungsausfall, Dachreparatur — Streit über Zuordnung. Pauschale Klauseln teilweise unwirksam.",
          whenNegotiate: "Klare Abgrenzung Dach-und-Fach: was ist 'Substanz', was 'Erhaltung'?",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "paechter_komplett",
          label: "Pächter trägt sämtliche Reparaturen inkl. Substanz ('Wirtschaft auf Risiko')",
          description: "Pächter trägt sämtliche Reparaturen inklusive Substanzerhaltung. Üblich nur bei sehr langen Pachtzeiten oder Generationenpacht.",
          risk: "high",
          riskNote: "AGB-rechtlich problematisch (§ 307 BGB) — kann unangemessene Benachteiligung sein. Nur bei individuell ausgehandelten Verträgen, langer Laufzeit (15+ Jahre) und entsprechend niedrigem Pachtzins haltbar.",
          whenProblem: "Pächter trägt unkalkulierbare Risiken. Bei Substanzschaden (z.B. Dachrenovierung 50.000 EUR) wirtschaftliche Belastung enorm.",
          whenNegotiate: "Nur als Individualabrede mit langer Laufzeit + entsprechendem Pachtzinsabschlag.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "paechter_komplett", ausgewogen: "paechter_alle_erhaltung", durchsetzungsstark: "gesetzlich" }
    },

    // ── 6. Verbesserungen und Investitionen durch Pächter ──
    {
      key: "improvements",
      title: "Verbesserungen und Investitionen durch Pächter",
      paragraph: "§ 7",
      description: "Darf Pächter investieren? Was passiert am Pachtende? § 591 BGB Verwendungsersatz.",
      importance: "high",
      options: [
        {
          value: "zustimmungspflichtig_ohne_ausgleich",
          label: "Investitionen nur mit Zustimmung, kein Ausgleich am Ende",
          description: "Bauliche Veränderungen / Investitionen erfordern schriftliche Zustimmung. Bei Pachtende verbleiben Verbesserungen entschädigungslos beim Verpächter.",
          risk: "medium",
          riskNote: "Pro Verpächter. Achtung: § 591 BGB Verwendungsersatz für Pächter ist nicht generell abdingbar — Streit programmiert.",
          whenProblem: "Pächter investiert nichts → Pachtsache verkommt. Oder Pächter investiert dennoch und beruft sich auf § 591 BGB.",
          whenNegotiate: "Pächter sollte mind. Wegnahmerecht + Ausgleich für notwendige Investitionen verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "zustimmungspflichtig_mit_ausgleich",
          label: "Investitionen mit Zustimmung, Verwendungsersatz bei Pachtende",
          description: "Schriftliche Zustimmung Pflicht. Bei Pachtende erhält Pächter Wertausgleich für nicht abgeschriebene Verbesserungen. Wegnahmerecht für trennbare Einrichtungen § 539 BGB analog.",
          risk: "low",
          riskNote: "Marktstandard bei Gewerbepacht. § 591 BGB-konform. Klare Anreize für Investitionen.",
          whenProblem: "Streit über Höhe des Verwendungsersatzes — Sachverständigengutachten oft nötig.",
          whenNegotiate: "Berechnungsmethode (linear / wirtschaftlicher Wert), Pauschalen vs. Einzelabrechnung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "investitionspauschale",
          label: "Pauschalierte Verbesserungs-/Investitionserstattung mit Höchstgrenze",
          description: "Pächter darf bis zu definierter Pauschale (z.B. 30.000 EUR) ohne Einzelzustimmung investieren. Bei Pachtende vereinbarter Restwert oder lineare Abschreibung über Investitionsdauer.",
          risk: "low",
          riskNote: "Praxisorientiert. Reduziert Bürokratie. Klare Berechnung.",
          whenProblem: "Pauschale könnte zu niedrig sein. Restwertberechnung Streitpunkt.",
          whenNegotiate: "Höhe der Pauschale, Abschreibungsdauer, Sonderausgleich bei vorzeitiger Beendigung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "zustimmungspflichtig_ohne_ausgleich", ausgewogen: "zustimmungspflichtig_mit_ausgleich", durchsetzungsstark: "zustimmungspflichtig_mit_ausgleich" }
    },

    // ── 7. Konzessionen, Genehmigungen, Versicherung ──
    {
      key: "permits_insurance",
      title: "Konzessionen, Genehmigungen, Versicherung",
      paragraph: "§ 8",
      description: "Wer trägt Konzessionen, Genehmigungen, Betriebshaftpflicht? Bei Gastronomie/Apotheke/Tankstelle zentral.",
      importance: "high",
      options: [
        {
          value: "paechter_alles",
          label: "Pächter trägt alle Konzessionen, Genehmigungen und Versicherungen",
          description: "Pächter beschafft und unterhält sämtliche behördlichen Genehmigungen, Konzessionen, Betriebshaftpflicht und Sachversicherung der Pachtsache. Verpächter haftet nicht bei Konzessionsentzug.",
          risk: "medium",
          riskNote: "Pro Verpächter. Bei Apotheken-/Gaststätten-Pacht üblich. Verpächter sollte Pflicht zur Aufrechterhaltung der Konzession + Anzeigepflicht bei Bedrohung verhandeln.",
          whenProblem: "Bei Konzessionsverlust durch Pächter-Verschulden — Pächter haftet, aber Pachtsache wird wertlos. Verpächter könnte Pacht wegen Eignungsverlust kündigen.",
          whenNegotiate: "Pächter sollte Anzeigepflicht und Heilungsmöglichkeit verhandeln.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "geteilt",
          label: "Geteilte Verantwortung (Verpächter Substanz, Pächter Betrieb)",
          description: "Verpächter trägt Sachversicherung der Pachtsache (Gebäude). Pächter trägt Betriebskonzession, Betriebshaftpflicht, ggf. Inventar-Sachversicherung.",
          risk: "low",
          riskNote: "Marktstandard bei Gewerbepacht. Klare Trennung der Risiken.",
          whenProblem: "Bei Mischfällen (z.B. Brand durch Pächter-Betrieb) Streit über Versicherungsdeckung.",
          whenNegotiate: "Verzichtserklärungen Versicherer, gegenseitige Versicherungsbestätigungen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "verpaechter_konzessionspflicht",
          label: "Verpächter sichert Konzession zu (z.B. Gaststättenbetrieb)",
          description: "Verpächter garantiert, dass die Pachtsache mit Konzession übergeben wird. Bei späterem Konzessionsverlust ohne Pächter-Verschulden trägt Verpächter Risiko.",
          risk: "medium",
          riskNote: "Pro Pächter. Verpächter sollte Pflicht des Pächters zur ordnungsgemäßen Betriebsführung absichern.",
          whenProblem: "Wenn Konzession aus rein behördlichen Gründen entzogen wird (z.B. Anlieger-Beschwerden Lärm).",
          whenNegotiate: "Klare Definition Verschulden / Nicht-Verschulden, Sonderkündigungsrecht bei Konzessionsverlust.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "paechter_alles", ausgewogen: "paechter_alles", durchsetzungsstark: "geteilt" }
    },

    // ── 8. Kündigung ──
    {
      key: "termination",
      title: "Kündigung",
      paragraph: "§ 9",
      description: "Außerordentliche Kündigungsgründe und Fristen. § 584 BGB für ordentliche Kündigung, § 594d–594f BGB für Sondertatbestände Landpacht.",
      importance: "critical",
      options: [
        {
          value: "gesetzlich_streng",
          label: "Gesetzliche Kündigung mit Verschärfung pro Verpächter",
          description: "§ 584 BGB ordentliche Kündigung zum Pachtjahresende. Außerordentliche Kündigung bei wichtigem Grund (§ 543 BGB analog), z.B. nicht ordnungsgemäße Bewirtschaftung (§ 586 BGB), Pachtzinsrückstand 2 Termine.",
          risk: "low",
          riskNote: "Gesetzlicher Standard. § 593 BGB / § 594d–f BGB für Landpacht beachten.",
          whenProblem: "Pächter mit Existenzkrise hat lange Frist.",
          whenNegotiate: "Sonderkündigungsgründe (z.B. drohende Insolvenz) verhandeln.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "erweitert_pro_paechter",
          label: "Erweiterte Kündigungsrechte zugunsten Pächter (Berufsunfähigkeit, Tod, Nachfolge)",
          description: "§ 594d BGB-konform: Sonderkündigungsrecht bei Berufsunfähigkeit / Tod des Pächters mit kurzer Frist. Bei juristischer Person: Geschäftsaufgabe / Insolvenz.",
          risk: "medium",
          riskNote: "Bei Landpacht teilweise zwingend. Bei Gewerbepacht vertraglich frei.",
          whenProblem: "Verpächter hat plötzlich leere Pachtsache.",
          whenNegotiate: "Übergangsfristen, Übernahmeoption durch Erben / Nachfolger.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "kaution_keine_kuendigung",
          label: "Strikte Bindung mit Kündigungsausschluss",
          description: "Während fester Laufzeit keine ordentliche Kündigung möglich, außerordentliche Kündigung nur aus wichtigem Grund i.S.d. § 543 BGB.",
          risk: "medium",
          riskNote: "Bei langen Laufzeiten Pflicht (Investitionsschutz). Bei Insolvenz: Sondervertragsrecht § 109 InsO bleibt unberührt.",
          whenProblem: "Bei wirtschaftlicher Not keine Lösung außer Insolvenz.",
          whenNegotiate: "Mindestens Sonderkündigungsrechte für definierte Härtefälle.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "gesetzlich_streng", ausgewogen: "gesetzlich_streng", durchsetzungsstark: "erweitert_pro_paechter" }
    },

    // ── 9. Rückgabe der Pachtsache ──
    {
      key: "return",
      title: "Rückgabe der Pachtsache",
      paragraph: "§ 10",
      description: "§ 596 BGB — Rückgabezustand, Inventar, Schadensregelung.",
      importance: "high",
      options: [
        {
          value: "vollstaendig_im_abnahmezustand",
          label: "Rückgabe vollständig im Abnahmezustand (gleicher Zustand wie Übergabe)",
          description: "Pächter gibt Pachtsache und Inventar im selben Zustand zurück wie übergeben (üblicher Verschleiß ausgenommen). Übergabeprotokoll bei Beginn und Ende verbindlich.",
          risk: "low",
          riskNote: "Marktstandard. § 596 BGB-konform. Übergabeprotokoll mit Fotos zwingend empfehlen.",
          whenProblem: "Streit über 'üblichen Verschleiß' — bei langem Pachtzeitraum erheblich.",
          whenNegotiate: "Klare Abgrenzung üblicher Verschleiß / mietminderungsrelevant.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "schaetzwert_eiserne_verpachtung",
          label: "Rückgabe zum Schätzwert (eiserne Verpachtung)",
          description: "Bei eiserner Verpachtung: Inventar zum vereinbarten Schätzwert zurückgeben. Differenzen werden bezahlt (Pächter zahlt nach, wenn Wert geringer; Verpächter zahlt nach, wenn Wert höher).",
          risk: "medium",
          riskNote: "§ 582a BGB. Erhebliche finanzielle Risiken für Pächter, wenn Inventar nicht erhalten / erneuert wurde.",
          whenProblem: "Bei strittigem Schätzwert: Sachverständigengutachten.",
          whenNegotiate: "Schiedsklausel mit landwirtschaftlichem / branchenspezifischem Sachverständigen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "renoviert_zurueck",
          label: "Rückgabe in renoviertem Zustand",
          description: "Pächter muss Pachtsache vor Rückgabe renovieren (Streichen, kleine Reparaturen).",
          risk: "high",
          riskNote: "Vorsicht: Bei AGB ggf. unwirksam (analog Schönheitsreparaturen-Rechtsprechung). Bei Gewerbepacht weniger problematisch als bei Wohnraummiete, aber Inhaltskontrolle § 307 BGB möglich.",
          whenProblem: "Pächter weigert sich, Verpächter muss klagen.",
          whenNegotiate: "Klare Definition 'renoviert' (welche Arbeiten konkret), ggf. Pauschalersatz.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "schaetzwert_eiserne_verpachtung", ausgewogen: "vollstaendig_im_abnahmezustand", durchsetzungsstark: "vollstaendig_im_abnahmezustand" }
    },

    // ── 10. Schlussbestimmungen ──
    {
      key: "final_provisions",
      title: "Schlussbestimmungen (Schriftform, Gerichtsstand, salvatorische Klausel, LandpachtVG)",
      paragraph: "§ 11",
      description: "Standardklauseln + bei Landpacht: Anzeigepflicht LandpachtVG.",
      importance: "medium",
      options: [
        {
          value: "standard_konservativ",
          label: "Schriftform für Änderungen + salvatorische Klausel + Gerichtsstand + LandpachtVG-Anzeige",
          description: "Vertragsänderungen schriftlich, salvatorische Klausel mit Anpassungspflicht, Gerichtsstand am Ort der Pachtsache. Bei Landpacht: Pflicht zur Anzeige nach § 2 LandpachtVG binnen 1 Monat.",
          risk: "low",
          riskNote: "Bei Gewerbepacht: BEG IV-Reform — Textform genügt seit 01.01.2025 (analog Gewerbemiete? streitig). Empfehlung: Schriftform beibehalten.",
          whenProblem: "Anzeige LandpachtVG vergessen → Beanstandungsverfahren rückwirkend möglich.",
          whenNegotiate: "Selten verhandelbar.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "schiedsklausel",
          label: "Schiedsklausel für Streitigkeiten + Sachverständigenverfahren bei Wertstreitigkeiten",
          description: "Streitigkeiten werden durch Schiedsverfahren (z.B. Handelskammer) gelöst. Bei Wertstreitigkeiten (Pachtzins-Anpassung, Inventarwert) bindendes Sachverständigenverfahren.",
          risk: "medium",
          riskNote: "Vorteil: Schnelleres und branchenkundiges Verfahren. Nachteil: Verlust des Instanzenzugs.",
          whenProblem: "Schiedsverfahren teurer, aber oft schneller.",
          whenNegotiate: "Schiedsstelle (DIS, ICC, Branchenverband), Sprache, Sitz.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "minimal",
          label: "Reine Verweisung auf gesetzliche Regelungen",
          description: "Keine speziellen Schlussbestimmungen. Es gelten gesetzliche Vorgaben.",
          risk: "medium",
          riskNote: "Schlanker Vertrag, aber bei Landpacht > 2 Jahre Schriftform Pflicht (§ 585a BGB) — fehlt explizite Klausel zur Erinnerung.",
          whenProblem: "Streitfälle ohne klare vertragliche Regelung.",
          whenNegotiate: "Praxisuntauglich, vermeiden.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "standard_konservativ", ausgewogen: "standard_konservativ", durchsetzungsstark: "schiedsklausel" }
    }
  ]
};

// Mietvertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Erweitert contractTypes/mietvertrag.js, ersetzt es NICHT

module.exports = {
  type: "mietvertrag",
  title: "Mietvertrag",
  description: "Standardisierter Wohnraum- oder Gewerberaummietvertrag mit voller Berücksichtigung der zwingenden Mieterschutzvorschriften (BGB §§ 535–580a) und aktueller BGH-Rechtsprechung 2024–2025.",
  icon: "home",
  difficulty: "komplex",
  estimatedTime: "12–18 Minuten",
  legalBasis: "BGB §§ 535–580a, MietpreisbremsenG (verlängert bis 31.12.2029), BetrKV, HeizkostenV, WoVermittG, BEG IV (ab 01.01.2025 — Textform für Gewerbe), § 550 BGB (Wohnraum weiterhin Schriftform)",

  // Rollen-Definition
  roles: {
    A: { key: "vermieter", label: "Vermieter", description: "Eigentümer / Vermieter der Mietsache; stellt Wohnung/Gewerbeobjekt zur Nutzung gegen Entgelt zur Verfügung" },
    B: { key: "mieter", label: "Mieter", description: "Nutzt die Mietsache gegen Mietzahlung; bei Wohnraum: Verbraucher i.S.d. § 13 BGB mit besonderem Schutz" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Vermieter — maximale rechtliche Ausschöpfung der Vermieterrechte innerhalb der zwingenden Mieterschutzgrenzen",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — gerichtsfest beidseitig durchsetzbar, BGH-akzeptierte Klauseln",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Mieter — geringe Kaution, keine Renovierungspflicht, Tierhaltung erlaubt, langes Vorkaufsrecht",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    // Vermieter
    { key: "partyA_name", label: "Name / Firma (Vermieter)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Adresse", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertreten durch", type: "text", required: false, group: "partyA" },

    // Mieter
    { key: "partyB_name", label: "Name / Firma (Mieter)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Aktuelle Adresse", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_birthdate", label: "Geburtsdatum (bei Wohnraum)", type: "date", required: false, group: "partyB" },

    // Mietsache und Kontext
    { key: "usage_type", label: "Nutzungsart", type: "select", required: true, group: "context",
      options: [
        { value: "wohnraum", label: "Wohnraum (zwingender Mieterschutz)" },
        { value: "gewerbe", label: "Gewerbe (Vertragsfreiheit, Textform ab 01.01.2025)" },
        { value: "gemischt", label: "Gemischt (teilweise Wohn-, teilweise Gewerbenutzung)" }
      ]
    },
    { key: "object_address", label: "Adresse der Mietsache", type: "textarea", required: true, group: "context" },
    { key: "object_size", label: "Größe (m²)", type: "number", required: true, group: "context" },
    { key: "object_rooms", label: "Anzahl Zimmer", type: "number", required: false, group: "context" },
    { key: "object_description", label: "Beschreibung der Mietsache (Stockwerk, Lage, Ausstattung)", type: "textarea", required: true, group: "context" },
    { key: "start_date", label: "Mietbeginn", type: "date", required: true, group: "context" },
    { key: "cold_rent", label: "Nettokaltmiete (EUR/Monat)", type: "number", required: true, group: "context" },
    { key: "operating_costs", label: "Betriebskostenvorauszahlung (EUR/Monat)", type: "number", required: false, group: "context" }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Mietzeit und Vertragslaufzeit ──
    {
      key: "term",
      title: "Mietzeit und Vertragslaufzeit",
      paragraph: "§ 2",
      description: "Befristet oder unbefristet? Bei Wohnraum nur unter engen Voraussetzungen befristbar (§ 575 BGB).",
      importance: "critical",
      options: [
        {
          value: "unbefristet",
          label: "Unbefristet (Standard Wohnraum)",
          description: "Mietverhältnis auf unbestimmte Zeit. Beendet durch ordentliche Kündigung mit gesetzlichen Fristen.",
          risk: "low",
          riskNote: "Gesetzlicher Regelfall bei Wohnraummiete. BGH-konform. Mieterschutz nach § 573 BGB voll wirksam.",
          whenProblem: "Wenn der Vermieter Planungssicherheit für eine bestimmte Zeit braucht (z.B. Eigenbedarf in 3 Jahren) — geht nur über § 575 BGB Befristung.",
          whenNegotiate: "Praktisch nie zu verhandeln, da gesetzlicher Standard und für beide Seiten flexibel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "qualifiziert_befristet",
          label: "Qualifiziert befristet (§ 575 BGB)",
          description: "Befristung mit gesetzlichem Befristungsgrund (Eigenbedarf, Umbau, Verwendung als Werkswohnung). Grund muss bei Vertragsschluss schriftlich genannt sein.",
          risk: "medium",
          riskNote: "Nur wirksam, wenn Befristungsgrund konkret und nachprüfbar genannt. Unkonkrete Begründung → Vertrag gilt unbefristet (BGH NJW 2007, 2177).",
          whenProblem: "Wenn der Befristungsgrund später wegfällt (z.B. geplanter Umbau wird nicht durchgeführt) — Mieter kann verlängern.",
          whenNegotiate: "Mieter sollte Klarheit über Befristungsgrund verlangen und Auskunftsanspruch nach § 575 II BGB nutzen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "zeitmietvertrag_gewerbe",
          label: "Befristet (Gewerbe, z.B. 5 Jahre)",
          description: "Feste Vertragslaufzeit. Während der Laufzeit nur außerordentliche Kündigung möglich (z.B. § 543 BGB). Seit 01.01.2025 für Verträge > 1 Jahr Textform genügt.",
          risk: "low",
          riskNote: "Gewerbeüblich. Schafft Planungssicherheit beidseitig. Achtung Übergangsregel: Altverträge bis 31.12.2024 brauchen weiterhin Schriftform bis 01.01.2026.",
          whenProblem: "Wenn unvorhersehbare Ereignisse (Insolvenz, Standortverlagerung) einen Ausstieg erfordern — nur über außerordentliche Kündigung möglich.",
          whenNegotiate: "Sonderkündigungsrecht für definierte Ereignisse (z.B. Geschäftsaufgabe nach 3 Jahren) verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "staffel",
          label: "Staffelmietvertrag (§ 557a BGB)",
          description: "Mietzeit unbefristet, aber Mieterhöhung im Voraus betragsmäßig festgelegt (Staffel). Mindestabstand zwischen Erhöhungen 1 Jahr.",
          risk: "medium",
          riskNote: "BGH-fest, aber: Während Staffelvereinbarung sind Mieterhöhungen nach §§ 558, 559 BGB ausgeschlossen. Mietpreisbremse gilt für jede Stufe! Kündigungsausschluss max. 4 Jahre.",
          whenProblem: "Wenn das Marktniveau stärker steigt als die Staffel — Vermieter verliert. Wenn Markt fällt — Mieter zahlt zu viel.",
          whenNegotiate: "Höhe der Staffeln, Kündigungsausschluss-Dauer (max. 4 Jahre § 557a III BGB).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "qualifiziert_befristet", ausgewogen: "unbefristet", durchsetzungsstark: "unbefristet" }
    },

    // ── 2. Miete und Mieterhöhung ──
    {
      key: "rent_increase",
      title: "Miete und Mieterhöhung",
      paragraph: "§ 3",
      description: "Wie soll sich die Miete während des Mietverhältnisses entwickeln? Achtung Mietpreisbremse, Kappungsgrenze, Indexbindung.",
      importance: "critical",
      options: [
        {
          value: "vergleichsmiete",
          label: "Mieterhöhung nach ortsüblicher Vergleichsmiete (§ 558 BGB)",
          description: "Vermieter kann alle 15 Monate auf die ortsübliche Vergleichsmiete erhöhen, max. 20 % in 3 Jahren (15 % in Spannungsmärkten).",
          risk: "low",
          riskNote: "Gesetzlicher Standard. BGH-fest. Kappungsgrenze § 558 III BGB einhalten. Begründung mit Mietspiegel, Sachverständigengutachten oder 3 Vergleichswohnungen.",
          whenProblem: "Wenn Vermieter formelle Anforderungen verfehlt (z.B. fehlende Begründung) — Erhöhungsverlangen unwirksam.",
          whenNegotiate: "Selten verhandelbar, da gesetzlicher Mechanismus.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "staffel",
          label: "Staffelmiete (§ 557a BGB)",
          description: "Konkrete Erhöhungsbeträge im Voraus festgelegt, Mindestabstand 1 Jahr.",
          risk: "medium",
          riskNote: "Plansichere Mieterhöhung, aber während Staffelzeit keine §§ 558, 559 BGB-Erhöhungen. Mietpreisbremse gilt für jede Stufe!",
          whenProblem: "Marktsteigerungen über Staffelhöhe → Vermieter verliert. Sinkende Marktmieten → Mieter zahlt zu viel.",
          whenNegotiate: "Staffelhöhe, Kündigungsausschluss (max. 4 Jahre).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "index",
          label: "Indexmiete (§ 557b BGB)",
          description: "Miete wird an den vom Statistischen Bundesamt ermittelten Verbraucherpreisindex (VPI) gekoppelt. Anpassung max. 1x jährlich, schriftliche Erklärung erforderlich.",
          risk: "medium",
          riskNote: "Während Indexbindung keine §§ 558, 559 BGB-Erhöhungen außer bei Modernisierungsumlage durch Gesetz. Bei Inflation für Vermieter vorteilhaft, bei Deflation für Mieter.",
          whenProblem: "Hohe Inflation → Mieter belastet stark. Niedrige Inflation → Vermieter verliert Marktanpassung.",
          whenNegotiate: "Mietpreisbremse bei Indexstufen prüfen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "fest",
          label: "Festmiete ohne Anpassungsmechanismus",
          description: "Miete bleibt für die Vertragslaufzeit unverändert.",
          risk: "medium",
          riskNote: "Pro Mieter — vor allem bei Inflationen attraktiv. Vermieter kann nur über §§ 558, 559 BGB unter Berücksichtigung der Kappungsgrenze erhöhen.",
          whenProblem: "Vermieter verliert über Jahre an Inflation. Mieter ist gegenüber Marktanpassungen geschützt.",
          whenNegotiate: "Vermieter wird oft Staffel oder Index vorziehen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "staffel", ausgewogen: "vergleichsmiete", durchsetzungsstark: "fest" }
    },

    // ── 3. Mietkaution ──
    {
      key: "deposit",
      title: "Mietkaution",
      paragraph: "§ 4",
      description: "Wie hoch ist die Sicherheitsleistung? § 551 BGB: max. 3 Nettokaltmieten bei Wohnraum, in 3 Raten zahlbar.",
      importance: "high",
      options: [
        {
          value: "max_drei_kaltmieten",
          label: "3 Nettokaltmieten (gesetzliches Maximum)",
          description: "Maximalkaution in Höhe von 3 Nettokaltmieten. Mieter darf in 3 gleichen monatlichen Raten zahlen (§ 551 II BGB).",
          risk: "low",
          riskNote: "Maximalsicherheit für Vermieter, gesetzlich erlaubt. Getrennte Anlage Pflicht (Insolvenzschutz § 551 III BGB).",
          whenProblem: "Bei Mietern mit knapper Liquidität (vor allem im Wohnraum) Hürde — Mieter sollten Ratenzahlung nutzen.",
          whenNegotiate: "Mieter kann Bürgschaft als Alternative anbieten (z.B. Kautionskasse, Elternbürgschaft).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "zwei_kaltmieten",
          label: "2 Nettokaltmieten",
          description: "Reduzierte Kaution. Marktüblich in vielen Regionen.",
          risk: "low",
          riskNote: "Genug Sicherheit für die meisten Schäden, mieterfreundlich. Marktstandard in Mittel-/Süddeutschland.",
          whenProblem: "Bei starken Schäden oder Mietausfall könnte 2 Monatsmieten knapp werden.",
          whenNegotiate: "Häufig direkt akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "buergschaft",
          label: "Mietbürgschaft / Kautionsversicherung",
          description: "Statt Bargeld eine selbstschuldnerische Bürgschaft (Bank, Kautionskasse, Privatperson) bis zur Höhe von max. 3 Nettokaltmieten.",
          risk: "medium",
          riskNote: "Mieter behält Liquidität. Vermieter muss Bürgschaft prüfen — bei Bürgschaft einer Privatperson Bonität prüfen!",
          whenProblem: "Bei zahlungsunfähiger Bürgin (Privatperson) wertlos. Bürgschaft auf erstes Anfordern bei AGB unwirksam (BGH NJW 2007, 759).",
          whenNegotiate: "Vermieter sollte nur Bankbürgschaft oder Versicherungsbürgschaft akzeptieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "keine",
          label: "Keine Kaution",
          description: "Vermieter verzichtet auf Sicherheitsleistung.",
          risk: "high",
          riskNote: "Kein Schadensausgleich möglich außer durch Klage. Praxis selten — meist nur bei nahestehenden Personen oder Sozialwohnungen mit anderen Sicherungen.",
          whenProblem: "Schaden, Mietrückstände, Renovierungskosten müssen einzeln eingeklagt werden.",
          whenNegotiate: "Vermieter wird i.d.R. eine Form der Sicherheit verlangen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "max_drei_kaltmieten", ausgewogen: "zwei_kaltmieten", durchsetzungsstark: "buergschaft" }
    },

    // ── 4. Schönheitsreparaturen ──
    {
      key: "cosmetic_repairs",
      title: "Schönheitsreparaturen",
      paragraph: "§ 5",
      description: "Wer trägt die laufenden Schönheitsreparaturen (Streichen, Tapezieren)? BGH-Hochrisikobereich — viele Klauseln unwirksam!",
      importance: "critical",
      options: [
        {
          value: "keine_uebertragung",
          label: "Vermieter trägt Schönheitsreparaturen",
          description: "Schönheitsreparaturen verbleiben beim Vermieter (gesetzlicher Standard nach § 535 I 2 BGB).",
          risk: "low",
          riskNote: "Rechtssicher. Mieter zahlt nichts zusätzlich. Vermieter kalkuliert in die Kaltmiete ein.",
          whenProblem: "Wirtschaftlich für Vermieter weniger attraktiv — er übernimmt Renovierungskosten alle 8–10 Jahre.",
          whenNegotiate: "Mieter sollte das anstreben, falls die Wohnung unrenoviert übergeben wird (BGH XII ZR 96/23 vom 29.01.2025).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "weiche_fristen",
          label: "Übertragung mit weichen Fristen (üblicherweise alle X Jahre)",
          description: "Schönheitsreparaturen auf Mieter übertragen, mit Fristen die als Richtwerte (in der Regel, üblicherweise) ausgestaltet sind.",
          risk: "medium",
          riskNote: "BGH-fest, aber nur wenn (a) Wohnung renoviert übergeben wurde UND (b) keine starren Fristen UND (c) keine Quotenabgeltungsklausel. BGH VIII ZR 79/22 vom 06.03.2024 bestätigt: Quotenabgeltungsklauseln unwirksam.",
          whenProblem: "Wenn die Klausel auch nur einen unwirksamen Teil enthält (z.B. starre Fristen), ist die GANZE Klausel unwirksam — Vermieter trägt komplett.",
          whenNegotiate: "Mieter kann auf renovierten Übergabezustand bestehen — sonst Klausel unwirksam (BGH NJW 2015, 1594).",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "endrenovierung",
          label: "Endrenovierungsklausel beim Auszug",
          description: "Mieter muss bei Auszug die Wohnung renoviert übergeben (Streichen, Tapezieren), unabhängig vom Zustand bei Einzug oder der Wohndauer.",
          risk: "high",
          riskNote: "BGH NJW 2008, 2499: Starre Endrenovierungsklauseln in Formularverträgen sind unwirksam (§ 307 BGB)! Mieter kann Renovierung verweigern.",
          whenProblem: "Praktisch immer ein Problem — Mieter weigert sich oder klagt zurück.",
          whenNegotiate: "Eigentlich nicht durchsetzbar — vermeiden.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "weiche_fristen", ausgewogen: "weiche_fristen", durchsetzungsstark: "keine_uebertragung" }
    },

    // ── 5. Betriebskosten ──
    {
      key: "operating_costs",
      title: "Betriebskosten",
      paragraph: "§ 6",
      description: "Welche Betriebskosten zahlt der Mieter zusätzlich zur Kaltmiete? § 556 I BGB + BetrKV-Katalog.",
      importance: "high",
      options: [
        {
          value: "pauschale_warmmiete",
          label: "Inklusivmiete (Warmmiete)",
          description: "Sämtliche Betriebs- und Heizkosten sind in der Miete enthalten. Keine separate Abrechnung.",
          risk: "medium",
          riskNote: "Pro Mieter (Planbarkeit). Achtung: Bei Heiz-/Warmwasserkosten greift § 6 HeizkostenV — verbrauchsabhängige Abrechnung Pflicht. Inklusivmiete für Heizkosten in den meisten Fällen unwirksam.",
          whenProblem: "Bei steigenden Energiekosten zahlt Vermieter drauf. Bei Heizkosten oft unwirksam (HeizkostenV-Verstoß).",
          whenNegotiate: "Vermieter sollte mindestens Heizkosten separat abrechnen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "vorauszahlung_komplett",
          label: "Vorauszahlung mit jährlicher Abrechnung über alle Betriebskostenarten BetrKV",
          description: "Mieter zahlt monatliche Vorauszahlung. Vermieter rechnet jährlich nach BetrKV § 2 ab. Abrechnungsfrist § 556 III BGB: 12 Monate nach Abrechnungszeitraum-Ende.",
          risk: "low",
          riskNote: "Marktstandard. BGH-fest. Achtung: Klausel muss BetrKV-Bezug haben — pauschale sonstige Betriebskosten sind intransparent.",
          whenProblem: "Bei hohen Nachzahlungen Mieter unzufrieden. Bei verspäteter Abrechnung Ausschluss der Nachforderung (§ 556 III 3 BGB).",
          whenNegotiate: "Vorauszahlungshöhe realistisch festlegen — zu niedrig führt zu hohen Nachzahlungen.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "nur_heizung_warmwasser_separat",
          label: "Heizung und Warmwasser separat, Rest pauschal",
          description: "Heiz- und Warmwasserkosten verbrauchsabhängig (HeizkostenV-konform), übrige Betriebskosten pauschal in der Miete.",
          risk: "medium",
          riskNote: "BGH-fest, wenn Pauschale für kalte Betriebskosten nicht zu niedrig kalkuliert. Vermieter kann nicht nachfordern — Risiko Inflation.",
          whenProblem: "Steigende Müll-, Hausmeister-, Wasserkosten bleiben beim Vermieter.",
          whenNegotiate: "Bei langer Laufzeit für Vermieter wirtschaftlich riskant.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "vorauszahlung_komplett", ausgewogen: "vorauszahlung_komplett", durchsetzungsstark: "pauschale_warmmiete" }
    },

    // ── 6. Tierhaltung ──
    {
      key: "pets",
      title: "Tierhaltung",
      paragraph: "§ 7",
      description: "Darf der Mieter Tiere halten? Generelles Verbot in Formularvertrag unwirksam (BGH VIII ZR 168/12).",
      importance: "medium",
      options: [
        {
          value: "generell_erlaubt",
          label: "Tierhaltung uneingeschränkt erlaubt",
          description: "Mieter darf jegliche Haustiere halten, soweit Hausordnung und nachbarschaftliche Rücksichtnahme gewahrt bleiben.",
          risk: "medium",
          riskNote: "Pro Mieter. Vermieter verliert Steuerungsmöglichkeit bei großen oder gefährlichen Hunderassen.",
          whenProblem: "Wenn Mieter Listenhunde oder exotische Tiere hält — Konflikte mit Nachbarn / Versicherung.",
          whenNegotiate: "Vermieter sollte mind. mit Zustimmung wählen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "mit_zustimmung",
          label: "Tierhaltung nur mit schriftlicher Zustimmung des Vermieters (außer Kleintiere)",
          description: "Kleintiere (Hamster, Wellensittich, Aquarienfische) generell erlaubt. Hunde, Katzen, Reptilien etc. nur mit schriftlicher Zustimmung. Zustimmung darf nicht ohne sachlichen Grund verweigert werden.",
          risk: "low",
          riskNote: "BGH-fest. Vermieter behält Kontrolle, Mieter weiß Rechtslage. Klassische Kompromisslösung.",
          whenProblem: "Wenn Vermieter Zustimmung willkürlich verweigert — Mieter kann auf Erteilung klagen.",
          whenNegotiate: "Standard, meist beidseitig akzeptabel.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "generelles_verbot",
          label: "Generelles Tierhaltungsverbot",
          description: "Keine Tierhaltung erlaubt, auch keine Hunde und Katzen.",
          risk: "high",
          riskNote: "BGH VIII ZR 168/12 vom 20.03.2013: Generelles Hunde- und Katzenverbot in Formularvertrag UNWIRKSAM. Klausel wirkungslos, gesetzlicher Standard (Einzelfallabwägung) gilt.",
          whenProblem: "Klausel wirkungslos. Mieter kann sich darauf nicht verlassen, Vermieter hat keine Handhabe.",
          whenNegotiate: "Eigentlich nicht durchsetzbar — vermeiden.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mit_zustimmung", ausgewogen: "mit_zustimmung", durchsetzungsstark: "generell_erlaubt" }
    },

    // ── 7. Untervermietung ──
    {
      key: "subletting",
      title: "Untervermietung",
      paragraph: "§ 8",
      description: "Darf der Mieter Teile oder die ganze Wohnung untervermieten?",
      importance: "medium",
      options: [
        {
          value: "mit_zustimmung_berechtigtes_interesse",
          label: "Mit Zustimmung bei berechtigtem Interesse (gesetzlicher Standard § 553 BGB)",
          description: "Mieter hat Anspruch auf Erlaubnis zur Untervermietung eines Teils der Wohnung, wenn er ein berechtigtes Interesse hat (z.B. WG, finanzielle Engpässe). Erlaubnis kann nur aus wichtigem Grund verweigert werden.",
          risk: "low",
          riskNote: "Gesetzlicher Standard. § 553 BGB ist zwingend, kann nicht zu Lasten des Mieters geändert werden.",
          whenProblem: "Wenn Vermieter Zustimmung verweigert ohne wichtigen Grund — Mieter kann klagen / Schadenersatz.",
          whenNegotiate: "Gesetzlich nicht abänderbar zu Lasten des Mieters.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "generell_erlaubt",
          label: "Untervermietung generell erlaubt (auch ganze Wohnung, auch Kurzzeit)",
          description: "Mieter darf Wohnung ohne Zustimmung des Vermieters untervermieten, auch über Plattformen wie Airbnb.",
          risk: "high",
          riskNote: "Pro Mieter, aber: Hausordnung / Eigentümergemeinschaft können Kurzzeitvermietung verbieten. Steuer- und versicherungsrechtliche Implikationen.",
          whenProblem: "Wenn Mieter gewerblich vermietet (Airbnb) — Konflikt mit Wohnzweck, Steuerpflicht, Versicherung.",
          whenNegotiate: "Vermieter wird i.d.R. Zustimmungsvorbehalt verlangen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "mit_zustimmung_jeder_fall",
          label: "Schriftliche Zustimmung für JEDE Untervermietung",
          description: "Jede Form der Untervermietung erfordert schriftliche Zustimmung des Vermieters.",
          risk: "medium",
          riskNote: "Achtung: § 553 BGB Anspruch auf Erlaubnis bei berechtigtem Interesse bleibt zwingend bestehen — Klausel kann nur als Anzeigepflicht wirksam sein.",
          whenProblem: "Mieter ignoriert Klausel, da sie zum Teil unwirksam ist.",
          whenNegotiate: "Klausel sollte explizit § 553 BGB als Vorbehalt nennen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mit_zustimmung_berechtigtes_interesse", ausgewogen: "mit_zustimmung_berechtigtes_interesse", durchsetzungsstark: "generell_erlaubt" }
    },

    // ── 8. Kündigung ──
    {
      key: "termination",
      title: "Kündigung",
      paragraph: "§ 9",
      description: "Kündigungsfristen und -gründe. § 573c BGB ist für Wohnraum zwingend.",
      importance: "critical",
      options: [
        {
          value: "gesetzliche_fristen",
          label: "Gesetzliche Kündigungsfristen (§ 573c BGB)",
          description: "Mieter: 3 Monate. Vermieter: 3 Monate (bis 5 Jahre Mietdauer), 6 Monate (5–8 Jahre), 9 Monate (ab 8 Jahre). Vermieter braucht zusätzlich berechtigtes Interesse (§ 573 BGB).",
          risk: "low",
          riskNote: "Gesetzlicher Standard, zwingend bei Wohnraum (§ 573c IV BGB — Verlängerung zu Lasten des Mieters unwirksam).",
          whenProblem: "Selten — gesetzlicher Schutz. Vermieter muss berechtigtes Interesse darlegen.",
          whenNegotiate: "Nicht zu Lasten des Mieters verkürzbar.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "gestaffelte_mieterfristen",
          label: "Mieter mit gestaffelten Fristen (nur Gewerbe)",
          description: "Bei Gewerberaummiete: Längere Kündigungsfristen für Mieter (z.B. 6 Monate) zur Sicherung der Vermieter-Planung.",
          risk: "medium",
          riskNote: "Bei Wohnraum unwirksam (§ 573c IV BGB). Bei Gewerbe vertraglich frei vereinbar (§ 580a BGB).",
          whenProblem: "Mieter im Gewerbe wird unflexibler bei Strategiewechseln.",
          whenNegotiate: "Mieter sollte auf Sonderkündigungsrechte für definierte Ereignisse drängen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "kuendigungsausschluss_4_jahre",
          label: "Kündigungsausschluss bis zu 4 Jahre (Wohnraum)",
          description: "Beidseitiger Kündigungsausschluss für max. 4 Jahre (§ 557a III BGB analog, § 575 BGB), oft kombiniert mit Staffelmietvertrag.",
          risk: "medium",
          riskNote: "Pro Vermieter (Planung) und Mieter (Wohnsicherheit). 4 Jahre ist Maximum, längere Klauseln teilweise unwirksam (BGH NJW 2005, 1574).",
          whenProblem: "Bei Mieter-Lebensumständen-Wechsel (Job, Scheidung) → keine ordentliche Kündigung.",
          whenNegotiate: "Sonderkündigungsrechte für definierte Härtefälle einbauen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "gesetzliche_fristen", ausgewogen: "gesetzliche_fristen", durchsetzungsstark: "gesetzliche_fristen" }
    },

    // ── 9. Hausordnung und Nutzungsregeln ──
    {
      key: "house_rules",
      title: "Hausordnung und Nutzungsregeln",
      paragraph: "§ 10",
      description: "Wie verbindlich sind Hausordnung, Ruhezeiten, Reinigungspflichten?",
      importance: "medium",
      options: [
        {
          value: "hausordnung_anlage",
          label: "Hausordnung als verbindliche Anlage (Vertragsbestandteil)",
          description: "Schriftliche Hausordnung wird als Anlage Vertragsbestandteil. Mieter unterschreibt mit. Änderungen nur durch Vertragsänderung.",
          risk: "low",
          riskNote: "Klar und verbindlich. BGH-fest, solange Hausordnung selbst keine unwirksamen Klauseln enthält.",
          whenProblem: "Vermieter kann Hausordnung nicht einseitig ändern. Aktualisierung erfordert Mitwirkung aller Mieter.",
          whenNegotiate: "Mieter sollte Hausordnung VOR Unterschrift prüfen — wird Bestandteil des Vertrags.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "einseitige_aenderbar",
          label: "Hausordnung einseitig durch Vermieter änderbar (mit Ankündigungsfrist)",
          description: "Vermieter kann Hausordnung ändern, sofern dies nicht zu unangemessener Benachteiligung führt.",
          risk: "high",
          riskNote: "Klausel oft AGB-unwirksam (§ 308 Nr. 4 BGB). Einseitige Vertragsanpassung darf Mieter nicht unangemessen benachteiligen.",
          whenProblem: "Verschärfte Hausordnung (z.B. Ruhezeiten 19–7 Uhr) kann unwirksam sein.",
          whenNegotiate: "Mieter sollte ablehnen oder konkrete Schranken einbauen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gesetzliche_regeln",
          label: "Verweis auf gesetzliche Regelungen, keine Hausordnung",
          description: "Keine separate Hausordnung. Es gelten gesetzliche Regelungen (Lärmschutz, Nachbarschaftsgesetze).",
          risk: "medium",
          riskNote: "Pro Mieter. Vermieter hat weniger Steuerung.",
          whenProblem: "Konflikte zwischen Mietern müssen einzeln gelöst werden.",
          whenNegotiate: "Vermieter wird oft Hausordnung wünschen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "hausordnung_anlage", ausgewogen: "hausordnung_anlage", durchsetzungsstark: "gesetzliche_regeln" }
    },

    // ── 10. Mängel und Mietminderung ──
    {
      key: "defects",
      title: "Mängel und Mietminderung",
      paragraph: "§ 11",
      description: "Wie soll mit Mängeln umgegangen werden? § 536 BGB Mietminderung ist zwingend, kann bei Wohnraum nicht ausgeschlossen werden.",
      importance: "high",
      options: [
        {
          value: "gesetzlich",
          label: "Gesetzliche Regelung (§§ 536 ff. BGB)",
          description: "Mieter mindert Miete ipso iure bei Mangel. Anzeigepflicht § 536c BGB. Vermieter muss Mangel beseitigen.",
          risk: "low",
          riskNote: "Gesetzlicher Standard. Bei Wohnraum kann § 536 BGB nicht zu Lasten des Mieters abbedungen werden (§ 536 IV BGB).",
          whenProblem: "Mieter mindert übermäßig — Vermieter muss klagen.",
          whenNegotiate: "Bei Gewerbe begrenzbar — bei Wohnraum nicht.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "mangelanzeige_und_frist",
          label: "Mangelanzeige plus Nachbesserungsfrist (Wohnraum-konform)",
          description: "Mieter muss Mangel schriftlich anzeigen. Mietminderung erst nach Ablauf einer angemessenen Nachbesserungsfrist (z.B. 14 Tage).",
          risk: "medium",
          riskNote: "Im Gewerbe wirksam, im Wohnraum nur bedingt — § 536c BGB regelt bereits Anzeigepflicht. Klausel darf nicht von gesetzlicher Regelung zu Lasten des Mieters abweichen.",
          whenProblem: "Bei akuten Gefahren (Wassereinbruch, Heizungsausfall im Winter) — sofortige Minderung muss möglich bleiben.",
          whenNegotiate: "Bei Wohnraum vorsichtig formulieren, sonst unwirksam.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mietminderungsausschluss",
          label: "Mietminderung ausgeschlossen (nur Gewerbe!)",
          description: "Mieter zahlt volle Miete, kann nur auf Schadensersatz klagen.",
          risk: "high",
          riskNote: "Bei Wohnraum NICHTIG (§ 536 IV BGB). Bei Gewerbe nur als individuelle Vereinbarung wirksam, in AGB problematisch.",
          whenProblem: "Vorsicht: BGH stellt sehr hohe Anforderungen an Wirksamkeit auch im Gewerbe.",
          whenNegotiate: "Vermeiden, außer Gewerbe-Großmieter mit Verhandlungsmacht.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mangelanzeige_und_frist", ausgewogen: "gesetzlich", durchsetzungsstark: "gesetzlich" }
    },

    // ── 11. Schlussbestimmungen ──
    {
      key: "final_provisions",
      title: "Schlussbestimmungen (Schriftform, Gerichtsstand, salvatorische Klausel)",
      paragraph: "§ 12",
      description: "Standardklauseln am Vertragsende.",
      importance: "medium",
      options: [
        {
          value: "standard_konservativ",
          label: "Schriftform für Änderungen + salvatorische Klausel + Gerichtsstand Wohnungslage",
          description: "Vertragsänderungen schriftlich (Wohnraum: § 550 BGB!), salvatorische Klausel mit Anpassungspflicht, ausschließlicher Gerichtsstand am Ort der Mietsache.",
          risk: "low",
          riskNote: "Bei Wohnraum: Gerichtsstand am Wohnungsort ist nach § 29a ZPO zwingend. BGH-fest. Salvatorische Klausel bei AGB nur bedingt wirksam.",
          whenProblem: "Doppelte Schriftformklausel (auch dieses Schriftformerfordernis kann nur schriftlich aufgehoben werden) ist BGH-rechtlich umstritten — bei AGB unwirksam.",
          whenNegotiate: "Selten verhandelbar.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "textform_gewerbe",
          label: "Textform-Genügen für Gewerbe (BEG IV ab 01.01.2025)",
          description: "Bei Gewerbe genügt seit 01.01.2025 die Textform für Vertragsänderungen (§ 578 BGB n.F. i.V.m. § 126b BGB). Schriftform freiwillig.",
          risk: "low",
          riskNote: "Modern, BEG IV-konform. Nur für Gewerbe! Bei Wohnraum weiterhin Schriftform Pflicht.",
          whenProblem: "Bei Altverträgen vor 01.01.2025 noch Schriftform-Übergangsregel bis 01.01.2026.",
          whenNegotiate: "Mieter kann zugunsten der Flexibilität zustimmen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "minimal",
          label: "Reine Verweisung auf gesetzliche Regelungen",
          description: "Keine speziellen Schlussbestimmungen. Es gelten gesetzliche Vorgaben.",
          risk: "medium",
          riskNote: "Schlanker Vertrag. Achtung: Bei langfristigen Wohnraummietverträgen § 550 BGB Schriftform Pflicht — fehlt hier oft die explizite Klausel zur Erinnerung.",
          whenProblem: "Streitfälle ohne klare vertragliche Regelung — Auslegungsbedarf.",
          whenNegotiate: "Praxisuntauglich, vermeiden.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "standard_konservativ", ausgewogen: "standard_konservativ", durchsetzungsstark: "minimal" }
    }
  ]
};

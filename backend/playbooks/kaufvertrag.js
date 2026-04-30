// Kaufvertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Recherche-Doc: docs/playbooks/kaufvertrag.md

module.exports = {
  type: "kaufvertrag",
  title: "Kaufvertrag (Sache, Ware, Fahrzeug, Immobilie)",
  description: "Kaufvertrag zwischen Verkäufer und Käufer über bewegliche Sachen, Waren mit digitalen Elementen, Fahrzeuge oder Immobilien — mit klarer Abgrenzung B2B/B2C, Mängel- und Garantieregeln nach neuem Schuldrecht (Schuldrechtsreform 2022) und Risikoabsicherung (Eigentumsvorbehalt, Lieferbedingungen, Verzug).",
  icon: "package",
  difficulty: "komplex",
  estimatedTime: "10–15 Minuten",
  legalBasis: "BGB §§ 433–479, §§ 474–479 (Verbrauchsgüterkauf), §§ 475a–475e (Waren mit digitalen Elementen), § 311b (Beurkundung Grundstücke), §§ 312–312k (Fernabsatz), §§ 355–361 (Widerrufsrecht), § 449 (Eigentumsvorbehalt); HGB §§ 373–381; ProdHaftG; UStG §§ 13b, 14, 19, 25a; CISG; Incoterms® 2020",

  // Rollen-Definition
  roles: {
    A: { key: "verkaeufer", label: "Verkäufer", description: "Bietet Sache (Ware, Fahrzeug, Immobilie, Software-Datenträger) gegen Kaufpreis an" },
    B: { key: "kaeufer", label: "Käufer", description: "Erwirbt Eigentum gegen Kaufpreis" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Verkäufer — maximaler Schutz vor Zahlungsausfall, enge Mängelhaftung im rechtlich Zulässigen, kurze Verjährungsfristen, Gerichtsstand am Sitz des Verkäufers",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — klare Beschaffenheitsvereinbarung, gesetzliche Mängelhaftung, einfacher Eigentumsvorbehalt, fairer Gerichtsstand am Sitz Beklagter",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Käufer — erweiterte Beschaffenheitsvereinbarung, lange Mängelhaftungsfristen, DDP-Lieferung, Garantie zusätzlich zur Gewährleistung",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    // Verkäufer
    { key: "partyA_name", label: "Name / Firma (Verkäufer)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertretungsberechtigt", type: "text", required: false, group: "partyA" },
    { key: "partyA_taxId", label: "USt-IdNr. / Steuernummer (B2B)", type: "text", required: false, group: "partyA" },
    { key: "partyA_role", label: "Rechtliche Stellung Verkäufer", type: "select", required: true, group: "partyA",
      options: [
        { value: "unternehmer", label: "Unternehmer (§ 14 BGB)" },
        { value: "privat", label: "Privatperson" },
        { value: "kleinunternehmer", label: "Kleinunternehmer (§ 19 UStG)" }
      ]
    },

    // Käufer
    { key: "partyB_name", label: "Name / Firma (Käufer)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Anschrift", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_taxId", label: "USt-IdNr. (B2B)", type: "text", required: false, group: "partyB" },
    { key: "partyB_role", label: "Rechtliche Stellung Käufer", type: "select", required: true, group: "partyB",
      options: [
        { value: "verbraucher", label: "Verbraucher (§ 13 BGB) — Verbrauchsgüterkauf, §§ 474ff BGB" },
        { value: "unternehmer", label: "Unternehmer (§ 14 BGB) — B2B" },
        { value: "kaufmann", label: "Kaufmann (HGB) — § 377 HGB Rügepflicht" }
      ]
    },

    // Vertragskontext
    { key: "saleType", label: "Vertragstyp / Kaufgegenstand", type: "select", required: true, group: "context",
      options: [
        { value: "neuware", label: "Neuware (bewegliche Sache, neu)" },
        { value: "gebrauchtware", label: "Gebrauchtware (bewegliche Sache, gebraucht)" },
        { value: "fahrzeug_neu", label: "Fahrzeug (Neu)" },
        { value: "fahrzeug_gebraucht", label: "Fahrzeug (Gebraucht)" },
        { value: "ware_digital", label: "Ware mit digitalen Elementen (Smart-TV, IoT, vernetztes Gerät)" },
        { value: "immobilie", label: "Immobilie / Grundstück (NOTARIELLE BEURKUNDUNG ZWINGEND, § 311b BGB)" },
        { value: "international", label: "Internationaler Kauf (CISG-relevant)" }
      ]
    },
    { key: "object_description", label: "Kaufgegenstand (genaue Bezeichnung)", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Mercedes-Benz E-Klasse, Bj. 2018, FIN: WDD..., Laufleistung 80.000 km" },
    { key: "purchase_price", label: "Kaufpreis (Netto, EUR)", type: "number", required: true, group: "context" },
    { key: "vat_treatment", label: "USt-Behandlung", type: "select", required: true, group: "context",
      options: [
        { value: "regelsteuer_19", label: "Regelsteuersatz 19 %" },
        { value: "regelsteuer_7", label: "Ermäßigter Satz 7 %" },
        { value: "differenzbesteuerung", label: "Differenzbesteuerung (§ 25a UStG, gebrauchte Sachen)" },
        { value: "reverse_charge", label: "Reverse Charge (§ 13b UStG, B2B EU)" },
        { value: "kleinunternehmer", label: "Ohne USt (Kleinunternehmer § 19 UStG)" }
      ]
    },
    { key: "delivery_location", label: "Lieferort / Erfüllungsort", type: "text", required: true, group: "context",
      placeholder: "z.B. Werk Stuttgart, oder: Lieferung an Käufer-Adresse" },
    { key: "channel", label: "Verkaufskanal", type: "select", required: true, group: "context",
      options: [
        { value: "vor_ort", label: "Verkauf vor Ort / im Geschäft" },
        { value: "fernabsatz", label: "Fernabsatz (Online, Telefon, Versand) — Widerrufsrecht bei B2C" },
        { value: "ausserhalb_geschaeft", label: "Außerhalb des Geschäftslokals (Haustür) — Widerrufsrecht bei B2C" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Kaufgegenstand und Beschaffenheit ──
    {
      key: "subject_quality",
      title: "Kaufgegenstand und Beschaffenheit",
      paragraph: "§ 2",
      description: "§ 434 BGB (n.F.) — Beschaffenheitsvereinbarung dominiert die Mangelbestimmung. Klare Beschreibung schützt beide Seiten. BGH VIII ZR 161/23: Beschaffenheitsangaben überlagern Gewährleistungsausschluss.",
      importance: "critical",
      options: [
        {
          value: "pauschal",
          label: "Nur pauschale Bezeichnung",
          description: "Sache wird nur per Bezeichnung benannt, ohne Eigenschaften zu spezifizieren.",
          risk: "high",
          riskNote: "Streitanfällig — Mangel-/Beschaffenheitsstreit nahezu unvermeidbar. § 434 Abs. 3 BGB greift mit objektiven Anforderungen, die der Verkäufer kaum vorhersehen kann.",
          whenProblem: "Wenn Käufer behauptet, bestimmte Eigenschaft sei zugesagt worden — schwere Beweissituation.",
          whenNegotiate: "Beide Seiten profitieren von präziser Beschreibung — nie pauschal lassen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_beschaffenheit",
          label: "Mit konkreter Beschaffenheitsvereinbarung",
          description: "Eigenschaften (Material, Maße, Funktionen, Bj., FIN, Laufleistung) werden ausdrücklich vereinbart.",
          risk: "low",
          riskNote: "§ 434 Abs. 2 BGB: subjektive Anforderungen klar fixiert. Schutz vor verdeckten Mängeln.",
          whenProblem: "Wenn Eigenschaft fehlt, ist Mangel klar feststellbar — Verkäufer haftet konkret.",
          whenNegotiate: "Standard für seriöse Verkäufe — direkt akzeptabel.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "mit_zusicherung_garantie",
          label: "Mit Beschaffenheitsvereinbarung + Garantie (§ 443 BGB)",
          description: "Beschaffenheit + selbstständige Garantie ('Wir garantieren rostfreie Karosserie für 5 Jahre').",
          risk: "low",
          riskNote: "Selbstständige Garantie als Vertrauensbasis; bei Garantieübernahme greift § 444 BGB — Gewährleistungsausschluss unwirksam.",
          whenProblem: "Verkäufer haftet zusätzlich aus Garantie auch nach Ablauf der Gewährleistung.",
          whenNegotiate: "Pro Käufer: Selbstständige Garantieleistungen verlangen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "negativ_b2c",
          label: "Negative Beschaffenheitsvereinbarung (B2C, § 476 Abs. 1 S. 2 BGB)",
          description: "'Sache weicht von objektiver Anforderung X ab — Verbraucher wurde gesondert hierauf hingewiesen und hat ausdrücklich zugestimmt.'",
          risk: "medium",
          riskNote: "Nur wirksam bei eigenständigem Hinweis und ausdrücklicher Zustimmung des Verbrauchers vor Vertragsschluss. Komplex und streitanfällig.",
          whenProblem: "Wenn Hinweis nicht beweisbar — Klausel unwirksam, Verbraucher hat volle objektive Anforderungen.",
          whenNegotiate: "Verkäufer: gesonderten Aufklärungsprozess dokumentieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mit_beschaffenheit", ausgewogen: "mit_beschaffenheit", durchsetzungsstark: "mit_zusicherung_garantie" }
    },

    // ── 2. Kaufpreis, Zahlung, Skonto ──
    {
      key: "price_payment",
      title: "Kaufpreis, Zahlungsbedingungen und Skonto",
      paragraph: "§ 3",
      description: "Zahlungsmodalitäten, Verzugszinsen § 288 BGB (B2B: 9 % über Basiszinssatz; B2C: 5 % über Basiszinssatz), USt-Ausweis nach § 14 UStG.",
      importance: "critical",
      options: [
        {
          value: "vorkasse",
          label: "Vorkasse 100 %",
          description: "Zahlung vor Lieferung.",
          risk: "low",
          riskNote: "Sicher für VK; bei B2C mit erkennbarer Vorleistung Widerrufsrecht zu beachten.",
          whenProblem: "Wenn Käufer bei Lieferung Mangel feststellt — Rückabwicklungsrisiko.",
          whenNegotiate: "Beide: Treuhand bei großen Beträgen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "30_tage_netto",
          label: "30 Tage netto",
          description: "Zahlung 30 Tage nach Rechnungsstellung; § 286 Abs. 3 BGB — automatischer Verzug nach 30 Tagen.",
          risk: "medium",
          riskNote: "Marktstandard B2B. Bei B2C nicht praxisgängig (Vor-Ort-Geschäft → sofort).",
          whenProblem: "Verzugsrisiko bei VK; Liquiditätsdruck wenn Käufer langsam zahlt.",
          whenNegotiate: "VK: Verzugszinsen 9 % über Basiszinssatz (§ 288 Abs. 2 BGB) explizit nennen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "14_tage_skonto",
          label: "14 Tage netto, 2 % Skonto bei 7 Tagen",
          description: "Zahlungsanreiz für Käufer.",
          risk: "low",
          riskNote: "Käufer-freundlich; VK schnell liquide.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Standard-Variante mit Anreiz — direkt akzeptabel.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "meilensteine_anzahlung",
          label: "Anzahlung + Restzahlung (z.B. 30/70)",
          description: "Anzahlung bei Bestellung, Rest bei Lieferung.",
          risk: "medium",
          riskNote: "Bei B2C ist Anzahlung > 30 % oft als überraschende Klausel angesehen (§ 305c BGB). Bei Werklieferung § 632a BGB Abschlagszahlungen möglich.",
          whenProblem: "Käufer: Anzahlung-Verlustrisiko bei Insolvenz VK; daher Bürgschaft sinnvoll.",
          whenNegotiate: "Käufer: Anzahlungsbürgschaft fordern.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "vorkasse", ausgewogen: "30_tage_netto", durchsetzungsstark: "14_tage_skonto" }
    },

    // ── 3. Lieferung, Gefahrübergang, Incoterms ──
    {
      key: "delivery_terms",
      title: "Lieferung, Gefahrübergang und Incoterms",
      paragraph: "§ 4",
      description: "§ 446 BGB — Gefahr geht mit Übergabe über. Bei Versendungskauf B2B § 447 BGB — Gefahr geht mit Übergabe an Spediteur über. Bei B2C § 475 Abs. 2 BGB — Gefahr immer erst mit Übergabe an Verbraucher.",
      importance: "high",
      options: [
        {
          value: "exw_abholung",
          label: "EXW (Ex Works) — Abholung beim Verkäufer",
          description: "Käufer holt ab; Gefahrübergang mit Bereitstellung.",
          risk: "high",
          riskNote: "VK-freundlich; Käufer trägt vollständiges Transport- und Versicherungsrisiko. Bei B2C unzulässig — § 475 Abs. 2 BGB.",
          whenProblem: "Käufer: Transportschäden bei eigenem/beauftragtem Transport.",
          whenNegotiate: "Käufer: Transportversicherung selbst abschließen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "cpt_dap_geliefert",
          label: "CPT/DAP — Geliefert an Bestimmungsort, ohne Verzollung",
          description: "VK liefert; Transport bezahlt vom VK; Gefahrübergang am Bestimmungsort.",
          risk: "medium",
          riskNote: "Marktstandard B2B; klare Risikoverteilung.",
          whenProblem: "Bei Zollproblemen — Verzögerungen.",
          whenNegotiate: "VK: Transportkosten und Versicherung im Preis kalkulieren.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "ddp_voll_geliefert",
          label: "DDP — Geliefert mit Verzollung",
          description: "VK trägt alles bis Empfangsort, inkl. Zoll, Steuern, Versicherung.",
          risk: "low",
          riskNote: "Käufer-freundlich; VK trägt höchstes Risiko. Komplex bei internationaler Verzollung.",
          whenProblem: "Wenn VK Zoll-/Steuersystem im Bestimmungsland nicht kennt — Mehrkosten.",
          whenNegotiate: "VK: nur bei genauer Kenntnis Zielmarkt; sonst CPT bevorzugen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "gesetzlich_b2c",
          label: "Gesetzlicher Standard B2C (§ 475 Abs. 2 BGB)",
          description: "Gefahrübergang erst mit Übergabe an Verbraucher; VK trägt Transportrisiko.",
          risk: "low",
          riskNote: "Zwingend bei Verbrauchsgüterkauf — abweichende Klausel unwirksam.",
          whenProblem: "Standard, alternativlos für B2C.",
          whenNegotiate: "Nicht verhandelbar bei B2C — gesetzlich zwingend.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "exw_abholung", ausgewogen: "cpt_dap_geliefert", durchsetzungsstark: "ddp_voll_geliefert" }
    },

    // ── 4. Eigentumsvorbehalt ──
    {
      key: "retention_of_title",
      title: "Eigentumsvorbehalt",
      paragraph: "§ 5",
      description: "§ 449 BGB — schützt VK vor Zahlungsausfall und Insolvenz Käufer (Aussonderungsrecht § 47 InsO). Bei B2B üblich; bei B2C oft ohnehin Zug-um-Zug-Geschäft.",
      importance: "high",
      options: [
        {
          value: "kein_ev",
          label: "Kein Eigentumsvorbehalt",
          description: "Eigentum geht mit Übergabe sofort über (§ 929 BGB).",
          risk: "high",
          riskNote: "VK trägt volles Insolvenzrisiko Käufer — bei Ratenzahlung gefährlich.",
          whenProblem: "Bei Käufer-Insolvenz vor Zahlung — VK ist nur einfacher Insolvenzgläubiger.",
          whenNegotiate: "Vermeidbar bei Vorkasse oder Sofortzahlung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "einfacher_ev",
          label: "Einfacher Eigentumsvorbehalt",
          description: "Eigentum bleibt beim VK bis Vollzahlung Kaufpreis dieser Sache.",
          risk: "low",
          riskNote: "Standard B2B; bei Insolvenz Käufer Aussonderungsrecht. Klar und unstreitig.",
          whenProblem: "Wenn Käufer Sache verarbeitet — EV erlischt nach § 950 BGB.",
          whenNegotiate: "Käufer: prüfen, ob Sache produktiv eingesetzt werden soll → ggf. verarbeitenden EV.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "verlaengerter_ev",
          label: "Verlängerter Eigentumsvorbehalt (Verarbeitung + Vorausabtretung)",
          description: "EV erstreckt sich auf neue Sache (§ 950 BGB) und Vorausabtretung Forderungen aus Weiterveräußerung.",
          risk: "medium",
          riskNote: "Komplexe Klausel; AGB-konform nur bei klaren Formulierungen. BGH NJW 1989, 902. Bei Konzernlieferungen Standard.",
          whenProblem: "Wenn Klausel nicht eindeutig — Risiko Unwirksamkeit § 305c BGB.",
          whenNegotiate: "Beide: notarielle Beratung sinnvoll.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "kontokorrent_ev",
          label: "Kontokorrent-Eigentumsvorbehalt (Konzern-EV)",
          description: "EV bis Erfüllung aller Forderungen aus laufender Geschäftsverbindung.",
          risk: "medium",
          riskNote: "Nur zwischen Kaufleuten zulässig (BGH NJW 1989, 902). Bei AGB enge Inhaltskontrolle § 307 BGB.",
          whenProblem: "Bei Streit über erfasste Forderungen — Auslegung schwierig.",
          whenNegotiate: "VK: klare Liste umfasster Forderungen führen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "verlaengerter_ev", ausgewogen: "einfacher_ev", durchsetzungsstark: "kein_ev" }
    },

    // ── 5. Mängelhaftung und Verjährung ──
    {
      key: "warranty",
      title: "Mängelhaftung und Verjährung",
      paragraph: "§ 6",
      description: "§ 437 BGB — Käuferrechte; § 438 BGB — Verjährung (Standard 2 Jahre; Bauwerk 5 Jahre). § 476 BGB — Verbraucherschutz: keine Abweichung zum Nachteil; bei Gebrauchtware Verkürzung auf min. 1 Jahr nur mit ausdrücklicher Vereinbarung.",
      importance: "critical",
      options: [
        {
          value: "gesetzlich_2_jahre",
          label: "Gesetzliche Mängelhaftung 2 Jahre",
          description: "Volle Mängelrechte nach §§ 434–442 BGB für 2 Jahre.",
          risk: "low",
          riskNote: "B2C-Pflicht; B2B-Standard. Beweislastumkehr 12 Monate (§ 477 BGB).",
          whenProblem: "Käufer kann Nacherfüllung, Rücktritt, Minderung, Schadensersatz verlangen.",
          whenNegotiate: "VK: bei B2C nicht abdingbar.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "verkuerzt_1_jahr_b2b",
          label: "Verkürzt auf 1 Jahr (B2B-Gebrauchtware)",
          description: "Verjährung 1 Jahr ab Übergabe.",
          risk: "medium",
          riskNote: "Bei B2C nur für Gebrauchtware mit ausdrücklicher Vereinbarung (§ 476 Abs. 2 BGB) zulässig. Bei B2B AGB-Recht: § 309 Nr. 8 BGB beachten.",
          whenProblem: "Bei Spätschäden — keine Mängelrechte mehr.",
          whenNegotiate: "Käufer: längere Frist wenn Sache komplex/langfristig.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "erweitert_5_jahre",
          label: "Erweitert auf 5 Jahre (Bauwerk-Niveau)",
          description: "Mängelhaftung 5 Jahre — sinnvoll für langlebige hochwertige Güter.",
          risk: "low",
          riskNote: "Käufer-freundlich; VK trägt langes Risiko. § 438 BGB Bauwerks-Maßstab.",
          whenProblem: "VK: hohe Rückstellungen erforderlich.",
          whenNegotiate: "VK: Aufschlag im Preis für erweiterte Haftung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "ausgeschlossen_b2b",
          label: "Ausgeschlossen (B2B-Gebrauchtware)",
          description: "'Verkauf wie besehen unter Ausschluss jeder Sachmängelhaftung.'",
          risk: "high",
          riskNote: "Bei B2C unwirksam (§ 476 Abs. 1 BGB). Bei B2B nur bei Individualabrede; in AGB stark eingeschränkt (§ 309 Nr. 8). § 444 BGB: Ausschluss greift nicht bei Vorsatz, Garantie oder Beschaffenheitsvereinbarung — siehe BGH VIII ZR 161/23.",
          whenProblem: "Wenn Beschaffenheitsangabe vorliegt — Ausschluss kippt teilweise.",
          whenNegotiate: "Käufer: Beschaffenheitsangaben in Anzeige sammeln und dokumentieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "verkuerzt_1_jahr_b2b", ausgewogen: "gesetzlich_2_jahre", durchsetzungsstark: "erweitert_5_jahre" }
    },

    // ── 6. Aktualisierungspflicht (digitale Elemente) ──
    {
      key: "digital_updates",
      title: "Aktualisierungspflicht (digitale Elemente)",
      paragraph: "§ 7",
      description: "§ 475b BGB — Verkäufer von Waren mit digitalen Elementen (Smartphone, Smart-TV, Connected Car, IoT-Gerät) muss Updates bereitstellen, solange Verbraucher dies erwarten kann. BGH 10.07.2024 — VIII ZR 276/23: Verjährung beginnt mit Ende erwartetem Bereitstellungszeitraum.",
      importance: "high",
      options: [
        {
          value: "keine_digitalen_elemente",
          label: "Sache hat keine digitalen Elemente",
          description: "Klassischer Sachkauf ohne Software/IoT-Funktionen.",
          risk: "low",
          riskNote: "§ 475b nicht anwendbar.",
          whenProblem: "Selten relevant.",
          whenNegotiate: "Nicht verhandelbar — Sachfrage.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "updates_2_jahre",
          label: "Aktualisierungspflicht 2 Jahre",
          description: "Sicherheits- und Funktionsupdates für 2 Jahre nach Kauf.",
          risk: "medium",
          riskNote: "Bei B2C oft als unzureichend angesehen — bei langlebigen Geräten (Smart-TV, Auto) erwartet Verbraucher länger.",
          whenProblem: "Wenn Gerät >2 Jahre genutzt wird und keine Updates mehr — Mangel nach BGH.",
          whenNegotiate: "VK: Update-Zeitraum klar kommunizieren.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "updates_5_jahre",
          label: "Aktualisierungspflicht 5 Jahre",
          description: "Lange Update-Zusage für hochwertige/langlebige Geräte.",
          risk: "low",
          riskNote: "Marktführer im Premium-Segment (z.B. Samsung Galaxy S24+ 7 Jahre). Käufer-freundlich.",
          whenProblem: "VK: hoher Aufwand bei Sicherheitslücken.",
          whenNegotiate: "VK: Aufschlag im Preis.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "updates_lebenszeit",
          label: "Aktualisierungspflicht für Lebenszeit / unbestimmt",
          description: "Lebenslange Update-Zusage (rar, z.B. bei manchen Industrie-IoT).",
          risk: "medium",
          riskNote: "Praktisch nur bei wartungsvertraglich gekoppelten Produkten realistisch. AGB: bei zu vager Formulierung § 307 BGB.",
          whenProblem: "Bei Hersteller-Insolvenz oder Produkt-EOL — Streit.",
          whenNegotiate: "Konkret formulieren ('solange Hersteller das Produkt unterstützt').",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "updates_2_jahre", ausgewogen: "updates_2_jahre", durchsetzungsstark: "updates_5_jahre" }
    },

    // ── 7. Rüge- und Untersuchungspflicht (B2B) ──
    {
      key: "inspection_duty",
      title: "Rüge- und Untersuchungspflicht (B2B)",
      paragraph: "§ 8",
      description: "§ 377 HGB — Käufer (Kaufmann) muss Ware unverzüglich untersuchen und Mängel rügen, sonst Genehmigungsfiktion. Nicht anwendbar bei B2C.",
      importance: "high",
      options: [
        {
          value: "gesetzlich_377",
          label: "Gesetzliche Regelung § 377 HGB",
          description: "'Unverzügliche' Rüge nach Untersuchung; bei verdeckten Mängeln nach Entdeckung.",
          risk: "medium",
          riskNote: "Standard B2B. Käufer verliert Rechte bei Verzug. 'Unverzüglich' = i.d.R. 1–14 Tage je nach Branche.",
          whenProblem: "Wenn Käufer später rügt — Mängelrechte verloren.",
          whenNegotiate: "Beide: Branchenüblichkeit prüfen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "ruege_3_tage",
          label: "Konkrete Rügefrist 3 Tage",
          description: "Klare Frist von 3 Werktagen ab Lieferung.",
          risk: "medium",
          riskNote: "VK-freundlich; Käufer unter Zeitdruck. AGB-Kontrolle: kürzere Fristen oft als unangemessen angesehen.",
          whenProblem: "Käufer: bei großen Lieferungen unzureichend.",
          whenNegotiate: "Käufer: 7–14 Tage verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "ruege_14_tage",
          label: "Rügefrist 14 Tage",
          description: "Großzügige Frist.",
          risk: "low",
          riskNote: "Käufer-freundlich; praxistauglich.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Direkt akzeptabel.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "nicht_anwendbar",
          label: "Nicht anwendbar (B2C)",
          description: "Bei Verbrauchsgüterkauf gilt nur gesetzliche Mängelhaftung ohne Rügepflicht.",
          risk: "low",
          riskNote: "§ 377 HGB greift nur bei Kaufleuten.",
          whenProblem: "Nicht relevant.",
          whenNegotiate: "Nicht verhandelbar.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "ruege_3_tage", ausgewogen: "gesetzlich_377", durchsetzungsstark: "ruege_14_tage" }
    },

    // ── 8. Garantie ──
    {
      key: "guarantee",
      title: "Garantie (selbstständige Verpflichtung, § 443 BGB)",
      paragraph: "§ 9",
      description: "Garantie ist eigenständige Verpflichtung neben Gewährleistung. § 444 BGB: Bei Garantieübernahme ist Gewährleistungsausschluss unwirksam.",
      importance: "medium",
      options: [
        {
          value: "keine_garantie",
          label: "Keine zusätzliche Garantie",
          description: "Nur gesetzliche Mängelhaftung.",
          risk: "low",
          riskNote: "Standard.",
          whenProblem: "Nicht relevant.",
          whenNegotiate: "VK: spart Folgekosten.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "beschaffenheitsgarantie_1_jahr",
          label: "Beschaffenheitsgarantie 1 Jahr",
          description: "Garantie für vereinbarte Eigenschaften für 12 Monate (z.B. 'Funktionsgarantie').",
          risk: "medium",
          riskNote: "§ 444 BGB: Gewährleistungsausschluss greift nicht für Garantie. VK: Doppelhaftung möglich.",
          whenProblem: "Bei Garantiefall trotz wirksamem Gewährleistungsausschluss.",
          whenNegotiate: "VK: präzise Garantiebedingungen formulieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "haltbarkeitsgarantie_5_jahre",
          label: "Haltbarkeitsgarantie (z.B. 5 Jahre rostfrei)",
          description: "Zusage, dass Sache bestimmte Zeit haltbar/funktionsfähig bleibt (§ 443 Abs. 2 BGB Vermutung).",
          risk: "medium",
          riskNote: "Käufer-freundlich; bei Mangel innerhalb Garantiezeit Vermutung des Sachmangels.",
          whenProblem: "VK: hohe Folgekosten.",
          whenNegotiate: "VK: Garantiehöhe gestaffelt anbieten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "herstellergarantie_verweis",
          label: "Verweis auf Herstellergarantie",
          description: "Käufer kann sich an Hersteller wenden; VK haftet weiterhin gesetzlich.",
          risk: "low",
          riskNote: "Marktstandard bei Markenware.",
          whenProblem: "Käufer: Hersteller im Ausland — komplexe Abwicklung.",
          whenNegotiate: "Käufer: VK soll bei Garantie-Hilfe leisten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "keine_garantie", ausgewogen: "herstellergarantie_verweis", durchsetzungsstark: "beschaffenheitsgarantie_1_jahr" }
    },

    // ── 9. Widerrufsrecht (B2C Fernabsatz) ──
    {
      key: "right_of_withdrawal",
      title: "Widerrufsrecht (B2C Fernabsatz/Außergeschäftsraum)",
      paragraph: "§ 10",
      description: "§ 312g BGB — 14 Tage Widerrufsrecht. Belehrungspflicht nach Anlage 1 EGBGB. Fehlerhafte Belehrung verlängert Frist auf 12 Monate + 14 Tage (§ 356 Abs. 3 BGB).",
      importance: "critical",
      options: [
        {
          value: "nicht_anwendbar",
          label: "Nicht anwendbar (B2B oder Vor-Ort-Geschäft)",
          description: "Kein Widerrufsrecht.",
          risk: "low",
          riskNote: "Bei B2B oder Vor-Ort-Verkauf gesetzlich nicht zwingend.",
          whenProblem: "Nicht relevant.",
          whenNegotiate: "Nicht verhandelbar.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "belehrung_muster",
          label: "Standard-Widerrufsbelehrung (Muster Anlage 1 EGBGB)",
          description: "Pflichtmuster verwenden, Bestätigungstext und Widerrufsformular bereitstellen.",
          risk: "low",
          riskNote: "Rechtssicher; Standard.",
          whenProblem: "Wenn Belehrung nicht nachweisbar — Frist auf 12 Monate + 14 Tage.",
          whenNegotiate: "VK: Belehrung in Bestätigungs-E-Mail und im Versandkarton.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "ausnahme_individualisiert",
          label: "Ausnahme nach Kundenspezifikation (§ 312g Abs. 2 Nr. 1 BGB)",
          description: "Widerruf ausgeschlossen, da Sache nach Kundenwunsch gefertigt.",
          risk: "medium",
          riskNote: "Nur bei tatsächlicher Individualisierung; bei Standardware unzulässig (Abmahnrisiko).",
          whenProblem: "Wenn Käufer behauptet, Standardware sei nicht individualisiert — Streit.",
          whenNegotiate: "VK: Individualisierung dokumentieren.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "verlaengert_30_tage",
          label: "Erweitertes Widerrufsrecht 30 Tage",
          description: "Freiwillig erweiterte Frist als Marketing-Vorteil.",
          risk: "low",
          riskNote: "Käufer-freundlich; Vertrauenssignal.",
          whenProblem: "VK: höhere Retoure-Quote.",
          whenNegotiate: "VK: Marketing-Vorteil gegen erhöhte Retouren-Kosten abwägen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "belehrung_muster", ausgewogen: "belehrung_muster", durchsetzungsstark: "verlaengert_30_tage" }
    },

    // ── 10. Haftungsbegrenzung ──
    {
      key: "liability",
      title: "Haftungsbegrenzung",
      paragraph: "§ 11",
      description: "§ 309 Nr. 7 BGB — Haftung für Vorsatz, grobe Fahrlässigkeit, Personenschäden in AGB nicht ausschließbar. § 444 BGB — bei Garantie/Beschaffenheitsvereinbarung Ausschluss für arglistig verschwiegene Mängel unwirksam. ProdHaftG bleibt unberührt.",
      importance: "high",
      options: [
        {
          value: "gesetzlich",
          label: "Gesetzliche Haftung (BGB)",
          description: "Volle Haftung nach BGB.",
          risk: "medium",
          riskNote: "Käufer-freundlich. VK trägt unbegrenztes Folgeschaden-Risiko.",
          whenProblem: "Bei großen Schäden — ruinös.",
          whenNegotiate: "VK: Haftpflichtversicherung Pflicht.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "begrenzt_typisch",
          label: "Begrenzt auf typischen vorhersehbaren Schaden",
          description: "'Haftung für leichte Fahrlässigkeit auf Ersatz des bei Vertragsschluss vorhersehbaren typischen Schadens begrenzt.'",
          risk: "low",
          riskNote: "AGB-konform (§ 309 Nr. 7 BGB beachtet). Marktstandard B2B.",
          whenProblem: "Wenn Schaden außergewöhnlich hoch — Käufer trägt Differenz.",
          whenNegotiate: "Käufer: zusätzliche Versicherung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "begrenzt_kaufpreis",
          label: "Begrenzt auf Kaufpreis (max. Höhe)",
          description: "Haftungsobergrenze = Kaufpreis.",
          risk: "medium",
          riskNote: "Bei niedrigen Kaufpreisen + hohen Folgeschäden problematisch. AGB: bei groben Schäden Klausel kippt.",
          whenProblem: "Folgeschaden übersteigt Kaufpreis weit.",
          whenNegotiate: "Käufer: Erhöhung verlangen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "ausgeschlossen_grob",
          label: "Vollständig ausgeschlossen außer Vorsatz",
          description: "Versuch maximaler Haftungsbegrenzung.",
          risk: "high",
          riskNote: "Unwirksam in AGB für grobe Fahrlässigkeit/Personenschäden (§ 309 Nr. 7 BGB). Klausel-Reduktion möglich, aber riskant.",
          whenProblem: "Klausel kippt; volle Haftung.",
          whenNegotiate: "Vermeiden; realistische Begrenzung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "begrenzt_kaufpreis", ausgewogen: "begrenzt_typisch", durchsetzungsstark: "gesetzlich" }
    },

    // ── 11. Gerichtsstand und anwendbares Recht ──
    {
      key: "jurisdiction",
      title: "Gerichtsstand und anwendbares Recht",
      paragraph: "§ 12",
      description: "§ 38 ZPO — Gerichtsstandsvereinbarung in B2B zulässig; bei B2C grundsätzlich Wohnsitz Verbraucher (§ 29c ZPO). CISG-Ausschluss bei internationalem Kauf prüfen.",
      importance: "medium",
      options: [
        {
          value: "beklagter_sitz",
          label: "Gerichtsstand am Sitz des Beklagten (gesetzlich)",
          description: "§ 12 ZPO Standard.",
          risk: "low",
          riskNote: "Fairste Lösung.",
          whenProblem: "Selten — entspricht gesetzlicher Grundregel.",
          whenNegotiate: "Meist sofort akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "vk_sitz",
          label: "Gerichtsstand am Sitz des Verkäufers",
          description: "VK-freundlich.",
          risk: "medium",
          riskNote: "Bei B2B § 38 ZPO zulässig; bei B2C unwirksam, wenn Verbraucher-Wohnsitz nicht in DE/EU.",
          whenProblem: "Käufer muss anreisen.",
          whenNegotiate: "Käufer: Schiedsgericht oder neutraler Ort.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "kae_sitz",
          label: "Gerichtsstand am Sitz des Käufers",
          description: "Käufer-freundlich.",
          risk: "medium",
          riskNote: "Bei B2B möglich; bei B2C kommt § 29c ZPO ohnehin (Verbraucher-Gerichtsstand).",
          whenProblem: "VK muss anreisen.",
          whenNegotiate: "VK: Schiedsgericht.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "cisg_ausgeschlossen",
          label: "Deutsches Recht + CISG ausgeschlossen",
          description: "'Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts (CISG).'",
          risk: "low",
          riskNote: "Bei internationalem Kauf wichtig — sonst CISG-Anwendung automatisch (Art. 1 CISG).",
          whenProblem: "Wenn nicht ausgeschlossen — andere Mängelregeln (Art. 39 CISG: Rügepflicht binnen 'angemessener Frist', max. 2 Jahre).",
          whenNegotiate: "International: ausdrücklicher Ausschluss empfohlen, sofern beide Parteien deutsches Recht wollen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "vk_sitz", ausgewogen: "beklagter_sitz", durchsetzungsstark: "kae_sitz" }
    }
  ]
};

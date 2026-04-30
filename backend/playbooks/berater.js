// Beratungsvertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Dienstvertrag mit Tätigkeitsschuld nach BGB §§ 611 ff. — mit Honorar, Verschwiegenheit, Scheinselbstständigkeits-Schutz

module.exports = {
  type: "berater",
  title: "Beratungsvertrag (Strategy / Management / Fach-Consulting)",
  description: "Vertrag zwischen Auftraggeber und externem Berater über qualifizierte Beratungsleistungen — Dienstvertrag mit Tätigkeitsschuld, ohne Erfolgsgarantie. Mit Honorar-, Aufklärungs-, Verschwiegenheits-, Haftungs- und Scheinselbstständigkeits-Schutz.",
  icon: "briefcase",
  difficulty: "komplex",
  estimatedTime: "10–15 Minuten",
  legalBasis: "BGB §§ 611 ff. (Dienstvertrag), §§ 280, 281, 311 (Beratungshaftung), BRAO §§ 43a, 51, StBerG, RVG, WPO, SGB IV §§ 7, 7a (Scheinselbstständigkeit), § 203 StGB, DSGVO, LobbyRG, UWG",

  // Rollen-Definition
  roles: {
    A: { key: "auftraggeber", label: "Auftraggeber", description: "Unternehmen, Vorstand, Geschäftsführung oder Privatperson, die externe Beratung sucht" },
    B: { key: "berater", label: "Berater", description: "Selbstständiger Berater (Strategy, Management, IT, Steuer, Recht, Wirtschaftsprüfer)" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Auftraggeber — Detaillierte Beratungspflicht mit Dokumentation, volle Haftung, strikte Verschwiegenheit, Wettbewerbsverbot, klare Selbstständigkeit",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — Klar abgegrenztes Mandat, Stunden-/Tagessatz, Haftungsbegrenzung leichte FL, einfache Nutzungsrechte, gegenseitige Kündigung",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Berater — Honorar nach Aufwand mit Verzugszinsen, Haftung auf Berufshaftpflicht, IP nur an AG nach Vollzahlung, kein Wettbewerbsverbot, eigene Methodik geschützt",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    // Auftraggeber
    { key: "partyA_name", label: "Firmenname (Auftraggeber)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertretungsberechtigt", type: "text", required: false, group: "partyA" },
    { key: "partyA_role", label: "Rolle des Auftraggebers", type: "select", required: true, group: "partyA",
      options: [
        { value: "unternehmer", label: "Unternehmer (B2B)" },
        { value: "verbraucher", label: "Verbraucher (B2C — Widerrufsrecht 14 Tage!)" },
        { value: "oeffentlich", label: "Öffentlicher Auftraggeber (VgV/UVgO prüfen)" }
      ]
    },

    // Berater
    { key: "partyB_name", label: "Vor-/Nachname / Firma (Berater)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Geschäftsanschrift", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_taxNumber", label: "USt-IdNr. / Steuernummer", type: "text", required: true, group: "partyB" },
    { key: "partyB_qualification", label: "Qualifikation / Berufsstand", type: "select", required: true, group: "partyB",
      options: [
        { value: "anwalt", label: "Rechtsanwalt (BRAO, RVG, § 43a Verschwiegenheit)" },
        { value: "steuerberater", label: "Steuerberater (StBerG, StBVV)" },
        { value: "wp", label: "Wirtschaftsprüfer (WPO)" },
        { value: "strategy", label: "Strategy / Management Consultant" },
        { value: "it", label: "IT-/Tech-Consultant" },
        { value: "branche_spezifisch", label: "Branchenspezialist (HR, Marketing, Finance etc.)" },
        { value: "lobby", label: "Public Affairs / Lobby (LobbyRG-Eintrag prüfen!)" },
        { value: "andere", label: "Andere Beratungsdisziplin" }
      ]
    },
    { key: "partyB_haftpflicht", label: "Berufshaftpflicht-Versicherung vorhanden?", type: "select", required: true, group: "partyB",
      options: [
        { value: "ja_min_1mio", label: "Ja, mind. 1 Mio EUR Deckung" },
        { value: "ja_anders", label: "Ja, andere Deckung" },
        { value: "nein", label: "Nein (RISIKO!)" }
      ]
    },
    { key: "partyB_otherClients", label: "Aktuelle Auftragslage", type: "select", required: true, group: "partyB",
      options: [
        { value: "ja_mehrere", label: "Mehrere Mandanten gleichzeitig (Indiz Selbstständigkeit)" },
        { value: "nein_einziger", label: "Einziger Mandant (SCHEINSELBSTSTÄNDIGKEIT-RISIKO!)" }
      ]
    },

    // Mandat
    { key: "scope", label: "Mandatsumfang / Beratungsgegenstand", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Beratung zur Restrukturierung der Vertriebsorganisation, Phase 1: Analyse, Phase 2: Konzept, Phase 3: Umsetzung" },
    { key: "duration", label: "Geplante Mandatsdauer", type: "select", required: true, group: "context",
      options: [
        { value: "einmalig", label: "Einmaliges Mandat / Gutachten" },
        { value: "kurz_3mon", label: "Bis 3 Monate" },
        { value: "6mon", label: "Bis 6 Monate" },
        { value: "12mon", label: "Bis 12 Monate" },
        { value: "retainer_unbefristet", label: "Retainer / Dauerberatung (SCHEINSELBSTSTÄNDIGKEIT-WARNUNG bei Strategy)" }
      ]
    },
    { key: "honorar_modell", label: "Honorarmodell", type: "select", required: true, group: "context",
      options: [
        { value: "stundensatz", label: "Stundensatz" },
        { value: "tagessatz", label: "Tagessatz" },
        { value: "pauschal", label: "Pauschalhonorar / Festpreis" },
        { value: "retainer", label: "Monatlicher Retainer (Fix-Honorar)" },
        { value: "erfolgsbezogen", label: "Erfolgshonorar (bei Anwälten BESCHRÄNKT, § 4a RVG)" }
      ]
    },
    { key: "honorar_betrag", label: "Honorarhöhe netto in EUR", type: "number", required: true, group: "context" },
    { key: "datenschutz_relevant", label: "Werden personenbezogene Daten verarbeitet?", type: "select", required: true, group: "context",
      options: [
        { value: "ja_avv_pflicht", label: "Ja — AVV (Art. 28 DSGVO) zwingend!" },
        { value: "nein", label: "Nein, nur Geschäftsdaten" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — Das Herzstück des Playbooks
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Mandatsumfang und Beratungsleistung ──
    {
      key: "mandate_scope",
      title: "Mandatsumfang und Beratungsleistung",
      paragraph: "§ 2",
      description: "Definiert, was Berater schuldet. Je präziser, desto klarer die Pflichtverletzungs-Grenzen. BGH NJW 2014, 3360: Beratungspflicht erstreckt sich auch auf nicht ausdrücklich gefragte rechtliche Risiken.",
      importance: "critical",
      options: [
        {
          value: "eng_definiert",
          label: "Eng definiertes Mandat mit Zielsetzung",
          description: "Spezifische Aufgabe (z.B. \"Gutachten zur Restrukturierung X bis 30.06.2026\"), klare Out-of-Scope-Regelung.",
          risk: "low",
          riskNote: "Schützt Berater vor Beratungspflichten außerhalb. § 280 BGB-Haftung nur für definierten Bereich.",
          whenProblem: "Wenn AG später behauptet, Berater hätte auch über X informieren müssen — Out-of-Scope-Klausel hilft.",
          whenNegotiate: "AG: Mandat ggf. erweitern.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "umfassend_offen",
          label: "Umfassend-offenes Mandat",
          description: "\"Berater unterstützt AG in allen Fragen der Vertriebsstrategie.\"",
          risk: "high",
          riskNote: "Beratungspflicht-Umfang breit; Haftungsrisiko hoch. BGH-Tendenz: Berater muss umfassend warnen. Bei Strategy-Berater + Eingliederung Scheinselbstständigkeits-Indiz.",
          whenProblem: "Bei Streit über Pflichtumfang. Bei DRV-Prüfung Indiz für Beschäftigung.",
          whenNegotiate: "Berater: präzisieren, scope of work definieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_meilensteinen_doc",
          label: "Eng mit Meilensteinen + Dokumentationspflicht",
          description: "Phasen + Liefergegenstände + schriftliche Tätigkeitsberichte je Phase.",
          risk: "low",
          riskNote: "Optimal für AG; Berater muss dokumentieren. § 666 BGB Auskunftspflicht erfüllt.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Standard für anspruchsvolle Mandate.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "retainer_bereitschaft",
          label: "Retainer mit definierter Bereitschaftsleistung",
          description: "Berater steht X Stunden/Monat zur Verfügung; Inhalte flexibel.",
          risk: "medium",
          riskNote: "Bei Dauerberatung praxistauglich, aber bei festem Stundenkontingent + 1 Mandat: Scheinselbstständigkeits-Risiko.",
          whenProblem: "DRV-Prüfung.",
          whenNegotiate: "Nachweis weiterer Mandanten + freie Disposition.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mit_meilensteinen_doc", ausgewogen: "eng_definiert", durchsetzungsstark: "eng_definiert" }
    },

    // ── 2. Honorar und Zahlungsbedingungen ──
    {
      key: "compensation",
      title: "Honorar und Zahlungsbedingungen",
      paragraph: "§ 3",
      description: "Höhe, Modus, Fälligkeit, Verzugsregeln. Bei Anwälten/Steuerberatern besondere Honorarordnungen (RVG, StBVV) beachten.",
      importance: "critical",
      options: [
        {
          value: "stundensatz_30tage",
          label: "Stundensatz, monatliche Abrechnung, 30 Tage netto",
          description: "Stundenabrechnung mit Tätigkeitsnachweis, monatliche Rechnung.",
          risk: "medium",
          riskNote: "Marktüblich, aber lange Zahlungsfrist belastet Berater-Liquidität. § 286 Abs. 3 BGB Verzug nach 30 Tagen.",
          whenProblem: "Berater: Liquiditätsdruck.",
          whenNegotiate: "Berater: 14 Tage netto + Verzugszinsen 9 % B2B.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "tagessatz_14tage_vorschuss",
          label: "Tagessatz mit Vorschuss + 14 Tage netto",
          description: "30 % Vorschuss bei Mandatsbeginn, Rest 14 Tage nach Schlussrechnung.",
          risk: "low",
          riskNote: "Berater-freundlich; Vorschuss schützt vor Mandantenverzug.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Standard für höhere Mandate.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "pauschal_meilensteine",
          label: "Pauschalhonorar mit Meilenstein-Zahlungen",
          description: "30/40/30 % nach Phasenabnahmen.",
          risk: "low",
          riskNote: "Klar, planbar. Bei Steuerberater nur über StBVV mit schriftlicher Hinweis-Vereinbarung wirksam.",
          whenProblem: "Bei vagen Meilensteinen Streit.",
          whenNegotiate: "Klare Phasen-Trigger.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "erfolgshonorar_strategy",
          label: "Erfolgsbezogenes Honorar (nur Strategy/M&A — bei Anwälten ENG!)",
          description: "Provision/Erfolg + Mindesthonorar. Bei Anwälten nur § 4a RVG (wirtschaftliche Notlage / Streitwert < 2.000 EUR).",
          risk: "high",
          riskNote: "Bei Anwälten fast immer unzulässig (§ 49b BRAO, RVG-Reform). Bei Strategy-/M&A-Beratern zulässig.",
          whenProblem: "Anwalt-Erfolgshonorar nichtig, Honorar reduziert sich auf RVG.",
          whenNegotiate: "Anwalt: kein Erfolgshonorar; Strategy: klare Erfolgsdefinition.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "pauschal_meilensteine", ausgewogen: "stundensatz_30tage", durchsetzungsstark: "tagessatz_14tage_vorschuss" }
    },

    // ── 3. Beratungspflichten und Aufklärung ──
    {
      key: "advisory_duties",
      title: "Beratungspflichten und Aufklärung",
      paragraph: "§ 4",
      description: "Inhaltlicher Umfang der Beratungspflicht. BGH-Rechtsprechung: umfassende Aufklärung über Risiken/Alternativen pflichtgemäß. Dokumentation entscheidend bei Haftungsfall.",
      importance: "critical",
      options: [
        {
          value: "gesetzlich_BGH_standard",
          label: "Gesetzliche Beratungspflicht nach BGH-Standards",
          description: "Berater hat umfassend, möglichst erschöpfend, sachgerecht zu informieren — auch über nicht ausdrücklich gefragte Risiken (BGH NJW 2014, 3360).",
          risk: "medium",
          riskNote: "AG-freundlich. Berater haftet bei jeder Pflichtverletzung. Hoch bei Strategie-/Finanzberatung.",
          whenProblem: "Bei späterem Schaden: BGH-Maßstab gilt.",
          whenNegotiate: "Berater: Berufshaftpflicht zwingend.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "dokumentationspflicht_explizit",
          label: "Standard + ausdrückliche Dokumentationspflicht (Akte, Protokolle)",
          description: "Berater muss alle Beratungsgespräche und -ergebnisse schriftlich dokumentieren und auf Anforderung herausgeben (§ 666, § 667 BGB).",
          risk: "low",
          riskNote: "AG-Schutz maximal; im Streitfall Beweismittel. Aufwand für Berater.",
          whenProblem: "Bei Streit Mandant kann Akte einsehen.",
          whenNegotiate: "Berater: angemessenen Dokumentationsumfang verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "eng_auf_mandat_begrenzt",
          label: "Beratungspflicht eng auf Mandatsumfang begrenzt",
          description: "\"Berater berät ausschließlich zu im Mandat beschriebenem Thema; weitergehende Pflichten ausgeschlossen.\"",
          risk: "medium",
          riskNote: "Berater-freundlich, aber bei AGB ggf. unwirksam (§ 307 BGB unangemessene Benachteiligung), wenn vorhersehbare Risiken nicht angesprochen werden.",
          whenProblem: "Klausel kann bei offensichtlichen Folgewirkungen ausgehöhlt werden — BGH-Pflicht zur Hinweisbelehrung.",
          whenNegotiate: "AG: Klausel nicht zu eng.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "mit_zweitmeinungsempfehlung",
          label: "Standard + Pflicht zur Empfehlung Zweitmeinung bei Großprojekten",
          description: "Bei Mandaten > 100.000 EUR Schaden-Potential: Berater empfiehlt schriftlich Zweitmeinung.",
          risk: "low",
          riskNote: "Schützt beide; AG bekommt Bestätigung, Berater begrenzt Haftung.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlene Best Practice.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "dokumentationspflicht_explizit", ausgewogen: "gesetzlich_BGH_standard", durchsetzungsstark: "eng_auf_mandat_begrenzt" }
    },

    // ── 4. Haftung und Berufshaftpflicht ──
    {
      key: "liability",
      title: "Haftung und Berufshaftpflicht",
      paragraph: "§ 5",
      description: "§ 309 Nr. 7 BGB: Vorsatz/grobe Fahrlässigkeit/Personenschäden in AGB nicht ausschließbar. Pflicht-Berufshaftpflichten: Anwälte 250.000 EUR (BRAO § 51), Steuerberater 250.000 EUR (StBerG § 67), Wirtschaftsprüfer 1 Mio EUR (WPO § 54).",
      importance: "critical",
      options: [
        {
          value: "gesetzlich_voll",
          label: "Volle gesetzliche Haftung ohne Begrenzung",
          description: "BGB-Standard, alle Verschuldensgrade.",
          risk: "medium",
          riskNote: "AG-freundlich, Berater-Risiko unkalkulierbar.",
          whenProblem: "Großschaden ruiniert Berater.",
          whenNegotiate: "Berater: Begrenzung leichte Fahrlässigkeit.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "begrenzt_auf_haftpflicht_deckung",
          label: "Volle Haftung Vorsatz/grobe FL, leichte FL begrenzt auf Berufshaftpflicht-Deckung (z.B. 1 Mio EUR)",
          description: "§ 309 Nr. 7 BGB-konform. Marktstandard bei Beratern.",
          risk: "low",
          riskNote: "Branchenüblich. AG hat Versicherungsdeckung als Sicherheit.",
          whenProblem: "Bei Schaden über Deckung — Streit.",
          whenNegotiate: "Beide: Deckungssumme ausreichend wählen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "mit_haftpflicht_pflicht_und_nachweis",
          label: "Volle Haftung + Berufshaftpflicht-Pflicht mit Nachweis 1 Mio EUR",
          description: "Berater muss Police inkl. Bestätigungsschreiben bei Mandatsbeginn vorlegen.",
          risk: "low",
          riskNote: "Optimal AG. Bei Anwälten/StB Pflicht; bei Strategy oft erstmals geregelt.",
          whenProblem: "Bei Versicherungslücke (z.B. Tätigkeit außerhalb Police-Bereich) — Berater haftet selbst.",
          whenNegotiate: "Berater: Police-Inhalte prüfen, ggf. erweitern.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "begrenzt_auf_honorar_3fach",
          label: "Haftung begrenzt auf 3-faches Jahreshonorar",
          description: "Bei kleinen Mandaten Berater-freundlich.",
          risk: "high",
          riskNote: "In AGB problematisch wenn Jahres-Honorar gering und Schaden hoch — § 307 BGB unangemessene Benachteiligung. BGH-Tendenz: bei groben Pflichtverletzungen unwirksam.",
          whenProblem: "Klausel kippt teilweise bei großem Schaden / kleinem Honorar.",
          whenNegotiate: "AG: höhere Mindestgrenze (z.B. 100.000 EUR Sockel).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mit_haftpflicht_pflicht_und_nachweis", ausgewogen: "begrenzt_auf_haftpflicht_deckung", durchsetzungsstark: "begrenzt_auf_haftpflicht_deckung" }
    },

    // ── 5. Verschwiegenheit und Datenschutz ──
    {
      key: "confidentiality",
      title: "Verschwiegenheit und Datenschutz",
      paragraph: "§ 6",
      description: "Verschwiegenheitspflicht — bei Berufsgeheimnisträgern strafbewehrt (§ 203 StGB). DSGVO Art. 28 AVV bei pers. Daten zwingend.",
      importance: "critical",
      options: [
        {
          value: "standard_3jahre",
          label: "Gegenseitige Verschwiegenheit 3 Jahre nachvertraglich",
          description: "Beide schützen vertrauliche Informationen 3 Jahre.",
          risk: "low",
          riskNote: "Marktüblich.",
          whenProblem: "Selten.",
          whenNegotiate: "Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "streng_5jahre_strafe",
          label: "Berater einseitig, 5 Jahre, Vertragsstrafe 25.000 EUR pro Verstoß",
          description: "Berater allein gebunden, lange Frist, Strafabschreckung.",
          risk: "medium",
          riskNote: "§ 343 BGB-Reduktionsrisiko bei unverhältnismäßiger Höhe. § 309 Nr. 6 BGB beachten (AGB).",
          whenProblem: "Strafe reduziert.",
          whenNegotiate: "Berater: gegenseitig + maßvolle Strafe.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "203_stgb_explizit_avv",
          label: "Bezugnahme § 203 StGB + DSGVO-AVV als Anlage",
          description: "Berufsgeheimnisträger-Standard + AVV bei pers. Daten.",
          risk: "low",
          riskNote: "Pflichtumfang vollständig.",
          whenProblem: "Selten.",
          whenNegotiate: "Bei AGB mit Datenkontakt zwingend.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "unbefristet",
          label: "Unbefristete Verschwiegenheit",
          description: "Geheimhaltungspflicht endet nie.",
          risk: "high",
          riskNote: "Bei AGB ggf. unwirksam wegen unangemessener Benachteiligung (§ 307 BGB). BGH-Tendenz: max. 5–7 Jahre angemessen.",
          whenProblem: "Klausel kippt; auf angemessene Dauer reduziert.",
          whenNegotiate: "Praktisch nur bei echten Geschäftsgeheimnissen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "203_stgb_explizit_avv", ausgewogen: "standard_3jahre", durchsetzungsstark: "standard_3jahre" }
    },

    // ── 6. Interessenkonflikte und Wettbewerbsverbot ──
    {
      key: "conflict_competition",
      title: "Interessenkonflikte und Wettbewerbsverbot",
      paragraph: "§ 7",
      description: "BGH NJW 2018, 459: Bei Interessenkonflikt Honorarverlust + Schadensersatz. Wettbewerbsverbot bei Selbstständigen kein § 74 HGB; sachlich/zeitlich/räumlich begrenzt zumutbar (Art. 12 GG).",
      importance: "high",
      options: [
        {
          value: "keine_klausel",
          label: "Keine spezielle Klausel",
          description: "Berufsrechtliche Regelungen reichen aus.",
          risk: "medium",
          riskNote: "Nur bei Berufsgeheimnisträgern (BRAO § 43a) ausreichend. Bei Strategy-Beratern: AG-Schutz fehlt.",
          whenProblem: "AG: Konflikt mit Konkurrenz-Mandat.",
          whenNegotiate: "AG: Mindest-Klausel ergänzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "kein_konkurrenzmandat_dauer",
          label: "Kein Konkurrenz-Mandat während Mandatslaufzeit",
          description: "Berater darf während Mandat keine direkten Konkurrenten beraten.",
          risk: "low",
          riskNote: "Marktüblich, AG-Standardschutz.",
          whenProblem: "Bei nicht klar definiertem \"Konkurrent\".",
          whenNegotiate: "Klare Liste konkurrierender Unternehmen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "wettbewerbsverbot_12mon_karenz",
          label: "12 Monate Wettbewerbsverbot nach Mandatsende mit Karenzentschädigung 50 %",
          description: "Volles Wettbewerbsverbot mit Karenz. § 74 HGB analog (nicht direkt anwendbar bei Selbstständigen, aber Karenz schützt vor Sittenwidrigkeit).",
          risk: "medium",
          riskNote: "Ohne Karenz oft sittenwidrig (§ 138 BGB) bei wesentlicher Berufsausübungs-Einschränkung. Mit Karenz wirksam.",
          whenProblem: "Bei zu weiter räumlich/sachlicher Reichweite.",
          whenNegotiate: "Beide: Reichweite präzise begrenzen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "kundenschutz_6mon_aktiv",
          label: "6 Monate aktive Kundenabwerbung verboten, kein Wettbewerbsverbot",
          description: "Berater darf Konkurrenten beraten, aber AG-Kunden 6 Monate nicht aktiv abwerben.",
          risk: "low",
          riskNote: "Berater-freundlich, fairer Kompromiss.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlener Standard für Strategy.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "wettbewerbsverbot_12mon_karenz", ausgewogen: "kein_konkurrenzmandat_dauer", durchsetzungsstark: "keine_klausel" }
    },

    // ── 7. Nutzungsrechte an Beratungsergebnissen (IP) ──
    {
      key: "ip_rights",
      title: "Nutzungsrechte an Beratungsergebnissen (IP)",
      paragraph: "§ 8",
      description: "UrhG § 31 Zweckübertragungslehre — im Zweifel verbleiben Rechte beim Urheber. Bei Beratungsergebnissen (Studien, Konzepte, Tools) Rechtsfrage zwingend.",
      importance: "high",
      options: [
        {
          value: "einfaches_recht_zweckgebunden",
          label: "AG erhält einfaches Nutzungsrecht für Mandatszweck",
          description: "Berater behält Methodik + Vorlagen, AG nutzt Beratungsergebnis nur intern für vereinbarten Zweck.",
          risk: "medium",
          riskNote: "Berater-freundlich. AG kann Konzept nicht weiterverkaufen / öffentlich machen.",
          whenProblem: "AG: kein Lizenzgeschäft mit Beratungsergebnis möglich.",
          whenNegotiate: "AG: Bearbeitungsrecht für interne Anpassungen verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "ausschliessliches_recht_zweck",
          label: "Ausschließliches Nutzungsrecht für Mandatszweck, ohne Bearbeitung",
          description: "Exklusiv für AG-Zweck, Bearbeitungsrechte bei Berater.",
          risk: "low",
          riskNote: "Marktstandard für Beratungsmandate. § 32 UrhG angemessene Vergütung.",
          whenProblem: "Wenn AG Bearbeitung will.",
          whenNegotiate: "Bearbeitungsrecht zusätzlich verhandeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "umfassendes_recht_inkl_bearbeitung",
          label: "Umfassendes ausschließliches Recht inkl. Bearbeitung + Übertragung an Dritte",
          description: "Wirtschaftliche IP-Vollübertragung; Berater behält Persönlichkeitsrechte (§ 13 UrhG).",
          risk: "medium",
          riskNote: "Im Honorar muss \"angemessene Vergütung\" für umfassende Rechte enthalten sein (§ 32 UrhG). Sonst Nachforderung möglich.",
          whenProblem: "Berater kann § 32 UrhG-Nachforderung stellen, wenn Honorar nicht angemessen.",
          whenNegotiate: "Berater: 30–50 % Aufschlag fordern.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "methodik_geschuetzt_ergebnis_AG",
          label: "Methodik/Tools beim Berater, Ergebnis-IP beim AG",
          description: "Berater behält Werkzeuge/Frameworks, AG erhält Ergebnis-Dokument exklusiv.",
          risk: "low",
          riskNote: "Faire Trennung — branchenüblich bei Strategy-Consulting.",
          whenProblem: "Selten Streit bei klarer Trennung.",
          whenNegotiate: "Klare Definition was \"Methodik\" und was \"Ergebnis\".",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "umfassendes_recht_inkl_bearbeitung", ausgewogen: "ausschliessliches_recht_zweck", durchsetzungsstark: "einfaches_recht_zweckgebunden" }
    },

    // ── 8. Vertragsdauer und Kündigung ──
    {
      key: "term_termination",
      title: "Vertragsdauer und Kündigung",
      paragraph: "§ 9",
      description: "§ 627 BGB: Bei Diensten höherer Art jederzeit ohne wichtigen Grund kündbar. § 626 BGB: außerordentlich aus wichtigem Grund. Bei Verbraucher-Mandaten: 14 Tage Widerrufsrecht (§ 312g BGB).",
      importance: "high",
      options: [
        {
          value: "gesetzlich_627_626",
          label: "Gesetzliche Regelung (§§ 627, 626, 628 BGB)",
          description: "Beide jederzeit ordentlich kündbar bei Vertrauensverhältnis; außerordentlich aus wichtigem Grund. § 628: Vergütung nur bis Kündigung.",
          risk: "low",
          riskNote: "BGB-Default; Berater-Mandanten-Verhältnis ist Vertrauensvertrag.",
          whenProblem: "Bei Kündigung mitten in Phase: Streit über erbrachte Leistung.",
          whenNegotiate: "Klare Aufmaßregeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "feste_laufzeit_kein_627",
          label: "Feste Laufzeit, § 627 BGB ausgeschlossen",
          description: "Mandat bis Ende; vorzeitige Kündigung nur außerordentlich.",
          risk: "medium",
          riskNote: "AG-freundlich (Planungssicherheit), aber bei Verbraucher § 627 BGB nicht abdingbar (BGH NJW 2010, 1520). Bei Strategy-Berater + 1 AG: SV-Risiko.",
          whenProblem: "Bei B2C unwirksam.",
          whenNegotiate: "Nur B2B sinnvoll.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "monatlich_4wochen_beidseitig",
          label: "Monatlich kündbar, 4 Wochen Frist beidseitig",
          description: "Faire Balance, planbar.",
          risk: "low",
          riskNote: "Marktüblich für Retainer-Mandate.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlener Standard.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_widerrufsbelehrung_b2c",
          label: "B2C-Mandat: Standard + 14 Tage Widerrufsrecht (§ 312g BGB)",
          description: "Verbraucher kann 14 Tage widerrufen; Belehrung zwingend.",
          risk: "low",
          riskNote: "Pflicht bei B2C. Fehlende Belehrung: 1 Jahr + 14 Tage Widerrufsfrist.",
          whenProblem: "Berater: bei fehlerhafter Belehrung lange Widerrufsfrist.",
          whenNegotiate: "Standard-Belehrung verwenden.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mit_widerrufsbelehrung_b2c", ausgewogen: "gesetzlich_627_626", durchsetzungsstark: "gesetzlich_627_626" }
    },

    // ── 9. Selbstständigkeitsklausel (Scheinselbstständigkeit) ──
    {
      key: "independence",
      title: "Selbstständigkeitsklausel (Scheinselbstständigkeit)",
      paragraph: "§ 10",
      description: "Bei Beratern (besonders Strategy/Management bei einem AG) hohes Scheinselbstständigkeits-Risiko. BSG Herrenberg-Urteil (B 12 R 3/20 R) und BSG B 12 R 15/21 R — Eingliederung wiegt schwer.",
      importance: "critical",
      options: [
        {
          value: "keine",
          label: "Keine Selbstständigkeitsklausel",
          description: "Vertrag enthält keine ausdrücklichen Indikatoren.",
          risk: "high",
          riskNote: "Hohe Beweislast bei DRV-Prüfung.",
          whenProblem: "Bei Eingliederung — Beschäftigungs-Annahme.",
          whenNegotiate: "Beide: Klausel ist Standard.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "standard_klausel",
          label: "Standard-Selbstständigkeitsklausel",
          description: "\"Berater ist selbstständig. Berechtigt für andere AG tätig zu werden. Trägt eigenes unternehmerisches Risiko, eigene Steuern, nicht eingegliedert.\"",
          risk: "low",
          riskNote: "Standard-Wording, gerichtsfest als Indiz. Aber: tatsächliche Durchführung entscheidet (Herrenberg-Urteil).",
          whenProblem: "Klausel allein hilft nicht bei abweichender Praxis.",
          whenNegotiate: "Akzeptabel; ggf. Konkretisierungen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "mit_statusfeststellung_pflicht",
          label: "Standard + verpflichtende Statusfeststellung (§ 7a SGB IV)",
          description: "Berater verpflichtet sich, innerhalb 4 Wochen Statusfeststellungsverfahren bei DRV einzuleiten; AG kann bei festgestellter abh. Beschäftigung kündigen.",
          risk: "low",
          riskNote: "Maximale Rechtssicherheit; aufschiebende Wirkung gegen Beitragsforderung bei rechtzeitigem Antrag.",
          whenProblem: "Wenn Berater Verfahren ablehnt — Vertragsverletzung.",
          whenNegotiate: "Kostenfrage klären.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_indizienkatalog",
          label: "Standard + ausführlicher Indizienkatalog",
          description: "Eigene Betriebsstätte, eigenes Equipment, freie Zeiteinteilung, mehrere AG, kein AN-Equivalent (Urlaub, Lohnfortzahlung).",
          risk: "low",
          riskNote: "Sehr starker Indiz-Katalog. Konkretisiert Selbstständigkeit.",
          whenProblem: "Bei abweichender Realität — Klausel kann sich gegen AG wenden (\"vorsätzlich getäuscht\").",
          whenNegotiate: "Beide: realitätstreu formulieren.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mit_statusfeststellung_pflicht", ausgewogen: "standard_klausel", durchsetzungsstark: "standard_klausel" }
    },

    // ── 10. Schlussbestimmungen ──
    {
      key: "final_provisions",
      title: "Schlussbestimmungen",
      paragraph: "§ 11",
      description: "Schriftform für Änderungen, salvatorisch, Gerichtsstand, anwendbares Recht. Bei B2C: Verbrauchergerichtsstand zwingend (§ 29 ZPO).",
      importance: "medium",
      options: [
        {
          value: "minimal_beklagter",
          label: "Salvatorisch + Gerichtsstand Sitz Beklagter + dt. Recht",
          description: "Faire Default-Lösung.",
          risk: "low",
          riskNote: "§ 12 ZPO Standard.",
          whenProblem: "Selten.",
          whenNegotiate: "Akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "gerichtsstand_ag",
          label: "Gerichtsstand am Sitz des AG",
          description: "Vorteilhaft für AG.",
          risk: "medium",
          riskNote: "B2B zulässig (§ 38 ZPO). Bei B2C unzulässig (§ 29 ZPO).",
          whenProblem: "Berater: Anreise.",
          whenNegotiate: "Berater: Sitz Berater oder Schiedsklausel.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "dis_schiedsklausel",
          label: "DIS-Schiedsgerichtsbarkeit",
          description: "Streitigkeiten vor DIS-Schiedsgericht.",
          risk: "medium",
          riskNote: "Schnell, vertraulich, teuer. § 1031 ZPO Schriftform.",
          whenProblem: "Bei niedrigen Streitwerten unverhältnismäßig teuer.",
          whenNegotiate: "Nur bei großen Mandaten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mediation_then_court",
          label: "Mediations-Klausel vor Klage",
          description: "Streitigkeiten erst Mediation, dann Klage am Sitz Beklagter.",
          risk: "low",
          riskNote: "Schonende, vertrauensbasierte Streitbeilegung.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Best Practice für Vertrauensmandate.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "gerichtsstand_ag", ausgewogen: "minimal_beklagter", durchsetzungsstark: "minimal_beklagter" }
    }
  ]
};

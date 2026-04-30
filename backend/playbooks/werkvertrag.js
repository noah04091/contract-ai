// Werkvertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Erfolgsschuld nach BGB §§ 631-651 — mit Abnahme, Mängelrechten, Sicherheiten

module.exports = {
  type: "werkvertrag",
  title: "Werkvertrag (BGB §§ 631-651)",
  description: "Vertrag über die Herstellung eines konkreten Werkes (z.B. Bau, Anlage, Studie, Gewerk) — geschuldet ist der Erfolg, nicht die Tätigkeit. Mit Abnahme, Mängelrechten, Vergütungsfälligkeit und Sicherheiten.",
  icon: "hammer",
  difficulty: "komplex",
  estimatedTime: "12–18 Minuten",
  legalBasis: "BGB §§ 631-651, §§ 650a-h (Bauvertrag), §§ 650i-n (Verbraucherbauvertrag), § 650f (Bauhandwerkersicherung), VOB/B, SchwarzArbG, ProdHaftG",

  // Rollen-Definition
  roles: {
    A: { key: "besteller", label: "Besteller / Auftraggeber", description: "Auftraggeber des Werkes (privater Bauherr, Industriekunde, Forschungsauftraggeber)" },
    B: { key: "unternehmer", label: "Unternehmer / Auftragnehmer", description: "Hersteller des Werkes (Handwerker, Bauunternehmen, Ingenieurbüro, IT-Werkschuldner)" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Besteller — Festpreis ohne Nachträge, klare Abnahmekriterien, hohe UN-Sicherheiten, lange Mängelverjährung",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — Detail-Pauschal- oder Einheitspreisvertrag, BGB-Mängelrechte, gegenseitige Sicherheiten",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Unternehmer — Stundenlohn / Pauschal mit Anpassungsklausel, § 650f-Sicherung, beschränkte Mängelrechte, Haftungsbegrenzung",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    // Besteller
    { key: "partyA_name", label: "Name / Firma (Besteller / Auftraggeber)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Anschrift", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertretungsberechtigt", type: "text", required: false, group: "partyA" },
    { key: "partyA_role", label: "Rolle des Bestellers", type: "select", required: true, group: "partyA",
      options: [
        { value: "verbraucher", label: "Verbraucher (privater Bauherr) — § 13 BGB, Verbraucherschutz aktiv!" },
        { value: "unternehmer", label: "Unternehmer (B2B)" },
        { value: "oeffentlicher_ag", label: "Öffentlicher Auftraggeber (VOB-Pflicht prüfen!)" }
      ]
    },

    // Unternehmer
    { key: "partyB_name", label: "Name / Firma (Unternehmer / Auftragnehmer)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Geschäftsanschrift", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_taxNumber", label: "USt-IdNr. / Steuernummer", type: "text", required: true, group: "partyB" },
    { key: "partyB_legalForm", label: "Rechtsform", type: "select", required: true, group: "partyB",
      options: [
        { value: "einzelunternehmer", label: "Einzelunternehmer / Handwerksbetrieb" },
        { value: "gmbh", label: "GmbH / UG" },
        { value: "ag", label: "AG / SE" },
        { value: "gbr_ohg_kg", label: "GbR / OHG / KG" }
      ]
    },
    { key: "partyB_handwerksrolle", label: "Eintragung Handwerksrolle / Industrieregister", type: "text", required: false, group: "partyB" },

    // Vertragskontext
    { key: "werk_typ", label: "Art des Werkes", type: "select", required: true, group: "context",
      options: [
        { value: "bau_neubau", label: "Bauwerk — Neubau (Verbraucherbauvertrag prüfen!)" },
        { value: "bau_umbau", label: "Bauwerk — Umbau / Sanierung" },
        { value: "bau_einzelgewerk", label: "Einzelgewerk (Maler, Sanitär, Elektro etc.)" },
        { value: "anlage_maschine", label: "Industrielle Anlage / Maschine" },
        { value: "studie_gutachten", label: "Studie / Gutachten / Konzept" },
        { value: "software_werk", label: "Software-Erstellung mit Werkcharakter" },
        { value: "sonstiges", label: "Sonstiges Werk" }
      ]
    },
    { key: "werk_beschreibung", label: "Werksbeschreibung / Leistungssoll", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Herstellung einer 80m² Bürofläche inkl. Trockenbau, Bodenbelag, Elektro nach Plan vom 15.04.2026" },
    { key: "verguetung_modell", label: "Vergütungsmodell", type: "select", required: true, group: "context",
      options: [
        { value: "pauschal", label: "Pauschalpreis (Festpreis)" },
        { value: "detail_pauschal", label: "Detail-Pauschalpreis (auf LV-Basis)" },
        { value: "einheitspreis", label: "Einheitspreisvertrag (Aufmaß)" },
        { value: "stundenlohn", label: "Stundenlohn / Aufwand + Material (Cost-Plus)" },
        { value: "gmp", label: "Garantierter Maximalpreis (GMP)" }
      ]
    },
    { key: "verguetung_betrag", label: "Vergütung netto in EUR", type: "number", required: true, group: "context" },
    { key: "fertigstellungstermin", label: "Vereinbarter Fertigstellungstermin", type: "date", required: true, group: "context" },
    { key: "vob_einbeziehung", label: "VOB/B einbeziehen?", type: "select", required: true, group: "context",
      options: [
        { value: "nein", label: "Nein — reines BGB-Werkvertragsrecht" },
        { value: "ja_b2b", label: "Ja — VOB/B als Ganzes (nur empfehlenswert bei B2B)" },
        { value: "ja_modifiziert", label: "Ja — VOB/B modifiziert (AGB-Risiko bei Verbraucher!)" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — Das Herzstück des Playbooks
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Leistungsumfang und Werkbeschreibung ──
    {
      key: "scope_of_work",
      title: "Leistungsumfang und Werkbeschreibung",
      paragraph: "§ 2",
      description: "Definiert das geschuldete Werk. Je präziser, desto weniger Streit über Mehrleistungen, Mängel und Abnahmekriterien.",
      importance: "critical",
      options: [
        {
          value: "summarisch",
          label: "Summarische Beschreibung",
          description: "\"UN errichtet ein Einfamilienhaus nach Plan.\" Kurz, ohne Anlagen, ohne LV.",
          risk: "high",
          riskNote: "Bei Streit über \"Was war geschuldet?\" oft Mehrkosten und Mangelvorwürfe. BGH vom 20.08.2009 — VII ZR 212/07: Pauschalpreis schließt nur das ein, was Vertragsgegenstand war.",
          whenProblem: "Wenn UN sagt \"war nicht beauftragt\" und BE \"war doch klar\" — Streit über Vertragssoll.",
          whenNegotiate: "Beide: detaillierte Anlage erstellen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "detail_lv",
          label: "Detailliertes Leistungsverzeichnis",
          description: "LV mit Positionen, Mengen, Material, Norm-Verweisen (DIN, ATV); Pläne als Anlage.",
          risk: "low",
          riskNote: "Goldstandard — wenig Streitpotenzial, klare Abrechnung.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlene Form für jedes größere Werk.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "funktional",
          label: "Funktionale Leistungsbeschreibung",
          description: "\"UN errichtet ein voll funktionsfähiges Bürogebäude für 50 Arbeitsplätze nach Energieeffizienzklasse A.\" Fokus auf Erfolg, Mittel offen.",
          risk: "medium",
          riskNote: "UN trägt Planungsrisiko (gut für BE), aber Kalkulationsrisiko hoch. Streit über Nacherfüllung wenn Erfolg unklar.",
          whenProblem: "Bei abweichendem Erfolgsverständnis.",
          whenNegotiate: "UN: Mindestausstattung als Anlage definieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "agile",
          label: "Agile / iterative Werkbeschreibung",
          description: "Rahmenbeschreibung + Iterationen, Sprints, Definition-of-Done. Häufig bei Software-Werkvertrag.",
          risk: "medium",
          riskNote: "Werkvertragsrecht passt schlecht zu agilen Modellen — Abnahme und Mängelrechte unklar. BGH-Tendenz: Hybrid-Vertrag.",
          whenProblem: "Wenn nicht klar ist, was am Ende abnahmefähig ist.",
          whenNegotiate: "Klare Iterationsabnahmen + Endabnahme definieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "detail_lv", ausgewogen: "detail_lv", durchsetzungsstark: "funktional" }
    },

    // ── 2. Vergütung und Zahlungsplan ──
    {
      key: "compensation",
      title: "Vergütung und Zahlungsplan",
      paragraph: "§ 3",
      description: "Höhe, Vergütungsmodell, Abschlagszahlungen, Schlusszahlung. § 632a BGB (Abschläge), § 650m (Verbraucherbauvertrag: max. 90 % vor Abnahme).",
      importance: "critical",
      options: [
        {
          value: "pauschal_zahlung_nach_abnahme",
          label: "Pauschalpreis, vollständige Zahlung erst nach Abnahme",
          description: "Keine Abschläge, vollständige Vergütung nach Abnahme.",
          risk: "medium",
          riskNote: "BE-freundlich, UN trägt volles Vorfinanzierungsrisiko. Bei großen Projekten unrealistisch — UN wird Sicherheit nach § 650f BGB fordern.",
          whenProblem: "UN: Insolvenzrisiko bei Vorfinanzierung.",
          whenNegotiate: "UN: Mindestens 30/40/30-Aufteilung verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "pauschal_meilensteine_30_40_30",
          label: "Pauschalpreis mit Meilenstein-Abschlägen (30/40/30)",
          description: "30 % bei Vertragsschluss, 40 % bei Rohbau-Fertigstellung, 30 % nach Abnahme.",
          risk: "low",
          riskNote: "Ausgewogen, Marktstandard. § 632a BGB konform. Bei Verbraucherbauvertrag § 650m beachten (max. 90 % vor Abnahme).",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlen als fairer Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "einheitspreis_aufmass_monatlich",
          label: "Einheitspreis, monatliche Abrechnung nach Aufmaß",
          description: "Mengen × Preise, monatliches Aufmaß, 14 Tage Zahlungsziel.",
          risk: "low",
          riskNote: "Klassisch im Bau, wenig Streit. § 286 Abs. 3 BGB: Verzug nach 30 Tagen.",
          whenProblem: "Bei strittigem Aufmaß.",
          whenNegotiate: "Klare Aufmaßregeln vereinbaren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "stundenlohn_woechentlich",
          label: "Stundenlohn, wöchentliche Abrechnung",
          description: "Aufwand + Material, wöchentliche Rechnung, 7 Tage Zahlungsziel.",
          risk: "medium",
          riskNote: "UN-freundlich, BE trägt offenes Risiko.",
          whenProblem: "BE: keine Kostenkontrolle bei großen Mengen.",
          whenNegotiate: "BE: Kostenkappung oder GMP verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "pauschal_zahlung_nach_abnahme", ausgewogen: "pauschal_meilensteine_30_40_30", durchsetzungsstark: "stundenlohn_woechentlich" }
    },

    // ── 3. Abnahme ──
    {
      key: "acceptance",
      title: "Abnahme",
      paragraph: "§ 4",
      description: "Das zentrale Ereignis im Werkvertragsrecht. § 640 BGB. Löst Vergütungsfälligkeit, Beweislastumkehr, Verjährungsbeginn aus.",
      importance: "critical",
      options: [
        {
          value: "foermlich_protokoll",
          label: "Förmliche Abnahme mit Protokoll",
          description: "Persönliche Begehung, schriftliches Abnahmeprotokoll mit Mängelvorbehalt, Unterschrift beider Parteien.",
          risk: "low",
          riskNote: "Goldstandard, Marktstandard im Bau.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Empfohlen für jedes größere Werk.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "fiktive_12_werktage",
          label: "Fiktive Abnahme nach 12 Werktagen ohne Mängelrüge",
          description: "UN setzt Frist zur Abnahme; bei BE-Schweigen Werk gilt als abgenommen (§ 640 Abs. 2).",
          risk: "medium",
          riskNote: "UN-freundlich. Bei B2C: Hinweis auf Folge zwingend! Sonst keine Wirkung der fiktiven Abnahme.",
          whenProblem: "Wenn BE legitime Mängelrüge hatte aber nicht rechtzeitig erklärte.",
          whenNegotiate: "BE: Frist verlängern, Hinweispflicht prüfen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "teilabnahmen",
          label: "Teilabnahmen für abgrenzbare Werkteile",
          description: "Abnahme einzelner Bauabschnitte (z.B. Rohbau, Ausbau, Außenanlagen) mit jeweiliger Vergütungsfälligkeit.",
          risk: "low",
          riskNote: "UN-freundlich (frühe Liquidität), aber Verjährungsbeginn pro Teil getrennt.",
          whenProblem: "Wenn Teile später beim Zusammenspiel mit Folgegewerken Mängel zeigen — Zuordnung schwierig.",
          whenNegotiate: "Klare Abgrenzung der Werkteile.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "nur_endabnahme_BE_genehmigt",
          label: "Endabnahme nur mit ausdrücklicher BE-Genehmigung",
          description: "UN muss BE schriftlich um Abnahme bitten, BE muss aktiv zustimmen. Keine fiktive Abnahme.",
          risk: "high",
          riskNote: "BE-freundlich extrem, aber UN-Risiko: keine Vergütungsfälligkeit ohne BE-Mitwirken. § 640 Abs. 2 wird abbedungen — bei Verbraucherbauvertrag ggf. unwirksam (§ 650o BGB).",
          whenProblem: "UN: Vergütung hängt allein von BE-Willen ab.",
          whenNegotiate: "UN: Fiktivabnahme nach Fristsetzung als Mindestrückfallebene.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "foermlich_protokoll", ausgewogen: "foermlich_protokoll", durchsetzungsstark: "fiktive_12_werktage" }
    },

    // ── 4. Mängelrechte und Gewährleistung ──
    {
      key: "defect_rights",
      title: "Mängelrechte und Gewährleistung",
      paragraph: "§ 5",
      description: "§ 634 BGB. Verjährung § 634a (5 Jahre Bauwerk, 2 Jahre Sache). Rangfolge: Nacherfüllung → Selbstvornahme → Rücktritt/Minderung → Schadensersatz.",
      importance: "critical",
      options: [
        {
          value: "gesetzlich_5j_bau",
          label: "Gesetzliche Mängelrechte, 5 Jahre Bauwerk / 2 Jahre Sache",
          description: "Volle BGB-Gewährleistung, keine Beschränkung. Vorrang Nacherfüllung (UN-Wahlrecht zwischen Nachbesserung/Neuherstellung).",
          risk: "low",
          riskNote: "BE-freundlich, BGB-Default. § 634a Verjährung. BGH VII ZR 112/24: kein \"neu für alt\"-Abzug.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlener Standard.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "vob_b_4j",
          label: "VOB/B-Mängelrechte (4 Jahre Bauwerk)",
          description: "§ 13 VOB/B mit kürzerer Verjährung (4 Jahre Bauwerk, 2 Jahre Wartungs-/Maschinenleistungen).",
          risk: "medium",
          riskNote: "UN-freundlich (kürzere Verjährung). VOB/B muss \"als Ganzes\" einbezogen werden, sonst AGB-Kontrolle. Bei B2C oft unwirksam (BGH VII ZR 49/19).",
          whenProblem: "Bei Privatkunde — Klausel kippt.",
          whenNegotiate: "Nur bei B2B mit beidseitiger VOB-Praxis.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "nacherfuellung_prioritaet_2j",
          label: "Strikte Nacherfüllungs-Priorität, 2 Jahre Bauwerk",
          description: "Mängelrechte nur nach erfolgloser Nacherfüllung (mit angemessener Frist + 2 Versuchen). Verjährung verkürzt auf 2 Jahre.",
          risk: "high",
          riskNote: "In AGB unwirksam für Bauwerke (§ 309 Nr. 8b BGB — Verkürzung Verjährung) und Verbraucher (§ 476 BGB). § 309 Nr. 8: pauschale Verkürzung im AGB unwirksam.",
          whenProblem: "Klausel kippt; gesetzliche Verjährung greift.",
          whenNegotiate: "UN: keine Verkürzung in AGB möglich.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "kostenvorschuss_explizit",
          label: "BGB-Standard + ausdrücklicher Kostenvorschussanspruch",
          description: "Volle Mängelrechte + § 637-Kostenvorschuss explizit benannt. BGH VII ZR 68/22: Vorschuss + Minderung kombinierbar.",
          risk: "low",
          riskNote: "BE-freundlich, klar dokumentiert.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfehlenswert für anspruchsvolle BE.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "kostenvorschuss_explizit", ausgewogen: "gesetzlich_5j_bau", durchsetzungsstark: "vob_b_4j" }
    },

    // ── 5. Sicherheitsleistungen ──
    {
      key: "security",
      title: "Sicherheitsleistungen",
      paragraph: "§ 6",
      description: "Bauhandwerkersicherung § 650f BGB (UN-Sicherung), Vertragserfüllungs-/Gewährleistungsbürgschaften (BE-Sicherung).",
      importance: "high",
      options: [
        {
          value: "keine_sicherheiten",
          label: "Keine Sicherheitsleistungen",
          description: "Beide Parteien tragen Erfüllungsrisiko ohne Bürgschaften.",
          risk: "high",
          riskNote: "Bei UN-Insolvenz: BE verliert Anzahlungen. Bei BE-Insolvenz: UN-Vergütung ausfallen.",
          whenProblem: "Standardproblem bei finanzieller Schieflage.",
          whenNegotiate: "Beide: § 650f-Sicherung sicher fordern.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "nur_bauhandwerkersicherung_650f",
          label: "Nur § 650f-Sicherung für UN",
          description: "UN kann Sicherheit über Vergütung + 10 % verlangen, BE liefert Bürgschaft/Hinterlegung binnen Frist.",
          risk: "low",
          riskNote: "UN-Standardabsicherung. § 650f Abs. 5: bei Verweigerung Kündigungsrecht UN, Vergütung bleibt. § 650f Abs. 6 Nr. 2: nicht bei Verbraucherbauvertrag.",
          whenProblem: "BE: Bürgschaftskosten (0,5–2 % p.a.).",
          whenNegotiate: "BE bei Verbraucherbauvertrag: nicht anwendbar.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "gegenseitig_5_5_5",
          label: "Beide Seiten: 5 % Vertragserfüllung + 5 % Gewährleistung (UN) + 5 % § 650f-äquivalent (BE)",
          description: "UN stellt Erfüllungsbürgschaft 5 % bis Abnahme + Gewährleistungsbürgschaft 5 % für 5 Jahre. BE stellt § 650f-Sicherung 110 % der noch offenen Vergütung.",
          risk: "low",
          riskNote: "Marktstandard im großen Bau.",
          whenProblem: "Bürgschaftskosten beidseitig.",
          whenNegotiate: "Beide: bewährt.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "nur_un_sicherheit_10",
          label: "Nur UN stellt Sicherheit (10 % Erfüllung + Gewährleistung)",
          description: "BE-freundlich extrem; keine Sicherheit für UN.",
          risk: "high",
          riskNote: "BE-freundlich, aber bei UN als Verbraucher unzulässige Belastung. § 650f kann nicht vertraglich ausgeschlossen werden (§ 650f Abs. 7 BGB!).",
          whenProblem: "UN-Klage auf § 650f ist trotz Klausel zulässig.",
          whenNegotiate: "UN: § 650f bleibt unverzichtbar.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "nur_un_sicherheit_10", ausgewogen: "gegenseitig_5_5_5", durchsetzungsstark: "nur_bauhandwerkersicherung_650f" }
    },

    // ── 6. Verzug und Vertragsstrafen ──
    {
      key: "delay_penalty",
      title: "Verzug und Vertragsstrafen",
      paragraph: "§ 7",
      description: "Termintreue, Verzugspauschalen, Vertragsstrafen. § 343 BGB: Gericht kann Vertragsstrafe herabsetzen wenn unverhältnismäßig. § 309 Nr. 6 BGB: pauschale Strafen in AGB nur unter Bedingungen wirksam.",
      importance: "high",
      options: [
        {
          value: "gesetzlich_kein_strafvereinbarung",
          label: "Gesetzliche Verzugsregeln, keine Vertragsstrafe",
          description: "§ 286 BGB Verzug, Schadensersatz nach § 280, kein pauschaler Verzugsschaden.",
          risk: "medium",
          riskNote: "UN-freundlich. BE muss konkreten Schaden nachweisen — bei Bauverzug schwierig.",
          whenProblem: "BE-Schadensbeweis schwierig.",
          whenNegotiate: "BE: Tagespauschale verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "vertragsstrafe_0_2_pro_werktag_max_5",
          label: "Vertragsstrafe 0,2 % pro Werktag, max. 5 % der Auftragssumme",
          description: "Marktüblich im Bau. Bei UN-Verzug ohne BE-Mitverschulden. § 343 BGB-Reduktion möglich, aber selten bei diesen Sätzen.",
          risk: "low",
          riskNote: "BGH-anerkannt, AGB-fest. § 309 Nr. 6 BGB: in AGB möglich, wenn Beweisrecht der Gegenseite vorbehalten.",
          whenProblem: "Selten Reduktion durch Gericht.",
          whenNegotiate: "Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "vertragsstrafe_0_5_max_10",
          label: "Vertragsstrafe 0,5 % pro Werktag, max. 10 %",
          description: "Hohe Abschreckung.",
          risk: "medium",
          riskNote: "Bei AGB Risiko der Unwirksamkeit (§ 343 + § 307 BGB unangemessene Benachteiligung); 5 % gilt als Obergrenze in BGH-Praxis (BGH NJW 2003, 1805).",
          whenProblem: "Klausel auf 5 % gestutzt.",
          whenNegotiate: "UN: Reduktion verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "bonus_malus_system",
          label: "Bonus-Malus: Strafe bei Verzug + Bonus bei früherer Fertigstellung",
          description: "0,2 % Strafe / 0,1 % Bonus pro Werktag, jeweils gedeckelt.",
          risk: "low",
          riskNote: "Anreizmodell, fair.",
          whenProblem: "Bei Streit über Bonus-Voraussetzungen.",
          whenNegotiate: "Klare Bonus-Trigger definieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "vertragsstrafe_0_5_max_10", ausgewogen: "vertragsstrafe_0_2_pro_werktag_max_5", durchsetzungsstark: "gesetzlich_kein_strafvereinbarung" }
    },

    // ── 7. Kündigung ──
    {
      key: "termination",
      title: "Kündigung",
      paragraph: "§ 8",
      description: "Freie BE-Kündigung § 648 BGB, außerordentliche Kündigung § 648a BGB (Schriftform), Bauvertragskündigung § 650h. Verbraucherbauvertrag: Widerrufsrecht 14 Tage § 650l.",
      importance: "high",
      options: [
        {
          value: "gesetzlich_648_648a",
          label: "Gesetzliche Regelung (§ 648 + § 648a BGB)",
          description: "BE kann jederzeit frei kündigen, UN behält Vergütung minus Erspartes. Beide außerordentlich aus wichtigem Grund.",
          risk: "low",
          riskNote: "BGB-Default. § 648 Vermutung 5 % nicht erbracht — UN beweispflichtig für höheren Anteil.",
          whenProblem: "UN: bei früher BE-Kündigung Beweisaufwand für Vergütung.",
          whenNegotiate: "UN: Detailliertes Aufmaß bei Kündigung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "kuendigung_nur_wichtiger_grund",
          label: "Kündigung nur aus wichtigem Grund",
          description: "Freie Kündigung ausgeschlossen, nur § 648a-Kündigung.",
          risk: "medium",
          riskNote: "UN-freundlich. Bei Verbraucherbauvertrag unzulässig — Widerrufsrecht § 650l zwingend.",
          whenProblem: "Bei B2C unwirksam.",
          whenNegotiate: "Nur B2B sinnvoll.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "bau_650h_schriftform",
          label: "Bauvertrag-Kündigung § 650h (Schriftform)",
          description: "Kündigung nur schriftlich; bei Bauvertrag zwingend (§ 650h).",
          risk: "low",
          riskNote: "Klar, dokumentationssicher.",
          whenProblem: "Selten.",
          whenNegotiate: "Bei jedem Bauvertrag empfohlen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "verbraucherwiderruf_650l",
          label: "Verbraucherbauvertrag: 14 Tage Widerrufsrecht (§ 650l)",
          description: "Bei Verbraucherbauvertrag: Verbraucher kann 14 Tage nach Vertragsschluss widerrufen. Belehrung zwingend.",
          risk: "low",
          riskNote: "Pflicht bei B2C-Bauvertrag. Fehlende Belehrung: 1 Jahr + 14 Tage Widerrufsfrist (§ 356e BGB).",
          whenProblem: "UN: bei fehlerhafter Belehrung lange Widerrufsfrist.",
          whenNegotiate: "Standard-Belehrung verwenden.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "bau_650h_schriftform", ausgewogen: "gesetzlich_648_648a", durchsetzungsstark: "kuendigung_nur_wichtiger_grund" }
    },

    // ── 8. Haftung ──
    {
      key: "liability",
      title: "Haftung",
      paragraph: "§ 9",
      description: "Mängelhaftung + allgemeine Schadenshaftung. § 309 Nr. 7 BGB: in AGB Vorsatz/grobe Fahrlässigkeit/Personenschäden nicht ausschließbar.",
      importance: "high",
      options: [
        {
          value: "gesetzlich_voll",
          label: "Volle gesetzliche Haftung",
          description: "BGB-Standard, keine Begrenzung, ProdHaftG zusätzlich.",
          risk: "medium",
          riskNote: "BE-freundlich, UN-Risiko unkalkulierbar bei Großschäden.",
          whenProblem: "UN: existenzbedrohend bei Großschaden.",
          whenNegotiate: "UN: Berufshaftpflicht + Begrenzung leichte Fahrlässigkeit.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "begrenzt_leichte_fahrl_auftrag",
          label: "Volle Haftung Vorsatz/grobe FL, leichte FL begrenzt auf Auftragssumme",
          description: "§ 309 Nr. 7 BGB-konform. Marktstandard.",
          risk: "low",
          riskNote: "Branchenüblich.",
          whenProblem: "Bei Folgeschäden über Auftragssumme — Streit über Vorsatz/grobe FL.",
          whenNegotiate: "Beide: Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "betriebshaftpflicht_pflicht",
          label: "Volle Haftung + Berufs-/Betriebshaftpflicht-Pflicht UN",
          description: "UN muss Haftpflicht-Versicherung mit min. 5 Mio EUR Personen-/Sachschäden + 1 Mio EUR Vermögensschäden nachweisen.",
          risk: "low",
          riskNote: "Optimal für BE; Risiko-Transfer.",
          whenProblem: "Versicherungspflicht muss eingehalten werden.",
          whenNegotiate: "UN: Kosten in Vergütung einkalkulieren.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "haftungsausschluss_einfach",
          label: "Haftungsausschluss für leichte Fahrlässigkeit komplett",
          description: "Versuch, leichte Fahrlässigkeit ganz auszuschließen.",
          risk: "high",
          riskNote: "In AGB nur eingeschränkt wirksam. § 309 Nr. 7b BGB: bei Schäden aus Verletzung Kardinalpflichten unwirksam. BGH-Rechtsprechung streng.",
          whenProblem: "Klausel kippt teilweise.",
          whenNegotiate: "UN: Begrenzung statt Ausschluss.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "betriebshaftpflicht_pflicht", ausgewogen: "begrenzt_leichte_fahrl_auftrag", durchsetzungsstark: "begrenzt_leichte_fahrl_auftrag" }
    },

    // ── 9. Eigentumsvorbehalt und Materialeinbau ──
    {
      key: "retention_of_title",
      title: "Eigentumsvorbehalt und Materialeinbau",
      paragraph: "§ 10",
      description: "Bei eingebauten Materialien wesentlicher Bestandteil des Bauwerks → §§ 946, 93 BGB: Eigentum geht auf BE über. Eigentumsvorbehalt nur an noch nicht eingebauten Materialien wirksam.",
      importance: "medium",
      options: [
        {
          value: "kein_eigentumsvorbehalt",
          label: "Kein Eigentumsvorbehalt",
          description: "UN trägt Insolvenzrisiko BE bzgl. Materialien voll.",
          risk: "high",
          riskNote: "UN-Risiko bei BE-Insolvenz: Material verloren ohne Bezahlung. BE-vorteilhaft, da keine UN-Sicherung am Material.",
          whenProblem: "UN: Schaden bei BE-Pleite.",
          whenNegotiate: "UN: einfacher EV mind. fordern.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "einfacher_ev_bis_einbau",
          label: "Einfacher Eigentumsvorbehalt bis Einbau",
          description: "Material bleibt bis Einbau UN-Eigentum. Nach Einbau gem. §§ 946, 93 BGB BE-Eigentum.",
          risk: "low",
          riskNote: "Marktstandard. Schutz für UN bis Einbau.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlener Mindeststandard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "verlaengerter_ev_forderungsabtretung",
          label: "Verlängerter EV mit Vorausabtretung der Werklohnforderung",
          description: "UN behält EV; bei Einbau wird BE-Werklohnforderung vorab an UN abgetreten.",
          risk: "low",
          riskNote: "Maximaler UN-Schutz im B2B.",
          whenProblem: "Bei Verbraucher-BE komplex und ggf. unwirksam.",
          whenNegotiate: "Bei B2B Standard für werthaltiges Material.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "bauhandwerker_sicherungshypothek_650e",
          label: "Bauhandwerker-Sicherungshypothek § 650e BGB",
          description: "UN kann Sicherungshypothek am Baugrundstück verlangen. Subsidiär zu § 650f.",
          risk: "low",
          riskNote: "Starkes UN-Sicherungsmittel; nur bei Bauwerk auf BE-Grundstück möglich.",
          whenProblem: "BE: belastet Grundstück.",
          whenNegotiate: "UN: Eintragung im Grundbuch.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "kein_eigentumsvorbehalt", ausgewogen: "einfacher_ev_bis_einbau", durchsetzungsstark: "verlaengerter_ev_forderungsabtretung" }
    },

    // ── 10. Schwarzarbeit-Verbot und Compliance ──
    {
      key: "compliance",
      title: "Schwarzarbeit-Verbot und Compliance",
      paragraph: "§ 11",
      description: "SchwarzArbG § 1: bei \"Ohne-Rechnung-Abrede\" ist Vertrag nichtig. UN verliert Vergütung, BE Mängelrechte (BGH VII ZR 241/13). Mindestlohn (MiLoG), Sozialversicherung.",
      importance: "high",
      options: [
        {
          value: "keine_klausel",
          label: "Keine Compliance-Klausel",
          description: "Verweis auf gesetzliche Regelungen.",
          risk: "medium",
          riskNote: "Bei Schwarzarbeit-Vorwurf später schwer abgrenzbar.",
          whenProblem: "Bei Verdacht: Vertrag ggf. nichtig.",
          whenNegotiate: "Compliance-Klausel ergänzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "standard_klausel",
          label: "Standard-Compliance-Klausel",
          description: "\"UN versichert: Beachtung MiLoG, ordnungsgemäße Anmeldung der Mitarbeiter, kein Einsatz von Schwarzarbeitern. UN haftet für Sub-UN nach § 14 AEntG / § 13 MiLoG.\"",
          risk: "low",
          riskNote: "Schützt BE vor Mithaftung MiLoG. § 14 AEntG: BE haftet wie Bürge ohne Einrede für Sub-UN-Mindestlohn.",
          whenProblem: "Bei Verstoß: außerordentliche Kündigung.",
          whenNegotiate: "Empfehlung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "streng_mit_kontrollrecht",
          label: "Standard + Kontrollrecht + außerordentliche Kündigung",
          description: "BE darf Lohnzahlungen, Anmeldungen, Sub-UN-Listen prüfen. Sofortige Kündigung bei Verstoß.",
          risk: "low",
          riskNote: "Maximaler BE-Schutz.",
          whenProblem: "UN: Verwaltungsaufwand.",
          whenNegotiate: "UN: angemessene Ankündigungsfrist verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "keine_schwarzarbeit_explizit_BGH",
          label: "\"Ohne-Rechnung-Abrede\"-Verbot ausdrücklich + BGH-Hinweis",
          description: "\"Beide Parteien bestätigen: keine Schwarzgeldabrede. Bei Verstoß ist Vertrag nichtig (BGH VII ZR 241/13).\"",
          risk: "low",
          riskNote: "Eindeutige Dokumentation, schützt vor späterer Behauptung der Nichtigkeit.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfehlung bei Privatkunden im Bau.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "streng_mit_kontrollrecht", ausgewogen: "standard_klausel", durchsetzungsstark: "standard_klausel" }
    },

    // ── 11. Schlussbestimmungen ──
    {
      key: "final_provisions",
      title: "Schlussbestimmungen",
      paragraph: "§ 12",
      description: "Schriftform für Änderungen, Salvatorische Klausel, Gerichtsstand, anwendbares Recht. Bei B2C: Verbrauchergerichtsstand zwingend (§ 29 ZPO).",
      importance: "medium",
      options: [
        {
          value: "minimal_beklagter",
          label: "Salvatorisch + Gerichtsstand am Sitz des Beklagten + deutsches Recht",
          description: "Faire Default-Lösung.",
          risk: "low",
          riskNote: "§ 12 ZPO Standard.",
          whenProblem: "Selten.",
          whenNegotiate: "Akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "gerichtsstand_be_sitz",
          label: "Gerichtsstand am Sitz des Bestellers",
          description: "BE-vorteilhaft.",
          risk: "medium",
          riskNote: "B2B grundsätzlich zulässig (§ 38 ZPO). Bei B2C nicht möglich (§ 29 ZPO Verbrauchergerichtsstand zwingend).",
          whenProblem: "UN: Anreise zu BE-Gericht.",
          whenNegotiate: "UN: Sitz UN oder DIS-Schiedsklausel.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gerichtsstand_un_sitz",
          label: "Gerichtsstand am Sitz des Unternehmers",
          description: "UN-vorteilhaft.",
          risk: "medium",
          riskNote: "B2B zulässig. Bei B2C unzulässig.",
          whenProblem: "BE: Anreise.",
          whenNegotiate: "BE: neutralen Gerichtsstand.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "dis_schiedsklausel",
          label: "DIS-Schiedsgerichtsbarkeit",
          description: "Streitigkeiten vor DIS-Schiedsgericht (Deutsche Institution für Schiedsgerichtsbarkeit).",
          risk: "medium",
          riskNote: "Schnell, vertraulich, teuer. Schriftform § 1031 ZPO zwingend.",
          whenProblem: "Bei kleinen Streitwerten unverhältnismäßig teuer.",
          whenNegotiate: "Nur bei Großprojekten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "gerichtsstand_be_sitz", ausgewogen: "minimal_beklagter", durchsetzungsstark: "gerichtsstand_un_sitz" }
    }
  ]
};

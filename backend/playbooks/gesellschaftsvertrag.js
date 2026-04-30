// Gesellschaftsvertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Basis: BGB §§ 705–740c (i.d.F. MoPeG, in Kraft 01.01.2024); HGB §§ 105–177a; GmbHG; AktG; KStG § 1a
// Berücksichtigt MoPeG-Reform 2024 und aktuelle BGH-/BSG-Rechtsprechung 2014–2025

module.exports = {
  type: "gesellschaftsvertrag",
  title: "Gesellschaftsvertrag (GbR · OHG · KG · GmbH · UG)",
  description: "Gründungsvertrag einer Personen- oder Kapitalgesellschaft — regelt Rechtsform, Stammkapital/Einlagen, Geschäftsführung, Gewinnverteilung, Gesellschafterwechsel und Auflösung. Berücksichtigt die MoPeG-Reform 2024 und die aktuelle BGH-/BSG-Rechtsprechung zu Abfindungs-, Stimmbindungs- und Vinkulierungsklauseln.",
  icon: "users-round",
  difficulty: "komplex",
  estimatedTime: "15–20 Minuten",
  legalBasis: "BGB §§ 705–740c (MoPeG); HGB §§ 105–177a; GmbHG; AktG; KStG § 1a (Optionsmodell); BGB § 138; GBO § 47 Abs. 2",

  // Rollen-Definition
  roles: {
    A: { key: "mehrheit", label: "Gründungs-/Mehrheitsgesellschafter", description: "Initiator der Gesellschaft, häufig zugleich (geschäftsführender) Gesellschafter mit größter Einlage" },
    B: { key: "minderheit", label: "Mit-/Minderheitsgesellschafter", description: "Investor oder Junior-Partner mit kleinerer Quote, schutzbedürftige Position" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Mehrheits-/Gründungsgesellschafter — maximale Kontrolle und Bindung der Mitgesellschafter",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — fair zwischen Mehrheits- und Minderheitsgesellschafter, gerichtsfest",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Minderheitsgesellschafter — Sperrminorität, faire Abfindung, erweiterte Kontrollrechte",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    { key: "rechtsform", label: "Rechtsform der zu gründenden Gesellschaft", type: "select", required: true, group: "context",
      options: [
        { value: "gbr", label: "GbR — Gesellschaft bürgerlichen Rechts (formfrei, Privatvermögens-Haftung)" },
        { value: "egbr", label: "eGbR — eingetragene GbR (mit Gesellschaftsregister, Pflicht bei Immobilien)" },
        { value: "ohg", label: "OHG — Offene Handelsgesellschaft (kaufmännisch, Handelsregister A)" },
        { value: "kg", label: "KG — Kommanditgesellschaft (Komplementär + Kommanditisten)" },
        { value: "ug", label: "UG (haftungsbeschränkt) — Stammkapital ab 1 EUR, Rücklagenpflicht" },
        { value: "gmbh", label: "GmbH — Stammkapital min. 25.000 EUR, notarielle Beurkundung" },
        { value: "gmbh_co_kg", label: "GmbH & Co. KG (KG mit GmbH als Komplementär)" }
      ]
    },
    { key: "firma", label: "Firma / Name der Gesellschaft", type: "text", required: true, group: "context",
      placeholder: "z.B. Müller & Schmidt GbR / Acme Solutions GmbH" },
    { key: "sitz", label: "Sitz der Gesellschaft (Stadt/Gemeinde)", type: "text", required: true, group: "context" },
    { key: "geschaeftsanschrift", label: "Geschäftsanschrift", type: "textarea", required: true, group: "context" },
    { key: "unternehmensgegenstand", label: "Unternehmensgegenstand", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Entwicklung und Vertrieb von Software im Bereich KI-gestützter Vertragsanalyse" },

    // Gesellschafter A
    { key: "partyA_name", label: "Gesellschafter A — Name / Firma", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Gesellschafter A — Anschrift", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_birthdate", label: "Gesellschafter A — Geburtsdatum (bei nat. Person)", type: "date", required: false, group: "partyA" },
    { key: "partyA_legalForm", label: "Gesellschafter A — Rechtsform", type: "select", required: true, group: "partyA",
      options: [
        { value: "natperson", label: "Natürliche Person" },
        { value: "kapges", label: "Kapitalgesellschaft (GmbH/AG/UG)" },
        { value: "persges", label: "Personengesellschaft" },
        { value: "verein", label: "Verein / Stiftung" }
      ]
    },
    { key: "partyA_einlage", label: "Gesellschafter A — Einlage / Stammeinlage (EUR)", type: "number", required: true, group: "partyA" },
    { key: "partyA_quote", label: "Gesellschafter A — Anteilsquote (%)", type: "number", required: true, group: "partyA" },

    // Gesellschafter B
    { key: "partyB_name", label: "Gesellschafter B — Name / Firma", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Gesellschafter B — Anschrift", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_birthdate", label: "Gesellschafter B — Geburtsdatum (bei nat. Person)", type: "date", required: false, group: "partyB" },
    { key: "partyB_legalForm", label: "Gesellschafter B — Rechtsform", type: "select", required: true, group: "partyB",
      options: [
        { value: "natperson", label: "Natürliche Person" },
        { value: "kapges", label: "Kapitalgesellschaft" },
        { value: "persges", label: "Personengesellschaft" },
        { value: "verein", label: "Verein / Stiftung" }
      ]
    },
    { key: "partyB_einlage", label: "Gesellschafter B — Einlage / Stammeinlage (EUR)", type: "number", required: true, group: "partyB" },
    { key: "partyB_quote", label: "Gesellschafter B — Anteilsquote (%)", type: "number", required: true, group: "partyB" },

    { key: "geschaeftsjahr", label: "Geschäftsjahr", type: "select", required: true, group: "context",
      options: [
        { value: "kalender", label: "Kalenderjahr (01.01.–31.12.) — Standard" },
        { value: "abweichend", label: "Abweichendes Geschäftsjahr (z.B. 01.07.–30.06.)" }
      ]
    },
    { key: "weitere_gesellschafter", label: "Weitere Gesellschafter (3+)", type: "select", required: false, group: "context",
      options: [
        { value: "nein", label: "Nein — nur 2 Gesellschafter" },
        { value: "ja", label: "Ja — die Beträge/Quoten müssen im Anschluss manuell ergänzt werden" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — 13 strategische Entscheidungen
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Rechtsformwahl-Bestätigung und Gründungsformalien ──
    {
      key: "formation",
      title: "Rechtsformwahl und Gründungsformalien",
      paragraph: "§ 2",
      description: "Bestätigt die Rechtsform und entscheidet über Gründungsformalitäten (Notar, Musterprotokoll, Eintragung).",
      importance: "critical",
      options: [
        {
          value: "gbr_formfrei",
          label: "GbR formfrei (kein Notar, keine Eintragung)",
          description: "Klassische GbR-Gründung; Vertrag privatschriftlich; keine Eintragung notwendig.",
          risk: "medium",
          riskNote: "Schnell und billig (keine Notar-/Registergebühren). Aber persönliche unbeschränkte Haftung; bei Immobiliengeschäften später eGbR-Eintragung zwingend (BGH V ZB 17/24).",
          whenProblem: "Wenn die Gesellschaft Grundbesitz erwerben oder Anteile an anderen Gesellschaften halten will — eGbR-Eintragung wird Pflicht.",
          whenNegotiate: "A: Bei größerem Geschäft auf eGbR drängen für Klarheit. B: Akzeptabel bei reinem Dienstleistungs-Geschäft.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "egbr_eingetragen",
          label: "eGbR — Eintragung im Gesellschaftsregister",
          description: "Eintragung beim zuständigen Amtsgericht; Namenszusatz 'eGbR'. Publizität gegenüber Dritten.",
          risk: "low",
          riskNote: "Höhere Rechtssicherheit; ermöglicht Grundbuch-Eintragungen ohne Folgeverfahren; Gebühren ca. 100–250 EUR.",
          whenProblem: "Wenn Gesellschafter wechseln — Eintragungen müssen jeweils angepasst werden.",
          whenNegotiate: "Empfohlene Standardlösung bei seriöser GbR-Gründung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "gmbh_musterprotokoll",
          label: "GmbH/UG mit Musterprotokoll",
          description: "Vereinfachte Gründung nach Anlage zum GmbHG; max. 3 Gesellschafter, ein Geschäftsführer, keine Sonderklauseln.",
          risk: "medium",
          riskNote: "Schnell und kostengünstig (Notar-Gebühren reduziert nach KostO). ABER: keine individuellen Klauseln möglich — Vinkulierung, Wettbewerbsverbot, Abfindung müssen separat geregelt werden.",
          whenProblem: "Wenn die Gründer komplexe Strukturen wollen — Musterprotokoll passt nicht.",
          whenNegotiate: "Bei mehr als 3 Gesellschaftern oder individuellen Klauseln: Verzicht auf Musterprotokoll.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gmbh_individuelle_satzung",
          label: "GmbH/UG mit individueller Satzung (Notar, voller Vertrag)",
          description: "Vollständige Satzung mit allen Wahl-Klauseln; notarielle Beurkundung; Eintragung HRB.",
          risk: "low",
          riskNote: "Höhere Notar-Kosten (1.500–3.000 EUR je nach Stammkapital), aber alle Schutzklauseln möglich. Marktstandard für seriöse Gründungen.",
          whenProblem: "Bei sehr kleinen Vorhaben Kosten/Nutzen prüfen.",
          whenNegotiate: "Für ernsthafte Unternehmen Standard.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "gmbh_individuelle_satzung", ausgewogen: "egbr_eingetragen", durchsetzungsstark: "gbr_formfrei" }
    },

    // ── 2. Stammkapital / Einlagen ──
    {
      key: "capital_contribution",
      title: "Stammkapital / Einlagen und ihre Erbringung",
      paragraph: "§ 3",
      description: "Höhe und Art der Einlagen — Bareinlage vs. Sacheinlage, Einzahlungsmodalitäten, Nachschusspflicht.",
      importance: "critical",
      options: [
        {
          value: "bar_voll",
          label: "Bareinlage, sofort vollständig einzuzahlen",
          description: "Bei GmbH: 25.000 EUR Stammkapital, vor Eintragung voll einzuzahlen.",
          risk: "low",
          riskNote: "Maximale Rechtssicherheit; keine Streitfragen über Einlagewerte.",
          whenProblem: "Wenn Gründer Liquiditätsengpass haben — vor Anmeldung kein Geld verfügbar.",
          whenNegotiate: "Bei kleinen Gründungen Standard.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "bar_50prozent",
          label: "Bareinlage, 50 % vor Anmeldung (gesetzliches Minimum bei GmbH)",
          description: "§ 7 Abs. 2 GmbHG: 12.500 EUR vor Anmeldung; Rest auf Anforderung der Gesellschafterversammlung.",
          risk: "medium",
          riskNote: "Restzahlungspflicht bleibt bestehen; bei Insolvenz Anspruch auf vollständige Einzahlung.",
          whenProblem: "Wenn Gesellschafter den Restbetrag später nicht zahlen können — Klage durch Geschäftsführer/Insolvenzverwalter.",
          whenNegotiate: "A: Volleinzahlung verlangen. B: Lange Zahlungsfristen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "sacheinlage",
          label: "Sacheinlage mit Sachgründungsbericht",
          description: "Bei GmbH § 5 Abs. 4 GmbHG: Sachgründungsbericht (Wert, Bewertungsmethode); Werthaltigkeitsprüfung durch Notar/Registergericht.",
          risk: "high",
          riskNote: "Bei Überbewertung: Differenzhaftung des einbringenden Gesellschafters (§ 9 GmbHG). Bewertungsstreitigkeiten häufig.",
          whenProblem: "Wenn Sachwert sich später als zu niedrig erweist — Differenzhaftung greift.",
          whenNegotiate: "Wertgutachten unabhängiger Sachverständiger einholen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gemischt_bar_sach",
          label: "Gemischte Einlage (Bar + Sache)",
          description: "Z.B. 15.000 EUR Bar + 10.000 EUR Equipment (mit Sachgründungsbericht).",
          risk: "medium",
          riskNote: "Komplexer; Sachteil mit allen Risiken der Sacheinlage.",
          whenProblem: "Bewertungsstreit über Sachteil.",
          whenNegotiate: "Wertgutachten, klare Aufteilung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "bar_voll", ausgewogen: "bar_50prozent", durchsetzungsstark: "bar_50prozent" }
    },

    // ── 3. Geschäftsführung und Vertretung ──
    {
      key: "management",
      title: "Geschäftsführung und Vertretung",
      paragraph: "§ 4",
      description: "Wer führt die Geschäfte, wer vertritt nach außen? Einzel- vs. Gesamtgeschäftsführung. Bei GmbH § 35 GmbHG; bei GbR § 720 BGB n.F.",
      importance: "critical",
      options: [
        {
          value: "einzeln_alle",
          label: "Einzelgeschäftsführungs- und Vertretungsbefugnis aller",
          description: "Jeder Gesellschafter/Geschäftsführer kann allein handeln und die Gesellschaft binden.",
          risk: "high",
          riskNote: "Maximales Vertrauen erforderlich. Ein einzelner kann die Gesellschaft im Außenverhältnis voll verpflichten — Risiko bei Streit oder Vertrauensbruch.",
          whenProblem: "Wenn ein Gesellschafter ohne Absprache große Verträge schließt — Bindung der Gesellschaft, intern Schadensersatz.",
          whenNegotiate: "A: Beschränkungen einbauen (Vier-Augen-Prinzip ab Schwellenwert).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "einzeln_einer",
          label: "Einzelgeschäftsführung Mehrheits-Gesellschafter, Mitwirkung B nur bei Grundlagengeschäften",
          description: "Nur Gesellschafter A (Mehrheit) führt; Gesellschafter B nur bei 'Grundlagengeschäften' (Investitionen > Schwelle, Personal-Wechsel, Rechtsstreitigkeiten).",
          risk: "medium",
          riskNote: "Vorteilhaft für A; B ist faktisch Investor ohne Tagesgeschäft.",
          whenProblem: "B: kein Einblick ins Tagesgeschäft, eingeschränkter Schutz.",
          whenNegotiate: "B: Kataloge der Grundlagengeschäfte erweitern.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gesamt_alle",
          label: "Gesamtgeschäftsführungs-/Vertretungsbefugnis (Vier-Augen-Prinzip)",
          description: "Alle Geschäfte erfordern die Mitwirkung von mindestens zwei Gesellschaftern/Geschäftsführern.",
          risk: "low",
          riskNote: "Hohe Sicherheit gegen Alleingänge; aber langsamer im Tagesgeschäft. Operativ mühsam ab 4+ Personen.",
          whenProblem: "Bei eiligen Entscheidungen (z.B. Vertragsunterschrift im Termin) — Mitunterschrift fehlt.",
          whenNegotiate: "Schwellenwert-Regelung: bis 5.000 EUR einzeln, darüber gemeinsam.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "extern_gf",
          label: "Externe(r) Fremd-Geschäftsführer (nicht-Gesellschafter)",
          description: "Geschäftsführung an Dritte delegiert; Gesellschafter nur Eigentümer + Kontrolleur.",
          risk: "medium",
          riskNote: "Klare Trennung Eigentum-Management. Sozialversicherungsrechtlich GF i.d.R. abhängig beschäftigt (BSG B 12 R 15/21 R bei Minderheits-GF stets prüfen).",
          whenProblem: "Wenn GF schlecht performt — Abberufung mit qualifizierter Mehrheit (§ 38 GmbHG, 3/4).",
          whenNegotiate: "Anstellungsvertrag separat — Dienstvertrag, ggf. mit Bonus.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "einzeln_einer", ausgewogen: "gesamt_alle", durchsetzungsstark: "einzeln_alle" }
    },

    // ── 4. Beschlussfassung und Mehrheitserfordernisse ──
    {
      key: "voting",
      title: "Beschlussfassung und Mehrheitserfordernisse",
      paragraph: "§ 5",
      description: "Welche Mehrheit für welche Entscheidung? § 47 GmbHG: einfache Mehrheit als Default; § 53 Abs. 2 GmbHG: 3/4-Mehrheit zwingend für Satzungsänderung.",
      importance: "critical",
      options: [
        {
          value: "einstimmig_alles",
          label: "Einstimmigkeit für alle Beschlüsse",
          description: "Jeder Gesellschafter hat Veto. Klassischer GbR-Default a.F. — bei MoPeG nun 'nach Anteilen', aber abweichend wählbar.",
          risk: "high",
          riskNote: "Lähmungsgefahr — ein einzelner Gesellschafter blockiert. Bei Streit: Patt, keine Beschlüsse möglich.",
          whenProblem: "Bei Streit zwischen Gesellschaftern: Stillstand der Gesellschaft.",
          whenNegotiate: "A: einfache Mehrheit für Routine, einstimmig nur für Grundlagen. B: Sperrminorität bei wichtigen Themen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "einfach_alles",
          label: "Einfache Mehrheit für alle Beschlüsse (nach Anteilen)",
          description: "Mehrheit der Stimmen entscheidet.",
          risk: "medium",
          riskNote: "Mehrheits-Gesellschafter dominiert vollständig; Minderheit hat keine Sperre.",
          whenProblem: "Mehrheit kann ohne Rücksicht auf Minderheit Satzung ändern (sofern nicht zwingend 3/4 verlangt).",
          whenNegotiate: "B: Sperrminorität bei Grundlagen einbauen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gestaffelt_einfach_3_4",
          label: "Gestaffelt: Einfache Mehrheit für Routine, 3/4 für Grundlagen",
          description: "Routine (Geschäftsbericht, Tagesgeschäft) einfach; Grundlagenentscheidungen (Satzungsänderung, Kapitalerhöhung, Ausschluss) mit 3/4-Mehrheit.",
          risk: "low",
          riskNote: "Marktstandard; ausgewogenes Verhältnis Mehrheit-Minderheit. § 53 Abs. 2 GmbHG zwingend für echte Satzungsänderungen.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Standard. Optional Liste der Grundlagenentscheidungen erweitern.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "sperrminoritaet",
          label: "Sperrminorität bei allen wichtigen Beschlüssen (ab 25 % Anteil)",
          description: "Beschlüsse über Satzungsänderung, Auflösung, Verkauf wichtiger Vermögenswerte, Geschäftsführerwechsel benötigen Zustimmung des Gesellschafters mit Sperrminorität (z.B. ≥ 25 %).",
          risk: "medium",
          riskNote: "Schutz Minderheit; gleichzeitig Lähmungsrisiko bei Streit.",
          whenProblem: "Wenn Mehrheit Routine-Reform anstrebt, die nicht zentrale Punkte trifft.",
          whenNegotiate: "A: Liste der 'wichtigen' Beschlüsse eng halten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "einfach_alles", ausgewogen: "gestaffelt_einfach_3_4", durchsetzungsstark: "sperrminoritaet" }
    },

    // ── 5. Gewinn- und Verlustverteilung ──
    {
      key: "profit_loss",
      title: "Gewinn- und Verlustverteilung",
      paragraph: "§ 6",
      description: "Standard ist Verteilung nach Anteilen (§ 709 BGB n.F.; § 29 GmbHG). Abweichende Vereinbarung möglich (Tätigkeitsvergütung, Vorabgewinn).",
      importance: "high",
      options: [
        {
          value: "nach_anteilen",
          label: "Verteilung nach Anteilen / Stammeinlage",
          description: "Default; Gewinn und Verlust nach Quote.",
          risk: "low",
          riskNote: "Klar, einfach. Gerichtsfest.",
          whenProblem: "Wenn Beiträge unterschiedlich (z.B. einer arbeitet, andere zahlt) — Gerechtigkeits-Frage.",
          whenNegotiate: "Tätigkeitsvergütung extra regeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "vorabgewinn_taetigkeit",
          label: "Vorabgewinn für Tätigkeit + Rest nach Anteilen",
          description: "Geschäftsführender Gesellschafter erhält feste Tätigkeitsvergütung (z.B. 60.000 EUR/Jahr); verbleibender Gewinn nach Anteilen.",
          risk: "low",
          riskNote: "Saubere Trennung Arbeitseinsatz/Kapitaleinsatz.",
          whenProblem: "Wenn Gesellschaft in Verlustjahren — Tätigkeitsvergütung bleibt schuldig (Rechnungsabgrenzung).",
          whenNegotiate: "Höhe der Vorab-Vergütung marktüblich (Geschäftsführergehalt).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "thesaurierung_pflicht",
          label: "Thesaurierung — Mindestrücklage statt Ausschüttung",
          description: "Z.B. 50 % des Gewinns werden zwingend in die Rücklage eingestellt; nur Rest wird ausgeschüttet. UG-Pflicht 25 % (§ 5a Abs. 3 GmbHG) ist Sonderfall.",
          risk: "medium",
          riskNote: "Stärkt Eigenkapital; Gesellschafter erhalten weniger Liquidität.",
          whenProblem: "Wenn Gesellschafter Kapital für persönliche Ausgaben benötigen — Streit.",
          whenNegotiate: "Quote anpassen je nach Wachstumsphase.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "disquot_abweichend",
          label: "Disquotale Verteilung (abweichend von Anteilen)",
          description: "Z.B. 70/30 obwohl Anteile 50/50.",
          risk: "high",
          riskNote: "Steuerlich relevant: Finanzamt prüft auf Schenkung / verdeckte Gewinnausschüttung. Bei GmbH ggf. Rückforderung als vGA.",
          whenProblem: "Steuerliche Nachforderung; bei GmbH ggf. Rückforderung als vGA.",
          whenNegotiate: "Steuerberater einbinden; klare schriftliche Begründung der Disquotalität.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "vorabgewinn_taetigkeit", ausgewogen: "nach_anteilen", durchsetzungsstark: "nach_anteilen" }
    },

    // ── 6. Vinkulierung (Beschränkung der Anteilsübertragung) ──
    {
      key: "transfer_restriction",
      title: "Vinkulierung — Beschränkung der Anteilsübertragung",
      paragraph: "§ 7",
      description: "Bei GmbH § 15 Abs. 5 GmbHG: durch Gesellschaftsvertrag kann Übertragung an Zustimmungserfordernis geknüpft werden. Notarielle Form bei GmbH-Anteilen zwingend (§ 15 Abs. 3+4 GmbHG).",
      importance: "high",
      options: [
        {
          value: "frei",
          label: "Anteile frei übertragbar (keine Vinkulierung)",
          description: "Jeder Gesellschafter kann seinen Anteil ohne Zustimmung verkaufen.",
          risk: "high",
          riskNote: "Mehrheits-Gesellschafter kann Anteile an Dritte (auch Wettbewerber) verkaufen — Mitgesellschafter haben keinen Einfluss auf Gesellschafterkreis.",
          whenProblem: "Wenn fremde Investoren in den Gesellschafterkreis eintreten, ohne dass die anderen das wollen.",
          whenNegotiate: "Vorkaufsrecht oder Vinkulierung verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "zustimmung_alle",
          label: "Zustimmung aller Gesellschafter erforderlich",
          description: "Nur einstimmige Zustimmung erlaubt Übertragung. Bei Verstoß: schwebende Unwirksamkeit.",
          risk: "medium",
          riskNote: "Maximaler Schutz; aber blockierende Wirkung — Anteilsverkauf praktisch unmöglich, wenn ein Gesellschafter sperrt.",
          whenProblem: "Wenn Verkäufer Liquidität braucht und Mitgesellschafter blockieren — Lähmung.",
          whenNegotiate: "Andienungsrecht / Vorkaufsrecht zu Verkehrswert als Ausweg.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "zustimmung_3_4_mit_andienung",
          label: "Zustimmung mit qualifizierter Mehrheit (3/4) + Andienungsrecht",
          description: "Übertragung an Dritte nur mit 3/4-Beschluss; bei Ablehnung müssen Mitgesellschafter den Anteil selbst erwerben (zu Verkehrswert / Buchwert).",
          risk: "low",
          riskNote: "Marktstandard. Schützt vor unerwünschten neuen Gesellschaftern, gibt Verkäufer Exit-Möglichkeit.",
          whenProblem: "Streit über Verkehrswert-Bestimmung — Bewertungsklausel im Vertrag wichtig.",
          whenNegotiate: "Bewertungsmethode klar: z.B. IDW S1, Multiplikatoren, Stuttgarter Verfahren.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "vorkaufsrecht_einfach",
          label: "Einfaches Vorkaufsrecht der Mitgesellschafter",
          description: "Mitgesellschafter haben Vorrecht zum Kauf zu denselben Konditionen wie ein Drittangebot.",
          risk: "low",
          riskNote: "Praktikabel; Mitgesellschafter können ungeliebte Dritte ablösen, aber Verkäufer bekommt seinen Preis.",
          whenProblem: "Wenn Drittangebot nicht ernsthaft (Strohmann-Konstrukt).",
          whenNegotiate: "'Drittangebot in Schriftform mit nachweisbarem Preis' verlangen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "zustimmung_alle", ausgewogen: "zustimmung_3_4_mit_andienung", durchsetzungsstark: "vorkaufsrecht_einfach" }
    },

    // ── 7. Wettbewerbsverbot Gesellschafter ──
    {
      key: "non_compete",
      title: "Wettbewerbsverbot Gesellschafter",
      paragraph: "§ 8",
      description: "Bei OHG/KG § 112 HGB Wettbewerbsverbot persönlich haftender Gesellschafter. Vertragliche Verbote nur wirksam, wenn zeitlich/räumlich/sachlich begrenzt + zur Existenzsicherung erforderlich (BGH II ZR 208/08; Art. 12 GG, § 138 BGB).",
      importance: "high",
      options: [
        {
          value: "keines",
          label: "Kein Wettbewerbsverbot",
          description: "Gesellschafter dürfen jederzeit konkurrieren, allerdings Treuepflicht (BGH NJW 2002, 1338).",
          risk: "medium",
          riskNote: "Bei OHG/KG § 112 HGB greift kraft Gesetzes für persönlich haftende Gesellschafter — also Verbot trotzdem. Bei GmbH/GbR Treuepflicht als Auffanglösung.",
          whenProblem: "A-Sicht: Mitgesellschafter könnte gleichzeitig Wettbewerber gründen.",
          whenNegotiate: "A: Mindestens während Mitgliedschaft Verbot einbauen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "waehrend_mitgliedschaft",
          label: "Verbot nur während Mitgliedschaft",
          description: "Wettbewerbsverbot solange Gesellschafter beteiligt; nach Ausscheiden frei.",
          risk: "low",
          riskNote: "Marktstandard für GmbH; entspricht der Treuepflicht.",
          whenProblem: "Wenn Gesellschafter nach Ausscheiden direkt mit erlangtem Know-how konkurriert.",
          whenNegotiate: "Befristetes nachvertragliches Verbot für sensible Branchen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "waehrend_2_jahre_nachvertraglich",
          label: "Verbot während Mitgliedschaft + 2 Jahre nachvertraglich (begrenzt)",
          description: "Sachlich begrenzt auf den Unternehmensgegenstand, räumlich auf das Tätigkeitsgebiet, zeitlich auf 2 Jahre nach Ausscheiden. Mit Karenzentschädigung (üblich 50 % der durchschnittlichen Bezüge).",
          risk: "low",
          riskNote: "Wirksam wenn alle drei Begrenzungen erfüllt + Karenz angemessen (BGH II ZR 208/08).",
          whenProblem: "Wenn räumlich/sachlich zu weit — Klausel nichtig.",
          whenNegotiate: "Räumlich/sachlich eng halten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "streng_5_jahre_keine_karenz",
          label: "5 Jahre nachvertraglich, keine Karenz",
          description: "Maximalkonstellation.",
          risk: "high",
          riskNote: "Praktisch immer **nichtig** (§ 138 BGB, Art. 12 GG, BGH II ZR 208/08). 2 Jahre ist faktische Obergrenze.",
          whenProblem: "Klausel kippt; kein Schutz für Gesellschaft.",
          whenNegotiate: "Kürzen auf 2 Jahre + Karenz.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "streng_5_jahre_keine_karenz", ausgewogen: "waehrend_mitgliedschaft", durchsetzungsstark: "keines" }
    },

    // ── 8. Ausscheiden / Ausschluss eines Gesellschafters ──
    {
      key: "exit_exclusion",
      title: "Ausscheiden / Ausschluss eines Gesellschafters",
      paragraph: "§ 9",
      description: "Bei GbR seit MoPeG (§ 723 BGB n.F.): Kündigung führt zum Ausscheiden, nicht zur Auflösung. Bei GmbH: Einziehung nach § 34 GmbHG.",
      importance: "critical",
      options: [
        {
          value: "kein_ausschluss",
          label: "Kein vertraglicher Ausschluss-Mechanismus",
          description: "Nur gesetzliche Möglichkeit (§ 140 HGB analog / § 727 BGB n.F. — Auflösungsklage); langwieriges Gerichtsverfahren.",
          risk: "high",
          riskNote: "Praktisch keine schnelle Reaktionsmöglichkeit; Streit lähmt Gesellschaft.",
          whenProblem: "Streit unter Gesellschaftern — keine Trennungsmöglichkeit ohne Klage.",
          whenNegotiate: "Ausschlussklausel mit Gründen einbauen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "wichtiger_grund_3_4",
          label: "Ausschluss aus wichtigem Grund mit 3/4-Beschluss",
          description: "Wichtige Gründe: schwere Pflichtverletzung, Insolvenzantrag, längere Erwerbsunfähigkeit. Beschluss durch Gesellschafterversammlung mit 3/4-Mehrheit (ohne Stimme des Betroffenen).",
          risk: "low",
          riskNote: "Marktstandard. Wirksam wenn 'wichtiger Grund' konkret definiert. BGH II ZR 426/17: Vertrauensverhältnis-Maßstab.",
          whenProblem: "Ausgeschlossener klagt auf Unwirksamkeit — gerichtliche Überprüfung.",
          whenNegotiate: "Klar Liste der 'wichtigen Gründe' definieren.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "auch_ohne_grund_einfach",
          label: "Ausschluss auch ohne wichtigen Grund (Hinauskündigung)",
          description: "Mehrheit kann jederzeit Mitgesellschafter 'hinauskündigen'.",
          risk: "high",
          riskNote: "**Grundsätzlich sittenwidrig** (§ 138 BGB) und nichtig (BGH II ZR 4/06). Nur in eng begrenzten Sonderfällen wirksam (Praxisgemeinschaften).",
          whenProblem: "Klausel kippt — kein Ausschluss möglich.",
          whenNegotiate: "Ersetzen durch 'wichtiger Grund'.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "tod_insolvenz_automatisch",
          label: "Automatisches Ausscheiden bei Tod / Insolvenz / Vermögensverfall",
          description: "Bei Eintritt definierter Ereignisse Anteil verfällt automatisch (Einziehung); Erben/Insolvenzverwalter erhalten Abfindung.",
          risk: "low",
          riskNote: "Schutz vor unerwünschten Erben oder Insolvenzverwaltern. § 34 GmbHG erlaubt Einziehung. Steuerliche Wirkung bei Erbschaft prüfen.",
          whenProblem: "Streit über Abfindungshöhe (siehe nächste Sektion).",
          whenNegotiate: "Klare Bewertungsmethode in Vertrag.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "auch_ohne_grund_einfach", ausgewogen: "wichtiger_grund_3_4", durchsetzungsstark: "wichtiger_grund_3_4" }
    },

    // ── 9. Abfindung beim Ausscheiden ──
    {
      key: "severance",
      title: "Abfindung beim Ausscheiden",
      paragraph: "§ 10",
      description: "Höhe und Modus der Auszahlung an den ausscheidenden Gesellschafter. Kritischste Klausel — BGH II ZR 216/13 (Sittenwidrigkeit eines Abfindungsausschlusses) und II ZR 279/09 (krasses Missverhältnis Buchwert/Verkehrswert).",
      importance: "critical",
      options: [
        {
          value: "verkehrswert_voll",
          label: "Voller Verkehrswert (Sachverständigenbewertung), Auszahlung in 6 Monaten",
          description: "Marktwert nach Bewertungsgutachten (z.B. IDW S1); Zahlung binnen 6 Monaten.",
          risk: "low",
          riskNote: "Fairster Ansatz, gerichtsfest. Belastet aber Liquidität der Gesellschaft.",
          whenProblem: "Wenn Gesellschaft die Liquidität nicht hat — Existenzgefahr.",
          whenNegotiate: "Auszahlung in Raten 12–24 Monate verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "verkehrswert_raten_5j",
          label: "Verkehrswert, Auszahlung in 5 Jahresraten + marktübliche Verzinsung",
          description: "Verkehrswert wird über 5 Jahre ratenweise ausgezahlt, mit Zins (z.B. 4 % p.a.).",
          risk: "low",
          riskNote: "Ausgewogen — Schutz Gesellschaftsliquidität, faire Abfindung. § 271a BGB Höchstgrenzen Zahlungsfristen B2B beachten.",
          whenProblem: "Bei Zinssatz unter Marktzins: Streit.",
          whenNegotiate: "Marktzins (z.B. EZB-Basiszins + 5 %) verhandeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "buchwert_mit_cap",
          label: "Buchwert (Steuerbilanz) mit Cap bei krassem Missverhältnis",
          description: "Buchwert nach Bilanz; aber Klausel: 'wenn Buchwert weniger als 70 % des Verkehrswerts → Anpassung auf 70 %'.",
          risk: "medium",
          riskNote: "Schutz vor Sittenwidrigkeitsverdikt (BGH II ZR 279/09); aber Mehrheits-Gesellschafter hat trotzdem Vorteil.",
          whenProblem: "Wenn Klausel ohne Cap — wird gerichtlich auf Verkehrswert angehoben.",
          whenNegotiate: "Klare prozentuale Untergrenze (70–80 %) einbauen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "kein_abfindung_pflichtverstoss",
          label: "Reduzierte Abfindung bei Pflichtverstoß",
          description: "Bei Ausschluss aus wichtigem Grund nur 50 % des Buchwerts.",
          risk: "high",
          riskNote: "**Sittenwidrig nach BGH II ZR 216/13**, wenn als faktische Vertragsstrafe wirkend. Klausel meist nichtig.",
          whenProblem: "Klausel kippt — voller Verkehrswert ist zu zahlen.",
          whenNegotiate: "Mit Sanktionscharakter problematisch; max. moderater Abschlag (10–20 %).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "buchwert_mit_cap", ausgewogen: "verkehrswert_raten_5j", durchsetzungsstark: "verkehrswert_voll" }
    },

    // ── 10. Auskunfts- und Kontrollrechte ──
    {
      key: "information_rights",
      title: "Auskunfts- und Kontrollrechte",
      paragraph: "§ 11",
      description: "Bei GmbH § 51a GmbHG zwingend (jeder Gesellschafter hat Anspruch auf Auskunft + Bucheinsicht); kann nicht ausgeschlossen werden. Bei GbR § 717 BGB n.F.",
      importance: "high",
      options: [
        {
          value: "gesetzlich",
          label: "Gesetzliche Auskunftsrechte (§ 51a GmbHG / § 717 BGB n.F.)",
          description: "Mindeststandard; bei GmbH zwingend.",
          risk: "low",
          riskNote: "Sichere Lösung; bei GmbH nicht abdingbar (§ 51a Abs. 3 GmbHG).",
          whenProblem: "Selten Streit; allenfalls über 'missbräuchliche Anfragen'.",
          whenNegotiate: "Klausel 'missbräuchliche Anfragen ablehnbar' einbauen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "beschraenkt_quartalsbericht",
          label: "Begrenzte Information: nur Quartalsbericht",
          description: "Mehrheit liefert Quartalsberichte, ad-hoc-Anfragen nur in Gesellschafterversammlung.",
          risk: "high",
          riskNote: "**Bei GmbH unwirksam** (§ 51a Abs. 3 GmbHG zwingend). Bei GbR möglich, aber riskant für Minderheit.",
          whenProblem: "B kann bei Verdacht auf Misswirtschaft nicht prüfen.",
          whenNegotiate: "Ad-hoc-Anfragen nicht abdingbar; Klausel meist gerichtlich kassiert.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "erweitert_audit",
          label: "Erweiterte Rechte inkl. Audit-Recht / externer Prüfer",
          description: "Jeder Gesellschafter kann auf eigene Kosten externe Prüfung beauftragen.",
          risk: "low",
          riskNote: "Maximaler Schutz Minderheit. Kostenfrage: Verursacher trägt, außer Befund bestätigt Verstoß.",
          whenProblem: "Aufwendig; bei Konflikten Dauerprüfungsdruck möglich.",
          whenNegotiate: "Quote/Kostenregel klar.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "online_dashboard",
          label: "Echtzeit-Einsicht über Gesellschafter-Dashboard",
          description: "Buchhaltungs-Software gibt allen Gesellschaftern jederzeit Lese-Zugriff (DATEV, lexoffice, Pennylane etc.).",
          risk: "low",
          riskNote: "Modern, effizient. Vertrauensbasis stark.",
          whenProblem: "Wenn Mehrheit 'lieber nicht alles offen' möchte.",
          whenNegotiate: "DSGVO-Compliance bei personenbezogenen Daten beachten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "gesetzlich", ausgewogen: "gesetzlich", durchsetzungsstark: "erweitert_audit" }
    },

    // ── 11. Auflösung und Liquidation ──
    {
      key: "dissolution",
      title: "Auflösung und Liquidation",
      paragraph: "§ 12",
      description: "Auflösungsgründe (Beschluss, Insolvenz, Zeitablauf, Erreichen des Zwecks); Liquidatoren; Verteilung des Liquidationserlöses (§§ 730–740 BGB n.F. für GbR; §§ 60 ff. GmbHG für GmbH).",
      importance: "medium",
      options: [
        {
          value: "beschluss_3_4",
          label: "Auflösung mit 3/4-Mehrheit",
          description: "Standard-Schwellenwert. § 60 Abs. 1 Nr. 2 GmbHG analog.",
          risk: "low",
          riskNote: "Marktüblich. Notarielle Beurkundung Pflicht bei Satzungsänderung (§ 53 Abs. 2 GmbHG).",
          whenProblem: "Bei Streit kann Mehrheit Auflösung erzwingen — Minderheit unterliegt.",
          whenNegotiate: "B: Sperrminorität (>1/4-Anteil) wirkt automatisch.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "einstimmig",
          label: "Auflösung nur einstimmig",
          description: "Jeder Gesellschafter hat Veto.",
          risk: "medium",
          riskNote: "Schutz vor unfreiwilliger Auflösung. Bei Patt: Auflösungsklage (§ 727 BGB n.F.) als Notausgang.",
          whenProblem: "Lähmungsgefahr.",
          whenNegotiate: "A: 3/4 verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "automatisch_zeit_ziel",
          label: "Automatische Auflösung bei Zeit-/Zielerreichung",
          description: "Vertrag definiert: 'Auflösung am 31.12.2030' oder 'Auflösung bei Erreichen des Projektziels X'.",
          risk: "low",
          riskNote: "Klar planbar; typisch bei Joint-Venture.",
          whenProblem: "Wenn Ziel/Zeit unscharf — Streit.",
          whenNegotiate: "Klare, messbare Kriterien.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "liquidation_durch_geschaeftsfuehrer",
          label: "Liquidation durch bisherige Geschäftsführer + 1 unabhängigen Liquidator",
          description: "Bisheriges Management führt durch, externer Dritter kontrolliert.",
          risk: "low",
          riskNote: "Schutz vor Selbstbedienung. Bei großen Gesellschaften Standard.",
          whenProblem: "Externer-Honorar belastet Liquidationserlös.",
          whenNegotiate: "Honorardeckel verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "liquidation_durch_geschaeftsfuehrer", ausgewogen: "beschluss_3_4", durchsetzungsstark: "beschluss_3_4" }
    },

    // ── 12. Streitbeilegung ──
    {
      key: "dispute_resolution",
      title: "Streitbeilegung (Schiedsklausel / Gerichtsstand)",
      paragraph: "§ 13",
      description: "Gesellschafterstreitigkeiten dauern vor ordentlichen Gerichten oft 3–7 Jahre. Schiedsklauseln (DIS-Schiedsgerichtsordnung 2018) sind in GmbH-Streitigkeiten weit verbreitet — schneller, vertraulich. Schriftform zwingend (§ 1031 ZPO).",
      importance: "medium",
      options: [
        {
          value: "ordentliches_gericht",
          label: "Ordentliches Gericht am Sitz der Gesellschaft",
          description: "Klassischer Gerichtsstand; Berufung möglich.",
          risk: "medium",
          riskNote: "Lange Verfahrensdauer (Landgericht 18–36 Monate, mit Berufung deutlich länger); öffentliche Verhandlung.",
          whenProblem: "Hohe Kosten; Reputationsrisiko bei öffentlicher Verhandlung.",
          whenNegotiate: "Mediation vor Klage als Vorstufe verhandeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "mediation_dann_gericht",
          label: "Verpflichtende Mediation, dann ordentliches Gericht",
          description: "Vor Klageerhebung 3 Monate Mediationsversuch (z.B. nach DIS-MediationsO).",
          risk: "low",
          riskNote: "Marktstandard für familiäre/partnerschaftliche Strukturen.",
          whenProblem: "Wenn eine Partei Mediation blockiert — Verzögerung.",
          whenNegotiate: "Klare Frist (3 Monate); danach freier Klageweg.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "schiedsgericht_dis",
          label: "Schiedsgericht (DIS-Schiedsgerichtsordnung 2018)",
          description: "Streitigkeiten vor Schiedsgericht (1 oder 3 Schiedsrichter); DIS-Regeln gelten ergänzend; vertraulich.",
          risk: "medium",
          riskNote: "Schnell (12–24 Monate), vertraulich, fachlich qualifizierte Schiedsrichter. ABER: hohe Kosten (5–10 % Streitwert). Keine Berufung.",
          whenProblem: "Bei niedrigen Streitwerten (< 100.000 EUR) unverhältnismäßig teuer.",
          whenNegotiate: "Bei großen GmbH-Streitigkeiten Standard.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "schiedsklausel_inkl_beschluss",
          label: "Schiedsklausel inkl. Beschlussmängel-Anfechtung",
          description: "Auch Anfechtungs-/Nichtigkeitsklagen gegen Gesellschafterbeschlüsse vor Schiedsgericht. Wirksamkeit nach BGH 'Schiedsfähigkeit III' (II ZR 255/13, 06.04.2017).",
          risk: "low",
          riskNote: "Vollständige Schiedsabwicklung; höchste Vertraulichkeit. Mindestanforderungen müssen eingehalten werden.",
          whenProblem: "Wenn Mindestanforderungen nicht erfüllt — Klausel teilweise unwirksam.",
          whenNegotiate: "DIS-Ergänzungsregel ESUG nutzen, sichert Mindestanforderungen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "schiedsgericht_dis", ausgewogen: "mediation_dann_gericht", durchsetzungsstark: "mediation_dann_gericht" }
    },

    // ── 13. Tod- und Nachfolgeklausel ──
    {
      key: "succession",
      title: "Tod- und Nachfolgeklausel",
      paragraph: "§ 14",
      description: "Was passiert bei Tod eines Gesellschafters? Ohne Regel: Universalsukzession § 1922 BGB; bei GbR seit MoPeG (§ 723 Abs. 1 Nr. 4 BGB n.F.) Ausscheiden mit Abfindungsanspruch.",
      importance: "high",
      options: [
        {
          value: "fortsetzungsklausel_abfindung",
          label: "Fortsetzungsklausel mit Abfindung an Erben",
          description: "Gesellschaft wird unter den verbleibenden Gesellschaftern fortgesetzt; Erben erhalten Abfindung nach den Regeln aus § 10.",
          risk: "low",
          riskNote: "Marktstandard. Gesellschaft bleibt arbeitsfähig; Erben werden ausgezahlt.",
          whenProblem: "Streit über Abfindungshöhe und -modalitäten.",
          whenNegotiate: "Klare Verweisung auf Abfindungsklausel; ggf. Lebensversicherungen zur Liquiditätssicherung.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "qualifizierte_nachfolge",
          label: "Qualifizierte Nachfolgeklausel (nur bestimmte Erben)",
          description: "Nur namentlich genannte oder qualifikatorisch bestimmte Erben (z.B. Kinder, Ehepartner, Personen mit fachlicher Qualifikation) können nachfolgen.",
          risk: "medium",
          riskNote: "Schutz des Gesellschafterkreises. Andere Erben erhalten Abfindung.",
          whenProblem: "Erbrechtliche Streitigkeiten zwischen qualifizierten und nicht-qualifizierten Erben.",
          whenNegotiate: "Kriterien klar und messbar formulieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "freie_nachfolge",
          label: "Freie Nachfolge — alle Erben werden Gesellschafter",
          description: "Universalsukzession bleibt unbeschränkt; jeder Erbe rückt automatisch in die Gesellschafterstellung ein.",
          risk: "high",
          riskNote: "Mehrheits-Gesellschafter verliert Kontrolle über den Gesellschafterkreis. Bei mehreren Erben: Erbengemeinschaft als Gesellschafter — komplex.",
          whenProblem: "Junior-Erben ohne Branchen-Know-how oder gegnerische Erbeninteressen werden Mit-Gesellschafter.",
          whenNegotiate: "A: Qualifizierte Nachfolge oder Fortsetzungsklausel. B: Akzeptabel wenn Familienunternehmen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "einziehung_mit_abfindung",
          label: "Automatische Einziehung des Anteils mit Abfindung",
          description: "Bei Tod wird der Anteil eingezogen (§ 34 GmbHG); Erben erhalten ausschließlich Abfindung, werden NICHT Gesellschafter.",
          risk: "low",
          riskNote: "Stärkster Schutz des Gesellschafterkreises. Steuerlich Erbschaftsteuer-Effekte prüfen (Verschonungsabschläge §§ 13a, 13b ErbStG).",
          whenProblem: "Hohe Liquiditätsbelastung der Gesellschaft bei Tod (Abfindung sofort fällig).",
          whenNegotiate: "Auszahlung in Raten + Lebensversicherung zur Finanzierung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "fortsetzungsklausel_abfindung", ausgewogen: "fortsetzungsklausel_abfindung", durchsetzungsstark: "freie_nachfolge" }
    }
  ]
};

// Individueller Vertrag Playbook — Lite-Wizard / Universal-Modus
// Geführte Vertragserstellung für Vertragstypen, die nicht in die 15 Spezial-Playbooks passen
// Basis: BGB Allgemeines Schuldrecht (§§ 241–432); AGB-Recht §§ 305–310 BGB
// Die Modi-Logik ist hier "soft" — keine fix definierte schutzbedürftige Partei

module.exports = {
  type: "individuell",
  title: "Individueller Vertrag (Lite-Wizard, Universal-Modus)",
  description: "Geführter Vertragserstellungs-Modus für individuelle Vertragsverhältnisse, die in keinen der Spezial-Vertragstypen passen. Universal-Sektionen plus drei frei definierbare Felder für den Vertragsgegenstand.",
  icon: "settings",
  difficulty: "einfach",
  estimatedTime: "5–10 Minuten",
  legalBasis: "BGB Allgemeines Schuldrecht (§§ 241–432); AGB-Recht §§ 305–310 BGB; je nach Inhalt weitere Vorschriften",

  // Rollen-Definition (frei benennbar)
  roles: {
    A: { key: "partei_a", label: "Partei A", description: "Erste Vertragspartei — Rolle wird im Wizard frei benannt (z.B. Auftraggeber, Verkäufer, Sponsor)" },
    B: { key: "partei_b", label: "Partei B", description: "Zweite Vertragspartei — Rolle wird im Wizard frei benannt (z.B. Auftragnehmer, Käufer, Empfänger)" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Vertragsersteller — strikte Pflichten der Gegenseite, weite Haftung, eigener Gerichtsstand",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — beidseitige Pflichten symmetrisch, gesetzliche Haftung, AGB-konform",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Gegenseite / Schutz schwächerer Position — beschränkte Haftung, Mediation, lange Auslauffristen",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    // Partei A
    { key: "partyA_name", label: "Name / Firma (Partei A)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Anschrift (Partei A)", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_role", label: "Rolle der Partei A im Vertrag", type: "text", required: true, group: "partyA",
      placeholder: "z.B. Auftraggeber, Verkäufer, Sponsor, Kooperationspartner" },

    // Partei B
    { key: "partyB_name", label: "Name / Firma (Partei B)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Anschrift (Partei B)", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_role", label: "Rolle der Partei B im Vertrag", type: "text", required: true, group: "partyB",
      placeholder: "z.B. Auftragnehmer, Käufer, Empfänger, Kooperationspartner" },

    // Vertragskontext
    { key: "is_b2c", label: "Ist eine Partei Verbraucher?", type: "select", required: true, group: "context",
      options: [
        { value: "b2b", label: "Nein, beide Parteien sind Unternehmer (B2B)" },
        { value: "b2c", label: "Ja, eine Partei ist Verbraucher (B2C — Verbraucherschutz beachten!)" },
        { value: "c2c", label: "Privatpersonen untereinander (C2C)" }
      ]
    },
    { key: "subject", label: "Vertragsgegenstand (Was regelt dieser Vertrag?)", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Tausch von Werbefläche gegen Software-Lizenz; Sponsoring eines Sportvereins; Vereinbarung über die gemeinsame Markenpflege..." },
    { key: "obligations", label: "Hauptleistungspflichten beider Parteien", type: "textarea", required: true, group: "context",
      placeholder: "Was schuldet Partei A? Was schuldet Partei B?" },
    { key: "compensation", label: "Vergütung / Gegenleistung (falls vorhanden)", type: "text", required: false, group: "context",
      placeholder: "z.B. 5.000 EUR netto einmalig; oder: keine Vergütung (Tausch)" },
    { key: "duration_select", label: "Geplante Vertragsdauer", type: "select", required: true, group: "context",
      options: [
        { value: "einmalig", label: "Einmalige Leistung" },
        { value: "kurz", label: "Bis 6 Monate" },
        { value: "mittel", label: "6–24 Monate" },
        { value: "lang", label: "Über 24 Monate" },
        { value: "unbefristet", label: "Unbefristet" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — 8 Universal-Sektionen
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Vertragstyp-Klassifikation ──
    {
      key: "contract_classification",
      title: "Vertragstyp-Klassifikation",
      paragraph: "§ 2",
      description: "Bestimmt, welches Schuldrecht-Regime greift — Kauf, Werk, Dienst, Tausch, gemischt. Wirkt indirekt auf Mängelrechte und Erfüllung.",
      importance: "high",
      options: [
        {
          value: "dienstvertrag",
          label: "Dienstvertrag-ähnlich (§ 611 BGB)",
          description: "Geschuldet ist eine Tätigkeit, kein Erfolg.",
          risk: "medium",
          riskNote: "Bei tatsächlich erfolgsorientierten Inhalten Streit über anwendbares Recht.",
          whenProblem: "Wenn Mängel auftreten — § 280 BGB statt § 634 BGB Mängelrechte.",
          whenNegotiate: "Klarstellen, ob Erfolg geschuldet wird.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "werkvertrag",
          label: "Werkvertrag-ähnlich (§ 631 BGB)",
          description: "Geschuldet ist ein konkretes Ergebnis; Abnahme nach § 640 BGB; Mängelrechte § 634 BGB.",
          risk: "low",
          riskNote: "Klares Regelregime; bei klaren Lieferpflichten Standard.",
          whenProblem: "Wenn Abnahmekriterien fehlen — Streit.",
          whenNegotiate: "Abnahmekriterien definieren.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "tausch_kooperation",
          label: "Tausch / Kooperation (gemischter Vertrag, § 480 BGB analog)",
          description: "Beide Parteien erbringen Leistungen ohne Geldzahlung.",
          risk: "medium",
          riskNote: "Steuerlich relevant: Tauschwerte müssen marktüblich sein, sonst USt-/Schenkung-Risiko.",
          whenProblem: "Finanzamt-Bewertung führt zu Nachforderungen.",
          whenNegotiate: "Tauschwerte explizit benennen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "mischvertrag",
          label: "Mischvertrag (mehrere Regime gleichzeitig)",
          description: "Vertrag enthält Elemente verschiedener Vertragstypen (z.B. Lieferung + Wartung + Schulung).",
          risk: "high",
          riskNote: "§ 311 BGB Typenvermengung; je nach Schwerpunkt anwendbares Recht. Rechtsprechung uneinheitlich.",
          whenProblem: "Streit über anwendbares Recht; Mängelrechte unklar.",
          whenNegotiate: "Für jedes Modul separat das anwendbare Recht definieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "werkvertrag", ausgewogen: "tausch_kooperation", durchsetzungsstark: "dienstvertrag" }
    },

    // ── 2. Haftung ──
    {
      key: "liability",
      title: "Haftung",
      paragraph: "§ 3",
      description: "§ 309 Nr. 7 BGB: In AGB Vorsatz/grobe Fahrlässigkeit/Personenschäden nicht ausschließbar. Bei Individualvereinbarung mehr Spielraum.",
      importance: "high",
      options: [
        {
          value: "gesetzlich",
          label: "Gesetzliche Haftung (BGB Default)",
          description: "Volle Haftung nach BGB; Vorsatz und grobe Fahrlässigkeit unbegrenzt.",
          risk: "medium",
          riskNote: "Klare Lösung, gerichtsfest. Risiko abhängig von Schadenspotenzial.",
          whenProblem: "Bei Großschaden ggf. existenzbedrohend für die haftende Partei.",
          whenNegotiate: "Begrenzung auf Auftragswert verhandeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "begrenzt_auftragswert",
          label: "Begrenzt auf Auftragswert (außer Vorsatz/grobe Fahrlässigkeit)",
          description: "Höchstgrenze = Vergütung; bei Vorsatz/grober Fahrlässigkeit unbegrenzt. § 309 Nr. 7 BGB-konform.",
          risk: "low",
          riskNote: "Marktstandard B2B; AGB-konform.",
          whenProblem: "Wenn Schaden den Auftragswert weit übersteigt — Begrenzung greift.",
          whenNegotiate: "Höhere Cap (z.B. 5x Auftragswert oder Versicherungssumme) verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "unbegrenzt",
          label: "Unbegrenzte Haftung",
          description: "Auch Folgeschäden, entgangener Gewinn.",
          risk: "high",
          riskNote: "Existenzrisiko für die haftende Partei. Bei B2C nicht zwingend zu Gunsten Verbraucher (§ 309 Nr. 7 nur Untergrenze).",
          whenProblem: "Großschaden = Insolvenz möglich.",
          whenNegotiate: "Begrenzung verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "keine_haftung",
          label: "Vollständiger Haftungsausschluss",
          description: "Versuch, jede Haftung auszuschließen.",
          risk: "high",
          riskNote: "**Unwirksam** in AGB für Vorsatz, grobe Fahrlässigkeit, Personenschäden (§ 309 Nr. 7 BGB). Bei Individualvereinbarung B2B teilweise möglich, aber riskant.",
          whenProblem: "Klausel kippt; Standard-Haftung greift.",
          whenNegotiate: "Realistische Begrenzung statt Ausschluss.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "unbegrenzt", ausgewogen: "begrenzt_auftragswert", durchsetzungsstark: "begrenzt_auftragswert" }
    },

    // ── 3. Vertragsdauer und Kündigung ──
    {
      key: "term_termination",
      title: "Vertragsdauer und Kündigung",
      paragraph: "§ 4",
      description: "Standard-Optionen für unbefristete Verträge; bei Verbraucherverträgen besondere Vorgaben (§ 314 BGB; § 309 Nr. 9 BGB AGB-Verbote).",
      importance: "high",
      options: [
        {
          value: "einmalige_leistung",
          label: "Einmalige Leistung — keine ordentliche Kündigung",
          description: "Vertrag endet mit Erfüllung; nur außerordentliche Kündigung (§ 314 BGB).",
          risk: "low",
          riskNote: "Klare Lösung bei einmaligen Geschäften.",
          whenProblem: "Bei Dauerschuldverhältnis-Charakter unklar.",
          whenNegotiate: "Nur bei wirklich einmaligen Leistungen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "monatlich_4wochen",
          label: "Beidseitige ordentliche Kündigung mit 4 Wochen Frist zum Monatsende",
          description: "Markttypisch; faire Symmetrie.",
          risk: "low",
          riskNote: "Gerichtsfest; § 309 Nr. 9 BGB AGB-konform.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlen für Standard-Dienstleistungen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "quartalsende_3monate",
          label: "Kündigung mit 3 Monaten Frist zum Quartalsende",
          description: "Längere Bindung; mehr Planungssicherheit für die Gegenseite.",
          risk: "medium",
          riskNote: "Bei B2C: § 309 Nr. 9a BGB — max. 2 Jahre Erstlaufzeit, max. 1 Jahr Verlängerung, max. 3 Monate Frist (Faire-Verbraucherverträge-Gesetz, in Kraft seit 01.03.2022).",
          whenProblem: "B2C-Verstoß = Klausel unwirksam.",
          whenNegotiate: "Bei B2C kürzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "nicht_kuendbar_zeit",
          label: "Feste Laufzeit, ordentliche Kündigung ausgeschlossen",
          description: "Festes Ende; nur außerordentliche Kündigung möglich.",
          risk: "medium",
          riskNote: "Klar planbar. Bei B2C max. 2 Jahre + automatische Verlängerung max. 1 Jahr (§ 309 Nr. 9 BGB).",
          whenProblem: "Wenn eine Partei sich vorzeitig lösen will — § 314 BGB als einziger Ausweg, hohe Hürde.",
          whenNegotiate: "B2C-Grenzen prüfen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "nicht_kuendbar_zeit", ausgewogen: "monatlich_4wochen", durchsetzungsstark: "monatlich_4wochen" }
    },

    // ── 4. Geheimhaltung / Vertraulichkeit ──
    {
      key: "confidentiality",
      title: "Geheimhaltung / Vertraulichkeit",
      paragraph: "§ 5",
      description: "GeschGehG: Schutz nur bei 'angemessenen Geheimhaltungsmaßnahmen' (§ 2 Nr. 1 lit. b). Bei reinen Standardverträgen ohne sensible Inhalte oft entbehrlich.",
      importance: "medium",
      options: [
        {
          value: "keine",
          label: "Keine spezielle Klausel",
          description: "Verweis auf gesetzliche Treuepflicht (§ 241 Abs. 2 BGB).",
          risk: "medium",
          riskNote: "GeschGehG-Schutz nur bei 'angemessenen Maßnahmen' — ohne Vertragsklausel selten erfüllt.",
          whenProblem: "Wenn vertrauliche Infos durchsickern — Beweisproblem.",
          whenNegotiate: "Mindestens kurze Vertraulichkeitsklausel.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "standard_3jahre",
          label: "Gegenseitige Vertraulichkeit, 3 Jahre nachvertraglich",
          description: "Marktüblich, fair.",
          risk: "low",
          riskNote: "Praxistauglich; gerichtsfest.",
          whenProblem: "Selten.",
          whenNegotiate: "Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "streng_5jahre_strafe",
          label: "Strenge einseitige Geheimhaltung mit Vertragsstrafe (5 Jahre)",
          description: "Eine Partei besonders pflichtig; Vertragsstrafe pro Verstoß.",
          risk: "medium",
          riskNote: "§ 343 BGB Reduktionsrecht; § 309 Nr. 6 BGB AGB-Grenzen für pauschale Schadensersatz.",
          whenProblem: "Vertragsstrafe-Höhe überzogen — Gericht reduziert.",
          whenNegotiate: "Höhe an typischen Schaden orientieren (10.000–50.000 EUR).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "unbefristet",
          label: "Unbefristete Geheimhaltung",
          description: "Pflicht endet nie.",
          risk: "high",
          riskNote: "In AGB i.d.R. unwirksam wegen unangemessener Benachteiligung (§ 307 BGB); BGH-Tendenz: max. 5–7 Jahre.",
          whenProblem: "Klausel kippt; ggf. Reduzierung.",
          whenNegotiate: "Auf 5 Jahre kürzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "streng_5jahre_strafe", ausgewogen: "standard_3jahre", durchsetzungsstark: "keine" }
    },

    // ── 5. Datenschutz (DSGVO) ──
    {
      key: "data_protection",
      title: "Datenschutz (DSGVO)",
      paragraph: "§ 6",
      description: "Pflicht bei jeder Verarbeitung personenbezogener Daten (Art. 4 Nr. 1 DSGVO). AVV nach Art. 28 DSGVO bei Auftragsverarbeitung.",
      importance: "medium",
      options: [
        {
          value: "keine_pers_daten",
          label: "Keine Verarbeitung personenbezogener Daten",
          description: "Vertrag berührt keine DSGVO-relevanten Daten.",
          risk: "low",
          riskNote: "Nur korrekt, wenn Aussage tatsächlich stimmt. Bei Geschäftspartner-Daten (Name, E-Mail, Tel) bereits DSGVO-relevant.",
          whenProblem: "Falsche Annahme — DSGVO-Verstoß bei tatsächlicher Verarbeitung.",
          whenNegotiate: "Realität prüfen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "verweis_avv_separat",
          label: "Verweis auf separate AVV",
          description: "'Soweit personenbezogene Daten verarbeitet werden, schließen die Parteien eine AVV nach Art. 28 DSGVO.'",
          risk: "low",
          riskNote: "Klare Trennung Hauptvertrag/AVV. Bei B2B-Standard.",
          whenProblem: "Wenn AVV nie geschlossen wird — Lücke.",
          whenNegotiate: "AVV-Vorlage gleich beifügen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "avv_inline",
          label: "AVV inline (Vertragsbestandteil)",
          description: "Art. 28 DSGVO-Klauseln direkt im Vertrag.",
          risk: "low",
          riskNote: "Eine Datei, alles geregelt. Bei standardisierten Tools praktikabel.",
          whenProblem: "Vertrag wird länger und unübersichtlicher.",
          whenNegotiate: "Bei komplexen Verarbeitungen separates Dokument.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "tom_anhang",
          label: "TOMs in Anhang (Art. 32 DSGVO)",
          description: "Technische und organisatorische Maßnahmen als Anhang.",
          risk: "low",
          riskNote: "Pflicht bei AVV; nachweisbar.",
          whenProblem: "Erfordert konkrete Beschreibung.",
          whenNegotiate: "TOM-Standardvorlage nutzen (z.B. BSI Grundschutz).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "avv_inline", ausgewogen: "verweis_avv_separat", durchsetzungsstark: "verweis_avv_separat" }
    },

    // ── 6. Schriftform und Vertragsänderungen ──
    {
      key: "form_changes",
      title: "Schriftform und Vertragsänderungen",
      paragraph: "§ 7",
      description: "§ 126 BGB Schriftform vs. § 126b BGB Textform. Doppelte Schriftformklauseln sind in AGB nach BGH NJW 2008, 2256 unwirksam.",
      importance: "medium",
      options: [
        {
          value: "text_form_zulaessig",
          label: "Textform reicht (E-Mail genügt)",
          description: "§ 126b BGB; pragmatisch.",
          risk: "low",
          riskNote: "Schnell, modern. Bei Streit Beweissituation klar (E-Mail-Verlauf).",
          whenProblem: "Wenn Mündliches als verbindlich ausgegeben wird.",
          whenNegotiate: "Klausel 'Mündliche Nebenabreden bestehen nicht'.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "schriftform_aenderungen",
          label: "Schriftform für Änderungen (eigenhändige Unterschrift)",
          description: "Änderungen nur mit Original-Unterschrift wirksam.",
          risk: "low",
          riskNote: "Erhöhte Beweissicherheit.",
          whenProblem: "Im modernen Geschäftsverkehr unpraktisch.",
          whenNegotiate: "'Textform' als Alternative zulassen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "qualifizierte_signatur",
          label: "Qualifizierte elektronische Signatur (eIDAS)",
          description: "Nur QES (§ 126a BGB) als Schriftform-Ersatz.",
          risk: "low",
          riskNote: "Höchste Beweissicherheit; gerichtsfest. Aber: User-Aufwand (eID/DocuSign Advanced).",
          whenProblem: "Bei kleinen Vereinbarungen unverhältnismäßig.",
          whenNegotiate: "Bei großen Verträgen Standard.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "doppelte_schriftform",
          label: "Doppelte Schriftformklausel ('Schriftform-Erfordernis selbst nur schriftlich aufhebbar')",
          description: "Verschärfung — auch das Schriftform-Erfordernis ist nur schriftlich aufhebbar.",
          risk: "high",
          riskNote: "**In AGB unwirksam** (BGH NJW 2008, 2256 — überraschend nach § 305c BGB; bei Individualvereinbarung wirksam).",
          whenProblem: "Klausel kippt in AGB.",
          whenNegotiate: "Bei AGB-Vertrag ersetzen durch einfache Schriftform.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "qualifizierte_signatur", ausgewogen: "schriftform_aenderungen", durchsetzungsstark: "text_form_zulaessig" }
    },

    // ── 7. Streitbeilegung und Gerichtsstand ──
    {
      key: "dispute_jurisdiction",
      title: "Streitbeilegung und Gerichtsstand",
      paragraph: "§ 8",
      description: "§ 38 ZPO Gerichtsstandvereinbarung in B2B; bei B2C zwingend Wohnsitz Verbraucher (§ 29 ZPO + § 38 ZPO Abs. 2).",
      importance: "medium",
      options: [
        {
          value: "gesetzlich_beklagter",
          label: "Gesetzlicher Gerichtsstand am Sitz des Beklagten",
          description: "§ 12 ZPO Standard.",
          risk: "low",
          riskNote: "Fairste Lösung. Bei B2C zwingend.",
          whenProblem: "Bei großem Sitzunterschied lange Wege.",
          whenNegotiate: "Selten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "partyA_sitz",
          label: "Sitz der Partei A",
          description: "Vorteil für Partei A.",
          risk: "medium",
          riskNote: "In B2B zulässig (§ 38 ZPO); bei B2C unwirksam.",
          whenProblem: "B-Sicht: Reisen, höherer Aufwand.",
          whenNegotiate: "B: gegnerisches Sitzgericht oder Mediation verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mediation_dann_gericht",
          label: "Verpflichtende Mediation, dann ordentliches Gericht",
          description: "3 Monate Mediation vor Klage.",
          risk: "low",
          riskNote: "Marktstandard für partnerschaftliche Strukturen.",
          whenProblem: "Wenn eine Partei blockiert — Verzögerung.",
          whenNegotiate: "Klare Frist.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "schiedsgericht",
          label: "Schiedsgericht (DIS / nach Vereinbarung)",
          description: "Vertraulich, schnell, fachlich. § 1031 ZPO Schriftform Pflicht.",
          risk: "medium",
          riskNote: "Hohe Verfahrenskosten (10–20 % Streitwert); keine Berufung.",
          whenProblem: "Bei kleinem Streitwert unverhältnismäßig.",
          whenNegotiate: "Nur bei großen Streitwerten / vertraulichen Inhalten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "partyA_sitz", ausgewogen: "gesetzlich_beklagter", durchsetzungsstark: "gesetzlich_beklagter" }
    },

    // ── 8. Schlussbestimmungen ──
    {
      key: "final_provisions",
      title: "Schlussbestimmungen (Salvatorische Klausel + anwendbares Recht)",
      paragraph: "§ 9",
      description: "Salvatorische Klausel — § 306 BGB ohnehin als Default. BGH NJW 1997, 3434: Salvatorische Klauseln in AGB nur eingeschränkt wirksam.",
      importance: "medium",
      options: [
        {
          value: "minimal",
          label: "Standard-Salvatorisch + anwendbares deutsches Recht",
          description: "'Sollte eine Bestimmung unwirksam sein, bleibt der Rest wirksam. Es gilt deutsches Recht.'",
          risk: "low",
          riskNote: "Gesetzlicher Grundsatz; klar und üblich.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "mit_anpassungspflicht",
          label: "Salvatorisch + Pflicht zur einvernehmlichen Anpassung",
          description: "'Die unwirksame Klausel wird durch eine wirtschaftlich gleichwertige ersetzt; falls die Parteien sich nicht einigen, gilt das dispositive Recht.'",
          risk: "low",
          riskNote: "Praxisnah; vermeidet rechtliche Lücken.",
          whenProblem: "Wenn Parteien sich nicht einig werden — § 306 BGB greift dann.",
          whenNegotiate: "Standardlösung.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "keine_klausel",
          label: "Keine salvatorische Klausel",
          description: "Reines Vertragstextende ohne Salvatorisch-Regel.",
          risk: "medium",
          riskNote: "Bei Unwirksamkeit einer Klausel greift § 306 BGB automatisch — dispositives Recht ersetzt. Manchmal vorteilhaft.",
          whenProblem: "Lücke fühlt sich für den Laien wie ein Loch im Vertrag an.",
          whenNegotiate: "Standardklausel einbauen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_verweis_dsgvo",
          label: "Standard + ausdrücklicher Verweis auf DSGVO + Verbraucherschutz",
          description: "Erinnert daran, dass zwingendes Recht Vorrang hat.",
          risk: "low",
          riskNote: "Klar und transparent.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlen bei B2C-/DSGVO-Bezug.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mit_anpassungspflicht", ausgewogen: "minimal", durchsetzungsstark: "minimal" }
    }
  ]
};

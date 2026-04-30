// Darlehensvertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Recherche-Doc: docs/playbooks/darlehensvertrag.md

module.exports = {
  type: "darlehensvertrag",
  title: "Darlehensvertrag",
  description: "Regle die Vergabe eines Darlehens rechtssicher: Zinsen, Tilgung, Sicherheiten und Kündigungsrechte zwischen Darlehensgeber und Darlehensnehmer.",
  icon: "banknote",
  difficulty: "komplex",
  estimatedTime: "12–18 Minuten",
  legalBasis: "BGB §§ 488–505d (insb. § 489, § 495, § 498, § 500, § 502); KWG §§ 1, 32, 54; PAngV (Effektivzins); EGBGB Art. 247 (Pflichtangaben Verbraucherdarlehen); ErbStG (Schenkungssteuer bei zinslosen Darlehen)",

  // Rollen-Definition
  roles: {
    A: { key: "darlehensgeber", label: "Darlehensgeber", description: "Stellt das Geld zur Verfügung und hat einen Rückzahlungsanspruch nebst Zinsen. Trägt das Ausfallrisiko." },
    B: { key: "darlehensnehmer", label: "Darlehensnehmer", description: "Erhält das Geld zur Verwendung und schuldet Rückzahlung + Zinsen. Trägt die Zinslast und ggf. Sicherheitenrisiko." }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Darlehensgeber — mehrere Sicherheiten, strenger Verwendungszweck, Sofort-Kündigung bei Verzug, Vorfälligkeitsentschädigung am gesetzlichen Maximum",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — angemessene Sicherheit, Standard-Verzugsregelung (2 Raten / 10 % Rückstand), Vorfälligkeit nach gesetzlicher Mindesthöhe",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Darlehensnehmer — keine oder minimale Sicherheiten, weite Kündigungsrechte, Reduzierung/Ausschluss der Vorfälligkeitsentschädigung soweit zulässig",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    // Darlehensgeber
    { key: "partyA_name", label: "Name / Firma (Darlehensgeber)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Adresse", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertreten durch", type: "text", required: false, group: "partyA" },
    { key: "partyA_iban", label: "IBAN für Auszahlung/Rückzahlung", type: "text", required: false, group: "partyA",
      placeholder: "DE..." },

    // Darlehensnehmer
    { key: "partyB_name", label: "Name / Firma (Darlehensnehmer)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Adresse", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_representative", label: "Vertreten durch", type: "text", required: false, group: "partyB" },
    { key: "partyB_birth_date", label: "Geburtsdatum (bei Privatperson)", type: "date", required: false, group: "partyB" },

    // Kontext
    { key: "loan_type", label: "Art des Darlehens", type: "select", required: true, group: "context",
      options: [
        { value: "private", label: "Privatdarlehen (zwei Privatpersonen, einmalig)" },
        { value: "business", label: "Geschäftsdarlehen (B2B)" },
        { value: "consumer", label: "Verbraucherdarlehen (Unternehmer → Verbraucher) — Pflichtangaben gelten!" }
      ]
    },
    { key: "loan_amount", label: "Darlehensbetrag (EUR)", type: "number", required: true, group: "context",
      placeholder: "z.B. 50000" },
    { key: "purpose", label: "Verwendungszweck", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Zwischenfinanzierung Betriebsmittel, Kauf eines Fahrzeugs, ..." },
    { key: "disbursement_date", label: "Auszahlungsdatum", type: "date", required: true, group: "context" },
    { key: "loan_duration_months", label: "Laufzeit in Monaten", type: "number", required: true, group: "context",
      placeholder: "z.B. 60" }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Darlehensbetrag & Auszahlung ──
    {
      key: "disbursement",
      title: "Darlehensbetrag und Auszahlung",
      paragraph: "§ 2",
      description: "Wann und wie wird der Darlehensbetrag ausgezahlt? Auf einmal, in Tranchen, gegen Vorlage von Nachweisen?",
      importance: "critical",
      options: [
        {
          value: "lump_sum",
          label: "Vollauszahlung in einer Summe",
          description: "Der gesamte Betrag wird zu einem festen Termin auf das Konto des Nehmers überwiesen.",
          risk: "low",
          riskNote: "Schnell und unkompliziert; Geber trägt sofort vollständiges Ausfallrisiko.",
          whenProblem: "Bei Insolvenz oder Zweckverfehlung Nehmer — Geber hat keinen Zugriff mehr auf den Betrag.",
          whenNegotiate: "Geber: Tranchen vorschlagen wenn Projekt-/Investitionsfinanzierung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "tranches_milestone",
          label: "Tranchen gegen Meilensteine",
          description: "Auszahlung in Teilbeträgen, jeweils nach Erreichen vereinbarter Meilensteine (z.B. Bauphasen).",
          risk: "low",
          riskNote: "Schutz für Geber bei Projektfinanzierungen — Auszahlung nur bei Fortschritt.",
          whenProblem: "Bei Projektverzögerung — Nehmer in Liquiditätsengpass.",
          whenNegotiate: "Nehmer: realistische Meilensteine fixieren, klare Nachweispflichten.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "tranches_fixed_dates",
          label: "Tranchen zu festen Daten",
          description: "Auszahlung in Teilbeträgen zu vorab fixierten Kalenderdaten.",
          risk: "low",
          riskNote: "Planbarkeit, aber unflexibel wenn Bedarf später entsteht.",
          whenProblem: "Wenn Mittelbedarf abweicht von Auszahlungsplan.",
          whenNegotiate: "Beide: Anpassungsklausel bei begründeter Anforderung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "on_demand",
          label: "Auf Abruf innerhalb Zeitfenster",
          description: "Nehmer kann den Betrag innerhalb eines Zeitfensters (z.B. 6 Monate) abrufen.",
          risk: "medium",
          riskNote: "Hohe Flexibilität für Nehmer, Bereitstellungszinsen oft fällig.",
          whenProblem: "Geber: muss Mittel bereithalten, aber bekommt evtl. nur Bereitstellungszins statt vollem Sollzins.",
          whenNegotiate: "Geber: Bereitstellungsprovision (z.B. 0,25 % p.a.) klar regeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "tranches_milestone", ausgewogen: "lump_sum", durchsetzungsstark: "on_demand" }
    },

    // ── 2. Zinssatz und Zinsbindung ──
    {
      key: "interest_rate",
      title: "Zinssatz und Zinsbindung",
      paragraph: "§ 3",
      description: "Festzins, variabler Zins oder zinslos? Wenn variabel: an welchen Referenzzinssatz gebunden?",
      importance: "critical",
      options: [
        {
          value: "zero_interest",
          label: "Zinslos",
          description: "Kein Zins — z.B. typisches Familiendarlehen.",
          risk: "high",
          riskNote: "Steuerlich kritisch: Schenkungssteuer ab 20.000 EUR bei Nicht-Verwandten (§ 16 ErbStG); BFH erkennt zinslose Darlehen unter Verwandten nur bei Fremdvergleich an.",
          whenProblem: "Bei Nicht-Angehörigen droht Schenkungssteuer auf den ersparten Marktzins.",
          whenNegotiate: "Beide: lieber Mindestzins (1–2 %) zur steuerlichen Absicherung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "fixed_rate",
          label: "Festzins über gesamte Laufzeit",
          description: "Sollzinssatz wird einmalig fixiert, gilt unverändert bis Vertragsende.",
          risk: "low",
          riskNote: "Planbarkeit für beide Seiten. Bei Verbraucherdarlehen: gesetzliche Sonderkündigung nach 10 Jahren (§ 489 BGB) automatisch.",
          whenProblem: "Bei Marktzinsanstieg verliert Geber, bei Marktzinsrückgang verliert Nehmer.",
          whenNegotiate: "Beide: Vorfälligkeitsentschädigung-Rahmen klären.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "variable_rate",
          label: "Variabel (mit Referenzzins)",
          description: "Anbindung an Euribor 3M / EZB-Hauptrefinanzierungssatz + Aufschlag, regelmäßige Anpassung.",
          risk: "medium",
          riskNote: "Zinsänderungsklausel muss 'transparent und verständlich' sein (BGH XI ZR 78/08). Reine 'Anpassung nach billigem Ermessen' nach § 315 BGB ist AGB-rechtlich problematisch.",
          whenProblem: "Wenn Referenzzins steigt, kann Nehmer in Liquiditätsengpass geraten.",
          whenNegotiate: "Nehmer: Cap (Zinsobergrenze) verhandeln, um Risiko zu begrenzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "step_rate",
          label: "Gestufter Festzins (Zinsstaffel)",
          description: "Unterschiedliche Festzinsen für definierte Phasen (z.B. 3 % Jahre 1–2, 4 % Jahre 3–5).",
          risk: "medium",
          riskNote: "Bei Verbraucherdarlehen müssen alle Zinsstufen im Vertrag konkret beziffert sein.",
          whenProblem: "Wenn Zinsstufen nicht klar im Vertrag stehen — Pflichtangabenverstoß bei Verbraucherdarlehen.",
          whenNegotiate: "Beide: ausreichende Detailtiefe sicherstellen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "fixed_rate", ausgewogen: "fixed_rate", durchsetzungsstark: "variable_rate" }
    },

    // ── 3. Effektivzins (nur Verbraucherdarlehen) ──
    {
      key: "effective_rate",
      title: "Effektivzins (nur Verbraucherdarlehen)",
      paragraph: "§ 3a",
      description: "Bei Verbraucherdarlehen muss der Effektivzins gemäß PAngV ausgewiesen werden. Wie wird er berechnet/dargestellt?",
      importance: "critical",
      options: [
        {
          value: "pangv_with_calculation",
          label: "Effektivzins + nachvollziehbare Berechnung",
          description: "Effektivzins inkl. aller Nebenkosten + transparente Erläuterung der Berechnungsbasis.",
          risk: "low",
          riskNote: "Erfüllt PAngV vollständig, schützt vor Wegfall des Vorfälligkeitsanspruchs (BGH XI ZR 22/24, 20.05.2025).",
          whenProblem: "Selten — höchste Rechtssicherheit.",
          whenNegotiate: "Geber: immer wählen — schützt eigenen Anspruch.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "pangv_only",
          label: "Nur Effektivzins-Angabe",
          description: "Effektivzins wird ausgewiesen, ohne ausführliche Erläuterung.",
          risk: "medium",
          riskNote: "Mindesterfüllung, aber angesichts der jüngsten BGH-Rechtsprechung (XI ZR 75/23, 03.12.2024) riskant — Klage wegen unzureichender Angaben möglich.",
          whenProblem: "Wenn der Nehmer später vorzeitig zurückzahlen will und der Geber Vorfälligkeit verlangt — bei lückenhaften Pflichtangaben verliert der Geber den Anspruch komplett.",
          whenNegotiate: "Vermeiden — Berechnung ergänzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "not_applicable",
          label: "Nicht anwendbar (kein Verbraucherdarlehen)",
          description: "Sektion entfällt, da reines B2B- oder Privatdarlehen.",
          risk: "low",
          riskNote: "PAngV greift nur bei Verbraucherdarlehen.",
          whenProblem: "Nicht relevant.",
          whenNegotiate: "Nicht verhandelbar — Sachfrage.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "pangv_with_calculation", ausgewogen: "pangv_with_calculation", durchsetzungsstark: "pangv_with_calculation" }
    },

    // ── 4. Tilgungsstruktur ──
    {
      key: "repayment_structure",
      title: "Tilgungsstruktur",
      paragraph: "§ 4",
      description: "Wie wird das Darlehen zurückgezahlt? Annuität, endfällig, Tilgungsdarlehen oder freie Tilgung?",
      importance: "critical",
      options: [
        {
          value: "annuity",
          label: "Annuitätendarlehen",
          description: "Konstante monatliche Rate aus Zins- und Tilgungsanteil; Tilgungsanteil steigt im Zeitverlauf.",
          risk: "low",
          riskNote: "Marktstandard; gut planbar; Anfangsrisiko: hoher Zinsanteil = langsamer Schuldenabbau.",
          whenProblem: "Bei Zinsanstieg (variabel): Rate kann unbezahlbar werden.",
          whenNegotiate: "Beide: Sondertilgungsrechte einbauen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "linear",
          label: "Tilgungsdarlehen (linear)",
          description: "Konstanter Tilgungsanteil, dadurch sinkende Gesamtrate. Geber erhält schneller Kapital zurück.",
          risk: "low",
          riskNote: "Schnellerer Zinsabbau; höhere Anfangsbelastung für Nehmer.",
          whenProblem: "Anfangsbelastung kann Liquidität des Nehmers überfordern.",
          whenNegotiate: "Nehmer: tilgungsfreie Anlaufphase verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "bullet",
          label: "Endfälliges Darlehen",
          description: "Während Laufzeit nur Zinsen, Tilgung in einer Summe am Ende.",
          risk: "high",
          riskNote: "Hohes Refinanzierungsrisiko am Ende — Nehmer muss neue Mittel besorgen oder wird zahlungsunfähig.",
          whenProblem: "Wenn am Laufzeitende keine Anschlussfinanzierung möglich → Notverkauf von Sicherheiten.",
          whenNegotiate: "Geber: Sicherheit in voller Höhe verlangen + Nachweis über Tilgungsersatzinstrument.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "free_repayment",
          label: "Freie Tilgung",
          description: "Keine festen Raten — Nehmer tilgt nach Liquiditätslage.",
          risk: "high",
          riskNote: "Faktisch Stundungs-Option für Nehmer, Planungsunsicherheit für Geber.",
          whenProblem: "Verhindert beim Geber jegliche Cashflow-Planung; bei Verbraucherdarlehen außerdem PAngV-rechtlich problematisch (Effektivzins schwer berechenbar).",
          whenNegotiate: "Geber: Mindestraten festlegen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "linear", ausgewogen: "annuity", durchsetzungsstark: "annuity" }
    },

    // ── 5. Sicherheiten ──
    {
      key: "collateral",
      title: "Sicherheiten",
      paragraph: "§ 5",
      description: "Welche Sicherheiten stellt der Nehmer? Bürgschaft, Grundschuld, Sicherungsabtretung — oder keine?",
      importance: "critical",
      options: [
        {
          value: "none",
          label: "Keine Sicherheit (Blanko)",
          description: "Reines Vertrauensdarlehen, kein Sicherungsmittel.",
          risk: "high",
          riskNote: "Bei Privatdarlehen unter Vertrauten üblich; bei höheren Beträgen und Geschäftsdarlehen riskant. Im Insolvenzfall: einfache Insolvenzforderung ohne Vorrang.",
          whenProblem: "Bei Insolvenz Nehmer — Geber erhält oft nur Quote (5–15 %).",
          whenNegotiate: "Geber: zumindest Lohn- oder Forderungsabtretung verlangen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "personal_guarantee",
          label: "Bürgschaft (Personal)",
          description: "Dritter (z.B. Geschäftsführer, Gesellschafter, Familienangehöriger) haftet persönlich. Schriftform zwingend (§ 766 BGB).",
          risk: "high",
          riskNote: "Vorsicht bei nahen Angehörigen! BGH XI ZR 33/08: Bürgschaft naher Angehöriger ist sittenwidrig (§ 138 BGB), wenn der Bürge krass finanziell überfordert ist und eine emotionale Bindung besteht.",
          whenProblem: "Wenn Bürge naher Angehöriger ist und eigenes Einkommen pfändbar nicht einmal die Zinsen deckt → Vermutung der Sittenwidrigkeit (Beweislast beim Gläubiger zur Widerlegung).",
          whenNegotiate: "Nehmer/Bürge: auf Höchstbetrags-Bürgschaft beschränken statt unbeschränkt; selbstschuldnerisch vs. Ausfall (Letzteres günstiger für Bürgen).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "property_lien",
          label: "Grundschuld / Hypothek",
          description: "Dingliche Sicherheit am Grundstück, im Grundbuch eingetragen. Notarielle Beurkundung Pflicht.",
          risk: "low",
          riskNote: "Stärkste Sicherheit. Nachteile: Notarkosten, Grundbuchgebühren, ca. 1–2 % des Sicherungsbetrags. Bei Immobiliar-Verbraucherdarlehen Pflichtangaben nach Art. 247 § 6 EGBGB.",
          whenProblem: "Bei Verwertung in der Krise oft nur 60–70 % des Verkehrswerts erzielbar.",
          whenNegotiate: "Nehmer: Brieflos oder Buchgrundschuld; Rangstelle (1. Rang vs. nachrangig).",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "assignment_pledge",
          label: "Sicherungsabtretung / Pfandrecht",
          description: "Forderungen, Lebensversicherung, Wertpapiere oder Sachen werden zur Sicherheit übertragen/verpfändet.",
          risk: "medium",
          riskNote: "Bei Lebensversicherung: Versicherer muss informiert werden (§ 1280 BGB). Bei Forderungen: stille oder offene Abtretung.",
          whenProblem: "Bei Wertverlust der abgetretenen Forderungen — Sicherheit wirkungslos.",
          whenNegotiate: "Geber: Werthaltung der Sicherheit regelmäßig prüfen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "property_lien", ausgewogen: "property_lien", durchsetzungsstark: "none" }
    },

    // ── 6. Verzugsregelung ──
    {
      key: "default_handling",
      title: "Verzugsregelung",
      paragraph: "§ 6",
      description: "Wann tritt Verzug ein und welche Folgen hat er? Verzugszinsen, Mahnkosten, Kündigungsrechte.",
      importance: "high",
      options: [
        {
          value: "statutory",
          label: "Gesetzlich (BGB-Default)",
          description: "§ 286 BGB: Verzug nach Mahnung oder Fälligkeit + 30 Tage; Verzugszinsen § 288 BGB (5 %-Punkte über Basiszins, B2B 9 %-Punkte).",
          risk: "low",
          riskNote: "Marktstandard, AGB-rechtlich unangreifbar.",
          whenProblem: "Selten — entspricht gesetzlichem Standard.",
          whenNegotiate: "Direkt akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "strict_immediate",
          label: "Sofort-Verzug + erhöhte Zinsen",
          description: "Verzug ohne Mahnung ab Fälligkeit, Verzugszins maximal nach gesetzlichem Rahmen, Mahnkostenpauschale.",
          risk: "medium",
          riskNote: "AGB-rechtlich problematisch — § 309 Nr. 5 BGB bei pauschalen Mahnkosten.",
          whenProblem: "Bei B2C-Verträgen Klausel oft unwirksam — automatischer Rückfall auf gesetzlichen Standard.",
          whenNegotiate: "Nehmer: Karenzfrist und realistische Mahnkostenpauschale verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "lenient_grace",
          label: "Karenzfrist 14 Tage",
          description: "Verzug erst nach 14-tägiger Karenzfrist nach Mahnung; reduzierter Verzugszins (z.B. nur 3 % über Basis).",
          risk: "medium",
          riskNote: "Großzügig, faktisch Verlängerung der Schwelle für Geber.",
          whenProblem: "Geber: längere Liquiditätslücke bei Zahlungsverzug.",
          whenNegotiate: "Geber: Karenz auf 7 Tage kürzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "default_acceleration",
          label: "Vorzeitige Fälligkeit ab 2 Raten",
          description: "Bei Rückstand mit 2 Raten oder 10 % Gesamtsumme: gesamte Restschuld sofort fällig.",
          risk: "medium",
          riskNote: "Gesetzlich erlaubt bei Verbraucherdarlehen nur unter Bedingungen § 498 BGB (Rückstand mit mind. 10 % bzw. 5 % bei Laufzeit > 3 J., zweimaliger Verzug, 2-Wochen-Frist mit Kündigungsandrohung).",
          whenProblem: "Bei Verbraucherdarlehen ohne Einhaltung von § 498 BGB unwirksam — Geber verliert Vorzeitige Fälligkeit.",
          whenNegotiate: "Nehmer: genaue § 498 BGB-Schwellen einfordern.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "default_acceleration", ausgewogen: "statutory", durchsetzungsstark: "lenient_grace" }
    },

    // ── 7. Vorzeitige Rückzahlung & Vorfälligkeit ──
    {
      key: "early_repayment",
      title: "Vorzeitige Rückzahlung und Vorfälligkeitsentschädigung",
      paragraph: "§ 7",
      description: "Darf der Nehmer das Darlehen vorzeitig zurückzahlen — und welche Entschädigung muss er dafür leisten?",
      importance: "high",
      options: [
        {
          value: "excluded",
          label: "Ausgeschlossen während Laufzeit",
          description: "Vorzeitige Rückzahlung nur mit Zustimmung des Gebers. Nicht zulässig bei Verbraucherdarlehen!",
          risk: "high",
          riskNote: "Bei Verbraucherdarlehen unzulässig — § 500 Abs. 2 BGB gewährt Verbrauchern unverzichtbares Recht zur jederzeitigen Rückzahlung.",
          whenProblem: "Bei Verbraucherdarlehen → Klausel nichtig, Nehmer kann trotzdem jederzeit zurückzahlen.",
          whenNegotiate: "Vermeiden bei Verbraucherdarlehen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "with_max_compensation",
          label: "Erlaubt mit gesetzlichem Maximum",
          description: "Bei Allgemein-VKD: 1 % (Restlaufzeit > 1 Jahr) bzw. 0,5 % (≤ 1 Jahr) des Rückzahlungsbetrags (§ 502 Abs. 3 BGB). Bei Immobiliar-VKD: tatsächlicher Schaden des Gebers (Aktiv-Passiv-Methode).",
          risk: "low",
          riskNote: "Sicherstes Modell für Geber. Wichtig: Berechnungsmethode muss nach BGH XI ZR 22/24 ausreichend transparent dargelegt sein, sonst Wegfall des Anspruchs (§ 502 Abs. 2 Nr. 2 BGB).",
          whenProblem: "Bei unzureichenden Pflichtangaben gemäß Art. 247 EGBGB → vollständiger Wegfall des Vorfälligkeitsanspruchs.",
          whenNegotiate: "Geber: Berechnungsformel transparent darlegen.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "with_reduced_compensation",
          label: "Erlaubt mit reduzierter Entschädigung",
          description: "Niedriger als gesetzliches Maximum (z.B. nur 0,5 % bzw. 0,25 %).",
          risk: "low",
          riskNote: "Pro-Nehmer-Variante, marktüblich bei Konditionswettbewerb.",
          whenProblem: "Geber: weniger Schutz vor Wiederanlagerisiko.",
          whenNegotiate: "Geber: Aufschlag im Sollzins ausgleichend einrechnen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "free_anytime",
          label: "Jederzeit kostenfrei",
          description: "Keine Vorfälligkeitsentschädigung; Nehmer kann jederzeit ohne Zusatzkosten tilgen.",
          risk: "medium",
          riskNote: "Nehmer-freundlich; Geber trägt das Wiederanlagerisiko bei Zinsrückgang.",
          whenProblem: "Geber bei niedrigen Marktzinsen: schwierige Wiederanlage.",
          whenNegotiate: "Geber: höheren Sollzins als Kompensation.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "with_max_compensation", ausgewogen: "with_max_compensation", durchsetzungsstark: "free_anytime" }
    },

    // ── 8. Kündigung durch den Darlehensnehmer ──
    {
      key: "termination_borrower",
      title: "Kündigung durch den Darlehensnehmer",
      paragraph: "§ 8",
      description: "Welche Kündigungsrechte hat der Nehmer? Sonderkündigung nach § 489 BGB ist gesetzlich.",
      importance: "high",
      options: [
        {
          value: "statutory_only",
          label: "Nur gesetzliche Kündigungsrechte",
          description: "§ 489 BGB: nach 10 Jahren mit 6 Monaten Frist (Festzins); jederzeit bei variablem Zins mit 3 Monaten Frist.",
          risk: "low",
          riskNote: "Marktstandard. § 489 BGB ist zwingend (BGH IX ZR 50/22 vom 14.03.2023: gilt nicht für synthetische Festzinsdarlehen).",
          whenProblem: "Selten — entspricht gesetzlicher Standardregelung.",
          whenNegotiate: "Direkt akzeptabel.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "extended_5_years",
          label: "Vorzeitige Kündigung nach 5 Jahren",
          description: "Vertragliche Erweiterung: Kündigung schon nach 5 Jahren mit 6 Monaten Frist.",
          risk: "low",
          riskNote: "Nehmer-freundlich; Geber verliert Planbarkeit.",
          whenProblem: "Geber: Wiederanlagerisiko früher als geplant.",
          whenNegotiate: "Geber: Vorfälligkeitsentschädigung für die ersten 5 Jahre einbauen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "anytime_3_months",
          label: "Jederzeit mit 3 Monaten Frist",
          description: "Nehmer kann jederzeit mit 3-monatiger Frist kündigen, ggf. gegen Vorfälligkeit.",
          risk: "medium",
          riskNote: "Maximale Flexibilität für Nehmer.",
          whenProblem: "Geber: nahezu unkalkulierbare Cashflows.",
          whenNegotiate: "Geber: höhere Vorfälligkeit zur Kompensation.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "with_consent_only",
          label: "Nur mit Zustimmung des Gebers",
          description: "Außerhalb gesetzlicher Sonderkündigung nur einvernehmlich.",
          risk: "medium",
          riskNote: "Gegen § 489 BGB unwirksam — wirkt nur bezüglich darüber hinausgehender Kündigungsmöglichkeiten.",
          whenProblem: "Bei Verbraucherdarlehen weitestgehend wirkungslos.",
          whenNegotiate: "Vermeiden — gesetzliches Recht greift sowieso.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "statutory_only", ausgewogen: "statutory_only", durchsetzungsstark: "anytime_3_months" }
    },

    // ── 9. Kündigung durch den Darlehensgeber ──
    {
      key: "termination_lender",
      title: "Kündigung durch den Darlehensgeber (außerordentlich)",
      paragraph: "§ 9",
      description: "Wann kann der Geber außerordentlich kündigen — bei Verzug, Vermögensverschlechterung, Sicherheitenwertverlust?",
      importance: "high",
      options: [
        {
          value: "statutory_only",
          label: "Nur gesetzlich (§ 490 BGB)",
          description: "Außerordentliche Kündigung nur bei Vermögensverschlechterung des Nehmers oder Wertverlust einer Sicherheit, soweit dadurch Rückzahlung gefährdet wird.",
          risk: "low",
          riskNote: "§ 490 BGB ist zwingend — über Vertrag erweiterte Rechte sind möglich, aber bei AGB-Klauseln nach § 309 Nr. 4 BGB eingeschränkt.",
          whenProblem: "Geber: Reaktion oft erst zu spät möglich.",
          whenNegotiate: "Direkt akzeptabel als Mindeststandard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "extended_default",
          label: "Erweitert: schon ab 1. Rate Verzug",
          description: "Sofort-Kündigung möglich, sobald Nehmer mit erster Rate in Verzug.",
          risk: "high",
          riskNote: "Bei Verbraucherdarlehen wegen § 498 BGB unzulässig — dort gelten strenge Voraussetzungen (10 %/5 %-Schwellen + Mahnung).",
          whenProblem: "Bei Verbraucherdarlehen Klausel unwirksam — Rückfall auf § 498 BGB-Standard.",
          whenNegotiate: "Nehmer: § 498-Schwellen einfordern.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "material_breach_plus_2_rates",
          label: "Wesentliche Verletzung + 2 Raten Rückstand",
          description: "Kündigung bei zweimaligem Verzug, sonstigen Pflichtverletzungen oder wesentlicher Vermögensverschlechterung.",
          risk: "medium",
          riskNote: "Marktstandard B2B; bei B2C § 498 BGB beachten.",
          whenProblem: "Streit über 'wesentliche Pflichtverletzung'.",
          whenNegotiate: "Beide: Pflichtverletzungen konkret auflisten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "restricted_to_insolvency",
          label: "Nur bei Insolvenz",
          description: "Außerordentliche Kündigung nur bei Insolvenzverfahren oder Zahlungseinstellung.",
          risk: "high",
          riskNote: "Nehmer-freundlich; Geber riskiert späte Reaktion.",
          whenProblem: "Geber: bei Vermögensverschlechterung ohne Insolvenz keine Reaktion möglich.",
          whenNegotiate: "Geber: zumindest Sicherheitennachschuss-Recht ergänzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "extended_default", ausgewogen: "material_breach_plus_2_rates", durchsetzungsstark: "restricted_to_insolvency" }
    },

    // ── 10. Widerrufsrecht (nur Verbraucherdarlehen) ──
    {
      key: "right_of_withdrawal",
      title: "Widerrufsrecht (nur Verbraucherdarlehen)",
      paragraph: "§ 10",
      description: "Bei Verbraucherdarlehen besteht ein 14-tägiges Widerrufsrecht (§ 495 BGB). Wie wird es im Vertrag belehrt?",
      importance: "critical",
      options: [
        {
          value: "mustertext",
          label: "Mustertext nach Anlage 7 EGBGB",
          description: "Wortgenaue Übernahme der amtlichen Musterwiderrufsbelehrung — Gesetzlichkeitsfiktion (§ 360 BGB i.V.m. Art. 247 § 6 Abs. 2 EGBGB).",
          risk: "low",
          riskNote: "Dringend empfohlen. Bei Mustertext greift Gesetzlichkeitsfiktion — selbst bei späterer Reform geschützt.",
          whenProblem: "Selten — höchste Rechtssicherheit.",
          whenNegotiate: "Immer wählen.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "custom_compliant",
          label: "Eigener konformer Belehrungstext",
          description: "Selbstformulierte Belehrung, die alle Pflichtangaben enthält — höheres Anfechtungsrisiko bei Auslegung.",
          risk: "high",
          riskNote: "Riskant — bei kleinster Abweichung droht 'ewiges Widerrufsrecht' bzw. einmonatige verlängerte Frist nach Korrektur.",
          whenProblem: "Ein einziger missverständlicher Satz kann das Widerrufsrecht unbegrenzt offen halten — bei Allgemein-Verbraucherdarlehen bis zur Korrektur, dann 1 Monat (§ 356b Abs. 2 BGB).",
          whenNegotiate: "Vermeiden — Mustertext nutzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "not_applicable",
          label: "Nicht anwendbar (kein Verbraucherdarlehen)",
          description: "Sektion entfällt.",
          risk: "low",
          riskNote: "§ 495 BGB greift nur bei Verbraucherdarlehen.",
          whenProblem: "Nicht relevant.",
          whenNegotiate: "Nicht verhandelbar — Sachfrage.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mustertext", ausgewogen: "mustertext", durchsetzungsstark: "mustertext" }
    },

    // ── 11. Verwendungszweck-Bindung ──
    {
      key: "purpose_binding",
      title: "Verwendungszweck-Bindung",
      paragraph: "§ 11",
      description: "Ist der Nehmer an einen bestimmten Verwendungszweck gebunden? Welche Folgen hat eine zweckwidrige Verwendung?",
      importance: "medium",
      options: [
        {
          value: "strict_with_proof",
          label: "Streng zweckgebunden + Nachweispflicht",
          description: "Nehmer muss Verwendung nachweisen (Belege, Verträge). Zweckverstoß = außerordentliche Kündigung.",
          risk: "low",
          riskNote: "Geber-freundlich; klare Kontrolle über Mittelverwendung.",
          whenProblem: "Nehmer: zusätzlicher Verwaltungsaufwand bei Nachweispflichten.",
          whenNegotiate: "Nehmer: realistische Nachweisform (z.B. einmaliger Sammelnachweis).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "informational_only",
          label: "Zweck genannt, aber nicht bindend",
          description: "Verwendungszweck erwähnt, ohne rechtliche Bindung.",
          risk: "low",
          riskNote: "Marktstandard. Steuerlich ggf. relevant.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Direkt akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "free_use",
          label: "Freie Verwendung",
          description: "Nehmer entscheidet allein über Verwendung, keine Auskunftspflicht.",
          risk: "medium",
          riskNote: "Maximale Flexibilität für Nehmer.",
          whenProblem: "Geber: keinerlei Kontrolle über Risiko.",
          whenNegotiate: "Geber: zumindest negative Verwendungen ausschließen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "negative_only",
          label: "Negativliste (nicht für X)",
          description: "Bestimmte Verwendungen sind ausgeschlossen (z.B. Spielschulden, illegale Geschäfte).",
          risk: "low",
          riskNote: "Kompromiss zwischen Flexibilität und Mindeststandard.",
          whenProblem: "Selten Streit, sofern Liste klar.",
          whenNegotiate: "Beide: konkrete Beispiele aufnehmen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "strict_with_proof", ausgewogen: "informational_only", durchsetzungsstark: "free_use" }
    },

    // ── 12. Gerichtsstand & anwendbares Recht ──
    {
      key: "jurisdiction",
      title: "Gerichtsstand und anwendbares Recht",
      paragraph: "§ 12",
      description: "Welches Recht gilt und wo wird bei Streitigkeiten geklagt? Bei Verbraucherdarlehen: Gerichtsstand am Verbraucher-Wohnsitz zwingend.",
      importance: "medium",
      options: [
        {
          value: "party_a",
          label: "Sitz des Darlehensgebers",
          description: "Gerichtsstand am Sitz des Gebers. Deutsches Recht.",
          risk: "low",
          riskNote: "Geber-freundlich. Bei Verbraucherdarlehen unwirksam — § 29 ZPO + § 38 ZPO greifen.",
          whenProblem: "Nehmer muss anreisen.",
          whenNegotiate: "Nehmer: neutralen Gerichtsstand vorschlagen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "party_b",
          label: "Sitz des Darlehensnehmers",
          description: "Gerichtsstand am Sitz des Nehmers. Deutsches Recht.",
          risk: "medium",
          riskNote: "Nehmer-freundlich; bei Verbraucherdarlehen ohnehin gesetzlicher Gerichtsstand.",
          whenProblem: "Geber muss anreisen.",
          whenNegotiate: "Geber: Schiedsverfahren als Alternative.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "defendant",
          label: "Sitz des Beklagten (gesetzlich)",
          description: "§ 12 ZPO als Standard.",
          risk: "low",
          riskNote: "Fairste Lösung — entspricht der gesetzlichen Grundregel.",
          whenProblem: "Selten.",
          whenNegotiate: "Meist sofort akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "arbitration",
          label: "Schiedsverfahren (DIS)",
          description: "Schiedsgericht der Deutschen Institution für Schiedsgerichtsbarkeit; Vertraulichkeit, schnellere Verfahren.",
          risk: "medium",
          riskNote: "Bei Verbraucherdarlehen unzulässig (§ 1031 Abs. 5 ZPO — Schiedsvereinbarung nur in eigener Urkunde).",
          whenProblem: "Bei kleinen Streitwerten unverhältnismäßig teuer.",
          whenNegotiate: "Nur bei B2B-Geschäftsdarlehen mit hohem Streitwert.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "party_a", ausgewogen: "defendant", durchsetzungsstark: "party_b" }
    }
  ]
};

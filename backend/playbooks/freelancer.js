// Freelancer Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Erweitert contractTypes/freelancer.js, ersetzt es NICHT

module.exports = {
  type: "freelancer",
  title: "Freelancer-Vertrag (Freie Mitarbeit / Selbstständige Dienstleistung)",
  description: "Vertrag zwischen Auftraggeber und freiem Mitarbeiter — sauber abgegrenzt von Festanstellung und Werkvertrag, Schutz vor Scheinselbstständigkeit, mit IP-, Honorar- und Geheimhaltungsregeln.",
  icon: "user-cog",
  difficulty: "komplex",
  estimatedTime: "10–15 Minuten",
  legalBasis: "BGB §§ 611 ff. (Dienstvertrag) ggf. §§ 631 ff. (Werkvertrag); UStG; SGB IV §§ 7, 7a; SGB VI § 2; UrhG §§ 31, 31a, 32, 32a; KSVG; AÜG; GeschGehG",

  // Rollen-Definition
  roles: {
    A: { key: "auftraggeber", label: "Auftraggeber", description: "Beauftragt einen Externen für Dienstleistung/Werk; Interesse an rechtssicherer Lieferung ohne SV-Risiko" },
    B: { key: "freelancer", label: "Freelancer", description: "Selbstständige Person/Einzelunternehmer/UG; will faire Vergütung und Schutz vor Haftungsfallen" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Auftraggeber — maximaler IP-Übergang, weite Haftung des FL, klare Selbstständigkeits-Indikatoren",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — klare Tätigkeitsbeschreibung, faire Nutzungsrechte, AGB-konform für beide Seiten",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Freelancer — eingeschränkte Haftung, kurze Zahlungsfrist, Rechte erst nach Vollzahlung, kein Wettbewerbsverbot",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    // Auftraggeber
    { key: "partyA_name", label: "Firmenname (Auftraggeber)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertretungsberechtigt", type: "text", required: false, group: "partyA" },
    { key: "partyA_industry", label: "Branche (für KSK-Prüfung relevant)", type: "select", required: true, group: "partyA",
      options: [
        { value: "kreativ", label: "Kreativ / Medien (KSK-pflichtig prüfen!)" },
        { value: "tech", label: "IT / Software" },
        { value: "consulting", label: "Beratung / Strategy" },
        { value: "industrie", label: "Industrie / Produktion" },
        { value: "andere", label: "Andere" }
      ]
    },

    // Freelancer
    { key: "partyB_name", label: "Vor- und Nachname / Firma (Freelancer)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Geschäftsanschrift", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_taxNumber", label: "Steuernummer / USt-IdNr.", type: "text", required: true, group: "partyB" },
    { key: "partyB_legalForm", label: "Rechtsform", type: "select", required: true, group: "partyB",
      options: [
        { value: "einzelunternehmer", label: "Einzelunternehmer / Freiberufler" },
        { value: "ug", label: "UG (haftungsbeschränkt)" },
        { value: "gmbh", label: "GmbH" },
        { value: "kleinunternehmer", label: "Kleinunternehmer (§ 19 UStG)" }
      ]
    },
    { key: "partyB_otherClients", label: "Hat der Freelancer weitere Auftraggeber?", type: "select", required: true, group: "partyB",
      options: [
        { value: "ja_mehrere", label: "Ja, mehrere (Indiz Selbstständigkeit)" },
        { value: "nein_einziger", label: "Nein, dies ist aktuell der einzige Auftraggeber (SCHEINSELBSTSTÄNDIGKEIT-RISIKO)" }
      ]
    },

    // Vertragskontext
    { key: "scope", label: "Tätigkeitsbeschreibung / Projektgegenstand", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Entwicklung eines React-Frontend-Moduls für Produkt X" },
    { key: "vertragstyp", label: "Vertragstyp", type: "select", required: true, group: "context",
      options: [
        { value: "dienst", label: "Dienstvertrag (Tätigkeit, kein Erfolg geschuldet — typisch für Stundenmodell)" },
        { value: "werk", label: "Werkvertrag (konkretes Ergebnis geschuldet — typisch für Pauschalprojekte)" },
        { value: "mix", label: "Hybrid (Anteile beider Vertragstypen)" }
      ]
    },
    { key: "duration", label: "Geplante Vertragsdauer", type: "select", required: true, group: "context",
      options: [
        { value: "einmalig", label: "Einmaliges Projekt" },
        { value: "kurz_3mon", label: "Bis 3 Monate" },
        { value: "6mon", label: "Bis 6 Monate" },
        { value: "12mon", label: "Bis 12 Monate" },
        { value: "unbefristet", label: "Unbefristet / dauerhaft (SCHEINSELBSTSTÄNDIGKEIT-WARNUNG)" }
      ]
    },
    { key: "honorar_modell", label: "Honorarmodell", type: "select", required: true, group: "context",
      options: [
        { value: "stundensatz", label: "Stundensatz" },
        { value: "tagessatz", label: "Tagessatz" },
        { value: "pauschal", label: "Pauschal / Festpreis" },
        { value: "erfolgsbezogen", label: "Erfolgsbezogen / Provision" }
      ]
    },
    { key: "honorar_betrag", label: "Honorarhöhe (Netto, EUR)", type: "number", required: true, group: "context" }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Vertragstyp und Leistungsgegenstand ──
    {
      key: "service_type",
      title: "Vertragstyp und Leistungsgegenstand",
      paragraph: "§ 2",
      description: "Definiert Dienst- vs. Werkvertrag, Erfolgsschuld vs. Tätigkeitspflicht. Falsche Einordnung führt zu Haftungs- und Mängelrechtsfragen.",
      importance: "critical",
      options: [
        {
          value: "dienst_offen",
          label: "Dienstvertrag, offene Tätigkeitsbeschreibung",
          description: "FL erbringt fachliche Unterstützung im Bereich X. Tätigkeit, kein konkreter Erfolg.",
          risk: "medium",
          riskNote: "Dienstvertrag-Charakter klar, aber zu offene Beschreibung kann SV-Prüfer als Eingliederung werten (Herrenberg-Urteil, BSG 28.06.2022).",
          whenProblem: "DRV-Prüfung: bei zu allgemeiner Tätigkeit + kontinuierlicher Verfügbarkeit Indiz für Beschäftigung.",
          whenNegotiate: "AG sollte konkret werden; FL sollte mehrere Auftragnehmer/-projekte parallel nachweisen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "dienst_konkret",
          label: "Dienstvertrag mit konkreter Tätigkeit",
          description: "Aufgaben + Deliverables konkret beschrieben, klare Abgrenzung zu Festangestellten-Aufgaben.",
          risk: "low",
          riskNote: "Dienstvertrag mit klarem Selbstständigkeits-Profil.",
          whenProblem: "Selten — sauberer Vertragstyp.",
          whenNegotiate: "Empfohlene Standard-Form.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "werk_pauschal",
          label: "Werkvertrag mit Festpreis und Abnahme",
          description: "Konkretes Ergebnis (z.B. fertige App, Studie) zu Pauschalpreis, Abnahme nach § 640 BGB.",
          risk: "low",
          riskNote: "Klassischer Werkvertrag, IP-Übertragung mit Abnahme.",
          whenProblem: "Wenn Mängel bestehen, Mängelrechte § 634 BGB greifen — FL muss nachbessern.",
          whenNegotiate: "FL: Abnahmekriterien definieren, Teilabnahme verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mischvertrag",
          label: "Mischvertrag mit getrennten Modulen",
          description: "Teilbereiche als Werkvertrag (Lieferung), andere als Dienstvertrag (Wartung/Support).",
          risk: "medium",
          riskNote: "Beide Regimes greifen je nach Modul; Vertrag muss klar trennen.",
          whenProblem: "Wenn Module nicht klar getrennt — Streit über anwendbares Recht.",
          whenNegotiate: "Trennung explizit machen (Modul A: Werkvertrag mit Abnahme. Modul B: Dienstvertrag, monatlich).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "werk_pauschal", ausgewogen: "dienst_konkret", durchsetzungsstark: "dienst_offen" }
    },

    // ── 2. Selbstständigkeitsklausel ──
    {
      key: "independence",
      title: "Selbstständigkeitsklausel und Statusfeststellung",
      paragraph: "§ 3",
      description: "Vertragsbestimmungen, die Selbstständigkeit dokumentieren — kein Schutz vor SV-Prüfung, aber wichtige Beweis-Anker.",
      importance: "critical",
      options: [
        {
          value: "keine",
          label: "Keine Selbstständigkeitsklausel",
          description: "Vertrag enthält keine ausdrücklichen Indikatoren.",
          risk: "high",
          riskNote: "Hohe Beweislast bei DRV-Prüfung. Tatsächliche Durchführung entscheidet, aber Vertragstext kann pro Selbstständigkeit gewertet werden.",
          whenProblem: "Bei DRV-Prüfung: ohne Vertragsindikatoren oft Tendenz zur Beschäftigung.",
          whenNegotiate: "Beide: Klausel ist Standard, sollte enthalten sein.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "standard_klausel",
          label: "Standard-Selbstständigkeitsklausel",
          description: "FL ist selbstständig tätig, berechtigt für andere Auftraggeber, trägt eigenes unternehmerisches Risiko, führt Steuern selbst ab, ist nicht in Betriebsorganisation eingegliedert.",
          risk: "low",
          riskNote: "Standard-Wording, gerichtsfest als Indiz. Schützt nicht bei abweichender tatsächlicher Durchführung (Herrenberg-Urteil).",
          whenProblem: "Wenn tatsächliche Durchführung anders aussieht — Klausel allein hilft nicht.",
          whenNegotiate: "Akzeptabel; ggf. konkret um Zeit-/Ortssouveränität ergänzen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "mit_statusfeststellung_pflicht",
          label: "Standard + verpflichtende Statusfeststellung (§ 7a SGB IV)",
          description: "FL verpflichtet sich, innerhalb 4 Wochen ein Statusfeststellungsverfahren beim DRV einzuleiten; AG kann Vertrag bei festgestellter abhängiger Beschäftigung außerordentlich kündigen.",
          risk: "low",
          riskNote: "Maximale Rechtssicherheit; aufschiebende Wirkung gegen Beitragsforderung wenn Antrag rechtzeitig.",
          whenProblem: "Wenn FL Verfahren ablehnt — Vertragspflicht-Verstoß.",
          whenNegotiate: "FL: Wer trägt die Kosten? Klare Regelung im Vertrag.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_indizienkatalog",
          label: "Standard + ausdrücklicher Indizienkatalog",
          description: "Klausel listet konkret: eigene Betriebsstätte, eigenes Equipment, freie Zeiteinteilung, mehrere Auftraggeber, kein Anspruch auf Weihnachtsgeld/Urlaub etc.",
          risk: "low",
          riskNote: "Sehr starker Indiz-Katalog im Vertrag; konkretisiert Selbstständigkeit.",
          whenProblem: "Wenn Realität abweicht — Klausel kann gegen AG sprechen (vorsätzlich getäuscht).",
          whenNegotiate: "Beide: Konkretisierung sinnvoll.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mit_statusfeststellung_pflicht", ausgewogen: "standard_klausel", durchsetzungsstark: "standard_klausel" }
    },

    // ── 3. Honorar und Zahlungsbedingungen ──
    {
      key: "compensation",
      title: "Honorar und Zahlungsbedingungen",
      paragraph: "§ 4",
      description: "Höhe, Modus, Fälligkeit, Verzugsregeln, USt-Behandlung, Reisekosten.",
      importance: "critical",
      options: [
        {
          value: "stundensatz_30tage",
          label: "Stundensatz, monatliche Abrechnung, 30 Tage Zahlungsziel",
          description: "Stundenabrechnung gegen Tätigkeitsnachweis; Rechnung monatlich; 30 Tage netto.",
          risk: "medium",
          riskNote: "Marktüblich, aber 30 Tage langes Zahlungsziel belastet FL-Liquidität. § 286 Abs. 3 BGB: Verzug nach 30 Tagen automatisch.",
          whenProblem: "FL: Liquiditätsdruck.",
          whenNegotiate: "FL: 14 Tage netto + Verzugszinsen 9 % über Basiszins (§ 288 Abs. 2 BGB B2B).",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "stundensatz_14tage_skonto",
          label: "Stundensatz, 14 Tage netto, 2 % Skonto bei 7 Tagen",
          description: "Kürzere Zahlungsfrist mit Anreiz für AG.",
          risk: "low",
          riskNote: "FL-freundlich; AG hat Skonto-Anreiz.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "AG: Skonto-Wahl belassen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "pauschal_meilensteine",
          label: "Pauschalpreis nach Meilensteinen",
          description: "Festpreis aufgeteilt in 30/40/30 % nach Etappen-Abnahme.",
          risk: "low",
          riskNote: "Klar, planbar. § 632a BGB Abschlagszahlungen bei Werkvertrag möglich.",
          whenProblem: "Wenn Meilensteine vage — Streit bei Abnahme.",
          whenNegotiate: "FL: Anzahlung verhandeln (z.B. 30 % bei Vertragsschluss).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "erfolgsbezogen_min",
          label: "Erfolgsbezogen mit Garantie-Honorar",
          description: "Provision/Erfolg + Mindesthonorar-Garantie.",
          risk: "medium",
          riskNote: "Schwer kalkulierbar, ggf. § 87 HGB-Regeln (Handelsvertreter analog).",
          whenProblem: "Wenn Erfolg ausbleibt — Streit über Mindesthonorar.",
          whenNegotiate: "Klare Berechnungsgrundlage und Erfolgsdefinition.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "pauschal_meilensteine", ausgewogen: "stundensatz_30tage", durchsetzungsstark: "stundensatz_14tage_skonto" }
    },

    // ── 4. Nutzungsrechte und IP ──
    {
      key: "ip_rights",
      title: "Nutzungsrechte und geistiges Eigentum",
      paragraph: "§ 5",
      description: "UrhG § 31 — Nutzungsrechte müssen konkret bezeichnet werden (Zweckübertragungslehre, § 31 Abs. 5). Im Zweifel verbleiben Rechte beim Urheber. § 32 sichert angemessene Vergütung.",
      importance: "critical",
      options: [
        {
          value: "einfaches_recht_zweckgebunden",
          label: "Einfaches Nutzungsrecht für vereinbarten Zweck",
          description: "AG erhält einfaches, nicht-exklusives Nutzungsrecht für den im Vertrag genannten Zweck. FL behält volle Rechte für andere Verwendungen.",
          risk: "medium",
          riskNote: "FL-freundlich; AG kann Werk nicht weiterverkaufen oder bearbeiten ohne Zustimmung.",
          whenProblem: "AG kann Werk nicht für Folgeprodukte/Lizenzgeschäft nutzen.",
          whenNegotiate: "AG: Mindestens Bearbeitungsrechte für interne Anpassungen verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "ausschliessliches_recht_zweck",
          label: "Ausschließliches Nutzungsrecht für Zweck, ohne Bearbeitung",
          description: "Exklusiv für Zweck, FL darf nicht doppelt verkaufen, aber Bearbeitungsrecht beim FL.",
          risk: "low",
          riskNote: "Marktstandard für Auftragsarbeit; § 32 angemessene Vergütung greift.",
          whenProblem: "Wenn AG das Werk anpassen lassen will — Zustimmung des FL.",
          whenNegotiate: "Bearbeitungsrecht zusätzlich verhandeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "umfassendes_recht_inkl_bearbeitung",
          label: "Umfassendes ausschließliches Nutzungsrecht inkl. Bearbeitung",
          description: "Vollständige IP-Übertragung wirtschaftlich; FL behält Urheberpersönlichkeitsrechte (zwingend, § 13 UrhG).",
          risk: "medium",
          riskNote: "Im Honorar muss angemessene Vergütung für umfassende Rechteübertragung enthalten sein (§ 32 UrhG). Sonst Nachschlagepflicht.",
          whenProblem: "Wenn Honorar nicht angemessen — § 32 UrhG: FL kann nachträglich höhere Vergütung verlangen.",
          whenNegotiate: "FL: angemessenen Aufschlag fordern (oft 30–50 % über Standardhonorar).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "rechte_nach_vollzahlung",
          label: "Rechteübergang erst nach Vollzahlung",
          description: "Nutzungsrechte gehen erst über, wenn Honorar vollständig bezahlt.",
          risk: "low",
          riskNote: "FL-freundlich, sichert Honorar. AG darf Werk vor Zahlung nicht produktiv einsetzen.",
          whenProblem: "Wenn AG vor Zahlung nutzt — Unterlassungs-/Schadensersatzanspruch FL.",
          whenNegotiate: "Standard für unsichere AG-Bonität.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "umfassendes_recht_inkl_bearbeitung", ausgewogen: "ausschliessliches_recht_zweck", durchsetzungsstark: "rechte_nach_vollzahlung" }
    },

    // ── 5. Haftung ──
    {
      key: "liability",
      title: "Haftung",
      paragraph: "§ 6",
      description: "§ 309 Nr. 7 BGB: Haftung für Vorsatz/grobe Fahrlässigkeit/Personenschäden in AGB nicht ausschließbar. Für leichte Fahrlässigkeit kann begrenzt werden.",
      importance: "high",
      options: [
        {
          value: "gesetzlich",
          label: "Gesetzliche Haftung (BGB)",
          description: "Volle Haftung nach BGB für alle Verschuldensgrade.",
          risk: "medium",
          riskNote: "AG-freundlich. FL hat ggf. unkalkulierbares Risiko ohne Berufshaftpflicht.",
          whenProblem: "FL: Großschaden ruiniert FL.",
          whenNegotiate: "FL: BGB-Default + Begrenzung leichte Fahrlässigkeit.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "begrenzt_auftragswert",
          label: "Begrenzt auf Auftragswert (für leichte Fahrlässigkeit)",
          description: "Volle Haftung Vorsatz + grobe Fahrlässigkeit; bei leichter Fahrlässigkeit max. Höhe des Auftragswerts.",
          risk: "low",
          riskNote: "AGB-konform. § 309 Nr. 7 BGB beachtet. Branchenüblich für Freelancer.",
          whenProblem: "Wenn Schaden des AG den Auftragswert weit übersteigt.",
          whenNegotiate: "AG: Höhere Haftungsgrenze (z.B. Berufshaftpflicht-Deckungssumme) verhandeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "mit_berufshaftpflicht",
          label: "Volle Haftung + Berufshaftpflicht-Pflicht",
          description: "FL muss Berufshaftpflicht (mind. 1 Mio EUR Deckung) abschließen und nachweisen.",
          risk: "low",
          riskNote: "Optimal für AG; Risiko-Transfer auf Versicherung. Kosten beim FL.",
          whenProblem: "Wenn FL Versicherung nicht abschließt — Vertragsverletzung.",
          whenNegotiate: "FL: Versicherung kostet i.d.R. 300–800 EUR/Jahr — in Honorar einrechnen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "ausgeschlossen_grob",
          label: "Haftung nur für Vorsatz",
          description: "Versuch, alle anderen Verschuldensgrade auszuschließen.",
          risk: "high",
          riskNote: "Unwirksam in AGB (§ 309 Nr. 7 BGB) — Personenschäden, grobe Fahrlässigkeit, Vorsatz nicht ausschließbar. Klausel-Reduktion möglich, aber riskant.",
          whenProblem: "Klausel kippt; AG hat dann uneingeschränkten Anspruch.",
          whenNegotiate: "FL: realistische Begrenzung statt Ausschluss.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "mit_berufshaftpflicht", ausgewogen: "begrenzt_auftragswert", durchsetzungsstark: "begrenzt_auftragswert" }
    },

    // ── 6. Geheimhaltung ──
    {
      key: "confidentiality",
      title: "Geheimhaltung",
      paragraph: "§ 7",
      description: "GeschGehG seit 26.04.2019 — Schutz nur bei angemessenen Geheimhaltungsmaßnahmen. NDA ist Standardbestandteil.",
      importance: "high",
      options: [
        {
          value: "keine",
          label: "Keine spezielle Klausel",
          description: "Verweis auf gesetzliche Geheimhaltungspflicht (Treu und Glauben).",
          risk: "high",
          riskNote: "GeschGehG-Schutz nur bei angemessenen Maßnahmen — ohne Vertragsklausel oft nicht erfüllt.",
          whenProblem: "AG verliert Schutz nach GeschGehG-Standards.",
          whenNegotiate: "Sollte ergänzt werden.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gegenseitig_3jahre",
          label: "Gegenseitige Geheimhaltung, 3 Jahre nachvertraglich",
          description: "Beide Seiten verpflichtet, vertrauliche Informationen 3 Jahre nach Vertragsende zu schützen.",
          risk: "low",
          riskNote: "Marktüblich, fair.",
          whenProblem: "Selten.",
          whenNegotiate: "Akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "einseitig_streng_5jahre_strafe",
          label: "FL einseitig, 5 Jahre, mit Vertragsstrafe",
          description: "FL geheimhaltungspflichtig 5 Jahre, Vertragsstrafe 25.000 EUR pro Verstoß.",
          risk: "medium",
          riskNote: "§ 343 BGB: Gericht kann Strafe reduzieren. § 309 Nr. 6 BGB: pauschale Strafen in AGB nur unter Bedingungen wirksam.",
          whenProblem: "Vertragsstrafe-Höhe unverhältnismäßig — Reduktion durch Gericht.",
          whenNegotiate: "FL: Strafhöhe reduzieren; auf vorsätzliche/grobfahrlässige Verstöße begrenzen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "unbefristet",
          label: "Unbefristete Geheimhaltung",
          description: "Geheimhaltungspflicht endet nie.",
          risk: "high",
          riskNote: "Bei AGB häufig unwirksam wegen unangemessener Benachteiligung (§ 307 BGB). BGH-Tendenz: max. 5–7 Jahre angemessen.",
          whenProblem: "Klausel kippt; ggf. wird auf angemessene Zeit reduziert.",
          whenNegotiate: "Praktisch nur bei tatsächlichen Geschäftsgeheimnissen unbefristet zumutbar.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "einseitig_streng_5jahre_strafe", ausgewogen: "gegenseitig_3jahre", durchsetzungsstark: "gegenseitig_3jahre" }
    },

    // ── 7. Wettbewerbs- und Kundenschutz ──
    {
      key: "non_compete",
      title: "Wettbewerbs- und Kundenschutz",
      paragraph: "§ 8",
      description: "Bei Selbstständigen kein § 74 HGB. Wettbewerbsklauseln müssen sachlich/zeitlich/räumlich begrenzt sein und Berufsfreiheit (Art. 12 GG) wahren.",
      importance: "medium",
      options: [
        {
          value: "keines",
          label: "Kein Wettbewerbs-/Kundenschutz",
          description: "FL kann nach Vertragsende sofort für Wettbewerber / mit AG-Kunden arbeiten.",
          risk: "low",
          riskNote: "FL-freundlich; entspricht Berufsfreiheit.",
          whenProblem: "AG-Sicht: Schutz von Kundenbeziehungen fehlt.",
          whenNegotiate: "AG: Mindestens 6-Monats-Kundenschutz ohne Karenz prüfen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "kundenschutz_12mon_ohne_karenz",
          label: "12 Monate Kundenschutz ohne Karenzentschädigung",
          description: "FL darf 12 Monate nach Vertragsende keine AG-Kunden direkt aktiv abwerben. Keine Karenzentschädigung (möglich, da kein § 74 HGB).",
          risk: "medium",
          riskNote: "Wirksam, sofern Berufsausübung nicht wesentlich eingeschränkt (BGH NJW 2005, 3061 für Selbstständige).",
          whenProblem: "Wenn AG-Kunden den Großteil von FL-Markt darstellen — Klausel beeinträchtigt Berufsfreiheit.",
          whenNegotiate: "FL: räumliche/sachliche Beschränkung enger fassen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "wettbewerbsverbot_24mon_karenz",
          label: "24 Monate Wettbewerbsverbot mit Karenzentschädigung",
          description: "Volles Wettbewerbsverbot mit angemessener Karenz (Empfehlung: 50 % des durchschnittlichen Honorars).",
          risk: "medium",
          riskNote: "Maximale Reichweite; ohne Karenz wäre nichtig.",
          whenProblem: "Wenn räumlich/sachlich zu weit — Sittenwidrigkeit (§ 138 BGB).",
          whenNegotiate: "FL: Reichweite reduzieren; Karenz erhöhen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "kundenschutz_6mon_aktiv",
          label: "6 Monate, nur aktive Abwerbung",
          description: "Kein passives Verbot; FL darf mit AG-Kunden arbeiten, wenn diese auf FL zukommen.",
          risk: "low",
          riskNote: "FL-freundlich; wirksam.",
          whenProblem: "Selten.",
          whenNegotiate: "Fairer Kompromiss.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "wettbewerbsverbot_24mon_karenz", ausgewogen: "kundenschutz_12mon_ohne_karenz", durchsetzungsstark: "keines" }
    },

    // ── 8. Vertragsdauer und Kündigung ──
    {
      key: "term_termination",
      title: "Vertragsdauer und Kündigung",
      paragraph: "§ 9",
      description: "Bei Dienstvertrag: ordentliche Kündigung jederzeit nach § 621 BGB möglich (kurze Fristen). Bei Werkvertrag: Beendigung bei Erfolg / vor Erfolg § 648 BGB (AG kann jederzeit kündigen, muss aber Vergütung minus ersparter Aufwendungen zahlen).",
      importance: "high",
      options: [
        {
          value: "gesetzlich",
          label: "Gesetzliche Regelung (§ 621 BGB / § 648 BGB)",
          description: "Bei Dienstverträgen: ordentliche Kündigung mit Fristen je nach Vergütungsperiode (z.B. monatlich → 15 Tage); bei Werkvertrag § 648 BGB.",
          risk: "medium",
          riskNote: "Kurze Kündigungsfristen — beidseitig schnell beendbar.",
          whenProblem: "FL: kein Planungsschutz.",
          whenNegotiate: "FL: längere Frist für AG-Kündigung verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "feste_laufzeit",
          label: "Feste Vertragslaufzeit, ordentliche Kündigung ausgeschlossen",
          description: "Festes Ende; ordentliche Kündigung nicht möglich, nur außerordentliche (§ 626 BGB).",
          risk: "medium",
          riskNote: "Klar, planbar. ABER: bei langer Bindung + nur 1 Auftraggeber Scheinselbstständigkeits-Indiz!",
          whenProblem: "Wenn DRV Eingliederung annimmt — feste Laufzeit verstärkt Beschäftigungs-Annahme.",
          whenNegotiate: "Beide: Laufzeit auf Projektzweck begrenzen, nicht zu lang.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "monatlich_4wochen",
          label: "Monatlich kündbar, 4 Wochen Frist beidseitig",
          description: "Kündigung beidseitig mit 4 Wochen zum Monatsende.",
          risk: "low",
          riskNote: "Faire Balance, planbar.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlene Standard-Lösung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "ag_kurz_fl_lang",
          label: "AG kurz (4 Wochen), FL Langzeit-Schutz (3 Monate)",
          description: "AG kann kurzfristig kündigen, FL bekommt längere Restzeit zur Akquise.",
          risk: "low",
          riskNote: "FL-freundlich; in B2B-Verträgen wirksam.",
          whenProblem: "AG verliert Flexibilität.",
          whenNegotiate: "AG: Symmetrie verlangen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "gesetzlich", ausgewogen: "monatlich_4wochen", durchsetzungsstark: "ag_kurz_fl_lang" }
    },

    // ── 9. Unterauftrag und Substitution ──
    {
      key: "subcontracting",
      title: "Unterauftrag und Substitution",
      paragraph: "§ 10",
      description: "Substituierbarkeit ist starkes Indiz für Selbstständigkeit. Persönliche Leistungspflicht spricht für Beschäftigung.",
      importance: "medium",
      options: [
        {
          value: "frei",
          label: "Unterauftrag und Substitution frei",
          description: "FL darf jederzeit Dritte einsetzen oder ersetzen.",
          risk: "low",
          riskNote: "Starkes Indiz für Selbstständigkeit (DRV-Praxis).",
          whenProblem: "AG: Qualitätsverlust durch wechselnde Personen.",
          whenNegotiate: "AG: Qualitätsanforderungen für Substitute definieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "mit_zustimmung",
          label: "Unterauftrag mit AG-Zustimmung",
          description: "Substitution nur mit schriftlicher Zustimmung des AG.",
          risk: "medium",
          riskNote: "Schwächt Selbstständigkeits-Indiz; aber praxistauglich.",
          whenProblem: "Wenn AG ohne sachlichen Grund verweigert.",
          whenNegotiate: "FL: Zustimmung darf nur aus wichtigem Grund verweigert werden.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "persoenlich",
          label: "Persönliche Leistungspflicht",
          description: "Nur FL persönlich erbringt Leistung; keine Substitution.",
          risk: "high",
          riskNote: "Schwächt Selbstständigkeit erheblich (BSG-Indiz). Praktisch oft erwünscht (Spezialisten-Know-how), aber SV-rechtlich problematisch.",
          whenProblem: "DRV-Prüfung: persönliche Leistungspflicht ist Beschäftigungs-Indiz.",
          whenNegotiate: "Vermeiden — stattdessen Qualitätskriterien für Substitute.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "team_extern",
          label: "FL setzt eigenes Team / eigene Subunternehmer ein",
          description: "FL stellt sicher, dass Aufgabe durch sein Team erbracht wird, FL haftet für Subs.",
          risk: "low",
          riskNote: "Klare Selbstständigkeit; FL-Haftung für Subs explizit.",
          whenProblem: "Wenn Subs nicht qualifiziert — FL-Haftung.",
          whenNegotiate: "AG: Genehmigungspflicht für Schlüsselrollen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "persoenlich", ausgewogen: "mit_zustimmung", durchsetzungsstark: "frei" }
    },

    // ── 10. Schlussbestimmungen ──
    {
      key: "final_provisions",
      title: "Schlussbestimmungen",
      paragraph: "§ 11",
      description: "Schriftform für Änderungen, salvatorische Klausel, Gerichtsstand, anwendbares Recht.",
      importance: "medium",
      options: [
        {
          value: "minimal",
          label: "Salvatorische + Gerichtsstand am Beklagtensitz",
          description: "Fairste Lösung. § 12 ZPO Standard.",
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
          riskNote: "In B2B grundsätzlich zulässig (§ 38 ZPO), aber bei stark unterschiedlicher Größe ggf. überraschend.",
          whenProblem: "FL muss bei Streit anreisen.",
          whenNegotiate: "FL: Schiedsgerichtsklausel oder Sitz FL.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "schriftform_einfach",
          label: "Einfache Schriftform für Änderungen",
          description: "Änderungen nur schriftlich. Textform ergänzen für E-Mail.",
          risk: "low",
          riskNote: "Wirksam; Textform ergänzen für E-Mail.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "schiedsklausel",
          label: "Schiedsgerichtsbarkeit",
          description: "Streitigkeiten vor Schiedsgericht (z.B. DIS).",
          risk: "medium",
          riskNote: "Schnell, vertraulich, aber teuer. Schriftform für Schiedsklausel zwingend (§ 1031 ZPO).",
          whenProblem: "Bei niedrigen Streitwerten unverhältnismäßig teuer.",
          whenNegotiate: "Nur bei großen Projekten sinnvoll.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "gerichtsstand_ag", ausgewogen: "minimal", durchsetzungsstark: "minimal" }
    }
  ]
};

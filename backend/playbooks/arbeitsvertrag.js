// Arbeitsvertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Erweitert contractTypes/arbeitsvertrag.js, ersetzt es NICHT

module.exports = {
  type: "arbeitsvertrag",
  title: "Arbeitsvertrag (unbefristet/befristet)",
  description: "Rechtssicherer Arbeitsvertrag für Festanstellung — mit allen NachwG-Pflichtangaben, Probezeit-, Befristungs-, Vergütungs- und Wettbewerbsklauseln auf BAG-konformem Stand.",
  icon: "briefcase",
  difficulty: "komplex",
  estimatedTime: "12–18 Minuten",
  legalBasis: "BGB §§ 611a, 622 ff.; NachwG (n. F. seit 01.08.2022, Textform ab 01.01.2025); KSchG; AGG; BetrVG; BUrlG; MiLoG; EFZG; ArbZG; TzBfG; HGB §§ 74–75d; BetrAVG; SGB IV §§ 7, 7a",

  // Rollen-Definition
  roles: {
    A: { key: "arbeitgeber", label: "Arbeitgeber", description: "Stellt den Arbeitsplatz, ist weisungsbefugt und zahlt die Vergütung" },
    B: { key: "arbeitnehmer", label: "Arbeitnehmer", description: "Stellt die Arbeitskraft zur Verfügung, weisungsgebunden, in die Organisation eingegliedert" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Arbeitgeber — maximale Bindung, Flexibilität und Schutz vor Know-how-Verlust",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard / Tarifnähe — gerichtsfest, ohne Inhaltskontrolle-Risiko",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Arbeitnehmer — geeignet für umworbene Fachkräfte mit starker Verhandlungsposition",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    // Arbeitgeber
    { key: "partyA_name", label: "Firmenname (Arbeitgeber)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertretungsberechtigt (Geschäftsführung / HR)", type: "text", required: true, group: "partyA" },
    { key: "partyA_employee_count", label: "Anzahl Mitarbeitende (für KSchG-Anwendung)", type: "select", required: true, group: "partyA",
      options: [
        { value: "lt10", label: "Bis 10 (Kleinbetrieb — kein KSchG)" },
        { value: "gte10", label: "Mehr als 10 (KSchG anwendbar)" }
      ]
    },

    // Arbeitnehmer
    { key: "partyB_name", label: "Vor- und Nachname (Arbeitnehmer)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Wohnanschrift", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_birthdate", label: "Geburtsdatum", type: "date", required: true, group: "partyB" },
    { key: "partyB_taxId", label: "Steuer-ID (optional, kann nachgereicht werden)", type: "text", required: false, group: "partyB" },

    // Vertragskontext
    { key: "position", label: "Stellenbezeichnung / Position", type: "text", required: true, group: "context",
      placeholder: "z.B. Senior Software Engineer, Marketing Manager" },
    { key: "startDate", label: "Beginn des Arbeitsverhältnisses", type: "date", required: true, group: "context" },
    { key: "workplace", label: "Arbeitsort (Hauptarbeitsstätte)", type: "text", required: true, group: "context" },
    { key: "weeklyHours", label: "Vereinbarte Wochenarbeitszeit (Stunden)", type: "number", required: true, group: "context",
      placeholder: "z.B. 40" },
    { key: "monthlyGross", label: "Monatliches Bruttogehalt (EUR)", type: "number", required: true, group: "context",
      placeholder: "z.B. 4500" },
    { key: "tarif", label: "Tarifbindung", type: "select", required: true, group: "context",
      options: [
        { value: "kein", label: "Keine Tarifbindung" },
        { value: "tariflich", label: "Tarifvertrag anwendbar (Branche, Region)" },
        { value: "anlehnung", label: "Anlehnung an Tarifvertrag (freiwillig)" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — Das Herzstück des Playbooks
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Beginn, Probezeit, Vertragsart ──
    {
      key: "start_probation",
      title: "Beginn, Probezeit und Vertragsart",
      paragraph: "§ 2",
      description: "Legt fest, ob unbefristet oder befristet, mit/ohne Probezeit. Probezeit max. 6 Monate (§ 622 Abs. 3 BGB). Bei Befristung Schriftform der Befristungsabrede zwingend (§ 14 Abs. 4 TzBfG).",
      importance: "critical",
      options: [
        {
          value: "unbefristet_6mon",
          label: "Unbefristet mit 6 Monaten Probezeit",
          description: "Standard-Festanstellung. 2-Wochen-Kündigung in Probezeit, danach gesetzliche Fristen.",
          risk: "low",
          riskNote: "Marktstandard, gerichtsfest. NachwG-Pflicht: Probezeit-Dauer angeben.",
          whenProblem: "Selten — Probezeit kann nicht verlängert werden, einmalige Chance zur Beurteilung.",
          whenNegotiate: "AN kann kürzere Probezeit oder Verzicht aushandeln; AG verliert dann Flexibilität.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "unbefristet_3mon",
          label: "Unbefristet mit 3 Monaten Probezeit",
          description: "Verkürzte Probezeit, Signal von Vertrauen an AN.",
          risk: "low",
          riskNote: "AN-freundlich; nach 3 Monaten gilt § 622 BGB. KSchG erst nach 6 Monaten Wartezeit (§ 1 KSchG) — daher AG-Schutz bleibt.",
          whenProblem: "AG hat weniger Zeit zur Beurteilung, muss bei Schlechtleistung schneller reagieren.",
          whenNegotiate: "AN bei umworbener Fachkraft; AG verzichtet auf Flexibilität.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "unbefristet_keine_probezeit",
          label: "Unbefristet ohne Probezeit",
          description: "Sofort gesetzliche Kündigungsfristen (§ 622 BGB). KSchG-Wartezeit von 6 Monaten bleibt unabhängig.",
          risk: "medium",
          riskNote: "Klare AN-Bevorzugung. AG verliert die einfache 2-Wochen-Trennung.",
          whenProblem: "Wenn AG die Eignung erst spät erkennt — dann nur ordentliche Kündigung mit Frist.",
          whenNegotiate: "Wenn AN aus sicherem Job kommt und Risikoausgleich verlangt.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "befristet_sachgrundlos",
          label: "Befristet sachgrundlos (max. 2 Jahre)",
          description: "Befristung nach § 14 Abs. 2 TzBfG, max. 2 Jahre, max. 3 Verlängerungen. Probezeit muss verhältnismäßig sein (BAG 30.10.2025).",
          risk: "high",
          riskNote: "Schriftform der Befristungsabrede zwingend! Bei Formfehler entsteht unbefristetes Arbeitsverhältnis. Kein KSchG während Befristung außer bei vorzeitiger Kündigung (§ 15 Abs. 3 TzBfG).",
          whenProblem: "Wenn AN auf Entfristung pocht (§ 17 TzBfG-Klage); wenn Vorbeschäftigung beim selben AG bestand.",
          whenNegotiate: "AN bei guter Verhandlungsposition (Entfristung als Bonus); AG bei Projektmitarbeit.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "befristet_sachgrundlos", ausgewogen: "unbefristet_6mon", durchsetzungsstark: "unbefristet_3mon" }
    },

    // ── 2. Tätigkeit und Versetzungsvorbehalt ──
    {
      key: "task_assignment",
      title: "Tätigkeit und Versetzungsvorbehalt",
      paragraph: "§ 3",
      description: "Definiert das Aufgabengebiet und ob AG den AN versetzen darf. § 106 GewO begrenzt das Direktionsrecht durch billiges Ermessen. AGB-Kontrolle bei zu weiter Klausel.",
      importance: "high",
      options: [
        {
          value: "eng",
          label: "Enge Tätigkeitsbeschreibung, kein Versetzungsvorbehalt",
          description: "Konkrete Position, fester Arbeitsort, keine Änderung ohne Änderungsvertrag.",
          risk: "medium",
          riskNote: "AN-freundlich; AG ist bei Reorganisation zu Änderungskündigung gezwungen (§ 2 KSchG).",
          whenProblem: "Wenn die Geschäftsstrategie Versetzungen erfordert (Filialwechsel, Projektteams).",
          whenNegotiate: "AG-Position; klare Linie für Spezialisten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "standard_versetzung",
          label: "Standard mit Versetzungsvorbehalt (zumutbar, gleichwertig)",
          description: "Tätigkeit ist beschrieben, AG kann gleichwertige Aufgaben/anderen Standort zuweisen, sofern zumutbar (§ 106 GewO + Zumutbarkeitsklausel).",
          risk: "low",
          riskNote: "Marktüblich, gerichtsfest. Kein Verstoß gegen AGB-Recht, sofern \"gleichwertig\" und \"zumutbar\" enthalten.",
          whenProblem: "Selten. AG muss billiges Ermessen wahren — bei Streit Beweislast bei AG.",
          whenNegotiate: "Meist akzeptabel; AN kann Mindestkriterien (gleicher Wohnort, gleiches Gehalt) ergänzen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "weit_versetzung",
          label: "Weiter Versetzungsvorbehalt (auch andere Standorte / andere Tätigkeit)",
          description: "AG ist berechtigt, dem AN auch andere zumutbare Tätigkeiten und an anderen Standorten zuzuweisen.",
          risk: "high",
          riskNote: "Inhaltskontrolle nach § 307 BGB! BAG 13.04.2010 (9 AZR 36/09): Klausel ohne Zumutbarkeits- oder Gleichwertigkeitsbegrenzung unwirksam.",
          whenProblem: "Wenn die Klausel zu weit ist und unwirksam wird — dann gilt die enge Tätigkeitsbeschreibung.",
          whenNegotiate: "AN muss verlangen, dass \"zumutbar\" und \"gleichwertig\" eingebaut wird.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "bundesweit",
          label: "Bundesweite Versetzbarkeit",
          description: "Wie Standard + AN verpflichtet sich, an jeden deutschen Standort zu wechseln (Familienstand zumutbar berücksichtigt).",
          risk: "high",
          riskNote: "Trotz Klausel kann eine Versetzung an einen weit entfernten Standort unbillig sein (BAG 28.08.2013 — 10 AZR 569/12).",
          whenProblem: "Wenn AN umziehen müsste und AG nicht für Umzugskosten aufkommt.",
          whenNegotiate: "AN sollte Umzugspauschale, Doppelhaushaltsführung, Familienzeit verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "bundesweit", ausgewogen: "standard_versetzung", durchsetzungsstark: "eng" }
    },

    // ── 3. Arbeitszeit und Überstunden ──
    {
      key: "working_hours",
      title: "Arbeitszeit und Überstunden",
      paragraph: "§ 4",
      description: "Wochenstunden, Verteilung, Überstunden-Behandlung. ArbZG: max. 8 h/Tag (Verlängerung 10 h möglich), max. 48 h/Woche. Pauschalabgeltungsklauseln nur wirksam, wenn klar erkennbar, wie viele Überstunden abgegolten sind.",
      importance: "critical",
      options: [
        {
          value: "feste_zeit_extra_verguetet",
          label: "Feste Wochenstunden, Überstunden separat vergütet",
          description: "Vereinbarte Stundenzahl, jede Mehrarbeit zusätzlich vergütet (Stundensatz aus Bruttogehalt/Stunden).",
          risk: "low",
          riskNote: "AN-freundlich, transparent. Stundenkonto/Zuschläge je nach Branche.",
          whenProblem: "Wenn AG häufig Überstunden braucht und Kostenkontrolle verliert.",
          whenNegotiate: "AG bei Saisonarbeit; alternativ Arbeitszeitkonto vereinbaren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "arbeitszeitkonto",
          label: "Arbeitszeitkonto / Gleitzeit",
          description: "Sollarbeitszeit, Plus-/Minus-Stunden auf Konto, Ausgleich innerhalb von 6–12 Monaten.",
          risk: "low",
          riskNote: "Marktüblich; Mitbestimmung Betriebsrat (§ 87 Abs. 1 Nr. 2 BetrVG).",
          whenProblem: "Wenn Konto-Saldo bei Ausscheiden hoch ist und nicht ausgezahlt wird (Streit).",
          whenNegotiate: "Selten — Modell ist fair für beide Seiten, sofern Auszahlungsmodalitäten klar.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "pauschal_abgegolten_konkret",
          label: "Bis X Überstunden/Monat pauschal abgegolten",
          description: "Bis zu definierter Stundenzahl (z.B. 10 Überstunden/Monat) mit Gehalt abgegolten, danach Vergütung oder Freizeitausgleich.",
          risk: "medium",
          riskNote: "Wirksam, da konkrete Obergrenze (BAG 16.05.2012 — 5 AZR 331/11). Mindestlohn (§ 1 MiLoG) für ALLE Stunden, auch abgegoltene!",
          whenProblem: "Wenn das resultierende Stundenentgelt < Mindestlohn (13,90 EUR ab 2026) — Klausel insoweit nichtig.",
          whenNegotiate: "AN: Konkrete Stundenzahl + Auszahlung beim Überschreiten verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "vertrauensarbeitszeit",
          label: "Vertrauensarbeitszeit (außertariflich, leitend)",
          description: "Keine Stunden-Erfassung, eigenverantwortliche Arbeitsleistung. Nur für AT-/leitende AN.",
          risk: "high",
          riskNote: "EuGH 14.05.2019 (C-55/18) + BAG 13.09.2022 (1 ABR 22/21): AG ist verpflichtet, Arbeitszeiten zu erfassen — Vertrauensarbeitszeit nicht mehr ohne Erfassungspflicht möglich.",
          whenProblem: "AG verstößt gegen Erfassungspflicht — Bußgelder + Beweislast-Umkehr bei Überstundenstreit.",
          whenNegotiate: "AN: AG muss System einführen; AN sollte eigene Aufzeichnung führen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "pauschal_abgegolten_konkret", ausgewogen: "arbeitszeitkonto", durchsetzungsstark: "feste_zeit_extra_verguetet" }
    },

    // ── 4. Vergütung und Sonderzahlungen ──
    {
      key: "compensation",
      title: "Vergütung und Sonderzahlungen",
      paragraph: "§ 5",
      description: "Gehalt + Bonuskomponenten + Sonderzahlungen. Mindestlohn 13,90 EUR ab 01.01.2026 (Pflicht). Bei Sonderzahlungen entscheidet die Klausel-Formulierung über Anspruch oder Freiwilligkeit.",
      importance: "critical",
      options: [
        {
          value: "nur_grundgehalt",
          label: "Nur festes Grundgehalt",
          description: "Reines monatliches Bruttogehalt, keine Boni, keine Sonderzahlungen.",
          risk: "low",
          riskNote: "Klar, einfach, kein Streitpotenzial. NachwG-konform mit Höhe + Fälligkeit.",
          whenProblem: "Selten; aber AG verliert Anreiz-Tool.",
          whenNegotiate: "AN bei umworbener Position kann Bonus oder Urlaubsgeld zusätzlich aushandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "grundgehalt_freiwilliger_bonus",
          label: "Grundgehalt + freiwilliger Bonus (kein Anspruch)",
          description: "Grundgehalt fix, Bonus freiwillig, ohne Rechtsanspruch auch bei wiederholter Zahlung.",
          risk: "medium",
          riskNote: "Doppelte Schriftform-/Freiwilligkeitsklausel problematisch (BAG 14.09.2011 — 10 AZR 526/10). Bei AGB ist nur eindeutige Freiwilligkeitsklausel wirksam. Betriebliche Übung möglich nach 3 Jahren.",
          whenProblem: "Wenn AN nach 3+ Jahren Bonus-Wegfall anficht und betriebliche Übung geltend macht.",
          whenNegotiate: "AN bei langjähriger Beschäftigung Bonus-Garantie verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "grundgehalt_zielbonus",
          label: "Grundgehalt + Zielbonus mit Bonusvereinbarung",
          description: "Grundgehalt fix, jährliche Bonusvereinbarung mit Zielen, Auszahlung nach Zielerreichung.",
          risk: "low",
          riskNote: "Marktstandard; Zielvereinbarungen müssen rechtzeitig getroffen werden — sonst Schadensersatz (BAG 12.12.2007 — 10 AZR 97/07).",
          whenProblem: "Wenn AG Ziele nicht oder zu spät vereinbart — AN hat Anspruch auf 100 % Bonus.",
          whenNegotiate: "AN: Mindestbonus + faire Zielsetzung verhandeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "grundgehalt_13_zahlung_urlaubsgeld",
          label: "Grundgehalt + 13. Gehalt + Urlaubsgeld (vertraglich garantiert)",
          description: "Grundgehalt + jährliche Sonderzahlungen vertraglich zugesichert (kein Vorbehalt).",
          risk: "low",
          riskNote: "AN-freundlich; Anspruch auch bei laufender Kündigung anteilig (BAG 18.01.2012 — 10 AZR 612/10).",
          whenProblem: "AG: hohe Personalkostenbindung; bei wirtschaftlicher Schieflage schwer rückgängig.",
          whenNegotiate: "AG: Stichtagsregelung (nur, wenn AN am 31.12. ungekündigt) rechtssicher gestalten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "grundgehalt_freiwilliger_bonus", ausgewogen: "grundgehalt_zielbonus", durchsetzungsstark: "grundgehalt_13_zahlung_urlaubsgeld" }
    },

    // ── 5. Urlaub ──
    {
      key: "vacation",
      title: "Urlaub",
      paragraph: "§ 6",
      description: "Mindesturlaub 24 Werktage = 20 Arbeitstage (5-Tage-Woche) nach BUrlG. EuGH-Rspr. zu Urlaubsverfall: AG-Mitwirkungsobliegenheit (EuGH 22.09.2022 C-120/21).",
      importance: "high",
      options: [
        {
          value: "gesetzlich",
          label: "Gesetzlicher Mindesturlaub (20 Arbeitstage)",
          description: "Nur das gesetzliche Minimum nach BUrlG.",
          risk: "low",
          riskNote: "Rechtssicher; AN kann nicht weniger erhalten (zwingend). EuGH 22.09.2022: Verfall nur nach AG-Hinweis.",
          whenProblem: "Selten Streit, aber unattraktiv für Fachkräfte.",
          whenNegotiate: "AN: 25–30 Tage marktüblich; je nach Branche/Position.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "25_tage",
          label: "25 Arbeitstage",
          description: "Standard für nicht-tarifgebundene Festanstellung.",
          risk: "low",
          riskNote: "Marktüblich, fair.",
          whenProblem: "Selten.",
          whenNegotiate: "Branchenüblich (Tech: 28–30 Tage).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "28_tage_betriebliche_regel",
          label: "28 Arbeitstage + EuGH-konformer Verfallhinweis",
          description: "28 Tage + Klausel mit aktiver Hinweispflicht des AG vor Verfall.",
          risk: "low",
          riskNote: "Beste Balance; entspricht EuGH-Anforderungen (Mitwirkungsobliegenheit).",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlene Standard-Klausel für 2026+.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "30_tage",
          label: "30 Arbeitstage (sehr arbeitnehmerfreundlich)",
          description: "Premium-Urlaubsanspruch, oft tarifvertraglich oder bei größeren Konzernen.",
          risk: "low",
          riskNote: "AN-freundlich; AG-seitig planbar.",
          whenProblem: "Hohe Personalkosten (Urlaubsentgelt + Vertretungsbedarf).",
          whenNegotiate: "AG bei umworbener Fachkraft als Total-Comp-Hebel; alternativ Sabbatical anbieten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "gesetzlich", ausgewogen: "28_tage_betriebliche_regel", durchsetzungsstark: "30_tage" }
    },

    // ── 6. Kündigung ──
    {
      key: "termination",
      title: "Kündigung und Kündigungsfristen",
      paragraph: "§ 7",
      description: "§ 622 BGB regelt Mindestfristen. Innerhalb Probezeit 2 Wochen. Nach Probezeit 4 Wochen zum 15. oder Monatsende, danach Staffelung nach Betriebszugehörigkeit (für AG). § 622 Abs. 6 BGB: AN-Frist darf nicht länger sein als AG-Frist.",
      importance: "critical",
      options: [
        {
          value: "gesetzlich",
          label: "Gesetzliche Fristen (§ 622 BGB)",
          description: "4 Wochen zum 15./Monatsende; AG-Verlängerung mit Betriebszugehörigkeit.",
          risk: "low",
          riskNote: "Klar, gerichtsfest. Kündigungsschutz nach 6 Monaten + 10 AN (§ 1 KSchG).",
          whenProblem: "Selten.",
          whenNegotiate: "Standard, akzeptabel für beide Seiten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "verlaengert_3_monate_beidseitig",
          label: "3 Monate zum Quartalsende, beidseitig",
          description: "Verlängerte Frist von 3 Monaten zum Quartalsende, gilt für beide Seiten.",
          risk: "medium",
          riskNote: "§ 622 Abs. 6 BGB: AN-Frist darf nicht länger als AG-Frist sein — Symmetrie OK. AG bindet AN länger.",
          whenProblem: "Wenn AN schnell wechseln will und AG nicht freistellt.",
          whenNegotiate: "AN: kürzere AN-Frist verhandeln (z.B. 1 Monat) — § 622 Abs. 6 BGB schützt.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "verlaengert_AG_kurz_AN",
          label: "Längere AG-Frist, kurze AN-Frist",
          description: "AG: 6 Monate; AN: 1 Monat. Für AN günstiger.",
          risk: "low",
          riskNote: "Zulässig; § 622 Abs. 6 BGB verbietet nur, dass AN länger gebunden ist als AG.",
          whenProblem: "AG: Verlust von Schlüsselpersonen kurzfristig.",
          whenNegotiate: "AG: Anti-Abwerbe-Klausel + Wettbewerbsverbot zusätzlich denken.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "befristet_keine_ordentliche",
          label: "Befristet, keine ordentliche Kündigung",
          description: "§ 15 Abs. 3 TzBfG: Bei Befristung keine ordentliche Kündigung möglich, außer ausdrücklich vereinbart.",
          risk: "medium",
          riskNote: "Bei Befristung Standardfall; nur außerordentliche Kündigung (§ 626 BGB).",
          whenProblem: "AG kann bei Schlechtleistung nicht ordentlich beenden — Bindung bleibt.",
          whenNegotiate: "Vereinbarung der ordentlichen Kündigung im Vertrag ergänzen, dann § 622 BGB.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "verlaengert_3_monate_beidseitig", ausgewogen: "gesetzlich", durchsetzungsstark: "verlaengert_AG_kurz_AN" }
    },

    // ── 7. Nebentätigkeit ──
    {
      key: "secondary_employment",
      title: "Nebentätigkeit",
      paragraph: "§ 8",
      description: "Art. 12 GG schützt Berufsfreiheit. Vollständiges Verbot unwirksam (BAG 11.12.2001 — 9 AZR 464/00). Zustimmungsvorbehalt mit sachlichen Kriterien zulässig.",
      importance: "medium",
      options: [
        {
          value: "frei",
          label: "Nebentätigkeit grundsätzlich frei",
          description: "AN braucht keine Genehmigung; muss AG nur informieren.",
          risk: "low",
          riskNote: "AN-freundlich. ArbZG-Grenzen (max. 48 h/Woche AT alle AG zusammen) gelten dennoch.",
          whenProblem: "AG-Interessen können verletzt werden (Wettbewerb, Geheimhaltung).",
          whenNegotiate: "AG: zumindest Anzeigepflicht vereinbaren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "anzeigepflicht",
          label: "Anzeigepflicht",
          description: "AN muss Nebentätigkeit anzeigen, AG darf nur untersagen, wenn Interessen beeinträchtigt.",
          risk: "low",
          riskNote: "Marktüblich, gerichtsfest.",
          whenProblem: "Selten.",
          whenNegotiate: "Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "genehmigungspflichtig",
          label: "Genehmigungsvorbehalt mit Kriterien",
          description: "Jede Nebentätigkeit zustimmungspflichtig; Zustimmung darf nur aus sachlichem Grund verweigert werden.",
          risk: "medium",
          riskNote: "BAG verlangt sachliche Kriterien — pauschale Verweigerung unwirksam.",
          whenProblem: "Wenn AG ohne Begründung verweigert.",
          whenNegotiate: "AN: Begründungspflicht für Verweigerung verlangen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "verboten",
          label: "Nebentätigkeit komplett verboten",
          description: "Kategorisches Verbot.",
          risk: "high",
          riskNote: "Unwirksam (BAG 11.12.2001) — Eingriff in Berufsfreiheit. Klausel wird gestrichen.",
          whenProblem: "Klausel kippt; AN ist faktisch frei.",
          whenNegotiate: "AN: Klausel als unwirksam zurückweisen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "genehmigungspflichtig", ausgewogen: "anzeigepflicht", durchsetzungsstark: "frei" }
    },

    // ── 8. Nachvertragliches Wettbewerbsverbot ──
    {
      key: "non_compete",
      title: "Nachvertragliches Wettbewerbsverbot",
      paragraph: "§ 9",
      description: "§ 74 HGB: nur wirksam mit schriftlicher Vereinbarung + Karenzentschädigung mind. 50 % der zuletzt bezogenen Bezüge + max. 2 Jahre + räumliche/sachliche Begrenzung. Ohne Karenz: nichtig.",
      importance: "high",
      options: [
        {
          value: "keines",
          label: "Kein Wettbewerbsverbot",
          description: "AN kann nach Vertragsende sofort beim Wettbewerber starten.",
          risk: "low",
          riskNote: "Während Anstellung gilt § 60 HGB analog (Treuepflicht). Nach Beendigung: Berufsfreiheit.",
          whenProblem: "AG verliert Schutz von Know-how.",
          whenNegotiate: "AG: NDA + Kundenschutz statt voller Wettbewerbsklausel.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "12mon_50_prozent",
          label: "12 Monate, 50 % Karenzentschädigung",
          description: "Standard-Wettbewerbsverbot, gerichtsfest.",
          risk: "low",
          riskNote: "§ 74 HGB-konform. BAG 27.03.2025 (8 AZR 139/24): Aktienoptionen einrechnen, sonst zu niedrige Entschädigung.",
          whenProblem: "Wenn AG Karenz nicht zahlt — Verbot fällt automatisch.",
          whenNegotiate: "AN: Höhere Entschädigung (75–100 %) verhandeln; oder Verzicht durchsetzen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "24mon_50_prozent",
          label: "24 Monate, 50 % Karenzentschädigung",
          description: "Maximale Dauer (§ 74a HGB), Standardentschädigung.",
          risk: "medium",
          riskNote: "Lange Bindung; AN hat 2 Jahre Berufseinschränkung. Reichweite (räumlich + sachlich) muss konkret sein.",
          whenProblem: "Wenn räumliche/sachliche Reichweite zu weit — Klausel unwirksam (BAG 03.05.1994 — 9 AZR 606/92).",
          whenNegotiate: "AN: Reduzierung auf 12 Monate oder höhere Entschädigung.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "kundenschutz_statt_wettbewerb",
          label: "Nur Kundenschutz, kein Wettbewerbsverbot",
          description: "AN darf zum Wettbewerber, aber nicht aktiv AG-Kunden abwerben (12 Monate).",
          risk: "low",
          riskNote: "Mildere Variante; ebenfalls karenzpflichtig (§ 74 HGB) wenn Berufsausübung beeinträchtigt.",
          whenProblem: "Reine Kundenschutzklauseln OHNE Karenz nur wirksam, wenn Berufsausübung nicht wesentlich beeinträchtigt.",
          whenNegotiate: "Kompromiss zwischen voller Freiheit und Wettbewerbsverbot.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "24mon_50_prozent", ausgewogen: "12mon_50_prozent", durchsetzungsstark: "keines" }
    },

    // ── 9. Verschwiegenheit und IP ──
    {
      key: "confidentiality_ip",
      title: "Verschwiegenheit und geistiges Eigentum",
      paragraph: "§ 10",
      description: "AN-Verschwiegenheit auch ohne ausdrückliche Klausel (Treuepflicht). Spezialregelungen: GeschGehG, ArbnErfG (Diensterfindungen).",
      importance: "high",
      options: [
        {
          value: "basis",
          label: "Basis-Verschwiegenheit + ArbnErfG-Default",
          description: "Verschwiegenheit über Geschäftsgeheimnisse während/nach Vertrag; Diensterfindungen nach ArbnErfG (AG hat Zugriffsrecht, AN bekommt angemessene Vergütung).",
          risk: "low",
          riskNote: "ArbnErfG zwingend — Vertragsklauseln dürfen nicht zu Lasten AN abweichen (§ 22 ArbnErfG).",
          whenProblem: "Selten — gesetzlicher Mindeststandard.",
          whenNegotiate: "AG kann erweiterte IP-Klausel ergänzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "umfassend",
          label: "Umfassende NDA + Vorab-IP-Übertragung",
          description: "Konkrete Vertraulichkeitspflichten + alle dienstlich erstellten IP gehen ohne Zusatzvergütung an AG (urheberrechtliche Nutzungsrechte unbeschränkt).",
          risk: "medium",
          riskNote: "Bei Erfindungen ArbnErfG-Vergütung trotz Klausel. AGB-Kontrolle der IP-Übertragung.",
          whenProblem: "Wenn AN-Erfindungen entstehen — Vergütungsanspruch bleibt zwingend.",
          whenNegotiate: "AN: Vergütungsregelung explizit aufnehmen; Software-Quellcode-Behandlung definieren.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "streng_mit_vertragsstrafe",
          label: "Strenge Klausel + Vertragsstrafe",
          description: "Wie umfassend + Vertragsstrafe (z.B. 1 Bruttomonatsgehalt) bei jedem Verstoß.",
          risk: "high",
          riskNote: "§ 309 Nr. 6 BGB: pauschale Vertragsstrafe in AGB problematisch; nur wirksam wenn höhenmäßig angemessen. § 343 BGB: Gericht kann reduzieren.",
          whenProblem: "Wenn Strafhöhe unverhältnismäßig — Klausel unwirksam.",
          whenNegotiate: "AN: Reduzierung der Strafe oder Wegfall verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "nur_geheimGesetz",
          label: "Nur Verweis auf GeschGehG",
          description: "Verweis auf gesetzliche Regelungen, keine Vertragsklausel.",
          risk: "medium",
          riskNote: "GeschGehG schützt nur bei \"angemessenen Geheimhaltungsmaßnahmen\" (§ 2 Nr. 1 GeschGehG). Allein-Verweis schützt nicht.",
          whenProblem: "Wenn AG keine TOM trifft — kein Schutz.",
          whenNegotiate: "AG sollte konkrete Klausel ergänzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "streng_mit_vertragsstrafe", ausgewogen: "umfassend", durchsetzungsstark: "basis" }
    },

    // ── 10. Verfallklauseln ──
    {
      key: "forfeiture",
      title: "Verfallklauseln (Ausschlussfristen)",
      paragraph: "§ 11",
      description: "Zwei-Stufen-Verfallklauseln (schriftlich geltend machen → klagen) sind marktüblich. Mindestlohn (§ 3 MiLoG), Vorsatzhaftung und Personenschäden dürfen NICHT erfasst sein, sonst Gesamtnichtigkeit (BAG 18.09.2018 — 9 AZR 162/18).",
      importance: "high",
      options: [
        {
          value: "keine",
          label: "Keine Verfallklausel",
          description: "Gesetzliche Verjährung gilt (3 Jahre, § 195 BGB).",
          risk: "low",
          riskNote: "AN-freundlich. AG hat lange Restrisiko.",
          whenProblem: "AG: lange Unsicherheit über offene Forderungen.",
          whenNegotiate: "AG kann zumindest 6-Monats-Frist verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "3_monate_zwei_stufen",
          label: "3 Monate, zwei-stufig",
          description: "Frist 3 Monate ab Fälligkeit zur schriftlichen Geltendmachung + 3 Monate zur Klage.",
          risk: "medium",
          riskNote: "Wirksam, aber muss MiLoG/Vorsatz/Personenschäden ausnehmen (sonst Gesamtnichtigkeit, BAG 18.09.2018).",
          whenProblem: "Wenn Klausel unbeschränkt formuliert — fällt komplett weg.",
          whenNegotiate: "AN: Frist > 3 Monate; explizite Ausnahmen für Mindestlohn-Differenz.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "6_monate_zwei_stufen",
          label: "6 Monate, zwei-stufig",
          description: "Mildere Variante mit 6 Monaten je Stufe.",
          risk: "low",
          riskNote: "AN-freundlicher; weniger Streit.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlener Mittelweg.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "nur_einseitig_AN_kurz",
          label: "Verfall nur für AN-Ansprüche",
          description: "AN muss innerhalb 3 Monaten geltend machen, AG nicht.",
          risk: "high",
          riskNote: "Unwirksam wegen Benachteiligung (BAG 31.08.2005 — 5 AZR 545/04).",
          whenProblem: "Klausel kippt; AN-Ansprüche verjähren erst nach 3 Jahren.",
          whenNegotiate: "AG: symmetrische Klausel verwenden.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "3_monate_zwei_stufen", ausgewogen: "6_monate_zwei_stufen", durchsetzungsstark: "keine" }
    },

    // ── 11. Datenschutz, Schlussbestimmungen ──
    {
      key: "data_misc",
      title: "Datenschutz, Schlussbestimmungen, Schriftform",
      paragraph: "§ 12",
      description: "DSGVO-Pflichthinweise (Art. 13), salvatorische Klausel, Schriftform für Änderungen. Doppelte Schriftformklausel bei AGB unwirksam (BGH 25.01.2017 — XII ZR 69/16).",
      importance: "medium",
      options: [
        {
          value: "minimal",
          label: "Nur Schlussklauseln + DSGVO-Verweis",
          description: "Schriftform für Änderungen, salvatorische Klausel, Verweis auf separate Datenschutzinformation.",
          risk: "low",
          riskNote: "Schriftform seit 4. BEG (2025) auch elektronisch zulässig (NachwG-Textform).",
          whenProblem: "Selten.",
          whenNegotiate: "Akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "umfassend",
          label: "Umfassende Schlussbestimmungen",
          description: "DSGVO Art. 13-Information inline + Schriftform + Salvatorische + Gerichtsstand + Anwendbares Recht.",
          risk: "low",
          riskNote: "Maximale Transparenz, NachwG-konform.",
          whenProblem: "Lange Vertragstexte; aber rechtssicher.",
          whenNegotiate: "Empfohlen für Standard-AG.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "schriftform_doppelt",
          label: "Doppelte Schriftformklausel",
          description: "Änderungen, einschließlich der Schriftformklausel selbst, bedürfen der Schriftform.",
          risk: "high",
          riskNote: "Unwirksam in AGB (BGH 25.01.2017 — XII ZR 69/16; BAG 20.05.2008 — 9 AZR 382/07).",
          whenProblem: "Klausel kippt; mündliche Änderungen wirksam.",
          whenNegotiate: "Streichen, einfache Schriftform reicht.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gerichtsstand_ag",
          label: "Gerichtsstand am Sitz AG",
          description: "Gerichtsstand-Vereinbarung am Sitz des AG.",
          risk: "medium",
          riskNote: "Unwirksam für Streitigkeiten aus Arbeitsverhältnis — § 38 ZPO + § 48 ArbGG: ausschließlicher Gerichtsstand am Arbeitsort.",
          whenProblem: "Bei Klage AG am AG-Sitz: Verweisung.",
          whenNegotiate: "Streichen — gesetzlicher Gerichtsstand reicht.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "umfassend", ausgewogen: "minimal", durchsetzungsstark: "minimal" }
    }
  ]
};

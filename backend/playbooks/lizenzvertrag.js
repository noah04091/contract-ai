// Lizenzvertrag (IP-Lizenz) Playbook — Smart Playbook System
// Geführte Vertragserstellung für Patent-, Marken-, Urheberrechts- und Know-how-Lizenzen

module.exports = {
  type: "lizenzvertrag",
  title: "Lizenzvertrag (IP-Lizenz)",
  description: "Vertrag zwischen Lizenzgeber (Rechteinhaber) und Lizenznehmer über die Einräumung von Nutzungsrechten an Patenten, Marken, Urheberrechten/Software, Designs oder Know-how.",
  icon: "key-round",
  difficulty: "komplex",
  estimatedTime: "12–18 Minuten",
  legalBasis: "UrhG §§ 31, 31a, 32, 32a, 32d, 35, 40, 69a–69g; PatG § 15; MarkenG § 30, § 49; DesignG § 31; GeschGehG; GWB §§ 1, 2; VO (EU) 316/2014 (TT-GVO); VO (EU) 2022/720 (Vertikal-GVO); BGB §§ 305–310, §§ 581ff; UStG §§ 13b, 14; HGB §§ 87 ff; InsO §§ 103, 108a, 130",

  // Rollen-Definition
  roles: {
    A: { key: "lizenzgeber", label: "Lizenzgeber (LG)", description: "Inhaber des Schutzrechts oder Know-how-Träger, räumt Nutzungsrechte ein" },
    B: { key: "lizenznehmer", label: "Lizenznehmer (LN)", description: "Nutzer des Schutzrechts" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Lizenzgeber — einfache Lizenz, eng definiertes Territorium, kein Sublizenzrecht, jährliche Audits, restriktive Klauseln",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — klares Anwendungsfeld, Royalty-Modell mit Net-Sales-Definition, jährliches Audit-Recht, Sell-Off 6 Monate",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Lizenznehmer — ausschließliche weite Lizenz, Pauschalvergütung, Sublizenzrecht, langer Bestandsschutz, Insolvenzschutz",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    { key: "partyA_name", label: "Name / Firma (Lizenzgeber)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_legalForm", label: "Rechtsform Lizenzgeber", type: "select", required: true, group: "partyA",
      options: [
        { value: "natuerlich_urheber", label: "Natürliche Person / Urheber" },
        { value: "gmbh_ag", label: "GmbH / AG / UG" },
        { value: "universitaet", label: "Universität / Forschungseinrichtung" },
        { value: "patent_pool", label: "Patent-Pool / Lizenzkonsortium" },
        { value: "auslaendisch", label: "Ausländische Gesellschaft (Reverse Charge prüfen)" }
      ]
    },
    { key: "partyA_taxId", label: "USt-IdNr.", type: "text", required: false, group: "partyA" },

    { key: "partyB_name", label: "Name / Firma (Lizenznehmer)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_legalForm", label: "Rechtsform Lizenznehmer", type: "select", required: true, group: "partyB",
      options: [
        { value: "gmbh_ag", label: "GmbH / AG / UG" },
        { value: "konzern", label: "Konzern (Affiliate-Klausel relevant)" },
        { value: "auslaendisch_eu", label: "EU-Ausland" },
        { value: "auslaendisch_drittstaat", label: "Drittstaat (USA, Asien, etc.)" }
      ]
    },
    { key: "partyB_market_share", label: "Marktanteil (für Kartellrecht TT-GVO)", type: "select", required: true, group: "partyB",
      options: [
        { value: "unter_20", label: "Unter 20 % (TT-GVO Sicherheit zwischen Wettbewerbern)" },
        { value: "20_30", label: "20–30 % (zwischen Nicht-Wettbewerbern noch ok)" },
        { value: "ueber_30", label: "Über 30 % — KARTELLRECHT-EINZELPRÜFUNG erforderlich" },
        { value: "unbekannt", label: "Unbekannt / nicht relevant" }
      ]
    },

    { key: "ipType", label: "Lizenzgegenstand (Schutzrecht)", type: "select", required: true, group: "context",
      options: [
        { value: "patent", label: "Patent (PatG § 15)" },
        { value: "marke", label: "Marke (MarkenG § 30) — QUALITÄTSKONTROLLE PFLICHT" },
        { value: "design", label: "Design / Geschmacksmuster (DesignG § 31)" },
        { value: "urheberrecht_software", label: "Urheberrecht — Software (UrhG §§ 69a–69g)" },
        { value: "urheberrecht_werk", label: "Urheberrecht — Werk (Musik, Text, Bild) (UrhG §§ 31ff)" },
        { value: "knowhow", label: "Know-how / Geschäftsgeheimnis (GeschGehG)" },
        { value: "kombination", label: "Kombination (Patent + Marke + Know-how)" }
      ]
    },
    { key: "ipDescription", label: "Genaue Beschreibung des Lizenzgegenstands", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Patent DE 10 2023 123 456 'Verfahren zur ...', oder Marke MARKEN-NAME Klasse 9, 35, 42" },
    { key: "feeModel", label: "Vergütungsmodell", type: "select", required: true, group: "context",
      options: [
        { value: "lump_sum", label: "Lump-Sum (Pauschalbetrag einmalig)" },
        { value: "royalty", label: "Royalty (% vom Nettoumsatz oder Stücklizenz)" },
        { value: "minimum_royalty", label: "Mindestlizenz (garantiertes Minimum + Royalty)" },
        { value: "hybrid", label: "Hybrid (Up-Front-Fee + laufende Royalty)" },
        { value: "cross_license", label: "Cross-License (gegenseitige Lizenz, oft ohne Zahlung)" }
      ]
    },
    { key: "feeAmount", label: "Vergütungshöhe (Pauschal oder Royalty-Satz)", type: "text", required: true, group: "context",
      placeholder: "z.B. 100.000 EUR, oder 5 % vom Nettoumsatz, oder 10 EUR/Stück" },
    { key: "exclusivity", label: "Exklusivität", type: "select", required: true, group: "context",
      options: [
        { value: "einfach", label: "Einfache Lizenz (LG kann weitere LN einräumen)" },
        { value: "ausschliesslich", label: "Ausschließliche Lizenz (nur LN, auch nicht LG selbst)" },
        { value: "alleinig", label: "Alleinige Lizenz (LN + LG, keine weiteren LN)" }
      ]
    },
    { key: "territory", label: "Räumlicher Geltungsbereich", type: "select", required: true, group: "context",
      options: [
        { value: "deutschland", label: "Deutschland" },
        { value: "dach", label: "DACH-Region" },
        { value: "eu_ewr", label: "EU/EWR" },
        { value: "weltweit", label: "Weltweit" },
        { value: "regional_konkret", label: "Regional konkret (im Vertrag spezifiziert)" }
      ]
    },
    { key: "term", label: "Laufzeit", type: "select", required: true, group: "context",
      options: [
        { value: "befristet_3", label: "3 Jahre" },
        { value: "befristet_5", label: "5 Jahre" },
        { value: "befristet_10", label: "10 Jahre" },
        { value: "schutzrecht_laufzeit", label: "Bis Ende Schutzrechts (z.B. Patent 20 Jahre, Marke 10 Jahre verlängerbar)" },
        { value: "unbefristet", label: "Unbefristet (nur bei Urheberrecht praktikabel)" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — Das Herzstück des Playbooks
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Lizenzgegenstand ──
    {
      key: "licensed_ip",
      title: "Lizenzgegenstand und Schutzrechte",
      paragraph: "§ 2",
      description: "Genaue Bezeichnung der Schutzrechte ist Voraussetzung für Wirksamkeit. § 31 Abs. 5 UrhG (Zweckübertragungstheorie) — was nicht ausdrücklich eingeräumt, verbleibt beim Urheber.",
      importance: "critical",
      options: [
        {
          value: "pauschal",
          label: "Pauschale Bezeichnung (alle Rechte am Werk X)",
          description: "Generische Klausel ohne konkrete Schutzrechtsangabe.",
          risk: "high",
          riskNote: "§ 31 Abs. 5 UrhG: im Zweifel verbleiben Rechte beim Urheber. PatG: Patentnummer Pflicht. MarkenG: Markenregister-Eintrag.",
          whenProblem: "Wenn LG später behauptet, bestimmtes Recht sei nicht erfasst.",
          whenNegotiate: "Beide: konkrete Aufzählung mit Registernummern.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "register_konkret",
          label: "Konkrete Schutzrechte mit Registernummern",
          description: "Patent DE 10 2023 123 456, Marke EU 018888888, Software ProductX Version 4.2 inkl. Quellcode.",
          risk: "low",
          riskNote: "Eindeutig; durchsetzbar. LG behält volle Kontrolle über künftige Schutzrechte.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Beidseitig akzeptabel als sauberer Standard.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "register_plus_kuenftige",
          label: "Aktuelle Schutzrechte + künftige Verbesserungen",
          description: "...sowie alle künftigen Verbesserungen, Erweiterungen, Patente am gleichen Verfahren.",
          risk: "medium",
          riskNote: "Bei TT-GVO-Marktanteilen problematisch (Grant-Back-Klausel — Art. 5 TT-GVO). § 31a UrhG bei unbekannten Nutzungsarten Schriftform + Widerrufsrecht.",
          whenProblem: "Wenn künftige Schutzrechte signifikanten Wert entwickeln — Streit über Lizenzpflicht.",
          whenNegotiate: "Beide: Definition Verbesserungen eng fassen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "register_plus_knowhow",
          label: "Schutzrechte + Know-how (Geschäftsgeheimnis)",
          description: "Lizenz erstreckt sich auf Patent + zugehöriges Know-how (Verfahren, Schulungen, Dokumentation).",
          risk: "low",
          riskNote: "GeschGehG: Schutz des Know-how nur bei angemessenen Geheimhaltungsmaßnahmen.",
          whenProblem: "Bei Verlust Geheimhaltungsschutz — LG verliert Lizenzbasis.",
          whenNegotiate: "Beide: NDA-Pflichten in Lizenz integrieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "register_konkret", ausgewogen: "register_konkret", durchsetzungsstark: "register_plus_kuenftige" }
    },

    // ── 2. Exklusivität ──
    {
      key: "exclusivity",
      title: "Exklusivität und Lizenzart",
      paragraph: "§ 3",
      description: "Einfach, ausschließlich, alleinig — bestimmt Position des LG (kann selbst nutzen?) und Wettbewerb.",
      importance: "critical",
      options: [
        {
          value: "einfach_nicht_exklusiv",
          label: "Einfache, nicht-exklusive Lizenz",
          description: "LG kann beliebig viele weitere LN einräumen, auch selbst nutzen.",
          risk: "low",
          riskNote: "Standard für Massen-Lizenzierung (z.B. Software-EULA). LN: kein Schutz vor Wettbewerb durch andere LN.",
          whenProblem: "LN: Verlust strategischer Vorteile durch Konkurrenten-LN.",
          whenNegotiate: "LN: Mindestmarge oder Mengenpriorisierung verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "ausschliesslich_eng",
          label: "Ausschließliche Lizenz, eng definiertes Anwendungsfeld",
          description: "Nur LN darf nutzen — auch nicht LG. Beschränkt auf konkretes Anwendungsfeld (z.B. Automotive).",
          risk: "low",
          riskNote: "Ausschließlichkeit für Anwendung — LG kann andere Felder selbst nutzen. § 15 Abs. 3 PatG: Eintragung empfohlen.",
          whenProblem: "Wenn Anwendungsfeld unklar — Streit über Reichweite.",
          whenNegotiate: "Beide: präzise field-of-use-Definition.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "ausschliesslich_weit",
          label: "Ausschließliche Lizenz, weites Anwendungsfeld",
          description: "Nahezu vollständiger Ausschluss LG, LN dominant.",
          risk: "medium",
          riskNote: "LG verliert Verwertungsmöglichkeit. Bei kartellrechtlich relevanten Marktanteilen ggf. Art. 102 AEUV — Marktbeherrschung.",
          whenProblem: "LG: hohe Lizenzgebühr Pflicht zur Kompensation.",
          whenNegotiate: "LG: Mindestlizenz + Performance-Klausel (Pflicht zur tatsächlichen Verwertung).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "alleinig_sole",
          label: "Alleinige Lizenz (sole license)",
          description: "LG + LN beide dürfen nutzen, keine weiteren LN.",
          risk: "medium",
          riskNote: "Mittelweg. Aktivlegitimation gegen Verletzer beim LN umstritten.",
          whenProblem: "Streit über Aktivlegitimation bei Patentverletzung Dritter.",
          whenNegotiate: "Beide: Klarstellung Aktivlegitimation im Vertrag.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "einfach_nicht_exklusiv", ausgewogen: "ausschliesslich_eng", durchsetzungsstark: "ausschliesslich_weit" }
    },

    // ── 3. Territorium & Anwendungsfeld ──
    {
      key: "territory_field",
      title: "Territorium und Anwendungsfeld",
      paragraph: "§ 4",
      description: "Lizenz kann sachlich (field of use), zeitlich und räumlich beschränkt werden (§ 15 Abs. 2 PatG). Kartellrecht: TT-GVO Art. 4 — absolute Gebietsteilung als Kernbeschränkung schwarz.",
      importance: "high",
      options: [
        {
          value: "weltweit_alle_felder",
          label: "Weltweit, alle Anwendungsfelder",
          description: "Maximale Reichweite für LN.",
          risk: "low",
          riskNote: "LN-freundlich. LG verliert weitgehend Verwertungspotenzial.",
          whenProblem: "LG: kein Markt mehr für eigene Verwertung.",
          whenNegotiate: "LG: hoher Up-Front-Fee.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "eu_konkrete_felder",
          label: "EU/EWR, konkrete Anwendungsfelder",
          description: "Räumlich auf EU/EWR begrenzt; sachlich auf 1–3 Anwendungsfelder.",
          risk: "low",
          riskNote: "Standard. TT-GVO-konform (Gebiets-Aufteilung zwischen Wettbewerbern bis 20 % Marktanteil zulässig).",
          whenProblem: "Wenn LN über Gebiet hinaus aktiv wird — Vertragsverstoß.",
          whenNegotiate: "Beide: Klarstellung passive Verkäufe außerhalb Gebiet erlaubt (TT-GVO Art. 4 Abs. 1 lit. b).",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "eng_national_anwendung",
          label: "National, ein Anwendungsfeld",
          description: "Stark eingeschränkte Lizenz.",
          risk: "low",
          riskNote: "LG-freundlich; behält weite Verwertung.",
          whenProblem: "LN: Wachstum begrenzt.",
          whenNegotiate: "LN: Erweiterungsoption gegen Aufschlag.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_aktiven_passiven_klausel",
          label: "Aktive Verkäufe begrenzt, passive überall erlaubt",
          description: "Aktive Verkaufsförderung nur in Lizenzgebiet; passive Antworten an Anfragen aus anderen Gebieten erlaubt.",
          risk: "low",
          riskNote: "TT-GVO-konform; präziseste Variante.",
          whenProblem: "Streit über aktiv vs. passiv bei Online-Marketing.",
          whenNegotiate: "Beide: Online-Werbung-Definition klar (z.B. SEO/SEA länderspezifisch = aktiv).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "eng_national_anwendung", ausgewogen: "eu_konkrete_felder", durchsetzungsstark: "weltweit_alle_felder" }
    },

    // ── 4. Vergütung ──
    {
      key: "royalty_payment",
      title: "Lizenzvergütung und Abrechnung",
      paragraph: "§ 5",
      description: "Höhe + Modus + Bemessungsgrundlage + Zahlungsfristen + USt. Bei Royalty: präzise Definition Net Sales.",
      importance: "critical",
      options: [
        {
          value: "lump_sum",
          label: "Lump-Sum (Pauschalvergütung einmalig)",
          description: "Einmaliger Betrag bei Vertragsschluss; kein Tracking nötig.",
          risk: "low",
          riskNote: "Planbar; einfach abzuwickeln. § 32a UrhG-Risiko: bei Bestseller-Charakter Nachvergütung möglich.",
          whenProblem: "Bei unerwarteter Erfolgsverwertung — § 32a UrhG.",
          whenNegotiate: "Beide: Bestseller-Klausel mit Fairness-Anpassung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "royalty_net_sales",
          label: "Royalty (% vom Nettoumsatz)",
          description: "Z.B. 5 % vom Nettoumsatz; Net Sales präzise definiert (Brutto - USt - Skonti - Rückgaben).",
          risk: "medium",
          riskNote: "Marktstandard. § 32d UrhG: Auskunftsanspruch des Urhebers. Audit-Recht erforderlich.",
          whenProblem: "Wenn Net Sales unklar — Streit über Bemessungsgrundlage.",
          whenNegotiate: "Beide: Detail-Definition Net Sales mit Beispielrechnung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "minimum_royalty",
          label: "Mindestlizenz + Royalty",
          description: "Garantierter Jahresmindestbetrag plus Royalty-Anteil bei Überschreitung.",
          risk: "low",
          riskNote: "LG-freundlich; sichert Mindestumsätze. Bei zu hoher Mindestlizenz Risiko § 138 BGB Sittenwidrigkeit.",
          whenProblem: "LN: bei schwacher Verwertung — wirtschaftlicher Druck.",
          whenNegotiate: "LN: Anpassung bei Marktverschlechterung; Vertragsanpassungs-Klausel.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "hybrid_upfront_running",
          label: "Hybrid: Up-Front-Fee + laufende Royalty",
          description: "Anzahlung bei Vertragsschluss + laufende Royalties.",
          risk: "low",
          riskNote: "Modern, fair. Gemeinsame Risikoverteilung.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Beide: Up-Front gegen ggf. niedrigere Royalty-Rate.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "minimum_royalty", ausgewogen: "royalty_net_sales", durchsetzungsstark: "lump_sum" }
    },

    // ── 5. Audit-Recht ──
    {
      key: "audit_reporting",
      title: "Audit-Recht und Berichtspflicht",
      paragraph: "§ 6",
      description: "Bei Royalty-Modellen unverzichtbar. § 32d UrhG: Auskunftsanspruch des Urhebers (gesetzlich, nicht abdingbar).",
      importance: "high",
      options: [
        {
          value: "nur_jahresreport",
          label: "Nur Jahresreport ohne Audit",
          description: "LN liefert Jahresbericht mit Royalty-Berechnung.",
          risk: "medium",
          riskNote: "LG hat keine Verifikationsmöglichkeit. § 32d UrhG: Auskunftsanspruch des Urhebers gesetzlich.",
          whenProblem: "LG: Vermutung verkürzter Royalties — keine Handhabe.",
          whenNegotiate: "LG: zumindest Sachverständigen-Recht bei Verdacht.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "jaehrlich_einfach",
          label: "Jährliches Audit durch Sachverständigen, Kosten LG",
          description: "LG kann einmal jährlich Audit durch Wirtschaftsprüfer durchführen lassen, Kosten LG.",
          risk: "low",
          riskNote: "Marktstandard. OLG Düsseldorf 25.02.2025: Kosten beim Audit-Beauftragten (LG).",
          whenProblem: "Selten.",
          whenNegotiate: "LN: Bei Abweichung > 5 % zulasten LN: Kosten dann LN-Tragung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "jaehrlich_5_prozent_klausel",
          label: "Jährliches Audit + 5 %-Klausel",
          description: "Audit jährlich; bei Abweichung > 5 % LN trägt Kosten + Nachzahlung + Verzugszinsen.",
          risk: "low",
          riskNote: "OLG Düsseldorf 25.02.2025 bestätigt diesen Standard. Sehr LG-freundlich.",
          whenProblem: "LN: bei Tracking-Fehlern mit hoher Strafe.",
          whenNegotiate: "LN: Schwellenwert auf 7–10 % verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "quartalsweise_strict",
          label: "Quartalsweise Berichte + jährliches Vor-Ort-Audit",
          description: "LN liefert Quartalsberichte; LG kann Vor-Ort-Audit machen mit Datenzugriff (Bücher, ERP).",
          risk: "medium",
          riskNote: "Sehr LG-freundlich; aufwändig für LN.",
          whenProblem: "LN: hoher administrativer Aufwand.",
          whenNegotiate: "LN: Audit-Frequenz reduzieren auf 1× alle 2 Jahre.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "quartalsweise_strict", ausgewogen: "jaehrlich_einfach", durchsetzungsstark: "nur_jahresreport" }
    },

    // ── 6. Sublizenzierung ──
    {
      key: "sublicensing",
      title: "Sublizenzierung",
      paragraph: "§ 7",
      description: "§ 35 UrhG — Sublizenz nur mit Zustimmung Urheber, sofern nicht anders vereinbart. Patentlizenz: Sublizenz vertraglich zu regeln.",
      importance: "high",
      options: [
        {
          value: "keine_sublizenz",
          label: "Keine Sublizenz erlaubt",
          description: "LN darf nicht sublizenzieren.",
          risk: "low",
          riskNote: "Maximaler Schutz LG vor Verlust Kontrolle. § 35 UrhG-konform (Default-Regel).",
          whenProblem: "LN: keine Subunternehmer-Strukturen möglich.",
          whenNegotiate: "LN: zumindest Group-Companies-Klausel (§ 15 AktG).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_zustimmung",
          label: "Sublizenz mit schriftlicher LG-Zustimmung",
          description: "LG kann Zustimmung nicht ohne wichtigen Grund verweigern.",
          risk: "low",
          riskNote: "Marktstandard. Fair.",
          whenProblem: "Wenn LG Zustimmung pauschal verweigert — Rechtsstreit über wichtigen Grund.",
          whenNegotiate: "Beide: Liste anerkannter Gründe (z.B. Insolvenz Sublizenznehmer, Wettbewerb).",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "frei_mit_notification",
          label: "Sublizenz frei, nur Benachrichtigung an LG",
          description: "LN kann frei sublizenzieren, muss LG nur informieren.",
          risk: "medium",
          riskNote: "LN-freundlich. LG verliert Kontrolle über Lizenz-Reichweite.",
          whenProblem: "LG: Qualität/Reputation der Sublizenznehmer ungeprüft.",
          whenNegotiate: "LG: zumindest Pass-Through der Pflichten (Audit, Geheimhaltung).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "gruppe_konzernweite",
          label: "Sublizenz an verbundene Unternehmen erlaubt, andere mit Zustimmung",
          description: "Verbundene Unternehmen iSd § 15 AktG als Gruppe.",
          risk: "low",
          riskNote: "Pragmatischer Mittelweg für Konzern-LN.",
          whenProblem: "Wenn Beteiligung unter 50 % — Streit, ob noch verbundenes Unternehmen.",
          whenNegotiate: "Klare Definition (z.B. min. 50 % Stimmrecht).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "keine_sublizenz", ausgewogen: "mit_zustimmung", durchsetzungsstark: "frei_mit_notification" }
    },

    // ── 7. Verbesserungen / Grant-Back ──
    {
      key: "improvements",
      title: "Verbesserungen, Grant-Back, Improvements",
      paragraph: "§ 8",
      description: "Wenn LN Lizenzgegenstand verbessert — wem gehören die Verbesserungen? Kartellrecht TT-GVO Art. 5: ausschließliche Grant-Back-Pflicht ist graue Klausel.",
      importance: "medium",
      options: [
        {
          value: "bleiben_beim_ln",
          label: "Verbesserungen bleiben vollständig beim LN",
          description: "Klare Trennung; LN kann eigene Verbesserungen frei verwerten.",
          risk: "low",
          riskNote: "LN-freundlich. LG kann LN-Verbesserungen ggf. nicht nutzen.",
          whenProblem: "LG: ggf. überholt durch LN-Innovation.",
          whenNegotiate: "LG: Cross-License-Option für Verbesserungen verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "nicht_exklusive_lizenz_lg",
          label: "Nicht-exklusive Rückgewährung an LG",
          description: "LN behält Eigentum; LG erhält einfache Lizenz an Verbesserungen (kostenlos oder gegen Royalty).",
          risk: "low",
          riskNote: "TT-GVO-konform (nicht-exklusive Grant-Back ist Art. 5 nicht erfasst).",
          whenProblem: "Selten.",
          whenNegotiate: "Beide: Vergütung für Grant-Back klären (kostenlos vs. Royalty).",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "exklusive_uebertragung_lg",
          label: "Exklusive Übertragung an LG",
          description: "LN überträgt alle Verbesserungen exklusiv an LG.",
          risk: "high",
          riskNote: "TT-GVO Art. 5 problematisch (graue Klausel) — exklusive Grant-Back-Pflicht ist nicht freigestellt. Bei Marktanteilsschwellen kartellrechtswidrig.",
          whenProblem: "Bei Marktanteilen > 20 % → Vereinbarung kann nichtig sein (Art. 101 AEUV).",
          whenNegotiate: "Vermeiden — auf nicht-exklusive Variante reduzieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gemeinsam_co_owner",
          label: "Gemeinsame Inhaberschaft (Co-Ownership)",
          description: "LG und LN werden gemeinsame Inhaber der Verbesserung.",
          risk: "medium",
          riskNote: "Komplex; bei Patenten Streit über Verwertungsbeitrag.",
          whenProblem: "Wenn Verwertung erfolgreich — Streit über Anteile.",
          whenNegotiate: "Beide: klare Regelung Verwertungsanteile + Veto-Rechte.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "nicht_exklusive_lizenz_lg", ausgewogen: "nicht_exklusive_lizenz_lg", durchsetzungsstark: "bleiben_beim_ln" }
    },

    // ── 8. Qualitätskontrolle ──
    {
      key: "quality_control",
      title: "Qualitätskontrolle (insbes. Markenlizenz)",
      paragraph: "§ 9",
      description: "BGH GRUR 2003, 624 — bei Markenlizenz ungeschriebene Pflicht zur Qualitätskontrolle. § 49 Abs. 2 Nr. 2 MarkenG: Verfall bei Irreführung.",
      importance: "high",
      options: [
        {
          value: "keine_kontrolle",
          label: "Keine Qualitätskontrolle",
          description: "Kein Recht des LG zur Prüfung.",
          risk: "high",
          riskNote: "Bei Markenlizenz Markenverfall-Risiko (§ 49 Abs. 2 MarkenG). Bei Patent/Software meist unkritisch.",
          whenProblem: "Marke: Verlust des Markenrechts möglich.",
          whenNegotiate: "Bei Marke: zwingend mindestens Standards + Audit.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "standards_definiert",
          label: "Definierte Qualitätsstandards mit jährlicher Selbstprüfung",
          description: "LN unterliegt definierten Standards (z.B. Brand Guidelines); jährliche Selbstauskunft.",
          risk: "low",
          riskNote: "Marktstandard.",
          whenProblem: "Wenn Standards verfehlt — Heilung möglich.",
          whenNegotiate: "Beide: klare Folgen bei Verstoß.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "lg_pruefrecht_audit",
          label: "LG-Prüfrecht mit Vor-Ort-Audit",
          description: "LG kann jederzeit (mit angemessener Vorankündigung) Qualität vor Ort prüfen.",
          risk: "low",
          riskNote: "Sehr LG-freundlich. Schutz Markenwert.",
          whenProblem: "LN: höherer Aufwand.",
          whenNegotiate: "LN: Frequenz auf max. 2× pro Jahr begrenzen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_freigabe_pflicht",
          label: "LG-Freigabepflicht bei jeder Verwendung",
          description: "Werbematerialien, Produkte müssen vorher von LG freigegeben werden.",
          risk: "low",
          riskNote: "Maximaler Schutz LG. Bei kreativem LN-Geschäft hinderlich.",
          whenProblem: "LN: Time-to-market verzögert.",
          whenNegotiate: "LG: Mengenpauschale (z.B. nur Hauptkampagnen) statt jede Verwendung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "lg_pruefrecht_audit", ausgewogen: "standards_definiert", durchsetzungsstark: "keine_kontrolle" }
    },

    // ── 9. Schutzrechtsverletzung Dritte ──
    {
      key: "enforcement",
      title: "Schutzrechtsverletzung durch Dritte",
      paragraph: "§ 10",
      description: "Wer ist klagebefugt bei Patent-/Markenverletzung durch Dritte? Ausschließlicher LN ist klagebefugt (§ 30 Abs. 3 MarkenG analog), einfacher LN nur mit Zustimmung LG.",
      importance: "medium",
      options: [
        {
          value: "nur_lg_klagebefugt",
          label: "Nur LG klagebefugt",
          description: "LN muss LG informieren; LG entscheidet. Kosten LG; Ergebnis (Schadensersatz) bei LG.",
          risk: "medium",
          riskNote: "Bei ausschließlicher Lizenz LN-feindlich. § 30 Abs. 3 MarkenG: ausschließlicher LN auch klagebefugt mit Zustimmung.",
          whenProblem: "LN: bei LG-Untätigkeit kein Schutz.",
          whenNegotiate: "LN: Sekundär-Klagerecht nach 60-Tage-Wartefrist.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gemeinsam_oder_ln",
          label: "LG und LN gemeinsam, ggf. LN allein",
          description: "Beide klagebefugt; bei LG-Untätigkeit nach 60 Tagen kann LN allein vorgehen.",
          risk: "low",
          riskNote: "Marktstandard. Fair.",
          whenProblem: "Wenn beide unabhängig vorgehen — Doppelverfahren.",
          whenNegotiate: "Beide: Abstimmungspflicht vor Klageeinreichung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "nur_ln_bei_exklusiv",
          label: "Bei ausschließlicher Lizenz nur LN klagebefugt",
          description: "LN führt Klagen; LG unterstützt mit Vollmachten.",
          risk: "low",
          riskNote: "LN-freundlich. Aktivlegitimation klar.",
          whenProblem: "LG: bei mehreren Klagen kein Einfluss auf Strategie.",
          whenNegotiate: "LG: Veto-Recht bei Vergleichen mit Wirkung auf Patent.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "kosten_50_50_anteil",
          label: "Kosten/Erträge 50/50 oder anteilsbasiert",
          description: "Beide tragen Kosten und teilen Schadensersatz nach Verteilungsschlüssel.",
          risk: "low",
          riskNote: "Faire Risikoteilung.",
          whenProblem: "Verteilungsschlüssel-Streit.",
          whenNegotiate: "Vorab-Definition (z.B. nach Marktanteilen).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "nur_lg_klagebefugt", ausgewogen: "gemeinsam_oder_ln", durchsetzungsstark: "nur_ln_bei_exklusiv" }
    },

    // ── 10. Haftung & Garantie ──
    {
      key: "warranty_liability",
      title: "Haftung und Garantie für die Lizenz",
      paragraph: "§ 11",
      description: "Garantiert LG, dass das Schutzrecht besteht und unbelastet ist? Haftung bei Drittrechte-Verletzungen (Patent-/Marken-Vorrechte Dritter).",
      importance: "high",
      options: [
        {
          value: "keine_garantie",
          label: "Keine Garantie (as is)",
          description: "LG übernimmt keine Garantie für Bestand/Verwertbarkeit.",
          risk: "high",
          riskNote: "LN trägt volles Risiko, dass Schutzrecht ungültig oder Drittrechte verletzt. § 309 Nr. 8 BGB beachten.",
          whenProblem: "LN: bei Patentangriff durch Dritte volles Risiko.",
          whenNegotiate: "LN: zumindest Garantie für Inhaberschaft + Freiheit von Drittrechten.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "lg_inhaberschaft",
          label: "Garantie für Inhaberschaft + Freiheit Drittrechte zum Vertragsschluss",
          description: "LG garantiert: ist Inhaber, kennt keine entgegenstehenden Drittrechte.",
          risk: "low",
          riskNote: "Standard B2B. Marktüblich.",
          whenProblem: "Bei späterem Drittrechte-Auftauchen — Zwischen-Risiko.",
          whenNegotiate: "LN: Freistellungsklausel für Drittrechtsverletzungen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "freistellungsklausel",
          label: "Volle Freistellungsklausel + Verteidigung",
          description: "LG hält LN von allen Ansprüchen Dritter wegen Drittrechtsverletzung frei und übernimmt Verteidigung.",
          risk: "low",
          riskNote: "LN-freundlich. LG-Aufwand und Risiko hoch.",
          whenProblem: "LG: hohe Folgekosten bei Patentstreit.",
          whenNegotiate: "LG: Cap auf Lizenzgebühren der letzten 24 Monate; Mitwirkungspflicht LN.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "mit_validierungsanspruch",
          label: "Garantie + Validierungsklausel (Patent-Bestand)",
          description: "LG garantiert; bei Nichtigkeit Patent durch DPMA/EPA: anteilige Rückzahlung Lizenzgebühren.",
          risk: "medium",
          riskNote: "Selten, aber bei kritischen Patenten sinnvoll. EuGH C-100/21: bei nichtigem Lizenzvertrag kein Bereicherungsausschluss.",
          whenProblem: "Bei Patentnichtigkeit — Streit über Rückzahlungshöhe.",
          whenNegotiate: "Pauschale (ab Datum Nichtigkeit anteilig) oder rückwirkend.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "keine_garantie", ausgewogen: "lg_inhaberschaft", durchsetzungsstark: "freistellungsklausel" }
    },

    // ── 11. Vertragsende & Sell-Off ──
    {
      key: "term_end",
      title: "Vertragsende, Bestandsschutz und Sell-Off",
      paragraph: "§ 12",
      description: "Was passiert mit gefertigten Beständen, laufenden Sublizenzen, Kundenbeziehungen bei Vertragsende? Sell-Off-Period schützt LN vor wirtschaftlichem Totalverlust.",
      importance: "high",
      options: [
        {
          value: "kein_bestandsschutz",
          label: "Kein Bestandsschutz",
          description: "Mit Vertragsende Nutzungs- und Verkaufsverbot, alle Bestände zu vernichten.",
          risk: "high",
          riskNote: "LN-feindlich. Bei großen Lagerbeständen wirtschaftlicher Totalverlust.",
          whenProblem: "LN: Insolvenzrisiko.",
          whenNegotiate: "LN: Sell-Off-Period verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "sell_off_6_monate",
          label: "Sell-Off-Period 6 Monate",
          description: "LN darf gefertigte Bestände noch 6 Monate verkaufen, weiter Royalty-Pflicht.",
          risk: "low",
          riskNote: "Marktstandard. Fair.",
          whenProblem: "Bei Wettbewerb durch LG selbst — Marktstörung.",
          whenNegotiate: "Beide: Restbestand-Definition (Stichtag, Bestandsliste).",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "sell_off_12_monate",
          label: "Sell-Off-Period 12 Monate",
          description: "Längere Frist; in Branchen mit langen Produktionszyklen.",
          risk: "low",
          riskNote: "LN-freundlich.",
          whenProblem: "LG: längerer Abverkauf-Wettbewerb.",
          whenNegotiate: "LG: Mengenbegrenzung auf Stichtagsbestand.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "nachvertragl_supportphase",
          label: "12 Monate Sell-Off + Übergabe Kundenbeziehungen",
          description: "Inkl. Übergangsbetreuung Kunden, Migrationssupport.",
          risk: "low",
          riskNote: "Sehr LN-freundlich. Premium.",
          whenProblem: "LG: hoher Übergabe-Aufwand.",
          whenNegotiate: "Aufwand-Pauschale für Übergabe.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "kein_bestandsschutz", ausgewogen: "sell_off_6_monate", durchsetzungsstark: "sell_off_12_monate" }
    },

    // ── 12. Insolvenzschutz / Escrow ──
    {
      key: "insolvency_escrow",
      title: "Insolvenzschutz und Source Code Escrow",
      paragraph: "§ 13",
      description: "§ 103 InsO — Insolvenzverwalter LG kann Erfüllung wählen oder ablehnen. § 108a InsO Schutz für gewerbliche Schutzrechte.",
      importance: "medium",
      options: [
        {
          value: "keine_insolvenzklausel",
          label: "Keine besondere Insolvenzklausel",
          description: "Bei Insolvenz LG: § 103 InsO greift.",
          risk: "high",
          riskNote: "LN: bei Ablehnung durch IV — Lizenz erlischt. § 108a InsO bietet teils Schutz, aber begrenzt.",
          whenProblem: "LG-Insolvenz: LN verliert Lizenzbasis.",
          whenNegotiate: "LN: Insolvenzklausel + Escrow.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "insolvenzklausel_einfach",
          label: "Insolvenzklausel mit Sublizenz-Recht",
          description: "Bei Insolvenz LG kann LN Lizenz behalten und an Erwerber Schutzrecht weitergeben.",
          risk: "low",
          riskNote: "Standard für strategische Lizenzen. Wirksamkeit gegen IV umstritten — § 108a InsO klärt teilweise.",
          whenProblem: "Wirksamkeit gegen IV in der Praxis nicht abschließend geklärt.",
          whenNegotiate: "Beide: Klausel mit § 108a InsO-Verweis.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "escrow_sourcecode",
          label: "Source Code Escrow bei DEAL/EscrowEurope",
          description: "Quellcode + Build-Doku bei Treuhänder; Freigabe bei Insolvenz LG oder wesentlicher Vertragsverletzung.",
          risk: "low",
          riskNote: "Bei Software-Lizenz unverzichtbar.",
          whenProblem: "Build-Doku unvollständig — Code unbrauchbar.",
          whenNegotiate: "Beide: jährliche Verifikationsprüfung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "escrow_plus_uebertragung",
          label: "Escrow + automatische Rechte-Übertragung bei Insolvenz",
          description: "Bei Insolvenz LG werden Schutzrechte automatisch an LN übertragen (gegen Restzahlung Lizenzgebühr-Barwert).",
          risk: "medium",
          riskNote: "Sehr LN-freundlich. Wirksamkeit gegen IV umstritten — i.d.R. nur als Recht auf Verkauf zu festgelegtem Preis durchsetzbar.",
          whenProblem: "IV kann Klausel als unzulässige Begünstigung anfechten (§ 130 InsO Anfechtung).",
          whenNegotiate: "LG: nur bei kritischer Lizenz; Aufschlag in Lizenzgebühr.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "keine_insolvenzklausel", ausgewogen: "insolvenzklausel_einfach", durchsetzungsstark: "escrow_sourcecode" }
    },

    // ── 13. Schlussbestimmungen ──
    {
      key: "dispute_resolution",
      title: "Schlussbestimmungen (Schiedsgericht, Gerichtsstand, Recht)",
      paragraph: "§ 14",
      description: "Bei internationalen Lizenzverträgen Schiedsgericht oft sinnvoll (ICC, WIPO Mediation/Arbitration, DIS).",
      importance: "medium",
      options: [
        {
          value: "staatliches_gericht_de",
          label: "Deutsches Gericht (Beklagtensitz oder Patentkammer)",
          description: "§ 12 ZPO Standard; spezialisierte Patent-/Markenkammer.",
          risk: "low",
          riskNote: "Faire Lösung; Patentstreit-Spezialgericht.",
          whenProblem: "International unhandlich.",
          whenNegotiate: "Direkt akzeptabel als Standard für nationale Verträge.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "lg_sitz_oder_anbieter",
          label: "Gerichtsstand am Sitz LG",
          description: "LG-freundlich.",
          risk: "medium",
          riskNote: "Bei B2B § 38 ZPO zulässig.",
          whenProblem: "LN muss anreisen.",
          whenNegotiate: "LN: Schiedsgericht.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "schiedsgericht_dis",
          label: "DIS-Schiedsgericht",
          description: "Deutsche Institution für Schiedsgerichtsbarkeit. § 1031 ZPO Schriftform.",
          risk: "medium",
          riskNote: "Schnell, vertraulich. Schiedsgebühren hoch (>1.500 EUR Streitwert).",
          whenProblem: "Bei niedrigen Streitwerten unverhältnismäßig.",
          whenNegotiate: "Nur bei großen Streitwerten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "wipo_icc_international",
          label: "WIPO/ICC Schiedsgericht (international)",
          description: "Bei Lizenzverträgen mit Auslandsbezug etabliert. WIPO bietet IP-Spezialschiedsgerichte.",
          risk: "medium",
          riskNote: "International anerkannt. Vollstreckung über NY-Übereinkommen.",
          whenProblem: "Verfahrenskosten.",
          whenNegotiate: "Bei großen internationalen Verträgen Standard.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "lg_sitz_oder_anbieter", ausgewogen: "staatliches_gericht_de", durchsetzungsstark: "wipo_icc_international" }
    }
  ]
};

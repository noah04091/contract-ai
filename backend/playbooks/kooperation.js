// Kooperationsvertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Recherche-Doc: docs/playbooks/kooperation.md

module.exports = {
  type: "kooperation",
  title: "Kooperationsvertrag",
  description: "Strukturierte Zusammenarbeit zwischen zwei Unternehmen ohne Gründung einer Gesellschaft — für strategische Partnerschaften, Joint Ventures (light) und F&E-Projekte.",
  icon: "handshake",
  difficulty: "komplex",
  estimatedTime: "12–18 Minuten",
  legalBasis: "BGB §§ 241, 311 Abs. 1, §§ 705 ff. (GbR-Risiko nach MoPeG-Reform 2024); GWB §§ 1 ff., Art. 101 AEUV; VO (EU) 2023/1066 (F&E-GVO); VO (EU) 2022/720 (Vertikal-GVO); DSGVO Art. 26 (Joint Controllership); GeschGehG; UrhG §§ 7, 8, 31",

  // Rollen-Definition
  roles: {
    A: { key: "partyA", label: "Erste Kooperationspartnerin", description: "Typischerweise die Partei, die die Initiative ergreift, das Projekt strukturiert oder wesentliche Vermögenswerte (Marke, Technologie, Standort) einbringt" },
    B: { key: "partyB", label: "Zweite Kooperationspartnerin", description: "Hinzukommende Partei mit komplementären Fähigkeiten, Zugängen oder Ressourcen" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Maximale Risikominimierung — strikter GbR-Ausschluss, beschränkte Beitragspflichten, IP-konservativ, kurze Laufzeit, einfache Beendigung",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — durchsetzbarer Vertrag mit fairer Beitragsbalance, gemeinsam erarbeitete Ergebnisse als Co-IP, mittlere Laufzeit, geordnete Beendigung",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Tief integrierte Kooperation mit starker Bindung — exklusive Beziehung, klare Lead-Partei, weitreichende Wettbewerbsverbote, lange Mindestlaufzeit",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    // Partei A
    { key: "partyA_name", label: "Name / Firma (Erste Partei)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Adresse", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertreten durch (Geschäftsführer / Vorstand)", type: "text", required: true, group: "partyA" },
    { key: "partyA_register", label: "Handelsregister-Nr. (HRA / HRB)", type: "text", required: false, group: "partyA",
      placeholder: "z.B. HRB 12345 — AG München" },

    // Partei B
    { key: "partyB_name", label: "Name / Firma (Zweite Partei)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Adresse", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_representative", label: "Vertreten durch (Geschäftsführer / Vorstand)", type: "text", required: true, group: "partyB" },
    { key: "partyB_register", label: "Handelsregister-Nr. (HRA / HRB)", type: "text", required: false, group: "partyB" },

    // Kontext
    { key: "cooperationName", label: "Projektname / Bezeichnung der Kooperation", type: "text", required: true, group: "context",
      placeholder: "z.B. 'Strategische Partnerschaft Solar-Logistik 2026'" },
    { key: "cooperationType", label: "Typ der Kooperation", type: "select", required: true, group: "context",
      options: [
        { value: "strategic_partnership", label: "Strategische Partnerschaft (vertikal, z.B. Lieferant + Anwender)" },
        { value: "joint_marketing", label: "Co-Marketing / Vertriebskooperation" },
        { value: "research_development", label: "Forschungs- & Entwicklungs-Kooperation (F&E)" },
        { value: "joint_venture_light", label: "Joint Venture light (gemeinsames Projekt ohne Gesellschaftsgründung)" },
        { value: "horizontal_alliance", label: "Horizontale Allianz (Wettbewerber kooperieren)" }
      ]
    },
    { key: "cooperationPurpose", label: "Konkreter Kooperationszweck (so eng wie möglich!)", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Gemeinsame Entwicklung und Vermarktung einer KI-basierten Logistiklösung für die deutsche Solarindustrie im Zeitraum 2026–2028." },
    { key: "areCompetitors", label: "Sind die Parteien Wettbewerber im selben Markt?", type: "select", required: true, group: "context",
      options: [
        { value: "no", label: "Nein, komplementär" },
        { value: "partial", label: "Teilweise (überlappende Märkte)" },
        { value: "yes", label: "Ja, direkte Wettbewerber" }
      ]
    },
    { key: "startDate", label: "Geplanter Start der Kooperation", type: "date", required: true, group: "context" }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Kooperationszweck und Abgrenzung ──
    {
      key: "purpose_scope",
      title: "Kooperationszweck und Abgrenzung",
      paragraph: "§ 2",
      description: "Definiert, was die Parteien gemeinsam tun und — noch wichtiger — was NICHT Bestandteil der Kooperation ist. Eine zu weite Definition kann eine GbR begründen.",
      importance: "critical",
      options: [
        {
          value: "narrow_project",
          label: "Eng definiertes Einzelprojekt",
          description: "Klarer, abgegrenzter Projektrahmen mit konkretem Endziel und Zeitrahmen. Keine darüberhinausgehende Zusammenarbeit gewollt.",
          risk: "low",
          riskNote: "Stärkster Schutz vor unbeabsichtigter GbR-Gründung. Klare Grenzen schützen vor Spillover.",
          whenProblem: "Wenn das Projekt erfolgreich ist und die Parteien plötzlich auf andere Bereiche ausweiten wollen — dafür braucht es einen neuen Vertrag.",
          whenNegotiate: "Wenn die andere Partei flexibler bleiben möchte und auf 'rolling scope' besteht.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "defined_scope_with_extension",
          label: "Definierter Scope mit Erweiterungsoption",
          description: "Kernzweck ist klar definiert, eine Erweiterung ist nur durch schriftliche Zusatzvereinbarung möglich.",
          risk: "low",
          riskNote: "Marktstandard. Bietet Klarheit und gleichzeitig Wachstumspotential.",
          whenProblem: "Wenn die Parteien die Erweiterung nicht formell festhalten und stattdessen 'im Zweifel kooperieren' — dann droht GbR-Auslegung.",
          whenNegotiate: "Selten — fairer Kompromiss zwischen Stabilität und Flexibilität.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "broad_strategic",
          label: "Breite strategische Allianz",
          description: "Übergreifender Kooperationszweck mit mehreren Geschäftsfeldern, Lead-Partei behält Steuerung.",
          risk: "high",
          riskNote: "Erhöhtes GbR-Risiko, da gemeinsamer Zweck weit gefasst ist. Erfordert kompensierend strikte GbR-Ausschluss-Klausel und keine gemeinsame Gewinnverteilung.",
          whenProblem: "Wenn die gemeinsamen Aktivitäten nach außen als einheitliches Auftreten wahrgenommen werden — dann unterstellt das Gericht eine Außen-GbR.",
          whenNegotiate: "Wenn du die strategisch schwächere Partei bist, willst du keinen so weiten Zweck akzeptieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "narrow_project", ausgewogen: "defined_scope_with_extension", durchsetzungsstark: "broad_strategic" }
    },

    // ── 2. Beiträge der Parteien ──
    {
      key: "contributions",
      title: "Beiträge der Parteien",
      paragraph: "§ 3",
      description: "Wer bringt was ein? Geld, Personal, Know-how, IP, Kundenzugänge? Beitragspflichten sind zentrales Indiz für GbR-Gründung — daher präzise und einseitig (jede Partei für sich) beschreiben.",
      importance: "critical",
      options: [
        {
          value: "independent_each",
          label: "Eigene Beiträge, kein gemeinsamer Pool",
          description: "Jede Partei trägt ihre Kosten und Ressourcen selbst. Kein gemeinsames Vermögen, keine gemeinsamen Konten.",
          risk: "low",
          riskNote: "Bestmöglicher Schutz vor GbR-Auslegung. Klare Trennung der Vermögenssphären.",
          whenProblem: "Wenn das Projekt einen physischen Output (Prototyp, Software) erzeugt, der nicht eindeutig einer Partei gehört.",
          whenNegotiate: "Wenn die andere Partei auf gemeinsame Investitionen drängt — dann lieber Spezialisierungs-Vereinbarung wählen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "itemized_with_value",
          label: "Aufgeschlüsselte Beiträge mit Wertangabe",
          description: "Anlage zum Vertrag listet exakt auf, was jede Partei einbringt (Stunden, Lizenzen, Daten, Geräte) — inklusive geschätzten Geldwerts. Trotzdem keine Vermögensgemeinschaft.",
          risk: "medium",
          riskNote: "Erhöhte Transparenz, aber Wertangaben können bei Streit als gemeinsame Beiträge ausgelegt werden — daher GbR-Ausschluss-Klausel zwingend.",
          whenProblem: "Wenn die Beiträge der Parteien sich stark unterscheiden und Ausgleichsforderungen entstehen können.",
          whenNegotiate: "Selten — diese Form ist marktstandard für nicht-triviale Kooperationen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "pooled_resources",
          label: "Gemeinsamer Ressourcen-Pool",
          description: "Beide Parteien zahlen in ein gemeinsames Projektbudget ein, das gemeinsam verwaltet wird.",
          risk: "high",
          riskNote: "Sehr hohes GbR-Risiko! Gemeinsames Vermögen ist das klassische Indiz für eine Gesellschaft. Nur wählen, wenn GbR bewusst gewollt ist (dann besser direkt eine GbR/GmbH gründen).",
          whenProblem: "Praktisch immer — Gerichte werten dies regelmäßig als Außen-GbR mit voller Haftung.",
          whenNegotiate: "Fast immer — wenn gemeinsame Mittel gewollt, lieber gleich eine separate Projektgesellschaft (GmbH) gründen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "independent_each", ausgewogen: "itemized_with_value", durchsetzungsstark: "itemized_with_value" }
    },

    // ── 3. Eigentum an gemeinsam erarbeiteten Ergebnissen ──
    {
      key: "joint_ip",
      title: "Eigentum an Arbeitsergebnissen / IP-Rechte",
      paragraph: "§ 4",
      description: "Wem gehören Erfindungen, Software, Marken, Texte, Designs, die im Rahmen der Kooperation entstehen? Ohne Regelung gilt automatisch: Bei Miturheberschaft (§§ 7, 8 UrhG) gemeinsame Verwertung — keine Partei kann allein verwerten.",
      importance: "critical",
      options: [
        {
          value: "each_keeps_own",
          label: "Jede Partei behält, was sie selbst schafft",
          description: "Was eine Partei alleine erarbeitet, gehört nur ihr. Bei gemeinsamer Schöpfung wird ausschließlich der eingebrachte Anteil zurückgegeben — keine Co-Inhaberschaft.",
          risk: "low",
          riskNote: "Konservativ, einfach. Schützt jede Partei vor unbeabsichtigtem Rechteverlust.",
          whenProblem: "Wenn Ergebnisse so eng verflochten sind, dass eine saubere Trennung unmöglich ist — dann entstehen ungelöste Streitigkeiten.",
          whenNegotiate: "Wenn die andere Partei darauf besteht, gemeinsam erschaffenes IP gemeinsam zu nutzen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "joint_ownership_with_license",
          label: "Co-Eigentum mit gegenseitiger Lizenz",
          description: "Gemeinsam erarbeitete IP gehört beiden Parteien je zu 50 %. Beide haben unwiderrufliches Nutzungsrecht. Verwertung an Dritte nur mit gegenseitiger Zustimmung.",
          risk: "medium",
          riskNote: "Marktstandard bei F&E-Kooperationen, aber bei Konflikt schwer auflösbar (Patt-Situation).",
          whenProblem: "Wenn eine Partei kommerziell verwerten will, die andere blockiert — Stillstand. Tie-Breaker-Mechanismus empfehlenswert.",
          whenNegotiate: "Bei dominant unterschiedlichen Beiträgen — gerechtere Quoten als 50/50 finden.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "lead_owns_others_license",
          label: "Lead-Partei wird Eigentümer, andere erhält Lizenz",
          description: "Eine Partei (z.B. Partei A) wird Alleininhaber der gemeinsam erarbeiteten Rechte. Die andere Partei erhält eine kostenlose, zeitlich begrenzte, nicht-exklusive Nutzungslizenz für den vereinbarten Zweck.",
          risk: "medium",
          riskNote: "Kartellrechtlich heikel, wenn die Lizenz zu eng ist (F&E-GVO Art. 6 Abs. 1 lit. b — Zugang muss gewährleistet sein). Bei Wettbewerbern kritisch.",
          whenProblem: "Wenn die lizenznehmende Partei feststellt, dass sie ohne Eigentum von Folgeentwicklungen ausgeschlossen ist.",
          whenNegotiate: "Wenn du die nicht-führende Partei bist, immer — bestehe auf Zugang zu Verbesserungen / Folgeentwicklungen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "each_keeps_own", ausgewogen: "joint_ownership_with_license", durchsetzungsstark: "lead_owns_others_license" }
    },

    // ── 4. Vertraulichkeit ──
    {
      key: "confidentiality",
      title: "Vertraulichkeit",
      paragraph: "§ 5",
      description: "Schutz vertraulicher Informationen während und nach Vertragsende. Pflicht nach GeschGehG: nur wenn der Vertrag 'angemessene Geheimhaltungsmaßnahmen' verlangt, ist der Inhalt rechtlich als Geschäftsgeheimnis geschützt.",
      importance: "high",
      options: [
        {
          value: "integrated_basic",
          label: "Basis-Vertraulichkeitsklausel im Kooperationsvertrag",
          description: "Geheimhaltungspflicht für 3 Jahre nach Vertragsende, Standard-Ausnahmen (öffentlich bekannt, unabhängig entwickelt etc.).",
          risk: "medium",
          riskNote: "Ausreichend für Standard-Kooperationen, aber bei sensiblem Know-how zu schwach.",
          whenProblem: "Wenn hochsensible Daten (Algorithmen, Kundenlisten, Roadmaps) ausgetauscht werden — separate NDA besser.",
          whenNegotiate: "Wenn die Gegenseite stärkere Geheimhaltung verlangt.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "integrated_strict",
          label: "Strenge Klausel mit Audit und Sicherheitsstandards",
          description: "5 Jahre nach Vertragsende, Need-to-know-Prinzip, technisch-organisatorische Mindestmaßnahmen, Audit-Recht, Vertragsstrafe bei Verstoß.",
          risk: "low",
          riskNote: "Höchster Schutz, gerichtlich durchsetzbar.",
          whenProblem: "Aufwändig in der Umsetzung, kann bei kleineren Partnern abschreckend wirken.",
          whenNegotiate: "Wenn die Auditpflichten unverhältnismäßig sind im Vergleich zur eingebrachten Information.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "separate_nda",
          label: "Verweis auf separaten NDA",
          description: "Vertraulichkeit wird in einem eigenen NDA geregelt, der parallel abgeschlossen wird.",
          risk: "low",
          riskNote: "Saubere Trennung, einfache Aktualisierung des NDAs ohne den Kooperationsvertrag zu ändern. Best Practice bei komplexen Kooperationen.",
          whenProblem: "Wenn die Verweisung im Hauptvertrag und der NDA inhaltlich auseinanderlaufen — Inkonsistenzen prüfen.",
          whenNegotiate: "Selten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "integrated_strict", ausgewogen: "integrated_basic", durchsetzungsstark: "integrated_basic" }
    },

    // ── 5. Wettbewerbsverbot und Exklusivität ──
    {
      key: "exclusivity_noncompete",
      title: "Exklusivität und Wettbewerbsverbot",
      paragraph: "§ 6",
      description: "Darf jede Partei während der Kooperation parallel mit Wettbewerbern der anderen kooperieren? Kartellrechtlich heikel: pauschale Wettbewerbsverbote zwischen Wettbewerbern sind Kernbeschränkungen.",
      importance: "high",
      options: [
        {
          value: "no_exclusivity",
          label: "Keine Exklusivität, freier Markt",
          description: "Beide Parteien können parallel mit anderen Partnern (auch Wettbewerbern) zusammenarbeiten.",
          risk: "low",
          riskNote: "Kartellrechtlich unbedenklich. Maximaler unternehmerischer Spielraum.",
          whenProblem: "Wenn die andere Partei beginnt, die Erkenntnisse aus der Kooperation parallel zu Wettbewerbern zu tragen — dann fehlt der Schutz.",
          whenNegotiate: "Wenn dein Beitrag besonders wertvoll oder einzigartig ist und du Schutz brauchst.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "scope_limited",
          label: "Exklusivität nur für den Kooperationszweck",
          description: "Während der Laufzeit dürfen die Parteien nicht mit Dritten an demselben spezifischen Projekt / Produkt arbeiten. Andere Aktivitäten bleiben frei.",
          risk: "medium",
          riskNote: "Kartellrechtlich akzeptabel bei vertikalen Kooperationen unter der Vertikal-GVO. Bei horizontalen Kooperationen Marktanteilsschwelle (25 % F&E-GVO bzw. 30 % Vertikal-GVO) prüfen.",
          whenProblem: "Wenn die Definition des 'Kooperationszwecks' unklar ist — dann wird die Exklusivität ausuferndt.",
          whenNegotiate: "Wenn dein Geschäftsfeld so spezifisch ist, dass eine Begrenzung dich praktisch ausschließt.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "broad_noncompete",
          label: "Umfassendes Wettbewerbsverbot",
          description: "Während der Laufzeit und 12 Monate danach: keine Kooperationen mit identifizierten Wettbewerbern in einem definierten räumlichen / sachlichen Markt.",
          risk: "high",
          riskNote: "Hohe kartellrechtliche Sprengkraft! Bei direkten Wettbewerbern (areCompetitors === 'yes') kann die Klausel als Marktaufteilung qualifiziert werden = Bezweckte Wettbewerbsbeschränkung = nichtig + Bußgeld. Vor Verwendung kartellrechtliche Prüfung dringend.",
          whenProblem: "Bei Wettbewerbern fast immer ein Risiko. Auch bei Nicht-Wettbewerbern wird die Marktanteilsschwelle der GVOs leicht überschritten.",
          whenNegotiate: "Immer — bei Wettbewerbern besser eng zuschneiden auf konkretes Produkt + räumlich auf relevanten Markt + zeitlich auf 6–12 Monate.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "no_exclusivity", ausgewogen: "scope_limited", durchsetzungsstark: "broad_noncompete" }
    },

    // ── 6. Kostenteilung und finanzielle Verteilung ──
    {
      key: "cost_revenue_sharing",
      title: "Kostenteilung und finanzielle Verteilung",
      paragraph: "§ 7",
      description: "Wer trägt welche Kosten? Wie werden Erlöse aus der Kooperation verteilt? Eine gemeinsame Gewinnverteilung ist das stärkste Indiz für eine GbR und sollte vermieden oder sauber strukturiert werden.",
      importance: "high",
      options: [
        {
          value: "each_pays_own",
          label: "Jede Partei trägt ihre Kosten, keine gemeinsamen Erlöse",
          description: "Beide arbeiten auf eigene Rechnung; Erlöse erzielt jede Partei separat aus ihren eigenen Verträgen mit Endkunden.",
          risk: "low",
          riskNote: "Stärkster Schutz vor Mitunternehmerschaft / GbR. Steuerlich und gesellschaftsrechtlich unproblematisch.",
          whenProblem: "Wenn die Wertschöpfung tatsächlich gemeinsam erfolgt — dann fühlt sich 'jede für sich' unfair an.",
          whenNegotiate: "Wenn deine Beiträge wesentlich höher sind und du keinen Ausgleich erhältst.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "itemized_invoicing",
          label: "Aufgeschlüsselte gegenseitige Verrechnung",
          description: "Definierte Kostenarten werden zwischen den Parteien wechselseitig in Rechnung gestellt (z.B. Partei B berechnet Stundenaufwand an Partei A). Keine gemeinsame Kasse, klare Leistungsbeziehung.",
          risk: "low",
          riskNote: "Marktstandard. Steuerlich sauber als Leistungsbeziehung B2B abbildbar.",
          whenProblem: "Wenn die Verrechnungsregeln zu komplex werden und Streit über die Bewertung entsteht.",
          whenNegotiate: "Selten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "profit_share",
          label: "Gewinnbeteiligung am Kooperationserfolg",
          description: "Definierte prozentuale Aufteilung der gemeinsamen Erträge nach Abzug zurechenbarer Kosten.",
          risk: "high",
          riskNote: "Gefahrenzone: Gewinnbeteiligung ist klassisches Mitunternehmer-Indiz (§ 15 EStG). Steuerlich häufig als Mitunternehmerschaft mit gesonderter Feststellung qualifiziert. Vorab Steuerberater einbinden!",
          whenProblem: "Spätestens beim ersten Geschäftsjahr-Abschluss — Finanzamt fordert einheitliche Gewinnfeststellung. Auch GbR-Risiko deutlich erhöht.",
          whenNegotiate: "Immer — wenn Gewinnbeteiligung gewollt, dann besser eine separate Projektgesellschaft (GmbH) als Vehikel gründen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "each_pays_own", ausgewogen: "itemized_invoicing", durchsetzungsstark: "profit_share" }
    },

    // ── 7. Vertretung gegenüber Dritten ──
    {
      key: "external_representation",
      title: "Vertretung gegenüber Dritten",
      paragraph: "§ 8",
      description: "Wie tritt die Kooperation nach außen auf? Gemeinsamer Auftritt = Indiz für Außen-GbR. Diese Sektion ist neben Beiträgen und Gewinnverteilung das dritte zentrale GbR-Vermeidungs-Element.",
      importance: "critical",
      options: [
        {
          value: "independent_external",
          label: "Jede Partei tritt eigenständig auf",
          description: "Jede Partei kommuniziert mit eigenen Kunden / Lieferanten in eigenem Namen. Kein gemeinsames Logo, kein gemeinsamer Briefkopf, keine gemeinsame Hotline.",
          risk: "low",
          riskNote: "Optimaler Schutz vor Außen-GbR-Auslegung.",
          whenProblem: "Wenn die Endkunden einen einheitlichen Ansprechpartner erwarten (z.B. Komplett-Lösung).",
          whenNegotiate: "Wenn ein Co-Branding gewünscht ist.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "co_branding_with_disclaimer",
          label: "Co-Branding mit eindeutigem Hinweis",
          description: "Gemeinsames Logo / Slogan zulässig, aber stets mit Klarstellung 'Eine Kooperation der Firma A und der Firma B — keine gemeinsame Gesellschaft'.",
          risk: "medium",
          riskNote: "Akzeptabel, sofern die Disclaimer prominent sind. Schutz vor GbR-Anschein durch Hinweistechnik.",
          whenProblem: "Wenn die Disclaimer im Marketing nicht konsequent verwendet werden — dann ist die Außenwirkung trotzdem GbR-typisch.",
          whenNegotiate: "Selten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "lead_party_represents",
          label: "Lead-Partei vertritt nach außen",
          description: "Eine Partei tritt als alleiniger Ansprechpartner auf, die andere wird als Subunternehmer/Lieferant strukturiert.",
          risk: "medium",
          riskNote: "Klarste Außenstruktur — keine GbR-Wirkung. Aber: Lead-Partei trägt das Vertragsrisiko allein.",
          whenProblem: "Wenn der Lead die andere Partei nicht abdeckt (Haftung, Versicherung) und im Schadensfall Regress nehmen muss.",
          whenNegotiate: "Wenn du die nicht-führende Partei bist — Klärung der Innenrückgriffspflicht im Schadensfall sicherstellen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "independent_external", ausgewogen: "co_branding_with_disclaimer", durchsetzungsstark: "lead_party_represents" }
    },

    // ── 8. GbR-Ausschluss und Haftungsbegrenzung ──
    {
      key: "gbr_exclusion_liability",
      title: "GbR-Ausschluss und Haftungsbegrenzung",
      paragraph: "§ 9",
      description: "Pflichtinhalt jedes professionellen Kooperationsvertrags: explizite Klarstellung, dass keine Gesellschaft gegründet wird, plus Abgrenzung der Haftung im Innenverhältnis.",
      importance: "critical",
      options: [
        {
          value: "hard_exclusion_strict_liability",
          label: "Hartes No-GbR + strenge Eigenhaftung",
          description: "Vertragstext: 'Die Parteien begründen weder eine Gesellschaft des bürgerlichen Rechts noch eine andere Gesellschaft.' + Jede Partei haftet ausschließlich für ihre eigenen Handlungen, kein Rückgriff für gemeinsame Schäden.",
          risk: "low",
          riskNote: "Stärkste Schutzklausel. Auch wenn Gerichte sich nicht allein an die Bezeichnung halten, ist sie das wichtigste Indiz im Streitfall.",
          whenProblem: "Wenn andere Klauseln (Beiträge, Gewinnverteilung, gemeinsamer Auftritt) trotzdem GbR-typisch sind, kippt die Klausel allein.",
          whenNegotiate: "Selten — diese Klausel ist meist akzeptabel für beide Seiten.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "hard_exclusion_capped_liability",
          label: "Hartes No-GbR + Haftung auf vorhersehbare Schäden begrenzt",
          description: "GbR-Ausschluss + gegenseitige Haftung beschränkt auf typische, vorhersehbare Schäden. Vorsatz / grobe Fahrlässigkeit immer voll.",
          risk: "low",
          riskNote: "Marktstandard für B2B. Vereinbar mit § 309 Nr. 7 BGB sofern individuell ausgehandelt; bei AGB-Verwendung Vorsicht.",
          whenProblem: "Bei Folge-/Reputationsschäden, die der Begrenzung unterliegen, leidet die geschädigte Partei.",
          whenNegotiate: "Selten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "exclusion_with_mutual_indemnity",
          label: "GbR-Ausschluss + gegenseitige Freistellung",
          description: "Plus: Jede Partei stellt die andere im Außenverhältnis von Ansprüchen Dritter frei, die aus eigenem Verschulden entstehen.",
          risk: "medium",
          riskNote: "Stärkster Innen-Schutz; im Außenverhältnis bleiben aber Mit-Haftung-Risiken bei tatsächlichem GbR-Anschein.",
          whenProblem: "Wenn Dritte trotz interner Aufteilung beide Parteien gesamtschuldnerisch in Anspruch nehmen können (typisch bei Außen-GbR).",
          whenNegotiate: "Wenn die Freistellung asymmetrisch ist (eine Partei stellt mehr frei als die andere).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "hard_exclusion_strict_liability", ausgewogen: "hard_exclusion_capped_liability", durchsetzungsstark: "hard_exclusion_capped_liability" }
    },

    // ── 9. Datenschutz / DSGVO ──
    {
      key: "data_protection",
      title: "Datenschutz und gemeinsame Verantwortung",
      paragraph: "§ 10",
      description: "Werden personenbezogene Daten gemeinsam verarbeitet (z.B. Kunden-Newsletter, Anwender-Studien)? Dann zwingend Art. 26 DSGVO Joint-Controller-Vereinbarung. Sonst Auftragsverarbeitung (Art. 28) oder gar keine Datenverarbeitung.",
      importance: "high",
      options: [
        {
          value: "no_personal_data",
          label: "Keine Verarbeitung personenbezogener Daten",
          description: "Im Rahmen der Kooperation werden keine personenbezogenen Daten erhoben oder verarbeitet.",
          risk: "low",
          riskNote: "Einfachster Fall. Klausel sollte trotzdem aufgenommen werden, um Klarheit zu schaffen.",
          whenProblem: "Wenn doch Daten anfallen (z.B. Kontaktdaten der Mitarbeiter, Marketing-Listen) — dann fehlt die Rechtsgrundlage.",
          whenNegotiate: "Selten.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "avv_referenced",
          label: "Auftragsverarbeitung (separater AVV)",
          description: "Eine Partei verarbeitet die Daten weisungsgebunden für die andere. Separater AVV-Vertrag wird abgeschlossen.",
          risk: "low",
          riskNote: "Klare Rechtslage, aber nur passend wenn tatsächlich Weisungsverhältnis besteht. Bei echten Kooperationen oft nicht zutreffend (dann ist Joint Controllership korrekter).",
          whenProblem: "Wenn die Behörde feststellt, dass de facto Joint Controllership vorliegt — dann fehlt Art. 26 Vereinbarung = DSGVO-Verstoß.",
          whenNegotiate: "Selten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "joint_controller",
          label: "Gemeinsam Verantwortliche (Art. 26 DSGVO)",
          description: "Beide Parteien legen gemeinsam Zwecke und Mittel der Datenverarbeitung fest. Verantwortlichkeitsvereinbarung gemäß Art. 26 als Anlage zum Kooperationsvertrag.",
          risk: "medium",
          riskNote: "Korrekt für echte Kooperationen mit gemeinsamer Datenverarbeitung. Aufwändiger in der Umsetzung — TOM-Definition, Informationspflicht, Anlaufstelle für Betroffene.",
          whenProblem: "Wenn die internen Zuständigkeiten nicht klar sind — beide Parteien haften gegenüber Betroffenen gesamtschuldnerisch (Art. 26 Abs. 3).",
          whenNegotiate: "Wenn du die schwächere Partei bist — bestehe auf klarem Innenausgleich, falls Bußgelder oder Schadenersatz fällig werden.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "no_personal_data", ausgewogen: "avv_referenced", durchsetzungsstark: "joint_controller" }
    },

    // ── 10. Laufzeit und Beendigung ──
    {
      key: "term_termination",
      title: "Laufzeit und Beendigung",
      paragraph: "§ 11",
      description: "Wie lange läuft die Kooperation? Kann sie ordentlich gekündigt werden? Was passiert mit laufenden Projekten / IP / Geheimhaltungspflichten bei Beendigung?",
      importance: "high",
      options: [
        {
          value: "fixed_term_short",
          label: "Befristet, kurze Laufzeit (12 Monate)",
          description: "Vertrag endet automatisch nach 12 Monaten ohne Verlängerung. Verlängerung nur durch ausdrückliche neue Vereinbarung.",
          risk: "low",
          riskNote: "Maximale Flexibilität. Schutz vor langfristiger Bindung an unpassende Partner.",
          whenProblem: "Wenn das Projekt länger braucht — dann harter Cut zwingt zu Nachverhandlung.",
          whenNegotiate: "Wenn der investierte Aufwand für 12 Monate nicht amortisierbar ist.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "fixed_with_renewal",
          label: "Befristet 24 Monate mit automatischer Verlängerung",
          description: "Verlängerung um je 12 Monate, ordentliche Kündigung mit 6 Monaten Frist. Marktüblicher mittelfristiger Rahmen mit klaren Kündigungsfenstern.",
          risk: "low",
          riskNote: "Marktstandard. Bietet Stabilität ohne dauerhafte Bindung.",
          whenProblem: "Wenn die 6-Monats-Frist verpasst wird, läuft der Vertrag automatisch weiter.",
          whenNegotiate: "Selten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "indefinite_long_notice",
          label: "Unbefristet, lange Mindestlaufzeit (36 Monate)",
          description: "Ordentliche Kündigung mit 12 Monaten Frist. Tiefe strategische Bindung mit hoher Plansicherheit für beide Seiten.",
          risk: "medium",
          riskNote: "Lange Bindung — schwer auflösbar bei Konflikten. Außerordentliche Kündigung aus wichtigem Grund (§ 314 BGB) bleibt unberührt.",
          whenProblem: "Wenn sich der Markt grundlegend ändert oder die Partnerin strategisch nicht mehr passt.",
          whenNegotiate: "Wenn dein Marktumfeld volatil ist — kürzere Mindestlaufzeit verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "fixed_term_short", ausgewogen: "fixed_with_renewal", durchsetzungsstark: "indefinite_long_notice" }
    },

    // ── 11. Streitbeilegung und Gerichtsstand ──
    {
      key: "dispute_resolution",
      title: "Streitbeilegung und Gerichtsstand",
      paragraph: "§ 12",
      description: "Welcher Mechanismus bei Konflikten? Wo wird geklagt? Welches Recht gilt?",
      importance: "medium",
      options: [
        {
          value: "mediation_then_court_party_a",
          label: "Verpflichtende Mediation vor Klage, Gerichtsstand bei Partei A",
          description: "Erst 30-tägiger Mediationsversuch, danach Gericht am Sitz von Partei A. Deutsches Recht. UN-Kaufrecht ausgeschlossen.",
          risk: "low",
          riskNote: "Mediation reduziert Eskalation; Gerichtsstand bei A vorteilhaft für A.",
          whenProblem: "Wenn Partei B sich auf Mediation einlässt obwohl eilbedürftig (z.B. drohender Schaden).",
          whenNegotiate: "Wenn du Partei B bist — neutralen Gerichtsstand vorschlagen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "court_defendant",
          label: "Gericht am Sitz des Beklagten (gesetzlicher Standard)",
          description: "Klage am Sitz der jeweils beklagten Partei. Deutsches Recht. UN-Kaufrecht ausgeschlossen.",
          risk: "low",
          riskNote: "Fairster Standard, entspricht § 12 ZPO. Akzeptabel für beide Seiten.",
          whenProblem: "Selten.",
          whenNegotiate: "Meist sofort akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "arbitration_dis",
          label: "Schiedsgericht (DIS-Schiedsordnung)",
          description: "Endgültige und bindende Entscheidung durch Schiedsgericht nach den DIS-Regeln (Deutsche Institution für Schiedsgerichtsbarkeit). Sitz Frankfurt am Main, Verfahrenssprache Deutsch.",
          risk: "medium",
          riskNote: "Vertraulichkeit gewahrt, Spezialwissen. Aber: Kosten höher, keine zweite Instanz.",
          whenProblem: "Wenn der Streitwert klein ist — Schiedsverfahren wird unverhältnismäßig teuer.",
          whenNegotiate: "Wenn dein Unternehmen klein ist — Schiedsverfahren kann existenzbedrohend werden.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "mediation_then_court_party_a", ausgewogen: "court_defendant", durchsetzungsstark: "arbitration_dis" }
    }
  ]
};

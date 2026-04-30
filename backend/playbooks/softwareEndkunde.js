// Software-Endkunde-Vertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung für SaaS, On-Premises und Hybrid-Modelle

module.exports = {
  type: "softwareEndkunde",
  title: "Software-Endkunde-Vertrag (SaaS, On-Premises, EULA)",
  description: "Vertrag zwischen Software-Anbieter und Endkunde — regelt Bereitstellung, Nutzungsrechte, SLA, Datenschutz/AVV, Verfügbarkeit, Support, Datenrückgabe, Preisanpassungen und Vertragsende.",
  icon: "cloud",
  difficulty: "komplex",
  estimatedTime: "12–18 Minuten",
  legalBasis: "BGB §§ 535ff, §§ 631ff, §§ 611ff, §§ 305–310, § 309 Nr. 9 (FairKfG), § 312k; UrhG §§ 31, 69a–69g; DSGVO Art. 28, 32, 44ff; BDSG; TTDSG; NIS2-UmsuCG; VO 2024/1689 (EU AI Act); GeschGehG; ProdHaftG",

  // Rollen-Definition
  roles: {
    A: { key: "anbieter", label: "Software-Anbieter", description: "Stellt Software (SaaS, On-Premises, Hybrid) gegen Entgelt bereit" },
    B: { key: "endkunde", label: "Endkunde", description: "Nutzt Software für eigenen Geschäftsbetrieb" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Anbieter — strikte Lizenzbeschränkungen, lange Mindestlaufzeit, niedrige SLA-Garantien",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — klare Nutzungsrechte, SLA 99,5 % mit Service Credits, AVV mit Subprozessor-Liste",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Endkunde — großzügige Nutzungsrechte, hohe SLA, Datenexport gratis, Source Code Escrow",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    { key: "partyA_name", label: "Firmenname (Anbieter)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_legalForm", label: "Rechtsform Anbieter", type: "select", required: true, group: "partyA",
      options: [
        { value: "gmbh", label: "GmbH" },
        { value: "ag", label: "AG" },
        { value: "ug", label: "UG (haftungsbeschränkt)" },
        { value: "auslaendisch_eu", label: "EU-Ausland" },
        { value: "auslaendisch_drittstaat", label: "Drittstaat (USA, UK etc.) — DSGVO-DRITTLANDTRANSFER!" }
      ]
    },
    { key: "partyA_dpo", label: "Datenschutzbeauftragter (Name + Kontakt)", type: "text", required: false, group: "partyA" },

    { key: "partyB_name", label: "Firma / Name (Endkunde)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_role", label: "Rechtliche Stellung Endkunde", type: "select", required: true, group: "partyB",
      options: [
        { value: "verbraucher", label: "Verbraucher (§ 13 BGB) — § 309 Nr. 9 BGB greift!" },
        { value: "unternehmer_kmu", label: "Unternehmer KMU (§ 14 BGB)" },
        { value: "unternehmer_konzern", label: "Unternehmer Konzern (verbundene Unternehmen)" },
        { value: "oeffentlich", label: "Öffentlicher Auftraggeber (EVB-IT Cloud)" },
        { value: "kritis", label: "KRITIS / Wichtige Einrichtung NIS2" }
      ]
    },
    { key: "partyB_industry", label: "Branche Endkunde", type: "select", required: true, group: "partyB",
      options: [
        { value: "general", label: "Allgemein" },
        { value: "finance", label: "Finanzdienstleistungen (DORA)" },
        { value: "health", label: "Gesundheit (MPDG)" },
        { value: "education", label: "Bildung (AI Act Hochrisiko)" },
        { value: "hr", label: "HR/Personal (AI Act Hochrisiko bei automatisierten Entscheidungen)" },
        { value: "kritis", label: "KRITIS (Energie, Wasser, etc.)" }
      ]
    },

    { key: "deploymentModel", label: "Bereitstellungsmodell", type: "select", required: true, group: "context",
      options: [
        { value: "saas_multi", label: "SaaS Multi-Tenant (Public Cloud)" },
        { value: "saas_single", label: "SaaS Single-Tenant (Dedicated Instance)" },
        { value: "on_premises", label: "On-Premises (lokal beim Kunden)" },
        { value: "hybrid", label: "Hybrid (Cloud + lokale Komponenten)" }
      ]
    },
    { key: "userCount", label: "Anzahl Nutzer / Lizenzen", type: "number", required: true, group: "context" },
    { key: "licenseModel", label: "Lizenzmodell", type: "select", required: true, group: "context",
      options: [
        { value: "named", label: "Named User (personenbezogen)" },
        { value: "concurrent", label: "Concurrent User (gleichzeitig aktive)" },
        { value: "unlimited", label: "Unlimited Users (Enterprise-Flat)" },
        { value: "consumption", label: "Consumption-Based (API-Calls, Datenvolumen)" }
      ]
    },
    { key: "monthlyFee", label: "Monatliche Vergütung (Netto, EUR)", type: "number", required: true, group: "context" },
    { key: "containsPersonalData", label: "Werden personenbezogene Daten verarbeitet?", type: "select", required: true, group: "context",
      options: [
        { value: "ja_extensive", label: "Ja, umfangreich (Mitarbeiter-/Kunden-/Patientendaten) — AVV PFLICHT" },
        { value: "ja_begrenzt", label: "Ja, begrenzt (z.B. nur Login-Daten/Admin-Konten) — AVV PFLICHT" },
        { value: "nein", label: "Nein — keine AVV erforderlich" }
      ]
    },
    { key: "containsAI", label: "Enthält die Software AI-Komponenten?", type: "select", required: true, group: "context",
      options: [
        { value: "nein", label: "Nein, keine AI-Funktionen" },
        { value: "minimal", label: "Ja, minimales Risiko (z.B. Spam-Filter, Empfehlungen)" },
        { value: "limited", label: "Ja, begrenztes Risiko (Chatbot, Bildgenerierung) — Transparenzpflicht" },
        { value: "high_risk", label: "Ja, Hochrisiko (HR/Bonität/Bildung) — Konformitätsbewertung Pflicht ab 02.08.2026!" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — Das Herzstück des Playbooks
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Leistungsbeschreibung ──
    {
      key: "service_scope",
      title: "Leistungsbeschreibung und Funktionsumfang",
      paragraph: "§ 2",
      description: "Definiert, was die Software leistet (Module, Funktionen, Schnittstellen, Performance-Eckdaten). Dient als Beschaffenheitsvereinbarung für die Mängelhaftung.",
      importance: "critical",
      options: [
        {
          value: "pauschal_produktbezeichnung",
          label: "Nur Produktbezeichnung",
          description: "Verweis auf Produktnamen (Lizenz für ProduktX) ohne Funktionsbeschreibung.",
          risk: "high",
          riskNote: "Streitanfällig — Funktionsumfang ergibt sich aus Werbung/Marketing (objektive Anforderung § 434 Abs. 3 BGB analog).",
          whenProblem: "Wenn EK angekündigtes Feature vermisst — Streit über Beschaffenheit.",
          whenNegotiate: "Beide: konkrete Modulliste verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "module_liste",
          label: "Modul-/Feature-Liste in Anlage",
          description: "Konkrete Auflistung enthaltener Module + verlinkte Doku.",
          risk: "low",
          riskNote: "Klar und unstreitig. Standard.",
          whenProblem: "Wenn Anbieter Feature entfernt — Mangel/Mietminderung.",
          whenNegotiate: "Anbieter: Recht zur Funktionsänderung mit Vorankündigung definieren.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "kpis_performance",
          label: "Modul-Liste + Performance-KPIs",
          description: "Quantitative Beschaffenheitszusagen (z.B. Antwortzeiten, Datenvolumen).",
          risk: "low",
          riskNote: "Sehr EK-freundlich; Anbieter mit klarem Rahmen.",
          whenProblem: "Wenn KPIs verfehlt — Mangel.",
          whenNegotiate: "Anbieter: realistische Werte mit Toleranz; Messmethodik definieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "dynamisch_anbieter",
          label: "Dynamisch nach jeweils aktueller Produktversion",
          description: "Funktionsumfang ergibt sich aus jeweils aktueller Version. Anbieter kann Features entfernen/ändern.",
          risk: "high",
          riskNote: "Bei B2C oft als überraschend bewertet (§ 305c BGB) oder unangemessen benachteiligend (§ 307 BGB). Im B2B möglich, aber EK-feindlich.",
          whenProblem: "Wenn kritisches Feature entfernt — keine Handhabe.",
          whenNegotiate: "EK: Migrationsanspruch bei wesentlichen Änderungen verlangen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "dynamisch_anbieter", ausgewogen: "module_liste", durchsetzungsstark: "kpis_performance" }
    },

    // ── 2. Nutzungsrechte ──
    {
      key: "usage_rights",
      title: "Nutzungsrechte und Lizenzumfang",
      paragraph: "§ 3",
      description: "UrhG § 31 / § 69d — Einräumung der Nutzungsrechte muss konkret bezeichnet werden. Bei SaaS-Mietmodell technisch häufig Zugangsrecht statt klassischer Lizenz.",
      importance: "critical",
      options: [
        {
          value: "named_user_strict",
          label: "Named User, nicht übertragbar",
          description: "Pro registrierter User; Lizenz ist Person zugeordnet, nicht übertragbar, keine Sublizenz.",
          risk: "medium",
          riskNote: "Anbieter-freundlich. EuGH UsedSoft kann bei Kauf-Lizenz Erschöpfung greifen — bei SaaS-Miete weniger relevant.",
          whenProblem: "EK: bei Mitarbeiterwechsel ggf. Re-Lizenzierung.",
          whenNegotiate: "EK: Re-Assignment-Recht im Vertrag (z.B. nach 30 Tagen).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "concurrent_user",
          label: "Concurrent User (gleichzeitig aktive)",
          description: "Lizenz pro gleichzeitig nutzendem User.",
          risk: "low",
          riskNote: "Marktstandard. Flexibler für EK.",
          whenProblem: "Bei Spitzenlast — Limit erreicht, User gesperrt.",
          whenNegotiate: "EK: Burst-Capacity verhandeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "enterprise_unlimited",
          label: "Enterprise-Flat (Unbegrenzte Nutzer einer juristischen Person)",
          description: "Alle Mitarbeiter und verbundene Unternehmen dürfen nutzen.",
          risk: "low",
          riskNote: "EK-freundlich; einfaches Skalierungsmodell.",
          whenProblem: "Anbieter: Risiko unkontrollierter Nutzung.",
          whenNegotiate: "Anbieter: Definition verbundene Unternehmen eingrenzen (§ 15 AktG).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "consumption_based",
          label: "Verbrauchsbasiert (API-Calls, Datenvolumen, Compute)",
          description: "Nutzungsabhängige Bezahlung; keine Stückzahlbeschränkung.",
          risk: "medium",
          riskNote: "Modern, fair, aber Kostenrisiko bei Lastspitzen.",
          whenProblem: "Wenn Verbrauchsexplosion (z.B. Bot) — hohe Rechnung.",
          whenNegotiate: "EK: Kosten-Cap mit Alert verhandeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "named_user_strict", ausgewogen: "concurrent_user", durchsetzungsstark: "enterprise_unlimited" }
    },

    // ── 3. SLA / Verfügbarkeit ──
    {
      key: "sla_availability",
      title: "Verfügbarkeit (SLA) und Wartungsfenster",
      paragraph: "§ 4",
      description: "§ 535 BGB — Anbieter schuldet Bereitstellung. SLA = Beschaffenheitsvereinbarung. Unterschreitung → Mietminderung (§ 536 BGB) und ggf. Schadensersatz.",
      importance: "critical",
      options: [
        {
          value: "keine_sla_zusage",
          label: "Keine SLA-Zusage (Best Effort)",
          description: "Anbieter macht keine garantierte Verfügbarkeit.",
          risk: "high",
          riskNote: "Best Effort in AGB zwischen Unternehmern oft als überraschend angesehen (§ 305c BGB) bei kritischen Diensten. Bei B2C unwirksam.",
          whenProblem: "EK: keine Handhabe bei Ausfällen.",
          whenNegotiate: "EK: Mindest-SLA fordern.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "sla_99_5",
          label: "99,5 % monatlich, ohne Service Credits",
          description: "Marktstandard für günstige SaaS. ~3,6 Std/Mon Downtime. Wartungsfenster (geplant) angekündigt davon ausgenommen.",
          risk: "medium",
          riskNote: "Standard-Klausel.",
          whenProblem: "Bei längeren Ausfällen — § 536 BGB greift kraft Gesetz.",
          whenNegotiate: "EK: Service Credits verhandeln.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "sla_99_9_credits",
          label: "99,9 % mit Service Credits + Sonderkündigungsrecht",
          description: "~43 Min/Mon Downtime. Bei Verfehlung Service Credits (z.B. 10 % Monatsgebühr) und nach 3 Verstößen Sonderkündigungsrecht.",
          risk: "low",
          riskNote: "EK-freundlich; klare Konsequenzen.",
          whenProblem: "Anbieter: hohes Operational-Commitment, ggf. Multi-AZ-Setup nötig.",
          whenNegotiate: "Anbieter: Wartungsfenster ausnehmen, geplante Downtime ankündigen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "sla_99_99_industrial",
          label: "99,99 % Enterprise-SLA mit Pönalen",
          description: "~4,3 Min/Mon Downtime. Hohe Strafen bei Verfehlung.",
          risk: "medium",
          riskNote: "Sehr EK-freundlich, aber teuer. Nur bei kritischer Infrastruktur sinnvoll.",
          whenProblem: "Anbieter: Risiko erheblicher Pönalen.",
          whenNegotiate: "EK: Bereitstellung in Aufpreis-Modell.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "keine_sla_zusage", ausgewogen: "sla_99_5", durchsetzungsstark: "sla_99_9_credits" }
    },

    // ── 4. AVV / Datenschutz ──
    {
      key: "dpa_avv",
      title: "Auftragsverarbeitung und Datenschutz",
      paragraph: "§ 5",
      description: "DSGVO Art. 28 — AVV zwingend bei Auftragsverarbeitung. Pflichtinhalte: Gegenstand, Zweck, Datenarten, Betroffene, Pflichten, TOM, Subprozessoren, Audit, Löschung.",
      importance: "critical",
      options: [
        {
          value: "keine_personendaten",
          label: "Keine personenbezogenen Daten verarbeitet",
          description: "Nur anonymisierte/pseudonymisierte Daten — keine AVV erforderlich.",
          risk: "low",
          riskNote: "Selten in der Praxis. Selbst Login-Daten = Personendaten.",
          whenProblem: "Wenn doch Personendaten verarbeitet werden — fehlende AVV = DSGVO-Verstoß.",
          whenNegotiate: "Realistisch prüfen — meist AVV fällig.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "avv_inline",
          label: "AVV inline im Hauptvertrag",
          description: "AVV-Klauseln direkt im Vertrag, keine separate Anlage.",
          risk: "medium",
          riskNote: "Praktisch bei kleinen SaaS. Bei komplexen Datenverarbeitungen oft unübersichtlich.",
          whenProblem: "Wenn Datenverarbeitung sich ändert — Vertragsanpassung nötig.",
          whenNegotiate: "Inline nur bei einfachen Fällen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "avv_separat_standard",
          label: "Separate AVV nach DSGVO Art. 28",
          description: "Eigener AVV-Anhang mit allen Pflichtinhalten + TOM-Liste + aktuelle Subprozessoren-Liste online.",
          risk: "low",
          riskNote: "Marktstandard. Modular, gerichtsfest.",
          whenProblem: "Wenn Subprozessoren-Änderung ohne Mitteilung — Verstoß § 28 DSGVO.",
          whenNegotiate: "EK: Widerspruchsrecht gegen neue Subprozessoren mit 30 Tage Frist.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "avv_streng_zustimmung",
          label: "AVV mit Subprozessor-Zustimmungsrecht und Audit-Recht",
          description: "EK muss neuen Subprozessoren ausdrücklich zustimmen; Audit-Recht 1× jährlich vor Ort.",
          risk: "low",
          riskNote: "EK-freundlich. LG Köln 23.03.2023: pauschale Subprozessor-Beauftragung unwirksam.",
          whenProblem: "Anbieter: Skalierungshindernis bei vielen Kunden.",
          whenNegotiate: "Anbieter: Liste vorgenehmigter Standardsubprozessoren akzeptieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "avv_inline", ausgewogen: "avv_separat_standard", durchsetzungsstark: "avv_streng_zustimmung" }
    },

    // ── 5. Drittlandtransfer ──
    {
      key: "data_transfer",
      title: "Drittlandtransfer (DSGVO Art. 44ff)",
      paragraph: "§ 6",
      description: "Art. 44ff DSGVO — Transfer in Drittstaaten nur mit Adäquanzbeschluss (z.B. TADPF USA seit 10.07.2023), SCC + TIA, oder BCR. Schrems III bei EuGH anhängig.",
      importance: "critical",
      options: [
        {
          value: "eu_only",
          label: "Verarbeitung ausschließlich in EU/EWR",
          description: "Anbieter zusichert: alle Daten und Subprozessoren in EU/EWR.",
          risk: "low",
          riskNote: "Optimal. DSGVO-Konformität ohne Drittlandtransfer-Risiko.",
          whenProblem: "Wenn doch US-Cloud im Hintergrund (z.B. Cloudflare-DDoS) — Verstoß.",
          whenNegotiate: "Vertraglich auch CDN/DDoS-Provider mit einschließen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "tadpf_certified",
          label: "Drittlandtransfer USA mit TADPF-Zertifizierung",
          description: "Anbieter/Subprozessor in DOC-Liste TADPF gelistet (Stand: zum Zeitpunkt der Verarbeitung).",
          risk: "medium",
          riskNote: "Bei Kippen TADPF (Schrems III) muss schnell auf SCC umgestellt werden.",
          whenProblem: "Wenn TADPF kippt während Vertragslaufzeit — Übergangsregelung erforderlich.",
          whenNegotiate: "EK: Backup-Plan SCC + TIA vertraglich verankern.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "scc_with_tia",
          label: "Standardvertragsklauseln (SCC, Modul 2) + Transfer Impact Assessment",
          description: "SCC der EU-Kommission (2021/914) + dokumentiertes TIA für jedes Drittland.",
          risk: "medium",
          riskNote: "Aufwändig, aber rechtlich solide. EuGH C-329/19: Risiko-Analyse Pflicht.",
          whenProblem: "Wenn TIA unvollständig — keine ausreichende Garantie.",
          whenNegotiate: "Beide: TIA-Vorlage mit Begründung der Schutzmaßnahmen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "keine_drittstaaten",
          label: "Vertraglicher Ausschluss aller Drittstaatentransfers",
          description: "Keine Verarbeitung außerhalb EU/EWR. Strengste Variante.",
          risk: "medium",
          riskNote: "Maximale Sicherheit; aber praktisch oft unmöglich (US-Auth, US-CDN, US-Tooling).",
          whenProblem: "Wenn Anbieter doch US-Tools einsetzt — Vertragsbruch.",
          whenNegotiate: "EK: Spezifische Allowlist mit zugelassenen Tools.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "tadpf_certified", ausgewogen: "tadpf_certified", durchsetzungsstark: "eu_only" }
    },

    // ── 6. Sicherheits-/Compliance-Standards ──
    {
      key: "security_compliance",
      title: "Sicherheits- und Compliance-Standards",
      paragraph: "§ 7",
      description: "DSGVO Art. 32 — Stand der Technik. NIS2 — C-SCRM. Bei Hochrisiko-AI EU AI Act-Konformität.",
      importance: "high",
      options: [
        {
          value: "eigen_definitions",
          label: "Eigene Sicherheitsmaßnahmen ohne Zertifizierung",
          description: "Anbieter beschreibt TOM individuell, ohne Drittzertifizierung.",
          risk: "high",
          riskNote: "Schwer zu prüfen; bei Audit nur Selbstauskunft.",
          whenProblem: "EK: Bei Datenpanne — fehlende Zertifizierung erhöht Haftung EK.",
          whenNegotiate: "EK: Mindeststandard ISO 27001 verlangen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "iso_27001",
          label: "ISO/IEC 27001 zertifiziert",
          description: "International anerkannter Standard für ISMS. Audit-Bericht jährlich.",
          risk: "low",
          riskNote: "Marktstandard. Konformitätsnachweis nach DSGVO Art. 32.",
          whenProblem: "Wenn Zertifizierung ausläuft — Vertragsverletzung.",
          whenNegotiate: "EK: Prüfung Re-Zertifizierung jährlich.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "soc2_iso_bsi",
          label: "ISO 27001 + SOC 2 Type II + BSI C5",
          description: "Multi-Standard-Compliance; SOC 2 für US-orientierte EK; BSI C5 für deutsche Behörden/KRITIS.",
          risk: "low",
          riskNote: "Höchste Stufe. Anbieter: hoher Aufwand.",
          whenProblem: "Anbieter: hohe laufende Audit-Kosten.",
          whenNegotiate: "EK: TADPF-Zertifizierung zusätzlich verlangen wenn US.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "branchen_spezifisch",
          label: "Branchenspezifische Compliance (HIPAA, PCI-DSS, KRITIS-Audits)",
          description: "Je nach Branche zusätzliche Standards.",
          risk: "medium",
          riskNote: "Komplex; oft teuer. Für regulierte Branchen Pflicht.",
          whenProblem: "Wenn Branchenstandard nicht erfüllt — Strafen Aufsichtsbehörde.",
          whenNegotiate: "Beide: gemeinsame Audit-Roadmap.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "eigen_definitions", ausgewogen: "iso_27001", durchsetzungsstark: "soc2_iso_bsi" }
    },

    // ── 7. Vertragsdauer & Kündigung ──
    {
      key: "term_termination",
      title: "Vertragsdauer, Verlängerung und Kündigung",
      paragraph: "§ 8",
      description: "§ 309 Nr. 9 BGB i.d.F. FairKfG (seit 01.03.2022): Bei B2C max. 2 Jahre Erstlaufzeit, automatische Verlängerung nur unbefristet mit max. 1 Monat Kündigungsfrist.",
      importance: "critical",
      options: [
        {
          value: "36_monate_b2b",
          label: "36 Monate Erstlaufzeit (B2B), Verlängerung um 12 Monate, 3 Mon Kündigung",
          description: "Lange Bindung; B2B grundsätzlich zulässig (§ 307 BGB Inhaltskontrolle).",
          risk: "medium",
          riskNote: "Bei B2C (§ 309 Nr. 9) unwirksam. Bei B2B AGB-Recht: 36 Mon zulässig, aber 12 Mon Auto-Renewal kritisch.",
          whenProblem: "EK: lange Bindung, schwierige Exit.",
          whenNegotiate: "EK: Sonderkündigungsrecht bei Insolvenz/Übernahme.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "24_monate_1_mon",
          label: "24 Monate Erstlaufzeit, Verlängerung unbefristet, monatlich kündbar",
          description: "FairKfG-konform für B2C; für B2B fairer Standard.",
          risk: "low",
          riskNote: "Erfüllt § 309 Nr. 9 BGB (B2C).",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Standardlösung — meist akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "12_monate_1_mon",
          label: "12 Monate Erstlaufzeit, dann monatlich kündbar",
          description: "Kürzere Bindung, hohe Flexibilität EK.",
          risk: "low",
          riskNote: "EK-freundlich.",
          whenProblem: "Anbieter: höheres Churn-Risiko.",
          whenNegotiate: "Anbieter: Wechselgebühr bei vorzeitiger Kündigung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "monthly_no_minimum",
          label: "Monatlich, jederzeit kündbar",
          description: "Maximale Flexibilität EK.",
          risk: "low",
          riskNote: "EK-extrem freundlich.",
          whenProblem: "Anbieter: keine Planungssicherheit.",
          whenNegotiate: "Anbieter: Pay-as-you-go-Aufschlag.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "36_monate_b2b", ausgewogen: "24_monate_1_mon", durchsetzungsstark: "12_monate_1_mon" }
    },

    // ── 8. Preisanpassung ──
    {
      key: "price_adjustment",
      title: "Preisanpassung",
      paragraph: "§ 9",
      description: "BGH XI ZR 183/23 (09.04.2024) — Preisanpassungsklauseln müssen klar berechenbar sein. Standardvariante: VPI-Indexierung mit Cap.",
      importance: "high",
      options: [
        {
          value: "keine_anpassung",
          label: "Festpreis ohne Anpassung",
          description: "Preis bleibt für gesamte Vertragslaufzeit konstant.",
          risk: "low",
          riskNote: "EK-freundlich. Anbieter: Inflationsrisiko bei langlaufenden Verträgen.",
          whenProblem: "Bei mehrjähriger hoher Inflation — Anbieter wirtschaftlich belastet.",
          whenNegotiate: "Anbieter: max. Vertragslaufzeit reduzieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "vpi_mit_cap",
          label: "VPI-Anpassung mit Cap (max. 5 %/Jahr) + Sonderkündigungsrecht",
          description: "Anpassung an Verbraucherpreisindex Statistisches Bundesamt; Erhöhung max. 5 %/Jahr; Sonderkündigung bei Erhöhung > 3 %.",
          risk: "low",
          riskNote: "BGH-konform; transparent; fair.",
          whenProblem: "Wenn VPI-Schwankung außer Cap-Bereich — Anpassung verzögert.",
          whenNegotiate: "Cap angemessen wählen (3–7 %).",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "einseitig_anbieter",
          label: "Einseitige Anpassung durch Anbieter, 60 Tage Vorankündigung",
          description: "Anbieter darf nach Mitteilung Preis ändern; EK kann kündigen.",
          risk: "medium",
          riskNote: "Bei B2C oft als unangemessen benachteiligend (§ 307 BGB) angesehen — kein klarer Anpassungsmaßstab. BGH XI ZR 183/23: ohne Berechnungsformel unwirksam.",
          whenProblem: "Klausel kippt; gesetzliche Regelung greift (keine Anpassung möglich).",
          whenNegotiate: "Anbieter: stets mit klarem Index + Cap.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "cost_pass_through",
          label: "Kostendurchreichung (Cloud-Provider-Erhöhungen 1:1)",
          description: "Wenn AWS/Azure-Kosten steigen, weitergegeben mit 30 Tage Vorankündigung.",
          risk: "medium",
          riskNote: "Modern, aber transparent dokumentationspflichtig. EK: Schwer überprüfbar.",
          whenProblem: "Wenn Cost-Pass-Through-Berechnung nicht prüfbar — § 307 BGB.",
          whenNegotiate: "EK: Audit-Recht der Cost-Berechnung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "einseitig_anbieter", ausgewogen: "vpi_mit_cap", durchsetzungsstark: "keine_anpassung" }
    },

    // ── 9. Datenrückgabe ──
    {
      key: "data_return",
      title: "Datenrückgabe und Datenmigration bei Vertragsende",
      paragraph: "§ 10",
      description: "DSGVO Art. 20 (Datenportabilität) für Personendaten. Vertragliche Regelung für Geschäftsdaten erforderlich. Schutz vor Vendor-Lock-in.",
      importance: "high",
      options: [
        {
          value: "keine_garantierte_rueckgabe",
          label: "Keine garantierte Rückgabe",
          description: "Anbieter sichert nur DSGVO-Mindeststandard für Personendaten zu; Geschäftsdaten ggf. verloren.",
          risk: "high",
          riskNote: "Vendor-Lock-in. Bei Insolvenz Anbieter — Datenverlust.",
          whenProblem: "Bei Vertragsende — keine vollständigen Daten zurück.",
          whenNegotiate: "EK: vollständige Rückgabe + Format einfordern.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "csv_json_30_tage",
          label: "Datenexport in CSV/JSON, innerhalb 30 Tagen nach Kündigung",
          description: "Strukturierte Daten in offenem Format.",
          risk: "low",
          riskNote: "Marktstandard.",
          whenProblem: "Wenn Datenstruktur komplex (Beziehungen) — CSV verliert Information.",
          whenNegotiate: "EK: Schemadokumentation zusätzlich verlangen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "vollstaendig_format_wahl_60",
          label: "Vollständige Daten + Schema in Format der EK-Wahl, 60 Tage",
          description: "EK wählt Format (CSV/JSON/SQL/Parquet); Schema-Dokumentation; 60 Tage Übergangsphase mit Lese-Zugriff.",
          risk: "low",
          riskNote: "EK-freundlich. Anbieter: Aufwand für Format-Konvertierung.",
          whenProblem: "Anbieter: ggf. Aufwand-Abrechnung.",
          whenNegotiate: "EK: Migrationssupport durch Anbieter (Stundenkontingent).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "migration_assist",
          label: "Datenexport + aktive Migrationsunterstützung (10 PT)",
          description: "Anbieter unterstützt Migration zum Nachfolger-System mit definiertem Stundenkontingent.",
          risk: "low",
          riskNote: "Maximaler Schutz vor Lock-in. Premium-Variante.",
          whenProblem: "Anbieter: hoher Aufwand.",
          whenNegotiate: "Anbieter: gegen Aufschlag im Initialvertrag.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "keine_garantierte_rueckgabe", ausgewogen: "csv_json_30_tage", durchsetzungsstark: "vollstaendig_format_wahl_60" }
    },

    // ── 10. Haftung ──
    {
      key: "liability",
      title: "Haftung",
      paragraph: "§ 11",
      description: "§ 309 Nr. 7 BGB — kein Haftungsausschluss für Vorsatz/grobe Fahrlässigkeit/Personenschäden in AGB. ProdHaftG bleibt unberührt.",
      importance: "high",
      options: [
        {
          value: "gesetzlich",
          label: "Gesetzliche Haftung BGB",
          description: "Volle Haftung nach BGB — auch leichte Fahrlässigkeit.",
          risk: "medium",
          riskNote: "EK-freundlich; Anbieter unbegrenzt haftbar bei Datenverlust/Geschäftsausfall.",
          whenProblem: "Bei großem Folgeschaden — Anbieter ruinös.",
          whenNegotiate: "Anbieter: Berufshaftpflicht zwingend.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "cap_jahresgebuehr",
          label: "Cap auf Jahresgebühr",
          description: "Haftungsobergrenze = bezahlte Jahresgebühr; bei Vorsatz/grober Fahrlässigkeit/Personenschäden unbegrenzt.",
          risk: "low",
          riskNote: "AGB-konform B2B. Marktstandard.",
          whenProblem: "Bei großem Schaden des EK weit über Jahresgebühr — EK trägt Differenz.",
          whenNegotiate: "EK: Cap auf 24 Monate erhöhen oder Cyber-Versicherung Anbieter.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "cap_typischer_schaden",
          label: "Cap auf typischen vorhersehbaren Schaden",
          description: "Haftung für leichte Fahrlässigkeit auf typischen, vorhersehbaren Schaden.",
          risk: "low",
          riskNote: "AGB-konform. § 309 Nr. 7 beachtet.",
          whenProblem: "Wenn Schadenshöhe untypisch — Streit über typisch.",
          whenNegotiate: "Beide: Beispiele für typischen Schaden im Vertrag dokumentieren.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_cyber_insurance",
          label: "Volle Haftung + zwingende Cyber-Versicherung Anbieter",
          description: "Anbieter muss Cyber-Versicherung mit min. 5 Mio EUR Deckung nachweisen.",
          risk: "low",
          riskNote: "Risk-Transfer auf Versicherung. EK-freundlich.",
          whenProblem: "Anbieter: Versicherungsprämie steigt mit Risiko-Profil.",
          whenNegotiate: "EK: Versicherungs-Police-Nachweis verlangen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "cap_typischer_schaden", ausgewogen: "cap_jahresgebuehr", durchsetzungsstark: "mit_cyber_insurance" }
    },

    // ── 11. Source Code Escrow ──
    {
      key: "source_escrow",
      title: "Source Code Escrow (Hinterlegung)",
      paragraph: "§ 12",
      description: "Schutz EK vor Insolvenz Anbieter — Quellcode-Hinterlegung bei neutralem Treuhänder mit Freigabebedingungen.",
      importance: "medium",
      options: [
        {
          value: "keine_escrow",
          label: "Keine Hinterlegung",
          description: "Bei Anbieter-Insolvenz kein Zugriff auf Quellcode.",
          risk: "high",
          riskNote: "Bei On-Premises mit Wartungsvertrag — Software wird nicht mehr gewartet. Bei SaaS technisch sinnvoller Standard, da Escrow ohne Infrastruktur nutzlos.",
          whenProblem: "Anbieter-Insolvenz; Software wird nutzlos.",
          whenNegotiate: "EK: Escrow für kritische Software fordern.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "dual_party_escrow",
          label: "Zwei-Parteien-Escrow bei DEAL/EscrowEurope",
          description: "Quellcode + Build-Doku bei Treuhänder; Freigabe bei Insolvenz/Vertragsverletzung.",
          risk: "low",
          riskNote: "Marktstandard für kritische On-Premises-Software.",
          whenProblem: "Wenn Build-Doku unvollständig — Code unbrauchbar.",
          whenNegotiate: "Beide: jährliche Verifikationsprüfung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "jaehrliche_verifikation",
          label: "Escrow + jährliche Verifikation",
          description: "Treuhänder prüft jährlich, ob hinterlegter Code lauffähig ist.",
          risk: "low",
          riskNote: "Höchste Sicherheit.",
          whenProblem: "Anbieter: Aufwand und Kosten.",
          whenNegotiate: "EK: bei kritischer Software unbedingt.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "nur_saas_kein_escrow",
          label: "Bei SaaS Datenexport + offene API als Continuity",
          description: "SaaS = kontinuierliche Bereitstellung, Quellcode-Hinterlegung nutzlos ohne Infrastruktur. Stattdessen: Datenexport-Garantie + offene API.",
          risk: "low",
          riskNote: "Bei SaaS Standard.",
          whenProblem: "Bei Anbieter-Insolvenz und Plattform-Aus — keine Hilfe ohne Datenexport.",
          whenNegotiate: "Alternative: Datenexport + offene API als Continuity.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "keine_escrow", ausgewogen: "keine_escrow", durchsetzungsstark: "dual_party_escrow" }
    },

    // ── 12. AI-Compliance ──
    {
      key: "ai_compliance",
      title: "AI-Compliance (EU AI Act ab 02.08.2026)",
      paragraph: "§ 13",
      description: "VO 2024/1689 — Pflichten gestaffelt. Hochrisiko-AI ab 02.08.2026: Konformitätsbewertung, technische Doku, menschliche Aufsicht, EU-Datenbankregistrierung.",
      importance: "high",
      options: [
        {
          value: "keine_ai",
          label: "Software enthält keine AI-Funktionen",
          description: "EU AI Act nicht anwendbar.",
          risk: "low",
          riskNote: "Selbsterklärung des Anbieters dokumentieren.",
          whenProblem: "Wenn doch AI-Komponenten — Verstoß bei Hochrisiko.",
          whenNegotiate: "Anbieter: AI-Bestandsaufnahme schriftlich.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "minimal_ohne_pflichten",
          label: "Minimales/begrenztes Risiko, Transparenzpflicht",
          description: "Anbieter erklärt AI-Komponenten transparent (Chatbot-Hinweis, AI-Watermark bei Bildgenerierung).",
          risk: "low",
          riskNote: "EU AI Act Art. 50 Transparenzpflichten.",
          whenProblem: "Wenn Transparenz fehlt — Bußgeld bis 15 Mio EUR.",
          whenNegotiate: "Anbieter: AI-Hinweise in UI sichtbar machen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "high_risk_konformitaet",
          label: "Hochrisiko-AI mit Konformitätsbewertung + CE-Kennzeichnung",
          description: "Volle Compliance: Konformitätsbewertung, technische Doku, menschliche Aufsicht, Risikomanagement, EU-Datenbankregistrierung.",
          risk: "low",
          riskNote: "Pflicht ab 02.08.2026 für Hochrisiko-AI. Anbieter trägt Hauptlast als Anbieter iSd Art. 16 AI Act.",
          whenProblem: "Wenn nicht erfüllt — Bußgeld bis 35 Mio EUR / 7 % weltw. Umsatz.",
          whenNegotiate: "Beide: gemeinsame Compliance-Roadmap mit klarer Verantwortungsverteilung.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "ai_freistellung_haftung",
          label: "EK-Freistellung von AI-Act-Bußgeldern + Audit-Recht",
          description: "Anbieter haftet für eigene Pflichtverletzungen; EK kann Audit verlangen.",
          risk: "low",
          riskNote: "EK-freundlich; AI-Compliance-Risiko-Transfer.",
          whenProblem: "Anbieter: hohe Haftungsexposition.",
          whenNegotiate: "Anbieter: Cap auf 24-Monats-Gebühr für AI-Compliance-Schäden.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "high_risk_konformitaet", ausgewogen: "minimal_ohne_pflichten", durchsetzungsstark: "ai_freistellung_haftung" }
    },

    // ── 13. Schlussbestimmungen ──
    {
      key: "final_provisions",
      title: "Schlussbestimmungen (Gerichtsstand, Recht, Schriftform)",
      paragraph: "§ 14",
      description: "Standard-Schlussbestimmungen mit AGB-Konformitätshinweisen.",
      importance: "medium",
      options: [
        {
          value: "de_recht_beklagter",
          label: "Deutsches Recht, Gerichtsstand am Sitz Beklagter",
          description: "§ 12 ZPO; CISG-Ausschluss.",
          risk: "low",
          riskNote: "Faire Standard-Lösung.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Direkt akzeptabel als neutraler Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "anbieter_sitz",
          label: "Gerichtsstand am Sitz Anbieter",
          description: "Anbieter-freundlich; Skalierungsvereinheitlichung.",
          risk: "medium",
          riskNote: "Bei B2B § 38 ZPO zulässig; bei B2C nur unter Voraussetzungen § 38 Abs. 3 ZPO.",
          whenProblem: "EK muss anreisen.",
          whenNegotiate: "EK: Schiedsgericht (DIS, ICC) oder neutraler Ort.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "schriftform_textform",
          label: "Textform (E-Mail) für Änderungen ausreichend",
          description: "Praktisch; entspricht modernen Workflows.",
          risk: "low",
          riskNote: "§ 126b BGB; sicher gerichtsverwertbar mit Header-Beweis.",
          whenProblem: "Selten.",
          whenNegotiate: "Standard für moderne Workflows.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "schiedsklausel_dis",
          label: "DIS-Schiedsklausel",
          description: "Streitigkeiten vor DIS (Deutsche Institution für Schiedsgerichtsbarkeit).",
          risk: "medium",
          riskNote: "Schnell, vertraulich. § 1031 ZPO Schriftform.",
          whenProblem: "Bei niedrigen Streitwerten unverhältnismäßig teuer (Schiedsgebühren).",
          whenNegotiate: "Nur bei großen Verträgen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "anbieter_sitz", ausgewogen: "de_recht_beklagter", durchsetzungsstark: "de_recht_beklagter" }
    }
  ]
};

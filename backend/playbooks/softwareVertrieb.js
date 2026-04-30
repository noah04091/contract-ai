// SaaS- & Software-Reseller-Vertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi

module.exports = {
  type: "softwareVertrieb",
  title: "SaaS- & Software-Reseller-Vertrag (Channel-Vertrieb)",
  description: "Regelt den indirekten Vertrieb von Software/SaaS-Lizenzen über Distributoren oder Reseller — Hersteller (Vendor) räumt einem Vertriebspartner Vertriebsrechte ein.",
  icon: "network",
  difficulty: "komplex",
  estimatedTime: "18–25 Minuten",
  legalBasis: "BGB §§ 145 ff., §§ 433 ff., §§ 535 ff., §§ 305–310; HGB §§ 84–92c; UrhG §§ 31, 32a, 34, 35; GWB § 1; VO (EU) 2022/720 (Vertikal-GVO); VO (EU) 2023/2854 (EU Data Act); VO (EU) 2024/1689 (EU AI Act); DSGVO Art. 26, 28; NIS2-Umsetzungsgesetz",

  // Rollen-Definition
  roles: {
    A: { key: "vendor", label: "Vendor / Hersteller", description: "Inhaber der IP-Rechte an der Software/SaaS, räumt Vertriebsrechte ein" },
    B: { key: "reseller", label: "Reseller / Distributor", description: "Vertriebspartner, verkauft Lizenzen/Subscriptions im eigenen Namen oder als Vermittler" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Vendor — enge Sublizenzkontrolle, Audit-Recht, Reseller-Haftung für Endkunden-Verstöße",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — selektives Vertriebssystem, faire Margen, Deal-Registration, gegenseitiges Audit-Recht",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Reseller — exklusiver Gebietsschutz (Vertikal-GVO-Grenzen), Investitionsschutz, Co-Branding",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    { key: "partyA_name", label: "Name / Firma (Vendor / Hersteller)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Adresse Vendor", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertreten durch (Vendor)", type: "text", required: false, group: "partyA" },
    { key: "partyA_register", label: "Handelsregister-Nr. Vendor", type: "text", required: false, group: "partyA" },

    { key: "partyB_name", label: "Name / Firma (Reseller / Distributor)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Adresse Reseller", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_representative", label: "Vertreten durch (Reseller)", type: "text", required: false, group: "partyB" },
    { key: "partyB_register", label: "Handelsregister-Nr. Reseller", type: "text", required: false, group: "partyB" },

    { key: "product_name", label: "Software / SaaS-Produkt(e)", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Acme CRM Cloud, Acme Analytics Pro — vollständige Produktnamen und Editionen" },
    { key: "product_type", label: "Produktart", type: "select", required: true, group: "context",
      options: [
        { value: "saas_subscription", label: "SaaS / Cloud-Subscription" },
        { value: "perpetual_license", label: "Dauerhafte On-Premise-Lizenz" },
        { value: "term_license", label: "Befristete On-Premise-Lizenz" },
        { value: "hybrid", label: "Hybrid (Cloud + On-Premise)" }
      ]
    },
    { key: "territory", label: "Vertragsgebiet", type: "text", required: true, group: "context",
      placeholder: "z.B. Deutschland, EU, weltweit ausgenommen USA" },
    { key: "start_date", label: "Vertragsbeginn", type: "date", required: true, group: "context" },
    { key: "ai_components", label: "Enthält die Software KI-Komponenten?", type: "select", required: true, group: "context",
      options: [
        { value: "no", label: "Nein" },
        { value: "yes_general", label: "Ja, GPAI / General Purpose AI" },
        { value: "yes_high_risk", label: "Ja, Hochrisiko-KI nach Anhang III EU AI Act" },
        { value: "unknown", label: "Unklar / Prüfung läuft" }
      ]
    },
    { key: "personal_data", label: "Werden personenbezogene Daten verarbeitet?", type: "select", required: true, group: "context",
      options: [
        { value: "yes", label: "Ja — AVV nach Art. 28 DSGVO erforderlich" },
        { value: "no", label: "Nein" },
        { value: "unsure", label: "Unklar / kommt auf Endkunden-Use-Case an" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — Das Herzstück des Playbooks
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Lizenz- und Vertriebsrechte ──
    {
      key: "license_grant",
      title: "Eingeräumte Vertriebs- und Lizenzrechte",
      paragraph: "§ 2",
      description: "Definiert, welche Rechte der Reseller am Produkt erhält. Die wichtigste Klausel — sie bestimmt das gesamte Geschäftsmodell.",
      importance: "critical",
      options: [
        {
          value: "distribution_only",
          label: "Reines Vertriebsrecht (kein Sublizenzrecht)",
          description: "Reseller darf das Produkt nur vermitteln/verkaufen. Lizenz wird direkt zwischen Vendor und Endkunde geschlossen (z.B. via EULA-Akzeptanz beim Onboarding).",
          risk: "low",
          riskNote: "Minimaler IP-Risiko, klare Rollenverteilung. Reseller hat aber kaum eigenes Asset.",
          whenProblem: "Wenn Reseller eigenständige Pakete schnüren oder Markeneinheit zum Endkunden wahren will.",
          whenNegotiate: "Wenn Reseller eigene Wertschöpfung (Bundle, Konfiguration, Service) abrechnen möchte → mindestens nicht-exklusives Sublizenzrecht.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "non_exclusive_sublicense",
          label: "Nicht-exklusives Sublizenzrecht",
          description: "Reseller erhält das Recht, im eigenen Namen Sublizenzen an Endkunden zu erteilen. Vendor behält Direktvertriebsrecht.",
          risk: "low",
          riskNote: "Marktstandard. UsedSoft-konform. Reseller kann Bundles und eigene Vertragswerke gestalten.",
          whenProblem: "Bei unklarer Weitergabe der Vendor-EULA an Endkunden (Pass-Through-Risiko § 305 BGB).",
          whenNegotiate: "Beidseitig akzeptabel, sofern Margen und Gebietsregelung passen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "exclusive_sublicense_territory",
          label: "Exklusives Sublizenzrecht im Gebiet",
          description: "Reseller hat im definierten Gebiet das alleinige Sublizenzrecht. Vendor verzichtet auf Direktvertrieb dort (mit oder ohne ausgenommene Großkunden).",
          risk: "medium",
          riskNote: "Vertikal-GVO setzt Grenzen (max. 5 Reseller pro Gebiet, kein passiver Verkaufsschutz). Marktanteil <30 % Voraussetzung.",
          whenProblem: "Wenn Marktanteil überschritten wird — Einzelfreistellung Art. 101 Abs. 3 AEUV nötig. Bei Ausschluss passiver Verkäufe Kernbeschränkung → Gesamtnichtigkeit.",
          whenNegotiate: "Wenn Vendor in dem Gebiet keine eigene Vertriebsmannschaft hat. Großkunden-Ausnahme (named accounts) absichern.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "master_distributor_two_tier",
          label: "Master-Distributor mit Sub-Reseller-Recht",
          description: "Reseller darf eigene Sub-Reseller einsetzen (zweistufiger Vertrieb). Sub-Reseller dürfen Sublizenzen erteilen.",
          risk: "high",
          riskNote: "Compliance-intensiv. Pass-Through-Pflichten (DSGVO, EU Data Act, NIS2, EULA) durch zwei Stufen sicherstellen.",
          whenProblem: "Wenn Sub-Reseller AGB nicht ordnungsgemäß weitergeben oder Gebietsgrenzen verletzen — Vendor-Haftung kann durchschlagen.",
          whenNegotiate: "Klare Sub-Reseller-Pflichten, Audit-Recht des Vendors gegenüber Sub-Resellern, Haftung des Master-Distributors für seine Sub-Reseller.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "distribution_only", ausgewogen: "non_exclusive_sublicense", durchsetzungsstark: "exclusive_sublicense_territory" }
    },

    // ── 2. Gebietsschutz ──
    {
      key: "territory_exclusivity",
      title: "Gebietsschutz, Exklusivität und Vertriebskanäle",
      paragraph: "§ 3",
      description: "Welche territoriale/sektorale Schutzwirkung erhält der Reseller? Kartellrechtlich heikel (Vertikal-GVO 2022/720).",
      importance: "critical",
      options: [
        {
          value: "non_exclusive_open",
          label: "Offen, nicht-exklusiv",
          description: "Vendor darf weitere Reseller im selben Gebiet ernennen und selbst direkt verkaufen. Reseller hat keine Gebietsabsicherung.",
          risk: "low",
          riskNote: "Kartellrechtlich unbedenklich. Vendor maximal flexibel.",
          whenProblem: "Reseller kann seine Investitionen (Vertriebsaufbau, Marketing) nicht amortisieren, wenn Vendor parallel direkt verkauft.",
          whenNegotiate: "Reseller sollte mindestens Deal-Registration verlangen oder höhere Margen für direktvertriebsfreie Phasen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "selective_distribution",
          label: "Selektives Vertriebssystem",
          description: "Vendor wählt Reseller nach qualitativen Kriterien (zertifizierte Berater, Branchenfokus). Reseller dürfen nur an Endkunden oder andere autorisierte Reseller verkaufen.",
          risk: "low",
          riskNote: "Vertikal-GVO-konform, sofern Qualitätskriterien einheitlich angewandt werden. Marktstandard im Enterprise-SaaS.",
          whenProblem: "Bei rein quantitativen Kriterien (Umsatz pro Jahr) ohne Qualitätsbezug → Kartellverstoß möglich.",
          whenNegotiate: "Kriterien transparent und für Reseller erfüllbar gestalten, schriftlich fixieren.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "exclusive_territory",
          label: "Exklusiver Gebietsschutz",
          description: "Reseller ist alleiniger Vertriebspartner im Gebiet. Vendor verkauft dort nicht direkt (oder nur an named accounts). Aktiver Verkauf anderer Reseller untersagt; passiver Verkauf bleibt erlaubt.",
          risk: "medium",
          riskNote: "Vertikal-GVO erlaubt max. 5 Reseller pro Gebiet. Passiver Verkauf darf NICHT verboten werden — sonst Kernbeschränkung Art. 4 lit. b VO 2022/720.",
          whenProblem: "Wenn Vendor mehr als 5 Exklusiv-Reseller hat oder Marktanteil >30 % → Freistellung entfällt.",
          whenNegotiate: "Reseller sollte Named-Account-Liste eng halten und Marketingunterstützung absichern.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "vertical_with_dual_distribution",
          label: "Selektive Distribution mit Vendor-Direktvertrieb",
          description: "Vendor und Reseller sind im selben Gebiet aktiv. Vendor ist auf Hersteller- und Reseller-Stufe tätig. Erfordert Trennung der Vertriebsdaten.",
          risk: "medium",
          riskNote: "Seit Vertikal-GVO 2022/720 explizit geregelt — Informationsaustausch darf nicht über das für die Vertikalbeziehung Erforderliche hinausgehen.",
          whenProblem: "Wenn der Reseller seine Endkundenpreise mit dem Vendor abstimmt → Preisbindungsverdacht.",
          whenNegotiate: "Klare Datenfirewall, keine wechselseitigen Wettbewerbsdaten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "non_exclusive_open", ausgewogen: "selective_distribution", durchsetzungsstark: "exclusive_territory" }
    },

    // ── 3. Preisgestaltung & Marge ──
    {
      key: "pricing_margin",
      title: "Preisgestaltung, Marge & Mindestabnahme",
      paragraph: "§ 4",
      description: "Wer bestimmt die Endkundenpreise? Welche Marge erhält der Reseller? Gibt es Mindestabnahmen?",
      importance: "critical",
      options: [
        {
          value: "vendor_recommended_no_minimum",
          label: "Empfohlene Verkaufspreise, keine Mindestabnahme",
          description: "Vendor gibt unverbindliche Preisempfehlung (UVP) ab. Reseller bestimmt Endpreis frei. Keine Mindestabnahme.",
          risk: "low",
          riskNote: "Kartellrechtlich sauber. Wichtig: Wirklich nur Empfehlung, keine Druckmaßnahmen (sonst RPM!).",
          whenProblem: "Vendor verliert Preiskontrolle, Marktbild kann uneinheitlich werden.",
          whenNegotiate: "Vendor kann Mindestmarge oder Wettbewerbsschutz alternativ über Reseller-Selektion erreichen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "fixed_minimum_purchase",
          label: "Feste Mindestabnahme + Marge-Staffel",
          description: "Reseller verpflichtet sich zu einer Mindestabnahme pro Quartal/Jahr (z.B. 100k EUR netto). Marge steigt mit höheren Abnahmemengen (Tier-Modell).",
          risk: "medium",
          riskNote: "Üblich in Distributor-Verträgen. Vertikal-GVO-konform, sofern keine Preisbindung über Marge erzwungen wird.",
          whenProblem: "Bei Marktverschlechterung kann Reseller die Schwellen nicht erreichen → Ausstiegsklauseln einbauen.",
          whenNegotiate: "Mindestabnahmen nicht starr, sondern an Marktentwicklung gekoppelt (Eskalation, jährliche Re-Verhandlung).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "maximum_resale_price",
          label: "Höchstpreisbindung",
          description: "Vendor legt einen Höchstpreis fest, den der Reseller nicht überschreiten darf. Reseller darf darunter frei kalkulieren.",
          risk: "low",
          riskNote: "Vertikal-GVO-konform (Art. 4 lit. a VO 2022/720). Mindest- und Festpreise sind verboten, Höchstpreise erlaubt.",
          whenProblem: "Wenn der Höchstpreis faktisch wie ein Festpreis wirkt → kartellrechtliches Risiko.",
          whenNegotiate: "Höchstpreis muss realistisch über den Marktpreisen liegen, sonst RPM-Vorwurf.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "revenue_share_msrp",
          label: "Umsatzbeteiligung am Endkundenpreis",
          description: "Reseller verkauft zum vom Vendor festgelegten MSRP, erhält fixen Prozentsatz als Provision. Lizenzvertrag wird zwischen Vendor und Endkunde geschlossen.",
          risk: "medium",
          riskNote: "Hier rückt der Reseller rechtlich nahe an den Handelsvertreter (HGB § 84) → Risiko Ausgleichsanspruch § 89b HGB bei Vertragsende.",
          whenProblem: "Wenn faktisch wie Handelsvertreter agiert, droht Ausgleichsanspruch (durchschnittliche Jahresprovision der letzten 5 Jahre).",
          whenNegotiate: "Klare Abgrenzung im Vertrag und in der tatsächlichen Durchführung. Alternativ: echtes Eigenhändlermodell.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "fixed_minimum_purchase", ausgewogen: "vendor_recommended_no_minimum", durchsetzungsstark: "vendor_recommended_no_minimum" }
    },

    // ── 4. Marketing & Co-Branding ──
    {
      key: "marketing_branding",
      title: "Marketingpflichten, Co-Branding & Lead-Sharing",
      paragraph: "§ 5",
      description: "Welche Marketingleistungen werden gegenseitig erbracht? Wie werden Leads geteilt? Wer trägt Kosten?",
      importance: "high",
      options: [
        {
          value: "reseller_only_no_support",
          label: "Reseller trägt Marketing allein",
          description: "Reseller ist für sein Marketing voll verantwortlich. Vendor stellt keine Unterstützung. Markennutzung nur nach engen Vendor-Vorgaben.",
          risk: "medium",
          riskNote: "Reseller-Investitionen amortisieren sich schwer; mindestens Investitionsschutz bei Vertragsende verlangen.",
          whenProblem: "Wenn Reseller über Jahre eine Marke aufbaut und dann gekündigt wird — keine Abgeltung.",
          whenNegotiate: "Reseller sollte Marketing-Budget-Beteiligung oder Kompensation bei Kündigung verlangen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mdf_marketing_development_funds",
          label: "Marketing Development Funds (MDF)",
          description: "Vendor stellt einen festen Prozentsatz des Reseller-Umsatzes (z.B. 2–5 %) als Marketingbudget bereit, das der Reseller für genehmigte Maßnahmen einsetzt.",
          risk: "low",
          riskNote: "Marktstandard im Enterprise-SaaS-Channel. Klare Abrechnung und Genehmigungsprozess wichtig.",
          whenProblem: "Bei intransparenten Genehmigungsprozessen kann MDF zur Druckmaßnahme werden (kartellrechtlich kritisch, wenn an Preisniveau gekoppelt).",
          whenNegotiate: "Klare Maßnahmen-Liste, Bearbeitungsfristen, kein Zusammenhang mit Endkundenpreisen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "co_branding_joint_marketing",
          label: "Gemeinsames Co-Branding mit gegenseitiger Markennutzung",
          description: "Beide Parteien dürfen die Marke der anderen Partei nach klaren Style-Guides nutzen. Gemeinsame Events, Messen, Whitepaper. Kosten geteilt.",
          risk: "medium",
          riskNote: "Strenge Markennutzungsregeln nötig (MarkenG § 14, 15). Bei Vertragsende klare Übergangsregelung mit Sell-off-Period.",
          whenProblem: "Bei Vertragskonflikten oder Reputationsschäden einer Partei kann die andere mitleiden.",
          whenNegotiate: "Eindeutige Style-Guides, Zustimmungspflicht für gemeinsames Material, Right-of-Withdrawal.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "deal_registration_lead_protection",
          label: "Deal-Registration mit Lead-Schutz",
          description: "Reseller kann Endkunden-Opportunities beim Vendor registrieren. Vendor schützt registrierte Deals vor Direktvertrieb oder anderen Resellern für definierte Zeit (z.B. 90 Tage).",
          risk: "low",
          riskNote: "Marktstandard. Schützt Reseller-Investitionen in Lead-Generierung. DSGVO-konform gestalten.",
          whenProblem: "Bei intransparenter Bearbeitung oder konkurrierender Registrierung mehrerer Reseller.",
          whenNegotiate: "Klare First-come-first-served-Regel, transparente Registry, Bestätigungspflicht des Vendors.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "reseller_only_no_support", ausgewogen: "mdf_marketing_development_funds", durchsetzungsstark: "co_branding_joint_marketing" }
    },

    // ── 5. Sublizenzierung & EULA ──
    {
      key: "sublicensing_eula",
      title: "Sublizenzierung und Endkunden-EULA",
      paragraph: "§ 6",
      description: "Welche EULA gilt zwischen Reseller und Endkunde? Bindet die Vendor-EULA durch oder hat der Reseller eigene Geschäftsbedingungen?",
      importance: "critical",
      options: [
        {
          value: "vendor_eula_passthrough",
          label: "Vendor-EULA als Pflicht-Pass-Through",
          description: "Reseller MUSS die Endkunden-EULA des Vendors unverändert in seinen Vertrag einbinden. Eigene Geschäftsbedingungen nur für Beauftragungsmodalitäten (Preise, Zahlung, Lieferung).",
          risk: "medium",
          riskNote: "Reseller wird Verwender der Vendor-AGB → § 305 BGB-Risiken treffen ihn. Wenn Vendor-EULA AGB-rechtlich angreifbar ist, haftet der Reseller gegenüber Endkunden.",
          whenProblem: "Endkunden klagen Reseller wegen unwirksamer Klauseln, Reseller hat Regress gegen Vendor — Vertragsstreit.",
          whenNegotiate: "Reseller verlangt Freistellung durch Vendor bei AGB-Streitigkeiten + Recht zur AGB-Anpassung an deutsches Recht.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "reseller_own_terms_with_minimum",
          label: "Reseller-eigene AGB mit Pflicht-Mindestklauseln",
          description: "Reseller darf eigene Endkunden-AGB nutzen, muss aber bestimmte Vendor-Klauseln (IP-Schutz, Lizenzbedingungen, Datenschutz, Haftung gegenüber Vendor) unverändert übernehmen.",
          risk: "low",
          riskNote: "Marktstandard. Reseller hat Gestaltungsfreiheit, Vendor-IP bleibt geschützt.",
          whenProblem: "Bei nicht abgestimmten Klauseln können Lücken entstehen (z.B. fehlende AVV, ungenaue Lizenzdefinition).",
          whenNegotiate: "Vendor stellt Pflichtklauseln-Liste mit Erklärung bereit, Reseller darf eigene Kommerz-Klauseln frei gestalten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "direct_contract_vendor_endcustomer",
          label: "Direkter Vertrag Vendor ↔ Endkunde",
          description: "Reseller vermittelt nur, vertragliche Bindung entsteht direkt zwischen Vendor und Endkunde (z.B. via Online-Akzeptanz). Reseller bleibt im Hintergrund.",
          risk: "medium",
          riskNote: "Rechtlich klar, aber wirtschaftlich: Reseller hat keinen Vertrag mit Endkunde → Cross-Selling, Bestandskunden-Marketing schwierig.",
          whenProblem: "Reseller verliert Endkundenkontakt, Customer Lifetime Value bleibt beim Vendor.",
          whenNegotiate: "Reseller sollte zusätzlichen Servicevertrag mit Endkunden anbieten dürfen (Setup, Schulung, Support).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "flexible_with_approval",
          label: "Reseller-AGB mit Vendor-Vorab-Genehmigung",
          description: "Reseller darf eigene EULA gestalten, muss diese aber vor erstem Einsatz vom Vendor genehmigen lassen. Änderungen ebenfalls genehmigungspflichtig.",
          risk: "medium",
          riskNote: "Rechtlich sauber, aber bürokratisch und langsam. Bei häufigen AGB-Updates (DSGVO, EU Data Act) Verzögerungen.",
          whenProblem: "Vendor verzögert Genehmigung → Reseller kann nicht reagieren.",
          whenNegotiate: "Genehmigungsfristen vereinbaren (z.B. 14 Tage), Stillschweigen = Zustimmung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "vendor_eula_passthrough", ausgewogen: "reseller_own_terms_with_minimum", durchsetzungsstark: "reseller_own_terms_with_minimum" }
    },

    // ── 6. SLA & Support ──
    {
      key: "sla_support",
      title: "SLA, Verfügbarkeit und Support-Ebenen",
      paragraph: "§ 7",
      description: "Welche SLAs schuldet der Vendor dem Reseller (B2B-SLA)? Wer leistet First/Second/Third-Level-Support?",
      importance: "high",
      options: [
        {
          value: "vendor_sla_passthrough",
          label: "Vendor-SLA wird durchgereicht",
          description: "Reseller verkauft die Vendor-SLA an Endkunden weiter, ohne eigene Zusagen. Verfügbarkeitsstörungen werden vom Vendor direkt mit Endkunde abgewickelt.",
          risk: "medium",
          riskNote: "Reseller hat keine SLA-Risiken, aber auch keine eigene Service-Wertschöpfung.",
          whenProblem: "Endkunde wendet sich bei Störung an Reseller, aber dieser hat keine Eskalationsrechte → Frustration.",
          whenNegotiate: "Mindestens Eskalationsweg + Service-Credit-Pass-Through.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "tiered_support_first_level_reseller",
          label: "Reseller First-Level, Vendor Backend",
          description: "Reseller leistet First-Level-Support gegenüber Endkunden (Dokumentation, Standardprobleme). Eskaliert an Vendor für Second/Third-Level. Vendor-SLA gilt im Reseller-Vendor-Verhältnis.",
          risk: "low",
          riskNote: "Marktstandard. Klare Zuständigkeit, Reseller kann Service abrechnen.",
          whenProblem: "Bei unklarem Übergangspunkt zwischen First/Second-Level entstehen Reibungen.",
          whenNegotiate: "Klare Eskalationskriterien (Ticket-Klassen), Reaktionszeiten von Vendor (z.B. 4h für P1).",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "reseller_full_managed_service",
          label: "Reseller als Managed-Service-Provider",
          description: "Reseller bündelt Vendor-Software mit eigenen Services (Setup, Customizing, 24/7-Support). Endkunde hat genau einen Ansprechpartner: den Reseller.",
          risk: "medium",
          riskNote: "Hohe Wertschöpfung beim Reseller, aber auch volle Haftung gegenüber Endkunden bei Service-Ausfällen.",
          whenProblem: "Wenn Vendor-Verfügbarkeit unter SLA fällt, haftet Reseller gegenüber Endkunde, kann nicht 1:1 weiterreichen.",
          whenNegotiate: "Reseller braucht Back-to-Back-SLA (Vendor verpflichtet sich, Reseller vor Endkunden-Ansprüchen freizustellen).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "shared_responsibility_with_credits",
          label: "Geteilte Verantwortung mit Service-Credit-Modell",
          description: "Beide Parteien tragen Support nach klarer Matrix. Bei SLA-Verletzungen erhält der Reseller Service-Credits, die er pro-rata an Endkunden weitergibt.",
          risk: "low",
          riskNote: "Faires Modell. Service-Credits gut dokumentieren (Berechnungsformel, Cap).",
          whenProblem: "Bei Cap-Überschreitungen bleibt der Reseller auf Endkunden-Ansprüchen sitzen.",
          whenNegotiate: "Cap am realen Risiko ausrichten (z.B. 100 % der monatlichen Vendor-Vergütung).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "vendor_sla_passthrough", ausgewogen: "tiered_support_first_level_reseller", durchsetzungsstark: "reseller_full_managed_service" }
    },

    // ── 7. Datenschutz / EU Data Act ──
    {
      key: "data_protection",
      title: "Datenschutz, AVV und EU Data Act",
      paragraph: "§ 8",
      description: "Wer ist Verantwortlicher, wer Auftragsverarbeiter? Welche AVV ist Pflicht? Welche Pflichten ergeben sich aus dem EU Data Act?",
      importance: "critical",
      options: [
        {
          value: "reseller_only_billing_no_personal_data",
          label: "Reseller verarbeitet keine personenbezogenen Daten der Endkunden",
          description: "Reseller hat nur Vertragsdaten der Endkunden-Unternehmen (Firma, Rechnungsadresse). Keine Verarbeitung von Personendaten der Endkunden-Mitarbeiter.",
          risk: "low",
          riskNote: "Saubere Konstellation: Vendor ist Auftragsverarbeiter des Endkunden, Reseller ist außenstehend.",
          whenProblem: "Wenn Reseller doch Zugriff auf Endkunden-Daten hat (Support, Customizing) — DSGVO-Lücke.",
          whenNegotiate: "Klare Trennung dokumentieren (Datenflussdiagramm), Reseller keinen Admin-Zugriff geben.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "vendor_processor_reseller_subprocessor",
          label: "Vendor Auftragsverarbeiter, Reseller Sub-Auftragsverarbeiter",
          description: "Endkunde ist Verantwortlicher (Art. 4 Nr. 7 DSGVO). Vendor ist Auftragsverarbeiter (Art. 28). Reseller wird Sub-Auftragsverarbeiter, wenn er Zugriff zu Support-/Customizing-Zwecken hat.",
          risk: "medium",
          riskNote: "AVV-Kette muss vollständig sein: Endkunde ↔ Vendor ↔ Reseller. Reseller-Pflichten 1:1 wie Vendor-Pflichten (Art. 28 Abs. 4 DSGVO).",
          whenProblem: "Bei fehlender Genehmigung des Endkunden für Sub-Auftragsverarbeitung — DSGVO-Verstoß, Bußgeld bis 4 % Umsatz.",
          whenNegotiate: "Vendor genehmigt Reseller im Kunden-AVV explizit (Listenmodell statt Einzelzustimmung).",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "joint_controllership",
          label: "Gemeinsame Verantwortlichkeit (Art. 26 DSGVO)",
          description: "Vendor und Reseller bestimmen gemeinsam Mittel und Zwecke der Datenverarbeitung (z.B. bei Lead-Generierung, gemeinsamem Marketing). Joint-Controller-Vereinbarung erforderlich.",
          risk: "high",
          riskNote: "Komplex. Beide haften gegenüber Betroffenen gesamtschuldnerisch (Art. 82 Abs. 4 DSGVO). Für Endkunden-Daten meist ungeeignet.",
          whenProblem: "Wenn Aufgabenverteilung unklar — Aufsichtsbehörde hält beide voll verantwortlich.",
          whenNegotiate: "Sehr klare Aufgabenmatrix (wer macht was, wer informiert Betroffene), interner Regress.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "eu_data_act_full_compliance",
          label: "Volle EU-Data-Act-Konformität (Cloud-Switching, Datenportabilität)",
          description: "Vendor und Reseller stellen die Pflichten aus EU Data Act (VO 2023/2854) gemeinsam sicher: max. 2-Monats-Kündigung, 30-Tage-Datenmigration, keine Switching-Gebühren ab 2027, Datenportabilität in standardisierten Formaten.",
          risk: "low",
          riskNote: "Pflicht seit 12.09.2025 für alle Cloud-Anbieter mit EU-Bezug — keine Wahl, sondern Compliance.",
          whenProblem: "Bei Verstoß: Bußgelder bis 20 Mio. EUR oder 4 % Jahresumsatz, zudem Vertragsklauseln nichtig.",
          whenNegotiate: "Klare Aufgabenverteilung (welche Partei führt Datenexport durch, in welchem Format), Service-Credits bei Migrationsverzögerung.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "eu_data_act_full_compliance", ausgewogen: "vendor_processor_reseller_subprocessor", durchsetzungsstark: "vendor_processor_reseller_subprocessor" }
    },

    // ── 8. Haftung ──
    {
      key: "liability",
      title: "Haftung des Resellers gegenüber dem Vendor",
      paragraph: "§ 9",
      description: "Wie haftet der Reseller bei Verstößen (z.B. Lizenzverstöße, Markenmissbrauch, Compliance-Verstöße)? Welche Haftungsobergrenzen gelten?",
      importance: "high",
      options: [
        {
          value: "reseller_unlimited_for_ip_violations",
          label: "Unbegrenzte Reseller-Haftung bei IP- und Compliance-Verstößen",
          description: "Bei Verstößen gegen IP-Rechte des Vendors, Markenmissbrauch, Verkauf in untersagtes Gebiet, Verstoß gegen DSGVO/AI-Act haftet der Reseller unbegrenzt. Sonstige Haftung auf typischen vorhersehbaren Schaden begrenzt.",
          risk: "medium",
          riskNote: "Aus Vendor-Sicht erforderlich (IP ist Kernasset). Aus Reseller-Sicht hart, aber bei eigenem Verschulden tragbar.",
          whenProblem: "Wenn Verstoß durch Sub-Reseller oder Mitarbeiter geschieht — Reseller haftet ohne Verschulden.",
          whenNegotiate: "Reseller verlangt Begrenzung auf Vorsatz/grobe Fahrlässigkeit + Insurance-Anforderung.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mutual_cap_typical_damages",
          label: "Gegenseitige Haftungsbegrenzung auf typischen Schaden",
          description: "Beide Parteien haften für direkte Schäden bis zu einem Cap (z.B. Jahresvergütung × 2). Folgeschäden, entgangener Gewinn, Datenverlust ausgeschlossen — außer bei Vorsatz/grober Fahrlässigkeit.",
          risk: "low",
          riskNote: "Marktstandard im B2B-IT. AGB-rechtlich sauber, sofern Cap angemessen ist.",
          whenProblem: "Bei sehr hohen Endkundenschäden (Cyber-Vorfall, Datenleak) reicht der Cap nicht.",
          whenNegotiate: "Cap an Risiko ausrichten, Cyber-Insurance verlangen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "vendor_indemnification_ip_only",
          label: "Vendor-Freistellung bei IP-Ansprüchen, sonst Marktstandard",
          description: "Vendor stellt Reseller von Ansprüchen Dritter frei, die behaupten, das Vendor-Produkt verletze deren IP. Sonstige Haftung wechselseitig auf Cap begrenzt.",
          risk: "low",
          riskNote: "Wichtig für Reseller — er weiß nicht, ob Vendor-Produkt patentverletzend ist.",
          whenProblem: "Wenn Vendor die Freistellung an enge Bedingungen knüpft (Workaround-Recht, Beendigungsrecht), kann Reseller-Geschäft beendet werden.",
          whenNegotiate: "Mindestens 12-Monats-Übergangszeit + Datenmigration bei IP-bedingter Beendigung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "unlimited_for_data_breach",
          label: "Unbegrenzte Haftung bei Datenpannen/DSGVO-Verstößen",
          description: "Bei DSGVO-Verstößen, Cyber-Vorfällen, Datenleaks haftet die verursachende Partei unbegrenzt. Sonstige Haftung auf Cap begrenzt.",
          risk: "high",
          riskNote: "Erhebliches Risiko (Bußgelder + Schadensersatz Betroffener können 8-stellig werden).",
          whenProblem: "Bei großem Cyber-Vorfall könnte ein Mittelstands-Reseller existenzbedroht sein.",
          whenNegotiate: "Cyber-Versicherung mit ausreichender Deckung verlangen, Cap auch hier setzen (z.B. 10 Mio. EUR).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "reseller_unlimited_for_ip_violations", ausgewogen: "vendor_indemnification_ip_only", durchsetzungsstark: "vendor_indemnification_ip_only" }
    },

    // ── 9. Vertragsstrafe & Audit ──
    {
      key: "penalty_audit",
      title: "Vertragsstrafe & Audit-Recht",
      paragraph: "§ 10",
      description: "Wird bei Verstößen (Lizenzmissbrauch, Pricing-Verstöße, Gebietsverletzungen) eine Vertragsstrafe fällig? Hat der Vendor ein Audit-Recht?",
      importance: "high",
      options: [
        {
          value: "no_penalty_audit_only",
          label: "Kein Strafbetrag, nur Audit-Recht",
          description: "Keine Vertragsstrafe. Vendor darf einmal pro Jahr ein Audit beim Reseller durchführen (Lizenznutzung, Verkaufsbücher).",
          risk: "medium",
          riskNote: "Bei Verstoß muss konkreter Schaden bewiesen werden — bei IP-Verstößen schwer.",
          whenProblem: "Wenn Reseller systematisch zu wenige Lizenzen meldet — Schaden schwer bezifferbar.",
          whenNegotiate: "Bei nachgewiesenem Verstoß könnten zumindest die Audit-Kosten der Reseller tragen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "tiered_penalty_with_proof_clause",
          label: "Gestaffelte Vertragsstrafe + Beweismöglichkeit",
          description: "Bei Lizenzverstoß: 3-faches Lizenzentgelt + Auditkosten. Bei Gebietsverletzung: pauschal 5–25k EUR. Reseller darf niedrigeren Schaden beweisen (§ 309 Nr. 5 BGB-konform).",
          risk: "low",
          riskNote: "AGB-rechtlich sauber durch Beweisrecht. Marktstandard.",
          whenProblem: "Bei sehr hohen Pauschalen können Gerichte nach § 343 BGB reduzieren.",
          whenNegotiate: "Pauschalen marktüblich halten, Eskalation bei Wiederholung definieren.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "severe_penalty_unlimited_audit",
          label: "Hohe Vertragsstrafe + jederzeitiges Audit-Recht",
          description: "Vertragsstrafe pro Verstoß bis 100.000 EUR. Vendor kann jederzeit (mit 5 Werktagen Vorlaufzeit) Audit durchführen, auch durch Dritte.",
          risk: "medium",
          riskNote: "Stark abschreckend, aber kann nach § 343 BGB reduziert werden, wenn unverhältnismäßig. AGB-Inhaltskontrolle prüfen.",
          whenProblem: "Reseller fühlt sich überwacht, Audit-Aufwand wirtschaftlich belastend.",
          whenNegotiate: "Audit-Frequenz begrenzen (max. 1× pro Jahr außer bei begründetem Verdacht), Audit-Kosten regeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mutual_audit_no_penalty",
          label: "Gegenseitiges Audit-Recht ohne Vertragsstrafe",
          description: "Beide Parteien dürfen Audit durchführen (Vendor: Lizenzen, Reseller: Provisionsabrechnungen, MDF-Verwendung). Keine Strafe — Schadenersatz nach BGB.",
          risk: "medium",
          riskNote: "Faires Modell. Aber bei IP-Verstößen ist konkrete Schadensberechnung schwer.",
          whenProblem: "Bei systematischen Verstößen ist die Abschreckung gering.",
          whenNegotiate: "Mindestens Pauschale für Lizenzverstöße ergänzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "severe_penalty_unlimited_audit", ausgewogen: "tiered_penalty_with_proof_clause", durchsetzungsstark: "no_penalty_audit_only" }
    },

    // ── 10. Vertragslaufzeit & Kündigung ──
    {
      key: "term_termination",
      title: "Vertragslaufzeit, Kündigung & Investitionsschutz",
      paragraph: "§ 11",
      description: "Wie lange läuft der Vertrag? Welche Kündigungsfristen gelten? Was passiert bei Vertragsende mit laufenden Endkundenverträgen?",
      importance: "high",
      options: [
        {
          value: "short_term_easy_termination",
          label: "Kurze Laufzeit, einfache Kündigung",
          description: "Vertrag läuft 12 Monate, automatische Verlängerung um 12 Monate, Kündigung mit 3 Monaten Frist. Keine Sell-off-Period.",
          risk: "medium",
          riskNote: "Vendor maximal flexibel, Reseller hat keinen Investitionsschutz.",
          whenProblem: "Reseller kann Vertriebsaufbau (Personal, Marketing) nicht sinnvoll abschreiben.",
          whenNegotiate: "Reseller verlangt Investitionsschutz oder längere Laufzeit.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "fixed_term_with_renewal",
          label: "Feste Laufzeit (3 Jahre) mit Verlängerungsoption",
          description: "Vertrag läuft 3 Jahre, ordentliche Kündigung erst zum Ende, sonst Verlängerung um 1 Jahr mit 6-Monats-Frist. Sell-off-Period 6 Monate.",
          risk: "low",
          riskNote: "Marktstandard. Beide Seiten haben Planungssicherheit.",
          whenProblem: "Bei strategischen Veränderungen (Übernahme, Produktwechsel) kann der Vertrag nicht angepasst werden.",
          whenNegotiate: "Sonderkündigungsrechte definieren (Übernahme, materielle Vertragsverletzung).",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "long_term_strong_protection",
          label: "Lange Laufzeit (5 Jahre) mit Investitionsschutz",
          description: "5 Jahre Laufzeit, Verlängerung um 2 Jahre. Kündigungsfrist 12 Monate. Sell-off-Period 12 Monate. Bestandskunden bleiben beim Reseller.",
          risk: "medium",
          riskNote: "Vorteilhaft für Reseller, kann für Vendor zu lang sein. Wettbewerbsverbote max. 5 Jahre (Vertikal-GVO).",
          whenProblem: "Bei Vendor-Strategiewechsel kein Ausstieg möglich.",
          whenNegotiate: "Außerordentliches Kündigungsrecht bei wesentlicher Vertragsverletzung beibehalten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "termination_for_convenience_with_compensation",
          label: "Beidseitige Kündigung jederzeit, mit Abfindung",
          description: "Beide Parteien können jederzeit mit 6 Monaten Frist kündigen. Bei Kündigung durch Vendor: Investitionsabgeltung. Bestandskunden migrieren mit.",
          risk: "medium",
          riskNote: "Faire Lösung, aber Abfindungsberechnung muss präzise sein.",
          whenProblem: "Bei Streit über Abfindungshöhe drohen langwierige Prozesse.",
          whenNegotiate: "Klare Berechnungsformel, ggf. Schiedsgutachter.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "short_term_easy_termination", ausgewogen: "fixed_term_with_renewal", durchsetzungsstark: "long_term_strong_protection" }
    },

    // ── 11. Wettbewerbsverbot ──
    {
      key: "non_compete",
      title: "Wettbewerbsverbot & Konkurrenzschutz",
      paragraph: "§ 12",
      description: "Darf der Reseller konkurrierende Produkte vertreiben? Gilt nach Vertragsende ein Wettbewerbsverbot?",
      importance: "medium",
      options: [
        {
          value: "no_non_compete_open",
          label: "Kein Wettbewerbsverbot, freier Vertrieb",
          description: "Reseller darf jederzeit auch Konkurrenzprodukte vertreiben. Vendor kann nur durch eigene Attraktivität (Marge, Support) binden.",
          risk: "low",
          riskNote: "Kartellrechtlich unbedenklich. Reseller maximal flexibel.",
          whenProblem: "Vendor verliert Mindshare beim Reseller.",
          whenNegotiate: "Vendor kann mit Tier-Status oder höheren Margen für Exklusiv-Anteil arbeiten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "vertical_block_exemption_compliant",
          label: "Wettbewerbsverbot nach Vertikal-GVO",
          description: "Reseller darf während der Vertragsdauer keine direkten Konkurrenzprodukte vertreiben (max. 5 Jahre, danach automatisch entfallend). Nach Vertragsende max. 1 Jahr Verbot, gebietsbeschränkt.",
          risk: "low",
          riskNote: "Vertikal-GVO 2022/720 konform. Marktstandard im selektiven Vertrieb.",
          whenProblem: "Bei Übernahme des Resellers durch Konkurrenz → Konflikt.",
          whenNegotiate: "Klare Definition des Konkurrenzprodukts (gleicher Funktionsumfang? gleiche Zielgruppe?).",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "exclusive_full_dedication",
          label: "Exklusiver Vertrieb, keine anderen Produkte",
          description: "Reseller verpflichtet sich, ausschließlich Vendor-Produkte zu vertreiben (auch andere Geschäftsfelder ausgeschlossen).",
          risk: "high",
          riskNote: "Kartellrechtlich problematisch, wenn Marktanteil >30 %. Bei kleinerem Marktanteil zeitlich begrenzt zulässig (max. 5 Jahre).",
          whenProblem: "Bei wirtschaftlichen Schwankungen kann Reseller nicht in andere Bereiche ausweichen.",
          whenNegotiate: "Mindestmarge oder Mindestumsatz-Garantie als Gegenleistung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mutual_non_solicitation",
          label: "Gegenseitiges Abwerbeverbot (Mitarbeiter & Kunden)",
          description: "Während der Vertragslaufzeit und 12 Monate danach werben sich beide Parteien keine Mitarbeiter oder Bestandskunden ab.",
          risk: "low",
          riskNote: "Übliches Add-on. Bei Mitarbeitern Vorsicht: Berufsausübungsfreiheit (Art. 12 GG), zu strenge Klauseln unwirksam.",
          whenProblem: "Wenn Definition Bestandskunden zu weit ist.",
          whenNegotiate: "Klare Liste oder Definition (z.B. im letzten Jahr aktiv betreut).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "vertical_block_exemption_compliant", ausgewogen: "vertical_block_exemption_compliant", durchsetzungsstark: "no_non_compete_open" }
    },

    // ── 12. Schlussbestimmungen ──
    {
      key: "jurisdiction",
      title: "Gerichtsstand und anwendbares Recht",
      paragraph: "§ 13",
      description: "Welches Recht gilt? Wo wird bei Streitigkeiten geklagt? Schiedsgericht oder ordentliche Gerichte?",
      importance: "medium",
      options: [
        {
          value: "vendor_seat_german_law",
          label: "Sitz des Vendors, deutsches Recht",
          description: "Gerichtsstand am Sitz des Vendors. Anwendbares Recht: deutsches Recht unter Ausschluss UN-Kaufrecht (CISG) und IPR-Verweisungsnormen.",
          risk: "low",
          riskNote: "Vorteilhaft für Vendor. Bei deutschem Reseller unproblematisch, bei ausländischem Reseller Vollstreckungsfrage.",
          whenProblem: "Internationaler Reseller findet Gerichtsstand unzumutbar.",
          whenNegotiate: "Bei B2B im Inland fast immer akzeptabel.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "reseller_seat_local_law",
          label: "Sitz des Resellers, lokales Recht",
          description: "Gerichtsstand am Sitz des Resellers, lokales Recht.",
          risk: "medium",
          riskNote: "Vorteilhaft für Reseller. Vendor muss bei IP-Verstößen vor lokalem Gericht klagen.",
          whenProblem: "Bei kleinem Reseller in EU-Land mit langsamen Gerichten kann Durchsetzung Jahre dauern.",
          whenNegotiate: "Mindestens Schiedsgericht als Alternative anbieten.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "neutral_arbitration_iccdis",
          label: "Schiedsgericht (DIS oder ICC)",
          description: "Streitigkeiten werden durch ein Schiedsgericht nach den Regeln der DIS oder ICC entschieden. Sitz: neutraler Ort (z.B. Frankfurt, Zürich).",
          risk: "low",
          riskNote: "Marktstandard im internationalen B2B. Schneller, vertraulich, weltweit vollstreckbar (New Yorker Übereinkommen).",
          whenProblem: "Schiedsgerichte sind teurer als ordentliche Gerichte (Schiedsrichterkosten 6-stellig möglich).",
          whenNegotiate: "Bei Verträgen <500k EUR Jahreswert ggf. ordentliches Gericht günstiger.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "hybrid_court_with_arbitration_option",
          label: "Ordentliches Gericht mit Schieds-Opt-In",
          description: "Standardmäßig ordentliches Gericht (Vendor-Sitz). Beide Parteien können binnen 30 Tagen nach Streitanzeige einseitig auf Schiedsverfahren umschalten.",
          risk: "medium",
          riskNote: "Klingt flexibel, ist aber prozessrechtlich riskant — Zustimmung zur Schiedsklausel muss beidseitig sein.",
          whenProblem: "Streit über Forum bevor inhaltlicher Streit überhaupt verhandelt wird.",
          whenNegotiate: "Klare, einseitig oder beidseitig wirkende Opt-In-Regel.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "vendor_seat_german_law", ausgewogen: "neutral_arbitration_iccdis", durchsetzungsstark: "reseller_seat_local_law" }
    }
  ]
};

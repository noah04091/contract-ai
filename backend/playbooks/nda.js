// NDA Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Erweitert contractTypes/nda.js, ersetzt es NICHT

module.exports = {
  type: "nda",
  title: "Geheimhaltungsvereinbarung (NDA)",
  description: "Schütze vertrauliche Informationen bei Geschäftsbeziehungen, Kooperationen oder Verhandlungen.",
  icon: "shield",
  difficulty: "einfach",
  estimatedTime: "5–10 Minuten",
  legalBasis: "BGB §§ 241 ff., GeschGehG",

  // Rollen-Definition
  roles: {
    A: { key: "offenlegend", label: "Offenlegende Partei", description: "Gibt vertrauliche Informationen weiter" },
    B: { key: "empfangend", label: "Empfangende Partei", description: "Erhält vertrauliche Informationen" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Maximaler Schutz — empfohlen wenn du Informationen preisgibst",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Faire Balance zwischen beiden Parteien — Marktstandard",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro dich optimiert — wenn du die stärkere Verhandlungsposition hast",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    { key: "partyA_name", label: "Name / Firma (Offenlegende Partei)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Adresse", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertreten durch", type: "text", required: false, group: "partyA" },
    { key: "partyB_name", label: "Name / Firma (Empfangende Partei)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Adresse", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_representative", label: "Vertreten durch", type: "text", required: false, group: "partyB" },
    { key: "purpose", label: "Zweck der Offenlegung", type: "textarea", required: true, group: "context",
      placeholder: "z.B. Prüfung einer möglichen Geschäftskooperation im Bereich..." },
    { key: "direction", label: "Art der NDA", type: "select", required: true, group: "context",
      options: [
        { value: "einseitig", label: "Einseitig (eine Partei gibt Infos)" },
        { value: "gegenseitig", label: "Gegenseitig (beide Parteien tauschen Infos)" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — Das Herzstück des Playbooks
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Vertrauliche Informationen ──
    {
      key: "confidential_info",
      title: "Vertrauliche Informationen",
      paragraph: "§ 2",
      description: "Definiert, was genau als vertraulich gilt. Die wichtigste Klausel einer NDA.",
      importance: "critical",
      options: [
        {
          value: "broad",
          label: "Sehr breit (maximaler Schutz)",
          description: "Alle Informationen die im Rahmen der Zusammenarbeit geteilt werden, unabhängig von Form oder Kennzeichnung.",
          risk: "medium",
          riskNote: "Breiter Schutz, aber kann vor Gericht als zu unbestimmt gelten.",
          whenProblem: "Wenn die andere Partei nachweist, dass die Definition so breit ist, dass sie praktisch alles umfasst — Gerichte können dann die gesamte Klausel kippen.",
          whenNegotiate: "Wenn du die empfangende Partei bist und dein Handlungsspielraum eingeschränkt wird.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "standard",
          label: "Standard (marktüblich)",
          description: "Informationen die als vertraulich gekennzeichnet sind oder ihrer Natur nach erkennbar vertraulich sind.",
          risk: "low",
          riskNote: "Rechtssicher und durchsetzbar. Bewährter Marktstandard.",
          whenProblem: "Selten — funktioniert in den meisten Fällen. Risiko nur wenn sensible Infos versehentlich nicht gekennzeichnet werden.",
          whenNegotiate: "In den meisten Fällen akzeptabel für beide Seiten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "narrow",
          label: "Eng (nur explizit benannte)",
          description: "Nur ausdrücklich als vertraulich bezeichnete und schriftlich übergebene Informationen.",
          risk: "high",
          riskNote: "Minimaler Schutz — mündlich geteilte Infos sind nicht geschützt.",
          whenProblem: "Wenn du vertrauliche Informationen mündlich teilst (Meetings, Calls) und diese nicht erfasst werden.",
          whenNegotiate: "Wenn du die empfangende Partei bist und maximale Freiheit brauchst.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "broad", ausgewogen: "standard", durchsetzungsstark: "broad" }
    },

    // ── 2. Ausnahmen ──
    {
      key: "exceptions",
      title: "Ausnahmen von der Vertraulichkeit",
      paragraph: "§ 4",
      description: "Legt fest, welche Informationen NICHT als vertraulich gelten (z.B. öffentlich bekannte Infos).",
      importance: "high",
      options: [
        {
          value: "minimal",
          label: "Minimale Ausnahmen",
          description: "Nur gesetzlich zwingende Ausnahmen (bereits öffentlich bekannt, unabhängig entwickelt).",
          risk: "low",
          riskNote: "Maximaler Schutz für die offenlegende Partei.",
          whenProblem: "Wenn die empfangende Partei beweisen muss, dass sie etwas unabhängig wusste — schwer nachzuweisen.",
          whenNegotiate: "Wenn du die empfangende Partei bist — zu wenige Ausnahmen schränken dich unnötig ein.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "standard",
          label: "Standard-Ausnahmen",
          description: "Öffentlich bekannt, unabhängig entwickelt, von Dritter Seite ohne Verstoß erhalten, schriftliche Freigabe.",
          risk: "low",
          riskNote: "Marktüblich und fair für beide Seiten.",
          whenProblem: "Selten problematisch. Die 4 Standard-Ausnahmen sind gerichtlich gut erprobt.",
          whenNegotiate: "Normalerweise direkt akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "extended",
          label: "Erweiterte Ausnahmen",
          description: "Standard + behördliche Anordnung + Reverse Engineering + eigene Mitarbeiter die es wissen müssen.",
          risk: "medium",
          riskNote: "Mehr Spielraum für die empfangende Partei, weniger Schutz für die offenlegende.",
          whenProblem: "Wenn die empfangende Partei die Ausnahmen strategisch nutzt um Infos intern weit zu verbreiten.",
          whenNegotiate: "Wenn du die offenlegende Partei bist und sensible Infos teilst.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "minimal", ausgewogen: "standard", durchsetzungsstark: "standard" }
    },

    // ── 3. Laufzeit der Geheimhaltung ──
    {
      key: "duration",
      title: "Laufzeit der Geheimhaltungspflicht",
      paragraph: "§ 5",
      description: "Wie lange müssen die Informationen geheim gehalten werden?",
      importance: "high",
      options: [
        {
          value: "2_years",
          label: "2 Jahre",
          description: "Geheimhaltung gilt 2 Jahre nach Vertragsende.",
          risk: "medium",
          riskNote: "Kurz. Für schnelllebige Branchen (Tech, Marketing) oft ausreichend.",
          whenProblem: "Wenn deine Informationen länger als 2 Jahre wertvoll sind (z.B. Kundendaten, Geschäftsstrategien).",
          whenNegotiate: "Wenn du die offenlegende Partei bist und langfristigen Schutz brauchst.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "3_years",
          label: "3 Jahre",
          description: "Geheimhaltung gilt 3 Jahre nach Vertragsende.",
          risk: "low",
          riskNote: "Guter Mittelwert. In den meisten Branchen ausreichend und durchsetzbar.",
          whenProblem: "Selten — 3 Jahre ist ein gerichtlich akzeptierter Zeitraum.",
          whenNegotiate: "Meist akzeptabel für beide Seiten.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "5_years",
          label: "5 Jahre",
          description: "Geheimhaltung gilt 5 Jahre nach Vertragsende.",
          risk: "low",
          riskNote: "Starker Schutz. Standard bei sensiblen Geschäftsgeheimnissen.",
          whenProblem: "Kann für die empfangende Partei abschreckend wirken — sie bindet sich lange.",
          whenNegotiate: "Wenn du die empfangende Partei bist und 3 Jahre für ausreichend hältst.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "unlimited",
          label: "Unbefristet",
          description: "Geheimhaltungspflicht endet nie.",
          risk: "high",
          riskNote: "Maximaler Schutz, aber rechtlich umstritten. Gerichte können als unangemessen bewerten.",
          whenProblem: "Gerichte in Deutschland bewerten unbefristete Klauseln häufig als unverhältnismäßig und reduzieren auf angemessene Dauer.",
          whenNegotiate: "Fast immer — unbefristet wird selten akzeptiert und kann die gesamte NDA gefährden.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "5_years", ausgewogen: "3_years", durchsetzungsstark: "5_years" }
    },

    // ── 4. Pflichten des Empfängers ──
    {
      key: "obligations",
      title: "Pflichten der empfangenden Partei",
      paragraph: "§ 3",
      description: "Was muss die empfangende Partei konkret tun, um die Informationen zu schützen?",
      importance: "high",
      options: [
        {
          value: "basic",
          label: "Basis-Pflichten",
          description: "Vertraulich behandeln, nicht an Dritte weitergeben, nur für vereinbarten Zweck nutzen.",
          risk: "medium",
          riskNote: "Grundschutz vorhanden, aber keine konkreten Sicherheitsmaßnahmen vorgeschrieben.",
          whenProblem: "Wenn sensible Daten auf unsicheren Systemen gespeichert werden und kein Mindeststandard vereinbart ist.",
          whenNegotiate: "Selten — Basis-Pflichten sind das Minimum und werden fast immer akzeptiert.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "standard",
          label: "Standard-Pflichten",
          description: "Basis + angemessene technische und organisatorische Maßnahmen + Informationspflicht bei Datenleck.",
          risk: "low",
          riskNote: "Guter Schutz mit klaren Pflichten. Marktüblich bei B2B-Vereinbarungen.",
          whenProblem: "Selten — deckt die wichtigsten Szenarien ab.",
          whenNegotiate: "In den meisten Fällen direkt akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "strict",
          label: "Strenge Pflichten",
          description: "Standard + konkrete Sicherheitsstandards + Zugangsbeschränkung (Need-to-know) + regelmäßige Überprüfung + Auditrecht.",
          risk: "low",
          riskNote: "Höchster Schutzstandard, aber aufwändig für die empfangende Partei.",
          whenProblem: "Kann als unverhältnismäßig angesehen werden wenn die geteilten Infos nicht besonders sensibel sind.",
          whenNegotiate: "Wenn du die empfangende Partei bist und der Aufwand für Audits/Überprüfungen zu hoch ist.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "strict", ausgewogen: "standard", durchsetzungsstark: "standard" }
    },

    // ── 5. Weitergabe an Dritte ──
    {
      key: "third_party",
      title: "Weitergabe an Dritte",
      paragraph: "§ 6",
      description: "Darf die empfangende Partei vertrauliche Informationen an Dritte (z.B. Berater, Subunternehmer) weitergeben?",
      importance: "high",
      options: [
        {
          value: "forbidden",
          label: "Vollständig verboten",
          description: "Keine Weitergabe an Dritte, unter keinen Umständen.",
          risk: "medium",
          riskNote: "Maximaler Schutz, aber kann die Zusammenarbeit erschweren (z.B. wenn Anwälte hinzugezogen werden müssen).",
          whenProblem: "Wenn die empfangende Partei ihre eigenen Berater (Anwälte, Steuerberater) nicht einbeziehen kann.",
          whenNegotiate: "Wenn du Berater oder Subunternehmer brauchst, um mit den erhaltenen Infos zu arbeiten.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "restricted",
          label: "Eingeschränkt erlaubt",
          description: "Nur an Mitarbeiter und Berater die dem Zweck dienen, unter eigener NDA-Pflicht.",
          risk: "low",
          riskNote: "Praxistauglich und fair. Die empfangende Partei haftet für ihre Mitarbeiter/Berater.",
          whenProblem: "Selten — deckt den Praxisbedarf gut ab.",
          whenNegotiate: "Meist direkt akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "with_consent",
          label: "Mit vorheriger Zustimmung",
          description: "Weitergabe nur nach schriftlicher Zustimmung der offenlegenden Partei im Einzelfall.",
          risk: "low",
          riskNote: "Volle Kontrolle, aber bürokratisch — jede Weitergabe muss einzeln genehmigt werden.",
          whenProblem: "Wenn die Zustimmungsprozesse die Zusammenarbeit verlangsamen.",
          whenNegotiate: "Wenn schnelle Entscheidungswege wichtig sind.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "forbidden", ausgewogen: "restricted", durchsetzungsstark: "restricted" }
    },

    // ── 6. Rückgabe / Vernichtung ──
    {
      key: "return_destruction",
      title: "Rückgabe und Vernichtung",
      paragraph: "§ 7",
      description: "Was passiert mit den vertraulichen Unterlagen wenn die Zusammenarbeit endet?",
      importance: "medium",
      options: [
        {
          value: "on_termination",
          label: "Bei Vertragsende",
          description: "Alle Unterlagen und Kopien müssen bei Vertragsende zurückgegeben oder vernichtet werden.",
          risk: "low",
          riskNote: "Klare Regelung, einfach umsetzbar.",
          whenProblem: "Wenn digitale Kopien in Backups existieren die technisch nicht löschbar sind.",
          whenNegotiate: "Meist unproblematisch.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "on_request",
          label: "Auf Anforderung jederzeit",
          description: "Die offenlegende Partei kann jederzeit die Rückgabe oder Vernichtung verlangen.",
          risk: "low",
          riskNote: "Maximale Flexibilität für die offenlegende Partei.",
          whenProblem: "Wenn mitten in einem Projekt plötzlich Rückgabe gefordert wird.",
          whenNegotiate: "Wenn du die empfangende Partei bist und eine laufende Zusammenarbeit nicht unterbrochen werden soll.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "both_with_confirmation",
          label: "Beides + schriftliche Bestätigung",
          description: "Bei Vertragsende oder auf Anforderung + die empfangende Partei muss die Vernichtung schriftlich bestätigen.",
          risk: "low",
          riskNote: "Stärkstes Modell mit Nachweispflicht. Empfehlenswert bei sensiblen Daten.",
          whenProblem: "Verwaltungsaufwand für die Bestätigung.",
          whenNegotiate: "Selten — die Bestätigung schafft Rechtssicherheit für beide Seiten.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "both_with_confirmation", ausgewogen: "on_termination", durchsetzungsstark: "on_termination" }
    },

    // ── 7. Vertragsstrafe ──
    {
      key: "penalty",
      title: "Vertragsstrafe",
      paragraph: "§ 8",
      description: "Soll bei einem Verstoß gegen die NDA eine feste Strafzahlung fällig werden?",
      importance: "high",
      options: [
        {
          value: "none",
          label: "Keine Vertragsstrafe",
          description: "Kein Strafbetrag vereinbart. Bei Verstoß muss Schaden konkret nachgewiesen werden.",
          risk: "high",
          riskNote: "Ohne Vertragsstrafe musst du den konkreten Schaden beweisen — bei Geheimnisverrat oft unmöglich.",
          whenProblem: "Immer wenn ein Verstoß schwer beweisbar oder der Schaden schwer bezifferbar ist — also fast immer bei NDAs.",
          whenNegotiate: "Nur akzeptieren wenn das Risiko eines Verstoßes sehr gering ist.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "moderate",
          label: "Moderat (10.000 – 50.000 EUR)",
          description: "Angemessene Vertragsstrafe pro Verstoß. Abschreckend, aber verhältnismäßig.",
          risk: "low",
          riskNote: "Gut durchsetzbar vor Gericht. Richter reduzieren selten bei dieser Größenordnung.",
          whenProblem: "Selten — moderate Vertragsstrafen sind bewährt und akzeptiert.",
          whenNegotiate: "Meist direkt akzeptabel als fairer Kompromiss.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "high",
          label: "Hoch (50.000 – 250.000 EUR)",
          description: "Hohe Vertragsstrafe mit starker Abschreckungswirkung.",
          risk: "medium",
          riskNote: "Stark abschreckend, aber Gerichte können die Höhe nach § 343 BGB herabsetzen wenn unverhältnismäßig.",
          whenProblem: "Wenn die Vertragsstrafe im Verhältnis zum Geschäft unangemessen hoch ist — Gericht kann reduzieren.",
          whenNegotiate: "Wenn du die empfangende Partei bist — eine zu hohe Strafe kann existenzbedrohend sein.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "high", ausgewogen: "moderate", durchsetzungsstark: "moderate" }
    },

    // ── 8. Haftung ──
    {
      key: "liability",
      title: "Haftung",
      paragraph: "§ 9",
      description: "Wie weit haftet die empfangende Partei bei einem Verstoß?",
      importance: "medium",
      options: [
        {
          value: "limited",
          label: "Begrenzt",
          description: "Haftung ist auf den typischen, vorhersehbaren Schaden begrenzt (Ausschluss Folgeschäden).",
          risk: "medium",
          riskNote: "Begrenzt das Risiko für die empfangende Partei, kann aber den Schutz der offenlegenden Partei schwächen.",
          whenProblem: "Wenn der tatsächliche Schaden durch einen Verstoß den begrenzten Betrag weit übersteigt.",
          whenNegotiate: "Wenn du die offenlegende Partei bist und hohe Folgeschäden möglich sind.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "standard",
          label: "Standard (nach BGB)",
          description: "Volle Haftung nach gesetzlichen Regelungen. Vorsatz und grobe Fahrlässigkeit unbegrenzt.",
          risk: "low",
          riskNote: "Gesetzlicher Standard — fair und gerichtsfest.",
          whenProblem: "Selten problematisch. Entspricht dem was sowieso gelten würde.",
          whenNegotiate: "Meist direkt akzeptabel.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "unlimited",
          label: "Volle Haftung (alle Schäden)",
          description: "Unbegrenzte Haftung inkl. Folgeschäden, entgangenem Gewinn und Reputationsschäden.",
          risk: "medium",
          riskNote: "Maximaler Schutz, aber kann abschreckend wirken und Verhandlungen erschweren.",
          whenProblem: "Wenn die empfangende Partei das Risiko als unkalkulierbar bewertet und die NDA ablehnt.",
          whenNegotiate: "Wenn du die empfangende Partei bist — unbegrenzte Haftung ist ein erhebliches Risiko.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "unlimited", ausgewogen: "standard", durchsetzungsstark: "standard" }
    },

    // ── 9. Gerichtsstand & Anwendbares Recht ──
    {
      key: "jurisdiction",
      title: "Gerichtsstand und anwendbares Recht",
      paragraph: "§ 10",
      description: "Welches Recht gilt und wo wird bei Streitigkeiten geklagt?",
      importance: "medium",
      options: [
        {
          value: "party_a",
          label: "Sitz der offenlegenden Partei",
          description: "Gerichtsstand am Sitz der offenlegenden Partei. Deutsches Recht.",
          risk: "low",
          riskNote: "Vorteilhaft für die offenlegende Partei — kürzer Wege, bekanntes Gericht.",
          whenProblem: "Wenn die empfangende Partei weit entfernt sitzt und hohe Reisekosten hätte.",
          whenNegotiate: "Wenn du die empfangende Partei bist und der Gerichtsstand unzumutbar weit weg ist.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "party_b",
          label: "Sitz der empfangenden Partei",
          description: "Gerichtsstand am Sitz der empfangenden Partei. Deutsches Recht.",
          risk: "medium",
          riskNote: "Vorteilhaft für die empfangende Partei. Die offenlegende Partei muss bei Verstoß reisen.",
          whenProblem: "Wenn du die offenlegende Partei bist und schnell klagen musst.",
          whenNegotiate: "Wenn du die offenlegende Partei bist — du möchtest nah am eigenen Gericht sein.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "defendant",
          label: "Sitz des Beklagten (gesetzlich)",
          description: "Gesetzlicher Standard: Klage am Sitz des Beklagten. Deutsches Recht.",
          risk: "low",
          riskNote: "Fairste Lösung — entspricht der gesetzlichen Grundregel.",
          whenProblem: "Selten — entspricht sowieso dem gesetzlichen Normalfall.",
          whenNegotiate: "Meist sofort akzeptabel, da neutral.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "party_a", ausgewogen: "defendant", durchsetzungsstark: "party_b" }
    }
  ]
};

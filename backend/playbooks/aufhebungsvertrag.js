// Aufhebungsvertrag Playbook — Smart Playbook System
// Geführte Vertragserstellung mit Entscheidungslogik, Risiko-Bewertung und Strategie-Modi
// Einvernehmliche Beendigung Arbeitsverhältnis — mit Abfindung, Freistellung, Zeugnis, Sperrzeit-Schutz

module.exports = {
  type: "aufhebungsvertrag",
  title: "Aufhebungsvertrag (einvernehmliche Beendigung Arbeitsverhältnis)",
  description: "Vertrag zwischen Arbeitgeber und Arbeitnehmer zur einvernehmlichen Beendigung des Arbeitsverhältnisses — mit Abfindung, Freistellung, Zeugnis, Wettbewerbsregelung, Sperrzeit-Schutz und steuerlicher Optimierung.",
  icon: "handshake",
  difficulty: "komplex",
  estimatedTime: "10–15 Minuten",
  legalBasis: "BGB § 623 (Schriftform), §§ 280, 311 Abs. 2, 241 Abs. 2 (Faires Verhandeln), KSchG §§ 1, 1a, SGB III §§ 158, 159, EStG § 34, GewO § 109, HGB §§ 74-75d, BetrAVG, AGG, BetrVG § 102, BUrlG",

  // Rollen-Definition
  roles: {
    A: { key: "arbeitgeber", label: "Arbeitgeber", description: "Unternehmen, das Arbeitsverhältnis einvernehmlich beenden will" },
    B: { key: "arbeitnehmer", label: "Arbeitnehmer", description: "Beschäftigter, der das Arbeitsverhältnis verlässt" }
  },

  // Modi mit Beschreibung
  modes: {
    sicher: {
      label: "Sicher",
      emoji: "shield",
      description: "Pro Arbeitgeber — Niedrige Abfindung (KSchG-Untergrenze), bezahlte Freistellung mit Urlaubsanrechnung, weite Verschwiegenheits-/Wettbewerbsklauseln, vollständige Generalquittung",
      color: "#22c55e"
    },
    ausgewogen: {
      label: "Ausgewogen",
      emoji: "balance",
      description: "Marktstandard — Abfindung 0,5 MV/Jahr (KSchG § 1a), sperrzeitfreie Formulierung, unwiderrufliche Freistellung mit Urlaubsanrechnung, gutes Zeugnis, gegenseitige Generalquittung",
      color: "#3b82f6"
    },
    durchsetzungsstark: {
      label: "Durchsetzungsstark",
      emoji: "target",
      description: "Pro Arbeitnehmer — Hohe Abfindung (0,75–1,0 MV/Jahr), Sprinter-Bonus, Auflösung Wettbewerbsverbot, sehr gute Zeugnisnote, Outplacement, bAV-Übertragung",
      color: "#f59e0b"
    }
  },

  // Parteien-Felder (Step 2)
  partyFields: [
    // Arbeitgeber
    { key: "partyA_name", label: "Firmenname (Arbeitgeber)", type: "text", required: true, group: "partyA" },
    { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
    { key: "partyA_representative", label: "Vertretungsberechtigt (HR/GF)", type: "text", required: true, group: "partyA" },
    { key: "partyA_employees", label: "Anzahl Beschäftigte (für KSchG/§17)", type: "select", required: true, group: "partyA",
      options: [
        { value: "kleinbetrieb", label: "≤ 10 (KSchG nicht anwendbar)" },
        { value: "ksch_anwendbar", label: "11–500 (KSchG anwendbar)" },
        { value: "ueber_500", label: "> 500 (Massenentlassung § 17 KSchG prüfen)" }
      ]
    },

    // Arbeitnehmer
    { key: "partyB_name", label: "Vor- und Nachname (Arbeitnehmer)", type: "text", required: true, group: "partyB" },
    { key: "partyB_address", label: "Anschrift", type: "textarea", required: true, group: "partyB" },
    { key: "partyB_birthdate", label: "Geburtsdatum", type: "date", required: true, group: "partyB" },
    { key: "partyB_position", label: "Position / Funktion", type: "text", required: true, group: "partyB" },
    { key: "partyB_entry", label: "Eintrittsdatum", type: "date", required: true, group: "partyB" },
    { key: "partyB_grundgehalt", label: "Bruttomonatsgehalt", type: "number", required: true, group: "partyB" },

    // Beendigungs-Kontext
    { key: "beendigungsdatum", label: "Vertragsende (Beendigungsdatum)", type: "date", required: true, group: "context" },
    { key: "kuendigungsfrist", label: "Ordentliche Kündigungsfrist (zur Sperrzeit-Vermeidung)", type: "select", required: true, group: "context",
      options: [
        { value: "eingehalten", label: "Eingehalten (ordentliche Frist nach § 622 BGB / Tarif)" },
        { value: "gekuerzt_mit_abfindung", label: "Gekürzt — Abfindung könnte zu Ruhen ALG führen (§ 158 SGB III)" }
      ]
    },
    { key: "beendigungsgrund", label: "Beendigungsgrund (sperrzeit-relevant)", type: "select", required: true, group: "context",
      options: [
        { value: "betrieblich_gedroht", label: "Drohende betriebsbedingte Kündigung des AG (sperrzeitfrei!)" },
        { value: "personenbedingt_krankheit", label: "Personenbedingte Gründe (Krankheit, Leistung)" },
        { value: "verhaltensbedingt", label: "Verhaltensbedingt (vorausgegangene Abmahnung)" },
        { value: "an_eigene_initiative", label: "AN-Initiative (Eigenkündigungs-Konstellation, SPERRZEIT-RISIKO)" },
        { value: "mutual_corporate", label: "Einvernehmlich ohne spezifischen Grund (SPERRZEIT-RISIKO)" }
      ]
    },
    { key: "abfindung_betrag", label: "Abfindungshöhe brutto in EUR", type: "number", required: true, group: "context" },
    { key: "freistellung", label: "Freistellung", type: "select", required: true, group: "context",
      options: [
        { value: "unwiderruflich_bezahlt", label: "Unwiderrufliche bezahlte Freistellung" },
        { value: "widerruflich_bezahlt", label: "Widerrufliche bezahlte Freistellung" },
        { value: "keine", label: "Keine Freistellung" }
      ]
    },
    { key: "wettbewerbsverbot_aktiv", label: "Bestehendes nachvertragliches Wettbewerbsverbot?", type: "select", required: true, group: "context",
      options: [
        { value: "nein", label: "Nein" },
        { value: "ja_bleiben", label: "Ja, bleibt bestehen mit Karenz" },
        { value: "ja_aufheben", label: "Ja, wird im Aufhebungsvertrag aufgehoben" }
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  // SEKTIONEN — Das Herzstück des Playbooks
  // ═══════════════════════════════════════════════
  sections: [
    // ── 1. Beendigungsgrund und Sperrzeit-Schutz ──
    {
      key: "termination_reason",
      title: "Beendigungsgrund und Sperrzeit-Schutz",
      paragraph: "§ 2",
      description: "Formulierung des Beendigungsgrundes ist entscheidend für Sperrzeit-Vermeidung beim ALG (BSG B 11a AL 47/05 R). Falsche Formulierung kostet AN bis zu 12 Wochen ALG.",
      importance: "critical",
      options: [
        {
          value: "betriebsbedingt_explizit",
          label: "Hinweis auf drohende betriebsbedingte Kündigung des AG",
          description: "\"Zur Vermeidung einer ansonsten ausgesprochenen ordentlichen betriebsbedingten Kündigung wegen Restrukturierung schließen die Parteien folgenden Aufhebungsvertrag.\"",
          risk: "low",
          riskNote: "BSG-konform; sperrzeitfrei wenn KSchG § 1a-Range eingehalten + ordentliche Frist + nicht offensichtlich rechtswidrig.",
          whenProblem: "BA prüft trotzdem; Beweis liegt bei AN.",
          whenNegotiate: "Beide: schriftliche Begründung der drohenden Kündigung beifügen.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "personenbedingt_krankheit",
          label: "Hinweis auf personenbedingte Gründe (lange Krankheit)",
          description: "Bei lang andauernder Erkrankung mit negativer Prognose.",
          risk: "medium",
          riskNote: "Sperrzeit-Risiko mittel — BA prüft, ob personenbedingte Kündigung tatsächlich rechtmäßig wäre.",
          whenProblem: "Wenn AG die Schwelle für personenbedingte Kündigung nicht erreicht — Sperrzeit.",
          whenNegotiate: "Ärztl. Bescheinigung beifügen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "keine_begruendung",
          label: "Keine Begründung im Vertrag",
          description: "\"Die Parteien beenden das Arbeitsverhältnis im gegenseitigen Einvernehmen.\"",
          risk: "high",
          riskNote: "Hohes Sperrzeit-Risiko — BA wertet als AN-Mitwirken ohne wichtigen Grund. 12 Wochen Sperre droht.",
          whenProblem: "Standardproblem.",
          whenNegotiate: "Beide: Sperrzeit-Risiko durch Begründung mindern.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "verhaltensbedingt_drohung",
          label: "Hinweis auf drohende verhaltensbedingte / fristlose Kündigung",
          description: "Bei vorausgegangener Abmahnung oder nachgewiesenem Fehlverhalten.",
          risk: "medium",
          riskNote: "Sperrzeit kann vermieden werden, aber Eingeständnis = ggf. Auswirkungen auf Bewerbungen. AN-Reputationsrisiko.",
          whenProblem: "Bei späterer Bewerbung problematisch.",
          whenNegotiate: "AN: stillschweigende Einigung ohne Schuldanerkennung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "personenbedingt_krankheit", ausgewogen: "betriebsbedingt_explizit", durchsetzungsstark: "betriebsbedingt_explizit" }
    },

    // ── 2. Abfindungshöhe ──
    {
      key: "severance",
      title: "Abfindungshöhe",
      paragraph: "§ 3",
      description: "KSchG § 1a-Range (0,5 MV/Jahr) ist BA-Standard für sperrzeit-freien Vertrag. Steuerlich: Fünftelregelung § 34 EStG. Seit 2025: nur in Steuererklärung, nicht im Lohnsteuerabzug.",
      importance: "critical",
      options: [
        {
          value: "null_keine_abfindung",
          label: "Keine Abfindung",
          description: "Kein Geldzahlung, nur Freistellung/Zeugnis.",
          risk: "high",
          riskNote: "SPERRZEIT-RISIKO hoch — BSG-Ausnahme greift nicht ohne Abfindung. AN sollte ablehnen.",
          whenProblem: "Standardproblem.",
          whenNegotiate: "AN: niemals ohne Abfindung unterzeichnen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "ksch_unten_0_25",
          label: "0,25 Monatsverdienste pro Beschäftigungsjahr (KSchG § 1a-Untergrenze)",
          description: "Untere Grenze des sperrzeit-freien BSG-Range.",
          risk: "medium",
          riskNote: "Sperrzeit-frei, aber im Markt unterdurchschnittlich. AN-Liquidität gering.",
          whenProblem: "AN: kaum Verhandlungsspielraum.",
          whenNegotiate: "AN: 0,5 MV/Jahr verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "ksch_standard_0_5",
          label: "0,5 Monatsverdienste pro Jahr (KSchG § 1a-Standard)",
          description: "\"Eine halbe Bruttomonatsvergütung pro vollendetem Beschäftigungsjahr.\" Häufigster Marktstandard.",
          risk: "low",
          riskNote: "BSG-konform. Sperrzeit-frei. § 34 EStG-Fünftelregelung anwendbar.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Empfohlen Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "verhandelt_1_0_mit_aufschlag",
          label: "1,0 MV/Jahr + Sprinter-Bonus + Klageverzichts-Bonus",
          description: "Höhere Abfindung mit Anreizen: Sprinter (vorzeitige Beendigung) + zusätzliche Pauschale für Verzicht auf KSchK-Klage.",
          risk: "low",
          riskNote: "AN-freundlich. Sperrzeit-frei (BSG schaut auf KSchG-Range, höhere Abfindung unschädlich). § 34 EStG-Fünftelregelung.",
          whenProblem: "AG: Kostenfaktor.",
          whenNegotiate: "AG: bei Senior-/Schlüsselmandanten oft akzeptiert.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "ksch_unten_0_25", ausgewogen: "ksch_standard_0_5", durchsetzungsstark: "verhandelt_1_0_mit_aufschlag" }
    },

    // ── 3. Freistellung ──
    {
      key: "release",
      title: "Freistellung",
      paragraph: "§ 4",
      description: "Freistellung dient: Urlaubsverbrauch, Karenz für Wettbewerbsverbot, Suchzeit für AN. BAG 9 AZR 4/23: Unwiderrufliche Freistellung mit klarer Urlaubsanrechnung sicherer als nachträgliche Abgeltung.",
      importance: "high",
      options: [
        {
          value: "keine_freistellung",
          label: "Keine Freistellung",
          description: "AN arbeitet bis zum Beendigungsdatum.",
          risk: "medium",
          riskNote: "AG-freundlich (Wertschöpfung), aber bei Vertrauensverlust nicht praktikabel.",
          whenProblem: "Bei Misstrauen / Wettbewerbsthemen problematisch.",
          whenNegotiate: "AG: Freistellung ab Unterschrift.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "widerruflich_bezahlt",
          label: "Widerrufliche bezahlte Freistellung",
          description: "AN ist freigestellt, AG kann Rückkehr verlangen.",
          risk: "medium",
          riskNote: "AG-Flexibilität. Steuerlich: Lohnzahlung weiter Lohnsteuer + SV (kein Fünftel-Vorteil). Bei Widerruf praktisch selten.",
          whenProblem: "Steuerlich nicht optimal.",
          whenNegotiate: "Steuerlich besser: unwiderruflich.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "unwiderruflich_mit_urlaubsanrechnung",
          label: "Unwiderrufliche bezahlte Freistellung mit Urlaubsanrechnung",
          description: "\"AN wird ab 01.05.2026 unwiderruflich freigestellt. Resturlaub und Überstunden werden in dieser Zeit verbraucht.\"",
          risk: "low",
          riskNote: "BAG 9 AZR 4/23-konform; klare Urlaubsabwicklung. AN sucht neuen Job, Karenz für Wettbewerbsverbot tickt.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfehlung Marktstandard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "lange_unwiderruflich_mit_outplacement",
          label: "Lange unwiderrufliche Freistellung (z.B. 6 Mo) + Outplacement-Budget",
          description: "AN bis Vertragsende freigestellt, AG-finanzierter Outplacement-Provider.",
          risk: "low",
          riskNote: "AN-freundlich, sehr werthaltig. AG: hohe Kosten.",
          whenProblem: "Bei Senior-Positionen branchenüblich.",
          whenNegotiate: "AG: Outplacement-Budget begrenzen (z.B. 5.000 EUR).",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "widerruflich_bezahlt", ausgewogen: "unwiderruflich_mit_urlaubsanrechnung", durchsetzungsstark: "lange_unwiderruflich_mit_outplacement" }
    },

    // ── 4. Zeugnis ──
    {
      key: "reference",
      title: "Zeugnis",
      paragraph: "§ 5",
      description: "§ 109 GewO Anspruch auf qualifiziertes Zeugnis. Inhalt + Note müssen wahr und wohlwollend sein. Aufhebungsvertrag fixiert Note + Zwischenzeugnis-Inhalte.",
      importance: "high",
      options: [
        {
          value: "nur_einfaches_zeugnis",
          label: "Einfaches Zeugnis (nur Tätigkeit, keine Bewertung)",
          description: "Tätigkeitsbeschreibung ohne Leistungs-/Verhaltensbewertung.",
          risk: "high",
          riskNote: "Wirkt für Bewerbungen sehr negativ — Personaler vermuten Probleme. AN sollte ablehnen.",
          whenProblem: "Ständig negative Einstellungseffekte.",
          whenNegotiate: "AN: qualifiziertes Zeugnis verlangen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "qualifiziert_befriedigend",
          label: "Qualifiziertes Zeugnis mit Note \"befriedigend\" (\"zur Zufriedenheit\")",
          description: "Standard-Default ohne aktive Aufwertung.",
          risk: "medium",
          riskNote: "\"Befriedigend\" gilt im Markt als unterdurchschnittlich. BAG: Kläger muss bessere Note beweisen.",
          whenProblem: "AN-Bewerbungs-Nachteil.",
          whenNegotiate: "AN: \"vollste Zufriedenheit\" (gut) verhandeln.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "qualifiziert_gut",
          label: "Qualifiziertes Zeugnis mit Note \"gut\" (\"stets vollster Zufriedenheit\") + individuelle Wohlwollensformulierungen",
          description: "Marktstandard; AN-freundlich, AG-üblich.",
          risk: "low",
          riskNote: "Gut für Bewerbung.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Empfehlung Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "sehr_gut_individualisiert",
          label: "Sehr gut (\"stets in höchstem Maße zur vollsten Zufriedenheit\") + individuelle Erfolgs-Hervorhebungen + Bedauerns-Klausel",
          description: "Top-Note mit individualisierten Stärken; \"Wir bedauern sein Ausscheiden außerordentlich.\"",
          risk: "low",
          riskNote: "Optimal AN. AG: nur bei tatsächlich überdurchschnittlicher Leistung wahrheitsgemäß.",
          whenProblem: "Wenn AG-Note nicht passt — gerichtlich angreifbar.",
          whenNegotiate: "Senior-Standard.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "qualifiziert_befriedigend", ausgewogen: "qualifiziert_gut", durchsetzungsstark: "sehr_gut_individualisiert" }
    },

    // ── 5. Urlaub und Überstunden ──
    {
      key: "vacation_overtime",
      title: "Urlaub und Überstunden",
      paragraph: "§ 6",
      description: "BUrlG § 7 Abs. 4 — Resturlaub bei Beendigung in Geld abzugelten. Bei Freistellung Verbrauch durch Freistellung möglich (BAG 9 AZR 4/23). Bei Überstunden: Vertrag/Tarif/Betriebsvereinbarung prüfen.",
      importance: "high",
      options: [
        {
          value: "verfall_durch_freistellung",
          label: "Resturlaub und Überstunden verbraucht durch Freistellung",
          description: "\"Mit der unwiderruflichen Freistellung ab... gelten Resturlaub und Überstunden als gewährt/ausgeglichen.\"",
          risk: "low",
          riskNote: "BAG 9 AZR 4/23-konform bei klarer Regelung. AG-vorteilhaft.",
          whenProblem: "Bei zu kurzer Freistellung — Resturlaub nicht verbrauchbar.",
          whenNegotiate: "AN: Tage-Berechnung dokumentieren.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "abgeltung_in_geld",
          label: "Abgeltung Resturlaub + Überstunden mit letztem Lohn",
          description: "Brutto-Abgeltung mit normalem Lohnsteuerabzug.",
          risk: "low",
          riskNote: "AN-freundlich, klar dokumentiert. AG: höhere Kosten.",
          whenProblem: "Selten.",
          whenNegotiate: "AN: Tage-Anzahl präzise.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "gemischt_freistellung_rest_abgegolten",
          label: "Hauptverbrauch durch Freistellung, Rest abgegolten",
          description: "Wenn Freistellung kürzer als Resturlaub — Rest wird zusätzlich abgegolten.",
          risk: "low",
          riskNote: "Fair, häufig in Praxis.",
          whenProblem: "Berechnung muss präzise sein.",
          whenNegotiate: "Klarer Berechnungsschlüssel.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "keine_regelung",
          label: "Keine ausdrückliche Regelung",
          description: "Verweis auf gesetzliche Abgeltung.",
          risk: "high",
          riskNote: "BAG 9 AZR 384/20: Verfall nur bei AG-Hinweis auf Resturlaub und drohenden Verfall. Ohne Regelung kann AN später Abgeltung in Geld verlangen — auch nachträglich.",
          whenProblem: "Standardproblem; nachträgliche Klage.",
          whenNegotiate: "Beide: explizit regeln.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "verfall_durch_freistellung", ausgewogen: "verfall_durch_freistellung", durchsetzungsstark: "abgeltung_in_geld" }
    },

    // ── 6. Wettbewerbsverbot und Nachvertragliche Pflichten ──
    {
      key: "non_compete",
      title: "Wettbewerbsverbot und Nachvertragliche Pflichten",
      paragraph: "§ 7",
      description: "§ 74 HGB: nachvertr. Wettbewerbsverbot nur mit Karenz min. 50 % wirksam. Aufhebungsvertrag häufig Anlass zur Aufhebung gegen Pauschale.",
      importance: "high",
      options: [
        {
          value: "wettbewerbsverbot_bleibt_mit_karenz",
          label: "Bestehendes Wettbewerbsverbot bleibt mit Karenzentschädigung",
          description: "Karenz wird über Vertragsende hinaus monatlich gezahlt (50 % der zuletzt bezogenen Leistungen).",
          risk: "low",
          riskNote: "§ 74 HGB-konform; AG schützt Marktposition, AN bekommt Karenz.",
          whenProblem: "AG: hohe Folgekosten.",
          whenNegotiate: "AG: Anrechnung anderweitiger Verdienste (§ 74c HGB).",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "wettbewerbsverbot_aufgehoben_in_aufhebungsvertrag",
          label: "Bestehendes Wettbewerbsverbot wird im Aufhebungsvertrag aufgehoben",
          description: "Beide Parteien einigen sich: Wettbewerbsverbot entfällt, AN frei für Konkurrenztätigkeit.",
          risk: "low",
          riskNote: "AN-vorteilhaft (volle berufliche Freiheit). AG-Schutz fällt weg.",
          whenProblem: "AG: Marktinformations-Risiko.",
          whenNegotiate: "AG: NDA / Verschwiegenheits-Klausel verstärken.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "kundenschutz_12mon_ohne_karenz",
          label: "Kein volles Wettbewerbsverbot, aber 12 Monate Kundenschutz",
          description: "AN darf für Wettbewerber arbeiten, aber 12 Monate keine AG-Kunden aktiv abwerben.",
          risk: "medium",
          riskNote: "Bei AN-Kündigung wirksam, aber Schwelle eng. Bei \"voll-AN\" sollte Karenz angeboten werden.",
          whenProblem: "Bei Streit zur Wirksamkeit.",
          whenNegotiate: "Beide: präzise Reichweite definieren.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "keine_klausel",
          label: "Keine nachvertraglichen Wettbewerbs- oder Kundenschutz-Pflichten",
          description: "Keine Einschränkung; nur gesetzliche Treuepflicht endet mit Vertrag.",
          risk: "low",
          riskNote: "AN frei. AG-Risiko: bei Schlüsselpositionen Marktverlust.",
          whenProblem: "Bei Wettbewerb-sensitiven Positionen problematisch.",
          whenNegotiate: "AG: NDA verstärken oder Wettbewerbsverbot vereinbaren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "wettbewerbsverbot_bleibt_mit_karenz", ausgewogen: "kundenschutz_12mon_ohne_karenz", durchsetzungsstark: "wettbewerbsverbot_aufgehoben_in_aufhebungsvertrag" }
    },

    // ── 7. Verschwiegenheit nach Beendigung ──
    {
      key: "confidentiality",
      title: "Verschwiegenheit nach Beendigung",
      paragraph: "§ 8",
      description: "BAG 8 AZR 172/23 (17.10.2024): pauschale \"Catch-All\"-Klauseln über Betriebsgeheimnisse unwirksam. Konkrete Geschäftsgeheimnisse benennen (GeschGehG).",
      importance: "high",
      options: [
        {
          value: "gesetzlich_GeschGehG",
          label: "Verweis auf gesetzliche Verschwiegenheitspflicht (GeschGehG)",
          description: "\"AN hält gesetzlich geschützte Geschäftsgeheimnisse weiter geheim.\"",
          risk: "medium",
          riskNote: "GeschGehG-Schutz nur bei \"angemessenen Maßnahmen\" des AG. Wenig konkrete Pflicht.",
          whenProblem: "AG: Schutz unklar.",
          whenNegotiate: "AG: konkretisieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        },
        {
          value: "konkret_aufgelistete_geheimnisse",
          label: "Konkret aufgelistete Geschäftsgeheimnisse, 5 Jahre nachvertraglich",
          description: "\"AN verpflichtet sich, folgende Geschäftsgeheimnisse 5 Jahre nach Beendigung nicht zu offenbaren: [Liste der konkret benannten Geheimnisse].\"",
          risk: "low",
          riskNote: "BAG 8 AZR 172/23-konform. Wirksam und durchsetzbar.",
          whenProblem: "Selten Streit.",
          whenNegotiate: "Empfohlen Marktstandard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "pauschal_alles_unbefristet",
          label: "Pauschal alle \"Geschäftsgeheimnisse\" unbefristet",
          description: "Catch-All-Klausel ohne Konkretisierung.",
          risk: "high",
          riskNote: "Unwirksam nach BAG 8 AZR 172/23. Klausel kippt; gesetzlicher Schutz reduziert.",
          whenProblem: "Klausel unwirksam, AG-Schutz weg.",
          whenNegotiate: "AG: konkretisieren statt pauschalisieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "streng_mit_strafe_3jahre",
          label: "Konkret aufgelistet + Vertragsstrafe 25.000 EUR pro Verstoß, 3 Jahre",
          description: "Verstärkter Schutz mit Strafabschreckung. § 343 BGB-Reduktion möglich, aber 25.000 EUR meist verhältnismäßig.",
          risk: "medium",
          riskNote: "Wirksam bei verhältnismäßiger Höhe.",
          whenProblem: "Bei Verstoß: hoher AN-Schaden.",
          whenNegotiate: "AN: Strafe auf vorsätzliche/grobfahrlässige Verstöße begrenzen.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "streng_mit_strafe_3jahre", ausgewogen: "konkret_aufgelistete_geheimnisse", durchsetzungsstark: "gesetzlich_GeschGehG" }
    },

    // ── 8. Betriebliche Altersversorgung (bAV) ──
    {
      key: "pension",
      title: "Betriebliche Altersversorgung (bAV)",
      paragraph: "§ 9",
      description: "BetrAVG § 1b — bei Beendigung ab 3 Jahren bAV-Zugehörigkeit + Mindestalter 21 = unverfallbare Anwartschaft. Im Aufhebungsvertrag adressieren, sonst Streit.",
      importance: "medium",
      options: [
        {
          value: "keine_regelung",
          label: "Keine ausdrückliche Regelung",
          description: "Verweis auf gesetzliche Anwartschaft.",
          risk: "medium",
          riskNote: "Streitanfällig — AN kann später unklare Ansprüche geltend machen.",
          whenProblem: "Bei Beendigung mit aktiver bAV.",
          whenNegotiate: "Beide: dokumentieren.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "unverfallbare_anwartschaft_dokumentiert",
          label: "Unverfallbare Anwartschaft dokumentiert + Übertragungsoption (§ 4 BetrAVG)",
          description: "Höhe Anwartschaft, Versorgungsträger, Übertragungsrechte aufgeführt.",
          risk: "low",
          riskNote: "Klar, fair.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfehlung.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: false }
        },
        {
          value: "abfindung_anwartschaft",
          label: "Anwartschaft wird durch Abfindung ausgeglichen",
          description: "AG zahlt zusätzliche Pauschale, AN verzichtet auf Anwartschaft. § 3 BetrAVG: nur bei \"kleinen\" Anwartschaften (≤ 1 % der Bezugsgröße/Monat) möglich.",
          risk: "high",
          riskNote: "Verzicht auf bAV nur engumzonten zulässig (§ 3 BetrAVG). Bei höheren Anwartschaften unwirksam, AN behält Anspruch trotz Klausel.",
          whenProblem: "Klausel unwirksam bei größerer Anwartschaft.",
          whenNegotiate: "Bei kleinen Anwartschaften praktisch.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "mit_AG_zuschuss_uebertragung",
          label: "Übertragung auf neuen AG/private Police mit AG-Zuschuss",
          description: "AG unterstützt Übertragung mit Zuschuss (z.B. 1 Jahresbeitrag).",
          risk: "low",
          riskNote: "AN-freundlich; bAV-Erhalt + Bonus.",
          whenProblem: "AG-Kosten.",
          whenNegotiate: "Bei Senior-Mandanten branchenüblich.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: true }
        }
      ],
      smartDefault: { sicher: "abfindung_anwartschaft", ausgewogen: "unverfallbare_anwartschaft_dokumentiert", durchsetzungsstark: "mit_AG_zuschuss_uebertragung" }
    },

    // ── 9. Generalquittung und Erledigungsklausel ──
    {
      key: "general_release",
      title: "Generalquittung und Erledigungsklausel",
      paragraph: "§ 10",
      description: "Zentral für Beendigungsabsicherung. AG will: keine Nachforderungen. AN will: alle Ansprüche bezahlt. BAG-Rechtsprechung: weite Generalquittung wirksam, aber bestimmte Ansprüche (Lohnsteuer, SV) nicht erfasst.",
      importance: "high",
      options: [
        {
          value: "keine_klausel",
          label: "Keine Generalquittung",
          description: "Beidseitig nur, was im Vertrag steht.",
          risk: "high",
          riskNote: "Streitrisiko hoch — Folgeforderungen (Boni, Provisionen, Überstunden) nachträglich möglich.",
          whenProblem: "Standardproblem.",
          whenNegotiate: "Beide: Klausel ergänzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "ag_einseitig",
          label: "AG-einseitige Erledigungsklausel",
          description: "\"Mit Erfüllung dieses Vertrages sind alle Ansprüche des AN gegen AG abgegolten, gleich welchen Rechtsgrundes.\"",
          risk: "medium",
          riskNote: "AG-vorteilhaft, aber bei AGB AGB-Inhaltskontrolle möglich (§ 305 BGB). § 309 Nr. 14 BGB: Verzicht auf bestehende Ansprüche bedarf Prüfung.",
          whenProblem: "AN-Klage auf nachträgliche Boni etc.",
          whenNegotiate: "AN: gegenseitige Klausel.",
          recommended: { sicher: true, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "gegenseitig",
          label: "Beidseitige Generalquittung",
          description: "\"Mit Erfüllung dieses Vertrages sind alle gegenseitigen Ansprüche aus dem Arbeitsverhältnis erledigt — ausgenommen unverfallbare bAV-Anwartschaften, gesetzliche und tarifliche Ansprüche, die nicht abdingbar sind.\"",
          risk: "low",
          riskNote: "Marktüblich, fair. Ausnahmeklausel schützt vor Unwirksamkeit.",
          whenProblem: "Selten.",
          whenNegotiate: "Empfohlener Standard.",
          recommended: { sicher: false, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "mit_einzelnen_offenen_punkten",
          label: "Generalquittung + Liste explizit offener Punkte",
          description: "\"Erledigung erfolgt mit Ausnahme: ausstehende Provision Q1/2026, Bonus 2025, ggf. Steuerbescheid 2026.\"",
          risk: "low",
          riskNote: "Klar, präzise; verhindert spätere Streitigkeiten.",
          whenProblem: "Verwaltungsaufwand.",
          whenNegotiate: "Bei größeren Mandaten Standard.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "ag_einseitig", ausgewogen: "gegenseitig", durchsetzungsstark: "gegenseitig" }
    },

    // ── 10. Rückgabe Arbeitsmittel und Schlussbestimmungen ──
    {
      key: "return_final",
      title: "Rückgabe Arbeitsmittel und Schlussbestimmungen",
      paragraph: "§ 11",
      description: "Rückgabe von Laptop, Handy, Schlüsseln, Kreditkarten, Akten, Dienstwagen — präzise Liste mit Rückgabedatum. Schriftform für Änderungen. Salvatorische Klausel.",
      importance: "medium",
      options: [
        {
          value: "liste_rueckgabe_letzter_arbeitstag",
          label: "Liste der Arbeitsmittel + Rückgabe am letzten Arbeitstag",
          description: "Konkrete Liste (Laptop S/N, Handy IMEI, Schlüssel, Kreditkarten), Rückgabe gegen Bestätigung.",
          risk: "low",
          riskNote: "Klar, dokumentationssicher.",
          whenProblem: "Bei fehlenden Items ggf. Schadensersatz.",
          whenNegotiate: "Beide: Liste vorab abstimmen.",
          recommended: { sicher: true, ausgewogen: true, durchsetzungsstark: true }
        },
        {
          value: "keine_regelung",
          label: "Keine Regelung",
          description: "Allgemeine Rückgabeverpflichtung aus Treuepflicht.",
          risk: "medium",
          riskNote: "Streitrisiko bei vergessenen Items.",
          whenProblem: "Bei Streit über Verschulden.",
          whenNegotiate: "Liste ergänzen.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "rueckgabe_innerhalb_30_tage_nach_freistellung",
          label: "Rückgabe innerhalb 30 Tage nach Freistellung",
          description: "Bei langer Freistellung praktisch — AN gibt Items am Ende der Freistellung zurück.",
          risk: "low",
          riskNote: "Praxistauglich.",
          whenProblem: "Bei AN-Verzug Schadensersatz.",
          whenNegotiate: "Standard für lange Freistellung.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        },
        {
          value: "dienstwagen_uebernahme_an_an",
          label: "Dienstwagen wird AN zum Buchwert / kostenlos überlassen",
          description: "Bonus für Senior-AN; AN kauft/erhält Dienstwagen.",
          risk: "low",
          riskNote: "Bonus-Charakter; steuerlich als geldwerter Vorteil zu berücksichtigen.",
          whenProblem: "Steuerliche Auswirkungen prüfen.",
          whenNegotiate: "Senior-Manager-Bonus.",
          recommended: { sicher: false, ausgewogen: false, durchsetzungsstark: false }
        }
      ],
      smartDefault: { sicher: "liste_rueckgabe_letzter_arbeitstag", ausgewogen: "liste_rueckgabe_letzter_arbeitstag", durchsetzungsstark: "rueckgabe_innerhalb_30_tage_nach_freistellung" }
    }
  ]
};

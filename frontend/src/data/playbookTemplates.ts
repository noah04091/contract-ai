/**
 * Playbook Review Templates
 * Fertige Regelsets für gängige Vertragstypen.
 * Werden im Builder Step 2 als "Aus Vorlage starten" angeboten.
 */

export interface PlaybookTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  contractType: string;
  role: 'auftraggeber' | 'auftragnehmer' | 'neutral';
  industry: string;
  rules: Array<{
    title: string;
    description: string;
    category: string;
    priority: 'muss' | 'soll' | 'kann';
    threshold: string;
  }>;
}

export const playbookTemplates: PlaybookTemplate[] = [
  // =============================================
  // 1. FREELANCER IT-DIENSTLEISTUNG
  // =============================================
  {
    id: 'freelancer-it',
    name: 'Freelancer IT-Dienstleistung',
    description: 'Für IT-Freelancer die Projektverträge von Kunden prüfen',
    icon: 'Code',
    contractType: 'Dienstleistungsvertrag',
    role: 'auftragnehmer',
    industry: 'it_software',
    rules: [
      {
        title: 'Zahlungsfrist max. 30 Tage',
        description: 'Zahlung muss innerhalb von 30 Tagen nach Rechnungsstellung erfolgen.',
        category: 'zahlung',
        priority: 'muss',
        threshold: 'max. 30 Tage'
      },
      {
        title: 'Stundensatz klar definiert',
        description: 'Der Stundensatz oder Tagessatz muss eindeutig im Vertrag festgelegt sein.',
        category: 'zahlung',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Haftung auf Auftragswert begrenzt',
        description: 'Die Gesamthaftung darf den Netto-Auftragswert nicht übersteigen.',
        category: 'haftung',
        priority: 'muss',
        threshold: 'max. Auftragswert'
      },
      {
        title: 'Kündigungsfrist mindestens 14 Tage',
        description: 'Beide Seiten müssen eine Kündigungsfrist von mindestens 14 Tagen einhalten.',
        category: 'kuendigung',
        priority: 'soll',
        threshold: 'min. 14 Tage'
      },
      {
        title: 'Kein pauschales IP-Übertragung',
        description: 'Nutzungsrechte an erstelltem Code nur für den vereinbarten Zweck, keine pauschale Übertragung aller Rechte.',
        category: 'eigentum',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Nachbesserungsrecht vor Minderung',
        description: 'Dem Freelancer müssen mindestens 2 Nachbesserungsversuche eingeräumt werden.',
        category: 'gewaehrleistung',
        priority: 'soll',
        threshold: 'min. 2 Versuche'
      },
      {
        title: 'Scheinselbständigkeit ausgeschlossen',
        description: 'Vertrag muss Weisungsfreiheit, eigene Arbeitsmittel und keine Eingliederung klar regeln.',
        category: 'sonstiges',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Vertraulichkeitsklausel angemessen',
        description: 'Geheimhaltungspflicht muss zeitlich begrenzt sein (max. 2 Jahre nach Vertragsende).',
        category: 'vertraulichkeit',
        priority: 'soll',
        threshold: 'max. 2 Jahre'
      },
      {
        title: 'Wettbewerbsverbot begrenzt',
        description: 'Ein Wettbewerbsverbot darf max. 6 Monate gelten und muss vergütet werden.',
        category: 'sonstiges',
        priority: 'soll',
        threshold: 'max. 6 Monate'
      },
      {
        title: 'Abnahme durch Auftraggeber',
        description: 'Auftraggeber muss Leistungen innerhalb von 14 Tagen abnehmen oder Mängel rügen.',
        category: 'abnahme',
        priority: 'soll',
        threshold: 'max. 14 Tage'
      }
    ]
  },

  // =============================================
  // 2. VERMIETER WOHNIMMOBILIE
  // =============================================
  {
    id: 'vermieter-wohnung',
    name: 'Vermieter Wohnimmobilie',
    description: 'Für Vermieter die Mietverträge prüfen',
    icon: 'Home',
    contractType: 'Mietvertrag',
    role: 'auftraggeber',
    industry: 'immobilien',
    rules: [
      {
        title: 'Kaution max. 3 Monatsmieten',
        description: 'Kaution darf gesetzlich 3 Nettokaltmieten nicht überschreiten (§ 551 BGB).',
        category: 'zahlung',
        priority: 'muss',
        threshold: 'max. 3 Nettokaltmieten'
      },
      {
        title: 'Kündigungsfrist korrekt',
        description: 'Gesetzliche Kündigungsfristen nach § 573c BGB müssen eingehalten werden.',
        category: 'kuendigung',
        priority: 'muss',
        threshold: 'nach § 573c BGB'
      },
      {
        title: 'Schönheitsreparaturen klar geregelt',
        description: 'Klausel zu Schönheitsreparaturen muss wirksam formuliert sein (keine starren Fristen).',
        category: 'gewaehrleistung',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Nebenkostenabrechnung definiert',
        description: 'Umlagefähige Nebenkosten müssen einzeln aufgelistet sein (§ 556 BGB).',
        category: 'zahlung',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Mieterhöhung geregelt',
        description: 'Regelung zur Mietanpassung (Staffelmiete, Indexmiete oder ortsübliche Vergleichsmiete).',
        category: 'laufzeit',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Untervermietung geregelt',
        description: 'Klare Regelung ob und unter welchen Bedingungen Untervermietung erlaubt ist.',
        category: 'sonstiges',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Haustierhaltung geregelt',
        description: 'Pauschales Haustierverbot ist unwirksam — Regelung muss differenziert sein.',
        category: 'sonstiges',
        priority: 'kann',
        threshold: ''
      },
      {
        title: 'Schriftformklausel vorhanden',
        description: 'Vertragsänderungen müssen schriftlich erfolgen.',
        category: 'formvorschriften',
        priority: 'soll',
        threshold: ''
      }
    ]
  },

  // =============================================
  // 3. LIEFERANTEN B2B
  // =============================================
  {
    id: 'lieferanten-b2b',
    name: 'Lieferanten B2B',
    description: 'Für Unternehmen die Lieferantenverträge prüfen',
    icon: 'Truck',
    contractType: 'Liefervertrag',
    role: 'auftraggeber',
    industry: 'handel',
    rules: [
      {
        title: 'Liefertermine verbindlich',
        description: 'Liefertermine müssen als Fixtermine vereinbart sein, nicht als "voraussichtlich".',
        category: 'abnahme',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Vertragsstrafe bei Verzug max. 5%',
        description: 'Vertragsstrafe bei Lieferverzug darf 5% des Auftragswerts nicht überschreiten.',
        category: 'vertragsstrafe',
        priority: 'soll',
        threshold: 'max. 5%'
      },
      {
        title: 'Gewährleistungsfrist min. 12 Monate',
        description: 'Gewährleistung muss mindestens 12 Monate ab Lieferung gelten.',
        category: 'gewaehrleistung',
        priority: 'muss',
        threshold: 'min. 12 Monate'
      },
      {
        title: 'Qualitätsstandards definiert',
        description: 'Spezifikationen, Normen oder Qualitätsstandards müssen klar referenziert werden.',
        category: 'sonstiges',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Preisanpassungsklausel transparent',
        description: 'Preiserhöhungen nur mit Vorankündigung und nachvollziehbarer Begründung.',
        category: 'zahlung',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Force Majeure Klausel',
        description: 'Höhere Gewalt muss klar definiert sein mit Pflichten beider Seiten.',
        category: 'force_majeure',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Haftungsbegrenzung vorhanden',
        description: 'Haftung muss auf den Auftragswert oder eine angemessene Summe begrenzt sein.',
        category: 'haftung',
        priority: 'muss',
        threshold: 'max. Auftragswert'
      },
      {
        title: 'Zahlungsfrist max. 30 Tage',
        description: 'Zahlung innerhalb von 30 Tagen nach Rechnungsstellung.',
        category: 'zahlung',
        priority: 'soll',
        threshold: 'max. 30 Tage'
      },
      {
        title: 'Eigentumsvorbehalt',
        description: 'Eigentum an gelieferter Ware muss bis zur vollständigen Bezahlung vorbehalten bleiben.',
        category: 'eigentum',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Gerichtsstand vereinbart',
        description: 'Gerichtsstand muss klar vereinbart sein (idealerweise am eigenen Sitz).',
        category: 'gerichtsstand',
        priority: 'kann',
        threshold: ''
      }
    ]
  },

  // =============================================
  // 4. DSGVO COMPLIANCE
  // =============================================
  {
    id: 'dsgvo-compliance',
    name: 'DSGVO Compliance',
    description: 'Datenschutz-Anforderungen für jeden Vertrag mit personenbezogenen Daten',
    icon: 'ShieldCheck',
    contractType: 'Auftragsverarbeitung (AVV)',
    role: 'neutral',
    industry: 'allgemein',
    rules: [
      {
        title: 'AVV vorhanden',
        description: 'Auftragsverarbeitungsvertrag nach Art. 28 DSGVO muss vorliegen.',
        category: 'datenschutz',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Technische und organisatorische Maßnahmen',
        description: 'TOM müssen konkret beschrieben sein (Verschlüsselung, Zugriffskontrolle, etc.).',
        category: 'datenschutz',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Unterauftragnehmer genehmigungspflichtig',
        description: 'Einsatz von Sub-Auftragsverarbeitern nur mit vorheriger Genehmigung.',
        category: 'datenschutz',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Löschfristen definiert',
        description: 'Fristen für Datenlöschung nach Vertragsende müssen klar festgelegt sein.',
        category: 'datenschutz',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Meldepflicht bei Datenpannen',
        description: 'Auftragnehmer muss Datenpannen unverzüglich (max. 72h) melden.',
        category: 'datenschutz',
        priority: 'muss',
        threshold: 'max. 72 Stunden'
      },
      {
        title: 'Weisungsgebundenheit',
        description: 'Auftragnehmer darf Daten nur auf dokumentierte Weisung des Auftraggebers verarbeiten.',
        category: 'datenschutz',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Audit-Recht des Auftraggebers',
        description: 'Auftraggeber muss Kontrollrecht haben (Vor-Ort oder Zertifikate).',
        category: 'datenschutz',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Datenübermittlung in Drittländer',
        description: 'Bei Transfer außerhalb EU/EWR müssen Standardvertragsklauseln oder Angemessenheitsbeschluss vorliegen.',
        category: 'datenschutz',
        priority: 'muss',
        threshold: ''
      }
    ]
  },

  // =============================================
  // 5. ARBEITSVERTRAG
  // =============================================
  {
    id: 'arbeitsvertrag',
    name: 'Arbeitsvertrag prüfen',
    description: 'Für Arbeitgeber die Arbeitsverträge auf Konformität prüfen',
    icon: 'Users',
    contractType: 'Arbeitsvertrag',
    role: 'auftraggeber',
    industry: 'allgemein',
    rules: [
      {
        title: 'Probezeit max. 6 Monate',
        description: 'Probezeit darf gesetzlich 6 Monate nicht überschreiten (§ 622 BGB).',
        category: 'laufzeit',
        priority: 'muss',
        threshold: 'max. 6 Monate'
      },
      {
        title: 'Kündigungsfrist gesetzeskonform',
        description: 'Kündigungsfristen müssen § 622 BGB entsprechen (gestaffelt nach Betriebszugehörigkeit).',
        category: 'kuendigung',
        priority: 'muss',
        threshold: 'nach § 622 BGB'
      },
      {
        title: 'Arbeitszeit klar definiert',
        description: 'Wöchentliche Arbeitszeit und Überstundenregelung müssen festgelegt sein.',
        category: 'sonstiges',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Vergütung und Zulagen definiert',
        description: 'Bruttogehalt, Sonderzahlungen und variable Vergütung müssen klar geregelt sein.',
        category: 'zahlung',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Urlaubsanspruch min. 20 Tage',
        description: 'Gesetzlicher Mindesturlaub bei 5-Tage-Woche: 20 Arbeitstage (BUrlG).',
        category: 'sonstiges',
        priority: 'muss',
        threshold: 'min. 20 Tage'
      },
      {
        title: 'Tätigkeitsbeschreibung vorhanden',
        description: 'Aufgaben und Verantwortlichkeiten müssen beschrieben sein.',
        category: 'sonstiges',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Wettbewerbsverbot mit Karenzentschädigung',
        description: 'Nachvertragliches Wettbewerbsverbot nur mit Karenzentschädigung von min. 50% des letzten Gehalts.',
        category: 'sonstiges',
        priority: 'soll',
        threshold: 'min. 50% Gehalt'
      },
      {
        title: 'Vertraulichkeitsklausel',
        description: 'Geheimhaltungspflicht für Geschäftsgeheimnisse muss geregelt sein.',
        category: 'vertraulichkeit',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Nebentätigkeit geregelt',
        description: 'Regelung ob und unter welchen Bedingungen Nebentätigkeiten erlaubt sind.',
        category: 'sonstiges',
        priority: 'kann',
        threshold: ''
      },
      {
        title: 'Schriftformklausel',
        description: 'Vertragsänderungen nur in Schriftform gültig.',
        category: 'formvorschriften',
        priority: 'soll',
        threshold: ''
      }
    ]
  },

  // =============================================
  // 6. NDA / GEHEIMHALTUNG
  // =============================================
  {
    id: 'nda-geheimhaltung',
    name: 'NDA / Geheimhaltung',
    description: 'Geheimhaltungsvereinbarungen auf Vollständigkeit und Fairness prüfen',
    icon: 'Lock',
    contractType: 'NDA / Geheimhaltung',
    role: 'neutral',
    industry: 'allgemein',
    rules: [
      {
        title: 'Definition vertraulicher Informationen',
        description: 'Was als "vertraulich" gilt muss klar und abschließend definiert sein.',
        category: 'vertraulichkeit',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Ausnahmen definiert',
        description: 'Standardausnahmen müssen enthalten sein (öffentlich bekannt, eigenständig entwickelt, gesetzliche Pflicht).',
        category: 'vertraulichkeit',
        priority: 'muss',
        threshold: ''
      },
      {
        title: 'Laufzeit begrenzt',
        description: 'Geheimhaltungspflicht muss zeitlich begrenzt sein.',
        category: 'laufzeit',
        priority: 'soll',
        threshold: 'max. 3-5 Jahre'
      },
      {
        title: 'Rückgabepflicht bei Vertragsende',
        description: 'Vertrauliche Unterlagen müssen bei Vertragsende zurückgegeben oder vernichtet werden.',
        category: 'vertraulichkeit',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Vertragsstrafe angemessen',
        description: 'Falls eine Vertragsstrafe vereinbart ist, muss sie verhältnismäßig sein.',
        category: 'vertragsstrafe',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Gegenseitigkeit (beidseitig)',
        description: 'NDA sollte für beide Seiten gelten, nicht nur einseitig.',
        category: 'sonstiges',
        priority: 'soll',
        threshold: ''
      },
      {
        title: 'Gerichtsstand und anwendbares Recht',
        description: 'Gerichtsstand und anwendbares Recht müssen klar vereinbart sein.',
        category: 'gerichtsstand',
        priority: 'kann',
        threshold: ''
      },
      {
        title: 'Weitergabe an Dritte geregelt',
        description: 'Ob und unter welchen Bedingungen Informationen an Dritte weitergegeben werden dürfen.',
        category: 'vertraulichkeit',
        priority: 'soll',
        threshold: ''
      }
    ]
  }
];

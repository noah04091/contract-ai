// 📁 backend/data/legalReferencesSupplemental.js
//
// Supplemental Legal References — wird NUR vom /api/legal-references/slug-map
// Endpoint genutzt, um die Frontend-Pillen-Map zu erweitern.
//
// KRITISCH (Häppchen 3.4 Phase 2, 15.05.2026):
// Diese Datei wird NICHT in Legal Pulse / GesetzImInternetConnector eingebunden.
// Beide Maps (conceptMappings, lawInfo) im Singleton sind frozen-by-convention
// und werden hier IMMUTABLE belassen. Die Supplemental-Einträge werden nur
// READ-ONLY im Slug-Map-Endpoint mit den Singleton-Maps gemergt.
//
// Architektur-Why: Direkte Erweiterung der Singleton-Maps wäre riskant, weil
// Legal Pulse über diese iteriert und neue Einträge unerwartetes Verhalten
// erzeugen könnten. Supplemental ist die saubere additive Lösung — Legal Pulse
// sieht das nie, Frontend bekommt eine vereinte Map.
//
// Anti-Halluzination:
// - Einträge ohne urlTemplate → Frontend rendert Plain-Text statt Pille
// - URL-Template kann den {paragraph}-Platzhalter enthalten oder nicht
//   (manche EU-Verordnungen sind nicht artikel-deep-linkbar → Root-URL ok)

module.exports = {
  // ═══════════════════════════════════════════════════════════════════════
  // CONCEPT-MAPPINGS (additiv zur Singleton-Map)
  // ═══════════════════════════════════════════════════════════════════════
  // Format: 'konzept' → ['slug', 'slug', ...]
  conceptMappings: {
    // ─── DSGVO-Korrektur: zeigt jetzt auf eigenen DSGVO-Slug,
    //     nicht mehr fälschlich auf bdsg_2018 (Begleitgesetz statt EU-Verordnung).
    //     Der bdsg_2018-Eintrag in der Singleton-Map bleibt für deutsches BDSG.
    'dsgvo': ['dsgvo', 'bdsg_2018'],
    'datenschutzgrundverordnung': ['dsgvo'],
    'datenschutz-grundverordnung': ['dsgvo'],
    'auftragsverarbeitung': ['dsgvo'],
    'auftragsverarbeitungsvertrag': ['dsgvo'],
    'av-vertrag': ['dsgvo'],
    'datenverarbeitung': ['dsgvo', 'bdsg_2018'],

    // ─── EU AI Act (KI-Verordnung 2024/1689)
    'ai act': ['ai_act'],
    'ki-verordnung': ['ai_act'],
    'künstliche intelligenz': ['ai_act'],
    'ki-system': ['ai_act'],

    // ─── eIDAS (Elektronische Signatur)
    'eidas': ['eidas'],
    'elektronische signatur': ['eidas'],
    'qualifizierte signatur': ['eidas'],
    'vertrauensdienst': ['eidas'],

    // ─── Medizinprodukte
    'medizinprodukt': ['mdr'],
    'medizinprodukte': ['mdr'],

    // ─── IDD Versicherungsvertrieb
    'versicherungsvertrieb': ['idd', 'vvg_2008'],
    'versicherungsvermittler': ['idd'],

    // ─── MiCA Krypto
    'krypto': ['mica'],
    'kryptowerte': ['mica'],
    'kryptoasset': ['mica'],

    // ─── DSA / DMA
    'digital services act': ['dsa'],
    'digital markets act': ['dma'],
    'plattformhaftung': ['dsa'],
    'gatekeeper': ['dma'],

    // ─── Bauvertragsrecht (VOB ergänzt das BGB)
    'bauvertrag': ['vob_b', 'bgb'],
    'bauleistung': ['vob_b', 'vob_a'],
    'vob': ['vob_b', 'vob_a'],
    'öffentliche bauvergabe': ['vob_a'],

    // ─── Architekten- und Ingenieurhonorar
    'architektenhonorar': ['hoai'],
    'hoai': ['hoai'],
    'ingenieurhonorar': ['hoai'],

    // ─── Maklerrecht
    'maklerprovision': ['mabv', 'bgb'],
    'bauträger': ['mabv'],

    // ─── Wohnraumförderung
    'wohnraumförderung': ['wofg'],
    'sozialwohnung': ['wofg'],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LAW INFO (additiv — vereint mit Singleton im Endpoint)
  // ═══════════════════════════════════════════════════════════════════════
  // Felder pro Eintrag:
  //   title: string                — Volltitel
  //   abbreviation: string         — Wie es im Text vorkommt (BGB, DSGVO, ...)
  //   area: string                 — Rechtsgebiet
  //   urlTemplate: string          — Optional. Mit/ohne {paragraph}-Platzhalter.
  //                                   Wenn fehlt → Frontend rendert Plain-Text statt Pille.
  //   urlScheme: 'paragraph'|'article' — Optional. Welches Symbol erwartet wird
  //                                   im Quell-Text (default: 'paragraph' = §).
  lawInfo: {
    // ═══ EU-Verordnungen ═══════════════════════════════════════════════
    // DSGVO: deep-linkbar via dsgvo-gesetz.de (deutsche Übersetzung + Volltexte)
    'dsgvo': {
      title: 'Datenschutz-Grundverordnung',
      abbreviation: 'DSGVO',
      area: 'Datenschutz (EU)',
      urlTemplate: 'https://dsgvo-gesetz.de/art-{paragraph}-dsgvo/',
      urlScheme: 'article',
    },
    // EU AI Act: kein zuverlässiges Article-Deep-Link-Schema → Root-URL
    'ai_act': {
      title: 'Verordnung über Künstliche Intelligenz (EU AI Act)',
      abbreviation: 'KI-VO',
      area: 'KI-Recht (EU)',
      urlTemplate: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R1689',
      urlScheme: 'article',
    },
    'eidas': {
      title: 'eIDAS-Verordnung (Elektronische Identifizierung)',
      abbreviation: 'eIDAS',
      area: 'IT-Recht (EU)',
      urlTemplate: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32014R0910',
      urlScheme: 'article',
    },
    'mdr': {
      title: 'EU-Medizinprodukte-Verordnung',
      abbreviation: 'MDR',
      area: 'Medizinrecht (EU)',
      urlTemplate: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32017R0745',
      urlScheme: 'article',
    },
    'idd': {
      title: 'Versicherungsvertriebs-Richtlinie',
      abbreviation: 'IDD',
      area: 'Versicherungsrecht (EU)',
      urlTemplate: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016L0097',
      urlScheme: 'article',
    },
    'mica': {
      title: 'Markets in Crypto-Assets Regulation',
      abbreviation: 'MiCA',
      area: 'Finanzrecht (EU)',
      urlTemplate: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32023R1114',
      urlScheme: 'article',
    },
    'dsa': {
      title: 'Digital Services Act',
      abbreviation: 'DSA',
      area: 'IT-Recht (EU)',
      urlTemplate: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32022R2065',
      urlScheme: 'article',
    },
    'dma': {
      title: 'Digital Markets Act',
      abbreviation: 'DMA',
      area: 'Wettbewerbsrecht (EU)',
      urlTemplate: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32022R1925',
      urlScheme: 'article',
    },

    // ═══ Deutsche Spezialgesetze ═══════════════════════════════════════
    // VOB/A + VOB/B: nicht auf gesetze-im-internet.de → keine direkte URL.
    // Pille würde Plain-Text, aber Mapping signalisiert dem Frontend dass das
    // Werk anerkannt ist (kein „unbekanntes Werk"-Verhalten).
    'vob_a': {
      title: 'Vergabe- und Vertragsordnung für Bauleistungen Teil A',
      abbreviation: 'VOB/A',
      area: 'Baurecht',
    },
    'vob_b': {
      title: 'Vergabe- und Vertragsordnung für Bauleistungen Teil B',
      abbreviation: 'VOB/B',
      area: 'Baurecht',
    },
    'hoai': {
      title: 'Honorarordnung für Architekten und Ingenieure',
      abbreviation: 'HOAI',
      area: 'Bau-/Architektenrecht',
      urlTemplate: 'https://www.gesetze-im-internet.de/hoai_2021/__{paragraph}.html',
      urlScheme: 'paragraph',
    },
    'mabv': {
      title: 'Makler- und Bauträgerverordnung',
      abbreviation: 'MaBV',
      area: 'Maklerrecht',
      urlTemplate: 'https://www.gesetze-im-internet.de/mabv/__{paragraph}.html',
      urlScheme: 'paragraph',
    },
    'wofg': {
      title: 'Wohnraumförderungsgesetz',
      abbreviation: 'WoFG',
      area: 'Wohnrecht',
      urlTemplate: 'https://www.gesetze-im-internet.de/wofg/__{paragraph}.html',
      urlScheme: 'paragraph',
    },
  },
};

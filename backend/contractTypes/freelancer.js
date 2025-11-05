// 💼 Freelancer/Dienstleistungsvertrag (DE, BGB/UrhG) - Vertragstyp-Modul für V2 Meta-Prompt System
// Definiert Rollen, Pflicht-Klauseln und verbotene Themen für Freelancer-Verträge

module.exports = {
  // Korrekte Rollenbezeichnungen (case-sensitive!)
  roles: {
    A: "Auftraggeber",
    B: "Auftragnehmer"
  },

  // Qualitäts-Threshold für Hybrid Score (0-1)
  qualityThreshold: 0.93,

  // Pflicht-Paragraphen (Must-Clauses) nach BGB Dienstvertragsrecht + UrhG
  mustClauses: [
    "§ 1 Vertragsgegenstand und Leistungsbeschreibung",
    "§ 2 Vergütung und Spesen",
    "§ 3 Nutzungsrechte und geistiges Eigentum",
    "§ 4 Leistungserbringung und Abnahme",
    "§ 5 Verzug und Fristversäumnisse",
    "§ 6 Vertraulichkeit",
    "§ 7 Datenschutz",
    "§ 8 Subunternehmer und Hilfspersonen",
    "§ 9 Gewährleistung",
    "§ 10 Haftung und Haftungsbeschränkung",
    "§ 11 Laufzeit und Kündigung",
    "§ 12 Streitbeilegung und Gerichtsstand",
    "§ 13 Schlussbestimmungen"
  ],

  // Verbotene Themen (wenn nicht explizit im Input genannt)
  forbiddenTopics: [
    "Urlaub",
    "Urlaubsanspruch",
    "Krankheit",
    "Krankengeld",
    "Sozialversicherung",
    "Betriebsrente",
    "Altersvorsorge",
    "Arbeitszeit",
    "Überstunden",
    "Arbeitszeiterfassung",
    "Weisungsgebundenheit",
    "Arbeitgebereigenschaft",
    "Scheinselbständigkeit"
  ],

  // Rechtliche Besonderheiten und Hinweise
  notes: "Rechtsbasis: BGB §§ 611 ff. (Dienstvertrag), UrhG §§ 31 ff. (Nutzungsrechte). Besondere Stolpersteine: Abgrenzung zur Scheinselbständigkeit (keine Weisungsgebundenheit!), Nutzungsrechte-Übertragung explizit regeln, DSGVO-Konformität bei personenbezogenen Daten, Haftung auf Auftragswert begrenzen."
};

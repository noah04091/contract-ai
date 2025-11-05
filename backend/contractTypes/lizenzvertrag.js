// 📜 Lizenzvertrag (DE, UrhG) - Vertragstyp-Modul für V2 Meta-Prompt System
// Definiert Rollen, Pflicht-Klauseln und verbotene Themen für Lizenzverträge

module.exports = {
  // Korrekte Rollenbezeichnungen (case-sensitive!)
  roles: {
    A: "Lizenzgeber",
    B: "Lizenznehmer"
  },

  // Qualitäts-Threshold für Hybrid Score (0-1)
  qualityThreshold: 0.93,

  // Pflicht-Paragraphen (Must-Clauses) nach UrhG
  mustClauses: [
    "§ 1 Vertragsgegenstand und Lizenzumfang",
    "§ 2 Art der Nutzungsrechte",
    "§ 3 Umfang der Nutzungsrechte",
    "§ 4 Lizenzgebühr und Zahlungsmodalitäten",
    "§ 5 Laufzeit und Kündigung",
    "§ 6 Gewährleistung und Haftung",
    "§ 7 Schutzrechte und Rechtsmängel",
    "§ 8 Vertraulichkeit",
    "§ 9 Vertragsstrafe",
    "§ 10 Schlussbestimmungen"
  ],

  // Verbotene Themen (wenn nicht explizit im Input genannt)
  forbiddenTopics: [
    "Quellcode",
    "Source Code",
    "Weiterentwicklung",
    "Modifikation",
    "Reverse Engineering",
    "Dekompilierung",
    "Sublizenzierung",
    "Weiterlizenzierung",
    "Übertragung",
    "Abtretung"
  ],

  // Rechtliche Besonderheiten und Hinweise
  notes: "Rechtsbasis: UrhG §§ 31 ff. (Nutzungsrechte). Besondere Stolpersteine: Unterscheidung zwischen einfachen und ausschließlichen Nutzungsrechten, räumliche/zeitliche/inhaltliche Begrenzung klar definieren, bei Software-Lizenzen: SaaS vs. On-Premise unterscheiden, Urhebernennung regeln, Sublizenzierung explizit erlauben oder verbieten."
};

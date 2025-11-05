// 🔨 Werkvertrag (DE, BGB) - Vertragstyp-Modul für V2 Meta-Prompt System
// Definiert Rollen, Pflicht-Klauseln und verbotene Themen für Werkverträge

module.exports = {
  // Korrekte Rollenbezeichnungen (case-sensitive!)
  roles: {
    A: "Besteller",
    B: "Unternehmer"
  },

  // Qualitäts-Threshold für Hybrid Score (0-1)
  qualityThreshold: 0.93,

  // Pflicht-Paragraphen (Must-Clauses) nach BGB Werkvertragsrecht
  mustClauses: [
    "§ 1 Vertragsgegenstand und Leistungsbeschreibung",
    "§ 2 Vergütung",
    "§ 3 Zahlungsbedingungen",
    "§ 4 Leistungszeit und Fertigstellung",
    "§ 5 Abnahme",
    "§ 6 Gewährleistung und Mängelhaftung",
    "§ 7 Haftung",
    "§ 8 Kündigung",
    "§ 9 Gerichtsstand und anwendbares Recht",
    "§ 10 Schlussbestimmungen"
  ],

  // Verbotene Themen (wenn nicht explizit im Input genannt)
  forbiddenTopics: [
    "Versicherung",
    "Berufs haftpflicht",
    "Subunternehmer",
    "Nachunternehmer",
    "Materialkosten",
    "Mehrkosten",
    "Sicherheitsleistung",
    "Bürgschaft",
    "Architektenvertrag",
    "Bauüberwachung"
  ],

  // Rechtliche Besonderheiten und Hinweise
  notes: "Rechtsbasis: BGB §§ 631 ff. (Werkvertrag). Besondere Stolpersteine: Werkvertrag ist erfolgsabhängig (im Gegensatz zu Dienstvertrag!), Abnahme ist entscheidend für Gefahrübergang und Gewährleistungsbeginn, Mängelrechte des Bestellers (Nacherfüllung, Minderung, Rücktritt, Schadensersatz), Vergütung erst nach Abnahme fällig."
};

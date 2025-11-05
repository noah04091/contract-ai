// 🛒 Kaufvertrag (DE, BGB) - Vertragstyp-Modul für V2 Meta-Prompt System
// Definiert Rollen, Pflicht-Klauseln und verbotene Themen für Kaufverträge

module.exports = {
  // Korrekte Rollenbezeichnungen (case-sensitive!)
  roles: {
    A: "Verkäufer",
    B: "Käufer"
  },

  // Pflicht-Paragraphen (Must-Clauses) nach BGB Kaufrecht
  mustClauses: [
    "§ 1 Vertragsgegenstand",
    "§ 2 Kaufpreis",
    "§ 3 Zahlung und Zahlungsbedingungen",
    "§ 4 Lieferung und Übergabe",
    "§ 5 Eigentumsvorbehalt",
    "§ 6 Gefahrübergang",
    "§ 7 Gewährleistung und Mängelhaftung",
    "§ 8 Haftung und Haftungsbeschränkung",
    "§ 9 Vertragsstrafe bei Verzug",
    "§ 10 Erfüllungsort und Gerichtsstand",
    "§ 11 Schlussbestimmungen"
  ],

  // Verbotene Themen (wenn nicht explizit im Input genannt)
  forbiddenTopics: [
    "Ratenzahlung",
    "Teilzahlung",
    "Finanzierung",
    "Leasing",
    "Miete",
    "Rückgaberecht",
    "Widerrufsrecht",
    "Garantieverlängerung",
    "Zusatzgarantie",
    "Montage",
    "Installation",
    "Einweisung",
    "Schulung",
    "Wartung",
    "Service"
  ],

  // Rechtliche Besonderheiten und Hinweise
  notes: "Rechtsbasis: BGB §§ 433 ff. (Kaufrecht). Besondere Stolpersteine: Eigentumsvorbehalt bis zur vollständigen Zahlung (§ 449 BGB), Gefahrübergang bei Übergabe (§ 446 BGB), Gewährleistungsfristen (§ 438 BGB: 2 Jahre bei beweglichen Sachen), Verzugszinsen (§ 288 BGB: 9% über Basiszinssatz bei B2B)."
};

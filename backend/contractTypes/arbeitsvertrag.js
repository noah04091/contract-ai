// 💼 Arbeitsvertrag (DE, BGB) - Vertragstyp-Modul für V2 Meta-Prompt System
// Definiert Rollen, Pflicht-Klauseln und verbotene Themen für Arbeitsverträge

module.exports = {
  // Korrekte Rollenbezeichnungen (case-sensitive!)
  roles: {
    A: "Arbeitgeber",
    B: "Arbeitnehmer"
  },

  // Qualitäts-Threshold für Hybrid Score (0-1)
  qualityThreshold: 0.93,

  // Pflicht-Paragraphen (Must-Clauses) nach BGB Arbeitsrecht
  mustClauses: [
    "§ 1 Beginn des Arbeitsverhältnisses",
    "§ 2 Tätigkeitsbeschreibung",
    "§ 3 Vergütung",
    "§ 4 Arbeitszeit",
    "§ 5 Urlaub",
    "§ 6 Krankheit",
    "§ 7 Nebentätigkeiten",
    "§ 8 Verschwiegenheit und Datenschutz",
    "§ 9 Beendigung des Arbeitsverhältnisses",
    "§ 10 Schlussbestimmungen"
  ],

  // Verbotene Themen (wenn nicht explizit im Input genannt)
  forbiddenTopics: [
    "Firmenwagen",
    "Dienstwagen",
    "Homeoffice",
    "Mobile Arbeit",
    "Telearbeit",
    "Fortbildung",
    "Weiterbildung",
    "Betriebsrente",
    "Altersvorsorge",
    "Erfolgsbeteiligung",
    "Gewinnbeteiligung",
    "Aktienoptionen"
  ],

  // Rechtliche Besonderheiten und Hinweise
  notes: "Rechtsbasis: BGB §§ 611 ff. (Arbeitsvertrag). Besondere Stolpersteine: Nachweisgesetz (§ 2 NachwG) erfordert schriftliche Dokumentation wesentlicher Arbeitsbedingungen, gesetzlicher Mindestlohn beachten, Arbeitszeitgesetz (ArbZG) einhalten, betriebliche Mitbestimmung (BetrVG) berücksichtigen."
};

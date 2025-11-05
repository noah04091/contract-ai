// 🤐 NDA/Geheimhaltungsvereinbarung (DE, BGB) - Vertragstyp-Modul für V2 Meta-Prompt System
// Definiert Rollen, Pflicht-Klauseln und verbotene Themen für NDAs

module.exports = {
  // Korrekte Rollenbezeichnungen (case-sensitive!)
  roles: {
    A: "Offenlegende Partei",
    B: "Empfangende Partei"
  },

  // Qualitäts-Threshold für Hybrid Score (0-1)
  qualityThreshold: 0.93,

  // Pflicht-Paragraphen (Must-Clauses) für NDAs
  mustClauses: [
    "§ 1 Vertragsgegenstand und Zweck",
    "§ 2 Vertrauliche Informationen",
    "§ 3 Pflichten der empfangenden Partei",
    "§ 4 Ausnahmen von der Vertraulichkeit",
    "§ 5 Dauer der Geheimhaltung",
    "§ 6 Rückgabe und Vernichtung",
    "§ 7 Vertragsstrafe",
    "§ 8 Laufzeit und Kündigung",
    "§ 9 Schlussbestimmungen"
  ],

  // Verbotene Themen (wenn nicht explizit im Input genannt)
  forbiddenTopics: [
    "Wettbewerbsverbot",
    "Non-Compete",
    "Lizenzierung",
    "Patente",
    "Markenrechte",
    "Exklusivität",
    "Vergütung",
    "Entschädigung"
  ],

  // Rechtliche Besonderheiten und Hinweise
  notes: "Rechtsbasis: BGB §§ 241 ff. (Schuldverhältnis), ggf. GeschGehG (Geschäftsgeheimnisgesetz). Besondere Stolpersteine: Definition vertraulicher Informationen muss präzise sein, Laufzeit der Geheimhaltungspflicht klar definieren (üblicherweise 2-5 Jahre nach Vertragsende), Vertragsstrafe muss angemessen sein, beidseitige vs. einseitige NDA unterscheiden."
};

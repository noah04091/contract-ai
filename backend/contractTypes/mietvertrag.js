// 🏠 Mietvertrag (DE, BGB) - Vertragstyp-Modul für V2 Meta-Prompt System
// Definiert Rollen, Pflicht-Klauseln und verbotene Themen für Mietverträge

module.exports = {
  // Korrekte Rollenbezeichnungen (case-sensitive!)
  roles: {
    A: "Vermieter",
    B: "Mieter"
  },

  // Qualitäts-Threshold für Hybrid Score (0-1)
  qualityThreshold: 0.93,

  // Pflicht-Paragraphen (Must-Clauses) nach BGB Mietrecht
  mustClauses: [
    "§ 1 Mietgegenstand",
    "§ 2 Mietzeit",
    "§ 3 Miete und Nebenkosten",
    "§ 4 Kaution",
    "§ 5 Gebrauch der Mietsache",
    "§ 6 Instandhaltung und Instandsetzung",
    "§ 7 Untervermietung",
    "§ 8 Schönheitsreparaturen",
    "§ 9 Kündigung",
    "§ 10 Rückgabe der Mietsache",
    "§ 11 Schlussbestimmungen"
  ],

  // Verbotene Themen (wenn nicht explizit im Input genannt)
  // Diese dürfen NICHT erfunden werden!
  forbiddenTopics: [
    "Garten",
    "Haustiere",
    "Balkon",
    "Terrasse",
    "Stellplatz",
    "Parkplatz",
    "Einbauten",
    "Einbauküche",
    "Möblierung"
  ],

  // Synonyme für verbotene Themen (Format: "topic1|synonym1|synonym2")
  // Wenn EINES der Synonyme erwähnt wird, gilt das Topic als erlaubt
  forbiddenSynonyms: [
    "Garten|Gartennutzung|Gartenfläche|Gartenpflege|Gartenanteil",
    "Haustiere|Tierhaltung|Haustier|Hund|Katze|Haustier erlaubt",
    "Balkon|Balkonnutzung|Balkonzugang",
    "Stellplatz|Parkplatz|Garagennutzung|Pkw-Stellplatz|Tiefgarage"
  ],

  // Rechtliche Besonderheiten und Hinweise
  notes: "Rechtsbasis: BGB §§ 535 ff. (Mietrecht). Besondere Stolpersteine: Schönheitsreparaturen (§ 8 nur wenn vertraglich vereinbart), Kaution max. 3 Kaltmieten (§ 551 BGB), Kündigungsfristen beachten (§ 573c BGB)."
};

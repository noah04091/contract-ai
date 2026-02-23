// 💼 Beratervertrag / Consulting (DE, BGB) - Vertragstyp-Modul für V2 Meta-Prompt System

module.exports = {
  roles: {
    A: "Auftraggeber",
    B: "Berater"
  },

  qualityThreshold: 0.93,

  mustClauses: [
    "§ 1 Beratungsgegenstand und Leistungsumfang",
    "§ 2 Pflichten des Beraters",
    "§ 3 Mitwirkungspflichten des Auftraggebers",
    "§ 4 Honorar und Vergütung",
    "§ 5 Zahlungsbedingungen und Abrechnung",
    "§ 6 Vertraulichkeit und Geheimhaltung",
    "§ 7 Geistiges Eigentum und Nutzungsrechte",
    "§ 8 Haftung und Haftungsbeschränkung",
    "§ 9 Laufzeit und Kündigung",
    "§ 10 Wettbewerbsverbot",
    "§ 11 Datenschutz",
    "§ 12 Gerichtsstand und anwendbares Recht",
    "§ 13 Schlussbestimmungen"
  ],

  forbiddenTopics: [
    "Weisungsgebundenheit",
    "Arbeitsverhältnis",
    "Sozialversicherung",
    "Urlaubsanspruch",
    "Krankengeld",
    "Kündigungsschutz",
    "Betriebsrat",
    "Tarifvertrag",
    "Firmenwagen"
  ],

  forbiddenSynonyms: [
    "Weisungsgebundenheit|Weisungsrecht|Direktionsrecht",
    "Arbeitsverhältnis|Angestelltenvertrag|Festanstellung",
    "Sozialversicherung|Sozialabgaben|Krankenversicherungspflicht"
  ],

  notes: "Rechtsbasis: BGB §§ 611 ff. (Dienstvertrag) — Beratervertrag ist ein freier Dienstvertrag, KEIN Arbeitsvertrag. Besondere Stolpersteine: Scheinselbständigkeits-Risiko (keine Weisungsgebundenheit, eigene Zeiteinteilung), Honorar ≠ Gehalt, Berater haftet für Beratungsfehler, Vertraulichkeit besonders bei Unternehmensdaten wichtig."
};

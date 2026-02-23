// 🤝 Kooperationsvertrag (DE, BGB) - Vertragstyp-Modul für V2 Meta-Prompt System

module.exports = {
  roles: {
    A: "Kooperationspartner A",
    B: "Kooperationspartner B"
  },

  qualityThreshold: 0.93,

  mustClauses: [
    "§ 1 Kooperationsgegenstand und Ziele",
    "§ 2 Rechte und Pflichten der Partner",
    "§ 3 Beiträge und Ressourcen",
    "§ 4 Finanzielle Regelungen und Kostenverteilung",
    "§ 5 Gewinn- und Verlustverteilung",
    "§ 6 Vertraulichkeit und Geheimhaltung",
    "§ 7 Geistiges Eigentum und Nutzungsrechte",
    "§ 8 Laufzeit und Kündigung",
    "§ 9 Haftung und Haftungsbeschränkung",
    "§ 10 Wettbewerbsverbot",
    "§ 11 Gerichtsstand und anwendbares Recht",
    "§ 12 Schlussbestimmungen"
  ],

  forbiddenTopics: [
    "Gesellschaftsgründung",
    "GmbH",
    "UG",
    "Stammkapital",
    "Handelsregister",
    "Notarielle Beurkundung",
    "Geschäftsführergehalt",
    "Firmenwagen",
    "Betriebsrente"
  ],

  forbiddenSynonyms: [
    "Gesellschaftsgründung|Firmengründung|Unternehmensgründung",
    "Handelsregister|HR-Eintragung|Registergericht"
  ],

  notes: "Rechtsbasis: BGB §§ 705 ff. (GbR-Recht als Auffangtatbestand für Kooperationen). Besondere Stolpersteine: Klare Abgrenzung zur GbR/Gesellschaftsvertrag, Haftungsregelung zwischen Partnern, IP-Rechte an gemeinsamen Ergebnissen, Wettbewerbsklausel nach Beendigung."
};

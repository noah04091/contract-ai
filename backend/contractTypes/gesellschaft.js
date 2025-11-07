// 🏢 Gesellschaftsvertrag (GbR/GmbH/UG) - V2 Meta-Prompt System

module.exports = {
  roles: {
    A: "Gesellschafter",
    B: "Gesellschafter"
    // Hinweis: Mehrpersonenfähig - Namen aus Input-Liste verwenden
  },

  qualityThreshold: 0.94,

  mustClauses: [
    "§ 1 Firma/Name und Sitz",
    "§ 2 Unternehmensgegenstand",
    "§ 3 Dauer/Gründung",
    "§ 4 Stammkapital/Einlagen/Einbringung",
    "§ 5 Geschäftsführung und Vertretung",
    "§ 6 Gewinn- und Verlustverteilung",
    "§ 7 Gesellschafterbeschlüsse",
    "§ 8 Übertragung von Anteilen/Vinkulierung",
    "§ 9 Ausscheiden/Kündigung/Abfindung",
    "§ 10 Wettbewerbsverbot/Vertraulichkeit",
    "§ 11 Schlussbestimmungen"
  ],

  forbiddenTopics: [
    "Notarielle Beurkundungstexte",
    "Handelsregistereintragungstermin",
    "Steuerberatung"
  ],

  forbiddenSynonyms: [
    "Notarielle Beurkundungstexte|Notarformel|Notarielle Unterschrift|Notariatsbestätigung",
    "Handelsregistereintragungstermin|HR-Eintragung garantiert|Eintragungszusage",
    "Steuerberatung|Steuerliche Bewertung|Steuersparmodell|Steueroptimierung garantiert"
  ],

  notes: `Rechtsbasis: BGB §§ 705 ff. (GbR), GmbHG, UmwG

PFLICHT-PARAGRAPHEN:
- Firmenname, Sitz und Rechtsform
- Unternehmensgegenstand (Geschäftszweck)
- Gründungsdatum und Dauer
- Stammkapital/Einlagen (bei GmbH/UG: Mindeststammkapital beachten!)
- Geschäftsführung und Vertretungsbefugnisse
- Gewinn-/Verlustverteilungsschlüssel
- Beschlussfassung und Mehrheitserfordernisse
- Vinkulierung (Übertragungsbeschränkungen für Anteile)
- Ausscheidensregelungen und Abfindung
- Wettbewerbsverbote für Gesellschafter
- Schlussbestimmungen

VERBOTENE THEMEN (nicht erfinden!):
- Keine notariellen Formulierungen/Beurkundungstexte
- Keine garantierten Handelsregistereintragungstermine
- Keine konkreten Steuerberatungsempfehlungen

MEHRPERSONENFÄHIG: Namen aller Gesellschafter aus Input verwenden!`
};

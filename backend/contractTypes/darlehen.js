// 💰 Darlehensvertrag - V2 Meta-Prompt System

module.exports = {
  roles: {
    A: "Darlehensgeber",
    B: "Darlehensnehmer"
  },

  qualityThreshold: 0.93,

  mustClauses: [
    "§ 1 Darlehenssumme und Auszahlung|Darlehensbetrag",
    "§ 2 Laufzeit und Fälligkeit|Rückzahlungsmodalitäten|Tilgung",
    "§ 3 Zinsen|Zinsregelung|Verzinsung|Zinsfreiheit",
    "§ 4 Sicherheiten|Sicherungsrechte",
    "§ 5 Vorzeitige Rückzahlung|Sondertilgung|Vorfälligkeitsentschädigung",
    "§ 6 Verzugszinsen und Kosten|Verzug und Folgen|Verzugsregelung",
    "§ 7 Kündigung|Kündigungsrechte",
    "§ 8 Informations- und Mitwirkungspflichten|Nebenpflichten",
    "§ 9 Abtretung und Aufrechnung|Übertragung",
    "§ 10 Schlussbestimmungen|Schlussklauseln"
  ],

  forbiddenTopics: [
    "Grundschuld",
    "Bürgschaft",
    "Lohnabtretung"
  ],

  forbiddenSynonyms: [
    "Grundschuld|Grundschuldbestellung|Grundpfandrecht",
    "Bürgschaft|Bürgschaftserklärung|Bürge",
    "Lohnabtretung|Gehaltsabtretung|Gehaltszession"
  ],

  notes: `Rechtsbasis: BGB §§ 488 ff. (Darlehensvertrag)

PFLICHT-PARAGRAPHEN:
- Darlehenssumme, Auszahlungsmodalitäten
- Zinssatz und Zinszahlungsweise
- Laufzeit und Fälligkeitstermin
- Rückzahlungsplan (Rate/Tilgung)
- Sondertilgungsrechte (falls vertraglich vereinbart)
- Sicherheiten (Grundschuld, Bürgschaft etc. nur wenn angegeben!)
- Verzugsfolgen
- Kündigungsrechte
- Kostenverteilung
- Schlussbestimmungen

VERBOTENE THEMEN (nicht erfinden, wenn nicht im Input angegeben):
- Grundschuld/Grundschuldbestellung
- Bürgschaften
- Lohnabtretungen

Nur explizit genannte Sicherheiten einbauen!`
};

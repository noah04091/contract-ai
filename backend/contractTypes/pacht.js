// 🌾 Pachtvertrag - V2 Meta-Prompt System

module.exports = {
  roles: {
    A: "Verpächter",
    B: "Pächter"
  },

  qualityThreshold: 0.94,

  mustClauses: [
    "§ 1 Pachtgegenstand und Umfang",
    "§ 2 Pachtzweck/Betriebspflichten",
    "§ 3 Pachtdauer",
    "§ 4 Pachtzins und Nebenkosten",
    "§ 5 Instandhaltung/Verkehrssicherungspflichten",
    "§ 6 Unterverpachtung/Überlassung",
    "§ 7 Nutzung von Inventar/Fruchtziehung",
    "§ 8 Rückgabezustand",
    "§ 9 Haftung/Versicherung",
    "§ 10 Kündigung",
    "§ 11 Schlussbestimmungen"
  ],

  forbiddenTopics: [
    "Vorkaufsrecht des Pächters",
    "Baugenehmigungen zugesichert"
  ],

  forbiddenSynonyms: [
    "Vorkaufsrecht des Pächters|Ankaufsrecht|Kaufoption automatisch",
    "Baugenehmigungen zugesichert|Baugenehmigung liegt vor|Bauantrag genehmigt"
  ],

  notes: `Rechtsbasis: BGB §§ 581 ff. (Pachtvertrag)

PFLICHT-PARAGRAPHEN:
- Pachtgegenstand (Grundstück, Betrieb, Inventar) genau beschreiben
- Pachtzweck und Betriebspflichten (z.B. Gastronomie, Landwirtschaft)
- Pachtdauer (befristet/unbefristet)
- Pachtzins, Zahlungsweise, Nebenkosten
- Instandhaltung und Verkehrssicherungspflichten
- Unterverpachtung (erlaubt/verboten)
- Inventar und Fruchtziehungsrechte
- Rückgabezustand (Renovierung?)
- Haftung und Versicherungspflichten
- Kündigungsfristen und -rechte
- Schlussbestimmungen

VERBOTENE THEMEN (nur wenn im Input angegeben!):
- NICHT behaupten: Vorkaufsrecht des Pächters
- NICHT behaupten: Baugenehmigungen liegen vor

UNTERSCHIED zur Miete: Pächter nutzt auch die "Früchte" (Erträge)!`
};

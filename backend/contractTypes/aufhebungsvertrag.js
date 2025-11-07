// 📄 Aufhebungsvertrag (Arbeitsverhältnis) - V2 Meta-Prompt System

module.exports = {
  roles: {
    A: "Arbeitgeber",
    B: "Arbeitnehmer"
  },

  qualityThreshold: 0.94,

  mustClauses: [
    "§ 1 Beendigungstermin",
    "§ 2 Freistellung",
    "§ 3 Vergütung bis Austritt",
    "§ 4 Urlaubs-/Überstundenabgeltung",
    "§ 5 Zeugnis",
    "§ 6 Rückgabe von Arbeitsmitteln",
    "§ 7 Wettbewerbsverbot/Vertraulichkeit",
    "§ 8 Abgeltungsklausel",
    "§ 9 Sozialversicherung/Steuern",
    "§ 10 Schlussbestimmungen"
  ],

  forbiddenTopics: [
    "Kündigungsschutzverfahren läuft",
    "Betriebsratszustimmung automatisch"
  ],

  forbiddenSynonyms: [
    "Kündigungsschutzverfahren läuft|Kündigungsschutzklage anhängig|Gerichtsverfahren läuft",
    "Betriebsratszustimmung automatisch|Betriebsrat hat zugestimmt|Betriebsratsgenehmigung liegt vor"
  ],

  notes: `Rechtsbasis: BGB §§ 620 ff., § 623, BetrVG

PFLICHT-PARAGRAPHEN:
- Beendigungstermin (exaktes Datum)
- Freistellung (widerruflich/unwiderruflich)
- Vergütungsfortzahlung bis Austritt
- Urlaubs- und Überstundenabgeltung
- Zeugnisanspruch (qualifiziert/einfach)
- Rückgabe von Arbeitsmitteln (Laptop, Handy, Schlüssel etc.)
- Wettbewerbsverbot und Verschwiegenheitspflicht
- Abgeltungsklausel (alle Ansprüche abgegolten)
- Sozialversicherung/Steuern/Meldepflichten
- Schlussbestimmungen

VERBOTENE THEMEN (nichts behaupten, was nicht vorliegt!):
- NICHT behaupten, dass Kündigungsschutzverfahren läuft
- NICHT behaupten, dass Betriebsratszustimmung vorliegt
- Nur wenn im Input angegeben!

WICHTIG: Schriftformerfordernis (§ 623 BGB) hinweisen!`
};

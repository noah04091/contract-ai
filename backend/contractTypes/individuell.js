// 📋 Individueller Vertragstyp - V2 Meta-Prompt System
// Flexibler Typ mit überschreibbaren Rollen, mustClauses, forbiddenTopics

module.exports = {
  // Rollen (Standard-Fallback, können per Input überschrieben werden)
  roles: {
    A: "Partei A",
    B: "Partei B"
  },

  // Quality Threshold für Hybrid Score (leicht niedriger wegen Flexibilität)
  qualityThreshold: 0.90,

  // Default Must-Clauses mit Alternativtiteln (können per Input-Array überschrieben werden)
  mustClauses: [
    "§ 1 Vertragsgegenstand|Projektgegenstand",
    "§ 2 Leistungsumfang|Leistungen|Pflichten",
    "§ 3 Vergütung|Honorar|Zahlungsmodalitäten",
    "§ 4 Laufzeit und Kündigung|Vertragsdauer",
    "§ 5 Rechte an Arbeitsergebnissen|Urheberrechte|IP",
    "§ 6 Vertraulichkeit|Geheimhaltung",
    "§ 7 Haftung|Gewährleistung",
    "§ 8 Nebenpflichten|Mitwirkung|Informationspflichten",
    "§ 9 Datenschutz|Datenschutzklausel",
    "§ 10 Schlussbestimmungen|Schlussklauseln"
  ],

  // Default Forbidden Topics (leer, können per Input geliefert werden)
  forbiddenTopics: [],

  // Default Forbidden Synonyms (leer, können per Input geliefert werden)
  forbiddenSynonyms: [],

  notes: `Flexibler Vertragstyp für individuelle Anforderungen.

BESONDERHEITEN:
- Rollen können per Input überschrieben werden (parteiA.role, parteiB.role)
- mustClauses können per Input-Array komplett ersetzt werden
- forbiddenTopics/forbiddenSynonyms aus Input übernehmen
- Custom Requirements haben höchste Priorität
- KEINE zusätzlichen Klauseln erfinden, nur was im Input steht!

Rechtsbasis: Individuell je nach Vertragsart`
};

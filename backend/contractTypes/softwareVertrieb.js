// 💻 SaaS & Software Reseller Vertrag (DE, BGB/UrhG/HGB/DSGVO) - Vertragstyp-Modul für V2 Meta-Prompt System
// Definiert Rollen, Pflicht-Klauseln und verbotene Themen für B2B Software-Vertriebsverträge

module.exports = {
  // Korrekte Rollenbezeichnungen (case-sensitive!)
  roles: {
    A: "Hersteller",
    B: "Reseller"
  },

  // Qualitäts-Threshold für Hybrid Score (0-1)
  qualityThreshold: 0.93,

  // Pflicht-Paragraphen (Must-Clauses) für B2B Software Reselling
  mustClauses: [
    "§ 1 Vertragsgegenstand und Definitionen|Vertragsgegenstand|Gegenstand und Definitionen",
    "§ 2 Vertriebsrechte und Gebietsregelung|Vertriebsrechte|Vertrieb und Gebiet",
    "§ 3 Lizenzrechte und Unterlizenzierung|Lizenzrechte|Lizenzvergabe",
    "§ 4 Pflichten des Herstellers|Leistungspflichten Hersteller|Herstellerpflichten",
    "§ 5 Pflichten des Resellers|Leistungspflichten Reseller|Reseller-Pflichten",
    "§ 6 Vergütung, Marge und Abrechnung|Vergütung|Provisionen und Abrechnung",
    "§ 7 Support und Serviceverantwortung|Support|Supportaufteilung",
    "§ 8 Service Level Agreement|SLA|Verfügbarkeit und Reaktionszeiten",
    "§ 9 Datenschutz und Auftragsverarbeitung|Datenschutz|AVV",
    "§ 10 Geistiges Eigentum und Markennutzung|IP-Rechte|Markenrechte",
    "§ 11 Haftung und Gewährleistung|Haftung|Haftungsbegrenzung",
    "§ 12 Vertraulichkeit|Geheimhaltung|Vertraulichkeit und Geheimhaltung",
    "§ 13 Laufzeit, Kündigung und Folgen der Beendigung|Laufzeit und Kündigung|Vertragsbeendigung",
    "§ 14 Schlussbestimmungen|Allgemeine Bestimmungen|Sonstiges"
  ],

  // Verbotene Themen (wenn nicht explizit im Input genannt)
  forbiddenTopics: [
    "Arbeitsrecht",
    "Arbeitnehmerüberlassung",
    "Sozialversicherung",
    "Franchise",
    "Franchisegebühr",
    "Gesellschaftsgründung",
    "GmbH-Gründung",
    "Insolvenzanfechtung",
    "Verbraucherrecht",
    "Widerrufsrecht",
    "Fernabsatzgesetz"
  ],

  forbiddenSynonyms: [
    "Arbeitsrecht|Arbeitsvertrag|Anstellungsverhältnis",
    "Franchise|Franchising|Franchisevertrag",
    "Verbraucherrecht|B2C|Verbraucherschutz|Fernabsatz"
  ],

  // Rechtliche Besonderheiten und Hinweise
  notes: `Rechtsbasis: BGB §§ 433 ff. (Kaufrecht), §§ 611 ff. (Dienstleistung), HGB §§ 84 ff. (Handelsvertreterrecht analog), UrhG §§ 31 ff. (Lizenzrecht), DSGVO Art. 28 (Auftragsverarbeitung).

BESONDERHEITEN Software-Vertrieb:
- ZENTRALE FRAGE: Wer ist Vertragspartner des Endkunden? (Reseller im eigenen Namen ODER Hersteller direkt ODER White-Label)
- Sublizenzierung ist hier ERLAUBT und GEWOLLT (anders als beim reinen Lizenzvertrag!)
- SLA und Verfügbarkeit sind Kernbestandteile, nicht optional
- Support-Aufteilung (1st/2nd/3rd Level) muss klar definiert sein
- Margenmodell oder Provisionsmodell klar unterscheiden
- Bei "Modular"-Struktur: Hauptvertrag + Anlagen (Leistungsbeschreibung, SLA, AVV) generieren
- Folgen der Beendigung besonders wichtig: Was passiert mit Endkunden-Lizenzen?
- Datenschutz/AVV ist bei SaaS IMMER relevant (personenbezogene Daten der Endkunden)
- Service Credits bei SLA-Verletzung sind marktüblich und erwartet
- Haftung bei Software-Ausfällen separat von allgemeiner Haftung regeln
- Gebietsschutz und Exklusivität klar definieren (räumlich + sachlich)
- Updates/Upgrades-Pflicht des Herstellers regeln`
};

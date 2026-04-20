// 🛡️ Software-Endkundenvertrag (Reseller-Schutz) - Vertragstyp-Modul für V2 Meta-Prompt System
// Für Reseller die Drittsoftware (z.B. US-SaaS) an deutsche Unternehmen weiterverkaufen
// FOKUS: Reseller-Haftung begrenzen, Drittanbieter-Verantwortung klarstellen

module.exports = {
  // Korrekte Rollenbezeichnungen (case-sensitive!)
  roles: {
    A: "Anbieter",
    B: "Kunde"
  },

  // Qualitäts-Threshold für Hybrid Score (0-1)
  qualityThreshold: 0.93,

  // Pflicht-Paragraphen (Must-Clauses) für Reseller-Endkunden-Vertrag
  mustClauses: [
    "§ 1 Vertragsgegenstand und Leistungsbeschreibung|Vertragsgegenstand|Gegenstand",
    "§ 2 Drittanbieter-Software und Herstellerhinweis|Drittanbieter-Klausel|Herstellerklausel",
    "§ 3 Nutzungsrechte und Lizenzbedingungen|Nutzungsrechte|Lizenz",
    "§ 4 Eigene Leistungen des Anbieters|Eigenleistungen|Zusatzleistungen des Anbieters",
    "§ 5 Leistungsumfang und Verfügbarkeit|Verfügbarkeit|SLA",
    "§ 6 Vergütung und Zahlungsbedingungen|Vergütung|Preise und Zahlung",
    "§ 7 Haftungsbeschränkung|Haftung|Haftungsbegrenzung",
    "§ 8 Gewährleistung|Mängelgewähr|Gewährleistung und Mängel",
    "§ 9 Herstellerbedingungen und deren Geltung|Herstellerbedingungen|AGB des Herstellers",
    "§ 10 Support und Mitwirkungspflichten|Support|Pflichten des Kunden",
    "§ 11 Datenschutz|Datenschutz und Datenverarbeitung",
    "§ 12 Laufzeit und Kündigung|Vertragsdauer|Laufzeit",
    "§ 13 Folgen der Beendigung|Vertragsbeendigung|Rückgabe und Löschung",
    "§ 14 Schlussbestimmungen|Allgemeine Bestimmungen"
  ],

  // Verbotene Themen (wenn nicht explizit im Input genannt)
  forbiddenTopics: [
    "Exklusivität",
    "Gebietsschutz",
    "Vertriebsgebiet",
    "Franchise",
    "Provisionsmodell",
    "Margenregelung",
    "Gesellschaftsgründung",
    "Wettbewerbsverbot",
    "Handelsvertreter",
    "Verbraucherrecht",
    "Widerrufsrecht"
  ],

  forbiddenSynonyms: [
    "Exklusivität|exklusiver Vertrieb|Alleinvertrieb",
    "Franchise|Franchising|Franchisegebühr",
    "Verbraucherrecht|B2C|Fernabsatz|Widerrufsbelehrung"
  ],

  // Rechtliche Besonderheiten und Hinweise
  notes: `Rechtsbasis: BGB §§ 433 ff., §§ 631 ff. (Werkvertrag für eigene Leistungen), §§ 305 ff. (AGB-Recht), DSGVO Art. 28.

ZENTRALE VERTRAGSLOGIK — UNBEDINGT BEACHTEN:
Der "Anbieter" ist KEIN Softwarehersteller, sondern ein WIEDERVERKÄUFER (Reseller) von Drittanbieter-Software.
Der Vertrag MUSS dies in der Präambel oder § 1 unmissverständlich klarstellen:
"Der Anbieter handelt als Wiederverkäufer von Software eines Drittherstellers und ist weder Entwickler noch Rechteinhaber der Software."

HAFTUNGS-ARCHITEKTUR (ENTSCHEIDEND):
1. UNTERSCHEIDUNG zwischen Eigenleistung und Fremdleistung:
   - Für EIGENE Leistungen (Setup, Beratung, Integration): Anbieter haftet eingeschränkt nach BGB
   - Für DRITTANBIETER-SOFTWARE (Bugs, Ausfälle, Datenverlust): Anbieter haftet NICHT oder nur sehr begrenzt
2. Haftungsdeckel: Gesamthaftung maximal auf Vergütung der letzten 12 Monate begrenzt
3. Ausschluss mittelbarer Schäden und entgangener Gewinn (bei Drittanbieter-Software)
4. ABER: Nie komplett ausschließen! Formulierung immer "angemessen begrenzt", nie "komplett ausgeschlossen"
   - Haftung bei Vorsatz und grober Fahrlässigkeit KANN NICHT ausgeschlossen werden (§ 276 BGB)
   - Haftung für Verletzung von Leben, Körper, Gesundheit IMMER unbegrenzt
   - Formulierung MUSS seriös und marktüblich sein, NICHT aggressiv oder einseitig

HERSTELLERBEDINGUNGEN:
- Es MUSS geregelt werden, ob/wie die AGB/Terms des Herstellers gelten
- Optionen: Hersteller-AGB gelten ergänzend / haben Vorrang / Kunde akzeptiert separat
- Bei US-Software: Hinweis dass Hersteller-AGB ggf. nach US-Recht ausgelegt werden

GEWÄHRLEISTUNG:
- Für Drittanbieter-Software: Keine eigene Gewährleistung, nur Durchreichung der Herstellergewährleistung
- Für eigene Leistungen (Setup, Beratung): Gewährleistung nach BGB, ggf. auf 12 Monate verkürzt
- NICHT formulieren als "keine Gewährleistung für irgendwas" → wirkt unseriös und ist AGB-rechtlich angreifbar

VERFÜGBARKEIT / SLA:
- Weich formulieren: "im Rahmen der vom Hersteller zugesagten Verfügbarkeit"
- KEINE eigene Uptime-Garantie geben, wenn man die Software nicht kontrolliert
- Best-Effort-Klausel für eigene Systeme (falls zutreffend)

TON UND STIL:
- Professionell und ausgewogen, NICHT aggressiv einseitig
- Der Vertrag muss für den Kunden akzeptabel sein (sonst unterschreibt er nicht)
- Schutz des Resellers durch klare Abgrenzung, nicht durch totale Haftungsausschlüsse
- Deutsche Rechtssprache, BGB-konform, AGB-fest (§§ 305-310 BGB beachten)`
};

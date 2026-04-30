# Freelancer-Vertrag — Playbook-Konzept

> Recherchedokument im Sinne des `PLAYBOOK-MASTERPLAN.md` (Sektion 8). Vorbereitet die Code-Umsetzung in `backend/playbooks/freelancer.js`.

## Metadaten
- **Slug**: `freelancer`
- **Title**: Freelancer-Vertrag (Freie Mitarbeit / Selbstständige Dienstleistung)
- **Description**: Vertrag zwischen Auftraggeber und freiem Mitarbeiter — sauber abgegrenzt von Festanstellung und Werkvertrag, Schutz vor Scheinselbstständigkeit, mit IP-, Honorar- und Geheimhaltungsregeln.
- **Difficulty**: komplex
- **Estimated Time**: 10–15 Minuten
- **Icon**: `user-cog`
- **Legal Basis**: BGB §§ 611 ff. (Dienstvertrag) ggf. §§ 631 ff. (Werkvertrag); UStG; SGB IV §§ 7, 7a (Scheinselbstständigkeit / Statusfeststellung); SGB VI § 2 (Rentenversicherungspflicht arbeitnehmerähnlicher Selbstständiger); UrhG §§ 31, 31a, 32, 32a (Nutzungsrechte und Vergütung); KSVG (Künstlersozialkasse); AÜG (Abgrenzung Arbeitnehmerüberlassung); GeschGehG.

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze + Abgrenzungen
- **BGB § 611 ff.** (Dienstvertrag): Geschuldet wird die Tätigkeit, NICHT der Erfolg. Standard für Freelance-IT-Entwicklung im Daily-Rate-Modell.
- **BGB § 631 ff.** (Werkvertrag): Geschuldet wird ein konkreter Erfolg (z.B. fertige Website, Logo-Design, Studie). Mängelrechte nach § 634 BGB; Abnahme nach § 640 BGB.
- **Abgrenzung Dienst-/Werkvertrag** ist kein Etikett, sondern Folge der Vertragsausgestaltung: BAG vom 18.01.2012 — 7 AZR 723/10. Gerichte stellen auf die tatsächliche Durchführung ab.
- **BGB § 611a** (seit 01.04.2017): Definition Arbeitsvertrag. Persönliche Abhängigkeit + Weisungsgebundenheit + Eingliederung = Arbeitnehmer, kein Freelancer.
- **SGB IV § 7 Abs. 1**: Beschäftigung = nichtselbstständige Arbeit, insbesondere in Arbeitsverhältnis. Indizien: Weisung, Eingliederung, fehlendes Unternehmerrisiko, kein eigenes Kapital, keine eigene Betriebsstätte, persönliche Leistungserbringung.
- **SGB IV § 7a** (Statusfeststellungsverfahren): Auf Antrag prüft Deutsche Rentenversicherung Bund (DRV) verbindlich, ob abhängige Beschäftigung oder Selbstständigkeit. Antrag innerhalb 1 Monat ab Aufnahme der Tätigkeit hat aufschiebende Wirkung gegen Beitragsforderung.
- **SGB VI § 2 Nr. 9** (arbeitnehmerähnlicher Selbstständiger): Wer regelmäßig keine versicherungspflichtigen Arbeitnehmer beschäftigt UND auf Dauer und im Wesentlichen nur für einen Auftraggeber tätig ist, unterliegt der Rentenversicherungspflicht.
- **AÜG**: Bei dauerhafter Eingliederung in fremden Betrieb droht verdeckte Arbeitnehmerüberlassung; ohne Erlaubnis nichtige Verträge → Direkt-Arbeitsverhältnis zum Entleiher (§ 9 AÜG).
- **UrhG § 31**: Einräumung von Nutzungsrechten muss nach Art und Umfang konkret bezeichnet werden ("Zweckübertragungslehre", § 31 Abs. 5 UrhG). Im Zweifel verbleiben Rechte beim Urheber.
- **UrhG §§ 32, 32a**: Anspruch auf angemessene Vergütung; bei "Bestseller"-Tatbestand zusätzliche Beteiligung.
- **KSVG**: Auftraggeber, die regelmäßig Werke selbstständiger Künstler/Publizisten verwerten, sind Künstlersozialabgabe-pflichtig (5,0 % im Jahr 2024, 5,0 % auch 2025). Bagatellgrenze: 450 EUR Honorar/Jahr.
- **UStG § 13b** (Reverse Charge): Bei B2B-Leistungen oft umgekehrte Steuerschuldnerschaft.
- **GeschGehG** (seit 26.04.2019): Schutz von Geschäftsgeheimnissen nur bei "angemessenen Geheimhaltungsmaßnahmen" (§ 2 Nr. 1 lit. b).

### 1.2 Aktuelle Rechtsprechung (2022–2026)
- **BSG vom 28.06.2022 — B 12 R 3/20 R** ("Herrenberg-Urteil"): Honorarlehrkräfte an Musikschulen sind regelmäßig abhängig beschäftigt. Wendepunkt — Eingliederung wiegt schwer, "klassisches Weisungsrecht" tritt zurück.
- **BSG vom 27.04.2023 — B 12 R 15/21 R**: Auch eine **Ein-Personen-GmbH** schützt nicht automatisch vor Scheinselbstständigkeit. Geschäftsführer einer GmbH kann selbstständig oder abhängig sein — Gesamtwürdigung.
- **BSG vom 13.11.2025**: Übergangsregelung § 127 SGB IV (Lehrkräfte) auch rückwirkend nutzbar, selbst wenn DRV bereits abhängige Beschäftigung festgestellt hat (sofern noch gerichtliches Verfahren anhängig).
- **BSG vom 04.06.2019 — B 12 R 11/18 R**: Höhe des Honorars ist Indiz für Selbstständigkeit ("deutlich über vergleichbarem Arbeitnehmerlohn").
- **EuGH vom 22.04.2020 — C-692/19** (Yodel): Auch im Plattform-Kontext Gesamtbetrachtung; bloße Vertragstitel reichen nicht.
- **BAG vom 14.06.2017 — 10 AZR 539/15**: Frachtführer sind nicht automatisch Arbeitnehmer; aber bei fester Tour-Bindung Indiz für Beschäftigung.
- **BAG vom 24.02.2021 — 5 AZR 99/20** (Crowdworker): Plattform-Crowdworker können Arbeitnehmer sein, wenn sie auf der Plattform durch Anreizsysteme faktisch zu kontinuierlicher Arbeitserbringung gedrängt werden.

### 1.3 Pflichthinweise und Risiken
1. **Statusfeststellungsverfahren bei Vertragsschluss empfehlen** — beidseitige Rechtssicherheit. Auftraggeber haftet sonst rückwirkend für Sozialversicherungsbeiträge bis zu 4 Jahren (§ 25 SGB IV; bei Vorsatz 30 Jahre).
2. **Scheinselbstständigkeit-Folgen für AG**: Nachzahlung Sozialversicherungsbeiträge AG- + AN-Anteil rückwirkend, Säumniszuschläge, Strafverfahren (§ 266a StGB — Vorenthalten Sozialversicherungsbeiträge).
3. **Scheinselbstständigkeit-Folgen für AN**: Rückwirkende Behandlung als AN; Anspruch auf Sozialleistungen, Urlaub, KSchG; aber auch Rückzahlung überhöhten Honorars an AG möglich.
4. **AÜG-Risiko**: Bei dauerhafter Eingliederung ohne AÜG-Erlaubnis: Vertrag nichtig, Arbeitsverhältnis mit Endkunde fingiert (§ 10 AÜG).
5. **UrhG-Vorsicht**: Ohne klare Rechteübertragung kann Auftraggeber das Werk nicht uneingeschränkt nutzen ("Zweckübertragungslehre" § 31 Abs. 5 UrhG).
6. **KSK-Pflicht** für regelmäßige Auftraggeber kreativer Tätigkeiten — Prüfung durch KSK, Nachzahlung möglich.

### 1.4 Indizien-Katalog Scheinselbstständigkeit (DRV-Praxis)

| Indiz für Selbstständigkeit | Indiz für Beschäftigung |
|------------------------------|-------------------------|
| Eigene Betriebsstätte, eigenes Kapital | Arbeitsplatz beim Auftraggeber, dessen Equipment |
| Mehrere Auftraggeber | Nur 1 Auftraggeber, > 5/6 des Umsatzes |
| Eigene Werbung, Außenauftritt | Kein Marktauftritt |
| Eigene MA / Substituierbarkeit | Persönliche Leistungspflicht |
| Honorar > vergleichbarer AN-Lohn | Honorar wie AN-Vergleich |
| Eigenes unternehmerisches Risiko | Festes Honorar, keine Verluste möglich |
| Eigene Arbeitszeit + Ort | Anwesenheitspflicht, Schichtpläne |
| Keine Eingliederung in Betriebsabläufe | Teilnahme an internen Meetings, Mailverteiler, Berichtspflichten |

---

## 2 · Rollen-Definition
- **Rolle A — Auftraggeber (AG)**: Beauftragt einen Externen für Dienstleistung/Werk. Will rechtssichere Liefererung ohne SV-Risiko. Strukturelles Interesse: klare IP-Übertragung, Geheimhaltung, Statusklärung.
- **Rolle B — Freelancer (FL)**: Selbstständige Person/Einzelunternehmer/UG. Will faire Vergütung, klare Leistungspflichten, Schutz vor Haftungsfallen, Wahrung der Selbstständigkeit (mehrere Kunden, eigene Mittel).

---

## 3 · Modi-Bedeutung (vertragsspezifisch)
- **Sicher** → **Pro Auftraggeber**: Maximaler IP-Übergang inkl. Bearbeitungsrechten, weite Haftung des FL, Kundenschutzklausel, Vertragsstrafe bei Geheimnisverstoß, Statusfeststellung als Pflicht für FL, klare Selbstständigkeitsindikatoren im Vertrag (Mehrauftragsklausel, kein Equipment, eigene Steuern). Ziel: kein Eindruck von Beschäftigung.
- **Ausgewogen** → **Marktstandard**: Klare Tätigkeitsbeschreibung, Honorar nach Stunden/Pauschal/Mix, einfache Nutzungsrechte für vereinbarten Zweck, Standard-Haftung, gegenseitige Geheimhaltung, AGB-konforme Klauseln.
- **Durchsetzungsstark** → **Pro Freelancer**: Eingeschränkte Haftung (auf Honorar-Höhe), Verzugszinsen für AG, lange Zahlungsfrist, Rechte verbleiben beim FL bis Vollzahlung, kein Wettbewerbsverbot, keine exklusive Bindung, Unterauftrag erlaubt, fairer Stornoschutz.

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Auftraggeber
  { key: "partyA_name", label: "Firmenname (Auftraggeber)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_representative", label: "Vertretungsberechtigt", type: "text", required: false, group: "partyA" },
  { key: "partyA_industry", label: "Branche (für KSK-Prüfung relevant)", type: "select", required: true, group: "partyA",
    options: [
      { value: "kreativ", label: "Kreativ / Medien (KSK-pflichtig prüfen!)" },
      { value: "tech", label: "IT / Software" },
      { value: "consulting", label: "Beratung / Strategy" },
      { value: "industrie", label: "Industrie / Produktion" },
      { value: "andere", label: "Andere" }
    ]
  },

  // Freelancer
  { key: "partyB_name", label: "Vor- und Nachname / Firma (Freelancer)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Geschäftsanschrift", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_taxNumber", label: "Steuernummer / USt-IdNr.", type: "text", required: true, group: "partyB" },
  { key: "partyB_legalForm", label: "Rechtsform", type: "select", required: true, group: "partyB",
    options: [
      { value: "einzelunternehmer", label: "Einzelunternehmer / Freiberufler" },
      { value: "ug", label: "UG (haftungsbeschränkt)" },
      { value: "gmbh", label: "GmbH" },
      { value: "kleinunternehmer", label: "Kleinunternehmer (§ 19 UStG)" }
    ]
  },
  { key: "partyB_otherClients", label: "Hat der Freelancer weitere Auftraggeber?", type: "select", required: true, group: "partyB",
    options: [
      { value: "ja_mehrere", label: "Ja, mehrere (Indiz Selbstständigkeit)" },
      { value: "nein_einziger", label: "Nein, dies ist aktuell der einzige Auftraggeber (SCHEINSELBSTSTÄNDIGKEIT-RISIKO)" }
    ]
  },

  // Vertragskontext
  { key: "scope", label: "Tätigkeitsbeschreibung / Projektgegenstand", type: "textarea", required: true, group: "context",
    placeholder: "z.B. Entwicklung eines React-Frontend-Moduls für Produkt X" },
  { key: "vertragstyp", label: "Vertragstyp", type: "select", required: true, group: "context",
    options: [
      { value: "dienst", label: "Dienstvertrag (Tätigkeit, kein Erfolg geschuldet — typisch für Stundenmodell)" },
      { value: "werk", label: "Werkvertrag (konkretes Ergebnis geschuldet — typisch für Pauschalprojekte)" },
      { value: "mix", label: "Hybrid (Anteile beider Vertragstypen)" }
    ]
  },
  { key: "duration", label: "Geplante Vertragsdauer", type: "select", required: true, group: "context",
    options: [
      { value: "einmalig", label: "Einmaliges Projekt" },
      { value: "kurz_3mon", label: "Bis 3 Monate" },
      { value: "6mon", label: "Bis 6 Monate" },
      { value: "12mon", label: "Bis 12 Monate" },
      { value: "unbefristet", label: "Unbefristet / dauerhaft (SCHEINSELBSTSTÄNDIGKEIT-WARNUNG)" }
    ]
  },
  { key: "honorar_modell", label: "Honorarmodell", type: "select", required: true, group: "context",
    options: [
      { value: "stundensatz", label: "Stundensatz" },
      { value: "tagessatz", label: "Tagessatz" },
      { value: "pauschal", label: "Pauschal / Festpreis" },
      { value: "erfolgsbezogen", label: "Erfolgsbezogen / Provision" }
    ]
  },
  { key: "honorar_betrag", label: "Honorarhöhe (Netto, EUR)", type: "number", required: true, group: "context" }
]
```

---

## 5 · Sektionen (Step 3 des Wizards)

> 11 strategische Entscheidungen.

### § 2 — Vertragstyp und Leistungsgegenstand
- **Key**: `service_type`
- **Importance**: critical
- **Beschreibung**: Definiert Dienst- vs. Werkvertrag, Erfolgsschuld vs. Tätigkeitspflicht. Falsche Einordnung führt zu Haftungs- und Mängelrechtsfragen.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `dienst_offen` | Dienstvertrag, offene Tätigkeitsbeschreibung | "FL erbringt fachliche Unterstützung im Bereich X." Tätigkeit, kein konkreter Erfolg. | medium | Dienstvertrag-Charakter klar, aber zu offene Beschreibung kann SV-Prüfer als "Eingliederung" werten (Herrenberg-Urteil, BSG 28.06.2022). | DRV-Prüfung: bei zu allgemeiner Tätigkeit + kontinuierlicher Verfügbarkeit Indiz für Beschäftigung. | AG sollte konkret werden; FL sollte mehrere Auftragnehmer/-projekte parallel nachweisen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `dienst_konkret` | Dienstvertrag mit konkreter Tätigkeit | Aufgaben + Deliverables konkret beschrieben, klare Abgrenzung zu Festangestellten-Aufgaben. | low | Dienstvertrag mit klarem Selbstständigkeits-Profil. | Selten — sauberer Vertragstyp. | Empfohlene Standard-Form. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `werk_pauschal` | Werkvertrag mit Festpreis und Abnahme | Konkretes Ergebnis (z.B. fertige App, Studie) zu Pauschalpreis, Abnahme nach § 640 BGB. | low | Klassischer Werkvertrag, IP-Übertragung mit Abnahme. | Wenn Mängel bestehen, Mängelrechte § 634 BGB greifen — FL muss nachbessern. | FL: Abnahmekriterien definieren, Teilabnahme verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `mischvertrag` | Mischvertrag mit getrennten Modulen | Teilbereiche als Werkvertrag (Lieferung), andere als Dienstvertrag (Wartung/Support). | medium | Beide Regimes greifen je nach Modul; Vertrag muss klar trennen. | Wenn Module nicht klar getrennt — Streit über anwendbares Recht. | Trennung explizit machen ("Modul A: Werkvertrag mit Abnahme. Modul B: Dienstvertrag, monatlich"). | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `werk_pauschal`
  - ausgewogen: `dienst_konkret`
  - durchsetzungsstark: `dienst_offen`

---

### § 3 — Selbstständigkeitsklausel und Statusfeststellung
- **Key**: `independence`
- **Importance**: critical
- **Beschreibung**: Vertragsbestimmungen, die Selbstständigkeit dokumentieren — kein Schutz vor SV-Prüfung, aber wichtige Beweis-Anker.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine` | Keine Selbstständigkeitsklausel | Vertrag enthält keine ausdrücklichen Indikatoren. | high | Hohe Beweislast bei DRV-Prüfung. Tatsächliche Durchführung entscheidet, aber Vertragstext kann pro Selbstständigkeit gewertet werden. | Bei DRV-Prüfung: ohne Vertragsindikatoren oft Tendenz zur Beschäftigung. | Beide: Klausel ist Standard, sollte enthalten sein. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `standard_klausel` | Standard-Selbstständigkeitsklausel | "FL ist selbstständig tätig. FL ist berechtigt, für andere Auftraggeber tätig zu werden. FL trägt eigenes unternehmerisches Risiko, führt Steuern selbst ab, ist nicht in Betriebsorganisation des AG eingegliedert." | low | Standard-Wording, gerichtsfest als Indiz. Schützt nicht bei abweichender tatsächlicher Durchführung (Herrenberg-Urteil). | Wenn tatsächliche Durchführung anders aussieht — Klausel allein hilft nicht. | Akzeptabel; ggf. konkret um Zeit-/Ortssouveränität ergänzen. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `mit_statusfeststellung_pflicht` | Standard + verpflichtende Statusfeststellung (§ 7a SGB IV) | FL verpflichtet sich, innerhalb 4 Wochen ein Statusfeststellungsverfahren beim DRV einzuleiten; AG kann Vertrag bei festgestellter abhängiger Beschäftigung außerordentlich kündigen. | low | Maximale Rechtssicherheit; aufschiebende Wirkung gegen Beitragsforderung wenn Antrag rechtzeitig. | Wenn FL Verfahren ablehnt — Vertragspflicht-Verstoß. | FL: Wer trägt die Kosten? Klare Regelung im Vertrag. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `mit_indizienkatalog` | Standard + ausdrücklicher Indizienkatalog | Klausel listet konkret: eigene Betriebsstätte, eigenes Equipment, freie Zeiteinteilung, mehrere Auftraggeber, kein Anspruch auf Weihnachtsgeld/Urlaub etc. | low | Sehr starker Indiz-Katalog im Vertrag; konkretisiert Selbstständigkeit. | Wenn Realität abweicht — Klausel kann gegen AG sprechen ("vorsätzlich getäuscht"). | Beide: Konkretisierung sinnvoll. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `mit_statusfeststellung_pflicht`
  - ausgewogen: `standard_klausel`
  - durchsetzungsstark: `standard_klausel`

---

### § 4 — Honorar und Zahlungsbedingungen
- **Key**: `compensation`
- **Importance**: critical
- **Beschreibung**: Höhe, Modus, Fälligkeit, Verzugsregeln, USt-Behandlung, Reisekosten.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `stundensatz_30tage` | Stundensatz, monatliche Abrechnung, 30 Tage Zahlungsziel | Stundenabrechnung gegen Tätigkeitsnachweis; Rechnung monatlich; 30 Tage netto. | medium | Marktüblich, aber 30 Tage langes Zahlungsziel belastet FL-Liquidität. § 286 Abs. 3 BGB: Verzug nach 30 Tagen automatisch. | FL: Liquiditätsdruck. | FL: 14 Tage netto + Verzugszinsen 9 % über Basiszins (§ 288 Abs. 2 BGB B2B). | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `stundensatz_14tage_skonto` | Stundensatz, 14 Tage netto, 2 % Skonto bei 7 Tagen | Kürzere Zahlungsfrist mit Anreiz für AG. | low | FL-freundlich; AG hat Skonto-Anreiz. | Selten Streit. | AG: Skonto-Wahl belassen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `pauschal_meilensteine` | Pauschalpreis nach Meilensteinen | Festpreis aufgeteilt in 30/40/30 % nach Etappen-Abnahme. | low | Klar, planbar. § 632a BGB Abschlagszahlungen bei Werkvertrag möglich. | Wenn Meilensteine vage — Streit bei Abnahme. | FL: Anzahlung verhandeln (z.B. 30 % bei Vertragsschluss). | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `erfolgsbezogen_min` | Erfolgsbezogen mit Garantie-Honorar | Provision/Erfolg + Mindesthonorar-Garantie. | medium | Schwer kalkulierbar, ggf. § 87 HGB-Regeln (Handelsvertreter analog). | Wenn Erfolg ausbleibt — Streit über Mindesthonorar. | Klare Berechnungsgrundlage und Erfolgsdefinition. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `pauschal_meilensteine`
  - ausgewogen: `stundensatz_30tage`
  - durchsetzungsstark: `stundensatz_14tage_skonto`

---

### § 5 — Nutzungsrechte und IP
- **Key**: `ip_rights`
- **Importance**: critical
- **Beschreibung**: UrhG § 31 — Nutzungsrechte müssen konkret bezeichnet werden (Zweckübertragungslehre, § 31 Abs. 5). Im Zweifel verbleiben Rechte beim Urheber. § 32 sichert "angemessene Vergütung".

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `einfaches_recht_zweckgebunden` | Einfaches Nutzungsrecht für vereinbarten Zweck | AG erhält einfaches, nicht-exklusives Nutzungsrecht für den im Vertrag genannten Zweck. FL behält volle Rechte für andere Verwendungen. | medium | FL-freundlich; AG kann Werk nicht weiterverkaufen oder bearbeiten ohne Zustimmung. | AG kann Werk nicht für Folgeprodukte/Lizenzgeschäft nutzen. | AG: Mindestens "Bearbeitungsrechte für interne Anpassungen" verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `ausschliessliches_recht_zweck` | Ausschließliches Nutzungsrecht für Zweck, ohne Bearbeitung | Exklusiv für Zweck, FL darf nicht doppelt verkaufen, aber Bearbeitungsrecht beim FL. | low | Marktstandard für Auftragsarbeit; § 32 angemessene Vergütung greift. | Wenn AG das Werk anpassen lassen will — Zustimmung des FL. | Bearbeitungsrecht zusätzlich verhandeln. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `umfassendes_recht_inkl_bearbeitung` | Umfassendes ausschließliches Nutzungsrecht inkl. Bearbeitung, Übertragung an Dritte | Vollständige IP-Übertragung wirtschaftlich; FL behält Urheberpersönlichkeitsrechte (zwingend, § 13 UrhG). | medium | Im Honorar muss "angemessene Vergütung" für umfassende Rechteübertragung enthalten sein (§ 32 UrhG). Sonst Nachschlagepflicht. | Wenn Honorar nicht angemessen für umfassende Rechte — § 32 UrhG: FL kann nachträglich höhere Vergütung verlangen. | FL: angemessenen Aufschlag fordern (oft 30–50 % über Standardhonorar). | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `rechte_nach_vollzahlung` | Rechteübergang erst nach Vollzahlung | Nutzungsrechte gehen erst über, wenn Honorar vollständig bezahlt. | low | FL-freundlich, sichert Honorar. AG darf Werk vor Zahlung nicht produktiv einsetzen. | Wenn AG vor Zahlung nutzt — Unterlassungs-/Schadensersatzanspruch FL. | Standard für unsichere AG-Bonität. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `umfassendes_recht_inkl_bearbeitung`
  - ausgewogen: `ausschliessliches_recht_zweck`
  - durchsetzungsstark: `rechte_nach_vollzahlung`

---

### § 6 — Haftung
- **Key**: `liability`
- **Importance**: high
- **Beschreibung**: § 309 Nr. 7 BGB: Haftung für Vorsatz/grobe Fahrlässigkeit/Personenschäden in AGB nicht ausschließbar. Für leichte Fahrlässigkeit kann begrenzt werden.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich` | Gesetzliche Haftung (BGB) | Volle Haftung nach BGB für alle Verschuldensgrade. | medium | AG-freundlich. FL hat ggf. unkalkulierbares Risiko ohne Berufshaftpflicht. | FL: Großschaden ruiniert FL. | FL: BGB-Default + Begrenzung leichte Fahrlässigkeit. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `begrenzt_auftragswert` | Begrenzt auf Auftragswert (für leichte Fahrlässigkeit) | Volle Haftung Vorsatz + grobe Fahrlässigkeit; bei leichter Fahrlässigkeit max. Höhe des Auftragswerts. | low | AGB-konform. § 309 Nr. 7 BGB beachtet. Branchenüblich für Freelancer. | Wenn Schaden des AG den Auftragswert weit übersteigt. | AG: Höhere Haftungsgrenze (z.B. Berufshaftpflicht-Deckungssumme) verhandeln. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `mit_berufshaftpflicht` | Volle Haftung + Berufshaftpflicht-Pflicht | FL muss Berufshaftpflicht (mind. 1 Mio EUR Deckung) abschließen und nachweisen. | low | Optimal für AG; Risiko-Transfer auf Versicherung. Kosten beim FL. | Wenn FL Versicherung nicht abschließt — Vertragsverletzung. | FL: Versicherung kostet i.d.R. 300–800 EUR/Jahr — in Honorar einrechnen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `ausgeschlossen_grob` | Haftung nur für Vorsatz | Versuch, alle anderen Verschuldensgrade auszuschließen. | high | **Unwirksam in AGB** (§ 309 Nr. 7 BGB) — Personenschäden, grobe Fahrlässigkeit, Vorsatz nicht ausschließbar. Klausel-Reduktion möglich, aber riskant. | Klausel kippt; AG hat dann uneingeschränkten Anspruch. | FL: realistische Begrenzung statt Ausschluss. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `mit_berufshaftpflicht`
  - ausgewogen: `begrenzt_auftragswert`
  - durchsetzungsstark: `begrenzt_auftragswert`

---

### § 7 — Geheimhaltung
- **Key**: `confidentiality`
- **Importance**: high
- **Beschreibung**: GeschGehG seit 26.04.2019 — Schutz nur bei "angemessenen Geheimhaltungsmaßnahmen". NDA ist Standardbestandteil.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine` | Keine spezielle Klausel | Verweis auf gesetzliche Geheimhaltungspflicht (Treu + Glauben). | high | GeschGehG-Schutz nur bei "angemessenen Maßnahmen" — ohne Vertragsklausel oft nicht erfüllt. | AG verliert Schutz nach GeschGehG-Standards. | Sollte ergänzt werden. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `gegenseitig_3jahre` | Gegenseitige Geheimhaltung, 3 Jahre nachvertraglich | Beide Seiten verpflichtet, vertrauliche Informationen 3 Jahre nach Vertragsende zu schützen. | low | Marktüblich, fair. | Selten. | Akzeptabel. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `einseitig_streng_5jahre_strafe` | FL einseitig, 5 Jahre, mit Vertragsstrafe | FL geheimhaltungspflichtig 5 Jahre, Vertragsstrafe 25.000 EUR pro Verstoß. | medium | § 343 BGB: Gericht kann Strafe reduzieren. § 309 Nr. 6 BGB: pauschale Strafen in AGB nur unter Bedingungen wirksam. Einseitige Geheimhaltung in B2B üblich. | Vertragsstrafe-Höhe unverhältnismäßig — Reduktion durch Gericht. | FL: Strafhöhe reduzieren; auf vorsätzliche/grobfahrlässige Verstöße begrenzen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `unbefristet` | Unbefristete Geheimhaltung | Geheimhaltungspflicht endet nie. | high | Bei AGB häufig **unwirksam** wegen unangemessener Benachteiligung (§ 307 BGB). BGH-Tendenz: max. 5–7 Jahre angemessen. | Klausel kippt; ggf. wird auf angemessene Zeit reduziert. | Praktisch nur bei tatsächlichen Geschäftsgeheimnissen unbefristet zumutbar. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `einseitig_streng_5jahre_strafe`
  - ausgewogen: `gegenseitig_3jahre`
  - durchsetzungsstark: `gegenseitig_3jahre`

---

### § 8 — Wettbewerbs- und Kundenschutz
- **Key**: `non_compete`
- **Importance**: medium
- **Beschreibung**: Bei Selbstständigen kein § 74 HGB. Wettbewerbsklauseln müssen sachlich/zeitlich/räumlich begrenzt sein und Berufsfreiheit (Art. 12 GG) wahren.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keines` | Kein Wettbewerbs-/Kundenschutz | FL kann nach Vertragsende sofort für Wettbewerber / mit AG-Kunden arbeiten. | low | FL-freundlich; entspricht Berufsfreiheit. | AG-Sicht: Schutz von Kundenbeziehungen fehlt. | AG: Mindestens 6-Monate-Kundenschutz ohne Karenz prüfen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `kundenschutz_12mon_ohne_karenz` | 12 Monate Kundenschutz ohne Karenzentschädigung | FL darf 12 Monate nach Vertragsende keine AG-Kunden direkt aktiv abwerben. Keine Karenzentschädigung (möglich, da kein § 74 HGB). | medium | Wirksam, sofern Berufsausübung nicht wesentlich eingeschränkt (BGH NJW 2005, 3061 für Selbstständige). | Wenn AG-Kunden den Großteil von FL-Markt darstellen — Klausel beeinträchtigt Berufsfreiheit. | FL: räumliche/sachliche Beschränkung enger fassen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `wettbewerbsverbot_24mon_karenz` | 24 Monate Wettbewerbsverbot mit Karenzentschädigung | Volles Wettbewerbsverbot mit angemessener Karenz (Empfehlung: 50 % des durchschnittlichen Honorars). | medium | Maximale Reichweite; ohne Karenz wäre nichtig. | Wenn räumlich/sachlich zu weit — Sittenwidrigkeit (§ 138 BGB). | FL: Reichweite reduzieren; Karenz erhöhen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `kundenschutz_6mon_aktiv` | 6 Monate, nur aktive Abwerbung | Kein passives Verbot; FL darf mit AG-Kunden arbeiten, wenn diese auf FL zukommen. | low | FL-freundlich; wirksam. | Selten. | Fairer Kompromiss. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `wettbewerbsverbot_24mon_karenz`
  - ausgewogen: `kundenschutz_12mon_ohne_karenz`
  - durchsetzungsstark: `keines`

---

### § 9 — Vertragsdauer und Kündigung
- **Key**: `term_termination`
- **Importance**: high
- **Beschreibung**: Bei Dienstvertrag: ordentliche Kündigung jederzeit nach § 621 BGB möglich (kurze Fristen). Bei Werkvertrag: Beendigung bei Erfolg / vor Erfolg § 648 BGB (AG kann jederzeit kündigen, muss aber Vergütung minus ersparter Aufwendungen zahlen).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich` | Gesetzliche Regelung (§ 621 BGB / § 648 BGB) | Bei Dienstverträgen: ordentliche Kündigung mit Fristen je nach Vergütungsperiode (z.B. monatlich → 15 Tage); bei Werkvertrag § 648 BGB. | medium | Kurze Kündigungsfristen — beidseitig schnell beendbar. | FL: kein Planungsschutz. | FL: längere Frist für AG-Kündigung verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `feste_laufzeit` | Feste Vertragslaufzeit, ordentliche Kündigung ausgeschlossen | Festes Ende; ordentliche Kündigung nicht möglich, nur außerordentliche (§ 626 BGB). | medium | Klar, planbar. ABER: bei langer Bindung + nur 1 Auftraggeber Scheinselbstständigkeits-Indiz! | Wenn DRV "Eingliederung" annimmt — feste Laufzeit verstärkt Beschäftigungs-Annahme. | Beide: Laufzeit auf Projektzweck begrenzen, nicht zu lang. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `monatlich_4wochen` | Monatlich kündbar, 4 Wochen Frist beidseitig | Kündigung beidseitig mit 4 Wochen zum Monatsende. | low | Faire Balance, planbar. | Selten. | Empfohlene Standard-Lösung. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `ag_kurz_fl_lang` | AG kurz (4 Wochen), FL Langzeit-Schutz (3 Monate) | AG kann kurzfristig kündigen, FL bekommt längere Restzeit zur Akquise. | low | FL-freundlich; in B2B-Verträgen wirksam. | AG verliert Flexibilität. | AG: Symmetrie verlangen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `gesetzlich`
  - ausgewogen: `monatlich_4wochen`
  - durchsetzungsstark: `ag_kurz_fl_lang`

---

### § 10 — Unterauftrag und Substitution
- **Key**: `subcontracting`
- **Importance**: medium
- **Beschreibung**: Substituierbarkeit ist starkes Indiz für Selbstständigkeit. Persönliche Leistungspflicht spricht für Beschäftigung.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `frei` | Unterauftrag und Substitution frei | FL darf jederzeit Dritte einsetzen oder ersetzen. | low | Starkes Indiz für Selbstständigkeit (DRV-Praxis). | AG: Qualitätsverlust durch wechselnde Personen. | AG: Qualitätsanforderungen für Substitute definieren. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `mit_zustimmung` | Unterauftrag mit AG-Zustimmung | Substitution nur mit schriftlicher Zustimmung des AG. | medium | Schwächt Selbstständigkeits-Indiz; aber praxistauglich. | Wenn AG ohne sachlichen Grund verweigert. | FL: Zustimmung darf nur aus wichtigem Grund verweigert werden. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `persoenlich` | Persönliche Leistungspflicht | Nur FL persönlich erbringt Leistung; keine Substitution. | high | **Schwächt Selbstständigkeit erheblich** (BSG-Indiz). Praktisch oft erwünscht (Spezialisten-Know-how), aber SV-rechtlich problematisch. | DRV-Prüfung: persönliche Leistungspflicht ist Beschäftigungs-Indiz. | Vermeiden — stattdessen Qualitätskriterien für Substitute. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `team_extern` | FL setzt eigenes Team / eigene Subunternehmer ein | FL stellt sicher, dass Aufgabe durch sein Team erbracht wird, FL haftet für Subs. | low | Klare Selbstständigkeit; FL-Haftung für Subs explizit. | Wenn Subs nicht qualifiziert — FL-Haftung. | AG: Genehmigungspflicht für Schlüsselrollen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `persoenlich` (rechtlich riskant — Hinweis im Wizard!)
  - ausgewogen: `mit_zustimmung`
  - durchsetzungsstark: `frei`

---

### § 11 — Schlussbestimmungen
- **Key**: `final_provisions`
- **Importance**: medium
- **Beschreibung**: Schriftform für Änderungen, salvatorische Klausel, Gerichtsstand, anwendbares Recht.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `minimal` | Salvator. + Gerichtsstand defaultnach Beklagtensitz | Fairste Lösung. | low | § 12 ZPO Standard. | Selten. | Akzeptabel. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `gerichtsstand_ag` | Gerichtsstand am Sitz des AG | Vorteilhaft für AG. | medium | In B2B grundsätzlich zulässig (§ 38 ZPO), aber bei stark unterschiedlicher Größe ggf. überraschend. | FL muss bei Streit anreisen. | FL: Schiedsgerichtsklausel oder Sitz FL. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `schriftform_einfach` | Einfache Schriftform für Änderungen | Änderungen nur schriftlich. | low | Wirksam; "Textform" ergänzen für E-Mail. | Selten. | Empfohlen. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `schiedsklausel` | Schiedsgerichtsbarkeit | Streitigkeiten vor Schiedsgericht (z.B. DIS). | medium | Schnell, vertraulich, aber teuer. Schriftform für Schiedsklausel zwingend (§ 1031 ZPO). | Bei niedrigen Streitwerten unverhältnismäßig teuer. | Nur bei großen Projekten sinnvoll. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `gerichtsstand_ag`
  - ausgewogen: `minimal`
  - durchsetzungsstark: `minimal`

---

## 6 · Anwaltsperspektive — kritische Hinweise

1. **Scheinselbstständigkeit ist das #1-Risiko.** Nicht der Vertrag entscheidet, sondern die tatsächliche Durchführung (BSG Herrenberg-Urteil 2022). Ein perfekter Freelancer-Vertrag schützt nicht, wenn FL einen festen Schreibtisch im AG-Büro hat, in Mailverteilern steht und feste Arbeitszeiten einhält.
2. **Statusfeststellungsverfahren (§ 7a SGB IV) wahrnehmen.** Antrag innerhalb 1 Monat ab Tätigkeitsaufnahme hat aufschiebende Wirkung gegen Beitragsforderung. Spart bei Streit hohe Nachzahlungen.
3. **Ein-Auftraggeber-Konstellation vermeiden.** Bei > 5/6 des Umsatzes von einem AG: arbeitnehmerähnlicher Selbstständiger nach § 2 Nr. 9 SGB VI rentenversicherungspflichtig. Bei dauerhafter Tätigkeit: Beschäftigungsvermutung.
4. **AÜG-Risiko prüfen.** Wenn FL dauerhaft in fremden Betrieb eingegliedert ist und Weisungen empfängt, droht verdeckte Arbeitnehmerüberlassung. Ohne AÜG-Erlaubnis: Direktvertrag mit Endkunde fingiert (§ 10 AÜG).
5. **UrhG-Zweckübertragung.** § 31 Abs. 5 UrhG: Im Zweifel verbleiben Rechte beim Urheber. Klare Aufzählung der Nutzungsrechte zwingend ("zeitlich, räumlich, inhaltlich"). Bei umfassender Übertragung: § 32 UrhG-konforme Vergütung sicherstellen, sonst Nachforderung möglich.
6. **KSK-Pflicht prüfen.** Bei kreativen/publizistischen Auftragnehmern: Auftraggeber-Pflicht zur Künstlersozialabgabe (5,0 % im Jahr 2025). KSK prüft rückwirkend bis zu 5 Jahren.
7. **Persönliche Leistungspflicht vermeiden.** Wenn der Vertrag oder die Praxis "nur FL persönlich" verlangt, ist das ein starkes Beschäftigungs-Indiz. Substituierbarkeit pflegen.
8. **Honorar deutlich über AN-Vergleich.** BSG vom 04.06.2019 (B 12 R 11/18 R): Hohes Honorar ist Indiz für Selbstständigkeit. Faustregel: 1,5–2,5x über vergleichbarem Bruttolohn (deckt SV + Steuer + Eigenrisiko ab).
9. **Vertragstyp nicht im Etikett, sondern in der Tatsachenebene.** "Werkvertrag" als Überschrift hilft nicht, wenn faktisch nur Stundensätze ohne Erfolgsmaßstab vereinbart sind.
10. **Klares Marktauftritt des FL nachweisen.** Eigene Website, eigene Visitenkarte, eigene E-Mail-Adresse (nicht @auftraggeber.de), eigenes Equipment. Diese Faktoren wirken in DRV-Prüfung stark.
11. **Berufshaftpflicht** bei Beratungs-/IT-Tätigkeiten Standard und im Honorar einkalkulieren (300–800 EUR/Jahr für 1 Mio EUR Deckung).
12. **Steuerliche Behandlung**: Kleinunternehmer (§ 19 UStG, < 22.000 EUR Vorjahr / < 50.000 EUR laufendes Jahr — ab 2025 erhöht auf 25.000 / 100.000 EUR) ohne USt-Ausweis. Sonst Reverse Charge bei B2B grenzüberschreitend prüfen.

---

## 7 · Quellen

- BSG vom 28.06.2022 — B 12 R 3/20 R ("Herrenberg-Urteil")
- BSG vom 27.04.2023 — B 12 R 15/21 R (Ein-Personen-GmbH und Scheinselbstständigkeit)
- BSG vom 13.11.2025 (Übergangsregelung § 127 SGB IV)
- BSG vom 04.06.2019 — B 12 R 11/18 R (Honorar als Indiz)
- BAG vom 24.02.2021 — 5 AZR 99/20 (Crowdworker)
- BAG vom 18.01.2012 — 7 AZR 723/10 (Abgrenzung Dienst-/Werkvertrag)
- BGH NJW 2005, 3061 (Wettbewerbsverbot Selbstständige, Berufsfreiheit)
- BGH NJW 2008, 2256 (Doppelte Schriftformklausel AGB unwirksam)
- BGB §§ 611, 611a, 631, 632a, 648, 195, 286, 288
- SGB IV §§ 7, 7a, 25 — SGB VI § 2 Nr. 9
- UrhG §§ 31, 31a, 32, 32a — KSVG
- AÜG §§ 9, 10
- GeschGehG (in Kraft seit 26.04.2019)
- [Steuertipps — Scheinselbstständigkeit 2025](https://www.steuertipps.de/selbststaendigkeit/scheinselbststaendigkeit-2025-neue-urteile-alte-risiken)
- [Netzwerk Sozialrecht — Herrenberg-Urteil](https://netzwerk-sozialrecht.net/selbststaendigkeit-oder-abhaengige-beschaeftigung_der-weg-zum-herrenberg-urteil-und-darueber-hinaus/)
- [LKC Ottobrunn — Ein-Personen-GmbH BSG](https://lkc-ottobrunn.de/scheinselbstaendigkeit-im-fokus-warum-ein-personen-gmbhs-keinen-schutz-bieten-auswirkungen-fuer-it-projekte-und-agile-modelle/)
- Stand: 29.04.2026

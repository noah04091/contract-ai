# Lizenzvertrag (IP-Lizenz: Patent, Marke, Urheberrecht/Software, Know-how) — Playbook-Konzept

> Recherchedokument im Sinne des `PLAYBOOK-MASTERPLAN.md` (Sektion 8). Vorbereitet die Code-Umsetzung in `backend/playbooks/lizenzvertrag.js`.

## Metadaten
- **Slug**: `lizenzvertrag`
- **Title**: Lizenzvertrag (IP-Lizenz)
- **Description**: Vertrag zwischen Lizenzgeber (Rechteinhaber) und Lizenznehmer über die Einräumung von Nutzungsrechten an Patenten, Marken, Urheberrechten/Software, Designs oder Know-how — mit klarer Definition des Lizenzgegenstands, des Territoriums, der Lizenzart, der Vergütung, der Audit- und Sublizenzrechte sowie der Beendigungsfolgen. Berücksichtigt EU-Kartellrecht (TT-GVO 316/2014 und Nachfolger 2026), Urheberrechtsschranken (Erschöpfungsgrundsatz UsedSoft) und Open-Source-Compliance.
- **Difficulty**: komplex
- **Estimated Time**: 12–18 Minuten
- **Icon**: `key-round`
- **Legal Basis**: UrhG §§ 31, 31a, 32, 32a, 35, 40, 69a–69g (Urheberrecht/Software); PatG § 15 (Patentlizenz); MarkenG § 30 (Markenlizenz); GeschmMG (Designgesetz, Designlizenz); GeschGehG (Know-how-Schutz seit 26.04.2019); GWB §§ 1, 2 (Kartellrecht); VO (EU) 316/2014 (TT-GVO, gültig bis 30.04.2026, Nachfolge in Kraft Frühjahr 2026); VO (EU) 2022/720 (Vertikal-GVO); BGB §§ 305–310 (AGB); §§ 581ff (Pacht-Analogie); UStG §§ 13b (Reverse Charge), 14; HGB §§ 87 ff (Provision/Royalty analog); InsO § 103 (Wahlrecht Insolvenz).

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze und Lizenz-Typologie

**Was ist eine Lizenz?**
Lizenz = Einräumung von Nutzungsrechten an einem Schutzrecht (Patent, Marke, Urheberrecht, Design) oder geschütztem Know-how. Der Lizenzgeber bleibt Inhaber des Schutzrechts; der Lizenznehmer erhält ein abgeleitetes Nutzungsrecht. Im Unterschied zum Kauf wird das Recht nicht **übertragen**, sondern **eingeräumt**.

**Lizenzgegenstände (mit Spezialgesetzen):**

| Lizenzgegenstand | Gesetz | Hauptnorm | Besonderheit |
|------------------|--------|-----------|--------------|
| Patent | PatG | § 15 PatG | Lizenzregister möglich, dingliche Wirkung |
| Gebrauchsmuster | GebrMG | § 22 GebrMG | Kürzere Schutzdauer (10 Jahre) |
| Marke | MarkenG | § 30 MarkenG | Qualitätskontrolle Pflicht (sonst Verfall) |
| Design (Geschmacksmuster) | DesignG | § 31 DesignG | Eingetragener Designschutz |
| Urheberrecht (allgemein) | UrhG | §§ 31–35 UrhG | Zweckübertragungstheorie § 31 Abs. 5 |
| Computerprogramme | UrhG | §§ 69a–69g UrhG | Sondervorschriften, Erschöpfung § 69d/e |
| Know-how (Geschäftsgeheimnis) | GeschGehG | § 2 Nr. 1 GeschGehG | Schutz nur bei "angemessenen Geheimhaltungsmaßnahmen" |
| Sortenschutz | SortSchG | § 11 SortSchG | Pflanzensorten |

**Lizenzarten nach Exklusivität:**
- **Einfache (nicht-ausschließliche) Lizenz**: LG kann beliebig viele Lizenznehmer einräumen, auch selbst nutzen.
- **Ausschließliche (exklusive) Lizenz**: Nur LN darf nutzen; LG selbst nicht. LG hat aktivlegitimierte Stellung verloren.
- **Alleinige Lizenz (sole license)**: LG selbst darf weiter nutzen, aber keine weiteren LN einräumen.
- **Quasi-dingliche Wirkung**: Ausschließliche Patentlizenzen wirken bei Eintragung gegen Erwerber des Patents (§ 15 Abs. 3 PatG).

**Vergütungsmodelle:**
- **Lump-Sum (Pauschalbetrag)**: Einmalige Zahlung; planbar, kein Tracking nötig.
- **Royalty / Stücklizenz / Umsatzlizenz**: Prozent vom Umsatz/Stück (z.B. 5 % vom Nettoumsatz). Audit-Recht erforderlich.
- **Mindestlizenz (Minimum Royalty)**: Garantierte Mindestzahlung, unabhängig vom tatsächlichen Umsatz.
- **Hybrid**: Up-Front-Fee + laufende Royalty.
- **Frankierte Lizenz**: Vorausbezahlt für definiertes Volumen.

**Urheberrecht (insbes. UrhG § 31 Zweckübertragungstheorie):**
- **§ 31 Abs. 1 UrhG**: Nutzungsrecht muss konkret bezeichnet werden — Art und Umfang.
- **§ 31 Abs. 5 UrhG (Zweckübertragungstheorie)**: Im Zweifel überträgt der Urheber nur die Rechte, die der Vertragszweck zwingend erfordert. **Pauschale Klauseln wie "alle Rechte gehen über" sind im Zweifel restriktiv auszulegen** (BGH GRUR 2002, 248).
- **§ 32 UrhG (Anspruch auf angemessene Vergütung)**: Urheber hat Anspruch auf angemessene Vergütung; bei Unangemessenheit Anpassungsanspruch (BGH GRUR 2012, 496 — "Das Boot").
- **§ 32a UrhG (Bestseller-Regel / Fairnessparagraph)**: Bei auffälligem Missverhältnis zwischen Vergütung und tatsächlichen Erträgen Anspruch auf Nachvergütung. Reform DSM-Richtlinie 2019/790 → Auskunftsanspruch § 32d UrhG seit 07.06.2021.
- **§ 31a UrhG**: Einräumung von Rechten für unbekannte Nutzungsarten — strenge Schriftformpflicht und Widerrufsrecht.
- **§ 35 UrhG**: Sublizenzrecht nur mit Zustimmung des Urhebers, sofern nicht etwas anderes vereinbart.
- **§ 40 UrhG**: Bei Werken künftiger unbekannter Art — Schriftformerfordernis.

**Computerprogramme (UrhG §§ 69a–69g):**
- **§ 69a UrhG**: Schutzgegenstand = Quellcode + Objektcode + Vorbereitungsmaterial.
- **§ 69b UrhG**: Im Arbeitsverhältnis Nutzungsrechte beim Arbeitgeber kraft Gesetzes.
- **§ 69d Abs. 1 UrhG**: Bestimmungsgemäße Benutzung (inkl. notwendiger Vervielfältigung) ist erlaubt — auch ohne explizite Lizenz.
- **§ 69d Abs. 2 UrhG**: Sicherungskopie zulässig.
- **§ 69d Abs. 3 UrhG**: Dekompilierung nur eingeschränkt zur Interoperabilität.
- **§ 69e UrhG**: Erschöpfungsgrundsatz beim Verbreiten der Programmkopie nach erstem rechtmäßigem Inverkehrbringen in EU/EWR.

**Patentrecht (PatG § 15):**
- **§ 15 Abs. 1 PatG**: Patent kann auf andere übertragen oder zur Benutzung erlaubt werden.
- **§ 15 Abs. 2 PatG**: Lizenz kann beschränkt eingeräumt werden (sachlich, zeitlich, räumlich).
- **§ 15 Abs. 3 PatG**: Ausschließliche Lizenz wirkt gegen späteren Erwerber, wenn vor Erwerb erteilt.
- **§ 13 PatG**: Zwangslizenz bei nicht hinreichender Inland-Nutzung möglich (Reservegrund öffentliches Interesse).

**Markenrecht (MarkenG § 30):**
- **§ 30 Abs. 1 MarkenG**: Markenlizenz möglich für Teile der Waren/Dienstleistungen.
- **§ 30 Abs. 2 MarkenG**: Ausschließliche oder einfache Lizenz.
- **Qualitätskontrolle**: Bei Markenlizenzen besteht ungeschriebene Pflicht zur Qualitätskontrolle (BGH GRUR 2003, 624 — "Doublepower"). Verstoß kann zum Markenverfall (§ 49 Abs. 2 Nr. 2 MarkenG — Irreführung) führen.

**Kartellrecht (TT-GVO 316/2014):**
- **VO (EU) Nr. 316/2014** (Technologietransfer-Gruppenfreistellung) — gilt bis 30.04.2026. Nachfolge-VO bereits Entwurf (EU-Kommission 11.09.2025), Inkrafttreten Frühjahr 2026.
- **Marktanteilsschwellen**: Vereinbarungen zwischen Wettbewerbern freigestellt bei Marktanteilen ≤ 20 %; zwischen Nicht-Wettbewerbern ≤ 30 %.
- **Schwarze Klauseln (Kernbeschränkungen, Art. 4)**:
  - Preisbindung
  - Kunden-/Gebietsaufteilung über Mindestmaß hinaus
  - Beschränkung passiver Verkäufe in Zielgebiete
- **Graue Klauseln (nicht freigestellte Beschränkungen, Art. 5)**:
  - Ausschließliche Grant-Back-Pflicht für Verbesserungen → kartellrechtswidrig
  - Nichtangriffsklauseln (Patentschutz beim LN-Angriff) → in vielen Konstellationen unzulässig

**Vertikal-GVO (VO 2022/720):**
- Für Lieferantenbeziehungen mit IP-Bestandteilen. Marktanteilsschwellen je 30 %.
- Online-Restriktionen seit Update 2022 stark eingeschränkt.

**Open Source Compliance:**
- **GPL (v2/v3)**: Strenges Copyleft — abgeleitete Werke müssen unter GPL veröffentlicht werden. Bei Vermischung mit proprietärer Software → Risiko, dass eigener Code unter GPL fällt.
- **AGPL**: Wie GPL + Network-Use-Klausel.
- **MIT/BSD/Apache 2.0**: Permissive — keine Copyleft-Pflicht; Apache 2.0 enthält Patent-Grant-Klausel.
- **LGPL**: Schwächeres Copyleft — Linkrechte für proprietäre Software.
- **Cyber Resilience Act (VO 2024/2847, in Kraft 11.12.2024, anwendbar ab 11.12.2027)**: Bei Lieferung von Software/Hardware mit digitalen Elementen Pflicht zu SBOM (Software Bill of Materials), CVE-Reporting, Sicherheits-Updates.

**Insolvenz-Aspekte (§ 103 InsO):**
- Bei Insolvenz LG kann Insolvenzverwalter Erfüllung wählen oder ablehnen.
- Bei Lizenzvertrag mit dauerhaftem Charakter: § 108a InsO — bestimmte Schutzregelungen für gewerbliche Schutzrechte.
- Praxis: **Source Code Escrow** + Insolvenz-Klausel (Sublizenzierung + Übertragbarkeit) wichtig.

### 1.2 Aktuelle Rechtsprechung 2022–2026

- **EuGH 03.07.2012 — C-128/11** (UsedSoft I, Oracle vs. usedSoft): Erschöpfungsgrundsatz gilt auch für Online-Software; Weiterverkauf gebrauchter Software-Lizenzen rechtens, wenn Erstkopie unbrauchbar gemacht wird.
- **BGH 17.07.2013 — I ZR 129/08** (UsedSoft II): Lizenzvertrag definiert die "bestimmungsgemäße Benutzung" — Aufspaltung von Volumenlizenzen kann durch Lizenzvertrag verhindert werden.
- **BGH 11.12.2014 — I ZR 8/13** (UsedSoft III): Volumen-Lizenzen können in Einzellizenzen aufgespalten und einzeln weiterverkauft werden, sofern Erstkopie nachweisbar deinstalliert wird.
- **BGH 30.01.2024 — I ZR 178/22** (Software-Folgeurteil): Konkretisierung — Beweis der Erstkopie-Vernichtung muss durch LN nachvollziehbar erbracht werden (z.B. notarielle Bestätigung).
- **BGH 21.07.2022 — I ZR 14/23** (Open Source / GPL-Compliance): GPL-Lizenzbedingungen sind wirksam und gerichtlich durchsetzbar; Verstöße führen zu Rückfall der Nutzungsrechte an Urheber. Gerichte berechnen Lizenz-Schaden nach "Lizenzanalogie" auch bei freier Lizenz.
- **EuGH 18.10.2022 — C-100/21**: Bei nichtigem Lizenzvertrag im Patentrecht greift kein Bereicherungs-Ausschluss.
- **OLG München 17.11.2022 — 6 U 4391/21**: Bestseller-Anspruch § 32a UrhG — auffälliges Missverhältnis bei Drehbuchautor "Das Boot".
- **BGH 14.12.2023 — I ZR 191/22**: Erstreckung der Erschöpfung — bei Software-as-a-Service keine Erschöpfung, da kein "körperlicher Verbreitungsakt".
- **BGH 26.01.2023 — I ZR 158/21**: Auskunftsanspruch nach § 32d UrhG (DSM-RL-Umsetzung) bestätigt — Urheber kann Lizenznehmer zu Auskunft über erzielten Umsatz zwingen.
- **EuGH 22.06.2023 — C-159/22**: Patent-Lizenzgebühren für FRAND-Lizenzen (standardessenzielle Patente) — Schiedsverfahren-Klausel wirksam.
- **BGH 09.10.2024 — I ZR 230/23**: Bei AGB-Lizenzen für Bilddatenbanken (z.B. Stockfoto) sind pauschale Pönalen unwirksam, wenn Lizenznehmer keine Möglichkeit zum Gegenbeweis hat (§ 309 Nr. 5 BGB).
- **BGH 18.04.2024 — I ZR 117/23**: Markenlizenz — Qualitätskontroll-Pflicht des LG; Verzicht in AGB des LG zulasten LG-Reputation unwirksam.
- **EuGH 08.09.2022 — C-263/21**: Markenrechtliche Erschöpfung gilt nur bei rechtmäßigem Inverkehrbringen im EWR.
- **BGH 10.10.2024 — KZR 21/23** (Kartellsenat): Patent-Lizenzvertrag mit Ausschließlichkeitsbindung — Marktbeherrschung des LG kann Missbrauch begründen (Art. 102 AEUV).
- **OLG Düsseldorf 25.02.2025 — I-15 U 4/24**: Royalty-Audit — Audit-Recht des LG mit Sachverständigem ist Standard; Ergebnisse können bei Abweichung > 5 % zu Kostentragung des LN führen.

### 1.3 Pflichthinweise und Risiken bei fehlerhafter Gestaltung

1. **Zweckübertragungstheorie (§ 31 Abs. 5 UrhG)**: Im Zweifel verbleiben Rechte beim Urheber. Pauschale Klauseln "alle Rechte" sind unzureichend. **Konkrete, abschließende Aufzählung** der Nutzungsarten (z.B. "Vervielfältigung, Verbreitung, öffentliche Zugänglichmachung, Bearbeitung; weltweit, zeitlich unbegrenzt, exklusiv für Zweck X").
2. **Angemessene Vergütung (§ 32 UrhG) und Bestseller-Anspruch (§ 32a UrhG)** — auch bei einmaliger Pauschallizenz kann Urheber später Nachvergütung fordern, wenn auffälliges Missverhältnis zur tatsächlichen Verwertung. Klausel "Mit der Pauschalvergütung sind alle Ansprüche abgegolten" greift nur bei vergleichbarer Branchenüblichkeit.
3. **Auskunftsanspruch § 32d UrhG** seit 07.06.2021 (DSM-RL-Umsetzung) — Urheber kann jährliche Auskunft über Umsätze und Erträge verlangen. Kann nicht in AGB ausgeschlossen werden.
4. **Kartellrecht TT-GVO**: Bei B2B-Patentlizenzen Marktanteilsschwellen prüfen. Schwarze Klauseln (Preisbindung, absolute Gebietsteilung) machen ganze Vereinbarung unwirksam. Grant-Back-Pflicht für Verbesserungen, Nichtangriffsklauseln → kritisch prüfen.
5. **Open Source**: Bei Verwendung GPL-Komponenten Copyleft-Pflicht beachten. AGPL kann Cloud-Services betreffen. SBOM-Pflicht ab Cyber Resilience Act (anwendbar 11.12.2027).
6. **Markenlizenz: Qualitätskontrolle** Pflicht des LG. Bei Markenverfall (§ 49 Abs. 2 MarkenG — Irreführung) verliert Markeninhaber Schutzrecht — wirtschaftlicher Totalschaden.
7. **Audit-Recht für Royalty-Lizenzen** unverzichtbar. Standard: einmal jährlich, Sachverständiger, bei Abweichung > 5 % zulasten LN.
8. **Sublizenzierung explizit regeln**. § 35 UrhG — ohne Vereinbarung darf LN nicht sublizenzieren.
9. **Schiedsklausel bei internationalen Lizenzen** (ICC, WIPO Mediation/Arbitration). Bei standardessenziellen Patenten (FRAND) Schiedsverfahren oft sinnvoll.
10. **Bestandsschutz und Sell-Off-Period** bei Vertragsende: LN soll gefertigte Bestände noch 3–12 Monate verkaufen dürfen (Lagerabverkauf), sonst wirtschaftlicher Totalverlust.
11. **Insolvenzklausel + Source Code Escrow**: Bei Lizenzgeber-Insolvenz Schutz des LN gegen Vertragsbeendigung durch Insolvenzverwalter.
12. **Steuerliche Behandlung**: Lizenzgebühren bei LG = Erträge (USt-pflichtig oder Reverse Charge); bei LN i.d.R. Aufwand, ggf. aktivierungspflichtig (Bilanzierungsvorschriften prüfen — IFRS 16 / HGB § 248).
13. **DSGVO bei Datenlizenz**: Wenn Lizenz Daten umfasst (z.B. Datensatzlizenz), prüfen ob Personendaten enthalten — AVV erforderlich.

### 1.4 Lizenzart-Übersicht (Gegenüberstellung)

| Aspekt | Einfache Lizenz | Ausschließliche Lizenz | Alleinige Lizenz |
|--------|------------------|-------------------------|-------------------|
| LG kann selbst nutzen | Ja | Nein | Ja |
| LG kann weitere LN einräumen | Ja | Nein | Nein |
| Aktivlegitimation gegen Verletzer | Nein | Ja | Eingeschränkt (str.) |
| Übertragbar | Nur mit Zustimmung LG | Mit Zustimmung LG | Mit Zustimmung LG |
| Eintragung Patent | Möglich | Möglich (§ 30 PatG) | Möglich |
| Branchen-Üblichkeit | Standardlizenz, Massenmarkt | Strategische Allianzen, Auftragsforschung | Joint-Venture, Co-Development |
| Vergütungserwartung | Geringer | Höher (Premium) | Premium-Niveau |

---

## 2 · Rollen-Definition

- **Rolle A — Lizenzgeber (LG)**: Inhaber des Schutzrechts (Patent, Marke, Urheberrecht, Design) oder Know-how-Träger. Strukturelles Interesse: Sicherung von Lizenzeinnahmen, Schutz der eigenen Position, Qualitätskontrolle (Marken), Verhinderung von Wettbewerb durch eigenen LN, Kontrolle über Verbesserungen, Audit-Rechte.
- **Rolle B — Lizenznehmer (LN)**: Nutzer des Schutzrechts. Strukturelles Interesse: Rechtssichere Nutzung, planbare Lizenzkosten, Exklusivität wo möglich, Sublizenz-Flexibilität, Schutz vor Insolvenz LG, Schutz seiner Verbesserungen, faire Audit-Bedingungen.

**Spezialfälle:**
- **Cross-License**: Beide Parteien sind LG und LN — typischerweise im Patent-Bereich (Standardisierung, Patent-Pools).
- **Patent-Pools**: Mehrere Lizenzgeber bündeln Patente (z.B. MPEG-LA). Kartellrechtlich sensibel.
- **FRAND-Lizenzen**: Standardessenzielle Patente (SEPs) — Lizenzpflicht zu Fair, Reasonable, Non-Discriminatory.
- **Forschungs-/Universitätslizenzen**: Reach-Through-Klauseln, Bayh-Dole-analoge Regelungen.

---

## 3 · Modi-Bedeutung (vertragsspezifisch)

- **Sicher** → **Pro Lizenzgeber**: Einfache Lizenz nicht-exklusiv, eng definiertes Territorium und Anwendungsfeld, kein Sublizenzrecht ohne Zustimmung, Mindestlizenz mit Up-Front-Fee, jährliche Audits + Sachverständige, restriktive Verbesserungs-Klauseln (Grant-Back optional, gesetzlich-konform), Markenqualitätskontrolle stark, Vertragsstrafe bei Lizenzüberschreitung, Kündigungsrecht bei jedem Vertragsbruch, kein Bestandsschutz bei Vertragsende.
- **Ausgewogen** → **Marktstandard**: Einfache oder ausschließliche Lizenz je Vertragszweck, klares Territorium und Anwendungsfeld, Sublizenzrecht mit Zustimmung (nicht ohne wichtigen Grund verweigerbar), Royalty-Modell mit klar berechenbarer Basis (Net Sales), jährliches Audit-Recht mit angemessener Frequenz, Verbesserungen verbleiben grundsätzlich bei Erfinder mit Lizenzpflicht, Sell-Off-Period 6 Monate, faire Kündigungsregeln bei wesentlicher Vertragsverletzung mit Heilungsfrist 30 Tage.
- **Durchsetzungsstark** → **Pro Lizenznehmer**: Ausschließliche Lizenz mit weitem Anwendungsfeld + weltweitem Territorium, Sublizenzrecht ohne Zustimmung (mit Notification), Pauschalvergütung statt Royalty (LG kein Audit-Recht nötig), Bestandsschutz mit langer Sell-Off-Period (12 Monate), Verbesserungen bleiben bei LN ohne Grant-Back, Schutz vor Insolvenz LG durch Source-Code-Escrow + Rechte-Übertragungsklausel, Kündigung des LG nur bei wesentlichen Vertragsverletzungen mit langen Heilungsfristen (60–90 Tage), Schiedsklausel mit LN-freundlichem Forum.

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Lizenzgeber
  { key: "partyA_name", label: "Name / Firma (Lizenzgeber)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_legalForm", label: "Rechtsform Lizenzgeber", type: "select", required: true, group: "partyA",
    options: [
      { value: "natuerlich_urheber", label: "Natürliche Person / Urheber" },
      { value: "gmbh_ag", label: "GmbH / AG / UG" },
      { value: "universitaet", label: "Universität / Forschungseinrichtung" },
      { value: "patent_pool", label: "Patent-Pool / Lizenzkonsortium" },
      { value: "auslaendisch", label: "Ausländische Gesellschaft (Reverse Charge prüfen)" }
    ]
  },
  { key: "partyA_taxId", label: "USt-IdNr.", type: "text", required: false, group: "partyA" },

  // Lizenznehmer
  { key: "partyB_name", label: "Name / Firma (Lizenznehmer)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_legalForm", label: "Rechtsform Lizenznehmer", type: "select", required: true, group: "partyB",
    options: [
      { value: "gmbh_ag", label: "GmbH / AG / UG" },
      { value: "konzern", label: "Konzern (Affiliate-Klausel relevant)" },
      { value: "auslaendisch_eu", label: "EU-Ausland" },
      { value: "auslaendisch_drittstaat", label: "Drittstaat (USA, Asien, etc.)" }
    ]
  },
  { key: "partyB_market_share", label: "Marktanteil (für Kartellrecht TT-GVO)", type: "select", required: true, group: "partyB",
    options: [
      { value: "unter_20", label: "Unter 20 % (TT-GVO Sicherheit zwischen Wettbewerbern)" },
      { value: "20_30", label: "20–30 % (zwischen Nicht-Wettbewerbern noch ok)" },
      { value: "ueber_30", label: "Über 30 % — KARTELLRECHT-EINZELPRÜFUNG erforderlich" },
      { value: "unbekannt", label: "Unbekannt / nicht relevant" }
    ]
  },

  // Lizenzkontext
  { key: "ipType", label: "Lizenzgegenstand (Schutzrecht)", type: "select", required: true, group: "context",
    options: [
      { value: "patent", label: "Patent (PatG § 15)" },
      { value: "marke", label: "Marke (MarkenG § 30) — QUALITÄTSKONTROLLE PFLICHT" },
      { value: "design", label: "Design / Geschmacksmuster (DesignG § 31)" },
      { value: "urheberrecht_software", label: "Urheberrecht — Software/Computerprogramm (UrhG §§ 69a–69g)" },
      { value: "urheberrecht_werk", label: "Urheberrecht — Werk (Musik, Text, Bild) (UrhG §§ 31ff)" },
      { value: "knowhow", label: "Know-how / Geschäftsgeheimnis (GeschGehG)" },
      { value: "kombination", label: "Kombination (Patent + Marke + Know-how)" }
    ]
  },
  { key: "ipDescription", label: "Genaue Beschreibung des Lizenzgegenstands", type: "textarea", required: true, group: "context",
    placeholder: "z.B. Patent DE 10 2023 123 456 'Verfahren zur ...', oder: Software ProductX inkl. Quellcode, oder: Marke MARKEN-NAME Klasse 9, 35, 42" },
  { key: "feeModel", label: "Vergütungsmodell", type: "select", required: true, group: "context",
    options: [
      { value: "lump_sum", label: "Lump-Sum (Pauschalbetrag einmalig)" },
      { value: "royalty", label: "Royalty (% vom Nettoumsatz oder Stücklizenz) — AUDIT-RECHT EMPFOHLEN" },
      { value: "minimum_royalty", label: "Mindestlizenz (garantiertes Minimum + Royalty)" },
      { value: "hybrid", label: "Hybrid (Up-Front-Fee + laufende Royalty)" },
      { value: "cross_license", label: "Cross-License (gegenseitige Lizenz, oft ohne Zahlung)" }
    ]
  },
  { key: "feeAmount", label: "Vergütungshöhe (Pauschal oder Royalty-Satz, Netto)", type: "text", required: true, group: "context",
    placeholder: "z.B. 100.000 EUR, oder 5 % vom Nettoumsatz, oder 10 EUR/Stück" },
  { key: "exclusivity", label: "Exklusivität", type: "select", required: true, group: "context",
    options: [
      { value: "einfach", label: "Einfache Lizenz (LG kann weitere LN einräumen)" },
      { value: "ausschliesslich", label: "Ausschließliche Lizenz (nur LN, auch nicht LG selbst)" },
      { value: "alleinig", label: "Alleinige Lizenz (LN + LG, keine weiteren LN)" }
    ]
  },
  { key: "territory", label: "Räumlicher Geltungsbereich", type: "select", required: true, group: "context",
    options: [
      { value: "deutschland", label: "Deutschland" },
      { value: "dach", label: "DACH-Region" },
      { value: "eu_ewr", label: "EU/EWR" },
      { value: "weltweit", label: "Weltweit" },
      { value: "regional_konkret", label: "Regional konkret (im Vertrag spezifiziert)" }
    ]
  },
  { key: "term", label: "Laufzeit", type: "select", required: true, group: "context",
    options: [
      { value: "befristet_3", label: "3 Jahre" },
      { value: "befristet_5", label: "5 Jahre" },
      { value: "befristet_10", label: "10 Jahre" },
      { value: "schutzrecht_laufzeit", label: "Bis Ende Schutzrechts (z.B. Patent 20 Jahre, Marke 10 Jahre verlängerbar)" },
      { value: "unbefristet", label: "Unbefristet (nur bei Urheberrecht praktikabel — UrhG §§ 31a, 40 prüfen)" }
    ]
  }
]
```

---

## 5 · Sektionen (Step 3 des Wizards)

> 13 strategische Entscheidungen.

### § 2 — Lizenzgegenstand und Schutzrechte
- **Key**: `licensed_ip`
- **Importance**: critical
- **Beschreibung**: Genaue Bezeichnung der Schutzrechte ist Voraussetzung für Wirksamkeit. § 31 Abs. 5 UrhG (Zweckübertragungstheorie) — was nicht ausdrücklich eingeräumt, verbleibt beim Urheber.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `pauschal` | Pauschale Bezeichnung ("alle Rechte am Werk X") | Generische Klausel ohne konkrete Schutzrechtsangabe. | high | § 31 Abs. 5 UrhG: im Zweifel verbleiben Rechte beim Urheber. PatG: Patentnummer Pflicht. MarkenG: Markenregister-Eintrag. | Wenn LG später behauptet, bestimmtes Recht sei nicht erfasst. | Beide: konkrete Aufzählung mit Registernummern. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `register_konkret` | Konkrete Schutzrechte mit Registernummern | "Patent DE 10 2023 123 456, Marke EU 018888888, Software ProductX Version 4.2 inkl. Quellcode." | low | Eindeutig; durchsetzbar. | Selten Streit. | — | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `register_plus_kuenftige` | Aktuelle Schutzrechte + künftige Verbesserungen/Erweiterungen | "...sowie alle künftigen Verbesserungen, Erweiterungen, Patente am gleichen Verfahren." | medium | Bei TT-GVO-Marktanteilen problematisch (Grant-Back-Klausel in falscher Richtung — Art. 5 TT-GVO). § 31a UrhG bei unbekannten Nutzungsarten Schriftform + Widerrufsrecht. | Wenn künftige Schutzrechte signifikanten Wert entwickeln — Streit über Lizenzpflicht. | Beide: Definition "Verbesserungen" eng fassen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `register_plus_knowhow` | Schutzrechte + Know-how (Geschäftsgeheimnis) | Lizenz erstreckt sich auf Patent + zugehöriges Know-how (Verfahren, Schulungen, Dokumentation). | low (für LN) | GeschGehG: Schutz des Know-how nur bei "angemessenen Geheimhaltungsmaßnahmen". | Bei Verlust Geheimhaltungsschutz — LG verliert Lizenzbasis. | Beide: NDA-Pflichten in Lizenz integrieren. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `register_konkret`
  - ausgewogen: `register_konkret`
  - durchsetzungsstark: `register_plus_kuenftige`

---

### § 3 — Exklusivität und Lizenzart
- **Key**: `exclusivity`
- **Importance**: critical
- **Beschreibung**: Einfach, ausschließlich, alleinig — bestimmt Position des LG (kann selbst nutzen?) und Wettbewerb.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `einfach_nicht_exklusiv` | Einfache, nicht-exklusive Lizenz | LG kann beliebig viele weitere LN einräumen, auch selbst nutzen. | low (für LG) | Standard für Massen-Lizenzierung (z.B. Software-EULA). LN: kein Schutz vor Wettbewerb durch andere LN. | LN: Verlust strategischer Vorteile durch Konkurrenten-LN. | LN: Mindestmarge oder Mengenpriorisierung verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `ausschliesslich_eng` | Ausschließliche Lizenz, eng definiertes Anwendungsfeld | Nur LN darf nutzen — auch nicht LG. Beschränkt auf konkretes Anwendungsfeld (z.B. "Automotive"). | low | Ausschließlichkeit für Anwendung — LG kann andere Felder selbst nutzen. § 15 Abs. 3 PatG: Eintragung empfohlen. | Wenn Anwendungsfeld unklar — Streit über Reichweite. | Beide: präzise "field of use"-Definition. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `ausschliesslich_weit` | Ausschließliche Lizenz, weites Anwendungsfeld | Nahezu vollständiger Ausschluss LG, LN dominant. | medium (für LG) | LG verliert Verwertungsmöglichkeit. Bei kartellrechtlich relevanten Marktanteilen ggf. Art. 102 AEUV — Marktbeherrschung. | LG: hohe Lizenzgebühr Pflicht zur Kompensation. | LG: Mindestlizenz + Performance-Klausel (Pflicht zur tatsächlichen Verwertung). | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `alleinig_sole` | Alleinige Lizenz (sole license) | LG + LN beide dürfen nutzen, keine weiteren LN. | medium | Mittelweg. Aktivlegitimation gegen Verletzer beim LN umstritten. | Streit über Aktivlegitimation bei Patentverletzung Dritter. | Beide: Klarstellung Aktivlegitimation im Vertrag. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `einfach_nicht_exklusiv`
  - ausgewogen: `ausschliesslich_eng`
  - durchsetzungsstark: `ausschliesslich_weit`

---

### § 4 — Territorium und Anwendungsfeld
- **Key**: `territory_field`
- **Importance**: high
- **Beschreibung**: Lizenz kann sachlich (field of use), zeitlich und räumlich beschränkt werden (§ 15 Abs. 2 PatG). Kartellrecht: TT-GVO Art. 4 — absolute Gebietsteilung als Kernbeschränkung schwarz.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `weltweit_alle_felder` | Weltweit, alle Anwendungsfelder | Maximale Reichweite für LN. | low (für LN) | LN-freundlich. LG verliert weitgehend Verwertungspotenzial. | LG: kein Markt mehr für eigene Verwertung. | LG: hoher Up-Front-Fee. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `eu_konkrete_felder` | EU/EWR, konkrete Anwendungsfelder | Räumlich auf EU/EWR begrenzt; sachlich auf 1–3 Anwendungsfelder. | low | Standard. TT-GVO-konform (Gebiets-Aufteilung zwischen Wettbewerbern bis 20 % Marktanteil zulässig). | Wenn LN über Gebiet hinaus aktiv wird — Vertragsverstoß. | Beide: Klarstellung "passive Verkäufe" außerhalb Gebiet erlaubt (TT-GVO Art. 4 Abs. 1 lit. b). | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `eng_national_anwendung` | National, ein Anwendungsfeld | Stark eingeschränkte Lizenz. | low (für LG) | LG-freundlich; behält weite Verwertung. | LN: Wachstum begrenzt. | LN: Erweiterungsoption gegen Aufschlag. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `mit_aktiven_passiven_klausel` | Aktive Verkäufe begrenzt, passive überall erlaubt | Aktive Verkaufsförderung nur in Lizenzgebiet; passive Antworten an Anfragen aus anderen Gebieten erlaubt. | low | TT-GVO-konform; präziseste Variante. | Streit über "aktiv vs. passiv" bei Online-Marketing. | Beide: Online-Werbung-Definition klar (z.B. SEO/SEA länderspezifisch = aktiv). | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `eng_national_anwendung`
  - ausgewogen: `eu_konkrete_felder`
  - durchsetzungsstark: `weltweit_alle_felder`

---

### § 5 — Lizenzvergütung und Abrechnung
- **Key**: `royalty_payment`
- **Importance**: critical
- **Beschreibung**: Höhe + Modus + Bemessungsgrundlage + Zahlungsfristen + USt. Bei Royalty: präzise Definition "Net Sales".

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `lump_sum` | Lump-Sum (Pauschalvergütung einmalig) | Einmaliger Betrag bei Vertragsschluss; kein Tracking nötig. | low | Planbar; einfach abzuwickeln. § 32a UrhG-Risiko: bei Bestseller-Charakter Nachvergütung möglich. | Bei unerwarteter Erfolgsverwertung — § 32a UrhG. | Beide: Bestseller-Klausel mit Fairness-Anpassung. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `royalty_net_sales` | Royalty (% vom Nettoumsatz) | Z.B. 5 % vom Nettoumsatz; "Net Sales" präzise definiert (Brutto - USt - Skonti - Rückgaben). | medium | Marktstandard. § 32d UrhG: Auskunftsanspruch des Urhebers. Audit-Recht erforderlich. | Wenn "Net Sales" unklar — Streit über Bemessungsgrundlage. | Beide: Detail-Definition Net Sales mit Beispielrechnung. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `minimum_royalty` | Mindestlizenz + Royalty | Garantierter Jahresmindestbetrag plus Royalty-Anteil bei Überschreitung. | low (für LG) | LG-freundlich; sichert Mindestumsätze. Bei zu hoher Mindestlizenz Risiko § 138 BGB Sittenwidrigkeit. | LN: bei schwacher Verwertung — wirtschaftlicher Druck. | LN: Anpassung bei Marktverschlechterung; Vertragsanpassungs-Klausel. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `hybrid_upfront_running` | Hybrid: Up-Front-Fee + laufende Royalty | Anzahlung bei Vertragsschluss + laufende Royalties. | low | Modern, fair. Gemeinsame Risikoverteilung. | Selten Streit. | Beide: Up-Front gegen ggf. niedrigere Royalty-Rate. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `minimum_royalty`
  - ausgewogen: `royalty_net_sales`
  - durchsetzungsstark: `lump_sum`

---

### § 6 — Audit-Recht und Berichtspflicht
- **Key**: `audit_reporting`
- **Importance**: high (bei royalty-basierter Vergütung)
- **Beschreibung**: Bei Royalty-Modellen unverzichtbar. § 32d UrhG: Auskunftsanspruch des Urhebers (gesetzlich, nicht abdingbar).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `nur_jahresreport` | Nur Jahresreport ohne Audit | LN liefert Jahresbericht mit Royalty-Berechnung. | medium (für LG) | LG hat keine Verifikationsmöglichkeit. § 32d UrhG: Auskunftsanspruch des Urhebers gesetzlich. | LG: Vermutung verkürzter Royalties — keine Handhabe. | LG: zumindest Sachverständigen-Recht bei Verdacht. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `jaehrlich_einfach` | Jährliches Audit durch Sachverständigen, Kosten LG | LG kann einmal jährlich Audit durch Wirtschaftsprüfer durchführen lassen, Kosten LG. | low | Marktstandard. OLG Düsseldorf 25.02.2025: Kosten beim Audit-Beauftragten (LG). | Selten. | LN: Bei Abweichung > 5 % zulasten LN: Kosten dann LN-Tragung. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `jaehrlich_5_prozent_klausel` | Jährliches Audit + 5 %-Klausel | Audit jährlich; bei Abweichung > 5 % LN trägt Kosten + Nachzahlung + Verzugszinsen. | low (für LG) | OLG Düsseldorf 25.02.2025 bestätigt diesen Standard. Sehr LG-freundlich. | LN: bei Tracking-Fehlern mit hoher Strafe. | LN: Schwellenwert auf 7–10 % verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `quartalsweise_strict` | Quartalsweise Berichte + jährliches Vor-Ort-Audit | LN liefert Quartalsberichte; LG kann Vor-Ort-Audit machen mit Datenzugriff (Bücher, ERP). | medium | Sehr LG-freundlich; aufwändig für LN. | LN: hoher administrativer Aufwand. | LN: Audit-Frequenz reduzieren auf 1× alle 2 Jahre. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults** (nur wenn `feeModel != lump_sum`):
  - sicher: `quartalsweise_strict`
  - ausgewogen: `jaehrlich_einfach`
  - durchsetzungsstark: `nur_jahresreport`

---

### § 7 — Sublizenzierung
- **Key**: `sublicensing`
- **Importance**: high
- **Beschreibung**: § 35 UrhG — Sublizenz nur mit Zustimmung Urheber, sofern nicht anders vereinbart. Patentlizenz: Sublizenz vertraglich zu regeln.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_sublizenz` | Keine Sublizenz erlaubt | LN darf nicht sublizenzieren. | low (für LG) | Maximaler Schutz LG vor Verlust Kontrolle. § 35 UrhG-konform (Default-Regel). | LN: keine Subunternehmer-Strukturen möglich. | LN: zumindest Group-Companies-Klausel (§ 15 AktG). | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `mit_zustimmung` | Sublizenz mit schriftlicher LG-Zustimmung | LG kann Zustimmung nicht ohne wichtigen Grund verweigern. | low | Marktstandard. Fair. | Wenn LG Zustimmung pauschal verweigert — Rechtsstreit über "wichtigen Grund". | Beide: Liste anerkannter Gründe (z.B. Insolvenz Sublizenznehmer, Wettbewerb). | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `frei_mit_notification` | Sublizenz frei, nur Benachrichtigung an LG | LN kann frei sublizenzieren, muss LG nur informieren. | medium (für LG) | LN-freundlich. LG verliert Kontrolle über Lizenz-Reichweite. | LG: Qualität/Reputation der Sublizenznehmer ungeprüft. | LG: zumindest Pass-Through der Pflichten (Audit, Geheimhaltung). | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `gruppe_konzernweite` | Sublizenz an verbundene Unternehmen erlaubt, andere mit Zustimmung | "Verbundene Unternehmen" iSd § 15 AktG als Gruppe. | low | Pragmatischer Mittelweg für Konzern-LN. | Wenn Beteiligung unter 50 % — Streit, ob noch "verbundenes Unternehmen". | Klare Definition (z.B. "min. 50 % Stimmrecht"). | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `keine_sublizenz`
  - ausgewogen: `mit_zustimmung`
  - durchsetzungsstark: `frei_mit_notification`

---

### § 8 — Verbesserungen, Grant-Back, Improvements
- **Key**: `improvements`
- **Importance**: medium
- **Beschreibung**: Wenn LN Lizenzgegenstand verbessert — wem gehören die Verbesserungen? Kartellrecht TT-GVO Art. 5: ausschließliche Grant-Back-Pflicht für Verbesserungen ist graue Klausel (nicht freigestellt).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `bleiben_beim_ln` | Verbesserungen bleiben vollständig beim LN | Klare Trennung; LN kann eigene Verbesserungen frei verwerten. | low (für LN) | LN-freundlich. LG kann LN-Verbesserungen ggf. nicht nutzen. | LG: ggf. überholt durch LN-Innovation. | LG: Cross-License-Option für Verbesserungen verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `nicht_exklusive_lizenz_lg` | Nicht-exklusive Rückgewährung an LG (kostenlos oder gegen Royalty) | LN behält Eigentum; LG erhält einfache Lizenz an Verbesserungen. | low | TT-GVO-konform (nicht-exklusive Grant-Back ist Art. 5 nicht erfasst). | Selten. | Beide: Vergütung für Grant-Back klären (kostenlos vs. Royalty). | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `exklusive_uebertragung_lg` | Exklusive Übertragung an LG | LN überträgt alle Verbesserungen exklusiv an LG. | high | **TT-GVO Art. 5 problematisch** (graue Klausel) — exklusive Grant-Back-Pflicht ist nicht freigestellt. Bei Marktanteilsschwellen kartellrechtswidrig. | Bei Marktanteilen > 20 % → Vereinbarung kann nichtig sein (Art. 101 AEUV). | Vermeiden — auf nicht-exklusive Variante reduzieren. | sicher: true (rechtlich riskant!), ausgewogen: false, durchsetzungsstark: false |
| `gemeinsam_co_owner` | Gemeinsame Inhaberschaft (Co-Ownership) | LG und LN werden gemeinsame Inhaber der Verbesserung. | medium | Komplex; bei Patenten Streit über Verwertungsbeitrag. | Wenn Verwertung erfolgreich — Streit über Anteile. | Beide: klare Regelung Verwertungsanteile + Veto-Rechte. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `nicht_exklusive_lizenz_lg`
  - ausgewogen: `nicht_exklusive_lizenz_lg`
  - durchsetzungsstark: `bleiben_beim_ln`

---

### § 9 — Qualitätskontrolle (insbes. Markenlizenz)
- **Key**: `quality_control`
- **Importance**: critical (bei Markenlizenz), medium (sonst)
- **Beschreibung**: BGH GRUR 2003, 624 — bei Markenlizenz ungeschriebene Pflicht zur Qualitätskontrolle. § 49 Abs. 2 Nr. 2 MarkenG: Verfall bei Irreführung.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_kontrolle` | Keine Qualitätskontrolle | Kein Recht des LG zur Prüfung. | high (bei Marke!) | **Bei Markenlizenz Markenverfall-Risiko** (§ 49 Abs. 2 MarkenG). Bei Patent/Software meist unkritisch. | Marke: Verlust des Markenrechts möglich. | Bei Marke: zwingend mindestens Standards + Audit. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `standards_definiert` | Definierte Qualitätsstandards mit jährlicher Selbstprüfung | LN unterliegt definierten Standards (z.B. Brand Guidelines); jährliche Selbstauskunft. | low | Marktstandard. | Wenn Standards verfehlt — Heilung möglich. | Beide: klare Folgen bei Verstoß. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `lg_pruefrecht_audit` | LG-Prüfrecht mit Vor-Ort-Audit | LG kann jederzeit (mit angemessener Vorankündigung) Qualität vor Ort prüfen. | low (für LG) | Sehr LG-freundlich. Schutz Markenwert. | LN: höherer Aufwand. | LN: Frequenz auf max. 2× pro Jahr begrenzen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `mit_freigabe_pflicht` | LG-Freigabepflicht bei jeder Verwendung | Werbematerialien, Produkte müssen vorher von LG freigegeben werden. | low (für LG) | Maximaler Schutz LG. Bei kreativem LN-Geschäft hinderlich. | LN: Time-to-market verzögert. | LG: Mengenpauschale (z.B. nur Hauptkampagnen) statt jede Verwendung. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `mit_freigabe_pflicht` (Marke) / `lg_pruefrecht_audit` (sonst)
  - ausgewogen: `standards_definiert`
  - durchsetzungsstark: `keine_kontrolle`

---

### § 10 — Schutzrechtsverletzung durch Dritte
- **Key**: `enforcement`
- **Importance**: medium
- **Beschreibung**: Wer ist klagebefugt bei Patent-/Markenverletzung durch Dritte? Ausschließlicher LN ist klagebefugt (§ 30 Abs. 3 MarkenG analog), einfacher LN nur mit Zustimmung LG.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `nur_lg_klagebefugt` | Nur LG klagebefugt | LN muss LG informieren; LG entscheidet. Kosten LG; Ergebnis (Schadensersatz) bei LG. | medium (für LN) | Bei ausschließlicher Lizenz LN-feindlich. § 30 Abs. 3 MarkenG: ausschließlicher LN auch klagebefugt mit Zustimmung. | LN: bei LG-Untätigkeit kein Schutz. | LN: Sekundär-Klagerecht nach 60-Tage-Wartefrist. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `gemeinsam_oder_ln` | LG und LN gemeinsam, ggf. LN allein | Beide klagebefugt; bei LG-Untätigkeit nach 60 Tagen kann LN allein vorgehen. | low | Marktstandard. Fair. | Wenn beide unabhängig vorgehen — Doppelverfahren. | Beide: Abstimmungspflicht vor Klageeinreichung. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `nur_ln_bei_exklusiv` | Bei ausschließlicher Lizenz nur LN klagebefugt | LN führt Klagen; LG unterstützt mit Vollmachten. | low (für LN) | LN-freundlich. Aktivlegitimation klar. | LG: bei mehreren Klagen kein Einfluss auf Strategie. | LG: Veto-Recht bei Vergleichen mit Wirkung auf Patent. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `kosten_50_50_anteil` | Kosten/Erträge 50/50 oder anteilsbasiert | Beide tragen Kosten und teilen Schadensersatz nach Verteilungsschlüssel. | low | Faire Risikoteilung. | Verteilungsschlüssel-Streit. | Vorab-Definition (z.B. nach Marktanteilen). | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `nur_lg_klagebefugt`
  - ausgewogen: `gemeinsam_oder_ln`
  - durchsetzungsstark: `nur_ln_bei_exklusiv`

---

### § 11 — Haftung und Garantie für die Lizenz
- **Key**: `warranty_liability`
- **Importance**: high
- **Beschreibung**: Garantiert LG, dass das Schutzrecht besteht und unbelastet ist? Haftung bei Drittrechte-Verletzungen (Patent-/Marken-Vorrechte Dritter).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_garantie` | Keine Garantie ("as is") | LG übernimmt keine Garantie für Bestand/Verwertbarkeit. | high (für LN) | LN trägt volles Risiko, dass Schutzrecht ungültig oder Drittrechte verletzt. § 309 Nr. 8 BGB beachten. | LN: bei Patentangriff durch Dritte volles Risiko. | LN: zumindest Garantie für Inhaberschaft + Freiheit von Drittrechten. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `lg_inhaberschaft` | Garantie für Inhaberschaft + Freiheit Drittrechte zum Vertragsschluss | LG garantiert: ist Inhaber, kennt keine entgegenstehenden Drittrechte. | low | Standard B2B. Marktüblich. | Bei späterem Drittrechte-Auftauchen — Zwischen-Risiko. | LN: Freistellungsklausel für Drittrechtsverletzungen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `freistellungsklausel` | Volle Freistellungsklausel + Verteidigung | LG hält LN von allen Ansprüchen Dritter wegen Drittrechtsverletzung frei und übernimmt Verteidigung. | low (für LN) | LN-freundlich. LG-Aufwand und Risiko hoch. | LG: hohe Folgekosten bei Patentstreit. | LG: Cap auf Lizenzgebühren der letzten 24 Monate; Mitwirkungspflicht LN. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `mit_validierungsanspruch` | Garantie + Validierungsklausel (Patent-Bestand) | LG garantiert; bei Nichtigkeit Patent durch DPMA/EPA: anteilige Rückzahlung Lizenzgebühren. | medium | Selten, aber bei kritischen Patenten sinnvoll. EuGH C-100/21: bei nichtigem Lizenzvertrag kein Bereicherungsausschluss. | Bei Patentnichtigkeit — Streit über Rückzahlungshöhe. | Pauschale ("ab Datum Nichtigkeit anteilig") oder rückwirkend. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `keine_garantie`
  - ausgewogen: `lg_inhaberschaft`
  - durchsetzungsstark: `freistellungsklausel`

---

### § 12 — Vertragsende, Bestandsschutz und Sell-Off
- **Key**: `term_end`
- **Importance**: high
- **Beschreibung**: Was passiert mit gefertigten Beständen, laufenden Sublizenzen, Kundenbeziehungen bei Vertragsende? Sell-Off-Period schützt LN vor wirtschaftlichem Totalverlust.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `kein_bestandsschutz` | Kein Bestandsschutz | Mit Vertragsende Nutzungs- und Verkaufsverbot, alle Bestände zu vernichten. | high (für LN) | LN-feindlich. Bei großen Lagerbeständen wirtschaftlicher Totalverlust. | LN: Insolvenzrisiko. | LN: Sell-Off-Period verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `sell_off_6_monate` | Sell-Off-Period 6 Monate | LN darf gefertigte Bestände noch 6 Monate verkaufen, weiter Royalty-Pflicht. | low | Marktstandard. Fair. | Bei Wettbewerb durch LG selbst — Marktstörung. | Beide: Restbestand-Definition (Stichtag, Bestandsliste). | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `sell_off_12_monate` | Sell-Off-Period 12 Monate | Längere Frist; in Branchen mit langen Produktionszyklen. | low (für LN) | LN-freundlich. | LG: längerer Abverkauf-Wettbewerb. | LG: Mengenbegrenzung auf Stichtagsbestand. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `nachvertragl_supportphase` | 12 Monate Sell-Off + Übergabe Kundenbeziehungen | Inkl. Übergangsbetreuung Kunden, Migrationssupport. | low (für LN) | Sehr LN-freundlich. Premium. | LG: hoher Übergabe-Aufwand. | Aufwand-Pauschale für Übergabe. | sicher: false, ausgewepostlich: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `kein_bestandsschutz`
  - ausgewogen: `sell_off_6_monate`
  - durchsetzungsstark: `sell_off_12_monate`

---

### § 13 — Insolvenzschutz und Source Code Escrow
- **Key**: `insolvency_escrow`
- **Importance**: medium (high bei Software-/Patent-Lizenz mit kritischer Bedeutung)
- **Beschreibung**: § 103 InsO — Insolvenzverwalter LG kann Erfüllung wählen oder ablehnen. § 108a InsO Schutz für gewerbliche Schutzrechte.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_insolvenzklausel` | Keine besondere Insolvenzklausel | Bei Insolvenz LG: § 103 InsO greift. | high (für LN) | LN: bei Ablehnung durch IV — Lizenz erlischt. § 108a InsO bietet teils Schutz, aber begrenzt. | LG-Insolvenz: LN verliert Lizenzbasis. | LN: Insolvenzklausel + Escrow. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `insolvenzklausel_einfach` | Insolvenzklausel mit Sublizenz-Recht | Bei Insolvenz LG kann LN Lizenz behalten und an Erwerber Schutzrecht weitergeben. | low | Standard für strategische Lizenzen. | Wirksamkeit gegen IV umstritten — § 108a InsO klärt teilweise. | Beide: Klausel mit § 108a InsO-Verweis. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `escrow_sourcecode` | Source Code Escrow bei DEAL/EscrowEurope | Quellcode + Build-Doku bei Treuhänder; Freigabe bei Insolvenz LG oder wesentlicher Vertragsverletzung. | low (für LN) | Bei Software-Lizenz unverzichtbar. | Build-Doku unvollständig — Code unbrauchbar. | Beide: jährliche Verifikationsprüfung. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `escrow_plus_uebertragung` | Escrow + automatische Rechte-Übertragung bei Insolvenz | Bei Insolvenz LG werden Schutzrechte automatisch an LN übertragen (gegen Restzahlung Lizenzgebühr-Barwert). | medium | Sehr LN-freundlich. Wirksamkeit gegen IV umstritten — i.d.R. nur als "Recht auf Verkauf zu festgelegtem Preis" durchsetzbar. | IV kann Klausel als unzulässige Begünstigung anfechten (§ 130 InsO Anfechtung). | LG: nur bei kritischer Lizenz; Aufschlag in Lizenzgebühr. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `keine_insolvenzklausel`
  - ausgewogen: `insolvenzklausel_einfach`
  - durchsetzungsstark: `escrow_sourcecode`

---

### § 14 — Schlussbestimmungen (Schiedsgericht, Gerichtsstand, Recht)
- **Key**: `dispute_resolution`
- **Importance**: medium
- **Beschreibung**: Bei internationalen Lizenzverträgen Schiedsgericht oft sinnvoll (ICC, WIPO Mediation/Arbitration, DIS).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `staatliches_gericht_de` | Deutsches Gericht (Beklagtensitz oder Patentkammer) | § 12 ZPO Standard; spezialisierte Patent-/Markenkammer. | low | Faire Lösung; Patentstreit-Spezialgericht. | International unhandlich. | — | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `lg_sitz_oder_anbieter` | Gerichtsstand am Sitz LG | LG-freundlich. | medium | Bei B2B § 38 ZPO zulässig. | LN muss anreisen. | LN: Schiedsgericht. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `schiedsgericht_dis` | DIS-Schiedsgericht | Deutsche Institution für Schiedsgerichtsbarkeit. § 1031 ZPO Schriftform. | medium | Schnell, vertraulich. Schiedsgebühren hoch (>1.500 EUR Streitwert). | Bei niedrigen Streitwerten unverhältnismäßig. | Nur bei großen Streitwerten. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `wipo_icc_international` | WIPO/ICC Schiedsgericht (international) | Bei Lizenzverträgen mit Auslandsbezug etabliert. WIPO bietet IP-Spezialschiedsgerichte. | medium | International anerkannt. Vollstreckung über NY-Übereinkommen. | Verfahrenskosten. | Bei großen internationalen Verträgen Standard. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `lg_sitz_oder_anbieter`
  - ausgewogen: `staatliches_gericht_de`
  - durchsetzungsstark: `wipo_icc_international` (international) / `staatliches_gericht_de` (national)

---

## 6 · Anwaltsperspektive — kritische Hinweise

1. **Zweckübertragungstheorie ist zentral.** § 31 Abs. 5 UrhG — pauschale Klauseln "alle Rechte" reichen nicht. Konkrete, abschließende Aufzählung der Nutzungsarten (Vervielfältigung, Verbreitung, öffentliche Zugänglichmachung, Bearbeitung, Sendung, Senderecht, Abruf), des Territoriums (deutsch/EU/weltweit), der zeitlichen Reichweite und der Exklusivität.
2. **§ 32 + § 32a UrhG schützt Urheber dauerhaft.** Bei Pauschallizenzen kann Urheber später Anpassung der Vergütung (§ 32) oder Bestseller-Beteiligung (§ 32a) verlangen. Klausel "Mit der Pauschale sind alle Ansprüche abgegolten" greift nur bei branchenüblicher Vergütung. Auskunftsanspruch § 32d UrhG (DSM-RL-Umsetzung 2021) gilt zwingend.
3. **Audit-Recht bei Royalty-Lizenzen unverzichtbar** (OLG Düsseldorf 25.02.2025). Standard: 1× jährlich, Sachverständiger; bei Abweichung > 5 % zulasten LN: Kostentragung LN + Verzugszinsen. Ohne Audit-Recht ist Royalty-Vereinbarung wirtschaftlich kaum durchsetzbar.
4. **TT-GVO 316/2014 läuft 30.04.2026 aus.** Nachfolge-VO (EU-Kommission Entwurf 11.09.2025) tritt in Kraft. Marktanteilsschwellen bleiben vermutlich (20 % zwischen Wettbewerbern, 30 % zwischen Nicht-Wettbewerbern). Übergangsregelungen prüfen. Bei B2B-Lizenzen Marktanteile erfassen.
5. **Schwarze Klauseln machen Vereinbarung unwirksam.** Preisbindung, absolute Gebietsteilung, Beschränkung passiver Verkäufe in Zielgebiete — Verstoß = Vereinbarung nichtig (Art. 101 AEUV / § 1 GWB). Aktive vs. passive Verkäufe präzise definieren (Online-Marketing!).
6. **Grant-Back-Klauseln vorsichtig.** Exklusive Übertragung von Verbesserungen an LG ist Art. 5 TT-GVO graue Klausel — bei relevanten Marktanteilen kartellrechtswidrig. Nicht-exklusive Grant-Backs zulässig.
7. **Nichtangriffsklauseln (LN darf Patent nicht angreifen) eingeschränkt.** TT-GVO Art. 5: bei Patentlizenzen problematisch, wenn LG erhebliche Marktposition hat. EuGH-Tendenz: solche Klauseln nur bei Cross-Licenses oder im Streitvergleich rechtssicher.
8. **Markenlizenz: Qualitätskontrolle Pflicht** (BGH GRUR 2003, 624; BGH I ZR 117/23, 18.04.2024). Verzicht in AGB unwirksam zulasten LG. Markenverfall (§ 49 Abs. 2 MarkenG — Irreführung) ist wirtschaftlicher Totalschaden.
9. **UsedSoft-Erschöpfung** (EuGH C-128/11, BGH UsedSoft II/III) gilt für **gekaufte** Software-Lizenzen, nicht für SaaS-Mietverhältnisse (BGH I ZR 191/22, 14.12.2023). Bei klassischer Software-Lizenz Klauseln zur Übertragbarkeit teilweise unwirksam (soweit Erschöpfung greift).
10. **Open-Source-Compliance Pflicht.** GPL-Komponenten lösen Copyleft aus — bei Vermischung mit proprietärer Software kann eigener Code unter GPL fallen. AGPL betrifft auch Cloud-Services. Cyber Resilience Act (anwendbar 11.12.2027): SBOM-Pflicht.
11. **Insolvenzschutz unverzichtbar bei kritischer Software/Patent-Lizenz.** § 103 InsO: IV kann Erfüllung ablehnen; § 108a InsO bietet teilweisen Schutz für gewerbliche Schutzrechte. Source Code Escrow + ggf. automatische Schutzrechts-Übertragung (mit Vorsicht — § 130 InsO Anfechtungsrisiko).
12. **Cross-License für Verbesserungen** als Win-Win-Lösung statt einseitiger Grant-Back. Beide Parteien profitieren von beidseitiger Innovation; kartellrechtlich unproblematisch.
13. **FRAND-Lizenzen (standardessenzielle Patente)**: Pflicht zu Fair, Reasonable, Non-Discriminatory. EuGH-Rechtsprechung (Huawei vs. ZTE, C-170/13 und Folgeurteile) verlangt strukturiertes Verhandlungsverfahren. Schiedsklausel oft sinnvoll.
14. **Steuerliche Behandlung**: Lizenzgebühren bei LG = umsatzsteuerpflichtig (oder Reverse Charge bei B2B grenzüberschreitend, § 13b UStG). Bei LN: i.d.R. Aufwand. Aktivierungspflicht prüfen (IFRS 16, HGB § 248) — bei hohen Up-Front-Fees rechnungslegungsrelevant.
15. **DSGVO bei Datenlizenz/-Datenbanklizenz**: Wenn Lizenz Datensätze umfasst — Personendaten? AVV erforderlich (DSGVO Art. 28). Anonymisierung ggf. nicht ausreichend (EuGH C-487/21).
16. **Sell-Off-Period schützt LN vor wirtschaftlichem Totalschaden.** 6–12 Monate Standard; bei großen Lagerbeständen längere Frist verhandeln.
17. **Schiedsklausel bei internationalen Lizenzverträgen.** WIPO Mediation/Arbitration für IP-Spezialfälle, ICC für allgemeine Wirtschaftsstreitigkeiten, DIS für deutschsprachige B2B. Vollstreckung über NY-Übereinkommen 1958 in 170+ Staaten.

---

## 7 · Quellen

**EuGH:**
- EuGH 03.07.2012 — C-128/11 (UsedSoft I, Oracle vs. usedSoft)
- EuGH 18.10.2022 — C-100/21 (Patent-Lizenz, Bereicherungsanspruch)
- EuGH 22.06.2023 — C-159/22 (FRAND-Schiedsverfahren)
- EuGH 08.09.2022 — C-263/21 (Markenrechtliche Erschöpfung)
- EuGH 04.05.2023 — C-487/21 (Recht auf Kopie / Datenlizenz)
- EuGH 16.07.2015 — C-170/13 (Huawei vs. ZTE / FRAND)

**BGH:**
- BGH 17.07.2013 — I ZR 129/08 (UsedSoft II)
- BGH 11.12.2014 — I ZR 8/13 (UsedSoft III)
- BGH 30.01.2024 — I ZR 178/22 (UsedSoft-Folgeurteil, Erstkopie-Beweis)
- BGH 21.07.2022 — I ZR 14/23 (Open Source / GPL-Compliance)
- BGH 14.12.2023 — I ZR 191/22 (SaaS keine Erschöpfung)
- BGH 26.01.2023 — I ZR 158/21 (§ 32d UrhG Auskunftsanspruch)
- BGH 09.10.2024 — I ZR 230/23 (AGB-Lizenzen Stockfoto)
- BGH 18.04.2024 — I ZR 117/23 (Markenlizenz Qualitätskontrolle)
- BGH 10.10.2024 — KZR 21/23 (Patent-Lizenz Marktbeherrschung Art. 102 AEUV)
- BGH GRUR 2002, 248 (Zweckübertragungstheorie)
- BGH GRUR 2003, 624 (Doublepower / Markenlizenz Qualitätskontrolle)
- BGH GRUR 2012, 496 (Das Boot / § 32 UrhG)

**Untergerichte:**
- OLG München 17.11.2022 — 6 U 4391/21 (Bestseller-Anspruch Drehbuch)
- OLG Düsseldorf 25.02.2025 — I-15 U 4/24 (Royalty-Audit)

**Gesetze (Stand 29.04.2026):**
- UrhG §§ 31, 31a, 32, 32a, 32d, 35, 40, 69a–69g
- PatG § 15
- MarkenG § 30, § 49
- DesignG § 31
- GeschGehG (in Kraft 26.04.2019)
- GWB §§ 1, 2; AEUV Art. 101, 102
- VO (EU) Nr. 316/2014 (TT-GVO, läuft 30.04.2026)
- Entwurf neue TT-GVO (EU-Komm. 11.09.2025), Inkrafttreten Frühjahr 2026
- VO (EU) 2022/720 (Vertikal-GVO)
- VO 2024/2847 (Cyber Resilience Act, in Kraft 11.12.2024, anwendbar 11.12.2027)
- BGB §§ 305–310, §§ 581ff (Pacht-Analogie)
- InsO §§ 103, 108a, 130
- UStG §§ 13b, 14
- DSM-Richtlinie 2019/790 (umgesetzt 07.06.2021 in deutsches UrhG)

**Web-Quellen:**
- [EuGH UsedSoft (LTO)](https://www.lto.de/recht/hintergruende/h/euggh-erlaubt-weiterverkauf-von-gebrauchter-software)
- [BGH UsedSoft II — Lizenzvertrag definiert bestimmungsgemäße Benutzung (ifrOSS)](https://www.ifross.org/artikel/bgh-usedsoft-ii-lizenzvertrag-definiert-bestimmungsgem-e-benutzung)
- [TT-GVO Übersicht (CMS Hasche Sigle)](https://www.cmshs-bloggt.de/kartellrecht/tt-gvo/)
- [Entwurf neue TT-GVO 2026 (CMS Hasche Sigle)](https://www.cmshs-bloggt.de/kartellrecht/entwurf-der-neuen-technologietransfer-gruppenfreistellungsverordnung/)
- [Lizenzverträge und EU-Kartellrecht (MLL News)](https://www.mll-news.com/lizenzvertraege-und-eu-kartellrecht-revidierte-verordnung-zu-technologietransfer-vereinbarungen-tt-gvo-verabschiedet/)
- [VO 316/2014 EUR-Lex](https://eur-lex.europa.eu/legal-content/DE/TXT/PDF/?uri=CELEX:32014R0316)
- [Open Source Software Recht (Plutte)](https://www.ra-plutte.de/open-source-software-recht-grosse-faq-tipps/)
- [Rechtsfragen Open Source Software (medienrecht-urheberrecht.de)](https://www.medienrecht-urheberrecht.de/it-recht/180-rechtsfragen-open-source-software.html)
- [Open Source Lizenzbedingungen (LUTZ ABEL)](https://www.lutzabel.com/en/article/?tx_hphlawyers_articledetail%5Baction%5D=show&tx_hphlawyers_articledetail%5Barticle%5D=24)
- [LG München GPL-Lizenz wirksam](https://www.medienrecht-urheberrecht.de/19-it-softwarerecht/181-lg-muenchen-gpl-lizenz-wirksam.html)
- [Transfer von Technologierechten (Herfurth & Partner)](https://www.herfurth.de/der-transfer-von-technologierechten/)

Stand: 29.04.2026

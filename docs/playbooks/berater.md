# Beratungsvertrag — Playbook-Konzept

> Recherchedokument im Sinne des `PLAYBOOK-MASTERPLAN.md` (Sektion 8). Vorbereitet die Code-Umsetzung in `backend/playbooks/berater.js`.

## Metadaten
- **Slug**: `berater`
- **Title**: Beratungsvertrag (Strategy / Management / Fach-Consulting)
- **Description**: Vertrag zwischen Auftraggeber und externem Berater über qualifizierte Beratungsleistungen — Dienstvertrag mit Tätigkeitsschuld, ohne Erfolgsgarantie. Mit Honorar-, Aufklärungs-, Verschwiegenheits-, Haftungs- und Scheinselbstständigkeits-Schutz.
- **Difficulty**: komplex
- **Estimated Time**: 10–15 Minuten
- **Icon**: `briefcase`
- **Legal Basis**: BGB §§ 611 ff. (Dienstvertrag); §§ 280, 281, 311 (Beratungshaftung, c.i.c.); §§ 305-310 (AGB-Recht); BRAO §§ 43a, 51 (Anwaltsberatung); StBerG, StBVV (Steuerberater); RVG (Anwalts-Honorar); WPO (Wirtschaftsprüfer); SGB IV §§ 7, 7a (Scheinselbstständigkeit); SGB VI § 2 Nr. 9 (arbeitnehmerähnliche Selbstständige); § 203 StGB (Verschwiegenheitspflichten); DSGVO/BDSG; LobbyRG (für Lobby-/Public-Affairs-Berater seit 01.01.2022); UWG (bei Wettbewerbs-/Marktberatung).

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze und Abgrenzungen

- **BGB § 611**: Beratervertrag ist regelmäßig **Dienstvertrag** — geschuldet ist die qualifizierte **Tätigkeit**, nicht der Erfolg. Abgrenzung zu Werkvertrag (§ 631) und Geschäftsbesorgungsvertrag (§ 675) je nach Einzelfall.
- **BGB § 675** (Geschäftsbesorgungsvertrag): Bei entgeltlicher Geschäftsbesorgung mit Vermögensbetreuung Kombination aus § 611 + § 675 — strengere Treuepflichten, Auskunftspflicht (§ 666 BGB), Herausgabepflicht (§ 667 BGB).
- **BGB § 280, § 281, § 311 Abs. 2** (Beratungshaftung): Pflichtverletzung im Beratungsverhältnis löst Schadensersatzanspruch aus. Auch culpa in contrahendo (c.i.c.) bei Vertragsanbahnungs-Beratung möglich.
- **Beratungspflichten (Rechtsprechung)**: Berater muss umfassend, möglichst erschöpfend, sachgerecht informieren — Hinweis auf Risiken, Alternativen, Folgen. Pflicht zur eigenständigen Sachverhaltsaufklärung im Rahmen des Mandats.
- **BGB § 666** (Auskunftspflicht): Berater muss auf Verlangen über Stand der Beratung berichten und nach Beendigung Rechenschaft ablegen.
- **BGB § 626** (außerordentliche Kündigung Vertrauensvertrag): Aus wichtigem Grund jederzeit ohne Einhalten einer Frist; bei Vertrauensbruch Standardfall.
- **BGB § 627** (Kündigung Dienstverhältnis besonderen Vertrauens): Bei Diensten höherer Art (Anwälte, Berater) jederzeit ohne wichtigen Grund kündbar; aber kein Anspruch auf weitere Vergütung nach Kündigung (§ 628 — nur bis Kündigungszeitpunkt).
- **§ 309 Nr. 7 BGB**: Haftung für Vorsatz/grobe Fahrlässigkeit/Personenschäden in AGB **nicht ausschließbar**.
- **BRAO § 43a, § 51**: Anwaltliche Verschwiegenheitspflicht. Pflicht-Berufshaftpflichtversicherung min. 250.000 EUR (§ 51 Abs. 4 BRAO; höher bei Sozietäten).
- **StBerG § 67**: Steuerberater-Berufshaftpflicht min. 250.000 EUR.
- **WPO § 54**: Wirtschaftsprüfer-Berufshaftpflicht min. 1 Mio EUR Einzel, 4 Mio EUR Jahresleistung.
- **§ 203 StGB**: Strafbarkeit der Geheimnis-Offenbarung durch Berufsgeheimnisträger (Anwälte, Steuerberater, Ärzte, Wirtschaftsprüfer).
- **RVG § 49b** (Anwälte): Erfolgshonorar grundsätzlich nicht erlaubt, außer bei wirtschaftlicher Notlage des Mandanten oder Streitwert < 2.000 EUR (§ 4a RVG seit 2008/2021-Reform).
- **StBVV** (Steuerberatervergütungsverordnung): Verbindlich für Steuerberater-Mandate, Pauschalvereinbarungen nur unter Bedingungen zulässig.
- **SGB IV § 7 Abs. 1 / § 7a**: Bei Beratern (besonders Strategy-Berater bei einem Auftraggeber) Risiko der Scheinselbstständigkeit. Statusfeststellungsverfahren beim DRV möglich.
- **SGB VI § 2 Nr. 9**: Arbeitnehmerähnliche Selbstständige (kein eigenes Personal + im Wesentlichen für 1 Auftraggeber tätig) sind rentenversicherungspflichtig.
- **DSGVO Art. 28**: Bei Beratern, die personenbezogene Daten des AG verarbeiten — AVV (Auftragsverarbeitungsvertrag) zwingend.
- **§ 312g BGB**: Bei B2C-Beratern (z.B. Privatkundenberater): 14 Tage Widerrufsrecht für Verbraucher; Belehrung zwingend.
- **LobbyRG (seit 01.01.2022)**: Eintrag im Lobbyregister Pflicht für Berater, die regelmäßig Interessenvertretung gegenüber Bundestag/Bundesregierung betreiben (ab 50 Auftraggeber-Kontakten/Jahr oder Hauptbetätigung). § 2 LobbyRG.
- **UWG** (Wettbewerbsrecht): Bei Berater-Mandaten mit Marktverhalten-Bezug kartellrechtliche/UWG-Compliance-Pflicht.

### 1.2 Aktuelle Rechtsprechung (2022–2026)

- **BGH vom 26.01.2017 — IX ZR 285/14** (Steuerberater-Insolvenzhaftung — Grundsatzurteil): Steuerberater haftet für Insolvenzverschleppungs-Schäden, wenn er auch nur mit Jahresabschluss-Erstellung beauftragt war und Insolvenzgründe erkannte. Bestätigt und ausgeweitet in Folgeentscheidungen 2023/2024.
- **BGH vom 18.04.2024 — IX ZR 153/22**: Steuerberaterhaftung — keine Verschärfung der Beweislastregelungen im Rechts- und Steuerberatungsrecht. Geschädigter trägt grundsätzlich Beweislast für Pflichtverletzung und Kausalität (Anscheinsbeweis bleibt eingeschränkt).
- **BGH vom 17.04.2025 — IX ZR 144/24** (Anwaltshaftung Anscheinsbeweis): Bei unklarer Rechtslage kein Anscheinsbeweis dafür, dass Mandant einer richtigen Belehrung gefolgt wäre — Mandant muss konkret darlegen.
- **BGH NJW-RR 2017, 1389** (Steuerberater-Pflichtumfang): Berater hat im Rahmen des Mandats umfassende, möglichst erschöpfende Belehrungspflicht zu Risiken und Folgen seiner Empfehlung.
- **BGH NJW 2014, 3360** (Anwaltshaftung): Anwalt muss eigenständig Sachverhalt aufklären und Mandanten über alle relevanten rechtlichen Risiken aufklären, auch wenn nicht ausdrücklich gefragt.
- **BGH NJW 2018, 459** (Interessenkonflikt): Bei Doppelmandaten oder Tätigkeit für Konkurrenten Interessenkonflikt-Vermeidung Pflicht; Verstoß führt zu Honorarverlust + Schadensersatz.
- **BAG vom 22.06.2022 — 5 AZR 251/21** (Beratervertrag als Arbeitsverhältnis): Wenn Berater regelmäßig in Strukturen integriert ist, feste Arbeitszeit hält, weisungsgebunden ist — Umqualifizierung zum Arbeitsverhältnis möglich. Folge: rückwirkende Sozialversicherungspflicht, Kündigungsschutz, Urlaub.
- **BGH vom 19.07.2018 — IX ZR 250/17** (Honorarvereinbarung außerhalb StBVV): Pauschalhonorare über StBVV-Sätzen nur bei schriftlicher Vereinbarung mit Hinweis auf höhere Vergütung wirksam. Sonst Kürzung auf StBVV-Sätze.
- **EuGH vom 22.04.2020 — C-692/19** (Yodel — analog für Plattform-Beratung): Gesamtbetrachtung der tatsächlichen Tätigkeit; bloße Vertragstitel reichen nicht.
- **BSG vom 28.06.2022 — B 12 R 3/20 R** ("Herrenberg-Urteil"): Eingliederung in Auftraggeber-Strukturen wiegt schwer für Beschäftigtenstatus — analog auf Strategy-Berater anwendbar.
- **BSG vom 27.04.2023 — B 12 R 15/21 R**: Auch eine Ein-Personen-GmbH des Beraters schützt nicht automatisch vor Scheinselbstständigkeit.

### 1.3 Pflichthinweise und Risiken

1. **Beratungspflicht-Umfang konkretisieren** — Mandat schriftlich abgrenzen: Was wird beraten, was nicht? Zusätzliche Beratungspflichten kommen aus Treu-und-Glauben-Erwägungen hinzu, wenn Risiken offensichtlich werden.
2. **Berufshaftpflicht ist Pflicht** bei Anwälten (BRAO § 51), Steuerberatern (StBerG § 67), Wirtschaftsprüfern (WPO § 54), Architekten/Ingenieuren (HOAI). Bei Strategy-/Management-Beratern dringend empfohlen, häufig Vertragsbedingung des AG.
3. **Scheinselbstständigkeit-Risiko bei Strategy-Beratern** — Bei festem Schreibtisch beim AG, festen Arbeitszeiten, Mailverteilern, hierarchischer Eingliederung: hohes Umqualifizierungsrisiko. Statusfeststellungsverfahren § 7a SGB IV empfohlen.
4. **Verschwiegenheitspflicht strafbewehrt** — Bei Berufsgeheimnisträgern § 203 StGB strafbar. Bei sonstigen Beratern Vertragsstrafe + zivilrechtliche Haftung.
5. **AVV (DSGVO Art. 28) zwingend**, wenn Berater personenbezogene Daten des AG verarbeitet (Mitarbeiter-, Kunden-, Bewerberdaten).
6. **Interessenkonflikte vermeiden** — Bei Beratung für direkte Konkurrenten oder gegen frühere Mandanten: rechtliche und ethische Konflikte. BGH NJW 2018, 459: Honorarverlust + Schadensersatz.
7. **Honorarvereinbarung nur schriftlich über StBVV/RVG-Sätzen** — sonst Kürzung auf gesetzliche Mindestsätze.
8. **Erfolgshonorar bei Anwälten grundsätzlich verboten** (§ 49b BRAO, § 4a RVG); Ausnahmen eng (Notlage, Streitwert < 2.000 EUR).
9. **Lobbyregister-Eintrag** für regelmäßige Interessenvertretung (LobbyRG seit 2022).
10. **Verbraucherwiderrufsrecht** bei B2C-Beratung: 14 Tage (§ 312g BGB), Belehrung zwingend, sonst 1 Jahr + 14 Tage Widerruf.

### 1.4 Honorarmodelle im Beratungsvertrag (Übersicht)

| Modell | Wesen | Risiko AG | Risiko Berater | Typische Anwendung |
|--------|-------|-----------|----------------|--------------------|
| **Stundensatz** | Aufwand × Stundensatz | hoch (offen) | gering | Anwälte, Steuerberater, Strategy-Berater bei unklarem Aufwand |
| **Tagessatz** | Aufwand × Tagessatz | mittel | mittel | Management Consulting, Strategy |
| **Pauschalhonorar / Festpreis** | Festbetrag für definiertes Mandat | gering | hoch (Kalkulationsrisiko) | Klar abgegrenzte Projekte, Gutachten |
| **Retainer / Pauschalhonorar monatlich** | Monatliches Fixum für Bereitschaft | mittel | mittel | Dauerberatung, Compliance-Officer-Mandate |
| **Erfolgshonorar (Contingency Fee)** | Zahlung nur bei Erfolg | gering | hoch | Bei Anwälten **eng begrenzt** (§ 4a RVG); bei Strategy-Beratern zulässig (M&A-Erfolg, Sanierung) |
| **Gemischt (Stunden + Erfolg)** | Stundenhonorar + Bonus bei Erfolg | mittel | mittel | M&A, Sanierung, Restrukturierung |

---

## 2 · Rollen-Definition

- **Rolle A — Auftraggeber (AG)**: Unternehmen, Vorstand, Geschäftsführung, Privatperson, die externe Beratungsleistung sucht. Will: qualifizierte Beratung, klar definiertes Mandat, kalkulierbares Honorar, Verschwiegenheit, Haftung für Falschberatung, IP-Sicherung an Beratungsergebnissen.
- **Rolle B — Berater (BR)**: Selbstständiger Berater (Strategy, Management, IT, Steuer, Recht, Wirtschaftsprüfer). Will: faire Vergütung, klare Beratungsgrenzen, Haftungsbegrenzung, Schutz vor Scheinselbstständigkeits-Vorwurf, Wahrung der Verschwiegenheit gegen Dritte (auch nach Mandatsende).

---

## 3 · Modi-Bedeutung (vertragsspezifisch)

- **Sicher** → **Pro Auftraggeber**: Detaillierte Beratungsverpflichtung mit Dokumentationspflicht, volle Haftung bei Pflichtverletzung mit Berufshaftpflicht-Pflicht (1 Mio EUR), strikte Verschwiegenheit 5 Jahre + Vertragsstrafe, Konkurrenzverbot während Mandatslaufzeit, alle Beratungsergebnisse und IP gehen an AG, Recht auf Tätigkeitsdokumentation, sofortige Kündigung bei Vertrauensbruch, klare Selbstständigkeits-Indikatoren (Statusfeststellung empfohlen).
- **Ausgewogen** → **Marktstandard**: Klar abgegrenztes Mandat, Stunden- oder Tagessatz, Standard-Verschwiegenheit gegenseitig 3 Jahre, Haftungsbegrenzung leichte Fahrlässigkeit auf Auftragssumme, einfache Nutzungsrechte für vereinbarten Zweck, gegenseitige Kündigung mit angemessener Frist (4 Wochen).
- **Durchsetzungsstark** → **Pro Berater**: Honorar nach Aufwand mit Verzugszinsen (9 % über Basiszins B2B, § 288 Abs. 2 BGB), Haftungsbegrenzung auf Stundenhonorar oder Berufshaftpflicht-Deckung, IP nur an AG nach Vollzahlung, kein Wettbewerbsverbot, Mandat jederzeit kündbar (§ 627 BGB Vertrauensdienst), keine Werkschuld, eigene Methodik geschützt, Substitution erlaubt.

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Auftraggeber
  { key: "partyA_name", label: "Firmenname (Auftraggeber)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_representative", label: "Vertretungsberechtigt", type: "text", required: false, group: "partyA" },
  { key: "partyA_role", label: "Rolle des Auftraggebers", type: "select", required: true, group: "partyA",
    options: [
      { value: "unternehmer", label: "Unternehmer (B2B)" },
      { value: "verbraucher", label: "Verbraucher (B2C — Widerrufsrecht 14 Tage!)" },
      { value: "oeffentlich", label: "Öffentlicher Auftraggeber (VgV/UVgO prüfen)" }
    ]
  },

  // Berater
  { key: "partyB_name", label: "Vor-/Nachname / Firma (Berater)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Geschäftsanschrift", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_taxNumber", label: "USt-IdNr. / Steuernummer", type: "text", required: true, group: "partyB" },
  { key: "partyB_qualification", label: "Qualifikation / Berufsstand", type: "select", required: true, group: "partyB",
    options: [
      { value: "anwalt", label: "Rechtsanwalt (BRAO, RVG, § 43a Verschwiegenheit)" },
      { value: "steuerberater", label: "Steuerberater (StBerG, StBVV)" },
      { value: "wp", label: "Wirtschaftsprüfer (WPO)" },
      { value: "strategy", label: "Strategy / Management Consultant" },
      { value: "it", label: "IT-/Tech-Consultant" },
      { value: "branche_spezifisch", label: "Branchenspezialist (HR, Marketing, Finance etc.)" },
      { value: "lobby", label: "Public Affairs / Lobby (LobbyRG-Eintrag prüfen!)" },
      { value: "andere", label: "Andere Beratungsdisziplin" }
    ]
  },
  { key: "partyB_haftpflicht", label: "Berufshaftpflicht-Versicherung vorhanden?", type: "select", required: true, group: "partyB",
    options: [
      { value: "ja_min_1mio", label: "Ja, mind. 1 Mio EUR Deckung" },
      { value: "ja_anders", label: "Ja, andere Deckung" },
      { value: "nein", label: "Nein (RISIKO!)" }
    ]
  },
  { key: "partyB_otherClients", label: "Aktuelle Auftragslage", type: "select", required: true, group: "partyB",
    options: [
      { value: "ja_mehrere", label: "Mehrere Mandanten gleichzeitig (Indiz Selbstständigkeit)" },
      { value: "nein_einziger", label: "Einziger Mandant (SCHEINSELBSTSTÄNDIGKEIT-RISIKO!)" }
    ]
  },

  // Mandat
  { key: "scope", label: "Mandatsumfang / Beratungsgegenstand", type: "textarea", required: true, group: "context",
    placeholder: "z.B. Beratung zur Restrukturierung der Vertriebsorganisation, Phase 1: Analyse, Phase 2: Konzept, Phase 3: Umsetzung" },
  { key: "duration", label: "Geplante Mandatsdauer", type: "select", required: true, group: "context",
    options: [
      { value: "einmalig", label: "Einmaliges Mandat / Gutachten" },
      { value: "kurz_3mon", label: "Bis 3 Monate" },
      { value: "6mon", label: "Bis 6 Monate" },
      { value: "12mon", label: "Bis 12 Monate" },
      { value: "retainer_unbefristet", label: "Retainer / Dauerberatung (SCHEINSELBSTSTÄNDIGKEIT-WARNUNG bei Strategy)" }
    ]
  },
  { key: "honorar_modell", label: "Honorarmodell", type: "select", required: true, group: "context",
    options: [
      { value: "stundensatz", label: "Stundensatz" },
      { value: "tagessatz", label: "Tagessatz" },
      { value: "pauschal", label: "Pauschalhonorar / Festpreis" },
      { value: "retainer", label: "Monatlicher Retainer (Fix-Honorar)" },
      { value: "erfolgsbezogen", label: "Erfolgshonorar (bei Anwälten BESCHRÄNKT, § 4a RVG)" }
    ]
  },
  { key: "honorar_betrag", label: "Honorarhöhe netto in EUR", type: "number", required: true, group: "context" },
  { key: "datenschutz_relevant", label: "Werden personenbezogene Daten verarbeitet?", type: "select", required: true, group: "context",
    options: [
      { value: "ja_avv_pflicht", label: "Ja — AVV (Art. 28 DSGVO) zwingend!" },
      { value: "nein", label: "Nein, nur Geschäftsdaten" }
    ]
  }
]
```

---

## 5 · Sektionen (Step 3 des Wizards)

> 11 strategische Entscheidungen.

### § 2 — Mandatsumfang und Beratungsleistung
- **Key**: `mandate_scope`
- **Importance**: critical
- **Beschreibung**: Definiert, was Berater schuldet. Je präziser, desto klarer die Pflichtverletzungs-Grenzen. BGH NJW 2014, 3360: Beratungspflicht erstreckt sich auch auf nicht ausdrücklich gefragte rechtliche Risiken.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `eng_definiert` | Eng definiertes Mandat mit Zielsetzung | Spezifische Aufgabe (z.B. "Gutachten zur Restrukturierung X bis 30.06.2026"), klare Out-of-Scope-Regelung. | low | Schützt Berater vor Beratungspflichten außerhalb. § 280 BGB-Haftung nur für definierten Bereich. | Wenn AG später behauptet, Berater hätte auch über X informieren müssen — Out-of-Scope-Klausel hilft. | AG: Mandat ggf. erweitern. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `umfassend_offen` | Umfassend-offenes Mandat | "Berater unterstützt AG in allen Fragen der Vertriebsstrategie." | high | Beratungspflicht-Umfang breit; Haftungsrisiko hoch. BGH-Tendenz: Berater muss umfassend warnen. Bei Strategy-Berater + Eingliederung Scheinselbstständigkeits-Indiz. | Bei Streit über Pflichtumfang. Bei DRV-Prüfung Indiz für Beschäftigung. | Berater: präzisieren, scope of work definieren. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `mit_meilensteinen_doc` | Eng mit Meilensteinen + Dokumentationspflicht | Phasen + Liefergegenstände + schriftliche Tätigkeitsberichte je Phase. | low | Optimal für AG; Berater muss dokumentieren. § 666 BGB Auskunftspflicht erfüllt. | Selten Streit. | Standard für anspruchsvolle Mandate. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `retainer_bereitschaft` | Retainer mit definierter Bereitschaftsleistung | Berater steht X Stunden/Monat zur Verfügung; Inhalte flexibel. | medium | Bei Dauerberatung praxistauglich, aber bei festem Stundenkontingent + 1 Mandat: Scheinselbstständigkeits-Risiko. | DRV-Prüfung. | Nachweis weiterer Mandanten + freie Disposition. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `mit_meilensteinen_doc`
  - ausgewogen: `eng_definiert`
  - durchsetzungsstark: `eng_definiert`

---

### § 3 — Honorar und Zahlungsbedingungen
- **Key**: `compensation`
- **Importance**: critical
- **Beschreibung**: Höhe, Modus, Fälligkeit, Verzugsregeln. Bei Anwälten/Steuerberatern besondere Honorarordnungen (RVG, StBVV) beachten.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `stundensatz_30tage` | Stundensatz, monatliche Abrechnung, 30 Tage netto | Stundenabrechnung mit Tätigkeitsnachweis, monatliche Rechnung. | medium | Marktüblich, aber lange Zahlungsfrist belastet Berater-Liquidität. § 286 Abs. 3 BGB Verzug nach 30 Tagen. | Berater: Liquiditätsdruck. | Berater: 14 Tage netto + Verzugszinsen 9 % B2B. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `tagessatz_14tage_vorschuss` | Tagessatz mit Vorschuss + 14 Tage netto | 30 % Vorschuss bei Mandatsbeginn, Rest 14 Tage nach Schlussrechnung. | low | Berater-freundlich; Vorschuss schützt vor Mandantenverzug. | Selten Streit. | Standard für höhere Mandate. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `pauschal_meilensteine` | Pauschalhonorar mit Meilenstein-Zahlungen | 30/40/30 % nach Phasenabnahmen. | low | Klar, planbar. Bei Steuerberater nur über StBVV mit schriftlicher Hinweis-Vereinbarung wirksam. | Bei vagen Meilensteinen Streit. | Klare Phasen-Trigger. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `erfolgshonorar_strategy` | Erfolgsbezogenes Honorar (nur Strategy/M&A — bei Anwälten ENG!) | Provision/Erfolg + Mindesthonorar. Bei Anwälten nur § 4a RVG (wirtschaftliche Notlage / Streitwert < 2.000 EUR). | high | Bei Anwälten **fast immer unzulässig** (§ 49b BRAO, RVG-Reform). Bei Strategy-/M&A-Beratern zulässig. | Anwalt-Erfolgshonorar **nichtig**, Honorar reduziert sich auf RVG. | Anwalt: kein Erfolgshonorar; Strategy: klare Erfolgsdefinition. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `pauschal_meilensteine`
  - ausgewogen: `stundensatz_30tage`
  - durchsetzungsstark: `tagessatz_14tage_vorschuss`

---

### § 4 — Beratungspflichten und Aufklärung
- **Key**: `advisory_duties`
- **Importance**: critical
- **Beschreibung**: Inhaltlicher Umfang der Beratungspflicht. BGH-Rechtsprechung: umfassende Aufklärung über Risiken/Alternativen pflichtgemäß. Dokumentation entscheidend bei Haftungsfall.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_BGH_standard` | Gesetzliche Beratungspflicht nach BGH-Standards | Berater hat umfassend, möglichst erschöpfend, sachgerecht zu informieren — auch über nicht ausdrücklich gefragte Risiken (BGH NJW 2014, 3360). | medium | AG-freundlich. Berater haftet bei jeder Pflichtverletzung. Hoch bei Strategie-/Finanzberatung. | Bei späterem Schaden: BGH-Maßstab gilt. | Berater: Berufshaftpflicht zwingend. | sicher: true, ausgewogen: true, durchsetzungsstark: false |
| `dokumentationspflicht_explizit` | Standard + ausdrückliche Dokumentationspflicht (Akte, Protokolle) | Berater muss alle Beratungsgespräche und -ergebnisse schriftlich dokumentieren und auf Anforderung herausgeben (§ 666, § 667 BGB). | low | AG-Schutz maximal; im Streitfall Beweismittel. Aufwand für Berater. | Bei Streit Mandant kann Akte einsehen. | Berater: angemessenen Dokumentationsumfang verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `eng_auf_mandat_begrenzt` | Beratungspflicht eng auf Mandatsumfang begrenzt | "Berater berät ausschließlich zu im Mandat beschriebenem Thema; weitergehende Pflichten ausgeschlossen." | medium | Berater-freundlich, aber bei AGB ggf. unwirksam (§ 307 BGB unangemessene Benachteiligung), wenn vorhersehbare Risiken nicht angesprochen werden. | Klausel kann bei offensichtlichen Folgewirkungen ausgehöhlt werden — BGH-Pflicht zur Hinweisbelehrung. | AG: Klausel nicht zu eng. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `mit_zweitmeinungsempfehlung` | Standard + Pflicht zur Empfehlung Zweitmeinung bei Großprojekten | Bei Mandaten > 100.000 EUR Schaden-Potential: Berater empfiehlt schriftlich Zweitmeinung. | low | Schützt beide; AG bekommt Bestätigung, Berater begrenzt Haftung. | Selten. | Empfohlene Best Practice. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `dokumentationspflicht_explizit`
  - ausgewogen: `gesetzlich_BGH_standard`
  - durchsetzungsstark: `eng_auf_mandat_begrenzt`

---

### § 5 — Haftung und Berufshaftpflicht
- **Key**: `liability`
- **Importance**: critical
- **Beschreibung**: § 309 Nr. 7 BGB: Vorsatz/grobe Fahrlässigkeit/Personenschäden in AGB nicht ausschließbar. Pflicht-Berufshaftpflichten: Anwälte 250.000 EUR (BRAO § 51), Steuerberater 250.000 EUR (StBerG § 67), Wirtschaftsprüfer 1 Mio EUR (WPO § 54).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_voll` | Volle gesetzliche Haftung ohne Begrenzung | BGB-Standard, alle Verschuldensgrade. | medium | AG-freundlich, Berater-Risiko unkalkulierbar. | Großschaden ruiniert Berater. | Berater: Begrenzung leichte Fahrlässigkeit. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `begrenzt_auf_haftpflicht_deckung` | Volle Haftung Vorsatz/grobe FL, leichte FL begrenzt auf Berufshaftpflicht-Deckung (z.B. 1 Mio EUR) | § 309 Nr. 7 BGB-konform. Marktstandard bei Beratern. | low | Branchenüblich. AG hat Versicherungsdeckung als Sicherheit. | Bei Schaden über Deckung — Streit. | Beide: Deckungssumme ausreichend wählen. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `mit_haftpflicht_pflicht_und_nachweis` | Volle Haftung + Berufshaftpflicht-Pflicht mit Nachweis 1 Mio EUR | Berater muss Police inkl. Bestätigungsschreiben bei Mandatsbeginn vorlegen. | low | Optimal AG. Bei Anwälten/StB Pflicht; bei Strategy oft erstmals geregelt. | Bei Versicherungslücke (z.B. Tätigkeit außerhalb Police-Bereich) — Berater haftet selbst. | Berater: Police-Inhalte prüfen, ggf. erweitern. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `begrenzt_auf_honorar_3fach` | Haftung begrenzt auf 3-faches Jahreshonorar | Bei kleinen Mandaten Berater-freundlich. | high | **In AGB problematisch** wenn Jahres-Honorar gering und Schaden hoch — § 307 BGB unangemessene Benachteiligung. BGH-Tendenz: bei groben Pflichtverletzungen unwirksam. | Klausel kippt teilweise bei großem Schaden / kleinem Honorar. | AG: höhere Mindestgrenze (z.B. 100.000 EUR Sockel). | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `mit_haftpflicht_pflicht_und_nachweis`
  - ausgewogen: `begrenzt_auf_haftpflicht_deckung`
  - durchsetzungsstark: `begrenzt_auf_haftpflicht_deckung`

---

### § 6 — Verschwiegenheit und Datenschutz
- **Key**: `confidentiality`
- **Importance**: critical
- **Beschreibung**: Verschwiegenheitspflicht — bei Berufsgeheimnisträgern strafbewehrt (§ 203 StGB). DSGVO Art. 28 AVV bei pers. Daten zwingend.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `standard_3jahre` | Gegenseitige Verschwiegenheit 3 Jahre nachvertraglich | Beide schützen vertrauliche Informationen 3 Jahre. | low | Marktüblich. | Selten. | Standard. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `streng_5jahre_strafe` | Berater einseitig, 5 Jahre, Vertragsstrafe 25.000 EUR pro Verstoß | Berater allein gebunden, lange Frist, Strafabschreckung. | medium | § 343 BGB-Reduktionsrisiko bei unverhältnismäßiger Höhe. § 309 Nr. 6 BGB beachten (AGB). | Strafe reduziert. | Berater: gegenseitig + maßvolle Strafe. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `203_stgb_explizit_avv` | Bezugnahme § 203 StGB + DSGVO-AVV als Anlage | Berufsgeheimnisträger-Standard + AVV bei pers. Daten. | low | Pflichtumfang vollständig. | Selten. | Bei AGB mit Datenkontakt zwingend. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `unbefristet` | Unbefristete Verschwiegenheit | Geheimhaltungspflicht endet nie. | high | Bei AGB ggf. **unwirksam** wegen unangemessener Benachteiligung (§ 307 BGB). BGH-Tendenz: max. 5–7 Jahre angemessen. | Klausel kippt; auf angemessene Dauer reduziert. | Praktisch nur bei echten Geschäftsgeheimnissen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `203_stgb_explizit_avv`
  - ausgewogen: `standard_3jahre`
  - durchsetzungsstark: `standard_3jahre`

---

### § 7 — Interessenkonflikte und Wettbewerbsverbot
- **Key**: `conflict_competition`
- **Importance**: high
- **Beschreibung**: BGH NJW 2018, 459: Bei Interessenkonflikt Honorarverlust + Schadensersatz. Wettbewerbsverbot bei Selbstständigen kein § 74 HGB; sachlich/zeitlich/räumlich begrenzt zumutbar (Art. 12 GG).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_klausel` | Keine spezielle Klausel | Berufsrechtliche Regelungen reichen aus. | medium | Nur bei Berufsgeheimnisträgern (BRAO § 43a) ausreichend. Bei Strategy-Beratern: AG-Schutz fehlt. | AG: Konflikt mit Konkurrenz-Mandat. | AG: Mindest-Klausel ergänzen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `kein_konkurrenzmandat_dauer` | Kein Konkurrenz-Mandat während Mandatslaufzeit | Berater darf während Mandat keine direkten Konkurrenten beraten. | low | Marktüblich, AG-Standardschutz. | Bei nicht klar definiertem "Konkurrent". | Klare Liste konkurrierender Unternehmen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `wettbewerbsverbot_12mon_karenz` | 12 Monate Wettbewerbsverbot nach Mandatsende mit Karenzentschädigung 50 % | Volles Wettbewerbsverbot mit Karenz. § 74 HGB analog (nicht direkt anwendbar bei Selbstständigen, aber Karenz schützt vor Sittenwidrigkeit). | medium | Ohne Karenz oft sittenwidrig (§ 138 BGB) bei wesentlicher Berufsausübungs-Einschränkung. Mit Karenz wirksam. | Bei zu weiter räumlich/sachlicher Reichweite. | Beide: Reichweite präzise begrenzen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `kundenschutz_6mon_aktiv` | 6 Monate aktive Kundenabwerbung verboten, kein Wettbewerbsverbot | Berater darf Konkurrenten beraten, aber AG-Kunden 6 Monate nicht aktiv abwerben. | low | Berater-freundlich, fairer Kompromiss. | Selten. | Empfohlener Standard für Strategy. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `wettbewerbsverbot_12mon_karenz`
  - ausgewogen: `kein_konkurrenzmandat_dauer`
  - durchsetzungsstark: `keine_klausel`

---

### § 8 — Nutzungsrechte an Beratungsergebnissen (IP)
- **Key**: `ip_rights`
- **Importance**: high
- **Beschreibung**: UrhG § 31 Zweckübertragungslehre — im Zweifel verbleiben Rechte beim Urheber. Bei Beratungsergebnissen (Studien, Konzepte, Tools) Rechtsfrage zwingend.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `einfaches_recht_zweckgebunden` | AG erhält einfaches Nutzungsrecht für Mandatszweck | Berater behält Methodik + Vorlagen, AG nutzt Beratungsergebnis nur intern für vereinbarten Zweck. | medium | Berater-freundlich. AG kann Konzept nicht weiterverkaufen / öffentlich machen. | AG: kein Lizenzgeschäft mit Beratungsergebnis möglich. | AG: Bearbeitungsrecht für interne Anpassungen verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `ausschliessliches_recht_zweck` | Ausschließliches Nutzungsrecht für Mandatszweck, ohne Bearbeitung | Exklusiv für AG-Zweck, Bearbeitungsrechte bei Berater. | low | Marktstandard für Beratungsmandate. § 32 UrhG angemessene Vergütung. | Wenn AG Bearbeitung will. | Bearbeitungsrecht zusätzlich verhandeln. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `umfassendes_recht_inkl_bearbeitung` | Umfassendes ausschließliches Recht inkl. Bearbeitung + Übertragung an Dritte | Wirtschaftliche IP-Vollübertragung; Berater behält Persönlichkeitsrechte (§ 13 UrhG). | medium | Im Honorar muss "angemessene Vergütung" für umfassende Rechte enthalten sein (§ 32 UrhG). Sonst Nachforderung möglich. | Berater kann § 32 UrhG-Nachforderung stellen, wenn Honorar nicht angemessen. | Berater: 30–50 % Aufschlag fordern. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `methodik_geschuetzt_ergebnis_AG` | Methodik/Tools beim Berater, Ergebnis-IP beim AG | Berater behält Werkzeuge/Frameworks, AG erhält Ergebnis-Dokument exklusiv. | low | Faire Trennung — branchenüblich bei Strategy-Consulting. | Selten Streit bei klarer Trennung. | Klare Definition was "Methodik" und was "Ergebnis". | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `umfassendes_recht_inkl_bearbeitung`
  - ausgewogen: `ausschliessliches_recht_zweck`
  - durchsetzungsstark: `einfaches_recht_zweckgebunden`

---

### § 9 — Vertragsdauer und Kündigung
- **Key**: `term_termination`
- **Importance**: high
- **Beschreibung**: § 627 BGB: Bei Diensten höherer Art jederzeit ohne wichtigen Grund kündbar. § 626 BGB: außerordentlich aus wichtigem Grund. Bei Verbraucher-Mandaten: 14 Tage Widerrufsrecht (§ 312g BGB).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_627_626` | Gesetzliche Regelung (§§ 627, 626, 628 BGB) | Beide jederzeit ordentlich kündbar bei Vertrauensverhältnis; außerordentlich aus wichtigem Grund. § 628: Vergütung nur bis Kündigung. | low | BGB-Default; Berater-Mandanten-Verhältnis ist Vertrauensvertrag. | Bei Kündigung mitten in Phase: Streit über erbrachte Leistung. | Klare Aufmaßregeln. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `feste_laufzeit_kein_627` | Feste Laufzeit, § 627 BGB ausgeschlossen | Mandat bis Ende; vorzeitige Kündigung nur außerordentlich. | medium | AG-freundlich (Planungssicherheit), aber bei Verbraucher § 627 BGB **nicht abdingbar** (BGH NJW 2010, 1520). Bei Strategy-Berater + 1 AG: SV-Risiko. | Bei B2C unwirksam. | Nur B2B sinnvoll. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `monatlich_4wochen_beidseitig` | Monatlich kündbar, 4 Wochen Frist beidseitig | Faire Balance, planbar. | low | Marktüblich für Retainer-Mandate. | Selten. | Empfohlener Standard. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `mit_widerrufsbelehrung_b2c` | B2C-Mandat: Standard + 14 Tage Widerrufsrecht (§ 312g BGB) | Verbraucher kann 14 Tage widerrufen; Belehrung zwingend. | low | Pflicht bei B2C. Fehlende Belehrung: 1 Jahr + 14 Tage Widerrufsfrist. | Berater: bei fehlerhafter Belehrung lange Widerrufsfrist. | Standard-Belehrung verwenden. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `mit_widerrufsbelehrung_b2c`
  - ausgewogen: `gesetzlich_627_626`
  - durchsetzungsstark: `gesetzlich_627_626`

---

### § 10 — Selbstständigkeitsklausel (Scheinselbstständigkeit)
- **Key**: `independence`
- **Importance**: critical
- **Beschreibung**: Bei Beratern (besonders Strategy/Management bei einem AG) hohes Scheinselbstständigkeits-Risiko. BSG Herrenberg-Urteil (B 12 R 3/20 R) und BSG B 12 R 15/21 R — Eingliederung wiegt schwer.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine` | Keine Selbstständigkeitsklausel | Vertrag enthält keine ausdrücklichen Indikatoren. | high | Hohe Beweislast bei DRV-Prüfung. | Bei Eingliederung — Beschäftigungs-Annahme. | Beide: Klausel ist Standard. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `standard_klausel` | Standard-Selbstständigkeitsklausel | "Berater ist selbstständig. Berechtigt für andere AG tätig zu werden. Trägt eigenes unternehmerisches Risiko, Eigene Steuern, nicht eingegliedert." | low | Standard-Wording, gerichtsfest als Indiz. Aber: tatsächliche Durchführung entscheidet (Herrenberg-Urteil). | Klausel allein hilft nicht bei abweichender Praxis. | Akzeptabel; ggf. Konkretisierungen. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `mit_statusfeststellung_pflicht` | Standard + verpflichtende Statusfeststellung (§ 7a SGB IV) | Berater verpflichtet sich, innerhalb 4 Wochen Statusfeststellungsverfahren bei DRV einzuleiten; AG kann bei festgestellter abh. Beschäftigung kündigen. | low | Maximale Rechtssicherheit; aufschiebende Wirkung gegen Beitragsforderung bei rechtzeitigem Antrag. | Wenn Berater Verfahren ablehnt — Vertragsverletzung. | Kostenfrage klären. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `mit_indizienkatalog` | Standard + ausführlicher Indizienkatalog | Eigene Betriebsstätte, eigenes Equipment, freie Zeiteinteilung, mehrere AG, kein AN-Equivalent (Urlaub, Lohnfortzahlung). | low | Sehr starker Indiz-Katalog. Konkretisiert Selbstständigkeit. | Bei abweichender Realität — Klausel kann sich gegen AG wenden ("vorsätzlich getäuscht"). | Beide: realitätstreu formulieren. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `mit_statusfeststellung_pflicht`
  - ausgewogen: `standard_klausel`
  - durchsetzungsstark: `standard_klausel`

---

### § 11 — Schlussbestimmungen
- **Key**: `final_provisions`
- **Importance**: medium
- **Beschreibung**: Schriftform für Änderungen, salvatorisch, Gerichtsstand, anwendbares Recht. Bei B2C: Verbrauchergerichtsstand zwingend (§ 29 ZPO).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `minimal_beklagter` | Salvator. + Gerichtsstand Sitz Beklagter + dt. Recht | Faire Default-Lösung. | low | § 12 ZPO Standard. | Selten. | Akzeptabel. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `gerichtsstand_ag` | Gerichtsstand am Sitz des AG | Vorteilhaft für AG. | medium | B2B zulässig (§ 38 ZPO). Bei B2C unzulässig (§ 29 ZPO). | Berater: Anreise. | Berater: Sitz Berater oder Schiedsklausel. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `dis_schiedsklausel` | DIS-Schiedsgerichtsbarkeit | Streitigkeiten vor DIS-Schiedsgericht. | medium | Schnell, vertraulich, teuer. § 1031 ZPO Schriftform. | Bei niedrigen Streitwerten unverhältnismäßig teuer. | Nur bei großen Mandaten. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `mediation_then_court` | Mediations-Klausel vor Klage | Streitigkeiten erst Mediation, dann Klage am Sitz Beklagter. | low | Schonende, vertrauensbasierte Streitbeilegung. | Selten Streit. | Best Practice für Vertrauensmandate. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `gerichtsstand_ag`
  - ausgewogen: `minimal_beklagter`
  - durchsetzungsstark: `minimal_beklagter`

---

## 6 · Anwaltsperspektive — kritische Hinweise

1. **Mandatsumfang präzise abgrenzen.** BGH-Beratungspflicht erstreckt sich auf alle erkennbaren Risiken im Mandatsbereich. Out-of-Scope-Klauseln helfen nur bei sauberer Definition.
2. **Berufshaftpflicht-Pflicht bei Berufsgeheimnisträgern** — Anwalt 250.000 EUR (BRAO § 51), Steuerberater 250.000 EUR (StBerG § 67), Wirtschaftsprüfer 1 Mio EUR (WPO § 54). Bei Strategy-Beratern dringend empfohlen, Standard 1–5 Mio EUR.
3. **Erfolgshonorar bei Anwälten fast immer unzulässig** (§ 49b BRAO, § 4a RVG). Vereinbarung nichtig, Honorar wird auf RVG-Sätze gestutzt. Bei Strategy/M&A erlaubt.
4. **Steuerberater-Honorar nur über StBVV mit schriftlichem Hinweis wirksam** (BGH IX ZR 250/17). Sonst Reduktion auf StBVV-Mindestsätze.
5. **Scheinselbstständigkeits-Risiko bei Strategy-Beratern hoch** — Festes Bürodienst, feste Termine, Mailverteiler, hierarchische Eingliederung führen zu Beschäftigungs-Annahme (Herrenberg-Urteil BSG B 12 R 3/20 R). Statusfeststellungsverfahren empfohlen.
6. **Verschwiegenheit bei Berufsgeheimnisträgern strafbewehrt** (§ 203 StGB). Bei Strategy-/Management-Beratern Vertragsstrafe sinnvoll.
7. **AVV bei pers. Datenverarbeitung zwingend** (DSGVO Art. 28). Fehlende AVV = Bußgeldrisiko (Art. 83 DSGVO bis 4 % Konzernumsatz).
8. **Interessenkonflikte vermeiden** (BGH NJW 2018, 459) — Doppelmandate für Konkurrenten oder gegen frühere Mandanten führen zu Honorarverlust + Schadensersatz.
9. **Lobbyregister-Pflicht** seit 01.01.2022 für regelmäßige Interessenvertretung gegenüber Bundestag/Bundesregierung (LobbyRG § 2).
10. **Verbraucher-Widerrufsrecht 14 Tage** (§ 312g BGB) bei B2C-Beratung. Fehlende Belehrung = 1 Jahr + 14 Tage Widerrufsfrist (§ 356 BGB).
11. **Beweislast Beratungsfehler beim Mandanten** (BGH IX ZR 153/22, 18.04.2024). Anscheinsbeweis nur bei eindeutiger Rechtslage (BGH IX ZR 144/24, 17.04.2025). Berater sollte trotzdem dokumentieren.
12. **Steuerberater-Insolvenzhaftung** (BGH IX ZR 285/14): Bei erkennbaren Insolvenzgründen Hinweispflicht; bei Versäumnis Haftung für Insolvenzverschleppungs-Schaden.
13. **§ 627 BGB bei Verbraucher nicht abdingbar** — Bei Verbrauchermandaten kann Mandant jederzeit kündigen, feste Laufzeitklauseln unwirksam.
14. **Honorar-Aufmaß bei Kündigung dokumentieren** — § 628 BGB: Vergütung nur bis Kündigungszeitpunkt; sauberes Aufmaß nötig.

---

## 7 · Quellen

- BGH vom 26.01.2017 — IX ZR 285/14 (Steuerberater-Insolvenzhaftung)
- BGH vom 18.04.2024 — IX ZR 153/22 (Beweislast Steuerberaterhaftung)
- BGH vom 17.04.2025 — IX ZR 144/24 (Anscheinsbeweis Anwaltshaftung)
- BGH vom 19.07.2018 — IX ZR 250/17 (Honorarvereinbarung über StBVV)
- BGH NJW-RR 2017, 1389 (Steuerberatung Pflichtumfang)
- BGH NJW 2014, 3360 (Anwaltshaftung Aufklärungspflicht)
- BGH NJW 2018, 459 (Interessenkonflikt)
- BGH NJW 2010, 1520 (§ 627 BGB nicht abdingbar bei Verbraucher)
- BAG vom 22.06.2022 — 5 AZR 251/21 (Beratervertrag als Arbeitsverhältnis)
- BSG vom 28.06.2022 — B 12 R 3/20 R ("Herrenberg-Urteil")
- BSG vom 27.04.2023 — B 12 R 15/21 R (Ein-Personen-GmbH und Scheinselbstständigkeit)
- BSG vom 04.06.2019 — B 12 R 11/18 R (Honorarhöhe als Selbstständigkeits-Indiz)
- EuGH vom 22.04.2020 — C-692/19 (Yodel — Plattform-Gesamtbetrachtung)
- BGB §§ 611, 626, 627, 628, 666, 667, 675 (Dienstvertrag, Vertrauensvertrag, Auskunfts-/Rechenschaftspflicht)
- BGB §§ 280, 281, 311 Abs. 2 (Beratungshaftung, c.i.c.)
- BGB §§ 305-310 (AGB-Recht)
- BRAO §§ 43a, 51, 49b (Anwaltsverschwiegenheit, Berufshaftpflicht, Honorar)
- StBerG § 67 (Steuerberater-Haftpflicht); StBVV
- RVG, § 4a (Erfolgshonorar)
- WPO § 54 (Wirtschaftsprüfer-Haftpflicht)
- SGB IV §§ 7, 7a, 25; SGB VI § 2 Nr. 9
- § 203 StGB (Geheimnis-Offenbarung)
- DSGVO Art. 28, 83
- LobbyRG (in Kraft seit 01.01.2022)
- § 312g BGB (Verbraucher-Widerruf)
- [Beratungshaftung — Wikipedia](https://de.wikipedia.org/wiki/Beratungshaftung)
- [Steuerberaterhaftung BGH IX ZR 285/14 (TWI)](https://www.twi-mp.de/steuerberaterhaftung/)
- [BGH zur Beweislast Steuerberaterhaftung (Anwaltsblatt)](https://anwaltsblatt.anwaltverein.de/de/zpoblog/bgh-keine-verschaerfung-der-beweislastregelungen-bei-rechts-und-steuerberaterhaftung)
- [BGH zum Anscheinsbeweis Anwaltshaftung (Anwaltsblatt)](https://anwaltsblatt.anwaltverein.de/de/themen/recht-gesetz/bgh-anscheinsbeweis-wann-ist-klagen-aussichtslos)
- [Beratervertrag und Scheinselbstständigkeit (Conplore)](https://conplore.com/beratervertrag-im-fokus-die-gefahr-der-scheinselbststandigkeit-bei-freien-beratern/)
- [Beratungsvertrag als Arbeitsverhältnis (arbeitsrechtsiegen.de)](https://www.arbeitsrechtsiegen.de/artikel/beratungsvertrag-als-freies-dienstverhaeltnis-abgrenzung-zu-arbeitsverhaeltnis/)
- [Beratervertrag — Inhalt und Haftung (DAHAG)](https://www.dahag.de/c/ratgeber/zivilrecht/beratervertrag)
- Stand: 29.04.2026

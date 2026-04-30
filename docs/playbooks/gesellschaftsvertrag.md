# Gesellschaftsvertrag — Playbook-Konzept

> Recherchedokument im Sinne des `PLAYBOOK-MASTERPLAN.md` (Sektion 8). Vorbereitet die Code-Umsetzung in `backend/playbooks/gesellschaftsvertrag.js`.

## Metadaten
- **Slug**: `gesellschaftsvertrag`
- **Title**: Gesellschaftsvertrag (GbR · OHG · KG · GmbH · UG)
- **Description**: Gründungsvertrag einer Personen- oder Kapitalgesellschaft — regelt Rechtsform, Stammkapital/Einlagen, Geschäftsführung, Gewinnverteilung, Gesellschafterwechsel und Auflösung. Berücksichtigt die MoPeG-Reform 2024 und die aktuelle BGH-/BSG-Rechtsprechung zu Abfindungs-, Stimmbindungs- und Vinkulierungsklauseln.
- **Difficulty**: komplex
- **Estimated Time**: 15–20 Minuten
- **Icon**: `users-round`
- **Legal Basis**: BGB §§ 705–740c (GbR — i.d.F. MoPeG, in Kraft 01.01.2024); HGB §§ 105–177a (OHG, KG); GmbHG (insb. §§ 1–13, 15, 35, 46, 47, 53, 60); GmbHG § 5a (UG haftungsbeschränkt); AktG (AG); GenG (eG); UmwG (Umwandlung); EStG § 15 (Mitunternehmerschaft); KStG § 1, § 1a (Optionsmodell); GewStG § 9 Nr. 2a (Schachtelprivileg); BeurkG (notarielle Beurkundung); GBO § 47 Abs. 2 (eGbR-Eintragungspflicht); ZPO § 1031 (Schiedsklauseln); BGB § 138 (Sittenwidrigkeit); GG Art. 12 (Berufsfreiheit).

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze und Rechtsformen-Übersicht

Der Gesellschaftsvertrag (synonym: "Satzung" bei Kapitalgesellschaften) ist die Grundlage jeder Gesellschaft. Er kann bei der GbR formfrei geschlossen werden, ist bei OHG/KG handelsregister-pflichtig und bei GmbH/UG/AG **zwingend notariell zu beurkunden** (§ 2 Abs. 1 GmbHG; § 23 Abs. 1 AktG). Das deutsche Gesellschaftsrecht kennt zwei Grundtypen:

**Personengesellschaften** (BGB / HGB):
- **GbR** — Gesellschaft bürgerlichen Rechts; seit MoPeG (01.01.2024) rechtsfähig (§ 705 Abs. 2 BGB n.F.); optional als **eGbR** im Gesellschaftsregister eintragbar.
- **OHG** — Offene Handelsgesellschaft (§§ 105 ff. HGB); kaufmännisch tätig; Eintragung im Handelsregister A.
- **KG** — Kommanditgesellschaft (§§ 161 ff. HGB); ein Komplementär haftet unbeschränkt, Kommanditisten beschränkt.
- **PartG / PartG mbB** — Partnerschaftsgesellschaft (Freie Berufe nach PartGG).

**Kapitalgesellschaften** (eigene juristische Person, beschränkte Haftung):
- **GmbH** — Stammkapital min. 25.000 EUR (§ 5 Abs. 1 GmbHG), notarielle Beurkundung Pflicht, Eintragung Handelsregister B.
- **UG (haftungsbeschränkt)** — Mini-GmbH, Stammkapital ab 1 EUR (§ 5a GmbHG), Rücklagenpflicht 25 % des Jahresüberschusses bis 25.000 EUR Stammkapital erreicht sind (§ 5a Abs. 3 GmbHG).
- **AG** — Aktiengesellschaft, Mindestkapital 50.000 EUR (§ 7 AktG), zwingend Vorstand + Aufsichtsrat.
- **eG** — Eingetragene Genossenschaft (GenG); offen für Mitgliederwechsel.

> **Empfehlung für das Playbook:** Fokus auf die zwei häufigsten Anfänger-Rechtsformen — **GbR** (oft Praxis bei Existenzgründern, Architekten, kleinen Teams) und **GmbH** (Standardrechtsform für seriöse Gründungen). UG kann optional als Sub-Variante der GmbH abgebildet werden. Für OHG/KG/AG würde der Wizard zu komplex; dort sollte ein Hinweis "bitte spezialisiertes Notariat / Anwalt" erscheinen.

### 1.2 MoPeG-Reform — die wichtigsten Neuerungen 2024

Mit dem **Gesetz zur Modernisierung des Personengesellschaftsrechts (MoPeG)** vom 10.08.2021 (BGBl. I S. 3436), in Kraft seit **01.01.2024**, wurde das gesamte Personengesellschaftsrecht (BGB §§ 705 ff., HGB §§ 105 ff.) grundlegend reformiert. Zentrale Änderungen:

1. **Rechtsfähigkeit der GbR ausdrücklich kodifiziert** (§ 705 Abs. 2 BGB n.F.): Die rechtsfähige GbR ist jetzt Rechtssubjekt — Träger eigener Rechte und Pflichten. Damit endete ein Streit, der seit der "ARGE Weißes Ross"-Entscheidung des BGH (II ZR 331/00, 29.01.2001) schwelte.
2. **Abschaffung der Gesamthandslehre**: Das Gesellschaftsvermögen gehört jetzt unmittelbar der GbR (nicht mehr "den Gesellschaftern in gesamthänderischer Verbundenheit"). Praktische Folge: einfachere Vermögenszuordnung im Grundbuch, bei Konten, bei Verträgen.
3. **Gesellschaftsregister + eGbR** (§§ 707 ff. BGB n.F.): Optionale Eintragung; nach Eintragung Pflicht zum Namenszusatz "eingetragene Gesellschaft bürgerlichen Rechts" oder "eGbR". Eintragung ist **faktisch Pflicht**, sobald die GbR Grundbuch-, Handelsregister-, Aktien- oder Patentregister-Geschäfte tätigen will (§ 47 Abs. 2 GBO).
4. **Persönliche Haftung weiterhin uneingeschränkt** (§ 721 BGB n.F.): Gesellschafter haften gegenüber Dritten **persönlich, unbeschränkt und gesamtschuldnerisch**. Haftungsbeschränkungen im Gesellschaftsvertrag wirken nur **innen** (zwischen Gesellschaftern), niemals gegenüber Gläubigern.
5. **Eintrittshaftung neuer Gesellschafter** (§ 721a BGB n.F.): Wer in eine bestehende GbR eintritt, haftet **auch für Altverbindlichkeiten**. Diese explizite Regelung kodifiziert die bisherige BGH-Rechtsprechung.
6. **Ausscheiden ohne Auflösung** (§§ 723 ff. BGB n.F.): Kündigung eines Gesellschafters führt nicht mehr automatisch zur Auflösung der Gesellschaft, sondern zum bloßen Austritt mit Anwachsung an die verbleibenden Gesellschafter.
7. **Beschlussmängelrecht** (§§ 110–115 HGB n.F. analog für eGbR möglich): Strukturierte Beschluss-Anfechtungsklage statt bisheriger Nichtigkeitsfeststellungsklage.

### 1.3 Aktuelle Rechtsprechung (2022–2026)

- **BGH vom 03.07.2025 — V ZB 17/24**: Eine im Grundbuch nach altem Recht eingetragene GbR muss **vor jeder Grundstücksübertragung** (Erwerb wie Veräußerung) im Gesellschaftsregister als eGbR eingetragen und das Grundbuch entsprechend berichtigt werden. Auch bei Auflösung der GbR und Übertragung auf die Gesellschafter keine Ausnahme. Praktische Folge: Alle "Alt-GbRs" mit Immobilien sind faktisch zur eGbR-Eintragung gezwungen.
- **BGH vom 16.07.2024 — II ZR 71/23 ("Hannover 96")**: Stimmbindungsverträge binden nur die Vertragsparteien untereinander (schuldrechtliche Wirkung). Ein Gesellschafterbeschluss, der gegen einen Stimmbindungsvertrag oder die in der Satzung festgelegte Kompetenzverteilung verstößt, ist **nur anfechtbar, nicht nichtig**. Das gilt auch bei kombinierten Verstößen.
- **BGH vom 29.04.2014 — II ZR 216/13**: Eine satzungsmäßige Klausel, die die Abfindung bei Ausschluss eines Gesellschafters aus wichtigem Grund komplett ausschließt oder sie als "Vertragsstrafe" missbraucht, ist sittenwidrig (§ 138 BGB) und damit nichtig.
- **BGH vom 27.09.2011 — II ZR 279/09**: Krasses Missverhältnis zwischen Buchwert-Abfindung und tatsächlichem Verkehrswert (z.B. nur 1/10 des Verkehrswerts) macht die Abfindungsklausel unwirksam — auch wenn sie ursprünglich vereinbart war ("ergänzende Vertragsauslegung", Anpassung auf angemessene Abfindung).
- **BGH vom 30.11.2009 — II ZR 208/08**: Satzungsmäßige Wettbewerbsverbote für GmbH-Gesellschafter sind nur wirksam, wenn (a) der Gesellschafter maßgeblichen Einfluss hat, (b) das Verbot zur Existenzsicherung der Gesellschaft erforderlich ist, und (c) es zeitlich, räumlich und sachlich begrenzt ist (Art. 12 GG, § 138 BGB). Faustregel: max. 2 Jahre nach Ausscheiden, klar abgegrenzte Branche/Region.
- **BGH vom 16.07.2019 — II ZR 426/17**: Ausschluss eines Gesellschafters aus wichtigem Grund — das Vertrauensverhältnis ist Maßstab; bloße Differenzen reichen nicht.
- **OLG Hamm vom 13.12.2023 — 8 U 102/23**: Anwendbarkeit des MoPeG auf vor dem 01.01.2024 begründete Verbindlichkeiten — das neue Recht (§§ 721, 728, 728b BGB n.F.) gilt **auch für Altsachverhalte**, mangels speziellem Übergangsrecht.

### 1.4 Pflichthinweise und typische Fallstricke

1. **Notarielle Beurkundung bei GmbH/UG** (§ 2 Abs. 1, § 15 Abs. 3+4 GmbHG): Gründung **und** jede spätere Anteilsübertragung **zwingend notariell**. Verstoß = Nichtigkeit. Das Musterprotokoll (Anlage zum GmbHG) ist nur bei einfachen Gründungen mit max. 3 Gesellschaftern + 1 Geschäftsführer + Einheitsgesellschafter ohne komplexe Klauseln nutzbar.
2. **Stammkapitalaufbringung** (§ 7 Abs. 2 GmbHG): Bei GmbH müssen vor Anmeldung mindestens **12.500 EUR** eingezahlt sein. Bei Sacheinlagen ist ein **Sachgründungsbericht** Pflicht (§ 5 Abs. 4 GmbHG).
3. **UG-Rücklagenpflicht** (§ 5a Abs. 3 GmbHG): 25 % des Jahresüberschusses **abzüglich Verlustvortrag** sind zwingend in eine gesetzliche Rücklage einzustellen — bis das Stammkapital 25.000 EUR erreicht. Ausschüttungssperre.
4. **eGbR-Eintragungspflicht bei Immobilien** (BGH V ZB 17/24, 03.07.2025): Wer mit der GbR Grundstücksgeschäfte plant, muss **vor** dem ersten Grundbuchakt die Eintragung im Gesellschaftsregister vollziehen. Unterlassen blockiert das Geschäft.
5. **Persönliche Haftung GbR-Gesellschafter** (§ 721 BGB n.F.): Auch wenn intern Beschränkungen vereinbart sind — gegenüber Dritten haftet **jeder Gesellschafter unbeschränkt mit Privatvermögen**. Wer das nicht will: GmbH/UG.
6. **Scheinselbstständigkeit GmbH-Geschäftsführer** (BSG vom 27.04.2023 — B 12 R 15/21 R): Auch ein Ein-Personen-GmbH-Geschäftsführer kann sozialversicherungspflichtig abhängig beschäftigt sein, wenn er weisungsgebunden für nur einen Auftraggeber arbeitet. Bei Minderheits-GFs ohne Sperrminorität immer Statusfeststellung empfehlen.
7. **Steuerliche Optionsmodell** (§ 1a KStG, erweitert durch Wachstumschancengesetz vom 27.03.2024): Personengesellschaften (auch eGbR seit 28.03.2024) können beantragen, ertragsteuerlich wie eine Kapitalgesellschaft besteuert zu werden. Antragsfrist regelmäßig 30.11. des Vorjahrs. Sinnvoll v.a. bei thesaurierenden Personengesellschaften mit hohem Gewinn.
8. **Schachtelprivileg** (§ 9 Nr. 2a GewStG): Beteiligungen einer Kapitalgesellschaft an anderen Kapitalgesellschaften ab 15 % zu Beginn des Erhebungszeitraums sind gewerbesteuerfrei.

### 1.5 Risiken bei fehlerhafter Gestaltung

| Fehler | Folge |
|--------|-------|
| GbR ohne klare Beschluss-/Geschäftsführungsregel | Streit, Lähmung, Gerichtsverfahren um Beschlussfähigkeit |
| GmbH-Vertrag ohne Vinkulierung | Anteile können frei verkauft werden — neue Gesellschafter gegen den Willen der Alt-Gesellschafter |
| Buchwert-Abfindung ohne Cap auf realistische Werte | Klausel unwirksam (BGH II ZR 279/09), ergänzende Vertragsauslegung — meist Verkehrswert |
| Wettbewerbsverbot zu weit | Nichtig nach § 138 BGB / Art. 12 GG, kein Schutz |
| Keine Regelung Tod/Krankheit/Insolvenz Gesellschafter | Ungewollte Vererbung von Anteilen, Auflösung der Gesellschaft |
| Fehlende notarielle Form bei GmbH-Anteilsübertragung | Vertrag nichtig (§ 125 BGB) |
| Stimmbindung außerhalb Satzung erwartet, gesellschaftsrechtliche Wirkung anzunehmen | Nur schuldrechtliche Wirkung, kein Beschluss-Nichtigkeit (BGH II ZR 71/23) |
| Vereinbarung "GbR mit beschränkter Haftung" | Unwirksam — § 721 BGB n.F. zwingend |
| UG-Ausschüttung ohne 25%-Rücklage | Nichtige Ausschüttungsbeschlüsse, GF-Haftung (§ 5a Abs. 3 GmbHG, § 43 GmbHG) |
| Disquotale Gewinnverteilung ohne steuerliche Begründung | Schenkungsteuer / verdeckte Gewinnausschüttung (vGA, § 8 Abs. 3 KStG) |
| Sacheinlage zum überhöhten Wert | Differenzhaftung der einbringenden Gesellschafter (§ 9 GmbHG) bis zum Differenzbetrag |
| Eintritt in GbR ohne Bilanzprüfung | Persönliche Haftung für Altverbindlichkeiten (§ 721a BGB n.F.) |

### 1.6 Steuerliche Aspekte (Kurzüberblick)

Der Gesellschaftsvertrag bestimmt mittelbar das Steuerregime — die Wahl der Rechtsform ist eine Steuerwahl mit jährlicher Steuerlast-Differenz von typischerweise 5–15 %. Die wichtigsten Aspekte:

**Personengesellschaften (GbR/eGbR/OHG/KG):**
- **Mitunternehmerschaft** nach § 15 EStG: Gewinne werden den Gesellschaftern zugerechnet (Transparenzprinzip); jeder Gesellschafter zahlt persönlich Einkommensteuer auf seinen Gewinnanteil (Spitzensteuersatz 42 %, Reichensteuer 45 % zzgl. Soli und ggf. Kirchensteuer).
- **Gewerbesteuer** auf Gesellschaftsebene (§ 5 GewStG): Gewerbliche Personengesellschaften zahlen Gewerbesteuer, die teilweise auf die Einkommensteuer angerechnet wird (§ 35 EStG, Faktor 4,0 × Hebesatz).
- **Optionsmodell** (§ 1a KStG): Seit dem KöMoG 2022 können Personenhandelsgesellschaften und seit Wachstumschancengesetz vom 27.03.2024 auch eGbRs auf Antrag wie Kapitalgesellschaften besteuert werden. Antragsfrist: 30.11. des Vorjahres beim zuständigen Finanzamt. Vorteil: thesaurierte Gewinne nur 15 % KSt + GewSt statt persönlichem Einkommensteuersatz.

**Kapitalgesellschaften (GmbH/UG/AG):**
- **Körperschaftsteuer** 15 % (§ 23 KStG) + Solidaritätszuschlag 5,5 % auf KSt = effektiv 15,825 %.
- **Gewerbesteuer** je nach Hebesatz (Bundesdurchschnitt ca. 14 %).
- **Kapitalertragsteuer** 25 % + Soli auf Ausschüttungen an natürliche Personen — alternativ Teileinkünfteverfahren (60 % steuerpflichtig, § 3 Nr. 40 EStG) bei Beteiligungen ≥ 1 % im Privatvermögen.
- **Effektive Gesamtbelastung** Ausschüttung: ca. 48 %; Thesaurierung: ca. 30 %.
- **Schachtelprivileg** (§ 9 Nr. 2a GewStG): Beteiligungen einer Kapitalgesellschaft an anderen Kapitalgesellschaften ab 15 % zu Beginn des Erhebungszeitraums sind gewerbesteuerfrei (Holding-Strukturen).
- **Verdeckte Gewinnausschüttung** (vGA, § 8 Abs. 3 S. 2 KStG): Unangemessen hohe GF-Vergütungen, disquotale Gewinnverteilungen oder günstige Geschäfte mit nahestehenden Personen werden als vGA behandelt — Rückgängigmachung + Strafzinsen.

**Praxis-Faustregel:**
- Geringer Gewinn (< 60.000 EUR p.a.), wenige Gesellschafter, wenig Kapitalbedarf → GbR/Einzelunternehmer steuerlich oft günstiger.
- Hoher Gewinn mit Thesaurierung → GmbH oder Personengesellschaft mit § 1a KStG-Option.
- Hohes Haftungsrisiko (operative Tätigkeit, Bauwesen, Medizin) → GmbH zwingend.
- Holding-Struktur (Mutter-Tochter) → GmbH-Holding wegen Schachtelprivileg.

### 1.7 OHG / KG — Sonderaspekte (kurz)

Falls der User OHG oder KG wählt, sind folgende Spezifika zu beachten (für das Wizard ggf. als Rechtsform-Branch implementieren):

- **OHG** (§§ 105 ff. HGB): Alle Gesellschafter haften unbeschränkt und persönlich. § 124 HGB: OHG kann unter ihrer Firma klagen und verklagt werden. Gewerbliche Tätigkeit zwingend (§ 105 Abs. 1 HGB).
- **KG** (§§ 161 ff. HGB): **Komplementär** haftet unbeschränkt; **Kommanditisten** nur mit ihrer Hafteinlage (§ 171 HGB). Die GmbH & Co. KG nutzt eine GmbH als Komplementärin, wodurch die unbeschränkte Haftung auf das Stammkapital der Komplementär-GmbH reduziert wird — beliebte Konstruktion für Familienunternehmen.
- **Wettbewerbsverbot** § 112 HGB für persönlich haftende Gesellschafter (OHG-Gesellschafter, KG-Komplementäre) gilt **kraft Gesetzes**; Befreiung im Vertrag möglich. Kommanditisten unterliegen kraft Gesetzes keinem Wettbewerbsverbot (BGH II ZR 121/97).
- **Geschäftsführung** § 114 HGB OHG: jeder zur Geschäftsführung allein berechtigt (Einzelgeschäftsführung); im Vertrag abweichend regelbar. Kommanditisten sind grundsätzlich von der Geschäftsführung ausgeschlossen (§ 164 HGB), können aber durch Vertrag mit eingebunden werden (Stimmrecht in Grundlagenfragen).
- **Beschlussmängel-Recht**: Seit MoPeG (§§ 110–115 HGB n.F.) strukturierte Anfechtungs-/Nichtigkeitsklage analog zum GmbH-Recht. Vorher: Feststellungsklage.

---

### 1.8 Entscheidungshilfe — Welche Rechtsform passt?

Praxis-orientierte Entscheidungsmatrix für die Rechtsform-Wahl (für das Wizard hilfreich, um den User vorab einzunorden):

| Kriterium | GbR | eGbR | OHG | KG | UG | GmbH | GmbH & Co. KG |
|-----------|-----|------|-----|-----|-----|------|---------------|
| Gründungskosten | 0–100 € | 100–300 € | 200–500 € | 300–700 € | 250–500 € | 1.500–3.000 € | 2.000–4.000 € |
| Mindestkapital | 0 € | 0 € | 0 € | 0 € (Hafteinlagen frei) | 1 € | 25.000 € (12.500 € einzahlen) | 25.000 € (für Komplementärin) |
| Notarielle Beurkundung | nein | nein | nein (HR-Anmeldung beglaubigt) | nein (HR-Anmeldung beglaubigt) | ja | ja | ja (für GmbH-Komplementärin) |
| Persönliche Haftung | unbeschränkt | unbeschränkt | unbeschränkt | Komplementär unbeschränkt, Kommanditisten beschränkt | beschränkt auf Stammkapital | beschränkt auf Stammkapital | nur über GmbH (begrenzt) |
| Bilanzpflicht | nein | i.d.R. nein | ja (kfm. Buchführung) | ja | ja (kleine GmbH) | ja | ja |
| Veröffentlichungspflicht | nein | Eintragung Gesellschaftsregister | HR | HR | HR + Bundesanzeiger | HR + Bundesanzeiger | HR + Bundesanzeiger |
| Steuerregime | Einkommensteuer | Einkommensteuer (oder § 1a KStG) | Einkommensteuer (oder § 1a KStG) | Einkommensteuer (oder § 1a KStG) | KSt + GewSt | KSt + GewSt | KSt + GewSt (Komplementärin) + ESt (Kommanditisten) |
| Geeignet für | Vereine, Anwalts-/Architekturpartnerschaften, Existenzgründung | Wie GbR, aber mit Immobilien | Handwerk, Handel kfm. Tätigkeit | Familienunternehmen, mittelständischer Handel | Existenzgründung mit Risiko | Standard für seriöse Unternehmen | Familienholdings, mittelgroße Unternehmen mit Steuer-Optimierung |

**Heuristik fürs Wizard:**
- Solo-Existenzgründung mit hohem Risiko: UG
- 2–3 Gründer mit gleicher Quote: GbR (formfrei) oder GmbH (wenn Haftungsschutz wichtig)
- Investorenrunden geplant: zwingend GmbH (Cap Table, Notarpflicht)
- Familienunternehmen mit Vermögenstrennung: GmbH & Co. KG
- Unternehmensgegenstand mit Berufshaftung (Architekt, Anwalt, Arzt): PartG (oder GbR mit Berufshaftpflicht)

---

## 2 · Rollen-Definition

Im Gesellschaftsvertrag gibt es kein typisches A-/B-Rollenpaar wie bei NDA oder Mietvertrag. Stattdessen treten **mehrere Gesellschafter auf gleicher Ebene** auf, wobei zwischen "Mehrheits-" und "Minderheitsgesellschafter" unterschieden wird. Für das Playbook reduzieren wir auf zwei Rollen:

- **Rolle A — Gründungsgesellschafter / Mehrheitsgesellschafter**: Initiator der Gesellschaft, häufig zugleich (geschäftsführender) Gesellschafter mit größter Einlage. Strukturelles Interesse: Kontrolle über Geschäftsführung, einfache Beschlussfassung, Bindung der Mitgesellschafter, hohe Vinkulierung, geringe Abfindung bei Streit.
- **Rolle B — Mitgesellschafter / Minderheitsgesellschafter**: Investor, Mitgründer mit kleinerer Quote, "Junior-Partner". Strukturelles Interesse: Schutz vor Überstimmung, Auskunfts- und Kontrollrechte (§ 51a GmbHG, § 717 BGB), faire Abfindung, Vetorechte bei Grundlagenentscheidungen, Mitspracherecht bei Geschäftsführerwahl.

> **Hinweis für den Wizard:** Bei drei oder mehr Gesellschaftern erfolgt die Eingabe der Parteien dynamisch (Plus-Button). Die Modi-Logik orientiert sich aber an der typischen "Mehrheit-Minderheit"-Konstellation. Single-Member-Gesellschaften (Ein-Personen-GmbH) sind ein Sonderfall; dort sind viele Sektionen (Wettbewerbsverbot, Abfindung, Stimmbindung) inhaltlich obsolet — der Wizard sollte das erkennen und Sektionen ausblenden.

---

## 3 · Modi-Bedeutung (vertragsspezifisch)

- **Sicher** → **Pro Mehrheits-/Gründungsgesellschafter (Rolle A)**: Hohe Stammkapital-/Einlage-Erfordernisse, einfache Mehrheit in der Gesellschafterversammlung, weite Vinkulierungsklausel (Zustimmung der Mehrheit reicht), niedrige Buchwert-Abfindung mit langem Auszahlungs-Zeitraum, striktes nachvertragliches Wettbewerbsverbot, Einzel-Geschäftsführungsbefugnis Mehrheit, jederzeitiges Ausschlussrecht aus wichtigem Grund mit Mehrheitsbeschluss.
- **Ausgewogen** → **Marktstandard / fair zwischen den Gesellschaftern**: Marktübliche Beschlussmehrheiten (einfache Mehrheit für Routine, 3/4 für Grundlagenentscheidungen wie Satzungsänderung), Verkehrswert-Abfindung mit Buchwert-Cap, Vinkulierung mit qualifizierter Mehrheit, gemeinsame Geschäftsführung mit Ressort-Aufteilung, klassisches Wettbewerbsverbot 2 Jahre nachvertraglich mit Karenz, gesetzliche Auskunftsrechte, klare Auflösungs- und Liquidationsregeln.
- **Durchsetzungsstark** → **Pro Minderheitsgesellschafter (Rolle B)**: Sperrminorität (Beschlussregel "alle Grundlagenentscheidungen einstimmig"), Verkehrswert-Abfindung ohne Abschlag, kein/begrenztes Wettbewerbsverbot, erweiterte Auskunfts- und Kontrollrechte (Bücher- und Bilanzeinsicht jederzeit), Mitwirkungsrechte bei Geschäftsführerwahl, Schiedsklausel zum Schutz vor langwierigen ordentlichen Verfahren, kurze Bindungs-/Vinkulierungsfristen.

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Rechtsform-Wahl (steuert dynamisch, welche Sektionen/Optionen gezeigt werden)
  { key: "rechtsform", label: "Rechtsform der zu gründenden Gesellschaft", type: "select", required: true, group: "context",
    options: [
      { value: "gbr", label: "GbR — Gesellschaft bürgerlichen Rechts (formfrei, Privatvermögens-Haftung)" },
      { value: "egbr", label: "eGbR — eingetragene GbR (mit Gesellschaftsregister, Pflicht bei Immobilien)" },
      { value: "ohg", label: "OHG — Offene Handelsgesellschaft (kaufmännisch, Handelsregister A)" },
      { value: "kg", label: "KG — Kommanditgesellschaft (Komplementär + Kommanditisten)" },
      { value: "ug", label: "UG (haftungsbeschränkt) — Stammkapital ab 1 EUR, Rücklagenpflicht" },
      { value: "gmbh", label: "GmbH — Stammkapital min. 25.000 EUR, notarielle Beurkundung" },
      { value: "gmbh_co_kg", label: "GmbH & Co. KG (KG mit GmbH als Komplementär)" }
    ],
    helpText: "Bei AG / eG bitte spezialisierten Notar/Anwalt einschalten — diese Rechtsformen werden vom Wizard nicht abgedeckt."
  },

  // Firma / Name
  { key: "firma", label: "Firma / Name der Gesellschaft", type: "text", required: true, group: "context",
    placeholder: "z.B. Müller & Schmidt GbR / Acme Solutions GmbH",
    helpText: "Bei GmbH/UG: Rechtsformzusatz Pflicht. Bei eGbR: Zusatz 'eGbR' / 'eingetragene Gesellschaft bürgerlichen Rechts'." },
  { key: "sitz", label: "Sitz der Gesellschaft (Stadt/Gemeinde)", type: "text", required: true, group: "context",
    helpText: "Maßgeblich für Gerichtsstand, zuständiges Registergericht, ggf. Gewerbesteuer-Hebesatz." },
  { key: "geschaeftsanschrift", label: "Geschäftsanschrift", type: "textarea", required: true, group: "context" },
  { key: "unternehmensgegenstand", label: "Unternehmensgegenstand", type: "textarea", required: true, group: "context",
    placeholder: "z.B. Entwicklung und Vertrieb von Software im Bereich KI-gestützter Vertragsanalyse",
    helpText: "Möglichst konkret. Erlaubnispflichtige Gegenstände (Bank, Versicherung, Heilkunde) erfordern zusätzliche Genehmigungen." },

  // Gesellschafter A
  { key: "partyA_name", label: "Gesellschafter A — Name / Firma", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Gesellschafter A — Anschrift", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_birthdate", label: "Gesellschafter A — Geburtsdatum (bei nat. Person)", type: "date", required: false, group: "partyA" },
  { key: "partyA_legalForm", label: "Gesellschafter A — Rechtsform", type: "select", required: true, group: "partyA",
    options: [
      { value: "natperson", label: "Natürliche Person" },
      { value: "kapges", label: "Kapitalgesellschaft (GmbH/AG/UG)" },
      { value: "persges", label: "Personengesellschaft" },
      { value: "verein", label: "Verein / Stiftung" }
    ]
  },
  { key: "partyA_einlage", label: "Gesellschafter A — Einlage / Stammeinlage (EUR)", type: "number", required: true, group: "partyA",
    helpText: "GmbH min. 1 EUR pro Anteil + insgesamt 25.000 EUR; UG ab 1 EUR; GbR/OHG/KG frei." },
  { key: "partyA_quote", label: "Gesellschafter A — Anteilsquote (%)", type: "number", required: true, group: "partyA" },

  // Gesellschafter B
  { key: "partyB_name", label: "Gesellschafter B — Name / Firma", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Gesellschafter B — Anschrift", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_birthdate", label: "Gesellschafter B — Geburtsdatum (bei nat. Person)", type: "date", required: false, group: "partyB" },
  { key: "partyB_legalForm", label: "Gesellschafter B — Rechtsform", type: "select", required: true, group: "partyB",
    options: [
      { value: "natperson", label: "Natürliche Person" },
      { value: "kapges", label: "Kapitalgesellschaft" },
      { value: "persges", label: "Personengesellschaft" },
      { value: "verein", label: "Verein / Stiftung" }
    ]
  },
  { key: "partyB_einlage", label: "Gesellschafter B — Einlage / Stammeinlage (EUR)", type: "number", required: true, group: "partyB" },
  { key: "partyB_quote", label: "Gesellschafter B — Anteilsquote (%)", type: "number", required: true, group: "partyB" },

  // Geschäftsjahr
  { key: "geschaeftsjahr", label: "Geschäftsjahr", type: "select", required: true, group: "context",
    options: [
      { value: "kalender", label: "Kalenderjahr (01.01.–31.12.) — Standard" },
      { value: "abweichend", label: "Abweichendes Geschäftsjahr (z.B. 01.07.–30.06.)" }
    ]
  },
  // Optional: Mehr-Gesellschafter-Setup
  { key: "weitere_gesellschafter", label: "Weitere Gesellschafter (3+)", type: "select", required: false, group: "context",
    options: [
      { value: "nein", label: "Nein — nur 2 Gesellschafter" },
      { value: "ja", label: "Ja — die Beträge/Quoten müssen im Anschluss manuell ergänzt werden" }
    ]
  }
]
```

---

## 5 · Sektionen (Step 3 des Wizards)

> 13 strategische Entscheidungen. Sektionen sind **rechtsformsensitiv** — bei GbR sind manche Optionen (z.B. notarielle Beurkundung) ausgeblendet, bei GmbH andere (z.B. UG-Rücklagenpflicht) aktiviert. Diese Steuerung erfolgt im Decision-Engine via `rechtsform`-Wert aus den partyFields.

### § 2 — Rechtsformwahl-Bestätigung und Gründungsformalien
- **Key**: `formation`
- **Importance**: critical
- **Beschreibung**: Bestätigt die Rechtsform und entscheidet über Gründungsformalitäten (Notar, Musterprotokoll, Eintragung).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gbr_formfrei` | GbR formfrei (kein Notar, keine Eintragung) | Klassische GbR-Gründung; Vertrag privatschriftlich; keine Eintragung notwendig. | medium | Schnell und billig (keine Notar- und Registergebühren). Aber: persönliche unbeschränkte Haftung; bei Immobiliengeschäften später eGbR-Eintragung zwingend (BGH V ZB 17/24). | Wenn die Gesellschaft Grundbesitz erwerben oder Anteile an anderen Gesellschaften halten will — Eintragung wird Pflicht. | A: Bei größerem Geschäft auf eGbR drängen für Klarheit. B: Akzeptabel bei reinem Dienstleistungs-Geschäft. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `egbr_eingetragen` | eGbR — Eintragung im Gesellschaftsregister | Eintragung beim zuständigen Amtsgericht; Namenszusatz "eGbR". Publizität gegenüber Dritten. | low | Höhere Rechtssicherheit; ermöglicht Grundbuch-Eintragungen ohne Folgeverfahren; Gebühren ca. 100–250 EUR. | Wenn Gesellschafter wechseln — Eintragungen müssen angepasst werden. | Empfohlene Standardlösung bei seriöser GbR-Gründung. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `gmbh_musterprotokoll` | GmbH/UG mit Musterprotokoll | Vereinfachte Gründung nach Anlage zum GmbHG; max. 3 Gesellschafter, ein Geschäftsführer, keine Sonderklauseln. | medium | Schnell und kostengünstig (Notar-Gebühren reduziert nach KostO). ABER: Keine individuellen Klauseln möglich (Vinkulierung, Wettbewerbsverbot, Abfindung etc. müssen alle separat als Gesellschaftervereinbarung gelöst werden — was teurer wird). | Wenn die Gründer komplexe Strukturen wollen — Musterprotokoll passt nicht. | Bei mehr als 3 Gesellschaftern oder individuellen Klauseln: Verzicht auf Musterprotokoll. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `gmbh_individuelle_satzung` | GmbH/UG mit individueller Satzung (Notar, voller Vertrag) | Vollständige Satzung mit allen Wahl-Klauseln; notarielle Beurkundung; Eintragung HRB. | low | Höhere Notar-Kosten (1.500–3.000 EUR je nach Stammkapital), aber alle Schutzklauseln möglich. Marktstandard für seriöse Gründungen. | Bei sehr kleinen Vorhaben Kosten/Nutzen prüfen. | Für ernsthafte Unternehmen Standard. | sicher: true, ausgewogen: true, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `gmbh_individuelle_satzung`
  - ausgewogen: `egbr_eingetragen` (oder `gmbh_individuelle_satzung` je nach Rechtsform)
  - durchsetzungsstark: `gbr_formfrei`

---

### § 3 — Stammkapital / Einlagen und ihre Erbringung
- **Key**: `capital_contribution`
- **Importance**: critical
- **Beschreibung**: Höhe und Art der Einlagen — Bareinlage vs. Sacheinlage, Einzahlungsmodalitäten, Nachschusspflicht.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `bar_voll` | Bareinlage, sofort vollständig einzuzahlen | Bei GmbH: 25.000 EUR Stammkapital, vor Eintragung voll einzuzahlen. | low | Maximale Rechtssicherheit; keine Streitfragen über Einlagewerte. | Wenn Gründer Liquiditätsengpass haben — vor Anmeldung kein Geld. | Bei kleinen Gründungen Standard. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `bar_50prozent` | Bareinlage, 50 % vor Anmeldung (gesetzliches Minimum bei GmbH) | § 7 Abs. 2 GmbHG: 12.500 EUR vor Anmeldung; Rest auf Anforderung der Gesellschafterversammlung. | medium | Restzahlungspflicht bleibt bestehen; bei Insolvenz Anspruch auf vollständige Einzahlung. | Wenn Gesellschafter den Restbetrag später nicht zahlen können — Klage durch Geschäftsführer/Insolvenzverwalter. | A: Volleinzahlung verlangen. B: Lange Zahlungsfristen. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `sacheinlage` | Sacheinlage mit Sachgründungsbericht | Bei GmbH § 5 Abs. 4 GmbHG: Sachgründungsbericht (Wert, Bewertungsmethode); Werthaltigkeitsprüfung durch Notar/Registergericht. | high | Bei Überbewertung: Differenzhaftung des einbringenden Gesellschafters (§ 9 GmbHG). Bewertungsstreitigkeiten häufig. | Wenn Sachwert sich später als zu niedrig erweist — Differenzhaftung. | Wertgutachten unabhängiger Sachverständiger einholen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `gemischt_bar_sach` | Gemischte Einlage (Bar + Sache) | Z.B. 15.000 EUR Bar + 10.000 EUR Equipment (mit Sachgründungsbericht). | medium | Komplexer; Sachteil mit allen Risiken der Sacheinlage. | Bewertungsstreit über Sachteil. | Wertgutachten, klare Aufteilung. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `bar_voll`
  - ausgewogen: `bar_50prozent`
  - durchsetzungsstark: `bar_50prozent`

---

### § 4 — Geschäftsführung und Vertretung
- **Key**: `management`
- **Importance**: critical
- **Beschreibung**: Wer führt die Geschäfte, wer vertritt nach außen? Einzel- vs. Gesamtgeschäftsführung. Bei GmbH § 35 GmbHG; bei GbR § 720 BGB n.F.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `einzeln_alle` | Einzelgeschäftsführungs- und Vertretungsbefugnis aller Gesellschafter/Geschäftsführer | Jeder kann allein handeln und die Gesellschaft binden. | high | Maximales Vertrauen erforderlich. Ein einzelner kann die Gesellschaft im Außenverhältnis voll verpflichten — Risiko bei Streit oder Vertrauensbruch. | Wenn ein Gesellschafter ohne Absprache große Verträge schließt — Bindung der Gesellschaft, intern Schadensersatz. | A: Beschränkungen einbauen (Vier-Augen-Prinzip ab Schwellenwert). | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `einzeln_einer` | Einzelgeschäftsführung Mehrheits-Gesellschafter, Mitwirkung bei Grundlagengeschäften | Nur Gesellschafter A (Mehrheit) führt; Gesellschafter B nur bei "Grundlagengeschäften" (Investitionen > Schwelle, Personal-Wechsel, Rechtsstreitigkeiten). | medium | Vorteilhaft für A; B ist faktisch Investor ohne Tagesgeschäft. | B: kein Einblick ins Tagesgeschäft, eingeschränkter Schutz. | B: Kataloge der Grundlagengeschäfte erweitern. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `gesamt_alle` | Gesamtgeschäftsführungs-/Vertretungsbefugnis (Vier-Augen-Prinzip) | Alle Geschäfte erfordern die Mitwirkung von mindestens zwei Gesellschaftern/Geschäftsführern. | low | Hohe Sicherheit gegen Alleingänge; aber langsamer im Tagesgeschäft. Operativ mühsam ab 4+ Personen. | Bei eiligen Entscheidungen (z.B. Vertragsunterschrift im Termin) — Mitunterschrift fehlt. | Schwellenwert-Regelung: bis 5.000 EUR einzeln, darüber gemeinsam. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `extern_gf` | Externe(r) Fremd-Geschäftsführer (nicht-Gesellschafter) | Geschäftsführung an Dritte delegiert; Gesellschafter nur Eigentümer + Kontrolleur. | medium | Klarer Trennung Eigentum-Management. Sozialversicherungsrechtlich GF i.d.R. abhängig beschäftigt (BSG B 12 R 15/21 R bei Minderheits-GF stets prüfen). | Wenn GF schlecht performt — Abberufung mit qualifizierter Mehrheit (§ 38 GmbHG, 3/4). | Anstellungsvertrag separat — Dienstvertrag, ggf. mit Bonus. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `einzeln_einer`
  - ausgewogen: `gesamt_alle`
  - durchsetzungsstark: `einzeln_alle`

---

### § 5 — Beschlussfassung und Mehrheitserfordernisse
- **Key**: `voting`
- **Importance**: critical
- **Beschreibung**: Welche Mehrheit für welche Entscheidung? § 47 GmbHG: einfache Mehrheit als Default; § 53 Abs. 2 GmbHG: 3/4-Mehrheit zwingend für Satzungsänderung. Bei GbR: § 714 BGB n.F. Standard "Stimmen nach Kapitalanteilen", abweichend möglich.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `einstimmig_alles` | Einstimmigkeit für alle Beschlüsse | Jeder Gesellschafter hat Veto. Klassischer GbR-Default (§ 714 BGB a.F.) — bei MoPeG nun „nach Anteilen", aber abweichend wählbar. | high | Lähmungsgefahr — ein einzelner Gesellschafter blockiert. Bei Streit: Patt, keine Beschlüsse möglich. | Bei Streit zwischen Gesellschaftern: Stillstand der Gesellschaft. | A: einfache Mehrheit für Routine, einstimmig nur für Grundlagen. B: Sperrminorität bei wichtigen Themen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `einfach_alles` | Einfache Mehrheit für alle Beschlüsse (Mehrheit der Anteile) | Mehrheit der Stimmen entscheidet. | medium | Mehrheits-Gesellschafter dominiert vollständig; Minderheit hat keine Sperre. | Mehrheit kann ohne Rücksicht auf Minderheit Satzung ändern (sofern nicht zwingend 3/4 verlangt). | B: Sperrminorität bei Grundlagen einbauen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `gestaffelt_einfach_3_4` | Gestaffelt: Einfache Mehrheit für Routine, 3/4 für Grundlagen | Routine (Geschäftsbericht, Tagesgeschäft) einfach; Grundlagenentscheidungen (Satzungsänderung, Kapitalerhöhung, Ausschluss) 3/4-Mehrheit. | low | Marktstandard; ausgewogenes Verhältnis Mehrheit-Minderheit. § 53 Abs. 2 GmbHG zwingend für echte Satzungsänderungen. | Selten Streit. | Standard. Optional Liste der Grundlagenentscheidungen erweitern. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `sperrminoritaet` | Sperrminorität bei allen wichtigen Beschlüssen (z.B. ab 25 % Anteil) | Beschlüsse über Satzungsänderung, Auflösung, Verkauf wichtiger Vermögenswerte, Geschäftsführerwechsel benötigen Zustimmung des Gesellschafters mit Sperrminorität (z.B. ≥ 25 %). | medium | Schutz Minderheit; gleichzeitig Lähmungsrisiko bei Streit. | Wenn Mehrheit Routine-Reform anstrebt, die nicht zentrale Punkte trifft. | A: Liste der "wichtigen" Beschlüsse eng halten. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `einfach_alles`
  - ausgewogen: `gestaffelt_einfach_3_4`
  - durchsetzungsstark: `sperrminoritaet`

---

### § 6 — Gewinn- und Verlustverteilung
- **Key**: `profit_loss`
- **Importance**: high
- **Beschreibung**: Standard ist Verteilung nach Anteilen (§ 709 BGB n.F.; § 29 GmbHG). Abweichende Vereinbarung im Gesellschaftsvertrag möglich (Tätigkeitsvergütung, Vorabgewinn).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `nach_anteilen` | Verteilung nach Anteilen / Stammeinlage | Default; Gewinn und Verlust nach Quote. | low | Klar, einfach. Gerichtsfest. | Wenn Beiträge unterschiedlich (z.B. einer arbeitet, andere zahlt) — Gerechtigkeit-Frage. | Tätigkeitsvergütung extra regeln. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `vorabgewinn_taetigkeit` | Vorabgewinn für Tätigkeit + Rest nach Anteilen | Geschäftsführender Gesellschafter erhält feste Tätigkeitsvergütung (z.B. 60.000 EUR/Jahr); verbleibender Gewinn nach Anteilen. | low | Saubere Trennung Arbeitseinsatz/Kapitaleinsatz. | Wenn Gesellschaft in Verlustjahren — Tätigkeitsvergütung bleibt schuldig (Rechnungsabgrenzung). | Höhe der Vorab-Vergütung marktüblich (Geschäftsführergehalt). | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `thesaurierung_pflicht` | Thesaurierung — Mindestrücklage statt Ausschüttung | Z.B. 50 % des Gewinns werden zwingend in die Rücklage eingestellt; nur Rest wird ausgeschüttet. UG-Pflicht 25 % nach § 5a Abs. 3 GmbHG ist Sonderfall. | medium | Stärkt Eigenkapital; Gesellschafter erhalten weniger Liquidität. | Wenn Gesellschafter Kapital für persönliche Ausgaben benötigen — Streit. | Quote anpassen je nach Wachstumsphase. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `disquot_abweichend` | Disquotale Verteilung (abweichend von Anteilen) | Z.B. 70/30 obwohl Anteile 50/50. | high | Steuerlich relevant: Finanzamt prüft auf Schenkung / verdeckte Gewinnausschüttung. § 1a KStG-Optionsmodell: bei Kapitalgesellschafts-Besteuerung steuerliche Klarheit. | Steuerliche Nachforderung; bei GmbH ggf. Rückforderung als VGA. | Steuerberater einbinden; klare schriftliche Begründung der Disquotalität. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `vorabgewinn_taetigkeit`
  - ausgewogen: `nach_anteilen`
  - durchsetzungsstark: `nach_anteilen`

---

### § 7 — Vinkulierung (Beschränkung der Anteilsübertragung)
- **Key**: `transfer_restriction`
- **Importance**: high
- **Beschreibung**: Bei GmbH § 15 Abs. 5 GmbHG: durch Gesellschaftsvertrag kann Übertragung an Zustimmungserfordernis geknüpft werden. Bei GbR/OHG/KG ist Übertragung ohne Vereinbarung **nur mit Zustimmung aller** möglich (§ 711 BGB n.F.). Notarielle Form bei GmbH-Anteilen zwingend (§ 15 Abs. 3+4 GmbHG).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `frei` | Anteile frei übertragbar (keine Vinkulierung) | Jeder Gesellschafter kann seinen Anteil ohne Zustimmung verkaufen. | high | Mehrheits-Gesellschafter kann Anteile an Dritte (auch Wettbewerber) verkaufen — Mitgesellschafter haben keinen Einfluss auf Gesellschafterkreis. | Wenn fremde Investoren in den Gesellschafterkreis eintreten, ohne dass die anderen das wollen. | Vorkaufsrecht oder Vinkulierung verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `zustimmung_alle` | Zustimmung aller Gesellschafter erforderlich | Nur einstimmige Zustimmung erlaubt Übertragung. Bei Verstoß: schwebende Unwirksamkeit. | medium | Maximaler Schutz; aber blockierende Wirkung — Anteilsverkauf praktisch unmöglich, wenn ein Gesellschafter sperrt. | Wenn Verkäufer Liquidität braucht und Mitgesellschafter blockieren — Lähmung. | Andienungsrecht / Vorkaufsrecht zu Verkehrswert als Ausweg. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `zustimmung_3_4_mit_andienung` | Zustimmung mit qualifizierter Mehrheit (3/4) + Andienungsrecht | Übertragung an Dritte nur mit 3/4-Beschluss; bei Ablehnung müssen Mitgesellschafter den Anteil selbst erwerben (zu Verkehrswert / Buchwert). | low | Marktstandard. Schützt vor unerwünschten neuen Gesellschaftern, gibt Verkäufer Exit-Möglichkeit. | Streit über Verkehrswert-Bestimmung — Bewertungsklausel im Vertrag wichtig. | Bewertungsmethode klar: z.B. Stuttgarter Verfahren, IDW S1, Multiplikatoren. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `vorkaufsrecht_einfach` | Einfaches Vorkaufsrecht der Mitgesellschafter | Mitgesellschafter haben Vorrecht zum Kauf zu denselben Konditionen (wie ein Drittangebot). | low | Praktikabel; Mitgesellschafter können ungeliebte Dritte ablösen, aber Verkäufer bekommt seinen Preis. | Wenn Drittangebot nicht ernsthaft (Strohmann-Konstrukt). | "Drittangebot in Schriftform mit nachweisbarem Preis" verlangen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `zustimmung_alle`
  - ausgewogen: `zustimmung_3_4_mit_andienung`
  - durchsetzungsstark: `vorkaufsrecht_einfach`

---

### § 8 — Wettbewerbsverbot Gesellschafter
- **Key**: `non_compete`
- **Importance**: high
- **Beschreibung**: Bei GmbH § 88 AktG analog für Vorstand bzw. § 88 AktG nicht direkt anwendbar — Gesellschafter haben grundsätzlich kein gesetzliches Wettbewerbsverbot, aber **Treuepflicht** (BGH NJW 2002, 1338). Bei OHG/KG § 112 HGB Wettbewerbsverbot für persönlich haftende Gesellschafter. Vertragliche Verbote nur wirksam, wenn zeitlich/räumlich/sachlich begrenzt + zur Existenzsicherung erforderlich (BGH II ZR 208/08; Art. 12 GG, § 138 BGB).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keines` | Kein Wettbewerbsverbot | Gesellschafter dürfen jederzeit konkurrieren, allerdings Treuepflicht (BGH NJW 2002, 1338). | medium | Bei OHG/KG § 112 HGB greift kraft Gesetzes für persönlich haftende Gesellschafter — also Verbot trotzdem. Bei GmbH/GbR Treuepflicht als Auffanglösung. | A-Sicht: Mitgesellschafter könnte gleichzeitig Wettbewerber gründen. | A: Mindestens während Mitgliedschaft Verbot einbauen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `waehrend_mitgliedschaft` | Verbot nur während Mitgliedschaft | Wettbewerbsverbot solange Gesellschafter beteiligt; nach Ausscheiden frei. | low | Marktstandard für GmbH; entspricht der Treuepflicht. | Wenn Gesellschafter nach Ausscheiden direkt mit erlangtem Know-how konkurriert. | Befristetes nachvertragliches Verbot für sensitive Branchen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `waehrend_2_jahre_nachvertraglich` | Verbot während Mitgliedschaft + 2 Jahre nachvertraglich (begrenzt) | Sachlich begrenzt auf den Unternehmensgegenstand der Gesellschaft, räumlich auf das Tätigkeitsgebiet, zeitlich auf 2 Jahre nach Ausscheiden. Mit Karenzentschädigung (üblich 50 % der durchschnittlichen Bezüge). | low | Wirksam wenn alle drei Begrenzungen erfüllt + Karenz angemessen (BGH II ZR 208/08). | Wenn räumlich/sachlich zu weit — Klausel nichtig. | Räumlich/sachlich eng halten. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `streng_5_jahre_keine_karenz` | 5 Jahre nachvertraglich, keine Karenz | Maximalkonstellation. | high | Praktisch immer **nichtig** (§ 138 BGB, Art. 12 GG, BGH II ZR 208/08). 2 Jahre ist faktische Obergrenze. | Klausel kippt; kein Schutz für Gesellschaft. | Kürzen auf 2 Jahre + Karenz. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `streng_5_jahre_keine_karenz` *(rechtlich riskant — Wizard-Hinweis: faktisch oft unwirksam)*
  - ausgewogen: `waehrend_mitgliedschaft`
  - durchsetzungsstark: `keines`

---

### § 9 — Ausscheiden / Ausschluss eines Gesellschafters
- **Key**: `exit_exclusion`
- **Importance**: critical
- **Beschreibung**: Bei GbR seit MoPeG (§ 723 BGB n.F.): Kündigung führt zum Ausscheiden, nicht zur Auflösung. Bei GmbH: Einziehung nach § 34 GmbHG (Satzung muss vorsehen). Ausschlussgründe (Tod, Insolvenz, Pflichtverletzung, langfristige Krankheit) und ihre Folgen.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `kein_ausschluss` | Kein vertraglicher Ausschluss-Mechanismus | Nur gesetzliche Möglichkeit (§ 140 HGB analog / § 727 BGB n.F. — Auflösungsklage); langwieriges Gerichtsverfahren. | high | Praktisch keine schnelle Reaktionsmöglichkeit; Streit lähmt Gesellschaft. | Streit unter Gesellschaftern — keine Trennungsmöglichkeit ohne Klage. | Ausschlussklausel mit Gründen einbauen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `wichtiger_grund_3_4` | Ausschluss aus wichtigem Grund mit 3/4-Beschluss | Wichtige Gründe: schwere Pflichtverletzung, Insolvenzantrag, längere Erwerbsunfähigkeit. Beschluss durch Gesellschafterversammlung mit 3/4-Mehrheit (ohne Stimme des Betroffenen). | low | Marktstandard. Wirksam wenn "wichtiger Grund" konkret definiert. BGH II ZR 426/17: Vertrauensverhältnis-Maßstab. | Ausgeschlossener klagt auf Unwirksamkeit — gerichtliche Überprüfung. | Klar Liste der "wichtigen Gründe" definieren. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `auch_ohne_grund_einfach` | Ausschluss auch ohne wichtigen Grund (Hinauskündigung) | Mehrheit kann jederzeit Mitgesellschafter "hinauskündigen". | high | **Grundsätzlich sittenwidrig** (§ 138 BGB) und nichtig (BGH II ZR 4/06). Nur in eng begrenzten Sonderfällen wirksam (Praxisgemeinschaften). | Klausel kippt — kein Ausschluss möglich. | Ersetzen durch "wichtiger Grund". | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `tod_insolvenz_automatisch` | Automatisches Ausscheiden bei Tod / Insolvenz / Vermögensverfall | Bei Eintritt definierter Ereignisse Anteil verfällt automatisch (Einziehung); Erben/Insolvenzverwalter erhalten Abfindung. | low | Schutz vor unerwünschten Erben oder Insolvenzverwaltern. § 34 GmbHG erlaubt Einziehung. Steuerliche Wirkung bei Erbschaft prüfen. | Streit über Abfindungshöhe (siehe nächste Sektion). | Klare Bewertungsmethode in Vertrag. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `auch_ohne_grund_einfach` *(rechtlich riskant — Wizard-Hinweis: bei AGB-Charakter / B2C oft nichtig)*
  - ausgewogen: `wichtiger_grund_3_4`
  - durchsetzungsstark: `wichtiger_grund_3_4`

---

### § 10 — Abfindung beim Ausscheiden
- **Key**: `severance`
- **Importance**: critical
- **Beschreibung**: Höhe und Modus der Auszahlung an den ausscheidenden Gesellschafter. **Kritischste Klausel** — BGH II ZR 216/13 (Sittenwidrigkeit eines Abfindungsausschlusses) und II ZR 279/09 (krasses Missverhältnis Buchwert/Verkehrswert macht Klausel unwirksam).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `verkehrswert_voll` | Voller Verkehrswert (Sachverständigenbewertung), Auszahlung in 6 Monaten | Marktwert nach Bewertungsgutachten (z.B. IDW S1); Zahlung binnen 6 Monaten. | low | Fairster Ansatz, gerichtsfest. Belastet aber Liquidität der Gesellschaft. | Wenn Gesellschaft die Liquidität nicht hat — Existenzgefahr. | Auszahlung in Raten 12–24 Monate verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `verkehrswert_raten_5j` | Verkehrswert, Auszahlung in 5 Jahresraten + marktübliche Verzinsung | Verkehrswert wird über 5 Jahre ratenweise ausgezahlt, mit Zins (z.B. 4 % p.a.). | low | Ausgewogen — Schutz Gesellschaftsliquidität, faire Abfindung. § 271a BGB Höchstgrenzen Zahlungsfristen B2B beachten. | Bei Zinssatz unter Marktzins: Streit. | Marktzins (z.B. EZB-Basiszins + 5 %) verhandeln. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `buchwert_mit_cap` | Buchwert (Steuerbilanz) mit Cap bei krassem Missverhältnis | Buchwert nach Bilanz; aber Klausel: "wenn Buchwert weniger als 70 % des Verkehrswerts → Anpassung auf 70 %". | medium | Schutz vor Sittenwidrigkeitsverdikt (BGH II ZR 279/09); aber Mehrheits-Gesellschafter hat trotzdem Vorteil. | Wenn Klausel ohne Cap — wird gerichtlich auf Verkehrswert angehoben. | Klare prozentuale Untergrenze (70–80 %) einbauen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `kein_abfindung_pflichtverstoß` | Reduzierte Abfindung bei Pflichtverstoß | Bei Ausschluss aus wichtigem Grund nur 50 % des Buchwerts. | high | **Sittenwidrig nach BGH II ZR 216/13**, wenn als faktische Vertragsstrafe wirkend. Klausel meist nichtig. | Klausel kippt — voller Verkehrswert ist zu zahlen. | Mit Sanktionscharakter problematisch; max. moderater Abschlag (10–20 %). | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `buchwert_mit_cap`
  - ausgewogen: `verkehrswert_raten_5j`
  - durchsetzungsstark: `verkehrswert_voll`

---

### § 11 — Auskunfts- und Kontrollrechte
- **Key**: `information_rights`
- **Importance**: high
- **Beschreibung**: Bei GmbH § 51a GmbHG zwingend (jeder Gesellschafter hat Anspruch auf Auskunft + Bucheinsicht); kann nicht ausgeschlossen werden. Bei GbR § 717 BGB n.F. (jeder Gesellschafter hat Bücher- und Bilanzeinsicht-Recht).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich` | Gesetzliche Auskunftsrechte (§ 51a GmbHG / § 717 BGB n.F.) | Mindeststandard; bei GmbH zwingend. | low | Sichere Lösung; bei GmbH nicht abdingbar (§ 51a Abs. 3 GmbHG). | Selten Streit; allenfalls über "missbräuchliche Anfragen". | Klausel "missbräuchliche Anfragen ablehnbar" einbauen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `beschraenkt_quartalsbericht` | Begrenzte Information: nur Quartalsbericht | Mehrheit liefert Quartalsberichte, ad-hoc-Anfragen nur in Gesellschafterversammlung. | high | **Bei GmbH unwirksam** (§ 51a Abs. 3 GmbHG zwingend). Bei GbR möglich, aber riskant für Minderheit. | B kann bei Verdacht auf Misswirtschaft nicht prüfen. | Ad-hoc-Anfragen nicht abdingbar; Klausel meist gerichtlich kassiert. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `erweitert_audit` | Erweiterte Rechte inkl. Audit-Recht / externer Prüfer | Jeder Gesellschafter kann auf eigene Kosten externe Prüfung beauftragen. | low | Maximaler Schutz Minderheit. Kostenfrage: Verursacher trägt, außer Befund bestätigt Verstoß. | Aufwendig; bei Konflikten Dauerprüfungsdruck möglich. | Quote/Kostenregel klar. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `online_dashboard` | Echtzeit-Einsicht über Gesellschafter-Dashboard | Buchhaltungs-Software gibt allen Gesellschaftern jederzeit Lese-Zugriff (DATEV, lexoffice, Pennylane etc.). | low | Modern, effizient. Vertrauensbasis stark. | Wenn Mehrheit "lieber nicht alles offen" möchte. | DSGVO-Compliance bei personenbezogenen Daten beachten. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `gesetzlich`
  - ausgewogen: `gesetzlich`
  - durchsetzungsstark: `erweitert_audit`

---

### § 12 — Auflösung und Liquidation
- **Key**: `dissolution`
- **Importance**: medium
- **Beschreibung**: Auflösungsgründe (Beschluss, Insolvenz, Zeitablauf, Erreichen des Zwecks); Liquidatoren; Verteilung des Liquidationserlöses (§§ 730–740 BGB n.F. für GbR; § 60 ff. GmbHG für GmbH).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `beschluss_3_4` | Auflösung mit 3/4-Mehrheit | Standard-Schwellenwert. § 60 Abs. 1 Nr. 2 GmbHG analog. | low | Marktüblich. Notarielle Beurkundung Pflicht (§ 53 Abs. 2 GmbHG). | Bei Streit kann Mehrheit Auflösung erzwingen — Minderheit unterliegt. | B: Sperrminorität (>1/4-Anteil) wirkt automatisch. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `einstimmig` | Auflösung nur einstimmig | Jeder Gesellschafter hat Veto. | medium | Schutz vor unfreiwilliger Auflösung. Bei Patt: Auflösungsklage (§ 727 BGB n.F.) als Notausgang. | Lähmungsgefahr. | A: 3/4 verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `automatisch_zeit_ziel` | Automatische Auflösung bei Zeit-/Zielerreichung | Vertrag definiert: "Auflösung am 31.12.2030" oder "Auflösung bei Erreichen des Projektziels X". | low | Klar planbar; typisch bei Joint-Venture. | Wenn Ziel/Zeit unscharf — Streit. | Klare, messbare Kriterien. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `liquidation_durch_geschaeftsfuehrer` | Liquidation durch bisherige Geschäftsführer + 1 unabhängigen Liquidator | Bisheriges Management führt durch, Externer kontrolliert. | low | Schutz vor Selbstbedienung. Bei großen Gesellschaften Standard. | Externer-Honorar belastet Liquidationserlös. | Honorardeckel verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `liquidation_durch_geschaeftsfuehrer`
  - ausgewogen: `beschluss_3_4`
  - durchsetzungsstark: `beschluss_3_4`

---

### § 13 — Streitbeilegung (Schiedsklausel / Gerichtsstand)
- **Key**: `dispute_resolution`
- **Importance**: medium
- **Beschreibung**: Gesellschafterstreitigkeiten dauern vor ordentlichen Gerichten oft 3–7 Jahre. Schiedsklauseln (z.B. nach DIS-Schiedsgerichtsordnung 2018) sind in GmbH-Streitigkeiten weit verbreitet — schneller, vertraulich. Schriftform zwingend (§ 1031 ZPO).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `ordentliches_gericht` | Ordentliches Gericht am Sitz der Gesellschaft | Klassischer Gerichtsstand; Berufung möglich. | medium | Lange Verfahrensdauer (bei Landgericht 18–36 Monate, mit Berufung deutlich länger); öffentliche Verhandlung. | Hohe Kosten; Reputationsrisiko bei öffentlicher Verhandlung. | Mediation vor Klage als Vorstufe verhandeln. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `mediation_dann_gericht` | Verpflichtende Mediation, dann ordentliches Gericht | Vor Klageerhebung 3 Monate Mediationsversuch (z.B. nach DIS-MediationsO). | low | Marktstandard für familiäre/partnerschaftliche Strukturen. | Wenn eine Partei Mediation blockiert — Verzögerung. | Klare Frist (3 Monate); danach freier Klageweg. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `schiedsgericht_dis` | Schiedsgericht (DIS-Schiedsgerichtsordnung 2018) | Streitigkeiten vor Schiedsgericht (1 oder 3 Schiedsrichter); DIS-Regeln gelten ergänzend; vertraulich. | medium | Schnell (12–24 Monate), vertraulich, fachlich qualifizierte Schiedsrichter. ABER: hohe Kosten (Verfahrenskosten ab 5–10 % Streitwert). Keine Berufung. | Bei niedrigen Streitwerten (< 100.000 EUR) unverhältnismäßig teuer. | Bei großen GmbH-Streitigkeiten Standard. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `schiedsklausel_inkl_beschluss` | Schiedsklausel inkl. Beschlussmängel-Anfechtung | Auch Anfechtungs-/Nichtigkeitsklagen gegen Gesellschafterbeschlüsse vor Schiedsgericht. Wirksamkeit nach BGH "Schiedsfähigkeit III" (II ZR 255/13, 06.04.2017) bei Erfüllung der dort genannten Mindestanforderungen (Beteiligung aller Gesellschafter, Wahl Schiedsrichter, Verfahrensregeln). | low | Vollständige Schiedsabwicklung; höchste Vertraulichkeit. | Wenn Mindestanforderungen nicht erfüllt — Klausel teilweise unwirksam. | DIS-Ergänzungsregel ESUG nutzen, sichert Mindestanforderungen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `schiedsgericht_dis`
  - ausgewogen: `mediation_dann_gericht`
  - durchsetzungsstark: `mediation_dann_gericht`

---

## 6 · Anwaltsperspektive — kritische Hinweise

1. **Rechtsformwahl ist Steuerwahl.** Eine GbR/OHG zahlt Einkommensteuer auf Ebene der Gesellschafter (Mitunternehmerschaft, § 15 EStG); eine GmbH zahlt 15 % Körperschaftsteuer + Gewerbesteuer + bei Ausschüttung 25 % Kapitalertragsteuer (Definitivbelastung knapp 30 %). Für thesaurierende Personengesellschaften lohnt seit dem Wachstumschancengesetz (27.03.2024) das Optionsmodell § 1a KStG — auch für die eGbR seit 28.03.2024. Frist: Antrag bis 30.11. des Vorjahres.

2. **Notarpflicht ernst nehmen.** Gründung GmbH/UG, jede Anteilsübertragung GmbH, alle Satzungsänderungen, Kapitalerhöhungen — alles **zwingend notariell** (§§ 2, 15, 53 GmbHG). Verstoß = Nichtigkeit nach § 125 BGB. Auch ein "Vorvertrag" zur Anteilsübertragung ist formbedürftig (BGH NJW 2009, 836).

3. **MoPeG: Alt-GbRs überprüfen.** Wer eine GbR vor 2024 gegründet hat, sollte den Vertrag jetzt MoPeG-tauglich anpassen — insbesondere bei Grundbesitz (BGH V ZB 17/24 vom 03.07.2025: vor jedem Grundbuchakt eGbR-Eintragung Pflicht). Auch Beschlussregeln (jetzt nach Anteilen statt einstimmig) sollten geprüft werden.

4. **Persönliche Haftung GbR realistisch einschätzen.** Wer in einer GbR/OHG Gesellschafter ist, haftet **mit dem gesamten Privatvermögen, gesamtschuldnerisch und unbeschränkt** (§ 721 BGB n.F.; § 128 HGB). Eine "GbR mit beschränkter Haftung" gibt es nicht (LG Berlin NZG 2002, 822). Wer Haftung beschränken will: GmbH/UG.

5. **Eintrittshaftung neuer Gesellschafter** (§ 721a BGB n.F.): Wer in eine bestehende GbR eintritt, haftet auch für Altverbindlichkeiten. Bei Eintritt unbedingt Bilanzprüfung + Freistellungsvereinbarung mit Altgesellschaftern.

6. **Abfindungsklauseln prüfen.** Buchwert allein ist riskant: BGH II ZR 279/09 (Verhältnis Buchwert/Verkehrswert "1:10" sittenwidrig). Faustregel: Buchwert + Cap auf min. 70–80 % des Verkehrswerts; Auszahlung in max. 5 Jahresraten mit marktüblichen Zinsen. Reduzierte Abfindung als Sanktion ist nach BGH II ZR 216/13 sittenwidrig.

7. **Wettbewerbsverbote nicht überdehnen.** BGH II ZR 208/08: Drei kumulative Voraussetzungen — maßgeblicher Einfluss, Erforderlichkeit zur Existenzsicherung, Keine übermäßige Beschränkung der Berufsausübung (Art. 12 GG). Faktische Obergrenze: 2 Jahre, sachlich/räumlich klar abgegrenzt, mit angemessener Karenz (50 % Bezüge).

8. **Vinkulierung + notarielle Form bei Anteilsübertragung GmbH.** § 15 Abs. 3+4 GmbHG: Beide — der Verpflichtungsvertrag (z.B. Kaufvertrag) und der dingliche Übertragungsvertrag — müssen notariell beurkundet sein. Verstoß = beide Verträge nichtig.

9. **Statusfeststellung für Geschäftsführer-Gesellschafter.** BSG B 12 R 15/21 R (27.04.2023): Auch Ein-Personen-GmbH-GF kann sozialversicherungspflichtig sein, wenn er weisungsgebunden für nur einen Auftraggeber arbeitet. Bei Minderheits-GFs (< 50 %) immer Statusfeststellung empfehlen, sonst drohen rückwirkend Sozialversicherungsbeiträge.

10. **Stimmbindungsverträge schützen weniger als gedacht.** BGH II ZR 71/23 (16.07.2024, "Hannover 96"): Stimmbindungen wirken nur **schuldrechtlich zwischen den Vertragsparteien**, nicht gegenüber der Gesellschaft. Beschluss bleibt wirksam, auch wenn Stimmbindung verletzt wurde — nur Schadensersatz im Innenverhältnis. Wer wirklich Macht ausüben will: in die Satzung schreiben (mit notarieller Beurkundung).

11. **UG aufpassen: Rücklagenpflicht 25 % bis 25.000 EUR.** § 5a Abs. 3 GmbHG: ein Viertel des Jahresüberschusses (abzüglich Verlustvortrag) zwingend in Rücklage; Ausschüttungssperre. Erst wenn Rücklage + Stammkapital = 25.000 EUR → Umfirmierung in "GmbH" möglich (§ 5a Abs. 5 GmbHG). Verstoß: nichtige Beschlüsse, Geschäftsführerhaftung.

12. **Schachtelprivileg beachten.** § 9 Nr. 2a GewStG: Beteiligungen einer Kapitalgesellschaft an anderen Kapitalgesellschaften ab 15 % zu Beginn des Erhebungszeitraums sind gewerbesteuerfrei (Holding-Strukturen relevant).

13. **Schiedsfähigkeit III** (BGH II ZR 255/13, 06.04.2017): Schiedsklauseln für Beschlussmängel-Streitigkeiten nur wirksam, wenn (a) alle Gesellschafter ausreichend informiert, (b) Mitwirkung an Schiedsrichterauswahl, (c) gemeinsame Verhandlung aller Streitigkeiten desselben Beschlusses. DIS-Ergänzungsregeln ESUG erfüllen diese Vorgaben.

14. **Treuepflicht ist kein Ersatz für Klauseln.** BGH NJW 2002, 1338: Gesellschafter unterliegen einer Treuepflicht — aber sie ersetzt keine konkrete vertragliche Regelung. Wer auf "wir sind ja Freunde" baut, bekommt im Streitfall ein juristisches Vakuum.

15. **Steuerliche Beratung Pflicht.** Jeder Gesellschaftsvertrag hat erhebliche steuerliche Konsequenzen — Wahl der Rechtsform, disquotale Gewinnverteilung, Sacheinlagen, Geschäftsführer-Vergütungen, Pensionszusagen. Steuerberater **vor** notarieller Beurkundung einbinden.

16. **Tod-/Krankheitsregelung früh einbauen.** Stirbt ein Gesellschafter ohne Vertragsregel, gehen Anteile auf die Erben über (Universalsukzession § 1922 BGB). Bei GbR/OHG vor MoPeG führte das ggf. zur Auflösung — heute (§ 723 Abs. 1 Nr. 4 BGB n.F.) zum Ausscheiden mit Abfindungsanspruch. Klassische Lösungen: Nachfolgeklausel (qualifiziert/einfach), Eintrittsrecht für bestimmte Erben, Fortsetzungsklausel mit Abfindung.

17. **Pensionszusagen an Gesellschafter-GF kritisch prüfen.** Steuerlich anerkennt das Finanzamt nur "angemessene" Pensionszusagen (BFH-Rechtsprechung: max. 75 % der letzten Aktivbezüge). Verstoß = vGA, Rückgängigmachung. Bei GmbH müssen Erdienungs- und Erprobungsphasen eingehalten werden (mindestens 10 Jahre Erdienensdauer, 5 Jahre Erprobung).

18. **Geschäftsführer-Anstellungsvertrag separat.** Der Anstellungsvertrag des GF ist NICHT Teil des Gesellschaftsvertrags, sondern ein separater Dienstvertrag (§ 611 BGB). Wichtige Punkte: Vergütung, Tantieme, Probezeit, Wettbewerbsverbot mit Karenz, D&O-Versicherung, Abberufungsklausel mit Abfindung.

19. **Earn-Out und Gesellschafter-Darlehen.** Bei Investorenstrukturen üblich: Investoren-Anteile mit Earn-Out (variabler Kaufpreis), Vorzugsdividende, Liquidationspräferenz. Solche Klauseln gehören in eine **Gesellschaftervereinbarung (SHA — Shareholders' Agreement)** außerhalb der Satzung — wegen Vertraulichkeit und Flexibilität (formfrei änderbar). Aber: die wichtigsten Punkte (Vinkulierung, Vorzugsstimmrecht) müssen ZUSÄTZLICH in der Satzung stehen, sonst nur schuldrechtliche Wirkung (BGH II ZR 71/23 lässt grüßen).

20. **Compliance, KYC und Transparenzregister.** Seit 01.08.2021 müssen alle Kapital- und Personenhandelsgesellschaften (auch UG, GmbH, OHG, KG, eGbR) ihre wirtschaftlich Berechtigten ins Transparenzregister (§ 20 GwG) eintragen — **nicht mehr "Mitteilungsfiktion"** über Handelsregister. Verstoß = Bußgeld bis 150.000 EUR (§ 56 GwG).

---

## 7 · Wizard-spezifische Hinweise (Implementierungs-Notizen)

- Die `rechtsform`-Auswahl in den partyFields steuert dynamisch die Sichtbarkeit von Sektionen und Optionen. Beispiele:
  - Bei `rechtsform = "gbr"` ist die Option `gmbh_musterprotokoll` in § 2 ausgeblendet.
  - Bei `rechtsform = "gmbh" / "ug"` zeigt § 3 zusätzlich den Stammkapital-Mindestbetrag-Hinweis.
  - Bei `rechtsform = "ug"` blendet das Wizard einen Pflichthinweis zur 25-%-Rücklage ein.
  - Bei `rechtsform = "gmbh" / "ug"` ist § 11 Option `beschraenkt_quartalsbericht` als "rechtlich riskant — § 51a GmbHG zwingend" markiert.
- Vor dem Generate-Schritt sollte das Wizard explizit auf folgende Pflichten hinweisen:
  - "Notarielle Beurkundung erforderlich" (bei GmbH/UG/AG)
  - "Eintragung im Gesellschaftsregister empfohlen" (bei GbR mit Immobilienbezug → eGbR)
  - "Steuerliche Beratung vor Unterzeichnung empfohlen"
  - "Statusfeststellungsverfahren bei Geschäftsführer-Gesellschaftern (Minderheits-GF) prüfen"
- Single-Member-Konstellation (1 Gesellschafter, Ein-Personen-GmbH/UG): Sektionen § 5 (Beschlussfassung), § 7 (Vinkulierung), § 8 (Wettbewerbsverbot), § 9 (Ausscheiden), § 10 (Abfindung) sind in dieser Konstellation gegenstandslos — das Wizard sollte sie auf "wird bei Single-Gesellschafter nicht benötigt" setzen (mit kurzer Begründung).
- Hinweis auf Berater-Pflicht: Da Gesellschaftsverträge **immer** notariell und steuerlich begleitet werden müssen, sollte das Wizard am Ende explizit sagen: "Diese KI-generierte Vorlage ist Ausgangspunkt für die Beratung mit Ihrem Notar/Steuerberater — nicht der finale Vertrag."

---

## 8 · Quellen

### 8.1 BGH-Rechtsprechung (Aktenzeichen)
- **BGH vom 03.07.2025 — V ZB 17/24** (eGbR-Eintragung Pflicht bei Grundstücksgeschäften)
- **BGH vom 16.07.2024 — II ZR 71/23** (Hannover 96 — Stimmbindungsverträge wirken nur schuldrechtlich)
- **BGH vom 06.04.2017 — II ZR 255/13** ("Schiedsfähigkeit III" — Anforderungen an Schiedsklauseln für Beschlussmängel)
- **BGH vom 16.07.2019 — II ZR 426/17** (Ausschluss Gesellschafter aus wichtigem Grund)
- **BGH vom 29.04.2014 — II ZR 216/13** (Sittenwidrigkeit von Abfindungsausschluss als Sanktion)
- **BGH vom 30.11.2009 — II ZR 208/08** (Wettbewerbsverbote Gesellschafter — drei kumulative Voraussetzungen, Art. 12 GG)
- **BGH vom 27.09.2011 — II ZR 279/09** (Buchwert vs. Verkehrswert — krasses Missverhältnis sittenwidrig)
- **BGH vom 19.09.2005 — II ZR 4/06** (Hinauskündigungsklauseln grundsätzlich sittenwidrig)
- **BGH vom 29.01.2001 — II ZR 331/00** ("ARGE Weißes Ross" — Rechtsfähigkeit GbR; Vorgänger zu MoPeG)
- **BGH NJW 2002, 1338** (Treuepflicht GmbH-Gesellschafter)
- **BSG vom 27.04.2023 — B 12 R 15/21 R** (Ein-Personen-GmbH-GF und Scheinselbstständigkeit)
- **OLG Hamm vom 13.12.2023 — 8 U 102/23** (MoPeG zeitliche Anwendbarkeit auf Altverbindlichkeiten)

### 8.2 Gesetze
- BGB §§ 705–740c i.d.F. MoPeG (in Kraft 01.01.2024); insb. § 705 Abs. 2 (Rechtsfähigkeit), §§ 707 ff. (Gesellschaftsregister), § 711 (Übertragung Anteile), § 714 (Beschlussfassung), § 717 (Auskunftsrechte), § 720 (Geschäftsführung), § 721 (Haftung), § 721a (Eintrittshaftung), § 723 (Ausscheiden)
- HGB §§ 105–177a (OHG, KG); § 112 (Wettbewerbsverbot persönlich haftender Gesellschafter); §§ 110–115 (Beschlussmängel)
- GmbHG §§ 1, 2 (Gründung, notarielle Beurkundung), § 5 (Stammkapital, Sachgründungsbericht), § 5a (UG-Sonderregeln, Rücklagenpflicht), § 7 (Anmeldung), § 9 (Differenzhaftung), § 15 (Übertragung Anteile, notarielle Form), § 29 (Gewinnverteilung), § 34 (Einziehung), § 35 (Vertretung), § 38 (Abberufung GF), § 46 (Zuständigkeit Gesellschafterversammlung), § 47 (Mehrheiten), § 51a (Auskunftsrecht), § 53 (Satzungsänderung 3/4), § 60 (Auflösung)
- AktG §§ 7, 23 (Gründung AG), § 76 ff. (Vorstand)
- KStG § 1, § 1a (Optionsmodell, erweitert durch Wachstumschancengesetz vom 27.03.2024)
- EStG § 15 (Mitunternehmerschaft)
- GewStG § 9 Nr. 2a (Schachtelprivileg)
- GBO § 47 Abs. 2 (eGbR-Eintragungspflicht)
- ZPO § 1031 (Form Schiedsvereinbarung)
- BGB § 138 (Sittenwidrigkeit), § 125 (Formverstoß)
- GG Art. 12 (Berufsfreiheit)

### 8.3 Web-Quellen (Stand 29.04.2026)
- [Bundesnotarkammer — MoPeG-Rundschreiben](https://www.bnotk.de/aufgaben-und-taetigkeiten/rundschreiben/details/gesetz-zur-modernisierung-des-personengesellschaftsrechts-mopeg)
- [Görg — Reform des Personengesellschaftsrechts zum 01.01.2024](https://www.goerg.de/de/aktuelles/veroeffentlichungen/21-08-2023/ueberblick-ueber-die-reform-des-personengesellschaftsrechts-mopeg)
- [PwC Legal — eGbR-Eintragung ab 01.01.2024](https://legal.pwc.de/de/news/fachbeitraege/mopeg-eintragung-von-gesellschaften-buergerlichen-rechts-im-gesellschaftsregister-ab-01-01-2024)
- [IHK Hannover — BGH V ZB 17/24, eGbR Grundstücksübertragung](https://www.ihk.de/hannover/hauptnavigation/recht/aktuell3/bgh-ohne-egbr-eintragung-keine-grundstuecksuebertragung-6789496)
- [Heckschen & Salomon — BGH II ZR 71/23 (Hannover 96)](https://www.heckschen-salomon.de/rechtsprechung-detail/keine-zustandsbegruendende-satzungsdurchbrechung-bei-abberufung-eines-geschaeftsfuehrers-durch-nach-satzung-unzustaendige-gesellschafterversammlung.html)
- [Heuking — Abfindungsausschluss als Sanktion sittenwidrig](https://www.heuking.de/de/news-events/newsletter-fachbeitraege/artikel/abfindungsausschluss-als-sanktionsmittel-ist-sittenwidrig.html)
- [Deloitte Tax-News — Sittenwidrigkeit Abfindungsausschlüsse GmbH](https://www.deloitte-tax-news.de/unternehmensrecht/sittenwidrigkeit-von-abfindungsausschluessen-in-gmbh-satzungen.html)
- [Rose & Partner — Wettbewerbsverbot Gesellschafter](https://www.rosepartner.de/rechtsberatung/gesellschaftsrecht/gesellschaftsrecht/wettbewerbsverbot/wettbewerbsverbot-gesellschafter.html)
- [Existenzgründungsportal BMWK — UG Rücklagenpflicht](https://www.existenzgruendungsportal.de/Redaktion/DE/BMWK-Infopool/Antworten/Recht/Rechtsformen/UG-haftungsbeschraenkt/Unternehmergesellschaft-gesetzliche-Ruecklage-bilden)
- [advolon — Neues GbR-Recht 2024 / Haftung MoPeG](https://advolon.de/haftung-gbr-gesellschaftsrechtsreform-mopeg/)
- [Bird & Bird — Optionsmodell § 1a KStG nach Wachstumschancengesetz](https://www.twobirds.com/de/insights/2024/germany/anpassungen-bei-der-option-zur-koerperschaftsbesteuerung-durch-das-wachstumschancengesetz)
- [BZSt — Option nach § 1a KStG](https://www.bzst.de/DE/Unternehmen/EUInternational/Option_nach_1a_KStG/option_nach_1a_kstg_node.html)
- [Aurantia — BGH II ZR 71/23 für die GmbH-Praxis](https://aurantia.de/blog/bgh-zur-abberufung-des-geschaeftsfuehrers-durch-die-gesellschafterversammlung-was-heisst-das-fuer-die-gmbh-praxis/)
- [George Rechtsanwälte — Vinkulierungsklausel Gesellschaftsvertrag](https://george-rechtsanwaelte.de/blog/posts/vinkulierungsklausel-im-gesellschaftsvertrag.html)
- [ETL Rechtsanwälte — MoPeG-Anwendbarkeit auf Altverbindlichkeiten](https://www.etl-rechtsanwaelte.de/aktuelles/zur-anwendbarkeit-des-mopeg-auf-die-haftung-fuer-eine-gesellschaftsverbindlichkeit)

**Stand: 29.04.2026**

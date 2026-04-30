# Mietvertrag — Playbook-Konzept

> **Status**: Recherchedokument — Phase 1 (vor Code-Umsetzung)
> **Erstellt**: 29.04.2026
> **Cluster**: Immobilien
> **Zentrale Differenzierung**: Wohnraum (zwingender Mieterschutz, AGB-Recht streng) vs. Gewerbe (Vertragsfreiheit, neues Textformerfordernis seit 01.01.2025)

---

## Metadaten

- **Slug**: `mietvertrag`
- **Title**: Mietvertrag
- **Description**: Standardisierter Wohnraum- oder Gewerberaummietvertrag mit voller Berücksichtigung der zwingenden Mieterschutzvorschriften (BGB §§ 535–580a) und aktueller BGH-Rechtsprechung 2024–2025.
- **Difficulty**: `komplex`
- **Estimated Time**: 12–18 Minuten
- **Icon**: `home`
- **Legal Basis**: BGB §§ 535–580a, MietpreisbremsenG (verlängert bis 31.12.2029), BetrKV, HeizkostenV, WoVermittG, BEG IV (Bürokratieentlastungsgesetz, ab 01.01.2025 — Textform für Gewerbe), § 550 BGB (Wohnraum weiterhin Schriftform!)

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze

| Norm | Bedeutung im Playbook |
|------|----------------------|
| **BGB §§ 535–548** | Allgemeines Mietrecht — Hauptpflichten, Mängel, Verwendungsersatz |
| **BGB §§ 549–577a** | Wohnraummiete — zwingender Mieterschutz, Kündigungsschutz, Mieterhöhung, Vorkaufsrecht |
| **BGB § 550** | Schriftformerfordernis bei Wohnraummiete > 1 Jahr (für Gewerbe seit 01.01.2025 nur noch Textform) |
| **BGB § 551** | Mietkaution — max. 3 Nettokaltmieten, getrennte Anlage, Verzinsung Spareinlage 3-Monats-Kündigungsfrist |
| **BGB §§ 556–556e** | Betriebskosten + Mietpreisbremse |
| **BGB § 573** | Berechtigtes Interesse für ordentliche Kündigung durch Vermieter (kein Eigentümerinteresse ohne Grund!) |
| **BGB § 573c** | Gestaffelte Kündigungsfristen für Vermieter (3/6/9 Monate, abhängig von Mietdauer) |
| **BetrKV** | Welche Betriebskosten umlagefähig sind (Katalog § 2 BetrKV) |
| **HeizkostenV** | Pflicht zur verbrauchsabhängigen Abrechnung (Heiz-, Warmwasserkosten) |
| **MietpreisbremsenG** | Bei Neuvermietung in angespannten Wohnungsmärkten max. 10 % über ortsüblicher Vergleichsmiete |

### 1.2 Aktuelle BGH-Rechtsprechung (2024–2026)

- **BGH VIII ZR 79/22 vom 06.03.2024** — Quotenabgeltungsklausel bei Schönheitsreparaturen weiterhin als formularmäßige Klausel grundsätzlich unwirksam.
- **BGH VIII ZB 43/23 vom 30.01.2024** — Klarstellung: Die Unwirksamkeit einer Quotenabgeltungsklausel infiziert NICHT automatisch die Schönheitsreparaturklausel.
- **BGH XII ZR 96/23 vom 29.01.2025** — Beweislast für unrenovierten Übergabezustand liegt beim Mieter, der sich auf Unwirksamkeit der Schönheitsreparaturklausel berufen will.
- **BGH VIII ZR 286/22 vom 10.04.2024** — Eigenbedarf: Auch berufliche Mitnutzung kann ausreichen, sofern der Vermieter ohne Bezug einen anerkennenswerten Nachteil hätte.
- **BGH VIII ZR 276/23 vom 10.07.2024** — "Familienangehörige" i.S.d. § 573 II Nr. 2 BGB: Cousins fallen NICHT darunter (Beschränkung auf Personen mit Zeugnisverweigerungsrecht).
- **BGH VIII ZR 114/22 vom 08.04.2024** — Suizidgefahr beim Mieter ist anerkannter Härtegrund nach § 574 BGB.
- **BGH VIII ZR 56/25 vom 17.12.2025** — Einvernehmliche Mietsenkung im laufenden Mietverhältnis unterliegt nicht der Mietpreisbremse.
- **BGH VIII ZR 168/12 vom 20.03.2013 (weiterhin Leitentscheidung)** — Generelles Hunde- und Katzenverbot in Formularmietvertrag ist unwirksam (§ 307 II Nr. 1 BGB). Einzelfallabwägung notwendig.

### 1.3 Pflichthinweise

- **Schriftformerfordernis Wohnraum**: § 550 BGB greift bei befristeten Wohnraummietverträgen > 1 Jahr weiterhin. Verstoß → Vertrag gilt als unbefristet, ordentlich kündbar nach § 573c BGB.
- **Textform Gewerbe**: Seit 01.01.2025 (§§ 578, 550 BGB n.F.) genügt für Gewerbemiete die Textform (E-Mail). Übergangsfrist bis 01.01.2026 für Altverträge.
- **Kappungsgrenze**: § 558 III BGB — max. 20 % in 3 Jahren, in Spannungsmärkten 15 %.
- **Mietpreisbremse**: § 556d ff. BGB — Wirkungsbereich vom Bundesland per Verordnung festgelegt. Auskunftsanspruch des Mieters § 556g IV BGB.
- **Verbraucherschutz B2C**: Bei Wohnraummiete sind alle AGB-Vorschriften (§§ 305 ff. BGB) anwendbar, auch wenn Vermieter Privatperson ist (§ 310 III BGB).

### 1.4 Risiken bei fehlerhafter Gestaltung

| Risiko | Folge |
|--------|-------|
| Unwirksame Schönheitsreparaturklausel | Vermieter trägt die Renovierungskosten selbst, kein Wegfall der gesamten Klausel — Mieter ohne Pflicht. |
| Fehlende Schriftform Wohnraum | Mietvertrag gilt unbefristet, Mieter kann nach Kündigungsfrist (3 Monate) jederzeit kündigen. |
| Kaution > 3 Nettokaltmieten | Übersteigender Teil ist nach § 551 IV BGB unwirksam, Mieter kann zurückfordern. |
| Pauschale Betriebskostenklausel ohne BetrKV-Bezug | BGH: Klausel intransparent, Vermieter kann nur "kalte Betriebskosten" abrechnen, deren Umlage gesondert vereinbart wurde (§ 556 I BGB). |
| Mietpreisbremse missachtet | Mieter kann nach Rüge (§ 556g II BGB) für Zukunft die überhöhte Miete senken; bei vorsätzlicher Umgehung Rückforderung möglich. |
| Generelles Tierhaltungsverbot | Klausel unwirksam, gesetzlicher Standard (Einzelfallabwägung) gilt. |

---

## 2 · Rollen-Definition

| Rolle | Key | Label | Beschreibung |
|-------|-----|-------|--------------|
| **A** | `vermieter` | Vermieter | Eigentümer / Vermieter der Mietsache. Stellt die Wohnung/das Gewerbeobjekt zur Nutzung gegen Entgelt zur Verfügung. |
| **B** | `mieter` | Mieter | Nutzt die Mietsache gegen Mietzahlung. Bei Wohnraum: Verbraucher i.S.d. § 13 BGB, besonderer Schutz. |

---

## 3 · Modi-Bedeutung (vertragsspezifisch)

| Modus | Begünstigte Partei | Konkrete Auswirkung |
|-------|-------------------|---------------------|
| **Sicher** | Pro Vermieter — aber innerhalb der zwingenden Mieterschutzgrenzen! | Maximale Kaution (3 Nettokaltmieten), Indexmiete oder Staffelmiete, Renovierungspflicht (soweit zulässig), Tierhaltung mit Zustimmungsvorbehalt, Hausordnung als Vertragsbestandteil, Untervermietung nur mit Zustimmung. |
| **Ausgewogen** | Marktstandard, gerichtsfest beidseitig durchsetzbar | Standard-Wohnraummietvertrag mit den vom BGH wiederholt akzeptierten Klauseln. Kaution 2 Monatsmieten, normale Schönheitsreparaturen-Verteilung soweit BGH-konform, Tierhaltung mit Einzelfallregelung. |
| **Durchsetzungsstark** | Pro Mieter | Geringe Kaution oder Bürgschaft statt Bargeld, keine Renovierungspflicht beim Auszug, Tierhaltung erlaubt, langes Vorkaufsrecht, Untervermietung erlaubt, Nachmieterklausel zugunsten Mieter. |

> **Wichtig**: Bei Wohnraummiete sind die Modi durch zwingende Mieterschutzvorschriften (§§ 569, 573 ff. BGB) eingegrenzt. "Sicher = Pro Vermieter" bedeutet hier "maximale rechtliche Ausschöpfung der Vermieterrechte", nicht "Mieterschutz aushebeln".

---

## 4 · Partei-Felder (Step 2 des Wizards)

| key | label | type | required | group |
|-----|-------|------|----------|-------|
| `partyA_name` | Name / Firma (Vermieter) | text | true | partyA |
| `partyA_address` | Adresse | textarea | true | partyA |
| `partyA_representative` | Vertreten durch | text | false | partyA |
| `partyB_name` | Name / Firma (Mieter) | text | true | partyB |
| `partyB_address` | Aktuelle Adresse | textarea | true | partyB |
| `partyB_birthdate` | Geburtsdatum (Wohnraum) | date | false | partyB |
| `usage_type` | Nutzungsart | select | true | context | options: `wohnraum`, `gewerbe`, `gemischt` |
| `object_address` | Adresse der Mietsache | textarea | true | context |
| `object_size` | Größe (m²) | number | true | context |
| `object_rooms` | Anzahl Zimmer | number | false | context |
| `object_description` | Beschreibung der Mietsache (Stockwerk, Lage, Ausstattung) | textarea | true | context |
| `start_date` | Mietbeginn | date | true | context |
| `cold_rent` | Nettokaltmiete (EUR/Monat) | number | true | context |
| `operating_costs` | Betriebskostenvorauszahlung (EUR/Monat) | number | false | context |

---

## 5 · Sektionen (Step 3 des Wizards)

> **Anzahl**: 11 Sektionen — komplex, aber unter dem 14er-Limit
> **Paragraphen-Nummerierung**: § 1 Mietsache → § 2–§ 12 Sektionen → § 13 Schlussbestimmungen

---

### Sektion 1 — Mietzeit und Vertragslaufzeit

- **key**: `term`
- **paragraph**: § 2
- **importance**: `critical`
- **description**: Befristet oder unbefristet? Bei Wohnraum nur unter engen Voraussetzungen befristbar (§ 575 BGB).

**Optionen:**

1. **`unbefristet`** — Unbefristet (Standard Wohnraum)
   - description: "Mietverhältnis auf unbestimmte Zeit. Beendet durch ordentliche Kündigung mit gesetzlichen Fristen."
   - risk: `low`
   - riskNote: "Gesetzlicher Regelfall bei Wohnraummiete. BGH-konform. Mieterschutz nach § 573 BGB voll wirksam."
   - whenProblem: "Wenn der Vermieter Planungssicherheit für eine bestimmte Zeit braucht (z.B. Eigenbedarf in 3 Jahren) — geht nur über § 575 BGB Befristung."
   - whenNegotiate: "Praktisch nie zu verhandeln, da gesetzlicher Standard und für beide Seiten flexibel."
   - recommended: `{ sicher: false, ausgewogen: true, durchsetzungsstark: true }`

2. **`qualifiziert_befristet`** — Qualifiziert befristet (§ 575 BGB)
   - description: "Befristung mit gesetzlichem Befristungsgrund (Eigenbedarf, Umbau, Verwendung als Werkswohnung). Grund muss bei Vertragsschluss schriftlich genannt sein!"
   - risk: `medium`
   - riskNote: "Nur wirksam, wenn Befristungsgrund konkret und nachprüfbar genannt. Unkonkrete Begründung → Vertrag gilt unbefristet (BGH NJW 2007, 2177)."
   - whenProblem: "Wenn der Befristungsgrund später wegfällt (z.B. geplanter Umbau wird nicht durchgeführt) — Mieter kann verlängern."
   - whenNegotiate: "Mieter sollte Klarheit über Befristungsgrund verlangen und Auskunftsanspruch nach § 575 II BGB nutzen."
   - recommended: `{ sicher: true, ausgewogen: false, durchsetzungsstark: false }`

3. **`zeitmietvertrag_gewerbe`** — Befristet (Gewerbe, z.B. 5 Jahre)
   - description: "Feste Vertragslaufzeit. Während der Laufzeit nur außerordentliche Kündigung möglich (z.B. § 543 BGB). Seit 01.01.2025 für Verträge > 1 Jahr Textform genügt."
   - risk: `low`
   - riskNote: "Gewerbeüblich. Schafft Planungssicherheit beidseitig. Achtung Übergangsregel: Altverträge bis 31.12.2024 brauchen weiterhin Schriftform bis 01.01.2026."
   - whenProblem: "Wenn unvorhersehbare Ereignisse (Insolvenz, Standortverlagerung) einen Ausstieg erfordern — nur über außerordentliche Kündigung möglich."
   - whenNegotiate: "Sonderkündigungsrecht für definierte Ereignisse (z.B. Geschäftsaufgabe nach 3 Jahren) verhandeln."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }` (nur bei Gewerbe relevant — Smart-Default per Kontextprüfung)

4. **`staffel`** — Staffelmietvertrag (§ 557a BGB)
   - description: "Mietzeit unbefristet, aber Mieterhöhung im Voraus betragsmäßig festgelegt (Staffel). Mindestabstand zwischen Erhöhungen 1 Jahr."
   - risk: `medium`
   - riskNote: "BGH-fest, aber: Während Staffelvereinbarung sind Mieterhöhungen nach §§ 558, 559 BGB ausgeschlossen. Mietpreisbremse gilt für jede Stufe! Kündigungsausschluss max. 4 Jahre."
   - whenProblem: "Wenn das Marktniveau stärker steigt als die Staffel — Vermieter verliert. Wenn Markt fällt — Mieter zahlt zu viel."
   - whenNegotiate: "Höhe der Staffeln, Kündigungsausschluss-Dauer (max. 4 Jahre § 557a III BGB)."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }`

- **smartDefault**: `{ sicher: "qualifiziert_befristet", ausgewogen: "unbefristet", durchsetzungsstark: "unbefristet" }`

---

### Sektion 2 — Miete und Mieterhöhung

- **key**: `rent_increase`
- **paragraph**: § 3
- **importance**: `critical`
- **description**: Wie soll sich die Miete während des Mietverhältnisses entwickeln? Achtung Mietpreisbremse, Kappungsgrenze, Indexbindung.

**Optionen:**

1. **`vergleichsmiete`** — Mieterhöhung nach ortsüblicher Vergleichsmiete (§ 558 BGB)
   - description: "Vermieter kann alle 15 Monate auf die ortsübliche Vergleichsmiete erhöhen, max. 20 % in 3 Jahren (15 % in Spannungsmärkten)."
   - risk: `low`
   - riskNote: "Gesetzlicher Standard. BGH-fest. Kappungsgrenze § 558 III BGB einhalten. Begründung mit Mietspiegel, Sachverständigengutachten oder 3 Vergleichswohnungen."
   - whenProblem: "Wenn Vermieter formelle Anforderungen verfehlt (z.B. fehlende Begründung) — Erhöhungsverlangen unwirksam."
   - whenNegotiate: "Selten verhandelbar, da gesetzlicher Mechanismus."
   - recommended: `{ sicher: false, ausgewogen: true, durchsetzungsstark: true }`

2. **`staffel`** — Staffelmiete (§ 557a BGB)
   - description: "Konkrete Erhöhungsbeträge im Voraus festgelegt, Mindestabstand 1 Jahr."
   - risk: `medium`
   - riskNote: "Plansichere Mieterhöhung, aber während Staffelzeit keine §§ 558, 559 BGB-Erhöhungen. Mietpreisbremse gilt für jede Stufe!"
   - whenProblem: "Marktsteigerungen über Staffelhöhe → Vermieter verliert. Sinkende Marktmieten → Mieter zahlt zu viel."
   - whenNegotiate: "Staffelhöhe, Kündigungsausschluss (max. 4 Jahre)."
   - recommended: `{ sicher: true, ausgewogen: false, durchsetzungsstark: false }`

3. **`index`** — Indexmiete (§ 557b BGB)
   - description: "Miete wird an den vom Statistischen Bundesamt ermittelten Verbraucherpreisindex (VPI) gekoppelt. Anpassung max. 1x jährlich, schriftliche Erklärung erforderlich."
   - risk: `medium`
   - riskNote: "Während Indexbindung keine §§ 558, 559 BGB-Erhöhungen außer bei Modernisierungsumlage durch Gesetz. Bei Inflation für Vermieter vorteilhaft, bei Deflation für Mieter."
   - whenProblem: "Hohe Inflation → Mieter belastet stark. Niedrige Inflation → Vermieter verliert Marktanpassung."
   - whenNegotiate: "Mietpreisbremse bei Indexstufen prüfen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }` (vertragstyp-spezifisch — Kontext entscheidet)

4. **`fest`** — Festmiete ohne Anpassungsmechanismus
   - description: "Miete bleibt für die Vertragslaufzeit unverändert."
   - risk: `medium`
   - riskNote: "Pro Mieter — vor allem bei Inflationen attraktiv. Vermieter kann nur über §§ 558, 559 BGB unter Berücksichtigung der Kappungsgrenze erhöhen."
   - whenProblem: "Vermieter verliert über Jahre an Inflation. Mieter ist gegenüber Marktanpassungen geschützt."
   - whenNegotiate: "Vermieter wird oft Staffel oder Index vorziehen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: true }`

- **smartDefault**: `{ sicher: "staffel", ausgewogen: "vergleichsmiete", durchsetzungsstark: "fest" }`

---

### Sektion 3 — Mietkaution

- **key**: `deposit`
- **paragraph**: § 4
- **importance**: `high`
- **description**: Wie hoch ist die Sicherheitsleistung? § 551 BGB: max. 3 Nettokaltmieten bei Wohnraum, in 3 Raten zahlbar.

**Optionen:**

1. **`max_drei_kaltmieten`** — 3 Nettokaltmieten (gesetzliches Maximum)
   - description: "Maximalkaution in Höhe von 3 Nettokaltmieten. Mieter darf in 3 gleichen monatlichen Raten zahlen (§ 551 II BGB)."
   - risk: `low`
   - riskNote: "Maximalsicherheit für Vermieter, gesetzlich erlaubt. Getrennte Anlage Pflicht (Insolvenzschutz § 551 III BGB)."
   - whenProblem: "Bei Mietern mit knapper Liquidität (vor allem im Wohnraum) Hürde — Mieter sollten Ratenzahlung nutzen."
   - whenNegotiate: "Mieter kann Bürgschaft als Alternative anbieten (z.B. Kautionskasse, Elternbürgschaft)."
   - recommended: `{ sicher: true, ausgewogen: false, durchsetzungsstark: false }`

2. **`zwei_kaltmieten`** — 2 Nettokaltmieten
   - description: "Reduzierte Kaution. Marktüblich in vielen Regionen."
   - risk: `low`
   - riskNote: "Genug Sicherheit für die meisten Schäden, mieterfreundlich. Marktstandard in Mittel-/Süddeutschland."
   - whenProblem: "Bei starken Schäden oder Mietausfall könnte 2 Monatsmieten knapp werden."
   - whenNegotiate: "Häufig direkt akzeptabel."
   - recommended: `{ sicher: false, ausgewogen: true, durchsetzungsstark: false }`

3. **`buergschaft`** — Mietbürgschaft / Kautionsversicherung
   - description: "Statt Bargeld eine selbstschuldnerische Bürgschaft (Bank, Kautionskasse, Privatperson) bis zur Höhe von max. 3 Nettokaltmieten."
   - risk: `medium`
   - riskNote: "Mieter behält Liquidität. Vermieter muss Bürgschaft prüfen — bei Bürgschaft einer Privatperson Bonität prüfen!"
   - whenProblem: "Bei zahlungsunfähiger Bürgin (Privatperson) wertlos. Bürgschaft auf erstes Anfordern bei AGB unwirksam (BGH NJW 2007, 759)."
   - whenNegotiate: "Vermieter sollte nur Bankbürgschaft oder Versicherungsbürgschaft akzeptieren."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: true }`

4. **`keine`** — Keine Kaution
   - description: "Vermieter verzichtet auf Sicherheitsleistung."
   - risk: `high`
   - riskNote: "Kein Schadensausgleich möglich außer durch Klage. Praxis selten — meist nur bei nahestehenden Personen oder Sozialwohnungen mit anderen Sicherungen."
   - whenProblem: "Schaden, Mietrückstände, Renovierungskosten müssen einzeln eingeklagt werden."
   - whenNegotiate: "Vermieter wird i.d.R. eine Form der Sicherheit verlangen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }`

- **smartDefault**: `{ sicher: "max_drei_kaltmieten", ausgewogen: "zwei_kaltmieten", durchsetzungsstark: "buergschaft" }`

---

### Sektion 4 — Schönheitsreparaturen

- **key**: `cosmetic_repairs`
- **paragraph**: § 5
- **importance**: `critical`
- **description**: Wer trägt die laufenden Schönheitsreparaturen (Streichen, Tapezieren)? **BGH-Hochrisikobereich** — viele Klauseln unwirksam!

**Optionen:**

1. **`keine_uebertragung`** — Vermieter trägt Schönheitsreparaturen
   - description: "Schönheitsreparaturen verbleiben beim Vermieter (gesetzlicher Standard nach § 535 I 2 BGB)."
   - risk: `low`
   - riskNote: "Rechtssicher. Mieter zahlt nichts zusätzlich. Vermieter kalkuliert in die Kaltmiete ein."
   - whenProblem: "Wirtschaftlich für Vermieter weniger attraktiv — er übernimmt Renovierungskosten alle 8–10 Jahre."
   - whenNegotiate: "Mieter sollte das anstreben, falls die Wohnung unrenoviert übergeben wird (BGH XII ZR 96/23 vom 29.01.2025)."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: true }`

2. **`weiche_fristen`** — Übertragung mit weichen Fristen ("üblicherweise alle X Jahre")
   - description: "Schönheitsreparaturen auf Mieter übertragen, mit Fristen die als Richtwerte ('in der Regel', 'üblicherweise') ausgestaltet sind."
   - risk: `medium`
   - riskNote: "BGH-fest, aber nur wenn (a) Wohnung renoviert übergeben wurde UND (b) keine starren Fristen UND (c) keine Quotenabgeltungsklausel. BGH VIII ZR 79/22 vom 06.03.2024 bestätigt: Quotenabgeltungsklauseln in Formularverträgen unwirksam."
   - whenProblem: "Wenn die Klausel auch nur einen unwirksamen Teil enthält (z.B. starre Fristen), ist die GANZE Klausel unwirksam — Vermieter trägt komplett."
   - whenNegotiate: "Mieter kann auf renovierten Übergabezustand bestehen — sonst Klausel unwirksam (BGH NJW 2015, 1594)."
   - recommended: `{ sicher: true, ausgewogen: true, durchsetzungsstark: false }`

3. **`endrenovierung`** — Endrenovierungsklausel beim Auszug
   - description: "Mieter muss bei Auszug die Wohnung renoviert übergeben (Streichen, Tapezieren), unabhängig vom Zustand bei Einzug oder der Wohndauer."
   - risk: `high`
   - riskNote: "BGH NJW 2008, 2499: Starre Endrenovierungsklauseln in Formularverträgen sind unwirksam (§ 307 BGB)! Mieter kann Renovierung verweigern."
   - whenProblem: "Praktisch immer ein Problem — Mieter weigert sich oder klagt zurück."
   - whenNegotiate: "Eigentlich nicht durchsetzbar — vermeiden."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }`

- **smartDefault**: `{ sicher: "weiche_fristen", ausgewogen: "weiche_fristen", durchsetzungsstark: "keine_uebertragung" }`

> **Anwaltlicher Hinweis**: Bei unrenovierter Übergabe ist die Übertragung der Schönheitsreparaturen praktisch IMMER unwirksam, es sei denn der Mieter erhält einen wirtschaftlich angemessenen Ausgleich (z.B. mietfreie Monate). Die Beweislast für unrenovierten Zustand liegt nach BGH XII ZR 96/23 vom 29.01.2025 beim Mieter — Übergabeprotokoll mit Fotos zwingend!

---

### Sektion 5 — Betriebskosten

- **key**: `operating_costs`
- **paragraph**: § 6
- **importance**: `high`
- **description**: Welche Betriebskosten zahlt der Mieter zusätzlich zur Kaltmiete? § 556 I BGB + BetrKV-Katalog.

**Optionen:**

1. **`pauschale_warmmiete`** — Inklusivmiete (Warmmiete)
   - description: "Sämtliche Betriebs- und Heizkosten sind in der Miete enthalten. Keine separate Abrechnung."
   - risk: `medium`
   - riskNote: "Pro Mieter (Planbarkeit). Achtung: Bei Heiz-/Warmwasserkosten greift § 6 HeizkostenV — verbrauchsabhängige Abrechnung Pflicht. Inklusivmiete für Heizkosten in den meisten Fällen unwirksam."
   - whenProblem: "Bei steigenden Energiekosten zahlt Vermieter drauf. Bei Heizkosten oft unwirksam (HeizkostenV-Verstoß)."
   - whenNegotiate: "Vermieter sollte mindestens Heizkosten separat abrechnen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: true }`

2. **`vorauszahlung_komplett`** — Vorauszahlung mit jährlicher Abrechnung über alle Betriebskostenarten BetrKV
   - description: "Mieter zahlt monatliche Vorauszahlung. Vermieter rechnet jährlich nach BetrKV § 2 ab. Abrechnungsfrist § 556 III BGB: 12 Monate nach Abrechnungszeitraum-Ende."
   - risk: `low`
   - riskNote: "Marktstandard. BGH-fest. Achtung: Klausel muss BetrKV-Bezug haben — pauschale 'sonstige Betriebskosten' ist intransparent."
   - whenProblem: "Bei hohen Nachzahlungen Mieter unzufrieden. Bei verspäteter Abrechnung Ausschluss der Nachforderung (§ 556 III 3 BGB)."
   - whenNegotiate: "Vorauszahlungshöhe realistisch festlegen — zu niedrig führt zu hohen Nachzahlungen."
   - recommended: `{ sicher: true, ausgewogen: true, durchsetzungsstark: false }`

3. **`nur_heizung_warmwasser_separat`** — Heizung und Warmwasser separat, Rest pauschal
   - description: "Heiz- und Warmwasserkosten verbrauchsabhängig (HeizkostenV-konform), übrige Betriebskosten pauschal in der Miete."
   - risk: `medium`
   - riskNote: "BGH-fest, wenn Pauschale für 'kalte Betriebskosten' nicht zu niedrig kalkuliert. Vermieter kann nicht nachfordern — Risiko Inflation."
   - whenProblem: "Steigende Müll-, Hausmeister-, Wasserkosten bleiben beim Vermieter."
   - whenNegotiate: "Bei langer Laufzeit für Vermieter wirtschaftlich riskant."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }`

- **smartDefault**: `{ sicher: "vorauszahlung_komplett", ausgewogen: "vorauszahlung_komplett", durchsetzungsstark: "pauschale_warmmiete" }`

---

### Sektion 6 — Tierhaltung

- **key**: `pets`
- **paragraph**: § 7
- **importance**: `medium`
- **description**: Darf der Mieter Tiere halten? **Generelles Verbot in Formularvertrag unwirksam (BGH VIII ZR 168/12)**.

**Optionen:**

1. **`generell_erlaubt`** — Tierhaltung uneingeschränkt erlaubt
   - description: "Mieter darf jegliche Haustiere halten, soweit Hausordnung und nachbarschaftliche Rücksichtnahme gewahrt bleiben."
   - risk: `medium`
   - riskNote: "Pro Mieter. Vermieter verliert Steuerungsmöglichkeit bei großen oder gefährlichen Hunderassen."
   - whenProblem: "Wenn Mieter Listenhunde oder exotische Tiere hält — Konflikte mit Nachbarn / Versicherung."
   - whenNegotiate: "Vermieter sollte mind. 'mit Zustimmung' wählen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: true }`

2. **`mit_zustimmung`** — Tierhaltung nur mit schriftlicher Zustimmung des Vermieters (außer Kleintiere)
   - description: "Kleintiere (Hamster, Wellensittich, Aquarienfische) generell erlaubt. Hunde, Katzen, Reptilien etc. nur mit schriftlicher Zustimmung. Zustimmung darf nicht ohne sachlichen Grund verweigert werden (BGH-Einzelfallabwägung)."
   - risk: `low`
   - riskNote: "BGH-fest. Vermieter behält Kontrolle, Mieter weiß Rechtslage. Klassische Kompromisslösung."
   - whenProblem: "Wenn Vermieter Zustimmung willkürlich verweigert — Mieter kann auf Erteilung klagen."
   - whenNegotiate: "Standard, meist beidseitig akzeptabel."
   - recommended: `{ sicher: true, ausgewogen: true, durchsetzungsstark: false }`

3. **`generelles_verbot`** — Generelles Tierhaltungsverbot
   - description: "Keine Tierhaltung erlaubt, auch keine Hunde und Katzen."
   - risk: `high`
   - riskNote: "BGH VIII ZR 168/12 vom 20.03.2013: Generelles Hunde- und Katzenverbot in Formularvertrag UNWIRKSAM. Klausel wirkungslos, gesetzlicher Standard (Einzelfallabwägung) gilt."
   - whenProblem: "Klausel wirkungslos. Mieter kann sich darauf nicht verlassen, Vermieter hat keine Handhabe."
   - whenNegotiate: "Eigentlich nicht durchsetzbar — vermeiden."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }`

- **smartDefault**: `{ sicher: "mit_zustimmung", ausgewogen: "mit_zustimmung", durchsetzungsstark: "generell_erlaubt" }`

---

### Sektion 7 — Untervermietung

- **key**: `subletting`
- **paragraph**: § 8
- **importance**: `medium`
- **description**: Darf der Mieter Teile oder die ganze Wohnung untervermieten?

**Optionen:**

1. **`mit_zustimmung_berechtigtes_interesse`** — Mit Zustimmung bei berechtigtem Interesse (gesetzlicher Standard § 553 BGB)
   - description: "Mieter hat Anspruch auf Erlaubnis zur Untervermietung eines Teils der Wohnung, wenn er ein berechtigtes Interesse hat (z.B. WG, finanzielle Engpässe). Erlaubnis kann nur aus wichtigem Grund verweigert werden."
   - risk: `low`
   - riskNote: "Gesetzlicher Standard. § 553 BGB ist zwingend, kann nicht zu Lasten des Mieters geändert werden."
   - whenProblem: "Wenn Vermieter Zustimmung verweigert ohne wichtigen Grund — Mieter kann klagen / Schadenersatz."
   - whenNegotiate: "Gesetzlich nicht abänderbar zu Lasten des Mieters."
   - recommended: `{ sicher: true, ausgewogen: true, durchsetzungsstark: false }`

2. **`generell_erlaubt`** — Untervermietung generell erlaubt (auch ganze Wohnung, auch Kurzzeit)
   - description: "Mieter darf Wohnung ohne Zustimmung des Vermieters untervermieten, auch über Plattformen wie Airbnb."
   - risk: `high`
   - riskNote: "Pro Mieter, aber: Hausordnung / Eigentümergemeinschaft können Kurzzeitvermietung verbieten. Steuer- und versicherungsrechtliche Implikationen."
   - whenProblem: "Wenn Mieter gewerblich vermietet (Airbnb) — Konflikt mit Wohnzweck, Steuerpflicht, Versicherung."
   - whenNegotiate: "Vermieter wird i.d.R. Zustimmungsvorbehalt verlangen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: true }`

3. **`mit_zustimmung_jeder_fall`** — Schriftliche Zustimmung für JEDE Untervermietung
   - description: "Jede Form der Untervermietung erfordert schriftliche Zustimmung des Vermieters."
   - risk: `medium`
   - riskNote: "Achtung: § 553 BGB Anspruch auf Erlaubnis bei berechtigtem Interesse bleibt zwingend bestehen — Klausel kann nur als 'Anzeigepflicht' wirksam sein."
   - whenProblem: "Mieter ignoriert Klausel, da sie zum Teil unwirksam ist."
   - whenNegotiate: "Klausel sollte explizit § 553 BGB als Vorbehalt nennen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }`

- **smartDefault**: `{ sicher: "mit_zustimmung_berechtigtes_interesse", ausgewogen: "mit_zustimmung_berechtigtes_interesse", durchsetzungsstark: "generell_erlaubt" }`

---

### Sektion 8 — Kündigung

- **key**: `termination`
- **paragraph**: § 9
- **importance**: `critical`
- **description**: Kündigungsfristen und -gründe. § 573c BGB ist für Wohnraum zwingend.

**Optionen:**

1. **`gesetzliche_fristen`** — Gesetzliche Kündigungsfristen (§ 573c BGB)
   - description: "Mieter: 3 Monate. Vermieter: 3 Monate (bis 5 Jahre Mietdauer), 6 Monate (5–8 Jahre), 9 Monate (ab 8 Jahre). Vermieter braucht zusätzlich berechtigtes Interesse (§ 573 BGB)."
   - risk: `low`
   - riskNote: "Gesetzlicher Standard, zwingend bei Wohnraum (§ 573c IV BGB — Verlängerung zu Lasten des Mieters unwirksam)."
   - whenProblem: "Selten — gesetzlicher Schutz. Vermieter muss berechtigtes Interesse darlegen."
   - whenNegotiate: "Nicht zu Lasten des Mieters verkürzbar."
   - recommended: `{ sicher: true, ausgewogen: true, durchsetzungsstark: false }`

2. **`gestaffelte_mieterfristen`** — Mieter mit gestaffelten Fristen (nur Gewerbe)
   - description: "Bei Gewerberaummiete: Längere Kündigungsfristen für Mieter (z.B. 6 Monate) zur Sicherung der Vermieter-Planung."
   - risk: `medium`
   - riskNote: "Bei Wohnraum unwirksam (§ 573c IV BGB). Bei Gewerbe vertraglich frei vereinbar (§ 580a BGB)."
   - whenProblem: "Mieter im Gewerbe wird unflexibler bei Strategiewechseln."
   - whenNegotiate: "Mieter sollte auf Sonderkündigungsrechte für definierte Ereignisse drängen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }` (nur Gewerbe relevant)

3. **`kuendigungsausschluss_4_jahre`** — Kündigungsausschluss bis zu 4 Jahre (Wohnraum)
   - description: "Beidseitiger Kündigungsausschluss für max. 4 Jahre (§ 557a III BGB analog, § 575 BGB), oft kombiniert mit Staffelmietvertrag."
   - risk: `medium`
   - riskNote: "Pro Vermieter (Planung) und Mieter (Wohnsicherheit). 4 Jahre ist Maximum, längere Klauseln teilweise unwirksam (BGH NJW 2005, 1574)."
   - whenProblem: "Bei Mieter-Lebensumständen-Wechsel (Job, Scheidung) → keine ordentliche Kündigung."
   - whenNegotiate: "Sonderkündigungsrechte für definierte Härtefälle einbauen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }`

- **smartDefault**: `{ sicher: "gesetzliche_fristen", ausgewogen: "gesetzliche_fristen", durchsetzungsstark: "gesetzliche_fristen" }`

---

### Sektion 9 — Hausordnung und Nutzungsregeln

- **key**: `house_rules`
- **paragraph**: § 10
- **importance**: `medium`
- **description**: Wie verbindlich sind Hausordnung, Ruhezeiten, Reinigungspflichten?

**Optionen:**

1. **`hausordnung_anlage`** — Hausordnung als verbindliche Anlage (Vertragsbestandteil)
   - description: "Schriftliche Hausordnung wird als Anlage Vertragsbestandteil. Mieter unterschreibt mit. Änderungen nur durch Vertragsänderung."
   - risk: `low`
   - riskNote: "Klar und verbindlich. BGH-fest, solange Hausordnung selbst keine unwirksamen Klauseln enthält."
   - whenProblem: "Vermieter kann Hausordnung nicht einseitig ändern. Aktualisierung erfordert Mitwirkung aller Mieter."
   - whenNegotiate: "Mieter sollte Hausordnung VOR Unterschrift prüfen — wird Bestandteil des Vertrags."
   - recommended: `{ sicher: true, ausgewogen: true, durchsetzungsstark: false }`

2. **`einseitige_aenderbar`** — Hausordnung einseitig durch Vermieter änderbar (mit Ankündigungsfrist)
   - description: "Vermieter kann Hausordnung ändern, sofern dies nicht zu unangemessener Benachteiligung führt."
   - risk: `high`
   - riskNote: "Klausel oft AGB-unwirksam (§ 308 Nr. 4 BGB). Einseitige Vertragsanpassung darf Mieter nicht unangemessen benachteiligen."
   - whenProblem: "Verschärfte Hausordnung (z.B. Ruhezeiten 19–7 Uhr) kann unwirksam sein."
   - whenNegotiate: "Mieter sollte ablehnen oder konkrete Schranken einbauen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }`

3. **`gesetzliche_regeln`** — Verweis auf gesetzliche Regelungen, keine Hausordnung
   - description: "Keine separate Hausordnung. Es gelten gesetzliche Regelungen (Lärmschutz, Nachbarschaftsgesetze)."
   - risk: `medium`
   - riskNote: "Pro Mieter. Vermieter hat weniger Steuerung."
   - whenProblem: "Konflikte zwischen Mietern müssen einzeln gelöst werden."
   - whenNegotiate: "Vermieter wird oft Hausordnung wünschen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: true }`

- **smartDefault**: `{ sicher: "hausordnung_anlage", ausgewogen: "hausordnung_anlage", durchsetzungsstark: "gesetzliche_regeln" }`

---

### Sektion 10 — Mängel und Mietminderung

- **key**: `defects`
- **paragraph**: § 11
- **importance**: `high`
- **description**: Wie soll mit Mängeln umgegangen werden? § 536 BGB Mietminderung ist zwingend, kann bei Wohnraum nicht ausgeschlossen werden.

**Optionen:**

1. **`gesetzlich`** — Gesetzliche Regelung (§§ 536 ff. BGB)
   - description: "Mieter mindert Miete ipso iure bei Mangel. Anzeigepflicht § 536c BGB. Vermieter muss Mangel beseitigen."
   - risk: `low`
   - riskNote: "Gesetzlicher Standard. Bei Wohnraum kann § 536 BGB nicht zu Lasten des Mieters abbedungen werden (§ 536 IV BGB)."
   - whenProblem: "Mieter mindert übermäßig — Vermieter muss klagen."
   - whenNegotiate: "Bei Gewerbe begrenzbar — bei Wohnraum nicht."
   - recommended: `{ sicher: false, ausgewogen: true, durchsetzungsstark: true }`

2. **`mangelanzeige_und_frist`** — Mangelanzeige plus Nachbesserungsfrist (Wohnraum-konform)
   - description: "Mieter muss Mangel schriftlich anzeigen. Mietminderung erst nach Ablauf einer angemessenen Nachbesserungsfrist (z.B. 14 Tage)."
   - risk: `medium`
   - riskNote: "Im Gewerbe wirksam, im Wohnraum nur bedingt — § 536c BGB regelt bereits Anzeigepflicht. Klausel darf nicht von gesetzlicher Regelung zu Lasten des Mieters abweichen."
   - whenProblem: "Bei akuten Gefahren (Wassereinbruch, Heizungsausfall im Winter) — sofortige Minderung muss möglich bleiben."
   - whenNegotiate: "Bei Wohnraum vorsichtig formulieren, sonst unwirksam."
   - recommended: `{ sicher: true, ausgewogen: false, durchsetzungsstark: false }`

3. **`mietminderungsausschluss`** — Mietminderung ausgeschlossen (nur Gewerbe!)
   - description: "Mieter zahlt volle Miete, kann nur auf Schadensersatz klagen."
   - risk: `high`
   - riskNote: "Bei Wohnraum NICHTIG (§ 536 IV BGB). Bei Gewerbe nur als individuelle Vereinbarung wirksam, in AGB problematisch."
   - whenProblem: "Vorsicht: BGH stellt sehr hohe Anforderungen an Wirksamkeit auch im Gewerbe."
   - whenNegotiate: "Vermeiden, außer Gewerbe-Großmieter mit Verhandlungsmacht."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }`

- **smartDefault**: `{ sicher: "mangelanzeige_und_frist", ausgewogen: "gesetzlich", durchsetzungsstark: "gesetzlich" }`

---

### Sektion 11 — Schlussbestimmungen (Schriftform, Gerichtsstand, salvatorische Klausel)

- **key**: `final_provisions`
- **paragraph**: § 12
- **importance**: `medium`
- **description**: Standardklauseln am Vertragsende.

**Optionen:**

1. **`standard_konservativ`** — Schriftform für Änderungen + salvatorische Klausel + Gerichtsstand Wohnungslage
   - description: "Vertragsänderungen schriftlich (Wohnraum: § 550 BGB!), salvatorische Klausel mit Anpassungspflicht, ausschließlicher Gerichtsstand am Ort der Mietsache."
   - risk: `low`
   - riskNote: "Bei Wohnraum: Gerichtsstand am Wohnungsort ist nach § 29a ZPO zwingend. BGH-fest. Salvatorische Klausel bei AGB nur bedingt wirksam."
   - whenProblem: "Doppelte Schriftformklausel ('auch dieses Schriftformerfordernis kann nur schriftlich aufgehoben werden') ist BGH-rechtlich umstritten — bei AGB unwirksam."
   - whenNegotiate: "Selten verhandelbar."
   - recommended: `{ sicher: true, ausgewogen: true, durchsetzungsstark: false }`

2. **`textform_gewerbe`** — Textform-Genügen für Gewerbe (BEG IV ab 01.01.2025)
   - description: "Bei Gewerbe genügt seit 01.01.2025 die Textform für Vertragsänderungen (§ 578 BGB n.F. i.V.m. § 126b BGB). Schriftform freiwillig."
   - risk: `low`
   - riskNote: "Modern, BEG IV-konform. Nur für Gewerbe! Bei Wohnraum weiterhin Schriftform Pflicht."
   - whenProblem: "Bei Altverträgen vor 01.01.2025 noch Schriftform-Übergangsregel bis 01.01.2026."
   - whenNegotiate: "Mieter kann zugunsten der Flexibilität zustimmen."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: false }` (kontextabhängig — nur Gewerbe)

3. **`minimal`** — Reine Verweisung auf gesetzliche Regelungen
   - description: "Keine speziellen Schlussbestimmungen. Es gelten gesetzliche Vorgaben."
   - risk: `medium`
   - riskNote: "Schlanker Vertrag. Achtung: Bei langfristigen Wohnraummietverträgen § 550 BGB Schriftform Pflicht — fehlt hier oft die explizite Klausel zur Erinnerung."
   - whenProblem: "Streitfälle ohne klare vertragliche Regelung — Auslegungsbedarf."
   - whenNegotiate: "Praxisuntauglich, vermeiden."
   - recommended: `{ sicher: false, ausgewogen: false, durchsetzungsstark: true }`

- **smartDefault**: `{ sicher: "standard_konservativ", ausgewogen: "standard_konservativ", durchsetzungsstark: "minimal" }`

---

## 6 · Anwaltsperspektive — kritische Hinweise

1. **Wohnraum vs. Gewerbe muss in der Wizard-Logik VOR den Sektionen festgestellt werden.** Bei Wohnraummiete sind viele Klauseln zwingend (§§ 569, 573 ff. BGB), bei Gewerbe besteht Vertragsfreiheit. Die Smart-Defaults müssten ggf. abhängig von `usage_type` differenziert werden — z.B. Schönheitsreparaturen bei Gewerbe weniger streng.

2. **Die Schönheitsreparaturen-Falle**: Selbst kleine Formulierungsfehler in Formularverträgen lassen die GANZE Klausel kippen. Empfehlung: Wenn Wohnung unrenoviert übergeben wird, gar keine Übertragung — sonst Risiko des Totalverlusts.

3. **Mietpreisbremse**: Wenn die Mietsache in einem Gebiet mit angespanntem Wohnungsmarkt liegt, MUSS bei Vertragsschluss die ortsübliche Vergleichsmiete + zulässiger Aufschlag (max. 10 %) berechnet werden. Auskunftsanspruch des Mieters § 556g IV BGB. Verstoß = Rückforderungsanspruch nach Rüge.

4. **Schriftformerfordernis**: § 550 BGB ist eine "Falle" — wenn ein Anhang (z.B. Hausordnung) nicht physisch mit dem Vertrag verbunden ist, kann der Vertrag formnichtig sein und gilt unbefristet. Empfehlung: Auflistung der Anlagen im Hauptvertrag, Paginierung durchgehend.

5. **Indexmiete vs. Staffelmiete**: Beide schließen Mieterhöhungen nach §§ 558, 559 BGB aus. Bei hoher Inflationserwartung Indexmiete vorteilhaft für Vermieter, bei stabiler Erwartung Staffelmiete.

6. **Doppelte Schriftformklausel**: BGH NJW 2008, 2256 — in AGB grundsätzlich unwirksam. Statt dessen einfache Schriftformklausel verwenden.

7. **Gewerbe ab 01.01.2025**: Das BEG IV hat das Schriftformerfordernis für Gewerbemietverträge zur Textformpflicht reduziert. Übergangsfrist für Altverträge bis 01.01.2026. Im Playbook MUSS dies bei `usage_type = gewerbe` berücksichtigt werden.

8. **Härtefälle § 574 BGB**: Bei Eigenbedarfskündigung ist die Härtefallabwägung zentrale Gerichtspraxis. BGH VIII ZR 114/22 vom 08.04.2024: Suizidgefahr ist anerkannter Härtegrund. Mieter sollte solche Härtegründe rechtzeitig dokumentieren.

9. **Mietkaution**: Pflicht zur getrennten Anlage und Insolvenzfestigkeit (§ 551 III BGB). Bei Insolvenz des Vermieters fließt Kaution NICHT in die Insolvenzmasse — vorausgesetzt die Trennung ist vorgenommen. Häufig in der Praxis vernachlässigt.

10. **Cousins-Falle § 573 II Nr. 2 BGB**: BGH VIII ZR 276/23 vom 10.07.2024: Cousins fallen NICHT unter "Familienangehörige" für Eigenbedarfskündigung. Entferntere Verwandte → kein Eigenbedarfsgrund.

---

## 7 · Quellen

### BGH-Urteile (mit Aktenzeichen)

- BGH, Urteil vom 06.03.2024 — VIII ZR 79/22 (Quotenabgeltungsklausel formularmäßig unwirksam)
- BGH, Beschluss vom 30.01.2024 — VIII ZB 43/23 (Trennbarkeit Schönheitsreparaturen / Quotenabgeltung)
- BGH, Urteil vom 29.01.2025 — XII ZR 96/23 (Beweislast unrenovierter Übergabezustand beim Mieter)
- BGH, Urteil vom 10.04.2024 — VIII ZR 286/22 (Eigenbedarf inkl. beruflicher Nutzung)
- BGH, Urteil vom 10.07.2024 — VIII ZR 276/23 (Familienangehörige § 573 BGB — Cousins nicht erfasst)
- BGH, Urteil vom 08.04.2024 — VIII ZR 114/22 (Suizidgefahr als Härtegrund § 574 BGB)
- BGH, Urteil vom 17.12.2025 — VIII ZR 56/25 (Mietpreisbremse gilt nicht bei einvernehmlicher Mietsenkung)
- BGH, Urteil vom 18.12.2024 — Pressemitteilung 2024/239 (Berliner Mietpreisbremse verfassungsgemäß)
- BGH, Urteil vom 27.11.2024 (umfassende Modernisierung — Rückfall auf einfache Modernisierung möglich)
- BGH, Urteil vom 20.03.2013 — VIII ZR 168/12 (Generelles Hunde-/Katzenverbot in Formularvertrag unwirksam)

### Gesetzesstand

- BGB i.d.F. nach BEG IV (Bürokratieentlastungsgesetz IV) — Textform für Gewerbe seit 01.01.2025, Übergangsfrist bis 01.01.2026
- MietpreisbremsenG verlängert bis 31.12.2029
- BetrKV i.d.F. 2024
- HeizkostenV i.d.F. 2024 (verbrauchsabhängige Abrechnung Pflicht)

### Web-Quellen (Stand 29.04.2026)

- [BGH-Pressemitteilung 2024/239 zur Berliner Mietpreisbremse](https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2024/2024239.html)
- [Haufe — BGH-Rechtsprechungsübersicht Schönheitsreparaturen](https://www.haufe.de/immobilien/verwaltung/bgh-rechtsprechungsuebersicht/schoenheitsreparaturen-und-maengel_258_119072.html)
- [LTO — BGH VIII ZB 43/23 Beweislast Schönheitsreparaturen](https://www.lto.de/recht/nachrichten/n/bgh-viiizb43-23-schoenheitsreparaturen-beweislast-klausel-agb-unrenovierte-wohnung)
- [Mietrecht.org — Eigenbedarfskündigung Urteile](https://www.mietrecht.com/eigenbedarfskuendigung-urteile/)
- [Haufe — Mietpreisbremse durfte verlängert werden](https://www.haufe.de/immobilien/wirtschaft-politik/mietpreisbremse-durfte-verlaengert-werden_84342_675966.html)
- [GÖRG — Neue Gesetzeslage zum Schriftformgebot Gewerbe](https://www.goerg.de/de/aktuelles/veroeffentlichungen/05-03-2025/neue-gesetzeslage-kein-gesetzliches-schriftformgebot-mehr-fuer-gewerbemietvertraege)
- [Kautionskasse — § 551 BGB Mietkaution Ratgeber 2025](https://www.kautionskasse.de/ratgeber/artikel/die-mietkaution-im-deutschen-mietrecht-umfassender-ratgeber-2025)
- [LTO — BGH VIII ZR 168/12 Tierhaltungsverbot](https://www.lto.de/recht/nachrichten/n/bgh-urteil-viii-zr-168-12-mietvertrag-agb-klausel-verbot-katzen-hundehaltung)
- [Haufe — Betriebskostenabrechnung BGH-Übersicht](https://www.haufe.de/immobilien/verwaltung/bgh-rechtsprechungsuebersicht/bgh-ueberblick-betriebskosten_258_119060.html)
- [Heuking — Abschaffung Schriftformerfordernis Gewerbemietrecht](https://www.heuking.de/de/news-events/newsletter-fachbeitraege/artikel/abschaffung-des-schriftformerfordernisses-im-gewerbemietrecht-chancen-und-risiken.html)

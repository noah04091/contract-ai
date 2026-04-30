# Darlehensvertrag — Playbook-Konzept

> **Status:** Recherchedokument (Phase 1 — Konzept) — noch keine Code-Umsetzung.
> **Erstellt:** 29.04.2026
> **Vorlage-Referenz:** `backend/playbooks/nda.js`
> **Verbindliches Schema:** `docs/PLAYBOOK-MASTERPLAN.md` Sektion 2 + 8

---

## Metadaten

| Feld | Wert |
|------|------|
| **Slug** | `darlehensvertrag` |
| **Title** | Darlehensvertrag |
| **Description** | Regle die Vergabe eines Darlehens rechtssicher: Zinsen, Tilgung, Sicherheiten und Kündigungsrechte zwischen Darlehensgeber und Darlehensnehmer. |
| **Icon** | `banknote` (lucide) |
| **Difficulty** | `komplex` |
| **Estimated Time** | 12-18 Minuten |
| **Legal Basis** | BGB §§ 488-505d, KWG §§ 1, 32, PAngV (Verbraucherdarlehen), EGBGB Art. 247 (Pflichtangaben) |

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze und ihre Reichweite

Der Darlehensvertrag ist im BGB doppelt geregelt — diese Aufteilung ist die zentrale strategische Weichenstellung dieses Vertragstyps:

| Bereich | Anwendung | Pflichtumfang |
|---------|-----------|---------------|
| **§§ 488-490 BGB** | Allgemeines Darlehensrecht — gilt immer | Niedrig (Vertragsfreiheit) |
| **§§ 491-505d BGB** | Verbraucherdarlehensrecht — wenn Darlehensgeber Unternehmer und Darlehensnehmer Verbraucher | **Hoch** (Pflichtangaben, Widerruf, Vorfälligkeit gedeckelt) |
| **§§ 504-505 BGB** | Überziehungskredit / geduldete Überziehung | Mittel |
| **PAngV (Preisangabenverordnung)** | Effektivzins-Pflicht bei Verbraucherdarlehen | Hoch |
| **KWG §§ 1, 32** | Erlaubnispflicht für gewerbliches Kreditgeschäft | **Existenzkritisch** (Strafnorm § 54 KWG: bis 5 Jahre Freiheitsstrafe) |

### 1.2 Drei-Klassen-Logik der Darlehen

Das Playbook muss in **drei Vertragsuniversen** unterscheiden, weil sie rechtlich völlig unterschiedlich behandelt werden:

1. **Privates Gefälligkeitsdarlehen** (Privatperson → Privatperson, einmalig, nicht gewerblich)
   — Vertragsfreiheit, keine KWG-Pflicht, keine Effektivzins-Angabe nötig
2. **Geschäftsdarlehen / B2B-Darlehen** (Unternehmer → Unternehmer)
   — Vertragsfreiheit, AGB-Recht (§§ 305-310 BGB) anwendbar wenn Klauseln vorformuliert
3. **Verbraucherdarlehen** (Unternehmer → Verbraucher)
   — Strenge Pflichtangaben (Art. 247 EGBGB), Widerrufsrecht 14 Tage (§ 495 BGB), Vorfälligkeitsentschädigung gedeckelt (§ 502 BGB), Effektivzins zwingend

> **Kritisch:** Der Wizard muss VOR der Sektionsauswahl klären, welcher Typ vorliegt — dies steuert die Sichtbarkeit ganzer Sektionen (z.B. "Widerrufsrecht" nur bei Verbraucherdarlehen, "Effektivzins" nur bei Verbraucherdarlehen). Die Typ-Wahl steht daher in `partyFields` (siehe unten).

### 1.3 Aktuelle Rechtsprechung

| Az. / Datum | Gericht | Kernaussage | Relevanz für Playbook |
|-------------|---------|-------------|------------------------|
| **BGH XI ZR 75/23 (03.12.2024)** | BGH | Bei Vorfälligkeitsentschädigung muss die Berechnungsmethode hinreichend transparent dargestellt werden — eine finanzmathematische Formel ist NICHT zwingend, aber die wesentlichen Berechnungsparameter müssen genannt werden. | Hinweis-Sektion zur Vorfälligkeit |
| **BGH XI ZR 22/24 (20.05.2025)** | BGH | Unzureichende Angaben zur Berechnung der Vorfälligkeitsentschädigung führen zum **Wegfall** des Anspruchs (§ 502 Abs. 2 Nr. 2 BGB). | Konsequenz: Pflichtangabe als kritisch markieren |
| **BGH XI ZR 33/08 (28.10.2008)** | BGH | Bürgschaft eines naher Angehöriger ist sittenwidrig (§ 138 BGB) bei "krasser finanzieller Überforderung" + emotionaler Verbundenheit → widerlegliche Vermutung der Sittenwidrigkeit. | Sicherheiten-Sektion, Warnhinweis |
| **BGH IX ZR 244/01 (14.10.2003)** | BGH | Übertragbarkeit der Angehörigen-Rechtsprechung auf Kommanditisten als Bürgen scheidet aus — geschäftliches Eigeninteresse überwiegt. | Sicherheiten-Sektion, Differenzierung |
| **BGH XI ZR 33/15 (19.01.2016)** | BGH | "Ewiges Widerrufsrecht" bei fehlerhafter Belehrung — bei Immobiliardarlehen seit 21.06.2016 zeitlich begrenzt (§ 356b Abs. 2 S. 4 BGB). | Widerrufsrecht-Sektion |
| **BGH IX ZR 50/22 (14.03.2023)** | BGH | § 489 BGB (Sonderkündigung nach 10 Jahren) gilt nicht für synthetische Festzinsdarlehen (Kombination aus Variabel-Darlehen + Swap). | Kündigungs-Sektion (eher informell) |

### 1.4 Pflichthinweise

**Bei Verbraucherdarlehen (Art. 247 EGBGB i.V.m. § 491a BGB):**
- Effektivzins (PAngV) — verpflichtend
- Nettodarlehensbetrag, Gesamtbetrag, Anzahl/Höhe/Fälligkeit der Raten
- Sollzinssatz, Bedingungen für Anpassung (bei Variabel)
- Vertragslaufzeit, Kündigungsbedingungen
- 14-Tage-Widerrufsrecht (Belehrung mit Mustertext nach Anlage 7 zu Art. 247 § 6 Abs. 2 EGBGB)
- Berechnungsmethode der Vorfälligkeitsentschädigung
- Verzugszinssatz und Zusammensetzung
- Hinweis auf Datenübermittlung an Auskunfteien (z.B. SCHUFA)

**Bei Privatdarlehen (§§ 488-490 BGB):**
- **Schriftform: nicht zwingend**, aber zur Beweissicherung dringend empfohlen
- Steuerliche Einordnung: Zinsen sind Kapitalerträge des Darlehensgebers (§ 20 EStG)
- Bei nahen Angehörigen: Fremdvergleich (BFH-Rechtsprechung) — sonst Aberkennung der steuerlichen Wirkungen

### 1.5 Risiken bei fehlerhafter Gestaltung

1. **KWG-Erlaubnispflicht ignoriert** → Strafbarkeit nach § 54 KWG (bis 5 Jahre Freiheitsstrafe), Nichtigkeit der Verträge nach § 134 BGB möglich
2. **Verbraucherdarlehen ohne Pflichtangaben** → kein Anspruch auf Vorfälligkeitsentschädigung (§ 502 Abs. 2 Nr. 2 BGB), verlängertes Widerrufsrecht
3. **Sittenwidrige Bürgschaft** → vollständige Unwirksamkeit der Personalsicherheit
4. **Unzulässige Zinshöhe** → Wucher (§ 138 Abs. 2 BGB) bei Auffallendem Missverhältnis (BGH: doppelter Marktzins als Indiz)
5. **Fehlende Schriftform bei Bürgschaft** → § 766 BGB-Verstoß, Nichtigkeit (außer Vollkaufmann)

---

## 2 · Rollen-Definition

| Rolle | Key | Anzeigename | Beschreibung |
|-------|-----|-------------|--------------|
| **A** | `darlehensgeber` | Darlehensgeber | Stellt das Geld zur Verfügung und hat einen Rückzahlungsanspruch nebst Zinsen. Trägt das Ausfallrisiko, sichert sich durch Sicherheiten ab. |
| **B** | `darlehensnehmer` | Darlehensnehmer | Erhält das Geld zur Verwendung und schuldet Rückzahlung + Zinsen. Trägt die Zinslast, ggf. das Sicherheitenrisiko (Verwertung). |

---

## 3 · Modi-Bedeutung (vertragsspezifisch)

> **Grundprinzip:** "Sicher" begünstigt strukturell den **Darlehensgeber** (höheres wirtschaftliches Risiko durch Vorleistung), "Durchsetzungsstark" den **Darlehensnehmer** (kann zinsgünstig finanzieren ohne abschreckende Sicherheiten).

| Modus | Begünstigte Partei | Konkrete Auswirkung |
|-------|-------------------|---------------------|
| **Sicher** | Pro Darlehensgeber | Mehrere Sicherheiten (Bürgschaft + Sicherungsabtretung), strenger Verwendungszweck, Sofort-Kündigungsrecht bei Verzug ab erster Rate, Vorfälligkeitsentschädigung am gesetzlichen Maximum, Schriftform für alle Änderungen |
| **Ausgewogen** | Marktstandard | Eine angemessene Sicherheit (passend zur Höhe), Standard-Verzugsregelung (2 Raten/10% Rückstand), Vorfälligkeit nach gesetzlicher Mindesthöhe, Standardzinsanpassung |
| **Durchsetzungsstark** | Pro Darlehensnehmer | Keine oder minimale Sicherheiten, weite Kündigungsrechte zugunsten des Nehmers, Reduzierung/Ausschluss der Vorfälligkeitsentschädigung soweit zulässig, lange Verzugsschwellen |

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Darlehensgeber
  { key: "partyA_name", label: "Name / Firma (Darlehensgeber)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Adresse", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_representative", label: "Vertreten durch", type: "text", required: false, group: "partyA" },
  { key: "partyA_iban", label: "IBAN für Auszahlung/Rückzahlung", type: "text", required: false, group: "partyA",
    placeholder: "DE..." },

  // Darlehensnehmer
  { key: "partyB_name", label: "Name / Firma (Darlehensnehmer)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Adresse", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_representative", label: "Vertreten durch", type: "text", required: false, group: "partyB" },
  { key: "partyB_birth_date", label: "Geburtsdatum (bei Privatperson)", type: "date", required: false, group: "partyB" },

  // Kontext — kritische Steuerfelder
  { key: "loan_type", label: "Art des Darlehens", type: "select", required: true, group: "context",
    options: [
      { value: "private",    label: "Privatdarlehen (zwei Privatpersonen, einmalig)" },
      { value: "business",   label: "Geschäftsdarlehen (B2B)" },
      { value: "consumer",   label: "Verbraucherdarlehen (Unternehmer → Verbraucher) — Pflichtangaben gelten!" }
    ]
  },
  { key: "loan_amount", label: "Darlehensbetrag (EUR)", type: "number", required: true, group: "context",
    placeholder: "z.B. 50000" },
  { key: "purpose", label: "Verwendungszweck", type: "textarea", required: true, group: "context",
    placeholder: "z.B. Zwischenfinanzierung Betriebsmittel, Kauf eines Fahrzeugs, ..." },
  { key: "disbursement_date", label: "Auszahlungsdatum", type: "date", required: true, group: "context" },
  { key: "loan_duration_months", label: "Laufzeit in Monaten", type: "number", required: true, group: "context",
    placeholder: "z.B. 60" }
]
```

> **Hinweis zur Engine-Steuerung:** Das Feld `loan_type` schaltet später (Code-Phase) die Sichtbarkeit der Sektionen "Effektivzins" und "Widerrufsrecht" — beide nur bei `consumer`. Diese Steuerung ist im Recherchedokument noch nicht code-relevant, aber für die Sektions-Logik vermerkt.

---

## 5 · Sektionen (Step 3 des Wizards)

> Insgesamt **12 strategische Sektionen** — Darlehen ist komplex, daher liegt die Anzahl im oberen Bereich des Masterplan-Korridors (7-14).

---

### 5.1 Darlehensbetrag & Auszahlung

- **Key:** `disbursement`
- **Paragraph:** § 2
- **Importance:** `critical`
- **Beschreibung:** Wann und wie wird der Darlehensbetrag ausgezahlt? Auf einmal, in Tranchen, gegen Vorlage von Nachweisen?

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `lump_sum` | Vollauszahlung in einer Summe | Der gesamte Betrag wird zu einem festen Termin auf das Konto des Nehmers überwiesen. | low | -/✓/✓ |
| `tranches_milestone` | Tranchen gegen Meilensteine | Auszahlung in Teilbeträgen, jeweils nach Erreichen vereinbarter Meilensteine (z.B. Bauphasen). | low | ✓/-/- |
| `tranches_fixed_dates` | Tranchen zu festen Daten | Auszahlung in Teilbeträgen zu vorab fixierten Kalenderdaten. | low | -/-/- |
| `on_demand` | Auf Abruf innerhalb Zeitfenster | Nehmer kann den Betrag innerhalb eines Zeitfensters (z.B. 6 Monate) abrufen. | medium | -/-/✓ |

**Risk Notes:**
- `lump_sum`: Schnell und unkompliziert; Geber trägt sofort vollständiges Ausfallrisiko.
- `tranches_milestone`: Schutz für Geber bei Projektfinanzierungen — Auszahlung nur bei Fortschritt.
- `tranches_fixed_dates`: Planbarkeit, aber unflexibel wenn Bedarf später entsteht.
- `on_demand`: Hohe Flexibilität für Nehmer, Bereitstellungszinsen oft fällig.

**Smart Defaults:** `sicher: tranches_milestone`, `ausgewogen: lump_sum`, `durchsetzungsstark: on_demand`

---

### 5.2 Zinssatz und Zinsbindung

- **Key:** `interest_rate`
- **Paragraph:** § 3
- **Importance:** `critical`
- **Beschreibung:** Festzins, variabler Zins oder zinslos? Wenn variabel: an welchen Referenzzinssatz gebunden?

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `zero_interest` | Zinslos | Kein Zins — z.B. typisches Familiendarlehen. | high | -/-/✓ |
| `fixed_rate` | Festzins über gesamte Laufzeit | Sollzinssatz wird einmalig fixiert, gilt unverändert bis Vertragsende. | low | ✓/✓/- |
| `variable_rate` | Variabel (mit Referenzzins) | Anbindung an Euribor 3M / EZB-Hauptrefinanzierungssatz + Aufschlag, regelmäßige Anpassung. | medium | -/-/✓ |
| `step_rate` | Gestufter Festzins (Zinsstaffel) | Unterschiedliche Festzinsen für definierte Phasen (z.B. 3% Jahre 1-2, 4% Jahre 3-5). | medium | -/-/- |

**Risk Notes:**
- `zero_interest`: Steuerlich kritisch (Schenkungssteuer ab 20.000 EUR bei Nicht-Verwandten, ab 500.000 EUR bei Ehegatten — § 16 ErbStG); BFH erkennt zinslose Darlehen unter Verwandten nur bei Fremdvergleich an.
- `fixed_rate`: Planbarkeit für beide Seiten. Bei Verbraucherdarlehen: gesetzliche Sonderkündigung nach 10 Jahren (§ 489 BGB) automatisch.
- `variable_rate`: Zinsänderungsklausel muss "transparent und verständlich" sein (BGH XI ZR 78/08). Reine "Anpassung nach billigem Ermessen" nach § 315 BGB ist AGB-rechtlich problematisch.
- `step_rate`: Bei Verbraucherdarlehen müssen alle Zinsstufen im Vertrag konkret beziffert sein.

**When-Problem:**
- `zero_interest`: Bei Nicht-Angehörigen droht Schenkungssteuer auf den ersparten Marktzins.
- `variable_rate`: Wenn Referenzzins steigt, kann Nehmer in Liquiditätsengpass geraten.

**When-Negotiate:**
- `variable_rate`: Cap (Zinsobergrenze) verhandeln, um Risiko zu begrenzen.
- `fixed_rate`: Vorfälligkeitsentschädigung-Rahmen klären.

**Smart Defaults:** `sicher: fixed_rate`, `ausgewogen: fixed_rate`, `durchsetzungsstark: variable_rate`

---

### 5.3 Effektivzins (nur Verbraucherdarlehen)

- **Key:** `effective_rate`
- **Paragraph:** § 3a
- **Importance:** `critical` (Pflichtangabe!)
- **Beschreibung:** Bei Verbraucherdarlehen muss der Effektivzins gemäß PAngV ausgewiesen werden. Wie wird er berechnet/dargestellt?

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `pangv_with_calculation` | Effektivzins + nachvollziehbare Berechnung | Effektivzins inkl. aller Nebenkosten + transparente Erläuterung der Berechnungsbasis. | low | ✓/✓/✓ |
| `pangv_only` | Nur Effektivzins-Angabe | Effektivzins wird ausgewiesen, ohne ausführliche Erläuterung. | medium | -/-/- |
| `not_applicable` | Nicht anwendbar (kein Verbraucherdarlehen) | Sektion entfällt, da reines B2B- oder Privatdarlehen. | low | -/-/- |

**Risk Notes:**
- `pangv_with_calculation`: Erfüllt PAngV vollständig, schützt vor Wegfall des Vorfälligkeitsanspruchs (BGH XI ZR 22/24, 20.05.2025).
- `pangv_only`: Mindesterfüllung, aber angesichts der jüngsten BGH-Rechtsprechung (XI ZR 75/23, 03.12.2024) riskant — Klage wegen unzureichender Angaben möglich.

**When-Problem:**
- `pangv_only`: Wenn der Nehmer später vorzeitig zurückzahlen will und der Geber Vorfälligkeit verlangt — bei lückenhaften Pflichtangaben verliert der Geber den Anspruch komplett.

**Smart Defaults:** `sicher: pangv_with_calculation`, `ausgewogen: pangv_with_calculation`, `durchsetzungsstark: pangv_with_calculation`

> Diese Sektion ist nur sichtbar, wenn `loan_type === "consumer"`.

---

### 5.4 Tilgungsstruktur

- **Key:** `repayment_structure`
- **Paragraph:** § 4
- **Importance:** `critical`
- **Beschreibung:** Wie wird das Darlehen zurückgezahlt? Annuität, endfällig, Tilgungsdarlehen oder freie Tilgung?

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `annuity` | Annuitätendarlehen | Konstante monatliche Rate aus Zins- und Tilgungsanteil; Tilgungsanteil steigt im Zeitverlauf. | low | -/✓/✓ |
| `linear` | Tilgungsdarlehen (linear) | Konstanter Tilgungsanteil, dadurch sinkende Gesamtrate. Geber erhält schneller Kapital zurück. | low | ✓/-/- |
| `bullet` | Endfälliges Darlehen | Während Laufzeit nur Zinsen, Tilgung in einer Summe am Ende. | high | -/-/- |
| `free_repayment` | Freie Tilgung | Keine festen Raten — Nehmer tilgt nach Liquiditätslage. | high | -/-/✓ |

**Risk Notes:**
- `annuity`: Marktstandard; gut planbar; Anfangsrisiko: hoher Zinsanteil = langsamer Schuldenabbau.
- `linear`: Schnellerer Zinsabbau; höhere Anfangsbelastung für Nehmer.
- `bullet`: Hohes Refinanzierungsrisiko am Ende — Nehmer muss neue Mittel besorgen oder wird zahlungsunfähig.
- `free_repayment`: Faktisch Stundungs-Option für Nehmer, Planungsunsicherheit für Geber.

**When-Problem:**
- `bullet`: Wenn am Laufzeitende keine Anschlussfinanzierung möglich → Notverkauf von Sicherheiten.
- `free_repayment`: Verhindert beim Geber jegliche Cashflow-Planung; bei Verbraucherdarlehen außerdem PAngV-rechtlich problematisch (Effektivzins schwer berechenbar).

**Smart Defaults:** `sicher: linear`, `ausgewogen: annuity`, `durchsetzungsstark: annuity`

---

### 5.5 Sicherheiten

- **Key:** `collateral`
- **Paragraph:** § 5
- **Importance:** `critical`
- **Beschreibung:** Welche Sicherheiten stellt der Nehmer? Bürgschaft, Grundschuld, Sicherungsabtretung — oder keine?

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `none` | Keine Sicherheit (Blanko) | Reines Vertrauensdarlehen, kein Sicherungsmittel. | high | -/-/✓ |
| `personal_guarantee` | Bürgschaft (Personal) | Dritter (z.B. Geschäftsführer, Gesellschafter, Familienangehöriger) haftet persönlich. Schriftform zwingend (§ 766 BGB). | high | -/-/- |
| `property_lien` | Grundschuld / Hypothek | Dingliche Sicherheit am Grundstück, im Grundbuch eingetragen. Notarielle Beurkundung Pflicht. | low | ✓/✓/- |
| `assignment_pledge` | Sicherungsabtretung / Pfandrecht | Forderungen, Lebensversicherung, Wertpapiere oder Sachen werden zur Sicherheit übertragen/verpfändet. | medium | ✓/-/- |

**Risk Notes:**
- `none`: Bei Privatdarlehen unter Vertrauten üblich; bei höheren Beträgen und Geschäftsdarlehen riskant. Im Insolvenzfall: einfache Insolvenzforderung ohne Vorrang.
- `personal_guarantee`: **Vorsicht bei nahen Angehörigen!** BGH-Rechtsprechung (BGH XI ZR 33/08; ständige Rechtsprechung): Bürgschaft naher Angehöriger ist sittenwidrig (§ 138 BGB), wenn der Bürge **krass finanziell überfordert** ist und eine emotionale Bindung zum Hauptschuldner besteht — Vermutungsregel zu Lasten des Gläubigers.
- `property_lien`: Stärkste Sicherheit. Nachteile: Notarkosten, Grundbuchgebühren, ca. 1-2% des Sicherungsbetrags. Bei Immobiliar-Verbraucherdarlehen Pflichtangaben nach Art. 247 § 6 EGBGB.
- `assignment_pledge`: Bei Lebensversicherung: Versicherer muss informiert werden (§ 1280 BGB). Bei Forderungen: stille oder offene Abtretung.

**When-Problem:**
- `personal_guarantee`: Wenn Bürge naher Angehöriger ist und eigenes Einkommen pfändbar nicht einmal die Zinsen deckt → Vermutung der Sittenwidrigkeit (Beweislast beim Gläubiger zur Widerlegung).
- `property_lien`: Bei Verwertung in der Krise oft nur 60-70% des Verkehrswerts erzielbar.

**When-Negotiate:**
- `personal_guarantee`: Auf Höchstbetrags-Bürgschaft beschränken statt unbeschränkt; selbstschuldnerisch vs. Ausfall (Letzteres günstiger für Bürgen).
- `property_lien`: Brieflos oder Buchgrundschuld; Rangstelle (1. Rang vs. nachrangig).

**Smart Defaults:** `sicher: property_lien`, `ausgewogen: property_lien`, `durchsetzungsstark: none`

---

### 5.6 Verzugsregelung

- **Key:** `default_handling`
- **Paragraph:** § 6
- **Importance:** `high`
- **Beschreibung:** Wann tritt Verzug ein und welche Folgen hat er? Verzugszinsen, Mahnkosten, Kündigungsrechte.

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `statutory` | Gesetzlich (BGB-Default) | § 286 BGB: Verzug nach Mahnung oder Fälligkeit + 30 Tage; Verzugszinsen § 288 BGB (5%-Punkte über Basiszins, B2B 9%-Punkte). | low | -/✓/✓ |
| `strict_immediate` | Sofort-Verzug + erhöhte Zinsen | Verzug ohne Mahnung ab Fälligkeit, Verzugszins maximal nach gesetzlichem Rahmen, Mahnkostenpauschale. | medium | ✓/-/- |
| `lenient_grace` | Karenzfrist 14 Tage | Verzug erst nach 14-tägiger Karenzfrist nach Mahnung; reduzierter Verzugszins (z.B. nur 3% über Basis). | medium | -/-/✓ |
| `default_acceleration` | Vorzeitige Fälligkeit ab 2 Raten | Bei Rückstand mit 2 Raten oder 10% Gesamtsumme: gesamte Restschuld sofort fällig. | medium | ✓/✓/- |

**Risk Notes:**
- `statutory`: Marktstandard, AGB-rechtlich unangreifbar.
- `strict_immediate`: AGB-rechtlich problematisch — § 309 Nr. 5 BGB bei pauschalen Mahnkosten.
- `lenient_grace`: Großzügig, faktisch Verlängerung der Schwelle für Geber.
- `default_acceleration`: Gesetzlich erlaubt bei Verbraucherdarlehen nur unter Bedingungen § 498 BGB (Rückstand mit mind. 10% bzw. 5% bei Laufzeit > 3 J., zweimaliger Verzug, 2-Wochen-Frist mit Kündigungsandrohung).

**When-Problem:**
- `default_acceleration`: Bei Verbraucherdarlehen ohne Einhaltung von § 498 BGB unwirksam — Geber verliert Vorzeitige Fälligkeit.

**Smart Defaults:** `sicher: default_acceleration`, `ausgewogen: statutory`, `durchsetzungsstark: lenient_grace`

---

### 5.7 Vorzeitige Rückzahlung & Vorfälligkeitsentschädigung

- **Key:** `early_repayment`
- **Paragraph:** § 7
- **Importance:** `high`
- **Beschreibung:** Darf der Nehmer das Darlehen vorzeitig zurückzahlen — und welche Entschädigung muss er dafür leisten?

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `excluded` | Ausgeschlossen während Laufzeit | Vorzeitige Rückzahlung nur mit Zustimmung des Gebers. **Nicht zulässig bei Verbraucherdarlehen!** | high | -/-/- |
| `with_max_compensation` | Erlaubt mit gesetzl. Maximum | Bei Allgemein-VKD: 1% (Restlaufzeit > 1 Jahr) bzw. 0,5% (≤ 1 Jahr) des Rückzahlungsbetrags (§ 502 Abs. 3 BGB). Bei Immobiliar-VKD: tatsächlicher Schaden des Gebers (Aktiv-Passiv-Methode). | low | ✓/✓/- |
| `with_reduced_compensation` | Erlaubt mit reduzierter Entschädigung | Niedriger als gesetzliches Maximum (z.B. nur 0,5% bzw. 0,25%). Pro Nehmer. | low | -/-/✓ |
| `free_anytime` | Jederzeit kostenfrei | Keine Vorfälligkeitsentschädigung; Nehmer kann jederzeit ohne Zusatzkosten tilgen. | medium | -/-/✓ |

**Risk Notes:**
- `excluded`: Bei Verbraucherdarlehen unzulässig — § 500 Abs. 2 BGB gewährt Verbrauchern unverzichtbares Recht zur jederzeitigen Rückzahlung.
- `with_max_compensation`: Sicherstes Modell für Geber. Wichtig: Berechnungsmethode muss nach BGH XI ZR 22/24 (20.05.2025) ausreichend transparent dargelegt sein, sonst Wegfall des Anspruchs (§ 502 Abs. 2 Nr. 2 BGB).
- `with_reduced_compensation`: Pro-Nehmer-Variante, marktüblich bei Konditionswettbewerb.
- `free_anytime`: Nehmer-freundlich; Geber trägt das Wiederanlagerisiko bei Zinsrückgang.

**When-Problem:**
- `excluded`: Bei Verbraucherdarlehen → Klausel nichtig, Nehmer kann trotzdem jederzeit zurückzahlen.
- `with_max_compensation`: Bei unzureichenden Pflichtangaben gemäß Art. 247 EGBGB → vollständiger Wegfall des Vorfälligkeitsanspruchs.

**Smart Defaults:** `sicher: with_max_compensation`, `ausgewogen: with_max_compensation`, `durchsetzungsstark: free_anytime`

---

### 5.8 Kündigung durch den Darlehensnehmer

- **Key:** `termination_borrower`
- **Paragraph:** § 8
- **Importance:** `high`
- **Beschreibung:** Welche Kündigungsrechte hat der Nehmer? Sonderkündigung nach § 489 BGB ist gesetzlich.

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `statutory_only` | Nur gesetzliche Kündigungsrechte | § 489 BGB: nach 10 Jahren mit 6 Monaten Frist (Festzins); jederzeit bei variablem Zins mit 3 Monaten Frist. | low | ✓/✓/- |
| `extended_5_years` | Vorzeitige Kündigung nach 5 Jahren | Vertragliche Erweiterung: Kündigung schon nach 5 Jahren mit 6 Monaten Frist. | low | -/-/✓ |
| `anytime_3_months` | Jederzeit mit 3 Monaten Frist | Nehmer kann jederzeit mit 3-monatiger Frist kündigen, ggf. gegen Vorfälligkeit. | medium | -/-/✓ |
| `with_consent_only` | Nur mit Zustimmung des Gebers | Außerhalb gesetzlicher Sonderkündigung nur einvernehmlich. | medium | -/-/- |

**Risk Notes:**
- `statutory_only`: Marktstandard. § 489 BGB ist zwingend (BGH IX ZR 50/22 vom 14.03.2023: gilt nicht für synthetische Festzinsdarlehen).
- `with_consent_only`: Gegen § 489 BGB unwirksam — wirkt nur bezüglich darüber hinausgehender Kündigungsmöglichkeiten.

**Smart Defaults:** `sicher: statutory_only`, `ausgewogen: statutory_only`, `durchsetzungsstark: anytime_3_months`

---

### 5.9 Kündigung durch den Darlehensgeber (außerordentlich)

- **Key:** `termination_lender`
- **Paragraph:** § 9
- **Importance:** `high`
- **Beschreibung:** Wann kann der Geber außerordentlich kündigen — bei Verzug, Vermögensverschlechterung, Sicherheitenwertverlust?

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `statutory_only` | Nur gesetzlich (§ 490 BGB) | Außerordentliche Kündigung nur bei Vermögensverschlechterung des Nehmers oder Wertverlust einer Sicherheit, soweit dadurch Rückzahlung gefährdet wird. | low | -/✓/✓ |
| `extended_default` | Erweitert: schon ab 1. Rate Verzug | Sofort-Kündigung möglich, sobald Nehmer mit erster Rate in Verzug. | high | ✓/-/- |
| `material_breach_plus_2_rates` | Wesentliche Verletzung + 2 Raten Rückstand | Kündigung bei zweimaligem Verzug, sonstigen Pflichtverletzungen oder wesentlicher Vermögensverschlechterung. | medium | -/✓/- |
| `restricted_to_insolvency` | Nur bei Insolvenz | Außerordentliche Kündigung nur bei Insolvenzverfahren oder Zahlungseinstellung. | high | -/-/✓ |

**Risk Notes:**
- `statutory_only`: § 490 BGB ist zwingend — über Vertrag erweiterte Rechte sind möglich, aber bei AGB-Klauseln nach § 309 Nr. 4 BGB (Kündigungsrechte des Verwenders) eingeschränkt.
- `extended_default`: Bei Verbraucherdarlehen wegen § 498 BGB unzulässig — dort gelten strenge Voraussetzungen (10%/5%-Schwellen + Mahnung).
- `restricted_to_insolvency`: Nehmer-freundlich; Geber riskiert späte Reaktion.

**Smart Defaults:** `sicher: extended_default`, `ausgewogen: material_breach_plus_2_rates`, `durchsetzungsstark: restricted_to_insolvency`

---

### 5.10 Widerrufsrecht (nur Verbraucherdarlehen)

- **Key:** `right_of_withdrawal`
- **Paragraph:** § 10
- **Importance:** `critical` (Pflichtangabe!)
- **Beschreibung:** Bei Verbraucherdarlehen besteht ein 14-tägiges Widerrufsrecht (§ 495 BGB). Wie wird es im Vertrag belehrt?

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `mustertext` | Mustertext nach Anlage 7 EGBGB | Wortgenaue Übernahme der amtlichen Musterwiderrufsbelehrung — Gesetzlichkeitsfiktion (§ 360 BGB i.V.m. Art. 247 § 6 Abs. 2 EGBGB). | low | ✓/✓/✓ |
| `custom_compliant` | Eigener konformer Belehrungstext | Selbstformulierte Belehrung, die alle Pflichtangaben enthält — höheres Anfechtungsrisiko bei Auslegung. | high | -/-/- |
| `not_applicable` | Nicht anwendbar (kein Verbraucherdarlehen) | Sektion entfällt. | low | -/-/- |

**Risk Notes:**
- `mustertext`: **Dringend empfohlen.** Bei Mustertext greift Gesetzlichkeitsfiktion — selbst bei späterer Reform geschützt (BGH-ständige Rechtsprechung zu § 360 BGB).
- `custom_compliant`: Riskant — bei kleinster Abweichung droht "ewiges Widerrufsrecht" bzw. einmonatige verlängerte Frist nach Korrektur.

**When-Problem:**
- `custom_compliant`: Ein einziger missverständlicher Satz kann das Widerrufsrecht unbegrenzt offen halten — bei Allgemein-Verbraucherdarlehen bis zur Korrektur, dann 1 Monat (§ 356b Abs. 2 BGB).

**Smart Defaults:** `sicher: mustertext`, `ausgewogen: mustertext`, `durchsetzungsstark: mustertext`

> Diese Sektion ist nur sichtbar, wenn `loan_type === "consumer"`.

---

### 5.11 Verwendungszweck-Bindung

- **Key:** `purpose_binding`
- **Paragraph:** § 11
- **Importance:** `medium`
- **Beschreibung:** Ist der Nehmer an einen bestimmten Verwendungszweck gebunden? Welche Folgen hat eine zweckwidrige Verwendung?

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `strict_with_proof` | Streng zweckgebunden + Nachweispflicht | Nehmer muss Verwendung nachweisen (Belege, Verträge). Zweckverstoß = außerordentliche Kündigung. | low | ✓/-/- |
| `informational_only` | Zweck genannt, aber nicht bindend | Verwendungszweck erwähnt, ohne rechtliche Bindung. | low | -/✓/✓ |
| `free_use` | Freie Verwendung | Nehmer entscheidet allein über Verwendung, keine Auskunftspflicht. | medium | -/-/✓ |
| `negative_only` | Negativliste (nicht für X) | Bestimmte Verwendungen sind ausgeschlossen (z.B. Spielschulden, illegale Geschäfte). | low | -/-/- |

**Smart Defaults:** `sicher: strict_with_proof`, `ausgewogen: informational_only`, `durchsetzungsstark: free_use`

---

### 5.12 Gerichtsstand & anwendbares Recht

- **Key:** `jurisdiction`
- **Paragraph:** § 12
- **Importance:** `medium`
- **Beschreibung:** Welches Recht gilt und wo wird bei Streitigkeiten geklagt?

| Option | Label | Beschreibung | Risk | Recommended (S/A/D) |
|--------|-------|--------------|------|---------------------|
| `party_a` | Sitz des Darlehensgebers | Gerichtsstand am Sitz des Gebers. Deutsches Recht. | low | ✓/-/- |
| `party_b` | Sitz des Darlehensnehmers | Gerichtsstand am Sitz des Nehmers. Deutsches Recht. | medium | -/-/✓ |
| `defendant` | Sitz des Beklagten (gesetzlich) | § 12 ZPO als Standard. | low | -/✓/- |
| `arbitration` | Schiedsverfahren (DIS) | Schiedsgericht der Deutschen Institution für Schiedsgerichtsbarkeit; Vertraulichkeit, schnellere Verfahren. | medium | -/-/- |

**Risk Notes:**
- Bei Verbraucherdarlehen: Gerichtsstand am Verbraucher-Wohnsitz zwingend (§ 29 ZPO + § 38 ZPO) — abweichende Vereinbarung unwirksam.
- `arbitration`: Bei Verbraucherdarlehen unzulässig (§ 1031 Abs. 5 ZPO — Schiedsvereinbarung nur in eigener Urkunde).

**Smart Defaults:** `sicher: party_a`, `ausgewogen: defendant`, `durchsetzungsstark: party_b`

---

## 6 · Anwaltsperspektive — kritische Hinweise

Was würde ein erfahrener Bank- und Wirtschaftsrechtsanwalt zwingend prüfen, bevor das generierte Dokument unterschrieben wird?

1. **KWG-Erlaubnispflicht klären** — Die wichtigste Vorprüfung: Vergibt der Geber das Darlehen "gewerblich"? Bereits geringe Zinsen + wiederholte Kreditvergabe können Erlaubnispflicht auslösen. Erstreckt sich das Geschäft über mehrere Darlehen oder ist es eine Geschäftsidee mit Gewinnerzielungsabsicht? → BaFin-Anfrage oder Anwaltsrückfrage zwingend. Strafbarkeit nach § 54 KWG (bis 5 Jahre Freiheitsstrafe).

2. **Privatdarlehen unter Verwandten — Fremdvergleich** — Steuerrechtlich (BFH, ständige Rechtsprechung): Darlehen unter Angehörigen werden nur anerkannt, wenn Konditionen einem Fremdvergleich standhalten (übliche Verzinsung, klare Tilgung, Besicherung passend zum Risiko). Sonst Schenkungssteuer auf den Zinsvorteil + Wegfall des Werbungskostenabzugs.

3. **Sittenwidrigkeit der Bürgschaft prüfen** — Bei Einbeziehung naher Angehöriger als Bürgen: Verdienst- und Vermögenssituation des Bürgen ehrlich erfassen. BGH-Vermutung: Bei "krasser finanzieller Überforderung" + emotionaler Bindung → Sittenwidrigkeit (§ 138 BGB). Fix: Höchstbetrags-Bürgschaft + getrennte Beratung des Bürgen + ggf. Beschränkung auf eigenwirtschaftliches Interesse.

4. **AGB-Recht bei vorformulierten Klauseln** — Sobald der Geber das Vertragsdokument einseitig vorgibt und mehrfach verwendet, gelten §§ 305-310 BGB. Insbesondere § 307 BGB (unangemessene Benachteiligung) entkräftet Geber-freundliche Klauseln (z.B. einseitige Zinsanpassung, pauschale Mahnkosten).

5. **Vorfälligkeitsentschädigung-Berechnungsmethode konkret darstellen** — Nach BGH XI ZR 22/24 (20.05.2025) und XI ZR 75/23 (03.12.2024): Bei Verbraucherdarlehen müssen die wesentlichen Berechnungsparameter im Vertrag genannt sein. Lückenhafte Angaben = vollständiger Wegfall des Anspruchs.

6. **Schenkungssteuer bei zinslosen oder zinsverbilligten Darlehen** — Nach § 7 Abs. 1 Nr. 1 ErbStG i.V.m. BMF-Schreiben vom 30.07.2009: Zinsverzicht oder unter-marktlicher Zins gilt als Schenkung. Marktzins-Vergleichsmaßstab: aktueller Hypothekenzins oder Bundesanleihen + Risikoprämie.

7. **Schriftform der Bürgschaft** — § 766 BGB: Bürgschaftserklärung muss schriftlich erfolgen — elektronische Form ausgeschlossen (außer Vollkaufmann). Bei Ehegatten-Bürgschaften zusätzliche Aufklärung über Risiken empfehlenswert.

8. **Datenschutz / SCHUFA-Klausel** — Bei Verbraucherdarlehen muss der Hinweis auf Datenübermittlung an Auskunfteien erfolgen (Art. 247 § 13a EGBGB, DSGVO Art. 13). Fehlt dieser Hinweis → Verstoß gegen Pflichtangaben.

9. **Fremdwährungsdarlehen?** — Falls Darlehen in fremder Währung (CHF, USD): Aufklärungspflichten nach EU-Richtlinie 2014/17 (umgesetzt in §§ 503, 503a BGB) — Hinweis auf Wechselkursrisiko, jährliche Kontostände, Umstellungsrecht.

10. **Sicherungsabtretung — stille oder offene Abtretung?** — Bei Sicherungsabtretung von Forderungen: stille Abtretung schützt das Geschäftsverhältnis des Nehmers, offene Abtretung gibt mehr Sicherheit. Bei Lebensversicherung: zwingend Anzeige nach § 1280 BGB.

---

## 7 · Quellen

### 7.1 Gesetzestexte

- **BGB §§ 488-490** (Allgemeines Darlehen): https://www.gesetze-im-internet.de/bgb/__488.html
- **BGB §§ 491-505d** (Verbraucherdarlehen): https://www.gesetze-im-internet.de/bgb/__491.html
- **BGB § 502** (Vorfälligkeitsentschädigung): https://www.gesetze-im-internet.de/bgb/__502.html
- **BGB § 489** (Sonderkündigung Festzinsdarlehen): https://www.gesetze-im-internet.de/bgb/__489.html
- **BGB § 495** (Widerrufsrecht): https://www.gesetze-im-internet.de/bgb/__495.html
- **BGB § 498** (Gesamtfälligstellung Verbraucherdarlehen): https://www.gesetze-im-internet.de/bgb/__498.html
- **KWG §§ 1, 32, 54** (Erlaubnispflicht Bankgeschäfte): https://www.gesetze-im-internet.de/kredwg/
- **EGBGB Art. 247** (Pflichtangaben): https://www.gesetze-im-internet.de/egbgb/EGBGB.pdf
- **PAngV** (Effektivzins): Preisangabenverordnung, aktuelle Fassung 2022.

### 7.2 BGH-Rechtsprechung

- **BGH XI ZR 22/24** (Urteil vom 20.05.2025) — Vorfälligkeitsentschädigung bei unzureichenden Berechnungsangaben.
- **BGH XI ZR 75/23** (Urteil vom 03.12.2024) — Transparenz der Berechnungsformel der Vorfälligkeitsentschädigung.
- **BGH XI ZR 33/15** (Beschluss vom 19.01.2016) — Widerrufsrecht bei fehlerhafter Belehrung.
- **BGH IX ZR 50/22** (14.03.2023) — § 489 BGB nicht auf synthetische Festzinsdarlehen anwendbar.
- **BGH XI ZR 33/08** und ständige Rechtsprechung — Sittenwidrigkeit von Bürgschaften naher Angehöriger.
- **BGH IX ZR 244/01** (14.10.2003) — Keine Übertragung der Angehörigen-Rechtsprechung auf Kommanditisten als Bürgen.
- **BGH XI ZR 78/08** — Transparenzgebot bei Zinsänderungsklauseln.

### 7.3 Web-Quellen (abgerufen 29.04.2026)

- Meyer-Köring, Sittenwidrigkeit Bürgschaft: https://www.meyer-koering.de/meldungen/229/
- BGH-Pressemitteilung Vorfälligkeit 2024: https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2024/2024037.html
- BaFin-Merkblatt Kreditgeschäft: https://www.bafin.de/SharedDocs/Veroeffentlichungen/DE/Merkblatt/mb_090108_tatbestand_kreditgeschaeft.html
- dejure.org § 489 BGB: https://dejure.org/gesetze/BGB/489.html
- dejure.org § 502 BGB: https://dejure.org/gesetze/BGB/502.html
- dejure.org § 495 BGB: https://dejure.org/gesetze/BGB/495.html
- gafron.law KWG-Erlaubnis: https://gafron.law/kwg-erlaubnis-bei-darlehen/
- CMS Bloggt — Vorfälligkeit Immobiliar: https://www.cmshs-bloggt.de/banking-finance/angaben-zur-berechnung-der-vorfaelligkeitsentschaedigung-im-immobiliar-verbraucherdarlehensvertrag/

### 7.4 Stand

- **Gesetzes-Stand:** April 2026 (BGB-Stand nach Verbraucherkredit-Reform 2023/2024)
- **Rechtsprechungs-Stand:** Berücksichtigt BGH-Urteile bis 20.05.2025
- **Recherche-Datum:** 29.04.2026

---

## 8 · Zusammenfassung für Code-Phase

**Zu erwartende Code-Datei:** `backend/playbooks/darlehensvertrag.js` (~520-600 Zeilen).
**Komplexität:** komplex — vergleichbar mit Arbeitsvertrag, durch dynamische Sektionen (`effective_rate`, `right_of_withdrawal` nur bei `loan_type === "consumer"`) ggf. Engine-Erweiterung nötig.
**Sektionen-Anzahl:** 12 (10 immer aktiv, 2 bedingt aktiv).
**Kritische Smart-Defaults:** `mustertext` für Widerrufsrecht (immer), `with_max_compensation` für Vorfälligkeit (immer im Sicher/Ausgewogen).
**Engine-Erweiterung optional:** Sichtbarkeitssteuerung pro Sektion über `visibleWhen: { field: "loan_type", value: "consumer" }`.

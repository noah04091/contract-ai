# Individueller Vertrag — Playbook-Konzept (Sonderfall)

> Recherchedokument im Sinne des `PLAYBOOK-MASTERPLAN.md` (Sektion 8). Sonderfall — siehe Empfehlung in Abschnitt 1.

## Metadaten
- **Slug**: `individuell`
- **Title**: Individueller Vertrag (Lite-Wizard, Universal-Modus)
- **Description**: Geführter Vertragserstellungs-Modus für individuelle Vertragsverhältnisse, die in keinen der 15 Spezial-Vertragstypen passen. Nutzt ausschließlich Universal-Sektionen aus `PLAYBOOK-MASTERPLAN.md` Sektion 4 plus drei frei wählbare Felder für den Vertragsgegenstand.
- **Difficulty**: einfach
- **Estimated Time**: 5–10 Minuten
- **Icon**: `settings`
- **Legal Basis**: BGB Allgemeines Schuldrecht (§§ 241–432); AGB-Recht §§ 305–310 BGB; je nach inhaltlicher Ausrichtung weitere Vorschriften (siehe § 1.4).

---

## 1 · Empfehlung — Option A oder Option B?

### 1.1 Ausgangslage

Der Vertragstyp "individuell" ist **inhaltlich offen** — er ist der "Frei-Modus" wenn der User keinen der 15 anderen Typen wählt. Im Generator (`frontend/src/pages/Generate.tsx` ab Zeile 3318) ist `individuell` heute bereits mit ~17 generischen Feldern hinterlegt (partyA/B + Rolle, Vertragsgegenstand, Leistungen/Pflichten, Vergütung, Laufzeit, Kündigung, Vertraulichkeit, Haftung, Streitbeilegung, Anwendbares Recht, Gerichtsstand, Freitext). Die Frage ist: Lohnt sich für diesen Sonderfall ein Playbook-Wizard mit Modi und Risiko-Bewertung, oder reicht der bestehende Detaillierte-Modus?

### 1.2 Option A — Geführten Modus für `individuell` deaktivieren

**Logik:** Der User kann zwischen "Detailliert" und "Geführt" toggeln. Bei `individuell` wird der Toggle "Geführt" deaktiviert und auf den Detaillierten Modus zurückgeschaltet. Begründung: ohne fixe Rollen, ohne klares Spezialgesetz und ohne typische Klauselstruktur fehlt dem Wizard die Substanz, die in den anderen 15 Playbooks Mehrwert liefert (Risiko-Bewertung, Smart Defaults, juristisch begründete Optionen).

UI-Logik im `GuidedContractWizard.tsx`:
```tsx
{contractType === 'individuell' && (
  <Notice>
    Für individuelle Verträge ist der Geführte Modus nicht verfügbar.
    Nutze den Detaillierten Modus für maximale Flexibilität.
  </Notice>
)}
// + Toggle disabled, default = "detailliert"
```

**Pro:** Kein Pflege-Aufwand, kein Playbook nötig, keine Inkonsistenzen mit anderen Wizards. **Kontra:** User der explizit "individuell" wählt, will oft trotzdem Hilfe — gerade weil sein Fall ungewöhnlich ist.

### 1.3 Option B — Generischer "Lite-Wizard" mit Universal-Sektionen (EMPFOHLEN)

**Logik:** Wir bauen ein kompakteres Playbook mit 7 Universal-Sektionen aus `PLAYBOOK-MASTERPLAN.md` Sektion 4 (Haftung, Gerichtsstand, Kündigung, Schriftform, Salvatorisch, Datenschutz, Vertragsstrafe), plus 3 frei wählbare Vertragsgegenstand-Felder (Subject, Obligations, Compensation) und 2 zusätzliche Sektionen (Vertragstyp-Klassifikation, Streitbeilegung). Die drei Modi (Sicher / Ausgewogen / Durchsetzungsstark) bleiben — aber inhaltlich ohne klare "Pro Partei A/B"-Schlagseite, da die Rollen im individuellen Vertrag fließend sind.

**Pro:**
- User der "individuell" wählt, hat trotzdem strukturierte Hilfe und Risiko-Bewertung.
- Die Universal-Sektionen sind ohnehin in 12+ anderen Playbooks vorhanden und gut recherchiert — geringer Pflege-Aufwand.
- Smart Defaults bieten Mehrwert auch ohne typgenaue Rolle.
- Konsistenz: User sieht in allen 16 Vertragstypen denselben Wizard-Flow.

**Kontra:**
- Die Modi-Logik ist weniger "scharf" als bei spezialisierten Verträgen, da Rollen schwammig sind (es gibt keinen klaren "Schutzbedürftigen").
- Optionen müssen generisch genug formuliert werden, dass sie für 80 % der Fälle sinnvoll sind.

### 1.4 EMPFEHLUNG: Option B

**Begründung:**

1. **User-Intention:** Wer "individuell" wählt, hat ein Vertragsverhältnis, das nicht in die 15 Standard-Typen passt — typischerweise Mischformen (z.B. "Tausch + Geheimhaltung", "Vereinbarung über Sponsoring + IP-Übertragung"). Diese User wollen nicht weniger Hilfe, sondern flexible Hilfe. Der Detaillierte Modus ist eine reine Formularmaske ohne Risiko-Bewertung; das deckt nicht das Beratungsbedürfnis.

2. **Marketing-Kommunikation:** "Geführter Modus für alle 16 Vertragstypen" ist ein klares, marketingtaugliches Versprechen. Wenn `individuell` ausgenommen ist, schwächt das die Kommunikation und verwirrt User ("warum geht der Wizard hier nicht?").

3. **Geringer Aufwand:** Die 7 Universal-Sektionen können aus den anderen Playbooks recycled werden. Ca. 250 Zeilen JS-Code in `backend/playbooks/individuell.js` — Faktor 2–3 weniger als die anderen Playbooks.

4. **Risiko vermieden:** Option A verlangt zusätzliche UI-Logik im Wizard (Toggle-Disable, Notice-Darstellung), die ihrerseits getestet werden muss. Option B nutzt die bestehende generische Architektur.

5. **Schutzfunktion:** Gerade bei individuellen Verträgen ist das Risiko juristischer Fehler hoch — § 309 Nr. 7 BGB (Haftungsausschluss in AGB), § 305 BGB (überraschende Klauseln), § 138 BGB (Sittenwidrigkeit). Der Lite-Wizard kann genau diese Universal-Risiken abfangen.

**Folge für die Code-Umsetzung:** `backend/playbooks/individuell.js` als reduziertes Playbook mit 9 Sektionen (3 Vertragsgegenstand-Felder + 6 Universal-Sektionen + Streitbeilegung) und einem klaren Disclaimer im Wizard: "Für sehr spezielle oder rechtlich heikle Verträge empfehlen wir zusätzlich anwaltliche Prüfung."

---

## 2 · Rechtlicher Hintergrund (Lite)

### 2.1 Anwendbares Recht
- **BGB Allgemeiner Teil** (§§ 1–240): Geschäftsfähigkeit, Anfechtung, Bedingung, Vertretung.
- **BGB Schuldrecht — Allgemeiner Teil** (§§ 241–432): Pflichten, Leistungsstörungen, Verzug, Schadensersatz.
- **AGB-Recht** (§§ 305–310 BGB): Sobald Klauseln vorformuliert für mehrfache Verwendung sind, gelten AGB-Maßstäbe — insbesondere Inhaltskontrolle (§ 307), Klauselverbot mit/ohne Wertungsmöglichkeit (§§ 308, 309).
- **Verbraucherschutz** (§ 13 BGB, §§ 312–312k BGB): Bei B2C zwingend; Widerrufsrecht 14 Tage, Informationspflichten.
- **DSGVO** + **BDSG**: bei jedem Vertrag mit Verarbeitung personenbezogener Daten.

### 2.2 Aktuelle Rechtsprechung — Universal-Risiken
- **BGH vom 13.03.2018 — XI ZR 198/16** (Klauselüberraschung): Klauseln, die für den Vertragspartner überraschend sind (§ 305c BGB), werden nicht Vertragsbestandteil.
- **BGH vom 17.04.2018 — XI ZR 446/16** (Bearbeitungsentgelte): Pauschale Bearbeitungsgebühren in AGB sind unwirksam, wenn sie keine zusätzliche Leistung vergüten.
- **BGH NJW 2008, 2256** (Doppelte Schriftformklausel): In AGB unwirksam, weil überraschend (§ 305c BGB).
- **BGH NJW 1997, 3434** (Salvatorische Klausel): Kein Selbstläufer — bei AGB nur eingeschränkt wirksam, da § 306 BGB greift (Lückenfüllung durch dispositives Recht).
- **EuGH vom 27.01.2021 — C-229/19** (Verbraucher-Vertragsklauseln Richtlinie 93/13/EWG): Strenge Inhaltskontrolle bei B2C, auch für freiwillig vereinbarte Klauseln.

### 2.3 Pflichthinweise
1. **AGB-Charakter prüfen.** Wenn Klauseln für mehrfache Verwendung gedacht sind, gelten §§ 305–310 BGB. Individualvereinbarungen unterliegen geringerer Inhaltskontrolle.
2. **B2C statt B2B**: Bei Verbraucherverträgen Verbraucherschutz beachten — Widerruf, Informationspflichten, zwingender Gerichtsstand am Verbraucher-Wohnsitz (§ 29 ZPO).
3. **DSGVO bei personenbezogenen Daten.** Auftragsverarbeitungsvereinbarung (AVV, Art. 28 DSGVO) prüfen.
4. **Schriftform vs. Textform.** § 126 BGB (Schriftform) verlangt eigenhändige Unterschrift; § 126b BGB (Textform) reicht E-Mail. Im Vertrag explizit regeln.

---

## 3 · Rollen-Definition

Da der Vertragstyp inhaltsoffen ist, werden die Rollen **im Wizard-Step 2 vom User benannt** (Freitextfeld "Rolle Partei A" / "Rolle Partei B"). Beispiele aus dem bestehenden Generate-Flow: Auftraggeber/Auftragnehmer, Verkäufer/Käufer, Vermieter/Mieter, Sponsor/Empfänger, Kooperationspartner.

- **Rolle A — frei benennbar**: Erste Vertragspartei.
- **Rolle B — frei benennbar**: Zweite Vertragspartei.

Die Modi-Bedeutung (siehe Abschnitt 4) ist deshalb **abstrakter** als in spezialisierten Playbooks: keine vorab definierte "schutzbedürftige Partei", sondern allgemeine Risikoverteilung.

---

## 4 · Modi-Bedeutung (vertragsspezifisch — abstrahiert)

- **Sicher** → **Pro Vertragsersteller (Rolle A)**: Strikte Pflichten der Gegenseite, weite Haftung der Gegenseite, Gerichtsstand am eigenen Sitz, kurze Kündigungsfristen für die Gegenseite, Vertragsstrafen, strenge Geheimhaltung. Geeignet wenn Du der "Initiator" mit der besseren Verhandlungsposition bist.
- **Ausgewogen** → **Marktstandard / fair**: Beidseitige Pflichten symmetrisch, gesetzliche Haftung, Gerichtsstand am Sitz des Beklagten (§ 12 ZPO), faire Kündigungsfristen, AGB-konforme Klauseln. Geeignet für Standard-B2B-Vereinbarungen.
- **Durchsetzungsstark** → **Pro Gegenseite (Rolle B) / Schutz der schwächeren Position**: Beschränkte Haftung, Schiedsklausel oder Mediation, lange Auslauffristen, kein nachvertragliches Wettbewerbsverbot, klare Auskunftsrechte. Geeignet wenn Du in der schwächeren Position bist (z.B. "kleiner Auftragnehmer trifft Konzern").

> **Hinweis im Wizard:** Anders als bei spezialisierten Verträgen ist die Modi-Logik hier "soft" — sie bietet Orientierung, nicht zwingende Regeln. Eine eindeutige "schutzbedürftige Partei" gibt es im individuellen Vertragstyp nicht.

---

## 5 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Partei A
  { key: "partyA_name", label: "Name / Firma (Partei A)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Anschrift (Partei A)", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_role", label: "Rolle der Partei A im Vertrag", type: "text", required: true, group: "partyA",
    placeholder: "z.B. Auftraggeber, Verkäufer, Sponsor, Kooperationspartner",
    helpText: "Wird im Vertrag durchgehend als Bezeichnung verwendet." },

  // Partei B
  { key: "partyB_name", label: "Name / Firma (Partei B)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Anschrift (Partei B)", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_role", label: "Rolle der Partei B im Vertrag", type: "text", required: true, group: "partyB",
    placeholder: "z.B. Auftragnehmer, Käufer, Empfänger, Kooperationspartner" },

  // Vertragskontext
  { key: "is_b2c", label: "Ist eine Partei Verbraucher (B2C)?", type: "select", required: true, group: "context",
    options: [
      { value: "b2b", label: "Nein, beide Parteien sind Unternehmer (B2B)" },
      { value: "b2c", label: "Ja, eine Partei ist Verbraucher (B2C — Verbraucherschutz beachten!)" },
      { value: "c2c", label: "Privatpersonen untereinander (C2C — Verbraucherschutz nur eingeschränkt)" }
    ],
    helpText: "Bei B2C greifen zwingend Verbraucherschutz, Widerrufsrecht (§§ 312-312k BGB), Gerichtsstand am Verbraucher-Wohnsitz."
  },
  { key: "subject", label: "Vertragsgegenstand (Was regelt dieser Vertrag?)", type: "textarea", required: true, group: "context",
    placeholder: "z.B. Tausch von Werbefläche gegen Software-Lizenz; Sponsoring eines Sportvereins; Vereinbarung über die gemeinsame Markenpflege..." },
  { key: "obligations", label: "Hauptleistungspflichten beider Parteien", type: "textarea", required: true, group: "context",
    placeholder: "Was schuldet Partei A? Was schuldet Partei B?" },
  { key: "compensation", label: "Vergütung / Gegenleistung (falls vorhanden)", type: "text", required: false, group: "context",
    placeholder: "z.B. 5.000 EUR netto einmalig; oder: keine Vergütung (Tausch)",
    helpText: "Leer lassen, wenn keine Geldzahlung erfolgt." },
  { key: "duration_select", label: "Geplante Vertragsdauer", type: "select", required: true, group: "context",
    options: [
      { value: "einmalig", label: "Einmalige Leistung" },
      { value: "kurz", label: "Bis 6 Monate" },
      { value: "mittel", label: "6–24 Monate" },
      { value: "lang", label: "Über 24 Monate" },
      { value: "unbefristet", label: "Unbefristet" }
    ]
  }
]
```

---

## 6 · Sektionen (Step 3 des Wizards)

> 7 Universal-Sektionen + 1 Auffang-Sektion. Insgesamt kompakter als spezialisierte Playbooks (z.B. freelancer mit 11 Sektionen, gesellschaftsvertrag mit 13).

### § 2 — Vertragstyp-Klassifikation (interne Einordnung)
- **Key**: `contract_classification`
- **Importance**: high
- **Beschreibung**: Bestimmt, welches Schuldrecht-Regime greift — Kauf, Werk, Dienst, Tausch, gemischt. Wirkt indirekt auf Mängelrechte und Erfüllung.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `dienstvertrag` | Dienstvertrag-ähnlich (§ 611 BGB) | Geschuldet ist eine Tätigkeit, kein Erfolg. | medium | Bei tatsächlich erfolgsorientierten Inhalten Streit über anwendbares Recht. | Wenn Mängel auftreten — § 280 BGB statt § 634 BGB Mängelrechte. | Klarstellen, ob Erfolg geschuldet wird. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `werkvertrag` | Werkvertrag-ähnlich (§ 631 BGB) | Geschuldet ist ein konkretes Ergebnis; Abnahme nach § 640 BGB; Mängelrechte § 634 BGB. | low | Klares Regelregime; bei klaren Lieferpflichten Standard. | Wenn Abnahmekriterien fehlen — Streit. | Abnahmekriterien definieren. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `tausch_kooperation` | Tausch / Kooperation (gemischter Vertrag, § 480 BGB analog) | Beide Parteien erbringen Leistungen ohne Geldzahlung. | medium | Steuerlich relevant: Tauschwerte müssen marktüblich sein, sonst USt-/Schenkung-Risiko. | Finanzamt-Bewertung. | Tauschwerte explizit benennen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `mischvertrag` | Mischvertrag (mehrere Regime gleichzeitig) | Vertrag enthält Elemente verschiedener Vertragstypen (z.B. Lieferung + Wartung + Schulung). | high | § 311 BGB Typenvermengung; je nach Schwerpunkt anwendbares Recht. Rechtsprechung uneinheitlich. | Streit über anwendbares Recht; Mängelrechte unklar. | Für jedes Modul separat das anwendbare Recht definieren. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `werkvertrag`
  - ausgewogen: `tausch_kooperation`
  - durchsetzungsstark: `dienstvertrag`

---

### § 3 — Haftung
- **Key**: `liability`
- **Importance**: high
- **Beschreibung**: § 309 Nr. 7 BGB: In AGB Vorsatz/grobe Fahrlässigkeit/Personenschäden nicht ausschließbar. Bei Individualvereinbarung mehr Spielraum.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich` | Gesetzliche Haftung (BGB Default) | Volle Haftung nach BGB; Vorsatz und grobe Fahrlässigkeit unbegrenzt. | medium | Klare Lösung, gerichtsfest. Risiko abhängig von Schadenspotenzial. | Bei Großschaden ggf. existenzbedrohend für die haftende Partei. | Begrenzung auf Auftragswert verhandeln. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `begrenzt_auftragswert` | Begrenzt auf Auftragswert (außer Vorsatz/grober Fahrlässigkeit) | Höchstgrenze = Vergütung; bei Vorsatz/grober Fahrlässigkeit unbegrenzt. § 309 Nr. 7 BGB-konform. | low | Marktstandard B2B; AGB-konform. | Wenn Schaden den Auftragswert weit übersteigt — Begrenzung greift. | Höhere Cap (z.B. 5x Auftragswert oder Versicherungssumme) verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `unbegrenzt` | Unbegrenzte Haftung | Auch Folgeschäden, entgangener Gewinn. | high | Existenzrisiko für die haftende Partei. Bei B2C nicht zwingend zu Gunsten Verbraucher (§ 309 Nr. 7 nur eine Untergrenze). | Großschaden = Insolvenz möglich. | Begrenzung verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `keine_haftung` | Vollständiger Haftungsausschluss | Versuch, jede Haftung auszuschließen. | high | **Unwirksam** in AGB für Vorsatz, grobe Fahrlässigkeit, Personenschäden (§ 309 Nr. 7 BGB). Bei Individualvereinbarung B2B teilweise möglich, aber riskant. | Klausel kippt; Standard-Haftung greift. | Realistische Begrenzung statt Ausschluss. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `unbegrenzt`
  - ausgewogen: `begrenzt_auftragswert`
  - durchsetzungsstark: `begrenzt_auftragswert`

---

### § 4 — Vertragsdauer und Kündigung
- **Key**: `term_termination`
- **Importance**: high
- **Beschreibung**: Standard-Optionen für unbefristete Verträge; bei Verbraucherverträgen besondere Vorgaben (§ 314 BGB außerordentliche Kündigung; § 309 Nr. 9 BGB AGB-Verbote für lange Bindungen).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `einmalige_leistung` | Einmalige Leistung — keine ordentliche Kündigung | Vertrag endet mit Erfüllung; nur außerordentliche Kündigung (§ 314 BGB). | low | Klare Lösung bei einmaligen Geschäften. | Bei Dauerschuldverhältnis-Charakter unklar. | Nur bei wirklich einmaligen Leistungen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `monatlich_4wochen` | Beidseitige ordentliche Kündigung mit 4 Wochen Frist zum Monatsende | Markttypisch; faire Symmetrie. | low | Gerichtsfest; § 309 Nr. 9 BGB AGB-konform. | Selten. | Empfohlen für Standard-Dienstleistungen. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `quartalsende_3monate` | Kündigung mit 3 Monaten Frist zum Quartalsende | Längere Bindung; mehr Planungssicherheit für die Gegenseite. | medium | Bei B2C: § 309 Nr. 9a BGB — max. 2 Jahre Erstlaufzeit, max. 1 Jahr Verlängerung, max. 3 Monate Frist (Faire-Verbraucherverträge-Gesetz, in Kraft seit 01.03.2022). | B2C-Verstoß = Klausel unwirksam. | Bei B2C kürzen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `nicht_kündbar_zeit` | Feste Laufzeit, ordentliche Kündigung ausgeschlossen | Festes Ende; nur außerordentliche Kündigung möglich. | medium | Klar planbar. Bei B2C max. 2 Jahre + automatische Verlängerung max. 1 Jahr (§ 309 Nr. 9 BGB). | Wenn eine Partei sich vorzeitig lösen will — § 314 BGB als einziger Ausweg, hohe Hürde. | B2C-Grenzen prüfen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `nicht_kündbar_zeit`
  - ausgewogen: `monatlich_4wochen`
  - durchsetzungsstark: `monatlich_4wochen`

---

### § 5 — Geheimhaltung / Vertraulichkeit
- **Key**: `confidentiality`
- **Importance**: medium
- **Beschreibung**: GeschGehG (in Kraft 26.04.2019): Schutz nur bei "angemessenen Geheimhaltungsmaßnahmen" (§ 2 Nr. 1 lit. b). Bei reinen Standardverträgen ohne sensible Inhalte oft entbehrlich.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine` | Keine spezielle Klausel | Verweis auf gesetzliche Treuepflicht (§ 241 Abs. 2 BGB). | medium | GeschGehG-Schutz nur bei "angemessenen Maßnahmen" — ohne Vertragsklausel selten erfüllt. | Wenn vertrauliche Infos durchsickern — Beweisproblem. | Mindestens kurze Vertraulichkeitsklausel. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `standard_3jahre` | Gegenseitige Vertraulichkeit, 3 Jahre nachvertraglich | Marktüblich, fair. | low | Praxistauglich; gerichtsfest. | Selten. | Standard. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `streng_5jahre_strafe` | Strenge einseitige Geheimhaltung mit Vertragsstrafe (5 Jahre) | Eine Partei besonders pflichtig; Vertragsstrafe pro Verstoß. | medium | § 343 BGB Reduktionsrecht; § 309 Nr. 6 BGB AGB-Grenzen für pauschale Schadensersatz. | Vertragsstrafe-Höhe überzogen — Gericht reduziert. | Höhe an typischen Schaden orientieren (10.000–50.000 EUR). | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `unbefristet` | Unbefristete Geheimhaltung | Pflicht endet nie. | high | In AGB i.d.R. unwirksam wegen unangemessener Benachteiligung (§ 307 BGB); BGH-Tendenz: max. 5–7 Jahre. | Klausel kippt; ggf. Reduzierung. | Auf 5 Jahre kürzen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `streng_5jahre_strafe`
  - ausgewogen: `standard_3jahre`
  - durchsetzungsstark: `keine`

---

### § 6 — Datenschutz (DSGVO)
- **Key**: `data_protection`
- **Importance**: medium
- **Beschreibung**: Pflicht bei jeder Verarbeitung personenbezogener Daten (Art. 4 Nr. 1 DSGVO). AVV nach Art. 28 DSGVO bei Auftragsverarbeitung.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_pers_daten` | Keine Verarbeitung personenbezogener Daten | Vertrag berührt keine DSGVO-relevanten Daten. | low | Nur korrekt, wenn Aussage tatsächlich stimmt. Bei Geschäftspartner-Daten (Name, E-Mail, Tel) bereits DSGVO-relevant. | Falsche Annahme — DSGVO-Verstoß bei tatsächlicher Verarbeitung. | Realität prüfen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `verweis_avv_separat` | Verweis auf separate AVV | "Soweit personenbezogene Daten verarbeitet werden, schließen die Parteien eine AVV nach Art. 28 DSGVO." | low | Klare Trennung Hauptvertrag/AVV. Bei B2B-Standard. | Wenn AVV nie geschlossen wird — Lücke. | AVV-Vorlage gleich beifügen. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `avv_inline` | AVV inline (Vertragsbestandteil) | Art. 28 DSGVO-Klauseln direkt im Vertrag. | low | Eine Datei, alles geregelt. Bei standardisierten Tools praktikabel. | Vertrag wird länger und unübersichtlicher. | Bei komplexen Verarbeitungen separates Dokument. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `tom_anhang` | TOMs in Anhang (Art. 32 DSGVO) | Technische und organisatorische Maßnahmen als Anhang. | low | Pflicht bei AVV; nachweisbar. | Erfordert konkrete Beschreibung. | TOM-Standardvorlage nutzen (z.B. BSI Grundschutz). | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `avv_inline`
  - ausgewogen: `verweis_avv_separat`
  - durchsetzungsstark: `verweis_avv_separat`

---

### § 7 — Schriftform und Vertragsänderungen
- **Key**: `form_changes`
- **Importance**: medium
- **Beschreibung**: § 126 BGB Schriftform vs. § 126b BGB Textform. Doppelte Schriftformklauseln sind in AGB nach BGH NJW 2008, 2256 unwirksam.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `text_form_zulaessig` | Textform reicht (E-Mail genügt) | § 126b BGB; pragmatisch. | low | Schnell, modern. Bei Streit Beweissituation klar (E-Mail-Verlauf). | Wenn Mündliches als verbindlich ausgegeben wird. | Klausel "Mündliche Nebenabreden bestehen nicht". | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `schriftform_aenderungen` | Schriftform für Änderungen (eigenhändige Unterschrift) | Änderungen nur mit Original-Unterschrift wirksam. | low | Erhöhte Beweissicherheit. | Im modernen Geschäftsverkehr unpraktisch. | "Textform" als Alternative zulassen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `qualifizierte_signatur` | Qualifizierte elektronische Signatur (eIDAS) | Nur QES (§ 126a BGB) als Schriftform-Ersatz. | low | Höchste Beweissicherheit; gerichtsfest. Aber: User-Aufwand (eID/DocuSign Advanced). | Bei kleinen Vereinbarungen unverhältnismäßig. | Bei großen Verträgen Standard. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `doppelte_schriftform` | Doppelte Schriftformklausel ("Schriftform-Erfordernis selbst nur schriftlich aufhebbar") | Verschärfung — auch das Schriftform-Erfordernis ist nur schriftlich aufhebbar. | high | **In AGB unwirksam** (BGH NJW 2008, 2256 — überraschend nach § 305c BGB; bei Individualvereinbarung wirksam). | Klausel kippt in AGB. | Bei AGB-Vertrag ersetzen durch einfache Schriftform. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `qualifizierte_signatur`
  - ausgewogen: `schriftform_aenderungen`
  - durchsetzungsstark: `text_form_zulaessig`

---

### § 8 — Streitbeilegung und Gerichtsstand
- **Key**: `dispute_jurisdiction`
- **Importance**: medium
- **Beschreibung**: § 38 ZPO Gerichtsstandvereinbarung in B2B; bei B2C zwingend Wohnsitz-Verbraucher (§ 29 ZPO + § 38 ZPO Abs. 2).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_beklagter` | Gesetzlicher Gerichtsstand am Sitz des Beklagten | § 12 ZPO Standard. | low | Fairste Lösung. Bei B2C zwingend. | Bei großem Sitzunterschied lange Wege. | Selten. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `partyA_sitz` | Sitz der Partei A | Vorteil für Partei A. | medium | In B2B zulässig (§ 38 ZPO); bei B2C unwirksam. | B-Sicht: Reisen, höherer Aufwand. | B: gegnerisches Sitzgericht oder Mediation verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `mediation_dann_gericht` | Verpflichtende Mediation, dann ordentliches Gericht | 3 Monate Mediation vor Klage. | low | Marktstandard für partnerschaftliche Strukturen. | Wenn eine Partei blockiert — Verzögerung. | Klare Frist. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `schiedsgericht` | Schiedsgericht (DIS / nach Vereinbarung) | Vertraulich, schnell, fachlich. § 1031 ZPO Schriftform Pflicht. | medium | Hohe Verfahrenskosten (10–20 % Streitwert); keine Berufung. | Bei kleinem Streitwert unverhältnismäßig. | Nur bei großen Streitwerten / vertraulichen Inhalten. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `partyA_sitz`
  - ausgewogen: `gesetzlich_beklagter`
  - durchsetzungsstark: `gesetzlich_beklagter`

---

### § 9 — Schlussbestimmungen (Salvatorische Klausel + Schriftform)
- **Key**: `final_provisions`
- **Importance**: medium
- **Beschreibung**: Salvatorische Klausel — § 306 BGB ohnehin als Default. BGH NJW 1997, 3434: Salvatorische Klauseln in AGB nur eingeschränkt wirksam.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `minimal` | Standard-Salvator. + anwendbares deutsches Recht | "Sollte eine Bestimmung unwirksam sein, bleibt der Rest wirksam. Es gilt deutsches Recht." | low | Gesetzlicher Grundsatz; klar und üblich. | Selten Streit. | Standard. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `mit_anpassungspflicht` | Salvator. + Pflicht zur einvernehmlichen Anpassung der unwirksamen Klausel | "Die unwirksame Klausel wird durch eine wirtschaftlich gleichwertige ersetzt; falls die Parteien sich nicht einigen, gilt das dispositive Recht." | low | Praxisnah; vermeidet rechtliche Lücken. | Wenn Parteien sich nicht einig werden — § 306 BGB greift dann. | Standardlösung. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `keine_klausel` | Keine salvatorische Klausel | Reines Vertragstextende ohne Salvator. | medium | Bei Unwirksamkeit einer Klausel greift § 306 BGB automatisch — dispositives Recht ersetzt. Manchmal vorteilhaft. | Lücke fühlt sich für den Laien wie ein Loch im Vertrag an. | Standardklausel einbauen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `mit_verweis_dsgvo` | Standard + ausdrücklicher Verweis auf DSGVO + Verbraucherschutz | Erinnert daran, dass zwingendes Recht Vorrang hat. | low | Klar und transparent. | Selten. | Empfohlen bei B2C-/DSGVO-Bezug. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `mit_anpassungspflicht`
  - ausgewogen: `minimal`
  - durchsetzungsstark: `minimal`

---

## 7 · Anwaltsperspektive — kritische Hinweise

1. **AGB oder Individualvereinbarung?** Die wichtigste Vorfrage. Vorformulierte Klauseln für mehrfache Verwendung = AGB (§ 305 Abs. 1 BGB). Dann gelten strenge Inhaltskontrolle nach §§ 307–309 BGB. Individuelle, ausgehandelte Klauseln = größere Gestaltungsfreiheit (§ 305 Abs. 1 S. 3 BGB).

2. **B2C-Falle.** Bei Verbraucherverträgen sind viele Klauseln zwingend (Widerrufsrecht §§ 312–312k BGB; Gerichtsstand am Verbraucher-Wohnsitz § 29 ZPO + § 38 ZPO; Faire-Verbraucherverträge-Gesetz seit 01.03.2022 — Dauerverträge max. 2 Jahre + 1 Jahr Verlängerung + 1 Monat Frist). Wer B2C ohne diese Klauseln vereinbart, riskiert Unwirksamkeit ganzer Vertragsteile.

3. **Haftungsausschluss-Falle.** § 309 Nr. 7 BGB: Vorsatz, grobe Fahrlässigkeit und Personenschäden in AGB nicht ausschließbar. Auch bei Individualvereinbarung B2B sind völlige Haftungsausschlüsse oft nach § 138 BGB sittenwidrig.

4. **Schriftform-Mythen.** Doppelte Schriftformklauseln in AGB sind nach BGH NJW 2008, 2256 unwirksam (überraschend, § 305c BGB). Wer rechtssicher will: einfache Schriftform oder QES (§ 126a BGB).

5. **DSGVO ist immer dabei.** Auch in scheinbar "datenfreien" Verträgen tauchen personenbezogene Daten auf (Ansprechpartner, E-Mails, IBANs). AVV nach Art. 28 DSGVO mindestens als optionalen Anhang vorhalten.

6. **Klauselüberraschung.** § 305c BGB: Was der Vertragspartner vernünftigerweise nicht erwarten konnte, wird nicht Vertragsbestandteil. Bei ungewöhnlichen Klauseln (z.B. extreme Vertragsstrafen, einseitige Kündigungsrechte) immer **explizit hervorheben** (Fettdruck, separater Hinweis).

7. **Salvator. ist kein Selbstläufer.** Salvatorische Klauseln in AGB sind nach BGH nur eingeschränkt wirksam — § 306 BGB greift ohnehin. In Individualvereinbarungen mehr Spielraum, aber die Anpassungs-Pflicht muss konkret gefasst sein.

8. **Vertragsstrafen-Reduktionsrecht.** § 343 BGB: Gericht kann unverhältnismäßig hohe Vertragsstrafen herabsetzen. § 309 Nr. 6 BGB: pauschale Schadensersatzklauseln in AGB nur unter Bedingungen wirksam.

9. **Nicht-juristisches Vakuum.** Bei wirklich ungewöhnlichen Konstellationen (Tausch + IP + Sponsoring) reicht ein Lite-Wizard nicht. Empfehlung im Wizard: "Bei komplexen oder rechtlich heiklen Verträgen empfehlen wir anwaltliche Prüfung."

10. **Typenvermengung.** § 311 BGB: Mischverträge werden nach dem Schwerpunkt einem Vertragstyp zugeordnet, oder es gilt das Recht des jeweiligen Moduls. Bei klar abgrenzbaren Modulen ist Modul-spezifische Regelung empfehlenswert.

---

## 8 · Wizard-spezifische Hinweise (Implementierungs-Notizen für Option B)

- Der Wizard zeigt den Hinweis: **"Geführter Modus für individuelle Verträge — Ausgangspunkt, kein Ersatz für anwaltliche Prüfung bei komplexen Sachverhalten."**
- Die `is_b2c`-Auswahl in den partyFields steuert Risiko-Hinweise:
  - Bei `b2c` wird in § 4 (Kündigung) Option `nicht_kündbar_zeit` als "rechtlich riskant — § 309 Nr. 9 BGB" markiert.
  - Bei `b2c` wird in § 8 (Gerichtsstand) Option `partyA_sitz` ausgeblendet (§ 38 ZPO Abs. 2 zwingend Wohnsitz Verbraucher).
- Optional: Nach Generierung könnte das Wizard ein "Risiko-Profil" zeigen — bei mehreren high-Risk-Optionen ein Warn-Hinweis "Dieser Vertrag enthält mehrere riskante Klauseln. Anwaltliche Prüfung dringend empfohlen."
- Im Schluss-Step: Disclaimer "Diese Vorlage ersetzt keine individuelle Rechtsberatung. Bei wesentlichen wirtschaftlichen oder juristischen Risiken nutzen Sie unsere Anwaltsempfehlung."

---

## 9 · Quellen

### 9.1 BGH-Rechtsprechung (Aktenzeichen)
- **BGH vom 13.03.2018 — XI ZR 198/16** (Klauselüberraschung § 305c BGB)
- **BGH vom 17.04.2018 — XI ZR 446/16** (Bearbeitungsentgelte unwirksam)
- **BGH NJW 2008, 2256** (Doppelte Schriftformklausel in AGB unwirksam)
- **BGH NJW 1997, 3434** (Salvatorische Klausel in AGB)
- **EuGH vom 27.01.2021 — C-229/19** (Verbraucher-Vertragsklauseln Richtlinie 93/13/EWG)

### 9.2 Gesetze
- BGB §§ 241–432 (Allgemeines Schuldrecht); insb. § 305–310 (AGB-Recht), § 138 (Sittenwidrigkeit), § 305c (Überraschende Klauseln), § 306 (Folgen Unwirksamkeit), § 307–309 (Inhaltskontrolle), § 343 (Reduktionsrecht Vertragsstrafe), § 311 (Vertragstypenmischung), § 312–312k (Verbraucherverträge), § 314 (Außerordentliche Kündigung Dauerschuldverhältnis), § 126/126a/126b (Schriftform/QES/Textform)
- ZPO § 12 (Standardgerichtsstand), § 29 (Erfüllungsort), § 38 (Gerichtsstandvereinbarung), § 1031 (Schiedsklausel)
- DSGVO Art. 4 Nr. 1 (personenbezogene Daten), Art. 28 (AVV), Art. 32 (TOM)
- BDSG (in der jeweils aktuellen Fassung)
- GeschGehG (in Kraft 26.04.2019)
- Faire-Verbraucherverträge-Gesetz vom 10.08.2021 (in Kraft 01.03.2022)

### 9.3 Web-Quellen (Stand 29.04.2026)
- [BGB §§ 305–310 AGB-Recht — gesetze-im-internet.de](https://www.gesetze-im-internet.de/bgb/__305.html)
- [Faire-Verbraucherverträge-Gesetz — bmjv.de](https://www.bmj.de/SharedDocs/Gesetzgebungsverfahren/DE/Faire_Verbrauchervertraege.html)
- [DSGVO Art. 28 Auftragsverarbeitung — dsgvo-gesetz.de](https://dsgvo-gesetz.de/art-28-dsgvo/)
- [GeschGehG — gesetze-im-internet.de](https://www.gesetze-im-internet.de/geschgehg/)
- [BGH NJW 2008, 2256 — Doppelte Schriftformklausel](https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=15.04.2008&Aktenzeichen=X+ZR+126/06)

**Stand: 29.04.2026**

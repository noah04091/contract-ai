# Arbeitsvertrag — Playbook-Konzept

> Recherchedokument im Sinne des `PLAYBOOK-MASTERPLAN.md` (Sektion 8). Vorbereitet die Code-Umsetzung in `backend/playbooks/arbeitsvertrag.js`.

## Metadaten
- **Slug**: `arbeitsvertrag`
- **Title**: Arbeitsvertrag (unbefristet/befristet)
- **Description**: Rechtssicherer Arbeitsvertrag für Festanstellung — mit allen NachwG-Pflichtangaben, Probezeit-, Befristungs-, Vergütungs- und Wettbewerbsklauseln auf BAG-konformem Stand.
- **Difficulty**: komplex
- **Estimated Time**: 12–18 Minuten
- **Icon**: `briefcase`
- **Legal Basis**: BGB §§ 611a, 622 ff.; NachwG (n. F. seit 01.08.2022, geändert durch 4. BEG, Textform ab 01.01.2025); KSchG; AGG; BetrVG; BUrlG; MiLoG; EFZG; ArbZG; TzBfG; HGB §§ 74–75d (Wettbewerbsverbot); BetrAVG; SGB IV §§ 7, 7a (Statusfeststellung); SGB III § 159 (Sperrzeit nach Aufhebung).

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze
- **BGB § 611a** (Arbeitsvertrag-Definition seit 01.04.2017): Persönliche Abhängigkeit, Weisungsgebundenheit, Eingliederung in fremde Arbeitsorganisation. Nicht der Vertragstitel, sondern die tatsächliche Durchführung entscheidet (BAG vom 21.11.2017 — 9 AZR 117/17).
- **NachwG (Nachweisgesetz)** in der seit 01.08.2022 geltenden Fassung (Umsetzung EU-Richtlinie 2019/1152) — alle wesentlichen Vertragsbedingungen müssen nachgewiesen werden. Seit 01.01.2025 (Viertes Bürokratieentlastungsgesetz) reicht **Textform** mit elektronischer Übermittlung, sofern AN nicht ausdrücklich Schriftform verlangt; bei Niedriglohn-Branchen nach § 2a SchwarzArbG bleibt es bei Schriftform.
- **KSchG** (Kündigungsschutzgesetz) — gilt bei Betrieben > 10 AN nach 6 Monaten Betriebszugehörigkeit (§§ 1, 23 KSchG).
- **AGG** — Diskriminierungsverbot bei Vertragsschluss UND Vertragsdurchführung.
- **BetrVG** — Mitbestimmungsrechte bei Einstellung (§ 99), Eingruppierung, Arbeitszeit (§ 87 Abs. 1 Nr. 2/3).
- **BUrlG** — Mindestjahresurlaub 24 Werktage (= 20 Arbeitstage bei 5-Tage-Woche).
- **MiLoG** — gesetzlicher Mindestlohn **13,90 EUR/h ab 01.01.2026**, **14,60 EUR/h ab 01.01.2027** (Mindestlohnkommission, beschlossen 2025).
- **EFZG** — 6 Wochen Entgeltfortzahlung im Krankheitsfall.
- **ArbZG** — werktägliche Höchstarbeitszeit 8 h (Verlängerung auf 10 h bei Ausgleich), Ruhezeit 11 h.
- **TzBfG** — Befristung bedarf Sachgrund (§ 14 Abs. 1) ODER ist sachgrundlos für max. 2 Jahre mit max. 3 Verlängerungen (§ 14 Abs. 2). **Vorbeschäftigungsverbot**: BAG vom 23.01.2019 (7 AZR 733/16) lockerte Rechtsprechung — sehr lange zurückliegende Vorbeschäftigung schadet ggf. nicht; BVerfG-konform.
- **HGB §§ 74 ff.** — nachvertragliches Wettbewerbsverbot nur wirksam mit **Karenzentschädigung von mind. 50 % der zuletzt bezogenen Bezüge** (§ 74 Abs. 2 HGB), schriftlich, max. 2 Jahre. Ohne Entschädigung: nichtig (kein Wettbewerbsverbot, aber auch keine Pflichten des AN).
- **BetrAVG** — gesetzlicher Anspruch auf Entgeltumwandlung bis 4 % BBG (§ 1a BetrAVG).

### 1.2 Aktuelle Rechtsprechung (2024–2026)
- **BAG vom 30.10.2025 — 2 AZR 160/24** (Probezeit in Befristung): Es gibt **keinen starren Regelwert** (frühere "25 %-Quote" gekippt). Probezeit muss im Einzelfall angemessen sein. 4 Monate Probezeit bei 1 Jahr Befristung können nach Tätigkeitsanforderungen gerechtfertigt sein, müssen aber begründbar bleiben.
- **BAG vom 27.03.2025 — 8 AZR 139/24** (Karenzentschädigung): Virtuelle Aktienoptionsrechte zählen zu den "zuletzt bezogenen vertragsmäßigen Leistungen" iSd § 74 Abs. 2 HGB, wenn noch im Arbeitsverhältnis ausgeübt — Entschädigungs-Berechnungsbasis steigt entsprechend.
- **BGH vom 23.04.2024 — II ZR 99/22** (Organmitglieder): Bei GmbH-Geschäftsführern KEINE Pflicht zur Karenzentschädigung; § 74 HGB nicht analog. Aber: Klausel kann "ohne Karenz" rückwirkend verfallen, wenn AG einseitig löst.
- **BAG vom 25.05.2022 — 7 AZR 113/21**: Sachgrundlose Befristung mit Vorbeschäftigung > 22 Jahre zulässig.
- **EuGH vom 22.09.2022 — C-120/21** (Urlaubsverfall): Urlaub verfällt nicht, wenn AG nicht aktiv über drohenden Verfall informiert hat ("Mitwirkungsobliegenheit"). Anspruchsverjährung beginnt erst nach Hinweis.
- **BAG vom 11.12.2024 — 5 AZR 144/24**: Inflationsausgleichsprämie unterliegt arbeitsrechtlicher Gleichbehandlung (kein willkürlicher Ausschluss).

### 1.3 Pflichthinweise (Mindestnachweise nach NachwG seit 2022)
1. Name + Anschrift Vertragsparteien
2. Beginn des Arbeitsverhältnisses
3. Bei Befristung: Ende bzw. vorhersehbare Dauer
4. Arbeitsort (oder Hinweis, dass AN an verschiedenen Orten arbeiten kann)
5. Tätigkeitsbeschreibung
6. Zusammensetzung + Höhe Arbeitsentgelt inkl. aller Zuschläge, Zulagen, Prämien, Sonderzahlungen, **Fälligkeit** und **Auszahlungsart**
7. Vereinbarte Arbeitszeit, Pausen, Ruhezeiten, Schichtsystem
8. Bei Arbeit auf Abruf: Entsprechende Hinweise (Mindeststunden, Ankündigungsfrist nach § 12 TzBfG)
9. Möglichkeit von Überstunden + deren Voraussetzungen
10. Dauer der **Probezeit**, falls vereinbart
11. Anspruch auf **Fortbildung**, soweit AG dies anbietet
12. Name + Anschrift des **Versorgungsträgers** der betrieblichen Altersversorgung
13. **Kündigungsverfahren** (mind. Schriftform, Klageerhebungsfrist nach § 4 KSchG, Kündigungsfristen)
14. Hinweis auf anwendbare Tarifverträge / Betriebsvereinbarungen / Dienstvereinbarungen

**Sanktion bei Verstoß**: Bußgeld bis 2.000 EUR pro Verstoß (§ 4 NachwG). Beweislast für korrekte Vertragsbedingungen liegt bei AG, wenn er Nachweis nicht erbracht hat.

### 1.4 Risiken bei fehlerhafter Gestaltung
- **AGB-Kontrolle**: Standard-Arbeitsverträge sind AGB iSd § 305 BGB → Inhaltskontrolle nach §§ 307 ff. (BAG vom 25.05.2005 — 5 AZR 572/04 Grundsatzurteil). Unwirksame Klauseln werden ersatzlos gestrichen (kein "geltungserhaltender Reduktion" bei AGB).
- **Befristungsfalle**: Schriftform der Befristungsabrede zwingend (§ 14 Abs. 4 TzBfG); bei Verstoß entsteht **unbefristetes Arbeitsverhältnis**.
- **Wettbewerbsverbot ohne Karenz**: Nichtig — AN kann ohne Wettbewerbspflicht wechseln, AG verliert Schutz.
- **Überstundenklausel pauschal**: "Mit dem Gehalt sind alle Überstunden abgegolten" ist nach BAG vom 16.05.2012 (5 AZR 331/11) intransparent und unwirksam, wenn nicht klar erkennbar ist, welcher Stundenanteil abgegolten ist.
- **Verfallklausel**: Drei-Monats-Klauseln müssen Mindestlohn ausnehmen (§ 3 S. 1 MiLoG) und Vorsatzhaftung zulassen — sonst Gesamtnichtigkeit.

---

## 2 · Rollen-Definition
- **Rolle A — Arbeitgeber (AG)**: Stellt Arbeitsplatz zur Verfügung, weisungsbefugt, zahlt Vergütung. Hat strukturelles Interesse an Bindung, Flexibilität und Schutz von Know-how.
- **Rolle B — Arbeitnehmer (AN)**: Stellt Arbeitskraft zur Verfügung, weisungsgebunden, in Organisation des AG eingegliedert. Schutzbedürftig wegen wirtschaftlicher Abhängigkeit (Sozialschutz greift).

---

## 3 · Modi-Bedeutung (vertragsspezifisch)
- **Sicher** → **Pro Arbeitgeber**: Probezeit voll ausgeschöpft, Befristung, lange Kündigungsfristen seitens AN, Wettbewerbsverbot, restriktive Nebentätigkeit, weite Versetzungsklausel, kurze Verfallfristen. Geeignet wenn AG sensible Position besetzt (Sales, Tech-Lead, Schlüsselrollen) oder Risiko-Branche.
- **Ausgewogen** → **Marktstandard / Tarifnähe**: Standard-Festanstellung, 6 Monate Probezeit, gesetzliche Kündigungsfrist, kein Wettbewerbsverbot oder mit fairer Karenz, faire Versetzungsklausel mit Zumutbarkeitsklausel. Gerichtsfest und ohne Inhaltskontrolle-Risiko.
- **Durchsetzungsstark** → **Pro Arbeitnehmer**: Kurze Probezeit oder ohne, lange Kündigungsfrist seitens AG (kürzer für AN durch § 622 Abs. 6 BGB ohnehin geschützt), kein Wettbewerbsverbot, Anspruch auf Homeoffice, hohe Sonderzahlungen, Bonus-Garantie, freiwillige Zusatzleistungen explizit. Geeignet für umworbene Fachkräfte (IT, Medizin, Senior-Management).

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Arbeitgeber
  { key: "partyA_name", label: "Firmenname (Arbeitgeber)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_representative", label: "Vertretungsberechtigt (Geschäftsführung / HR)", type: "text", required: true, group: "partyA" },
  { key: "partyA_employee_count", label: "Anzahl Mitarbeitende (für KSchG-Anwendung)", type: "select", required: true, group: "partyA",
    options: [
      { value: "lt10", label: "Bis 10 (Kleinbetrieb — kein KSchG)" },
      { value: "gte10", label: "Mehr als 10 (KSchG anwendbar)" }
    ]
  },

  // Arbeitnehmer
  { key: "partyB_name", label: "Vor- und Nachname (Arbeitnehmer)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Wohnanschrift", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_birthdate", label: "Geburtsdatum", type: "date", required: true, group: "partyB" },
  { key: "partyB_taxId", label: "Steuer-ID (optional, kann nachgereicht werden)", type: "text", required: false, group: "partyB" },

  // Vertragskontext
  { key: "position", label: "Stellenbezeichnung / Position", type: "text", required: true, group: "context",
    placeholder: "z.B. Senior Software Engineer, Marketing Manager" },
  { key: "startDate", label: "Beginn des Arbeitsverhältnisses", type: "date", required: true, group: "context" },
  { key: "workplace", label: "Arbeitsort (Hauptarbeitsstätte)", type: "text", required: true, group: "context" },
  { key: "weeklyHours", label: "Vereinbarte Wochenarbeitszeit (Stunden)", type: "number", required: true, group: "context",
    placeholder: "z.B. 40" },
  { key: "monthlyGross", label: "Monatliches Bruttogehalt (EUR)", type: "number", required: true, group: "context",
    placeholder: "z.B. 4500" },
  { key: "tarif", label: "Tarifbindung", type: "select", required: true, group: "context",
    options: [
      { value: "kein", label: "Keine Tarifbindung" },
      { value: "tariflich", label: "Tarifvertrag anwendbar (Branche, Region)" },
      { value: "anlehnung", label: "Anlehnung an Tarifvertrag (freiwillig)" }
    ]
  }
]
```

---

## 5 · Sektionen (Step 3 des Wizards)

> 11 strategische Entscheidungen. Paragraphen folgen üblicher Arbeitsvertrags-Struktur.

### § 2 — Beginn, Probezeit und Vertragsart
- **Key**: `start_probation`
- **Importance**: critical
- **Beschreibung**: Legt fest, ob unbefristet oder befristet, mit/ohne Probezeit. Probezeit max. 6 Monate (§ 622 Abs. 3 BGB → 2-Wochen-Kündigung). Bei Befristung Schriftform der Befristungsabrede zwingend (§ 14 Abs. 4 TzBfG).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `unbefristet_6mon` | Unbefristet mit 6 Monaten Probezeit | Standard-Festanstellung. 2-Wochen-Kündigung in Probezeit, danach gesetzliche Fristen. | low | Marktstandard, gerichtsfest. NachwG-Pflicht: Probezeit-Dauer angeben. | Selten — Probezeit kann nicht verlängert werden, einmalige Chance zur Beurteilung. | AN kann kürzere Probezeit oder Verzicht aushandeln; AG verliert dann Flexibilität. | sicher: true, ausgewogen: true, durchsetzungsstark: false |
| `unbefristet_3mon` | Unbefristet mit 3 Monaten Probezeit | Verkürzte Probezeit, Signal von Vertrauen an AN. | low | AN-freundlich; nach 3 Monaten gilt § 622 BGB. KSchG erst nach 6 Monaten Wartezeit (§ 1 KSchG) — daher AG-Schutz bleibt. | AG hat weniger Zeit zur Beurteilung, muss bei Schlechtleistung schneller reagieren. | AN bei umworbener Fachkraft; AG verzichtet auf Flexibilität. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `unbefristet_keine_probezeit` | Unbefristet ohne Probezeit | Sofort gesetzliche Kündigungsfristen (§ 622 BGB). KSchG-Wartezeit von 6 Monaten bleibt unabhängig. | medium | Klare AN-Bevorzugung. AG verliert die einfache 2-Wochen-Trennung. | Wenn AG die Eignung erst spät erkennt — dann nur ordentliche Kündigung mit Frist. | Wenn AN aus sicherem Job kommt und Risikoausgleich verlangt. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `befristet_sachgrundlos` | Befristet sachgrundlos (max. 2 Jahre) | Befristung nach § 14 Abs. 2 TzBfG, max. 2 Jahre, max. 3 Verlängerungen, **kein Vorbeschäftigungsverbot bei sehr langer Lücke** (BAG 25.05.2022). Probezeit muss verhältnismäßig sein (BAG 30.10.2025). | high | Schriftform der Befristungsabrede zwingend! Bei Formfehler entsteht unbefristetes Arbeitsverhältnis. Kein KSchG während Befristung außer bei vorzeitiger Kündigung (§ 15 Abs. 3 TzBfG). | Wenn AN auf Entfristung pocht (§ 17 TzBfG-Klage); wenn Vorbeschäftigung beim selben AG bestand. | AN bei guter Verhandlungsposition (Entfristung als Bonus); AG bei Projektmitarbeit. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `befristet_sachgrundlos` (AG behält Trennungsoption)
  - ausgewogen: `unbefristet_6mon`
  - durchsetzungsstark: `unbefristet_3mon`

---

### § 3 — Tätigkeit und Versetzungsvorbehalt
- **Key**: `task_assignment`
- **Importance**: high
- **Beschreibung**: Definiert das Aufgabengebiet und ob AG den AN versetzen darf (Inhalt, Ort, Zeit). § 106 GewO begrenzt Direktionsrecht durch billiges Ermessen. AGB-Kontrolle bei zu weiter Klausel.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `eng` | Enge Tätigkeitsbeschreibung, kein Versetzungsvorbehalt | Konkrete Position, Arbeitsort, keine Änderung ohne Änderungsvertrag. | medium | AN-freundlich; AG ist bei Reorganisation zu Änderungskündigung gezwungen (§ 2 KSchG). | Wenn Geschäftsstrategie Versetzungen erfordert (Filialwechsel, Projektteams). | AG-Position; klare Linie für Spezialisten. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `standard_versetzung` | Standard mit Versetzungsvorbehalt (zumutbar, gleichwertig) | Tätigkeit ist beschrieben, AG kann gleichwertige Aufgaben/anderen Standort zuweisen, sofern zumutbar (§ 106 GewO + Zumutbarkeitsklausel). | low | Marktüblich, gerichtsfest. Kein Verstoß gegen AGB-Recht, sofern "gleichwertig" und "zumutbar" enthalten. | Selten. AG muss billiges Ermessen wahren — bei Streit Beweislast bei AG. | Meist akzeptabel; AN kann Mindestkriterien (gleicher Wohnort, gleiches Gehalt) ergänzen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `weit_versetzung` | Weiter Versetzungsvorbehalt (auch andere Standorte / andere Tätigkeit) | "AG ist berechtigt, dem AN auch andere zumutbare Tätigkeiten und an anderen Standorten zuzuweisen". | high | Inhaltskontrolle nach § 307 BGB! BAG vom 13.04.2010 (9 AZR 36/09): Klausel ohne Zumutbarkeits- oder Gleichwertigkeitsbegrenzung unwirksam. | Wenn die Klausel zu weit ist und unwirksam wird — dann gilt enge Tätigkeit. | AN muss verlangen, dass "zumutbar" und "gleichwertig" eingebaut wird. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `bundesweit` | Bundesweite Versetzbarkeit | Wie Standard + AN verpflichtet sich, an jeden deutschen Standort zu wechseln (Familienstand zumutbar berücksichtigt). | high | Trotz Klausel: Versetzung an weit entfernten Standort kann unbillig sein (BAG vom 28.08.2013 — 10 AZR 569/12). | Wenn AN umziehen müsste und AG nicht für Umzugskosten aufkommt. | AN sollte Umzugspauschale, Doppelhaushaltsführung, Familienzeit verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `bundesweit`
  - ausgewogen: `standard_versetzung`
  - durchsetzungsstark: `eng`

---

### § 4 — Arbeitszeit und Überstunden
- **Key**: `working_hours`
- **Importance**: critical
- **Beschreibung**: Wochenstunden, Verteilung, Überstunden-Behandlung. ArbZG: max. 8 h/Tag (Verlängerung 10 h möglich), max. 48 h/Woche. **Pauschalabgeltungsklauseln für Überstunden** sind nach BAG-Rspr. nur wirksam, wenn klar erkennbar, **wie viele** Überstunden abgegolten sind.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `feste_zeit_extra_verguetet` | Feste Wochenstunden, Überstunden separat vergütet | Vereinbarte Stundenzahl, jede Mehrarbeit zusätzlich vergütet (Stundensatz aus Bruttogehalt/Stunden). | low | AN-freundlich, transparent. Stundenkonto/Zuschläge je nach Branche. | Wenn AG häufig Überstunden braucht und Kostenkontrolle verliert. | AG bei Saisonarbeit; alternativ Arbeitszeitkonto vereinbaren. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `arbeitszeitkonto` | Arbeitszeitkonto / Gleitzeit | Sollarbeitszeit, Plus-/Minus-Stunden auf Konto, Ausgleich innerhalb von 6–12 Monaten. | low | Marktüblich; Mitbestimmung Betriebsrat (§ 87 Abs. 1 Nr. 2 BetrVG). | Wenn Konto-Saldo bei Ausscheiden hoch ist und nicht ausgezahlt wird (Streit). | Selten — Modell ist fair für beide Seiten, sofern Auszahlungsmodalitäten klar. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `pauschal_abgegolten_konkret` | Bis X Überstunden/Monat pauschal abgegolten | Bis zu definierter Stundenzahl (z.B. "10 Überstunden/Monat") mit Gehalt abgegolten, danach Vergütung oder Freizeitausgleich. | medium | Wirksam, da konkrete Obergrenze (BAG 16.05.2012 — 5 AZR 331/11). Mindestlohn (§ 1 MiLoG) für ALLE Stunden, auch abgegoltene! | Wenn das resultierende Stundenentgelt < Mindestlohn (13,90 EUR ab 2026) — Klausel insoweit nichtig. | AN: Konkrete Stundenzahl + Auszahlung beim Überschreiten verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `vertrauensarbeitszeit` | Vertrauensarbeitszeit (außertariflich, leitend) | Keine Stunden-Erfassung, eigenverantwortliche Arbeitsleistung. Nur für AT-/leitende AN. | high | EuGH 14.05.2019 (C-55/18 "Stechuhr-Urteil") + BAG 13.09.2022 (1 ABR 22/21): **AG ist verpflichtet, Arbeitszeiten zu erfassen** — Vertrauensarbeitszeit nicht mehr ohne Erfassungspflicht möglich. | AG verstößt gegen Erfassungspflicht — Bußgelder + Beweislast-Umkehr bei Überstundenstreit. | AN: AG muss System einführen; AN sollte eigene Aufzeichnung führen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `pauschal_abgegolten_konkret`
  - ausgewogen: `arbeitszeitkonto`
  - durchsetzungsstark: `feste_zeit_extra_verguetet`

---

### § 5 — Vergütung und Sonderzahlungen
- **Key**: `compensation`
- **Importance**: critical
- **Beschreibung**: Gehalt + Bonuskomponenten + Sonderzahlungen. Mindestlohn 13,90 EUR ab 01.01.2026 (Pflicht). Bei Sonderzahlungen entscheidet die Klausel-Formulierung über Anspruch oder Freiwilligkeit.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `nur_grundgehalt` | Nur festes Grundgehalt | Reines monatliches Bruttogehalt, keine Boni, keine Sonderzahlungen. | low | Klar, einfach, kein Streitpotenzial. NachwG-konform mit Höhe + Fälligkeit. | Selten; aber AG verliert Anreiz-Tool. | AN bei umworbener Position kann Bonus oder Urlaubsgeld zusätzlich aushandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `grundgehalt_freiwilliger_bonus` | Grundgehalt + freiwilliger Bonus (kein Anspruch) | Grundgehalt fix, Bonus "freiwillig, ohne Rechtsanspruch auch bei wiederholter Zahlung". | medium | **Doppelte Schriftform-/Freiwilligkeitsklausel** problematisch (BAG 14.09.2011 — 10 AZR 526/10). Bei AGB ist nur **eindeutige** Freiwilligkeitsklausel wirksam, "ohne Rechtsanspruch" allein reicht nicht (BAG 30.07.2008 — 10 AZR 606/07). Betriebliche Übung möglich nach 3 Jahren. | Wenn AN nach 3+ Jahren Bonus-Wegfall anficht und betriebliche Übung geltend macht. | AN bei langjähriger Beschäftigung Bonus-Garantie verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `grundgehalt_zielbonus` | Grundgehalt + Zielbonus mit Bonusvereinbarung | Grundgehalt fix, jährliche Bonusvereinbarung mit Zielen, Auszahlung nach Zielerreichung. | low | Marktstandard; Zielvereinbarungen müssen rechtzeitig getroffen werden — sonst Schadensersatz (BAG 12.12.2007 — 10 AZR 97/07). | Wenn AG Ziele nicht oder zu spät vereinbart — AN hat Anspruch auf 100 % Bonus. | AN: Mindestbonus + faire Zielsetzung verhandeln. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `grundgehalt_13_zahlung_urlaubsgeld` | Grundgehalt + 13. Gehalt + Urlaubsgeld (vertraglich garantiert) | Grundgehalt + jährliche Sonderzahlungen vertraglich zugesichert (kein Vorbehalt). | low | AN-freundlich; Anspruch auch bei laufender Kündigung anteilig (BAG 18.01.2012 — 10 AZR 612/10). | AG: hohe Personalkostenbindung; bei wirtschaftlicher Schieflage schwer rückgängig. | AG: Stichtagsregelung ("nur, wenn AN am 31.12. ungekündigt im Unternehmen") rechtssicher gestalten. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `grundgehalt_freiwilliger_bonus`
  - ausgewogen: `grundgehalt_zielbonus`
  - durchsetzungsstark: `grundgehalt_13_zahlung_urlaubsgeld`

---

### § 6 — Urlaub
- **Key**: `vacation`
- **Importance**: high
- **Beschreibung**: Mindesturlaub 24 Werktage = 20 Arbeitstage (5-Tage-Woche) nach BUrlG. EuGH-Rspr. zu Urlaubsverfall: AG-Mitwirkungsobliegenheit.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich` | Gesetzlicher Mindesturlaub (20 Arbeitstage) | Nur das gesetzliche Minimum nach BUrlG. | low | Rechtssicher; AN kann nicht weniger erhalten (zwingend). EuGH 22.09.2022: Verfall nur nach AG-Hinweis. | Selten Streit, aber unattraktiv für Fachkräfte. | AN: 25–30 Tage marktüblich; je nach Branche/Position. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `25_tage` | 25 Arbeitstage | Standard für nicht-tarifgebundene Festanstellung. | low | Marktüblich, fair. | Selten. | Branchenüblich (Tech: 28–30 Tage). | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `30_tage` | 30 Arbeitstage (sehr arbeitnehmerfreundlich) | Premium-Urlaubsanspruch, oft tarifvertraglich oder bei größeren Konzernen. | low | AN-freundlich; AG-seitig planbar. | Hohe Personalkosten (Urlaubsentgelt + Vertretungsbedarf). | AG bei umworbener Fachkraft als Total-Comp-Hebel; alternativ "Sabbatical" anbieten. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `28_tage_betriebliche_regel` | 28 Arbeitstage + EuGH-konformer Verfallhinweis | 28 Tage + Klausel mit aktiver Hinweispflicht des AG vor Verfall. | low | Beste Balance; entspricht EuGH-Anforderungen (Mitwirkungsobliegenheit). | Selten. | Empfohlene Standard-Klausel für 2026+. | sicher: false, ausgewogen: true, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `gesetzlich`
  - ausgewogen: `28_tage_betriebliche_regel`
  - durchsetzungsstark: `30_tage`

---

### § 7 — Kündigung und Kündigungsfristen
- **Key**: `termination`
- **Importance**: critical
- **Beschreibung**: § 622 BGB regelt Mindestfristen. Innerhalb Probezeit 2 Wochen. Nach Probezeit 4 Wochen zum 15. oder Monatsende, danach Staffelung nach Betriebszugehörigkeit (für AG). AN kündigt immer mit der gesetzlichen Grundfrist (§ 622 Abs. 6 BGB: AN-Frist darf nicht länger sein als AG-Frist).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich` | Gesetzliche Fristen (§ 622 BGB) | 4 Wochen zum 15./Monatsende; AG-Verlängerung mit Betriebszugehörigkeit. | low | Klar, gerichtsfest. Kündigungsschutz nach 6 Monaten + 10 AN (§ 1 KSchG). | Selten. | Standard, akzeptabel für beide Seiten. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `verlaengert_3_monate_beidseitig` | 3 Monate zum Quartalsende, beidseitig | Verlängerte Frist von 3 Monaten zum Quartalsende, gilt für beide Seiten. | medium | § 622 Abs. 6 BGB: AN-Frist darf nicht länger als AG-Frist sein — Symmetrie OK. AG bindet AN länger. | Wenn AN schnell wechseln will und AG nicht freistellt. | AN: kürzere AN-Frist verhandeln (z.B. 1 Monat) — § 622 Abs. 6 BGB schützt. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `verlaengert_AG_kurz_AN` | Längere AG-Frist, kurze AN-Frist | AG: 6 Monate; AN: 1 Monat. Für AN günstiger. | low | Zulässig; § 622 Abs. 6 BGB verbietet nur, dass AN länger gebunden ist als AG. | AG: Verlust von Schlüsselpersonen kurzfristig. | AG: Anti-Abwerbe-Klausel + Wettbewerbsverbot zusätzlich denken. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `befristet_keine_ordentliche` | Befristet, keine ordentliche Kündigung | § 15 Abs. 3 TzBfG: Bei Befristung keine ordentliche Kündigung möglich, außer ausdrücklich vereinbart. | medium | Bei Befristung Standardfall; nur außerordentliche Kündigung (§ 626 BGB). | AG kann bei Schlechtleistung nicht ordentlich beenden — Bindung bleibt. | Vereinbarung der ordentlichen Kündigung im Vertrag ergänzen, dann § 622 BGB. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `verlaengert_3_monate_beidseitig`
  - ausgewogen: `gesetzlich`
  - durchsetzungsstark: `verlaengert_AG_kurz_AN`

---

### § 8 — Nebentätigkeit
- **Key**: `secondary_employment`
- **Importance**: medium
- **Beschreibung**: GG Art. 12 schützt Berufsfreiheit. Vollständiges Verbot unwirksam (BAG 11.12.2001 — 9 AZR 464/00). Zustimmungsvorbehalt mit sachlichen Kriterien zulässig.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `frei` | Nebentätigkeit grundsätzlich frei | AN braucht keine Genehmigung; muss AG nur informieren. | low | AN-freundlich. ArbZG-Grenzen (max. 48 h/Woche AT alle AG zusammen) gelten dennoch. | AG-Interessen können verletzt werden (Wettbewerb, Geheimhaltung). | AG: zumindest Anzeigepflicht vereinbaren. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `anzeigepflicht` | Anzeigepflicht | AN muss Nebentätigkeit anzeigen, AG darf nur untersagen, wenn Interessen beeinträchtigt. | low | Marktüblich, gerichtsfest. | Selten. | Standard. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `genehmigungspflichtig` | Genehmigungsvorbehalt mit Kriterien | Jede Nebentätigkeit zustimmungspflichtig; Zustimmung darf nur aus sachlichem Grund verweigert werden. | medium | BAG verlangt sachliche Kriterien — pauschale Verweigerung unwirksam. | Wenn AG ohne Begründung verweigert. | AN: Begründungspflicht für Verweigerung verlangen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `verboten` | Nebentätigkeit komplett verboten | Kategorisches Verbot. | high | **Unwirksam** (BAG 11.12.2001) — Eingriff in Berufsfreiheit. Klausel wird gestrichen. | Klausel kippt; AN ist faktisch frei. | AN: Klausel als unwirksam zurückweisen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `genehmigungspflichtig`
  - ausgewogen: `anzeigepflicht`
  - durchsetzungsstark: `frei`

---

### § 9 — Nachvertragliches Wettbewerbsverbot
- **Key**: `non_compete`
- **Importance**: high
- **Beschreibung**: § 74 HGB: nur wirksam mit schriftlicher Vereinbarung + **Karenzentschädigung mind. 50 % der zuletzt bezogenen Bezüge** + max. 2 Jahre + räumliche/sachliche Begrenzung. Ohne Karenz: nichtig (BAG ständige Rspr.).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keines` | Kein Wettbewerbsverbot | AN kann nach Vertragsende sofort beim Wettbewerber starten. | low | Während Anstellung gilt § 60 HGB analog (Treuepflicht). Nach Beendigung: Berufsfreiheit. | AG verliert Schutz von Know-how. | AG: NDA + Kundenschutz statt voller Wettbewerbsklausel. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `12mon_50_prozent` | 12 Monate, 50 % Karenzentschädigung | Standard-Wettbewerbsverbot, gerichtsfest. | low | § 74 HGB-konform. **BAG 27.03.2025 (8 AZR 139/24)**: Aktienoptionen einrechnen, sonst zu niedrige Entschädigung. | Wenn AG Karenz nicht zahlt — verbot fällt automatisch. | AN: Höhere Entschädigung (75–100 %) verhandeln; oder Verzicht durchsetzen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `24mon_50_prozent` | 24 Monate, 50 % Karenzentschädigung | Maximale Dauer (§ 74a HGB), Standardentschädigung. | medium | Lange Bindung; AN hat 2 Jahre Berufseinschränkung. Reichweite (räumlich + sachlich) muss konkret sein. | Wenn räumliche/sachliche Reichweite zu weit — Klausel unwirksam (BAG 03.05.1994 — 9 AZR 606/92). | AN: Reduzierung auf 12 Monate oder höhere Entschädigung. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `kundenschutz_statt_wettbewerb` | Nur Kundenschutz, keine Wettbewerbsverbot | AN darf zum Wettbewerber, aber nicht aktiv AG-Kunden abwerben (12 Monate). | low | Mildere Variante; ebenfalls karenzpflichtig (§ 74 HGB) wenn Berufsausübung beeinträchtigt. | Reine Kundenschutzklauseln OHNE Karenz nur wirksam, wenn Berufsausübung nicht wesentlich beeinträchtigt (BAG 17.04.1980 — 6 AZR 491/78). | Kompromiss zwischen voller Freiheit und Wettbewerbsverbot. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `24mon_50_prozent`
  - ausgewogen: `12mon_50_prozent`
  - durchsetzungsstark: `keines`

---

### § 10 — Verschwiegenheit und geistiges Eigentum
- **Key**: `confidentiality_ip`
- **Importance**: high
- **Beschreibung**: AN-Verschwiegenheit auch ohne ausdrückliche Klausel (Treuepflicht). Spezialregelungen: GeschGehG, ArbnErfG (Diensterfindungen).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `basis` | Basis-Verschwiegenheit + ArbnErfG-Default | Verschwiegenheit über Geschäftsgeheimnisse während/nach Vertrag; Diensterfindungen nach ArbnErfG (AG hat Zugriffsrecht, AN bekommt angemessene Vergütung). | low | ArbnErfG zwingend — Vertragsklauseln dürfen nicht zu Lasten AN abweichen (§ 22 ArbnErfG). | Selten — gesetzlicher Mindeststandard. | AG kann erweiterte IP-Klausel ergänzen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `umfassend` | Umfassende NDA + Vorab-IP-Übertragung | Konkrete Vertraulichkeitspflichten + alle dienstlich erstellten IP gehen ohne Zusatzvergütung an AG (urheberrechtliche Nutzungsrechte unbeschränkt). | medium | Bei Erfindungen ArbnErfG-Vergütung trotz Klausel. AGB-Kontrolle der IP-Übertragung. | Wenn AN-Erfindungen entstehen — Vergütungsanspruch bleibt zwingend. | AN: Vergütungsregelung explizit aufnehmen; Software-Quellcode-Behandlung definieren. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `streng_mit_vertragsstrafe` | Strenge Klausel + Vertragsstrafe | Wie umfassend + Vertragsstrafe (z.B. 1 Bruttomonatsgehalt) bei jedem Verstoß. | high | § 309 Nr. 6 BGB: pauschale Vertragsstrafe in AGB problematisch; nur wirksam wenn höhenmäßig angemessen. § 343 BGB: Gericht kann reduzieren. | Wenn Strafhöhe unverhältnismäßig — Klausel unwirksam. | AN: Reduzierung der Strafe oder Wegfall verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `nur_geheimGesetz` | Nur Verweis auf GeschGehG | Verweis auf gesetzliche Regelungen, keine Vertragsklausel. | medium | GeschGehG schützt nur bei "angemessenen Geheimhaltungsmaßnahmen" (§ 2 Nr. 1 GeschGehG). Allein-Verweis schützt nicht. | Wenn AG keine TOM trifft — kein Schutz. | AG sollte konkrete Klausel ergänzen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `streng_mit_vertragsstrafe`
  - ausgewogen: `umfassend`
  - durchsetzungsstark: `basis`

---

### § 11 — Verfallklauseln
- **Key**: `forfeiture`
- **Importance**: high
- **Beschreibung**: Zwei-Stufen-Verfallklauseln (schriftlich geltend machen → klagen) sind marktüblich. **Mindestlohn (§ 3 MiLoG)**, **Vorsatzhaftung** und **Ansprüche aus Personenschäden** dürfen NICHT erfasst sein, sonst Gesamtnichtigkeit (BAG 18.09.2018 — 9 AZR 162/18).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine` | Keine Verfallklausel | Gesetzliche Verjährung gilt (3 Jahre, § 195 BGB). | low | AN-freundlich. AG hat lange Restrisiko. | AG: lange Unsicherheit über offene Forderungen. | AG kann zumindest 6-Monats-Frist verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `3_monate_zwei_stufen` | 3 Monate, zwei-stufig | Frist 3 Monate ab Fälligkeit zur schriftlichen Geltendmachung + 3 Monate zur Klage. | medium | Wirksam, aber **muss MiLoG/Vorsatz/Personenschäden ausnehmen** (sonst Gesamtnichtigkeit, BAG 18.09.2018). | Wenn Klausel unbeschränkt formuliert — fällt komplett weg. | AN: Frist > 3 Monate; explizite Ausnahmen für Mindestlohn-Differenz. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `6_monate_zwei_stufen` | 6 Monate, zwei-stufig | Mildere Variante mit 6 Monaten je Stufe. | low | AN-freundlicher; weniger Streit. | Selten. | Empfohlener Mittelweg. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `nur_einseitig_AN_kurz` | Verfall nur für AN-Ansprüche | AN muss innerhalb 3 Monaten geltend machen, AG nicht. | high | **Unwirksam** wegen Benachteiligung (BAG 31.08.2005 — 5 AZR 545/04). | Klausel kippt; AN-Ansprüche verjähren erst nach 3 Jahren. | AG: symmetrische Klausel verwenden. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `3_monate_zwei_stufen`
  - ausgewogen: `6_monate_zwei_stufen`
  - durchsetzungsstark: `keine`

---

### § 12 — Datenschutz, Schlussbestimmungen, Schriftform
- **Key**: `data_misc`
- **Importance**: medium
- **Beschreibung**: DSGVO-Pflichthinweise (Art. 13), salvatorische Klausel, Schriftform für Änderungen. Doppelte Schriftformklausel bei AGB unwirksam (BGH NJW 2008, 2256).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `minimal` | Nur Schlussklauseln + DSGVO-Verweis | Schriftform für Änderungen, salvatorische Klausel, Verweis auf separate Datenschutzinformation. | low | Schriftform seit 4. BEG (2025) auch elektronisch zulässig (NachwG-Textform). | Selten. | Akzeptabel. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `umfassend` | Umfassende Schlussbestimmungen | DSGVO Art. 13-Information inline + Schriftform + Salvator. + Gerichtsstand + Anwendbares Recht. | low | Maximale Transparenz, NachwG-konform. | Lange Vertragstexte; aber rechtssicher. | Empfohlen für Standard-AG. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `schriftform_doppelt` | Doppelte Schriftformklausel | "Änderungen, einschließlich der Schriftformklausel selbst, bedürfen der Schriftform." | high | **Unwirksam in AGB** (BGH 25.01.2017 — XII ZR 69/16; BAG 20.05.2008 — 9 AZR 382/07). | Klausel kippt; mündliche Änderungen wirksam. | Streichen, einfache Schriftform reicht. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `gerichtsstand_ag` | Gerichtsstand am Sitz AG | Gerichtsstand-Vereinbarung am Sitz des AG. | medium | **Unwirksam für Streitigkeiten aus Arbeitsverhältnis** — § 38 ZPO + § 48 ArbGG: ausschließlicher Gerichtsstand am Arbeitsort. | Bei Klage AG am AG-Sitz: Verweisung. | Streichen — gesetzlicher Gerichtsstand reicht. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `umfassend`
  - ausgewogen: `minimal`
  - durchsetzungsstark: `minimal`

---

## 6 · Anwaltsperspektive — kritische Hinweise

1. **NachwG-Compliance ist Pflicht, nicht Kür.** Der Vertrag muss alle 14 Pflichtangaben enthalten. Fehlt auch nur eine, riskiert AG ein Bußgeld bis 2.000 EUR pro Verstoß. Der Vertrag bleibt aber wirksam — nur die Beweisbarkeit von Klauseln ist gefährdet.
2. **AGB-Kontrolle ernst nehmen.** Standard-Verträge sind AGB. Jede Klausel wird streng geprüft. Bei Unklarheit gilt § 305c BGB: Auslegung gegen den Verwender. Klare, transparente Sprache schlägt komplexe Vertragstheorie.
3. **Wettbewerbsverbot ohne Karenzentschädigung ist nichtig** — kein "halb wirksam". AG-Falle Nr. 1 in der Praxis.
4. **Befristungsschriftform** (§ 14 Abs. 4 TzBfG) wird oft übersehen — bei Verstoß: unbefristetes Arbeitsverhältnis. Vorsicht bei Verlängerungen: nur **vor** Ablauf der Befristung schriftlich, ohne Inhaltsänderung.
5. **Probezeit max. 6 Monate; Verlängerung unwirksam** (§ 622 Abs. 3 BGB ist halbzwingend zugunsten AN). Bei Befristungen muss Probezeit angemessen sein (BAG 30.10.2025).
6. **Pauschalabgeltung Überstunden** nur mit konkretem Stundenlimit; sonst intransparent.
7. **EuGH-Urlaubsverfall**: AG MUSS den AN aktiv über Urlaubsverfall informieren. Ohne Hinweis verfällt nichts — selbst nach Jahren.
8. **Stechuhr-Pflicht** seit 2022/2023: AG muss ein objektives Arbeitszeit-Erfassungssystem einführen (EuGH C-55/18, BAG 1 ABR 22/21). Vertrauensarbeitszeit ohne Erfassung verstößt.
9. **Datenschutz**: Bei Bewerbungs- und Personalverwaltung greift § 26 BDSG. Beschäftigtendaten besonders geschützt.
10. **Mindestlohn-Anpassung 2026/2027** (13,90/14,60 EUR) — bei Pauschalvergütung prüfen, ob Stundenlohn-Quotient noch über Mindestlohn liegt; sonst automatischer Anpassungsanspruch.
11. **Gerichtsstand**: Im Arbeitsrecht **kein** wirksamer abweichender Gerichtsstand möglich (§ 48 ArbGG). Klausel weglassen oder Standard übernehmen.
12. **Statusfeststellung**: Bei Berater-/Freelancer-Konstellationen droht Scheinselbstständigkeit (§ 7 SGB IV). Bei klassischer Festanstellung kein Thema, aber Vorsicht bei "freier Mitarbeit"-Mischformen — siehe Freelancer-Playbook.

---

## 7 · Quellen

- BAG vom 30.10.2025 — 2 AZR 160/24 (Probezeit in Befristung) — [Bundesarbeitsgericht](https://www.bundesarbeitsgericht.de/presse/probezeitkuendigung-im-befristeten-arbeitsverhaeltnis/)
- BAG vom 27.03.2025 — 8 AZR 139/24 (Karenzentschädigung) — [Bundesarbeitsgericht](https://www.bundesarbeitsgericht.de/entscheidung/8-azr-139-24/)
- BGH vom 23.04.2024 — II ZR 99/22 (Organmitglieder Wettbewerbsverbot)
- BAG vom 25.05.2022 — 7 AZR 113/21 (Vorbeschäftigungsverbot, lange Lücke)
- EuGH vom 22.09.2022 — C-120/21 (Urlaubsverfall, Mitwirkungsobliegenheit)
- EuGH vom 14.05.2019 — C-55/18 (Stechuhr-Urteil)
- BAG vom 13.09.2022 — 1 ABR 22/21 (Arbeitszeiterfassungspflicht)
- BAG vom 16.05.2012 — 5 AZR 331/11 (Pauschalabgeltung Überstunden)
- BAG vom 18.09.2018 — 9 AZR 162/18 (Verfallklausel + Mindestlohn)
- BGH vom 25.01.2017 — XII ZR 69/16 (Doppelte Schriftformklausel unwirksam)
- BAG vom 11.12.2001 — 9 AZR 464/00 (Nebentätigkeit)
- Mindestlohnkommission, Beschluss 2025: 13,90 EUR ab 01.01.2026, 14,60 EUR ab 01.01.2027
- NachwG i.d.F. 4. Bürokratieentlastungsgesetz (gültig ab 01.01.2025)
- [Haufe — BAG-Urteile 2025](https://www.haufe.de/oeffentlicher-dienst/personal-tarifrecht/bag-urteile-2025-ueberblick-fuer-arbeitgeber_144_669910.html)
- [Hopkins.law — Nachweisgesetz 2025](https://www.hopkins.law/expertise/nachweisgesetz-im-ueberblick)
- [Bundesregierung — Mindestlohn 2026](https://www.bundesregierung.de/breg-de/aktuelles/mindestlohn-faq-1688186)
- Stand der Recherche: 29.04.2026

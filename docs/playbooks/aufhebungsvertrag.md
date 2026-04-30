# Aufhebungsvertrag — Playbook-Konzept

> Recherchedokument im Sinne des `PLAYBOOK-MASTERPLAN.md` (Sektion 8). Vorbereitet die Code-Umsetzung in `backend/playbooks/aufhebungsvertrag.js`.

## Metadaten
- **Slug**: `aufhebungsvertrag`
- **Title**: Aufhebungsvertrag (einvernehmliche Beendigung Arbeitsverhältnis)
- **Description**: Vertrag zwischen Arbeitgeber und Arbeitnehmer zur einvernehmlichen Beendigung des Arbeitsverhältnisses — mit Abfindung, Freistellung, Zeugnis, Wettbewerbsregelung, Sperrzeit-Schutz und steuerlicher Optimierung.
- **Difficulty**: komplex
- **Estimated Time**: 10–15 Minuten
- **Icon**: `handshake`
- **Legal Basis**: BGB § 623 (Schriftform Beendigung); BGB §§ 280, 311 Abs. 2, 241 Abs. 2 (Gebot fairen Verhandelns); KSchG §§ 1, 1a (betriebsbedingte Kündigung mit Abfindung); SGB III § 159 (Sperrzeit ALG); EStG § 34 (Fünftelregelung); GewO § 109 (Zeugnis); HGB § 74 ff. (nachvertragliches Wettbewerbsverbot); BetrAVG (Versorgungsanwartschaften); AGG (Gleichbehandlung bei Abfindung); BetrVG § 102 (BR-Beteiligung bei Beendigung); BUrlG (Urlaubsabgeltung).

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze und Abgrenzungen

- **BGB § 623**: **Schriftform zwingend** — sowohl Kündigung als auch Aufhebungsvertrag müssen schriftlich sein (eigenhändige Unterschrift, kein E-Mail/Fax). Verstoß = nichtig (§ 125 BGB).
- **BGB §§ 280, 311 Abs. 2 Nr. 1, 241 Abs. 2** ("Gebot fairen Verhandelns"): Pflicht zur Rücksichtnahme bei Vertragsverhandlungen. BAG vom 07.02.2019 — 6 AZR 75/18 hat dieses Gebot als arbeitsrechtliche Nebenpflicht anerkannt. Verstoß führt zu Schadensersatzanspruch (§ 249: Naturalrestitution = Wiederherstellung Arbeitsverhältnis).
- **BGB § 119 Abs. 1, § 123 Abs. 1** (Anfechtung): Aufhebungsvertrag kann angefochten werden bei Inhaltsirrtum, Erklärungsirrtum, arglistiger Täuschung oder widerrechtlicher Drohung. Anfechtungsfrist § 121, § 124 BGB. Bei Drohung: 1 Jahr ab Wegfall der Zwangslage.
- **BGB § 312 Abs. 1 Nr. 1**: **Kein Widerrufsrecht** für Aufhebungsverträge. Unterschied zur Kündigung — einmal unterschrieben gilt der Vertrag, kein gesetzliches "Cool-Off". Im Gegensatz: BAG-Tendenz, "Tür-und-Angel"-Verträge unter "Gebot fairen Verhandelns" angreifbar.
- **KSchG § 1a**: Bei betriebsbedingter Kündigung mit Abfindungsangebot Standardformel: **0,5 Monatsgehälter pro Beschäftigungsjahr**. Diese Höhe ist auch der Maßstab für sperrzeit-freien Aufhebungsvertrag (BSG B 11a AL 47/05 R).
- **SGB III § 159 Abs. 1 Nr. 1** (Sperrzeit ALG): **12 Wochen Sperrzeit**, wenn Arbeitnehmer das Arbeitsverhältnis selbst beendet ohne wichtigen Grund. Aufhebungsvertrag = aktive Mitwirkung an Beendigung → grundsätzlich Sperrzeit.
- **Ausnahme Sperrzeit (BSG B 11a AL 47/05 R, 12.07.2006)**: Wichtiger Grund liegt vor bei
  1. drohender rechtmäßiger betriebsbedingter Kündigung des AG zum gleichen Zeitpunkt,
  2. Einhaltung der ordentlichen Kündigungsfrist,
  3. Abfindung zwischen 0,25–0,5 Monatsverdienste pro Beschäftigungsjahr (entspricht KSchG § 1a-Range),
  4. kein offensichtlich rechtswidriger Kündigungsversuch des AG (kein "Aliud-Anlass").
- **SGB III § 158** (Ruhen ALG bei Abfindung): Wird Abfindung gezahlt UND ordentliche Kündigungsfrist NICHT eingehalten, ruht ALG-Anspruch bis zum hypothetischen Ende der ordentlichen Frist (max. 1 Jahr).
- **EStG § 34 Abs. 1, § 24 Nr. 1** (Fünftelregelung): Abfindungen sind außerordentliche Einkünfte mit begünstigter Besteuerung. Steuerberechnung: 1/5 der Abfindung wird zum übrigen Einkommen addiert, daraus resultierender Steueraufwand × 5 = Abfindungs-Steuer. Effektiv geringere Progression.
- **EStG § 34 — Änderung 2025**: AG kann Fünftelregelung **nicht mehr direkt im Lohnsteuerabzug** anwenden. Abfindung wird voll versteuert; AN muss Fünftelregelung in Einkommensteuererklärung beantragen (Liquiditätsnachteil bis Steuerbescheid).
- **GewO § 109**: Anspruch auf qualifiziertes Zeugnis. Inhalt + Note müssen wahr und wohlwollend sein. BAG-Rechtsprechung: Note "befriedigend" ist Default; bessere Note muss AN beweisen, schlechtere AG.
- **HGB §§ 74-75d** (nachvertragliches Wettbewerbsverbot): Wirksam nur mit Karenzentschädigung min. 50 % der vor Ausscheiden bezogenen Leistungen, max. 2 Jahre, Schriftform, Aushändigung an AN. Ohne Karenz nichtig. **Einseitige AN-Bindung ohne Karenz unwirksam**.
- **BetrAVG § 1b** (unverfallbare Versorgungsanwartschaft): Bei Beendigung Arbeitsverhältnis ab 3 Jahren bAV-Zugehörigkeit + Mindestalter 21 Jahre = unverfallbare Anwartschaft. Im Aufhebungsvertrag adressieren.
- **BUrlG § 7 Abs. 4**: Restlicher Urlaubsanspruch ist bei Beendigung **abzugelten**, wenn Urlaub nicht mehr genommen werden kann. Aufhebungsvertrag sollte regeln: Urlaub im Freistellungszeitraum verbraucht ODER Abgeltung.
- **AGG § 3, § 7**: Diskriminierungsverbot bei Abfindung — gleiche Behandlung gleicher Fälle. Bei Sozialplänen Sonderregeln § 10 Nr. 6 AGG (zulässige Altersdifferenzierung).
- **BetrVG § 102**: Bei Mitwirkungsfällen Betriebsrat anhören (insbesondere bei Massen-Aufhebungen / Sozialplan).
- **§ 17 KSchG** (Massenentlassungsanzeige): Bei Aufhebungsverträgen, die im sachlichen Zusammenhang mit anderen Beendigungen stehen, kann Anzeigepflicht greifen. EuGH C-188/03 (Junk): Aufhebungsverträge zählen mit, wenn AG-Initiative.

### 1.2 Aktuelle Rechtsprechung (2022–2026)

- **BAG vom 07.02.2019 — 6 AZR 75/18** (Grundsatz "Gebot fairen Verhandelns"): Aufhebungsvertrag verletzt Pflicht zur Rücksichtnahme, wenn psychische Drucksituation geschaffen oder ausgenutzt wird, die freie Entscheidung erschwert. Folge: Schadensersatz nach § 249 BGB = Wiederherstellung des Arbeitsverhältnisses.
- **BAG vom 24.02.2022 — 6 AZR 333/21** (Bestätigung Faires Verhandeln, Konkretisierung): Verhandlung im Manager-Büro mit Drohung fristloser Kündigung wegen Verkaufszahlen-Fälschung **kein Verstoß** gegen Gebot fairen Verhandelns. Wichtig: Druck zur sofortigen Annahme + kein Bedenkzeit-Recht ist **nicht per se unzulässig**, wenn keine zusätzliche unfaire Verhandlungsmethode hinzukommt. Schwelle für Unwirksamkeit hoch.
- **BAG vom 17.10.2024 — 8 AZR 172/23**: Pauschale "Catch-All"-Verschwiegenheitsklauseln über Betriebsgeheimnisse sind unwirksam. Klauseln müssen konkret das geschützte Geschäftsgeheimnis benennen.
- **BSG vom 12.07.2006 — B 11a AL 47/05 R** (Grundsatz Sperrzeit-Ausnahme): Aufhebungsvertrag mit Abfindung im KSchG § 1a-Range (0,25–0,5 Monatsverdienste/Jahr) zur Vermeidung einer drohenden rechtmäßigen betriebsbedingten Kündigung = wichtiger Grund, **keine Sperrzeit**. Nach wie vor maßgebend (Fachliche Weisung BA Stand 2024).
- **BAG vom 11.07.2023 — 9 AZR 4/23** (Urlaubsabgeltung bei Freistellung): Im Aufhebungsvertrag erklärte unwiderrufliche Freistellung gilt grundsätzlich als Urlaubsgewährung — wenn Aufhebungsvertrag dies klar regelt. Sonst: Abgeltung in Geld.
- **BAG vom 27.04.2021 — 9 AZR 384/20**: Erlöschen des Urlaubsanspruchs nur bei AG-Hinweis auf bestehenden Urlaub und drohenden Verfall. Auch im Aufhebungsvertrags-Kontext.
- **BAG vom 14.09.2021 — 9 AZR 8/21**: Kein Schadensersatz für nicht genommene Erholungsurlaubsansprüche im Aufhebungsvertrag, wenn AG ordnungsgemäß hingewiesen hat.
- **BFH vom 12.04.2022 — VI R 22/19** (Fünftelregelung): Fünftelregelung gilt auch bei Teilzahlungen, wenn Auszahlung im selben Veranlagungszeitraum.
- **BAG vom 22.10.2015 — 2 AZR 124/14** (Drohung fristloser Kündigung): Drohung mit fristloser Kündigung ist nur dann widerrechtliche Drohung i.S.v. § 123 BGB, wenn ein verständiger AG die Kündigung nicht ernsthaft in Erwägung ziehen durfte. Bei begründetem Verdacht (z.B. Verkaufszahlen-Fälschung in BAG 6 AZR 333/21) **kein** Anfechtungsgrund.
- **EuGH vom 27.01.2005 — C-188/03** (Junk): Aufhebungsverträge zählen für § 17 KSchG-Schwellenwerte mit, wenn AG-Initiative.

### 1.3 Pflichthinweise und Risiken

1. **Schriftform zwingend** (§ 623 BGB) — eigenhändige Unterschrift, kein E-Mail. Bei Verstoß nichtig.
2. **Kein Widerrufsrecht** (§ 312 Abs. 1 Nr. 1 BGB) — einmal unterschrieben gilt. AN kann nur über § 119, § 123 BGB anfechten oder über "Gebot fairen Verhandelns" Schadensersatz fordern.
3. **Sperrzeit-Risiko vermeiden**: Aufhebungsvertrag sollte enthalten:
   - Hinweis auf drohende betriebsbedingte Kündigung des AG zum gleichen Beendigungsdatum,
   - Einhaltung der ordentlichen Kündigungsfrist,
   - Abfindung im KSchG § 1a-Range (0,25–0,5 Monatsverdienste pro Jahr),
   - keine offensichtlich rechtswidrige Konstruktion.
4. **Tür-und-Angel-Geschäfte vermeiden** — BAG 6 AZR 75/18 schützt vor Druck-Verhandlungen. Aber: BAG 6 AZR 333/21 zeigt, dass Schwelle für Unwirksamkeit hoch ist.
5. **Schweigepflicht-Klauseln konkret formulieren** (BAG 8 AZR 172/23) — pauschale Catch-All-Klauseln unwirksam; Geschäftsgeheimnisse benennen.
6. **Wettbewerbsverbot mit Karenz** — § 74 HGB: ohne Karenzentschädigung min. 50 % nichtig. AN kann sich aussuchen, ob er sich an Klausel halten will.
7. **Urlaubsabgeltung klar regeln** (BAG 9 AZR 4/23, 9 AZR 384/20) — Aufhebungsvertrag muss explizit sagen: Urlaub durch Freistellung verbraucht ODER abgegolten in Geld. Bei unklarer Regelung Streit.
8. **Betriebliche Altersversorgung dokumentieren** — bAV-Anwartschaft (BetrAVG § 1b) bei Beendigung adressieren, sonst Nachverhandlung.
9. **Massenentlassungsanzeige (§ 17 KSchG)** prüfen, wenn mehrere Aufhebungsverträge gleichzeitig.
10. **Steuerliche Optimierung Fünftelregelung** (§ 34 EStG) — Abfindung möglichst in einem Veranlagungszeitraum. Seit 2025: Beantragung in Steuererklärung, nicht mehr automatisch in Lohnsteuer.
11. **AGG-Konformität** — keine altersdiskriminierenden Abfindungsstaffeln außerhalb Sozialplan-Privilegien.
12. **Keine widerrechtliche Drohung** mit klar haltloser Kündigung (BAG 2 AZR 124/14) — sonst Anfechtungsrisiko.

### 1.4 Standardklauseln und Bestandteile (Übersicht)

| Bestandteil | Wesen | Praxis-Tipp |
|-------------|-------|-------------|
| **Beendigungsdatum** | Konkretes Datum, nicht "spätestens" | Ordentliche Kündigungsfrist einhalten (§ 622 BGB) → kein Ruhen ALG (§ 158 SGB III) |
| **Beendigungsgrund (für ALG)** | "betriebsbedingte Kündigung gedroht / Restrukturierung" | Pflicht für sperrzeitfreien ALG-Anspruch (BSG B 11a AL 47/05 R) |
| **Abfindung** | Höhe + Fälligkeit + Steuerberechnung | KSchG § 1a-Range (0,25–0,5 MV/Jahr), Auszahlung mit letztem Lohn → Fünftelregelung |
| **Freistellung** | Bezahlt/unbezahlt, widerruflich/unwiderruflich, Urlaubsanrechnung | "Unwiderruflich + Urlaubsanrechnung" optimal für Steuer, Sperrzeit, Karenz-Wettbewerb |
| **Zeugnis** | Note, Inhalt, Erstellungs-/Ausstellungsdatum | Bestnote ("sehr gut") + Standard-Wohlwollensformulierungen + Datum letzter Arbeitstag |
| **Resturlaub / Überstunden** | Verbraucht durch Freistellung ODER abgegolten | Klar regeln, sonst BAG-Streit |
| **Betriebliche Altersversorgung** | Anwartschaft / Verzicht / Übertragung | BetrAVG § 1b, § 4 — schriftliche Bestätigung |
| **Wettbewerbsverbot** | Karenz min. 50 %, max. 2 Jahre | Häufig im Aufhebungsvertrag aufgehoben gegen Pauschale |
| **Verschwiegenheit** | Nachvertragliche Geheimhaltung | Konkrete Geschäftsgeheimnisse benennen (BAG 8 AZR 172/23) |
| **Outplacement** | Beratungsbudget + Anbieterwahl | Branchenüblich ab Senior-Level |
| **Generalquittung / Erledigungsklausel** | Gegenseitige Forderungen abgegolten | Wichtig — sonst spätere Boni/Provisions-Streitigkeiten |
| **Rückgabe Arbeitsmittel** | Laptop, Handy, Schlüssel, Kreditkarten | Liste + Datum |

---

## 2 · Rollen-Definition

- **Rolle A — Arbeitgeber (AG)**: Unternehmen, das Arbeitsverhältnis einvernehmlich beenden will. Will: rechtssichere Beendigung ohne Kündigungsschutzklage, Generalquittung, klare Wettbewerbs-/Verschwiegenheits-Regelung, Vermeidung von Folge-Streit.
- **Rolle B — Arbeitnehmer (AN)**: Beschäftigter, der das Arbeitsverhältnis verlässt. Will: faire Abfindung, sperrzeitfreier ALG-Anspruch, gutes Zeugnis, klare Freistellungs-/Urlaubsregelung, Wegfall Wettbewerbsverbot oder Karenzentschädigung.

---

## 3 · Modi-Bedeutung (vertragsspezifisch)

- **Sicher** → **Pro Arbeitgeber**: Niedrige Abfindung (KSchG-Untergrenze 0,25 MV/Jahr), bezahlte Freistellung mit Anrechnung Urlaub und Karenz, weiter Verschwiegenheits-/Wettbewerbsschutz für AG, "befriedigend"-Zeugnis als Default, vollständige Generalquittung, Rückgabe-Verpflichtungen scharf, keine Outplacement, Sprinter-Bonus nicht enthalten.
- **Ausgewogen** → **Marktstandard**: Abfindung bei 0,5 MV/Jahr (KSchG § 1a Standard), sperrzeitfreie Formulierung mit Hinweis auf drohende betriebsbedingte Kündigung, unwiderrufliche Freistellung mit Urlaubsanrechnung, gutes ("vollste Zufriedenheit") Zeugnis, beidseitige Generalquittung, Outplacement bei Senioren-Mandanten, Wettbewerbsverbot nur mit Karenz oder aufgehoben.
- **Durchsetzungsstark** → **Pro Arbeitnehmer**: Hohe Abfindung (0,75–1,0 MV/Jahr, mit Aufschlag bei Verzicht auf Klage), Sprinter-Bonus für vorzeitige Beendigung, Auflösung Wettbewerbsverbot ohne Karenz-Anrechnung, "sehr gute" Zeugnisnote mit individuellen Erfolgs-Hervorhebungen, volle Outplacement-Beratung, Übernahme Anwaltskosten, Aufhebung Verschwiegenheit für Berufstätigkeit, bAV-Übertragung mit AG-Zuschuss.

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Arbeitgeber
  { key: "partyA_name", label: "Firmenname (Arbeitgeber)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_representative", label: "Vertretungsberechtigt (HR/GF)", type: "text", required: true, group: "partyA" },
  { key: "partyA_employees", label: "Anzahl Beschäftigte (für KSchG/§17)", type: "select", required: true, group: "partyA",
    options: [
      { value: "kleinbetrieb", label: "≤ 10 (KSchG nicht anwendbar)" },
      { value: "ksch_anwendbar", label: "11–500 (KSchG anwendbar)" },
      { value: "ueber_500", label: "> 500 (Massenentlassung § 17 KSchG prüfen)" }
    ]
  },

  // Arbeitnehmer
  { key: "partyB_name", label: "Vor- und Nachname (Arbeitnehmer)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Anschrift", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_birthdate", label: "Geburtsdatum", type: "date", required: true, group: "partyB" },
  { key: "partyB_position", label: "Position / Funktion", type: "text", required: true, group: "partyB" },
  { key: "partyB_entry", label: "Eintrittsdatum", type: "date", required: true, group: "partyB" },
  { key: "partyB_grundgehalt", label: "Bruttomonatsgehalt", type: "number", required: true, group: "partyB" },

  // Beendigungs-Kontext
  { key: "beendigungsdatum", label: "Vertragsende (Beendigungsdatum)", type: "date", required: true, group: "context" },
  { key: "kuendigungsfrist", label: "Ordentliche Kündigungsfrist (zur Sperrzeit-Vermeidung)", type: "select", required: true, group: "context",
    options: [
      { value: "eingehalten", label: "Eingehalten (ordentliche Frist nach § 622 BGB / Tarif)" },
      { value: "gekuerzt_mit_abfindung", label: "Gekürzt — Abfindung könnte zu Ruhen ALG führen (§ 158 SGB III)" }
    ]
  },
  { key: "beendigungsgrund", label: "Beendigungsgrund (sperrzeit-relevant)", type: "select", required: true, group: "context",
    options: [
      { value: "betrieblich_gedroht", label: "Drohende betriebsbedingte Kündigung des AG (sperrzeitfrei!)" },
      { value: "personenbedingt_krankheit", label: "Personenbedingte Gründe (Krankheit, Leistung)" },
      { value: "verhaltensbedingt", label: "Verhaltensbedingt (vorausgegangene Abmahnung)" },
      { value: "an_eigene_initiative", label: "AN-Initiative (Eigenkündigungs-Konstellation, SPERRZEIT-RISIKO)" },
      { value: "mutual_corporate", label: "Einvernehmlich ohne spezifischen Grund (SPERRZEIT-RISIKO)" }
    ]
  },
  { key: "abfindung_betrag", label: "Abfindungshöhe brutto in EUR", type: "number", required: true, group: "context" },
  { key: "freistellung", label: "Freistellung", type: "select", required: true, group: "context",
    options: [
      { value: "unwiderruflich_bezahlt", label: "Unwiderrufliche bezahlte Freistellung" },
      { value: "widerruflich_bezahlt", label: "Widerrufliche bezahlte Freistellung" },
      { value: "keine", label: "Keine Freistellung" }
    ]
  },
  { key: "wettbewerbsverbot_aktiv", label: "Bestehendes nachvertragliches Wettbewerbsverbot?", type: "select", required: true, group: "context",
    options: [
      { value: "nein", label: "Nein" },
      { value: "ja_bleiben", label: "Ja, bleibt bestehen mit Karenz" },
      { value: "ja_aufheben", label: "Ja, wird im Aufhebungsvertrag aufgehoben" }
    ]
  }
]
```

---

## 5 · Sektionen (Step 3 des Wizards)

> 11 strategische Entscheidungen.

### § 2 — Beendigungsgrund und Sperrzeit-Schutz
- **Key**: `termination_reason`
- **Importance**: critical
- **Beschreibung**: Formulierung des Beendigungsgrundes ist entscheidend für Sperrzeit-Vermeidung beim ALG (BSG B 11a AL 47/05 R). Falsche Formulierung kostet AN bis zu 12 Wochen ALG.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `betriebsbedingt_explizit` | Hinweis auf drohende betriebsbedingte Kündigung des AG | "Zur Vermeidung einer ansonsten ausgesprochenen ordentlichen betriebsbedingten Kündigung wegen Restrukturierung schließen die Parteien folgenden Aufhebungsvertrag." | low | BSG-konform; sperrzeitfrei wenn KSchG § 1a-Range eingehalten + ordentliche Frist + nicht offensichtlich rechtswidrig. | BA prüft trotzdem; Beweis liegt bei AN. | Beide: schriftliche Begründung der drohenden Kündigung beifügen. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `personenbedingt_krankheit` | Hinweis auf personenbedingte Gründe (lange Krankheit) | Bei lang andauernder Erkrankung mit negativer Prognose. | medium | Sperrzeit-Risiko mittel — BA prüft, ob personenbedingte Kündigung tatsächlich rechtmäßig wäre. | Wenn AG die Schwelle für personenbedingte Kündigung nicht erreicht — Sperrzeit. | Ärztl. Bescheinigung beifügen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `keine_begruendung` | Keine Begründung im Vertrag | "Die Parteien beenden das Arbeitsverhältnis im gegenseitigen Einvernehmen." | high | **Hohes Sperrzeit-Risiko** — BA wertet als AN-Mitwirken ohne wichtigen Grund. 12 Wochen Sperre droht. | Standardproblem. | Beide: Sperrzeit-Risiko durch Begründung mindern. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `verhaltensbedingt_drohung` | Hinweis auf drohende verhaltensbedingte / fristlose Kündigung | Bei vorausgegangener Abmahnung oder nachgewiesenem Fehlverhalten. | medium | Sperrzeit kann vermieden werden, aber Eingeständnis = ggf. Auswirkungen auf Bewerbungen. AN-Reputationsrisiko. | Bei späterer Bewerbung problematisch. | AN: stillschweigende Einigung ohne Schuldanerkennung. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `personenbedingt_krankheit`
  - ausgewogen: `betriebsbedingt_explizit`
  - durchsetzungsstark: `betriebsbedingt_explizit`

---

### § 3 — Abfindungshöhe
- **Key**: `severance`
- **Importance**: critical
- **Beschreibung**: KSchG § 1a-Range (0,5 MV/Jahr) ist BA-Standard für sperrzeit-freien Vertrag. Steuerlich: Fünftelregelung § 34 EStG. Seit 2025: nur in Steuererklärung, nicht im Lohnsteuerabzug.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `null_keine_abfindung` | Keine Abfindung | Kein Geldzahlung, nur Freistellung/Zeugnis. | high | **SPERRZEIT-RISIKO hoch** — BSG-Ausnahme greift nicht ohne Abfindung. AN sollte ablehnen. | Standardproblem. | AN: niemals ohne Abfindung unterzeichnen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `ksch_unten_0_25` | 0,25 Monatsverdienste pro Beschäftigungsjahr (KSchG § 1a-Untergrenze) | Untere Grenze des sperrzeit-freien BSG-Range. | medium | Sperrzeit-frei, aber im Markt unterdurchschnittlich. AN-Liquidität gering. | AN: kaum Verhandlungsspielraum. | AN: 0,5 MV/Jahr verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `ksch_standard_0_5` | 0,5 Monatsverdienste pro Jahr (KSchG § 1a-Standard) | "Eine halbe Bruttomonatsvergütung pro vollendetem Beschäftigungsjahr." Häufigster Marktstandard. | low | BSG-konform. Sperrzeit-frei. § 34 EStG-Fünftelregelung anwendbar. | Selten Streit. | Empfohlen Standard. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `verhandelt_1_0_mit_aufschlag` | 1,0 MV/Jahr + Sprinter-Bonus + Klageverzichts-Bonus | Höhere Abfindung mit Anreizen: Sprinter (vorzeitige Beendigung) + zusätzliche Pauschale für Verzicht auf KSchK-Klage. | low | AN-freundlich. Sperrzeit-frei (BSG schaut auf KSchG-Range, höhere Abfindung unschädlich). § 34 EStG-Fünftelregelung. | AG: Kostenfaktor. | AG: bei Senior-/Schlüsselmandanten oft akzeptiert. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `ksch_unten_0_25`
  - ausgewogen: `ksch_standard_0_5`
  - durchsetzungsstark: `verhandelt_1_0_mit_aufschlag`

---

### § 4 — Freistellung
- **Key**: `release`
- **Importance**: high
- **Beschreibung**: Freistellung dient: Urlaubsverbrauch, Karenz für Wettbewerbsverbot, Suchzeit für AN. BAG 9 AZR 4/23: Unwiderrufliche Freistellung mit klarer Urlaubsanrechnung sicherer als nachträgliche Abgeltung.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_freistellung` | Keine Freistellung | AN arbeitet bis zum Beendigungsdatum. | medium | AG-freundlich (Wertschöpfung), aber bei Vertrauensverlust nicht praktikabel. | Bei Misstrauen / Wettbewerbsthemen problematisch. | AG: Freistellung ab Unterschrift. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `widerruflich_bezahlt` | Widerrufliche bezahlte Freistellung | AN ist freigestellt, AG kann Rückkehr verlangen. | medium | AG-Flexibilität. Steuerlich: Lohnzahlung weiter Lohnsteuer + SV (kein Fünftel-Vorteil). Bei Widerruf praktisch selten. | Steuerlich nicht optimal. | Steuerlich besser: unwiderruflich. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `unwiderruflich_mit_urlaubsanrechnung` | Unwiderrufliche bezahlte Freistellung mit Urlaubsanrechnung | "AN wird ab 01.05.2026 unwiderruflich freigestellt. Resturlaub und Überstunden werden in dieser Zeit verbraucht." | low | BAG 9 AZR 4/23-konform; klare Urlaubsabwicklung. AN sucht neuen Job, Karenz für Wettbewerbsverbot tickt. | Selten. | Empfehlung Marktstandard. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `lange_unwiderruflich_mit_outplacement` | Lange unwiderrufliche Freistellung (z.B. 6 Mo) + Outplacement-Budget | AN bis Vertragsende freigestellt, AG-finanzierter Outplacement-Provider. | low | AN-freundlich, sehr werthaltig. AG: hohe Kosten. | Bei Senior-Positionen branchenüblich. | AG: Outplacement-Budget begrenzen (z.B. 5.000 EUR). | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `widerruflich_bezahlt`
  - ausgewogen: `unwiderruflich_mit_urlaubsanrechnung`
  - durchsetzungsstark: `lange_unwiderruflich_mit_outplacement`

---

### § 5 — Zeugnis
- **Key**: `reference`
- **Importance**: high
- **Beschreibung**: § 109 GewO Anspruch auf qualifiziertes Zeugnis. Inhalt + Note müssen wahr und wohlwollend sein. Aufhebungsvertrag fixiert Note + Zwischenzeugnis-Inhalte.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `nur_einfaches_zeugnis` | Einfaches Zeugnis (nur Tätigkeit, keine Bewertung) | Tätigkeitsbeschreibung ohne Leistungs-/Verhaltensbewertung. | high | Wirkt für Bewerbungen sehr negativ — Personaler vermuten Probleme. AN sollte ablehnen. | Ständig negative Einstellungseffekte. | AN: qualifiziertes Zeugnis verlangen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `qualifiziert_befriedigend` | Qualifiziertes Zeugnis mit Note "befriedigend" ("zur Zufriedenheit") | Standard-Default ohne aktive Aufwertung. | medium | "Befriedigend" gilt im Markt als unterdurchschnittlich. BAG: Kläger muss bessere Note beweisen. | AN-Bewerbungs-Nachteil. | AN: "vollste Zufriedenheit" (gut) verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `qualifiziert_gut` | Qualifiziertes Zeugnis mit Note "gut" ("stets vollster Zufriedenheit") + individuelle Wohlwollensformulierungen | Marktstandard; AN-freundlich, AG-üblich. | low | Gut für Bewerbung. | Selten Streit. | Empfehlung Standard. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `sehr_gut_individualisiert` | Sehr gut ("stets in höchstem Maße zur vollsten Zufriedenheit") + individuelle Erfolgs-Hervorhebungen + Bedauerns-Klausel | Top-Note mit individualisierten Stärken; "Wir bedauern sein Ausscheiden außerordentlich." | low | Optimal AN. AG: nur bei tatsächlich überdurchschnittlicher Leistung wahrheitsgemäß. | Wenn AG-Note nicht passt — gerichtlich angreifbar. | Senior-Standard. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `qualifiziert_befriedigend`
  - ausgewogen: `qualifiziert_gut`
  - durchsetzungsstark: `sehr_gut_individualisiert`

---

### § 6 — Urlaub und Überstunden
- **Key**: `vacation_overtime`
- **Importance**: high
- **Beschreibung**: BUrlG § 7 Abs. 4 — Resturlaub bei Beendigung in Geld abzugelten. Bei Freistellung Verbrauch durch Freistellung möglich (BAG 9 AZR 4/23). Bei Überstunden: Vertrag/Tarif/Betriebsvereinbarung prüfen.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `verfall_durch_freistellung` | Resturlaub und Überstunden verbraucht durch Freistellung | "Mit der unwiderruflichen Freistellung ab... gelten Resturlaub und Überstunden als gewährt/ausgeglichen." | low | BAG 9 AZR 4/23-konform bei klarer Regelung. AG-vorteilhaft. | Bei zu kurzer Freistellung — Resturlaub nicht verbrauchbar. | AN: Tage-Berechnung dokumentieren. | sicher: true, ausgewogen: true, durchsetzungsstark: false |
| `abgeltung_in_geld` | Abgeltung Resturlaub + Überstunden mit letztem Lohn | Brutto-Abgeltung mit normalem Lohnsteuerabzug. | low | AN-freundlich, klar dokumentiert. AG: höhere Kosten. | Selten. | AN: Tage-Anzahl präzise. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `gemischt_freistellung_rest_abgegolten` | Hauptverbrauch durch Freistellung, Rest abgegolten | Wenn Freistellung kürzer als Resturlaub — Rest wird zusätzlich abgegolten. | low | Fair, häufig in Praxis. | Berechnung muss präzise sein. | Klarer Berechnungsschlüssel. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `keine_regelung` | Keine ausdrückliche Regelung | Verweis auf gesetzliche Abgeltung. | high | **BAG 9 AZR 384/20: Verfall nur bei AG-Hinweis auf Resturlaub und drohenden Verfall.** Ohne Regelung kann AN später Abgeltung in Geld verlangen — auch nachträglich. | Standardproblem; nachträgliche Klage. | Beide: explizit regeln. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `verfall_durch_freistellung`
  - ausgewogen: `verfall_durch_freistellung`
  - durchsetzungsstark: `abgeltung_in_geld`

---

### § 7 — Wettbewerbsverbot und Nachvertragliche Pflichten
- **Key**: `non_compete`
- **Importance**: high
- **Beschreibung**: § 74 HGB: nachvertr. Wettbewerbsverbot nur mit Karenz min. 50 % wirksam. Aufhebungsvertrag häufig Anlass zur Aufhebung gegen Pauschale.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `wettbewerbsverbot_bleibt_mit_karenz` | Bestehendes Wettbewerbsverbot bleibt mit Karenzentschädigung | Karenz wird über Vertragsende hinaus monatlich gezahlt (50 % der zuletzt bezogenen Leistungen). | low | § 74 HGB-konform; AG schützt Marktposition, AN bekommt Karenz. | AG: hohe Folgekosten. | AG: Anrechnung anderweitiger Verdienste (§ 74c HGB). | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `wettbewerbsverbot_aufgehoben_in_aufhebungsvertrag` | Bestehendes Wettbewerbsverbot wird im Aufhebungsvertrag aufgehoben | Beide Parteien einigen sich: Wettbewerbsverbot entfällt, AN frei für Konkurrenztätigkeit. | low | AN-vorteilhaft (volle berufliche Freiheit). AG-Schutz fällt weg. | AG: Marktinformations-Risiko. | AG: NDA / Verschwiegenheits-Klausel verstärken. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `kundenschutz_12mon_ohne_karenz` | Kein volles Wettbewerbsverbot, aber 12 Monate Kundenschutz | AN darf für Wettbewerber arbeiten, aber 12 Monate keine AG-Kunden aktiv abwerben. Keine Karenz (nicht zwingend nach § 74 HGB-Logik bei AN, der Selbstständigkeits-Gestaltung wählt). | medium | Bei AN-Kündigung wirksam, aber Schwelle eng. Bei "voll-AN" sollte Karenz angeboten werden. | Bei Streit zur Wirksamkeit. | Beide: präzise Reichweite definieren. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `keine_klausel` | Keine nachvertraglichen Wettbewerbs- oder Kundenschutz-Pflichten | Keine Einschränkung; nur gesetzliche Treuepflicht endet mit Vertrag. | low | AN frei. AG-Risiko: bei Schlüsselpositionen Marktverlust. | Bei Wettbewerb-sensitiven Positionen problematisch. | AG: NDA verstärken oder Wettbewerbsverbot vereinbaren. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `wettbewerbsverbot_bleibt_mit_karenz`
  - ausgewogen: `kundenschutz_12mon_ohne_karenz`
  - durchsetzungsstark: `wettbewerbsverbot_aufgehoben_in_aufhebungsvertrag`

---

### § 8 — Verschwiegenheit nach Beendigung
- **Key**: `confidentiality`
- **Importance**: high
- **Beschreibung**: BAG 8 AZR 172/23 (17.10.2024): pauschale "Catch-All"-Klauseln über Betriebsgeheimnisse unwirksam. Konkrete Geschäftsgeheimnisse benennen (GeschGehG).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_GeschGehG` | Verweis auf gesetzliche Verschwiegenheitspflicht (GeschGehG) | "AN hält gesetzlich geschützte Geschäftsgeheimnisse weiter geheim." | medium | GeschGehG-Schutz nur bei "angemessenen Maßnahmen" des AG. Wenig konkrete Pflicht. | AG: Schutz unklar. | AG: konkretisieren. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `konkret_aufgelistete_geheimnisse` | Konkret aufgelistete Geschäftsgeheimnisse, 5 Jahre nachvertraglich | "AN verpflichtet sich, folgende Geschäftsgeheimnisse 5 Jahre nach Beendigung nicht zu offenbaren: [Liste der konkret benannten Geheimnisse]." | low | BAG 8 AZR 172/23-konform. Wirksam und durchsetzbar. | Selten Streit. | Empfohlen Marktstandard. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `pauschal_alles_unbefristet` | Pauschal alle "Geschäftsgeheimnisse" unbefristet | Catch-All-Klausel ohne Konkretisierung. | high | **Unwirksam** nach BAG 8 AZR 172/23. Klausel kippt; gesetzlicher Schutz reduziert. | Klausel unwirksam, AG-Schutz weg. | AG: konkretisieren statt pauschalisieren. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `streng_mit_strafe_3jahre` | Konkret aufgelistet + Vertragsstrafe 25.000 EUR pro Verstoß, 3 Jahre | Verstärkter Schutz mit Strafabschreckung. § 343 BGB-Reduktion möglich, aber 25.000 EUR meist verhältnismäßig. | medium | Wirksam bei verhältnismäßiger Höhe. | Bei Verstoß: hoher AN-Schaden. | AN: Strafe auf vorsätzliche/grobfahrlässige Verstöße begrenzen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `streng_mit_strafe_3jahre`
  - ausgewogen: `konkret_aufgelistete_geheimnisse`
  - durchsetzungsstark: `gesetzlich_GeschGehG`

---

### § 9 — Betriebliche Altersversorgung (bAV)
- **Key**: `pension`
- **Importance**: medium
- **Beschreibung**: BetrAVG § 1b — bei Beendigung ab 3 Jahren bAV-Zugehörigkeit + Mindestalter 21 = unverfallbare Anwartschaft. Im Aufhebungsvertrag adressieren, sonst Streit.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_regelung` | Keine ausdrückliche Regelung | Verweis auf gesetzliche Anwartschaft. | medium | Streitanfällig — AN kann später unklare Ansprüche geltend machen. | Bei Beendigung mit aktiver bAV. | Beide: dokumentieren. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `unverfallbare_anwartschaft_dokumentiert` | Unverfallbare Anwartschaft dokumentiert + Übertragungsoption (§ 4 BetrAVG) | Höhe Anwartschaft, Versorgungsträger, Übertragungsrechte aufgeführt. | low | Klar, fair. | Selten. | Empfehlung. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `abfindung_anwartschaft` | Anwartschaft wird durch Abfindung ausgeglichen | AG zahlt zusätzliche Pauschale, AN verzichtet auf Anwartschaft. § 3 BetrAVG: nur bei "kleinen" Anwartschaften (≤ 1 % der Bezugsgröße/Monat) möglich. | high | **Verzicht auf bAV nur engumzonten zulässig** (§ 3 BetrAVG). Bei höheren Anwartschaften unwirksam, AN behält Anspruch trotz Klausel. | Klausel unwirksam bei größerer Anwartschaft. | Bei kleinen Anwartschaften praktisch. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `mit_AG_zuschuss_uebertragung` | Übertragung auf neuen AG/private Police mit AG-Zuschuss | AG unterstützt Übertragung mit Zuschuss (z.B. 1 Jahresbeitrag). | low | AN-freundlich; bAV-Erhalt + Bonus. | AG-Kosten. | Bei Senior-Mandanten branchenüblich. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `abfindung_anwartschaft`
  - ausgewogen: `unverfallbare_anwartschaft_dokumentiert`
  - durchsetzungsstark: `mit_AG_zuschuss_uebertragung`

---

### § 10 — Generalquittung und Erledigungsklausel
- **Key**: `general_release`
- **Importance**: high
- **Beschreibung**: Zentral für Beendigungsabsicherung. AG will: keine Nachforderungen. AN will: alle Ansprüche bezahlt. BAG-Rechtsprechung: weite Generalquittung wirksam, aber bestimmte Ansprüche (Lohnsteuer, SV) nicht erfasst.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_klausel` | Keine Generalquittung | Beidseitig nur, was im Vertrag steht. | high | Streitrisiko hoch — Folgeforderungen (Boni, Provisionen, Überstunden) nachträglich möglich. | Standardproblem. | Beide: Klausel ergänzen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `ag_einseitig` | AG-einseitige Erledigungsklausel | "Mit Erfüllung dieses Vertrages sind alle Ansprüche des AN gegen AG abgegolten, gleich welchen Rechtsgrundes." | medium | AG-vorteilhaft, aber bei AGB **AGB-Inhaltskontrolle** möglich (§ 305 BGB). § 309 Nr. 14 BGB: Verzicht auf bestehende Ansprüche bedarf Prüfung. | AN-Klage auf nachträgliche Boni etc. | AN: gegenseitige Klausel. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `gegenseitig` | Beidseitige Generalquittung | "Mit Erfüllung dieses Vertrages sind alle gegenseitigen Ansprüche aus dem Arbeitsverhältnis erledigt — ausgenommen unverfallbare bAV-Anwartschaften, gesetzliche und tarifliche Ansprüche, die nicht abdingbar sind." | low | Marktüblich, fair. Ausnahmeklausel schützt vor Unwirksamkeit. | Selten. | Empfohlener Standard. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `mit_einzelnen_offenen_punkten` | Generalquittung + Liste explizit offener Punkte | "Erledigung erfolgt mit Ausnahme: ausstehende Provision Q1/2026, Bonus 2025, ggf. Steuerbescheid 2026." | low | Klar, präzise; verhindert spätere Streitigkeiten. | Verwaltungsaufwand. | Bei größeren Mandaten Standard. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `ag_einseitig`
  - ausgewogen: `gegenseitig`
  - durchsetzungsstark: `gegenseitig`

---

### § 11 — Rückgabe Arbeitsmittel und Schlussbestimmungen
- **Key**: `return_final`
- **Importance**: medium
- **Beschreibung**: Rückgabe von Laptop, Handy, Schlüsseln, Kreditkarten, Akten, Dienstwagen — präzise Liste mit Rückgabedatum. Schriftform für Änderungen. Salvatorische Klausel.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `liste_rueckgabe_letzter_arbeitstag` | Liste der Arbeitsmittel + Rückgabe am letzten Arbeitstag | Konkrete Liste (Laptop S/N, Handy IMEI, Schlüssel, Kreditkarten), Rückgabe gegen Bestätigung. | low | Klar, dokumentationssicher. | Bei fehlenden Items ggf. Schadensersatz. | Beide: Liste vorab abstimmen. | sicher: true, ausgewogen: true, durchsetzungsstark: true |
| `keine_regelung` | Keine Regelung | Allgemeine Rückgabeverpflichtung aus Treuepflicht. | medium | Streitrisiko bei vergessenen Items. | Bei Streit über Verschulden. | Liste ergänzen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `rueckgabe_innerhalb_30_tage_nach_freistellung` | Rückgabe innerhalb 30 Tage nach Freistellung | Bei langer Freistellung praktisch — AN gibt Items am Ende der Freistellung zurück. | low | Praxistauglich. | Bei AN-Verzug Schadensersatz. | Standard für lange Freistellung. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `dienstwagen_uebernahme_an_an` | Dienstwagen wird AN zum Buchwert / kostenlos überlassen | Bonus für Senior-AN; AN kauft/erhält Dienstwagen. | low | Bonus-Charakter; steuerlich als geldwerter Vorteil zu berücksichtigen. | Steuerliche Auswirkungen prüfen. | Senior-Manager-Bonus. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `liste_rueckgabe_letzter_arbeitstag`
  - ausgewogen: `liste_rueckgabe_letzter_arbeitstag`
  - durchsetzungsstark: `rueckgabe_innerhalb_30_tage_nach_freistellung`

---

## 6 · Anwaltsperspektive — kritische Hinweise

1. **Schriftform zwingend** (§ 623 BGB) — keine E-Mail, kein Fax, keine elektronische Signatur. Nur eigenhändige Unterschrift beider Parteien. Verstoß = Vertrag nichtig.
2. **Kein Widerrufsrecht für Aufhebungsvertrag** (§ 312 Abs. 1 Nr. 1 BGB). Anders als bei Kündigung — einmal unterschrieben gilt. AN-Schutz nur über § 119, § 123 BGB-Anfechtung oder "Gebot fairen Verhandelns" (BAG 6 AZR 75/18).
3. **"Gebot fairen Verhandelns"** (BAG 6 AZR 75/18 vom 07.02.2019, bestätigt 6 AZR 333/21 vom 24.02.2022) — Schwelle für Unwirksamkeit hoch. Reine Druck-Verhandlung ("sofortige Annahme oder Kündigung") allein reicht nicht; es muss zusätzliche unfaire Methode hinzukommen (psychische Drucksituation, Tür-und-Angel ohne Vorwarnung, Ausnutzen Krankheit).
4. **Sperrzeit-Vermeidung Pflichtprogramm** (BSG B 11a AL 47/05 R, 12.07.2006):
   - Hinweis auf drohende rechtmäßige betriebsbedingte Kündigung des AG,
   - Einhaltung ordentlicher Kündigungsfrist,
   - Abfindung im KSchG § 1a-Range (0,25–0,5 MV/Jahr),
   - keine offensichtlich rechtswidrige Konstruktion.
   Ohne diese Voraussetzungen droht 12 Wochen Sperrzeit ALG.
5. **Ruhen ALG bei gekürzter Frist** (§ 158 SGB III) — wenn Aufhebungsvertrag ordentliche Kündigungsfrist verkürzt, ruht ALG bis hypothetisches Frist-Ende (max. 1 Jahr).
6. **Fünftelregelung 2025-Änderung** — AG wendet § 34 EStG nicht mehr automatisch im Lohnsteuerabzug an. AN muss in Steuererklärung beantragen → Liquiditätsnachteil bis Steuerbescheid. Im Vertrag transparent kommunizieren.
7. **Wettbewerbsverbot ohne Karenz nichtig** (§ 74 HGB). Karenz min. 50 % der vor Ausscheiden bezogenen Leistungen; max. 2 Jahre; Schriftform; Aushändigung. Einseitige AN-Bindung ohne Karenz → AN kann sich aussuchen, ob er sich bindet (Wahlrecht).
8. **Pauschale Verschwiegenheits-Klauseln unwirksam** (BAG 8 AZR 172/23 vom 17.10.2024). Konkrete Geschäftsgeheimnisse benennen + zeitliche Begrenzung (3–5 Jahre).
9. **Urlaubsabgeltung BAG-konform regeln** (BAG 9 AZR 4/23, 9 AZR 384/20) — AG-Hinweispflicht auf Resturlaub und drohenden Verfall. Ohne Hinweis kein Verfall, AN kann Geld-Abgeltung nachträglich verlangen.
10. **bAV-Anwartschaft adressieren** (BetrAVG § 1b) — Verzicht nur bei "kleinen" Anwartschaften (§ 3 BetrAVG) wirksam. Bei größeren: Anwartschaft bleibt trotz Verzichtserklärung.
11. **Generalquittung gegenseitig + Ausnahmen** — bei einseitiger AGB-Klausel Inhaltskontrollerisiko (§ 309 Nr. 14 BGB). Tarifliche, gesetzliche, unverfallbare bAV-Ansprüche immer ausnehmen.
12. **Massenentlassungsanzeige § 17 KSchG** — Aufhebungsverträge zählen mit (EuGH C-188/03 Junk), wenn AG-Initiative. Bei Schwellenüberschreitung Pflicht zur Anzeige bei Agentur für Arbeit.
13. **AGG-Konformität** — keine altersdiskriminierenden Abfindungsstaffeln außerhalb Sozialplan-Privilegien (§ 10 Nr. 6 AGG).
14. **Anfechtung bei widerrechtlicher Drohung** — nur wenn AG-Drohung mit fristloser Kündigung haltlos war (BAG 2 AZR 124/14). Bei begründetem Verdacht der Pflichtverletzung kein Anfechtungsgrund.
15. **Beratungspflicht des AG** bei Aufhebungsverträgen umstritten — keine generelle Aufklärungspflicht über Sperrzeit/Steuer, aber bei konkreter Frage muss wahr geantwortet werden. AN sollte vor Unterschrift Anwalt/Steuerberater konsultieren.

---

## 7 · Quellen

- BAG vom 07.02.2019 — 6 AZR 75/18 (Grundsatz "Gebot fairen Verhandelns")
- BAG vom 24.02.2022 — 6 AZR 333/21 (Bestätigung Faires Verhandeln, Schwelle hoch)
- BAG vom 17.10.2024 — 8 AZR 172/23 (Catch-All-Verschwiegenheitsklausel unwirksam)
- BAG vom 11.07.2023 — 9 AZR 4/23 (Urlaubsabgeltung Freistellung)
- BAG vom 27.04.2021 — 9 AZR 384/20 (Urlaubsverfall nur bei AG-Hinweis)
- BAG vom 14.09.2021 — 9 AZR 8/21 (Schadensersatz nicht genommener Urlaub)
- BAG vom 22.10.2015 — 2 AZR 124/14 (Drohung fristloser Kündigung — Anfechtung)
- BSG vom 12.07.2006 — B 11a AL 47/05 R (Sperrzeit-Ausnahme bei drohender betriebsbedingter Kündigung)
- BFH vom 12.04.2022 — VI R 22/19 (Fünftelregelung Teilzahlungen)
- EuGH vom 27.01.2005 — C-188/03 (Junk — Massenentlassungsanzeige Aufhebungsverträge)
- BGB § 623 (Schriftform Beendigung)
- BGB §§ 119, 123, 121, 124 (Anfechtung)
- BGB §§ 280, 311 Abs. 2, 241 Abs. 2 ("Gebot fairen Verhandelns")
- BGB § 312 Abs. 1 Nr. 1 (kein Widerrufsrecht)
- KSchG § 1a (Abfindung 0,5 MV/Jahr)
- KSchG § 17 (Massenentlassungsanzeige)
- SGB III § 158 (Ruhen ALG)
- SGB III § 159 Abs. 1 Nr. 1 (Sperrzeit 12 Wochen)
- EStG § 34 Abs. 1, § 24 Nr. 1 (Fünftelregelung; Änderung 2025: Beantragung in Steuererklärung)
- GewO § 109 (Zeugnisanspruch)
- HGB §§ 74-75d (Wettbewerbsverbot, Karenz)
- BetrAVG §§ 1b, 3, 4 (Unverfallbare Anwartschaft, Verzicht, Übertragung)
- BUrlG § 7 Abs. 4 (Urlaubsabgeltung)
- AGG §§ 3, 7, 10 Nr. 6 (Diskriminierungsverbot, Sozialplan-Privileg)
- BetrVG § 102 (BR-Anhörung)
- GeschGehG (Schutz Geschäftsgeheimnisse)
- [BAG 6 AZR 333/21 — Bundesarbeitsgericht](https://www.bundesarbeitsgericht.de/entscheidung/6-azr-333-21/)
- [Aufhebungsvertrag — Faires Verhandeln (BAG)](https://www.bundesarbeitsgericht.de/presse/aufhebungsvertrag-gebot-fairen-verhandelns/)
- [BAG 6 AZR 75/18 — dejure.org](https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BAG&Datum=07.02.2019&Aktenzeichen=6+AZR+75/18)
- [BSG B 11a AL 47/05 R — dejure.org](https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BSG&Datum=12.07.2006&Aktenzeichen=B+11a+AL+47/05+R)
- [Aufhebungsvertrag und Sperrzeit (Hensche Arbeitsrecht)](https://www.hensche.de/Rechtsanwalt_Arbeitsrecht_Handbuch_Aufhebungsvertrag_und_Sperrzeit.html)
- [Aufhebungsvertrag — Drohung Anfechtung (LTO)](https://www.lto.de/recht/hintergruende/h/bag-urteil-6azr33321-drohung-aufhebungsvertrag-anfechung-gebot-faires-verhandeln-arbeitsrecht)
- [Faires Verhandeln (Luther)](https://www.luther-lawfirm.com/en/newsroom/blog/detail?tx_fwluther_shownews%5Baction%5D=show&tx_fwluther_shownews%5Bcontroller%5D=News&tx_fwluther_shownews%5Bnews%5D=9114&cHash=043e408d829843213c162339ff0c8004)
- [Abfindung Fünftelregelung 2025 (Deutschland-Rechner)](https://www.deutschland-rechner.de/abfindung-rechner)
- [Aufhebungsvertrag ohne Sperrzeit (Arbeitsrecht Siegen)](https://www.arbeitsrechtsiegen.de/artikel/aufhebungsvertrag-ohne-sperrzeit/)
- [Anfechtung Aufhebungsvertrag (Arbeitsrecht Siegen)](https://www.arbeitsrechtsiegen.de/artikel/anfechtung-aufhebungsvertrag-arglistige-taeuschung-widerrechtliche-drohung/)
- [Abfindung bei Aufhebungsvertrag (Fachanwalt.de)](https://www.fachanwalt.de/magazin/arbeitsrecht/abfindung-bei-aufhebungsvertrag)
- Stand: 29.04.2026

# Werkvertrag — Playbook-Konzept

> Recherchedokument im Sinne des `PLAYBOOK-MASTERPLAN.md` (Sektion 8). Vorbereitet die Code-Umsetzung in `backend/playbooks/werkvertrag.js`.

## Metadaten
- **Slug**: `werkvertrag`
- **Title**: Werkvertrag (BGB §§ 631-651)
- **Description**: Vertrag über die Herstellung eines konkreten Werkes (z.B. Bau, Anlage, Studie, Gewerk) — geschuldet ist der Erfolg, nicht die Tätigkeit. Mit Abnahme, Mängelrechten, Vergütungsfälligkeit und Sicherheiten.
- **Difficulty**: komplex
- **Estimated Time**: 12–18 Minuten
- **Icon**: `hammer`
- **Legal Basis**: BGB §§ 631-651 (allgemeines Werkvertragsrecht); §§ 650a-h (Bauvertrag, in Kraft seit 01.01.2018); §§ 650i-n (Verbraucherbauvertrag); §§ 650p-t (Architekten-/Ingenieurvertrag); §§ 650u-v (Bauträgervertrag); VOB/B (optional, Allgemeine Vertragsbedingungen für Bauleistungen, DIN 1961); SchwarzArbG (§ 1 — Nichtigkeit von Schwarzarbeit-Verträgen); ProdHaftG; UStG (§ 13b Reverse Charge).

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze und Abgrenzungen

- **BGB § 631 Abs. 1**: Durch den Werkvertrag wird der Unternehmer (UN) zur Herstellung des versprochenen **Werkes** verpflichtet, der Besteller (BE) zur Entrichtung der **vergüteten Leistung**. Geschuldet ist ein **Erfolg** (≠ Dienstvertrag, der die Tätigkeit schuldet).
- **BGB § 631 Abs. 2**: Werk kann körperlich (Bauwerk, Maschine) oder unkörperlich (Studie, Gutachten, Software-Erstellung mit Erfolgscharakter) sein.
- **Abgrenzung Werkvertrag / Dienstvertrag**: Bei Streit prüfen Gerichte stets die **tatsächliche Vertragsdurchführung** (BAG vom 18.01.2012 — 7 AZR 723/10). Ein Etikett "Werkvertrag" allein hilft nicht, wenn faktisch nur Stundenleistung ohne Erfolgsmaßstab erbracht wird.
- **BGB § 632a** (Abschlagszahlungen): UN kann für vertragsgemäß erbrachte Leistungen Abschlagszahlungen verlangen.
- **BGB § 640** (Abnahme): Der BE ist verpflichtet, das vertragsgemäß hergestellte Werk **abzunehmen**, sofern nicht nach Beschaffenheit ausgeschlossen. Die Abnahme ist **DAS** zentrale Ereignis im Werkvertragsrecht — sie löst aus:
  1. Fälligkeit der Vergütung (§ 641 Abs. 1)
  2. Übergang der Beweislast für Mängel (vor Abnahme: UN beweispflichtig, nach Abnahme: BE)
  3. Beginn der Verjährung der Mängelrechte (§ 634a)
  4. Übergang der Leistungsgefahr (§ 644)
- **BGB § 640 Abs. 2** (fiktive Abnahme): Verweigert der BE die Abnahme nach Setzung einer angemessenen Frist trotz Pflicht zur Abnahme, gilt das Werk als abgenommen. Bei Verbrauchern zusätzlich Hinweispflicht des UN auf Folge.
- **BGB § 634** (Mängelrechte): Bei mangelhaftem Werk hat der BE: Nacherfüllung (§ 635) → Selbstvornahme (§ 637) → Rücktritt/Minderung (§§ 638, 323) → Schadens-/Aufwendungsersatz (§§ 280, 281, 284).
- **BGB § 634a** (Verjährung): 2 Jahre bei Werken an einer Sache; **5 Jahre bei Bauwerken** und Werken, deren Erfolg in der Erbringung von Planungs-/Überwachungsleistungen für ein Bauwerk besteht. Beginn mit Abnahme.
- **BGB § 645** (Mitverantwortung des BE): Wird das Werk durch einen vom BE gelieferten Stoff oder eine vom BE erteilte Anweisung unausführbar / mangelhaft, behält UN Vergütungsanspruch (sofern UN Bedenken angemeldet hat).
- **BGB § 648** (freie Kündigung durch BE): BE kann den Vertrag jederzeit bis zur Vollendung kündigen. UN behält dann Anspruch auf vereinbarte Vergütung **abzüglich ersparter Aufwendungen / böswillig unterlassenen anderweitigen Erwerbs**. Vermutung: 5 % der vereinbarten Vergütung gelten als nicht erbracht (UN-Beweisrisiko reduziert).
- **BGB § 648a** (außerordentliche Kündigung aus wichtigem Grund): Beide Parteien können bei wichtigem Grund kündigen. Schriftform zwingend (§ 648a Abs. 5).
- **BGB §§ 650a-h** (Bauvertrag — Sondernormen seit 01.01.2018): Nur bei Bauvertrag (Herstellung/Wiederherstellung/Umbau eines Bauwerks). Einschließlich Anordnungsrecht des BE (§ 650b), Mehrvergütung (§ 650c), Zustandsfeststellung (§ 650g), Schlussrechnung (§ 650g Abs. 4), Schriftform-Kündigung (§ 650h).
- **BGB § 650f** (Bauhandwerkersicherung): UN kann vom BE **Sicherheit** in Höhe seines Vergütungsanspruchs (zzgl. Nebenforderungen, pauschal 10 %) verlangen. Höchst praxisrelevant! Bei Verweigerung kann UN Leistung verweigern oder kündigen (§ 650f Abs. 5) — Vergütungsanspruch bleibt bestehen.
- **BGB §§ 650i-n** (Verbraucherbauvertrag): Wenn ein Verbraucher den UN beauftragt, **ein neues Gebäude zu bauen oder erhebliche Umbaumaßnahmen** durchzuführen. Pflichten: Textform (§ 650i Abs. 2), Baubeschreibung (§ 650j), Widerrufsrecht 14 Tage (§ 650l), Zahlungsplan-Begrenzung max. 90 % vor Abnahme (§ 650m), Unterlagenherausgabe-Pflicht (§ 650n). § 650f Bauhandwerkersicherung gilt **nicht** beim Verbraucherbauvertrag (§ 650f Abs. 6 Nr. 2).
- **VOB/B**: Standardvertragsbedingungen für Bauleistungen, **kein Gesetz**. Geltung muss vereinbart werden. VOB/B führt eigene Mängelrechte (§ 13 VOB/B), kürzere Verjährung (4 Jahre bei Bauwerken statt 5 Jahre BGB), abweichende Abnahmeregelungen (§ 12 VOB/B). Bei B2C-Verbrauchern: VOB/B als Ganzes muss einbezogen werden, sonst AGB-Inhaltskontrolle (BGH NJW 2008, 2106).
- **SchwarzArbG § 1 Abs. 2**: Bei "Ohne-Rechnung-Abrede" / Steuerhinterziehungs-Absicht ist der Werkvertrag **nichtig** (§ 134 BGB). UN hat **keinen Vergütungsanspruch**, BE keinen Mängelanspruch — auch nicht wirtschaftlich (BGH vom 10.04.2014 — VII ZR 241/13; BGH NJW 2013, 3167).

### 1.2 Aktuelle Rechtsprechung (2022–2026)

- **BGH vom 27.11.2025 — VII ZR 112/24** (Vorteilsausgleich "neu für alt"): Bei Mängelbeseitigung im Werkvertragsrecht ist regelmäßig **kein Abzug "neu für alt"** vorzunehmen, auch wenn der BE das Werk jahrelang mangelfrei genutzt hat. Begründung: Mängelrecht unterscheidet nicht, ob Mangel bei oder kurz nach Abnahme erkannt wird. Ausnahme: Sowieso-Kosten bleiben kürzbar.
- **BGH vom 22.08.2024 — VII ZR 68/22**: Eine erklärte **Minderung der Vergütung sperrt nicht den Anspruch auf Kostenvorschuss zur Selbstvornahme** (§ 637 BGB). Beide Rechte können nebeneinander geltend gemacht werden.
- **BGH vom 09.11.2023 — VII ZR 241/22**: Klarstellung zur Bauhandwerkersicherung — Anspruch besteht auch nach Kündigung des Bauvertrags fort. Zur Höhe genügt schlüssiger UN-Vortrag.
- **BGH vom 23.05.2024** (Verbraucherbauvertrag): Bei sukzessiver Einzelgewerk-Beauftragung **kein** Verbraucherbauvertrag i.S.v. § 650i BGB, sondern jeweils einzelne (Bau-)Werkverträge. Folge: Kein Widerrufsrecht nach § 650l BGB, dafür ggf. § 650f-Sicherung möglich.
- **BGH vom 19.01.2017 — VII ZR 301/13** (Kostenvorschuss): Ständige Rechtsprechung — BE darf Kostenvorschuss in Höhe der voraussichtlichen Mängelbeseitigungskosten verlangen, auch wenn er selbst (noch) nicht beseitigt hat.
- **BGH vom 10.04.2014 — VII ZR 241/13** (Schwarzarbeit): Vertrag mit Schwarzgeldabrede **vollständig nichtig**, weder Vergütungs- noch Mängelansprüche, weder bereicherungsrechtliche Rückforderung des bereits Gezahlten.
- **BGH vom 26.01.2017 — VII ZR 174/16**: Fiktive Mängelbeseitigungskosten als Schadensersatz beim Werkvertrag **nicht mehr** zulässig — Schaden muss konkret nachgewiesen werden (Wendepunkt-Urteil).
- **BGH vom 25.02.2021 — VII ZR 49/19**: Bei VOB/B-Bauvertrag mit Verbraucher: VOB/B-Klauseln unterliegen AGB-Kontrolle (§§ 305 ff. BGB), wenn sie nicht "als Ganzes" einbezogen sind oder Verbraucher nicht zumutbar zur Kenntnis nehmen konnte.
- **BGH vom 20.08.2009 — VII ZR 212/07**: Pauschalpreisvertrag — Mehrleistungen über Leistungsverzeichnis hinaus sind grundsätzlich nicht zusätzlich zu vergüten, außer bei wesentlicher Veränderung des Bausolls.

### 1.3 Pflichthinweise und Risiken

1. **Schwarzarbeit / Ohne-Rechnung-Abrede vermeiden** — Vertrag und alle Ansprüche werden vollständig nichtig (BGH VII ZR 241/13). Auch teilweise Schwarzarbeit kann Gesamtnichtigkeit auslösen.
2. **Abnahme schriftlich dokumentieren** — Datum, Mängelvorbehalt, anwesende Personen, Übergabeprotokoll. Fiktive Abnahme nach § 640 Abs. 2 nur mit Fristsetzung + (bei B2C) Hinweis auf Folgen.
3. **Verbraucherbauvertrag erkennen** — Bei Neubau/erheblichem Umbau für Verbraucher zwingend Textform, Baubeschreibung, Widerrufsbelehrung. Fehlende Belehrung verlängert Widerrufsfrist auf 1 Jahr + 14 Tage (§ 356e BGB).
4. **Bauhandwerkersicherung (§ 650f) frühzeitig fordern** — Schutz vor BE-Insolvenz. Höhe: vereinbarte Vergütung + 10 % Pauschale für Nebenforderungen. Frist setzen, bei Nichtleistung: Leistung verweigern oder kündigen mit voller Vergütung.
5. **Bedenkenanmeldung dokumentieren** — Bei vom BE vorgegebenen Materialien/Anweisungen: schriftliche Bedenken gegen Eignung. Sonst Mit-Verschuldensvorwurf bei Mangel (§ 645 BGB greift nur bei rechtzeitiger Anmeldung).
6. **VOB/B nur einbeziehen, wenn beide Seiten sie kennen** — Bei Privatkunden Vorrang BGB. Bei B2B möglich, aber Vertragstext muss VOB/B "als Ganzes" einbeziehen.
7. **Fiktive Mängelbeseitigungskosten nicht mehr abrechenbar** (BGH VII ZR 174/16) — Schadensersatz nur bei konkreter Beseitigung oder Vermögensbilanzierung.
8. **Verjährung beachten** — 5 Jahre Bauwerk, 2 Jahre sonstige Werke. Bei vorsätzlicher Mängel-Verschweigung 30 Jahre (§ 195, § 199 BGB).

### 1.4 Vergütungsmodelle im Werkvertragsrecht (Übersicht)

| Modell | Wesen | Risiko BE | Risiko UN | Typische Anwendung |
|--------|-------|-----------|-----------|--------------------|
| **Pauschalpreis (Festpreis)** | Globalpauschale für definiertes Werk | hoch (bei Mehrleistungen) | hoch (bei Kalkulationsfehler) | Komplette Werke mit klarer Leistungsbeschreibung |
| **Detail-Pauschalpreis** | Pauschale auf Basis detailliertes LV | gering | mittel (Massenvermehrung selbst zu tragen) | Bauleistungen mit präziser Planung |
| **Einheitspreisvertrag** | Mengen × Einheitspreise, Aufmaß | gering bei sauberer Aufnahme | gering | VOB-Bau, Tiefbau |
| **Stundenlohnvertrag (cost plus)** | Aufwand + Material | hoch (offen) | gering | Reparaturen, kleine Gewerke, unklare Vorab-Massen |
| **GMP (Garantierter Maximalpreis)** | Cost-Plus mit Deckel + Bonus/Malus | mittel | mittel | Großprojekte, Generalunternehmer |

---

## 2 · Rollen-Definition

- **Rolle A — Besteller (BE)**: Auftraggeber des Werkes (Privater Bauherr, gewerblicher Bauträger, Industriekunde, Forschungsauftraggeber). Will: vertragsgemäßes Werk, Termintreue, klarer Festpreis, Mängelfreiheit, Schutz vor Abschlagsforderungen ohne Gegenleistung.
- **Rolle B — Unternehmer (UN)**: Hersteller des Werkes (Handwerker, Bauunternehmen, Ingenieurbüro, IT-Werkschuldner). Will: faire Vergütung, planbare Abnahme, Bauhandwerkersicherung, kalkulierbares Mängelrisiko, Schutz bei BE-Mitverschulden.

---

## 3 · Modi-Bedeutung (vertragsspezifisch)

- **Sicher** → **Pro Besteller**: Strikter Pauschalpreis ohne Nachträge, klare Abnahmekriterien mit BE-Genehmigungspflicht, lange Verjährung Mängel, hohe Sicherheitsleistung des UN (Erfüllungs-/Gewährleistungsbürgschaft 5–10 %), keine Abschlagszahlungen ohne Teilabnahme, Schwarzarbeit-Verbotsklausel, Vertragsstrafe bei Verzug. Ziel: Maximaler Schutz vor Mehrkosten, Bauverzögerung, Mängeln.
- **Ausgewogen** → **Marktstandard**: Detail-Pauschal- oder Einheitspreisvertrag, BGB-Standard-Mängelrechte, branchenübliche Abschlagszahlungen (§ 632a), gegenseitige Sicherheiten ausgewogen (UN: 5 % Gewährleistungsbürgschaft / BE: § 650f Sicherung 10 %), Schriftliches Abnahmeprotokoll, übliche Verzugspauschalen.
- **Durchsetzungsstark** → **Pro Unternehmer**: Stundenlohn oder Pauschal mit Anpassungsklausel, § 650f-Sicherung sofort fällig, Abschlagszahlungen nach Baufortschritt + Schlusszahlung 14 Tage, fiktive Abnahme nach 12 Werktagen ohne Mängelrüge, beschränkte Mängelrechte (Vorrang Nacherfüllung), Verzug nur bei UN-Verschulden, Haftungsbegrenzung auf Auftragsvolumen.

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Besteller
  { key: "partyA_name", label: "Name / Firma (Besteller / Auftraggeber)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Anschrift", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_representative", label: "Vertretungsberechtigt", type: "text", required: false, group: "partyA" },
  { key: "partyA_role", label: "Rolle des Bestellers", type: "select", required: true, group: "partyA",
    options: [
      { value: "verbraucher", label: "Verbraucher (privater Bauherr) — § 13 BGB, Verbraucherschutz aktiv!" },
      { value: "unternehmer", label: "Unternehmer (B2B)" },
      { value: "oeffentlicher_ag", label: "Öffentlicher Auftraggeber (VOB-Pflicht prüfen!)" }
    ]
  },

  // Unternehmer
  { key: "partyB_name", label: "Name / Firma (Unternehmer / Auftragnehmer)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Geschäftsanschrift", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_taxNumber", label: "USt-IdNr. / Steuernummer", type: "text", required: true, group: "partyB" },
  { key: "partyB_legalForm", label: "Rechtsform", type: "select", required: true, group: "partyB",
    options: [
      { value: "einzelunternehmer", label: "Einzelunternehmer / Handwerksbetrieb" },
      { value: "gmbh", label: "GmbH / UG" },
      { value: "ag", label: "AG / SE" },
      { value: "gbr_ohg_kg", label: "GbR / OHG / KG" }
    ]
  },
  { key: "partyB_handwerksrolle", label: "Eintragung Handwerksrolle / Industriereg.", type: "text", required: false, group: "partyB" },

  // Vertragskontext
  { key: "werk_typ", label: "Art des Werkes", type: "select", required: true, group: "context",
    options: [
      { value: "bau_neubau", label: "Bauwerk — Neubau (Verbraucherbauvertrag prüfen!)" },
      { value: "bau_umbau", label: "Bauwerk — Umbau / Sanierung" },
      { value: "bau_einzelgewerk", label: "Einzelgewerk (Maler, Sanitär, Elektro etc.)" },
      { value: "anlage_maschine", label: "Industrielle Anlage / Maschine" },
      { value: "studie_gutachten", label: "Studie / Gutachten / Konzept" },
      { value: "software_werk", label: "Software-Erstellung mit Werkcharakter" },
      { value: "sonstiges", label: "Sonstiges Werk" }
    ]
  },
  { key: "werk_beschreibung", label: "Werksbeschreibung / Leistungssoll", type: "textarea", required: true, group: "context",
    placeholder: "z.B. Herstellung einer 80m² Bürofläche inkl. Trockenbau, Bodenbelag, Elektro nach Plan vom 15.04.2026" },
  { key: "vergütung_modell", label: "Vergütungsmodell", type: "select", required: true, group: "context",
    options: [
      { value: "pauschal", label: "Pauschalpreis (Festpreis)" },
      { value: "detail_pauschal", label: "Detail-Pauschalpreis (auf LV-Basis)" },
      { value: "einheitspreis", label: "Einheitspreisvertrag (Aufmaß)" },
      { value: "stundenlohn", label: "Stundenlohn / Aufwand + Material (Cost-Plus)" },
      { value: "gmp", label: "Garantierter Maximalpreis (GMP)" }
    ]
  },
  { key: "vergütung_betrag", label: "Vergütung netto in EUR", type: "number", required: true, group: "context" },
  { key: "fertigstellungstermin", label: "Vereinbarter Fertigstellungstermin", type: "date", required: true, group: "context" },
  { key: "vob_einbeziehung", label: "VOB/B einbeziehen?", type: "select", required: true, group: "context",
    options: [
      { value: "nein", label: "Nein — reines BGB-Werkvertragsrecht" },
      { value: "ja_b2b", label: "Ja — VOB/B als Ganzes (nur empfehlenswert bei B2B)" },
      { value: "ja_modifiziert", label: "Ja — VOB/B modifiziert (AGB-Risiko bei Verbraucher!)" }
    ]
  }
]
```

---

## 5 · Sektionen (Step 3 des Wizards)

> 11 strategische Entscheidungen.

### § 2 — Leistungsumfang und Werkbeschreibung
- **Key**: `scope_of_work`
- **Importance**: critical
- **Beschreibung**: Definiert das geschuldete Werk. Je präziser, desto weniger Streit über Mehrleistungen, Mängel und Abnahmekriterien.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `summarisch` | Summarische Beschreibung | "UN errichtet ein Einfamilienhaus nach Plan." Kurz, ohne Anlagen, ohne LV. | high | Bei Streit über "Was war geschuldet?" oft Mehrkosten und Mangelvorwürfe. BGH vom 20.08.2009 — VII ZR 212/07: Pauschalpreis schließt nur das ein, was Vertragsgegenstand war. | Wenn UN sagt "war nicht beauftragt" und BE "war doch klar" — Streit über Vertragssoll. | Beide: detaillierte Anlage erstellen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `detail_lv` | Detailliertes Leistungsverzeichnis | LV mit Positionen, Mengen, Material, Norm-Verweisen (DIN, ATV); Pläne als Anlage. | low | Goldstandard — wenig Streitpotenzial, klare Abrechnung. | Selten. | Empfohlene Form für jedes größere Werk. | sicher: true, ausgewogen: true, durchsetzungsstark: false |
| `funktional` | Funktionale Leistungsbeschreibung | "UN errichtet ein voll funktionsfähiges Bürogebäude für 50 Arbeitsplätze nach Energieeffizienzklasse A." Fokus auf Erfolg, Mittel offen. | medium | UN trägt Planungsrisiko (gut für BE), aber Kalkulationsrisiko hoch. Streit über Nacherfüllung wenn Erfolg unklar. | Bei abweichendem Erfolgsverständnis. | UN: Mindestausstattung als Anlage definieren. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `agile` | Agile / iterative Werkbeschreibung | Rahmenbeschreibung + Iterationen, Sprints, Definition-of-Done. Häufig bei Software-Werkvertrag. | medium | Werkvertragsrecht passt schlecht zu agilen Modellen — Abnahme und Mängelrechte unklar. BGH-Tendenz: Hybrid-Vertrag. | Wenn nicht klar ist, was am Ende abnahmefähig ist. | Klare Iterationsabnahmen + Endabnahme definieren. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `detail_lv`
  - ausgewogen: `detail_lv`
  - durchsetzungsstark: `funktional`

---

### § 3 — Vergütung und Zahlungsplan
- **Key**: `compensation`
- **Importance**: critical
- **Beschreibung**: Höhe, Vergütungsmodell, Abschlagszahlungen, Schlusszahlung. § 632a BGB (Abschläge), § 650m (Verbraucherbauvertrag: max. 90 % vor Abnahme).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `pauschal_zahlung_nach_abnahme` | Pauschalpreis, vollständige Zahlung erst nach Abnahme | Keine Abschläge, vollständige Vergütung nach Abnahme. | medium | BE-freundlich, UN trägt volles Vorfinanzierungsrisiko. Bei großen Projekten unrealistisch — UN wird Sicherheit nach § 650f BGB fordern. | UN: Insolvenzrisiko bei Vorfinanzierung. | UN: Mindestens 30/40/30-Aufteilung verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `pauschal_meilensteine_30_40_30` | Pauschalpreis mit Meilenstein-Abschlägen (30/40/30) | 30 % bei Vertragsschluss, 40 % bei Rohbau-Fertigstellung, 30 % nach Abnahme. | low | Ausgewogen, Marktstandard. § 632a BGB konform. Bei Verbraucherbauvertrag § 650m beachten (max. 90 % vor Abnahme). | Selten. | Empfohlen als fairer Standard. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `einheitspreis_aufmass_monatlich` | Einheitspreis, monatliche Abrechnung nach Aufmaß | Mengen × Preise, monatliches Aufmaß, 14 Tage Zahlungsziel. | low | Klassisch im Bau, wenig Streit. § 286 Abs. 3 BGB: Verzug nach 30 Tagen. | Bei strittigem Aufmaß. | Klare Aufmaßregeln vereinbaren. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `stundenlohn_woechentlich` | Stundenlohn, wöchentliche Abrechnung | Aufwand + Material, wöchentliche Rechnung, 7 Tage Zahlungsziel. | medium | UN-freundlich, BE trägt offenes Risiko. | BE: keine Kostenkontrolle bei großen Mengen. | BE: Kostenkappung oder GMP verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `pauschal_zahlung_nach_abnahme`
  - ausgewogen: `pauschal_meilensteine_30_40_30`
  - durchsetzungsstark: `stundenlohn_woechentlich`

---

### § 4 — Abnahme
- **Key**: `acceptance`
- **Importance**: critical
- **Beschreibung**: Das zentrale Ereignis im Werkvertragsrecht. § 640 BGB. Löst Vergütungsfälligkeit, Beweislastumkehr, Verjährungsbeginn aus.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `foermlich_protokoll` | Förmliche Abnahme mit Protokoll | Persönliche Begehung, schriftliches Abnahmeprotokoll mit Mängelvorbehalt, Unterschrift beider Parteien. | low | Goldstandard, Marktstandard im Bau. | Selten Streit. | Empfohlen für jedes größere Werk. | sicher: true, ausgewogen: true, durchsetzungsstark: false |
| `fiktive_12_werktage` | Fiktive Abnahme nach 12 Werktagen ohne Mängelrüge | UN setzt Frist zur Abnahme; bei BE-Schweigen Werk gilt als abgenommen (§ 640 Abs. 2). | medium | UN-freundlich. **B2C: Hinweis auf Folge zwingend!** Sonst keine Wirkung der fiktiven Abnahme. | Wenn BE legitime Mängelrüge hatte aber nicht rechtzeitig erklärte. | BE: Frist verlängern, Hinweispflicht prüfen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `teilabnahmen` | Teilabnahmen für abgrenzbare Werkteile | Abnahme einzelner Bauabschnitte (z.B. Rohbau, Ausbau, Außenanlagen) mit jeweiliger Vergütungsfälligkeit. | low | UN-freundlich (frühe Liquidität), aber Verjährungsbeginn pro Teil getrennt. | Wenn Teile später beim Zusammenspiel mit Folgegewerken Mängel zeigen — Zuordnung schwierig. | Klare Abgrenzung der Werkteile. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `nur_endabnahme_BE_genehmigt` | Endabnahme nur mit ausdrücklicher BE-Genehmigung | UN muss BE schriftlich um Abnahme bitten, BE muss aktiv zustimmen. Keine fiktive Abnahme. | high | BE-freundlich extrem, aber UN-Risiko: keine Vergütungsfälligkeit ohne BE-Mitwirken. § 640 Abs. 2 wird **abbedungen** — bei Verbraucherbauvertrag ggf. unwirksam (§ 650o BGB). | UN: Vergütung hängt allein von BE-Willen ab. | UN: Fiktivabnahme nach Fristsetzung als Mindestrückfallebene. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `foermlich_protokoll`
  - ausgewogen: `foermlich_protokoll`
  - durchsetzungsstark: `fiktive_12_werktage`

---

### § 5 — Mängelrechte und Gewährleistung
- **Key**: `defect_rights`
- **Importance**: critical
- **Beschreibung**: § 634 BGB. Verjährung § 634a (5 Jahre Bauwerk, 2 Jahre Sache). Rangfolge: Nacherfüllung → Selbstvornahme → Rücktritt/Minderung → Schadensersatz.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_5j_bau` | Gesetzliche Mängelrechte, 5 Jahre Bauwerk / 2 Jahre Sache | Volle BGB-Gewährleistung, keine Beschränkung. Vorrang Nacherfüllung (UN-Wahlrecht zwischen Nachbesserung/Neuherstellung). | low | BE-freundlich, BGB-Default. § 634a Verjährung. BGH VII ZR 112/24: kein "neu für alt"-Abzug. | Selten. | Empfohlener Standard. | sicher: true, ausgewogen: true, durchsetzungsstark: false |
| `vob_b_4j` | VOB/B-Mängelrechte (4 Jahre Bauwerk) | § 13 VOB/B mit kürzerer Verjährung (4 Jahre Bauwerk, 2 Jahre Wartungs-/Maschinenleistungen). | medium | UN-freundlich (kürzere Verjährung). VOB/B muss "als Ganzes" einbezogen werden, sonst AGB-Kontrolle. Bei B2C oft unwirksam (BGH VII ZR 49/19). | Bei Privatkunde — Klausel kippt. | Nur bei B2B mit beidseitiger VOB-Praxis. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `nacherfuellung_priorität_2j` | Strikte Nacherfüllungs-Priorität, 2 Jahre Bauwerk | Mängelrechte nur nach erfolgloser Nacherfüllung (mit angemessener Frist + 2 Versuchen). Verjährung verkürzt auf 2 Jahre. | high | **Bei AGB unwirksam** für Bauwerke (§ 309 Nr. 8b BGB — Verkürzung Verjährung) und Verbraucher (§ 476 BGB). § 309 Nr. 8: pauschale Verkürzung im AGB unwirksam. | Klausel kippt; gesetzliche Verjährung greift. | UN: keine Verkürzung in AGB möglich. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `kostenvorschuss_explizit` | BGB-Standard + ausdrücklicher Kostenvorschussanspruch | Volle Mängelrechte + § 637-Kostenvorschuss explizit benannt. BGH VII ZR 68/22: Vorschuss + Minderung kombinierbar. | low | BE-freundlich, klar dokumentiert. | Selten. | Empfehlenswert für anspruchsvolle BE. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `kostenvorschuss_explizit`
  - ausgewogen: `gesetzlich_5j_bau`
  - durchsetzungsstark: `vob_b_4j`

---

### § 6 — Sicherheitsleistungen
- **Key**: `security`
- **Importance**: high
- **Beschreibung**: Bauhandwerkersicherung § 650f BGB (UN-Sicherung), Vertragserfüllungs-/Gewährleistungsbürgschaften (BE-Sicherung).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_sicherheiten` | Keine Sicherheitsleistungen | Beide Parteien tragen Erfüllungsrisiko ohne Bürgschaften. | high | Bei UN-Insolvenz: BE verliert Anzahlungen. Bei BE-Insolvenz: UN-Vergütung ausfallen. | Standardproblem bei finanzieller Schieflage. | Beide: § 650f-Sicherung sicher fordern. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `nur_bauhandwerkersicherung_650f` | Nur § 650f-Sicherung für UN | UN kann Sicherheit über Vergütung + 10 % verlangen, BE liefert Bürgschaft/Hinterlegung binnen Frist. | low | UN-Standardabsicherung. § 650f Abs. 5: bei Verweigerung Kündigungsrecht UN, Vergütung bleibt. § 650f Abs. 6 Nr. 2: **nicht** bei Verbraucherbauvertrag. | BE: Bürgschaftskosten (0,5–2 % p.a.). | BE bei Verbraucherbauvertrag: nicht anwendbar. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `gegenseitig_5_5_5` | Beide Seiten: 5 % Vertragserfüllung + 5 % Gewährleistung (UN) + 5 % § 650f-äquivalent (BE) | UN stellt Erfüllungsbürgschaft 5 % bis Abnahme + Gewährleistungsbürgschaft 5 % für 5 Jahre. BE stellt § 650f-Sicherung 110 % der noch offenen Vergütung. | low | Marktstandard im großen Bau. | Bürgschaftskosten beidseitig. | Beide: bewährt. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `nur_un_sicherheit_10` | Nur UN stellt Sicherheit (10 % Erfüllung + Gewährleistung) | BE-freundlich extrem; keine Sicherheit für UN. | high | BE-freundlich, aber bei UN als Verbraucher unzulässige Belastung. § 650f kann **nicht** vertraglich ausgeschlossen werden (§ 650f Abs. 7 BGB!). | UN-Klage auf § 650f ist trotz Klausel zulässig. | UN: § 650f bleibt unverzichtbar. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `nur_un_sicherheit_10`
  - ausgewogen: `gegenseitig_5_5_5`
  - durchsetzungsstark: `nur_bauhandwerkersicherung_650f`

---

### § 7 — Verzug und Vertragsstrafen
- **Key**: `delay_penalty`
- **Importance**: high
- **Beschreibung**: Termintreue, Verzugspauschalen, Vertragsstrafen. § 343 BGB: Gericht kann Vertragsstrafe herabsetzen wenn unverhältnismäßig. § 309 Nr. 6 BGB: pauschale Strafen in AGB nur unter Bedingungen wirksam.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_kein_strafvereinbarung` | Gesetzliche Verzugsregeln, keine Vertragsstrafe | § 286 BGB Verzug, Schadensersatz nach § 280, kein pauschaler Verzugsschadens. | medium | UN-freundlich. BE muss konkreten Schaden nachweisen — bei Bauverzug schwierig. | BE-Schadensbeweis schwierig. | BE: Tagespauschale verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `vertragsstrafe_0_2_pro_werktag_max_5` | Vertragsstrafe 0,2 % pro Werktag, max. 5 % der Auftragssumme | Marktüblich im Bau. Bei UN-Verzug ohne BE-Mitverschulden. § 343 BGB-Reduktion möglich, aber selten bei diesen Sätzen. | low | BGH-anerkannt, AGB-fest. § 309 Nr. 6 BGB: in AGB möglich, wenn Beweisrecht der Gegenseite vorbehalten ("...es sei denn, der UN weist nach..."). | Selten Reduktion durch Gericht. | Standard. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `vertragsstrafe_0_5_max_10` | Vertragsstrafe 0,5 % pro Werktag, max. 10 % | Hohe Abschreckung. | medium | Bei AGB **Risiko der Unwirksamkeit** (§ 343 + § 307 BGB unangemessene Benachteiligung); 5 % gilt als Obergrenze in BGH-Praxis (BGH NJW 2003, 1805). | Klausel auf 5 % gestutzt. | UN: Reduktion verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `bonus_malus_system` | Bonus-Malus: Strafe bei Verzug + Bonus bei früherer Fertigstellung | 0,2 % Strafe / 0,1 % Bonus pro Werktag, jeweils gedeckelt. | low | Anreizmodell, fair. | Bei Streit über Bonus-Voraussetzungen. | Klare Bonus-Trigger definieren. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `vertragsstrafe_0_5_max_10`
  - ausgewogen: `vertragsstrafe_0_2_pro_werktag_max_5`
  - durchsetzungsstark: `gesetzlich_kein_strafvereinbarung`

---

### § 8 — Kündigung
- **Key**: `termination`
- **Importance**: high
- **Beschreibung**: Freie BE-Kündigung § 648 BGB, außerordentliche Kündigung § 648a BGB (Schriftform), Bauvertragskündigung § 650h. Verbraucherbauvertrag: Widerrufsrecht 14 Tage § 650l.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_648_648a` | Gesetzliche Regelung (§ 648 + § 648a BGB) | BE kann jederzeit frei kündigen, UN behält Vergütung minus Erspartes. Beide außerordentlich aus wichtigem Grund. | low | BGB-Default. § 648 Vermutung 5 % nicht erbracht — UN beweispflichtig für höheren Anteil. | UN: bei früher BE-Kündigung Beweisaufwand für Vergütung. | UN: Detailliertes Aufmaß bei Kündigung. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `kuendigung_nur_wichtiger_grund` | Kündigung nur aus wichtigem Grund | Freie Kündigung ausgeschlossen, nur § 648a-Kündigung. | medium | UN-freundlich. **Bei Verbraucherbauvertrag unzulässig** — Widerrufsrecht § 650l zwingend. | Bei B2C unwirksam. | Nur B2B sinnvoll. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `bau_650h_schriftform` | Bauvertrag-Kündigung § 650h (Schriftform) | Kündigung nur schriftlich; bei Bauvertrag zwingend (§ 650h). | low | Klar, dokumentationssicher. | Selten. | Bei jedem Bauvertrag empfohlen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `verbraucherwiderruf_650l` | Verbraucherbauvertrag: 14 Tage Widerrufsrecht (§ 650l) | Bei Verbraucherbauvertrag: Verbraucher kann 14 Tage nach Vertragsschluss widerrufen. Belehrung zwingend. | low | Pflicht bei B2C-Bauvertrag. Fehlende Belehrung: 1 Jahr + 14 Tage Widerrufsfrist (§ 356e BGB). | UN: bei fehlerhafter Belehrung lange Widerrufsfrist. | Standard-Belehrung verwenden. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `bau_650h_schriftform`
  - ausgewogen: `gesetzlich_648_648a`
  - durchsetzungsstark: `kuendigung_nur_wichtiger_grund`

---

### § 9 — Haftung
- **Key**: `liability`
- **Importance**: high
- **Beschreibung**: Mängelhaftung + allgemeine Schadenshaftung. § 309 Nr. 7 BGB: in AGB Vorsatz/grobe Fahrlässigkeit/Personenschäden nicht ausschließbar.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_voll` | Volle gesetzliche Haftung | BGB-Standard, keine Begrenzung, ProdHaftG zusätzlich. | medium | BE-freundlich, UN-Risiko unkalkulierbar bei Großschäden. | UN: existenzbedrohend bei Großschaden. | UN: Berufshaftpflicht + Begrenzung leichte Fahrlässigkeit. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `begrenzt_leichte_fahrl_auftrag` | Volle Haftung Vorsatz/grobe FL, leichte FL begrenzt auf Auftragssumme | § 309 Nr. 7 BGB-konform. Marktstandard. | low | Branchenüblich. | Bei Folgeschäden über Auftragssumme — Streit über Vorsatz/grobe FL. | Beide: Standard. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `betriebshaftpflicht_pflicht` | Volle Haftung + Berufs-/Betriebshaftpflicht-Pflicht UN | UN muss Haftpflicht-Versicherung mit min. 5 Mio EUR Personen-/Sachschäden + 1 Mio EUR Vermögensschäden nachweisen. | low | Optimal für BE; Risiko-Transfer. | Versicherungspflicht muss eingehalten werden. | UN: Kosten in Vergütung einkalkulieren. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `haftungsausschluss_einfach` | Haftungsausschluss für leichte Fahrlässigkeit komplett | Versuch, leichte Fahrlässigkeit ganz auszuschließen. | high | **In AGB nur eingeschränkt wirksam**. § 309 Nr. 7b BGB: bei Schäden aus Verletzung Kardinalpflichten unwirksam. BGH-Rechtsprechung streng. | Klausel kippt teilweise. | UN: Begrenzung statt Ausschluss. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `betriebshaftpflicht_pflicht`
  - ausgewogen: `begrenzt_leichte_fahrl_auftrag`
  - durchsetzungsstark: `begrenzt_leichte_fahrl_auftrag`

---

### § 10 — Eigentumsvorbehalt und Materialeinbau
- **Key**: `retention_of_title`
- **Importance**: medium
- **Beschreibung**: Bei eingebauten Materialien wesentlicher Bestandteil des Bauwerks → §§ 946, 93 BGB: Eigentum geht auf BE über. Eigentumsvorbehalt nur an noch nicht eingebauten Materialien wirksam.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `kein_eigentumsvorbehalt` | Kein Eigentumsvorbehalt | UN trägt Insolvenzrisiko BE bzgl. Materialien voll. | high | UN-Risiko bei BE-Insolvenz: Material verloren ohne Bezahlung. | UN: Schaden bei BE-Pleite. | UN: einfacher EV mind. fordern. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `einfacher_ev_bis_einbau` | Einfacher Eigentumsvorbehalt bis Einbau | Material bleibt bis Einbau UN-Eigentum. Nach Einbau gem. §§ 946, 93 BGB BE-Eigentum. | low | Marktstandard. Schutz für UN bis Einbau. | Selten. | Empfohlener Mindeststandard. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `verlängerter_ev_forderungsabtretung` | Verlängerter EV mit Vorausabtretung der Werklohnforderung | UN behält EV; bei Einbau wird BE-Werklohnforderung vorab an UN abgetreten. | low | Maximaler UN-Schutz im B2B. | Bei Verbraucher-BE komplex und ggf. unwirksam. | Bei B2B Standard für werthaltiges Material. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `bauhandwerker_sicherungshypothek_650e` | Bauhandwerker-Sicherungshypothek § 650e BGB | UN kann Sicherungshypothek am Baugrundstück verlangen. Subsidiär zu § 650f. | low | Starkes UN-Sicherungsmittel; nur bei Bauwerk auf BE-Grundstück möglich. | BE: belastet Grundstück. | UN: Eintragung im Grundbuch. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `kein_eigentumsvorbehalt`
  - ausgewogen: `einfacher_ev_bis_einbau`
  - durchsetzungsstark: `verlängerter_ev_forderungsabtretung`

---

### § 11 — Schwarzarbeit-Verbot und Compliance
- **Key**: `compliance`
- **Importance**: high
- **Beschreibung**: SchwarzArbG § 1: bei "Ohne-Rechnung-Abrede" ist Vertrag nichtig. UN verliert Vergütung, BE Mängelrechte (BGH VII ZR 241/13). Mindestlohn (MiLoG), Sozialversicherung.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_klausel` | Keine Compliance-Klausel | Verweis auf gesetzliche Regelungen. | medium | Bei Schwarzarbeit-Vorwurf später schwer abgrenzbar. | Bei Verdacht: Vertrag ggf. nichtig. | Compliance-Klausel ergänzen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `standard_klausel` | Standard-Compliance-Klausel | "UN versichert: Beachtung MiLoG, ordnungsgemäße Anmeldung der Mitarbeiter, kein Einsatz von Schwarzarbeitern. UN haftet für Sub-UN nach § 14 AEntG / § 13 MiLoG." | low | Schützt BE vor Mithaftung MiLoG. § 14 AEntG: BE haftet wie Bürge ohne Einrede für Sub-UN-Mindestlohn. | Bei Verstoß: außerordentliche Kündigung. | Empfehlung. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `streng_mit_kontrollrecht` | Standard + Kontrollrecht + außerordentliche Kündigung | BE darf Lohnzahlungen, Anmeldungen, Sub-UN-Listen prüfen. Sofortige Kündigung bei Verstoß. | low | Maximaler BE-Schutz. | UN: Verwaltungsaufwand. | UN: angemessene Ankündigungsfrist verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `keine_schwarzarbeit_explizit_BGH` | "Ohne-Rechnung-Abrede"-Verbot ausdrücklich + BGH-Hinweis | "Beide Parteien bestätigen: keine Schwarzgeldabrede. Bei Verstoß ist Vertrag nichtig (BGH VII ZR 241/13)." | low | Eindeutige Dokumentation, schützt vor späterer Behauptung der Nichtigkeit. | Selten. | Empfehlung bei Privatkunden im Bau. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `streng_mit_kontrollrecht`
  - ausgewogen: `standard_klausel`
  - durchsetzungsstark: `standard_klausel`

---

### § 12 — Schlussbestimmungen
- **Key**: `final_provisions`
- **Importance**: medium
- **Beschreibung**: Schriftform für Änderungen, Salvatorische Klausel, Gerichtsstand, anwendbares Recht. Bei B2C: Verbrauchergerichtsstand zwingend (§ 29 ZPO).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `minimal_beklagter` | Salvatorisch + Gerichtsstand am Sitz des Beklagten + deutsches Recht | Faire Default-Lösung. | low | § 12 ZPO Standard. | Selten. | Akzeptabel. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `gerichtsstand_be_sitz` | Gerichtsstand am Sitz des Bestellers | BE-vorteilhaft. | medium | B2B grundsätzlich zulässig (§ 38 ZPO). Bei B2C nicht möglich (§ 29 ZPO Verbrauchergerichtsstand zwingend). | UN: Anreise zu BE-Gericht. | UN: Sitz UN oder DIS-Schiedsklausel. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `gerichtsstand_un_sitz` | Gerichtsstand am Sitz des Unternehmers | UN-vorteilhaft. | medium | B2B zulässig. Bei B2C unzulässig. | BE: Anreise. | BE: neutralen Gerichtsstand. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `dis_schiedsklausel` | DIS-Schiedsgerichtsbarkeit | Streitigkeiten vor DIS-Schiedsgericht (Deutsche Institution für Schiedsgerichtsbarkeit). | medium | Schnell, vertraulich, teuer. Schriftform § 1031 ZPO zwingend. | Bei kleinen Streitwerten unverhältnismäßig teuer. | Nur bei Großprojekten. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `gerichtsstand_be_sitz`
  - ausgewogen: `minimal_beklagter`
  - durchsetzungsstark: `gerichtsstand_un_sitz`

---

## 6 · Anwaltsperspektive — kritische Hinweise

1. **Werkvertrag oder Dienstvertrag?** Gerichte prüfen die tatsächliche Durchführung, nicht das Etikett. Wenn keine Erfolgsschuld erkennbar ist (kein Abnahme-Geschehen, nur Stunden-Abrechnung) — Dienstvertrag, andere Mängelrechte (§§ 280 ff. statt § 634).
2. **Verbraucherbauvertrag (§ 650i) zwingend identifizieren.** Fehlende Baubeschreibung (§ 650j), fehlende Widerrufsbelehrung (§ 650l) oder Zahlungsplan über 90 % vor Abnahme (§ 650m) → gravierende Vertragsmängel mit Wirksamkeitsfolgen.
3. **§ 650f-Bauhandwerkersicherung ist nicht abdingbar** (§ 650f Abs. 7 BGB). Selbst bei vertraglichem Ausschluss kann UN klagen. Bei Verbraucherbauvertrag (§ 650i) jedoch **nicht** anwendbar.
4. **Abnahme ist DAS Schlüsselereignis.** Schriftliches Protokoll mit Mängelvorbehalt zwingend. Bei B2C nie auf "fiktive Abnahme nach 12 Werktagen" allein verlassen — Hinweispflicht nach § 640 Abs. 2 BGB beachten.
5. **Schwarzarbeit ruiniert alles.** Schon eine Teil-Schwarzgeldabrede führt zur Gesamtnichtigkeit (BGH VII ZR 241/13). Weder UN-Vergütung noch BE-Mängelrechte. Bei Privatkundenbau: ausdrückliche "Keine Ohne-Rechnung-Abrede"-Klausel sinnvoll.
6. **VOB/B nur "als Ganzes" einbeziehen** (BGH VII ZR 49/19). Sobald Vertrag VOB/B-Klauseln modifiziert, AGB-Inhaltskontrolle. Bei B2C-Verbrauchern oft Klauseln-Kippe.
7. **Vertragsstrafe max. 5 % der Auftragssumme** (BGH NJW 2003, 1805). Höhere Klauseln werden gem. § 343 BGB reduziert oder als unangemessen verworfen (§ 307 BGB).
8. **Fiktive Mängelbeseitigungskosten als Schadensersatz nicht mehr** (BGH VII ZR 174/16). BE muss Schaden konkret nachweisen oder Vermögensbilanzierung darlegen.
9. **Kein "neu für alt"-Abzug** (BGH VII ZR 112/24). UN trägt volle Mängelbeseitigungskosten, auch wenn BE jahrelang genutzt hat. Sowieso-Kosten weiter abziehbar.
10. **§ 650f-Sicherung früh fordern.** Sobald BE-Bonität unklar: Frist setzen, bei Nichtleistung kündigen — Vergütung bleibt erhalten (BGH VII ZR 241/22).
11. **Bedenkenanmeldung dokumentieren.** Bei vom BE vorgegebenen Materialien/Anweisungen: schriftliche Bedenken — sonst kein § 645 BGB-Schutz bei Mangel.
12. **Verjährung 5 Jahre Bauwerk / 2 Jahre Sache.** Beginn mit Abnahme. Bei vorsätzlich verschwiegenem Mangel 30 Jahre (§ 195, § 199 BGB).
13. **Gerichtsstand bei B2C** (§ 29 ZPO): immer am Verbraucherwohnsitz. Vertragliche Wegvereinbarung unzulässig.
14. **Berufshaftpflicht** für UN unverzichtbar. Mindestens 5 Mio EUR Personen-/Sachschäden + 1 Mio EUR Vermögensschäden — Standard im Bau und bei Anlagenbau.

---

## 7 · Quellen

- BGH vom 27.11.2025 — VII ZR 112/24 (Kein "neu für alt"-Abzug bei Mängelbeseitigung)
- BGH vom 22.08.2024 — VII ZR 68/22 (Minderung sperrt Kostenvorschuss nicht)
- BGH vom 09.11.2023 — VII ZR 241/22 (Bauhandwerkersicherung nach Kündigung)
- BGH vom 23.05.2024 (Verbraucherbauvertrag bei Einzelgewerk)
- BGH vom 26.01.2017 — VII ZR 174/16 (Keine fiktiven Mängelbeseitigungskosten)
- BGH vom 25.02.2021 — VII ZR 49/19 (VOB/B-AGB-Kontrolle bei Verbraucher)
- BGH vom 19.01.2017 — VII ZR 301/13 (Kostenvorschuss § 637)
- BGH vom 10.04.2014 — VII ZR 241/13 (Schwarzarbeit Nichtigkeit)
- BGH vom 20.08.2009 — VII ZR 212/07 (Pauschalpreis und Mehrleistungen)
- BGH NJW 2008, 2106 (VOB/B-Einbeziehung als Ganzes)
- BGH NJW 2003, 1805 (Vertragsstrafe Obergrenze 5 %)
- BAG vom 18.01.2012 — 7 AZR 723/10 (Abgrenzung Dienst-/Werkvertrag)
- BGB §§ 631-651 (allgemeines Werkvertragsrecht)
- BGB §§ 650a-h (Bauvertrag)
- BGB §§ 650i-n (Verbraucherbauvertrag)
- BGB §§ 650p-t (Architekten-/Ingenieurvertrag)
- BGB § 650f (Bauhandwerkersicherung)
- VOB/B (Allgemeine Vertragsbedingungen für Bauleistungen, DIN 1961, Stand 2019)
- SchwarzArbG § 1 (Nichtigkeit Schwarzarbeit-Verträge)
- MiLoG, AEntG (Mindestlohn-Mithaftung)
- ProdHaftG
- [BGH VII ZR 112/24 — Vorteilsausgleich (lto.de)](https://www.lto.de/recht/nachrichten/n/bgh-viizr11224-werkvertrag-maengelrecht-vorteilsausgleich)
- [BGH VII ZR 68/22 — Minderung Selbstvornahme (lto.de)](https://www.lto.de/recht/nachrichten/n/viizr6822-bgh-maengelgewaehrleistungsrechte-werkvertrag-minderung-selbstvornahme-kostenvorschuss)
- [BGH 27.11.2025 (dejure.org)](https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=27.11.2025&Aktenzeichen=VII+ZR+112/24)
- [Verbraucherbauvertrag § 650i sukzessive (jura-online.de)](https://jura-online.de/blog/2024/05/29/bgh-zum-verbraucherbauvertrag-bei-sukzessiver-beauftragung-einzelner-gewerke/)
- [§ 650f BGB — Bauhandwerkersicherung (dejure.org)](https://dejure.org/gesetze/BGB/650f.html)
- [Bauhandwerkersicherung Anspruch nach Kündigung (addLegal)](https://www.addlegal.de/beitraege/anspruch-auf-bauhandwerkersicherheit-auch-nach-kundigung-des-bauvertrages)
- [Schlünder Rechtsanwälte — kein neu für alt](https://schluender.info/bgh-stellt-klar-kein-abzug-neu-fuer-alt-trotz-jahrelanger-nutzung-des-werkes/)
- Stand: 29.04.2026

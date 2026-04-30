# Kaufvertrag — Playbook-Konzept

> Recherchedokument im Sinne des `PLAYBOOK-MASTERPLAN.md` (Sektion 8). Vorbereitet die Code-Umsetzung in `backend/playbooks/kaufvertrag.js`.

## Metadaten
- **Slug**: `kaufvertrag`
- **Title**: Kaufvertrag (Sache, Ware, Fahrzeug, Immobilie)
- **Description**: Kaufvertrag zwischen Verkäufer und Käufer über bewegliche Sachen, Waren mit digitalen Elementen, Fahrzeuge oder Immobilien — mit klarer Abgrenzung B2B/B2C, Mängel- und Garantieregeln nach neuem Schuldrecht (Schuldrechtsreform 2022) und Risikoabsicherung (Eigentumsvorbehalt, Lieferbedingungen, Verzug).
- **Difficulty**: komplex
- **Estimated Time**: 10–15 Minuten
- **Icon**: `package`
- **Legal Basis**: BGB §§ 433–479 (Kaufrecht allgemein); §§ 474–479 (Verbrauchsgüterkauf); §§ 475a–475e (Waren mit digitalen Elementen); § 311b (Beurkundungspflicht Grundstücke); §§ 312–312k (Fernabsatz/Außergeschäftsraumverträge); §§ 355–361 (Widerrufsrecht); § 449 (Eigentumsvorbehalt); § 651 (Werklieferungsvertrag); ProdHaftG; PAngV; UStG (Reverse Charge §13b); BeurkG; HGB §§ 373–381 (Handelskauf); Incoterms® 2020 (ICC).

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze und Reformstand

**Allgemeines Kaufrecht (BGB §§ 433–453)**
- **§ 433 BGB**: Pflicht des Verkäufers zu Übergabe und Eigentumsverschaffung; Pflicht des Käufers zu Kaufpreiszahlung und Abnahme.
- **§ 434 BGB (n.F. seit 01.01.2022)**: Neuer Sachmangelbegriff. Eine Sache ist nur dann mangelfrei, wenn sie kumulativ (1) den **subjektiven Anforderungen** (Beschaffenheitsvereinbarung), (2) den **objektiven Anforderungen** (übliche Beschaffenheit, Eignung für gewöhnliche Verwendung, Werbezusagen, Zubehör) und (3) den **Montageanforderungen** entspricht. Negative Beschaffenheitsvereinbarung in B2C nur unter strengen Hinweispflichten zulässig (§ 476 Abs. 1 Satz 2 BGB).
- **§ 437 BGB**: Käuferrechte bei Mangel — Nacherfüllung, Rücktritt, Minderung, Schadensersatz, Aufwendungsersatz.
- **§ 438 BGB (Verjährung)**: 30 Jahre bei dinglichem Recht/Eintragungsanspruch; 5 Jahre bei Bauwerk und Sachen für Bauwerk; 2 Jahre bei beweglichen Sachen. Bei Verbrauchsgüterkauf gebrauchter Sachen Verkürzung auf 1 Jahr möglich (§ 476 Abs. 2 BGB).
- **§ 442 BGB**: Käufer-Kenntnis vom Mangel bei Vertragsschluss schließt Mängelrechte aus.
- **§ 443 BGB**: Garantie als selbstständige Verpflichtung neben Gewährleistung — Beschaffenheits- vs. Haltbarkeitsgarantie.

**Verbrauchsgüterkauf (BGB §§ 474–479, B2C)**
- **§ 474 BGB**: Verbrauchsgüterkauf = Kauf einer beweglichen Sache durch Verbraucher (§ 13 BGB) von Unternehmer (§ 14 BGB).
- **§ 476 BGB**: Beschränkungen der Vertragsgestaltung — keine Abweichung zum Nachteil des Verbrauchers; bei gebrauchten Sachen Verjährungsverkürzung auf min. 1 Jahr nur mit ausdrücklichem Hinweis und gesonderter Vereinbarung.
- **§ 477 BGB (n.F.)**: Beweislastumkehr **12 Monate** ab Gefahrübergang (vor 2022: 6 Monate). Mangel innerhalb 12 Monaten = vermutet, dass er bei Übergabe vorlag.
- **§ 478 BGB**: Sonderbestimmungen Rückgriff in der Lieferkette.

**Waren mit digitalen Elementen (BGB §§ 475a–475e)**
- **§ 475b BGB**: Erweiterte Mängelhaftung — die Sache muss auch hinsichtlich der digitalen Elemente mangelfrei sein. Aktualisierungspflicht (Updates) für den Zeitraum, den der Verbraucher erwarten kann (üblicherweise mindestens 2 Jahre, bei langlebigen Gütern länger).
- **§ 475c BGB**: Bei dauerhafter Bereitstellung digitaler Elemente Aktualisierungspflicht für den vereinbarten Zeitraum.
- **§ 475e BGB**: Verjährung Sondersystem — bei dauerhaft bereitgestellten digitalen Elementen 2 Jahre nach Ende des Bereitstellungszeitraums.

**Fernabsatz und Widerrufsrecht (BGB §§ 312, 355–361, 312g)**
- **§ 312g BGB**: Widerrufsrecht 14 Tage bei Fernabsatz- und Außergeschäftsraumverträgen.
- **Anlage 1 EGBGB**: Muster-Widerrufsbelehrung. Nichtbelehrung verlängert Widerrufsfrist auf 12 Monate + 14 Tage (§ 356 Abs. 3 BGB).
- **Ausnahmen**: § 312g Abs. 2 BGB (z.B. nach Kundenspezifikation gefertigt, schnell verderblich, hygienisch versiegelt).

**Immobilienkaufvertrag**
- **§ 311b Abs. 1 BGB**: Notarielle Beurkundung **zwingend** für Grundstückskaufverträge. Verstoß = Formnichtigkeit (§ 125 BGB), Heilung erst durch Auflassung und Eintragung (§ 311b Abs. 1 Satz 2 BGB).
- **§ 873 BGB**: Eigentumsübergang erst durch Auflassung und Eintragung im Grundbuch.
- **§ 925 BGB**: Auflassung — vor Notar bei gleichzeitiger Anwesenheit beider Parteien.
- **GrEStG**: Grunderwerbsteuer 3,5–6,5 % je nach Bundesland.

**Eigentumsvorbehalt**
- **§ 449 BGB**: Einfacher EV — Eigentum geht erst mit Vollzahlung über. Bei Insolvenz Aussonderungsrecht (§ 47 InsO).
- **Verlängerter EV**: Verarbeitung/Weiterveräußerung erlaubt; Vorausabtretung künftiger Forderungen (BGH NJW 1986, 977).
- **Erweiterter EV** (Konzern-EV): Eigentum bleibt bis Erfüllung aller Forderungen aus Geschäftsverbindung — Wirksamkeit zwischen Kaufleuten (BGH NJW 1989, 902).

**Handelskauf (HGB §§ 373–381)**
- **§ 377 HGB**: Untersuchungs- und Rügepflicht — Käufer (Kaufmann) muss Ware unverzüglich nach Erhalt untersuchen und Mängel rügen, sonst Genehmigungsfiktion. Bei verdeckten Mängeln: unverzüglich nach Entdeckung.
- Diese Pflicht gilt **nur** im Handelsverkehr (B2B Kaufleute), nicht im Verbraucherkauf.

**Internationale Kaufverträge**
- **CISG (UN-Kaufrechtsübereinkommen)**: Bei internationalem Warenkauf zwischen Geschäftsleuten in Vertragsstaaten automatisch anwendbar (Art. 1 CISG), sofern nicht ausdrücklich ausgeschlossen.
- **Incoterms® 2020 (ICC)**: 11 Klauseln zur Lieferung — EXW, FCA, FAS, FOB, CFR, CIF, CPT, CIP, DAP, DPU, DDP. Regeln: Wer trägt Transport, Versicherung, Verzollung, Risiko ab welchem Punkt?
- **Wichtig**: Incoterms regeln NUR den Gefahrübergang und die Logistikkostentragung — NICHT den Eigentumsübergang oder Mängelhaftung.

**Steuerliche Aspekte**
- **§ 13b UStG (Reverse Charge)**: Bei B2B-Lieferungen über die EU-Grenze geht Steuerschuldnerschaft auf Empfänger über; deutsche USt entfällt bei innergemeinschaftlicher Lieferung (§ 6a UStG) gegen gültige USt-IdNr.
- **§ 14 UStG**: Pflichtangaben Rechnung (USt-IdNr., Steuernummer, fortlaufende Rechnungsnummer, Leistungsbeschreibung, Steuerbetrag).

### 1.2 Aktuelle Rechtsprechung 2022–2026

- **BGH 10.04.2024 — VIII ZR 161/23** (Oldtimer-Klimaanlage): Bei einer **Beschaffenheitsvereinbarung** ("Klimaanlage funktioniert einwandfrei") greift ein gleichzeitig vereinbarter genereller Gewährleistungsausschluss **nicht** für genau diese vereinbarte Beschaffenheit, sondern nur für sonstige Mängel. Die Beschaffenheitsangabe wäre sonst "ohne Sinn und Wert". **Relevanz**: Klare Trennung zwischen Beschaffenheitsvereinbarung und Gewährleistungsausschluss erforderlich.
- **BGH 26.04.2017 — VIII ZR 80/16**: "Kfz-Bastlerfahrzeug" — pauschale Bezeichnung als Bastlerfahrzeug schließt Sachmängelhaftung **nicht aus**, wenn fehlende Verkehrssicherheit nicht ausdrücklich offengelegt.
- **BGH 12.10.2016 — VIII ZR 103/15**: Beweislastumkehr-Reform — Käufer muss nur darlegen, dass Mangel innerhalb 6 (jetzt: 12) Monaten aufgetreten ist, nicht dessen Ursache.
- **BGH 09.10.2024 — VIII ZR 240/22** (Pressemitteilung): Konkretisierung Mangelbegriff bei Waren mit digitalen Elementen — fehlende oder verzögerte Sicherheitsupdates begründen Mangel im Sinne des § 475b BGB.
- **BGH 22.06.2022 — VIII ZR 268/21**: Beschaffenheitsvereinbarung kann auch konkludent durch Verkäuferangaben in der Anzeige zustande kommen.
- **EuGH 18.10.2018 — C-149/15** (Wathelet): Verbraucherkauf — Vermittler kann unter Umständen selbst als Verkäufer haften, wenn Verbraucher die Vermittlerrolle nicht erkennen kann.
- **BGH-Rechtsprechung VW-Diesel** (Auswahl):
  - **BGH 25.05.2020 — VI ZR 252/19**: Sittenwidrige Schädigung (§ 826 BGB) bei VW-Diesel-Manipulation. Schadensersatz mit Nutzungsentschädigung.
  - **BGH 30.07.2020 — VI ZR 5/20**: Restschadensersatzanspruch nach § 852 BGB möglich (10 Jahre).
  - **EuGH 21.03.2023 — C-100/21**: Käufer eines manipulierten Diesels hat auch bei nur fahrlässigem Handeln des Herstellers Anspruch.
- **BGH 18.10.2017 — VIII ZR 86/16**: Bei B2C-Gebrauchtwagen-Kauf kann Verjährung nicht unter 1 Jahr gedrückt werden (§ 476 Abs. 2 BGB).
- **BGH 10.07.2024 — VIII ZR 276/23**: Aktualisierungspflicht digitaler Elemente — Verjährung beginnt mit Ende des erwarteten Bereitstellungszeitraums, nicht mit Erstkauf.
- **OLG Frankfurt 2024**: Werbeaussagen ("rostfrei", "wartungsfrei") werden Bestandteil objektiver Anforderungen nach § 434 Abs. 3 Nr. 2 BGB.

### 1.3 Pflichthinweise und Risiken bei fehlerhafter Gestaltung

1. **B2C: Gewährleistungsausschluss unwirksam.** § 476 Abs. 1 BGB — vor Mängelanzeige getroffene Vereinbarungen, die zu Lasten des Verbrauchers von §§ 433ff BGB abweichen, sind unwirksam. Klauseln wie "Verkauf wie besehen unter Ausschluss jeder Gewährleistung" gegenüber Verbrauchern → nichtig, voller gesetzlicher Mängelschutz greift.
2. **Beweislastumkehr 12 Monate (B2C).** Verkäufer muss innerhalb dieses Zeitraums nachweisen, dass Mangel bei Übergabe **nicht** vorlag. Praktisch oft nur durch Sachverständigengutachten möglich → Risiko hohe Beweis- und Verfahrenskosten.
3. **Digitale Elemente: Update-Pflicht** (§ 475b BGB). Smart-TV, Smartphone, vernetztes Auto, IoT-Gerät → Verkäufer muss Updates bereitstellen, solange Verbraucher dies erwarten kann. Faustregel BGH: 2–5 Jahre, je nach Produktklasse. Verstoß = Mangel.
4. **Immobilienkauf zwingend notariell.** § 311b BGB — formloser Vorvertrag oder Reservierungsvereinbarung mit Kaufpreis = nichtig. Heilung nur durch vollständige Auflassung + Grundbucheintragung.
5. **Widerrufsrecht im Fernabsatz.** Fehlende oder fehlerhafte Belehrung verlängert Widerrufsfrist auf bis zu 12 Monate + 14 Tage. Pflichtmuster Anlage 1 EGBGB verwenden, sonst Abmahn- und Wettbewerbsrisiko (§§ 8, 13a UWG).
6. **Eigentumsvorbehalt nur mit klarer Vereinbarung.** Einfacher EV durch konkludente Vereinbarung möglich, verlängerter/erweiterter EV erfordert ausdrückliche Klausel. Bei Insolvenz Käufer ist EV einziger Schutz für Verkäufer.
7. **Handelskauf: Rügepflicht § 377 HGB.** Versäumnis der unverzüglichen Rüge → Genehmigungsfiktion, Käufer verliert Mängelrechte. **Nicht** anwendbar bei B2C.
8. **AGB-Kontrolle in Kaufverträgen.** § 309 Nr. 7 BGB: kein Haftungsausschluss für Vorsatz/grobe Fahrlässigkeit/Personenschäden. § 309 Nr. 8 BGB: Mängelrechte bei neuen Sachen in B2C nicht abdingbar; bei B2B nur eingeschränkt einschränkbar.
9. **Internationaler Kauf: CISG-Ausschluss prüfen.** Wenn nicht gewünscht, ausdrücklich ausschließen ("Die Anwendung des UN-Kaufrechts (CISG) wird ausgeschlossen.").
10. **Produkthaftung (ProdHaftG) bleibt unabhängig.** Auch bei wirksamem Gewährleistungsausschluss haftet Hersteller verschuldensunabhängig für Personen- und Sachschäden durch fehlerhaftes Produkt — nicht abdingbar.
11. **Grunderwerbsteuer und Notarkosten.** Bei Immobilienkauf zusätzlich GrESt 3,5–6,5 % + Notar/Grundbuch ~1,5–2 % + ggf. Maklercourtage.
12. **Kleinunternehmer (§ 19 UStG)** weisen keine USt aus. Käufer kann keinen Vorsteuerabzug geltend machen.

### 1.4 Risiken nach Vertragstyp (Übersicht)

| Vertragstyp | Hauptrisiken Verkäufer | Hauptrisiken Käufer |
|-------------|------------------------|---------------------|
| B2C-Neuware | Update-Pflicht digitale Elemente, 12-Monate-Beweislast, kein Gewährleistungsausschluss | Selten — gesetzlicher Schutz hoch |
| B2C-Gebrauchtware | Gewährleistung min. 1 Jahr, Beweislast wie Neuware | Verjährung kann auf 1 Jahr verkürzt sein |
| B2B-Neuware | Beschaffenheitsvereinbarungen werden Kern; AGB-Kontrolle § 307 BGB | § 377 HGB Rügepflicht |
| B2B-Gebrauchtware | Vollständiger Gewährleistungsausschluss möglich (mit Grenzen § 444 BGB Vorsatz) | Sehr restriktive Mängelrechte möglich |
| Immobilie | Notarpflicht; Hinweispflichten Altlasten, Grundbuch; Energieausweis | Verdeckte Mängel; Bauwerk-Haftung 5 Jahre |
| Online-Kauf B2C | Widerrufsrechts-Belehrung; Button-Lösung § 312j Abs. 3 BGB | — |
| Internationaler Kauf | CISG anwendbar (wenn nicht ausgeschlossen); Incoterms | Gerichtsstand und Zollabwicklung |

---

## 2 · Rollen-Definition

- **Rolle A — Verkäufer (VK)**: Bietet Sache (Ware, Fahrzeug, Immobilie, Software-Datenträger) gegen Kaufpreis an. Strukturelles Interesse: rechtssichere Lieferung mit klarem Risikoübergang, Begrenzung Mängelhaftung, Schutz vor Zahlungsausfall (Eigentumsvorbehalt, Vorkasse).
- **Rolle B — Käufer (KÄ)**: Erwirbt Eigentum gegen Kaufpreis. Strukturelles Interesse: Mangelfreie Lieferung, faire Mängelrechte, Schutz vor verdeckten Mängeln, planbare Zahlungsbedingungen.

**Spezialfälle:**
- B2C: Käufer = Verbraucher (§ 13 BGB), Verkäufer = Unternehmer (§ 14 BGB). Schutzgesetz: §§ 474ff BGB.
- B2B: Beide Kaufleute → HGB-Recht (§ 377 HGB Rügepflicht).
- C2C (privat-privat): Vollständiger Gewährleistungsausschluss möglich (§ 444 BGB nur Vorsatz/Beschaffenheitsgarantie).
- Immobilie: Notar als zwingender Dritter (§ 311b BGB).

---

## 3 · Modi-Bedeutung (vertragsspezifisch)

- **Sicher** → **Pro Verkäufer**: Maximaler Schutz vor Zahlungsausfall (Vorkasse, EV erweitert), enge Mängelhaftung im rechtlich Zulässigen (B2B: weitestgehender Gewährleistungsausschluss; B2C: Mindestschutz §§ 474ff einhalten), kurze Verjährungsfristen wo zulässig, Gerichtsstand am Sitz des Verkäufers, Lieferung EXW (Käufer trägt Transportrisiko ab Werk).
- **Ausgewogen** → **Marktstandard**: Klare Beschaffenheitsvereinbarung, gesetzliche Mängelhaftung (2 Jahre / 1 Jahr bei B2B-Gebraucht), Standard-Zahlungsfrist 30 Tage netto, einfacher Eigentumsvorbehalt bis Vollzahlung, Lieferung CPT/DAP, fairer Gerichtsstand am Sitz Beklagter (§ 17 ZPO). AGB-konform, gerichtsfest.
- **Durchsetzungsstark** → **Pro Käufer**: Erweiterte Beschaffenheitsvereinbarung, lange Mängelhaftungsfristen (volle 2 Jahre B2C, 5 Jahre Bauwerk wo zutreffend), Skonto bei schneller Zahlung, Lieferung DDP (Verkäufer trägt alles bis Bestimmungsort inkl. Verzollung), Garantie zusätzlich zur Gewährleistung, Gerichtsstand am Käufersitz.

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Verkäufer
  { key: "partyA_name", label: "Name / Firma (Verkäufer)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_representative", label: "Vertretungsberechtigt", type: "text", required: false, group: "partyA" },
  { key: "partyA_taxId", label: "USt-IdNr. / Steuernummer (B2B)", type: "text", required: false, group: "partyA" },
  { key: "partyA_role", label: "Rechtliche Stellung Verkäufer", type: "select", required: true, group: "partyA",
    options: [
      { value: "unternehmer", label: "Unternehmer (§ 14 BGB)" },
      { value: "privat", label: "Privatperson" },
      { value: "kleinunternehmer", label: "Kleinunternehmer (§ 19 UStG)" }
    ]
  },

  // Käufer
  { key: "partyB_name", label: "Name / Firma (Käufer)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Anschrift", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_taxId", label: "USt-IdNr. (B2B)", type: "text", required: false, group: "partyB" },
  { key: "partyB_role", label: "Rechtliche Stellung Käufer", type: "select", required: true, group: "partyB",
    options: [
      { value: "verbraucher", label: "Verbraucher (§ 13 BGB) — VERBRAUCHSGÜTERKAUF, §§ 474ff BGB greifen" },
      { value: "unternehmer", label: "Unternehmer (§ 14 BGB) — B2B" },
      { value: "kaufmann", label: "Kaufmann (HGB) — § 377 HGB Rügepflicht" }
    ]
  },

  // Vertragskontext
  { key: "saleType", label: "Vertragstyp / Kaufgegenstand", type: "select", required: true, group: "context",
    options: [
      { value: "neuware", label: "Neuware (bewegliche Sache, neu)" },
      { value: "gebrauchtware", label: "Gebrauchtware (bewegliche Sache, gebraucht)" },
      { value: "fahrzeug_neu", label: "Fahrzeug (Neu)" },
      { value: "fahrzeug_gebraucht", label: "Fahrzeug (Gebraucht)" },
      { value: "ware_digital", label: "Ware mit digitalen Elementen (Smart-TV, IoT, vernetztes Gerät)" },
      { value: "immobilie", label: "Immobilie / Grundstück (NOTARIELLE BEURKUNDUNG ZWINGEND, § 311b BGB)" },
      { value: "international", label: "Internationaler Kauf (CISG-relevant)" }
    ]
  },
  { key: "object_description", label: "Kaufgegenstand (genaue Bezeichnung)", type: "textarea", required: true, group: "context",
    placeholder: "z.B. Mercedes-Benz E-Klasse, Bj. 2018, FIN: WDD..., Laufleistung 80.000 km" },
  { key: "purchase_price", label: "Kaufpreis (Netto, EUR)", type: "number", required: true, group: "context" },
  { key: "vat_treatment", label: "USt-Behandlung", type: "select", required: true, group: "context",
    options: [
      { value: "regelsteuer_19", label: "Regelsteuersatz 19 %" },
      { value: "regelsteuer_7", label: "Ermäßigter Satz 7 %" },
      { value: "differenzbesteuerung", label: "Differenzbesteuerung (§ 25a UStG, gebrauchte Sachen)" },
      { value: "reverse_charge", label: "Reverse Charge (§ 13b UStG, B2B EU)" },
      { value: "kleinunternehmer", label: "Ohne USt (Kleinunternehmer § 19 UStG)" }
    ]
  },
  { key: "delivery_location", label: "Lieferort / Erfüllungsort", type: "text", required: true, group: "context",
    placeholder: "z.B. Werk Stuttgart, oder: Lieferung an Käufer-Adresse" },
  { key: "channel", label: "Verkaufskanal", type: "select", required: true, group: "context",
    options: [
      { value: "vor_ort", label: "Verkauf vor Ort / im Geschäft" },
      { value: "fernabsatz", label: "Fernabsatz (Online, Telefon, Versand) — WIDERRUFSRECHT bei B2C" },
      { value: "ausserhalb_geschaeft", label: "Außerhalb des Geschäftslokals (Haustür) — WIDERRUFSRECHT bei B2C" }
    ]
  }
]
```

---

## 5 · Sektionen (Step 3 des Wizards)

> 12 strategische Entscheidungen.

### § 2 — Kaufgegenstand und Beschaffenheit
- **Key**: `subject_quality`
- **Importance**: critical
- **Beschreibung**: § 434 BGB (n.F.) — Beschaffenheitsvereinbarung dominiert die Mangelbestimmung. Klare Beschreibung schützt beide Seiten. BGH VIII ZR 161/23: Beschaffenheitsangaben überlagern Gewährleistungsausschluss.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `pauschal` | Nur pauschale Bezeichnung ("Kaufgegenstand") | Sache wird nur per Bezeichnung benannt, ohne Eigenschaften zu spezifizieren. | high | Streitanfällig — Mangel-/Beschaffenheitsstreit nahezu unvermeidbar. § 434 Abs. 3 BGB greift mit objektiven Anforderungen, die der Verkäufer kaum vorhersehen kann. | Wenn Käufer behauptet, bestimmte Eigenschaft sei zugesagt worden — schwere Beweissituation. | Beide Seiten profitieren von präziser Beschreibung. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `mit_beschaffenheit` | Mit konkreter Beschaffenheitsvereinbarung | Eigenschaften (Material, Maße, Funktionen, Bj., FIN, Laufleistung) werden ausdrücklich vereinbart. | low | § 434 Abs. 2 BGB: subjektive Anforderungen klar fixiert. Schutz vor verdeckten Mängeln. | Wenn Eigenschaft fehlt, ist Mangel klar feststellbar. | Standard für seriöse Verkäufe. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `mit_zusicherung_garantie` | Mit Beschaffenheitsvereinbarung + zusätzlicher Garantie (§ 443 BGB) | Beschaffenheit + selbstständige Garantie ("Wir garantieren rostfreie Karosserie für 5 Jahre"). | low | Selbstständige Garantie als Vertrauensbasis; bei Garantieübernahme greift § 444 BGB — Gewährleistungsausschluss unwirksam. | Verkäufer haftet zusätzlich aus Garantie auch nach Ablauf der Gewährleistung. | Pro Käufer: Selbstständige Garantieleistungen verlangen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `negativ_b2c` | Negative Beschaffenheitsvereinbarung (B2C, § 476 Abs. 1 S. 2 BGB) | "Die Sache weicht von der objektiven Anforderung X ab — der Verbraucher wurde gesondert hierauf hingewiesen und hat ausdrücklich zugestimmt." | medium | Nur wirksam bei eigenständigem Hinweis und ausdrücklicher Zustimmung des Verbrauchers vor Vertragsschluss. Komplex und streitanfällig. | Wenn Hinweis nicht beweisbar — Klausel unwirksam, Verbraucher hat volle objektive Anforderungen. | Verkäufer: gesonderten Aufklärungsprozess dokumentieren. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `negativ_b2c` (B2C: dann mit_beschaffenheit fallback im Engine), bei B2B: `mit_beschaffenheit`
  - ausgewogen: `mit_beschaffenheit`
  - durchsetzungsstark: `mit_zusicherung_garantie`

---

### § 3 — Kaufpreis, Zahlungsbedingungen und Skonto
- **Key**: `price_payment`
- **Importance**: critical
- **Beschreibung**: Zahlungsmodalitäten, Verzugszinsen § 288 BGB (B2B: 9 % über Basiszinssatz; B2C: 5 % über Basiszinssatz), USt-Ausweis nach § 14 UStG.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `vorkasse` | Vorkasse 100 % | Zahlung vor Lieferung. | low | Sicher für VK; bei B2C mit erkennbarer Vorleistung Widerrufsrecht zu beachten. | Wenn KÄ bei Lieferung Mangel feststellt — Rückabwicklungsrisiko. | Beide: Treuhand bei großen Beträgen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `30_tage_netto` | 30 Tage netto | Zahlung 30 Tage nach Rechnungsstellung; § 286 Abs. 3 BGB — automatischer Verzug nach 30 Tagen. | medium | Marktstandard B2B. Bei B2C nicht praxisgängig (Vor-Ort-Geschäft → sofort). | Verzugsrisiko bei VK; Liquiditätsdruck wenn KÄ langsam zahlt. | VK: Verzugszinsen 9 % über Basiszinssatz (§ 288 Abs. 2 BGB) explizit. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `14_tage_skonto` | 14 Tage netto, 2 % Skonto bei 7 Tagen | Zahlungsanreiz für KÄ. | low | KÄ-freundlich; VK schnell liquide. | Selten Streit. | Standard-Variante mit Anreiz. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `meilensteine_anzahlung` | Anzahlung + Restzahlung (z.B. 30/70) | Anzahlung bei Bestellung, Rest bei Lieferung. | medium | Bei B2C ist Anzahlung > 30 % oft als überraschende Klausel angesehen (§ 305c BGB). Bei Werklieferung § 632a BGB Abschlagszahlungen möglich. | KÄ: Anzahlung-Verlustrisiko bei Insolvenz VK; daher Bürgschaft sinnvoll. | KÄ: Anzahlungsbürgschaft fordern (§ 651k BGB analog Reisevertragsrecht — Bürgschaftsbestätigung). | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `vorkasse`
  - ausgewogen: `30_tage_netto`
  - durchsetzungsstark: `14_tage_skonto`

---

### § 4 — Lieferung, Gefahrübergang und Incoterms
- **Key**: `delivery_terms`
- **Importance**: high
- **Beschreibung**: § 446 BGB — Gefahr geht mit Übergabe über. Bei Versendungskauf B2B § 447 BGB — Gefahr geht mit Übergabe an Spediteur über. Bei B2C § 475 Abs. 2 BGB — Gefahr immer erst mit Übergabe an Verbraucher.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `exw_abholung` | EXW (Ex Works) — Abholung beim Verkäufer | KÄ holt ab; Gefahrübergang mit Bereitstellung. | high (für KÄ) | VK-freundlich; KÄ trägt vollständiges Transport- und Versicherungsrisiko. Bei B2C unzulässig — § 475 Abs. 2 BGB. | KÄ: Transportschäden bei eigenem/beauftragtem Transport. | KÄ: Transportversicherung selbst abschließen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `cpt_dap_geliefert` | CPT/DAP — Geliefert an Bestimmungsort, ohne Verzollung | VK liefert; Transport bezahlt vom VK; Gefahrübergang am Bestimmungsort. | medium | Marktstandard B2B; klare Risikoverteilung. | Bei Zollproblemen — Verzögerungen. | VK: Transportkosten und Versicherung im Preis kalkulieren. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `ddp_voll_geliefert` | DDP — Geliefert mit Verzollung | VK trägt alles bis Empfangsort, inkl. Zoll, Steuern, Versicherung. | low (für KÄ) | KÄ-freundlich; VK trägt höchstes Risiko. Komplex bei internationaler Verzollung. | Wenn VK Zoll-/Steuersystem im Bestimmungsland nicht kennt — Mehrkosten. | VK: nur bei genauer Kenntnis Zielmarkt; sonst CPT bevorzugen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `gesetzlich_b2c` | Gesetzlicher Standard B2C (§ 475 Abs. 2 BGB) | Gefahrübergang erst mit Übergabe an Verbraucher; VK trägt Transportrisiko. | low | Zwingend bei Verbrauchsgüterkauf — abweichende Klausel unwirksam. | Standard, alternativlos für B2C. | — | sicher: false, ausgewogen: false (B2C-default), durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `exw_abholung` (B2B) bzw. `gesetzlich_b2c` (B2C)
  - ausgewogen: `cpt_dap_geliefert`
  - durchsetzungsstark: `ddp_voll_geliefert`

---

### § 5 — Eigentumsvorbehalt
- **Key**: `retention_of_title`
- **Importance**: high
- **Beschreibung**: § 449 BGB — schützt VK vor Zahlungsausfall und Insolvenz KÄ (Aussonderungsrecht § 47 InsO). Bei B2B üblich; bei B2C oft ohnehin Zug-um-Zug-Geschäft.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `kein_ev` | Kein Eigentumsvorbehalt | Eigentum geht mit Übergabe sofort über (§ 929 BGB). | high (für VK) | VK trägt volles Insolvenzrisiko KÄ — bei Ratenzahlung gefährlich. | Bei KÄ-Insolvenz vor Zahlung — VK ist nur einfacher Insolvenzgläubiger. | Vermeidbar bei Vorkasse oder Sofortzahlung. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `einfacher_ev` | Einfacher Eigentumsvorbehalt | Eigentum bleibt beim VK bis Vollzahlung Kaufpreis dieser Sache. | low | Standard B2B; bei Insolvenz KÄ Aussonderungsrecht. Klar und unstreitig. | Wenn KÄ Sache verarbeitet — EV erlischt nach § 950 BGB. | KÄ: prüfen, ob Sache produktiv eingesetzt werden soll → ggf. verarbeitenden EV. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `verlaengerter_ev` | Verlängerter Eigentumsvorbehalt (Verarbeitung + Vorausabtretung) | EV erstreckt sich auf neue Sache (§ 950 BGB) und Vorausabtretung Forderungen aus Weiterveräußerung. | medium | Komplexe Klausel; AGB-konform nur bei klaren Formulierungen. BGH NJW 1989, 902. Bei Konzernlieferungen Standard. | Wenn Klausel nicht eindeutig — Risiko Unwirksamkeit § 305c BGB. | Beide: notarielle Beratung sinnvoll. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `kontokorrent_ev` | Kontokorrent-Eigentumsvorbehalt (Konzern-EV) | EV bis Erfüllung aller Forderungen aus laufender Geschäftsverbindung. | medium | Nur zwischen Kaufleuten zulässig (BGH NJW 1989, 902). Bei AGB enge Inhaltskontrolle § 307 BGB. | Bei Streit über erfasste Forderungen — Auslegung schwierig. | VK: Klare Liste umfasster Forderungen führen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `verlaengerter_ev` (B2B) bzw. `einfacher_ev` (B2C)
  - ausgewogen: `einfacher_ev`
  - durchsetzungsstark: `kein_ev`

---

### § 6 — Mängelhaftung und Verjährung
- **Key**: `warranty`
- **Importance**: critical
- **Beschreibung**: § 437 BGB — Käuferrechte; § 438 BGB — Verjährung (Standard 2 Jahre; Bauwerk 5 Jahre; Grundbuch 30 Jahre). § 476 BGB — Verbraucherschutz: keine Abweichung zum Nachteil; bei Gebrauchtware Verkürzung auf min. 1 Jahr nur mit ausdrücklicher Vereinbarung.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_2_jahre` | Gesetzliche Mängelhaftung 2 Jahre | Volle Mängelrechte nach §§ 434–442 BGB für 2 Jahre. | low | B2C-Pflicht; B2B-Standard. Beweislastumkehr 12 Monate (§ 477 BGB). | KÄ kann Nacherfüllung, Rücktritt, Minderung, SE verlangen. | VK: bei B2C nicht abdingbar. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `verkuerzt_1_jahr_b2b` | Verkürzt auf 1 Jahr (B2B-Gebrauchtware oder AGB-rechtlich zulässig) | Verjährung 1 Jahr ab Übergabe. | medium | Bei B2C nur für Gebrauchtware mit ausdrücklicher Vereinbarung (§ 476 Abs. 2 BGB) zulässig. Bei B2B AGB-Recht: § 309 Nr. 8 BGB beachten — bei neuen Sachen problematisch. | Bei Spätschäden — keine Mängelrechte mehr. | KÄ: längere Frist wenn Sache komplex/langfristig. | sicher: true (B2B-Gebraucht), ausgewogen: false, durchsetzungsstark: false |
| `erweitert_5_jahre` | Erweitert auf 5 Jahre (Bauwerk-Niveau) | Mängelhaftung 5 Jahre — sinnvoll für langlebige hochwertige Güter. | low (für KÄ) | KÄ-freundlich; VK trägt langes Risiko. § 438 BGB Bauwerks-Maßstab; bei Sachen für Bauwerk gesetzlich ohnehin 5 Jahre. | VK: hohe Rückstellungen erforderlich. | VK: Aufschlag im Preis für erweiterte Haftung. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `ausgeschlossen_b2b` | Ausgeschlossen (B2B-Gebrauchtware) | "Verkauf wie besehen unter Ausschluss jeder Sachmängelhaftung." | high | **Bei B2C unwirksam** (§ 476 Abs. 1 BGB). Bei B2B nur bei Individualabrede; in AGB stark eingeschränkt (§ 309 Nr. 8). § 444 BGB: Ausschluss greift nicht bei Vorsatz, Garantie oder Beschaffenheitsvereinbarung — siehe BGH VIII ZR 161/23! | Wenn Beschaffenheitsangabe vorliegt — Ausschluss kippt teilweise. | KÄ: Beschaffenheitsangaben in Anzeige sammeln und dokumentieren. | sicher: true (B2B-Gebraucht-C2C), ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `verkuerzt_1_jahr_b2b` (B2B) bzw. `gesetzlich_2_jahre` (B2C)
  - ausgewogen: `gesetzlich_2_jahre`
  - durchsetzungsstark: `erweitert_5_jahre`

---

### § 7 — Aktualisierungspflicht (digitale Elemente)
- **Key**: `digital_updates`
- **Importance**: high (nur bei Waren mit digitalen Elementen)
- **Beschreibung**: § 475b BGB — Verkäufer von Waren mit digitalen Elementen (Smartphone, Smart-TV, Connected Car, IoT-Gerät) muss Updates bereitstellen, solange Verbraucher dies erwarten kann. BGH 10.07.2024 — VIII ZR 276/23: Verjährung beginnt mit Ende erwartetem Bereitstellungszeitraum.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_digitalen_elemente` | Sache hat keine digitalen Elemente | Klassischer Sachkauf ohne Software/IoT-Funktionen. | low | § 475b nicht anwendbar. | Selten relevant. | — | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `updates_2_jahre` | Aktualisierungspflicht 2 Jahre | Sicherheits- und Funktionsupdates für 2 Jahre nach Kauf. | medium | Bei B2C oft als unzureichend angesehen — bei langlebigen Geräten (Smart-TV, Auto) erwartet Verbraucher länger. | Wenn Gerät >2 Jahre genutzt wird und keine Updates mehr — Mangel nach BGH. | VK: Update-Zeitraum klar kommunizieren. | sicher: false, ausgewogen: true (kurzlebig), durchsetzungsstark: false |
| `updates_5_jahre` | Aktualisierungspflicht 5 Jahre | Lange Update-Zusage für hochwertige/langlebige Geräte. | low | Marktführer im Premium-Segment (z.B. Samsung Galaxy S24+ 7 Jahre). KÄ-freundlich. | VK: hoher Aufwand bei Sicherheitslücken. | VK: Aufschlag im Preis. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `updates_lebenszeit` | Aktualisierungspflicht für Lebenszeit / unbestimmt | Lebenslange Update-Zusage (rar, z.B. bei manchen Industrie-IoT). | medium | Praktisch nur bei wartungsvertraglich gekoppelten Produkten realistisch. AGB: bei zu vager Formulierung § 307 BGB. | Bei Hersteller-Insolvenz oder Produkt-EOL — Streit. | Konkret formulieren ("solange Hersteller das Produkt unterstützt"). | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults** (nur wenn `saleType=ware_digital`):
  - sicher: `updates_2_jahre`
  - ausgewogen: `updates_2_jahre`
  - durchsetzungsstark: `updates_5_jahre`

---

### § 8 — Rüge- und Untersuchungspflicht (B2B)
- **Key**: `inspection_duty`
- **Importance**: high (nur B2B)
- **Beschreibung**: § 377 HGB — Käufer (Kaufmann) muss Ware unverzüglich untersuchen und Mängel rügen, sonst Genehmigungsfiktion. **Nicht** anwendbar bei B2C.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich_377` | Gesetzliche Regelung § 377 HGB | "Unverzügliche" Rüge nach Untersuchung; bei verdeckten Mängeln nach Entdeckung. | medium | Standard B2B. KÄ verliert Rechte bei Verzug. "Unverzüglich" = i.d.R. 1–14 Tage je nach Branche. | Wenn KÄ später rügt — Mängelrechte verloren. | Beide: Branchenüblichkeit prüfen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `ruege_3_tage` | Konkrete Rügefrist 3 Tage | Klare Frist von 3 Werktagen ab Lieferung. | medium (für KÄ) | VK-freundlich; KÄ unter Zeitdruck. AGB-Kontrolle: kürzere Fristen oft als unangemessen angesehen. | KÄ: bei großen Lieferungen unzureichend. | KÄ: 7–14 Tage verhandeln. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `ruege_14_tage` | Rügefrist 14 Tage | Großzügige Frist. | low | KÄ-freundlich; Praxistauglich. | Selten Streit. | — | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `nicht_anwendbar` | Nicht anwendbar (B2C) | Bei Verbrauchsgüterkauf gilt nur gesetzliche Mängelhaftung ohne Rügepflicht. | low | § 377 HGB greift nur bei Kaufleuten. | — | — | sicher: false, ausgewogen: false (B2C-default), durchsetzungsstark: false |

- **Smart Defaults** (nur wenn B2B):
  - sicher: `ruege_3_tage`
  - ausgewogen: `gesetzlich_377`
  - durchsetzungsstark: `ruege_14_tage`

---

### § 9 — Garantie (selbstständige Verpflichtung, § 443 BGB)
- **Key**: `guarantee`
- **Importance**: medium
- **Beschreibung**: Garantie ist eigenständige Verpflichtung neben Gewährleistung. § 444 BGB: Bei Garantieübernahme ist Gewährleistungsausschluss unwirksam.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_garantie` | Keine zusätzliche Garantie | Nur gesetzliche Mängelhaftung. | low | Standard. | — | — | sicher: true, ausgewogen: true, durchsetzungsstark: false |
| `beschaffenheitsgarantie_1_jahr` | Beschaffenheitsgarantie 1 Jahr | Garantie für vereinbarte Eigenschaften für 12 Monate (z.B. "Funktionsgarantie"). | medium | § 444 BGB: Gewährleistungsausschluss greift nicht für Garantie. VK: Doppelhaftung möglich. | Bei Garantiefall trotz wirksamem Gewährleistungsausschluss. | VK: präzise Garantiebedingungen formulieren. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `haltbarkeitsgarantie_5_jahre` | Haltbarkeitsgarantie (z.B. 5 Jahre rostfrei) | Zusage, dass Sache bestimmte Zeit haltbar/funktionsfähig bleibt (§ 443 Abs. 2 BGB Vermutung). | medium | KÄ-freundlich; bei Mangel innerhalb Garantiezeit Vermutung des Sachmangels. | VK: hohe Folgekosten. | VK: Garantiehöhe gestaffelt anbieten. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `herstellergarantie_verweis` | Verweis auf Herstellergarantie | KÄ kann sich an Hersteller wenden; VK haftet weiterhin gesetzlich. | low | Marktstandard bei Markenware. | KÄ: Hersteller im Ausland — komplexe Abwicklung. | KÄ: VK soll bei Garantie-Hilfe leisten. | sicher: false, ausgewogen: true, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `keine_garantie`
  - ausgewogen: `herstellergarantie_verweis`
  - durchsetzungsstark: `beschaffenheitsgarantie_1_jahr`

---

### § 10 — Widerrufsrecht (B2C Fernabsatz/Außergeschäftsraum)
- **Key**: `right_of_withdrawal`
- **Importance**: critical (nur bei B2C-Fernabsatz)
- **Beschreibung**: § 312g BGB — 14 Tage Widerrufsrecht. Belehrungspflicht nach Anlage 1 EGBGB. Fehlerhafte Belehrung verlängert Frist auf 12 Monate + 14 Tage (§ 356 Abs. 3 BGB).

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `nicht_anwendbar` | Nicht anwendbar (B2B oder Vor-Ort-Geschäft) | Kein Widerrufsrecht. | low | Bei B2B oder Vor-Ort-Verkauf gesetzlich nicht zwingend. | — | — | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `belehrung_muster` | Standard-Widerrufsbelehrung (Muster Anlage 1 EGBGB) | Pflichtmuster verwenden, Bestätigungstext und Widerrufsformular bereitstellen. | low | Rechtssicher; Standard. | Wenn Belehrung nicht nachweisbar — Frist auf 12 Mon + 14 Tage. | VK: Belehrung in Bestätigungs-E-Mail und im Versandkarton. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `ausnahme_individualisiert` | Ausnahme nach Kundenspezifikation (§ 312g Abs. 2 Nr. 1 BGB) | Widerruf ausgeschlossen, da Sache nach Kundenwunsch gefertigt. | medium | Nur bei tatsächlicher Individualisierung; bei Standardware unzulässig (Abmahnrisiko). | Wenn KÄ behauptet, Standardware sei nicht individualisiert — Streit. | VK: Individualisierung dokumentieren. | sicher: true (Verkäufer), ausgewogen: false, durchsetzungsstark: false |
| `verlaengert_30_tage` | Erweitertes Widerrufsrecht 30 Tage | Freiwillig erweiterte Frist als Marketing-Vorteil. | low (Risiko VK) | KÄ-freundlich; Vertrauenssignal. | VK: höhere Retoure-Quote. | — | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults** (nur wenn channel=fernabsatz/ausserhalb_geschaeft, partyB_role=verbraucher):
  - sicher: `belehrung_muster`
  - ausgewogen: `belehrung_muster`
  - durchsetzungsstark: `verlaengert_30_tage`

---

### § 11 — Haftungsbegrenzung
- **Key**: `liability`
- **Importance**: high
- **Beschreibung**: § 309 Nr. 7 BGB — Haftung für Vorsatz, grobe Fahrlässigkeit, Personenschäden in AGB nicht ausschließbar. § 444 BGB — bei Garantie/Beschaffenheitsvereinbarung Ausschluss für arglistig verschwiegene Mängel unwirksam. ProdHaftG bleibt unberührt.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich` | Gesetzliche Haftung (BGB) | Volle Haftung nach BGB. | medium | KÄ-freundlich. VK trägt unbegrenztes Folgeschaden-Risiko. | Bei großen Schäden — ruinös. | VK: Haftpflichtversicherung Pflicht. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `begrenzt_typisch` | Begrenzt auf typischen vorhersehbaren Schaden | "Haftung für leichte Fahrlässigkeit auf Ersatz des bei Vertragsschluss vorhersehbaren typischen Schadens begrenzt." | low | AGB-konform (§ 309 Nr. 7 BGB beachtet). Marktstandard B2B. | Wenn Schaden außergewöhnlich hoch — KÄ trägt Differenz. | KÄ: zusätzliche Versicherung. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `begrenzt_kaufpreis` | Begrenzt auf Kaufpreis (max. Höhe) | Haftungsobergrenze = Kaufpreis. | medium | Bei niedrigen Kaufpreisen + hohen Folgeschäden problematisch. AGB: bei groben Schäden Klausel kippt. | Folgeschaden übersteigt Kaufpreis weit. | KÄ: Erhöhung verlangen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `ausgeschlossen_grob` | Vollständig ausgeschlossen außer Vorsatz | Versuch maximaler Haftungsbegrenzung. | high | **Unwirksam in AGB** für grobe Fahrlässigkeit/Personenschäden (§ 309 Nr. 7 BGB). Klausel-Reduktion möglich, aber riskant. | Klausel kippt; volle Haftung. | Vermeiden; realistische Begrenzung. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `begrenzt_kaufpreis`
  - ausgewogen: `begrenzt_typisch`
  - durchsetzungsstark: `gesetzlich`

---

### § 12 — Gerichtsstand und anwendbares Recht
- **Key**: `jurisdiction`
- **Importance**: medium
- **Beschreibung**: § 38 ZPO — Gerichtsstandsvereinbarung in B2B zulässig; bei B2C grundsätzlich Wohnsitz Verbraucher (§ 29c ZPO). CISG-Ausschluss bei internationalem Kauf prüfen.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `beklagter_sitz` | Gerichtsstand am Sitz des Beklagten (gesetzlich) | § 12 ZPO Standard. | low | Fairste Lösung. | — | — | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `vk_sitz` | Gerichtsstand am Sitz des Verkäufers | VK-freundlich. | medium | Bei B2B § 38 ZPO zulässig; bei B2C unwirksam, wenn Verbraucher-Wohnsitz nicht in DE/EU. | KÄ muss anreisen. | KÄ: Schiedsgericht oder neutraler Ort. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `kae_sitz` | Gerichtsstand am Sitz des Käufers | KÄ-freundlich. | medium | Bei B2B möglich; bei B2C kommt § 29c ZPO ohnehin (Verbraucher-Gerichtsstand). | VK muss anreisen. | VK: Schiedsgericht. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `cisg_ausgeschlossen` | Deutsches Recht + CISG ausgeschlossen | "Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts (CISG)." | low | Bei internationalem Kauf wichtig — sonst CISG-Anwendung automatisch (Art. 1 CISG). | Wenn nicht ausgeschlossen — andere Mängelregeln (Art. 39 CISG: Rügepflicht binnen "angemessener Frist", max. 2 Jahre). | International: ausdrücklicher Ausschluss empfohlen, sofern beide Parteien deutsches Recht wollen. | sicher: true (international), ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `vk_sitz` (B2B) bzw. `beklagter_sitz` (B2C)
  - ausgewogen: `beklagter_sitz`
  - durchsetzungsstark: `kae_sitz`

---

## 6 · Anwaltsperspektive — kritische Hinweise

1. **B2C-Klauseln sind weitgehend zwingend.** § 476 Abs. 1 BGB sperrt jede Abweichung zum Verbrauchernachteil. Klassische "Verkauf wie besehen"-Klauseln gegenüber Verbrauchern sind vollständig unwirksam (Ausnahme: Gebrauchtware mit ausdrücklichem Hinweis und Sondervereinbarung, Verkürzung auf min. 1 Jahr, § 476 Abs. 2 BGB).
2. **Beschaffenheitsangabe schlägt Gewährleistungsausschluss** (BGH VIII ZR 161/23, 10.04.2024). Wer eine Eigenschaft zusichert ("Klimaanlage funktioniert"), kann sich für genau diese Eigenschaft nicht auf einen pauschalen Gewährleistungsausschluss berufen. Praktische Konsequenz: VK sollte bei Anzeigen-Beschreibungen vorsichtig sein; KÄ sollte alle Anzeigen-Texte sichern.
3. **Aktualisierungspflicht ist neue Hauptpflicht.** § 475b BGB — bei jedem Verkauf einer Ware mit digitalen Elementen Pflicht zur Bereitstellung von Sicherheits- und Funktions-Updates. Verstoß = Mangel mit allen Mängelrechten. BGH VIII ZR 276/23: Verjährung beginnt erst mit Ende des erwarteten Bereitstellungszeitraums. Faustregel: Smartphones 5–7 Jahre, Smart-TV 5 Jahre, IoT-Haushalt 3–5 Jahre, vernetzte Autos 10+ Jahre.
4. **Beweislastumkehr 12 Monate.** Praktisch zwingt das B2C-Verkäufer zur sorgfältigen Eingangsprüfung und Dokumentation (Foto-Dokumentation, Funktionsprotokoll, Zustandsbeschreibung).
5. **§ 311b BGB Notarpflicht beim Immobilienkauf.** Selbst Reservierungsvereinbarung mit konkreter Kaufabsicht und Preis ist bei Verstoß formnichtig. Erst Auflassung + Eintragung heilen den Vertrag. Notar prüft Belastungen, Grundbuch, Vorkaufsrechte.
6. **Eigentumsvorbehalt sichert die Insolvenz.** Ohne EV ist VK bei KÄ-Insolvenz nur einfacher Insolvenzgläubiger; mit EV besteht Aussonderungsrecht (§ 47 InsO). Bei B2B-Lieferungen Standard.
7. **§ 377 HGB schützt VK im B2B.** Versäumt KÄ die unverzügliche Rüge, gilt Ware als genehmigt. **Cave**: In AGB ist Verschärfung der Rügefrist (z.B. "binnen 24 Stunden") oft unwirksam.
8. **Garantie ≠ Gewährleistung.** Garantie nach § 443 BGB ist freiwillige zusätzliche Verpflichtung. § 444 BGB: Mit Garantieübernahme ist Gewährleistungsausschluss unwirksam. VK muss Garantiebedingungen exakt formulieren (Umfang, Dauer, Ausnahmen, Verfahren).
9. **Widerrufsrecht im Fernabsatz.** Pflichtbelehrung Anlage 1 EGBGB. Fehler kostet 12 Monate verlängerte Widerrufsfrist + Wettbewerbsabmahnungen. Button-Lösung § 312j Abs. 3 BGB ("Zahlungspflichtig bestellen") zwingend bei kostenpflichtigen Bestellungen.
10. **Internationaler Kauf: CISG bewusst handhaben.** Wenn nicht gewünscht, ausdrücklich ausschließen. Sonst gelten Art. 35ff CISG mit eigener Rügepflicht (Art. 39 — angemessene Frist, max. 2 Jahre).
11. **Incoterms regeln nur Logistik, nicht Eigentum.** "DDP" sagt nichts über Eigentumsübergang aus. Eigentum nach BGB regeln (§ 449 EV oder § 929 sofort).
12. **VW-Diesel-Lehre.** Sittenwidrige Schädigung (§ 826 BGB) kann auch bei verschwiegenen technischen Manipulationen greifen. Verkäufer (Händler) haftet nicht automatisch wie Hersteller — aber Aufklärungspflicht über bekannte Probleme.
13. **Differenzbesteuerung (§ 25a UStG)** bei Gebrauchtware: Steuer nur auf Marge zwischen Einkaufs- und Verkaufspreis. Käufer kann keinen Vorsteuerabzug geltend machen — relevante Information für B2B-KÄ.
14. **Datenschutz beim Verkauf vernetzter Geräte.** Bei Smart-Home, Connected Car etc. wird über die Sache selbst hinaus DSGVO relevant — Hinweis auf Datenverarbeitung erforderlich.
15. **Produkthaftung (ProdHaftG) ist nicht abdingbar.** Hersteller haftet verschuldensunabhängig für Personen- und Sachschäden durch fehlerhaftes Produkt. Verkäufer kann sich durch Vertragsklauseln nicht entlasten.

---

## 7 · Quellen

**BGH-Rechtsprechung:**
- BGH 10.04.2024 — VIII ZR 161/23 (Oldtimer-Klimaanlage, Beschaffenheitsvereinbarung schlägt Gewährleistungsausschluss)
- BGH 09.10.2024 — VIII ZR 240/22 (Mangelbegriff Waren mit digitalen Elementen)
- BGH 10.07.2024 — VIII ZR 276/23 (Aktualisierungspflicht, Verjährungsbeginn)
- BGH 26.04.2017 — VIII ZR 80/16 (Bastlerfahrzeug)
- BGH 22.06.2022 — VIII ZR 268/21 (Konkludente Beschaffenheitsvereinbarung)
- BGH 12.10.2016 — VIII ZR 103/15 (Beweislastumkehr)
- BGH 25.05.2020 — VI ZR 252/19 (VW-Diesel, sittenwidrige Schädigung)
- BGH 30.07.2020 — VI ZR 5/20 (Restschadensersatz § 852 BGB)
- BGH 18.10.2017 — VIII ZR 86/16 (B2C-Gebrauchtwagen, Verjährungsverkürzung)
- BGH NJW 1986, 977 (Verlängerter EV)
- BGH NJW 1989, 902 (Konzern-EV)
- BGH NJW 2008, 2256 (Doppelte Schriftformklausel AGB unwirksam)

**EuGH:**
- EuGH 18.10.2018 — C-149/15 (Wathelet, Vermittlerhaftung)
- EuGH 21.03.2023 — C-100/21 (VW-Diesel, fahrlässige Herstellerhaftung)

**Gesetze:**
- BGB §§ 433–479 (Kaufrecht), §§ 474–479 (Verbrauchsgüterkauf), §§ 475a–475e (Waren mit digitalen Elementen), § 311b (Beurkundung Grundstücke), § 449 (Eigentumsvorbehalt), §§ 312–312k (Fernabsatz), §§ 355–361 (Widerrufsrecht), § 444 (Garantie/Vorsatz)
- HGB §§ 373–381, insbes. § 377 (Rügepflicht)
- ProdHaftG (Produkthaftungsgesetz)
- UStG §§ 13b, 14, 19, 25a
- BeurkG, GrEStG

**EU/International:**
- CISG (UN-Kaufrechtsübereinkommen, Art. 1, 35ff, 39)
- Incoterms® 2020 (ICC, 11 Klauseln EXW–DDP)

**Web-Quellen:**
- [BGH Pressemitteilung VIII ZR 161/23 (Oldtimer)](https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2024/2024082.html)
- [Mängelhaftung bei Oldtimern — BGH 10.04.2024 (LIEB.Rechtsanwälte)](https://www.lieb-online.com/aktuelles/maengelhaftung-bei-oldtimern-bgh-urteil-vom-10-04-2024-az-viii-zr-161-23/)
- [Schuldrechtsreform 2022 — Waren mit digitalen Elementen (Haufe)](https://www.haufe.de/recht/weitere-rechtsgebiete/allg-zivilrecht/schuldrechtsreform-2022-neues-kaufrecht/schuldrechtsreform-2022-waren-mit-digitalen-elementen_208_567670.html)
- [Beweislastumkehr § 477 BGB (it-recht-kanzlei)](https://www.it-recht-kanzlei.de/beweislastumkehr-sachmangel.html)
- [Sachmangelhaftung im Kfz-Gewerbe (KFZ-SH)](https://www.kfz-sh.de/fileadmin/user_upload/Management/SMH-Urteilsuebersicht_-_16._Aufl._-_September_2024.pdf)
- [§ 434 BGB Einzelnorm](https://www.gesetze-im-internet.de/bgb/__434.html)
- [§ 477 BGB Beweislastumkehr](https://www.gesetze-im-internet.de/bgb/__477.html)

Stand: 29.04.2026

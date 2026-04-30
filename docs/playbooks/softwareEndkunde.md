# Software-Endkunde-Vertrag (SaaS / EULA / On-Premises) — Playbook-Konzept

> Recherchedokument im Sinne des `PLAYBOOK-MASTERPLAN.md` (Sektion 8). Vorbereitet die Code-Umsetzung in `backend/playbooks/softwareEndkunde.js`.

## Metadaten
- **Slug**: `softwareEndkunde`
- **Title**: Software-Endkunde-Vertrag (SaaS, On-Premises, EULA)
- **Description**: Vertrag zwischen Software-Anbieter und Endkunde — regelt Bereitstellung, Nutzungsrechte, SLA, Datenschutz/AVV, Verfügbarkeit, Support, Datenrückgabe, Preisanpassungen und Vertragsende. Deckt SaaS (Mietrecht), On-Premises (Kauf-/Lizenz-Hybrid) und Hybrid-Modelle ab.
- **Difficulty**: komplex
- **Estimated Time**: 12–18 Minuten
- **Icon**: `cloud`
- **Legal Basis**: BGB § 535ff (Mietvertrag — SaaS-Hauptleistung nach BGH); §§ 631ff (Werkvertrag — Customizing/Implementation); §§ 611ff (Dienstvertrag — Support); §§ 305–310 (AGB-Recht); UrhG §§ 31, 69a–69g (Software); DSGVO (insbes. Art. 28 AVV, Art. 32 Sicherheit, Art. 44ff Drittlandtransfer); BDSG; TTDSG; NIS2-Umsetzungsgesetz (in Kraft 06.12.2025); EU AI Act (VO 2024/1689, gestaffelt in Kraft); GeschGehG; ProdHaftG; § 309 Nr. 9 BGB i.d.F. FairKfG (in Kraft 01.03.2022); EVB-IT Cloud (für öffentliche Auftraggeber); Trans-Atlantic Data Privacy Framework (Adäquanzbeschluss EU-Komm. 10.07.2023).

---

## 1 · Rechtlicher Hintergrund

### 1.1 Anwendbare Gesetze und Vertragstypisierung

**Vertragstyp-Einordnung (BGH-Rechtsprechung):**
- **BGH 15.11.2006 — XII ZR 120/04** (ASP-Vertrag): Ein Vertrag, in dem dem Kunden Software über das Internet zur Nutzung bereitgestellt wird, ist seinem rechtlichen Schwerpunkt nach **Mietvertrag** (§ 535 BGB) — die "entgeltliche Gebrauchsüberlassung". Diese Einordnung gilt fortgeführt für SaaS-Verträge.
- **BGH 04.03.2010 — III ZR 79/09** (Internet-System-Vertrag): Bei Bereitstellung einer Software-Plattform inklusive Webdesign und Hosting — Mischvertrag mit werkvertraglichen Elementen.
- **BGH 23.07.2009 — VII ZR 151/08**: Software-Erstellung als Werkvertrag (Erfolg geschuldet); Lizenzierung Standard-Software als Sachkauf.
- **OLG Frankfurt 16.01.2025**: Softwareentwicklung in agilem Modell oft als **Dienstvertrag** zu qualifizieren, wenn keine konkrete Erfolgszusage besteht — relevant für Customizing-Phase.

**Konsequenzen der Mietrechts-Einordnung für SaaS:**
- **§ 535 Abs. 1 BGB**: Anbieter schuldet während der gesamten Mietzeit Bereitstellung in vertragsgemäßem Zustand. Verfügbarkeit ist Hauptpflicht, nicht Nebenpflicht.
- **§ 536 BGB**: Mietminderung bei Mangel kraft Gesetzes — Mangel = Abweichung Ist von Soll-Beschaffenheit (z.B. SLA-Unterschreitung).
- **§ 536a BGB**: Schadensersatz auch ohne Verschulden bei anfänglichem Mangel.
- **§ 543 BGB**: Außerordentliche Kündigung bei Nichtgewährung Gebrauch.

**AGB-Recht §§ 305–310 BGB:**
- **§ 305 Abs. 1 BGB**: Vorformulierte Vertragsbedingungen für Vielzahl von Verträgen = AGB.
- **§ 305c BGB**: Überraschende Klauseln werden nicht Vertragsbestandteil.
- **§ 307 BGB**: Inhaltskontrolle — unangemessene Benachteiligung des Vertragspartners unzulässig (Generalklausel).
- **§ 308 BGB**: Klauselverbote mit Wertungsmöglichkeit (z.B. unangemessen lange Fristen).
- **§ 309 BGB**: Klauselverbote ohne Wertungsmöglichkeit.
  - **§ 309 Nr. 7 BGB**: Haftungsausschluss für Vorsatz, grobe Fahrlässigkeit, Personenschäden in AGB unzulässig.
  - **§ 309 Nr. 8 BGB**: Mängelrechte-Beschränkungen problematisch.
  - **§ 309 Nr. 9 BGB (i.d.F. seit 01.03.2022 — FairKfG)**: Bei B2C-Dauerschuldverhältnissen max. **2 Jahre Erstlaufzeit**, automatische Verlängerung nur unbefristet mit max. 1 Monat Kündigungsfrist (vor Reform: 12 Monate Erstlaufzeit + 3 Monate Kündigungsfrist).
- **§ 310 BGB**: B2B-Sondervorschriften — § 309 BGB gilt nicht direkt, aber über § 307 BGB ähnliche Wertungen.

**Datenschutz (DSGVO + BDSG):**
- **DSGVO Art. 28**: **Auftragsverarbeitung (AV)** — Verarbeitet Anbieter im Auftrag personenbezogene Daten des Kunden, ist AVV (Auftragsverarbeitungsvertrag) zwingend. Pflichtinhalte: Art und Zweck, Datenarten, Betroffenenkategorien, technisch-organisatorische Maßnahmen (TOM), Subprozessoren, Audit-Recht, Löschung.
- **DSGVO Art. 32**: Technische und organisatorische Maßnahmen — Stand der Technik, Risiko-Niveau, Verschlüsselung, Pseudonymisierung, Verfügbarkeit, Belastbarkeit.
- **DSGVO Art. 44–49**: Drittlandtransfer — Übermittlung außerhalb EU/EWR nur mit Adäquanzbeschluss (z.B. TADPF für USA seit 10.07.2023), Standardvertragsklauseln (SCC, Modul 2 Controller-Processor) oder BCR.
- **TTDSG (in Kraft 01.12.2021)**: Cookie- und Telekommunikations-Datenschutz; Einwilligungspflicht Tracking.

**Schrems-Rechtsprechung:**
- **EuGH 06.10.2015 — C-362/14** (Schrems I): Safe Harbor unwirksam.
- **EuGH 16.07.2020 — C-311/18** (Schrems II): EU-US Privacy Shield unwirksam; SCC weiter gültig, aber Transfer-Impact-Assessment (TIA) erforderlich.
- **TADPF (10.07.2023)**: Neuer Adäquanzbeschluss EU-USA — gültig für US-Unternehmen mit Self-Certification beim DOC. **Schrems III** beim EuGH bereits angekündigt — Restrisiko des erneuten Wegfalls.

**EU AI Act (VO 2024/1689):**
- **Inkrafttreten gestaffelt**: Verbote (Art. 5) seit 02.02.2025; General-Purpose-AI-Pflichten (Art. 51–55) seit 02.08.2025; **Hochrisiko-Pflichten (Art. 8–22)** ab **02.08.2026** für eigenständige Hochrisiko-KI (Anhang III), ab 02.08.2027 für regulierte Produkte (Anhang I).
- **SaaS-Relevanz**: Bei Software mit AI-Komponenten Pflicht zur Risikoklassifizierung (verbotene/Hochrisiko/begrenztes Risiko/minimales Risiko), bei Hochrisiko: Konformitätsbewertung, Dokumentation, CE-Kennzeichnung, EU-Datenbankregistrierung, menschliche Aufsicht, Transparenzpflichten.
- **Strafen**: bis zu 35 Mio EUR oder 7 % weltweiter Jahresumsatz.

**NIS2 (Richtlinie 2022/2555 / NIS2-Umsetzungsgesetz vom 06.12.2025):**
- Cybersicherheit für "wichtige" und "besonders wichtige" Einrichtungen + KRITIS.
- ~30.000 Unternehmen in DE betroffen.
- Pflichten: Risikomanagement, Meldepflichten erhebliche Sicherheitsvorfälle, Geschäftsleitungs-Schulungen, Lieferketten-Sicherheit (C-SCRM).
- Bei SaaS: Anbieter müssen vertraglich an C-SCRM-Anforderungen ihrer Kunden gebunden werden.

**Urheberrecht:**
- **UrhG §§ 69a–69g**: Sondervorschriften Computerprogramme. Schutzgegenstand Quellcode + Objektcode + Vorbereitungsmaterial.
- **UrhG § 69d Abs. 1**: Notwendige Vervielfältigung zur bestimmungsgemäßen Benutzung erlaubt — auch ohne explizite Lizenz.
- **UrhG § 69d Abs. 3** (Dekompilierung): Eingeschränkt erlaubt für Interoperabilitätsanalyse.
- **UrhG § 69e**: Erschöpfungsgrundsatz (siehe EuGH UsedSoft, C-128/11).

### 1.2 Aktuelle Rechtsprechung 2022–2026

- **EuGH 03.07.2012 — C-128/11** (UsedSoft I): Erschöpfungsgrundsatz auch bei online erworbenen Software-Lizenzen → Weiterverkauf "gebrauchter" Software erlaubt, wenn Erstkopie unbrauchbar gemacht wird. **Wirkt fort bei Endkunden-Verträgen, die Übertragbarkeit ausschließen wollen — Klausel unwirksam soweit Erschöpfung greift.**
- **BGH 17.07.2013 — I ZR 129/08** (UsedSoft II): Lizenzvertrag definiert die "bestimmungsgemäße Benutzung"; Aufspaltung von Volumenlizenzen kann Erschöpfung blockieren.
- **BGH 11.12.2014 — I ZR 8/13** (UsedSoft III): Weiterverkauf gebrauchter Volumenlizenzen unter Bedingungen erlaubt; Vorlage und Beweis Erstkopie-Vernichtung erforderlich.
- **OLG Frankfurt 16.01.2025**: Softwareentwicklung in agiler Form regelmäßig Dienstvertrag — Erfolgsgarantie nur bei klarer vertraglicher Zusage. **Relevanz**: Customizing-Phase eines SaaS-Onboardings.
- **BGH 23.03.2010 — VI ZR 57/09**: Online-Banking-Verfügbarkeit "rund um die Uhr" geschuldet, aber 100 % unrealistisch. Wartungsfenster zumutbar, müssen angekündigt werden.
- **BGH 25.10.2022 — XI ZR 220/21**: Preisanpassungsklauseln — fehlende konkrete Bezugsgrößen führen zu Unwirksamkeit (§ 307 BGB).
- **BGH 09.04.2024 — XI ZR 183/23**: Preisanpassung an VPI nur wirksam mit klarer Index-Bezeichnung, Berechnungsformel und Anpassungs-Cap.
- **BGH 06.07.2022 — VIII ZR 155/21**: Bei zwei-stufigen Preisanpassungsklauseln Pflicht zur konkreten Berechenbarkeit.
- **EuGH 22.04.2020 — C-329/19**: SCC verlangen Risikoanalyse und ggf. zusätzliche Maßnahmen.
- **OLG München 03.06.2021 — 7 U 4338/20**: Bei SaaS-Mängeln Rücktritt erst nach Setzung angemessener Nacherfüllungsfrist; Mietminderung kraft Gesetzes.
- **LG Köln 23.03.2023 — 14 O 277/22**: AGB-Klausel zu unbeschränkter Subprozessor-Beauftragung ohne Zustimmungsrecht des Auftraggebers unwirksam (DSGVO Art. 28).
- **EuGH 04.05.2023 — C-487/21** (Österr. Datenschutzbehörde): Recht auf Kopie umfasst auch Gesprächsnotizen und interne Vermerke — relevant für Datenexport-Klauseln.
- **BFH 27.04.2022 — XI R 1/21**: Bilanzielle Behandlung Cloud-Software i.d.R. als sofort abzugsfähiger Aufwand, nicht aktivierungspflichtiger Vermögensgegenstand.
- **BVerwG 16.07.2024 — 6 C 5.22**: Bundesverwaltung (BSI-Kritikalität) — Anforderungen an Cloud-Anbieter im öffentlichen Sektor verschärft.
- **EuGH 07.03.2024 — C-604/22** (IAB Europe): Cookie-Consent — TCF-Mechanismus ist Verarbeitung personenbezogener Daten.

### 1.3 Pflichthinweise und Risiken bei fehlerhafter Gestaltung

1. **AVV ist DSGVO-Pflicht.** Wer als SaaS-Anbieter personenbezogene Daten des Kunden verarbeitet, muss zwingend eine AV-Vereinbarung anbieten (Art. 28 DSGVO). Fehlt sie, ist die Verarbeitung rechtswidrig — beide Parteien haftbar mit bis zu 20 Mio EUR oder 4 % weltweiter Jahresumsatz.
2. **Subprozessoren-Liste pflegen und Zustimmungsrecht einräumen.** Aktuelle Liste online + Änderungsbenachrichtigung mit Widerspruchsrecht (LG Köln 23.03.2023).
3. **Drittlandtransfer kritisch prüfen.** Bei US-Cloud (AWS, Azure, GCP) entweder TADPF-Self-Certification des US-Subprozessors prüfen oder SCC + TIA. **Risiko Schrems III**: TADPF kann erneut kippen — Backup-Plan halten.
4. **§ 309 Nr. 9 BGB beim B2C beachten.** Bei B2C-SaaS: max. **2 Jahre** Erstlaufzeit, dann monatlich kündbar mit max. 1 Monat Kündigungsfrist. Auto-Renewal nur unbefristet mit monatl. Kündigungsrecht. Verstoß = Klausel unwirksam, gesetzliche Regelung greift (jederzeitige Kündigung möglich).
5. **Verfügbarkeits-SLA muss Vertragsgegenstand sein.** Versprochene Verfügbarkeit (z.B. 99,9 %) ist Beschaffenheitsangabe; Unterschreitung = Mangel mit Mietminderungsanspruch (§ 536 BGB).
6. **Datenrückgabe und -löschung am Vertragsende.** Pflicht zur Bereitstellung in maschinenlesbarem Standardformat (DSGVO Art. 20 Datenportabilität bei personenbezogenen Daten); für Geschäftsdaten vertragliche Regelung erforderlich.
7. **Source Code Escrow** bei On-Premises oder kritischer Software: Hinterlegung Quellcode bei Treuhänder zur Risikoabsicherung Insolvenz Anbieter.
8. **Open Source Compliance.** Bei Verwendung Open-Source-Komponenten Compliance-Pflichten (SBOM — Software Bill of Materials, NTIA-konform). Bei GPL-Komponenten: Copyleft kann auf eigene Software durchschlagen.
9. **EU AI Act ab 02.08.2026.** Bei SaaS mit AI-Funktionen (Empfehlung, Score, automatisierte Entscheidungen) Risikoklasse prüfen. Hochrisiko-AI (HR-Software, Bonität, Bildungsentscheidungen) → Konformitätsbewertung und Dokumentation Pflicht.
10. **NIS2-Implications (seit 06.12.2025).** SaaS-Anbieter mit "wichtigen"/"besonders wichtigen" Kunden müssen vertraglich an C-SCRM-Anforderungen gebunden sein. Audit-Rechte und Meldepflichten in Vertrag aufnehmen.
11. **Preisanpassungs-Klauseln müssen klar berechenbar sein** (BGH XI ZR 183/23). VPI-Indexierung mit Cap (z.B. max. 5 %/Jahr) + Sonderkündigungsrecht bei Erhöhung > X %.
12. **Haftung in B2B begrenzbar, in B2C eingeschränkt.** § 309 Nr. 7 BGB: kein Ausschluss Vorsatz/grobe Fahrlässigkeit/Personenschäden. § 307 BGB B2B: Begrenzung auf typischen Schaden möglich.

### 1.4 SaaS-Architekturmodelle (Übersicht)

| Modell | Charakteristik | Vertragstyp BGH | Hauptpflicht Anbieter |
|--------|----------------|-----------------|------------------------|
| Public SaaS Multi-Tenant | Geteilte Infrastruktur, einheitliche Software-Version | Mietvertrag | Verfügbarkeit, Updates, Mandantentrennung |
| Private/Single-Tenant SaaS | Dedizierte Instanz pro Kunde | Mietvertrag mit Werkanteilen (Setup) | Verfügbarkeit, dedizierte Performance, ggf. Customizing |
| Hybrid (SaaS + On-Premises-Anteile) | Kern-Funktionen Cloud, Schnittstellen lokal | Typenkumuliert | Cloud-Verfügbarkeit + lokale Lizenz |
| On-Premises mit Wartung | Software lokal, Anbieter wartet | Sachkauf/Lizenz + Dienstvertrag (Wartung) | Lizenzgewährung + Wartungsleistung |
| White-Label SaaS | Kunde rebranded für eigene Endkunden | Mietvertrag mit IP-Lizenz | Stabile Plattform + Markenrechte |

---

## 2 · Rollen-Definition

- **Rolle A — Software-Anbieter (SA)**: Stellt Software (SaaS, On-Premises, Hybrid) gegen Entgelt bereit. Strukturelles Interesse: planbare Wiederkehrumsätze, klare Haftungsgrenzen, Schutz seiner IP, AGB-Standard für Skalierung, AVV-Konformität, Möglichkeit zur Subprozessor-Steuerung.
- **Rolle B — Endkunde (EK)**: Nutzt Software für eigenen Geschäftsbetrieb. Strukturelles Interesse: Stabilität (Verfügbarkeit), Datensicherheit, DSGVO-Konformität, planbare Kosten (Cap), Datenrückgabe bei Vertragsende, Migrationsschutz, Absicherung gegen Anbieter-Insolvenz.

**Spezialfälle:**
- B2C-Endkunde (Verbraucher): § 13 BGB → § 309 Nr. 9 BGB greift voll; Widerrufsrecht bei Fernabsatz; höhere Transparenzanforderungen.
- B2B-Endkunde mit Personendaten: AVV Pflicht; ggf. § 203 StGB bei Berufsgeheimnisträgern (Anwälte, Ärzte).
- Öffentliche Hand: EVB-IT Cloud als Standardvertrag.

---

## 3 · Modi-Bedeutung (vertragsspezifisch)

- **Sicher** → **Pro Software-Anbieter**: Maximale Lizenz-/Nutzungsbeschränkungen (named user, IP-Restriction, kein Sublizenz), längere Mindestvertragslaufzeit (24 Monate B2B; 24 Monate B2C-Cap nach FairKfG), niedrigere SLA-Garantien (z.B. 99,0 %), automatisches Auto-Renewal mit langer Frist, Subprozessor-Recht weit gefasst, Haftung auf typischen Schaden begrenzt + Cap auf Jahresgebühr, Preisanpassung mit weiter Spanne (VPI ohne Cap), Datenrückgabe in proprietärem Format gegen Aufpreis.
- **Ausgewogen** → **Marktstandard**: Klare Nutzungsrechte für vereinbarten Zweck, Mindestvertragslaufzeit 12 Monate, SLA 99,5 % mit Service Credits, monatlich/quartalsweise Auto-Renewal mit 30 Tage Kündigungsfrist, Subprozessoren-Liste online + Widerspruchsrecht, Haftung auf typischen Schaden begrenzt + Cap auf 12-Monats-Gebühr, VPI-Anpassung mit Cap (z.B. 5 %/Jahr) + Sonderkündigungsrecht, Datenrückgabe CSV/JSON innerhalb 30 Tagen.
- **Durchsetzungsstark** → **Pro Endkunde**: Großzügige Nutzungsrechte (Unternehmensgruppe, unbestimmte User-Zahl), kurze Mindestlaufzeit oder monatliche Kündigung, hohe SLA-Zusagen (99,9 %+) mit Service Credits + Sonderkündigung bei wiederholter Verfehlung, Subprozessor-Zustimmung erforderlich, Haftung gesetzlich + Berufshaftpflicht des SA, Preise stabil oder enge Cap (max. 2,5 %/Jahr), Datenexport jederzeit gratis, Source Code Escrow, Backup-Strategie vertraglich zugesichert.

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Software-Anbieter
  { key: "partyA_name", label: "Firmenname (Anbieter)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_legalForm", label: "Rechtsform Anbieter", type: "select", required: true, group: "partyA",
    options: [
      { value: "gmbh", label: "GmbH" },
      { value: "ag", label: "AG" },
      { value: "ug", label: "UG (haftungsbeschränkt)" },
      { value: "auslaendisch_eu", label: "EU-Ausland" },
      { value: "auslaendisch_drittstaat", label: "Drittstaat (USA, UK etc.) — DSGVO-DRITTLANDTRANSFER!" }
    ]
  },
  { key: "partyA_dpo", label: "Datenschutzbeauftragter (Name + Kontakt)", type: "text", required: false, group: "partyA" },

  // Endkunde
  { key: "partyB_name", label: "Firma / Name (Endkunde)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Anschrift / Sitz", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_role", label: "Rechtliche Stellung Endkunde", type: "select", required: true, group: "partyB",
    options: [
      { value: "verbraucher", label: "Verbraucher (§ 13 BGB) — § 309 Nr. 9 BGB greift!" },
      { value: "unternehmer_kmu", label: "Unternehmer KMU (§ 14 BGB)" },
      { value: "unternehmer_konzern", label: "Unternehmer Konzern (verbundene Unternehmen)" },
      { value: "oeffentlich", label: "Öffentlicher Auftraggeber (EVB-IT Cloud)" },
      { value: "kritis", label: "KRITIS / Wichtige Einrichtung NIS2" }
    ]
  },
  { key: "partyB_industry", label: "Branche Endkunde (für AI-Act/NIS2)", type: "select", required: true, group: "partyB",
    options: [
      { value: "general", label: "Allgemein" },
      { value: "finance", label: "Finanzdienstleistungen (DORA)" },
      { value: "health", label: "Gesundheit (MPDG)" },
      { value: "education", label: "Bildung (AI Act Hochrisiko)" },
      { value: "hr", label: "HR/Personal (AI Act Hochrisiko bei automatisierten Entscheidungen)" },
      { value: "kritis", label: "KRITIS (Energie, Wasser, etc.)" }
    ]
  },

  // Software-Kontext
  { key: "deploymentModel", label: "Bereitstellungsmodell", type: "select", required: true, group: "context",
    options: [
      { value: "saas_multi", label: "SaaS Multi-Tenant (Public Cloud)" },
      { value: "saas_single", label: "SaaS Single-Tenant (Dedicated Instance)" },
      { value: "on_premises", label: "On-Premises (lokal beim Kunden)" },
      { value: "hybrid", label: "Hybrid (Cloud + lokale Komponenten)" }
    ]
  },
  { key: "userCount", label: "Anzahl Nutzer / Lizenzen", type: "number", required: true, group: "context" },
  { key: "licenseModel", label: "Lizenzmodell", type: "select", required: true, group: "context",
    options: [
      { value: "named", label: "Named User (personenbezogen)" },
      { value: "concurrent", label: "Concurrent User (gleichzeitig aktive)" },
      { value: "unlimited", label: "Unlimited Users (Enterprise-Flat)" },
      { value: "consumption", label: "Consumption-Based (API-Calls, Datenvolumen)" }
    ]
  },
  { key: "monthlyFee", label: "Monatliche Vergütung (Netto, EUR)", type: "number", required: true, group: "context" },
  { key: "containsPersonalData", label: "Werden personenbezogene Daten verarbeitet?", type: "select", required: true, group: "context",
    options: [
      { value: "ja_extensive", label: "Ja, umfangreich (Mitarbeiter-/Kunden-/Patientendaten) — AVV PFLICHT + ART. 32 TOM" },
      { value: "ja_begrenzt", label: "Ja, begrenzt (z.B. nur Login-Daten/Admin-Konten) — AVV PFLICHT" },
      { value: "nein", label: "Nein — keine AVV erforderlich" }
    ]
  },
  { key: "containsAI", label: "Enthält die Software AI-Komponenten?", type: "select", required: true, group: "context",
    options: [
      { value: "nein", label: "Nein, keine AI-Funktionen" },
      { value: "minimal", label: "Ja, minimales Risiko (z.B. Spam-Filter, Empfehlungen)" },
      { value: "limited", label: "Ja, begrenztes Risiko (Chatbot, Bildgenerierung) — Transparenzpflicht" },
      { value: "high_risk", label: "Ja, Hochrisiko (HR/Bonität/Bildung/Strafverfolgung) — Konformitätsbewertung Pflicht ab 02.08.2026!" }
    ]
  }
]
```

---

## 5 · Sektionen (Step 3 des Wizards)

> 13 strategische Entscheidungen.

### § 2 — Leistungsbeschreibung und Funktionsumfang
- **Key**: `service_scope`
- **Importance**: critical
- **Beschreibung**: Definiert, was die Software leistet (Module, Funktionen, Schnittstellen, Performance-Eckdaten). Dient als Beschaffenheitsvereinbarung für die Mängelhaftung.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `pauschal_produktbezeichnung` | Nur Produktbezeichnung | Verweis auf Produktnamen ("Lizenz für ProduktX") ohne Funktionsbeschreibung. | high | Streitanfällig — Funktionsumfang ergibt sich aus Werbung/Marketing (objektive Anforderung § 434 Abs. 3 BGB analog). | Wenn EK angekündigtes Feature vermisst — Streit über Beschaffenheit. | Beide: konkrete Modulliste verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `module_liste` | Modul-/Feature-Liste in Anlage | Konkrete Auflistung enthaltener Module + verlinkte Doku. | low | Klar und unstreitig. Standard. | Wenn Anbieter Feature entfernt — Mangel/Mietminderung. | Anbieter: Recht zur Funktionsänderung mit Vorankündigung definieren. | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `kpis_performance` | Modul-Liste + Performance-KPIs (z.B. Antwortzeiten, Datenvolumen) | Quantitative Beschaffenheitszusagen. | low | Sehr EK-freundlich; Anbieter mit klarem Rahmen. | Wenn KPIs verfehlt — Mangel. | Anbieter: realistische Werte mit Toleranz; Messmethodik definieren. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `dynamisch_anbieter` | Dynamisch nach jeweils aktueller Produktversion | "Funktionsumfang ergibt sich aus jeweils aktueller Version." Anbieter kann Features entfernen/ändern. | high | Bei B2C oft als überraschend bewertet (§ 305c BGB) oder unangemessen benachteiligend (§ 307 BGB). Im B2B möglich, aber EK-feindlich. | Wenn kritisches Feature entfernt — keine Handhabe. | EK: Migrationsanspruch bei wesentlichen Änderungen verlangen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `dynamisch_anbieter`
  - ausgewogen: `module_liste`
  - durchsetzungsstark: `kpis_performance`

---

### § 3 — Nutzungsrechte und Lizenzumfang
- **Key**: `usage_rights`
- **Importance**: critical
- **Beschreibung**: UrhG § 31 / § 69d — Einräumung der Nutzungsrechte muss konkret bezeichnet werden. Bei SaaS-Mietmodell technisch häufig "Zugangsrecht" statt klassischer Lizenz.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `named_user_strict` | Named User, nicht übertragbar, keine Sublizenz | Pro registrierter User; Lizenz ist Person zugeordnet, nicht übertragbar. | medium | Anbieter-freundlich. EuGH UsedSoft (C-128/11) kann bei Kauf-Lizenz Erschöpfung greifen — bei SaaS-Miete weniger relevant. | EK: bei Mitarbeiterwechsel ggf. Re-Lizenzierung. | EK: Re-Assignment-Recht im Vertrag (z.B. nach 30 Tagen). | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `concurrent_user` | Concurrent User (gleichzeitig aktive) | Lizenz pro gleichzeitig nutzendem User. | low | Marktstandard. Flexibler für EK. | Bei Spitzenlast — Limit erreicht, User gesperrt. | EK: Burst-Capacity verhandeln. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `enterprise_unlimited` | Enterprise-Flat (Unbegrenzte Nutzer einer juristischen Person) | Alle Mitarbeiter und verbundene Unternehmen dürfen nutzen. | low (für EK) | EK-freundlich; einfaches Skalierungsmodell. | Anbieter: Risiko unkontrollierter Nutzung. | Anbieter: Definition "verbundene Unternehmen" eingrenzen (§ 15 AktG). | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `consumption_based` | Verbrauchsbasiert (API-Calls, Datenvolumen, Compute) | Nutzungsabhängige Bezahlung; keine Stückzahlbeschränkung. | medium | Modern, fair, aber Kostenrisiko bei Lastspitzen. | Wenn Verbrauchsexplosion (z.B. Bot) — hohe Rechnung. | EK: Kosten-Cap mit Alert verhandeln. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `named_user_strict`
  - ausgewogen: `concurrent_user`
  - durchsetzungsstark: `enterprise_unlimited`

---

### § 4 — Verfügbarkeit (SLA) und Wartungsfenster
- **Key**: `sla_availability`
- **Importance**: critical
- **Beschreibung**: § 535 BGB — Anbieter schuldet Bereitstellung. SLA = Beschaffenheitsvereinbarung. Unterschreitung → Mietminderung (§ 536 BGB) und ggf. Schadensersatz.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_sla_zusage` | Keine SLA-Zusage ("Best Effort") | Anbieter macht keine garantierte Verfügbarkeit. | high (für EK) | "Best Effort" in AGB zwischen Unternehmern oft als überraschend angesehen (§ 305c BGB) bei kritischen Diensten. Bei B2C unwirksam. | EK: keine Handhabe bei Ausfällen. | EK: Mindest-SLA fordern. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `sla_99_5` | 99,5 % monatlich, ohne Service Credits | Marktstandard für günstige SaaS. ~3,6 Std/Mon Downtime. | medium | Standard-Klausel. Wartungsfenster (geplant) angekündigt davon ausgenommen. | Bei längeren Ausfällen — § 536 BGB greift kraft Gesetz. | EK: Service Credits verhandeln. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `sla_99_9_credits` | 99,9 % mit Service Credits + Sonderkündigungsrecht | ~43 Min/Mon Downtime. Bei Verfehlung Service Credits (z.B. 10 % Monatsgebühr) und nach 3 Verstößen Sonderkündigungsrecht. | low | EK-freundlich; klare Konsequenzen. | Anbieter: hohes Operational-Commitment, ggf. Multi-AZ-Setup nötig. | Anbieter: Wartungsfenster ausnehmen, geplante Downtime ankündigen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `sla_99_99_industrial` | 99,99 % Enterprise-SLA mit Pönalen | ~4,3 Min/Mon Downtime. Hohe Strafen bei Verfehlung. | medium | Sehr EK-freundlich, aber teuer. Nur bei kritischer Infrastruktur sinnvoll. | Anbieter: Risiko erheblicher Pönalen. | EK: Bereitstellung in Aufpreis-Modell. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `keine_sla_zusage`
  - ausgewogen: `sla_99_5`
  - durchsetzungsstark: `sla_99_9_credits`

---

### § 5 — Auftragsverarbeitung und Datenschutz
- **Key**: `dpa_avv`
- **Importance**: critical (wenn Personendaten verarbeitet)
- **Beschreibung**: DSGVO Art. 28 — AVV zwingend bei Auftragsverarbeitung. Pflichtinhalte: Gegenstand, Zweck, Datenarten, Betroffene, Pflichten, TOM, Subprozessoren, Audit, Löschung.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_personendaten` | Keine personenbezogenen Daten verarbeitet | Nur anonymisierte/pseudonymisierte Daten — keine AVV erforderlich. | low | Selten in der Praxis. Selbst Login-Daten = Personendaten. | Wenn doch Personendaten verarbeitet werden — fehlende AVV = DSGVO-Verstoß. | Realistisch prüfen — meist AVV fällig. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `avv_inline` | AVV inline im Hauptvertrag | AVV-Klauseln direkt im Vertrag, keine separate Anlage. | medium | Praktisch bei kleinen SaaS. Bei komplexen Datenverarbeitungen oft unübersichtlich. | Wenn Datenverarbeitung sich ändert — Vertragsanpassung nötig. | Inline nur bei einfachen Fällen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `avv_separat_standard` | Separate AVV nach DSGVO Art. 28 | Eigener AVV-Anhang mit allen Pflichtinhalten + TOM-Liste + aktuelle Subprozessoren-Liste online. | low | Marktstandard. Modular, gerichtsfest. | Wenn Subprozessoren-Änderung ohne Mitteilung — Verstoß § 28 DSGVO. | EK: Widerspruchsrecht gegen neue Subprozessoren mit 30 Tage Frist. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `avv_streng_zustimmung` | AVV mit Subprozessor-Zustimmungsrecht und Audit-Recht | EK muss neuen Subprozessoren ausdrücklich zustimmen; Audit-Recht 1× jährlich vor Ort. | low (für EK) | EK-freundlich. LG Köln 23.03.2023: pauschale Subprozessor-Beauftragung unwirksam. | Anbieter: Skalierungshindernis bei vielen Kunden. | Anbieter: Liste vorgenehmigter Standardsubprozessoren akzeptieren. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults** (nur wenn `containsPersonalData!=nein`):
  - sicher: `avv_inline`
  - ausgewogen: `avv_separat_standard`
  - durchsetzungsstark: `avv_streng_zustimmung`

---

### § 6 — Drittlandtransfer (DSGVO Art. 44ff)
- **Key**: `data_transfer`
- **Importance**: critical (wenn Personendaten + Drittland)
- **Beschreibung**: Art. 44ff DSGVO — Transfer in Drittstaaten nur mit Adäquanzbeschluss (z.B. TADPF USA seit 10.07.2023), SCC + TIA, oder BCR. Schrems III bei EuGH anhängig — Restrisiko.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `eu_only` | Verarbeitung ausschließlich in EU/EWR | Anbieter zusichert: alle Daten und Subprozessoren in EU/EWR. | low | Optimal. DSGVO-Konformität ohne Drittlandtransfer-Risiko. | Wenn doch US-Cloud im Hintergrund (z.B. Cloudflare-DDoS) — Verstoß. | Vertraglich auch CDN/DDoS-Provider mit einschließen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `tadpf_certified` | Drittlandtransfer USA mit TADPF-Zertifizierung | Anbieter/Subprozessor in DOC-Liste TADPF gelistet (Stand: zum Zeitpunkt der Verarbeitung). | medium | Bei Kippen TADPF (Schrems III) muss schnell auf SCC umgestellt werden. | Wenn TADPF kippt während Vertragslaufzeit — Übergangsregelung erforderlich. | EK: Backup-Plan SCC + TIA vertraglich verankern. | sicher: true, ausgewogen: true, durchsetzungsstark: false |
| `scc_with_tia` | Standardvertragsklauseln (SCC, Modul 2) + Transfer Impact Assessment | SCC der EU-Kommission (2021/914) + dokumentiertes TIA für jedes Drittland. | medium | Aufwändig, aber rechtlich solide. EuGH C-329/19: Risiko-Analyse Pflicht. | Wenn TIA unvollständig — keine ausreichende Garantie. | Beide: TIA-Vorlage mit Begründung der Schutzmaßnahmen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |
| `keine_drittstaaten` | Vertraglicher Ausschluss aller Drittstaatentransfers | "Keine Verarbeitung außerhalb EU/EWR." Strengste Variante. | low (rechtlich) / hoch (operational) | Maximale Sicherheit; aber praktisch oft unmöglich (US-Auth, US-CDN, US-Tooling). | Wenn Anbieter doch US-Tools einsetzt — Vertragsbruch. | EK: Spezifische Allowlist mit zugelassenen Tools. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults** (nur wenn `containsPersonalData!=nein`):
  - sicher: `tadpf_certified`
  - ausgewogen: `tadpf_certified`
  - durchsetzungsstark: `eu_only`

---

### § 7 — Sicherheits- und Compliance-Standards
- **Key**: `security_compliance`
- **Importance**: high
- **Beschreibung**: DSGVO Art. 32 — Stand der Technik. NIS2 — C-SCRM. Bei Hochrisiko-AI EU AI Act-Konformität.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `eigen_definitions` | Eigene Sicherheitsmaßnahmen ohne Zertifizierung | Anbieter beschreibt TOM individuell, ohne Drittzertifizierung. | high | Schwer zu prüfen; bei Audit nur Selbstauskunft. | EK: Bei Datenpanne — fehlende Zertifizierung erhöht Haftung EK. | EK: Mindeststandard ISO 27001 verlangen. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `iso_27001` | ISO/IEC 27001 zertifiziert | International anerkannter Standard für ISMS. Audit-Bericht jährlich. | low | Marktstandard. Konformitätsnachweis nach DSGVO Art. 32. | Wenn Zertifizierung ausläuft — Vertragsverletzung. | EK: Prüfung Re-Zertifizierung jährlich. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `soc2_iso_bsi` | ISO 27001 + SOC 2 Type II + BSI C5 (für DACH-Cloud) | Multi-Standard-Compliance; SOC 2 für US-orientierte EK; BSI C5 für deutsche Behörden/KRITIS. | low (für EK) | Höchste Stufe. Anbieter: hohe Aufwand. | Anbieter: hohe laufende Audit-Kosten. | EK: TADPF-Zertifizierung zusätzlich verlangen wenn US. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `branchen_spezifisch` | Branchenspezifische Compliance (HIPAA, PCI-DSS, KRITIS-Audits) | Je nach Branche zusätzliche Standards. | medium | Komplex; oft teuer. Für regulierte Branchen Pflicht. | Wenn Branchenstandard nicht erfüllt — Strafen Aufsichtsbehörde. | Beide: gemeinsame Audit-Roadmap. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `eigen_definitions`
  - ausgewogen: `iso_27001`
  - durchsetzungsstark: `soc2_iso_bsi`

---

### § 8 — Vertragsdauer, Verlängerung und Kündigung
- **Key**: `term_termination`
- **Importance**: critical
- **Beschreibung**: § 309 Nr. 9 BGB i.d.F. FairKfG (seit 01.03.2022): Bei B2C max. 2 Jahre Erstlaufzeit, automatische Verlängerung nur unbefristet mit max. 1 Monat Kündigungsfrist.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `36_monate_b2b` | 36 Monate Erstlaufzeit (B2B), Verlängerung um 12 Monate, 3 Mon Kündigung | Lange Bindung; B2B grundsätzlich zulässig (§ 307 BGB Inhaltskontrolle). | medium | Bei B2C (§ 309 Nr. 9) **unwirksam**. Bei B2B AGB-Recht: 36 Mon zulässig, aber 12 Mon Auto-Renewal kritisch. | EK: lange Bindung, schwierige Exit. | EK: Sonderkündigungsrecht bei Insolvenz/Übernahme. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `24_monate_1_mon` | 24 Monate Erstlaufzeit, Verlängerung unbefristet, monatlich kündbar | FairKfG-konform für B2C; für B2B fairer Standard. | low | Erfüllt § 309 Nr. 9 BGB (B2C). | Selten Streit. | — | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `12_monate_1_mon` | 12 Monate Erstlaufzeit, dann monatlich kündbar | Kürzere Bindung, hohe Flexibilität EK. | low | EK-freundlich. | Anbieter: höheres Churn-Risiko. | Anbieter: Wechselgebühr bei vorzeitiger Kündigung. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `monthly_no_minimum` | Monatlich, jederzeit kündbar | Maximale Flexibilität EK. | low | EK-extrem freundlich. | Anbieter: keine Planungssicherheit. | Anbieter: Pay-as-you-go-Aufschlag. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `36_monate_b2b` (B2B) / `24_monate_1_mon` (B2C)
  - ausgewogen: `24_monate_1_mon`
  - durchsetzungsstark: `12_monate_1_mon`

---

### § 9 — Preisanpassung
- **Key**: `price_adjustment`
- **Importance**: high
- **Beschreibung**: BGH XI ZR 183/23 (09.04.2024) — Preisanpassungsklauseln müssen klar berechenbar sein. Standardvariante: VPI-Indexierung mit Cap.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_anpassung` | Festpreis ohne Anpassung | Preis bleibt für gesamte Vertragslaufzeit konstant. | low (für EK) | EK-freundlich. Anbieter: Inflationsrisiko bei langlaufenden Verträgen. | Bei mehrjähriger hoher Inflation — Anbieter wirtschaftlich belastet. | Anbieter: max. Vertragslaufzeit reduzieren. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `vpi_mit_cap` | VPI-Anpassung mit Cap (max. 5 %/Jahr) + Sonderkündigungsrecht | Anpassung an Verbraucherpreisindex Statistisches Bundesamt; Erhöhung max. 5 %/Jahr; Sonderkündigung bei Erhöhung > 3 %. | low | BGH-konform; transparent; fair. | Wenn VPI-Schwankung außer Cap-Bereich — Anpassung verzögert. | Cap angemessen wählen (3–7 %). | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `einseitig_anbieter` | Einseitige Anpassung durch Anbieter, 60 Tage Vorankündigung | Anbieter darf nach Mitteilung Preis ändern; EK kann kündigen. | medium | Bei B2C oft als unangemessen benachteiligend (§ 307 BGB) angesehen — kein klarer Anpassungsmaßstab. BGH XI ZR 183/23: ohne Berechnungsformel unwirksam. | Klausel kippt; gesetzliche Regelung greift (keine Anpassung möglich). | Anbieter: stets mit klarem Index + Cap. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `cost_pass_through` | Kostendurchreichung (Cloud-Provider-Erhöhungen 1:1) | Wenn AWS/Azure-Kosten steigen, weitergegeben mit 30 Tage Vorankündigung. | medium | Modern, aber transparent dokumentationspflichtig. EK: Schwer überprüfbar. | Wenn Cost-Pass-Through-Berechnung nicht prüfbar — § 307 BGB. | EK: Audit-Recht der Cost-Berechnung. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `einseitig_anbieter` (mit Risiko-Hinweis)
  - ausgewogen: `vpi_mit_cap`
  - durchsetzungsstark: `keine_anpassung`

---

### § 10 — Datenrückgabe und Datenmigration bei Vertragsende
- **Key**: `data_return`
- **Importance**: high
- **Beschreibung**: DSGVO Art. 20 (Datenportabilität) für Personendaten. Vertragliche Regelung für Geschäftsdaten erforderlich. Schutz vor Vendor-Lock-in.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_garantierte_rueckgabe` | Keine garantierte Rückgabe | Anbieter sichert nur DSGVO-Mindeststandard für Personendaten zu; Geschäftsdaten ggf. verloren. | high (für EK) | Vendor-Lock-in. Bei Insolvenz Anbieter — Datenverlust. | Bei Vertragsende — keine vollständigen Daten zurück. | EK: vollständige Rückgabe + Format einfordern. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `csv_json_30_tage` | Datenexport in CSV/JSON, innerhalb 30 Tagen nach Kündigung | Strukturierte Daten in offenem Format. | low | Marktstandard. | Wenn Datenstruktur komplex (Beziehungen) — CSV verliert Information. | EK: Schemadokumentation zusätzlich verlangen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `vollstaendig_format_wahl_60` | Vollständige Daten + Schema in Format der EK-Wahl, 60 Tage | EK wählt Format (CSV/JSON/SQL/Parquet); Schema-Dokumentation; 60 Tage Übergangsphase mit Lese-Zugriff. | low (für EK) | EK-freundlich. Anbieter: Aufwand für Format-Konvertierung. | Anbieter: ggf. Aufwand-Abrechnung. | EK: Migrationssupport durch Anbieter (Stundenkontingent). | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `migration_assist` | Datenexport + aktive Migrationsunterstützung (10 PT) | Anbieter unterstützt Migration zum Nachfolger-System mit definiertem Stundenkontingent. | low (für EK) | Maximaler Schutz vor Lock-in. Premium-Variante. | Anbieter: hoher Aufwand. | Anbieter: gegen Aufschlag im Initialvertrag. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `keine_garantierte_rueckgabe`
  - ausgewogen: `csv_json_30_tage`
  - durchsetzungsstark: `vollstaendig_format_wahl_60`

---

### § 11 — Haftung
- **Key**: `liability`
- **Importance**: high
- **Beschreibung**: § 309 Nr. 7 BGB — kein Haftungsausschluss für Vorsatz/grobe Fahrlässigkeit/Personenschäden in AGB. ProdHaftG bleibt unberührt.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `gesetzlich` | Gesetzliche Haftung BGB | Volle Haftung nach BGB — auch leichte Fahrlässigkeit. | medium | EK-freundlich; Anbieter unbegrenzt haftbar bei Datenverlust/Geschäftsausfall. | Bei großem Folgeschaden — Anbieter ruinös. | Anbieter: Berufshaftpflicht zwingend. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `cap_jahresgebuehr` | Cap auf Jahresgebühr | Haftungsobergrenze = bezahlte Jahresgebühr; bei Vorsatz/grober Fahrlässigkeit/Personenschäden unbegrenzt. | low | AGB-konform B2B. Marktstandard. | Bei großem Schaden des EK weit über Jahresgebühr — EK trägt Differenz. | EK: Cap auf 24 Monate erhöhen oder Cyber-Versicherung Anbieter. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `cap_typischer_schaden` | Cap auf typischen vorhersehbaren Schaden | "Haftung für leichte Fahrlässigkeit auf typischen, vorhersehbaren Schaden." | low | AGB-konform. § 309 Nr. 7 beachtet. | Wenn Schadenshöhe untypisch — Streit über "typisch". | Beide: Beispiele für typischen Schaden im Vertrag dokumentieren. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `mit_cyber_insurance` | Volle Haftung + zwingende Cyber-Versicherung Anbieter | Anbieter muss Cyber-Versicherung mit min. 5 Mio EUR Deckung nachweisen. | low (für EK) | Risk-Transfer auf Versicherung. EK-freundlich. | Anbieter: Versicherungsprämie steigt mit Risiko-Profil. | EK: Versicherungs-Police-Nachweis verlangen. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults**:
  - sicher: `cap_typischer_schaden`
  - ausgewogen: `cap_jahresgebuehr`
  - durchsetzungsstark: `mit_cyber_insurance`

---

### § 12 — Source Code Escrow (Hinterlegung)
- **Key**: `source_escrow`
- **Importance**: medium (relevant bei kritischer Software / On-Premises)
- **Beschreibung**: Schutz EK vor Insolvenz Anbieter — Quellcode-Hinterlegung bei neutralem Treuhänder mit Freigabebedingungen.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_escrow` | Keine Hinterlegung | Bei Anbieter-Insolvenz kein Zugriff auf Quellcode. | high (für EK bei kritischer Software) | Bei On-Premises mit Wartungsvertrag — Software wird nicht mehr gewartet. | Anbieter-Insolvenz; Software wird nutzlos. | EK: Escrow für kritische Software fordern. | sicher: true, ausgewogen: true, durchsetzungsstark: false |
| `dual_party_escrow` | Zwei-Parteien-Escrow bei DEAL/EscrowEurope | Quellcode + Build-Doku bei Treuhänder; Freigabe bei Insolvenz/Vertragsverletzung. | low | Marktstandard für kritische On-Premises-Software. | Wenn Build-Doku unvollständig — Code unbrauchbar. | Beide: jährliche Verifikationsprüfung. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `jaehrliche_verifikation` | Escrow + jährliche Verifikation | Treuhänder prüft jährlich, ob hinterlegter Code lauffähig ist. | low (für EK) | Höchste Sicherheit. | Anbieter: Aufwand und Kosten. | EK: bei kritischer Software unbedingt. | sicher: false, ausgewogen: false, durchsetzungsstark: true |
| `nur_saas_kein_escrow` | Bei SaaS technisch nicht sinnvoll | SaaS = kontinuierliche Bereitstellung, Quellcode-Hinterlegung nutzlos ohne Infrastruktur. | low | Bei SaaS Standard. | Bei Anbieter-Insolvenz und Plattform-Aus — keine Hilfe. | Alternative: Datenexport + offene API als Continuity. | sicher: false, ausgewogen: false (SaaS-default), durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `keine_escrow` (SaaS) / `dual_party_escrow` (On-Prem)
  - ausgewogen: `keine_escrow` (SaaS) / `dual_party_escrow` (On-Prem)
  - durchsetzungsstark: `dual_party_escrow`

---

### § 13 — AI-Compliance (EU AI Act ab 02.08.2026)
- **Key**: `ai_compliance`
- **Importance**: critical (wenn `containsAI != nein`)
- **Beschreibung**: VO 2024/1689 — Pflichten gestaffelt. Hochrisiko-AI ab 02.08.2026: Konformitätsbewertung, technische Doku, menschliche Aufsicht, EU-Datenbankregistrierung.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `keine_ai` | Software enthält keine AI-Funktionen | EU AI Act nicht anwendbar. | low | Selbsterklärung des Anbieters dokumentieren. | Wenn doch AI-Komponenten — Verstoß bei Hochrisiko. | Anbieter: AI-Bestandsaufnahme schriftlich. | sicher: false, ausgewogen: false (Default wenn keine AI), durchsetzungsstark: false |
| `minimal_ohne_pflichten` | Minimales/begrenztes Risiko, Transparenzpflicht | Anbieter erklärt AI-Komponenten transparent (Chatbot-Hinweis, AI-Watermark bei Bildgenerierung). | low | EU AI Act Art. 50 Transparenzpflichten. | Wenn Transparenz fehlt — Bußgeld bis 15 Mio EUR. | Anbieter: AI-Hinweise in UI sichtbar machen. | sicher: false, ausgewogen: true, durchsetzungsstark: false |
| `high_risk_konformitaet` | Hochrisiko-AI mit Konformitätsbewertung + CE-Kennzeichnung | Volle Compliance: Konformitätsbewertung, technische Doku, menschliche Aufsicht, Risikomanagement, EU-Datenbankregistrierung. | low | Pflicht ab 02.08.2026 für Hochrisiko-AI. Anbieter trägt Hauptlast als "Anbieter" iSd Art. 16 AI Act. | Wenn nicht erfüllt — Bußgeld bis 35 Mio EUR / 7 % weltw. Umsatz. | Beide: gemeinsame Compliance-Roadmap mit klarer Verantwortungsverteilung. | sicher: true, ausgewogen: false, durchsetzungsstark: true |
| `ai_freistellung_haftung` | EK fordert Freistellung von AI-Act-Bußgeldern + Audit-Recht | Anbieter haftet für eigene Pflichtverletzungen; EK kann Audit verlangen. | low (für EK) | EK-freundlich; AI-Compliance-Risiko-Transfer. | Anbieter: hohe Haftungsexposition. | Anbieter: Cap auf 24-Monats-Gebühr für AI-Compliance-Schäden. | sicher: false, ausgewogen: false, durchsetzungsstark: true |

- **Smart Defaults** (basierend auf `containsAI`-Feld):
  - `nein` → `keine_ai`
  - `minimal`/`limited` → `minimal_ohne_pflichten` (alle Modi)
  - `high_risk` → `high_risk_konformitaet` (alle Modi); `durchsetzungsstark`: `ai_freistellung_haftung`

---

### § 14 — Schlussbestimmungen (Gerichtsstand, anwendbares Recht, Schriftform)
- **Key**: `final_provisions`
- **Importance**: medium
- **Beschreibung**: Standard-Schlussbestimmungen mit AGB-Konformitätshinweisen.

| Option | Label | Beschreibung | Risk | RiskNote | WhenProblem | WhenNegotiate | Recommended |
|--------|-------|--------------|------|----------|-------------|---------------|-------------|
| `de_recht_beklagter` | Deutsches Recht, Gerichtsstand am Sitz Beklagter | § 12 ZPO; CISG-Ausschluss. | low | Faire Standard-Lösung. | — | — | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `anbieter_sitz` | Gerichtsstand am Sitz Anbieter | Anbieter-freundlich; Skalierungsvereinheitlichung. | medium | Bei B2B § 38 ZPO zulässig; bei B2C nur unter Voraussetzungen § 38 Abs. 3 ZPO. | EK muss anreisen. | EK: Schiedsgericht (DIS, ICC) oder neutraler Ort. | sicher: true, ausgewogen: false, durchsetzungsstark: false |
| `schriftform_textform` | Textform (E-Mail) für Änderungen ausreichend | Praktisch; entspricht modernen Workflows. | low | § 126b BGB; sicher gerichtsverwertbar mit Header-Beweis. | Selten. | — | sicher: false, ausgewogen: true, durchsetzungsstark: true |
| `schiedsklausel_dis` | DIS-Schiedsklausel | Streitigkeiten vor DIS (Deutsche Institution für Schiedsgerichtsbarkeit). | medium | Schnell, vertraulich. § 1031 ZPO Schriftform. | Bei niedrigen Streitwerten unverhältnismäßig teuer (Schiedsgebühren). | Nur bei großen Verträgen. | sicher: false, ausgewogen: false, durchsetzungsstark: false |

- **Smart Defaults**:
  - sicher: `anbieter_sitz`
  - ausgewogen: `de_recht_beklagter`
  - durchsetzungsstark: `de_recht_beklagter`

---

## 6 · Anwaltsperspektive — kritische Hinweise

1. **SaaS = Mietvertrag, nicht Lizenzvertrag** (BGH XII ZR 120/04). Konsequenz: Mietminderung kraft Gesetzes bei Mängeln, keine Erschöpfung wie bei Sachkauf. Das verändert die Hebel für den Endkunden bei Verfügbarkeitsproblemen erheblich.
2. **AVV ist kein nice-to-have, sondern Pflicht** (DSGVO Art. 28). Selbst bei "nur Login-Daten" werden Personendaten verarbeitet. Fehlende AVV = Datenschutzverstoß für **beide** Parteien — bis zu 20 Mio EUR oder 4 % Jahresumsatz.
3. **Drittlandtransfer bleibt das Hochrisiko-Thema.** TADPF (Adäquanzbeschluss seit 10.07.2023) ist Schrems-anfechtungsbedroht. Praxisempfehlung: TADPF nutzen + parallel SCC + TIA als Backup; bei kritischer Verarbeitung EU-Only-Strategie verfolgen.
4. **§ 309 Nr. 9 BGB n.F. (FairKfG ab 01.03.2022) ist striktes B2C-Korsett.** Klassische "12 Monate Erstlaufzeit + Auto-Renewal um 12 Monate + 3 Monate Kündigungsfrist"-Klauseln sind in B2C **unwirksam**. Erstlaufzeit max. 2 Jahre, Verlängerung nur unbefristet mit max. 1 Monat Kündigungsfrist.
5. **Kündigungsbutton (§ 312k BGB seit 01.07.2022).** Bei Online-Vertragsschluss B2C: gleichwertiger Online-Kündigungsweg, "Kündigungsbutton" deutlich sichtbar. Verstoß = Verbraucher kann jederzeit kündigen.
6. **Verfügbarkeit ist Beschaffenheit.** SLA-Versprechen (z.B. 99,9 %) wird Vertragsbestandteil; Unterschreitung = Mangel mit gesetzlicher Mietminderung (§ 536 BGB). Service Credits sind keine "Lieferung statt Mängelrechte" — sie ergänzen, ersetzen die gesetzlichen Rechte nicht.
7. **Subprozessoren-Compliance.** LG Köln 23.03.2023: Pauschale Subprozessor-Beauftragung ohne Zustimmungsrecht des AG ist unwirksam. Empfehlung: Subprozessor-Liste online + 30 Tage Vorankündigung + Widerspruchsrecht mit Sonderkündigung bei wichtigem Grund.
8. **Preisanpassungsklauseln müssen berechenbar sein** (BGH XI ZR 183/23). Klauseln wie "Anbieter darf Preis erhöhen" ohne Index, Formel oder Cap sind unwirksam. Best Practice: VPI-Indexierung mit explizitem Cap (5 %/Jahr) + Sonderkündigungsrecht bei Erhöhung über 3 %.
9. **EU AI Act ab 02.08.2026** für Hochrisiko-AI. SaaS mit AI-Komponenten in Bewerbermanagement/Bonität/Bildung/Strafverfolgung → Pflichten zu Konformitätsbewertung, technischer Doku, EU-Datenbankregistrierung, menschlicher Aufsicht. Strafen bis 35 Mio EUR / 7 % weltw. Umsatz. Vertraglich klar regeln, ob Anbieter (Provider iSd AI Act) oder EK (Deployer) welche Pflichten trägt.
10. **NIS2 (06.12.2025) reicht in SaaS-Verträge durch.** Wichtige/besonders wichtige Einrichtungen müssen ihre Lieferkette absichern (C-SCRM). Audit-Rechte, Meldepflichten, Schulungs-Nachweise vertraglich verankern.
11. **Source Code Escrow nur bei On-Premises sinnvoll.** Bei SaaS funktionslos ohne Infrastruktur. Stattdessen: API-Continuity, Datenexport-Garantie, Open-Source-Komponenten-Liste.
12. **Datenrückgabe vermeidet Vendor-Lock-in.** Pflicht zur Bereitstellung in offenem maschinenlesbarem Format (CSV, JSON, Parquet) + Schema-Doku innerhalb klarer Frist. DSGVO Art. 20 deckt nur Personendaten ab — Geschäftsdaten brauchen vertragliche Regelung.
13. **AGB-Recht in B2B und B2C.** § 310 BGB lockert für B2B; § 307 BGB greift weiter. Selbst in B2B: Klauseln, die "von wesentlichen Grundgedanken der gesetzlichen Regelung abweichen", sind unwirksam.
14. **Open Source Compliance.** Bei Verwendung von OSS-Komponenten Pflicht zur Lieferung der SBOM (Software Bill of Materials). Bei GPL: Copyleft-Risiko für eigene Software. Zertifikat des Anbieters einfordern.
15. **Bilanzielle Behandlung Cloud-Software** (BFH XI R 1/21): i.d.R. sofort abzugsfähiger Aufwand, nicht aktivierungspflichtiges Wirtschaftsgut. Relevante Information für CFOs der Endkunden.

---

## 7 · Quellen

**BGH-Rechtsprechung:**
- BGH 15.11.2006 — XII ZR 120/04 (ASP-Vertrag = Mietvertrag)
- BGH 04.03.2010 — III ZR 79/09 (Internet-System-Vertrag)
- BGH 23.07.2009 — VII ZR 151/08 (Software-Erstellung Werkvertrag)
- BGH 23.03.2010 — VI ZR 57/09 (Online-Banking-Verfügbarkeit)
- BGH 17.07.2013 — I ZR 129/08 (UsedSoft II)
- BGH 11.12.2014 — I ZR 8/13 (UsedSoft III)
- BGH 25.10.2022 — XI ZR 220/21 (Preisanpassungsklauseln)
- BGH 09.04.2024 — XI ZR 183/23 (VPI-Anpassung mit Cap)
- BGH 06.07.2022 — VIII ZR 155/21 (Berechenbarkeit Preisanpassung)

**EuGH:**
- EuGH 03.07.2012 — C-128/11 (UsedSoft I)
- EuGH 06.10.2015 — C-362/14 (Schrems I)
- EuGH 16.07.2020 — C-311/18 (Schrems II)
- EuGH 22.04.2020 — C-329/19 (TIA-Pflicht)
- EuGH 04.05.2023 — C-487/21 (Recht auf Kopie)
- EuGH 07.03.2024 — C-604/22 (IAB Europe / Cookie-Consent)

**Untergerichte:**
- OLG Frankfurt 16.01.2025 (Softwareentwicklung Dienstvertrag)
- OLG München 03.06.2021 — 7 U 4338/20 (SaaS-Mängel)
- LG Köln 23.03.2023 — 14 O 277/22 (Subprozessor-Klausel unwirksam)
- BVerwG 16.07.2024 — 6 C 5.22 (BSI-Cloud-Anforderungen öffentlicher Sektor)
- BFH 27.04.2022 — XI R 1/21 (Bilanzielle Behandlung Cloud-Software)

**EU-/Bundes-Gesetze:**
- BGB §§ 305–310, §§ 535ff, §§ 631ff, §§ 611ff, § 309 Nr. 9 (FairKfG ab 01.03.2022), § 312k (Kündigungsbutton)
- UrhG §§ 31, 69a–69g
- DSGVO (insbes. Art. 5, 6, 7, 28, 32, 44ff)
- BDSG, TTDSG
- VO 2024/1689 (EU AI Act, gestaffelt in Kraft)
- Richtlinie 2022/2555 (NIS2) / NIS2-Umsetzungsgesetz vom 06.12.2025
- TADPF (EU-Komm. Adäquanzbeschluss 10.07.2023)
- DORA (VO 2022/2554, Finanzbranche)
- GeschGehG, ProdHaftG

**Web-Quellen:**
- [SaaS Vertrag — Software as a Service Fachanwalt (LL-IP)](https://ll-ip.com/aktuelles/saas-vertrag-software-as-a-service-fachanwalt-de/)
- [SaaS-Verträge: Einordnung und Möglichkeiten (SRD-Rechtsanwälte)](https://www.srd-rechtsanwaelte.de/blog/saas-vertraege-einordnung-moeglichkeiten)
- [SaaS-Verträge — Hoffmann Liebs](https://www.hoffmannliebs.de/unkategorisiert/saas-vertraege-chancen-herausforderungen-und-die-vermeidung-rechtlicher-fallstricke/)
- [Heydn — SaaS Probleme und Vertragsgestaltung (TCI Law)](https://www.tcilaw.de/wp-content/uploads/2022/03/Software-as-a-Service-SaaS-Probleme-und-Vertragsgestaltung-beck-online.pdf)
- [Trusted Cloud Vertragsleitfaden](https://www.trusted-cloud.de/sites/default/files/ap_3_vertragsleitfaden.pdf)
- [Faire Verbraucherverträge (BMJV)](https://www.bmjv.de/SharedDocs/Meldungen/DE/2022/0228_faire_Verbrauchervertraege.html)
- [§ 309 Nr. 9 BGB n.F. (LIEB.Rechtsanwälte)](https://www.lieb-online.com/aktuelles/gesetzesaenderung-des-309-nr-9-bgb-neue-regeln-zur-kuendigung-und-vertragsverlaengerung-in-b2c-dauerschuldverhaeltnissen/)
- [TADPF — Antwort auf Schrems II (Dr. Datenschutz)](https://www.dr-datenschutz.de/trans-atlantic-data-privacy-framework-antwort-auf-schrems-ii/)
- [TADPF — Schrems III? (Dr. Datenschutz)](https://www.dr-datenschutz.de/trans-atlantic-data-privacy-framework-bald-schrems-iii/)
- [EU AI Act Hochrisiko ab August 2026 (advisori.de)](https://www.advisori.de/blog/eu-ai-act-august-2026-hochrisiko-compliance-countdown)
- [EU AI Act Pflichten für IT-Dienstleister (kileague.de)](https://www.kileague.de/blog/eu-ai-act-august-2026-it-dienstleister)
- [NIS2-Umsetzungsgesetz Deutschland 2025 (OpenKRITIS)](https://www.openkritis.de/it-sicherheitsgesetz/nis2-umsetzung-gesetz-cybersicherheit.html)
- [NIS2 in Kraft seit 06.12.2025 (Borns IT- und Windows-Blog)](https://borncity.com/blog/2025/12/06/ab-heute-6-dez-2025-gilt-die-nis-2-richtlinie-in-deutschland/)
- [OLG Frankfurt — Softwareentwicklung als Dienstvertrag (BBS Rechtsanwälte)](https://bbs-law.de/2025/01/olg-frankfurt-a-m-softwareentwicklung-als-dienstvertrag/)

Stand: 29.04.2026

# SaaS & Software Reseller — Playbook-Konzept

> **Stand:** 29.04.2026
> **Status:** Recherche-Konzept (Phase 1) — wartet auf Code-Implementation
> **Cluster:** Software/IP
> **Komplexität:** Sehr hoch (Channel-Vertrieb B2B, Kartellrecht, Lizenzkette)

---

## Metadaten

| Feld | Wert |
|------|------|
| **Slug** | `softwareVertrieb` |
| **Title** | SaaS- & Software-Reseller-Vertrag (Channel-Vertrieb) |
| **Description** | Regelt den indirekten Vertrieb von Software/SaaS-Lizenzen über Distributoren oder Reseller — Hersteller (Vendor) räumt einem Vertriebspartner Vertriebsrechte ein. |
| **Difficulty** | komplex |
| **Estimated Time** | 18–25 Minuten |
| **Icon** | `network` (lucide) |
| **Legal Basis** | BGB §§ 145 ff., §§ 433 ff. (Kaufrecht analog für Lizenzen), §§ 535 ff. (SaaS-Mietrecht), HGB §§ 84–92c (Handelsvertreter analog), UrhG §§ 31, 32 a, 34, 35, GWB § 1, Verordnung (EU) 2022/720 (Vertikal-GVO), Verordnung (EU) 316/2014 (TT-GVO), Datenschutz-Grundverordnung (Art. 26, 28), EU Data Act (VO 2023/2854), AGB-Recht §§ 305–310 BGB |

---

## 1 · Rechtlicher Hintergrund

### 1.1 Vertragstypologische Einordnung

Der Software-Reseller-Vertrag ist in Deutschland ein **typengemischter Vertrag sui generis**. Je nach Ausgestaltung dominieren Elemente aus:

- **Lizenzvertrag** (UrhG §§ 31 ff.) — wenn der Reseller eigene Nutzungs-/Vertriebsrechte erhält
- **Vertriebsvertrag / Eigenhändlervertrag** — wenn der Reseller Lizenzen auf eigene Rechnung weiterveräußert (BGB §§ 433 analog)
- **Handelsvertretervertrag** (HGB §§ 84 ff.) — wenn der Reseller im Namen des Vendors vermittelt → Achtung: zwingendes Recht, insbesondere Ausgleichsanspruch (§ 89b HGB)
- **Kommissionsvertrag** (HGB §§ 383 ff.) — selten, aber denkbar bei kommissionsweisem Lizenzverkauf

> **Rechtsfolge:** Die korrekte Einordnung hat erhebliche Konsequenzen. Wird ein "Reseller" tatsächlich wie ein Handelsvertreter eingebunden (Berichtspflichten, Weisungsabhängigkeit, fester Provisionsstruktur), kann § 89b HGB analog Anwendung finden — mit erheblichem Ausgleichsanspruch bei Vertragsende. Die Klausel "Der Reseller handelt im eigenen Namen und auf eigene Rechnung" ist Pflicht, aber nicht ausreichend, wenn die tatsächliche Durchführung dem widerspricht (BGH NJW 1998, 71).

### 1.2 Aktuelle Rechtsprechung & Gesetzeslage

#### UsedSoft / Erschöpfungsgrundsatz

- **EuGH UsedSoft (C-128/11, 03.07.2012):** Erschöpfungsgrundsatz gilt auch für unkörperlich vertriebene Software (Download). Erstkäufer darf die Lizenz weiterveräußern, wenn er die Eigennutzung beendet.
- **BGH UsedSoft II (I ZR 129/08, 17.07.2013):** Setzt EuGH-Vorgaben in deutsches Recht um — vertragliche Weiterveräußerungsverbote sind unwirksam.
- **BGH UsedSoft III (I ZR 8/13, 11.12.2014):** Auch Volumenlizenzen dürfen aufgespaltet weiterveräußert werden, wenn der Erstkäufer die abgegebenen Lizenzen tatsächlich nicht mehr nutzt.

> **Konsequenz für Reseller-Verträge:** Klauseln, die dem Reseller die Weiterveräußerung an Endkunden untersagen oder zwingend an Geschäftsbedingungen koppeln, sind unwirksam, sobald die Erschöpfung eingetreten ist (= körperliche Übergabe oder zeitlich unbegrenzter Download zum Vollpreis). **Subscription-/SaaS-Modelle sind hiervon NICHT betroffen** (EuGH SAS Institute, C-406/10).

#### Vertikal-GVO 2022/720 (in Kraft seit 01.06.2022, gilt bis 31.05.2034)

Die EU-Vertikal-GVO 2022/720 regelt vertikale Vereinbarungen (Vendor → Reseller). Schwerpunkte für Software-Channel:

| Was ist erlaubt? | Was ist verboten (Kernbeschränkungen)? |
|---|---|
| Selektives Vertriebssystem (Reseller-Auswahl nach qualitativen Kriterien) | **Preisbindung** der zweiten Hand (RPM = resale price maintenance) — sowohl Mindest- als auch Festpreise |
| Exklusiver Gebietsschutz für maximal **5 Reseller** pro Gebiet/Kundenkreis | **Aktiver Gebietsschutz**, der über zulässiges Maß hinausgeht |
| Beschränkung des aktiven Verkaufs in andere Vertragsgebiete | Verbot des **passiven Verkaufs** an Endkunden in anderen Gebieten |
| Markenschutz, Qualitätsstandards | Beschränkung des **Online-Vertriebs** als Gesamtverbot |
| Wettbewerbsverbote bis 5 Jahre Vertragsdauer | Wettbewerbsverbote, die über Vertragsende hinausgehen (max. 1 Jahr nach Ende, gebietsbeschränkt) |

> **Marktanteilsschwelle:** Vendor und Reseller dürfen jeweils nicht mehr als **30 % Marktanteil** auf dem relevanten Markt halten, sonst entfällt die Gruppenfreistellung und die Vereinbarung muss einzeln auf Vereinbarkeit mit Art. 101 AEUV geprüft werden.

#### EU Data Act (Verordnung 2023/2854, anwendbar seit 12.09.2025)

- **Cloud-Switching-Pflicht:** SaaS-Vendoren müssen vertragliche, technische und organisatorische Hindernisse beim Anbieterwechsel beseitigen
- **Maximale Kündigungsfrist** für Cloud-Verträge: 2 Monate
- **Datenmigration** in maximal 30 Tagen
- **Switching-Gebühren** ab 12.01.2027 vollständig verboten (bis dahin nur kostendeckend zulässig)
- **Bußgelder:** bis zu 20 Mio. EUR oder 4 % weltweiter Jahresumsatz

> **Pass-Through-Pflicht:** Reseller müssen diese Pflichten an Endkunden weiterreichen — die Verantwortung gegenüber dem Endkunden trifft beide Glieder der Kette.

#### EU AI Act (Verordnung 2024/1689, gestaffelte Anwendung)

- **Verbote** seit 02.02.2025 (KI mit unannehmbarem Risiko)
- **GPAI-Pflichten** seit 02.08.2025
- **Hochrisiko-KI** ab 02.08.2026 vollständig anwendbar
- **Bußgelder:** bis zu 35 Mio. EUR oder 7 % weltweiter Jahresumsatz

> **Reseller-Konsequenz:** Wenn die vertriebene Software KI-Komponenten enthält, muss der Reseller die CE-Kennzeichnung und technische Dokumentation vor Vertragsschluss vom Vendor einfordern und an Endkunden weitergeben. Vertragsklauseln zur Bias-Vermeidung, Datenqualität und Haftung bei algorithmischen Fehlentscheidungen werden Pflichtbestandteil.

#### NIS2-Richtlinie (in Deutschland seit Dezember 2025 in Kraft)

- **Lieferkettensicherheit** als Pflichtthema: Vendor + Reseller + ggf. Sub-Reseller
- **Sicherheitsnachweise** und Zertifikate (z.B. BSI C5, ISO 27001) entlang der Wertschöpfungskette
- **24/7-Kontakt, Vorfallmeldung, Patch-Management** vertraglich vereinbaren

#### AGB-Inhaltskontrolle in IT-Verträgen

- **§ 307 BGB:** Selbst im B2B-Bereich gilt eingeschränkte AGB-Kontrolle. Klauseln, die den Vertragszweck gefährden (Beschränkung von Kardinalpflichten), sind unwirksam.
- **§ 309 Nr. 7 BGB:** Haftungsausschluss für Vorsatz, grobe Fahrlässigkeit, Personenschäden in AGB grundsätzlich unwirksam (auch B2B als Indiz für Unangemessenheit).
- **§ 308 Nr. 4 BGB:** Einseitige Leistungsänderungsvorbehalte sind nur eingeschränkt zulässig.

### 1.3 Risiken bei fehlerhafter Gestaltung

| Risiko | Folge |
|--------|-------|
| Preisbindung gegenüber Reseller | Bußgelder bis 10 % Konzernumsatz (§ 81 GWB), Klauselnichtigkeit |
| Reseller als Scheinhandelsvertreter | Ausgleichsanspruch § 89b HGB (oft 6-stellig) am Vertragsende |
| Sublizenzrecht ohne Vendor-Zustimmung | Urheberrechtsverletzung gegenüber Endkunden, Schadensersatz nach UrhG § 97 |
| Fehlende AVV (DSGVO) zwischen Vendor & Reseller | Bußgelder DSGVO Art. 83 (bis 4 % Jahresumsatz), gemeinsame Verantwortung Art. 26 |
| Pass-Through unzulässiger Vendor-AGB an Endkunden | Reseller haftet selbst, da er als Verwender auftritt (§ 305 Abs. 1 BGB) |
| Fehlende EU-Data-Act-Kompatibilität ab 12.09.2025 | Bußgelder bis 20 Mio. EUR oder 4 % Umsatz |

---

## 2 · Rollen-Definition

| Rolle | Schlüssel | Beschreibung |
|-------|-----------|--------------|
| **A — Vendor / Hersteller** | `vendor` | Inhaber der IP-Rechte an der Software/SaaS. Räumt Vertriebsrechte ein. Trägt Produktverantwortung, Datenschutz-Hauptlast, ggf. CE-Kennzeichnung. |
| **B — Reseller / Distributor** | `reseller` | Vertriebspartner. Verkauft die Lizenzen/Subscriptions im eigenen Namen oder als Vermittler. Trägt Markterschließungs-, Marketing- und (oft) First-Level-Support-Kosten. |

> **Hinweis:** Der "Distributor" (zweistufiger Vertrieb: Vendor → Distributor → Reseller → Endkunde) ist dem "Reseller" rechtlich gleichgestellt; das Playbook deckt beide Rollen ab. Wenn ein Sub-Reseller-Recht besteht, wird das in Sektion 5 (Sublizenzierung) abgebildet.

---

## 3 · Modi-Bedeutung (vertragsspezifisch)

| Modus | Begünstigt | Konkrete Auswirkung im Reseller-Vertrag |
|-------|-----------|------------------------------------------|
| **Sicher** | Pro **Vendor** | Enge Sublizenzkontrolle, kein/begrenzter Gebietsschutz für Reseller, hohe Mindestabnahme, strikte Markennutzungsregeln, Vendor-AGB binden Reseller, kurze Kündigungsfrist zugunsten Vendor, Audit-Recht für Vendor, Haftung des Resellers für Endkunden-Verstöße. |
| **Ausgewogen** | Marktstandard | Selektives Vertriebssystem, faire Marge (typisch 25–40 %), Deal-Registration für gemeinsamen Vertrieb, gegenseitiges Audit-Recht, Vendor liefert Marketing-Material kostenlos, gegenseitige Haftung nach Verursachung. |
| **Durchsetzungsstark** | Pro **Reseller** | Exklusiver Gebietsschutz (innerhalb der Vertikal-GVO-Grenzen), Wettbewerbsverbot zugunsten Reseller, lange Kündigungsfrist, Investitionsschutz bei Vertragsende (Sell-off-Period, Bestandskunden bleiben), Co-Branding, hohe Margen, Zugriff auf Vendor-Roadmap. |

---

## 4 · Partei-Felder (Step 2 des Wizards)

```js
partyFields: [
  // Vendor (Partei A)
  { key: "partyA_name", label: "Name / Firma (Vendor / Hersteller)", type: "text", required: true, group: "partyA" },
  { key: "partyA_address", label: "Adresse Vendor", type: "textarea", required: true, group: "partyA" },
  { key: "partyA_representative", label: "Vertreten durch (Vendor)", type: "text", required: false, group: "partyA" },
  { key: "partyA_register", label: "Handelsregister-Nr. Vendor", type: "text", required: false, group: "partyA" },

  // Reseller (Partei B)
  { key: "partyB_name", label: "Name / Firma (Reseller / Distributor)", type: "text", required: true, group: "partyB" },
  { key: "partyB_address", label: "Adresse Reseller", type: "textarea", required: true, group: "partyB" },
  { key: "partyB_representative", label: "Vertreten durch (Reseller)", type: "text", required: false, group: "partyB" },
  { key: "partyB_register", label: "Handelsregister-Nr. Reseller", type: "text", required: false, group: "partyB" },

  // Vertragskontext
  { key: "product_name", label: "Software / SaaS-Produkt(e)", type: "textarea", required: true, group: "context",
    placeholder: "z.B. Acme CRM Cloud, Acme Analytics Pro — vollständige Produktnamen und Editionen" },
  { key: "product_type", label: "Produktart", type: "select", required: true, group: "context",
    options: [
      { value: "saas_subscription", label: "SaaS / Cloud-Subscription" },
      { value: "perpetual_license", label: "Dauerhafte On-Premise-Lizenz" },
      { value: "term_license", label: "Befristete On-Premise-Lizenz" },
      { value: "hybrid", label: "Hybrid (Cloud + On-Premise)" }
    ]
  },
  { key: "territory", label: "Vertragsgebiet", type: "text", required: true, group: "context",
    placeholder: "z.B. Deutschland, EU, weltweit ausgenommen USA" },
  { key: "start_date", label: "Vertragsbeginn", type: "date", required: true, group: "context" },
  { key: "ai_components", label: "Enthält die Software KI-Komponenten?", type: "select", required: true, group: "context",
    options: [
      { value: "no", label: "Nein" },
      { value: "yes_general", label: "Ja, GPAI / General Purpose AI" },
      { value: "yes_high_risk", label: "Ja, Hochrisiko-KI nach Anhang III EU AI Act" },
      { value: "unknown", label: "Unklar / Prüfung läuft" }
    ]
  },
  { key: "personal_data", label: "Werden personenbezogene Daten verarbeitet?", type: "select", required: true, group: "context",
    options: [
      { value: "yes", label: "Ja — AVV nach Art. 28 DSGVO erforderlich" },
      { value: "no", label: "Nein" },
      { value: "unsure", label: "Unklar / kommt auf Endkunden-Use-Case an" }
    ]
  }
]
```

---

## 5 · Sektionen (Step 3 des Wizards) — 12 Sektionen

### Sektion 1 — Lizenz- und Vertriebsrechte des Resellers

- **Key:** `license_grant`
- **Title:** Eingeräumte Vertriebs- und Lizenzrechte
- **Paragraph:** § 2
- **Importance:** critical
- **Description:** Definiert, welche Rechte der Reseller am Produkt erhält. Die wichtigste Klausel — sie bestimmt das gesamte Geschäftsmodell.

**Optionen:**

1. **`distribution_only`** — Reines Vertriebsrecht (kein Sublizenzrecht)
   - **Description:** Reseller darf das Produkt nur vermitteln/verkaufen. Lizenz wird direkt zwischen Vendor und Endkunde geschlossen (z.B. via EULA-Akzeptanz beim Onboarding).
   - **Risk:** low
   - **RiskNote:** Minimaler IP-Risiko, klare Rollenverteilung. Reseller hat aber kaum eigenes Asset.
   - **WhenProblem:** Wenn Reseller eigenständige Pakete schnüren oder Markeneinheit zum Endkunden wahren will.
   - **WhenNegotiate:** Wenn Reseller eigene Wertschöpfung (Bundle, Konfiguration, Service) abrechnen möchte → mindestens "non_exclusive_sublicense".
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

2. **`non_exclusive_sublicense`** — Nicht-exklusives Sublizenzrecht
   - **Description:** Reseller erhält das Recht, im eigenen Namen Sublizenzen an Endkunden zu erteilen. Vendor behält Direktvertriebsrecht.
   - **Risk:** low
   - **RiskNote:** Marktstandard. UsedSoft-konform. Reseller kann Bundles und eigene Vertragswerke gestalten.
   - **WhenProblem:** Bei unklarer Weitergabe der Vendor-EULA an Endkunden (Pass-Through-Risiko § 305 BGB).
   - **WhenNegotiate:** Beidseitig akzeptabel, sofern Margen und Gebietsregelung passen.
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: false

3. **`exclusive_sublicense_territory`** — Exklusives Sublizenzrecht im Gebiet
   - **Description:** Reseller hat im definierten Gebiet das alleinige Sublizenzrecht. Vendor verzichtet auf Direktvertrieb dort (mit oder ohne ausgenommene Großkunden).
   - **Risk:** medium
   - **RiskNote:** Vertikal-GVO setzt Grenzen (max. 5 Reseller pro Gebiet, kein passiver Verkaufsschutz). Marktanteil <30 % Voraussetzung.
   - **WhenProblem:** Wenn Marktanteil überschritten wird — Einzelfreistellung Art. 101 Abs. 3 AEUV nötig. Bei Ausschluss passiver Verkäufe Kernbeschränkung → Gesamtnichtigkeit.
   - **WhenNegotiate:** Wenn Vendor in dem Gebiet keine eigene Vertriebsmannschaft hat. Großkunden-Ausnahme ("named accounts") absichern.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: true

4. **`master_distributor_two_tier`** — Master-Distributor mit Sub-Reseller-Recht
   - **Description:** Reseller darf eigene Sub-Reseller einsetzen (zweistufiger Vertrieb). Sub-Reseller dürfen Sublizenzen erteilen.
   - **Risk:** high
   - **RiskNote:** Compliance-intensiv. Vendor muss Pass-Through-Pflichten (DSGVO, EU Data Act, NIS2, EULA-Inhalte) konstruktiv durch zwei Stufen sicherstellen. Häufig Quelle für Verstöße.
   - **WhenProblem:** Wenn Sub-Reseller AGB nicht ordnungsgemäß weitergeben oder Gebietsgrenzen verletzen — Vendor-Haftung kann durchschlagen.
   - **WhenNegotiate:** Klare Sub-Reseller-Pflichten (Compliance-Checkliste), Audit-Recht des Vendors gegenüber Sub-Resellern, Haftung des Master-Distributors für seine Sub-Reseller.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

**Smart Defaults:** sicher: `distribution_only` | ausgewogen: `non_exclusive_sublicense` | durchsetzungsstark: `exclusive_sublicense_territory`

---

### Sektion 2 — Gebietsschutz und Vertriebskanäle

- **Key:** `territory_exclusivity`
- **Title:** Gebietsschutz, Exklusivität und Vertriebskanäle
- **Paragraph:** § 3
- **Importance:** critical
- **Description:** Welche territoriale/sektorale Schutzwirkung erhält der Reseller? Kartellrechtlich heikel (Vertikal-GVO 2022/720).

**Optionen:**

1. **`non_exclusive_open`** — Offen, nicht-exklusiv
   - **Description:** Vendor darf weitere Reseller im selben Gebiet ernennen und selbst direkt verkaufen. Reseller hat keine Gebietsabsicherung.
   - **Risk:** low
   - **RiskNote:** Kartellrechtlich unbedenklich. Vendor maximal flexibel.
   - **WhenProblem:** Reseller kann seine Investitionen (Vertriebsaufbau, Marketing) nicht amortisieren, wenn Vendor parallel direkt verkauft oder mehrere Reseller einsetzt.
   - **WhenNegotiate:** Reseller sollte mindestens Deal-Registration verlangen oder alternativ höhere Margen für direktvertriebsfreie Phasen.
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

2. **`selective_distribution`** — Selektives Vertriebssystem
   - **Description:** Vendor wählt Reseller nach qualitativen Kriterien (z.B. zertifizierte Berater, Mindestumsatz, Branchenfokus). Reseller dürfen nur an Endkunden oder andere autorisierte Reseller verkaufen.
   - **Risk:** low
   - **RiskNote:** Vertikal-GVO-konform, sofern Qualitätskriterien einheitlich angewandt werden. Marktstandard im Enterprise-SaaS.
   - **WhenProblem:** Bei rein quantitativen Kriterien (Umsatz pro Jahr) ohne Qualitätsbezug → Kartellverstoß möglich.
   - **WhenNegotiate:** Kriterien transparent und für Reseller erfüllbar gestalten, schriftlich fixieren, Annahme/Ablehnung begründen.
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: false

3. **`exclusive_territory`** — Exklusiver Gebietsschutz
   - **Description:** Reseller ist alleiniger Vertriebspartner im Gebiet. Vendor verkauft dort nicht direkt (oder nur an "named accounts"). Aktiver Verkauf anderer Reseller in dieses Gebiet ist untersagt; passiver Verkauf bleibt erlaubt (Vertikal-GVO!).
   - **Risk:** medium
   - **RiskNote:** Vertikal-GVO erlaubt max. 5 Reseller pro Gebiet. Passiver Verkauf darf NICHT verboten werden — sonst Kernbeschränkung Art. 4 lit. b VO 2022/720, Gesamtnichtigkeit.
   - **WhenProblem:** Wenn Vendor mehr als 5 Exklusiv-Reseller hat oder Marktanteil >30 % → Freistellung entfällt. Online-Vertriebsverbot wäre unzulässig.
   - **WhenNegotiate:** Reseller sollte "Named-Account-Liste" (Großkunden, die direkt durch Vendor bedient werden) eng halten und Marketingunterstützung absichern.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: true

4. **`vertical_with_dual_distribution`** — Selektive Distribution mit Vendor-Direktvertrieb (Dual Distribution)
   - **Description:** Vendor und Reseller sind im selben Gebiet aktiv. Vendor ist auf Hersteller- und Reseller-Stufe tätig. Erfordert Trennung der Vertriebsdaten und keine wettbewerblich sensiblen Informationsflüsse.
   - **Risk:** medium
   - **RiskNote:** Seit Vertikal-GVO 2022/720 explizit geregelt — Informationsaustausch zwischen Vendor und Reseller darf nicht über das für die Vertikalbeziehung Erforderliche hinausgehen.
   - **WhenProblem:** Wenn der Reseller seine Endkundenpreise mit dem Vendor abstimmt → Preisbindungsverdacht.
   - **WhenNegotiate:** Klare Datenfirewall, keine wechselseitigen Wettbewerbsdaten, eindeutige Markttransparenz für Endkunden.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

**Smart Defaults:** sicher: `non_exclusive_open` | ausgewogen: `selective_distribution` | durchsetzungsstark: `exclusive_territory`

---

### Sektion 3 — Preisgestaltung, Marge und Mindestabnahme

- **Key:** `pricing_margin`
- **Title:** Preisgestaltung, Marge & Mindestabnahme
- **Paragraph:** § 4
- **Importance:** critical
- **Description:** Wer bestimmt die Endkundenpreise? Welche Marge erhält der Reseller? Gibt es Mindestabnahmen?

**Optionen:**

1. **`vendor_recommended_no_minimum`** — Empfohlene Verkaufspreise, keine Mindestabnahme
   - **Description:** Vendor gibt unverbindliche Preisempfehlung (UVP) ab. Reseller bestimmt Endpreis frei. Keine Mindestabnahme.
   - **Risk:** low
   - **RiskNote:** Kartellrechtlich sauber. Wichtig: Wirklich nur Empfehlung, keine Druckmaßnahmen (sonst RPM!).
   - **WhenProblem:** Vendor verliert Preiskontrolle, Marktbild kann uneinheitlich werden.
   - **WhenNegotiate:** Vendor kann Mindestmarge oder Wettbewerbsschutz alternativ über Reseller-Selektion erreichen.
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: true

2. **`fixed_minimum_purchase`** — Feste Mindestabnahme + Marge-Staffel
   - **Description:** Reseller verpflichtet sich zu einer Mindestabnahme pro Quartal/Jahr (z.B. 100k EUR netto). Marge steigt mit höheren Abnahmemengen (Tier-Modell).
   - **Risk:** medium
   - **RiskNote:** Üblich in Distributor-Verträgen. Vertikal-GVO-konform, sofern keine Preisbindung über Marge erzwungen wird. Bei zu hohen Mindestabnahmen kann faktisch Wettbewerbsverbot entstehen.
   - **WhenProblem:** Bei Marktverschlechterung kann Reseller die Schwellen nicht erreichen → Ausstiegsklauseln einbauen.
   - **WhenNegotiate:** Mindestabnahmen nicht starr, sondern an Marktentwicklung gekoppelt (Eskalation, Re-Verhandlung jährlich).
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

3. **`maximum_resale_price`** — Höchstpreisbindung
   - **Description:** Vendor legt einen Höchstpreis fest, den der Reseller nicht überschreiten darf (z.B. um Kunden vor Überzahlung zu schützen). Reseller darf darunter frei kalkulieren.
   - **Risk:** low
   - **RiskNote:** Vertikal-GVO-konform (Art. 4 lit. a VO 2022/720). Mindest- und Festpreise sind verboten, Höchstpreise erlaubt.
   - **WhenProblem:** Wenn der Höchstpreis faktisch wie ein Festpreis wirkt (z.B. weil keine Marge mehr für Senkung bleibt) → kartellrechtliches Risiko.
   - **WhenNegotiate:** Höchstpreis muss realistisch über den Marktpreisen liegen, sonst RPM-Vorwurf.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

4. **`revenue_share_msrp`** — Umsatzbeteiligung am Endkundenpreis
   - **Description:** Reseller verkauft zum vom Vendor festgelegten MSRP (Manufacturer Suggested Retail Price), erhält fixen Prozentsatz als Provision. Lizenzvertrag wird zwischen Vendor und Endkunde geschlossen.
   - **Risk:** medium
   - **RiskNote:** Hier rückt der "Reseller" rechtlich nahe an den Handelsvertreter (HGB § 84) → Risiko Ausgleichsanspruch § 89b HGB bei Vertragsende.
   - **WhenProblem:** Wenn faktisch wie Handelsvertreter agiert, droht Ausgleichsanspruch (Berechnungsgrundlage: durchschnittliche Jahresprovision der letzten 5 Jahre).
   - **WhenNegotiate:** Klare Abgrenzung im Vertrag und in der tatsächlichen Durchführung. Alternativ: "echtes" Eigenhändlermodell mit eigener Preisgestaltung.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

**Smart Defaults:** sicher: `fixed_minimum_purchase` | ausgewogen: `vendor_recommended_no_minimum` | durchsetzungsstark: `vendor_recommended_no_minimum`

---

### Sektion 4 — Marketing, Co-Branding und Lead-Sharing

- **Key:** `marketing_branding`
- **Title:** Marketingpflichten, Co-Branding & Lead-Sharing
- **Paragraph:** § 5
- **Importance:** high
- **Description:** Welche Marketingleistungen werden gegenseitig erbracht? Wie werden Leads geteilt? Wer trägt Kosten?

**Optionen:**

1. **`reseller_only_no_support`** — Reseller trägt Marketing allein
   - **Description:** Reseller ist für sein Marketing voll verantwortlich. Vendor stellt keine Unterstützung. Markennutzung nur nach engen Vendor-Vorgaben.
   - **Risk:** medium
   - **RiskNote:** Reseller-Investitionen amortisieren sich schwer; mindestens Investitionsschutz bei Vertragsende verlangen.
   - **WhenProblem:** Wenn Reseller über Jahre eine Marke aufbaut und dann gekündigt wird — keine Abgeltung.
   - **WhenNegotiate:** Reseller sollte Marketing-Budget-Beteiligung oder Kompensation bei Kündigung verlangen.
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

2. **`mdf_marketing_development_funds`** — Marketing Development Funds (MDF)
   - **Description:** Vendor stellt einen festen Prozentsatz des Reseller-Umsatzes (z.B. 2–5 %) als Marketingbudget bereit, das der Reseller für genehmigte Maßnahmen einsetzt.
   - **Risk:** low
   - **RiskNote:** Marktstandard im Enterprise-SaaS-Channel. Klare Abrechnung und Genehmigungsprozess wichtig.
   - **WhenProblem:** Bei intransparenten Genehmigungsprozessen kann MDF zur Druckmaßnahme werden (kartellrechtlich kritisch, wenn an Preisniveau gekoppelt).
   - **WhenNegotiate:** Klare Maßnahmen-Liste, Bearbeitungsfristen, kein Zusammenhang mit Endkundenpreisen.
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: true

3. **`co_branding_joint_marketing`** — Gemeinsames Co-Branding mit gegenseitiger Markennutzung
   - **Description:** Beide Parteien dürfen die Marke der anderen Partei nach klaren Style-Guides nutzen. Gemeinsame Events, Messen, Whitepaper. Kosten geteilt.
   - **Risk:** medium
   - **RiskNote:** Strenge Markennutzungsregeln nötig (MarkenG § 14, 15). Bei Vertragsende klare Übergangsregelung (Sell-off-Period mit Material-Bestand).
   - **WhenProblem:** Bei Vertragskonflikten oder Reputationsschäden einer Partei kann die andere mitleiden.
   - **WhenNegotiate:** Eindeutige Style-Guides, Zustimmungspflicht für gemeinsames Material, Right-of-Withdrawal.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: true

4. **`deal_registration_lead_protection`** — Deal-Registration mit Lead-Schutz
   - **Description:** Reseller kann Endkunden-Opportunities beim Vendor registrieren. Vendor schützt registrierte Deals vor Direktvertrieb oder anderen Resellern für definierte Zeit (z.B. 90 Tage).
   - **Risk:** low
   - **RiskNote:** Marktstandard. Schützt Reseller-Investitionen in Lead-Generierung. DSGVO-konform gestalten (Endkundendaten = AVV erforderlich).
   - **WhenProblem:** Bei intransparenter Bearbeitung oder konkurrierender Registrierung mehrerer Reseller.
   - **WhenNegotiate:** Klare First-come-first-served-Regel, transparente Registry, Bestätigungspflicht des Vendors.
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: true

**Smart Defaults:** sicher: `reseller_only_no_support` | ausgewogen: `mdf_marketing_development_funds` | durchsetzungsstark: `co_branding_joint_marketing`

---

### Sektion 5 — Sublizenzierung und Pass-Through der EULA

- **Key:** `sublicensing_eula`
- **Title:** Sublizenzierung und Endkunden-EULA
- **Paragraph:** § 6
- **Importance:** critical
- **Description:** Welche EULA gilt zwischen Reseller und Endkunde? Bindet die Vendor-EULA durch oder hat der Reseller eigene Geschäftsbedingungen?

**Optionen:**

1. **`vendor_eula_passthrough`** — Vendor-EULA als Pflicht-Pass-Through
   - **Description:** Reseller MUSS die Endkunden-EULA des Vendors unverändert in seinen Vertrag einbinden. Eigene Geschäftsbedingungen nur für die Beauftragungsmodalitäten (Preise, Zahlung, Lieferung).
   - **Risk:** medium
   - **RiskNote:** Reseller wird Verwender der Vendor-AGB → § 305 BGB-Risiken treffen ihn. Wenn Vendor-EULA AGB-rechtlich angreifbar ist, haftet der Reseller gegenüber Endkunden.
   - **WhenProblem:** Endkunden klagen Reseller wegen unwirksamer Klauseln, Reseller hat Regress gegen Vendor — Vertragsstreit.
   - **WhenNegotiate:** Reseller verlangt Freistellung durch Vendor bei AGB-Streitigkeiten + Recht zur AGB-Anpassung an deutsches Recht.
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

2. **`reseller_own_terms_with_minimum`** — Reseller eigene AGB mit Pflicht-Mindestklauseln
   - **Description:** Reseller darf eigene Endkunden-AGB nutzen, muss aber bestimmte Vendor-Klauseln (IP-Schutz, Lizenzbedingungen, Datenschutz, Haftung gegenüber Vendor) unverändert übernehmen.
   - **Risk:** low
   - **RiskNote:** Marktstandard. Reseller hat Gestaltungsfreiheit, Vendor-IP bleibt geschützt.
   - **WhenProblem:** Bei nicht abgestimmten Klauseln können Lücken entstehen (z.B. fehlende AVV, ungenaue Lizenzdefinition).
   - **WhenNegotiate:** Vendor stellt Pflichtklauseln-Liste mit Erklärung bereit, Reseller darf eigene Kommerz-Klauseln frei gestalten.
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: true

3. **`direct_contract_vendor_endcustomer`** — Direkter Vertrag Vendor ↔ Endkunde
   - **Description:** Reseller vermittelt nur, vertraglicher Bindung entsteht direkt zwischen Vendor und Endkunde (z.B. via Online-Akzeptanz). Reseller bleibt im Hintergrund.
   - **Risk:** medium
   - **RiskNote:** Rechtlich klar, aber wirtschaftlich: Reseller hat keinen Vertrag mit Endkunde → Cross-Selling, Bestandskunden-Marketing schwierig.
   - **WhenProblem:** Reseller verliert Endkundenkontakt, Customer Lifetime Value bleibt beim Vendor.
   - **WhenNegotiate:** Reseller sollte zusätzlichen Servicevertrag mit Endkunden anbieten dürfen (Setup, Schulung, Support).
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

4. **`flexible_with_approval`** — Reseller-AGB mit Vendor-Vorab-Genehmigung
   - **Description:** Reseller darf eigene EULA gestalten, muss diese aber vor erstem Einsatz vom Vendor genehmigen lassen. Änderungen ebenfalls genehmigungspflichtig.
   - **Risk:** medium
   - **RiskNote:** Rechtlich sauber, aber bürokratisch und langsam. Bei häufigen AGB-Updates (DSGVO, EU Data Act) Verzögerungen.
   - **WhenProblem:** Vendor verzögert Genehmigung → Reseller kann nicht reagieren.
   - **WhenNegotiate:** Genehmigungsfristen vereinbaren (z.B. 14 Tage), Stillschweigen = Zustimmung.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

**Smart Defaults:** sicher: `vendor_eula_passthrough` | ausgewogen: `reseller_own_terms_with_minimum` | durchsetzungsstark: `reseller_own_terms_with_minimum`

---

### Sektion 6 — Service Level Agreement (SLA) und Support

- **Key:** `sla_support`
- **Title:** SLA, Verfügbarkeit und Support-Ebenen
- **Paragraph:** § 7
- **Importance:** high
- **Description:** Welche SLAs schuldet der Vendor dem Reseller (B2B-SLA)? Wer leistet First/Second/Third-Level-Support?

**Optionen:**

1. **`vendor_sla_passthrough`** — Vendor-SLA wird durchgereicht
   - **Description:** Reseller verkauft die Vendor-SLA an Endkunden weiter, ohne eigene Zusagen. Verfügbarkeitsstörungen werden vom Vendor direkt mit Endkunde abgewickelt.
   - **Risk:** medium
   - **RiskNote:** Reseller hat keine SLA-Risiken, aber auch keine eigene Service-Wertschöpfung.
   - **WhenProblem:** Endkunde wendet sich bei Störung an Reseller (Ansprechpartner), aber dieser hat keine Eskalationsrechte → Frustration.
   - **WhenNegotiate:** Mindestens "Eskalationsweg" + "Service-Credit-Pass-Through".
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

2. **`tiered_support_first_level_reseller`** — Reseller First-Level, Vendor Backend
   - **Description:** Reseller leistet First-Level-Support gegenüber Endkunden (Dokumentation, Standardprobleme). Eskaliert an Vendor für Second/Third-Level. Vendor-SLA gilt im Reseller-Vendor-Verhältnis.
   - **Risk:** low
   - **RiskNote:** Marktstandard. Klare Zuständigkeit, Reseller kann Service abrechnen.
   - **WhenProblem:** Bei unklarem Übergangspunkt zwischen First/Second-Level entstehen Reibungen.
   - **WhenNegotiate:** Klare Eskalationskriterien (Ticket-Klassen), Reaktionszeiten von Vendor (z.B. 4h für P1).
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: false

3. **`reseller_full_managed_service`** — Reseller als Managed-Service-Provider
   - **Description:** Reseller bündelt Vendor-Software mit eigenen Services (Setup, Customizing, 24/7-Support). Endkunde hat genau einen Ansprechpartner: den Reseller. Vendor liefert SLA gegenüber Reseller.
   - **Risk:** medium
   - **RiskNote:** Hohe Wertschöpfung beim Reseller, aber auch volle Haftung gegenüber Endkunden bei Service-Ausfällen.
   - **WhenProblem:** Wenn Vendor-Verfügbarkeit unter SLA fällt, haftet Reseller gegenüber Endkunde (Mietminderung § 536 BGB), kann nicht 1:1 weiterreichen.
   - **WhenNegotiate:** Reseller braucht Back-to-Back-SLA (Vendor verpflichtet sich, Reseller vor Endkunden-Ansprüchen freizustellen, soweit Vendor-Verschulden).
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: true

4. **`shared_responsibility_with_credits`** — Geteilte Verantwortung mit Service-Credit-Modell
   - **Description:** Beide Parteien tragen Support nach klarer Matrix. Bei SLA-Verletzungen erhält der Reseller Service-Credits, die er pro-rata an Endkunden weitergibt.
   - **Risk:** low
   - **RiskNote:** Faires Modell. Service-Credits gut dokumentieren (Berechnungsformel, Cap).
   - **WhenProblem:** Bei Cap-Überschreitungen bleibt der Reseller auf Endkunden-Ansprüchen sitzen.
   - **WhenNegotiate:** Cap am realen Risiko ausrichten (z.B. 100 % der monatlichen Vendor-Vergütung).
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

**Smart Defaults:** sicher: `vendor_sla_passthrough` | ausgewogen: `tiered_support_first_level_reseller` | durchsetzungsstark: `reseller_full_managed_service`

---

### Sektion 7 — Datenschutz, AVV und EU Data Act

- **Key:** `data_protection`
- **Title:** Datenschutz, AVV und EU Data Act
- **Paragraph:** § 8
- **Importance:** critical
- **Description:** Wer ist Verantwortlicher, wer Auftragsverarbeiter? Welche AVV ist Pflicht? Welche Pflichten ergeben sich aus dem EU Data Act?

**Optionen:**

1. **`reseller_only_billing_no_personal_data`** — Reseller verarbeitet keine personenbezogenen Daten der Endkunden
   - **Description:** Reseller hat nur Vertragsdaten der Endkunden-Unternehmen (Firma, Rechnungsadresse). Keine Verarbeitung von Personendaten der Endkunden-Mitarbeiter über die Software.
   - **Risk:** low
   - **RiskNote:** Saubere Konstellation: Vendor ist Auftragsverarbeiter des Endkunden, Reseller ist außenstehend.
   - **WhenProblem:** Wenn Reseller doch Zugriff auf Endkunden-Daten hat (Support, Customizing) — DSGVO-Lücke.
   - **WhenNegotiate:** Klare Trennung dokumentieren (Datenflussdiagramm), Reseller keinen Admin-Zugriff geben.
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

2. **`vendor_processor_reseller_subprocessor`** — Vendor Auftragsverarbeiter, Reseller Sub-Auftragsverarbeiter
   - **Description:** Endkunde ist Verantwortlicher (Art. 4 Nr. 7 DSGVO). Vendor ist Auftragsverarbeiter (Art. 28). Reseller wird Sub-Auftragsverarbeiter, wenn er Zugriff zu Support-/Customizing-Zwecken hat.
   - **Risk:** medium
   - **RiskNote:** AVV-Kette muss vollständig sein: Endkunde ↔ Vendor ↔ Reseller. Reseller-Pflichten 1:1 wie Vendor-Pflichten (Art. 28 Abs. 4 DSGVO).
   - **WhenProblem:** Bei fehlender Genehmigung des Endkunden für Sub-Auftragsverarbeitung — DSGVO-Verstoß, Bußgeld bis 4 % Umsatz.
   - **WhenNegotiate:** Vendor genehmigt Reseller im Kunden-AVV explizit (Listenmodell statt Einzelzustimmung).
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: false

3. **`joint_controllership`** — Gemeinsame Verantwortlichkeit (Art. 26 DSGVO)
   - **Description:** Vendor und Reseller bestimmen gemeinsam Mittel und Zwecke der Datenverarbeitung (z.B. bei Lead-Generierung, gemeinsamem Marketing). Joint-Controller-Vereinbarung erforderlich.
   - **Risk:** high
   - **RiskNote:** Komplex. Beide haften gegenüber Betroffenen gesamtschuldnerisch (Art. 82 Abs. 4 DSGVO). Für Endkunden-Daten meist ungeeignet, eher für gemeinsame Marketing-Aktionen.
   - **WhenProblem:** Wenn Aufgabenverteilung unklar — Aufsichtsbehörde hält beide voll verantwortlich.
   - **WhenNegotiate:** Sehr klare Aufgabenmatrix (wer macht was, wer informiert Betroffene), interner Regress.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

4. **`eu_data_act_full_compliance`** — Volle EU-Data-Act-Konformität (Cloud-Switching, Datenportabilität)
   - **Description:** Vendor und Reseller stellen die Pflichten aus EU Data Act (VO 2023/2854) gemeinsam sicher: max. 2-Monats-Kündigung, 30-Tage-Datenmigration, keine Switching-Gebühren ab 2027, Datenportabilität in standardisierten Formaten.
   - **Risk:** low
   - **RiskNote:** Pflicht seit 12.09.2025 für alle Cloud-Anbieter mit EU-Bezug — keine Wahl, sondern Compliance.
   - **WhenProblem:** Bei Verstoß: Bußgelder bis 20 Mio. EUR oder 4 % Jahresumsatz, zudem Vertragsklauseln nichtig.
   - **WhenNegotiate:** Klare Aufgabenverteilung (welche Partei führt Datenexport durch, in welchem Format), Service-Credits bei Migrationsverzögerung.
   - **Recommended:** sicher: true | ausgewogen: true | durchsetzungsstark: true

**Smart Defaults:** sicher: `eu_data_act_full_compliance` | ausgewogen: `vendor_processor_reseller_subprocessor` | durchsetzungsstark: `vendor_processor_reseller_subprocessor`

> **Hinweis:** Diese Sektion erlaubt mehrere recommended-Werte, weil EU-Data-Act-Compliance immer Pflicht ist und je nach Verarbeitungssituation parallel die AVV-Konstellation festgelegt wird. In der Code-Implementierung wird die EU-Data-Act-Klausel als Pflichttext immer eingefügt; die Wahl bezieht sich auf das DSGVO-Modell.

---

### Sektion 8 — Haftung und Haftungsbegrenzung

- **Key:** `liability`
- **Title:** Haftung des Resellers gegenüber dem Vendor
- **Paragraph:** § 9
- **Importance:** high
- **Description:** Wie haftet der Reseller bei Verstößen (z.B. Lizenzverstöße, Markenmissbrauch, Compliance-Verstöße)? Welche Haftungsobergrenzen gelten?

**Optionen:**

1. **`reseller_unlimited_for_ip_violations`** — Unbegrenzte Reseller-Haftung bei IP- und Compliance-Verstößen
   - **Description:** Bei Verstößen gegen IP-Rechte des Vendors, Markenmissbrauch, Verkauf in untersagtes Gebiet, Verstoß gegen DSGVO/AI-Act haftet der Reseller unbegrenzt. Sonstige Haftung auf typischen vorhersehbaren Schaden begrenzt.
   - **Risk:** medium
   - **RiskNote:** Aus Vendor-Sicht erforderlich (IP ist Kernasset). Aus Reseller-Sicht hart, aber bei eigenem Verschulden tragbar.
   - **WhenProblem:** Wenn Verstoß durch Sub-Reseller oder Mitarbeiter geschieht — Reseller haftet ohne Verschulden.
   - **WhenNegotiate:** Reseller verlangt Begrenzung auf Vorsatz/grobe Fahrlässigkeit + Insurance-Anforderung.
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

2. **`mutual_cap_typical_damages`** — Gegenseitige Haftungsbegrenzung auf typischen vorhersehbaren Schaden
   - **Description:** Beide Parteien haften für direkte Schäden bis zu einem Cap (z.B. Jahresvergütung × 2). Folgeschäden, entgangener Gewinn, Datenverlust ausgeschlossen — außer bei Vorsatz/grober Fahrlässigkeit (§ 309 Nr. 7 BGB).
   - **Risk:** low
   - **RiskNote:** Marktstandard im B2B-IT. AGB-rechtlich sauber, sofern Cap angemessen ist.
   - **WhenProblem:** Bei sehr hohen Endkundenschäden (Cyber-Vorfall, Datenleak) reicht der Cap nicht.
   - **WhenNegotiate:** Cap an Risiko ausrichten, Cyber-Insurance verlangen.
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: true

3. **`vendor_indemnification_ip_only`** — Vendor-Freistellung bei IP-Ansprüchen, sonst Marktstandard
   - **Description:** Vendor stellt Reseller von Ansprüchen Dritter frei, die behaupten, das Vendor-Produkt verletze deren IP. Sonstige Haftung wechselseitig auf Cap begrenzt.
   - **Risk:** low
   - **RiskNote:** Wichtig für Reseller — er weiß nicht, ob Vendor-Produkt patentverletzend ist.
   - **WhenProblem:** Wenn Vendor die Freistellung an enge Bedingungen knüpft (z.B. Workaround-Recht, Beendigungsrecht), kann Reseller-Geschäft beendet werden.
   - **WhenNegotiate:** Mindestens 12-Monats-Übergangszeit + Datenmigration bei IP-bedingter Beendigung.
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: true

4. **`unlimited_for_data_breach`** — Unbegrenzte Haftung bei Datenpannen/DSGVO-Verstößen
   - **Description:** Bei DSGVO-Verstößen, Cyber-Vorfällen, Datenleaks haftet die verursachende Partei unbegrenzt. Sonstige Haftung auf Cap begrenzt.
   - **Risk:** high
   - **RiskNote:** Erhebliches Risiko (Bußgelder + Schadensersatz Betroffener können 8-stellig werden).
   - **WhenProblem:** Bei großem Cyber-Vorfall könnte ein Mittelstands-Reseller existenzbedroht sein.
   - **WhenNegotiate:** Cyber-Versicherung mit ausreichender Deckung verlangen, Cap auch hier setzen (z.B. 10 Mio. EUR).
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

**Smart Defaults:** sicher: `reseller_unlimited_for_ip_violations` | ausgewogen: `vendor_indemnification_ip_only` | durchsetzungsstark: `vendor_indemnification_ip_only`

---

### Sektion 9 — Vertragsstrafe und Audit-Recht

- **Key:** `penalty_audit`
- **Title:** Vertragsstrafe & Audit-Recht
- **Paragraph:** § 10
- **Importance:** high
- **Description:** Wird bei Verstößen (Lizenzmissbrauch, Pricing-Verstöße, Gebietsverletzungen) eine Vertragsstrafe fällig? Hat der Vendor ein Audit-Recht?

**Optionen:**

1. **`no_penalty_audit_only`** — Kein Strafbetrag, nur Audit-Recht
   - **Description:** Keine Vertragsstrafe. Vendor darf einmal pro Jahr ein Audit beim Reseller durchführen (Lizenznutzung, Verkaufsbücher).
   - **Risk:** medium
   - **RiskNote:** Bei Verstoß muss konkreter Schaden bewiesen werden — bei IP-Verstößen schwer.
   - **WhenProblem:** Wenn Reseller systematisch zu wenige Lizenzen meldet — Schaden schwer beziffer­bar.
   - **WhenNegotiate:** Bei nachgewiesenem Verstoß könnten zumindest die Audit-Kosten der Reseller tragen.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: true

2. **`tiered_penalty_with_proof_clause`** — Gestaffelte Vertragsstrafe + Beweismöglichkeit
   - **Description:** Bei Lizenzverstoß: 3-faches Lizenzentgelt + Auditkosten. Bei Gebietsverletzung: pauschal 5–25k EUR. Reseller darf niedrigeren Schaden beweisen (§ 309 Nr. 5 BGB-konform).
   - **Risk:** low
   - **RiskNote:** AGB-rechtlich sauber durch Beweisrecht. Marktstandard.
   - **WhenProblem:** Bei sehr hohen Pauschalen können Gerichte nach § 343 BGB reduzieren.
   - **WhenNegotiate:** Pauschalen marktüblich halten, Eskalation bei Wiederholung definieren.
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: false

3. **`severe_penalty_unlimited_audit`** — Hohe Vertragsstrafe + jederzeitiges Audit-Recht
   - **Description:** Vertragsstrafe pro Verstoß bis 100.000 EUR. Vendor kann jederzeit (mit 5 Werktagen Vorlaufzeit) Audit durchführen, auch durch Dritte.
   - **Risk:** medium
   - **RiskNote:** Stark abschreckend, aber kann nach § 343 BGB reduziert werden, wenn unverhältnismäßig. AGB-Inhaltskontrolle prüfen.
   - **WhenProblem:** Reseller fühlt sich überwacht, Audit-Aufwand wirtschaftlich belastend.
   - **WhenNegotiate:** Audit-Frequenz begrenzen (max. 1× pro Jahr außer bei begründetem Verdacht), Audit-Kosten regeln.
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

4. **`mutual_audit_no_penalty`** — Gegenseitiges Audit-Recht ohne Vertragsstrafe
   - **Description:** Beide Parteien dürfen Audit durchführen (Vendor: Lizenzen, Reseller: Provisionsabrechnungen, MDF-Verwendung). Keine Strafe — Schadenersatz nach BGB.
   - **Risk:** medium
   - **RiskNote:** Faires Modell. Aber bei IP-Verstößen ist konkrete Schadensberechnung schwer.
   - **WhenProblem:** Bei systematischen Verstößen ist die Abschreckung gering.
   - **WhenNegotiate:** Mindestens Pauschale für Lizenzverstöße ergänzen.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

**Smart Defaults:** sicher: `severe_penalty_unlimited_audit` | ausgewogen: `tiered_penalty_with_proof_clause` | durchsetzungsstark: `no_penalty_audit_only`

---

### Sektion 10 — Vertragslaufzeit und Kündigung

- **Key:** `term_termination`
- **Title:** Vertragslaufzeit, Kündigung & Investitionsschutz
- **Paragraph:** § 11
- **Importance:** high
- **Description:** Wie lange läuft der Vertrag? Welche Kündigungsfristen gelten? Was passiert bei Vertragsende mit laufenden Endkundenverträgen?

**Optionen:**

1. **`short_term_easy_termination`** — Kurze Laufzeit, einfache Kündigung
   - **Description:** Vertrag läuft 12 Monate, automatische Verlängerung um 12 Monate, Kündigung mit 3 Monaten Frist. Keine Sell-off-Period.
   - **Risk:** medium
   - **RiskNote:** Vendor maximal flexibel, Reseller hat keinen Investitionsschutz.
   - **WhenProblem:** Reseller kann Vertriebsaufbau (Personal, Marketing) nicht sinnvoll abschreiben.
   - **WhenNegotiate:** Reseller verlangt Investitionsschutz oder längere Laufzeit.
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

2. **`fixed_term_with_renewal`** — Feste Laufzeit (3 Jahre) mit Verlängerungsoption
   - **Description:** Vertrag läuft 3 Jahre, ordentliche Kündigung erst zum Ende, sonst Verlängerung um 1 Jahr mit 6-Monats-Frist. Sell-off-Period 6 Monate.
   - **Risk:** low
   - **RiskNote:** Marktstandard. Beide Seiten haben Planungssicherheit.
   - **WhenProblem:** Bei strategischen Veränderungen (Übernahme, Produktwechsel) kann der Vertrag nicht angepasst werden.
   - **WhenNegotiate:** Sonderkündigungsrechte definieren (Übernahme, materielle Vertragsverletzung).
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: false

3. **`long_term_strong_protection`** — Lange Laufzeit (5 Jahre) mit Investitionsschutz
   - **Description:** 5 Jahre Laufzeit, Verlängerung um 2 Jahre. Kündigungsfrist 12 Monate. Sell-off-Period 12 Monate. Bestandskunden bleiben beim Reseller.
   - **Risk:** medium
   - **RiskNote:** Vorteilhaft für Reseller, kann für Vendor zu lang sein. Wettbewerbsrechtlich Wettbewerbsverbote max. 5 Jahre (Vertikal-GVO).
   - **WhenProblem:** Bei Vendor-Strategiewechsel kein Ausstieg möglich.
   - **WhenNegotiate:** Außerordentliches Kündigungsrecht bei wesentlicher Vertragsverletzung beibehalten.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: true

4. **`termination_for_convenience_with_compensation`** — Beidseitige Kündigung jederzeit, mit Abfindung
   - **Description:** Beide Parteien können jederzeit mit 6 Monaten Frist kündigen. Bei Kündigung durch Vendor: Investitionsabgeltung (z.B. Marketingausgaben der letzten 24 Monate × 50 %). Bestandskunden migrieren mit.
   - **Risk:** medium
   - **RiskNote:** Faire Lösung, aber Abfindungsberechnung muss präzise sein.
   - **WhenProblem:** Bei Streit über Abfindungshöhe drohen langwierige Prozesse.
   - **WhenNegotiate:** Klare Berechnungsformel, ggf. Schiedsgutachter.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

**Smart Defaults:** sicher: `short_term_easy_termination` | ausgewogen: `fixed_term_with_renewal` | durchsetzungsstark: `long_term_strong_protection`

---

### Sektion 11 — Wettbewerbsverbot und Konkurrenzschutz

- **Key:** `non_compete`
- **Title:** Wettbewerbsverbot & Konkurrenzschutz
- **Paragraph:** § 12
- **Importance:** medium
- **Description:** Darf der Reseller konkurrierende Produkte vertreiben? Gilt nach Vertragsende ein Wettbewerbsverbot?

**Optionen:**

1. **`no_non_compete_open`** — Kein Wettbewerbsverbot, freier Vertrieb anderer Produkte
   - **Description:** Reseller darf jederzeit auch Konkurrenzprodukte vertreiben. Vendor kann nur durch eigene Attraktivität (Marge, Support) binden.
   - **Risk:** low
   - **RiskNote:** Kartellrechtlich unbedenklich. Reseller maximal flexibel.
   - **WhenProblem:** Vendor verliert Mindshare beim Reseller.
   - **WhenNegotiate:** Vendor kann mit Tier-Status oder höheren Margen für Exklusiv-Anteil arbeiten.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: true

2. **`vertical_block_exemption_compliant`** — Wettbewerbsverbot nach Vertikal-GVO
   - **Description:** Reseller darf während der Vertragsdauer keine direkten Konkurrenzprodukte vertreiben (max. 5 Jahre, danach automatisch entfallend, sofern nicht stillschweigend verlängert). Nach Vertragsende max. 1 Jahr Verbot, gebietsbeschränkt.
   - **Risk:** low
   - **RiskNote:** Vertikal-GVO 2022/720 konform. Marktstandard im selektiven Vertrieb.
   - **WhenProblem:** Bei Übernahme des Resellers durch Konkurrenz → Konflikt.
   - **WhenNegotiate:** Klare Definition des "Konkurrenzprodukts" (gleicher Funktionsumfang? gleiche Zielgruppe?).
   - **Recommended:** sicher: true | ausgewogen: true | durchsetzungsstark: false

3. **`exclusive_full_dedication`** — Exklusiver Vertrieb, keine anderen Produkte
   - **Description:** Reseller verpflichtet sich, ausschließlich Vendor-Produkte zu vertreiben (auch andere Geschäftsfelder ausgeschlossen).
   - **Risk:** high
   - **RiskNote:** Kartellrechtlich problematisch, wenn Marktanteil >30 %. Bei kleinerem Marktanteil zeitlich begrenzt zulässig (max. 5 Jahre).
   - **WhenProblem:** Bei wirtschaftlichen Schwankungen kann Reseller nicht in andere Bereiche ausweichen.
   - **WhenNegotiate:** Mindestmarge oder Mindestumsatz-Garantie als Gegenleistung.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

4. **`mutual_non_solicitation_employees_customers`** — Gegenseitiges Abwerbeverbot (Mitarbeiter & Kunden)
   - **Description:** Während der Vertragslaufzeit und 12 Monate danach werben sich beide Parteien keine Mitarbeiter oder Bestandskunden ab.
   - **Risk:** low
   - **RiskNote:** Übliches Add-on. Bei Mitarbeitern Vorsicht: Berufsausübungsfreiheit (Art. 12 GG), zu strenge Klauseln unwirksam.
   - **WhenProblem:** Wenn Definition "Bestandskunden" zu weit ist.
   - **WhenNegotiate:** Klare Liste oder Definition (z.B. "im letzten Jahr aktiv betreut").
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

**Smart Defaults:** sicher: `vertical_block_exemption_compliant` | ausgewogen: `vertical_block_exemption_compliant` | durchsetzungsstark: `no_non_compete_open`

---

### Sektion 12 — Gerichtsstand und anwendbares Recht

- **Key:** `jurisdiction`
- **Title:** Gerichtsstand und anwendbares Recht
- **Paragraph:** § 13
- **Importance:** medium
- **Description:** Welches Recht gilt? Wo wird bei Streitigkeiten geklagt? Schiedsgericht oder ordentliche Gerichte?

**Optionen:**

1. **`vendor_seat_german_law`** — Sitz des Vendors, deutsches Recht
   - **Description:** Gerichtsstand am Sitz des Vendors. Anwendbares Recht: deutsches Recht unter Ausschluss UN-Kaufrecht (CISG) und IPR-Verweisungsnormen.
   - **Risk:** low
   - **RiskNote:** Vorteilhaft für Vendor. Bei deutschem Reseller unproblematisch, bei ausländischem Reseller Vollstreckungsfrage.
   - **WhenProblem:** Internationaler Reseller findet Gerichtsstand unzumutbar.
   - **WhenNegotiate:** Bei B2B im Inland fast immer akzeptabel.
   - **Recommended:** sicher: true | ausgewogen: false | durchsetzungsstark: false

2. **`reseller_seat_local_law`** — Sitz des Resellers, lokales Recht
   - **Description:** Gerichtsstand am Sitz des Resellers, lokales Recht.
   - **Risk:** medium
   - **RiskNote:** Vorteilhaft für Reseller. Vendor muss bei IP-Verstößen vor lokalem Gericht klagen.
   - **WhenProblem:** Bei kleinem Reseller in EU-Land mit langsamen Gerichten kann Durchsetzung Jahre dauern.
   - **WhenNegotiate:** Mindestens Schiedsgericht als Alternative anbieten.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: true

3. **`neutral_arbitration_iccdis`** — Schiedsgericht (DIS oder ICC)
   - **Description:** Streitigkeiten werden durch ein Schiedsgericht nach den Regeln der Deutschen Institution für Schiedsgerichtsbarkeit (DIS) oder der International Chamber of Commerce (ICC) entschieden. Sitz: neutraler Ort (z.B. Frankfurt, Zürich).
   - **Risk:** low
   - **RiskNote:** Marktstandard im internationalen B2B. Schneller, vertraulich, weltweit vollstreckbar (New Yorker Übereinkommen).
   - **WhenProblem:** Schiedsgerichte sind teurer als ordentliche Gerichte (Schiedsrichterkosten 6-stellig möglich).
   - **WhenNegotiate:** Bei Verträgen <500k EUR Jahreswert ggf. ordentliches Gericht günstiger.
   - **Recommended:** sicher: false | ausgewogen: true | durchsetzungsstark: false

4. **`hybrid_court_with_arbitration_option`** — Ordentliches Gericht mit Schieds-Opt-In
   - **Description:** Standardmäßig ordentliches Gericht (Vendor-Sitz). Beide Parteien können binnen 30 Tagen nach Streitanzeige einseitig auf Schiedsverfahren umschalten.
   - **Risk:** medium
   - **RiskNote:** Klingt flexibel, ist aber prozessrechtlich riskant — Zustimmung zur Schiedsklausel muss beidseitig sein.
   - **WhenProblem:** Streit über Forum bevor inhaltlicher Streit überhaupt verhandelt wird.
   - **WhenNegotiate:** Klare, einseitig oder beidseitig wirkende Opt-In-Regel.
   - **Recommended:** sicher: false | ausgewogen: false | durchsetzungsstark: false

**Smart Defaults:** sicher: `vendor_seat_german_law` | ausgewogen: `neutral_arbitration_iccdis` | durchsetzungsstark: `reseller_seat_local_law`

---

## 6 · Anwaltsperspektive — kritische Hinweise

Ein erfahrener IT-Vertragsanwalt würde bei diesem Vertragstyp mindestens folgende Punkte zwingend prüfen:

### 6.1 Pflicht-Checkliste für Vendor

1. **Marktanteilstest:** Liegt der relevante Marktanteil bei Vendor und Reseller jeweils unter 30 %? Wenn nein → Vertikal-GVO entfällt → Einzelfreistellung Art. 101 Abs. 3 AEUV nötig.
2. **EU Data Act seit 12.09.2025:** Sind Cloud-Switching, 2-Monats-Kündigung, 30-Tage-Datenmigration vertraglich umgesetzt?
3. **EU AI Act:** Enthält die Software KI? Wenn ja → Risikoklassifizierung, CE-Kennzeichnung-Pass-Through.
4. **DSGVO-AVV-Kette:** Endkunde ↔ Vendor ↔ Reseller geschlossen? Listenmodell mit Reseller-Genehmigung?
5. **NIS2 (D seit 12/2025):** Ist der Reseller "wesentlich" oder "wichtig" i.S.d. NIS2? → Lieferketten-Sicherheitsklauseln Pflicht.
6. **UrhG § 32 a:** Bei dauerhaften Lizenzen mit langfristiger Nutzung — Anpassungsanspruch des Urhebers ("Bestseller-Paragraf") prüfen, bei Konzern-Vendoren oft irrelevant.
7. **Insolvenzfestigkeit:** Source-Code-Escrow-Vereinbarung mit aufschiebend bedingter Verfügung (BGH IX ZR 162/04, 17.11.2005).

### 6.2 Pflicht-Checkliste für Reseller

1. **Investitionsschutz:** Marketingausgaben, Vertriebsmannschaft, Schulungen — wie werden sie bei Vertragsende abgegolten?
2. **Bestandskundenschutz:** Bleiben Endkunden bei Vertragsende beim Reseller, oder gehen sie an den Vendor?
3. **Sell-off-Period:** Mindestens 6 Monate, um Lager und laufende Verträge abzuwickeln.
4. **§ 89b HGB analog:** Risiko Ausgleichsanspruch bei handelsvertreterähnlicher Tätigkeit?
5. **AGB-Pass-Through-Risiko:** Vendor-EULA AGB-rechtlich angreifbar? Freistellung durch Vendor?
6. **Cyber-Versicherung:** Bei DSGVO-/Cyber-Klauseln mit unbegrenzter Haftung — Versicherung zwingend.
7. **Roadmap-Transparenz:** Recht auf 12-Monats-Vorschau (sonst Lizenz-Sunset-Risiko).

### 6.3 Häufige Fallstricke

- **Versteckte Preisbindung** durch MDF-Koppelung an Endkundenpreise → Kartellverstoß
- **"Most Favored Nation"-Klauseln** — meist als Kernbeschränkung unzulässig
- **Online-Vertriebsverbote** — nach Vertikal-GVO 2022/720 unzulässig (Hardcore-Beschränkung)
- **Einschränkung passiver Verkäufe** in andere Gebiete → Nichtigkeit der Gebietsklausel
- **Fehlende Pass-Through-Klausel** für EU Data Act → Reseller sitzt auf Endkunden-Ansprüchen
- **Sublicensing ohne ausdrückliche Erlaubnis** → UrhG-Verstoß durch Reseller (§ 35 UrhG: Sublizenzen nur mit Zustimmung)

---

## 7 · Quellen

### Gesetzestexte
- BGB §§ 145 ff., §§ 433 ff., §§ 535 ff., §§ 305–310, §§ 309 Nr. 5–7
- HGB §§ 84–92c, § 89b
- UrhG §§ 31, 32 a, 34, 35, 97, 101 a
- GWB § 1, § 81
- Verordnung (EU) 2022/720 (Vertikal-GVO), in Kraft seit 01.06.2022
- Verordnung (EU) 316/2014 (TT-GVO), in Kraft seit 01.05.2014
- Verordnung (EU) 2023/2854 (EU Data Act), anwendbar seit 12.09.2025
- Verordnung (EU) 2024/1689 (EU AI Act), gestaffelte Anwendung 02/2025–08/2027
- Datenschutz-Grundverordnung (DSGVO) Art. 26, 28, 82, 83
- NIS2-Richtlinie (in Deutschland: NIS2UmsuCG seit 12/2025)

### Rechtsprechung (BGH/EuGH/EuG)
- EuGH, Urteil v. 03.07.2012, C-128/11 — UsedSoft I (Erschöpfung bei Software-Download)
- EuGH, Urteil v. 02.05.2012, C-406/10 — SAS Institute (Subscription-Modelle ausgenommen)
- BGH, Urteil v. 17.07.2013, I ZR 129/08 — UsedSoft II
- BGH, Urteil v. 11.12.2014, I ZR 8/13 — UsedSoft III (Volumenlizenz-Aufspaltung)
- BGH, Urteil v. 17.11.2005, IX ZR 162/04 — Insolvenzfestigkeit Software-Lizenz
- BGH, Urteil v. 04.10.1990, I ZR 139/89 — Software als Werk i.S.d. UrhG
- BGH NJW 1998, 71 — Handelsvertreter trotz Eigenhändler-Bezeichnung
- BGH NJW 2007, 2394 — Software-Vertrag als Hybrid (Werk-/Dienst-/Mietvertrag)

### Sekundärquellen (Web)
- [BGH UsedSoft III: Aufsplittung von Volumenlizenzen ist rechtmäßig (it-business.de)](https://www.it-business.de/bgh-aufsplittung-von-volumenlizenzen-ist-rechtmaessig-a-470037/)
- [Neue Vertikal-GVO 2022/720 — Was ändert sich? (heuking.de)](https://www.heuking.de/en/news-events/newsletter-articles/detail/new-vertical-block-exemption-regulation-and-vertical-guidelines-what-remains-the-same-what-will-be-changing.html)
- [Knapp zwei Jahre Vertikal-GVO und Sonstiges aus der Welt des Vertriebskartellrechts (noerr.com)](https://www.noerr.com/de/insights/competition-outlook-2024-knapp-zwei-jahre-vertikal-gvo-und-sonstiges-aus-der-welt-des-vertriebskartellrechts)
- [EU Data Act: Gamechanger for SaaS contracts (Addleshaw Goddard)](https://www.addleshawgoddard.com/en/insights/insights-briefings/2025/data-protection/eu-data-act-gamechanger-saas-contracts/)
- [Cloud Switching Under the EU Data Act (Greenberg Traurig)](https://www.gtlaw.com/en/insights/2025/9/cloud-switching-under-the-eu-data-act)
- [EU AI Act: Was ab August 2026 auf Unternehmen zukommt (wetzel.berlin)](https://wetzel.berlin/eu-ai-act-was-ab-august-2026-auf-unternehmen-zukommt-handlungsbedarf-jetzt/)
- [NIS 2 Richtlinie: IT-Sicherheit und Lieferketten im Fokus (lawcode.eu)](https://www.lawcode.eu/blog/nis2-lieferketten-und-it-sicherheit/)
- [SaaS-Verträge: Einordnung & Möglichkeiten (srd-rechtsanwaelte.de)](https://www.srd-rechtsanwaelte.de/blog/saas-vertraege-einordnung-moeglichkeiten)
- [Insolvenzfestigkeit von Softwarelizenzen (connect-professional.de)](https://www.connect-professional.de/markt/insolvenzfestigkeit-von-softwarelizenzen.232289.html)

> **Stand:** 29.04.2026
> **Letzte Verifikation:** Web-Recherche zu Vertikal-GVO, EU Data Act, EU AI Act, NIS2 erfolgt.

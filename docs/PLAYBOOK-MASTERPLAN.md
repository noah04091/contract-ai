# Playbook Masterplan — Geführter Generate-Modus für alle Vertragstypen

**Status:** Code-Implementation abgeschlossen — alle 16 Playbooks live in Decision Engine (Stand 30.04.2026, ungetestet im Wizard)
**Erstellt:** 29.04.2026 · **Letzte Änderung:** 30.04.2026
**Ziel:** Den geführten Vertragserstellungs-Modus (`/generate` → "Geführt") von aktuell 1 Vertragstyp (NDA) auf alle 15 produktiven Typen ausweiten — auf demselben juristischen Tiefenniveau wie das bestehende NDA-Playbook.

> **Strategische Leitlinie:** Wir bauen NICHT für die schnelle Lösung. Jedes Playbook muss so professionell und juristisch fundiert sein, als hätte ein erfahrener Vertragsanwalt es entworfen. Skalierbarkeit + langfristige Qualität schlägt Geschwindigkeit. Pro Vertrag durchläuft das Material denselben Workflow: Recherche → Konzept → Playbook → Test → Live.

---

## 1 · Quellsystem & Architektur (Ist-Zustand)

| Komponente | Datei | Zweck |
|-----------|-------|-------|
| Decision Engine | `backend/services/decisionEngine.js` | Lädt Playbooks, resolviert Defaults, berechnet Risikoprofil, baut Prompt-Anweisungen |
| Playbook-Routes | `backend/routes/playbooks.js` | API-Endpoints: GET / GET :type / POST :type/generate / preview / risk-profile |
| Frontend-Wizard | `frontend/src/components/GuidedContractWizard.tsx` | 3-stufiger UI-Flow: Modus → Parteien → Entscheidungen |
| Generator-Page | `frontend/src/pages/Generate.tsx` | Toggle "Detailliert" ↔ "Geführt", 16 Vertragstypen-Definitionen |
| Bestehendes Playbook | `backend/playbooks/nda.js` | 452 Zeilen, 9 Sektionen, Vorlage für alle weiteren |

**Erweiterungspunkte:**
- Neue Datei `backend/playbooks/{type}.js` anlegen
- In `decisionEngine.js` Zeile 5-7 `require` hinzufügen
- Frontend, Routes, Engine: KEINE Änderungen nötig (generisch implementiert)

---

## 2 · Verbindliches Datenstruktur-Schema

Jedes Playbook MUSS exakt folgendes Schema einhalten (abgeleitet aus `backend/playbooks/nda.js`):

```js
module.exports = {
  type: "{slug}",                      // identisch mit Generate.tsx Type-ID
  title: "{Anzeigename}",
  description: "{1-2 Sätze Zweck}",
  icon: "{lucide-icon-name}",
  difficulty: "einfach" | "mittel" | "komplex",
  estimatedTime: "{z.B. 5-10 Minuten}",
  legalBasis: "{BGB §§ ..., Spezialgesetze}",

  roles: {
    A: { key: "{rolle-a}", label: "{Anzeigename A}", description: "{Rolle A erklärt}" },
    B: { key: "{rolle-b}", label: "{Anzeigename B}", description: "{Rolle B erklärt}" }
  },

  modes: {
    sicher:             { label: "Sicher",             emoji: "shield",  description: "...", color: "#22c55e" },
    ausgewogen:         { label: "Ausgewogen",         emoji: "balance", description: "...", color: "#3b82f6" },
    durchsetzungsstark: { label: "Durchsetzungsstark", emoji: "target",  description: "...", color: "#f59e0b" }
  },

  partyFields: [
    { key, label, type: "text"|"textarea"|"select"|"date"|"number", required, group: "partyA"|"partyB"|"context", placeholder?, options? }
  ],

  sections: [
    {
      key: "{section-key}",
      title: "{Anzeigename}",
      paragraph: "§ X",
      description: "{Erklärung 1-2 Sätze}",
      importance: "critical" | "high" | "medium",
      options: [
        {
          value: "{option-key}",
          label: "{Anzeigename Option}",
          description: "{Konkret was diese Option bedeutet}",
          risk: "low" | "medium" | "high",
          riskNote: "{Warum dieses Risiko}",
          whenProblem: "{Wann wird die Option zum Problem}",
          whenNegotiate: "{Wann sollte verhandelt werden}",
          recommended: { sicher: bool, ausgewogen: bool, durchsetzungsstark: bool }
        }
        // 3-4 Optionen pro Sektion empfohlen
      ],
      smartDefault: { sicher: "{value}", ausgewogen: "{value}", durchsetzungsstark: "{value}" }
    }
    // 7-12 Sektionen pro Vertrag
  ]
};
```

**Konsistenzregeln:**
- Slugs (`type`) identisch mit `Generate.tsx` (z.B. `softwareVertrieb`, `arbeitsvertrag`, `nda`)
- Mindestens 7 Sektionen pro Vertrag, maximal 14 (Wizard-UX)
- Jede Sektion hat 3-4 Optionen (nicht 2, nicht 5+)
- `smartDefault` muss für jeden der 3 Modi einen gültigen `option.value` referenzieren
- Mindestens eine Option pro Sektion ist in jedem Modus `recommended` (Wizard-Marker)
- `paragraph`-Nummerierung folgt der natürlichen Vertragsstruktur (§1 Parteien → §2-§N Sektionen → §N+1 Schlussbestimmungen)

---

## 3 · Modi-Logik je Rollen-Konstellation

Die drei Modi haben **vertragstypspezifische Bedeutung**. Die NDA-Definition (Sicher = pro offenlegende Partei) lässt sich nicht 1:1 auf andere Verträge übertragen. Für jeden Vertrag gilt folgendes Schema:

| Modus | Allgemeine Bedeutung | Beispiel Mietvertrag | Beispiel Arbeitsvertrag |
|-------|----------------------|----------------------|--------------------------|
| **Sicher** | Maximaler Schutz für die *primär schutzbedürftige* Partei (häufig "Auftraggeber" / "Eigentümer" / "Offenlegende") | Pro Vermieter (z.B. höhere Kaution, strikte Hausordnung) | Pro Arbeitgeber (z.B. Probezeit ausgeschöpft, Wettbewerbsverbot) |
| **Ausgewogen** | Marktstandard, faire Balance — durchsetzbar vor Gericht ohne Inhaltskontrolle-Risiko | Marktüblicher Wohnraum-Mietvertrag | Standard-Festanstellung |
| **Durchsetzungsstark** | Pro die *strategisch handelnde* Partei (häufig "Auftragnehmer" / "Mieter" / "Empfänger") wenn diese stärkere Position hat | Pro Mieter (lange Kündigungsfristen, Nachmieter-Recht) | Pro Arbeitnehmer (kurze Probezeit, hohe Abfindung) |

**Wichtig:** Pro Vertragstyp definiert das Cluster-Recherchedokument (`docs/playbooks/{slug}.md`) **explizit, was jeder Modus für genau diesen Vertrag bedeutet**, inklusive welche Partei begünstigt wird. Das ist Pflichtinhalt jedes Recherchedokuments.

---

## 4 · Universal-Sektionen (Patterns)

Bestimmte Sektionen wiederholen sich in fast allen Verträgen. Diese sollen über alle Playbooks hinweg **konsistent formuliert** werden, mit Vertragstyp-spezifischen Anpassungen:

### 4.1 Haftung
- Universal in: NDA, Arbeitsvertrag, Werkvertrag, Freelancer, SaaS, Lizenz, Beratervertrag, Kooperation
- Optionen-Standard: `limited` (typischer/vorhersehbarer Schaden) | `standard` (BGB-Default, Vorsatz/grobe Fahrlässigkeit unbegrenzt) | `unlimited` (alle Schäden inkl. Folgeschäden)
- AGB-Recht-Hinweis: § 309 Nr. 7 BGB schließt Haftungsausschluss für Vorsatz/grobe Fahrlässigkeit/Personenschäden in AGB grundsätzlich aus

### 4.2 Gerichtsstand & anwendbares Recht
- Universal in: allen B2B-Verträgen
- Optionen-Standard: `party_a` | `party_b` | `defendant` (gesetzlicher Standard nach § 12 ZPO)
- Verbraucherschutz: Bei B2C ist Gerichtsstand am Verbraucherwohnsitz zwingend (§ 29 ZPO + § 38 ZPO)

### 4.3 Kündigung
- Universal in: Mietvertrag, Pachtvertrag, Arbeitsvertrag, Werkvertrag, SaaS, Lizenz, Kooperation, Beratervertrag
- Vertragstypspezifische Fristen — siehe jeweiliges Detail-Dokument

### 4.4 Schriftform & Änderungen
- Optionen: `text-form-zulässig` (E-Mail) | `Schriftform für Änderungen` | `doppelte Schriftformklausel` (rechtlich umstritten, BGH NJW 2008, 2256 — bei AGB unwirksam wegen Überraschung)

### 4.5 Salvatorische Klausel
- Standard: "Sollte eine Bestimmung unwirksam sein, bleibt der Rest des Vertrages wirksam. Die unwirksame Bestimmung wird durch eine wirtschaftlich gleichwertige ersetzt."
- BGH NJW 1997, 3434: Kein Selbstläufer — bei AGB nur eingeschränkt wirksam, daher Sektion mit Variation

### 4.6 Datenschutz / DSGVO
- Pflicht in: Arbeitsvertrag, SaaS-Verträgen, Kooperationen mit Datenaustausch, Beratervertrag mit Personendaten
- Optionen: `Verweis auf separate AVV` | `AVV inline` | `keine Verarbeitung personenbezogener Daten`

### 4.7 Vertragsstrafe
- Üblich in: NDA, Wettbewerbsverbot (Arbeitsvertrag), Lizenzvertrag (bei Verstößen), Werkvertrag (bei Lieferverzug)
- AGB-Recht: § 309 Nr. 6 BGB verbietet pauschale Schadensersatzklauseln in AGB außer mit Beweisrecht der Gegenseite
- BGH-Reduktionsrecht: § 343 BGB — Gericht kann Vertragsstrafe herabsetzen wenn unverhältnismäßig

---

## 5 · Vertragsspezifische Pflichtinhalte

| Vertragstyp | Spezialgesetz / Pflichthinweis |
|-------------|-------------------------------|
| arbeitsvertrag | NachwG (in Kraft seit 01.08.2022 — alle wesentlichen Vertragsbedingungen müssen schriftlich nachgewiesen werden), KSchG, AGG, BetrVG, BUrlG, MiLoG, EFZG, ArbZG, BetrAVG |
| mietvertrag | BGB §§ 535-580a, MietpreisbremsenG, BetrKV, HeizkostenV, WoVermittG, BetriebskostenV |
| kaufvertrag | BGB §§ 433-479 (allgemein), §§ 474-479 Verbrauchsgüterkauf, ProduktHaftG, BeurkundungsG (Immobilien §311b BGB) |
| freelancer | BGB §§ 611ff (Dienstvertrag) ODER §§ 631ff (Werkvertrag) — Abgrenzung kritisch wegen Scheinselbstständigkeit (§ 7 SGB IV), AÜG bei Personalvermietung |
| werkvertrag | BGB §§ 631-651, VOB/B (Bau), BeurkundungsG bei Bauwerk-Erstellung |
| nda | BGB §§ 241ff, GeschGehG (seit 26.04.2019 — Schutz nur bei "angemessenen Geheimhaltungsmaßnahmen") |
| gesellschaftsvertrag | BGB §§ 705-740 (GbR — MoPeG-Reform 2024 → § 705 BGB neu), HGB (OHG/KG), GmbHG, AktG, GenG |
| darlehensvertrag | BGB §§ 488-505 (allg.), §§ 491-505d (Verbraucherdarlehen — KWG-relevant), Bauspar/Hypothek MaBV |
| lizenzvertrag | UrhG (§§ 31-44 — Rechteeinräumung), PatG (§ 15 — Patentlizenz), MarkenG, GeschmMG, GWB (kartellrechtliche Aspekte bei Exklusiv/Gebietsbeschränkungen) |
| aufhebungsvertrag | KSchG (Sperrzeit Arbeitslosengeld nach § 159 SGB III!), NachwG, AGG (keine Diskriminierung beim Aushandeln) |
| pachtvertrag | BGB §§ 581-597 + Mietrecht subsidiär, LandpachtVG (Landpacht!), § 312 BGB Verbraucherschutz bei Privatpacht |
| softwareVertrieb | UrhG, AGB-Recht §§ 305-310, ProduktHaftG (bei Embedded Software), Channel-Recht, GWB-Kartellrecht (Vertikalvereinbarungen — Verordnung Nr. 2022/720) |
| softwareEndkunde | UrhG, BGB Werk-/Dienstvertrag-Hybrid (BGH "Software-Vertrag"), DSGVO Art. 28 (AVV), ProduktHaftG, SLAs nach BGB-Werkvertrag |
| berater | BGB §§ 611ff (Dienstvertrag, kein Werkerfolg), BeratungsHonorarVO (bei Anwälten), § 7 SGB IV (Scheinselbstständigkeit) |
| kooperation | BGB §§ 705ff (kann bereits GbR begründen!), GWB (Kartellrecht), UrhG (gemeinsame Werke), DSGVO Art. 26 (gemeinsame Verantwortung) |
| individuell | BGB allgemeines Schuldrecht, AGB-Recht §§ 305-310, je nach Inhalt |

---

## 6 · 16 Vertragstypen + Status

| # | Slug | Anzeigename | Cluster | Status | Recherche-Doc |
|---|------|-------------|---------|--------|----------------|
| 0 | nda | Geheimhaltungsvereinbarung | Vertrauen | ✅ Live (Code+Recherche) | `backend/playbooks/nda.js` |
| 1 | arbeitsvertrag | Arbeitsvertrag | Arbeit/Dienst | ✅ Live (Code+Recherche) (40 KB) | `docs/playbooks/arbeitsvertrag.md` |
| 2 | freelancer | Freelancer-Vertrag | Arbeit/Dienst | ✅ Live (Code+Recherche) (38 KB) — **Goldstandard-Vorlage** | `docs/playbooks/freelancer.md` |
| 3 | werkvertrag | Werkvertrag | Arbeit/Dienst | ✅ Live (Code+Recherche) (45 KB) | `docs/playbooks/werkvertrag.md` |
| 4 | berater | Beratungsvertrag | Arbeit/Dienst | ✅ Live (Code+Recherche) (43 KB) | `docs/playbooks/berater.md` |
| 5 | aufhebungsvertrag | Aufhebungsvertrag | Arbeit/Dienst | ✅ Live (Code+Recherche) (46 KB) | `docs/playbooks/aufhebungsvertrag.md` |
| 6 | mietvertrag | Mietvertrag | Immobilien | ✅ Live (Code+Recherche) (43 KB) | `docs/playbooks/mietvertrag.md` |
| 7 | pachtvertrag | Pachtvertrag | Immobilien | ✅ Live (Code+Recherche) (41 KB) | `docs/playbooks/pachtvertrag.md` |
| 8 | kaufvertrag | Kaufvertrag | Immobilien/Sache | ✅ Live (Code+Recherche) (49 KB) | `docs/playbooks/kaufvertrag.md` |
| 9 | softwareVertrieb | SaaS & Software Reseller | Software/IP | ✅ Live (Code+Recherche) (59 KB) | `docs/playbooks/softwareVertrieb.md` |
| 10 | softwareEndkunde | Software-Endkunde-Vertrag | Software/IP | ✅ Live (Code+Recherche) (55 KB) | `docs/playbooks/softwareEndkunde.md` |
| 11 | lizenzvertrag | Lizenzvertrag | Software/IP | ✅ Live (Code+Recherche) (58 KB) | `docs/playbooks/lizenzvertrag.md` |
| 12 | darlehensvertrag | Darlehensvertrag | Kapital | ✅ Live (Code+Recherche) (37 KB) | `docs/playbooks/darlehensvertrag.md` |
| 13 | gesellschaftsvertrag | Gesellschaftsvertrag | Kapital/Gesellschaft | ✅ Live (Code+Recherche) (71 KB) | `docs/playbooks/gesellschaftsvertrag.md` |
| 14 | kooperation | Kooperationsvertrag | Sonstige | ✅ Live (Code+Recherche) (49 KB) | `docs/playbooks/kooperation.md` |
| 15 | individuell | Individueller Vertrag | Sonstige | ✅ Live (Code+Recherche) (34 KB) — Empfehlung Option B (Lite-Wizard) | `docs/playbooks/individuell.md` |

**Gesamt-Output Recherchephase:** 15 Markdown-Dokumente · ~750 KB · ~6.500-7.500 Zeilen juristischer Tiefe · jeweils 8-13 strategische Sektionen mit 3-4 Optionen, BGH/BAG/EuGH-Aktenzeichen 2022-2026, Anwaltsperspektive, Quellen.

**Sonderfall `individuell`:** Da inhaltlich offen, evtl. nicht als klassisches Playbook umsetzbar. Recherche prüft, ob "geführter Modus" hier sinnvoll ist (z.B. nur Strukturvorlage + Universal-Sektionen) oder ob "Geführt" für `individuell` deaktiviert bleibt.

---

## 7 · Workflow pro Vertragstyp

```
1. Juristische Recherche
   - Web-Recherche: aktuelle Rechtsprechung, Gesetzesänderungen 2024-2026
   - Spezialgesetze identifizieren
   - Rollen klar definieren (wer ist A, wer ist B)
   - Modi-Bedeutung festlegen (welche Partei ist "sicher" pro)

2. Sektions-Plan
   - 7-12 strategische Entscheidungen identifizieren
   - Pro Sektion: 3-4 Optionen mit Risiko-Bewertung
   - Smart-Defaults pro Modus festlegen

3. Markdown-Recherchedoc
   - docs/playbooks/{slug}.md im einheitlichen Format
   - Inkl. legalBasis, Modi-Definition, alle Sektionen, Pflichthinweise

4. (Später) Code-Umsetzung
   - backend/playbooks/{slug}.js nach Schema
   - In decisionEngine.js registrieren
   - End-to-End-Test im GuidedContractWizard

5. (Später) Production
   - Deploy alle drei Plattformen (GitHub, Vercel, Render)
   - Memory-Update mit Status "Live"
```

In der aktuellen Phase werden ausschließlich Schritte 1-3 (Recherche + Markdown-Docs) bearbeitet. Code-Umsetzung erfolgt erst nach Abnahme aller Recherche-Docs.

---

## 8 · Recherche-Dokument-Format (Vorgabe für `docs/playbooks/{slug}.md`)

Jedes Recherchedokument MUSS folgende Sektionen enthalten:

```markdown
# {Vertragstyp-Anzeigename} — Playbook-Konzept

## Metadaten
- **Slug**: {slug}
- **Title**: ...
- **Difficulty**: einfach | mittel | komplex
- **Estimated Time**: X-Y Minuten
- **Icon**: {lucide-name}
- **Legal Basis**: BGB §§ ... + Spezialgesetze

## Rechtlicher Hintergrund
1. Anwendbare Gesetze (mit Begründung)
2. Aktuelle Rechtsprechung (BGH/BAG/EuGH-Urteile mit Aktenzeichen)
3. Pflichthinweise (z.B. NachwG, Verbraucherschutz, Schriftform)
4. Risiken bei fehlerhafter Gestaltung

## Rollen-Definition
- **Rolle A**: ...
- **Rolle B**: ...

## Modi-Bedeutung (vertragsspezifisch)
- **Sicher**: Pro [Partei] — [konkrete Auswirkung]
- **Ausgewogen**: Marktstandard — [konkrete Auswirkung]
- **Durchsetzungsstark**: Pro [Partei] — [konkrete Auswirkung]

## Partei-Felder (Step 2 des Wizards)
{Liste mit key/label/type/required/group}

## Sektionen (Step 3 des Wizards)
Pro Sektion:
- **Key + Title + Paragraph**
- **Importance**: critical | high | medium
- **Beschreibung**
- **Optionen** (3-4): jeweils mit value/label/description/risk/riskNote/whenProblem/whenNegotiate/recommended
- **Smart Defaults pro Modus**

## Anwaltsperspektive — kritische Hinweise
Was würde ein erfahrener Anwalt zwingend prüfen?

## Quellen
- BGH-Urteile mit Aktenzeichen
- Gesetzes-Stand
- Web-Quellen (URL + Datum)
```

---

## 9 · Nächste Schritte

1. ✅ Master-Plan erstellt (dieses Dokument)
2. ✅ Cluster-Recherchen abgeschlossen (15 Markdown-Dokumente)
3. ⏳ Recherchedokumente vom User durchsehen / Feedback sammeln
4. ⏳ Code-Umsetzung — Sprint pro Vertragstyp:
   - 4.1 Playbook-Datei `backend/playbooks/{slug}.js` aus Recherchedoc bauen
   - 4.2 In `backend/services/decisionEngine.js` Zeile 5-7 registrieren
   - 4.3 End-to-End-Test im GuidedContractWizard (alle 3 Modi)
   - 4.4 Deploy alle drei Plattformen (GitHub, Vercel, Render)
   - 4.5 Status auf "✅ Live" setzen

**Empfohlene Reihenfolge für Code-Sprint** (nach Häufigkeit/Wichtigkeit):
1. softwareVertrieb (User-Trigger des Projekts)
2. arbeitsvertrag (häufig nachgefragt, hohe Komplexität)
3. mietvertrag (Klassiker, viele Klauselrisiken)
4. freelancer (sehr häufig in Zielgruppe)
5. softwareEndkunde
6. werkvertrag
7. lizenzvertrag
8. darlehensvertrag
9. kaufvertrag
10. berater
11. aufhebungsvertrag
12. kooperation
13. gesellschaftsvertrag
14. pachtvertrag
15. individuell (Lite-Wizard, recyceltes Material)

**Sonderfall `individuell`:** Recherche empfiehlt **Option B** (Lite-Wizard mit 8 Universal-Sektionen aus Sektion 4 dieses Master-Plans + Vertragstyp-Klassifikation). User-Intention: Wer "individuell" wählt, hat ungewöhnliche Fälle und braucht trotzdem strukturierte Hilfe. Aufwand gering durch Recycling der Universal-Sektionen.

> **Stand 30.04.2026:** Code-Implementation abgeschlossen. Alle 16 Playbooks (15 neue + NDA) sind in `backend/services/decisionEngine.js` registriert und laden sauber per `require()`. Smoke-Test bestanden — `listPlaybooks()` liefert alle 16 Einträge mit korrekten Metadaten zurück. **Steht aus:** End-to-End-Test im GuidedContractWizard (alle Modi, Generierung mit GPT), dann Deploy alle 3 Plattformen.

## 10 · Code-Inventar (Stand 30.04.2026)

| Slug | JS-Zeilen | Sektionen | Schwerpunkt |
|------|-----------|-----------|-------------|
| arbeitsvertrag | 655 | 11 | NachwG, BAG 2 AZR 160/24, MiLoG 13,90 ab 2026 |
| aufhebungsvertrag | 622 | 10 | § 623 BGB, Sperrzeit § 159 SGB III, Faires Verhandeln BAG 6 AZR 75/18 |
| berater | 640 | 10 | Beratungshaftung, § 49b BRAO, § 627 BGB, Scheinselbstständigkeit |
| darlehensvertrag | 682 | 12 | Verbraucherdarlehen, Vorfälligkeitsentschädigung § 502, KWG |
| freelancer | 631 | 10 | Herrenberg-Urteil, § 7a SGB IV, UrhG-Zweckübertragung |
| gesellschaftsvertrag | 787 | 13 | MoPeG-Reform 2024, BGH II ZR 71/23, KStG § 1a |
| individuell | 502 | 8 | Lite-Wizard, Universal-Sektionen |
| kaufvertrag | 680 | 11 | § 434 neuer Mangelbegriff, Aktualisierungspflicht digitale Produkte |
| kooperation | 547 | 11 | GbR-Risiko § 705, F&E-GVO, Art. 26 DSGVO |
| lizenzvertrag | 806 | 13 | TT-GVO, UsedSoft, Open-Source-Compliance |
| mietvertrag | 567 | 11 | Mietpreisbremse, BGH Schönheitsreparaturen, BEG IV |
| nda (Bestand) | 452 | 9 | GeschGehG, Geheimhaltungsstandards |
| pachtvertrag | 517 | 10 | Landpacht, Inventar, Fruchtziehung |
| softwareEndkunde | 793 | 13 | BGH SaaS=Mietvertrag, Schrems II/III, NIS2, FairKfG |
| softwareVertrieb | 711 | 12 | Channel-Vertrieb, Vertikal-GVO, IP-Pass-Through |
| werkvertrag | 680 | 11 | § 650f, BGH VII ZR 112/24, Schwarzarbeit-Nichtigkeit |

**Total:** 16 Playbooks · ~10.270 Zeilen JS-Code · 174 strategische Sektionen · ~660 KB Code

**Decision Engine Integration:**
- `backend/services/decisionEngine.js` Zeile 5-22: alle 16 Playbooks registriert (alphabetisch)
- Smoke-Test: `node -e "require('./services/decisionEngine')"` lädt fehlerfrei
- `listPlaybooks()` liefert alle 16 mit Title/Description/Icon/Difficulty/EstimatedTime/SectionCount/LegalBasis

**Frontend:** Keine Änderungen nötig — `GuidedContractWizard.tsx` ist generisch und lädt jedes Playbook automatisch über `GET /api/playbooks/:type`.

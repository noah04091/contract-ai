# Legal Lens 2.0 - Das ultimative Vertragsanalyse-Tool

## Vision
**"Jeden Vertrag verstehen - in Sekunden, nicht Stunden."**

Legal Lens macht komplexe Verträge für jeden verständlich. Wie ein erfahrener Anwalt, der dir alles in einfacher Sprache erklärt und auf kritische Stellen hinweist.

---

## UX-Prinzipien

### 1. Instant Value
Der Nutzer sieht sofort Wert - keine leeren Screens, kein Warten auf Klicks.

### 2. Progressive Disclosure
Einfaches zuerst, Details bei Bedarf. Nicht überwältigen.

### 3. Guided Experience
Der Nutzer wird geführt: "Starte hier" → "Schau dir das an" → "Das ist wichtig"

### 4. Mobile First
Verträge werden oft unterwegs geprüft (vor Unterschrift beim Notar, im Meeting).

---

## Neuer Flow

### Schritt 1: Smart Upload
```
┌─────────────────────────────────────────────────┐
│  📄 Vertrag hochladen                           │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │        PDF hier ablegen                  │   │
│  │        oder klicken zum Auswählen        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ✨ KI analysiert automatisch:                  │
│     • Vertragstyp erkennen                     │
│     • Risiken identifizieren                   │
│     • Wichtige Klauseln markieren              │
│                                                 │
│  📁 Oder: Bestehenden Vertrag auswählen (15)   │
└─────────────────────────────────────────────────┘
```

### Schritt 2: Sofort-Übersicht (NEU!)
Nach dem Upload sofort eine **Executive Summary** zeigen:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📋 Arbeitsvertrag - Max Mustermann GmbH                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   🔴 3      │  │   🟡 5      │  │   🟢 12     │             │
│  │ Kritisch    │  │ Prüfenswert │  │ Standard    │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
│  ⚠️  TOP 3 RISIKEN                                                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 1. 🔴 Unbegrenztes Wettbewerbsverbot (§ 12)                │  │
│  │    → 2 Jahre nach Ausscheiden, deutschlandweit              │  │
│  │    → Empfehlung: Auf 6 Monate + regional begrenzen          │  │
│  │                                                [Details →]  │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ 2. 🔴 Automatische Verlängerung (§ 3)                      │  │
│  │    → Stillschweigende Verlängerung um je 12 Monate          │  │
│  │    → Empfehlung: Befristung ohne auto. Verlängerung         │  │
│  │                                                [Details →]  │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ 3. 🟡 Überstunden-Pauschale (§ 5)                          │  │
│  │    → "Überstunden sind mit dem Gehalt abgegolten"           │  │
│  │    → Rechtlich fragwürdig, oft unwirksam                    │  │
│  │                                                [Details →]  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [📊 Vollständige Analyse]  [💬 Fragen stellen]  [📄 Export]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Schritt 3: Interaktive Klausel-Analyse
Zweispaltig wie bisher, aber verbessert:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ 📋 Arbeitsvertrag Max Mustermann GmbH          [👔 Arbeitnehmer ▾]  [📤] │
├─────────────────────────┬─────────────────────────────────────────────────┤
│ KLAUSELN (20)           │ ANALYSE                                         │
│ ─────────────────────── │ ─────────────────────────────────────────────── │
│                         │                                                 │
│ 🟢 § 1 Vertragsparteien │  § 12 - WETTBEWERBSVERBOT                      │
│ 🟢 § 2 Tätigkeit        │                                                 │
│ 🟡 § 3 Laufzeit         │  🔴 HOHES RISIKO                               │
│ 🟢 § 4 Gehalt           │                                                 │
│ 🟡 § 5 Überstunden      │  ┌─────────────────────────────────────────┐   │
│ 🟢 § 6 Urlaub           │  │ 🎯 Was bedeutet das für dich?           │   │
│ 🟢 § 7 Krankheit        │  │                                         │   │
│ 🟢 § 8 Kündigung        │  │ Du darfst nach Ende des Arbeits-        │   │
│ 🟢 § 9 Geheimhaltung    │  │ verhältnisses 2 JAHRE LANG in ganz     │   │
│ 🟢 § 10 Nebentätigkeit  │  │ Deutschland nicht für Konkurrenten      │   │
│ 🟢 § 11 Datenschutz     │  │ arbeiten.                               │   │
│ 🔴 § 12 Wettbewerbs... ◀│  │                                         │   │
│ 🟢 § 13 Schluss...      │  │ ⚠️ Das ist ungewöhnlich lang!          │   │
│                         │  └─────────────────────────────────────────┘   │
│                         │                                                 │
│ ─────────────────────── │  ┌─────────────────────────────────────────┐   │
│ 📊 20 analysiert        │  │ 💡 Bessere Alternative                  │   │
│ ✅ 15 okay              │  │                                         │   │
│ ⚠️  5 prüfen           │  │ "Das Wettbewerbsverbot gilt für        │   │
│                         │  │  einen Zeitraum von 6 Monaten nach     │   │
│                         │  │  Beendigung des Arbeitsverhältnisses   │   │
│                         │  │  im Umkreis von 50km um den            │   │
│                         │  │  Unternehmensstandort."                │   │
│                         │  │                                         │   │
│                         │  │                           [📋 Kopieren] │   │
│                         │  └─────────────────────────────────────────┘   │
│                         │                                                 │
│                         │  ┌─────────────────────────────────────────┐   │
│                         │  │ 🎯 So verhandelst du das                │   │
│                         │  │                                         │   │
│                         │  │ "Ich verstehe den Wunsch nach Schutz   │   │
│                         │  │ des Know-hows. Können wir über eine    │   │
│                         │  │ kürzere Laufzeit und regionale         │   │
│                         │  │ Begrenzung sprechen? 6 Monate wäre     │   │
│                         │  │ für mich akzeptabel."                  │   │
│                         │  │                                         │   │
│                         │  │                      [📧 E-Mail-Vorlage]│   │
│                         │  └─────────────────────────────────────────┘   │
│                         │                                                 │
│                         │  💬 Frage zur Klausel stellen...              │
│                         │  ┌─────────────────────────────────┐[Senden]  │
│                         │  │ Ist das rechtlich überhaupt...  │          │
│                         │  └─────────────────────────────────┘          │
│                         │                                                 │
└─────────────────────────┴─────────────────────────────────────────────────┘
```

---

## Perspektiven (verbessert)

Statt nur Icons → Klare Value Proposition:

| Perspektive | Icon | Beschreibung | Fokus |
|-------------|------|--------------|-------|
| **Arbeitnehmer** | 👔 | "Schütze deine Rechte" | Rechte, Pflichten, Fallstricke |
| **Arbeitgeber** | 🏢 | "Sichere dein Unternehmen" | Risiken, Pflichten, Haftung |
| **Neutral/Rechtlich** | ⚖️ | "Was sagt das Gesetz?" | Rechtliche Einordnung, Wirksamkeit |
| **Schnell-Check** | ⚡ | "Die wichtigsten Punkte" | TL;DR für Eilige |

---

## Neue Features

### 1. Smart Summary (automatisch)
- Sofort nach Upload
- 3-5 wichtigste Punkte
- Risiko-Score (0-100)
- Empfehlung: "Verhandeln" / "Prüfen lassen" / "Okay"

### 2. Vergleich mit Marktstandard
- "Diese Kündigungsfrist ist ÜBERDURCHSCHNITTLICH lang"
- "Solche Klauseln sind bei 80% der Verträge NICHT enthalten"

### 3. Checkliste vor Unterschrift
```
┌─────────────────────────────────────────────────────────┐
│ ✅ CHECKLISTE VOR UNTERSCHRIFT                          │
├─────────────────────────────────────────────────────────┤
│ ☑️ Alle kritischen Klauseln geprüft                     │
│ ☑️ Gehalt und Benefits verstanden                       │
│ ☐ Kündigungsfrist akzeptabel (3 Monate!)               │
│ ☐ Wettbewerbsverbot verhandelt                          │
│ ☑️ Urlaubstage wie besprochen                           │
│ ☑️ Überstundenregelung verstanden                       │
├─────────────────────────────────────────────────────────┤
│ 4/6 Punkte erledigt                    [PDF exportieren]│
└─────────────────────────────────────────────────────────┘
```

### 4. Verhandlungs-Assistent
- Formulierungsvorschläge
- E-Mail-Templates
- "So sagst du es diplomatisch"

### 5. Vertragstyp-spezifische Analyse
- Arbeitsvertrag → Fokus auf Kündigungsschutz, Überstunden, Urlaub
- Mietvertrag → Fokus auf Nebenkosten, Kündigungsfrist, Schönheitsreparaturen
- Kaufvertrag → Fokus auf Gewährleistung, Rücktritt, Haftung
- Dienstleistungsvertrag → Fokus auf Leistungsumfang, Haftung, Abnahme

---

## Mobile Ansicht

```
┌─────────────────────────┐
│ ◀ Arbeitsvertrag       │
├─────────────────────────┤
│                         │
│  🔴 § 12 Wettbewerb    │
│  ─────────────────────  │
│                         │
│  Was bedeutet das?      │
│  ┌───────────────────┐  │
│  │ Du darfst 2 Jahre │  │
│  │ nicht bei der     │  │
│  │ Konkurrenz...     │  │
│  └───────────────────┘  │
│                         │
│  💡 Bessere Alternative │
│  [Antippen zum Anzeigen]│
│                         │
│  🎯 Verhandlungstipp    │
│  [Antippen zum Anzeigen]│
│                         │
│  ─────────────────────  │
│                         │
│  💬 Frage stellen       │
│  ┌───────────────────┐  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
├─────────────────────────┤
│  ◀ § 11  │ ÜBERSICHT │ § 13 ▶ │
└─────────────────────────┘
```

---

## Technische Verbesserungen

### 1. Intelligenteres Parsing
- Bessere Erkennung von Paragraphen (§, Art., Ziffer)
- Fallback auf Absätze bei unstrukturierten Verträgen
- OCR-Support für gescannte PDFs

### 2. Caching & Performance
- Analyse-Ergebnisse cachen
- Progressive Loading (erst Summary, dann Details)
- Offline-Fähigkeit für bereits analysierte Verträge

### 3. Export-Optionen
- PDF-Report mit allen Analysen
- Word-Dokument mit Änderungsvorschlägen
- E-Mail-fertige Verhandlungsvorlage

---

## Nächste Schritte

### Phase 1: Foundation (JETZT)
- [x] Bug: Verträge laden nicht
- [x] Bug: Klausel-Parsing verbessert (S3-Fallback)
- [ ] Smart Summary nach Upload
- [ ] Verbesserte Klausel-Erkennung

### Phase 2: UX Polish
- [ ] Neue Startseite mit Sofort-Übersicht
- [ ] Mobile-optimierte Ansicht
- [ ] Perspektiven-Switcher verbessern

### Phase 3: Premium Features
- [ ] Checkliste vor Unterschrift
- [ ] E-Mail-Vorlagen
- [ ] PDF-Export mit Analyse

---

## Erfolgsmetriken

| Metrik | Aktuell | Ziel |
|--------|---------|------|
| Zeit bis erste Erkenntnis | ~30 Sek | < 5 Sek |
| Abbruchrate | ? | < 10% |
| "Analyse hilfreich" Rating | ? | > 4.5/5 |
| Feature Usage (Chat) | ? | > 30% |
| Wiederkehrende Nutzer | ? | > 60% |

---

*Konzept erstellt: 15.12.2024*
*Version: 2.0 Draft*

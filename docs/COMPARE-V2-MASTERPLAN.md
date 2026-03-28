# Compare V2 — Masterplan

Stand: 27.03.2026

---

## 1. Zielbild

Compare V2 ist eine **mehrschichtige Analyse-Engine**, kein "smarter Prompt mit UI".

### Was Compare V2 leisten muss

- Zwei Dokumente strukturiert zerlegen, Wert für Wert vergleichen, juristisch/wirtschaftlich bewerten
- Jeder konkrete Zahlenwert (Gebühr, Frist, Limit, Betrag) wird **deterministisch** erkannt und verglichen — nicht von GPT geraten
- GPT ist ausschließlich für **Interpretation** zuständig: Was bedeutet ein Unterschied? Wie schwer wiegt er? Was sollte man tun?
- Ergebnisse sind **nachvollziehbar**: Jede Aussage ist auf eine Fundstelle im Originaltext rückführbar
- Falsche Fakten (z.B. "Flatrate-Gebühr fehlt" obwohl sie im Dokument steht) sind **systemisch ausgeschlossen**, nicht nur per Prompt verboten

### Was Compare V2 NICHT ist

- Kein ChatGPT-Wrapper mit hübschem UI
- Kein System das auf Prompt-Formulierung angewiesen ist um korrekte Fakten zu liefern
- Kein System das man nach jedem Testvertrag nachtunen muss

### Wann Compare V2 fertig ist

- 5 verschiedene Vertragstypen (NDA, Factoring, Freelancer, SaaS, Mietvertrag) liefern korrekte Ergebnisse
- Kein einziger "Keine Regelung vorhanden"-Fehler bei Werten die im Dokument stehen
- Scores sind konsistent mit den identifizierten Risiken
- Ergebnisse sind mindestens so gut wie ChatGPT-Upload, aber strukturierter

---

## 2. Problemursachen — Ehrliche Diagnose

### Was funktioniert

| Bereich | Status | Datei(en) | Bewertung |
|---------|--------|-----------|-----------|
| Frontend (5 Tabs, Perspective, CSS) | Fertig | CompareResults.tsx + 5 Tab-Komponenten, Compare.module.css (1657 Zeilen) | Gut, zeigt an was Backend liefert |
| TypeScript Types | Fertig | types/compare.ts (326 Zeilen, alle V2 Interfaces) | Vollständig |
| Backend Route | Fertig | routes/compare.js (V2 Pipeline, SSE, Re-Analyze Endpoint) | Stabil |
| Phase A Architektur | Fertig | compareAnalyzer.js: structureContract(), buildPhaseAPrompt() | Struktur OK |
| Phase B Architektur | Fertig | compareAnalyzer.js: compareContractsV2(), buildPhaseBPrompt() | Struktur OK |
| Clause Matching | Fertig | clauseMatcher.js (Token-Overlap + optionale Embeddings) | Funktioniert |
| Market Benchmark | Fertig | marketBenchmarks.js (4 Vertragstypen, deterministisch) | Funktioniert, aber fragil |
| Score-Stabilisierung | Fertig | compareAnalyzer.js: stabilizeScores() | Guter Safety-Mechanismus |
| Identical-Clause-Filter | Fertig | compareAnalyzer.js: filterIdenticalClauses() | Funktioniert |

### Was NICHT funktioniert — Die 4 Kernprobleme

**Problem 1 — Phase A extrahiert Werte unzuverlässig (Schicht 1)**

Phase A soll jeden Zahlenwert im Dokument als keyValue in der Dokumentenkarte erfassen.
In der Praxis: GPT-4o übersieht regelmäßig Werte aus Konditionenblättern, Tabellen und Kopfdaten.

Konkretes Beispiel (Factoring-Verträge vom 27.03.2026):
- Vertrag 1 hat ein Konditionenblatt auf Seite 1: Flatrate 1,95%, Ankauflimit EUR 150.000, Selbstbehalt EUR 5.000, Einrichtungsgebühr EUR 500, Mindestgebühr EUR 15.000
- Phase A hat die Werte für Vertrag 2 extrahiert, aber bei Vertrag 1 teilweise übersehen
- Ergebnis: Phase B sagt "Fehlende Flatrate-Gebühr in Vertrag 1" — obwohl sie dort steht

Warum passiert das?
- `buildPhaseAPrompt()` (Zeile 181-242) gibt allgemeine Anweisungen, ist aber nicht spezifisch genug für tabellarische Daten
- `validatePhaseAResponse()` (Zeile 786-824) prüft nur ob keyValues ein Objekt ist (`typeof === 'object'`), NICHT ob es Werte enthält
- Ein leeres `{}` besteht die Validierung genauso wie ein volles `{"Flatrate": "1,95%"}`
- Es gibt keine Nachprüfung: Wenn GPT einen Wert übersieht, merkt das niemand

**Problem 2 — Kein deterministischer Wertevergleich (Schicht 2 fehlt komplett)**

Phase A extrahiert keyValues für beide Verträge. Diese werden dann an Phase B übergeben — zusammen mit 60.000+ Zeichen Volltext. Phase B soll selbst herausfinden, wo die Unterschiede liegen.

Das ist das **Kernproblem**: GPT sucht Fakten-Unterschiede in einem riesigen Text, statt dass der Code die bereits strukturierten keyValues vergleicht.

Was existiert:
- `detectGaps()` (Zeile 1356-1410) vergleicht keyValues — aber erst NACH Phase B, als Lückenfüller
- `compareClauseKeyValues()` (Zeile 1435-1506) enthält die richtige Logik (Keys normalisieren, matchen, Werte vergleichen)
- Diese Logik ist also schon da, aber an der **falschen Stelle** in der Pipeline

Was fehlt:
- Diese Logik muss VOR Phase B laufen, nicht danach
- Die Ergebnisse müssen Phase B als feste Faktenbasis übergeben werden
- Phase B darf dann nur noch **bewerten**, nicht mehr **suchen**

**Problem 3 — Phase B ist überlastet (Schicht 3)**

Phase B macht aktuell 9 Schritte in einem einzigen GPT-Call:
1. Schritt 0: valueExtraction (alle Werte aus Volltext extrahieren)
2. Schritt 1: Unterschiede FINDEN (max. 30)
3. Schritt 2: Stärken & Schwächen
4. Schritt 3: Risiko-Level
5. Schritt 4: Overall Score
6. Schritt 5: Gesamturteil
7. Schritt 6: 5 Kategorie-Scores
8. Schritt 7: Risiko-Analyse mit Reasoning Chain
9. Schritt 8: Verbesserungsvorschläge mit Alternativtext

Plus: Perspektiven-Block, Modus-Block, Profil-Block, Dokumenttyp-Erkennung, Bewertungslogik (5 Regeln), Priorisierungsregeln (5 Stufen).

Das sind ~3.200 Zeilen Prompt-Instruktion + 120.000+ Zeichen Kontext (2x Dokumentenkarte + 2x Volltext). GPT-4o muss in einem einzigen Output (~12K Tokens) all das produzieren. Kein Wunder, dass dabei Fakten falsch werden.

**Problem 4 — Symptom-Behandlung statt System-Lösung**

Bisherige Fixes (alle Prompt-basiert oder Nachbearbeitungs-Hacks):
- `crossCheckWithValueExtraction()` — Versucht GPT's eigene valueExtraction gegen seine eigenen Unterschiede zu prüfen (GPT prüft GPT — zirkulär)
- Schritt 0 valueExtraction im Prompt — Zwingt GPT, Werte als JSON-Feld aufzulisten (aber GPT kann trotzdem Werte übersehen)
- "KRITISCHE REGEL" / "ABSOLUT VERBINDLICH" im Prompt — GPT liest das, befolgt es aber nicht zuverlässig bei langen Texten
- Timeout-Erhöhungen — Verhindern Fallback, lösen aber keine Qualitätsprobleme

Keiner dieser Fixes adressiert die Ursache: **GPT soll keine Fakten finden müssen.**

---

## 3. Schichtenmodell — Zielarchitektur

### Übersicht

```
┌─────────────────────────────────────────────────────────┐
│  SCHICHT 5 — UI / Darstellung                           │
│  React: Tabs, Scores, Risiken, Empfehlungen, Export     │
│  Status: FERTIG ✅                                      │
├─────────────────────────────────────────────────────────┤
│  SCHICHT 4 — Produktlogik                               │
│  Code: Scores, Benchmark, Winner, Perspektive, Modi     │
│  Status: FERTIG ✅                                      │
├─────────────────────────────────────────────────────────┤
│  SCHICHT 3 — Juristische/wirtschaftliche Bewertung      │
│  GPT-4o: Bewertet BEKANNTE Unterschiede aus Schicht 2   │
│  Status: MUSS UMGEBAUT WERDEN ⚠️                       │
├─────────────────────────────────────────────────────────┤
│  SCHICHT 2 — Deterministischer Vergleich                │
│  Reiner Code: keyValues vergleichen, Gaps erkennen      │
│  Status: EXISTIERT NICHT (nur Fragment in detectGaps) 🔴│
├─────────────────────────────────────────────────────────┤
│  SCHICHT 1 — Dokumentstruktur / Extraktion              │
│  GPT-4o Phase A + Code-Validierung + Anreicherung       │
│  Status: VORHANDEN, ABER UNZUVERLÄSSIG ⚠️              │
└─────────────────────────────────────────────────────────┘
```

### Verantwortlichkeiten — Wer macht was

| Schicht | Zuständig für | NICHT zuständig für | Technologie | Datei(en) |
|---------|--------------|---------------------|-------------|-----------|
| **1 — Extraktion** | Dokument → Klauseln + keyValues. Jeder Zahlenwert muss als Key-Value erfasst sein. | Bewertung, Vergleich, Empfehlungen | GPT-4o (Phase A) + Regex-Anreicherung + Validierung | compareAnalyzer.js |
| **2 — Vergleich** | keyValues beider Dokumente Wert für Wert vergleichen. Fehlende Bereiche erkennen. Fakten-Unterschiede als strukturierte Liste ausgeben. | Interpretation, Severity, Empfehlungen | **Reiner Code, kein GPT** | compareAnalyzer.js (neu) |
| **3 — Bewertung** | Bereits identifizierte Unterschiede aus Schicht 2 interpretieren: Severity, Risiko, Empfehlung, Alternativtext. PLUS: Qualitative Unterschiede erkennen die in keyValues nicht stehen (z.B. unterschiedliche Haftungsformulierungen). | Fakten-Unterschiede FINDEN bei konkreten Werten | GPT-4o (Phase B, reduziert) | compareAnalyzer.js |
| **4 — Produktlogik** | Scores stabilisieren, Benchmark vergleichen, Perspektive anwenden, Winner bestimmen | Faktenermittlung, UI | Code + Regeln | compareAnalyzer.js + marketBenchmarks.js |
| **5 — UI** | Daten anzeigen, Tabs, Export, Interaktion | Datenqualität, Logik | React + CSS Modules | Compare.tsx + Tabs + CSS |

### Die entscheidende Architekturänderung

```
HEUTE (Fehleranfällig):
  Phase A → Clause Matching → Phase B (SUCHT + BEWERTET) → Gap Detection → Benchmark

ZIEL (Zuverlässig):
  Phase A → Validierung+Anreicherung → DETERMINISTISCHER VERGLEICH + Gaps → Phase B (NUR BEWERTUNG) → Benchmark
```

**Der Unterschied:** Phase B bekommt eine feste Liste von Fakten-Unterschieden und muss diese nur noch bewerten. Phase B erfindet keine Fakten mehr.

---

## 4. Fehlerklassen — Vollständiger Katalog

### Systematik

Jede Fehlerklasse ist einer Schicht zugeordnet. Wenn ein Fehler auftritt, wird er in der zuständigen Schicht behoben — nirgendwo anders.

| # | Fehlerklasse | Konkretes Beispiel | Schicht | Lösung | Testkriterium |
|---|-------------|-------------------|---------|--------|---------------|
| F1 | **Wert nicht extrahiert** | Flatrate-Gebühr 1,95% aus Konditionenblatt fehlt in keyValues | 1 | Regex-Nachextraktion + Validierung | Phase A keyValues enthalten den Wert |
| F2 | **Wert falsch extrahiert** | Inkasso-Gebühr (0,7%) wird als Flatrate-Gebühr (1,95%) erfasst | 1 | Phase A Prompt: keyValue-Keys müssen aus Dokumenttext übernommen werden, nicht frei gewählt | keyValue-Key entspricht dem Label im Dokument |
| F3 | **Klausel fehlt in Dokumentenkarte** | §5 Haftung existiert im Vertrag, wurde aber nicht als Klausel extrahiert | 1 | Validierung: Min. 3 Klauseln pro Vertrag, mind. 1 Klausel mit keyValues | Klauselanzahl ≥ 3 |
| F4 | **Vorhandener Wert als fehlend gemeldet** | "Keine Regelung" obwohl Flatrate 1,95% im Dokument steht | 2 | Deterministischer Vergleich: Code vergleicht keyValues, GPT sagt nie mehr "fehlt" | 0 falsche "Keine Regelung" bei Werten die in keyValues stehen |
| F5 | **Unterschied übersehen** | Selbstbehalt EUR 5.000 vs. EUR 1.000 wird nicht als Unterschied gemeldet | 2 | Systematischer keyValue-Diff vergleicht JEDEN Wert | Jeder numerische keyValue-Unterschied wird als Differenz gemeldet |
| F6 | **Bereich fehlt in einem Vertrag** | Vertrag 1 hat Datenschutz-Klausel, Vertrag 2 nicht | 2 | Gap Detection (existiert bereits in detectGaps, wird Teil von Schicht 2) | Fehlende Bereiche werden erkannt |
| F7 | **Severity falsch** | Gebührenunterschied von EUR 10.000/Jahr als "low" bewertet | 3 | Phase B Prompt fokussiert auf Bewertung mit klaren Severity-Regeln | Gebührenunterschiede > 1.000 EUR/Jahr mindestens "medium" |
| F8 | **Risiko falsch priorisiert** | Formaler Namensfehler als "critical" markiert | 3 | Phase B bekommt Fakten aus Schicht 2 → weniger Rauschen → bessere Fokussierung | Kein formaler Unterschied als "critical" |
| F9 | **Empfehlung ohne Substanz** | Generischer Alternativtext der nicht zum Vertragstyp passt | 3 | Phase B bekommt Vertragstyp + konkrete Werte → kann spezifische Texte formulieren | Jeder Alternativtext referenziert konkrete Werte |
| F10 | **Score widersprüchlich** | Overall Score 85 trotz 3 kritischer Risiken | 4 | stabilizeScores() existiert bereits + Regel: Score = f(Risiken, Unterschiede) | Kein Score > 65 bei ≥ 1 kritischem Risiko |
| F11 | **Benchmark-Wert falsch zugeordnet** | Inkasso-Gebühr (0,7%) als Flatrate-Benchmark angezeigt | 4 | Benchmark liest aus Phase A keyValues → wenn Phase A korrekt, ist Benchmark korrekt | Benchmark-Wert = keyValue-Wert |
| F12 | **UI verschluckt Daten** | ContractMap-Tab verschwindet still wenn contractMap null ist | 5 | Frontend zeigt Fallback-Hinweis statt leeres Tab | User sieht immer eine Erklärung |

---

## 5. Konkrete Maßnahmen — Detaillierte Spezifikation

### Maßnahme A — Phase A Extraktion härten (Schicht 1)

**Löst:** F1 (Wert nicht extrahiert), F2 (Wert falsch extrahiert), F3 (Klausel fehlt)

#### A.1 — Neue Funktion: `enrichKeyValuesFromText(clauses, sourceText)`

**Wann aufgerufen:** Direkt nach `expandOriginalTexts()` in `structureContract()`, also nach Phase A GPT-Call und Validierung.

**Was sie tut:**
Jede Klausel hat ein `originalText`-Feld mit dem wörtlichen Vertragstext. Diese Funktion durchsucht diesen Text mit Regex nach konkreten Werten die GPT möglicherweise nicht in keyValues erfasst hat.

**Algorithmus:**

```
Für jede Klausel in clauses:
  1. Nimm den originalText der Klausel
  2. Suche mit Regex nach Wert-Mustern:

     Muster für Prozentsätze:
       /(\d+[.,]\d+)\s*(%|Prozent|v\.?\s*H\.?)/gi
       Beispiel: "1,95 %" → key: aus Kontext, value: "1,95%"

     Muster für EUR-Beträge:
       /(EUR|€)\s*([\d.,]+)|(\d[\d.,]*)\s*(EUR|Euro|€)/gi
       Beispiel: "EUR 150.000" → key: aus Kontext, value: "EUR 150.000"

     Muster für Fristen/Zeiträume:
       /(\d+)\s*(Monate?|Wochen?|Tage?|Jahre?|Werktage?)/gi
       Beispiel: "3 Monate" → key: aus Kontext, value: "3 Monate"

     Muster für Limits:
       /(mindestens|höchstens|maximal|minimal|bis zu|ab)\s*([\d.,]+\s*(%|EUR|€|Monate?))/gi
       Beispiel: "höchstens EUR 5.000" → key: aus Kontext, value: "höchstens EUR 5.000"

  3. Für jeden gefundenen Wert:
     a) Extrahiere den Kontext: 5-10 Wörter VOR dem Wert als Key-Kandidat
        Beispiel: "Die Flatrate-Gebühr beträgt 1,95%" → Key: "Flatrate-Gebühr"
     b) Normalisiere den Key: lowercase, Bindestriche→Leerzeichen
     c) Prüfe ob ein ähnlicher Key bereits in keyValues existiert:
        - Exakt gleich → skip (schon vorhanden)
        - Substring-Match → skip (schon vorhanden unter anderem Namen)
     d) Wenn NICHT vorhanden → zu keyValues hinzufügen

  4. Logge: "📋 Enrichment: +{n} keyValues für Klausel {id}"

Zusätzlich: Durchsuche auch den GESAMTEN sourceText nach Werten die
in KEINER Klausel stehen (z.B. Kopfdaten/Header die GPT nicht als
Klausel erfasst hat).
Wenn Werte gefunden werden die keiner Klausel zugeordnet sind:
  → Erstelle eine neue Klausel mit area "payment" oder "other"
    und trage die Werte als keyValues ein.
```

**Beispiel-Durchlauf mit Factoring-Vertrag:**

```
Klausel: payment_1
originalText: "Factoringart Offen – Flatrate Flatrate-Gebühr in % des
  Forderungsnennbetrages p.a.: 1,95%"
Bestehende keyValues: {} (leer — GPT hat nichts extrahiert)

Regex findet: "1,95%"
Kontext davor: "Flatrate-Gebühr in % des Forderungsnennbetrages p.a."
→ Key: "Flatrate-Gebühr"
→ keyValues wird: { "Flatrate-Gebühr": "1,95%" }

Regex findet im nächsten Absatz: "EUR 150.000"
Kontext davor: "Ankauflimit in EUR"
→ Key: "Ankauflimit"
→ keyValues wird: { "Flatrate-Gebühr": "1,95%", "Ankauflimit": "EUR 150.000" }
```

**Edge Cases:**
- Wert kommt mehrfach vor (z.B. Gebühr im Konditionenblatt UND im Vertragstext) → nur einmal erfassen
- Kontext-Extraktion unklar (z.B. "gemäß § 3 beträgt der Betrag 500 EUR") → Key wird aus dem nächstliegenden Substantiv abgeleitet
- Prozentwerte ohne klaren Kontext → Key wird die Klausel-Überschrift + "Satz" (z.B. "Vergütungssatz")

#### A.2 — `validatePhaseAResponse()` verschärfen

**Aktuelle Validierung (Zeile 786-824):**
```javascript
// Prüft nur: Ist keyValues ein Objekt? Ja → okay.
keyValues: (typeof c.keyValues === 'object' && ...) ? c.keyValues : {}
```

**Neue Validierung (zusätzlich):**

```javascript
// Nach der bestehenden Validierung:

// Qualitätsprüfung 1: Mindestens 3 Klauseln
if (result.clauses.length < 3) {
  console.warn(`⚠️ Phase A Qualitätsproblem: Nur ${result.clauses.length} Klauseln extrahiert`);
  result._extractionQuality = 'low';
}

// Qualitätsprüfung 2: Mindestens 1 Klausel mit keyValues
const clausesWithValues = result.clauses.filter(c => Object.keys(c.keyValues).length > 0);
if (clausesWithValues.length === 0) {
  console.warn(`⚠️ Phase A Qualitätsproblem: Keine Klausel hat keyValues`);
  result._extractionQuality = 'low';
}

// Qualitätsprüfung 3: Payment-Klauseln sollten keyValues haben
const paymentClauses = result.clauses.filter(c => c.area === 'payment');
const paymentWithValues = paymentClauses.filter(c => Object.keys(c.keyValues).length > 0);
if (paymentClauses.length > 0 && paymentWithValues.length === 0) {
  console.warn(`⚠️ Phase A Qualitätsproblem: ${paymentClauses.length} Payment-Klauseln, aber keine hat keyValues`);
  result._extractionQuality = 'low';
}

// Qualitätsprüfung 4: Parties nicht leer
if (result.parties.length === 0) {
  console.warn(`⚠️ Phase A Qualitätsproblem: Keine Parteien erkannt`);
  result._extractionQuality = 'low';
}
```

`_extractionQuality` wird durchgereicht und kann in Phase B als Warnung verwendet werden (GPT weiß dann: "Die Dokumentenkarte könnte unvollständig sein, verlass dich stärker auf den Volltext").

#### A.3 — `structureContract()` Erweiterung

**Aktueller Ablauf (Zeile 244-270):**
```
GPT-Call → parse JSON → validatePhaseAResponse → expandOriginalTexts → return
```

**Neuer Ablauf:**
```
GPT-Call → parse JSON → validatePhaseAResponse → expandOriginalTexts → enrichKeyValuesFromText → return
```

**Datei:** `compareAnalyzer.js`
**Aufwand:** ~2h
**Testkriterium:** `structureContract(factoringVertrag1Text)` liefert keyValues mit: Flatrate-Gebühr, Ankauflimit, Sicherungseinbehalt, Selbstbehalt, Einrichtungsgebühr, Mindestgebühr

---

### Maßnahme B — Deterministischer Wertevergleich (Schicht 2) — KERNSTÜCK

**Löst:** F4 (Vorhandener Wert als fehlend), F5 (Unterschied übersehen), F6 (Bereich fehlt)

#### B.1 — Neue Funktion: `buildDeterministicDifferences(map1, map2, clauseMatchResult)`

**Wann aufgerufen:** Nach Phase A Validierung+Anreicherung, VOR Phase B.

**Was sie tut:** Vergleicht die keyValues beider Verträge programmatisch und erzeugt eine strukturierte Liste von Fakten-Unterschieden. Diese Liste wird Phase B als feste Grundlage übergeben.

**Algorithmus im Detail:**

```
INPUT:
  map1: Dokumentenkarte Vertrag 1 (mit angereicherten keyValues)
  map2: Dokumentenkarte Vertrag 2 (mit angereicherten keyValues)
  clauseMatchResult: Ergebnis aus matchClauses() (welche Klauseln zusammengehören)

OUTPUT:
  Array<DeterministicDifference>:
    {
      area: ClauseArea,          // z.B. "payment"
      key: string,               // z.B. "Flatrate-Gebühr"
      value1: string | null,     // z.B. "1,95%" — null wenn nur in Vertrag 2
      value2: string | null,     // z.B. "2,90%" — null wenn nur in Vertrag 1
      numValue1: number | null,  // z.B. 1.95
      numValue2: number | null,  // z.B. 2.90
      unit: string | null,       // z.B. "%", "EUR", "Monate"
      diffType: 'numeric' | 'text' | 'only_in_1' | 'only_in_2',
      section1: string | null,   // Fundstelle in Vertrag 1
      section2: string | null,   // Fundstelle in Vertrag 2
    }

ALGORITHMUS:

Schritt 1 — keyValues pro Area sammeln:
  Für jede clauseArea (payment, liability, termination, ...):
    areaKV1 = {} // alle keyValues aller Klauseln dieser Area aus Vertrag 1
    areaKV2 = {} // alle keyValues aller Klauseln dieser Area aus Vertrag 2

    Für jede Klausel in map1.clauses mit passender Area:
      Object.assign(areaKV1, klausel.keyValues)
      Merke section für diese Klausel

    Gleich für map2

Schritt 2 — Keys normalisieren und matchen:
  normalize(key):
    - lowercase
    - Bindestriche und Unterstriche → Leerzeichen
    - Mehrfach-Leerzeichen → ein Leerzeichen
    - Trim

  Für jeden Key in areaKV1:
    Suche den besten Match in areaKV2:
      a) Exakt gleich (normalisiert)          → Match
      b) Einer enthält den anderen als Substring → Match
      c) Levenshtein-Distanz ≤ 3              → Match (für Tippfehler)
      d) Kein Match gefunden                   → "only_in_1"

  Für jeden Key in areaKV2 der NICHT gematcht wurde:
    → "only_in_2"

Schritt 3 — Werte vergleichen:
  Für jedes gematchte Key-Paar:
    Extrahiere numerischen Wert + Einheit aus beiden:
      extractValueAndUnit(str):
        "1,95%"          → { num: 1.95, unit: "%" }
        "EUR 150.000"    → { num: 150000, unit: "EUR" }
        "3 Monate"       → { num: 3, unit: "Monate" }
        "entfällt"       → { num: null, unit: null, text: "entfällt" }

    Wenn BEIDE numerisch:
      Wenn num1 !== num2 → diffType: 'numeric'
      Wenn num1 === num2 → KEIN Unterschied (skip)

    Wenn MINDESTENS einer nicht numerisch:
      Wenn normalisierter Text gleich → KEIN Unterschied (skip)
      Sonst → diffType: 'text'

Schritt 4 — Fehlende Bereiche erkennen (integrierte Gap Detection):
  Für jede Area die nur in map1 vorkommt:
    → Alle keyValues dieser Area als "only_in_1" Unterschiede
    → Zusätzlich: Ein "area_missing" Unterschied auf Area-Ebene

  Für jede Area die nur in map2 vorkommt:
    → Gleich

  Skip-Liste: 'parties', 'subject' (diese sollten in beiden vorhanden sein,
  Unterschiede bei Parteien sind erwartet und kein Problem)

Schritt 5 — Ergebnis sortieren:
  Sortierung nach Priorität:
    1. payment-Area Unterschiede zuerst
    2. Numerische Unterschiede vor Text-Unterschieden
    3. Größerer prozentualer Unterschied zuerst
```

**Beispiel-Durchlauf mit Factoring-Verträgen:**

```
Phase A Ergebnis nach Anreicherung:

  Vertrag 1 keyValues (payment Area):
    { "Factoringart": "Offen – Flatrate",
      "Flatrate-Gebühr": "1,95%",
      "Ankauflimit": "EUR 150.000",
      "Sicherungseinbehalt": "2,3205%",
      "Selbstbehalt": "EUR 5.000 p.a.",
      "Einrichtungsgebühr": "EUR 500",
      "Mindestgebühr": "EUR 15.000" }

  Vertrag 2 keyValues (payment Area):
    { "Factoringart": "Still – Flatrate - Mahnwesen",
      "Flatrate-Gebühr": "2,90%",
      "Ankauflimit": "EUR 50.000",
      "Sicherungseinbehalt": "10%",
      "Selbstbehalt": "EUR 1.000 p.a.",
      "Einrichtungsgebühr": "entfällt" }

Schritt 2 — Key Matching:
  "Factoringart" ↔ "Factoringart"           → Match (exakt)
  "Flatrate-Gebühr" ↔ "Flatrate-Gebühr"     → Match (exakt)
  "Ankauflimit" ↔ "Ankauflimit"             → Match (exakt)
  "Sicherungseinbehalt" ↔ "Sicherungseinbehalt" → Match (exakt)
  "Selbstbehalt" ↔ "Selbstbehalt"           → Match (exakt)
  "Einrichtungsgebühr" ↔ "Einrichtungsgebühr" → Match (exakt)
  "Mindestgebühr" → kein Match               → only_in_1

Schritt 3 — Werte vergleichen:
  Factoringart: "Offen – Flatrate" vs "Still – Flatrate - Mahnwesen" → text diff
  Flatrate-Gebühr: 1.95% vs 2.90%              → numeric diff (+48,7%)
  Ankauflimit: 150.000 EUR vs 50.000 EUR        → numeric diff (-66,7%)
  Sicherungseinbehalt: 2.32% vs 10%             → numeric diff (+331%)
  Selbstbehalt: 5.000 EUR vs 1.000 EUR          → numeric diff (-80%)
  Einrichtungsgebühr: 500 EUR vs "entfällt"      → text diff (Wert vs. kein Wert)
  Mindestgebühr: 15.000 EUR vs null              → only_in_1

ERGEBNIS: 7 deterministische Unterschiede
  → Diese gehen als feste Fakten an Phase B
  → Phase B KANN NICHT behaupten dass Flatrate-Gebühr in Vertrag 1 fehlt
```

#### B.2 — Hilfsfunktionen

**`extractValueAndUnit(str)`**
```
Input: "1,95%" → Output: { num: 1.95, unit: "%", raw: "1,95%" }
Input: "EUR 150.000" → Output: { num: 150000, unit: "EUR", raw: "EUR 150.000" }
Input: "3 Monate" → Output: { num: 3, unit: "Monate", raw: "3 Monate" }
Input: "entfällt" → Output: { num: null, unit: null, raw: "entfällt" }
Input: "Offen – Flatrate" → Output: { num: null, unit: null, raw: "Offen – Flatrate" }

Regex-Pipeline:
  1. /(\d[\d.,]*)\s*(%|Prozent)/  → Prozent
  2. /(EUR|€)\s*([\d.,]+)/        → EUR-Betrag
  3. /(\d[\d.,]*)\s*(EUR|Euro|€)/ → EUR-Betrag (umgekehrt)
  4. /(\d+)\s*(Monate?|Wochen?|Tage?|Jahre?)/ → Zeitraum
  5. /(\d[\d.,]*)/ als Fallback   → Zahl ohne Einheit
  6. Kein Match                    → Text

Zahlen-Normalisierung:
  "150.000" → 150000 (deutscher Tausenderpunkt)
  "1,95" → 1.95 (deutsches Dezimalkomma)
  "150.000,50" → 150000.50
  Regel: Punkt VOR Komma + >2 Nachkommastellen = Tausenderpunkt
```

**`normalizeKey(key)`**
```
Input: "Flatrate-Gebühr" → Output: "flatrate gebühr"
Input: "Flatrategebühr"  → Output: "flatrategebühr"
Input: "Flat-Rate Gebühr" → Output: "flat rate gebühr"

Schritte:
  1. toLowerCase()
  2. Bindestriche/Unterstriche → Leerzeichen
  3. Trim + Mehrfach-Leerzeichen → ein Leerzeichen
```

**`fuzzyKeyMatch(normKey1, normKey2)`**
```
Returns true wenn:
  a) normKey1 === normKey2
  b) normKey1.includes(normKey2) || normKey2.includes(normKey1)
  c) Levenshtein(normKey1, normKey2) <= 3 (für Tippfehler wie "gebühr" vs "gebuehr")
  d) Jaccard-Similarity der Wörter > 0.6 (für umgestellte Wörter)
```

#### B.3 — Formatierung für Phase B

Die deterministischen Unterschiede werden als strukturierter Text an Phase B übergeben:

```
PROGRAMMATISCH IDENTIFIZIERTE WERTE-UNTERSCHIEDE (FAKTEN — NICHT ÄNDERN):

Die folgenden Unterschiede wurden durch exakten Wertevergleich der Dokumentenkarten ermittelt.
Diese Fakten sind verifiziert und dürfen in deiner Analyse NICHT verändert, weggelassen oder
als "Keine Regelung" uminterpretiert werden.

Bereich: Vergütung/Zahlung
┌──────────────────────────┬───────────────────┬───────────────────┐
│ Wert                     │ Dokument 1        │ Dokument 2        │
├──────────────────────────┼───────────────────┼───────────────────┤
│ Factoringart             │ Offen – Flatrate  │ Still – Flatrate  │
│ Flatrate-Gebühr          │ 1,95%             │ 2,90%             │
│ Ankauflimit              │ EUR 150.000       │ EUR 50.000        │
│ Sicherungseinbehalt      │ 2,3205%           │ 10%               │
│ Selbstbehalt             │ EUR 5.000 p.a.    │ EUR 1.000 p.a.    │
│ Einrichtungsgebühr       │ EUR 500           │ entfällt          │
│ Mindestgebühr            │ EUR 15.000        │ — (nicht vorhanden)│
└──────────────────────────┴───────────────────┴───────────────────┘

Bereich: Kündigung
┌──────────────────────────┬───────────────────┬───────────────────┐
│ Kündigungsfrist           │ 3 Monate          │ 6 Monate          │
└──────────────────────────┴───────────────────┴───────────────────┘

DEINE AUFGABE:
1. Übernimm JEDEN dieser Unterschiede in deine differences-Liste
2. Bewerte JEDEN mit: severity, explanation, impact, recommendation
3. Du darfst ZUSÄTZLICHE qualitative Unterschiede finden (z.B. unterschiedliche Formulierungen),
   aber du darfst KEINEN der obigen Fakten-Unterschiede weglassen oder verfälschen
4. "Keine Regelung vorhanden" darfst du NUR schreiben für Werte die in der Tabelle
   oben als "— (nicht vorhanden)" markiert sind
```

**Datei:** `compareAnalyzer.js` (neue Funktion + Hilfsfunktionen)
**Aufwand:** ~3-4h
**Testkriterium:** Alle 7 Konditionenblatt-Unterschiede der Factoring-Verträge werden korrekt identifiziert, BEVOR Phase B startet

---

### Maßnahme C — Phase B entlasten (Schicht 3)

**Löst:** F7 (Severity falsch), F8 (Risiko falsch), F9 (Empfehlung ohne Substanz), und verhindert F4 (falsche Fakten)

#### C.1 — Phase B Prompt umstrukturieren

**Aktueller Prompt (9 Schritte):**
```
Schritt 0: valueExtraction (Werte aus Volltext extrahieren)  ← ENTFÄLLT
Schritt 1: Unterschiede FINDEN                                ← WIRD REDUZIERT
Schritt 2: Stärken & Schwächen                                ← BLEIBT
Schritt 3: Risiko-Level                                       ← BLEIBT (in Schritt 6 integriert)
Schritt 4: Overall Score                                      ← BLEIBT (in Schritt 5 integriert)
Schritt 5: Gesamturteil                                       ← BLEIBT
Schritt 6: Kategorie-Scores                                   ← BLEIBT
Schritt 7: Risiko-Analyse                                     ← BLEIBT
Schritt 8: Empfehlungen mit Alternativtext                    ← BLEIBT
```

**Neuer Prompt (6 Schritte):**
```
SCHRITT 1 — UNTERSCHIEDE BEWERTEN + ERGÄNZEN
  Input: Deterministische Unterschiede aus Schicht 2 (Tabelle oben)
  Aufgabe:
    a) Für JEDEN deterministischen Unterschied: Bewerte severity, schreibe explanation
       (4-6 Sätze, direkte Ansprache), impact, recommendation
    b) Suche ZUSÄTZLICH nach qualitativen Unterschieden die nicht in den keyValues
       stehen: unterschiedliche Formulierungen, fehlende Klauseln, verschiedene Regelungstiefe
    c) Qualitative Unterschiede MÜSSEN mit Fundstelle belegt werden (§-Verweis oder Zitat)

  VERBOTEN:
    - "Keine Regelung vorhanden" für Werte die in der Fakten-Tabelle als vorhanden stehen
    - Fakten-Unterschiede weglassen oder in ihrer Aussage verfälschen
    - Neue Fakten-Behauptungen über konkrete Zahlen die nicht im Dokument stehen

SCHRITT 2 — STÄRKEN & SCHWÄCHEN (je 3-5 pro Dokument)
  Mit konkreten Zahlen und Fundstellen.

SCHRITT 3 — RISIKO-ANALYSE (Reasoning Chain)
  Für jedes Risiko:
    a) FAKT: Was steht im Dokument (oder fehlt)?
    b) EINORDNUNG: Relevante Norm / §§
    c) KONSEQUENZ: Was bedeutet das konkret?
    d) WIRTSCHAFTLICHE AUSWIRKUNG: EUR-Betrag / %
    e) BEWERTUNG: Wie schwer wiegt es?

SCHRITT 4 — EMPFEHLUNGEN MIT ALTERNATIVTEXT (3-5 wichtigste)
  Für jede Empfehlung: currentText → suggestedText
  Alternativtext muss konkret und einsetzbar formuliert sein.

SCHRITT 5 — SCORES
  Overall Score (0-100) pro Dokument + 5 Kategorie-Scores
  Risiko-Level pro Dokument
  Score-Regeln: Min. 15 Punkte Differenz wenn klar besser, Cap bei 65 mit critical Risiken

SCHRITT 6 — GESAMTURTEIL
  6-8 Sätze. Empfehlung + Begründung + Bedingungen.
```

**Was sich ändert:**
- Schritt 0 (valueExtraction) **fällt komplett weg** — Schicht 2 macht das
- Schritt 1 wird von "FINDE Unterschiede" zu "BEWERTE diese Unterschiede + finde qualitative Ergänzungen"
- Schritte 3+4 (Risiko-Level + Score) werden in Schritt 5 zusammengefasst
- Gesamtzahl der Schritte: 9 → 6
- GPT muss ~40% weniger Output produzieren → fokussiertere Ergebnisse

#### C.2 — JSON-Output-Format anpassen

**Was wegfällt:**
```javascript
"valueExtraction": { ... }  // ENTFERNT — nicht mehr nötig
```

**Was bleibt (gleiche Struktur wie bisher):**
```javascript
{
  "differences": [...],
  "contract1Analysis": {...},
  "contract2Analysis": {...},
  "overallRecommendation": {...},
  "summary": {...},
  "scores": {...},
  "risks": [...],
  "recommendations": [...]
}
```

#### C.3 — Code-Bereinigung

**Was entfernt wird:**
- `crossCheckWithValueExtraction()` (Zeile 1099-1162) — nicht mehr nötig weil Phase B keine Fakten mehr erfindet
- valueExtraction-Logging im `compareContractsV2()` (Zeile 607-613)
- Schritt-0-Block im Phase B Prompt
- "VALIDIERUNGSREGELN (ABSOLUT VERBINDLICH)" Block im Prompt — durch Schicht 2 ersetzt

**Was bleibt:**
- `filterIdenticalClauses()` — weiterhin sinnvoll als Sicherheitsnetz
- `stabilizeScores()` — weiterhin sinnvoll als Score-Korrektur
- Alle bestehenden Severity/Area/SemanticType Validierungen in `validatePhaseBResponse()`

**Datei:** `compareAnalyzer.js` (buildPhaseBPrompt umschreiben, Code aufräumen)
**Aufwand:** ~2-3h
**Testkriterium:** Phase B Output enthält keine "Keine Regelung" Fehler bei Werten die in Schicht 2 identifiziert wurden

---

### Maßnahme D — Gap Detection in Schicht 2 integrieren

**Löst:** Architekturelle Sauberkeit. detectGaps() macht Schicht-2-Arbeit, läuft aber nach Schicht 3.

#### Was sich ändert

**Aktuell:**
```
detectGaps() läuft NACH Phase B (Zeile 677)
  → Findet Unterschiede die Phase B übersehen hat
  → Fügt sie nachträglich hinzu
```

**Neu:**
```
detectGaps()-Logik wird Teil von buildDeterministicDifferences() (Maßnahme B)
  → Fehlende Bereiche werden VOR Phase B erkannt
  → Phase B bekommt sie als Teil der Fakten-Tabelle
```

**Konkret:**
- Die Logik aus `detectGaps()` (Zeile 1356-1410) und `compareClauseKeyValues()` (Zeile 1435-1506) wird in `buildDeterministicDifferences()` integriert
- `detectGaps()` wird nicht gelöscht sondern veraltet (`@deprecated`) — falls Rollback nötig
- `buildMissingDiff()` (Zeile 1412-1433) bleibt als Hilfsfunktion
- `compareSummariesFallback()` (Zeile 1509-1562) bleibt als Fallback für Areas ohne keyValues

**Datei:** `compareAnalyzer.js`
**Aufwand:** ~1h (Refactoring, keine neue Logik — Logik existiert schon)

---

### Maßnahme E — Pipeline-Reihenfolge korrigieren

**Löst:** Verkabelung aller Maßnahmen in der richtigen Reihenfolge.

#### `runCompareV2Pipeline()` — Neuer Ablauf

```javascript
async function runCompareV2Pipeline(text1, text2, perspective, comparisonMode, userProfile, onProgress) {
  const progress = onProgress || (() => {});

  // ================================================================
  // SCHICHT 1 — Extraktion
  // ================================================================

  // Phase A: Beide Dokumente parallel strukturieren
  progress('structuring', 10, 'Dokumente werden strukturiert...');
  const [map1, map2] = await withTimeout(
    Promise.all([
      structureContract(text1),  // inkl. enrichKeyValuesFromText (Maßnahme A)
      structureContract(text2)
    ]),
    MAX_PHASE_A_TIME * 2,
    'Phase A Timeout'
  );
  progress('structuring', 30, 'Beide Dokumente strukturiert.');

  // Clause Matching (optional, nicht-kritisch)
  let clauseMatchResult = null;
  try {
    clauseMatchResult = await matchClauses(map1.clauses || [], map2.clauses || [], { useEmbeddings: false });
    progress('mapping', 35, `${clauseMatchResult.stats.matched} Klausel-Paare erkannt.`);
  } catch (e) {
    console.warn(`⚠️ Clause Matching fehlgeschlagen: ${e.message}`);
  }

  // ================================================================
  // SCHICHT 2 — Deterministischer Vergleich
  // ================================================================

  progress('comparing', 40, 'Werte werden verglichen...');
  const deterministicDiffs = buildDeterministicDifferences(map1, map2, clauseMatchResult);
  console.log(`📊 Schicht 2: ${deterministicDiffs.length} deterministische Unterschiede gefunden`);
  progress('comparing', 45, `${deterministicDiffs.length} Werte-Unterschiede erkannt. KI-Bewertung startet...`);

  // ================================================================
  // SCHICHT 3 — GPT-Bewertung
  // ================================================================

  const phaseBResult = await withTimeout(
    compareContractsV2(map1, map2, text1, text2, perspective, comparisonMode, userProfile, clauseMatchResult, deterministicDiffs),
    //                                                                                                    ^^^^^^^^^^^^^^^^^^
    //                                                                                                    NEU: deterministicDiffs als Parameter
    MAX_PHASE_B_TIME,
    'Phase B Timeout'
  );
  progress('finalizing', 85, 'KI-Bewertung abgeschlossen.');

  // ================================================================
  // SCHICHT 4 — Produktlogik
  // ================================================================

  // Score-Stabilisierung
  const stabilized = stabilizeScores(phaseBResult);

  // Market Benchmark
  progress('finalizing', 90, 'Marktvergleich wird erstellt...');
  const benchmarkResult = runBenchmarkComparison(map1, map2, stabilized.differences || []);
  if (benchmarkResult.benchmarks.length > 0) {
    stabilized.differences = benchmarkResult.enrichedDifferences;
  }

  // Identical-Clause-Filter (Sicherheitsnetz)
  const filtered = filterIdenticalClauses(stabilized);

  // ================================================================
  // Response zusammenbauen
  // ================================================================

  progress('finalizing', 95, 'Ergebnis wird zusammengestellt...');
  const v2Result = buildV2Response(map1, map2, filtered, perspective, text1, text2, benchmarkResult);

  if (clauseMatchResult) {
    v2Result._clauseMatching = clauseMatchResult.stats;
  }

  progress('complete', 100, 'Analyse abgeschlossen!');
  return v2Result;
}
```

**Hauptunterschiede zum aktuellen Code:**
1. `enrichKeyValuesFromText` läuft innerhalb von `structureContract()` (Maßnahme A)
2. `buildDeterministicDifferences()` läuft vor Phase B (Maßnahme B)
3. `compareContractsV2()` bekommt `deterministicDiffs` als neuen Parameter (Maßnahme C)
4. `detectGaps()` Aufruf entfällt (in Maßnahme B integriert)
5. Reihenfolge: Extraktion → Vergleich → Bewertung → Produktlogik → Response

**Datei:** `compareAnalyzer.js` (runCompareV2Pipeline umschreiben)
**Aufwand:** ~1h

---

## 6. Was NICHT angefasst wird

| Bereich | Dateien | Grund |
|---------|---------|-------|
| Frontend (alle Tabs, CSS) | CompareResults.tsx, OverviewTab, DifferencesTab, RisksTab, RecommendationsTab, ContractMapTab, Compare.module.css | Funktioniert. Zeigt an was Backend liefert. Wenn Backend korrekte Daten liefert, funktioniert UI. |
| TypeScript Types | types/compare.ts | Vollständig und korrekt. Keine Änderung an der Datenstruktur. |
| Backend Route | routes/compare.js | V2-Integration, SSE, Re-Analyze funktionieren. Keine Änderung an Endpoints oder Parametern. |
| Clause Matcher | clauseMatcher.js | Funktioniert zuverlässig. Token-Overlap-Matching reicht für Phase-B-Kontext. |
| Market Benchmarks | marketBenchmarks.js | Funktioniert deterministisch. Wird durch bessere Phase A keyValues automatisch besser. |
| Score-Stabilisierung | stabilizeScores() in compareAnalyzer.js | Guter Safety-Mechanismus, bleibt. |
| Identical-Clause-Filter | filterIdenticalClauses() in compareAnalyzer.js | Funktioniert als Sicherheitsnetz, bleibt. |

---

## 7. Umsetzungsreihenfolge

```
Maßnahme A (Phase A härten)
  └─ enrichKeyValuesFromText() implementieren
  └─ validatePhaseAResponse() verschärfen
  └─ In structureContract() einbauen
  └─ TESTEN: Phase A für Factoring-Verträge isoliert testen
    ↓
Maßnahme B + D (Deterministischer Vergleich + Gap Integration)
  └─ buildDeterministicDifferences() implementieren
  └─ Hilfsfunktionen (extractValueAndUnit, normalizeKey, fuzzyKeyMatch)
  └─ detectGaps()-Logik integrieren
  └─ formatDeterministicDiffsForPrompt() implementieren
  └─ TESTEN: Schicht 2 isoliert testen mit Phase-A-Output
    ↓
Maßnahme C (Phase B entlasten)
  └─ buildPhaseBPrompt() umschreiben (6 statt 9 Schritte)
  └─ deterministicDiffs als Parameter in compareContractsV2()
  └─ crossCheckWithValueExtraction() entfernen
  └─ valueExtraction aus JSON-Schema entfernen
  └─ TESTEN: Phase B mit deterministischen Diffs + echten Verträgen
    ↓
Maßnahme E (Pipeline-Reihenfolge)
  └─ runCompareV2Pipeline() umschreiben
  └─ detectGaps() Aufruf nach Phase B entfernen
  └─ TESTEN: Gesamte Pipeline End-to-End mit Factoring-Verträgen
    ↓
Integrations-Test
  └─ Upload + Analyse im Frontend
  └─ Alle 5 Tabs prüfen
  └─ Perspektivenwechsel prüfen
  └─ 5 Vertragstypen testen
```

Jeder Schritt ist in sich testbar. Wenn ein Schritt fehlschlägt, kann man zum vorherigen Zustand zurückkehren, weil die bestehende Logik (detectGaps, crossCheck) erst in Maßnahme C/E entfernt wird.

---

## 8. Datenfluss — Vorher vs. Nachher

### VORHER (aktuell)

```
Vertragstext 1 ──→ Phase A (GPT) ──→ map1 (mit möglicherweise fehlenden keyValues)
Vertragstext 2 ──→ Phase A (GPT) ──→ map2 (mit möglicherweise fehlenden keyValues)
                                        │
                                        ▼
                                   Clause Matching
                                        │
                                        ▼
                    ┌───────────────────────────────────────┐
                    │         Phase B (GPT)                  │
                    │  Input: map1 + map2 + 120K Zeichen     │
                    │  Aufgabe: ALLES gleichzeitig:          │
                    │    - Werte extrahieren (Schritt 0)     │
                    │    - Unterschiede FINDEN (Schritt 1)   │
                    │    - Bewerten (Schritte 2-8)           │
                    │  Problem: GPT übersieht Werte,         │
                    │  erfindet "Keine Regelung"             │
                    └───────────────────────────────────────┘
                                        │
                                        ▼
                                   Gap Detection
                                (findet was Phase B übersah)
                                        │
                                        ▼
                             crossCheckWithValueExtraction
                             (versucht GPT-Fehler zu korrigieren)
                                        │
                                        ▼
                                   Score + Benchmark
                                        │
                                        ▼
                                   Response an Frontend
```

### NACHHER (Ziel)

```
Vertragstext 1 ──→ Phase A (GPT) ──→ validate ──→ enrichKeyValues (Regex) ──→ map1 (vollständige keyValues)
Vertragstext 2 ──→ Phase A (GPT) ──→ validate ──→ enrichKeyValues (Regex) ──→ map2 (vollständige keyValues)
                                                                                  │
                                                                                  ▼
                                                                           Clause Matching
                                                                                  │
                                                                                  ▼
                    ┌───────────────────────────────────────────────────────────────┐
                    │  SCHICHT 2 — Deterministischer Vergleich (REINER CODE)        │
                    │                                                               │
                    │  1. keyValues beider Maps Wert für Wert vergleichen           │
                    │  2. Keys normalisieren + fuzzy matchen                        │
                    │  3. Numerische Werte + Text-Werte vergleichen                 │
                    │  4. Fehlende Bereiche erkennen (Gap Detection)                │
                    │                                                               │
                    │  Output: 7-15 verifizierte Fakten-Unterschiede               │
                    │  Beispiel: "Flatrate-Gebühr: 1,95% vs 2,90%"                │
                    │                                                               │
                    │  ⚡ KEIN GPT, KEINE FEHLER BEI KONKRETEN WERTEN             │
                    └───────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
                    ┌───────────────────────────────────────────────────────────────┐
                    │  Phase B (GPT) — NUR NOCH BEWERTUNG                          │
                    │                                                               │
                    │  Input: map1 + map2 + deterministicDiffs + Volltext           │
                    │  Aufgabe (reduziert):                                         │
                    │    - Jeden Fakten-Unterschied BEWERTEN (severity, explanation) │
                    │    - ZUSÄTZLICHE qualitative Unterschiede suchen              │
                    │    - Risiken analysieren                                      │
                    │    - Empfehlungen mit Alternativtext                          │
                    │    - Scores + Gesamturteil                                   │
                    │                                                               │
                    │  VERBOTEN: "Keine Regelung" für Werte aus Schicht 2          │
                    │  Weniger Schritte (6 statt 9) → bessere Fokussierung          │
                    └───────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
                                              Score-Stabilisierung
                                                     │
                                                     ▼
                                              Market Benchmark
                                                     │
                                                     ▼
                                            filterIdenticalClauses
                                                     │
                                                     ▼
                                             Response an Frontend
```

---

## 9. Änderungsregeln ab sofort

### Erlaubt

- Änderungen die eine klar identifizierte Fehlerklasse (F1-F12) in der richtigen Schicht lösen
- Änderungen mit definiertem Testkriterium
- Änderungen die diesen Masterplan umsetzen

### Verboten

- Prompt-Tuning als Reaktion auf einen einzelnen Testvertrag
- Neue Workarounds / Cross-Checks die Symptome behandeln
- Änderungen ohne klare Zuordnung zu einer Schicht und Fehlerklasse
- "Wahrscheinlich reicht das" — jede Änderung muss testbar sein
- Gleichzeitiges Ändern mehrerer Schichten in einem Commit

### Prüffragen vor jeder Änderung

1. Welche Fehlerklasse (F1-F12) wird gelöst?
2. In welcher Schicht (1-5) liegt die Ursache?
3. Löst die Änderung die Ursache oder das Symptom?
4. Ist die Lösung allgemeingültig oder nur für diesen einen Vertrag?
5. Was ist das Testkriterium?
6. Kann ich den Effekt isoliert testen (ohne die gesamte Pipeline)?

---

## 10. Definition of Done — Wann ist Compare V2 abgeschlossen?

### Funktionale Kriterien

- [ ] 5 Vertragstypen getestet: NDA, Factoring, Freelancer, SaaS-AGB, Mietvertrag
- [ ] 0 falsche "Keine Regelung"-Behauptungen bei Werten die im Dokument stehen
- [ ] Alle konkreten Zahlenwerte (Gebühren, Fristen, Limits) werden korrekt erkannt und verglichen
- [ ] Scores sind konsistent mit Risiken (kein Score > 65 bei ≥ 1 kritischem Risiko)
- [ ] Perspektivenwechsel ändert Bewertung, nicht Fakten
- [ ] Kein Testvertrag erfordert Prompt-Tuning

### Architektur-Kriterien

- [ ] Schicht 2 (deterministischer Vergleich) existiert und läuft vor Phase B
- [ ] Phase B behauptet keine eigenen Fakten mehr über konkrete Zahlenwerte — nur Bewertung
- [ ] Jeder Unterschied bei konkreten Werten ist auf Phase A keyValues rückführbar
- [ ] `crossCheckWithValueExtraction()` und `valueExtraction` im Prompt sind entfernt (nicht mehr nötig)
- [ ] Pipeline-Reihenfolge: Extraktion → Vergleich → Bewertung → Produktlogik → Response

### Qualitäts-Benchmark

- [ ] Ergebnis ist mindestens so gut wie ChatGPT-Upload bei gleichem Vertragspaar
- [ ] Ergebnis ist BESSER strukturiert als ChatGPT (Tabs, Scores, Risiken, Empfehlungen mit Alternativtext)
- [ ] Jeder gemeldete Unterschied enthält korrekte Werte aus dem Originaldokument

### Abnahme-Prozess

1. Für jeden der 5 Vertragstypen: Zwei Dokumente hochladen
2. Ergebnis prüfen gegen manuellen Vergleich:
   - Sind alle Zahlenwerte korrekt?
   - Gibt es falsche "Keine Regelung"-Claims?
   - Sind die Severity-Bewertungen plausibel?
   - Sind die Empfehlungen konkret und vertragstyp-spezifisch?
3. Erst wenn alle 5 bestehen: Compare V2 gilt als abgeschlossen

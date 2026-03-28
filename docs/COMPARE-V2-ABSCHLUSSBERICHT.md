# Compare V2 — Abschlussbericht

Abschlussbericht, Architekturüberblick und dokumentierte Optimierungen

Stand: 27.03.2026

---

## Projektziel

Compare V2 von einem promptlastigen Vertragsvergleich zu einer mehrschichtigen, reproduzierbaren Analyse-Engine weiterentwickeln.

## Kernproblem

GPT musste bisher gleichzeitig Fakten finden, Unterschiede erkennen, bewerten, Risiken ableiten und Empfehlungen formulieren. Das führte zu übersehenen Werten, falschen "Keine Regelung"-Aussagen und instabilen Ergebnissen.

## Zentraler Fortschritt

Einführung bzw. Ausbau von Clause Matching, Gap Detection, Market Benchmarking, Contract Map und anschließend der 5-Schichten-Architektur mit deterministischem Wertevergleich als Zielbild.

## Aktueller Status

Frontend und Produktlogik sind marktreif. Die neue Architektur A–E wurde implementiert: Phase A gehärtet, Schicht 2 deterministisch eingezogen und Phase B auf Bewertung statt Faktensuche reduziert.

---

## 1. Zweck dieses Berichts

Dieser Bericht dient als zentrale, dauerhafte Referenz für den Entwicklungsstand von Compare V2. Er soll nachvollziehbar machen, was umgesetzt wurde, warum die Änderungen nötig waren, welche Architekturentscheidungen getroffen wurden und an welcher Stelle frühere Probleme entstanden sind.

Ziel ist ausdrücklich, nicht nur einzelne Fixes zu dokumentieren, sondern den gesamten Bauplan: vom ersten Prompt-Tuning über Cross-Testing und UI-Verbesserungen bis hin zum Masterplan und der Umsetzung der Maßnahmen A–E.

---

## 2. Ausgangslage und ursprüngliches Problem

Compare V2 war bereits als modernes Produktgerüst vorhanden: React-Frontend mit mehreren Tabs, V2-Route im Backend, SSE-Fortschritt, Phase A zur Strukturerkennung und Phase B zur Tiefenanalyse. Auch Perspektiven, Vergleichsmodi und Nutzerprofile waren bereits in die Pipeline verdrahtet.

Das Kernproblem lag nicht in fehlendem Funktionsumfang, sondern in der Analysequalität. GPT-4o sollte innerhalb eines einzigen großen Phase-B-Calls gleichzeitig Werte aus beiden Dokumenten extrahieren, Unterschiede finden, priorisieren, Risiken begründen, Empfehlungen formulieren und Scores berechnen. Genau an dieser Stelle entstanden wiederholt die entscheidenden Fehler.

Typische Symptome waren falsche Aussagen wie "Keine Regelung vorhanden", obwohl ein Wert im Konditionenblatt oder Volltext stand, eine zu starke oder falsche Gewichtung von Datenschutz bei Factoring, das Übersehen wichtiger Zahlenunterschiede und teilweise leere Risiken- oder Empfehlungen-Tabs durch V1-Fallback oder unvollständige Arrays.

---

## 3. Bereits vorhandene Basis

Vor der Architekturverschärfung war bereits ein erheblicher Funktionsumfang umgesetzt:

- Frontend mit Übersicht, Unterschiede, Risiken, Empfehlungen und Vertragskarte
- V2-Pipeline mit Phase A und Phase B
- Perspektivenwahl Auftraggeber/Auftragnehmer/Neutral
- Vergleichsmodi Standard, Versionen, Best Practice, Anbieter
- Profile Privatperson, Freelancer, Unternehmen
- SSE-Fortschrittsanzeige und History-Funktion
- Benchmarking für mehrere Vertragstypen
- ContractMap-Daten in Phase A
- Clause Matching, Score-Stabilisierung und Fallback-Logik

---

## 4. Frühere Qualitätsprobleme

Die ersten echten Factoring-Tests zeigten, dass eine rein promptgesteuerte Analyse fachlich nicht stabil genug war. Anfangs wurde etwa argumentiert, eine fehlende Datenschutzklausel könne das Risiko senken. Juristisch war das falsch, weil bei Factoring Datenverarbeitung zum Normalfall gehört.

Außerdem wurden wirtschaftlich entscheidende Factoring-Merkmale zu schwach gewichtet: Flatrate-Gebühr, Selbstbehalt, Sicherungseinbehalt, Ankauflimit, Delkredere und Mahnwesen mussten im Vergleich viel stärker priorisiert werden als formale Standardklauseln.

Ein weiteres Problem war die Vollständigkeit. GPT meldete teils nur zwei oder vier Unterschiede, obwohl deutlich mehr quantitative Abweichungen existierten.

---

## 5. Erste Verbesserungsrunde: Prompt-Härtung

- Presence-vs-Quality-Logik: fehlende Klausel ≠ Vorteil, schwache Klausel > keine Klausel
- Branchenkontext für Factoring: Kosten, Gebühren, Zinsen, Limits, Delkredere priorisiert
- Legal-Reasoning-Chain: Fakt → Einordnung → Konsequenz → wirtschaftliche Auswirkung → Bewertung

---

## 6. Clause Matching Engine

Matching-Logik mit Area-basiertem Matching, Token Overlap, Titelähnlichkeit und Key-Value-Vergleich. Match-Kategorien: equivalent, similar, related, potential. Eingebaut zwischen Phase A und Phase B. Phase B erhielt damit Kontext über zusammengehörige Klauseln.

---

## 7. Cross-Testing

Test-PDF-Paare für NDA, Freelancer, Mietvertrag und SaaS mit gezielt eingebauten Unterschieden. Ergebnisse gemischt aber wertvoll: NDA 4/5, Freelancer 7/8, SaaS nahezu marktreif.

---

## 8. Gap Detection

Programmatische Gap Detection verglich Phase-A-Maps und ergänzte von Phase B übersehene Unterschiede. Summary-Fallback für Negationen und quantitative Text-Unterschiede. Hybrid-Architektur (GPT + deterministische Nachlogik) brachte deutlichen Qualitätssprung.

---

## 9. Market Benchmarking

Benchmark für SaaS, Freelancer, NDA, Mietvertrag und Factoring. Hauptmetriken gegen marktübliche Referenzwerte. Keyword-Pflicht, Plausibilitätsprüfungen, Unit-Checks, Quellenanzeige.

---

## 10. Vertragskarte / Contract Map

Clause Areas, Statusfarben (gleich/unterschiedlich/fehlend), aufklappbare Details mit Sections, Summaries, keyValues und Originaltext. Macht den inneren Bauplan des Vergleichs sichtbar.

---

## 11. Modi, Profile und Perspektiven

Drei Ebenen massiv ausgebaut: Nutzerprofile (Privatperson, Freelancer, Unternehmen) mit eigenen Gewichtungstabellen. Vergleichsmodi (Standard, Versionen, Best Practice, Anbieter) als echte Analyse-Logiken. Perspektiven (Auftraggeber, Auftragnehmer, Neutral) mit klarem Bias.

---

## 12. Strategische Neubewertung

Trotz funktionaler Marktreife blieb der strukturelle Kernfehler: GPT musste Fakten finden, bevor es sie bewerten konnte. Aus der Einsicht, dass Symptom-Fixes den Bauplan nicht reparieren, entstand der Masterplan.

---

## 13. Der Masterplan

Die zentrale Diagnose: Schicht 2 fehlte nahezu vollständig. Es gab keinen deterministischen Wertevergleich zwischen den Phase-A-keyValues beider Dokumente. Deshalb musste GPT in Phase B konkrete Fakten selbst suchen — und machte Fehler.

Fünf Maßnahmen: A Phase A härten, B deterministischen Wertevergleich einbauen, C Phase B entlasten, D Gap Detection in Schicht 2 integrieren, E Pipeline-Reihenfolge neu ordnen.

---

## 14. Das 5-Schichten-Modell

| Schicht | Verantwortung | Technik |
|---------|---------------|---------|
| 1 — Extraktion | Dokument in strukturierte Vertragskarte zerlegen | GPT Phase A + Regex-Nachextraktion |
| 2 — Deterministischer Vergleich | keyValues programmatisch vergleichen, Gaps erkennen | Reiner Code, kein GPT |
| 3 — Bewertung | Bekannte Unterschiede interpretieren | GPT Phase B (6 Schritte) |
| 4 — Produktlogik | Scores, Benchmark, Winner, Perspektive | Regelbasiert |
| 5 — UI | Ergebnisse anzeigen | React + CSS |

---

## 15. Umsetzung der Maßnahmen A–E

### 15.1 Maßnahme A — Phase A härten

`enrichKeyValuesFromText` in `structureContract` integriert. Regex-Nachextraktion über Vertragsvolltext für von GPT übersehene Werte. `checkExtractionQuality` als Frühwarnsystem (min 3 Klauseln, keyValues vorhanden, Payment nicht leer, Parteien erkannt, originalText brauchbar).

Neue Reihenfolge in `structureContract`: GPT-Call → Validierung → Expandierung → Regex-Nachextraktion → Qualitätsprüfung.

### 15.2 Maßnahme B — Deterministischer Wertevergleich

`buildDeterministicDifferences` vergleicht keyValues beider Verträge Area für Area vor Phase B. Hilfsfunktionen: `extractValueAndUnit`, `parseGermanNumber`, `fuzzyKeyMatch`. Versteht deutsche Zahlenformate (150.000, 1,95%, EUR 5.000, 3 Monate). Keys normalisiert und fuzzy gematcht. Numerische, textuelle und einseitige Unterschiede systematisch erkannt.

`formatDeterministicDiffsForPrompt` erzeugt Faktenblock als unveränderliche Grundlage für Phase B.

### 15.3 Maßnahme C — Phase B entlasten

Phase B von 9 auf 6 Schritte reduziert:
1. Unterschiede BEWERTEN + qualitativ ERGÄNZEN (statt Finden)
2. Stärken & Schwächen
3. Risiko-Analyse (Reasoning Chain)
4. Empfehlungen mit Alternativtext
5. Scores (Overall + 5 Kategorien + Risiko-Level)
6. Gesamturteil

Entfernt: `valueExtraction` (SCHRITT 0), `crossCheckWithValueExtraction()`, VALIDIERUNGSREGELN-Block.

### 15.4 Maßnahme D — Gap Detection in Schicht 2

Gap Detection als Teil von `buildDeterministicDifferences` (Schritt 4b). Whole-area-Gaps und value-level-Gaps direkt im deterministischen Vergleich. `checkDeterministicCoverage` als Safety-Net falls Phase B deterministische Unterschiede nicht übernimmt.

### 15.5 Maßnahme E — Pipeline-Reihenfolge

Neue Reihenfolge: Extraktion → Matching → Deterministischer Vergleich → GPT-Bewertung → Benchmarking → Response. Auch Re-Analyze-Endpoint angepasst.

---

## 16. Wichtige Produkt- und Technikentscheidungen

- Keine Symptom-Fixes ohne Schicht-Zuordnung
- Faktenfindung und Faktendeutung getrennt
- Frontend bleibt unangetastet solange es korrekt anzeigt was Backend liefert
- Benchmarking nur mit plausiblen, eindeutig herleitbaren Werten

---

## 17. Chronologische Timeline

| Phase | Inhalt |
|-------|--------|
| 1 | Analysefehler bei echten Factoring-Verträgen erkannt |
| 2 | Prompt-Härtung mit Presence-vs-Quality und Legal-Reasoning-Chain |
| 3 | Clause Matching Engine eingebaut |
| 4 | Cross-Testing mit NDA, Freelancer, Miet- und SaaS-Verträgen |
| 5 | Gap Detection und Summary-Fallback |
| 6 | Marktbenchmarking visuell erweitert |
| 7 | Vertragskarte produktiv gemacht |
| 8 | Strategische Neubewertung: Masterplan mit 5-Schichten-Modell |
| 9 | Umsetzung Maßnahmen A–E |

---

## 18. Status nach A–E Umsetzung

- **Maßnahme A:** ✅ Regex-Nachextraktion und Qualitätsprüfung in `structureContract`
- **Maßnahme B:** ✅ `buildDeterministicDifferences` erzeugt verifizierte Faktenunterschiede vor Phase B
- **Maßnahme C:** ✅ Phase B auf 6 Schritte reduziert; valueExtraction und crossCheck entfernt
- **Maßnahme D:** ✅ Gap Detection ist Teil der neuen Schicht 2
- **Maßnahme E:** ✅ `runCompareV2Pipeline` und Re-Analyze mit neuer Reihenfolge
- Benchmarking, Vertragskarte, Clause Matching, Score-Stabilisierung und UI-Tabs bestehen und profitieren von der besseren Datenbasis

---

## 19. Noch offene Restthemen

- End-to-End-Tests mit echten Verträgen (5 Typen)
- Prüfung der neuen Pipeline gegen dieselben Factoring-Fälle
- Feintuning von Severity-Regeln
- Plausibilitätskontrolle der Benchmark-Einstufungen
- Prüfung ob qualitative Unterschiede durch reduzierte Phase B noch vollständig erkannt werden
- Langfristbeobachtung ob Schicht 2 für alle Vertragstypen generalisiert

---

## 20. Warum diese Architektur ein echter Fortschritt ist

Compare V2 hängt nun deutlich weniger davon ab, ob GPT in einem riesigen Prompt zufällig alle Zahlen richtig sieht. Faktenunterschiede werden programmatisch aufgebaut und nur noch juristisch/wirtschaftlich interpretiert. Das verschiebt Compare V2 von "smart prompt with UI" zu einer nachvollziehbaren Analysemaschine.

---

## 21. Definition of Done

- 5 Vertragstypen bestehen End-to-End-Test: NDA, Factoring, Freelancer, Mietvertrag, SaaS
- Keine falsche "Keine Regelung"-Aussage bei Werten die im Dokument stehen
- Alle konkreten Zahlenwerte korrekt extrahiert, verglichen und wiedergegeben
- Scores konsistent zu Schweregrad und Risiko
- Perspektivenwechsel ändert Bewertung, nicht Faktenbasis
- Benchmarking zeigt nur plausible, eindeutig herleitbare Werte

---

## 22. Fazit

Der Entwicklungsverlauf zeigt zwei Phasen: intensive Optimierung durch Prompt-Härtung, Matching, Gap Detection, Cross-Testing, Benchmarking und UI-Vervollständigung; dann die strategische Neuausrichtung zur 5-Schichten-Architektur.

Die wichtigste Erkenntnis: Es reicht nicht, einzelne Fehlerstellen lokal zu verbessern. Das System braucht einen Bauplan, in dem Fakten, Bewertung, Produktlogik und Darstellung sauber getrennt sind. Mit Maßnahmen A–E wurde dieser Bauplan technisch verankert.

Zukünftige Änderungen sollten entlang der Schichtenlogik erfolgen.

---

## Anhang A — Wichtige Dateien

| Datei | Rolle |
|-------|-------|
| `backend/services/compareAnalyzer.js` | Zentrale Compare-V2-Logik: Phase A, Phase B, Schicht 2, Pipeline, Validierung, Score-Stabilisierung |
| `backend/routes/compare.js` | V2-Route, SSE-Fortschritt, Re-Analyze-Endpoint |
| `backend/services/clauseMatcher.js` | Clause Matching Engine |
| `backend/services/marketBenchmarks.js` | Marktbenchmarking für mehrere Vertragstypen |
| `frontend/src/components/compare/CompareResults.tsx` | Tab-Rendering und Ergebnisdarstellung |
| `frontend/src/components/compare/tabs/OverviewTab.tsx` | Übersicht, Benchmark, Insight-Texte, Winner-Logik |
| `frontend/src/components/compare/tabs/DifferencesTab.tsx` | Unterschiede mit Markt-Kontext-Badges |
| `frontend/src/components/compare/tabs/ContractMapTab.tsx` | Vertragskarte mit Klausel-Vergleichsmatrix |
| `frontend/src/styles/Compare.module.css` | CSS für alle Compare-V2-Komponenten |
| `docs/COMPARE-V2-MASTERPLAN.md` | Masterplan mit Schichtenmodell und Maßnahmen A–E |

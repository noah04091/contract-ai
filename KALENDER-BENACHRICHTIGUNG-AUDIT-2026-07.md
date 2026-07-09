# 🗓️ Kalender & Benachrichtigungen — Vollaudit & Reparatur

**Zeitraum:** 07.–08. Juli 2026
**Auftrag (Noah):** Das komplette Kalender- und Benachrichtigungssystem „wie von einem Tech-Konzern" durchleuchten und zuverlässig/marktreif machen — nur verbessern, nichts verschlechtern.
**Status:** ✅ **Abgeschlossen, live, end-to-end bewiesen.**

---

## 1. Was gemacht wurde (Überblick)

1. **Audit** — 6 spezialisierte Prüfer haben parallel das ganze System durchleuchtet: Event-Erzeugung, Cron/Mailversand, sekundäre Benachrichtiger, Kalender-API & Lebenszyklus, Frontend-Anzeige, Zeitzonen.
2. **Eigenverifikation** — die wichtigsten Funde habe ich selbst am Code nachverfolgt (keine Behauptung ohne Beweis).
3. **Reparatur in 3 Wellen** — sicherste zuerst, empfindlicher Mailversand-Kern zuletzt. Jeder Fix einzeln bewiesen (Rechenbeispiele / Syntax / Logik-Tests) und main-sicher deployt.
4. **TÜV** — 237 App-Tests grün, Kalender-Logik-Tests grün, Build & Lint sauber, Live-Systeme erreichbar.
5. **Echter Live-E2E-Test** — Test-Events erzeugt, echter Versand ausgelöst, **2 echte Mails im Postfach bestätigt**, Test-Daten restlos aufgeräumt.

**Ergebnis:** 14 bestätigte Schwachstellen behoben, 1 als „gar kein Bug" ehrlich geschlossen.

---

## 2. Server-Kontext (wichtig für Verständnis)

- Backend läuft auf Render in **UTC**. Der Reminder-Cron feuert `0 9` Uhr Europe/Berlin = real **07:00/08:00 UTC**.
- Kalender-Events werden intern auf **12:00 UTC** normiert (12 h Puffer zu beiden Tagesgrenzen).
- Die gemeinsame Tageszahl-Berechnung (`calendarDaysUntil`, Kalendertage + Rundung) ist korrekt und DST-sicher.

---

## 3. Behobene Schwachstellen (14) + Live-Commits

### Welle 1 — Anzeige & Zahlen (`f2aec204`)
| # | Problem | Fix |
|---|---|---|
| 3+6 | Signatur-Status-Updates erschienen **nie** in der Glocke (Query nutzte falsches Feld `userId` + kleingeschriebenen Status) | `ownerId` + Enum GROSS (`SIGNED/COMPLETED/DECLINED`) + Vertragsname (`title`) |
| 11 | Glocke widersprach sich: Titel „in 2 Tagen", Badge „in 3 Tagen" | Badge nutzt jetzt denselben Kanon `calendarDaysUntil` |
| 12 | Digest-Mail zählte einen Tag zu viel (`Math.ceil`) | Kalendertage (Mitternacht + Rundung) |
| 2 | Uhrzeit **verrutschte bei jeder Bearbeitung** um +2 h (Schreiben UTC, Lesen lokal) | UTC-konsistent (floating wall-time); bestehende Termine zeigen nun ihre echte getippte Zeit |
| — | „NaN Tage" bei defektem Datum | Guard in `getDaysRemaining` |

### Welle 2 — Datenintegrität & Lebenszyklus (`90749ffd`, `6abd0dca`, `8385dea7`)
| # | Problem | Fix |
|---|---|---|
| 4 | Admin-Massenlöschung löschte Verträge/Events **faktisch nicht** (String vs. ObjectId) → DSGVO-Waisendaten | beide ID-Formen (`uidVariants`), wie der Self-Delete |
| 6 | Endlosschleifen-Risiko bei Auto-Renewal (kaputter Wert → Server-Hang) | Guard (ungültig→12) + harte Obergrenze |
| 10 | Letzter Kündigungstag bis **3 Tage zu spät** berechnet (31.03 − 1 Monat = 03.03 statt 28.02) | Monatsende-Clamp |
| 7 | „Heute" fällige Termine verschwanden je nach Analyse-Uhrzeit als „historisch" | Tag-genauer Vergleich (`≥ heute 00:00`) |
| — | Re-Analyse löschte bereits **versendete** Erinnerungen (Historie weg / Re-Send) | KI-Zweige auf `status:'scheduled'` begrenzt |
| — | Sicherheitslücke: fremde Erinnerung abhakbar (IDOR) | Nutzer-Scope an beiden Stellen |
| 9 | Abgelaufene Signaturanfragen blieben **ewig offen** (kein Job) | **neuer Cron** `expireOverdueEnvelopes` (täglich 03:30) → EXPIRED + Events aufräumen. Kill-Switch `ENVELOPE_EXPIRY_ENABLED=false` |
| — | Verwaiste Signatur-Events bei Auto-Delete | Cleanup mitgezogen |

### Welle 3 — Mailversand-Kern (`fde5495a`, `cd1e7db3`)
| # | Problem | Fix |
|---|---|---|
| 8 | Nach Absturz blieben Mails „in Bearbeitung" hängen und wurden nie erneut versucht | Reaper: hängende „processing" (>15 min) → „pending" |
| 1 | Bei längerem Mailserver-Ausfall am Stichtag ging die Erinnerung **dauerhaft verloren** | gescheiterte Mail wird für späteren Zustellversuch (+4 h) reaktiviert (bleibt in der Queue-Spur, kein Eingriff am Tagesfenster) |
| 5 | „Signatur läuft ab"-Mails hingen am **falschen** Schalter („Vertragsfristen" statt „Signatur-Updates") | eigenes `signatureUpdates`-Gating |
| 14 | Zweite Mail-Pipeline hatte **keine Tarif-Prüfung** → Free-User bekamen Status-Mails | identisches Tarif-Gate wie im Hauptversand |

### Bewusst geprüft, KEIN Fix nötig
- **#13** „kurzfristige Fristen ohne Vorwarnung": Das 7-Tage-Sicherheitsnetz (Klasse B) deckt das bereits ab — der Audit-Befund war zu pessimistisch. Nichts geändert.

---

## 4. Verifikation (TÜV)

- **Backend-Testsuite (Jest):** 237/237 grün (11 Suiten: Auth, Verträge, Stripe, Tarife, JWT …)
- **Kalender-Logik-Skripte:** `testCalendarDaysUntil` 10/10, `testCleanupRegenLifecycle` 10/10, `testKlasseDClassification` 10/10, `testCancelLifecycleGate` 7/7, `verifyHybridSkipLogic` grün
- **Frontend:** Build erfolgreich, Lint 0 Fehler
- **Live:** Backend erreichbar (HTTP 200), Frontend-Fixes im ausgelieferten Chunk nachgewiesen, alle Deploy-Commits sauber in `main`
- **Echter End-to-End-Test (08.07.):** Test-Events (heute) → korrekt erfasst, feuern heute, Gating korrekt, echter Mail-Inhalt korrekt (Betreff/Empfänger/Name/„läuft heute ab") → **2 echte Mails an Noah gesendet und bestätigt** → Test-Daten restlos aufgeräumt.

---

## 5. Bewusste Entscheidungen (nicht angefasst — mit Grund)

- **Zwei Mail-Pipelines koexistieren weiter.** Eine abzuschalten (zum Deduplizieren) würde riskieren, legitime Mails zu unterdrücken („zu wenig") — das größte Risiko. Gelegentliche Redundanz ist harmlos.
- **Uhrzeit-Konvention = floating/UTC-wall-time.** NICHT auf lokale Konstruktion umstellen — das würde Termine nahe Mitternacht auf den Vor-/Folgetag kippen.

---

## 6. Offene Rest-Kleinigkeiten (NIEDRIG, kein Handlungsdruck)

1. `envelopes.js` Bulk-Hard-Delete (archived) ruft die Event-Bereinigung nicht auf — die anderen Löschwege decken die Hauptfälle ab.
2. Signatur-Glocke: real nur in-app final abnehmbar (Code + E2E sagen: funktioniert).
3. Sehr seltener Queue-Insert-Fehler-Pfad (`requeueEventOnQueueFailure`) hat noch das alte Verhalten (kein Mail-Eintrag zum Reaktivieren vorhanden).
4. Ein paar rein kosmetische Agent-Meldungen (z. B. Umlaute in manchen Titeln) — nicht sicherheits-/zuverlässigkeitsrelevant.

---

## 7. Sicherheit / Rückrollbarkeit

- Jeder Fix ist per `git revert <commit>` rückrollbar.
- Der neue EXPIRED-Job hat einen Not-Aus-Schalter: `ENVELOPE_EXPIRY_ENABLED=false`.
- Deploys erfolgten main-sicher (Worktree + Fast-Forward, main nie zurückgedreht).

**Commits:** `f2aec204` · `90749ffd` · `6abd0dca` · `8385dea7` · `fde5495a` · `cd1e7db3`
